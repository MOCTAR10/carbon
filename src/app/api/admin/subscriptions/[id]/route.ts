import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

async function requireAdmin(session: Awaited<ReturnType<typeof getSession>>) {
  if (!session) return false
  const result = await query('SELECT role FROM users WHERE id = $1', [session.userId])
  return result.rows.length > 0 && result.rows[0].role === 'admin'
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const session = await getSession('admin')
    if (!await requireAdmin(session)) return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })

    const subId = parseInt(params.id)
    const { action, months } = await request.json()

    if (action === 'activate') {
      const now = new Date()
      const expires = new Date(now)
      expires.setMonth(expires.getMonth() + (months || 1))
      await query(
        `UPDATE subscriptions SET status = 'active', starts_at = $1, expires_at = $2 WHERE id = $3`,
        [now.toISOString(), expires.toISOString(), subId]
      )
    } else if (action === 'revoke') {
      await query(`UPDATE subscriptions SET status = 'expired' WHERE id = $1`, [subId])
    } else if (action === 'extend') {
      const safeMonths = parseInt(months) || 1
      await query(
        `UPDATE subscriptions SET expires_at = expires_at + ($1::TEXT || ' months')::INTERVAL WHERE id = $2`,
        [safeMonths, subId]
      )
    } else {
      return NextResponse.json({ error: 'Action invalide' }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin subscription update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
