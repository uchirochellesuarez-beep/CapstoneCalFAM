const express = require('express');
const router = express.Router();
const pool = require('../db');
const {
  createIncomeAssistanceNotification
} = require('../services/notification-service');
const {
  buildAssistanceSmsMessage,
  normalizePhilippinePhoneNumber,
  sendSmsNotification
} = require('../services/sms-service');

// Helper to get user barangay from token
const getUserBarangayFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded.barangay_id || null;
  } catch (err) {
    return null;
  }
};

// Helper to get farmer's barangay
const getFarmerBarangay = async (farmerId) => {
  const [farmers] = await pool.execute(
    'SELECT barangay_id FROM farmers WHERE id = ?',
    [farmerId]
  );
  return farmers.length > 0 ? farmers[0].barangay_id : null;
};

let incomeDistributionSmsSchemaPromise = null;

const ensureIncomeDistributionSmsSchema = async () => {
  if (!incomeDistributionSmsSchemaPromise) {
    incomeDistributionSmsSchemaPromise = (async () => {
      const [columns] = await pool.execute(`
        SELECT COLUMN_NAME
        FROM INFORMATION_SCHEMA.COLUMNS
        WHERE TABLE_SCHEMA = DATABASE()
          AND TABLE_NAME = 'income_assistance_distributions'
          AND COLUMN_NAME IN (
            'sms_status',
            'sms_provider',
            'sms_recipient',
            'sms_message',
            'sms_last_attempt_at',
            'sms_sent_at',
            'sms_failure_reason',
            'sms_attempt_count'
          )
      `);

      const existingColumns = new Set(columns.map((column) => column.COLUMN_NAME));
      const alterStatements = [];

      if (!existingColumns.has('sms_status')) {
        alterStatements.push("ADD COLUMN sms_status ENUM('pending', 'sent', 'failed', 'not_configured') DEFAULT 'pending' NOT NULL");
      }
      if (!existingColumns.has('sms_provider')) {
        alterStatements.push("ADD COLUMN sms_provider VARCHAR(50) NULL");
      }
      if (!existingColumns.has('sms_recipient')) {
        alterStatements.push("ADD COLUMN sms_recipient VARCHAR(20) NULL");
      }
      if (!existingColumns.has('sms_message')) {
        alterStatements.push("ADD COLUMN sms_message TEXT NULL");
      }
      if (!existingColumns.has('sms_last_attempt_at')) {
        alterStatements.push("ADD COLUMN sms_last_attempt_at TIMESTAMP NULL");
      }
      if (!existingColumns.has('sms_sent_at')) {
        alterStatements.push("ADD COLUMN sms_sent_at TIMESTAMP NULL");
      }
      if (!existingColumns.has('sms_failure_reason')) {
        alterStatements.push("ADD COLUMN sms_failure_reason TEXT NULL");
      }
      if (!existingColumns.has('sms_attempt_count')) {
        alterStatements.push("ADD COLUMN sms_attempt_count INT UNSIGNED DEFAULT 0 NOT NULL");
      }

      if (alterStatements.length > 0) {
        await pool.query(`
          ALTER TABLE income_assistance_distributions
          ${alterStatements.join(',\n          ')}
        `);
      }
    })().catch((error) => {
      incomeDistributionSmsSchemaPromise = null;
      throw error;
    });
  }

  return incomeDistributionSmsSchemaPromise;
};

const getAssistanceLabel = (type) => {
  const labels = {
    fertilizer: 'fertilizer',
    seeds: 'seeds',
    both: 'seeds and fertilizer'
  };

  return labels[type] || 'agricultural assistance';
};

const updateDistributionSmsState = async (distributionId, smsMessage, smsResult) => {
  const status = smsResult.status || (smsResult.success ? 'sent' : 'failed');
  const provider = smsResult.provider || null;
  const recipient = smsResult.recipient || normalizePhilippinePhoneNumber(smsResult.rawRecipient || '').formatted || null;
  const failureReason = smsResult.success ? null : (smsResult.error || null);

  await pool.execute(
    `UPDATE income_assistance_distributions
     SET sms_status = ?,
         sms_provider = ?,
         sms_recipient = ?,
         sms_message = ?,
         sms_last_attempt_at = NOW(),
         sms_sent_at = CASE WHEN ? = 'sent' THEN NOW() ELSE sms_sent_at END,
         sms_failure_reason = ?,
         sms_attempt_count = COALESCE(sms_attempt_count, 0) + 1
     WHERE id = ?`,
    [status, provider, recipient, smsMessage, status, failureReason, distributionId]
  );
};

