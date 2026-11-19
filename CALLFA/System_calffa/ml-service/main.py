"""CALFFA expense forecasting ML API (scikit-learn). Run: uvicorn main:app --host 127.0.0.1 --port 5001"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Any, Optional

from forecaster import forecast_next_total_expenses
from pretrained_lr import (
    FeatureValidationError,
    PretrainedModelError,
    get_loaded_model,
    predict_pretrained_lr,
    resolve_artifact_path,
)

app = FastAPI(title="CALFFA ML Service", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ExpenseForecastRequest(BaseModel):
    total_expenses: list[float] = Field(..., min_length=1, description="Cronological total_expenses series")


class PretrainedLrRequest(BaseModel):
    feature_vector: dict[str, Any] = Field(
        ...,
        description="Exact 21 training features (name → number). No silent defaults.",
    )
    forecast_period: Optional[str] = Field(
        default=None,
        description="Optional label for the target six-month period (e.g. 2026-H2)",
    )
    farmer_id: Optional[int] = Field(default=None, description="Optional farmer id for tracing")
    model_run_id: Optional[str] = Field(
        default=None,
        description="Optional expected run id; rejected if it does not match loaded artifact",
    )


@app.get("/health")
def health():
    return {"status": "ok", "service": "calffa-ml"}


@app.post("/forecast/expenses")
def post_forecast_expenses(body: ExpenseForecastRequest):
    """Legacy online Ridge/RandomForest path — unchanged."""
    return forecast_next_total_expenses(body.total_expenses)


@app.get("/forecast/expenses/pretrained-lr/status")
def pretrained_lr_status():
    """Report whether the pretrained Linear Regression artifact is loadable."""
    path = resolve_artifact_path()
    try:
        bundle = get_loaded_model(str(path))
        return {
            "ok": True,
            "model_name": "pretrained_linear_regression",
            "model_run_id": bundle["run_id"],
            "model_artifact_path": bundle["artifact_path"],
            "n_features": len(bundle["feature_columns"]),
            "feature_order": bundle["feature_columns"],
            "performance_label": bundle["performance_label"],
            "trained_on_simulated_data": True,
        }
    except PretrainedModelError as exc:
        return {
            "ok": False,
            "error_code": exc.error_code,
            "error": str(exc),
            "model_artifact_path": str(path),
        }


@app.post("/forecast/expenses/pretrained-lr")
def post_forecast_expenses_pretrained_lr(body: PretrainedLrRequest):
    """
    Standalone pretrained Linear Regression inference.
    Does not fit/retrain. Does not use Ridge, RandomForest, or OLS.
    """
    try:
        if body.model_run_id:
            path = resolve_artifact_path()
            bundle = get_loaded_model(str(path))
            if str(body.model_run_id) != str(bundle["run_id"]):
                return {
                    "ok": False,
                    "error_code": "MODEL_RUN_MISMATCH",
                    "error": (
                        f"Requested model_run_id={body.model_run_id!r} does not match "
                        f"loaded run_id={bundle['run_id']!r}."
                    ),
                }
        return predict_pretrained_lr(
            body.feature_vector,
            forecast_period=body.forecast_period,
            farmer_id=body.farmer_id,
        )
    except FeatureValidationError as exc:
        return {"ok": False, "error_code": exc.error_code, "error": str(exc)}
    except PretrainedModelError as exc:
        return {"ok": False, "error_code": exc.error_code, "error": str(exc)}
