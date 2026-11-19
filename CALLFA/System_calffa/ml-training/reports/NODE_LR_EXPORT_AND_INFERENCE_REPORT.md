# Node LR Export & Standalone Inference Report

**Date:** 2026-11-20  
**Reference audit:** `ml-training/reports/NODE_LR_DEPLOYMENT_AUDIT.md`  
**Status:** Export + standalone Node module + parity tests complete. **Live routes NOT switched.**

---

## 1. Files created or modified

### Created
| Path | Purpose |
|------|---------|
| `ml-training/export_pretrained_lr_json.py` | Export joblib → versioned JSON + parity fixtures (no retrain) |
| `backend/ml-artifacts/pretrained_lr_20261119_211021.json` | Node inference artifact |
| `backend/ml-artifacts/pretrained_lr_parity_fixtures.json` | Python-generated expected predictions for parity tests |
| `backend/services/pretrainedLrLocalPredict.js` | Standalone Node JSON inference module |
| `backend/tests/pretrainedLrLocalPredict.test.js` | Parity + validation tests |
| `ml-training/reports/NODE_LR_EXPORT_AND_INFERENCE_REPORT.md` | This report |

### Modified
| Path | Change |
|------|--------|
| `backend/package.json` | Added script `test:pretrained-lr-local` only |

### Not modified (as required)
- `FarmerIncomePage.vue`, forecast API routes, Excel/saved flows  
- MySQL, joblib artifacts, `ml-service`, env, deploy configs  
- Training datasets  

---

## 2. JSON artifact location

```
backend/ml-artifacts/pretrained_lr_20261119_211021.json
```

Source joblib (unchanged):

```
ml-training/runs/run_20261119_211021/expense_model.joblib
```

Regenerate (optional):

```bash
cd ml-training
python export_pretrained_lr_json.py
```

---

## 3. Exported feature order

### Input order (`input_feature_order`, 21) — request / feature builder
Same as `pretrainedLrFeatureBuilder.js` `FEATURE_ORDER`.

### Transformed order (`transformed_feature_order`, 21) — **coef alignment**
1. **Scaled (13):**  
   `area_hectares`, `prev_total_expenses`, `prev_prev_total_expenses`, `prev_expenses_per_ha`, `prev_fertilizer_cost`, `prev_pesticide_cost`, `prev_labor_related_cost`, `prev_transport_cost`, `prev_fuel_cost`, `period_index`, `n_hist_periods`, `roll3_mean_total`, `delta_prev`
2. **Passthrough (8):**  
   `planting_method_sabog`, `planting_method_talok`, `irrigation_NIA`, `irrigation_bugsok_waterpump`, `irrigation_waterpump_irrigation`, `irrigation_waterpump_ilog`, `is_h1`, `has_lag2`

`coefficients` are stored in **transformed** order (not raw input order).

Post-process: `clip_nonnegative` → round to nearest PHP **10**.

---

## 4. Node.js inference module

`backend/services/pretrainedLrLocalPredict.js`

- `loadArtifact` / `validateArtifact`
- `predictPretrainedLrLocal(featureVector, options)`
- `predictPretrainedLrLocalSafe(...)` → `{ ok:false, error_code }` on validation errors
- Returns `model_run_id`, `trained_on_simulated_data`, EN/PH disclaimers, `inference_engine: 'node_json'`

**Not wired** into `pretrainedLrForecastService.js` or any route yet.

---

## 5. Python / Node parity test results

Command:

```bash
cd backend
npm run test:pretrained-lr-local
```

Result: **13 passed / 13 total**

Covered:
1. Standard realistic vector  
2. Second realistic (talok + lag2)  
3. Zero expense categories  
4. All zeros (clipping)  
5. Boundary large values  
6. Missing / extra / non-finite features  
7. Transformed vs input order contract  
8. Clip + PHP 10 rounding  
9. `run_id` / `model_run_id` consistency  

Raw tolerance: `1e-6`. Rounded PHP: exact equality.

---

## 6. Remaining deployment integration steps (awaiting approval)

1. Call `predictPretrainedLrLocal` from `runPretrainedLrPrediction` when `ML_API_URL` is empty or remote unreachable (or local-first).  
2. Keep Python `ml-service` for local/dev parity.  
3. Ensure `backend/ml-artifacts/*.json` is included in Dokploy/Hostinger backend deploy.  
4. Smoke-test Predictive Analytics without `ML_API_URL`.  
5. Do **not** remove joblib or `ml-service` until optional.

---

## 7. Compatibility issues

| Issue | Status |
|-------|--------|
| Coef vs input feature order mismatch | Handled — export uses transformed order |
| Float drift | Within 1e-6 on fixtures |
| NaN in JSON fixtures | Encoded as `null` + `null_means_nan` for invalid case |
| Live route still requires Python | Intentional — not switched |

---

## Stop

Export, standalone Node inference, and focused parity testing are done.  
**Wait for approval before connecting Node inference to live forecast routes.**
