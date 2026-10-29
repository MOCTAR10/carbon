import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { getCompanySession, unauthorized } from '@/lib/company'
import { SECTOR_LABELS } from '@/lib/sectors'

export const dynamic = 'force-dynamic'

/**
 * Name and RCCM identify the company on the dossier the expert files at the CNC and on the certificate,
 * so they are frozen once a certification request is live (any status but rejected).
 */
async function identityLocked(companyId: number) {
  const r = await query(
    `SELECT 1 FROM certification_requests WHERE company_id = $1 AND status <> 'rejected' LIMIT 1`,
    [companyId]
  )
  return r.rows.length > 0
}

const toCompany = (c: Record<string, unknown>, locked: boolean) => ({
  name: c.name ?? '',
  rccm: c.rccm ?? '',
  sector: c.sector ?? '',
  logoUrl: c.logo_url ?? null,
  identityLocked: locked,
})

export async function GET() {
  try {
    const session = await getCompanySession()
    if (!session) return unauthorized()
    const [r, locked] = await Promise.all([
      query('SELECT name, rccm, sector, logo_url FROM companies WHERE id = $1', [session.companyId]),
      identityLocked(session.companyId),
    ])
    if (!r.rows[0]) return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    return NextResponse.json(toCompany(r.rows[0], locked))
  } catch (error) {
    console.error('Company GET error:', error)
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
    const name = str(body.name)
    const rccm = str(body.rccm)
    const sector = str(body.sector)

    if (!name) return NextResponse.json({ error: 'La raison sociale est requise' }, { status: 400 })
    if (name.length > 255) return NextResponse.json({ error: 'La raison sociale ne peut dépasser 255 caractères' }, { status: 400 })
    if (rccm.length > 50) return NextResponse.json({ error: 'Le RCCM ne peut dépasser 50 caractères' }, { status: 400 })
    if (sector && !Object.prototype.hasOwnProperty.call(SECTOR_LABELS, sector)) {
      return NextResponse.json({ error: 'Secteur d’activité invalide' }, { status: 400 })
    }

    const current = await query('SELECT name, rccm FROM companies WHERE id = $1', [session.companyId])
    if (!current.rows[0]) return NextResponse.json({ error: 'Entreprise introuvable' }, { status: 404 })
    const locked = await identityLocked(session.companyId)
    const identityChanged = current.rows[0].name !== name || (current.rows[0].rccm ?? '') !== rccm
    if (locked && identityChanged) {
      return NextResponse.json(
        { error: 'La raison sociale et le RCCM sont verrouillés pendant la certification. Contactez le support pour les modifier.' },
        { status: 409 }
      )
    }

    const r = await query(
      `UPDATE companies SET name = $1, rccm = $2, sector = $3, updated_at = NOW()
       WHERE id = $4 RETURNING name, rccm, sector, logo_url`,
      [name, rccm || null, sector || null, session.companyId]
    )
    return NextResponse.json(toCompany(r.rows[0], locked))
  } catch (error) {
    console.error('Company PATCH error:', error)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
