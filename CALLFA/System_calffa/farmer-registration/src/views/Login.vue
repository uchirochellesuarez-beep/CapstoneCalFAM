<template>
  <div class="login-page glass-auth-page" :class="{ 'light-theme': isLight }">
    <div class="auth-backdrop" aria-hidden="true">
      <img :src="farmerPhoto" alt="" class="auth-farmer" />
      <div class="auth-overlay"></div>
    </div>

    <div class="page-top-controls">
      <ThemeToggle variant="floating" />
      <LanguageToggle variant="floating" />
    </div>

    <main class="layout-shell">
      <section class="tagline-panel" aria-label="Platform highlight">
        <div class="tagline-content">
          <div class="identity-block">
            <div class="identity-brand">
              <img :src="calffaLogo" :alt="t('brand.name')" class="identity-logo" />
              <div class="identity-brand-text">
                <p class="identity-name">{{ t('brand.name') }}</p>
                <p class="identity-org">{{ t('brand.fullName') }}</p>
              </div>
            </div>
            <p class="identity-title">{{ t('brand.title') }}</p>
            <p class="identity-caption">
              {{ isResetFlow ? t('auth.resetCaption') : t('brand.loginCaption') }}
            </p>
          </div>
        </div>
      </section>

      <section class="form-side" :aria-label="isResetFlow ? t('auth.resetAria') : t('auth.loginAria')">
        <div class="login-card">
          <div class="login-card-inner">
          <div class="form-header">
            <h2 class="form-title">{{ formTitle }}</h2>
          </div>

          <div v-if="successMessage" class="message success-message">
            {{ successMessage }}
          </div>
          <!-- Validation / auth errors use toast (see Teleport below) -->

          <!-- ========= LOGIN ========= -->
          <template v-if="!isResetFlow">
            <form @submit.prevent="submitLogin" class="auth-form">
              <div class="form-group">
                <label class="form-label">{{ t('auth.referenceNumber') }}</label>
                <div class="field-input-wrapper">
                  <span class="field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="3" y="4" width="18" height="16" rx="3" ry="3" />
                      <path d="M8 9h8M8 13h5" />
                    </svg>
                  </span>
                  <input
                    v-model="loginForm.referenceNumber"
                    type="text"
                    required
                    minlength="19"
                    maxlength="19"
                    pattern="\d{2}-\d{2}-\d{2}-\d{3}-\d{6}"
                    inputmode="numeric"
                    class="form-input"
                    :placeholder="t('auth.referencePlaceholder')"
                    @input="handleLoginReferenceInput"
                  />
                </div>
              </div>

              <div class="form-group">
                <div class="password-label-row">
                  <label class="form-label">{{ t('auth.password') }}</label>
                  <button type="button" class="forgot-link" @click="goToForgotPassword">
                    {{ t('auth.forgotPassword') }}
                  </button>
                </div>
                <div class="password-input-wrapper field-input-wrapper">
                  <span class="field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="4" y="11" width="16" height="9" rx="2" ry="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    v-model="loginForm.password"
                    :type="showPassword ? 'text' : 'password'"
                    required
                    class="form-input"
                    autocomplete="current-password"
                    :placeholder="t('auth.passwordPlaceholder')"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    @mousedown.prevent
                    @click="showPassword = !showPassword"
                    :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                    :aria-pressed="showPassword"
                  >
                    <svg
                      v-if="showPassword"
                      class="password-toggle-svg"
                      viewBox="0 0 24 24"
                      width="1.2em"
                      height="1.2em"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      v-else
                      class="password-toggle-svg"
                      viewBox="0 0 24 24"
                      width="1.2em"
                      height="1.2em"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                :disabled="authStore.loading"
                class="submit-btn"
              >
                <span v-if="authStore.loading" class="loading-spinner"></span>
                <span>
                  {{ authStore.loading ? t('common.loading') : t('auth.signIn') }}
                </span>
              </button>
            </form>

            <div class="auth-divider" aria-hidden="true">
              <span class="auth-divider-line"></span>
              <span class="auth-divider-text">{{ t('auth.orSignInWith') }}</span>
              <span class="auth-divider-line"></span>
            </div>

            <GoogleSignInButton class="login-google-block" />

            <div class="form-footer">
              <div class="footer-cta">
                <p class="footer-text">{{ t('auth.noAccount') }}</p>
                <button type="button" class="link-btn" @click="goToSignUp">
                  {{ t('auth.createAccount') }}
                </button>
              </div>
            </div>
          </template>

          <!-- ========= FORGOT / RESET PASSWORD ========= -->
          <template v-else>
            <div v-if="resetStep === 'google'" class="reset-panel">
              <p class="reset-lead">{{ t('auth.forgotPasswordHint') }}</p>
              <div class="message info-message" role="note">
                {{ resetConnectTip }}
              </div>

              <div class="auth-divider" aria-hidden="true">
                <span class="auth-divider-line"></span>
                <span class="auth-divider-text">{{ t('auth.continueGoogle') }}</span>
                <span class="auth-divider-line"></span>
              </div>

              <GoogleSignInButton
                mode="reset"
                class="login-google-block"
                @reset-verified="onResetVerified"
              />
            </div>

            <form
              v-else-if="resetStep === 'password'"
              class="auth-form"
              @submit.prevent="submitNewPassword"
            >
              <p class="reset-lead">{{ t('auth.createNewPasswordHint') }}</p>

              <div class="form-group">
                <label class="form-label">{{ t('auth.newPassword') }}</label>
                <div class="password-input-wrapper field-input-wrapper">
                  <span class="field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="4" y="11" width="16" height="9" rx="2" ry="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    v-model="passwordForm.password"
                    :type="showNewPassword ? 'text' : 'password'"
                    required
                    class="form-input"
                    autocomplete="new-password"
                    :placeholder="t('signup.passwordPlaceholder')"
                    @input="validatePasswordInput"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    @mousedown.prevent
                    @click="showNewPassword = !showNewPassword"
                    :aria-label="showNewPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  >
                    <svg
                      v-if="showNewPassword"
                      class="password-toggle-svg"
                      viewBox="0 0 24 24"
                      width="1.2em"
                      height="1.2em"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      v-else
                      class="password-toggle-svg"
                      viewBox="0 0 24 24"
                      width="1.2em"
                      height="1.2em"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
                <p v-if="passwordError" class="field-hint-error">{{ passwordError }}</p>
              </div>

              <div class="form-group">
                <label class="form-label">{{ t('auth.confirmNewPassword') }}</label>
                <div class="password-input-wrapper field-input-wrapper">
                  <span class="field-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2">
                      <rect x="4" y="11" width="16" height="9" rx="2" ry="2" />
                      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                    </svg>
                  </span>
                  <input
                    v-model="passwordForm.confirmPassword"
                    :type="showConfirmPassword ? 'text' : 'password'"
                    required
                    class="form-input"
                    autocomplete="new-password"
                    :placeholder="t('signup.confirmPasswordPlaceholder')"
                    @input="validateConfirmPassword"
                  />
                  <button
                    type="button"
                    class="password-toggle"
                    @mousedown.prevent
                    @click="showConfirmPassword = !showConfirmPassword"
                    :aria-label="showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  >
                    <svg
                      v-if="showConfirmPassword"
                      class="password-toggle-svg"
                      viewBox="0 0 24 24"
                      width="1.2em"
                      height="1.2em"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                      <circle cx="12" cy="12" r="3" />
                    </svg>
                    <svg
                      v-else
                      class="password-toggle-svg"
                      viewBox="0 0 24 24"
                      width="1.2em"
                      height="1.2em"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                      aria-hidden="true"
                    >
                      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                      <line x1="1" y1="1" x2="23" y2="23" />
                    </svg>
                  </button>
                </div>
                <p v-if="confirmError" class="field-hint-error">{{ confirmError }}</p>
              </div>

              <button
                type="submit"
                class="submit-btn"
                :disabled="authStore.loading || !canSubmitPassword"
              >
                <span v-if="authStore.loading" class="loading-spinner"></span>
                <span>
                  {{ authStore.loading ? t('common.loading') : t('auth.updatePassword') }}
                </span>
              </button>
            </form>

            <div v-else class="reset-panel">
              <div class="message success-message">
                {{ t('auth.resetSuccessBody') }}
              </div>
              <button type="button" class="submit-btn" @click="goToLogin">
                {{ t('auth.backToSignIn') }}
              </button>
            </div>

            <div class="form-footer">
              <div class="footer-cta">
                <p class="footer-text">{{ t('auth.rememberPassword') }}</p>
                <button type="button" class="link-btn" @click="goToLogin">
                  {{ t('auth.backToSignIn') }}
                </button>
              </div>
            </div>
          </template>
          </div>
        </div>
      </section>
    </main>

    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toastMessage"
          class="auth-toast"
          :class="[toastType, { 'light-theme': isLight }]"
          role="alert"
          aria-live="assertive"
        >
          <span class="auth-toast-text">{{ toastMessage }}</span>
          <button type="button" class="auth-toast-close" @click="clearToast" :aria-label="t('common.close')">×</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import GoogleSignInButton from '../components/GoogleSignInButton.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageToggle from '../components/LanguageToggle.vue'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import farmerPhoto from '../assets/landing/farmer-hero.jpg'
