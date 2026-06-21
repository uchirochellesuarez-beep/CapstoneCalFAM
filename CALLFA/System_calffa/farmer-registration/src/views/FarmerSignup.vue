<template>
  <div class="signup-page glass-auth-page" :class="{ 'light-theme': isLight }">
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
      <section class="tagline-panel" aria-label="Platform highlight">
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
            <p class="form-subtitle">{{ ui.subtitle }}</p>
          </div>

          <div v-if="success" class="message success-message">{{ ui.successMessage }}</div>
          <div v-if="error" class="message error-message">{{ error }}</div>

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
                v-model="form.address"
                required
                class="form-input"
              >
                <option value="" disabled>{{ ui.selectBarangay }}</option>
                <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.name">
                  {{ barangay.name }}
                </option>
              </select>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ ui.landArea }}</label>
              <input
                v-model="form.land_area"
                type="number"
                required
                min="0.01"
                step="0.01"
                class="form-input"
                :placeholder="ui.landAreaPlaceholder"
              />
              <p class="form-hint">{{ ui.landAreaHint }}</p>
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
              <p class="form-hint">{{ ui.educationHint }}</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label class="form-label">{{ ui.role }}</label>
              <select v-model="form.role" required class="form-input">
                <option value="farmer">👨‍🌾 {{ ui.roleFarmer }}</option>
                <option value="president">👔 {{ ui.rolePresident }}</option>
                <option value="treasurer">💰 {{ ui.roleTreasurer }}</option>
                <option value="auditor">📊 {{ ui.roleAuditor }}</option>
                <option value="operator">⚙️ {{ ui.roleOperator }}</option>
                <option value="operation_manager">🛠️ {{ ui.roleOperationManager }}</option>
                <option value="business_manager">💼 {{ ui.roleBusinessManager }}</option>
                <option value="agriculturist">🌱 {{ ui.roleAgriculturist }}</option>
              </select>
              <p class="form-hint">{{ ui.roleHint }}</p>
            </div>
          </div>

          <div class="form-row">
            <div class="form-group">
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

          <div class="form-actions">
            <button
              type="submit"
              :disabled="loading"
              class="submit-btn"
            >
              {{ loading ? ui.registering : ui.createAccount }}
            </button>
          </div>

          <div class="form-footer">
            <div class="footer-cta">
              <p class="footer-text">{{ ui.alreadyHaveAccount }}</p>
              <router-link to="/login" class="link-btn">{{ ui.signIn }}</router-link>
            </div>
          </div>
        </form>

        <div class="info-card" role="note" aria-live="polite">
          <div class="info-card-header">
            <h3 class="info-title">{{ ui.dailyTip }}</h3>
          </div>
          <p class="info-content">{{ dailyTip }}</p>
        </div>
          </div>
        </div>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const router = useRouter()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const language = ref('en')

const labels = {
  en: {
    title: 'Farmer Registration',
    subtitle: 'Begin your journey',
    dividerForm: 'or complete registration using the form below',
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
    role: 'Account Type / Role',
    roleFarmer: 'Farmer',
    rolePresident: 'President',
    roleTreasurer: 'Treasurer',
    roleAuditor: 'Auditor',
    roleOperator: 'Operator',
    roleOperationManager: 'Operation Manager',
    roleBusinessManager: 'Business Manager',
    roleAgriculturist: 'Agriculturist',
    roleHint: 'Select your role in the cooperative',
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
    dailyTip: 'Daily Tip',
    referenceFormatError: 'Reference number must follow 00-00-00-000-000000 format.',
    landAreaError: 'Farm area (hectares) must be a number greater than 0.',
    registerError: 'An error occurred during registration'
  },
  tl: {
    title: 'Pagrehistro ng Magsasaka',
    subtitle: 'Magsimula ng iyong paglalakbay',
    dividerForm: 'o kumpletuhin ang pagrehistro gamit ang form sa ibaba',
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
    role: 'Uri ng Account / Tungkulin',
    roleFarmer: 'Magsasaka',
    rolePresident: 'Presidente',
    roleTreasurer: 'Ingat-Yaman',
    roleAuditor: 'Auditor',
    roleOperator: 'Operator',
    roleOperationManager: 'Operation Manager',
    roleBusinessManager: 'Business Manager',
    roleAgriculturist: 'Agriculturist',
    roleHint: 'Piliin ang iyong tungkulin sa kooperatiba',
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
    dailyTip: 'Pang-araw-araw na Tip',
    referenceFormatError: 'Ang reference number ay dapat sumunod sa format na 00-00-00-000-000000.',
    landAreaError: 'Ang lawak ng sakahan (ektarya) ay dapat na numero na mas mataas sa 0.',
    registerError: 'May error sa pagrehistro'
  }
}

