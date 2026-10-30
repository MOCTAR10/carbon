import type { APIRequestContext } from '@playwright/test'
import { test, expect, bilanWithData, requestCertification, uid, YEAR } from '../support/fixtures'
import { EXPERT, FILES } from '../support/data'
import { one } from '../support/db'
import { expectNoHorizontalOverflow, toast, watchErrors } from './helpers'

/** Drive a bilan all the way to "certified" through the staff APIs; returns the certificate number. */
async function certify(company: APIRequestContext, admin: APIRequestContext, expert: APIRequestContext, assessmentId: number) {
  const cert = await requestCertification(company, assessmentId)
  const expertId = (await one<{ id: number }>('SELECT id FROM users WHERE email = $1', [EXPERT.email])).id
  const steps: [APIRequestContext, string, Record<string, unknown>][] = [
    [admin, `/api/admin/certifications/${cert.id}`, { action: 'assign', expertUserId: expertId }],
    [expert, `/api/expert/certifications/${cert.id}`, { action: 'set_date', auditDate: `${YEAR}-06-15`, auditLocation: 'Libreville' }],
    [expert, `/api/expert/certifications/${cert.id}`, { action: 'start_review' }],
    [expert, `/api/expert/certifications/${cert.id}`, { action: 'audit_done', inspectionNotes: 'RAS' }],
    [expert, `/api/expert/certifications/${cert.id}`, { action: 'submit_to_cnc', depositDate: `${YEAR}-07-01`, depositReference: 'CNC-DEP-QA' }],
  ]
  for (const [api, url, data] of steps) {
    const res = await api.patch(url, { data })
    expect(res.status(), `${data.action}: ${await res.text()}`).toBe(200)
  }
  const number = `QA-CNC-${uid('n')}`
  const up = await expert.post(`/api/expert/certifications/${cert.id}/certificate`, {
    multipart: { file: { name: 'certificat.pdf', mimeType: 'application/pdf', buffer: FILES.pdf }, certificateNumber: number, certifiedAt: `${YEAR}-08-01` },
  })
  expect(up.status(), await up.text()).toBe(200)
  return number
}

test.describe('Bilan certifié (interface)', () => {
  test('tableau de bord, certifications et bilan affichent le certificat', async ({ companyPage: page, company, admin, expert }) => {
    test.setTimeout(120_000)
    const errors = watchErrors(page)
    const { asmt } = await bilanWithData(company.api)
    const number = await certify(company.api, admin, expert, asmt.id)

    // ── Tableau de bord : bandeau or avec le numéro ──
    await page.goto('/dashboard')
    const band = page.getByRole('region', { name: 'Certificat DGEPN' })
    await expect(band).toBeVisible()
    await expect(band).toContainText(`N° ${number}`)
    await expect(band.getByRole('link', { name: /Voir le certificat/ })).toBeVisible()
    await expectNoHorizontalOverflow(page)

    // ── Certifications : carte certifiée, puis détail avec téléchargement ──
    await band.getByRole('link', { name: /Voir le certificat/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/certifications/)
    await expect(page.getByRole('heading', { name: 'Bilans certifiés' })).toBeVisible()
    const card = page.getByRole('button', { name: new RegExp(`N° ${number}`) })
    await expect(card).toBeVisible()
    await card.click()
    const dialog = page.getByRole('dialog')
    await expect(dialog).toContainText(`N° ${number}`)
    await expect(dialog).toContainText('Certifié')
    const download = dialog.getByRole('button', { name: /Télécharger le certificat/ })
    await expect(download).toBeVisible()
    const [file] = await Promise.all([page.waitForEvent('download'), download.click()])
    expect(file.suggestedFilename()).toMatch(/\.pdf$/i)
    await expectNoHorizontalOverflow(page)
    await page.keyboard.press('Escape')

    // ── Bilan : bandeau "Bilan certifié", lecture seule ──
    await page.goto(`/dashboard/assessments/${asmt.id}`)
    await expect(page.getByText('Bilan certifié', { exact: true })).toBeVisible({ timeout: 30_000 }) // first hit compiles in next dev
    await expect(page.getByRole('textbox', { name: /Quantité en/ })).toHaveCount(0)
    errors.check()
  })

  test('lien de vérification : copié depuis le tableau de bord @desktop-only', async ({ companyPage: page, company, admin, expert, context }) => {
    const { asmt } = await bilanWithData(company.api)
    const number = await certify(company.api, admin, expert, asmt.id)
    await context.grantPermissions(['clipboard-read', 'clipboard-write'])
    await page.goto('/dashboard')
    await page.getByRole('region', { name: 'Certificat DGEPN' }).getByRole('button', { name: /Lien de vérification/ }).click()
    await expect(toast(page, 'Lien de vérification copié')).toBeVisible()
    const copied = await page.evaluate(() => navigator.clipboard.readText())
    expect(copied).toMatch(new RegExp(`/verify/${encodeURIComponent(number)}$`))
  })

  test('page publique de vérification, sans session', async ({ browser, company, admin, expert, baseURL }) => {
    const { asmt } = await bilanWithData(company.api)
    const number = await certify(company.api, admin, expert, asmt.id)
    const anon = await browser.newContext({ baseURL })
    const page = await anon.newPage()
    const errors = watchErrors(page)
    await page.goto(`/verify/${encodeURIComponent(number)}`)
    await expect(page.getByRole('heading', { name: 'Rapport de certification' })).toBeVisible()
    await expect(page.getByRole('heading', { name: company.name })).toBeVisible()
    await expect(page.getByText(`N° ${number}`)).toBeVisible()
    await expectNoHorizontalOverflow(page)
    errors.check()

    await page.goto('/verify/NUMERO-INEXISTANT')
    await expect(page.getByRole('heading', { name: 'Certificat introuvable' })).toBeVisible()
    await anon.close()
  })
})
