/**
 * Machinery booking workflow constants and helpers for down-payment flow.
 */

const DOWN_PAYMENT_RATE = 0.2;

/** Statuses that reserve machinery capacity on the calendar */
const CALENDAR_BLOCKING_STATUSES = [
  'Booking Confirmed',
  'Assigned to Operator',
  'In Use',
  'Awaiting Final Payment',
  'Completed',
  'Approved' // legacy — treated as reserved until migrated
];

/** Pre-reservation statuses (do not block calendar) */
const PRE_RESERVATION_STATUSES = [
  'Pending',
  'Awaiting Down Payment',
  'Awaiting Payment Verification',
  'Payment Rejected',
  'Down Payment Verified'
];

const BOOKING_STATUS_ENUM_VALUES = [
  'Pending',
  'Unapproved',
  'Awaiting Down Payment',
  'Awaiting Payment Verification',
  'Payment Rejected',
  'Down Payment Verified',
  'Booking Confirmed',
  'Assigned to Operator',
  'Awaiting Final Payment',
  'Approved',
  'Rejected',
  'Expired',
  'Completed',
  'Cancelled',
  'In Use',
  'Incomplete'
];

const EXPIRABLE_DOWN_PAYMENT_STATUSES = [
  'Pending',
  'Unapproved',
  'Awaiting Down Payment',
  'Payment Rejected'
];

function calculateDownPayment(totalPrice) {
  const total = parseFloat(totalPrice) || 0;
  const down = Math.round(total * DOWN_PAYMENT_RATE * 100) / 100;
  const remaining = Math.round((total - down) * 100) / 100;
  return { downPayment: down, remainingBalance: remaining, total };
}

function calendarBlockingStatusesSql() {
  return CALENDAR_BLOCKING_STATUSES.map((s) => `'${s}'`).join(', ');
}

const MACHINERY_BOOKING_ROLES = [
  'farmer',
  'treasurer',
  'president',
  'auditor',
  'operator',
  'operation_manager',
  'business_manager'
];

function canUserBookMachinery(role) {
  const normalized = String(role || '').toLowerCase();
  return MACHINERY_BOOKING_ROLES.includes(normalized) && normalized !== 'agriculturist';
}

function isCrossBarangayBooking(userBarangayId, machineryBarangayId) {
  if (!userBarangayId || !machineryBarangayId) return false;
  return parseInt(userBarangayId, 10) !== parseInt(machineryBarangayId, 10);
}

function shouldUseNonMemberRate(membershipStatus, userBarangayId, machineryBarangayId) {
  return (
    String(membershipStatus || 'member').toLowerCase() === 'non-member' ||
    isCrossBarangayBooking(userBarangayId, machineryBarangayId)
  );
}

function getPaymentVerifierRole(bookerRole) {
  return String(bookerRole || '').toLowerCase() === 'treasurer' ? 'president' : 'treasurer';
}

function canVerifyMachineryPayment(actorRole, bookerRole, actorBarangayId, bookingBarangayId) {
  const role = String(actorRole || '').toLowerCase();
  const booker = String(bookerRole || '').toLowerCase();

  if (role === 'admin') return true;
  if (!actorBarangayId || !bookingBarangayId) return false;
  if (parseInt(actorBarangayId, 10) !== parseInt(bookingBarangayId, 10)) return false;

  return role === getPaymentVerifierRole(booker);
}

function assertCanVerifyMachineryPayment(actor, bookerId, bookerRole, bookingBarangayId, context = 'payment') {
  const isRefund = context === 'refund';

  if (parseInt(actor.id, 10) === parseInt(bookerId, 10)) {
    return {
      ok: false,
      message: isRefund
        ? 'You cannot handle your own refund request.'
        : 'You cannot verify or confirm your own payment.'
    };
  }

  if (!canVerifyMachineryPayment(actor.role, bookerRole, actor.barangay_id, bookingBarangayId)) {
    const requiredRole = getPaymentVerifierRole(bookerRole);
    const label = requiredRole === 'president' ? 'President' : 'Treasurer';
    return {
      ok: false,
      message: isRefund
        ? `Only the ${label} of the same barangay can handle this refund.`
        : `Only the ${label} of the same barangay can verify this payment.`
    };
  }

  return { ok: true };
}

function paymentVerifierBookerFilter(role) {
  const normalized = String(role || '').toLowerCase();
  if (normalized === 'president') return "f.role = 'treasurer'";
  if (normalized === 'treasurer') return "f.role != 'treasurer'";
  return null;
}

/** Upsert machinery_income from booking total_paid (down payment + final payment). */
async function syncMachineryIncomeFromBooking(pool, bookingId, recordedBy, remarks = null) {
  const [refunded] = await pool.execute(
    `SELECT 1 FROM machinery_booking_refunds
     WHERE booking_id = ? AND refund_status IN ('Refunded', 'Processed')
     LIMIT 1`,
    [bookingId]
  );
  if (refunded.length) {
    await pool.execute('DELETE FROM machinery_income WHERE booking_id = ?', [bookingId]);
    return;
  }

  const [rows] = await pool.execute(
    `SELECT machinery_id, total_paid, last_payment_date, payment_date
     FROM machinery_bookings WHERE id = ?`,
    [bookingId]
  );
  if (!rows.length) return;

  const paid = parseFloat(rows[0].total_paid) || 0;
  if (paid <= 0) {
    await pool.execute('DELETE FROM machinery_income WHERE booking_id = ?', [bookingId]);
    return;
  }

  const incomeDate =
    rows[0].last_payment_date ||
    rows[0].payment_date ||
    new Date().toISOString().split('T')[0];

  await pool.execute('DELETE FROM machinery_income WHERE booking_id = ?', [bookingId]);
  await pool.execute(
    `INSERT INTO machinery_income
     (booking_id, machinery_id, income_amount, date_of_income, record_created_by, remarks)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [bookingId, rows[0].machinery_id, paid, incomeDate, recordedBy, remarks]
  );
}

module.exports = {
  DOWN_PAYMENT_RATE,
  CALENDAR_BLOCKING_STATUSES,
  PRE_RESERVATION_STATUSES,
  BOOKING_STATUS_ENUM_VALUES,
  EXPIRABLE_DOWN_PAYMENT_STATUSES,
  MACHINERY_BOOKING_ROLES,
  calculateDownPayment,
  calendarBlockingStatusesSql,
  syncMachineryIncomeFromBooking,
  canUserBookMachinery,
  isCrossBarangayBooking,
  shouldUseNonMemberRate,
  getPaymentVerifierRole,
  canVerifyMachineryPayment,
  assertCanVerifyMachineryPayment,
  paymentVerifierBookerFilter
};
