/**
 * Drops dead machinery booking payment-related columns that the live app never reads or writes.
 * Safe to run on every startup (information_schema guarded).
 */
async function columnExists(pool, table, column) {
  const [rows] = await pool.query(
    `SELECT 1 AS ok
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?
     LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function dropColumnsIfExist(pool, table, columns) {
  const toDrop = [];
  for (const col of columns) {
    if (await columnExists(pool, table, col)) {
      toDrop.push(col);
    }
  }
  if (!toDrop.length) return [];

  const drops = toDrop.map((c) => `DROP COLUMN \`${c}\``).join(', ');
  await pool.query(`ALTER TABLE \`${table}\` ${drops}`);
  return toDrop;
}

/** Leftover on machinery_bookings — method lives on payments / down_payment_method. */
const DEAD_BOOKING_COLUMNS = [
  'payment_method',
  'payment_gateway',
  'xendit_transaction_id',
  'external_reference_id'
];

/** Leftover gateway fields on payment history — never written by app code. */
const DEAD_PAYMENT_COLUMNS = [
  'payment_gateway',
  'xendit_transaction_id',
  'external_reference_id'
];

async function dropUnusedMachineryBookingColumns(pool) {
  try {
    const droppedBooking = await dropColumnsIfExist(
      pool,
      'machinery_bookings',
      DEAD_BOOKING_COLUMNS
    );
    if (droppedBooking.length) {
      console.log(
        `✅ Dropped unused machinery_bookings column(s): ${droppedBooking.join(', ')}`
      );
    }

    const droppedPayments = await dropColumnsIfExist(
      pool,
      'machinery_booking_payments',
      DEAD_PAYMENT_COLUMNS
    );
    if (droppedPayments.length) {
      console.log(
        `✅ Dropped unused machinery_booking_payments column(s): ${droppedPayments.join(', ')}`
      );
    }
  } catch (err) {
    console.warn('Could not drop unused machinery booking payment columns:', err.message);
  }
}

module.exports = {
  dropUnusedMachineryBookingColumns,
  DEAD_BOOKING_COLUMNS,
  DEAD_PAYMENT_COLUMNS
};
