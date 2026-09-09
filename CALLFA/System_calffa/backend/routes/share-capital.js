const express = require('express');
const router = express.Router();
const pool = require('../db');

const {
  verifyToken,
  authorizeRoles,
  verifyFarmerBarangayAccess
} = require('../middleware/auth');
const { generateReceiptNumber, recordPaymentReceipt } = require('../services/receipt-service');

const SHARE_CONTRIBUTION_AMOUNT = 100;
const ASSISTANCE_PER_SACK_PHP = 50;

/**
 * Mga distribution na may natitirang bayarin (inaasahan − kabuuang nabayad na assistance_sacks).
 */
async function fetchAssistanceOutstandingForFarmer(farmerId) {
  const [rows] = await pool.execute(
    `
    SELECT
      d.id AS distribution_id,
      d.assistance_type,
      d.quantity AS sack_count,
      d.status AS distribution_status,
      d.received_date,
      d.distribution_date,
      (COALESCE(d.quantity, 0) * ?) AS expected_pesos,
      COALESCE(SUM(CASE
        WHEN c.status = 'confirmed' AND c.contribution_kind = 'assistance_sacks' THEN c.amount
        ELSE 0
      END), 0) AS paid_pesos
    FROM income_assistance_distributions d
    LEFT JOIN share_capital_contributions c ON c.source_distribution_id = d.id
    WHERE d.farmer_id = ?
      AND d.status IN ('Distributed', 'Confirmed Received')
      AND d.assistance_type IN ('fertilizer', 'seeds', 'both')
    GROUP BY d.id, d.assistance_type, d.quantity, d.status, d.received_date, d.distribution_date
    HAVING (COALESCE(d.quantity, 0) * ?) - COALESCE(SUM(CASE
      WHEN c.status = 'confirmed' AND c.contribution_kind = 'assistance_sacks' THEN c.amount
      ELSE 0
    END), 0) > 0.009
    ORDER BY d.id DESC
    `,
    [ASSISTANCE_PER_SACK_PHP, farmerId, ASSISTANCE_PER_SACK_PHP]
  );
  return rows.map((r) => {
    const expected = Math.round(parseFloat(r.expected_pesos || 0) * 100) / 100;
    const paid = Math.round(parseFloat(r.paid_pesos || 0) * 100) / 100;
    return {
      ...r,
      expected_pesos: expected,
      paid_pesos: paid,
      remaining_pesos: Math.round((expected - paid) * 100) / 100,
    };
  });
}

const requireBarangayForOfficer = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'admin') return next();
  if (role === 'treasurer' || role === 'president' || role === 'agriculturist') {
    if (!req.user?.barangay_id) {
      return res.status(403).json({
        success: false,
        message: 'Barangay assignment is required for officers.'
      });
    }
  }
  next();
};

const getTargetBarangayId = (req) => {
  if (req.user?.role === 'admin') {
    const q = req.query.barangay_id;
    return q ? parseInt(q) : null;
  }
  return req.user?.barangay_id ? parseInt(req.user.barangay_id) : null;
};

