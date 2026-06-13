/**
 * Backfill completed_by / completed_date for bookings marked Completed
 * before operator completion tracking was enforced.
 *
 * Run: node backfill-completed-booking-tracking.js
 */
require('dotenv').config();
const mysql = require('mysql2/promise');

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calfam_db'
  });

  try {
    // Undo API test on booking 51 (was Approved before test)
    await connection.execute(
      `UPDATE machinery_bookings
       SET status = 'Approved', machine_used = 0, completed_by = NULL, completed_date = NULL
       WHERE id = 51 AND completed_by = 66`
    );

    const [before] = await connection.execute(
      `SELECT COUNT(*) AS cnt FROM machinery_bookings
       WHERE status = 'Completed' AND (completed_by IS NULL OR completed_date IS NULL)`
    );
    console.log(`Bookings to backfill: ${before[0].cnt}`);

    // Use the sole operator per barangay when unambiguous; always set completed_date from updated_at.
    const [result] = await connection.execute(
      `UPDATE machinery_bookings mb
       LEFT JOIN (
         SELECT barangay_id, MIN(id) AS operator_id, COUNT(*) AS operator_count
         FROM farmers
         WHERE role = 'operator'
         GROUP BY barangay_id
         HAVING COUNT(*) = 1
       ) op ON op.barangay_id = mb.barangay_id
       SET mb.completed_by = COALESCE(mb.completed_by, op.operator_id),
           mb.completed_date = COALESCE(mb.completed_date, mb.updated_at)
       WHERE mb.status = 'Completed'
         AND (mb.completed_by IS NULL OR mb.completed_date IS NULL)`
    );

    console.log(`Updated rows: ${result.affectedRows}`);

    const [after] = await connection.execute(
      `SELECT id, status, completed_by, completed_date, updated_at
       FROM machinery_bookings
       WHERE status = 'Completed'
       ORDER BY id`
    );
    console.table(after);
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Backfill failed:', err.message);
  process.exit(1);
});
