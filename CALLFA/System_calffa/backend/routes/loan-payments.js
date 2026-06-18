const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { buildListBarangayScope } = require('../utils/requestUser');

// Get payment history with barangay filtering
router.get('/history', verifyToken, async (req, res) => {
  try {
    const { barangay_id } = req.query;
    const scope = buildListBarangayScope(req.user, barangay_id, 'f');

    let query = `
      SELECT 
        lp.*,
        l.loan_type,
        l.status as loan_status,
        l.loan_amount,
        f.full_name,
        f.reference_number,
        f.barangay_id,
        b.name as barangay_name,
        (l.loan_amount - COALESCE(SUM(lp.amount) OVER (PARTITION BY lp.loan_id ORDER BY lp.payment_date), 0)) as remaining_after_payment
      FROM loan_payments lp
      JOIN loans l ON lp.loan_id = l.id
      JOIN farmers f ON l.farmer_id = f.id
      LEFT JOIN barangays b ON f.barangay_id = b.id
      WHERE 1=1
    `;
    const params = [];

    if (req.user.role === 'farmer') {
      query += ' AND l.farmer_id = ?';
      params.push(req.user.id);
    } else {
      query += ` ${scope.clause}`;
      params.push(...scope.params);
    }

    query += ` ORDER BY lp.payment_date DESC`;

    const [payments] = await pool.execute(query, params);

    res.json({
      success: true,
      payments: payments || []
    });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history', error: error.message });
  }
});

module.exports = router;
