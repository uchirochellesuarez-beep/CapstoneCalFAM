/**
 * Drops leftover tables that the live app no longer reads or writes.
 * Kept tables (still used): machinery_balance_payment_submissions, receipt_sequences,
 * machinery_booking_refunds, refund_sequences (down-payment refund workflow).
 */
const UNUSED_TABLES = [
  'financial_records',
  'contributions',
  'barangay_activities',
  'barangay_contributions',
  'barangay_officers',
  'farmer_contacts',
  'farmer_documents',
  'membership_history',
  'machinery_blockchain_ledger',
  'seed_fertilizer_plan_obligations',
  'machinery_booking_gateway_payments'
];

async function dropUnusedLegacyTables(pool) {
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    for (const table of UNUSED_TABLES) {
      await pool.query(`DROP TABLE IF EXISTS \`${table}\``);
    }
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (err) {
    console.warn('Could not drop unused legacy tables:', err.message);
    try {
      await pool.query('SET FOREIGN_KEY_CHECKS = 1');
    } catch (_) {
      /* ignore */
    }
  }
}

module.exports = { dropUnusedLegacyTables, UNUSED_TABLES };
