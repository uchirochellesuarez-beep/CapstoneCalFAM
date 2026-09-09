const pool = require('../db');
const {
  formatLocalDate,
  normalizeDateString
} = require('../utils/philippinesTime');
const { formatDownPaymentPercentLabel } = require('./booking-workflow');

const STATUS_NOTIFICATION_TYPES = [
  'booking_approved',
  'booking_rejected',
  'booking_expired',
  'booking_down_payment_required',
  'booking_payment_rejected',
  'booking_payment_verified',
  'booking_confirmed',
  'booking_refund_rejected',
  'booking_refund_completed',
  'gcash_payment_verified',
  'gcash_payment_rejected'
];
const OPERATOR_NOTIFICATION_TYPES = [
  'operator_booking_assigned',
  'operator_booking_updated',
  'operator_booking_cancelled',
  'operator_income_credited'
];
const TREASURER_NOTIFICATION_TYPES = [
  'treasurer_expense_pending',
  'treasurer_expense_reminder',
  'treasurer_down_payment_submitted',
  'treasurer_down_payment_due',
  'treasurer_balance_payment_submitted',
  'treasurer_collectible_created',
  'treasurer_refund_requested',
  'treasurer_gcash_payment_submitted'
];
const ASSISTANCE_NOTIFICATION_TYPES = ['assistance_allocated'];
const ANNOUNCEMENT_NOTIFICATION_TYPES = ['announcement_posted'];
const PRESIDENT_NOTIFICATION_TYPES = ['president_income_submitted'];
const AGRICULTURIST_NOTIFICATION_TYPES = ['agriculturist_income_eligible'];
const FARMER_INCOME_NOTIFICATION_TYPES = ['income_rejected'];
const FARMER_REFERENCE_TYPES = ['loan', 'machinery_booking', 'income_assistance_distribution'];
const OPERATOR_REFERENCE_TYPES = ['operator_machinery_booking', 'operator_income'];
const TREASURER_REFERENCE_TYPES = ['machinery_expense', 'machinery_booking', 'loan'];
const REFERENCE_TYPE_VALUES = [
  ...FARMER_REFERENCE_TYPES,
  ...OPERATOR_REFERENCE_TYPES,
  ...TREASURER_REFERENCE_TYPES,
  'announcement',
  'gcash_payment_submission',
  'farmer_income_record'
];
const NOTIFICATION_ENUM_VALUES = [
  'last_month',
  'last_week',
  '3_days',
  '2_days',
  '1_day',
  'due_day',
  'overdue_penalty',
  ...ASSISTANCE_NOTIFICATION_TYPES,
  ...STATUS_NOTIFICATION_TYPES,
  ...OPERATOR_NOTIFICATION_TYPES,
  ...TREASURER_NOTIFICATION_TYPES,
  ...PRESIDENT_NOTIFICATION_TYPES,
  ...AGRICULTURIST_NOTIFICATION_TYPES,
  ...FARMER_INCOME_NOTIFICATION_TYPES,
  ...ANNOUNCEMENT_NOTIFICATION_TYPES
];

let notificationSchemaPromise = null;

async function ensureNotificationSchema() {
  if (!notificationSchemaPromise) {
    notificationSchemaPromise = (async () => {
      const [typeColumn] = await pool.execute("SHOW COLUMNS FROM due_date_notifications LIKE 'notification_type'");
      const [referenceTypeColumn] = await pool.execute("SHOW COLUMNS FROM due_date_notifications LIKE 'reference_type'");

      const typeDef = typeColumn[0]?.Type || '';
      const referenceDef = referenceTypeColumn[0]?.Type || '';

      const typeIsVarchar = typeof typeDef === 'string' && typeDef.toLowerCase().startsWith('varchar');
      const needsTypeUpdate =
        typeColumn.length > 0 &&
        typeof typeDef === 'string' &&
        !typeIsVarchar;

      const needsReferenceUpdate =
        referenceTypeColumn.length > 0 &&
        typeof referenceDef === 'string' &&
        referenceDef.startsWith('enum(') &&
        !REFERENCE_TYPE_VALUES.every((value) => referenceDef.includes(`'${value}'`));

      if (needsTypeUpdate) {
        await pool.query(
          'ALTER TABLE due_date_notifications MODIFY COLUMN notification_type VARCHAR(64) NOT NULL'
        );
        console.log('✅ Updated due_date_notifications.notification_type to VARCHAR(64)');
      }

      if (needsReferenceUpdate) {
        const referenceTypeSql = REFERENCE_TYPE_VALUES.map((value) => `'${value}'`).join(', ');
        await pool.query(
          `ALTER TABLE due_date_notifications MODIFY COLUMN reference_type ENUM(${referenceTypeSql}) NOT NULL`
        );
        console.log('✅ Updated due_date_notifications.reference_type enum');
      }
    })().catch((error) => {
      notificationSchemaPromise = null;
      throw error;
    });
  }

  return notificationSchemaPromise;
}

