import { request as pwRequest } from '@playwright/test'
import { test, expect, createSite, createAssessment, saveEntries, uid, YEAR } from '../support/fixtures'
import { db } from '../support/db'
import { ALL_EMISSION_FACTORS, SCOPE_MAPPING } from '../../src/lib/emission-factors'

// Factors created here use a "qa_" id and are removed afterwards (only this worker's: files run in parallel).
// Seeded factors are never modified.
const created: string[] = []
const qaId = () => { const id = `qa_${uid('f').replace(/[^a-z0-9]/gi, '_').toLowerCase()}`; created.push(id); return id }

test.afterAll(async () => {
  await db.query('DELETE FROM emission_factor_changes WHERE factor_id = ANY($1)', [created])
  await db.query('DELETE FROM emission_factors WHERE id = ANY($1)', [created])
})

test.describe('Bibliothèque de facteurs (base de données)', () => {
  test('la base contient tous les facteurs d’origine avec la même valeur et le même scope', async () => {
    const { rows } = await db.query('SELECT id, factor_total, scope FROM emission_factors')
    const byId = new Map(rows.map(r => [r.id, r]))
    const diffs: string[] = []
    for (const f of ALL_EMISSION_FACTORS) {
      const r = byId.get(f.id)
      if (!r) { diffs.push(`${f.id}: absent`); continue }
      if (Math.abs(Number(r.factor_total) - f.factorTotal) > 1e-9) diffs.push(`${f.id}: ${r.factor_total} ≠ ${f.factorTotal}`)
      const scope = (SCOPE_MAPPING[f.subcategory] ?? { scope: 3 }).scope
      if (r.scope !== scope) diffs.push(`${f.id}: scope ${r.scope} ≠ ${scope}`)
    }
    expect(diffs, diffs.join('\n')).toEqual([])
  })

  test('sources internationales et nouveaux postes : chaque facteur actif calcule juste, avec son scope', async ({ company }) => {
    test.setTimeout(120_000)
    const { factors } = await (await company.api.get('/api/emission-factors')).json()
    const active = (factors as { id: string; status: string; factorTotal: number; scope: number; subcategory: string; source: string }[])
      .filter(f => f.status === 'active' && !f.id.startsWith('qa_'))
    // DEFRA, GIEC, OMI factors and the three new postes are in the library
    const subs = new Set(active.map(f => f.subcategory))
    for (const s of ['flaring_venting', 'effluents_biogas', 'marine_fuels']) expect(subs.has(s), s).toBe(true)
    for (const src of ['DEFRA 2024', 'GIEC 2006', 'OMI 2018 / GIEC 2006']) expect(active.some(f => f.source === src), src).toBe(true)
    expect(active.find(f => f.id === 'hfo_maritime')?.subcategory).toBe('marine_fuels')

    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id)
    const res = await saveEntries(company.api, asmt.id, active.map((f, i) => ({ emissionFactorId: f.id, quantity: 10, month: (i % 12) + 1, year: YEAR })))
    expect(res.status(), await res.text()).toBe(201)
    const byId = new Map<string, { total_co2eq: string; scope: number }>((await res.json()).entries.map((e: { emission_factor_id: string }) => [e.emission_factor_id, e]))
    const bad = active.filter(f => {
      const e = byId.get(f.id)
      return !e || e.scope !== f.scope || Math.abs(parseFloat(e.total_co2eq) - Math.round(10 * f.factorTotal * 100) / 100) > 0.011
    }).map(f => f.id)
    expect(bad).toEqual([])
  })

  test('lecture réservée aux comptes connectés ; administration réservée aux admins', async ({ company, admin, baseURL }) => {
    const anon = await pwRequest.newContext({ baseURL })
    expect((await anon.get('/api/emission-factors')).status()).toBe(401)
    expect((await anon.get('/api/admin/emission-factors')).status()).toBe(403)
    await anon.dispose()

    const list = await (await company.api.get('/api/emission-factors')).json()
    expect(list.factors.length).toBeGreaterThanOrEqual(ALL_EMISSION_FACTORS.length)

    expect((await company.api.get('/api/admin/emission-factors')).status()).toBe(403)
    expect((await company.api.post('/api/admin/emission-factors/import', { data: { rows: [{ id: 'x' }], apply: true } })).status()).toBe(403)
    expect((await company.api.patch('/api/admin/emission-factors/butane_fr', { data: { status: 'retired' } })).status()).toBe(403)
    expect((await company.api.get('/api/admin/emission-factors/export')).status()).toBe(403)

    const adm = await (await admin.get('/api/admin/emission-factors')).json()
    expect(adm.factors.length).toBe(list.factors.length)
    expect(typeof adm.usage).toBe('object')
  })

  test('import : aperçu, refus si erreur, application, mise à jour tracée, retrait', async ({ admin, company }) => {
    const id = qaId()
    const good = { id, subcategory: 'electricity', name_fr: 'Électricité QA', unit: 'kgCO2eq/kWh', factor_total: '0,5', source: 'QA 2026', keywords: 'courant|réseau' }
    const bad = { id: 'Bad Id', category: 'nope', factor_total: '-1' }

    // Preview: nothing written, errors reported per line
    const preview = await (await admin.post('/api/admin/emission-factors/import', { data: { rows: [good, bad], apply: false } })).json()
    expect(preview.summary).toMatchObject({ created: 1, updated: 0, errors: expect.any(Number) })
    expect(preview.errors.every((e: { row: number }) => e.row === 3)).toBe(true)
    expect(preview.applied).toBe(false)

    // Apply refused while a row is invalid — all or nothing
    const refused = await admin.post('/api/admin/emission-factors/import', { data: { rows: [good, bad], apply: true } })
    expect(refused.status()).toBe(400)
    expect((await db.query('SELECT 1 FROM emission_factors WHERE id = $1', [id])).rowCount).toBe(0)

    // Apply: scope and GHG category come from the known subcategory, decimal comma accepted
    const applied = await (await admin.post('/api/admin/emission-factors/import', { data: { rows: [good], apply: true, label: 'Lot QA' } })).json()
    expect(applied).toMatchObject({ applied: true, summary: { created: 1 } })
    const created = (await (await company.api.get('/api/emission-factors')).json()).factors.find((f: { id: string }) => f.id === id)
    expect(created).toMatchObject({ scope: 2, factorTotal: 0.5, category: 'energy', status: 'active', keywords: ['courant', 'réseau'] })
    expect(created.ghgCategory).not.toBe('')

    // The new factor is usable right away in a bilan
    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id)
    const saved = await saveEntries(company.api, asmt.id, [{ emissionFactorId: id, quantity: 100, month: 1, year: YEAR }])
    expect(saved.status(), await saved.text()).toBe(201)
    const [row] = (await saved.json()).entries
    expect(parseFloat(row.total_co2eq)).toBeCloseTo(50, 2)
    expect(row.scope).toBe(2)

    // Re-import with a new value: diff shown with the open bilan count, then logged
    const changed = { id, factor_total: '0.6' }
    const diff = await (await admin.post('/api/admin/emission-factors/import', { data: { rows: [changed], apply: false } })).json()
    expect(diff.summary).toMatchObject({ created: 0, updated: 1, errors: 0 })
    expect(diff.updated[0]).toMatchObject({ id, openBilans: 1, fields: [{ field: 'factor_total', before: 0.5, after: 0.6 }] })
    expect((await admin.post('/api/admin/emission-factors/import', { data: { rows: [changed], apply: true } })).status()).toBe(200)

    // Same file again: nothing to change
    const again = await (await admin.post('/api/admin/emission-factors/import', { data: { rows: [changed], apply: false } })).json()
    expect(again.summary).toMatchObject({ updated: 0, unchanged: 1 })

    // The saved entry keeps the value it was computed with
    const entry = await db.query('SELECT factor_value FROM emission_entries WHERE assessment_id = $1', [asmt.id])
    expect(Number(entry.rows[0].factor_value)).toBeCloseTo(0.5, 6)

    // Retire: no longer offered, still flagged in the library, still accepted for existing bilans
    const retired = await admin.patch(`/api/admin/emission-factors/${id}`, { data: { status: 'retired' } })
    expect(retired.status()).toBe(200)
    const after = (await (await company.api.get('/api/emission-factors')).json()).factors.find((f: { id: string }) => f.id === id)
    expect(after.status).toBe('retired')
    expect((await saveEntries(company.api, asmt.id, [{ emissionFactorId: id, quantity: 10, month: 2, year: YEAR }])).status()).toBe(201)

    const { rows: log } = await db.query('SELECT action, batch_label FROM emission_factor_changes WHERE factor_id = $1 ORDER BY id', [id])
    expect(log.map(l => l.action)).toEqual(['created', 'updated', 'retired'])
    expect(log[0].batch_label).toBe('Lot QA')

    // Export: CSV template with the header and the factor
    const csv = await (await admin.get('/api/admin/emission-factors/export')).text()
    expect(csv.split('\r\n')[0]).toContain('id;category;subcategory;name_fr')
    expect(csv).toContain(`${id};energy;electricity;Électricité QA`)
  })

  test('import : validation des champs', async ({ admin }) => {
    const rows = [
      { id: qaId(), subcategory: 'nouvelle_sc', category: 'energy', name_fr: 'Sans scope', unit: 'kgCO2eq/kg', factor_total: '1', source: 'QA' },
      { id: qaId(), subcategory: 'electricity', name_fr: 'Mauvaise unité', unit: 'kg/kWh', factor_total: '1', source: 'QA' },
      { id: qaId(), subcategory: 'electricity', name_fr: 'Secteur inconnu', unit: 'kgCO2eq/kWh', factor_total: '1', source: 'QA', sectors: 'inconnu' },
    ]
    const res = await (await admin.post('/api/admin/emission-factors/import', { data: { rows, apply: false } })).json()
    const msgs = (row: number) => res.errors.filter((e: { row: number }) => e.row === row).map((e: { message: string }) => e.message).join(' ')
    expect(msgs(2)).toContain('scope')
    expect(msgs(3)).toContain('unit')
    expect(msgs(4)).toContain('sectors')
    expect(res.summary.created).toBe(0)

    const dup = { id: qaId(), subcategory: 'electricity', name_fr: 'Doublon', unit: 'kgCO2eq/kWh', factor_total: '1', source: 'QA' }
    const res2 = await (await admin.post('/api/admin/emission-factors/import', { data: { rows: [dup, dup], apply: false } })).json()
    expect(res2.errors[0]).toMatchObject({ row: 3, message: expect.stringContaining('double') })
  })
})
