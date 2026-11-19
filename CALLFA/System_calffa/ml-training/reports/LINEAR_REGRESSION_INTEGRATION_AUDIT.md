# Linear Regression Integration Audit — CalFAM Predictive Analytics

**Date:** 2026-11-19  
**Status:** Read-only audit — **no code, data, env, or model changes**  
**Awaiting:** Explicit approval before implementation  

**Canonical pretrained artifact:**  
`ml-training/runs/run_20261119_211021/expense_model.joblib`  
(also mirrored at `ml-training/models/expense_model.joblib`)

---

## 1. Existing architecture

### 1.1 End-to-end flow (current live system)

```
FarmerIncomePage.vue (Predictive Analytics tab)
  → GET /api/farmer-income/expense-forecast/:farmerId
  → farmer-income.js loads Eligible rows from MySQL farmer_income_records
  → expenseForecastService.forecastFutureTotalExpenses()
       builds a 1D total_expenses series
       (Eligible DB + optional upload foundation + optional bundled samples)
  → mlExpenseClient → POST {ML_API_URL}/forecast/expenses
       body: { total_expenses: number[] }
  → ml-service/main.py → forecaster.forecast_next_total_expenses()
       ONLINE fit: Ridge (short series) or RandomForest (longer)
  → if ML unavailable: Node OLS univariate trend fallback
  → JSON returned to frontend (predicted_total_expenses, CI, model name, history)
```

### 1.2 Frontend

| Item | Location |
|------|----------|
| Tab | `farmer-registration/src/views/FarmerIncomePage.vue` |
| Trigger | `fetchExpenseForecast()` → `/api/farmer-income/expense-forecast/${farmerId}` |
| Display | `forecastResult.forecast_next.predicted_total_expenses`, CI, R², `model`, `ml_engine` |

Frontend already shows whatever `model` / `ml_engine` the backend returns. **No frontend change is strictly required** for a first integration if the response shape is preserved and fields are labeled honestly.

### 1.3 Backend

| Item | Location |
|------|----------|
| Route | `backend/routes/farmer-income.js` — `GET /expense-forecast/:farmerId` |
| Query | `SELECT * FROM farmer_income_records WHERE farmer_id = ? AND status = 'Eligible'` |
| Forecast | `backend/services/expenseForecastService.js` — `forecastFutureTotalExpenses` |
| ML client | `backend/services/mlExpenseClient.js` — posts **totals only** |
| Config | `ML_API_URL` (example default `http://127.0.0.1:5001`), `ML_API_TIMEOUT_MS` |

**Critical:** The route loads full income rows (area, planting, irrigation, cost columns), but `seriesFromDatabaseRecords()` **discards** everything except `total_expenses` (+ timestamps). Upload foundation JSON is also **totals-only**.

### 1.4 ML service (current)

| Item | Location |
|------|----------|
| API | `ml-service/main.py` — `POST /forecast/expenses` |
| Logic | `ml-service/forecaster.py` — per-request Ridge / RandomForest on lag features of the 1D series |
| Pretrained LR | **Not loaded** |

### 1.5 Pretrained Linear Regression (offline)

| Item | Detail |
|------|--------|
| Type | `sklearn.pipeline.Pipeline`: `prep` (ColumnTransformer) + `LinearRegression` |
| Preprocessing included? | **Yes** — `StandardScaler` on 13 continuous features; passthrough on 8 binary flags |
| Target | `target_total_expenses_php` (PHP for the **next** six-month period) |
| Retrain on request? | No (and must not) |
| Performance label | `SYNTHETIC DATA PERFORMANCE` |

---

## 2. Required feature mapping

### 2.1 Exact feature order (21) — must match training

1. `area_hectares`  
2. `prev_total_expenses`  
3. `prev_prev_total_expenses`  
4. `prev_expenses_per_ha`  
5. `prev_fertilizer_cost`  
6. `prev_pesticide_cost`  
7. `prev_labor_related_cost`  
8. `prev_transport_cost`  
9. `prev_fuel_cost`  
10. `planting_method_sabog`  
11. `planting_method_talok`  
12. `irrigation_NIA`  
13. `irrigation_bugsok_waterpump`  
14. `irrigation_waterpump_irrigation`  
15. `irrigation_waterpump_ilog`  
16. `period_index` (target period ordinal)  
17. `is_h1` (target period)  
18. `n_hist_periods`  
19. `roll3_mean_total`  
20. `delta_prev`  
21. `has_lag2`  

