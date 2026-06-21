/**
 * Schema for 20% down payment booking workflow.
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

async function ensureDownPaymentSchema(pool) {
  const { BOOKING_STATUS_ENUM_VALUES } = require('../services/booking-workflow');
  const enumSql = BOOKING_STATUS_ENUM_VALUES.map((v) => `'${v}'`).join(', ');

  const [statusColumn] = await pool.execute("SHOW COLUMNS FROM machinery_bookings LIKE 'status'");
  if (statusColumn.length > 0) {
    const typeDef = statusColumn[0].Type || '';
    const needsUpdate =
      typeof typeDef === 'string' &&
      typeDef.startsWith('enum(') &&
      !BOOKING_STATUS_ENUM_VALUES.every((v) => typeDef.includes(`'${v}'`));

    if (needsUpdate) {
      await pool.query(
        `ALTER TABLE machinery_bookings MODIFY COLUMN status ENUM(${enumSql}) DEFAULT 'Pending'`
      );
      console.log('✅ Updated machinery_bookings.status enum for down-payment workflow');
    }
  }

  const bookingColumns = [
    { name: 'down_payment_amount', sql: 'DECIMAL(10,2) NULL COMMENT \'20% down payment required\'' },
    { name: 'down_payment_method', sql: "ENUM('Cash','GCash') NULL" },
    { name: 'down_payment_proof', sql: 'VARCHAR(500) NULL COMMENT \'Uploaded GCash screenshot path\'' },
    { name: 'down_payment_reference', sql: 'VARCHAR(100) NULL' },
    { name: 'down_payment_submitted_at', sql: 'DATETIME NULL' },
    { name: 'down_payment_verified_by', sql: 'INT NULL' },
    { name: 'down_payment_verified_at', sql: 'DATETIME NULL' },
    { name: 'down_payment_rejection_reason', sql: 'TEXT NULL' },
    { name: 'final_confirmed_by', sql: 'INT NULL' },
    { name: 'final_confirmed_at', sql: 'DATETIME NULL' }
  ];

  for (const col of bookingColumns) {
    if (!(await columnExists(pool, 'machinery_bookings', col.name))) {
      await pool.execute(`ALTER TABLE machinery_bookings ADD COLUMN ${col.name} ${col.sql}`);
      console.log(`✅ Added machinery_bookings.${col.name}`);
    }
  }

  if (!(await columnExists(pool, 'machinery_booking_payments', 'payment_type'))) {
    await pool.execute(
      `ALTER TABLE machinery_booking_payments
       ADD COLUMN payment_type ENUM('down_payment','final_payment','refund') DEFAULT 'final_payment'
       COMMENT 'Payment category' AFTER booking_id`
    );
    console.log('✅ Added machinery_booking_payments.payment_type');
  }

  if (!(await tableExists(pool, 'machinery_booking_refunds'))) {
    await pool.execute(`
      CREATE TABLE machinery_booking_refunds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        farmer_id INT NOT NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        reason TEXT,
        refund_status ENUM('Pending','Processed','Rejected') DEFAULT 'Pending',
        processed_by INT NULL,
        processed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_farmer_id (farmer_id),
        UNIQUE KEY unique_booking_refund (booking_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created machinery_booking_refunds table');
  }

  // Migrate legacy Approved bookings that blocked calendar → Booking Confirmed
  await pool.execute(`
    UPDATE machinery_bookings
    SET status = 'Booking Confirmed'
    WHERE status = 'Approved'
  `);
}

module.exports = { ensureDownPaymentSchema };
