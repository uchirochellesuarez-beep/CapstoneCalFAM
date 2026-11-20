# Audit: Predicted Expenses per Hectare (PHP/ha)

**Date:** 2026-11-20  
**Scope:** Read-only. No code, model, dataset, MySQL, or deploy changes.

---

## Verdict

The pretrained Linear Regression model predicts **total agricultural expenses (PHP)** (`target_total_expenses_php`), not PHP/ha.  
`prev_expenses_per_ha` is an **input feature** only.

**Safe approach (no retrain):** keep the model and 21-feature path unchanged; after inference, compute:

`predicted_expenses_per_hectare = predicted_total_expenses / forecast_area_hectares`

using the **latest history semester’s** `area_hectares` (already used as the model’s `area_hectares` feature). Expose PHP/ha as an **additive** API field and make it primary in the UI.

---

## Answers to inspection questions

### 1. Where farm area is stored (saved Farm Income)

- Column / form field: `area_hectares` on `farmer_income_records` and in `FarmerIncomePage.vue` form (`form.area_hectares`).
- Shown in history/detail as hectares.

### 2. Where hectares come from Excel

- Template column: `Farm_Area_Hectares` ([`predictiveExcelTemplate.js`](../../backend/services/predictiveExcelTemplate.js)).
- Parser maps to `area_hectares` on each semester row ([`predictiveExcelParser.js`](../../backend/services/predictiveExcelParser.js)).

### 3. Do both sources consistently provide valid areas?

**At prediction time, yes — enforced.**  
[`pretrainedLrFeatureBuilder.js`](../../backend/services/pretrainedLrFeatureBuilder.js) rejects any history row with missing / non-finite / `≤ 0` area (`MISSING_FARM_AREA`). Excel instructions require area `> 0`. Farm Income form collects area when saving.

### 4. Can historical records have different farm areas?

**Yes.** Each semester row has its own `area_hectares`. The feature builder does **not** average areas; it takes the **latest history period only** as `area_hectares` / for `prev_expenses_per_ha`.

### 5. Which area should represent the upcoming forecast period?

**Recommended:** carry forward the **latest history semester’s** `area_hectares` (`prev` after chronological sort).

Rationale:
- Matches current feature construction (`feature_vector.area_hectares = prev.area_hectares`).
- No new user input or model input.
- Document as assumption: “forecast assumes same farm size as the most recent history semester.”

Do **not** invent a new area without UI/API input.

### 6. Does the model predict total or per hectare?

| Item | Role |
|------|------|
| Training target | `target_total_expenses_php` (**total PHP**) |
| JSON artifact `target` | `target_total_expenses_php` |
| Local/Python output | `predicted_total_expenses` (total; clip ≥ 0; round to ₱10) |
| `prev_expenses_per_ha` | **Feature only** (prev total / prev area) |

### 7. Where to divide by farm area

**Recommended layer:** [`pretrainedLrForecastService.js`](../../backend/services/pretrainedLrForecastService.js) inside `buildSuccessResponse` (after Python or Node returns total).

Why:
- One place for both `python_pretrained_lr` and `node_pretrained_lr`.
- Leaves [`pretrainedLrLocalPredict.js`](../../backend/services/pretrainedLrLocalPredict.js) as pure total-expense inference (parity with joblib unchanged).
- Feature builder can expose `forecast_area_hectares: prev.area_hectares` alongside the feature vector (already known).

Formula (after total is finalized):

```
predicted_expenses_per_hectare = predicted_total_expenses / forecast_area_hectares
```

Rounding suggestion: round per-ha to nearest ₱1 or ₱10 for display consistency; keep raw optional if needed.

### 8. Expose PHP/ha without breaking API consumers

**Additive fields only** (keep existing keys):

```json
{
  "predicted_total_expenses": 46270,
  "forecast_area_hectares": 1.5,
  "predicted_expenses_per_hectare": 30846.67,
  "forecast_next": {
    "predicted_total_expenses": 46270,
    "predicted_expenses_per_hectare": 30846.67,
    "forecast_area_hectares": 1.5
  }
}
```

Old clients that only read `predicted_total_expenses` keep working.

### 9. Display primary PHP/ha, secondary total

| Surface | Change (future implementation) |
|---------|--------------------------------|
| [`FarmerIncomePage.vue`](../../farmer-registration/src/views/FarmerIncomePage.vue) summary grid | Primary: PHP/ha label + value; secondary: total PHP |
| [`FarmerIncomeHubPage.vue`](../../farmer-registration/src/views/FarmerIncomeHubPage.vue) foundation cards | Same hierarchy |
| i18n | New keys e.g. `predictedExpensesPerHa`, keep total label |

No model change.

### 10. Missing / zero / negative / inconsistent hectares

| Case | Current behavior | Recommended for PHP/ha |
|------|------------------|-------------------------|
| Missing / ≤ 0 on any history row | Feature build fails `MISSING_FARM_AREA` | Keep — no prediction |
| Negative area | Rejected | Keep |
| Different areas across history | Allowed; latest used for features | Use latest for divisor; optional limitation string if areas differ |
| Predicted total 0, area > 0 | Valid | per-ha = 0 |
| Area inconsistent Excel vs Farm Income same semester | Existing conflict rules | Unchanged |

Never divide by zero in the success path if feature builder already required `area > 0`; still guard in service.

---

## Minimal implementation plan (awaiting approval)

1. **Feature builder** — return `forecast_area_hectares` (= latest history `area_hectares`); optional `area_varies_across_history` limitation.  
2. **Forecast service** — after successful LR predict, set `predicted_expenses_per_hectare` and nest under `forecast_next`; keep `predicted_total_expenses`.  
3. **Tests** — assert per-ha = total / area; guard zero area; both Node and Python success paths; Excel + saved-record.  
4. **Frontend** — primary PHP/ha, secondary total; i18n EN/TL.  
5. **Do not** retrain, change 21 features, change joblib/JSON coefs, or change MySQL.

**Out of scope for minimal path:** predicting PHP/ha inside the LR target; changing Excel schema; requiring manual “next period hectares” input.

---

## Stop

Audit complete. **Wait for approval** before implementing backend/frontend changes.
