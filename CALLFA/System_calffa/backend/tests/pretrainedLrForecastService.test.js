jest.mock('../services/mlExpenseClient', () => ({
  fetchExpenseForecastFromMlService: jest.fn(async () => {
    throw new Error('legacy ML client must not be called');
  }),
  fetchPretrainedLrFromMlService: jest.fn(),
  isMlApiConfigured: jest.fn(() => true),
  getMlApiBaseUrl: jest.fn(() => 'http://127.0.0.1:5001'),
}));

jest.mock('../services/pretrainedLrLocalPredict', () => ({
  predictPretrainedLrLocalSafe: jest.fn(),
}));

const {
  fetchExpenseForecastFromMlService,
  fetchPretrainedLrFromMlService,
  isMlApiConfigured,
} = require('../services/mlExpenseClient');
const { predictPretrainedLrLocalSafe } = require('../services/pretrainedLrLocalPredict');
const {
  forecastWithPretrainedLr,
  forecastWithPretrainedLrFromSavedRecords,
  forecastWithPretrainedLrFromExcelRows,
  forecastWithPretrainedLrFromCombinedFoundation,
} = require('../services/pretrainedLrForecastService');

function eligibleRow(overrides = {}) {
  return {
    id: 101,
    status: 'Eligible',
    area_hectares: 1.0,
    planting_method: 'sabog',
    irrigation_type: 'NIA',
    land_preparation_cost: 1000,
    planting_cost: 1000,
    spraying_cost: 500,
    harvester_cost: 2000,
    drying_cost: 500,
    other_expenses: 0,
    hauling_cost: 400,
    tarasko_cost: 100,
    fuel_cost: 200,
    total_fertilizer_cost: 3000,
    total_pesticide_cost: 1000,
    total_labor_cost: 5700,
    total_expenses: 9700,
    ...overrides,
  };
}

function pythonOk(overrides = {}) {
  return {
    ok: true,
    model_name: 'pretrained_linear_regression',
    ml_engine: 'pretrained_linear_regression',
    model_run_id: '20261119_211021',
    predicted_total_expenses: 12340,
    forecast_period: '2026-H1',
    trained_on_simulated_data: true,
    performance_label: 'SYNTHETIC DATA PERFORMANCE',
    disclaimer_ph: 'sim disclaimer',
    disclaimer_en: 'sim disclaimer en',
    ...overrides,
  };
}

function nodeOk(overrides = {}) {
  return {
    ok: true,
    model_name: 'pretrained_linear_regression',
    ml_engine: 'pretrained_linear_regression',
    model_run_id: '20261119_211021',
    predicted_total_expenses: 55550,
    forecast_period: '2026-H1',
    trained_on_simulated_data: true,
    performance_label: 'SYNTHETIC DATA PERFORMANCE',
    disclaimer_en: 'Node disclaimer',
    disclaimer_ph: 'Node disclaimer ph',
    inference_engine: 'node_pretrained_lr',
    ...overrides,
  };
}

