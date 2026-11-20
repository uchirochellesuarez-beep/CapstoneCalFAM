"""
Subsample existing synthetic panel to N farmers (default 50).

Does not invent new cost physics — keeps rows from generate_dataset output.
Writes CSVs in place under data/ (after optional backup).
"""
from __future__ import annotations

import argparse
import json
import shutil
from datetime import datetime
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
SEED = 20261119


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--n-farmers", type=int, default=50)
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--backup", action="store_true", default=True)
    args = parser.parse_args()

    farmers_path = DATA / "synthetic_farmers.csv"
    expenses_path = DATA / "synthetic_expense_records.csv"
    if not farmers_path.exists() or not expenses_path.exists():
        raise SystemExit("Missing synthetic_farmers.csv or synthetic_expense_records.csv")

    farmers = pd.read_csv(farmers_path)
    expenses = pd.read_csv(expenses_path)
    n = int(args.n_farmers)
    if n < 5:
        raise SystemExit("--n-farmers must be >= 5")
    if n > len(farmers):
        raise SystemExit(f"Only {len(farmers)} farmers available")

    if args.backup:
        stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        bak = DATA / f"_backup_before_{n}farmers_{stamp}"
        bak.mkdir(parents=True, exist_ok=True)
        shutil.copy2(farmers_path, bak / "synthetic_farmers.csv")
        shutil.copy2(expenses_path, bak / "synthetic_expense_records.csv")
        for name in (
            "supervised_features.csv",
            "CalFAM_ML_Training_Dataset.xlsx",
            "feature_schema_draft.json",
            "dataset_manifest.json",
        ):
            p = DATA / name
            if p.exists():
                shutil.copy2(p, bak / name)
        print(f"Backup -> {bak}")

    rng = np.random.default_rng(args.seed)
    ids = farmers["synth_farmer_id"].astype(str).tolist()
    chosen = sorted(rng.choice(ids, size=n, replace=False).tolist())
    farm_sub = farmers[farmers["synth_farmer_id"].astype(str).isin(chosen)].copy()
    exp_sub = expenses[expenses["synth_farmer_id"].astype(str).isin(chosen)].copy()

    farm_sub.to_csv(farmers_path, index=False)
    exp_sub.to_csv(expenses_path, index=False)

    periods_per = int(exp_sub.groupby("synth_farmer_id").size().median())
    manifest = {
        "n_farmers": int(len(farm_sub)),
        "n_expense_rows": int(len(exp_sub)),
        "median_periods_per_farmer": periods_per,
        "expected_supervised_if_10_targets": int(len(farm_sub) * 10),
        "seed": int(args.seed),
        "source": "resampled_from_existing_synthetic_panel",
        "note": (
            "SYNTHETIC subset sized closer to a ~50-member cooperative scale. "
            "Still not real CalFAM farmer outcomes."
        ),
    }
    (DATA / "dataset_manifest.json").write_text(
        json.dumps(manifest, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(manifest, indent=2))


if __name__ == "__main__":
    main()
