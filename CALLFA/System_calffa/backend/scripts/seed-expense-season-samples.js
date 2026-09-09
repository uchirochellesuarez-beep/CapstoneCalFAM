/**
 * Insert bundled expense training JSON into farmer_income_records (dev only).
 * Production farm-income UI should not show these; forecast reads JSON from disk.
 *
 * Run: node scripts/seed-expense-season-samples.js
 * Remove seeded rows: node scripts/seed-expense-season-samples.js --remove
 */
const pool = require('../db');
const {
  runExpenseTrainingSampleSeed,
  removeExpenseTrainingSampleRecords
} = require('../services/expenseSampleSeedRunner');

async function main() {
  const remove = process.argv.includes('--remove');
  try {
    if (remove) {
      const { deleted } = await removeExpenseTrainingSampleRecords(pool);
      console.log(`Removed ${deleted} bundled sample farm-income row(s).`);
    } else {
      const { inserted, skipped, dirs, skipped_no_farmer } =
        await runExpenseTrainingSampleSeed(pool);
      console.log(
        `Done. dirs: ${dirs.join(', ') || '(none)'}. +${inserted}, duplicate skip ${skipped}, no farmer FK ${skipped_no_farmer}.`
      );
    }
  } catch (err) {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end().catch(() => {});
  }
}

main();
