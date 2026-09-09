/**
 * Per-machinery interest rate helpers (stored on machinery_inventory.interest_rate as percent).
 */

function normalizeInterestRatePercent(value) {
  if (value === null || value === undefined || value === '') return 0;
  const n = parseFloat(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100);
}

function interestRateToDecimal(percent) {
  return normalizeInterestRatePercent(percent) / 100;
}

function calculatePartialPaymentInterest(totalPrice, interestRatePercent) {
  const rate = interestRateToDecimal(interestRatePercent);
  if (rate <= 0) return 0;
  const base = parseFloat(totalPrice) || 0;
  if (base <= 0) return 0;
  return parseFloat((base * rate).toFixed(2));
}

function formatInterestRateLabel(percent) {
  const n = normalizeInterestRatePercent(percent);
  if (n <= 0) return '0%';
  return Number.isInteger(n) ? `${n}%` : `${n}%`;
}

function formatPartialInterestRuleLabel(percent) {
  const label = formatInterestRateLabel(percent);
  return label === '0%' ? null : `${label} (Partial)`;
}

/**
 * Overdue notification rate: season 1 uses configured rate; season 2 uses 2× (was 2%/4%).
 */
function overdueInterestRateDecimal(interestRatePercent, monthsOverdue) {
  const base = normalizeInterestRatePercent(interestRatePercent);
  if (base <= 0) return 0;
  const effectivePercent = monthsOverdue <= 6 ? base : base * 2;
  return effectivePercent / 100;
}

function overdueInterestSeasonLabel(interestRatePercent, monthsOverdue) {
  const base = normalizeInterestRatePercent(interestRatePercent);
  if (base <= 0) return 'No interest configured';
  const effective = monthsOverdue <= 6 ? base : base * 2;
  const season = monthsOverdue <= 6 ? 'Season 1 (0-6mo)' : 'Season 2 (6+mo)';
  return `${season}: ${formatInterestRateLabel(effective)}`;
}

module.exports = {
  normalizeInterestRatePercent,
  interestRateToDecimal,
  calculatePartialPaymentInterest,
  formatInterestRateLabel,
  formatPartialInterestRuleLabel,
  overdueInterestRateDecimal,
  overdueInterestSeasonLabel
};
