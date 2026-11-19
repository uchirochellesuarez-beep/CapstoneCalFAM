# Backend Pretrained LR Route — Implementation Note

**Date:** 2026-11-19  
**Scope:** Backend only (frontend unchanged)

## New route

`POST /api/farmer-income/expense-forecast-pretrained-lr/:farmerId`

Auth: same as legacy forecast — JWT + `assertOwnFarmerId` (own records only).

### Request body

```json
{
  "forecast_period": "2026-H1",
  "record_periods": {
    "101": "2025-H1",
    "102": "2025-H2"
  },
  "model_run_id": "20261119_211021"
}
```

`forecast_period` and per-record agricultural periods are **required**.  
`created_at` is **not** used as the crop/expense period.

### Response (success)

Includes `model: pretrained_linear_regression`, `forecast_period`, `predicted_total_expenses`, simulated-data disclaimer, 21-feature vector, `legacy_fallback_used: false`.

### Legacy

`GET /api/farmer-income/expense-forecast/:farmerId` unchanged (Ridge/RF/OLS path).

## Tests

`npm run test:pretrained-lr` in `backend/` — 16 passed.
