/**
 * POST /api/rag/query
 *
 * RAG GES assistant — streams a response via Groq.
 *
 * Flow:
 *   1. Search rag_chunks with PostgreSQL full-text search
 *   2. Build context from top results
 *   3. Stream Groq response back to client
 *
 * Auth: any authenticated user.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { groqStream } from '@/lib/groq'

export const dynamic = 'force-dynamic'

// ─── System prompt ────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `Tu es l'Assistant Bilan GES de CarbonTrack, expert en bilans carbone pour les entreprises gabonaises.

Tu aides les entreprises à comprendre et réaliser leur bilan GES : normes ISO 14064-1, GHG Protocol Corporate Standard, facteurs d'émissions Base Carbone ADEME, et la réglementation nationale (Ordonnance N°019/PR/2021). Tu les guides également dans le processus de certification GreenLeaves.

Règles :
- Réponds toujours en français, même si la question est en anglais
- Cite tes sources : "Selon ISO 14064-1, §X…" ou "D'après le GHG Protocol, chapitre Y…" ou "Base Carbone ADEME — facteur Z"
- Si l'information n'est pas dans le contexte fourni, dis-le clairement plutôt qu'inventer
- Sois précis sur les chiffres (facteurs d'émissions, seuils, périmètres)
- Adapte tes réponses au contexte gabonais quand pertinent (réseau électrique SEEG, carburants locaux, secteurs extractifs)

Format de réponse : texte clair en français. Utilise des listes à puces pour les étapes ou critères multiples.`

// ─── POST handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

  const body = await req.json()
  const { question, methodologyFilter } = body

  if (!question || typeof question !== 'string' || question.trim().length < 3) {
    return NextResponse.json({ error: 'Question requise' }, { status: 400 })
  }

  // ── 1. Full-text search in rag_chunks ──────────────────────────────────────

  const FRENCH_STOP = new Set([
    'le','la','les','un','une','des','du','de','ce','cet','cette','ces',
    'mon','ma','mes','ton','ta','tes','son','sa','ses',
    'notre','nos','votre','vos','leur','leurs',
    'je','tu','il','elle','nous','vous','ils','elles',
    'me','te','se','lui','y','en',
    'ce','cet','cette','ces',
    'et','mais','ou','donc','car','ni','or',
    'sur','sous','dans','avec','pour','par','en','vers','chez','entre',
    'est','sont','a','ai','avons','avez','ont','etaient','seront',
    'fait','faire','peut','peuvent','doit','doivent','veut','veulent',
    'qui','que','quoi','dont','ou',
    'au','aux','auxquels','auquel',
    'quel','quelle','quels','quelles',
    'plus','moins','tres','bien','mal','pas',
    'si','non','oui',
  ])

  // Normalise accents and extract significant (non-stop) words
  const normalise = (s: string) =>
    s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9\s-]/g, ' ')

  const cleaned = normalise(question)
  const words = cleaned.split(/\s+/).filter(w => w.length >= 3 && !FRENCH_STOP.has(w.toLowerCase()))

  // Try FTS with accent-normalised tsquery
  let searchSql = `
    SELECT
      rc.content,
      rc.methodology_code,
      rd.title as document_title,
      rc.chunk_index,
      ts_rank(rc.search_vector, plainto_tsquery('french', $1)) as rank
    FROM rag_chunks rc
    JOIN rag_documents rd ON rd.id = rc.document_id
    WHERE rc.search_vector @@ plainto_tsquery('french', $1)`

  const vals: (string | null)[] = [cleaned]

  if (methodologyFilter) {
    searchSql += ` AND rc.methodology_code = $2`
    vals.push(methodologyFilter)
  }

  searchSql += ` ORDER BY rank DESC LIMIT 6`

  let chunkRes = await query(searchSql, vals)

  // FTS with explicit significant words (unaccent FTS on both sides)
  let chunks = chunkRes.rows

  if (chunks.length === 0 && words.length > 0) {
    const explicitQuery = words.map(w => `"${w}"`).join(' & ')
    chunkRes = await query(
      `SELECT rc.content, rc.methodology_code, rd.title as document_title, rc.chunk_index,
              ts_rank(rc.search_vector, to_tsquery('french', $1)) as rank
       FROM rag_chunks rc
       JOIN rag_documents rd ON rd.id = rc.document_id
       WHERE rc.search_vector @@ to_tsquery('french', $1)
       ORDER BY rank DESC LIMIT 6`,
      [explicitQuery]
    )
    chunks = chunkRes.rows
  }

  // If still nothing, fall back to ILIKE on the first two significant words
  if (chunks.length === 0 && words.length > 0) {
    const topWords = words.slice(0, 2)
    const likes = topWords.map((_, i) => `rc.content ILIKE '%' || $${i + 1} || '%'`).join(' OR ')
    chunkRes = await query(
      `SELECT rc.content, rc.methodology_code, rd.title as document_title, rc.chunk_index, 0 as rank
       FROM rag_chunks rc
       JOIN rag_documents rd ON rd.id = rc.document_id
       WHERE ${likes}
       LIMIT 6`,
      topWords
    )
    chunks = chunkRes.rows
  }

  // ── 2. Build context string ────────────────────────────────────────────────

  let context = ''
  if (chunks.length === 0) {
    context = 'Aucun document pertinent trouvé dans la base de connaissances pour cette question.'
  } else {
    context = chunks.map((c, i) =>
      `[Source ${i + 1}: ${c.document_title}${c.methodology_code ? ` (${c.methodology_code})` : ''}]\n${c.content}`
    ).join('\n\n---\n\n')
  }

  // ── 3. Stream from Groq ────────────────────────────────────────────────────

  const messages = [
    {
      role: 'system' as const,
      content: SYSTEM_PROMPT,
    },
    {
      role: 'user' as const,
      content: `Contexte documentaire :\n\n${context}\n\n---\n\nQuestion : ${question}`,
    },
  ]

  // Log query (non-blocking)
  query(
    `INSERT INTO rag_query_logs (user_id, question, chunks_used, model)
     VALUES ($1, $2, $3, $4)`,
    [session.userId, question.slice(0, 500), chunks.length, 'llama-3.3-70b-versatile']
  ).catch(() => {/* ignore log errors */})

  try {
    const groqBodyStream = await groqStream(messages)

    // Transform Groq SSE stream → plain text stream for the client
    // Groq sends: "data: {...}\n\n" lines; we extract delta.content tokens
    const encoder = new TextEncoder()
    const decoder = new TextDecoder()

    const transformed = new ReadableStream({
      async start(controller) {
        const reader = groqBodyStream.getReader()
        let buffer = ''

        // Send sources metadata first as a special line
        const sources = chunks.map(c => ({
          title: c.document_title,
          code:  c.methodology_code,
        }))
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ sources })}\n\n`))

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            buffer += decoder.decode(value, { stream: true })
            const lines = buffer.split('\n')
            buffer = lines.pop() ?? ''

            for (const line of lines) {
              if (!line.startsWith('data: ')) continue
              const json = line.slice(6).trim()
              if (json === '[DONE]') { controller.close(); return }
              try {
                const parsed = JSON.parse(json)
                const token = parsed.choices?.[0]?.delta?.content
                if (token) {
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token })}\n\n`))
                }
              } catch { /* skip malformed lines */ }
            }
          }
        } finally {
          reader.releaseLock()
          controller.close()
        }
      },
    })

    return new NextResponse(transformed, {
      headers: {
        'Content-Type':  'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection':    'keep-alive',
      },
    })
  } catch (err) {
    console.error('[rag/query] Groq error:', err)
    return NextResponse.json({
      error: 'Erreur de génération — vérifiez GROQ_API_KEY dans .env.local',
    }, { status: 500 })
  }
}
