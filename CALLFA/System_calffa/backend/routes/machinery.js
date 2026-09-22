const express = require('express');
const router = express.Router();
const pool = require('../db');
const { JWT_SECRET } = require('../utils/jwtSecret');
const { verifyToken, authorizeRoles, verifyBookingBarangayAccess, verifyBookingParticipantAccess, verifyBalanceSubmissionBarangayAccess } = require('../middleware/auth');
const { getRequestUser, canAccessBarangay, buildListBarangayScope } = require('../utils/requestUser');

/** JWT + barangay + farmer-ownership checks for booking :id routes */
const secureBookingRoute = [verifyToken, verifyBookingBarangayAccess, verifyBookingParticipantAccess];
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { syncExpiredMachineryBookings } = require('../services/booking-status-sync');
const { sqlLimit } = require('../utils/sqlLimit');
const { createBookingStatusNotification, formatLocalDate, createOperatorBookingAssignedNotification, createOperatorBookingUpdatedNotification, createOperatorBookingCancelledNotification, createTreasurerDownPaymentSubmittedNotification, createTreasurerBalancePaymentSubmittedNotification, createTreasurerCollectibleCreatedNotification, createTreasurerRefundRequestedNotification, createManagerConfirmBookingNotification, deleteNotificationsForBooking, notifyBarangayDownPaymentDue } = require('../services/notification-service');
const { createPendingExpenseForBooking } = require('../services/pending-expense-service');
const { verifyBalancePaymentSubmission } = require('../services/balance-payment-service');
const { generateReceiptNumber, recordPaymentReceipt, getPaymentReceipt } = require('../services/receipt-service');
const { mergeGcashEventsIntoHistory } = require('../services/gcash-payment-service');
const {
  generateRefundNumber,
  isRefundEligible,
  reverseMachineryIncomeOnRefund
} = require('../services/refund-service');
const {
  calculateDownPayment,
  formatDownPaymentPercentLabel,
  calendarBlockingStatusesSql,
  CALENDAR_BLOCKING_STATUSES,
  OPERATOR_WORK_STATUSES,
  syncMachineryIncomeFromBooking,
  canUserBookMachinery,
  canCreateBookingOnBehalf,
  MACHINERY_BOOKING_ROLES,
  shouldUseNonMemberRate,
  assertCanVerifyMachineryPayment,
  paymentVerifierBookerFilter,
  getPaymentVerifierRole
} = require('../services/booking-workflow');
const { verifyDownPaymentForBooking, recordCashDownPaymentForBooking } = require('../services/down-payment-service');
const {
  getDownPaymentSettings,
  setDownPaymentSettings
} = require('../services/down-payment-settings-service');
const {
  normalizeStoredMachineryStatus,
  withDisplayStatus
} = require('../services/machinery-status');
const {
  resolveRequiresMachineryId,
  checkMachineryPrerequisite,
  annotateInventoryPrerequisites
} = require('../services/machinery-prerequisite');
const { normalizeInterestRatePercent } = require('../services/machinery-interest-service');

// Configure multer for machinery picture uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const uploadDir = path.join(__dirname, '../uploads/machinery');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'machinery-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const uploadMachineryPicture = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|jfif|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image files (JPEG, PNG, GIF, WebP) are allowed!'));
    }
  }
});

const uploadPaymentProof = multer({
  storage: multer.diskStorage({
    destination: function (req, file, cb) {
      const uploadDir = path.join(__dirname, '../uploads/payment-proofs');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      cb(null, 'payment-' + uniqueSuffix + path.extname(file.originalname));
    }
  }),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|jfif|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (mimetype && extname) return cb(null, true);
    cb(new Error('Only image files are allowed for payment proof'));
  }
});

// ========================================
// MACHINERY INVENTORY ROUTES (Admin Only)
// ========================================

// GET /api/machinery/inventory
router.get('/inventory', async (req, res) => {
  try {
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    const { status, machinery_type, barangay_id, catalog } = req.query;
    const isBookingCatalog = String(catalog || '') === '1' || String(catalog || '').toLowerCase() === 'true';

    let query = `
      SELECT 
        mi.*,
        req.machinery_name AS requires_machinery_name,
        f.full_name as created_by_name,
        b.name as barangay_name,
        COALESCE(b.machinery_down_payment_enabled, 0) AS down_payment_enabled,
        b.machinery_down_payment_percent AS down_payment_percent,
        op.full_name as assigned_operator_name,
        op.reference_number as assigned_operator_ref,
        pres.full_name as assigned_by_name,
        COUNT(DISTINCT mo.id) as assigned_operators
      FROM machinery_inventory mi
      LEFT JOIN machinery_inventory req ON mi.requires_machinery_id = req.id
      LEFT JOIN farmers f ON mi.created_by = f.id
      LEFT JOIN barangays b ON mi.barangay_id = b.id
      LEFT JOIN farmers op ON mi.assigned_operator_id = op.id
      LEFT JOIN farmers pres ON mi.assigned_by = pres.id
      LEFT JOIN machinery_operators mo ON mi.id = mo.machinery_id AND mo.status = 'Active'
      WHERE 1=1
    `;
    const params = [];
    
    if (status && isBookingCatalog) {
      query += ' AND mi.status = ?';
      params.push(status);
    }
    
    if (machinery_type) {
      query += ' AND mi.machinery_type = ?';
      params.push(machinery_type);
    }

    // Management inventory: barangay officers only see their barangay's machinery.
    // Booking catalog (catalog=1): all barangays so member/non-member pricing works.
    // Admin sees all (optional ?barangay_id= filter).
    const barangayScopedInventoryRoles = ['president', 'treasurer', 'auditor'];
    if (barangayScopedInventoryRoles.includes(user.role) && !isBookingCatalog) {
      if (!user.barangay_id) {
        return res.json({ success: true, inventory: [], cross_barangay_catalog: false });
      }
      query += ' AND mi.barangay_id = ?';
      params.push(parseInt(user.barangay_id, 10));
    } else if (barangay_id && !isBookingCatalog) {
      query += ' AND mi.barangay_id = ?';
      params.push(parseInt(barangay_id, 10));
    }

    query += ' GROUP BY mi.id ORDER BY mi.created_at DESC';

    const [inventory] = await pool.execute(query, params);
    let withAvailability = await withDisplayStatus(pool, inventory);
    if (isBookingCatalog) {
      withAvailability = withAvailability.map((row) => ({
        ...row,
        availability_status: row.stored_status
      }));
      withAvailability = await annotateInventoryPrerequisites(pool, withAvailability, user.id);
    } else if (status) {
      withAvailability = withAvailability.filter((row) => row.availability_status === status);
    }
    res.json({
      success: true,
      inventory: withAvailability,
      cross_barangay_catalog: isBookingCatalog || !barangayScopedInventoryRoles.includes(user.role)
    });
  } catch (error) {
    console.error('Error fetching machinery inventory:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch machinery inventory' });
  }
});

// GET /api/machinery/inventory/:id - Get single machinery details
router.get('/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { getRequestUser, canAccessBarangay } = require('../utils/requestUser');
    const user = await getRequestUser(req);
    
    const [machinery] = await pool.execute(
      `SELECT 
        mi.*,
        f.full_name as created_by_name,
        op.full_name as assigned_operator_name,
        op.reference_number as assigned_operator_ref,
        pres.full_name as assigned_by_name
      FROM machinery_inventory mi
      LEFT JOIN farmers f ON mi.created_by = f.id
      LEFT JOIN farmers op ON mi.assigned_operator_id = op.id
      LEFT JOIN farmers pres ON mi.assigned_by = pres.id
      WHERE mi.id = ?`,
      [id]
    );
    
    if (machinery.length === 0) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    // Any authenticated user may view machinery details for cross-barangay booking.
    
    // Get assigned operators
    const [operators] = await pool.execute(
      `SELECT 
        mo.*,
        f.full_name as operator_name,
        f.reference_number
      FROM machinery_operators mo
      JOIN farmers f ON mo.farmer_id = f.id
      WHERE mo.machinery_id = ? AND mo.status = 'Active'`,
      [id]
    );
    
    const [enriched] = await withDisplayStatus(pool, machinery);
    res.json({ 
      success: true, 
      machinery: enriched || machinery[0],
      operators 
    });
  } catch (error) {
    console.error('Error fetching machinery details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch machinery details' });
  }
});

// PUT /api/machinery/inventory/:id/assign-operator - President assigns operator to machinery
router.put('/inventory/:id/assign-operator', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id, assigned_by, assignment_date } = req.body;

    if (!operator_id || !assigned_by) {
      return res.status(400).json({
        success: false,
        message: 'operator_id and assigned_by are required'
      });
    }

    const [president] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [assigned_by]
    );

    if (president.length === 0 || !['president', 'admin'].includes(president[0].role)) {
      return res.status(403).json({
        success: false,
        message: 'Only president or admin can assign operators to machinery'
      });
    }

    const [machinery] = await pool.execute(
      'SELECT id, barangay_id, machinery_name FROM machinery_inventory WHERE id = ?',
      [id]
    );

    if (machinery.length === 0) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    if (president[0].role !== 'admin' && president[0].barangay_id !== machinery[0].barangay_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only assign operators to machinery in your barangay'
      });
    }

    const [operator] = await pool.execute(
      'SELECT id, role, barangay_id, full_name FROM farmers WHERE id = ?',
      [operator_id]
    );

    if (operator.length === 0 || operator[0].role !== 'operator') {
      return res.status(400).json({
        success: false,
        message: 'Assigned user must have the operator role'
      });
    }

    if (operator[0].barangay_id !== machinery[0].barangay_id) {
      return res.status(400).json({
        success: false,
        message: 'Operator must belong to the same barangay as the machinery'
      });
    }

    const assignDate = assignment_date || formatLocalDate(new Date());

    await pool.execute(
      `UPDATE machinery_inventory
       SET assigned_operator_id = ?, assigned_by = ?, assignment_date = ?
       WHERE id = ?`,
      [operator_id, assigned_by, assignDate, id]
    );

    // Keep machinery_operators in sync — one active operator per machinery
    await pool.execute(
      `UPDATE machinery_operators SET status = 'Inactive' WHERE machinery_id = ? AND farmer_id != ?`,
      [id, operator_id]
    );

    await pool.execute(
      `INSERT INTO machinery_operators (farmer_id, machinery_id, assigned_date, status, barangay_id)
       VALUES (?, ?, ?, 'Active', ?)
       ON DUPLICATE KEY UPDATE status = 'Active', assigned_date = VALUES(assigned_date), barangay_id = VALUES(barangay_id)`,
      [operator_id, id, assignDate, machinery[0].barangay_id]
    );

    res.json({
      success: true,
      message: `Operator ${operator[0].full_name} assigned to ${machinery[0].machinery_name}`,
      machinery_id: parseInt(id, 10),
      assigned_operator_id: operator_id,
      assignment_date: assignDate
    });
  } catch (error) {
    console.error('Error assigning operator to machinery:', error);
    res.status(500).json({ success: false, message: 'Failed to assign operator' });
  }
});

