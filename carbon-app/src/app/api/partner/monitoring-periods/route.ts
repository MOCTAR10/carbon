/**
 * GET  /api/partner/monitoring-periods?project_id=X  — list periods for a project
 * POST /api/partner/monitoring-periods               — create a new period
 */

import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

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

export async function GET(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const projectId = parseInt(req.nextUrl.searchParams.get('project_id') ?? '')
  if (!projectId) return NextResponse.json({ error: 'project_id requis' }, { status: 400 })

  // Verify ownership
  const proj = await query('SELECT partner_id FROM carbon_projects WHERE id = $1', [projectId])
  if (proj.rows.length === 0) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  if (session.role !== 'admin' && proj.rows[0].partner_id !== session.partnerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const result = await query(
    `SELECT mp.*,
            ms.net_reductions, ms.credits_eligible, ms.calculated_at as mrv_calculated_at,
            (SELECT COUNT(*) FROM monitoring_records WHERE period_id = mp.id) as record_count
     FROM monitoring_periods mp
     LEFT JOIN mrv_summaries ms ON ms.period_id = mp.id
     WHERE mp.project_id = $1
     ORDER BY mp.period_start DESC`,
    [projectId]
  )

  return NextResponse.json({ periods: result.rows })
}

export async function POST(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const body = await req.json()
  const { projectId, periodStart, periodEnd } = body

  if (!projectId || !periodStart || !periodEnd) {
    return NextResponse.json({ error: 'projectId, periodStart et periodEnd requis' }, { status: 400 })
  }

  // Verify ownership
  const proj = await query('SELECT partner_id FROM carbon_projects WHERE id = $1', [projectId])
  if (proj.rows.length === 0) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })
  if (session.role !== 'admin' && proj.rows[0].partner_id !== session.partnerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const result = await query(
    `INSERT INTO monitoring_periods (project_id, period_start, period_end, status)
     VALUES ($1, $2, $3, 'open') RETURNING *`,
    [projectId, periodStart, periodEnd]
  )

  return NextResponse.json({ period: result.rows[0] }, { status: 201 })
}
