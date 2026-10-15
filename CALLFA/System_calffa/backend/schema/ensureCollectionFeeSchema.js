/**
 * Per-barangay amounts for share capital and association dues.
 * Treasurer sets these; new payments use the saved amount.
 */
async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function addFeeColumn(pool, name, sql) {
  if (await columnExists(pool, 'barangays', name)) return;
  try {
    await pool.execute(`ALTER TABLE barangays ADD COLUMN ${name} ${sql}`);
    console.log(`✅ Added barangays.${name}`);
  } catch (error) {
    if (error.code === 'ER_DUP_FIELDNAME' || error.errno === 1060) return;
    throw error;
  }
}

async function ensureCollectionFeeSchema(pool) {
  await addFeeColumn(pool, 'share_capital_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 100.00');
  await addFeeColumn(pool, 'association_dues_amount', 'DECIMAL(10,2) NOT NULL DEFAULT 120.00');
}

module.exports = { ensureCollectionFeeSchema };