// POST /api/machinery/inventory/:id/picture - Upload machinery picture
router.post('/inventory/:id/picture', verifyToken, uploadMachineryPicture.single('machinery_picture'), async (req, res) => {
  try {
    console.log('🖼️ Picture upload request received');
    console.log('   Machinery ID:', req.params.id);
    console.log('   File info:', req.file ? { name: req.file.filename, size: req.file.size, mimetype: req.file.mimetype } : 'NO FILE');
    
    const machineryId = parseInt(req.params.id);
    
    if (!machineryId) {
      console.error('❌ Invalid machinery ID:', req.params.id);
      return res.status(400).json({ success: false, message: 'Invalid machinery ID' });
    }

    if (!req.file) {
      console.error('❌ No file uploaded');
      return res.status(400).json({ success: false, message: 'No file uploaded' });
    }

    // Generate the URL path for the uploaded file
    const machineryPicturePath = `/uploads/machinery/${req.file.filename}`;
    console.log('📁 New picture path:', machineryPicturePath);

    // Get old picture to delete if exists
    console.log('🔍 Fetching old picture from database...');
    const [oldData] = await pool.execute(
      'SELECT machinery_picture FROM machinery_inventory WHERE id = ?',
      [machineryId]
    );
    console.log('   Old picture data:', oldData);

    if (oldData.length > 0 && oldData[0].machinery_picture) {
      // Remove leading slash from the stored path, then construct full path
      const relativePath = oldData[0].machinery_picture.replace(/^\//, '');
      const oldImagePath = path.join(__dirname, '..', relativePath);
      console.log('🗑️ Attempting to delete old picture:', oldImagePath);
      if (fs.existsSync(oldImagePath)) {
        fs.unlinkSync(oldImagePath);
        console.log('✓ Old picture deleted');
      } else {
        console.log('⚠️ Old picture file not found:', oldImagePath);
      }
    }

    // Update database
    console.log('🔄 Updating database with new picture path...');
    const [result] = await pool.execute(
      'UPDATE machinery_inventory SET machinery_picture = ? WHERE id = ?',
      [machineryPicturePath, machineryId]
    );
    console.log('   Update result:', { affectedRows: result.affectedRows, changedRows: result.changedRows });

    if (result.affectedRows === 0) {
      console.error('❌ Machinery not found for ID:', machineryId);
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    console.log(`✅ Machinery picture uploaded for machinery ${machineryId}: ${machineryPicturePath}`);

    res.json({
      success: true,
      message: 'Machinery picture uploaded successfully',
      machinery_picture: machineryPicturePath,
      machinery_id: machineryId
    });
  } catch (error) {
    console.error('❌ Error uploading machinery picture:', error.message);
    console.error('   Stack:', error.stack);
    res.status(500).json({ success: false, message: 'Failed to upload machinery picture', error: error.message });
  }
});

// POST /api/machinery/inventory - Add new machinery (Admin or President only)
router.post('/inventory', async (req, res) => {
  try {
    console.log('📝 Received add machinery request:', req.body);
    
    // Verify token and get user role
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const jwt = require('jsonwebtoken');
    let userRole = 'guest';
    let userBarangayId = null;
    let userId = null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userRole = decoded.role;
      userBarangayId = decoded.barangay_id;
      userId = decoded.id;
      
      // Verify user role from database
      const [user] = await pool.execute('SELECT role, barangay_id FROM farmers WHERE id = ?', [userId]);
      if (user.length === 0 || !['admin', 'president'].includes(user[0].role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only admin and president can add machinery' 
        });
      }
      userRole = user[0].role;
      userBarangayId = user[0].barangay_id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }
    
    const {
      machinery_name,
      machinery_type,
      description,
      price_per_unit,
      unit_type,
      max_capacity,
      capacity_unit,
      status = 'Available',
      created_by,
      barangay_id
    } = req.body;
    
    // Validate required fields
    if (!machinery_name || !machinery_type || !price_per_unit || !unit_type) {
      console.error('❌ Validation failed. Missing fields:', {
        machinery_name: !!machinery_name,
        machinery_type: !!machinery_type,
        price_per_unit: !!price_per_unit,
        unit_type: !!unit_type
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: machinery_name, machinery_type, price_per_unit, unit_type' 
      });
    }

    // Validate barangay_id
    let finalBarangayId = barangay_id;
    if (!finalBarangayId) {
      return res.status(400).json({ 
        success: false, 
        message: 'barangay_id is required' 
      });
    }

    // For president, enforce barangay isolation
    if (userRole === 'president') {
      if (userBarangayId !== parseInt(finalBarangayId)) {
        return res.status(403).json({ 
          success: false, 
          message: `President can only manage machinery in barangay ${userBarangayId}` 
        });
      }
    }

    // Validate barangay exists
    const [barangays] = await pool.execute('SELECT id FROM barangays WHERE id = ?', [finalBarangayId]);
    if (barangays.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid barangay_id' 
      });
    }
    
    console.log('✅ Validation passed. Inserting into database...');
    const inventoryStatus = normalizeStoredMachineryStatus(status);

    let requiresMachineryId = null;
    try {
      requiresMachineryId = await resolveRequiresMachineryId(pool, {
        requiresMachineryId: req.body.requires_machinery_id,
        barangayId: finalBarangayId
      });
      if (requiresMachineryId === undefined) requiresMachineryId = null;
    } catch (preErr) {
      return res.status(preErr.status || 400).json({ success: false, message: preErr.message });
    }
    
    const interestRate = normalizeInterestRatePercent(req.body.interest_rate);
    
    const [result] = await pool.execute(
      `INSERT INTO machinery_inventory 
       (machinery_name, machinery_type, description, price_per_unit, member_price, non_member_price, interest_rate, unit_type, 
        max_capacity, capacity_unit, status, created_by, barangay_id, requires_machinery_id)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [machinery_name, machinery_type, description, price_per_unit, 
       req.body.member_price || price_per_unit, 
       req.body.non_member_price || (price_per_unit * 1.25), 
       interestRate,
       unit_type, max_capacity, capacity_unit, inventoryStatus, userId, finalBarangayId,
       requiresMachineryId]
    );
    
    console.log('✅ Machinery added successfully! ID:', result.insertId);
    
    res.json({ 
      success: true, 
      message: 'Machinery added successfully',
      machinery_id: result.insertId 
    });
  } catch (error) {
    console.error('❌ Error adding machinery:', error);
    res.status(500).json({ success: false, message: 'Failed to add machinery: ' + error.message });
  }
});

// PUT /api/machinery/inventory/:id - Update machinery (Admin or President only)
router.put('/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify token and get user role
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const jwt = require('jsonwebtoken');
    let userRole = 'guest';
    let userBarangayId = null;
    let userId = null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userRole = decoded.role;
      userBarangayId = decoded.barangay_id;
      userId = decoded.id;
      
      // Verify user role from database
      const [user] = await pool.execute('SELECT role, barangay_id FROM farmers WHERE id = ?', [userId]);
      if (user.length === 0 || !['admin', 'president'].includes(user[0].role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only admin and president can update machinery' 
        });
      }
      userRole = user[0].role;
      userBarangayId = user[0].barangay_id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Get current machinery to check barangay
    const [machinery] = await pool.execute(
      'SELECT barangay_id, interest_rate FROM machinery_inventory WHERE id = ?',
      [id]
    );
    if (machinery.length === 0) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    const currentBarangayId = machinery[0].barangay_id;

    // For president, enforce barangay isolation
    if (userRole === 'president' && userBarangayId !== currentBarangayId) {
      return res.status(403).json({ 
        success: false, 
        message: `President can only manage machinery in barangay ${userBarangayId}` 
      });
    }

    const {
      machinery_name,
      machinery_type,
      description,
      price_per_unit,
      member_price,
      non_member_price,
      unit_type,
      max_capacity,
      capacity_unit,
      status,
      barangay_id
    } = req.body;
    
    // If barangay is being changed, validate authorization
    if (barangay_id && barangay_id !== currentBarangayId) {
      if (userRole === 'president') {
        return res.status(403).json({ 
          success: false, 
          message: 'President cannot change machinery barangay' 
        });
      }
      // For admin, validate new barangay exists
      const [barangays] = await pool.execute('SELECT id FROM barangays WHERE id = ?', [barangay_id]);
      if (barangays.length === 0) {
        return res.status(400).json({ 
          success: false, 
          message: 'Invalid barangay_id' 
        });
      }
    }
    
    const inventoryStatus = normalizeStoredMachineryStatus(status);
    const targetBarangayId = barangay_id || currentBarangayId;
    const interestRate = Object.prototype.hasOwnProperty.call(req.body, 'interest_rate')
      ? normalizeInterestRatePercent(req.body.interest_rate)
      : normalizeInterestRatePercent(machinery[0].interest_rate);

    let requiresMachineryId;
    try {
      requiresMachineryId = await resolveRequiresMachineryId(pool, {
        machineryId: id,
        requiresMachineryId: Object.prototype.hasOwnProperty.call(req.body, 'requires_machinery_id')
          ? req.body.requires_machinery_id
          : undefined,
        barangayId: targetBarangayId
      });
    } catch (preErr) {
      return res.status(preErr.status || 400).json({ success: false, message: preErr.message });
    }

    let result;
    if (requiresMachineryId === undefined) {
      [result] = await pool.execute(
        `UPDATE machinery_inventory 
         SET machinery_name = ?, machinery_type = ?, description = ?, 
             price_per_unit = ?, member_price = ?, non_member_price = ?, interest_rate = ?, unit_type = ?, max_capacity = ?, 
             capacity_unit = ?, status = ?, barangay_id = ?
         WHERE id = ?`,
        [machinery_name, machinery_type, description, price_per_unit, 
         member_price || price_per_unit, 
         non_member_price || (price_per_unit * 1.25),
         interestRate,
         unit_type, max_capacity, capacity_unit, inventoryStatus, targetBarangayId, id]
      );
    } else {
      [result] = await pool.execute(
        `UPDATE machinery_inventory 
         SET machinery_name = ?, machinery_type = ?, description = ?, 
             price_per_unit = ?, member_price = ?, non_member_price = ?, interest_rate = ?, unit_type = ?, max_capacity = ?, 
             capacity_unit = ?, status = ?, barangay_id = ?, requires_machinery_id = ?
         WHERE id = ?`,
        [machinery_name, machinery_type, description, price_per_unit, 
         member_price || price_per_unit, 
         non_member_price || (price_per_unit * 1.25),
         interestRate,
         unit_type, max_capacity, capacity_unit, inventoryStatus, targetBarangayId,
         requiresMachineryId, id]
      );
    }
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }
    
    res.json({ success: true, message: 'Machinery updated successfully' });
  } catch (error) {
    console.error('Error updating machinery:', error);
    res.status(500).json({ success: false, message: 'Failed to update machinery' });
  }
});

// DELETE /api/machinery/inventory/:id - Delete machinery (Admin or President only)
router.delete('/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // Verify token and get user role
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization token required' });
    }

    const jwt = require('jsonwebtoken');
    let userRole = 'guest';
    let userBarangayId = null;
    let userId = null;

    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      userRole = decoded.role;
      userBarangayId = decoded.barangay_id;
      userId = decoded.id;
      
      // Verify user role from database
      const [user] = await pool.execute('SELECT role, barangay_id FROM farmers WHERE id = ?', [userId]);
      if (user.length === 0 || !['admin', 'president'].includes(user[0].role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only admin and president can delete machinery' 
        });
      }
      userRole = user[0].role;
      userBarangayId = user[0].barangay_id;
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Get machinery to check barangay
    const [machinery] = await pool.execute('SELECT barangay_id FROM machinery_inventory WHERE id = ?', [id]);
    if (machinery.length === 0) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }

    // For president, enforce barangay isolation
    if (userRole === 'president' && userBarangayId !== machinery[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: `President can only delete machinery in barangay ${userBarangayId}` 
      });
    }
    
    // Check if machinery has active bookings
    const [activeBookings] = await pool.execute(
      `SELECT id FROM machinery_bookings 
       WHERE machinery_id = ? AND status IN ('Pending', 'Approved')`,
      [id]
    );
    
    if (activeBookings.length > 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Cannot delete machinery with active bookings' 
      });
    }
    
    const [result] = await pool.execute(
      'DELETE FROM machinery_inventory WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }
    
    res.json({ success: true, message: 'Machinery deleted successfully' });
  } catch (error) {
    console.error('Error deleting machinery:', error);
    res.status(500).json({ success: false, message: 'Failed to delete machinery' });
  }
});

// ========================================
// MACHINERY OPERATORS ROUTES
// ========================================

// GET /api/machinery/operators/eligible - List operators available for assignment in a barangay
router.get('/operators/eligible', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ success: false, message: 'Authorization required' });
    }

    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, JWT_SECRET);
    const [user] = await pool.execute(
      'SELECT role, barangay_id FROM farmers WHERE id = ?',
      [decoded.id]
    );

    if (user.length === 0 || !['president', 'admin'].includes(user[0].role)) {
      return res.status(403).json({ success: false, message: 'President or admin access only' });
    }

    const barangayId =
      user[0].role === 'president'
        ? user[0].barangay_id
        : (req.query.barangay_id || user[0].barangay_id);
    if (!barangayId) {
      return res.json({ success: true, operators: [] });
    }

    const [operators] = await pool.execute(
      `SELECT id, full_name, reference_number, phone_number, role
       FROM farmers
       WHERE role = 'operator' AND barangay_id = ? AND status = 'approved'
       ORDER BY full_name`,
      [barangayId]
    );

    res.json({ success: true, operators });
  } catch (error) {
    console.error('Error fetching eligible operators:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch eligible operators' });
  }
});

// GET /api/machinery/operators - Get all operators
router.get('/operators', async (req, res) => {
  try {
    const { machinery_id, status } = req.query;
    
    let query = `
      SELECT 
        mo.*,
        f.full_name as operator_name,
        f.reference_number,
        f.phone_number,
        mi.machinery_name,
        mi.machinery_type
      FROM machinery_operators mo
      JOIN farmers f ON mo.farmer_id = f.id
      JOIN machinery_inventory mi ON mo.machinery_id = mi.id
      WHERE 1=1
    `;
    const params = [];
    
    if (machinery_id) {
      query += ' AND mo.machinery_id = ?';
      params.push(machinery_id);
    }
    
    if (status) {
      query += ' AND mo.status = ?';
      params.push(status);
    }
    
    query += ' ORDER BY mo.assigned_date DESC';
    
    const [operators] = await pool.execute(query, params);
    res.json({ success: true, operators });
  } catch (error) {
    console.error('Error fetching operators:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch operators' });
  }
});

// POST /api/machinery/operators - Assign operator to machinery
router.post('/operators', async (req, res) => {
  try {
    const { farmer_id, machinery_id, assigned_date } = req.body;
    
    if (!farmer_id || !machinery_id || !assigned_date) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: farmer_id, machinery_id, assigned_date' 
      });
    }
    
    // Check if farmer exists and has operator role
    const [farmer] = await pool.execute(
      'SELECT id, role FROM farmers WHERE id = ?',
      [farmer_id]
    );
    
    if (farmer.length === 0) {
      return res.status(404).json({ success: false, message: 'Farmer not found' });
    }
    
    if (!["operator", "operation_manager", "business_manager"].includes(farmer[0].role)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Farmer must have operator, Operation Manager, or Business Manager role' 
      });
    }
    
    const [result] = await pool.execute(
      `INSERT INTO machinery_operators (farmer_id, machinery_id, assigned_date, status)
       VALUES (?, ?, ?, 'Active')
       ON DUPLICATE KEY UPDATE status = 'Active', assigned_date = VALUES(assigned_date)`,
      [farmer_id, machinery_id, assigned_date]
    );

    // Sync primary assignment on machinery inventory
    await pool.execute(
      `UPDATE machinery_operators SET status = 'Inactive' WHERE machinery_id = ? AND farmer_id != ?`,
      [machinery_id, farmer_id]
    );

    const [machineryRow] = await pool.execute(
      'SELECT barangay_id FROM machinery_inventory WHERE id = ?',
      [machinery_id]
    );

    if (machineryRow.length > 0) {
      await pool.execute(
        `UPDATE machinery_inventory
         SET assigned_operator_id = ?, assignment_date = ?
         WHERE id = ?`,
        [farmer_id, assigned_date, machinery_id]
      );
    }
    
    res.json({ 
      success: true, 
      message: 'Operator assigned successfully',
      operator_id: result.insertId 
    });
  } catch (error) {
    console.error('Error assigning operator:', error);
    res.status(500).json({ success: false, message: 'Failed to assign operator' });
  }
});

// PUT /api/machinery/operators/:id - Update operator status
router.put('/operators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    
    const [result] = await pool.execute(
      'UPDATE machinery_operators SET status = ? WHERE id = ?',
      [status, id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Operator assignment not found' });
    }
    
    res.json({ success: true, message: 'Operator status updated successfully' });
  } catch (error) {
    console.error('Error updating operator:', error);
    res.status(500).json({ success: false, message: 'Failed to update operator' });
  }
});

// DELETE /api/machinery/operators/:id - Remove operator assignment
router.delete('/operators/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const [result] = await pool.execute(
      'DELETE FROM machinery_operators WHERE id = ?',
      [id]
    );
    
    if (result.affectedRows === 0) {
      return res.status(404).json({ success: false, message: 'Operator assignment not found' });
    }
    
    res.json({ success: true, message: 'Operator removed successfully' });
  } catch (error) {
    console.error('Error removing operator:', error);
    res.status(500).json({ success: false, message: 'Failed to remove operator' });
  }
});

// ========================================
// MACHINERY BOOKINGS ROUTES
// ========================================

// Helper function to calculate booking price
const calculateBookingPrice = (machinery, areaSize, areaUnit, membershipStatus = 'member', userBarangayId = null) => {
  const useNonMemberRate = shouldUseNonMemberRate(
    membershipStatus,
    userBarangayId,
    machinery.barangay_id
  );

  let pricePerUnit;

  if (useNonMemberRate && machinery.non_member_price) {
    pricePerUnit = parseFloat(machinery.non_member_price);
  } else if (!useNonMemberRate && machinery.member_price) {
    pricePerUnit = parseFloat(machinery.member_price);
  } else if (useNonMemberRate) {
    pricePerUnit = parseFloat(machinery.price_per_unit) * 1.25;
  } else {
    pricePerUnit = parseFloat(machinery.price_per_unit);
  }
  
  const size = parseFloat(areaSize);
  
  // Validate that booking unit matches machinery capacity unit
  if (machinery.capacity_unit && areaUnit !== machinery.capacity_unit) {
    throw new Error(`This machinery must be booked in ${machinery.capacity_unit}, not ${areaUnit}`);
  }
  
  // Validate capacity limits
  if (machinery.max_capacity) {
    const maxCap = parseFloat(machinery.max_capacity);
    if (size > maxCap) {
      throw new Error(`Maximum capacity for ${machinery.machinery_type} is ${maxCap} ${machinery.capacity_unit} per day`);
    }
  }
  
  // IMPROVED: Handle 'per load' pricing (flat rate) vs per unit pricing
  if (machinery.unit_type === 'per load') {
    // Flat rate for entire load (e.g., Dryer: ₱7,500 for up to 100 kabans)
    return pricePerUnit;
  } else {
    // Per unit pricing (e.g., Tractor: ₱500 per hectare = 60 × 500)
    return pricePerUnit * size;
  }
};

// Helper function to check booking availability
const checkBookingAvailability = async (machineryId, bookingDate, areaSize, excludeBookingId = null) => {
  const blockingStatuses = calendarBlockingStatusesSql();
  let query = `SELECT SUM(area_size) as total_booked
     FROM machinery_bookings
     WHERE machinery_id = ? 
     AND booking_date = ? 
     AND status IN (${blockingStatuses})`;
  
  const params = [machineryId, bookingDate];
  
  // Exclude current booking when checking during approval
  if (excludeBookingId) {
    query += ' AND id != ?';
    params.push(excludeBookingId);
  }
  
  const [bookings] = await pool.execute(query, params);
  
  const [machinery] = await pool.execute(
    'SELECT max_capacity FROM machinery_inventory WHERE id = ?',
    [machineryId]
  );
  
  if (machinery.length === 0) {
    throw new Error('Machinery not found');
  }
  
  const maxCapacity = machinery[0].max_capacity;
  if (!maxCapacity) {
    return true; // No capacity limit
  }
  
  const totalBooked = parseFloat(bookings[0].total_booked || 0);
  const requestedSize = parseFloat(areaSize);
  const maxCap = parseFloat(maxCapacity);
  
  console.log(`📊 Capacity check for machinery ${machineryId} on ${bookingDate}:`, {
    maxCapacity: maxCap,
    totalBooked,
    requestedSize,
    totalAfter: totalBooked + requestedSize,
    wouldExceed: (totalBooked + requestedSize) > maxCap
  });
  
  if (totalBooked + requestedSize > maxCap) {
    return false;
  }
  
  return true;
};

// ✅ Helper: safely format a mysql2 DATE value to "YYYY-MM-DD" string
const formatDateToString = (val) => {
  if (!val) return null;
  if (val instanceof Date) {
    const y = val.getFullYear();
    const m = String(val.getMonth() + 1).padStart(2, '0');
    const d = String(val.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  // Already a string — strip any time portion just in case
  return String(val).split('T')[0];
};

async function notifyApprovedBooking({ farmerId, bookingId, operatorId, machineryName, bookingDate }) {
  await createBookingStatusNotification({
    farmerId,
    bookingId,
    status: 'Approved',
    machineryName,
    bookingDate
  });

  if (operatorId) {
    await createOperatorBookingAssignedNotification({
      operatorId,
      bookingId,
      machineryName,
      bookingDate
    });
  }
}

async function insertMachineryBooking({
  farmerId,
  machineryId,
  barangayId,
  bookingDate,
  serviceLocation,
  areaSize,
  areaUnit,
  totalPrice,
  notes,
  status,
  placeId = null,
  approvedBy = null,
  assignedOperatorId = null
}) {
  const columns = [
    'farmer_id',
    'machinery_id',
    'barangay_id',
    'booking_date',
    'service_location',
    'area_size',
    'area_unit',
    'total_price',
    'remaining_balance',
    'notes',
    'status'
  ];
  const values = [
    farmerId,
    machineryId,
    barangayId,
    bookingDate,
    serviceLocation,
    areaSize,
    areaUnit,
    totalPrice,
    totalPrice,
    notes,
    status
  ];
  const placeholders = columns.map(() => '?');

  if (placeId != null) {
    columns.push('barangay_place_id');
    values.push(placeId);
    placeholders.push('?');
  }
  if (approvedBy) {
    columns.push('approved_by', 'approved_date');
    values.push(approvedBy);
    placeholders.push('?', 'NOW()');
  }
  if (assignedOperatorId) {
    columns.push('assigned_operator_id');
    values.push(assignedOperatorId);
    placeholders.push('?');
  }

  const sql = `INSERT INTO machinery_bookings (${columns.join(', ')}) VALUES (${placeholders.join(', ')})`;

  try {
    const [result] = await pool.execute(sql, values);
    return result;
  } catch (insErr) {
    if (insErr.code !== 'ER_BAD_FIELD_ERROR') throw insErr;
    const [result] = await pool.execute(
      `INSERT INTO machinery_bookings
       (farmer_id, machinery_id, barangay_id, booking_date, service_location, area_size,
        area_unit, total_price, remaining_balance, notes, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [farmerId, machineryId, barangayId, bookingDate, serviceLocation, areaSize, areaUnit, totalPrice, totalPrice, notes, status]
    );
    if (approvedBy || assignedOperatorId) {
      try {
        await pool.execute(
          `UPDATE machinery_bookings
           SET approved_by = COALESCE(?, approved_by),
               approved_date = COALESCE(NOW(), approved_date),
               assigned_operator_id = COALESCE(?, assigned_operator_id)
           WHERE id = ?`,
          [approvedBy, assignedOperatorId, result.insertId]
        );
      } catch {
        /* columns may not exist on older schemas */
      }
    }
    return result;
  }
}

// GET /api/machinery/down-payment-settings — barangay machinery down payment on/off + percent
router.get('/down-payment-settings', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    let barangayId = user.barangay_id;
    if (user.role === 'admin' && req.query.barangay_id) {
      barangayId = req.query.barangay_id;
    } else if (req.query.barangay_id && canAccessBarangay(user, req.query.barangay_id)) {
      barangayId = req.query.barangay_id;
    }

    if (!barangayId) {
      return res.json({
        success: true,
        barangay_id: null,
        enabled: false,
        percent: null
      });
    }

    const settings = await getDownPaymentSettings(barangayId);
    res.json({ success: true, ...settings });
  } catch (error) {
    console.error('Error fetching machinery down payment settings:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch down payment settings' });
  }
});

