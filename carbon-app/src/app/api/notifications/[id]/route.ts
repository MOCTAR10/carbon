import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

function portalFrom(req: NextRequest) {
  const p = req.nextUrl.searchParams.get('portal')
  if (p === 'admin' || p === 'expert') return p
  return 'user' as const
}

export async function PATCH(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const portal = portalFrom(request)
    const session = await getSession(portal)
    if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

    await query(
      `UPDATE notifications SET read = TRUE WHERE id = $1 AND user_id = $2`,
      [params.id, session.userId]
    )

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
