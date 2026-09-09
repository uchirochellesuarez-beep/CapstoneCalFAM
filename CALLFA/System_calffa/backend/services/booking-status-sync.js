const pool = require('../db');
const {
  formatLocalDate,
  normalizeDateString,
  ensureNotificationSchema,
  createBookingStatusNotification,
  createOperatorBookingAssignedNotification
} = require('./notification-service');

const {
  EXPIRABLE_DOWN_PAYMENT_STATUSES,
  BOOKING_STATUS_ENUM_VALUES,
  LEGACY_DOWN_PAYMENT_STATUSES,
  calendarBlockingStatusesSql
} = require('./booking-workflow');

const EXPIRABLE_BOOKING_STATUSES = EXPIRABLE_DOWN_PAYMENT_STATUSES;

let bookingSchemaPromise = null;
let downPaymentMigrationPromise = null;

async function ensureBookingSchema() {
  if (!bookingSchemaPromise) {
    bookingSchemaPromise = (async () => {
      const [statusColumn] = await pool.execute("SHOW COLUMNS FROM machinery_bookings LIKE 'status'");

      if (
        statusColumn.length > 0 &&
        typeof statusColumn[0].Type === 'string' &&
        statusColumn[0].Type.startsWith('enum(') &&
        !BOOKING_STATUS_ENUM_VALUES.every((value) => statusColumn[0].Type.includes(`'${value}'`))
      ) {
        const enumValuesSql = BOOKING_STATUS_ENUM_VALUES.map((value) => `'${value}'`).join(', ');
        await pool.query(
          `ALTER TABLE machinery_bookings MODIFY COLUMN status ENUM(${enumValuesSql}) DEFAULT 'Pending'`
        );
      }

      const [preExpiredColumn] = await pool.execute(
        "SHOW COLUMNS FROM machinery_bookings LIKE 'pre_expired_status'"
      );

      if (preExpiredColumn.length === 0) {
        await pool.query(
          "ALTER TABLE machinery_bookings ADD COLUMN pre_expired_status VARCHAR(20) NULL AFTER status"
        );
      }
    })().catch((error) => {
      bookingSchemaPromise = null;
      throw error;
    });
  }

  return bookingSchemaPromise;
}

async function migrateLegacyDownPaymentBookings() {
  const placeholders = LEGACY_DOWN_PAYMENT_STATUSES.map(() => '?').join(', ');
  const [rows] = await pool.execute(
    `SELECT mb.id, mb.farmer_id, mb.booking_date, mb.assigned_operator_id,
            mi.machinery_name, mi.assigned_operator_id AS machinery_operator_id
     FROM machinery_bookings mb
     LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
     WHERE mb.status IN (${placeholders})
       AND COALESCE(mb.down_payment_amount, 0) <= 0`,
    LEGACY_DOWN_PAYMENT_STATUSES
  );

  for (const row of rows) {
    const operatorId = row.assigned_operator_id || row.machinery_operator_id || null;
    await pool.execute(
      `UPDATE machinery_bookings
       SET status = 'Approved',
           assigned_operator_id = COALESCE(assigned_operator_id, ?)
       WHERE id = ?`,
      [operatorId, row.id]
    );

    await createBookingStatusNotification({
      farmerId: row.farmer_id,
      bookingId: row.id,
      status: 'Approved',
      machineryName: row.machinery_name,
      bookingDate: row.booking_date
    });

    if (operatorId) {
      await createOperatorBookingAssignedNotification({
        operatorId,
        bookingId: row.id,
        machineryName: row.machinery_name,
        bookingDate: row.booking_date
      });
    }
  }

  if (rows.length) {
    console.log(`✅ Migrated ${rows.length} down-payment booking(s) to Approved (no down payment required)`);
  }
}

async function migrateLegacyConfirmedBookings() {
  const [result] = await pool.execute(
    `UPDATE machinery_bookings
     SET status = 'Approved'
     WHERE status IN ('Booking Confirmed', 'Assigned to Operator')`
  );
  if (result.affectedRows) {
    console.log(`✅ Unified ${result.affectedRows} booking(s) to Approved`);
  }
}

async function syncExpiredMachineryBookings(options = {}) {
  const { bookingId = null } = options;

  await Promise.all([ensureBookingSchema(), ensureNotificationSchema()]);

  if (!downPaymentMigrationPromise) {
    downPaymentMigrationPromise = Promise.all([
      migrateLegacyDownPaymentBookings(),
      migrateLegacyConfirmedBookings()
    ]).catch((error) => {
      downPaymentMigrationPromise = null;
      console.error('Failed to migrate legacy booking statuses:', error);
    });
  }
  await downPaymentMigrationPromise;

  const todayStr = formatLocalDate(new Date());
  let query = `
    SELECT
      mb.id,
      mb.farmer_id,
      mb.booking_date,
      mb.status,
      mb.pre_expired_status,
      mi.machinery_name
    FROM machinery_bookings mb
    LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
    WHERE mb.booking_date IS NOT NULL
      AND mb.status IN ('Pending', 'Unapproved', 'Expired')
  `;
  const params = [];

  if (bookingId) {
    query += ' AND mb.id = ?';
    params.push(bookingId);
  }

  const [bookings] = await pool.execute(query, params);
  const summary = { expired: 0, restored: 0 };

  for (const booking of bookings) {
    const bookingDate = normalizeDateString(booking.booking_date);
    if (!bookingDate) continue;

    // Validate farmer_id
    const farmerId = parseInt(booking.farmer_id, 10);
    if (isNaN(farmerId) || farmerId <= 0) {
      console.error(`❌ [syncExpiredMachineryBookings] Invalid farmer_id for booking ${booking.id}:`, booking.farmer_id);
      continue;
    }

    const shouldExpire = bookingDate < todayStr;

    if (shouldExpire && booking.status !== 'Expired') {
      const previousStatus = EXPIRABLE_BOOKING_STATUSES.includes(booking.status)
        ? booking.status
        : (booking.pre_expired_status || 'Pending');

      await pool.execute(
        `UPDATE machinery_bookings
         SET status = 'Expired', pre_expired_status = ?, updated_at = NOW()
         WHERE id = ?`,
        [previousStatus, booking.id]
      );

      console.log(`📅 [syncExpiredMachineryBookings] Booking ${booking.id} expired for farmer ${farmerId}`);

      await createBookingStatusNotification({
        farmerId: farmerId,
        bookingId: booking.id,
        status: 'Expired',
        machineryName: booking.machinery_name,
        bookingDate: booking.booking_date
      });

      summary.expired += 1;
      continue;
    }

    if (!shouldExpire && booking.status === 'Expired') {
      const restoredStatus = EXPIRABLE_BOOKING_STATUSES.includes(booking.pre_expired_status)
        ? booking.pre_expired_status
        : 'Pending';

      await pool.execute(
        `UPDATE machinery_bookings
         SET status = ?, pre_expired_status = NULL, updated_at = NOW()
         WHERE id = ?`,
        [restoredStatus, booking.id]
      );

      summary.restored += 1;
    }
  }

  return summary;
}

module.exports = {
  EXPIRABLE_BOOKING_STATUSES,
  ensureBookingSchema,
  syncExpiredMachineryBookings
};