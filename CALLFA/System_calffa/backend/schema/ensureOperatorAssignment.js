/**
 * Ensures operator assignment columns and operator_income table exist.
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

async function ensureOperatorAssignmentSchema(pool) {
  if (!(await columnExists(pool, 'machinery_inventory', 'assigned_operator_id'))) {
    await pool.execute(
      `ALTER TABLE machinery_inventory
       ADD COLUMN assigned_operator_id INT NULL COMMENT 'Primary operator for this machinery unit' AFTER status`
    );
    console.log('✅ Added machinery_inventory.assigned_operator_id');
  }

  if (!(await columnExists(pool, 'machinery_inventory', 'assigned_by'))) {
    await pool.execute(
      `ALTER TABLE machinery_inventory
       ADD COLUMN assigned_by INT NULL COMMENT 'President who assigned the operator' AFTER assigned_operator_id`
    );
    console.log('✅ Added machinery_inventory.assigned_by');
  }

  if (!(await columnExists(pool, 'machinery_inventory', 'assignment_date'))) {
    await pool.execute(
      `ALTER TABLE machinery_inventory
       ADD COLUMN assignment_date DATE NULL COMMENT 'Date operator was assigned' AFTER assigned_by`
    );
    console.log('✅ Added machinery_inventory.assignment_date');
  }

  if (!(await columnExists(pool, 'machinery_bookings', 'assigned_operator_id'))) {
    await pool.execute(
      `ALTER TABLE machinery_bookings
       ADD COLUMN assigned_operator_id INT NULL COMMENT 'Operator routed when booking was approved' AFTER machinery_id`
    );
    console.log('✅ Added machinery_bookings.assigned_operator_id');
  }

  if (!(await columnExists(pool, 'machinery_expenses', 'booking_id'))) {
    await pool.execute(
      `ALTER TABLE machinery_expenses
       ADD COLUMN booking_id INT NULL COMMENT 'Linked machinery booking for labor cost' AFTER machinery_id`
    );
    console.log('✅ Added machinery_expenses.booking_id');
  }

  if (!(await tableExists(pool, 'operator_income'))) {
    await pool.execute(`
      CREATE TABLE operator_income (
        id INT AUTO_INCREMENT PRIMARY KEY,
        operator_id INT NOT NULL,
        booking_id INT NOT NULL,
        machinery_id INT NOT NULL,
        expense_id INT NULL,
        labor_cost_amount DECIMAL(10, 2) NOT NULL DEFAULT 0,
        transaction_date DATE NOT NULL,
        income_status ENUM('Pending', 'Credited', 'Cancelled') DEFAULT 'Credited',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        UNIQUE KEY unique_operator_booking_income (booking_id),
        INDEX idx_operator_id (operator_id),
        INDEX idx_machinery_id (machinery_id),
        INDEX idx_transaction_date (transaction_date),
        INDEX idx_income_status (income_status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created operator_income table');
  }

  // Backfill inventory assigned_operator_id from active machinery_operators (one per machinery)
  await pool.execute(`
    UPDATE machinery_inventory mi
    INNER JOIN (
      SELECT machinery_id, farmer_id
      FROM machinery_operators
      WHERE status = 'Active'
      GROUP BY machinery_id
    ) mo ON mo.machinery_id = mi.id
    SET mi.assigned_operator_id = mo.farmer_id,
        mi.assignment_date = COALESCE(mi.assignment_date, CURDATE())
    WHERE mi.assigned_operator_id IS NULL
  `);
}

module.exports = { ensureOperatorAssignmentSchema };
