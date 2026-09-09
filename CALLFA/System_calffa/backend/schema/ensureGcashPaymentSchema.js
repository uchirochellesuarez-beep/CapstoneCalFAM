/**
 * Treasurer-managed GCash QR inventory + farmer proof submissions.
 * Receipts are created only after treasurer confirmation.
 */
async function tableExists(pool, table) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.TABLES
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?`,
    [table]
  );
  return rows.length > 0;
}

async function ensureGcashPaymentSchema(pool) {
  if (!(await tableExists(pool, 'gcash_qr_inventory'))) {
    await pool.execute(`
      CREATE TABLE gcash_qr_inventory (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barangay_id INT NOT NULL,
        image_path VARCHAR(500) NOT NULL,
        original_filename VARCHAR(255) NULL,
        uploaded_by INT NOT NULL,
        is_active TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        INDEX idx_gcash_qr_barangay_active (barangay_id, is_active)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created gcash_qr_inventory table');
  }

  if (!(await tableExists(pool, 'gcash_payment_submissions'))) {
    await pool.execute(`
      CREATE TABLE gcash_payment_submissions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        barangay_id INT NOT NULL,
        farmer_id INT NOT NULL,
        transaction_type ENUM('loan', 'machinery') NOT NULL,
        reference_id INT NOT NULL,
        reference_number VARCHAR(100) NULL,
        proof_path VARCHAR(500) NOT NULL,
        payment_date DATE NOT NULL,
        status ENUM('pending_verification', 'verified', 'rejected') NOT NULL DEFAULT 'pending_verification',
        amount_paid DECIMAL(12, 2) NULL,
        qr_inventory_id INT NULL,
        remarks TEXT NULL,
        rejection_reason TEXT NULL,
        submitted_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        verified_by INT NULL,
        verified_at DATETIME NULL,
        receipt_number VARCHAR(32) NULL,
        payment_record_id INT NULL,
        INDEX idx_gcash_sub_barangay_status (barangay_id, status),
        INDEX idx_gcash_sub_farmer (farmer_id, status),
        INDEX idx_gcash_sub_txn (transaction_type, reference_id, status)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    `);
    console.log('✅ Created gcash_payment_submissions table');
  }
}

module.exports = { ensureGcashPaymentSchema };
