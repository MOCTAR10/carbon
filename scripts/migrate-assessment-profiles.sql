-- Copilote carbone: activity profile of a bilan (answers to "do you have generators, vehicles, a canteen…").
-- Drives the collection plan and the pre-certification checklist. One row per bilan; idempotent.
CREATE TABLE IF NOT EXISTS assessment_profiles (
  assessment_id INTEGER PRIMARY KEY REFERENCES assessments(id) ON DELETE CASCADE,
  answers       JSONB       NOT NULL DEFAULT '{}',
  updated_by    INTEGER     REFERENCES users(id) ON DELETE SET NULL,
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
