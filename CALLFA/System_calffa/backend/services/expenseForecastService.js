const fs = require('fs');
const path = require('path');
const { fetchExpenseForecastFromMlService } = require('./mlExpenseClient');

/**
 * Expense forecasting: prefers Python sklearn service (see ML_API_URL) when configured;
 * falls back to Node OLS linear trend on indices.
 *
 * User foundation: `data/user_expense_historical/<farmer_id>/foundation.json` — ina-upload ng magsasaka o president
 * (API), palaging isinasama bago ang bundled samples at DB rows. Bawat puntos sa upload ay dapat may
 * `farmer_id` na tumutugma sa URL (tinatanggi ang halo ng ibang magsasaka). `period_index` ay opsyonal.
 *
 * Bundled JSON: default auto — kung may folder `data/expense_training_samples/<farmer_id>/` at kulang ang DB rows,
 * isasama ang panel. Opsiyon: EXPENSE_FORECAST_SAMPLE_FARMER_IDS (non-empty = limitado lamang ang IDs na iyon).
 * Opsiyon: EXPENSE_FORECAST_DISABLE_BUNDLED_SAMPLES=1 = huwag gumamit ng JSON panel.
 */
const SAMPLES_ROOT = path.join(__dirname, '../data/expense_training_samples');
/** User- or president-uploaded historical totals (JSON per farmer) — always merged before DB/bundled samples */
const USER_HISTORICAL_ROOT = path.join(__dirname, '../data/user_expense_historical');

const FOUNDATION_FILENAME = 'foundation.json';
const MAX_UPLOAD_POINTS = 120;
const MAX_FOUNDATION_FILE_BYTES = 256 * 1024;

const PUBLIC_DISCLAIMER_PH =
  'Ang numero ng hula ay gabay lamang batay sa trend ng nakatalang gastos — hindi garantiya ng aktwal na babayarin. Mga presyo sa merkado, klima, peste, at patakaran ay maaaring magbago. Mas maraming tala sa paglipas ng panahon = mas kapani-paniwalang resulta.';

function bundledSamplesGloballyDisabled() {
  const v = String(process.env.EXPENSE_FORECAST_DISABLE_BUNDLED_SAMPLES || '')
    .trim()
    .toLowerCase();
  return v === '1' || v === 'true' || v === 'yes';
}

/** Non-empty env = whitelist only; empty = automatic kung may `samples/<numeric_id>/` sa disk */
function bundledFarmerIdWhitelist() {
  const raw = process.env.EXPENSE_FORECAST_SAMPLE_FARMER_IDS || '';
  const ids = new Set();
  if (!raw.trim()) return ids;
  for (const part of raw.split(',')) {
    const n = parseInt(String(part).trim(), 10);
    if (Number.isFinite(n) && n > 0) ids.add(n);
  }
  return ids;
}

function hasBundledExpenseSampleFiles(farmerId) {
  const dir = path.join(SAMPLES_ROOT, String(farmerId));
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) return false;
  return fs.readdirSync(dir).some((f) => f.endsWith('.json'));
}

/** True if forecast may merge on-disk JSON when DB rows are below threshold */
function mayAugmentWithBundledSamples(farmerId) {
  if (bundledSamplesGloballyDisabled()) return false;
  const whitelist = bundledFarmerIdWhitelist();
  if (whitelist.size > 0) return whitelist.has(Number(farmerId));
  return hasBundledExpenseSampleFiles(farmerId);
}

function avg(arr) {
  return arr.reduce((s, x) => s + x, 0) / arr.length;
}

/**
 * Fallback: OLS y ≈ β0 + β1 * t
 */
function fitLinearTrend(t, y) {
  const n = y.length;
  if (n < 3) return null;

  const meanT = avg(t);
  const meanY = avg(y);
  let cov = 0;
  let varT = 0;
  for (let i = 0; i < n; i += 1) {
    const dt = t[i] - meanT;
    const dy = y[i] - meanY;
    cov += dt * dy;
    varT += dt * dt;
  }
  if (varT < 1e-12) return null;

  const b1 = cov / varT;
  const b0 = meanY - b1 * meanT;
  const yhat = t.map((ti) => b0 + b1 * ti);
  const ssRes = y.reduce((s, yi, i) => s + (yi - yhat[i]) ** 2, 0);
  const ssTot = y.reduce((s, yi) => s + (yi - meanY) ** 2, 0);
  const r_squared = ssTot <= 1e-9 ? 0 : Math.max(0, 1 - ssRes / ssTot);
  const sigma = Math.sqrt(Math.max(ssRes / Math.max(n - 2, 1), 0));

  return { b0, b1, yhat, r_squared, sigma };
}

