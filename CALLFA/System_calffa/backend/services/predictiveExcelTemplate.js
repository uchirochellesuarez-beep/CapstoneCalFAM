const ExcelJS = require('exceljs');

const SEMESTER_HEADERS = [
  'Agricultural_Semester',
  'Farm_Area_Hectares',
  'Planting_Method',
  'Irrigation',
  'Land_Preparation_Cost',
  'Planting_Cost',
  'Spraying_Cost',
  'Harvester_Fee',
  'Drying_Fee',
  'Hauling_Fee',
  'Tarasko',
  'Fuel',
  'Other_Expenses',
];

const FERT_HEADERS = [
  'Agricultural_Semester',
  'Fertilizer_Type',
  'Number_of_Sacks',
  'Price_per_Sack',
];

const PEST_HEADERS = [
  'Agricultural_Semester',
  'Pesticide_Type',
  'Bottles_or_Packs',
  'Price_per_Bottle_or_Pack',
];

const PLANTING_OPTIONS = ['sabog', 'talok'];
const IRRIGATION_OPTIONS = [
  'NIA',
  'bugsok_waterpump',
  'waterpump_irrigation',
  'waterpump_ilog',
];

/** Shown in the first Agricultural_Semester cell so farmers see the format. */
const SEMESTER_PLACEHOLDER = 'e.g. 2026-H1';

function styleHeader(row) {
  row.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  row.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1F4E3D' },
  };
  row.alignment = { vertical: 'middle', wrapText: true };
}

function addBlankDataRows(ws, headerCount, count = 12) {
  for (let i = 0; i < count; i += 1) {
    const row = ws.addRow(Array(headerCount).fill(null));
    row.height = 18;
  }
}

function addListValidation(ws, colLetter, list, maxRow = 200) {
  for (let r = 2; r <= maxRow; r += 1) {
    ws.getCell(`${colLetter}${r}`).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [`"${list.join(',')}"`],
      showErrorMessage: true,
      errorTitle: 'Invalid value',
      error: `Choose one of: ${list.join(', ')}`,
    };
  }
}

function addSemesterFormatHint(ws, maxRow = 200) {
  for (let r = 2; r <= maxRow; r += 1) {
    ws.getCell(`A${r}`).dataValidation = {
      type: 'custom',
      allowBlank: true,
      formulae: ['TRUE'],
      showInputMessage: true,
      promptTitle: 'Agricultural_Semester',
      prompt: 'Format: YYYY-H1 or YYYY-H2  (example: 2026-H1 for Jan–Jun, 2026-H2 for Jul–Dec)',
      showErrorMessage: false,
    };
  }
}

function setSemesterPlaceholder(ws) {
  const cell = ws.getCell('A2');
  cell.value = SEMESTER_PLACEHOLDER;
  cell.font = { italic: true, color: { argb: 'FF9CA3AF' } };
}

async function buildPredictiveExcelTemplateBuffer() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'CalFAM';
  wb.created = new Date();

  // ── Semesters (first / active sheet) — headers only + empty rows ───────────
  const semesters = wb.addWorksheet('Semesters', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  semesters.addRow(SEMESTER_HEADERS);
  styleHeader(semesters.getRow(1));
  semesters.getRow(1).height = 28;
  addBlankDataRows(semesters, SEMESTER_HEADERS.length, 12);
  SEMESTER_HEADERS.forEach((h, i) => {
    semesters.getColumn(i + 1).width = Math.max(22, h.length + 2);
  });
  addSemesterFormatHint(semesters);
  setSemesterPlaceholder(semesters);
  addListValidation(semesters, 'C', PLANTING_OPTIONS);
  addListValidation(semesters, 'D', IRRIGATION_OPTIONS);

  // ── Fertilizers ───────────────────────────────────────────────────────────
  const fert = wb.addWorksheet('Fertilizers', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  fert.addRow(FERT_HEADERS);
  styleHeader(fert.getRow(1));
  addBlankDataRows(fert, FERT_HEADERS.length, 12);
  FERT_HEADERS.forEach((h, i) => {
    fert.getColumn(i + 1).width = Math.max(22, h.length + 2);
  });
  addSemesterFormatHint(fert);
  setSemesterPlaceholder(fert);

  // ── Pesticides ────────────────────────────────────────────────────────────
  const pest = wb.addWorksheet('Pesticides', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });
  pest.addRow(PEST_HEADERS);
  styleHeader(pest.getRow(1));
  addBlankDataRows(pest, PEST_HEADERS.length, 12);
  PEST_HEADERS.forEach((h, i) => {
    pest.getColumn(i + 1).width = Math.max(24, h.length + 2);
  });
  addSemesterFormatHint(pest);
  setSemesterPlaceholder(pest);

  // ── Instructions (last) ───────────────────────────────────────────────────
  const instructions = wb.addWorksheet('Instructions');
  instructions.getColumn(1).width = 110;
  const lines = [
    'CalFAM Agricultural Expense History Template (Predictive Analytics)',
    '',
    'HOW TO FILL (start on the Semesters sheet — it opens first):',
    '1. Semesters sheet: enter ONE row per agricultural semester (headers only — no sample data).',
    '2. Agricultural_Semester format: YYYY-H1 or YYYY-H2 (placeholder shows e.g. 2026-H1 — replace with your real semester).',
    '3. H1 = January 1–June 30; H2 = July 1–December 31.',
    '4. Farm_Area_Hectares: farm size in hectares (must be > 0).',
    '5. Planting_Method: choose sabog or talok (dropdown).',
    '6. Irrigation: choose NIA | bugsok_waterpump | waterpump_irrigation | waterpump_ilog (dropdown).',
    '7. Cost columns (Land_Preparation_Cost … Other_Expenses): enter peso amounts; use 0 if none.',
    '8. Fertilizers sheet: one or more rows per semester (Type, sacks, price per sack).',
    '9. Pesticides sheet: one or more rows per semester (Type, bottles/packs, price).',
    '10. Uploaded Excel is saved for Predictive Analytics (separate table). It is NOT a Farm Income Record.',
    '11. Year + H1/H2 must not overlap a Pending/Eligible Farm Income submission semester.',
    '12. Forecast semester is automatic (next semester after your latest history row).',
    '13. Model: pretrained Linear Regression on simulated data (estimate only, not guaranteed).',
  ];
  lines.forEach((text, i) => {
    instructions.getCell(i + 1, 1).value = text;
    if (i === 0) instructions.getCell(i + 1, 1).font = { bold: true, size: 14 };
  });

  wb.views = [{ activeTab: 0 }];

  const buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

module.exports = {
  SEMESTER_HEADERS,
  FERT_HEADERS,
  PEST_HEADERS,
  PLANTING_OPTIONS,
  IRRIGATION_OPTIONS,
  SEMESTER_PLACEHOLDER,
  buildPredictiveExcelTemplateBuffer,
};
