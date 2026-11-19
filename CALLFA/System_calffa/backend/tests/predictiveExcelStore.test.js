const {
  findFarmIncomeSemesterConflicts,
} = require('../services/predictiveExcelStore');

describe('predictiveExcelStore semester conflict validation', () => {
  test('flags Excel semester that matches Farm Income created_at semester', () => {
    const excelRows = [
      { agricultural_semester: '2026-H1' },
      { agricultural_semester: '2026-H2' },
    ];
    const farmIncome = [
      {
        id: 10,
        farmer_id: 2,
        farmer_name: 'Juan Dela Cruz',
        status: 'Eligible',
        created_at: '2026-03-15T00:00:00+08:00',
      },
    ];
    const conflicts = findFarmIncomeSemesterConflicts(excelRows, farmIncome);
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].excel_semester).toBe('2026-H1');
    expect(conflicts[0].year).toBe(2026);
    expect(conflicts[0].half).toBe('H1');
    expect(conflicts[0].farm_income_record_id).toBe(10);
    expect(conflicts[0].farmer_name).toBe('Juan Dela Cruz');
  });

  test('ignores Rejected farm income for conflict', () => {
    const conflicts = findFarmIncomeSemesterConflicts(
      [{ agricultural_semester: '2026-H2' }],
      [{ id: 3, status: 'Rejected', created_at: '2026-11-01T00:00:00+08:00' }]
    );
    expect(conflicts).toHaveLength(0);
  });

  test('allows Excel when Farm Income is a different semester/year', () => {
    const conflicts = findFarmIncomeSemesterConflicts(
      [{ agricultural_semester: '2025-H1' }],
      [{ id: 2, status: 'Eligible', created_at: '2026-11-19T00:00:00+08:00' }]
    );
    expect(conflicts).toHaveLength(0);
  });
});
