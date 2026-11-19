# Frontend Pretrained LR Integration

**Date:** 2026-11-19  
**Scope:** `FarmerIncomePage` Predictive Analytics tab only

## API

`POST /api/farmer-income/expense-forecast-pretrained-lr/:farmerId`

Body built client-side after farmer selects semesters:

```json
{
  "forecast_period": "2026-H1",
  "record_periods": { "12": "2025-H1", "15": "2025-H2" },
  "model_run_id": "20261119_211021"
}
```

Legacy `GET /expense-forecast/:farmerId` is no longer called from this tab.

## Tests

`node src/utils/pretrainedLrPeriods.test.mjs` — all checks passed.

## Manual checks

1. Open Farm Income → Predictive Analytics with ≥1 Eligible record.  
2. Assign unique H1/H2 values; choose a later forecast semester.  
3. Run Forecast — expect PHP prediction + Linear Regression disclaimer.  
4. Duplicate semester / empty selection / forecast not after history — client errors.  
5. With ML down — `ML_SERVICE_UNAVAILABLE` message, no legacy prediction.
