-- CarbonTrack — Migration: VVB Verification Workflow
-- Extends carbon_projects with VVB tracking fields
-- and creates vvb_verifications table for full audit trail.
-- Run: psql -U postgres -d carbontrack -f scripts/migrate-vvb.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Extend carbon_projects with VVB assignment fields
-- ─────────────────────────────────────────────────────────────────────────────

ALTER TABLE carbon_projects
  ADD COLUMN IF NOT EXISTS vvb_name          VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vvb_contact_email VARCHAR(255),
  ADD COLUMN IF NOT EXISTS vvb_assigned_at   TIMESTAMP,
  ADD COLUMN IF NOT EXISTS vvb_status        VARCHAR(30) DEFAULT NULL,
  -- pending | contacted | in_review | site_visit | approved | conditionally_approved | rejected
  ADD COLUMN IF NOT EXISTS vvb_opinion       VARCHAR(30) DEFAULT NULL,
  -- approved | conditionally_approved | rejected
  ADD COLUMN IF NOT EXISTS vvb_report_url    TEXT;

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. VVB verifications table (full audit trail + CARs / CLs)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vvb_verifications (
  id              SERIAL PRIMARY KEY,
  project_id      INTEGER NOT NULL REFERENCES carbon_projects(id) ON DELETE CASCADE,

  -- VVB identity
  vvb_name        VARCHAR(255) NOT NULL,
  vvb_email       VARCHAR(255) NOT NULL,
  vvb_contact     VARCHAR(255),             -- contact person name

  -- Assignment
  assigned_at     TIMESTAMP DEFAULT NOW(),
  assigned_by     INTEGER REFERENCES users(id),

  -- Status
  status          VARCHAR(30) NOT NULL DEFAULT 'pending',
  -- pending | contacted | in_review | site_visit | approved | conditionally_approved | rejected

  -- Email tracking
  email_sent_at   TIMESTAMP,
  email_documents JSONB,                    -- list of documents attached: [{name, size}]

  -- CARs & CLs (stored as JSONB arrays)
  -- CAR: { id, text, issued_at, resolved_at, resolved }
  -- CL:  { id, text, issued_at, answered_at, answer }
  cars            JSONB NOT NULL DEFAULT '[]',
  cls             JSONB NOT NULL DEFAULT '[]',

  -- Final opinion
  opinion         VARCHAR(30),              -- approved | conditionally_approved | rejected
  opinion_text    TEXT,
  opinion_date    DATE,
  report_url      TEXT,                     -- URL to uploaded VVB verification report

  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Known VVBs reference table (pre-populated)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS vvb_registry (
  id          SERIAL PRIMARY KEY,
  name        VARCHAR(255) UNIQUE NOT NULL,
  short_name  VARCHAR(50),
  website     TEXT,
  standards   TEXT[],   -- ['verra_vcs', 'gold_standard', 'plan_vivo']
  regions     TEXT[],   -- ['Africa', 'Global']
  contact_email VARCHAR(255),
  active      BOOLEAN DEFAULT TRUE
);

INSERT INTO vvb_registry (name, short_name, website, standards, regions) VALUES
(
  'Bureau Veritas',
  'BV',
  'https://www.bureauveritas.com',
  ARRAY['verra_vcs', 'gold_standard'],
  ARRAY['Africa', 'Global']
),
(
  'SGS S.A.',
  'SGS',
  'https://www.sgs.com',
  ARRAY['verra_vcs', 'gold_standard'],
  ARRAY['Africa', 'Global']
),
(
  'TÜV SÜD',
  'TÜV SÜD',
  'https://www.tuvsud.com',
  ARRAY['verra_vcs', 'gold_standard'],
  ARRAY['Global']
),
(
  'SustainCERT',
  'SustainCERT',
  'https://www.sustain-cert.com',
  ARRAY['gold_standard'],
  ARRAY['Africa', 'Global']
),
(
  'DNV (Det Norske Veritas)',
  'DNV',
  'https://www.dnv.com',
  ARRAY['verra_vcs', 'gold_standard'],
  ARRAY['Global']
),
(
  'South Pole',
  'South Pole',
  'https://www.southpole.com',
  ARRAY['verra_vcs', 'gold_standard'],
  ARRAY['Africa', 'Global']
),
(
  'Aenor',
  'AENOR',
  'https://www.aenor.com',
  ARRAY['verra_vcs'],
  ARRAY['Global']
)
ON CONFLICT (name) DO NOTHING;
