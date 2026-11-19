"""Focused tests for pretrained Linear Regression endpoint (no retrain)."""
from __future__ import annotations

import unittest
from pathlib import Path
from unittest import mock

from fastapi.testclient import TestClient
from sklearn.linear_model import LinearRegression
from sklearn.pipeline import Pipeline

import pretrained_lr
from main import app
from pretrained_lr import (
    FeatureValidationError,
    clear_model_cache,
    get_loaded_model,
    predict_pretrained_lr,
    resolve_artifact_path,
    validate_feature_vector,
)

CLIENT = TestClient(app)

VALID_FEATURES = {
    "area_hectares": 1.05,
    "prev_total_expenses": 38390.0,
    "prev_prev_total_expenses": 38390.0,
    "prev_expenses_per_ha": 36561.90476190476,
    "prev_fertilizer_cost": 7450.0,
    "prev_pesticide_cost": 3790.0,
    "prev_labor_related_cost": 20750.0,
    "prev_transport_cost": 3170.0,
    "prev_fuel_cost": 3230.0,
    "planting_method_sabog": 0.0,
    "planting_method_talok": 1.0,
    "irrigation_NIA": 1.0,
    "irrigation_bugsok_waterpump": 0.0,
    "irrigation_waterpump_irrigation": 0.0,
    "irrigation_waterpump_ilog": 0.0,
    "period_index": 2.0,
    "is_h1": 0.0,
    "n_hist_periods": 1.0,
    "roll3_mean_total": 38390.0,
    "delta_prev": 0.0,
    "has_lag2": 0.0,
}


