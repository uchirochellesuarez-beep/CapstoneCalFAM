const crypto = require('crypto');
const { ensureActiveSessionSchema } = require('../schema/ensureActiveSessionSchema');

let schemaReady = false;

async function ensureReady(pool) {
  if (schemaReady) return;
  await ensureActiveSessionSchema(pool);
  schemaReady = true;
}

function createSessionId() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Start a new exclusive session for this account (invalidates any previous login).
 */
async function startUserSession(pool, userId) {
  await ensureReady(pool);
  const sessionId = createSessionId();
  await pool.execute(
    `UPDATE farmers SET active_session_id = ? WHERE id = ?`,
    [sessionId, userId]
  );
  return sessionId;
}

/**
 * Clear session on logout. Only clears if sessionId matches (or sessionId omitted).
 */
async function clearUserSession(pool, userId, sessionId = null) {
  await ensureReady(pool);
  if (sessionId) {
    await pool.execute(
      `UPDATE farmers SET active_session_id = NULL
       WHERE id = ? AND active_session_id = ?`,
      [userId, sessionId]
    );
  } else {
    await pool.execute(
      `UPDATE farmers SET active_session_id = NULL WHERE id = ?`,
      [userId]
    );
  }
}

/**
 * Validate JWT session id against the account's active session.
 * Returns { ok: true } or { ok: false, code, message }.
 */
async function validateUserSession(pool, userId, sessionId) {
  await ensureReady(pool);

  if (!sessionId) {
    return {
      ok: false,
      code: 'SESSION_REQUIRED',
      message: 'Your session is no longer valid. Please sign in again.'
    };
  }

  const [rows] = await pool.execute(
    `SELECT active_session_id FROM farmers WHERE id = ?`,
    [userId]
  );

  if (!rows.length) {
    return { ok: false, code: 'USER_NOT_FOUND', message: 'User not found' };
  }

  const active = rows[0].active_session_id;
  // Legacy tokens issued before this feature: allow until next login rotates session
  if (!active) {
    return { ok: true, legacy: true };
  }

  if (active !== sessionId) {
    return {
      ok: false,
      code: 'SESSION_REPLACED',
      message:
        'This account is already signed in on another browser or device. You have been logged out here.'
    };
  }

  return { ok: true };
}

module.exports = {
  createSessionId,
  startUserSession,
  clearUserSession,
  validateUserSession,
  ensureReady
};
