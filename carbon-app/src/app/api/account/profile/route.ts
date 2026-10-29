import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCompanySession, unauthorized } from '@/lib/company'

export const dynamic = 'force-dynamic'

const toProfile = (u: Record<string, unknown>) => ({
  email: u.email,
  firstName: u.first_name ?? '',
  lastName: u.last_name ?? '',
  phone: u.phone ?? '',
  createdAt: u.created_at,
  termsVersion: u.terms_version ?? null,
  termsAcceptedAt: u.terms_accepted_at ?? null,
})

const PROFILE_COLUMNS = 'email, first_name, last_name, phone, created_at, terms_version, terms_accepted_at'

export async function GET() {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()
    const r = await query(`SELECT ${PROFILE_COLUMNS} FROM users WHERE id = $1`, [session.userId])
    if (!r.rows[0]) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    return NextResponse.json(toProfile(r.rows[0]))
  } catch (error) {
    console.error('Profile GET error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()

    const body = await request.json().catch(() => null)
    if (!body || typeof body !== 'object') return NextResponse.json({ error: 'Requête invalide' }, { status: 400 })
    const str = (v: unknown) => (typeof v === 'string' ? v.trim() : '')
    const firstName = str(body.firstName)
    const lastName = str(body.lastName)
    const phone = str(body.phone)

    if (!firstName || !lastName) return NextResponse.json({ error: 'Le prénom et le nom sont requis' }, { status: 400 })
    if (firstName.length > 100 || lastName.length > 100) {
      return NextResponse.json({ error: 'Le prénom et le nom ne peuvent dépasser 100 caractères' }, { status: 400 })
    }
    if (phone && !/^\+?[\d\s().-]{6,30}$/.test(phone)) {
      return NextResponse.json({ error: 'Numéro de téléphone invalide' }, { status: 400 })
    }

    const r = await query(
      `UPDATE users SET first_name = $1, last_name = $2, phone = $3, updated_at = NOW()
       WHERE id = $4 RETURNING ${PROFILE_COLUMNS}`,
      [firstName, lastName, phone || null, session.userId]
    )
    if (!r.rows[0]) return NextResponse.json({ error: 'Utilisateur introuvable' }, { status: 404 })
    return NextResponse.json(toProfile(r.rows[0]))
  } catch (error) {
    console.error('Profile PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
