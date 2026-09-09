/**
 * Single active login session per farmer account.
 * New login replaces active_session_id; older tokens are rejected.
 */
async function columnExists(pool, table, column) {
  const [rows] = await pool.execute(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return rows.length > 0;
}

async function ensureActiveSessionSchema(pool) {
  if (!(await columnExists(pool, 'farmers', 'active_session_id'))) {
    await pool.execute(
      `ALTER TABLE farmers
       ADD COLUMN active_session_id VARCHAR(64) NULL AFTER password_hash,
       ADD INDEX idx_farmers_active_session (active_session_id)`
    );
    console.log('✅ Added farmers.active_session_id (single-session login)');
  }
}

module.exports = { ensureActiveSessionSchema };
