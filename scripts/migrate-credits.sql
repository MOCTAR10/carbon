-- CarbonTrack — Migration: Carbon Credits Registry
-- Internal shadow registry modelled on Verra VCS structure.
-- Source: Verra Registry Terms of Use (Oct 2024) + Verra Registry User Guide.
--
-- Design principles:
--   - Full immutable audit trail (nothing is deleted, only status-changed)
--   - Serial numbers prefixed CT- (CarbonTrack); replaced with VCS- when Verra assigns a project ID
--   - Buffer pool is POOLED across all AFOLU projects (Verra design)
--   - Over-issuance liability tracked for 6 years (Verra ToU §8)
--   - Retirement records include beneficial owner + reason (publicly disclosed per Verra ToU)
--
-- Run: psql -U postgres -d carbontrack -f scripts/migrate-credits.sql

-- ─────────────────────────────────────────────────────────────────────────────
-- 1. Credit registry holders (account types per Verra §2)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS registry_accounts (
  id              SERIAL PRIMARY KEY,
  -- account_type: general | project_proponent | retail_aggregation | end_user
  account_type    VARCHAR(30) NOT NULL DEFAULT 'project_proponent',
  holder_name     VARCHAR(255) NOT NULL,
  holder_email    VARCHAR(255),
  partner_id      INTEGER REFERENCES partners(id),
  company_id      INTEGER REFERENCES companies(id),
  verra_account_id VARCHAR(100),          -- Verra registry account ID (assigned externally)
  kyc_verified    BOOLEAN DEFAULT FALSE,
  status          VARCHAR(20) DEFAULT 'active',  -- active | suspended | terminated
  created_at      TIMESTAMP DEFAULT NOW(),
  updated_at      TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 2. Carbon credits (VCUs / instruments)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS carbon_credits (
  id                  SERIAL PRIMARY KEY,
  project_id          INTEGER NOT NULL REFERENCES carbon_projects(id),
  period_id           INTEGER REFERENCES monitoring_periods(id),
  mrv_summary_id      INTEGER REFERENCES mrv_summaries(id),

  -- Identification (Verra ToU §5 — serial numbers are public on retirement)
  serial_number       VARCHAR(100) UNIQUE NOT NULL,
    -- Format: CT-{project_id:04d}-{vintage_year}-{sequence:05d}
    -- e.g.  : CT-0042-2024-00001
    -- Update to VCS-{verra_project_id}-{vintage_year}-{batch} when registered
  verra_project_id    VARCHAR(100),       -- e.g. 4271 (assigned by Verra after registration)
  verra_credit_ref    VARCHAR(100),       -- Verra's own serial/reference (filled post-registration)

  -- Vintage (the period the emissions reduction occurred)
  vintage_year        INTEGER NOT NULL,
  vintage_start       DATE,
  vintage_end         DATE,

  -- Quantities
  quantity_issued     NUMERIC(14,4) NOT NULL,    -- total tCO2e issued
  quantity_active     NUMERIC(14,4) NOT NULL,    -- currently transferable
  quantity_retired    NUMERIC(14,4) DEFAULT 0,
  quantity_cancelled  NUMERIC(14,4) DEFAULT 0,
  quantity_buffer     NUMERIC(14,4) DEFAULT 0,   -- deposited in pooled buffer

  -- Methodology / standard
  methodology_code    VARCHAR(20),
  standard            VARCHAR(30),   -- verra_vcs | gold_standard | ogec
  project_type        VARCHAR(50),   -- redd_plus | arr | mangrove | cookstoves...
  is_afolu            BOOLEAN DEFAULT FALSE,  -- AFOLU projects must contribute buffer

  -- Status (Verra ToU — credits can be active, retired, cancelled, or disputed)
  status              VARCHAR(20) NOT NULL DEFAULT 'active',
  -- active | partially_retired | fully_retired | cancelled | disputed

  -- Issuance
  issuance_date       DATE NOT NULL DEFAULT CURRENT_DATE,
  issued_by           INTEGER REFERENCES users(id),  -- admin who clicked issue

  -- Over-issuance tracking (Verra ToU §8 — liability survives 6 years)
  liability_expires_at DATE,   -- = issuance_date + 6 years

  notes               TEXT,
  created_at          TIMESTAMP DEFAULT NOW(),
  updated_at          TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 3. Credit transactions — immutable audit trail
--    (Verra ToU: all operations must be recorded; over-issuance obligation
--     survives 6 years from issuance)
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS credit_transactions (
  id                  SERIAL PRIMARY KEY,
  credit_id           INTEGER NOT NULL REFERENCES carbon_credits(id),
  project_id          INTEGER NOT NULL REFERENCES carbon_projects(id),

  -- Transaction type
  tx_type             VARCHAR(30) NOT NULL,
  -- issuance | transfer | retirement | cancellation | buffer_deposit | dispute_flag | dispute_resolve

  -- Quantity
  quantity            NUMERIC(14,4) NOT NULL,

  -- Parties
  from_holder         VARCHAR(255),          -- seller / transferor name
  to_holder           VARCHAR(255),          -- buyer / transferee name
  from_account_id     INTEGER REFERENCES registry_accounts(id),
  to_account_id       INTEGER REFERENCES registry_accounts(id),

  -- Retirement-specific (publicly disclosed per Verra ToU §6.4)
  beneficial_owner    VARCHAR(255),          -- entity whose emissions are offset
  beneficial_owner_email VARCHAR(255),
  retirement_reason   TEXT,                  -- why the credits are being retired

  -- Pricing (for sales)
  price_per_ton_usd   NUMERIC(10,4),
  price_per_ton_fcfa  NUMERIC(14,2),
  total_value_usd     NUMERIC(14,4),
  total_value_fcfa    NUMERIC(16,2),

  -- Registry references
  serial_numbers      TEXT[],                -- serial numbers involved in this tx
  verra_tx_ref        VARCHAR(100),          -- Verra registry transaction reference (external)

  -- Dispute (Verra ToU §9)
  dispute_reason      TEXT,

  -- Metadata
  tx_date             DATE NOT NULL DEFAULT CURRENT_DATE,
  notes               TEXT,
  performed_by        INTEGER REFERENCES users(id),
  created_at          TIMESTAMP DEFAULT NOW()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 4. Pooled buffer account (Verra ToU: AFOLU only, held collectively)
--    Buffer credits are held in a SHARED pool — not per-project sub-accounts.
--    Verra holds these and can cancel on reversal events.
-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS buffer_pool_ledger (
  id              SERIAL PRIMARY KEY,
  credit_id       INTEGER NOT NULL REFERENCES carbon_credits(id),
  project_id      INTEGER NOT NULL REFERENCES carbon_projects(id),

  quantity        NUMERIC(14,4) NOT NULL,    -- tCO2e contributed
  buffer_pct      NUMERIC(5,2),              -- % applied (e.g. 15.00)

  status          VARCHAR(20) DEFAULT 'held',
  -- held | released_normal | cancelled_reversal

  deposited_at    TIMESTAMP DEFAULT NOW(),
  released_at     TIMESTAMP,
  release_reason  TEXT,   -- 'project_end' | 'reversal_event' | 'verra_cancellation'

  notes           TEXT
);

-- ─────────────────────────────────────────────────────────────────────────────
-- 5. Registry summary view (materialized manually — update after each issuance)
-- ─────────────────────────────────────────────────────────────────────────────

-- This is a helper view, not materialized, for the admin dashboard.
-- Uses only columns that actually exist on carbon_projects (created by
-- migrate-add-market.sql) — `standard`, `project_type_mrv`, `methodology_code`
-- live on the methodologies/carbon_credits tables, not on carbon_projects.
-- Recreated (not replaced): migrate-patch-001.sql later changes its columns, so a re-run must drop it first.
DROP VIEW IF EXISTS registry_summary;
CREATE VIEW registry_summary AS
SELECT
  cp.id                                 AS project_id,
  cp.title                              AS project_title,
  cp.project_type                       AS project_type,
  p.name                                AS partner_name,
  MAX(cc.methodology_code)              AS methodology_code,
  MAX(cc.standard)                      AS standard,
  COUNT(cc.id)                          AS credit_batches,
  COALESCE(SUM(cc.quantity_issued),   0) AS total_issued,
  COALESCE(SUM(cc.quantity_active),   0) AS total_active,
  COALESCE(SUM(cc.quantity_retired),  0) AS total_retired,
  COALESCE(SUM(cc.quantity_cancelled),0) AS total_cancelled,
  COALESCE(SUM(cc.quantity_buffer),   0) AS total_buffer,
  MIN(cc.vintage_year)                  AS first_vintage,
  MAX(cc.vintage_year)                  AS last_vintage,
  MAX(cc.issuance_date)                 AS last_issuance
FROM carbon_projects cp
LEFT JOIN partners p       ON p.id = cp.partner_id
LEFT JOIN carbon_credits cc ON cc.project_id = cp.id
GROUP BY cp.id, cp.title, cp.project_type, p.name;
