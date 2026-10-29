# CarbonTrack

Plateforme de bilan carbone et de certification pour les entreprises gabonaises
(entreprise → GreenLeaves → expert accrédité → dépôt au CNC → certificat).

| Dossier | Contenu |
|---|---|
| [`carbon-app/`](carbon-app/) | Application web Next.js 14 (portails entreprise, admin, expert) + suite de régression |
| `mobile/` | *(à venir)* application Expo |

## Régression

[![Web regression](https://github.com/MOCTAR10/carbon/actions/workflows/web-regression.yml/badge.svg)](https://github.com/MOCTAR10/carbon/actions/workflows/web-regression.yml)

Chaque push sur `main`, chaque pull request touchant `carbon-app/` et chaque nuit, GitHub Actions :

1. **Types & lint** — `tsc --noEmit` (app + tests) et ESLint ;
2. **Migrations** — applique `init-db.sql` + tous les `migrate-*.sql` sur une base vide, puis une seconde fois (idempotence) ;
3. **Régression** — build de production, PostgreSQL 16, puis la suite Playwright : API, navigateur 1440 px et mobile 390 px.

Le rapport HTML (avec traces des échecs) est téléchargeable dans l’onglet *Actions* → run → *Artifacts*.
Détails et exécution locale : [`carbon-app/tests/README.md`](carbon-app/tests/README.md).
