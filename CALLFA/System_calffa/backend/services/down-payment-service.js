const { formatDownPaymentPercentLabel, syncMachineryIncomeFromBooking } = require('./booking-workflow');
const { generateReceiptNumber, recordPaymentReceipt } = require('./receipt-service');
const {
  createBookingStatusNotification,
  createManagerConfirmBookingNotification,
  formatLocalDate
} = require('./notification-service');

/**
 * Shared down-payment verification (treasurer/president).
 */
async function verifyDownPaymentForBooking(pool, bookingId, options = {}) {
  const {
    verifiedBy = null,
    receiptNumber = null
  } = options;

  const [booking] = await pool.execute(
    `SELECT mb.*, f.full_name AS farmer_name, f.role AS booker_role, mi.machinery_name, mi.barangay_id
     FROM machinery_bookings mb
     JOIN farmers f ON mb.farmer_id = f.id
     JOIN machinery_inventory mi ON mb.machinery_id = mi.id
     WHERE mb.id = ?`,
    [bookingId]
  );

  if (booking.length === 0) {
    return { ok: false, status: 404, message: 'Booking not found' };
  }

  const row = booking[0];

  if (row.status === 'Down Payment Verified') {
    return {
      ok: true,
      alreadyVerified: true,
      status: row.status,
      receipt_number: row.receipt_number
    };
  }

  const direct = Boolean(options.allowDirectRecord);
  const allowedStatuses = direct
    ? ['Awaiting Down Payment', 'Payment Rejected', 'Awaiting Payment Verification']
    : ['Awaiting Payment Verification'];

  if (!allowedStatuses.includes(row.status)) {
    return {
      ok: false,
      status: 400,
      message: `Booking is not eligible for down payment verification. Current: ${row.status}`
    };
  }

  const requiredDown = parseFloat(row.down_payment_amount) || 0;
  let downAmount = requiredDown;
  if (options.amount != null && options.amount !== '') {
    const entered = parseFloat(options.amount);
    if (!Number.isFinite(entered) || entered <= 0) {
      return { ok: false, status: 400, message: 'Enter a valid down payment amount.' };
    }
    if (requiredDown > 0 && Math.abs(entered - requiredDown) > 0.01) {
      const pct = formatDownPaymentPercentLabel(row.down_payment_percent);
      return {
        ok: false,
        status: 400,
        message: pct
          ? `Down payment must be ₱${requiredDown.toLocaleString('en-PH', { minimumFractionDigits: 2 })} (${pct}% of total).`
          : `Down payment must be ₱${requiredDown.toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`
      };
    }
    downAmount = Math.round(entered * 100) / 100;
  }
  if (downAmount <= 0) {
    return { ok: false, status: 400, message: 'No down payment amount is set on this booking.' };
  }

  const total = parseFloat(row.total_price) || 0;
  const remainingBalance = Math.round((total - downAmount) * 100) / 100;
  const pctLabel = formatDownPaymentPercentLabel(row.down_payment_percent);
  let paymentDate = formatLocalDate(new Date());
  if (options.paymentDate) {
    const raw = String(options.paymentDate).trim().slice(0, 10);
    if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
      paymentDate = raw;
    }
  }
  const receipt = receiptNumber || (await generateReceiptNumber(pool));
  const paymentMethod = options.paymentMethod || row.down_payment_method || 'Cash';

  if (direct) {
    await pool.execute(
      `UPDATE machinery_bookings
       SET status = 'Awaiting Payment Verification',
           down_payment_method = ?,
           down_payment_reference = COALESCE(?, down_payment_reference),
           down_payment_submitted_at = COALESCE(down_payment_submitted_at, NOW()),
           down_payment_rejection_reason = NULL
       WHERE id = ?`,
      [paymentMethod, options.paymentReference || null, bookingId]
    );
  }

  const downPaymentRemark = pctLabel
    ? (row.machinery_name
      ? `${pctLabel}% down payment verified — ${row.machinery_name}`
      : `${pctLabel}% down payment verified`)
    : (row.machinery_name
      ? `Down payment verified — ${row.machinery_name}`
      : 'Down payment verified');

  await pool.execute(
    `INSERT INTO machinery_booking_payments
     (booking_id, payment_type, payment_date, amount, payment_method, receipt_number, remarks, recorded_by)
     VALUES (?, 'down_payment', ?, ?, ?, ?, ?, ?)`,
    [
      bookingId,
      paymentDate,
      downAmount,
      paymentMethod,
      receipt,
      downPaymentRemark,
      verifiedBy
    ]
  );

  await pool.execute(
    `UPDATE machinery_bookings
     SET status = 'Down Payment Verified',
         down_payment_verified_by = ?,
         down_payment_verified_at = NOW(),
         total_paid = ?,
         remaining_balance = ?,
         payment_status = 'Partial',
         payment_date = ?,
         last_payment_date = ?,
         receipt_number = ?
     WHERE id = ?`,
    [
      verifiedBy,
      downAmount,
      remainingBalance,
      paymentDate,
      paymentDate,
      receipt,
      bookingId
    ]
  );

  const downPaymentLabel = pctLabel
    ? (row.machinery_name
      ? `${pctLabel}% Down Payment — ${row.machinery_name}`
      : `${pctLabel}% Down Payment`)
    : (row.machinery_name
      ? `Down Payment — ${row.machinery_name}`
      : 'Down Payment');

  await syncMachineryIncomeFromBooking(
    pool,
    bookingId,
    verifiedBy,
    downPaymentLabel
  );

  await recordPaymentReceipt(pool, {
    receiptNumber: receipt,
    module: 'machinery_rental',
    referenceId: bookingId,
    referenceType: 'machinery_booking',
    clientName: row.farmer_name,
    amountPaid: downAmount,
    remainingBalance,
    paymentMethod,
    paymentDate,
    collectedBy: verifiedBy,
    barangayId: row.barangay_id,
    remarks: downPaymentLabel,
    metadata: {
      payment_type: 'down_payment',
      booking_id: bookingId,
      machinery_name: row.machinery_name || null
    }
  });

  await createBookingStatusNotification({
    farmerId: row.farmer_id,
    bookingId,
    status: 'Down Payment Verified',
    machineryName: row.machinery_name,
    bookingDate: row.booking_date,
    downPaymentAmount: downAmount,
    downPaymentPercent: row.down_payment_percent
  });

  const [managers] = await pool.execute(
    `SELECT id FROM farmers WHERE role IN ('operation_manager', 'business_manager') AND barangay_id = ? AND status = 'approved'`,
    [row.barangay_id]
  );
  for (const m of managers) {
    await createManagerConfirmBookingNotification({
      managerId: m.id,
      bookingId,
      machineryName: row.machinery_name,
      farmerName: row.farmer_name,
      bookingDate: row.booking_date
    });
  }

  return {
    ok: true,
    status: 'Down Payment Verified',
    receipt_number: receipt,
    booking_id: bookingId
  };
}

/**
 * Treasurer/President records a face-to-face (cash) down payment and verifies it immediately.
 */
async function recordCashDownPaymentForBooking(pool, bookingId, options = {}) {
  return verifyDownPaymentForBooking(pool, bookingId, {
    ...options,
    allowDirectRecord: true,
    paymentMethod: options.paymentMethod || 'Cash'
  });
}

module.exports = { verifyDownPaymentForBooking, recordCashDownPaymentForBooking };
