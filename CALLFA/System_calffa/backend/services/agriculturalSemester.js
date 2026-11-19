/**
 * Agricultural semester helpers (Philippine time).
 * H1 = Jan 1–Jun 30, H2 = Jul 1–Dec 31 (Asia/Manila calendar date).
 */
const { MANILA_TZ } = require('../utils/philippinesTime');

const PERIOD_RE = /^(\d{4})-H([12])$/i;

const manilaYmdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function manilaYmdParts(value) {
  const d = value instanceof Date ? value : new Date(value);
  if (!(d instanceof Date) || Number.isNaN(d.getTime())) return null;
  const parts = manilaYmdFormatter.formatToParts(d);
  const get = (type) => {
    const p = parts.find((x) => x.type === type);
    return p ? Number(p.value) : null;
  };
  const year = get('year');
  const month = get('month');
  const day = get('day');
  if (!year || !month || !day) return null;
  return { year, month, day };
}

function parsePeriodLabel(label) {
  const raw = String(label || '').trim();
  const m = PERIOD_RE.exec(raw);
  if (!m) return null;
  const year = Number(m[1]);
  const half = Number(m[2]);
  if (!Number.isFinite(year) || (half !== 1 && half !== 2)) return null;
  const period_index = (year - 2021) * 2 + half;
  if (period_index < 1) return null;
  return {
    label: `${year}-H${half}`,
    year,
    half,
    period_index,
    is_h1: half === 1 ? 1 : 0,
  };
}

function periodFromYearMonth(year, month) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  const half = month <= 6 ? 1 : 2;
  return parsePeriodLabel(`${year}-H${half}`);
}

/**
 * Derive reporting semester from a timestamp using Asia/Manila calendar date.
 * Convention for saved Farm Income forms: submission semester (may differ from planting).
 */
function semesterFromCreatedAt(createdAt) {
  const ymd = manilaYmdParts(createdAt);
  if (!ymd) return null;
  return periodFromYearMonth(ymd.year, ymd.month);
}

function nextSemester(period) {
  const parsed = typeof period === 'string' ? parsePeriodLabel(period) : period;
  if (!parsed) return null;
  if (parsed.half === 1) {
    return parsePeriodLabel(`${parsed.year}-H2`);
  }
  return parsePeriodLabel(`${parsed.year + 1}-H1`);
}

function isExtrapolation(periodIndex) {
  // Training panel used period_index 1..11 (2021-H1 .. 2026-H1)
  return Number(periodIndex) > 11;
}

module.exports = {
  MANILA_TZ,
  PERIOD_RE,
  parsePeriodLabel,
  periodFromYearMonth,
  semesterFromCreatedAt,
  nextSemester,
  isExtrapolation,
  manilaYmdParts,
};
