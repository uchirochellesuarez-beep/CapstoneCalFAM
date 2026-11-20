/**
 * Isolated pretrained Linear Regression forecast path.
 * Engines: Python ML service (preferred when ML_API_URL reachable) or local Node JSON.
 * No Ridge / RandomForest / Node OLS fallback.
 */
const { buildPretrainedLrFeatures } = require('./pretrainedLrFeatureBuilder');
const {
  isMlApiConfigured,
  fetchPretrainedLrFromMlService,
} = require('./mlExpenseClient');
const { predictPretrainedLrLocalSafe } = require('./pretrainedLrLocalPredict');
const { semesterFromCreatedAt } = require('./agriculturalSemester');
const { dbRowToForecastRow } = require('./predictiveExcelStore');

const PUBLIC_DISCLAIMER_PH =
  'Ang hula ay mula sa pretrained Linear Regression na sinanay sa simulated data. ' +
  'Gabay lamang — hindi garantisado at hindi validated laban sa totoong CALFFA farmers.';

const PUBLIC_DISCLAIMER_EN =
  'This prediction uses a Linear Regression model trained on simulated agricultural expense data. ' +
  'Results are estimates and have not been validated against actual CALFFA farmer outcomes.';

const DEFAULT_MODEL_RUN_ID = '20261120_203925';
const MODEL_NAME = 'pretrained_linear_regression';

function isPretrainedLrModelName(payload) {
  return String(payload?.model_name || payload?.ml_engine || '') === MODEL_NAME;
}

/**
 * Derive PHP/ha from total prediction using latest-history farm area.
 * Does not change the pretrained LR total; post-inference only.
 */
function derivePerHectareExpenses(predictedTotal, forecastAreaHectares) {
  const total = Number(predictedTotal);
  const area = Number(forecastAreaHectares);
  if (!Number.isFinite(area) || area <= 0) {
    return {
      ok: false,
      error_code: 'MISSING_FARM_AREA',
      error:
        'Cannot compute expenses per hectare: forecast farm area must be a finite number greater than zero.',
    };
  }
  if (!Number.isFinite(total)) {
    return {
      ok: false,
      error_code: 'INVALID_TOTAL_EXPENSES',
      error: 'Cannot compute expenses per hectare: predicted total is not finite.',
    };
  }
  const perHa = Math.round((total / area) * 100) / 100;
  return {
    ok: true,
    forecast_area_hectares: area,
    predicted_expenses_per_hectare: perHa,
  };
}

function buildSuccessResponse(built, prediction, farmerId, inferenceEngine) {
  const forecastPeriod = prediction.forecast_period || built.forecast_period;
  const predictedTotal = Number(prediction.predicted_total_expenses);
  const perHa = derivePerHectareExpenses(predictedTotal, built.forecast_area_hectares);
  if (!perHa.ok) {
    return {
      ok: false,
      error_code: perHa.error_code,
      error: perHa.error,
      limitations: built.limitations || [],
      disclaimer_ph: PUBLIC_DISCLAIMER_PH,
      disclaimer_en: PUBLIC_DISCLAIMER_EN,
      ml_engine: MODEL_NAME,
      model: MODEL_NAME,
      inference_engine: inferenceEngine,
      farmer_id: Number(farmerId),
      forecast_period: forecastPeriod,
      latest_history_period: built.latest_history_period,
      history_periods: built.history_periods,
      predicted_total_expenses: predictedTotal,
      legacy_fallback_used: false,
    };
  }

  return {
    ok: true,
    ml_engine: MODEL_NAME,
    model: MODEL_NAME,
    model_name: MODEL_NAME,
    model_run_id: prediction.model_run_id || null,
    model_artifact_path: prediction.model_artifact_path || null,
    inference_engine: inferenceEngine,
    trained_on_simulated_data: true,
    performance_label: prediction.performance_label || 'SYNTHETIC DATA PERFORMANCE',
    disclaimer_ph: prediction.disclaimer_ph || PUBLIC_DISCLAIMER_PH,
    disclaimer_en: prediction.disclaimer_en || PUBLIC_DISCLAIMER_EN,
    method_description_ph: prediction.method_description_ph || null,
    forecast_period: forecastPeriod,
    latest_history_period: built.latest_history_period,
    period_extrapolation: Boolean(built.period_extrapolation),
    forecast_area_hectares: perHa.forecast_area_hectares,
    predicted_expenses_per_hectare: perHa.predicted_expenses_per_hectare,
    forecast_next: {
      label: forecastPeriod,
      predicted_total_expenses: predictedTotal,
      predicted_expenses_per_hectare: perHa.predicted_expenses_per_hectare,
      forecast_area_hectares: perHa.forecast_area_hectares,
      period_index: built.forecast_period_index,
      is_h1: built.forecast_is_h1,
    },
    predicted_total_expenses: predictedTotal,
    feature_vector: built.feature_vector,
    feature_order: built.feature_order,
    history_periods: built.history_periods,
    mappings: built.mappings,
    limitations: built.limitations,
    area_varies_across_history: Boolean(built.area_varies_across_history),
    farmer_id: Number(farmerId),
    training_n: built.n_hist_periods,
    legacy_fallback_used: false,
    persisted: false,
  };
}

