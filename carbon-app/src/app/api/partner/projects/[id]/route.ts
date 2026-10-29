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

// PATCH /api/partner/projects/[id]
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const projectId = parseInt(params.id)
  if (isNaN(projectId)) return NextResponse.json({ error: 'ID invalide' }, { status: 400 })

  // Verify ownership
  const check = await query('SELECT partner_id FROM carbon_projects WHERE id = $1', [projectId])
  if (check.rows.length === 0) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  if (session.role !== 'admin' && check.rows[0].partner_id !== session.partnerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  const body = await req.json().catch(() => ({}))
  const allowed = [
    'title', 'description', 'project_type', 'country', 'location_name',
    'latitude', 'longitude', 'methodology', 'standard', 'status',
    'price_per_ton', 'tons_available', 'start_date', 'end_date',
    'trees_planted', 'hectares_managed', 'co2_removed_actual',
    'beneficiaries_count', 'jobs_created', 'total_budget_fcfa', 'funds_received_fcfa'
  ]

  const updates: string[] = []
  const values: unknown[] = []
  for (const key of allowed) {
    if (key in body) {
      updates.push(`${key} = $${values.length + 1}`)
      values.push(body[key])
    }
  }

  if (updates.length === 0) return NextResponse.json({ error: 'Aucun champ à mettre à jour' }, { status: 400 })

  updates.push(`updated_at = NOW()`)
  values.push(projectId)

  const result = await query(
    `UPDATE carbon_projects SET ${updates.join(', ')} WHERE id = $${values.length} RETURNING *`,
    values
  )

  return NextResponse.json({ project: result.rows[0] })
}

// DELETE /api/partner/projects/[id]
export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getPartnerSession()
  if (!session) return NextResponse.json({ error: 'Non autorisé' }, { status: 401 })

  const projectId = parseInt(params.id)
  const check = await query('SELECT partner_id, tons_sold FROM carbon_projects WHERE id = $1', [projectId])
  if (check.rows.length === 0) return NextResponse.json({ error: 'Projet introuvable' }, { status: 404 })

  if (session.role !== 'admin' && check.rows[0].partner_id !== session.partnerId) {
    return NextResponse.json({ error: 'Accès refusé' }, { status: 403 })
  }

  if (parseFloat(check.rows[0].tons_sold) > 0) {
    return NextResponse.json({ error: 'Impossible de supprimer un projet avec des ventes' }, { status: 409 })
  }

  await query('DELETE FROM carbon_projects WHERE id = $1', [projectId])
  return NextResponse.json({ success: true })
}
