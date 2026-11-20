"""
CalFAM offline expense forecasting — Linear Regression only.

Workflow:
  Excel/CSV dataset → validation → feature matrix → Linear Regression
  → evaluation → graphs → versioned model export

Historical multi-model comparison artifacts under models/, runs/, and reports/
are preserved as archived evidence and are not deleted by this script.

All metrics are SYNTHETIC DATA PERFORMANCE — not real-world accuracy.
"""
from __future__ import annotations

import argparse
import json
import shutil
import time
from datetime import datetime
from pathlib import Path

import joblib
import matplotlib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from prepare_features import FEATURE_COLUMNS, TARGET_COL

SEED = 20261119
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
MODELS = ROOT / "models"
REPORTS = ROOT / "reports"
GRAPH_DIR = REPORTS / "graphs"
RUNS = ROOT / "runs"
EXCEL_PATH = DATA / "CalFAM_ML_Training_Dataset.xlsx"
CSV_PATH = DATA / "supervised_features.csv"

GREEN = "#2E7D32"
GREEN_DARK = "#1B5E20"

CONTINUOUS_FEATURES = [
    "area_hectares",
    "prev_total_expenses",
    "prev_prev_total_expenses",
    "prev_expenses_per_ha",
    "prev_fertilizer_cost",
    "prev_pesticide_cost",
    "prev_labor_related_cost",
    "prev_transport_cost",
    "prev_fuel_cost",
    "period_index",
    "n_hist_periods",
    "roll3_mean_total",
    "delta_prev",
]


def log(msg: str) -> None:
    print(msg, flush=True)


def wape(y_true: np.ndarray, y_pred: np.ndarray) -> float:
    denom = float(np.sum(np.abs(y_true)))
    if denom <= 1e-12:
        return float("nan")
    return float(np.sum(np.abs(y_true - y_pred)) / denom)


def metrics_dict(y_true: np.ndarray, y_pred: np.ndarray) -> dict:
    y_pred = np.asarray(y_pred, dtype=float)
    y_true = np.asarray(y_true, dtype=float)
    y_pred_clip = np.maximum(y_pred, 0.0)
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred_clip)))
    return {
        "MAE": float(mean_absolute_error(y_true, y_pred_clip)),
        "RMSE": rmse,
        "R2": float(r2_score(y_true, y_pred_clip)),
        "WAPE": wape(y_true, y_pred_clip),
        "n": int(len(y_true)),
        "performance_label": "SYNTHETIC DATA PERFORMANCE",
    }


def build_preprocess() -> ColumnTransformer:
    """Standardize continuous features; pass through binary/ordinal indicators."""
    passthrough = [c for c in FEATURE_COLUMNS if c not in CONTINUOUS_FEATURES]
    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), CONTINUOUS_FEATURES),
            ("pass", "passthrough", passthrough),
        ]
    )


def build_linear_pipeline() -> Pipeline:
    return Pipeline(
        steps=[
            ("prep", build_preprocess()),
            ("model", LinearRegression()),
        ]
    )


def transformed_feature_names() -> list[str]:
    passthrough = [c for c in FEATURE_COLUMNS if c not in CONTINUOUS_FEATURES]
    return CONTINUOUS_FEATURES + passthrough


def load_supervised(source: str) -> tuple[pd.DataFrame, str]:
    source = source.lower().strip()
    if source == "excel":
        if not EXCEL_PATH.exists():
            raise SystemExit(
                f"Excel workbook not found: {EXCEL_PATH}\n"
                "Run: python export_excel_dataset.py"
            )
        log(f"[data] Reading Excel: {EXCEL_PATH} (sheet=Training_Data)")
        df = pd.read_excel(EXCEL_PATH, sheet_name="Training_Data", engine="openpyxl")
        label = str(EXCEL_PATH)
    elif source == "csv":
        if not CSV_PATH.exists():
            raise SystemExit(f"CSV not found: {CSV_PATH}")
        log(f"[data] Reading CSV: {CSV_PATH}")
        df = pd.read_csv(CSV_PATH)
        label = str(CSV_PATH)
    else:
        raise SystemExit("--input must be 'excel' or 'csv'")

    missing = [c for c in FEATURE_COLUMNS + [TARGET_COL, "split"] if c not in df.columns]
    if missing:
        raise SystemExit(f"Missing required columns: {missing}")
    if len(df) < 50:
        raise SystemExit(f"Too few supervised rows: {len(df)}")
    return df, label


