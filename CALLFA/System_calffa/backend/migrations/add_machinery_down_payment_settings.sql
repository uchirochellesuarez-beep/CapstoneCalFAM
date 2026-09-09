-- Per-barangay machinery down payment (President on/off + percentage)
ALTER TABLE barangays
  ADD COLUMN IF NOT EXISTS machinery_down_payment_enabled TINYINT(1) NOT NULL DEFAULT 0
  COMMENT '1=require machinery down payment, 0=pay after service';

ALTER TABLE barangays
  ADD COLUMN IF NOT EXISTS machinery_down_payment_percent DECIMAL(5,2) NULL
  COMMENT 'President-set down payment percent (e.g. 10, 20, 30)';
