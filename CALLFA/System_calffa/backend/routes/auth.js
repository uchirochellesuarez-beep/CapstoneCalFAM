// routes/auth.js
// Google OAuth and authentication routes

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/jwtSecret');
const bcrypt = require('bcryptjs');
const pool = require('../db');
const { verifyToken, isAdmin } = require('../middleware/auth');
const { clearUserSession } = require('../services/session-service');
const {
  verifyGoogleToken,
  extractGoogleProfileData,
  hasFarmersEmailColumn,
  hasFarmersGoogleIdColumn,
  ensureFarmersGoogleIdColumn,
  ensureFarmersEmailColumn,
  findUserByEmail,
  findUserByGoogleId
} = require('../utils/googleAuth');

/** When Google token is invalid/expired — keep generic. */
const GOOGLE_RESET_DENIED_MESSAGE =
  'Unable to verify Google sign-in. Please try again with your Google account.';

/** When Google auth succeeded but account is not linked in the system. */
const GOOGLE_RESET_NOT_LINKED_MESSAGE =
  'This Google account is not connected to a CALFFA profile yet. Sign in with your reference number and password, open Settings, and connect your Google account first. Then return here to reset your password.';

const RESET_TOKEN_PURPOSE = 'google_password_reset';
const RESET_TOKEN_EXPIRES_IN = '10m';

function validatePasswordStrength(password) {
  if (!password || String(password).length < 8) {
    return 'Password must be at least 8 characters long';
  }
  const hasLetters = /[a-zA-Z]/.test(password);
  const hasNumbers = /[0-9]/.test(password);
  if (!hasLetters || !hasNumbers) {
    return 'Password must contain both letters and numbers';
  }
  return null;
}

/**
 * POST /api/auth/google/verify-token
 * Verify Google ID token and check if user exists
 * Returns user status (existing/new) and profile data
 */
router.post('/google/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    console.log('🔍 DEBUG: Client ID from env:', clientId);
    
    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google Client ID not configured on server'
      });
    }

    await ensureFarmersGoogleIdColumn(pool);

    // Verify token with Google
    const tokenData = await verifyGoogleToken(token, clientId);

    // Extract profile data
    const profileData = extractGoogleProfileData(tokenData);
    const hasGoogleIdColumn = await hasFarmersGoogleIdColumn(pool);

    // Check if user exists by google_id (most reliable)
    const existingUserByGoogle = hasGoogleIdColumn
      ? await findUserByGoogleId(pool, profileData.google_id)
      : null;

    if (existingUserByGoogle) {
      // User exists - return login response
      return res.json({
        success: true,
        status: 'existing',
        message: 'User exists, proceeding with login',
        user: {
          id: existingUserByGoogle.id,
          reference_number: existingUserByGoogle.reference_number,
          full_name: existingUserByGoogle.full_name,
          status: existingUserByGoogle.status,
          role: existingUserByGoogle.role,
          barangay_id: existingUserByGoogle.barangay_id,
          is_farmer: existingUserByGoogle.is_farmer
        },
        profileData
      });
    }

    // If email column exists, check if user registered manually using same email.
    const existingUserByEmail = await findUserByEmail(pool, profileData.email);
    if (existingUserByEmail) {
      return res.json({
        success: true,
        status: 'existing-email',
        message: 'Email already registered. Please link your Google account.',
        user: {
          id: existingUserByEmail.id,
          reference_number: existingUserByEmail.reference_number,
          full_name: existingUserByEmail.full_name,
          status: existingUserByEmail.status,
          role: existingUserByEmail.role,
          barangay_id: existingUserByEmail.barangay_id
        },
        profileData
      });
    }

    // New user - return profile data for registration
    res.json({
      success: true,
      status: 'new',
      message: 'New user - proceed to assisted registration',
      profileData
    });

  } catch (error) {
    console.error('Google token verification error:', error);
    const statusCode = error.message?.includes('Database query failed') ? 500 : 401;
    res.status(statusCode).json({
      success: false,
      message: error.message || 'Failed to verify Google token'
    });
  }
});

