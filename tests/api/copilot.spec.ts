import { request as pwRequest } from '@playwright/test'
import { test, expect, createSite, createAssessment, saveEntries, requestCertification, registerCompany, YEAR } from '../support/fixtures'
import { deleteCompanies } from '../support/cleanup'
import { db } from '../support/db'
import type { LibraryFactor } from '../../src/lib/factor-library'
import {
  QUESTIONS, analyse, buildHints, buildPlan, checklist, resolveAnswers, searchFactors, replacementFor, type Context, type Quantities,
} from '../../src/lib/copilot'

const ALL_MONTHS = Array.from({ length: 12 }, (_, i) => i + 1)
const monthly = (v: number, months = ALL_MONTHS) => Object.fromEntries(months.map(m => [m, v]))
const ids = (hints: { id: string }[]) => hints.map(h => h.id)

test.describe('Copilote carbone — règles métier', () => {
  let library: LibraryFactor[]
  test.beforeAll(async ({ baseURL }) => {
    // Any signed-in account can read the library; the rules run on the real one
    const c = await registerCompany(baseURL!)
    library = (await (await c.api.get('/api/emission-factors')).json()).factors
    await c.api.dispose()
    await deleteCompanies([c.companyId])
  })

  const OIL: Context = { sector: 'petrole_gaz', siteType: 'chantier', country: 'Gabon', surface: null }
  const BANK: Context = { sector: 'banque', siteType: 'bureau', country: 'Gabon', surface: 800 }

  test('profil pré-rempli selon le secteur et le type de site', () => {
    const oil = resolveAnswers({}, OIL)
    expect(oil).toMatchObject({ flaring: true, generator: true, camp: true, vessels: true, grid: true })
    const bank = resolveAnswers({}, BANK)
    expect(bank).toMatchObject({ cooling: true, travel: true, flaring: false, effluents: false, vessels: false })
    // A saved answer always wins over the suggestion
    expect(resolveAnswers({ flaring: false }, OIL).flaring).toBe(false)
    expect(Object.keys(oil)).toHaveLength(QUESTIONS.length)
  })

  test('plan : électricité du pays du site, couverture selon les saisies', () => {
    const answers = resolveAnswers({}, BANK)
    const empty = buildPlan(answers, BANK, library, {})
    const elec = empty.find(p => p.id === 'electricity')!
    expect(elec.factors.map(f => f.id)).toEqual(['elec_ember_gabon'])
    expect(empty.some(p => p.id === 'flaring')).toBe(false)
    expect(empty.every(p => !p.covered)).toBe(true)

    const plan = buildPlan(answers, BANK, library, { elec_ember_gabon: monthly(4000), defra24_diesel_station_l: { 1: 200 } })
    expect(plan.find(p => p.id === 'electricity')!.covered).toBe(true)
    expect(plan.find(p => p.id === 'generator')!.covered).toBe(true)
    // Butane is cooking, not generator fuel
    const cook = buildPlan({ ...answers, cooking: true }, BANK, library, { defra24_butane_kg: { 1: 25 } })
    expect(cook.find(p => p.id === 'cooking')!.covered).toBe(true)
    expect(cook.find(p => p.id === 'generator')!.covered).toBe(false)
  })

  test('contrôles : mois manquants, erreur d’unité ×1000, justificatifs, double comptage', () => {
    const answers = resolveAnswers({}, BANK)
    const qty: Quantities = {
      elec_ember_gabon: { ...monthly(4000, [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]), 6: 4_000_000 }, // décembre manquant, juin en Wh ?
      defra24_diesel_station_l: monthly(300), diesel_fr: monthly(300, [1, 2]), // même gazole sous deux facteurs
    }
    const plan = buildPlan(answers, BANK, library, qty)
    const docs = ALL_MONTHS.map(m => ({ emission_factor_id: 'defra24_diesel_station_l', month: m, year: YEAR }))
    const hints = buildHints({ plan, factors: library, qty, docs, year: YEAR, months: ALL_MONTHS, ctx: BANK })
    const h = ids(hints)
    expect(h).toContain('gap:elec_ember_gabon')
    const spike = hints.find(x => x.id === 'spike:elec_ember_gabon:6')!
    expect(spike.title).toContain('erreur d’unité')
    expect(h).toContain('proof:elec_ember_gabon')
    expect(h).not.toContain('proof:defra24_diesel_station_l')
    expect(h.some(x => x.startsWith('double:generator'))).toBe(true)
    // Warnings first
    expect(hints.findIndex(x => x.severity === 'info')).toBeGreaterThan(hints.findLastIndex(x => x.severity === 'warning'))
  })

  test('contrôles : facteur retiré → remplaçant, électricité d’un autre pays, intensité au m²', () => {
    const answers = resolveAnswers({}, BANK)
    const gabonOld = library.find(f => f.id === 'elec_gabon')!
    expect(gabonOld.status).toBe('retired')
    expect(replacementFor(gabonOld, library)?.id).toBe('elec_ember_gabon')
    expect(replacementFor(library.find(f => f.id === 'elec_congo')!, library)?.id).toBe('elec_ember_congo_brazzaville')

    const qty: Quantities = { elec_gabon: monthly(10), elec_ember_cameroun: monthly(10) }
    const plan = buildPlan(answers, BANK, library, qty)
    const hints = buildHints({ plan, factors: library, qty, docs: [], year: YEAR, months: ALL_MONTHS, ctx: BANK })
    expect(hints.find(x => x.id === 'retired:elec_gabon')?.replacementId).toBe('elec_ember_gabon')
    expect(hints.find(x => x.id === 'country:elec_ember_cameroun')?.replacementId).toBe('elec_ember_gabon')
    // 240 kWh/year on 800 m² of offices: far below the usual range
    expect(ids(hints)).toContain('intensity:electricity')
  })

  test('contrôles : cohérence avec le bilan précédent', () => {
    const answers = resolveAnswers({}, BANK)
    const qty: Quantities = { elec_ember_gabon: monthly(1000) } // 6,3 t
    const plan = buildPlan(answers, BANK, library, qty)
    const previous = { year: YEAR - 1, kgByFactor: { elec_gabon: 2000, r410a: 1924 } } // 2 t, fuites l'an dernier
    const hints = buildHints({ plan, factors: library, qty, docs: [], year: YEAR, months: ALL_MONTHS, ctx: BANK, previous })
    expect(hints.find(x => x.id === 'yoy:electricity')?.title).toMatch(/\+\d+/)
    expect(ids(hints)).toContain('yoymissing:refrigerants')
    expect(ids(hints)).not.toContain('missing:refrigerants')
  })

  test('analyse : incertitude GIEC approche 1 et postes significatifs', () => {
    const answers = resolveAnswers({}, BANK)
    const qty: Quantities = { elec_ember_gabon: { 1: 1000 }, defra24_diesel_station_l: { 1: 100 } }
    const plan = buildPlan(answers, BANK, library, qty)
    const a = analyse(plan, library, qty)
    const f = (id: string) => library.find(x => x.id === id)!
    const e1 = 1000 * f('elec_ember_gabon').factorTotal
    const e2 = 100 * f('defra24_diesel_station_l').factorTotal
    const expected = Math.sqrt((e1 * f('elec_ember_gabon').uncertainty) ** 2 + (e2 * f('defra24_diesel_station_l').uncertainty) ** 2) / (e1 + e2)
    expect(a.totalKg).toBeCloseTo(e1 + e2, 6)
    expect(a.uncertainty!).toBeCloseTo(expected, 9)
    expect(a.hotspots[0].label).toBe('Électricité du réseau')
    expect(a.hotspots.reduce((s, h) => s + h.share, 0)).toBeCloseTo(1, 9)
  })

  test('liste avant certification', () => {
    const answers = resolveAnswers({}, BANK)
    const plan = buildPlan(answers, BANK, library, {})
    const items = checklist({ profileConfirmed: false, plan, hints: [], saved: true, hasData: false, hasPrevious: true })
    expect(items.map(i => i.id)).toEqual(['profile', 'coverage', 'months', 'proofs', 'values', 'double', 'factors', 'yoy', 'saved'])
    expect(items.find(i => i.id === 'profile')!.ok).toBe(false)
    expect(items.find(i => i.id === 'coverage')!.ok).toBe(false)
  })

  test('recherche avec synonymes du quotidien', () => {
    const active = library.filter(f => f.status === 'active')
    expect(searchFactors('gasoil groupe', active).some(f => f.id === 'defra24_diesel_station_l')).toBe(true)
    expect(searchFactors('clim', active).some(f => f.id === 'r410a')).toBe(true)
    expect(searchFactors('clim', active)[0].subcategory).toBe('refrigerants')
    expect(searchFactors('bouteille gaz', active).some(f => f.id === 'defra24_butane_kg')).toBe(true)
    expect(searchFactors('torchere', active).some(f => f.subcategory === 'flaring_venting')).toBe(true)
    expect(searchFactors('electricite gabon', active).map(f => f.id)).toContain('elec_ember_gabon')
  })
})

