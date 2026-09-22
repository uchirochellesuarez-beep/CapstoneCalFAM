/**
 * Optional per-machinery interest rate (%) for partial balance payments. Default 0%.
 * Does not depend on non_member_price existing (production dumps may lack tiered pricing).
 */
async function ensureMachineryInterestRateSchema(pool) {
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'machinery_inventory'
       AND COLUMN_NAME = 'interest_rate'`
  );
  if (cols.length) return;

  const [inventory] = await pool.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machinery_inventory'`
  );
  if (!inventory.length) return;

  await pool.execute(
    `ALTER TABLE machinery_inventory
     ADD COLUMN interest_rate DECIMAL(5, 2) NOT NULL DEFAULT 0.00
     COMMENT 'One-time partial-payment interest rate in percent (0 = no interest)'`
  );

  console.log('✅ Machinery interest_rate column ready');
}

module.exports = { ensureMachineryInterestRateSchema };