/**
 * POST /api/auth/google/register
 * Register new user via Google OAuth
 * Auto-fills known fields, user completes required fields
 */
router.post('/google/register', async (req, res) => {
  try {
    const {
      google_id,
      reference_number,
      full_name,
      email,
      given_name,
      family_name,
      profile_picture,
      phone_number,
      educational_status,
      land_area,
      farm_location,
      barangay_id,
      password,
      confirm_password
    } = req.body;

    await ensureFarmersGoogleIdColumn(pool);
    await ensureFarmersEmailColumn(pool);
    if (!google_id || !reference_number || !full_name || !phone_number || 
        !educational_status || !barangay_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: google_id, reference_number, full_name, phone_number, educational_status, barangay_id, password'
      });
    }

    // Validate password matches confirm password
    if (password !== confirm_password) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    // Validate password (minimum 8 characters with letters and numbers)
    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 8 characters long'
      });
    }
    
    const hasLetters = /[a-zA-Z]/.test(password);
    const hasNumbers = /[0-9]/.test(password);
    
    if (!hasLetters || !hasNumbers) {
      return res.status(400).json({
        success: false,
        message: 'Password must contain both letters and numbers'
      });
    }

    // Validate land area if provided
    if (land_area !== undefined && land_area !== null && land_area !== '') {
      const parsedLandArea = Number(land_area);
      if (!Number.isFinite(parsedLandArea) || parsedLandArea <= 0) {
        return res.status(400).json({
          success: false,
          message: 'Land area must be a positive number.'
        });
      }
      if (parsedLandArea > 999.99) {
        return res.status(400).json({
          success: false,
          message: 'Land area must be at most 3 digits (maximum 999.99 hectares).'
        });
      }
    }


    // Validate phone number (must be exactly 11 digits)
    const phoneDigitsOnly = phone_number.replace(/\D/g, '');
    if (phoneDigitsOnly.length !== 11) {
      return res.status(400).json({
        success: false,
        message: `Phone number must be exactly 11 digits. You entered ${phoneDigitsOnly.length} digits.`
      });
    }

    // Validate date of birth if provided
    if (req.body.date_of_birth) {
      const birthDate = new Date(req.body.date_of_birth);
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      if (age < 18) {
        return res.status(400).json({
          success: false,
          message: `You must be at least 18 years old to register. You are currently ${age} years old.`
        });
      }
    }

    // Validate barangay exists
    const [barangays] = await pool.execute(
      'SELECT id FROM barangays WHERE id = ?',
      [barangay_id]
    );

    if (barangays.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invalid barangay_id. Barangay does not exist.'
      });
    }

    // Check for duplicates
    await ensureFarmersGoogleIdColumn(pool);

    const [existingGoogleId] = await pool.execute(
      'SELECT id FROM farmers WHERE google_id = ?',
      [google_id]
    );

    if (existingGoogleId.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'This Google account is already registered'
      });
    }

    const [existingRef] = await pool.execute(
      'SELECT id FROM farmers WHERE reference_number = ? LIMIT 1',
      [reference_number]
    );
    if (existingRef.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Reference number already exists'
      });
    }

    const hasEmailColumn = await hasFarmersEmailColumn(pool);
    if (hasEmailColumn && email) {
      const [existingEmail] = await pool.execute(
        'SELECT id FROM farmers WHERE email = ? LIMIT 1',
        [email]
      );
      if (existingEmail.length > 0) {
        return res.status(400).json({
          success: false,
          message: 'Email is already registered'
        });
      }
    }

    // Hash password
    const password_hash = await bcrypt.hash(password, 10);

    // Insert new farmer record
    const insertFields = [
      'google_id',
      'reference_number',
      'full_name'
    ];
    const insertValues = [
      google_id,
      reference_number,
      full_name
    ];

    if (hasEmailColumn) {
      insertFields.push('email');
      insertValues.push(email || null);
    }

    insertFields.push(
      'phone_number',
      'educational_status',
      'land_area',
      'farm_location',
      'barangay_id',
      'profile_picture',
      'password_hash',
      'role',
      'status',
      'membership_status',
      'is_farmer',
      'date_of_birth',
      'address'
    );

    insertValues.push(
      phone_number,
      educational_status,
      land_area || null,
      farm_location || null,
      barangay_id,
      profile_picture || null,
      password_hash,
      'farmer',
      'pending',
      'member',
      1,
      req.body.date_of_birth || null,
      req.body.address || null
    );

    const placeholders = insertFields.map(() => '?').join(', ');
    const [result] = await pool.execute(
      `INSERT INTO farmers (${insertFields.join(', ')}) VALUES (${placeholders})`,
      insertValues
    );

    res.json({
      success: true,
      message: 'Registration successful! Your account is pending approval from your Barangay President.',
      farmerId: result.insertId,
      farmer: {
        id: result.insertId,
        reference_number,
        full_name,
        email: email || null,
        barangay_id,
        status: 'pending',
        role: 'farmer'
      }
    });

  } catch (error) {
    console.error('Google registration error:', error);

    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(400).json({
        success: false,
        message: 'Google account or reference number already registered'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Registration failed',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/google/login
 * Login with Google - for existing users only
 */
router.post('/google/login', async (req, res) => {
  try {
    await ensureFarmersGoogleIdColumn(pool);
    const { google_id, farmerId, email } = req.body;

    if (!google_id || !farmerId) {
      return res.status(400).json({
        success: false,
        message: 'google_id and farmerId are required'
      });
    }

    await ensureFarmersEmailColumn(pool);

    // Check if email column exists
    const hasEmailColumn = await hasFarmersEmailColumn(pool);
    
    // Build query dynamically based on available columns
    const selectFields = [
      'id', 'reference_number', 'full_name', 'phone_number', 'educational_status',
      'address', 'role', 'barangay_id', 'status', 'membership_status',
      'profile_picture', 'is_farmer', 'land_area'
    ];
    
    if (hasEmailColumn) {
      selectFields.push('email');
    }
    selectFields.push('google_id');

    // Get user from database - include all available profile fields
    const [users] = await pool.execute(
      `SELECT ${selectFields.join(', ')}
       FROM farmers WHERE id = ? AND google_id = ?`,
      [farmerId, google_id]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    const farmer = users[0];
    const incomingEmail = typeof email === 'string' ? email.trim() : '';
    if (hasEmailColumn && incomingEmail && !farmer.email) {
      await pool.execute('UPDATE farmers SET email = ? WHERE id = ?', [incomingEmail, farmer.id]);
      farmer.email = incomingEmail;
    } else if (incomingEmail && !farmer.email) {
      farmer.email = incomingEmail;
    }
    farmer.google_linked = Boolean(farmer.google_id);
    delete farmer.google_id;

    // Check if farmer status is approved
    if (farmer.role === 'farmer' && farmer.status !== 'approved') {
      return res.status(403).json({
        success: false,
        message: 'Your account is still pending approval from your Barangay President.'
      });
    }

    // Get barangay info
    let barangayContext = null;
    if (farmer.barangay_id) {
      const [barangays] = await pool.execute(
        'SELECT id, name, location FROM barangays WHERE id = ?',
        [farmer.barangay_id]
      );
      barangayContext = barangays[0] || null;
    }

    // One active session per account — new login invalidates older browsers/tabs
    const { startUserSession } = require('../services/session-service');
    const sessionId = await startUserSession(pool, farmer.id);

    // Generate JWT token
    const token = jwt.sign(
      {
        id: farmer.id,
        reference_number: farmer.reference_number,
        role: farmer.role,
        barangay_id: farmer.barangay_id,
        membership_status: farmer.membership_status,
        sid: sessionId
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      success: true,
      message: 'Login successful!',
      farmer,
      barangay: barangayContext,
      token,
      session_id: sessionId
    });

  } catch (error) {
    console.error('Google login error:', error);
    if (error.code === 'ER_BAD_FIELD_ERROR' && error.sqlMessage?.includes('google_id')) {
      return res.status(500).json({
        success: false,
        message: 'Database schema missing google_id column. Run google auth migration first.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Login failed',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/google/link
 * Link Google account to existing user (user registered manually before)
 */
router.post('/google/link', async (req, res) => {
  try {
    await ensureFarmersGoogleIdColumn(pool);
    const { farmerId, google_id, password } = req.body;

    if (!farmerId || !google_id || !password) {
      return res.status(400).json({
        success: false,
        message: 'farmerId, google_id, and password are required'
      });
    }

    // Get user
    const [users] = await pool.execute(
      'SELECT id, password_hash FROM farmers WHERE id = ?',
      [farmerId]
    );

    if (users.length === 0) {
      return res.status(401).json({
        success: false,
        message: 'User not found'
      });
    }

    // Verify password
    const match = await bcrypt.compare(password, users[0].password_hash);
    if (!match) {
      return res.status(401).json({
        success: false,
        message: 'Invalid password'
      });
    }

    // Link Google account
    await pool.execute(
      'UPDATE farmers SET google_id = ? WHERE id = ?',
      [google_id, farmerId]
    );

    res.json({
      success: true,
      message: 'Google account linked successfully!'
    });

  } catch (error) {
    console.error('Google link error:', error);
    if (error.code === 'ER_BAD_FIELD_ERROR' && error.sqlMessage?.includes('google_id')) {
      return res.status(500).json({
        success: false,
        message: 'Database schema missing google_id column. Run google auth migration first.'
      });
    }
    res.status(500).json({
      success: false,
      message: 'Failed to link Google account',
      error: error.message
    });
  }
});

/**
 * POST /api/auth/google/connect
 * Link or replace the signed-in user's Google account using a Google ID token.
 */
router.post('/google/connect', verifyToken, async (req, res) => {
  try {
    await ensureFarmersGoogleIdColumn(pool);
    await ensureFarmersEmailColumn(pool);
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google Client ID not configured on server'
      });
    }

    const tokenData = await verifyGoogleToken(token, clientId);
    const profileData = extractGoogleProfileData(tokenData);
    const googleId = profileData.google_id;

    if (!googleId) {
      return res.status(400).json({
        success: false,
        message: 'Could not read Google account details'
      });
    }

    const existingByGoogle = await findUserByGoogleId(pool, googleId);
    if (existingByGoogle && Number(existingByGoogle.id) !== Number(req.user.id)) {
      return res.status(409).json({
        success: false,
        message: 'This Google account is already linked to another user.'
      });
    }

    const existingByEmail = await findUserByEmail(pool, profileData.email);
    if (existingByEmail && Number(existingByEmail.id) !== Number(req.user.id)) {
      return res.status(409).json({
        success: false,
        message: 'This Google email is already used by another account.'
      });
    }

    const hasEmailColumn = await hasFarmersEmailColumn(pool);
    if (hasEmailColumn && profileData.email) {
      await pool.execute(
        'UPDATE farmers SET google_id = ?, email = ? WHERE id = ?',
        [googleId, profileData.email, req.user.id]
      );
    } else {
      await pool.execute(
        'UPDATE farmers SET google_id = ? WHERE id = ?',
        [googleId, req.user.id]
      );
    }

    let savedEmail = profileData.email || null;
    if (hasEmailColumn) {
      const [rows] = await pool.execute('SELECT email FROM farmers WHERE id = ? LIMIT 1', [req.user.id]);
      savedEmail = rows[0]?.email || savedEmail;
    }

    res.json({
      success: true,
      google_linked: true,
      email: savedEmail,
      message: 'Google account connected'
    });
  } catch (error) {
    console.error('Google connect error:', error);
    if (error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        success: false,
        message: 'This Google account is already linked to another user.'
      });
    }
    res.status(500).json({
      success: false,
      message: error.message || 'Failed to connect Google account'
    });
  }
});

/**
 * POST /api/auth/google/reset-password/start
 * Verify Google ID token and that the Google account is already linked.
 * Returns a short-lived reset token (no account PII).
 */
router.post('/google/reset-password/start', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: 'Google ID token is required'
      });
    }

    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      return res.status(500).json({
        success: false,
        message: 'Google Client ID not configured on server'
      });
    }

    await ensureFarmersGoogleIdColumn(pool);

    let tokenData;
    try {
      tokenData = await verifyGoogleToken(token, clientId);
    } catch {
      return res.status(403).json({
        success: false,
        message: GOOGLE_RESET_DENIED_MESSAGE
      });
    }

    const profileData = extractGoogleProfileData(tokenData);
    const googleId = profileData.google_id;
    if (!googleId) {
      return res.status(403).json({
        success: false,
        message: GOOGLE_RESET_DENIED_MESSAGE
      });
    }

    const hasGoogleIdColumn = await hasFarmersGoogleIdColumn(pool);
    const linkedUser = hasGoogleIdColumn
      ? await findUserByGoogleId(pool, googleId)
      : null;

    // Only accounts already linked by google_id may reset. Do not fall back to email.
    if (!linkedUser) {
      return res.status(403).json({
        success: false,
        code: 'GOOGLE_NOT_LINKED',
        message: GOOGLE_RESET_NOT_LINKED_MESSAGE
      });
    }

    const resetToken = jwt.sign(
      {
        purpose: RESET_TOKEN_PURPOSE,
        id: linkedUser.id,
        google_id: googleId
      },
      JWT_SECRET,
      { expiresIn: RESET_TOKEN_EXPIRES_IN }
    );

    return res.json({
      success: true,
      message: 'Google account verified. You may set a new password.',
      resetToken,
      expiresIn: RESET_TOKEN_EXPIRES_IN
    });
  } catch (error) {
    console.error('Google reset-password start error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to start password reset. Please try again.'
    });
  }
});

