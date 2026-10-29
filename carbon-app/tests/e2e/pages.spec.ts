import { test, expect, bilanWithData, saveEntries, YEAR } from '../support/fixtures'
import { expectNoHorizontalOverflow, watchErrors } from './helpers'

// Smoke for every company page on a company with real data: renders its heading,
// no console/page errors, no sideways scrolling. Runs at 1440 (desktop) and 390 (mobile).
test.describe('Pages de l’espace entreprise', () => {
  test('toutes les pages s’affichent sans erreur ni débordement horizontal', async ({ companyPage: page, company }) => {
    test.setTimeout(150_000)
    const { asmt } = await bilanWithData(company.api)
    // A richer bilan: several scopes and months so charts and tables have content
    const res = await saveEntries(company.api, asmt.id, [
      { emissionFactorId: 'butane_fr', quantity: 120, month: 1, year: YEAR },
      { emissionFactorId: 'butane_fr', quantity: 90, month: 2, year: YEAR },
      { emissionFactorId: 'elec_gabon', quantity: 5400, month: 1, year: YEAR },
      { emissionFactorId: 'elec_gabon', quantity: 4800, month: 3, year: YEAR },
    ])
    expect(res.status()).toBe(201)

    const pages: [string, string | RegExp][] = [
      ['/dashboard', company.name],
      ['/dashboard/sites', 'Sites & entités'],
      ['/dashboard/assessments', 'Bilans carbone'],
      [`/dashboard/assessments/${asmt.id}`, asmt.name],
      [`/dashboard/reports?id=${asmt.id}`, 'Rapports & synthèse'],
      ['/dashboard/certifications', 'Certifications'],
      ['/dashboard/settings', 'Paramètres'],
    ]
    const errors = watchErrors(page)
    for (const [url, heading] of pages) {
      await test.step(url, async () => {
        await page.goto(url)
        // Generous on the first assertion: `next dev` compiles each route on first hit
        await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible({ timeout: 30_000 })
        await expect(page.locator('[aria-busy="true"]')).toHaveCount(0, { timeout: 30_000 })
        await expectNoHorizontalOverflow(page)
      })
    }
    errors.check()
  })

  test('bilan introuvable : message dédié, pas de page blanche', async ({ companyPage: page }) => {
    await page.goto('/dashboard/assessments/999999999')
    await expect(page.getByText('Bilan introuvable')).toBeVisible({ timeout: 30_000 })
  })

  test('palette de recherche (Ctrl K) : retrouve un bilan et y navigue @desktop-only', async ({ companyPage: page, company }) => {
    const { asmt } = await bilanWithData(company.api)
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { level: 1, name: company.name })).toBeVisible({ timeout: 30_000 })
    await page.keyboard.press('Control+k')
    await page.getByPlaceholder('Rechercher un bilan, un site, une page…').fill(asmt.name)
    await expect(page.getByRole('option', { name: new RegExp(asmt.name) })).toBeVisible()
    await page.keyboard.press('Enter')
    // `next dev` compiles the bilan page on first navigation — allow for it
    await expect(page).toHaveURL(new RegExp(`/dashboard/assessments/${asmt.id}$`), { timeout: 30_000 })
  })
})
