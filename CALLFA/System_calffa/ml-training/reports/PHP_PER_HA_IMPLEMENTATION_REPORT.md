# PHP/ha Primary Prediction — Implementation Report

**Date:** 2026-11-20  
**Reference:** `PHP_PER_HA_PREDICTION_AUDIT.md`  
**Status:** Implemented and tested. Not deployed.

---

## Files modified

| File | Change |
|------|--------|
| `backend/services/pretrainedLrFeatureBuilder.js` | Expose `forecast_area_hectares` (latest history); optional area-varies limitation |
| `backend/services/pretrainedLrForecastService.js` | Post-inference `predicted_expenses_per_hectare`; `derivePerHectareExpenses` |
| `backend/tests/pretrainedLrFeatureBuilder.test.js` | Latest-area / varying-area tests |
| `backend/tests/pretrainedLrForecastService.test.js` | PHP/ha calculation, saved, Excel, Node, zero-area |
| `farmer-registration/src/views/FarmerIncomePage.vue` | Primary PHP/ha, secondary total, farm area, semester |
| `farmer-registration/src/i18n/locales/en.json` | New/updated labels |
| `farmer-registration/src/i18n/locales/tl.json` | New/updated labels |

**Unchanged:** model/joblib/JSON coefs, 21 features, MySQL, Excel schema, env, deploy, `pretrainedLrLocalPredict` core math.

---

## Calculation

```
forecast_area_hectares = latest chronological history semester area_hectares
predicted_total_expenses = pretrained LR output (unchanged)
predicted_expenses_per_hectare = round(total / area, 2)
```

Applied in `buildSuccessResponse` for both `python_pretrained_lr` and `node_pretrained_lr`.

---

## Example API response (success)

```json
{
  "ok": true,
  "model_name": "pretrained_linear_regression",
  "model_run_id": "20261119_211021",
  "inference_engine": "node_pretrained_lr",
  "trained_on_simulated_data": true,
  "forecast_period": "2027-H1",
  "latest_history_period": "2026-H2",
  "forecast_area_hectares": 1.5,
  "predicted_expenses_per_hectare": 30846.67,
  "predicted_total_expenses": 46270,
  "forecast_next": {
    "label": "2027-H1",
    "predicted_expenses_per_hectare": 30846.67,
    "predicted_total_expenses": 46270,
    "forecast_area_hectares": 1.5
  },
  "disclaimer_en": "...simulated...",
  "legacy_fallback_used": false
}
```

---

## Frontend changes

Predictive Analytics result grid (`FarmerIncomePage.vue`):

1. **Primary:** Predicted Agricultural Expenses per Hectare — `₱… / ha`  
2. **Secondary:** Predicted Total Agricultural Expenses — `₱…`  
3. Forecast Farm Area (ha)  
4. Forecast Semester  
5. Existing disclaimer box unchanged  

No new hectare inputs or semester dropdowns.

---

## Test results

```
npm run test:pretrained-lr        → 51 passed
npm run test:pretrained-lr-local  → 13 passed
```

---

## Remaining limitations

- PHP/ha is derived, not a direct LR target.
- Forecast area assumes same size as **latest** history semester.
- President Forecast Foundation cards still show total-first (only farmer Predictive page updated per request).
- Simulated-data disclaimer still applies.

---

## Stop

Implementation and testing complete. Await approval before deployment.
