/**
 * Manual / CI: same idempotent seed as server startup (optional).
 * Default: backend already runs this on boot unless EXPENSE_FORECAST_DISABLE_STARTUP_SAMPLE_SEED=1.
 *
 * Run: node scripts/seed-expense-season-samples.js
 */
const pool = require('../db');
const { runExpenseTrainingSampleSeed } = require('../services/expenseSampleSeedRunner');

async function main() {
  try {
    const { inserted, skipped, dirs, skipped_no_farmer } =
      await runExpenseTrainingSampleSeed(pool);
    console.log(
      `Done. dirs: ${dirs.join(', ') || '(none)'}. +${inserted}, duplicate skip ${skipped}, no farmer FK ${skipped_no_farmer}.`
    );
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
