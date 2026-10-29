# CarbonTrack — Carbon Project Aggregator
## Full Technical & Product Architecture

> **Context:** CarbonTrack currently calculates carbon footprints (Scope 1/2/3) and provides dashboards.  
> **Goal:** Evolve into a "Carbon Project Aggregator" — a pre-certification + orchestration layer for NGOs, forestry/conservation projects, aligned with Verra VCS and Gold Standard.  
> **Stack:** Next.js 14 (App Router) · Node.js · PostgreSQL · PDF generation · No Verra/GS public API (document-based flow)

---

## SECTION 1 — SYSTEM ARCHITECTURE

### 1.1 Architecture Pattern: Modular Monolith (Recommended)

> **Why not microservices?** At this stage, a modular monolith gives you the speed of a monolith with the structure of microservices. Each module is independently evolvable without the ops overhead of Kubernetes/service mesh.

```
┌─────────────────────────────────────────────────────────────────┐
│                        CARBONTRACK PLATFORM                      │
│                                                                   │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────────────┐ │
│  │   COMPANY    │  │    NGO /    │  │        ADMIN /          │ │
│  │  DASHBOARD   │  │  PROJECT    │  │       EXPERT /          │ │
│  │  (existing)  │  │   PORTAL    │  │      VERIFIER           │ │
│  └──────┬───────┘  └──────┬──────┘  └──────────┬─────────────┘ │
│         │                 │                      │               │
│  ═══════════════════════════════════════════════════════════════ │
│                      NEXT.JS API LAYER                           │
│  ═══════════════════════════════════════════════════════════════ │
│         │                 │                      │               │
│  ┌──────▼─────────────────▼──────────────────────▼───────────┐  │
│  │                    CORE MODULES                            │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │   PROJECT    │  │     MRV      │  │ CERTIFICATION│    │  │
│  │  │   ENGINE     │  │   ENGINE     │  │   ENGINE     │    │  │
│  │  │              │  │              │  │              │    │  │
│  │  │ - Onboarding │  │ - Baseline   │  │ - PDD Gen    │    │  │
│  │  │ - Geospatial │  │ - Monitoring │  │ - Doc Gen    │    │  │
│  │  │ - Methodology│  │ - Avoided    │  │ - Status     │    │  │
│  │  │   matching   │  │   emissions  │  │   tracking   │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  │                                                            │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │  │
│  │  │  DOCUMENT    │  │ VERIFICATION │  │   CREDIT     │    │  │
│  │  │   ENGINE     │  │   WORKFLOW   │  │  REGISTRY    │    │  │
│  │  │              │  │              │  │              │    │  │
│  │  │ - Templates  │  │ - Verifier   │  │ - Issuance   │    │  │
│  │  │ - PDF Gen    │  │   assignment │  │ - Transfer   │    │  │
│  │  │ - Versioning │  │ - Audit log  │  │ - Retirement │    │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │  │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌───────────────────────────▼──────────────────────────────┐   │
│  │                      POSTGRESQL DATABASE                   │   │
│  │   companies · projects · methodologies · mrv_records ·    │   │
│  │   audits · carbon_credits · documents · transactions      │   │
│  └────────────────────────────────────────────────────────────┘  │
│                              │                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    EXTERNAL INTEGRATIONS                  │    │
│  │   Puro.earth API  ·  OGEC/CNC (manual)  ·  Verra (doc)  │    │
│  │   Gold Standard (doc)  ·  Satellite (future)  ·  Email   │    │
│  └──────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Data Flow

```
NGO submits project
       │
       ▼
Project Engine validates + assigns methodology
       │
       ▼
MRV Engine calculates baseline + project emissions
       │
       ▼
Document Engine generates PDD + Monitoring Plan (PDF)
       │
       ▼
Admin reviews + assigns Verifier (Bureau Veritas / SGS / TÜV)
       │
       ▼
Verifier Portal: receives docs, submits audit report
       │
       ▼
Certification Engine: tracks status, stores registry IDs
       │
       ▼
Credit Registry: issues + tracks VCUs/VERs
       │
       ▼
(Future) Marketplace: list, sell, retire credits
```

### 1.3 Tech Stack

| Layer | Technology | Reason |
|-------|-----------|--------|
| Frontend | Next.js 14 (App Router) | Already in use |
| Backend API | Next.js API Routes (Node.js) | Already in use |
| Database | PostgreSQL | Already in use |
| PDF Generation | `puppeteer` or `@react-pdf/renderer` | Best for complex formatted PDFs |
| Geospatial | PostGIS extension on PostgreSQL | Polygon/GPS storage for land projects |
| File Storage | S3-compatible (Supabase Storage / Cloudflare R2) | Documents, reports, satellite images |
| Email | Resend or Nodemailer | Notifications to verifiers/admins |
| Background Jobs | `node-cron` or `pg-boss` (Postgres-native) | Scheduled MRV reminders, report generation |
| Auth | JWT (already in use) | Keep current system |

---

## SECTION 2 — DATABASE DESIGN

### 2.1 Full Schema

```sql
-- ═══════════════════════════════════════════════
-- CORE ENTITIES
-- ═══════════════════════════════════════════════

