<template>
  <div class="google-signin-container">
    <div v-if="isLoading" class="google-signin-loading">
      Loading Google sign-in...
    </div>

    <div
      ref="googleButtonRef"
      class="google-signin-btn-host"
      :class="{ hidden: isLoading }"
    ></div>

    <!-- Divider -->
    <div class="google-signin-divider">
      <span>or</span>
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
  if (user?.barangay_id === 2) {
    window.location.href = '/barangay-notice'
    return
  }

  if (user?.role === 'admin') {
    window.location.href = '/admin'
    return
  }

  window.location.href = '/welcome'
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
  gap: 1rem;
  margin: 1rem 0;
}

.google-signin-btn-host {
  width: 100%;
  display: flex;
  justify-content: center;
}

.google-signin-btn-host.hidden {
  display: none;
}

.google-signin-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 44px;
  border: 1px solid #d1d5db;
  border-radius: 0.5rem;
  background-color: #ffffff;
  color: #4b5563;
  font-size: 0.95rem;
}

.google-signin-divider {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 0.5rem 0;
}

.google-signin-divider::before,
.google-signin-divider::after {
  content: '';
  flex: 1;
  height: 1px;
  background-color: #e5e7eb;
}

.google-signin-divider span {
  color: #6b7280;
  font-size: 0.875rem;
  font-weight: 500;
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
