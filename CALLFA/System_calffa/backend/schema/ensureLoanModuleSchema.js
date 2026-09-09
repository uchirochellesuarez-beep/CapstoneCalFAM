/**
 * Per-barangay loan module on/off (President-controlled).
 */
async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function ensureLoanModuleSchema(pool) {
  if (!(await columnExists(pool, 'barangays', 'loans_enabled'))) {
    await pool.execute(
      `ALTER TABLE barangays
       ADD COLUMN loans_enabled TINYINT(1) NOT NULL DEFAULT 1
       COMMENT '1=loan module active for barangay, 0=on hold'`
    );
    console.log('✅ Added barangays.loans_enabled');
  }
}

module.exports = { ensureLoanModuleSchema };