// POST /api/farmer-income - Save a new income record
router.post('/', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const { farmer_id } = req.body;
    const userBarangayId = getUserBarangayFromToken(req);
    
    // Check if farmer belongs to user's barangay
    const farmerBarangay = await getFarmerBarangay(farmer_id);
    if (userBarangayId && farmerBarangay !== userBarangayId) {
      return res.status(403).json({ 
        error: 'Access denied. Cannot record income for other barangays.' 
      });
    }

    const {
      area_hectares,
      planting_method,
      irrigation_type,
      fertilizers,
      pesticides,
      land_preparation_cost,
      planting_cost,
      spraying_cost,
      harvester_cost,
      drying_cost,
      hauling_cost,
      tarasko_cost,
      fuel_cost,
      other_expenses,
      sacks_harvested,
      kg_per_sack,
      price_per_kg,
      total_fertilizer_cost,
      total_pesticide_cost,
      total_labor_cost,
      gross_income,
      total_expenses,
      net_income
    } = req.body;

    // Validate required fields
    if (!farmer_id || !area_hectares || !planting_method || !irrigation_type) {
      return res.status(400).json({ error: 'Kulang ang mga kinakailangang impormasyon.' });
    }

    // Insert main income record with "Pending" status for President to verify
    const [result] = await conn.execute(
      `INSERT INTO farmer_income_records (
        farmer_id, area_hectares, planting_method, irrigation_type,
        land_preparation_cost, planting_cost, spraying_cost, harvester_cost,
        drying_cost, hauling_cost, tarasko_cost, fuel_cost, other_expenses,
        sacks_harvested, kg_per_sack, price_per_kg,
        total_fertilizer_cost, total_pesticide_cost, total_labor_cost,
        gross_income, total_expenses, net_income, status
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        farmer_id, area_hectares, planting_method, irrigation_type,
        land_preparation_cost || 0, planting_cost || 0, spraying_cost || 0, harvester_cost || 0,
        drying_cost || 0, hauling_cost || 0, tarasko_cost || 0, fuel_cost || 0, other_expenses || 0,
        sacks_harvested || 0, kg_per_sack || 0, price_per_kg || 0,
        total_fertilizer_cost || 0, total_pesticide_cost || 0, total_labor_cost || 0,
        gross_income || 0, total_expenses || 0, net_income || 0, 'Pending'
      ]
    );

    const recordId = result.insertId;

    // Insert fertilizers
    if (fertilizers && fertilizers.length > 0) {
      for (const f of fertilizers) {
        if (f.type) {
          await conn.execute(
            `INSERT INTO farmer_income_fertilizers (record_id, fertilizer_type, sacks, price_per_sack, line_total)
             VALUES (?, ?, ?, ?, ?)`,
            [recordId, f.type, f.sacks || 0, f.price_per_sack || 0, (f.sacks || 0) * (f.price_per_sack || 0)]
          );
        }
      }
    }

    // Insert pesticides
    if (pesticides && pesticides.length > 0) {
      for (const p of pesticides) {
        if (p.type) {
          await conn.execute(
            `INSERT INTO farmer_income_pesticides (record_id, pesticide_type, quantity, price_per_unit, line_total)
             VALUES (?, ?, ?, ?, ?)`,
            [recordId, p.type, p.quantity || 0, p.price_per_unit || 0, (p.quantity || 0) * (p.price_per_unit || 0)]
          );
        }
      }
    }

    await conn.commit();

    res.status(201).json({
      message: 'Matagumpay na naitala ang kita!',
      id: recordId
    });
  } catch (err) {
    await conn.rollback();
    console.error('❌ Error saving farmer income:', {
      message: err.message,
      code: err.code,
      sql: err.sql,
      stack: err.stack
    });
    res.status(500).json({ error: 'May problema sa pag-save ng talaan. ' + err.message });
  } finally {
    conn.release();
  }
});

// GET /api/farmer-income/by-barangay/:barangayId - Get all income records for a barangay (for officers)
router.get('/by-barangay/:barangayId', async (req, res) => {
  try {
    const { barangayId } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);
    
    // Check if user can access this barangay's records
    if (userBarangayId && parseInt(barangayId) !== userBarangayId) {
      return res.status(403).json({
        error: 'Access denied. Cannot view income records for other barangays.'
      });
    }

    const [records] = await pool.execute(
      `SELECT r.*, f.full_name as farmer_name, f.barangay_id
       FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE f.barangay_id = ?
       ORDER BY r.created_at DESC`,
      [barangayId]
    );

    // Fetch fertilizers and pesticides for each record
    for (const record of records) {
      const [fertilizers] = await pool.execute(
        `SELECT * FROM farmer_income_fertilizers WHERE record_id = ?`,
        [record.id]
      );
      record.fertilizers = fertilizers;

      const [pesticides] = await pool.execute(
        `SELECT * FROM farmer_income_pesticides WHERE record_id = ?`,
        [record.id]
      );
      record.pesticides = pesticides;
    }

    res.json(records);
  } catch (err) {
    console.error('Error fetching barangay income records:', err);
    res.status(500).json({ error: 'Hindi makuha ang mga talaan.' });
  }
});

// GET /api/farmer-income/:farmerId - Get all income records for a farmer
router.get('/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);
    
    // Check if farmer belongs to user's barangay
    const farmerBarangay = await getFarmerBarangay(farmerId);
    if (userBarangayId && farmerBarangay !== userBarangayId) {
      return res.status(403).json({ 
        error: 'Access denied. Cannot view income records for other barangays.' 
      });
    }

    const [records] = await pool.execute(
      `SELECT * FROM farmer_income_records WHERE farmer_id = ? ORDER BY created_at DESC`,
      [farmerId]
    );

    // Fetch fertilizers and pesticides for each record
    for (const record of records) {
      const [fertilizers] = await pool.execute(
        `SELECT * FROM farmer_income_fertilizers WHERE record_id = ?`,
        [record.id]
      );
      record.fertilizers = fertilizers;

      const [pesticides] = await pool.execute(
        `SELECT * FROM farmer_income_pesticides WHERE record_id = ?`,
        [record.id]
      );
      record.pesticides = pesticides;
    }

    res.json(records);
  } catch (err) {
    console.error('Error fetching farmer income records:', err);
    res.status(500).json({ error: 'Hindi makuha ang mga talaan.' });
  }
});

// GET /api/farmer-income/record/:id - Get a single income record with details
router.get('/record/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);

    const [records] = await pool.execute(
      `SELECT r.*, f.full_name as farmer_name, f.barangay_id
       FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE r.id = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({ error: 'Hindi makita ang talaan.' });
    }

    const record = records[0];
    
    // Check if user can access this record's barangay
    if (userBarangayId && record.barangay_id !== userBarangayId) {
      return res.status(403).json({
        error: 'Access denied. Cannot view income records for other barangays.'
      });
    }

    const [fertilizers] = await pool.execute(
      `SELECT * FROM farmer_income_fertilizers WHERE record_id = ?`,
      [id]
    );
    record.fertilizers = fertilizers;

    const [pesticides] = await pool.execute(
      `SELECT * FROM farmer_income_pesticides WHERE record_id = ?`,
      [id]
    );
    record.pesticides = pesticides;

    res.json(record);
  } catch (err) {
    console.error('Error fetching income record:', err);
    res.status(500).json({ error: 'Hindi makuha ang talaan.' });
  }
});

