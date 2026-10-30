import { NextRequest, NextResponse } from 'next/server'
import { query, withTransaction } from '@/lib/db'
import { getAdminSession, forbidden } from '@/lib/admin'
import { toFactor, invalidateFactorCache } from '@/lib/factor-library'
import { validateRow, diffFactor, fromLibrary, type FactorInput, type Template } from '@/lib/factor-import'

export const dynamic = 'force-dynamic'

const MAX_ROWS = 2000

const COLUMNS: (keyof FactorInput)[] = [
  'id', 'category', 'subcategory', 'name', 'name_fr', 'unit', 'factor_upstream', 'factor_combustion', 'factor_total',
  'scope', 'ghg_category', 'iso_category', 'source', 'source_ref', 'source_year', 'region', 'uncertainty', 'licence',
  'keywords', 'sectors', 'site_types', 'is_recommended', 'status',
]

/**
 * Import of factor rows (parsed from CSV/XLSX in the browser).
 * apply=false → preview only (what would be created / changed, errors per row). apply=true → writes everything
 * in one transaction, or nothing if any row is invalid. Entries already saved keep the value they were saved with.
 */
export async function POST(req: NextRequest) {
  const session = await getAdminSession()
  if (!session) return forbidden()

  let body: { rows?: unknown; label?: unknown; apply?: unknown }
  try { body = await req.json() } catch { return NextResponse.json({ error: 'JSON invalide' }, { status: 400 }) }
  const rows = body.rows
  if (!Array.isArray(rows) || rows.length === 0) return NextResponse.json({ error: 'Aucune ligne à importer' }, { status: 400 })
  if (rows.length > MAX_ROWS) return NextResponse.json({ error: `${MAX_ROWS} lignes maximum par import` }, { status: 400 })
  const label = typeof body.label === 'string' ? body.label.trim().slice(0, 200) : ''
  const apply = body.apply === true

  try {
    const current = new Map(
      (await query('SELECT * FROM emission_factors')).rows.map(r => { const f = fromLibrary(toFactor(r)); return [f.id, f] })
    )
    const templates = new Map<string, Template>()
    for (const f of Array.from(current.values())) {
      if (!templates.has(f.subcategory)) templates.set(f.subcategory, { category: f.category, scope: f.scope, ghg_category: f.ghg_category, iso_category: f.iso_category })
    }

    const errors: { row: number; id?: string; message: string }[] = []
    const toCreate: FactorInput[] = []
    const toUpdate: { before: FactorInput; after: FactorInput; fields: ReturnType<typeof diffFactor> }[] = []
    let unchanged = 0
    const seen = new Set<string>()

    rows.forEach((raw, i) => {
      const row = i + 2 // line number in the file (header is line 1)
      if (!raw || typeof raw !== 'object' || Array.isArray(raw)) { errors.push({ row, message: 'Ligne illisible' }); return }
      const id = String((raw as Record<string, unknown>).id ?? '').trim()
      if (id && seen.has(id)) { errors.push({ row, id, message: 'Identifiant en double dans le fichier' }); return }
      if (id) seen.add(id)
      const existing = current.get(id)
      const res = validateRow(raw as Record<string, unknown>, existing && { ...existing }, sub => templates.get(sub))
      if ('errors' in res) { res.errors.forEach(message => errors.push({ row, id: id || undefined, message })); return }
      if (!existing) { toCreate.push(res.ok); return }
      const fields = diffFactor(existing, res.ok)
      if (fields.length) toUpdate.push({ before: existing, after: res.ok, fields })
      else unchanged++
    })

    // Bilans not yet submitted for certification will use the new value at their next save
    const openBilans: Record<string, number> = {}
    if (toUpdate.length) {
      const { rows: used } = await query(
        `SELECT e.emission_factor_id AS id, COUNT(DISTINCT e.assessment_id)::int AS n
         FROM emission_entries e
         WHERE e.emission_factor_id = ANY($1)
           AND NOT EXISTS (SELECT 1 FROM certification_requests c WHERE c.assessment_id = e.assessment_id AND c.status <> 'rejected')
         GROUP BY e.emission_factor_id`,
        [toUpdate.map(u => u.after.id)]
      )
      for (const r of used) openBilans[r.id] = r.n
    }

    const preview = {
      summary: { created: toCreate.length, updated: toUpdate.length, unchanged, errors: new Set(errors.map(e => e.row)).size },
      created: toCreate.map(f => ({ id: f.id, nameFr: f.name_fr, category: f.category, scope: f.scope, factorTotal: f.factor_total, unit: f.unit, source: f.source })),
      updated: toUpdate.map(u => ({ id: u.after.id, nameFr: u.after.name_fr, fields: u.fields, openBilans: openBilans[u.after.id] ?? 0 })),
      errors,
      applied: false,
    }

    if (!apply) return NextResponse.json(preview)
    if (errors.length) return NextResponse.json({ ...preview, error: 'Corrigez les erreurs avant d’importer' }, { status: 400 })
    if (!toCreate.length && !toUpdate.length) return NextResponse.json({ ...preview, applied: true })

    const placeholders = COLUMNS.map((_, i) => `$${i + 1}`).join(', ')
    const updates = COLUMNS.filter(c => c !== 'id').map(c => `${c} = EXCLUDED.${c}`).join(', ')
    await withTransaction(async client => {
      for (const f of [...toCreate, ...toUpdate.map(u => u.after)]) {
        await client.query(
          `INSERT INTO emission_factors (${COLUMNS.join(', ')}) VALUES (${placeholders})
           ON CONFLICT (id) DO UPDATE SET ${updates}, updated_at = NOW()`,
          COLUMNS.map(c => f[c])
        )
      }
      const log = async (factorId: string, action: string, before: FactorInput | null, after: FactorInput) =>
        client.query(
          `INSERT INTO emission_factor_changes (factor_id, action, before, after, batch_label, changed_by)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [factorId, action, before && JSON.stringify(before), JSON.stringify(after), label || null, session.userId]
        )
      for (const f of toCreate) await log(f.id, 'created', null, f)
      for (const u of toUpdate) {
        const statusOnly = u.fields.length === 1 && u.fields[0].field === 'status'
        await log(u.after.id, statusOnly ? (u.after.status === 'retired' ? 'retired' : 'restored') : 'updated', u.before, u.after)
      }
    })
    invalidateFactorCache()
    return NextResponse.json({ ...preview, applied: true })
  } catch (err) {
    console.error('[admin/emission-factors/import]', err)
    return NextResponse.json({ error: 'Erreur lors de l’import' }, { status: 500 })
  }
}
