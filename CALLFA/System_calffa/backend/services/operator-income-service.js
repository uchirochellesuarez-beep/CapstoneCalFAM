const pool = require('../db');

function firstPositiveId(...values) {
  for (const value of values) {
    const id = parseInt(value, 10);
    if (Number.isFinite(id) && id > 0) return id;
  }
  return null;
}

function resolveAssignedOperatorId(row = {}) {
  return firstPositiveId(
    row.booking_operator_id,
    row.booking_assigned_operator_id,
    row.machinery_operator_id,
    row.machinery_assigned_operator_id,
    row.completed_by,
    row.expense_operator_id,
    row.operator_id
  );
}

const BOOKING_OPERATOR_SELECT = `
  SELECT
    mb.id,
    mb.status,
    mb.completed_by,
    mb.completed_date,
    mb.machinery_id,
    mb.barangay_id AS booking_barangay_id,
    mb.assigned_operator_id AS booking_operator_id,
    mi.assigned_operator_id AS machinery_operator_id,
    mi.machinery_name,
    mi.barangay_id,
    op.full_name AS operator_name,
    op.id AS resolved_operator_id
  FROM machinery_bookings mb
  JOIN machinery_inventory mi ON mb.machinery_id = mi.id
  LEFT JOIN farmers op ON COALESCE(mb.assigned_operator_id, mi.assigned_operator_id, mb.completed_by) = op.id
  WHERE mb.id = ?
`;
const {
  createOperatorIncomeNotification,
  formatLocalDate
} = require('./notification-service');
const {
  generateReceiptNumber,
  recordPaymentReceipt,
  ensureReceiptTables
} = require('./receipt-service');

async function findOperatorLaborReceipt(incomeId) {
  const [rows] = await pool.execute(
    `SELECT receipt_number
     FROM payment_receipts
     WHERE module = 'operator_labor'
       AND reference_type = 'operator_income'
       AND reference_id = ?
     ORDER BY id DESC
     LIMIT 1`,
    [incomeId]
  );
  return rows[0]?.receipt_number || null;
}

async function issueOperatorLaborReceipt({
  incomeId,
  operatorId,
  operatorName,
  machineryName,
  laborCost,
  transactionDate,
  bookingId = null,
  expenseId = null,
  barangayId = null,
  recordedBy = null
}) {
  const amount = parseFloat(laborCost) || 0;
  if (!incomeId || amount <= 0) return null;

  await ensureReceiptTables(pool);

  const existing = await findOperatorLaborReceipt(incomeId);
  if (existing) return existing;

  const [opRows] = await pool.execute(
    'SELECT id, full_name, barangay_id FROM farmers WHERE id = ?',
    [operatorId]
  );
  const operator = opRows[0] || {};
  const resolvedName = operatorName || operator.full_name || 'Operator';
  const resolvedBarangay = barangayId || operator.barangay_id || null;
  const machineLabel = machineryName || 'Machinery';
  const paymentDate = transactionDate || formatLocalDate(new Date());
  const receiptNumber = await generateReceiptNumber(pool);

  await recordPaymentReceipt(pool, {
    receiptNumber,
    module: 'operator_labor',
    referenceId: incomeId,
    referenceType: 'operator_income',
    clientName: resolvedName,
    amountPaid: amount,
    remainingBalance: 0,
    paymentMethod: 'Cash',
    paymentDate,
    collectedBy: recordedBy || null,
    barangayId: resolvedBarangay,
    remarks: `Labor compensation — ${machineLabel}`,
    metadata: {
      payment_type: 'operator_labor',
      operator_id: operatorId,
      booking_id: bookingId || null,
      expense_id: expenseId || null,
      machinery_name: machineLabel,
      labor_cost_amount: amount
    }
  });

  return receiptNumber;
}

async function getLaborCostForBooking(bookingId, machineryId) {
  const [byBooking] = await pool.execute(
    `SELECT id, labor_cost, date_of_expense
     FROM machinery_expenses
     WHERE booking_id = ?
     ORDER BY created_at DESC
     LIMIT 1`,
    [bookingId]
  );

  if (byBooking.length > 0) {
    return {
      expenseId: byBooking[0].id,
      laborCost: parseFloat(byBooking[0].labor_cost) || 0,
      transactionDate: byBooking[0].date_of_expense
    };
  }

  const [byMachinery] = await pool.execute(
    `SELECT id, labor_cost, date_of_expense
     FROM machinery_expenses
     WHERE machinery_id = ?
       AND (reference_number = ? OR reference_number LIKE ?)
     ORDER BY created_at DESC
     LIMIT 1`,
    [machineryId, String(bookingId), `%${bookingId}%`]
  );

  if (byMachinery.length > 0) {
    return {
      expenseId: byMachinery[0].id,
      laborCost: parseFloat(byMachinery[0].labor_cost) || 0,
      transactionDate: byMachinery[0].date_of_expense
    };
  }

  return { expenseId: null, laborCost: 0, transactionDate: formatLocalDate(new Date()) };
}

