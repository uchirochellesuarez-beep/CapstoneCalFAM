"""
Convert existing Phase-3 CSV datasets into one formatted Excel workbook.

Does NOT regenerate synthetic data. Reads existing CSV files only.
Output: data/CalFAM_ML_Training_Dataset.xlsx
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd
from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, NamedStyle, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.utils.dataframe import dataframe_to_rows
from openpyxl.worksheet.table import Table, TableStyleInfo

ROOT = Path(__file__).resolve().parent
DATA = ROOT / "data"
OUT_XLSX = DATA / "CalFAM_ML_Training_Dataset.xlsx"

# Green theme
HEADER_FILL = PatternFill("solid", fgColor="1B5E20")
HEADER_FONT = Font(name="Calibri", bold=True, color="FFFFFF", size=11)
ALT_FILL = PatternFill("solid", fgColor="E8F5E9")
INFO_TITLE_FILL = PatternFill("solid", fgColor="2E7D32")
INFO_LABEL_FILL = PatternFill("solid", fgColor="C8E6C9")
THIN = Border(
    left=Side(style="thin", color="A5D6A7"),
    right=Side(style="thin", color="A5D6A7"),
    top=Side(style="thin", color="A5D6A7"),
    bottom=Side(style="thin", color="A5D6A7"),
)

PHP_COLS = {
    "Historical_Expenses": {
        "total_fertilizer_cost",
        "total_pesticide_cost",
        "land_preparation_cost",
        "planting_cost",
        "spraying_cost",
        "harvester_cost",
        "drying_cost",
        "other_expenses",
        "labor_related_cost",
        "hauling_cost",
        "tarasko_cost",
        "transport_cost",
        "fuel_cost",
        "total_expenses",
    },
    "Training_Data": {
        "prev_total_expenses",
        "prev_prev_total_expenses",
        "prev_expenses_per_ha",
        "prev_fertilizer_cost",
        "prev_pesticide_cost",
        "prev_labor_related_cost",
        "prev_transport_cost",
        "prev_fuel_cost",
        "roll3_mean_total",
        "delta_prev",
        "target_total_expenses_php",
    },
    "Farmers": {"base_cost_per_ha"},
}

DATE_COLS = {
    "Historical_Expenses": {"period_start", "period_end"},
    "Period_Dictionary": {"period_start", "period_end"},
}


def _autosize(ws, max_width: int = 36) -> None:
    for col_cells in ws.columns:
        letter = get_column_letter(col_cells[0].column)
        length = 0
        for cell in col_cells[:80]:
            val = "" if cell.value is None else str(cell.value)
            length = max(length, len(val))
        ws.column_dimensions[letter].width = min(max(length + 2, 12), max_width)


def _write_dataframe_sheet(wb: Workbook, title: str, df: pd.DataFrame) -> None:
    ws = wb.create_sheet(title)
    for r_idx, row in enumerate(dataframe_to_rows(df, index=False, header=True), start=1):
        for c_idx, value in enumerate(row, start=1):
            cell = ws.cell(row=r_idx, column=c_idx, value=value)
            cell.border = THIN
            cell.alignment = Alignment(vertical="center")
            if r_idx == 1:
                cell.fill = HEADER_FILL
                cell.font = HEADER_FONT
                cell.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
            elif r_idx % 2 == 0:
                cell.fill = ALT_FILL

    ws.freeze_panes = "A2"

    # Excel Table (includes filters). Do not also set ws.auto_filter — conflicts with Tables.
    if df.shape[0] > 0 and df.shape[1] > 0:
        n_rows = df.shape[0] + 1
        n_cols = df.shape[1]
        ref = f"A1:{get_column_letter(n_cols)}{n_rows}"
        table = Table(displayName=f"tbl_{title.replace(' ', '_')[:16]}", ref=ref)
        table.tableStyleInfo = TableStyleInfo(
            name="TableStyleMedium2",
            showFirstColumn=False,
            showLastColumn=False,
            showRowStripes=True,
            showColumnStripes=False,
        )
        ws.add_table(table)

    # Formats
    headers = list(df.columns)
    php_set = PHP_COLS.get(title, set())
    date_set = DATE_COLS.get(title, set())
    for c_idx, name in enumerate(headers, start=1):
        if name in php_set:
            for r_idx in range(2, df.shape[0] + 2):
                ws.cell(row=r_idx, column=c_idx).number_format = '₱#,##0.00'
        if name in date_set:
            for r_idx in range(2, df.shape[0] + 2):
                ws.cell(row=r_idx, column=c_idx).number_format = "YYYY-MM-DD"

    ws.row_dimensions[1].height = 22
    _autosize(ws)


def _write_dataset_info(wb: Workbook, manifest: dict, counts: dict) -> None:
    ws = wb.create_sheet("Dataset_Info", 0)
    rows = [
        ("Field", "Value"),
        ("Dataset name", "CalFAM ML Training Dataset"),
        ("Purpose", "Offline synthetic rice-farmer expense forecasting (Phase 3+)"),
        ("Crop focus", "Rice farmers only"),
        ("Synthetic farmers", str(counts["farmers"])),
        ("Historical expense records", str(counts["historical"])),
        ("Supervised training/evaluation examples", str(counts["supervised"])),
        ("Historical coverage", "2021-H1 through 2026-H1 (11 six-month periods)"),
        ("Immediate next period after history", "2026-H2 (feature-only; no fabricated actuals)"),
        ("Later forecast example", "2027-H1"),
        ("Random seed", str(manifest.get("seed", ""))),
        ("Source CSVs", "synthetic_farmers.csv; synthetic_expense_records.csv; supervised_features.csv; period_dictionary.csv"),
        ("Monetary values", "SYNTHETIC ASSUMPTIONS — not official PSA/DA/FPA/PhilRice prices"),
        ("Price-index features", "Not included (official series pending; see references/SOURCES.md)"),
        ("Target", "target_total_expenses_php = total agricultural expenses (PHP) for next six-month period"),
        ("Chronological split", "Train: 2021-H2..2024-H2; Validation: 2025-H1/H2; Test: 2026-H1"),
        ("Limitations", "Synthetic panel for ML plumbing; not real CalFAM farmer records; high synthetic fit does not imply real-world accuracy"),
        ("Production safety", "Do not INSERT these rows into MySQL farmer_income_records"),
    ]
    for r_idx, (k, v) in enumerate(rows, start=1):
        ck = ws.cell(row=r_idx, column=1, value=k)
        cv = ws.cell(row=r_idx, column=2, value=v)
        ck.border = THIN
        cv.border = THIN
        if r_idx == 1:
            ck.fill = HEADER_FILL
            cv.fill = HEADER_FILL
            ck.font = HEADER_FONT
            cv.font = HEADER_FONT
        else:
            ck.fill = INFO_LABEL_FILL
            ck.font = Font(bold=True, name="Calibri", color="1B5E20")
            cv.alignment = Alignment(wrap_text=True, vertical="center")
    ws.freeze_panes = "A2"
    ws.column_dimensions["A"].width = 42
    ws.column_dimensions["B"].width = 100
    for r in range(2, len(rows) + 1):
        ws.row_dimensions[r].height = 32


def main() -> None:
    farmers = pd.read_csv(DATA / "synthetic_farmers.csv")
    historical = pd.read_csv(DATA / "synthetic_expense_records.csv")
    training = pd.read_csv(DATA / "supervised_features.csv")
    periods = pd.read_csv(DATA / "period_dictionary.csv")
    manifest = json.loads((DATA / "dataset_manifest.json").read_text(encoding="utf-8"))

    # Normalize dates as strings YYYY-MM-DD for consistent Excel display
    for col in ("period_start", "period_end"):
        if col in historical.columns:
            historical[col] = pd.to_datetime(historical[col]).dt.strftime("%Y-%m-%d")
        if col in periods.columns:
            periods[col] = pd.to_datetime(periods[col]).dt.strftime("%Y-%m-%d")

    counts = {
        "farmers": int(len(farmers)),
        "historical": int(len(historical)),
        "supervised": int(len(training)),
        "periods": int(len(periods)),
    }
    n = counts["farmers"]
    if n < 5 or counts["historical"] != n * 11 or counts["supervised"] != n * 10:
        raise SystemExit(
            f"Unexpected counts before Excel export: {counts} "
            f"(expected hist={n * 11}, supervised={n * 10})"
        )

    wb = Workbook()
    # remove default sheet; Dataset_Info will be first
    default = wb.active
    wb.remove(default)

    _write_dataset_info(wb, manifest, counts)
    _write_dataframe_sheet(wb, "Farmers", farmers)
    _write_dataframe_sheet(wb, "Historical_Expenses", historical)
    _write_dataframe_sheet(wb, "Training_Data", training)
    _write_dataframe_sheet(wb, "Period_Dictionary", periods)

    # Desired order: Dataset_Info, Farmers, Historical_Expenses, Training_Data, Period_Dictionary
    order = [
        "Dataset_Info",
        "Farmers",
        "Historical_Expenses",
        "Training_Data",
        "Period_Dictionary",
    ]
    for i, name in enumerate(order):
        wb.move_sheet(name, offset=i - wb.sheetnames.index(name))

    OUT_XLSX.parent.mkdir(parents=True, exist_ok=True)
    wb.save(OUT_XLSX)

    # Quick equality check vs CSV (values)
    excel_train = pd.read_excel(OUT_XLSX, sheet_name="Training_Data")
    # Drop excel table artifacts / ensure same columns
    csv_train = training.copy()
    common = [c for c in csv_train.columns if c in excel_train.columns]
    if len(excel_train) != len(csv_train):
        raise SystemExit("Excel Training_Data row count mismatch vs CSV")
    # Numeric compare on feature/target columns
    num_cols = [
        c
        for c in common
        if pd.api.types.is_numeric_dtype(csv_train[c])
        or c.endswith("_php")
        or "cost" in c
        or "expenses" in c
    ]
    for c in num_cols:
        a = pd.to_numeric(csv_train[c], errors="coerce")
        b = pd.to_numeric(excel_train[c], errors="coerce")
        if not ((a - b).abs().fillna(0) < 1e-6).all():
            raise SystemExit(f"Value mismatch on column {c}")

    print(
        json.dumps(
            {
                "excel": str(OUT_XLSX),
                "sheets": {
                    "Dataset_Info": "metadata",
                    "Farmers": counts["farmers"],
                    "Historical_Expenses": counts["historical"],
                    "Training_Data": counts["supervised"],
                    "Period_Dictionary": counts["periods"],
                },
                "csv_excel_training_match": True,
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
