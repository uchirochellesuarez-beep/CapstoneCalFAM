const pool = require('../db');
const { calculateDownPayment, syncMachineryIncomeFromBooking } = require('./booking-workflow');
const { generateReceiptNumber, recordPaymentReceipt } = require('./receipt-service');
const { createPendingExpenseForBooking } = require('./pending-expense-service');
const { formatLocalDate } = require('./notification-service');

async function verifyBalancePaymentSubmission(submissionId, verifiedBy, options = {}) {
  const { receiptNumber: manualReceipt } = options;

  const [subRows] = await pool.execute(
    `SELECT s.id AS submission_id,
            s.booking_id,
            s.farmer_id,
            s.amount,
            s.payment_method,
            s.proof_path,
            s.reference_number,
            s.status AS submission_status,
            s.submitted_at,
            s.verified_by,
            s.verified_at,
            s.receipt_number AS submission_receipt_number,
            s.payment_record_id,
            mb.total_paid,
            mb.remaining_balance,
            mb.total_price,
            mb.status AS booking_status,
            mb.barangay_id,
            f.full_name AS farmer_name,
            mi.machinery_name,
            mi.barangay_id
     FROM machinery_balance_payment_submissions s
     JOIN machinery_bookings mb ON s.booking_id = mb.id
     JOIN farmers f ON mb.farmer_id = f.id
     JOIN machinery_inventory mi ON mb.machinery_id = mi.id
     WHERE s.id = ?`,
    [submissionId]
  );

  if (!subRows.length) {
    const err = new Error('Payment submission not found');
    err.status = 404;
    throw err;
  }

  const sub = subRows[0];
  if (sub.submission_status !== 'Awaiting Payment Verification') {
    const err = new Error('Submission is not awaiting verification');
    err.status = 400;
    throw err;
  }

  const payAmount = parseFloat(sub.amount) || 0;
  const remaining = parseFloat(sub.remaining_balance) || 0;
  if (payAmount <= 0) {
    const err = new Error('Invalid payment amount');
    err.status = 400;
    throw err;
  }
  if (payAmount > remaining + 0.01) {
    const err = new Error(`Payment amount exceeds remaining balance (₱${remaining.toFixed(2)})`);
    err.status = 400;
    throw err;
  }

  const paymentDate = formatLocalDate(new Date());
  const receipt = manualReceipt || (await generateReceiptNumber(pool));
  const newTotalPaid = parseFloat(sub.total_paid || 0) + payAmount;
  const newRemaining = Math.max(0, parseFloat(sub.total_price) - newTotalPaid);
  const isFullPayment = newRemaining <= 0.01;
  const paymentType = isFullPayment ? 'final_payment' : 'partial';

  const [payResult] = await pool.execute(
    `INSERT INTO machinery_booking_payments
     (booking_id, payment_type, payment_date, amount, payment_method, receipt_number, remarks, recorded_by)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      sub.booking_id,
      paymentType,
      paymentDate,
      payAmount,
      sub.payment_method,
      receipt,
      isFullPayment ? 'Final balance payment verified' : 'Partial balance payment verified',
      verifiedBy
    ]
  );

  const paymentStatus = isFullPayment ? 'Paid' : 'Partial';
  const newBookingStatus = 'Completed';

  await pool.execute(
    `UPDATE machinery_bookings
     SET total_paid = ?,
         remaining_balance = ?,
         payment_status = ?,
         payment_date = ?,
         last_payment_date = ?,
         receipt_number = ?,
         status = ?
     WHERE id = ?`,
    [
      newTotalPaid,
      newRemaining,
      paymentStatus,
      paymentDate,
      paymentDate,
      receipt,
      newBookingStatus,
      sub.booking_id
    ]
  );

  await pool.execute(
    `UPDATE machinery_balance_payment_submissions
     SET status = 'Verified',
         verified_by = ?,
         verified_at = NOW(),
         receipt_number = ?,
         payment_record_id = ?
     WHERE id = ?`,
    [verifiedBy, receipt, payResult.insertId, submissionId]
  );

  await syncMachineryIncomeFromBooking(
    pool,
    sub.booking_id,
    verifiedBy,
    isFullPayment
      ? `Final payment — Booking #${sub.booking_id}`
      : `Partial payment — Booking #${sub.booking_id}`
  );

  await recordPaymentReceipt(pool, {
    receiptNumber: receipt,
    module: 'machinery_rental',
    referenceId: sub.booking_id,
    referenceType: 'machinery_booking',
    clientName: sub.farmer_name,
    amountPaid: payAmount,
    remainingBalance: newRemaining,
    paymentMethod: sub.payment_method,
    paymentDate,
    collectedBy: verifiedBy,
    remarks: `Booking #${sub.booking_id} — ${sub.machinery_name}`,
    barangayId: sub.barangay_id,
    metadata: { submission_id: submissionId, payment_record_id: payResult.insertId }
  });

  if (isFullPayment) {
    await pool.execute(
      `UPDATE machinery_bookings
       SET receivable_amount = NULL, receivable_created_at = NULL
       WHERE id = ?`,
      [sub.booking_id]
    );
    await createPendingExpenseForBooking(sub.booking_id);
  }

  return {
    receipt_number: receipt,
    payment_id: payResult.insertId,
    amount_paid: payAmount,
    remaining_balance: newRemaining,
    payment_status: paymentStatus,
    booking_status: newBookingStatus,
    is_full_payment: isFullPayment
  };
}

module.exports = { verifyBalancePaymentSubmission };
