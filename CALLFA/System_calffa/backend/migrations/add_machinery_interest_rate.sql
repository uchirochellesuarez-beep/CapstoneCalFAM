-- Per-machinery interest rate for partial balance payments (percentage, optional; default 0%)
ALTER TABLE machinery_inventory
  ADD COLUMN interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00
  COMMENT 'One-time partial-payment interest rate in percent (0 = no interest)'
  AFTER non_member_price;

UPDATE machinery_inventory SET interest_rate = 0.00 WHERE interest_rate IS NULL;
