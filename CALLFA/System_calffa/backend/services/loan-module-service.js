const pool = require('../db');

async function isLoansEnabledForBarangay(barangayId) {
  if (barangayId == null || barangayId === '') return true;

  const [[row]] = await pool.execute(
    'SELECT COALESCE(loans_enabled, 1) AS loans_enabled FROM barangays WHERE id = ? LIMIT 1',
    [barangayId]
  );

  if (!row) return true;
  return Number(row.loans_enabled) === 1;
}

async function getLoanModuleStatus(barangayId) {
  const enabled = await isLoansEnabledForBarangay(barangayId);
  return {
    barangay_id: barangayId != null ? Number(barangayId) : null,
    enabled
  };
}

async function setLoansEnabledForBarangay(barangayId, enabled) {
  const [[existing]] = await pool.execute('SELECT id FROM barangays WHERE id = ? LIMIT 1', [barangayId]);
  if (!existing) {
    const err = new Error('Barangay not found');
    err.status = 404;
    throw err;
  }

  await pool.execute('UPDATE barangays SET loans_enabled = ? WHERE id = ?', [enabled ? 1 : 0, barangayId]);

  return getLoanModuleStatus(barangayId);
}

module.exports = {
  isLoansEnabledForBarangay,
  getLoanModuleStatus,
  setLoansEnabledForBarangay
};