async function generateOperatorIncomeForBooking(bookingId, options = {}) {
  const bookingIdNum = parseInt(bookingId, 10);
  if (!bookingIdNum) {
    return { created: false, reason: 'invalid_booking_id' };
  }

  const [existing] = await pool.execute(
    'SELECT id, labor_cost_amount FROM operator_income WHERE booking_id = ?',
    [bookingIdNum]
  );
  if (existing.length > 0) {
    const existingAmount = parseFloat(existing[0].labor_cost_amount) || 0;
    const newAmount = parseFloat(options.laborCost) || 0;
    if (newAmount > existingAmount && options.expenseId) {
      await pool.execute(
        `UPDATE operator_income
         SET labor_cost_amount = ?, expense_id = ?, operator_id = COALESCE(?, operator_id),
             transaction_date = COALESCE(?, transaction_date), income_status = 'Credited'
         WHERE id = ?`,
        [newAmount, options.expenseId, options.operatorId || null, options.transactionDate || null, existing[0].id]
      );
      const [bookings] = await pool.execute(BOOKING_OPERATOR_SELECT, [bookingIdNum]);
      if (bookings.length > 0) {
        const operatorId = resolveAssignedOperatorId(bookings[0]);
        await createOperatorIncomeNotification({
          operatorId,
          bookingId: bookingIdNum,
          machineryName: bookings[0].machinery_name,
          laborCost: newAmount,
          transactionDate: options.transactionDate
        });
        await issueOperatorLaborReceipt({
          incomeId: existing[0].id,
          operatorId,
          operatorName: bookings[0].operator_name,
          machineryName: bookings[0].machinery_name,
          laborCost: newAmount,
          transactionDate: options.transactionDate || formatLocalDate(new Date()),
          bookingId: bookingIdNum,
          expenseId: options.expenseId,
          barangayId: bookings[0].barangay_id || bookings[0].booking_barangay_id,
          recordedBy: options.recordedBy || null
        });
      }
      return { created: false, updated: true, incomeId: existing[0].id, laborCost: newAmount };
    }
    const [incomeRows] = await pool.execute(
      `SELECT oi.*, mi.machinery_name, mi.barangay_id, op.full_name AS operator_name
       FROM operator_income oi
       LEFT JOIN machinery_inventory mi ON oi.machinery_id = mi.id
       LEFT JOIN farmers op ON oi.operator_id = op.id
       WHERE oi.id = ?`,
      [existing[0].id]
    );
    const incomeRow = incomeRows[0] || {};
    const receiptNumber = await issueOperatorLaborReceipt({
      incomeId: existing[0].id,
      operatorId: incomeRow.operator_id || options.operatorId,
      operatorName: incomeRow.operator_name,
      machineryName: incomeRow.machinery_name,
      laborCost: existingAmount || options.laborCost,
      transactionDate: options.transactionDate || incomeRow.transaction_date,
      bookingId: bookingIdNum,
      expenseId: options.expenseId || incomeRow.expense_id,
      barangayId: incomeRow.barangay_id,
      recordedBy: options.recordedBy || null
    });
    return {
      created: false,
      reason: 'already_exists',
      incomeId: existing[0].id,
      receipt_number: receiptNumber || (await findOperatorLaborReceipt(existing[0].id))
    };
  }

  const [bookings] = await pool.execute(BOOKING_OPERATOR_SELECT, [bookingIdNum]);

  if (bookings.length === 0) {
    return { created: false, reason: 'booking_not_found' };
  }

  const booking = bookings[0];
  const operatorId = resolveAssignedOperatorId(booking) || firstPositiveId(options.operatorId);
  if (!operatorId) {
    return { created: false, reason: 'no_assigned_operator' };
  }

  if (!options.expenseId && booking.status !== 'Completed' && booking.status !== 'Awaiting Final Payment') {
    return { created: false, reason: 'booking_not_completed', operatorId };
  }

  const { expenseId, laborCost, transactionDate } = options.expenseId
    ? {
        expenseId: options.expenseId,
        laborCost: parseFloat(options.laborCost) || 0,
        transactionDate: options.transactionDate || formatLocalDate(new Date())
      }
    : await getLaborCostForBooking(bookingIdNum, booking.machinery_id);

  const txDate =
    transactionDate ||
    (booking.completed_date
      ? formatLocalDate(booking.completed_date)
      : formatLocalDate(new Date()));

  if (!(parseFloat(laborCost) > 0)) {
    return { created: false, reason: 'no_labor_cost', operatorId };
  }

  const [result] = await pool.execute(
    `INSERT INTO operator_income
     (operator_id, booking_id, machinery_id, expense_id, labor_cost_amount, transaction_date, income_status)
     VALUES (?, ?, ?, ?, ?, ?, 'Credited')`,
    [operatorId, bookingIdNum, booking.machinery_id, expenseId, laborCost, txDate]
  );

  await createOperatorIncomeNotification({
    operatorId,
    bookingId: bookingIdNum,
    machineryName: booking.machinery_name,
    laborCost,
    transactionDate: txDate
  });

  const receiptNumber = laborCost > 0
    ? await issueOperatorLaborReceipt({
        incomeId: result.insertId,
        operatorId,
        operatorName: booking.operator_name,
        machineryName: booking.machinery_name,
        laborCost,
        transactionDate: txDate,
        bookingId: bookingIdNum,
        expenseId,
        barangayId: booking.barangay_id || booking.booking_barangay_id,
        recordedBy: options.recordedBy || null
      })
    : null;

  return {
    created: true,
    incomeId: result.insertId,
    operatorId,
    laborCost,
    receipt_number: receiptNumber
  };
}

