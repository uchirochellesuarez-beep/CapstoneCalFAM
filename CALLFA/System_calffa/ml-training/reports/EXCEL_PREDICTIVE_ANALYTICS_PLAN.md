# Excel-Based Predictive Analytics Integration Plan

**Date:** 2026-11-19  
**Status:** Read-only plan — **no implementation**  
**Goal:** Replace manual semester dropdowns on the Predictive Analytics tab with: download template → fill history → upload → run pretrained Linear Regression → show prediction for the **auto-computed next semester**.

**Non-goals (this phase):** UI/backend coding, MySQL writes, form field changes, retraining, deployment.

---

## 0. Current system snapshot (inspected)

| Area | Finding |
|------|---------|
| Frontend | `FarmerIncomePage.vue` Predictive tab currently requires manual `forecastPeriod` + per-record semester selects; calls `POST /expense-forecast-pretrained-lr/:farmerId` |
| Backend LR | `pretrainedLrFeatureBuilder.js` + `pretrainedLrForecastService.js`; needs `forecast_period` + `record_periods`; **no** `created_at` as crop period |
| Auth | `assertOwnFarmerId` — farmer may only forecast for own id |
| Excel stack | Backend already has **exceljs** + **multer** (memory); machinery historical import is a precedent (`historical-import.js` template download + `.xlsx`-only filter) |
| Form | New Record / Farm Income form **unchanged** — Excel path is prediction-only |
| ML | `POST /forecast/expenses/pretrained-lr` — 21 features, synthetic LR only (no Ridge/RF/OLS on this path) |

---

## 1. Proposed Excel template structure

**Filename:** `CalFAM_Agricultural_Expense_History_Template.xlsx`  
**Library to generate:** `exceljs` (already in `backend/package.json`)

### Sheets

| Sheet | Purpose | Parsed for prediction? |
|-------|---------|------------------------|
| `Instructions` | How to fill; allowed enums; disclaimer | No |
| `Semesters` | One row per agricultural semester (farm + labor/fuel/other) | **Yes** |
| `Fertilizers` | Zero or more fertilizer lines per semester | **Yes** (aggregated) |
| `Pesticides` | Zero or more pesticide lines per semester | **Yes** (aggregated) |
| `Example` | Sample rows clearly labeled **EXAMPLE ONLY** | **No** (ignored if sheet name is `Example`, or rows with `Is_Example=YES`) |

**Why multi-sheet:** Allows multiple fertilizer/pesticide lines without collapsing into one cell, while still producing category totals for the LR features (`prev_fertilizer_cost`, `prev_pesticide_cost`).

---

## 2. Required columns and sheets

### 2.1 `Semesters` (required)

| Column | Type | Required | Notes |
|--------|------|----------|-------|
| `Agricultural_Semester` | text `YYYY-H1` \| `YYYY-H2` | Yes | **Source of truth for period** — not upload date |
| `Farm_Area_Hectares` | number > 0 | Yes | Maps to `area_hectares` |
| `Planting_Method` | `sabog` \| `talok` | Yes | Same enums as form |
| `Irrigation` | `NIA` \| `bugsok_waterpump` \| `waterpump_irrigation` \| `waterpump_ilog` | Yes | Same enums as form |
| `Land_Preparation_Cost` | number ≥ 0 | Yes (0 allowed) | |
| `Planting_Cost` | number ≥ 0 | Yes | Uprooting / transplanting / sowing |
| `Spraying_Cost` | number ≥ 0 | Yes | Spraying / broadcasting |
| `Harvester_Fee` | number ≥ 0 | Yes | |
| `Drying_Fee` | number ≥ 0 | Yes | |
| `Hauling_Fee` | number ≥ 0 | Yes | Transport component |
| `Tarasko` | number ≥ 0 | Yes | Transport component |
| `Fuel` | number ≥ 0 | Yes | |
| `Other_Expenses` | number ≥ 0 | Yes | Included in labor_related (training definition) |

**Do not** put fertilizer/pesticide totals on this sheet (avoids double-counting with detail sheets).

### 2.2 `Fertilizers` (optional but recommended)

| Column | Type | Required |
|--------|------|----------|
| `Agricultural_Semester` | `YYYY-H1` \| `YYYY-H2` | Yes (must match a `Semesters` row) |
| `Fertilizer_Type` | text | Yes if row present |
| `Number_of_Sacks` | number ≥ 0 | Yes |
| `Price_per_Sack` | number ≥ 0 | Yes |

Line total = `Number_of_Sacks * Price_per_Sack` (computed server-side; do not trust a client “total” column if present).

### 2.3 `Pesticides` (optional but recommended)

| Column | Type | Required |
|--------|------|----------|
| `Agricultural_Semester` | `YYYY-H1` \| `YYYY-H2` | Yes |
| `Pesticide_Type` | text | Yes if row present |
| `Bottles_or_Packs` | number ≥ 0 | Yes |
| `Price_per_Bottle_or_Pack` | number ≥ 0 | Yes |

Line total = `Bottles_or_Packs * Price_per_Bottle_or_Pack`.

