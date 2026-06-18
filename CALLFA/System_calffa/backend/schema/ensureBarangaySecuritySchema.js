/**
 * Multi-barangay security columns and backfills.
 */
async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function ensureBarangaySecuritySchema(pool) {
  if (!(await columnExists(pool, 'payment_receipts', 'barangay_id'))) {
    await pool.execute(
      `ALTER TABLE payment_receipts
       ADD COLUMN barangay_id INT NULL AFTER collected_by,
       ADD INDEX idx_payment_receipts_barangay (barangay_id)`
    );
    console.log('✅ Added payment_receipts.barangay_id');

    await pool.execute(
      `UPDATE payment_receipts pr
       JOIN farmers f ON pr.collected_by = f.id
       SET pr.barangay_id = f.barangay_id
       WHERE pr.barangay_id IS NULL AND f.barangay_id IS NOT NULL`
    );
  }

  if (!(await columnExists(pool, 'machinery_expenses', 'barangay_id'))) {
    await pool.execute(
      `ALTER TABLE machinery_expenses
       ADD COLUMN barangay_id INT NULL AFTER machinery_id,
       ADD INDEX idx_machinery_expenses_barangay (barangay_id)`
    );
    console.log('✅ Added machinery_expenses.barangay_id');
  }

  await pool.execute(
    `UPDATE machinery_expenses me
     JOIN machinery_inventory mi ON me.machinery_id = mi.id
     SET me.barangay_id = mi.barangay_id
     WHERE me.barangay_id IS NULL AND mi.barangay_id IS NOT NULL`
  );

  if (!(await columnExists(pool, 'due_date_notifications', 'barangay_id'))) {
    await pool.execute(
      `ALTER TABLE due_date_notifications
       ADD COLUMN barangay_id INT NULL AFTER farmer_id,
       ADD INDEX idx_ddn_barangay (barangay_id)`
    );
    console.log('✅ Added due_date_notifications.barangay_id');

    await pool.execute(
      `UPDATE due_date_notifications n
       JOIN farmers f ON n.farmer_id = f.id
       SET n.barangay_id = f.barangay_id
       WHERE n.barangay_id IS NULL AND f.barangay_id IS NOT NULL`
    );
  }

  await pool.execute(
    `UPDATE payment_receipts pr
     LEFT JOIN loans l ON pr.module = 'admin_loan' AND pr.reference_id = l.id
     LEFT JOIN machinery_bookings mb ON pr.module IN ('machinery_rental', 'machinery_collection') AND pr.reference_id = mb.id
     LEFT JOIN machinery_expenses me ON pr.module = 'machinery_expense' AND pr.reference_id = me.id
     LEFT JOIN share_capital_contributions sc ON pr.module = 'share_capital' AND pr.reference_id = sc.id
     LEFT JOIN farmers sf ON sc.farmer_id = sf.id
     LEFT JOIN monthly_dues md ON pr.module = 'association_dues' AND pr.reference_id = md.id
     SET pr.barangay_id = COALESCE(
       pr.barangay_id,
       l.barangay_id,
       mb.barangay_id,
       me.barangay_id,
       sf.barangay_id,
       md.barangay_id
     )
     WHERE pr.barangay_id IS NULL`
  );
}

module.exports = { ensureBarangaySecuritySchema };
