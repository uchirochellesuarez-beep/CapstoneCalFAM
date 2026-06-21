const pool = require('../db');
const {
  formatLocalDate,
  normalizeDateString
} = require('../utils/philippinesTime');

const STATUS_NOTIFICATION_TYPES = [
  'booking_approved',
  'booking_rejected',
  'booking_expired',
  'booking_down_payment_required',
  'booking_payment_rejected',
  'booking_payment_verified',
  'booking_confirmed'
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
  'treasurer_balance_payment_submitted',
  'treasurer_collectible_created',
  'treasurer_refund_requested'
];
const ASSISTANCE_NOTIFICATION_TYPES = ['assistance_allocated'];
const ANNOUNCEMENT_NOTIFICATION_TYPES = ['announcement_posted'];
const FARMER_REFERENCE_TYPES = ['loan', 'machinery_booking', 'income_assistance_distribution'];
const OPERATOR_REFERENCE_TYPES = ['operator_machinery_booking', 'operator_income'];
const TREASURER_REFERENCE_TYPES = ['machinery_expense', 'machinery_booking'];
const REFERENCE_TYPE_VALUES = [
  ...FARMER_REFERENCE_TYPES,
  ...OPERATOR_REFERENCE_TYPES,
  ...TREASURER_REFERENCE_TYPES,
  'announcement'
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

      const needsTypeUpdate =
        typeColumn.length > 0 &&
        typeof typeDef === 'string' &&
        typeDef.startsWith('enum(') &&
        !NOTIFICATION_ENUM_VALUES.every((value) => typeDef.includes(`'${value}'`));

      const needsReferenceUpdate =
        referenceTypeColumn.length > 0 &&
        typeof referenceDef === 'string' &&
        referenceDef.startsWith('enum(') &&
        !REFERENCE_TYPE_VALUES.every((value) => referenceDef.includes(`'${value}'`));

      if (needsTypeUpdate) {
        const enumValuesSql = NOTIFICATION_ENUM_VALUES.map((value) => `'${value}'`).join(', ');
        await pool.query(
          `ALTER TABLE due_date_notifications MODIFY COLUMN notification_type ENUM(${enumValuesSql}) NOT NULL`
        );
        console.log('✅ Updated due_date_notifications.notification_type enum');
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
      if (data.notification_type === 'overdue_penalty') {
        const existingTrigger = normalizeDateString(existing[0].trigger_date);
        if (existingTrigger !== data.trigger_date || existing[0].message !== data.message) {
          await pool.execute(
            `UPDATE due_date_notifications
             SET trigger_date = ?, message = ?, title = ?, is_read = 0
             WHERE id = ?`,
            [data.trigger_date, data.message, data.title, existing[0].id]
          );
          return true;
        }
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
  remainingBalance = null
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
    Expired: 'booking_expired'
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

  const payloadByStatus = {
    Approved: {
      title: `${machineLabel} Booking Approved`,
      message: `Your booking scheduled for ${bookingDateLabel} has been approved.`
    },
    'Awaiting Down Payment': {
      title: `${machineLabel} — Down Payment Required`,
      message: downPaymentAmount != null
        ? `Your booking for ${bookingDateLabel} is approved pending payment. Pay 20% down (₱${Number(downPaymentAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}) to reserve your slot.`
        : `Your booking for ${bookingDateLabel} requires a 20% down payment before reservation.`
    },
    'Payment Rejected': {
      title: `${machineLabel} — Payment Rejected`,
      message: rejectionReason
        ? `Your down payment was rejected. Reason: ${rejectionReason}. Please resubmit payment proof.`
        : `Your down payment was rejected. Please resubmit payment proof.`
    },
    'Down Payment Verified': {
      title: `${machineLabel} — Down Payment Verified`,
      message: `Your 20% down payment has been verified. Awaiting final booking confirmation.`
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

async function deleteNotificationsForReference(referenceType, referenceId) {
  const refId = parseInt(referenceId, 10);
  if (!referenceType || !refId) return 0;

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
       AND mb.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN machinery_expenses me ON me.id = n.reference_id
     WHERE n.reference_type = 'machinery_expense' AND me.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN loans l ON l.id = n.reference_id
     WHERE n.reference_type = 'loan' AND l.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN income_assistance_distributions d ON d.id = n.reference_id
     WHERE n.reference_type = 'income_assistance_distribution' AND d.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     LEFT JOIN announcements a ON a.id = n.reference_id
     WHERE n.reference_type = 'announcement' AND a.id IS NULL`,
    `DELETE n FROM due_date_notifications n
     WHERE n.notification_type = 'treasurer_refund_requested'
       AND n.reference_type = 'machinery_booking'
       AND NOT EXISTS (
         SELECT 1 FROM machinery_booking_refunds r
         WHERE r.booking_id = n.reference_id
           AND r.refund_status IN ('Refund Requested', 'Under Review', 'Approved', 'Pending')
       )`,
    `DELETE n FROM due_date_notifications n
     INNER JOIN machinery_bookings mb ON mb.id = n.reference_id
     WHERE n.reference_type = 'machinery_booking'
       AND n.notification_type = 'treasurer_down_payment_submitted'
       AND mb.status <> 'Awaiting Payment Verification'`,
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
    message: `A booking for ${machineLabel} on ${bookingDateLabel} has been confirmed and assigned to you.`,
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
    message: `You received ₱${amount.toLocaleString('en-PH', { minimumFractionDigits: 2 })} labor compensation for booking #${bookingId} (${txDate}).`,
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
    title: `Down Payment Proof — Booking #${bookingId}`,
    message: `${farmerName || 'A farmer'} submitted down payment proof for ${machineryName || 'machinery'} (₱${Number(amountPaid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 })}). Please verify.`,
    dueDate: expenseDate
  });
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
    title: `Confirm Booking #${bookingId}`,
    message: `Down payment verified for ${machineryName || 'machinery'} (${farmerName || 'farmer'}). Perform final confirmation for ${dateLabel}.`,
    due_date: dateLabel,
    trigger_date: triggerDate
  });
}

module.exports = {
  ANNOUNCEMENT_NOTIFICATION_TYPES,
  ASSISTANCE_NOTIFICATION_TYPES,
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
  createTreasurerPendingExpenseNotification,
  createTreasurerDownPaymentSubmittedNotification,
  createTreasurerBalancePaymentSubmittedNotification,
  createTreasurerCollectibleCreatedNotification,
  createTreasurerRefundRequestedNotification,
  createManagerConfirmBookingNotification,
  createOperatorBookingAssignedNotification,
  createOperatorBookingUpdatedNotification,
  createOperatorBookingCancelledNotification,
  createOperatorIncomeNotification
};
