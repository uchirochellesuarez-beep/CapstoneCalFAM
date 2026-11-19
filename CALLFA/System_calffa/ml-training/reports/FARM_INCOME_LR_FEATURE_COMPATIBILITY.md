# Farm Income ↔ Linear Regression Feature Compatibility

**Date:** 2026-11-19  
**Status:** Read-only audit — **no code, UI, DB, model, or dataset changes**  
**Decision:** **B** — Features are constructible with **internal calculations/mapping only**; **no new form fields**  

**References:**
- `farmer-registration/src/views/FarmerIncomePage.vue`
- `backend/routes/farmer-income.js`
- `ml-training/prepare_features.py`
- `ml-service/pretrained_lr.py`
- `ml-training/reports/LINEAR_REGRESSION_INTEGRATION_AUDIT.md`

---

## 1. Existing form → database field mapping

### 1.1 Table: `farmer_income_records`

| Form / UI concept | Code / payload field | DB column | Notes |
|-------------------|----------------------|-----------|-------|
| Farm Area (Hectares) | `area_hectares` | `area_hectares` | Required |
| Planting Method | `planting_method` | `planting_method` | Values: `sabog`, `talok` |
| Irrigation | `irrigation_type` | `irrigation_type` | Values: `NIA`, `bugsok_waterpump`, `waterpump_irrigation`, `waterpump_ilog` |
| Land Preparation Cost | `land_preparation_cost` | `land_preparation_cost` | |
| Uprooting / Transplanting / Sowing | `planting_cost` | `planting_cost` | |
| Spraying / Broadcasting… | `spraying_cost` | `spraying_cost` | |
| Harvester Fee | `harvester_cost` | `harvester_cost` | |
| Drying Fee | `drying_cost` | `drying_cost` | |
| Hauling Fee | `hauling_cost` | `hauling_cost` | |
| Tarasko | `tarasko_cost` | `tarasko_cost` | |
| Fuel | `fuel_cost` | `fuel_cost` | |
| Other Expenses | `other_expenses` | `other_expenses` | |
| Total Fertilizer Cost | `total_fertilizer_cost` | `total_fertilizer_cost` | Sum of fertilizer lines |
| Total Pesticide Cost | `total_pesticide_cost` | `total_pesticide_cost` | Sum of pesticide lines |
| Total Labor (UI box) | `total_labor_cost` | `total_labor_cost` | **Includes** hauling + tarasko + fuel + ops + other |
| Total Expenses | `total_expenses` | `total_expenses` | `fertilizer + pesticide + total_labor_cost` |
| Status | (set server-side) | `status` | `Pending` \| `Eligible` \| `Rejected` |
| Saved timestamp | — | `created_at` | Shown on history cards; **no** `period_index` / `period_label` / `is_h1` columns |

### 1.2 Child tables (line items; not required as separate ML features)

| Table | Columns |
|-------|---------|
| `farmer_income_fertilizers` | `fertilizer_type`, `sacks`, `price_per_sack`, `line_total` |
| `farmer_income_pesticides` | `pesticide_type`, `quantity`, `price_per_unit`, `line_total` |

ML uses rolled-up `total_fertilizer_cost` / `total_pesticide_cost` only.

### 1.3 Live total composition (avoid double-counting)

From `FarmerIncomePage.vue`:

```
total_labor_cost =
  land_preparation_cost + planting_cost + spraying_cost + harvester_cost + drying_cost
  + hauling_cost + tarasko_cost + fuel_cost + other_expenses

total_expenses = total_fertilizer_cost + total_pesticide_cost + total_labor_cost
```

Training identity (synthetic panel / `prepare_features.py` comments):

```
labor_related_cost = land_prep + planting + spraying + harvester + drying + other
transport_cost     = hauling + tarasko
fuel_cost          = fuel
total_expenses     = fertilizer + pesticide + labor_related + transport + fuel
```

**Therefore:** do **not** map `total_labor_cost` → `prev_labor_related_cost`.  
Derive:

| Training field | Live calculation |
|----------------|------------------|
| `labor_related_cost` | `land_preparation_cost + planting_cost + spraying_cost + harvester_cost + drying_cost + other_expenses` |
| `transport_cost` | `hauling_cost + tarasko_cost` |
| `fuel_cost` | `fuel_cost` |

---

## 2. Complete 21-feature compatibility table

Feature order matches the joblib / `prepare_features.FEATURE_COLUMNS` / `pretrained_lr` artifact.

