import { request, type APIRequestContext } from '@playwright/test'
import { test, expect, bilanWithData, createSite, createAssessment, requestCertification, saveEntries, uid, YEAR } from '../support/fixtures'
import { EXPERT, FILES } from '../support/data'
import { one } from '../support/db'

// The product's core journey: company → admin → field expert → DGEPN deposit → certificate.
// Runs serially inside the test (each step depends on the previous one).

type CompanyCert = { id: number; status: string; adminNotes: unknown; inspectionNotes: unknown; expertReportPdfUrl: unknown; certificateNumber: string | null; certifiedAt: string | null }

async function companyView(api: APIRequestContext, certId: number) {
  const list: CompanyCert[] = await (await api.get('/api/certifications')).json()
  return list.find(c => c.id === certId)!
}

const expertAction = (expert: APIRequestContext, id: number, data: Record<string, unknown>) =>
  expert.patch(`/api/expert/certifications/${id}`, { data })

test.describe('Parcours de certification', () => {
  test('un bilan vide ne peut pas être soumis', async ({ company }) => {
    const site = await createSite(company.api)
    const asmt = await createAssessment(company.api, site.id)
    const res = await company.api.post('/api/certifications', { data: { assessmentId: asmt.id } })
    expect(res.status()).toBe(400)
  })

  test('de la demande au certificat DGEPN, avec verrouillage et confidentialité à chaque étape', async ({ company, admin, expert, baseURL }) => {
    test.setTimeout(120_000)
    const { asmt } = await bilanWithData(company.api)

    // ── 1. Demande ──
    const cert = await requestCertification(company.api, asmt.id)
    expect(cert.status).toBe('pending')
    expect((await company.api.post('/api/certifications', { data: { assessmentId: asmt.id } })).status()).toBe(409)

    // ── 2. Verrouillage des données dès la demande ──
    const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(a.certification_lock).toBe('pending')
    expect((await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 99, month: 1, year: YEAR }])).status()).toBe(409)
    expect((await company.api.patch(`/api/assessments/${asmt.id}`, { data: { status: 'completed' } })).status()).toBe(409)
    expect((await company.api.delete(`/api/assessments/${asmt.id}`)).status()).toBe(409)
    const upload = await company.api.post('/api/documents', {
      multipart: { file: { name: 'f.pdf', mimeType: 'application/pdf', buffer: FILES.pdf }, assessmentId: String(asmt.id), factorId: 'butane_fr', year: String(YEAR), month: '1' },
    })
    expect(upload.status()).toBe(409)

    // ── 3. Admin : voit la demande, assigne l'expert avec une note interne ──
    const adminList = await (await admin.get('/api/admin/certifications')).json()
    expect(JSON.stringify(adminList)).toContain(`"id":${cert.id}`)
    const expertId = (await one<{ id: number }>('SELECT id FROM users WHERE email = $1', [EXPERT.email])).id
    const assign = await admin.patch(`/api/admin/certifications/${cert.id}`, {
      data: { action: 'assign', expertUserId: expertId, adminNotes: 'NOTE-INTERNE-CONFIDENTIELLE' },
    })
    expect(assign.status(), await assign.text()).toBe(200)

    let view = await companyView(company.api, cert.id)
    expect(view.status).toBe('assigned')
    expect(view.adminNotes).toBeNull()
    expect(JSON.stringify(await (await company.api.get('/api/certifications')).json())).not.toContain('NOTE-INTERNE')
    expect(JSON.stringify(await (await company.api.get(`/api/certifications/${asmt.id}`)).json())).not.toContain('NOTE-INTERNE')
    const notifs = await (await company.api.get('/api/notifications')).json()
    expect(notifs.notifications.some((n: { type: string }) => n.type === 'cert_assigned')).toBe(true)

    // ── 4. Expert : date terrain, audit, rapport ──
    const expertList = await (await expert.get('/api/expert/certifications')).json()
    expect(JSON.stringify(expertList)).toContain(`"id":${cert.id}`)
    const dossier = await expert.get(`/api/expert/certifications/${cert.id}`)
    expect(dossier.status()).toBe(200)

    expect((await expertAction(expert, cert.id, { action: 'set_date', auditDate: `${YEAR}-06-15`, auditLocation: 'Libreville' })).status()).toBe(200)
    // Certificate cannot be uploaded before the DGEPN deposit
    const early = await expert.post(`/api/expert/certifications/${cert.id}/certificate`, {
      multipart: { file: { name: 'c.pdf', mimeType: 'application/pdf', buffer: FILES.pdf }, certificateNumber: 'X', certifiedAt: `${YEAR}-07-01` },
    })
    expect(early.status()).toBe(400)
    // Expert report is not visible to the company before the audit is validated
    expect((await companyView(company.api, cert.id)).expertReportPdfUrl).toBeNull()
    expect((await company.api.post(`/api/admin/certifications/${cert.id}/generate-pdf`)).status()).toBe(403)

    expect((await expertAction(expert, cert.id, { action: 'start_review' })).status()).toBe(200)
    expect((await companyView(company.api, cert.id)).status).toBe('in_progress')
    expect((await expertAction(expert, cert.id, { action: 'submit_to_cnc', depositDate: `${YEAR}-07-01` })).status()).toBe(400) // audit not done yet
    const done = await expertAction(expert, cert.id, { action: 'audit_done', inspectionNotes: 'NOTES-TERRAIN-EXPERT', auditChecklist: { ok: true } })
    expect(done.status(), await done.text()).toBe(200)

    view = await companyView(company.api, cert.id)
    expect(view.status).toBe('audit_done')
    expect(view.expertReportPdfUrl).not.toBeNull()
    expect(view.inspectionNotes).toBeNull()
    expect(view.certificateNumber).toBeNull()

    // ── 5. Dépôt à la DGEPN puis certificat ──
    const dep = await expertAction(expert, cert.id, { action: 'submit_to_cnc', depositDate: `${YEAR}-07-01`, depositReference: 'CNC-DEP-QA' })
    expect(dep.status(), await dep.text()).toBe(200)
    expect((await companyView(company.api, cert.id)).status).toBe('submitted_to_cnc')

    const number = `QA-CNC-${uid('n')}`
    const certRes = await expert.post(`/api/expert/certifications/${cert.id}/certificate`, {
      multipart: { file: { name: 'certificat.pdf', mimeType: 'application/pdf', buffer: FILES.pdf }, certificateNumber: number, certifiedAt: `${YEAR}-08-01` },
    })
    expect(certRes.status(), await certRes.text()).toBe(200)

    view = await companyView(company.api, cert.id)
    expect(view.status).toBe('certified')
    expect(view.certificateNumber).toBe(number)
    expect(view.certifiedAt).toBeTruthy()

    // Still locked once certified
    expect((await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 1, month: 1, year: YEAR }])).status()).toBe(409)

    // ── 6. Vérification publique (sans session) ──
    const anon = await request.newContext({ baseURL })
    const verify = await anon.get(`/api/verify/${encodeURIComponent(number)}`)
    expect(verify.status()).toBe(200)
    const v = await verify.json()
    expect(v.status).toBe('certified')
    expect(v.certificateNumber).toBe(number)
    expect(JSON.stringify(v)).not.toContain('NOTE-INTERNE')
    expect(JSON.stringify(v)).not.toContain('NOTES-TERRAIN')
    expect((await anon.get('/api/verify/NUMERO-INEXISTANT')).status()).toBe(404)
  })

  test('refus par l’admin : motif visible, bilan de nouveau modifiable, nouvelle demande possible', async ({ company, admin }) => {
    const { asmt } = await bilanWithData(company.api)
    const cert = await requestCertification(company.api, asmt.id)
    const rej = await admin.patch(`/api/admin/certifications/${cert.id}`, { data: { action: 'reject', rejectionReason: 'Justificatifs manquants', adminNotes: 'interne' } })
    expect(rej.status(), await rej.text()).toBe(200)

    const view = await companyView(company.api, cert.id)
    expect(view.status).toBe('rejected')
    expect(JSON.stringify(view)).toContain('Justificatifs manquants')
    expect(view.adminNotes).toBeNull()

    const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(a.certification_lock).toBeNull()
    expect((await saveEntries(company.api, asmt.id, [{ emissionFactorId: 'butane_fr', quantity: 20, month: 1, year: YEAR }])).status()).toBe(201)
    const again = await company.api.post('/api/certifications', { data: { assessmentId: asmt.id } })
    expect(again.status(), await again.text()).toBe(200)
    // A closed request can't be rejected twice
    expect((await admin.patch(`/api/admin/certifications/${cert.id}`, { data: { action: 'reject' } })).status()).toBe(400)
  })

  test('une entreprise ne peut pas piloter les actions expert/admin', async ({ company }) => {
    const { asmt } = await bilanWithData(company.api)
    const cert = await requestCertification(company.api, asmt.id)
    expect([401, 403]).toContain((await company.api.patch(`/api/admin/certifications/${cert.id}`, { data: { action: 'reject' } })).status())
    expect([401, 403]).toContain((await company.api.patch(`/api/expert/certifications/${cert.id}`, { data: { action: 'audit_done' } })).status())
    expect((await companyView(company.api, cert.id)).status).toBe('pending')
  })
})
