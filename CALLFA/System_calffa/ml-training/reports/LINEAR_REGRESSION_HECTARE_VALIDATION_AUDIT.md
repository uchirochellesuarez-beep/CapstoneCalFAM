# Linear Regression × Farm Area / PHP/ha — Validation Audit

**Date:** 2026-11-20  
**Scope:** Read-only technical audit of existing CalFAM Linear Regression training, evaluation graphs, and PHP/ha derivation.  
**Run inspected:** `20261120_203925`  
**Primary sources:** `train_models.py`, `prepare_features.py`, `data/CalFAM_ML_Training_Dataset.xlsx`, run artifacts under `runs/run_20261120_203925/`, `pretrainedLrFeatureBuilder.js`, `pretrainedLrForecastService.js`, prior PHP/ha reports.

**Restrictions observed:** No training code, dataset, model, graph, backend/frontend, MySQL, or deploy changes. Only this report was created. Optional PHP/ha metrics below were computed in-memory from the existing joblib + Excel test split for audit evidence; no files were overwritten.

---

## 1. Overall verdict

**PARTIALLY CORRECT**

| Layer | Verdict |
|-------|---------|
| Training math with mixed farm sizes | **Confirmed correct** |
| Target = total PHP; `area_hectares` as feature | **Confirmed correct** |
| Observation independence (no cross-farmer summing) | **Confirmed correct** |
| Existing evaluation graphs (total PHP) | **Confirmed correct** for total-expense evaluation |
| Runtime PHP/ha = predicted total ÷ forecast area | **Confirmed correct** (post-inference; no retrain) |
| Evaluation coverage for a PHP/ha-primary UI | **Incomplete** — total-PHP metrics/graphs only; PHP/ha MAE/RMSE/WAPE not part of the training report |
| Real-world hectare extrapolation / varying area over time | **Potential issue** (synthetic panel has constant area per farmer; trained area range is narrow) |

**Retraining is not required** to fix hectare methodology or to enable PHP/ha display math. Retraining would only be needed for new data, a different target (e.g. train directly on PHP/ha), or expanded area coverage.

---

## 2. Answers to audit questions

### Q1. Does the training dataset contain farmers with different farm areas?

**Confirmed correct — yes.**

Evidence (Excel / CSV panel for run `20261120_203925`):

| Source | n | `area_hectares` min | max | unique values |
|--------|---|---------------------|-----|---------------|
| `synthetic_farmers.csv` | 50 | 0.54 | 2.89 | 42 |
| Supervised `Training_Data` | 500 | 0.54 | 2.89 | (same farmer areas repeated across periods) |

Within each farmer, area is **constant across all periods** (0 farmers with >1 distinct area). Across farmers, areas differ.

---

### Q2. Does each training observation retain its own farm area and total agricultural expenses?

**Confirmed correct — yes.**

`prepare_features.py` builds one supervised row per `(synth_farmer_id, target_period)` with:

- `area_hectares` ← previous period’s area  
- `target_total_expenses_php` ← **that target period’s** `total_expenses`

Verified on Excel `Training_Data`: 500 rows; zero duplicates on `(synth_farmer_id, target_period_label)`; target column matches the expense panel’s period total with 0 mismatches.

---

### Q3. Are expenses from different farmers incorrectly added together, or is each observation evaluated independently?

**Confirmed correct — each observation is independent.**

- Supervised construction: `groupby("synth_farmer_id")` then per-period rows (`prepare_features.py`).  
- Training: `X_train = train[FEATURE_COLUMNS]`, `y_train = train[TARGET_COL]` row-wise (`train_models.py`).  
- Metrics: MAE/RMSE/R²/WAPE over per-row `y_true` vs `y_pred` — **no** aggregation of expenses across farmers before scoring.  
- Graphs: one scatter/hist point per test row.

No code path sums multiple farmers’ expenses into a single training target.

---

### Q4. Is `area_hectares` correctly included as a model feature?

**Confirmed correct — yes.**

