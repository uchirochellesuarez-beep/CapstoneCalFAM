<template>
  <div class="signup-page">
    <!-- Header is handled by App.vue -->
    
    <!-- Main Content -->
    <div class="signup-container">
      <!-- Title with Icon -->
      <div class="signup-header">
        <div class="title-icon">🌾</div>
        <h1 class="signup-title">Farmer Registration</h1>
      </div>

      <!-- Registration Form -->
      <form @submit.prevent="register" class="registration-form">
        <!-- Full Name -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Full Name</label>
            <input
              v-model="form.full_name"
              type="text"
              required
              class="form-input"
              placeholder="Enter your full name"
            />
          </div>
        </div>

        <!-- Date of Birth -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Date of Birth</label>
            <div class="date-input-wrapper">
              <input
                v-model="form.date_of_birth"
                type="date"
                required
                class="form-input date-input"
                :max="getMaxDateOfBirth()"
              />
              <span class="date-icon">📅</span>
            </div>
          </div>
        </div>

        <!-- Address -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Barangay</label>
            <select
              v-model="form.address"
              required
              class="form-input"
            >
              <option value="" disabled>Select your barangay</option>
              <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.name">
                {{ barangay.name }}
              </option>
            </select>
          </div>
        </div>

        <!-- Phone Number -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Phone Number</label>
            <input
              v-model="form.phone_number"
              type="tel"
              required
              class="form-input"
              placeholder="Enter your phone number"
              maxlength="11"
              @input="form.phone_number = form.phone_number.replace(/\D/g, '').slice(0, 11)"
            />
          </div>
        </div>

        <!-- Educational Status -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Educational Status</label>
            <select
              v-model="form.educational_status"
              required
              class="form-input"
            >
              <option value="">Select educational attainment</option>
              <option value="No Formal Education">No Formal Education</option>
              <option value="Elementary Level">Elementary Level</option>
              <option value="Elementary Graduate">Elementary Graduate</option>
              <option value="High School Level">High School Level</option>
              <option value="High School Graduate">High School Graduate</option>
              <option value="Vocational">Vocational</option>
              <option value="College Level">College Level</option>
              <option value="College Graduate">College Graduate</option>
              <option value="Post Graduate">Post Graduate</option>
            </select>
            <p class="form-hint">Select your highest educational attainment</p>
          </div>
        </div>

        <!-- Role Selection -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Account Type / Role</label>
            <select v-model="form.role" required class="form-input">
              <option value="farmer">👨‍🌾 Farmer</option>
              <option value="president">👔 President</option>
              <option value="treasurer">💰 Treasurer</option>
              <option value="auditor">📊 Auditor</option>
              <option value="operator">⚙️ Operator</option>
              <option value="operation_manager">🛠️ Operation Manager</option>
              <option value="business_manager">💼 Business Manager</option>
              <option value="agriculturist">🌱 Agriculturist</option>
            </select>
            <p class="form-hint">Select your role in the cooperative</p>
          </div>
        </div>

        <!-- Reference Number -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Reference Number</label>
            <input
              v-model="form.reference_number"
              type="text"
              required
              class="form-input"
              placeholder="Enter reference ID"
            />
          </div>
        </div>

        <!-- Password -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Password</label>
            <div class="password-input-wrapper">
              <input
                v-model="form.password"
                :type="showPassword ? 'text' : 'password'"
                required
                class="form-input"
                placeholder="Enter your password"
                @input="validatePasswordInput"
              />
              <button 
                type="button"
                @click="showPassword = !showPassword"
                class="password-toggle"
              >
                <svg v-if="showPassword" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
            <span v-if="passwordError" class="form-error">{{ passwordError }}</span>
          </div>
        </div>

        <!-- Confirm Password -->
        <div class="form-row">
          <div class="form-group">
            <label class="form-label">Confirm Password</label>
            <div class="password-input-wrapper">
              <input
                v-model="form.confirmPassword"
                :type="showConfirmPassword ? 'text' : 'password'"
                required
                class="form-input"
                placeholder="Confirm your password"
              />
              <button 
                type="button"
                @click="showConfirmPassword = !showConfirmPassword"
                class="password-toggle"
              >
                <svg v-if="showConfirmPassword" viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                <svg v-else viewBox="0 0 24 24" width="1.2em" height="1.2em" fill="none" stroke="currentColor" stroke-width="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
              </button>
            </div>
          </div>
        </div>

        <!-- Submit Button -->
        <div class="form-actions">
          <button
            type="submit"
            :disabled="loading"
            class="submit-button"
          >
            {{ loading ? 'Registering...' : 'Create Account' }}
          </button>
        </div>
      </form>

      <!-- Login Link -->
      <div class="login-prompt">
        <p class="login-text">Already have an account?</p>
        <router-link to="/login" class="login-link">Login here</router-link>
      </div>

      <!-- Error Message -->
      <div v-if="error" class="error-message">
        {{ error }}
      </div>

      <!-- Success Message -->
      <div v-if="success" class="success-message">
        Registration successful! Please login with your credentials.
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

