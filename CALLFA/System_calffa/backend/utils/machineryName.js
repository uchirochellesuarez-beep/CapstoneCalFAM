function canonicalMachineryName(name) {
  return String(name || '').replace(/\s+/g, ' ').trim();
}

function machineryNameKey(name) {
  return canonicalMachineryName(name).toLowerCase();
}

async function assertUniqueMachineryName(pool, barangayId, name, excludeId = null) {
  const clean = canonicalMachineryName(name);
  if (!clean) {
    const error = new Error('Machinery name is required.');
    error.status = 400;
    throw error;
  }

  const [rows] = await pool.execute(
    'SELECT id, machinery_name FROM machinery_inventory WHERE barangay_id <=> ?',
    [barangayId]
  );
  const key = clean.toLowerCase();
  const exclude = excludeId == null || excludeId === '' ? null : Number(excludeId);
  const clash = rows.find((row) => {
    if (exclude != null && Number(row.id) === exclude) return false;
    return machineryNameKey(row.machinery_name) === key;
  });
  if (clash) {
    const error = new Error(
      'This machinery name is already used in this barangay. Each machine needs its own name so the system can tell them apart.'
    );
    error.status = 400;
    throw error;
  }
  return clean;
}

module.exports = {
  canonicalMachineryName,
  machineryNameKey,
  assertUniqueMachineryName
};
