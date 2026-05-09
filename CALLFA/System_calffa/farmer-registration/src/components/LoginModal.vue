<template>
  <div v-if="showModal" class="modal-overlay animate-fade-in">
    <div class="modal-shell">
      <div class="modal-header">
        <h2 class="modal-title">🚜 Farmer Login</h2>
        <button @click="closeModal" class="modal-close">&times;</button>
      </div>
      <div v-if="errorMessage" class="error-banner">
        {{ errorMessage }}
      </div>
      <form @submit.prevent="submitLogin" class="login-form">
        <div class="field-group">
          <label class="field-label">
            <span class="label-icon">🆔</span> Reference Number
          </label>
          <input
            v-model="form.referenceNumber"
            @input="handleReferenceInput"
            minlength="19"
            maxlength="19"
            pattern="\d{2}-\d{2}-\d{2}-\d{3}-\d{6}"
            inputmode="numeric"
            required
            class="field-input"
          />
        </div>
        <div class="field-group">
          <label class="field-label">
            <span class="label-icon">🔑</span> Password
          </label>
          <input type="password" v-model="form.password" required class="field-input" />
        </div>
        <button type="submit" class="login-btn">
          🌾 Login
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const showModal = ref(false)
const errorMessage = ref('')
const form = ref({
  referenceNumber: '',
  password: ''
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
  form.value.referenceNumber = formatReferenceNumberInput(form.value.referenceNumber)
}

const openModal = () => {
  showModal.value = true
  errorMessage.value = ''
}

const closeModal = () => {
  showModal.value = false
  form.value = { referenceNumber: '', password: '' }
  errorMessage.value = ''
}

const submitLogin = async () => {
  errorMessage.value = ''
  
  if (!form.value.referenceNumber || !form.value.password) {
    errorMessage.value = 'Please fill in all fields'
    return
  }
  if (!REFERENCE_FORMAT_REGEX.test(form.value.referenceNumber)) {
    errorMessage.value = 'Reference number must follow 00-00-00-000-000000 format'
    return
  }

  const result = await authStore.login(form.value.referenceNumber, form.value.password)
  
  if (result.success) {
    closeModal()
    router.push('/welcome')
  } else {
    errorMessage.value = result.error || 'Login failed. Please try again.'
  }
}

// Expose methods for parent component
defineExpose({ openModal, closeModal })
</script>

<style scoped>
@keyframes fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
.animate-fade-in {
  animation: fade-in 0.3s ease-out;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(2, 8, 6, 0.62);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
  padding: 16px;
}

.modal-shell {
  width: 100%;
  max-width: 430px;
  border-radius: 20px;
  padding: 26px;
  background: linear-gradient(155deg, rgba(250, 255, 252, 0.97), rgba(238, 249, 243, 0.95));
  border: 1px solid rgba(74, 161, 112, 0.24);
  box-shadow:
    0 22px 55px rgba(0, 0, 0, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.72);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 18px;
}

.modal-title {
  font-size: 25px;
  font-weight: 800;
  color: #166534;
}

.modal-close {
  font-size: 24px;
  color: #4b5563;
  background: transparent;
  border: none;
  cursor: pointer;
  line-height: 1;
}

.modal-close:hover {
  color: #111827;
}

.error-banner {
  margin-bottom: 14px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(220, 38, 38, 0.25);
  background: rgba(254, 226, 226, 0.95);
  color: #991b1b;
  font-size: 13px;
  font-weight: 600;
}

.login-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.field-group {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-label {
  display: flex;
  align-items: center;
  font-size: 13px;
  font-weight: 700;
  color: #166534;
}

.label-icon {
  margin-right: 6px;
}

.field-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid rgba(34, 197, 94, 0.28);
  border-radius: 10px;
  font-size: 14px;
  background: rgba(255, 255, 255, 0.9);
  color: #1f2937;
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.05);
  transition: all 0.2s ease;
}

.field-input:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.login-btn {
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid rgba(22, 163, 74, 0.4);
  background: linear-gradient(135deg, #16a34a 0%, #84cc16 100%);
  color: #ffffff;
  font-size: 15px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 8px 18px rgba(22, 163, 74, 0.28);
  transition: all 0.2s ease;
}

.login-btn:hover {
  transform: translateY(-1px) scale(1.01);
  box-shadow: 0 10px 20px rgba(22, 163, 74, 0.34);
}
</style>
