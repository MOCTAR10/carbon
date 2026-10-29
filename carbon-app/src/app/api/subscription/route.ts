import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getSession } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// GET: Check current subscription status
export async function GET() {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const result = await query(
      `SELECT * FROM subscriptions 
       WHERE company_id = $1 AND status = 'active' AND expires_at > NOW() 
       ORDER BY expires_at DESC LIMIT 1`,
      [session.companyId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ active: false, subscription: null })
    }

    const sub = result.rows[0]
    return NextResponse.json({
      active: true,
      subscription: {
        id: sub.id,
        plan: sub.plan,
        amount: sub.amount,
        currency: sub.currency,
        paymentMethod: sub.payment_method,
        paymentRef: sub.payment_ref,
        status: sub.status,
        startsAt: sub.starts_at,
        expiresAt: sub.expires_at,
      },
    })
  } catch (error) {
    console.error('Subscription check error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

// POST: Create/simulate a payment
export async function POST(request: NextRequest) {
  try {
    const session = await getSession()
    if (!session) return NextResponse.json({ error: 'Non authentifie' }, { status: 401 })

    const { paymentMethod, phoneNumber } = await request.json()

    if (!paymentMethod) {
      return NextResponse.json({ error: 'Methode de paiement requise' }, { status: 400 })
    }

    if (paymentMethod === 'airtel_money' && !phoneNumber) {
      return NextResponse.json({ error: 'Numero de telephone requis pour Airtel Money' }, { status: 400 })
    }

    // Check if already has active subscription
    const existing = await query(
      `SELECT id FROM subscriptions WHERE company_id = $1 AND status = 'active' AND expires_at > NOW()`,
      [session.companyId]
    )
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Vous avez deja un abonnement actif' }, { status: 409 })
    }

    const amount = 3_000_000
    const durationDays = 365

    const paymentRef = `CT-${Date.now()}-${Math.random().toString(36).slice(2, 8).toUpperCase()}`

    const result = await query(
      `INSERT INTO subscriptions (company_id, plan, amount, currency, payment_method, payment_ref, phone_payment, status, starts_at, expires_at)
       VALUES ($1, 'annual', $2, 'FCFA', $3, $4, $5, 'active', NOW(), NOW() + ($6 || ' days')::INTERVAL)
       RETURNING *`,
      [session.companyId, amount, paymentMethod || 'direct', paymentRef, phoneNumber || null, durationDays]
    )

    const sub = result.rows[0]
    return NextResponse.json({
      success: true,
      message: 'Paiement effectue avec succes (simulation)',
      subscription: {
        id: sub.id,
        plan: sub.plan,
        amount: sub.amount,
        currency: sub.currency,
        paymentMethod: sub.payment_method,
        paymentRef: sub.payment_ref,
        status: sub.status,
        startsAt: sub.starts_at,
        expiresAt: sub.expires_at,
      },
    })
  } catch (error) {
    console.error('Subscription creation error:', error)
    return NextResponse.json({ error: 'Erreur lors du paiement' }, { status: 500 })
  }
}
