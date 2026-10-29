-- CarbonTrack — Migration: OGEC Certification Enhancement
-- Run against: carbontrack DB
-- Adds: structured audit checklist, OGEC submission tracking, Avis de Conformité fields

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend certification_requests with OGEC workflow fields
-- ─────────────────────────────────────────────────────────────────────────────

-- Structured audit checklist (replaces free-text inspection_checklist)
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS audit_checklist JSONB;

-- Audit scheduling
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS audit_scheduled_date DATE;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS audit_location TEXT;

-- OGEC submission tracking (Gap 3)
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS submitted_to_ogec_at TIMESTAMP;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS ogec_reference VARCHAR(100);

-- Avis de Conformité fields (Gap 4)
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS avis_number VARCHAR(100);

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS avis_date DATE;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS avis_pdf_url TEXT;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS avis_period_start INTEGER; -- year

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS avis_period_end INTEGER;   -- year

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS avis_total_co2eq NUMERIC(15, 2); -- validated emissions

-- Expert report PDF url
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS expert_report_pdf_url TEXT;

-- Dossier compiled at
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS dossier_compiled_at TIMESTAMP;

-- Update status comment to document new values
COMMENT ON COLUMN certification_requests.status IS
  'pending | assigned | audit_scheduled | audit_done | dossier_compiled | submitted_to_ogec | avis_issued | certified | rejected';

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Index new tracking columns
-- ─────────────────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_cert_requests_avis ON certification_requests(avis_number)
  WHERE avis_number IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_cert_requests_ogec ON certification_requests(submitted_to_ogec_at)
  WHERE submitted_to_ogec_at IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Methodologies reference table (for project aggregator Phase 2)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS methodologies (
  id SERIAL PRIMARY KEY,
  standard VARCHAR(50) NOT NULL,           -- 'OGEC' | 'Verra' | 'GoldStandard'
  code VARCHAR(100) NOT NULL,              -- e.g. 'VM0048', 'AMS-II.G', 'OGEC-GHG-001'
  name TEXT NOT NULL,
  version VARCHAR(20),
  project_type VARCHAR(100),               -- 'redd_plus' | 'cookstoves' | 'solar' | 'ghg_inventory'
  sector_scope VARCHAR(255),
  description TEXT,
  monitoring_params JSONB,                 -- { required_params: [...], formulas: {...} }
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);

-- migrate-carbon-projects.sql (runs first, alpha order) creates a narrower methodologies table;
-- bring it up to this shape so a fresh install doesn't fail on the seeds below.
ALTER TABLE methodologies
  ADD COLUMN IF NOT EXISTS version           VARCHAR(20),
  ADD COLUMN IF NOT EXISTS project_type      VARCHAR(100),
  ADD COLUMN IF NOT EXISTS sector_scope      VARCHAR(255),
  ADD COLUMN IF NOT EXISTS monitoring_params JSONB,
  ADD COLUMN IF NOT EXISTS is_active         BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS created_at        TIMESTAMP DEFAULT NOW();

CREATE UNIQUE INDEX IF NOT EXISTS idx_methodologies_code ON methodologies(standard, code);

-- Seed OGEC national methodology
INSERT INTO methodologies (standard, code, name, version, project_type, sector_scope, description) VALUES
  ('OGEC', 'OGEC-GHG-001', 'Méthodologie nationale de bilan GES — Ordonnance N°019/PR/2021', '1.0',
   'ghg_inventory', 'Tous secteurs — Périmètre opérationnel ou quote-part du capital',
   'Bilan des émissions de GES obligatoire pour les entités gabonaises selon les seuils fixés aux articles 24-26 de l''ordonnance N°019/PR/2021. Périmètre Scope 1+2 (≥10 000 tCO₂e) et Scope 1+2+3 avec plan de surveillance (≥50 000 tCO₂e).')
ON CONFLICT DO NOTHING;  -- also covers the older UNIQUE(code) from migrate-carbon-projects.sql

-- Seed Verra methodologies
INSERT INTO methodologies (standard, code, name, version, project_type, sector_scope) VALUES
  ('Verra', 'VM0048', 'Reducing Emissions from Deforestation and Forest Degradation (REDD+)', '1.0', 'redd_plus', 'Agriculture Forestry & Land Use (AFOLU) — Scope 14'),
  ('Verra', 'VM0047', 'Afforestation, Reforestation and Revegetation', '1.0', 'afforestation', 'Agriculture Forestry & Land Use (AFOLU) — Scope 14'),
  ('Verra', 'AMS-II.G', 'Energy efficiency measures in thermal applications of non-renewable biomass', '12.0', 'cookstoves', 'Energy — Scope 2'),
  ('Verra', 'VM0036', 'Methodology for Rewetting Drained Temperate Peatlands', '1.0', 'wetlands', 'Agriculture Forestry & Land Use (AFOLU) — Scope 14'),
  ('Verra', 'VM0042', 'Improved Agricultural Land Management', '1.0', 'agriculture', 'Agriculture Forestry & Land Use (AFOLU) — Scope 13')
ON CONFLICT DO NOTHING;  -- also covers the older UNIQUE(code) from migrate-carbon-projects.sql

-- Seed Gold Standard methodologies
INSERT INTO methodologies (standard, code, name, version, project_type, sector_scope) VALUES
  ('GoldStandard', 'GS-TPDDTOOL', 'Technologies & Practices to Displace Decentralized Thermal Energy Consumption', '2.0', 'cookstoves', 'Energy — Household'),
  ('GoldStandard', 'GS-AMSIII.BG', 'Methane recovery in wastewater treatment', '5.0', 'wastewater', 'Waste — Municipal'),
  ('GoldStandard', 'GS-SOLAR', 'Solar photovoltaic systems for household use', '3.0', 'solar', 'Energy — Renewable')
ON CONFLICT DO NOTHING;  -- also covers the older UNIQUE(code) from migrate-carbon-projects.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Verify
-- ─────────────────────────────────────────────────────────────────────────────
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'certification_requests'
  AND column_name IN (
    'audit_checklist', 'audit_scheduled_date', 'audit_location',
    'submitted_to_ogec_at', 'ogec_reference',
    'avis_number', 'avis_date', 'avis_pdf_url',
    'avis_period_start', 'avis_period_end', 'avis_total_co2eq',
    'expert_report_pdf_url', 'dossier_compiled_at'
  )
ORDER BY column_name;
