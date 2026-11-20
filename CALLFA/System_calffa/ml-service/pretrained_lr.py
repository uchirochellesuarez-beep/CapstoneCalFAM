"""
Pretrained Linear Regression inference (no fit / no Ridge / no RandomForest).

Loads the offline CalFAM expense_model.joblib artifact and predicts next-period
total agricultural expenses from a validated 21-feature vector.
"""
from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

# Repository-relative default: ml-training/runs/run_20261120_203925/expense_model.joblib
_ML_SERVICE_ROOT = Path(__file__).resolve().parent
_DEFAULT_ARTIFACT = (
    _ML_SERVICE_ROOT.parent
    / "ml-training"
    / "runs"
    / "run_20261120_203925"
    / "expense_model.joblib"
)

ENV_ARTIFACT_PATH = "CALFAM_PRETRAINED_LR_PATH"

# Fallback order only if artifact metadata is missing (should not happen for current joblib).
# Prefer feature_columns from the loaded artifact at runtime.
_FALLBACK_FEATURE_ORDER: list[str] = [
    "area_hectares",
    "prev_total_expenses",
    "prev_prev_total_expenses",
    "prev_expenses_per_ha",
    "prev_fertilizer_cost",
    "prev_pesticide_cost",
    "prev_labor_related_cost",
    "prev_transport_cost",
    "prev_fuel_cost",
    "planting_method_sabog",
    "planting_method_talok",
    "irrigation_NIA",
    "irrigation_bugsok_waterpump",
    "irrigation_waterpump_irrigation",
    "irrigation_waterpump_ilog",
    "period_index",
    "is_h1",
    "n_hist_periods",
    "roll3_mean_total",
    "delta_prev",
    "has_lag2",
]

MODEL_IDENTIFIER = "pretrained_linear_regression"
PERFORMANCE_LABEL = "SYNTHETIC DATA PERFORMANCE"
DISCLAIMER_EN = (
    "Prediction from a Linear Regression model trained on simulated agricultural "
    "expense data. Not guaranteed and not validated against real CALFFA farmer outcomes."
)
DISCLAIMER_PH = (
    "Hula mula sa Linear Regression na sinanay sa simulated na gastos. "
    "Hindi garantisado at hindi validated laban sa totoong CALFFA farmers."
)


class PretrainedModelError(Exception):
    """Raised when the artifact cannot be loaded or is incompatible."""

    def __init__(self, error_code: str, message: str):
        self.error_code = error_code
        super().__init__(message)


class FeatureValidationError(Exception):
    """Raised when the request feature payload is invalid."""

    def __init__(self, error_code: str, message: str):
        self.error_code = error_code
        super().__init__(message)


def resolve_artifact_path(explicit: str | Path | None = None) -> Path:
    if explicit is not None and str(explicit).strip():
        return Path(explicit).expanduser().resolve()
    env = (os.environ.get(ENV_ARTIFACT_PATH) or "").strip()
    if env:
        return Path(env).expanduser().resolve()
    return _DEFAULT_ARTIFACT.resolve()


def _assert_no_fit_pipeline(pipe: Pipeline) -> None:
    """Ensure we only keep inference-ready LinearRegression pipelines."""
    if "model" not in pipe.named_steps or "prep" not in pipe.named_steps:
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            "Artifact pipeline must contain 'prep' and 'model' steps.",
        )
    model = pipe.named_steps["model"]
    if not isinstance(model, LinearRegression):
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            f"Expected LinearRegression estimator, got {type(model).__name__}.",
        )
    if not hasattr(model, "coef_"):
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            "LinearRegression estimator is not fitted (missing coef_).",
        )
    prep = pipe.named_steps["prep"]
    # ColumnTransformer stores fitted state on transformers_
    if not hasattr(prep, "transformers_"):
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            "Preprocessing ColumnTransformer is not fitted.",
        )


def load_artifact(path: Path | None = None) -> dict[str, Any]:
    artifact_path = resolve_artifact_path(path)
    if not artifact_path.is_file():
        raise PretrainedModelError(
            "MODEL_NOT_LOADED",
            f"Pretrained model artifact not found: {artifact_path}",
        )
    try:
        obj = joblib.load(artifact_path)
    except Exception as exc:  # noqa: BLE001 — surface load failures as API errors
        raise PretrainedModelError(
            "MODEL_NOT_LOADED",
            f"Failed to load pretrained model artifact: {exc}",
        ) from exc

    if not isinstance(obj, dict) or "estimator" not in obj:
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            "Artifact must be a dict with an 'estimator' pipeline.",
        )

    model_type = str(obj.get("model_type") or "")
    if model_type and model_type != "linear_regression":
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            f"Unsupported model_type={model_type!r}; expected 'linear_regression'.",
        )

    pipe = obj["estimator"]
    if not isinstance(pipe, Pipeline):
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            f"estimator must be a sklearn Pipeline, got {type(pipe).__name__}.",
        )
    _assert_no_fit_pipeline(pipe)

    feature_columns = list(obj.get("feature_columns") or [])
    if not feature_columns:
        feature_columns = list(_FALLBACK_FEATURE_ORDER)
    if len(feature_columns) != 21:
        raise PretrainedModelError(
            "INCOMPATIBLE_ARTIFACT",
            f"Expected 21 feature columns, found {len(feature_columns)}.",
        )

    return {
        "artifact_path": str(artifact_path),
        "estimator": pipe,
        "feature_columns": feature_columns,
        "target": str(obj.get("target") or "target_total_expenses_php"),
        "seed": obj.get("seed"),
        "clip_nonnegative": bool(obj.get("clip_nonnegative", True)),
        "run_id": obj.get("run_id") or artifact_path.parent.name.replace("run_", ""),
        "performance_label": str(obj.get("performance_label") or PERFORMANCE_LABEL),
        "model_type": "linear_regression",
    }


