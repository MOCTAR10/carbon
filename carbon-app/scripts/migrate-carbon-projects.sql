-- CarbonTrack — Migration: NGO Carbon Project MRV Engine
-- Adds baseline, monitoring and MRV calculation tables on top
-- of the existing carbon_projects table (from migrate-add-market.sql)
-- Run: psql -U postgres -d carbontrack -f scripts/migrate-carbon-projects.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend carbon_projects with MRV-specific fields (idempotent)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE carbon_projects
  ADD COLUMN IF NOT EXISTS area_ha           NUMERIC,
  ADD COLUMN IF NOT EXISTS methodology_code  VARCHAR(20),  -- VM0048, VM0047, VM0050, VM0033…
  ADD COLUMN IF NOT EXISTS project_type_mrv  VARCHAR(50),  -- redd_plus | arr | cookstoves | mangrove | solar
  ADD COLUMN IF NOT EXISTS baseline_tco2_yr  NUMERIC,      -- calculated annual baseline (cached)
  ADD COLUMN IF NOT EXISTS credits_eligible  NUMERIC,      -- latest MRV result (cached)
  ADD COLUMN IF NOT EXISTS additionnality_passed BOOLEAN DEFAULT FALSE;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Methodologies reference table (seed data below)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS methodologies (
  id            SERIAL PRIMARY KEY,
  code          VARCHAR(20) UNIQUE NOT NULL,     -- 'VM0048', 'VM0047', 'VM0050', 'VM0033'
  name          VARCHAR(255) NOT NULL,
  standard      VARCHAR(30) NOT NULL,            -- 'verra_vcs' | 'gold_standard' | 'ogec'
  project_types TEXT[],                         -- array of applicable project_type_mrv values
  parameters    JSONB,                           -- schema of required inputs for this methodology
  description   TEXT,
  active        BOOLEAN DEFAULT TRUE
);