describe('forecastWithPretrainedLr — engine selection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMlApiConfigured.mockReturnValue(true);
  });

  test('1) Python service available → python_pretrained_lr', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(pythonOk());
    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });
    expect(result.ok).toBe(true);
    expect(result.inference_engine).toBe('python_pretrained_lr');
    expect(result.model_run_id).toBe('20261119_211021');
    expect(result.predicted_total_expenses).toBe(12340);
    expect(result.trained_on_simulated_data).toBe(true);
    expect(result.legacy_fallback_used).toBe(false);
    expect(result.feature_order).toHaveLength(21);
    expect(predictPretrainedLrLocalSafe).not.toHaveBeenCalled();
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('2) ML_API_URL missing → node_pretrained_lr', async () => {
    isMlApiConfigured.mockReturnValue(false);
    predictPretrainedLrLocalSafe.mockReturnValue(nodeOk({ predicted_total_expenses: 46270 }));
    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });
    expect(result.ok).toBe(true);
    expect(result.inference_engine).toBe('node_pretrained_lr');
    expect(result.predicted_total_expenses).toBe(46270);
    expect(result.model_run_id).toBe('20261119_211021');
    expect(fetchPretrainedLrFromMlService).not.toHaveBeenCalled();
    expect(predictPretrainedLrLocalSafe).toHaveBeenCalledTimes(1);
    const localArgs = predictPretrainedLrLocalSafe.mock.calls[0];
    expect(Object.keys(localArgs[0])).toHaveLength(21);
    expect(localArgs[1].model_run_id).toBe('20261119_211021');
  });

  test('3) Python unreachable → Node fallback succeeds', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(null);
    predictPretrainedLrLocalSafe.mockReturnValue(nodeOk());
    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });
    expect(result.ok).toBe(true);
    expect(result.inference_engine).toBe('node_pretrained_lr');
    expect(result.predicted_total_expenses).toBe(55550);
    expect(result.legacy_fallback_used).toBe(false);
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('4) Node fallback succeeds after Python transport miss', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(null);
    predictPretrainedLrLocalSafe.mockReturnValue(nodeOk({ predicted_total_expenses: 10000 }));
    const result = await forecastWithPretrainedLrFromSavedRecords(7, [
      eligibleRow({ id: 1, created_at: '2025-08-15T00:00:00+08:00' }),
    ]);
    expect(result.ok).toBe(true);
    expect(result.inference_engine).toBe('node_pretrained_lr');
    expect(result.forecast_period).toBe('2026-H1');
  });

  test('5) Both inference engines unavailable → structured error, no Ridge/RF/OLS', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(null);
    predictPretrainedLrLocalSafe.mockReturnValue({
      ok: false,
      error_code: 'MODEL_NOT_LOADED',
      error: 'JSON artifact missing',
    });
    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('MODEL_NOT_LOADED');
    expect(String(result.error)).toMatch(/JSON artifact missing|No legacy/i);
    expect(result.legacy_fallback_used).toBe(false);
    expect(result.inference_engine).toBeNull();
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('6) Correct model run ID on Python path', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(pythonOk());
    await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
      model_run_id: '20261119_211021',
    });
    expect(fetchPretrainedLrFromMlService.mock.calls[0][0].model_run_id).toBe(
      '20261119_211021'
    );
  });

  test('7) Correct 21-feature payload to Python', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(pythonOk());
    await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });
    const payload = fetchPretrainedLrFromMlService.mock.calls[0][0];
    expect(Object.keys(payload.feature_vector)).toHaveLength(21);
    expect(payload.forecast_period).toBe('2026-H1');
    expect(payload.farmer_id).toBe(7);
  });

  test('rejects unexpected non-LR model identifier from ML service (no silent swap)', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue({
      ok: true,
      model_name: 'ridge_regression_lags',
      predicted_total_expenses: 1,
    });
    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('UNEXPECTED_MODEL');
    expect(predictPretrainedLrLocalSafe).not.toHaveBeenCalled();
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('feature validation failure does not call ML or Node', async () => {
    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: null,
      record_periods: { 101: '2025-H2' },
    });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('FORECAST_PERIOD_REQUIRED');
    expect(fetchPretrainedLrFromMlService).not.toHaveBeenCalled();
    expect(predictPretrainedLrLocalSafe).not.toHaveBeenCalled();
  });
});