async function creditOperatorIncomeFromExpense(expenseId, options = {}) {
  const expenseIdNum = parseInt(expenseId, 10);
  const laborCost = parseFloat(options.laborCost);
  if (!expenseIdNum) return { created: false, reason: 'invalid_expense_id' };
  if (!(laborCost > 0)) return { created: false, reason: 'no_labor_cost' };

  const [rows] = await pool.execute(
    `SELECT me.id, me.booking_id, me.machinery_id, me.operator_id AS expense_operator_id,
            me.labor_cost, me.date_of_expense,
            mb.assigned_operator_id AS booking_operator_id,
            mb.completed_by,
            mi.assigned_operator_id AS machinery_operator_id,
            mi.machinery_name,
            mi.barangay_id
     FROM machinery_expenses me
     LEFT JOIN machinery_bookings mb ON me.booking_id = mb.id
     LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
     WHERE me.id = ?`,
    [expenseIdNum]
  );
  if (!rows.length) return { created: false, reason: 'expense_not_found' };

  const row = rows[0];
  const operatorId = resolveAssignedOperatorId(row) || firstPositiveId(options.operatorId);
  if (operatorId) {
    await pool.execute(
      'UPDATE machinery_expenses SET operator_id = ? WHERE id = ? AND (operator_id IS NULL OR operator_id <> ?)',
      [operatorId, expenseIdNum, operatorId]
    );
  }
  if (!operatorId) {
    return { created: false, reason: 'no_assigned_operator' };
  }

  const bookingId = firstPositiveId(options.bookingId, row.booking_id);
  const transactionDate = options.transactionDate || row.date_of_expense || formatLocalDate(new Date());

  if (bookingId) {
    return generateOperatorIncomeForBooking(bookingId, {
      expenseId: expenseIdNum,
      laborCost,
      transactionDate,
      recordedBy: options.recordedBy,
      operatorId
    });
  }

  const [existing] = await pool.execute(
    'SELECT id FROM operator_income WHERE expense_id = ? LIMIT 1',
    [expenseIdNum]
  );
  if (existing.length) {
    await pool.execute(
      `UPDATE operator_income
       SET labor_cost_amount = ?, operator_id = ?, machinery_id = ?, transaction_date = ?, income_status = 'Credited'
       WHERE id = ?`,
      [laborCost, operatorId, row.machinery_id, transactionDate, existing[0].id]
    );
    return { created: false, updated: true, incomeId: existing[0].id, operatorId, laborCost };
  }

  const [result] = await pool.execute(
    `INSERT INTO operator_income
     (operator_id, booking_id, machinery_id, expense_id, labor_cost_amount, transaction_date, income_status)
     VALUES (?, NULL, ?, ?, ?, ?, 'Credited')`,
    [operatorId, row.machinery_id, expenseIdNum, laborCost, transactionDate]
  );

  await createOperatorIncomeNotification({
    operatorId,
    bookingId: expenseIdNum,
    machineryName: row.machinery_name,
    laborCost,
    transactionDate
  });

  const receiptNumber = await issueOperatorLaborReceipt({
    incomeId: result.insertId,
    operatorId,
    machineryName: row.machinery_name,
    laborCost,
    transactionDate,
    bookingId: null,
    expenseId: expenseIdNum,
    barangayId: row.barangay_id,
    recordedBy: options.recordedBy || null
  });

  return {
    created: true,
    incomeId: result.insertId,
    operatorId,
    laborCost,
    receipt_number: receiptNumber
  };
}

