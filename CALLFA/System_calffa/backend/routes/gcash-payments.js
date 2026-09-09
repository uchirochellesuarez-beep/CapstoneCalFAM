const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { verifyToken } = require('../middleware/auth');
const {
  getActiveQr,
  saveQrImage,
  deactivateQr,
  submitFarmerProof,
  confirmSubmission,
  rejectSubmission,
  listPendingSubmissions,
  listBarangayHistory,
  listMineForTransaction,
  lookupLatestSubmission,
  getSubmissionById
} = require('../services/gcash-payment-service');

const router = express.Router();

const IMAGE_TYPES = /jpeg|jpg|jfif|png|gif|webp/;

function imageFileFilter(req, file, cb) {
  const extname = IMAGE_TYPES.test(path.extname(file.originalname || '').toLowerCase());
  const mimetype = IMAGE_TYPES.test(file.mimetype || '');
  if (mimetype && extname) return cb(null, true);
  cb(new Error('Only image files are allowed'));
}

function diskUpload(subdir, prefix, maxBytes) {
  const dest = path.join(__dirname, '..', 'uploads', subdir);
  if (!fs.existsSync(dest)) fs.mkdirSync(dest, { recursive: true });
  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => cb(null, dest),
      filename: (req, file, cb) => {
        const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
        cb(null, `${prefix}-${unique}${path.extname(file.originalname || '').toLowerCase()}`);
      }
    }),
    limits: { fileSize: maxBytes },
    fileFilter: imageFileFilter
  });
}

const uploadQr = diskUpload('gcash-qr', 'gcash-qr', 5 * 1024 * 1024);
const uploadProof = diskUpload('payment-proofs', 'gcash-proof', 10 * 1024 * 1024);

function handleMulter(upload, field) {
  return (req, res, next) => {
    upload.single(field)(req, res, (err) => {
      if (!err) return next();
      const message = err.code === 'LIMIT_FILE_SIZE'
        ? 'Image file is too large'
        : (err.message || 'Only image files are allowed');
      return res.status(400).json({ success: false, message });
    });
  };
}

function sendServiceError(res, error) {
  const status = error.statusCode || 500;
  if (status >= 500) console.error('GCash payment error:', error);
  return res.status(status).json({ success: false, message: error.message || 'Request failed' });
}

router.use(verifyToken);

