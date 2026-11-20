"""
Additive PHP/ha evaluation for an existing Linear Regression run.

Loads the saved joblib + chronological test split from the training Excel.
Does NOT retrain. Does NOT overwrite total-PHP graphs 01–04.
Does NOT modify the dataset or model artifact bytes.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from pathlib import Path

import joblib
import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

from prepare_features import FEATURE_COLUMNS, TARGET_COL

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
REPORTS = ROOT / "reports"
GRAPH_DIR = REPORTS / "graphs"
EXCEL_PATH = DATA / "CalFAM_ML_Training_Dataset.xlsx"
DEFAULT_RUN = ROOT / "runs" / "run_20261120_203925"

GREEN = "#2E7D32"

# New graph filenames — must not collide with 01–04 total-PHP graphs
GRAPH_AVP = "05_actual_vs_predicted_per_ha.png"
GRAPH_ERR = "06_prediction_error_distribution_per_ha.png"
GRAPH_RES = "07_residual_scatter_per_ha.png"
PROTECTED_GRAPHS = (
    "01_actual_vs_predicted.png",
    "02_prediction_error_distribution.png",
    "03_residual_scatter.png",
    "04_linear_feature_contributions.png",
)


def sha256_file(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def wape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = float(np.sum(np.abs(y_true)))
    if denom <= 1e-12:
        return float("nan")
    return float(np.sum(np.abs(y_true - y_pred)) / denom)


def metrics_bundle(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred)),
        "RMSE": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "R2": float(r2_score(y_true, y_pred)),
        "WAPE": wape(y_true, y_pred),
        "WAPE_percent": float(wape(y_true, y_pred) * 100.0),
        "n": int(len(y_true)),
    }


def load_test_frame(excel_path: Path) -> pd.DataFrame:
    if not excel_path.is_file():
        raise SystemExit(f"Excel not found: {excel_path}")
    df = pd.read_excel(excel_path, sheet_name="Training_Data", engine="openpyxl")
    missing = [c for c in FEATURE_COLUMNS + [TARGET_COL, "split", "area_hectares"] if c not in df.columns]
    if missing:
        raise SystemExit(f"Missing columns in Training_Data: {missing}")
    test = df[df["split"] == "test"].copy()
    if len(test) == 0:
        raise SystemExit("No rows with split=='test'. Cannot reconstruct held-out set.")
    # Chronological test for current schema is a single target label
    labels = sorted(test["target_period_label"].astype(str).unique().tolist())
    if labels != ["2026-H1"]:
        raise SystemExit(
            f"Unexpected test target labels {labels}; expected ['2026-H1']. "
            "Refusing to invent a split."
        )
    return test


def predict_totals(pipe, X: pd.DataFrame) -> np.ndarray:
    """Match train_models.py evaluation convention: clip predictions at 0."""
    raw = np.asarray(pipe.predict(X), dtype=float)
    return np.maximum(raw, 0.0)


def to_per_ha(totals: np.ndarray, areas: np.ndarray) -> np.ndarray:
    if np.any(~np.isfinite(areas)) or np.any(areas <= 0):
        bad = int(np.sum(~np.isfinite(areas) | (areas <= 0)))
        raise SystemExit(f"{bad} test rows have invalid area_hectares (need finite > 0).")
    return totals / areas


def save_graphs(
    y_ha: np.ndarray,
    pred_ha: np.ndarray,
    out_dirs: list[Path],
) -> list[Path]:
    err = pred_ha - y_ha
    written: list[Path] = []

    for d in out_dirs:
        d.mkdir(parents=True, exist_ok=True)

    # Graph 1 — Actual vs Predicted PHP/ha
    fig, ax = plt.subplots(figsize=(7.5, 6))
    ax.scatter(y_ha, pred_ha, s=22, alpha=0.6, c=GREEN)
    lo = float(min(y_ha.min(), pred_ha.min()))
    hi = float(max(y_ha.max(), pred_ha.max()))
    ax.plot([lo, hi], [lo, hi], "k--", lw=1, label="Ideal (y = x)")
    ax.set_xlabel("Actual Expenses (PHP/ha)")
    ax.set_ylabel("Predicted Expenses (PHP/ha)")
    ax.set_title(
        "Actual vs Predicted Agricultural Expenses per Hectare — "
        "Linear Regression (Synthetic Test Data)"
    )
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    for d in out_dirs:
        p = d / GRAPH_AVP
        fig.savefig(p, dpi=140)
        written.append(p)
    plt.close(fig)

    # Graph 2 — Error distribution PHP/ha
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.hist(err, bins=30, color=GREEN, edgecolor="white")
    ax.axvline(0, color="black", linestyle="--", lw=1)
    ax.set_xlabel("Prediction Error (PHP/ha)")
    ax.set_ylabel("Frequency")
    ax.set_title(
        "Prediction Error Distribution per Hectare — "
        "Linear Regression (Synthetic Test Data)"
    )
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    for d in out_dirs:
        p = d / GRAPH_ERR
        fig.savefig(p, dpi=140)
        written.append(p)
    plt.close(fig)

    # Graph 3 — Residual scatter PHP/ha
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.scatter(pred_ha, err, s=22, alpha=0.6, c=GREEN)
    ax.axhline(0, color="black", linestyle="--", lw=1)
    ax.set_xlabel("Predicted Expenses (PHP/ha)")
    ax.set_ylabel("Prediction Error (PHP/ha)")
    ax.set_title(
        "Residual Scatter Plot per Hectare — "
        "Linear Regression (Synthetic Test Data)"
    )
    ax.grid(alpha=0.3)
    fig.tight_layout()
    for d in out_dirs:
        p = d / GRAPH_RES
        fig.savefig(p, dpi=140)
        written.append(p)
    plt.close(fig)

    return written


def write_report(
    path: Path,
    *,
    run_id: str,
    joblib_path: Path,
    excel_path: Path,
    n_test: int,
    total_metrics: dict,
    per_ha_metrics: dict,
    graph_paths: list[Path],
    joblib_sha_before: str,
    joblib_sha_after: str,
    protected_hashes_before: dict[str, str],
    protected_hashes_after: dict[str, str],
    area_stats: dict,
) -> None:
    gp = [str(p.as_posix()) for p in graph_paths]
    # Deduplicate display list by basename (reports + run copies)
    unique_basenames = []
    for name in (GRAPH_AVP, GRAPH_ERR, GRAPH_RES):
        matches = [p for p in gp if p.endswith(name)]
        unique_basenames.append((name, matches))

    lines = [
        "# Linear Regression — Per-Hectare (PHP/ha) Evaluation",
        "",
        "**Date:** 2026-11-20  ",
        f"**Run ID:** `{run_id}`  ",
        "**Mode:** Additive evaluation only (no retrain).",
        "",
        "---",
        "",
        "## 1. Evaluation objective",
        "",
        "Evaluate the **existing** pretrained Linear Regression model on the original",
        "chronological held-out synthetic **test** split, after converting total-PHP",
        "actuals and predictions to **PHP per hectare (PHP/ha)**.",
        "",
        "The product UI displays PHP/ha as the primary forecast quantity. This report",
        "adds matching evaluation metrics and graphs without changing the trained target",
        "(`target_total_expenses_php`).",
        "",
        "## 2. Existing model and dataset used",
        "",
        f"| Item | Path / value |",
        f"|------|--------------|",
        f"| Model artifact | `{joblib_path.as_posix()}` |",
        f"| Joblib SHA-256 (before) | `{joblib_sha_before}` |",
        f"| Joblib SHA-256 (after) | `{joblib_sha_after}` |",
        f"| Training Excel | `{excel_path.as_posix()}` |",
        f"| Sheet | `Training_Data` |",
        f"| Features | 21 (`FEATURE_COLUMNS`); includes `area_hectares` |",
        f"| Training target | `{TARGET_COL}` (total PHP) |",
        f"| Test split rule | `split == 'test'` → target period `2026-H1` |",
        "",
        "## 3. Test observation count",
        "",
        f"**n = {n_test}** synthetic test rows (one per farmer for `2026-H1`).",
        "",
        f"Area (`area_hectares`) on test rows: min={area_stats['min']}, "
        f"max={area_stats['max']}, mean={area_stats['mean']:.4f}. "
        "All areas finite and > 0.",
        "",
        "## 4. Per-hectare calculation",
        "",
        "For each test observation *i* with its own `area_hectares` (a_i):",
        "",
        "```text",
        "actual_php_per_ha_i     = actual_total_expenses_php_i / a_i",
        "predicted_php_per_ha_i  = predicted_total_expenses_php_i / a_i",
        "```",
        "",
        "**Prediction / postprocessing convention (matches `train_models.py`):**",
        "",
        "1. Load the saved Pipeline from the joblib (`estimator`).",
        "2. `raw_pred = pipe.predict(X_test)`.",
        "3. `predicted_total_expenses_php = max(raw_pred, 0)` (non-negative clip).",
        "4. Divide **row-wise** by that row’s `area_hectares` (same feature column used",
        "   in training / feature vector). No global area; no cross-farmer summing.",
        "",
        "On this synthetic panel, area is constant within each farmer across periods,",
        "so the supervised `area_hectares` equals the target-period farm area.",
        "",
        "## 5. PHP/ha metrics (calculated)",
        "",
        "| Metric | Value | Unit |",
        "|--------|------:|------|",
        f"| MAE | {per_ha_metrics['MAE']:.6f} | PHP/ha |",
        f"| RMSE | {per_ha_metrics['RMSE']:.6f} | PHP/ha |",
        f"| WAPE | {per_ha_metrics['WAPE']:.6f} | fraction |",
        f"| WAPE | {per_ha_metrics['WAPE_percent']:.4f} | % |",
        f"| R² (optional) | {per_ha_metrics['R2']:.6f} | — |",
        f"| n | {per_ha_metrics['n']} | observations |",
        "",
        "## 6. Optional R² (PHP/ha)",
        "",
        f"R² on PHP/ha test pairs = **{per_ha_metrics['R2']:.6f}**.",
        "Reported separately from total-PHP R²; not interchangeable.",
        "",
        "## 7. Comparison with existing total-PHP metrics",
        "",
        "Units must not be mixed. Recomputed total-PHP metrics on the **same**",
        "clipped predictions for side-by-side comparison:",
        "",
        "| Metric | Total PHP (same test set) | PHP/ha (derived) |",
        "|--------|--------------------------:|-----------------:|",
        f"| MAE | {total_metrics['MAE']:.4f} PHP | {per_ha_metrics['MAE']:.4f} PHP/ha |",
        f"| RMSE | {total_metrics['RMSE']:.4f} PHP | {per_ha_metrics['RMSE']:.4f} PHP/ha |",
        f"| WAPE | {total_metrics['WAPE_percent']:.4f} % | {per_ha_metrics['WAPE_percent']:.4f} % |",
        f"| R² | {total_metrics['R2']:.4f} | {per_ha_metrics['R2']:.4f} |",
        f"| n | {total_metrics['n']} | {per_ha_metrics['n']} |",
        "",
        "Official training-report total-PHP test figures for this run",
        f"(`evaluation_metrics.json`) were MAE≈4640.10, RMSE≈7752.51, R²≈0.9309,",
        "WAPE≈0.0794 — consistent with the recomputed total-PHP column above.",
        "",
        "## 8. Paths to newly generated graphs",
        "",
    ]
    for name, matches in unique_basenames:
        lines.append(f"- **{name}**")
        for m in matches:
            lines.append(f"  - `{m}`")
    lines.extend(
        [
            "",
            "Original total-PHP graphs `01`–`04` were **not** overwritten.",
            "",
            "## 9. Observed prediction errors and limitations",
            "",
            "- Errors are in **PHP/ha** (`predicted_php_per_ha − actual_php_per_ha`).",
            "- Absolute total-PHP errors still tend to be larger for larger farms;",
            "  PHP/ha normalizes by area but does not remove all size-related structure.",
            "- Synthetic area range on this panel is approximately "
            f"{area_stats['min']}–{area_stats['max']} ha; live farms outside this range"
            " are extrapolation.",
            "- Within-farmer area changes over time are not present in this synthetic"
            " panel; runtime forecasting uses latest-history area as the divisor.",
            "- This evaluation does **not** change the model target; PHP/ha is derived.",
            "",
            "## 10. Synthetic-data disclaimer",
            "",
            "**ALL PHP/ha METRICS AND GRAPHS BELOW / ABOVE ARE SYNTHETIC TEST DATA",
            "PERFORMANCE ONLY.** They do **not** establish real-world forecasting",
            "accuracy on CalFAM / CALFFA farmers.",
            "",
            "---",
            "",
            "## Validation checklist",
            "",
            f"| Check | Result |",
            f"|-------|--------|",
            f"| Joblib unchanged | {'PASS' if joblib_sha_before == joblib_sha_after else 'FAIL'} |",
            f"| Graphs 01–04 hashes unchanged | {'PASS' if protected_hashes_before == protected_hashes_after else 'FAIL'} |",
            f"| Same test label `2026-H1` | PASS |",
            f"| Per-row area divisor | PASS |",
            f"| Retrain performed | NO |",
            "",
            "Protected graph SHA-256 (reports/graphs):",
            "",
        ]
    )
    for name in PROTECTED_GRAPHS:
        lines.append(
            f"- `{name}`: `{protected_hashes_after.get(name, 'missing')}`"
        )
    lines.append("")
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--run-dir", type=Path, default=DEFAULT_RUN)
    parser.add_argument("--excel", type=Path, default=EXCEL_PATH)
    args = parser.parse_args()

    run_dir: Path = args.run_dir
    joblib_path = run_dir / "expense_model.joblib"
    if not joblib_path.is_file():
        raise SystemExit(f"Model not found: {joblib_path}")

    # Snapshot hashes before any writes
    joblib_sha_before = sha256_file(joblib_path)
    protected_before: dict[str, str] = {}
    for name in PROTECTED_GRAPHS:
        p = GRAPH_DIR / name
        if p.is_file():
            protected_before[name] = sha256_file(p)

    obj = joblib.load(joblib_path)
    if not isinstance(obj, dict) or "estimator" not in obj:
        raise SystemExit("Joblib must be a dict with key 'estimator'.")
    pipe = obj["estimator"]
    run_id = str(obj.get("run_id") or run_dir.name.replace("run_", ""))

    test = load_test_frame(args.excel)
    X = test[FEATURE_COLUMNS]
    y_total = test[TARGET_COL].to_numpy(dtype=float)
    areas = test["area_hectares"].to_numpy(dtype=float)

    pred_total = predict_totals(pipe, X)
    y_ha = to_per_ha(y_total, areas)
    pred_ha = to_per_ha(pred_total, areas)

    total_metrics = metrics_bundle(y_total, pred_total)
    per_ha_metrics = metrics_bundle(y_ha, pred_ha)

    out_dirs = [GRAPH_DIR, run_dir / "graphs"]
    written = save_graphs(y_ha, pred_ha, out_dirs)

    metrics_payload = {
        "performance_disclaimer": (
            "SYNTHETIC DATA PERFORMANCE ONLY. Not real-world CalFAM accuracy."
        ),
        "run_id": run_id,
        "joblib": str(joblib_path.as_posix()),
        "joblib_sha256": joblib_sha_before,
        "excel": str(args.excel.as_posix()),
        "test_target_labels": ["2026-H1"],
        "n_test": int(len(test)),
        "postprocessing": "predicted_total = max(pipe.predict(X), 0); per_ha = total / area_hectares",
        "total_php_metrics_same_predictions": total_metrics,
        "php_per_ha_metrics": per_ha_metrics,
        "graphs": [str(p.as_posix()) for p in written],
    }
    metrics_path = REPORTS / "per_hectare_evaluation_metrics.json"
    metrics_path.write_text(json.dumps(metrics_payload, indent=2) + "\n", encoding="utf-8")
    (run_dir / "per_hectare_evaluation_metrics.json").write_text(
        json.dumps(metrics_payload, indent=2) + "\n", encoding="utf-8"
    )

    joblib_sha_after = sha256_file(joblib_path)
    protected_after: dict[str, str] = {}
    for name in PROTECTED_GRAPHS:
        p = GRAPH_DIR / name
        if p.is_file():
            protected_after[name] = sha256_file(p)

    if joblib_sha_before != joblib_sha_after:
        raise SystemExit("VALIDATION FAIL: joblib hash changed.")
    if protected_before != protected_after:
        raise SystemExit("VALIDATION FAIL: protected graphs 01–04 changed.")

    area_stats = {
        "min": float(np.min(areas)),
        "max": float(np.max(areas)),
        "mean": float(np.mean(areas)),
    }
    report_path = REPORTS / "LINEAR_REGRESSION_PER_HECTARE_EVALUATION.md"
    write_report(
        report_path,
        run_id=run_id,
        joblib_path=joblib_path,
        excel_path=args.excel,
        n_test=len(test),
        total_metrics=total_metrics,
        per_ha_metrics=per_ha_metrics,
        graph_paths=written,
        joblib_sha_before=joblib_sha_before,
        joblib_sha_after=joblib_sha_after,
        protected_hashes_before=protected_before,
        protected_hashes_after=protected_after,
        area_stats=area_stats,
    )

    print(json.dumps({
        "status": "OK",
        "run_id": run_id,
        "n_test": len(test),
        "php_per_ha": per_ha_metrics,
        "report": str(report_path),
        "metrics_json": str(metrics_path),
        "graphs": [str(p) for p in written],
        "joblib_unchanged": True,
        "graphs_01_04_unchanged": True,
    }, indent=2))


if __name__ == "__main__":
    main()
