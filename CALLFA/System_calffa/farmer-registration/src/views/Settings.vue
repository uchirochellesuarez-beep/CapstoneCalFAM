<template>
  <div class="edit-profile-page glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="profile-page-inner">
      <header class="profile-page-header">
        <h1 class="profile-page-title">{{ t('settings.title') }}</h1>
        <p class="profile-page-subtitle">{{ t('settings.subtitle') }}</p>
      </header>

      <div class="profile-card">
        <div class="profile-identity">
          <div class="profile-avatar-section">
            <div class="avatar-wrapper">
              <img
                v-if="profilePictureUrl"
                :src="profilePictureUrl"
                :alt="$t('ui.profile')"
                class="avatar-img"
              />
              <span v-else class="avatar-placeholder">{{ userInitials }}</span>
              <label class="avatar-upload-btn" :title="t('settings.changePhoto')" :aria-label="t('settings.changePhotoAria')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke-linecap="round" stroke-linejoin="round" />
                  <circle cx="12" cy="13" r="4" />
                </svg>
                <input
                  type="file"
                  ref="profilePictureInput"
                  @change="handleProfilePictureChange"
                  accept="image/jpeg,image/png,image/gif"
                  class="hidden"
                />
              </label>
            </div>
            <p v-if="uploadMessage" class="upload-msg" :class="uploadMessageType">{{ uploadMessage }}</p>
          </div>
          <div class="profile-identity-text">
            <h2 class="profile-name">{{ profile.full_name || t('settings.yourName') }}</h2>
            <p class="profile-ref">{{ profile.reference_number || t('settings.noReference') }}</p>
            <p class="profile-barangay">
              {{ profile.barangay_name || profile.address || t('settings.noBarangay') }}
            </p>
          </div>
        </div>

        <form @submit.prevent="saveProfile" class="profile-form">
        <div class="form-grid">
          <div class="form-group">
            <label>{{ t('settings.fullName') }}</label>
            <input
              type="text"
              v-model="profile.full_name"
              required
              :placeholder="t('settings.fullNamePlaceholder')"
            />
          </div>
          <div class="form-group">
            <label>{{ t('settings.phoneNumber') }}</label>
            <input
              type="tel"
              v-model="profile.phone_number"
              :placeholder="t('settings.phonePlaceholder')"
            />
          </div>
          <div class="form-group">
            <label>{{ t('settings.education') }}</label>
            <select v-model="profile.educational_status">
              <option value="" disabled>{{ t('settings.selectEducation') }}</option>
              <option value="Elementary">{{ t('settings.elementary') }}</option>
              <option value="High School">{{ t('settings.highSchool') }}</option>
              <option value="Senior High School">{{ t('settings.seniorHigh') }}</option>
              <option value="Vocational">{{ t('settings.vocational') }}</option>
              <option value="College">{{ t('settings.college') }}</option>
              <option value="Post Graduate">{{ t('settings.postGraduate') }}</option>
              <option value="None">{{ t('settings.none') }}</option>
            </select>
          </div>
          <div class="form-group">
            <label>{{ t('settings.address') }}</label>
            <input
              type="text"
              v-model="profile.address"
              :placeholder="t('settings.addressPlaceholder')"
            />
          </div>
          <div class="form-group form-group--full">
            <label>{{ t('settings.referenceNumber') }}</label>
            <input
              type="text"
              inputmode="numeric"
              autocomplete="off"
              :value="profile.reference_number"
              placeholder="00-00-00-000-000000"
              maxlength="19"
              @input="onReferenceInput"
            />
          </div>
        </div>

        <div class="readonly-section">
          <div class="readonly-field readonly-field--full">
            <label>{{ t('settings.barangay') }}</label>
            <span>{{ profile.barangay_name || profile.address || '—' }}</span>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="save-btn" :disabled="saving">
            <span v-if="saving">{{ t('common.saving') }}</span>
            <span v-else>{{ t('common.save') }}</span>
          </button>
        </div>
        <p v-if="message" class="form-message" :class="messageType">{{ message }}</p>
      </form>
      </div>

      <section class="settings-card google-card" aria-labelledby="google-settings-title">
        <div class="settings-card-copy">
          <h2 id="google-settings-title" class="settings-card-title">{{ t('settings.googleAccount') }}</h2>
          <p v-if="!googleLinked" class="settings-card-hint">{{ t('settings.googleNotConnected') }}</p>
          <div v-else class="google-connected">
            <span class="google-connected-label">{{ t('settings.googleConnectedLabel') }}</span>
            <strong class="google-connected-email">{{ googleEmail || t('settings.googleConnectedUnknown') }}</strong>
            <p v-if="!googleEmail" class="settings-card-hint">{{ t('settings.googleEmailHint') }}</p>
          </div>
        </div>
        <GoogleSignInButton
          class="settings-google-btn"
          mode="connect"
          :linked="googleLinked"
          :connected-email="googleEmail"
          @connected="onGoogleConnected"
        />
      </section>

      <button type="button" class="settings-logout-btn" @click="showLogoutConfirm = true">
        {{ t('common.logout') }}
      </button>
    </div>

    <Teleport to="body">
      <div
        v-if="showLogoutConfirm"
        class="logout-modal-overlay"
        :class="{ 'light-theme': isLight }"
        @click="showLogoutConfirm = false"
      >
        <div
          class="logout-modal"
          :class="{ 'light-theme': isLight }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="logout-modal-title"
          @click.stop
        >
          <div class="logout-modal-header">
            <h3 id="logout-modal-title" class="logout-modal-title">{{ t('header.confirmLogout') }}</h3>
            <button
              type="button"
              class="logout-modal-close"
              :aria-label="t('common.close')"
              @click="showLogoutConfirm = false"
            >
              &times;
            </button>
          </div>
          <div class="logout-modal-body">
            <p class="logout-modal-message">{{ t('header.logoutMessage') }}</p>
            <p class="logout-modal-hint">{{ t('header.logoutHint') }}</p>
          </div>
          <div class="logout-modal-footer">
            <button type="button" class="logout-btn-cancel" @click="showLogoutConfirm = false">{{ t('header.stay') }}</button>
            <button type="button" class="logout-btn-confirm" @click="confirmLogout">{{ t('header.yesLogout') }}</button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import GoogleSignInButton from '../components/GoogleSignInButton.vue'