// PATCH /api/machinery/down-payment-settings — President toggles DP and sets percent
router.patch('/down-payment-settings', verifyToken, authorizeRoles(['president']), async (req, res) => {
  try {
    const barangayId = req.user?.barangay_id;
    if (!barangayId) {
      return res.status(400).json({
        success: false,
        message: 'President must have an assigned barangay to manage machinery down payment.'
      });
    }

    const hasEnabled = typeof req.body?.enabled === 'boolean';
    const hasPercent = Object.prototype.hasOwnProperty.call(req.body || {}, 'percent');
    if (!hasEnabled && !hasPercent) {
      return res.status(400).json({
        success: false,
        message: 'Request body must include enabled and/or percent.'
      });
    }

    const payload = {};
    if (hasEnabled) payload.enabled = req.body.enabled;
    if (hasPercent) payload.percent = req.body.percent;

    const settings = await setDownPaymentSettings(barangayId, payload);
    const pctLabel = formatDownPaymentPercentLabel(settings.percent);

    res.json({
      success: true,
      ...settings,
      message: settings.enabled
        ? `Machinery down payment is ON. Farmers pay ${pctLabel}% before the booking is reserved.`
        : 'Machinery down payment is OFF. Farmers pay after the service is completed.'
    });
  } catch (error) {
    console.error('Error updating machinery down payment settings:', error);
    res.status(error.status || 500).json({
      success: false,
      message: error.message || 'Failed to update down payment settings'
    });
  }
});

// GET /api/machinery/bookable-farmers - Farmers a manager can book on behalf of
router.get('/bookable-farmers', verifyToken, async (req, res) => {
  try {
    if (!canCreateBookingOnBehalf(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Operations Managers, Business Managers, or Admin can create bookings on behalf of farmers.'
      });
    }

    const rolePlaceholders = MACHINERY_BOOKING_ROLES.map(() => '?').join(', ');
    let query = `
      SELECT f.id, f.full_name, f.reference_number, f.phone_number, f.role,
             f.barangay_id, f.membership_status, f.status, b.name AS barangay_name
      FROM farmers f
      LEFT JOIN barangays b ON f.barangay_id = b.id
      WHERE LOWER(f.status) = 'approved'
        AND f.role IN (${rolePlaceholders})
    `;
    const params = [...MACHINERY_BOOKING_ROLES];

    if (req.user.role !== 'admin') {
      if (!req.user.barangay_id) {
        return res.status(403).json({
          success: false,
          message: 'Your account is not assigned to a barangay.'
        });
      }
      query += ' AND f.barangay_id = ?';
      params.push(req.user.barangay_id);
    }

    if (req.user.id) {
      query += ' AND f.id != ?';
      params.push(req.user.id);
    }

    query += ' ORDER BY f.full_name ASC';
    const [farmers] = await pool.execute(query, params);

    res.json({ success: true, farmers });
  } catch (error) {
    console.error('Error fetching bookable farmers:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch farmers' });
  }
});

// GET /api/machinery/bookings - Get all bookings with barangay filtering
router.get('/bookings', async (req, res) => {
  try {
    await syncExpiredMachineryBookings();

    // Get user from token for barangay filtering
    const token = req.headers.authorization?.split(' ')[1];
    let userRole = 'guest';
    let userBarangayId = null;
    let userId = null;
    const jwt = require('jsonwebtoken');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role || 'guest';
        userBarangayId = decoded.barangay_id;
        userId = decoded.id;
        
        // IMPORTANT: Verify user's barangay from database to ensure it's current
        if (userId && userRole !== 'admin') {
          const [user] = await pool.execute(
            'SELECT role, barangay_id FROM farmers WHERE id = ?',
            [userId]
          );
          if (user.length > 0) {
            userRole = user[0].role;
            userBarangayId = user[0].barangay_id;
          }
        }
      } catch (err) {
        console.error('Token verification error:', err.message);
        // Token invalid, proceed with guest view
      }
    }

    const { farmer_id, machinery_id, status, payment_status, start_date, end_date, barangay_id, limit = 100 } = req.query;
    
    let query = `
      SELECT 
        mb.*,
        f.full_name as farmer_name,
        f.reference_number,
        f.phone_number as farmer_phone,
        f.barangay_id as farmer_barangay,
        mi.machinery_name,
        mi.machinery_type,
        a.full_name as approved_by_name,
        cb.full_name as completed_by_name,
        ao.full_name as assigned_operator_name,
        b.name as barangay_name,
        COALESCE(b.machinery_down_payment_enabled, 0) AS barangay_down_payment_enabled,
        b.machinery_down_payment_percent AS barangay_down_payment_percent
      FROM machinery_bookings mb
      JOIN farmers f ON mb.farmer_id = f.id
      JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      LEFT JOIN farmers a ON mb.approved_by = a.id
      LEFT JOIN farmers cb ON mb.completed_by = cb.id
      LEFT JOIN farmers ao ON mb.assigned_operator_id = ao.id
      LEFT JOIN barangays b ON mb.barangay_id = b.id
      WHERE 1=1
    `;
    const params = [];
    
    if (farmer_id) {
      query += ' AND mb.farmer_id = ?';
      params.push(farmer_id);
    }
    
    if (machinery_id) {
      query += ' AND mb.machinery_id = ?';
      params.push(machinery_id);
    }
    
    if (status) {
      if (status === 'Completed') {
        query += ' AND mb.status IN (?, ?)';
        params.push('In Use', 'Completed');
      } else if (status === 'Assigned to Operator' || (status === 'Approved' && userRole === 'operator')) {
        query += ` AND mb.status IN (${OPERATOR_WORK_STATUSES.map(() => '?').join(', ')})`;
        params.push(...OPERATOR_WORK_STATUSES);
      } else {
        query += ' AND mb.status = ?';
        params.push(status);
      }
    }
    
    if (payment_status) {
      query += ' AND mb.payment_status = ?';
      params.push(payment_status);
    }
    
    if (start_date) {
      query += ' AND mb.booking_date >= ?';
      params.push(start_date);
    }
    
    if (end_date) {
      query += ' AND mb.booking_date <= ?';
      params.push(end_date);
    }

    const isOwnBookingsQuery =
      farmer_id &&
      userId &&
      parseInt(farmer_id, 10) === parseInt(userId, 10);

    if (isOwnBookingsQuery) {
      // farmer_id filter already applied — show all bookings for this user (including cross-barangay)
    } else if (userRole === 'operation_manager' || userRole === 'business_manager') {
      if (!userBarangayId) {
        query += ' AND 1=0';
      } else {
        query += ' AND mb.barangay_id = ? AND f.barangay_id = ?';
        params.push(userBarangayId, userBarangayId);
      }
    } else if (userRole === 'president') {
      if (!userBarangayId) {
        query += ' AND 1=0';
      } else {
        query += ' AND mb.barangay_id = ? AND f.barangay_id = ?';
        params.push(userBarangayId, userBarangayId);
      }
    } else if (userRole === 'farmer') {
      if (!userId) {
        query += ' AND 1=0';
      } else {
        query += ' AND mb.farmer_id = ?';
        params.push(userId);
      }
    } else if (userRole === 'operator') {
      if (!userId) {
        query += ' AND 1=0';
      } else {
        query += ` AND mb.assigned_operator_id = ? AND mb.status IN ('Approved', 'Assigned to Operator', 'Booking Confirmed', 'In Use', 'Awaiting Final Payment', 'Completed', 'Incomplete')`;
        params.push(userId);
      }
    } else if (userRole === 'treasurer' || userRole === 'auditor' || userRole === 'agriculturist') {
      if (!userBarangayId) {
        query += ' AND 1=0';
      } else {
        query += ' AND mb.barangay_id = ?';
        params.push(userBarangayId);
      }
    } else if (userRole === 'admin' && barangay_id) {
      query += ' AND mb.barangay_id = ?';
      params.push(parseInt(barangay_id, 10));
    } else if (userRole !== 'admin') {
      query += ' AND 1=0';
    }
    
    query += ` ORDER BY mb.booking_date DESC, mb.created_at DESC LIMIT ${sqlLimit(limit, 100, 500)}`;
    
    const [bookings] = await pool.execute(query, params);
    
    console.log(`📥 Fetched ${bookings.length} bookings for ${userRole} (ID: ${userId}, Barangay: ${userBarangayId})`);
    
    res.json({ 
      success: true, 
      bookings, 
      filtered_by_barangay: userRole !== 'admin', 
      user_role: userRole,
      user_barangay: userBarangayId
    });
  } catch (error) {
    console.error('Error fetching bookings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch bookings',
      details: error.sqlMessage || error.message
    });
  }
});

// GET /api/machinery/bookings/pending-down-payments - Treasurer/President payment queue
router.get('/bookings/pending-down-payments', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (!['treasurer', 'president', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Treasurer or President access only' });
    }

    const { barangay_id } = req.query;
    const effectiveBarangay = user.role === 'admin' && barangay_id ? barangay_id : user.barangay_id;
    if (!effectiveBarangay && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Your account is not assigned to a barangay.' });
    }

    const bookerFilter = user.role === 'admin' ? null : paymentVerifierBookerFilter(user.role);

    let query = `
      SELECT mb.*, f.full_name AS farmer_name, f.reference_number, f.role AS booker_role,
             mi.machinery_name, mi.machinery_type
      FROM machinery_bookings mb
      JOIN farmers f ON mb.farmer_id = f.id
      JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      WHERE mb.status IN ('Awaiting Down Payment', 'Awaiting Payment Verification', 'Payment Rejected')`;
    const params = [];
    if (effectiveBarangay) {
      query += ' AND mb.barangay_id = ?';
      params.push(effectiveBarangay);
    }
    if (bookerFilter) {
      query += ` AND ${bookerFilter}`;
    }
    query += ` ORDER BY FIELD(mb.status, 'Awaiting Payment Verification', 'Awaiting Down Payment', 'Payment Rejected'),
                       COALESCE(mb.down_payment_submitted_at, mb.approved_date, mb.created_at) DESC`;

    const [bookings] = await pool.execute(query, params);
    res.json({ success: true, bookings });
  } catch (error) {
    console.error('Error fetching pending down payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending payments' });
  }
});

// GET /api/machinery/bookings/pending-balance-payments - Treasurer/President balance payment queue
router.get('/bookings/pending-balance-payments', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (!['treasurer', 'president', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Treasurer or President access only' });
    }

    const { barangay_id } = req.query;
    const effectiveBarangay = user.role === 'admin' && barangay_id ? barangay_id : user.barangay_id;
    if (!effectiveBarangay && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Your account is not assigned to a barangay.' });
    }

    const bookerFilter = user.role === 'admin' ? null : paymentVerifierBookerFilter(user.role);

    let query = `
      SELECT s.*, mb.total_price, mb.total_paid, mb.remaining_balance, mb.booking_date, mb.status AS booking_status,
             f.full_name AS farmer_name, f.reference_number, f.role AS booker_role,
             mi.machinery_name, mi.machinery_type
      FROM machinery_balance_payment_submissions s
      JOIN machinery_bookings mb ON s.booking_id = mb.id
      JOIN farmers f ON mb.farmer_id = f.id
      JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      WHERE s.status = 'Awaiting Payment Verification'`;
    const params = [];
    if (effectiveBarangay) {
      query += ' AND mb.barangay_id = ?';
      params.push(effectiveBarangay);
    }
    if (bookerFilter) {
      query += ` AND ${bookerFilter}`;
    }
    query += ' ORDER BY s.submitted_at DESC';

    const [submissions] = await pool.execute(query, params);
    res.json({ success: true, submissions });
  } catch (error) {
    console.error('Error fetching pending balance payments:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch pending balance payments' });
  }
});

// GET /api/machinery/receipts/:receiptNumber - Printable receipt data
router.get('/receipts/:receiptNumber', verifyToken, async (req, res) => {
  try {
    const receipt = await getPaymentReceipt(pool, req.params.receiptNumber);
    if (!receipt) {
      return res.status(404).json({ success: false, message: 'Receipt not found' });
    }
    if (!canAccessBarangay(req.user, receipt.barangay_id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only access receipts from your assigned barangay.'
      });
    }
    res.json({ success: true, receipt });
  } catch (error) {
    console.error('Error fetching receipt:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch receipt' });
  }
});

// GET /api/machinery/bookings/refund-requests - Treasurer/President refund queue
router.get('/bookings/refund-requests', verifyToken, async (req, res) => {
  try {
    const user = req.user;
    if (!['treasurer', 'president', 'admin'].includes(user.role)) {
      return res.status(403).json({ success: false, message: 'Treasurer or President access only' });
    }

    const { barangay_id, status } = req.query;
    const effectiveBarangay = user.role === 'admin' && barangay_id ? barangay_id : user.barangay_id;
    if (!effectiveBarangay && user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Your account is not assigned to a barangay.' });
    }
    const statusFilter = status || 'active';
    const bookerFilter = user.role === 'admin' ? null : paymentVerifierBookerFilter(user.role);

    let query = `
      SELECT r.*, mb.booking_date, mb.status AS booking_status, mb.machinery_id, mb.barangay_id,
             f.full_name AS farmer_name, f.role AS booker_role, mi.machinery_name,
             rev.full_name AS reviewed_by_name, app.full_name AS approved_by_name
      FROM machinery_booking_refunds r
      JOIN machinery_bookings mb ON r.booking_id = mb.id
      JOIN farmers f ON r.farmer_id = f.id
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      LEFT JOIN farmers rev ON r.reviewed_by = rev.id
      LEFT JOIN farmers app ON r.approved_by = app.id
      WHERE 1=1`;
    const params = [];

    if (statusFilter === 'active') {
      query += ` AND r.refund_status IN ('Refund Requested','Under Review','Approved','Pending')`;
    } else if (statusFilter !== 'all') {
      query += ' AND r.refund_status = ?';
      params.push(statusFilter);
    }

    if (effectiveBarangay) {
      query += ' AND mb.barangay_id = ?';
      params.push(effectiveBarangay);
    }
    if (bookerFilter) {
      query += ` AND ${bookerFilter}`;
    }

    query += ' ORDER BY r.requested_at DESC, r.created_at DESC';

    const [refunds] = await pool.execute(query, params);
    res.json({ success: true, refunds });
  } catch (error) {
    console.error('Error fetching refund requests:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch refund requests' });
  }
});

