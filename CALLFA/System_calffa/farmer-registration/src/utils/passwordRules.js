/** Shared password strength rules for signup / reset. */
export const PASSWORD_MIN_LENGTH = 8

export function getPasswordChecks(password = '') {
  const value = String(password || '')
  return {
    minLength: value.length >= PASSWORD_MIN_LENGTH,
    hasLetter: /[a-zA-Z]/.test(value),
    hasNumber: /[0-9]/.test(value),
    hasSpecial: /[^A-Za-z0-9]/.test(value),
  }
}

export function isPasswordStrong(password = '') {
  const checks = getPasswordChecks(password)
  return checks.minLength && checks.hasLetter && checks.hasNumber && checks.hasSpecial
}

/**
 * Returns the first unmet requirement message key under `signup.*`, or null if valid.
 * Callers should pass through i18n `t()`.
 */
export function getPasswordStrengthErrorKey(password = '') {
  const checks = getPasswordChecks(password)
  if (!checks.minLength) return 'signup.passwordMinLength'
  if (!checks.hasLetter) return 'signup.passwordAddLetters'
  if (!checks.hasNumber) return 'signup.passwordAddNumbers'
  if (!checks.hasSpecial) return 'signup.passwordAddSpecial'
  return null
}
