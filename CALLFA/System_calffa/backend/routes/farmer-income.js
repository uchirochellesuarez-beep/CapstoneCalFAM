const express = require('express');
const multer = require('multer');
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
const {
  forecastFutureTotalExpenses,
  getUserUploadedFoundationSummary,
  saveUserUploadedFoundation,
  clearUserUploadedFoundation,
  MAX_UPLOAD_POINTS,
  MAX_FOUNDATION_FILE_BYTES,
} = require('../services/expenseForecastService');

const uploadFoundationMem = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FOUNDATION_FILE_BYTES },
});

function decodeIncomeJwt(req) {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return null;
  try {
    const jwt = require('jsonwebtoken');
    return jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
  } catch {
    return null;
  }
}

async function assertExpenseFoundationAccess(req, farmerId) {
  const decoded = decodeIncomeJwt(req);
  if (!decoded) {
    return { ok: false, status: 401, error: 'Hindi authorized. Mag-login muna.' };
  }
  const uid = Number(farmerId);
  if (!Number.isFinite(uid) || uid <= 0) {
    return { ok: false, status: 400, error: 'Hindi wastong farmer ID.' };
  }
  const role = String(decoded.role || '');
  if (role === 'farmer') {
    if (Number(decoded.id) !== uid) {
      return {
        ok: false,
        status: 403,
        error: 'Maaari lamang i-upload ang pundasyon para sa sariling account.',
      };
    }
    return { ok: true, decoded };
  }
  if (role === 'president') {
    const userBarangayId =
      decoded.barangay_id != null ? Number(decoded.barangay_id) : null;
    const farmerBarangay = await getFarmerBarangay(uid);
    if (userBarangayId != null && farmerBarangay !== userBarangayId) {
      return { ok: false, status: 403, error: 'Access denied. Iba ang barangay.' };
    }
    return { ok: true, decoded };
  }
  return {
    ok: false,
    status: 403,
    error:
      'Tanging magsasaka o Barangay President lamang ang maaaring mag-manage ng pundasyong datos ng gastos.',
  };
}

/**
 * Bawat puntos ay dapat may tamang farmer_id (o tumugma ang farmer_id sa ugat ng object
 * kung walang farmer_id sa bawat elemento) para hindi mahalo ang datos ng ibang magsasaka.
 * ang period_index ay opsyonal (auto 1,2,3… kung wala).
 */
function parseFoundationPointsFromJson(body, expectedFarmerId) {
  const uid = Number(expectedFarmerId);
  if (!Number.isFinite(uid) || uid <= 0) {
    return { ok: false, error: 'Hindi wastong farmer ID sa upload.' };
  }
  if (!body || typeof body !== 'object') {
    return { ok: false, error: 'Hindi wastong JSON.' };
  }
  let raw = body.points;
  if (!Array.isArray(raw) && Array.isArray(body)) raw = body;
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      error:
        'Kailangan ng "points" array. Halimbawa: { "farmer_id": ' +
        uid +
        ', "points": [ { "farmer_id": ' +
        uid +
        ', "total_expenses": 50000, "period_index": 1 } ] } — ang farmer_id sa bawat puntos (o sa ugat) ay dapat ' +
        uid +
        '.',
    };
  }
  const rootFarmer =
    body.farmer_id != null && Number.isFinite(Number(body.farmer_id))
      ? Number(body.farmer_id)
      : null;
  if (rootFarmer != null && rootFarmer !== uid) {
    return {
      ok: false,
      error: `Ang farmer_id sa ugat (${rootFarmer}) ay dapat ${uid} para sa upload na ito.`,
    };
  }
  const points = [];
  for (let i = 0; i < raw.length; i += 1) {
    const p = raw[i];
    const rowFarmer =
      p && p.farmer_id != null && Number.isFinite(Number(p.farmer_id))
        ? Number(p.farmer_id)
        : rootFarmer;
    if (rowFarmer == null || !Number.isFinite(rowFarmer)) {
      return {
        ok: false,
        error: `Kulang o hindi wasto ang farmer_id sa puntos #${i + 1}. Ilagay ang numerong ID ng magsasaka (${uid}) sa bawat elemento, o isang "farmer_id": ${uid} sa ugat ng JSON.`,
      };
    }
    if (rowFarmer !== uid) {
      return {
        ok: false,
        error: `Hindi tumugma ang farmer_id sa puntos #${i + 1} (nakita: ${rowFarmer}; dapat: ${uid}). Hindi ise-save ang file para maiwasan ang paghalo ng record ng ibang magsasaka.`,
      };
    }
    const total = p != null ? parseFloat(p.total_expenses) : NaN;
    if (!Number.isFinite(total) || total < 0) continue;
    const periodIndex =
      p && p.period_index != null && Number.isFinite(Number(p.period_index))
        ? Number(p.period_index)
        : points.length + 1;
    points.push({
      farmer_id: uid,
      period_index: periodIndex,
      total_expenses: total,
    });
  }
  if (points.length === 0) {
    return { ok: false, error: 'Walang wastong puntos (total_expenses).' };
  }
  if (points.length > MAX_UPLOAD_POINTS) {
    return { ok: false, error: `Labis sa ${MAX_UPLOAD_POINTS} na puntos.` };
  }
  return { ok: true, points };
}

