import { test, expect, createSite, createAssessment, saveEntries, bilanWithData, YEAR } from '../support/fixtures'
import { ALL_EMISSION_FACTORS, SCOPE_MAPPING } from '../../src/lib/emission-factors'

const round2 = (n: number) => Math.round(n * 100) / 100

test.describe('Calcul des émissions (moteur serveur)', () => {
  test('chaque facteur de la base : total = quantité × facteur, scope correct, totaux du bilan cohérents', async ({ company }) => {
    test.setTimeout(120_000)
    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id)
    const qty = 1000
    const entries = ALL_EMISSION_FACTORS.map((f, i) => ({ emissionFactorId: f.id, quantity: qty, month: (i % 12) + 1, year: YEAR }))

    const res = await saveEntries(company.api, asmt.id, entries)
    expect(res.status(), await res.text()).toBe(201)
    const body = await res.json()
    expect(body.entries).toHaveLength(ALL_EMISSION_FACTORS.length)

    const byFactor = new Map<string, { total_co2eq: string; scope: number; factor_value: string }>(
      body.entries.map((e: { emission_factor_id: string }) => [e.emission_factor_id, e]))
    const expected = { total: 0, s1: 0, s2: 0, s3: 0 }
    const mismatches: string[] = []
    for (const f of ALL_EMISSION_FACTORS) {
      const row = byFactor.get(f.id)
      const scope = (SCOPE_MAPPING[f.subcategory] ?? { scope: 3 }).scope
      const total = round2(qty * f.factorTotal)
      expected.total += total
      expected[`s${scope}` as 's1' | 's2' | 's3'] += total
      if (!row) { mismatches.push(`${f.id}: absent`); continue }
      if (Math.abs(parseFloat(row.total_co2eq) - total) > 0.011) mismatches.push(`${f.id}: ${row.total_co2eq} ≠ ${total}`)
      if (row.scope !== scope) mismatches.push(`${f.id}: scope ${row.scope} ≠ ${scope}`)
    }
    expect(mismatches, mismatches.join('\n')).toEqual([])

    const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(parseFloat(a.total_co2eq)).toBeCloseTo(expected.total, 0)
    expect(parseFloat(a.scope1_co2eq)).toBeCloseTo(expected.s1, 0)
    expect(parseFloat(a.scope2_co2eq)).toBeCloseTo(expected.s2, 0)
    expect(parseFloat(a.scope3_co2eq)).toBeCloseTo(expected.s3, 0)
    expect(parseFloat(a.total_co2eq)).toBeCloseTo(parseFloat(a.scope1_co2eq) + parseFloat(a.scope2_co2eq) + parseFloat(a.scope3_co2eq), 0)
  })

  test('valeurs forgées par le client (total, scope, facteur) ignorées', async ({ company }) => {
    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id)
    const res = await company.api.post('/api/emissions', {
      data: { assessmentId: asmt.id, entries: [{ emissionFactorId: 'butane_fr', quantity: 10, month: 1, year: YEAR, totalCo2eq: -999999, scope: 3, factorValue: 0 }] },
    })
    expect(res.status()).toBe(201)
    const [row] = (await res.json()).entries
    expect(parseFloat(row.total_co2eq)).toBeCloseTo(34.6, 2)
    expect(row.scope).toBe(1)
    expect(parseFloat(row.factor_value)).toBeCloseTo(3.46, 4)
  })

  test('une sauvegarde remplace les saisies précédentes (pas de doublons)', async ({ company }) => {
    const { asmt } = await bilanWithData(company.api)
    await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'elec_gabon', quantity: 100, month: 2, year: YEAR }])
    const rows = await (await company.api.get(`/api/emissions?assessmentId=${asmt.id}`)).json()
    expect(rows).toHaveLength(1)
    expect(rows[0].emission_factor_id).toBe('elec_gabon')
    const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(parseFloat(a.total_co2eq)).toBeCloseTo(50.6, 1)
  })

  test('quantité 0 ignorée ; liste vide remet le bilan à zéro', async ({ company }) => {
    const { asmt } = await bilanWithData(company.api)
    const res = await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 0, month: 1, year: YEAR }])
    expect(res.status()).toBe(201)
    expect((await res.json()).entries).toHaveLength(0)
    const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(parseFloat(a.total_co2eq)).toBe(0)
  })

  for (const [label, entry] of [
    ['quantité négative', { quantity: -5 }],
    ['quantité non numérique', { quantity: 'beaucoup' }],
    ['quantité démesurée', { quantity: 1e13 }],
    ['facteur inconnu', { emissionFactorId: 'facteur_inexistant' }],
    ['année hors bilan', { year: YEAR - 3 }],
    ['mois invalide', { month: 13 }],
  ] as const) {
    test(`refuse : ${label} — et ne modifie rien`, async ({ company }) => {
      const { asmt } = await bilanWithData(company.api)
      const res = await company.api.post('/api/emissions', {
        data: { assessmentId: asmt.id, entries: [Object.assign({ emissionFactorId: 'butane_fr', quantity: 1, month: 1, year: YEAR }, entry)] },
      })
      expect(res.status()).toBe(400)
      expect((await res.json()).error).toBeTruthy()
      const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
      expect(parseFloat(a.total_co2eq)).toBeCloseTo(34.6, 1)
    })
  }

  test('bilan partiel : mois hors de la période refusés', async ({ company }) => {
    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id, { start_month: 1, end_month: 6 })
    const inside = await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 1, month: 6, year: YEAR }])
    expect(inside.status()).toBe(201)
    const outside = await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 1, month: 9, year: YEAR }])
    expect(outside.status()).toBe(400)
    expect((await outside.json()).error).toMatch(/Période hors du périmètre/)
  })

  test('le tableau de bord agrège par année sans additionner les exercices', async ({ company }) => {
    const site = await createSite(company.api)
    const prev = await createAssessment(company.api, site.id, { year: YEAR - 1, name: `Exercice ${YEAR - 1}` })
    const cur = await createAssessment(company.api, site.id)
    await saveEntries(company.api, prev.id, [{ emissionFactorId: 'butane_fr', quantity: 100, month: 1, year: YEAR - 1 }])
    await saveEntries(company.api, cur.id, [{ emissionFactorId: 'butane_fr', quantity: 50, month: 1, year: YEAR }])
    const stats = await (await company.api.get('/api/dashboard/stats')).json()
    const byYear = Object.fromEntries(stats.byYear.map((y: { year: number; total: number }) => [y.year, Number(y.total)]))
    expect(byYear[YEAR]).toBeCloseTo(173, 0)
    expect(byYear[YEAR - 1]).toBeCloseTo(346, 0)
    expect(stats.byYear[0].year).toBe(YEAR) // newest first
  })
})
