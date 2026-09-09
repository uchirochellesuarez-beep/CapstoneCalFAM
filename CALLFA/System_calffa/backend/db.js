const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const mysql = require('mysql2/promise');

if (!process.env.DB_NAME) {
  console.error('❌ ERROR: DB_NAME is not set in .env file!');
  process.exit(1);
}

function resolveDbHost(host) {
  const value = String(host || 'localhost').trim().toLowerCase();
  // Windows/XAMPP: localhost often resolves to ::1 first and times out.
  if (value === 'localhost' || value === '::1') return '127.0.0.1';
  return host || '127.0.0.1';
}

const dbHost = resolveDbHost(process.env.DB_HOST);

const pool = mysql.createPool({
  host: dbHost,
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  port: Number(process.env.DB_PORT || 3306),
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  connectTimeout: 4000,
  enableKeepAlive: true
});

async function pingDatabase(attempt = 1) {
  const maxAttempts = 6;
  try {
    const connection = await pool.getConnection();
    console.log(`✅ Connected to MySQL database: ${process.env.DB_NAME}`);
    connection.release();
  } catch (err) {
    if (attempt < maxAttempts) {
      console.warn(`⚠️ Database not ready (${err.message}). Retry ${attempt}/${maxAttempts - 1}...`);
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return pingDatabase(attempt + 1);
    }
    console.error('❌ Database connection failed:', err.message);
    console.error('   Start MySQL in XAMPP, then save a backend file or type rs in this terminal.');
  }
}

pingDatabase();

module.exports = pool;