describe('saved-records and excel paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    isMlApiConfigured.mockReturnValue(true);
  });

  test('8) Saved-record prediction (Python)', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(
      pythonOk({ predicted_total_expenses: 11111, forecast_period: '2026-H1' })
    );
    const result = await forecastWithPretrainedLrFromSavedRecords(7, [
      eligibleRow({ id: 1, created_at: '2025-08-15T00:00:00+08:00' }),
    ]);
    expect(result.ok).toBe(true);
    expect(result.forecast_period).toBe('2026-H1');
    expect(result.latest_history_period).toBe('2025-H2');
    expect(result.inference_engine).toBe('python_pretrained_lr');
    expect(result.legacy_fallback_used).toBe(false);
  });

  test('8b) Saved-record prediction (Node when ML unset)', async () => {
    isMlApiConfigured.mockReturnValue(false);
    predictPretrainedLrLocalSafe.mockReturnValue(
      nodeOk({ predicted_total_expenses: 22220, forecast_period: '2026-H1' })
    );
    const result = await forecastWithPretrainedLrFromSavedRecords(7, [
      eligibleRow({ id: 1, created_at: '2025-08-15T00:00:00+08:00' }),
    ]);
    expect(result.ok).toBe(true);
    expect(result.inference_engine).toBe('node_pretrained_lr');
    expect(result.predicted_total_expenses).toBe(22220);
    expect(result.persisted).toBe(false);
  });

  test('9) Excel-upload prediction does not persist', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(
      pythonOk({ predicted_total_expenses: 22222, forecast_period: '2026-H2' })
    );
    const result = await forecastWithPretrainedLrFromExcelRows(7, [
      {
        ...eligibleRow({ id: 'excel-1' }),
        agricultural_semester: '2026-H1',
      },
    ]);
    expect(result.ok).toBe(true);
    expect(result.forecast_period).toBe('2026-H2');
    expect(result.persisted).toBe(false);
    expect(result.inference_engine).toBe('python_pretrained_lr');
  });

  test('9b) Excel-upload via Node when Python unreachable', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(null);
    predictPretrainedLrLocalSafe.mockReturnValue(
      nodeOk({ predicted_total_expenses: 33330, forecast_period: '2026-H2' })
    );
    const result = await forecastWithPretrainedLrFromExcelRows(7, [
      {
        ...eligibleRow({ id: 'excel-1' }),
        agricultural_semester: '2026-H1',
      },
    ]);
    expect(result.ok).toBe(true);
    expect(result.persisted).toBe(false);
    expect(result.inference_engine).toBe('node_pretrained_lr');
    expect(result.predicted_total_expenses).toBe(33330);
  });

  test('combined foundation still works with Node fallback', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(null);
    predictPretrainedLrLocalSafe.mockReturnValue(
      nodeOk({ predicted_total_expenses: 33333, forecast_period: '2026-H2' })
    );
    const result = await forecastWithPretrainedLrFromCombinedFoundation(
      7,
      [eligibleRow({ id: 10, created_at: '2025-08-15T00:00:00+08:00', total_expenses: 50000 })],
      [
        {
          id: 88,
          agricultural_semester: '2026-H1',
          area_hectares: 1.2,
          planting_method: 'talok',
          irrigation_type: 'NIA',
          land_preparation_cost: 1000,
          planting_cost: 1000,
          spraying_cost: 500,
          harvester_cost: 2000,
          drying_cost: 500,
          other_expenses: 0,
          hauling_cost: 400,
          tarasko_cost: 100,
          fuel_cost: 200,
          total_fertilizer_cost: 3000,
          total_pesticide_cost: 1000,
          total_expenses: 52000,
        },
      ]
    );
    expect(result.ok).toBe(true);
    expect(result.input_source).toBe('combined_foundation');
    expect(result.foundation_counts).toEqual({ farm_income: 1, excel: 1, total: 2 });
    expect(result.inference_engine).toBe('node_pretrained_lr');
    expect(result.predicted_total_expenses).toBe(33333);
  });

  test('10) No Ridge/RF/OLS — legacy client never called', async () => {
    isMlApiConfigured.mockReturnValue(false);
    predictPretrainedLrLocalSafe.mockReturnValue(nodeOk());
    await forecastWithPretrainedLrFromSavedRecords(7, [
      eligibleRow({ id: 1, created_at: '2025-08-15T00:00:00+08:00' }),
    ]);
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });
});

describe('ownership / auth contract (routes)', () => {
  test('12) route module keeps assertOwnFarmerId and pretrained paths', () => {
    const fs = require('fs');
    const path = require('path');
    const src = fs.readFileSync(
      path.join(__dirname, '../routes/farmer-income.js'),
      'utf8'
    );
    expect(src).toContain(
      "router.post('/expense-forecast-pretrained-lr/:farmerId'"
    );
    expect(src).toContain("router.get('/predictive-excel/template'");
    expect(src).toContain('/predictive-excel/forecast/:farmerId');
    expect(src).toContain("router.get('/expense-forecast/:farmerId'");
    expect(src).toContain('assertOwnFarmerId(req, req.params.farmerId)');
    expect(src).toContain('forecastWithPretrainedLrFromCombinedFoundation');
    expect(src).toContain('forecastWithPretrainedLrFromExcelRows');
    expect(src).toContain('persisted: false');
  });
});

describe('deployment safety — JSON artifact present', () => {
  test('ml-artifacts JSON exists next to backend (no Python required for Node path)', () => {
    const fs = require('fs');
    const path = require('path');
    const artifact = path.join(
      __dirname,
      '..',
      'ml-artifacts',
      'pretrained_lr_20261119_211021.json'
    );
    expect(fs.existsSync(artifact)).toBe(true);
    const parsed = JSON.parse(fs.readFileSync(artifact, 'utf8'));
    expect(parsed.run_id).toBe('20261119_211021');
    expect(parsed.coefficients).toHaveLength(21);
  });
});
