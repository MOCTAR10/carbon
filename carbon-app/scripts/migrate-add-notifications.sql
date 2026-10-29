-- Schema pieces that existed in deployed databases but were never captured in a script,
-- so a fresh install (new server, CI) was missing them. Idempotent: safe to re-run.

CREATE TABLE IF NOT EXISTS notifications (
  id         SERIAL PRIMARY KEY,
  user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type       VARCHAR(60)  NOT NULL,
  title      VARCHAR(255) NOT NULL,
  message    TEXT NOT NULL,
  link       VARCHAR(500),
  read       BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications (user_id, read, created_at DESC);

ALTER TABLE platform_settings ADD COLUMN IF NOT EXISTS label VARCHAR(255);

-- carbon_transactions is created by migrate-add-market.sql, which sorts before this file
ALTER TABLE carbon_transactions
  ADD COLUMN IF NOT EXISTS external_project_name VARCHAR(255),
  ADD COLUMN IF NOT EXISTS external_project_type VARCHAR(100);