// POST /api/machinery/bookings/:id/request-refund - Farmer requests down payment refund
router.post('/bookings/:id/request-refund', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { farmer_id, refund_reason } = req.body;

    if (!farmer_id || !refund_reason || !String(refund_reason).trim()) {
      return res.status(400).json({ success: false, message: 'farmer_id and refund_reason are required' });
    }

    const [booking] = await pool.execute(
      `SELECT mb.*, f.full_name AS farmer_name, f.role AS booker_role, mi.machinery_name, mi.barangay_id
       FROM machinery_bookings mb
       JOIN farmers f ON mb.farmer_id = f.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }
    if (parseInt(booking[0].farmer_id, 10) !== parseInt(farmer_id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only request refunds for your own bookings' });
    }
    const verifierRole = getPaymentVerifierRole(booking[0].booker_role);
    const verifierLabel = verifierRole === 'president' ? 'President' : 'Treasurer';

    const eligibility = isRefundEligible(booking[0]);
    if (!eligibility.eligible) {
      return res.status(400).json({ success: false, message: eligibility.reason });
    }

    const [existing] = await pool.execute(
      'SELECT * FROM machinery_booking_refunds WHERE booking_id = ?',
      [id]
    );
    if (existing.length > 0) {
      const st = existing[0].refund_status;
      if (['Refund Requested', 'Under Review', 'Approved', 'Pending', 'Refunded', 'Processed'].includes(st)) {
        return res.status(400).json({
          success: false,
          message: `A refund request already exists with status: ${st}`
        });
      }
    }

    const refundNumber = await generateRefundNumber();
    const refundAmount = eligibility.refundAmount;

    if (existing.length > 0 && existing[0].refund_status === 'Rejected') {
      await pool.execute(
        `UPDATE machinery_booking_refunds
         SET refund_number = ?, refund_amount = ?, original_down_payment = ?, refund_reason = ?,
             reason = ?, refund_status = 'Refund Requested', requested_at = NOW(),
             reviewed_by = NULL, reviewed_at = NULL, approved_by = NULL, rejection_reason = NULL,
             machinery_id = ?, machinery_name = ?, farmer_name = ?
         WHERE booking_id = ?`,
        [
          refundNumber, refundAmount, refundAmount, refund_reason, refund_reason,
          booking[0].machinery_id, booking[0].machinery_name, booking[0].farmer_name, id
        ]
      );
    } else {
      await pool.execute(
        `INSERT INTO machinery_booking_refunds
         (booking_id, farmer_id, refund_number, refund_amount, original_down_payment, refund_reason, reason,
          refund_status, requested_at, machinery_id, machinery_name, farmer_name)
         VALUES (?, ?, ?, ?, ?, ?, ?, 'Refund Requested', NOW(), ?, ?, ?)`,
        [
          id, farmer_id, refundNumber, refundAmount, refundAmount, refund_reason, refund_reason,
          booking[0].machinery_id, booking[0].machinery_name, booking[0].farmer_name
        ]
      );
    }

    const [verifiers] = await pool.execute(
      `SELECT id FROM farmers WHERE role = ? AND barangay_id = ? AND status = 'approved'`,
      [verifierRole, booking[0].barangay_id]
    );
    for (const v of verifiers) {
      await createTreasurerRefundRequestedNotification({
        treasurerId: v.id,
        bookingId: id,
        farmerName: booking[0].farmer_name,
        machineryName: booking[0].machinery_name,
        refundAmount,
        refundNumber
      });
    }

    res.json({
      success: true,
      message: `Refund request submitted for ${verifierLabel} review`,
      refund_number: refundNumber,
      refund_status: 'Refund Requested'
    });
  } catch (error) {
    console.error('Error requesting refund:', error);
    res.status(500).json({ success: false, message: 'Failed to submit refund request' });
  }
});

// PUT /api/machinery/refunds/:id/review - Treasurer/President approves or rejects refund
router.put('/refunds/:id/review', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { reviewed_by, action, rejection_reason } = req.body;
    const actorId = reviewed_by || req.user.id;
    if (parseInt(actorId, 10) !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only review refunds as yourself.' });
    }

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'action (approve|reject) required' });
    }

    if (!['treasurer', 'president', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Treasurer or President access only' });
    }

    const [refund] = await pool.execute(
      `SELECT r.*, mb.barangay_id, mb.farmer_id, mi.machinery_name, mb.booking_date, f.role AS booker_role
       FROM machinery_booking_refunds r
       JOIN machinery_bookings mb ON r.booking_id = mb.id
       JOIN farmers f ON mb.farmer_id = f.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE r.id = ?`,
      [id]
    );
    if (refund.length === 0) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    if (!canAccessBarangay(req.user, refund[0].barangay_id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only review refunds from your assigned barangay.'
      });
    }

    const accessCheck = assertCanVerifyMachineryPayment(
      req.user,
      refund[0].farmer_id,
      refund[0].booker_role,
      refund[0].barangay_id,
      'refund'
    );
    if (!accessCheck.ok) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    if (!['Refund Requested', 'Under Review', 'Pending'].includes(refund[0].refund_status)) {
      return res.status(400).json({ success: false, message: `Cannot review refund in status: ${refund[0].refund_status}` });
    }

    if (action === 'reject') {
      if (!rejection_reason || !String(rejection_reason).trim()) {
        return res.status(400).json({ success: false, message: 'rejection_reason is required' });
      }
      await pool.execute(
        `UPDATE machinery_booking_refunds
         SET refund_status = 'Rejected', reviewed_by = ?, reviewed_at = NOW(), rejection_reason = ?
         WHERE id = ?`,
        [actorId, rejection_reason, id]
      );
      await createBookingStatusNotification({
        farmerId: refund[0].farmer_id,
        bookingId: refund[0].booking_id,
        status: 'Refund Rejected',
        machineryName: refund[0].machinery_name,
        bookingDate: refund[0].booking_date
      });
      return res.json({ success: true, message: 'Refund request rejected', refund_status: 'Rejected' });
    }

    await pool.execute(
      `UPDATE machinery_booking_refunds
       SET refund_status = 'Approved', reviewed_by = ?, reviewed_at = NOW(),
           approved_by = ?, rejection_reason = NULL
       WHERE id = ?`,
      [actorId, actorId, id]
    );

    res.json({ success: true, message: 'Refund approved. Process payment to complete.', refund_status: 'Approved' });
  } catch (error) {
    console.error('Error reviewing refund:', error);
    res.status(500).json({ success: false, message: 'Failed to review refund' });
  }
});

// PUT /api/machinery/refunds/:id/process - Treasurer/President marks refund as paid
router.put('/refunds/:id/process', verifyToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { processed_by, refund_date, remarks } = req.body;
    const actorId = processed_by || req.user.id;
    if (parseInt(actorId, 10) !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only process refunds as yourself.' });
    }

    if (!['treasurer', 'president', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Treasurer or President access only' });
    }

    const [refund] = await pool.execute(
      `SELECT r.*, mb.farmer_id, mb.barangay_id, mi.machinery_name, mb.booking_date, f.role AS booker_role
       FROM machinery_booking_refunds r
       JOIN machinery_bookings mb ON r.booking_id = mb.id
       JOIN farmers f ON mb.farmer_id = f.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE r.id = ?`,
      [id]
    );
    if (refund.length === 0) {
      return res.status(404).json({ success: false, message: 'Refund not found' });
    }

    if (!canAccessBarangay(req.user, refund[0].barangay_id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only process refunds from your assigned barangay.'
      });
    }

    const accessCheck = assertCanVerifyMachineryPayment(
      req.user,
      refund[0].farmer_id,
      refund[0].booker_role,
      refund[0].barangay_id,
      'refund'
    );
    if (!accessCheck.ok) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    if (refund[0].refund_status !== 'Approved') {
      return res.status(400).json({ success: false, message: 'Only approved refunds can be processed' });
    }

    const payDate = refund_date || formatLocalDate(new Date());
    const receipt = await generateReceiptNumber(pool);
    const refundAmount = Math.abs(parseFloat(refund[0].refund_amount));
    const beneficiaryName = refund[0].farmer_name || refund[0].client_name;
    const paymentFor = `Down payment refund — Booking #${refund[0].booking_id}${refund[0].machinery_name ? ` (${refund[0].machinery_name})` : ''}`;

    await pool.execute(
      `UPDATE machinery_booking_refunds
       SET refund_status = 'Refunded', processed_by = ?, processed_at = NOW(),
           refund_date = ?, reason = CONCAT(COALESCE(reason,''), ?)
       WHERE id = ?`,
      [actorId, payDate, remarks ? `\n[Processed: ${remarks}]` : '', id]
    );

    await pool.execute(
      `INSERT INTO machinery_booking_payments
       (booking_id, payment_type, payment_date, amount, payment_method, receipt_number, remarks, recorded_by)
       VALUES (?, 'refund', ?, ?, 'Cash', ?, ?, ?)`,
      [
        refund[0].booking_id,
        payDate,
        -refundAmount,
        receipt,
        remarks || `${paymentFor} · ${refund[0].refund_number}`,
        actorId
      ]
    );

    await recordPaymentReceipt(pool, {
      receiptNumber: receipt,
      module: 'machinery_refund',
      referenceId: parseInt(id, 10),
      referenceType: 'machinery_booking_refund',
      clientName: beneficiaryName,
      amountPaid: refundAmount,
      remainingBalance: 0,
      paymentMethod: 'Cash',
      paymentDate: payDate,
      collectedBy: actorId,
      barangayId: refund[0].barangay_id,
      remarks: paymentFor,
      metadata: {
        booking_id: refund[0].booking_id,
        refund_number: refund[0].refund_number,
        machinery_name: refund[0].machinery_name
      }
    });

    await reverseMachineryIncomeOnRefund(pool, refund[0].booking_id);

    await deleteNotificationsForBooking(refund[0].booking_id);

    await createBookingStatusNotification({
      farmerId: refund[0].farmer_id,
      bookingId: refund[0].booking_id,
      status: 'Refund Completed',
      machineryName: refund[0].machinery_name,
      bookingDate: refund[0].booking_date
    });

    res.json({
      success: true,
      message: 'Refund processed. Down payment removed from machinery income.',
      refund_status: 'Refunded',
      receipt_number: receipt
    });
  } catch (error) {
    console.error('Error processing refund:', error);
    res.status(500).json({ success: false, message: 'Failed to process refund' });
  }
});

// GET /api/machinery/bookings/:id - Get single booking details with barangay info
router.get('/bookings/:id', async (req, res) => {
  try {
    const { id } = req.params;

    await syncExpiredMachineryBookings({ bookingId: id });
    
    // Get user from token for barangay verification
    const token = req.headers.authorization?.split(' ')[1];
    let userRole = 'guest';
    let userBarangayId = null;
    let userId = null;
    const jwt = require('jsonwebtoken');
    
    if (token) {
      try {
        const decoded = jwt.verify(token, JWT_SECRET);
        userRole = decoded.role || 'guest';
        userBarangayId = decoded.barangay_id;
        userId = decoded.id;

        if (userId && userRole !== 'admin') {
          const [user] = await pool.execute(
            'SELECT role, barangay_id FROM farmers WHERE id = ?',
            [userId]
          );
          if (user.length > 0) {
            userRole = user[0].role;
            userBarangayId = user[0].barangay_id;
          }
        }
      } catch (err) {
        // Token invalid
      }
    }
    
    const [booking] = await pool.execute(
      `SELECT 
        mb.*,
        f.full_name as farmer_name,
        f.reference_number,
        f.phone_number as farmer_phone,
        f.address as farmer_address,
        f.barangay_id as farmer_barangay,
        mi.machinery_name,
        mi.machinery_type,
        mi.price_per_unit,
        mi.unit_type,
        mi.assigned_operator_id as machinery_assigned_operator_id,
        a.full_name as approved_by_name,
        ao.full_name as assigned_operator_name,
        b.name as barangay_name,
        COALESCE(b.machinery_down_payment_enabled, 0) AS barangay_down_payment_enabled,
        b.machinery_down_payment_percent AS barangay_down_payment_percent
      FROM machinery_bookings mb
      JOIN farmers f ON mb.farmer_id = f.id
      JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      LEFT JOIN farmers a ON mb.approved_by = a.id
      LEFT JOIN farmers ao ON mb.assigned_operator_id = ao.id
      LEFT JOIN barangays b ON mb.barangay_id = b.id
      WHERE mb.id = ?`,
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const isBooker =
      userId && parseInt(booking[0].farmer_id, 10) === parseInt(userId, 10);

    if (isBooker) {
      // Booker may view their own booking (including cross-barangay rentals)
    } else if (userRole === 'farmer') {
      if (!userId || parseInt(booking[0].farmer_id, 10) !== parseInt(userId, 10)) {
        return res.status(403).json({
          success: false,
          message: 'You can only access your own bookings.'
        });
      }
    } else if (userRole === 'operator') {
      const assignedOp = booking[0].assigned_operator_id || booking[0].machinery_assigned_operator_id;
      if (!userId || assignedOp !== userId) {
        return res.status(403).json({
          success: false,
          message: 'You can only access bookings assigned to your machinery.'
        });
      }
    } else if (userRole !== 'admin') {
      if (!userId) {
        return res.status(401).json({ success: false, message: 'Authentication required' });
      }
      if (!userBarangayId) {
        return res.status(403).json({ success: false, message: 'Your account is not assigned to a barangay.' });
      }
      if (parseInt(userBarangayId, 10) !== parseInt(booking[0].barangay_id, 10)) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only access bookings from your assigned barangay.' 
        });
      }
    }

    const [refundRows] = await pool.execute(
      'SELECT * FROM machinery_booking_refunds WHERE booking_id = ? ORDER BY id DESC LIMIT 1',
      [id]
    );
    booking[0].refund = refundRows[0] || null;
    
    res.json({ success: true, booking: booking[0] });
  } catch (error) {
    console.error('Error fetching booking details:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch booking details' });
  }
});

// GET /api/machinery/bookings/farmer-balance/:farmer_id - Check farmer's outstanding balance
router.get('/bookings/farmer-balance/:farmer_id', verifyToken, async (req, res) => {
  try {
    const { farmer_id } = req.params;
    const targetId = parseInt(farmer_id, 10);
    const isSelf = parseInt(req.user.id, 10) === targetId;

    if (!isSelf && req.user.role === 'farmer') {
      return res.status(403).json({ success: false, message: 'Access denied' });
    }
    if (!isSelf && req.user.role !== 'admin') {
      const [farmerRows] = await pool.execute('SELECT barangay_id FROM farmers WHERE id = ?', [farmer_id]);
      if (!farmerRows.length || !canAccessBarangay(req.user, farmerRows[0].barangay_id)) {
        return res.status(403).json({ success: false, message: 'You can only check balances for farmers in your barangay.' });
      }
    }
    
    // Get all completed bookings with unpaid or partial payment status
    const [unpaidBookings] = await pool.execute(
      `SELECT 
        mb.id,
        mb.booking_date,
        mi.machinery_name,
        mi.machinery_type,
        mb.total_price,
        COALESCE(mb.total_paid, 0) as total_paid,
        (mb.total_price - COALESCE(mb.total_paid, 0)) as remaining_balance,
        mb.payment_status
      FROM machinery_bookings mb
      LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
      WHERE mb.farmer_id = ? 
        AND mb.status = 'Completed' 
        AND (mb.payment_status = 'Unpaid' OR mb.payment_status = 'Partial')
        AND (mb.total_price - COALESCE(mb.total_paid, 0)) > 0
      ORDER BY mb.booking_date ASC`,
      [farmer_id]
    );
    
    const totalOutstandingBalance = unpaidBookings.reduce((sum, b) => sum + parseFloat(b.remaining_balance || 0), 0);
    
    res.json({
      success: true,
      has_outstanding_balance: totalOutstandingBalance > 0,
      total_outstanding_balance: parseFloat(totalOutstandingBalance.toFixed(2)),
      unpaid_bookings: unpaidBookings,
      can_book: totalOutstandingBalance <= 0
    });
  } catch (error) {
    console.error('Error checking farmer balance:', error);
    res.status(500).json({ success: false, message: 'Failed to check farmer balance' });
  }
});

// GET /api/machinery/bookings/unavailable-dates/:machinery_id
// ✅ FIXED: mysql2 returns DATE columns as JS Date objects, not strings.
//    We now format them to "YYYY-MM-DD" strings before sending to the frontend.
router.get('/bookings/unavailable-dates/:machinery_id', async (req, res) => {
  try {
    const { machinery_id } = req.params;
    const { start_date, end_date } = req.query;
    
    // Get machinery details to know the max capacity
    const [machinery] = await pool.execute(
      'SELECT max_capacity, capacity_unit FROM machinery_inventory WHERE id = ?',
      [machinery_id]
    );
    
    if (machinery.length === 0) {
      return res.status(404).json({ success: false, message: 'Machinery not found' });
    }
    
    const maxCapacity = machinery[0].max_capacity;
    const capacityUnit = machinery[0].capacity_unit;
    
    // If no capacity limit, return empty array
    if (!maxCapacity) {
      return res.json({ success: true, unavailable_dates: [], partially_available_dates: [], capacity_unit: capacityUnit });
    }
    
    // Default date range: today to 90 days from now
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startDate = start_date || today.toISOString().split('T')[0];
    const endDateObj = new Date(today);
    endDateObj.setDate(endDateObj.getDate() + 90);
    const endDate = end_date || endDateObj.toISOString().split('T')[0];
    
    // Get all fully booked dates (total_booked >= max_capacity)
    const [fullyBookedRows] = await pool.execute(
      `SELECT 
        booking_date, 
        SUM(area_size) as total_booked,
        COUNT(*) as booking_count
      FROM machinery_bookings
      WHERE machinery_id = ? 
        AND booking_date >= ? 
        AND booking_date <= ?
        AND status IN (${calendarBlockingStatusesSql()})
      GROUP BY booking_date
      HAVING total_booked >= ?
      ORDER BY booking_date`,
      [machinery_id, startDate, endDate, maxCapacity]
    );
    
    // ✅ Format booking_date to plain "YYYY-MM-DD" string (fixes mysql2 Date object issue)
    const unavailableDates = fullyBookedRows.map(booking => ({
      date: formatDateToString(booking.booking_date),
      total_booked: parseFloat(booking.total_booked),
      max_capacity: maxCapacity,
      booking_count: booking.booking_count,
      capacity_unit: capacityUnit,
      is_fully_booked: true
    }));
    
    // Get partially booked dates (total_booked < max_capacity)
    const [partialRows] = await pool.execute(
      `SELECT 
        booking_date, 
        SUM(area_size) as total_booked,
        COUNT(*) as booking_count
      FROM machinery_bookings
      WHERE machinery_id = ? 
        AND booking_date >= ? 
        AND booking_date <= ?
        AND status IN (${calendarBlockingStatusesSql()})
      GROUP BY booking_date
      HAVING total_booked < ?
      ORDER BY booking_date`,
      [machinery_id, startDate, endDate, maxCapacity]
    );
    
    // ✅ Same fix for partially available dates
    const partiallyAvailableDates = partialRows.map(booking => ({
      date: formatDateToString(booking.booking_date),
      total_booked: parseFloat(booking.total_booked),
      max_capacity: maxCapacity,
      booking_count: booking.booking_count,
      capacity_unit: capacityUnit,
      remaining_capacity: maxCapacity - parseFloat(booking.total_booked),
      is_fully_booked: false
    }));

    console.log('📅 Unavailable dates (formatted):', unavailableDates.map(d => d.date));
    console.log('📅 Partially available dates (formatted):', partiallyAvailableDates.map(d => d.date));
    
    res.json({
      success: true,
      unavailable_dates: unavailableDates,
      partially_available_dates: partiallyAvailableDates,
      max_capacity: maxCapacity,
      capacity_unit: capacityUnit
    });
  } catch (error) {
    console.error('Error fetching unavailable dates:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch unavailable dates' });
  }
});

