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

    const userId = parseInt(params.id)
    const { role } = await request.json()

    if (!['user', 'admin', 'expert'].includes(role)) {
      return NextResponse.json({ error: 'Rôle invalide' }, { status: 400 })
    }

    // Prevent admin from removing their own admin role
    if (session && userId === session.userId && role !== 'admin') {
      return NextResponse.json({ error: 'Vous ne pouvez pas retirer votre propre rôle admin' }, { status: 400 })
    }

    await query('UPDATE users SET role = $1 WHERE id = $2', [role, userId])
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin user update error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