function userFoundationPath(farmerId) {
  return path.join(USER_HISTORICAL_ROOT, String(farmerId), FOUNDATION_FILENAME);
}

/**
 * @returns {{ points: { period_index: number|null, total_expenses: number }[], updated_at: string|null }}
 */
function loadUserUploadedFoundation(farmerId) {
  const fp = userFoundationPath(farmerId);
  if (!fs.existsSync(fp)) {
    return { points: [], updated_at: null };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(fp, 'utf8'));
    const arr = Array.isArray(raw?.points) ? raw.points : [];
    const folderFarmer = Number(farmerId);
    const points = arr
      .map((p, i) => {
        const rowFarmer =
          p && p.farmer_id != null && Number.isFinite(Number(p.farmer_id))
            ? Number(p.farmer_id)
            : folderFarmer;
        if (Number.isFinite(rowFarmer) && rowFarmer !== folderFarmer) {
          return null;
        }
        return {
          farmer_id: Number.isFinite(rowFarmer) ? rowFarmer : folderFarmer,
          period_index: Number.isFinite(Number(p.period_index)) ? Number(p.period_index) : i + 1,
          total_expenses: parseFloat(p.total_expenses),
        };
      })
      .filter((p) => p && Number.isFinite(p.total_expenses));
    return {
      points,
      updated_at: typeof raw.updated_at === 'string' ? raw.updated_at : null,
    };
  } catch {
    return { points: [], updated_at: null };
  }
}

function getUserUploadedFoundationSummary(farmerId) {
  const { points, updated_at } = loadUserUploadedFoundation(farmerId);
  return {
    ok: true,
    farmer_id: Number(farmerId),
    count: points.length,
    updated_at,
    preview: points.slice(0, 8).map((p) => p.total_expenses),
  };
}

/**
 * @param {Array<{ period_index?: number, total_expenses: number }>} points
 */
function saveUserUploadedFoundation(farmerId, points) {
  const dir = path.join(USER_HISTORICAL_ROOT, String(farmerId));
  fs.mkdirSync(dir, { recursive: true });
  const fid = Number(farmerId);
  const cleaned = points
    .slice(0, MAX_UPLOAD_POINTS)
    .map((p, i) => ({
      farmer_id: fid,
      period_index: Number.isFinite(Number(p.period_index)) ? Number(p.period_index) : i + 1,
      total_expenses: parseFloat(p.total_expenses) || 0,
    }))
    .filter((p) => Number.isFinite(p.total_expenses) && p.total_expenses >= 0);
  const payload = {
    version: 2,
    farmer_id: fid,
    updated_at: new Date().toISOString(),
    points: cleaned,
  };
  const fp = userFoundationPath(farmerId);
  fs.writeFileSync(fp, JSON.stringify(payload, null, 2), 'utf8');
  return cleaned.length;
}

function clearUserUploadedFoundation(farmerId) {
  const fp = userFoundationPath(farmerId);
  if (fs.existsSync(fp)) fs.unlinkSync(fp);
}

function loadBundledExpenseSamples(farmerId) {
  const dir = path.join(SAMPLES_ROOT, String(farmerId));
  if (!fs.existsSync(dir)) return [];
  const files = fs
    .readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort();
  const rows = [];
  for (const f of files) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
      rows.push(raw);
    } catch {
      /* skip */
    }
  }
  rows.sort(
    (a, b) => (Number(a.period_index) || 0) - (Number(b.period_index) || 0)
  );
  return rows;
}

function seriesFromDatabaseRecords(rows) {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  return sorted.map((r) => ({
    source: 'db',
    id: r.id,
    farmer_id: r.farmer_id,
    period_index: null,
    label: '',
    created_at: r.created_at,
    total_expenses: parseFloat(r.total_expenses) || 0,
  }));
}

const MIN_TRAIN_ROWS = 3;

function augmentThresholdDbRows() {
  const raw = process.env.EXPENSE_FORECAST_AUGMENT_IF_DB_UNDER;
  if (raw === undefined || String(raw).trim() === '') return 4;
  const n = parseInt(String(raw).trim(), 10);
  return Number.isFinite(n) && n >= 1 ? n : 4;
}

/** Kung 1900–2100 ang period_index, itinuturing na taon (hal. 2026) para ihalo sa timeline ng DB ayon sa petsa */
function periodIndexLooksLikeCalendarYear(pi) {
  const n = Number(pi);
  return Number.isFinite(n) && n >= 1900 && n <= 2100;
}