Continuous features scaled inside the saved pipeline:  
`area_hectares`, all `prev_*` monetary / PHP-per-ha, `period_index`, `n_hist_periods`, `roll3_mean_total`, `delta_prev`.

### 2.2 Live CalFAM → training feature derivation

| Training feature | Live source | Mapping notes |
|------------------|-------------|-----------------|
| `area_hectares` | `farmer_income_records.area_hectares` | From **previous** Eligible period (same rule as training) |
| `prev_total_expenses` | `total_expenses` | Last Eligible record |
| `prev_prev_total_expenses` | prior `total_expenses` | If only 1 history row: impute = prev; `has_lag2=0`; `delta_prev=0` |
| `prev_expenses_per_ha` | derived | `prev_total / area` |
| `prev_fertilizer_cost` | `total_fertilizer_cost` | Present on form/DB |
| `prev_pesticide_cost` | `total_pesticide_cost` | Present on form/DB |
| `prev_labor_related_cost` | **derived** | `land_preparation + planting + spraying + harvester + drying + other_expenses` |
| `prev_transport_cost` | **derived** | `hauling_cost + tarasko_cost` |
| `prev_fuel_cost` | `fuel_cost` | Present |
| planting one-hots | `planting_method` | Expect `sabog` / `talok` |
| irrigation one-hots | `irrigation_type` | Expect NIA / bugsok_waterpump / waterpump_irrigation / waterpump_ilog |
| `period_index`, `is_h1` | **must be assigned** for the **forecast target** semester | Not stored as training-style ordinals today |
| `n_hist_periods`, `roll3_mean_total` | derived from chronological Eligible history | Same formulas as `prepare_features.py` |

### 2.3 Do **not** use live `total_labor_cost` as `prev_labor_related_cost`

Live UI `totalLaborCost` includes hauling + tarasko + fuel + ops.  
Training `labor_related_cost` **excludes** transport and fuel (to avoid double-counting with `transport_cost` / `fuel_cost`).

Using `total_labor_cost` unchanged would **break feature semantics**.

---

## 3. Compatibility issues

| Issue | Severity | Detail |
|-------|----------|--------|
| Feature contract mismatch | **Blocking** | Live ML API accepts only `total_expenses[]`; pretrained LR needs 21 structured features |
| Algorithm mismatch | **Blocking** for “LR-only” goal | Live path fits Ridge/RF online; OLS fallback is not pretrained LR |
| Period calendar | **High** | Training `period_index` is half-year ordinal from 2021-H1; live sorts by `created_at` / upload indices |
| Upload foundation | **High** | Totals-only JSON cannot populate category / planting / irrigation features |
| Domain shift | **High** | Model trained on **simulated** panel; not validated on real CalFAM farmers |
| Labor field semantics | **High** | Live total labor ≠ training labor_related |
| Sparse history | **Medium** | Training allows 1 prior period (`has_lag2=0`); live ML path currently requires ≥3 totals for Ridge/RF |
| Silent fallback risk | **Policy** | Must not return Node OLS / Ridge / RF while labeling as pretrained Linear Regression |
| CI / R² meaning | **Medium** | Offline LR artifact does not store per-farmer online R²; frontend currently shows train-fit style metrics from online models |

### Answers to Phase 4 questions

1. **Is the simulated dataset compatible with real farmer records?**  
   **Structurally partial.** Category names largely align with Farm Income fields, but values are synthetic; period encoding and labor split need explicit mapping. **Not** automatically distribution-compatible.

2. **Can the model predict the next six-month period?**  
   **Yes, by design** — target is next-period `total_expenses` PHP — **if** the caller supplies correct next `period_index` and `is_h1` and a valid previous-period feature vector.

3. **Additional feature mapping required?**  
   **Yes** — labor/transport derivation, one-hots, period ordinalization, lag/roll features. Cannot send raw 1D totals into the joblib pipeline.