// GET /api/share-capital/overview
// Treasurer/President: list members in their barangay + totals
router.get(
  '/overview',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'treasurer', 'president']),
  async (req, res) => {
    try {
      const barangayId = getTargetBarangayId(req);
      if (!barangayId) {
        return res.status(400).json({ success: false, message: 'barangay_id is required' });
      }

      const [rows] = await pool.execute(
        `
        SELECT
          f.id,
          f.full_name,
          f.reference_number,
          f.status,
          f.barangay_id,
          COALESCE(SUM(CASE
            WHEN c.status = 'confirmed' AND COALESCE(c.contribution_kind, 'membership') = 'membership'
            THEN c.amount ELSE 0
          END), 0) AS share_capital_collected
        FROM farmers f
        LEFT JOIN share_capital_contributions c
          ON c.farmer_id = f.id AND c.barangay_id = f.barangay_id
        WHERE f.role IN ('farmer', 'president', 'treasurer', 'auditor', 'operation_manager', 'business_manager', 'operator')
          AND f.barangay_id = ?
          AND COALESCE(f.membership_status, 'member') = 'member'
          AND (f.status IN ('approved', 'inactive') OR f.status IS NULL)
        GROUP BY f.id, f.full_name, f.reference_number, f.status, f.barangay_id
        ORDER BY f.full_name ASC
        `,
        [barangayId]
      );

      const farmersWithBalance = rows.map((r) => ({
        ...r,
        share_capital_collected: parseFloat(r.share_capital_collected || 0),
      }));

      const [[savingsTotals]] = await pool.execute(
        `
        SELECT
          COALESCE(SUM(CASE WHEN c.status = 'confirmed' THEN c.amount ELSE 0 END), 0) AS total_collected,
          COALESCE(SUM(CASE
            WHEN c.status = 'confirmed' AND COALESCE(c.contribution_kind, 'membership') = 'membership'
            THEN c.amount ELSE 0
          END), 0) AS total_share_capital_collected
        FROM share_capital_contributions c
        INNER JOIN farmers f ON f.id = c.farmer_id AND f.barangay_id = c.barangay_id
        WHERE c.barangay_id = ?
          AND COALESCE(f.membership_status, 'member') = 'member'
        `,
        [barangayId]
      );

      const [[withdrawTotals]] = await pool.execute(
        `
        SELECT COALESCE(SUM(w.amount), 0) AS total_withdrawn
        FROM share_capital_withdrawals w
        INNER JOIN farmers f ON f.id = w.farmer_id AND f.barangay_id = w.barangay_id
        WHERE w.barangay_id = ?
          AND COALESCE(f.membership_status, 'member') = 'member'
        `,
        [barangayId]
      );

      const totalCollected = parseFloat(savingsTotals?.total_collected || 0);
      const totalShareCapitalCollected = parseFloat(
        savingsTotals?.total_share_capital_collected || 0
      );
      const totalWithdrawn = parseFloat(withdrawTotals?.total_withdrawn || 0);
      const totalBalance = Math.round((totalCollected - totalWithdrawn) * 100) / 100;

      const totals = farmersWithBalance.reduce(
        (acc, r) => {
          acc.total_farmers += 1;
          return acc;
        },
        { total_farmers: 0 }
      );

      Object.assign(totals, {
        total_share_capital_collected: totalShareCapitalCollected,
        total_collected: totalCollected,
        total_withdrawn: totalWithdrawn,
        total_balance: totalBalance,
      });

      res.json({
        success: true,
        barangay_id: barangayId,
        rules: {
          amount_per_6_months: SHARE_CONTRIBUTION_AMOUNT,
          contributions_per_year: 2,
          amount_per_year: SHARE_CONTRIBUTION_AMOUNT * 2,
          assistance_seed_fertilizer_plan_per_sack: ASSISTANCE_PER_SACK_PHP,
          assistance_plan_note_ph:
            'Kapag naipamahagi na ang binhi/pataba (Distributed), ang Treasurer/President ay puwedeng magtala ng bayad (puwedeng bahagya) sa Seed & Fertilizer Plan; bawat bayad ay may petsa at halaga sa Share Capital ng magsasaka.',
        },
        totals,
        farmers: farmersWithBalance
      });
    } catch (error) {
      console.error('Error fetching share capital overview:', error.message, error.code);
      if (error.code === 'ER_NO_REFERENCED_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Share capital tables not found. Run the migration: backend/migrations/create_share_capital_module.sql',
          error: error.message
        });
      }
      res.status(500).json({ success: false, message: 'Failed to fetch share capital overview', error: error.message });
    }
  }
);

