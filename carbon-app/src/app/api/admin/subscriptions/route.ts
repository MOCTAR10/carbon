import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { companyId, plan, amount, currency, paymentMethod, paymentRef, phonePayment, months } = await request.json()
    if (!companyId || !plan || !amount) {
      return NextResponse.json({ error: 'Champs requis manquants' }, { status: 400 })
    }

    const now = new Date()
    const expires = new Date(now)
    expires.setMonth(expires.getMonth() + (parseInt(months) || 1))

    const result = await query(
      `INSERT INTO subscriptions
         (company_id, plan, amount, currency, payment_method, payment_ref, phone_payment, status, starts_at, expires_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,'active',$8,$9)
       RETURNING *`,
      [
        companyId, plan, amount, currency || 'XAF',
        paymentMethod || 'Airtel Money',
        paymentRef || null, phonePayment || null,
        now.toISOString(), expires.toISOString(),
      ]
    )

    return NextResponse.json({ subscription: result.rows[0] }, { status: 201 })
  } catch (error) {
    console.error('Admin subscription create error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status') || ''
    const search = searchParams.get('search') || ''
    const page = parseInt(searchParams.get('page') || '1')
    const limit = 20
    const offset = (page - 1) * limit

    let whereClause = 'WHERE 1=1'
    const params: unknown[] = []
    let paramIdx = 1

    if (status) {
      whereClause += ` AND s.status = $${paramIdx}`
      params.push(status)
      paramIdx++
    }
    if (search) {
      whereClause += ` AND (c.name ILIKE $${paramIdx} OR s.payment_ref ILIKE $${paramIdx} OR s.phone_payment ILIKE $${paramIdx})`
      params.push(`%${search}%`)
      paramIdx++
    }

    const countResult = await query(
      `SELECT COUNT(*) as count FROM subscriptions s JOIN companies c ON s.company_id = c.id ${whereClause}`,
      params
    )

    const result = await query(
      `SELECT s.id, s.plan, s.amount, s.currency, s.payment_method, s.payment_ref,
              s.phone_payment, s.status, s.starts_at, s.expires_at, s.created_at,
              c.id as company_id, c.name as company_name
       FROM subscriptions s
       JOIN companies c ON s.company_id = c.id
       ${whereClause}
       ORDER BY s.created_at DESC
       LIMIT $${paramIdx} OFFSET $${paramIdx + 1}`,
      [...params, limit, offset]
    )

    return NextResponse.json({
      subscriptions: result.rows.map(s => ({
        id: s.id,
        plan: s.plan,
        amount: parseFloat(s.amount),
        currency: s.currency,
        paymentMethod: s.payment_method,
        paymentRef: s.payment_ref,
        phonePayment: s.phone_payment,
        status: s.status,
        startsAt: s.starts_at,
        expiresAt: s.expires_at,
        createdAt: s.created_at,
        company: { id: s.company_id, name: s.company_name },
      })),
      total: parseInt(countResult.rows[0].count),
      page,
      pages: Math.ceil(parseInt(countResult.rows[0].count) / limit),
    })
  } catch (error) {
    console.error('Admin subscriptions error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
