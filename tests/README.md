# Suite de régression (Playwright)

Tests de bout en bout de l’application web, exécutés contre un vrai serveur Next.js et une vraie base PostgreSQL.
Aucun mock : chaque test crée sa propre entreprise via l’API publique d’inscription, puis la supprime.

## Contenu

| Projet | Dossier | Couvre |
|---|---|---|
| `api` | `tests/api/` | Inscription / connexion / limitation, cloisonnement des portails, isolation entre entreprises, moteur de calcul (les 139 facteurs), validation des saisies, justificatifs et logo (types, taille, en-têtes), sites, paramètres du compte, **parcours complet de certification** (demande → admin → expert → dépôt DGEPN → certificat → vérification publique), refus et déverrouillage |
| `desktop` | `tests/e2e/` | Parcours dans le navigateur à 1440 px |
| `mobile` | `tests/e2e/` | Les mêmes parcours à 390 px (sauf tests marqués `@desktop-only`) |

`tests/support/` : configuration de la base (`db.ts`), données et fichiers de test (`data.ts`), fixtures
(`company`, `otherCompany`, `admin`, `expert`, `companyPage`) et nettoyage. Les comptes admin/expert sont créés
par `global-setup.ts` ; toutes les adresses de test se terminent par `@qa.carbontrack.test`.

## Lancer en local

Prérequis : PostgreSQL local et `.env.local` (les tests lisent les mêmes variables `PG*` / `DATABASE_URL` que l’app).

```bash
cd carbon-app
npm run db:migrate          # schéma à jour (idempotent)
npx playwright install chromium   # une seule fois
npm run test:api            # API uniquement (~1 min)
npm run test:e2e            # tout : api + desktop + mobile
npm run test:report         # ouvre le dernier rapport HTML
```

Playwright démarre `next dev` sur le port 3100, ou réutilise un serveur déjà lancé sur ce port.
⚠️ Les tests écrivent dans la base configurée (puis nettoient) : utilisez une base de développement, jamais la production.

Pour reproduire exactement la CI (build de production) :

```bash
npm run build
TEST_PROD_SERVER=1 TEST_SERVER_CMD="npx next start -p 3100" npx playwright test
```

Les deux tests de limitation de débit (inscription, connexion) ne tournent qu’avec `TEST_PROD_SERVER=1` :
`next dev` recompile les routes et réinitialise le limiteur en mémoire.

## Écrire un test

- Importer `test` / `expect` depuis `tests/support/fixtures` (pas directement depuis `@playwright/test`).
- Utiliser la fixture `company` (entreprise neuve, supprimée après le test) ; ne jamais dépendre de données existantes.
- Préparer l’état via l’API (`bilanWithData`, `requestCertification`…), vérifier l’UI avec des sélecteurs accessibles
  (`getByRole`, `getByLabel`, textes français) — pas de classes CSS, pas de `waitForTimeout`.
- Un bug connu se marque `test.fail()` avec un commentaire, jamais en supprimant l’assertion.
