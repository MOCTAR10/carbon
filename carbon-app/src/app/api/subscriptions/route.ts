import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const userResult = await query(
      'SELECT company_id FROM users WHERE id = $1',
      [session.userId]
    )
    if (userResult.rows.length === 0) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const companyId = userResult.rows[0].company_id

    // Get all subscriptions for the company (current + history)
    const result = await query(
      `SELECT id, plan, amount, currency, payment_method, payment_ref, phone_payment,
              status, starts_at, expires_at, created_at
       FROM subscriptions
       WHERE company_id = $1
       ORDER BY created_at DESC
       LIMIT 10`,
      [companyId]
    )

    const subscriptions = result.rows.map(s => ({
      id: s.id,
      plan: s.plan,
      amount: parseFloat(s.amount),
      currency: s.currency,
      paymentMethod: s.payment_method,
      paymentRef: s.payment_ref,
      phonePayment: s.phone_payment,
      status: s.status as 'active' | 'expired',
      startsAt: s.starts_at,
      expiresAt: s.expires_at,
      createdAt: s.created_at,
    }))

    const current = subscriptions.find(s => s.status === 'active') ?? null

    // Renewal amount = admin-configured plan price (env PLAN_PRICE), defaults to 250 000 XAF
    const renewalAmount = parseInt(process.env.PLAN_PRICE ?? '250000')

    return NextResponse.json({ current, history: subscriptions, renewalAmount })
  } catch (error) {
    console.error('Subscriptions GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
