/**
 * POST /api/partner/monitoring-periods/[id]/calculate
 * Run MRV calculation for a monitoring period using the project's baseline
 * methodology and the records entered for that period.
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'
import { calculateMRV } from '@/lib/mrv/calculate'

export const dynamic = 'force-dynamic'

async function getPartnerSession() {
  const token = cookies().get('token')?.value
  if (!token) return null
  try {
    const decoded = await verifyToken(token)
    if (!decoded || (decoded.role !== 'partner' && decoded.role !== 'admin')) return null
    return decoded
  } catch { return null }
}

export async function POST(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const periodId = parseInt(params.id)

  // Load period + project + latest baseline
  const periodResult = await query(
    `SELECT mp.*, cp.partner_id, cp.area_ha, cp.methodology_code
     FROM monitoring_periods mp
     JOIN carbon_projects cp ON cp.id = mp.project_id
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

  if (!period.methodology_code) {
    return NextResponse.json(
      { error: 'Aucune méthodologie définie sur le projet — calculez d\'abord le baseline' },
      { status: 400 }
    )
  }

  // Load latest baseline parameters
  const baselineResult = await query(
    `SELECT * FROM baseline_scenarios
     WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
    [period.project_id]
  )

  if (baselineResult.rows.length === 0) {
    return NextResponse.json(
      { error: 'Aucun scénario de référence — calculez d\'abord le baseline' },
      { status: 400 }
    )
  }

  const baseline   = baselineResult.rows[0]
  const baseParams = (baseline.parameters as Record<string, number>) ?? {}

  // Load monitoring records and convert to numeric params
  const recordsResult = await query(
    `SELECT activity_type, SUM(value)::numeric as total
     FROM monitoring_records WHERE period_id = $1
     GROUP BY activity_type`,
    [periodId]
  )

  // Merge baseline params with period-specific overrides from records
  const periodParams: Record<string, number> = { ...baseParams }
  for (const rec of recordsResult.rows) {
    periodParams[rec.activity_type] = parseFloat(rec.total)
  }

  // Run calculation
  let result
  try {
    result = calculateMRV(period.methodology_code, periodParams)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de calcul'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Upsert MRV summary
  await query(
    `INSERT INTO mrv_summaries
       (period_id, methodology_code, baseline_tco2, project_emissions, leakage_tco2,
        net_reductions, buffer_tons, credits_eligible, calculated_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW())
     ON CONFLICT (period_id) DO UPDATE SET
       methodology_code = EXCLUDED.methodology_code,
       baseline_tco2 = EXCLUDED.baseline_tco2,
       project_emissions = EXCLUDED.project_emissions,
       leakage_tco2 = EXCLUDED.leakage_tco2,
       net_reductions = EXCLUDED.net_reductions,
       buffer_tons = EXCLUDED.buffer_tons,
       credits_eligible = EXCLUDED.credits_eligible,
       calculated_at = NOW()`,
    [
      periodId,
      period.methodology_code,
      result.baselineTco2,
      result.projectEmissions,
      result.leakageTco2,
      result.netReductions,
      result.bufferTons,
      result.creditsEligible,
    ]
  )

  // Update period status + cache credits on project
  await query(
    `UPDATE monitoring_periods SET status = 'calculated', updated_at = NOW() WHERE id = $1`,
    [periodId]
  )
  await query(
    `UPDATE carbon_projects SET credits_eligible = $1, updated_at = NOW() WHERE id = $2`,
    [result.creditsEligible, period.project_id]
  )

  return NextResponse.json({ mrv: result, periodId })
}