import calffaLogo from '../assets/landing/calffa-logo.jpg'

const route = useRoute()
const router = useRouter()
const authStore = useAuthStore()
const { t, te } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const resetConnectTip = computed(() => {
  if (te('auth.resetConnectFirstTip')) return t('auth.resetConnectFirstTip')
  return 'Important: Your Google account must already be connected in Settings. If it is not connected yet, sign in with your reference number first, connect Google, then come back here.'
})

const isResetFlow = computed(() => route.path === '/forgot-password')

const showPassword = ref(false)
const showNewPassword = ref(false)
const showConfirmPassword = ref(false)
const successMessage = ref('')
const errorMessage = ref('')
const sessionNotice = computed(() => authStore.sessionNotice)
const toastMessage = ref('')
const toastType = ref('error')
let toastTimer = null

const clearToast = () => {
  toastMessage.value = ''
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
}

const showToast = (message, type = 'error') => {
  if (!message) return
  toastType.value = type
  toastMessage.value = message
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(clearToast, type === 'error' ? 5500 : 4000)
}

watch(errorMessage, (value) => {
  if (value) showToast(value, 'error')
})

watch(sessionNotice, (value) => {
  if (value && !isResetFlow.value) showToast(value, 'error')
})

watch(successMessage, (value) => {
  if (value) showToast(value, 'success')
})

const resetStep = ref('google') // google | password | done
const resetToken = ref('')
const passwordError = ref('')
const confirmError = ref('')
const passwordForm = ref({
  password: '',
  confirmPassword: ''
})

const loginForm = ref({
  referenceNumber: '',
  password: '',
  role: 'farmer'
})

const formTitle = computed(() => {
  if (!isResetFlow.value) return t('auth.signIn')
  if (resetStep.value === 'password') return t('auth.createNewPassword')
  if (resetStep.value === 'done') return t('auth.resetSuccessTitle')
  return t('auth.forgotPasswordTitle')
})

const canSubmitPassword = computed(() => {
  return (
    passwordForm.value.password.length >= 8 &&
    passwordForm.value.confirmPassword.length >= 8 &&
    !passwordError.value &&
    !confirmError.value
  )
})

const REFERENCE_FORMAT_REGEX = /^\d{2}-\d{2}-\d{2}-\d{3}-\d{6}$/

const formatReferenceNumberInput = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 15)
  const parts = [2, 2, 2, 3, 6]
  let idx = 0
  const out = []
  for (const p of parts) {
    const chunk = digits.slice(idx, idx + p)
    if (!chunk) break
    out.push(chunk)
    idx += p
  }
  return out.join('-')
}

const handleLoginReferenceInput = () => {
  loginForm.value.referenceNumber = formatReferenceNumberInput(loginForm.value.referenceNumber)
}

const resetForgotState = () => {
  resetStep.value = 'google'
  resetToken.value = ''
  passwordForm.value = { password: '', confirmPassword: '' }
  passwordError.value = ''
  confirmError.value = ''
  errorMessage.value = ''
  successMessage.value = ''
}

watch(
  () => route.path,
  () => {
    errorMessage.value = ''
    successMessage.value = ''
    if (isResetFlow.value) {
      resetForgotState()
    }
  }
)

