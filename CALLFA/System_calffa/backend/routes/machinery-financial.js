// Machinery Financial Management Routes
const express = require('express');
const router = express.Router();
const pool = require('../db');

// Middleware to verify financial access and get user's barangay
// Admin: can view all (but only profit/reports tabs in frontend)
// President, Auditor: can view their barangay's data (read-only)
// Treasurer: can view and manage their barangay's data
const verifyFinancialAccess = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const [user] = await pool.execute(
      'SELECT role, barangay_id FROM farmers WHERE id = ?',
      [userId]
    );

    if (user.length === 0 || !['admin', 'president', 'treasurer', 'auditor'].includes(user[0].role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admin, president, treasurer, and auditor can access financial management' 
      });
    }

    // Attach user info to request for barangay filtering
    req.userRole = user[0].role;
    req.userBarangayId = user[0].barangay_id;
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

// Middleware to verify treasurer-only access for write operations
const verifyTreasurerAccess = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const [user] = await pool.execute(
      'SELECT role, barangay_id FROM farmers WHERE id = ?',
      [userId]
    );

    if (user.length === 0 || user[0].role !== 'treasurer') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only treasurers can manage financial records' 
      });
    }

    req.userRole = user[0].role;
    req.userBarangayId = user[0].barangay_id;
    
    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

// ==================== EXPENSES ====================

// GET machinery expenses with filters (barangay-based)
router.get('/expenses', verifyFinancialAccess, async (req, res) => {
  try {
    const { machinery_id, start_date, end_date, limit = 100, barangay_id } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;
    
    let query = `SELECT 
      me.*,
      mi.machinery_name,
      mi.machinery_type,
      mi.barangay_id,
      b.name as barangay_name
    FROM machinery_expenses me
    LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
    LEFT JOIN barangays b ON mi.barangay_id = b.id
    WHERE 1=1`;
    const params = [];
    
    // Filter by barangay: admin can filter by selected barangay, others see their own barangay
    if (userRole === 'admin' && barangay_id) {
      query += ' AND mi.barangay_id = ?';
      params.push(barangay_id);
    } else if (userRole !== 'admin' && userBarangayId) {
      query += ' AND mi.barangay_id = ?';
      params.push(userBarangayId);
    }
    
    if (machinery_id && machinery_id !== '') {
      query += ' AND me.machinery_id = ?';
      params.push(parseInt(machinery_id));
    }
    
    if (start_date) {
      query += ' AND me.date_of_expense >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND me.date_of_expense <= ?';
      params.push(end_date);
    }
    
    query += ' ORDER BY me.date_of_expense DESC LIMIT ?';
    params.push(parseInt(limit));
    
    const [expenses] = await pool.execute(query, params);
    res.json({ success: true, expenses, userRole, userBarangayId });
  } catch (error) {
    console.error('Error fetching expenses:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expenses' });
  }
});

// GET single expense
router.get('/expenses/:id', verifyFinancialAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const [expense] = await pool.execute(
      'SELECT * FROM machinery_expenses WHERE id = ?',
      [id]
    );
    
    if (expense.length === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    res.json({ success: true, expense: expense[0] });
  } catch (error) {
    console.error('Error fetching expense:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expense' });
  }
});

// POST create new expense (treasurer only)
router.post('/expenses', verifyTreasurerAccess, async (req, res) => {
  try {
    const {
      machinery_id,
      date_of_expense,
      particulars,
      reference_number,
      total_amount,
      fuel_and_oil = 0,
      labor_cost = 0,
      per_diem = 0,
      repair_and_maintenance = 0,
      office_supply = 0,
      communication_expense = 0,
      utilities_expense = 0,
      sundries = 0,
      user_id
    } = req.body;
    
    if (!machinery_id || !date_of_expense || !particulars || !total_amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }

    if (!reference_number || reference_number.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Receipt/Reference number is required' 
      });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO machinery_expenses 
       (machinery_id, date_of_expense, particulars, reference_number, total_amount, 
        fuel_and_oil, labor_cost, per_diem, repair_and_maintenance, office_supply,
        communication_expense, utilities_expense, sundries, record_created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [machinery_id, date_of_expense, particulars, reference_number.trim(), total_amount,
       fuel_and_oil, labor_cost, per_diem, repair_and_maintenance, office_supply,
       communication_expense, utilities_expense, sundries, user_id]
    );

    res.json({ 
      success: true, 
      message: 'Expense recorded successfully',
      expense_id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating expense:', error);
    res.status(500).json({ success: false, message: 'Failed to create expense' });
  }
});

// PUT update expense (treasurer only)
router.put('/expenses/:id', verifyTreasurerAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      date_of_expense,
      particulars,
      reference_number,
      total_amount,
      fuel_and_oil,
      labor_cost,
      per_diem,
      repair_and_maintenance,
      office_supply,
      communication_expense,
      utilities_expense,
      sundries
    } = req.body;

    if (!reference_number || reference_number.trim() === '') {
      return res.status(400).json({ 
        success: false, 
        message: 'Receipt/Reference number is required' 
      });
    }
    
    const [result] = await pool.execute(
      `UPDATE machinery_expenses 
       SET date_of_expense = ?, particulars = ?, reference_number = ?, total_amount = ?,
           fuel_and_oil = ?, labor_cost = ?, per_diem = ?, repair_and_maintenance = ?,
           office_supply = ?, communication_expense = ?, utilities_expense = ?, sundries = ?
       WHERE id = ?`,
      [date_of_expense, particulars, reference_number.trim(), total_amount,
       fuel_and_oil, labor_cost, per_diem, repair_and_maintenance,
       office_supply, communication_expense, utilities_expense, sundries, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    res.json({ success: true, message: 'Expense updated successfully' });
  } catch (error) {
    console.error('Error updating expense:', error);
    res.status(500).json({ success: false, message: 'Failed to update expense' });
  }
});

// DELETE expense (treasurer only)
router.delete('/expenses/:id', verifyTreasurerAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const [result] = await pool.execute(
      'DELETE FROM machinery_expenses WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Expense not found' });
    }
    
    res.json({ success: true, message: 'Expense deleted successfully' });
  } catch (error) {
    console.error('Error deleting expense:', error);
    res.status(500).json({ success: false, message: 'Failed to delete expense' });
  }
});

// ==================== INCOME ====================

