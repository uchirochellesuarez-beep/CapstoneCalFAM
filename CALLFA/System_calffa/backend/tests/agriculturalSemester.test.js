const {
  semesterFromCreatedAt,
  nextSemester,
  parsePeriodLabel,
  manilaYmdParts,
} = require('../services/agriculturalSemester');

describe('agriculturalSemester (Asia/Manila)', () => {
  test('Jan–Jun → H1', () => {
    expect(semesterFromCreatedAt('2026-03-15T04:00:00.000Z').label).toBe('2026-H1');
    expect(semesterFromCreatedAt('2026-01-01T00:00:00+08:00').label).toBe('2026-H1');
  });

  test('Jul–Dec → H2', () => {
    expect(semesterFromCreatedAt('2026-11-19T04:00:00.000Z').label).toBe('2026-H2');
    expect(semesterFromCreatedAt('2026-12-31T12:00:00+08:00').label).toBe('2026-H2');
  });

  test('June 30 boundary stays H1 in Manila', () => {
    // 2026-06-30 23:59 Asia/Manila
    expect(semesterFromCreatedAt('2026-06-30T15:59:00.000Z').label).toBe('2026-H1');
    expect(semesterFromCreatedAt('2026-06-30T00:00:00+08:00').label).toBe('2026-H1');
  });

  test('July 1 boundary becomes H2 in Manila', () => {
    // 2026-07-01 00:00 Asia/Manila == 2026-06-30 16:00 UTC
    expect(semesterFromCreatedAt('2026-06-30T16:00:00.000Z').label).toBe('2026-H2');
    expect(semesterFromCreatedAt('2026-07-01T00:00:00+08:00').label).toBe('2026-H2');
  });

  test('Philippine timezone: UTC evening before Manila midnight stays previous calendar day', () => {
    // 2026-06-30 15:30 UTC = June 30 23:30 Manila → H1
    const ymd = manilaYmdParts('2026-06-30T15:30:00.000Z');
    expect(ymd).toEqual({ year: 2026, month: 6, day: 30 });
    expect(semesterFromCreatedAt('2026-06-30T15:30:00.000Z').label).toBe('2026-H1');
  });

  test('nextSemester advances H1→H2 and H2→next-year H1', () => {
    expect(nextSemester('2025-H1').label).toBe('2025-H2');
    expect(nextSemester('2025-H2').label).toBe('2026-H1');
    expect(nextSemester('2026-H1').label).toBe('2026-H2');
    expect(nextSemester('2026-H2').label).toBe('2027-H1');
    expect(nextSemester(parsePeriodLabel('2026-H2')).label).toBe('2027-H1');
  });
});