// GET /api/share-capital/farmer/:farmerId
// Admin / Treasurer / President / Agriculturist: view a farmer's share capital history within barangay
router.get(
  '/farmer/:farmerId',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'treasurer', 'president', 'agriculturist']),
  verifyFarmerBarangayAccess('farmerId'),
  async (req, res) => {
    try {
      const { farmerId } = req.params;

      const [farmers] = await pool.execute(
        `SELECT id, full_name, reference_number, status, barangay_id, role, membership_status
         FROM farmers
         WHERE id = ?`,
        [farmerId]
      );
      if (farmers.length === 0) {
        return res.status(404).json({ success: false, message: 'Farmer not found' });
      }
      if (String(farmers[0].membership_status || 'member').toLowerCase() !== 'member') {
        return res.status(403).json({ success: false, message: 'Only members can participate in share capital.' });
      }

      const [contributions] = await pool.execute(
        `
        SELECT c.id, c.contribution_date, c.amount, c.status,
               c.contribution_kind, c.sack_count, c.per_sack_amount, c.source_distribution_id,
               c.created_by, c.updated_by, c.created_at, c.updated_at,
               pr.receipt_number
        FROM share_capital_contributions c
        LEFT JOIN payment_receipts pr
          ON pr.module = 'share_capital'
          AND pr.reference_type = 'share_capital_contribution'
          AND pr.reference_id = c.id
        WHERE c.farmer_id = ?
        ORDER BY c.contribution_date DESC, c.id DESC
        `,
        [farmerId]
      );

      const [withdrawals] = await pool.execute(
        `
        SELECT w.id, w.withdrawal_date, w.amount, w.processed_by, w.remarks, w.created_at,
               pr.receipt_number
        FROM share_capital_withdrawals w
        LEFT JOIN payment_receipts pr
          ON pr.module = 'share_capital_withdrawal'
          AND pr.reference_type = 'share_capital_withdrawal'
          AND pr.reference_id = w.id
        WHERE w.farmer_id = ?
        ORDER BY w.withdrawal_date DESC, w.id DESC
        `,
        [farmerId]
      );

      const confirmed = contributions.filter((c) => c.status === 'confirmed');
      const totals = {
        share_capital_collected: confirmed
          .filter((c) => String(c.contribution_kind || 'membership') === 'membership')
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
        seed_fertilizer_paid: confirmed
          .filter((c) => String(c.contribution_kind) === 'assistance_sacks')
          .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
        total_withdrawn: withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0),
      };
      totals.total_savings =
        totals.share_capital_collected + totals.seed_fertilizer_paid;
      totals.withdrawable_balance = totals.total_savings - totals.total_withdrawn;

      const assistance_outstanding = await fetchAssistanceOutstandingForFarmer(parseInt(String(farmerId), 10));

      res.json({
        success: true,
        farmer: farmers[0],
        totals,
        contributions,
        withdrawals,
        assistance_outstanding,
        pending_seed_fertilizer_obligations: assistance_outstanding,
      });
    } catch (error) {
      console.error('Error fetching share capital farmer details:', error.message, error.code);
      if (error.code === 'ER_NO_REFERENCED_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Share capital tables not found. Run migration: backend/migrations/create_share_capital_module.sql',
          error: error.message
        });
      }
      res.status(500).json({ success: false, message: 'Failed to fetch share capital farmer details', error: error.message });
    }
  }
);

