ALTER TABLE farmers DROP INDEX IF EXISTS idx_primary_crop;
ALTER TABLE farmers DROP INDEX IF EXISTS idx_membership_type;
ALTER TABLE farmers DROP COLUMN IF EXISTS primary_crop;
ALTER TABLE farmers DROP COLUMN IF EXISTS membership_type;
ALTER TABLE farmers DROP COLUMN IF EXISTS membership_date;
ALTER TABLE farmers DROP COLUMN IF EXISTS last_activity;
ALTER TABLE farmers DROP COLUMN IF EXISTS notes;
