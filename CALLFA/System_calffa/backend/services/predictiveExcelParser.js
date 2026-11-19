const ExcelJS = require('exceljs');
const { parsePeriodLabel } = require('./agriculturalSemester');
const {
  PLANTING_METHODS,
  IRRIGATION_TYPES,
  laborRelatedCost,
  transportCost,
  fuelCost,
} = require('./pretrainedLrFeatureBuilder');
const {
  SEMESTER_HEADERS,
  FERT_HEADERS,
  PEST_HEADERS,
} = require('./predictiveExcelTemplate');

function fail(error_code, error, extra = {}) {
  return { ok: false, error_code, error, ...extra };
}

function cellText(value) {
  if (value == null) return '';
  if (typeof value === 'object' && value.text != null) return String(value.text).trim();
  if (typeof value === 'object' && value.result != null) return String(value.result).trim();
  return String(value).trim();
}

function cellNumber(value) {
  if (value == null || value === '') return null;
  if (typeof value === 'object' && value.result != null) value = value.result;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function isSemesterPlaceholder(text) {
  const s = String(text || '').trim();
  return (
    !s ||
    /^(NOTE|HOW TO|TIP|INSTRUCTIONS?\b)/i.test(s) ||
    /^e\.g\./i.test(s) ||
    /^YYYY-H[12]$/i.test(s)
  );
}

function sheetRows(ws) {
  if (!ws) return [];
  const rows = [];
  ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    if (rowNumber === 1) return;
    const values = [];
    for (let c = 1; c <= row.cellCount; c += 1) {
      values.push(row.getCell(c).value);
    }
    rows.push({ rowNumber, values });
  });
  return rows;
}

function headerMap(ws, expected) {
  if (!ws) return null;
  const headerRow = ws.getRow(1);
  const map = {};
  for (let c = 1; c <= Math.max(headerRow.cellCount, expected.length); c += 1) {
    const name = cellText(headerRow.getCell(c).value);
    if (name) map[name] = c;
  }
  for (const h of expected) {
    if (!map[h]) return null;
  }
  return map;
}

function readMapped(rowValues, map, header) {
  const idx = map[header] - 1;
  return rowValues[idx];
}

/**
 * Parse predictive Excel buffer into virtual Farm Income-like rows (not persisted).
 */
