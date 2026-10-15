const { canonicalMachineryName, machineryNameKey } = require('../utils/machineryName');

const INDEX_NAME = 'uq_machinery_name_per_barangay';

function isSafeIdentifier(value) {
  return /^[A-Za-z0-9_]+$/.test(String(value || ''));
}

async function bookingCounts(pool) {
  const counts = new Map();
  try {
    const [rows] = await pool.query(
      'SELECT machinery_id, COUNT(*) AS n FROM machinery_bookings GROUP BY machinery_id'
    );
    for (const row of rows) counts.set(Number(row.machinery_id), Number(row.n) || 0);
  } catch (error) {
    if (error.code !== 'ER_NO_SUCH_TABLE' && error.errno !== 1146) throw error;
  }
  return counts;
}

function pickKeeper(group, counts) {
  return group.slice().sort((left, right) => {
    const byBookings = (counts.get(right.id) || 0) - (counts.get(left.id) || 0);
    if (byBookings !== 0) return byBookings;
    return left.id - right.id;
  })[0];
}

async function referenceColumns(pool) {
  const [rows] = await pool.query(
    `SELECT c.TABLE_NAME, c.COLUMN_NAME
     FROM information_schema.COLUMNS c
     JOIN information_schema.TABLES t
       ON t.TABLE_SCHEMA = c.TABLE_SCHEMA AND t.TABLE_NAME = c.TABLE_NAME
     WHERE c.TABLE_SCHEMA = DATABASE()
       AND c.COLUMN_NAME IN ('machinery_id', 'requires_machinery_id')
       AND t.TABLE_TYPE = 'BASE TABLE'`
  );
  return rows.filter((row) => isSafeIdentifier(row.TABLE_NAME) && isSafeIdentifier(row.COLUMN_NAME));
}

async function pointReferencesAtKeeper(pool, columns, keeperId, duplicateId) {
  for (const column of columns) {
    if (column.TABLE_NAME === 'machinery_inventory' && column.COLUMN_NAME !== 'requires_machinery_id') continue;
    await pool.query(
      `UPDATE \`${column.TABLE_NAME}\` SET \`${column.COLUMN_NAME}\` = ? WHERE \`${column.COLUMN_NAME}\` = ?`,
      [keeperId, duplicateId]
    );
  }
  await pool.execute(
    'UPDATE machinery_inventory SET requires_machinery_id = NULL WHERE id = ? AND requires_machinery_id = ?',
    [keeperId, keeperId]
  );
}

async function ensureUniqueMachineryNameSchema(pool) {
  const [rows] = await pool.query('SELECT id, barangay_id, machinery_name FROM machinery_inventory');
  const counts = await bookingCounts(pool);
  const groups = new Map();

  for (const row of rows) {
    const clean = canonicalMachineryName(row.machinery_name);
    const key = `${row.barangay_id ?? 'null'}|${machineryNameKey(clean)}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push({
      id: Number(row.id),
      barangayId: row.barangay_id,
      machinery_name: row.machinery_name,
      clean
    });
  }

  const columns = await referenceColumns(pool);
  for (const group of groups.values()) {
    const keeper = pickKeeper(group, counts);
    if (keeper.machinery_name !== keeper.clean) {
      await pool.execute(
        'UPDATE machinery_inventory SET machinery_name = ? WHERE id = ?',
        [keeper.clean, keeper.id]
      );
    }
    for (const extra of group) {
      if (extra.id === keeper.id) continue;
      await pointReferencesAtKeeper(pool, columns, keeper.id, extra.id);
      await pool.execute('DELETE FROM machinery_inventory WHERE id = ?', [extra.id]);
      console.log(
        `✅ Removed duplicate machinery #${extra.id} (${extra.machinery_name}); kept #${keeper.id} (${keeper.clean})`
      );
    }
  }

  const [remaining] = await pool.query('SELECT id, machinery_name FROM machinery_inventory');
  for (const row of remaining) {
    const clean = canonicalMachineryName(row.machinery_name);
    if (clean && clean !== row.machinery_name) {
      await pool.execute('UPDATE machinery_inventory SET machinery_name = ? WHERE id = ?', [clean, row.id]);
    }
  }

  const [existing] = await pool.query(
    `SELECT INDEX_NAME
     FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE()
       AND TABLE_NAME = 'machinery_inventory'
       AND INDEX_NAME = ?
     LIMIT 1`,
    [INDEX_NAME]
  );
  if (!existing.length) {
    await pool.query(
      `ALTER TABLE machinery_inventory
       ADD UNIQUE INDEX ${INDEX_NAME} (barangay_id, machinery_name)`
    );
    console.log('✅ Machinery names are unique within each barangay');
  }
}

module.exports = { ensureUniqueMachineryNameSchema };
