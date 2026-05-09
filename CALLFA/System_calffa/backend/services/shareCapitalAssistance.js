/**
 * Seed & fertilizer plan (legacy helper): post assistance_sacks row tied to a distribution.
 * Bagong flow: pending obligation sa confirm, tapos mark-paid ang mag-i-insert ng contribution.
 */

const ASSISTANCE_PER_SACK_PHP = 50;

/**
 * @param {import('mysql2/promise').PoolConnection} conn
 * @param {object} dist — row mula sa income_assistance_distributions (may id, farmer_id, barangay_id, quantity, assistance_type)
 * @param {number|null} createdByUserId
 * @returns {Promise<{ recorded: boolean, reason?: string, amount?: number, sack_count?: number }>}
 */
async function recordSackPlanContributionOnDistributionConfirm(conn, dist, createdByUserId) {
  const qty = parseInt(String(dist.quantity ?? 0), 10) || 0;
  if (qty <= 0) {
    return { recorded: false, reason: 'zero_sacks' };
  }

  const [[dup]] = await conn.execute(
    `SELECT id FROM share_capital_contributions WHERE source_distribution_id = ? LIMIT 1`,
    [dist.id]
  );
  if (dup?.id) {
    return { recorded: false, reason: 'already_exists' };
  }

  const amount = Math.round(qty * ASSISTANCE_PER_SACK_PHP * 100) / 100;
  let contribDate;
  if (dist.received_date) {
    const d = new Date(dist.received_date);
    contribDate = Number.isNaN(d.getTime())
      ? new Date().toISOString().slice(0, 10)
      : d.toISOString().slice(0, 10);
  } else {
    contribDate = new Date().toISOString().slice(0, 10);
  }

  await conn.execute(
    `
    INSERT INTO share_capital_contributions
      (farmer_id, barangay_id, contribution_date, amount, status, contribution_kind,
       sack_count, per_sack_amount, source_distribution_id, created_by)
    VALUES (?, ?, ?, ?, 'confirmed', 'assistance_sacks', ?, ?, ?, ?)
    `,
    [
      dist.farmer_id,
      dist.barangay_id,
      contribDate,
      amount,
      qty,
      ASSISTANCE_PER_SACK_PHP,
      dist.id,
      createdByUserId || null,
    ]
  );

  return { recorded: true, amount, sack_count: qty };
}

module.exports = {
  recordSackPlanContributionOnDistributionConfirm,
  ASSISTANCE_PER_SACK_PHP,
};
