import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/auth'
import { query } from '@/lib/db'

export const dynamic = 'force-dynamic'

// PATCH /api/partners/:id — update partner profile or Puro.earth credentials
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const partnerId = parseInt(params.id)

  // Admin can update any partner; a partner user can only update themselves
  if (session.role !== 'admin' && (session.role !== 'partner' || session.partnerId !== partnerId)) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  try {
    const body = await req.json()
    const {
      puro_api_key,
      puro_api_secret,
      puro_account_number,
      puro_facility_code,
      mission,
      website,
      contact_email,
    } = body

    // Build update dynamically — only set what was sent
    const fields: string[] = []
    const values: unknown[] = []
    let i = 1

    if (puro_api_key !== undefined) { fields.push(`puro_api_key = $${i++}`); values.push(puro_api_key || null) }
    if (puro_api_secret !== undefined) { fields.push(`puro_api_secret = $${i++}`); values.push(puro_api_secret || null) }
    if (puro_account_number !== undefined) { fields.push(`puro_account_number = $${i++}`); values.push(puro_account_number || null) }
    if (puro_facility_code !== undefined) { fields.push(`puro_facility_code = $${i++}`); values.push(puro_facility_code || null) }
    if (mission !== undefined) { fields.push(`mission = $${i++}`); values.push(mission || null) }
    if (website !== undefined) { fields.push(`website = $${i++}`); values.push(website || null) }
    if (contact_email !== undefined) { fields.push(`contact_email = $${i++}`); values.push(contact_email || null) }

    // If Puro credentials are being set, mark as connected
    if (puro_api_key && puro_api_secret) {
      fields.push(`puro_connected = true`)
      fields.push(`puro_connected_at = NOW()`)
    }

    if (fields.length === 0) {
      return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })
    }

    values.push(partnerId)
    await query(
      `UPDATE partners SET ${fields.join(', ')} WHERE id = $${i}`,
      values
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Partner PATCH error]', err)
    return NextResponse.json({ error: 'Erreur base de données' }, { status: 500 })
  }
}

// GET /api/partners/:id — fetch single partner (admin only)
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession()
  if (!session || (session.role !== 'admin' && session.role !== 'partner')) {
    return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })
  }

  const partnerId = parseInt(params.id)

  try {
    const result = await query(
      `SELECT p.*,
              COALESCE(cp.total_projects, 0) as total_projects,
              COALESCE(cp.total_tons_available, 0) as total_tons_available,
              COALESCE(cp.total_tons_sold, 0) as total_tons_sold
       FROM partners p
       LEFT JOIN (
         SELECT partner_id, COUNT(*) as total_projects,
                SUM(tons_available) as total_tons_available,
                SUM(tons_sold) as total_tons_sold
         FROM carbon_projects GROUP BY partner_id
       ) cp ON p.id = cp.partner_id
       WHERE p.id = $1`,
      [partnerId]
    )

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Partenaire non trouvé' }, { status: 404 })
    }

    const p = result.rows[0]
    // Never expose secrets to non-admin
    if (session.role !== 'admin') {
      delete p.puro_api_key
      delete p.puro_api_secret
    }

    return NextResponse.json(p)
  } catch (err) {
    console.error('[Partner GET error]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
