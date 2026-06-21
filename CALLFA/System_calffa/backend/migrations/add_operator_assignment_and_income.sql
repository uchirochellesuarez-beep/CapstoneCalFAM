-- Operator assignment and income tracking for machinery module

ALTER TABLE machinery_inventory
  ADD COLUMN IF NOT EXISTS assigned_operator_id INT NULL COMMENT 'Primary operator for this machinery unit' AFTER status,
  ADD COLUMN IF NOT EXISTS assigned_by INT NULL COMMENT 'President who assigned the operator' AFTER assigned_operator_id,
  ADD COLUMN IF NOT EXISTS assignment_date DATE NULL COMMENT 'Date operator was assigned' AFTER assigned_by;

ALTER TABLE machinery_bookings
  ADD COLUMN IF NOT EXISTS assigned_operator_id INT NULL COMMENT 'Operator routed when booking was approved' AFTER machinery_id;

ALTER TABLE machinery_expenses
  ADD COLUMN IF NOT EXISTS booking_id INT NULL COMMENT 'Linked machinery booking for labor cost' AFTER machinery_id;

CREATE TABLE IF NOT EXISTS operator_income (
  id INT AUTO_INCREMENT PRIMARY KEY,
  operator_id INT NOT NULL,
  booking_id INT NOT NULL,
  machinery_id INT NOT NULL,
  expense_id INT NULL,
  labor_cost_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
  transaction_date DATE NOT NULL,
  income_status ENUM('Pending', 'Credited', 'Cancelled') DEFAULT 'Credited',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY unique_operator_booking_income (booking_id),
  INDEX idx_operator_id (operator_id),
  INDEX idx_machinery_id (machinery_id),
  INDEX idx_transaction_date (transaction_date),
  INDEX idx_income_status (income_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
