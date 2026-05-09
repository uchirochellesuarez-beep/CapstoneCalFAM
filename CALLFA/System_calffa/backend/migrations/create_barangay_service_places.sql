-- Barangay-specific places for machinery booking (optional manual run).
-- Normally the backend creates this table on startup — see schema/ensureBarangayServicePlaces.js
--
-- If barangay_place_id already exists: skip the ALTERs at the bottom.
-- If FK already exists: skip the CONSTRAINT line only.

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
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE machinery_bookings
  ADD COLUMN barangay_place_id INT NULL COMMENT 'Predefined service place when set';

ALTER TABLE machinery_bookings
  ADD CONSTRAINT fk_machinery_bookings_barangay_place
    FOREIGN KEY (barangay_place_id) REFERENCES barangay_service_places(id) ON DELETE SET NULL;

-- If you previously had sort_order and want to drop it:
-- ALTER TABLE barangay_service_places DROP COLUMN sort_order;