// GET /api/share-capital/me
// Member: view own share capital totals + history
router.get('/me', verifyToken, async (req, res) => {
  try {
    const farmerId = req.user?.id;
    if (!farmerId) {
      return res.status(401).json({ success: false, message: 'Unauthorized' });
    }

    // Members and officers viewing their own payment ledger
    const ledgerRoles = [
      'farmer',
      'operation_manager',
      'business_manager',
      'operator',
      'president',
      'treasurer',
      'auditor'
    ];
    if (!ledgerRoles.includes(req.user?.role)) {
      return res.status(403).json({ success: false, message: 'Member access required' });
    }

    const [contributions] = await pool.execute(
      `
      SELECT c.id, c.contribution_date, c.amount, c.status,
             c.contribution_kind, c.sack_count, c.per_sack_amount, c.source_distribution_id,
             c.created_at, c.updated_at,
             pr.receipt_number
      FROM share_capital_contributions c
      LEFT JOIN payment_receipts pr
        ON pr.module = 'share_capital'
        AND pr.reference_type = 'share_capital_contribution'
        AND pr.reference_id = c.id
      WHERE c.farmer_id = ?
      ORDER BY c.contribution_date DESC, c.id DESC
      `,
      [farmerId]
    );

    const [withdrawals] = await pool.execute(
      `
      SELECT w.id, w.withdrawal_date, w.amount, w.remarks, w.created_at,
             pr.receipt_number
      FROM share_capital_withdrawals w
      LEFT JOIN payment_receipts pr
        ON pr.module = 'share_capital_withdrawal'
        AND pr.reference_type = 'share_capital_withdrawal'
        AND pr.reference_id = w.id
      WHERE w.farmer_id = ?
      ORDER BY w.withdrawal_date DESC, w.id DESC
      `,
      [farmerId]
    );

    const confirmedContributions = contributions.filter((c) => c.status === 'confirmed');
    const totals = {
      total_contributed: confirmedContributions
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
      total_withdrawn: withdrawals.reduce((sum, w) => sum + parseFloat(w.amount || 0), 0),
      share_capital_collected: confirmedContributions
        .filter((c) => String(c.contribution_kind || 'membership') === 'membership')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
      seed_fertilizer_paid: confirmedContributions
        .filter((c) => String(c.contribution_kind) === 'assistance_sacks')
        .reduce((sum, c) => sum + parseFloat(c.amount || 0), 0),
    };
    totals.total_savings = totals.share_capital_collected + totals.seed_fertilizer_paid;
    totals.withdrawable_balance = totals.total_savings - totals.total_withdrawn;
    totals.balance = totals.withdrawable_balance;

    let associationDues = [];
    let associationDuesTotal = 0;
    try {
      const [duesRows] = await pool.execute(
        `
        SELECT
          md.id,
          md.collection_date,
          md.amount,
          md.period_start,
          md.period_end,
          md.payment_method,
          md.remarks,
          md.collector_role,
          pr.receipt_number
        FROM monthly_dues md
        LEFT JOIN payment_receipts pr
          ON pr.module = 'association_dues'
          AND pr.reference_type = 'monthly_dues'
          AND pr.reference_id = md.id
        WHERE md.farmer_id = ?
        ORDER BY md.collection_date DESC, md.id DESC
        `,
        [farmerId]
      );
      associationDues = duesRows || [];
      associationDuesTotal = associationDues.reduce(
        (sum, row) => sum + parseFloat(row.amount || 0),
        0
      );
    } catch (duesErr) {
      console.warn('Could not load association dues for ledger:', duesErr.message);
    }

    const assistance_outstanding = await fetchAssistanceOutstandingForFarmer(parseInt(String(farmerId), 10));

    res.json({
      success: true,
      rules: {
        amount_per_6_months: SHARE_CONTRIBUTION_AMOUNT,
        contributions_per_year: 2,
        amount_per_year: SHARE_CONTRIBUTION_AMOUNT * 2,
        assistance_seed_fertilizer_plan_per_sack: ASSISTANCE_PER_SACK_PHP,
        assistance_plan_note_ph:
          'Ang binhi/pataba (kapag naipamahagi na) ay may kabuuang ₱50 kada sako. Maaaring bayaran nang paunti-unti; makikita ang bawat bayad (petsa at halaga) sa talaan ng iyong mga bayad.',
      },
      totals,
      contributions,
      withdrawals,
      association_dues: associationDues,
      association_dues_total: associationDuesTotal,
      assistance_outstanding,
      pending_seed_fertilizer_obligations: assistance_outstanding,
    });
  } catch (error) {
    console.error('Error fetching share capital for current farmer:', error.message, error.code);
    if (error.code === 'ER_NO_REFERENCED_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
      return res.status(500).json({
        success: false,
        message: 'Share capital tables not found. Run migration: backend/migrations/create_share_capital_module.sql',
        error: error.message
      });
    }
    res.status(500).json({ success: false, message: 'Failed to fetch share capital data', error: error.message });
  }
});

