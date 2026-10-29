import { NextRequest, NextResponse } from 'next/server'
import { query } from '@/lib/db'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export const dynamic = 'force-dynamic'

async function getPartnerSession() {
  const token = cookies().get('token')?.value
  if (!token) return null
  try {
    const decoded = await verifyToken(token)
    if (!decoded || (decoded.role !== 'partner' && decoded.role !== 'admin')) return null
    return decoded
  } catch {
    return null
  }
}

// GET /api/partner/projects — list own projects (or all for admin)
export async function GET(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const { searchParams } = new URL(req.url)
  const partnerIdParam = searchParams.get('partner_id')

  let partnerId: number | null = null
  if (session.role === 'admin' && partnerIdParam) {
    partnerId = parseInt(partnerIdParam)
  } else if (session.role === 'partner') {
    partnerId = session.partnerId ?? null
  }

  const result = partnerId
    ? await query(
        `SELECT cp.*, p.name as partner_name
         FROM carbon_projects cp
         LEFT JOIN partners p ON cp.partner_id = p.id
         WHERE cp.partner_id = $1
         ORDER BY cp.created_at DESC`,
        [partnerId]
      )
    : await query(
        `SELECT cp.*, p.name as partner_name
         FROM carbon_projects cp
         LEFT JOIN partners p ON cp.partner_id = p.id
         ORDER BY cp.created_at DESC`
      )

  const projects = result.rows.map(r => ({
    ...r,
    price_per_ton: parseFloat(r.price_per_ton),
    tons_available: parseFloat(r.tons_available),
    tons_sold: parseFloat(r.tons_sold),
    co2_removed_actual: parseFloat(r.co2_removed_actual ?? 0),
    hectares_managed: parseFloat(r.hectares_managed ?? 0),
    total_budget_fcfa: parseInt(r.total_budget_fcfa ?? 0),
    funds_received_fcfa: parseInt(r.funds_received_fcfa ?? 0),
  }))

  return NextResponse.json({ projects })
}

// POST /api/partner/projects — create a new project
export async function POST(req: NextRequest) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const partnerId = session.role === 'admin'
    ? (await req.json().catch(() => ({}))).partner_id ?? null
    : session.partnerId

  if (!partnerId) return NextResponse.json({ error: 'Partner ID manquant' }, { status: 400 })

  const body = await req.json().catch(() => ({}))
  const {
    title, description, project_type, country, location_name,
    latitude, longitude, methodology, standard, status,
    price_per_ton, tons_available, start_date, end_date,
    trees_planted, hectares_managed, co2_removed_actual,
    beneficiaries_count, jobs_created, total_budget_fcfa
  } = body

  if (!title || !project_type) {
    return NextResponse.json({ error: 'Titre et type de projet requis' }, { status: 400 })
  }

  const result = await query(
    `INSERT INTO carbon_projects (
      partner_id, title, description, project_type, country, location_name,
      latitude, longitude, methodology, standard, status,
      price_per_ton, tons_available, tons_sold, start_date, end_date,
      trees_planted, hectares_managed, co2_removed_actual,
      beneficiaries_count, jobs_created, total_budget_fcfa, created_at, updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,0,$14,$15,$16,$17,$18,$19,$20,$21,NOW(),NOW()
    ) RETURNING *`,
    [
      partnerId, title, description || null, project_type, country || null, location_name || null,
      latitude || null, longitude || null, methodology || null, standard || null, status || 'draft',
      price_per_ton || 0, tons_available || 0, start_date || null, end_date || null,
      trees_planted || 0, hectares_managed || 0, co2_removed_actual || 0,
      beneficiaries_count || 0, jobs_created || 0, total_budget_fcfa || 0
    ]
  )

  return NextResponse.json({ project: result.rows[0] }, { status: 201 })
}
