<template>
  <div class="google-signin-container">
    <!-- Custom full-width look; invisible official GIS button handles the click -->
    <div class="google-signin-btn" :class="{ disabled: isLoading }">
      <svg viewBox="0 0 24 24" class="google-icon" aria-hidden="true">
        <path
          fill="#4285F4"
          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        />
        <path
          fill="#34A853"
          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        />
        <path
          fill="#FBBC05"
          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
        />
        <path
          fill="#4285F4"
          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        />
      </svg>
      <span class="google-btn-text">{{ buttonLabel }}</span>

      <div
        ref="gsiButtonHost"
        class="google-signin-btn-host"
        :class="{ hidden: isLoading }"
        aria-label="Continue with Google"
      ></div>
    </div>

    <p v-if="showOriginHint" class="google-origin-hint">
      Current site origin: <strong>{{ currentOrigin }}</strong>
      — add this exact URL under Authorized JavaScript origins in Google Cloud Console
      (Credentials → your Web client). Also add http://localhost:5173 and http://127.0.0.1:5173.
    </p>

    <p v-if="showFedcmHint" class="google-fedcm-hint">
      This browser has third-party Google sign-in (FedCM) turned off, so some Google accounts
      cannot complete Sign-In here. In Chrome: click the tune/icon left of the address bar →
      Site settings → allow “Third-party sign-in”, then hard-refresh. Or try another browser / Chrome profile.
    </p>

    <div v-if="errorMessage" class="google-error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'

const props = defineProps({
  mode: {
    type: String,
    default: 'signin',
    validator: (value) => ['signin', 'connect', 'reset'].includes(value)
  },
  connectedEmail: {
    type: String,
    default: ''
  },
  linked: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['connected', 'reset-verified'])

const isLoading = ref(false)
const errorMessage = ref('')
const showOriginHint = ref(false)
const showFedcmHint = ref(false)
const gsiButtonHost = ref(null)
const authStore = useAuthStore()
const { t, te } = useI18n()
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''

/** Module-level GIS init — call initialize only once per client id. */
let gsiClientIdReady = null
let gsiCredentialHandler = null
let consoleHookInstalled = false
let originalConsoleWarn = null
let originalConsoleError = null
let resizeObserver = null
let resizeRaf = 0

const MSG = {
  resetNotLinked:
    'This Google account is not connected to a CALFFA profile yet. Sign in with your reference number, open Settings, and connect Google first. Then return here to reset your password.',
  signInFailed:
    'Google Sign-In did not complete for this account. Allow third-party sign-in for this site (Chrome site settings), then try again — or sign in with your reference number and password.'
}

const tr = (key, fallback) => {
  try {
    if (te(key)) {
      const value = t(key)
      if (value && value !== key) return value
    }
  } catch {
    /* ignore */
  }
  return fallback
}

const buttonLabel = computed(() => {
  if (isLoading.value) return 'Signing in...'
  if (props.mode === 'connect') {
    return props.linked
      ? tr('settings.connectGoogle', 'Connect Google account')
      : tr('settings.connectGoogle', 'Connect Google account')
  }
  return tr('auth.continueGoogle', 'Continue with Google')
})

const originMismatchMessage = () => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'this site'
  return `Google Sign-In blocked for origin "${origin}". Add that exact URL under Authorized JavaScript origins in Google Cloud Console for your OAuth Web client, wait a few minutes, then hard-refresh.`
}

const isOriginMismatchText = (text = '') => {
  const s = String(text).toLowerCase()
  return (
    s.includes('origin is not allowed') ||
    s.includes('not allowed for the given client id') ||
    s.includes('the given origin is not allowed')
  )
}

const isFedcmText = (text = '') => {
  const s = String(text).toLowerCase()
  return (
    s.includes('fedcm') ||
    s.includes('third-party sign-in') ||
    s.includes('error retrieving a token') ||
    s.includes('networkerror')
  )
}

const markOriginMismatch = () => {
  showOriginHint.value = true
  showFedcmHint.value = false
  errorMessage.value = originMismatchMessage()
}

const markFedcmIssue = () => {
  showFedcmHint.value = true
  if (!showOriginHint.value) {
    errorMessage.value = tr('auth.googlePromptFailed', MSG.signInFailed)
  }
}

const installGsiConsoleHook = () => {
  if (consoleHookInstalled || typeof console === 'undefined') return
  consoleHookInstalled = true
  originalConsoleWarn = console.warn
  originalConsoleError = console.error

  const intercept = (original) => (...args) => {
    try {
      const text = args.map((a) => (typeof a === 'string' ? a : (a && a.message) || '')).join(' ')
      if (isOriginMismatchText(text)) {
        markOriginMismatch()
      } else if (isFedcmText(text)) {
        markFedcmIssue()
      }
    } catch {
      /* ignore */
    }
    return original.apply(console, args)
  }

  console.warn = intercept(originalConsoleWarn)
  console.error = intercept(originalConsoleError)
}

