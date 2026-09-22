/**
 * Interest tracking columns used by balance/full payment and collections.
 * Local XAMPP often has these from old SQL migrations; production dumps may not.
 */
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

async function addColumnIfMissing(pool, table, column, sql) {
  if (!(await tableExists(pool, table))) return false;
  if (await columnExists(pool, table, column)) return false;
  await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${column} ${sql}`);
  console.log(`✅ Added ${table}.${column}`);
  return true;
}

async function ensureInterestTrackingSchema(pool) {
  if (!(await tableExists(pool, 'machinery_bookings'))) return;

  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'pending_interest',
    "DECIMAL(10,2) DEFAULT 0.00 COMMENT 'Interest added for overdue/partial payment'"
  );
  await addColumnIfMissing(
    pool,
    'machinery_bookings',
    'interest_applied_date',
    'DATE NULL'
  );

  if (!(await tableExists(pool, 'machinery_booking_payments'))) return;

  // Include legacy 'full' for older rows; writers now use 'final_payment'.
  const paymentTypeEnum =
    "ENUM('down_payment','partial','balance_payment','final_payment','full','refund') DEFAULT 'final_payment'";

  if (!(await columnExists(pool, 'machinery_booking_payments', 'payment_type'))) {
    await pool.execute(
      `ALTER TABLE machinery_booking_payments
       ADD COLUMN payment_type ${paymentTypeEnum} AFTER booking_id`
    );
    console.log('✅ Added machinery_booking_payments.payment_type');
  } else {
    const [ptCol] = await pool.execute(
      "SHOW COLUMNS FROM machinery_booking_payments LIKE 'payment_type'"
    );
    const typeDef = (ptCol[0] && ptCol[0].Type) || '';
    const needed = [
      "'partial'",
      "'balance_payment'",
      "'final_payment'",
      "'down_payment'",
      "'full'",
      "'refund'"
    ];
    if (needed.some((v) => !typeDef.includes(v))) {
      await pool.query(
        `ALTER TABLE machinery_booking_payments
         MODIFY COLUMN payment_type ${paymentTypeEnum}`
      );
      console.log('✅ Extended machinery_booking_payments.payment_type enum');
    }
  }

  await addColumnIfMissing(
    pool,
    'machinery_booking_payments',
    'interest_amount',
    'DECIMAL(10,2) DEFAULT 0.00'
  );
  await addColumnIfMissing(
    pool,
    'machinery_booking_payments',
    'interest_applied',
    'TINYINT(1) DEFAULT 0'
  );
  await addColumnIfMissing(
    pool,
    'machinery_booking_payments',
    'interest_season',
    'INT DEFAULT 0'
  );
}

module.exports = { ensureInterestTrackingSchema };
