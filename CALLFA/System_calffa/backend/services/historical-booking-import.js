const ExcelJS = require('exceljs');
const { BOOKING_STATUS_ENUM_VALUES, shouldUseNonMemberRate } = require('./booking-workflow');
const { getManilaTodayString } = require('../utils/philippinesTime');

const MAX_ROWS = 5000;
const MAX_BYTES = 5 * 1024 * 1024;
const PREVIEW_ROW_LIMIT = 80;
const ERROR_LIMIT = 200;

const HEADER_ALIASES = {
  reference_number: ['reference_number', 'farmer_reference', 'farmer_reference_number', 'member_reference', 'member_no'],
  machinery_name: ['machinery_name', 'machinery', 'equipment'],
  booking_date: ['booking_date', 'service_date', 'scheduled_service_date', 'date'],
  service_location: ['service_location', 'location', 'service_location_barangay'],
  area_size: ['area_size', 'area', 'hectares', 'area_hectares'],
  booking_status: ['booking_status', 'status', 'transaction_status']
};

const TEMPLATE_HEADERS = [
  'reference_number',
  'machinery_name',
  'booking_date',
  'service_location',
  'area_size',
  'booking_status'
];

const STATUS_LOOKUP = BOOKING_STATUS_ENUM_VALUES.reduce((map, status) => {
  map[normalizeKey(status)] = status;
  return map;
}, {});
STATUS_LOOKUP.canceled = 'Cancelled';
STATUS_LOOKUP.complete = 'Completed';

function normalizeKey(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[_./-]+/g, ' ')
    .replace(/\s+/g, ' ');
}

function normalizeName(value) {
  return normalizeKey(value);
}

function roundMoney(value) {
  return Math.round((Number(value) + Number.EPSILON) * 100) / 100;
}

function priceForImportedBooking(machine, farmer, areaSize) {
  const useNonMemberRate = shouldUseNonMemberRate(
    farmer?.membership_status || 'member',
    farmer?.barangay_id,
    machine?.barangay_id
  );
  let pricePerUnit;
  if (useNonMemberRate && machine?.non_member_price) {
    pricePerUnit = parseFloat(machine.non_member_price);
  } else if (!useNonMemberRate && machine?.member_price) {
    pricePerUnit = parseFloat(machine.member_price);
  } else if (useNonMemberRate) {
    pricePerUnit = parseFloat(machine?.price_per_unit) * 1.25;
  } else {
    pricePerUnit = parseFloat(machine?.price_per_unit);
  }

  if (!Number.isFinite(pricePerUnit) || pricePerUnit <= 0) {
    return { error: 'This machine has no price, so the amount to pay cannot be calculated.' };
  }

  const size = parseFloat(areaSize);
  if (!Number.isFinite(size) || size <= 0) return { error: null, value: null };
  const unit = String(machine.unit_type || '').toLowerCase();
  const flatRate = unit === 'per load' || unit === 'load';
  const total = flatRate ? pricePerUnit : pricePerUnit * size;
  const value = roundMoney(total);
  if (!Number.isFinite(value) || value <= 0) {
    return { error: 'This machine has no price, so the amount to pay cannot be calculated.' };
  }
  return { value };
}

function headerKey(value) {
  const key = normalizeKey(value).replace(/ /g, '_');
  for (const [canonical, aliases] of Object.entries(HEADER_ALIASES)) {
    if (aliases.includes(key) || key === canonical) return canonical;
  }
  return null;
}

function cellPlain(value) {
  if (value == null) return '';
  if (value instanceof Date) return value;
  if (typeof value === 'object') {
    if (Object.prototype.hasOwnProperty.call(value, 'formula')) {
      if (value.result == null || value.result === '') {
        return { formulaRejected: true };
      }
      return cellPlain(value.result);
    }
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text || '').join('');
    }
    if (value.text && value.hyperlink) return String(value.text);
    if (value.text) return String(value.text);
    return String(value);
  }
  return value;
}

