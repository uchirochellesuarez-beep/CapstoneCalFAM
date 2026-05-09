/**
 * Idempotent insert: bundled JSON under data/expense_training_samples/<numeric_id>/
 * into farmer_income_records. Used by startup bootstrap and optional CLI script.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../data/expense_training_samples');

function listSampleFarmerDirs() {
  if (!fs.existsSync(ROOT)) return [];
  return fs
    .readdirSync(ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory() && /^\d+$/.test(d.name))
    .map((d) => d.name)
    .sort((a, b) => Number(a) - Number(b));
}

async function rowExists(conn, farmerId, totalExpenses, netIncome) {
  const [r] = await conn.execute(
    `SELECT id FROM farmer_income_records 
     WHERE farmer_id = ? AND total_expenses = ? AND net_income = ?
     LIMIT 1`,
    [farmerId, totalExpenses, netIncome]
  );
  return r.length > 0;
}

async function farmerRowExists(conn, farmerId) {
  const [r] = await conn.execute(
    `SELECT id FROM farmers WHERE id = ? LIMIT 1`,
    [farmerId]
  );
  return r.length > 0;
}

async function insertOne(conn, payload) {
  const {
    farmer_id,
    area_hectares,
    planting_method,
    irrigation_type,
    land_preparation_cost,
    planting_cost,
    spraying_cost,
    harvester_cost,
    drying_cost,
    hauling_cost,
    tarasko_cost,
    fuel_cost,
    other_expenses,
    sacks_harvested,
    kg_per_sack,
    price_per_kg,
    total_fertilizer_cost,
    total_pesticide_cost,
    total_labor_cost,
    gross_income,
    total_expenses,
    net_income,
    fertilizers_demo,
    pesticides_demo,
  } = payload;

  const [result] = await conn.execute(
    `INSERT INTO farmer_income_records (
      farmer_id, area_hectares, planting_method, irrigation_type,
      land_preparation_cost, planting_cost, spraying_cost, harvester_cost,
      drying_cost, hauling_cost, tarasko_cost, fuel_cost, other_expenses,
      sacks_harvested, kg_per_sack, price_per_kg,
      total_fertilizer_cost, total_pesticide_cost, total_labor_cost,
      gross_income, total_expenses, net_income, status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'Eligible')`,
    [
      farmer_id,
      area_hectares,
      planting_method,
      irrigation_type,
      land_preparation_cost,
      planting_cost,
      spraying_cost,
      harvester_cost,
      drying_cost,
      hauling_cost,
      tarasko_cost,
      fuel_cost,
      other_expenses,
      sacks_harvested,
      kg_per_sack,
      price_per_kg,
      total_fertilizer_cost,
      total_pesticide_cost,
      total_labor_cost,
      gross_income,
      total_expenses,
      net_income,
    ]
  );

  const recordId = result.insertId;

  for (const f of fertilizers_demo || []) {
    const line = (f.sacks || 0) * (f.price_per_sack || 0);
    await conn.execute(
      `INSERT INTO farmer_income_fertilizers (record_id, fertilizer_type, sacks, price_per_sack, line_total)
       VALUES (?, ?, ?, ?, ?)`,
      [recordId, f.fertilizer_type, f.sacks || 0, f.price_per_sack || 0, line]
    );
  }

  for (const p of pesticides_demo || []) {
    const line = (p.quantity || 0) * (p.price_per_unit || 0);
    await conn.execute(
      `INSERT INTO farmer_income_pesticides (record_id, pesticide_type, quantity, price_per_unit, line_total)
       VALUES (?, ?, ?, ?, ?)`,
      [recordId, p.pesticide_type, p.quantity || 0, p.price_per_unit || 0, line]
    );
  }

  return recordId;
}

/**
 * @param {import('mysql2/promise').Pool} pool
 * @returns {Promise<{ inserted: number, skipped: number, dirs: string[], skipped_no_farmer: number }>}
 */
async function runExpenseTrainingSampleSeed(pool) {
  const dirs = listSampleFarmerDirs();
  if (dirs.length === 0) {
    return { inserted: 0, skipped: 0, dirs: [], skipped_no_farmer: 0 };
  }

  const conn = await pool.getConnection();
  let inserted = 0;
  let skipped = 0;
  let skipped_no_farmer = 0;
  try {
    await conn.beginTransaction();

    for (const fid of dirs) {
      const sampleDir = path.join(ROOT, fid);
      const files = fs
        .readdirSync(sampleDir)
        .filter((f) => f.endsWith('.json'))
        .sort();
      for (const file of files) {
        const payload = JSON.parse(
          fs.readFileSync(path.join(sampleDir, file), 'utf8')
        );
        const farmerId = payload.farmer_id;
        if (!(await farmerRowExists(conn, farmerId))) {
          skipped_no_farmer += 1;
          continue;
        }
        const exists = await rowExists(
          conn,
          farmerId,
          payload.total_expenses,
          payload.net_income
        );
        if (exists) {
          skipped += 1;
        } else {
          await insertOne(conn, payload);
          inserted += 1;
        }
      }
    }

    await conn.commit();
    return { inserted, skipped, dirs, skipped_no_farmer };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

module.exports = {
  runExpenseTrainingSampleSeed,
  listSampleFarmerDirs,
  ROOT,
};