def verify_excel_csv_match() -> dict:
    if not EXCEL_PATH.exists() or not CSV_PATH.exists():
        return {"compared": False, "reason": "excel or csv missing"}
    csv_df = pd.read_csv(CSV_PATH)
    xls_df = pd.read_excel(EXCEL_PATH, sheet_name="Training_Data", engine="openpyxl")
    if len(csv_df) != len(xls_df):
        raise SystemExit("Excel/CSV row count mismatch")
    cols = FEATURE_COLUMNS + [TARGET_COL]
    for c in cols:
        a = pd.to_numeric(csv_df[c], errors="coerce").to_numpy(dtype=float)
        b = pd.to_numeric(xls_df[c], errors="coerce").to_numpy(dtype=float)
        if not np.allclose(a, b, rtol=0, atol=1e-6, equal_nan=True):
            raise SystemExit(f"Excel/CSV value mismatch on {c}")
    return {"compared": True, "n_rows": int(len(csv_df)), "n_feature_cols": len(cols)}


def _save_fig_paths(fig, paths: list[Path]) -> None:
    for p in paths:
        p.parent.mkdir(parents=True, exist_ok=True)
        fig.savefig(p, dpi=140, bbox_inches="tight")


def generate_graphs(
    y_test: np.ndarray,
    y_pred: np.ndarray,
    pipe: Pipeline,
    graph_dirs: list[Path],
    show: bool,
) -> list[str]:
    """Generate Linear Regression evaluation graphs (no epoch curves).

    All PNGs are saved first. Interactive windows open only afterward when
    ``show=True``. Closing the windows continues the run; Ctrl+C during
    display is handled gracefully after files are already saved.
    """
    import matplotlib.pyplot as plt

    saved: list[str] = []
    figs: list = []
    y_pred = np.maximum(np.asarray(y_pred, dtype=float), 0.0)
    err = y_pred - y_test

    # 1) Actual vs Predicted
    fig, ax = plt.subplots(figsize=(7.5, 6))
    ax.scatter(y_test, y_pred, s=22, alpha=0.6, c=GREEN)
    lo = float(min(y_test.min(), y_pred.min()))
    hi = float(max(y_test.max(), y_pred.max()))
    ax.plot([lo, hi], [lo, hi], "k--", lw=1, label="Ideal (y = x)")
    ax.set_xlabel("Actual total expenses (PHP)")
    ax.set_ylabel("Predicted total expenses (PHP)")
    ax.set_title("Actual vs Predicted — Linear Regression (Test, SYNTHETIC)")
    ax.legend()
    ax.grid(alpha=0.3)
    fig.tight_layout()
    paths = [d / "01_actual_vs_predicted.png" for d in graph_dirs]
    _save_fig_paths(fig, paths)
    saved.extend(str(p) for p in paths)
    figs.append(fig)

    # 2) Prediction error distribution
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.hist(err, bins=30, color=GREEN, edgecolor="white")
    ax.axvline(0, color="black", linestyle="--", lw=1)
    ax.set_xlabel("Prediction error (Predicted − Actual) PHP")
    ax.set_ylabel("Count")
    ax.set_title("Prediction Error Distribution — Linear Regression (Test, SYNTHETIC)")
    ax.grid(axis="y", alpha=0.3)
    fig.tight_layout()
    paths = [d / "02_prediction_error_distribution.png" for d in graph_dirs]
    _save_fig_paths(fig, paths)
    saved.extend(str(p) for p in paths)
    figs.append(fig)

    # 3) Residual scatter
    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.scatter(y_pred, err, s=22, alpha=0.6, c=GREEN)
    ax.axhline(0, color="black", linestyle="--", lw=1)
    ax.set_xlabel("Predicted total expenses (PHP)")
    ax.set_ylabel("Residual (Predicted − Actual) PHP")
    ax.set_title("Residual Scatter Plot — Linear Regression (Test, SYNTHETIC)")
    ax.grid(alpha=0.3)
    fig.tight_layout()
    paths = [d / "03_residual_scatter.png" for d in graph_dirs]
    _save_fig_paths(fig, paths)
    saved.extend(str(p) for p in paths)
    figs.append(fig)

    # 4) Feature contributions (|coefficients| after scaling continuous features)
    names = transformed_feature_names()
    coefs = np.asarray(pipe.named_steps["model"].coef_, dtype=float)
    abs_c = np.abs(coefs)
    order = np.argsort(abs_c)[::-1]
    fig, ax = plt.subplots(figsize=(9, 6.5))
    ax.barh([names[i] for i in order][::-1], abs_c[order][::-1], color=GREEN)
    ax.set_xlabel("|Coefficient| (continuous features standardized)")
    ax.set_title("Linear Regression Feature Contributions (SYNTHETIC train fit)")
    ax.grid(axis="x", alpha=0.3)
    fig.tight_layout()
    paths = [d / "04_linear_feature_contributions.png" for d in graph_dirs]
    _save_fig_paths(fig, paths)
    saved.extend(str(p) for p in paths)
    figs.append(fig)

    if show:
        log("  PNG graphs already saved. Close the plot windows to continue export...")
        log("  Tip: do not press Ctrl+C — close the windows instead.")
        try:
            plt.show()
        except KeyboardInterrupt:
            log("  Plot display interrupted (Ctrl+C). Continuing — PNG files are already saved.")
        finally:
            plt.close("all")
    else:
        for fig in figs:
            plt.close(fig)

    return saved


