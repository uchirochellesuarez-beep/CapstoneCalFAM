let gsiClientIdReady = null
let gsiCredentialHandler = null

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

export function setGoogleCredentialHandler(handler) {
  gsiCredentialHandler = handler
}

export function loadGoogleScript() {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve(window.google)
      return
    }

    const existingScript = document.querySelector(`script[src="${GOOGLE_SCRIPT_SRC}"]`)
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve(window.google), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Failed to load Google Sign-In library')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.src = GOOGLE_SCRIPT_SRC
    script.async = true
    script.defer = true
    script.onload = () => resolve(window.google)
    script.onerror = () => reject(new Error('Failed to load Google Sign-In library'))
    document.head.appendChild(script)
  })
}

export async function ensureGoogleInitialized(clientId) {
  if (!clientId) {
    throw new Error('Google Client ID is not configured')
  }

  await loadGoogleScript()

  if (gsiClientIdReady === clientId) return

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: (response) => {
      if (typeof gsiCredentialHandler === 'function') {
        gsiCredentialHandler(response)
      }
    },
    auto_select: false,
    cancel_on_tap_outside: true,
    ux_mode: 'popup',
    use_fedcm_for_prompt: false,
    use_fedcm_for_button: false,
    context: 'signin',
    itp_support: true
  })

  if (typeof window.google.accounts.id.disableAutoSelect === 'function') {
    window.google.accounts.id.disableAutoSelect()
  }

  gsiClientIdReady = clientId
}

export function renderGoogleButton(element, width = 320) {
  if (!element || !window.google?.accounts?.id?.renderButton) return
  element.innerHTML = ''
  window.google.accounts.id.renderButton(element, {
    theme: 'outline',
    size: 'large',
    shape: 'rectangular',
    text: 'continue_with',
    logo_alignment: 'left',
    width: Math.max(200, Math.min(400, Math.floor(width))),
    ux_mode: 'popup'
  })
}
