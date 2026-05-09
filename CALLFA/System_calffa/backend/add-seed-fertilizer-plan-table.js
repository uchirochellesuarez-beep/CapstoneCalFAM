/**
 * Idempotent: seed_fertilizer_plan_obligations — pending ₱50/sako until marked paid on Seed & Fertilizer Plan.
 * Run: node add-seed-fertilizer-plan-table.js
 */
const pool = require('./db');

async function tableExists(name) {
  const [rows] = await pool.execute(
    `
    SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES
    WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?
    `,
    [name]
  );
  return rows.length > 0;
}

async function migrate() {
  if (!(await tableExists('seed_fertilizer_plan_obligations'))) {
    await pool.execute(`
      CREATE TABLE seed_fertilizer_plan_obligations (
        id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
        distribution_id INT UNSIGNED NOT NULL,
        farmer_id INT UNSIGNED NOT NULL,
        barangay_id INT NOT NULL,
        sack_count INT UNSIGNED NOT NULL DEFAULT 0,
        amount_pesos DECIMAL(12,2) NOT NULL DEFAULT 0,
        status ENUM('pending', 'paid') NOT NULL DEFAULT 'pending',
        share_capital_contribution_id INT UNSIGNED NULL,
        paid_at DATETIME NULL,
        recorded_by INT UNSIGNED NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY uk_sfp_distribution (distribution_id),
        KEY idx_sfp_farmer_status (farmer_id, status),
        KEY idx_sfp_barangay (barangay_id),
        CONSTRAINT fk_sfp_distribution FOREIGN KEY (distribution_id)
          REFERENCES income_assistance_distributions(id) ON DELETE CASCADE,
        CONSTRAINT fk_sfp_farmer FOREIGN KEY (farmer_id) REFERENCES farmers(id) ON DELETE CASCADE,
        CONSTRAINT fk_sfp_share_contrib FOREIGN KEY (share_capital_contribution_id)
          REFERENCES share_capital_contributions(id) ON DELETE SET NULL
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    console.log('Created seed_fertilizer_plan_obligations');
  } else {
    console.log('Table seed_fertilizer_plan_obligations already exists');
  }

  // Link existing assistance_sacks rows (legacy auto-post) as paid obligations
  try {
    const [r] = await pool.execute(`
      INSERT IGNORE INTO seed_fertilizer_plan_obligations
        (distribution_id, farmer_id, barangay_id, sack_count, amount_pesos, status,
         share_capital_contribution_id, paid_at, recorded_by)
      SELECT
        c.source_distribution_id,
        c.farmer_id,
        c.barangay_id,
        COALESCE(c.sack_count, d.quantity, 0),
        c.amount,
        'paid',
        c.id,
        COALESCE(c.created_at, NOW()),
        c.created_by
      FROM share_capital_contributions c
      INNER JOIN income_assistance_distributions d ON d.id = c.source_distribution_id
      WHERE c.contribution_kind = 'assistance_sacks'
        AND c.source_distribution_id IS NOT NULL
        AND c.status = 'confirmed'
    `);
    if (r.affectedRows > 0) {
      console.log(`Backfilled ${r.affectedRows} paid obligation row(s) from existing share_capital_contributions`);
    }
  } catch (e) {
    if (e.code === 'ER_NO_SUCH_TABLE' || e.code === 'ER_BAD_FIELD_ERROR') {
      console.warn('Backfill skipped (missing column/table):', e.message);
    } else {
      throw e;
    }
  }

  console.log('Done.');
  process.exit(0);
}

migrate().catch((e) => {
  console.error(e);
  process.exit(1);
});
