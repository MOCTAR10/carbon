-- Migration: Add country column to sites table

-- 1. Add the column
ALTER TABLE sites ADD COLUMN IF NOT EXISTS country VARCHAR(150);

-- 2. Populate existing rows with a default to avoid NULL UI drops
UPDATE sites SET country = 'Gabon' WHERE country IS NULL;

-- 3. (Optional) Make it NOT NULL if required strictly in the future
-- ALTER TABLE sites ALTER COLUMN country SET NOT NULL;