// GET machinery income (barangay-based)
router.get('/income', verifyFinancialAccess, async (req, res) => {
  try {
    const { machinery_id, start_date, end_date, limit = 100, income_source = 'all' } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;

    // Get income from machinery collections + association dues + legacy income rows
    let query = `
      SELECT * FROM (
        -- Actual machinery collection/payment transactions
        SELECT
          CONCAT('COL-', mbp.id) as income_id,
          mbp.booking_id as booking_id,
          NULL as dues_id,
          mb.machinery_id,
          mi.machinery_name,
          mi.machinery_type,
          COALESCE(f.barangay_id, mi.barangay_id) as barangay_id,
          f.barangay_id as farmer_barangay_id,
          mi.barangay_id as machinery_barangay_id,
          b.name as barangay_name,
          f.full_name as farmer_name,
          mb.booking_date,
          mb.total_price as original_amount,
          mbp.amount as income_amount,
          mbp.payment_date as date_of_income,
          CASE
            WHEN COALESCE(mb.total_paid, 0) >= COALESCE(mb.total_price, 0) AND COALESCE(mb.total_price, 0) > 0 THEN 'Full Payment'
            WHEN COALESCE(mb.total_paid, 0) > 0 THEN 'Partial Payment'
            ELSE 'Unpaid'
          END as payment_status,
          mb.status as booking_status,
          'Machinery Collection' as income_type,
          COALESCE(mbp.remarks, '') as remarks,
          NULL as period_start,
          NULL as period_end,
          mbp.payment_method
        FROM machinery_booking_payments mbp
        LEFT JOIN machinery_bookings mb ON mbp.booking_id = mb.id
        LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
        LEFT JOIN farmers f ON mb.farmer_id = f.id
        LEFT JOIN barangays b ON COALESCE(f.barangay_id, mi.barangay_id) = b.id

        UNION ALL

        -- Association dues collections
        SELECT
          CONCAT('DU-', md.id) as income_id,
          NULL as booking_id,
          md.id as dues_id,
          NULL as machinery_id,
          NULL as machinery_name,
          NULL as machinery_type,
          md.barangay_id,
          md.barangay_id as farmer_barangay_id,
          md.barangay_id as machinery_barangay_id,
          b.name as barangay_name,
          f.full_name as farmer_name,
          NULL as booking_date,
          md.amount as original_amount,
          md.amount as income_amount,
          md.collection_date as date_of_income,
          'Paid' as payment_status,
          'Completed' as booking_status,
          'Association Dues' as income_type,
          COALESCE(md.remarks, '') as remarks,
          md.period_start,
          md.period_end,
          md.payment_method
        FROM monthly_dues md
        LEFT JOIN farmers f ON md.farmer_id = f.id
        LEFT JOIN barangays b ON md.barangay_id = b.id

        UNION ALL

        -- Fallback: paid bookings without payment rows (historical data)
        SELECT
          CONCAT('BK-', mb.id) as income_id,
          mb.id as booking_id,
          NULL as dues_id,
          mb.machinery_id,
          mi.machinery_name,
          mi.machinery_type,
          COALESCE(f.barangay_id, mi.barangay_id) as barangay_id,
          f.barangay_id as farmer_barangay_id,
          mi.barangay_id as machinery_barangay_id,
          b.name as barangay_name,
          f.full_name as farmer_name,
          mb.booking_date,
          mb.total_price as original_amount,
          COALESCE(mb.total_paid, 0) as income_amount,
          COALESCE(mb.payment_date, mb.updated_at) as date_of_income,
          CASE
            WHEN COALESCE(mb.total_paid, 0) >= COALESCE(mb.total_price, 0) AND COALESCE(mb.total_price, 0) > 0 THEN 'Full Payment'
            WHEN COALESCE(mb.total_paid, 0) > 0 THEN 'Partial Payment'
            ELSE 'Unpaid'
          END as payment_status,
          COALESCE(mb.status, 'Completed') as booking_status,
          'Machinery Booking' as income_type,
          COALESCE(mb.notes, '') as remarks,
          NULL as period_start,
          NULL as period_end,
          NULL as payment_method
        FROM machinery_bookings mb
        LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
        LEFT JOIN farmers f ON mb.farmer_id = f.id
        LEFT JOIN barangays b ON COALESCE(f.barangay_id, mi.barangay_id) = b.id
        WHERE COALESCE(mb.total_paid, 0) > 0
          AND NOT EXISTS (
            SELECT 1
            FROM machinery_booking_payments mbp3
            WHERE mbp3.booking_id = mb.id
          )

        UNION ALL

        -- Legacy/manual machinery income rows (skip rows already represented by collection payments)
        SELECT
          CONCAT('INC-', minc.id) as income_id,
          minc.booking_id as booking_id,
          NULL as dues_id,
          minc.machinery_id,
          mi.machinery_name,
          mi.machinery_type,
          mi.barangay_id,
          f.barangay_id as farmer_barangay_id,
          mi.barangay_id as machinery_barangay_id,
          b.name as barangay_name,
          f.full_name as farmer_name,
          mb.booking_date,
          COALESCE(mb.total_price, minc.income_amount) as original_amount,
          minc.income_amount as income_amount,
          minc.date_of_income as date_of_income,
          CASE
            WHEN COALESCE(mb.total_paid, 0) >= COALESCE(mb.total_price, 0) AND COALESCE(mb.total_price, 0) > 0 THEN 'Full Payment'
            WHEN COALESCE(mb.total_paid, 0) > 0 THEN 'Partial Payment'
            ELSE 'Paid'
          END as payment_status,
          COALESCE(mb.status, 'Completed') as booking_status,
          'Machinery Booking' as income_type,
          COALESCE(minc.remarks, '') as remarks,
          NULL as period_start,
          NULL as period_end,
          NULL as payment_method
        FROM machinery_income minc
        LEFT JOIN machinery_inventory mi ON minc.machinery_id = mi.id
        LEFT JOIN machinery_bookings mb ON minc.booking_id = mb.id
        LEFT JOIN farmers f ON mb.farmer_id = f.id
        LEFT JOIN barangays b ON mi.barangay_id = b.id
        WHERE NOT EXISTS (
          SELECT 1
          FROM machinery_booking_payments mbp2
          WHERE mbp2.booking_id = minc.booking_id
        )
      ) combined_income
      WHERE 1=1
    `;
    const params = [];

    // Filter by barangay for non-admin users
    if (userRole !== 'admin' && userBarangayId) {
      query += ' AND (barangay_id = ? OR farmer_barangay_id = ? OR machinery_barangay_id = ?)';
      params.push(userBarangayId, userBarangayId, userBarangayId);
    }

    if (machinery_id && machinery_id !== '') {
      if (income_source === 'dues') {
        // Ignore machinery filter when viewing dues-only records
      } else if (income_source === 'all') {
        // Keep dues visible while filtering machinery-related income
        query += ' AND (income_type = \'Association Dues\' OR machinery_id = ?)';
        params.push(parseInt(machinery_id));
      } else {
        query += ' AND machinery_id = ?';
        params.push(parseInt(machinery_id));
      }
    }

    if (income_source === 'machinery') {
      query += ' AND income_type <> \'Association Dues\'';
    } else if (income_source === 'dues') {
      query += ' AND income_type = \'Association Dues\'';
    }

    if (start_date) {
      query += ' AND date_of_income >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND date_of_income <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY date_of_income DESC LIMIT ?';
    params.push(parseInt(limit));

    const [income] = await pool.execute(query, params);
    res.json({ success: true, income, userRole, userBarangayId });
  } catch (error) {
    console.error('Error fetching income:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch income' });
  }
});

