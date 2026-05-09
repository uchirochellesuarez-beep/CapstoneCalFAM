/**
 * Idempotent migration: share_capital_contributions columns for seed/fertilizer sack plan.
 * Run: node add-share-capital-assistance-columns.js
 */
const pool = require('./db');

async function columnExists(table, column) {
  const [rows] = await pool.execute(
    `
    SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?
    `,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(table, indexName) {
  const [rows] = await pool.execute(
    `
    SELECT INDEX_NAME FROM INFORMATION_SCHEMA.STATISTICS
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?
    `,
    [table, indexName]
  );
  return rows.length > 0;
}

async function migrate() {
  const t = 'share_capital_contributions';
  if (!(await columnExists(t, 'contribution_kind'))) {
    await pool.execute(`
      ALTER TABLE share_capital_contributions
      ADD COLUMN contribution_kind ENUM('membership', 'assistance_sacks') NOT NULL DEFAULT 'membership'
        COMMENT 'membership=periodic share; assistance_sacks=seed/fertilizer plan'
        AFTER status
    `);
    console.log('Added contribution_kind');
  }
  if (!(await columnExists(t, 'sack_count'))) {
    await pool.execute(
      `ALTER TABLE share_capital_contributions ADD COLUMN sack_count INT UNSIGNED NULL AFTER contribution_kind`
    );
    console.log('Added sack_count');
  }
  if (!(await columnExists(t, 'per_sack_amount'))) {
    await pool.execute(
      `ALTER TABLE share_capital_contributions ADD COLUMN per_sack_amount DECIMAL(10,2) NULL DEFAULT NULL AFTER sack_count`
    );
    console.log('Added per_sack_amount');
  }
  if (!(await columnExists(t, 'source_distribution_id'))) {
    await pool.execute(
      `ALTER TABLE share_capital_contributions ADD COLUMN source_distribution_id INT UNSIGNED NULL AFTER per_sack_amount`
    );
    console.log('Added source_distribution_id');
  }
  if (!(await indexExists(t, 'idx_scc_source_distribution'))) {
    await pool.execute(
      `ALTER TABLE share_capital_contributions ADD INDEX idx_scc_source_distribution (source_distribution_id)`
    );
    console.log('Added index idx_scc_source_distribution');
  }
  console.log('Done.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
