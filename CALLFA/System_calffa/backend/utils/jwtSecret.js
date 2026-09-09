const path = require('path');

// Ensure .env is loaded even when this module is required before server.js finishes.
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

/**
 * JWT signing/verification secret from environment.
 * Never falls back to a hardcoded default.
 */
function getJwtSecret() {
  const secret = String(process.env.JWT_SECRET || '').trim();
  if (!secret) {
    console.error('❌ ERROR: JWT_SECRET is not set in .env file!');
    process.exit(1);
  }
  return secret;
}

const JWT_SECRET = getJwtSecret();

module.exports = { getJwtSecret, JWT_SECRET };
