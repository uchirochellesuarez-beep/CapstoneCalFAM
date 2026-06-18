/**
 * Balance payment submissions + receivable snapshot for machinery rentals.
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

async function ensureBalancePaymentSchema(pool) {
  if (!(await columnExists(pool, 'machinery_bookings', 'receivable_amount'))) {
    await pool.execute(
      `ALTER TABLE machinery_bookings
       ADD COLUMN receivable_amount DECIMAL(10,2) NULL
       COMMENT 'Outstanding balance snapshot when rental completed'`
    );
    console.log('✅ Added machinery_bookings.receivable_amount');
  }

  if (!(await columnExists(pool, 'machinery_bookings', 'receivable_created_at'))) {
    await pool.execute(
      `ALTER TABLE machinery_bookings ADD COLUMN receivable_created_at DATETIME NULL`
    );
    console.log('✅ Added machinery_bookings.receivable_created_at');
  }

  if (!(await tableExists(pool, 'machinery_balance_payment_submissions'))) {
    await pool.execute(`
      CREATE TABLE machinery_balance_payment_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        farmer_id INT NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method ENUM('Cash', 'GCash') NOT NULL,
        proof_path VARCHAR(500) NULL,
        reference_number VARCHAR(100) NULL,
        status ENUM('Awaiting Payment Verification', 'Verified', 'Rejected') DEFAULT 'Awaiting Payment Verification',
        rejection_reason TEXT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_by INT NULL,
        verified_at DATETIME NULL,
        receipt_number VARCHAR(32) NULL,
        payment_record_id INT NULL,
        INDEX idx_booking_status (booking_id, status),
        INDEX idx_status (status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created machinery_balance_payment_submissions table');
  }

  const { ensureReceiptTables } = require('../services/receipt-service');
  await ensureReceiptTables(pool);

  const [ptCol] = await pool.execute(
    "SHOW COLUMNS FROM machinery_booking_payments LIKE 'payment_type'"
  );
  if (ptCol.length > 0) {
    const typeDef = ptCol[0].Type || '';
    const needed = ["'partial'", "'balance_payment'"];
    if (needed.some((v) => !typeDef.includes(v))) {
      await pool.query(
        `ALTER TABLE machinery_booking_payments
         MODIFY COLUMN payment_type ENUM('down_payment','partial','balance_payment','final_payment','refund')
         DEFAULT 'final_payment'`
      );
      console.log('✅ Extended machinery_booking_payments.payment_type enum');
    }
  }
}

module.exports = { ensureBalancePaymentSchema };