async function backfillOperatorIncomeFromLaborExpenses(poolOverride = pool) {
  const db = poolOverride || pool;
  const [rows] = await db.execute(
    `SELECT me.id, me.booking_id, me.labor_cost, me.date_of_expense
     FROM machinery_expenses me
     WHERE me.expense_status = 'Recorded'
       AND COALESCE(me.labor_cost, 0) > 0
       AND NOT EXISTS (
         SELECT 1 FROM operator_income oi
         WHERE oi.income_status = 'Credited'
           AND COALESCE(oi.labor_cost_amount, 0) > 0
           AND (oi.expense_id = me.id OR (me.booking_id IS NOT NULL AND oi.booking_id = me.booking_id))
       )`
  );
  let credited = 0;
  for (const row of rows) {
    const result = await creditOperatorIncomeFromExpense(row.id, {
      laborCost: row.labor_cost,
      bookingId: row.booking_id,
      transactionDate: row.date_of_expense
    });
    if (result.created || result.updated) credited += 1;
  }
  if (credited) {
    console.log(`✅ Credited labor from ${credited} expense${credited === 1 ? '' : 's'} to assigned operators`);
  }
  return credited;
}

async function ensureLaborReceiptForIncomeRow(row) {
  if (!row?.id || !(parseFloat(row.labor_cost_amount) > 0)) {
    return row?.receipt_number || null;
  }
  if (row.receipt_number) return row.receipt_number;

  return issueOperatorLaborReceipt({
    incomeId: row.id,
    operatorId: row.operator_id,
    machineryName: row.machinery_name,
    laborCost: row.labor_cost_amount,
    transactionDate: row.transaction_date,
    bookingId: row.booking_id,
    expenseId: row.expense_id,
    barangayId: row.barangay_id || null
  });
}

async function getOperatorIncomeSummary(operatorId, filters = {}) {
  const params = [operatorId];
  let where = 'WHERE oi.operator_id = ?';

  if (filters.start_date) {
    where += ' AND oi.transaction_date >= ?';
    params.push(filters.start_date);
  }
  if (filters.end_date) {
    where += ' AND oi.transaction_date <= ?';
    params.push(filters.end_date);
  }
  if (filters.machinery_id) {
    where += ' AND oi.machinery_id = ?';
    params.push(parseInt(filters.machinery_id, 10));
  }
  if (filters.booking_status) {
    where += ' AND mb.status = ?';
    params.push(filters.booking_status);
  }

  const [totals] = await pool.execute(
    `SELECT
       COALESCE(SUM(oi.labor_cost_amount), 0) AS total_earnings,
       COALESCE(SUM(CASE WHEN YEAR(oi.transaction_date) = YEAR(CURDATE()) THEN oi.labor_cost_amount ELSE 0 END), 0) AS yearly_earnings,
       COALESCE(SUM(CASE WHEN YEAR(oi.transaction_date) = YEAR(CURDATE()) AND MONTH(oi.transaction_date) = MONTH(CURDATE()) THEN oi.labor_cost_amount ELSE 0 END), 0) AS monthly_earnings,
       COUNT(*) AS total_completed_transactions
     FROM operator_income oi
     LEFT JOIN machinery_bookings mb ON oi.booking_id = mb.id
     ${where}
       AND oi.income_status = 'Credited'`,
    params
  );

  const [perMachinery] = await pool.execute(
    `SELECT
       oi.machinery_id,
       mi.machinery_name,
       mi.machinery_type,
       COALESCE(SUM(oi.labor_cost_amount), 0) AS total_earnings,
       COUNT(*) AS transaction_count
     FROM operator_income oi
     JOIN machinery_inventory mi ON oi.machinery_id = mi.id
     LEFT JOIN machinery_bookings mb ON oi.booking_id = mb.id
     ${where}
       AND oi.income_status = 'Credited'
     GROUP BY oi.machinery_id, mi.machinery_name, mi.machinery_type
     ORDER BY total_earnings DESC`,
    params
  );

  return {
    summary: totals[0] || {
      total_earnings: 0,
      yearly_earnings: 0,
      monthly_earnings: 0,
      total_completed_transactions: 0
    },
    earnings_per_machinery: perMachinery
  };
}

module.exports = {
  formatLocalDate,
  getLaborCostForBooking,
  generateOperatorIncomeForBooking,
  creditOperatorIncomeFromExpense,
  backfillOperatorIncomeFromLaborExpenses,
  resolveAssignedOperatorId,
  getOperatorIncomeSummary,
  issueOperatorLaborReceipt,
  findOperatorLaborReceipt,
  ensureLaborReceiptForIncomeRow
};
