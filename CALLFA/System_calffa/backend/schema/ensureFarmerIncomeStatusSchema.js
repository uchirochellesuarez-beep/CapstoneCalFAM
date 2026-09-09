/**
 * Keep farmer_income_records.status on Pending | Eligible | Rejected.
 * Invalid values (e.g. "Upcoming Assistance") become '' under non-strict MySQL
 * and then disappear from the President's Verify list.
 */
async function ensureFarmerIncomeStatusSchema(pool) {
  await pool.execute(`
    UPDATE farmer_income_records r
    SET r.status = 'Eligible'
    WHERE (r.status IS NULL OR r.status = '')
      AND EXISTS (
        SELECT 1 FROM income_assistance_distributions d
        WHERE d.income_record_id = r.id
      )
  `);

  await pool.execute(`
    UPDATE farmer_income_records
    SET status = 'Pending'
    WHERE status IS NULL OR status = ''
  `);
}

module.exports = { ensureFarmerIncomeStatusSchema };
