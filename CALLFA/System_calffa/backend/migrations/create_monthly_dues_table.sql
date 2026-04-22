-- Migration: Add monthly dues collection system
-- Description: Creates table for tracking monthly dues collection from farmers

CREATE TABLE IF NOT EXISTS monthly_dues (
  id INT AUTO_INCREMENT PRIMARY KEY,
  farmer_id INT NOT NULL,
  barangay_id INT NOT NULL,
  collection_date DATE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL DEFAULT 120.00,
  collected_by INT NOT NULL COMMENT 'ID of president/treasurer who collected the dues',
  collector_role VARCHAR(20) NOT NULL COMMENT 'president or treasurer',
  period_start DATE NOT NULL COMMENT 'Start date of the 6-month period',
  period_end DATE NOT NULL COMMENT 'End date of the 6-month period',
  payment_method VARCHAR(50) COMMENT 'Cash, Bank Transfer, etc.',
  remarks TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

  INDEX idx_farmer_id (farmer_id),
  INDEX idx_barangay_id (barangay_id),
  INDEX idx_collection_date (collection_date),
  INDEX idx_period (period_start, period_end),
  INDEX idx_collected_by (collected_by),

  UNIQUE KEY unique_dues_period (farmer_id, period_start, period_end)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;