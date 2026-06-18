<template>
  <div class="signup-page glass-auth-page">
    <div class="page-top-controls">
      <ThemeToggle variant="floating" />
      <div class="page-language-toggle" role="group" aria-label="Language selector">
      <button
        type="button"
        @click="language = 'en'"
        :class="['lang-btn', { active: language === 'en' }]"
      >
        English
      </button>
      <button
        type="button"
        @click="language = 'tl'"
        :class="['lang-btn', { active: language === 'tl' }]"
      >
        Tagalog
      </button>
      </div>
    </div>

    <main class="layout-shell">
      <section class="tagline-panel tagline-panel--desktop" aria-label="Platform highlight">
        <div class="tagline-content">
          <div class="identity-block">
            <span class="identity-badge">{{ language === 'tl' ? 'Portal ng Magsasaka' : 'Farmer Portal' }}</span>
            <p class="identity-title">{{ language === 'tl' ? 'Mula Binhi Hanggang Tagumpay' : 'From Seeds to Success' }}</p>
            <p class="identity-caption">
              {{
                language === 'tl'
                  ? 'Gumawa ng account upang ma-access ang mga serbisyo ng kooperatiba.'
                  : 'Create your account to access cooperative services.'
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="form-side" aria-label="Registration form">
        <div class="signup-card">
          <div class="signup-card-inner">
          <div class="form-header">
            <h2 class="form-title">{{ ui.title }}</h2>
          </div>

          <div v-if="success" class="message success-message">{{ ui.successMessage }}</div>
          <div v-if="error" class="message error-message">{{ error }}</div>

          <GoogleSignInButton class="signup-google-block" />

          <div class="auth-divider" aria-hidden="true">
            <span class="auth-divider-line"></span>
            <span class="auth-divider-text">{{ ui.dividerForm }}</span>
            <span class="auth-divider-line"></span>
          </div>

        <form @submit.prevent="register" class="registration-form">
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ ui.fullName }}</label>
              <input
                v-model="form.full_name"
                type="text"
                required
                class="form-input"
                :placeholder="ui.fullNamePlaceholder"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ ui.birthDate }}</label>
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
              <label class="form-label">{{ ui.barangay }}</label>
              <select
                v-model="form.barangay_id"
                required
                class="form-input"
                :disabled="barangaysLoading"
              >
                <option value="" disabled>
                  {{ barangaysLoading ? (language === 'tl' ? 'Naglo-load...' : 'Loading...') : ui.selectBarangay }}
                </option>
                <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.id">
                  {{ barangay.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ ui.landArea }}</label>
              <TypedNumberInput
                v-model="form.land_area"
                :min="0.01"
                :placeholder="ui.landAreaPlaceholder"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ ui.phoneNumber }}</label>
              <input
                v-model="form.phone_number"
                type="tel"
                required
                class="form-input"
                :placeholder="ui.phonePlaceholder"
                maxlength="11"
                @input="form.phone_number = form.phone_number.replace(/\D/g, '').slice(0, 11)"
              />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ ui.education }}</label>
              <select
                v-model="form.educational_status"
                required
                class="form-input"
              >
                <option value="">{{ ui.selectEducation }}</option>
                <option value="No Formal Education">{{ ui.noFormalEducation }}</option>
                <option value="Elementary Level">{{ ui.elementaryLevel }}</option>
                <option value="Elementary Graduate">{{ ui.elementaryGraduate }}</option>
                <option value="High School Level">{{ ui.highSchoolLevel }}</option>
                <option value="High School Graduate">{{ ui.highSchoolGraduate }}</option>
                <option value="Vocational">{{ ui.vocational }}</option>
                <option value="College Level">{{ ui.collegeLevel }}</option>
                <option value="College Graduate">{{ ui.collegeGraduate }}</option>
                <option value="Post Graduate">{{ ui.postGraduate }}</option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group form-group-full">
              <label class="form-label">{{ ui.referenceNumber }}</label>
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
                  :placeholder="ui.referencePlaceholder"
                  @input="handleReferenceInput"
                />
              </div>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group password-group">
              <label class="form-label">{{ ui.password }}</label>
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
                  :placeholder="ui.passwordPlaceholder"
                  @input="validatePasswordInput"
                />
                <button
                  type="button"
                  @click="showPassword = !showPassword"
                  class="password-toggle"
                  :aria-label="
                    language === 'tl'
                      ? (showPassword ? 'Itago ang password' : 'Ipakita ang password')
                      : (showPassword ? 'Hide password' : 'Show password')
                  "
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
              <label class="form-label">{{ ui.confirmPassword }}</label>
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
                  :placeholder="ui.confirmPasswordPlaceholder"
                />
                <button
                  type="button"
                  @click="showConfirmPassword = !showConfirmPassword"
                  class="password-toggle"
                  :aria-label="
                    language === 'tl'
                      ? (showConfirmPassword ? 'Itago ang password' : 'Ipakita ang password')
                      : (showConfirmPassword ? 'Hide password' : 'Show password')
                  "
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
            <RegistrationLegalNotice v-model:agreed="agreedToTerms" :language="language" />
          </div>

          <div class="form-row form-row-actions">
            <button
              type="submit"
              :disabled="loading"
              class="submit-btn"
            >
              {{ loading ? ui.registering : ui.createAccount }}
            </button>
          </div>

          <div class="form-row form-row-footer">
            <div class="form-footer">
              <div class="footer-cta">
                <p class="footer-text">{{ ui.alreadyHaveAccount }}</p>
                <router-link to="/login" class="link-btn">{{ ui.signIn }}</router-link>
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
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import GoogleSignInButton from '../components/GoogleSignInButton.vue'
import ThemeToggle from '../components/ThemeToggle.vue'
import RegistrationLegalNotice from '../components/RegistrationLegalNotice.vue'
import TypedNumberInput from '../components/TypedNumberInput.vue'

