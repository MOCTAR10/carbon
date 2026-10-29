/**
 * POST /api/admin/projects/[id]/assign-vvb
 * Assign a VVB to a carbon project and send the document package by email.
 * Auth: admin only.
 *
 * Body: { vvbName, vvbEmail, vvbContact?, adminName? }
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'
import { sendVVBDocumentEmail } from '@/lib/email/vvbEmail'
import { PDDData } from '@/lib/documents/PDDPDF'
import { MonitoringReportData } from '@/lib/documents/MonitoringReportPDF'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const session = await getSession('admin')
  if (!session) return null
  const r = await query('SELECT role, first_name, last_name FROM users WHERE id = $1', [session.userId])
  if (r.rows.length === 0 || r.rows[0].role !== 'admin') return null
  return { ...session, firstName: r.rows[0].first_name, lastName: r.rows[0].last_name }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin()
  if (!session) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

  const projectId = parseInt(params.id)
  const body = await req.json()
  const { vvbName, vvbEmail, vvbContact, adminName } = body

  if (!vvbName || !vvbEmail) {
    return NextResponse.json({ error: 'vvbName et vvbEmail requis' }, { status: 400 })
  }

  // Load project + partner
  const projResult = await query(
    `SELECT cp.*, p.name as partner_name
     FROM carbon_projects cp
     LEFT JOIN partners p ON p.id = cp.partner_id
     WHERE cp.id = $1`,
    [projectId]
  )
  if (projResult.rows.length === 0) {
    return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  }
  const proj = projResult.rows[0]

  // Load methodology name
  let methodologyName = proj.methodology ?? proj.methodology_code ?? '—'
  if (proj.methodology_code) {
    const mRes = await query('SELECT name FROM methodologies WHERE code = $1', [proj.methodology_code])
    if (mRes.rows.length > 0) methodologyName = mRes.rows[0].name
  }

  // Load latest baseline
  const baselineRes = await query(
    `SELECT * FROM baseline_scenarios WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  )
  const baseline = baselineRes.rows[0] ?? null

  // Load latest MRV period
  const mrvRes = await query(
    `SELECT ms.*, mp.period_start, mp.period_end, mp.status as period_status
     FROM mrv_summaries ms
     JOIN monitoring_periods mp ON mp.id = ms.period_id
     WHERE mp.project_id = $1
     ORDER BY ms.calculated_at DESC LIMIT 1`,
    [projectId]
  )
  const mrv = mrvRes.rows[0] ?? null

  // Load monitoring records for latest period (if any)
  let monRecords: { activity_type: string; value: number; unit: string | null; notes: string | null }[] = []
  if (mrv) {
    const recRes = await query(
      `SELECT activity_type, value::numeric as value, unit, notes
       FROM monitoring_records WHERE period_id = $1`,
      [mrv.period_id]
    )
    monRecords = recRes.rows.map(r => ({
      activity_type: r.activity_type,
      value: parseFloat(r.value),
      unit: r.unit,
      notes: r.notes,
    }))
  }

  const now = new Date().toLocaleDateString('fr-FR')

  const pddData: PDDData = {
    projectId,
    projectTitle:    proj.title ?? `Projet #${projectId}`,
    projectType:     proj.project_type ?? '—',
    projectTypeMrv:  proj.project_type_mrv ?? null,
    methodologyCode: proj.methodology_code ?? '—',
    methodologyName,
    standard:        proj.standard ?? '—',
    country:         proj.country ?? 'Gabon',
    locationName:    proj.location_name ?? null,
    areaHa:          proj.area_ha != null ? parseFloat(proj.area_ha) : null,
    startDate:       proj.start_date ?? null,
    endDate:         proj.end_date ?? null,
    description:     proj.description ?? null,
    partnerName:     proj.partner_name ?? 'Partenaire',
    baselineTco2Yr:       baseline?.baseline_tco2_yr != null ? parseFloat(baseline.baseline_tco2_yr) : null,
    baselineParameters:   (baseline?.parameters as Record<string, number>) ?? {},
    additionnality:       (baseline?.additionnality as Record<string, boolean>) ?? null,
    baselineNotes:        baseline?.notes ?? null,
    baselineCalculatedAt: baseline?.calculated_at ?? null,
    latestPeriodStart: mrv?.period_start ?? null,
    latestPeriodEnd:   mrv?.period_end ?? null,
    baselineTco2:     mrv ? parseFloat(mrv.baseline_tco2 ?? 0) : 0,
    projectEmissions: mrv ? parseFloat(mrv.project_emissions ?? 0) : 0,
    leakageTco2:      mrv ? parseFloat(mrv.leakage_tco2 ?? 0) : 0,
    netReductions:    mrv ? parseFloat(mrv.net_reductions ?? 0) : 0,
    bufferTons:       mrv ? parseFloat(mrv.buffer_tons ?? 0) : 0,
    creditsEligible:  mrv ? parseFloat(mrv.credits_eligible ?? 0) : 0,
    generatedAt: now,
    pddVersion: '1.0',
  }

  const monitoringData: MonitoringReportData | null = mrv ? {
    projectId,
    projectTitle:    proj.title ?? `Projet #${projectId}`,
    projectTypeMrv:  proj.project_type_mrv ?? null,
    methodologyCode: proj.methodology_code ?? '—',
    standard:        proj.standard ?? '—',
    country:         proj.country ?? 'Gabon',
    areaHa:          proj.area_ha != null ? parseFloat(proj.area_ha) : null,
    partnerName:     proj.partner_name ?? 'Partenaire',
    periodId:        mrv.period_id,
    periodStart:     mrv.period_start,
    periodEnd:       mrv.period_end,
    periodStatus:    mrv.period_status,
    records:         monRecords,
    baselineTco2:    parseFloat(mrv.baseline_tco2 ?? 0),
    projectEmissions:parseFloat(mrv.project_emissions ?? 0),
    leakageTco2:     parseFloat(mrv.leakage_tco2 ?? 0),
    netReductions:   parseFloat(mrv.net_reductions ?? 0),
    bufferTons:      parseFloat(mrv.buffer_tons ?? 0),
    creditsEligible: parseFloat(mrv.credits_eligible ?? 0),
    calculatedAt:    mrv.calculated_at ?? null,
    generatedAt:     now,
    reportVersion:   '1.0',
  } : null

  // Send email
  const emailResult = await sendVVBDocumentEmail({
    vvbName, vvbEmail, vvbContact,
    projectId,
    projectTitle:    proj.title ?? `Projet #${projectId}`,
    methodologyCode: proj.methodology_code ?? '—',
    standard:        proj.standard ?? '—',
    country:         proj.country ?? 'Gabon',
    partnerName:     proj.partner_name ?? 'Partenaire',
    pddData,
    monitoringData,
    adminName: adminName ?? (`${session.firstName ?? ''} ${session.lastName ?? ''}`.trim() || 'Admin CarbonTrack'),
    appUrl: process.env.NEXT_PUBLIC_APP_URL,
  })

  // Create vvb_verifications record
  const vvbRow = await query(
    `INSERT INTO vvb_verifications
       (project_id, vvb_name, vvb_email, vvb_contact, assigned_by,
        status, email_sent_at, email_documents)
     VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)
     RETURNING *`,
    [
      projectId,
      vvbName,
      vvbEmail,
      vvbContact ?? null,
      session.userId,
      emailResult.sent ? new Date() : null,
      JSON.stringify(emailResult.attachments.map(name => ({ name }))),
    ]
  )

  // Update carbon_projects with VVB assignment
  await query(
    `UPDATE carbon_projects
     SET vvb_name = $1, vvb_contact_email = $2,
         vvb_assigned_at = NOW(), vvb_status = 'pending',
         updated_at = NOW()
     WHERE id = $3`,
    [vvbName, vvbEmail, projectId]
  )

  return NextResponse.json({
    verification: vvbRow.rows[0],
    email: emailResult,
  }, { status: 201 })
}
