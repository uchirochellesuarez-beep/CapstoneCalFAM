/**
 * Ensures pending expense workflow columns on machinery_expenses.
 */
const { backfillPendingExpensesForCompletedBookings } = require('../services/pending-expense-service');
async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(pool, table, indexName) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, indexName]
  );
  return rows.length > 0;
}

async function ensurePendingExpenseSchema(pool) {
  if (!(await columnExists(pool, 'machinery_expenses', 'operator_id'))) {
    await pool.execute(
      `ALTER TABLE machinery_expenses
       ADD COLUMN operator_id INT NULL COMMENT 'Assigned operator for booking-linked expenses' AFTER booking_id`
    );
    console.log('✅ Added machinery_expenses.operator_id');
  }

  if (!(await columnExists(pool, 'machinery_expenses', 'expense_status'))) {
    await pool.execute(
      `ALTER TABLE machinery_expenses
       ADD COLUMN expense_status ENUM('Pending', 'Recorded') NOT NULL DEFAULT 'Recorded'
       COMMENT 'Pending = awaiting treasurer entry; Recorded = finalized' AFTER sundries`
    );
    console.log('✅ Added machinery_expenses.expense_status');
  }

  if (!(await columnExists(pool, 'machinery_expenses', 'expense_source'))) {
    await pool.execute(
      `ALTER TABLE machinery_expenses
       ADD COLUMN expense_source ENUM('manual', 'booking') NOT NULL DEFAULT 'manual'
       COMMENT 'manual = treasurer-created; booking = auto from completed rental' AFTER expense_status`
    );
    console.log('✅ Added machinery_expenses.expense_source');
  }

  // Allow pending rows without receipt reference
  try {
    await pool.execute(
      `ALTER TABLE machinery_expenses MODIFY COLUMN reference_number VARCHAR(100) NULL`
    );
  } catch (err) {
    if (err.code !== 'ER_BAD_FIELD_ERROR') {
      console.warn('⚠️ Could not relax reference_number constraint:', err.message);
    }
  }

  try {
    await pool.execute(
      `ALTER TABLE machinery_expenses MODIFY COLUMN total_amount DECIMAL(10, 2) NOT NULL DEFAULT 0`
    );
  } catch (err) {
    console.warn('⚠️ Could not update total_amount default:', err.message);
  }

  if (!(await indexExists(pool, 'machinery_expenses', 'idx_expense_status'))) {
    await pool.execute(
      `CREATE INDEX idx_expense_status ON machinery_expenses (expense_status)`
    );
  }

  if (!(await indexExists(pool, 'machinery_expenses', 'idx_expense_booking_unique'))) {
    try {
      await pool.execute(
        `CREATE UNIQUE INDEX idx_expense_booking_unique ON machinery_expenses (booking_id)`
      );
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') {
        console.warn('⚠️ Could not create unique booking_id index:', err.message);
      }
    }
  }

  // Existing rows are treated as recorded manual expenses
  await pool.execute(`
    UPDATE machinery_expenses
    SET expense_status = 'Recorded',
        expense_source = COALESCE(expense_source, 'manual')
    WHERE expense_status IS NULL OR expense_source IS NULL
  `);

  await backfillPendingExpensesForCompletedBookings();
}

module.exports = { ensurePendingExpenseSchema };