| # | Feature | Exact source or calculation from Farm Income data | Available? | Meaning matches training? | Needs history? | Compatibility notes |
|---|---------|---------------------------------------------------|------------|---------------------------|----------------|---------------------|
| 1 | `area_hectares` | Previous Eligible record: `area_hectares` | **Yes** | Yes | ≥1 record | From **previous** period only (training rule) |
| 2 | `prev_total_expenses` | Previous: `total_expenses` | **Yes** | Yes | ≥1 | Eligible only |
| 3 | `prev_prev_total_expenses` | Record before previous: `total_expenses`; if only 1 history row → equal to prev and `has_lag2=0` | **Yes** | Yes (same imputation rule) | ≥1 (≥2 for true lag2) | Do not invent a fake second season |
| 4 | `prev_expenses_per_ha` | `prev_total_expenses / area_hectares` | **Yes** | Yes | ≥1 | Guard `area_hectares > 0` |
| 5 | `prev_fertilizer_cost` | Previous: `total_fertilizer_cost` | **Yes** | Yes | ≥1 | |
| 6 | `prev_pesticide_cost` | Previous: `total_pesticide_cost` | **Yes** | Yes | ≥1 | |
| 7 | `prev_labor_related_cost` | Previous: sum of `land_preparation_cost + planting_cost + spraying_cost + harvester_cost + drying_cost + other_expenses` | **Yes** (derived) | Yes **if derived**; **No** if using `total_labor_cost` | ≥1 | Critical mapping |
| 8 | `prev_transport_cost` | Previous: `hauling_cost + tarasko_cost` | **Yes** (derived) | Yes | ≥1 | Not a single DB column |
| 9 | `prev_fuel_cost` | Previous: `fuel_cost` | **Yes** | Yes | ≥1 | |
| 10 | `planting_method_sabog` | Previous: `planting_method == "sabog"` → 1/0 | **Yes** | Yes | ≥1 | Form enums match training |
| 11 | `planting_method_talok` | Previous: `planting_method == "talok"` → 1/0 | **Yes** | Yes | ≥1 | |
| 12 | `irrigation_NIA` | Previous: `irrigation_type == "NIA"` | **Yes** | Yes | ≥1 | |
| 13 | `irrigation_bugsok_waterpump` | Previous: `irrigation_type == "bugsok_waterpump"` | **Yes** | Yes | ≥1 | |
| 14 | `irrigation_waterpump_irrigation` | Previous: `irrigation_type == "waterpump_irrigation"` | **Yes** | Yes | ≥1 | |
| 15 | `irrigation_waterpump_ilog` | Previous: `irrigation_type == "waterpump_ilog"` | **Yes** | Yes | ≥1 | |
| 16 | `period_index` | **Target** semester ordinal (not a saved column) | **Derived** | Partial | Calendar rule | Must map target H1/H2 → ordinal; no DB field |
| 17 | `is_h1` | **Target** semester: Jan–Jun → 1 else 0 | **Derived** | Yes if calendar H1/H2 rule used | Calendar rule | Not stored on records |
| 18 | `n_hist_periods` | Count of history units before target | **Yes** (derived) | Yes if history unit defined | ≥1 | Depends on period-bucketing policy |
| 19 | `roll3_mean_total` | Mean of last ≤3 history `total_expenses` | **Yes** | Yes | ≥1 | |
| 20 | `delta_prev` | `prev_total - prev_prev_total` (0 if `has_lag2=0`) | **Yes** | Yes | ≥1 | |
| 21 | `has_lag2` | 1 if ≥2 history units else 0 | **Yes** | Yes | ≥1 | |

### Summary counts

| Status | Features |
|--------|----------|
| Direct column or simple one-hot | 12 |
| Safe internal derivation (labor/transport/lags/rolls) | 7 |
| Calendar mapping (no new form field) | 2 (`period_index`, `is_h1`) |
| Missing form fields required | **0** |

---

## 3. Historical record requirements

| Question | Finding |
|----------|---------|
| Minimum history for pretrained LR (training rules) | **≥1** complete prior Eligible record (`has_lag2` may be 0) |
| Preferred history | **≥2** Eligible period-units for meaningful `delta_prev` / lag2 |
| Reliable six-month period ID on row? | **No** dedicated column; only `created_at` (+ optional edit timestamp behavior) |
| Multiple records same period? | **Possible** — farmers can save more than one form; no uniqueness constraint by H1/H2 |
| What does one record represent? | One **complete Farm Income submission** (season-style cost bundle), not a single ledger transaction |
| Next forecast period identifiable? | **Yes, by policy:** e.g. next calendar H1/H2 after the last history unit’s `created_at` semester |
| Area / planting / irrigation for required periods? | **Yes** on each saved record |
| Forecast data filter today | Live forecast uses `status = 'Eligible'` only |
| Upload foundation JSON | Totals-only — **insufficient** for these 21 features without Eligible form rows |
| Can real farmers satisfy inputs? | **Yes**, if they have ≥1 Eligible saved Farm Income record with the existing fields filled |

