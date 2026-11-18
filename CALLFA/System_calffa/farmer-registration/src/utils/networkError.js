/**
 * Detect offline backend / proxy failures so forms can show a clear message
 * instead of a vague fetch error (or appearing to do nothing).
 */
export function isBackendUnavailable({ error, response, rawBody } = {}) {
  if (response && [502, 503, 504].includes(response.status)) return true

  const msg = String(error?.message || error || '')
  if (/failed to fetch|networkerror|network request failed|load failed|econnrefused|http proxy error|err_connection/i.test(msg)) {
    return true
  }

  const body = String(rawBody || '')
  if (/http proxy error|econnrefused|error occurred while trying to proxy/i.test(body)) {
    return true
  }

  // Vite/proxy sometimes returns the SPA HTML shell for a failed API call
  if (body && /^\s*<!DOCTYPE html>/i.test(body)) return true

  return false
}

export function backendUnavailableMessage(t) {
  if (typeof t === 'function') return t('common.backendUnavailable')
  return 'Cannot connect to the server. Please make sure the backend is running.'
}