function runLocalPretrainedLr(built, farmerId, modelRunId) {
  return predictPretrainedLrLocalSafe(built.feature_vector, {
    forecast_period: built.forecast_period,
    farmer_id: Number(farmerId),
    model_run_id: modelRunId,
  });
}

/**
 * Engine selection:
 * 1) ML_API_URL set + Python reachable + pretrained LR → python_pretrained_lr
 * 2) ML_API_URL missing → node_pretrained_lr
 * 3) Python unreachable / non-LR / transport fail → node_pretrained_lr
 * 4) Local also fails → structured error (never Ridge/RF/OLS)
 */
async function resolvePretrainedLrPrediction(built, farmerId, modelRunId) {
  const payload = {
    feature_vector: built.feature_vector,
    forecast_period: built.forecast_period,
    farmer_id: Number(farmerId),
    model_run_id: modelRunId,
  };

  if (isMlApiConfigured()) {
    const ml = await fetchPretrainedLrFromMlService(payload);
    if (ml && ml.ok !== false && isPretrainedLrModelName(ml)) {
      return {
        kind: 'ok',
        prediction: ml,
        inference_engine: 'python_pretrained_lr',
      };
    }
    if (ml && ml.ok === false) {
      // Explicit model/feature rejection from Python — do not swap engines silently
      // for validation errors; only fall through to Node on transport/unavailable.
      const code = String(ml.error_code || '');
      const isTransportOrMissing =
        !code ||
        code === 'ML_HTTP_ERROR' ||
        code === 'ML_SERVICE_UNAVAILABLE';
      if (!isTransportOrMissing) {
        return { kind: 'reject', ml };
      }
    }
    if (ml && ml.ok !== false && !isPretrainedLrModelName(ml)) {
      return {
        kind: 'reject',
        ml: {
          ok: false,
          error_code: 'UNEXPECTED_MODEL',
          error:
            'ML service returned a non-pretrained-LR model identifier. ' +
            'Refusing to accept legacy engines on this route.',
        },
      };
    }
    // Unreachable / empty → try Node JSON (same run_id)
  }

  const local = runLocalPretrainedLr(built, farmerId, modelRunId);
  if (local && local.ok) {
    return {
      kind: 'ok',
      prediction: local,
      inference_engine: 'node_pretrained_lr',
    };
  }

  return {
    kind: 'unavailable',
    local,
    python_attempted: isMlApiConfigured(),
  };
}

