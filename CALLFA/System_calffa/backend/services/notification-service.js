const pool = require('../db');

const STATUS_NOTIFICATION_TYPES = ['booking_approved', 'booking_rejected', 'booking_expired'];
const ASSISTANCE_NOTIFICATION_TYPES = ['assistance_allocated'];
const REFERENCE_TYPE_VALUES = ['loan', 'machinery_booking', 'income_assistance_distribution'];
const NOTIFICATION_ENUM_VALUES = [
  'last_month',
  'last_week',
  '3_days',
  '2_days',
  '1_day',
  'due_day',
  'overdue_penalty',
  ...ASSISTANCE_NOTIFICATION_TYPES,
  ...STATUS_NOTIFICATION_TYPES
];

let notificationSchemaPromise = null;

const formatLocalDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const normalizeDateString = (value) => {
  if (!value) return null;

  if (typeof value === 'string') {
    return value.split('T')[0];
  }

  if (value instanceof Date) {
    return formatLocalDate(value);
  }

  return String(value).split('T')[0];
};

async function ensureNotificationSchema() {
  if (!notificationSchemaPromise) {
    notificationSchemaPromise = (async () => {
      const [typeColumn] = await pool.execute("SHOW COLUMNS FROM due_date_notifications LIKE 'notification_type'");
      const [referenceTypeColumn] = await pool.execute("SHOW COLUMNS FROM due_date_notifications LIKE 'reference_type'");

      if (
        typeColumn.length > 0 &&
        typeof typeColumn[0].Type === 'string' &&
        typeColumn[0].Type.startsWith('enum(') &&
        !STATUS_NOTIFICATION_TYPES.every((type) => typeColumn[0].Type.includes(`'${type}'`))
      ) {
        const enumValuesSql = NOTIFICATION_ENUM_VALUES.map((value) => `'${value}'`).join(', ');
        await pool.query(
          `ALTER TABLE due_date_notifications MODIFY COLUMN notification_type ENUM(${enumValuesSql}) NOT NULL`
        );
      }

      if (
        referenceTypeColumn.length > 0 &&
        typeof referenceTypeColumn[0].Type === 'string' &&
        referenceTypeColumn[0].Type.startsWith('enum(') &&
        !REFERENCE_TYPE_VALUES.every((value) => referenceTypeColumn[0].Type.includes(`'${value}'`))
      ) {
        const referenceTypeSql = REFERENCE_TYPE_VALUES.map((value) => `'${value}'`).join(', ');
        await pool.query(
          `ALTER TABLE due_date_notifications MODIFY COLUMN reference_type ENUM(${referenceTypeSql}) NOT NULL`
        );
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
       (farmer_id, reference_type, reference_id, notification_type, title, message, due_date, trigger_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.farmer_id,
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
    console.error('Error inserting notification:', error.message);
    return false;
  }
}

async function createBookingStatusNotification({
  farmerId,
  bookingId,
  status,
  machineryName,
  bookingDate,
  rejectionReason = null
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

  // Ensure bookingId is a valid number
  const bookingIdNum = parseInt(bookingId, 10);
  if (isNaN(bookingIdNum) || bookingIdNum <= 0) {
    console.error('❌ [createBookingStatusNotification] Invalid bookingId:', bookingId);
    return false;
  }

  const normalizedStatus = String(status || '').trim();
  const notificationTypeMap = {
    Approved: 'booking_approved',
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

async function createIncomeAssistanceNotification({
  farmerId,
  distributionId,
  assistanceLabel,
  message
}) {
  if (!farmerId || !distributionId || !message) {
    return false;
  }

  const triggerDate = formatLocalDate(new Date());

  return upsertNotification({
    farmer_id: farmerId,
    reference_type: 'income_assistance_distribution',
    reference_id: distributionId,
    notification_type: 'assistance_allocated',
    title: `${assistanceLabel} Assistance Approved`,
    message,
    due_date: triggerDate,
    trigger_date: triggerDate
  });
}

module.exports = {
  ASSISTANCE_NOTIFICATION_TYPES,
  STATUS_NOTIFICATION_TYPES,
  REFERENCE_TYPE_VALUES,
  formatLocalDate,
  normalizeDateString,
  ensureNotificationSchema,
  upsertNotification,
  createBookingStatusNotification,
  createIncomeAssistanceNotification
};
