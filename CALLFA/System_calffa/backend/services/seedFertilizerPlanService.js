const ASSISTANCE_PER_SACK_PHP = 50;

function roundMoney(n) {
  return Math.round(parseFloat(n) * 100) / 100;
}

/**
 * Magtala ng bayad (puwedeng bahagya) para sa isang distribution ng binhi/pataba.
 * Maraming row sa share_capital_contributions ang puwede (parehong source_distribution_id)
 * hanggang umabot sa kabuuang (sako × ₱50).
 */
async function recordAssistancePaymentForDistribution(conn, params) {
  const { distributionId, amount, contributionDate, createdByUserId } = params;
  const amt = roundMoney(amount);
  if (!Number.isFinite(amt) || amt <= 0) {
    return { ok: false, error: 'invalid_amount' };
  }
  if (!contributionDate || String(contributionDate).trim() === '') {
    return { ok: false, error: 'missing_contribution_date' };
  }

  const [drows] = await conn.execute(
    `
    SELECT id, farmer_id, barangay_id, assistance_type, quantity, status
    FROM income_assistance_distributions
    WHERE id = ?
    FOR UPDATE
    `,
    [distributionId]
  );
  const d = drows[0];
  if (!d) {
    return { ok: false, error: 'distribution_not_found' };
  }
  const st = String(d.status || '');
  if (!['Distributed', 'Confirmed Received'].includes(st)) {
    return { ok: false, error: 'distribution_not_eligible' };
  }

  const qty = parseInt(String(d.quantity ?? 0), 10) || 0;
  const expected = roundMoney(qty * ASSISTANCE_PER_SACK_PHP);
  if (expected <= 0) {
    return { ok: false, error: 'zero_expected' };
  }

  const [[agg]] = await conn.execute(
    `
    SELECT COALESCE(SUM(amount), 0) AS paid
    FROM share_capital_contributions
    WHERE source_distribution_id = ?
      AND contribution_kind = 'assistance_sacks'
      AND status = 'confirmed'
    `,
    [distributionId]
  );
  const paid = roundMoney(agg?.paid ?? 0);
  const remaining = roundMoney(expected - paid);
  if (amt > remaining + 0.009) {
    return {
      ok: false,
      error: 'exceeds_remaining',
      expected_pesos: expected,
      paid_pesos: paid,
      remaining_pesos: remaining,
    };
  }

  await conn.execute(
    `
    INSERT INTO share_capital_contributions
      (farmer_id, barangay_id, contribution_date, amount, status, contribution_kind,
       sack_count, per_sack_amount, source_distribution_id, created_by)
    VALUES (?, ?, ?, ?, 'confirmed', 'assistance_sacks', NULL, ?, ?, ?)
    `,
    [
      d.farmer_id,
      d.barangay_id,
      String(contributionDate).slice(0, 10),
      amt,
      ASSISTANCE_PER_SACK_PHP,
      distributionId,
      createdByUserId || null,
    ]
  );

  const [[agg2]] = await conn.execute(
    `
    SELECT COALESCE(SUM(amount), 0) AS paid
    FROM share_capital_contributions
    WHERE source_distribution_id = ?
      AND contribution_kind = 'assistance_sacks'
      AND status = 'confirmed'
    `,
    [distributionId]
  );
  const paidAfter = roundMoney(agg2?.paid ?? 0);

  return {
    ok: true,
    amount_recorded: amt,
    expected_pesos: expected,
    paid_pesos: paidAfter,
    remaining_pesos: roundMoney(expected - paidAfter),
  };
}

module.exports = {
  recordAssistancePaymentForDistribution,
  ASSISTANCE_PER_SACK_PHP,
};
