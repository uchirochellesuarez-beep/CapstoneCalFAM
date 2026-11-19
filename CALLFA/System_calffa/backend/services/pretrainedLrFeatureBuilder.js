/**
 * Build the exact 21 pretrained Linear Regression features.
 * Matches ml-training/prepare_features.py semantics.
 */
const {
  parsePeriodLabel,
  semesterFromCreatedAt,
  nextSemester,
  isExtrapolation,
} = require('./agriculturalSemester');

const FEATURE_ORDER = [
  'area_hectares',
  'prev_total_expenses',
  'prev_prev_total_expenses',
  'prev_expenses_per_ha',
  'prev_fertilizer_cost',
  'prev_pesticide_cost',
  'prev_labor_related_cost',
  'prev_transport_cost',
  'prev_fuel_cost',
  'planting_method_sabog',
  'planting_method_talok',
  'irrigation_NIA',
  'irrigation_bugsok_waterpump',
  'irrigation_waterpump_irrigation',
  'irrigation_waterpump_ilog',
  'period_index',
  'is_h1',
  'n_hist_periods',
  'roll3_mean_total',
  'delta_prev',
  'has_lag2',
];

const PLANTING_METHODS = new Set(['sabog', 'talok']);
const IRRIGATION_TYPES = new Set([
  'NIA',
  'bugsok_waterpump',
  'waterpump_irrigation',
  'waterpump_ilog',
]);

const LIMITATION_SUBMISSION_SEMESTER =
  'For saved Farm Income records, Agricultural_Semester is derived from created_at ' +
  'in Asia/Manila (H1=Jan–Jun, H2=Jul–Dec). Submission date may differ from the actual planting/expense period.';

const LIMITATION_EXCEL_SEMESTER =
  'For Excel uploads, Agricultural_Semester comes from the workbook column only. Upload date is never used.';

function num(v, fallback = null) {
  const n = Number(v);
  if (!Number.isFinite(n)) return fallback;
  return n;
}

function laborRelatedCost(row) {
  return (
    (num(row.land_preparation_cost, 0) || 0) +
    (num(row.planting_cost, 0) || 0) +
    (num(row.spraying_cost, 0) || 0) +
    (num(row.harvester_cost, 0) || 0) +
    (num(row.drying_cost, 0) || 0) +
    (num(row.other_expenses, 0) || 0)
  );
}

function transportCost(row) {
  return (num(row.hauling_cost, 0) || 0) + (num(row.tarasko_cost, 0) || 0);
}

function fuelCost(row) {
  return num(row.fuel_cost, 0) || 0;
}

function oneHotPlanting(method) {
  const m = String(method || '').trim();
  return {
    planting_method_sabog: m === 'sabog' ? 1 : 0,
    planting_method_talok: m === 'talok' ? 1 : 0,
  };
}

function oneHotIrrigation(irr) {
  const v = String(irr || '').trim();
  return {
    irrigation_NIA: v === 'NIA' ? 1 : 0,
    irrigation_bugsok_waterpump: v === 'bugsok_waterpump' ? 1 : 0,
    irrigation_waterpump_irrigation: v === 'waterpump_irrigation' ? 1 : 0,
    irrigation_waterpump_ilog: v === 'waterpump_ilog' ? 1 : 0,
  };
}

function fail(error_code, error, extra = {}) {
  return { ok: false, error_code, error, ...extra };
}

function isEligibleStatus(status) {
  return String(status || '').trim() === 'Eligible';
}

/**
 * Resolve period label for a row.
 * @param {'created_at'|'explicit'|'row_period'} mode
 */
function resolveRowPeriod(row, options, mode) {
  if (mode === 'created_at') {
    return semesterFromCreatedAt(row.created_at);
  }
  if (mode === 'row_period') {
    return parsePeriodLabel(row.agricultural_semester || row.period_label);
  }
  const key = String(row.id);
  const label =
    options.record_periods?.[key] ?? options.record_periods?.[row.id];
  return parsePeriodLabel(label);
}

/**
 * @param {object[]} rows
 * @param {object} options
 * @param {'created_at'|'explicit'|'row_period'} [options.period_mode]
 * @param {boolean} [options.auto_forecast_period] — default true when period_mode is created_at or row_period
 * @param {boolean} [options.require_eligible] — default true
 * @param {string} [options.forecast_period]
 * @param {Record<string,string>} [options.record_periods]
 */
