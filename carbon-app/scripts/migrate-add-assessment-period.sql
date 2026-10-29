-- Add month-range period to assessments (1=Jan … 12=Dec)
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS start_month INTEGER DEFAULT 1;
ALTER TABLE assessments ADD COLUMN IF NOT EXISTS end_month   INTEGER DEFAULT 12;
