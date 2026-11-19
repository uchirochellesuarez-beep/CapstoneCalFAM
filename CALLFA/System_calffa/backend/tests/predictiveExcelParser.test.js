const {
  buildPredictiveExcelTemplateBuffer,
  SEMESTER_HEADERS,
  FERT_HEADERS,
  PEST_HEADERS,
} = require('../services/predictiveExcelTemplate');
const { parsePredictiveExcelBuffer } = require('../services/predictiveExcelParser');
const { buildPretrainedLrFeatures } = require('../services/pretrainedLrFeatureBuilder');
const ExcelJS = require('exceljs');

async function workbookWithSemesters(semesterRows, fertRows = [], pestRows = []) {
  const wb = new ExcelJS.Workbook();
  const sem = wb.addWorksheet('Semesters');
  sem.addRow(SEMESTER_HEADERS);
  for (const r of semesterRows) sem.addRow(r);
  const fert = wb.addWorksheet('Fertilizers');
  fert.addRow(FERT_HEADERS);
  for (const r of fertRows) fert.addRow(r);
  const pest = wb.addWorksheet('Pesticides');
  pest.addRow(PEST_HEADERS);
  for (const r of pestRows) pest.addRow(r);
  return Buffer.from(await wb.xlsx.writeBuffer());
}

const sampleSem = (label) => [
  label,
  1.0,
  'sabog',
  'NIA',
  1000,
  1500,
  500,
  2000,
  400,
  300,
  200,
  250,
  100,
];

describe('predictive Excel template + parser', () => {
  test('template has headers only (no sample semester data)', async () => {
    const buf = await buildPredictiveExcelTemplateBuffer();
    expect(Buffer.isBuffer(buf)).toBe(true);
    expect(buf.length).toBeGreaterThan(100);
    const parsed = await parsePredictiveExcelBuffer(buf);
    expect(parsed.ok).toBe(false);
    expect(parsed.error_code).toBe('INSUFFICIENT_HISTORY');
  });

  test('parses semester column (not upload date) and builds 21 features', async () => {
    const buf = await workbookWithSemesters(
      [sampleSem('2025-H1'), sampleSem('2025-H2')],
      [
        ['2025-H1', 'Urea', 2, 1500],
        ['2025-H2', 'Urea', 2, 1600],
      ],
      [
        ['2025-H1', 'Insecticide', 1, 800],
        ['2025-H2', 'Insecticide', 1, 850],
      ]
    );
    const parsed = await parsePredictiveExcelBuffer(buf);
    expect(parsed.ok).toBe(true);
    expect(parsed.persisted).toBe(false);
    expect(parsed.rows).toHaveLength(2);
    expect(parsed.rows[0].agricultural_semester).toBe('2025-H1');
    expect(parsed.rows[1].agricultural_semester).toBe('2025-H2');

    const built = buildPretrainedLrFeatures(parsed.rows, {
      period_mode: 'row_period',
      auto_forecast_period: true,
      require_eligible: false,
    });
    expect(built.ok).toBe(true);
    expect(built.latest_history_period).toBe('2025-H2');
    expect(built.forecast_period).toBe('2026-H1');
    expect(Object.keys(built.feature_vector)).toHaveLength(21);
  });

  test('rejects duplicate Agricultural_Semester in Excel', async () => {
    const buf = await workbookWithSemesters([
      sampleSem('2025-H1'),
      sampleSem('2025-H1'),
    ]);
    const parsed = await parsePredictiveExcelBuffer(buf);
    expect(parsed.ok).toBe(false);
    expect(parsed.error_code).toBe('DUPLICATE_PERIOD');
  });

  test('December history → next-year H1 forecast', async () => {
    const buf = await workbookWithSemesters([sampleSem('2026-H2')]);
    const parsed = await parsePredictiveExcelBuffer(buf);
    expect(parsed.ok).toBe(true);
    const built = buildPretrainedLrFeatures(parsed.rows, {
      period_mode: 'row_period',
      auto_forecast_period: true,
      require_eligible: false,
    });
    expect(built.latest_history_period).toBe('2026-H2');
    expect(built.forecast_period).toBe('2027-H1');
  });
});