function asText(value) {
  const plain = cellPlain(value);
  if (plain && plain.formulaRejected) return plain;
  if (plain instanceof Date) return plain;
  return String(plain ?? '').trim();
}

function parseDate(value) {
  const plain = cellPlain(value);
  if (plain && plain.formulaRejected) return { error: 'Spreadsheet formulas are not allowed.' };
  if (plain === '' || plain == null) return { value: null };
  if (plain instanceof Date && !Number.isNaN(plain.getTime())) {
    return { value: plain.toISOString().slice(0, 10) };
  }
  if (typeof plain === 'number' && Number.isFinite(plain)) {
    const utc = new Date(Date.UTC(1899, 11, 30) + Math.round(plain) * 86400000);
    return { value: utc.toISOString().slice(0, 10) };
  }
  const text = String(plain).trim();
  if (/^=/.test(text)) return { error: 'Spreadsheet formulas are not allowed.' };
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(text);
  if (iso) return validYmd(iso[1], iso[2], iso[3]);
  const slash = /^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/.exec(text);
  if (slash) {
    const a = Number(slash[1]);
    const b = Number(slash[2]);
    const year = slash[3];
    if (a > 12 && b <= 12) return validYmd(year, b, a);
    if (b > 12 && a <= 12) return validYmd(year, a, b);
    return { error: 'Use YYYY-MM-DD. This date can be read as either day/month or month/day.' };
  }
  return { error: 'Use the date format YYYY-MM-DD.' };
}

function validYmd(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (m < 1 || m > 12 || d < 1 || d > 31) return { error: 'Date is not a real calendar date.' };
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) {
    return { error: 'Date is not a real calendar date.' };
  }
  return { value: `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}` };
}

function parseMoney(value, { required = false, label = 'Amount' } = {}) {
  const plain = cellPlain(value);
  if (plain && plain.formulaRejected) return { error: 'Spreadsheet formulas are not allowed.' };
  if (plain === '' || plain == null) {
    if (required) return { error: `${label} is required.` };
    return { value: null };
  }
  if (typeof plain === 'number' && Number.isFinite(plain)) {
    return moneyResult(plain, label);
  }
  const text = String(plain).trim();
  if (/^=/.test(text)) return { error: 'Spreadsheet formulas are not allowed.' };
  const cleaned = text.replace(/[₱,\s]/g, '');
  if (!cleaned) {
    if (required) return { error: `${label} is required.` };
    return { value: null };
  }
  if (!/^-?\d+(\.\d+)?$/.test(cleaned)) return { error: `${label} must be a number.` };
  return moneyResult(Number(cleaned), label);
}

function moneyResult(amount, label) {
  if (!Number.isFinite(amount)) return { error: `${label} must be a number.` };
  if (amount < 0) return { error: `${label} cannot be negative.` };
  return { value: Math.round(amount * 100) / 100 };
}

function mapBookingStatus(value) {
  const text = asText(value);
  if (text && text.formulaRejected) return { error: 'Spreadsheet formulas are not allowed.' };
  if (!text) return { error: 'Booking status is required.' };
  const status = STATUS_LOOKUP[normalizeKey(text)];
  if (!status) {
    return { error: `Unsupported booking status "${text}". Use one of: ${BOOKING_STATUS_ENUM_VALUES.join(', ')}.` };
  }
  return { value: status };
}

function blankRow(record) {
  return TEMPLATE_HEADERS.every((key) => {
    const value = record[key];
    return value == null || String(value).trim() === '';
  });
}

