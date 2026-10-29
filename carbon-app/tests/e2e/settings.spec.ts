import { test, expect } from '../support/fixtures'
import { toast, watchErrors } from './helpers'

test.describe('Paramètres (interface)', () => {
  test('profil : « Enregistrer » inactif tant que rien ne change, puis mise à jour persistée', async ({ companyPage: page, company }) => {
    const errors = watchErrors(page)
    await page.goto('/dashboard/settings')
    const profil = page.getByRole('region', { name: 'Profil' })
    const save = profil.getByRole('button', { name: 'Enregistrer' })
    const firstName = profil.getByLabel('Prénom')
    await expect(firstName).toHaveValue('Clara', { timeout: 30_000 })
    await expect(save).toBeDisabled()

    await firstName.fill('Awa')
    await expect(save).toBeEnabled()
    await save.click()
    await expect(toast(page, 'Profil mis à jour')).toBeVisible()
    await expect(save).toBeDisabled()

    const me = await (await company.api.get('/api/account/profile')).json()
    expect(JSON.stringify(me)).toContain('"Awa"')
    await page.reload()
    await expect(page.getByRole('region', { name: 'Profil' }).getByLabel('Prénom')).toHaveValue('Awa', { timeout: 30_000 })
    errors.check()
  })

  test('annuler rétablit les valeurs enregistrées', async ({ companyPage: page }) => {
    await page.goto('/dashboard/settings')
    const profil = page.getByRole('region', { name: 'Profil' })
    const lastName = profil.getByLabel('Nom', { exact: true })
    await expect(lastName).toHaveValue('Test', { timeout: 30_000 })
    await lastName.fill('Modifié')
    await profil.getByRole('button', { name: 'Annuler' }).click()
    await expect(lastName).toHaveValue('Test')
    await expect(profil.getByRole('button', { name: 'Enregistrer' })).toBeDisabled()
  })

  test('changement de raison sociale répercuté dans l’en-tête de l’application', async ({ companyPage: page, company }) => {
    await page.goto('/dashboard/settings')
    const entreprise = page.getByRole('region', { name: 'Entreprise' })
    const name = entreprise.getByLabel('Raison sociale')
    await expect(name).toHaveValue(company.name, { timeout: 30_000 })
    const renamed = `${company.name} SA`
    await name.fill(renamed)
    await entreprise.getByRole('button', { name: 'Enregistrer' }).click()
    await expect(toast(page, 'Informations de l’entreprise mises à jour')).toBeVisible()
    await page.goto('/dashboard')
    await expect(page.getByRole('heading', { level: 1, name: renamed })).toBeVisible({ timeout: 30_000 })
  })

  test('mot de passe : bouton inactif tant que le formulaire est incomplet', async ({ companyPage: page }) => {
    await page.goto('/dashboard/settings')
    const securite = page.getByRole('region', { name: 'Sécurité' })
    const submit = securite.getByRole('button', { name: 'Modifier le mot de passe' })
    await expect(securite.getByLabel('Mot de passe actuel')).toBeVisible({ timeout: 30_000 })
    await expect(submit).toBeDisabled()
    await securite.getByLabel('Mot de passe actuel').fill('ancien-mdp-123')
    await securite.getByLabel('Nouveau mot de passe', { exact: true }).fill('NouveauMdp-2026')
    await securite.getByLabel('Confirmer le nouveau mot de passe').fill('Autre-2026!')
    await expect(securite.getByText('Les mots de passe ne correspondent pas')).toBeVisible()
    await expect(submit).toBeDisabled()
  })
})