// POST /api/share-capital/contributions
// Treasurer/President: record a ₱100 six-month share contribution for a member in their barangay
router.post(
  '/contributions',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'treasurer', 'president']),
  verifyFarmerBarangayAccess('farmerId'),
  async (req, res) => {
    try {
      const { farmer_id, contribution_date, amount, payment_method } = req.body;

      if (!farmer_id || !contribution_date) {
        return res.status(400).json({ success: false, message: 'Missing required fields: farmer_id, contribution_date' });
      }

      const amt = amount === undefined || amount === null ? SHARE_CONTRIBUTION_AMOUNT : parseFloat(amount);
      if (Number.isNaN(amt) || amt !== SHARE_CONTRIBUTION_AMOUNT) {
        return res.status(400).json({
          success: false,
          message: `Share contribution amount is fixed at ₱${SHARE_CONTRIBUTION_AMOUNT}.`
        });
      }

      const barangayId = req.farmerBarangayId;

      // Do not allow contributions for inactive/exited or non-member records
      const [[farmerRow]] = await pool.execute(
        'SELECT status, role, membership_status FROM farmers WHERE id = ?',
        [farmer_id]
      );
      const allowedRoles = ['farmer', 'president', 'treasurer', 'auditor', 'operation_manager', 'business_manager', 'operator'];
      if (!farmerRow || !allowedRoles.includes(String(farmerRow.role || '').toLowerCase())) {
        return res.status(400).json({ success: false, message: 'Selected record is not an eligible member.' });
      }
      if (String(farmerRow.membership_status || 'member').toLowerCase() !== 'member') {
        return res.status(400).json({ success: false, message: 'Only members can receive share capital contributions.' });
      }
      if (farmerRow?.status && String(farmerRow.status).toLowerCase() === 'inactive') {
        return res.status(400).json({ success: false, message: 'Farmer is inactive/exited. Cannot record new contributions.' });
      }

      // Enforce one contribution per 6-month period
      const dt = new Date(contribution_date);
      if (Number.isNaN(dt.getTime())) {
        return res.status(400).json({ success: false, message: 'Invalid contribution_date' });
      }
      const year = dt.getFullYear();
      const month = dt.getMonth() + 1; // 1-12
      const isFirstHalf = month <= 6;
      const periodStart = `${year}-${isFirstHalf ? '01' : '07'}-01`;
      const periodEnd = `${year}-${isFirstHalf ? '06' : '12'}-${isFirstHalf ? '30' : '31'}`;

      const [[existing]] = await pool.execute(
        `
        SELECT COUNT(*) AS cnt
        FROM share_capital_contributions
        WHERE farmer_id = ?
          AND barangay_id = ?
          AND status = 'confirmed'
          AND contribution_kind = 'membership'
          AND contribution_date >= ? AND contribution_date <= ?
        `,
        [farmer_id, barangayId, periodStart, periodEnd]
      );
      if ((existing?.cnt || 0) > 0) {
        return res.status(400).json({
          success: false,
          message: 'A share capital contribution already exists for this 6-month period.'
        });
      }

      const [result] = await pool.execute(
        `
        INSERT INTO share_capital_contributions
          (farmer_id, barangay_id, contribution_date, amount, status, contribution_kind, created_by)
        VALUES
          (?, ?, ?, ?, 'confirmed', 'membership', ?)
        `,
        [farmer_id, barangayId, contribution_date, amt, req.user?.id || null]
      );

      const [[farmerInfo]] = await pool.execute(
        'SELECT full_name FROM farmers WHERE id = ?',
        [farmer_id]
      );
      const receiptNum = await generateReceiptNumber(pool);
      const normalizedMethod = ['gcash', 'g-cash'].includes(String(payment_method || '').toLowerCase())
        ? 'GCash'
        : 'Cash';

      await recordPaymentReceipt(pool, {
        receiptNumber: receiptNum,
        module: 'share_capital',
        referenceId: result.insertId,
        referenceType: 'share_capital_contribution',
        clientName: farmerInfo?.full_name,
        amountPaid: amt,
        remainingBalance: 0,
        paymentMethod: normalizedMethod,
        paymentDate: contribution_date,
        collectedBy: req.user?.id || null,
        barangayId: barangayId,
        remarks: `6-month share capital contribution (${periodStart} to ${periodEnd})`
      });

      res.json({
        success: true,
        id: result.insertId,
        receipt_number: receiptNum,
        message: 'Share contribution recorded successfully'
      });
    } catch (error) {
      console.error('Error recording share capital contribution:', error.message, error.code);
      if (error.code === 'ER_NO_REFERENCED_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Share capital tables not found. Run migration: backend/migrations/create_share_capital_module.sql',
          error: error.message
        });
      }
      res.status(500).json({ success: false, message: 'Failed to record share contribution', error: error.message });
    }
  }
);