const router = useRouter()
const authStore = useAuthStore()
const { t } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const REFERENCE_FORMAT_REGEX = /^\d{2}-\d{2}-\d{2}-\d{3}-\d{6}$/

function formatReferenceNumberInput(value = '') {
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

function onReferenceInput(event) {
  profile.value.reference_number = formatReferenceNumberInput(event.target.value)
}

const userInitials = computed(() => {
  const name = profile.value.full_name || ''
  const parts = name.trim().split(/\s+/)
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
  }
  return name.substring(0, 2).toUpperCase()
})

// Profile state
const profile = ref({
  full_name: authStore.currentUser?.full_name || '',
  phone_number: authStore.currentUser?.phone_number || '',
  educational_status: authStore.currentUser?.educational_status || '',
  reference_number: authStore.currentUser?.reference_number || '',
  address: authStore.currentUser?.address || authStore.currentUser?.barangay_name || '',
  barangay_name: authStore.currentUser?.barangay_name || ''
})

const saving = ref(false)
const message = ref('')
const messageType = ref('')
function googleEmailCacheKey(userId) {
  return userId ? `calffa_google_email_${userId}` : ''
}

function readCachedGoogleEmail(user = authStore.currentUser) {
  const fromUser = typeof user?.email === 'string' ? user.email.trim() : ''
  if (fromUser.includes('@')) return fromUser
  try {
    const cached = localStorage.getItem(googleEmailCacheKey(user?.id)) || ''
    return cached.includes('@') ? cached : ''
  } catch {
    return ''
  }
}

function persistGoogleEmail(email, user = authStore.currentUser) {
  const nextEmail = typeof email === 'string' ? email.trim() : ''
  if (!nextEmail.includes('@')) return nextEmail
  try {
    const key = googleEmailCacheKey(user?.id)
    if (key) localStorage.setItem(key, nextEmail)
  } catch {
    /* ignore quota / private mode */
  }
  return nextEmail
}

const googleLinked = ref(Boolean(authStore.currentUser?.google_linked || authStore.currentUser?.google_id || authStore.currentUser?.email))
const googleEmail = ref(readCachedGoogleEmail(authStore.currentUser) || authStore.currentUser?.email || '')
const showLogoutConfirm = ref(false)

// Profile picture state
const profilePictureInput = ref(null)
const profilePictureFile = ref(null)
const uploadMessage = ref('')
const uploadMessageType = ref('')
const uploading = ref(false)