async function readSheetRows(buffer) {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);
  const sheet = workbook.getWorksheet('Bookings') || workbook.worksheets[0];
  if (!sheet) {
    const error = new Error('The workbook has no worksheets.');
    error.statusCode = 400;
    throw error;
  }

  const headerRow = sheet.getRow(1);
  const columnMap = new Map();
  headerRow.eachCell({ includeEmpty: false }, (cell, col) => {
    const key = headerKey(cell.value);
    if (key && !columnMap.has(key)) columnMap.set(key, col);
  });

  const missing = ['reference_number', 'machinery_name', 'booking_date', 'area_size', 'booking_status']
    .filter((key) => !columnMap.has(key));
  if (missing.length) {
    const error = new Error(`The template is missing required columns: ${missing.join(', ')}. Download a fresh template.`);
    error.statusCode = 400;
    throw error;
  }

  const rows = [];
  const last = Math.min(sheet.rowCount || 1, MAX_ROWS + 5);
  for (let rowNumber = 2; rowNumber <= last; rowNumber += 1) {
    const row = sheet.getRow(rowNumber);
    const record = {};
    for (const [key, col] of columnMap.entries()) {
      record[key] = row.getCell(col).value;
    }
    if (blankRow(record)) continue;
    rows.push({ rowNumber, record });
    if (rows.length > MAX_ROWS) {
      const error = new Error(`The file has more than ${MAX_ROWS} data rows. Split it into smaller workbooks.`);
      error.statusCode = 400;
      throw error;
    }
  }
  return rows;
}

function pushError(errors, column, message) {
  errors.push({ column, message });
}

function bookingKey(farmerId, machineryId, bookingDate) {
  return `${farmerId}|${machineryId}|${bookingDate}`;
}

function validateRecord(entry, context, seenKeys) {
  const { record, rowNumber } = entry;
  const errors = [];
  const refText = asText(record.reference_number);
  if (refText && refText.formulaRejected) {
    pushError(errors, 'reference_number', 'Spreadsheet formulas are not allowed.');
  }
  const reference = refText && refText.formulaRejected ? '' : String(refText || '').trim();
  if (!reference) pushError(errors, 'reference_number', 'Farmer reference number is required.');
  else if (/^=/.test(reference)) pushError(errors, 'reference_number', 'Spreadsheet formulas are not allowed.');

  let farmer = null;
  if (reference && !(refText && refText.formulaRejected)) {
    farmer = context.farmersByReference.get(normalizeKey(reference)) || null;
    if (!farmer) {
      pushError(errors, 'reference_number', 'No farmer in your barangay uses this reference number.');
    } else if (String(farmer.status || '').toLowerCase() !== 'approved') {
      pushError(errors, 'reference_number', 'This farmer account is not approved, so it cannot be linked.');
      farmer = null;
    }
  }

  const machineryName = asText(record.machinery_name);
  let machinery = null;
  if (machineryName && machineryName.formulaRejected) {
    pushError(errors, 'machinery_name', 'Spreadsheet formulas are not allowed.');
  } else if (!String(machineryName || '').trim()) {
    pushError(errors, 'machinery_name', 'Machinery name is required.');
  } else {
    const matches = context.machineryByName.get(normalizeName(machineryName)) || [];
    if (matches.length === 0) pushError(errors, 'machinery_name', 'No machinery in your barangay uses this name.');
    else if (matches.length > 1) pushError(errors, 'machinery_name', 'This name is shared by more than one machine. Each machine needs its own name.');
    else machinery = matches[0];
  }

  const bookingDate = parseDate(record.booking_date);
  if (bookingDate.error) pushError(errors, 'booking_date', bookingDate.error);
  else if (!bookingDate.value) pushError(errors, 'booking_date', 'Booking date is required.');
  else if (bookingDate.value > context.today) {
    pushError(errors, 'booking_date', 'Historical imports cannot use a future service date.');
  }

  const area = parseMoney(record.area_size, { required: true, label: 'Area' });
  if (area.error) pushError(errors, 'area_size', area.error);
  else if (!area.value) pushError(errors, 'area_size', 'Area must be greater than zero.');

  let totalPrice = null;
  if (machinery && area.value) {
    const priced = priceForImportedBooking(machinery, farmer, area.value);
    if (priced.error) pushError(errors, 'machinery_name', priced.error);
    else totalPrice = priced.value;
  }

  const bookingStatus = mapBookingStatus(record.booking_status);
  if (bookingStatus.error) pushError(errors, 'booking_status', bookingStatus.error);

  const location = asText(record.service_location);
  if (location && location.formulaRejected) pushError(errors, 'service_location', 'Spreadsheet formulas are not allowed.');

  let duplicateInFile = false;
  let existing = false;
  if (farmer && machinery && bookingDate.value) {
    const key = bookingKey(farmer.id, machinery.id, bookingDate.value);
    if (seenKeys.has(key)) {
      duplicateInFile = true;
      pushError(errors, 'booking_date', `This farmer already has this machine on this date in row ${seenKeys.get(key)}.`);
    } else {
      seenKeys.set(key, rowNumber);
    }
    existing = context.existingBookings.has(key);
  }

  let outcome = 'ready';
  if (errors.length || duplicateInFile) outcome = 'invalid';
  else if (existing) outcome = 'duplicate';

  return {
    rowNumber,
    outcome,
    errors,
    preview: {
      reference_number: farmer?.reference_number || reference,
      farmer_name: farmer?.full_name || '',
      machinery_name: machinery?.machinery_name || (typeof machineryName === 'string' ? machineryName : ''),
      service_location: location && !location.formulaRejected ? String(location).trim() : '',
      area_size: area.value,
      booking_date: bookingDate.value || '',
      booking_status: bookingStatus.value || '',
      total_price: totalPrice
    },
    data: outcome === 'ready' ? {
      historical_reference: `F${farmer.id}-M${machinery.id}-${bookingDate.value}`,
      farmer_id: farmer.id,
      machinery_id: machinery.id,
      booking_date: bookingDate.value,
      service_location: String(location || '').trim().slice(0, 255) || null,
      area_size: area.value,
      area_unit: 'hectares',
      total_price: totalPrice,
      status: bookingStatus.value
    } : null
  };
}

