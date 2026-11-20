/**
 * Standalone Node.js inference for the exported pretrained Linear Regression JSON.
 * Does NOT call Python ML service. Does NOT fit/retrain.
 *
 * Coefficients are applied in transformed feature order
 * (scaled continuous first, then passthrough binaries).
 */
const fs = require('fs');
const path = require('path');

const DEFAULT_ARTIFACT_PATH = path.join(
  __dirname,
  '..',
  'ml-artifacts',
  'pretrained_lr_20261120_203925.json'
);

const EXPECTED_RUN_ID = '20261120_203925';
const EXPECTED_SCHEMA_VERSION = 1;

class LocalPredictError extends Error {
  constructor(error_code, message) {
    super(message);
    this.name = 'LocalPredictError';
    this.error_code = error_code;
  }
}

function isFiniteNumber(v) {
  return typeof v === 'number' && Number.isFinite(v);
}

function loadArtifact(artifactPath = DEFAULT_ARTIFACT_PATH) {
  const resolved = path.resolve(artifactPath);
  if (!fs.existsSync(resolved)) {
    throw new LocalPredictError(
      'MODEL_NOT_LOADED',
      `Pretrained LR JSON artifact not found: ${resolved}`
    );
  }
  let raw;
  try {
    raw = JSON.parse(fs.readFileSync(resolved, 'utf8'));
  } catch (err) {
    throw new LocalPredictError(
      'MODEL_NOT_LOADED',
      `Failed to parse pretrained LR JSON: ${err.message}`
    );
  }
  validateArtifact(raw);
  return { ...raw, _artifact_path: resolved };
}

function validateArtifact(art) {
  if (!art || typeof art !== 'object') {
    throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', 'Artifact must be a JSON object.');
  }
  if (Number(art.schema_version) !== EXPECTED_SCHEMA_VERSION) {
    throw new LocalPredictError(
      'INCOMPATIBLE_ARTIFACT',
      `Unsupported schema_version=${art.schema_version}; expected ${EXPECTED_SCHEMA_VERSION}.`
    );
  }
  if (String(art.run_id) !== EXPECTED_RUN_ID) {
    throw new LocalPredictError(
      'INCOMPATIBLE_ARTIFACT',
      `Unexpected run_id=${art.run_id}; expected ${EXPECTED_RUN_ID}.`
    );
  }
  if (String(art.model_type) !== 'linear_regression') {
    throw new LocalPredictError(
      'INCOMPATIBLE_ARTIFACT',
      `Unsupported model_type=${art.model_type}`
    );
  }
  const input = art.input_feature_order;
  const scaled = art.scaled_feature_order;
  const passthrough = art.passthrough_feature_order;
  const transformed = art.transformed_feature_order;
  if (!Array.isArray(input) || input.length !== 21) {
    throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', 'input_feature_order must have 21 names.');
  }
  if (!Array.isArray(scaled) || scaled.length !== 13) {
    throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', 'scaled_feature_order must have 13 names.');
  }
  if (!Array.isArray(passthrough) || passthrough.length !== 8) {
    throw new LocalPredictError(
      'INCOMPATIBLE_ARTIFACT',
      'passthrough_feature_order must have 8 names.'
    );
  }
  if (!Array.isArray(transformed) || transformed.length !== 21) {
    throw new LocalPredictError(
      'INCOMPATIBLE_ARTIFACT',
      'transformed_feature_order must have 21 names.'
    );
  }
  const expectedTransformed = [...scaled, ...passthrough];
  for (let i = 0; i < 21; i += 1) {
    if (transformed[i] !== expectedTransformed[i]) {
      throw new LocalPredictError(
        'INCOMPATIBLE_ARTIFACT',
        'transformed_feature_order must equal scaled + passthrough order.'
      );
    }
  }
  const mean = art.scaler?.mean;
  const scale = art.scaler?.scale;
  if (!Array.isArray(mean) || mean.length !== 13 || !Array.isArray(scale) || scale.length !== 13) {
    throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', 'scaler.mean/scale must be length 13.');
  }
  if (!Array.isArray(art.coefficients) || art.coefficients.length !== 21) {
    throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', 'coefficients must be length 21.');
  }
  if (!isFiniteNumber(Number(art.intercept))) {
    throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', 'intercept must be a finite number.');
  }
  for (let i = 0; i < 13; i += 1) {
    if (!isFiniteNumber(Number(mean[i])) || !isFiniteNumber(Number(scale[i]))) {
      throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', 'scaler values must be finite.');
    }
    if (Math.abs(Number(scale[i])) < 1e-15) {
      throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', `scaler.scale[${i}] is near zero.`);
    }
  }
  for (let i = 0; i < 21; i += 1) {
    if (!isFiniteNumber(Number(art.coefficients[i]))) {
      throw new LocalPredictError('INCOMPATIBLE_ARTIFACT', `coefficients[${i}] is not finite.`);
    }
  }
}

