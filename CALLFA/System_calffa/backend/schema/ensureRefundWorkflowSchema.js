/**
 * Ensures machinery down-payment refund tables and columns exist.
 * Farmers can request refunds when a paid booking ends Incomplete / Expired / Cancelled
 * (slot lost or service not completed) without machine use.
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

async function ensureRefundWorkflowSchema(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS refund_sequences (
      year INT NOT NULL PRIMARY KEY,
      last_number INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  if (!(await tableExists(pool, 'machinery_booking_refunds'))) {
    await pool.execute(`
      CREATE TABLE machinery_booking_refunds (
        id INT AUTO_INCREMENT PRIMARY KEY,
        booking_id INT NOT NULL,
        farmer_id INT NOT NULL,
        refund_number VARCHAR(32) NULL,
        refund_amount DECIMAL(10,2) NOT NULL,
        original_down_payment DECIMAL(10,2) NULL,
        machinery_id INT NULL,
        machinery_name VARCHAR(255) NULL,
        farmer_name VARCHAR(255) NULL,
        reason TEXT,
        refund_reason TEXT NULL,
        refund_status ENUM(
          'Refund Requested','Under Review','Approved','Rejected','Refunded',
          'Pending','Processed'
        ) DEFAULT 'Refund Requested',
        requested_at DATETIME NULL,
        reviewed_by INT NULL,
        reviewed_at DATETIME NULL,
        approved_by INT NULL,
        rejection_reason TEXT NULL,
        refund_date DATE NULL,
        processed_by INT NULL,
        processed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_booking_id (booking_id),
        INDEX idx_farmer_id (farmer_id),
        UNIQUE KEY unique_booking_refund (booking_id),
        UNIQUE KEY uk_refund_number (refund_number)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created machinery_booking_refunds table');
  }

  const refundColumns = [
    { name: 'refund_number', sql: 'VARCHAR(32) NULL' },
    { name: 'machinery_id', sql: 'INT NULL' },
    { name: 'machinery_name', sql: 'VARCHAR(255) NULL' },
    { name: 'original_down_payment', sql: 'DECIMAL(10,2) NULL' },
    { name: 'refund_reason', sql: 'TEXT NULL' },
    { name: 'requested_at', sql: 'DATETIME NULL' },
    { name: 'reviewed_by', sql: 'INT NULL' },
    { name: 'reviewed_at', sql: 'DATETIME NULL' },
    { name: 'approved_by', sql: 'INT NULL' },
    { name: 'refund_date', sql: 'DATE NULL' },
    { name: 'rejection_reason', sql: 'TEXT NULL' },
    { name: 'farmer_name', sql: 'VARCHAR(255) NULL' }
  ];

  for (const col of refundColumns) {
    if (!(await columnExists(pool, 'machinery_booking_refunds', col.name))) {
      await pool.execute(`ALTER TABLE machinery_booking_refunds ADD COLUMN ${col.name} ${col.sql}`);
      console.log(`✅ Added machinery_booking_refunds.${col.name}`);
    }
  }

  const [statusCol] = await pool.execute(
    "SHOW COLUMNS FROM machinery_booking_refunds LIKE 'refund_status'"
  );
  if (statusCol.length > 0) {
    const typeDef = statusCol[0].Type || '';
    const needed = [
      "'Refund Requested'",
      "'Under Review'",
      "'Approved'",
      "'Rejected'",
      "'Refunded'"
    ];
    if (needed.some((v) => !typeDef.includes(v))) {
      await pool.query(`
        ALTER TABLE machinery_booking_refunds
        MODIFY COLUMN refund_status ENUM(
          'Refund Requested','Under Review','Approved','Rejected','Refunded',
          'Pending','Processed'
        ) DEFAULT 'Refund Requested'
      `);
      await pool.execute(`
        UPDATE machinery_booking_refunds
        SET refund_status = 'Refund Requested'
        WHERE refund_status = 'Pending'
      `);
      await pool.execute(`
        UPDATE machinery_booking_refunds
        SET refund_status = 'Refunded'
        WHERE refund_status = 'Processed'
      `);
      console.log('✅ Extended machinery_booking_refunds.refund_status enum');
    }
  }

  const [idx] = await pool.execute(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'machinery_booking_refunds'
       AND INDEX_NAME = 'uk_refund_number'`
  );
  if (idx.length === 0) {
    await pool.execute(`
      ALTER TABLE machinery_booking_refunds
      ADD UNIQUE INDEX uk_refund_number (refund_number)
    `).catch(() => {});
  }

  // Legacy: operator-complete bookings that used Awaiting Final Payment → Completed + AR
  const [legacy] = await pool.execute(
    `SELECT COUNT(*) AS cnt FROM machinery_bookings
     WHERE status = 'Awaiting Final Payment' AND COALESCE(machine_used, 0) = 1`
  );
  if (legacy[0]?.cnt > 0) {
    await pool.execute(`
      UPDATE machinery_bookings
      SET status = 'Completed',
          receivable_amount = COALESCE(receivable_amount, remaining_balance),
          receivable_created_at = COALESCE(receivable_created_at, NOW())
      WHERE status = 'Awaiting Final Payment' AND COALESCE(machine_used, 0) = 1
    `);
    console.log(`✅ Migrated ${legacy[0].cnt} legacy Awaiting Final Payment booking(s) to Completed`);
  }

  // Keep income consistent for already-refunded bookings
  await pool.execute(`
    DELETE minc FROM machinery_income minc
    INNER JOIN machinery_booking_refunds r ON r.booking_id = minc.booking_id
    WHERE r.refund_status IN ('Refunded', 'Processed')
  `);

  // payment_status may need Refunded for processed refunds
  const [payStatusCol] = await pool.execute(
    "SHOW COLUMNS FROM machinery_bookings LIKE 'payment_status'"
  );
  if (payStatusCol.length > 0) {
    const typeDef = String(payStatusCol[0].Type || '');
    if (!typeDef.includes("'Refunded'")) {
      await pool.query(`
        ALTER TABLE machinery_bookings
        MODIFY COLUMN payment_status ENUM('Unpaid','Partial','Paid','Refunded') DEFAULT 'Unpaid'
      `);
      console.log('✅ Extended machinery_bookings.payment_status with Refunded');
    }
  }

  await pool.execute(`
    UPDATE machinery_bookings mb
    INNER JOIN machinery_booking_refunds r ON r.booking_id = mb.id
    SET mb.total_paid = 0,
        mb.payment_status = 'Refunded',
        mb.receivable_amount = NULL,
        mb.receivable_created_at = NULL
    WHERE r.refund_status IN ('Refunded', 'Processed')
      AND COALESCE(mb.total_paid, 0) > 0
  `);
}

module.exports = { ensureRefundWorkflowSchema };
