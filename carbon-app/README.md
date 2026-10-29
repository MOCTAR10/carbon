# CarbonTrack - Bilan Carbone Entreprise

Application web professionnelle de bilan carbone conforme aux standards internationaux (ISO 14064, GHG Protocol, Bilan Carbone®).

## Fonctionnalités

- **Authentification** : Inscription/connexion entreprise
- **Multi-sites** : Gestion de plusieurs sites (bureaux, entrepôts, usines...)
- **Bilan complet Scope 1, 2 & 3** : Tous les postes d'émissions
- **100+ facteurs d'émissions** : Issus de la Base Carbone (ADEME)
- **Rapports conformes** : GHG Protocol, ISO 14069, bilan GES réglementaire
- **Graphiques interactifs** : Visualisation par scope, catégorie, poste

## Prérequis

- Node.js 18+
- PostgreSQL 14+

## Installation

```bash
# 1. Installer les dépendances
npm install

# 2. Créer la base de données PostgreSQL
createdb carbontrack
psql -d carbontrack -f scripts/init-db.sql

# 3. Configurer l'environnement (modifier .env.local si nécessaire)
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/carbontrack

# 4. Lancer l'application
npm run dev
```

L'application sera disponible sur http://localhost:3000

## Structure

```
src/
  app/
    api/          # API routes (auth, sites, assessments, emissions, reports)
    dashboard/    # Pages du tableau de bord
    login/        # Page de connexion
    register/     # Page d'inscription
  lib/
    auth.ts       # Authentification JWT
    db.ts         # Connexion PostgreSQL
    emission-factors.ts  # Facteurs d'émissions Base Carbone
scripts/
  init-db.sql     # Script d'initialisation de la BDD
```

## Standards supportés

- **ISO 14064** / **ISO 14069** : Quantification des GES
- **GHG Protocol** : Corporate Standard (Scope 1, 2, 3)
- **Bilan Carbone®** : Méthodologie ADEME
- **CDP** : Carbon Disclosure Project
