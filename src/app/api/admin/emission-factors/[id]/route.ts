import { NextRequest, NextResponse } from 'next/server'
import { withTransaction } from '@/lib/db'
import { getAdminSession, forbidden } from '@/lib/admin'
import { toFactor, invalidateFactorCache } from '@/lib/factor-library'
import { fromLibrary } from '@/lib/factor-import'

export const dynamic = 'force-dynamic'

/** Retire / restore a factor, or mark it as recommended. Values are changed through an import (audited diff). */
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getAdminSession()
  if (!session) return forbidden()

  let body: { status?: unknown; isRecommended?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  const status = body.status
  const isRecommended = body.isRecommended
  if (status !== undefined && status !== 'active' && status !== 'retired') return NextResponse.json({ error: 'Statut invalide' }, { status: 400 })
  if (isRecommended !== undefined && typeof isRecommended !== 'boolean') return NextResponse.json({ error: 'Valeur invalide' }, { status: 400 })
  if (status === undefined && isRecommended === undefined) return NextResponse.json({ error: 'Rien à modifier' }, { status: 400 })

  try {
    const factor = await withTransaction(async client => {
      const { rows } = await client.query('SELECT * FROM emission_factors WHERE id = $1 FOR UPDATE', [params.id])
      if (!rows[0]) return null
      const before = fromLibrary(toFactor(rows[0]))
      const { rows: [updated] } = await client.query(
        `UPDATE emission_factors SET status = COALESCE($2, status), is_recommended = COALESCE($3, is_recommended), updated_at = NOW()
         WHERE id = $1 RETURNING *`,
        [params.id, status ?? null, isRecommended ?? null]
      )
      const after = fromLibrary(toFactor(updated))
      const action = status && status !== before.status ? (status === 'retired' ? 'retired' : 'restored') : 'updated'
      if (JSON.stringify(before) !== JSON.stringify(after)) {
        await client.query(
          `INSERT INTO emission_factor_changes (factor_id, action, before, after, changed_by) VALUES ($1, $2, $3, $4, $5)`,
          [params.id, action, JSON.stringify(before), JSON.stringify(after), session.userId]
        )
      }
      return toFactor(updated)
    })
    if (!factor) return NextResponse.json({ error: 'Facteur introuvable' }, { status: 404 })
    invalidateFactorCache()
    return NextResponse.json({ factor })
  } catch (err) {
    console.error('[admin/emission-factors PATCH]', err)
    return NextResponse.json({ error: 'Erreur serveur' }, { status: 500 })
  }
}
