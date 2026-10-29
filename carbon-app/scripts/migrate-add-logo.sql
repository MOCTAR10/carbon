-- Migration: Add logo_url to companies table
-- Run: psql -U carbontrack_user -d carbontrack -h localhost -f scripts/migrate-add-logo.sql

ALTER TABLE companies ADD COLUMN IF NOT EXISTS logo_url VARCHAR(500);