const removeGsiConsoleHook = () => {
  if (!consoleHookInstalled) return
  if (originalConsoleWarn) console.warn = originalConsoleWarn
  if (originalConsoleError) console.error = originalConsoleError
  consoleHookInstalled = false
  originalConsoleWarn = null
  originalConsoleError = null
}

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

const decodeJwtPayload = (credential) => {
  try {
    const payload = String(credential || '').split('.')[1]
    if (!payload) return null
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/')
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=')
    return JSON.parse(atob(padded))
  } catch {
    return null
  }
}

const redirectAfterGoogleLogin = (user) => {
  if (user?.role === 'admin') {
    window.location.href = '/admin'
    return
  }
  window.location.href = '/dashboard'
}

const loadGoogleScript = () => new Promise((resolve, reject) => {
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

const parseJsonResponse = async (response, fallbackMessage) => {
  const raw = await response.text()
  if (!raw) {
    throw new Error(
      response.ok
        ? fallbackMessage
        : `Backend unavailable (${response.status}). Start the API server on port 3000 and try again.`
    )
  }
  try {
    return JSON.parse(raw)
  } catch {
    throw new Error(fallbackMessage)
  }
}

const ensureGoogleInitialized = async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('Google Client ID is not configured')
  }

  await loadGoogleScript()
  gsiCredentialHandler = handleGoogleCredentialResponse

  if (gsiClientIdReady !== clientId) {
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
}

const hostWidth = () => {
  const el = gsiButtonHost.value
  if (!el) return 320
  const parent = el.parentElement
  const w = Math.floor(parent?.getBoundingClientRect?.().width || el.offsetWidth || 320)
  // GIS requires width between ~200 and 400 typically; stretch via CSS after render.
  return Math.max(200, Math.min(400, w))
}

const renderGsiButton = async () => {
  await nextTick()
  if (!gsiButtonHost.value || !window.google?.accounts?.id?.renderButton) return

  gsiButtonHost.value.innerHTML = ''
  const width = hostWidth()
  window.google.accounts.id.renderButton(gsiButtonHost.value, {
    theme: 'outline',
    size: 'large',
    shape: 'rectangular',
    text: 'continue_with',
    logo_alignment: 'left',
    width,
    ux_mode: 'popup'
  })
}

const scheduleRerender = () => {
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  resizeRaf = requestAnimationFrame(() => {
    resizeRaf = 0
    renderGsiButton()
  })
}

const attachResizeObserver = () => {
  if (typeof ResizeObserver === 'undefined') return
  resizeObserver?.disconnect()
  const target = gsiButtonHost.value?.parentElement
  if (!target) return
  resizeObserver = new ResizeObserver(() => scheduleRerender())
  resizeObserver.observe(target)
}

const handleGoogleCredentialResponse = async (response) => {
  try {
    errorMessage.value = ''
    showFedcmHint.value = false
    showOriginHint.value = false
    isLoading.value = true

    const token = response.credential
    const emailFromToken = decodeJwtPayload(token)?.email || ''

    if (props.mode === 'connect') {
      const connectResponse = await fetch('/api/auth/google/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authStore.token || localStorage.getItem('token')}`
        },
        body: JSON.stringify({ token })
      })
      const data = await parseJsonResponse(connectResponse, 'Failed to connect Google account')
      if (!connectResponse.ok || !data.success) {
        throw new Error(data.message || 'Failed to connect Google account')
      }
      emit('connected', {
        email: data.email || emailFromToken || '',
        google_linked: true
      })
      return
    }

    if (props.mode === 'reset') {
      const startResponse = await fetch('/api/auth/google/reset-password/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      })
      const notLinkedFallback = tr('auth.resetGoogleFailed', MSG.resetNotLinked)
      const data = await parseJsonResponse(
        startResponse,
        startResponse.status === 404
          ? 'Password reset API is not available. Restart the backend server and try again.'
          : notLinkedFallback
      )
      if (!startResponse.ok || !data.success || !data.resetToken) {
        throw new Error(data.message || notLinkedFallback)
      }
      emit('reset-verified', { resetToken: data.resetToken })
      return
    }

    const verifyResponse = await fetch('/api/auth/google/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token })
    })
    const data = await parseJsonResponse(verifyResponse, 'Token verification failed')

    if (!verifyResponse.ok || !data.success) {
      throw new Error(data.message || 'Token verification failed')
    }

    if (data.status === 'existing') {
      if (data.user.status !== 'approved' && data.user.is_farmer) {
        throw new Error('Your account is still pending approval from your Barangay President.')
      }

      const loginData = await authStore.googleLogin(
        data.profileData.google_id,
        data.user.id,
        data.profileData.email
      )
      if (!loginData.success) {
        throw new Error(loginData.error || 'Login failed')
      }
      redirectAfterGoogleLogin(loginData.user)
      return
    }

    if (data.status === 'new') {
      const query = new URLSearchParams({
        token,
        fullName: data.profileData.full_name,
        email: data.profileData.email,
        picture: data.profileData.profile_picture || ''
      })
      window.location.href = `/google-registration?${query}`
      return
    }

    if (data.status === 'existing-email') {
      const query = new URLSearchParams({
        userId: data.user.id,
        google_id: data.profileData.google_id,
        fullName: data.profileData.full_name,
        email: data.profileData.email,
        picture: data.profileData.profile_picture || ''
      })
      window.location.href = `/google-registration?${query}`
      return
    }

    throw new Error('Unsupported Google sign-in response')
  } catch (error) {
    errorMessage.value = error.message || 'Google sign-in failed'
    console.error('Google sign-in error:', error)
  } finally {
    isLoading.value = false
  }
}

