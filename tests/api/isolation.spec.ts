import { test, expect, bilanWithData, saveEntries, YEAR } from '../support/fixtures'
import { FILES } from '../support/data'

// Multi-tenant isolation: company B must never read or change company A's data.
test.describe('Isolation entre entreprises', () => {
  test('lecture : sites, bilans, rapports, documents, certifications', async ({ company, otherCompany }) => {
    const { site, asmt } = await bilanWithData(company.api)
    const up = await company.api.post('/api/documents', {
      multipart: {
        file: { name: 'facture.pdf', mimeType: 'application/pdf', buffer: FILES.pdf },
        assessmentId: String(asmt.id), factorId: 'butane_fr', year: String(YEAR), month: '1',
      },
    })
    expect(up.status()).toBe(201)
    const doc = await up.json()

    const b = otherCompany.api
    expect((await (await b.get('/api/sites')).json()).map((s: { id: number }) => s.id)).not.toContain(site.id)
    expect((await (await b.get('/api/assessments')).json()).map((a: { id: number }) => a.id)).not.toContain(asmt.id)
    expect((await b.get(`/api/assessments/${asmt.id}`)).status()).toBe(404)
    expect([403, 404]).toContain((await b.get(`/api/reports/${asmt.id}`)).status())
    expect([403, 404]).toContain((await b.get(`/api/emissions?assessmentId=${asmt.id}`)).status())
    expect([403, 404]).toContain((await b.get(`/api/documents/${doc.id}`)).status())
    expect([403, 404]).toContain((await b.get(`/api/documents?assessmentId=${asmt.id}`)).status())
  })

  test('écriture : saisies, statut, suppression, sites, demande de certification', async ({ company, otherCompany }) => {
    const { site, asmt } = await bilanWithData(company.api)
    const b = otherCompany.api

    expect([403, 404]).toContain((await saveEntries(b, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 1, month: 1, year: YEAR }])).status())
    expect([403, 404]).toContain((await b.patch(`/api/assessments/${asmt.id}`, { data: { status: 'completed' } })).status())
    expect([403, 404]).toContain((await b.delete(`/api/assessments/${asmt.id}`)).status())
    expect((await b.patch(`/api/sites/${site.id}`, { data: { name: 'Piraté', type: 'bureau', country: 'Gabon' } })).status()).toBe(404)
    expect((await b.delete(`/api/sites/${site.id}`)).status()).toBe(404)
    expect([403, 404]).toContain((await b.post('/api/assessments', { data: { siteId: site.id, name: 'x', year: YEAR } })).status())
    expect([403, 404]).toContain((await b.post('/api/certifications', { data: { assessmentId: asmt.id } })).status())

    // A's data is intact
    const mine = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(parseFloat(mine.total_co2eq)).toBeCloseTo(34.6, 1)
    expect((await (await company.api.get('/api/sites')).json()).find((s: { id: number }) => s.id === site.id).name).toBe(site.name)
  })

  test('identifiants non numériques → 400', async ({ company }) => {
    for (const p of ['/api/assessments/abc', '/api/reports/abc', '/api/documents/abc', '/api/assessments/1e3']) {
      expect((await company.api.get(p)).status(), p).toBe(400)
    }
    expect((await company.api.delete('/api/sites/abc')).status()).toBe(400)
  })
})