function buildTrainingSeries(farmerId, dbRows) {
  const dbSeries = seriesFromDatabaseRecords(dbRows).map((r) => {
    const t = new Date(r.created_at).getTime();
    return {
      ...r,
      _sort_ms: Number.isFinite(t) ? t : NaN,
    };
  });

  const validDbTimes = dbSeries.map((r) => r._sort_ms).filter((t) => Number.isFinite(t));
  const minDbMs =
    validDbTimes.length > 0 ? Math.min(...validDbTimes) : Number.POSITIVE_INFINITY;

  const { points: userPoints } = loadUserUploadedFoundation(farmerId);
  const userSorted = [...userPoints].sort(
    (a, b) => (Number(a.period_index) || 0) - (Number(b.period_index) || 0)
  );

  const nOrdinalUploads = userSorted.filter(
    (r) => !periodIndexLooksLikeCalendarYear(r.period_index)
  ).length;
  let ordinalPass = 0;

  const uploadSeries = userSorted.map((r) => {
    const pi = Number(r.period_index);
    let sortMs;
    if (periodIndexLooksLikeCalendarYear(pi)) {
      sortMs = Date.UTC(Math.floor(pi), 0, 1);
    } else {
      ordinalPass += 1;
      const anchor = Number.isFinite(minDbMs) ? minDbMs : Date.now();
      sortMs = anchor - (nOrdinalUploads - ordinalPass + 1) * 86400000;
    }
    return {
      source: 'upload',
      farmer_id: r.farmer_id != null ? Number(r.farmer_id) : Number(farmerId),
      period_index: r.period_index,
      label: '',
      created_at: null,
      total_expenses: parseFloat(r.total_expenses) || 0,
      _sort_ms: sortMs,
    };
  });

  let augmented = false;
  const needAugmentUnder = augmentThresholdDbRows();
  let bundledSeries = [];

  if (dbSeries.length < needAugmentUnder && mayAugmentWithBundledSamples(farmerId)) {
    const bundled = loadBundledExpenseSamples(farmerId);
    if (bundled.length > 0) {
      augmented = true;
      const anchorB = Number.isFinite(minDbMs) ? minDbMs : Date.now();
      bundledSeries = bundled.map((r) => {
        const pidx = Math.min(Math.max(Number(r.period_index) || 0, 0), 240);
        return {
          source: 'sample',
          farmer_id: farmerId,
          period_index: r.period_index,
          label: '',
          created_at: null,
          total_expenses: parseFloat(r.total_expenses) || 0,
          _sort_ms: anchorB - (280 - pidx) * 86400000,
        };
      });
    }
  }

  const sourceRank = { upload: 0, sample: 1, db: 2 };

  let combined = [...uploadSeries, ...bundledSeries, ...dbSeries].sort((a, b) => {
    const ta = Number(a._sort_ms);
    const tb = Number(b._sort_ms);
    if (Number.isFinite(ta) && Number.isFinite(tb) && ta !== tb) return ta - tb;
    if (!Number.isFinite(ta) && Number.isFinite(tb)) return 1;
    if (Number.isFinite(ta) && !Number.isFinite(tb)) return -1;
    const ra = sourceRank[a.source] ?? 9;
    const rb = sourceRank[b.source] ?? 9;
    if (ra !== rb) return ra - rb;
    if (a.source === 'db' && b.source === 'db') return (a.id || 0) - (b.id || 0);
    return 0;
  });

  const userUploadCount = combined.filter((p) => p.source === 'upload').length;

  combined = combined
    .filter((p) => Number.isFinite(p.total_expenses))
    .map((p, idx) => {
      const { _sort_ms, ...rest } = p;
      let lab;
      if (rest.source === 'db') {
        lab = rest.id != null ? `Tala #${idx + 1} (rekord)` : `Hakbang ${idx + 1}`;
      } else if (rest.source === 'upload') {
        lab = periodIndexLooksLikeCalendarYear(rest.period_index)
          ? `Pundasyon (taon ${rest.period_index})`
          : `Pundasyon (upload) #${idx + 1}`;
      } else {
        lab = `Panel sample #${idx + 1}`;
      }
      return { ...rest, step: idx, label: lab };
    });

  return { series: combined, augmented, user_upload_count: userUploadCount };
}

function enrichQualityHint(seriesLen, r2, engine) {
  const lowData = seriesLen < 8;
  const weakFit = r2 < 0.35;
  if (!lowData && !weakFit) return undefined;
  const engineNote =
    engine === 'python_sklearn'
      ? ' (Python ML)'
      : ' (Node OLS fallback)';
  return `Bababa ang kasiguraduhan dahil kulang pa ang puntos o mahina ang tugma ng modelo — magpatuloy sa pagtala ng tunay na gastos.${engineNote}`;
}