// POST create income record (treasurer only)
router.post('/income', verifyTreasurerAccess, async (req, res) => {
  try {
    const {
      machinery_id,
      booking_id,
      date_of_income,
      income_amount,
      remarks,
      user_id
    } = req.body;
    
    if (!machinery_id || !booking_id || !date_of_income || !income_amount) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields' 
      });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO machinery_income 
       (machinery_id, booking_id, date_of_income, income_amount, remarks, record_created_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [machinery_id, booking_id, date_of_income, income_amount, remarks, user_id]
    );

    res.json({ 
      success: true, 
      message: 'Income recorded successfully',
      income_id: result.insertId 
    });
  } catch (error) {
    console.error('Error creating income:', error);
    res.status(500).json({ success: false, message: 'Failed to record income' });
  }
});

// ==================== PROFIT CALCULATIONS ====================

// GET profit summary (barangay-based)
router.get('/profit-summary', verifyFinancialAccess, async (req, res) => {
  try {
    const { start_date, end_date, barangay_id } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;
    
    // Income query with barangay filter (includes machinery operations and association dues)
    let incomeQuery = `
      SELECT COALESCE(SUM(income_amount), 0) as total_income FROM (
        SELECT
          COALESCE(mb.total_paid, 0) as income_amount,
          COALESCE(mb.payment_date, mb.updated_at) as date_of_income,
          mi.barangay_id
        FROM machinery_bookings mb
        LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
        WHERE COALESCE(mb.total_paid, 0) > 0
        UNION ALL
        SELECT md.amount as income_amount, md.collection_date as date_of_income, md.barangay_id
        FROM monthly_dues md
      ) combined_income
      WHERE 1=1
    `;
    
    // Expense query with barangay filter
    let expenseQuery = `
      SELECT COALESCE(SUM(me.total_amount), 0) as total_expenses 
      FROM machinery_expenses me
      LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
      WHERE 1=1
    `;
    
    const incomeParams = [];
    const expenseParams = [];
    
    // Filter by barangay: admin can filter by selected barangay, others see their own barangay
    if (userRole === 'admin' && barangay_id) {
      incomeQuery += ' AND barangay_id = ?';
      expenseQuery += ' AND mi.barangay_id = ?';
      incomeParams.push(barangay_id);
      expenseParams.push(barangay_id);
    } else if (userRole !== 'admin' && userBarangayId) {
      incomeQuery += ' AND barangay_id = ?';
      expenseQuery += ' AND mi.barangay_id = ?';
      incomeParams.push(userBarangayId);
      expenseParams.push(userBarangayId);
    }
    
    if (start_date) {
      incomeQuery += ' AND date_of_income >= ?';
      expenseQuery += ' AND me.date_of_expense >= ?';
      incomeParams.push(start_date);
      expenseParams.push(start_date);
    }
    
    if (end_date) {
      incomeQuery += ' AND date_of_income <= ?';
      expenseQuery += ' AND me.date_of_expense <= ?';
      incomeParams.push(end_date);
      expenseParams.push(end_date);
    }
    
    const [incomeResult] = await pool.execute(incomeQuery, incomeParams);
    const [expenseResult] = await pool.execute(expenseQuery, expenseParams);
    
    const totalIncome = incomeResult[0].total_income || 0;
    const totalExpenses = expenseResult[0].total_expenses || 0;
    const netProfit = totalIncome - totalExpenses;

    res.json({ 
      success: true, 
      summary: {
        total_income: parseFloat(totalIncome),
        total_expenses: parseFloat(totalExpenses),
        net_profit: parseFloat(netProfit)
      },
      userRole,
      userBarangayId
    });
  } catch (error) {
    console.error('Error calculating profit:', error);
    res.status(500).json({ success: false, message: 'Failed to calculate profit' });
  }
});

// GET expense breakdown by category (barangay-based)
router.get('/expenses-breakdown', verifyFinancialAccess, async (req, res) => {
  try {
    const { start_date, end_date, barangay_id } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;
    
    let query = `
      SELECT 
        SUM(me.fuel_and_oil) as fuel_and_oil,
        SUM(me.labor_cost) as labor_cost,
        SUM(me.per_diem) as per_diem,
        SUM(me.repair_and_maintenance) as repair_and_maintenance,
        SUM(me.office_supply) as office_supply,
        SUM(me.communication_expense) as communication_expense,
        SUM(me.utilities_expense) as utilities_expense,
        SUM(me.sundries) as sundries,
        SUM(me.total_amount) as total
      FROM machinery_expenses me
      LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
      WHERE 1=1
    `;
    const params = [];
    
    // Filter by barangay: admin can filter by selected barangay, others see their own barangay
    if (userRole === 'admin' && barangay_id) {
      query += ' AND mi.barangay_id = ?';
      params.push(barangay_id);
    } else if (userRole !== 'admin' && userBarangayId) {
      query += ' AND mi.barangay_id = ?';
      params.push(userBarangayId);
    }
    
    if (start_date) {
      query += ' AND me.date_of_expense >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND me.date_of_expense <= ?';
      params.push(end_date);
    }
    
    const [breakdown] = await pool.execute(query, params);
    res.json({ success: true, breakdown: breakdown[0] });
  } catch (error) {
    console.error('Error fetching expense breakdown:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch expense breakdown' });
  }
});

/**
 * Ranking of machinery by completed bookings only (status = Completed).
 * Respects financial page barangay scope and optional booking_date range.
 */
