/**
 * Optional prerequisite: book this machine only after a Completed booking
 * of another machine (same barangay). Configurable per inventory row.
 */
async function ensureMachineryPrerequisiteSchema(pool) {
  const [cols] = await pool.execute(
    `SELECT COLUMN_NAME FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'machinery_inventory'
       AND COLUMN_NAME = 'requires_machinery_id'`
  );
  if (cols.length) return;

  await pool.execute(
    `ALTER TABLE machinery_inventory
     ADD COLUMN requires_machinery_id INT NULL DEFAULT NULL
     AFTER assigned_by`
  );

  try {
    await pool.execute(
      `ALTER TABLE machinery_inventory
       ADD CONSTRAINT fk_machinery_requires
       FOREIGN KEY (requires_machinery_id) REFERENCES machinery_inventory(id)
       ON DELETE SET NULL`
    );
  } catch (err) {
    // FK may already exist or engine may reject duplicate name — column is enough
    if (!String(err.message || '').includes('Duplicate')) {
      console.warn('⚠️ requires_machinery_id FK skipped:', err.message);
    }
  }

  console.log('✅ Machinery prerequisite column ready (requires_machinery_id)');
}

module.exports = { ensureMachineryPrerequisiteSchema };