const submitLogin = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  authStore.sessionNotice = null

  if (!loginForm.value.referenceNumber || !loginForm.value.password) {
    errorMessage.value = t('auth.fillAllFields')
    return
  }

  if (!REFERENCE_FORMAT_REGEX.test(loginForm.value.referenceNumber)) {
    errorMessage.value = t('auth.referenceFormat')
    return
  }

  const result = await authStore.login(loginForm.value.referenceNumber, loginForm.value.password)

  if (result.success) {
    const userRole = authStore.currentUser?.role

    if (userRole === 'admin') {
      router.push('/admin')
    } else {
      router.push('/welcome')
    }
    return
  }

  errorMessage.value = result.error || t('auth.loginFailed')
}

const onResetVerified = ({ resetToken: token }) => {
  errorMessage.value = ''
  successMessage.value = t('auth.resetGoogleVerified')
  resetToken.value = token
  resetStep.value = 'password'
}

const validatePasswordInput = () => {
  const password = passwordForm.value.password
  passwordError.value = ''

  if (!password) return

  if (password.length < 8) {
    passwordError.value = t('signup.passwordMinLength')
    return
  }

  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  if (!hasLetters || !hasNumbers) {
    passwordError.value = t('signup.passwordLettersNumbers')
  }

  if (passwordForm.value.confirmPassword) {
    validateConfirmPassword()
  }
}

const validateConfirmPassword = () => {
  confirmError.value = ''
  if (!passwordForm.value.confirmPassword) return
  if (passwordForm.value.password !== passwordForm.value.confirmPassword) {
    confirmError.value = t('signup.passwordMismatch')
  }
}

const submitNewPassword = async () => {
  errorMessage.value = ''
  successMessage.value = ''
  validatePasswordInput()
  validateConfirmPassword()

  if (!passwordForm.value.password || !passwordForm.value.confirmPassword) {
    errorMessage.value = t('auth.fillAllFields')
    return
  }

  if (passwordError.value || confirmError.value) return

  if (!resetToken.value) {
    errorMessage.value = t('auth.resetSessionExpired')
    resetStep.value = 'google'
    return
  }

  const result = await authStore.completeGooglePasswordReset({
    resetToken: resetToken.value,
    password: passwordForm.value.password,
    confirmPassword: passwordForm.value.confirmPassword
  })

  if (!result.success) {
    errorMessage.value = result.error || t('auth.resetUpdateFailed')
    if (String(result.error || '').toLowerCase().includes('expired')) {
      resetToken.value = ''
      resetStep.value = 'google'
    }
    return
  }

  resetToken.value = ''
  passwordForm.value = { password: '', confirmPassword: '' }
  successMessage.value = ''
  resetStep.value = 'done'
}

const goToSignUp = () => {
  router.push('/signup')
}

const goToForgotPassword = () => {
  resetForgotState()
  router.push('/forgot-password')
}

const goToLogin = () => {
  resetForgotState()
  router.push('/login')
}
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Inter:wght@400;500;600;700;800&display=swap');

.login-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  --primary-orange: #e57431;
  --primary-green: #6bbf59;
  --accent-gold: #ffd966;
  --surface-dark: #19231f;
  --surface-dark-2: #141c19;
  --text-strong: #f2eee4;
  --text-muted: #d7cfbf;
  --text-soft: #eee8da;
  --field-bg: rgba(10, 30, 15, 0.32);
  --field-border: rgba(127, 177, 145, 0.42);
  background: #0f2a1c;
}

.login-page::before {
  display: none;
}

.auth-backdrop {
  position: absolute;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.auth-farmer {
  width: 100%;
  height: 100%;
  object-fit: cover;
  object-position: 62% 42%;
}

.auth-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    105deg,
    rgba(7, 24, 16, 0.68) 0%,
    rgba(7, 24, 16, 0.38) 42%,
    rgba(7, 24, 16, 0.18) 100%
  );
}

.login-page.light-theme .auth-overlay {
  background: linear-gradient(
    105deg,
    rgba(7, 24, 16, 0.42) 0%,
    rgba(7, 24, 16, 0.2) 38%,
    rgba(7, 24, 16, 0.06) 62%,
    transparent 100%
  );
}

.page-top-controls {
  --control-h: 38px;
  position: fixed;
  top: 0.9rem;
  right: 1rem;
  z-index: 300;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

/* Match the theme toggle and language pill to one exact height;
   neutralizes the global button min-height: 44px */
.page-top-controls :deep(.theme-toggle-floating) {
  box-sizing: border-box !important;
  width: var(--control-h) !important;
  height: var(--control-h) !important;
  min-width: var(--control-h) !important;
  min-height: var(--control-h) !important;
  max-height: var(--control-h) !important;
  padding: 0 !important;
  margin: 0 !important;
  flex: 0 0 auto;
}

.page-language-toggle {
  box-sizing: border-box !important;
  display: inline-flex;
  align-items: stretch;
  gap: 2px;
  height: var(--control-h) !important;
  min-height: var(--control-h) !important;
  max-height: var(--control-h) !important;
  margin: 0 !important;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid #0d3f28;
  background: rgba(18, 58, 38, 0.72);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  animation: toggleIn 460ms cubic-bezier(0.22, 1, 0.36, 1) both;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  height: 100% !important;
  min-height: 0 !important;
  min-width: 0 !important;
  margin: 0 !important;
  border-radius: 999px;
  padding: 0 0.85rem !important;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.72rem;
  line-height: 1;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(196, 230, 205, 0.95);
  cursor: pointer;
  transition: background 0.26s, color 0.2s, box-shadow 0.26s, border-color 0.2s;
}

.lang-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
}

