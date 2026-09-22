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
              {{ t('brand.googleCaption') }}
            </p>
          </div>
        </div>
      </section>

      <section class="form-side" :aria-label="t('googleReg.formAria')">
        <div class="signup-card">
          <div class="signup-card-inner">
            <div class="form-header google-form-header">
              <img
                v-if="profilePicture"
                :src="profilePicture"
                alt=""
                class="google-profile-photo"
              />
              <div>
                <h2 class="form-title">{{ t('googleReg.title') }}</h2>
                <p v-if="formData.email" class="google-email-caption">{{ formData.email }}</p>
              </div>
            </div>

            <div v-if="successMessage" class="message success-message">{{ successMessage }}</div>
            <div v-if="errorMessage" class="message error-message">{{ errorMessage }}</div>

            <form @submit.prevent="submitRegistration" class="registration-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ t('signup.fullName') }}</label>
                  <input v-model="formData.full_name" type="text" required class="form-input" />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ t('signup.birthDate') }}</label>
                  <input
                    v-model="formData.date_of_birth"
                    type="date"
                    :max="getMaxDateOfBirth()"
                    required
                    class="form-input"
                  />
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ t('signup.barangay') }}</label>
                  <select
                    v-model="formData.barangay_id"
                    required
                    class="form-input"
                    :disabled="barangaysLoading"
                    @change="onBarangayChange"
                  >
                    <option value="" disabled>
                      {{ barangaysLoading ? t('common.loading') : t('signup.selectBarangay') }}
                    </option>
                    <option v-for="brgy in barangays" :key="brgy.id" :value="brgy.id">
                      {{ brgy.name }}
                    </option>
                  </select>
                  <span v-if="errors.barangay_id" class="form-error">{{ errors.barangay_id }}</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ t('signup.landArea') }}</label>
                  <TypedNumberInput
                    v-model="formData.land_area"
                    :min="0.01"
                    :max="LAND_AREA_MAX"
                    :max-integer-digits="LAND_AREA_MAX_INTEGER_DIGITS"
                    :placeholder="t('signup.landAreaPlaceholder')"
                    @blur="validateLandArea"
                  />
                  <span v-if="errors.land_area" class="form-error">{{ errors.land_area }}</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ t('signup.phoneNumber') }}</label>
                  <input
                    v-model="formData.phone_number"
                    type="tel"
                    required
                    class="form-input"
                    :placeholder="t('signup.phonePlaceholder')"
                    maxlength="11"
                    @input="formData.phone_number = formData.phone_number.replace(/\D/g, '').slice(0, 11)"
                    @blur="validatePhoneNumber"
                  />
                  <span v-if="errors.phone_number" class="form-error">{{ errors.phone_number }}</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ t('signup.education') }}</label>
                  <select v-model="formData.educational_status" required class="form-input">
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
                      v-model="formData.reference_number"
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
                  <span v-if="errors.reference_number" class="form-error">{{ errors.reference_number }}</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group form-group-full">
                  <label class="form-label">{{ t('signup.address') }}</label>
                  <input
                    v-model="formData.address"
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
                      v-model="formData.password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      class="form-input"
                      autocomplete="new-password"
                      :placeholder="t('googleReg.passwordPlaceholder')"
                      @blur="validatePassword"
                    />
                    <button
                      type="button"
                      @click="showPassword = !showPassword"
                      class="password-toggle"
                      :aria-label="showPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                    >
                      <svg v-if="showPassword" class="password-toggle-svg" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                      <svg v-else class="password-toggle-svg" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    </button>
                  </div>
                  <span v-if="errors.password" class="form-error">{{ errors.password }}</span>
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
                      v-model="formData.confirm_password"
                      :type="showConfirmPassword ? 'text' : 'password'"
                      required
                      class="form-input"
                      autocomplete="new-password"
                      :placeholder="t('googleReg.confirmPasswordPlaceholder')"
                      @blur="validateConfirmPassword"
                    />
                    <button
                      type="button"
                      @click="showConfirmPassword = !showConfirmPassword"
                      class="password-toggle"
                      :aria-label="showConfirmPassword ? t('auth.hidePassword') : t('auth.showPassword')"
                    >
                      <svg v-if="showConfirmPassword" class="password-toggle-svg" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                      </svg>
                      <svg v-else class="password-toggle-svg" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                      </svg>
                    </button>
                  </div>
                  <span v-if="errors.confirm_password" class="form-error">{{ errors.confirm_password }}</span>
                </div>
              </div>

              <div class="form-row form-row-legal">
                <RegistrationLegalNotice v-model:agreed="agreedToTerms" />
              </div>

              <div class="form-row form-row-actions">
                <button type="submit" :disabled="isSubmitting" class="submit-btn">
                  {{ isSubmitting ? t('googleReg.submitting') : t('googleReg.submit') }}
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
  </div>
</template>

<script setup>
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { useI18n } from 'vue-i18n'
import ThemeToggle from '../components/ThemeToggle.vue'
import LanguageToggle from '../components/LanguageToggle.vue'
import RegistrationLegalNotice from '../components/RegistrationLegalNotice.vue'
import TypedNumberInput from '../components/TypedNumberInput.vue'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { LAND_AREA_MAX, LAND_AREA_MAX_INTEGER_DIGITS } from '../utils/numericInput'
import farmerPhoto from '../assets/landing/farmer-hero.jpg'
import calffaLogo from '../assets/landing/calffa-logo.jpg'

