"""In-memory calibration preview only. Does not modify dataset files."""
from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
import pandas as pd

ROOT = Path(__file__).resolve().parents[1]
REF = ROOT / "references" / "PH_Rice_Production_Cost_References.xlsx"
EXP = ROOT / "data" / "synthetic_expense_records.csv"
FARM = ROOT / "data" / "synthetic_farmers.csv"
SUP = ROOT / "data" / "supervised_features.csv"
OUT = ROOT / "reports" / "_calibration_preview_stats.json"

# PSA item labels as stored in the verified workbook
CANON_MAP = {
    "CASH COSTS": "CASH_COSTS",
    "TOTAL COSTS": "TOTAL_COSTS",
    "Fertilizer": "FERTILIZER",
    "Fertilizer (cash component)": "FERTILIZER_CASH",
    "Pesticides": "PESTICIDES",
    "Pesticides (cash component)": "PESTICIDES_CASH",
    "Hired labor": "HIRED_LABOR",
    "Fuel & Oil": "FUEL_OIL",
    "Fuel & Oil (cash component)": "FUEL_OIL_CASH",
    "Transport cost of inputs": "TRANSPORT_INPUTS",
    "Transport cost of inputs (cash component)": "TRANSPORT_INPUTS_CASH",
    "Seeds": "SEEDS",
    "Irrigation fee": "IRRIGATION_FEE",
}

BASKET_KEYS = [
    "FERTILIZER",
    "PESTICIDES",
    "HIRED_LABOR",
    "FUEL_OIL",
    "TRANSPORT_INPUTS",
]


def semester_key(year: int, semester: str, cropping: str) -> tuple[str, str]:
    """Return (calfam_period_or_context_id, kind). kind in {h1,h2,average,dry,wet}."""
    s = str(semester)
    c = str(cropping)
    if "H1" in s or "January" in c:
        return f"{year}-H1", "h1"
    if "H2" in s or "July" in c:
        return f"{year}-H2", "h2"
    if "Dry" in s or c == "Dry":
        return f"{year}-Dry", "dry"
    if "Wet" in s or c == "Wet":
        return f"{year}-Wet", "wet"
    if "Annual" in s or c == "Average":
        return f"{year}-Average", "average"
    return f"{year}-{semester}", "other"


def summarize(series: pd.Series) -> dict:
    s = pd.to_numeric(series, errors="coerce").dropna()
    if s.empty:
        return {}
    return {
        "n": int(len(s)),
        "mean": round(float(s.mean()), 2),
        "median": round(float(s.median()), 2),
        "std": round(float(s.std(ddof=0)), 2),
        "p10": round(float(s.quantile(0.10)), 2),
        "p25": round(float(s.quantile(0.25)), 2),
        "p75": round(float(s.quantile(0.75)), 2),
        "p90": round(float(s.quantile(0.90)), 2),
        "min": round(float(s.min()), 2),
        "max": round(float(s.max()), 2),
    }


