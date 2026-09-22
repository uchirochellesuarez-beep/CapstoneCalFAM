/**
 * Creates machinery financial/booking tables and columns used by live APIs
 * when a production dump is missing later migrations.
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

async function addColumnIfMissing(pool, table, name, sql) {
  if (!(await tableExists(pool, table))) return;
  if (await columnExists(pool, table, name)) return;
  await pool.execute(`ALTER TABLE \`${table}\` ADD COLUMN ${name} ${sql}`);
  console.log(`✅ Added ${table}.${name}`);
}

async function ensureMachineryCoreTables(pool) {
  if (!(await tableExists(pool, 'machinery_expenses'))) {
    await pool.execute(`
      CREATE TABLE machinery_expenses (
        id INT AUTO_INCREMENT PRIMARY KEY,
        machinery_id INT NOT NULL,
        date_of_expense DATE NOT NULL,
        particulars VARCHAR(255) NOT NULL,
        reference_number VARCHAR(100) NULL,
        total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        fuel_and_oil DECIMAL(10, 2) DEFAULT 0,
        labor_cost DECIMAL(10, 2) DEFAULT 0,
        per_diem DECIMAL(10, 2) DEFAULT 0,
        repair_and_maintenance DECIMAL(10, 2) DEFAULT 0,
        office_supply DECIMAL(10, 2) DEFAULT 0,
        communication_expense DECIMAL(10, 2) DEFAULT 0,
        utilities_expense DECIMAL(10, 2) DEFAULT 0,
        sundries DECIMAL(10, 2) DEFAULT 0,
        record_created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_machinery_id (machinery_id),
        INDEX idx_date (date_of_expense)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created machinery_expenses table');
  }

  if (!(await tableExists(pool, 'machinery_income'))) {
    await pool.execute(`
      CREATE TABLE machinery_income (
        id INT AUTO_INCREMENT PRIMARY KEY,
        machinery_id INT NOT NULL,
        booking_id INT NOT NULL,
        date_of_income DATE NOT NULL,
        income_amount DECIMAL(10, 2) NOT NULL,
        remarks TEXT,
        record_created_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_machinery_id (machinery_id),
        INDEX idx_booking_id (booking_id),
        INDEX idx_date (date_of_income)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created machinery_income table');
  }

  if (!(await tableExists(pool, 'machinery_booking_payments'))) {
    await pool.execute(`
      CREATE TABLE machinery_booking_payments (
        id INT PRIMARY KEY AUTO_INCREMENT,
        booking_id INT NOT NULL,
        payment_date DATE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL,
        payment_method VARCHAR(50) DEFAULT 'cash',
        receipt_number VARCHAR(100),
        remarks TEXT,
        recorded_by INT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_machinery_booking_payments_booking (booking_id),
        INDEX idx_machinery_booking_payments_date (payment_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created machinery_booking_payments table');
  }

  if (!(await tableExists(pool, 'monthly_dues'))) {
    await pool.execute(`
      CREATE TABLE monthly_dues (
        id INT AUTO_INCREMENT PRIMARY KEY,
        farmer_id INT NOT NULL,
        barangay_id INT NOT NULL,
        collection_date DATE NOT NULL,
        amount DECIMAL(10, 2) NOT NULL DEFAULT 120.00,
        collected_by INT NOT NULL,
        collector_role VARCHAR(20) NOT NULL,
        period_start DATE NOT NULL,
        period_end DATE NOT NULL,
        payment_method VARCHAR(50),
        remarks TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_farmer_id (farmer_id),
        INDEX idx_barangay_id (barangay_id),
        INDEX idx_collection_date (collection_date)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created monthly_dues table');
  }

  await addColumnIfMissing(pool, 'farmers', 'address', 'TEXT NULL');

  const bookingColumns = [
    { name: 'completed_by', sql: 'INT NULL' },
    { name: 'completed_date', sql: 'TIMESTAMP NULL' },
    { name: 'barangay_id', sql: 'INT NULL' },
    { name: 'payment_status', sql: "VARCHAR(32) DEFAULT 'Unpaid'" },
    { name: 'total_paid', sql: 'DECIMAL(10,2) DEFAULT 0.00' },
    { name: 'remaining_balance', sql: 'DECIMAL(10,2) DEFAULT 0.00' },
    { name: 'receipt_number', sql: 'VARCHAR(100) NULL' },
    { name: 'payment_date', sql: 'DATE NULL' },
    { name: 'last_payment_date', sql: 'DATE NULL' },
    { name: 'service_location', sql: 'VARCHAR(255) NULL' },
    { name: 'area_size', sql: 'DECIMAL(10,2) NULL' },
    { name: 'area_unit', sql: "VARCHAR(50) NULL DEFAULT 'hectares'" }
  ];

  for (const col of bookingColumns) {
    await addColumnIfMissing(pool, 'machinery_bookings', col.name, col.sql);
  }

  await addColumnIfMissing(pool, 'machinery_inventory', 'barangay_id', 'INT NULL');
}

module.exports = { ensureMachineryCoreTables };