// PUT /api/share-capital/contributions/:id
// Treasurer/President: edit/update contribution record (membership: date/status; assistance: mainly status)
router.put(
  '/contributions/:id',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'treasurer', 'president']),
  async (req, res) => {
    try {
      const { id } = req.params;
      const { contribution_date, amount, status } = req.body;

      const [rows] = await pool.execute(
        'SELECT id, farmer_id, barangay_id, contribution_kind, amount AS current_amount FROM share_capital_contributions WHERE id = ?',
        [id]
      );
      if (rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Contribution record not found' });
      }

      const record = rows[0];
      const kind = String(record.contribution_kind || 'membership');
      if (req.user?.role !== 'admin' && parseInt(req.user?.barangay_id) !== parseInt(record.barangay_id)) {
        return res.status(403).json({ success: false, message: 'You can only edit records in your barangay.' });
      }

      const updates = [];
      const params = [];

      if (contribution_date) {
        const dt = new Date(contribution_date);
        if (Number.isNaN(dt.getTime())) {
          return res.status(400).json({ success: false, message: 'Invalid contribution_date' });
        }

        if (kind === 'membership') {
          // Enforce one membership contribution per 6-month period (excluding this record)
          const year = dt.getFullYear();
          const month = dt.getMonth() + 1;
          const isFirstHalf = month <= 6;
          const periodStart = `${year}-${isFirstHalf ? '01' : '07'}-01`;
          const periodEnd = `${year}-${isFirstHalf ? '06' : '12'}-${isFirstHalf ? '30' : '31'}`;

          const [[existing]] = await pool.execute(
            `
            SELECT COUNT(*) AS cnt
            FROM share_capital_contributions
            WHERE farmer_id = ?
              AND barangay_id = ?
              AND status = 'confirmed'
              AND contribution_kind = 'membership'
              AND contribution_date >= ? AND contribution_date <= ?
              AND id <> ?
            `,
            [record.farmer_id, record.barangay_id, periodStart, periodEnd, id]
          );
          if ((existing?.cnt || 0) > 0) {
            return res.status(400).json({
              success: false,
              message: 'A share capital contribution already exists for this 6-month period.'
            });
          }
        }

        updates.push('contribution_date = ?');
        params.push(contribution_date);
      }

      if (amount !== undefined) {
        if (kind === 'assistance_sacks') {
          return res.status(400).json({
            success: false,
            message:
              'Ang halaga ng binhi/pataba (sako × ₱50) ay hindi maaaring baguhin dito; ito ay mula sa assistance distribution.',
          });
        }
        const amt = parseFloat(amount);
        if (Number.isNaN(amt) || amt !== SHARE_CONTRIBUTION_AMOUNT) {
          return res.status(400).json({
            success: false,
            message: `Share contribution amount is fixed at ₱${SHARE_CONTRIBUTION_AMOUNT}.`
          });
        }
        updates.push('amount = ?');
        params.push(amt);
      }

      if (status) {
        if (!['confirmed', 'cancelled'].includes(status)) {
          return res.status(400).json({ success: false, message: 'Invalid status' });
        }
        updates.push('status = ?');
        params.push(status);
      }

      if (updates.length === 0) {
        return res.status(400).json({ success: false, message: 'No fields to update' });
      }

      updates.push('updated_by = ?');
      params.push(req.user?.id || null);

      params.push(id);

      await pool.execute(
        `UPDATE share_capital_contributions SET ${updates.join(', ')} WHERE id = ?`,
        params
      );

      res.json({ success: true, message: 'Share contribution updated successfully' });
    } catch (error) {
      console.error('Error updating share capital contribution:', error.message, error.code);
      if (error.code === 'ER_NO_REFERENCED_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Share capital tables not found. Run migration: backend/migrations/create_share_capital_module.sql',
          error: error.message
        });
      }
      res.status(500).json({ success: false, message: 'Failed to update share contribution', error: error.message });
    }
  }
);

