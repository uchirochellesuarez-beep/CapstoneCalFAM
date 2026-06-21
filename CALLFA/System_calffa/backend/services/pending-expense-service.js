const pool = require('../db');
const {
  formatLocalDate,
  createTreasurerPendingExpenseNotification
} = require('./notification-service');

async function createPendingExpenseForBooking(bookingId, options = {}) {
  const { skipNotify = false } = options;
  const bookingIdNum = parseInt(bookingId, 10);
  if (!bookingIdNum) {
    return { created: false, reason: 'invalid_booking_id' };
  }

  const [existing] = await pool.execute(
    'SELECT id, expense_status FROM machinery_expenses WHERE booking_id = ?',
    [bookingIdNum]
  );
  if (existing.length > 0) {
    return { created: false, reason: 'expense_exists', expenseId: existing[0].id };
  }

  const [bookings] = await pool.execute(
    `SELECT mb.*,
            mi.machinery_name,
            mi.machinery_type,
            mi.assigned_operator_id,
            mi.barangay_id,
            f.full_name AS farmer_name
     FROM machinery_bookings mb
     JOIN machinery_inventory mi ON mb.machinery_id = mi.id
     JOIN farmers f ON mb.farmer_id = f.id
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

  const operatorId = booking.assigned_operator_id || booking.completed_by || null;
  const expenseDate = booking.completed_date
    ? formatLocalDate(booking.completed_date)
    : formatLocalDate(new Date());

  const particulars = booking.machinery_name || 'Machinery operational expense';

  const [result] = await pool.execute(
    `INSERT INTO machinery_expenses
     (machinery_id, booking_id, operator_id, date_of_expense, particulars, reference_number,
      total_amount, fuel_and_oil, labor_cost, per_diem, repair_and_maintenance, office_supply,
      communication_expense, utilities_expense, sundries, expense_status, expense_source)
     VALUES (?, ?, ?, ?, ?, NULL, 0, 0, 0, 0, 0, 0, 0, 0, 0, 'Pending', 'booking')`,
    [
      booking.machinery_id,
      bookingIdNum,
      operatorId,
      expenseDate,
      particulars
    ]
  );

  if (!skipNotify) {
    await notifyTreasurersForPendingExpense({
      expenseId: result.insertId,
      bookingId: bookingIdNum,
      barangayId: booking.barangay_id,
      machineryName: booking.machinery_name,
      farmerName: booking.farmer_name,
      expenseDate
    });
  }

  return {
    created: true,
    expenseId: result.insertId,
    bookingId: bookingIdNum
  };
}

async function notifyTreasurersForPendingExpense({
  expenseId,
  bookingId,
  barangayId,
  machineryName,
  farmerName,
  expenseDate
}) {
  if (!barangayId) return 0;

  const [treasurers] = await pool.execute(
    `SELECT id FROM farmers WHERE role = 'treasurer' AND barangay_id = ? AND status = 'approved'`,
    [barangayId]
  );

  let notified = 0;
  for (const treasurer of treasurers) {
    const sent = await createTreasurerPendingExpenseNotification({
      treasurerId: treasurer.id,
      expenseId,
      bookingId,
      machineryName,
      farmerName,
      expenseDate
    });
    if (sent) notified += 1;
  }

  return notified;
}

async function backfillPendingExpensesForCompletedBookings() {
  const [rows] = await pool.execute(
    `SELECT mb.id
     FROM machinery_bookings mb
     WHERE mb.status = 'Completed'
       AND COALESCE(mb.machine_used, 0) = 1
       AND NOT EXISTS (
         SELECT 1 FROM machinery_expenses me WHERE me.booking_id = mb.id
       )`
  );

  let created = 0;
  for (const row of rows) {
    const result = await createPendingExpenseForBooking(row.id, { skipNotify: true });
    if (result.created) created += 1;
  }

  if (created > 0) {
    console.log(`✅ Backfilled ${created} pending expense(s) for completed machinery booking(s).`);
  }

  return created;
}

module.exports = {
  createPendingExpenseForBooking,
  notifyTreasurersForPendingExpense,
  backfillPendingExpensesForCompletedBookings
};
