const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { getScopedBarangayId } = require('../utils/requestUser');
const { REFUNDED_BOOKING_NOT_EXISTS_SQL } = require('../services/refund-service');

const requireBarangayForOfficer = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'admin') return next();
  if (role === 'treasurer' || role === 'president') {
    if (!req.user?.barangay_id) {
      return res.status(403).json({
        success: false,
        message: 'Barangay assignment is required for officers.'
      });
    }
  }
  next();
};

function buildBarangayClause(column, barangayId, params) {
  if (!barangayId) return '';
  params.push(barangayId);
  return ` AND ${column} = ?`;
}

function normalizeDate(value) {
  if (!value) return null;
  const str = String(value).slice(0, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(str) ? str : null;
}

function normalizeRowDate(value) {
  if (!value) return null;
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  return String(value).slice(0, 10);
}

async function runQuery(label, query, params) {
  try {
    const [rows] = await pool.execute(query, params);
    return rows;
  } catch (error) {
    console.error(`financial-overview ${label} query failed:`, error.message);
    return [];
  }
}

function mapRow(row) {
  return {
    id: row.id,
    date: normalizeRowDate(row.date),
    module: row.module,
    category: row.category,
    type: row.type,
    description: row.description,
    amount: parseFloat(row.amount || 0),
    farmer_name: row.farmer_name || null,
    barangay_id: row.barangay_id != null ? parseInt(row.barangay_id, 10) : null,
    barangay_name: row.barangay_name || null,
    receipt_number: row.receipt_number || null,
    reference: row.reference || null,
    source_route: row.source_route || null
  };
}

// GET /api/financial-overview/transactions
router.get(
  '/transactions',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'president', 'treasurer']),
  async (req, res) => {
    try {
      const barangayId = getScopedBarangayId(req.user, req.query.barangay_id);
      if (req.user.role !== 'admin' && !barangayId) {
        return res.status(403).json({
          success: false,
          message: 'Your account is not assigned to a barangay.'
        });
      }

      const startDate = normalizeDate(req.query.start_date);
      const endDate = normalizeDate(req.query.end_date);
      const moduleFilter = String(req.query.module || '').trim();

      const dateClause = (column, params) => {
        let clause = '';
        if (startDate) {
          clause += ` AND DATE(${column}) >= ?`;
          params.push(startDate);
        }
        if (endDate) {
          clause += ` AND DATE(${column}) <= ?`;
          params.push(endDate);
        }
        return clause;
      };

      const allRows = [];
      const shouldLoad = (module) => !moduleFilter || moduleFilter === module;

      if (shouldLoad('Loans')) {
        const params = [];
        let query = `
          SELECT
            CONCAT('LOAN-', lp.id) AS id,
            lp.payment_date AS date,
            'Loans' AS module,
            'Collection' AS category,
            CONCAT('Loan payment — ', COALESCE(l.loan_type, 'Loan')) AS type,
            CONCAT('Payment for loan #', lp.loan_id, ' (', COALESCE(f.full_name, 'Member'), ')') AS description,
            lp.amount AS amount,
            f.full_name AS farmer_name,
            f.barangay_id AS barangay_id,
            b.name AS barangay_name,
            COALESCE(pr.receipt_number, lp.reference_number) AS receipt_number,
            CONCAT('Loan #', lp.loan_id) AS reference,
            '/admin-loans' AS source_route
          FROM loan_payments lp
          INNER JOIN loans l ON lp.loan_id = l.id
          INNER JOIN farmers f ON l.farmer_id = f.id
          LEFT JOIN barangays b ON f.barangay_id = b.id
          LEFT JOIN payment_receipts pr
            ON pr.module = 'admin_loan'
            AND pr.reference_type = 'loan'
            AND pr.reference_id = l.id
            AND DATE(pr.payment_date) = DATE(lp.payment_date)
            AND pr.amount_paid = lp.amount
          WHERE 1=1
        `;
        query += buildBarangayClause('f.barangay_id', barangayId, params);
        query += dateClause('lp.payment_date', params);
        query += ' ORDER BY lp.payment_date DESC, lp.id DESC';
        allRows.push(...(await runQuery('loans', query, params)));
      }

      if (shouldLoad('Machinery')) {
        const expenseParams = [];
        let expenseQuery = `
          SELECT
            CONCAT('MEXP-', me.id) AS id,
            me.date_of_expense AS date,
            'Machinery' AS module,
            'Expense' AS category,
            'Machinery Expense' AS type,
            CONCAT(COALESCE(mi.machinery_name, 'Machinery'), ' — ', COALESCE(me.particulars, 'Expense')) AS description,
            me.total_amount AS amount,
            NULL AS farmer_name,
            mi.barangay_id AS barangay_id,
            b.name AS barangay_name,
            me.reference_number AS receipt_number,
            me.reference_number AS reference,
            '/machinery-financial' AS source_route
          FROM machinery_expenses me
          LEFT JOIN machinery_inventory mi ON me.machinery_id = mi.id
          LEFT JOIN barangays b ON mi.barangay_id = b.id
          WHERE me.expense_status = 'Recorded'
        `;
        expenseQuery += buildBarangayClause('mi.barangay_id', barangayId, expenseParams);
        expenseQuery += dateClause('me.date_of_expense', expenseParams);
        allRows.push(...(await runQuery('machinery-expenses', expenseQuery, expenseParams)));

        const incomeParams = [];
        let incomeQuery = `
          SELECT * FROM (
            SELECT
              CONCAT('MINC-', minc.id) AS id,
              minc.date_of_income AS date,
              'Machinery' AS module,
              'Income' AS category,
              'Machinery Income' AS type,
              CONCAT(COALESCE(mi.machinery_name, 'Machinery'), ' — Booking #', minc.booking_id) AS description,
              minc.income_amount AS amount,
              f.full_name AS farmer_name,
              mi.barangay_id AS barangay_id,
              b.name AS barangay_name,
              NULL AS receipt_number,
              CONCAT('Booking #', minc.booking_id) AS reference,
              '/machinery-financial' AS source_route
            FROM machinery_income minc
            LEFT JOIN machinery_inventory mi ON minc.machinery_id = mi.id
            LEFT JOIN machinery_bookings mb ON minc.booking_id = mb.id
            LEFT JOIN farmers f ON mb.farmer_id = f.id
            LEFT JOIN barangays b ON mi.barangay_id = b.id
            WHERE mb.id IS NOT NULL
              AND ${REFUNDED_BOOKING_NOT_EXISTS_SQL}

            UNION ALL

            SELECT
              CONCAT('MCOL-', mbp.id) AS id,
              mbp.payment_date AS date,
              'Machinery' AS module,
              'Collection' AS category,
              'Booking Collection' AS type,
              CONCAT('Payment for Booking #', mbp.booking_id, ' — ', COALESCE(f.full_name, 'Client')) AS description,
              mbp.amount AS amount,
              f.full_name AS farmer_name,
              f.barangay_id AS barangay_id,
              b.name AS barangay_name,
              mbp.receipt_number AS receipt_number,
              CONCAT('Booking #', mbp.booking_id) AS reference,
              '/machinery-financial' AS source_route
            FROM machinery_booking_payments mbp
            LEFT JOIN machinery_bookings mb ON mbp.booking_id = mb.id
            LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
            LEFT JOIN farmers f ON mb.farmer_id = f.id
            LEFT JOIN barangays b ON f.barangay_id = b.id
            WHERE COALESCE(mbp.payment_type, '') <> 'refund'
              AND mbp.amount > 0
              AND mb.id IS NOT NULL
              AND ${REFUNDED_BOOKING_NOT_EXISTS_SQL}
          ) machinery_rows
          WHERE 1=1
        `;
        if (barangayId) {
          incomeQuery += ' AND barangay_id = ?';
          incomeParams.push(barangayId);
        }
        if (startDate) {
          incomeQuery += ' AND DATE(date) >= ?';
          incomeParams.push(startDate);
        }
        if (endDate) {
          incomeQuery += ' AND DATE(date) <= ?';
          incomeParams.push(endDate);
        }
        allRows.push(...(await runQuery('machinery-income-collections', incomeQuery, incomeParams)));
      }

      if (shouldLoad('Share Capital')) {
        const contribParams = [];
        let contribQuery = `
          SELECT
            CONCAT('SC-', c.id) AS id,
            c.contribution_date AS date,
            'Share Capital' AS module,
            'Collection' AS category,
            'Share Capital Contribution' AS type,
            CONCAT('Share capital contribution — ', COALESCE(f.full_name, 'Member')) AS description,
            c.amount AS amount,
            f.full_name AS farmer_name,
            c.barangay_id AS barangay_id,
            b.name AS barangay_name,
            pr.receipt_number AS receipt_number,
            CONCAT('Contribution #', c.id) AS reference,
            '/share-capital' AS source_route
          FROM share_capital_contributions c
          INNER JOIN farmers f ON c.farmer_id = f.id
          LEFT JOIN barangays b ON c.barangay_id = b.id
          LEFT JOIN payment_receipts pr
            ON pr.module = 'share_capital'
            AND pr.reference_type = 'share_capital_contribution'
            AND pr.reference_id = c.id
          WHERE c.status = 'confirmed'
            AND IFNULL(c.contribution_kind, '') <> 'assistance_sacks'
        `;
        contribQuery += buildBarangayClause('c.barangay_id', barangayId, contribParams);
        contribQuery += dateClause('c.contribution_date', contribParams);
        allRows.push(...(await runQuery('share-capital-contributions', contribQuery, contribParams)));

        const withdrawParams = [];
        let withdrawQuery = `
          SELECT
            CONCAT('SCW-', w.id) AS id,
            w.withdrawal_date AS date,
            'Share Capital' AS module,
            'Withdrawal' AS category,
            'Share Capital Withdrawal' AS type,
            CONCAT('Share capital withdrawal — ', COALESCE(f.full_name, 'Member')) AS description,
            w.amount AS amount,
            f.full_name AS farmer_name,
            f.barangay_id AS barangay_id,
            b.name AS barangay_name,
            pr.receipt_number AS receipt_number,
            CONCAT('Withdrawal #', w.id) AS reference,
            '/share-capital-withdrawals' AS source_route
          FROM share_capital_withdrawals w
          INNER JOIN farmers f ON w.farmer_id = f.id
          LEFT JOIN barangays b ON f.barangay_id = b.id
          LEFT JOIN payment_receipts pr
            ON pr.module = 'share_capital_withdrawal'
            AND pr.reference_type = 'share_capital_withdrawal'
            AND pr.reference_id = w.id
          WHERE 1=1
        `;
        withdrawQuery += buildBarangayClause('f.barangay_id', barangayId, withdrawParams);
        withdrawQuery += dateClause('w.withdrawal_date', withdrawParams);
        allRows.push(...(await runQuery('share-capital-withdrawals', withdrawQuery, withdrawParams)));
      }

      if (shouldLoad('Seed & Fertilizer')) {
        const seedParams = [];
        let seedQuery = `
          SELECT
            CONCAT('SF-', c.id) AS id,
            c.contribution_date AS date,
            'Seed & Fertilizer' AS module,
            'Collection' AS category,
            'Seed & Fertilizer Payment' AS type,
            CONCAT(
              'Assistance payment (',
              COALESCE(d.assistance_type, 'assistance'),
              ', ',
              COALESCE(d.quantity, 0),
              ' sack(s)) — ',
              COALESCE(f.full_name, 'Member')
            ) AS description,
            c.amount AS amount,
            f.full_name AS farmer_name,
            c.barangay_id AS barangay_id,
            b.name AS barangay_name,
            (
              SELECT pr.receipt_number
              FROM payment_receipts pr
              WHERE pr.module = 'seed_fertilizer'
                AND pr.reference_type = 'income_assistance_distribution'
                AND pr.reference_id = c.source_distribution_id
                AND DATE(pr.payment_date) = DATE(c.contribution_date)
                AND pr.amount_paid = c.amount
              ORDER BY pr.id DESC
              LIMIT 1
            ) AS receipt_number,
            CONCAT('Distribution #', c.source_distribution_id) AS reference,
            '/seed-fertilizer-plan' AS source_route
          FROM share_capital_contributions c
          INNER JOIN farmers f ON c.farmer_id = f.id
          LEFT JOIN barangays b ON c.barangay_id = b.id
          LEFT JOIN income_assistance_distributions d ON d.id = c.source_distribution_id
          WHERE c.status = 'confirmed'
            AND c.contribution_kind = 'assistance_sacks'
        `;
        seedQuery += buildBarangayClause('c.barangay_id', barangayId, seedParams);
        seedQuery += dateClause('c.contribution_date', seedParams);
        allRows.push(...(await runQuery('seed-fertilizer', seedQuery, seedParams)));
      }

      if (shouldLoad('Association Dues')) {
        const duesParams = [];
        let duesQuery = `
          SELECT
            CONCAT('DUES-', md.id) AS id,
            md.collection_date AS date,
            'Association Dues' AS module,
            'Collection' AS category,
            'Association Dues' AS type,
            CONCAT(
              'Association dues (',
              DATE_FORMAT(md.period_start, '%b %e, %Y'),
              ' – ',
              DATE_FORMAT(md.period_end, '%b %e, %Y'),
              ') — ',
              COALESCE(f.full_name, 'Member')
            ) AS description,
            md.amount AS amount,
            f.full_name AS farmer_name,
            md.barangay_id AS barangay_id,
            b.name AS barangay_name,
            pr.receipt_number AS receipt_number,
            CONCAT('Dues #', md.id) AS reference,
            '/association-dues' AS source_route
          FROM monthly_dues md
          LEFT JOIN farmers f ON md.farmer_id = f.id
          LEFT JOIN barangays b ON md.barangay_id = b.id
          LEFT JOIN payment_receipts pr
            ON pr.module = 'association_dues'
            AND pr.reference_type = 'monthly_dues'
            AND pr.reference_id = md.id
          WHERE 1=1
        `;
        duesQuery += buildBarangayClause('md.barangay_id', barangayId, duesParams);
        duesQuery += dateClause('md.collection_date', duesParams);
        allRows.push(...(await runQuery('association-dues', duesQuery, duesParams)));
      }

      const transactions = allRows
        .map(mapRow)
        .sort((a, b) => {
          const dateCmp = String(b.date || '').localeCompare(String(a.date || ''));
          if (dateCmp !== 0) return dateCmp;
          return String(b.id).localeCompare(String(a.id));
        });

      const moduleTotals = {};
      for (const tx of transactions) {
        if (!moduleTotals[tx.module]) {
          moduleTotals[tx.module] = { inflow: 0, outflow: 0, count: 0 };
        }
        moduleTotals[tx.module].count += 1;
        if (tx.category === 'Expense' || tx.category === 'Withdrawal') {
          moduleTotals[tx.module].outflow += tx.amount;
        } else {
          moduleTotals[tx.module].inflow += tx.amount;
        }
      }

      res.json({
        success: true,
        filters: {
          barangay_id: barangayId,
          start_date: startDate,
          end_date: endDate,
          module: moduleFilter || null
        },
        totals: {
          count: transactions.length,
          inflow: transactions
            .filter((t) => t.category !== 'Expense' && t.category !== 'Withdrawal')
            .reduce((sum, t) => sum + t.amount, 0),
          outflow: transactions
            .filter((t) => t.category === 'Expense' || t.category === 'Withdrawal')
            .reduce((sum, t) => sum + t.amount, 0)
        },
        module_totals: moduleTotals,
        transactions
      });
    } catch (error) {
      console.error('Error fetching financial overview transactions:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to fetch consolidated transactions',
        error: error.message
      });
    }
  }
);

module.exports = router;
