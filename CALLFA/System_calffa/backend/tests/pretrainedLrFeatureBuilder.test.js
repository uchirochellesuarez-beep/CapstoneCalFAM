const {
  FEATURE_ORDER,
  buildPretrainedLrFeatures,
  laborRelatedCost,
  transportCost,
  fuelCost,
  parsePeriodLabel,
} = require('../services/pretrainedLrFeatureBuilder');

function baseRow(overrides = {}) {
  return {
    id: 1,
    status: 'Eligible',
    area_hectares: 1.2,
    planting_method: 'sabog',
    irrigation_type: 'NIA',
    land_preparation_cost: 1000,
    planting_cost: 2000,
    spraying_cost: 500,
    harvester_cost: 3000,
    drying_cost: 400,
    other_expenses: 100,
    hauling_cost: 700,
    tarasko_cost: 300,
    fuel_cost: 250,
    total_fertilizer_cost: 5000,
    total_pesticide_cost: 1500,
    total_labor_cost: 99999, // must NOT be used as labor_related
    total_expenses: 14750,
    created_at: '2025-03-01T00:00:00.000Z',
    ...overrides,
  };
}

describe('pretrainedLrFeatureBuilder', () => {
  test('parses forecast period labels', () => {
    expect(parsePeriodLabel('2026-H1')).toEqual({
      label: '2026-H1',
      year: 2026,
      half: 1,
      period_index: 11,
      is_h1: 1,
    });
    expect(parsePeriodLabel('2021-H2').period_index).toBe(2);
    expect(parsePeriodLabel('bad')).toBeNull();
  });

  test('separates labor / transport / fuel (no total_labor_cost)', () => {
    const row = baseRow();
    expect(laborRelatedCost(row)).toBe(1000 + 2000 + 500 + 3000 + 400 + 100);
    expect(transportCost(row)).toBe(700 + 300);
    expect(fuelCost(row)).toBe(250);
    expect(laborRelatedCost(row)).not.toBe(row.total_labor_cost);
  });

  test('builds exact 21 features in training order', () => {
    const r1 = baseRow({ id: 10, total_expenses: 10000 });
    const r2 = baseRow({
      id: 11,
      area_hectares: 2,
      planting_method: 'talok',
      irrigation_type: 'bugsok_waterpump',
      total_expenses: 20000,
      total_fertilizer_cost: 8000,
      total_pesticide_cost: 2000,
      land_preparation_cost: 0,
      planting_cost: 0,
      spraying_cost: 0,
      harvester_cost: 0,
      drying_cost: 0,
      other_expenses: 5000,
      hauling_cost: 1000,
      tarasko_cost: 500,
      fuel_cost: 500,
    });

    const built = buildPretrainedLrFeatures([r1, r2], {
      forecast_period: '2026-H1',
      record_periods: { 10: '2025-H1', 11: '2025-H2' },
    });

    expect(built.ok).toBe(true);
    expect(Object.keys(built.feature_vector)).toEqual(FEATURE_ORDER);
    expect(FEATURE_ORDER).toHaveLength(21);
    expect(built.feature_vector.prev_total_expenses).toBe(20000);
    expect(built.feature_vector.prev_prev_total_expenses).toBe(10000);
    expect(built.feature_vector.delta_prev).toBe(10000);
    expect(built.feature_vector.has_lag2).toBe(1);
    expect(built.feature_vector.n_hist_periods).toBe(2);
    expect(built.feature_vector.roll3_mean_total).toBe(15000);
    expect(built.feature_vector.prev_labor_related_cost).toBe(5000);
    expect(built.feature_vector.prev_transport_cost).toBe(1500);
    expect(built.feature_vector.prev_fuel_cost).toBe(500);
    expect(built.feature_vector.prev_expenses_per_ha).toBe(10000);
    expect(built.feature_vector.planting_method_talok).toBe(1);
    expect(built.feature_vector.planting_method_sabog).toBe(0);
    expect(built.feature_vector.irrigation_bugsok_waterpump).toBe(1);
    expect(built.feature_vector.period_index).toBe(11);
    expect(built.feature_vector.is_h1).toBe(1);
    expect(built.forecast_period).toBe('2026-H1');
  });

  test('single history record uses has_lag2=0 imputation', () => {
    const r1 = baseRow({ id: 5, total_expenses: 12000 });
    const built = buildPretrainedLrFeatures([r1], {
      forecast_period: '2025-H2',
      record_periods: { 5: '2025-H1' },
    });
    expect(built.ok).toBe(true);
    expect(built.feature_vector.has_lag2).toBe(0);
    expect(built.feature_vector.delta_prev).toBe(0);
    expect(built.feature_vector.prev_prev_total_expenses).toBe(12000);
    expect(built.feature_vector.n_hist_periods).toBe(1);
  });

  test('rejects missing forecast_period (no created_at inference)', () => {
    const built = buildPretrainedLrFeatures([baseRow()], {
      record_periods: { 1: '2025-H1' },
    });
    expect(built.ok).toBe(false);
    expect(built.error_code).toBe('FORECAST_PERIOD_REQUIRED');
  });

  test('rejects missing record agricultural periods', () => {
    const built = buildPretrainedLrFeatures([baseRow({ id: 9 })], {
      forecast_period: '2025-H2',
      record_periods: {},
    });
    expect(built.ok).toBe(false);
    expect(built.error_code).toBe('AGRICULTURAL_PERIOD_REQUIRED');
  });

  test('rejects duplicate periods (no unverified aggregation)', () => {
    const a = baseRow({ id: 1 });
    const b = baseRow({ id: 2, total_expenses: 20000 });
    const built = buildPretrainedLrFeatures([a, b], {
      forecast_period: '2026-H1',
      record_periods: { 1: '2025-H1', 2: '2025-H1' },
    });
    expect(built.ok).toBe(false);
    expect(built.error_code).toBe('DUPLICATE_PERIOD');
  });

  test('rejects missing farm area', () => {
    const built = buildPretrainedLrFeatures([baseRow({ area_hectares: 0 })], {
      forecast_period: '2025-H2',
      record_periods: { 1: '2025-H1' },
    });
    expect(built.ok).toBe(false);
    expect(built.error_code).toBe('MISSING_FARM_AREA');
  });

  test('rejects unsupported planting / irrigation', () => {
    const p = buildPretrainedLrFeatures([baseRow({ planting_method: 'direct' })], {
      forecast_period: '2025-H2',
      record_periods: { 1: '2025-H1' },
    });
    expect(p.error_code).toBe('UNSUPPORTED_PLANTING_METHOD');

    const i = buildPretrainedLrFeatures([baseRow({ irrigation_type: 'rainfed' })], {
      forecast_period: '2025-H2',
      record_periods: { 1: '2025-H1' },
    });
    expect(i.error_code).toBe('UNSUPPORTED_IRRIGATION_TYPE');
  });

  test('rejects insufficient history', () => {
    const built = buildPretrainedLrFeatures([], {
      forecast_period: '2025-H2',
      record_periods: {},
    });
    expect(built.error_code).toBe('INSUFFICIENT_HISTORY');
  });

  test('ignores non-Eligible rows for history', () => {
    const pending = baseRow({ id: 1, status: 'Pending' });
    const eligible = baseRow({ id: 2, status: 'Eligible', total_expenses: 9000 });
    const built = buildPretrainedLrFeatures([pending, eligible], {
      forecast_period: '2025-H2',
      record_periods: { 2: '2025-H1' },
    });
    expect(built.ok).toBe(true);
    expect(built.n_hist_periods).toBe(1);
  });

  test('created_at mode derives semester and auto next forecast', () => {
    const r1 = baseRow({
      id: 1,
      created_at: '2025-03-15T00:00:00+08:00',
      total_expenses: 10000,
    });
    const r2 = baseRow({
      id: 2,
      created_at: '2025-09-01T00:00:00+08:00',
      total_expenses: 12000,
    });
    const built = buildPretrainedLrFeatures([r1, r2], {
      period_mode: 'created_at',
      auto_forecast_period: true,
    });
    expect(built.ok).toBe(true);
    expect(built.latest_history_period).toBe('2025-H2');
    expect(built.forecast_period).toBe('2026-H1');
    expect(built.history_periods.map((h) => h.period)).toEqual(['2025-H1', '2025-H2']);
    expect(built.limitations.some((l) => /Submission date may differ/i.test(l))).toBe(true);
    expect(Object.keys(built.feature_vector)).toHaveLength(21);
  });

  test('created_at duplicate semester returns clear error (no aggregation)', () => {
    const a = baseRow({ id: 1, created_at: '2025-02-01T00:00:00+08:00' });
    const b = baseRow({ id: 2, created_at: '2025-05-01T00:00:00+08:00', total_expenses: 20000 });
    const built = buildPretrainedLrFeatures([a, b], {
      period_mode: 'created_at',
      auto_forecast_period: true,
    });
    expect(built.ok).toBe(false);
    expect(built.error_code).toBe('DUPLICATE_PERIOD');
  });

  test('missing history returns INSUFFICIENT_HISTORY', () => {
    const built = buildPretrainedLrFeatures([], {
      period_mode: 'created_at',
      auto_forecast_period: true,
    });
    expect(built.error_code).toBe('INSUFFICIENT_HISTORY');
  });
});
