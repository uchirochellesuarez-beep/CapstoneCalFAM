-- Per-barangay loan module toggle (President on/off)
ALTER TABLE barangays
  ADD COLUMN IF NOT EXISTS loans_enabled TINYINT(1) NOT NULL DEFAULT 1
  COMMENT '1=loan module active, 0=on hold';