function buildOlsResponse(series, augmented) {
  const t = series.map((_, i) => i);
  const y = series.map((s) => s.total_expenses);
  const fit = fitLinearTrend(t, y);
  if (!fit) {
    return {
      ok: false,
      error:
        'Hindi kayang i-fit ang linear trend (hal. pare-parehong gastos bawat tala — dagdagan ng iba pang tala gamit tunay na datos).',
      disclaimer_ph: PUBLIC_DISCLAIMER_PH,
      history: series,
      augmented_with_samples: augmented,
    };
  }

  const tNext = t.length;
  const point = fit.b0 + fit.b1 * tNext;
  const ciHalf = 1.96 * fit.sigma;
  const predicted = Math.max(0, Math.round(point / 10) * 10);
  const stepNext = series.length + 1;

  return {
    ok: true,
    ml_engine: 'node_ols_fallback',
    model: 'ordinary_least_squares_linear_regression',
    method_description_ph:
      'Node.js OLS: univariate linear trend sa indeks ng panahon (fallback kapag walang Python ML o hindi available ang serbisyo).',
    disclaimer_ph: PUBLIC_DISCLAIMER_PH,
    forecast_quality_hint_ph: enrichQualityHint(
      series.length,
      fit.r_squared,
      'node_ols_fallback'
    ),
    history: series,
    forecast_next: {
      step_index: stepNext,
      label: `Susunod na tinataya (hakbang ${stepNext})`,
      predicted_total_expenses: predicted,
      ci95_low: Math.max(0, Math.round((point - ciHalf) / 10) * 10),
      ci95_high: Math.max(0, Math.round((point + ciHalf) / 10) * 10),
      r_squared: Math.round(fit.r_squared * 1000) / 1000,
      residual_rmse: Math.round(fit.sigma * 100) / 100,
    },
    augmented_with_samples: augmented,
    training_n: series.length,
  };
}

function buildPythonResponse(series, augmented, py) {
  const stepNext = series.length + 1;
  const r2 = Number(py.r_squared) || 0;
  return {
    ok: true,
    ml_engine: 'python_sklearn',
    model: py.model_name,
    method_description_ph: py.method_description_ph,
    disclaimer_ph: PUBLIC_DISCLAIMER_PH,
    forecast_quality_hint_ph: enrichQualityHint(series.length, r2, 'python_sklearn'),
    history: series,
    forecast_next: {
      step_index: stepNext,
      label: `Susunod na tinataya (hakbang ${stepNext})`,
      predicted_total_expenses: Number(py.predicted_total_expenses),
      ci95_low: Number(py.ci95_low),
      ci95_high: Number(py.ci95_high),
      r_squared: r2,
      residual_rmse: Number(py.residual_rmse),
    },
    augmented_with_samples: augmented,
    training_n: series.length,
    ml_trees_ci: Boolean(py.trees_ci_used),
  };
}

/**
 * Predicts total_expenses one step ahead — async (Python ML or OLS fallback).
 */
async function forecastFutureTotalExpenses(farmerId, dbRows) {
  const { series, augmented, user_upload_count: userUploadCount } = buildTrainingSeries(
    farmerId,
    dbRows
  );

  if (series.length < MIN_TRAIN_ROWS) {
    const extra =
      bundledSamplesGloballyDisabled() || !hasBundledExpenseSampleFiles(farmerId)
        ? ' Magtala ng hindi bababa sa 3 beses ng kabuuang gastos, mag-upload ng pundasyong datos (JSON/CSV) sa tab na Hula ng gastos, o (dev) ilagay ang JSON sa backend/data/expense_training_samples/<numerong farmer_id>/ at i-restart ang server para auto-seed.'
        : '';
    return {
      ok: false,
      error: `Kulang ang datos sa paghula. Kailangan ng hindi bababa sa 3 puntos ng kabuuang gastos (database, naka-upload na pundasyon, at/o awtomatikong panel kung may sample folder para sa farmer_id na ito).${extra}`,
      disclaimer_ph: PUBLIC_DISCLAIMER_PH,
      history: series,
      augmented_with_samples: augmented,
      user_upload_count: userUploadCount,
    };
  }

  const y = series.map((s) => s.total_expenses);
  const py = await fetchExpenseForecastFromMlService(y);

  if (py && py.ok) {
    return { ...buildPythonResponse(series, augmented, py), user_upload_count: userUploadCount };
  }

  return { ...buildOlsResponse(series, augmented), user_upload_count: userUploadCount };
}

module.exports = {
  forecastFutureTotalExpenses,
  forecastNextSeasonExpenses: forecastFutureTotalExpenses,
  loadBundledExpenseSamples,
  buildTrainingSeries,
  loadUserUploadedFoundation,
  getUserUploadedFoundationSummary,
  saveUserUploadedFoundation,
  clearUserUploadedFoundation,
  MAX_UPLOAD_POINTS,
  MAX_FOUNDATION_FILE_BYTES,
};