async function runPretrainedLrPrediction(farmerId, rows, buildOptions = {}) {
  const modelRunId = buildOptions.model_run_id || DEFAULT_MODEL_RUN_ID;
  const built = buildPretrainedLrFeatures(rows, buildOptions);
  if (!built.ok) {
    return {
      ok: false,
      error_code: built.error_code,
      error: built.error,
      limitations: built.limitations || [],
      disclaimer_ph: PUBLIC_DISCLAIMER_PH,
      disclaimer_en: PUBLIC_DISCLAIMER_EN,
      ml_engine: MODEL_NAME,
      model: MODEL_NAME,
      farmer_id: Number(farmerId),
    };
  }

  const resolved = await resolvePretrainedLrPrediction(built, farmerId, modelRunId);

  if (resolved.kind === 'ok') {
    return buildSuccessResponse(
      built,
      resolved.prediction,
      farmerId,
      resolved.inference_engine
    );
  }

  if (resolved.kind === 'reject') {
    const ml = resolved.ml;
    return {
      ok: false,
      error_code: ml.error_code || 'PRETRAINED_LR_REJECTED',
      error: ml.error || 'Pretrained Linear Regression rejected the feature payload.',
      limitations: built.limitations,
      disclaimer_ph: PUBLIC_DISCLAIMER_PH,
      disclaimer_en: PUBLIC_DISCLAIMER_EN,
      ml_engine: MODEL_NAME,
      model: MODEL_NAME,
      farmer_id: Number(farmerId),
      forecast_period: built.forecast_period,
      latest_history_period: built.latest_history_period,
      history_periods: built.history_periods,
    };
  }

  const localErr = resolved.local || {};
  return {
    ok: false,
    error_code: localErr.error_code || 'PRETRAINED_LR_UNAVAILABLE',
    error:
      localErr.error ||
      'Pretrained Linear Regression is unavailable (Python ML service and local Node JSON inference both failed). ' +
        'No legacy Ridge/RandomForest/OLS fallback is used on this route.',
    limitations: built.limitations,
    disclaimer_ph: PUBLIC_DISCLAIMER_PH,
    disclaimer_en: PUBLIC_DISCLAIMER_EN,
    ml_engine: MODEL_NAME,
    model: MODEL_NAME,
    inference_engine: null,
    python_attempted: Boolean(resolved.python_attempted),
    farmer_id: Number(farmerId),
    forecast_period: built.forecast_period,
    latest_history_period: built.latest_history_period,
    history_periods: built.history_periods,
    legacy_fallback_used: false,
  };
}

/** Option A: Eligible DB records; semester from created_at (Asia/Manila). */
async function forecastWithPretrainedLrFromSavedRecords(farmerId, eligibleDbRows, options = {}) {
  return runPretrainedLrPrediction(farmerId, eligibleDbRows, {
    period_mode: 'created_at',
    auto_forecast_period: true,
    require_eligible: true,
    model_run_id: options.model_run_id || '20261120_203925',
  });
}

/** Option B: in-memory Excel-derived rows; semester from workbook column. */
async function forecastWithPretrainedLrFromExcelRows(farmerId, excelRows, options = {}) {
  return runPretrainedLrPrediction(farmerId, excelRows, {
    period_mode: 'row_period',
    auto_forecast_period: true,
    require_eligible: false,
    model_run_id: options.model_run_id || '20261120_203925',
  });
}

/**
 * Normalize Eligible Farm Income rows + saved Excel rows into one history panel.
 * Same Year+H1/H2 cannot appear in both — Farm Income wins if preferFarmIncomeOnConflict,
 * otherwise returns a conflict error payload.
 */
