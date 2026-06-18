// routes/notifications.js
// Simplified notification system: ONE notification per item, 1 day before due date
// Also generates overdue payment notifications when loans are past due

const express = require('express');
const router = express.Router();
const pool = require('../db');
const { verifyToken } = require('../middleware/auth');
const {
  ANNOUNCEMENT_NOTIFICATION_TYPES,
  ASSISTANCE_NOTIFICATION_TYPES,
  STATUS_NOTIFICATION_TYPES,
  OPERATOR_NOTIFICATION_TYPES,
  TREASURER_NOTIFICATION_TYPES,
  formatLocalDate,
  upsertNotification,
  purgeOrphanedNotifications
} = require('../services/notification-service');
const { syncExpiredMachineryBookings } = require('../services/booking-status-sync');
const {
  getManilaTodayString,
  addDays,
  normalizeDateString,
  daysBetween
} = require('../utils/philippinesTime');

const FARMER_NOTIFICATION_TYPES = ['1_day', 'overdue_penalty', ...STATUS_NOTIFICATION_TYPES, ...ASSISTANCE_NOTIFICATION_TYPES];
const VISIBLE_NOTIFICATION_TYPES = [...FARMER_NOTIFICATION_TYPES, ...ANNOUNCEMENT_NOTIFICATION_TYPES, ...OPERATOR_NOTIFICATION_TYPES];
const VISIBLE_NOTIFICATION_TYPES_SQL = VISIBLE_NOTIFICATION_TYPES.map((value) => `'${value}'`).join(', ');
const normalizeRole = (role) => (role || '').toLowerCase();

const isFarmerRole = (role) => normalizeRole(role) === 'farmer';
const isOperatorRole = (role) => normalizeRole(role) === 'operator';
const isTreasurerRole = (role) => normalizeRole(role) === 'treasurer';
const isManagerRole = (role) => ['operation_manager', 'business_manager'].includes(normalizeRole(role));

const buildNotificationVisibilityClause = (role) => {
  if (isFarmerRole(role)) {
    return {
      clause: `n.notification_type IN (${VISIBLE_NOTIFICATION_TYPES_SQL})`,
      params: []
    };
  }

  if (isOperatorRole(role)) {
    const operatorTypesSql = OPERATOR_NOTIFICATION_TYPES.map((v) => `'${v}'`).join(', ');
    return {
      clause: `(n.notification_type IN (${operatorTypesSql}) OR (n.reference_type = 'announcement' AND n.notification_type IN ('announcement_posted')))`,
      params: []
    };
  }

  if (isTreasurerRole(role)) {
    const treasurerTypesSql = TREASURER_NOTIFICATION_TYPES.map((v) => `'${v}'`).join(', ');
    return {
      clause: `(n.notification_type IN (${treasurerTypesSql}) OR (n.reference_type = 'announcement' AND n.notification_type IN ('announcement_posted')))`,
      params: []
    };
  }

  if (isManagerRole(role)) {
    return {
      clause: `(n.reference_type = 'machinery_booking' OR (n.reference_type = 'announcement' AND n.notification_type IN ('announcement_posted')))`,
      params: []
    };
  }

  return {
    clause: `n.reference_type = 'announcement' AND n.notification_type IN ('announcement_posted')`,
    params: []
  };
};

// Penalty calculation helper
const calculatePenalty = (principalAmount, daysOverdue) => {
  // Apply 1% penalty immediately after due date, scaling over 180 days (6 months)
  // 1 day overdue = 1% penalty, 180+ days = 2% penalty, etc.
  const totalPenaltyPeriods = Math.max(1, Math.ceil(daysOverdue / 180));
  const penaltyAmount = (principalAmount * 1 / 100) * totalPenaltyPeriods;
  
  return {
    penaltyAmount: parseFloat(penaltyAmount.toFixed(2)),
    periodsPenalty: totalPenaltyPeriods,
    daysOverdue: daysOverdue
  };
};

// ─── GET /api/notifications ─── Fetch unread notifications for the logged-in user
router.get('/', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isFarmerRole(userRole)) {
      await syncExpiredMachineryBookings();
      await generateDueDateNotifications();
    }

    await purgeOrphanedNotifications();

    const todayStr = formatLocalDate(new Date());
    const visibility = buildNotificationVisibilityClause(userRole);

    const query = `
      SELECT n.*, f.full_name AS farmer_name, f.reference_number
      FROM due_date_notifications n
      JOIN farmers f ON n.farmer_id = f.id
      WHERE n.farmer_id = ?
        AND n.trigger_date <= ?
        AND ${visibility.clause}
      ORDER BY n.is_read ASC, n.trigger_date DESC
      LIMIT 50
    `;
    const params = [userId, todayStr, ...visibility.params];

    const [notifications] = await pool.execute(query, params);
    res.json({ success: true, notifications });
  } catch (err) {
    console.error('Error fetching notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch notifications' });
  }
});

