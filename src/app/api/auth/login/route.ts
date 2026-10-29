import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyPassword, createToken, PORTAL_COOKIE } from '@/lib/auth'
import { FEATURES } from '@/lib/features'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: 'Email et mot de passe requis' }, { status: 400 })
    }

    const result = await query(
      'SELECT id, email, password_hash, company_id, partner_id, role, first_name, last_name FROM users WHERE email = $1',
      [email]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    const user = result.rows[0]
    const valid = await verifyPassword(password, user.password_hash)

    if (!valid) {
      return NextResponse.json({ error: 'Email ou mot de passe incorrect' }, { status: 401 })
    }

    // The CNC portal was removed — legacy CNC accounts can no longer sign in
    if (user.role === 'cnc') {
      return NextResponse.json({ error: "Ce compte n'est plus actif" }, { status: 403 })
    }
    if (user.role === 'partner' && !FEATURES.carbonMarket) {
      return NextResponse.json({ error: "L'espace partenaire est temporairement indisponible" }, { status: 403 })
    }

    const token = await createToken({
      userId: user.id,
      email: user.email,
      companyId: user.company_id || null,
      role: user.role,
      partnerId: user.partner_id || null,
    })

    const response = NextResponse.json({
      success: true,
      token,
      role: user.role,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.first_name,
        lastName: user.last_name,
        companyId: user.company_id || null,
        partnerId: user.partner_id || null,
        role: user.role,
      },
    })

    // Each role gets its own cookie — and we CLEAR the other portals' cookies so
    // stale tokens from previous sessions never contaminate cross-portal reads.
    const cookieName = user.role === 'admin'  ? PORTAL_COOKIE.admin  :
                       user.role === 'expert' ? PORTAL_COOKIE.expert :
                       PORTAL_COOKIE.user

    const cookieOpts = {
      httpOnly: true,
      // Opt-in via env so we can serve over HTTP (no DNS/TLS yet) without
      // browsers silently dropping the cookie. Set COOKIE_SECURE=true once
      // HTTPS is in place (Certbot etc.).
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax' as const,
      path: '/',
    }

    response.cookies.set(cookieName, token, { ...cookieOpts, maxAge: 60 * 60 * 24 * 7 })

    // Clear the other portals so no cross-portal leakage
    for (const [, name] of Object.entries(PORTAL_COOKIE)) {
      if (name !== cookieName) {
        response.cookies.set(name, '', { ...cookieOpts, maxAge: 0 })
      }
    }

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({ error: 'Erreur de connexion' }, { status: 500 })
  }
}
