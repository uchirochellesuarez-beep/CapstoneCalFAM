# Dokploy / Hostinger Deployment Audit — Node Pretrained LR

**Date:** 2026-11-20  
**Scope:** Read-only. No code, Docker, env, dataset, MySQL, or deploy changes.

---

## 1. Deployment readiness verdict

**CONDITIONAL — not ready to deploy until the JSON artifact is committed and pushed to GitHub.**

| Criterion | Status |
|-----------|--------|
| Node inference works without Python / without `ML_API_URL` | Pass (verified locally) |
| Same model `run_id` `20261119_211021` | Pass |
| No Ridge/RF/OLS on pretrained path | Pass |
| Auth (`assertOwnFarmerId`) preserved on routes | Pass |
| Backend has Dockerfile | N/A — none; expect Nixpacks/Node |
| Artifact on disk | Pass |
| Artifact **tracked in git** for Dokploy pull | **Fail — currently untracked** |
| New env vars required | Pass (none required) |

**Verdict:** Code path is Dokploy-capable. **Shipping blocker:** `backend/ml-artifacts/*.json` is untracked (`git status` shows `??`). A Dokploy build from GitHub will not include the model unless these files are committed and pushed first.

---

## 2. Exact build context

| Item | Finding |
|------|---------|
| Backend Dockerfile | **None** under `backend/` |
| Backend `.dockerignore` | **None** |
| Frontend Dockerfile | `farmer-registration/Dockerfile` (nginx static) — unrelated to ML JSON |
| Frontend `.dockerignore` | Ignores `node_modules`, `dist`, `.env*` only |
| Dokploy config in repo | **None** found (no `dokploy*`, `nixpacks.toml`, compose for backend) |
| Expected Dokploy app | Separate Application → Git → build path likely `CALLFA/System_calffa/backend` (or monorepo root with that path) |
| Build type (typical) | **Nixpacks / Railpack** detecting `package.json` |
| Install | `npm ci` / `npm install` |
| Start | `npm start` → `node server.js` ([`backend/package.json`](../backend/package.json)) |
| Listen | `process.env.PORT \|\| 3000`, host `0.0.0.0` ([`server.js`](../backend/server.js)) |
| Working directory at runtime | Backend app root (where `package.json` / `server.js` live) |

Path resolution for the model (relative to compiled layout):

```
backend/services/pretrainedLrLocalPredict.js
  → path.join(__dirname, '..', 'ml-artifacts', 'pretrained_lr_20261119_211021.json')
  → backend/ml-artifacts/pretrained_lr_20261119_211021.json
```

This resolves correctly when the process CWD/layout keeps `services/` and `ml-artifacts/` as siblings under the backend root (standard Nixpacks copy of the backend tree).

---

## 3. Model artifact inclusion status

| Check | Result |
|-------|--------|
| File exists locally | Yes — `backend/ml-artifacts/pretrained_lr_20261119_211021.json` (~4.2 KB) |
| Excluded by root `.gitignore` | No |
| Excluded by `backend/.gitignore` | No (`check-ignore` exit 1) |
| Excluded by `.dockerignore` | N/A (no backend dockerignore); frontend dockerignore irrelevant |
| Present in git index / last push | **No — untracked** |
| `model_run_id` / `run_id` | `20261119_211021` |
| Loads without Python | Yes — `loadArtifact()` + `predictPretrainedLrLocalSafe()` returned `ok: true`, `inference_engine: node_pretrained_lr` |

Parity fixtures (`pretrained_lr_parity_fixtures.json`) are also untracked; optional for production (tests only), but the **coefficients JSON is required at runtime**.

---

## 4. Node.js inference verification (no code changes)

From current implementation + local smoke:

1. **`ML_API_URL` missing** → `isMlApiConfigured()` false → `node_pretrained_lr` (no Python call).  
2. **Saved records / Excel / combined** → all go through `runPretrainedLrPrediction` → same engine selection.  
3. **No Ridge/RF/OLS** on this path — legacy `fetchExpenseForecastFromMlService` not used.  
4. **No Python runtime** required for Node path — only `fs` + JSON math.  
5. **Auth** — pretrained and Excel forecast routes still use `assertOwnFarmerId`.

Dependencies: existing `package.json` production deps are sufficient (no new packages for local LR).

---

## 5. Required configuration adjustments (recommended — not applied)

Audit-only recommendations for a future change request:

1. **Commit and push**  
   - `backend/ml-artifacts/pretrained_lr_20261119_211021.json`  
   - (Optional) parity fixtures for CI only.  
2. **Dokploy backend env**  
   - Leave `ML_API_URL` **unset** (or remove stale `http://127.0.0.1:5001`) so production uses Node.  
   - Do **not** point `ML_API_URL` at localhost on Hostinger.  
3. **Build path** must be the backend directory (or monorepo path that includes `ml-artifacts/` next to `services/`).  
4. **README / `.env.example`** still describe older “Python required / OLS fallback” wording — documentation drift only; does not block Node path.  
5. No Dockerfile change required if Nixpacks continues to copy the full backend tree.

---

## 6. Remaining deployment risks

| Risk | Severity | Notes |
|------|----------|-------|
| JSON not in GitHub → missing on Dokploy | **High** | Immediate `MODEL_NOT_LOADED` / unavailable predictions |
| Stale `ML_API_URL=http://127.0.0.1:5001` on server | Medium | Python call fails then Node fallback still works **if** JSON is present |
| Wrong Dokploy root (repo root without backend files) | High | Start/`ml-artifacts` path break |
| `npm ci --omit=dev` | Low | Local LR needs no jest; fine |
| File permissions on JSON | Low | Read-only JSON; Alpine/Nixpacks usually OK |
| Startup failure from missing JSON | Medium | Server still starts; forecast endpoints fail at request time |
| Secrets exposure | N/A this audit | Do not commit `.env`; artifact has no secrets |
| Frontend Docker image | None | Does not embed backend ML JSON |

---

## 7. Recommended deployment steps (after approval)

1. Commit `backend/ml-artifacts/pretrained_lr_20261119_211021.json` (and related backend integration commits if not already on remote).  
2. Push to the branch Dokploy tracks.  
3. Confirm Dokploy **backend** app build path = `CALLFA/System_calffa/backend` (or equivalent).  
4. Ensure production env has **no** broken `ML_API_URL` (omit variable).  
5. Redeploy backend only; wait for healthy start on `PORT`.  
6. Smoke-test Predictive Analytics (saved records + Excel) as an authenticated farmer.  
7. Confirm response metadata includes `model_run_id: 20261119_211021` and `inference_engine: node_pretrained_lr` (or python if intentionally configured).

---

## Stop

Read-only audit complete. **Do not deploy until the model JSON is in the git remote and Dokploy build context is confirmed.**

Await approval before any deployment changes (commit/push/env/Dokploy settings).