// ─── GET /api/notifications/unread-count ─── Count unread notifications
router.get('/unread-count', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;

    if (isFarmerRole(userRole)) {
      await syncExpiredMachineryBookings();
      await generateDueDateNotifications();
    }

    await purgeOrphanedNotifications();

    const todayStr = formatLocalDate(new Date());
    const visibility = buildNotificationVisibilityClause(userRole);

    const query = `
      SELECT COUNT(*) as count 
      FROM due_date_notifications 
      WHERE farmer_id = ?
        AND is_read = 0 
        AND trigger_date <= ?
        AND ${visibility.clause.replace(/n\./g, '')}
    `;
    const params = [userId, todayStr, ...visibility.params];

    const [rows] = await pool.execute(query, params);
    res.json({ success: true, count: rows[0].count });
  } catch (err) {
    console.error('Error fetching unread count:', err);
    res.status(500).json({ success: false, message: 'Failed to fetch count' });
  }
});

// ─── PUT /api/notifications/:id/read ─── Mark single notification as read (like Facebook)
router.put('/:id/read', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;
    const [result] = await pool.execute(
      `UPDATE due_date_notifications SET is_read = 1 WHERE id = ? AND farmer_id = ?`,
      [id, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Notification not found or access denied' });
    }

    res.json({ success: true, message: 'Notification marked as read' });
  } catch (err) {
    console.error('Error marking notification read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notification' });
  }
});

// ─── PUT /api/notifications/read-all ─── Mark all as read
router.put('/read-all', verifyToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const userRole = req.user.role;
    const todayStr = formatLocalDate(new Date());
    const visibility = buildNotificationVisibilityClause(userRole);

    await pool.execute(`
      UPDATE due_date_notifications 
      SET is_read = 1 
      WHERE farmer_id = ?
        AND trigger_date <= ? 
        AND ${visibility.clause.replace(/n\./g, '')}
    `, [userId, todayStr, ...visibility.params]);
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (err) {
    console.error('Error marking all read:', err);
    res.status(500).json({ success: false, message: 'Failed to update notifications' });
  }
});

