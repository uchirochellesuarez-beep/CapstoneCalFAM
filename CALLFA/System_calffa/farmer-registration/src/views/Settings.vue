<template>
  <div class="edit-profile-page glass-module-page">
    <div class="profile-page-inner">
      <header class="profile-page-header">
        <h1 class="profile-page-title">Edit Profile</h1>
        <p class="profile-page-subtitle">Update your personal information below.</p>
      </header>

      <div class="profile-card">
        <div class="profile-identity">
          <div class="profile-avatar-section">
            <div class="avatar-wrapper">
              <img
                v-if="profilePictureUrl"
                :src="profilePictureUrl"
                alt="Profile"
                class="avatar-img"
              />
              <span v-else class="avatar-placeholder">{{ userInitials }}</span>
              <label class="avatar-upload-btn" title="Change Photo" aria-label="Change profile photo">
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
            <h2 class="profile-name">{{ profile.full_name || 'Your Name' }}</h2>
            <p class="profile-ref">{{ profile.reference_number || 'No reference number' }}</p>
            <p class="profile-barangay">
              <span class="profile-barangay-icon" aria-hidden="true">📍</span>
              {{ profile.barangay_name || profile.address || 'No barangay assigned' }}
            </p>
          </div>
        </div>

        <form @submit.prevent="saveProfile" class="profile-form">
        <div class="form-grid">
          <div class="form-group">
            <label>Full Name</label>
            <input
              type="text"
              v-model="profile.full_name"
              required
              placeholder="Enter your full name"
            />
          </div>
          <div class="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              v-model="profile.phone_number"
              placeholder="Enter phone number"
            />
          </div>
          <div class="form-group">
            <label>Educational Status</label>
            <select v-model="profile.educational_status">
              <option value="" disabled>Select Educational Status</option>
              <option value="Elementary">Elementary</option>
              <option value="High School">High School</option>
              <option value="Senior High School">Senior High School</option>
              <option value="Vocational">Vocational</option>
              <option value="College">College</option>
              <option value="Post Graduate">Post Graduate</option>
              <option value="None">None</option>
            </select>
          </div>
          <div class="form-group">
            <label>Address</label>
            <input
              type="text"
              v-model="profile.address"
              placeholder="Enter your street address"
            />
          </div>
          <div class="form-group form-group--full">
            <label>Reference Number</label>
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
            <label>Barangay</label>
            <span>{{ profile.barangay_name || profile.address || '—' }}</span>
          </div>
        </div>

        <div class="form-actions">
          <button type="submit" class="save-btn" :disabled="saving">
            <span v-if="saving">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
        <p v-if="message" class="form-message" :class="messageType">{{ message }}</p>
      </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

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
    // Otherwise, prepend localhost for uploaded pictures
    return `http://localhost:3000${pictureUrl}`
  }
  return null
})

const handleProfilePictureChange = async (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    uploadMessage.value = 'File size must be less than 5MB'
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

    const response = await fetch(`http://localhost:3000/api/farmers/${userId}/profile-picture`, {
      method: 'POST',
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

    const response = await fetch(`http://localhost:3000/api/farmers/${userId}/profile`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
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
    authStore.currentUser = { ...authStore.currentUser, ...data.farmer }
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

    const response = await fetch(`http://localhost:3000/api/farmers/${userId}/profile`, {
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
      authStore.currentUser = {
        ...authStore.currentUser,
        reference_number: farmer.reference_number,
        phone_number: farmer.phone_number,
        educational_status: farmer.educational_status,
        address: farmer.address,
        profile_picture: farmer.profile_picture,
        barangay_name: farmer.barangay_name,
        email: farmer.email
      }
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
</script>

<style scoped>
.edit-profile-page {
  padding: 1.25rem 1.1rem 2rem;
  max-width: 720px;
  margin: 0 auto;
  min-height: calc(100vh - 72px);
}

.profile-page-inner {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.profile-page-header {
  padding: 0 0.15rem;
}

.profile-page-title {
  margin: 0;
  font-size: 1.75rem;
  font-weight: 800;
  color: #ecfdf5;
  line-height: 1.25;
}

.profile-page-subtitle {
  margin: 0.35rem 0 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: rgba(220, 252, 231, 0.88);
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
  gap: 1.15rem;
  padding: 1.35rem 1.5rem;
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-bottom: 2px solid #86efac;
}

.avatar-wrapper {
  position: relative;
  width: 84px;
  height: 84px;
  flex-shrink: 0;
}

.avatar-img {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  object-fit: cover;
  border: 3px solid #16a34a;
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.18);
}

.avatar-placeholder {
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  border: 3px solid #16a34a;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.65rem;
  font-weight: 800;
  color: #052e16;
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.18);
}

.avatar-upload-btn {
  position: absolute;
  bottom: -2px;
  right: -2px;
  width: 34px;
  height: 34px;
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
  font-size: 1.45rem;
  font-weight: 800;
  margin: 0;
  line-height: 1.3;
  color: #052e16;
}

.profile-identity-text .profile-ref {
  font-size: 0.95rem;
  margin: 0.2rem 0 0;
  font-weight: 700;
  color: #166534;
}

.profile-identity-text .profile-barangay {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.95rem;
  margin: 0.3rem 0 0;
  font-weight: 600;
  color: #14532d;
}

.profile-barangay-icon {
  flex-shrink: 0;
}

.profile-form {
  padding: 1.35rem 1.5rem 1.5rem;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem 1.1rem;
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
  font-size: 0.9rem;
  font-weight: 700;
  color: #14532d;
  margin-bottom: 0.45rem;
}

.form-group input,
.form-group select {
  width: 100%;
  padding: 0.85rem 0.95rem;
  border: 1.5px solid #94a3b8;
  border-radius: 12px;
  font-size: 1rem;
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
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1.5px solid #cbd5e1;
}

.readonly-field {
  flex: 1;
  background: #f0fdf4;
  border: 2px solid #86efac;
  border-radius: 12px;
  padding: 0.9rem 1rem;
}

.readonly-field label {
  display: block;
  font-size: 0.75rem;
  font-weight: 700;
  color: #166534;
  margin-bottom: 0.3rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.readonly-field span {
  font-size: 1.05rem;
  color: #052e16;
  font-weight: 800;
}

.readonly-field--full {
  flex: 1 1 100%;
}

.form-actions {
  margin-top: 1.15rem;
}

.save-btn {
  width: 100%;
  padding: 0.9rem 1rem;
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
    padding: 1rem 0.85rem 1.5rem;
    min-height: auto;
  }

  .profile-page-title {
    font-size: 1.45rem;
  }

  .profile-identity {
    flex-direction: column;
    text-align: center;
    padding: 1.25rem 1.15rem;
  }

  .profile-identity-text .profile-barangay {
    justify-content: center;
  }

  .profile-form {
    padding: 1.15rem 1.15rem 1.35rem;
  }

  .form-grid {
    grid-template-columns: 1fr;
    gap: 0.9rem;
  }
}
</style>