// DELETE /api/farmer-income/:id - Delete an income record
router.delete('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);

    // Get the record with farmer barangay info
    const [records] = await conn.execute(
      `SELECT r.id, f.barangay_id FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE r.id = ?`,
      [id]
    );

    if (records.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hindi makita ang talaan.' });
    }

    // Check if user can delete this record
    if (userBarangayId && records[0].barangay_id !== userBarangayId) {
      await conn.rollback();
      return res.status(403).json({
        error: 'Access denied. Cannot delete income records for other barangays.'
      });
    }

    // Delete child records first
    await conn.execute('DELETE FROM farmer_income_fertilizers WHERE record_id = ?', [id]);
    await conn.execute('DELETE FROM farmer_income_pesticides WHERE record_id = ?', [id]);
    await conn.execute('DELETE FROM farmer_income_records WHERE id = ?', [id]);

    await conn.commit();
    res.json({ message: 'Matagumpay na nabura ang talaan.' });
  } catch (err) {
    await conn.rollback();
    console.error('Error deleting income record:', err);
    res.status(500).json({ error: 'Hindi mabura ang talaan.' });
  } finally {
    conn.release();
  }
});

// PUT /api/farmer-income/:id - Update an income record (farmer only)
router.put('/:id', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);

    const {
      farmer_id,
      area_hectares,
      planting_method,
      irrigation_type,
      fertilizers,
      pesticides,
      land_preparation_cost,
      planting_cost,
      spraying_cost,
      harvester_cost,
      drying_cost,
      hauling_cost,
      tarasko_cost,
      fuel_cost,
      other_expenses,
      sacks_harvested,
      kg_per_sack,
      price_per_kg,
      total_fertilizer_cost,
      total_pesticide_cost,
      total_labor_cost,
      gross_income,
      total_expenses,
      net_income
    } = req.body;

    // Verify existence and get barangay info
    const [existing] = await conn.execute(
      `SELECT r.farmer_id, f.barangay_id FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE r.id = ?`,
      [id]
    );
    if (existing.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hindi makita ang talaan.' });
    }
    if (existing[0].farmer_id !== farmer_id) {
      await conn.rollback();
      return res.status(403).json({ error: 'Hindi mo maaaring i-edit ang talaang ito.' });
    }

    // Check if user can update this record's barangay
    if (userBarangayId && existing[0].barangay_id !== userBarangayId) {
      await conn.rollback();
      return res.status(403).json({
        error: 'Access denied. Cannot update income records for other barangays.'
      });
    }

    // Update main record
    await conn.execute(
      `UPDATE farmer_income_records SET
        area_hectares = ?, planting_method = ?, irrigation_type = ?,
        land_preparation_cost = ?, planting_cost = ?, spraying_cost = ?, harvester_cost = ?,
        drying_cost = ?, hauling_cost = ?, tarasko_cost = ?, fuel_cost = ?, other_expenses = ?,
        sacks_harvested = ?, kg_per_sack = ?, price_per_kg = ?,
        total_fertilizer_cost = ?, total_pesticide_cost = ?, total_labor_cost = ?,
        gross_income = ?, total_expenses = ?, net_income = ?
      WHERE id = ?`,
      [
        area_hectares, planting_method, irrigation_type,
        land_preparation_cost || 0, planting_cost || 0, spraying_cost || 0, harvester_cost || 0,
        drying_cost || 0, hauling_cost || 0, tarasko_cost || 0, fuel_cost || 0, other_expenses || 0,
        sacks_harvested || 0, kg_per_sack || 0, price_per_kg || 0,
        total_fertilizer_cost || 0, total_pesticide_cost || 0, total_labor_cost || 0,
        gross_income || 0, total_expenses || 0, net_income || 0,
        id
      ]
    );

    // Replace fertilizers: delete old, insert new
    await conn.execute('DELETE FROM farmer_income_fertilizers WHERE record_id = ?', [id]);
    if (fertilizers && fertilizers.length > 0) {
      for (const f of fertilizers) {
        if (f.type) {
          await conn.execute(
            `INSERT INTO farmer_income_fertilizers (record_id, fertilizer_type, sacks, price_per_sack, line_total)
             VALUES (?, ?, ?, ?, ?)`,
            [id, f.type, f.sacks || 0, f.price_per_sack || 0, (f.sacks || 0) * (f.price_per_sack || 0)]
          );
        }
      }
    }

    // Replace pesticides: delete old, insert new
    await conn.execute('DELETE FROM farmer_income_pesticides WHERE record_id = ?', [id]);
    if (pesticides && pesticides.length > 0) {
      for (const p of pesticides) {
        if (p.type) {
          await conn.execute(
            `INSERT INTO farmer_income_pesticides (record_id, pesticide_type, quantity, price_per_unit, line_total)
             VALUES (?, ?, ?, ?, ?)`,
            [id, p.type, p.quantity || 0, p.price_per_unit || 0, (p.quantity || 0) * (p.price_per_unit || 0)]
          );
        }
      }
    }

    await conn.commit();
    res.json({ message: 'Matagumpay na na-update ang talaan!' });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating farmer income:', err);
    res.status(500).json({ error: 'May problema sa pag-update ng talaan.' });
  } finally {
    conn.release();
  }
});

