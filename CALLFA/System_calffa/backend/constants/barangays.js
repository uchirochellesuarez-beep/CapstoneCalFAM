/**
 * Hardcoded Barangay Constants
 * CALLFA federation barangays — same modules per role; data is scoped by barangay_id.
 */

const BARANGAYS = {
  CAMANSIHAN: {
    id: 1,
    name: "Camansihan",
    location: "Calapan City, Mindoro Oriental",
    status: "active",
    population: 2500,
    total_area: 125.5,
    contact_person: "Barangay Hall",
    contact_phone: "+63-43-867-1000",
    is_active_for_transactions: true,
    description: "Primary operational barangay with active transactions"
  },
  MANAGPI: {
    id: 2,
    name: "Managpi",
    location: "Calapan City, Mindoro Oriental",
    status: "active",
    population: 1800,
    total_area: 98.3,
    contact_person: "Barangay Hall",
    contact_phone: "+63-43-867-2000",
    is_active_for_transactions: true,
    description: "Federation barangay with full cooperative modules"
  }
};

const BARANGAY_LIST = [BARANGAYS.CAMANSIHAN, BARANGAYS.MANAGPI];

const BARANGAY_NAMES = {
  CAMANSIHAN: "Camansihan",
  MANAGPI: "Managpi"
};

/**
 * Get all available barangays
 * @returns {Array} List of all barangays
 */
function getAllBarangays() {
  return BARANGAY_LIST;
}

/**
 * Get barangay by ID
 * @param {number} id - Barangay ID
 * @returns {Object|null} Barangay object or null if not found
 */
function getBarangayById(id) {
  return BARANGAY_LIST.find(b => b.id === id) || null;
}

/**
 * Get barangay by name
 * @param {string} name - Barangay name
 * @returns {Object|null} Barangay object or null if not found
 */
function getBarangayByName(name) {
  return BARANGAY_LIST.find(b => b.name === name) || null;
}

/**
 * Check if barangay has active transactions
 * @param {number|string} barangayId - Barangay ID or name
 * @returns {boolean} True if barangay allows transactions
 */
function isBarangayActiveForTransactions(barangayId) {
  let barangay;
  if (typeof barangayId === "string") {
    barangay = getBarangayByName(barangayId);
  } else {
    barangay = getBarangayById(barangayId);
  }
  return barangay ? barangay.is_active_for_transactions : false;
}

/**
 * Get barangay status message
 * @param {number|string} barangayId - Barangay ID or name
 * @returns {string} Status message for the barangay
 */
function getBarangayStatusMessage(barangayId) {
  const barangay = typeof barangayId === "string" 
    ? getBarangayByName(barangayId) 
    : getBarangayById(barangayId);
  
  if (!barangay) return "Barangay not found";
  return `Welcome to ${barangay.name}. Cooperative modules are available for your barangay.`;
}

/**
 * Merge hardcoded display flags onto a database barangay row (when id matches).
 * @param {Object} row - Barangay row from DB
 * @returns {Object}
 */
function enrichDbBarangay(row) {
  if (!row || row.id == null) return row;
  const extra = getBarangayById(Number(row.id));
  if (!extra) return { ...row };
  return {
    ...row,
    is_active_for_transactions: extra.is_active_for_transactions,
    description: extra.description
  };
}

module.exports = {
  BARANGAYS,
  BARANGAY_LIST,
  BARANGAY_NAMES,
  getAllBarangays,
  getBarangayById,
  getBarangayByName,
  isBarangayActiveForTransactions,
  getBarangayStatusMessage,
  enrichDbBarangay
};