INSERT INTO methodologies (code, name, standard, project_types, parameters, description) VALUES
(
  'VM0048',
  'Reducing Emissions from Deforestation and Forest Degradation (REDD+)',
  'verra_vcs',
  ARRAY['redd_plus'],
  '{"deforestation_rate_ha_yr": {"label": "Taux de déforestation (ha/an)", "type": "number", "unit": "ha/an"},
    "carbon_density_tco2_ha": {"label": "Densité carbone (tCO₂/ha)", "type": "number", "unit": "tCO₂/ha"},
    "leakage_pct": {"label": "Facteur de fuite (%)", "type": "number", "unit": "%", "default": 10},
    "buffer_pct": {"label": "Pool tampon (%)", "type": "number", "unit": "%", "default": 15}}',
  'Réduction des émissions dues à la déforestation et à la dégradation des forêts. Applicable aux projets de conservation forestière.'
),
(
  'VM0047',
  'Afforestation, Reforestation and Revegetation (ARR)',
  'verra_vcs',
  ARRAY['arr', 'reforestation'],
  '{"annual_increment_tco2_ha_yr": {"label": "Incrément annuel de séquestration (tCO₂/ha/an)", "type": "number", "unit": "tCO₂/ha/an"},
    "leakage_pct": {"label": "Facteur de fuite (%)", "type": "number", "unit": "%", "default": 5},
    "buffer_pct": {"label": "Pool tampon (%)", "type": "number", "unit": "%", "default": 12}}',
  'Boisement, reboisement et revégétalisation. Applicable aux projets plantant des arbres sur des terres non boisées.'
),
(
  'VM0050',
  'Methodology for Improved Cookstoves and Kitchen Regimes',
  'verra_vcs',
  ARRAY['cookstoves'],
  '{"households": {"label": "Ménages bénéficiaires", "type": "number", "unit": "ménages"},
    "fuel_saved_kg_yr": {"label": "Combustible économisé par ménage (kg/an)", "type": "number", "unit": "kg/an"},
    "ef_biomass_tco2_kg": {"label": "Facteur d''émission biomasse (tCO₂/kg)", "type": "number", "unit": "tCO₂/kg", "default": 0.001548},
    "buffer_pct": {"label": "Pool tampon (%)", "type": "number", "unit": "%", "default": 10}}',
  'Foyers améliorés et pratiques culinaires. Applicable aux projets distribuant des cuisinières économes en carburant.'
),
(
  'VM0033',
  'Methodology for Tidal Wetland and Seagrass Restoration',
  'verra_vcs',
  ARRAY['mangrove', 'blue_carbon'],
  '{"restoration_area_ha": {"label": "Surface de mangrove restaurée (ha)", "type": "number", "unit": "ha"},
    "sequestration_rate_tco2_ha_yr": {"label": "Taux de séquestration (tCO₂/ha/an)", "type": "number", "unit": "tCO₂/ha/an", "default": 6.5},
    "buffer_pct": {"label": "Pool tampon (%)", "type": "number", "unit": "%", "default": 20}}',
  'Restauration de zones humides côtières et herbiers marins (carbone bleu). Applicable aux projets de mangroves.'
),
(
  'OGEC-GHG-001',
  'Diagnostic GES Entreprises — Ordonnance N°019/PR/2021',
  'ogec',
  ARRAY['industrial', 'commercial'],
  '{"threshold_tco2": {"label": "Seuil réglementaire (tCO₂e)", "type": "number", "default": 10000},
    "scope_approach": {"label": "Approche de consolidation", "type": "select", "options": ["operational_control", "equity_share"]}}',
  'Diagnostic GES obligatoire pour les entreprises gabonaises dépassant le seuil réglementaire OGEC.'
)
ON CONFLICT (code) DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Baseline scenarios
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS baseline_scenarios (
  id                SERIAL PRIMARY KEY,
  project_id        INTEGER NOT NULL REFERENCES carbon_projects(id) ON DELETE CASCADE,
  methodology_code  VARCHAR(20) NOT NULL,
  parameters        JSONB NOT NULL,        -- user-supplied inputs matching methodology.parameters schema
  baseline_tco2_yr  NUMERIC,              -- calculated: annual baseline emissions avoided/sequestered
  additionnality    JSONB,                -- test results: barrier 1/2/3 passed/failed
  notes             TEXT,
  calculated_at     TIMESTAMP,
  created_at        TIMESTAMP DEFAULT NOW(),
  updated_at        TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Monitoring periods
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monitoring_periods (
  id            SERIAL PRIMARY KEY,
  project_id    INTEGER NOT NULL REFERENCES carbon_projects(id) ON DELETE CASCADE,
  period_start  DATE NOT NULL,
  period_end    DATE NOT NULL,
  status        VARCHAR(30) NOT NULL DEFAULT 'open',
                -- open | data_entered | calculated | verified
  created_at    TIMESTAMP DEFAULT NOW(),
  updated_at    TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Monitoring records (raw activity data per period)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS monitoring_records (
  id             SERIAL PRIMARY KEY,
  period_id      INTEGER NOT NULL REFERENCES monitoring_periods(id) ON DELETE CASCADE,
  activity_type  VARCHAR(100),  -- e.g. 'deforestation_avoided', 'sequestration', 'fuel_saved'
  value          NUMERIC NOT NULL,
  unit           VARCHAR(30),
  notes          TEXT,
  created_at     TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 6. MRV summaries (calculated results per period)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS mrv_summaries (
  id                 SERIAL PRIMARY KEY,
  period_id          INTEGER NOT NULL UNIQUE REFERENCES monitoring_periods(id) ON DELETE CASCADE,
  methodology_code   VARCHAR(20),
  baseline_tco2      NUMERIC DEFAULT 0,
  project_emissions  NUMERIC DEFAULT 0,
  leakage_tco2       NUMERIC DEFAULT 0,
  net_reductions     NUMERIC DEFAULT 0,   -- baseline - project_emissions - leakage
  buffer_tons        NUMERIC DEFAULT 0,   -- net_reductions × buffer_pct / 100
  credits_eligible   NUMERIC DEFAULT 0,   -- net_reductions - buffer_tons
  calculated_at      TIMESTAMP DEFAULT NOW()
);