// ─── POST /api/notifications/generate ─── Manually trigger notification generation
router.post('/generate', verifyToken, async (req, res) => {
  try {
    if (!['admin', 'treasurer', 'president'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    await syncExpiredMachineryBookings();
    const count = await generateDueDateNotifications();
    res.json({ success: true, message: `Generated ${count} new notifications` });
  } catch (err) {
    console.error('Error generating notifications:', err);
    res.status(500).json({ success: false, message: 'Failed to generate notifications' });
  }
});

// ─── Notification Generation: ONLY '1_day' notifications (1 day before due date) ───
// Accepts optional testDate parameter for testing without changing system date

async function generateDueDateNotifications(testDate = null) {
  let totalGenerated = 0;

  const todayStr = testDate && /^\d{4}-\d{2}-\d{2}$/.test(testDate)
    ? testDate
    : getManilaTodayString();

  // ─── LOANS: Trigger notification 1 day before due date ───
  try {
    const [loans] = await pool.execute(`
      SELECT l.id, l.farmer_id, l.loan_amount, l.remaining_balance, l.due_date, 
             l.loan_type, l.status, f.full_name
      FROM loans l
      JOIN farmers f ON l.farmer_id = f.id
      WHERE f.role = 'farmer'
        AND l.status IN ('active', 'approved', 'overdue')
        AND l.remaining_balance > 0
        AND l.due_date IS NOT NULL
    `);

    console.log(`\n🔍 [generateDueDateNotifications] TEST MODE: ${testDate ? `Testing with date ${testDate}` : 'Using system date'}`);
    console.log(`📅 Processing date: ${todayStr}`);
    console.log(`📋 Found ${loans.length} loans with status in ('active', 'approved', 'overdue')\n`);

    for (const loan of loans) {
      if (!loan.due_date) continue;

      const dueDateStr = normalizeDateString(loan.due_date);
      if (!dueDateStr) continue;

      const triggerDateStr = addDays(dueDateStr, -1);
      const isOnOrAfterTriggerDate = todayStr >= triggerDateStr;

      console.log(`  └─ Loan ${loan.id}: Due=${dueDateStr}, Trigger=${triggerDateStr}, Today=${todayStr}, Match=${isOnOrAfterTriggerDate ? '✓' : '✗'}`);
      
      if (!isOnOrAfterTriggerDate) continue;

      const loanLabel = loan.loan_type?.charAt(0).toUpperCase() + loan.loan_type?.slice(1) || 'Loan';
      const amount = parseFloat(loan.remaining_balance).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const inserted = await upsertNotification({
        farmer_id: loan.farmer_id,
        reference_type: 'loan',
        reference_id: loan.id,
        notification_type: '1_day',
        title: `${loanLabel} Due Tomorrow`,
        message: `Remaining balance: ₱${amount}`,
        due_date: loan.due_date,
        trigger_date: triggerDateStr
      });
      if (inserted) totalGenerated++;
    }
  } catch (err) {
    console.error('Error processing loans for notifications:', err.message);
  }

  // ─── LOANS: Trigger notification for overdue loans with penalty ───
  try {
    // Reuse the same 'today' date for consistency (respects testDate if provided)
    const [overdueLoans] = await pool.execute(`
      SELECT l.id, l.farmer_id, l.principal_amount, l.loan_amount, l.remaining_balance, l.due_date, 
             l.loan_type, l.status, f.full_name
      FROM loans l
      JOIN farmers f ON l.farmer_id = f.id
      WHERE f.role = 'farmer'
        AND l.status = 'overdue'
        AND l.remaining_balance > 0
        AND l.due_date IS NOT NULL
        AND l.due_date < ?
    `, [todayStr]);

    for (const loan of overdueLoans) {
      if (!loan.due_date) continue;

      const dueDateStr = normalizeDateString(loan.due_date);
      if (!dueDateStr) continue;

      const daysOverdue = daysBetween(dueDateStr, todayStr);
      
      // Generate penalty notification if overdue by 1+ days
      if (daysOverdue < 1) continue;

      const principal = parseFloat(loan.principal_amount) || parseFloat(loan.loan_amount);
      if (isNaN(principal) || principal <= 0) continue; // Skip invalid amounts
      
      const penaltyInfo = calculatePenalty(principal, daysOverdue);
      
      const loanLabel = loan.loan_type?.charAt(0).toUpperCase() + loan.loan_type?.slice(1) || 'Loan';
      const remainingBalance = parseFloat(loan.remaining_balance).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const penaltyAmount = penaltyInfo.penaltyAmount.toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      const totalWithPenalty = (parseFloat(loan.remaining_balance) + penaltyInfo.penaltyAmount).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      const inserted = await upsertNotification({
        farmer_id: loan.farmer_id,
        reference_type: 'loan',
        reference_id: loan.id,
        notification_type: 'overdue_penalty',
        title: `⚠️ ${loanLabel} Overdue - Penalty Applied`,
        message: `Days overdue: ${daysOverdue} | Penalty: ₱${penaltyAmount} (${penaltyInfo.periodsPenalty} period${penaltyInfo.periodsPenalty > 1 ? 's' : ''}) | New total: ₱${totalWithPenalty}`,
        due_date: loan.due_date,
        trigger_date: todayStr
      });
      if (inserted) totalGenerated++;
    }
  } catch (err) {
    console.error('Error processing overdue loans for penalty notifications:', err.message);
  }

  // ─── MACHINERY BOOKINGS: Trigger notification 1 day before due date ───
  try {
    const [bookings] = await pool.execute(`
      SELECT mb.id, mb.farmer_id, mb.total_price, mb.remaining_balance, 
             mb.booking_date, mb.payment_status, mb.status,
             mi.machinery_name, f.full_name
      FROM machinery_bookings mb
      JOIN farmers f ON mb.farmer_id = f.id
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      WHERE f.role = 'farmer'
        AND mb.payment_status IN ('Unpaid', 'Partial')
        AND mb.remaining_balance > 0
        AND mb.status NOT IN ('Rejected', 'Cancelled')
    `);

    for (const booking of bookings) {
      // Validate farmer_id
      const farmerId = parseInt(booking.farmer_id, 10);
      if (isNaN(farmerId) || farmerId <= 0) {
        console.error(`❌ [generateDueDateNotifications] Invalid farmer_id for booking ${booking.id}:`, booking.farmer_id);
        continue;
      }

      const bookingDateStr = normalizeDateString(booking.booking_date);
      if (!bookingDateStr) {
        console.error(`❌ [generateDueDateNotifications] Invalid booking_date for booking ${booking.id}:`, booking.booking_date);
        continue;
      }

      const dueDateStr = addDays(bookingDateStr, 30);
      const triggerDateStr = addDays(dueDateStr, -1);

      // Generate if today is on or after the trigger date
      const isOnOrAfterTriggerDate = todayStr >= triggerDateStr;
      if (!isOnOrAfterTriggerDate) continue;

      const machineryName = booking.machinery_name || 'Machinery';
      const amount = parseFloat(booking.remaining_balance).toLocaleString('en-PH', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });

      console.log(`✅ [generateDueDateNotifications] Creating payment due notification for farmer ${farmerId}, booking ${booking.id}`);

      const inserted = await upsertNotification({
        farmer_id: farmerId,
        reference_type: 'machinery_booking',
        reference_id: booking.id,
        notification_type: '1_day',
        title: `${machineryName} Payment Due Tomorrow`,
        message: `Remaining balance: ₱${amount}`,
        due_date: dueDateStr,
        trigger_date: triggerDateStr
      });

      if (inserted) totalGenerated++;
    }
  } catch (err) {
    console.error('Error processing machinery bookings for notifications:', err.message);
  }

  // ─── MACHINERY BOOKINGS: Overdue interest notifications (similar to loan penalties) ───
  try {
    const [overdueBookings] = await pool.execute(`
      SELECT mb.id, mb.farmer_id, mb.total_price, mb.total_paid, mb.pending_interest,
             mb.booking_date, mb.payment_status,
             mi.machinery_name, f.full_name
      FROM machinery_bookings mb
      JOIN farmers f ON mb.farmer_id = f.id
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      WHERE f.role = 'farmer'
        AND mb.payment_status IN ('Unpaid', 'Partial')
        AND mb.status IN ('Approved', 'Completed')
        AND DATE_ADD(mb.booking_date, INTERVAL 30 DAY) < ?
        AND (mb.total_price - COALESCE(mb.total_paid, 0)) > 0
    `, [todayStr]);

    for (const booking of overdueBookings) {
      // Validate farmer_id
      const farmerId = parseInt(booking.farmer_id, 10);
      if (isNaN(farmerId) || farmerId <= 0) {
        console.error(`❌ [generateDueDateNotifications] Invalid farmer_id for overdue booking ${booking.id}:`, booking.farmer_id);
        continue;
      }

      const bookingDateStr = normalizeDateString(booking.booking_date);
      if (!bookingDateStr) {
        console.error(`❌ [generateDueDateNotifications] Invalid booking_date for overdue booking ${booking.id}:`, booking.booking_date);
        continue;
      }

      const dueDateStr = addDays(bookingDateStr, 30);
      const daysOverdue = daysBetween(dueDateStr, todayStr);
      if (daysOverdue < 1) continue;

      const monthsOverdue = Math.floor(daysOverdue / 30.44);
      const rate = monthsOverdue <= 6 ? 0.02 : 0.04;
      const seasonLabel = monthsOverdue <= 6 ? 'Season 1 (0-6mo): 2%' : 'Season 2 (6+mo): 4%';

      const originalPrice = parseFloat(booking.total_price) - (parseFloat(booking.pending_interest) || 0);
      const interestAmt = parseFloat((originalPrice * rate).toFixed(2));
      const remainBal = parseFloat(booking.total_price) - (parseFloat(booking.total_paid) || 0);

      const machineryName = booking.machinery_name || 'Machinery';
      const interestStr = interestAmt.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      const balanceStr = remainBal.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

      console.log(`✅ [generateDueDateNotifications] Creating overdue penalty notification for farmer ${farmerId}, booking ${booking.id}`);

      const inserted = await upsertNotification({
        farmer_id: farmerId,
        reference_type: 'machinery_booking',
        reference_id: booking.id,
        notification_type: 'overdue_penalty',
        title: `⚠️ ${machineryName} Payment Overdue - Interest Applied`,
        message: `Days overdue: ${daysOverdue} | Interest: ₱${interestStr} (${seasonLabel}) | Balance: ₱${balanceStr}`,
        due_date: dueDateStr,
        trigger_date: todayStr
      });
      if (inserted) totalGenerated++;
    }
  } catch (err) {
    console.error('Error processing overdue machinery bookings for interest notifications:', err.message);
  }

  console.log(`📬 Generated ${totalGenerated} due-date notifications for tomorrow`);
  return totalGenerated;
}

// Export for use by scheduler
module.exports = router;
module.exports.generateDueDateNotifications = generateDueDateNotifications;
