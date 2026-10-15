async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function tableExists(pool, table) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows.length > 0;
}

async function ensureHistoricalImportSchema(pool) {
  if (!(await tableExists(pool, 'machinery_bookings'))) return;

  const bookingColumns = [
    { name: 'historical_reference', sql: 'VARCHAR(64) NULL' },
    { name: 'is_historical_import', sql: 'TINYINT(1) NOT NULL DEFAULT 0' },
    { name: 'imported_by', sql: 'INT NULL' },
    { name: 'imported_at', sql: 'TIMESTAMP NULL' },
    { name: 'import_batch_id', sql: 'INT NULL' }
  ];

  for (const col of bookingColumns) {
    if (!(await columnExists(pool, 'machinery_bookings', col.name))) {
      await pool.execute(`ALTER TABLE machinery_bookings ADD COLUMN ${col.name} ${col.sql}`);
      console.log(`✅ Added machinery_bookings.${col.name}`);
    }
  }

  const [indexes] = await pool.execute(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'machinery_bookings'
       AND INDEX_NAME = 'uq_machinery_bookings_historical_reference'`
  );
  if (!indexes.length) {
    await pool.execute(
      `ALTER TABLE machinery_bookings
       ADD UNIQUE INDEX uq_machinery_bookings_historical_reference (historical_reference)`
    );
    console.log('✅ Added unique historical_reference index');
  }

  if (!(await tableExists(pool, 'machinery_historical_imports'))) {
    await pool.execute(`
      CREATE TABLE machinery_historical_imports (
        id INT AUTO_INCREMENT PRIMARY KEY,
        imported_by INT NOT NULL,
        barangay_id INT NOT NULL,
        filename VARCHAR(255) NULL,
        row_count INT NOT NULL DEFAULT 0,
        imported_count INT NOT NULL DEFAULT 0,
        skipped_count INT NOT NULL DEFAULT 0,
        rejected_count INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_hist_import_barangay (barangay_id),
        INDEX idx_hist_import_user (imported_by)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created machinery_historical_imports table');
  }

  const { backfillHistoricalBookingTotals } = require('../services/historical-booking-import');
  await backfillHistoricalBookingTotals(pool);
}

module.exports = { ensureHistoricalImportSchema };