test.describe('Copilote carbone — API', () => {
  test('profil : lecture, enregistrement filtré, isolement, verrouillage', async ({ company, otherCompany, baseURL }) => {
    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id)
    const url = `/api/assessments/${asmt.id}/profile`

    expect(await (await company.api.get(url)).json()).toMatchObject({ answers: {}, confirmed: false, inherited: false, previous: null })
    const put = await company.api.put(url, { data: { answers: { grid: true, flaring: false, hacked: true, generator: 'oui' } } })
    expect(put.status()).toBe(200)
    expect((await put.json()).answers).toEqual({ grid: true, flaring: false })
    expect(await (await company.api.get(url)).json()).toMatchObject({ answers: { grid: true, flaring: false }, confirmed: true })

    expect((await otherCompany.api.get(url)).status()).toBe(404)
    expect((await otherCompany.api.put(url, { data: { answers: { grid: false } } })).status()).toBe(404)
    const anon = await pwRequest.newContext({ baseURL })
    expect((await anon.get(url)).status()).toBe(401)
    await anon.dispose()

    await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'elec_ember_gabon', quantity: 100, month: 1, year: YEAR }])
    await requestCertification(company.api, asmt.id)
    expect((await company.api.put(url, { data: { answers: { grid: false } } })).status()).toBe(409)
  })

  test('nouvel exercice du même site : réponses reprises et bilan précédent fourni', async ({ company }) => {
    const site = await createSite(company.api)
    const last = await createAssessment(company.api, site.id, { year: YEAR - 1, name: 'Exercice précédent' })
    await company.api.put(`/api/assessments/${last.id}/profile`, { data: { answers: { generator: true, cooling: false } } })
    await saveEntries(company.api, last.id, [{ emissionFactorId: 'elec_ember_gabon', quantity: 100, month: 1, year: YEAR - 1 }])
    const now = await createAssessment(company.api, site.id)
    const p = await (await company.api.get(`/api/assessments/${now.id}/profile`)).json()
    expect(p).toMatchObject({ confirmed: false, inherited: true, answers: { generator: true, cooling: false }, previous: { id: last.id, year: YEAR - 1 } })

    const a = await (await company.api.get(`/api/assessments/${now.id}`)).json()
    expect(a).toMatchObject({ site_type: 'bureau', site_country: 'Gabon', company_sector: 'petrole_gaz' })
  })

  test('remplacer un facteur retiré : quantités revalorisées, justificatifs transférés, totaux recalculés', async ({ company, otherCompany }) => {
    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id)
    await saveEntries(company.api, asmt.id, [
      { emissionFactorId: 'elec_gabon', quantity: 1000, month: 1, year: YEAR },
      { emissionFactorId: 'elec_gabon', quantity: 500, month: 2, year: YEAR },
      { emissionFactorId: 'elec_ember_gabon', quantity: 100, month: 2, year: YEAR },
    ])
    await db.query(
      `INSERT INTO audit_documents (assessment_id, emission_factor_id, year, month, filename, original_name) VALUES ($1, 'elec_gabon', $2, 1, 'x.pdf', 'facture.pdf')`,
      [asmt.id, YEAR])

    const body = { assessmentId: asmt.id, from: 'elec_gabon', to: 'elec_ember_gabon' }
    expect((await otherCompany.api.post('/api/emissions/replace', { data: body })).status()).toBe(404)
    expect((await company.api.post('/api/emissions/replace', { data: { ...body, to: 'defra24_diesel_station_l' } })).status()).toBe(400) // kWh ≠ litre
    expect((await company.api.post('/api/emissions/replace', { data: { ...body, to: 'elec_congo' } })).status()).toBe(400) // retiré
    const res = await company.api.post('/api/emissions/replace', { data: body })
    expect(res.status(), await res.text()).toBe(200)

    const { rows } = await db.query('SELECT emission_factor_id, month, quantity, factor_value, total_co2eq FROM emission_entries WHERE assessment_id = $1 ORDER BY month', [asmt.id])
    expect(rows.map(r => [r.emission_factor_id, r.month, Number(r.quantity)])).toEqual([['elec_ember_gabon', 1, 1000], ['elec_ember_gabon', 2, 600]])
    expect(Number(rows[0].factor_value)).toBeCloseTo(0.523, 6)
    expect(Number(rows[1].total_co2eq)).toBeCloseTo(313.8, 2)
    const doc = await db.query('SELECT emission_factor_id FROM audit_documents WHERE assessment_id = $1', [asmt.id])
    expect(doc.rows[0].emission_factor_id).toBe('elec_ember_gabon')
    const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(Number(a.total_co2eq)).toBeCloseTo(1600 * 0.523, 1)
    expect(Number(a.scope2_co2eq)).toBeCloseTo(1600 * 0.523, 1)

    // Nothing left to move
    expect((await company.api.post('/api/emissions/replace', { data: body })).status()).toBe(404)
  })
})
