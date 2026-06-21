const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const {
  getOperatorIncomeSummary,
  generateOperatorIncomeForBooking
} = require('../services/operator-income-service');

async function resolveUser(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;

  const jwt = require('jsonwebtoken');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    const [users] = await pool.execute(
      'SELECT id, role, barangay_id, full_name FROM farmers WHERE id = ?',
      [decoded.id]
    );
    return users[0] || null;
  } catch {
    return null;
  }
}

function verifyOperatorAccess(req, res, next) {
  verifyToken(req, res, async () => {
    const user = await resolveUser(req);
    if (!user || user.role !== 'operator') {
      return res.status(403).json({ success: false, message: 'Operator access only' });
    }
    req.operatorUser = user;
    next();
  });
}

// GET /api/operator-income/dashboard
router.get('/dashboard', verifyOperatorAccess, async (req, res) => {
  try {
    const operatorId = req.operatorUser.id;
    const today = new Date().toISOString().split('T')[0];

    const [assignedMachinery] = await pool.execute(
      `SELECT mi.*, b.name AS barangay_name
       FROM machinery_inventory mi
       LEFT JOIN barangays b ON mi.barangay_id = b.id
       WHERE mi.assigned_operator_id = ?
       ORDER BY mi.machinery_name`,
      [operatorId]
    );

    const machineryIds = assignedMachinery.map((m) => m.id);
    if (machineryIds.length === 0) {
      const emptySummary = await getOperatorIncomeSummary(operatorId);
      return res.json({
        success: true,
        assigned_machinery: [],
        upcoming_bookings: [],
        active_bookings: [],
        completed_bookings: [],
        incomplete_bookings: [],
        recent_transactions: [],
        income_summary: emptySummary.summary,
        earnings_per_machinery: emptySummary.earnings_per_machinery
      });
    }

    const placeholders = machineryIds.map(() => '?').join(',');
    const baseBookingSelect = `
      SELECT mb.*, f.full_name AS farmer_name, f.reference_number,
             mi.machinery_name, mi.machinery_type
      FROM machinery_bookings mb
      JOIN farmers f ON mb.farmer_id = f.id
      JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      WHERE mb.machinery_id IN (${placeholders})
        AND (mb.assigned_operator_id = ? OR mb.assigned_operator_id IS NULL)
    `;

    const [upcoming] = await pool.execute(
      `${baseBookingSelect}
       AND mb.status = 'Approved' AND mb.booking_date >= ?
       ORDER BY mb.booking_date ASC LIMIT 20`,
      [...machineryIds, operatorId, today]
    );

    const [active] = await pool.execute(
      `${baseBookingSelect}
       AND mb.status IN ('Approved', 'In Use')
       ORDER BY mb.booking_date ASC LIMIT 20`,
      [...machineryIds, operatorId]
    );

    const [completed] = await pool.execute(
      `${baseBookingSelect}
       AND mb.status = 'Completed'
       ORDER BY mb.completed_date DESC LIMIT 20`,
      [...machineryIds, operatorId]
    );

    const [incomplete] = await pool.execute(
      `${baseBookingSelect}
       AND mb.status = 'Incomplete'
       ORDER BY mb.updated_at DESC LIMIT 20`,
      [...machineryIds, operatorId]
    );

    const [recentTransactions] = await pool.execute(
      `SELECT oi.*, mi.machinery_name, mb.status AS booking_status
       FROM operator_income oi
       JOIN machinery_inventory mi ON oi.machinery_id = mi.id
       LEFT JOIN machinery_bookings mb ON oi.booking_id = mb.id
       WHERE oi.operator_id = ?
       ORDER BY oi.created_at DESC LIMIT 10`,
      [operatorId]
    );

    const incomeData = await getOperatorIncomeSummary(operatorId);

    res.json({
      success: true,
      assigned_machinery: assignedMachinery,
      upcoming_bookings: upcoming,
      active_bookings: active,
      completed_bookings: completed,
      incomplete_bookings: incomplete,
      recent_transactions: recentTransactions,
      income_summary: incomeData.summary,
      earnings_per_machinery: incomeData.earnings_per_machinery
    });
  } catch (error) {
    console.error('Error fetching operator dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch operator dashboard' });
  }
});

// GET /api/operator-income
router.get('/', verifyOperatorAccess, async (req, res) => {
  try {
    const operatorId = req.operatorUser.id;
    const { start_date, end_date, machinery_id, booking_status, limit = 100 } = req.query;

    let query = `
      SELECT oi.*, mi.machinery_name, mi.machinery_type, mb.status AS booking_status,
             f.full_name AS farmer_name
      FROM operator_income oi
      JOIN machinery_inventory mi ON oi.machinery_id = mi.id
      LEFT JOIN machinery_bookings mb ON oi.booking_id = mb.id
      LEFT JOIN farmers f ON mb.farmer_id = f.id
      WHERE oi.operator_id = ?
    `;
    const params = [operatorId];

    if (start_date) {
      query += ' AND oi.transaction_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND oi.transaction_date <= ?';
      params.push(end_date);
    }
    if (machinery_id) {
      query += ' AND oi.machinery_id = ?';
      params.push(machinery_id);
    }
    if (booking_status) {
      query += ' AND mb.status = ?';
      params.push(booking_status);
    }

    query += ' ORDER BY oi.transaction_date DESC, oi.created_at DESC LIMIT ?';
    params.push(parseInt(limit, 10));

    const [income] = await pool.execute(query, params);
    const summary = await getOperatorIncomeSummary(operatorId, {
      start_date,
      end_date,
      machinery_id,
      booking_status
    });

    res.json({
      success: true,
      income,
      summary: summary.summary,
      earnings_per_machinery: summary.earnings_per_machinery
    });
  } catch (error) {
    console.error('Error fetching operator income:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch operator income' });
  }
});

// POST /api/operator-income/generate/:bookingId — internal retry for missed income
router.post('/generate/:bookingId', verifyToken, async (req, res) => {
  try {
    const user = await resolveUser(req);
    if (!user || !['admin', 'treasurer', 'president'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }

    const bookingId = req.params.bookingId;
    const [bookingRows] = await pool.execute(
      `SELECT mb.barangay_id FROM machinery_bookings mb WHERE mb.id = ?`,
      [bookingId]
    );
    if (!bookingRows.length) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    const { canAccessBarangay } = require('../utils/requestUser');
    if (!canAccessBarangay(user, bookingRows[0].barangay_id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only generate operator income for bookings in your barangay.'
      });
    }

    const result = await generateOperatorIncomeForBooking(bookingId);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error generating operator income:', error);
    res.status(500).json({ success: false, message: 'Failed to generate operator income' });
  }
});

module.exports = router;
