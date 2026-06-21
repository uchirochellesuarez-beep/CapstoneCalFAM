const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken, authorizeRoles } = require('../middleware/auth');
const { recordAssistancePaymentForDistribution, ASSISTANCE_PER_SACK_PHP } = require('../services/seedFertilizerPlanService');
const { generateReceiptNumber, recordPaymentReceipt } = require('../services/receipt-service');

const requireBarangayForOfficer = (req, res, next) => {
  const role = req.user?.role;
  if (role === 'admin') return next();
  if (role === 'treasurer' || role === 'president') {
    if (!req.user?.barangay_id) {
      return res.status(403).json({
        success: false,
        message: 'Barangay assignment is required for officers.',
      });
    }
  }
  next();
};

function assertOfficerBarangay(req, barangayId) {
  const bid = parseInt(String(barangayId), 10);
  if (Number.isNaN(bid)) return { ok: false, status: 400, message: 'Invalid barangay id' };
  if (req.user?.role === 'admin') return { ok: true, barangayId: bid };
  const mine = req.user?.barangay_id != null ? parseInt(String(req.user.barangay_id), 10) : null;
  if (mine !== bid) {
    return { ok: false, status: 403, message: 'Access denied for this barangay.' };
  }
  return { ok: true, barangayId: bid };
}

// GET /api/seed-fertilizer-plan/barangay/:barangayId
// Naipamahagi / kinumpirmang distribution + inaasahang halaga, nabayaran na, natitira, at kasaysayan ng bayad
router.get(
  '/barangay/:barangayId',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'president', 'treasurer']),
  async (req, res) => {
    const check = assertOfficerBarangay(req, req.params.barangayId);
    if (!check.ok) {
      return res.status(check.status).json({ success: false, message: check.message });
    }
    try {
      const [rows] = await pool.execute(
        `
        SELECT
          d.id AS distribution_id,
          d.farmer_id,
          d.barangay_id,
          d.assistance_type,
          d.quantity AS sack_count,
          d.received_date,
          d.distribution_date,
          d.status AS distribution_status,
          f.full_name AS farmer_name,
          f.reference_number,
          (COALESCE(d.quantity, 0) * ?) AS expected_pesos,
          COALESCE(p.paid_sum, 0) AS paid_pesos
        FROM income_assistance_distributions d
        INNER JOIN farmers f ON f.id = d.farmer_id
        LEFT JOIN (
          SELECT source_distribution_id, SUM(amount) AS paid_sum
          FROM share_capital_contributions
          WHERE contribution_kind = 'assistance_sacks'
            AND status = 'confirmed'
            AND source_distribution_id IS NOT NULL
          GROUP BY source_distribution_id
        ) p ON p.source_distribution_id = d.id
        WHERE d.barangay_id = ?
          AND d.status IN ('Distributed', 'Confirmed Received')
          AND d.assistance_type IN ('fertilizer', 'seeds', 'both')
        ORDER BY COALESCE(d.received_date, d.distribution_date, d.created_at) DESC, d.id DESC
        `,
        [ASSISTANCE_PER_SACK_PHP, check.barangayId]
      );

      const ids = rows.map((r) => r.distribution_id).filter(Boolean);
      const paymentsByDist = {};
      if (ids.length > 0) {
        const placeholders = ids.map(() => '?').join(',');
        const [pays] = await pool.execute(
          `
          SELECT id, source_distribution_id, contribution_date, amount, created_at
          FROM share_capital_contributions
          WHERE contribution_kind = 'assistance_sacks'
            AND status = 'confirmed'
            AND source_distribution_id IN (${placeholders})
          ORDER BY contribution_date DESC, id DESC
          `,
          ids
        );
        for (const p of pays) {
          const sid = p.source_distribution_id;
          if (!paymentsByDist[sid]) paymentsByDist[sid] = [];
          paymentsByDist[sid].push({
            id: p.id,
            contribution_date: p.contribution_date,
            amount: parseFloat(p.amount),
            created_at: p.created_at,
          });
        }
      }

      const list = rows.map((r) => {
        const expected = Math.round(parseFloat(r.expected_pesos || 0) * 100) / 100;
        const paid = Math.round(parseFloat(r.paid_pesos || 0) * 100) / 100;
        const remaining = Math.round((expected - paid) * 100) / 100;
        return {
          distribution_id: r.distribution_id,
          farmer_id: r.farmer_id,
          barangay_id: r.barangay_id,
          assistance_type: r.assistance_type,
          sack_count: r.sack_count,
          received_date: r.received_date,
          distribution_date: r.distribution_date,
          distribution_status: r.distribution_status,
          farmer_name: r.farmer_name,
          reference_number: r.reference_number,
          expected_pesos: expected,
          paid_pesos: paid,
          remaining_pesos: remaining,
          payments: paymentsByDist[r.distribution_id] || [],
        };
      });

      res.json({ success: true, barangay_id: check.barangayId, rows: list, per_sack_php: ASSISTANCE_PER_SACK_PHP });
    } catch (error) {
      console.error('seed-fertilizer-plan list:', error.message);
      res.status(500).json({ success: false, message: error.message });
    }
  }
);