// PUT /api/farmer-income/:id/status - Update income record status (officers only)
router.put('/:id/status', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { status, reason_notes } = req.body;
    const userBarangayId = getUserBarangayFromToken(req);

    // Validate status
    const VALID_STATUSES = ['Submitted', 'Under Review', 'Eligible', 'Upcoming Assistance', 'Received'];
    if (!VALID_STATUSES.includes(status)) {
      await conn.rollback();
      return res.status(400).json({ 
        error: 'Invalid status. Allowed: ' + VALID_STATUSES.join(', ') 
      });
    }

    // Get current record and verify barangay access
    const [records] = await conn.execute(
      `SELECT r.*, f.barangay_id FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE r.id = ?`,
      [id]
    );

    if (records.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hindi makita ang talaan.' });
    }

    const record = records[0];
    if (userBarangayId && record.barangay_id !== userBarangayId) {
      await conn.rollback();
      return res.status(403).json({
        error: 'Access denied. Cannot update income records for other barangays.'
      });
    }

    const oldStatus = record.status;

    // Update the status and audit trail
    await conn.execute(
      `UPDATE farmer_income_records SET status = ? WHERE id = ?`,
      [status, id]
    );

    // Log the status change
    await conn.execute(
      `INSERT INTO income_status_audit_log (income_record_id, farmer_id, old_status, new_status, changed_by, reason_notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, record.farmer_id, oldStatus, status, getUserIdFromToken(req), reason_notes || null]
    );

    await conn.commit();
    res.json({ 
      message: 'Matagumpay na na-update ang status!',
      old_status: oldStatus,
      new_status: status
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating income status:', err);
    res.status(500).json({ error: 'May problema sa pag-update ng status.' });
  } finally {
    conn.release();
  }
});

// PUT /api/farmer-income/:id/verify - Verify income record by President
router.put('/:id/verify', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { is_verified, rejection_reason } = req.body;
    const userBarangayId = getUserBarangayFromToken(req);

    // Get current record and verify barangay access
    const [records] = await conn.execute(
      `SELECT r.*, f.barangay_id FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE r.id = ?`,
      [id]
    );

    if (records.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hindi makita ang talaan.' });
    }

    const record = records[0];
    if (userBarangayId && record.barangay_id !== userBarangayId) {
      await conn.rollback();
      return res.status(403).json({
        error: 'Access denied. Cannot verify income records for other barangays.'
      });
    }

    const oldStatus = record.status;
    const newStatus = is_verified ? 'Eligible' : 'Pending';

    // Update the status
    await conn.execute(
      `UPDATE farmer_income_records SET status = ? WHERE id = ?`,
      [newStatus, id]
    );

    // Log the verification
    await conn.execute(
      `INSERT INTO income_status_audit_log (income_record_id, farmer_id, old_status, new_status, changed_by, reason_notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [id, record.farmer_id, oldStatus, newStatus, getUserIdFromToken(req), rejection_reason || null]
    );

    await conn.commit();
    res.json({ 
      message: is_verified ? 'Ipinagkumpitansa ang talaan bilang Eligible!' : 'Ibinabalik ang talaan para sa karagdagang impormasyon!',
      old_status: oldStatus,
      new_status: newStatus
    });
  } catch (err) {
    await conn.rollback();
    console.error('Error verifying income record:', err);
    res.status(500).json({ error: 'May problema sa pagsusuri ng talaan.' });
  } finally {
    conn.release();
  }
});

