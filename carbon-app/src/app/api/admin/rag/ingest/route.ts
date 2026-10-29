/**
 * GET /api/admin/rag/ingest
 *
 * One-time admin trigger to parse Verra methodology PDFs and store
 * chunks in rag_documents + rag_chunks for full-text search.
 *
 * Run once after migrate-rag.sql.
 * Auth: admin only.
 *
 * PDFs ingested from: carbon-app/verra methodology/
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import path from 'path'
import fs from 'fs'

export const dynamic = 'force-dynamic'
// PDF parsing can take a while
export const maxDuration = 120

async function requireAdmin() {
  const session = await getSession('admin')
  if (!session) return null
  const r = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  if (r.rows.length === 0 || r.rows[0].role !== 'admin') return null
  return session
}

// â”€â”€â”€ PDF list to ingest â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const PDF_SOURCES = [
  {
    filename: 'VM0048-Reducing-Emissions-from-Deforestation-and-Forest-Degradation-v1.0-1-1.pdf',
    path: 'Active VCS Methodologies+module+tools/Agriculture, forestry and other land use, AFOLU',
    methodologyCode: 'VM0048',
    title: 'VM0048 — Reducing Emissions from Deforestation and Forest Degradation v1.0',
  },
  {
    filename: 'VM0048-v1.0-Clarification-issued-July-31-2024.pdf',
    path: 'Active VCS Methodologies+module+tools/Agriculture, forestry and other land use, AFOLU',
    methodologyCode: 'VM0048',
    title: 'VM0048 — Clarification July 2024',
  },
  {
    filename: 'verra-registry-tou-oct-2024.pdf',
    path: '',
    methodologyCode: null,
    title: 'Verra Registry Terms of Use — October 2024',
  },
  {
    filename: 'Verra-Registry-User-Guide.pdf',
    path: '',
    methodologyCode: null,
    title: 'Verra Registry User Guide',
  },
]

// â”€â”€â”€ Chunk splitter (~400 words, 50-word overlap) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

function chunkText(text: string, chunkWords = 400, overlapWords = 50): string[] {
  const words = text.split(/\s+/).filter(Boolean)
  const chunks: string[] = []
  let i = 0

  while (i < words.length) {
    const end = Math.min(i + chunkWords, words.length)
    chunks.push(words.slice(i, end).join(' '))
    if (end === words.length) break
    i += chunkWords - overlapWords
  }

  return chunks
}

// â”€â”€â”€ GET handler â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  // Check force flag to re-ingest already-processed documents
  const force = req.nextUrl.searchParams.get('force') === 'true'

  // Dynamic import of pdf-parse (CommonJS module — typings don't expose .default)
  let pdfParse: (buffer: Buffer) => Promise<{ text: string; numpages: number }>
  try {
    const mod = (await import('pdf-parse')) as unknown as {
      default?: (buffer: Buffer) => Promise<{ text: string; numpages: number }>
    } & ((buffer: Buffer) => Promise<{ text: string; numpages: number }>)
    pdfParse = mod.default ?? mod
  } catch {
    return NextResponse.json({
      error: 'pdf-parse non installé — lancez: npm install pdf-parse',
    }, { status: 500 })
  }

  const verraDir = path.join(process.cwd(), 'verra methodology')
  const results: { filename: string; status: string; chunks?: number; error?: string }[] = []

  for (const source of PDF_SOURCES) {
    const filePath = source.path
      ? path.join(verraDir, source.path, source.filename)
      : path.join(verraDir, source.filename)

    if (!fs.existsSync(filePath)) {
      results.push({ filename: source.filename, status: 'not_found' })
      continue
    }

    // Skip if already ingested (unless force)
    const existing = await query(
      'SELECT id FROM rag_documents WHERE filename = $1',
      [source.filename]
    )
    if (existing.rows.length > 0 && !force) {
      results.push({ filename: source.filename, status: 'skipped (already ingested)' })
      continue
    }

    try {
      const buffer = fs.readFileSync(filePath)
      const parsed = await pdfParse(buffer)
      const chunks  = chunkText(parsed.text)

      // Upsert document record
      const docRes = await query(
        `INSERT INTO rag_documents (filename, methodology_code, title, total_pages, total_chunks)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (filename) DO UPDATE
           SET total_pages = EXCLUDED.total_pages,
               total_chunks = EXCLUDED.total_chunks,
               ingested_at = NOW()
         RETURNING id`,
        [source.filename, source.methodologyCode, source.title, parsed.numpages, chunks.length]
      )
      const docId = docRes.rows[0].id

      // Delete existing chunks if re-ingesting
      await query('DELETE FROM rag_chunks WHERE document_id = $1', [docId])

      // Insert chunks with full-text search vector
      for (let idx = 0; idx < chunks.length; idx++) {
        const content = chunks[idx]
        await query(
          `INSERT INTO rag_chunks
             (document_id, chunk_index, content, search_vector, methodology_code)
           VALUES ($1, $2, $3, to_tsvector('english', $3), $4)`,
          [docId, idx, content, source.methodologyCode]
        )
      }

      results.push({ filename: source.filename, status: 'ingested', chunks: chunks.length })
    } catch (err) {
      results.push({
        filename: source.filename,
        status: 'error',
        error: err instanceof Error ? err.message : String(err),
      })
    }
  }

  const totalChunks = results.reduce((s, r) => s + (r.chunks ?? 0), 0)

  return NextResponse.json({
    results,
    totalChunks,
    message: `Ingestion terminée. ${totalChunks} chunks créés.`,
  })
}