.lang-btn.active {
  background: #fff;
  color: #0f2e1f;
  border-color: rgba(13, 63, 40, 0.35);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.layout-shell {
  position: relative;
  z-index: 2;
  width: 100%;
  min-height: 100dvh;
  padding: 4.4rem 0.85rem 0.85rem;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.65rem;
}

.login-card {
  position: relative;
  overflow: hidden;
  border-radius: 26px;
  border: 1px solid rgba(134, 239, 172, 0.38) !important;
  background: linear-gradient(155deg,
    rgba(13, 28, 21, 0.68) 0%,
    rgba(11, 24, 18, 0.62) 45%,
    rgba(9, 20, 15, 0.7) 100%) !important;
  box-shadow:
    0 24px 48px rgba(4, 10, 7, 0.38),
    inset 0 1px 0 rgba(187, 247, 208, 0.14),
    inset 0 0 0 1px rgba(74, 222, 128, 0.1) !important;
  backdrop-filter: blur(20px) saturate(145%) !important;
  -webkit-backdrop-filter: blur(20px) saturate(145%) !important;
}

.login-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(135deg,
    rgba(134, 239, 172, 0.06) 0%,
    rgba(74, 222, 128, 0.05) 45%,
    rgba(52, 211, 153, 0.03) 100%);
  pointer-events: none;
}

.login-card::after {
  content: '';
  position: absolute;
  inset: 8px;
  border-radius: 20px;
  border: 1px solid rgba(152, 186, 164, 0.12);
  pointer-events: none;
}

.tagline-panel {
  min-height: 180px;
  display: flex;
  align-items: center;
  padding: 0.95rem 0.35rem;
  position: relative;
  border-radius: 0;
  border: none !important;
  background: transparent !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.tagline-content {
  max-width: 56ch;
  position: relative;
  z-index: 1;
}

.identity-block {
  max-width: 25rem;
  position: relative;
  padding-left: 1.2rem;
}

.identity-block::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.2rem;
  bottom: 0.2rem;
  width: 4px;
  border-radius: 999px;
  background: linear-gradient(180deg,
    rgba(229, 116, 49, 0.96) 0%,
    rgba(255, 217, 102, 0.9) 42%,
    rgba(107, 191, 89, 0.92) 100%);
  box-shadow: 0 0 18px rgba(107, 191, 89, 0.18);
}

.identity-brand {
  display: flex;
  align-items: center;
  gap: 0.72rem;
}

.identity-logo {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(250, 204, 21, 0.5);
  background: #fff;
}

.identity-brand-text {
  min-width: 0;
}

.identity-name {
  margin: 0;
  color: #ffd966 !important;
  font-size: 1.08rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  line-height: 1.15;
  text-transform: none;
  text-shadow: 0 2px 10px rgba(20, 24, 18, 0.3);
}

.identity-org {
  margin: 0.18rem 0 0;
  color: rgba(249, 244, 231, 0.92) !important;
  font-size: 0.74rem;
  font-weight: 600;
  line-height: 1.3;
  text-shadow: 0 2px 10px rgba(18, 26, 18, 0.28);
}

.identity-badge {
  display: inline-block;
  color: #ffd966;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  text-transform: uppercase;
  text-shadow: 0 2px 10px rgba(20, 24, 18, 0.3);
}

.identity-title {
  margin: 0.55rem 0 0;
  color: #fff8ef;
  font-family: 'Bebas Neue', 'Impact', sans-serif;
  font-size: clamp(2.8rem, 7vw, 5.4rem);
  font-weight: 400;
  line-height: 0.92;
  letter-spacing: 0.03em;
  text-wrap: balance;
  text-shadow: 0 3px 18px rgba(18, 26, 18, 0.3);
}

.identity-caption {
  margin: 0.78rem 0 0;
  max-width: 30ch;
  color: rgba(249, 244, 231, 0.94);
  font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  font-size: 0.94rem;
  font-weight: 500;
  line-height: 1.65;
  letter-spacing: 0.01em;
  text-shadow: 0 2px 12px rgba(18, 26, 18, 0.24);
}