async function upsertNotification(data) {
  try {
    await ensureNotificationSchema();

    let barangayId = data.barangay_id || null;
    if (!barangayId && data.farmer_id) {
      const [farmerRows] = await pool.execute(
        'SELECT barangay_id FROM farmers WHERE id = ?',
        [data.farmer_id]
      );
      barangayId = farmerRows[0]?.barangay_id || null;
    }

    const [existing] = await pool.execute(
      `SELECT id, trigger_date, message FROM due_date_notifications
       WHERE farmer_id = ? AND reference_type = ? AND reference_id = ? AND notification_type = ?`,
      [data.farmer_id, data.reference_type, data.reference_id, data.notification_type]
    );

    if (existing.length > 0) {
      const refreshTypes = [
        'overdue_penalty'
      ];
      if (refreshTypes.includes(data.notification_type)) {
        await pool.execute(
          `UPDATE due_date_notifications
           SET trigger_date = ?, message = ?, title = ?, is_read = 0, due_date = ?
           WHERE id = ?`,
          [data.trigger_date, data.message, data.title, data.due_date, existing[0].id]
        );
        return true;
      }

      return false;
    }

    await pool.execute(
      `INSERT INTO due_date_notifications
       (farmer_id, barangay_id, reference_type, reference_id, notification_type, title, message, due_date, trigger_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.farmer_id,
        barangayId,
        data.reference_type,
        data.reference_id,
        data.notification_type,
        data.title,
        data.message,
        data.due_date,
        data.trigger_date
      ]
    );

    return true;
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') return false;
    console.error('Error inserting notification:', error.message, {
      farmer_id: data.farmer_id,
      reference_type: data.reference_type,
      notification_type: data.notification_type
    });
    return false;
  }
}

async function createBookingStatusNotification({
  farmerId,
  bookingId,
  status,
  machineryName,
  bookingDate,
  rejectionReason = null,
  downPaymentAmount = null,
  remainingBalance = null,
  downPaymentPercent = null
}) {
  // Validate required parameters
  if (!farmerId || !bookingId) {
    console.error('❌ [createBookingStatusNotification] Missing required parameters:', { farmerId, bookingId, status });
    return false;
  }

  // Ensure farmerId is a valid number
  const farmerIdNum = parseInt(farmerId, 10);
  if (isNaN(farmerIdNum) || farmerIdNum <= 0) {
    console.error('❌ [createBookingStatusNotification] Invalid farmerId:', farmerId);
    return false;
  }

  const [farmerRows] = await pool.execute(
    'SELECT id FROM farmers WHERE id = ? AND role = ?',
    [farmerIdNum, 'farmer']
  );
  if (farmerRows.length === 0) {
    return false;
  }

  // Ensure bookingId is a valid number
  const bookingIdNum = parseInt(bookingId, 10);
  if (isNaN(bookingIdNum) || bookingIdNum <= 0) {
    console.error('❌ [createBookingStatusNotification] Invalid bookingId:', bookingId);
    return false;
  }

  const normalizedStatus = String(status || '').trim();
  const notificationTypeMap = {
    Approved: 'booking_approved',
    'Awaiting Down Payment': 'booking_down_payment_required',
    'Payment Rejected': 'booking_payment_rejected',
    'Down Payment Verified': 'booking_payment_verified',
    'Booking Confirmed': 'booking_confirmed',
    Rejected: 'booking_rejected',
    Expired: 'booking_expired',
    'Refund Rejected': 'booking_refund_rejected',
    'Refund Completed': 'booking_refund_completed'
  };

  const notificationType = notificationTypeMap[normalizedStatus];
  if (!notificationType) {
    console.error('❌ [createBookingStatusNotification] Invalid status:', status);
    return false;
  }

  console.log(`✅ [createBookingStatusNotification] Creating ${notificationType} notification for farmer ${farmerIdNum}, booking ${bookingIdNum}`);

  const machineLabel = machineryName || 'Machinery booking';
  const bookingDateLabel = normalizeDateString(bookingDate) || 'the scheduled date';
  const triggerDate = formatLocalDate(new Date());
  const pctLabel = formatDownPaymentPercentLabel(downPaymentPercent);
  const amountLabel = downPaymentAmount != null
    ? `₱${Number(downPaymentAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
    : null;

  const payloadByStatus = {
    Approved: {
      title: `${machineLabel} Booking Approved`,
      message: `Your booking scheduled for ${bookingDateLabel} has been approved and assigned to an operator. Pay the treasurer after the service is completed.`
    },
    'Awaiting Down Payment': {
      title: `${machineLabel} — Down Payment Required`,
      message: amountLabel
        ? (pctLabel
          ? `Your booking for ${bookingDateLabel} is approved pending payment. Pay ${pctLabel}% down (${amountLabel}) to reserve your slot.`
          : `Your booking for ${bookingDateLabel} is approved pending payment. Pay a down payment of ${amountLabel} to reserve your slot.`)
        : `Your booking for ${bookingDateLabel} requires a down payment before reservation.`
    },
    'Payment Rejected': {
      title: `${machineLabel} — Payment Rejected`,
      message: rejectionReason
        ? `Your down payment was rejected. Reason: ${rejectionReason}. Please resubmit payment proof.`
        : `Your down payment was rejected. Please resubmit payment proof.`
    },
    'Down Payment Verified': {
      title: `${machineLabel} — Down Payment Verified`,
      message: pctLabel
        ? `Your ${pctLabel}% down payment has been verified. Awaiting final booking confirmation.`
        : `Your down payment has been verified. Awaiting final booking confirmation.`
    },
    'Booking Confirmed': {
      title: `${machineLabel} Booking Confirmed`,
      message: `Your machinery rental for ${bookingDateLabel} is officially confirmed and reserved.`
    },
    Rejected: {
      title: `${machineLabel} Booking Rejected`,
      message: rejectionReason
        ? `Your booking scheduled for ${bookingDateLabel} was rejected. Reason: ${rejectionReason}`
        : `Your booking scheduled for ${bookingDateLabel} was rejected.`
    },
    Expired: {
      title: `${machineLabel} Booking Expired`,
      message: `Your booking scheduled for ${bookingDateLabel} expired because the scheduled date has already passed.`
    },
    'Refund Rejected': {
      title: `${machineLabel} — Refund Request Rejected`,
      message: `Your down payment refund request for booking on ${bookingDateLabel} was rejected. Contact the treasurer for details.`
    },
    'Refund Completed': {
      title: `${machineLabel} — Down Payment Refunded`,
      message: `Your down payment for the booking on ${bookingDateLabel} has been refunded.`
    }
  };

  const notificationPayload = payloadByStatus[normalizedStatus];
  if (!notificationPayload) {
    console.error('❌ [createBookingStatusNotification] No payload for status:', normalizedStatus);
    return false;
  }

  const result = await upsertNotification({
    farmer_id: farmerIdNum,
    reference_type: 'machinery_booking',
    reference_id: bookingIdNum,
    notification_type: notificationType,
    title: notificationPayload.title,
    message: notificationPayload.message,
    due_date: bookingDateLabel,
    trigger_date: triggerDate
  });

  if (result) {
    console.log(`✅ [createBookingStatusNotification] Successfully created ${notificationType} notification for farmer ${farmerIdNum}`);
  } else {
    console.log(`⚠️ [createBookingStatusNotification] Notification already exists or failed to create for farmer ${farmerIdNum}`);
  }

  return result;
}

const BOOKING_REFERENCE_TYPES = ['machinery_booking', 'operator_machinery_booking', 'operator_income'];

async function deleteNotificationsForReference(referenceType, referenceId, notificationType = null) {
  const refId = parseInt(referenceId, 10);
  if (!referenceType || !refId) return 0;

  if (notificationType) {
    const [result] = await pool.execute(
      'DELETE FROM due_date_notifications WHERE reference_type = ? AND reference_id = ? AND notification_type = ?',
      [referenceType, refId, notificationType]
    );
    return result.affectedRows || 0;
  }

  const [result] = await pool.execute(
    'DELETE FROM due_date_notifications WHERE reference_type = ? AND reference_id = ?',
    [referenceType, refId]
  );
  return result.affectedRows || 0;
}

async function deleteNotificationsForBooking(bookingId) {
  const id = parseInt(bookingId, 10);
  if (!id) return 0;

  let total = 0;
  for (const refType of BOOKING_REFERENCE_TYPES) {
    total += await deleteNotificationsForReference(refType, id);
  }
  return total;
}

async function deleteNotificationsForExpense(expenseId) {
  return deleteNotificationsForReference('machinery_expense', expenseId);
}

/** Remove notifications whose referenced loan, booking, expense, etc. no longer exists. */
async function purgeOrphanedNotifications() {
  const statements = [
    `DELETE n FROM due_date_notifications n
     LEFT JOIN machinery_bookings mb ON mb.id = n.reference_id
     WHERE n.reference_type IN ('machinery_booking', 'operator_machinery_booking', 'operator_income')
       AND n.notification_type NOT IN ('treasurer_gcash_payment_submitted', 'gcash_payment_verified', 'gcash_payment_rejected')
       AND mb.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN machinery_expenses me ON me.id = n.reference_id
     WHERE n.reference_type = 'machinery_expense' AND me.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN loans l ON l.id = n.reference_id
     WHERE n.reference_type = 'loan'
       AND n.notification_type NOT IN ('treasurer_gcash_payment_submitted', 'gcash_payment_verified', 'gcash_payment_rejected')
       AND l.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN gcash_payment_submissions s ON s.id = n.reference_id
     WHERE n.reference_type = 'gcash_payment_submission' AND s.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN income_assistance_distributions d ON d.id = n.reference_id
     WHERE n.reference_type = 'income_assistance_distribution' AND d.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN farmer_income_records r ON r.id = n.reference_id
     WHERE n.reference_type = 'farmer_income_record' AND r.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN announcements a ON a.id = n.reference_id
     WHERE n.reference_type = 'announcement' AND a.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     WHERE n.notification_type = 'treasurer_refund_requested'
       AND n.reference_type = 'machinery_booking'
       AND NOT EXISTS (
         SELECT 1 FROM machinery_booking_refunds r
         WHERE r.booking_id = n.reference_id
           AND r.refund_status IN ('Refund Requested','Under Review','Approved','Pending')
       )`,
    `DELETE n FROM due_date_notifications n
     INNER JOIN machinery_bookings mb ON mb.id = n.reference_id
     WHERE n.reference_type = 'machinery_booking'
       AND n.notification_type = 'treasurer_down_payment_submitted'
       AND mb.status <> 'Awaiting Payment Verification'`,
    `DELETE n FROM due_date_notifications n
     INNER JOIN machinery_bookings mb ON mb.id = n.reference_id
     WHERE n.reference_type = 'machinery_booking'
       AND n.notification_type = 'treasurer_down_payment_due'
       AND mb.status NOT IN ('Awaiting Down Payment', 'Payment Rejected')`,
    `DELETE n FROM due_date_notifications n
     WHERE n.notification_type = 'treasurer_balance_payment_submitted'
       AND n.reference_type = 'machinery_booking'
       AND NOT EXISTS (
         SELECT 1 FROM machinery_balance_payment_submissions s
         WHERE s.booking_id = n.reference_id
           AND s.status = 'Awaiting Payment Verification'
       )`,
    `DELETE n FROM due_date_notifications n
     INNER JOIN machinery_bookings mb ON mb.id = n.reference_id
     WHERE n.reference_type = 'machinery_booking'
       AND n.notification_type IN ('1_day', 'overdue_penalty')
       AND (
         mb.status IN ('Cancelled', 'Rejected', 'Incomplete')
         OR mb.payment_status = 'Refunded'
         OR COALESCE(mb.remaining_balance, 0) <= 0
       )`
  ];

  let total = 0;
  for (const sql of statements) {
    try {
      const [result] = await pool.execute(sql);
      total += result.affectedRows || 0;
    } catch (error) {
      console.error('purgeOrphanedNotifications partial error:', error.message);
    }
  }

  if (total > 0) {
    console.log(`🧹 Purged ${total} orphaned notification(s)`);
  }
  return total;
}

async function createIncomeAssistanceNotification({
  farmerId,
  distributionId,
  assistanceLabel,
  message
}) {
  if (!farmerId || !distributionId || !message) {
    return false;
  }

  const farmerIdNum = parseInt(farmerId, 10);
  const [farmerRows] = await pool.execute(
    'SELECT id FROM farmers WHERE id = ? AND role = ?',
    [farmerIdNum, 'farmer']
  );
  if (farmerRows.length === 0) {
    return false;
  }

  const triggerDate = formatLocalDate(new Date());

  return upsertNotification({
    farmer_id: farmerIdNum,
    reference_type: 'income_assistance_distribution',
    reference_id: distributionId,
    notification_type: 'assistance_allocated',
    title: `${assistanceLabel} Assistance Approved`,
    message,
    due_date: triggerDate,
    trigger_date: triggerDate
  });
}

async function createAnnouncementPostedNotifications({
  announcementId,
  title,
  authorId,
  authorName,
  authorRole
}) {
  const announcementIdNum = parseInt(announcementId, 10);
  const authorIdNum = parseInt(authorId, 10);

  if (!announcementIdNum || !authorIdNum || !title) {
    return 0;
  }

  await ensureNotificationSchema();

  const [recipients] = await pool.execute(
    `SELECT id FROM farmers WHERE id != ?`,
    [authorIdNum]
  );

  const [dateRows] = await pool.execute('SELECT DATE(NOW()) AS today');
  const triggerDate = normalizeDateString(dateRows[0]?.today) || formatLocalDate(new Date());
  const posterLabel = authorName || authorRole || 'An officer';
  const trimmedTitle = String(title).trim().slice(0, 120);
  let created = 0;

  for (const recipient of recipients) {
    const inserted = await upsertNotification({
      farmer_id: recipient.id,
      reference_type: 'announcement',
      reference_id: announcementIdNum,
      notification_type: 'announcement_posted',
      title: 'New Announcement Posted',
      message: `${posterLabel} posted: ${trimmedTitle}`,
      due_date: triggerDate,
      trigger_date: triggerDate
    });
    if (inserted) created += 1;
  }

  console.log(
    `📢 Announcement #${announcementIdNum}: created ${created} notification(s) for ${recipients.length} recipient(s)`
  );

  return created;
}

async function createStaffRoleNotification({
  recipientId,
  expectedRole,
  referenceType,
  referenceId,
  notificationType,
  title,
  message,
  dueDate = null
}) {
  const recipientIdNum = parseInt(recipientId, 10);
  const referenceIdNum = parseInt(referenceId, 10);

  if (!recipientIdNum || !referenceIdNum || !expectedRole || !notificationType || !title || !message) {
    return false;
  }

  const [rows] = await pool.execute(
    'SELECT id FROM farmers WHERE id = ? AND role = ?',
    [recipientIdNum, expectedRole]
  );
  if (rows.length === 0) return false;

  const triggerDate = formatLocalDate(new Date());
  const dueDateLabel = dueDate ? normalizeDateString(dueDate) : triggerDate;

  return upsertNotification({
    farmer_id: recipientIdNum,
    reference_type: referenceType,
    reference_id: referenceIdNum,
    notification_type: notificationType,
    title,
    message,
    due_date: dueDateLabel,
    trigger_date: triggerDate
  });
}

async function notifyBarangayRole({
  barangayId,
  role,
  recordId,
  notificationType,
  title,
  message
}) {
  if (!barangayId || !recordId || !role) return 0;

  const [recipients] = await pool.execute(
    `SELECT id FROM farmers WHERE role = ? AND barangay_id = ? AND status = 'approved'`,
    [role, barangayId]
  );

  let notified = 0;
  for (const recipient of recipients) {
    const sent = await createStaffRoleNotification({
      recipientId: recipient.id,
      expectedRole: role,
      referenceType: 'farmer_income_record',
      referenceId: recordId,
      notificationType,
      title,
      message
    });
    if (sent) notified += 1;
  }

  return notified;
}

async function notifyPresidentsOfIncomeSubmission({ recordId, barangayId, farmerName }) {
  const farmerLabel = farmerName || 'A farmer';
  return notifyBarangayRole({
    barangayId,
    role: 'president',
    recordId,
    notificationType: 'president_income_submitted',
    title: 'Farm Income Submitted for Review',
    message: `${farmerLabel} submitted a farm income record. Please review and mark as Eligible if qualified.`
  });
}

async function notifyAgriculturistsOfEligibleIncome({ recordId, barangayId, farmerName }) {
  const farmerLabel = farmerName || 'A farmer';
  return notifyBarangayRole({
    barangayId,
    role: 'agriculturist',
    recordId,
    notificationType: 'agriculturist_income_eligible',
    title: 'Eligible for Fertilizer and Seeds',
    message: `${farmerLabel} is now eligible. Please allocate fertilizer and seeds assistance.`
  });
}

async function createIncomeRejectedNotification({ farmerId, recordId, reason }) {
  const farmerIdNum = parseInt(farmerId, 10);
  const recordIdNum = parseInt(recordId, 10);
  if (!farmerIdNum || !recordIdNum) return false;

  const reasonText = String(reason || '').trim();
  const triggerDate = formatLocalDate(new Date());

  return upsertNotification({
    farmer_id: farmerIdNum,
    reference_type: 'farmer_income_record',
    reference_id: recordIdNum,
    notification_type: 'income_rejected',
    title: 'Farm Income Record Rejected',
    message: reasonText
      ? `Your farm income record was not approved. Reason: ${reasonText}. Please update and resubmit.`
      : 'Your farm income record was not approved. Please update and resubmit.',
    due_date: triggerDate,
    trigger_date: triggerDate
  });
}

async function createTreasurerNotification({
  treasurerId,
  referenceType,
  referenceId,
  notificationType,
  title,
  message,
  dueDate = null
}) {
  const treasurerIdNum = parseInt(treasurerId, 10);
  const referenceIdNum = parseInt(referenceId, 10);

  if (!treasurerIdNum || !referenceIdNum || !notificationType || !title || !message) {
    return false;
  }

  const [rows] = await pool.execute(
    'SELECT id FROM farmers WHERE id = ? AND role = ?',
    [treasurerIdNum, 'treasurer']
  );
  if (rows.length === 0) return false;

  const triggerDate = formatLocalDate(new Date());
  const dueDateLabel = dueDate ? normalizeDateString(dueDate) : triggerDate;

  return upsertNotification({
    farmer_id: treasurerIdNum,
    reference_type: referenceType,
    reference_id: referenceIdNum,
    notification_type: notificationType,
    title,
    message,
    due_date: dueDateLabel,
    trigger_date: triggerDate
  });
}

async function createTreasurerPendingExpenseNotification({
  treasurerId,
  expenseId,
  bookingId,
  machineryName,
  farmerName,
  expenseDate
}) {
  const machineLabel = machineryName || 'Machinery';
  const farmerLabel = farmerName || 'Farmer';
  const dateLabel = normalizeDateString(expenseDate) || formatLocalDate(new Date());

  return createTreasurerNotification({
    treasurerId,
    referenceType: 'machinery_expense',
    referenceId: expenseId,
    notificationType: 'treasurer_expense_pending',
    title: `Expense Entry Required — Booking #${bookingId}`,
    message: `Completed rental for ${machineLabel} (${farmerLabel}) requires expense recording. Transaction date: ${dateLabel}.`,
    dueDate: dateLabel
  });
}

async function createOperatorNotification({
  operatorId,
  referenceType,
  referenceId,
  notificationType,
  title,
  message,
  dueDate = null
}) {
  const operatorIdNum = parseInt(operatorId, 10);
  const referenceIdNum = parseInt(referenceId, 10);

  if (!operatorIdNum || !referenceIdNum || !notificationType || !title || !message) {
    return false;
  }

  const [operatorRows] = await pool.execute(
    'SELECT id FROM farmers WHERE id = ? AND role = ?',
    [operatorIdNum, 'operator']
  );
  if (operatorRows.length === 0) {
    return false;
  }

  const triggerDate = formatLocalDate(new Date());
  const dueDateLabel = dueDate ? normalizeDateString(dueDate) : triggerDate;

  return upsertNotification({
    farmer_id: operatorIdNum,
    reference_type: referenceType,
    reference_id: referenceIdNum,
    notification_type: notificationType,
    title,
    message,
    due_date: dueDateLabel,
    trigger_date: triggerDate
  });
}

async function createOperatorBookingAssignedNotification({
  operatorId,
  bookingId,
  machineryName,
  bookingDate
}) {
  const bookingDateLabel = normalizeDateString(bookingDate) || 'the scheduled date';
  const machineLabel = machineryName || 'Machinery';

  return createOperatorNotification({
    operatorId,
    referenceType: 'operator_machinery_booking',
    referenceId: bookingId,
    notificationType: 'operator_booking_assigned',
    title: `${machineLabel} Booking Assigned`,
    message: `A booking for ${machineLabel} on ${bookingDateLabel} has been approved and assigned to you.`,
    dueDate: bookingDate
  });
}

async function createOperatorBookingUpdatedNotification({
  operatorId,
  bookingId,
  machineryName,
  bookingDate
}) {
  const bookingDateLabel = normalizeDateString(bookingDate) || 'the scheduled date';
  const machineLabel = machineryName || 'Machinery';

  return createOperatorNotification({
    operatorId,
    referenceType: 'operator_machinery_booking',
    referenceId: bookingId,
    notificationType: 'operator_booking_updated',
    title: `${machineLabel} Schedule Updated`,
    message: `The booking schedule for ${machineLabel} has been updated. New date: ${bookingDateLabel}.`,
    dueDate: bookingDate
  });
}

async function createOperatorBookingCancelledNotification({
  operatorId,
  bookingId,
  machineryName,
  bookingDate
}) {
  const bookingDateLabel = normalizeDateString(bookingDate) || 'the scheduled date';
  const machineLabel = machineryName || 'Machinery';

  return createOperatorNotification({
    operatorId,
    referenceType: 'operator_machinery_booking',
    referenceId: bookingId,
    notificationType: 'operator_booking_cancelled',
    title: `${machineLabel} Booking Cancelled`,
    message: `The booking for ${machineLabel} scheduled on ${bookingDateLabel} has been cancelled.`,
    dueDate: bookingDate
  });
}

async function createOperatorIncomeNotification({
  operatorId,
  bookingId,
  machineryName,
  laborCost,
  transactionDate
}) {
  const machineLabel = machineryName || 'Machinery';
  const amount = parseFloat(laborCost) || 0;
  const txDate = normalizeDateString(transactionDate) || formatLocalDate(new Date());

  return createOperatorNotification({
    operatorId,
    referenceType: 'operator_income',
    referenceId: bookingId,
    notificationType: 'operator_income_credited',
    title: `Income Credited — ${machineLabel}`,
    message: `You received ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} labor compensation for ${machineLabel} (${txDate}).`,
    dueDate: txDate
  });
}

async function createTreasurerDownPaymentSubmittedNotification({
  treasurerId,
  bookingId,
  farmerName,
  machineryName,
  amountPaid,
  expenseDate
}) {
  return createTreasurerNotification({
    treasurerId,
    referenceType: 'machinery_booking',
    referenceId: bookingId,
    notificationType: 'treasurer_down_payment_submitted',
    title: 'Down Payment Proof',
    message: `${farmerName || 'A farmer'} submitted down payment proof for ${machineryName || 'machinery'} (₱${Number(amountPaid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}). Please verify.`,
    dueDate: expenseDate
  });
}

/**
 * Notify treasurer (or president for treasurer bookings) that a face-to-face /
 * GCash down payment is due — before the farmer has submitted proof.
 */
async function createDownPaymentDueNotification({
  recipientId,
  bookingId,
  farmerName,
  machineryName,
  amountDue,
  percent = null,
  bookingDate = null
}) {
  const recipientIdNum = parseInt(recipientId, 10);
  const bookingIdNum = parseInt(bookingId, 10);
  if (!recipientIdNum || !bookingIdNum) return false;

  const [rows] = await pool.execute(
    `SELECT id, role FROM farmers
     WHERE id = ? AND role IN ('treasurer', 'president') AND status = 'approved'`,
    [recipientIdNum]
  );
  if (!rows.length) return false;

  const pctLabel = formatDownPaymentPercentLabel(percent);
  const amountLabel = `₱${Number(amountDue || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`;
  const pctPart = pctLabel ? `${pctLabel}% ` : '';
  const dateLabel = normalizeDateString(bookingDate) || formatLocalDate(new Date());

  return upsertNotification({
    farmer_id: recipientIdNum,
    reference_type: 'machinery_booking',
    reference_id: bookingIdNum,
    notification_type: 'treasurer_down_payment_due',
    title: 'Down Payment Due',
    message: `${farmerName || 'A farmer'} must pay a ${pctPart}down payment of ${amountLabel} for ${machineryName || 'machinery'} (booking date ${dateLabel}). They may pay face-to-face — you can record the cash down payment.`,
    due_date: dateLabel,
    trigger_date: formatLocalDate(new Date())
  });
}

async function notifyBarangayDownPaymentDue({
  barangayId,
  bookingId,
  farmerName,
  bookerRole,
  machineryName,
  amountDue,
  percent = null,
  bookingDate = null
}) {
  if (!barangayId || !bookingId) return 0;
  const { getPaymentVerifierRole } = require('./booking-workflow');
  const verifierRole = getPaymentVerifierRole(bookerRole);
  const [verifiers] = await pool.execute(
    `SELECT id FROM farmers
     WHERE role = ? AND barangay_id = ? AND status = 'approved'`,
    [verifierRole, barangayId]
  );
  let count = 0;
  for (const v of verifiers) {
    const ok = await createDownPaymentDueNotification({
      recipientId: v.id,
      bookingId,
      farmerName,
      machineryName,
      amountDue,
      percent,
      bookingDate
    });
    if (ok) count += 1;
  }
  return count;
}

async function createTreasurerBalancePaymentSubmittedNotification({
  treasurerId,
  bookingId,
  farmerName,
  machineryName,
  amountPaid,
  isPartial
}) {
  return createTreasurerNotification({
    treasurerId,
    referenceType: 'machinery_booking',
    referenceId: bookingId,
    notificationType: 'treasurer_balance_payment_submitted',
    title: `${isPartial ? 'Partial' : 'Balance'} Payment Proof — Booking #${bookingId}`,
    message: `${farmerName || 'A farmer'} submitted ${isPartial ? 'partial ' : ''}balance payment for ${machineryName || 'machinery'} (₱${Number(amountPaid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}). Please verify.`,
    dueDate: formatLocalDate(new Date())
  });
}

async function createTreasurerCollectibleCreatedNotification({
  treasurerId,
  bookingId,
  farmerName,
  machineryName,
  receivableAmount,
  bookingDate
}) {
  return createTreasurerNotification({
    treasurerId,
    referenceType: 'machinery_booking',
    referenceId: bookingId,
    notificationType: 'treasurer_collectible_created',
    title: `New Collectible — Booking #${bookingId}`,
    message: `Rental completed for ${farmerName || 'farmer'} (${machineryName || 'machinery'}). Accounts receivable: ₱${Number(receivableAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}.`,
    dueDate: normalizeDateString(bookingDate) || formatLocalDate(new Date())
  });
}

async function createTreasurerRefundRequestedNotification({
  treasurerId,
  bookingId,
  farmerName,
  machineryName,
  refundAmount,
  refundNumber
}) {
  return createTreasurerNotification({
    treasurerId,
    referenceType: 'machinery_booking',
    referenceId: bookingId,
    notificationType: 'treasurer_refund_requested',
    title: `Refund Request ${refundNumber || ''} — Booking #${bookingId}`,
    message: `${farmerName || 'A farmer'} requested a down payment refund for ${machineryName || 'machinery'} (₱${Number(refundAmount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}). Please review.`,
    dueDate: formatLocalDate(new Date())
  });
}

async function createTreasurerGcashPaymentSubmittedNotification({
  treasurerId,
  referenceType,
  referenceId,
  farmerName,
  typeLabel,
  refLabel
}) {
  return createTreasurerNotification({
    treasurerId,
    referenceType,
    referenceId,
    notificationType: 'treasurer_gcash_payment_submitted',
    title: `GCash Payment Proof — ${typeLabel} ${refLabel}`,
    message: `${farmerName || 'A farmer'} submitted GCash payment proof for ${String(typeLabel || 'transaction').toLowerCase()} ${refLabel}. Please check the screenshot and enter the actual amount paid before confirming.`,
    dueDate: formatLocalDate(new Date())
  });
}

async function createManagerConfirmBookingNotification({
  managerId,
  bookingId,
  machineryName,
  farmerName,
  bookingDate
}) {
  const managerIdNum = parseInt(managerId, 10);
  if (!managerIdNum) return false;

  const [rows] = await pool.execute(
    'SELECT id FROM farmers WHERE id = ? AND role IN (?, ?, ?)',
    [managerIdNum, 'operation_manager', 'business_manager', 'admin']
  );
  if (rows.length === 0) return false;

  const triggerDate = formatLocalDate(new Date());
  const dateLabel = normalizeDateString(bookingDate) || triggerDate;

  return upsertNotification({
    farmer_id: managerIdNum,
    reference_type: 'machinery_booking',
    reference_id: parseInt(bookingId, 10),
    notification_type: 'booking_down_payment_required',
    title: 'Confirm Booking',
    message: `Down payment verified for ${machineryName || 'machinery'} (${farmerName || 'farmer'}). Perform final confirmation for ${dateLabel}.`,
    due_date: dateLabel,
    trigger_date: triggerDate
  });
}

module.exports = {
  ANNOUNCEMENT_NOTIFICATION_TYPES,
  ASSISTANCE_NOTIFICATION_TYPES,
  PRESIDENT_NOTIFICATION_TYPES,
  AGRICULTURIST_NOTIFICATION_TYPES,
  FARMER_INCOME_NOTIFICATION_TYPES,
  FARMER_REFERENCE_TYPES,
  OPERATOR_NOTIFICATION_TYPES,
  OPERATOR_REFERENCE_TYPES,
  TREASURER_NOTIFICATION_TYPES,
  TREASURER_REFERENCE_TYPES,
  STATUS_NOTIFICATION_TYPES,
  REFERENCE_TYPE_VALUES,
  formatLocalDate,
  normalizeDateString,
  ensureNotificationSchema,
  upsertNotification,
  deleteNotificationsForReference,
  deleteNotificationsForBooking,
  deleteNotificationsForExpense,
  purgeOrphanedNotifications,
  createBookingStatusNotification,
  createIncomeAssistanceNotification,
  createAnnouncementPostedNotifications,
  notifyPresidentsOfIncomeSubmission,
  notifyAgriculturistsOfEligibleIncome,
  createIncomeRejectedNotification,
  createTreasurerPendingExpenseNotification,
  createTreasurerDownPaymentSubmittedNotification,
  createDownPaymentDueNotification,
  notifyBarangayDownPaymentDue,
  createTreasurerBalancePaymentSubmittedNotification,
  createTreasurerCollectibleCreatedNotification,
  createTreasurerRefundRequestedNotification,
  createTreasurerGcashPaymentSubmittedNotification,
  createManagerConfirmBookingNotification,
  createOperatorBookingAssignedNotification,
  createOperatorBookingUpdatedNotification,
  createOperatorBookingCancelledNotification,
  createOperatorIncomeNotification
};
