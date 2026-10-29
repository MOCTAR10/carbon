# CarbonTrack — Agent Guide

## Stack
- Next.js 14 (App Router), TypeScript (strict), Tailwind CSS v3
- PostgreSQL via raw `pg` (no ORM), JWT via `jose`
- `@/*` maps to `src/*`

## Dev commands
```bash
npm run dev          # next dev --turbo -H 0.0.0.0 (4GB heap)
npm run build        # next build (4GB heap); TS/ESLint ignored during build
npm run start        # next start (production)
npm run lint         # next lint (extends next/core-web-vitals)
npm run db:seed      # node scripts/seed.js
node scripts/seed-admin.js   # creates admin@carbontrack.com / Admin@2026!
```
All npm scripts force `NODE_OPTIONS=--max-old-space-size=4096`.

## Portals & auth
| Route | Cookie | Audience |
|-------|--------|----------|
| `/dashboard` | `token` | Company users |
| `/admin` | `adm_token` | Administrators |
| `/expert` | `exp_token` | Auditors/experts |
| `/partner` | *(no middleware)* | Partner organizations |

JWT `{ userId, email, companyId, role }`, 7-day expiry. Guards defined in `src/middleware.ts` (partner bypasses middleware).

## API
Routes under `src/app/api/` (21 groups): `admin/*`, `assessments`, `auth`, `certifications`, `company`, `dashboard`, `documents`, `emissions`, `expert`, `market`, `notifications`, `partner`, `partners`, `puro`, `rag`, `reports`, `settings`, `sites`, `subscription`, `subscriptions`, `vvb-registry`.

## DB
- Config: `DATABASE_URL` or `PG*` (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`). `PGSSLMODE=require` enables SSL (Neon/Supabase); default off.
- Connection retry: `src/lib/db.ts` auto-retries a terminated connection once.
- Migrations: `scripts/init-db.sql` + `scripts/migrate-*.sql` (12 files). **Run sequentially in alpha order. No version tracking table.**

## Build quirks (intentional)
- `next.config.js`: `eslint.ignoreDuringBuilds: true`, `typescript.ignoreBuildErrors: true`. These skip lint/TS only during production build; dev/IDE still checks.
- `serverComponentsExternalPackages`: includes `@react-pdf/renderer`, `qrcode`.

## MRV & RAG
- MRV (`src/lib/mrv/calculate.ts`): dispatches `VM0048` (REDD+), `VM0047` (ARR), `VM0050` (cookstoves), `VM0033` (mangroves); returns `MRVResult`.
- RAG (`src/lib/groq.ts`): Groq LLaMA 3.3 70B (OpenAI-compatible). `groqComplete` (non-streaming) and `groqStream` (ReadableStream). Requires `GROQ_API_KEY`.

## Conventions
- UI text in French.
- No tests, no formatter, no pre-commit hooks, no Docker.
- `scripts/` contains DB init/migrations/seeds.

## Production
- PM2 fork on :3000 (`ecosystem.config.js`), Jenkins (`Jenkinsfile`) does rsync → atomic symlink → PM2 reload.
- Uploads: `public/logos/` and `public/uploads/` are gitignored and **symlinked to `shared/` in prod**. Adding a new upload dir requires: (1) adding a symlink in Jenkinsfile (Deploy stage), (2) adding a `location` block in `deploy/nginx-carbontrack.conf`. These dirs do not exist in fresh clones.
