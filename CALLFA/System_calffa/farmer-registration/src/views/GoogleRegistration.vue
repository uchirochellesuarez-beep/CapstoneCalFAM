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
                  ? 'Kumpletuhin ang inyong profile upang matapos ang Google registration.'
                  : 'Complete your profile to finish Google registration.'
              }}
            </p>
          </div>
        </div>
      </section>

      <section class="form-side" aria-label="Google registration form">
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
                <h2 class="form-title">{{ ui.title }}</h2>
                <p v-if="formData.email" class="google-email-caption">{{ formData.email }}</p>
              </div>
            </div>

            <div v-if="successMessage" class="message success-message">{{ successMessage }}</div>
            <div v-if="errorMessage" class="message error-message">{{ errorMessage }}</div>

            <form @submit.prevent="submitRegistration" class="registration-form">
              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ ui.fullName }}</label>
                  <input v-model="formData.full_name" type="text" required class="form-input" />
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
                      v-model="formData.reference_number"
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
                  <span v-if="errors.reference_number" class="form-error">{{ errors.reference_number }}</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ ui.birthDate }}</label>
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
                  <label class="form-label">{{ ui.phoneNumber }}</label>
                  <input
                    v-model="formData.phone_number"
                    type="tel"
                    required
                    class="form-input"
                    :placeholder="ui.phonePlaceholder"
                    maxlength="11"
                    @input="formData.phone_number = formData.phone_number.replace(/\D/g, '').slice(0, 11)"
                    @blur="validatePhoneNumber"
                  />
                  <span v-if="errors.phone_number" class="form-error">{{ errors.phone_number }}</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group">
                  <label class="form-label">{{ ui.barangay }}</label>
                  <select
                    v-model="formData.barangay_id"
                    required
                    class="form-input"
                    :disabled="barangaysLoading"
                    @change="onBarangayChange"
                  >
                    <option value="" disabled>
                      {{ barangaysLoading ? (language === 'tl' ? 'Naglo-load...' : 'Loading...') : ui.selectBarangay }}
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
                  <label class="form-label">{{ ui.education }}</label>
                  <select v-model="formData.educational_status" required class="form-input">
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
                <div class="form-group">
                  <label class="form-label">{{ ui.landArea }}</label>
                  <TypedNumberInput
                    v-model="formData.land_area"
                    :min="0.01"
                    :placeholder="ui.landAreaPlaceholder"
                    @blur="validateLandArea"
                  />
                  <span v-if="errors.land_area" class="form-error">{{ errors.land_area }}</span>
                </div>
              </div>

              <div class="form-row">
                <div class="form-group form-group-full">
                  <label class="form-label">{{ ui.address }}</label>
                  <input
                    v-model="formData.address"
                    type="text"
                    required
                    class="form-input"
                    :placeholder="ui.addressPlaceholder"
                  />
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
                      v-model="formData.password"
                      :type="showPassword ? 'text' : 'password'"
                      required
                      class="form-input"
                      autocomplete="new-password"
                      :placeholder="ui.passwordPlaceholder"
                      @blur="validatePassword"
                    />
                    <button
                      type="button"
                      @click="showPassword = !showPassword"
                      class="password-toggle"
                      :aria-label="showPassword ? ui.hidePassword : ui.showPassword"
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
                  <label class="form-label">{{ ui.confirmPassword }}</label>
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
                      :placeholder="ui.confirmPasswordPlaceholder"
                      @blur="validateConfirmPassword"
                    />
                    <button
                      type="button"
                      @click="showConfirmPassword = !showConfirmPassword"
                      class="password-toggle"
                      :aria-label="showConfirmPassword ? ui.hidePassword : ui.showPassword"
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
                <RegistrationLegalNotice v-model:agreed="agreedToTerms" :language="language" />
              </div>

              <div class="form-row form-row-actions">
                <button type="submit" :disabled="isSubmitting" class="submit-btn">
                  {{ isSubmitting ? ui.submitting : ui.submit }}
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
import { reactive, ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import ThemeToggle from '../components/ThemeToggle.vue'
import RegistrationLegalNotice from '../components/RegistrationLegalNotice.vue'
import TypedNumberInput from '../components/TypedNumberInput.vue'

const router = useRouter()
const route = useRoute()
const language = ref('en')

const labels = {
  en: {
    title: 'Complete Your Profile',
    fullName: 'Full Name',
    referenceNumber: 'Reference Number',
    referencePlaceholder: '00-00-00-000-000000',
    birthDate: 'Date of Birth',
    phoneNumber: 'Phone Number',
    phonePlaceholder: '09XXXXXXXXX',
    barangay: 'Barangay',
    selectBarangay: 'Select your barangay',
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
    landArea: 'Farm Area (hectares)',
    landAreaPlaceholder: 'e.g. 1.25',
    address: 'Home Address',
    addressPlaceholder: 'Complete home address',
    password: 'Password',
    passwordPlaceholder: 'At least 8 characters',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter password',
    showPassword: 'Show password',
    hidePassword: 'Hide password',
    submit: 'Complete Registration',
    submitting: 'Submitting...',
    alreadyHaveAccount: 'Already have an account?',
    signIn: 'Sign In'
  },
  tl: {
    title: 'Kumpletuhin ang Profile',
    fullName: 'Buong Pangalan',
    referenceNumber: 'Reference Number',
    referencePlaceholder: '00-00-00-000-000000',
    birthDate: 'Petsa ng Kapanganakan',
    phoneNumber: 'Numero ng Telepono',
    phonePlaceholder: '09XXXXXXXXX',
    barangay: 'Barangay',
    selectBarangay: 'Piliin ang iyong barangay',
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
    landArea: 'Lawak ng Sakahan (ektarya)',
    landAreaPlaceholder: 'hal. 1.25',
    address: 'Tirahan',
    addressPlaceholder: 'Kumpletong address',
    password: 'Password',
    passwordPlaceholder: 'Hindi bababa sa 8 character',
    confirmPassword: 'Kumpirmahin ang Password',
    confirmPasswordPlaceholder: 'Ulitin ang password',
    showPassword: 'Ipakita ang password',
    hidePassword: 'Itago ang password',
    submit: 'Tapusin ang Pagrehistro',
    submitting: 'Nagsusumite...',
    alreadyHaveAccount: 'Mayroon nang account?',
    signIn: 'Mag-login'
  }
}

const ui = computed(() => labels[language.value])

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
    : (language.value === 'tl'
      ? 'Ang reference number ay dapat sumunod sa format na 00-00-00-000-000000.'
      : 'Reference number must follow 00-00-00-000-000000 format.')
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
    errorMessage.value = language.value === 'tl'
      ? 'Hindi ma-load ang listahan ng barangay.'
      : 'Could not load barangay list.'
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
    errors.phone_number = language.value === 'tl'
      ? `Dapat eksaktong 11 digit ang numero (nakapasok: ${phoneDigitsOnly.length}).`
      : `Phone number must be exactly 11 digits (you entered ${phoneDigitsOnly.length}).`
  } else {
    errors.phone_number = ''
  }
}