// POST /api/machinery/bookings - Create new booking (Farmer)
router.post('/bookings', verifyToken, async (req, res) => {
  try {
    console.log('📝 Received booking request:', req.body);
    
    const {
      farmer_id,
      machinery_id,
      booking_date,
      service_location,
      area_size,
      area_unit,
      notes,
      barangay_place_id
    } = req.body;
    
    if (!farmer_id || !machinery_id || !booking_date || !area_size || !area_unit) {
      console.error('❌ Validation failed. Missing fields:', {
        farmer_id: !!farmer_id,
        machinery_id: !!machinery_id,
        booking_date: !!booking_date,
        area_size: !!area_size,
        area_unit: !!area_unit
      });
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: farmer_id, machinery_id, booking_date, area_size, area_unit' 
      });
    }

    if (!canUserBookMachinery(req.user.role) && !canCreateBookingOnBehalf(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Your role is not permitted to create machinery bookings.'
      });
    }

    const createdByManager = canCreateBookingOnBehalf(req.user.role);
    if (
      !createdByManager &&
      parseInt(farmer_id, 10) !== parseInt(req.user.id, 10)
    ) {
      return res.status(403).json({
        success: false,
        message: 'You can only create bookings for yourself.'
      });
    }

    if (createdByManager && parseInt(farmer_id, 10) === parseInt(req.user.id, 10)) {
      return res.status(400).json({
        success: false,
        message: 'Choose the farmer who requested this booking. It will be saved to their account, not yours.'
      });
    }
    
    console.log('✅ Validation passed. Getting farmer and machinery details...');

    const todayStr = formatLocalDate(new Date());
    if (booking_date < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Cannot create a booking for a date that has already passed'
      });
    }
    
    // Get farmer's barangay AND membership status
    const [farmer] = await pool.execute(
      'SELECT barangay_id, membership_status, role, full_name FROM farmers WHERE id = ?',
      [farmer_id]
    );
    
    if (farmer.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Farmer not found' 
      });
    }

    const userBarangayId = farmer[0].barangay_id;
    const membershipStatus = farmer[0].membership_status || 'member';

    if (!canAccessBarangay(req.user, userBarangayId) && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'You can only create bookings for users in your assigned barangay.'
      });
    }

    let resolvedServiceLocation = typeof service_location === 'string' ? service_location.trim() : '';
    let resolvedPlaceId = null;

    if (barangay_place_id != null && barangay_place_id !== '') {
      const pid = parseInt(barangay_place_id, 10);
      if (Number.isNaN(pid)) {
        return res.status(400).json({ success: false, message: 'Invalid barangay_place_id' });
      }
      try {
        const [plc] = await pool.execute(
          `SELECT id, name, description FROM barangay_service_places 
           WHERE id = ? AND barangay_id = ? AND is_active = 1`,
          [pid, userBarangayId]
        );
        if (plc.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or inactive service place for your barangay'
          });
        }
        resolvedPlaceId = plc[0].id;
        const desc = plc[0].description ? ` — ${plc[0].description}` : '';
        resolvedServiceLocation = `${plc[0].name}${desc}`;
        if (typeof service_location === 'string' && service_location.trim()) {
          resolvedServiceLocation = `${resolvedServiceLocation} (${service_location.trim()})`;
        }
      } catch (placeErr) {
        if (placeErr.code === 'ER_BAD_FIELD_ERROR' || placeErr.code === 'ER_NO_SUCH_TABLE') {
          return res.status(503).json({
            success: false,
            message: 'Service places are not available on this server (database migration required).'
          });
        }
        throw placeErr;
      }
    }

    if (!resolvedServiceLocation) {
      return res.status(400).json({
        success: false,
        message: 'Provide a service location or select a predefined place'
      });
    }
    
    // Check for outstanding balance from completed bookings
    const [unpaidBookings] = await pool.execute(
      `SELECT 
        SUM(mb.total_price - COALESCE(mb.total_paid, 0)) as total_outstanding
      FROM machinery_bookings mb
      WHERE mb.farmer_id = ? 
        AND mb.status = 'Completed' 
        AND (mb.payment_status = 'Unpaid' OR mb.payment_status = 'Partial')
        AND (mb.total_price - COALESCE(mb.total_paid, 0)) > 0`,
      [farmer_id]
    );
    
    const totalOutstanding = parseFloat(unpaidBookings[0]?.total_outstanding || 0);
    if (totalOutstanding > 0) {
      return res.status(403).json({
        success: false,
        message: `You have an outstanding balance of ₱${totalOutstanding.toFixed(2)} from previous bookings. Please settle your balance before booking new machinery.`,
        outstanding_balance: totalOutstanding
      });
    }
    
    // Get machinery details and verify it belongs to the same barangay
    const [machinery] = await pool.execute(
      'SELECT * FROM machinery_inventory WHERE id = ? AND status = "Available"',
      [machinery_id]
    );
    
    if (machinery.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Machinery not available for booking' 
      });
    }

    const prerequisite = await checkMachineryPrerequisite(pool, farmer_id, machinery[0]);
    if (!prerequisite.ok) {
      return res.status(403).json({
        success: false,
        message: prerequisite.message,
        requires_machinery_id: prerequisite.requires_machinery_id,
        requires_machinery_name: prerequisite.requires_machinery_name
      });
    }

    const machineryBarangayId = machinery[0].barangay_id;
    
    // Check availability for the date
    const isAvailable = await checkBookingAvailability(machinery_id, booking_date, area_size, null);
    if (!isAvailable) {
      const blockingStatuses = calendarBlockingStatusesSql();
      const [capRows] = await pool.execute(
        'SELECT max_capacity, capacity_unit FROM machinery_inventory WHERE id = ?',
        [machinery_id]
      );
      const [bookedRows] = await pool.execute(
        `SELECT COALESCE(SUM(area_size), 0) AS total_booked
         FROM machinery_bookings
         WHERE machinery_id = ? AND booking_date = ? AND status IN (${blockingStatuses})`,
        [machinery_id, booking_date]
      );
      const maxCap = parseFloat(capRows[0]?.max_capacity) || 0;
      const booked = parseFloat(bookedRows[0]?.total_booked) || 0;
      const remaining = Math.max(0, maxCap - booked);
      const unit = capRows[0]?.capacity_unit || 'hectares';
      return res.status(400).json({
        success: false,
        message: maxCap
          ? `Only ${remaining} ${unit} available on ${booking_date} for this machinery (max ${maxCap} ${unit}/day). Please request ${remaining} ${unit} or less.`
          : 'Machinery is not available for the requested date and capacity',
        available: remaining,
        max_capacity: maxCap,
        capacity_unit: unit
      });
    }
    
    // Calculate total price based on membership and cross-barangay rules
    let totalPrice;
    try {
      totalPrice = calculateBookingPrice(
        machinery[0],
        area_size,
        area_unit,
        membershipStatus,
        userBarangayId
      );
    } catch (error) {
      return res.status(400).json({ 
        success: false, 
        message: error.message 
      });
    }
    
    const assignedOperatorId = machinery[0].assigned_operator_id || null;
    const autoApprove = createdByManager;

    if (autoApprove && !assignedOperatorId) {
      return res.status(400).json({
        success: false,
        message: 'Assign an operator to this machinery in Inventory before creating an approved booking.'
      });
    }

    const dpSettings = await getDownPaymentSettings(machineryBarangayId);
    let bookingStatus = autoApprove ? 'Approved' : 'Pending';
    let downPaymentAmount = null;
    let downPaymentPercent = null;

    if (autoApprove && dpSettings.enabled) {
      const calc = calculateDownPayment(totalPrice, dpSettings.percent);
      if (!calc.downPayment) {
        return res.status(400).json({
          success: false,
          message: 'Down payment is ON for this barangay, but no percentage is set. The President must enter a down payment percentage first.'
        });
      }
      bookingStatus = 'Awaiting Down Payment';
      downPaymentAmount = calc.downPayment;
      downPaymentPercent = calc.percent;
    }

    const result = await insertMachineryBooking({
      farmerId: farmer_id,
      machineryId: machinery_id,
      barangayId: machineryBarangayId,
      bookingDate: booking_date,
      serviceLocation: resolvedServiceLocation,
      areaSize: area_size,
      areaUnit: area_unit,
      totalPrice,
      notes,
      status: bookingStatus,
      placeId: resolvedPlaceId,
      approvedBy: autoApprove ? req.user.id : null,
      assignedOperatorId: autoApprove && bookingStatus === 'Approved' ? assignedOperatorId : null
    });

    if (downPaymentAmount != null) {
      await pool.execute(
        `UPDATE machinery_bookings
         SET down_payment_amount = ?, down_payment_percent = ?
         WHERE id = ?`,
        [downPaymentAmount, downPaymentPercent, result.insertId]
      );
    }

    console.log(`✅ Booking created successfully! Booking ID: ${result.insertId} status=${bookingStatus} farmer=${farmer_id}`);

    if (autoApprove && bookingStatus === 'Approved') {
      await notifyApprovedBooking({
        farmerId: farmer_id,
        bookingId: result.insertId,
        operatorId: assignedOperatorId,
        machineryName: machinery[0].machinery_name,
        bookingDate: booking_date
      });
    } else if (autoApprove && bookingStatus === 'Awaiting Down Payment') {
      await createBookingStatusNotification({
        farmerId: farmer_id,
        bookingId: result.insertId,
        status: 'Awaiting Down Payment',
        machineryName: machinery[0].machinery_name,
        bookingDate: booking_date,
        downPaymentAmount,
        downPaymentPercent,
        remainingBalance: totalPrice - downPaymentAmount
      });
      await notifyBarangayDownPaymentDue({
        barangayId: machineryBarangayId,
        bookingId: result.insertId,
        farmerName: farmer[0].full_name || null,
        bookerRole: farmer[0].role,
        machineryName: machinery[0].machinery_name,
        amountDue: downPaymentAmount,
        percent: downPaymentPercent,
        bookingDate: booking_date
      });
    }

    const pctLabel = formatDownPaymentPercentLabel(downPaymentPercent);
    res.json({
      success: true,
      message: autoApprove
        ? (bookingStatus === 'Awaiting Down Payment'
          ? `Booking created. The farmer must pay a ${pctLabel}% down payment (₱${Number(downPaymentAmount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}) to reserve the slot.`
          : 'Booking created and approved. It has been assigned to the operator.')
        : 'Booking created successfully. Waiting for Operations Manager or Business Manager approval.',
      booking_id: result.insertId,
      farmer_id: parseInt(farmer_id, 10),
      status: bookingStatus,
      total_price: totalPrice,
      remaining_balance: totalPrice,
      down_payment_amount: downPaymentAmount,
      down_payment_percent: downPaymentPercent,
      assigned_operator_id: bookingStatus === 'Approved' ? assignedOperatorId : null,
      barangay_id: machineryBarangayId,
      user_barangay_id: userBarangayId,
      cross_barangay: shouldUseNonMemberRate(membershipStatus, userBarangayId, machineryBarangayId)
    });
  } catch (error) {
    console.error('Error creating booking:', error);
    res.status(500).json({ success: false, message: 'Failed to create booking', error: error.message });
  }
});

// PUT /api/machinery/bookings/:id/approve - Approve booking
router.put('/bookings/:id/approve', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by } = req.body;

    await syncExpiredMachineryBookings({ bookingId: id });
    
    if (!approved_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'approved_by is required' 
      });
    }
    
    const [manager] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [approved_by]
    );
    
    if (manager.length === 0 || !["operation_manager", "business_manager", "admin"].includes(manager[0].role)) {
      return res.status(403).json({
        success: false,
        message: 'Only Business Managers, Operation Managers, or Admin can approve bookings'
      });
    }

    const [booking] = await pool.execute(
      `SELECT mb.*, mi.machinery_name, f.full_name AS farmer_name, f.role AS booker_role,
              COALESCE(mb.assigned_operator_id, mi.assigned_operator_id) AS resolved_operator_id
       FROM machinery_bookings mb
       LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       LEFT JOIN farmers f ON mb.farmer_id = f.id
       WHERE mb.id = ?`,
      [id]
    );

    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (manager[0].role !== 'admin' && manager[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({
        success: false,
        message: 'You can only approve bookings from your assigned barangay.'
      });
    }

    if (booking[0].status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only pending bookings can be approved' 
      });
    }

    const assignedOperatorId = booking[0].resolved_operator_id || null;
    if (!assignedOperatorId) {
      return res.status(400).json({
        success: false,
        message: 'Assign an operator to this machinery in Inventory before approving the booking.'
      });
    }
    
    const isAvailable = await checkBookingAvailability(
      booking[0].machinery_id, 
      booking[0].booking_date, 
      booking[0].area_size,
      id
    );
    
    if (!isAvailable) {
      return res.status(400).json({ 
        success: false, 
        message: 'Machinery capacity exceeded for this date' 
      });
    }

    const dpSettings = await getDownPaymentSettings(booking[0].barangay_id);
    if (dpSettings.enabled) {
      const calc = calculateDownPayment(booking[0].total_price, dpSettings.percent);
      if (!calc.downPayment) {
        return res.status(400).json({
          success: false,
          message: 'Down payment is ON for this barangay, but no percentage is set. The President must enter a down payment percentage first.'
        });
      }

      const [dpResult] = await pool.execute(
        `UPDATE machinery_bookings
         SET status = 'Awaiting Down Payment',
             approved_by = ?,
             approved_date = NOW(),
             down_payment_amount = ?,
             down_payment_percent = ?,
             remaining_balance = COALESCE(NULLIF(remaining_balance, 0), total_price)
         WHERE id = ?`,
        [approved_by, calc.downPayment, calc.percent, id]
      );

      if (dpResult.affectedRows > 0) {
        await createBookingStatusNotification({
          farmerId: booking[0].farmer_id,
          bookingId: booking[0].id,
          status: 'Awaiting Down Payment',
          machineryName: booking[0].machinery_name,
          bookingDate: booking[0].booking_date,
          downPaymentAmount: calc.downPayment,
          downPaymentPercent: calc.percent,
          remainingBalance: calc.remainingBalance
        });
        await notifyBarangayDownPaymentDue({
          barangayId: booking[0].barangay_id,
          bookingId: booking[0].id,
          farmerName: booking[0].farmer_name,
          bookerRole: booking[0].booker_role,
          machineryName: booking[0].machinery_name,
          amountDue: calc.downPayment,
          percent: calc.percent,
          bookingDate: booking[0].booking_date
        });
      }

      const pctLabel = formatDownPaymentPercentLabel(calc.percent);
      console.log(`✅ Booking ${id} approved pending ${pctLabel}% down payment by ${manager[0].full_name}`);

      return res.json({
        success: true,
        message: `Booking approved. The farmer must pay a ${pctLabel}% down payment (₱${calc.downPayment.toLocaleString('en-PH', { minimumFractionDigits: 2 })}) to reserve the slot.`,
        booking_id: id,
        status: 'Awaiting Down Payment',
        down_payment_amount: calc.downPayment,
        down_payment_percent: calc.percent,
        remaining_balance: booking[0].total_price,
        barangay_verified: true
      });
    }

    const [result] = await pool.execute(
      `UPDATE machinery_bookings 
       SET status = 'Approved', 
           approved_by = ?, 
           approved_date = NOW(),
           assigned_operator_id = ?,
           remaining_balance = COALESCE(NULLIF(remaining_balance, 0), total_price)
       WHERE id = ?`,
      [approved_by, assignedOperatorId, id]
    );

    if (result.affectedRows > 0) {
      await notifyApprovedBooking({
        farmerId: booking[0].farmer_id,
        bookingId: booking[0].id,
        operatorId: assignedOperatorId,
        machineryName: booking[0].machinery_name,
        bookingDate: booking[0].booking_date
      });
    }

    console.log(`✅ Booking ${id} approved and assigned to operator by ${manager[0].full_name} (Barangay: ${booking[0].barangay_id})`);
    
    res.json({ 
      success: true, 
      message: 'Booking approved and assigned to the operator. The farmer will pay the treasurer after the service.',
      booking_id: id,
      status: 'Approved',
      assigned_operator_id: assignedOperatorId,
      remaining_balance: booking[0].total_price,
      barangay_verified: true
    });
  } catch (error) {
    console.error('Error approving booking:', error);
    res.status(500).json({ success: false, message: 'Failed to approve booking' });
  }
});

