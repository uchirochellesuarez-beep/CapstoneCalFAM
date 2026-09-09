/**
 * Machinery inventory status is only Available | Unavailable.
 */
async function ensureMachineryStatusSchema(pool) {
  const [cols] = await pool.execute(
    `SELECT COLUMN_TYPE FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'machinery_inventory'
       AND COLUMN_NAME = 'status'`
  );
  if (!cols.length) return;

  const colType = String(cols[0].COLUMN_TYPE || '');
  const alreadySimplified =
    colType.includes("'Unavailable'") &&
    !colType.includes("'In Use'") &&
    !colType.includes("'Not Available'");
  if (alreadySimplified) return;

  await pool.execute(
    `ALTER TABLE machinery_inventory
     MODIFY COLUMN status VARCHAR(32) NOT NULL DEFAULT 'Available'`
  );
  await pool.execute(
    `UPDATE machinery_inventory
     SET status = 'Unavailable'
     WHERE status IS NULL OR status <> 'Available'`
  );
  await pool.execute(
    `ALTER TABLE machinery_inventory
     MODIFY COLUMN status ENUM('Available', 'Unavailable') NOT NULL DEFAULT 'Available'`
  );
  console.log('✅ Machinery inventory status simplified to Available / Unavailable');
}

module.exports = { ensureMachineryStatusSchema };