- Listed in `FEATURE_COLUMNS` (21 features) in `prepare_features.py`.  
- Included in `CONTINUOUS_FEATURES` and standardized via `StandardScaler` in `train_models.py`.  
- Present in run `feature_schema.json` `feature_order[0]`.  
- Runtime feature builder sets `feature_vector.area_hectares = prev.area_hectares` (`pretrainedLrFeatureBuilder.js`).  
- Fitted coefficient for the first transformed continuous feature (`area_hectares`) is non-zero (~3623.64 on standardized scale) in the loaded joblib.

---

### Q5. Does the model predict total agricultural expenses rather than expenses per hectare?

**Confirmed correct — predicts total PHP.**

| Artifact | Value |
|----------|--------|
| `TARGET_COL` | `target_total_expenses_php` |
| `feature_schema.json` `target_unit` | `PHP` |
| Inference notes | `predicted target_total_expenses_php (PHP)` |
| Node/Python outputs | `predicted_total_expenses` |
| `prev_expenses_per_ha` | **input feature only** (prev total ÷ prev area) |

---

### Q6. Are Existing Actual vs Predicted, Error Distribution, and Residual Scatter graphs based on total PHP?

**Confirmed correct — yes (total PHP).**

From `train_models.py` graph code and saved PNG axis labels:

| Graph | Axes / units |
|-------|----------------|
| `01_actual_vs_predicted.png` | Actual vs Predicted **total expenses (PHP)** |
| `02_prediction_error_distribution.png` | Error in **PHP** |
| `03_residual_scatter.png` | Predicted total PHP vs residual **PHP** |
| `04_linear_feature_contributions.png` | \|coef\| after scaling (not a PHP/ha plot) |

Titles explicitly say SYNTHETIC / Linear Regression test. Points are **not** colored or faceted by farm area.

---

### Q7. Is it mathematically valid to train one Linear Regression model using farmers with different farm sizes?

**Confirmed correct — yes**, under this design:

1. Each row is one farmer–period.  
2. Farm size enters as `area_hectares` (and indirectly via `prev_expenses_per_ha` and lag totals that scale with farm size).  
3. Target is total cost for that row’s period.  
4. OLS then estimates a single linear mapping from features → total PHP.

This is standard pooled cross-section / panel-style supervised learning. Different hectares are **not** a methodological error by themselves.

**Potential issue (interpretation, not invalidity):** absolute total-PHP errors tend to be larger for larger farms (see §4). That does not invalidate pooling; it means total-PHP MAE is size-sensitive.

---

### Q8. Is dividing predicted total expenses by the corresponding forecast farm area mathematically correct for PHP/ha?

**Confirmed correct — yes**, as a **derived** quantity:

```
predicted_expenses_per_hectare = predicted_total_expenses / forecast_area_hectares
```

Implemented in `pretrainedLrForecastService.js` → `derivePerHectareExpenses` after inference (Python or Node). Divisor is `forecast_area_hectares` = latest history semester area (same value used as model feature `area_hectares`). Guards reject non-finite or `≤ 0` area.

This does **not** change the trained model. It is the correct conversion when the model’s object is total PHP and the display unit is PHP/ha for the assumed forecast area.

---

### Q9. Can we evaluate per-hectare accuracy using existing test predictions without retraining?

**Confirmed correct — yes.**

For each test row with area \(a_i > 0\):

\[
y_i^{\mathrm{ha}} = y_i / a_i,\quad \hat{y}_i^{\mathrm{ha}} = \hat{y}_i / a_i
\]

then compute MAE/RMSE/WAPE/R² on \(\{y^{\mathrm{ha}}, \hat{y}^{\mathrm{ha}}\}\).

Audit computation on the existing joblib + Excel test split (`n=50`, period `2026-H1`) — **not** written into training reports:

| Metric | Total PHP (official) | PHP/ha (derived, audit-only) |
|--------|----------------------|------------------------------|
| MAE | 4640.10 | 3544.08 |
| RMSE | 7752.51 | 5111.67 |
| WAPE | 0.0794 | 0.0748 |
| R² | 0.9309 | 0.7924 |

So PHP/ha evaluation is possible **without** retrain; it is simply not currently exported by `train_models.py`.

---

### Q10. For each test observation, can actual and predicted PHP/ha use that observation’s farm area?