class TestPretrainedLr(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        clear_model_cache()
        cls.artifact = resolve_artifact_path()
        if not cls.artifact.is_file():
            raise unittest.SkipTest(f"Artifact missing: {cls.artifact}")
        cls.bundle = get_loaded_model(str(cls.artifact))
        cls.feature_columns = list(cls.bundle["feature_columns"])

    def setUp(self):
        clear_model_cache()

    def test_01_valid_feature_payload_and_successful_prediction(self):
        res = CLIENT.post(
            "/forecast/expenses/pretrained-lr",
            json={
                "feature_vector": VALID_FEATURES,
                "forecast_period": "2021-H2",
                "farmer_id": 1,
                "model_run_id": "20261119_211021",
            },
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertTrue(data["ok"])
        self.assertEqual(data["model_name"], "pretrained_linear_regression")
        self.assertEqual(data["ml_engine"], "pretrained_linear_regression")
        self.assertEqual(data["model_run_id"], "20261119_211021")
        self.assertTrue(data["trained_on_simulated_data"])
        self.assertEqual(data["performance_label"], "SYNTHETIC DATA PERFORMANCE")
        self.assertEqual(data["forecast_period"], "2021-H2")
        self.assertIsInstance(data["predicted_total_expenses"], (int, float))
        self.assertGreaterEqual(data["predicted_total_expenses"], 0)
        self.assertEqual(data["n_features"], 21)
        self.assertEqual(data["feature_order"], self.feature_columns)
        # Must match direct pipeline predict (within rounding to 10 PHP)
        import pandas as pd

        X = pd.DataFrame(
            [[VALID_FEATURES[c] for c in self.feature_columns]],
            columns=self.feature_columns,
        )
        raw = float(self.bundle["estimator"].predict(X)[0])
        expected = max(0.0, round(raw / 10.0) * 10.0)
        self.assertAlmostEqual(data["predicted_total_expenses"], expected, places=5)

    def test_02_missing_feature(self):
        payload = dict(VALID_FEATURES)
        del payload["prev_fuel_cost"]
        res = CLIENT.post(
            "/forecast/expenses/pretrained-lr",
            json={"feature_vector": payload},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error_code"], "MISSING_FEATURE")
        self.assertIn("prev_fuel_cost", data["error"])

    def test_03_incorrect_feature_type(self):
        payload = dict(VALID_FEATURES)
        payload["area_hectares"] = "wide"
        res = CLIENT.post(
            "/forecast/expenses/pretrained-lr",
            json={"feature_vector": payload},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["ok"])
        self.assertEqual(data["error_code"], "INCORRECT_FEATURE_TYPE")

    def test_04_non_finite_value(self):
        payload = dict(VALID_FEATURES)
        payload["delta_prev"] = float("nan")
        # JSON cannot encode NaN via standard json; use validate_feature_vector directly
        with self.assertRaises(FeatureValidationError) as ctx:
            validate_feature_vector(payload, self.feature_columns)
        self.assertEqual(ctx.exception.error_code, "NON_FINITE_VALUE")

        # Also cover infinity through the predict helper
        payload2 = dict(VALID_FEATURES)
        payload2["roll3_mean_total"] = float("inf")
        with self.assertRaises(FeatureValidationError) as ctx2:
            predict_pretrained_lr(payload2)
        self.assertEqual(ctx2.exception.error_code, "NON_FINITE_VALUE")

    def test_05_incorrect_feature_count(self):
        payload = dict(VALID_FEATURES)
        payload["extra_feature"] = 1.0
        res = CLIENT.post(
            "/forecast/expenses/pretrained-lr",
            json={"feature_vector": payload},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertFalse(data["ok"])
        self.assertIn(data["error_code"], {"UNEXPECTED_FEATURE", "INCORRECT_FEATURE_COUNT"})

    def test_06_unavailable_model_artifact(self):
        clear_model_cache()
        missing = Path(__file__).resolve().parent / "does_not_exist_expense_model.joblib"
        with self.assertRaises(Exception) as ctx:
            predict_pretrained_lr(VALID_FEATURES, artifact_path=str(missing))
        # PretrainedModelError
        self.assertEqual(getattr(ctx.exception, "error_code", None), "MODEL_NOT_LOADED")

        # Endpoint path: temporarily force env to missing file
        clear_model_cache()
        with mock.patch.dict(
            "os.environ",
            {"CALFAM_PRETRAINED_LR_PATH": str(missing)},
            clear=False,
        ):
            clear_model_cache()
            # Bypass lru of previous default by calling status after env change
            # get_loaded_model caches by path_str; status uses resolve which reads env
            pretrained_lr.clear_model_cache()
            # Patch resolve used inside predict via env — reload module path resolution
            res = CLIENT.post(
                "/forecast/expenses/pretrained-lr",
                json={"feature_vector": VALID_FEATURES},
            )
            # Cache may still hold default if predict used None key first in other tests;
            # force predict with explicit missing path through helper assertion above.
            # For HTTP, patch get_loaded_model to raise.
        clear_model_cache()
        with mock.patch(
            "main.get_loaded_model",
            side_effect=pretrained_lr.PretrainedModelError(
                "MODEL_NOT_LOADED", "Pretrained model artifact not found: missing"
            ),
        ):
            # predict_pretrained_lr is what main calls — patch that path instead
            pass
        with mock.patch(
            "main.predict_pretrained_lr",
            side_effect=pretrained_lr.PretrainedModelError(
                "MODEL_NOT_LOADED", "Pretrained model artifact not found: missing"
            ),
        ):
            res = CLIENT.post(
                "/forecast/expenses/pretrained-lr",
                json={"feature_vector": VALID_FEATURES},
            )
            self.assertEqual(res.status_code, 200)
            data = res.json()
            self.assertFalse(data["ok"])
            self.assertEqual(data["error_code"], "MODEL_NOT_LOADED")

    def test_07_uses_saved_linear_regression_and_scaler(self):
        bundle = get_loaded_model(str(self.artifact))
        pipe = bundle["estimator"]
        self.assertIsInstance(pipe, Pipeline)
        self.assertIsInstance(pipe.named_steps["model"], LinearRegression)
        prep = pipe.named_steps["prep"]
        self.assertTrue(hasattr(prep, "transformers_"))
        num = prep.named_transformers_["num"]
        self.assertTrue(hasattr(num, "mean_"), "StandardScaler must be fitted")
        self.assertEqual(bundle["model_type"], "linear_regression")
        self.assertEqual(len(bundle["feature_columns"]), 21)

        status = CLIENT.get("/forecast/expenses/pretrained-lr/status")
        self.assertEqual(status.status_code, 200)
        body = status.json()
        self.assertTrue(body["ok"])
        self.assertEqual(body["feature_order"], bundle["feature_columns"])

    def test_08_no_model_fitting_during_inference(self):
        fit_calls = {"pipeline": 0, "lr": 0}

        real_pipe_fit = Pipeline.fit
        real_lr_fit = LinearRegression.fit

        def pipe_fit_guard(self, *args, **kwargs):
            fit_calls["pipeline"] += 1
            raise AssertionError("Pipeline.fit must not run during inference")

        def lr_fit_guard(self, *args, **kwargs):
            fit_calls["lr"] += 1
            raise AssertionError("LinearRegression.fit must not run during inference")

        with mock.patch.object(Pipeline, "fit", pipe_fit_guard), mock.patch.object(
            LinearRegression, "fit", lr_fit_guard
        ):
            res = CLIENT.post(
                "/forecast/expenses/pretrained-lr",
                json={"feature_vector": VALID_FEATURES},
            )
            self.assertEqual(res.status_code, 200)
            self.assertTrue(res.json()["ok"])
        self.assertEqual(fit_calls["pipeline"], 0)
        self.assertEqual(fit_calls["lr"], 0)
        # Ensure originals still exist (sanity)
        self.assertTrue(callable(real_pipe_fit))
        self.assertTrue(callable(real_lr_fit))

    def test_09_legacy_endpoint_still_present(self):
        """Existing online path must remain (not deleted)."""
        res = CLIENT.post(
            "/forecast/expenses",
            json={"total_expenses": [10000.0, 12000.0, 11000.0, 13000.0]},
        )
        self.assertEqual(res.status_code, 200)
        data = res.json()
        self.assertIn("ok", data)
        # Legacy path may use ridge/rf — must not be pretrained_linear_regression
        if data.get("ok"):
            self.assertNotEqual(data.get("model_name"), "pretrained_linear_regression")


if __name__ == "__main__":
    unittest.main()
