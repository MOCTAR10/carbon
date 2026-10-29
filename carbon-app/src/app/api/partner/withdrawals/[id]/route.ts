import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getAdminSession() {
  const token = cookies().get('token')?.value
  if (!token) return null
  try {
    const decoded = await verifyToken(token)
    if (!decoded || decoded.role !== 'admin') return null
    return decoded
  } catch {
    return null
  }
}

// PATCH /api/partner/withdrawals/[id] — admin process (approve/pay/reject)
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return NextResponse.json({ error: 'Réservé aux administrateurs' }, { status: 403 })

  const withdrawalId = parseInt(params.id)
  if (isNaN(withdrawalId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const { status, admin_note } = body

  if (!['approved', 'paid', 'rejected', 'pending'].includes(status)) {
    return NextResponse.json({ error: 'Statut invalide (approved | paid | rejected | pending)' }, { status: 400 })
  }

  // Fetch the withdrawal first
  const check = await query('SELECT * FROM partner_withdrawals WHERE id = $1', [withdrawalId])
  if (check.rows.length === 0) return NextResponse.json({ error: 'Demande introuvable' }, { status: 404 })

  const withdrawal = check.rows[0]

  // If marking as paid, deduct from partner wallet
  if (status === 'paid' && withdrawal.status !== 'paid') {
    await query(
      `UPDATE partners SET wallet_balance = wallet_balance - $1 WHERE id = $2`,
      [withdrawal.amount_fcfa, withdrawal.partner_id]
    )
  }

  // If reversing a paid withdrawal back to another status, restore balance
  if (withdrawal.status === 'paid' && status !== 'paid') {
    await query(
      `UPDATE partners SET wallet_balance = wallet_balance + $1 WHERE id = $2`,
      [withdrawal.amount_fcfa, withdrawal.partner_id]
    )
  }

  const result = await query(
    `UPDATE partner_withdrawals
     SET status = $1, admin_note = $2, processed_by = $3, processed_at = CASE WHEN $1 IN ('paid','rejected') THEN NOW() ELSE processed_at END
     WHERE id = $4
     RETURNING *`,
    [status, admin_note || null, session.userId, withdrawalId]
  )

  return NextResponse.json({ withdrawal: result.rows[0] })
}