const form = ref({
  role: 'farmer',
  full_name: '',
  date_of_birth: '',
  address: '',
  phone_number: '',
  educational_status: '',
  reference_number: '',
  password: '',
  confirmPassword: ''
})

// Hardcoded barangays - only Camansihan and Managpi
const barangays = ref([
  {
    id: 1,
    name: "Camansihan",
    description: "Primary operational barangay with active transactions"
  },
  {
    id: 2,
    name: "Managpi",
    description: "Sample barangay for demonstration"
  }
])

const loading = ref(false)
const error = ref('')
const success = ref(false)
const passwordError = ref('')
const showPassword = ref(false)
const showConfirmPassword = ref(false)

// Get max date for birth date (18 years ago)
const getMaxDateOfBirth = () => {
  const today = new Date()
  const maxDate = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate())
  return maxDate.toISOString().split('T')[0]
}

// No need to fetch barangays - they are hardcoded
onMounted(() => {
  // Barangays are already hardcoded in the component
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
    error.value = 'Date of birth is required'
    return false
  }
  const age = calculateAge(form.value.date_of_birth)
  if (age < 18) {
    error.value = `You must be at least 18 years old to register. You are currently ${age} years old.`
    return false
  }
  return true
}

const validatePhoneNumber = () => {
  const phoneNumber = form.value.phone_number.replace(/\D/g, '')
  if (phoneNumber.length !== 11) {
    error.value = `Phone number must be exactly 11 digits. You entered ${phoneNumber.length} digits.`
    return false
  }
  return true
}

const validatePassword = () => {
  const password = form.value.password
  
  if (password.length < 8) {
    error.value = 'Password must be at least 8 characters long'
    return false
  }
  
  const hasLetters = /[a-zA-Z]/.test(password)
  const hasNumbers = /[0-9]/.test(password)
  
  if (!hasLetters || !hasNumbers) {
    error.value = 'Password must contain both letters and numbers'
    return false
  }
  
  return true
}

// Real-time password validation with specific messages
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
    passwordError.value = `${8 - length} more character(s) needed`
    return
  }
  
  if (!hasLetters && hasNumbers) {
    passwordError.value = 'Add letters (A-Z or a-z)'
    return
  }
  
  if (hasLetters && !hasNumbers) {
    passwordError.value = 'Add numbers (0-9)'
    return
  }
  
  passwordError.value = ''
}