// PUT /api/machinery/bookings/:id/reject - Reject booking
router.put('/bookings/:id/reject', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { approved_by, rejection_reason } = req.body;

    await syncExpiredMachineryBookings({ bookingId: id });
    
    if (!approved_by || !rejection_reason) {
      return res.status(400).json({ 
        success: false, 
        message: 'approved_by and rejection_reason are required' 
      });
    }
    
    const [manager] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [approved_by]
    );
    
    if (manager.length === 0 || !["operation_manager", "business_manager", "admin"].includes(manager[0].role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only Business Managers, Operation Managers, or Admin can reject bookings' 
      });
    }
    
    const [booking] = await pool.execute(
      `SELECT mb.*, mi.machinery_name, f.full_name AS farmer_name, f.role AS booker_role
       FROM machinery_bookings mb
       LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       LEFT JOIN farmers f ON mb.farmer_id = f.id
       WHERE mb.id = ?`,
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (manager[0].role !== 'admin' && manager[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only reject bookings from your assigned barangay.' 
      });
    }

    const rejectableStatuses = [
      'Pending',
      'Awaiting Down Payment',
      'Awaiting Payment Verification',
      'Payment Rejected',
      'Down Payment Verified'
    ];
    if (!rejectableStatuses.includes(booking[0].status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Only bookings awaiting manager action can be rejected (current: ${booking[0].status})` 
      });
    }

    const hadVerifiedDownPayment =
      Boolean(booking[0].down_payment_verified_at) ||
      (parseFloat(booking[0].down_payment_amount) > 0 &&
        parseFloat(booking[0].total_paid) > 0 &&
        booking[0].status === 'Down Payment Verified');
    
    const [result] = await pool.execute(
      `UPDATE machinery_bookings 
       SET status = 'Rejected', approved_by = ?, rejection_reason = ?, approved_date = NOW()
       WHERE id = ?`,
      [approved_by, rejection_reason, id]
    );

    let refundQueued = false;
    if (result.affectedRows > 0) {
      await createBookingStatusNotification({
        farmerId: booking[0].farmer_id,
        bookingId: booking[0].id,
        status: 'Rejected',
        machineryName: booking[0].machinery_name,
        bookingDate: booking[0].booking_date,
        rejectionReason: rejection_reason
      });

      // Slot unavailable after DP paid → auto-queue refund for treasurer
      if (hadVerifiedDownPayment) {
        const eligibility = isRefundEligible({
          ...booking[0],
          status: 'Rejected',
          machine_used: 0
        });
        if (eligibility.eligible) {
          const [existing] = await pool.execute(
            'SELECT id, refund_status FROM machinery_booking_refunds WHERE booking_id = ?',
            [id]
          );
          const openRefund = existing[0] &&
            ['Refund Requested', 'Under Review', 'Approved', 'Pending', 'Refunded', 'Processed'].includes(
              existing[0].refund_status
            );
          if (!openRefund) {
            const refundNumber = await generateRefundNumber();
            const refundAmount = eligibility.refundAmount;
            const autoReason =
              `Manager rejected booking (slot unavailable / date conflict). ${rejection_reason}`.trim();
            if (existing.length > 0 && existing[0].refund_status === 'Rejected') {
              await pool.execute(
                `UPDATE machinery_booking_refunds
                 SET refund_number = ?, refund_amount = ?, original_down_payment = ?, refund_reason = ?,
                     reason = ?, refund_status = 'Refund Requested', requested_at = NOW(),
                     reviewed_by = NULL, reviewed_at = NULL, approved_by = NULL, rejection_reason = NULL,
                     machinery_id = ?, machinery_name = ?, farmer_name = ?
                 WHERE booking_id = ?`,
                [
                  refundNumber, refundAmount, refundAmount, autoReason, autoReason,
                  booking[0].machinery_id, booking[0].machinery_name, booking[0].farmer_name, id
                ]
              );
            } else if (existing.length === 0) {
              await pool.execute(
                `INSERT INTO machinery_booking_refunds
                 (booking_id, farmer_id, refund_number, refund_amount, original_down_payment, refund_reason, reason,
                  refund_status, requested_at, machinery_id, machinery_name, farmer_name)
                 VALUES (?, ?, ?, ?, ?, ?, ?, 'Refund Requested', NOW(), ?, ?, ?)`,
                [
                  id, booking[0].farmer_id, refundNumber, refundAmount, refundAmount, autoReason, autoReason,
                  booking[0].machinery_id, booking[0].machinery_name, booking[0].farmer_name
                ]
              );
            }
            const verifierRole = getPaymentVerifierRole(booking[0].booker_role);
            const [verifiers] = await pool.execute(
              `SELECT id FROM farmers WHERE role = ? AND barangay_id = ? AND status = 'approved'`,
              [verifierRole, booking[0].barangay_id]
            );
            for (const v of verifiers) {
              await createTreasurerRefundRequestedNotification({
                treasurerId: v.id,
                bookingId: id,
                farmerName: booking[0].farmer_name,
                machineryName: booking[0].machinery_name,
                refundAmount,
                refundNumber
              });
            }
            refundQueued = true;
          }
        }
      }
    }

    console.log(`❌ Booking ${id} rejected by ${manager[0].full_name} (Barangay: ${booking[0].barangay_id})`);
    
    res.json({ 
      success: true, 
      message: refundQueued
        ? 'Booking rejected. Down payment refund was queued for treasurer review.'
        : 'Booking rejected successfully',
      refund_queued: refundQueued,
      barangay_verified: true
    });
  } catch (error) {
    console.error('Error rejecting booking:', error);
    res.status(500).json({ success: false, message: 'Failed to reject booking' });
  }
});

// POST /api/machinery/bookings/:id/payment - Record payment for booking
router.post('/bookings/:id/payment', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      payment_date, 
      amount, 
      receipt_number = null,
      remarks = null,
      recorded_by 
    } = req.body;
    
    if (!payment_date || !amount || !recorded_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: payment_date, amount, recorded_by' 
      });
    }
    
    const [user] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [recorded_by]
    );
    
    if (user.length === 0 || (user[0].role !== 'treasurer' && user[0].role !== 'admin')) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only treasurers or admin can record payments. Access denied.' 
      });
    }
    
    const [booking] = await pool.execute(
      'SELECT * FROM machinery_bookings WHERE id = ?',
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (user[0].role !== 'admin' && user[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only record payments for bookings in your assigned barangay.' 
      });
    }
    
    if (['Cancelled', 'Rejected'].includes(booking[0].status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Cannot record payment for ${booking[0].status} booking` 
      });
    }
    
    const paymentAmount = parseFloat(amount);
    const currentRemainingBalance = parseFloat(booking[0].remaining_balance || booking[0].total_price);
    
    if (paymentAmount > currentRemainingBalance) {
      return res.status(400).json({ 
        success: false, 
        message: `Payment amount (₱${paymentAmount.toFixed(2)}) cannot exceed remaining balance (₱${currentRemainingBalance.toFixed(2)})` 
      });
    }
    
    await pool.execute(
      `INSERT INTO machinery_booking_payments 
       (booking_id, payment_date, amount, receipt_number, remarks, recorded_by)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, payment_date, paymentAmount, receipt_number, remarks, recorded_by]
    );
    
    const newTotalPaid = parseFloat(booking[0].total_paid || 0) + paymentAmount;
    const newRemainingBalance = parseFloat(booking[0].total_price) - newTotalPaid;
    const newPaymentStatus = newRemainingBalance <= 0 ? 'Paid' : 'Partial';
    
    await pool.execute(
      `UPDATE machinery_bookings 
       SET total_paid = ?, 
           remaining_balance = ?, 
           payment_status = ?,
           last_payment_date = ?
       WHERE id = ?`,
      [newTotalPaid, Math.max(0, newRemainingBalance), newPaymentStatus, payment_date, id]
    );

    console.log(`💰 Payment recorded for Booking ${id} by ${user[0].full_name} (Barangay: ${booking[0].barangay_id})`);
    
    res.json({ 
      success: true, 
      message: 'Payment recorded successfully',
      total_paid: parseFloat(newTotalPaid.toFixed(2)),
      remaining_balance: parseFloat(Math.max(0, newRemainingBalance).toFixed(2)),
      payment_status: newPaymentStatus,
      status: booking[0].status,
      barangay_verified: true
    });
  } catch (error) {
    console.error('Error recording payment:', error);
    res.status(500).json({ success: false, message: 'Failed to record payment' });
  }
});

// GET /api/machinery/bookings/:id/payments - Get payment history for a booking
router.get('/bookings/:id/payments', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    
    const [payments] = await pool.execute(
      `SELECT 
        mbp.*,
        f.full_name as recorded_by_name
      FROM machinery_booking_payments mbp
      LEFT JOIN farmers f ON mbp.recorded_by = f.id
      WHERE mbp.booking_id = ?
      ORDER BY mbp.payment_date ASC, mbp.id ASC`,
      [id]
    );

    let history = payments;
    try {
      history = await mergeGcashEventsIntoHistory(pool, {
        transactionType: 'machinery',
        referenceId: id,
        payments
      });
    } catch (mergeErr) {
      console.error('Error merging GCash events into payment history:', mergeErr);
    }
    
    res.json({ success: true, payments: history });
  } catch (error) {
    console.error('Error fetching payment history:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch payment history' });
  }
});

// PUT /api/machinery/bookings/:id/deploy - Deploy equipment
router.put('/bookings/:id/deploy', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id, operational_notes = null } = req.body;
    
    if (!operator_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'operator_id is required' 
      });
    }
    
    const [operator] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [operator_id]
    );
    
    if (operator.length === 0) {
      return res.status(404).json({ success: false, message: 'Operator not found' });
    }
    
    if (operator[0].role !== 'operator') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only operators can deploy equipment' 
      });
    }
    
    const [booking] = await pool.execute(
      'SELECT * FROM machinery_bookings WHERE id = ?',
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (operator[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Operator can only deploy equipment for bookings in their assigned barangay.' 
      });
    }
    
    if (booking[0].status !== 'Approved') {
      return res.status(400).json({ 
        success: false, 
        message: `Equipment can only be deployed from Approved status. Current status: ${booking[0].status}` 
      });
    }
    
    const [result] = await pool.execute(
      `UPDATE machinery_bookings 
       SET status = 'In Use',
           machine_used = 1,
           operational_notes = ?
       WHERE id = ?`,
      [operational_notes, id]
    );

    console.log(`⚙️ Equipment deployed for Booking ${id} by ${operator[0].full_name} (Barangay: ${booking[0].barangay_id})`);
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking not found or cannot be updated' 
      });
    }
    
    res.json({ 
      success: true, 
      message: `Equipment deployed to operator ${operator[0].full_name}`,
      status: 'In Use',
      barangay_verified: true
    });
  } catch (error) {
    console.error('Error deploying equipment:', error);
    res.status(500).json({ success: false, message: 'Failed to deploy equipment' });
  }
});

// PUT /api/machinery/bookings/:id/return-equipment - Operator returns equipment
router.put('/bookings/:id/return-equipment', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { operator_id, operational_notes = null } = req.body;
    
    if (!operator_id) {
      return res.status(400).json({ 
        success: false, 
        message: 'operator_id is required' 
      });
    }
    
    const [operator] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [operator_id]
    );
    
    if (operator.length === 0) {
      return res.status(404).json({ success: false, message: 'Operator not found' });
    }
    
    if (operator[0].role !== 'operator') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only operators can return equipment' 
      });
    }
    
    const [booking] = await pool.execute(
      'SELECT * FROM machinery_bookings WHERE id = ?',
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (operator[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Operator can only return equipment for bookings in their assigned barangay.' 
      });
    }
    
    if (booking[0].status !== 'In Use') {
      return res.status(400).json({ 
        success: false, 
        message: `Equipment can only be returned from "In Use" status. Current: ${booking[0].status}` 
      });
    }
    
    const [result] = await pool.execute(
      `UPDATE machinery_bookings 
       SET operational_notes = ?
       WHERE id = ?`,
      [operational_notes, id]
    );

    console.log(`✔️ Equipment return noted for Booking ${id} by ${operator[0].full_name} (Barangay: ${booking[0].barangay_id})`);
    
    res.json({ 
      success: true, 
      message: `Equipment return recorded by ${operator[0].full_name}.`,
      barangay_verified: true
    });
  } catch (error) {
    console.error('Error returning equipment:', error);
    res.status(500).json({ success: false, message: 'Failed to return equipment' });
  }
});

// PUT /api/machinery/bookings/:id/complete - Mark booking as completed or incomplete
router.put('/bookings/:id/complete', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { status_action = 'completed', operator_id, operational_notes = null } = req.body;
    
    if (!['completed', 'incomplete'].includes(status_action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid status action. Must be "completed" or "incomplete"' 
      });
    }

    if (!operator_id) {
      return res.status(400).json({
        success: false,
        message: 'operator_id is required'
      });
    }

    const [operator] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [operator_id]
    );

    if (operator.length === 0 || operator[0].role !== 'operator') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only operators can mark bookings as completed or incomplete' 
      });
    }
    
    const [booking] = await pool.execute(
      `SELECT mb.*, mi.assigned_operator_id, mi.machinery_name, mi.barangay_id, f.full_name AS farmer_name
       FROM machinery_bookings mb
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       JOIN farmers f ON mb.farmer_id = f.id
       WHERE mb.id = ?`,
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (operator[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Operator can only complete bookings from their assigned barangay.' 
      });
    }

    if (booking[0].assigned_operator_id && booking[0].assigned_operator_id !== parseInt(operator_id, 10)) {
      return res.status(403).json({
        success: false,
        message: 'You are not the assigned operator for this machinery booking.'
      });
    }
    
    if (!['Approved', 'Assigned to Operator', 'Booking Confirmed', 'In Use'].includes(booking[0].status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Only approved or assigned bookings can be marked completed or incomplete. Current: ${booking[0].status}` 
      });
    }
    
    let newStatus = booking[0].status;
    if (status_action === 'completed') {
      newStatus = 'Completed';
    } else if (status_action === 'incomplete') {
      newStatus = 'Incomplete';
    }

    let result;
    let completedRemaining = 0;
    if (status_action === 'completed') {
      completedRemaining = parseFloat(booking[0].remaining_balance) || 0;
      [result] = await pool.execute(
        `UPDATE machinery_bookings 
         SET status = 'Completed',
             machine_used = 1,
             completed_by = ?,
             completed_date = NOW(),
             operational_notes = COALESCE(?, operational_notes)
         WHERE id = ?`,
        [operator_id, operational_notes, id]
      );

      if (completedRemaining > 0) {
        await pool.execute(
          `UPDATE machinery_bookings
           SET receivable_amount = ?, receivable_created_at = NOW()
           WHERE id = ? AND receivable_amount IS NULL`,
          [completedRemaining, id]
        );
        const [treasurers] = await pool.execute(
          `SELECT id FROM farmers WHERE role = 'treasurer' AND barangay_id = ? AND status = 'approved'`,
          [booking[0].barangay_id]
        );
        for (const t of treasurers) {
          await createTreasurerCollectibleCreatedNotification({
            treasurerId: t.id,
            bookingId: id,
            farmerName: booking[0].farmer_name,
            machineryName: booking[0].machinery_name,
            receivableAmount: completedRemaining,
            bookingDate: booking[0].booking_date
          });
        }
      }

      await createPendingExpenseForBooking(id);

      console.log(`✅ Booking ${id} marked completed by operator ${operator[0].full_name}`);
    } else {
      [result] = await pool.execute(
        `UPDATE machinery_bookings 
         SET status = 'Incomplete',
             machine_used = 0,
             completed_by = NULL,
             completed_date = NULL,
             receivable_amount = NULL,
             receivable_created_at = NULL,
             operational_notes = COALESCE(?, operational_notes)
         WHERE id = ?`,
        [operational_notes, id]
      );
    }
    
    if (result.affectedRows === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Booking not found or cannot be updated' 
      });
    }
    
    const messageMap = {
      completed: completedRemaining > 0
        ? 'Rental marked complete. Outstanding balance added to Accounts Receivable. Pending expense entry created for treasurer.'
        : 'Rental marked complete. Pending expense entry created for treasurer.',
      incomplete: 'Booking marked as incomplete. The farmer will not be charged unless the service is resumed and completed.'
    };
    
    res.json({ 
      success: true, 
      message: messageMap[status_action],
      status: newStatus
    });
  } catch (error) {
    console.error('Error updating booking status:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking status', error: error.message });
  }
});

// PUT /api/machinery/bookings/:id/mark-completed - Mark "In Use" booking as "Completed"
router.put('/bookings/:id/mark-completed', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { completed_by } = req.body;
    
    if (!completed_by) {
      return res.status(400).json({ 
        success: false, 
        message: 'completed_by is required' 
      });
    }
    
    const [user] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [completed_by]
    );
    
    if (user.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'User not found' 
      });
    }
    
    if (user[0].role !== 'operator') {
      return res.status(403).json({ 
        success: false, 
        message: 'Only operators can complete bookings' 
      });
    }
    
    const [booking] = await pool.execute(
      'SELECT * FROM machinery_bookings WHERE id = ?',
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (user[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Operator can only complete bookings from their assigned barangay.' 
      });
    }
    
    if (booking[0].status !== 'In Use') {
      return res.status(400).json({ 
        success: false, 
        message: 'Only bookings in "In Use" status can be marked as completed. Current status: ' + booking[0].status 
      });
    }
    
    const [result] = await pool.execute(
      `UPDATE machinery_bookings 
       SET status = 'Completed',
           machine_used = 1,
           completed_by = ?,
           completed_date = NOW()
       WHERE id = ?`,
      [completed_by, id]
    );

    console.log(`✅ Booking ${id} marked as Completed by operator ${user[0].full_name} (Barangay: ${booking[0].barangay_id})`);

    await createPendingExpenseForBooking(id);
    
    res.json({ 
      success: true, 
      message: 'Booking marked as completed and moved to financial tracking (A/R & Collections)',
      status: 'Completed',
      barangay_verified: true
    });
  } catch (error) {
    console.error('Error marking booking as completed:', error);
    res.status(500).json({ success: false, message: 'Failed to mark booking as completed' });
  }
});

// PUT /api/machinery/bookings/:id/resolve-incomplete - Resolve "Incomplete" booking
router.put('/bookings/:id/resolve-incomplete', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { resolved_by, resolution_action = 'resume', notes = null } = req.body;
    
    if (!resolved_by || !['resume', 'cancel'].includes(resolution_action)) {
      return res.status(400).json({ 
        success: false, 
        message: 'resolved_by and valid resolution_action (resume/cancel) are required' 
      });
    }
    
    const [manager] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [resolved_by]
    );
    
    if (manager.length === 0 || !['operation_manager', 'business_manager', 'admin'].includes(manager[0].role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only Business Managers, Operation Managers, or Admin can resolve incomplete bookings' 
      });
    }
    
    const [booking] = await pool.execute(
      'SELECT * FROM machinery_bookings WHERE id = ?',
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (manager[0].role !== 'admin' && manager[0].barangay_id !== booking[0].barangay_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only resolve incomplete bookings from your assigned barangay.' 
      });
    }
    
    if (booking[0].status !== 'Incomplete') {
      return res.status(400).json({ 
        success: false, 
        message: `Only Incomplete bookings can be resolved. Current: ${booking[0].status}` 
      });
    }
    
    let newStatus, responseMessage;
    if (resolution_action === 'resume') {
      newStatus = 'In Use';
      responseMessage = 'Booking resumed. Operator can continue work.';
    } else if (resolution_action === 'cancel') {
      newStatus = 'Cancelled';
      responseMessage = 'Incomplete booking cancelled.';
    }
    
    await pool.execute(
      `UPDATE machinery_bookings 
       SET status = ?,
           notes = CONCAT(COALESCE(notes, ''), '\n[Incomplete Resolution: ', ?, ' - ', ?, ']')
       WHERE id = ?`,
      [newStatus, manager[0].full_name, notes || 'No notes', id]
    );

    console.log(`🔧 Incomplete Booking ${id} resolved (${resolution_action}) by ${manager[0].full_name} (Barangay: ${booking[0].barangay_id})`);
    
    res.json({ 
      success: true, 
      message: responseMessage,
      status: newStatus,
      barangay_verified: true
    });
  } catch (error) {
    console.error('Error resolving incomplete booking:', error);
    res.status(500).json({ success: false, message: 'Failed to resolve incomplete booking' });
  }
});

