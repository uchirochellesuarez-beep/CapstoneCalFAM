/**
 * Generates 12 chronological expense snapshots per farmer (24 JSON files total)
 * for ML-style panels — prediction uses total_expenses over time step only (no crop season UX).
 *
 * Run: node scripts/generate-expense-season-samples.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../data/expense_training_samples');

const FARMS = {
  69: {
    name: 'Magdalena Bonquin Absalon',
    member_id: '04-20-26-361-000001',
    area: 1.15,
    costBias: -1400,
  },
  70: {
    name: 'Faustino Verguerra Aclan',
    member_id: '04-20-26-361-000002',
    area: 1.42,
    costBias: 900,
  },
};

function clampNonNeg(n) {
  return Math.max(0, n);
}

function round50(n) {
  return Math.round(n / 50) * 50;
}

/** Period 1–12 spans ~6 years × 2 records/year; oscillation replaces explicit wet/dry in output. */
function buildRecord(farmerId, periodIndex) {
  const meta = FARMS[farmerId];
  const yearApprox = 2021 + Math.floor((periodIndex - 1) / 2);
  const inflate = Math.pow(1.048, yearApprox - 2021);
  const alternating = periodIndex % 2 === 1 ? 1.06 : 0.995;
  const baseSeasonPerHa = farmerId === 69 ? 40_600 : 42_200;
  const wobble =
    Math.sin(periodIndex * 1.03 + farmerId * 0.07) * 2_350 +
    Math.cos(periodIndex * 0.61) * 980;

  let total = round50(
    baseSeasonPerHa * meta.area * inflate * alternating + meta.costBias + wobble
  );
  total = clampNonNeg(total);
  total = Math.max(36_500, Math.min(total, 92_000));

  let fert = round50(total * 0.218 * alternating);
  let pest = round50(total * (periodIndex % 2 === 1 ? 0.125 : 0.112));
  let land_preparation_cost = round50(total * 0.132);
  let planting_cost = round50(total * 0.086);
  let spraying_cost = round50(total * 0.064);
  let harvester_cost = round50(total * 0.101);
  let drying_cost = round50(total * 0.088);
  let hauling_cost = round50(total * 0.046);
  let tarasko_cost = round50(total * 0.029);
  let fuel_cost = round50(total * 0.058);

  const laborSub =
    land_preparation_cost +
    planting_cost +
    spraying_cost +
    harvester_cost +
    drying_cost +
    hauling_cost +
    tarasko_cost +
    fuel_cost;

  let other_expenses = total - fert - pest - laborSub;
  other_expenses = round50(other_expenses);
  const drift = total - fert - pest - laborSub - other_expenses;
  other_expenses = clampNonNeg(other_expenses + drift);

  const total_labor_cost = laborSub;
  const total_expenses =
    fert + pest + total_labor_cost + other_expenses;

  const sacksHarvested =
    farmerId === 69
      ? 36 + Math.floor((periodIndex - 1) / 2) * 2
      : 42 + Math.floor((periodIndex - 1) / 2) * 2;
  const gross_income = round50(total_expenses * (alternating > 1 ? 1.18 : 1.12));

  return {
    schema_version: 2,
    period_index: periodIndex,
    farmer_id: farmerId,
    farmer_member_id: meta.member_id,
    farmer_full_name: meta.name,
    approximate_year_hint: yearApprox,

    area_hectares: meta.area,
    planting_method: 'talok',
    irrigation_type: 'NIA',

    land_preparation_cost,
    planting_cost,
    spraying_cost,
    harvester_cost,
    drying_cost,
    hauling_cost,
    tarasko_cost,
    fuel_cost,
    other_expenses,

    total_fertilizer_cost: fert,
    total_pesticide_cost: pest,
    total_labor_cost,
    total_expenses,

    sacks_harvested: sacksHarvested,
    kg_per_sack: 50,
    price_per_kg: round50((gross_income / Math.max(sacksHarvested * 50, 1)) * 100) / 100,
    gross_income,
    net_income: gross_income - total_expenses,

    fertilizers_demo: [
      {
        fertilizer_type: '14-14-14',
        sacks: periodIndex % 2 === 1 ? 6 : 5,
        price_per_sack: 1850,
      },
      {
        fertilizer_type: '46-0-0',
        sacks: periodIndex % 2 === 1 ? 4 : 3,
        price_per_sack: 1620,
      },
    ],
    pesticides_demo: [
      {
        pesticide_type:
          periodIndex % 2 === 1 ? 'Lambda-cyhalothrin-based' : 'Carbaryl-based',
        quantity: periodIndex % 2 === 1 ? 9 : 6,
        price_per_unit: 720,
      },
    ],
    notes_ph:
      'Synthetic expense timeline for demos; modelo sa app ay tinataas lang ang kabuuang gastos sa hakbang ng panahon (walang crop season field).',
  };
}

function main() {
  for (const farmerIdStr of ['69', '70']) {
    const farmerId = Number(farmerIdStr);
    const dir = path.join(ROOT, farmerIdStr);
    fs.mkdirSync(dir, { recursive: true });

    for (let p = 1; p <= 12; p += 1) {
      const payload = buildRecord(farmerId, p);
      const fname = `period-${String(p).padStart(2, '0')}.json`;
      fs.writeFileSync(path.join(dir, fname), JSON.stringify(payload, null, 2), 'utf8');
    }
  }

  console.log('Wrote 24 expense panel JSON files under:', ROOT);
}

main();
