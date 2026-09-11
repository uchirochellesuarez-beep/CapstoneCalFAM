function sqlLimit(value, fallback = 100, max = 500) {
  const n = Number.parseInt(value, 10);
  if (!Number.isFinite(n) || n < 1) return fallback;
  return Math.min(n, max);
}

module.exports = { sqlLimit };
