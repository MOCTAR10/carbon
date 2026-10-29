import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { hashPassword, createToken } from '@/lib/auth'
import { clientIp, rateLimit } from '@/lib/rate-limit'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '')

export async function POST(request: NextRequest) {
  try {
    const wait = rateLimit(`register:${clientIp(request)}`, 5, 60 * 60 * 1000)
    if (wait) {
      return NextResponse.json(
        { error: 'Trop de créations de compte depuis cette adresse. Réessayez plus tard.' },
        { status: 429, headers: { 'Retry-After': String(wait) } }
      )
    }

    const body = await request.json().catch(() => ({}))
    const email = str(body.email, 255).toLowerCase()
    const password = typeof body.password === 'string' ? body.password : ''
    const firstName = str(body.firstName, 100)
    const lastName = str(body.lastName, 100)
    const companyName = str(body.companyName, 255)
    const phone = str(body.phone, 30)
    const rccm = str(body.rccm, 100) || null
    const sector = str(body.sector, 100) || null
    const termsVersion = str(body.acceptedTermsVersion, 20)

    if (!email || !password || !firstName || !lastName || !companyName || !phone) {
      return NextResponse.json({ error: 'Tous les champs obligatoires doivent être remplis' }, { status: 400 })
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Adresse email invalide' }, { status: 400 })
    }
    if (password.length < 8 || password.length > 128) {
      return NextResponse.json({ error: 'Le mot de passe doit contenir au moins 8 caractères' }, { status: 400 })
    }
    if (!termsVersion) {
      return NextResponse.json({ error: 'Vous devez accepter les conditions d’utilisation' }, { status: 400 })
    }

    const existing = await query('SELECT id FROM users WHERE LOWER(email) = $1', [email])
    if (existing.rows.length > 0) {
      return NextResponse.json({ error: 'Un compte avec cet email existe déjà' }, { status: 409 })
    }

    const hashedPassword = await hashPassword(password)

    // Company + user created atomically — if user insert fails, company is rolled back
    const { userId, companyId } = await withTransaction(async (client) => {
      const companyResult = await client.query(
        'INSERT INTO companies (name, rccm, sector) VALUES ($1, $2, $3) RETURNING id',
        [companyName, rccm, sector]
      )
      const companyId = companyResult.rows[0].id

      const userResult = await client.query(
        `INSERT INTO users (email, password_hash, first_name, last_name, phone, company_id, role, terms_version, terms_accepted_at)
         VALUES ($1, $2, $3, $4, $5, $6, 'user', $7, NOW()) RETURNING id`,
        [email, hashedPassword, firstName, lastName, phone, companyId, termsVersion]
      )
      return { userId: userResult.rows[0].id, companyId }
    })

    const token = await createToken({ userId, email, companyId, role: 'user' })

    const response = NextResponse.json({ success: true, userId, companyId })
    response.cookies.set('token', token, {
      httpOnly: true,
      // Opt-in via env so HTTP-only deploys don't get cookies dropped by browser
      secure: process.env.COOKIE_SECURE === 'true',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7,
      path: '/',
    })

    return response
  } catch (error: unknown) {
    const errMsg = error instanceof Error ? error.message : String(error)
    console.error('Registration error:', errMsg)
    return NextResponse.json({ error: "Erreur lors de l'inscription. Veuillez réessayer." }, { status: 500 })
  }
}
