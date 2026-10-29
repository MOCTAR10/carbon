/**
 * POST /api/partner/monitoring-periods/[id]/generate-report
 * Generate a Monitoring Report PDF for a specific monitoring period.
 * Auth: partner (own project) or admin.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { generateMonitoringReportPDF, MonitoringReportData } from '@/lib/documents/MonitoringReportPDF'

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

  const periodId = parseInt(params.id)

  // Load period + project + partner
  const periodResult = await query(
    `SELECT mp.*,
            cp.title as project_title, cp.project_type, cp.project_type_mrv,
            cp.methodology_code, cp.standard, cp.country, cp.area_ha, cp.partner_id,
            p.name as partner_name
     FROM monitoring_periods mp
     JOIN carbon_projects cp ON cp.id = mp.project_id
     LEFT JOIN partners p ON p.id = cp.partner_id
     WHERE mp.id = $1`,
    [periodId]
  )

  if (periodResult.rows.length === 0) {
    return NextResponse.json({ error: 'Période introuvable' }, { status: 404 })
  }

  const period = periodResult.rows[0]

  if (session.role !== 'admin' && period.partner_id !== session.partnerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Load monitoring records
  const recordsResult = await query(
    `SELECT activity_type, value::numeric as value, unit, notes
     FROM monitoring_records
     WHERE period_id = $1
     ORDER BY created_at`,
    [periodId]
  )

  // Load MRV summary
  const mrvResult = await query(
    `SELECT * FROM mrv_summaries WHERE period_id = $1`,
    [periodId]
  )
  const mrv = mrvResult.rows[0] ?? null

  const now = new Date().toLocaleDateString('fr-FR')

  const data: MonitoringReportData = {
    projectId:      period.project_id,
    projectTitle:   period.project_title ?? `Projet #${period.project_id}`,
    projectTypeMrv: period.project_type_mrv ?? null,
    methodologyCode: period.methodology_code ?? '—',
    standard:       period.standard ?? '—',
    country:        period.country ?? 'Gabon',
    areaHa:         period.area_ha != null ? parseFloat(period.area_ha) : null,
    partnerName:    period.partner_name ?? 'Partenaire',

    periodId,
    periodStart:  period.period_start,
    periodEnd:    period.period_end,
    periodStatus: period.status,

    records: recordsResult.rows.map(r => ({
      activity_type: r.activity_type,
      value:         parseFloat(r.value),
      unit:          r.unit,
      notes:         r.notes,
    })),

    baselineTco2:     mrv ? parseFloat(mrv.baseline_tco2 ?? 0) : 0,
    projectEmissions: mrv ? parseFloat(mrv.project_emissions ?? 0) : 0,
    leakageTco2:      mrv ? parseFloat(mrv.leakage_tco2 ?? 0) : 0,
    netReductions:    mrv ? parseFloat(mrv.net_reductions ?? 0) : 0,
    bufferTons:       mrv ? parseFloat(mrv.buffer_tons ?? 0) : 0,
    creditsEligible:  mrv ? parseFloat(mrv.credits_eligible ?? 0) : 0,
    calculatedAt:     mrv?.calculated_at ?? null,

    generatedAt:   now,
    reportVersion: '1.0',
  }

  let pdfBuffer: Buffer
  try {
    pdfBuffer = await generateMonitoringReportPDF(data)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur génération PDF'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  const filename = `MonitoringReport_${period.project_title?.replace(/[^a-z0-9]/gi, '_') ?? period.project_id}_P${periodId}_${new Date().toISOString().slice(0, 10)}.pdf`

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      'Content-Type':        'application/pdf',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length':      pdfBuffer.length.toString(),
    },
  })
}
