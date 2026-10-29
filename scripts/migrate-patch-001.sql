-- CarbonTrack — Patch 001
-- Run: psql -U postgres -d carbontrack -f scripts/migrate-patch-001.sql
-- Fixes two issues from earlier migrations:
--   1. methodologies table missing columns (project_types, parameters, description)
--   2. registry_summary view references cp.standard (does not exist on carbon_projects)

-- ─────────────────────────────────────────────────────────────────────────────
-- 0. Add missing status column to carbon_projects
--    (original migrate-add-market.sql didn't include it)
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE carbon_projects
  ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'draft';

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Add missing columns to methodologies table
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE methodologies
  ADD COLUMN IF NOT EXISTS project_types TEXT[],
  ADD COLUMN IF NOT EXISTS parameters    JSONB,
  ADD COLUMN IF NOT EXISTS description   TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Ensure UNIQUE constraint on methodologies.code exists
-- ─────────────────────────────────────────────────────────────────────────────

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'methodologies_code_key' AND conrelid = 'methodologies'::regclass
  ) THEN
    ALTER TABLE methodologies ADD CONSTRAINT methodologies_code_key UNIQUE (code);
  END IF;
END$$;

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Seed / update methodologies with full data
-- ─────────────────────────────────────────────────────────────────────────────

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
  'Réduction des émissions dues à la déforestation et à la dégradation des forêts.'
),
(
  'VM0047',
  'Afforestation, Reforestation and Revegetation (ARR)',
  'verra_vcs',
  ARRAY['arr', 'reforestation'],
  '{"annual_increment_tco2_ha_yr": {"label": "Incrément annuel de séquestration (tCO₂/ha/an)", "type": "number", "unit": "tCO₂/ha/an"},
    "leakage_pct": {"label": "Facteur de fuite (%)", "type": "number", "unit": "%", "default": 5},
    "buffer_pct": {"label": "Pool tampon (%)", "type": "number", "unit": "%", "default": 12}}',
  'Boisement, reboisement et revégétalisation.'
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
  'Foyers améliorés et pratiques culinaires.'
),
(
  'VM0033',
  'Methodology for Tidal Wetland and Seagrass Restoration',
  'verra_vcs',
  ARRAY['mangrove', 'blue_carbon'],
  '{"restoration_area_ha": {"label": "Surface de mangrove restaurée (ha)", "type": "number", "unit": "ha"},
    "sequestration_rate_tco2_ha_yr": {"label": "Taux de séquestration (tCO₂/ha/an)", "type": "number", "unit": "tCO₂/ha/an", "default": 6.5},
    "buffer_pct": {"label": "Pool tampon (%)", "type": "number", "unit": "%", "default": 20}}',
  'Restauration de zones humides côtières et herbiers marins (carbone bleu).'
),
(
  'OGEC-GHG-001',
  'Diagnostic GES Entreprises — Ordonnance N°019/PR/2021',
  'ogec',
  ARRAY['industrial', 'commercial'],
  '{"threshold_tco2": {"label": "Seuil réglementaire (tCO₂e)", "type": "number", "default": 10000},
    "scope_approach": {"label": "Approche de consolidation", "type": "select", "options": ["operational_control", "equity_share"]}}',
  'Diagnostic GES obligatoire pour les entreprises gabonaises dépassant le seuil réglementaire.'
)
ON CONFLICT (code) DO UPDATE SET
  project_types = EXCLUDED.project_types,
  parameters    = EXCLUDED.parameters,
  description   = EXCLUDED.description;

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Fix registry_summary view — remove cp.standard (not on carbon_projects)
-- ─────────────────────────────────────────────────────────────────────────────

-- CREATE OR REPLACE can't drop the old view's columns (standard, project_type): recreate it.
DROP VIEW IF EXISTS registry_summary;
CREATE VIEW registry_summary AS
SELECT
  cp.id                      AS project_id,
  cp.title                   AS project_title,
  cp.project_type_mrv,
  cp.methodology_code,
  p.name                     AS partner_name,
  COUNT(cc.id)               AS credit_batches,
  COALESCE(SUM(cc.quantity_issued),   0) AS total_issued,
  COALESCE(SUM(cc.quantity_active),   0) AS total_active,
  COALESCE(SUM(cc.quantity_retired),  0) AS total_retired,
  COALESCE(SUM(cc.quantity_cancelled),0) AS total_cancelled,
  COALESCE(SUM(cc.quantity_buffer),   0) AS total_buffer,
  MIN(cc.vintage_year)   AS first_vintage,
  MAX(cc.vintage_year)   AS last_vintage,
  MAX(cc.issuance_date)  AS last_issuance
FROM carbon_projects cp
LEFT JOIN partners p ON p.id = cp.partner_id
LEFT JOIN carbon_credits cc ON cc.project_id = cp.id
GROUP BY cp.id, cp.title, cp.project_type_mrv, cp.methodology_code, p.name;