const register = async () => {
  // Validate age (18 years or older)
  if (!validateAge()) {
    return
  }

  // Validate phone number
  if (!validatePhoneNumber()) {
    return
  }

  // Validate password
  if (!validatePassword()) {
    return
  }

  // Validate passwords match
  if (form.value.password !== form.value.confirmPassword) {
    error.value = 'Passwords do not match'
    return
  }

  loading.value = true
  error.value = ''
  success.value = false

  try {
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
        role: form.value.role
      })
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Registration failed' }))
      throw new Error(errorData.message || 'Registration failed')
    }

    const data = await response.json()

    success.value = true
    form.value = {
      role: 'farmer',
      full_name: '',
      date_of_birth: '',
      address: '',
      phone_number: '',
      educational_status: '',
      reference_number: '',
      password: '',
      confirmPassword: ''
    }

    // Show success message for 3 seconds before redirecting
    setTimeout(() => {
      router.push('/login')
    }, 3000)
  } catch (err) {
    error.value = err.message || 'An error occurred during registration'
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.signup-page {
  min-height: calc(100vh - 128px);
  background: #f5f5dc;
  background-image: 
    repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,.03) 2px, rgba(0,0,0,.03) 4px);
  padding: 40px 20px;
}

.signup-container {
  max-width: 800px;
  margin: 0 auto;
  background: white;
  border-radius: 8px;
  padding: 40px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.signup-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 32px;
  padding-bottom: 20px;
  border-bottom: 2px solid #e5e7eb;
}

.title-icon {
  font-size: 32px;
}

.signup-title {
  font-size: 28px;
  font-weight: 700;
  color: #166534;
  margin: 0;
}

.registration-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.form-row {
  display: flex;
  gap: 20px;
}

.form-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.form-label {
  font-size: 14px;
  font-weight: 600;
  color: #166534;
  margin-bottom: 4px;
}

.required {
  color: #ef4444;
}

.form-input {
  padding: 10px 40px 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 4px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
  background: white;
  color: #111827;
}

.form-input:focus {
  outline: none;
  border-color: #166534;
  box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.1);
}

.form-error {
  font-size: 0.75rem;
  color: #991b1b;
  font-weight: 500;
  margin-top: 0.25rem;
}

.password-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.password-input-wrapper input:focus {
  border-color: #166534;
  box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.1);
}

.password-toggle {
  position: absolute;
  right: 0.5rem;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  outline: none;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  margin: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: color 0.2s, transform 0.2s;
  -webkit-appearance: none;
  appearance: none;
  box-shadow: none !important;
  border: none !important;
  outline: none !important;
}

.password-toggle:hover {
  color: #111827;
  transform: translateY(-50%) scale(1.2);
  outline: none;
  border: none;
  box-shadow: none;
}

.password-toggle:focus {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
  -webkit-focus-ring-color: transparent;
}

.password-toggle:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

.date-input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.date-input {
  flex: 1;
  padding-right: 40px;
}

.date-icon {
  position: absolute;
  right: 12px;
  font-size: 18px;
  pointer-events: none;
  color: #6b7280;
}

.form-hint {
  font-size: 12px;
  color: #6b7280;
  margin-top: 4px;
  font-style: italic;
}

.form-actions {
  display: flex;
  justify-content: center;
  margin-top: 8px;
}

.submit-button {
  padding: 12px 32px;
  background: white;
  color: #166534;
  border: 2px solid #166534;
  border-radius: 4px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 200px;
}

.submit-button:hover:not(:disabled) {
  background: #166534;
  color: white;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.login-prompt {
  text-align: center;
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}

.login-text {
  font-size: 14px;
  color: #6b7280;
  margin-bottom: 8px;
}

.login-link {
  color: #9333ea;
  text-decoration: none;
  font-weight: 600;
  transition: color 0.2s;
}

.login-link:hover {
  color: #7c3aed;
  text-decoration: underline;
}

.error-message {
  margin-top: 20px;
  padding: 12px 16px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 6px;
  color: #991b1b;
  font-size: 14px;
}

.success-message {
  margin-top: 20px;
  padding: 12px 16px;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 6px;
  color: #166534;
  font-size: 14px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .signup-container {
    padding: 24px;
  }

  .form-row {
    flex-direction: column;
    gap: 20px;
  }

  .signup-title {
    font-size: 24px;
  }
}
</style>