// GET /api/share-capital/withdrawals-overview
// Treasurer/Admin: members with share-capital and/or seed-fertilizer savings (barangay-scoped)
router.get(
  '/withdrawals-overview',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'treasurer']),
  async (req, res) => {
    try {
      const barangayId = getTargetBarangayId(req);
      if (!barangayId) {
        return res.status(400).json({ success: false, message: 'barangay_id is required' });
      }

      const [rows] = await pool.execute(
        `
        SELECT
          f.id,
          f.full_name,
          f.reference_number,
          f.status,
          f.barangay_id,
          COALESCE(SUM(CASE
            WHEN c.status = 'confirmed' AND COALESCE(c.contribution_kind, 'membership') = 'membership'
            THEN c.amount ELSE 0
          END), 0) AS share_capital_collected,
          COALESCE(SUM(CASE
            WHEN c.status = 'confirmed' AND c.contribution_kind = 'assistance_sacks'
            THEN c.amount ELSE 0
          END), 0) AS seed_fertilizer_paid,
          COALESCE(w.total_withdrawn, 0) AS total_withdrawn
        FROM farmers f
        INNER JOIN share_capital_contributions c
          ON c.farmer_id = f.id AND c.barangay_id = f.barangay_id AND c.status = 'confirmed'
        LEFT JOIN (
          SELECT farmer_id, SUM(amount) AS total_withdrawn
          FROM share_capital_withdrawals
          GROUP BY farmer_id
        ) w ON w.farmer_id = f.id
        WHERE f.role IN ('farmer', 'president', 'treasurer', 'auditor', 'operation_manager', 'business_manager', 'operator')
          AND f.barangay_id = ?
          AND COALESCE(f.membership_status, 'member') = 'member'
          AND (f.status IN ('approved', 'inactive') OR f.status IS NULL)
        GROUP BY f.id, f.full_name, f.reference_number, f.status, f.barangay_id, w.total_withdrawn
        HAVING (share_capital_collected + seed_fertilizer_paid) > 0.009
        ORDER BY f.full_name ASC
        `,
        [barangayId]
      );

      const members = rows.map((r) => {
        const shareCapital = parseFloat(r.share_capital_collected || 0);
        const seedFertilizer = parseFloat(r.seed_fertilizer_paid || 0);
        const withdrawn = parseFloat(r.total_withdrawn || 0);
        const totalSavings = shareCapital + seedFertilizer;
        return {
          ...r,
          share_capital_collected: shareCapital,
          seed_fertilizer_paid: seedFertilizer,
          total_withdrawn: withdrawn,
          total_savings: totalSavings,
          withdrawable_balance: Math.round((totalSavings - withdrawn) * 100) / 100,
        };
      });

      const totals = members.reduce(
        (acc, m) => {
          acc.total_members += 1;
          acc.total_share_capital += m.share_capital_collected;
          acc.total_seed_fertilizer += m.seed_fertilizer_paid;
          acc.total_withdrawn += m.total_withdrawn;
          acc.total_withdrawable += Math.max(0, m.withdrawable_balance);
          return acc;
        },
        {
          total_members: 0,
          total_share_capital: 0,
          total_seed_fertilizer: 0,
          total_withdrawn: 0,
          total_withdrawable: 0,
        }
      );

      res.json({
        success: true,
        barangay_id: barangayId,
        totals,
        members,
      });
    } catch (error) {
      console.error('Error fetching withdrawals overview:', error.message, error.code);
      if (error.code === 'ER_NO_REFERENCED_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Share capital tables not found. Run migration: backend/migrations/create_share_capital_module.sql',
          error: error.message,
        });
      }
      res.status(500).json({
        success: false,
        message: 'Failed to fetch withdrawals overview',
        error: error.message,
      });
    }
  }
);

