import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// User-initiated subscription renewal / new subscription request
// Creates a 'pending' subscription visible to admin for activation
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const userResult = await query('SELECT company_id FROM users WHERE id = $1', [session.userId])
    if (userResult.rows.length === 0) return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })

    const companyId = userResult.rows[0].company_id

    const { plan, amount, currency, paymentMethod, phonePayment } = await request.json()
    if (!phonePayment) {
      return NextResponse.json({ error: 'Numéro de téléphone requis' }, { status: 400 })
    }

    // Create pending subscription — admin will activate it after payment confirmation
    const now = new Date()
    const result = await query(
      `INSERT INTO subscriptions
         (company_id, plan, amount, currency, payment_method, phone_payment, status, starts_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7, $7)
       RETURNING id`,
      [
        companyId,
        plan || 'monthly',
        amount || 250000,
        currency || 'XAF',
        paymentMethod || 'Airtel Money',
        phonePayment,
        now.toISOString(),
      ]
    )

    return NextResponse.json({ id: result.rows[0].id, status: 'pending' }, { status: 201 })
  } catch (error) {
    console.error('Subscription request error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
