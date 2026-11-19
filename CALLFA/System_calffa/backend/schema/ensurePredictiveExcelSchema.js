/**
 * Persisted Predictive Analytics Excel semester rows (separate from Farm Income Records).
 */
async function ensurePredictiveExcelSchema(pool) {
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS farmer_predictive_excel_rows (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT,
      farmer_id INT NOT NULL,
      agricultural_semester VARCHAR(16) NOT NULL,
      year SMALLINT NOT NULL,
      half TINYINT NOT NULL,
      area_hectares DECIMAL(12,4) NOT NULL,
      planting_method VARCHAR(32) NOT NULL,
      irrigation_type VARCHAR(64) NOT NULL,
      land_preparation_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      planting_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      spraying_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      harvester_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      drying_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      hauling_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      tarasko_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      fuel_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      other_expenses DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_fertilizer_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_pesticide_cost DECIMAL(14,2) NOT NULL DEFAULT 0,
      total_expenses DECIMAL(14,2) NOT NULL DEFAULT 0,
      uploaded_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      UNIQUE KEY uq_farmer_predictive_semester (farmer_id, agricultural_semester),
      KEY idx_farmer_predictive_excel_farmer (farmer_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);
}

module.exports = { ensurePredictiveExcelSchema };