function mergeFarmIncomeAndExcelHistory(eligibleDbRows, excelDbRows, options = {}) {
  const preferFarmIncome = options.preferFarmIncomeOnConflict !== false;
  const incomeRows = [];
  const incomeBySemester = new Map();

  for (const rec of eligibleDbRows || []) {
    if (String(rec?.status || '').trim() !== 'Eligible') continue;
    const sem = semesterFromCreatedAt(rec.created_at);
    if (!sem) {
      return {
        ok: false,
        error_code: 'INVALID_CREATED_AT',
        error: `Cannot derive Asia/Manila semester from created_at for record id=${rec.id}.`,
      };
    }
    if (incomeBySemester.has(sem.label)) {
      return {
        ok: false,
        error_code: 'DUPLICATE_PERIOD',
        error:
          `Multiple Eligible Farm Income records map to ${sem.label}. ` +
          'Each semester must appear once.',
      };
    }
    incomeBySemester.set(sem.label, rec.id);
    incomeRows.push({
      ...rec,
      id: `income-${rec.id}`,
      agricultural_semester: sem.label,
      status: 'Eligible',
      source: 'farm_income',
    });
  }

  const excelRows = [];
  const conflicts = [];
  for (const raw of excelDbRows || []) {
    const mapped = typeof raw.agricultural_semester === 'string' && raw.source === 'excel'
      ? raw
      : dbRowToForecastRow(raw);
    const label = String(mapped.agricultural_semester || '').trim();
    if (incomeBySemester.has(label)) {
      conflicts.push({
        semester: label,
        farm_income_record_id: incomeBySemester.get(label),
        excel_row_id: raw.id || mapped.db_id || null,
      });
      if (!preferFarmIncome) continue;
      // Farm Income already covers this semester — skip Excel duplicate.
      continue;
    }
    excelRows.push(mapped);
  }

  if (conflicts.length && !preferFarmIncome) {
    return {
      ok: false,
      error_code: 'SEMESTER_CONFLICT_WITH_FARM_INCOME',
      error: 'Excel semester overlaps a Farm Income record.',
      conflicts,
    };
  }

  const rows = [...incomeRows, ...excelRows];
  if (!rows.length) {
    return {
      ok: false,
      error_code: 'INSUFFICIENT_HISTORY',
      error:
        'At least one Eligible Farm Income record or saved Excel semester is required.',
    };
  }

  return {
    ok: true,
    rows,
    n_farm_income: incomeRows.length,
    n_excel: excelRows.length,
    skipped_excel_conflicts: conflicts,
  };
}

/**
 * Combined foundation: Eligible Farm Income (DB) + saved Predictive Excel rows.
 * Forecast semester = next H1/H2 after latest history (true next 6-month half).
 */
async function forecastWithPretrainedLrFromCombinedFoundation(
  farmerId,
  eligibleDbRows,
  excelDbRows,
  options = {}
) {
  const merged = mergeFarmIncomeAndExcelHistory(eligibleDbRows, excelDbRows, options);
  if (!merged.ok) {
    return {
      ok: false,
      error_code: merged.error_code,
      error: merged.error,
      conflicts: merged.conflicts || undefined,
      disclaimer_ph: PUBLIC_DISCLAIMER_PH,
      disclaimer_en: PUBLIC_DISCLAIMER_EN,
      ml_engine: 'pretrained_linear_regression',
      model: 'pretrained_linear_regression',
      farmer_id: Number(farmerId),
      input_source: 'combined_foundation',
    };
  }

  const result = await runPretrainedLrPrediction(farmerId, merged.rows, {
    period_mode: 'row_period',
    auto_forecast_period: true,
    require_eligible: false,
    model_run_id: options.model_run_id || '20261120_203925',
  });

  result.input_source = 'combined_foundation';
  result.foundation_counts = {
    farm_income: merged.n_farm_income,
    excel: merged.n_excel,
    total: merged.rows.length,
  };
  if (merged.skipped_excel_conflicts?.length) {
    result.skipped_excel_conflicts = merged.skipped_excel_conflicts;
  }
  return result;
}

/** Legacy explicit periods (kept for compatibility / tests). */
async function forecastWithPretrainedLr(farmerId, eligibleDbRows, options = {}) {
  if (options.period_mode === 'created_at' || options.source === 'saved_records') {
    return forecastWithPretrainedLrFromSavedRecords(farmerId, eligibleDbRows, options);
  }
  return runPretrainedLrPrediction(farmerId, eligibleDbRows, {
    period_mode: options.period_mode || 'explicit',
    auto_forecast_period: Boolean(options.auto_forecast_period),
    require_eligible: options.require_eligible !== false,
    forecast_period: options.forecast_period,
    record_periods: options.record_periods,
    model_run_id: options.model_run_id || '20261120_203925',
  });
}

module.exports = {
  forecastWithPretrainedLr,
  forecastWithPretrainedLrFromSavedRecords,
  forecastWithPretrainedLrFromExcelRows,
  forecastWithPretrainedLrFromCombinedFoundation,
  mergeFarmIncomeAndExcelHistory,
  runPretrainedLrPrediction,
  derivePerHectareExpenses,
  PUBLIC_DISCLAIMER_PH,
  PUBLIC_DISCLAIMER_EN,
};
