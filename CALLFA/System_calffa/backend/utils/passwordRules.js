const PASSWORD_MIN_LENGTH = 8;

function getPasswordChecks(password = '') {
  const value = String(password || '');
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    hasLetter: /[a-zA-Z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  };
}

/**
 * @returns {string|null} Error message, or null if password is strong enough.
 */
function validatePasswordStrength(password) {
  const checks = getPasswordChecks(password);
  if (!checks.minLength) {
    return 'Password must be at least 8 characters long';
  }
  if (!checks.hasLetter) {
    return 'Password must contain at least one letter (A-Z or a-z)';
  }
  if (!checks.hasNumber) {
    return 'Password must contain at least one number (0-9)';
  }
  if (!checks.hasSpecial) {
    return 'Password must contain at least one special character (e.g. !@#$%)';
  }
  return null;
}

module.exports = {
  PASSWORD_MIN_LENGTH,
  getPasswordChecks,
  validatePasswordStrength,
};