.form-side {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0 1rem;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.login-card {
  width: min(100%, 400px);
  max-width: 400px;
  min-height: 0;
  padding: 1rem 1.05rem 0.95rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: cardIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

/* Continue with Google sits under the Sign In button */
.login-google-block {
  width: 100%;
  flex-shrink: 0;
}

.login-page:not(.light-theme) .login-card :deep(.google-origin-hint),
.login-page:not(.light-theme) .login-card :deep(.google-error-message) {
  color: #9f1239 !important;
  -webkit-text-fill-color: #9f1239 !important;
}

.login-page:not(.light-theme) .login-card :deep(.google-origin-hint strong) {
  color: #9a3412 !important;
  -webkit-text-fill-color: #9a3412 !important;
}

.login-card :deep(.google-signin-btn) {
  min-height: 2.7rem;
  padding: 0.7rem 1rem;
  font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  font-size: 0.92rem;
  font-weight: 600;
  letter-spacing: -0.01em;
  border-radius: 12px;
  border: 1.5px solid #cbd5e1;
  background: #ffffff;
  color: #1f2937;
  box-shadow: none;
}

.login-card :deep(.google-signin-btn:hover:not(.disabled)) {
  border-color: #94a3b8;
  background: #f8fafc;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  transform: none;
  filter: none;
}

.login-card :deep(.google-btn-text) {
  font-family: inherit;
  font-weight: 600;
}

.login-card-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.form-header {
  text-align: center;
  margin-bottom: 0.55rem;
}

.form-title {
  margin: 0;
  color: var(--text-strong);
  font-family: 'Inter', 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.message {
  margin-bottom: 0.4rem;
  padding: 0.62rem 0.7rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  font-size: 0.78rem;
}

.success-message {
  background: rgba(16, 185, 129, 0.26);
  color: #ecfdf5;
}

.error-message {
  background: rgba(248, 113, 113, 0.28);
  color: #fef2f2;
}

.info-message {
  background: rgba(56, 189, 248, 0.2);
  color: #e0f2fe;
  border: 1px solid rgba(125, 211, 252, 0.35);
}

.login-page.light-theme .info-message {
  background: #e0f2fe;
  color: #075985;
  border-color: #7dd3fc;
}

.reset-panel {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.reset-lead {
  margin: 0;
  font-size: 0.82rem;
  line-height: 1.45;
  color: rgba(227, 255, 238, 0.9);
}

.login-page.light-theme .reset-lead {
  color: #355445;
}

.field-hint-error {
  margin: 0.15rem 0 0;
  font-size: 0.75rem;
  color: #fecaca;
}

.login-page.light-theme .field-hint-error {
  color: #b91c1c;
}

.auth-divider {
  margin: 0.85rem 0 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  color: rgba(211, 218, 206, 0.72);
}

.auth-divider-line {
  height: 1px;
  flex: 1;
  background: linear-gradient(90deg, rgba(127, 177, 145, 0.12), rgba(127, 177, 145, 0.45), rgba(127, 177, 145, 0.12));
}

.auth-divider-text {
  font-size: 0.75rem;
  font-weight: 500;
  letter-spacing: 0.01em;
  text-align: center;
  line-height: 1.38;
  white-space: nowrap;
}

@media (min-width: 521px) {
  .auth-divider-text {
    white-space: nowrap;
  }
}

@media (max-width: 520px) {
  .auth-divider {
    gap: 0.42rem;
  }

  .auth-divider-text {
    font-size: 0.72rem;
  }
}

.auth-form {
  margin-top: 0.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  width: 100%;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
}

.password-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.15rem;
}

.password-label-row .form-label {
  margin-bottom: 0;
}

.forgot-link {
  border: none;
  background: transparent;
  color: var(--accent-gold);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  padding: 0;
  white-space: nowrap;
}

.forgot-link:hover {
  text-decoration: underline;
}

.login-page.light-theme .forgot-link {
  color: #14532d;
  font-weight: 700;
}

.login-page.light-theme .forgot-link:hover {
  color: #0f3d22;
  text-decoration: underline;
}

.form-label {
  color: var(--text-soft);
  font-weight: 600;
  font-size: 0.7rem;
  line-height: 1.2;
  /* Neutralize global label touch-target rules (padding + mobile margin-bottom) */
  margin: 0 0 0 0.15rem;
  padding: 0;
  display: block;
  cursor: default;
}

.field-input-wrapper {
  position: relative;
}

.field-icon {
  position: absolute;
  left: 0.72rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  line-height: 0;
  color: #64748b;
  pointer-events: none;
  z-index: 2;
}

.field-icon svg {
  width: 1em;
  height: 1em;
  display: block;
  stroke: currentColor;
}

.form-input {
  width: 100%;
  box-sizing: border-box;
  /* Fixed height: switching between password dots and plain text must not resize the field.
     min-height 0 + margin 0 beat the global input touch-target rules in style.css. */
  height: 2.3rem;
  min-height: 0;
  margin: 0;
  border: 1px solid var(--field-border);
  background: var(--field-bg);
  color: var(--text-soft);
  border-radius: 11px;
  padding: 0 0.66rem 0 2rem;
  font-size: 0.78rem;
  /* normal line-height lets the browser center text natively, regardless of border width */
  line-height: normal;
  font-family: inherit;
  transition: border-color 0.24s, background 0.24s, box-shadow 0.24s;
}

.form-input::placeholder {
  color: rgba(210, 198, 173, 0.62);
}

.form-input:focus {
  outline: none;
  border-color: rgba(107, 191, 89, 0.88);
  background: rgba(12, 38, 22, 0.42);
  animation: inputGlow 1.8s ease-in-out infinite;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper .form-input {
  padding-right: 2.4rem;
}

.password-input-wrapper input[type='password']::-ms-reveal,
.password-input-wrapper input[type='password']::-ms-clear {
  display: none;
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  z-index: 3;
  /* Exact size + min 0: the global 44px button touch-target rule must not inflate
     the toggle beyond the input height (that's what pushed the eye out of the box) */
  width: 1.8rem;
  height: 1.8rem;
  min-width: 0;
  min-height: 0;
  padding: 0;
  margin: 0;
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  outline: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
  color: #374151;
  -webkit-appearance: none;
  appearance: none;
  -webkit-tap-highlight-color: transparent;
}

.password-toggle-svg {
  display: block;
  flex-shrink: 0;
  pointer-events: none;
}

.password-toggle:hover {
  color: #111827;
}

/* The toggle must never move: same position on hover, focus, active, pressed */
.password-toggle:hover,
.password-toggle:focus,
.password-toggle:active,
.password-toggle[aria-pressed='true'],
.password-toggle[aria-pressed='false'] {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  transform: translateY(-50%) !important;
  top: 50% !important;
}

.password-toggle:focus-visible {
  outline: 2px solid rgba(107, 191, 89, 0.75);
  outline-offset: 2px;
  border-radius: 6px;
}

.auth-form .password-toggle,
.auth-form .password-toggle .password-toggle-svg {
  color: #374151;
  stroke: currentColor;
  -webkit-text-fill-color: currentColor;
}

.auth-form .password-toggle:hover,
.auth-form .password-toggle:hover .password-toggle-svg {
  color: #111827;
}

.link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  min-height: 0;
  min-width: 0;
  border: none;
  border-radius: 0;
  background: transparent;
  color: #86efac;
  font-family: inherit;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  cursor: pointer;
  box-shadow: none;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  transition: color 0.18s ease, opacity 0.18s ease;
}

.link-btn:hover {
  background: transparent;
  border: none;
  color: #bbf7d0;
  transform: none;
  box-shadow: none;
}

.submit-btn {
  position: relative;
  overflow: hidden;
  margin-top: 0.2rem;
  border: none;
  background: #14532d;
  color: #ffffff;
  border-radius: 12px;
  font-family: inherit;
  font-weight: 700;
  font-size: 0.95rem;
  letter-spacing: -0.01em;
  padding: 0.78rem 1.2rem;
  width: 100%;
  box-sizing: border-box;
  min-width: 0;
  min-height: 2.7rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 20px rgba(4, 18, 12, 0.28);
  transition: background 0.18s ease, transform 0.18s ease, box-shadow 0.18s ease;
}

.submit-btn::before {
  display: none;
}

.submit-btn:hover:not(:disabled) {
  background: #166534;
  transform: translateY(-1px);
  box-shadow: 0 10px 24px rgba(4, 18, 12, 0.32);
  filter: none;
}

.submit-btn:hover:not(:disabled)::before {
  display: none;
}

.submit-btn:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.38), 0 8px 20px rgba(4, 18, 12, 0.28);
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
}

.loading-spinner {
  display: inline-block;
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  margin-right: 0.4rem;
  vertical-align: middle;
  animation: spin 0.8s linear infinite;
}

.form-footer {
  margin-top: 0.85rem;
  border-top: none;
  padding: 0;
  display: flex;
  justify-content: center;
  color: rgba(227, 255, 238, 0.92);
  font-size: 0.82rem;
  background: transparent;
  border-radius: 0;
  margin-bottom: 0.08rem;
}

.footer-cta {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.footer-text {
  margin: 0;
}

@keyframes toggleIn {
  from {
    opacity: 0;
    transform: translateY(-12px) translateX(6px);
  }
  to {
    opacity: 1;
    transform: translateY(0) translateX(0);
  }
}

@keyframes cardIn {
  from {
    opacity: 0;
    transform: translateY(26px) scale(0.96);
  }
  to {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

@keyframes inputGlow {
  0%,
  100% {
    box-shadow:
      0 0 0 3px rgba(74, 222, 128, 0.22),
      0 0 18px rgba(74, 222, 128, 0.16);
  }
  50% {
    box-shadow:
      0 0 0 3px rgba(74, 222, 128, 0.48),
      0 0 32px rgba(74, 222, 128, 0.28);
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* Dark mode — cohesive farm-green palette */
.login-page:not(.light-theme) .login-card {
  border: 2px solid rgba(110, 231, 183, 0.38) !important;
}

.login-page:not(.light-theme) .login-card::after {
  border: 1.5px solid rgba(74, 222, 128, 0.22) !important;
}

.login-page:not(.light-theme) .form-header {
  padding-bottom: 0 !important;
  margin-bottom: 0.55rem !important;
  border-bottom: none !important;
}

.login-page:not(.light-theme) .form-title {
  color: #f8fafc !important;
}

.login-page:not(.light-theme) .auth-form .form-input,
.login-page:not(.light-theme) .auth-form input.form-input {
  background: #0f2419 !important;
  color: #ecfdf5 !important;
  -webkit-text-fill-color: #ecfdf5 !important;
  border: 2px solid rgba(110, 231, 183, 0.45) !important;
  caret-color: #ecfdf5 !important;
}

.login-page:not(.light-theme) .auth-form .form-input::placeholder {
  color: rgba(167, 243, 208, 0.5) !important;
  -webkit-text-fill-color: rgba(167, 243, 208, 0.5) !important;
}

.login-page:not(.light-theme) .auth-form .form-input:focus {
  border-color: rgba(134, 239, 172, 0.72) !important;
  background: #122b1e !important;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2) !important;
  animation: none !important;
}

.login-page:not(.light-theme) .auth-form .form-input:-webkit-autofill,
.login-page:not(.light-theme) .auth-form .form-input:-webkit-autofill:hover,
.login-page:not(.light-theme) .auth-form .form-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #0f2419 inset !important;
  box-shadow: 0 0 0 1000px #0f2419 inset !important;
  -webkit-text-fill-color: #ecfdf5 !important;
  caret-color: #ecfdf5 !important;
  border: 2px solid rgba(110, 231, 183, 0.45) !important;
}

.login-page:not(.light-theme) .field-icon {
  color: rgba(134, 239, 172, 0.85) !important;
}

.login-page:not(.light-theme) .auth-form .password-toggle,
.login-page:not(.light-theme) .auth-form .password-toggle .password-toggle-svg,
.login-page:not(.light-theme) .auth-form .password-toggle :is(path, circle, line) {
  color: rgba(187, 247, 208, 0.92) !important;
  stroke: currentColor !important;
  -webkit-text-fill-color: currentColor !important;
}

.login-page:not(.light-theme) .auth-form .password-toggle:hover,
.login-page:not(.light-theme) .auth-form .password-toggle:hover .password-toggle-svg,
.login-page:not(.light-theme) .auth-form .password-toggle:focus,
.login-page:not(.light-theme) .auth-form .password-toggle:active,
.login-page:not(.light-theme) .auth-form .password-toggle[aria-pressed='true'] {
  color: #ecfdf5 !important;
  stroke: currentColor !important;
  -webkit-text-fill-color: currentColor !important;
  background: transparent !important;
  box-shadow: none !important;
}

.login-page:not(.light-theme) .form-footer {
  border-top: none !important;
  background: transparent !important;
}

.login-page:not(.light-theme) .submit-btn {
  background: #16a34a !important;
  border: none !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  box-shadow: 0 8px 20px rgba(4, 18, 12, 0.35) !important;
}

.login-page:not(.light-theme) .submit-btn:hover:not(:disabled) {
  background: #22c55e !important;
  transform: translateY(-1px) !important;
  filter: none !important;
}

.login-page:not(.light-theme) .submit-btn :is(span, svg, svg *) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.login-page:not(.light-theme) .login-card :deep(.google-signin-btn) {
  background: #ffffff !important;
  border: 1.5px solid rgba(134, 239, 172, 0.45) !important;
  color: #1f2937 !important;
}

.login-page:not(.light-theme) .link-btn {
  background: transparent !important;
  border: none !important;
  color: #86efac !important;
  -webkit-text-fill-color: #86efac !important;
  box-shadow: none !important;
}

.login-page:not(.light-theme) .link-btn:hover {
  background: transparent !important;
  color: #bbf7d0 !important;
  -webkit-text-fill-color: #bbf7d0 !important;
  transform: none !important;
}

/* Light mode — component-scoped so it wins over dark defaults below */
.login-page.light-theme .login-card {
  background: linear-gradient(
    155deg,
    rgba(255, 255, 255, 0.52) 0%,
    rgba(248, 253, 249, 0.46) 48%,
    rgba(236, 253, 245, 0.5) 100%
  ) !important;
  border: 1.5px solid rgba(255, 255, 255, 0.62) !important;
  box-shadow:
    0 20px 48px rgba(22, 101, 52, 0.1),
    0 4px 14px rgba(22, 101, 52, 0.05),
    inset 0 1px 0 rgba(255, 255, 255, 0.35),
    inset 0 0 0 1px rgba(134, 239, 172, 0.22) !important;
  backdrop-filter: blur(26px) saturate(165%) !important;
  -webkit-backdrop-filter: blur(26px) saturate(165%) !important;
}

.login-page.light-theme .login-card::before {
  background: linear-gradient(
    135deg,
    rgba(220, 252, 231, 0.16) 0%,
    rgba(187, 247, 208, 0.08) 45%,
    rgba(254, 243, 199, 0.06) 100%
  ) !important;
}

.login-page.light-theme .login-card::after {
  border: 1px solid rgba(255, 255, 255, 0.38) !important;
}

.login-page.light-theme .form-header {
  padding-bottom: 0 !important;
  margin-bottom: 0.55rem !important;
  border-bottom: none !important;
}

.login-page.light-theme .form-title {
  color: #052e16 !important;
}

.login-page.light-theme .form-label {
  color: #052e16 !important;
}

.login-page.light-theme :is(.auth-divider, .auth-divider-text) {
  color: #052e16 !important;
  font-weight: 600 !important;
}

.login-page.light-theme .auth-divider-line {
  height: 2px !important;
  background: linear-gradient(
    90deg,
    rgba(21, 128, 61, 0.2),
    #15803d 35%,
    #166534 50%,
    #15803d 65%,
    rgba(21, 128, 61, 0.2)
  ) !important;
}

.login-page.light-theme .auth-form .form-input {
  background: rgba(255, 255, 255, 0.88) !important;
  color: #000000 !important;
  border: 2px solid rgba(22, 101, 52, 0.45) !important;
  box-shadow:
    inset 0 1px 2px rgba(22, 101, 52, 0.05),
    0 1px 0 rgba(255, 255, 255, 0.45) !important;
  backdrop-filter: blur(8px) !important;
  -webkit-backdrop-filter: blur(8px) !important;
}

.login-page.light-theme .auth-form .form-input::placeholder {
  color: #4b5563 !important;
}

.login-page.light-theme .auth-form .form-input:focus {
  border-color: #14532d !important;
  background: rgba(255, 255, 255, 0.94) !important;
  box-shadow:
    0 0 0 3px rgba(74, 222, 128, 0.28),
    inset 0 0 0 1px rgba(21, 128, 61, 0.2) !important;
  animation: none !important;
}

.login-page.light-theme .auth-form .form-input:-webkit-autofill,
.login-page.light-theme .auth-form .form-input:-webkit-autofill:hover,
.login-page.light-theme .auth-form .form-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #ffffff inset !important;
  box-shadow: 0 0 0 1000px #ffffff inset !important;
  -webkit-text-fill-color: #000000 !important;
  caret-color: #000000;
  border: 2.5px solid #166534 !important;
}

.login-page.light-theme .field-icon {
  color: #166534 !important;
}

.login-page.light-theme .password-toggle,
.login-page.light-theme .password-toggle .password-toggle-svg {
  color: #374151 !important;
  stroke: currentColor !important;
  -webkit-text-fill-color: currentColor !important;
}

.login-page.light-theme .password-toggle:hover,
.login-page.light-theme .password-toggle:hover .password-toggle-svg {
  color: #052e16 !important;
}

.login-page.light-theme .submit-btn {
  background: #14532d !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: none !important;
  box-shadow: 0 8px 20px rgba(20, 83, 45, 0.22) !important;
}

.login-page.light-theme .submit-btn:hover:not(:disabled) {
  background: #166534 !important;
  color: #ffffff !important;
  border: none !important;
  transform: translateY(-1px) !important;
  filter: none !important;
}

.login-page.light-theme .submit-btn :is(span, svg, svg *) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.login-page.light-theme .link-btn {
  background: transparent !important;
  border: none !important;
  color: #15803d !important;
  -webkit-text-fill-color: #15803d !important;
  box-shadow: none !important;
}

.login-page.light-theme .link-btn:hover {
  background: transparent !important;
  border: none !important;
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
  transform: none !important;
}

.login-page.light-theme .form-footer {
  background: transparent !important;
  border-top: none !important;
  color: #374151 !important;
}

.login-page.light-theme .footer-text {
  color: #4b5563 !important;
}

.login-page.light-theme .login-card :deep(.google-signin-btn) {
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  color: #1f2937 !important;
}

.login-page.light-theme .success-message {
  background: #dcfce7 !important;
  border: 2px solid #86efac !important;
  color: #14532d !important;
}

.login-page.light-theme .error-message {
  background: #fef2f2 !important;
  border: 2px solid #fca5a5 !important;
  color: #991b1b !important;
}

.login-page.light-theme .page-language-toggle {
  background: rgba(255, 255, 255, 0.96) !important;
  border: 2.5px solid #166534 !important;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.12) !important;
}

.login-page.light-theme .lang-btn {
  color: #166534 !important;
  border: 1.5px solid transparent !important;
}

.login-page.light-theme .lang-btn:hover {
  background: #f0fdf4 !important;
  color: #14532d !important;
  border-color: rgba(21, 128, 61, 0.45) !important;
}

.login-page.light-theme .lang-btn.active {
  background: #dcfce7 !important;
  color: #14532d !important;
  border: 1.5px solid #14532d !important;
}

@media (min-width: 920px) {
  .layout-shell {
    grid-template-columns: minmax(0, 1.05fr) minmax(440px, 480px);
    align-items: center;
    column-gap: 3.25rem;
    max-width: 1180px;
    margin-inline: auto;
    width: 100%;
    padding: 5rem 3.25rem 2.4rem;
    height: 100dvh;
    box-sizing: border-box;
  }

  .tagline-panel {
    min-height: 0;
    align-items: center;
    padding: 0.5rem 0.4rem 0.5rem 0;
  }

  .identity-block {
    transform: none;
    max-width: 30rem;
    padding-left: 1.35rem;
  }

  .identity-logo {
    width: 64px;
    height: 64px;
  }

  .identity-name {
    font-size: 1.2rem;
  }

  .identity-org {
    font-size: 0.82rem;
  }

  .form-side {
    justify-content: flex-end;
    padding: 0;
  }

  .login-card {
    width: 100%;
    max-width: 480px;
    margin-top: 0;
    height: auto;
    max-height: none;
    padding: 2.15rem 2.1rem 1.9rem;
    border-radius: 24px;
    transform: none;
  }

  .form-header {
    margin-bottom: 1.2rem;
  }

  .login-page.light-theme .form-header {
    margin-bottom: 1.2rem !important;
  }

  .form-title {
    font-size: 1.7rem;
  }

  .auth-form {
    margin-top: 0.15rem;
    gap: 1rem;
  }

  .form-group {
    gap: 0.32rem;
  }

  .form-label {
    font-size: 0.84rem;
  }

  .form-input {
    height: 2.9rem;
    font-size: 0.95rem;
    border-radius: 12px;
    padding: 0 0.9rem 0 2.4rem;
  }

  .password-input-wrapper .form-input {
    padding-right: 2.75rem;
  }

  .field-icon {
    left: 0.88rem;
    font-size: 1rem;
  }

  .password-toggle {
    right: 0.55rem;
    width: 2.15rem;
    height: 2.15rem;
  }

  .submit-btn {
    margin-top: 0.35rem;
    min-height: 3.05rem;
    font-size: 1.02rem;
    border-radius: 13px;
    padding: 0.85rem 1.2rem;
  }

  .login-card :deep(.google-signin-btn) {
    min-height: 3.05rem;
    padding: 0.8rem 1.05rem;
    font-size: 0.95rem;
    border-radius: 13px;
  }

  .auth-divider {
    margin: 1.15rem 0 1.05rem;
  }

  .auth-divider-text {
    font-size: 0.8rem;
  }

  .form-footer {
    margin-top: 1.15rem;
  }

  .footer-text,
  .link-btn {
    font-size: 0.92rem;
  }
}

/* Mobile / narrow screens: everything must fit in one viewport, no scrolling */
@media (max-width: 919px) {
  .layout-shell {
    height: 100dvh;
    min-height: 0;
    /* Clear space below the floating theme/language controls */
    padding: 4rem 0.6rem 0.6rem;
    /* Flex column centered as ONE group: leftover space goes above the tagline
       and below the card, never between them */
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 0.55rem;
    overflow: hidden;
  }

  .tagline-panel {
    min-height: 0;
    flex: 0 0 auto;
    padding: 0.3rem 0.3rem;
  }

  .identity-logo {
    width: 42px;
    height: 42px;
  }

  .identity-name {
    font-size: 0.95rem;
  }

  .identity-org {
    font-size: 0.68rem;
  }

  .identity-title {
    margin-top: 0.32rem;
    font-size: clamp(2.05rem, 7.5vw, 3rem);
    line-height: 0.96;
  }

  .identity-caption {
    margin-top: 0.4rem;
    font-size: 0.84rem;
    line-height: 1.45;
  }

  .identity-block {
    padding-left: 0.85rem;
  }

  .form-side {
    /* Shrinkable so the whole group always fits the viewport (card scrolls inside if needed) */
    flex: 0 1 auto;
    min-height: 0;
    padding: 0 0.4rem;
  }

  .login-card {
    border-radius: 18px;
    padding: 0.85rem 0.85rem 0.8rem;
    max-height: 100%;
    overflow-y: auto;
  }

  /* Inputs: 16px font prevents iOS focus-zoom (which visually breaks icon alignment);
     fixed height keeps the icons and the eye toggle perfectly centered */
  .form-input {
    height: 2.5rem;
    font-size: 1rem;
    padding: 0 0.7rem 0 2.2rem;
    line-height: normal;
  }

  .password-input-wrapper .form-input {
    padding-right: 2.6rem;
  }

  .field-icon {
    left: 0.78rem;
    font-size: 0.95rem;
  }

  .password-toggle {
    right: 0.55rem;
    width: 2rem;
    height: 2rem;
  }

  .form-label {
    font-size: 0.78rem;
  }

  .auth-divider {
    margin: 0.75rem 0 0.7rem;
  }

  .auth-form {
    margin-top: 0;
  }

  .form-group {
    gap: 0.18rem;
  }
}

@media (max-width: 420px) {
  .page-top-controls {
    top: 0.6rem;
    right: 0.6rem;
    gap: 0.4rem;
  }

  .page-top-controls {
    --control-h: 34px;
  }

  .lang-btn {
    padding: 0 0.7rem !important;
    font-size: 0.68rem;
  }

  .layout-shell {
    padding: 3.7rem 0.45rem 0.45rem;
  }

  .submit-btn {
    font-size: 0.9rem;
  }
}

/* Short laptop viewports: keep professional sizing, only tighten outer padding */
@media (min-width: 920px) and (max-height: 760px) {
  .layout-shell {
    padding: 4.2rem 2.4rem 1.4rem;
    column-gap: 2.4rem;
  }

  .login-card {
    padding: 1.7rem 1.8rem 1.55rem;
  }

  .identity-title {
    font-size: clamp(2.4rem, 5.4vw, 4.2rem);
  }

  .form-header,
  .login-page.light-theme .form-header {
    margin-bottom: 0.95rem !important;
  }

  .auth-form {
    gap: 0.82rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
  }
}
</style>

<style>
/* Teleported toast — centered on screen (login + signup) */
.auth-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10050;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  max-width: min(92vw, 420px);
  width: max-content;
  min-width: min(92vw, 280px);
  padding: 0.95rem 1.1rem;
  border-radius: 12px;
  border: 1px solid rgba(248, 113, 113, 0.45);
  background: linear-gradient(145deg, rgba(127, 29, 29, 0.96), rgba(69, 10, 10, 0.94));
  color: #fff7f7;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4);
  font-size: 0.95rem;
  line-height: 1.4;
  text-align: left;
}

.auth-toast.success {
  border-color: rgba(74, 222, 128, 0.45);
  background: linear-gradient(145deg, rgba(21, 128, 61, 0.96), rgba(20, 83, 45, 0.94));
  color: #f0fdf4;
}

.auth-toast.light-theme {
  background: #fff1f2;
  border-color: #fda4af;
  color: #9f1239;
}

.auth-toast.light-theme.success {
  background: #f0fdf4;
  border-color: #86efac;
  color: #14532d;
}

.auth-toast-text {
  flex: 1;
  font-weight: 600;
}

.auth-toast-close {
  border: none;
  background: transparent;
  color: inherit;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
  opacity: 0.85;
  padding: 0 0.15rem;
}

.auth-toast-close:hover {
  opacity: 1;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.2s ease, transform 0.2s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, calc(-50% - 10px));
}

@media (max-width: 640px) {
  .auth-toast {
    top: 50%;
    bottom: auto;
    width: calc(100vw - 1.5rem);
    max-width: calc(100vw - 1.5rem);
  }
}
</style>
