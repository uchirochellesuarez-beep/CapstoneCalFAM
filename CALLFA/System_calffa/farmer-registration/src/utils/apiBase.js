/**
 * Backend origin that works on localhost AND on a phone over the same Wi‑Fi.
 * Prefer VITE_API_URL when set; otherwise use the page hostname on port 3000.
 * (Relative /api and /uploads also work via the Vite proxy.)
 */
export function getApiOrigin() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.hostname) {
    return `${window.location.protocol}//${window.location.hostname}:3000`
  }
  return 'http://localhost:3000'
}

/** Absolute URL for an API or upload path (e.g. /api/loans, /uploads/x.jpg). */
export function apiUrl(path = '') {
  if (!path) return getApiOrigin()
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path
  const p = path.startsWith('/') ? path : `/${path}`
  return `${getApiOrigin()}${p}`
}
