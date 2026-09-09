const pool = require('../db');

function parseDownPaymentPercent(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(value.trim()) : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded <= 0 || rounded > 100) return null;
  return rounded;
}

async function getDownPaymentSettings(barangayId) {
  if (barangayId == null || barangayId === '') {
    return { barangay_id: null, enabled: false, percent: null };
  }

  const [[row]] = await pool.execute(
    `SELECT COALESCE(machinery_down_payment_enabled, 0) AS enabled,
            machinery_down_payment_percent AS percent
     FROM barangays WHERE id = ? LIMIT 1`,
    [barangayId]
  );

  if (!row) {
    return { barangay_id: Number(barangayId), enabled: false, percent: null };
  }

  return {
    barangay_id: Number(barangayId),
    enabled: Number(row.enabled) === 1,
    percent: row.percent != null ? parseFloat(row.percent) : null
  };
}

async function isDownPaymentEnabledForBarangay(barangayId) {
  const settings = await getDownPaymentSettings(barangayId);
  return Boolean(settings.enabled && parseDownPaymentPercent(settings.percent));
}

async function setDownPaymentSettings(barangayId, payload = {}) {
  const [[existing]] = await pool.execute('SELECT id FROM barangays WHERE id = ? LIMIT 1', [barangayId]);
  if (!existing) {
    const err = new Error('Barangay not found');
    err.status = 404;
    throw err;
  }

  const current = await getDownPaymentSettings(barangayId);
  const nextEnabled = typeof payload.enabled === 'boolean' ? payload.enabled : current.enabled;

  let nextPercent = current.percent;
  if (Object.prototype.hasOwnProperty.call(payload, 'percent')) {
    if (payload.percent === null || payload.percent === '') {
      nextPercent = null;
    } else {
      nextPercent = parseDownPaymentPercent(payload.percent);
      if (nextPercent == null) {
        const err = new Error('Enter a down payment percentage between 1 and 100.');
        err.status = 400;
        throw err;
      }
    }
  }

  if (nextEnabled && parseDownPaymentPercent(nextPercent) == null) {
    const err = new Error('Set a down payment percentage (1–100) before turning this on.');
    err.status = 400;
    throw err;
  }

  await pool.execute(
    `UPDATE barangays
     SET machinery_down_payment_enabled = ?,
         machinery_down_payment_percent = ?
     WHERE id = ?`,
    [nextEnabled ? 1 : 0, nextPercent, barangayId]
  );

  return getDownPaymentSettings(barangayId);
}

module.exports = {
  parseDownPaymentPercent,
  getDownPaymentSettings,
  isDownPaymentEnabledForBarangay,
  setDownPaymentSettings
};