4. **Depends on unavailable live information?**  
   **Conditionally.** Full Eligible Farm Income rows contain enough monetary/categorical fields. **Unavailable** from upload-only foundation or totals-only series: category breakdowns, planting, irrigation, reliable H1/H2 labels.

5. **Validation required before integration?**  
   - Golden-vector check: rebuild one synthetic supervised row → predict matches training reload.  
   - Mapping unit tests for labor/transport split.  
   - Period assignment tests (calendar date → H1/H2 + ordinal).  
   - Insufficient-data status codes (0 rows, incompatible upload-only, unknown planting/irrigation enums).  
   - Manual smoke on ≥1 real farmer with ≥1 Eligible record.  
   - Clear synthetic-model disclaimer in API/UI.  
   - Confirm no silent OLS/Ridge labeling as pretrained LR.

---

## 4. Exact files requiring changes (when approved)

| File | Change type |
|------|-------------|
| `ml-service/main.py` | New endpoint (or versioned route) for pretrained LR; keep old route until cutover |
| `ml-service/` new module e.g. `pretrained_lr.py` | Load joblib once at startup; validate features; predict; clip ≥ 0 |
| `ml-service/forecaster.py` | **Do not** use for final LR path; leave in place until deprecated |
| `backend/services/mlExpenseClient.js` | Send structured feature payload / new URL path |
| `backend/services/expenseForecastService.js` | Build features from Eligible rows; call pretrained endpoint; clear failure statuses; **no** OLS disguised as LR |
| `backend/routes/farmer-income.js` | Possibly pass richer records / fertilizers already via `SELECT *` (mostly service-side) |
| `farmer-registration/.../FarmerIncomePage.vue` | Optional: show `ml_engine: pretrained_linear_regression`, synthetic disclaimer, clearer insufficient-data messages |
| Env (later) | e.g. `ML_PRETRAINED_MODEL_PATH`, feature-flag `EXPENSE_FORECAST_ENGINE=pretrained_lr` — **not changed in this audit** |

**Do not modify** training scripts, datasets, MySQL schema, or delete Ridge/RF/OLS code in the first implementation (keep as emergency/legacy behind a flag if needed, but never mislabel).

---

## 5. Recommended API request/response structure

### 5.1 New ML service endpoint (proposed)

`POST /forecast/expenses/pretrained-lr`

**Request (backend-built features; ML service does not invent missing values):**

```json
{
  "farmer_id": 123,
  "feature_vector": {
    "area_hectares": 1.2,
    "prev_total_expenses": 45000,
    "prev_prev_total_expenses": 42000,
    "prev_expenses_per_ha": 37500,
    "prev_fertilizer_cost": 9000,
    "prev_pesticide_cost": 4000,
    "prev_labor_related_cost": 20000,
    "prev_transport_cost": 3000,
    "prev_fuel_cost": 2500,
    "planting_method_sabog": 1,
    "planting_method_talok": 0,
    "irrigation_NIA": 1,
    "irrigation_bugsok_waterpump": 0,
    "irrigation_waterpump_irrigation": 0,
    "irrigation_waterpump_ilog": 0,
    "period_index": 12,
    "is_h1": 0,
    "n_hist_periods": 3,
    "roll3_mean_total": 43000,
    "delta_prev": 3000,
    "has_lag2": 1
  },
  "model_run_id": "20261119_211021"
}
```

**Success response:**

```json
{
  "ok": true,
  "model_name": "pretrained_linear_regression",
  "model_run_id": "20261119_211021",
  "ml_engine": "pretrained_linear_regression",
  "predicted_total_expenses": 44100,
  "clip_nonnegative_applied": true,
  "performance_label": "SYNTHETIC DATA PERFORMANCE",
  "method_description_ph": "Pretrained Linear Regression (synthetic training). Gabay lamang — hindi guaranteed real-world accuracy."
}
```

Confidence intervals: either omit, or return a **separately labeled** heuristic band (must not imply online R² from this artifact). Prefer `r_squared: null` unless a validated offline residual method is documented.

**Failure response (examples):**

