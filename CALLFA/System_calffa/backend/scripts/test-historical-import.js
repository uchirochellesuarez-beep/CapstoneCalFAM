const ExcelJS = require('exceljs');
const {
  validateRows,
  present,
  readSheetRows,
  mapBookingStatus,
  parseDate,
  TEMPLATE_HEADERS
} = require('../services/historical-booking-import');

const farmer = {
  id: 7,
  reference_number: 'FR-7',
  full_name: 'Ana Cruz',
  status: 'approved',
  barangay_id: 1,
  membership_status: 'member'
};

const harvester = {
  id: 3,
  machinery_name: 'Rice Harvester',
  barangay_id: 1,
  member_price: 500,
  non_member_price: 625,
  price_per_unit: 500,
  unit_type: 'per hectare'
};

const context = {
  today: '2026-10-15',
  farmersById: new Map([[7, farmer]]),
  farmersByReference: new Map([['fr 7', farmer]]),
  machineryByName: new Map([
    ['rice harvester', [harvester]]
  ]),
  existingBookings: new Set(['7|3|2024-01-01'])
};

function row(rowNumber, record) {
  return { rowNumber, record };
}

function base(overrides = {}) {
  return {
    reference_number: 'FR-7',
    machinery_name: 'Rice Harvester',
    booking_date: '2024-03-01',
    service_location: 'Purok 1',
    area_size: 1.5,
    booking_status: 'Completed',
    ...overrides
  };
}

function check(name, condition) {
  if (!condition) {
    console.error('FAIL', name);
    process.exitCode = 1;
  } else {
    console.log('ok', name);
  }
}

async function workbookBuffer(dataRows) {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bookings');
  sheet.addRow(TEMPLATE_HEADERS);
  dataRows.forEach((data) => sheet.addRow(TEMPLATE_HEADERS.map((key) => data[key] ?? '')));
  return workbook.xlsx.writeBuffer();
}

async function main() {
  check('template has one farmer reference column', TEMPLATE_HEADERS.filter((header) => header.includes('reference')).length === 1);
  check('template has no payment columns', !TEMPLATE_HEADERS.some((header) => /amount|paid|balance|payment/.test(header)));

  const valid = validateRows([row(2, base())], context);
  check('completed booking is ready without payment', present(valid).canCommit && valid[0].data.area_unit === 'hectares');
  check('total is member price times area', valid[0].data.total_price === 750 && valid[0].preview.total_price === 750);

  const flat = validateRows([row(2, base({ machinery_name: 'Dryer', area_size: 2 }))], {
    ...context,
    machineryByName: new Map([['dryer', [{
      id: 9,
      machinery_name: 'Dryer',
      barangay_id: 1,
      member_price: 7500,
      price_per_unit: 7500,
      unit_type: 'per load'
    }]]])
  });
  check('per load price is not multiplied', flat[0].data.total_price === 7500);

  const noPrice = validateRows([row(2, base({ machinery_name: 'Pump' }))], {
    ...context,
    machineryByName: new Map([['pump', [{
      id: 10,
      machinery_name: 'Pump',
      barangay_id: 1,
      member_price: 0,
      price_per_unit: 0,
      unit_type: 'per hectare'
    }]]])
  });
  check('missing price is invalid', noPrice[0].outcome === 'invalid');

  const pending = validateRows([row(2, base({ booking_status: 'Pending', booking_date: '2024-05-01' }))], context);
  check('pending booking is ready', pending[0].outcome === 'ready' && pending[0].data.status === 'Pending');

  const sameFarmer = validateRows([
    row(2, base({ booking_date: '2024-03-01' })),
    row(3, base({ booking_date: '2024-04-01', booking_status: 'Pending' }))
  ], context);
  check('same farmer two dates', present(sameFarmer).summary.ready === 2);

  ['Pending', 'approved', 'COMPLETED', 'Rejected', 'cancelled', 'Expired'].forEach((status) => {
    check(`status ${status}`, Boolean(mapBookingStatus(status).value));
  });
  check('bad status rejected', Boolean(mapBookingStatus('Archived').error));

  const dupFile = validateRows([
    row(2, base()),
    row(3, base())
  ], context);
  check('same farmer machine and date in file is invalid', present(dupFile).summary.invalid === 1 && present(dupFile).canCommit === false);

  const dupDb = validateRows([row(2, base({ booking_date: '2024-01-01' }))], context);
  check('existing booking is skipped', dupDb[0].outcome === 'duplicate' && present(dupDb).canCommit === false);

  const unknown = validateRows([row(2, base({ reference_number: 'NO-SUCH' }))], context);
  check('unknown farmer reference flagged', unknown[0].errors.some((error) => error.column === 'reference_number'));

  const badDate = validateRows([row(2, base({ booking_date: '03/04/2024' }))], context);
  check('ambiguous date flagged', badDate[0].errors.some((error) => error.column === 'booking_date'));

  const future = validateRows([row(2, base({ booking_date: '2027-01-01' }))], context);
  check('future date flagged', future[0].errors.some((error) => error.column === 'booking_date'));

  check('iso date', parseDate('2024-03-01').value === '2024-03-01');

  const buffer = await workbookBuffer([
    base({ booking_date: '2024-06-01' }),
    base({ booking_date: '2024-07-01', booking_status: 'Pending' })
  ]);
  const parsed = await readSheetRows(Buffer.from(buffer));
  const fromFile = validateRows(parsed, context);
  check('xlsx round trip two rows', present(fromFile).summary.ready === 2);

  const empty = new ExcelJS.Workbook();
  empty.addWorksheet('Bookings').addRow(TEMPLATE_HEADERS);
  const emptyRows = await readSheetRows(Buffer.from(await empty.xlsx.writeBuffer()));
  check('empty sheet has no data rows', emptyRows.length === 0);

  if (process.exitCode) console.error('Historical import checks failed');
  else console.log('All historical import checks passed');

  try {
    await require('../db').end();
  } catch {
    /* pool may not be open */
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