function buildPretrainedLrFeatures(rows, options = {}) {
  const periodMode = options.period_mode || 'explicit';
  const requireEligible = options.require_eligible !== false;
  const autoForecast =
    options.auto_forecast_period != null
      ? Boolean(options.auto_forecast_period)
      : periodMode === 'created_at' || periodMode === 'row_period';

  const limitations = [];
  if (periodMode === 'created_at') limitations.push(LIMITATION_SUBMISSION_SEMESTER);
  if (periodMode === 'row_period') limitations.push(LIMITATION_EXCEL_SEMESTER);

  const all = Array.isArray(rows) ? rows : [];
  const panel = requireEligible
    ? all.filter((r) => isEligibleStatus(r?.status))
    : all;

  if (panel.length < 1) {
    return fail(
      'INSUFFICIENT_HISTORY',
      periodMode === 'row_period'
        ? 'At least one valid semester row is required in the Excel workbook.'
        : 'At least one Eligible Farm Income record is required for pretrained Linear Regression.',
      { limitations }
    );
  }

  const annotated = [];
  const seenPeriods = new Map();

  for (const row of panel) {
    const id = row.id;
    if (id == null) {
      return fail(
        'MISSING_RECORD_ID',
        'Each history row must have an id.',
        { limitations }
      );
    }
    const key = String(id);
    const parsed = resolveRowPeriod(row, options, periodMode);
    if (!parsed) {
      return fail(
        periodMode === 'created_at'
          ? 'INVALID_CREATED_AT'
          : 'AGRICULTURAL_PERIOD_REQUIRED',
        periodMode === 'created_at'
          ? `Cannot derive Asia/Manila semester from created_at for record id=${key}.`
          : `Missing or invalid agricultural semester for record id=${key}.`,
        { limitations, record_id: key }
      );
    }
    if (seenPeriods.has(parsed.label)) {
      return fail(
        'DUPLICATE_PERIOD',
        `Multiple records map to ${parsed.label} (ids ${seenPeriods.get(parsed.label)} and ${key}). ` +
          'Each semester must appear once. Saved forms are treated as complete semester summaries, ' +
          'so summing or discarding duplicates is unsafe.',
        { limitations, period: parsed.label }
      );
    }
    seenPeriods.set(parsed.label, key);

    const area = num(row.area_hectares, null);
    if (area == null || area <= 0) {
      return fail(
        'MISSING_FARM_AREA',
        `Record id=${key} is missing a valid area_hectares (> 0).`,
        { limitations, record_id: key }
      );
    }

    const planting = String(row.planting_method || '').trim();
    if (!PLANTING_METHODS.has(planting)) {
      return fail(
        'UNSUPPORTED_PLANTING_METHOD',
        `Record id=${key} has unsupported planting_method=${planting || '(empty)'}.`,
        { limitations, record_id: key }
      );
    }

    const irrigation = String(row.irrigation_type || '').trim();
    if (!IRRIGATION_TYPES.has(irrigation)) {
      return fail(
        'UNSUPPORTED_IRRIGATION_TYPE',
        `Record id=${key} has unsupported irrigation_type=${irrigation || '(empty)'}.`,
        { limitations, record_id: key }
      );
    }

    const totalExpenses = num(row.total_expenses, null);
    if (totalExpenses == null || !Number.isFinite(totalExpenses)) {
      return fail(
        'INVALID_TOTAL_EXPENSES',
        `Record id=${key} has invalid total_expenses.`,
        { limitations, record_id: key }
      );
    }

    annotated.push({
      id: key,
      period: parsed,
      area_hectares: area,
      planting_method: planting,
      irrigation_type: irrigation,
      total_expenses: totalExpenses,
      total_fertilizer_cost: num(row.total_fertilizer_cost, 0) || 0,
      total_pesticide_cost: num(row.total_pesticide_cost, 0) || 0,
      labor_related_cost: laborRelatedCost(row),
      transport_cost: transportCost(row),
      fuel_cost: fuelCost(row),
    });
  }

  annotated.sort((a, b) => a.period.period_index - b.period.period_index);
  const last = annotated[annotated.length - 1];

  let forecastParsed;
  if (autoForecast) {
    forecastParsed = nextSemester(last.period);
    if (!forecastParsed) {
      return fail(
        'FORECAST_PERIOD_REQUIRED',
        'Unable to compute the next agricultural semester after history.',
        { limitations }
      );
    }
  } else {
    forecastParsed = parsePeriodLabel(options.forecast_period);
    if (!forecastParsed) {
      return fail(
        'FORECAST_PERIOD_REQUIRED',
        'Provide forecast_period as YYYY-H1 or YYYY-H2.',
        { limitations }
      );
    }
  }

  if (forecastParsed.period_index <= last.period.period_index) {
    return fail(
      'FORECAST_PERIOD_NOT_AFTER_HISTORY',
      `forecast_period ${forecastParsed.label} must be after the latest history period ${last.period.label}.`,
      { limitations }
    );
  }

  if (isExtrapolation(forecastParsed.period_index)) {
    limitations.push(
      `Forecast period ${forecastParsed.label} (period_index=${forecastParsed.period_index}) ` +
        'is beyond the synthetic training range (through 2026-H1). Prediction may extrapolate.'
    );
  }

  const hist = annotated;
  const prev = hist[hist.length - 1];
  const prevPrev = hist.length >= 2 ? hist[hist.length - 2] : null;

  const prev_total = prev.total_expenses;
  let prev_prev_total;
  let has_lag2;
  let delta_prev;
  if (prevPrev) {
    prev_prev_total = prevPrev.total_expenses;
    has_lag2 = 1;
    delta_prev = prev_total - prev_prev_total;
  } else {
    prev_prev_total = prev_total;
    has_lag2 = 0;
    delta_prev = 0;
  }

  const roll_n = Math.min(3, hist.length);
  const roll3_mean_total =
    hist.slice(-roll_n).reduce((s, r) => s + r.total_expenses, 0) / roll_n;

  const feature_vector = {
    area_hectares: prev.area_hectares,
    prev_total_expenses: prev_total,
    prev_prev_total_expenses: prev_prev_total,
    prev_expenses_per_ha: prev.area_hectares > 0 ? prev_total / prev.area_hectares : 0,
    prev_fertilizer_cost: prev.total_fertilizer_cost,
    prev_pesticide_cost: prev.total_pesticide_cost,
    prev_labor_related_cost: prev.labor_related_cost,
    prev_transport_cost: prev.transport_cost,
    prev_fuel_cost: prev.fuel_cost,
    ...oneHotPlanting(prev.planting_method),
    ...oneHotIrrigation(prev.irrigation_type),
    period_index: forecastParsed.period_index,
    is_h1: forecastParsed.is_h1,
    n_hist_periods: hist.length,
    roll3_mean_total,
    delta_prev,
    has_lag2,
  };

  for (const key of FEATURE_ORDER) {
    if (!Object.prototype.hasOwnProperty.call(feature_vector, key)) {
      return fail('FEATURE_BUILD_ERROR', `Internal missing feature ${key}`, { limitations });
    }
    if (!Number.isFinite(Number(feature_vector[key]))) {
      return fail('NON_FINITE_FEATURE', `Feature ${key} is not finite`, { limitations });
    }
  }
  const ordered = {};
  for (const key of FEATURE_ORDER) ordered[key] = Number(feature_vector[key]);

  return {
    ok: true,
    feature_vector: ordered,
    feature_order: FEATURE_ORDER.slice(),
    forecast_period: forecastParsed.label,
    forecast_period_index: forecastParsed.period_index,
    forecast_is_h1: forecastParsed.is_h1,
    latest_history_period: last.period.label,
    n_hist_periods: hist.length,
    history_periods: hist.map((h) => ({
      record_id: h.id,
      period: h.period.label,
      total_expenses: h.total_expenses,
    })),
    period_extrapolation: isExtrapolation(forecastParsed.period_index),
    limitations,
    mappings: {
      labor_related_cost:
        'land_preparation_cost + planting_cost + spraying_cost + harvester_cost + drying_cost + other_expenses',
      transport_cost: 'hauling_cost + tarasko_cost',
      fuel_cost: 'fuel_cost',
      note: 'total_labor_cost is NOT used as labor_related_cost',
    },
  };
}

module.exports = {
  FEATURE_ORDER,
  PLANTING_METHODS,
  IRRIGATION_TYPES,
  LIMITATION_SUBMISSION_SEMESTER,
  LIMITATION_EXCEL_SEMESTER,
  parsePeriodLabel,
  laborRelatedCost,
  transportCost,
  fuelCost,
  buildPretrainedLrFeatures,
};
