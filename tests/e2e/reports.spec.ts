import fs from 'node:fs'
import { PDFParse } from 'pdf-parse'
import { test, expect, bilanWithData, saveEntries, YEAR } from '../support/fixtures'
import { toast, watchErrors } from './helpers'

test.describe('Rapports (interface)', () => {
  test('synthèse, onglets et téléchargement du rapport PDF annuel', async ({ companyPage: page, company }) => {
    test.setTimeout(120_000)
    const errors = watchErrors(page)
    const { asmt } = await bilanWithData(company.api)
    await saveEntries(company.api, asmt.id, [
      { emissionFactorId: 'butane_fr', quantity: 1000, month: 1, year: YEAR }, // 3 460 kg
      { emissionFactorId: 'elec_gabon', quantity: 10000, month: 2, year: YEAR }, // 5 060 kg
    ])

    await page.goto(`/dashboard/reports?id=${asmt.id}`)
    await expect(page.getByRole('heading', { level: 1, name: 'Rapports & synthèse' })).toBeVisible({ timeout: 30_000 })
    // 8 520 kg → shown in tonnes: 8,52 tCO₂e
    await expect(page.getByText('8,52').first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText('tCO₂e').first()).toBeVisible()

    const tabs = page.getByRole('tablist', { name: 'Sections du rapport' })
    for (const name of ['Mensuel', 'GHG Protocol', 'ISO 14064', 'Détail des postes', 'Vue d’ensemble']) {
      await tabs.getByRole('tab', { name }).click()
      await expect(tabs.getByRole('tab', { name })).toHaveAttribute('aria-selected', 'true')
      await expect(page.getByRole('tabpanel')).toBeVisible()
    }

    // PDF through the dialog
    await page.getByRole('button', { name: /Télécharger le PDF/ }).click()
    const dialog = page.getByRole('dialog', { name: 'Télécharger le rapport PDF' })
    const [download] = await Promise.all([
      page.waitForEvent('download', { timeout: 60_000 }),
      dialog.getByRole('button', { name: /Rapport annuel/ }).click(),
    ])
    expect(download.suggestedFilename()).toMatch(/^bilan-carbone-.*-annuel-\d{4}-\d{2}-\d{2}\.pdf$/)
    await expect(toast(page, 'Rapport PDF téléchargé')).toBeVisible()

    const file = await download.path()
    const buf = fs.readFileSync(file)
    expect(buf.subarray(0, 5).toString()).toBe('%PDF-')
    expect(buf.length).toBeGreaterThan(10 * 1024)

    const parser = new PDFParse({ data: new Uint8Array(buf) })
    const pdf = await parser.getText()
    await parser.destroy()
    expect(pdf.total).toBeGreaterThanOrEqual(2)
    expect(pdf.text).toContain('tCO2e')
    expect(pdf.text).toContain('Synthèse')
    expect(pdf.text).not.toContain('kgCO2eq)') // old header over t/kt values
    expect(pdf.text).toContain(company.name)
    errors.check()
  })

  test('bilan sans données : invitation à saisir, pas d’erreur', async ({ companyPage: page, company }) => {
    const { asmt } = await bilanWithData(company.api)
    await saveEntries(company.api, asmt.id, [])
    await page.goto(`/dashboard/reports?id=${asmt.id}`)
    await expect(page.getByText('Ce bilan ne contient encore aucune émission enregistrée.')).toBeVisible({ timeout: 30_000 })
    await expect(page.getByRole('link', { name: 'Saisir les données' })).toHaveAttribute('href', `/dashboard/assessments/${asmt.id}`)
  })
})