// POST /api/seed-fertilizer-plan/distribution/:distributionId/payment
// body: { amount, contribution_date } — puwedeng bahagya; bawat tawag ay isang linya sa share capital (kasaysayan)
router.post(
  '/distribution/:distributionId/payment',
  verifyToken,
  requireBarangayForOfficer,
  authorizeRoles(['admin', 'president', 'treasurer']),
  async (req, res) => {
    const distId = parseInt(String(req.params.distributionId), 10);
    if (Number.isNaN(distId)) {
      return res.status(400).json({ success: false, message: 'Invalid distribution id' });
    }

    const { amount, contribution_date, payment_method } = req.body || {};
    const officerId = req.user?.id ? parseInt(String(req.user.id), 10) : null;

    const conn = await pool.getConnection();
    try {
      await conn.beginTransaction();
      const [[d]] = await conn.execute(
        `SELECT id, barangay_id FROM income_assistance_distributions WHERE id = ?`,
        [distId]
      );
      if (!d) {
        await conn.rollback();
        return res.status(404).json({ success: false, message: 'Distribution not found' });
      }
      const barangayCheck = assertOfficerBarangay(req, d.barangay_id);
      if (!barangayCheck.ok) {
        await conn.rollback();
        return res.status(barangayCheck.status).json({ success: false, message: barangayCheck.message });
      }

      const result = await recordAssistancePaymentForDistribution(conn, {
        distributionId: distId,
        amount,
        contributionDate: contribution_date,
        createdByUserId: officerId,
      });

      if (!result.ok) {
        await conn.rollback();
        const msgMap = {
          invalid_amount: 'Di-wastong halaga.',
          missing_contribution_date: 'Kailangan ang petsa ng bayad (contribution_date).',
          distribution_not_found: 'Hindi makita ang distribution.',
          distribution_not_eligible: 'Ang distribution ay dapat Distributed o Confirmed Received.',
          zero_expected: 'Walang inaasahang halaga (0 sako).',
          exceeds_remaining: `Lampas sa natitira (natitira: ₱${result.remaining_pesos ?? '—'}).`,
        };
        return res.status(400).json({
          success: false,
          message: msgMap[result.error] || result.error,
          details: result,
        });
      }

      await conn.commit();

      const [[distInfo]] = await pool.execute(
        `SELECT d.id, d.assistance_type, d.quantity, f.full_name AS farmer_name, f.barangay_id
         FROM income_assistance_distributions d
         JOIN farmers f ON d.farmer_id = f.id
         WHERE d.id = ?`,
        [distId]
      );
      const receiptNum = await generateReceiptNumber(pool);
      const normalizedMethod = ['gcash', 'g-cash'].includes(String(payment_method || '').toLowerCase())
        ? 'GCash'
        : 'Cash';
      const assistLabel = distInfo?.assistance_type || 'seed/fertilizer';

      await recordPaymentReceipt(pool, {
        receiptNumber: receiptNum,
        module: 'seed_fertilizer',
        referenceId: distId,
        referenceType: 'income_assistance_distribution',
        clientName: distInfo?.farmer_name,
        amountPaid: result.amount_recorded,
        remainingBalance: result.remaining_pesos,
        paymentMethod: normalizedMethod,
        paymentDate: String(contribution_date).slice(0, 10),
        collectedBy: officerId,
        barangayId: distInfo?.barangay_id,
        remarks: `Seed/Fertilizer assistance payment (${assistLabel})`
      });

      res.json({ success: true, ...result, receipt_number: receiptNum });
    } catch (error) {
      await conn.rollback();
      console.error('seed-fertilizer-plan payment:', error.message);
      res.status(500).json({ success: false, message: error.message });
    } finally {
      conn.release();
    }
  }
);

module.exports = router;