// Computed property for profile picture URL
const profilePictureUrl = computed(() => {
  if (profilePictureFile.value) {
    return URL.createObjectURL(profilePictureFile.value)
  }
  if (authStore.currentUser?.profile_picture) {
    const pictureUrl = authStore.currentUser.profile_picture
    // Check if it's already a full URL (Google profile pictures are https://)
    if (pictureUrl.startsWith('http://') || pictureUrl.startsWith('https://')) {
      return pictureUrl
    }
    // Relative path works via Vite proxy (localhost + phone on same Wi‑Fi)
    return `${pictureUrl}`
  }
  return null
})

const handleProfilePictureChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    uploadMessage.value = 'File size must be less than 10MB'
    uploadMessageType.value = 'text-red-600'
    return
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    uploadMessage.value = 'Only JPEG, PNG, and GIF images are allowed'
    uploadMessageType.value = 'text-red-600'
    return
  }

  profilePictureFile.value = file
  await uploadProfilePicture()
}

const uploadProfilePicture = async () => {
  if (!profilePictureFile.value) return

  uploading.value = true
  uploadMessage.value = 'Uploading...'
  uploadMessageType.value = 'text-blue-600'

  try {
    const userId = authStore.currentUser?.id
    if (!userId) {
      throw new Error('User ID not found')
    }

    const formData = new FormData()
    formData.append('profile_picture', profilePictureFile.value)

    const response = await fetch(`/api/farmers/${userId}/profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authStore.token || localStorage.getItem('token')}`
      },
      body: formData
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to upload profile picture')
    }

    // Update authStore with new profile picture
    authStore.currentUser.profile_picture = data.profile_picture
    localStorage.setItem('currentUser', JSON.stringify(authStore.currentUser))

    uploadMessage.value = 'Profile picture updated successfully!'
    uploadMessageType.value = 'text-green-600'

    // Clear message after 3 seconds
    setTimeout(() => {
      uploadMessage.value = ''
    }, 3000)
  } catch (error) {
    uploadMessage.value = error.message || 'Failed to upload profile picture'
    uploadMessageType.value = 'text-red-600'
    profilePictureFile.value = null
  } finally {
    uploading.value = false
  }
}