const ui = computed(() => labels[language.value])

const dailyTips = {
  en: [
    'Water crops early in the morning for better absorption.',
    'Rotate crops regularly to keep soil nutrients balanced.',
    'Use organic matter to improve long-term soil structure.',
    'Inspect leaves weekly to catch pests before outbreaks.'
  ],
  tl: [
    'Diligan ang pananim sa umaga para sa mas mahusay na pagsipsip.',
    'Mag-rotate ng pananim para mapanatiling may sustansya ang lupa.',
    'Gumamit ng organikong materyal para sa mas malusog na lupa.',
    'Suriin lingguhan ang dahon upang maagapan ang peste.'
  ]
}

const dailyTip = ref('')

const form = ref({
  role: 'farmer',
  full_name: '',
  date_of_birth: '',
  address: '',
  land_area: '',
  phone_number: '',
  educational_status: '',
  reference_number: '',
  password: '',
  confirmPassword: ''
})

const barangays = ref([
  {
    id: 1,
    name: 'Camansihan',
    description: 'Primary operational barangay with active transactions'
  },
  {
    id: 2,
    name: 'Managpi',
    description: 'Sample barangay for demonstration'
  }
])

const loading = ref(false)
const error = ref('')
const success = ref(false)
const passwordError = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)
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

const setDailyTip = () => {
  const tips = dailyTips[language.value]
  dailyTip.value = tips[Math.floor(Math.random() * tips.length)]
}

const getMaxDateOfBirth = () => {
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
  return maxDate.toISOString().split('T')[0]
}

onMounted(() => {
  setDailyTip()
})