### 2.4 `Instructions` (not parsed)

- Allowed enum values  
- “One row per semester on Semesters”  
- “Multiple fert/pest lines OK”  
- “Do not copy Example sheet as real data”  
- Synthetic LR disclaimer  
- Minimum history: **≥ 1** semester row (same as current LR builder)

---

## 3. Example historical records (template only)

**`Example` sheet — DO NOT upload as live data** (parser must ignore this sheet).

Illustrative `Semesters` examples (for the Example sheet only):

| Agricultural_Semester | Farm_Area_Hectares | Planting_Method | Irrigation | …costs… |
|-----------------------|--------------------|-----------------|------------|----------|
| 2025-H1 | 1.00 | sabog | NIA | (sample non-negative costs) |
| 2025-H2 | 1.00 | talok | bugsok_waterpump | (sample) |

Matching Example `Fertilizers` / `Pesticides` rows for those semesters only.

Parser rule: never treat Example sheet values as farmer history.

---

## 4. Excel validation rules

### 4.1 File / security

| Rule | Action |
|------|--------|
| Extension / MIME | `.xlsx` only (same pattern as `historical-import.js`) |
| Size | Cap (e.g. ≤ 2–5 MB); multer memory storage |
| Auth | JWT + `assertOwnFarmerId` — farmer id from token, not from workbook |
| Farmer id in file | **Ignore** any farmer_id column if present; never trust workbook ownership |
| Persistence | **In-memory only** for prediction; **no** INSERT/UPDATE into `farmer_income_records` |
| External | Do not send workbook to third parties; only authenticated backend → local ML service feature JSON |

### 4.2 Structural

- Required sheets: `Semesters` (and use empty Fertilizer/Pesticide sheets as zero totals if missing lines)  
- Header row exact names (normalize trim; reject unknown critical headers)  
- ≥ 1 data row on `Semesters`  
- Every `Fertilizers`/`Pesticides` semester must exist on `Semesters`  
- Orphan detail rows → reject with clear error  

### 4.3 Semester

- Pattern `YYYY-H1` or `YYYY-H2` only  
- **Duplicate semester** on `Semesters` → reject (`DUPLICATE_PERIOD`) — no silent merge  
- Do **not** infer semester from upload timestamp or `created_at`  

### 4.4 Enums

- Planting: `sabog`, `talok` only  
- Irrigation: `NIA`, `bugsok_waterpump`, `waterpump_irrigation`, `waterpump_ilog` only  

### 4.5 Numerics

- All money/quantity fields finite numbers  
- Reject negatives  
- Reject blank required numerics (do **not** invent 0 unless column explicitly optional and documented; preferred: require 0 written)  
- Area > 0  

### 4.6 Totals (no double-counting)

Per semester \(s\):

```
fertilizer_total(s) = Σ (sacks × price_per_sack) for Fertilizers rows with semester s
pesticide_total(s)  = Σ (qty × price) for Pesticides rows with semester s
labor_related(s)    = Land_Prep + Planting + Spraying + Harvester + Drying + Other
transport(s)        = Hauling + Tarasko
fuel(s)             = Fuel
total_expenses(s)   = fertilizer_total + pesticide_total + labor_related + transport + fuel
```

**Never** add UI-style `total_labor_cost` that already includes hauling/fuel.

### 4.7 Missing history

- 0 semester rows → `INSUFFICIENT_HISTORY`  
- Gaps in calendar (e.g. 2025-H1 then 2026-H1) → **allowed** for v1 if sorted by period index (same as discrete panel rows); document that LR lags use ordered uploaded semesters, not filled gaps  
- Do not fabricate skipped semesters  

---

## 5. Automatic semester calculation

1. Parse all valid `Agricultural_Semester` values from `Semesters`.  
2. Convert to `period_index` with existing rule:  
   `period_index = (year - 2021) * 2 + half` (`H1`→1, `H2`→2).  
3. `latest = max(period_index)`.  
4. `forecast_period_index = latest + 1`.  
5. Convert back:  
   - If latest was `YYYY-H1` → forecast `YYYY-H2`  
   - If latest was `YYYY-H2` → forecast `(YYYY+1)-H1`  

**Examples:**  
2025-H1 → 2025-H2 · 2025-H2 → 2026-H1 · 2026-H1 → 2026-H2  

### Model support / extrapolation

| Forecast `period_index` | Training support | UI/API behavior |
|-------------------------|------------------|-----------------|
| 1–11 (through 2026-H1) | In training span | Normal |
| ≥ 12 (e.g. 2026-H2+) | **Extrapolation** | Still predict, but return warning: `PERIOD_EXTRAPOLATION_WARNING` — coefficients for `period_index` were fit on 2021-H1…2026-H1 synthetic data |

Never use file upload date as agricultural or forecast period.

---

## 6. Mapping to the 21 Linear Regression features

Upload → internal panel (sorted by semester) → reuse **same semantics** as `pretrainedLrFeatureBuilder.js` / `prepare_features.py`.

