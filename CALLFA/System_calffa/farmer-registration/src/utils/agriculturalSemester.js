/** Asia/Manila H1=Jan–Jun, H2=Jul–Dec — mirrors backend agriculturalSemester.js */
export const MANILA_TZ = 'Asia/Manila'

const PERIOD_RE = /^(\d{4})-H([12])$/i

const manilaYmdFormatter = new Intl.DateTimeFormat('en-CA', {
  timeZone: MANILA_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
})

export function parsePeriodLabel(label) {
  const m = PERIOD_RE.exec(String(label || '').trim())
  if (!m) return null
  const year = Number(m[1])
  const half = Number(m[2])
  const period_index = (year - 2021) * 2 + half
  if (period_index < 1) return null
  return { label: `${year}-H${half}`, year, half, period_index, is_h1: half === 1 ? 1 : 0 }
}

export function semesterFromCreatedAt(createdAt) {
  const d = createdAt instanceof Date ? createdAt : new Date(createdAt)
  if (Number.isNaN(d.getTime())) return null
  const parts = manilaYmdFormatter.formatToParts(d)
  const get = (type) => Number(parts.find((p) => p.type === type)?.value)
  const year = get('year')
  const month = get('month')
  if (!year || !month) return null
  const half = month <= 6 ? 1 : 2
  return parsePeriodLabel(`${year}-H${half}`)
}

export function nextSemester(period) {
  const parsed = typeof period === 'string' ? parsePeriodLabel(period) : period
  if (!parsed) return null
  if (parsed.half === 1) return parsePeriodLabel(`${parsed.year}-H2`)
  return parsePeriodLabel(`${parsed.year + 1}-H1`)
}

export function isEligibleIncomeStatus(status) {
  return String(status || '').trim() === 'Eligible'
}
