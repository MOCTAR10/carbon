import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get('search') || ''
    const sector = searchParams.get('sector') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []
    let paramIdx = 1

    if (search) {
      whereClause += ` AND (c.name ILIKE $${paramIdx} OR c.rccm ILIKE $${paramIdx})`
      params.push(`%${search}%`)
      paramIdx++
    }
    if (sector) {
      whereClause += ` AND c.sector = $${paramIdx}`
      params.push(sector)
      paramIdx++
    }

    const countResult = await query(
      `SELECT COUNT(*) as count FROM companies c ${whereClause}`,
      params
    )

    const result = await query(
      `SELECT c.id, c.name, c.rccm, c.sector, c.created_at,
              COUNT(DISTINCT u.id) as user_count,
              COUNT(DISTINCT s.id) as site_count,
              COUNT(DISTINCT a.id) as assessment_count,
              sub.status as sub_status, sub.plan as sub_plan, sub.expires_at as sub_expires,
              sub.amount as sub_amount
       FROM companies c
       LEFT JOIN users u ON u.company_id = c.id
       LEFT JOIN sites s ON s.company_id = c.id
       LEFT JOIN assessments a ON a.site_id IN (SELECT id FROM sites WHERE company_id = c.id)
       LEFT JOIN LATERAL (
         SELECT status, plan, expires_at, amount FROM subscriptions
         WHERE company_id = c.id AND status = 'active' AND expires_at > NOW()
         ORDER BY expires_at DESC LIMIT 1
       ) sub ON true
       ${whereClause}
       GROUP BY c.id, c.name, c.rccm, c.sector, c.created_at, sub.status, sub.plan, sub.expires_at, sub.amount
       ORDER BY c.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      companies: result.rows.map(c => ({
        id: c.id,
        name: c.name,
        rccm: c.rccm,
        sector: c.sector,
        createdAt: c.created_at,
        userCount: parseInt(c.user_count),
        siteCount: parseInt(c.site_count),
        assessmentCount: parseInt(c.assessment_count),
        subscription: c.sub_status ? {
          status: c.sub_status,
          plan: c.sub_plan,
          expiresAt: c.sub_expires,
          amount: parseFloat(c.sub_amount),
        } : null,
      })),
      total: parseInt(countResult.rows[0].count),
      page,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    })
  } catch (error) {
    console.error('Admin companies error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
