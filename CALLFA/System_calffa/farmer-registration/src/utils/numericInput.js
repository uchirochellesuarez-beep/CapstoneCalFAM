export function sanitizeNumericInput(value, allowDecimal = true) {
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
