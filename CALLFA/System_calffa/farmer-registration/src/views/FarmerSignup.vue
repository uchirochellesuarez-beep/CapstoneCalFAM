<template>
  <div class="signup-page glass-auth-page" :class="{ 'light-theme': isLight }">
    <div class="auth-backdrop" aria-hidden="true">
      <img :src="farmerPhoto" alt="" class="auth-farmer" />
      <div class="auth-overlay"></div>
    </div>

    <div class="page-top-controls">
      <ThemeToggle variant="floating" />
      <LanguageToggle variant="floating" />
    </div>

    <main class="layout-shell">
      <section class="tagline-panel tagline-panel--desktop" aria-label="Platform highlight">
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
              {{ t('brand.signupCaption') }}
            </p>
          </div>
        </div>
      </section>

      <section class="form-side" :aria-label="t('signup.formAria')">
        <div class="signup-card">
          <div class="signup-card-inner">
          <div class="form-header">
            <h2 class="form-title">{{ t('signup.title') }}</h2>
          </div>

          <div v-if="success" class="message success-message">{{ t('signup.successMessage') }}</div>
          <!-- Validation errors use toast -->

          <GoogleSignInButton class="signup-google-block" />

          <div class="auth-divider" aria-hidden="true">
            <span class="auth-divider-line"></span>
            <span class="auth-divider-text">{{ t('signup.dividerForm') }}</span>
            <span class="auth-divider-line"></span>
          </div>

        <form @submit.prevent="register" class="registration-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('signup.fullName') }}</label>
              <input
                v-model="form.full_name"
                type="text"
                required
                class="form-input"
                :placeholder="t('signup.fullNamePlaceholder')"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('signup.birthDate') }}</label>
              <div class="date-input-wrapper">
                <input
                  v-model="form.date_of_birth"
                  type="date"
                  required
                  class="form-input date-input"
                  :max="getMaxDateOfBirth()"
                />
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('signup.barangay') }}</label>
              <select
                v-model="form.barangay_id"
                required
                class="form-input"
                :disabled="barangaysLoading"
              >
                <option value="" disabled>
                  {{ barangaysLoading ? t('common.loading') : t('signup.selectBarangay') }}
                </option>
                <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.id">
                  {{ barangay.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('signup.landArea') }}</label>
              <TypedNumberInput
                v-model="form.land_area"
                :min="0.01"
                :max="LAND_AREA_MAX"
                :max-integer-digits="LAND_AREA_MAX_INTEGER_DIGITS"
                :placeholder="t('signup.landAreaPlaceholder')"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('signup.phoneNumber') }}</label>
              <input
                v-model="form.phone_number"
                type="tel"
                required
                class="form-input"
                :placeholder="t('signup.phonePlaceholder')"
                maxlength="11"
                @input="form.phone_number = form.phone_number.replace(/\D/g, '').slice(0, 11)"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ t('signup.education') }}</label>
              <select
                v-model="form.educational_status"
                required
                class="form-input"
              >
                <option value="">{{ t('signup.selectEducation') }}</option>
                <option value="No Formal Education">{{ t('signup.noFormalEducation') }}</option>
                <option value="Elementary Level">{{ t('signup.elementaryLevel') }}</option>
                <option value="Elementary Graduate">{{ t('signup.elementaryGraduate') }}</option>
                <option value="High School Level">{{ t('signup.highSchoolLevel') }}</option>
                <option value="High School Graduate">{{ t('signup.highSchoolGraduate') }}</option>
                <option value="Vocational">{{ t('signup.vocational') }}</option>
                <option value="College Level">{{ t('signup.collegeLevel') }}</option>
                <option value="College Graduate">{{ t('signup.collegeGraduate') }}</option>
                <option value="Post Graduate">{{ t('signup.postGraduate') }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-group-full">
              <label class="form-label">{{ t('signup.referenceNumber') }}</label>
              <div class="field-input-wrapper">
                <span class="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="3" y="4" width="18" height="16" rx="3" ry="3" />
                    <path d="M8 9h8M8 13h5" />
                  </svg>
                </span>
                <input
                  v-model="form.reference_number"
                  type="text"
                  required
                  minlength="19"
                  maxlength="19"
                  pattern="\d{2}-\d{2}-\d{2}-\d{3}-\d{6}"
                  inputmode="numeric"
                  class="form-input"
                  :placeholder="t('signup.referencePlaceholder')"
                  @input="handleReferenceInput"
                />
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-group-full">
              <label class="form-label">{{ t('signup.address') }}</label>
              <input
                v-model="form.address"
                type="text"
                required
                class="form-input"
                :placeholder="t('signup.addressPlaceholder')"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group password-group">
              <label class="form-label">{{ t('signup.password') }}</label>
              <div class="password-input-wrapper field-input-wrapper">
                <span class="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="11" width="16" height="9" rx="2" ry="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  v-model="form.password"
                  :type="showPassword ? 'text' : 'password'"
                  required
                  class="form-input"
                  autocomplete="new-password"
                  :placeholder="t('signup.passwordPlaceholder')"
                  @input="validatePasswordInput"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="password-toggle"
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
              <span v-if="passwordError" class="form-error">{{ passwordError }}</span>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group confirm-password-group">
              <label class="form-label">{{ t('signup.confirmPassword') }}</label>
              <div class="password-input-wrapper field-input-wrapper">
                <span class="field-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" width="1em" height="1em" fill="none" stroke="currentColor" stroke-width="2">
                    <rect x="4" y="11" width="16" height="9" rx="2" ry="2" />
                    <path d="M8 11V8a4 4 0 0 1 8 0v3" />
                  </svg>
                </span>
                <input
                  v-model="form.confirmPassword"
                  :type="showConfirmPassword ? 'text' : 'password'"
                  required
                  class="form-input"
                  autocomplete="new-password"
                  :placeholder="t('signup.confirmPasswordPlaceholder')"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="password-toggle"
                  :aria-label="showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                  :aria-pressed="showConfirmPassword"
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
            </div>
          </div>

          <div class="form-row form-row-legal">
            <RegistrationLegalNotice v-model:agreed="agreedToTerms" />
          </div>

          <div class="form-row form-row-actions">
            <button
              type="submit"
              :disabled="loading"
              class="submit-btn"
            >
              {{ loading ? t('signup.registering') : t('signup.createAccount') }}
            </button>
          </div>

          <div class="form-row form-row-footer">
          <div class="form-footer">
            <div class="footer-cta">
              <p class="footer-text">{{ t('signup.alreadyHaveAccount') }}</p>
              <router-link to="/login" class="link-btn">{{ t('signup.signIn') }}</router-link>
              </div>
            </div>
          </div>
        </form>
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
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import GoogleSignInButton from '../components/GoogleSignInButton.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageToggle from '../components/LanguageToggle.vue'
import RegistrationLegalNotice from '../components/RegistrationLegalNotice.vue'
import TypedNumberInput from '../components/TypedNumberInput.vue'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { LAND_AREA_MAX, LAND_AREA_MAX_INTEGER_DIGITS } from '../utils/numericInput'
import farmerPhoto from '../assets/landing/farmer-hero.jpg'
import calffaLogo from '../assets/landing/calffa-logo.jpg'

const router = useRouter()
const { t } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const form = ref({
  full_name: '',
  date_of_birth: '',
  barangay_id: '',
  land_area: '',
  phone_number: '',
  educational_status: '',
  reference_number: '',
  address: '',
  password: '',
  confirmPassword: ''
})

const barangays = ref([])
const barangaysLoading = ref(true)

const loading = ref(false)
const error = ref('')
const success = ref(false)
const passwordError = ref('')
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

watch(error, (value) => {
  if (value) showToast(value, 'error')
})

watch(passwordError, (value) => {
  if (value) showToast(value, 'error')
})

watch(success, (value) => {
  if (value) showToast(t('signup.successMessage'), 'success')
})
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreedToTerms = ref(false)
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

const handleReferenceInput = () => {
  form.value.reference_number = formatReferenceNumberInput(form.value.reference_number)
}

const getMaxDateOfBirth = () => {
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
  return maxDate.toISOString().split('T')[0]
}

const loadBarangays = async () => {
  barangaysLoading.value = true
  try {
    const response = await fetch('/api/barangays')
    const data = await response.json()
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to load barangays')
    }
    barangays.value = data.barangays || []
  } catch (err) {
    console.error('Failed to load barangays:', err)
    error.value = t('signup.barangayLoadError')
  } finally {
    barangaysLoading.value = false
  }
}

