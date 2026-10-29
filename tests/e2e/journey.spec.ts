import { test, expect, bilanWithData } from '../support/fixtures'
import { toast, watchErrors } from './helpers'

const BUTANE = 'Butane (maritime inclus)'

test.describe('Parcours entreprise (interface)', () => {
  test('onboarding → site → bilan → saisie → certification → verrouillage', async ({ companyPage: page, company }) => {
    test.setTimeout(120_000)
    const errors = watchErrors(page)

    // ── Onboarding → création du site (dialog ouvert par ?new=1) ──
    await page.goto('/dashboard')
    await page.getByRole('link', { name: /Ajouter votre premier site/ }).click()
    await expect(page).toHaveURL(/\/dashboard\/sites/)
    const siteDialog = page.getByRole('dialog', { name: 'Ajouter un site' })
    await expect(siteDialog).toBeVisible()
    await siteDialog.getByLabel('Nom du site').fill('Siège Libreville')
    await siteDialog.getByRole('button', { name: 'Créer le site' }).click()
    await expect(toast(page, 'Site créé')).toBeVisible()
    await expect(siteDialog).toBeHidden()

    // ── Création du bilan depuis la carte du site (site présélectionné) ──
    await page.getByRole('link', { name: /Créer un bilan/ }).first().click()
    const bilanDialog = page.getByRole('dialog', { name: 'Nouveau bilan carbone' })
    await expect(bilanDialog).toBeVisible()
    await expect(bilanDialog.getByLabel('Site concerné')).toContainText('Siège Libreville')
    await bilanDialog.getByRole('button', { name: 'Créer le bilan' }).click()
    await expect(toast(page, 'Bilan créé')).toBeVisible()
    await page.getByRole('link', { name: /Exercice/ }).first().click()
    await expect(page).toHaveURL(/\/dashboard\/assessments\/\d+$/)
    await expect(page.getByText('Aucune donnée saisie').first()).toBeVisible({ timeout: 30_000 }) // next dev compiles on first hit

    // ── Saisie : ajouter une source par la recherche, saisir une quantité ──
    await page.getByRole('button', { name: 'Ajouter une source' }).first().click()
    const picker = page.getByRole('dialog')
    await picker.getByRole('combobox', { name: 'Rechercher un facteur d’émission' }).fill('butane')
    await picker.getByRole('option', { name: new RegExp(BUTANE.replace(/[()]/g, '\\$&')) }).click()
    await expect(picker).toBeHidden()

    const qty = page.getByRole('textbox', { name: new RegExp(`Quantité en .* — ${BUTANE.replace(/[()]/g, '\\$&')}`) })
    await qty.fill('100')
    await qty.blur()
    const bar = page.getByRole('status').filter({ hasText: 'Modifications non enregistrées' })
    await expect(bar).toBeVisible()
    await bar.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(toast(page, 'Bilan enregistré')).toBeVisible()
    await expect(bar).toBeHidden()

    // 100 kg × 3,46 = 346 kgCO₂e
    const totalCard = page.getByText(/Total annuel \d{4}/).locator('..')
    await expect(totalCard).toContainText('346')
    await expect(totalCard).toContainText('kgCO₂e')

    // ── Persistance après rechargement ──
    await page.reload()
    await expect(page.getByRole('textbox', { name: new RegExp(`— ${BUTANE.replace(/[()]/g, '\\$&')}`) })).toHaveValue(/^100([,.]0+)?$/, { timeout: 30_000 })

    // ── Demande de certification → données verrouillées ──
    await page.getByRole('button', { name: /Demander la certification/ }).click()
    const certDialog = page.getByRole('dialog', { name: 'Certifier ce bilan carbone' })
    await certDialog.getByRole('button', { name: 'Envoyer la demande' }).click()
    await expect(toast(page, 'Demande de certification envoyée')).toBeVisible()
    await expect(page.getByText('Données verrouillées pendant la certification')).toBeVisible()
    await expect(page.getByRole('textbox', { name: /Quantité en/ })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Ajouter une source' })).toHaveCount(0)
    await expect(page.getByRole('button', { name: 'Enregistrer' })).toHaveCount(0)

    // Server side agrees
    const list = await (await company.api.get('/api/certifications')).json()
    expect(list).toHaveLength(1)
    expect(list[0].status).toBe('pending')
    errors.check()
  })

  test('modifications non enregistrées : confirmation avant de quitter la page @desktop-only', async ({ companyPage: page, company }) => {
    const { asmt } = await bilanWithData(company.api)
    await page.goto(`/dashboard/assessments/${asmt.id}`)
    const qty = page.getByRole('textbox', { name: new RegExp(`— ${BUTANE.replace(/[()]/g, '\\$&')}`) })
    await expect(qty).toHaveValue('10', { timeout: 30_000 }) // next dev compiles on first hit
    await qty.fill('25')
    await qty.blur()
    await expect(page.getByRole('status').filter({ hasText: 'Modifications non enregistrées' })).toBeVisible()

    const sitesLink = page.getByRole('navigation').getByRole('link', { name: 'Sites', exact: true })

    // Dismiss → stays on the bilan with the edit kept
    let message = ''
    page.once('dialog', d => { message = d.message(); void d.dismiss() })
    await sitesLink.click()
    await expect.poll(() => message).toContain('modifications non enregistrées')
    await expect(page).toHaveURL(new RegExp(`/dashboard/assessments/${asmt.id}$`))
    await expect(qty).toHaveValue('25')

    // Accept → leaves, nothing saved
    page.once('dialog', d => void d.accept())
    await sitesLink.click()
    await expect(page).toHaveURL(/\/dashboard\/sites$/)
    const a = await (await company.api.get(`/api/assessments/${asmt.id}`)).json()
    expect(parseFloat(a.total_co2eq)).toBeCloseTo(34.6, 1)
  })

  test('annuler dans la barre de sauvegarde rétablit la valeur enregistrée', async ({ companyPage: page, company }) => {
    const { asmt } = await bilanWithData(company.api)
    await page.goto(`/dashboard/assessments/${asmt.id}`)
    const qty = page.getByRole('textbox', { name: new RegExp(`— ${BUTANE.replace(/[()]/g, '\\$&')}`) })
    await expect(qty).toHaveValue('10', { timeout: 30_000 })
    await qty.fill('999')
    await qty.blur()
    const bar = page.getByRole('status').filter({ hasText: 'Modifications non enregistrées' })
    await bar.getByRole('button', { name: 'Annuler' }).click()
    await expect(bar).toBeHidden()
    await expect(qty).toHaveValue('10')
  })
})