async function parsePredictiveExcelBuffer(buffer) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);

  const semWs = wb.getWorksheet('Semesters');
  if (!semWs) {
    return fail('MISSING_SHEET', 'Workbook must include a Semesters sheet.');
  }
  const semMap = headerMap(semWs, SEMESTER_HEADERS);
  if (!semMap) {
    return fail(
      'INVALID_HEADERS',
      `Semesters sheet must include columns: ${SEMESTER_HEADERS.join(', ')}`
    );
  }

  const fertWs = wb.getWorksheet('Fertilizers');
  const pestWs = wb.getWorksheet('Pesticides');
  // Example sheet intentionally ignored
  void wb.getWorksheet('Example');

  const fertBySem = new Map();
  if (fertWs) {
    const fertMap = headerMap(fertWs, FERT_HEADERS);
    if (!fertMap) {
      return fail(
        'INVALID_HEADERS',
        `Fertilizers sheet must include columns: ${FERT_HEADERS.join(', ')}`
      );
    }
    for (const { rowNumber, values } of sheetRows(fertWs)) {
      const sem = cellText(readMapped(values, fertMap, 'Agricultural_Semester'));
      if (isSemesterPlaceholder(sem)) continue;
      const parsed = parsePeriodLabel(sem);
      if (!parsed) {
        return fail(
          'INVALID_SEMESTER',
          `Fertilizers row ${rowNumber}: invalid Agricultural_Semester=${sem}`
        );
      }
      const sacks = cellNumber(readMapped(values, fertMap, 'Number_of_Sacks'));
      const price = cellNumber(readMapped(values, fertMap, 'Price_per_Sack'));
      if (sacks == null || price == null || sacks < 0 || price < 0) {
        return fail(
          'INVALID_NUMERIC',
          `Fertilizers row ${rowNumber}: Number_of_Sacks and Price_per_Sack must be ≥ 0.`
        );
      }
      const type = cellText(readMapped(values, fertMap, 'Fertilizer_Type'));
      if (!type) {
        return fail('MISSING_VALUE', `Fertilizers row ${rowNumber}: Fertilizer_Type is required.`);
      }
      const prev = fertBySem.get(parsed.label) || 0;
      fertBySem.set(parsed.label, prev + sacks * price);
    }
  }

  const pestBySem = new Map();
  if (pestWs) {
    const pestMap = headerMap(pestWs, PEST_HEADERS);
    if (!pestMap) {
      return fail(
        'INVALID_HEADERS',
        `Pesticides sheet must include columns: ${PEST_HEADERS.join(', ')}`
      );
    }
    for (const { rowNumber, values } of sheetRows(pestWs)) {
      const sem = cellText(readMapped(values, pestMap, 'Agricultural_Semester'));
      if (isSemesterPlaceholder(sem)) continue;
      const parsed = parsePeriodLabel(sem);
      if (!parsed) {
        return fail(
          'INVALID_SEMESTER',
          `Pesticides row ${rowNumber}: invalid Agricultural_Semester=${sem}`
        );
      }
      const qty = cellNumber(readMapped(values, pestMap, 'Bottles_or_Packs'));
      const price = cellNumber(readMapped(values, pestMap, 'Price_per_Bottle_or_Pack'));
      if (qty == null || price == null || qty < 0 || price < 0) {
        return fail(
          'INVALID_NUMERIC',
          `Pesticides row ${rowNumber}: Bottles_or_Packs and Price_per_Bottle_or_Pack must be ≥ 0.`
        );
      }
      const type = cellText(readMapped(values, pestMap, 'Pesticide_Type'));
      if (!type) {
        return fail('MISSING_VALUE', `Pesticides row ${rowNumber}: Pesticide_Type is required.`);
      }
      const prev = pestBySem.get(parsed.label) || 0;
      pestBySem.set(parsed.label, prev + qty * price);
    }
  }

  const semesterRows = [];
  const seen = new Map();
  let excelId = 0;

  for (const { rowNumber, values } of sheetRows(semWs)) {
    const semRaw = cellText(readMapped(values, semMap, 'Agricultural_Semester'));
    if (isSemesterPlaceholder(semRaw)) continue;
    const parsed = parsePeriodLabel(semRaw);
    if (!parsed) {
      return fail(
        'INVALID_SEMESTER',
        `Semesters row ${rowNumber}: invalid Agricultural_Semester=${semRaw}`
      );
    }
    if (seen.has(parsed.label)) {
      return fail(
        'DUPLICATE_PERIOD',
        `Duplicate Agricultural_Semester ${parsed.label} on Semesters sheet ` +
          `(rows ${seen.get(parsed.label)} and ${rowNumber}).`
      );
    }
    seen.set(parsed.label, rowNumber);

    const area = cellNumber(readMapped(values, semMap, 'Farm_Area_Hectares'));
    if (area == null || area <= 0) {
      return fail(
        'MISSING_FARM_AREA',
        `Semesters row ${rowNumber}: Farm_Area_Hectares must be > 0.`
      );
    }

    const planting = cellText(readMapped(values, semMap, 'Planting_Method'));
    if (!PLANTING_METHODS.has(planting)) {
      return fail(
        'UNSUPPORTED_PLANTING_METHOD',
        `Semesters row ${rowNumber}: Planting_Method must be sabog|talok.`
      );
    }
    const irrigation = cellText(readMapped(values, semMap, 'Irrigation'));
    if (!IRRIGATION_TYPES.has(irrigation)) {
      return fail(
        'UNSUPPORTED_IRRIGATION_TYPE',
        `Semesters row ${rowNumber}: unsupported Irrigation value.`
      );
    }

    const moneyFields = [
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
    const money = {};
    for (const h of moneyFields) {
      const n = cellNumber(readMapped(values, semMap, h));
      if (n == null || n < 0) {
        return fail(
          'INVALID_NUMERIC',
          `Semesters row ${rowNumber}: ${h} must be a number ≥ 0 (do not leave blank; use 0).`
        );
      }
      money[h] = n;
    }

    const rowLike = {
      land_preparation_cost: money.Land_Preparation_Cost,
      planting_cost: money.Planting_Cost,
      spraying_cost: money.Spraying_Cost,
      harvester_cost: money.Harvester_Fee,
      drying_cost: money.Drying_Fee,
      other_expenses: money.Other_Expenses,
      hauling_cost: money.Hauling_Fee,
      tarasko_cost: money.Tarasko,
      fuel_cost: money.Fuel,
    };

    const fertTotal = fertBySem.get(parsed.label) || 0;
    const pestTotal = pestBySem.get(parsed.label) || 0;
    fertBySem.delete(parsed.label);
    pestBySem.delete(parsed.label);

    const labor = laborRelatedCost(rowLike);
    const transport = transportCost(rowLike);
    const fuel = fuelCost(rowLike);
    const total_expenses = fertTotal + pestTotal + labor + transport + fuel;

    excelId += 1;
    semesterRows.push({
      id: `excel-${excelId}`,
      status: 'Eligible',
      agricultural_semester: parsed.label,
      area_hectares: area,
      planting_method: planting,
      irrigation_type: irrigation,
      ...rowLike,
      total_fertilizer_cost: fertTotal,
      total_pesticide_cost: pestTotal,
      total_expenses,
      source: 'excel',
    });
  }

  if (semesterRows.length < 1) {
    return fail('INSUFFICIENT_HISTORY', 'Semesters sheet has no data rows.');
  }

  if (fertBySem.size > 0) {
    return fail(
      'ORPHAN_DETAIL_ROWS',
      `Fertilizers reference unknown semester(s): ${[...fertBySem.keys()].join(', ')}`
    );
  }
  if (pestBySem.size > 0) {
    return fail(
      'ORPHAN_DETAIL_ROWS',
      `Pesticides reference unknown semester(s): ${[...pestBySem.keys()].join(', ')}`
    );
  }

  return {
    ok: true,
    rows: semesterRows,
    n_semesters: semesterRows.length,
    persisted: false,
  };
}

module.exports = {
  parsePredictiveExcelBuffer,
};