const router = useRouter()
const language = ref('en')

const labels = {
  en: {
    title: 'Farmer Registration',
    subtitle: 'Begin your journey',
    dividerForm: 'or use the form below',
    fullName: 'Full Name',
    fullNamePlaceholder: 'Enter your full name',
    birthDate: 'Date of Birth',
    barangay: 'Barangay',
    selectBarangay: 'Select your barangay',
    landArea: 'Farm area (hectares)',
    landAreaPlaceholder: 'e.g. 1.25',
    landAreaHint: 'Total hectares you farm. Barangay land totals come from approved members.',
    phoneNumber: 'Phone Number',
    phonePlaceholder: 'Enter your phone number',
    education: 'Educational Status',
    selectEducation: 'Select educational attainment',
    noFormalEducation: 'No Formal Education',
    elementaryLevel: 'Elementary Level',
    elementaryGraduate: 'Elementary Graduate',
    highSchoolLevel: 'High School Level',
    highSchoolGraduate: 'High School Graduate',
    vocational: 'Vocational',
    collegeLevel: 'College Level',
    collegeGraduate: 'College Graduate',
    postGraduate: 'Post Graduate',
    educationHint: 'Select your highest educational attainment',
    referenceNumber: 'Reference Number',
    referencePlaceholder: '00-00-00-000-000000',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Confirm your password',
    createAccount: 'Create Account',
    registering: 'Registering...',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign In',
    successMessage: 'Registration successful! Please login with your credentials.',
    referenceFormatError: 'Reference number must follow 00-00-00-000-000000 format.',
    landAreaError: 'Farm area (hectares) must be a number greater than 0.',
    registerError: 'An error occurred during registration',
    agreeRequired: 'You must agree to the terms and conditions and data privacy policy before registering.'
  },
  tl: {
    title: 'Pagrehistro ng Magsasaka',
    subtitle: 'Magsimula ng iyong paglalakbay',
    dividerForm: 'o gamitin ang form sa ibaba',
    fullName: 'Buong Pangalan',
    fullNamePlaceholder: 'Ilagay ang iyong buong pangalan',
    birthDate: 'Petsa ng Kapanganakan',
    barangay: 'Barangay',
    selectBarangay: 'Piliin ang iyong barangay',
    landArea: 'Lawak ng sakahan (ektarya)',
    landAreaPlaceholder: 'hal. 1.25',
    landAreaHint: 'Kabuuang ektarya ng inyong sakahan. Ang kabuuang lupa ng barangay ay mula sa aprubadong miyembro.',
    phoneNumber: 'Numero ng Telepono',
    phonePlaceholder: 'Ilagay ang numero ng telepono',
    education: 'Antas ng Edukasyon',
    selectEducation: 'Piliin ang natapos na edukasyon',
    noFormalEducation: 'Walang Pormal na Edukasyon',
    elementaryLevel: 'Elementarya (Hindi Tapos)',
    elementaryGraduate: 'Elementarya (Tapos)',
    highSchoolLevel: 'High School (Hindi Tapos)',
    highSchoolGraduate: 'High School (Tapos)',
    vocational: 'Bokasyonal',
    collegeLevel: 'Kolehiyo (Hindi Tapos)',
    collegeGraduate: 'Kolehiyo (Tapos)',
    postGraduate: 'Post Graduate',
    educationHint: 'Piliin ang pinakamataas na antas ng edukasyon',
    referenceNumber: 'Reference Number',
    referencePlaceholder: '00-00-00-000-000000',
    password: 'Password',
    passwordPlaceholder: 'Ilagay ang password',
    confirmPassword: 'Kumpirmahin ang Password',
    confirmPasswordPlaceholder: 'Kumpirmahin ang iyong password',
    createAccount: 'Gumawa ng Account',
    registering: 'Nagre-rehistro...',
    alreadyHaveAccount: 'Mayroon nang account?',
    signIn: 'Mag-login',
    successMessage: 'Matagumpay ang pagrehistro! Paki-login gamit ang inyong credentials.',
    referenceFormatError: 'Ang reference number ay dapat sumunod sa format na 00-00-00-000-000000.',
    landAreaError: 'Ang lawak ng sakahan (ektarya) ay dapat na numero na mas mataas sa 0.',
    registerError: 'May error sa pagrehistro',
    agreeRequired: 'Dapat sumang-ayon sa mga tuntunin at data privacy policy bago magrehistro.'
  }
}

