const MANILA_TZ = 'Asia/Manila';

const manilaDateFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit'
});

const getManilaTodayString = () => manilaDateFormatter.format(new Date());

const formatManilaDate = (date = new Date()) => manilaDateFormatter.format(date);

const parseDateOnlyParts = (value) => {
  if (!value) return null;

  let dateStr;
  if (typeof value === 'string') {
    dateStr = value.split('T')[0].trim();
  } else if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    dateStr = `${value.getUTCFullYear()}-${String(value.getUTCMonth() + 1).padStart(2, '0')}-${String(value.getUTCDate()).padStart(2, '0')}`;
  } else {
    dateStr = String(value).split('T')[0].trim();
  }

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateStr);
  if (!match) return null;

  return {
    year: Number(match[1]),
    month: Number(match[2]),
    day: Number(match[3])
  };
};

const formatDateParts = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const normalizeDateString = (value) => {
  const parts = parseDateOnlyParts(value);
  if (!parts) return null;
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
};

const formatLocalDate = (date) => {
  if (!date || !(date instanceof Date) || Number.isNaN(date.getTime())) {
    return getManilaTodayString();
  }
  return formatManilaDate(date);
};

const getManilaReferenceDate = (overrideDateStr = null) => {
  const dateStr = getTodayDateString(overrideDateStr);
  const parts = parseDateOnlyParts(dateStr);
  if (!parts) return new Date();
  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
};

const getTodayDateString = (overrideDateStr = null) => {
  if (overrideDateStr && /^\d{4}-\d{2}-\d{2}$/.test(overrideDateStr)) {
    return overrideDateStr;
  }
  return getManilaTodayString();
};

const addDays = (dateStr, days) => {
  const parts = parseDateOnlyParts(dateStr);
  if (!parts) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day);
  date.setDate(date.getDate() + days);
  return formatDateParts(date);
};

const addMonths = (dateStr, months) => {
  const parts = parseDateOnlyParts(dateStr);
  if (!parts) return null;
  const date = new Date(parts.year, parts.month - 1, parts.day);
  date.setMonth(date.getMonth() + months);
  return formatDateParts(date);
};

const daysBetween = (fromDateStr, toDateStr) => {
  const from = parseDateOnlyParts(fromDateStr);
  const to = parseDateOnlyParts(toDateStr);
  if (!from || !to) return 0;
  const start = new Date(from.year, from.month - 1, from.day);
  const end = new Date(to.year, to.month - 1, to.day);
  return Math.floor((end - start) / (1000 * 60 * 60 * 24));
};

const parseBookingDate = (value) => {
  const dateStr = normalizeDateString(value);
  if (!dateStr) return null;
  const parts = parseDateOnlyParts(dateStr);
  return new Date(parts.year, parts.month - 1, parts.day, 0, 0, 0, 0);
};

module.exports = {
  MANILA_TZ,
  getManilaTodayString,
  formatManilaDate,
  formatLocalDate,
  normalizeDateString,
  getManilaReferenceDate,
  getTodayDateString,
  addDays,
  addMonths,
  daysBetween,
  parseBookingDate,
  parseDateOnlyParts
};
