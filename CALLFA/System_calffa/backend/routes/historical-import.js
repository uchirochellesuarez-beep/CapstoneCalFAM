const express = require('express');
const multer = require('multer');
const path = require('path');
const { verifyToken } = require('../middleware/auth');
const {
  MAX_BYTES,
  analyzeWorkbook,
  commitWorkbook,
  buildTemplateBuffer
} = require('../services/historical-booking-import');

const router = express.Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_BYTES },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (ext === '.xlsx') return cb(null, true);
    cb(new Error('Upload an .xlsx file. If your sheet is .xls, save it as Excel Workbook (.xlsx) first.'));
  }
});

function sendError(res, error) {
  const status = error.statusCode || (error.code === 'LIMIT_FILE_SIZE' ? 400 : 500);
  if (status >= 500) console.error('Historical import error:', error);
  const message = error.code === 'LIMIT_FILE_SIZE'
    ? 'The file is larger than 5 MB.'
    : (error.message || 'Import failed.');
  return res.status(status).json({
    success: false,
    message,
    preview: error.preview || null
  });
}

function handleUpload(req, res, next) {
  upload.single('file')(req, res, (error) => {
    if (!error) return next();
    return sendError(res, error);
  });
}

router.use(verifyToken);

router.get('/template', async (req, res) => {
  try {
    if (!['operation_manager', 'business_manager'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Only the operation manager or business manager can download this template.' });
    }
    const pool = require('../db');
    const [machines] = await pool.execute(
      `SELECT machinery_name
       FROM machinery_inventory
       WHERE barangay_id = ?
       ORDER BY machinery_name`,
      [req.user.barangay_id]
    );
    const buffer = await buildTemplateBuffer(machines.map((row) => row.machinery_name));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="historical-machinery-bookings.xlsx"');
    res.send(Buffer.from(buffer));
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/preview', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an Excel file to preview.' });
    }
    const { presentation } = await analyzeWorkbook(require('../db'), req.user, req.file.buffer);
    res.json({ success: true, ...presentation });
  } catch (error) {
    sendError(res, error);
  }
});

router.post('/commit', handleUpload, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Choose an Excel file to import.' });
    }
    const result = await commitWorkbook(require('../db'), req.user, req.file.buffer, req.file.originalname);
    res.json({
      success: true,
      message: `Imported ${result.imported} historical booking${result.imported === 1 ? '' : 's'}.`,
      ...result
    });
  } catch (error) {
    sendError(res, error);
  }
});

module.exports = router;
