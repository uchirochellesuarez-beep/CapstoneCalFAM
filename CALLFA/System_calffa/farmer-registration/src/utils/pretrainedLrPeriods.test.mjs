import assert from 'node:assert/strict'
import {
  parsePeriodLabel,
  buildSemesterOptions,
  validatePretrainedLrSelections,
  buildPretrainedLrRequestBody,
  isEligibleIncomeStatus,
} from './pretrainedLrPeriods.js'

function run(name, fn) {
  try {
    fn()
    console.log(`ok - ${name}`)
  } catch (err) {
    console.error(`fail - ${name}`)
    throw err
  }
}

run('parsePeriodLabel', () => {
  assert.equal(parsePeriodLabel('2026-H1').period_index, 11)
  assert.equal(parsePeriodLabel('bad'), null)
})

run('semester options include H1/H2', () => {
  const opts = buildSemesterOptions(2025, 2026)
  assert.deepEqual(opts, ['2025-H1', '2025-H2', '2026-H1', '2026-H2'])
})

run('eligible status', () => {
  assert.equal(isEligibleIncomeStatus('Eligible'), true)
  assert.equal(isEligibleIncomeStatus('Pending'), false)
})

run('missing history', () => {
  const v = validatePretrainedLrSelections([], {}, '2026-H1')
  assert.equal(v.error_code, 'INSUFFICIENT_HISTORY')
})

run('requires record periods (no created_at inference)', () => {
  const v = validatePretrainedLrSelections([{ id: 1 }], {}, '2026-H1')
  assert.equal(v.error_code, 'AGRICULTURAL_PERIOD_REQUIRED')
})

run('duplicate semester rejected', () => {
  const v = validatePretrainedLrSelections(
    [{ id: 1 }, { id: 2 }],
    { 1: '2025-H1', 2: '2025-H1' },
    '2026-H1'
  )
  assert.equal(v.error_code, 'DUPLICATE_PERIOD')
})

run('forecast must be after history', () => {
  const v = validatePretrainedLrSelections(
    [{ id: 1 }],
    { 1: '2026-H1' },
    '2025-H2'
  )
  assert.equal(v.error_code, 'FORECAST_PERIOD_NOT_AFTER_HISTORY')
})

run('builds correct API payload', () => {
  const built = buildPretrainedLrRequestBody(
    [{ id: 10 }, { id: 11 }],
    { 10: '2025-H1', 11: '2025-H2' },
    '2026-H1'
  )
  assert.equal(built.ok, true)
  assert.deepEqual(built.body, {
    forecast_period: '2026-H1',
    record_periods: { 10: '2025-H1', 11: '2025-H2' },
    model_run_id: '20261119_211021',
  })
})

run('invalid forecast period', () => {
  const v = validatePretrainedLrSelections([{ id: 1 }], { 1: '2025-H1' }, '')
  assert.equal(v.error_code, 'FORECAST_PERIOD_REQUIRED')
})

console.log('All pretrainedLrPeriods tests passed')