router.get('/qr', async (req, res) => {
  try {
    const barangayId = req.user.role === 'admin' && req.query.barangay_id
      ? req.query.barangay_id
      : req.user.barangay_id;
    if (!barangayId) {
      return res.status(400).json({ success: false, message: 'No barangay assigned to this account.' });
    }
    const qr = await getActiveQr(require('../db'), barangayId);
    res.json({
      success: true,
      qr: qr
        ? {
            id: qr.id,
            image_path: qr.image_path,
            original_filename: qr.original_filename,
            uploaded_by_name: qr.uploaded_by_name,
            updated_at: qr.updated_at || qr.created_at
          }
        : null
    });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.post('/qr', handleMulter(uploadQr, 'qr_image'), async (req, res) => {
  try {
    if (req.user.role !== 'treasurer') {
      return res.status(403).json({ success: false, message: 'Only the treasurer can manage the GCash QR code.' });
    }
    if (!req.user.barangay_id) {
      return res.status(400).json({ success: false, message: 'Your account is not assigned to a barangay.' });
    }
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload an image file of the GCash QR code.' });
    }
    const qr = await saveQrImage(require('../db'), {
      barangayId: req.user.barangay_id,
      userId: req.user.id,
      file: req.file
    });
    res.json({
      success: true,
      message: 'GCash QR code saved.',
      qr: {
        id: qr.id,
        image_path: qr.image_path,
        original_filename: qr.original_filename,
        uploaded_by_name: qr.uploaded_by_name || req.user.full_name,
        updated_at: qr.updated_at || qr.created_at
      }
    });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.delete('/qr', async (req, res) => {
  try {
    if (req.user.role !== 'treasurer') {
      return res.status(403).json({ success: false, message: 'Only the treasurer can manage the GCash QR code.' });
    }
    const removed = await deactivateQr(require('../db'), req.user.barangay_id);
    if (!removed) {
      return res.status(404).json({ success: false, message: 'No GCash QR code is currently uploaded.' });
    }
    res.json({ success: true, message: 'GCash QR code removed.' });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.get('/pending', async (req, res) => {
  try {
    if (req.user.role !== 'treasurer') {
      return res.status(403).json({ success: false, message: 'Only the treasurer can view pending GCash payments.' });
    }
    if (!req.user.barangay_id) {
      return res.status(400).json({ success: false, message: 'Your account is not assigned to a barangay.' });
    }
    const submissions = await listPendingSubmissions(require('../db'), req.user.barangay_id);
    res.json({ success: true, submissions });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.get('/history', async (req, res) => {
  try {
    if (req.user.role !== 'treasurer') {
      return res.status(403).json({ success: false, message: 'Only the treasurer can view GCash payment history.' });
    }
    if (!req.user.barangay_id) {
      return res.status(400).json({ success: false, message: 'Your account is not assigned to a barangay.' });
    }
    const submissions = await listBarangayHistory(require('../db'), req.user.barangay_id);
    res.json({ success: true, submissions });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.get('/lookup', async (req, res) => {
  try {
    if (!['treasurer', 'president', 'admin'].includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Not allowed to look up GCash submissions.' });
    }
    const type = String(req.query.transaction_type || '').toLowerCase() === 'loan' ? 'loan' : 'machinery';
    const referenceId = parseInt(req.query.reference_id, 10);
    if (!referenceId) {
      return res.status(400).json({ success: false, message: 'reference_id is required' });
    }
    const submission = await lookupLatestSubmission(require('../db'), {
      user: req.user,
      transactionType: type,
      referenceId
    });
    res.json({ success: true, submission: submission || null });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.get('/mine', async (req, res) => {
  try {
    const type = String(req.query.transaction_type || '').toLowerCase() === 'loan' ? 'loan' : 'machinery';
    const referenceId = parseInt(req.query.reference_id, 10);
    if (!referenceId) {
      return res.status(400).json({ success: false, message: 'reference_id is required' });
    }
    const submissions = await listMineForTransaction(require('../db'), req.user.id, type, referenceId);
    res.json({ success: true, submissions });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.get('/submissions/:id', async (req, res) => {
  try {
    const submission = await getSubmissionById(require('../db'), {
      user: req.user,
      submissionId: req.params.id
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'GCash payment submission not found.' });
    }
    res.json({ success: true, submission });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.post('/submit', handleMulter(uploadProof, 'payment_proof'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Please upload a screenshot or proof of payment image.' });
    }
    const result = await submitFarmerProof(require('../db'), {
      user: req.user,
      transactionType: req.body.transaction_type,
      referenceId: req.body.reference_id,
      paymentDate: req.body.payment_date,
      file: req.file
    });
    res.json({
      success: true,
      message: 'Proof submitted. Status is Pending Verification until the treasurer confirms the payment.',
      submission: result
    });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.get('/:id', async (req, res) => {
  try {
    const submission = await getSubmissionById(require('../db'), {
      user: req.user,
      submissionId: req.params.id
    });
    if (!submission) {
      return res.status(404).json({ success: false, message: 'GCash payment submission not found.' });
    }
    res.json({ success: true, submission });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.post('/:id/confirm', async (req, res) => {
  try {
    const result = await confirmSubmission(require('../db'), {
      user: req.user,
      submissionId: req.params.id,
      amountPaid: req.body.amount_paid,
      remarks: req.body.remarks
    });
    res.json({
      success: true,
      message: 'Payment verified. Official receipt generated.',
      ...result
    });
  } catch (error) {
    sendServiceError(res, error);
  }
});

router.post('/:id/reject', async (req, res) => {
  try {
    const result = await rejectSubmission(require('../db'), {
      user: req.user,
      submissionId: req.params.id,
      reason: req.body.reason
    });
    res.json({
      success: true,
      message: 'Payment proof rejected. The farmer may submit a new screenshot.',
      ...result
    });
  } catch (error) {
    sendServiceError(res, error);
  }
});

module.exports = router;
