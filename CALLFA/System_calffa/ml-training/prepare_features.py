"""
Build lag-safe supervised feature matrix from the synthetic expense panel.

Warm-up: period_index == 1 (2021-H1) — no supervised row.
Targets: period_index 2..11 → 200 × 10 = 2,000 supervised examples.

Features use only information from periods strictly before the target period.
No farmer_id numeric feature. No price-index features (official series pending).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

SEED = 20261119
ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"

FEATURE_COLUMNS = [
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

TARGET_COL = "target_total_expenses_php"

# Chronological splits by TARGET period_label
TRAIN_LABELS = {
    "2021-H2",
    "2022-H1",
    "2022-H2",
    "2023-H1",
    "2023-H2",
    "2024-H1",
    "2024-H2",
}
VAL_LABELS = {"2025-H1", "2025-H2"}
TEST_LABELS = {"2026-H1"}


def one_hot_planting(method: str) -> dict:
    return {
        "planting_method_sabog": 1.0 if method == "sabog" else 0.0,
        "planting_method_talok": 1.0 if method == "talok" else 0.0,
    }


def one_hot_irrigation(irr: str) -> dict:
    keys = [
        "irrigation_NIA",
        "irrigation_bugsok_waterpump",
        "irrigation_waterpump_irrigation",
        "irrigation_waterpump_ilog",
    ]
    out = {k: 0.0 for k in keys}
    map_key = {
        "NIA": "irrigation_NIA",
        "bugsok_waterpump": "irrigation_bugsok_waterpump",
        "waterpump_irrigation": "irrigation_waterpump_irrigation",
        "waterpump_ilog": "irrigation_waterpump_ilog",
    }.get(irr)
    if map_key:
        out[map_key] = 1.0
    return out


def build_supervised(records: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for farmer_id, g in records.groupby("synth_farmer_id", sort=True):
        g = g.sort_values("period_index").reset_index(drop=True)
        for i in range(1, len(g)):  # target rows start at index 1 (period 2)
            target = g.iloc[i]
            hist = g.iloc[:i]  # strictly before target
            prev = hist.iloc[-1]
            prev_prev = hist.iloc[-2] if len(hist) >= 2 else None

            area = float(prev["area_hectares"])
            prev_total = float(prev["total_expenses"])
            if prev_prev is not None:
                prev_prev_total = float(prev_prev["total_expenses"])
                has_lag2 = 1.0
                delta_prev = prev_total - prev_prev_total
            else:
                # Missing lag-2: impute with prev_total; flag has_lag2=0
                prev_prev_total = prev_total
                has_lag2 = 0.0
                delta_prev = 0.0

            roll_n = min(3, len(hist))
            roll3 = float(hist["total_expenses"].iloc[-roll_n:].mean())

            feat = {
                "synth_farmer_id": farmer_id,  # metadata only — not a model feature
                "target_period_index": int(target["period_index"]),
                "target_period_label": target["period_label"],
                "area_hectares": area,
                "prev_total_expenses": prev_total,
                "prev_prev_total_expenses": prev_prev_total,
                "prev_expenses_per_ha": prev_total / area if area > 0 else 0.0,
                "prev_fertilizer_cost": float(prev["total_fertilizer_cost"]),
                "prev_pesticide_cost": float(prev["total_pesticide_cost"]),
                # labor_related excludes transport & fuel (no double-count)
                "prev_labor_related_cost": float(prev["labor_related_cost"]),
                "prev_transport_cost": float(prev["transport_cost"]),
                "prev_fuel_cost": float(prev["fuel_cost"]),
                **one_hot_planting(str(prev["planting_method"])),
                **one_hot_irrigation(str(prev["irrigation_type"])),
                "period_index": float(target["period_index"]),
                "is_h1": float(target["is_h1"]),
                "n_hist_periods": float(len(hist)),
                "roll3_mean_total": roll3,
                "delta_prev": float(delta_prev),
                "has_lag2": has_lag2,
                TARGET_COL: float(target["total_expenses"]),
            }
            rows.append(feat)
    df = pd.DataFrame(rows)
    # Leakage sanity: target must not equal a feature that is same-period (N/A by construction)
    assert len(df) == 200 * 10, len(df)
    return df


def assign_split(label: str) -> str:
    if label in TRAIN_LABELS:
        return "train"
    if label in VAL_LABELS:
        return "validation"
    if label in TEST_LABELS:
        return "test"
    raise ValueError(f"Unexpected target label: {label}")


def main() -> None:
    records_path = DATA / "synthetic_expense_records.csv"
    if not records_path.exists():
        raise SystemExit("Run generate_dataset.py first.")

    records = pd.read_csv(records_path)
    supervised = build_supervised(records)
    supervised["split"] = supervised["target_period_label"].map(assign_split)

    out_path = DATA / "supervised_features.csv"
    supervised.to_csv(out_path, index=False)

    schema = {
        "target": TARGET_COL,
        "target_unit": "PHP",
        "target_definition": (
            "Total agricultural expenses for the target calendar six-month period"
        ),
        "feature_order": FEATURE_COLUMNS,
        "feature_units": {
            "area_hectares": "hectares",
            "prev_total_expenses": "PHP",
            "prev_prev_total_expenses": "PHP",
            "prev_expenses_per_ha": "PHP_per_hectare",
            "prev_fertilizer_cost": "PHP",
            "prev_pesticide_cost": "PHP",
            "prev_labor_related_cost": "PHP",
            "prev_transport_cost": "PHP",
            "prev_fuel_cost": "PHP",
            "planting_method_sabog": "indicator_0_1",
            "planting_method_talok": "indicator_0_1",
            "irrigation_NIA": "indicator_0_1",
            "irrigation_bugsok_waterpump": "indicator_0_1",
            "irrigation_waterpump_irrigation": "indicator_0_1",
            "irrigation_waterpump_ilog": "indicator_0_1",
            "period_index": "ordinal_half_year_from_2021_H1",
            "is_h1": "indicator_0_1",
            "n_hist_periods": "count",
            "roll3_mean_total": "PHP",
            "delta_prev": "PHP",
            "has_lag2": "indicator_0_1",
        },
        "missing_value_handling": {
            "prev_prev_total_expenses": "Impute with prev_total_expenses when only one prior period; has_lag2=0",
            "delta_prev": "Set to 0 when has_lag2=0",
            "categoricals": "One-hot from previous period methods; mutually exclusive within group",
        },
        "excluded_from_model_matrix": [
            "synth_farmer_id",
            "target_period_index",
            "target_period_label",
            "split",
        ],
        "no_price_index_features": True,
        "reason_no_price_index_features": (
            "Verified official historical series not attached; see references/SOURCES.md"
        ),
        "leakage_rules": [
            "Features use only rows with period_index < target period_index",
            "Target-period expenses and incomes are never used as features",
            "synth_farmer_id is metadata only, not a numeric predictor",
        ],
        "splits": {
            "train_target_labels": sorted(TRAIN_LABELS),
            "validation_target_labels": sorted(VAL_LABELS),
            "test_target_labels": sorted(TEST_LABELS),
        },
        "counts": {
            "n_supervised": int(len(supervised)),
            "n_train": int((supervised["split"] == "train").sum()),
            "n_validation": int((supervised["split"] == "validation").sum()),
            "n_test": int((supervised["split"] == "test").sum()),
        },
        "seed": SEED,
    }
    schema_path = DATA / "feature_schema_draft.json"
    schema_path.write_text(json.dumps(schema, indent=2), encoding="utf-8")

    print(json.dumps(schema["counts"], indent=2))
    print("Wrote", out_path)


if __name__ == "__main__":
    main()