/** Excel-style numbers: "80,000" o "1,234.56" → parseFloat-safe (tinatanggal ang comma bilang thousands separator) */
function parseLocaleNumberCell(s) {
  if (s == null) return NaN;
  let t = String(s).trim().replace(/^["']|["']$/g, '');
  if (!t) return NaN;
  const lastComma = t.lastIndexOf(',');
  const lastDot = t.lastIndexOf('.');
  if (lastComma >= 0 && lastDot >= 0) {
    if (lastDot > lastComma) t = t.replace(/,/g, '');
    else t = t.replace(/\./g, '').replace(',', '.');
  } else {
    t = t.replace(/,/g, '');
  }
  return parseFloat(t);
}

function parseFoundationPointsFromText(text, expectedFarmerId) {
  const uid = Number(expectedFarmerId);
  if (!Number.isFinite(uid) || uid <= 0) {
    return { ok: false, error: 'Hindi wastong farmer ID sa upload.' };
  }
  const t = String(text || '').trim();
  if (!t) return { ok: false, error: 'Walang nilalaman ang file.' };
  if (t.startsWith('[') || t.startsWith('{')) {
    try {
      const data = JSON.parse(t);
      return parseFoundationPointsFromJson(data, uid);
    } catch {
      return { ok: false, error: 'Hindi mabasa ang JSON.' };
    }
  }
  const lines = t
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) return { ok: false, error: 'Walang linyang CSV.' };
  let start = 0;
  let cPeriod = -1;
  let cTotal = 0;
  const hdrCells = lines[0].split(',').map((h) => h.trim().toLowerCase());
  const looksHeader =
    hdrCells.some((h) => h.includes('total')) ||
    hdrCells.some((h) => h.includes('gastos')) ||
    hdrCells.some((h) => h.includes('expense')) ||
    hdrCells.some((h) => h === 'farmer_id' || h.includes('farmer'));
  let cFarmer = -1;
  if (looksHeader) {
    cFarmer = hdrCells.findIndex(
      (h) => h === 'farmer_id' || h === 'farmer' || (h.includes('farmer') && h.includes('id'))
    );
    cTotal = hdrCells.findIndex(
      (h) =>
        h === 'total_expenses' ||
        (h.includes('total') && h.includes('expense')) ||
        h.includes('kabuuang') ||
        h === 'gastos'
    );
    if (cTotal < 0) cTotal = Math.max(0, hdrCells.length - 1);
    cPeriod = hdrCells.findIndex(
      (h) => h.includes('period') || h.includes('index') || h.includes('panahon')
    );
    start = 1;
    if (cFarmer < 0) {
      return {
        ok: false,
        error:
          'Kailangan ng column na farmer_id sa CSV (hal. farmer_id,total_expenses o farmer_id,period_index,total_expenses).',
      };
    }
  } else if (hdrCells.length >= 2) {
    cFarmer = 0;
    cPeriod = hdrCells.length >= 3 ? 1 : -1;
    cTotal = hdrCells.length >= 3 ? 2 : 1;
    start = 0;
  } else {
    return {
      ok: false,
      error:
        'Ang CSV ay dapat may hindi bababa sa 2 column: farmer_id, total_expenses (o may header na may farmer_id).',
    };
  }
  const headerColCount = looksHeader ? hdrCells.length : 0;
  const points = [];
  for (let li = start; li < lines.length; li += 1) {
    let parts = lines[li]
      .split(',')
      .map((c) => c.trim().replace(/^["']|["']$/g, ''));
    if (parts.length === 0) continue;
    if (looksHeader && headerColCount >= 2 && parts.length > headerColCount) {
      const merged = parts.slice(0, headerColCount - 1);
      merged.push(parts.slice(headerColCount - 1).join(','));
      parts = merged;
    } else if (!looksHeader && parts.length >= 2) {
      const expectCols = cPeriod >= 0 ? 3 : 2;
      if (parts.length > expectCols) {
        const merged = parts.slice(0, expectCols - 1);
        merged.push(parts.slice(expectCols - 1).join(','));
        parts = merged;
      }
    }
    const rowFarmer = parseLocaleNumberCell(parts[cFarmer] != null ? parts[cFarmer] : '');
    if (!Number.isFinite(rowFarmer) || rowFarmer !== uid) {
      return {
        ok: false,
        error: `Hindi tumugma ang farmer_id sa hilera ${li + 1} ng CSV (nakita: ${parts[cFarmer] || '—'}; dapat: ${uid}).`,
      };
    }
    const total = parseLocaleNumberCell(parts[cTotal] != null ? parts[cTotal] : parts[0]);
    const periodRaw =
      cPeriod >= 0 && parts[cPeriod] != null
        ? parseLocaleNumberCell(parts[cPeriod])
        : NaN;
    if (!Number.isFinite(total) || total < 0) continue;
    points.push({
      farmer_id: uid,
      period_index: Number.isFinite(periodRaw) ? periodRaw : points.length + 1,
      total_expenses: total,
    });
  }
  if (points.length === 0) {
    return { ok: false, error: 'Walang wastong hilera sa CSV.' };
  }
  if (points.length > MAX_UPLOAD_POINTS) {
    return { ok: false, error: `Labis sa ${MAX_UPLOAD_POINTS} na puntos.` };
  }
  return { ok: true, points };
}

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

// GET /api/farmer-income/expense-forecast/:farmerId — Python sklearn (kapag ML_API_URL) / Node OLS fallback
router.get('/expense-forecast/:farmerId', async (req, res) => {
  try {
    const { farmerId } = req.params;
    const uid = Number(farmerId);
    if (!Number.isFinite(uid)) {
      return res.status(400).json({ ok: false, error: 'Hindi wastong farmer ID.' });
    }

    const userBarangayId = getUserBarangayFromToken(req);
    const farmerBarangay = await getFarmerBarangay(uid);
    if (userBarangayId && farmerBarangay !== userBarangayId) {
      return res.status(403).json({
        ok: false,
        error: 'Access denied. Cannot forecast for other barangays.',
      });
    }

    const decodedFc = decodeIncomeJwt(req);
    if (
      decodedFc &&
      String(decodedFc.role) === 'farmer' &&
      Number(decodedFc.id) !== uid
    ) {
      return res.status(403).json({
        ok: false,
        error: 'Access denied.',
      });
    }

    const [records] = await pool.execute(
      `SELECT * FROM farmer_income_records WHERE farmer_id = ?`,
      [uid]
    );

    const result = await forecastFutureTotalExpenses(uid, records);
    res.json(result);
  } catch (err) {
    console.error('Error forecasting farmer expenses:', err);
    res.status(500).json({ ok: false, error: 'Hindi matagumpay ang paghula.' });
  }
});

// GET /api/farmer-income/barangay-farmers/:barangayId — approved farmers list (president: expense foundation UI)
router.get('/barangay-farmers/:barangayId', async (req, res) => {
  try {
    const decoded = decodeIncomeJwt(req);
    if (!decoded) {
      return res.status(401).json({ ok: false, error: 'Unauthorized' });
    }
    if (String(decoded.role) !== 'president') {
      return res.status(403).json({ ok: false, error: 'Access denied.' });
    }
    const bid = Number(req.params.barangayId);
    if (!Number.isFinite(bid)) {
      return res.status(400).json({ ok: false, error: 'Hindi wastong barangay ID.' });
    }
    if (Number(decoded.barangay_id) !== bid) {
      return res.status(403).json({ ok: false, error: 'Access denied.' });
    }
    const [rows] = await pool.execute(
      `SELECT id, full_name, reference_number
       FROM farmers
       WHERE barangay_id = ? AND role = 'farmer' AND status = 'approved'
       ORDER BY full_name ASC`,
      [bid]
    );
    res.json({ ok: true, farmers: rows });
  } catch (err) {
    console.error('barangay-farmers:', err);
    res.status(500).json({ ok: false, error: 'Hindi makuha ang listahan.' });
  }
});

// GET /api/farmer-income/expense-history-foundation/:farmerId — count / preview of uploaded foundation
router.get('/expense-history-foundation/:farmerId', async (req, res) => {
  try {
    const gate = await assertExpenseFoundationAccess(req, req.params.farmerId);
    if (!gate.ok) {
      return res.status(gate.status).json({ ok: false, error: gate.error });
    }
    const summary = getUserUploadedFoundationSummary(req.params.farmerId);
    res.json(summary);
  } catch (err) {
    console.error('expense-history-foundation GET:', err);
    res.status(500).json({ ok: false, error: 'Hindi makuha ang impormasyon.' });
  }
});

// POST /api/farmer-income/expense-history-foundation/:farmerId — JSON body { points } or multipart file (.json/.csv)
router.post(
  '/expense-history-foundation/:farmerId',
  uploadFoundationMem.single('file'),
  async (req, res) => {
    try {
      const gate = await assertExpenseFoundationAccess(req, req.params.farmerId);
      if (!gate.ok) {
        return res.status(gate.status).json({ ok: false, error: gate.error });
      }
      const uid = Number(req.params.farmerId);

      let parsed;
      if (req.file && req.file.buffer) {
        parsed = parseFoundationPointsFromText(req.file.buffer.toString('utf8'), uid);
      } else {
        parsed = parseFoundationPointsFromJson(req.body, uid);
      }
      if (!parsed.ok) {
        return res.status(400).json({ ok: false, error: parsed.error });
      }

      const n = saveUserUploadedFoundation(uid, parsed.points);
      res.json({
        ok: true,
        message: `Nai-save ang ${n} puntong pundasyon para sa paghula.`,
        count: n,
        farmer_id: uid,
      });
    } catch (err) {
      console.error('expense-history-foundation POST:', err);
      res.status(500).json({ ok: false, error: 'Hindi na-save ang pundasyon.' });
    }
  }
);

// DELETE /api/farmer-income/expense-history-foundation/:farmerId — remove uploaded foundation
router.delete('/expense-history-foundation/:farmerId', async (req, res) => {
  try {
    const gate = await assertExpenseFoundationAccess(req, req.params.farmerId);
    if (!gate.ok) {
      return res.status(gate.status).json({ ok: false, error: gate.error });
    }
    clearUserUploadedFoundation(req.params.farmerId);
    res.json({ ok: true, message: 'Naalis ang naka-upload na pundasyon.' });
  } catch (err) {
    console.error('expense-history-foundation DELETE:', err);
    res.status(500).json({ ok: false, error: 'Hindi naalis ang pundasyon.' });
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
      assistanceType: assistance_type,
      quantity,
      unit,
      notes,
      assistanceLabel
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

    const notificationMessage = smsMessage;
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
    const smsMessage =
      distribution.sms_message ||
      buildAssistanceSmsMessage({
        farmerName: distribution.farmer_name,
        assistanceType: distribution.assistance_type,
        quantity: distribution.quantity,
        unit: distribution.unit,
        notes: distribution.notes,
        assistanceLabel
      });

    const notificationMessage = smsMessage;
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

    const [distRowsAfter] = await conn.execute(
      `SELECT id, farmer_id, barangay_id, assistance_type, quantity, received_date, status
       FROM income_assistance_distributions WHERE id = ?`,
      [id]
    );
    const distAfter = distRowsAfter[0];

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
    res.json({
      message: 'Matagumpay na nakonpirma ang pagkuha ng assistance!',
      distribution: distAfter,
    });
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

// GET /api/farmer-income/distribution/completed/all - Admin: all barangays; officers: own barangay
router.get('/distribution/completed/all', async (req, res) => {
  try {
    const { getRequestUser, buildListBarangayScope } = require('../utils/requestUser');
    const user = await getRequestUser(req);
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const { barangay_id } = req.query;
    const scope = buildListBarangayScope(user, barangay_id, 'f');

    const [distributions] = await pool.execute(
      `SELECT d.*, f.full_name as farmer_name, f.barangay_id
       FROM income_assistance_distributions d
       JOIN farmers f ON d.farmer_id = f.id
       WHERE d.status IN ('Distributed', 'Confirmed Received')
       ${scope.clause}
       ORDER BY d.created_at DESC`,
      scope.params
    );

    res.json(distributions);
  } catch (err) {
    console.error('Error fetching all completed assistance:', err);
    res.status(500).json({ error: 'Hindi makuha ang mga tulong na natanggap.' });
  }
});

module.exports = router;
