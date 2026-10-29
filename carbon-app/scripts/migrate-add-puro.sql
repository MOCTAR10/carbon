-- Puro.earth Integration Migration
-- Run this after init-db.sql and migrate-add-market.sql

-- Add Puro.earth fields to partners
ALTER TABLE partners ADD COLUMN IF NOT EXISTS puro_api_key VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS puro_api_secret VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS puro_account_number VARCHAR(100);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS puro_facility_code VARCHAR(100);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS puro_connected BOOLEAN DEFAULT FALSE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS puro_connected_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS mission TEXT;
ALTER TABLE partners ADD COLUMN IF NOT EXISTS website VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS contact_email VARCHAR(255);
ALTER TABLE partners ADD COLUMN IF NOT EXISTS logo_url TEXT;

-- Add partner_id to users (idempotent)
ALTER TABLE users ADD COLUMN IF NOT EXISTS partner_id INTEGER REFERENCES partners(id) ON DELETE SET NULL;

-- Puro.earth submission log (tracks all API actions made on behalf of a partner)
CREATE TABLE IF NOT EXISTS puro_submissions (
  id SERIAL PRIMARY KEY,
  partner_id INTEGER REFERENCES partners(id) ON DELETE CASCADE,
  submission_type VARCHAR(50) NOT NULL, -- 'retirement', 'transfer', 'document_view', 'balance_check'
  puro_transaction_id VARCHAR(255),
  account_number VARCHAR(100),
  tons NUMERIC(12, 4),
  status VARCHAR(50) DEFAULT 'pending', -- pending / success / failed
  request_payload JSONB,
  response_payload JSONB,
  error_message TEXT,
  idempotency_key VARCHAR(100),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_puro_submissions_partner ON puro_submissions(partner_id);
CREATE INDEX IF NOT EXISTS idx_puro_submissions_type ON puro_submissions(submission_type);