watch(language, () => {
  setDailyTip()
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

  loading.value = true
  error.value = ''
  success.value = false

  try {
    const barangayMatch = barangays.value.find((b) => b.name === form.value.address)

    const response = await fetch('/api/farmers/register', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        full_name: form.value.full_name,
        date_of_birth: form.value.date_of_birth,
        address: form.value.address,
        phone_number: form.value.phone_number,
        educational_status: form.value.educational_status,
        reference_number: form.value.reference_number,
        password: form.value.password,
        role: form.value.role,
        barangay_id: barangayMatch?.id ?? null,
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
      role: 'farmer',
      full_name: '',
      date_of_birth: '',
      address: '',
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

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Space+Grotesk:wght@400;500;700&display=swap');

.signup-page {
  position: fixed;
  inset: 0;
  overflow: hidden;
  font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
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
  background: url('https://i.pinimg.com/1200x/1d/73/0c/1d730c5473037a32dd743b05ac2bb466.jpg') center/cover no-repeat fixed !important;
}

.signup-page::before {
  display: none !important;
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

.signup-card {
  position: relative;
  width: min(100%, 900px);
  height: auto;
  max-height: calc(100dvh - 0.9rem);
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.72rem 0.82rem;
  border-radius: 26px;
  border: 2px solid rgba(74, 222, 128, 0.32) !important;
  background: linear-gradient(
    155deg,
    rgba(13, 28, 21, 0.97) 0%,
    rgba(11, 24, 18, 0.96) 45%,
    rgba(9, 20, 15, 0.98) 100%
  ) !important;
  box-shadow:
    16px 16px 34px rgba(4, 10, 7, 0.72),
    -8px -8px 20px rgba(34, 60, 45, 0.18),
    inset 0 1px 0 rgba(134, 239, 172, 0.1),
    inset 0 0 0 1px rgba(74, 222, 128, 0.08) !important;
  backdrop-filter: blur(14px) saturate(125%) !important;
  -webkit-backdrop-filter: blur(14px) saturate(125%) !important;
  animation: cardIn 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both;
  display: flex;
  flex-direction: column;
}

.signup-card-inner {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  width: 100%;
}

.signup-card::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(
    135deg,
    rgba(134, 239, 172, 0.06) 0%,
    rgba(74, 222, 128, 0.05) 45%,
    rgba(52, 211, 153, 0.03) 100%
  );
  pointer-events: none;
  z-index: 0;
}

.signup-card::after {
  content: '';
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(152, 186, 164, 0.12);
  border-radius: 20px;
  pointer-events: none;
  z-index: 0;
}

.page-language-toggle,
.tagline-content,
.form-footer,
.info-card {
  position: relative;
  z-index: 2;
}

.page-top-controls {
  position: fixed;
  top: 0.8rem;
  right: 0.8rem;
  z-index: 300;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.page-language-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.18rem;
  padding: 0.24rem;
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
  border-radius: 999px;
  padding: 0.34rem 0.9rem;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.73rem;
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
  background: linear-gradient(
    180deg,
    rgba(229, 116, 49, 0.96) 0%,
    rgba(255, 217, 102, 0.9) 42%,
    rgba(107, 191, 89, 0.92) 100%
  );
  box-shadow: 0 0 18px rgba(107, 191, 89, 0.18);
}

.identity-badge {
  display: inline-block;
  color: #ffd966;
  font-size: 0.76rem;
  font-weight: 800;
  letter-spacing: 0.14em;
  font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
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
  font-family: 'Space Grotesk', 'Segoe UI', system-ui, sans-serif;
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

.form-header {
  text-align: center;
  margin-bottom: 0.46rem;
}

.form-title {
  margin: 0;
  color: var(--text-strong);
  font-size: 1.35rem;
  font-weight: 700;
}

.form-subtitle {
  margin: 0.14rem 0 0;
  font-size: 0.8rem;
  color: rgba(215, 207, 191, 0.92);
}

.auth-divider {
  margin: 0.75rem 0 0.2rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  color: rgba(211, 218, 206, 0.72);
}

.auth-divider-line {
  height: 1px;
  flex: 1;
  background: linear-gradient(
    90deg,
    rgba(127, 177, 145, 0.12),
    rgba(127, 177, 145, 0.45),
    rgba(127, 177, 145, 0.12)
  );
}

.auth-divider-text {
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-align: center;
  line-height: 1.38;
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
    white-space: normal;
    font-size: 0.67rem;
    max-width: 11.5rem;
    text-wrap: balance;
  }
}

.registration-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.42rem 0.64rem;
  align-content: start;
  flex: 0 1 auto;
  min-height: 0;
  overflow: visible;
  padding-right: 0.35rem;
  margin-top: 0.35rem;
}

.form-row {
  display: contents;
}

.form-group {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

/* Full-width on grid by default avoids mis-placing items in column 2 above */
.password-group,
.confirm-password-group {
  grid-column: 1 / -1;
}

@media (min-width: 901px) {
  .password-group {
    grid-column: 1 / 2;
  }

  .confirm-password-group {
    grid-column: 2 / 3;
  }
}

.registration-form .form-footer {
  grid-column: 1 / -1;
  margin-top: 0.65rem;
  width: 100%;
  box-sizing: border-box;
}

.form-label {
  color: var(--text-soft);
  font-weight: 600;
  font-size: 0.72rem;
  text-shadow: 0 1px 4px rgba(0, 0, 0, 0.2);
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
  color: #64748b;
  pointer-events: none;
}

.field-input-wrapper .form-input {
  padding: 0.46rem 0.72rem 0.46rem 2.15rem;
}

.form-input {
  width: 100%;
  border: 1px solid var(--field-border);
  background: var(--field-bg);
  color: var(--text-soft);
  border-radius: 13px;
  padding: 0.46rem 1.9rem 0.46rem 0.64rem;
  font-size: 0.76rem;
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

.form-input option {
  color: #1a0e00;
  background: #fff8ee;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper.field-input-wrapper .form-input {
  padding-right: 2.4rem;
}

.password-toggle {
  position: absolute;
  right: 0.62rem;
  top: 50%;
  transform: translateY(-50%);
  width: 2.2rem;
  height: 2.2rem;
  padding: 0;
  margin: 0;
  background: transparent;
  border: none;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}

.password-toggle-svg {
  display: block;
  flex-shrink: 0;
}

.password-input-wrapper input[type='password']::-ms-reveal,
.password-input-wrapper input[type='password']::-ms-clear {
  display: none;
}

.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.form-hint {
  font-size: 0.6rem;
  color: rgba(211, 218, 206, 0.72);
  margin-top: 0.05rem;
}

.form-error {
  font-size: 0.7rem;
  color: #fde68a;
  font-weight: 600;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 0.24rem;
  margin-bottom: 0.08rem;
  padding-right: 0;
  grid-column: 1 / -1;
  flex-shrink: 0;
}

.submit-btn {
  position: relative;
  overflow: hidden;
  border: 2px solid rgba(110, 231, 183, 0.5);
  background: linear-gradient(128deg, #1a4d32 0%, #1f5c3a 42%, #247647 100%);
  color: #f0fdf4;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.86rem;
  letter-spacing: 0.03em;
  padding: 0.62rem 1.36rem;
  width: 100%;
  max-width: min(100%, 360px);
  box-sizing: border-box;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow:
    0 8px 22px rgba(4, 18, 12, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.14);
  transition:
    transform 0.22s cubic-bezier(0.34, 1.56, 0.64, 1),
    box-shadow 0.22s ease,
    background 0.3s ease,
    filter 0.22s ease;
}

.submit-btn::before {
  content: '';
  position: absolute;
  top: 0;
  left: -120%;
  width: 45%;
  height: 100%;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0) 0%,
    rgba(255, 255, 255, 0.28) 50%,
    rgba(255, 255, 255, 0) 100%
  );
  transform: skewX(-20deg);
  transition: left 0.42s ease;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(128deg, #1f5c3a 0%, #247647 45%, #2d9160 100%);
  transform: translateY(-2px) scale(1.02);
  box-shadow:
    0 14px 32px rgba(4, 18, 12, 0.42),
    0 0 22px rgba(52, 211, 153, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.18);
  filter: brightness(1.05);
}

.submit-btn:hover:not(:disabled)::before {
  left: 120%;
}

.submit-btn:focus-visible {
  outline: none;
  box-shadow:
    0 0 0 3px rgba(74, 222, 128, 0.38),
    0 12px 32px rgba(4, 18, 12, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.2);
}

.submit-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
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

.registration-form .form-input:focus {
  animation: none;
}

.registration-form .password-toggle,
.registration-form .password-toggle svg {
  color: #374151;
  stroke: currentColor;
}

.registration-form .password-toggle:hover,
.registration-form .password-toggle:hover svg {
  color: #111827;
}

.success-message {
  background: rgba(16, 185, 129, 0.26);
  color: #ecfdf5;
}

.error-message {
  background: rgba(248, 113, 113, 0.28);
  color: #fef2f2;
}

.form-footer {
  margin-top: 0.45rem;
  border-top: 1px solid rgba(134, 239, 172, 0.35);
  padding-top: 0.52rem;
  display: flex;
  justify-content: center;
  color: rgba(227, 255, 238, 0.92);
  font-size: 0.72rem;
  background: linear-gradient(
    140deg,
    rgba(20, 78, 44, 0.36) 0%,
    rgba(28, 110, 58, 0.28) 52%,
    rgba(16, 62, 36, 0.4) 100%
  );
  border-radius: 14px;
  margin-bottom: 0.1rem;
  flex-shrink: 0;
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

.link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.42rem 0.96rem;
  border-radius: 999px;
  border: 2px solid rgba(110, 231, 183, 0.55);
  background: rgba(15, 46, 31, 0.72);
  color: #d1fae5;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  text-decoration: none;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(4, 18, 12, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  transition: all 0.22s;
}

.link-btn:hover {
  background: linear-gradient(128deg,
    rgba(20, 83, 45, 0.95) 0%,
    rgba(22, 101, 52, 0.92) 50%,
    rgba(34, 197, 94, 0.88) 100%);
  border-color: rgba(134, 239, 172, 0.72);
  color: #ecfdf5;
  transform: translateY(-2px) scale(1.02);
  box-shadow: 0 8px 24px rgba(4, 18, 12, 0.35), 0 0 20px rgba(52, 211, 153, 0.2);
}

.info-card {
  display: none;
  margin-top: 0.35rem;
  padding: 0.52rem 0.78rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 220, 120, 0.32);
  background: linear-gradient(
    135deg,
    rgba(234, 92, 14, 0.16),
    rgba(245, 158, 11, 0.14),
    rgba(252, 211, 40, 0.1),
    rgba(74, 163, 60, 0.14)
  );
  backdrop-filter: blur(12px) saturate(130%);
  -webkit-backdrop-filter: blur(12px) saturate(130%);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.24),
    0 4px 16px rgba(100, 40, 0, 0.12);
  animation: tipFadeIn 0.85s 0.4s ease-out both;
}

.info-card-header {
  margin-bottom: 0.2rem;
}

.info-title {
  font-size: 0.68rem;
  font-weight: 800;
  color: #fde68a;
  margin: 0;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  text-shadow: 0 1px 8px rgba(200, 100, 0, 0.4);
}

.info-content {
  font-size: 0.74rem;
  color: rgba(255, 250, 230, 0.92);
  line-height: 1.48;
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

@keyframes tipFadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes inputGlow {
  0%,
  100% {
    box-shadow:
      0 0 0 3px rgba(74, 222, 128, 0.22),
      0 0 16px rgba(52, 211, 153, 0.16);
  }
  50% {
    box-shadow:
      0 0 0 3px rgba(74, 222, 128, 0.48),
      0 0 30px rgba(52, 211, 153, 0.28);
  }
}

/* Dark mode — farm-green palette */
.signup-page:not(.light-theme) .signup-card::after {
  border: 1.5px solid rgba(74, 222, 128, 0.22) !important;
}

.signup-page:not(.light-theme) .form-header {
  padding-bottom: 0.55rem !important;
  margin-bottom: 0.55rem !important;
  border-bottom: 2px solid rgba(74, 222, 128, 0.28) !important;
}

.signup-page:not(.light-theme) .form-subtitle {
  color: rgba(187, 247, 208, 0.88) !important;
}

.signup-page:not(.light-theme) .registration-form .form-input,
.signup-page:not(.light-theme) .registration-form select.form-input,
.signup-page:not(.light-theme) .registration-form textarea.form-input {
  background: #0f2419 !important;
  color: #ecfdf5 !important;
  -webkit-text-fill-color: #ecfdf5 !important;
  border: 2px solid rgba(110, 231, 183, 0.45) !important;
  caret-color: #ecfdf5 !important;
}

.signup-page:not(.light-theme) .registration-form .form-input::placeholder {
  color: rgba(167, 243, 208, 0.5) !important;
  -webkit-text-fill-color: rgba(167, 243, 208, 0.5) !important;
}

.signup-page:not(.light-theme) .registration-form .form-input:focus,
.signup-page:not(.light-theme) .registration-form select.form-input:focus {
  border-color: rgba(134, 239, 172, 0.72) !important;
  background: #122b1e !important;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.2) !important;
  animation: none !important;
}

.signup-page:not(.light-theme) .registration-form .form-input:-webkit-autofill,
.signup-page:not(.light-theme) .registration-form .form-input:-webkit-autofill:hover,
.signup-page:not(.light-theme) .registration-form .form-input:-webkit-autofill:focus {
  -webkit-box-shadow: 0 0 0 1000px #0f2419 inset !important;
  box-shadow: 0 0 0 1000px #0f2419 inset !important;
  -webkit-text-fill-color: #ecfdf5 !important;
  border: 2px solid rgba(110, 231, 183, 0.45) !important;
}

.signup-page:not(.light-theme) .field-icon {
  color: rgba(134, 239, 172, 0.85) !important;
}

.signup-page:not(.light-theme) .registration-form .password-toggle,
.signup-page:not(.light-theme) .registration-form .password-toggle svg {
  color: rgba(187, 247, 208, 0.85) !important;
  stroke: currentColor !important;
}

.signup-page:not(.light-theme) .registration-form .password-toggle:hover,
.signup-page:not(.light-theme) .registration-form .password-toggle:hover svg {
  color: #ecfdf5 !important;
}

.signup-page:not(.light-theme) .form-hint {
  color: rgba(167, 243, 208, 0.62) !important;
}

.signup-page:not(.light-theme) .form-footer {
  border-top: 2px solid rgba(74, 222, 128, 0.32) !important;
}

.signup-page:not(.light-theme) .submit-btn {
  background: linear-gradient(128deg, #1a4d32 0%, #1f5c3a 42%, #247647 100%) !important;
  border-color: rgba(110, 231, 183, 0.5) !important;
  color: #f0fdf4 !important;
}

.signup-page:not(.light-theme) .submit-btn:hover:not(:disabled) {
  background: linear-gradient(128deg, #1f5c3a 0%, #247647 45%, #2d9160 100%) !important;
}

.signup-page:not(.light-theme) .submit-btn :is(span, svg, svg *) {
  color: #f0fdf4 !important;
  -webkit-text-fill-color: #f0fdf4 !important;
}

/* Light mode */
.signup-page.light-theme .signup-card {
  background: linear-gradient(155deg, #ffffff 0%, #f8fdf9 48%, #f0fdf4 100%) !important;
  border: 2.5px solid #14532d !important;
  box-shadow:
    0 20px 48px rgba(22, 101, 52, 0.14),
    0 4px 14px rgba(22, 101, 52, 0.08),
    inset 0 0 0 1px rgba(22, 101, 52, 0.12) !important;
}

.signup-page.light-theme .form-title,
.signup-page.light-theme .form-label {
  color: #052e16 !important;
}

.signup-page.light-theme .form-subtitle {
  color: #14532d !important;
  font-weight: 600 !important;
}

.signup-page.light-theme .registration-form .form-input,
.signup-page.light-theme .registration-form select.form-input {
  background: #ffffff !important;
  color: #000000 !important;
  border: 2.5px solid #166534 !important;
}

.signup-page.light-theme .registration-form .form-input:focus,
.signup-page.light-theme .registration-form select.form-input:focus {
  border-color: #14532d !important;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.28) !important;
  animation: none !important;
}

.signup-page.light-theme .submit-btn {
  background: linear-gradient(128deg, #ea580c 0%, #f59e0b 32%, #fbbf24 58%, #16a34a 100%) !important;
  border: 2.5px solid #14532d !important;
  color: #ffffff !important;
}

.signup-page.light-theme .link-btn {
  background: linear-gradient(128deg, #fef3c7 0%, #fde68a 48%, #bbf7d0 100%) !important;
  border: 2.5px solid #14532d !important;
  color: #14532d !important;
}

.signup-page.light-theme .form-footer {
  background: linear-gradient(140deg, #f0fdf4 0%, #dcfce7 52%, #ecfdf5 100%) !important;
  border-top: 2.5px solid #166534 !important;
}

.signup-page.light-theme .form-footer :is(.footer-text, p) {
  color: #052e16 !important;
}

@media (min-width: 920px) {
  .layout-shell {
    grid-template-columns: 1fr 1.4fr;
    align-items: center;
    column-gap: 1.8rem;
    padding: 4.35rem 1.5rem 1.1rem 2.5rem;
    min-height: 100dvh;
    height: 100dvh;
  }

  .tagline-panel {
    min-height: calc(100dvh - 5.6rem);
    align-items: center;
    padding: 0.8rem 1.2rem 0.8rem 0.7rem;
  }

  .identity-block {
    transform: translateY(16px);
  }

  .signup-card {
    width: min(100%, 760px);
    margin-top: 0;
    max-height: calc(100dvh - 5.4rem);
    padding: 0.94rem 1.02rem;
    transform: translateY(-14px);
  }
}

@media (min-width: 700px) and (max-width: 919px) {
  .signup-card {
    width: min(100%, 900px);
    height: auto;
    max-height: calc(100dvh - 0.9rem);
    padding: 0.72rem 0.82rem;
  }
}

@media (max-width: 900px) {
  .signup-card {
    width: min(100%, 560px);
    height: auto;
    max-height: calc(100dvh - 1rem);
    overflow-y: auto;
    display: block;
    padding: 1rem;
  }

  .registration-form {
    display: flex;
    flex-direction: column;
    gap: 0.68rem;
    overflow: visible;
    padding-right: 0;
  }

  .form-row {
    display: flex;
    gap: 0.8rem;
  }

  .form-actions {
    grid-column: auto;
    justify-content: center;
  }

  .info-card {
    display: block;
  }
}

@media (max-width: 420px) {
  .page-top-controls {
    top: 0.48rem;
    right: 0.48rem;
    gap: 0.35rem;
  }

  .layout-shell {
    padding: 4rem 0.45rem 0.45rem;
    gap: 0.5rem;
  }

  .signup-card {
    border-radius: 20px;
    padding: 0.85rem 0.9rem;
    max-height: calc(100dvh - 0.9rem);
  }

  .tagline-panel {
    min-height: 150px;
    padding: 0.8rem 0.2rem;
  }

  .identity-title {
    font-size: 2.35rem;
    line-height: 0.96;
  }

  .identity-caption {
    font-size: 0.84rem;
  }

  .identity-badge {
    font-size: 0.68rem;
    letter-spacing: 0.1em;
  }

  .identity-block {
    padding-left: 0.95rem;
  }

  .form-title {
    font-size: 1.12rem;
  }

  .form-input {
    font-size: 0.8rem;
    padding: 0.54rem 2.4rem 0.54rem 0.64rem;
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
