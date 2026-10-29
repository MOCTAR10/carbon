# 🍃 CarbonTrack — Guide de Déploiement Complet

**Serveur :** `37.60.240.199` · **Dossier :** `/var/www/carbontrack/` · **Port :** `3001`

---

## 📋 Table des Matières

1. [Architecture & Vue d'ensemble](#1-architecture--vue-densemble)
2. [Prérequis](#2-prérequis)
3. [Serveur — Installation de l'environnement](#3-serveur--installation-de-lenvironnement)
4. [Base de données PostgreSQL](#4-base-de-données-postgresql)
5. [Déploiement de l'Application Web](#5-déploiement-de-lapplication-web)
6. [Configuration PM2 (processus)](#6-configuration-pm2-processus)
7. [Configuration Nginx (proxy)](#7-configuration-nginx-proxy)
8. [Portail Admin](#8-portail-admin)
9. [Portail Expert Certifieur](#9-portail-expert-certifieur)
10. [Application Mobile (Expo)](#10-application-mobile-expo)
11. [Mise à Jour de l'Application](#11-mise-à-jour-de-lapplication)
12. [Checklist Finale](#12-checklist-finale)
13. [Dépannage](#13-dépannage)

---

## 1. Architecture & Vue d'ensemble

```
┌─────────────────────────────────────────────────────────┐
│                        INTERNET                         │
└──────────────────────┬──────────────────────────────────┘
                       │
              ┌────────▼────────┐
              │  Navigateur /   │
              │   App Mobile    │
              └────────┬────────┘
                       │ port 3001
              ┌────────▼────────┐
              │  Nginx Proxy    │  ← carbontrack.conf (isolé)
              └────────┬────────┘
                       │ localhost:3001
              ┌────────▼────────┐
              │  Next.js App    │  ← PM2 "carbontrack"
              │  /var/www/      │
              │  carbontrack/   │
              └────────┬────────┘
                       │
              ┌────────▼────────┐
              │   PostgreSQL    │  ← db: carbontrack
              │   port 5432     │      user: carbontrack_user
              └─────────────────┘
```

### Les 3 Portails de la Plateforme

| Portail | URL | Rôle | Accès |
|---------|-----|------|-------|
| **Entreprise** | `/dashboard` | `user` | Inscription publique |
| **Admin** | `/admin` | `admin` | Script seed uniquement |
| **Expert** | `/expert` | `expert` | Créé par l'admin |

### App Mobile — 2 types d'utilisateurs

| Utilisateur | Fonctionnalités |
|-------------|-----------------|
| **Client** (user) | Saisie émissions, bilans PDF, abonnement Mobile Money |
| **Expert** | Validation certifications, checklist inspection, rapports |

---

## 2. Prérequis

### Sur votre PC

- [ ] **PuTTY** (Windows) ou Terminal (Mac/Linux) pour SSH
- [ ] **OpenSSH** pour SCP — inclus par défaut dans Windows 10/11 (PowerShell)
- [ ] **7-Zip** (Windows) pour créer le ZIP sans `node_modules` — [7-zip.org](https://www.7-zip.org)
- [ ] Code source de l'app (`carbon-app/`)
- [ ] Code source mobile (`mobile/`)

### Sur le serveur

- [ ] Accès SSH root ou sudo à `37.60.240.199`
- [ ] Ubuntu 20.04 / 22.04 **ou** Debian 11 / 12
- [ ] Minimum 1 Go RAM, 10 Go disque

---

## 3. Serveur — Installation de l'environnement

### 3.1 Connexion SSH

```bash
ssh root@37.60.240.199
```

Mettre à jour le système :

```bash
apt update && apt upgrade -y
```

### 3.2 Installer Node.js 20 LTS

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# Vérifier
node -v    # → v20.x.x
npm -v     # → 10.x.x
```

### 3.3 Installer PM2

```bash
npm install -g pm2
pm2 -v
```

### 3.4 Installer Nginx

```bash
apt install -y nginx
systemctl enable nginx
systemctl start nginx
```

### 3.5 Installer Git

```bash
apt install -y git
```

---

## 4. Base de données PostgreSQL

### 4.1 Installer PostgreSQL

```bash
apt install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

# Vérifier
systemctl status postgresql
```

### 4.2 Créer la base de données et l'utilisateur

```bash
sudo -u postgres psql
```

Dans la console PostgreSQL `postgres=#` :

```sql
-- Créer l'utilisateur dédié CarbonTrack
CREATE USER carbontrack_user WITH PASSWORD 'VOTRE_MOT_DE_PASSE_FORT';

-- Créer la base de données
CREATE DATABASE carbontrack OWNER carbontrack_user;

-- Accorder tous les droits
GRANT ALL PRIVILEGES ON DATABASE carbontrack TO carbontrack_user;

-- Quitter
\q
```

> ⚠️ Remplacez `VOTRE_MOT_DE_PASSE_FORT` par un mot de passe complexe.
> Notez-le — vous en aurez besoin à l'étape 5.

> 💡 Si d'autres apps utilisent déjà PostgreSQL sur ce serveur : pas de conflit.
> Chaque app a sa propre base de données et son propre utilisateur.

### 4.3 Initialiser le schéma (tables)

> Faites cette étape **après** avoir uploadé le code (étape 5.2)

```bash
psql -U carbontrack_user -d carbontrack -h localhost \
  -f /var/www/carbontrack/scripts/init-db.sql
```

Vérifier que les tables sont créées :

```bash
psql -U carbontrack_user -d carbontrack -h localhost -c "\dt"
```

Vous devez voir : `companies`, `users`, `sites`, `assessments`, `emission_entries`,
`subscriptions`, `certification_requests`, `certification_documents`,
`audit_documents`, `platform_settings`

---

## 5. Déploiement de l'Application Web

### 5.1 Créer le dossier dédié

```bash
# Créer le dossier isolé dans www/
mkdir -p /var/www/carbontrack

# Vérifier que les autres apps sont intactes
ls /var/www/
```

### 5.2 Uploader le code source — ZIP via SCP (méthode recommandée)

Le transfert par ZIP est le plus rapide : un seul fichier à envoyer au lieu de milliers.

#### Étape 1 — Créer le ZIP sur votre PC (Windows)

Ouvrir **PowerShell** et exécuter :

```powershell
# Aller dans le dossier parent du projet
cd C:\Users\user\OneDrive\Desktop\carbon

# Créer un ZIP en excluant node_modules, .next et .git (7-Zip requis)
7z a carbon-app.zip carbon-app\ -xr!node_modules -xr!.next -xr!.git

# Vérifier la taille (doit être quelques Mo, pas des centaines)
ls carbon-app.zip
```

> ⚠️ Si 7-Zip n'est pas dans le PATH, utiliser le chemin complet :
> `& "C:\Program Files\7-Zip\7z.exe" a carbon-app.zip carbon-app\ -xr!node_modules -xr!.next -xr!.git`

#### Étape 2 — Transférer via SCP

```powershell
# Toujours dans PowerShell (même dossier)
scp carbon-app.zip root@37.60.240.199:/tmp/

# Entrer le mot de passe SSH quand demandé
# Le transfert prend 10–60 secondes selon la connexion
```

#### Étape 3 — Décompresser sur le serveur

Sur le serveur SSH :

```bash
# Installer unzip si nécessaire
apt install -y unzip

# Décompresser dans le dossier cible
unzip /tmp/carbon-app.zip -d /tmp/carbontrack-extract

# Copier les fichiers au bon endroit
cp -r /tmp/carbontrack-extract/carbon-app/. /var/www/carbontrack/

# Nettoyer
rm -rf /tmp/carbon-app.zip /tmp/carbontrack-extract
```

Vérifier :

```bash
ls /var/www/carbontrack
# Doit afficher : src/  public/  package.json  next.config.js  scripts/  ...
```

> **Alternative — Via Git** (si le repo est sur GitHub/GitLab) :
> ```bash
> cd /var/www/carbontrack
> git clone https://github.com/VOTRE_USER/VOTRE_REPO.git .
> ```

### 5.3 Créer les dossiers de fichiers

```bash
# Documents d'audit uploadés par les utilisateurs
mkdir -p /var/www/carbontrack/uploads
chmod 755 /var/www/carbontrack/uploads

# Logos des entreprises (accessibles en statique via /logos/...)
mkdir -p /var/www/carbontrack/public/logos
chmod 755 /var/www/carbontrack/public/logos
```

### 5.4 Créer le fichier de configuration

```bash
nano /var/www/carbontrack/.env.production
```

Contenu complet à copier-coller :

```env
# ══════════════════════════════════════════
# CarbonTrack — Configuration Production
# ══════════════════════════════════════════

# Environnement
NODE_ENV=production

# ── Base de données ──────────────────────
PGHOST=localhost
PGPORT=5432
PGUSER=carbontrack_user
PGPASSWORD=VOTRE_MOT_DE_PASSE_FORT
PGDATABASE=carbontrack

# ── Sécurité JWT ─────────────────────────
# Générer avec : node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
JWT_SECRET=REMPLACER_PAR_CHAINE_ALEATOIRE_64_CHARS

# ── URL publique ─────────────────────────
NEXTAUTH_URL=http://37.60.240.199:3001
NEXT_PUBLIC_APP_URL=http://37.60.240.199:3001
```

Sauvegarder : **Ctrl+O** → **Entrée** → **Ctrl+X**

Générer un JWT_SECRET fort :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
# Copiez le résultat dans .env.production
```

Protéger le fichier :

```bash
chmod 600 /var/www/carbontrack/.env.production
```

> 🚨 Ne jamais committer `.env.production` sur GitHub.

### 5.5 Installer les dépendances & builder

```bash
cd /var/www/carbontrack

# Charger les variables
export $(cat .env.production | grep -v '^#' | xargs)

# Installer les packages
npm install --production=false

# Compiler pour la production (2–5 minutes)
npm run build
```

> ✅ Attendez : **"✓ Compiled successfully"**

Si erreur `out of memory` :

```bash
export NODE_OPTIONS="--max-old-space-size=2048"
npm run build
```

---

## 6. Configuration PM2 (processus)

### 6.1 Créer le fichier ecosystem

```bash
cat > /var/www/carbontrack/ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'carbontrack',
    script: 'npm',
    args: 'start',
    cwd: '/var/www/carbontrack',
    env_production: {
      NODE_ENV: 'production',
      PORT: 3001
    }
  }]
}
EOF
```

### 6.2 Lancer l'application

```bash
# Charger les variables d'env
export $(cat /var/www/carbontrack/.env.production | grep -v '^#' | xargs)

# Démarrer
pm2 start /var/www/carbontrack/ecosystem.config.js --env production

# Vérifier (doit afficher status: online)
pm2 status
```

### 6.3 Démarrage automatique au reboot

```bash
pm2 save
pm2 startup
# ⚠️ Copiez et exécutez la commande affichée par pm2 startup
```

### 6.4 Tester

```bash
curl http://localhost:3001
# Doit retourner du HTML contenant "CarbonTrack"
```

---

## 7. Configuration Nginx (proxy)

### 7.1 Créer la configuration dédiée

```bash
nano /etc/nginx/sites-available/carbontrack.conf
```

Contenu :

```nginx
# ── CarbonTrack — Reverse Proxy ──────────────────────────
# Fichier isolé : n'interfère pas avec les autres apps

server {
    listen 3001;
    server_name 37.60.240.199;

    # Logs dédiés
    access_log /var/log/nginx/carbontrack_access.log;
    error_log  /var/log/nginx/carbontrack_error.log;

    # Max taille upload (logos, documents certification)
    client_max_body_size 20M;

    location / {
        proxy_pass          http://127.0.0.1:3001;
        proxy_http_version  1.1;
        proxy_set_header    Upgrade $http_upgrade;
        proxy_set_header    Connection 'upgrade';
        proxy_set_header    Host $host;
        proxy_set_header    X-Real-IP $remote_addr;
        proxy_set_header    X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass  $http_upgrade;
    }
}
```

### 7.2 Activer et vérifier

```bash
# Activer
ln -s /etc/nginx/sites-available/carbontrack.conf /etc/nginx/sites-enabled/

# Tester la syntaxe — IMPORTANT avant de recharger
nginx -t
# → nginx: configuration file /etc/nginx/nginx.conf syntax is ok
# → nginx: configuration file /etc/nginx/nginx.conf test is successful

# Recharger sans couper les autres apps
systemctl reload nginx
```

### 7.3 Pare-feu

```bash
ufw allow 22/tcp     # SSH — NE PAS OUBLIER
ufw allow 80/tcp     # HTTP
ufw allow 3001/tcp   # CarbonTrack
ufw enable
ufw status
```

---

## 8. Portail Admin

Le portail admin est inclus dans l'application web. Il suffit de créer le premier compte admin.

### 8.1 Créer le compte admin

```bash
cd /var/www/carbontrack
export $(cat .env.production | grep -v '^#' | xargs)
node scripts/seed-admin.js
```

> ✅ Notez l'email et le mot de passe affichés à l'écran.

### 8.2 Accès et fonctionnalités

**URL :** `http://37.60.240.199:3001/admin`

| Page Admin | URL | Description |
|------------|-----|-------------|
| Dashboard | `/admin` | Stats globales |
| Entreprises | `/admin/companies` | Toutes les entreprises inscrites |
| Utilisateurs | `/admin/users` | Tous les comptes |
| Abonnements | `/admin/subscriptions` | Activer / prolonger abonnements |
| Certifications | `/admin/certifications` | Demandes de certification |
| Experts | `/admin/experts` | Créer & gérer les experts certifieurs |

### 8.3 Créer un expert depuis l'admin

1. Aller sur `http://37.60.240.199:3001/admin/experts`
2. Cliquer **"Ajouter un expert"**
3. Renseigner nom, email, mot de passe
4. L'expert peut maintenant se connecter sur `/expert/login`

---

## 9. Portail Expert Certifieur

Le portail expert est une interface séparée, accessible uniquement avec le rôle `expert`.

### 9.1 Accès

**URL connexion :** `http://37.60.240.199:3001/expert/login`

> Les experts ne passent **pas** par `/login` ni `/admin` — ils ont leur propre page de connexion.

### 9.2 Fonctionnalités

| Page Expert | URL | Description |
|-------------|-----|-------------|
| Dashboard | `/expert` | Dossiers assignés, statistiques |
| Certifications | `/expert/certifications` | Liste des bilans à certifier |
| Dossier détail | `/expert/certifications/[id]` | Checklist, notes, validation |

### 9.3 Flux de certification

```
Entreprise soumet une demande
        ↓
Admin assigne à un expert (/admin/certifications)
        ↓
Expert reçoit le dossier (/expert/certifications)
        ↓
Expert remplit la checklist + notes d'inspection
        ↓
Expert valide → certificat généré (ou rejette avec raison)
        ↓
Entreprise voit le résultat sur /dashboard/certifications
```

---

## 10. Application Mobile (Expo)

### 10.1 Pointer sur le serveur de production

Chercher l'ancienne URL dans le code mobile :

```bash
grep -r "localhost" mobile/src/ --include="*.ts" --include="*.tsx" -l
```

Mettre à jour l'URL API (ex: `mobile/src/lib/api.ts`) :

```typescript
// ❌ Développement
const API_URL = 'http://localhost:3000'

// ✅ Production
const API_URL = 'http://37.60.240.199:3001'
```

### 10.2 Préparer les icônes de l'app

Ouvrir `mobile/assets/generate-icons.html` dans Chrome :

1. Cliquer **"Télécharger tout"**
2. Copier les fichiers téléchargés dans `mobile/assets/` :

| Fichier | Taille | Usage |
|---------|--------|-------|
| `icon.png` | 1024×1024 | Icône principale |
| `adaptive-icon.png` | 1024×1024 | Android adaptive icon |
| `splash.png` | 1284×2778 | Écran de chargement |
| `notification-icon.png` | 96×96 | Icône notifications |

### 10.3 Vérifier app.json

```bash
cat mobile/app.json
```

Vérifier que ces champs sont remplis :

```json
{
  "expo": {
    "name": "CarbonTrack",
    "slug": "carbontrack",
    "version": "1.0.0",
    "ios": {
      "bundleIdentifier": "com.votreentreprise.carbontrack"
    },
    "android": {
      "package": "com.votreentreprise.carbontrack"
    }
  }
}
```

### 10.4 Builder avec EAS

```bash
cd mobile

# Installer EAS CLI
npm install -g eas-cli

# Se connecter à Expo
eas login

# Configurer le projet (première fois seulement)
eas build:configure

# Builder Android
eas build --platform android --profile production

# Builder iOS
eas build --platform ios --profile production
```

> ⏱️ Le build cloud prend 10–20 minutes. Vous recevez un lien de téléchargement.

### 10.5 Soumettre sur les stores

```bash
# Google Play Store
eas submit --platform android

# Apple App Store
eas submit --platform ios
```

### 10.6 Rôles sur mobile

| Rôle | Écrans disponibles | Comment créer |
|------|--------------------|---------------|
| `user` (client) | Accueil, Bilans, Émissions, PDF, Abonnement | Inscription dans l'app |
| `expert` | Dashboard expert, Certifications, Checklist | Créé par l'admin web |

> ℹ️ Le rôle `admin` est **web uniquement** — pas d'interface admin sur mobile.

---

## 11. Mise à Jour de l'Application

À chaque modification du code, même processus : ZIP → SCP → décompresser → rebuild.

### 11.1 Sur votre PC (PowerShell)

```powershell
cd C:\Users\user\OneDrive\Desktop\carbon

# Recréer le ZIP (écrase l'ancien)
7z a carbon-app.zip carbon-app\ -xr!node_modules -xr!.next -xr!.git

# Transférer
scp carbon-app.zip root@37.60.240.199:/tmp/
```

### 11.2 Sur le serveur SSH

```bash
# Décompresser et remplacer les fichiers
apt install -y unzip  # (si pas déjà fait)
unzip -o /tmp/carbon-app.zip -d /tmp/carbontrack-extract
cp -r /tmp/carbontrack-extract/carbon-app/. /var/www/carbontrack/
rm -rf /tmp/carbon-app.zip /tmp/carbontrack-extract

cd /var/www/carbontrack

# Réinstaller si package.json a changé
npm install --production=false

# Rebuilder (2–5 minutes)
npm run build

# Redémarrer sans coupure (reload ≠ restart)
pm2 reload carbontrack

# Vérifier
pm2 status
```

> ✅ `pm2 reload` fait un redémarrage progressif — aucune interruption pour les utilisateurs connectés.
> ⚠️ Ne pas écraser `.env.production` lors du décompressage — ce fichier reste sur le serveur uniquement.

---

## 12. Checklist Finale

### 🖥️ Serveur

- [ ] SSH connecté à `37.60.240.199`
- [ ] `apt update && apt upgrade` effectué
- [ ] Node.js 20 installé — `node -v` → v20.x
- [ ] PM2 installé — `pm2 -v` fonctionne
- [ ] Nginx installé et actif
- [ ] PostgreSQL installé et actif

### 🗄️ Base de données

- [ ] Utilisateur `carbontrack_user` créé avec mot de passe fort
- [ ] Base de données `carbontrack` créée
- [ ] `init-db.sql` exécuté — toutes les tables présentes
- [ ] Dossier `uploads/` créé avec droits 755
- [ ] Dossier `public/logos/` créé avec droits 755

### 🌐 Application Web

- [ ] ZIP créé avec 7-Zip (sans `node_modules`, `.next`, `.git`)
- [ ] ZIP transféré via `scp carbon-app.zip root@37.60.240.199:/tmp/`
- [ ] Code décompressé dans `/var/www/carbontrack/`
- [ ] `.env.production` créé avec toutes les variables
- [ ] `JWT_SECRET` = valeur aléatoire forte
- [ ] `npm install` sans erreur
- [ ] `npm run build` → "✓ Compiled successfully"
- [ ] PM2 statut **online** — `pm2 status`
- [ ] `pm2 save && pm2 startup` exécutés

### 🔀 Nginx

- [ ] `carbontrack.conf` créé dans `sites-available/`
- [ ] Lien symbolique dans `sites-enabled/`
- [ ] `nginx -t` → syntax is ok
- [ ] `systemctl reload nginx` sans erreur
- [ ] Port 3001 ouvert — `ufw allow 3001/tcp`

### 🔐 Tests des 3 Portails

- [ ] `http://37.60.240.199:3001` → page login visible
- [ ] `http://37.60.240.199:3001/register` → inscription + logo fonctionne
- [ ] `http://37.60.240.199:3001/dashboard` → dashboard entreprise avec logo
- [ ] `http://37.60.240.199:3001/admin` → portail admin accessible
- [ ] Compte admin créé via `node scripts/seed-admin.js`
- [ ] Connexion admin testée
- [ ] Expert créé depuis `/admin/experts`
- [ ] `http://37.60.240.199:3001/expert/login` → connexion expert testée

### 📱 Application Mobile

- [ ] URL API mise à jour → `http://37.60.240.199:3001`
- [ ] Icônes générées depuis `generate-icons.html`
- [ ] `app.json` — bundleIdentifier et package remplis
- [ ] `eas build` Android réussi
- [ ] `eas build` iOS réussi
- [ ] Connexion testée rôle `user` (client)
- [ ] Connexion testée rôle `expert`

---

## 13. Dépannage

| Symptôme | Cause probable | Solution |
|----------|----------------|----------|
| `502 Bad Gateway` | PM2 arrêté ou planté | `pm2 restart carbontrack` |
| Page blanche sur `:3001` | Build non effectué | `npm run build` puis `pm2 reload carbontrack` |
| `ECONNREFUSED :5432` | PostgreSQL arrêté ou mauvais mot de passe | `systemctl start postgresql` + vérifier `.env.production` |
| `JWT invalid / expired` | JWT_SECRET non chargé dans PM2 | Vérifier `ecosystem.config.js` + `pm2 reload carbontrack` |
| `Permission denied uploads` | Dossier `uploads/` absent ou droits manquants | `mkdir -p uploads && chmod 755 uploads` |
| `Connection refused :3001` | Port fermé par pare-feu | `ufw allow 3001/tcp && ufw reload` |
| `nginx: bind() failed` | Port déjà utilisé par une autre app | Changer `listen 3001` → `listen 3002` dans `carbontrack.conf` |
| `Build out of memory` | RAM insuffisante | `export NODE_OPTIONS=--max-old-space-size=2048` |
| `Cannot find module` après update | `node_modules` désynchronisé | `rm -rf node_modules && npm install` |
| Pas de logo affiché | Dossier `public/logos/` manquant | `mkdir -p /var/www/carbontrack/public/logos` |

### Commandes de diagnostic rapide

```bash
# État général
pm2 status
systemctl status nginx
systemctl status postgresql

# Logs en temps réel
pm2 logs carbontrack --lines 50

# Logs Nginx
tail -f /var/log/nginx/carbontrack_error.log

# Tester la connexion DB
psql -U carbontrack_user -d carbontrack -h localhost -c "SELECT NOW();"

# Vérifier les ports utilisés
ss -tlnp | grep -E "3001|5432|80"
```

---

*CarbonTrack — Guide de Déploiement VPS · v2.0 · 2026*
*Problème ? Commencer par : `pm2 logs carbontrack --lines 100`*
