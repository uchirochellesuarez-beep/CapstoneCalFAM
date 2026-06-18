const jwt = require('jsonwebtoken');
const pool = require('../db');

/**
 * Load the authenticated user from JWT + database (fresh barangay_id).
 */
async function getRequestUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const [users] = await pool.execute(
      `SELECT id, reference_number, full_name, role, barangay_id, status, address
       FROM farmers WHERE id = ?`,
      [decoded.id]
    );
    return users[0] || null;
  } catch {
    return null;
  }
}

function isAdmin(user) {
  return user?.role === 'admin';
}

function isOfficerRole(role) {
  return [
    'president',
    'treasurer',
    'auditor',
    'operator',
    'agriculturist',
    'operation_manager',
    'business_manager'
  ].includes(String(role || '').toLowerCase());
}

/**
 * Admin: all barangays. Officers/farmers: same barangay only.
 */
function canAccessBarangay(user, resourceBarangayId) {
  if (!user) return false;
  if (isAdmin(user)) return true;
  if (!resourceBarangayId || !user.barangay_id) return false;
  return parseInt(user.barangay_id, 10) === parseInt(resourceBarangayId, 10);
}

/**
 * Barangay used for list/report queries.
 * Admin may pass ?barangay_id= to scope; otherwise null = all barangays.
 * Non-admin without barangay_id returns null (caller should deny access).
 */
function getScopedBarangayId(user, queryBarangayId = null) {
  if (!user) return null;
  if (isAdmin(user)) {
    return queryBarangayId ? parseInt(queryBarangayId, 10) : null;
  }
  return user.barangay_id ? parseInt(user.barangay_id, 10) : null;
}

/**
 * SQL scope for list endpoints: one codebase, data isolated per barangay.
 * - Admin: all barangays, or one if ?barangay_id=
 * - Officer/farmer: own barangay only
 * - Unauthenticated / unassigned barangay: deny (AND 1=0)
 */
function buildListBarangayScope(user, queryBarangayId = null, tableAlias = '') {
  const prefix = tableAlias ? `${tableAlias}.` : '';
  if (!user) {
    return { clause: 'AND 1=0', params: [], deny: true };
  }
  if (isAdmin(user)) {
    if (queryBarangayId) {
      const id = parseInt(queryBarangayId, 10);
      return { clause: `AND ${prefix}barangay_id = ?`, params: [id], deny: false };
    }
    return { clause: '', params: [], deny: false };
  }
  if (user.barangay_id) {
    const id = parseInt(user.barangay_id, 10);
    return { clause: `AND ${prefix}barangay_id = ?`, params: [id], deny: false };
  }
  return { clause: 'AND 1=0', params: [], deny: true };
}

/**
 * Apply barangay scope to a query string (appends clause + pushes params).
 */
function applyListBarangayScope(query, params, user, queryBarangayId, tableAlias) {
  const scope = buildListBarangayScope(user, queryBarangayId, tableAlias);
  if (scope.clause) {
    return { query: `${query} ${scope.clause}`, params: [...params, ...scope.params], scope };
  }
  return { query, params, scope };
}

/**
 * Append AND alias.barangay_id = ? for non-admin users (or admin with explicit filter).
 */
function appendBarangayFilter(queryParts, params, user, tableAlias, queryBarangayId = null) {
  const scopedId = getScopedBarangayId(user, queryBarangayId);
  if (scopedId) {
    const prefix = tableAlias ? `${tableAlias}.` : '';
    queryParts.push(`AND ${prefix}barangay_id = ?`);
    params.push(scopedId);
  }
  return { scopedId };
}

async function assertFarmerAccess(user, farmerId, res) {
  const [rows] = await pool.execute('SELECT id, barangay_id FROM farmers WHERE id = ?', [farmerId]);
  if (!rows.length) {
    res.status(404).json({ success: false, message: 'Farmer not found' });
    return false;
  }
  if (isAdmin(user)) return true;
  if (parseInt(user.id, 10) === parseInt(farmerId, 10)) return true;
  if (!canAccessBarangay(user, rows[0].barangay_id)) {
    res.status(403).json({ success: false, message: 'You can only access records from your assigned barangay.' });
    return false;
  }
  return true;
}

module.exports = {
  getRequestUser,
  isAdmin,
  isOfficerRole,
  canAccessBarangay,
  getScopedBarangayId,
  buildListBarangayScope,
  applyListBarangayScope,
  appendBarangayFilter,
  assertFarmerAccess
};
