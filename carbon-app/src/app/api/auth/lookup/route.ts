import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { clientIp, rateLimit } from '@/lib/rate-limit'

/**
 * Login step 1: email → who is signing in (first name, company), so step 2 can greet the user
 * before asking for the password. Returns only display data, never ids or roles in clear.
 * Rate-limited per IP to slow down address harvesting.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json().catch(() => ({}))
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Adresse e-mail invalide' }, { status: 400 })
    }

    const wait = rateLimit(`lookup-ip:${clientIp(request)}`, 30, 15 * 60 * 1000)
    if (wait) {
      return NextResponse.json(
        { error: `Trop de tentatives. Réessayez dans ${Math.ceil(wait / 60)} min.` },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      )
    }

    const { rows } = await query(
      `SELECT u.first_name, u.last_name, u.role, c.name AS company_name, c.logo_url
         FROM users u LEFT JOIN companies c ON c.id = u.company_id
        WHERE LOWER(u.email) = $1 ORDER BY u.id LIMIT 1`,
      [email]
    )
    const u = rows[0]
    if (!u || u.role === 'cnc') {
      return NextResponse.json({ error: 'Aucun compte n’est associé à cette adresse e-mail.' }, { status: 404 })
    }

    const space = u.role === 'admin' ? 'Administration GreenLeaves'
      : u.role === 'expert' ? 'Expert accrédité'
      : u.company_name || 'Espace entreprise'

    return NextResponse.json({
      firstName: u.first_name || '',
      lastName: u.last_name || '',
      space,
      logoUrl: u.role === 'admin' || u.role === 'expert' ? null : u.logo_url || null,
    })
  } catch (error) {
    console.error('Login lookup error:', error)
    return NextResponse.json({ error: 'Erreur de connexion' }, { status: 500 })
  }
}
