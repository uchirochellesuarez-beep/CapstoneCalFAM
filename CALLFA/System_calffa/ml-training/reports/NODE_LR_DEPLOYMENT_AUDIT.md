# Node.js Pretrained LR Deployment Audit

**Date:** 2026-11-20  
**Scope:** Read-only feasibility of exporting `run_20261119_211021` Linear Regression for in-process Node inference on Dokploy/Hostinger.  
**Status:** AUDIT ONLY — no code, artifact, env, DB, or deploy changes were made.

---

## Verdict

**Yes — direct Node.js inference is safe and feasible** for this artifact, provided the export preserves **ColumnTransformer output feature order** (scaled continuous first, then passthrough binaries), not only the raw `feature_columns` list order.

The saved pipeline contains only deterministic, arithmetic transforms that Node can reproduce exactly. A manual reconstruction of `StandardScaler → concatenate passthrough → dot(coef)+intercept` matched `Pipeline.predict` with **absolute difference `0.0`** on a representative feature vector.

Python `ml-service` should remain available for local/dev; production can use the JSON artifact inside the Node backend so Dokploy/Hostinger no longer depends on `ML_API_URL`.

---

## 1. Pipeline inspection (`expense_model.joblib`)

| Item | Value |
|------|--------|
| Path | `ml-training/runs/run_20261119_211021/expense_model.joblib` |
| Top-level keys | `estimator`, `feature_columns`, `model_type`, `run_id`, `seed`, `target`, `clip_nonnegative`, `performance_label`, `input_source` |
| `model_type` | `linear_regression` |
| `run_id` | `20261119_211021` |
| Pipeline steps | `prep` → `model` |
| `prep` | `ColumnTransformer` (`remainder=drop`) |
| `num` | `StandardScaler` on **13** continuous features |
| `pass` | Identity passthrough (serialized as `FunctionTransformer` with `func=None`) on **8** binary/indicator features |
| `model` | `sklearn.linear_model.LinearRegression` (`fit_intercept=True`, `positive=False`) |
| `coef_.shape` | `(21,)` |
| `clip_nonnegative` | `True` |

**Unsupported for Node?** None found (no PCA, no one-hot encoder at inference, no tree ensembles, no custom callables beyond identity).

**Critical ordering note:** Input `feature_columns` order ≠ transformed vector order used by `coef_`.

- **Input order** (`feature_columns` / Node `FEATURE_ORDER`): 21 names as built by `pretrainedLrFeatureBuilder.js`.
- **Transformed order** (what `coef_` multiplies): `CONTINUOUS_FEATURES` (scaled) **then** passthrough binaries — as produced by `ColumnTransformer.get_feature_names_out()`.

Any Node export that applies `coef_[i]` to `feature_columns[i]` **without reordering** will be wrong.

---

## 2. Exact parameters (from live joblib load)

### 2.1 Input feature names / order (`feature_columns`)

```
area_hectares
prev_total_expenses
prev_prev_total_expenses
prev_expenses_per_ha
prev_fertilizer_cost
prev_pesticide_cost
prev_labor_related_cost
prev_transport_cost
prev_fuel_cost
planting_method_sabog
planting_method_talok
irrigation_NIA
irrigation_bugsok_waterpump
irrigation_waterpump_irrigation
irrigation_waterpump_ilog
period_index
is_h1
n_hist_periods
roll3_mean_total
delta_prev
has_lag2
```

Matches `backend/services/pretrainedLrFeatureBuilder.js` `FEATURE_ORDER` (21).

### 2.2 Scaled continuous columns + StandardScaler

Order (transformed positions 0–12):

| Feature | mean_ | scale_ |
|---------|------:|-------:|
| area_hectares | 1.2722 | 0.6024202519836132 |
| prev_total_expenses | 52449.77142857143 | 28401.62764107087 |
| prev_prev_total_expenses | 52079.56428571429 | 28172.196504383213 |
| prev_expenses_per_ha | 41133.87395681403 | 9313.476749074447 |
| prev_fertilizer_cost | 12178.357142857143 | 6639.716152572691 |
| prev_pesticide_cost | 5882.257142857143 | 3432.0092893885035 |
| prev_labor_related_cost | 27199.235714285714 | 15135.742538824503 |
| prev_transport_cost | 3777.942857142857 | 2504.682026501079 |
| prev_fuel_cost | 3411.9785714285713 | 2203.2314934719257 |
| period_index | 5.0 | 2.0 |
| n_hist_periods | 4.0 | 2.0 |
| roll3_mean_total | 52195.911904761895 | 27958.899841996266 |
| delta_prev | 370.20714285714286 | 6844.265328409125 |

Scaler formula: `(x - mean) / scale` (sklearn default; `with_mean=True`, `with_std=True`).

### 2.3 Passthrough columns (transformed positions 13–20)

```
planting_method_sabog
planting_method_talok
irrigation_NIA
irrigation_bugsok_waterpump
irrigation_waterpump_irrigation
irrigation_waterpump_ilog
is_h1
has_lag2
```

No scaling.

### 2.4 LinearRegression

- **intercept_:** `49196.92244180871`
- **coef_** (aligned to **transformed** order above):

```
4027.418013941857
5237.506162822792
5319.429224174876
1136.1077571598553
3196.8038589960465
2472.4323091674046
7421.020181581293
1802.689742400792
1000.6227208648469
24.69575703560382
24.695757035603137
-1791.5224221193387
-161.6397870659061
10.758983394969134
-10.758983394970356
-53.872769555873354
371.6123688643799
-296.9519124583372
-20.78768685016965
6129.257670427236
672.4677653472847
```

