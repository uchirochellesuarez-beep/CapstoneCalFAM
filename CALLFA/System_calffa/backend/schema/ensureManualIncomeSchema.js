async function ensureManualIncomeSchema(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS machinery_manual_income (
      id INT AUTO_INCREMENT PRIMARY KEY,
      barangay_id INT NOT NULL,
      source_name VARCHAR(150) NOT NULL,
      date_of_income DATE NOT NULL,
      income_amount DECIMAL(12, 2) NOT NULL,
      remarks TEXT NULL,
      record_created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_manual_income_barangay (barangay_id),
      INDEX idx_manual_income_date (date_of_income)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
}

module.exports = { ensureManualIncomeSchema };