**Confirmed correct — yes** (with the training definition of area).

On this synthetic Excel panel:

- Feature `area_hectares` equals the **target period’s** `area_hectares` for all 500 rows (0 mismatches), because area is constant per farmer.  
- Therefore \(y/a\) and \(\hat{y}/a\) using the supervised `area_hectares` column is consistent for offline evaluation.

**Potential issue at runtime:** if a real farmer’s area changes across semesters, features use **latest history** area; the “true” future area may differ. The feature builder already emits a limitation string when history areas vary. The synthetic training set never exercises within-farmer area change (0 such farmers).

---

### Q11. Problem scan

| Topic | Status | Evidence / notes |
|-------|--------|------------------|
| Incorrect hectare mapping | **Not found in synthetic panel** | Expense row area matches farmer profile; feature area matches target-period area (constant-area design). Runtime uses latest history area intentionally. |
| Data leakage | **Confirmed correct (no leakage found)** | Features from `hist = g.iloc[:i]` only; target expenses not used as features; `synth_farmer_id` excluded from model matrix (`feature_schema.json` leakage_rules). |
| Chronological splitting | **Confirmed correct** | Split by **target** `period_label`: train ≤2024-H2, val 2025-H1/H2, test 2026-H1. Sizes scale with n_farmers (350/100/50). |
| Target construction | **Confirmed correct** | `target_total_expenses_php = target period total_expenses`. |
| Feature scaling | **Confirmed correct** | Continuous features (incl. area) via `StandardScaler` fit on train only inside the Pipeline; binaries passthrough. |
| Outliers | **Potential issue** | High total-expense points exist (target max ~179k PHP). Graphs show wider scatter at high totals; one large-farm point dominates absolute error. Not a mapping bug. |
| Farm-area extrapolation | **Potential issue** | Trained area range **0.54–2.89 ha**. Real farms outside this range (or sudden area jumps) are extrapolation. Period extrapolation beyond 2026-H1 already flagged in feature builder. |
| Evaluation bias across farm sizes | **Potential issue** | Test absolute MAE (total PHP) by area tercile: small ~2.5k, mid ~2.8k, large ~8.5k. `corr(\|error\|, area) ≈ 0.49`. Relative WAPE is more stable (~0.05–0.10). Total-PHP MAE over-weights large farms. |

**Confirmed issue (evaluation gap, not training math):** official metrics/graphs do not include PHP/ha or size-stratified diagnostics, while the product UI presents PHP/ha as primary.

---

### Q12. Are total-PHP metrics sufficient, or should PHP/ha metrics also be calculated?

**Partially sufficient.**

- **Sufficient** to validate the **trained objective** (total PHP).  
- **Not sufficient alone** for a system that **primarily displays PHP/ha**, because:
  - Users/stakeholders judge the number they see (PHP/ha).  
  - Absolute total errors scale with farm size; PHP/ha (and/or WAPE) better matches intensity.  
  - R² on totals (0.93) is not the same as R² on PHP/ha (~0.79 on this test set).

**Recommendation:** keep total-PHP metrics (required for the model target) **and** add derived PHP/ha MAE, RMSE, WAPE (and optionally size-stratified WAPE) on the same test predictions — **no retrain**.

---

### Q13. Is the current LR methodology appropriate for the CalFAM capstone as a synthetic-data prototype?

**Confirmed appropriate as a synthetic prototype**, with honest labeling:

- One LR, lag-safe features, chronological split, total-PHP target, area as covariate, post-hoc PHP/ha for UX.  
- Metrics must remain labeled as **synthetic performance only**.  
- Do not claim real CalFAM accuracy from these numbers.

---

## 3. How different farm sizes are handled

```text
Farmer A (0.6 ha)  → row: features incl. area=0.6, lags…  → target = A's period total PHP
Farmer B (2.5 ha)  → row: features incl. area=2.5, lags…  → target = B's period total PHP
        ↓
   Shared LinearRegression (after StandardScaler on continuous cols)
        ↓
   ŷ_total (PHP) per row
        ↓ (runtime only)
   ŷ_per_ha = ŷ_total / forecast_area_hectares
```

