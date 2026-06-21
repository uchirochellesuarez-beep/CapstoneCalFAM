const pool = require('../db');
const {
  createOperatorIncomeNotification,
  formatLocalDate
} = require('./notification-service');

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
         SET labor_cost_amount = ?, expense_id = ?, transaction_date = COALESCE(?, transaction_date), income_status = 'Credited'
         WHERE id = ?`,
        [newAmount, options.expenseId, options.transactionDate || null, existing[0].id]
      );
      const [bookings] = await pool.execute(
        `SELECT mb.*, mi.machinery_name, mi.assigned_operator_id
         FROM machinery_bookings mb
         JOIN machinery_inventory mi ON mb.machinery_id = mi.id
         WHERE mb.id = ?`,
        [bookingIdNum]
      );
      if (bookings.length > 0) {
        const operatorId = bookings[0].assigned_operator_id || bookings[0].completed_by;
        await createOperatorIncomeNotification({
          operatorId,
          bookingId: bookingIdNum,
          machineryName: bookings[0].machinery_name,
          laborCost: newAmount,
          transactionDate: options.transactionDate
        });
      }
      return { created: false, updated: true, incomeId: existing[0].id, laborCost: newAmount };
    }
    return { created: false, reason: 'already_exists', incomeId: existing[0].id };
  }

  const [bookings] = await pool.execute(
    `SELECT mb.*, mi.assigned_operator_id, mi.machinery_name
     FROM machinery_bookings mb
     JOIN machinery_inventory mi ON mb.machinery_id = mi.id
     WHERE mb.id = ?`,
    [bookingIdNum]
  );

  if (bookings.length === 0) {
    return { created: false, reason: 'booking_not_found' };
  }

  const booking = bookings[0];
  if (booking.status !== 'Completed') {
    return { created: false, reason: 'booking_not_completed' };
  }

  const operatorId = booking.assigned_operator_id || booking.completed_by;
  if (!operatorId) {
    return { created: false, reason: 'no_assigned_operator' };
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

  return {
    created: true,
    incomeId: result.insertId,
    operatorId,
    laborCost
  };
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
    params.push(filters.machinery_id);
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
  getOperatorIncomeSummary
};
