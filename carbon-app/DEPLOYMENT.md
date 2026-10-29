# CarbonTrack — Deployment Guide

End-to-end playbook for deploying the **CarbonTrack** platform to a shared multi-app server, with **Jenkins CI/CD** triggered by **GitHub webhooks**.

- **Server**: `37.60.240.199` (shared with other apps — port management matters)
- **Jenkins**: `http://37.60.240.199:8081/jenkins`
- **GitHub repo**: `https://github.com/MoctarSidibe/carbontrack` (monorepo, 3 branches)

| Branch | Project | Deploys to |
|---|---|---|
| `main` | Next.js web app (`carbon-app/`) | `/var/www/carbontrack/` — Node + PM2 + nginx reverse-proxy |
| `gl` | GreenLeaves static landing (`gl/`) | `/var/www/greenleaves/` — nginx static |
| `mobile` | Expo React Native (`mobile/`) | **Not web-deployed.** Built via EAS for App Store / Play Store |

---

## Table of contents

1. [Phase 0 — Discovery](#phase-0--discovery)
2. [Phase 1 — Server prerequisites](#phase-1--server-prerequisites)
3. [Phase 2 — Folder layout & system user](#phase-2--folder-layout--system-user)
4. [Phase 3 — PostgreSQL setup](#phase-3--postgresql-setup)
5. [Phase 4 — Deploy carbon-app (Next.js)](#phase-4--deploy-carbon-app-nextjs)
6. [Phase 5 — Deploy gl (static)](#phase-5--deploy-gl-static)
7. [Phase 6 — nginx vhosts](#phase-6--nginx-vhosts)
8. [Phase 7 — Jenkins CI/CD](#phase-7--jenkins-cicd)
9. [Phase 8 — GitHub webhooks](#phase-8--github-webhooks)
10. [Phase 9 — Verification & smoke tests](#phase-9--verification--smoke-tests)
11. [Operations — rollback, logs, troubleshooting](#operations)

---

## Phase 0 — Discovery

Before touching anything, capture the current state of the server (used ports, installed tools, other PM2 apps).

On your laptop:
```bash
scp carbon-app/deploy/discovery.sh user@37.60.240.199:/tmp/discovery.sh
```

On the server:
```bash
bash /tmp/discovery.sh > /tmp/carbontrack-discovery.txt 2>&1
cat /tmp/carbontrack-discovery.txt
```

**What to look for in the output:**

- **Free ports** (which 3xxx / 4xxx ports are NOT in the "Listening TCP ports" list)
- **Existing PM2 processes** (to know naming conflicts)
- **Existing `/var/www/*` folders** (so we don't trample anyone)
- **Node version** — we need **Node 20 LTS or newer** for Next.js 14
- **nginx installed?** sites-available vs conf.d structure
- **PostgreSQL installed?** version + existing databases
- **Jenkins running?** (we know it is — at :8081)

> **Default port reservations in this guide** (adjust if any of these are busy):
> - **3000** → carbon-app Next.js process (internal, behind nginx)
> - **5432** → PostgreSQL (default)
>
> The `gl` static site needs **no port** — nginx serves the files directly.

---

## Phase 1 — Server prerequisites

Install only what is missing (the discovery output tells you what you have). Replace `apt` with your distro's package manager if needed.

### Node.js 20 LTS

```bash
# If 'node --version' shows < 20, install via NodeSource:
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs
node --version    # should report v20.x.x
npm --version
```

### PM2 (process manager)

```bash
sudo npm install -g pm2
pm2 --version
# Generate a systemd unit so PM2 restarts apps on reboot:
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u $USER --hp $HOME
# Copy the command PM2 prints, then run it as sudo.
```

### PostgreSQL 14+

```bash
# Only if not already installed:
sudo apt-get install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
psql --version
```

### nginx

```bash
# Likely already there since you have other apps. If not:
sudo apt-get install -y nginx
sudo systemctl enable --now nginx
nginx -v
```

### Git, build essentials

```bash
sudo apt-get install -y git build-essential rsync curl jq
```

---

## Phase 2 — Folder layout & system user

Create a **dedicated, unprivileged system user** that owns the app folders. Jenkins will write here; PM2 runs as this user.

```bash
# Create the user (no shell login required, but home dir helps for PM2 state)
sudo useradd --system --create-home --shell /bin/bash deployer

# Create the app folders
sudo mkdir -p /var/www/carbontrack /var/www/greenleaves
sudo chown -R deployer:deployer /var/www/carbontrack /var/www/greenleaves

# Add Jenkins user to the deployer group so Jenkins can write atomically
sudo usermod -aG deployer jenkins

# Permissions (775 so group members can write)
sudo chmod -R 2775 /var/www/carbontrack /var/www/greenleaves
```

> The `2` in `2775` is the SETGID bit — new files created inside inherit the group, so Jenkins-created files stay readable by the deployer/PM2.

Final layout:

```
/var/www/
├── carbontrack/                 # Next.js app — DEPLOY TARGET for 'main' branch
│   ├── current/  → symlink → releases/2026-05-17-1430/
│   ├── releases/
│   │   ├── 2026-05-17-1430/    # one folder per deploy
│   │   └── 2026-05-17-1115/
│   ├── shared/
│   │   ├── .env.local           # production secrets (never overwritten)
│   │   └── uploads/             # persistent uploads (symlinked into each release)
│   └── ecosystem.config.js
│
└── greenleaves/                 # gl static — DEPLOY TARGET for 'gl' branch
    └── public/                  # nginx serves from here
```

Atomic-symlink deploys mean a failed deploy never breaks the live site — we keep the old `current` symlink until the new release validates.

---

## Phase 3 — PostgreSQL setup

```bash
# Create database + user
sudo -u postgres psql <<'EOF'
CREATE USER carbontrack WITH PASSWORD 'REPLACE_WITH_STRONG_PASSWORD';
CREATE DATABASE carbontrack_prod OWNER carbontrack;
GRANT ALL PRIVILEGES ON DATABASE carbontrack_prod TO carbontrack;
\c carbontrack_prod
GRANT ALL ON SCHEMA public TO carbontrack;
EOF
```

Test the connection:

```bash
PGPASSWORD='REPLACE_WITH_STRONG_PASSWORD' psql -h 127.0.0.1 -U carbontrack -d carbontrack_prod -c '\dt'
```

Run the migrations (after first deploy — see Phase 4):

```bash
cd /var/www/carbontrack/current
for sql in scripts/migrate-*.sql; do
  PGPASSWORD='...' psql -h 127.0.0.1 -U carbontrack -d carbontrack_prod -f "$sql"
done
node scripts/seed-admin.js   # creates the default admin user
```

---

## Phase 4 — Deploy carbon-app (Next.js)

### One-time bootstrap (manual first deploy)

```bash
sudo -u deployer -i
cd /var/www/carbontrack

# First-time clone into a release folder
mkdir -p releases shared
git clone --branch main --depth 1 https://github.com/MoctarSidibe/carbontrack.git releases/initial
cd releases/initial

# Production install + build
npm ci --omit=dev=false
npm run build

# Create the production env file in shared/ (lives outside releases — never overwritten)
nano /var/www/carbontrack/shared/.env.local
```

`/var/www/carbontrack/shared/.env.local` template:

```env
NODE_ENV=production
PORT=3000

# PostgreSQL
DATABASE_URL=postgresql://carbontrack:REPLACE_WITH_STRONG_PASSWORD@127.0.0.1:5432/carbontrack_prod

# JWT
JWT_SECRET=GENERATE_A_64_CHAR_RANDOM_HEX_HERE_run_openssl_rand_hex_32

# SMTP (Gmail with App Password, or your provider)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM="CarbonTrack <your-email@gmail.com>"

# Public app URL
NEXT_PUBLIC_APP_URL=http://37.60.240.199:3000

# Optional: Groq for RAG/AI assistant
GROQ_API_KEY=

# Plan price for subscription
PLAN_PRICE=250000
```

Link the env file into the release and launch with PM2:

```bash
ln -s /var/www/carbontrack/shared/.env.local /var/www/carbontrack/releases/initial/.env.local
ln -s /var/www/carbontrack/releases/initial /var/www/carbontrack/current

cp /var/www/carbontrack/current/ecosystem.config.js /var/www/carbontrack/
pm2 start /var/www/carbontrack/ecosystem.config.js --env production
pm2 save                # persist for reboot
pm2 status
```

Verify the app is responding internally:

```bash
curl -I http://127.0.0.1:3000/
# Expect: HTTP/1.1 200 OK (or 307 redirect to /login)
```

### Subsequent deploys (Jenkins does this automatically — see Phase 7)

Each deploy:
1. Clone latest `main` into `releases/<timestamp>/`
2. `npm ci && npm run build`
3. Link `shared/.env.local` into the new release
4. Move the `current` symlink to point at the new release
5. `pm2 reload carbontrack` (zero-downtime)
6. Keep the **last 5 releases** for rollback; delete older ones

---

## Phase 5 — Deploy gl (static)

Static site — no Node process, no PM2. Just rsync into `/var/www/greenleaves/public/`.

```bash
sudo -u deployer -i
cd /var/www/greenleaves
git clone --branch gl --depth 1 https://github.com/MoctarSidibe/carbontrack.git public
```

Verify:

```bash
ls /var/www/greenleaves/public/
# Should list: index.html, styles.css, *.png, *.jpg, etc.
```

Subsequent deploys = simple `git pull` inside `/var/www/greenleaves/public/`, or rsync from Jenkins workspace.

---

## Phase 6 — nginx vhosts

**Decision: hostname-based routing.** Until DNS for `carbontrack.greenleaves.ga` and `greenleaves.ga` is configured, you can:

- Use IP+port directly: `http://37.60.240.199:3000` (carbon-app), `http://37.60.240.199:8090` (gl)
- Or set `Host:` header manually for testing
- Or add `127.0.0.1 carbontrack.greenleaves.ga` to `/etc/hosts` on test machines

Once DNS resolves to `37.60.240.199`, the vhosts below take over automatically.

### `/etc/nginx/sites-available/carbontrack`

```nginx
# Next.js app — reverse-proxy to PM2 process on :3000
server {
    listen 80;
    server_name carbontrack.greenleaves.ga 37.60.240.199;

    # Cap upload size to match the PDF generation needs
    client_max_body_size 25M;

    # Gzip text responses
    gzip on;
    gzip_types text/plain text/css application/json application/javascript application/xml image/svg+xml;

    # Next.js asset cache — long TTL since hashed filenames
    location /_next/static/ {
        proxy_pass http://127.0.0.1:3000;
        proxy_cache_valid 200 1y;
        add_header Cache-Control "public, max-age=31536000, immutable";
    }

    # Everything else
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    access_log /var/log/nginx/carbontrack.access.log;
    error_log  /var/log/nginx/carbontrack.error.log;
}
```

### `/etc/nginx/sites-available/greenleaves`

```nginx
# Static landing — serve files directly
server {
    listen 80;
    server_name greenleaves.ga www.greenleaves.ga;

    root /var/www/greenleaves/public;
    index index.html;

    gzip on;
    gzip_types text/css text/javascript application/javascript image/svg+xml;

    location / {
        try_files $uri $uri/ =404;
    }

    # Long-cache images (no hash in filename, so use moderate TTL)
    location ~* \.(jpg|jpeg|png|webp|svg|gif|ico)$ {
        expires 30d;
        add_header Cache-Control "public, max-age=2592000";
    }

    access_log /var/log/nginx/greenleaves.access.log;
    error_log  /var/log/nginx/greenleaves.error.log;
}
```

Enable & reload:

```bash
sudo ln -sf /etc/nginx/sites-available/carbontrack /etc/nginx/sites-enabled/carbontrack
sudo ln -sf /etc/nginx/sites-available/greenleaves /etc/nginx/sites-enabled/greenleaves
sudo nginx -t                      # validate config
sudo systemctl reload nginx
```

### HTTPS (when DNS is ready)

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d carbontrack.greenleaves.ga -d greenleaves.ga -d www.greenleaves.ga
# Certbot edits the vhost files in-place to add the SSL block + redirect from :80 to :443.
# Certificates auto-renew via systemd timer.
```

---

## Phase 7 — Jenkins CI/CD

### Prerequisites in Jenkins UI

1. **Install plugins** (Manage Jenkins → Plugins):
   - `Git`, `Pipeline`, `GitHub`, `GitHub Branch Source`, `SSH Agent`, `Credentials Binding`, `Pipeline: GitHub`
2. **Add a GitHub credential** (Manage Jenkins → Credentials → Global):
   - Kind: **Username with password** (token works as the password)
   - Username: your GitHub username
   - Password: a [GitHub Personal Access Token](https://github.com/settings/tokens) with `repo` + `admin:repo_hook` scopes
   - ID: `github-token`
3. **Add an SSH key for the deployer user** (optional but useful):
   - Kind: **SSH Username with private key**
   - ID: `deployer-ssh`
4. **Add a webhook secret**:
   - Kind: **Secret text**
   - Secret: a long random string (used to validate GitHub webhooks)
   - ID: `github-webhook-secret`

### Jenkins job — carbon-app (main branch)

**Manage Jenkins → New Item → Multibranch Pipeline → `carbontrack-app`**

- **Branch sources**: GitHub
  - Credentials: `github-token`
  - Repo URL: `https://github.com/MoctarSidibe/carbontrack`
  - Branches to build: only `main`
- **Build configuration**: by Jenkinsfile (default path: `Jenkinsfile`)
- **Scan triggers**: GitHub webhook (set in Phase 8)

The pipeline definition lives in `carbon-app/Jenkinsfile` (committed in this repo). It:
1. Checks out `main`
2. Runs `npm ci`
3. Runs `npm run build` (Next.js production build)
4. SSHes / sudo-rsyncs build artifacts into `/var/www/carbontrack/releases/<BUILD_NUMBER>/`
5. Symlinks shared/.env.local + uploads
6. Moves `current` symlink → new release
7. `pm2 reload carbontrack --update-env`
8. Smoke-tests `http://127.0.0.1:3000/`
9. Cleans up releases older than the last 5

### Jenkins job — gl static (gl branch)

**New Item → Multibranch Pipeline → `greenleaves-landing`**

- Same source repo, but **branch filter** = `gl`
- Jenkinsfile path: `Jenkinsfile` (committed on the `gl` branch — see `gl/Jenkinsfile`)
- Pipeline rsyncs files into `/var/www/greenleaves/public/` and nginx serves them — no restart needed.

---

## Phase 8 — GitHub webhooks

Tell GitHub to ping Jenkins on every push so Jenkins rebuilds automatically.

For each branch you want auto-deployed:

1. Go to **GitHub → repo → Settings → Webhooks → Add webhook**
2. **Payload URL**: `http://37.60.240.199:8081/jenkins/github-webhook/`
3. **Content type**: `application/json`
4. **Secret**: the same string you stored as `github-webhook-secret` in Jenkins
5. **Which events?**: "Just the push event"
6. **Active**: ✓

GitHub will fire a POST to that URL on every push. Jenkins receives it, checks the branch filter on the multibranch pipeline, and triggers the matching job.

**Important:** the server's port 8081 must be open from GitHub's IPs (or open generally). Check:

```bash
sudo ufw status | grep 8081
# If not listed:
sudo ufw allow 8081/tcp
```

GitHub's webhook source IP ranges are published at `https://api.github.com/meta` under the `hooks` key. If your firewall is strict, allowlist those.

### Verify the webhook
- After pushing a commit, go to GitHub → Settings → Webhooks → click the webhook → scroll to **Recent Deliveries** → you should see a green ✓ with a `200` response.
- In Jenkins, the corresponding multibranch job should show a new build kicking off within ~10 seconds.

---

## Phase 9 — Verification & smoke tests

After Jenkins deploys, validate end-to-end.

### carbon-app

```bash
# Internal — direct hit on the Next.js process
curl -sI http://127.0.0.1:3000/ | head -1
# Expect: HTTP/1.1 200 OK or 307

# Through nginx
curl -sI http://37.60.240.199/ -H 'Host: carbontrack.greenleaves.ga' | head -1
# Expect: HTTP/1.1 200 OK or 307

# Database connectivity from the app — register a test account
curl -X POST http://127.0.0.1:3000/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"smoke@example.com","password":"Test1234!","firstName":"Smoke","lastName":"Test","phone":"+241000","companyName":"SmokeCo"}'
# Expect: 200 with a token in the response
```

### gl

```bash
curl -sI http://37.60.240.199/ -H 'Host: greenleaves.ga' | head -1
# Expect: HTTP/1.1 200 OK

curl -s http://37.60.240.199/styles.css -H 'Host: greenleaves.ga' | head -5
# Expect: CSS content (starts with /* ===... */)
```

### PM2

```bash
sudo -u deployer pm2 ls
# Expect: 'carbontrack' status=online, uptime growing, restarts=0 (or low)

sudo -u deployer pm2 logs carbontrack --lines 50
# Expect: " ready started server on 0.0.0.0:3000" — no error stack traces
```

---

## Operations

### Rollback (carbon-app)

```bash
sudo -u deployer -i
cd /var/www/carbontrack
ls -lt releases/                         # find the previous release timestamp
ln -sfn releases/<PREVIOUS_TIMESTAMP> current
pm2 reload carbontrack --update-env
curl -sI http://127.0.0.1:3000/ | head -1
```

Rollback should complete in under 5 seconds (just a symlink swap + reload).

### Logs

| What | Where |
|---|---|
| carbon-app stdout/stderr | `pm2 logs carbontrack` |
| nginx access (carbontrack) | `/var/log/nginx/carbontrack.access.log` |
| nginx errors (carbontrack) | `/var/log/nginx/carbontrack.error.log` |
| nginx access (gl) | `/var/log/nginx/greenleaves.access.log` |
| PostgreSQL | `/var/log/postgresql/postgresql-*.log` |
| Jenkins job output | `http://37.60.240.199:8081/jenkins/job/carbontrack-app/<#>/console` |

### Common issues

| Symptom | Likely cause | Fix |
|---|---|---|
| `502 Bad Gateway` from nginx | Next.js process not running on :3000 | `pm2 logs carbontrack`, then `pm2 restart carbontrack` |
| `EADDRINUSE: :::3000` | Another process owns 3000 | Re-run discovery, pick another port, update `ecosystem.config.js` + nginx vhost |
| Jenkins build hangs on `npm ci` | Locked package-lock or out-of-memory | On server: `npm cache clean --force`; bump Node heap via `NODE_OPTIONS=--max-old-space-size=4096` in Jenkinsfile |
| GitHub webhook returns 403 | Wrong secret in Jenkins or webhook | Re-copy the secret string identically into both places |
| `pm2 reload` doesn't pick up new env | PM2 caches env vars per-process | `pm2 delete carbontrack && pm2 start ecosystem.config.js --env production` |
| `pg: connection refused` | PostgreSQL not listening on 127.0.0.1 | Edit `/etc/postgresql/*/main/pg_hba.conf` + `postgresql.conf`, allow local connections, `systemctl restart postgresql` |

### Cleanup old releases

The Jenkinsfile prunes releases automatically. To do it manually:

```bash
cd /var/www/carbontrack/releases
ls -tr | head -n -5 | xargs -r rm -rf
```

---

## Appendix — Files in this repo that this guide references

| Path | What it does |
|---|---|
| `carbon-app/deploy/discovery.sh` | Read-only server inventory script |
| `carbon-app/deploy/nginx-carbontrack.conf` | Production nginx vhost (copy to `/etc/nginx/sites-available/`) |
| `carbon-app/ecosystem.config.js` | PM2 process config (copied to `/var/www/carbontrack/`) |
| `carbon-app/Jenkinsfile` | Jenkins pipeline for the Next.js app (`main` branch) |
| `gl/Jenkinsfile` | Jenkins pipeline for the static landing (`gl` branch) |
| `gl/deploy/nginx-greenleaves.conf` | nginx vhost for the static site |

---

## Quick-start TL;DR

If you've done all this once and just want to bring up a fresh server:

```bash
# 1) Discovery
bash carbon-app/deploy/discovery.sh > inventory.txt && less inventory.txt

# 2) Prereqs (Node 20 + PM2 + nginx + Postgres + git)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash - && sudo apt install -y nodejs nginx postgresql git
sudo npm install -g pm2 && pm2 startup systemd

# 3) Folders + deployer user
sudo useradd --system --create-home --shell /bin/bash deployer
sudo mkdir -p /var/www/{carbontrack,greenleaves}
sudo chown -R deployer:deployer /var/www/{carbontrack,greenleaves}
sudo usermod -aG deployer jenkins

# 4) DB
sudo -u postgres psql -c "CREATE USER carbontrack WITH PASSWORD '...';"
sudo -u postgres psql -c "CREATE DATABASE carbontrack_prod OWNER carbontrack;"

# 5) Bootstrap both apps (see Phase 4 + 5)

# 6) Wire nginx + Jenkins job + GitHub webhook (Phase 6, 7, 8)

# 7) Push to GitHub → Jenkins auto-deploys
```

---

**Maintained by**: GreenLeaves SARL
**Last updated**: 2026-05-17