@lru_cache(maxsize=4)
def get_loaded_model(path_str: str | None = None) -> dict[str, Any]:
    """Cache loaded artifact by resolved path string. Never fits."""
    path = resolve_artifact_path(path_str)
    return load_artifact(path)


def clear_model_cache() -> None:
    get_loaded_model.cache_clear()


def validate_feature_vector(
    feature_vector: Any,
    feature_columns: list[str],
) -> dict[str, float]:
    if feature_vector is None:
        raise FeatureValidationError(
            "MISSING_FEATURE_VECTOR",
            "Request must include 'feature_vector'.",
        )
    if not isinstance(feature_vector, dict):
        raise FeatureValidationError(
            "INCORRECT_FEATURE_TYPE",
            "feature_vector must be a JSON object mapping feature name to number.",
        )

    missing = [c for c in feature_columns if c not in feature_vector]
    if missing:
        raise FeatureValidationError(
            "MISSING_FEATURE",
            f"Missing required feature(s): {', '.join(missing)}",
        )

    extra = [k for k in feature_vector.keys() if k not in feature_columns]
    # Extra keys are rejected to avoid silent misuse / wrong contracts
    if extra:
        raise FeatureValidationError(
            "UNEXPECTED_FEATURE",
            f"Unexpected feature key(s): {', '.join(sorted(map(str, extra)))}",
        )

    if len(feature_vector) != len(feature_columns):
        raise FeatureValidationError(
            "INCORRECT_FEATURE_COUNT",
            f"Expected exactly {len(feature_columns)} features, got {len(feature_vector)}.",
        )

    cleaned: dict[str, float] = {}
    for name in feature_columns:
        raw = feature_vector[name]
        if isinstance(raw, bool) or raw is None or isinstance(raw, (str, list, dict)):
            raise FeatureValidationError(
                "INCORRECT_FEATURE_TYPE",
                f"Feature {name!r} must be a finite number, got {type(raw).__name__}.",
            )
        try:
            val = float(raw)
        except (TypeError, ValueError) as exc:
            raise FeatureValidationError(
                "INCORRECT_FEATURE_TYPE",
                f"Feature {name!r} must be a finite number.",
            ) from exc
        if not np.isfinite(val):
            raise FeatureValidationError(
                "NON_FINITE_VALUE",
                f"Feature {name!r} must be finite (got {val!r}).",
            )
        cleaned[name] = float(val)

    return cleaned


def _period_label_from_index(period_index: float) -> str | None:
    """Map training-style ordinal (1=2021-H1) to label when in known range."""
    try:
        pi = int(period_index)
    except (TypeError, ValueError):
        return None
    if pi < 1:
        return None
    year = 2021 + (pi - 1) // 2
    half = "H1" if (pi % 2) == 1 else "H2"
    return f"{year}-{half}"


def predict_pretrained_lr(
    feature_vector: dict[str, Any],
    *,
    forecast_period: str | None = None,
    farmer_id: int | None = None,
    artifact_path: str | None = None,
) -> dict[str, Any]:
    """
    Run inference with the saved Pipeline (StandardScaler + LinearRegression).
    Does not call fit().
    """
    try:
        bundle = get_loaded_model(artifact_path)
    except PretrainedModelError:
        raise
    except Exception as exc:  # noqa: BLE001
        raise PretrainedModelError(
            "MODEL_NOT_LOADED",
            f"Unable to load pretrained model: {exc}",
        ) from exc

    cols: list[str] = bundle["feature_columns"]
    cleaned = validate_feature_vector(feature_vector, cols)

    # Build one-row frame in exact training order for ColumnTransformer string columns
    X = pd.DataFrame([[cleaned[c] for c in cols]], columns=cols)

    pipe: Pipeline = bundle["estimator"]
    # Guard: inference only — never fit
    raw_pred = pipe.predict(X)
    if getattr(raw_pred, "ndim", 1) == 0:
        value = float(raw_pred)
    else:
        value = float(np.asarray(raw_pred).reshape(-1)[0])

    if not np.isfinite(value):
        raise FeatureValidationError(
            "NON_FINITE_PREDICTION",
            "Model produced a non-finite prediction.",
        )

    raw_value = float(value)
    clip_applied = False
    if bundle["clip_nonnegative"] and value < 0:
        value = 0.0
        clip_applied = True

    # Round to nearest 10 PHP for consistency with existing service display habits
    predicted = float(max(0.0, round(value / 10.0) * 10.0))

    period_index = cleaned.get("period_index")
    is_h1 = cleaned.get("is_h1")
    derived_period = _period_label_from_index(period_index) if period_index is not None else None
    period_out = forecast_period or derived_period

    return {
        "ok": True,
        "model_name": MODEL_IDENTIFIER,
        "ml_engine": MODEL_IDENTIFIER,
        "model_type": "linear_regression",
        "model_run_id": bundle["run_id"],
        "model_artifact_path": bundle["artifact_path"],
        "target": bundle["target"],
        "predicted_total_expenses": predicted,
        "predicted_total_expenses_raw": raw_value,
        "clip_nonnegative_applied": clip_applied,
        "forecast_period": period_out,
        "forecast_period_index": period_index,
        "forecast_is_h1": is_h1,
        "farmer_id": farmer_id,
        "feature_order": cols,
        "n_features": len(cols),
        "performance_label": bundle["performance_label"],
        "trained_on_simulated_data": True,
        "disclaimer_en": DISCLAIMER_EN,
        "disclaimer_ph": DISCLAIMER_PH,
        "method_description_ph": (
            "Pretrained Linear Regression + fitted StandardScaler "
            "(synthetic training). Walang online Ridge/RandomForest/OLS."
        ),
    }
