import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const session = await getSession('admin')
    if (!session) return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })

    const userResult = await query('SELECT role FROM users WHERE id = $1', [session.userId])
    if (userResult.rows.length === 0 || userResult.rows[0].role !== 'admin') {
      return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
    }

    const result = await query('SELECT id, name, sector FROM companies ORDER BY name ASC')
    return NextResponse.json(result.rows)
  } catch (error) {
    console.error('Companies list error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