```json
{
  "ok": false,
  "error_code": "INSUFFICIENT_HISTORY",
  "error": "Kailangan ng hindi bababa sa 1 Eligible Farm Income record na kumpleto ang required fields."
}
```

Other `error_code` values: `INCOMPATIBLE_FEATURES`, `UNKNOWN_PLANTING_METHOD`, `UNKNOWN_IRRIGATION_TYPE`, `MODEL_NOT_LOADED`, `FEATURE_ORDER_MISMATCH`.

### 5.2 Backend → frontend (preserve existing envelope)

Keep `ok`, `forecast_next.predicted_total_expenses`, `disclaimer_ph`, `history`, and set:

- `ml_engine`: `"pretrained_linear_regression"`  
- `model`: `"pretrained_linear_regression"`  
- On failure: `ok: false` with clear `error` / `error_code` — **do not** call Node OLS and claim LR success.

Optional temporary flag: if pretrained path fails eligibility, return explicit `ok: false` rather than auto-fallback; legacy Ridge/OLS only if a separate explicit legacy mode is enabled later.

---

## 6. Minimal implementation plan (post-approval)

1. **Add** `pretrained_lr` loader in `ml-service` (startup load of run `20261119_211021` joblib; reuse embedded `StandardScaler`).  
2. **Add** `POST /forecast/expenses/pretrained-lr` that accepts a complete feature vector only.  
3. **Extend** `expenseForecastService` to:  
   - sort Eligible records chronologically;  
   - require ≥1 complete Eligible row;  
   - derive labor/transport correctly;  
   - map planting/irrigation;  
   - assign next-period `period_index` / `is_h1`;  
   - build feature vector identical to `prepare_features.py`;  
   - call new endpoint;  
   - return labeled synthetic disclaimer.  
4. **Update** `mlExpenseClient` for the new path.  
5. **Feature-flag** cutover; keep old endpoint unused for production farmers until tests pass.  
6. **Optional UI** copy updates for engine name + insufficient-data codes.  
7. **Do not** retrain, recalibrate dataset, or remove old forecaster until signed off.

### Intended prediction flow (target)

```
Actual Farmer Expense History (Eligible Farm Income rows)
→ Validate required fields / enums / ≥1 prior period
→ Apply identical feature construction (+ embedded pipeline scaling)
→ Load pretrained Linear Regression (no fit on request)
→ Predict next-period total expenses (clip ≥ 0)
→ Return prediction to CalFAM with honest labels
```

---

## 7. Testing requirements

| Test | Purpose |
|------|---------|
| Artifact reload parity | Synthetic row prediction matches training reload tolerance |
| Feature-order guard | Reject wrong keys/order |
| Labor/transport unit tests | Live columns → training semantics |
| Period assignment | Known dates → expected `period_index` / `is_h1` |
| Insufficient history | 0 Eligible → clear error |
| Upload-only farmer | Totals foundation without category fields → `INCOMPATIBLE_FEATURES` |
| Unknown enums | Bad planting/irrigation → clear error |
| No mislabel fallback | With flag on, OLS/Ridge must not appear as pretrained LR |
| Smoke | One real farmer with Eligible history returns finite PHP prediction |
| Regression | Old `/forecast/expenses` still works if left enabled for legacy |

---

## 8. Risks and limitations

- Synthetic-trained coefficients may systematically mis-scale real expenses.  
- `period_index` extrapolation beyond training range (1–11) is unsupported without retrain.  
- Farmers with irregular save timing may not map cleanly to H1/H2.  
- Barangay-president upload foundations remain incompatible with this model until category-complete history exists.  
- Online R² currently shown in UI is **not** a property of the saved LR for a single farmer.  
- Integration improves **process alignment** with the chosen algorithm; it does **not** by itself prove real-world accuracy.

---

## 9. Audit conclusion

| Question | Answer |
|----------|--------|
| Is pretrained LR integrated today? | **No** |
| Can it be integrated safely with small changes? | **Yes**, with a new structured ML endpoint + backend feature builder |
| Biggest blockers | 1D totals API; labor field mismatch; period encoding; synthetic domain shift; upload-only data |
| Ready to implement without approval? | **No** — wait for explicit approval |

**Stop.** Awaiting approval before any implementation.