const saveProfile = async () => {
  saving.value = true
  message.value = ''
  try {
    const ref = String(profile.value.reference_number || '').trim()
    if (!REFERENCE_FORMAT_REGEX.test(ref)) {
      message.value = 'Ang reference number ay dapat sumunod sa format na 00-00-00-000-000000.'
      messageType.value = 'text-red-600'
      saving.value = false
      return
    }

    const userId = authStore.currentUser?.id
    if (!userId) {
      throw new Error('User ID not found')
    }

    const response = await fetch(`/api/farmers/${userId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token || localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        full_name: profile.value.full_name,
        phone_number: profile.value.phone_number,
        educational_status: profile.value.educational_status,
        address: profile.value.address,
        reference_number: ref
      })
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update profile')
    }

    // Update local authStore with the returned data
    const previousEmail = authStore.currentUser?.email
    authStore.currentUser = {
      ...authStore.currentUser,
      ...data.farmer,
      email: data.farmer?.email || previousEmail,
      google_linked: Boolean(data.farmer?.google_linked ?? authStore.currentUser?.google_linked)
    }
    localStorage.setItem('currentUser', JSON.stringify(authStore.currentUser))
    
    message.value = 'Profile updated successfully!'
    messageType.value = 'text-green-600'
    
    // Clear message after 3 seconds
    setTimeout(() => {
      message.value = ''
    }, 3000)
  } catch (error) {
    message.value = error.message || 'Failed to update profile.'
    messageType.value = 'text-red-600'
  } finally {
    saving.value = false
  }
}

const fetchUserProfile = async () => {
  try {
    const userId = authStore.currentUser?.id
    if (!userId) {
      console.warn('User ID not found, skipping profile fetch')
      return
    }

    const response = await fetch(`/api/farmers/${userId}/profile`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })

    if (!response.ok) {
      console.error('Failed to fetch profile:', response.statusText)
      return
    }

    const data = await response.json()
    
    if (data.success && data.farmer) {
      const farmer = data.farmer
      
      // Update profile with fresh data from server
      profile.value = {
        full_name: farmer.full_name || '',
        phone_number: farmer.phone_number || '',
        educational_status: farmer.educational_status || '',
        reference_number: farmer.reference_number || '',
        address: farmer.address || '',
        barangay_name: farmer.barangay_name || ''
      }
      
      // Update authStore with fresh data for future use
      const nextEmail = persistGoogleEmail(
        farmer.email || farmer.google_email || readCachedGoogleEmail(farmer) || googleEmail.value
      )
      authStore.currentUser = {
        ...authStore.currentUser,
        reference_number: farmer.reference_number,
        phone_number: farmer.phone_number,
        educational_status: farmer.educational_status,
        address: farmer.address,
        profile_picture: farmer.profile_picture,
        barangay_name: farmer.barangay_name,
        email: nextEmail || authStore.currentUser?.email || null,
        google_linked: Boolean(farmer.google_linked || nextEmail)
      }
      googleLinked.value = Boolean(farmer.google_linked || nextEmail)
      googleEmail.value = nextEmail || googleEmail.value
      localStorage.setItem('currentUser', JSON.stringify(authStore.currentUser))
    }
  } catch (error) {
    console.error('Error fetching user profile:', error)
  }
}

onMounted(async () => {
  if (!authStore.currentUser) {
    router.push('/login')
    return
  }
  
  // Fetch fresh profile data from server to ensure all fields are populated
  await fetchUserProfile()
})

const onGoogleConnected = ({ email }) => {
  const nextEmail = persistGoogleEmail(email || googleEmail.value)
  googleLinked.value = true
  googleEmail.value = nextEmail || googleEmail.value
  authStore.currentUser = {
    ...authStore.currentUser,
    email: googleEmail.value,
    google_linked: true
  }
  localStorage.setItem('currentUser', JSON.stringify(authStore.currentUser))
}

const confirmLogout = async () => {
  showLogoutConfirm.value = false
  await authStore.logout()
  router.push('/login')
}
</script>

<style scoped>
.edit-profile-page {
  padding: 0.85rem 1.1rem 1.25rem;
  max-width: 720px;
  margin: 0 auto;
  min-height: calc(100vh - 72px);
}

.profile-page-inner {
  display: flex;
  flex-direction: column;
  gap: 0.7rem;
}

.profile-page-header {
  padding: 0 0.15rem;
}

.profile-page-title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 800;
  color: #ecfdf5;
  line-height: 1.25;
}

.profile-page-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(220, 252, 231, 0.88);
}

.settings-card {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.85rem;
  padding: 1rem 1.1rem 1.05rem;
  border-radius: 18px;
  border: 1px solid rgba(167, 243, 208, 0.22);
  background: rgba(8, 24, 17, 0.78);
}

.settings-card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: -0.01em;
}

.settings-card-hint {
  margin: 0.28rem 0 0;
  font-size: 0.86rem;
  font-weight: 500;
  line-height: 1.45;
  color: rgba(226, 232, 240, 0.78);
  word-break: break-word;
}

.settings-google-btn {
  width: 100%;
}

.settings-google-btn :deep(.google-signin-container),
.settings-google-btn :deep(.google-signin-btn) {
  width: 100%;
}

.settings-google-btn :deep(.google-signin-btn) {
  min-height: 2.85rem !important;
  padding: 0.7rem 1.1rem !important;
  border-radius: 999px !important;
  border: none !important;
  background: #d5e0d8 !important;
  color: #1f2937 !important;
  -webkit-text-fill-color: #1f2937 !important;
  font-size: 0.95rem !important;
  font-weight: 600 !important;
  box-shadow: none !important;
  filter: none !important;
  transform: none !important;
}

.settings-google-btn :deep(.google-signin-btn:hover:not(.disabled)) {
  background: #e2ebe4 !important;
  border: none !important;
  box-shadow: none !important;
  transform: none !important;
  filter: none !important;
}

.settings-google-btn :deep(.google-btn-text) {
  color: #1f2937 !important;
  -webkit-text-fill-color: #1f2937 !important;
  font-weight: 600 !important;
}

.google-connected {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
  margin-top: 0.4rem;
}

.google-connected-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(226, 232, 240, 0.7);
}

.google-connected-email {
  font-size: 1rem;
  font-weight: 800;
  color: #ffffff;
  word-break: break-all;
  line-height: 1.35;
}

.settings-logout-btn {
  width: 100%;
  min-height: 2.85rem !important;
  padding: 0.7rem 1.1rem !important;
  border-radius: 999px !important;
  border: 1.5px solid rgba(252, 165, 165, 0.55) !important;
  background: #7f1d1d !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-size: 0.95rem !important;
  font-weight: 700 !important;
  cursor: pointer;
  box-shadow: none !important;
  filter: none !important;
  transform: none !important;
}

.settings-logout-btn:hover {
  background: #991b1b !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  transform: none !important;
  filter: none !important;
  box-shadow: none !important;
}

.edit-profile-page.light-theme .settings-card {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
}

.edit-profile-page.light-theme .settings-card-title {
  color: #052e16;
}

.edit-profile-page.light-theme .settings-card-hint {
  color: #4b5563;
}

.edit-profile-page.light-theme .settings-google-btn :deep(.google-signin-btn) {
  background: #e8eee9 !important;
}

.edit-profile-page.light-theme .google-connected-label {
  color: #6b7280;
}

.edit-profile-page.light-theme .google-connected-email {
  color: #052e16;
}

.edit-profile-page.light-theme .settings-logout-btn {
  background: #fff1f2 !important;
  color: #991b1b !important;
  -webkit-text-fill-color: #991b1b !important;
  border-color: #fda4af !important;
}

.edit-profile-page.light-theme .settings-logout-btn:hover {
  background: #ffe4e6 !important;
  color: #7f1d1d !important;
  -webkit-text-fill-color: #7f1d1d !important;
}

.logout-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 11050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(6, 16, 12, 0.55);
  backdrop-filter: blur(6px);
}

.logout-modal {
  width: min(100%, 420px);
  border-radius: 16px;
  background: #0f2419;
  border: 1px solid rgba(134, 239, 172, 0.28);
  box-shadow: 0 20px 48px rgba(4, 12, 8, 0.45);
  overflow: hidden;
}

.logout-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.9rem 1rem 0.7rem;
}

.logout-modal-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: #ecfdf5;
}

.logout-modal-close {
  width: 2rem;
  height: 2rem;
  min-width: 0;
  min-height: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #bbf7d0;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.logout-modal-body {
  padding: 0 1rem 0.85rem;
}

.logout-modal-message,
.logout-modal-hint {
  margin: 0;
  color: #dcfce7;
}

.logout-modal-hint {
  margin-top: 0.35rem;
  font-size: 0.82rem;
  color: rgba(220, 252, 231, 0.78);
}

.logout-modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.75rem 1rem 1rem;
}

.logout-btn-cancel,
.logout-btn-confirm {
  min-height: 2.4rem;
  padding: 0.45rem 0.9rem;
  border-radius: 10px;
  font-weight: 700;
  cursor: pointer;
}

.logout-btn-cancel {
  background: transparent;
  border: 1.5px solid rgba(134, 239, 172, 0.4);
  color: #ecfdf5;
}

.logout-btn-confirm {
  background: #7f1d1d;
  border: 1.5px solid #fca5a5;
  color: #fff;
}

.logout-modal.light-theme {
  background: #ffffff;
  border-color: #94a3b8;
}

.logout-modal.light-theme .logout-modal-title {
  color: #14532d;
}

.logout-modal.light-theme .logout-modal-close {
  color: #166534;
}

.logout-modal.light-theme .logout-modal-message {
  color: #052e16;
}

.logout-modal.light-theme .logout-modal-hint {
  color: #4b5563;
}

.logout-modal.light-theme .logout-btn-cancel {
  color: #14532d;
  border-color: #86efac;
  background: #f0fdf4;
}

.logout-modal.light-theme .logout-btn-confirm {
  background: #fff1f2;
  color: #991b1b;
  border-color: #fda4af;
}

.profile-card {
  background: linear-gradient(180deg, #ffffff 0%, #f8fdf9 100%);
  border-radius: 20px;
  box-shadow: 0 16px 36px rgba(4, 18, 12, 0.22);
  border: 2px solid #94a3b8;
  overflow: hidden;
  width: 100%;
}

.profile-identity {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.95rem 1.25rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-bottom: 2px solid #86efac;
}

.avatar-wrapper {
  position: relative;
  width: 72px;
  height: 72px;
  flex-shrink: 0;
}

.avatar-img {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #16a34a;
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.18);
}

.avatar-placeholder {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  border: 3px solid #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.45rem;
  font-weight: 800;
  color: #052e16;
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.18);
}

.avatar-upload-btn {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 30px;
  height: 30px;
  border-radius: 50%;
  background: #ffffff !important;
  border: 2px solid #16a34a !important;
  color: #15803d !important;
  -webkit-text-fill-color: #15803d !important;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.15);
  transition: transform 0.18s, box-shadow 0.2s, background 0.2s;
}

.avatar-upload-btn svg {
  width: 17px;
  height: 17px;
  color: #15803d !important;
  stroke: #15803d !important;
  -webkit-text-fill-color: #15803d !important;
}

.avatar-upload-btn:hover {
  transform: scale(1.08);
  background: #f0fdf4;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.18);
}

.avatar-upload-btn input {
  display: none;
}

.upload-msg {
  font-size: 0.8rem;
  margin-top: 0.35rem;
  font-weight: 700;
}

.profile-identity-text {
  flex: 1;
  min-width: 0;
}

.profile-identity-text .profile-name {
  font-size: 1.3rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.25;
  color: #052e16;
}

.profile-identity-text .profile-ref {
  font-size: 0.9rem;
  margin: 0.12rem 0 0;
  font-weight: 700;
  color: #166534;
}

.profile-identity-text .profile-barangay {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.9rem;
  margin: 0.18rem 0 0;
  font-weight: 600;
  color: #14532d;
}

.profile-form {
  padding: 1rem 1.25rem 1.15rem;
  /* Neutralize global `form { display:flex; gap: clamp(...) }` spacing */
  display: block;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem 0.9rem;
}

/* Neutralize global `.form-group { margin-bottom: clamp(...) }` */
.profile-form .form-group {
  margin: 0;
  display: block;
}

.form-group--full {
  grid-column: 1 / -1;
}

.field-hint {
  margin: 0.38rem 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #166534;
  line-height: 1.35;
}

.form-group label {
  display: block;
  font-size: 0.85rem;
  font-weight: 700;
  color: #14532d;
  margin: 0 0 0.24rem;
  padding: 0;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.6rem 0.85rem;
  min-height: 0;
  /* Beats the global mobile `input { margin-bottom: clamp(...) }` */
  margin: 0;
  border: 1.5px solid #94a3b8;
  border-radius: 11px;
  font-size: 0.95rem;
  font-weight: 600;
  color: #052e16;
  background: #ffffff;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.18);
}

.readonly-section {
  margin-top: 0.75rem;
  padding-top: 0.75rem;
  border-top: 1.5px solid #cbd5e1;
}

.readonly-field {
  flex: 1;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 11px;
  padding: 0.6rem 0.85rem;
}

.readonly-field label {
  display: block;
  font-size: 0.72rem;
  font-weight: 700;
  color: #166534;
  margin: 0 0 0.18rem;
  padding: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.readonly-field span {
  font-size: 0.98rem;
  color: #052e16;
  font-weight: 800;
}

.readonly-field--full {
  flex: 1 1 100%;
}

.form-actions {
  margin-top: 0.85rem;
}

.save-btn {
  width: 100%;
  padding: 0.7rem 1rem;
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  color: #052e16;
  font-weight: 800;
  font-size: 1.05rem;
  border: 2px solid #15803d;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s, filter 0.2s, box-shadow 0.2s;
  box-shadow: 0 6px 16px rgba(4, 18, 12, 0.16);
}

.save-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
  box-shadow: 0 8px 20px rgba(4, 18, 12, 0.2);
}

.save-btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.form-message {
  text-align: center;
  font-size: 0.94rem;
  font-weight: 700;
  margin-top: 0.82rem;
}

.text-green-600 {
  color: #15803d;
}

.text-red-600 {
  color: #b91c1c;
}

.text-blue-600 {
  color: #1d4ed8;
}

.hidden {
  display: none;
}

@media (max-width: 640px) {
  .edit-profile-page {
    padding: 0.7rem 0.7rem 1rem;
    min-height: auto;
  }

  .profile-page-title {
    font-size: 1.3rem;
  }

  .profile-page-subtitle {
    font-size: 0.82rem;
  }

  .profile-identity {
    flex-direction: column;
    text-align: center;
    gap: 0.6rem;
    padding: 0.85rem 0.9rem;
  }

  .avatar-wrapper,
  .avatar-img,
  .avatar-placeholder {
    width: 64px;
    height: 64px;
  }

  .profile-identity-text .profile-barangay {
    justify-content: center;
  }

  .profile-form {
    padding: 0.85rem 0.9rem 1rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0.6rem;
  }

  .form-group input,
  .form-group select {
    padding: 0.55rem 0.8rem;
    font-size: 16px; /* prevents iOS zoom on focus */
  }

  .settings-card {
    padding: 0.95rem 1rem 1rem;
  }

  .settings-google-btn {
    width: 100%;
  }
}
</style>