const ui = computed(() => labels[language.value])

const form = ref({
  full_name: '',
  date_of_birth: '',
  barangay_id: '',
  land_area: '',
  phone_number: '',
  educational_status: '',
  reference_number: '',
  password: '',
  confirmPassword: ''
})

const barangays = ref([])
const barangaysLoading = ref(true)

const loading = ref(false)
const error = ref('')
const success = ref(false)
const passwordError = ref('')
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
    error.value = language.value === 'tl'
      ? 'Hindi ma-load ang listahan ng barangay. Paki-refresh ang pahina.'
      : 'Could not load barangay list. Please refresh the page.'
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
    error.value = language.value === 'tl' ? 'Kinakailangan ang petsa ng kapanganakan' : 'Date of birth is required'
    return false
  }
  const age = calculateAge(form.value.date_of_birth)
  if (age < 18) {
    error.value = language.value === 'tl'
      ? `Dapat ay hindi bababa sa 18 taong gulang. Kayo ay ${age} taong gulang.`
      : `You must be at least 18 years old to register. You are currently ${age} years old.`
    return false
  }
  return true
}

const validatePhoneNumber = () => {
  const phoneNumber = form.value.phone_number.replace(/\D/g, '')
  if (phoneNumber.length !== 11) {
    error.value = language.value === 'tl'
      ? `Ang numero ng telepono ay dapat eksaktong 11 digit. ${phoneNumber.length} ang nailagay.`
      : `Phone number must be exactly 11 digits. You entered ${phoneNumber.length} digits.`
    return false
  }
  return true
}

const validatePassword = () => {
  const password = form.value.password

  if (password.length < 8) {
    error.value = language.value === 'tl'
      ? 'Ang password ay dapat may hindi bababa sa 8 karakter'
      : 'Password must be at least 8 characters long'
    return false
  }

  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)

  if (!hasLetters || !hasNumbers) {
    error.value = language.value === 'tl'
      ? 'Ang password ay dapat may parehong letra at numero'
      : 'Password must contain both letters and numbers'
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
    passwordError.value = language.value === 'tl'
      ? `${8 - length} pang karakter ang kailangan`
      : `${8 - length} more character(s) needed`
    return
  }

  if (!hasLetters && hasNumbers) {
    passwordError.value = language.value === 'tl' ? 'Magdagdag ng mga letra (A-Z o a-z)' : 'Add letters (A-Z or a-z)'
    return
  }

  if (hasLetters && !hasNumbers) {
    passwordError.value = language.value === 'tl' ? 'Magdagdag ng mga numero (0-9)' : 'Add numbers (0-9)'
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
    error.value = language.value === 'tl' ? 'Hindi magkatugma ang password' : 'Passwords do not match'
    return
  }
  if (!REFERENCE_FORMAT_REGEX.test(form.value.reference_number)) {
    error.value = ui.value.referenceFormatError
    return
  }

  const landHa = parseFloat(form.value.land_area)
  if (!Number.isFinite(landHa) || landHa <= 0) {
    error.value = ui.value.landAreaError
    return
  }

  if (!agreedToTerms.value) {
    error.value = ui.value.agreeRequired
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
      error.value = language.value === 'tl'
        ? 'Pumili ng wastong barangay.'
        : 'Please select a valid barangay.'
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
        address: selectedBarangay.name,
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
      password: '',
      confirmPassword: ''
    }

    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } catch (err) {
    error.value = err.message || ui.value.registerError
  } finally {
    loading.value = false
  }
}
</script>

<style scoped src="../styles/auth-signup-shared.css"></style>
