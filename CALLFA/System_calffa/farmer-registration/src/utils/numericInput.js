export function sanitizeNumericInput(value, allowDecimal = true, maxIntegerDigits = null) {
  let v = String(value ?? '')
  if (allowDecimal) {
    v = v.replace(/[^\d.]/g, '')
    const dot = v.indexOf('.')
    if (dot !== -1) {
      v = v.slice(0, dot + 1) + v.slice(dot + 1).replace(/\./g, '')
    }
  } else {
    v = v.replace(/\D/g, '')
  }

  if (maxIntegerDigits != null && Number(maxIntegerDigits) > 0) {
    const maxDigits = Math.floor(Number(maxIntegerDigits))
    if (allowDecimal) {
      const parts = v.split('.')
      parts[0] = parts[0].slice(0, maxDigits)
      v = parts.length > 1 ? `${parts[0]}.${parts[1]}` : parts[0]
    } else {
      v = v.slice(0, maxDigits)
    }
  }

  return v
}

export function parseNumericInput(value) {
  if (value === '' || value == null) return null
  const n = parseFloat(String(value))
  return Number.isFinite(n) ? n : null
}

export function formatNumericForInput(value) {
  if (value === null || value === undefined || value === '') return ''
  const n = Number(value)
  return Number.isFinite(n) ? String(value) : ''
}

/** Farm area (hectares): up to 3 digits before decimal, max 999.99 */
export const LAND_AREA_MAX = 999.99
export const LAND_AREA_MAX_INTEGER_DIGITS = 3

