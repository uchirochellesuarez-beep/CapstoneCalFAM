async function dropUnusedActivityLogs(pool) {
  try {
    await pool.query('SET FOREIGN_KEY_CHECKS = 0');
    await pool.query('DROP TABLE IF EXISTS activity_logs');
    await pool.query('DROP TABLE IF EXISTS announcement_notifications');
    await pool.query('SET FOREIGN_KEY_CHECKS = 1');
  } catch (err) {
    console.warn('Could not drop unused tables:', err.message);
  }
}

module.exports = { dropUnusedActivityLogs };
