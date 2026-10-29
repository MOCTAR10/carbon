/**
 * POST /api/partner/projects/[id]/generate-pdd
 * Generate a Project Design Document (PDD) PDF for a carbon project.
 * Auth: partner (own project) or admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { generatePDDPDF, PDDData } from '@/lib/documents/PDDPDF'

export const dynamic = 'force-dynamic'

async function getSession() {
  const token = cookies().get('token')?.value
  if (!token) return null
  try {
    const decoded = await verifyToken(token)
    if (!decoded || (decoded.role !== 'partner' && decoded.role !== 'admin')) return null
    return decoded
  } catch { return null }
}

export async function POST(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const projectId = parseInt(params.id)

  // Load project
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
  if (session.role !== 'admin' && proj.partner_id !== session.partnerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Load latest baseline scenario
  const baselineResult = await query(
    `SELECT * FROM baseline_scenarios WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [projectId]
  )
  const baseline = baselineResult.rows[0] ?? null

  // Load methodology name
  let methodologyName = proj.methodology ?? proj.methodology_code ?? '—'
  if (proj.methodology_code) {
    const mResult = await query(
      `SELECT name FROM methodologies WHERE code = $1`,
      [proj.methodology_code]
    )
    if (mResult.rows.length > 0) methodologyName = mResult.rows[0].name
  }

  // Load latest MRV summary (most recently calculated period)
  const mrvResult = await query(
    `SELECT ms.*, mp.period_start, mp.period_end
     FROM mrv_summaries ms
     JOIN monitoring_periods mp ON mp.id = ms.period_id
     WHERE mp.project_id = $1
     ORDER BY ms.calculated_at DESC LIMIT 1`,
    [projectId]
  )
  const mrv = mrvResult.rows[0] ?? null

  const now = new Date().toLocaleDateString('fr-FR')

  const data: PDDData = {
    projectId,
    projectTitle:     proj.title ?? proj.name ?? `Projet #${projectId}`,
    projectType:      proj.project_type ?? '—',
    projectTypeMrv:   proj.project_type_mrv ?? null,
    methodologyCode:  proj.methodology_code ?? proj.methodology ?? '—',
    methodologyName,
    standard:         proj.standard ?? '—',
    country:          proj.country ?? 'Gabon',
    locationName:     proj.location_name ?? null,
    areaHa:           proj.area_ha != null ? parseFloat(proj.area_ha) : null,
    startDate:        proj.start_date ?? null,
    endDate:          proj.end_date ?? null,
    description:      proj.description ?? null,
    partnerName:      proj.partner_name ?? 'Partenaire',

    baselineTco2Yr:          baseline?.baseline_tco2_yr != null ? parseFloat(baseline.baseline_tco2_yr) : null,
    baselineParameters:      (baseline?.parameters as Record<string, number>) ?? {},
    additionnality:          (baseline?.additionnality as Record<string, boolean>) ?? null,
    baselineNotes:           baseline?.notes ?? null,
    baselineCalculatedAt:    baseline?.calculated_at ?? null,

    latestPeriodStart: mrv?.period_start ?? null,
    latestPeriodEnd:   mrv?.period_end ?? null,
    baselineTco2:      mrv ? parseFloat(mrv.baseline_tco2 ?? 0) : 0,
    projectEmissions:  mrv ? parseFloat(mrv.project_emissions ?? 0) : 0,
    leakageTco2:       mrv ? parseFloat(mrv.leakage_tco2 ?? 0) : 0,
    netReductions:     mrv ? parseFloat(mrv.net_reductions ?? 0) : 0,
    bufferTons:        mrv ? parseFloat(mrv.buffer_tons ?? 0) : 0,
    creditsEligible:   mrv ? parseFloat(mrv.credits_eligible ?? 0) : 0,

    generatedAt: now,
    pddVersion:  '1.0',
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generatePDDPDF(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur génération PDF'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const filename = `PDD_${proj.title?.replace(/[^a-z0-9]/gi, '_') ?? projectId}_${new Date().toISOString().slice(0, 10)}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length.toString(),
    },
  })
}