/**
 * POST /api/auth/google/reset-password
 * Complete password reset using the short-lived reset token from /start.
 * Body: { resetToken, password, confirmPassword }
 */
router.post('/google/reset-password', async (req, res) => {
  try {
    const { resetToken, password, confirmPassword } = req.body;

    if (!resetToken || !password || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Reset token, password, and confirmation are required'
      });
    }

    if (password !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: 'Passwords do not match'
      });
    }

    const strengthError = validatePasswordStrength(password);
    if (strengthError) {
      return res.status(400).json({
        success: false,
        message: strengthError
      });
    }

    let decoded;
    try {
      decoded = jwt.verify(resetToken, JWT_SECRET);
    } catch {
      return res.status(403).json({
        success: false,
        message: 'Password reset session expired or invalid. Please verify with Google again.'
      });
    }

    if (
      decoded.purpose !== RESET_TOKEN_PURPOSE ||
      !decoded.id ||
      !decoded.google_id
    ) {
      return res.status(403).json({
        success: false,
        message: 'Password reset session expired or invalid. Please verify with Google again.'
      });
    }

    await ensureFarmersGoogleIdColumn(pool);

    // Re-confirm the account is still linked to this Google ID before updating.
    const [users] = await pool.execute(
      'SELECT id, google_id FROM farmers WHERE id = ? AND google_id = ? LIMIT 1',
      [decoded.id, decoded.google_id]
    );

    if (!users.length) {
      return res.status(403).json({
        success: false,
        code: 'GOOGLE_NOT_LINKED',
        message: GOOGLE_RESET_NOT_LINKED_MESSAGE
      });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    await pool.execute(
      'UPDATE farmers SET password_hash = ? WHERE id = ? AND google_id = ?',
      [passwordHash, decoded.id, decoded.google_id]
    );

    // Invalidate any active session so old logins cannot continue after reset.
    await clearUserSession(pool, decoded.id);

    return res.json({
      success: true,
      message: 'Password updated successfully. You can now sign in with your reference number and new password.'
    });
  } catch (error) {
    console.error('Google reset-password error:', error);
    return res.status(500).json({
      success: false,
      message: 'Unable to update password. Please try again.'
    });
  }
});

module.exports = router;
