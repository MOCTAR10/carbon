import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

// Detect which portal the request comes from so we read the right cookie
function portalFrom(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('portal')
  if (p === 'admin' || p === 'expert') return p
  return 'user' as const
}

export async function GET(request: NextRequest) {
  try {
    const portal = portalFrom(request)
    const session = await getSession(portal)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    const result = await query(
      `SELECT id, type, title, message, link, read, created_at
       FROM notifications
       WHERE user_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [session.userId]
    )

    const unread = result.rows.filter(r => !r.read).length

    return NextResponse.json({ notifications: result.rows, unread })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