function summarize(results) {
  const summary = {
    total: results.length,
    ready: 0,
    invalid: 0,
    duplicate: 0
  };
  for (const row of results) summary[row.outcome] += 1;
  return summary;
}

function present(results) {
  const summary = summarize(results);
  const errors = [];
  for (const row of results) {
    if (row.outcome !== 'invalid') continue;
    for (const error of row.errors) {
      if (errors.length >= ERROR_LIMIT) break;
      errors.push({ row: row.rowNumber, column: error.column, message: error.message });
    }
  }
  return {
    summary,
    errors,
    rows: results.slice(0, PREVIEW_ROW_LIMIT).map((row) => ({
      row: row.rowNumber,
      outcome: row.outcome,
      ...row.preview,
      errors: row.errors
    })),
    previewLimited: results.length > PREVIEW_ROW_LIMIT,
    canCommit: summary.invalid === 0 && summary.ready > 0
  };
}

function validateRows(entries, context) {
  const seenRefs = new Map();
  return entries.map((entry) => validateRecord(entry, context, seenRefs));
}

async function loadContext(pool, barangayId) {
  const [farmers] = await pool.execute(
    `SELECT id, reference_number, full_name, status, barangay_id, membership_status
     FROM farmers
     WHERE barangay_id = ?`,
    [barangayId]
  );
  const [machines] = await pool.execute(
    `SELECT id, machinery_name, barangay_id, price_per_unit, member_price, non_member_price, unit_type
     FROM machinery_inventory
     WHERE barangay_id = ?`,
    [barangayId]
  );
  const [existing] = await pool.execute(
    `SELECT farmer_id, machinery_id, DATE_FORMAT(booking_date, '%Y-%m-%d') AS booking_date
     FROM machinery_bookings
     WHERE barangay_id = ?`,
    [barangayId]
  );

  const farmersById = new Map();
  const farmersByReference = new Map();
  for (const farmer of farmers) {
    farmersById.set(Number(farmer.id), farmer);
    if (farmer.reference_number) {
      farmersByReference.set(normalizeKey(farmer.reference_number), farmer);
    }
  }
  const machineryByName = new Map();
  for (const machine of machines) {
    const key = normalizeName(machine.machinery_name);
    const list = machineryByName.get(key) || [];
    list.push(machine);
    machineryByName.set(key, list);
  }
  const existingBookings = new Set(
    existing.map((row) => bookingKey(row.farmer_id, row.machinery_id, String(row.booking_date).slice(0, 10)))
  );

  return {
    today: getManilaTodayString(),
    farmersById,
    farmersByReference,
    machineryByName,
    existingBookings
  };
}

