const path = require('path');
const fs = require('fs');
const { generateReceiptNumber, recordPaymentReceipt } = require('./receipt-service');
const { createPendingExpenseForBooking } = require('./pending-expense-service');
const { formatLocalDate, getTodayDateString } = require('../utils/philippinesTime');
const {
  upsertNotification,
  createTreasurerGcashPaymentSubmittedNotification,
  createBookingStatusNotification
} = require('./notification-service');
const { verifyDownPaymentForBooking } = require('./down-payment-service');
const { calculatePartialPaymentInterest } = require('./machinery-interest-service');

function toPublicUploadPath(absOrRel) {
  const normalized = String(absOrRel || '').replace(/\\/g, '/');
  const marker = '/uploads/';
  const idx = normalized.lastIndexOf(marker);
  if (idx >= 0) return normalized.slice(idx);
  if (normalized.startsWith('uploads/')) return `/${normalized}`;
  return normalized.startsWith('/') ? normalized : `/${normalized}`;
}

function unlinkQuiet(filePath) {
  if (!filePath) return;
  try {
    const abs = path.isAbsolute(filePath)
      ? filePath
      : path.join(__dirname, '..', filePath.replace(/^\//, ''));
    if (fs.existsSync(abs)) fs.unlinkSync(abs);
  } catch {
    /* ignore */
  }
}

async function getActiveQr(pool, barangayId) {
  const bid = parseInt(barangayId, 10);
  if (!bid) return null;
  const [rows] = await pool.execute(
    `SELECT q.*, f.full_name AS uploaded_by_name
     FROM gcash_qr_inventory q
     LEFT JOIN farmers f ON q.uploaded_by = f.id
     WHERE q.barangay_id = ? AND q.is_active = 1
     ORDER BY q.id DESC
     LIMIT 1`,
    [bid]
  );
  return rows[0] || null;
}

async function findBarangayTreasurers(pool, barangayId, excludeFarmerId = null) {
  const params = [barangayId];
  let sql = `SELECT id FROM farmers
             WHERE role = 'treasurer' AND barangay_id = ? AND status = 'approved'`;
  if (excludeFarmerId) {
    sql += ' AND id <> ?';
    params.push(excludeFarmerId);
  }
  const [rows] = await pool.execute(sql, params);
  return rows;
}

async function notifyTreasurersOfSubmission(pool, {
  barangayId,
  farmerId,
  farmerName,
  transactionType,
  referenceNumber,
  submissionId
}) {
  const treasurers = await findBarangayTreasurers(pool, barangayId, farmerId);
  const typeLabel = transactionType === 'loan' ? 'Loan' : 'Machinery';
  const refLabel = referenceNumber || `#${submissionId}`;
  for (const t of treasurers) {
    await createTreasurerGcashPaymentSubmittedNotification({
      treasurerId: t.id,
      referenceType: 'gcash_payment_submission',
      referenceId: submissionId,
      farmerName,
      typeLabel,
      refLabel
    });
  }
}

async function notifyFarmerResult({
  farmerId,
  transactionType,
  submissionId,
  verified,
  amountPaid,
  receiptNumber,
  reason
}) {
  const typeLabel = transactionType === 'loan' ? 'loan' : 'machinery';
  if (verified) {
    return upsertNotification({
      farmer_id: farmerId,
      reference_type: 'gcash_payment_submission',
      reference_id: submissionId,
      notification_type: 'gcash_payment_verified',
      title: 'GCash Payment Verified',
      message: `Your GCash ${typeLabel} payment of ₱${Number(amountPaid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })} was confirmed. Receipt ${receiptNumber}.`,
      due_date: formatLocalDate(new Date()),
      trigger_date: formatLocalDate(new Date())
    });
  }
  return upsertNotification({
    farmer_id: farmerId,
    reference_type: 'gcash_payment_submission',
    reference_id: submissionId,
    notification_type: 'gcash_payment_rejected',
    title: 'GCash Payment Rejected',
    message: reason
      ? `Your GCash ${typeLabel} payment proof was rejected. Reason: ${reason}. You may submit a new screenshot.`
      : `Your GCash ${typeLabel} payment proof was rejected. You may submit a new screenshot.`,
    due_date: formatLocalDate(new Date()),
    trigger_date: formatLocalDate(new Date())
  });
}

async function getPendingSubmission(pool, farmerId, transactionType, referenceId) {
  const [rows] = await pool.execute(
    `SELECT * FROM gcash_payment_submissions
     WHERE farmer_id = ? AND transaction_type = ? AND reference_id = ?
       AND status = 'pending_verification'
     ORDER BY id DESC
     LIMIT 1`,
    [farmerId, transactionType, referenceId]
  );
  return rows[0] || null;
}

async function loadLoanForPayment(pool, loanId, farmerId) {
  const [rows] = await pool.execute(
    `SELECT l.id, l.farmer_id, l.barangay_id, l.status, l.loan_amount, l.loan_type,
            l.total_paid, l.remaining_balance, l.due_date, l.pending_penalty, l.principal_amount,
            f.full_name AS farmer_name, f.reference_number AS farmer_reference, f.role AS applicant_role
     FROM loans l
     JOIN farmers f ON l.farmer_id = f.id
     WHERE l.id = ? AND l.farmer_id = ?`,
    [loanId, farmerId]
  );
  return rows[0] || null;
}

async function loadBookingForPayment(pool, bookingId, farmerId) {
  const [rows] = await pool.execute(
    `SELECT mb.id, mb.farmer_id, mb.total_price, mb.total_paid, mb.remaining_balance,
            mb.pending_interest, mb.status, mb.booking_date, mb.machinery_id,
            mb.down_payment_amount, mb.down_payment_percent, mb.down_payment_verified_at,
            mb.down_payment_method, mb.down_payment_proof,
            f.full_name AS farmer_name, f.reference_number AS farmer_reference, f.barangay_id AS farmer_barangay_id,
            mi.barangay_id AS machinery_barangay_id, mi.machinery_name,
            COALESCE(mi.interest_rate, 0) AS machinery_interest_rate
     FROM machinery_bookings mb
     JOIN farmers f ON mb.farmer_id = f.id
     LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
     WHERE mb.id = ? AND mb.farmer_id = ?`,
    [bookingId, farmerId]
  );
  return rows[0] || null;
}

async function applyMachineryCollection(pool, {
  booking,
  amount,
  paymentDate,
  recordedBy,
  remarks,
  submissionId
}) {
  const bookingId = booking.id;
  const currentTotalPaid = parseFloat(booking.total_paid) || 0;
  let totalPrice = parseFloat(booking.total_price) || 0;
  const collectionAmt = parseFloat(amount);
  const existingInterest = parseFloat(booking.pending_interest) || 0;
  const machineryInterestRate = parseFloat(booking.machinery_interest_rate) || 0;

  const initialRemainingBalance = totalPrice - currentTotalPaid;
  const isPartialPayment = collectionAmt < (initialRemainingBalance - 0.01);
  const finalPaymentType = isPartialPayment ? 'partial' : 'final_payment';

  let interestAmt = 0;
  if (isPartialPayment && existingInterest <= 0) {
    interestAmt = calculatePartialPaymentInterest(totalPrice, machineryInterestRate);
  }

  if (interestAmt > 0) {
    totalPrice += interestAmt;
    await pool.execute(
      `UPDATE machinery_bookings SET total_price = ?, pending_interest = ?, interest_applied_date = ? WHERE id = ?`,
      [totalPrice, interestAmt, paymentDate, bookingId]
    );
  }

  const remainingBalance = totalPrice - currentTotalPaid;
  if (collectionAmt > remainingBalance + 0.01) {
    const err = new Error(
      `Amount paid (₱${collectionAmt.toFixed(2)}) exceeds remaining balance (₱${remainingBalance.toFixed(2)})`
    );
    err.statusCode = 400;
    throw err;
  }

  const receiptNum = await generateReceiptNumber(pool);
  const newTotalPaid = currentTotalPaid + collectionAmt;
  const actualInterestAmount = interestAmt > 0 ? interestAmt : 0;
  const actualInterestApplied = interestAmt > 0 ? 1 : 0;
  const actualInterestSeason = interestAmt > 0 ? 1 : 0;

  const [result] = await pool.execute(
    `INSERT INTO machinery_booking_payments
     (booking_id, payment_date, amount, payment_method, receipt_number, remarks, recorded_by, payment_type, interest_amount, interest_applied, interest_season)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      bookingId,
      paymentDate,
      collectionAmt,
      'GCash',
      receiptNum,
      remarks,
      recordedBy,
      finalPaymentType,
      actualInterestAmount,
      actualInterestApplied,
      actualInterestSeason
    ]
  );

  let paymentStatus = 'Unpaid';
  if (newTotalPaid >= totalPrice) paymentStatus = 'Paid';
  else if (newTotalPaid > 0) paymentStatus = 'Partial';

  const newRemainingBalance = totalPrice - newTotalPaid;
  const bookingStatusUpdate = paymentStatus === 'Paid' ? ", status = 'Completed'" : '';

  await pool.execute(
    `UPDATE machinery_bookings
     SET total_paid = ?, remaining_balance = ?, payment_status = ?,
         payment_date = ?, last_payment_date = ?, receipt_number = ?${bookingStatusUpdate}
     WHERE id = ?`,
    [newTotalPaid, newRemainingBalance, paymentStatus, paymentDate, paymentDate, receiptNum, bookingId]
  );

  await pool.execute('DELETE FROM machinery_income WHERE booking_id = ?', [bookingId]);
  await pool.execute(
    `INSERT INTO machinery_income
     (booking_id, machinery_id, income_amount, date_of_income, record_created_by)
     SELECT ?, mb.machinery_id, mb.total_paid, ?, ?
     FROM machinery_bookings mb
     WHERE mb.id = ?`,
    [bookingId, paymentDate, recordedBy, bookingId]
  );

  const barangayId = booking.machinery_barangay_id || booking.farmer_barangay_id || null;
  await recordPaymentReceipt(pool, {
    receiptNumber: receiptNum,
    module: 'machinery_collection',
    referenceId: bookingId,
    referenceType: 'machinery_booking',
    clientName: booking.farmer_name,
    amountPaid: collectionAmt,
    remainingBalance: newRemainingBalance,
    paymentMethod: 'GCash',
    paymentDate,
    collectedBy: recordedBy,
    barangayId,
    remarks: remarks || `GCash machinery payment — Booking #${bookingId}`,
    metadata: {
      gcash_submission_id: submissionId,
      transaction_type: 'machinery',
      reference_number: booking.farmer_reference || String(bookingId),
      verified_at: new Date().toISOString()
    }
  });

  await createPendingExpenseForBooking(bookingId);

  return {
    receipt_number: receiptNum,
    payment_id: result.insertId,
    remaining_balance: newRemainingBalance
  };
}

async function applyLoanPayment(pool, {
  loan,
  amount,
  paymentDate,
  recordedBy,
  remarks,
  submissionId
}) {
  const validStatuses = ['approved', 'active', 'overdue'];
  if (!validStatuses.includes(loan.status)) {
    const err = new Error(`Cannot record payment for a ${loan.status} loan`);
    err.statusCode = 400;
    throw err;
  }

  const paymentAmount = parseFloat(amount);
  const currentRemaining = parseFloat(loan.remaining_balance) || parseFloat(loan.loan_amount) || 0;
  if (paymentAmount > currentRemaining + 0.01) {
    const err = new Error(
      `Amount paid (₱${paymentAmount.toLocaleString()}) exceeds remaining balance (₱${currentRemaining.toLocaleString()})`
    );
    err.statusCode = 400;
    throw err;
  }

  const receiptNum = await generateReceiptNumber(pool);
  const [paymentResult] = await pool.execute(
    `INSERT INTO loan_payments (loan_id, amount, payment_date, payment_method, reference_number, remarks, recorded_by, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, NOW())`,
    [loan.id, paymentAmount, paymentDate, 'GCash', receiptNum, remarks || null, recordedBy]
  );

  const currentTotalPaid = parseFloat(loan.total_paid) || 0;
  const loanAmount = parseFloat(loan.loan_amount);
  const currentPendingPenalty = parseFloat(loan.pending_penalty) || 0;

  let penaltyPaid = 0;
  let principalPaid = paymentAmount;
  if (currentPendingPenalty > 0) {
    if (paymentAmount >= currentPendingPenalty) {
      penaltyPaid = currentPendingPenalty;
      principalPaid = paymentAmount - currentPendingPenalty;
    } else {
      penaltyPaid = paymentAmount;
      principalPaid = 0;
    }
  }

  const newTotalPaid = currentTotalPaid + principalPaid;
  const newPendingPenalty = Math.max(0, currentPendingPenalty - penaltyPaid);
  const newRemainingBalance = Math.max(0, loanAmount + newPendingPenalty - newTotalPaid);
  const isPaidOff = newRemainingBalance <= 0 && newPendingPenalty <= 0;
  const todayStr = getTodayDateString();

  let newStatus;
  if (isPaidOff) {
    newStatus = 'paid';
  } else {
    const isOverdue = loan.due_date && String(loan.due_date).slice(0, 10) < todayStr && newRemainingBalance > 0;
    if (isOverdue) newStatus = 'overdue';
    else if (loan.status === 'approved') newStatus = 'active';
    else newStatus = loan.status;
  }

  const paidDate = isPaidOff ? paymentDate : null;
  await pool.execute(
    `UPDATE loans
     SET total_paid = ?, remaining_balance = ?, pending_penalty = ?, status = ?, paid_date = ?, last_payment_date = NOW()
     WHERE id = ?`,
    [newTotalPaid, newRemainingBalance, newPendingPenalty, newStatus, paidDate, loan.id]
  );

  const loanTypeLabel = (loan.loan_type || 'Loan').charAt(0).toUpperCase() + (loan.loan_type || 'loan').slice(1);
  await recordPaymentReceipt(pool, {
    receiptNumber: receiptNum,
    module: 'admin_loan',
    referenceId: parseInt(loan.id, 10),
    referenceType: 'loan',
    clientName: loan.farmer_name,
    amountPaid: paymentAmount,
    remainingBalance: newRemainingBalance,
    paymentMethod: 'GCash',
    paymentDate,
    collectedBy: recordedBy,
    barangayId: loan.barangay_id,
    remarks: remarks || `GCash ${loanTypeLabel} loan payment — Loan #${loan.id}`,
    metadata: {
      gcash_submission_id: submissionId,
      transaction_type: 'loan',
      reference_number: loan.farmer_reference || String(loan.id),
      verified_at: new Date().toISOString()
    }
  });

  return {
    receipt_number: receiptNum,
    payment_id: paymentResult.insertId,
    remaining_balance: newRemainingBalance
  };
}

async function saveQrImage(pool, { barangayId, userId, file }) {
  const previous = await getActiveQr(pool, barangayId);
  if (previous) {
    await pool.execute(
      'UPDATE gcash_qr_inventory SET is_active = 0 WHERE barangay_id = ? AND is_active = 1',
      [barangayId]
    );
    unlinkQuiet(previous.image_path);
  }

  const imagePath = toPublicUploadPath(file.path);
  const [result] = await pool.execute(
    `INSERT INTO gcash_qr_inventory
     (barangay_id, image_path, original_filename, uploaded_by, is_active)
     VALUES (?, ?, ?, ?, 1)`,
    [barangayId, imagePath, file.originalname || null, userId]
  );

  return getActiveQr(pool, barangayId) || {
    id: result.insertId,
    barangay_id: barangayId,
    image_path: imagePath
  };
}

async function deactivateQr(pool, barangayId) {
  const current = await getActiveQr(pool, barangayId);
  if (!current) return false;
  await pool.execute(
    'UPDATE gcash_qr_inventory SET is_active = 0 WHERE id = ?',
    [current.id]
  );
  unlinkQuiet(current.image_path);
  return true;
}

async function submitFarmerProof(pool, {
  user,
  transactionType,
  referenceId,
  paymentDate,
  file
}) {
  const type = String(transactionType || '').toLowerCase() === 'loan' ? 'loan' : 'machinery';
  const refId = parseInt(referenceId, 10);
  if (!refId) {
    const err = new Error('Transaction reference is required');
    err.statusCode = 400;
    throw err;
  }

  const existing = await getPendingSubmission(pool, user.id, type, refId);
  if (existing) {
    unlinkQuiet(file.path);
    const err = new Error('You already have a GCash payment awaiting treasurer verification.');
    err.statusCode = 400;
    throw err;
  }

  const qr = await getActiveQr(pool, user.barangay_id);
  if (!qr) {
    unlinkQuiet(file.path);
    const err = new Error('No GCash QR code is available yet. Please pay the treasurer in person or try again later.');
    err.statusCode = 400;
    throw err;
  }

  let barangayId = user.barangay_id;
  let referenceNumber = null;
  let farmerName = user.full_name;
  let outstanding = 0;
  let machineryDownPaymentBooking = null;

  if (type === 'loan') {
    const loan = await loadLoanForPayment(pool, refId, user.id);
    if (!loan) {
      unlinkQuiet(file.path);
      const err = new Error('Loan not found');
      err.statusCode = 404;
      throw err;
    }
    const validStatuses = ['approved', 'active', 'overdue'];
    outstanding = parseFloat(loan.remaining_balance) || 0;
    if (!validStatuses.includes(loan.status) || outstanding <= 0.01) {
      unlinkQuiet(file.path);
      const err = new Error('This loan has no outstanding balance to pay.');
      err.statusCode = 400;
      throw err;
    }
    barangayId = loan.barangay_id || user.barangay_id;
    referenceNumber = loan.farmer_reference || `LOAN-${loan.id}`;
    farmerName = loan.farmer_name;
  } else {
    const booking = await loadBookingForPayment(pool, refId, user.id);
    if (!booking) {
      unlinkQuiet(file.path);
      const err = new Error('Machinery booking not found');
      err.statusCode = 404;
      throw err;
    }
    if (['Cancelled', 'Rejected'].includes(booking.status)) {
      unlinkQuiet(file.path);
      const err = new Error('This booking cannot accept payment.');
      err.statusCode = 400;
      throw err;
    }
    const dpAmount = parseFloat(booking.down_payment_amount) || 0;
    if (booking.status === 'Awaiting Payment Verification') {
      unlinkQuiet(file.path);
      const err = new Error('A down payment is already awaiting verification for this booking.');
      err.statusCode = 400;
      throw err;
    }
    if (booking.status === 'Down Payment Verified') {
      unlinkQuiet(file.path);
      const err = new Error('Down payment is already verified. Pay the remaining balance after the service is completed.');
      err.statusCode = 400;
      throw err;
    }
    const isDownPaymentDue = ['Awaiting Down Payment', 'Payment Rejected'].includes(booking.status);
    if (isDownPaymentDue) {
      outstanding = dpAmount;
      machineryDownPaymentBooking = booking;
    } else {
      outstanding = parseFloat(booking.remaining_balance);
      if (!Number.isFinite(outstanding)) {
        outstanding = (parseFloat(booking.total_price) || 0) - (parseFloat(booking.total_paid) || 0);
      }
    }
    if (outstanding <= 0.01) {
      unlinkQuiet(file.path);
      const err = new Error('This machinery transaction has no outstanding balance to pay.');
      err.statusCode = 400;
      throw err;
    }
    barangayId = booking.machinery_barangay_id || booking.farmer_barangay_id || user.barangay_id;
    referenceNumber = booking.farmer_reference || `BK-${booking.id}`;
    farmerName = booking.farmer_name;
  }

  const proofPath = toPublicUploadPath(file.path);
  const payDate = paymentDate || formatLocalDate(new Date());

  const [result] = await pool.execute(
    `INSERT INTO gcash_payment_submissions
     (barangay_id, farmer_id, transaction_type, reference_id, reference_number, proof_path,
      payment_date, status, qr_inventory_id)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_verification', ?)`,
    [barangayId, user.id, type, refId, referenceNumber, proofPath, payDate, qr.id]
  );

  await notifyTreasurersOfSubmission(pool, {
    barangayId,
    farmerId: user.id,
    farmerName,
    transactionType: type,
    referenceNumber,
    submissionId: result.insertId
  });

  if (machineryDownPaymentBooking) {
    await pool.execute(
      `UPDATE machinery_bookings
       SET status = 'Awaiting Payment Verification',
           down_payment_method = 'GCash',
           down_payment_proof = COALESCE(?, down_payment_proof),
           down_payment_submitted_at = NOW(),
           down_payment_rejection_reason = NULL
       WHERE id = ?`,
      [proofPath, machineryDownPaymentBooking.id]
    );
    // GCash proof already notifies via treasurer_gcash_payment_submitted — do not also send
    // treasurer_down_payment_submitted (duplicate "Down Payment Proof" notification).
  }

  return {
    id: result.insertId,
    status: 'pending_verification',
    proof_path: proofPath,
    payment_date: payDate,
    outstanding
  };
}

function assertCanVerify(user, submission) {
  if (parseInt(user.id, 10) === parseInt(submission.farmer_id, 10)) {
    const err = new Error('You cannot confirm your own GCash payment.');
    err.statusCode = 403;
    throw err;
  }
  if (user.role !== 'treasurer') {
    const err = new Error('Only the treasurer can verify GCash payments.');
    err.statusCode = 403;
    throw err;
  }
  if (parseInt(user.barangay_id, 10) !== parseInt(submission.barangay_id, 10)) {
    const err = new Error('You can only verify GCash payments from your barangay.');
    err.statusCode = 403;
    throw err;
  }
}

async function confirmSubmission(pool, { user, submissionId, amountPaid, remarks }) {
  const [rows] = await pool.execute(
    'SELECT * FROM gcash_payment_submissions WHERE id = ?',
    [submissionId]
  );
  const submission = rows[0];
  if (!submission) {
    const err = new Error('GCash payment submission not found');
    err.statusCode = 404;
    throw err;
  }
  if (submission.status !== 'pending_verification') {
    const err = new Error('This payment is no longer awaiting verification.');
    err.statusCode = 400;
    throw err;
  }

  assertCanVerify(user, submission);

  let amount = parseFloat(amountPaid);
  if (!Number.isFinite(amount) || amount <= 0) {
    const err = new Error('Enter the actual amount paid before confirming.');
    err.statusCode = 400;
    throw err;
  }

  const payDate = submission.payment_date;
  const note = remarks || 'GCash QR payment verified by treasurer';
  let applied;

  if (submission.transaction_type === 'loan') {
    const loan = await loadLoanForPayment(pool, submission.reference_id, submission.farmer_id);
    if (!loan) {
      const err = new Error('Loan not found for this payment');
      err.statusCode = 404;
      throw err;
    }
    applied = await applyLoanPayment(pool, {
      loan,
      amount,
      paymentDate: payDate,
      recordedBy: user.id,
      remarks: note,
      submissionId: submission.id
    });
  } else {
    const booking = await loadBookingForPayment(pool, submission.reference_id, submission.farmer_id);
    if (!booking) {
      const err = new Error('Machinery booking not found for this payment');
      err.statusCode = 404;
      throw err;
    }

    const dpStatuses = ['Awaiting Down Payment', 'Awaiting Payment Verification', 'Payment Rejected'];
    if (dpStatuses.includes(booking.status) || (parseFloat(booking.down_payment_amount) > 0 && !booking.down_payment_verified_at && booking.status !== 'Completed')) {
      if (booking.down_payment_verified_at || booking.status === 'Down Payment Verified') {
        const [fresh] = await pool.execute(
          'SELECT receipt_number FROM machinery_bookings WHERE id = ?',
          [booking.id]
        );
        applied = {
          receipt_number: fresh[0]?.receipt_number || booking.receipt_number || null,
          payment_id: null
        };
      } else {
        const requiredDown = parseFloat(booking.down_payment_amount) || 0;
        if (requiredDown <= 0) {
          const err = new Error('No down payment amount is set on this booking.');
          err.statusCode = 400;
          throw err;
        }
        // Down payment via GCash must match the fixed required amount (no over/under).
        amount = requiredDown;
        await pool.execute(
          `UPDATE machinery_bookings
           SET down_payment_method = 'GCash',
               down_payment_proof = COALESCE(?, down_payment_proof),
               down_payment_submitted_at = COALESCE(down_payment_submitted_at, NOW())
           WHERE id = ?`,
          [submission.proof_path, booking.id]
        );
        if (booking.status !== 'Awaiting Payment Verification') {
          await pool.execute(
            `UPDATE machinery_bookings SET status = 'Awaiting Payment Verification' WHERE id = ?`,
            [booking.id]
          );
        }
        const verified = await verifyDownPaymentForBooking(pool, booking.id, {
          verifiedBy: user.id,
          receiptNumber: null,
          amount: requiredDown,
          paymentMethod: 'GCash'
        });
        if (!verified.ok && !verified.alreadyVerified) {
          const err = new Error(verified.message || 'Failed to verify down payment');
          err.statusCode = verified.status || 400;
          throw err;
        }
        const [payRows] = await pool.execute(
          `SELECT id, receipt_number FROM machinery_booking_payments
           WHERE booking_id = ? AND payment_type = 'down_payment'
           ORDER BY id DESC LIMIT 1`,
          [booking.id]
        );
        const [freshBooking] = await pool.execute(
          'SELECT receipt_number FROM machinery_bookings WHERE id = ?',
          [booking.id]
        );
        applied = {
          receipt_number:
            verified.receipt_number ||
            payRows[0]?.receipt_number ||
            freshBooking[0]?.receipt_number ||
            booking.receipt_number ||
            null,
          payment_id: payRows[0]?.id || null
        };
        if (!applied.receipt_number) {
          const err = new Error('Down payment verified but receipt was not generated.');
          err.statusCode = 500;
          throw err;
        }
      }
    } else {
      applied = await applyMachineryCollection(pool, {
        booking,
        amount,
        paymentDate: payDate,
        recordedBy: user.id,
        remarks: note,
        submissionId: submission.id
      });
    }
  }

  await pool.execute(
    `UPDATE gcash_payment_submissions
     SET status = 'verified', amount_paid = ?, verified_by = ?, verified_at = NOW(),
         receipt_number = ?, payment_record_id = ?, remarks = ?
     WHERE id = ?`,
    [amount, user.id, applied.receipt_number, applied.payment_id, note, submission.id]
  );

  await notifyFarmerResult({
    farmerId: submission.farmer_id,
    transactionType: submission.transaction_type,
    submissionId: submission.id,
    verified: true,
    amountPaid: amount,
    receiptNumber: applied.receipt_number
  });

  return {
    ...applied,
    amount_paid: amount,
    status: 'verified'
  };
}

async function rejectSubmission(pool, { user, submissionId, reason }) {
  const [rows] = await pool.execute(
    'SELECT * FROM gcash_payment_submissions WHERE id = ?',
    [submissionId]
  );
  const submission = rows[0];
  if (!submission) {
    const err = new Error('GCash payment submission not found');
    err.statusCode = 404;
    throw err;
  }
  if (submission.status !== 'pending_verification') {
    const err = new Error('This payment is no longer awaiting verification.');
    err.statusCode = 400;
    throw err;
  }
  assertCanVerify(user, submission);

  const rejectionReason = String(reason || '').trim();
  if (!rejectionReason) {
    const err = new Error('Rejection reason is required.');
    err.statusCode = 400;
    throw err;
  }

  await pool.execute(
    `UPDATE gcash_payment_submissions
     SET status = 'rejected', verified_by = ?, verified_at = NOW(), rejection_reason = ?
     WHERE id = ?`,
    [user.id, rejectionReason, submission.id]
  );

  if (submission.transaction_type === 'machinery') {
    const booking = await loadBookingForPayment(pool, submission.reference_id, submission.farmer_id);
    if (booking && ['Awaiting Payment Verification', 'Awaiting Down Payment'].includes(booking.status)) {
      await pool.execute(
        `UPDATE machinery_bookings
         SET status = 'Payment Rejected',
             down_payment_rejection_reason = ?
         WHERE id = ?`,
        [rejectionReason, booking.id]
      );
      await createBookingStatusNotification({
        farmerId: booking.farmer_id,
        bookingId: booking.id,
        status: 'Payment Rejected',
        machineryName: booking.machinery_name,
        bookingDate: booking.booking_date,
        rejectionReason
      });
    }
  }

  await notifyFarmerResult({
    farmerId: submission.farmer_id,
    transactionType: submission.transaction_type,
    submissionId: submission.id,
    verified: false,
    reason: rejectionReason
  });

  return { status: 'rejected' };
}

async function listPendingSubmissions(pool, barangayId) {
  const [rows] = await pool.execute(
    `SELECT s.*,
            f.full_name AS farmer_name,
            f.reference_number AS farmer_reference,
            v.full_name AS verified_by_name,
            mb.status AS booking_status,
            mb.down_payment_amount,
            mb.down_payment_percent,
            mb.down_payment_verified_at,
            mi.machinery_name
     FROM gcash_payment_submissions s
     JOIN farmers f ON s.farmer_id = f.id
     LEFT JOIN farmers v ON s.verified_by = v.id
     LEFT JOIN machinery_bookings mb
       ON s.transaction_type = 'machinery' AND mb.id = s.reference_id
     LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
     WHERE s.barangay_id = ? AND s.status = 'pending_verification'
     ORDER BY s.submitted_at ASC`,
    [barangayId]
  );
  return rows.map((row) => {
    const dpAmount = parseFloat(row.down_payment_amount) || 0;
    const isDownPayment =
      row.transaction_type === 'machinery' &&
      dpAmount > 0 &&
      !row.down_payment_verified_at &&
      ['Awaiting Down Payment', 'Awaiting Payment Verification', 'Payment Rejected'].includes(row.booking_status);
    return {
      ...row,
      machinery_name: row.machinery_name || null,
      expected_amount: isDownPayment ? dpAmount : null,
      is_down_payment: isDownPayment
    };
  });
}

async function listBarangayHistory(pool, barangayId) {
  const [rows] = await pool.execute(
    `SELECT s.id, s.transaction_type, s.reference_id, s.reference_number,
            s.proof_path, s.payment_date, s.status, s.amount_paid,
            s.receipt_number, s.rejection_reason, s.remarks,
            s.submitted_at, s.verified_at,
            f.full_name AS farmer_name,
            v.full_name AS verified_by_name
     FROM gcash_payment_submissions s
     JOIN farmers f ON s.farmer_id = f.id
     LEFT JOIN farmers v ON s.verified_by = v.id
     WHERE s.barangay_id = ? AND s.status IN ('verified', 'rejected')
     ORDER BY COALESCE(s.verified_at, s.submitted_at) DESC, s.id DESC
     LIMIT 80`,
    [barangayId]
  );
  return rows;
}

function historyTimestamp(row) {
  const value = row?.created_at || row?.payment_date || 0;
  const ms = new Date(value).getTime();
  return Number.isFinite(ms) ? ms : 0;
}

function mapGcashHistoryEvent(row) {
  const rejected = row.status === 'rejected';
  const when = row.submitted_at || row.verified_at || row.payment_date;
  return {
    id: `gcash-${row.id}`,
    payment_date: when,
    amount: null,
    payment_method: 'GCash',
    receipt_number: null,
    reference_number: null,
    remarks: rejected
      ? (row.rejection_reason
        ? `GCash proof rejected: ${row.rejection_reason}`
        : 'GCash proof rejected')
      : 'GCash proof submitted. Pending treasurer verification.',
    recorded_by: rejected ? row.verified_by : row.farmer_id,
    recorded_by_name: rejected
      ? (row.verifier_name || row.farmer_name || null)
      : (row.farmer_name || null),
    payment_type: rejected ? 'gcash_rejected' : 'gcash_pending',
    proof_path: row.proof_path || null,
    history_kind: 'gcash',
    gcash_submission_id: row.id,
    created_at: when
  };
}

function sortTransactionHistory(rows) {
  return [...rows].sort((a, b) => {
    const ta = historyTimestamp(a);
    const tb = historyTimestamp(b);
    if (ta !== tb) return ta - tb;
    const kindA = a.history_kind === 'gcash' ? 1 : 0;
    const kindB = b.history_kind === 'gcash' ? 1 : 0;
    if (kindA !== kindB) return kindA - kindB;
    const ia = parseInt(String(a.id).replace(/\D/g, ''), 10) || 0;
    const ib = parseInt(String(b.id).replace(/\D/g, ''), 10) || 0;
    return ia - ib;
  });
}

async function mergeGcashEventsIntoHistory(pool, { transactionType, referenceId, payments }) {
  const [events] = await pool.execute(
    `SELECT s.id, s.payment_date, s.status, s.proof_path, s.rejection_reason,
            s.farmer_id, s.verified_by, s.verified_at, s.submitted_at,
            v.full_name AS verifier_name,
            f.full_name AS farmer_name
     FROM gcash_payment_submissions s
     LEFT JOIN farmers v ON s.verified_by = v.id
     LEFT JOIN farmers f ON s.farmer_id = f.id
     WHERE s.transaction_type = ? AND s.reference_id = ?
       AND s.status IN ('rejected', 'pending_verification')`,
    [transactionType, parseInt(referenceId, 10)]
  );
  const paymentRows = (payments || []).map((row) => ({
    ...row,
    history_kind: row.history_kind || 'payment'
  }));
  return sortTransactionHistory([
    ...paymentRows,
    ...events.map(mapGcashHistoryEvent)
  ]);
}

async function lookupLatestSubmission(pool, { user, transactionType, referenceId }) {
  const type = String(transactionType || '').toLowerCase() === 'loan' ? 'loan' : 'machinery';
  const ref = parseInt(referenceId, 10);
  if (!ref) return null;
  const params = [type, ref];
  let sql = `SELECT s.id, s.status, s.transaction_type, s.reference_id, s.receipt_number,
                    s.rejection_reason, s.amount_paid, s.verified_at, s.submitted_at
             FROM gcash_payment_submissions s
             WHERE s.transaction_type = ? AND s.reference_id = ?`;
  if (user?.role !== 'admin') {
    const barangayId = parseInt(user?.barangay_id, 10);
    if (!barangayId) return null;
    sql += ' AND s.barangay_id = ?';
    params.push(barangayId);
  }
  sql += ' ORDER BY s.id DESC LIMIT 1';
  const [rows] = await pool.execute(sql, params);
  return rows[0] || null;
}

async function getSubmissionById(pool, { user, submissionId }) {
  const id = parseInt(submissionId, 10);
  if (!id) return null;
  const [rows] = await pool.execute(
    `SELECT s.id, s.status, s.transaction_type, s.reference_id, s.receipt_number,
            s.rejection_reason, s.amount_paid, s.verified_at, s.submitted_at,
            s.payment_record_id, s.farmer_id, s.barangay_id
     FROM gcash_payment_submissions s
     WHERE s.id = ?`,
    [id]
  );
  const row = rows[0];
  if (!row) return null;

  const role = String(user?.role || '').toLowerCase();
  const sameFarmer = parseInt(user?.id, 10) === parseInt(row.farmer_id, 10);
  const sameBarangay = parseInt(user?.barangay_id, 10) === parseInt(row.barangay_id, 10);
  const allowed =
    role === 'admin' ||
    sameFarmer ||
    (['treasurer', 'president'].includes(role) && sameBarangay);
  if (!allowed) {
    const err = new Error('Not allowed to view this GCash submission.');
    err.statusCode = 403;
    throw err;
  }
  return row;
}

async function listMineForTransaction(pool, farmerId, transactionType, referenceId) {
  const [rows] = await pool.execute(
    `SELECT id, transaction_type, reference_id, reference_number, proof_path, payment_date,
            status, amount_paid, receipt_number, rejection_reason, submitted_at, verified_at
     FROM gcash_payment_submissions
     WHERE farmer_id = ? AND transaction_type = ? AND reference_id = ?
     ORDER BY id DESC
     LIMIT 8`,
    [farmerId, transactionType, referenceId]
  );
  return rows;
}

module.exports = {
  getActiveQr,
  saveQrImage,
  deactivateQr,
  submitFarmerProof,
  confirmSubmission,
  rejectSubmission,
  listPendingSubmissions,
  listBarangayHistory,
  listMineForTransaction,
  lookupLatestSubmission,
  getSubmissionById,
  mergeGcashEventsIntoHistory,
  getPendingSubmission
};
