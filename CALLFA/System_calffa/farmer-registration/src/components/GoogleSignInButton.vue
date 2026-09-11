<template>
  <div class="google-signin-container">
    <div class="google-official-wrap" :class="{ disabled: isLoading }">
      <div ref="gsiButtonHost" class="google-official-host"></div>
    </div>

    <p v-if="showOriginHint" class="google-origin-hint">
      Current site origin: <strong>{{ currentOrigin }}</strong>
      — add this exact URL under Authorized JavaScript origins in Google Cloud Console.
    </p>

    <div v-if="errorMessage" class="google-error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onBeforeUnmount, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { ensureGoogleInitialized, renderGoogleButton, setGoogleCredentialHandler } from '../utils/googleGsi'

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
const gsiButtonHost = ref(null)
const authStore = useAuthStore()
const { t, te } = useI18n()
const currentOrigin = typeof window !== 'undefined' ? window.location.origin : ''

let consoleHookInstalled = false
let originalConsoleWarn = null
let originalConsoleError = null

const MSG = {
  resetNotLinked:
    'This Google account is not connected to a CALFFA profile yet. Sign in with your reference number, open Settings, and connect Google first. Then return here to reset your password.'
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

const markOriginMismatch = () => {
  showOriginHint.value = true
  errorMessage.value = originMismatchMessage()
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

const handleGoogleCredentialResponse = async (response) => {
  try {
    errorMessage.value = ''
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
    nextTick(() => mountGoogleButton())
  }
}

const mountGoogleButton = async () => {
  try {
    setGoogleCredentialHandler(handleGoogleCredentialResponse)
    await ensureGoogleInitialized(import.meta.env.VITE_GOOGLE_CLIENT_ID)
    await nextTick()
    const width = gsiButtonHost.value?.parentElement?.clientWidth || 320
    renderGoogleButton(gsiButtonHost.value, width)
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
  installGsiConsoleHook()
  setGoogleCredentialHandler(handleGoogleCredentialResponse)
  mountGoogleButton()
})

watch(
  () => props.mode,
  () => {
    setGoogleCredentialHandler(handleGoogleCredentialResponse)
    mountGoogleButton()
  }
)

onBeforeUnmount(() => {
  setGoogleCredentialHandler(null)
  removeGsiConsoleHook()
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

.google-official-wrap {
  width: 100%;
  min-height: 44px;
}

.google-official-wrap.disabled {
  pointer-events: none;
  opacity: 0.65;
}

.google-official-host {
  width: 100%;
  display: flex;
  justify-content: center;
}

.google-official-host :deep(div[role='button']),
.google-official-host :deep(iframe) {
  width: 100% !important;
  max-width: 100% !important;
}

.google-origin-hint,
.google-error-message {
  margin: 0;
  padding: 0.7rem 0.8rem;
  border-radius: 0.5rem;
  font-size: 0.82rem;
  line-height: 1.45;
  color: #9f1239 !important;
  -webkit-text-fill-color: #9f1239 !important;
}

.google-origin-hint {
  background: #fff7ed !important;
  border-left: 4px solid #ea580c;
  color: #9a3412 !important;
  -webkit-text-fill-color: #9a3412 !important;
}

.google-origin-hint strong {
  font-weight: 700;
  word-break: break-all;
  color: #9a3412 !important;
  -webkit-text-fill-color: #9a3412 !important;
}

.google-error-message {
  background: #fff1f2 !important;
  border-left: 4px solid #dc2626;
}
</style>
