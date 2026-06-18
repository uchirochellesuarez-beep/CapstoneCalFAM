const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { buildListBarangayScope, canAccessBarangay } = require('../utils/requestUser');

async function getContributionWithFarmerBarangay(contributionId) {
  const [rows] = await pool.execute(
    `SELECT c.id, c.farmer_id, f.barangay_id
     FROM contributions c
     JOIN farmers f ON c.farmer_id = f.id
     WHERE c.id = ?`,
    [contributionId]
  );
  return rows[0] || null;
}

// GET /api/contributions - Get all contributions with barangay filtering
router.get('/', verifyToken, async (req, res) => {
  try {
    const { farmer_id, contribution_type, status, start_date, end_date, limit = 100, barangay_id } = req.query;
    const scope = buildListBarangayScope(req.user, barangay_id, 'f');

    let query = `
      SELECT 
        c.*,
        f.full_name,
        f.reference_number,
        f.barangay_id,
        r.full_name as recorded_by_name
      FROM contributions c
      JOIN farmers f ON c.farmer_id = f.id
      LEFT JOIN farmers r ON c.recorded_by = r.id
      WHERE 1=1
    `;
    const params = [];

    query += ` ${scope.clause}`;
    params.push(...scope.params);

    if (farmer_id) {
      query += ' AND c.farmer_id = ?';
      params.push(farmer_id);
    }

    if (contribution_type) {
      query += ' AND c.contribution_type = ?';
      params.push(contribution_type);
    }

    if (status) {
      query += ' AND c.status = ?';
      params.push(status);
    }

    if (start_date) {
      query += ' AND c.contribution_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND c.contribution_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY c.contribution_date DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [contributions] = await pool.execute(query, params);
    res.json({ success: true, contributions });
  } catch (error) {
    console.error('Error fetching contributions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contributions' });
  }
});

// GET /api/contributions/farmer/:farmerId
router.get('/farmer/:farmerId', verifyToken, async (req, res) => {
  try {
    const { farmerId } = req.params;

    const [farmers] = await pool.execute('SELECT barangay_id FROM farmers WHERE id = ?', [farmerId]);
    if (!farmers.length) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    if (!canAccessBarangay(req.user, farmers[0].barangay_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot view contributions for other barangays.'
      });
    }

    if (req.user.role === 'farmer' && parseInt(req.user.id, 10) !== parseInt(farmerId, 10)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const [contributions] = await pool.execute(
      `SELECT * FROM contributions WHERE farmer_id = ? ORDER BY contribution_date DESC`,
      [farmerId]
    );

    res.json({ success: true, contributions });
  } catch (error) {
    console.error('Error fetching farmer contributions:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch contributions' });
  }
});

