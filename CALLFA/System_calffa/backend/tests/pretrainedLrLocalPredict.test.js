const path = require('path');
const fs = require('fs');
const {
  loadArtifact,
  predictPretrainedLrLocal,
  predictPretrainedLrLocalSafe,
  EXPECTED_RUN_ID,
  DEFAULT_ARTIFACT_PATH,
} = require('../services/pretrainedLrLocalPredict');

const FIXTURES_PATH = path.join(
  __dirname,
  '..',
  'ml-artifacts',
  'pretrained_lr_parity_fixtures.json'
);

function loadFixtures() {
  return JSON.parse(fs.readFileSync(FIXTURES_PATH, 'utf8'));
}

describe('pretrainedLrLocalPredict — artifact load', () => {
  test('loads versioned JSON and validates run_id', () => {
    const art = loadArtifact(DEFAULT_ARTIFACT_PATH);
    expect(art.run_id).toBe(EXPECTED_RUN_ID);
    expect(art.input_feature_order).toHaveLength(21);
    expect(art.scaled_feature_order).toHaveLength(13);
    expect(art.passthrough_feature_order).toHaveLength(8);
    expect(art.transformed_feature_order).toEqual([
      ...art.scaled_feature_order,
      ...art.passthrough_feature_order,
    ]);
    expect(art.coefficients).toHaveLength(21);
    expect(art.trained_on_simulated_data).toBe(true);
  });
});

describe('pretrainedLrLocalPredict — Python parity fixtures', () => {
  const fixtures = loadFixtures();
  const tol = Number(fixtures.raw_abs_tolerance) || 1e-6;

  test('fixture run_id matches artifact', () => {
    expect(fixtures.run_id).toBe(EXPECTED_RUN_ID);
  });

  for (const c of fixtures.cases) {
    test(`parity case: ${c.id}`, () => {
      const result = predictPretrainedLrLocal(c.feature_vector, {
        model_run_id: fixtures.run_id,
      });
      expect(result.ok).toBe(true);
      expect(result.model_run_id).toBe(EXPECTED_RUN_ID);
      expect(result.trained_on_simulated_data).toBe(true);
      expect(String(result.disclaimer_en || '')).toMatch(/simulated/i);
      expect(Math.abs(result.predicted_total_expenses_raw - c.expected_raw)).toBeLessThanOrEqual(
        tol
      );
      expect(result.predicted_total_expenses).toBe(c.expected_rounded);
      expect(Boolean(result.clip_nonnegative_applied)).toBe(Boolean(c.expected_clip_applied));
    });
  }

  test('transformed order is used (not raw input order for coefs)', () => {
    const art = loadArtifact();
    // If someone wrongly dotted coef against input_feature_order values unscaled,
    // standard_realistic would not match Python. Covered by parity cases; assert structural contract.
    expect(art.transformed_feature_order[0]).toBe('area_hectares');
    expect(art.transformed_feature_order[13]).toBe('planting_method_sabog');
    expect(art.input_feature_order[9]).toBe('planting_method_sabog');
    expect(art.transformed_feature_order[9]).not.toBe('planting_method_sabog');
  });
});

describe('pretrainedLrLocalPredict — invalid inputs', () => {
  const fixtures = loadFixtures();

  for (const inv of fixtures.invalid_cases) {
    test(`rejects ${inv.id}`, () => {
      const fv = { ...inv.feature_vector };
      if (inv.null_means_nan) {
        for (const [k, v] of Object.entries(fv)) {
          if (v === null) fv[k] = Number.NaN;
        }
      }
      const result = predictPretrainedLrLocalSafe(fv);
      expect(result.ok).toBe(false);
      expect(result.error_code).toBe(inv.expected_error_code);
    });
  }

  test('model_run_id mismatch', () => {
    const fixturesLocal = loadFixtures();
    const fv = fixturesLocal.cases[0].feature_vector;
    const result = predictPretrainedLrLocalSafe(fv, { model_run_id: 'wrong_run' });
    expect(result.ok).toBe(false);
    expect(result.error_code).toBe('MODEL_RUN_MISMATCH');
  });
});

describe('pretrainedLrLocalPredict — rounding & clipping helpers', () => {
  test('PHP 10 rounding exact on known raw-near values via fixture', () => {
    const fixtures = loadFixtures();
    const std = fixtures.cases.find((c) => c.id === 'standard_realistic');
    expect(std.expected_rounded % 10).toBe(0);
    const clipCase = fixtures.cases.find((c) => c.id === 'all_zeros_clip');
    expect(clipCase.expected_clip_applied).toBe(true);
    expect(clipCase.expected_rounded).toBe(0);
  });
});