async function analyzeWorkbook(pool, user, buffer) {
  assertOperationManager(user);
  const entries = await readSheetRows(buffer);
  if (!entries.length) {
    const error = new Error('The Bookings sheet has no data rows.');
    error.statusCode = 400;
    throw error;
  }
  const context = await loadContext(pool, user.barangay_id);
  const results = validateRows(entries, context);
  return { results, presentation: present(results) };
}

function assertOperationManager(user) {
  if (String(user?.role || '') !== 'operation_manager') {
    const error = new Error('Only the operation manager can import historical bookings.');
    error.statusCode = 403;
    throw error;
  }
  if (!parseInt(user.barangay_id, 10)) {
    const error = new Error('Your account is not assigned to a barangay.');
    error.statusCode = 400;
    throw error;
  }
}

async function commitWorkbook(pool, user, buffer, filename) {
  const { results, presentation } = await analyzeWorkbook(pool, user, buffer);
  if (!presentation.canCommit) {
    const error = new Error(
      presentation.summary.invalid
        ? 'Fix the invalid rows before importing. Nothing was saved.'
        : 'No new historical records to import.'
    );
    error.statusCode = 400;
    error.preview = presentation;
    throw error;
  }

  const ready = results.filter((row) => row.outcome === 'ready' && row.data);
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [batch] = await connection.execute(
      `INSERT INTO machinery_historical_imports
       (imported_by, barangay_id, filename, row_count, imported_count, skipped_count, rejected_count)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        user.id,
        user.barangay_id,
        String(filename || '').slice(0, 255) || null,
        presentation.summary.total,
        ready.length,
        presentation.summary.duplicate,
        presentation.summary.invalid
      ]
    );
    const batchId = batch.insertId;

    for (const row of ready) {
      const data = row.data;
      await connection.execute(
        `INSERT INTO machinery_bookings
         (farmer_id, machinery_id, barangay_id, booking_date, service_location, area_size, area_unit,
          total_price, total_paid, remaining_balance, payment_status, payment_date, last_payment_date,
          notes, status, completed_date, historical_reference, is_historical_import, imported_by, imported_at, import_batch_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?, NOW(), ?)`,
        [
          data.farmer_id,
          data.machinery_id,
          user.barangay_id,
          data.booking_date,
          data.service_location,
          data.area_size,
          data.area_unit,
          data.total_price,
          0,
          data.total_price,
          'Unpaid',
          null,
          null,
          null,
          data.status,
          data.status === 'Completed' ? `${data.booking_date} 00:00:00` : null,
          data.historical_reference,
          user.id,
          batchId
        ]
      );
    }

    await connection.commit();
    return {
      batch_id: batchId,
      imported: ready.length,
      skipped: presentation.summary.duplicate,
      rejected: presentation.summary.invalid,
      total: presentation.summary.total
    };
  } catch (error) {
    await connection.rollback();
    if (error.code === 'ER_DUP_ENTRY') {
      const duplicate = new Error('A reference number in this file was already imported. Preview the file again. Nothing was saved.');
      duplicate.statusCode = 409;
      throw duplicate;
    }
    throw error;
  } finally {
    connection.release();
  }
}

async function buildTemplateBuffer(machineNames = []) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'CALFAM';
  const sheet = workbook.addWorksheet('Bookings');
  sheet.columns = TEMPLATE_HEADERS.map((header) => ({
    header,
    key: header,
    width: Math.max(18, header.length + 2)
  }));
  sheet.getRow(1).font = { bold: true, color: { argb: 'FFFFFFFF' } };
  sheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF166534' }
  };
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  const names = [...new Set((machineNames || []).map((name) => String(name || '').trim()).filter(Boolean))];
  if (names.length) {
    const list = workbook.addWorksheet('Machines');
    names.forEach((name, index) => {
      list.getCell(index + 1, 1).value = name;
    });
    list.state = 'veryHidden';
    sheet.dataValidations.add(`B2:B${MAX_ROWS + 1}`, {
      type: 'list',
      allowBlank: false,
      formulae: [`Machines!$A$1:$A$${names.length}`],
      showErrorMessage: true,
      errorTitle: 'Unknown machinery',
      error: 'Choose one machinery name from the list. Each name belongs to one machine.'
    });
  }

  const help = workbook.addWorksheet('Instructions');
  const lines = [
    'Historical machinery booking import',
    '',
    'One booking per row. Keep the header row on the Bookings sheet.',
    'reference_number is the farmer reference number already stored on the farmer account. The system uses it to find that farmer.',
    'The same farmer can have many rows when the machine or the date is different.',
    'Required: reference_number, machinery_name, booking_date, area_size, booking_status.',
    'Optional: service_location.',
    'Dates must be YYYY-MM-DD and cannot be in the future. Area is in hectares.',
    'Do not type an amount. The total to pay is calculated from the machinery name: the machine price times the area, or the flat price when the machine is charged per load.',
    'Collected payments are not imported. The balance stays unpaid until it is collected later.',
    'Completed means the service is done. Pending means the booking is recorded and payment is still to be collected later.',
    `Other accepted statuses: ${BOOKING_STATUS_ENUM_VALUES.join(', ')}.`,
    'machinery_name must be the exact name of one machine in your barangay. Two machines cannot share a name. Choose it from the dropdown.',
    'A row is skipped when that farmer, machine, and date are already in the system. Live bookings are not overwritten.',
    `Maximum ${MAX_ROWS} data rows and a 5 MB .xlsx file.`
  ];
  lines.forEach((line) => help.addRow([line]));
  help.getColumn(1).width = 120;
  return workbook.xlsx.writeBuffer();
}

module.exports = {
  MAX_BYTES,
  MAX_ROWS,
  TEMPLATE_HEADERS,
  BOOKING_STATUS_ENUM_VALUES,
  readSheetRows,
  validateRows,
  present,
  analyzeWorkbook,
  commitWorkbook,
  buildTemplateBuffer,
  parseDate,
  mapBookingStatus,
  priceForImportedBooking,
  backfillHistoricalBookingTotals
};

async function backfillHistoricalBookingTotals(pool) {
  const [rows] = await pool.query(
    `SELECT mb.id, mb.area_size, mb.total_paid,
            f.membership_status, f.barangay_id AS farmer_barangay_id,
            mi.barangay_id, mi.member_price, mi.non_member_price, mi.price_per_unit, mi.unit_type
     FROM machinery_bookings mb
     JOIN farmers f ON f.id = mb.farmer_id
     JOIN machinery_inventory mi ON mi.id = mb.machinery_id
     WHERE mb.is_historical_import = 1
       AND (mb.total_price IS NULL OR mb.total_price = 0)`
  );
  let updated = 0;
  for (const row of rows) {
    const priced = priceForImportedBooking(
      row,
      { membership_status: row.membership_status, barangay_id: row.farmer_barangay_id },
      row.area_size
    );
    if (!priced.value) continue;
    const paid = roundMoney(row.total_paid || 0);
    const remaining = roundMoney(Math.max(0, priced.value - paid));
    const paymentStatus = remaining <= 0 ? 'Paid' : (paid > 0 ? 'Partial' : 'Unpaid');
    await pool.execute(
      `UPDATE machinery_bookings
       SET total_price = ?, remaining_balance = ?, payment_status = ?
       WHERE id = ? AND (total_price IS NULL OR total_price = 0)`,
      [priced.value, remaining, paymentStatus, row.id]
    );
    updated += 1;
  }
  if (updated) console.log(`✅ Set the amount to pay on ${updated} imported booking${updated === 1 ? '' : 's'}`);
  return updated;
}
