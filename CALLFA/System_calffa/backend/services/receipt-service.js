/**
 * Shared receipt number generation and receipt registry.
 * Format: RCPT-YYYY-000001
 */

const { buildExpenseReceiptLineItems } = require('./expense-receipt-lines');

async function ensureReceiptTables(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS receipt_sequences (
      year INT NOT NULL PRIMARY KEY,
      last_number INT NOT NULL DEFAULT 0,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);

  await pool.execute(`
    CREATE TABLE IF NOT EXISTS payment_receipts (
      id INT AUTO_INCREMENT PRIMARY KEY,
      receipt_number VARCHAR(32) NOT NULL,
      module VARCHAR(50) NOT NULL,
      reference_id INT NOT NULL,
      reference_type VARCHAR(50) NULL,
      client_name VARCHAR(255) NULL,
      amount_paid DECIMAL(12, 2) NOT NULL,
      remaining_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(30) NULL,
      payment_date DATE NOT NULL,
      collected_by INT NULL,
      barangay_id INT NULL,
      remarks TEXT NULL,
      metadata JSON NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uk_receipt_number (receipt_number),
      INDEX idx_module_ref (module, reference_id),
      INDEX idx_payment_date (payment_date)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function generateReceiptNumber(pool) {
  await ensureReceiptTables(pool);
  const year = new Date().getFullYear();

  await pool.execute(
    `INSERT INTO receipt_sequences (year, last_number) VALUES (?, 0)
     ON DUPLICATE KEY UPDATE year = year`,
    [year]
  );

  await pool.execute(
    `UPDATE receipt_sequences SET last_number = last_number + 1 WHERE year = ?`,
    [year]
  );

  const [rows] = await pool.execute(
    'SELECT last_number FROM receipt_sequences WHERE year = ?',
    [year]
  );

  const seq = String(rows[0]?.last_number || 1).padStart(6, '0');
  return `RCPT-${year}-${seq}`;
}

async function recordPaymentReceipt(pool, payload) {
  await ensureReceiptTables(pool);
  const {
    receiptNumber,
    module,
    referenceId,
    referenceType = null,
    clientName = null,
    amountPaid,
    remainingBalance = 0,
    paymentMethod = null,
    paymentDate,
    collectedBy = null,
    barangayId = null,
    remarks = null,
    metadata = null
  } = payload;

  let resolvedBarangayId = barangayId;
  if (!resolvedBarangayId && collectedBy) {
    const [collectorRows] = await pool.execute(
      'SELECT barangay_id FROM farmers WHERE id = ?',
      [collectedBy]
    );
    resolvedBarangayId = collectorRows[0]?.barangay_id || null;
  }

  const [result] = await pool.execute(
    `INSERT INTO payment_receipts
     (receipt_number, module, reference_id, reference_type, client_name,
      amount_paid, remaining_balance, payment_method, payment_date, collected_by, barangay_id, remarks, metadata)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      receiptNumber,
      module,
      referenceId,
      referenceType,
      clientName,
      amountPaid,
      remainingBalance,
      paymentMethod,
      paymentDate,
      collectedBy,
      resolvedBarangayId,
      remarks,
      metadata ? JSON.stringify(metadata) : null
    ]
  );

  return { id: result.insertId, receipt_number: receiptNumber };
}

async function getPaymentReceipt(pool, receiptNumber) {
  const [rows] = await pool.execute(
    `SELECT pr.*,
            f.full_name AS collector_name,
            f.address AS collector_address,
            f.phone_number AS collector_phone,
            f.role AS collector_role,
            b.name AS barangay_name,
            pr.remarks AS payment_for
     FROM payment_receipts pr
     LEFT JOIN farmers f ON pr.collected_by = f.id
     LEFT JOIN barangays b ON COALESCE(pr.barangay_id, f.barangay_id) = b.id
     WHERE pr.receipt_number = ?`,
    [receiptNumber]
  );
  const receipt = rows[0] || null;
  if (receipt?.metadata && typeof receipt.metadata === 'string') {
    try {
      receipt.metadata = JSON.parse(receipt.metadata);
    } catch {
      receipt.metadata = null;
    }
  }

  if (receipt?.module === 'machinery_expense' && receipt.reference_id) {
    const [expRows] = await pool.execute(
      `SELECT me.*, mi.machinery_name, op.full_name AS operator_name
       FROM machinery_expenses me
       LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
       LEFT JOIN farmers op ON me.operator_id = op.id
       WHERE me.id = ?`,
      [receipt.reference_id]
    );
    if (expRows[0]) {
      const expenseRow = expRows[0];
      receipt.metadata = receipt.metadata && typeof receipt.metadata === 'object'
        ? receipt.metadata
        : {};
      receipt.metadata.line_items = buildExpenseReceiptLineItems(expenseRow);
      receipt.metadata.machinery_name = expenseRow.machinery_name || receipt.metadata.machinery_name;
      receipt.metadata.operator_name = expenseRow.operator_name || receipt.metadata.operator_name;
      receipt.metadata.expense_source = expenseRow.expense_source || receipt.metadata.expense_source;
      receipt.metadata.expense_breakdown = {
        fuel_and_oil: expenseRow.fuel_and_oil,
        labor_cost: expenseRow.labor_cost,
        per_diem: expenseRow.per_diem,
        repair_and_maintenance: expenseRow.repair_and_maintenance,
        office_supply: expenseRow.office_supply,
        communication_expense: expenseRow.communication_expense,
        utilities_expense: expenseRow.utilities_expense,
        sundries: expenseRow.sundries,
        total_amount: expenseRow.total_amount,
        booking_id: expenseRow.booking_id,
        operator_id: expenseRow.operator_id
      };
    }
  }

  return receipt;
}

module.exports = {
  ensureReceiptTables,
  generateReceiptNumber,
  recordPaymentReceipt,
  getPaymentReceipt
};