### Period encoding caveat

Training `period_index` is an ordinal from **2021-H1 = 1** through **2026-H1 = 11**.  
A live target in late 2026+ may map to **≥12**, which is **outside the training support** of that coefficient. Feature is still constructible; predictions may extrapolate. Document and optionally clamp/warn — do **not** invent fake historical periods to pad the series.

### Recommended history unit (mapping only)

1. Filter `status = 'Eligible'`.  
2. Assign each row a calendar semester from `created_at` (`YYYY-H1` / `YYYY-H2`).  
3. If multiple rows share a semester, **aggregate or pick a deterministic rule** (e.g. latest `created_at` only) — must be explicit in backend integration.  
4. Sort semester units chronologically; build lags from that panel.  
5. Set target `period_index` / `is_h1` for the **next** semester after the last unit.

No new UI fields required for this policy.

---

## 4. Missing or incompatible features

### Not missing as form fields

All monetary and categorical inputs used by the 21 features exist on `farmer_income_records` (or are derived from them).

### Soft incompatibilities (mapping / policy — not new fields)

| Issue | Risk | Mitigation (later implementation) |
|-------|------|-----------------------------------|
| No stored `period_index` / `is_h1` | Target calendar features must be derived | Documented semester rules from `created_at` |
| Multiple saves per semester | Inflated `n_hist_periods` / distorted lags | Bucket + aggregate/latest policy |
| `total_labor_cost` ≠ `labor_related_cost` | Double-count if mis-mapped | Derive labor/transport/fuel as above |
| `period_index` beyond training range | Extrapolation | Warn / optional clamp; do not fabricate past periods |
| Pending/Rejected rows | Incomplete approval | Keep Eligible-only (current forecast policy) |
| Totals-only upload foundation | Cannot build category features | Return clear `INCOMPATIBLE_FEATURES` unless Eligible form history exists |
| Synthetic vs real levels | Domain shift | Keep synthetic disclaimer; not a form gap |

---

## 5. Recommended solution

### **B**

Some features require **internal calculations or mapping adjustments**, but **no new form fields** and **no UI changes** are needed.

**Not A:** Because `period_index` / `is_h1` are not literal saved columns, labor/transport must be derived, and multi-record semesters need a bucketing rule — “all 21 directly available as-is” would overstate readiness.

**Not C:** Existing records are **not** fundamentally incompatible. Retraining is unnecessary for field coverage; the pretrained endpoint can consume a correctly built vector from current Farm Income data.

---

## 6. Exact files that would require changes (later approval)

| File | Role |
|------|------|
| `backend/services/expenseForecastService.js` | Build 21-feature vector from Eligible rows; call pretrained LR; clear errors |
| `backend/services/mlExpenseClient.js` | POST to `/forecast/expenses/pretrained-lr` |
| `backend/routes/farmer-income.js` | Minor wiring if needed (already `SELECT *`) |
| `ml-service/*` | **Already has** pretrained endpoint — no change required for this compatibility finding |
| Frontend | **None required** for feature construction (optional disclaimer text later) |
| Form / MySQL schema | **None** |

Optional later (only if product chooses C-style retrain): `prepare_features.py` / retrain — **not recommended** solely for field availability.

---

## 7. Safe next implementation step

1. Approve backend feature-builder that:  
   - uses **Eligible** `farmer_income_records` only;  
   - derives `labor_related` / `transport` correctly;  
   - one-hots planting/irrigation from saved enums;  
   - maps `created_at` → semester units;  
   - sets next-period `period_index` / `is_h1`;  
   - rejects upload-only / empty history without fabricating values.  
2. Call existing `POST /forecast/expenses/pretrained-lr`.  
3. Label responses as pretrained LR + synthetic training disclaimer.  
4. Do **not** fall back to Ridge/OLS while claiming pretrained LR.  
5. Smoke-test with a farmer who has ≥1 Eligible complete record.

**Stop.** Awaiting approval before backend/frontend integration.
