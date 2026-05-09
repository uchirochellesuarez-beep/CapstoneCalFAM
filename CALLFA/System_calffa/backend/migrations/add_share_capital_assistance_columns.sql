-- Seed/fertilizer plan: contributions linked to assistance distributions (₱50 per sack).
-- Run once: mysql ... < add_share_capital_assistance_columns.sql

ALTER TABLE share_capital_contributions
  ADD COLUMN contribution_kind ENUM('membership', 'assistance_sacks') NOT NULL DEFAULT 'membership'
    COMMENT 'membership=periodic share; assistance_sacks=seed/fertilizer plan'
    AFTER status;

ALTER TABLE share_capital_contributions
  ADD COLUMN sack_count INT UNSIGNED NULL AFTER contribution_kind,
  ADD COLUMN per_sack_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER sack_count,
  ADD COLUMN source_distribution_id INT UNSIGNED NULL AFTER per_sack_amount;

ALTER TABLE share_capital_contributions
  ADD INDEX idx_scc_source_distribution (source_distribution_id);