router.get('/booking-usage-stats', verifyFinancialAccess, async (req, res) => {
  try {
    const { start_date, end_date, barangay_id } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;

    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit < 1) limit = 20;
    if (limit > 50) limit = 50;

    let query = `
      SELECT 
        mb.machinery_id,
        mi.machinery_name,
        mi.machinery_type,
        mi.barangay_id,
        COALESCE(bg.name, '') AS barangay_name,
        COUNT(*) AS booking_count,
        COALESCE(SUM(mb.area_size), 0) AS total_area_booked,
        MAX(mb.area_unit) AS area_unit_hint
      FROM machinery_bookings mb
      INNER JOIN machinery_inventory mi ON mi.id = mb.machinery_id
      LEFT JOIN barangays bg ON bg.id = mi.barangay_id
      WHERE mb.status = 'Completed'
    `;
    const params = [];

    if (userRole === 'admin' && barangay_id) {
      query += ' AND mi.barangay_id = ?';
      params.push(parseInt(barangay_id, 10));
    } else if (userRole !== 'admin' && userBarangayId) {
      query += ' AND mi.barangay_id = ?';
      params.push(userBarangayId);
    }

    if (start_date) {
      query += ' AND mb.booking_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      query += ' AND mb.booking_date <= ?';
      params.push(end_date);
    }

    query += `
      GROUP BY mb.machinery_id, mi.machinery_name, mi.machinery_type, mi.barangay_id, bg.name
      ORDER BY booking_count DESC, mi.machinery_name ASC
      LIMIT ${limit}
    `;

    const [rows] = await pool.execute(query, params);

    const leaders = rows.map((row) => ({
      machinery_id: row.machinery_id,
      machinery_name: row.machinery_name,
      machinery_type: row.machinery_type,
      barangay_id: row.barangay_id,
      barangay_name: row.barangay_name,
      booking_count: parseInt(row.booking_count, 10),
      total_area_booked: parseFloat(row.total_area_booked) || 0,
      area_unit_hint: row.area_unit_hint || ''
    }));

    res.json({
      success: true,
      leaders,
      userRole,
      userBarangayId
    });
  } catch (error) {
    console.error('Error fetching booking usage stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch machinery booking stats' });
  }
});

// ==================== ACCOUNTS RECEIVABLE & COLLECTIONS ====================

// GET Accounts Receivable list with summary (barangay-based)
router.get('/ar', verifyFinancialAccess, async (req, res) => {
  try {
    const { machinery_id } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;
    
    let query = `
      SELECT 
        mb.id,
        mb.farmer_id,
        f.full_name as farmer_name,
        f.barangay_id as farmer_barangay_id,
        mb.machinery_id,
        mi.machinery_name,
        mi.machinery_type,
        mi.barangay_id,
        b.name as barangay_name,
        mb.booking_date,
        mb.total_price,
        COALESCE(mb.total_paid, 0) as amount_collected,
        (mb.total_price - COALESCE(mb.total_paid, 0)) as remaining_balance,
        COALESCE(mb.pending_interest, 0) as pending_interest,
        mb.interest_applied_date,
        mb.status as booking_status,
        mb.payment_status
      FROM machinery_bookings mb
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      LEFT JOIN barangays b ON mi.barangay_id = b.id
      LEFT JOIN farmers f ON mb.farmer_id = f.id
      WHERE mb.status = 'Completed' AND (mb.total_price - COALESCE(mb.total_paid, 0)) > 0
    `;
    const params = [];
    
    // Filter by barangay for non-admin users (collectibles from their barangay)
    if (userRole !== 'admin' && userBarangayId) {
      query += ' AND f.barangay_id = ?';
      params.push(userBarangayId);
    }
    
    if (machinery_id && machinery_id !== '') {
      query += ' AND mb.machinery_id = ?';
      params.push(parseInt(machinery_id));
    }
    
    query += ' ORDER BY mb.booking_date DESC';
    
    const [arList] = await pool.execute(query, params);
    
    // Calculate summary
    const summary = {
      total_receivables: 0,
      total_collected: 0,
      total_balance: 0
    };
    
    arList.forEach(item => {
      summary.total_receivables += parseFloat(item.total_price) || 0;
      summary.total_collected += parseFloat(item.amount_collected) || 0;
      summary.total_balance += parseFloat(item.remaining_balance) || 0;
    });
    
    res.json({ success: true, ar: arList, summary, userRole, userBarangayId });
  } catch (error) {
    console.error('Error fetching AR data:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch A/R data' });
  }
});

// GET Collections transactions (barangay-based)
router.get('/collections', verifyFinancialAccess, async (req, res) => {
  try {
    const { machinery_id } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;
    
    let query = `
      SELECT 
        mbp.id,
        mbp.booking_id,
        mbp.payment_date as collection_date,
        mbp.amount as collection_amount,
        mbp.payment_method,
        mbp.receipt_number,
        mbp.remarks,
        f.full_name as farmer_name,
        f.barangay_id as farmer_barangay_id,
        mi.machinery_name,
        mi.machinery_type,
        mb.total_price,
        b.name as barangay_name
      FROM machinery_booking_payments mbp
      LEFT JOIN machinery_bookings mb ON mbp.booking_id = mb.id
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      LEFT JOIN barangays b ON mi.barangay_id = b.id
      LEFT JOIN farmers f ON mb.farmer_id = f.id
      WHERE 1=1
    `;
    const params = [];
    
    // Filter by farmer's barangay for non-admin users
    if (userRole !== 'admin' && userBarangayId) {
      query += ' AND f.barangay_id = ?';
      params.push(userBarangayId);
    }
    
    if (machinery_id && machinery_id !== '') {
      query += ' AND mb.machinery_id = ?';
      params.push(parseInt(machinery_id));
    }
    
    query += ' ORDER BY mbp.payment_date DESC';
    
    const [collections] = await pool.execute(query, params);
    res.json({ success: true, collections, userRole, userBarangayId });
  } catch (error) {
    console.error('Error fetching collections:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch collections' });
  }
});

