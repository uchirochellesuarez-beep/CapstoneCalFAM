/**
 * Machinery booking workflow constants and helpers.
 * Farmer request → manager approval → (optional barangay down payment) → operator completes → treasurer collects remaining payment.
 */

const { parseDownPaymentPercent } = require('./down-payment-settings-service');

/** Statuses that reserve machinery capacity on the calendar */
const CALENDAR_BLOCKING_STATUSES = [
  'Booking Confirmed',
  'Assigned to Operator',
  'In Use',
  'Awaiting Final Payment',
  'Completed',
  'Approved'
];

/** Pre-reservation statuses (do not block calendar) */
const PRE_RESERVATION_STATUSES = [
  'Pending',
  'Unapproved',
  'Awaiting Down Payment',
  'Awaiting Payment Verification',
  'Payment Rejected',
  'Down Payment Verified'
];

/** Bookings the assigned operator can process */
const OPERATOR_WORK_STATUSES = [
  'Approved',
  'Assigned to Operator',
  'Booking Confirmed',
  'In Use'
];

const DOWN_PAYMENT_WORKFLOW_STATUSES = [
  'Awaiting Down Payment',
  'Awaiting Payment Verification',
  'Payment Rejected',
  'Down Payment Verified'
];

const LEGACY_DOWN_PAYMENT_STATUSES = DOWN_PAYMENT_WORKFLOW_STATUSES;

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

function formatDownPaymentPercentLabel(percent) {
  const pct = parseDownPaymentPercent(percent);
  if (pct == null) return null;
  return Number.isInteger(pct) ? String(pct) : String(pct);
}

function calculateDownPayment(totalPrice, percent) {
  const total = parseFloat(totalPrice) || 0;
  const pct = parseDownPaymentPercent(percent);
  if (pct == null) {
    return { downPayment: 0, remainingBalance: total, total, percent: null };
  }
  const down = Math.round(total * (pct / 100) * 100) / 100;
  const remaining = Math.round((total - down) * 100) / 100;
  return { downPayment: down, remainingBalance: remaining, total, percent: pct };
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

function canCreateBookingOnBehalf(role) {
  const normalized = String(role || '').toLowerCase();
  return ['operation_manager', 'business_manager', 'admin'].includes(normalized);
}

function operatorWorkStatusesSql() {
  return OPERATOR_WORK_STATUSES.map((s) => `'${s}'`).join(', ');
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
  CALENDAR_BLOCKING_STATUSES,
  PRE_RESERVATION_STATUSES,
  OPERATOR_WORK_STATUSES,
  DOWN_PAYMENT_WORKFLOW_STATUSES,
  LEGACY_DOWN_PAYMENT_STATUSES,
  BOOKING_STATUS_ENUM_VALUES,
  EXPIRABLE_DOWN_PAYMENT_STATUSES,
  parseDownPaymentPercent,
  formatDownPaymentPercentLabel,
  MACHINERY_BOOKING_ROLES,
  calculateDownPayment,
  calendarBlockingStatusesSql,
  operatorWorkStatusesSql,
  syncMachineryIncomeFromBooking,
  canUserBookMachinery,
  canCreateBookingOnBehalf,
  isCrossBarangayBooking,
  shouldUseNonMemberRate,
  getPaymentVerifierRole,
  canVerifyMachineryPayment,
  assertCanVerifyMachineryPayment,
  paymentVerifierBookerFilter
};