// GET /api/farmer-income/:id/audit-log - Get status change audit log
router.get('/:id/audit-log', async (req, res) => {
  try {
    const { id } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);

    // Verify barangay access
    const [records] = await pool.execute(
      `SELECT r.*, f.barangay_id FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE r.id = ?`,
      [id]
    );

    if (records.length === 0) {
      return res.status(404).json({ error: 'Hindi makita ang talaan.' });
    }

    if (userBarangayId && records[0].barangay_id !== userBarangayId) {
      return res.status(403).json({
        error: 'Access denied. Cannot view audit log for other barangays.'
      });
    }

    const [auditLogs] = await pool.execute(
      `SELECT l.*, u.full_name as changed_by_name 
       FROM income_status_audit_log l
       LEFT JOIN users u ON l.changed_by = u.id
       WHERE l.income_record_id = ?
       ORDER BY l.created_at DESC`,
      [id]
    );

    res.json(auditLogs);
  } catch (err) {
    console.error('Error fetching audit log:', err);
    res.status(500).json({ error: 'Hindi makuha ang audit log.' });
  }
});

// POST /api/income-distributions - Create a distribution record
router.post('/distribution/create', async (req, res) => {
  const conn = await pool.getConnection();
  let transactionStarted = false;
  let transactionCommitted = false;
  try {
    await ensureIncomeDistributionSmsSchema();
    await conn.beginTransaction();
    transactionStarted = true;
    const { income_record_id, assistance_type, quantity, unit, notes } = req.body;
    const userBarangayId = getUserBarangayFromToken(req);
    const userId = getUserIdFromToken(req);

    // Validate user ID
    if (!userId) {
      await conn.rollback();
      return res.status(401).json({ error: 'Hindi valid ang iyong session. Mag-login ulit.' });
    }

    // Validate required fields
    if (!income_record_id || !assistance_type || !quantity) {
      await conn.rollback();
      return res.status(400).json({ error: 'Kulang ang kinakailangang impormasyon.' });
    }

    const [existingDistributions] = await conn.execute(
      `SELECT id, status
       FROM income_assistance_distributions
       WHERE income_record_id = ?
       LIMIT 1`,
      [income_record_id]
    );

    if (existingDistributions.length > 0) {
      await conn.rollback();
      return res.status(409).json({
        error: 'May naitalang allocation na para sa income record na ito.',
        distribution_id: existingDistributions[0].id
      });
    }

    // Verify income record exists and get details
    const [incomeRecords] = await conn.execute(
      `SELECT r.*, f.id as farmer_id, f.barangay_id, f.full_name as farmer_name, f.phone_number FROM farmer_income_records r
       JOIN farmers f ON r.farmer_id = f.id
       WHERE r.id = ?`,
      [income_record_id]
    );

    if (incomeRecords.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hindi makita ang income record.' });
    }

    const record = incomeRecords[0];
    if (userBarangayId && record.barangay_id !== userBarangayId) {
      await conn.rollback();
      return res.status(403).json({
        error: 'Access denied. Cannot create distribution for other barangays.'
      });
    }

    // Check if record is eligible (approved by President)
    if (record.status !== 'Eligible') {
      await conn.rollback();
      return res.status(400).json({ 
        error: 'Ang record ay dapat maging "Eligible" bago lumikha ng distribution. Mag-hintay sa pagpapatunay ng Pangulo.' 
      });
    }

    // Validate assistance type
    if (!['fertilizer', 'seeds', 'both'].includes(assistance_type)) {
      await conn.rollback();
      return res.status(400).json({ error: 'Invalid assistance type.' });
    }

    const assistanceLabel = getAssistanceLabel(assistance_type);
    const smsMessage = buildAssistanceSmsMessage({
      farmerName: record.farmer_name,
      assistanceLabel,
      notes
    });

    // Insert distribution record
    const [result] = await conn.execute(
      `INSERT INTO income_assistance_distributions 
       (income_record_id, farmer_id, barangay_id, assistance_type, quantity, unit, created_by, notes, sms_status, sms_message)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', ?)`,
      [income_record_id, record.farmer_id, record.barangay_id, assistance_type, quantity || 0, unit || '', userId, notes || '', smsMessage]
    );

    await conn.execute(
      `UPDATE farmer_income_records
       SET status = 'Upcoming Assistance'
       WHERE id = ?`,
      [income_record_id]
    );

    await conn.execute(
      `INSERT INTO income_status_audit_log (income_record_id, farmer_id, old_status, new_status, changed_by, reason_notes)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [income_record_id, record.farmer_id, record.status, 'Upcoming Assistance', userId, `Distribution allocated: ${assistance_type}${notes ? ` - ${notes}` : ''}`]
    );

    await conn.commit();
    transactionCommitted = true;

    const notificationMessage = `Hello ${record.farmer_name}, you have been approved to receive ${assistanceLabel}. Please wait for further instructions regarding the schedule and distribution details.`;
    let notificationCreated = false;
    let smsResult = {
      success: false,
      status: 'failed',
      provider: null,
      recipient: null,
      error: 'SMS was not attempted.'
    };

    try {
      notificationCreated = await createIncomeAssistanceNotification({
        farmerId: record.farmer_id,
        distributionId: result.insertId,
        assistanceLabel: assistanceLabel === 'agricultural assistance' ? 'Agricultural' : assistanceLabel.replace(/\b\w/g, (char) => char.toUpperCase()),
        message: notificationMessage
      });

      smsResult = await sendSmsNotification({
        to: record.phone_number,
        message: smsMessage
      });

      await updateDistributionSmsState(result.insertId, smsMessage, {
        ...smsResult,
        rawRecipient: record.phone_number
      });
    } catch (postCommitError) {
      console.error('Post-commit distribution notification error:', postCommitError);
      smsResult = {
        success: false,
        status: 'failed',
        provider: smsResult.provider || null,
        recipient: smsResult.recipient || normalizePhilippinePhoneNumber(record.phone_number).formatted || null,
        error: 'Allocation was saved, but SMS tracking could not be completed.'
      };
    }

    res.status(201).json({
      message: 'Matagumpay na maipon ang distribution record!',
      id: result.insertId,
      notification: {
        created: notificationCreated
      },
      sms: {
        success: smsResult.success,
        status: smsResult.status,
        provider: smsResult.provider,
        recipient: smsResult.recipient || null,
        error: smsResult.success ? null : smsResult.error
      }
    });
  } catch (err) {
    if (transactionStarted && !transactionCommitted) {
      await conn.rollback();
    }
    console.error('Error creating distribution:', err);
    res.status(500).json({ error: 'May problema sa paglikha ng distribution record. ' + err.message });
  } finally {
    conn.release();
  }
});

// GET /api/farmer-income/distribution/by-barangay/:barangayId - Get all distributions for a barangay
router.get('/distribution/by-barangay/:barangayId', async (req, res) => {
  try {
    const { barangayId } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);

    if (userBarangayId && parseInt(barangayId) !== userBarangayId) {
      return res.status(403).json({
        error: 'Access denied. Cannot view distributions for other barangays.'
      });
    }

    const [distributions] = await pool.execute(
      `SELECT d.*, f.full_name as farmer_name, u.full_name as created_by_name, cu.full_name as confirmed_by_name
       FROM income_assistance_distributions d
       JOIN farmers f ON d.farmer_id = f.id
       LEFT JOIN farmers u ON d.created_by = u.id
       LEFT JOIN farmers cu ON d.confirmed_by = cu.id
       WHERE d.barangay_id = ?
       ORDER BY d.created_at DESC`,
      [barangayId]
    );

    res.json(distributions);
  } catch (err) {
    console.error('Error fetching distributions:', err);
    res.status(500).json({ error: 'Hindi makuha ang mga distribution records.' });
  }
});

// PUT /api/farmer-income/distribution/:id/status - Update distribution status
router.put('/distribution/:id/status', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const { status, distribution_date = null, received_date = null } = req.body;
    const userBarangayId = getUserBarangayFromToken(req);

    // Validate status
    const VALID_STATUSES = ['Pending', 'Ready for Distribution', 'Distributed', 'Confirmed Received'];
    if (!VALID_STATUSES.includes(status)) {
      await conn.rollback();
      return res.status(400).json({ 
        error: 'Invalid status. Allowed: ' + VALID_STATUSES.join(', ') 
      });
    }

    // Get distribution record
    const [distributions] = await conn.execute(
      `SELECT * FROM income_assistance_distributions WHERE id = ?`,
      [id]
    );

    if (distributions.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hindi makita ang distribution record.' });
    }

    const dist = distributions[0];
    if (userBarangayId && dist.barangay_id !== userBarangayId) {
      await conn.rollback();
      return res.status(403).json({
        error: 'Access denied. Cannot update distributions for other barangays.'
      });
    }

    // Update status and dates
    await conn.execute(
      `UPDATE income_assistance_distributions SET
       status = ?,
       distribution_date = IF(? != '', ?, distribution_date),
       received_date = IF(? != '', ?, received_date)
       WHERE id = ?`,
      [status, distribution_date || '', distribution_date, received_date || '', received_date, id]
    );

    await conn.commit();
    res.json({ message: 'Matagumpay na na-update ang distribution status!' });
  } catch (err) {
    await conn.rollback();
    console.error('Error updating distribution status:', err);
    res.status(500).json({ error: 'May problema sa pag-update ng distribution status.' });
  } finally {
    conn.release();
  }
});

// POST /api/farmer-income/distribution/:id/retry-sms - Retry SMS for an existing allocation
router.post('/distribution/:id/retry-sms', async (req, res) => {
  try {
    await ensureIncomeDistributionSmsSchema();

    const { id } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);

    const [distributions] = await pool.execute(
      `SELECT d.*, f.full_name as farmer_name, f.phone_number
       FROM income_assistance_distributions d
       JOIN farmers f ON d.farmer_id = f.id
       WHERE d.id = ?`,
      [id]
    );

    if (distributions.length === 0) {
      return res.status(404).json({ error: 'Hindi makita ang distribution record.' });
    }

    const distribution = distributions[0];
    if (userBarangayId && distribution.barangay_id !== userBarangayId) {
      return res.status(403).json({
        error: 'Access denied. Cannot resend SMS for other barangays.'
      });
    }

    if (distribution.sms_status === 'sent') {
      return res.status(409).json({
        error: 'Naipadala na ang SMS para sa allocation na ito.'
      });
    }

    const assistanceLabel = getAssistanceLabel(distribution.assistance_type);
    const smsMessage = distribution.sms_message || buildAssistanceSmsMessage({
      farmerName: distribution.farmer_name,
      assistanceLabel,
      notes: distribution.notes
    });

    const notificationMessage = `Hello ${distribution.farmer_name}, you have been approved to receive ${assistanceLabel}. Please wait for further instructions regarding the schedule and distribution details.`;
    await createIncomeAssistanceNotification({
      farmerId: distribution.farmer_id,
      distributionId: distribution.id,
      assistanceLabel: assistanceLabel === 'agricultural assistance' ? 'Agricultural' : assistanceLabel.replace(/\b\w/g, (char) => char.toUpperCase()),
      message: notificationMessage
    });

    const smsResult = await sendSmsNotification({
      to: distribution.phone_number,
      message: smsMessage
    });

    await updateDistributionSmsState(distribution.id, smsMessage, {
      ...smsResult,
      rawRecipient: distribution.phone_number
    });

    res.json({
      message: smsResult.success ? 'Matagumpay na naipadala ang SMS.' : 'Hindi naipadala ang SMS, ngunit nanatili ang allocation at in-app notification.',
      sms: {
        success: smsResult.success,
        status: smsResult.status,
        provider: smsResult.provider,
        recipient: smsResult.recipient || null,
        error: smsResult.success ? null : smsResult.error
      }
    });
  } catch (err) {
    console.error('Error retrying distribution SMS:', err);
    res.status(500).json({ error: 'May problema sa muling pagpapadala ng SMS. ' + err.message });
  }
});

// PUT /api/farmer-income/distribution/:id/confirm - Confirm farmer received assistance
router.put('/distribution/:id/confirm', async (req, res) => {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const { id } = req.params;
    const userBarangayId = getUserBarangayFromToken(req);
    const userId = getUserIdFromToken(req);

    // Get distribution record
    const [distributions] = await conn.execute(
      `SELECT * FROM income_assistance_distributions WHERE id = ?`,
      [id]
    );

    if (distributions.length === 0) {
      await conn.rollback();
      return res.status(404).json({ error: 'Hindi makita ang distribution record.' });
    }

    const dist = distributions[0];
    if (userBarangayId && dist.barangay_id !== userBarangayId) {
      await conn.rollback();
      return res.status(403).json({
        error: 'Access denied. Cannot confirm distributions for other barangays.'
      });
    }

    // Update distribution with confirmation
    await conn.execute(
      `UPDATE income_assistance_distributions SET
       status = 'Confirmed Received',
       received_date = NOW(),
       confirmed_by = ?,
       confirmed_at = NOW()
       WHERE id = ?`,
      [userId, id]
    );

    // Update the income record status to 'Received' if all distributions are confirmed
    const recordId = dist.income_record_id;
    const [allDistributions] = await conn.execute(
      `SELECT COUNT(*) as total, 
              SUM(CASE WHEN status = 'Confirmed Received' THEN 1 ELSE 0 END) as confirmed
       FROM income_assistance_distributions
       WHERE income_record_id = ?`,
      [recordId]
    );

    if (allDistributions.length > 0 && 
        allDistributions[0].total > 0 && 
        allDistributions[0].total === allDistributions[0].confirmed) {
      await conn.execute(
        `UPDATE farmer_income_records SET status = 'Received' WHERE id = ?`,
        [recordId]
      );
    }

    await conn.commit();
    res.json({ message: 'Matagumpay na nakonpirma ang pagkuha ng assistance!' });
  } catch (err) {
    await conn.rollback();
    console.error('Error confirming distribution:', err);
    res.status(500).json({ error: 'May problema sa pagkonpirma ng distribution.' });
  } finally {
    conn.release();
  }
});

// Helper function to get user ID from token
const getUserIdFromToken = (req) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  
  try {
    const jwt = require('jsonwebtoken');
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    return decoded.id || null;
  } catch (err) {
    return null;
  }
};

// GET /api/farmer-income/distribution/completed/:farmerId - Get completed assistance for a farmer
router.get('/distribution/completed/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const userId = getUserIdFromToken(req);
    
    // Only allow farmers to see their own distributions, officers can see their barangay's
    if (!userId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const [distributions] = await pool.execute(
      `SELECT d.*, f.full_name as farmer_name
       FROM income_assistance_distributions d
       JOIN farmers f ON d.farmer_id = f.id
       WHERE d.farmer_id = ? AND d.status IN ('Distributed', 'Confirmed Received')
       ORDER BY d.created_at DESC`,
      [farmerId]
    );

    res.json(distributions);
  } catch (err) {
    console.error('Error fetching completed assistance:', err);
    res.status(500).json({ error: 'Hindi makuha ang tulong na natanggap.' });
  }
});

// GET /api/farmer-income/distribution/completed/all - Get all completed assistance (admin only)
router.get('/distribution/completed/all', async (req, res) => {
  try {
    const [distributions] = await pool.execute(
      `SELECT d.*, f.full_name as farmer_name
       FROM income_assistance_distributions d
       JOIN farmers f ON d.farmer_id = f.id
       WHERE d.status IN ('Distributed', 'Confirmed Received')
       ORDER BY d.created_at DESC`
    );

    res.json(distributions);
  } catch (err) {
    console.error('Error fetching all completed assistance:', err);
    res.status(500).json({ error: 'Hindi makuha ang mga tulong na natanggap.' });
  }
});

module.exports = router;
