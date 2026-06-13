/**
 * Drops unused machinery_bookings columns.
 * Run: node apply-drop-unused-booking-columns.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

async function columnExists(connection, table, column) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows[0].cnt > 0;
}

async function dropForeignKeyIfExists(connection, table, constraintName) {
  const [rows] = await connection.execute(
    `SELECT COUNT(*) AS cnt
     FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE()
       AND TABLE_NAME = ?
       AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [table, constraintName]
  );
  if (rows[0].cnt > 0) {
    await connection.execute(
      `ALTER TABLE \`${table}\` DROP FOREIGN KEY \`${constraintName}\``
    );
    console.log(`✓ Dropped FK ${constraintName}`);
  }
}

async function dropColumnIfExists(connection, table, column) {
  if (await columnExists(connection, table, column)) {
    await connection.execute(`ALTER TABLE \`${table}\` DROP COLUMN \`${column}\``);
    console.log(`✓ Dropped column ${column}`);
  } else {
    console.log(`- Column ${column} not present (skipped)`);
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'calfam_db',
    multipleStatements: true
  });

  try {
    console.log('Dropping unused machinery_bookings columns...\n');

    await dropForeignKeyIfExists(connection, 'machinery_bookings', 'fk_payment_recorded_by');
    await dropForeignKeyIfExists(connection, 'machinery_bookings', 'fk_operator_signoff_by');
    await dropForeignKeyIfExists(connection, 'machinery_bookings', 'fk_manager_verified_by');

    const columns = [
      'payment_recorded_by',
      'equipment_deployed_date',
      'equipment_return_date',
      'equipment_hours_used',
      'operator_signoff',
      'operator_signoff_date',
      'operator_signoff_by',
      'manager_verification',
      'manager_verification_date',
      'manager_verified_by',
      'manager_verification_by'
    ];

    for (const col of columns) {
      await dropColumnIfExists(connection, 'machinery_bookings', col);
    }

    const [completedCols] = await connection.execute(
      `SELECT COLUMN_NAME FROM information_schema.COLUMNS
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME = 'machinery_bookings'
         AND COLUMN_NAME IN ('completed_by', 'completed_date')`
    );
    console.log('\nRemaining completion columns:', completedCols.map((r) => r.COLUMN_NAME).join(', ') || 'none');

    console.log('\nDone.');
  } finally {
    await connection.end();
  }
}

main().catch((err) => {
  console.error('Migration failed:', err.message);
  process.exit(1);
});
