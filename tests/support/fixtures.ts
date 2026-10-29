import { test as base, expect, request as pwRequest, type APIRequestContext, type Page } from '@playwright/test'
import { ADMIN, EXPERT, PASSWORD, QA_DOMAIN, YEAR, fakeIp, uid } from './data'
import { deleteCompanies } from './cleanup'

export type Company = {
  email: string
  password: string
  name: string
  userId: number
  companyId: number
  /** API client logged in as this company (cookie `token`). */
  api: APIRequestContext
}

type Fixtures = {
  /** A freshly registered company, deleted with all its data after the test. */
  company: Company
  /** A second, unrelated company — for isolation checks. */
  otherCompany: Company
  /** Logged-in staff clients (seeded in global-setup). */
  admin: APIRequestContext
  expert: APIRequestContext
  /** Browser page already signed in as `company`. */
  companyPage: Page
}

async function newClient(baseURL: string) {
  return pwRequest.newContext({ baseURL, extraHTTPHeaders: { 'X-Real-IP': fakeIp() } })
}

export async function registerCompany(baseURL: string, overrides: Record<string, unknown> = {}): Promise<Company> {
  const api = await newClient(baseURL)
  const id = uid()
  const body = {
    email: `${id}@${QA_DOMAIN}`,
    password: PASSWORD,
    firstName: 'Clara',
    lastName: 'Test',
    companyName: `QA ${id}`,
    phone: '+241 77 00 00 00',
    sector: 'petrole_gaz',
    acceptedTermsVersion: '1.0',
    ...overrides,
  }
  const res = await api.post('/api/auth/register', { data: body })
  expect(res.status(), await res.text()).toBe(200)
  const { userId, companyId } = await res.json()
  return { email: body.email as string, password: body.password as string, name: body.companyName as string, userId, companyId, api }
}

async function staffClient(baseURL: string, who: { email: string; password: string }) {
  const api = await newClient(baseURL)
  const res = await api.post('/api/auth/login', { data: { email: who.email, password: who.password } })
  expect(res.status(), `staff login ${who.email}: ${await res.text()}`).toBe(200)
  return api
}

export const test = base.extend<Fixtures>({
  company: async ({ baseURL }, use) => {
    const c = await registerCompany(baseURL!)
    await use(c)
    await c.api.dispose()
    await deleteCompanies([c.companyId])
  },
  otherCompany: async ({ baseURL }, use) => {
    const c = await registerCompany(baseURL!)
    await use(c)
    await c.api.dispose()
    await deleteCompanies([c.companyId])
  },
  admin: async ({ baseURL }, use) => {
    const api = await staffClient(baseURL!, ADMIN)
    await use(api)
    await api.dispose()
  },
  expert: async ({ baseURL }, use) => {
    const api = await staffClient(baseURL!, EXPERT)
    await use(api)
    await api.dispose()
  },
  companyPage: async ({ page, company, baseURL }, use) => {
    // Reuse the company's session cookie in the browser instead of driving the login form every time
    const state = await company.api.storageState()
    await page.context().addCookies(state.cookies.map(c => ({ ...c, domain: new URL(baseURL!).hostname })))
    await use(page)
  },
})

export { expect }

// ── Domain helpers (all through the public API) ──────────────────────────────

export async function createSite(api: APIRequestContext, data: Record<string, unknown> = {}) {
  const res = await api.post('/api/sites', { data: { name: 'Siège Libreville', type: 'bureau', country: 'Gabon', city: 'Libreville', ...data } })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return res.json() as Promise<{ id: number; name: string }>
}

export async function createAssessment(api: APIRequestContext, siteId: number, data: Record<string, unknown> = {}) {
  const res = await api.post('/api/assessments', { data: { siteId, name: `Exercice ${YEAR}`, year: YEAR, ...data } })
  expect(res.status(), await res.text()).toBeLessThan(300)
  return res.json() as Promise<{ id: number; name: string; year: number }>
}

export type Entry = { emissionFactorId: string; quantity: number; month: number; year: number }

export function saveEntries(api: APIRequestContext, assessmentId: number, entries: Entry[]) {
  return api.post('/api/emissions', { data: { assessmentId, entries } })
}

/** Site + bilan with one butane entry (10 kg in January → 34.6 kgCO2e). */
export async function bilanWithData(api: APIRequestContext) {
  const site = await createSite(api)
  const asmt = await createAssessment(api, site.id)
  const res = await saveEntries(api, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 10, month: 1, year: YEAR }])
  expect(res.status(), await res.text()).toBe(201)
  return { site, asmt }
}

export async function requestCertification(api: APIRequestContext, assessmentId: number) {
  const res = await api.post('/api/certifications', { data: { assessmentId, message: 'Demande QA' } })
  expect(res.status(), await res.text()).toBe(200)
  const list = await (await api.get('/api/certifications')).json()
  return list.find((c: { assessmentId: number }) => c.assessmentId === assessmentId) as { id: number; status: string }
}

export { uid, YEAR }
