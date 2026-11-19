const { semesterFromCreatedAt, parsePeriodLabel } = require('./agriculturalSemester');

const SLOT_STATUSES = new Set([
  'Pending',
  'Eligible',
  'Upcoming Assistance',
  'Received',
]);

function toDbRow(farmerId, row) {
  const sem = parsePeriodLabel(row.agricultural_semester || row.period_label);
  if (!sem) {
    throw Object.assign(new Error(`Invalid semester ${row.agricultural_semester}`), {
      error_code: 'INVALID_SEMESTER',
    });
  }
  return {
    farmer_id: Number(farmerId),
    agricultural_semester: sem.label,
    year: sem.year,
    half: sem.half,
    area_hectares: Number(row.area_hectares),
    planting_method: String(row.planting_method || '').trim(),
    irrigation_type: String(row.irrigation_type || '').trim(),
    land_preparation_cost: Number(row.land_preparation_cost) || 0,
    planting_cost: Number(row.planting_cost) || 0,
    spraying_cost: Number(row.spraying_cost) || 0,
    harvester_cost: Number(row.harvester_cost) || 0,
    drying_cost: Number(row.drying_cost) || 0,
    hauling_cost: Number(row.hauling_cost) || 0,
    tarasko_cost: Number(row.tarasko_cost) || 0,
    fuel_cost: Number(row.fuel_cost) || 0,
    other_expenses: Number(row.other_expenses) || 0,
    total_fertilizer_cost: Number(row.total_fertilizer_cost) || 0,
    total_pesticide_cost: Number(row.total_pesticide_cost) || 0,
    total_expenses: Number(row.total_expenses) || 0,
  };
}

function dbRowToForecastRow(row) {
  return {
    id: `excel-db-${row.id}`,
    db_id: row.id,
    status: 'Eligible',
    agricultural_semester: row.agricultural_semester,
    area_hectares: Number(row.area_hectares),
    planting_method: row.planting_method,
    irrigation_type: row.irrigation_type,
    land_preparation_cost: Number(row.land_preparation_cost) || 0,
    planting_cost: Number(row.planting_cost) || 0,
    spraying_cost: Number(row.spraying_cost) || 0,
    harvester_cost: Number(row.harvester_cost) || 0,
    drying_cost: Number(row.drying_cost) || 0,
    hauling_cost: Number(row.hauling_cost) || 0,
    tarasko_cost: Number(row.tarasko_cost) || 0,
    fuel_cost: Number(row.fuel_cost) || 0,
    other_expenses: Number(row.other_expenses) || 0,
    total_fertilizer_cost: Number(row.total_fertilizer_cost) || 0,
    total_pesticide_cost: Number(row.total_pesticide_cost) || 0,
    total_expenses: Number(row.total_expenses) || 0,
    source: 'excel',
  };
}

/**
 * Find Excel semesters that already exist as Farm Income submissions (Pending/Eligible).
 */
function findFarmIncomeSemesterConflicts(excelRows, farmIncomeRows) {
  const farmBySemester = new Map();
  for (const rec of farmIncomeRows || []) {
    if (!SLOT_STATUSES.has(String(rec.status || '').trim())) continue;
    const sem = semesterFromCreatedAt(rec.created_at);
    if (!sem) continue;
    if (!farmBySemester.has(sem.label)) {
      farmBySemester.set(sem.label, {
        record_id: rec.id,
        farmer_id: rec.farmer_id ?? null,
        farmer_name: String(rec.farmer_name || rec.full_name || '').trim() || null,
        status: rec.status,
        semester: sem.label,
        year: sem.year,
        half: sem.half,
      });
    }
  }

  const conflicts = [];
  for (const row of excelRows || []) {
    const label = String(row.agricultural_semester || '').trim();
    const hit = farmBySemester.get(label);
    if (hit) {
      conflicts.push({
        excel_semester: label,
        year: hit.year,
        half: hit.half === 1 ? 'H1' : 'H2',
        farm_income_record_id: hit.record_id,
        farmer_id: hit.farmer_id,
        farmer_name: hit.farmer_name,
        farm_income_status: hit.status,
      });
    }
  }
  return conflicts;
}

async function listPredictiveExcelRows(pool, farmerId) {
  const [rows] = await pool.execute(
    `SELECT * FROM farmer_predictive_excel_rows
     WHERE farmer_id = ?
     ORDER BY year ASC, half ASC, id ASC`,
    [Number(farmerId)]
  );
  return rows || [];
}

async function replacePredictiveExcelRows(pool, farmerId, parsedRows) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `DELETE FROM farmer_predictive_excel_rows WHERE farmer_id = ?`,
      [Number(farmerId)]
    );
    const inserted = [];
    for (const raw of parsedRows) {
      const row = toDbRow(farmerId, raw);
      const [result] = await conn.execute(
        `INSERT INTO farmer_predictive_excel_rows (
          farmer_id, agricultural_semester, year, half,
          area_hectares, planting_method, irrigation_type,
          land_preparation_cost, planting_cost, spraying_cost, harvester_cost,
          drying_cost, hauling_cost, tarasko_cost, fuel_cost, other_expenses,
          total_fertilizer_cost, total_pesticide_cost, total_expenses
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.farmer_id,
          row.agricultural_semester,
          row.year,
          row.half,
          row.area_hectares,
          row.planting_method,
          row.irrigation_type,
          row.land_preparation_cost,
          row.planting_cost,
          row.spraying_cost,
          row.harvester_cost,
          row.drying_cost,
          row.hauling_cost,
          row.tarasko_cost,
          row.fuel_cost,
          row.other_expenses,
          row.total_fertilizer_cost,
          row.total_pesticide_cost,
          row.total_expenses,
        ]
      );
      inserted.push({ id: result.insertId, ...row });
    }
    await conn.commit();
    return inserted;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

async function deletePredictiveExcelRow(pool, farmerId, rowId) {
  const [result] = await pool.execute(
    `DELETE FROM farmer_predictive_excel_rows WHERE farmer_id = ? AND id = ?`,
    [Number(farmerId), Number(rowId)]
  );
  return result.affectedRows > 0;
}

async function clearPredictiveExcelRows(pool, farmerId) {
  const [result] = await pool.execute(
    `DELETE FROM farmer_predictive_excel_rows WHERE farmer_id = ?`,
    [Number(farmerId)]
  );
  return result.affectedRows || 0;
}

module.exports = {
  SLOT_STATUSES,
  toDbRow,
  dbRowToForecastRow,
  findFarmIncomeSemesterConflicts,
  listPredictiveExcelRows,
  replacePredictiveExcelRows,
  deletePredictiveExcelRow,
  clearPredictiveExcelRows,
};
