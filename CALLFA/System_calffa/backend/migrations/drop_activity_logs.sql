-- Drop unused tables (not used by the application).
SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS announcement_notifications;
SET FOREIGN_KEY_CHECKS = 1;
