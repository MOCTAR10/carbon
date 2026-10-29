/**
 * GET  /api/admin/credits        — list all credits (registry overview)
 * POST /api/admin/credits/issue  — issue new credits from an MRV period
 *
 * Auth: admin only.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getSession('admin')
  if (!session) return null
  const r = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  if (r.rows.length === 0 || r.rows[0].role !== 'admin') return null
  return session
}

// â”€â”€â”€ Internal reference generator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Format: REF-{projectId:04d}-{vintageYear}-{sequence:05d}
// This is an internal CarbonTrack tracking reference — NOT a Verra serial number.
// The real Verra serial (e.g. VCS-4271-2024-001) is stored in verra_credit_ref
// and can be filled in via the link_verra action once Verra issues the credits.

async function nextInternalRef(projectId: number, vintageYear: number): Promise<string> {
  const res = await query(
    `SELECT COUNT(*) as cnt FROM carbon_credits
     WHERE project_id = $1 AND vintage_year = $2`,
    [projectId, vintageYear]
  )
  const seq = parseInt(res.rows[0].cnt) + 1
  return `REF-${String(projectId).padStart(4, '0')}-${vintageYear}-${String(seq).padStart(5, '0')}`
}

// â”€â”€â”€ GET: list all credits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function GET(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const { searchParams } = new URL(req.url)
  const projectId  = searchParams.get('project_id')
  const statusFilter = searchParams.get('status')

  let sql = `
    SELECT cc.*,
           cp.title as project_title, cp.project_type_mrv,
           p.name as partner_name,
           u.first_name || ' ' || u.last_name as issued_by_name
    FROM carbon_credits cc
    JOIN carbon_projects cp ON cp.id = cc.project_id
    LEFT JOIN partners p ON p.id = cp.partner_id
    LEFT JOIN users u ON u.id = cc.issued_by
    WHERE 1=1`
  const vals: (string | number)[] = []

  if (projectId) { sql += ` AND cc.project_id = $${vals.length + 1}`; vals.push(parseInt(projectId)) }
  if (statusFilter) { sql += ` AND cc.status = $${vals.length + 1}`; vals.push(statusFilter) }
  sql += ' ORDER BY cc.issuance_date DESC'

  const result = await query(sql, vals)

  // Summary from view
  const summary = await query('SELECT * FROM registry_summary ORDER BY total_issued DESC')

  return NextResponse.json({
    credits: result.rows,
    summary: summary.rows,
  })
}

// â”€â”€â”€ POST: issue credits â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export async function POST(req: NextRequest) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const body = await req.json()
  const { projectId, periodId, vintageYear, vintageStart, vintageEnd, quantity, verraSerial, notes } = body

  if (!projectId || !vintageYear || !quantity) {
    return NextResponse.json({ error: 'projectId, vintageYear, quantity requis' }, { status: 400 })
  }

  // Verify project exists
  const projRes = await query(
    'SELECT id, project_type_mrv, methodology_code, title FROM carbon_projects WHERE id = $1',
    [projectId]
  )
  if (projRes.rows.length === 0) {
    return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  }
  const proj = projRes.rows[0]

  // Link to MRV summary if period provided (for traceability)
  let mrvId: number | null = null
  if (periodId) {
    const mrvRes = await query(
      'SELECT id FROM mrv_summaries WHERE period_id = $1',
      [periodId]
    )
    if (mrvRes.rows.length > 0) mrvId = mrvRes.rows[0].id
  }

  // Generate internal tracking reference (not a Verra serial)
  const internalRef = await nextInternalRef(projectId, parseInt(vintageYear))

  // Insert credit record
  const creditRes = await query(
    `INSERT INTO carbon_credits (
       project_id, period_id, mrv_summary_id,
       serial_number, verra_credit_ref,
       vintage_year, vintage_start, vintage_end,
       quantity_issued, quantity_active,
       methodology_code, standard, project_type,
       status, issuance_date, issued_by, notes
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$9,$10,$11,$12,'active',CURRENT_DATE,$13,$14)
     RETURNING *`,
    [
      projectId,
      periodId ?? null,
      mrvId,
      internalRef,
      verraSerial ?? null,
      parseInt(vintageYear),
      vintageStart ?? null,
      vintageEnd ?? null,
      parseFloat(quantity),
      proj.methodology_code ?? null,
      null,
      proj.project_type_mrv ?? null,
      session.userId,
      notes ?? null,
    ]
  )
  const credit = creditRes.rows[0]

  // Record in transaction log
  await query(
    `INSERT INTO credit_transactions
       (credit_id, project_id, tx_type, quantity, to_holder,
        serial_numbers, tx_date, performed_by, notes)
     VALUES ($1,$2,'issuance',$3,$4,$5,CURRENT_DATE,$6,$7)`,
    [
      credit.id,
      projectId,
      parseFloat(quantity),
      proj.title,
      verraSerial ? [verraSerial] : [internalRef],
      session.userId,
      verraSerial
        ? `Émission enregistrée — ${verraSerial} — vintage ${vintageYear}`
        : `Émission enregistrée — réf. interne ${internalRef} — vintage ${vintageYear} (n° Verra à renseigner)`,
    ]
  )

  return NextResponse.json({ credit: creditRes.rows[0] }, { status: 201 })
}
