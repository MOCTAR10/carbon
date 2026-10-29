/**
 * POST /api/partner/projects/[id]/baseline
 * Calculate and save a baseline scenario for a project.
 *
 * GET /api/partner/projects/[id]/baseline
 * Return the latest baseline scenario for the project.
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

async function checkOwnership(projectId: number, session: Awaited<ReturnType<typeof getPartnerSession>>) {
  const r = await query('SELECT partner_id FROM carbon_projects WHERE id = $1', [projectId])
  if (r.rows.length === 0) return false
  if (session!.role === 'admin') return true
  return r.rows[0].partner_id === session!.partnerId
}

// GET — fetch latest baseline for this project
export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const projectId = parseInt(params.id)
  if (!await checkOwnership(projectId, session)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  // Also fetch methodology list for the frontend selector
  const [baselineResult, methodsResult] = await Promise.all([
    query(
      `SELECT * FROM baseline_scenarios
       WHERE project_id = $1 ORDER BY created_at DESC LIMIT 1`,
      [projectId]
    ),
    query(`SELECT * FROM methodologies WHERE active = TRUE ORDER BY standard, code`),
  ])

  return NextResponse.json({
    baseline: baselineResult.rows[0] ?? null,
    methodologies: methodsResult.rows,
  })
}

// POST — calculate and save baseline
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const projectId = parseInt(params.id)
  if (!await checkOwnership(projectId, session)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const { methodologyCode, parameters, additionnality, notes } = body

  if (!methodologyCode || !parameters) {
    return NextResponse.json({ error: 'methodologyCode et parameters requis' }, { status: 400 })
  }

  // Get project area for formulas that need it
  const projResult = await query('SELECT area_ha FROM carbon_projects WHERE id = $1', [projectId])
  const areaHa     = parseFloat(projResult.rows[0]?.area_ha ?? 0)
  const enrichedParams = { area_ha: areaHa, ...parameters }

  // Calculate
  let result
  try {
    result = calculateMRV(methodologyCode, enrichedParams)
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erreur de calcul'
    return NextResponse.json({ error: msg }, { status: 400 })
  }

  // Save baseline scenario (upsert-style: insert new row, keep history)
  const saved = await query(
    `INSERT INTO baseline_scenarios
       (project_id, methodology_code, parameters, baseline_tco2_yr, additionnality, notes, calculated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW())
     RETURNING *`,
    [
      projectId,
      methodologyCode,
      JSON.stringify(enrichedParams),
      result.baselineTco2,
      additionnality ? JSON.stringify(additionnality) : null,
      notes || null,
    ]
  )

  // Cache result on the project row
  await query(
    `UPDATE carbon_projects
     SET methodology_code = $1, baseline_tco2_yr = $2, updated_at = NOW()
     WHERE id = $3`,
    [methodologyCode, result.baselineTco2, projectId]
  )

  return NextResponse.json({ baseline: saved.rows[0], mrv: result }, { status: 201 })
}
