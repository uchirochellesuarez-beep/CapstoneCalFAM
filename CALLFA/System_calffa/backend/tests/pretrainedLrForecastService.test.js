jest.mock('../services/mlExpenseClient', () => ({
  fetchExpenseForecastFromMlService: jest.fn(async () => {
    throw new Error('legacy ML client must not be called');
  }),
  fetchPretrainedLrFromMlService: jest.fn(),
}));

const {
  fetchExpenseForecastFromMlService,
  fetchPretrainedLrFromMlService,
} = require('../services/mlExpenseClient');
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

describe('forecastWithPretrainedLr', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('successful pretrained LR response (no legacy fallback)', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue({
      ok: true,
      model_name: 'pretrained_linear_regression',
      ml_engine: 'pretrained_linear_regression',
      model_run_id: '20261119_211021',
      predicted_total_expenses: 12340,
      forecast_period: '2026-H1',
      trained_on_simulated_data: true,
      performance_label: 'SYNTHETIC DATA PERFORMANCE',
      disclaimer_ph: 'sim disclaimer',
    });

    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });

    expect(result.ok).toBe(true);
    expect(result.model).toBe('pretrained_linear_regression');
    expect(result.ml_engine).toBe('pretrained_linear_regression');
    expect(result.predicted_total_expenses).toBe(12340);
    expect(result.forecast_period).toBe('2026-H1');
    expect(result.trained_on_simulated_data).toBe(true);
    expect(result.legacy_fallback_used).toBe(false);
    expect(result.feature_order).toHaveLength(21);
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
    expect(fetchPretrainedLrFromMlService).toHaveBeenCalledTimes(1);
    const payload = fetchPretrainedLrFromMlService.mock.calls[0][0];
    expect(Object.keys(payload.feature_vector)).toHaveLength(21);
    expect(payload.forecast_period).toBe('2026-H1');
    expect(payload.farmer_id).toBe(7);
  });

  test('ML service unavailable → clear error, no legacy fallback', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue(null);

    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: '2026-H1',
      record_periods: { 101: '2025-H2' },
    });

    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('ML_SERVICE_UNAVAILABLE');
    expect(result.legacy_fallback_used).toBeUndefined();
    expect(String(result.error)).toMatch(/No legacy/i);
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('rejects unexpected non-LR model identifier from ML service', async () => {
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
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('feature validation failure does not call ML', async () => {
    const result = await forecastWithPretrainedLr(7, [eligibleRow()], {
      forecast_period: null,
      record_periods: { 101: '2025-H2' },
    });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('FORECAST_PERIOD_REQUIRED');
    expect(fetchPretrainedLrFromMlService).not.toHaveBeenCalled();
  });
});

describe('saved-records and excel auto-semester paths', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('fromSavedRecords uses created_at and auto next semester', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue({
      ok: true,
      model_name: 'pretrained_linear_regression',
      predicted_total_expenses: 11111,
      forecast_period: '2026-H1',
    });
    const result = await forecastWithPretrainedLrFromSavedRecords(7, [
      eligibleRow({ id: 1, created_at: '2025-08-15T00:00:00+08:00' }),
    ]);
    expect(result.ok).toBe(true);
    expect(result.forecast_period).toBe('2026-H1');
    expect(result.latest_history_period).toBe('2025-H2');
    expect(result.legacy_fallback_used).toBe(false);
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('fromExcelRows uses Agricultural_Semester and does not persist', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue({
      ok: true,
      model_name: 'pretrained_linear_regression',
      predicted_total_expenses: 22222,
      forecast_period: '2026-H2',
    });
    const result = await forecastWithPretrainedLrFromExcelRows(7, [
      {
        ...eligibleRow({ id: 'excel-1' }),
        agricultural_semester: '2026-H1',
      },
    ]);
    expect(result.ok).toBe(true);
    expect(result.forecast_period).toBe('2026-H2');
    expect(result.persisted).toBe(false);
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });

  test('combined foundation merges Farm Income + Excel and forecasts next semester', async () => {
    fetchPretrainedLrFromMlService.mockResolvedValue({
      ok: true,
      model_name: 'pretrained_linear_regression',
      predicted_total_expenses: 33333,
      forecast_period: '2026-H2',
    });
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
    expect(result.forecast_period).toBe('2026-H2');
    expect(result.predicted_total_expenses).toBe(33333);
    expect(fetchExpenseForecastFromMlService).not.toHaveBeenCalled();
  });
});

describe('ownership helper contract (route uses assertOwnFarmerId)', () => {
  test('route module exports isolated path string in source', () => {
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
    expect(src).toContain("/predictive-excel/forecast/:farmerId");
    expect(src).toContain(
      "router.get('/expense-forecast/:farmerId'"
    );
    expect(src).toContain('assertOwnFarmerId(req, req.params.farmerId)');
    expect(src).toContain('forecastWithPretrainedLrFromCombinedFoundation');
    expect(src).toContain('forecastWithPretrainedLrFromExcelRows');
    expect(src).toContain('persisted: false');
  });
});