// POST /api/contributions
router.post('/', verifyToken, async (req, res) => {
  try {
    const {
      farmer_id,
      contribution_date,
      amount,
      contribution_type,
      payment_method,
      reference_number,
      remarks,
      recorded_by,
      status
    } = req.body;

    const actorId = recorded_by || req.user.id;
    if (parseInt(actorId, 10) !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only record contributions as yourself.' });
    }

    const [farmers] = await pool.execute('SELECT barangay_id, full_name FROM farmers WHERE id = ?', [farmer_id]);
    if (!farmers.length) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }

    if (!canAccessBarangay(req.user, farmers[0].barangay_id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied. Cannot record contributions for other barangays.'
      });
    }

    if (!farmer_id || !contribution_date || !amount) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: farmer_id, contribution_date, amount'
      });
    }

    const [result] = await pool.execute(
      `INSERT INTO contributions 
       (farmer_id, contribution_date, amount, contribution_type, payment_method, 
        reference_number, remarks, recorded_by, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmer_id,
        contribution_date,
        amount,
        contribution_type || 'regular',
        payment_method || 'cash',
        reference_number,
        remarks,
        actorId,
        status || 'confirmed'
      ]
    );

    try {
      await pool.execute(
        `INSERT INTO activity_logs (farmer_id, barangay_id, activity_type, activity_description, metadata)
         VALUES (?, ?, 'contribution', ?, ?)`,
        [
          farmer_id,
          farmers[0].barangay_id,
          `${farmers[0].full_name} made a contribution of ₱${amount}`,
          JSON.stringify({ contribution_id: result.insertId, amount, type: contribution_type })
        ]
      );
    } catch (logErr) {
      console.error('Error logging contribution activity:', logErr);
    }

    res.json({ success: true, id: result.insertId, message: 'Contribution recorded successfully' });
  } catch (error) {
    console.error('Error creating contribution:', error);
    res.status(500).json({ success: false, message: 'Failed to create contribution' });
  }
});

// PUT /api/contributions/:id
router.put('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getContributionWithFarmerBarangay(id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }
    if (!canAccessBarangay(req.user, row.barangay_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    const { amount, contribution_type, payment_method, reference_number, remarks, status } = req.body;
    const updates = [];
    const values = [];

    if (amount !== undefined) {
      updates.push('amount = ?');
      values.push(amount);
    }
    if (contribution_type) {
      updates.push('contribution_type = ?');
      values.push(contribution_type);
    }
    if (payment_method) {
      updates.push('payment_method = ?');
      values.push(payment_method);
    }
    if (reference_number !== undefined) {
      updates.push('reference_number = ?');
      values.push(reference_number);
    }
    if (remarks !== undefined) {
      updates.push('remarks = ?');
      values.push(remarks);
    }
    if (status) {
      updates.push('status = ?');
      values.push(status);
    }

    if (updates.length === 0) {
      return res.status(400).json({ success: false, message: 'No fields to update' });
    }

    values.push(id);
    await pool.execute(`UPDATE contributions SET ${updates.join(', ')} WHERE id = ?`, values);

    res.json({ success: true, message: 'Contribution updated successfully' });
  } catch (error) {
    console.error('Error updating contribution:', error);
    res.status(500).json({ success: false, message: 'Failed to update contribution' });
  }
});

// GET /api/contributions/stats
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { farmer_id, start_date, end_date, barangay_id } = req.query;
    const scope = buildListBarangayScope(req.user, barangay_id, 'f');

    let query = `
      SELECT 
        COUNT(*) as total_contributions,
        SUM(c.amount) as total_amount,
        AVG(c.amount) as average_amount,
        c.contribution_type,
        COUNT(*) as count_by_type
      FROM contributions c
      JOIN farmers f ON c.farmer_id = f.id
      WHERE c.status = 'confirmed'
    `;
    const params = [];

    query += ` ${scope.clause}`;
    params.push(...scope.params);

    if (farmer_id) {
      query += ' AND c.farmer_id = ?';
      params.push(farmer_id);
    }

    if (start_date) {
      query += ' AND c.contribution_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND c.contribution_date <= ?';
      params.push(end_date);
    }

    query += ' GROUP BY c.contribution_type';

    const [stats] = await pool.execute(query, params);

    let totalQuery = `
      SELECT 
        COUNT(*) as total_count,
        SUM(c.amount) as total_sum,
        AVG(c.amount) as average
      FROM contributions c
      JOIN farmers f ON c.farmer_id = f.id
      WHERE c.status = 'confirmed'
    `;
    const totalParams = [];

    totalQuery += ` ${scope.clause}`;
    totalParams.push(...scope.params);

    if (farmer_id) {
      totalQuery += ' AND c.farmer_id = ?';
      totalParams.push(farmer_id);
    }

    if (start_date) {
      totalQuery += ' AND c.contribution_date >= ?';
      totalParams.push(start_date);
    }

    if (end_date) {
      totalQuery += ' AND c.contribution_date <= ?';
      totalParams.push(end_date);
    }

    const [totals] = await pool.execute(totalQuery, totalParams);

    res.json({ success: true, stats, totals: totals[0] });
  } catch (error) {
    console.error('Error fetching contribution stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

// DELETE /api/contributions/:id
router.delete('/:id', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const row = await getContributionWithFarmerBarangay(id);
    if (!row) {
      return res.status(404).json({ success: false, message: 'Contribution not found' });
    }
    if (!canAccessBarangay(req.user, row.barangay_id)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }

    await pool.execute('UPDATE contributions SET status = ? WHERE id = ?', ['cancelled', id]);

    res.json({ success: true, message: 'Contribution cancelled successfully' });
  } catch (error) {
    console.error('Error deleting contribution:', error);
    res.status(500).json({ success: false, message: 'Failed to delete contribution' });
  }
});

module.exports = router;