// POST /api/share-capital/withdrawals
// Treasurer: process withdrawal (member stays active)
router.post(
  '/withdrawals',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'treasurer']),
  verifyFarmerBarangayAccess('farmerId'),
  async (req, res) => {
    try {
      const { farmer_id, withdrawal_date, remarks, amount } = req.body;
      if (!farmer_id || !withdrawal_date) {
        return res.status(400).json({ success: false, message: 'Missing required fields: farmer_id, withdrawal_date' });
      }

      if (amount === undefined || amount === null || amount === '') {
        return res.status(400).json({ success: false, message: 'Withdrawal amount is required.' });
      }

      const barangayId = req.farmerBarangayId;

      const [[contribTotals]] = await pool.execute(
        `
        SELECT COALESCE(SUM(CASE WHEN status = 'confirmed' THEN amount ELSE 0 END), 0) AS total_contributed
        FROM share_capital_contributions
        WHERE farmer_id = ?
        `,
        [farmer_id]
      );

      const [[withdrawTotals]] = await pool.execute(
        `
        SELECT COALESCE(SUM(amount), 0) AS total_withdrawn
        FROM share_capital_withdrawals
        WHERE farmer_id = ?
        `,
        [farmer_id]
      );

      const totalContributed = parseFloat(contribTotals?.total_contributed || 0);
      const totalWithdrawn = parseFloat(withdrawTotals?.total_withdrawn || 0);
      const balance = Math.round((totalContributed - totalWithdrawn) * 100) / 100;

      if (balance <= 0) {
        return res.status(400).json({ success: false, message: 'No share capital balance available for withdrawal.' });
      }

      let withdrawAmount = parseFloat(amount);
      if (Number.isNaN(withdrawAmount) || withdrawAmount <= 0) {
        return res.status(400).json({ success: false, message: 'Invalid withdrawal amount.' });
      }
      withdrawAmount = Math.round(withdrawAmount * 100) / 100;
      if (withdrawAmount > balance + 0.009) {
        return res.status(400).json({
          success: false,
          message: `Amount exceeds available balance (₱${balance.toLocaleString()}).`,
        });
      }

      const conn = await pool.getConnection();
      try {
        await conn.beginTransaction();

        const [result] = await conn.execute(
          `
          INSERT INTO share_capital_withdrawals
            (farmer_id, barangay_id, withdrawal_date, amount, processed_by, remarks)
          VALUES
            (?, ?, ?, ?, ?, ?)
          `,
          [farmer_id, barangayId, withdrawal_date, withdrawAmount, req.user?.id || null, remarks || null]
        );

        const withdrawalId = result.insertId;
        const remainingAfter = Math.round((balance - withdrawAmount) * 100) / 100;

        const [farmerRows] = await conn.execute(
          'SELECT full_name FROM farmers WHERE id = ?',
          [farmer_id]
        );
        const farmerName = farmerRows[0]?.full_name || 'Member';

        const receiptNum = await generateReceiptNumber(pool);
        await recordPaymentReceipt(pool, {
          receiptNumber: receiptNum,
          module: 'share_capital_withdrawal',
          referenceId: withdrawalId,
          referenceType: 'share_capital_withdrawal',
          clientName: farmerName,
          amountPaid: withdrawAmount,
          remainingBalance: remainingAfter,
          paymentMethod: 'Cash',
          paymentDate: withdrawal_date,
          collectedBy: req.user?.id || null,
          barangayId,
          remarks:
            remarks ||
            'Withdrawal from share capital and seed/fertilizer savings (member remains active)',
        });

        await conn.commit();

        res.json({
          success: true,
          message: 'Withdrawal processed successfully. Member remains active.',
          withdrawal_amount: withdrawAmount,
          receipt_number: receiptNum,
        });
      } catch (txErr) {
        await conn.rollback();
        throw txErr;
      } finally {
        conn.release();
      }
    } catch (error) {
      console.error('Error processing share capital withdrawal:', error.message, error.code);
      if (error.code === 'ER_NO_REFERENCED_TABLE' || error.code === 'ER_BAD_TABLE_ERROR') {
        return res.status(500).json({
          success: false,
          message: 'Share capital tables not found. Run migration: backend/migrations/create_share_capital_module.sql',
          error: error.message
        });
      }
      res.status(500).json({ success: false, message: 'Failed to process withdrawal', error: error.message });
    }
  }
);

module.exports = router;