Correlation in supervised data: `corr(area_hectares, target_total_expenses_php) ≈ 0.88` — larger farms have larger totals, as expected. The model sees area explicitly rather than forcing all farms onto one unadjusted total without size information.

---

## 4. Are existing graphs mathematically valid?

**Yes**, for evaluating **total agricultural expense** predictions on the synthetic test set.

They are **not wrong** for a PHP/ha UI; they are **incomplete**:

- Valid: show calibration of \(\hat{y}\) vs \(y\) in PHP.  
- Missing for hectare product story: PHP/ha actual-vs-predicted, error in PHP/ha, or residual vs area / faceted by size.

No evidence that points mix farmers incorrectly or use averaged hectares.

---

## 5. Is PHP/ha evaluation necessary?

**Yes, as an additive evaluation layer** (not as a replacement for total-PHP metrics, and not requiring a target change).

Reasons:

1. Product primary metric is PHP/ha (`PHP_PER_HA_IMPLEMENTATION_REPORT.md`).  
2. Total MAE is size-biased (large farms dominate absolute error).  
3. Derivation is already defined and implemented at inference; offline eval should mirror it.

---

## 6. Identified methodological problems (summary)

| ID | Severity | Finding |
|----|----------|---------|
| M1 | **Confirmed issue (eval gap)** | Training report metrics/graphs are total-PHP only; PHP/ha not reported despite PHP/ha-primary UX. |
| M2 | **Potential issue** | Heteroscedasticity / size-dependent absolute errors; total MAE overstates large-farm influence. |
| M3 | **Potential issue** | Narrow synthetic area range (0.54–2.89 ha); risk if live farms fall outside. |
| M4 | **Potential issue** | Training never sees within-farmer area changes; runtime allows them with a limitation note. |
| M5 | **Not an issue** | Training one LR on mixed farm sizes with `area_hectares` feature. |
| M6 | **Not an issue** | Post-inference `total / area` for PHP/ha (given area > 0). |
| M7 | **Not an issue** | Cross-farmer expense summing (does not occur). |

---

## 7. Recommended minimal corrections (approval required — not applied)

1. **No retrain** for hectare methodology.  
2. **Add derived PHP/ha metrics** on val/test in the training report (same predictions ÷ row `area_hectares`).  
3. **Optional graphs** (future): Actual vs Predicted in PHP/ha; residual vs `area_hectares`.  
4. **Optional table:** WAPE (or MAE) by area tercile — documents size fairness.  
5. Keep runtime formula and disclaimer; keep `trained_on_simulated_data` / synthetic labeling.

---

## 8. Is retraining necessary?

**No** — not for correcting hectare handling or enabling PHP/ha.

Retrain only if you intentionally change the learning problem (e.g. target = PHP/ha), expand/replace the dataset, or change the 21-feature schema.

---

## 9. Evidence index

| Item | Path / location |
|------|-----------------|
| Feature + target definition | `ml-training/prepare_features.py` (`FEATURE_COLUMNS`, `TARGET_COL`, `build_supervised`) |
| Train / metrics / graphs | `ml-training/train_models.py` (`metrics_dict`, `make_graphs`, Pipeline) |
| Dataset | `ml-training/data/CalFAM_ML_Training_Dataset.xlsx` (`Training_Data`, 500 rows) |
| Run metrics | `ml-training/runs/run_20261120_203925/evaluation_metrics.json` |
| Run schema | `ml-training/runs/run_20261120_203925/feature_schema.json` |
| Graphs | `ml-training/runs/run_20261120_203925/graphs/01_*.png` … `03_*.png` (and `reports/graphs/`) |
| PHP/ha runtime | `backend/services/pretrainedLrForecastService.js` (`derivePerHectareExpenses`) |
| Forecast area | `backend/services/pretrainedLrFeatureBuilder.js` (`forecast_area_hectares`) |
| Prior PHP/ha design | `ml-training/reports/PHP_PER_HA_PREDICTION_AUDIT.md`, `PHP_PER_HA_IMPLEMENTATION_REPORT.md` |

---

## 10. Stop

Audit complete. **Awaiting approval** before any metric/graph code changes or retraining.