### 2.5 Post-processing (must match `ml-service/pretrained_lr.py`)

1. Raw linear prediction.  
2. If `clip_nonnegative` and raw `< 0` → `0`.  
3. Display value: `max(0, round(value / 10) * 10)` (nearest ₱10).

Parity smoke check (same vector; abs raw diff vs `pipe.predict` = **0.0**):

- Example raw ≈ `46272.73382913413` → rounded display **`46270`**.

---

## 3. Export design (no retrain)

Export script (future, not run in this audit) should `joblib.load` the existing artifact and write versioned JSON, e.g.:

`backend/ml-artifacts/pretrained_lr_20261119_211021.json`

Suggested schema:

```json
{
  "schema_version": 1,
  "run_id": "20261119_211021",
  "model_type": "linear_regression",
  "model_name": "pretrained_linear_regression",
  "target": "target_total_expenses_php",
  "clip_nonnegative": true,
  "round_to_nearest": 10,
  "performance_label": "SYNTHETIC DATA PERFORMANCE",
  "trained_on_simulated_data": true,
  "input_feature_order": ["...21 names..."],
  "scaled_feature_order": ["...13 names..."],
  "passthrough_feature_order": ["...8 names..."],
  "scaler": { "mean": [...], "scale": [...] },
  "intercept": 49196.92244180871,
  "coefficients": ["...21 floats in TRANSFORMED order..."],
  "source_artifact": "ml-training/runs/run_20261119_211021/expense_model.joblib"
}
```

Validation on load: lengths 21/13/8; all finite; `scale[i] != 0`; `run_id` present; `schema_version` supported.

---

## 4. Node inference design

Reuse existing builders unchanged:

- `pretrainedLrFeatureBuilder.js` → 21-feature vector  
- `pretrainedLrForecastService.js` → Excel / saved / combined foundation orchestration  

Replace only the **remote ML call** step with local predict:

```
for each name in scaled_feature_order:
  z_i = (feature_vector[name] - mean_i) / scale_i
concat passthrough raw values in passthrough_feature_order
raw = intercept + sum(z_and_pass[i] * coefficients[i])
apply clip + round-to-10
```

Return the same response shape the service currently expects (`model_name`, `predicted_total_expenses`, `model_run_id`, disclaimers, etc.) so routes/UI stay stable.

---

## 5. Parity tests (proposed)

Compare Python `predict_pretrained_lr` / `pipe.predict` vs Node JSON predictor on identical vectors:

| Case | Intent |
|------|--------|
| Representative farm vector (area 1.5, expenses 85060, sabog, NIA, period_index for 2027-H1) | Happy path; expect raw match ~1e-9, display 46270 |
| All zeros | Negative raw (~-8295) → clip → rounded 0 |
| Extreme prev_total_expenses (1e9) | Finite huge prediction; no NaN |
| Missing feature / extra key | Reject with same error semantics as Python validator |
| Wrong run_id in request (if kept) | Reject or ignore per chosen contract |
| Binary one-hots only | Passthrough path correctness |
| float32/float64 edge | Confirm JSON doubles suffice |

Fixture file: store input `feature_vector` + expected `predicted_total_expenses_raw` + rounded display from Python once, then assert Node matches.

---

## 6. Smallest backend / deploy changes

Current production failure mode:

- Dokploy hosts frontend (Dockerfile → nginx) + Node backend.  
- There is **no** Python `ml-service` app.  
- `pretrainedLrForecastService` calls `fetchPretrainedLrFromMlService` → needs `ML_API_URL` → fails with `ML_SERVICE_UNAVAILABLE`.

Minimal path to remove Python **runtime** dependency for pretrained LR only:

1. Commit exported JSON under `backend/ml-artifacts/`.  
2. Add `pretrainedLrLocalPredict.js`.  
3. In `runPretrainedLrPrediction`, call local predict when `ML_API_URL` is empty **or** remote fails (prefer local-first for Dokploy).  
4. Do **not** remove `ml-service/` or local uvicorn workflow.  
5. No MySQL changes, no retrain, no dataset edits, no mandatory env change (unset `ML_API_URL` on Hostinger is fine).

Frontend Dockerfile remains unrelated. Backend Nixpacks/Node deploy only needs the JSON file in the build context.

---

## 7. Preserve as-is

| Component | Keep |
|-----------|------|
| 21-feature builder | Yes |
| Excel upload / save / conflict rules | Yes |
| Combined Farm Income + Excel foundation | Yes |
| Auth / `assertOwnFarmerId` / president barangay forecasts gate | Yes |
| Simulated-data disclaimer EN/PH | Yes |
| Python `ml-service` codebase | Yes (optional runtime) |

---

## 8. Versioning, validation, risks

| Risk | Mitigation |
|------|------------|
| Coef order mismatch vs input feature order | Export **transformed** order explicitly; unit-test against `pipe.predict` |
| Float drift | Use float64 JSON; assert raw abs error &lt; 1e-6; display already rounds to ₱10 |
| Stale JSON after retrain | Filename + `run_id`; refuse load if schema/run mismatch |
| Missing artifact on Dokploy | Fail closed with clear error (better than silent wrong model) |
| Dual paths (Python vs Node) diverge | Parity CI fixture; local-first in prod |
| Security | JSON has no secrets; still treat as trusted build artifact |
| Legacy OLS / Ridge routes | Unchanged; out of pretrained-LR path |

---

## Conclusion

**Direct Node.js inference is APPROVED as feasible and safe** for artifact `20261119_211021`, contingent on a correct JSON export of scaler parameters and coefficients in **ColumnTransformer output order**, plus parity tests against Python.

**Stop here — await approval before exporting artifacts or implementing Node predictor.**
