import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCompanySession, unauthorized } from '@/lib/company'
import { hashPassword, verifyPassword } from '@/lib/auth'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    // Brute-force damping on the current-password check
    const wait = rateLimit(`pwd:${session.userId}`, 5, 15 * 60_000)
    if (wait) {
      return NextResponse.json(
        { error: 'Trop de tentatives. Réessayez dans quelques minutes.' },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      )
    }

    const body = await request.json().catch(() => null)
    const currentPassword = typeof body?.currentPassword === 'string' ? body.currentPassword : ''
    const newPassword = typeof body?.newPassword === 'string' ? body.newPassword : ''

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Mot de passe actuel et nouveau mot de passe requis' }, { status: 400 })
    }
    if (newPassword.length < 8 || newPassword.length > 128) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit contenir entre 8 et 128 caractères' }, { status: 400 })
    }
    if (newPassword === currentPassword) {
      return NextResponse.json({ error: 'Le nouveau mot de passe doit être différent de l’actuel' }, { status: 400 })
    }

    const r = await query('SELECT password_hash FROM users WHERE id = $1', [session.userId])
    const hash = r.rows[0]?.password_hash
    if (!hash || !(await verifyPassword(currentPassword, hash))) {
      return NextResponse.json({ error: 'Mot de passe actuel incorrect' }, { status: 400 })
    }

    await query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [
      await hashPassword(newPassword),
      session.userId,
    ])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password change error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
