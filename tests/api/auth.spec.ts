import { request } from '@playwright/test'
import { test, expect, registerCompany } from '../support/fixtures'
import { PASSWORD, QA_DOMAIN, fakeIp, uid } from '../support/data'
import { one } from '../support/db'
import { deleteCompanies } from '../support/cleanup'

const valid = () => ({
  email: `${uid()}@${QA_DOMAIN}`, password: PASSWORD, firstName: 'Clara', lastName: 'Test',
  companyName: `QA ${uid()}`, phone: '+241 77 00 00 00', acceptedTermsVersion: '1.0',
})

test.describe('Inscription', () => {
  for (const [label, patch] of [
    ['mot de passe trop court', { password: 'abc' }],
    ['email invalide', { email: 'pas-un-email' }],
    ['CGU non acceptées', { acceptedTermsVersion: '' }],
    ['raison sociale manquante', { companyName: '' }],
  ] as const) {
    test(`refuse : ${label}`, async ({ baseURL }) => {
      const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Real-IP': fakeIp() } })
      const res = await api.post('/api/auth/register', { data: { ...valid(), ...patch } })
      expect(res.status()).toBe(400)
      expect((await res.json()).error).toBeTruthy()
    })
  }

  test('normalise l’email, enregistre le consentement et refuse le doublon (casse incluse)', async ({ company, baseURL }) => {
    const u = await one<{ email: string; terms_version: string; terms_accepted_at: Date; role: string }>(
      'SELECT email, terms_version, terms_accepted_at, role FROM users WHERE id = $1', [company.userId])
    expect(u).toMatchObject({ email: company.email, terms_version: '1.0', role: 'user' })
    expect(u.terms_accepted_at).toBeTruthy()

    const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Real-IP': fakeIp() } })
    const dup = await api.post('/api/auth/register', { data: { ...valid(), email: company.email.toUpperCase() } })
    expect(dup.status()).toBe(409)
  })

  test('limite les inscriptions répétées depuis une même IP', async ({ baseURL }) => {
    test.skip(!process.env.TEST_PROD_SERVER, 'Le limiteur en mémoire est réinitialisé par les recompilations de next dev : testé sur le build de production (CI).')
    const ip = fakeIp()
    const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Real-IP': ip } })
    const created: number[] = []
    let last = 0
    for (let i = 0; i < 6; i++) {
      const res = await api.post('/api/auth/register', { data: valid() })
      last = res.status()
      if (res.ok()) created.push((await res.json()).companyId)
    }
    await deleteCompanies(created)
    expect(last).toBe(429)
  })
})

test.describe('Connexion', () => {
  test('email insensible à la casse ; session valide sur /api/auth/me', async ({ company, baseURL }) => {
    const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Real-IP': fakeIp() } })
    const res = await api.post('/api/auth/login', { data: { email: company.email.toUpperCase(), password: company.password } })
    expect(res.status()).toBe(200)
    const me = await api.get('/api/auth/me')
    expect(me.status()).toBe(200)
    expect(JSON.stringify(await me.json())).toContain(company.email)
  })

  test('mauvais mot de passe → 401 sans indiquer si le compte existe', async ({ company, baseURL }) => {
    const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Real-IP': fakeIp() } })
    const wrong = await api.post('/api/auth/login', { data: { email: company.email, password: 'mauvais-mdp' } })
    const unknown = await api.post('/api/auth/login', { data: { email: `inconnu@${QA_DOMAIN}`, password: 'mauvais-mdp' } })
    expect(wrong.status()).toBe(401)
    expect(unknown.status()).toBe(401)
    expect((await wrong.json()).error).toBe((await unknown.json()).error)
  })

  test('bloque après des échecs répétés (429), même avec le bon mot de passe', async ({ company, baseURL }) => {
    test.skip(!process.env.TEST_PROD_SERVER, 'Le limiteur en mémoire est réinitialisé par les recompilations de next dev : testé sur le build de production (CI).')
    const api = await request.newContext({ baseURL, extraHTTPHeaders: { 'X-Real-IP': fakeIp() } })
    for (let i = 0; i < 8; i++) await api.post('/api/auth/login', { data: { email: company.email, password: 'x' } })
    const res = await api.post('/api/auth/login', { data: { email: company.email, password: company.password } })
    expect(res.status()).toBe(429)
  })

  test('déconnexion : la session n’est plus acceptée', async ({ company }) => {
    expect((await company.api.get('/api/sites')).status()).toBe(200)
    await company.api.post('/api/auth/logout')
    expect((await company.api.get('/api/sites')).status()).toBe(401)
  })
})

test.describe('Cloisonnement des portails', () => {
  test('sans session : APIs 401, pages redirigées vers /login', async ({ baseURL }) => {
    const api = await request.newContext({ baseURL })
    for (const p of ['/api/sites', '/api/assessments', '/api/dashboard/stats', '/api/certifications', '/api/account/profile']) {
      expect((await api.get(p)).status(), p).toBe(401)
    }
    const page = await api.get('/dashboard', { maxRedirects: 0 })
    expect([302, 303, 307, 308]).toContain(page.status())
    expect(page.headers()['location']).toContain('/login')
  })

  test('une entreprise n’accède pas aux APIs admin ni expert', async ({ company }) => {
    for (const p of ['/api/admin/certifications', '/api/admin/companies', '/api/admin/users', '/api/expert/certifications']) {
      expect([401, 403], p).toContain((await company.api.get(p)).status())
    }
  })

  test('un expert n’accède pas aux APIs admin ni aux données entreprise', async ({ expert }) => {
    expect([401, 403]).toContain((await expert.get('/api/admin/certifications')).status())
    expect((await expert.get('/api/sites')).status()).toBe(401)
  })

  test('JWT forgé (mauvaise signature) refusé', async ({ baseURL, company }) => {
    const forged = 'eyJhbGciOiJIUzI1NiJ9.' +
      Buffer.from(JSON.stringify({ userId: company.userId, companyId: company.companyId, role: 'user' })).toString('base64url') + '.c2lnbmF0dXJl'
    const api = await request.newContext({ baseURL, extraHTTPHeaders: { Cookie: `token=${forged}` } })
    expect((await api.get('/api/sites')).status()).toBe(401)
  })
})

test('le parcours d’inscription crée une entreprise utilisable immédiatement', async ({ baseURL }) => {
  const c = await registerCompany(baseURL!)
  try {
    expect((await c.api.get('/api/sites')).status()).toBe(200)
    const stats = await (await c.api.get('/api/dashboard/stats')).json()
    expect(stats).toBeTruthy()
  } finally {
    await deleteCompanies([c.companyId])
  }
})
