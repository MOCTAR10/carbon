import { test, expect } from '../support/fixtures'
import { PASSWORD, QA_DOMAIN, uid } from '../support/data'
import { db } from '../support/db'
import { deleteCompanies } from '../support/cleanup'
import { isolateIp, watchErrors } from './helpers'

test.describe('Inscription (interface)', () => {
  const emails: string[] = []
  test.afterEach(async () => {
    if (!emails.length) return
    const { rows } = await db.query<{ company_id: number }>('SELECT company_id FROM users WHERE email = ANY($1)', [emails.splice(0)])
    await deleteCompanies(rows.map(r => r.company_id).filter(Boolean))
  })

  test('création d’un compte puis arrivée sur le tableau de bord avec l’onboarding', async ({ page }) => {
    const errors = watchErrors(page)
    await isolateIp(page)
    const email = `${uid('ui')}@${QA_DOMAIN}`
    emails.push(email)

    await page.goto('/register')
    await page.getByLabel('Prénom').fill('Clara')
    await page.getByLabel('Nom', { exact: true }).fill('Test')
    await page.getByLabel('Email professionnel').fill(email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Confirmer le mot de passe').fill(PASSWORD)
    await page.getByLabel('Nom de l’entreprise').fill(`QA ${uid('ui')}`)
    await page.getByLabel('Téléphone').fill('+241 77 00 00 00')
    await page.getByLabel('Secteur d’activité').click()
    await page.getByRole('option', { name: 'Pétrole & Gaz' }).click()

    const submit = page.getByRole('button', { name: /Créer mon compte/ })
    await expect(submit).toBeDisabled() // terms not accepted yet
    await page.getByRole('checkbox').check({ force: true })
    await expect(submit).toBeEnabled()
    await submit.click()

    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 })
    await expect(page.getByRole('region', { name: 'Bien démarrer' })).toBeVisible()
    await expect(page.getByRole('link', { name: /Ajouter votre premier site/ })).toBeVisible()
    errors.check()
  })

  test('validation en ligne : mot de passe trop court et confirmation différente', async ({ page }) => {
    await isolateIp(page)
    await page.goto('/register')
    const pwd = page.getByLabel('Mot de passe', { exact: true })
    await pwd.fill('abc')
    await pwd.blur()
    await expect(page.getByText('Au moins 8 caractères.')).toBeVisible()
    await pwd.fill(PASSWORD)
    const confirm = page.getByLabel('Confirmer le mot de passe')
    await confirm.fill(`${PASSWORD}x`)
    await confirm.blur()
    await expect(page.getByText('Les mots de passe ne correspondent pas.')).toBeVisible()
    await expect(page.getByRole('button', { name: /Créer mon compte/ })).toBeDisabled()
  })

  test('email déjà utilisé : message du serveur affiché', async ({ page, company }) => {
    await isolateIp(page)
    await page.goto('/register')
    await page.getByLabel('Prénom').fill('Clara')
    await page.getByLabel('Nom', { exact: true }).fill('Test')
    await page.getByLabel('Email professionnel').fill(company.email.toUpperCase())
    await page.getByLabel('Mot de passe', { exact: true }).fill(PASSWORD)
    await page.getByLabel('Confirmer le mot de passe').fill(PASSWORD)
    await page.getByLabel('Nom de l’entreprise').fill('QA doublon')
    await page.getByLabel('Téléphone').fill('+241 77 00 00 00')
    await page.getByLabel('Secteur d’activité').click()
    await page.getByRole('option', { name: 'Pétrole & Gaz' }).click()
    await page.getByRole('checkbox').check({ force: true })
    await page.getByRole('button', { name: /Créer mon compte/ }).click()
    await expect(page.getByText('Un compte avec cet email existe déjà')).toBeVisible()
    await expect(page).toHaveURL(/\/register/)
  })
})

test.describe('Connexion (interface)', () => {
  test('mauvais mot de passe : erreur affichée, on reste sur /login', async ({ page, company }) => {
    await isolateIp(page)
    await page.goto('/login')
    await page.getByLabel('Adresse email').fill(company.email)
    await page.getByRole('button', { name: /Continuer/ }).click()
    await expect(page.getByText(company.name)).toBeVisible()
    await page.getByLabel('Mot de passe', { exact: true }).fill('mauvais-mot-de-passe')
    await page.getByRole('button', { name: /Se connecter/ }).click()
    await expect(page.getByText('Mot de passe incorrect.')).toBeVisible()
    await expect(page).toHaveURL(/\/login/)
  })

  test('bon mot de passe : arrivée sur le tableau de bord', async ({ page, company }) => {
    const errors = watchErrors(page)
    await isolateIp(page)
    await page.goto('/login')
    await page.getByLabel('Adresse email').fill(company.email)
    await page.getByRole('button', { name: /Continuer/ }).click()
    await expect(page.getByText(company.name)).toBeVisible()
    await page.getByLabel('Mot de passe', { exact: true }).fill(company.password)
    await page.getByRole('button', { name: /Se connecter/ }).click()
    await expect(page).toHaveURL(/\/dashboard$/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { level: 1, name: company.name })).toBeVisible()
    errors.check()
  })

  test('sans session, une page de l’espace entreprise renvoie vers /login', async ({ page }) => {
    await page.goto('/dashboard/sites')
    await expect(page).toHaveURL(/\/login/)
    await expect(page.getByLabel('Adresse email')).toBeVisible()
    await expect(page.getByRole('button', { name: /Continuer/ })).toBeVisible()
  })
})
