# Node LR Live Integration Report

**Date:** 2026-11-20  
**Status:** Backend integration complete and tested. **Not deployed.** Awaiting approval before Dokploy/Hostinger deploy.

---

## 1. Exact files modified

| File | Change |
|------|--------|
| `backend/services/pretrainedLrForecastService.js` | Engine selection: Python preferred → Node JSON fallback; metadata `inference_engine` |
| `backend/services/mlExpenseClient.js` | Added `isMlApiConfigured` / `getMlApiBaseUrl` |
| `backend/services/pretrainedLrLocalPredict.js` | `inference_engine` id → `node_pretrained_lr` |
| `backend/tests/pretrainedLrForecastService.test.js` | Expanded engine-selection + source-path tests |

**Unchanged:** frontend, routes wiring contracts, ML training, datasets, joblib, MySQL, env files, deploy configs.  
Routes already call `forecastWithPretrainedLr*` / combined foundation — no route edits required.

---

## 2. Prediction engine selection logic

```
build 21 features (unchanged)
    │
    ├─ ML_API_URL configured?
    │     ├─ Yes → POST Python /forecast/expenses/pretrained-lr
    │     │         ├─ ok + model_name=pretrained_linear_regression
    │     │         │     → inference_engine: python_pretrained_lr
    │     │         ├─ unexpected model (Ridge/RF/etc.)
    │     │         │     → error UNEXPECTED_MODEL (no Node swap)
    │     │         └─ unreachable / null / transport fail
    │     │               → try Node JSON
    │     └─ No → Node JSON directly
    │
    └─ Node predictPretrainedLrLocalSafe (run_id 20261119_211021)
          ├─ ok → inference_engine: node_pretrained_lr
          └─ fail → PRETRAINED_LR_UNAVAILABLE / local error_code
                    (never Ridge / RandomForest / OLS)
```

Same `model_run_id` (`20261119_211021`) for both engines.

---

## 3. Saved-record prediction

`forecastWithPretrainedLrFromSavedRecords` / combined foundation path → same `runPretrainedLrPrediction`.  
Works with Python or Node; `persisted: false` on forecast response; features from Eligible MySQL rows + optional Excel merge (existing).

---

## 4. Excel prediction

`forecastWithPretrainedLrFromExcelRows` → same resolver.  
Forecast response still `persisted: false` from the prediction service layer (upload/save remains the separate Excel route behavior).

---

## 5. Focused test results

```bash
npm run test:pretrained-lr        # 44 passed
npm run test:pretrained-lr-local  # 13 passed
```

Covered: Python available, ML_API_URL missing, Python unreachable + Node success, both unavailable, model run ID, 21-feature payload, saved-record, Excel (no persist flag), no legacy OLS/Ridge client, auth route contracts, JSON artifact present on disk.

---

## 6. Remaining deployment requirements

1. Push backend including `backend/ml-artifacts/pretrained_lr_20261119_211021.json`.  
2. Redeploy **Node backend only** on Dokploy/Hostinger (no Python app required).  
3. `ML_API_URL` may stay unset in production → Node path.  
4. Optional: keep `ML_API_URL` locally for Python-first parity.  
5. Smoke-test Predictive Analytics after deploy.

No new env vars. No deploy config changes required beyond shipping the JSON file with the backend.

---

## 7. Known limitations

- Simulated-training disclaimer still applies (not real-world validated).  
- Explicit Python validation rejections (non-transport) are returned as-is without trying Node.  
- Wrong Python model name is rejected (no silent Node substitution for that case).  
- Extrapolation beyond synthetic training range still possible (`period_extrapolation` flag).  
- Frontend does not yet display `inference_engine` (optional later).

---

## Stop

Implementation and testing done. **Wait for approval before deployment.**