// PUT /api/machinery/bookings/:id/cancel - Cancel booking
router.put('/bookings/:id/cancel', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { farmer_id, cancelled_by = null, cancellation_reason = null } = req.body;

    await syncExpiredMachineryBookings({ bookingId: id });
    
    const [booking] = await pool.execute(
      `SELECT mb.*, mi.machinery_name, mi.assigned_operator_id
       FROM machinery_bookings mb
       LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }
    
    if (!['Pending', 'Approved'].includes(booking[0].status)) {
      return res.status(400).json({ 
        success: false, 
        message: `Bookings can only be cancelled from Pending or Approved status. Current: ${booking[0].status}` 
      });
    }
    
    if (booking[0].status === 'Approved') {
      if (!cancelled_by) {
        return res.status(400).json({ 
          success: false, 
          message: 'cancelled_by (manager ID) is required to cancel from Approved status' 
        });
      }
      
      const [manager] = await pool.execute(
        'SELECT role, barangay_id FROM farmers WHERE id = ?',
        [cancelled_by]
      );
      
      if (manager.length === 0 || !['operation_manager', 'business_manager', 'admin', 'president'].includes(manager[0].role)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only managers/admins can cancel approved bookings' 
        });
      }

      if (manager[0].role !== 'admin' && manager[0].barangay_id !== booking[0].barangay_id) {
        return res.status(403).json({ 
          success: false, 
          message: 'You can only cancel bookings from your assigned barangay.' 
        });
      }
    } else {
      if (parseInt(booking[0].farmer_id, 10) !== parseInt(farmer_id, 10)) {
        return res.status(403).json({ 
          success: false, 
          message: 'Only the booker can cancel their pending booking' 
        });
      }

      if (req.user?.id && parseInt(req.user.id, 10) !== parseInt(farmer_id, 10)) {
        return res.status(403).json({
          success: false,
          message: 'You can only cancel your own bookings.'
        });
      }
    }
    
    await deleteNotificationsForBooking(id);

    const [result] = await pool.execute(
      'DELETE FROM machinery_bookings WHERE id = ?',
      [id]
    );
    
    res.json({ 
      success: true, 
      message: 'Booking cancelled and deleted successfully',
      status: 'Deleted'
    });
  } catch (error) {
    console.error('Error cancelling booking:', error);
    res.status(500).json({ success: false, message: 'Failed to cancel booking' });
  }
});

// PUT /api/machinery/bookings/:id/edit - Edit booking
router.put('/bookings/:id/edit', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { machinery_id, booking_date, service_location, area_size, area_unit, notes, barangay_place_id } = req.body;

    await syncExpiredMachineryBookings({ bookingId: id });
    
    console.log('🔄 Edit booking request:', { id, machinery_id, booking_date, service_location, area_size, area_unit, notes, barangay_place_id });
    
    if (!machinery_id || !booking_date || area_size === undefined || area_size === null) {
      return res.status(400).json({ 
        success: false, 
        message: 'Missing required fields: machinery_id, booking_date, area_size' 
      });
    }
    
    const machineryIdNum = parseInt(machinery_id, 10);
    const areaSizeNum = parseFloat(area_size);
    const bookingIdNum = parseInt(id, 10);
    
    if (isNaN(machineryIdNum) || isNaN(areaSizeNum) || isNaN(bookingIdNum)) {
      return res.status(400).json({ 
        success: false, 
        message: 'Invalid data types for booking update' 
      });
    }

    const todayStr = formatLocalDate(new Date());
    if (booking_date < todayStr) {
      return res.status(400).json({
        success: false,
        message: 'Cannot move a booking to a past date'
      });
    }
    
    const [booking] = await pool.execute(
      'SELECT * FROM machinery_bookings WHERE id = ?',
      [bookingIdNum]
    );
    
    if (booking.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Booking not found' 
      });
    }

    if (!booking[0].farmer_id) {
      return res.status(401).json({ 
        success: false, 
        message: 'Booking validation error: no farmer assigned' 
      });
    }

    const { farmer_id } = req.body;
    
    if (farmer_id && booking[0].farmer_id !== farmer_id) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only the farmer who created this booking can edit it' 
      });
    }

    const [farmer] = await pool.execute(
      'SELECT barangay_id, membership_status FROM farmers WHERE id = ?',
      [booking[0].farmer_id]
    );

    if (farmer.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Farmer information not found' 
      });
    }
    
    if (booking[0].status !== 'Pending') {
      return res.status(400).json({ 
        success: false, 
        message: `Can only edit Pending bookings. Current status: ${booking[0].status}` 
      });
    }
    
    const [machinery] = await pool.execute(
      'SELECT * FROM machinery_inventory WHERE id = ? AND status = "Available"',
      [machineryIdNum]
    );
    
    if (machinery.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Selected machinery not found or not available for booking' 
      });
    }

    const prerequisiteOnEdit = await checkMachineryPrerequisite(pool, booking[0].farmer_id, machinery[0]);
    if (!prerequisiteOnEdit.ok) {
      return res.status(403).json({
        success: false,
        message: prerequisiteOnEdit.message,
        requires_machinery_id: prerequisiteOnEdit.requires_machinery_id,
        requires_machinery_name: prerequisiteOnEdit.requires_machinery_name
      });
    }

    const userBarangayId = farmer[0].barangay_id;
    const membershipStatus = farmer[0].membership_status || 'member';
    const machineryBarangayId = machinery[0].barangay_id;
    let resolvedServiceLocation = typeof service_location === 'string' ? service_location.trim() : '';
    let resolvedPlaceId = null;

    if (barangay_place_id != null && barangay_place_id !== '') {
      const pid = parseInt(barangay_place_id, 10);
      if (Number.isNaN(pid)) {
        return res.status(400).json({ success: false, message: 'Invalid barangay_place_id' });
      }
      try {
        const [plc] = await pool.execute(
          `SELECT id, name, description FROM barangay_service_places 
           WHERE id = ? AND barangay_id = ? AND is_active = 1`,
          [pid, userBarangayId]
        );
        if (plc.length === 0) {
          return res.status(400).json({
            success: false,
            message: 'Invalid or inactive service place for your barangay'
          });
        }
        resolvedPlaceId = plc[0].id;
        const desc = plc[0].description ? ` — ${plc[0].description}` : '';
        resolvedServiceLocation = `${plc[0].name}${desc}`;
        if (typeof service_location === 'string' && service_location.trim()) {
          resolvedServiceLocation = `${resolvedServiceLocation} (${service_location.trim()})`;
        }
      } catch (placeErr) {
        if (placeErr.code === 'ER_BAD_FIELD_ERROR' || placeErr.code === 'ER_NO_SUCH_TABLE') {
          return res.status(503).json({
            success: false,
            message: 'Service places are not available on this server (database migration required).'
          });
        }
        throw placeErr;
      }
    }

    if (!resolvedServiceLocation) {
      return res.status(400).json({
        success: false,
        message: 'Provide a service location or select a predefined place'
      });
    }
    
    let totalPrice;
    try {
      totalPrice = calculateBookingPrice(
        machinery[0],
        areaSizeNum,
        area_unit,
        membershipStatus,
        userBarangayId
      );
    } catch (priceErr) {
      return res.status(400).json({ success: false, message: priceErr.message });
    }
    
    console.log('Price calculation:', { totalPrice, machineryBarangayId, userBarangayId });

    let result;
    if (resolvedPlaceId != null) {
      try {
        [result] = await pool.execute(
          `UPDATE machinery_bookings 
           SET machinery_id = ?, 
               barangay_id = ?,
               booking_date = ?, 
               service_location = ?, 
               area_size = ?,
               area_unit = ?,
               total_price = ?,
               remaining_balance = ?,
               notes = ?,
               barangay_place_id = ?,
               updated_at = NOW()
           WHERE id = ?`,
          [machineryIdNum, machineryBarangayId, booking_date, resolvedServiceLocation, areaSizeNum, area_unit || null, totalPrice, totalPrice, notes || null, resolvedPlaceId, bookingIdNum]
        );
      } catch (updErr) {
        if (updErr.code === 'ER_BAD_FIELD_ERROR') {
          [result] = await pool.execute(
            `UPDATE machinery_bookings 
             SET machinery_id = ?, 
                 booking_date = ?, 
                 service_location = ?, 
                 area_size = ?,
                 area_unit = ?,
                 total_price = ?,
                 notes = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [machineryIdNum, booking_date, resolvedServiceLocation, areaSizeNum, area_unit || null, totalPrice, notes || null, bookingIdNum]
          );
        } else {
          throw updErr;
        }
      }
    } else {
      try {
        [result] = await pool.execute(
          `UPDATE machinery_bookings 
           SET machinery_id = ?, 
               barangay_id = ?,
               booking_date = ?, 
               service_location = ?, 
               area_size = ?,
               area_unit = ?,
               total_price = ?,
               remaining_balance = ?,
               notes = ?,
               barangay_place_id = NULL,
               updated_at = NOW()
           WHERE id = ?`,
          [machineryIdNum, machineryBarangayId, booking_date, resolvedServiceLocation, areaSizeNum, area_unit || null, totalPrice, totalPrice, notes || null, bookingIdNum]
        );
      } catch (updErr) {
        if (updErr.code === 'ER_BAD_FIELD_ERROR') {
          [result] = await pool.execute(
            `UPDATE machinery_bookings 
             SET machinery_id = ?, 
                 booking_date = ?, 
                 service_location = ?, 
                 area_size = ?,
                 area_unit = ?,
                 total_price = ?,
                 notes = ?,
                 updated_at = NOW()
             WHERE id = ?`,
            [machineryIdNum, booking_date, resolvedServiceLocation, areaSizeNum, area_unit || null, totalPrice, notes || null, bookingIdNum]
          );
        } else {
          throw updErr;
        }
      }
    }
    
    console.log('Update result:', result);
    
    if (result.affectedRows === 0) {
      console.error('No rows affected for booking:', bookingIdNum);
      return res.status(400).json({ 
        success: false, 
        message: 'Failed to update booking' 
      });
    }
    
    const [updatedData] = await pool.execute(
      `SELECT mb.*, mi.machinery_name, mi.assigned_operator_id
       FROM machinery_bookings mb
       LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [bookingIdNum]
    );
    
    const updated = updatedData[0];
    if (updated?.assigned_operator_id && ['Approved', 'Pending'].includes(updated.status)) {
      await createOperatorBookingUpdatedNotification({
        operatorId: updated.assigned_operator_id,
        bookingId: bookingIdNum,
        machineryName: updated.machinery_name,
        bookingDate: updated.booking_date
      });
    }

    console.log('✅ Booking updated successfully');
    res.json({ 
      success: true, 
      message: 'Booking updated successfully',
      booking: updatedData[0]
    });
  } catch (error) {
    console.error('❌ Error updating booking:', error);
    res.status(500).json({ success: false, message: 'Failed to update booking: ' + error.message });
  }
});

// GET /api/machinery/gcash-qr - Organization GCash QR (legacy balance payments)
router.get('/gcash-qr', async (req, res) => {
  const qrPath = process.env.GCASH_QR_PATH || '/uploads/settings/gcash-qr.png';
  const fullPath = path.join(__dirname, '..', qrPath.replace(/^\//, ''));
  res.json({
    success: true,
    qr_url: qrPath,
    qr_exists: fs.existsSync(fullPath)
  });
});

// POST /api/machinery/bookings/:id/submit-down-payment - Farmer submits down payment
router.post('/bookings/:id/submit-down-payment', ...secureBookingRoute, uploadPaymentProof.single('payment_proof'), async (req, res) => {
  try {
    const { id } = req.params;
    const { farmer_id, payment_method, payment_reference } = req.body;

    if (!farmer_id || !payment_method) {
      return res.status(400).json({ success: false, message: 'farmer_id and payment_method are required' });
    }

    if (!['Cash', 'GCash'].includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'payment_method must be Cash or GCash' });
    }

    if (payment_method === 'GCash') {
      return res.status(400).json({
        success: false,
        message:
          'GCash down payments must be completed online via the Pay with GCash button. Use Cash if paying in person to the treasurer.'
      });
    }

    const [booking] = await pool.execute('SELECT * FROM machinery_bookings WHERE id = ?', [id]);
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (parseInt(booking[0].farmer_id, 10) !== parseInt(farmer_id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only submit payment for your own booking' });
    }

    if (!['Awaiting Down Payment', 'Payment Rejected'].includes(booking[0].status)) {
      return res.status(400).json({
        success: false,
        message: `Down payment can only be submitted when status is Awaiting Down Payment or Payment Rejected. Current: ${booking[0].status}`
      });
    }

    const proofPath = req.file ? `/uploads/payment-proofs/${req.file.filename}` : null;

    await pool.execute(
      `UPDATE machinery_bookings
       SET status = 'Awaiting Payment Verification',
           down_payment_method = ?,
           down_payment_proof = COALESCE(?, down_payment_proof),
           down_payment_reference = ?,
           down_payment_submitted_at = NOW(),
           down_payment_rejection_reason = NULL
       WHERE id = ?`,
      [payment_method, proofPath, payment_reference || null, id]
    );

    const [bookingDetails] = await pool.execute(
      `SELECT mb.*, f.full_name AS farmer_name, f.role AS booker_role, mi.machinery_name, mi.barangay_id
       FROM machinery_bookings mb
       JOIN farmers f ON mb.farmer_id = f.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    const row = bookingDetails[0];

    const verifierRole = getPaymentVerifierRole(row.booker_role);
    const [verifiers] = await pool.execute(
      `SELECT id FROM farmers WHERE role = ? AND barangay_id = ? AND status = 'approved'`,
      [verifierRole, row.barangay_id]
    );
    for (const verifier of verifiers) {
      await createTreasurerDownPaymentSubmittedNotification({
        treasurerId: verifier.id,
        bookingId: id,
        farmerName: row.farmer_name,
        machineryName: row.machinery_name,
        amountPaid: row.down_payment_amount,
        expenseDate: formatLocalDate(new Date())
      });
    }

    res.json({ success: true, message: 'Down payment submitted for verification', status: 'Awaiting Payment Verification' });
  } catch (error) {
    console.error('Error submitting down payment:', error);
    res.status(500).json({ success: false, message: 'Failed to submit down payment' });
  }
});

// POST /api/machinery/bookings/:id/submit-balance-payment - Farmer submits remaining balance (partial or full)
router.post('/bookings/:id/submit-balance-payment', ...secureBookingRoute, uploadPaymentProof.single('payment_proof'), async (req, res) => {
  try {
    const { id } = req.params;
    const { farmer_id, payment_method, payment_reference, amount } = req.body;

    if (!farmer_id || !payment_method || !amount) {
      return res.status(400).json({ success: false, message: 'farmer_id, payment_method, and amount are required' });
    }

    if (!['Cash', 'GCash'].includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'payment_method must be Cash or GCash' });
    }

    if (payment_method === 'GCash' && !req.file) {
      return res.status(400).json({ success: false, message: 'Payment screenshot is required for GCash' });
    }

    const payAmount = parseFloat(amount);
    if (!payAmount || payAmount <= 0) {
      return res.status(400).json({ success: false, message: 'Invalid payment amount' });
    }

    const [booking] = await pool.execute('SELECT * FROM machinery_bookings WHERE id = ?', [id]);
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (parseInt(booking[0].farmer_id, 10) !== parseInt(farmer_id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only submit payment for your own booking' });
    }

    if (!['Completed', 'Awaiting Final Payment'].includes(booking[0].status)) {
      return res.status(400).json({
        success: false,
        message: `Balance payment can only be submitted for completed rentals with outstanding balance. Current: ${booking[0].status}`
      });
    }

    if (booking[0].status === 'Awaiting Final Payment') {
      await pool.execute(
        `UPDATE machinery_bookings SET status = 'Completed' WHERE id = ?`,
        [id]
      );
    }

    const remaining = parseFloat(booking[0].remaining_balance) || 0;
    if (payAmount > remaining + 0.01) {
      return res.status(400).json({
        success: false,
        message: `Amount exceeds remaining balance (₱${remaining.toFixed(2)})`
      });
    }

    const [pending] = await pool.execute(
      `SELECT id FROM machinery_balance_payment_submissions
       WHERE booking_id = ? AND status = 'Awaiting Payment Verification' LIMIT 1`,
      [id]
    );
    if (pending.length > 0) {
      return res.status(400).json({ success: false, message: 'A payment is already awaiting verification for this booking' });
    }

    const proofPath = req.file ? `/uploads/payment-proofs/${req.file.filename}` : null;
    const isPartial = payAmount < remaining - 0.01;

    const [ins] = await pool.execute(
      `INSERT INTO machinery_balance_payment_submissions
       (booking_id, farmer_id, amount, payment_method, proof_path, reference_number, status, submitted_at)
       VALUES (?, ?, ?, ?, ?, ?, 'Awaiting Payment Verification', NOW())`,
      [id, farmer_id, payAmount, payment_method, proofPath, payment_reference || null]
    );

    const [rowDetails] = await pool.execute(
      `SELECT mb.*, f.full_name AS farmer_name, f.role AS booker_role, mi.machinery_name, mi.barangay_id
       FROM machinery_bookings mb
       JOIN farmers f ON mb.farmer_id = f.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    const row = rowDetails[0];

    const verifierRole = getPaymentVerifierRole(row.booker_role);
    const [verifiers] = await pool.execute(
      `SELECT id FROM farmers WHERE role = ? AND barangay_id = ? AND status = 'approved'`,
      [verifierRole, row.barangay_id]
    );
    for (const verifier of verifiers) {
      await createTreasurerBalancePaymentSubmittedNotification({
        treasurerId: verifier.id,
        bookingId: id,
        farmerName: row.farmer_name,
        machineryName: row.machinery_name,
        amountPaid: payAmount,
        isPartial
      });
    }

    res.json({
      success: true,
      message: 'Balance payment submitted for verification',
      submission_id: ins.insertId,
      status: 'Awaiting Payment Verification'
    });
  } catch (error) {
    console.error('Error submitting balance payment:', error);
    res.status(500).json({ success: false, message: 'Failed to submit balance payment' });
  }
});

// GET /api/machinery/bookings/:id/balance-submissions - Payment submission history
router.get('/bookings/:id/balance-submissions', async (req, res) => {
  try {
    const { id } = req.params;
    const [rows] = await pool.execute(
      `SELECT * FROM machinery_balance_payment_submissions WHERE booking_id = ? ORDER BY submitted_at DESC`,
      [id]
    );
    res.json({ success: true, submissions: rows });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Failed to fetch submissions' });
  }
});

// PUT /api/machinery/bookings/balance-submissions/:submissionId/verify
router.put('/bookings/balance-submissions/:submissionId/verify', verifyToken, verifyBalanceSubmissionBarangayAccess, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { verified_by, receipt_number } = req.body;
    const actorId = verified_by || req.user.id;
    if (parseInt(actorId, 10) !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only verify payments as yourself.' });
    }
    if (!actorId) {
      return res.status(400).json({ success: false, message: 'verified_by is required' });
    }

    const [treasurer] = await pool.execute('SELECT id, role, barangay_id FROM farmers WHERE id = ?', [actorId]);
    if (treasurer.length === 0 || !['treasurer', 'president', 'admin'].includes(treasurer[0].role)) {
      return res.status(403).json({ success: false, message: 'Treasurer or President access only' });
    }

    const [submissionRow] = await pool.execute(
      `SELECT s.*, mb.farmer_id, mb.barangay_id, f.role AS booker_role
       FROM machinery_balance_payment_submissions s
       JOIN machinery_bookings mb ON s.booking_id = mb.id
       JOIN farmers f ON mb.farmer_id = f.id
       WHERE s.id = ?`,
      [submissionId]
    );
    if (!submissionRow.length) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }

    const accessCheck = assertCanVerifyMachineryPayment(
      treasurer[0],
      submissionRow[0].farmer_id,
      submissionRow[0].booker_role,
      submissionRow[0].barangay_id
    );
    if (!accessCheck.ok) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    const result = await verifyBalancePaymentSubmission(submissionId, actorId, { receiptNumber: receipt_number });

    const [sub] = await pool.execute(
      `SELECT s.booking_id, mb.farmer_id, mi.machinery_name, mb.booking_date
       FROM machinery_balance_payment_submissions s
       JOIN machinery_bookings mb ON s.booking_id = mb.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE s.id = ?`,
      [submissionId]
    );
    if (sub.length) {
      await createBookingStatusNotification({
        farmerId: sub[0].farmer_id,
        bookingId: sub[0].booking_id,
        status: result.is_full_payment ? 'Completed' : 'Partial Payment Verified',
        machineryName: sub[0].machinery_name,
        bookingDate: sub[0].booking_date
      });
    }

    res.json({
      success: true,
      message: result.is_full_payment ? 'Final payment verified. Booking completed.' : 'Partial payment verified.',
      ...result
    });
  } catch (error) {
    console.error('Error verifying balance payment:', error);
    res.status(error.status || 500).json({ success: false, message: error.message || 'Failed to verify payment' });
  }
});

// PUT /api/machinery/bookings/balance-submissions/:submissionId/reject
router.put('/bookings/balance-submissions/:submissionId/reject', verifyToken, verifyBalanceSubmissionBarangayAccess, async (req, res) => {
  try {
    const { submissionId } = req.params;
    const { verified_by, rejected_by, rejection_reason } = req.body;
    const treasurerId = verified_by || rejected_by;

    if (!treasurerId || !rejection_reason) {
      return res.status(400).json({ success: false, message: 'Treasurer id and rejection_reason are required' });
    }

    const [sub] = await pool.execute(
      `SELECT s.*, mb.farmer_id, mi.machinery_name, mb.booking_date
       FROM machinery_balance_payment_submissions s
       JOIN machinery_bookings mb ON s.booking_id = mb.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE s.id = ?`,
      [submissionId]
    );
    if (!sub.length) {
      return res.status(404).json({ success: false, message: 'Submission not found' });
    }
    if (sub[0].status !== 'Awaiting Payment Verification') {
      return res.status(400).json({ success: false, message: 'Submission is not awaiting verification' });
    }

    await pool.execute(
      `UPDATE machinery_balance_payment_submissions
       SET status = 'Rejected', rejection_reason = ?, verified_by = ?, verified_at = NOW()
       WHERE id = ?`,
      [rejection_reason, treasurerId, submissionId]
    );

    await createBookingStatusNotification({
      farmerId: sub[0].farmer_id,
      bookingId: sub[0].booking_id,
      status: 'Payment Rejected',
      machineryName: sub[0].machinery_name,
      bookingDate: sub[0].booking_date
    });

    res.json({ success: true, message: 'Payment rejected. Farmer may resubmit.' });
  } catch (error) {
    console.error('Error rejecting balance payment:', error);
    res.status(500).json({ success: false, message: 'Failed to reject payment' });
  }
});

// PUT /api/machinery/bookings/:id/verify-down-payment - Treasurer/President verifies down payment
router.put('/bookings/:id/verify-down-payment', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { verified_by, receipt_number } = req.body;

    if (!verified_by) {
      return res.status(400).json({ success: false, message: 'verified_by is required' });
    }

    if (parseInt(verified_by, 10) !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only verify payments as yourself.' });
    }

    const [verifier] = await pool.execute(
      'SELECT id, role, barangay_id, full_name FROM farmers WHERE id = ?',
      [verified_by]
    );
    if (verifier.length === 0 || !['treasurer', 'president', 'admin'].includes(verifier[0].role)) {
      return res.status(403).json({ success: false, message: 'Only Treasurer or President can verify payments' });
    }

    const [booking] = await pool.execute(
      `SELECT mb.*, f.full_name AS farmer_name, f.role AS booker_role, mi.machinery_name, mi.barangay_id
       FROM machinery_bookings mb
       JOIN farmers f ON mb.farmer_id = f.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const accessCheck = assertCanVerifyMachineryPayment(
      verifier[0],
      booking[0].farmer_id,
      booking[0].booker_role,
      booking[0].barangay_id
    );
    if (!accessCheck.ok) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    if (booking[0].status !== 'Awaiting Payment Verification') {
      return res.status(400).json({ success: false, message: 'Booking is not awaiting payment verification' });
    }

    const result = await verifyDownPaymentForBooking(pool, id, {
      verifiedBy: verified_by,
      receiptNumber: receipt_number,
      autoVerified: false
    });

    if (!result.ok) {
      return res.status(result.status || 500).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: 'Down payment verified',
      status: result.status,
      receipt_number: result.receipt_number
    });
  } catch (error) {
    console.error('Error verifying down payment:', error);
    res.status(500).json({ success: false, message: 'Failed to verify down payment' });
  }
});

