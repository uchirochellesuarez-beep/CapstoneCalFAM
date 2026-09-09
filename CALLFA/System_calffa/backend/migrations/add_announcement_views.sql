-- Unique announcement views (one row per farmer per announcement)
CREATE TABLE IF NOT EXISTS announcement_views (
  id INT AUTO_INCREMENT PRIMARY KEY,
  announcement_id INT NOT NULL,
  farmer_id INT NOT NULL,
  viewed_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_announcement_farmer_view (announcement_id, farmer_id),
  INDEX idx_announcement_views_announcement (announcement_id),
  INDEX idx_announcement_views_farmer (farmer_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;
