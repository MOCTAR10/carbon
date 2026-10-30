import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCompanySession, unauthorized, parseId, ownsAssessment, certificationLock, lockedResponse } from '@/lib/company'
import { QUESTIONS } from '@/lib/copilot'

export const dynamic = 'force-dynamic'

/**
 * Copilote activity profile of a bilan. Without a saved profile, the answers of the latest profiled bilan
 * of the same site are returned (inherited: true) so a new year starts from last year's answers.
 */
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCompanySession()
  if (!session) return unauthorized()
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })
  try {
    if (!(await ownsAssessment(id, session.companyId))) return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    // Latest earlier bilan of the same site holding data: year-on-year checks
    const before = await query(
      `SELECT a.id, a.year FROM assessments a
       WHERE a.site_id = (SELECT site_id FROM assessments WHERE id = $1)
         AND a.year < (SELECT year FROM assessments WHERE id = $1)
         AND EXISTS (SELECT 1 FROM emission_entries e WHERE e.assessment_id = a.id)
       ORDER BY a.year DESC, a.id DESC LIMIT 1`,
      [id]
    )
    const previous = before.rows[0] ? { id: before.rows[0].id, year: before.rows[0].year } : null
    const own = await query('SELECT answers, updated_at FROM assessment_profiles WHERE assessment_id = $1', [id])
    if (own.rows[0]) return NextResponse.json({ answers: own.rows[0].answers, confirmed: true, inherited: false, previous, updatedAt: own.rows[0].updated_at })
    const prev = await query(
      `SELECT p.answers FROM assessment_profiles p
       JOIN assessments a ON a.id = p.assessment_id
       WHERE a.site_id = (SELECT site_id FROM assessments WHERE id = $1) AND a.id <> $1
       ORDER BY a.year DESC, p.updated_at DESC LIMIT 1`,
      [id]
    )
    return NextResponse.json({ answers: prev.rows[0]?.answers ?? {}, confirmed: false, inherited: !!prev.rows[0], previous })
  } catch (err) {
    console.error('[assessments/profile GET]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getCompanySession()
  if (!session) return unauthorized()
  const id = parseId(params.id)
  if (!id) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  let body: { answers?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  const raw = body.answers
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return NextResponse.json({ error: 'Réponses invalides' }, { status: 400 })
  // Only known questions, only booleans
  const answers: Record<string, boolean> = {}
  for (const q of QUESTIONS) {
    const v = (raw as Record<string, unknown>)[q.id]
    if (typeof v === 'boolean') answers[q.id] = v
  }

  try {
    if (!(await ownsAssessment(id, session.companyId))) return NextResponse.json({ error: 'Bilan non trouvé' }, { status: 404 })
    if (await certificationLock(id)) return lockedResponse()
    await query(
      `INSERT INTO assessment_profiles (assessment_id, answers, updated_by, updated_at) VALUES ($1, $2, $3, NOW())
       ON CONFLICT (assessment_id) DO UPDATE SET answers = EXCLUDED.answers, updated_by = EXCLUDED.updated_by, updated_at = NOW()`,
      [id, JSON.stringify(answers), session.userId]
    )
    return NextResponse.json({ answers, confirmed: true, inherited: false })
  } catch (err) {
    console.error('[assessments/profile PUT]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
