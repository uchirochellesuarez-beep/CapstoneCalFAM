const pool = require('../db');
const {
  formatLocalDate,
  normalizeDateString,
  ensureNotificationSchema,
  createBookingStatusNotification
} = require('./notification-service');

const EXPIRABLE_BOOKING_STATUSES = ['Pending', 'Unapproved'];
const BOOKING_STATUS_ENUM_VALUES = [
  'Pending',
  'Unapproved',
  'Approved',
  'Rejected',
  'Expired',
  'Completed',
  'Cancelled',
  'In Use',
  'Incomplete'
];

let bookingSchemaPromise = null;

async function ensureBookingSchema() {
  if (!bookingSchemaPromise) {
    bookingSchemaPromise = (async () => {
      const [statusColumn] = await pool.execute("SHOW COLUMNS FROM machinery_bookings LIKE 'status'");

      if (
        statusColumn.length > 0 &&
        typeof statusColumn[0].Type === 'string' &&
        statusColumn[0].Type.startsWith('enum(') &&
        !statusColumn[0].Type.includes("'Expired'")
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

async function syncExpiredMachineryBookings(options = {}) {
  const { bookingId = null } = options;

  await Promise.all([ensureBookingSchema(), ensureNotificationSchema()]);

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