/**
 * GET  /api/partner/monitoring-periods/[id]/records — list records for a period
 * POST /api/partner/monitoring-periods/[id]/records — add a record
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

async function checkPeriodOwnership(periodId: number, session: Awaited<ReturnType<typeof getPartnerSession>>) {
  const r = await query(
    `SELECT cp.partner_id FROM monitoring_periods mp
     JOIN carbon_projects cp ON cp.id = mp.project_id
     WHERE mp.id = $1`,
    [periodId]
  )
  if (r.rows.length === 0) return false
  if (session!.role === 'admin') return true
  return r.rows[0].partner_id === session!.partnerId
}

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const periodId = parseInt(params.id)
  if (!await checkPeriodOwnership(periodId, session)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const result = await query(
    `SELECT * FROM monitoring_records WHERE period_id = $1 ORDER BY created_at DESC`,
    [periodId]
  )

  return NextResponse.json({ records: result.rows })
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const periodId = parseInt(params.id)
  if (!await checkPeriodOwnership(periodId, session)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await request.json()
  const { activityType, value, unit, notes } = body

  if (!activityType || value === undefined) {
    return NextResponse.json({ error: 'activityType et value requis' }, { status: 400 })
  }

  const result = await query(
    `INSERT INTO monitoring_records (period_id, activity_type, value, unit, notes)
     VALUES ($1, $2, $3, $4, $5) RETURNING *`,
    [periodId, activityType, value, unit || null, notes || null]
  )

  // Update period status
  await query(
    `UPDATE monitoring_periods SET status = 'data_entered', updated_at = NOW() WHERE id = $1`,
    [periodId]
  )

  return NextResponse.json({ record: result.rows[0] }, { status: 201 })
}
