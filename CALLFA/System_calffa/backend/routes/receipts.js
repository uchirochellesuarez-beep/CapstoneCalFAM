const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const { getPaymentReceipt } = require('../services/receipt-service');
const { canAccessBarangay } = require('../utils/requestUser');

async function userOwnsMachineryReceipt(userId, receipt) {
  if (!userId || !receipt) return false;

  const module = String(receipt.module || '');
  const refId = parseInt(receipt.reference_id, 10);
  if (!refId) return false;

  let bookingId = null;
  if (module === 'machinery_rental' && receipt.reference_type === 'machinery_booking') {
    bookingId = refId;
  } else if (module === 'machinery_refund') {
    bookingId = receipt.metadata?.booking_id
      ? parseInt(receipt.metadata.booking_id, 10)
      : null;
    if (!bookingId) {
      const [rows] = await pool.execute(
        'SELECT booking_id FROM machinery_booking_refunds WHERE id = ?',
        [refId]
      );
      bookingId = rows[0]?.booking_id || null;
    }
  }

  if (!bookingId) return false;

  const [bookings] = await pool.execute(
    'SELECT farmer_id FROM machinery_bookings WHERE id = ?',
    [bookingId]
  );
  return (
    bookings.length > 0 &&
    parseInt(bookings[0].farmer_id, 10) === parseInt(userId, 10)
  );
}

router.get('/:receiptNumber', verifyToken, async (req, res) => {
  try {
    const receipt = await getPaymentReceipt(pool, req.params.receiptNumber);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }

    const receiptBarangayId = receipt.barangay_id;
    const canBarangay = canAccessBarangay(req.user, receiptBarangayId);
    const ownsReceipt = await userOwnsMachineryReceipt(req.user.id, receipt);

    if (!canBarangay && !ownsReceipt) {
      return res.status(403).json({
        success: false,
        message: 'You can only access receipts from your assigned barangay or your own bookings.'
      });
    }

    res.json({ success: true, receipt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch receipt' });
  }
});

module.exports = router;