const setupGoogleButton = async () => {
  try {
    errorMessage.value = ''
    await ensureGoogleInitialized()
    await renderGsiButton()
    attachResizeObserver()
  } catch (error) {
    const message = String(error?.message || '')
    if (message.toLowerCase().includes('origin') || message.includes('403')) {
      markOriginMismatch()
    } else {
      errorMessage.value = message || 'Failed to initialize Google Sign-In'
    }
    console.error('Google Sign-In setup error:', error)
  }
}

onMounted(() => {
  gsiCredentialHandler = handleGoogleCredentialResponse
  installGsiConsoleHook()
  setupGoogleButton()
  window.addEventListener('resize', scheduleRerender)
})

watch(
  () => props.mode,
  () => {
    gsiCredentialHandler = handleGoogleCredentialResponse
    setupGoogleButton()
  }
)

onBeforeUnmount(() => {
  if (gsiCredentialHandler === handleGoogleCredentialResponse) {
    gsiCredentialHandler = null
  }
  removeGsiConsoleHook()
  resizeObserver?.disconnect()
  resizeObserver = null
  if (resizeRaf) cancelAnimationFrame(resizeRaf)
  window.removeEventListener('resize', scheduleRerender)
})
</script>

<style scoped>
.google-signin-container {
  width: 100%;
  max-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin: 0;
}

.google-signin-btn {
  position: relative;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  width: 100%;
  max-width: 100%;
  min-height: 2.7rem;
  padding: 0.7rem 1rem;
  border: 1.5px solid #cbd5e1;
  border-radius: 12px;
  background-color: #ffffff;
  color: #1f2937;
  font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  font-weight: 600;
  font-size: 0.92rem;
  letter-spacing: -0.01em;
  overflow: hidden;
  transition: border-color 0.2s ease, background-color 0.2s ease, box-shadow 0.2s ease;
}

.google-signin-btn:hover:not(.disabled) {
  border-color: #94a3b8;
  background-color: #f8fafc;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
}

.google-signin-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-btn-text {
  position: relative;
  z-index: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: calc(100% - 2rem);
}

.google-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  position: relative;
  z-index: 1;
  display: block;
  overflow: hidden;
  /* Prevent color fringing / red edge artifacts on light backgrounds */
  shape-rendering: geometricPrecision;
}

.google-signin-btn-host {
  position: absolute;
  inset: 0;
  z-index: 2;
  opacity: 0;
  overflow: hidden;
  cursor: pointer;
}

.google-signin-btn-host.hidden {
  pointer-events: none;
}

/* Stretch invisible GIS iframe to fill the custom button */
.google-signin-btn-host :deep(div[role='button']),
.google-signin-btn-host :deep(iframe) {
  width: 100% !important;
  max-width: none !important;
  height: 100% !important;
  min-width: 100% !important;
}

.google-origin-hint,
.google-fedcm-hint {
  margin: 0;
  padding: 0.65rem 0.75rem;
  border-radius: 0.5rem;
  font-size: 0.8rem;
  line-height: 1.45;
}

.google-origin-hint {
  background: #fff7ed;
  border-left: 4px solid #ea580c;
  color: #9a3412;
}

.google-fedcm-hint {
  background: #eff6ff;
  border-left: 4px solid #2563eb;
  color: #1e3a8a;
}

.google-origin-hint strong {
  font-weight: 700;
  word-break: break-all;
}

.google-error-message {
  padding: 0.75rem;
  background-color: #fee2e2;
  border-left: 4px solid #dc2626;
  color: #b91c1c;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  line-height: 1.45;
}

@media (max-width: 480px) {
  .google-signin-btn {
    min-height: 3.05rem;
    padding: 0.8rem 1.05rem;
    font-size: 0.95rem;
    border-radius: 13px;
  }

  .google-icon {
    width: 1.2rem;
    height: 1.2rem;
  }
}
</style>