-- Already exists — extended fields shown
CREATE TABLE companies (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,
  sector            VARCHAR(100),
  country           VARCHAR(100),
  siret             VARCHAR(50),
  -- NEW FIELDS
  is_project_developer  BOOLEAN DEFAULT FALSE,  -- Can create carbon projects
  is_buyer              BOOLEAN DEFAULT TRUE,   -- Can buy credits
  verified_at           TIMESTAMPTZ,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- Already exists — extended
CREATE TABLE partners (
  id                    SERIAL PRIMARY KEY,
  name                  VARCHAR(255) NOT NULL,
  type                  VARCHAR(50),   -- ONG, Association, Cooperative
  country               VARCHAR(100),
  mission               TEXT,
  website               VARCHAR(255),
  contact_email         VARCHAR(255),
  logo_url              TEXT,
  wallet_balance        DECIMAL(14,2) DEFAULT 0,
  -- Puro.earth
  puro_api_key          TEXT,
  puro_api_secret       TEXT,
  puro_account_number   VARCHAR(100),
  puro_facility_code    VARCHAR(100),
  puro_connected        BOOLEAN DEFAULT FALSE,
  -- NEW FIELDS
  accreditation_number  VARCHAR(100),  -- National accreditation
  accredited_at         TIMESTAMPTZ,
  total_projects        INTEGER DEFAULT 0,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- METHODOLOGIES
-- ═══════════════════════════════════════════════

CREATE TABLE methodologies (
  id              SERIAL PRIMARY KEY,
  standard        VARCHAR(50) NOT NULL,   -- 'verra_vcs' | 'gold_standard' | 'ogec_national' | 'plan_vivo'
  code            VARCHAR(50) NOT NULL,   -- 'VM0007', 'VM0048', 'GS-RE-001', 'AMS-II.G'
  name            VARCHAR(255) NOT NULL,
  version         VARCHAR(20),
  project_type    VARCHAR(100),           -- 'redd_plus' | 'arr' | 'renewable_energy' | 'cookstoves' | 'waste'
  sector_scope    VARCHAR(50),            -- '14' (AFOLU), '1' (Energy supply), '13' (Waste)
  description     TEXT,
  applicability   TEXT,                   -- When to use this methodology
  baseline_approach TEXT,                 -- How baseline is calculated
  additionality_test TEXT,               -- Additionality requirements
  monitoring_params JSONB,               -- Parameters to monitor (key metrics)
  document_url    TEXT,                   -- Link to official methodology PDF
  active          BOOLEAN DEFAULT TRUE,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Example data:
-- ('verra_vcs', 'VM0048', 'REDD+ Methodology Framework', '1.0', 'redd_plus', '14', ...)
-- ('verra_vcs', 'VM0047', 'Afforestation, Reforestation, Revegetation', '1.0', 'arr', '14', ...)
-- ('gold_standard', 'GS-RE-001', 'Grid-Connected Renewable Energy', '3.0', 'renewable_energy', '1', ...)
-- ('gold_standard', 'AMS-II.G', 'Efficient Lighting and Appliances', '10.0', 'efficiency', '3', ...)
-- ('ogec_national', 'OGEC-GES-001', 'Diagnostic GES National Gabon', '1.0', 'compliance', NULL, ...)

-- ═══════════════════════════════════════════════
-- PROJECTS
-- ═══════════════════════════════════════════════

CREATE TABLE carbon_projects (
  id                    SERIAL PRIMARY KEY,
  partner_id            INTEGER REFERENCES partners(id),
  company_id            INTEGER REFERENCES companies(id),  -- If company-owned project
  methodology_id        INTEGER REFERENCES methodologies(id),

  -- Identity
  title                 VARCHAR(255) NOT NULL,
  slug                  VARCHAR(255) UNIQUE,
  description           TEXT,
  project_type          VARCHAR(100),  -- 'redd_plus' | 'arr' | 'renewable_energy' | 'cookstoves' | 'waste' | 'agri'
  status                VARCHAR(30) DEFAULT 'draft',
  -- draft | active | under_validation | registered | suspended | completed

  -- Location
  country               VARCHAR(100),
  region                VARCHAR(100),
  location_name         VARCHAR(255),
  latitude              DECIMAL(10,7),
  longitude             DECIMAL(10,7),
  geojson               JSONB,   -- Polygon boundary (PostGIS-ready)

  -- Certification targets
  target_standard       VARCHAR(50),   -- 'verra_vcs' | 'gold_standard' | 'ogec_national'
  verra_project_id      VARCHAR(100),  -- Assigned by Verra after registration
  gs_project_id         VARCHAR(100),  -- Assigned by Gold Standard
  ogec_reference        VARCHAR(100),  -- Assigned by OGEC Gabon

  -- Timeline
  start_date            DATE,
  end_date              DATE,
  crediting_period_years INTEGER DEFAULT 30,  -- Verra: 30yr renewable / GS: 5yr renewable

  -- Impact metrics
  trees_planted         INTEGER DEFAULT 0,
  hectares_managed      DECIMAL(12,2) DEFAULT 0,
  co2_removed_actual    DECIMAL(14,4) DEFAULT 0,
  beneficiaries_count   INTEGER DEFAULT 0,
  jobs_created          INTEGER DEFAULT 0,

  -- Financial
  price_per_ton         DECIMAL(10,2),
  tons_available        DECIMAL(14,4) DEFAULT 0,
  tons_sold             DECIMAL(14,4) DEFAULT 0,
  total_budget_fcfa     BIGINT DEFAULT 0,
  funds_received_fcfa   BIGINT DEFAULT 0,

  -- SDG mapping (Gold Standard requirement)
  sdg_targets           INTEGER[],  -- [13, 15, 7, 1] → SDG numbers

  created_at            TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- MRV ENGINE TABLES
-- ═══════════════════════════════════════════════

CREATE TABLE baseline_scenarios (
  id                    SERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES carbon_projects(id),
  methodology_id        INTEGER REFERENCES methodologies(id),

  -- Baseline period
  reference_year_start  INTEGER NOT NULL,  -- e.g. 2015
  reference_year_end    INTEGER NOT NULL,  -- e.g. 2020

  -- Calculated values (tCO₂e/year)
  baseline_emissions    DECIMAL(14,4),     -- Business as usual scenario
  baseline_methodology  TEXT,              -- Description of how baseline was set
  baseline_data_sources TEXT[],            -- Sources used (satellite, field, national stats)

  -- Leakage
  leakage_belt_defined  BOOLEAN DEFAULT FALSE,
  leakage_estimate      DECIMAL(14,4) DEFAULT 0,  -- tCO₂e/year displaced

  -- Additionality
  additionality_test_passed    BOOLEAN,
  additionality_barriers       TEXT,   -- Financial / technological / regulatory barriers
  additionality_common_practice TEXT,  -- Is the project common in the region?

  -- Approval
  approved_by_expert    BOOLEAN DEFAULT FALSE,
  expert_user_id        INTEGER REFERENCES users(id),
  approved_at           TIMESTAMPTZ,
  notes                 TEXT,

  version               INTEGER DEFAULT 1,
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE monitoring_periods (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES carbon_projects(id),
  period_start      DATE NOT NULL,
  period_end        DATE NOT NULL,
  period_label      VARCHAR(50),   -- 'T1 2024', 'Année 1', 'Q1-Q2 2025'
  status            VARCHAR(20) DEFAULT 'open',
  -- open | submitted | under_verification | verified | rejected
  submitted_at      TIMESTAMPTZ,
  verified_at       TIMESTAMPTZ,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE emission_records (
  id                    SERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES carbon_projects(id),
  monitoring_period_id  INTEGER REFERENCES monitoring_periods(id),

  -- Record type
  record_type           VARCHAR(30) NOT NULL,
  -- 'project_emissions' | 'baseline_emissions' | 'leakage' | 'avoided_emissions'

  -- Source
  source_category       VARCHAR(100),  -- 'deforestation_avoided' | 'biomass_growth' | 'energy_generated' | 'soil_carbon'
  source_description    TEXT,

  -- Values
  quantity              DECIMAL(14,4),  -- Activity quantity (ha, MWh, liters, etc.)
  unit                  VARCHAR(30),    -- 'ha', 'MWh', 'tonne', 'litre'
  emission_factor       DECIMAL(14,6),  -- tCO₂e per unit
  emission_factor_source VARCHAR(255),  -- IPCC, national grid, measured
  co2eq_value           DECIMAL(14,4),  -- Final tCO₂e value

  -- Data quality
  data_source           VARCHAR(255),   -- 'measured' | 'estimated' | 'satellite' | 'national_stats'
  uncertainty_percent   DECIMAL(5,2),
  notes                 TEXT,

  recorded_by           INTEGER REFERENCES users(id),
  recorded_at           TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE mrv_summaries (
  id                    SERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES carbon_projects(id),
  monitoring_period_id  INTEGER NOT NULL REFERENCES monitoring_periods(id),

  -- Summary (tCO₂e)
  baseline_emissions_total  DECIMAL(14,4),
  project_emissions_total   DECIMAL(14,4),
  leakage_total             DECIMAL(14,4),
  net_emission_reductions   DECIMAL(14,4),
  -- Formula: baseline - project - leakage = net_reductions

  -- Buffer (non-permanence risk)
  buffer_pool_contribution  DECIMAL(14,4) DEFAULT 0,  -- % set aside (Verra AFOLU)
  credits_eligible          DECIMAL(14,4),
  -- credits_eligible = net_reductions - buffer_pool_contribution

  calculated_at         TIMESTAMPTZ DEFAULT NOW(),
  calculation_version   INTEGER DEFAULT 1,
  calculation_notes     TEXT
);

-- ═══════════════════════════════════════════════
-- CERTIFICATION WORKFLOW
-- ═══════════════════════════════════════════════

CREATE TABLE certification_requests (
  id                    SERIAL PRIMARY KEY,
  project_id            INTEGER REFERENCES carbon_projects(id),
  company_id            INTEGER REFERENCES companies(id),
  assessment_id         INTEGER REFERENCES assessments(id),  -- For compliance certs

  -- Type
  certification_type    VARCHAR(50) DEFAULT 'national_ogec',
  -- 'national_ogec' | 'verra_vcs' | 'gold_standard' | 'plan_vivo'

  -- Status flow
  status                VARCHAR(40) DEFAULT 'pending',
  -- pending → assigned → audit_scheduled → audit_done →
  -- dossier_compiled → submitted_to_body → avis_issued → certified | rejected

  -- Assignment
  expert_user_id        INTEGER REFERENCES users(id),
  expert_name           VARCHAR(255),
  expert_email          VARCHAR(255),
  assigned_at           TIMESTAMPTZ,

  -- Audit
  inspection_date       TIMESTAMPTZ,
  inspection_location   TEXT,
  inspection_notes      TEXT,
  inspection_checklist  JSONB,   -- Structured audit checklist answers

  -- Submission to certifying body
  submitted_to_body_at  TIMESTAMPTZ,
  body_reference_number VARCHAR(100),   -- Reference given by OGEC/Verra/GS

  -- Official response
  avis_number           VARCHAR(100),   -- OGEC/CNC Avis reference
  avis_date             TIMESTAMPTZ,    -- Date of official Avis
  avis_pdf_url          TEXT,           -- Uploaded PDF of official Avis

  -- Certificate
  certificate_number    VARCHAR(100),
  certified_at          TIMESTAMPTZ,

  -- Rejection
  rejection_reason      TEXT,

  -- Admin
  company_message       TEXT,
  admin_notes           TEXT,

  requested_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- DOCUMENT MANAGEMENT
-- ═══════════════════════════════════════════════

CREATE TABLE project_documents (
  id                    SERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES carbon_projects(id),
  certification_id      INTEGER REFERENCES certification_requests(id),

  -- Document type
  doc_type              VARCHAR(50) NOT NULL,
  -- 'pdd' | 'monitoring_plan' | 'monitoring_report' | 'validation_report' |
  -- 'verification_report' | 'stakeholder_consultation' | 'sdg_impact' |
  -- 'additionality_assessment' | 'baseline_study' | 'audit_checklist' |
  -- 'ogec_submission_dossier' | 'avis_cnc' | 'certificate'

  title                 VARCHAR(255),
  version               INTEGER DEFAULT 1,
  is_auto_generated     BOOLEAN DEFAULT FALSE,  -- Generated by platform vs uploaded

  -- File
  file_url              TEXT,
  file_name             VARCHAR(255),
  file_size_bytes       BIGINT,
  mime_type             VARCHAR(100),

  -- Review
  status                VARCHAR(20) DEFAULT 'draft',
  -- draft | final | submitted | approved | rejected

  generated_by          INTEGER REFERENCES users(id),
  approved_by           INTEGER REFERENCES users(id),
  approved_at           TIMESTAMPTZ,

  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- THIRD-PARTY VERIFICATION
-- ═══════════════════════════════════════════════

CREATE TABLE verifiers (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(255) NOT NULL,  -- 'Bureau Veritas', 'SGS', 'TÜV SÜD', 'SustainCERT', 'DNV'
  type          VARCHAR(50),            -- 'VVB' | 'national_auditor'
  accredited_for TEXT[],               -- ['verra_vcs', 'gold_standard']
  contact_email VARCHAR(255),
  website       TEXT,
  regions       TEXT[],                -- ['africa', 'gabon', 'global']
  active        BOOLEAN DEFAULT TRUE
);

CREATE TABLE verification_assignments (
  id                    SERIAL PRIMARY KEY,
  certification_id      INTEGER NOT NULL REFERENCES certification_requests(id),
  verifier_id           INTEGER NOT NULL REFERENCES verifiers(id),

  -- Assignment
  assigned_at           TIMESTAMPTZ DEFAULT NOW(),
  documents_sent_at     TIMESTAMPTZ,
  audit_start_date      DATE,
  audit_end_date        DATE,

  -- Status
  status                VARCHAR(30) DEFAULT 'pending',
  -- pending | documents_sent | audit_in_progress | report_submitted | completed | cancelled

  -- Verifier output
  opinion               VARCHAR(20),   -- 'positive' | 'qualified_positive' | 'adverse' | 'disclaimed'
  report_url            TEXT,          -- Validation/Verification report PDF
  report_submitted_at   TIMESTAMPTZ,

  -- Corrective Action Requests (CARs) / Clarification Letters (CLs)
  cars_count            INTEGER DEFAULT 0,
  cls_count             INTEGER DEFAULT 0,
  cars_resolved         BOOLEAN DEFAULT FALSE,

  -- Version tracking
  report_version        INTEGER DEFAULT 1,
  notes                 TEXT
);

-- ═══════════════════════════════════════════════
-- CARBON CREDITS
-- ═══════════════════════════════════════════════

CREATE TABLE carbon_credits (
  id                    SERIAL PRIMARY KEY,
  project_id            INTEGER NOT NULL REFERENCES carbon_projects(id),
  certification_id      INTEGER REFERENCES certification_requests(id),
  monitoring_period_id  INTEGER REFERENCES monitoring_periods(id),

  -- Credit identity
  credit_type           VARCHAR(50),    -- 'VCU' | 'VER' | 'CORC' | 'URE_national'
  standard              VARCHAR(50),    -- 'verra_vcs' | 'gold_standard' | 'ogec_national' | 'puro_earth'
  vintage_year          INTEGER,        -- Year emissions were reduced
  serial_number_start   VARCHAR(100),   -- Registry serial number range start
  serial_number_end     VARCHAR(100),   -- Registry serial number range end

  -- Quantity
  quantity_issued       DECIMAL(14,4),  -- Total credits issued (tCO₂e)
  quantity_available    DECIMAL(14,4),  -- Credits not yet sold or retired
  quantity_sold         DECIMAL(14,4) DEFAULT 0,
  quantity_retired      DECIMAL(14,4) DEFAULT 0,
  quantity_buffer       DECIMAL(14,4) DEFAULT 0,  -- In buffer pool (Verra AFOLU)

  -- Registry tracking
  registry_name         VARCHAR(100),   -- 'Verra Registry', 'Gold Standard Impact Registry', 'Registre National GES'
  registry_project_id   VARCHAR(100),   -- ID on external registry
  registry_issuance_date DATE,

  -- Pricing
  price_per_credit_usd  DECIMAL(10,4),
  price_per_credit_fcfa DECIMAL(14,2),

  issued_at             TIMESTAMPTZ DEFAULT NOW(),
  expires_at            TIMESTAMPTZ
);

CREATE TABLE credit_transactions (
  id                    SERIAL PRIMARY KEY,
  credit_id             INTEGER NOT NULL REFERENCES carbon_credits(id),
  project_id            INTEGER NOT NULL REFERENCES carbon_projects(id),

  -- Parties
  seller_type           VARCHAR(20),   -- 'partner' | 'company' | 'platform'
  seller_id             INTEGER,
  buyer_company_id      INTEGER REFERENCES companies(id),

  -- Transaction
  transaction_type      VARCHAR(20) NOT NULL,  -- 'sale' | 'transfer' | 'retirement' | 'buffer_contribution'
  quantity              DECIMAL(14,4) NOT NULL,
  price_per_unit_fcfa   DECIMAL(14,2),
  total_amount_fcfa     DECIMAL(14,2),
  commission_amount     DECIMAL(14,2),
  partner_credited      DECIMAL(14,2),

  -- Retirement (if applicable)
  retirement_purpose    TEXT,          -- 'scope3_offset' | 'voluntary' | 'compliance'
  retirement_beneficiary TEXT,         -- Who claims the offset

  status                VARCHAR(20) DEFAULT 'completed',
  created_at            TIMESTAMPTZ DEFAULT NOW()
);

-- ═══════════════════════════════════════════════
-- MULTI-PROJECT AGGREGATION
-- ═══════════════════════════════════════════════

CREATE TABLE project_programs (
  id                SERIAL PRIMARY KEY,
  name              VARCHAR(255) NOT NULL,   -- 'Programme REDD+ Bassin du Congo'
  description       TEXT,
  program_type      VARCHAR(50),             -- 'poa' (Programme of Activities) | 'portfolio'
  standard          VARCHAR(50),
  coordinating_partner_id INTEGER REFERENCES partners(id),
  total_credits_issued    DECIMAL(14,4) DEFAULT 0,
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE program_projects (
  program_id    INTEGER REFERENCES project_programs(id),
  project_id    INTEGER REFERENCES carbon_projects(id),
  joined_at     TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (program_id, project_id)
);

CREATE TABLE revenue_sharing_rules (
  id                SERIAL PRIMARY KEY,
  program_id        INTEGER REFERENCES project_programs(id),
  project_id        INTEGER REFERENCES carbon_projects(id),  -- NULL = applies to whole program
  beneficiary_type  VARCHAR(30),  -- 'platform' | 'partner' | 'community' | 'buffer'
  beneficiary_id    INTEGER,
  percentage        DECIMAL(5,2) NOT NULL,  -- e.g. 15.00 for 15%
  description       TEXT
);

-- ═══════════════════════════════════════════════
-- AUDIT LOGS
-- ═══════════════════════════════════════════════

CREATE TABLE audit_logs (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER REFERENCES users(id),
  action        VARCHAR(100) NOT NULL,   -- 'project.created', 'credit.issued', 'document.approved'
  entity_type   VARCHAR(50),            -- 'project' | 'certification' | 'credit' | 'document'
  entity_id     INTEGER,
  old_value     JSONB,
  new_value     JSONB,
  ip_address    INET,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);
```

---

## SECTION 3 — API DESIGN

### 3.1 Project Onboarding

```
POST   /api/projects                    Create new project
GET    /api/projects                    List projects (filtered by role)
GET    /api/projects/:id                Get project details
PATCH  /api/projects/:id                Update project
DELETE /api/projects/:id                Delete (if no credits issued)

POST   /api/projects/:id/geospatial     Upload/update GeoJSON boundary
GET    /api/projects/:id/geospatial     Get boundary + area calculation

POST   /api/projects/:id/methodology    Assign methodology
GET    /api/methodologies               List all methodologies
GET    /api/methodologies/suggest       Suggest methodology by project type + country
       Query params: ?project_type=redd_plus&standard=verra_vcs&country=Gabon
```

### 3.2 MRV Engine

```
POST   /api/projects/:id/baseline        Create/update baseline scenario
GET    /api/projects/:id/baseline        Get baseline scenario

POST   /api/projects/:id/monitoring      Create monitoring period
GET    /api/projects/:id/monitoring      List monitoring periods
PATCH  /api/projects/:id/monitoring/:pid Update period status

POST   /api/projects/:id/monitoring/:pid/records   Submit activity data records
GET    /api/projects/:id/monitoring/:pid/records   List emission records
DELETE /api/projects/:id/monitoring/:pid/records/:rid

POST   /api/projects/:id/monitoring/:pid/calculate  Trigger MRV calculation
GET    /api/projects/:id/monitoring/:pid/summary    Get MRV summary
       Returns: { baseline, project_emissions, leakage, net_reductions, credits_eligible }
```

### 3.3 Certification

```
POST   /api/certifications              Request certification
GET    /api/certifications              List certifications (role-filtered)
GET    /api/certifications/:id          Get certification detail

PATCH  /api/admin/certifications/:id    Admin: assign expert, update status
PATCH  /api/expert/certifications/:id   Expert: submit audit report + checklist

POST   /api/certifications/:id/submit-to-body   Submit dossier to OGEC/Verra/GS
PATCH  /api/certifications/:id/record-avis      Record official Avis (admin)
       Body: { avis_number, avis_date, avis_pdf_url }
```

### 3.4 Document Generation

```
POST   /api/projects/:id/documents/generate
       Body: { doc_type: 'pdd' | 'monitoring_plan' | 'monitoring_report' | 'ogec_dossier' }
       Returns: { document_id, download_url }

GET    /api/projects/:id/documents             List all documents
GET    /api/projects/:id/documents/:did        Download document
PATCH  /api/projects/:id/documents/:did        Update status (draft → final)
```

### 3.5 Verification Workflow

```
GET    /api/verifiers                          List accredited verifiers
POST   /api/certifications/:id/verification    Assign verifier
PATCH  /api/certifications/:id/verification/:vid  Update verification status
       Body: { status, opinion, report_url, cars_count }
```

### 3.6 Carbon Credits

```
GET    /api/projects/:id/credits               List credits for project
POST   /api/projects/:id/credits               Issue credits (admin only)
       Body: { quantity, vintage_year, serial_number_start/end, registry_issuance_date }

GET    /api/credits                            All credits (admin)
POST   /api/credits/:id/retire                 Retire credits (buyer)
       Body: { quantity, retirement_purpose, retirement_beneficiary }

GET    /api/credits/transactions               Transaction history
```

---

## SECTION 4 — MRV ENGINE DESIGN

### 4.1 Core Formula

```
Net Emission Reductions (tCO₂e) =
  Baseline Emissions  — What would happen WITHOUT the project
  − Project Emissions  — Emissions caused BY the project
  − Leakage           — Emissions displaced OUTSIDE project boundary

Credits Eligible = Net Emission Reductions − Buffer Pool Contribution

Buffer Pool:
  Verra AFOLU: 10–60% depending on non-permanence risk score
  Gold Standard: typically 0% (different approach)
  OGEC national: defined per arrêté ministériel
```

### 4.2 Baseline Calculation Logic

```typescript
// src/lib/mrv/baseline.ts

interface BaselineInputs {
  projectType: 'redd_plus' | 'arr' | 'renewable_energy' | 'cookstoves' | 'waste'
  referenceYears: { start: number; end: number }
  historicalDeforestationRateHaPerYear?: number
  carbonDensityTonnePerHa?: number
  gridEmissionFactorTCO2PerMWh?: number
  householdsAffected?: number
  fuelConsumptionKgPerHouseholdPerYear?: number
}

export function calculateBaseline(inputs: BaselineInputs): number {
  switch (inputs.projectType) {

    case 'redd_plus':
      // VM0007 / VM0048 approach
      // Baseline = historical deforestation rate × carbon density × project area
      return (
        (inputs.historicalDeforestationRateHaPerYear ?? 0) *
        (inputs.carbonDensityTonnePerHa ?? 150) *  // Default IPCC tropical forest
        44 / 12  // Convert tC to tCO₂
      )

    case 'arr':
      // Baseline = 0 (degraded land with no carbon stock)
      // Project emissions = sequestration from planted biomass
      return 0

    case 'renewable_energy':
      // Baseline = grid emission factor × energy generated
      // AMS-I.D / GS-RE-001
      return (
        (inputs.gridEmissionFactorTCO2PerMWh ?? 0.5) *
        0  // energy_generated_MWh passed from monitoring records
      )

    case 'cookstoves':
      // AMS-II.G approach
      // Baseline = households × fuel consumption × emission factor
      const fuelEF = 1.747  // tCO₂e per tonne wood (IPCC)
      return (
        (inputs.householdsAffected ?? 0) *
        ((inputs.fuelConsumptionKgPerHouseholdPerYear ?? 0) / 1000) *
        fuelEF
      )

    default:
      return 0
  }
}
```

### 4.3 Avoided Emissions Calculation (per monitoring period)

```typescript
// src/lib/mrv/calculate.ts

export function calculateMRVSummary(params: {
  baselineEmissions: number    // tCO₂e/year from baseline scenario
  projectEmissions: number     // tCO₂e from emission records (project type)
  leakageEstimate: number      // tCO₂e — displaced emissions
  periodYears: number          // Duration of monitoring period in years
  bufferPoolPercent: number    // e.g. 0.15 for 15%
}) {

  const baseline = params.baselineEmissions * params.periodYears
  const project  = params.projectEmissions
  const leakage  = params.leakageEstimate * params.periodYears

  const netReductions    = baseline - project - leakage
  const bufferAmount     = netReductions * params.bufferPoolPercent
  const creditsEligible  = netReductions - bufferAmount

  return {
    baseline_total:         parseFloat(baseline.toFixed(4)),
    project_emissions_total: parseFloat(project.toFixed(4)),
    leakage_total:          parseFloat(leakage.toFixed(4)),
    net_emission_reductions: parseFloat(netReductions.toFixed(4)),
    buffer_pool_contribution: parseFloat(bufferAmount.toFixed(4)),
    credits_eligible:       parseFloat(creditsEligible.toFixed(4)),
  }
}
```

### 4.4 Methodology Suggestion Engine

```typescript
// src/lib/mrv/methodology-suggester.ts

const METHODOLOGY_MAP: Record<string, { verra: string; gs: string }> = {
  redd_plus:        { verra: 'VM0048',    gs: 'GS-AFOLU-REDD' },
  arr:              { verra: 'VM0047',    gs: 'GS-AFOLU-ARR' },
  ifm:              { verra: 'VM0012',    gs: 'GS-AFOLU-IFM' },
  renewable_energy: { verra: 'AMS-I.D',  gs: 'GS-RE-001' },
  cookstoves:       { verra: 'AMS-II.G', gs: 'AMS-II.G' },
  waste_biogas:     { verra: 'AMS-III.R', gs: 'AMS-III.R' },
  agriculture:      { verra: 'VM0042',   gs: 'GS-AFOLU-SOIL' },
  transport:        { verra: 'AMS-III.C', gs: 'AMS-III.C' },
}

export function suggestMethodology(projectType: string, standard: string): string | null {
  const entry = METHODOLOGY_MAP[projectType]
  if (!entry) return null
  return standard === 'verra_vcs' ? entry.verra : entry.gs
}
```

---

## SECTION 5 — DOCUMENT GENERATION

### 5.1 Architecture

```
┌─────────────────────────────────────────────────────┐
│              DOCUMENT ENGINE                         │
│                                                       │
│  Template Store          Data Injector               │
│  ┌─────────────────┐    ┌────────────────────────┐  │
│  │ pdd.template    │    │ Fetch project data      │  │
│  │ monitoring.tmpl │ →  │ Fetch MRV summary       │  │
│  │ ogec_dossier    │    │ Fetch expert report     │  │
│  │ certificate     │    │ Inject into template    │  │
│  └─────────────────┘    └────────────────────────┘  │
│                                  │                    │
│                          PDF Renderer                 │
│                   ┌──────────────────────┐           │
│                   │  @react-pdf/renderer  │           │
│                   │  or Puppeteer         │           │
│                   └──────────────────────┘           │
│                                  │                    │
│                          File Storage                 │
│                   ┌──────────────────────┐           │
│                   │  S3 / Supabase       │           │
│                   │  Returns signed URL  │           │
│                   └──────────────────────┘           │
└─────────────────────────────────────────────────────┘
```

### 5.2 PDD Structure (Project Design Document)

```typescript
// src/lib/documents/pdd-template.ts

interface PDDData {
  project: {
    title: string
    id: string
    methodology: string
    standard: string
    country: string
    coordinates: string
    creditingPeriod: string
    projectDeveloper: string
  }
  description: {
    objective: string
    activities: string
    technology: string
    boundaries: string
  }
  baseline: {
    scenario: string
    methodology: string
    emissionsPerYear: number
    dataSource: string
    referencePeriod: string
  }
  additionality: {
    barrierAnalysis: string
    commonPracticeAnalysis: string
    result: 'additional' | 'not_additional'
  }
  monitoringPlan: {
    parameters: {
      name: string
      unit: string
      frequency: string
      method: string
      responsible: string
    }[]
  }
  sdgImpacts?: {
    sdg: number
    description: string
    indicator: string
  }[]
  estimatedReductions: {
    year: number
    baseline: number
    project: number
    leakage: number
    net: number
  }[]
}

// Sections of a compliant PDD:
// A. General Description
// B. Application of Methodology
// C. Project Boundary
// D. Baseline Scenario & Additionality
// E. Quantification of Emissions
// F. Monitoring Plan
// G. SDG Co-Benefits (Gold Standard)
// H. Stakeholder Consultation Summary
// I. Environmental & Social Impact Assessment
```

### 5.3 PDF Generation (Recommended: @react-pdf/renderer)

```typescript
// src/app/api/projects/[id]/documents/generate/route.ts
import { renderToBuffer } from '@react-pdf/renderer'
import { PDDDocument } from '@/lib/documents/PDDDocument'
import { uploadToStorage } from '@/lib/storage'

export async function POST(req: Request, { params }: { params: { id: string } }) {
  const { doc_type } = await req.json()
  const projectId = parseInt(params.id)

  // 1. Fetch all data needed
  const data = await assembleDocumentData(projectId, doc_type)

  // 2. Select template component
  const template = getTemplate(doc_type) // PDDDocument | MonitoringReportDocument | etc.

  // 3. Render to PDF buffer
  const pdfBuffer = await renderToBuffer(template(data))

  // 4. Upload to storage
  const fileUrl = await uploadToStorage(pdfBuffer, `projects/${projectId}/${doc_type}-v1.pdf`)

  // 5. Save document record in DB
  await savePDFRecord({ projectId, doc_type, fileUrl, isAutoGenerated: true })

  return Response.json({ download_url: fileUrl })
}
```

### 5.4 Document Versioning

```sql
-- Always create new version, never overwrite
INSERT INTO project_documents (project_id, doc_type, version, file_url, ...)
SELECT $1, $2, COALESCE(MAX(version), 0) + 1, $3, ...
FROM project_documents
WHERE project_id = $1 AND doc_type = $2;
```

---

## SECTION 6 — VERIFICATION WORKFLOW

### 6.1 Status State Machine

```
Certification Status Flow:

pending
  │ Admin assigns expert
  ▼
assigned
  │ Expert schedules audit
  ▼
audit_scheduled
  │ Expert conducts site visit
  ▼
audit_done (expert submits checklist + report)
  │ Admin reviews, selects verifier (Bureau Veritas etc.)
  ▼
verifier_assigned
  │ Documents sent to verifier
  ▼
documents_sent
  │ Verifier conducts independent audit
  ▼
verification_in_progress
  │ CARs raised? → Partner/expert must respond
  ▼
cars_resolved (if any CARs)
  │ Verifier issues final opinion
  ▼
verification_complete (positive opinion)
  │ Admin compiles dossier for OGEC/Verra/GS
  ▼
dossier_compiled
  │ Dossier submitted to certifying body
  ▼
submitted_to_body
  │ Body issues official response
  ▼
avis_issued (national) or registered (Verra/GS)
  │ Credits issued
  ▼
certified ✅
  OR
rejected ❌ (with reason, can re-submit)
```

### 6.2 Expert Audit Checklist (Structured JSON)

```typescript
// Stored as JSONB in certification_requests.inspection_checklist

interface AuditChecklist {
  // Section 1 — Site Visit
  site_visited: boolean
  visit_date: string
  visit_participants: string[]
  site_conditions_match_project: boolean
  site_notes: string

  // Section 2 — Data Verification
  activity_data_complete: boolean
  emission_factors_appropriate: boolean
  calculation_methodology_correct: boolean
  scope1_verified: boolean
  scope2_verified: boolean
  scope3_verified: boolean
  data_discrepancies: string   // if any

  // Section 3 — Additionality (Carbon Projects)
  additionality_demonstrated: boolean
  barrier_analysis_credible: boolean
  common_practice_assessment_valid: boolean

  // Section 4 — Monitoring Plan
  monitoring_plan_implemented: boolean
  data_collection_adequate: boolean
  monitoring_frequency_met: boolean

  // Section 5 — Safeguards (Gold Standard)
  no_negative_social_impacts: boolean
  community_engagement_documented: boolean
  environmental_safeguards_met: boolean

  // Section 6 — Expert Opinion
  overall_opinion: 'positive' | 'qualified_positive' | 'adverse'
  cars_raised: { id: string; description: string; severity: 'major' | 'minor' }[]
  recommendation: 'approve' | 'approve_with_conditions' | 'reject'
  expert_notes: string
}
```

### 6.3 Verifier Document Package

```
When admin sends documents to verifier:
  ├── project_design_document.pdf        (final PDD)
  ├── monitoring_report.pdf              (period report)
  ├── baseline_study.pdf                 (baseline scenario document)
  ├── additionality_assessment.pdf
  ├── stakeholder_consultation_report.pdf (GS only)
  ├── sdg_impact_assessment.pdf          (GS only)
  ├── expert_audit_report.pdf            (CarbonTrack expert report)
  └── supporting_data/
      ├── activity_data.xlsx             (raw data)
      ├── emission_factor_sources.pdf
      └── satellite_images/              (if available)
```

---

## SECTION 7 — REGISTRY INTEGRATION STRATEGY

### 7.1 Reality: No Public API from Verra or Gold Standard

```
Verra Registry:    Manual web portal → verra.org/project-hub
Gold Standard:     Manual web portal → registry.goldstandard.org
OGEC National:     Physical submission (email + courier) → will evolve

CarbonTrack approach:
  → Generate perfectly formatted export packages
  → Track submission and response manually
  → Store registry IDs and confirmation documents
  → Future: watch for Verra/GS API if released
```

### 7.2 Export Package for Verra Registry

```typescript
// src/lib/registry/verra-export.ts

interface VerraExportPackage {
  // Project listing data (matches Verra Project Hub format)
  project_name: string
  project_id_applicant: string         // Your internal ID
  country: string
  methodology_id: string               // e.g. 'VM0048'
  sectoral_scope: number[]             // e.g. [14]
  project_type: string
  start_date: string
  crediting_period_years: number
  estimated_reductions_per_year: number
  project_description_url: string      // Link to PDD PDF
  coordinates: { lat: number; lon: number }[]  // Project boundary

  // Files to attach manually to Verra portal
  files: {
    pdd: string           // URL
    monitoring_plan: string
    validation_report: string
  }
}

export async function generateVerraExport(projectId: number): Promise<VerraExportPackage> {
  // Fetch all project data and format for Verra submission
}
```

### 7.3 Registry Status Tracking in DB

```sql
-- Track everything manually since no API
ALTER TABLE certification_requests ADD COLUMN IF NOT EXISTS
  registry_submission_date    DATE,
  registry_reference_number   VARCHAR(100),
  registry_status             VARCHAR(50),
  -- 'not_submitted' | 'submitted' | 'under_review' | 'registered' | 'rejected'
  registry_comments           TEXT,
  registry_confirmed_at       DATE,
  credits_issued_quantity     DECIMAL(14,4),
  credits_serial_range        VARCHAR(255);
```

---

## SECTION 8 — MULTI-PROJECT AGGREGATION

### 8.1 Programme of Activities (PoA) Architecture

```
A PoA allows bundling many small projects under one umbrella:
(e.g., 500 households with cookstoves across 10 villages = 1 Gold Standard PoA)

PROGRAMME
  ├── Coordinating Managing Entity (CME) = CarbonTrack or Lead NGO
  ├── Programme Design Document (PDD) — ONE for the whole programme
  │
  ├── VPA 1: Village Akanda — 50 households
  ├── VPA 2: Village Libreville Nord — 80 households
  ├── VPA 3: Village Lambaréné — 120 households
  └── VPA N: ...

Each VPA:
  → Monitored separately
  → Data aggregated at programme level
  → One verification for the whole programme per cycle
  → Credits pooled and distributed by revenue sharing rules
```

### 8.2 Pooled Credit Distribution

```typescript
// src/lib/aggregation/revenue-sharing.ts

interface RevenueDistribution {
  programId: number
  totalCredits: number
  totalRevenueFCFA: number
  distributions: {
    beneficiaryType: 'platform' | 'partner' | 'community' | 'buffer'
    beneficiaryId?: number
    percentage: number
    amountFCFA: number
    creditsAllocated: number
  }[]
}

export function calculateRevenueSharing(
  rules: RevenueShareRule[],
  totalRevenueFCFA: number,
  totalCredits: number
): RevenueDistribution {
  const distributions = rules.map(rule => ({
    beneficiaryType: rule.beneficiary_type,
    beneficiaryId: rule.beneficiary_id,
    percentage: rule.percentage,
    amountFCFA: (totalRevenueFCFA * rule.percentage) / 100,
    creditsAllocated: (totalCredits * rule.percentage) / 100,
  }))

  return { programId: rules[0].program_id, totalCredits, totalRevenueFCFA, distributions }
}

// Example revenue sharing for a typical programme:
// Platform (CarbonTrack): 15%
// Lead NGO: 20%
// Local Community: 40%
// Partner NGOs: 20%
// Buffer Pool: 5%
```

### 8.3 Aggregated MRV

```sql
-- Aggregate MRV across all projects in a programme
SELECT
  pp.program_id,
  SUM(ms.baseline_emissions_total)   AS program_baseline_total,
  SUM(ms.project_emissions_total)    AS program_project_total,
  SUM(ms.net_emission_reductions)    AS program_net_reductions,
  SUM(ms.credits_eligible)           AS program_credits_eligible
FROM mrv_summaries ms
JOIN program_projects pp ON ms.project_id = pp.project_id
WHERE pp.program_id = $1
  AND ms.monitoring_period_id IN (SELECT id FROM monitoring_periods WHERE period_start >= $2)
GROUP BY pp.program_id;
```

---

## SECTION 9 — SECURITY & TRUST LAYER

### 9.1 Role-Based Access Control

```typescript
// Roles: admin | expert | verifier | partner | company | community

const PERMISSIONS = {
  admin: ['*'],  // All actions

  expert: [
    'certification.read', 'certification.audit',
    'project.read', 'mrv.read',
    'document.read', 'document.upload_audit_report'
  ],

  verifier: [
    'certification.read_assigned',
    'document.read_sent', 'document.upload_verification_report',
    'verification.update_status', 'verification.submit_cars'
  ],

  partner: [
    'project.create', 'project.read_own', 'project.update_own',
    'mrv.submit', 'document.upload',
    'certification.request', 'credit.view_own',
    'withdrawal.request'
  ],

  company: [
    'assessment.create', 'assessment.read_own',
    'certification.request', 'certification.read_own',
    'credit.buy', 'credit.retire',
    'report.generate_own'
  ]
}

export function can(userRole: string, permission: string): boolean {
  const perms = PERMISSIONS[userRole as keyof typeof PERMISSIONS] || []
  return perms.includes('*') || perms.includes(permission)
}
```

### 9.2 Data Integrity & Audit Trail

```typescript
// src/lib/audit.ts — Log every significant action

export async function logAction(params: {
  userId: number
  action: string           // 'credit.issued', 'status.changed', 'document.approved'
  entityType: string
  entityId: number
  oldValue?: object
  newValue?: object
  ipAddress?: string
}) {
  await query(
    `INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_value, new_value, ip_address)
     VALUES ($1,$2,$3,$4,$5,$6,$7)`,
    [params.userId, params.action, params.entityType, params.entityId,
     JSON.stringify(params.oldValue), JSON.stringify(params.newValue), params.ipAddress]
  )
}

// Use for: credit issuance, status changes, document approvals, any financial transaction
```

### 9.3 MRV Data Integrity Checks

```typescript
// src/lib/mrv/integrity.ts

export function validateEmissionRecord(record: EmissionRecord): string[] {
  const errors: string[] = []

  if (record.quantity <= 0) errors.push('Quantity must be positive')
  if (record.emission_factor <= 0) errors.push('Emission factor must be positive')
  if (!record.emission_factor_source) errors.push('Emission factor source required')
  if (!record.data_source) errors.push('Data source required')

  // Cross-check: quantity × EF should match co2eq_value within 0.01% tolerance
  const expected = record.quantity * record.emission_factor
  const tolerance = expected * 0.0001
  if (Math.abs(record.co2eq_value - expected) > tolerance) {
    errors.push(`CO₂eq mismatch: calculated ${expected.toFixed(4)}, declared ${record.co2eq_value}`)
  }

  return errors
}
```

### 9.4 Optional: Satellite Data Integration

```
Future integration options (no immediate API needed):
  
  Global Forest Watch API (free)
  → GET https://production-api.globalforestwatch.org/v1/forest-change
  → GLAD deforestation alerts for project area
  → Validate that no deforestation occurs within project boundary

  Copernicus (EU, free)
  → Sentinel-2 satellite imagery (10m resolution, every 5 days)
  → NDVI analysis to verify tree coverage growth

  NASA FIRMS (fire alerts)
  → Early warning if project area is affected by fires
  → Trigger non-permanence risk assessment

  Planet Labs (paid)
  → Daily 3m imagery — gold standard for forest monitoring
```

---

## SECTION 10 — MVP ROADMAP

### Phase 1 — MVP: National Certification (3 months)

**Goal:** CarbonTrack is operational for OGEC/CNC national certification in Gabon.

```
Month 1:
  ✅ Bilan GES (Scope 1/2/3) — already built
  ☐ Hide market/partner from navigation
  ☐ Structured expert audit checklist (JSONB)
  ☐ Expert audit report PDF auto-generation
  ☐ OGEC dossier compilation + download
  ☐ Status: add 'submitted_to_ogec' + 'avis_issued' statuses
  ☐ Avis recording (admin uploads OGEC Avis PDF)

Month 2:
  ☐ Enhanced certificate PDF (with OGEC Avis reference)
  ☐ Methodology database seeded (OGEC national methodology)
  ☐ Company registration to OGEC workflow
  ☐ Monitoring period management (annual cycle)
  ☐ Basic MRV engine for compliance (Scope 1/2/3 tracking)

Month 3:
  ☐ Admin dashboard: all certifications + OGEC submission queue
  ☐ Audit log (all status changes tracked)
  ☐ Email notifications (expert assigned, status changed, avis received)
  ☐ Pilot: 1 real company through full cycle
  ☐ Build verification (clean)
```

**Deliverable:** A Gabonese company can request certification → expert audits → dossier goes to OGEC → Avis recorded → Certificate issued. Full digital flow.

---

### Phase 2 — Certification-Ready: Gold Standard (months 4–9)

**Goal:** CarbonTrack supports project developers through Gold Standard pre-certification.

```
Month 4–5:
  ☐ Project Engine: full project CRUD with geospatial
  ☐ Baseline Scenario builder (with calculation engine)
  ☐ Additionality assessment module
  ☐ Methodology database: Verra + Gold Standard methodologies
  ☐ Methodology suggestion engine

Month 6–7:
  ☐ MRV Engine: emission records, period management, summary calculation
  ☐ PDD auto-generation (PDF template — A through H sections)
  ☐ Monitoring Plan auto-generation
  ☐ Stakeholder Consultation module (Gold Standard requirement)
  ☐ SDG Impact Tool integration

Month 8–9:
  ☐ Verifier workflow (assign Bureau Veritas / SGS / TÜV)
  ☐ Verifier portal (limited access for external VVBs)
  ☐ CAR/CL management (Corrective Action Requests)
  ☐ Verra registry export package generator
  ☐ Gold Standard registry export package generator
  ☐ Registry status tracking (manual, with DB fields)
  ☐ First pilot: 1 NGO project through full Gold Standard cycle
```

**Deliverable:** An NGO can onboard a reforestation project, build its PDD, get it verified by Bureau Veritas, and submit to Gold Standard — all tracked on CarbonTrack.

---

### Phase 3 — Marketplace & Scale (months 10–18)

**Goal:** Carbon credit trading, multi-project aggregation, revenue sharing.

```
Month 10–12:
  ☐ Carbon credit registry (issuance, tracking, serial numbers)
  ☐ Multi-project Programme of Activities (PoA) module
  ☐ Revenue sharing engine (configurable rules per programme)
  ☐ Partner wallet + withdrawal (already built, connect to credits)

Month 13–15:
  ☐ Company marketplace: browse certified projects, buy credits
  ☐ Credit retirement system (with retirement certificate)
  ☐ Dashboard: corporate sustainability reporting (credits bought + retired)
  ☐ Re-activate market pages (hidden in Phase 1)

Month 16–18:
  ☐ Satellite data integration (Global Forest Watch, Sentinel-2)
  ☐ Plan Vivo methodology support (community projects)
  ☐ Mobile app: partner field data collection (GPS, photos)
  ☐ API for third-party integrations (ERPs, ESG platforms)
  ☐ Compliance market readiness (Article 6 Paris Agreement)
```

**Deliverable:** "Stripe for Carbon Certification in Africa" — full lifecycle from footprint calculation to certified credit retirement, with marketplace, verifier integration, and multi-project aggregation.

---

## APPENDIX — Key Files to Create (CarbonTrack Codebase)

```
carbon-app/src/
  lib/
    mrv/
      baseline.ts          ← Baseline calculation logic
      calculate.ts         ← MRV summary formula
      methodology-suggester.ts
      integrity.ts         ← Data validation checks
    documents/
      templates/
        pdd.tsx            ← @react-pdf PDD template
        monitoring-report.tsx
        ogec-dossier.tsx
        certificate.tsx
      generator.ts         ← generatePDF() function
      storage.ts           ← Upload to S3/Supabase
    audit.ts               ← logAction() function
    registry/
      verra-export.ts
      gs-export.ts
  app/
    api/
      projects/route.ts
      projects/[id]/
        baseline/route.ts
        monitoring/route.ts
        monitoring/[pid]/
          records/route.ts
          calculate/route.ts
        documents/generate/route.ts
      certifications/[id]/
        record-avis/route.ts
        submit-to-body/route.ts
      verifiers/route.ts
    admin/(panel)/
      certifications/       ← Already exists — extend
    expert/(panel)/
      certifications/       ← Already exists — extend
    partner/
      projects/             ← Already exists
```

---

## Sources

- [Verra VCS Program Details](https://verra.org/programs/verified-carbon-standard/vcs-program-details/)
- [Verra VCS Standard v4.7](https://verra.org/wp-content/uploads/2024/04/VCS-Standard-v4.7-FINAL-4.15.24.pdf)
- [Gold Standard Certification Process](https://www.goldstandard.org/publications/certification-process-stepbystep)
- [Gold Standard Validation & Verification Standard](https://globalgoals.goldstandard.org/standards/113_V2.0_PAR_Validation-and-Verification-Standard.pdf)
- [Ordonnance N°019/2021 Gabon](https://journal-officiel.ga/17690-019-2021/)
- [GHG Protocol Corporate Standard](https://ghgprotocol.org/corporate-standard)
- [IPCC Guidelines 2006/2019](https://www.ipcc-nggip.iges.or.jp/public/2019rf/index.html)
- [Global Forest Watch API](https://www.globalforestwatch.org/help/developers/)
