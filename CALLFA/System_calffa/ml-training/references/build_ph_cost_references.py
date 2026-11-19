"""
Build PH_Rice_Production_Cost_References.xlsx from verified OpenSTAT extracts + FPA PDF snapshot.
Does not modify CalFAM farmer datasets or retrain models.
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parent
OUT = ROOT / "PH_Rice_Production_Cost_References.xlsx"
RAW_2225 = ROOT / "openstat_palay_costs_raw.json"
RAW_2021 = ROOT / "openstat_palay_costs_2021_raw.json"

HEADER_FILL = PatternFill("solid", fgColor="1B5E20")
HEADER_FONT = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
ALT = PatternFill("solid", fgColor="E8F5E9")
THIN = Border(
    left=Side(style="thin", color="A5D6A7"),
    right=Side(style="thin", color="A5D6A7"),
    top=Side(style="thin", color="A5D6A7"),
    bottom=Side(style="thin", color="A5D6A7"),
)

OPENSTAT_URL = "https://openstat.psa.gov.ph/PXWeb/pxweb/en/DB/DB__2B__AA__CR/?tablelist=true"
TABLE_2225 = "0012B5EAPC0.px — Palay: Average Production Costs and Returns by Type, Geolocation, Item, Cropping Season and Year: 2022-2025"
TABLE_2021 = "0022B5EAPC1.px — Palay and Corn: Average Production Costs and Returns by Type, Geolocation, Item, Season and Year: 2002-2021"
FPA_PDF = "https://fpa.da.gov.ph/wp-content/uploads/2026/10/WFP-WK43-2026.sgd_.pdf"
ACCESS = "2026-11-19"


def style_df_sheet(ws, df: pd.DataFrame, table_name: str, php_cols: set[str] | None = None) -> None:
    php_cols = php_cols or set()
    for r_idx, row in enumerate(dataframe_to_rows(df, index=False, header=True), start=1):
        for c_idx, value in enumerate(row, start=1):
            cell = ws.cell(r_idx, c_idx, value)
            cell.border = THIN
            cell.alignment = Alignment(wrap_text=True, vertical="center")
            if r_idx == 1:
                cell.fill = HEADER_FILL
                cell.font = HEADER_FONT
            elif r_idx % 2 == 0:
                cell.fill = ALT
    ws.freeze_panes = "A2"
    if df.shape[0] and df.shape[1]:
        ref = f"A1:{get_column_letter(df.shape[1])}{df.shape[0] + 1}"
        t = Table(displayName=table_name, ref=ref)
        t.tableStyleInfo = TableStyleInfo(name="TableStyleMedium2", showRowStripes=True)
        ws.add_table(t)
    for c_idx, name in enumerate(df.columns, start=1):
        if name in php_cols:
            for r in range(2, df.shape[0] + 2):
                ws.cell(r, c_idx).number_format = "#,##0.00"
        ws.column_dimensions[get_column_letter(c_idx)].width = min(
            max(len(str(name)) + 2, 14), 42
        )


def build_production_costs() -> pd.DataFrame:
    raw = json.loads(RAW_2225.read_text(encoding="utf-8"))
    keep_items = {
        "TOTAL COSTS",
        "CASH COSTS",
        "Fertilizer",
        "Pesticides",
        "Hired labor",
        "Fuel & Oil",
        "Transport cost of inputs",
        "Irrigation fee",
        "Seeds",
        "Cost per kilogram (in PhP)",
        "NET RETURNS",
        "GROSS RETURNS",
    }
    rows = []
    for r in raw["rows"]:
        if r["item"] not in keep_items:
            continue
        if r["geolocation"] != "PHILIPPINES":
            continue
        semester = {
            "January to June": "H1 (Jan–Jun)",
            "July to December": "H2 (Jul–Dec)",
            "Average": "Annual average",
        }[r["cropping_season"]]
        rows.append(
            {
                "Indicator": r["item"],
                "Value": r["value"],
                "Unit": "PHP per hectare per cropping season"
                if r["item"] != "Cost per kilogram (in PhP)"
                else "PHP per kilogram",
                "Data_Year": int(r["year"]),
                "Semester": semester,
                "Cropping_Season_Official": r["cropping_season"],
                "Ecosystem_Type": r["type"],
                "Geographic_Coverage": "Philippines (national)",
                "Publication_Title": TABLE_2225,
                "Official_Source_URL": OPENSTAT_URL,
                "Publication_Update_Note": "OpenSTAT table list updated 2026-08-05 (API)",
                "Table_Reference": "0012B5EAPC0.px / Item codes via OpenSTAT PXWeb API extract",
                "Access_Date": ACCESS,
                "Verification_Status": "Verified from PSA OpenSTAT API extract",
            }
        )

    # 2021 legacy annual average (Dry/Wet, not calendar H1/H2)
    rows_2021 = json.loads(RAW_2021.read_text(encoding="utf-8"))
    map_2021 = {
        "TOTAL COSTS": "TOTAL COSTS",
        "Fertilizer paid in cash": "Fertilizer (cash component)",
        "Pesticides paid in cash": "Pesticides (cash component)",
        "Hired labor": "Hired labor",
        "Fuel and oil paid in cash": "Fuel & Oil (cash component)",
        "Transport cost paid in cash": "Transport cost of inputs (cash component)",
        "Irrigation fee": "Irrigation fee",
        "Cost per kilogram (pesos)": "Cost per kilogram (in PhP)",
    }
    for r in rows_2021:
        if r["type"] != "All Palay":
            continue
        if r["item"] not in map_2021:
            continue
        semester = {
            "Dry": "Dry season (NOT calendar H1/H2)",
            "Wet": "Wet season (NOT calendar H1/H2)",
            "Average": "Annual average",
        }[r["season"]]
        unit = (
            "PHP per kilogram"
            if "kilogram" in map_2021[r["item"]].lower()
            else "PHP per hectare per cropping season"
        )
        rows.append(
            {
                "Indicator": map_2021[r["item"]],
                "Value": r["value"],
                "Unit": unit,
                "Data_Year": 2021,
                "Semester": semester,
                "Cropping_Season_Official": r["season"],
                "Ecosystem_Type": "All Palay",
                "Geographic_Coverage": "Philippines (national)",
                "Publication_Title": TABLE_2021,
                "Official_Source_URL": OPENSTAT_URL,
                "Publication_Update_Note": "Legacy OpenSTAT table covering through 2021",
                "Table_Reference": "0022B5EAPC1.px / API extract",
                "Access_Date": ACCESS,
                "Verification_Status": "Verified from PSA OpenSTAT API extract",
            }
        )
    return pd.DataFrame(rows)


def build_input_prices() -> pd.DataFrame:
    # Verified FPA national weighted averages from official weekly PDF
    fpa_rows = [
        ("Urea prilled 46-0-0", 2268.67),
        ("Urea granular 46-0-0", 2241.43),
        ("Ammonium sulfate 21-0-0", 1265.62),
        ("Complete fertilizer 14-14-14", 1955.45),
        ("Ammophos 16-20-0", 1834.06),
        ("Muriate of potash 0-0-60", 1665.98),
        ("Diammonium phosphate 18-46-0", 3213.22),
    ]
    rows = []
    for name, val in fpa_rows:
        rows.append(
            {
                "Indicator": name,
                "Value": val,
                "Unit": "PHP per 50 kg bag",
                "Data_Year": 2026,
                "Semester": "Week of 19–23 October 2026 (not a full semester average)",
                "Geographic_Coverage": "Philippines national weighted average",
                "Publication_Title": "FPA Weekly Fertilizer Prices (WFP-WK43-2026)",
                "Official_Source_URL": FPA_PDF,
                "Portal_Index_URL": "https://fpa.da.gov.ph/weekly-prices/",
                "Publication_Date": "Week ending 2026-10-23 (bulletin)",
                "Table_Reference": "National Weighted Average row, major fertilizer grades",
                "Access_Date": ACCESS,
                "Verification_Status": "Verified from official FPA PDF bulletin",
            }
        )
    return pd.DataFrame(rows)


def build_sources() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "Source_Organization": "Philippine Statistics Authority (PSA)",
                "Publication_Title": TABLE_2225,
                "Years_Covered": "2022–2025",
                "Semester_Available": "Yes — January to June; July to December; Average",
                "Official_Source_URL": OPENSTAT_URL,
                "API_Table_ID": "0012B5EAPC0.px",
                "Access_Date": ACCESS,
                "Verification_Status": "Verified numeric extract via OpenSTAT PXWeb API",
            },
            {
                "Source_Organization": "Philippine Statistics Authority (PSA)",
                "Publication_Title": TABLE_2021,
                "Years_Covered": "2002–2021 (2021 extracted)",
                "Semester_Available": "Dry / Wet / Average only (NOT calendar H1/H2)",
                "Official_Source_URL": OPENSTAT_URL,
                "API_Table_ID": "0022B5EAPC1.px",
                "Access_Date": ACCESS,
                "Verification_Status": "Verified numeric extract via OpenSTAT PXWeb API",
            },
            {
                "Source_Organization": "Fertilizer and Pesticide Authority (FPA)",
                "Publication_Title": "Weekly Fertilizer Prices bulletin WFP-WK43-2026",
                "Years_Covered": "2026-10-19 to 2026-10-23 snapshot",
                "Semester_Available": "No — weekly only in this extract",
                "Official_Source_URL": FPA_PDF,
                "API_Table_ID": "N/A (PDF)",
                "Access_Date": ACCESS,
                "Verification_Status": "Verified from official FPA PDF",
            },
            {
                "Source_Organization": "DA – PhilRice Ricelytics",
                "Publication_Title": "Costs and Returns dashboard (PSA-sourced)",
                "Years_Covered": "Dashboard references PSA series",
                "Semester_Available": "Dashboard supports semester views",
                "Official_Source_URL": "https://ricelytics.philrice.gov.ph/costs_and_returns/",
                "API_Table_ID": "N/A",
                "Access_Date": ACCESS,
                "Verification_Status": "Portal verified; numeric values taken from PSA OpenSTAT (primary), not Ricelytics scrape",
            },
            {
                "Source_Organization": "Department of Agriculture (DA)",
                "Publication_Title": "National Rice Program / RBFHS 2021–2022 (cited by Ricelytics)",
                "Years_Covered": "2021–2022 survey vintage",
                "Semester_Available": "Survey-dependent",
                "Official_Source_URL": "https://ricelytics.philrice.gov.ph/costs_and_returns/",
                "API_Table_ID": "N/A",
                "Access_Date": ACCESS,
                "Verification_Status": "Cited only — microdata not obtained",
            },
        ]
    )


def build_missing() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "Missing_Item": "2026 full-year / H1–H2 PSA palay total costs",
                "Years_Periods": "2026",
                "Reason": "OpenSTAT 0012B5EAPC0.px currently lists years 2022–2025 only",
                "Impact_On_Calibration": "Cannot calibrate 2026-H1 synthetic targets to official 2026 season totals yet",
            },
            {
                "Missing_Item": "2021 calendar H1/H2 (Jan–Jun / Jul–Dec) PSA costs",
                "Years_Periods": "2021",
                "Reason": "Legacy table uses Dry/Wet seasons, not calendar semesters",
                "Impact_On_Calibration": "Use annual 2021 average only; do not invent H1/H2 splits",
            },
            {
                "Missing_Item": "FPA fertilizer weekly/semester means for 2021–2025",
                "Years_Periods": "2021–2025",
                "Reason": "Only one official weekly PDF snapshot (Oct 2026) verified in this task",
                "Impact_On_Calibration": "Cannot build historical fertilizer price index yet",
            },
            {
                "Missing_Item": "FPA pesticide price panel 2021–2026",
                "Years_Periods": "2021–2026",
                "Reason": "Not extracted in this task",
                "Impact_On_Calibration": "Pesticide price covariates unavailable",
            },
            {
                "Missing_Item": "Regional calibration panel for CalFAM barangays",
                "Years_Periods": "2021–2026",
                "Reason": "CalFAM synthetic panel has no region field; national figures only archived here",
                "Impact_On_Calibration": "National PHP/ha bands only for now",
            },
            {
                "Missing_Item": "DA RBFHS 2021–2022 microdata",
                "Years_Periods": "2021–2022",
                "Reason": "Not obtained",
                "Impact_On_Calibration": "No survey-based farmer-level validation sample",
            },
        ]
    )


def build_mapping() -> pd.DataFrame:
    return pd.DataFrame(
        [
            {
                "Official_PSA_Item": "TOTAL COSTS",
                "CalFAM_Field": "total_expenses (per season ≈ six months)",
                "Match_Type": "Partial",
                "Notes": "PSA total includes cash + non-cash + imputed. CalFAM form is closer to operational cash-like costs.",
                "Calibration_Use": "Use as upper-bound / realism check on PHP per hectare; prefer CASH COSTS or item basket for closer scope",
            },
            {
                "Official_PSA_Item": "CASH COSTS",
                "CalFAM_Field": "sum of recorded cash-like categories",
                "Match_Type": "Closer match",
                "Notes": "Better scope match than TOTAL COSTS for CalFAM forms.",
                "Calibration_Use": "Primary anchor for PHP/ha calibration band",
            },
            {
                "Official_PSA_Item": "Fertilizer",
                "CalFAM_Field": "total_fertilizer_cost",
                "Match_Type": "Direct",
                "Notes": "Strong conceptual match (OpenSTAT 2022–2025 item).",
                "Calibration_Use": "Calibrate fertilizer share / PHP/ha fertilizer component",
            },
            {
                "Official_PSA_Item": "Pesticides",
                "CalFAM_Field": "total_pesticide_cost",
                "Match_Type": "Direct",
                "Notes": "Strong conceptual match.",
                "Calibration_Use": "Calibrate pesticide component",
            },
            {
                "Official_PSA_Item": "Hired labor (+ operator/family/exchange labor)",
                "CalFAM_Field": "labor_related_cost (ops bundle)",
                "Match_Type": "Partial",
                "Notes": "CalFAM bundles land prep/planting/spraying/harvest/drying/other; may include machine service fees.",
                "Calibration_Use": "Compare carefully; do not force equality to hired labor alone",
            },
            {
                "Official_PSA_Item": "Fuel & Oil",
                "CalFAM_Field": "fuel_cost",
                "Match_Type": "Direct",
                "Notes": "Good match.",
                "Calibration_Use": "Fuel component check",
            },
            {
                "Official_PSA_Item": "Transport cost of inputs",
                "CalFAM_Field": "transport_cost (hauling + tarasko)",
                "Match_Type": "Partial",
                "Notes": "PSA focuses on input transport; CalFAM includes harvest/hauling style costs.",
                "Calibration_Use": "Directional only",
            },
            {
                "Official_PSA_Item": "Irrigation fee",
                "CalFAM_Field": "irrigation_type (categorical only)",
                "Match_Type": "Missing PHP field",
                "Notes": "CalFAM has irrigation type enum, no irrigation fee amount.",
                "Calibration_Use": "Do not invent irrigation PHP in CalFAM without schema change",
            },
            {
                "Official_PSA_Item": "Seeds",
                "CalFAM_Field": "(none standalone)",
                "Match_Type": "Missing",
                "Notes": "No dedicated seeds cost column in CalFAM income form.",
                "Calibration_Use": "Exclude or map into other_expenses with caution",
            },
            {
                "Official_PSA_Item": "FPA fertilizer bag prices",
                "CalFAM_Field": "not a direct expense total",
                "Match_Type": "Non-comparable as totals",
                "Notes": "Price per bag ≠ season fertilizer expense (depends on bags used).",
                "Calibration_Use": "Future covariate / index only after 2021–2026 series collected",
            },
            {
                "Official_PSA_Item": "National average PHP/ha",
                "CalFAM_Field": "farmer total_expenses / area_hectares",
                "Match_Type": "Non-comparable as individual records",
                "Notes": "National averages ≠ individual farmer six-month totals.",
                "Calibration_Use": "Calibrate distribution bands (median/IQR), not copy averages into each farmer",
            },
        ]
    )


def main() -> None:
    prod = build_production_costs()
    prices = build_input_prices()
    sources = build_sources()
    missing = build_missing()
    mapping = build_mapping()

    wb = Workbook()
    wb.remove(wb.active)

    sheets = [
        ("Verified_Production_Costs", prod, "tbl_ProdCosts", {"Value"}),
        ("Verified_Input_Prices", prices, "tbl_InputPrices", {"Value"}),
        ("Source_Documentation", sources, "tbl_Sources", set()),
        ("Missing_Data", missing, "tbl_Missing", set()),
        ("Category_Mapping", mapping, "tbl_Mapping", set()),
    ]
    for name, df, tname, php in sheets:
        ws = wb.create_sheet(name)
        style_df_sheet(ws, df, tname, php)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT)

    summary = {
        "workbook": str(OUT),
        "n_verified_production_cost_rows": int(len(prod)),
        "n_verified_input_price_rows": int(len(prices)),
        "n_verified_numeric_observations_total": int(len(prod) + len(prices)),
        "years_in_production_costs": sorted(prod["Data_Year"].unique().tolist()),
        "access_date": ACCESS,
    }
    (ROOT / "collection_summary.json").write_text(json.dumps(summary, indent=2), encoding="utf-8")
    print(json.dumps(summary, indent=2))


if __name__ == "__main__":
    main()