// POST Record a collection (treasurer only)
router.post('/collections', verifyTreasurerAccess, async (req, res) => {
  try {
    const {
      booking_id, 
      collection_amount, 
      collection_date, 
      receipt_number, 
      payment_method = 'cash', 
      remarks,
      total_collection = collection_amount // Total including interest
    } = req.body;
    const { user_id } = req.body;
    
    if (!booking_id || !collection_amount || !collection_date) {
      return res.status(400).json({ success: false, message: 'Missing required fields' });
    }

    if (!receipt_number || receipt_number.trim() === '') {
      return res.status(400).json({ success: false, message: 'Receipt number is required' });
    }
    
    // Get booking details
    const [booking] = await pool.execute(
      'SELECT total_price, total_paid, booking_date, pending_interest FROM machinery_bookings WHERE id = ?',
      [booking_id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    
    const currentTotalPaid = parseFloat(booking[0].total_paid) || 0;
    let totalPrice = parseFloat(booking[0].total_price) || 0;
    const collectionAmt = parseFloat(collection_amount);
    const existingInterest = parseFloat(booking[0].pending_interest) || 0;
    
    // Determine payment type from amount vs remaining balance (server-authoritative).
    const initialRemainingBalance = totalPrice - currentTotalPaid;
    const isPartialPayment = collectionAmt < (initialRemainingBalance - 0.01);
    const finalPaymentType = isPartialPayment ? 'partial' : 'full';

    // Automatically apply one-time 2% interest when payment is partial and
    // no prior interest was added yet. Interest is based on full amount due.
    let interestAmt = 0;
    if (isPartialPayment && existingInterest <= 0) {
      interestAmt = parseFloat((totalPrice * 0.02).toFixed(2));
    }
    
    // If interest is applied, add it to total_price (one-time increase)
    if (interestAmt > 0) {
      totalPrice += interestAmt;
      await pool.execute(
        `UPDATE machinery_bookings SET total_price = ?, pending_interest = ?, interest_applied_date = ? WHERE id = ?`,
        [totalPrice, interestAmt, collection_date, booking_id]
      );
    }
    
    const newTotalPaid = currentTotalPaid + collectionAmt;
    
    // Validate collection amount doesn't exceed remaining balance (after interest added)
    const remainingBalance = totalPrice - currentTotalPaid;
    if (collectionAmt > remainingBalance + 0.01) { // small tolerance for floating point
      return res.status(400).json({ 
        success: false, 
        message: `Collection amount (₱${collectionAmt.toFixed(2)}) exceeds remaining balance (₱${remainingBalance.toFixed(2)})` 
      });
    }
    
    // Insert payment record — store auto-applied interest when applicable
    const actualInterestAmount = interestAmt > 0 ? interestAmt : 0;
    const actualInterestApplied = interestAmt > 0 ? 1 : 0;
    const actualInterestSeason = interestAmt > 0 ? 1 : 0;
    
    const [result] = await pool.execute(
      `INSERT INTO machinery_booking_payments 
       (booking_id, payment_date, amount, payment_method, receipt_number, remarks, recorded_by, payment_type, interest_amount, interest_applied, interest_season)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [booking_id, collection_date, collection_amount, payment_method, receipt_number.trim(), remarks, user_id, finalPaymentType, actualInterestAmount, actualInterestApplied, actualInterestSeason]
    );
    
    // Update booking with new total_paid and payment_date
    let paymentStatus = 'Unpaid';
    if (newTotalPaid >= totalPrice) {
      paymentStatus = 'Paid';
    } else if (newTotalPaid > 0) {
      paymentStatus = 'Partial';
    }
    
    const newRemainingBalance = totalPrice - newTotalPaid;
    
    await pool.execute(
      `UPDATE machinery_bookings 
       SET total_paid = ?, 
           remaining_balance = ?,
           payment_status = ?,
           payment_date = ?,
           last_payment_date = ?
       WHERE id = ?`,
      [newTotalPaid, newRemainingBalance, paymentStatus, collection_date, collection_date, booking_id]
    );

    // Update income entry: delete old and insert fresh with cumulative total_paid
    // This ensures income always reflects the accurate total collected for this booking
    await pool.execute(
      'DELETE FROM machinery_income WHERE booking_id = ?',
      [booking_id]
    );
    
    await pool.execute(
      `INSERT INTO machinery_income 
       (booking_id, machinery_id, income_amount, date_of_income, record_created_by)
       SELECT ?, mb.machinery_id, mb.total_paid, ?, ?
       FROM machinery_bookings mb
       WHERE mb.id = ?`,
      [booking_id, collection_date, user_id, booking_id]
    );

    const [incomeRow] = await pool.execute(
      'SELECT machinery_id, income_amount FROM machinery_income WHERE booking_id = ? LIMIT 1',
      [booking_id]
    );

    res.json({ 
      success: true, 
      message: 'Collection recorded successfully and moved to income',
      payment_id: result.insertId,
      payment_type: finalPaymentType,
      interest_season: actualInterestSeason,
      interest_applied: actualInterestApplied === 1,
      interest_amount: actualInterestAmount,
      total_collection: total_collection,
      auto_interest_rule: '2% (Partial)'
    });
  } catch (error) {
    console.error('Error recording collection:', error);
    res.status(500).json({ success: false, message: 'Failed to record collection' });
  }
});

// POST generate profit distribution record (treasurer only)
router.post('/profit-distribution/generate', verifyTreasurerAccess, async (req, res) => {
  try {
    const { start_date, end_date, distribution_period } = req.body;
    const userBarangayId = req.userBarangayId;
    const userId = req.body.user_id;

    let incomeQuery = `
      SELECT COALESCE(SUM(income_amount), 0) AS total_income
      FROM (
        SELECT
          COALESCE(mb.total_paid, 0) as income_amount,
          COALESCE(mb.payment_date, mb.updated_at) as date_of_income,
          mi.barangay_id
        FROM machinery_bookings mb
        LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
        WHERE COALESCE(mb.total_paid, 0) > 0
        UNION ALL
        SELECT md.amount as income_amount, md.collection_date as date_of_income, md.barangay_id
        FROM monthly_dues md
      ) combined_income
      WHERE 1=1
    `;

    let expenseQuery = `
      SELECT COALESCE(SUM(me.total_amount), 0) AS total_expenses
      FROM machinery_expenses me
      LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
      WHERE 1=1
    `;

    const incomeParams = [];
    const expenseParams = [];

    if (userBarangayId) {
      incomeQuery += ' AND barangay_id = ?';
      expenseQuery += ' AND mi.barangay_id = ?';
      incomeParams.push(userBarangayId);
      expenseParams.push(userBarangayId);
    }

    if (start_date) {
      incomeQuery += ' AND date_of_income >= ?';
      expenseQuery += ' AND me.date_of_expense >= ?';
      incomeParams.push(start_date);
      expenseParams.push(start_date);
    }

    if (end_date) {
      incomeQuery += ' AND date_of_income <= ?';
      expenseQuery += ' AND me.date_of_expense <= ?';
      incomeParams.push(end_date);
      expenseParams.push(end_date);
    }

    const [incomeResult] = await pool.execute(incomeQuery, incomeParams);
    const [expenseResult] = await pool.execute(expenseQuery, expenseParams);

    const totalIncome = Number(incomeResult[0].total_income || 0);
    const totalExpenses = Number(expenseResult[0].total_expenses || 0);
    const netProfit = totalIncome - totalExpenses;

    if (netProfit <= 0) {
      return res.status(400).json({
        success: false,
        message: 'No positive net profit available for distribution.'
      });
    }

    const distribution = {
      organization_share: Number((netProfit * 0.30).toFixed(2)),
      training_share: Number((netProfit * 0.20).toFixed(2)),
      members_share: Number((netProfit * 0.50).toFixed(2))
    };

    const periodLabel = distribution_period || `${start_date || 'beginning'} to ${end_date || 'present'}`;

    const [insertResult] = await pool.execute(
      `INSERT INTO machinery_profit_distribution
        (distribution_period, total_machinery_income, total_machinery_expenses, distribution_created_by)
       VALUES (?, ?, ?, ?)`,
      [periodLabel, totalIncome, totalExpenses, userId]
    );

    res.json({
      success: true,
      message: 'Profit distribution generated successfully.',
      distribution: {
        id: insertResult.insertId,
        distribution_period: periodLabel,
        total_income: totalIncome,
        total_expenses: totalExpenses,
        net_profit: netProfit,
        ...distribution
      }
    });
  } catch (error) {
    console.error('Error generating profit distribution:', error);
    res.status(500).json({ success: false, message: 'Failed to generate profit distribution' });
  }
});

// DELETE Collection transaction
router.delete('/collections/:id', verifyFinancialAccess, async (req, res) => {
  try {
    const { id } = req.params;
    const { user_id } = req.body;
    
    // Get payment details
    const [payment] = await pool.execute(
      'SELECT booking_id, amount FROM machinery_booking_payments WHERE id = ?',
      [id]
    );
    
    if (payment.length === 0) {
      return res.status(404).json({ success: false, message: 'Payment not found' });
    }
    
    const { booking_id, amount } = payment[0];
    
    // Delete payment record
    await pool.execute(
      'DELETE FROM machinery_booking_payments WHERE id = ?',
      [id]
    );
    
    // Update booking - recalculate total_paid
    const [payments] = await pool.execute(
      'SELECT COALESCE(SUM(amount), 0) as total FROM machinery_booking_payments WHERE booking_id = ?',
      [booking_id]
    );
    
    const newTotalPaid = parseFloat(payments[0].total) || 0;
    
    // Get booking total_price
    const [booking] = await pool.execute(
      'SELECT total_price FROM machinery_bookings WHERE id = ?',
      [booking_id]
    );
    
    let paymentStatus = 'Unpaid';
    if (newTotalPaid >= parseFloat(booking[0].total_price)) {
      paymentStatus = 'Paid';
    } else if (newTotalPaid > 0) {
      paymentStatus = 'Partial';
    }
    
    const deleteRemainingBalance = parseFloat(booking[0].total_price) - newTotalPaid;
    
    await pool.execute(
      `UPDATE machinery_bookings 
       SET total_paid = ?, 
           remaining_balance = ?,
           payment_status = ?
       WHERE id = ?`,
      [newTotalPaid, deleteRemainingBalance, paymentStatus, booking_id]
    );
    
    res.json({ success: true, message: 'Collection deleted successfully' });
  } catch (error) {
    console.error('Error deleting collection:', error);
    res.status(500).json({ success: false, message: 'Failed to delete collection' });
  }
});

// ==================== REPORTS ====================

// GET full transaction report
// Reports - transactions summary (barangay-based)
router.get('/reports/transactions', verifyFinancialAccess, async (req, res) => {
  try {
    const { type, start_date, end_date, barangay_id } = req.query;
    const userRole = req.userRole;
    const userBarangayId = req.userBarangayId;
    
    // Determine effective barangay filter
    let effectiveBarangayId = null;
    if (userRole === 'admin' && barangay_id) {
      effectiveBarangayId = barangay_id;
    } else if (userRole !== 'admin' && userBarangayId) {
      effectiveBarangayId = userBarangayId;
    }
    
    // Calculate date range based on report type
    let dateStart = start_date;
    let dateEnd = end_date;
    const now = new Date();
    
    if (!dateStart || !dateEnd) {
      switch (type) {
        case 'monthly':
          dateStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
          break;
        case 'quarterly':
          const quarter = Math.floor(now.getMonth() / 3);
          dateStart = new Date(now.getFullYear(), quarter * 3, 1).toISOString().split('T')[0];
          dateEnd = new Date(now.getFullYear(), quarter * 3 + 3, 0).toISOString().split('T')[0];
          break;
        case 'annual':
          dateStart = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
          dateEnd = new Date(now.getFullYear(), 11, 31).toISOString().split('T')[0];
          break;
        default:
          dateStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
          dateEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split('T')[0];
      }
    }
    
    // Build barangay filter clause
    const barangayFilter = effectiveBarangayId ? ' AND mi.barangay_id = ?' : '';
    const barangayFilterFarmer = effectiveBarangayId ? ' AND f.barangay_id = ?' : '';
    
    // Fetch all expenses in date range (filtered by barangay)
    let expenseQuery = `
      SELECT 
        me.id,
        me.date_of_expense as date,
        'Expense' as transaction_type,
        mi.machinery_name,
        mi.machinery_type,
        me.particulars as description,
        me.reference_number,
        me.fuel_and_oil,
        me.labor_cost,
        me.per_diem,
        me.repair_and_maintenance,
        me.office_supply,
        me.communication_expense,
        me.utilities_expense,
        me.sundries,
        me.total_amount as amount,
        NULL as farmer_name,
        NULL as booking_id
      FROM machinery_expenses me
      LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
      WHERE me.date_of_expense BETWEEN ? AND ?${barangayFilter}
      ORDER BY me.date_of_expense DESC
    `;
    const expenseParams = [dateStart, dateEnd];
    if (effectiveBarangayId) expenseParams.push(effectiveBarangayId);
    
    const [expenses] = await pool.execute(expenseQuery, expenseParams);
    
    // Fetch all income in date range (filtered by barangay)
    let incomeQuery = `
      SELECT * FROM (
        SELECT 
          CONCAT('INC-', minc.id) as id,
          minc.date_of_income as date,
          'Income' as transaction_type,
          mi.machinery_name,
          mi.machinery_type,
          CONCAT('Booking #', minc.booking_id, ' - ', COALESCE(minc.remarks, 'Service Income')) as description,
          NULL as reference_number,
          NULL as fuel_and_oil,
          NULL as labor_cost,
          NULL as per_diem,
          NULL as repair_and_maintenance,
          NULL as office_supply,
          NULL as communication_expense,
          NULL as utilities_expense,
          NULL as sundries,
          minc.income_amount as amount,
          f.full_name as farmer_name,
          minc.booking_id,
          mi.barangay_id
        FROM machinery_income minc
        LEFT JOIN machinery_inventory mi ON minc.machinery_id = mi.id
        LEFT JOIN machinery_bookings mb ON minc.booking_id = mb.id
        LEFT JOIN farmers f ON mb.farmer_id = f.id
        WHERE minc.date_of_income BETWEEN ? AND ?

        UNION ALL

        SELECT
          CONCAT('DUES-', md.id) as id,
          md.collection_date as date,
          'Income' as transaction_type,
          'Association Dues' as machinery_name,
          'Barangay Collection' as machinery_type,
          CONCAT(
            'Association dues for ',
            DATE_FORMAT(md.period_start, '%b %e, %Y'),
            ' to ',
            DATE_FORMAT(md.period_end, '%b %e, %Y')
          ) as description,
          NULL as reference_number,
          NULL as fuel_and_oil,
          NULL as labor_cost,
          NULL as per_diem,
          NULL as repair_and_maintenance,
          NULL as office_supply,
          NULL as communication_expense,
          NULL as utilities_expense,
          NULL as sundries,
          md.amount as amount,
          f.full_name as farmer_name,
          NULL as booking_id,
          md.barangay_id
        FROM monthly_dues md
        LEFT JOIN farmers f ON md.farmer_id = f.id
        WHERE md.collection_date BETWEEN ? AND ?
      ) combined_income
      WHERE 1=1${effectiveBarangayId ? ' AND barangay_id = ?' : ''}
      ORDER BY date DESC
    `;
    const incomeParams = [dateStart, dateEnd, dateStart, dateEnd];
    if (effectiveBarangayId) incomeParams.push(effectiveBarangayId);
    
    const [income] = await pool.execute(incomeQuery, incomeParams);
    
    // Fetch all collections (payments) in date range (filtered by farmer's barangay)
    let collectionsQuery = `
      SELECT 
        mbp.id,
        mbp.payment_date as date,
        'Collection' as transaction_type,
        mi.machinery_name,
        mi.machinery_type,
        CONCAT('Payment for Booking #', mbp.booking_id, 
          CASE WHEN mbp.payment_type = 'full' THEN ' (Full Payment)' ELSE ' (Partial Payment)' END) as description,
        mbp.receipt_number,
        NULL as fuel_and_oil,
        NULL as labor_cost,
        NULL as per_diem,
        NULL as repair_and_maintenance,
        NULL as office_supply,
        NULL as communication_expense,
        NULL as utilities_expense,
        NULL as sundries,
        mbp.amount as amount,
        f.full_name as farmer_name,
        mbp.booking_id,
        mbp.payment_type,
        mbp.interest_amount,
        mbp.interest_applied,
        mbp.interest_season
      FROM machinery_booking_payments mbp
      LEFT JOIN machinery_bookings mb ON mbp.booking_id = mb.id
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      LEFT JOIN farmers f ON mb.farmer_id = f.id
      WHERE mbp.payment_date BETWEEN ? AND ?${barangayFilterFarmer}
      ORDER BY mbp.payment_date DESC
    `;
    const collectionParams = [dateStart, dateEnd];
    if (effectiveBarangayId) collectionParams.push(effectiveBarangayId);
    
    const [collections] = await pool.execute(collectionsQuery, collectionParams);
    
    // Fetch bookings summary in date range (filtered by farmer's barangay)
    let bookingsQuery = `
      SELECT 
        mb.id,
        mb.booking_date as date,
        'Booking' as transaction_type,
        mi.machinery_name,
        mi.machinery_type,
        CONCAT('Booking for ', f.full_name, ' - ', mb.service_location) as description,
        mb.status,
        mb.total_price as amount,
        mb.total_paid,
        mb.payment_status,
        f.full_name as farmer_name,
        mb.id as booking_id
      FROM machinery_bookings mb
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      LEFT JOIN farmers f ON mb.farmer_id = f.id
      WHERE mb.booking_date BETWEEN ? AND ?${barangayFilterFarmer}
      ORDER BY mb.booking_date DESC
    `;
    const bookingParams = [dateStart, dateEnd];
    if (effectiveBarangayId) bookingParams.push(effectiveBarangayId);
    
    const [bookings] = await pool.execute(bookingsQuery, bookingParams);
    
    // Calculate summaries
    const totalExpenses = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const totalIncome = income.reduce((sum, i) => sum + parseFloat(i.amount || 0), 0);
    const totalCollections = collections.reduce((sum, c) => sum + parseFloat(c.amount || 0), 0);
    const totalInterest = collections.reduce((sum, c) => sum + parseFloat(c.interest_amount || 0), 0);
    const netProfit = totalIncome - totalExpenses;
    
    // Distribution calculations (30% org, 20% training, 50% members)
    const profitForDistribution = netProfit > 0 ? netProfit : 0;
    const organizationShare = profitForDistribution * 0.30;
    const trainingShare = profitForDistribution * 0.20;
    const membersShare = profitForDistribution * 0.50;
    
    // Get member count for per-member calculation (filtered by barangay)
    let memberQuery = "SELECT COUNT(*) as count FROM farmers WHERE status = 'approved'";
    const memberParams = [];
    if (effectiveBarangayId) {
      memberQuery += ' AND barangay_id = ?';
      memberParams.push(effectiveBarangayId);
    }
    const [members] = await pool.execute(memberQuery, memberParams);
    const memberCount = members[0].count || 1;
    const perMemberShare = membersShare / memberCount;
    
    // Combine all transactions sorted by date
    const allTransactions = [
      ...expenses,
      ...income,
      ...collections
    ].sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      success: true,
      report: {
        type: type || 'monthly',
        period: {
          start: dateStart,
          end: dateEnd
        },
        generated_at: new Date().toISOString(),
        summary: {
          total_expenses: totalExpenses,
          total_income: totalIncome,
          total_collections: totalCollections,
          total_interest_collected: totalInterest,
          net_profit: netProfit,
          distribution: {
            organization_share: organizationShare,
            training_share: trainingShare,
            members_share: membersShare,
            member_count: memberCount,
            per_member_share: perMemberShare
          }
        },
        counts: {
          expenses: expenses.length,
          income: income.length,
          collections: collections.length,
          bookings: bookings.length
        },
        transactions: {
          all: allTransactions,
          expenses: expenses,
          income: income,
          collections: collections,
          bookings: bookings
        }
      }
    });
  } catch (error) {
    console.error('Error generating report:', error);
    res.status(500).json({ success: false, message: 'Failed to generate report' });
  }
});

// ==================== MONTHLY DUES COLLECTION ====================

// Middleware to verify president/treasurer access for dues collection
const verifyDuesCollectorAccess = async (req, res, next) => {
  try {
    const userId = req.query.user_id || req.body.user_id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'User not authenticated' });
    }

    const [user] = await pool.execute(
      'SELECT role, barangay_id FROM farmers WHERE id = ?',
      [userId]
    );

    if (user.length === 0 || !['president', 'treasurer'].includes(user[0].role)) {
      return res.status(403).json({
        success: false,
        message: 'Only barangay presidents and treasurers can manage association dues collections'
      });
    }

    req.userRole = user[0].role;
    req.userBarangayId = user[0].barangay_id;

    next();
  } catch (error) {
    console.error('Auth error:', error);
    res.status(500).json({ success: false, message: 'Authentication failed' });
  }
};

// GET monthly dues collection records (president/treasurer only)
router.get('/monthly-dues', verifyDuesCollectorAccess, async (req, res) => {
  try {
    const { start_date, end_date, farmer_id } = req.query;
    const userBarangayId = req.userBarangayId;

    let query = `
      SELECT
        md.*,
        f.full_name as farmer_name,
        f.phone_number,
        b.name as barangay_name,
        fc.full_name as collected_by_name
      FROM monthly_dues md
      LEFT JOIN farmers f ON md.farmer_id = f.id
      LEFT JOIN barangays b ON md.barangay_id = b.id
      LEFT JOIN farmers fc ON md.collected_by = fc.id
      WHERE md.barangay_id = ?
    `;
    const params = [userBarangayId];

    if (farmer_id && farmer_id !== '') {
      query += ' AND md.farmer_id = ?';
      params.push(parseInt(farmer_id));
    }

    if (start_date) {
      query += ' AND md.collection_date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      query += ' AND md.collection_date <= ?';
      params.push(end_date);
    }

    query += ' ORDER BY md.collection_date DESC, md.created_at DESC';

    const [dues] = await pool.execute(query, params);
    res.json({ success: true, dues });
  } catch (error) {
    console.error('Error fetching monthly dues:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch monthly dues records' });
  }
});

// GET members eligible for dues collection (president/treasurer only)
router.get('/monthly-dues/eligible-farmers', verifyDuesCollectorAccess, async (req, res) => {
  try {
    const userBarangayId = req.userBarangayId;
    const currentDate = new Date();

    // Calculate current 6-month period
    const currentMonth = currentDate.getMonth();
    const currentYear = currentDate.getFullYear();
    const periodStartMonth = Math.floor(currentMonth / 6) * 6;
    const periodStart = new Date(currentYear, periodStartMonth, 1);
    const periodEnd = new Date(currentYear, periodStartMonth + 6, 0);

    const query = `
      SELECT
        f.id,
        f.reference_number,
        f.full_name,
        f.role as member_role,
        f.phone_number,
        f.membership_date,
        CASE WHEN md.id IS NOT NULL THEN 1 ELSE 0 END as dues_paid,
        md.collection_date,
        md.period_start,
        md.period_end
      FROM farmers f
      LEFT JOIN monthly_dues md ON f.id = md.farmer_id
        AND md.period_start = ?
        AND md.period_end = ?
      WHERE f.barangay_id = ?
        AND f.role IN ('farmer', 'president', 'treasurer', 'auditor', 'operation_manager', 'business_manager', 'operator')
        AND f.status = 'approved'
        AND COALESCE(f.membership_status, 'member') = 'member'
      ORDER BY f.full_name
    `;

    const [farmers] = await pool.execute(query, [
      periodStart.toISOString().split('T')[0],
      periodEnd.toISOString().split('T')[0],
      userBarangayId
    ]);

    res.json({
      success: true,
      farmers,
      current_period: {
        start: periodStart.toISOString().split('T')[0],
        end: periodEnd.toISOString().split('T')[0]
      }
    });
  } catch (error) {
    console.error('Error fetching eligible farmers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch eligible farmers' });
  }
});

// POST collect monthly dues (president/treasurer only)
router.post('/monthly-dues', verifyDuesCollectorAccess, async (req, res) => {
  try {
    const {
      farmer_id,
      collection_date,
      payment_method,
      remarks,
      user_id
    } = req.body;

    const userBarangayId = req.userBarangayId;
    const userRole = req.userRole;

    if (!farmer_id || !collection_date) {
      return res.status(400).json({
        success: false,
        message: 'Farmer ID and collection date are required'
      });
    }

    // Verify member belongs to the same barangay and is eligible for dues
    const [farmer] = await pool.execute(
      `SELECT barangay_id, full_name, role, membership_status
       FROM farmers
       WHERE id = ?
         AND role IN ('farmer', 'president', 'treasurer', 'auditor', 'operation_manager', 'business_manager', 'operator')
         AND status = ?`,
      [farmer_id, 'approved']
    );

    if (farmer.length === 0 || farmer[0].barangay_id !== userBarangayId) {
      return res.status(403).json({
        success: false,
        message: 'Farmer not found in your barangay or not eligible for dues collection'
      });
    }

    if (String(farmer[0].membership_status || 'member').toLowerCase() !== 'member') {
      return res.status(403).json({
        success: false,
        message: 'Only members can be charged association dues.'
      });
    }

    // Calculate 6-month period for the collection date
    const collectionDate = new Date(collection_date);
    const periodStartMonth = Math.floor(collectionDate.getMonth() / 6) * 6;
    const periodStart = new Date(collectionDate.getFullYear(), periodStartMonth, 1);
    const periodEnd = new Date(collectionDate.getFullYear(), periodStartMonth + 6, 0);

    // Check if dues already collected for this period
    const [existingDues] = await pool.execute(
      'SELECT id FROM monthly_dues WHERE farmer_id = ? AND period_start = ? AND period_end = ?',
      [farmer_id, periodStart.toISOString().split('T')[0], periodEnd.toISOString().split('T')[0]]
    );

    if (existingDues.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Association dues already recorded for this 6-month period'
      });
    }

    // Insert dues record
    const [result] = await pool.execute(
      `INSERT INTO monthly_dues
       (farmer_id, barangay_id, collection_date, amount, collected_by, collector_role, period_start, period_end, payment_method, remarks)
       VALUES (?, ?, ?, 120.00, ?, ?, ?, ?, ?, ?)`,
      [
        farmer_id,
        userBarangayId,
        collection_date,
        user_id,
        userRole,
        periodStart.toISOString().split('T')[0],
        periodEnd.toISOString().split('T')[0],
        payment_method || 'Cash',
        remarks || ''
      ]
    );

    res.json({
      success: true,
      message: 'Association dues recorded successfully',
      dues_id: result.insertId,
      farmer_name: farmer[0].full_name,
      amount: 120.00,
      period: `${periodStart.toISOString().split('T')[0]} to ${periodEnd.toISOString().split('T')[0]}`
    });
  } catch (error) {
    console.error('Error collecting monthly dues:', error);
    res.status(500).json({ success: false, message: 'Failed to collect monthly dues' });
  }
});

// GET monthly dues summary (president/treasurer only)
router.get('/monthly-dues/summary', verifyDuesCollectorAccess, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    const userBarangayId = req.userBarangayId;

    let dateFilter = '';
    const params = [userBarangayId];

    if (start_date && end_date) {
      dateFilter = ' AND md.collection_date BETWEEN ? AND ?';
      params.push(start_date, end_date);
    }

    const query = `
      SELECT
        COUNT(*) as total_collections,
        SUM(amount) as total_amount,
        COUNT(DISTINCT farmer_id) as unique_farmers,
        MAX(collection_date) as last_collection_date
      FROM monthly_dues md
      WHERE md.barangay_id = ? ${dateFilter}
    `;

    const [summary] = await pool.execute(query, params);

    res.json({
      success: true,
      summary: summary[0]
    });
  } catch (error) {
    console.error('Error fetching dues summary:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dues summary' });
  }
});

module.exports = router;