| # | Feature | From Excel-derived panel |
|---|---------|---------------------------|
| 1 | `area_hectares` | Latest history semester `Farm_Area_Hectares` |
| 2 | `prev_total_expenses` | Latest `total_expenses` (computed) |
| 3 | `prev_prev_total_expenses` | Prior semester total; else = prev, `has_lag2=0` |
| 4 | `prev_expenses_per_ha` | prev_total / area |
| 5 | `prev_fertilizer_cost` | Latest fertilizer aggregate |
| 6 | `prev_pesticide_cost` | Latest pesticide aggregate |
| 7 | `prev_labor_related_cost` | Latest labor_related (excludes hauling/tarasko/fuel) |
| 8 | `prev_transport_cost` | Latest hauling + tarasko |
| 9 | `prev_fuel_cost` | Latest fuel |
| 10–11 | planting one-hots | Latest `Planting_Method` |
| 12–15 | irrigation one-hots | Latest `Irrigation` |
| 16 | `period_index` | **Auto** forecast period index |
| 17 | `is_h1` | **Auto** from forecast half |
| 18 | `n_hist_periods` | Count of uploaded semesters |
| 19 | `roll3_mean_total` | Mean of last ≤3 semester totals |
| 20 | `delta_prev` | prev − prev_prev (0 if no lag2) |
| 21 | `has_lag2` | 1 if ≥2 semesters else 0 |

**Call:** existing `POST /forecast/expenses/pretrained-lr` with the 21-feature vector only.  
**Do not** call Ridge/RF/OLS legacy forecast on this path.

**Reuse strategy:** Prefer adapting `buildPretrainedLrFeatures` to accept in-memory “virtual records” (synthetic ids `excel-1`, …) plus `record_periods` / `forecast_period` produced by the Excel parser — avoid duplicating lag math.

---

## 7. Required frontend / backend changes (later implementation)

### Frontend (`FarmerIncomePage.vue` Predictive tab only)

- Remove manual forecast + per-record semester dropdowns.  
- Add: **Download template**, **Upload .xlsx**, **Run Predictive Analytics**.  
- Show: auto forecast semester, predicted PHP, Linear Regression label, synthetic disclaimer, extrapolation warning if any.  
- Do **not** change New Record form.  
- Keep using relative `/api/...` + Bearer token.

### Backend (new isolated endpoints; keep current LR JSON route)

Suggested (names illustrative):

| Method | Route | Role |
|--------|-------|------|
| `GET` | `/api/farmer-income/predictive-excel/template` | Stream template `.xlsx` (own-auth) |
| `POST` | `/api/farmer-income/predictive-excel/forecast/:farmerId` | multipart file → parse → validate → auto next semester → build 21 features → pretrained LR |

- New modules e.g. `predictiveExcelTemplate.js`, `predictiveExcelParser.js`, thin orchestration service.  
- Multer memory + `.xlsx` filter (mirror historical-import).  
- **No MySQL writes** of workbook rows.  
- Preserve `POST /expense-forecast-pretrained-lr/:farmerId` for now (or refactor to share feature builder).

### ML service

- **No change required** if backend already posts the 21-feature payload.

### Out of scope

- Training scripts, datasets, retrain, env changes, deploy, form schema, saving Excel into Farm Income Records.

---

## 8. Security considerations

1. **Ownership:** Always `assertOwnFarmerId`; ignore workbook farmer identifiers.  
2. **Upload hardening:** `.xlsx` only, size limit, memory-only buffer, no path traversal.  
3. **Parse safely:** exceljs only; reject macros/OLE expectations; treat all cells as data.  
4. **No silent defaults** for missing expenses/periods.  
5. **No legacy mislabeling:** failures return clear `error_code`; never substitute Ridge/OLS as LR.  
6. **PII/minimization:** Do not log full workbooks; log counts/error codes only.  
7. **Prediction-only:** Explicit response flag `persisted: false`.  

---

## 9. Minimal implementation steps (after approval)

1. **Backend template generator** (`exceljs`) with Instructions / Semesters / Fertilizers / Pesticides / Example.  
2. **Parser + validator** implementing Section 4; unit tests (duplicate semester, negative cost, bad enum, orphan fert row, next-semester math, extrapolation flag).  
3. **Map to virtual records** → reuse/adapt `buildPretrainedLrFeatures` → `fetchPretrainedLrFromMlService`.  
4. **New POST forecast-from-excel route** + GET template; auth tests.  
5. **Frontend Predictive tab** swap: download / upload / run; remove dropdown UX; show auto semester + disclaimer.  
6. **Manual E2E:** template fill (2 semesters) → upload → predict next H; verify no DB inserts; ML down → clear error.  
7. Stop; no deploy unless separately approved.

---

## Decision checklist for approval

| Question | Plan answer |
|----------|-------------|
| Manual semester UI removed? | Yes (post-implementation) |
| New Record form untouched? | Yes |
| Excel → MySQL? | **No** |
| Forecast period source? | Latest uploaded semester + 1 |
| Upload date as period? | **Never** |
| Model path? | Pretrained LR only |
| Retrain? | **No** |

**Stop.** Awaiting explicit approval before any implementation.
