const MACHINERY_AVAILABLE = 'Available';
const MACHINERY_UNAVAILABLE = 'Unavailable';
const ALLOWED_MACHINERY_STATUSES = [MACHINERY_AVAILABLE, MACHINERY_UNAVAILABLE];

const ACTIVE_USAGE_STATUSES = [
  'Approved',
  'Assigned to Operator',
  'Booking Confirmed',
  'In Use'
];

function normalizeStoredMachineryStatus(status) {
  return status === MACHINERY_AVAILABLE ? MACHINERY_AVAILABLE : MACHINERY_UNAVAILABLE;
}

function isAllowedMachineryStatus(status) {
  return ALLOWED_MACHINERY_STATUSES.includes(status);
}

async function getMachineryIdsInUse(pool, machineryIds = null) {
  const statusPlaceholders = ACTIVE_USAGE_STATUSES.map(() => '?').join(',');
  let sql = `SELECT DISTINCT machinery_id
             FROM machinery_bookings
             WHERE machinery_id IS NOT NULL
               AND status IN (${statusPlaceholders})`;
  const params = [...ACTIVE_USAGE_STATUSES];

  if (Array.isArray(machineryIds) && machineryIds.length) {
    sql += ` AND machinery_id IN (${machineryIds.map(() => '?').join(',')})`;
    params.push(...machineryIds.map((id) => Number(id)));
  }

  const [rows] = await pool.execute(sql, params);
  return new Set(rows.map((row) => Number(row.machinery_id)));
}

function applyDisplayStatus(row, inUseIds) {
  const stored = normalizeStoredMachineryStatus(row.status);
  const inUse = inUseIds.has(Number(row.id));
  return {
    ...row,
    status: stored,
    stored_status: stored,
    is_in_use: inUse,
    availability_status:
      stored === MACHINERY_AVAILABLE && !inUse
        ? MACHINERY_AVAILABLE
        : MACHINERY_UNAVAILABLE
  };
}

async function withDisplayStatus(pool, rows = []) {
  if (!rows.length) return rows;
  const inUseIds = await getMachineryIdsInUse(
    pool,
    rows.map((row) => row.id)
  );
  return rows.map((row) => applyDisplayStatus(row, inUseIds));
}

module.exports = {
  MACHINERY_AVAILABLE,
  MACHINERY_UNAVAILABLE,
  ALLOWED_MACHINERY_STATUSES,
  ACTIVE_USAGE_STATUSES,
  normalizeStoredMachineryStatus,
  isAllowedMachineryStatus,
  getMachineryIdsInUse,
  applyDisplayStatus,
  withDisplayStatus
};
