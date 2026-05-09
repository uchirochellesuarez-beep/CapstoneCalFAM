<template>
  <div class="google-signin-container">
    <!-- Google Sign-In Button (custom design, real Google button overlay) -->
    <div class="google-signin-btn" :class="{ disabled: isLoading }">
      <svg viewBox="0 0 24 24" class="google-icon" aria-hidden="true">
        <path fill="#1F2937" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
      </svg>
      <span class="google-btn-text">{{ isLoading ? 'Signing in...' : 'Continue with Google' }}</span>

      <div
        ref="googleButtonRef"
        class="google-signin-btn-host"
        :class="{ hidden: isLoading }"
      ></div>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="google-error-message">
      {{ errorMessage }}
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'

const isLoading = ref(false)
const errorMessage = ref('')
const googleButtonRef = ref(null)
const authStore = useAuthStore()

const GOOGLE_SCRIPT_SRC = 'https://accounts.google.com/gsi/client'

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

const handleGoogleCredentialResponse = async (response) => {
  try {
    errorMessage.value = ''
    isLoading.value = true

    const token = response.credential
    const verifyResponse = await fetch('/api/auth/google/verify-token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ token })
    })

    const data = await verifyResponse.json()

    if (!verifyResponse.ok || !data.success) {
      throw new Error(data.message || 'Token verification failed')
    }

    if (data.status === 'existing') {
      if (data.user.status !== 'approved' && data.user.is_farmer) {
        throw new Error('Your account is still pending approval from your Barangay President.')
      }

      const loginData = await authStore.googleLogin(
        data.profileData.google_id,
        data.user.id
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

const initializeGoogleSignIn = async () => {
  const clientId = import.meta.env.VITE_GOOGLE_CLIENT_ID
  if (!clientId) {
    throw new Error('Google Client ID is not configured')
  }

  if (!googleButtonRef.value) {
    throw new Error('Google Sign-In button container is missing')
  }

  await loadGoogleScript()

  google.accounts.id.initialize({
    client_id: clientId,
    callback: handleGoogleCredentialResponse,
    use_fedcm_for_prompt: true,
    use_fedcm_for_button: true
  })

  const buttonWidth = Math.max(
    220,
    Math.min(360, Math.floor(googleButtonRef.value.getBoundingClientRect().width || 360))
  )

  googleButtonRef.value.innerHTML = ''
  google.accounts.id.renderButton(googleButtonRef.value, {
    type: 'standard',
    theme: 'outline',
    size: 'large',
    text: 'continue_with',
    shape: 'rectangular',
    logo_alignment: 'left',
    width: buttonWidth
  })
}

onMounted(async () => {
  try {
    isLoading.value = true
    errorMessage.value = ''
    await initializeGoogleSignIn()
  } catch (error) {
    errorMessage.value = error.message || 'Failed to initialize Google Sign-In'
    console.error('Google Sign-In initialization error:', error)
  } finally {
    isLoading.value = false
  }
})
</script>

<style scoped>
.google-signin-container {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 0;
  margin: 0;
}

.google-signin-btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  min-height: 46px;
  padding: 0.72rem 1rem;
  border: 1px solid #cbd5e1;
  border-radius: 13px;
  background-color: #ffffff;
  color: #1f2937;
  font-weight: 500;
  font-size: 0.95rem;
  transition: all 0.2s ease;
  overflow: hidden;
}

.google-signin-btn:hover:not(.disabled) {
  border-color: #4285f4;
  background-color: #f8f9ff;
  box-shadow: 0 2px 8px rgba(66, 133, 244, 0.1);
}

.google-signin-btn.disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.google-btn-text {
  position: relative;
  z-index: 1;
}

.google-icon {
  width: 1.2rem;
  height: 1.2rem;
  position: relative;
  z-index: 1;
}

.google-signin-btn-host {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  z-index: 2;
  cursor: pointer;
}

.google-signin-btn-host.hidden {
  pointer-events: none;
}

.google-error-message {
  padding: 0.75rem;
  background-color: #fee2e2;
  border-left: 4px solid #dc2626;
  color: #b91c1c;
  border-radius: 0.375rem;
  font-size: 0.875rem;
}
</style>