function validateFeatureVector(featureVector, inputFeatureOrder) {
  if (featureVector == null || typeof featureVector !== 'object' || Array.isArray(featureVector)) {
    throw new LocalPredictError(
      'INCORRECT_FEATURE_TYPE',
      'feature_vector must be an object mapping feature name to number.'
    );
  }
  const missing = inputFeatureOrder.filter((k) => !(k in featureVector));
  if (missing.length) {
    throw new LocalPredictError(
      'MISSING_FEATURE',
      `Missing required feature(s): ${missing.join(', ')}`
    );
  }
  const extra = Object.keys(featureVector).filter((k) => !inputFeatureOrder.includes(k));
  if (extra.length) {
    throw new LocalPredictError(
      'UNEXPECTED_FEATURE',
      `Unexpected feature key(s): ${extra.sort().join(', ')}`
    );
  }
  if (Object.keys(featureVector).length !== inputFeatureOrder.length) {
    throw new LocalPredictError(
      'INCORRECT_FEATURE_COUNT',
      `Expected exactly ${inputFeatureOrder.length} features, got ${Object.keys(featureVector).length}.`
    );
  }

  const cleaned = {};
  for (const name of inputFeatureOrder) {
    const raw = featureVector[name];
    if (typeof raw === 'boolean' || raw == null || typeof raw === 'string' || Array.isArray(raw)) {
      throw new LocalPredictError(
        'INCORRECT_FEATURE_TYPE',
        `Feature '${name}' must be a finite number, got ${raw === null ? 'null' : typeof raw}.`
      );
    }
    const val = Number(raw);
    if (!Number.isFinite(val)) {
      throw new LocalPredictError(
        'NON_FINITE_VALUE',
        `Feature '${name}' must be finite (got ${String(raw)}).`
      );
    }
    cleaned[name] = val;
  }
  return cleaned;
}

function buildTransformedRow(cleaned, artifact) {
  const { scaled_feature_order: scaled, passthrough_feature_order: passthrough, scaler } =
    artifact;
  const mean = scaler.mean;
  const scale = scaler.scale;
  const row = [];
  for (let i = 0; i < scaled.length; i += 1) {
    const x = cleaned[scaled[i]];
    row.push((x - Number(mean[i])) / Number(scale[i]));
  }
  for (let i = 0; i < passthrough.length; i += 1) {
    row.push(cleaned[passthrough[i]]);
  }
  return row;
}

function postProcess(raw, artifact) {
  let value = raw;
  let clipApplied = false;
  if (artifact.clip_nonnegative && value < 0) {
    value = 0;
    clipApplied = true;
  }
  const nearest = Number(artifact.round_to_nearest) || 10;
  const predicted = Math.max(0, Math.round(value / nearest) * nearest);
  return { predicted, clipApplied, valueBeforeRound: value };
}

/**
 * @param {Record<string, number>} featureVector
 * @param {object} [options]
 * @param {object} [options.artifact] preloaded artifact
 * @param {string} [options.artifactPath]
 * @param {string} [options.forecast_period]
 * @param {number} [options.farmer_id]
 * @param {string} [options.model_run_id] if set, must match artifact run_id
 */
function predictPretrainedLrLocal(featureVector, options = {}) {
  const artifact =
    options.artifact ||
    loadArtifact(options.artifactPath || DEFAULT_ARTIFACT_PATH);

  if (options.model_run_id != null && String(options.model_run_id) !== String(artifact.run_id)) {
    throw new LocalPredictError(
      'MODEL_RUN_MISMATCH',
      `Requested model_run_id=${options.model_run_id} does not match loaded run_id=${artifact.run_id}.`
    );
  }

  const cleaned = validateFeatureVector(featureVector, artifact.input_feature_order);
  const row = buildTransformedRow(cleaned, artifact);
  let raw = Number(artifact.intercept);
  for (let i = 0; i < 21; i += 1) {
    raw += row[i] * Number(artifact.coefficients[i]);
  }
  if (!Number.isFinite(raw)) {
    throw new LocalPredictError('NON_FINITE_PREDICTION', 'Model produced a non-finite prediction.');
  }

  const { predicted, clipApplied } = postProcess(raw, artifact);

  return {
    ok: true,
    model_name: artifact.model_name || 'pretrained_linear_regression',
    ml_engine: 'pretrained_linear_regression',
    model_type: 'linear_regression',
    model_run_id: artifact.run_id,
    model_artifact_path: artifact._artifact_path || null,
    target: artifact.target,
    predicted_total_expenses: predicted,
    predicted_total_expenses_raw: raw,
    clip_nonnegative_applied: clipApplied,
    forecast_period: options.forecast_period || null,
    farmer_id: options.farmer_id != null ? Number(options.farmer_id) : null,
    feature_order: artifact.input_feature_order.slice(),
    transformed_feature_order: artifact.transformed_feature_order.slice(),
    n_features: 21,
    performance_label: artifact.performance_label,
    trained_on_simulated_data: true,
    disclaimer_en: artifact.disclaimer_en,
    disclaimer_ph: artifact.disclaimer_ph,
    inference_engine: 'node_pretrained_lr',
    method_description_ph:
      'Pretrained Linear Regression + StandardScaler (Node JSON artifact; synthetic training). ' +
      'Walang online Ridge/RandomForest/OLS.',
  };
}

function predictPretrainedLrLocalSafe(featureVector, options = {}) {
  try {
    return predictPretrainedLrLocal(featureVector, options);
  } catch (err) {
    if (err instanceof LocalPredictError) {
      return {
        ok: false,
        error_code: err.error_code,
        error: err.message,
        ml_engine: 'pretrained_linear_regression',
        model: 'pretrained_linear_regression',
        inference_engine: 'node_pretrained_lr',
      };
    }
    return {
      ok: false,
      error_code: 'INTERNAL_ERROR',
      error: err?.message || String(err),
      ml_engine: 'pretrained_linear_regression',
      model: 'pretrained_linear_regression',
      inference_engine: 'node_pretrained_lr',
    };
  }
}

module.exports = {
  DEFAULT_ARTIFACT_PATH,
  EXPECTED_RUN_ID,
  EXPECTED_SCHEMA_VERSION,
  LocalPredictError,
  loadArtifact,
  validateArtifact,
  validateFeatureVector,
  predictPretrainedLrLocal,
  predictPretrainedLrLocalSafe,
};
