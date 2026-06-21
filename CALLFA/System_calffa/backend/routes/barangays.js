const express = require('express');
const router = express.Router();
const pool = require('../db');
const barangayConstants = require('../constants/barangays');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { getBarangayStats } = require('../utils/barangayHelpers');
const { canAccessBarangay } = require('../utils/requestUser');

function enrich(row) {
  return barangayConstants.enrichDbBarangay(row);
}

// --- Stats (must be before /:id) ---
router.get('/stats/summary', verifyToken, isAdmin, async (req, res) => {
  try {
    const [stats] = await pool.query(`
      SELECT 
        COUNT(DISTINCT b.id) as total_barangays,
        COUNT(DISTINCT CASE WHEN b.status = 'active' THEN b.id END) as active_barangays,
        COUNT(DISTINCT f.id) as total_farmers,
        COUNT(DISTINCT bo.id) as total_officers,
        COALESCE(SUM(bc.amount), 0) as total_contributions,
        COUNT(DISTINCT ba.id) as total_activities
      FROM barangays b
      LEFT JOIN farmers f ON f.address = b.name AND f.status = 'approved'
      LEFT JOIN barangay_officers bo ON bo.barangay_id = b.id AND bo.status = 'active'
      LEFT JOIN barangay_contributions bc ON bc.barangay_id = b.id AND bc.status = 'verified'
      LEFT JOIN barangay_activities ba ON ba.barangay_id = b.id
    `);

    res.json({ success: true, stats: stats[0] });
  } catch (error) {
    console.error('Error fetching federation stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// --- Admin: create barangay ---
router.post('/', verifyToken, isAdmin, async (req, res) => {
  try {
    const { name, location, status, population, contact_person, contact_number } = req.body;
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, message: 'Barangay name is required' });
    }
    const st = status === 'inactive' ? 'inactive' : 'active';
    const pop = population != null && population !== '' ? parseInt(population, 10) : 0;

    const [result] = await pool.execute(
      `INSERT INTO barangays (name, location, status, population, total_area, contact_person, contact_number)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        String(name).trim(),
        location ? String(location).trim() : null,
        st,
        Number.isFinite(pop) ? pop : 0,
        null,
        contact_person ? String(contact_person).trim() : null,
        contact_number ? String(contact_number).trim() : null
      ]
    );

    const [rows] = await pool.execute('SELECT * FROM barangays WHERE id = ?', [result.insertId]);
    res.status(201).json({ success: true, message: 'Barangay created', barangay: enrich(rows[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A barangay with this name already exists' });
    }
    console.error('Error creating barangay:', error);
    res.status(500).json({ success: false, message: 'Failed to create barangay' });
  }
});

// --- List all (public: registration, dashboards) ---
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(`
      SELECT b.*,
        (SELECT COUNT(*) FROM farmers f 
         WHERE f.barangay_id = b.id AND f.status = 'approved' AND f.role = 'farmer') AS total_farmers,
        (SELECT COUNT(*) FROM farmers f 
         WHERE f.barangay_id = b.id AND f.status = 'approved' 
         AND f.role IN ('president', 'treasurer', 'auditor', 'operator', 'operation_manager', 'business_manager')) AS total_officers,
        (SELECT COALESCE(SUM(COALESCE(f.land_area, 0)), 0) FROM farmers f
         WHERE f.barangay_id = b.id AND f.status = 'approved'
         AND f.role IN ('farmer', 'president', 'treasurer', 'auditor', 'operator', 'operation_manager', 'business_manager')) AS computed_total_area
      FROM barangays b
      ORDER BY b.name ASC
    `);

    const barangays = rows.map((r) =>
      enrich({
        ...r,
        total_area: parseFloat(r.computed_total_area || 0)
      })
    );
    res.json({ success: true, barangays });
  } catch (error) {
    console.error('Error fetching barangays:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch barangays' });
  }
});

// --- Per-barangay dashboard stats (admin or assigned officers) ---
router.get('/:id/stats', verifyToken, async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    if (Number.isNaN(barangayId)) {
      return res.status(400).json({ success: false, message: 'Invalid barangay id' });
    }

    if (!canAccessBarangay(req.user, barangayId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view statistics for your assigned barangay.'
      });
    }

    const stats = await getBarangayStats(barangayId);
    res.json({ success: true, barangay_id: barangayId, stats });
  } catch (error) {
    console.error('Error fetching barangay stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch barangay statistics' });
  }
});

// --- Places under a barangay (public read for booking dropdowns) ---
router.get('/:id/places', async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    if (Number.isNaN(barangayId)) {
      return res.status(400).json({ success: false, message: 'Invalid barangay id' });
    }

    const activeOnly = req.query.active_only !== '0' && req.query.active_only !== 'false';
    let sql = `
      SELECT id, barangay_id, name, description, is_active, created_at, updated_at
      FROM barangay_service_places WHERE barangay_id = ?`;
    const params = [barangayId];
    if (activeOnly) {
      sql += ' AND is_active = 1';
    }
    sql += ' ORDER BY name ASC';

    const [places] = await pool.execute(sql, params);
    res.json({ success: true, places });
  } catch (error) {
    console.error('Error fetching barangay places:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        success: false,
        message: 'Places table missing. Restart the backend so it can create barangay_service_places.'
      });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch places' });
  }
});

router.post('/:id/places', verifyToken, isAdmin, async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    if (Number.isNaN(barangayId)) {
      return res.status(400).json({ success: false, message: 'Invalid barangay id' });
    }

    const [[b]] = await pool.execute('SELECT id FROM barangays WHERE id = ?', [barangayId]);
    if (!b) {
      return res.status(404).json({ success: false, message: 'Barangay not found' });
    }

    const { name, description, is_active } = req.body;
    if (!name || String(name).trim() === '') {
      return res.status(400).json({ success: false, message: 'Place name is required' });
    }
    const active = is_active === false || is_active === 0 || is_active === '0' ? 0 : 1;

    const [result] = await pool.execute(
      `INSERT INTO barangay_service_places (barangay_id, name, description, is_active)
       VALUES (?, ?, ?, ?)`,
      [barangayId, String(name).trim(), description ? String(description).trim() : null, active]
    );

    const [rows] = await pool.execute(
      `SELECT id, barangay_id, name, description, is_active, created_at, updated_at
       FROM barangay_service_places WHERE id = ?`,
      [result.insertId]
    );
    res.status(201).json({ success: true, place: rows[0] });
  } catch (error) {
    console.error('Error creating place:', error);
    if (error.code === 'ER_NO_SUCH_TABLE') {
      return res.status(503).json({
        success: false,
        message: 'Places table missing. Restart the backend to create barangay_service_places.'
      });
    }
    res.status(500).json({ success: false, message: 'Failed to create place' });
  }
});

router.put('/:id/places/:placeId', verifyToken, isAdmin, async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    const placeId = parseInt(req.params.placeId, 10);
    if (Number.isNaN(barangayId) || Number.isNaN(placeId)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const [existing] = await pool.execute(
      'SELECT id FROM barangay_service_places WHERE id = ? AND barangay_id = ?',
      [placeId, barangayId]
    );
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Place not found in this barangay' });
    }

    const { name, description, is_active } = req.body;
    const fields = [];
    const values = [];
    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Place name cannot be empty' });
      }
      fields.push('name = ?');
      values.push(String(name).trim());
    }
    if (description !== undefined) {
      fields.push('description = ?');
      values.push(description ? String(description).trim() : null);
    }
    if (is_active !== undefined) {
      fields.push('is_active = ?');
      values.push(is_active === false || is_active === 0 || is_active === '0' ? 0 : 1);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(placeId, barangayId);
    await pool.execute(
      `UPDATE barangay_service_places SET ${fields.join(', ')} WHERE id = ? AND barangay_id = ?`,
      values
    );

    const [rows] = await pool.execute(
      `SELECT id, barangay_id, name, description, is_active, created_at, updated_at
       FROM barangay_service_places WHERE id = ?`,
      [placeId]
    );
    res.json({ success: true, place: rows[0] });
  } catch (error) {
    console.error('Error updating place:', error);
    res.status(500).json({ success: false, message: 'Failed to update place' });
  }
});

router.delete('/:id/places/:placeId', verifyToken, isAdmin, async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    const placeId = parseInt(req.params.placeId, 10);
    if (Number.isNaN(barangayId) || Number.isNaN(placeId)) {
      return res.status(400).json({ success: false, message: 'Invalid id' });
    }

    const [del] = await pool.execute(
      'DELETE FROM barangay_service_places WHERE id = ? AND barangay_id = ?',
      [placeId, barangayId]
    );

    if (del.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Place not found' });
    }
    res.json({ success: true, message: 'Place deleted' });
  } catch (error) {
    console.error('Error deleting place:', error);
    res.status(500).json({ success: false, message: 'Failed to delete place' });
  }
});

// --- Single barangay ---
router.get('/:id', async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    if (Number.isNaN(barangayId)) {
      return res.status(400).json({ success: false, message: 'Invalid barangay id' });
    }

    const [brows] = await pool.execute('SELECT * FROM barangays WHERE id = ?', [barangayId]);
    if (brows.length === 0) {
      return res.status(404).json({ success: false, message: 'Barangay not found' });
    }

    const [farmers] = await pool.query(
      `SELECT id, reference_number, full_name, phone_number, date_of_birth, role, status, land_area, registered_on
       FROM farmers 
       WHERE barangay_id = ? AND status = 'approved' AND role = 'farmer'
       ORDER BY full_name ASC`,
      [barangayId]
    );

    const [officers] = await pool.query(
      `SELECT id, reference_number, full_name, phone_number, date_of_birth, role, status, land_area, registered_on
       FROM farmers 
       WHERE barangay_id = ? AND status = 'approved' AND role IN ('president', 'treasurer', 'auditor', 'operator', 'operation_manager', 'business_manager')
       ORDER BY 
         CASE role
           WHEN 'president' THEN 1
           WHEN 'treasurer' THEN 2
           WHEN 'auditor' THEN 3
           WHEN 'operator' THEN 4
           ELSE 5
         END,
         full_name ASC`,
      [barangayId]
    );

    const totalLandAreaHectares = [...farmers, ...officers].reduce(
      (sum, row) => sum + parseFloat(row.land_area || 0),
      0
    );

    res.json({
      success: true,
      barangay: enrich(brows[0]),
      farmers,
      officers,
      total_land_area_hectares: Math.round(totalLandAreaHectares * 100) / 100
    });
  } catch (error) {
    console.error('Error fetching barangay details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch barangay details' });
  }
});

router.put('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    if (Number.isNaN(barangayId)) {
      return res.status(400).json({ success: false, message: 'Invalid barangay id' });
    }

    const [[existing]] = await pool.execute('SELECT id FROM barangays WHERE id = ?', [barangayId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Barangay not found' });
    }

    const { name, location, status, population, contact_person, contact_number } = req.body;
    const fields = [];
    const values = [];

    if (name !== undefined) {
      if (!String(name).trim()) {
        return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      }
      fields.push('name = ?');
      values.push(String(name).trim());
    }
    if (location !== undefined) {
      fields.push('location = ?');
      values.push(location ? String(location).trim() : null);
    }
    if (status !== undefined) {
      const st = status === 'inactive' ? 'inactive' : 'active';
      fields.push('status = ?');
      values.push(st);
    }
    if (population !== undefined) {
      const pop = parseInt(population, 10);
      fields.push('population = ?');
      values.push(Number.isFinite(pop) ? pop : 0);
    }
    if (contact_person !== undefined) {
      fields.push('contact_person = ?');
      values.push(contact_person ? String(contact_person).trim() : null);
    }
    if (contact_number !== undefined) {
      fields.push('contact_number = ?');
      values.push(contact_number ? String(contact_number).trim() : null);
    }

    if (fields.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(barangayId);
    await pool.execute(`UPDATE barangays SET ${fields.join(', ')} WHERE id = ?`, values);

    const [rows] = await pool.execute('SELECT * FROM barangays WHERE id = ?', [barangayId]);
    res.json({ success: true, message: 'Barangay updated', barangay: enrich(rows[0]) });
  } catch (error) {
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ success: false, message: 'A barangay with this name already exists' });
    }
    console.error('Error updating barangay:', error);
    res.status(500).json({ success: false, message: 'Failed to update barangay' });
  }
});

router.delete('/:id', verifyToken, isAdmin, async (req, res) => {
  try {
    const barangayId = parseInt(req.params.id, 10);
    if (Number.isNaN(barangayId)) {
      return res.status(400).json({ success: false, message: 'Invalid barangay id' });
    }

    const [[existing]] = await pool.execute('SELECT id, name FROM barangays WHERE id = ?', [barangayId]);
    if (!existing) {
      return res.status(404).json({ success: false, message: 'Barangay not found' });
    }

    await pool.execute('DELETE FROM barangays WHERE id = ?', [barangayId]);
    res.json({ success: true, message: `Barangay "${existing.name}" deleted` });
  } catch (error) {
    if (
      error.errno === 1451 ||
      error.code === 'ER_ROW_IS_REFERENCED_2' ||
      error.code === 'ER_ROW_IS_REFERENCED'
    ) {
      return res.status(409).json({
        success: false,
        message:
          'Cannot delete this barangay while farmers or other records still reference it. Reassign them first.'
      });
    }
    console.error('Error deleting barangay:', error);
    res.status(500).json({ success: false, message: 'Failed to delete barangay' });
  }
});

module.exports = router;
