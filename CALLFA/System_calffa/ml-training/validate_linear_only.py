"""
Static and focused checks for Linear-Regression-only training workflow.
Does NOT run full model training. Does NOT modify datasets.
"""
from __future__ import annotations

import ast
import hashlib
import json
from pathlib import Path

import pandas as pd

from prepare_features import FEATURE_COLUMNS, TARGET_COL, TRAIN_LABELS, VAL_LABELS, TEST_LABELS
from train_models import (
    CONTINUOUS_FEATURES,
    EXCEL_PATH,
    CSV_PATH,
    MODELS,
    build_linear_pipeline,
    build_preprocess,
    load_supervised,
    metrics_dict,
    verify_excel_csv_match,
)

ROOT = Path(__file__).resolve().parent
TRAIN_PY = ROOT / "train_models.py"


def file_sha256(path: Path) -> str:
    h = hashlib.sha256()
    h.update(path.read_bytes())
    return h.hexdigest()


def assert_no_forbidden_active_code(source: str) -> list[str]:
    errors: list[str] = []
    tree = ast.parse(source)
    forbidden_imports = {"Ridge", "RandomForestRegressor"}
    forbidden_name_hits = {
        "tune_ridge",
        "tune_rf",
        "predict_naive",
        "RandomForestRegressor",
        "Ridge",
    }

    for node in ast.walk(tree):
        if isinstance(node, ast.ImportFrom):
            for alias in node.names:
                if alias.name in forbidden_imports:
                    errors.append(f"Forbidden import: {alias.name}")
        if isinstance(node, ast.Name) and isinstance(node.ctx, ast.Load):
            if node.id in forbidden_name_hits:
                errors.append(f"Forbidden active name reference: {node.id}")
        if isinstance(node, ast.Attribute) and node.attr in {"feature_importances_"}:
            errors.append("Forbidden RF feature_importances_ usage")
    return errors


def main() -> None:
    errors: list[str] = []

    source = TRAIN_PY.read_text(encoding="utf-8")
    if "RandomForestRegressor" in source:
        errors.append("RandomForestRegressor still present in train_models.py")
    if "from sklearn.ensemble" in source:
        errors.append("sklearn.ensemble import still present")
    if "tune_ridge" in source or "tune_rf" in source:
        errors.append("tune_ridge/tune_rf still present")
    if "01_model_comparison_validation" in source:
        errors.append("model comparison graph still referenced")
    if "LinearRegression" not in source:
        errors.append("LinearRegression missing")
    if "Ridge" in source and "LinearRegression" in source:
        # allow word Ridge only if not imported — strict: any Ridge token is fail
        if "import" in source and "Ridge" in source:
            # already covered by AST; also catch "Ridge(" 
            if "Ridge(" in source or "import Ridge" in source or ", Ridge" in source:
                errors.append("Ridge still referenced")

    errors.extend(assert_no_forbidden_active_code(source))

    farmers = pd.read_csv(ROOT / "data" / "synthetic_farmers.csv")
    hist = pd.read_csv(ROOT / "data" / "synthetic_expense_records.csv")
    sup = pd.read_csv(CSV_PATH)
    if len(farmers) != 200:
        errors.append("farmers count")
    if len(hist) != 2200:
        errors.append("hist count")
    if len(sup) != 2000:
        errors.append("supervised count")

    if TRAIN_LABELS != {
        "2021-H2",
        "2022-H1",
        "2022-H2",
        "2023-H1",
        "2023-H2",
        "2024-H1",
        "2024-H2",
    }:
        errors.append("TRAIN_LABELS changed")
    if VAL_LABELS != {"2025-H1", "2025-H2"}:
        errors.append("VAL_LABELS changed")
    if TEST_LABELS != {"2026-H1"}:
        errors.append("TEST_LABELS changed")

    split_counts = sup["split"].value_counts().to_dict()
    if (
        split_counts.get("train") != 1400
        or split_counts.get("validation") != 400
        or split_counts.get("test") != 200
    ):
        errors.append(f"split counts unexpected: {split_counts}")

    if not EXCEL_PATH.exists():
        errors.append("technical Excel missing")
    else:
        try:
            match = verify_excel_csv_match()
            if not match.get("compared"):
                errors.append("excel/csv not compared")
            df, _ = load_supervised("excel")
            if len(df) != 2000:
                errors.append("excel load row count")
        except SystemExit as e:
            errors.append(f"excel load failed: {e}")

    X = sup.loc[sup["split"] == "train", FEATURE_COLUMNS].iloc[:20]
    y = sup.loc[sup["split"] == "train", TARGET_COL].iloc[:20].to_numpy(dtype=float)
    prep = build_preprocess()
    Xt = prep.fit_transform(X)
    if Xt.shape[0] != 20:
        errors.append("preprocess row mismatch")
    pipe = build_linear_pipeline()
    pipe.fit(X, y)
    pred = pipe.predict(X)
    m = metrics_dict(y, pred)
    for k in ("MAE", "RMSE", "R2", "WAPE"):
        if k not in m:
            errors.append(f"metric missing {k}")
    if not set(CONTINUOUS_FEATURES).issubset(FEATURE_COLUMNS):
        errors.append("continuous features not subset of FEATURE_COLUMNS")

    prior = MODELS / "expense_model.joblib"
    prior_hash = None
    if not prior.exists():
        errors.append("models/expense_model.joblib missing")
    else:
        prior_hash = file_sha256(prior)

    if errors:
        print("FAIL")
        for e in errors:
            print("-", e)
        raise SystemExit(1)

    print(
        json.dumps(
            {
                "status": "PASS",
                "active_algorithm": "linear_regression",
                "excel_input_ok": True,
                "chronological_split_unchanged": True,
                "prior_model_sha256": prior_hash,
                "full_training_not_executed": True,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
