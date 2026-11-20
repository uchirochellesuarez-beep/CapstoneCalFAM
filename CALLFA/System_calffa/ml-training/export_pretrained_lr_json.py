"""
Export existing pretrained Linear Regression joblib → versioned JSON for Node inference.

Does NOT retrain. Does NOT overwrite the joblib artifact.
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

ROOT = Path(__file__).resolve().parent
DEFAULT_JOBLIB = ROOT / "runs" / "run_20261120_203925" / "expense_model.joblib"
DEFAULT_OUT = (
    ROOT.parent / "backend" / "ml-artifacts" / "pretrained_lr_20261120_203925.json"
)
DEFAULT_FIXTURES = (
    ROOT.parent / "backend" / "ml-artifacts" / "pretrained_lr_parity_fixtures.json"
)

SCHEMA_VERSION = 1
DISCLAIMER_EN = (
    "Prediction from a Linear Regression model trained on simulated agricultural "
    "expense data. Not guaranteed and not validated against real CALFFA farmer outcomes."
)
DISCLAIMER_PH = (
    "Hula mula sa Linear Regression na sinanay sa simulated na gastos. "
    "Hindi garantisado at hindi validated laban sa totoong CALFFA farmers."
)


def _strip_ct_prefix(name: str) -> str:
    # e.g. num__area_hectares → area_hectares
    if "__" in name:
        return name.split("__", 1)[1]
    return name


def export_artifact(joblib_path: Path) -> dict[str, Any]:
    obj = joblib.load(joblib_path)
    if not isinstance(obj, dict) or "estimator" not in obj:
        raise SystemExit("Artifact must be a dict with an 'estimator' pipeline.")

    pipe = obj["estimator"]
    if not isinstance(pipe, Pipeline):
        raise SystemExit(f"estimator must be Pipeline, got {type(pipe).__name__}")
    if "prep" not in pipe.named_steps or "model" not in pipe.named_steps:
        raise SystemExit("Pipeline must contain 'prep' and 'model' steps.")

    prep = pipe.named_steps["prep"]
    model = pipe.named_steps["model"]
    if not isinstance(prep, ColumnTransformer):
        raise SystemExit(f"prep must be ColumnTransformer, got {type(prep).__name__}")
    if not isinstance(model, LinearRegression):
        raise SystemExit(f"model must be LinearRegression, got {type(model).__name__}")

    input_feature_order = list(obj.get("feature_columns") or [])
    if len(input_feature_order) != 21:
        raise SystemExit(f"Expected 21 input features, got {len(input_feature_order)}")

    by_name = {name: (trans, cols) for name, trans, cols in prep.transformers_}
    if "num" not in by_name or "pass" not in by_name:
        raise SystemExit("ColumnTransformer must have 'num' and 'pass' transformers.")

    scaler, scaled_cols = by_name["num"]
    scaled_feature_order = list(scaled_cols)
    if not hasattr(scaler, "mean_") or not hasattr(scaler, "scale_"):
        raise SystemExit("num transformer must be a fitted StandardScaler.")
    if len(scaled_feature_order) != 13:
        raise SystemExit(f"Expected 13 scaled features, got {len(scaled_feature_order)}")

    _pass_trans, pass_cols = by_name["pass"]
    passthrough_feature_order = list(pass_cols)
    if len(passthrough_feature_order) != 8:
        raise SystemExit(
            f"Expected 8 passthrough features, got {len(passthrough_feature_order)}"
        )

    # Confirm transformed names match scaled + passthrough (coef alignment)
    out_names = [_strip_ct_prefix(n) for n in prep.get_feature_names_out()]
    expected_transformed = scaled_feature_order + passthrough_feature_order
    if out_names != expected_transformed:
        raise SystemExit(
            "Transformed feature order mismatch.\n"
            f"CT out: {out_names}\n"
            f"expected: {expected_transformed}"
        )

    coef = np.asarray(model.coef_, dtype=float).reshape(-1)
    if coef.shape != (21,):
        raise SystemExit(f"Expected coef_ shape (21,), got {coef.shape}")

    mean = [float(x) for x in np.asarray(scaler.mean_, dtype=float).reshape(-1)]
    scale = [float(x) for x in np.asarray(scaler.scale_, dtype=float).reshape(-1)]
    if any(abs(s) < 1e-15 for s in scale):
        raise SystemExit("StandardScaler has a near-zero scale_ entry.")

    run_id = str(obj.get("run_id") or joblib_path.parent.name.replace("run_", ""))

    return {
        "schema_version": SCHEMA_VERSION,
        "run_id": run_id,
        "model_type": "linear_regression",
        "model_name": "pretrained_linear_regression",
        "target": str(obj.get("target") or "target_total_expenses_php"),
        "seed": obj.get("seed"),
        "clip_nonnegative": bool(obj.get("clip_nonnegative", True)),
        "round_to_nearest": 10,
        "performance_label": str(
            obj.get("performance_label") or "SYNTHETIC DATA PERFORMANCE"
        ),
        "trained_on_simulated_data": True,
        "disclaimer_en": DISCLAIMER_EN,
        "disclaimer_ph": DISCLAIMER_PH,
        "input_feature_order": input_feature_order,
        "scaled_feature_order": scaled_feature_order,
        "passthrough_feature_order": passthrough_feature_order,
        "transformed_feature_order": expected_transformed,
        "scaler": {
            "with_mean": True,
            "with_std": True,
            "mean": mean,
            "scale": scale,
        },
        "intercept": float(model.intercept_),
        "coefficients": [float(x) for x in coef],
        "source_artifact": str(joblib_path.as_posix()),
        "notes": [
            "coefficients are aligned to transformed_feature_order "
            "(scaled continuous first, then passthrough), NOT input_feature_order.",
            "Post-process: clip <0 to 0 when clip_nonnegative, then round to nearest PHP 10.",
        ],
    }


def _base_vector(input_order: list[str]) -> dict[str, float]:
    return {name: 0.0 for name in input_order}


def build_parity_cases(artifact: dict[str, Any], pipe: Pipeline) -> list[dict[str, Any]]:
    cols = artifact["input_feature_order"]

    def predict_py(fv: dict[str, float]) -> tuple[float, float, bool]:
        X = pd.DataFrame([[fv[c] for c in cols]], columns=cols)
        raw = float(np.asarray(pipe.predict(X), dtype=float).reshape(-1)[0])
        clip_applied = False
        value = raw
        if artifact["clip_nonnegative"] and value < 0:
            value = 0.0
            clip_applied = True
        rounded = float(max(0.0, round(value / 10.0) * 10.0))
        return raw, rounded, clip_applied

    cases: list[dict[str, Any]] = []

    # 1) Valid standard / realistic
    v1 = _base_vector(cols)
    v1.update(
        {
            "area_hectares": 1.5,
            "prev_total_expenses": 85060.0,
            "prev_prev_total_expenses": 85060.0,
            "prev_expenses_per_ha": 85060.0 / 1.5,
            "prev_fertilizer_cost": 3000.0,
            "prev_pesticide_cost": 1000.0,
            "prev_labor_related_cost": 5000.0,
            "prev_transport_cost": 500.0,
            "prev_fuel_cost": 200.0,
            "planting_method_sabog": 1.0,
            "irrigation_NIA": 1.0,
            "period_index": 13.0,
            "is_h1": 1.0,
            "n_hist_periods": 1.0,
            "roll3_mean_total": 85060.0,
            "delta_prev": 0.0,
            "has_lag2": 0.0,
        }
    )
    raw, rounded, clipped = predict_py(v1)
    cases.append(
        {
            "id": "standard_realistic",
            "feature_vector": v1,
            "expected_raw": raw,
            "expected_rounded": rounded,
            "expected_clip_applied": clipped,
        }
    )

    # 2) Another realistic (talok / waterpump, lag2)
    v2 = _base_vector(cols)
    v2.update(
        {
            "area_hectares": 0.75,
            "prev_total_expenses": 42000.0,
            "prev_prev_total_expenses": 39000.0,
            "prev_expenses_per_ha": 42000.0 / 0.75,
            "prev_fertilizer_cost": 8000.0,
            "prev_pesticide_cost": 2500.0,
            "prev_labor_related_cost": 18000.0,
            "prev_transport_cost": 2200.0,
            "prev_fuel_cost": 1500.0,
            "planting_method_talok": 1.0,
            "irrigation_waterpump_irrigation": 1.0,
            "period_index": 12.0,
            "is_h1": 0.0,
            "n_hist_periods": 4.0,
            "roll3_mean_total": 40000.0,
            "delta_prev": 3000.0,
            "has_lag2": 1.0,
        }
    )
    raw, rounded, clipped = predict_py(v2)
    cases.append(
        {
            "id": "realistic_talok_lag2",
            "feature_vector": v2,
            "expected_raw": raw,
            "expected_rounded": rounded,
            "expected_clip_applied": clipped,
        }
    )

    # 3) Zero expense categories (still need area > 0 for realism but allowed as zeros in features)
    v3 = _base_vector(cols)
    v3.update(
        {
            "area_hectares": 1.0,
            "period_index": 8.0,
            "is_h1": 0.0,
            "n_hist_periods": 2.0,
            "planting_method_sabog": 1.0,
            "irrigation_bugsok_waterpump": 1.0,
            "has_lag2": 0.0,
        }
    )
    raw, rounded, clipped = predict_py(v3)
    cases.append(
        {
            "id": "zero_expense_categories",
            "feature_vector": v3,
            "expected_raw": raw,
            "expected_rounded": rounded,
            "expected_clip_applied": clipped,
        }
    )

    # 4) Boundary / all zeros → expect clip
    v4 = _base_vector(cols)
    raw, rounded, clipped = predict_py(v4)
    cases.append(
        {
            "id": "all_zeros_clip",
            "feature_vector": v4,
            "expected_raw": raw,
            "expected_rounded": rounded,
            "expected_clip_applied": clipped,
        }
    )

    # 5) Large values
    v5 = dict(v1)
    v5["prev_total_expenses"] = 1_000_000.0
    v5["prev_prev_total_expenses"] = 900_000.0
    v5["prev_expenses_per_ha"] = 1_000_000.0 / 1.5
    v5["roll3_mean_total"] = 950_000.0
    v5["delta_prev"] = 100_000.0
    v5["has_lag2"] = 1.0
    raw, rounded, clipped = predict_py(v5)
    cases.append(
        {
            "id": "boundary_large",
            "feature_vector": v5,
            "expected_raw": raw,
            "expected_rounded": rounded,
            "expected_clip_applied": clipped,
        }
    )

    return cases


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--input", type=Path, default=DEFAULT_JOBLIB)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUT)
    parser.add_argument("--fixtures", type=Path, default=DEFAULT_FIXTURES)
    args = parser.parse_args()

    if not args.input.is_file():
        raise SystemExit(f"Joblib not found: {args.input}")

    artifact = export_artifact(args.input)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(json.dumps(artifact, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.output}")

    pipe = joblib.load(args.input)["estimator"]
    cases = build_parity_cases(artifact, pipe)
    fixtures = {
        "run_id": artifact["run_id"],
        "schema_version": artifact["schema_version"],
        "artifact_path": str(args.output.as_posix()),
        "raw_abs_tolerance": 1e-6,
        "cases": cases,
        "invalid_cases": [
            {
                "id": "missing_feature",
                "feature_vector": {
                    k: 0.0
                    for k in artifact["input_feature_order"]
                    if k != "area_hectares"
                },
                "expected_error_code": "MISSING_FEATURE",
            },
            {
                "id": "extra_feature",
                "feature_vector": {
                    **{k: 0.0 for k in artifact["input_feature_order"]},
                    "extra_col": 1.0,
                },
                "expected_error_code": "UNEXPECTED_FEATURE",
            },
            {
                "id": "non_finite",
                "feature_vector": {
                    **{k: 0.0 for k in artifact["input_feature_order"]},
                    "area_hectares": float("nan"),
                },
                "expected_error_code": "NON_FINITE_VALUE",
            },
        ],
    }
    # JSON cannot store NaN — encode as null + flag
    for inv in fixtures["invalid_cases"]:
        fv = inv["feature_vector"]
        for k, v in list(fv.items()):
            if isinstance(v, float) and not np.isfinite(v):
                fv[k] = None
                inv["null_means_nan"] = True

    args.fixtures.parent.mkdir(parents=True, exist_ok=True)
    args.fixtures.write_text(json.dumps(fixtures, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {args.fixtures} ({len(cases)} parity cases)")


if __name__ == "__main__":
    main()
