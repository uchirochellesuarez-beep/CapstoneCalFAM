const GOOGLE_MSG_TYPE = 'CALFFA_GOOGLE_ID_TOKEN'
const GOOGLE_POPUP_NAME = 'calffa-google-signin'

function randomNonce() {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('')
}

function parseOAuthParams(hash = '', search = '') {
  const fromHash = new URLSearchParams(String(hash).replace(/^#/, ''))
  const fromSearch = new URLSearchParams(String(search).replace(/^\?/, ''))
  return {
    idToken: fromHash.get('id_token') || fromSearch.get('id_token') || '',
    error: fromHash.get('error') || fromSearch.get('error') || '',
    errorDescription:
      fromHash.get('error_description') || fromSearch.get('error_description') || ''
  }
}

function notifyGoogleAuthResult(payload) {
  try {
    if (window.opener && window.opener !== window) {
      window.opener.postMessage(payload, window.location.origin)
    }
  } catch {
    /* ignore */
  }

  try {
    const channel = new BroadcastChannel(GOOGLE_MSG_TYPE)
    channel.postMessage(payload)
    channel.close()
  } catch {
    /* ignore */
  }
}

function isGooglePopupWindow() {
  return (
    window.name === GOOGLE_POPUP_NAME ||
    Boolean(window.opener && window.opener !== window)
  )
}

export function closeGoogleOAuthPopupIfNeeded() {
  if (!isGooglePopupWindow()) return false

  const hash = String(window.location.hash || '')
  const search = String(window.location.search || '')
  if (!hash.includes('id_token') && !hash.includes('error') && !search.includes('error')) {
    return false
  }

  notifyGoogleAuthResult({ type: GOOGLE_MSG_TYPE, hash, search })
  window.close()
  document.documentElement.innerHTML =
    '<p style="font-family:sans-serif;padding:2rem;text-align:center">You can close this window.</p>'
  return true
}

export function requestGoogleIdTokenPopup(clientId) {
  if (!clientId) {
    return Promise.reject(new Error('Google Client ID is not configured'))
  }

  return new Promise((resolve, reject) => {
    const nonce = randomNonce()
    const redirectUri = window.location.origin
    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'id_token',
      scope: 'openid email profile',
      nonce,
      prompt: 'select_account'
    })

    const width = 480
    const height = 640
    const left = window.screenX + Math.max(0, (window.outerWidth - width) / 2)
    const top = window.screenY + Math.max(0, (window.outerHeight - height) / 2)
    const popup = window.open(
      `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`,
      GOOGLE_POPUP_NAME,
      `width=${width},height=${height},left=${left},top=${top},scrollbars=yes`
    )

    if (!popup) {
      reject(new Error('Popup blocked. Allow popups for this site, then try again.'))
      return
    }

    let settled = false
    let channel = null

    const finish = (fn, value) => {
      if (settled) return
      settled = true
      window.removeEventListener('message', onMessage)
      try {
        channel?.close()
      } catch {
        /* ignore */
      }
      clearInterval(watchClosed)
      clearTimeout(timeoutId)
      try {
        popup.close()
      } catch {
        /* ignore */
      }
      fn(value)
    }

    const handlePayload = (data) => {
      if (data?.type !== GOOGLE_MSG_TYPE) return
      const { idToken, error, errorDescription } = parseOAuthParams(data.hash, data.search)

      if (idToken) {
        finish(resolve, idToken)
        return
      }

      if (error) {
        const detail = decodeURIComponent(errorDescription || error).replace(/\+/g, ' ')
        finish(reject, new Error(detail || 'Google sign-in was cancelled.'))
        return
      }

      finish(reject, new Error('Google sign-in did not return a token.'))
    }

    const onMessage = (event) => {
      if (event.origin !== window.location.origin) return
      handlePayload(event.data)
    }

    try {
      channel = new BroadcastChannel(GOOGLE_MSG_TYPE)
      channel.onmessage = (event) => handlePayload(event.data)
    } catch {
      channel = null
    }

    const watchClosed = window.setInterval(() => {
      if (popup.closed && !settled) {
        finish(reject, new Error('Google sign-in was cancelled.'))
      }
    }, 400)

    const timeoutId = window.setTimeout(() => {
      finish(reject, new Error('Google sign-in timed out. Please try again.'))
    }, 120000)

    window.addEventListener('message', onMessage)
  })
}