def main() -> None:
    # Force utf-8 stdout on Windows
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")

    prod = pd.read_excel(REF, sheet_name="Verified_Production_Costs")
    mapping = pd.read_excel(REF, sheet_name="Category_Mapping")
    missing = pd.read_excel(REF, sheet_name="Missing_Data")

    # National already; prefer All Palay / Palay ecosystem
    eco = prod["Ecosystem_Type"].astype(str)
    prod_all = prod[eco.isin(["All Palay", "Palay"])].copy()

    prod_all["canon"] = prod_all["Indicator"].map(CANON_MAP)
    prod_all = prod_all[prod_all["canon"].notna()].copy()
    prod_all["Value"] = pd.to_numeric(prod_all["Value"], errors="coerce")
    prod_all = prod_all.dropna(subset=["Value"])

    keys = []
    kinds = []
    for _, r in prod_all.iterrows():
        k, kind = semester_key(int(r["Data_Year"]), r["Semester"], r["Cropping_Season_Official"])
        keys.append(k)
        kinds.append(kind)
    prod_all["period_key"] = keys
    prod_all["period_kind"] = kinds

    # Pivot to wide anchors
    anchors = {}
    for (period_key, kind), g in prod_all.groupby(["period_key", "period_kind"]):
        row = {
            "period_key": period_key,
            "period_kind": kind,
            "year": int(period_key.split("-")[0]),
            "psa_semester": str(g["Semester"].iloc[0]),
            "psa_cropping_season": str(g["Cropping_Season_Official"].iloc[0]),
            "ecosystem": str(g["Ecosystem_Type"].iloc[0]),
            "values": {},
        }
        for canon, gg in g.groupby("canon"):
            # if duplicates (shouldn't), take mean
            row["values"][canon] = round(float(gg["Value"].mean()), 2)
        basket = {k: row["values"][k] for k in BASKET_KEYS if k in row["values"]}
        row["basket_parts"] = basket
        row["basket_sum"] = round(sum(basket.values()), 2) if basket else None
        row["cash_costs"] = row["values"].get("CASH_COSTS")
        row["total_costs"] = row["values"].get("TOTAL_COSTS")
        # Prefer cash components for fertilizer/pest/fuel/transport when present
        cash_basket_keys = [
            ("FERTILIZER_CASH", "FERTILIZER"),
            ("PESTICIDES_CASH", "PESTICIDES"),
            ("FUEL_OIL_CASH", "FUEL_OIL"),
            ("TRANSPORT_INPUTS_CASH", "TRANSPORT_INPUTS"),
        ]
        cash_like = {}
        for cash_k, full_k in cash_basket_keys:
            if cash_k in row["values"]:
                cash_like[cash_k] = row["values"][cash_k]
            elif full_k in row["values"]:
                cash_like[full_k] = row["values"][full_k]
        if "HIRED_LABOR" in row["values"]:
            cash_like["HIRED_LABOR"] = row["values"]["HIRED_LABOR"]
        row["cash_like_basket_parts"] = cash_like
        row["cash_like_basket_sum"] = round(sum(cash_like.values()), 2) if cash_like else None
        anchors[period_key] = row

    # Load CalFAM synthetic expenses
    exp = pd.read_csv(EXP)
    farm = pd.read_csv(FARM)
    # Merge hectares if needed
    if "hectares" not in exp.columns and "farm_size_ha" in farm.columns:
        id_col = "farmer_id" if "farmer_id" in exp.columns else "farmer_synthetic_id"
        farm_id = "farmer_id" if "farmer_id" in farm.columns else farm.columns[0]
        exp = exp.merge(
            farm[[farm_id, "farm_size_ha"]].rename(columns={farm_id: id_col, "farm_size_ha": "hectares"}),
            on=id_col,
            how="left",
        )
    elif "hectares" not in exp.columns:
        # try common names
        for alt in ["farm_size_ha", "land_area_ha", "area_ha"]:
            if alt in exp.columns:
                exp["hectares"] = exp[alt]
                break

    # Detect amount / period / category columns
    amount_col = next(
        (c for c in ["amount_php", "expense_amount", "total_expense", "amount", "expense_php"] if c in exp.columns),
        None,
    )
    period_col = next(
        (c for c in ["period_label", "period", "period_id", "semester_label"] if c in exp.columns),
        None,
    )
    cat_col = next(
        (c for c in ["expense_category", "category", "cost_category"] if c in exp.columns),
        None,
    )
    ha_col = next((c for c in ["hectares", "farm_size_ha", "area_ha"] if c in exp.columns), None)

    assert amount_col and period_col and ha_col, (list(exp.columns), amount_col, period_col, ha_col)

    exp["amount_php"] = pd.to_numeric(exp[amount_col], errors="coerce")
    exp["hectares"] = pd.to_numeric(exp[ha_col], errors="coerce")
    exp["php_per_ha"] = exp["amount_php"] / exp["hectares"]
    exp["period_label"] = exp[period_col].astype(str)

    # Category totals if long format
    if cat_col:
        cats = sorted(exp[cat_col].astype(str).unique())
    else:
        cats = []

    # Aggregate farmer-period total PHP/ha (sum categories)
    if cat_col:
        farmer_id = next(c for c in ["farmer_id", "farmer_synthetic_id", "id"] if c in exp.columns)
        tot = (
            exp.groupby([farmer_id, "period_label"], as_index=False)
            .agg(amount_php=("amount_php", "sum"), hectares=("hectares", "first"))
        )
        tot["php_per_ha"] = tot["amount_php"] / tot["hectares"]
    else:
        tot = exp.copy()

    # Build period anchor map for calibration preview
    # Primary anchor = CASH_COSTS for H1/H2 2022-2025
    # 2021: use Average CASH_COSTS (Dry/Wet NOT treated as H1/H2)
    # 2026: no PSA — holdout / no direct PSA scale (use 2025-H1 as provisional trend ONLY if flagged estimated)
    period_factors = {}
    before_by_period = {}
    after_by_period = {}

    for period, g in tot.groupby("period_label"):
        before = summarize(g["php_per_ha"])
        before_by_period[period] = before
        year = int(str(period).split("-")[0])
        half = str(period).split("-")[1]

        psa_key = period  # e.g. 2022-H1
        status = "verified_direct"
        psa = anchors.get(psa_key)

        if year == 2021:
            # Do NOT map Dry/Wet to H1/H2. Use annual Average as context anchor only.
            psa = anchors.get("2021-Average")
            status = "verified_annual_average_only_not_semester"
        elif year == 2026:
            psa = None
            status = "missing_psa_no_direct_calibration"
        elif psa is None:
            status = "missing_period_anchor"

        current_mean = before.get("mean")
        target = None
        factor = None
        note = ""

        if psa and psa.get("cash_costs") and current_mean and current_mean > 0:
            target = psa["cash_costs"]
            # Scale so period MEAN php/ha moves to PSA CASH COSTS
            # Farmer relative ranks preserved via multiplicative factor
            factor = target / current_mean
            note = "scale_mean_to_psa_cash_costs"
        elif year == 2026 and current_mean:
            # Preview-only provisional: carry 2025-H1 factor forward as ESTIMATED (not verified)
            # Will mark clearly — proposal recommends excluding 2026 from PSA scaling until published
            ref2025 = period_factors.get("2025-H1")
            if ref2025 and ref2025.get("factor") is not None:
                factor = ref2025["factor"]
                target = round(current_mean * factor, 2)
                status = "estimated_provisional_from_2025H1_factor_NOT_for_apply"
                note = "preview_only_not_recommended_for_apply"
            else:
                factor = 1.0
                target = current_mean
                note = "no_change_until_psa_2026"
                status = "missing_psa_hold_unchanged"

        if factor is None:
            factor = 1.0
            target = current_mean
            if status.startswith("verified"):
                status = "verified_but_no_cash_costs_hold"
            note = note or "no_scale"

        after_vals = g["php_per_ha"] * factor
        after = summarize(after_vals)
        after_by_period[period] = after

        period_factors[period] = {
            "period": period,
            "status": status,
            "note": note,
            "current_mean_php_per_ha": current_mean,
            "target_php_per_ha": round(target, 2) if target is not None else None,
            "factor": round(float(factor), 6),
            "pct_adjustment": round((float(factor) - 1.0) * 100.0, 2),
            "psa_cash_costs": psa.get("cash_costs") if psa else None,
            "psa_total_costs": psa.get("total_costs") if psa else None,
            "psa_basket_sum": psa.get("basket_sum") if psa else None,
            "psa_cash_like_basket_sum": psa.get("cash_like_basket_sum") if psa else None,
            "psa_semester": psa.get("psa_semester") if psa else None,
            "n_farmer_period_rows": before.get("n"),
        }

    # Category-level mean share (current)
    cat_summary = {}
    if cat_col:
        for period, g in exp.groupby("period_label"):
            shares = (
                g.groupby(cat_col)["amount_php"].sum() / g["amount_php"].sum() * 100.0
            ).round(2)
            cat_summary[period] = shares.to_dict()

    # Overall before/after
    overall_before = summarize(tot["php_per_ha"])
    # apply factors
    factor_map = {p: v["factor"] for p, v in period_factors.items()}
    tot_after = tot.copy()
    tot_after["factor"] = tot_after["period_label"].map(factor_map).fillna(1.0)
    # For recommended apply path: only scale verified H1/H2 2022-2025; 2021 use average factor; 2026 unchanged
    apply_factor = {}
    for p, v in period_factors.items():
        if v["status"] in {
            "verified_direct",
            "verified_annual_average_only_not_semester",
        }:
            apply_factor[p] = v["factor"]
        else:
            apply_factor[p] = 1.0
    tot_after["apply_factor"] = tot_after["period_label"].map(apply_factor).fillna(1.0)
    tot_after["php_per_ha_after_recommended"] = tot_after["php_per_ha"] * tot_after["apply_factor"]
    overall_after_recommended = summarize(tot_after["php_per_ha_after_recommended"])

    # Impact counts
    n_expense_records = len(exp)
    n_supervised = len(pd.read_csv(SUP)) if SUP.exists() else None
    n_farmer_periods = len(tot)

    # Category mapping export
    mapping_records = mapping.fillna("").to_dict(orient="records")
    missing_records = missing.fillna("").to_dict(orient="records")

    # Flat verified cash/total table for report
    verified_table = []
    for key in sorted(anchors.keys()):
        a = anchors[key]
        verified_table.append(
            {
                "period_key": key,
                "kind": a["period_kind"],
                "cash_costs": a["cash_costs"],
                "total_costs": a["total_costs"],
                "basket_sum": a["basket_sum"],
                "cash_like_basket_sum": a["cash_like_basket_sum"],
                "fertilizer": a["values"].get("FERTILIZER"),
                "pesticides": a["values"].get("PESTICIDES"),
                "hired_labor": a["values"].get("HIRED_LABOR"),
                "fuel_oil": a["values"].get("FUEL_OIL"),
                "transport": a["values"].get("TRANSPORT_INPUTS"),
                "seeds": a["values"].get("SEEDS"),
                "irrigation_fee": a["values"].get("IRRIGATION_FEE"),
                "psa_semester": a["psa_semester"],
            }
        )

    payload = {
        "disclaimer": "PREVIEW ONLY. No dataset files were modified.",
        "expense_columns": list(exp.columns),
        "categories": cats,
        "n_farmers": int(farm.shape[0]),
        "n_expense_records": int(n_expense_records),
        "n_farmer_period_totals": int(n_farmer_periods),
        "n_supervised_rows": n_supervised,
        "overall_before_php_per_ha": overall_before,
        "overall_after_recommended_php_per_ha": overall_after_recommended,
        "period_factors": period_factors,
        "before_by_period": before_by_period,
        "after_by_period_if_all_factors_applied": after_by_period,
        "category_share_pct_by_period": cat_summary,
        "verified_psa_anchors": verified_table,
        "category_mapping_sheet": mapping_records,
        "missing_data_sheet": missing_records,
        "recommended_apply_rule": (
            "Multiply each farmer-period total and each category amount by period factor "
            "derived from (PSA_CASH_COSTS / current_period_mean_php_per_ha) for 2022-2025 H1/H2; "
            "for 2021 use 2021-Average CASH_COSTS factor for BOTH H1 and H2 (flagged not semester-specific); "
            "leave 2026-H1 unchanged until PSA publishes."
        ),
    }

    OUT.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {OUT}")
    print("categories:", cats)
    print("overall before:", overall_before)
    print("overall after recommended:", overall_after_recommended)
    print("periods:", sorted(period_factors.keys()))
    for p in sorted(period_factors.keys()):
        v = period_factors[p]
        print(
            f"{p}: factor={v['factor']} pct={v['pct_adjustment']}% "
            f"mean={v['current_mean_php_per_ha']} -> {v['target_php_per_ha']} "
            f"psa_cash={v['psa_cash_costs']} status={v['status']}"
        )


if __name__ == "__main__":
    main()
