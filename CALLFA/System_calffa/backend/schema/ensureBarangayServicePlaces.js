/**
 * Ensures barangay_service_places + optional machinery_bookings.barangay_place_id exist.
 * Avoids "run migration first" when admins add places — no manual SQL required for normal setups.
 */
async function ensureBarangayServicePlaces(pool) {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS barangay_service_places (
      id INT PRIMARY KEY AUTO_INCREMENT,
      barangay_id INT NOT NULL,
      name VARCHAR(200) NOT NULL,
      description VARCHAR(500) DEFAULT NULL,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_bsp_barangay_active (barangay_id, is_active),
      CONSTRAINT fk_bsp_barangay FOREIGN KEY (barangay_id) REFERENCES barangays(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
  `);

  try {
    await pool.query(
      'ALTER TABLE machinery_bookings ADD COLUMN barangay_place_id INT NULL COMMENT \'Service place\''
    );
  } catch (e) {
    if (e.code !== 'ER_DUP_FIELDNAME' && e.errno !== 1060) {
      console.warn('[ensureBarangayServicePlaces] machinery_bookings column:', e.message);
    }
  }

  try {
    await pool.query(`
      ALTER TABLE machinery_bookings 
      ADD CONSTRAINT fk_machinery_bookings_barangay_place 
      FOREIGN KEY (barangay_place_id) REFERENCES barangay_service_places(id) ON DELETE SET NULL
    `);
  } catch (e) {
    if (
      e.code !== 'ER_DUP_KEYNAME' &&
      e.errno !== 1826 &&
      e.errno !== 1022 &&
      String(e.message || '').includes('Duplicate foreign key')
    ) {
      console.warn('[ensureBarangayServicePlaces] machinery_bookings FK:', e.message);
    }
  }
}

module.exports = { ensureBarangayServicePlaces };