def parse_args(argv: list[str] | None = None) -> argparse.Namespace:
    p = argparse.ArgumentParser(
        description="CalFAM Linear Regression expense training (offline)"
    )
    p.add_argument(
        "--input",
        choices=["excel", "csv"],
        default="excel",
        help="Training data source (default: excel)",
    )
    p.add_argument(
        "--show-plots",
        action="store_true",
        help="Display graphs interactively during/after training",
    )
    p.add_argument(
        "--skip-excel-csv-check",
        action="store_true",
        help="Skip Excel vs CSV equality verification",
    )
    return p.parse_args(argv)


def main(argv: list[str] | None = None) -> None:
    args = parse_args(argv)

    if args.show_plots:
        try:
            matplotlib.use("TkAgg")
        except Exception:
            pass
    else:
        matplotlib.use("Agg")

    run_id = datetime.now().strftime("%Y%m%d_%H%M%S")
    run_dir = RUNS / f"run_{run_id}"
    run_graphs = run_dir / "graphs"
    run_dir.mkdir(parents=True, exist_ok=True)
    run_graphs.mkdir(parents=True, exist_ok=True)
    GRAPH_DIR.mkdir(parents=True, exist_ok=True)

    log("=" * 64)
    log("CalFAM Expense ML Training — Linear Regression only")
    log(f"Run directory: {run_dir}")
    log("Metrics label: SYNTHETIC DATA PERFORMANCE ONLY")
    log("New run artifacts go under runs/ (models/ is not overwritten).")
    log("=" * 64)

    # --- Data validation ---
    log("\n[1/6] Data validation...")
    if not args.skip_excel_csv_check and EXCEL_PATH.exists():
        match_info = verify_excel_csv_match()
        log(f"  Excel/CSV match: {match_info}")
    df, source_label = load_supervised(args.input)
    log(f"  Loaded {len(df)} supervised rows from {source_label}")

    train = df[df["split"] == "train"].copy()
    val = df[df["split"] == "validation"].copy()
    test = df[df["split"] == "test"].copy()
    if len(train) < 20 or len(val) < 5 or len(test) < 5:
        raise SystemExit(
            f"Unexpected chronological split sizes: train={len(train)}, "
            f"val={len(val)}, test={len(test)}"
        )
    log(
        f"  Chronological split OK: train={len(train)}, "
        f"validation={len(val)}, test={len(test)} "
        f"(total={len(df)}; sizes scale with n_farmers)"
    )

    # --- Feature preparation ---
    log("\n[2/6] Feature preparation...")
    X_train = train[FEATURE_COLUMNS]
    y_train = train[TARGET_COL].to_numpy(dtype=float)
    X_val = val[FEATURE_COLUMNS]
    y_val = val[TARGET_COL].to_numpy(dtype=float)
    X_test = test[FEATURE_COLUMNS]
    y_test = test[TARGET_COL].to_numpy(dtype=float)
    log(f"  Feature matrix shape (train): {X_train.shape}")
    log(f"  Preprocessing: StandardScaler on {len(CONTINUOUS_FEATURES)} continuous features")

    # --- Linear Regression training ---
    log("\n[3/6] Linear Regression training...")
    t0 = time.time()
    pipe = build_linear_pipeline()
    pipe.fit(X_train, y_train)
    fit_sec = time.time() - t0
    log(f"  Fitted LinearRegression pipeline in {fit_sec:.3f}s")

    # --- Evaluation ---
    log("\n[4/6] Evaluation (train / validation / test)...")
    train_metrics = metrics_dict(y_train, pipe.predict(X_train))
    val_metrics = metrics_dict(y_val, pipe.predict(X_val))
    test_pred = pipe.predict(X_test)
    test_metrics = metrics_dict(y_test, test_pred)
    test_pred_clip = np.maximum(np.asarray(test_pred, dtype=float), 0.0)
    if not np.isfinite(test_pred_clip).all():
        raise SystemExit("Non-finite predictions")
    log(
        "  Validation — "
        f"MAE={val_metrics['MAE']:.2f}  RMSE={val_metrics['RMSE']:.2f}  "
        f"R2={val_metrics['R2']:.4f}  WAPE={val_metrics['WAPE']:.4f}"
    )
    log(
        "  Test — "
        f"MAE={test_metrics['MAE']:.2f}  RMSE={test_metrics['RMSE']:.2f}  "
        f"R2={test_metrics['R2']:.4f}  WAPE={test_metrics['WAPE']:.4f}"
    )

    results = {
        "performance_disclaimer": (
            "ALL METRICS BELOW ARE SYNTHETIC DATA PERFORMANCE ONLY. "
            "They do NOT represent real-world forecasting accuracy on CalFAM farmers."
        ),
        "algorithm": "linear_regression",
        "seed": SEED,
        "input_source": args.input,
        "input_path": source_label,
        "run_id": run_id,
        "feature_columns": FEATURE_COLUMNS,
        "split_sizes": {
            "train": int(len(train)),
            "validation": int(len(val)),
            "test": int(len(test)),
        },
        "train": train_metrics,
        "validation": val_metrics,
        "test": test_metrics,
        "fit_seconds": fit_sec,
    }

    # --- Graphs ---
    log("\n[5/6] Graph generation...")
    graph_files = generate_graphs(
        y_test, test_pred_clip, pipe, [GRAPH_DIR, run_graphs], show=args.show_plots
    )
    results["graph_files"] = graph_files
    log(f"  Wrote {len(set(Path(p).name for p in graph_files))} graph types")

    # --- Export (versioned run dir only; do not overwrite models/) ---
    log("\n[6/6] Model export to versioned run directory...")
    model_path = run_dir / "expense_model.joblib"
    joblib.dump(
        {
            "model_type": "linear_regression",
            "estimator": pipe,
            "feature_columns": FEATURE_COLUMNS,
            "target": TARGET_COL,
            "seed": SEED,
            "clip_nonnegative": True,
            "performance_label": "SYNTHETIC DATA PERFORMANCE",
            "run_id": run_id,
            "input_source": args.input,
        },
        model_path,
    )
    loaded = joblib.load(model_path)
    reload_pred = np.maximum(
        np.asarray(loaded["estimator"].predict(X_test), dtype=float), 0.0
    )
    if not np.allclose(reload_pred, test_pred_clip, rtol=1e-6, atol=1e-4):
        raise SystemExit("Reload prediction mismatch")

    draft_path = DATA / "feature_schema_draft.json"
    draft = (
        json.loads(draft_path.read_text(encoding="utf-8"))
        if draft_path.exists()
        else {"splits": {}}
    )
    feature_schema = {
        **draft,
        "selected_model": "linear_regression",
        "active_algorithms": ["linear_regression"],
        "model_artifact": str(model_path.relative_to(ROOT)).replace("\\", "/"),
        "input_source": args.input,
        "run_id": run_id,
        "inference_notes": {
            "clip_nonnegative": True,
            "input": "DataFrame or 2D array in feature_order",
            "output": "predicted target_total_expenses_php (PHP)",
        },
    }
    (run_dir / "feature_schema.json").write_text(
        json.dumps(feature_schema, indent=2), encoding="utf-8"
    )

    metadata = {
        "project": "CalFAM Expense Predictive Analytics",
        "algorithm": "linear_regression",
        "seed": SEED,
        "run_id": run_id,
        "input_source": args.input,
        "input_path": source_label,
        "chronological_split": draft.get("splits", {}),
        "performance_disclaimer": results["performance_disclaimer"],
        "prior_models_dir_preserved": True,
        "note": (
            "Active training workflow is Linear Regression only. "
            "Historical Ridge/RF comparison artifacts remain archived under models/ and older runs/."
        ),
    }
    (run_dir / "model_metadata.json").write_text(
        json.dumps(metadata, indent=2), encoding="utf-8"
    )
    (run_dir / "evaluation_metrics.json").write_text(
        json.dumps(results, indent=2), encoding="utf-8"
    )

    report = "\n".join(
        [
            "# CalFAM Linear Regression Training Report",
            "",
            f"Run ID: `{run_id}`",
            f"Input: `{args.input}` → {source_label}",
            "",
            "**SYNTHETIC DATA PERFORMANCE ONLY**",
            "",
            "## Metrics",
            "",
            f"| Split | MAE | RMSE | R² | WAPE |",
            f"|-------|-----|------|----|------|",
            f"| Train | {train_metrics['MAE']:.2f} | {train_metrics['RMSE']:.2f} | {train_metrics['R2']:.4f} | {train_metrics['WAPE']:.4f} |",
            f"| Validation | {val_metrics['MAE']:.2f} | {val_metrics['RMSE']:.2f} | {val_metrics['R2']:.4f} | {val_metrics['WAPE']:.4f} |",
            f"| Test | {test_metrics['MAE']:.2f} | {test_metrics['RMSE']:.2f} | {test_metrics['R2']:.4f} | {test_metrics['WAPE']:.4f} |",
            "",
            "## Graphs",
            "",
            "- `01_actual_vs_predicted.png`",
            "- `02_prediction_error_distribution.png`",
            "- `03_residual_scatter.png`",
            "- `04_linear_feature_contributions.png`",
            "",
        ]
    )
    (run_dir / "evaluation_report.md").write_text(report, encoding="utf-8")
    shutil.copyfile(run_dir / "evaluation_report.md", REPORTS / "latest_run_report.md")

    summary = {
        "algorithm": "linear_regression",
        "validation": val_metrics,
        "test": test_metrics,
        "run_dir": str(run_dir),
        "graphs_dir": str(GRAPH_DIR),
        "prior_models_untouched": str(MODELS),
    }
    log("\n" + json.dumps(summary, indent=2))
    log(f"\n[done] Artifacts saved to {run_dir}")
    log("[done] Previous models/ directory was NOT overwritten.")


if __name__ == "__main__":
    main()
