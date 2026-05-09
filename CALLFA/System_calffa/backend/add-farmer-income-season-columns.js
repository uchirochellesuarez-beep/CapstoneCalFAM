// Deprecated: expense forecasting no longer uses season_year/crop_season — safe to omit.
// Historical migration only — Run: node add-farmer-income-season-columns.js

const pool = require('./db');

async function migrate() {
  const conn = await pool.getConnection();
  try {
    console.log('🌾 Adding seasonal columns to farmer_income_records...\n');

    try {
      await conn.execute(`
        ALTER TABLE farmer_income_records 
        ADD COLUMN season_year SMALLINT UNSIGNED NULL,
        ADD COLUMN crop_season ENUM('wet','dry') NULL
      `);
      console.log('✅ Added season_year, crop_season');
    } catch (err) {
      if (String(err.message).includes('Duplicate column')) {
        console.log('⚠️ Season columns already present');
      } else {
        throw err;
      }
    }

    console.log('\n✅ Migration complete.');
  } catch (err) {
    console.error('❌ Migration failed:', err.message);
    process.exitCode = 1;
  } finally {
    conn.release();
    process.exit(0);
  }
}

migrate();
