# Linear Regression — Per-Hectare (PHP/ha) Evaluation

**Date:** 2026-11-20  
**Run ID:** `20261120_203925`  
**Mode:** Additive evaluation only (no retrain).

---

## 1. Evaluation objective

Evaluate the **existing** pretrained Linear Regression model on the original
chronological held-out synthetic **test** split, after converting total-PHP
actuals and predictions to **PHP per hectare (PHP/ha)**.

The product UI displays PHP/ha as the primary forecast quantity. This report
adds matching evaluation metrics and graphs without changing the trained target
(`target_total_expenses_php`).

## 2. Existing model and dataset used

| Item | Path / value |
|------|--------------|
| Model artifact | `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/runs/run_20261120_203925/expense_model.joblib` |
| Joblib SHA-256 (before) | `d39ac3cf84229986aeebcdbe74b28fe479c4c1f9c3a058a8e397ea8a3f77f8a8` |
| Joblib SHA-256 (after) | `d39ac3cf84229986aeebcdbe74b28fe479c4c1f9c3a058a8e397ea8a3f77f8a8` |
| Training Excel | `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/data/CalFAM_ML_Training_Dataset.xlsx` |
| Sheet | `Training_Data` |
| Features | 21 (`FEATURE_COLUMNS`); includes `area_hectares` |
| Training target | `target_total_expenses_php` (total PHP) |
| Test split rule | `split == 'test'` → target period `2026-H1` |

## 3. Test observation count

**n = 50** synthetic test rows (one per farmer for `2026-H1`).

Area (`area_hectares`) on test rows: min=0.54, max=2.89, mean=1.2292. All areas finite and > 0.

## 4. Per-hectare calculation

For each test observation *i* with its own `area_hectares` (a_i):

```text
actual_php_per_ha_i     = actual_total_expenses_php_i / a_i
predicted_php_per_ha_i  = predicted_total_expenses_php_i / a_i
```

**Prediction / postprocessing convention (matches `train_models.py`):**

1. Load the saved Pipeline from the joblib (`estimator`).
2. `raw_pred = pipe.predict(X_test)`.
3. `predicted_total_expenses_php = max(raw_pred, 0)` (non-negative clip).
4. Divide **row-wise** by that row’s `area_hectares` (same feature column used
   in training / feature vector). No global area; no cross-farmer summing.

On this synthetic panel, area is constant within each farmer across periods,
so the supervised `area_hectares` equals the target-period farm area.

## 5. PHP/ha metrics (calculated)

| Metric | Value | Unit |
|--------|------:|------|
| MAE | 3544.075968 | PHP/ha |
| RMSE | 5111.665861 | PHP/ha |
| WAPE | 0.074834 | fraction |
| WAPE | 7.4834 | % |
| R² (optional) | 0.792400 | — |
| n | 50 | observations |

## 6. Optional R² (PHP/ha)

R² on PHP/ha test pairs = **0.792400**.
Reported separately from total-PHP R²; not interchangeable.

## 7. Comparison with existing total-PHP metrics

Units must not be mixed. Recomputed total-PHP metrics on the **same**
clipped predictions for side-by-side comparison:

| Metric | Total PHP (same test set) | PHP/ha (derived) |
|--------|--------------------------:|-----------------:|
| MAE | 4640.1016 PHP | 3544.0760 PHP/ha |
| RMSE | 7752.5138 PHP | 5111.6659 PHP/ha |
| WAPE | 7.9437 % | 7.4834 % |
| R² | 0.9309 | 0.7924 |
| n | 50 | 50 |

Official training-report total-PHP test figures for this run
(`evaluation_metrics.json`) were MAE≈4640.10, RMSE≈7752.51, R²≈0.9309,
WAPE≈0.0794 — consistent with the recomputed total-PHP column above.

## 8. Paths to newly generated graphs

- **05_actual_vs_predicted_per_ha.png**
  - `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/reports/graphs/05_actual_vs_predicted_per_ha.png`
  - `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/runs/run_20261120_203925/graphs/05_actual_vs_predicted_per_ha.png`
- **06_prediction_error_distribution_per_ha.png**
  - `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/reports/graphs/06_prediction_error_distribution_per_ha.png`
  - `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/runs/run_20261120_203925/graphs/06_prediction_error_distribution_per_ha.png`
- **07_residual_scatter_per_ha.png**
  - `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/reports/graphs/07_residual_scatter_per_ha.png`
  - `C:/xampp/htdocs/CALFAM/CALLFA/System_calffa/ml-training/runs/run_20261120_203925/graphs/07_residual_scatter_per_ha.png`

Original total-PHP graphs `01`–`04` were **not** overwritten.

## 9. Observed prediction errors and limitations

- Errors are in **PHP/ha** (`predicted_php_per_ha − actual_php_per_ha`).
- Absolute total-PHP errors still tend to be larger for larger farms;
  PHP/ha normalizes by area but does not remove all size-related structure.
- Synthetic area range on this panel is approximately 0.54–2.89 ha; live farms outside this range are extrapolation.
- Within-farmer area changes over time are not present in this synthetic panel; runtime forecasting uses latest-history area as the divisor.
- This evaluation does **not** change the model target; PHP/ha is derived.

## 10. Synthetic-data disclaimer

**ALL PHP/ha METRICS AND GRAPHS BELOW / ABOVE ARE SYNTHETIC TEST DATA
PERFORMANCE ONLY.** They do **not** establish real-world forecasting
accuracy on CalFAM / CALFFA farmers.

---

## Validation checklist

| Check | Result |
|-------|--------|
| Joblib unchanged | PASS |
| Graphs 01–04 hashes unchanged | PASS |
| Same test label `2026-H1` | PASS |
| Per-row area divisor | PASS |
| Retrain performed | NO |

Protected graph SHA-256 (reports/graphs):

- `01_actual_vs_predicted.png`: `e5078553d24b0cd30f51501d4c4dbdca657868747511a9d773db95d73b6bef72`
- `02_prediction_error_distribution.png`: `b577e39ffd168cb8e76814cf3ef1bb27cbea8d73846e25b734ad38207b318989`
- `03_residual_scatter.png`: `399ddaf8fc6830822ffc60430b96992de7f4a92eca7a633517658da80e6a6063`
- `04_linear_feature_contributions.png`: `739bf15f805a4514356f204fe4545dd090b80edc121a90459ede9e47ba01b117`

