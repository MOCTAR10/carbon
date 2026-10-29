-- Security & integrity hardening (company portal audit). Idempotent — safe to re-run.

-- 1. Record terms consent at registration
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_version VARCHAR(20);
ALTER TABLE users ADD COLUMN IF NOT EXISTS terms_accepted_at TIMESTAMP;

-- 2. Case-insensitive email lookups (login / register normalise to lower case)
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (LOWER(email));

-- 3. At most one live certification request per assessment (rejected ones are history).
--    Skipped with a notice if existing data already violates it — clean up, then re-run.
DO $$
BEGIN
  IF EXISTS (
    SELECT assessment_id FROM certification_requests
    WHERE status <> 'rejected' GROUP BY assessment_id HAVING COUNT(*) > 1
  ) THEN
    RAISE NOTICE 'uniq_cert_request_live_assessment NOT created: duplicate live requests exist';
  ELSE
    CREATE UNIQUE INDEX IF NOT EXISTS uniq_cert_request_live_assessment
      ON certification_requests (assessment_id) WHERE status <> 'rejected';
  END IF;
END $$;

-- 4. Indexes for the company portal's frequent queries
CREATE INDEX IF NOT EXISTS idx_notifications_user_created ON notifications (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_emission_entries_assessment ON emission_entries (assessment_id);
CREATE INDEX IF NOT EXISTS idx_audit_documents_assessment ON audit_documents (assessment_id);
