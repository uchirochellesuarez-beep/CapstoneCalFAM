/**
 * Client-side helpers for pretrained LR agricultural semester selection.
 * created_at must never be treated as the crop/expense period.
 */

const PERIOD_RE = /^(\d{4})-H([12])$/i

export function parsePeriodLabel(label) {
  const raw = String(label || '').trim()
  const m = PERIOD_RE.exec(raw)
  if (!m) return null
  const year = Number(m[1])
  const half = Number(m[2])
  if (!Number.isFinite(year) || (half !== 1 && half !== 2)) return null
  const period_index = (year - 2021) * 2 + half
  if (period_index < 1) return null
  return {
    label: `${year}-H${half}`,
    year,
    half,
    period_index,
    is_h1: half === 1 ? 1 : 0,
  }
}

export function buildSemesterOptions(startYear = 2021, endYear = null) {
  const now = new Date()
  const lastYear = endYear != null ? endYear : now.getFullYear() + 1
  const options = []
  for (let y = startYear; y <= lastYear; y += 1) {
    options.push(`${y}-H1`, `${y}-H2`)
  }
  return options
}

export function isEligibleIncomeStatus(status) {
  const s = String(status || '').trim()
  return s === 'Eligible' || s === 'Upcoming Assistance' || s === 'Received'
}

/**
 * @param {Array<{id:number|string}>} eligibleRecords
 * @param {Record<string,string>} recordPeriods map id -> period label
 * @param {string} forecastPeriod
 */
export function validatePretrainedLrSelections(eligibleRecords, recordPeriods, forecastPeriod) {
  const rows = Array.isArray(eligibleRecords) ? eligibleRecords : []
  if (rows.length < 1) {
    return {
      ok: false,
      error_code: 'INSUFFICIENT_HISTORY',
      error: 'At least one Eligible Farm Income record is required.',
    }
  }

  const forecast = parsePeriodLabel(forecastPeriod)
  if (!forecast) {
    return {
      ok: false,
      error_code: 'FORECAST_PERIOD_REQUIRED',
      error: 'Select a forecast semester (YYYY-H1 or YYYY-H2).',
    }
  }

  const periodsMap = recordPeriods && typeof recordPeriods === 'object' ? recordPeriods : {}
  const seen = new Map()
  const record_periods = {}

  for (const row of rows) {
    if (row?.id == null) {
      return {
        ok: false,
        error_code: 'AGRICULTURAL_PERIOD_REQUIRED',
        error: 'Each Eligible record must have an id.',
      }
    }
    const key = String(row.id)
    const selected = periodsMap[key] ?? periodsMap[row.id]
    const parsed = parsePeriodLabel(selected)
    if (!parsed) {
      return {
        ok: false,
        error_code: 'AGRICULTURAL_PERIOD_REQUIRED',
        error: `Select an agricultural semester for record #${key}. Save date is not used as the crop period.`,
      }
    }
    if (seen.has(parsed.label)) {
      return {
        ok: false,
        error_code: 'DUPLICATE_PERIOD',
        error: `Semester ${parsed.label} is assigned to more than one record. Each semester can be used only once.`,
      }
    }
    seen.set(parsed.label, key)
    record_periods[key] = parsed.label
  }

  let maxHistIndex = 0
  for (const label of Object.values(record_periods)) {
    const p = parsePeriodLabel(label)
    if (p && p.period_index > maxHistIndex) maxHistIndex = p.period_index
  }
  if (forecast.period_index <= maxHistIndex) {
    return {
      ok: false,
      error_code: 'FORECAST_PERIOD_NOT_AFTER_HISTORY',
      error: `Forecast semester ${forecast.label} must be after the latest historical semester.`,
    }
  }

  return {
    ok: true,
    forecast_period: forecast.label,
    record_periods,
  }
}

export function buildPretrainedLrRequestBody(eligibleRecords, recordPeriods, forecastPeriod) {
  const validated = validatePretrainedLrSelections(
    eligibleRecords,
    recordPeriods,
    forecastPeriod
  )
  if (!validated.ok) return validated
  return {
    ok: true,
    body: {
      forecast_period: validated.forecast_period,
      record_periods: validated.record_periods,
      model_run_id: '20261119_211021',
    },
  }
}
