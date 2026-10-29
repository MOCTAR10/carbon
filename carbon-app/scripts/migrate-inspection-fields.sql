-- CarbonTrack — Migration: Add missing inspection fields to certification_requests
-- Run: psql -U postgres -d carbontrack -f scripts/migrate-inspection-fields.sql
-- Adds columns referenced by expert and admin certification handlers
-- but missing from init-db.sql and earlier migrations.

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS inspection_confirmed BOOLEAN DEFAULT FALSE;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS inspection_proposed_date DATE;

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS inspection_proposed_by VARCHAR(50);
