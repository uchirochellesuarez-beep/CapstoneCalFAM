/**
 * Configurable machinery booking prerequisites (inventory.requires_machinery_id).
 */

async function resolveRequiresMachineryId(pool, { machineryId = null, requiresMachineryId, barangayId }) {
  if (requiresMachineryId === undefined) return undefined;
  if (requiresMachineryId === null || requiresMachineryId === '' || requiresMachineryId === 0) {
    return null;
  }

  const reqId = parseInt(requiresMachineryId, 10);
  if (!Number.isFinite(reqId) || reqId <= 0) {
    const err = new Error('Invalid prerequisite machinery');
    err.status = 400;
    throw err;
  }

  if (machineryId != null && Number(machineryId) === reqId) {
    const err = new Error('A machine cannot require itself as a prerequisite');
    err.status = 400;
    throw err;
  }

  const [rows] = await pool.execute(
    `SELECT id, barangay_id, requires_machinery_id, machinery_name
     FROM machinery_inventory WHERE id = ?`,
    [reqId]
  );
  if (!rows.length) {
    const err = new Error('Prerequisite machinery not found');
    err.status = 400;
    throw err;
  }

  if (barangayId != null && Number(rows[0].barangay_id) !== Number(barangayId)) {
    const err = new Error('Prerequisite must be a machine in the same barangay');
    err.status = 400;
    throw err;
  }

  // Walk chain to block cycles (A→B→A, A→B→C→A, …)
  const seen = new Set();
  if (machineryId != null) seen.add(Number(machineryId));
  let cur = reqId;
  for (let i = 0; i < 25; i++) {
    if (seen.has(Number(cur))) {
      const err = new Error('Prerequisite would create a circular dependency');
      err.status = 400;
      throw err;
    }
    seen.add(Number(cur));
    const [next] = await pool.execute(
      'SELECT requires_machinery_id FROM machinery_inventory WHERE id = ?',
      [cur]
    );
    if (!next.length || !next[0].requires_machinery_id) break;
    cur = next[0].requires_machinery_id;
  }

  return reqId;
}

/** Set of machinery_id values the farmer has Completed at least once. */
async function getCompletedMachineryIdsForFarmer(pool, farmerId) {
  const [rows] = await pool.execute(
    `SELECT DISTINCT machinery_id
     FROM machinery_bookings
     WHERE farmer_id = ? AND status = 'Completed' AND machinery_id IS NOT NULL`,
    [farmerId]
  );
  return new Set(rows.map((r) => Number(r.machinery_id)));
}

/**
 * @returns {{ ok: true } | { ok: false, message: string, requires_machinery_id: number, requires_machinery_name: string }}
 */
async function checkMachineryPrerequisite(pool, farmerId, machineryRow) {
  const requiresId = machineryRow?.requires_machinery_id;
  if (requiresId == null || requiresId === '') {
    return { ok: true };
  }

  const reqId = Number(requiresId);
  const [completed] = await pool.execute(
    `SELECT id FROM machinery_bookings
     WHERE farmer_id = ? AND machinery_id = ? AND status = 'Completed'
     LIMIT 1`,
    [farmerId, reqId]
  );

  if (completed.length) return { ok: true };

  let requiresName = machineryRow.requires_machinery_name || null;
  if (!requiresName) {
    const [names] = await pool.execute(
      'SELECT machinery_name FROM machinery_inventory WHERE id = ?',
      [reqId]
    );
    requiresName = names[0]?.machinery_name || `machinery #${reqId}`;
  }

  return {
    ok: false,
    message: `You must complete a booking for "${requiresName}" before you can book "${machineryRow.machinery_name || 'this machinery'}".`,
    requires_machinery_id: reqId,
    requires_machinery_name: requiresName
  };
}

async function annotateInventoryPrerequisites(pool, inventoryRows, farmerId) {
  if (!Array.isArray(inventoryRows) || !inventoryRows.length) return inventoryRows;
  const completedIds = farmerId
    ? await getCompletedMachineryIdsForFarmer(pool, farmerId)
    : new Set();

  return inventoryRows.map((row) => {
    const requiresId = row.requires_machinery_id != null ? Number(row.requires_machinery_id) : null;
    const satisfied = !requiresId
      ? true
      : farmerId
        ? completedIds.has(requiresId)
        : false;
    return {
      ...row,
      requires_machinery_id: requiresId,
      requires_machinery_name: row.requires_machinery_name || null,
      prerequisite_satisfied: satisfied
    };
  });
}

module.exports = {
  resolveRequiresMachineryId,
  getCompletedMachineryIdsForFarmer,
  checkMachineryPrerequisite,
  annotateInventoryPrerequisites
};