onMounted(() => {
  loadBarangays()
})

const calculateAge = (birthDate) => {
  const today = new Date()
  const birth = new Date(birthDate)
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age
}

const validateAge = () => {
  if (!form.value.date_of_birth) {
    error.value = t('signup.birthDateRequired')
    return false
  }
  const age = calculateAge(form.value.date_of_birth)
  if (age < 18) {
    error.value = t('signup.ageRequirement', { age })
    return false
  }
  return true
}

const validatePhoneNumber = () => {
  const phoneNumber = form.value.phone_number.replace(/\D/g, '')
  if (phoneNumber.length !== 11) {
    error.value = t('signup.phoneDigits', { count: phoneNumber.length })
    return false
  }
  return true
}

const validatePassword = () => {
  const password = form.value.password

  if (password.length < 8) {
    error.value = t('signup.passwordMinLength')
    return false
  }

  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)

  if (!hasLetters || !hasNumbers) {
    error.value = t('signup.passwordLettersNumbers')
    return false
  }

  return true
}

const validatePasswordInput = () => {
  const password = form.value.password

  if (!password) {
    passwordError.value = ''
    return
  }

  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  const length = password.length

  if (length < 8) {
    passwordError.value = t('signup.passwordMoreChars', { count: 8 - length })
    return
  }

  if (!hasLetters && hasNumbers) {
    passwordError.value = t('signup.passwordAddLetters')
    return
  }

  if (hasLetters && !hasNumbers) {
    passwordError.value = t('signup.passwordAddNumbers')
    return
  }

  passwordError.value = ''
}

