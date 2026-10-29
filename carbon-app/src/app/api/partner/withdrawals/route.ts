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
  } catch {
    return null
  }
}

// GET /api/partner/withdrawals
export async function GET(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const partnerIdParam = searchParams.get('partner_id')

  let partnerId: number | null = null
  if (session.role === 'admin' && partnerIdParam) {
    partnerId = parseInt(partnerIdParam)
  } else if (session.role === 'partner') {
    partnerId = session.partnerId ?? null
  }

  const result = partnerId
    ? await query(
        `SELECT w.*, u.email as processed_by_email
         FROM partner_withdrawals w
         LEFT JOIN users u ON w.processed_by = u.id
         WHERE w.partner_id = $1
         ORDER BY w.created_at DESC`,
        [partnerId]
      )
    : await query(
        `SELECT w.*, p.name as partner_name, u.email as processed_by_email
         FROM partner_withdrawals w
         LEFT JOIN partners p ON w.partner_id = p.id
         LEFT JOIN users u ON w.processed_by = u.id
         ORDER BY w.created_at DESC`
      )

  return NextResponse.json({ withdrawals: result.rows })
}

// POST /api/partner/withdrawals — request a withdrawal
export async function POST(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  if (session.role !== 'partner') {
    return NextResponse.json({ error: 'Réservé aux partenaires' }, { status: 403 })
  }

  const partnerId = session.partnerId
  if (!partnerId) return NextResponse.json({ error: 'Partner ID manquant' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { amount_fcfa, method, recipient_info } = body

  if (!amount_fcfa || amount_fcfa < 1000) {
    return NextResponse.json({ error: 'Montant minimum: 1 000 FCFA' }, { status: 400 })
  }

  // Check wallet balance
  const balanceResult = await query(
    'SELECT wallet_balance FROM partners WHERE id = $1',
    [partnerId]
  )
  if (balanceResult.rows.length === 0) return NextResponse.json({ error: 'Partenaire introuvable' }, { status: 404 })

  const balance = parseFloat(balanceResult.rows[0].wallet_balance) || 0
  if (amount_fcfa > balance) {
    return NextResponse.json({ error: `Solde insuffisant (${balance.toLocaleString('fr-FR')} FCFA disponible)` }, { status: 422 })
  }

  // Check no pending withdrawal already
  const pending = await query(
    `SELECT id FROM partner_withdrawals WHERE partner_id = $1 AND status = 'pending'`,
    [partnerId]
  )
  if (pending.rows.length > 0) {
    return NextResponse.json({ error: 'Une demande de retrait est déjà en cours de traitement' }, { status: 409 })
  }

  const result = await query(
    `INSERT INTO partner_withdrawals (partner_id, amount_fcfa, method, recipient_info)
     VALUES ($1,$2,$3,$4) RETURNING *`,
    [partnerId, amount_fcfa, method || 'mobile_money', recipient_info || null]
  )

  return NextResponse.json({ withdrawal: result.rows[0] }, { status: 201 })
}
