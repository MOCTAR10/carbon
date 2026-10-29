-- CarbonTrack — Migration: expert-led CNC deposit workflow
-- Run: psql -U postgres -d carbontrack -f scripts/migrate-expert-cnc-deposit.sql
-- Must run after migrate-cnc.sql (alpha order guarantees it).
--
-- The CNC portal is removed. The accredited expert now physically deposits the dossier at the
-- CNC, records the deposit (submitted_to_cnc_at + cnc_deposit_reference), then uploads the
-- CNC-issued certificate into certification_documents (doc_type = 'certificate') and enters its
-- number/date into certificate_number / certified_at.

ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS cnc_deposit_reference VARCHAR(100);

-- Legacy rows certified through the old CNC portal → plain 'certified', keeping the CNC number
UPDATE certification_requests
SET status = 'certified',
    certificate_number = COALESCE(cnc_certificate_number, certificate_number),
    certified_at = COALESCE(cnc_certificate_generated_at, certified_at),
    updated_at = NOW()
WHERE status = 'certificate_generated';

COMMENT ON COLUMN certification_requests.status IS
  'pending | assigned | in_progress | audit_done | submitted_to_cnc | certified | rejected';

CREATE INDEX IF NOT EXISTS idx_cert_docs_cert ON certification_documents(certification_id);
