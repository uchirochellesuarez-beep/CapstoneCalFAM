/**
 * Backend origin that works on localhost AND on a phone over the same Wi‑Fi.
 * Prefer VITE_API_URL when set.
 * Locally, fall back to the page hostname on port 3000 (or the Vite /uploads proxy).
 * In production, never append :3000 — that host has no Node process.
 */
export function getApiOrigin() {
  const fromEnv = import.meta.env.VITE_API_URL
  if (fromEnv) return String(fromEnv).replace(/\/$/, '')
  if (typeof window !== 'undefined' && window.location?.hostname) {
    if (import.meta.env.PROD) return window.location.origin
    return `${window.location.protocol}//${window.location.hostname}:3000`
  }
  return 'http://localhost:3000'
}

function isDevStoredHost(hostname) {
  const h = String(hostname || '').toLowerCase()
  return h === 'localhost' || h === '127.0.0.1' || h === '0.0.0.0' || h.endsWith('.local')
}

/** Absolute URL for an API or upload path (e.g. /api/loans, /uploads/x.jpg). */
export function apiUrl(path = '') {
  if (!path) return getApiOrigin()
  const raw = String(path).trim()
  if (raw.startsWith('data:') || raw.startsWith('blob:')) return raw
  if (/^https?:\/\//i.test(raw) || raw.startsWith('//')) {
    try {
      const absolute = raw.startsWith('//') ? `https:${raw}` : raw
      const u = new URL(absolute)
      if (isDevStoredHost(u.hostname)) {
        return `${getApiOrigin()}${u.pathname}${u.search}`
      }
      return raw
    } catch {
      return raw
    }
  }
  const p = raw.startsWith('/') ? raw : `/${raw}`
  return `${getApiOrigin()}${p}`
}

/** Profile, machinery, news, and proof images stored as /uploads/... on the API host. */
export function mediaUrl(path) {
  if (!path) return ''
  return apiUrl(path)
}