const router = useRouter()
const route = useRoute()
const { t } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const formData = reactive({
  google_id: '',
  reference_number: route.query.referenceNumber || '',
  full_name: route.query.fullName || '',
  email: route.query.email || '',
  profile_picture: route.query.picture || '',
  phone_number: '',
  date_of_birth: '',
  address: '',
  educational_status: '',
  barangay_id: '',
  land_area: '',
  password: '',
  confirm_password: ''
})

const profilePicture = ref(route.query.picture || '')
const token = ref(route.query.token || '')
const barangays = ref([])
const barangaysLoading = ref(true)
const isSubmitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
const agreedToTerms = ref(false)
const errors = reactive({
  reference_number: '',
  phone_number: '',
  land_area: '',
  barangay_id: '',
  password: '',
  confirm_password: ''
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

const handleReferenceInput = () => {
  formData.reference_number = formatReferenceNumberInput(formData.reference_number)
  errors.reference_number = REFERENCE_FORMAT_REGEX.test(formData.reference_number)
    ? ''
    : t('signup.referenceFormatError')
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
    errorMessage.value = t('googleReg.barangayLoadError')
  } finally {
    barangaysLoading.value = false
  }
}

onMounted(() => {
  loadBarangays()
})

const getMaxDateOfBirth = () => {
  const today = new Date()
  const eighteenYearsAgo = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
  return eighteenYearsAgo.toISOString().split('T')[0]
}

const validatePhoneNumber = () => {
  const phoneDigitsOnly = formData.phone_number.replace(/\D/g, '')
  if (formData.phone_number && phoneDigitsOnly.length !== 11) {
    errors.phone_number = t('googleReg.phoneDigits', { count: phoneDigitsOnly.length })
  } else {
    errors.phone_number = ''
  }
}

const validateLandArea = () => {
  const area = parseFloat(formData.land_area)
  if (formData.land_area && (Number.isNaN(area) || area <= 0)) {
    errors.land_area = t('googleReg.landAreaPositive')
  } else if (Number.isFinite(area) && area > LAND_AREA_MAX) {
    errors.land_area = t('signup.landAreaMaxError')
  } else {
    errors.land_area = ''
  }
}

const onBarangayChange = () => {
  if (formData.barangay_id) {
    errors.barangay_id = ''
  }
}

const validatePassword = () => {
  const pwd = formData.password
  errors.password = ''

  if (!pwd) return

  if (pwd.length < 8) {
    errors.password = t('signup.passwordMinLength')
    return
  }

  const hasLetters = /[a-zA-Z]/.test(pwd)
  const hasNumbers = /[0-9]/.test(pwd)

  if (!hasLetters || !hasNumbers) {
    errors.password = t('signup.passwordLettersNumbers')
    return
  }

  if (formData.confirm_password) {
    validateConfirmPassword()
  }
}

const validateConfirmPassword = () => {
  errors.confirm_password = ''

  if (!formData.confirm_password) return

  if (formData.password !== formData.confirm_password) {
    errors.confirm_password = t('signup.passwordMismatch')
  }
}

const validateForm = () => {
  let isValid = true

  if (!REFERENCE_FORMAT_REGEX.test(formData.reference_number || '')) {
    errors.reference_number = t('signup.referenceFormatError')
    isValid = false
  } else {
    errors.reference_number = ''
  }

  validatePhoneNumber()
  if (errors.phone_number) isValid = false

  validateLandArea()
  if (errors.land_area) isValid = false

  if (!formData.barangay_id) {
    errors.barangay_id = t('googleReg.barangayRequired')
    isValid = false
  }

  validatePassword()
  if (errors.password) isValid = false

  validateConfirmPassword()
  if (errors.confirm_password) isValid = false

  if (!formData.password) {
    errors.password = t('googleReg.passwordRequired')
    isValid = false
  }

  if (!formData.confirm_password) {
    errors.confirm_password = t('googleReg.confirmPasswordRequired')
    isValid = false
  }

  return isValid
}

const submitRegistration = async () => {
  if (!agreedToTerms.value) {
    errorMessage.value = t('signup.agreeRequired')
    return
  }

  if (!validateForm()) {
    errorMessage.value = t('googleReg.fixErrors')
    return
  }

  try {
    isSubmitting.value = true
    errorMessage.value = ''

    const verifyResponse = await fetch('/api/auth/google/verify-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.value })
    })

    const verifyData = await verifyResponse.json()
    if (!verifyData.success) {
      throw new Error(t('googleReg.tokenFailed'))
    }

    formData.google_id = verifyData.profileData.google_id
    formData.profile_picture = profilePicture.value || formData.profile_picture

    const response = await fetch('/api/auth/google/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    const data = await response.json()

    if (!data.success) {
      throw new Error(data.message || 'Registration failed')
    }

    successMessage.value = t('googleReg.successRedirect')

    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error) {
    errorMessage.value = error.message || t('googleReg.registerFailed')
    console.error('Registration error:', error)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<style scoped src="../styles/auth-signup-shared.css"></style>

<style scoped>
.google-form-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
  text-align: left;
}

.google-profile-photo {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(134, 239, 172, 0.55);
  flex-shrink: 0;
}

.google-email-caption {
  margin: 0.12rem 0 0;
  font-size: 0.62rem;
  color: rgba(211, 218, 206, 0.82);
  line-height: 1.2;
  word-break: break-all;
}
</style>