const register = async () => {
  if (!validateAge()) {
    return
  }

  if (!validatePhoneNumber()) {
    return
  }

  if (!validatePassword()) {
    return
  }

  if (form.value.password !== form.value.confirmPassword) {
    error.value = t('signup.passwordMismatch')
    return
  }
  if (!REFERENCE_FORMAT_REGEX.test(form.value.reference_number)) {
    error.value = t('signup.referenceFormatError')
    return
  }

  const landHa = parseFloat(form.value.land_area)
  if (!Number.isFinite(landHa) || landHa <= 0) {
    error.value = t('signup.landAreaError')
    return
  }
  if (landHa > LAND_AREA_MAX) {
    error.value = t('signup.landAreaMaxError')
    return
  }

  if (!agreedToTerms.value) {
    error.value = t('signup.agreeRequired')
    return
  }

  loading.value = true
  error.value = ''
  success.value = false

  try {
    const selectedBarangay = barangays.value.find(
      (b) => String(b.id) === String(form.value.barangay_id)
    )
    if (!selectedBarangay) {
      error.value = t('signup.selectValidBarangay')
      loading.value = false
      return
    }

    const response = await fetch('/api/farmers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        full_name: form.value.full_name,
        date_of_birth: form.value.date_of_birth,
        address: form.value.address.trim() || selectedBarangay.name,
        phone_number: form.value.phone_number,
        educational_status: form.value.educational_status,
        reference_number: form.value.reference_number,
        password: form.value.password,
        barangay_id: selectedBarangay.id,
        land_area: landHa
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Registration failed' }))
      throw new Error(errorData.message || 'Registration failed')
    }

    await response.json()

    success.value = true
    form.value = {
      full_name: '',
      date_of_birth: '',
      barangay_id: '',
      land_area: '',
      phone_number: '',
      educational_status: '',
      reference_number: '',
      address: '',
      password: '',
      confirmPassword: ''
    }

    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } catch (err) {
    error.value = err.message || t('signup.registerError')
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="../styles/auth-signup-shared.css"></style>

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
