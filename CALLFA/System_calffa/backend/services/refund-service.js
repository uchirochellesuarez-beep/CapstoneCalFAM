const pool = require('../db');

const REFUND_ELIGIBLE_STATUSES = [
  'Incomplete',
  'Cancelled',
  'Rejected',
  'Expired',
  'Payment Rejected'
];

const OPEN_REFUND_STATUSES = [
  'Refund Requested',
  'Under Review',
  'Approved',
  'Pending'
];

async function generateRefundNumber() {
  const year = new Date().getFullYear();
  await pool.execute(
    `INSERT INTO refund_sequences (year, last_number) VALUES (?, 0)
     ON DUPLICATE KEY UPDATE year = year`,
    [year]
  );
  await pool.execute(
    `UPDATE refund_sequences SET last_number = last_number + 1 WHERE year = ?`,
    [year]
  );
  const [rows] = await pool.execute(
    'SELECT last_number FROM refund_sequences WHERE year = ?',
    [year]
  );
  const seq = String(rows[0]?.last_number || 1).padStart(6, '0');
  return `REF-${year}-${seq}`;
}

function isRefundEligible(booking) {
  if (!booking) return { eligible: false, reason: 'Booking not found' };
  if (booking.status === 'Completed') {
    return { eligible: false, reason: 'Completed rentals are not eligible for down payment refund' };
  }
  if (parseInt(booking.machine_used, 10) === 1) {
    return { eligible: false, reason: 'Machinery service was already rendered' };
  }
  if (!REFUND_ELIGIBLE_STATUSES.includes(booking.status)) {
    return { eligible: false, reason: `Refunds are not available for status: ${booking.status}` };
  }
  const downPaid = parseFloat(booking.total_paid) || parseFloat(booking.down_payment_amount) || 0;
  if (downPaid <= 0 && !booking.down_payment_verified_at) {
    return { eligible: false, reason: 'No verified down payment to refund' };
  }
  return { eligible: true, refundAmount: parseFloat(booking.down_payment_amount) || downPaid };
}

/** SQL fragment: booking alias must be `mb` */
const REFUNDED_BOOKING_NOT_EXISTS_SQL = `
  NOT EXISTS (
    SELECT 1 FROM machinery_booking_refunds r
    WHERE r.booking_id = mb.id
      AND r.refund_status IN ('Refunded', 'Processed')
  )
`;

/** Remove machinery income and zero paid amounts when a down payment is refunded. */
async function reverseMachineryIncomeOnRefund(pool, bookingId) {
  const [rows] = await pool.execute(
    'SELECT total_price FROM machinery_bookings WHERE id = ?',
    [bookingId]
  );
  if (!rows.length) return;

  const totalPrice = parseFloat(rows[0].total_price) || 0;

  await pool.execute('DELETE FROM machinery_income WHERE booking_id = ?', [bookingId]);
  await pool.execute(
    `UPDATE machinery_bookings
     SET total_paid = 0,
         remaining_balance = ?,
         payment_status = 'Refunded',
         receivable_amount = NULL,
         receivable_created_at = NULL
     WHERE id = ?`,
    [totalPrice, bookingId]
  );
}

async function createReceivableOnCompleted(bookingId) {
  const [rows] = await pool.execute(
    `SELECT id, status, remaining_balance, total_paid, total_price, receivable_amount
     FROM machinery_bookings WHERE id = ?`,
    [bookingId]
  );
  if (!rows.length || rows[0].status !== 'Completed') return null;

  const remaining = parseFloat(rows[0].remaining_balance) || 0;
  if (remaining <= 0) {
    await pool.execute(
      `UPDATE machinery_bookings SET receivable_amount = NULL, receivable_created_at = NULL WHERE id = ?`,
      [bookingId]
    );
    return null;
  }

  const arAmount = parseFloat(rows[0].receivable_amount) || remaining;
  if (!rows[0].receivable_amount) {
    await pool.execute(
      `UPDATE machinery_bookings
       SET receivable_amount = ?, receivable_created_at = COALESCE(receivable_created_at, NOW())
       WHERE id = ?`,
      [remaining, bookingId]
    );
  }
  return { receivable_amount: arAmount, remaining_balance: remaining };
}

module.exports = {
  REFUND_ELIGIBLE_STATUSES,
  OPEN_REFUND_STATUSES,
  REFUNDED_BOOKING_NOT_EXISTS_SQL,
  generateRefundNumber,
  isRefundEligible,
  reverseMachineryIncomeOnRefund,
  createReceivableOnCompleted
};
