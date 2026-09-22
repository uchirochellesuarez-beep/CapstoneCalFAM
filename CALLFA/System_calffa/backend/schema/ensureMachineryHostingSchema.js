/**
 * Columns required by live machinery APIs that older production dumps often lack.
 * (Local XAMPP usually already has these from one-off SQL migrations.)
 */
async function tableExists(pool, table) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows.length > 0;
}

async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function addColumnIfMissing(pool, table, column, sql) {
  if (!(await tableExists(pool, table))) return false;
  if (await columnExists(pool, table, column)) return false;
  await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${sql}`);
  console.log(`✅ Added ${table}.${column}`);
  return true;
}

async function ensureMachineryHostingSchema(pool) {
  if (await tableExists(pool, 'machinery_inventory')) {
    await addColumnIfMissing(
      pool,
      'machinery_inventory',
      'member_price',
      'DECIMAL(10,2) NULL COMMENT \'Price per unit for members\''
    );
    await addColumnIfMissing(
      pool,
      'machinery_inventory',
      'non_member_price',
      'DECIMAL(10,2) NULL COMMENT \'Price per unit for non-members\''
    );

    // Backfill tiered prices from legacy price_per_unit when null
    if (await columnExists(pool, 'machinery_inventory', 'price_per_unit')) {
      await pool.execute(`
        UPDATE machinery_inventory
        SET member_price = COALESCE(member_price, price_per_unit),
            non_member_price = COALESCE(non_member_price, ROUND(price_per_unit * 1.25, 2))
        WHERE price_per_unit IS NOT NULL
          AND (member_price IS NULL OR non_member_price IS NULL)
      `);
    }
  }

  if (!(await tableExists(pool, 'machinery_bookings'))) return;

  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'machine_used',
    'TINYINT(1) NOT NULL DEFAULT 0 COMMENT \'1 = equipment was used for this booking\''
  );
  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'operational_notes',
    'TEXT NULL'
  );
  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'total_price',
    'DECIMAL(10,2) NOT NULL DEFAULT 0.00'
  );
  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'notes',
    'TEXT NULL'
  );
  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'approved_by',
    'INT NULL'
  );
  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'approved_date',
    'DATETIME NULL'
  );
  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'rejection_reason',
    'TEXT NULL'
  );

  // Align legacy Completed rows with machine_used flag used by AR/pending-expense queries
  if (await columnExists(pool, 'machinery_bookings', 'machine_used')) {
    await pool.execute(`
      UPDATE machinery_bookings
      SET machine_used = 1
      WHERE status IN ('Completed', 'Awaiting Final Payment')
        AND COALESCE(machine_used, 0) = 0
        AND COALESCE(total_paid, 0) > 0
    `);
  }
}

module.exports = { ensureMachineryHostingSchema };
