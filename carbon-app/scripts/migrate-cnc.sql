-- Migration: Add CNC workflow columns to certification_requests
-- This adds the CNC (Conseil National du Climat) review and certificate generation workflow.

-- Add new columns for CNC workflow
ALTER TABLE certification_requests
  ADD COLUMN IF NOT EXISTS cnc_user_id INTEGER REFERENCES users(id),
  ADD COLUMN IF NOT EXISTS submitted_to_cnc_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cnc_reviewed_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cnc_notes TEXT,
  ADD COLUMN IF NOT EXISTS cnc_certificate_pdf_url TEXT,
  ADD COLUMN IF NOT EXISTS cnc_certificate_generated_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS cnc_certificate_number VARCHAR(100);

-- Update the status comment to include new CNC statuses
COMMENT ON COLUMN certification_requests.status IS E'pending | assigned | in_progress | audit_done | certified | submitted_to_cnc | certificate_generated | rejected';

-- Index for CNC user lookups
CREATE INDEX IF NOT EXISTS idx_cert_requests_cnc ON certification_requests(cnc_user_id);
