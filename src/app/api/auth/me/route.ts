import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const portal = (request.nextUrl.searchParams.get('portal') ?? 'user') as 'admin' | 'expert' | 'cnc' | 'user'
    const session = await getSession(portal)
    if (!session) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 })
    }

    const userResult = await query(
      `SELECT u.id, u.email, u.first_name, u.last_name, u.phone, u.role,
              c.id as company_id, c.name as company_name, c.rccm, c.sector, c.logo_url
       FROM users u
       LEFT JOIN companies c ON u.company_id = c.id
       WHERE u.id = $1`,
      [session.userId]
    )

    if (userResult.rows.length === 0) {
      return NextResponse.json({ error: 'Utilisateur non trouvé' }, { status: 404 })
    }

    const user = userResult.rows[0]

    return NextResponse.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      company: user.company_id ? {
        id: user.company_id,
        name: user.company_name,
        rccm: user.rccm,
        sector: user.sector,
        logoUrl: user.logo_url || null,
      } : null,
    })
  } catch (error) {
    console.error('Auth check error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
