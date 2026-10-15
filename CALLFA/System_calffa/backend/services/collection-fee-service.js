const pool = require('../db');

const DEFAULT_SHARE_CAPITAL = 100;
const DEFAULT_ASSOCIATION_DUES = 120;
const MAX_FEE = 1000000;

function parseFeeAmount(value) {
  if (value == null || value === '') return null;
  const n = typeof value === 'string' ? parseFloat(String(value).trim()) : Number(value);
  if (!Number.isFinite(n)) return null;
  const rounded = Math.round(n * 100) / 100;
  if (rounded <= 0 || rounded > MAX_FEE) return null;
  return rounded;
}

async function getCollectionFees(barangayId) {
  const id = parseInt(barangayId, 10);
  if (!id) {
    return {
      barangay_id: null,
      share_capital_amount: DEFAULT_SHARE_CAPITAL,
      association_dues_amount: DEFAULT_ASSOCIATION_DUES
    };
  }

  const [[row]] = await pool.execute(
    `SELECT share_capital_amount, association_dues_amount
     FROM barangays WHERE id = ? LIMIT 1`,
    [id]
  );

  return {
    barangay_id: id,
    share_capital_amount: row?.share_capital_amount != null
      ? parseFloat(row.share_capital_amount)
      : DEFAULT_SHARE_CAPITAL,
    association_dues_amount: row?.association_dues_amount != null
      ? parseFloat(row.association_dues_amount)
      : DEFAULT_ASSOCIATION_DUES
  };
}

async function setCollectionFees(barangayId, payload = {}) {
  const id = parseInt(barangayId, 10);
  const [[existing]] = await pool.execute('SELECT id FROM barangays WHERE id = ? LIMIT 1', [id]);
  if (!existing) {
    const err = new Error('Barangay not found');
    err.status = 404;
    throw err;
  }

  const current = await getCollectionFees(id);
  const updates = [];
  const params = [];

  if (Object.prototype.hasOwnProperty.call(payload, 'share_capital_amount')) {
    const amount = parseFeeAmount(payload.share_capital_amount);
    if (amount == null) {
      const err = new Error('Enter a share capital amount greater than zero.');
      err.status = 400;
      throw err;
    }
    updates.push('share_capital_amount = ?');
    params.push(amount);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'association_dues_amount')) {
    const amount = parseFeeAmount(payload.association_dues_amount);
    if (amount == null) {
      const err = new Error('Enter an association dues amount greater than zero.');
      err.status = 400;
      throw err;
    }
    updates.push('association_dues_amount = ?');
    params.push(amount);
  }

  if (updates.length === 0) {
    return current;
  }

  params.push(id);
  await pool.execute(
    `UPDATE barangays SET ${updates.join(', ')} WHERE id = ?`,
    params
  );

  return getCollectionFees(id);
}

module.exports = {
  DEFAULT_SHARE_CAPITAL,
  DEFAULT_ASSOCIATION_DUES,
  parseFeeAmount,
  getCollectionFees,
  setCollectionFees
};
