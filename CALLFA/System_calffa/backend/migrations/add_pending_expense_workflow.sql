-- Pending expense workflow columns for machinery_expenses

ALTER TABLE machinery_expenses
  ADD COLUMN IF NOT EXISTS operator_id INT NULL COMMENT 'Assigned operator for booking-linked expenses' AFTER booking_id,
  ADD COLUMN IF NOT EXISTS expense_status ENUM('Pending', 'Recorded') NOT NULL DEFAULT 'Recorded' AFTER sundries,
  ADD COLUMN IF NOT EXISTS expense_source ENUM('manual', 'booking') NOT NULL DEFAULT 'manual' AFTER expense_status;