// POST /api/machinery/bookings/:id/record-down-payment — Treasurer records face-to-face cash DP
router.post('/bookings/:id/record-down-payment', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      recorded_by,
      amount,
      payment_reference,
      receipt_number,
      payment_method = 'Cash',
      payment_date
    } = req.body;

    const actorId = recorded_by || req.user.id;
    if (parseInt(actorId, 10) !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only record payments as yourself.' });
    }

    if (!['Cash', 'GCash'].includes(payment_method)) {
      return res.status(400).json({ success: false, message: 'payment_method must be Cash or GCash' });
    }

    const [recorder] = await pool.execute(
      'SELECT id, role, barangay_id, full_name FROM farmers WHERE id = ?',
      [actorId]
    );
    if (recorder.length === 0 || !['treasurer', 'president', 'admin'].includes(recorder[0].role)) {
      return res.status(403).json({ success: false, message: 'Only Treasurer or President can record down payments' });
    }

    const [booking] = await pool.execute(
      `SELECT mb.*, f.full_name AS farmer_name, f.role AS booker_role, mi.machinery_name, mi.barangay_id
       FROM machinery_bookings mb
       JOIN farmers f ON mb.farmer_id = f.id
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const accessCheck = assertCanVerifyMachineryPayment(
      recorder[0],
      booking[0].farmer_id,
      booking[0].booker_role,
      booking[0].barangay_id
    );
    if (!accessCheck.ok) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    if (!['Awaiting Down Payment', 'Payment Rejected', 'Awaiting Payment Verification'].includes(booking[0].status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot record down payment for status: ${booking[0].status}`
      });
    }

    const result = await recordCashDownPaymentForBooking(pool, id, {
      verifiedBy: actorId,
      amount: amount != null ? amount : booking[0].down_payment_amount,
      paymentReference: payment_reference || null,
      receiptNumber: receipt_number || null,
      paymentMethod: payment_method,
      paymentDate: payment_date || null
    });

    if (!result.ok) {
      return res.status(result.status || 500).json({ success: false, message: result.message });
    }

    res.json({
      success: true,
      message: 'Cash down payment recorded and verified.',
      status: result.status,
      receipt_number: result.receipt_number
    });
  } catch (error) {
    console.error('Error recording down payment:', error);
    res.status(500).json({ success: false, message: 'Failed to record down payment' });
  }
});

// PUT /api/machinery/bookings/:id/reject-down-payment - Treasurer/President rejects payment proof
router.put('/bookings/:id/reject-down-payment', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { verified_by, rejected_by, rejection_reason } = req.body;
    const actorId = verified_by || rejected_by;

    if (!actorId || !rejection_reason) {
      return res.status(400).json({ success: false, message: 'Verifier id and rejection_reason are required' });
    }

    if (parseInt(actorId, 10) !== parseInt(req.user.id, 10)) {
      return res.status(403).json({ success: false, message: 'You can only reject payments as yourself.' });
    }

    const [verifier] = await pool.execute('SELECT id, role, barangay_id FROM farmers WHERE id = ?', [actorId]);
    if (verifier.length === 0 || !['treasurer', 'president', 'admin'].includes(verifier[0].role)) {
      return res.status(403).json({ success: false, message: 'Treasurer or President access only' });
    }

    const [booking] = await pool.execute(
      `SELECT mb.*, f.role AS booker_role, mi.machinery_name
       FROM machinery_bookings mb
       JOIN farmers f ON mb.farmer_id = f.id
       LEFT JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    const accessCheck = assertCanVerifyMachineryPayment(
      verifier[0],
      booking[0].farmer_id,
      booking[0].booker_role,
      booking[0].barangay_id
    );
    if (!accessCheck.ok) {
      return res.status(403).json({ success: false, message: accessCheck.message });
    }

    if (booking[0].status !== 'Awaiting Payment Verification') {
      return res.status(400).json({ success: false, message: 'Booking is not awaiting verification' });
    }

    await pool.execute(
      `UPDATE machinery_bookings
       SET status = 'Payment Rejected',
           down_payment_rejection_reason = ?
       WHERE id = ?`,
      [rejection_reason, id]
    );

    await createBookingStatusNotification({
      farmerId: booking[0].farmer_id,
      bookingId: id,
      status: 'Payment Rejected',
      machineryName: booking[0].machinery_name,
      bookingDate: booking[0].booking_date,
      rejectionReason: rejection_reason
    });

    res.json({ success: true, message: 'Payment rejected', status: 'Payment Rejected' });
  } catch (error) {
    console.error('Error rejecting down payment:', error);
    res.status(500).json({ success: false, message: 'Failed to reject payment' });
  }
});

// PUT /api/machinery/bookings/:id/confirm-booking - Manager final confirmation after down payment
router.put('/bookings/:id/confirm-booking', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { confirmed_by } = req.body;

    if (!confirmed_by) {
      return res.status(400).json({ success: false, message: 'confirmed_by is required' });
    }

    const [manager] = await pool.execute(
      'SELECT role, barangay_id, full_name FROM farmers WHERE id = ?',
      [confirmed_by]
    );
    if (manager.length === 0 || !['operation_manager', 'business_manager', 'admin'].includes(manager[0].role)) {
      return res.status(403).json({ success: false, message: 'Manager access only' });
    }

    const [booking] = await pool.execute(
      `SELECT mb.*, mi.machinery_name,
              COALESCE(mb.assigned_operator_id, mi.assigned_operator_id) AS resolved_operator_id
       FROM machinery_bookings mb
       JOIN machinery_inventory mi ON mb.machinery_id = mi.id
       WHERE mb.id = ?`,
      [id]
    );
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (!['Down Payment Verified', 'Approved'].includes(booking[0].status)) {
      return res.status(400).json({ success: false, message: 'Booking must be approved before it can be assigned to an operator' });
    }

    if (booking[0].status === 'Approved' && booking[0].assigned_operator_id) {
      return res.json({
        success: true,
        message: 'Booking is already approved and assigned to the operator.',
        status: 'Approved'
      });
    }

    if (!booking[0].resolved_operator_id) {
      return res.status(400).json({
        success: false,
        message: 'Assign an operator to this machinery in Inventory before confirming the booking.'
      });
    }

    const isAvailable = await checkBookingAvailability(
      booking[0].machinery_id,
      booking[0].booking_date,
      booking[0].area_size,
      id
    );
    if (!isAvailable) {
      return res.status(400).json({ success: false, message: 'Machinery no longer available for the selected date' });
    }

    await pool.execute(
      `UPDATE machinery_bookings
       SET status = 'Approved',
           final_confirmed_by = ?,
           final_confirmed_at = NOW(),
           assigned_operator_id = ?
       WHERE id = ?`,
      [confirmed_by, booking[0].resolved_operator_id, id]
    );

    await createBookingStatusNotification({
      farmerId: booking[0].farmer_id,
      bookingId: id,
      status: 'Approved',
      machineryName: booking[0].machinery_name,
      bookingDate: booking[0].booking_date
    });

    await createOperatorBookingAssignedNotification({
      operatorId: booking[0].resolved_operator_id,
      bookingId: id,
      machineryName: booking[0].machinery_name,
      bookingDate: booking[0].booking_date
    });

    res.json({
      success: true,
      message: 'Booking approved and assigned to operator.',
      status: 'Approved'
    });
  } catch (error) {
    console.error('Error confirming booking:', error);
    res.status(500).json({ success: false, message: 'Failed to confirm booking' });
  }
});

// PUT /api/machinery/bookings/:id/verify-final-payment - Treasurer verifies remaining 80%
router.put('/bookings/:id/verify-final-payment', ...secureBookingRoute, async (req, res) => {
  try {
    const { id } = req.params;
    const { verified_by, receipt_number, amount } = req.body;

    if (!verified_by) {
      return res.status(400).json({ success: false, message: 'verified_by is required' });
    }

    const [treasurer] = await pool.execute('SELECT role, barangay_id FROM farmers WHERE id = ?', [verified_by]);
    if (treasurer.length === 0 || !['treasurer', 'admin'].includes(treasurer[0].role)) {
      return res.status(403).json({ success: false, message: 'Treasurer access only' });
    }

    const [booking] = await pool.execute('SELECT * FROM machinery_bookings WHERE id = ?', [id]);
    if (booking.length === 0) {
      return res.status(404).json({ success: false, message: 'Booking not found' });
    }

    if (booking[0].status !== 'Awaiting Final Payment' && booking[0].status !== 'Completed') {
      return res.status(400).json({ success: false, message: 'Booking is not eligible for final payment verification' });
    }

    const payAmount = parseFloat(amount) || parseFloat(booking[0].remaining_balance) || 0;
    const paymentDate = formatLocalDate(new Date());
    const newTotalPaid = parseFloat(booking[0].total_paid || 0) + payAmount;

    await pool.execute(
      `INSERT INTO machinery_booking_payments
       (booking_id, payment_type, payment_date, amount, payment_method, receipt_number, remarks, recorded_by)
       VALUES (?, 'final_payment', ?, ?, ?, ?, 'Final balance payment', ?)`,
      [id, paymentDate, payAmount, 'Cash', receipt_number || `FP-${id}`, verified_by]
    );

    await pool.execute(
      `UPDATE machinery_bookings
       SET status = 'Completed',
           total_paid = ?,
           remaining_balance = 0,
           payment_status = 'Paid',
           payment_date = ?,
           last_payment_date = ?,
           receivable_amount = NULL,
           receivable_created_at = NULL
       WHERE id = ?`,
      [newTotalPaid, paymentDate, paymentDate, id]
    );

    await syncMachineryIncomeFromBooking(
      pool,
      id,
      verified_by,
      `Final payment — Booking #${id}`
    );

    await createPendingExpenseForBooking(id);

    res.json({ success: true, message: 'Final payment verified. Booking completed.', status: 'Completed' });
  } catch (error) {
    console.error('Error verifying final payment:', error);
    res.status(500).json({ success: false, message: 'Failed to verify final payment' });
  }
});

// GET /api/machinery/most-used - Rank completed machinery usage in the user's barangay
router.get('/most-used', verifyToken, async (req, res) => {
  try {
    const barangayId = parseInt(req.user?.barangay_id, 10);
    if (!barangayId) {
      return res.status(403).json({
        success: false,
        message: 'Your account is not assigned to a barangay.'
      });
    }

    let limit = parseInt(req.query.limit, 10);
    if (Number.isNaN(limit) || limit < 1) limit = 5;
    if (limit > 10) limit = 10;

    const [rows] = await pool.execute(
      `SELECT
         mb.machinery_id,
         mi.machinery_name,
         mi.machinery_type,
         mb.barangay_id,
         COALESCE(b.name, '') AS barangay_name,
         COUNT(*) AS usage_count
       FROM machinery_bookings mb
       INNER JOIN machinery_inventory mi ON mi.id = mb.machinery_id
       LEFT JOIN barangays b ON b.id = mb.barangay_id
       WHERE mb.status = 'Completed'
         AND mb.barangay_id = ?
       GROUP BY
         mb.machinery_id,
         mi.machinery_name,
         mi.machinery_type,
         mb.barangay_id,
         b.name
       ORDER BY usage_count DESC, mi.machinery_name ASC
       LIMIT ${limit}`,
      [barangayId]
    );

    res.json({
      success: true,
      barangay_id: barangayId,
      barangay_name: rows[0]?.barangay_name || '',
      machineries: rows.map((row) => ({
        machinery_id: row.machinery_id,
        machinery_name: row.machinery_name,
        machinery_type: row.machinery_type,
        usage_count: parseInt(row.usage_count, 10)
      }))
    });
  } catch (error) {
    console.error('Error fetching most used machineries:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch most used machineries' });
  }
});

// GET /api/machinery/stats - Get machinery statistics (barangay-scoped)
router.get('/stats', verifyToken, async (req, res) => {
  try {
    const { barangay_id } = req.query;
    const scope = buildListBarangayScope(req.user, barangay_id, 'mi');
    const bookingScope = buildListBarangayScope(req.user, barangay_id, 'mb');

    let machinerySql = `
      SELECT 
        machinery_type,
        COUNT(*) as total,
        SUM(CASE
              WHEN status = 'Available'
               AND NOT EXISTS (
                 SELECT 1 FROM machinery_bookings mb
                 WHERE mb.machinery_id = mi.id
                   AND mb.status IN ('Assigned to Operator', 'Booking Confirmed', 'In Use')
               )
              THEN 1 ELSE 0 END) as available,
        SUM(CASE
              WHEN status <> 'Available'
                OR EXISTS (
                 SELECT 1 FROM machinery_bookings mb
                 WHERE mb.machinery_id = mi.id
                   AND mb.status IN ('Assigned to Operator', 'Booking Confirmed', 'In Use')
               )
              THEN 1 ELSE 0 END) as not_available
      FROM machinery_inventory mi
      WHERE 1=1 ${scope.clause}
      GROUP BY machinery_type`;
    const machineryParams = [...scope.params];

    let bookingSql = `
      SELECT 
        COUNT(*) as total_bookings,
        SUM(CASE WHEN mb.status = 'Pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN mb.status = 'Approved' THEN 1 ELSE 0 END) as approved,
        SUM(CASE WHEN mb.status = 'Completed' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN mb.status = 'Rejected' THEN 1 ELSE 0 END) as rejected,
        SUM(CASE WHEN mb.status = 'Expired' THEN 1 ELSE 0 END) as expired,
        SUM(mb.total_price) as total_revenue
      FROM machinery_bookings mb
      WHERE 1=1 ${bookingScope.clause}`;
    const bookingParams = [...bookingScope.params];

    const [machineryStats] = await pool.execute(machinerySql, machineryParams);
    const [bookingStats] = await pool.execute(bookingSql, bookingParams);

    const opScope = buildListBarangayScope(req.user, barangay_id, 'mo');
    const [operatorStats] = await pool.execute(
      `SELECT COUNT(DISTINCT mo.farmer_id) as active_operators
       FROM machinery_operators mo
       JOIN machinery_inventory mi ON mo.machinery_id = mi.id
       WHERE mo.status = 'Active' ${scope.clause}`,
      scope.params
    );
    
    res.json({ 
      success: true, 
      stats: {
        machinery: machineryStats,
        bookings: bookingStats[0],
        operators: operatorStats[0]
      }
    });
  } catch (error) {
    console.error('Error fetching machinery stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch statistics' });
  }
});

module.exports = router;
