import { test, expect, createSite, bilanWithData, requestCertification } from '../support/fixtures'
import { one } from '../support/db'

test.describe('Sites', () => {
  test('création, modification, validation', async ({ company }) => {
    const site = await createSite(company.api, { name: '  Usine Owendo  ', type: 'usine' })
    expect(site.name).toBe('Usine Owendo')
    expect((await company.api.post('/api/sites', { data: { name: '', type: 'bureau' } })).status()).toBe(400)

    const patch = await company.api.patch(`/api/sites/${site.id}`, { data: { name: 'Usine Owendo II', type: 'usine', country: 'Gabon', city: 'Owendo' } })
    expect(patch.status(), await patch.text()).toBe(200)
    const list = await (await company.api.get('/api/sites')).json()
    expect(list.find((s: { id: number }) => s.id === site.id).name).toBe('Usine Owendo II')
    expect((await company.api.patch(`/api/sites/${site.id}`, { data: { name: '' } })).status()).toBe(400)
  })

  test('suppression : supprime bilans et saisies ; refusée pendant une certification', async ({ company }) => {
    const free = await bilanWithData(company.api)
    const del = await company.api.delete(`/api/sites/${free.site.id}`)
    expect(del.status()).toBe(200)
    const left = await one<{ a: number; e: number }>(
      'SELECT (SELECT COUNT(*) FROM assessments WHERE id = $1)::int a, (SELECT COUNT(*) FROM emission_entries WHERE assessment_id = $1)::int e', [free.asmt.id])
    expect(left).toEqual({ a: 0, e: 0 })

    const busy = await bilanWithData(company.api)
    await requestCertification(company.api, busy.asmt.id)
    const refused = await company.api.delete(`/api/sites/${busy.site.id}`)
    expect(refused.status()).toBe(409)
    expect((await refused.json()).error).toBeTruthy()
  })
})

test.describe('Paramètres du compte', () => {
  test('profil : lecture, mise à jour, validation', async ({ company }) => {
    const me = await (await company.api.get('/api/account/profile')).json()
    expect(JSON.stringify(me)).toContain(company.email)
    const ok = await company.api.patch('/api/account/profile', { data: { firstName: ' Awa ', lastName: 'Ndong', phone: '+241 66 11 22 33' } })
    expect(ok.status(), await ok.text()).toBe(200)
    const u = await one<{ first_name: string; last_name: string }>('SELECT first_name, last_name FROM users WHERE id = $1', [company.userId])
    expect(u).toEqual({ first_name: 'Awa', last_name: 'Ndong' })
    expect((await company.api.patch('/api/account/profile', { data: { firstName: '', lastName: 'x' } })).status()).toBe(400)
  })

  test('entreprise : secteur validé ; identité verrouillée pendant la certification', async ({ company }) => {
    expect((await company.api.patch('/api/account/company', { data: { name: company.name, sector: 'secteur_inexistant' } })).status()).toBe(400)
    expect((await company.api.patch('/api/account/company', { data: { name: company.name, sector: '__proto__' } })).status()).toBe(400)
    const renamed = await company.api.patch('/api/account/company', { data: { name: `${company.name} SA`, rccm: 'GA-LBV-2026-B-001', sector: 'petrole_gaz' } })
    expect(renamed.status(), await renamed.text()).toBe(200)

    const { asmt } = await bilanWithData(company.api)
    await requestCertification(company.api, asmt.id)
    const locked = await company.api.patch('/api/account/company', { data: { name: 'Autre nom', rccm: 'GA-LBV-2026-B-001', sector: 'petrole_gaz' } })
    expect(locked.status()).toBe(409)
  })

  test('mot de passe : vérifie l’actuel, impose 8 caractères, puis la connexion utilise le nouveau', async ({ company }) => {
    expect((await company.api.post('/api/account/password', { data: { currentPassword: 'faux', newPassword: 'NouveauMdp-2026' } })).status()).toBe(400)
    expect((await company.api.post('/api/account/password', { data: { currentPassword: company.password, newPassword: 'court' } })).status()).toBe(400)
    const ok = await company.api.post('/api/account/password', { data: { currentPassword: company.password, newPassword: 'NouveauMdp-2026' } })
    expect(ok.status(), await ok.text()).toBe(200)
    await company.api.post('/api/auth/logout')
    expect((await company.api.post('/api/auth/login', { data: { email: company.email, password: company.password } })).status()).toBe(401)
    expect((await company.api.post('/api/auth/login', { data: { email: company.email, password: 'NouveauMdp-2026' } })).status()).toBe(200)
  })
})
