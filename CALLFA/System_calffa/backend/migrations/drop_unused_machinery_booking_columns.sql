-- Remove unused machinery_bookings columns (payment/sign-off/manager verification tracking)
-- Keeps completed_by + completed_date for operator completion audit

-- Drop foreign keys if they exist (MySQL 8 / MariaDB 10.5+)
SET @db = DATABASE();

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE machinery_bookings DROP FOREIGN KEY fk_payment_recorded_by',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db
    AND TABLE_NAME = 'machinery_bookings'
    AND CONSTRAINT_NAME = 'fk_payment_recorded_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE machinery_bookings DROP FOREIGN KEY fk_operator_signoff_by',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db
    AND TABLE_NAME = 'machinery_bookings'
    AND CONSTRAINT_NAME = 'fk_operator_signoff_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

SET @sql = (
  SELECT IF(
    COUNT(*) > 0,
    'ALTER TABLE machinery_bookings DROP FOREIGN KEY fk_manager_verified_by',
    'SELECT 1'
  )
  FROM information_schema.TABLE_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = @db
    AND TABLE_NAME = 'machinery_bookings'
    AND CONSTRAINT_NAME = 'fk_manager_verified_by'
    AND CONSTRAINT_TYPE = 'FOREIGN KEY'
);
PREPARE stmt FROM @sql;
EXECUTE stmt;
DEALLOCATE PREPARE stmt;

ALTER TABLE machinery_bookings
  DROP COLUMN IF EXISTS payment_recorded_by,
  DROP COLUMN IF EXISTS equipment_deployed_date,
  DROP COLUMN IF EXISTS equipment_return_date,
  DROP COLUMN IF EXISTS equipment_hours_used,
  DROP COLUMN IF EXISTS operator_signoff,
  DROP COLUMN IF EXISTS operator_signoff_date,
  DROP COLUMN IF EXISTS operator_signoff_by,
  DROP COLUMN IF EXISTS manager_verification,
  DROP COLUMN IF EXISTS manager_verification_date,
  DROP COLUMN IF EXISTS manager_verified_by,
  DROP COLUMN IF EXISTS manager_verification_by;