const validateLandArea = () => {
  const area = parseFloat(formData.land_area)
  if (formData.land_area && (Number.isNaN(area) || area <= 0)) {
    errors.land_area = language.value === 'tl'
      ? 'Ang lawak ng sakahan ay dapat positibong numero.'
      : 'Land area must be a positive number.'
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
    errors.password = language.value === 'tl'
      ? 'Ang password ay dapat hindi bababa sa 8 character.'
      : 'Password must be at least 8 characters long.'
    return
  }

  const hasLetters = /[a-zA-Z]/.test(pwd)
  const hasNumbers = /[0-9]/.test(pwd)

  if (!hasLetters || !hasNumbers) {
    errors.password = language.value === 'tl'
      ? 'Ang password ay dapat may letra at numero.'
      : 'Password must contain both letters and numbers.'
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
    errors.confirm_password = language.value === 'tl'
      ? 'Hindi magkatugma ang password.'
      : 'Passwords do not match.'
  }
}

const validateForm = () => {
  let isValid = true

  if (!REFERENCE_FORMAT_REGEX.test(formData.reference_number || '')) {
    errors.reference_number = language.value === 'tl'
      ? 'Ang reference number ay dapat sumunod sa format na 00-00-00-000-000000.'
      : 'Reference number must follow 00-00-00-000-000000 format.'
    isValid = false
  } else {
    errors.reference_number = ''
  }

  validatePhoneNumber()
  if (errors.phone_number) isValid = false

  validateLandArea()
  if (errors.land_area) isValid = false

  if (!formData.barangay_id) {
    errors.barangay_id = language.value === 'tl' ? 'Kinakailangan ang barangay.' : 'Barangay is required.'
    isValid = false
  }

  validatePassword()
  if (errors.password) isValid = false

  validateConfirmPassword()
  if (errors.confirm_password) isValid = false

  if (!formData.password) {
    errors.password = language.value === 'tl' ? 'Kinakailangan ang password.' : 'Password is required.'
    isValid = false
  }

  if (!formData.confirm_password) {
    errors.confirm_password = language.value === 'tl' ? 'Kumpirmahin ang password.' : 'Please confirm your password.'
    isValid = false
  }

  return isValid
}

const submitRegistration = async () => {
  if (!agreedToTerms.value) {
    errorMessage.value = language.value === 'tl'
      ? 'Dapat sumang-ayon sa mga tuntunin at data privacy policy bago magrehistro.'
      : 'You must agree to the terms and conditions and data privacy policy before registering.'
    return
  }

  if (!validateForm()) {
    errorMessage.value = language.value === 'tl'
      ? 'Pakitama ang mga error sa form.'
      : 'Please fix the errors above.'
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
      throw new Error(language.value === 'tl'
        ? 'Nabigo ang token verification. Subukang mag-register muli.'
        : 'Token verification failed. Please try registering again.')
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

    successMessage.value = language.value === 'tl'
      ? 'Matagumpay ang pagrehistro! Papunta sa login...'
      : 'Registration successful! Redirecting to login...'

    setTimeout(() => {
      router.push('/login')
    }, 2000)
  } catch (error) {
    errorMessage.value = error.message || (language.value === 'tl'
      ? 'Nabigo ang pagrehistro. Subukang muli.'
      : 'Registration failed. Please try again.')
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
