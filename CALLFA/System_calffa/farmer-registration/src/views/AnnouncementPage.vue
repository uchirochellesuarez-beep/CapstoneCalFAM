<template>
  <div class="announcement-page">
    <!-- Hero -->
    <header class="notice-hero">
      <div class="hero-left">
        <div class="hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 10v4a2 2 0 002 2h1l4 4V4L7 8H6a2 2 0 00-2 2z" />
            <path d="M15.5 8.5a5 5 0 010 7" />
            <path d="M18 6a8 8 0 010 12" />
          </svg>
        </div>
        <div class="hero-text">
          <p class="hero-eyebrow">CALFFA Cooperative</p>
          <h1>Official Announcements</h1>
          <p class="hero-desc">Important notices, updates, and advisories for all members and officers.</p>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-stat">
          <span class="hero-stat-value">{{ filteredAnnouncements.length }}</span>
          <span class="hero-stat-label">{{ filteredAnnouncements.length === 1 ? 'Notice' : 'Notices' }}</span>
        </div>
        <button
          v-if="canCreateAnnouncement"
          class="btn-post"
          type="button"
          @click="openCreateModal = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          Post Announcement
        </button>
      </div>
    </header>

    <div v-if="toastMessage" class="toast" :class="toastType">{{ toastMessage }}</div>

    <!-- Toolbar -->
    <section class="notice-toolbar">
      <div class="search-wrap">
        <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
        </svg>
        <input
          v-model.trim="searchTitle"
          type="search"
          class="search-input"
          placeholder="Search announcements by title..."
        />
      </div>
      <select v-model="sortOrder" class="sort-select" aria-label="Sort order">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="state-panel">
      <div class="state-spinner" aria-hidden="true"></div>
      <p>Loading announcements...</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredAnnouncements.length === 0" class="state-panel state-empty">
      <div class="state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M4 10v4a2 2 0 002 2h1l4 4V4L7 8H6a2 2 0 00-2 2z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h2>No announcements yet</h2>
      <p v-if="canCreateAnnouncement">Post the first official notice for members to see.</p>
      <p v-else>Check back later for cooperative updates and advisories.</p>
      <button
        v-if="canCreateAnnouncement"
        class="btn-post btn-post-inline"
        type="button"
        @click="openCreateModal = true"
      >
        Post Announcement
      </button>
    </div>

    <!-- Announcement list -->
    <div v-else class="notice-list">
      <article
        v-for="(item, index) in filteredAnnouncements"
        :key="item.id"
        class="notice-card"
        :class="{ 'notice-card--featured': index === 0 && sortOrder === 'newest' }"
      >
        <div class="notice-card-accent" aria-hidden="true"></div>

        <header class="notice-card-header">
          <div class="notice-author">
            <img
              :src="resolveAuthorAvatar(item)"
              :alt="item.author_name || 'Author'"
              class="author-avatar"
              loading="lazy"
            />
            <div class="author-info">
              <span class="author-name">{{ item.author_name || 'Officer' }}</span>
              <span class="author-role" :class="roleClass(item.author_role)">{{ item.author_role }}</span>
            </div>
          </div>
          <div class="notice-header-end">
            <div class="notice-meta">
              <time class="notice-date" :datetime="item.created_at">{{ formatDateShort(item.created_at) }}</time>
              <span class="notice-time">{{ formatTimeOnly(item.created_at) }}</span>
            </div>
            <div v-if="canEditAnnouncement(item) || canDeleteAnnouncement(item)" class="notice-actions">
            <button
              v-if="canEditAnnouncement(item)"
              type="button"
              class="action-btn"
              title="Edit"
              @click="openEditModalFn(item)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10.5-10.5a2 2 0 000-2.83L17.83 7a2 2 0 00-2.83 0L4 16.5V20z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button
              v-if="canDeleteAnnouncement(item)"
              type="button"
              class="action-btn action-btn--danger"
              title="Delete"
              @click="openDeleteModal(item.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 7h16M9 7V5h6v2M8 10v7M12 10v7M16 10v7M6.5 7l1 13h6l1-13" stroke-linecap="round"/></svg>
            </button>
            </div>
          </div>
        </header>

        <div class="notice-card-body">
          <div v-if="index === 0 && sortOrder === 'newest'" class="notice-badge-latest">Latest</div>

          <div class="notice-body-layout" :class="{ 'notice-body-layout--with-image': item.image }">
            <div class="notice-main">
              <h2 class="notice-title">{{ item.title }}</h2>
              <div class="notice-content-wrap">
                <p
                  class="notice-content"
                  :class="{ 'notice-content--clamped': !isExpanded(item.id) && isLongContent(item.content) }"
                >{{ item.content }}</p>
                <button
                  v-if="isLongContent(item.content)"
                  type="button"
                  class="read-more-btn"
                  @click="toggleExpand(item.id)"
                >
                  {{ isExpanded(item.id) ? 'Show less' : 'Read full notice' }}
                </button>
              </div>
            </div>

            <figure v-if="item.image" class="notice-figure">
              <img
                :src="resolveImageUrl(item.image)"
                :alt="item.title"
                class="notice-image"
                loading="lazy"
                @click="openImagePreview(resolveImageUrl(item.image), item.title)"
              />
              <figcaption class="notice-figure-cap">Enlarge</figcaption>
            </figure>
          </div>
        </div>

        <footer class="notice-card-footer">
          <span>Posted {{ formatRelativeDate(item.created_at) }}</span>
          <span v-if="item.updated_at && item.updated_at !== item.created_at" class="edited-tag">Edited</span>
        </footer>
      </article>
    </div>

    <!-- Create modal -->
    <div v-if="openCreateModal" class="modal-backdrop" @click.self="closeCreateModal">
      <div class="modal modal-form" role="dialog" aria-labelledby="create-title">
        <div class="modal-head">
          <h3 id="create-title">Post Announcement</h3>
          <button type="button" class="modal-close" aria-label="Close" @click="closeCreateModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="create-title-input">Title <span class="req">*</span></label>
            <input id="create-title-input" v-model="createForm.title" type="text" maxlength="255" placeholder="e.g. Schedule of Annual Assembly" />
          </div>
          <div class="form-field">
            <label for="create-content">Notice content <span class="req">*</span></label>
            <textarea id="create-content" v-model="createForm.content" rows="7" placeholder="Write the full announcement details here..."></textarea>
          </div>
          <div class="form-field">
            <label>Attachment image <span class="opt">(optional)</span></label>
            <div
              class="upload-zone"
              :class="{ 'upload-zone--has-file': createForm.imageFile }"
              @click="triggerCreateFileInput"
              @dragover.prevent
              @drop.prevent="onCreateDrop"
            >
              <input ref="createFileInput" type="file" accept="image/*" class="upload-input" @change="onImageSelected" />
              <div v-if="createPreviewUrl" class="upload-preview">
                <img :src="createPreviewUrl" alt="Preview" />
                <button type="button" class="upload-clear" @click.stop="clearCreateImage">Remove</button>
              </div>
              <div v-else class="upload-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span>Click or drop an image</span>
                <small>JPG, PNG, GIF, WEBP — max 5MB</small>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" type="button" @click="closeCreateModal">Cancel</button>
          <button class="btn-post" type="button" :disabled="submitting" @click="submitCreateAnnouncement">
            {{ submitting ? 'Publishing...' : 'Publish Notice' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Edit modal -->
    <div v-if="openEditModal" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal modal-form" role="dialog" aria-labelledby="edit-title">
        <div class="modal-head">
          <h3 id="edit-title">Edit Announcement</h3>
          <button type="button" class="modal-close" aria-label="Close" @click="closeEditModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="edit-title-input">Title <span class="req">*</span></label>
            <input id="edit-title-input" v-model="editForm.title" type="text" maxlength="255" />
          </div>
          <div class="form-field">
            <label for="edit-content">Notice content <span class="req">*</span></label>
            <textarea id="edit-content" v-model="editForm.content" rows="7"></textarea>
          </div>
          <div class="form-field">
            <label>Attachment image <span class="opt">(optional)</span></label>
            <div
              class="upload-zone"
              :class="{ 'upload-zone--has-file': editForm.imageFile || editingAnnouncement?.image }"
              @click="triggerEditFileInput"
              @dragover.prevent
              @drop.prevent="onEditDrop"
            >
              <input ref="editFileInput" type="file" accept="image/*" class="upload-input" @change="onEditImageSelected" />
              <div v-if="editPreviewUrl" class="upload-preview">
                <img :src="editPreviewUrl" alt="Preview" />
                <button type="button" class="upload-clear" @click.stop="clearEditImage">Remove new image</button>
              </div>
              <div v-else-if="editingAnnouncement?.image" class="upload-preview">
                <img :src="resolveImageUrl(editingAnnouncement.image)" alt="Current" />
                <span class="upload-keep">Current image — click to replace</span>
              </div>
              <div v-else class="upload-placeholder">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
                <span>Click or drop to add image</span>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" type="button" @click="closeEditModal">Cancel</button>
          <button class="btn-post" type="button" :disabled="submitting" @click="submitEditAnnouncement">
            {{ submitting ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Delete confirm -->
    <div v-if="openDeleteConfirmModal" class="modal-backdrop" @click.self="closeDeleteModal">
      <div class="modal modal-sm" role="alertdialog">
        <div class="modal-head">
          <h3>Delete announcement?</h3>
        </div>
        <div class="modal-body">
          <p class="delete-warning">This notice will be permanently removed for all members.</p>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" type="button" @click="closeDeleteModal">Cancel</button>
          <button class="btn-danger" type="button" @click="confirmDeleteAnnouncement">Delete</button>
        </div>
      </div>
    </div>

    <!-- Image preview -->
    <div v-if="openImagePreviewModal" class="modal-backdrop preview-backdrop" @click.self="closeImagePreview">
      <div class="preview-frame">
        <button class="preview-close" type="button" aria-label="Close" @click="closeImagePreview">&times;</button>
        <img :src="previewImageSrc" :alt="previewImageAlt" class="preview-img" />
        <p v-if="previewImageAlt" class="preview-caption">{{ previewImageAlt }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'

const API_ORIGIN = 'http://localhost:3000'

const authStore = useAuthStore()
const router = useRouter()
const userRole = computed(() => (authStore.currentUser?.role || '').toLowerCase())
const userId = computed(() => authStore.currentUser?.id)
const token = computed(() => authStore.token)
const canCreateAnnouncement = computed(() => ['president', 'admin'].includes(userRole.value))

const canEditAnnouncement = (item) => {
  if (!userId.value) return false
  return item.author_id === userId.value
}

const canDeleteAnnouncement = (item) => {
  if (['president', 'admin'].includes(userRole.value)) return true
  if (!userId.value) return false
  return item.author_id === userId.value
}

const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const toastMessage = ref('')
const toastType = ref('success')
let toastTimer = null

const announcements = ref([])
const searchTitle = ref('')
const sortOrder = ref('newest')
const expandedIds = ref(new Set())

const openCreateModal = ref(false)
const openEditModal = ref(false)
const openDeleteConfirmModal = ref(false)
const openImagePreviewModal = ref(false)
const previewImageSrc = ref('')
const previewImageAlt = ref('')

const pendingDeleteAnnouncementId = ref(null)
const editingAnnouncement = ref(null)
const createFileInput = ref(null)
const editFileInput = ref(null)
const createPreviewUrl = ref('')
const editPreviewUrl = ref('')

const createForm = ref({
  title: '',
  content: '',
  imageFile: null,
  imageFileName: ''
})
const editForm = ref({
  title: '',
  content: '',
  imageFile: null,
  imageFileName: ''
})

const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

const filteredAnnouncements = computed(() => {
  const query = searchTitle.value.toLowerCase()
  let rows = announcements.value
  if (query) {
    rows = rows.filter((item) => String(item.title || '').toLowerCase().includes(query))
  }
  rows = [...rows].sort((a, b) => {
    const aTime = new Date(a.created_at).getTime()
    const bTime = new Date(b.created_at).getTime()
    return sortOrder.value === 'oldest' ? aTime - bTime : bTime - aTime
  })
  return rows
})

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 2400)
}
watch(errorMessage, (value) => {
  if (value) showToast(value, 'error')
})
watch(successMessage, (value) => {
  if (value) showToast(value, 'success')
})

const authHeaders = () => ({
  Authorization: `Bearer ${token.value}`
})

const handleUnauthorized = (message) => {
  authStore.logout()
  errorMessage.value = message || 'Session expired. Please log in again.'
  setTimeout(() => {
    router.push('/login')
  }, 250)
}

const fetchAnnouncements = async () => {
  clearMessages()
  if (!token.value) {
    errorMessage.value = 'Please log in first.'
    return
  }

  loading.value = true
  try {
    const response = await fetch('/api/announcements', { headers: authHeaders() })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch announcements')
    }

    announcements.value = data.data || []
  } catch (err) {
    errorMessage.value = err.message || 'Failed to fetch announcements'
  } finally {
    loading.value = false
  }
}

const revokePreviewUrl = (url) => {
  if (url && url.startsWith('blob:')) URL.revokeObjectURL(url)
}

const setCreatePreview = (file) => {
  revokePreviewUrl(createPreviewUrl.value)
  createPreviewUrl.value = file ? URL.createObjectURL(file) : ''
}

const setEditPreview = (file) => {
  revokePreviewUrl(editPreviewUrl.value)
  editPreviewUrl.value = file ? URL.createObjectURL(file) : ''
}

const triggerCreateFileInput = () => createFileInput.value?.click()
const triggerEditFileInput = () => editFileInput.value?.click()

const onImageSelected = (event) => {
  const file = event.target.files?.[0] || null
  createForm.value.imageFile = file
  createForm.value.imageFileName = file ? file.name : ''
  setCreatePreview(file)
}

const onEditImageSelected = (event) => {
  const file = event.target.files?.[0] || null
  editForm.value.imageFile = file
  editForm.value.imageFileName = file ? file.name : ''
  setEditPreview(file)
}

const onCreateDrop = (event) => {
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    createForm.value.imageFile = file
    createForm.value.imageFileName = file.name
    setCreatePreview(file)
  }
}

const onEditDrop = (event) => {
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    editForm.value.imageFile = file
    editForm.value.imageFileName = file.name
    setEditPreview(file)
  }
}

const clearCreateImage = () => {
  createForm.value.imageFile = null
  createForm.value.imageFileName = ''
  setCreatePreview(null)
  if (createFileInput.value) createFileInput.value.value = ''
}

const clearEditImage = () => {
  editForm.value.imageFile = null
  editForm.value.imageFileName = ''
  setEditPreview(null)
  if (editFileInput.value) editFileInput.value.value = ''
}

const submitCreateAnnouncement = async () => {
  clearMessages()
  if (!canCreateAnnouncement.value) {
    errorMessage.value = 'Only President or Admin can create announcements.'
    return
  }

  const title = createForm.value.title.trim()
  const content = createForm.value.content.trim()

  if (!title || !content) {
    errorMessage.value = 'Title and content are required.'
    return
  }

  const formData = new FormData()
  formData.append('title', title)
  formData.append('content', content)
  if (createForm.value.imageFile) {
    formData.append('image', createForm.value.imageFile)
  }

  submitting.value = true
  try {
    const response = await fetch('/api/announcements', {
      method: 'POST',
      headers: authHeaders(),
      body: formData
    })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to create announcement')
    }

    successMessage.value = data.message || 'Announcement posted successfully.'
    closeCreateModal()
    await fetchAnnouncements()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to create announcement'
  } finally {
    submitting.value = false
  }
}

const closeCreateModal = () => {
  openCreateModal.value = false
  clearCreateImage()
  createForm.value = { title: '', content: '', imageFile: null, imageFileName: '' }
}

const openEditModalFn = (item) => {
  if (!canEditAnnouncement(item)) {
    errorMessage.value = 'You can only edit your own announcements.'
    return
  }
  editingAnnouncement.value = item
  editForm.value = { title: item.title, content: item.content, imageFile: null, imageFileName: '' }
  setEditPreview(null)
  openEditModal.value = true
}

const closeEditModal = () => {
  openEditModal.value = false
  editingAnnouncement.value = null
  clearEditImage()
  editForm.value = { title: '', content: '', imageFile: null, imageFileName: '' }
}

const submitEditAnnouncement = async () => {
  clearMessages()
  if (!editingAnnouncement.value) return

  const title = editForm.value.title.trim()
  const content = editForm.value.content.trim()

  if (!title || !content) {
    errorMessage.value = 'Title and content are required.'
    return
  }

  const formData = new FormData()
  formData.append('title', title)
  formData.append('content', content)
  if (editForm.value.imageFile) {
    formData.append('image', editForm.value.imageFile)
  }

  submitting.value = true
  try {
    const response = await fetch(`/api/announcements/${editingAnnouncement.value.id}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: formData
    })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to update announcement')
    }

    successMessage.value = data.message || 'Announcement updated successfully.'
    closeEditModal()
    await fetchAnnouncements()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to update announcement'
  } finally {
    submitting.value = false
  }
}

const openDeleteModal = (id) => {
  pendingDeleteAnnouncementId.value = id
  openDeleteConfirmModal.value = true
}

const closeDeleteModal = () => {
  openDeleteConfirmModal.value = false
  pendingDeleteAnnouncementId.value = null
}

const openImagePreview = (src, alt = 'Announcement image') => {
  previewImageSrc.value = src
  previewImageAlt.value = alt
  openImagePreviewModal.value = true
}

const closeImagePreview = () => {
  openImagePreviewModal.value = false
  previewImageSrc.value = ''
  previewImageAlt.value = ''
}

const confirmDeleteAnnouncement = async () => {
  if (!pendingDeleteAnnouncementId.value) return
  await deleteAnnouncement(pendingDeleteAnnouncementId.value)
  closeDeleteModal()
}

const deleteAnnouncement = async (id) => {
  clearMessages()

  try {
    const response = await fetch('/api/announcements/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders() },
      body: JSON.stringify({ announcement_id: id })
    })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete announcement')
    }

    showToast('Announcement deleted.')
    await fetchAnnouncements()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to delete announcement'
  }
}

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${API_ORIGIN}${normalized}`
}

const resolveAuthorAvatar = (item) => {
  const name = item?.author_name || 'User'
  const profile = item?.author_profile

  if (profile) {
    if (profile.startsWith('http://') || profile.startsWith('https://')) {
      return profile
    }
    return resolveImageUrl(profile)
  }

  return (
    'https://ui-avatars.com/api/?name=' +
    encodeURIComponent(name) +
    '&background=166534&color=fff&size=128'
  )
}

const roleClass = (role) => {
  const r = String(role || '').toLowerCase()
  if (r === 'president') return 'role-president'
  if (r === 'admin') return 'role-admin'
  return 'role-other'
}

const isLongContent = (text) => String(text || '').length > 280

const isExpanded = (id) => expandedIds.value.has(id)

const toggleExpand = (id) => {
  const next = new Set(expandedIds.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  expandedIds.value = next
}

const MANILA_TZ = 'Asia/Manila'

const parseLocalDateTime = (value) => {
  if (!value) return null
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value
  const trimmed = String(value).trim()

  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    const [year, month, day] = trimmed.split('-').map(Number)
    return new Date(year, month - 1, day, 0, 0, 0, 0)
  }

  if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}/.test(trimmed)) {
    const [datePart, timePart] = trimmed.split(' ')
    const [year, month, day] = datePart.split('-').map(Number)
    const [hour, minute, second = 0] = timePart.split(':').map(Number)
    return new Date(year, month - 1, day, hour, minute, second, 0)
  }

  const d = new Date(trimmed)
  return Number.isNaN(d.getTime()) ? null : d
}

const formatDateShort = (date) => {
  const d = parseLocalDateTime(date)
  if (!d) return ''
  return d.toLocaleDateString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    timeZone: MANILA_TZ
  })
}

const formatTimeOnly = (date) => {
  const d = parseLocalDateTime(date)
  if (!d) return ''
  return d.toLocaleTimeString('en-PH', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: MANILA_TZ
  })
}

const startOfLocalDay = (date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const formatRelativeDate = (date) => {
  const d = parseLocalDateTime(date)
  if (!d) return ''
  const now = new Date()
  const dayDiff = Math.round((startOfLocalDay(now).getTime() - startOfLocalDay(d).getTime()) / (1000 * 60 * 60 * 24))
  if (dayDiff === 0) return 'today'
  if (dayDiff === 1) return 'yesterday'
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago`
  return formatDateShort(date)
}

onMounted(fetchAnnouncements)
</script>

<style scoped>
.announcement-page {
  --bg-deep: #0f1712;
  --bg-card: rgba(28, 42, 33, 0.94);
  --line: rgba(190, 235, 203, 0.14);
  --line-strong: rgba(74, 222, 128, 0.35);
  --green: #4ade80;
  --green-dim: rgba(74, 222, 128, 0.15);
  --text: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.72);
  --text-soft: rgba(220, 238, 211, 0.5);

  max-width: 860px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  min-height: 100vh;
  color: var(--text);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

/* Hero */
.notice-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1.5rem 1.6rem;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(22, 101, 52, 0.35) 0%, rgba(28, 42, 33, 0.95) 55%);
  border: 1px solid var(--line);
  box-shadow: 0 12px 32px rgba(0, 0, 0, 0.28);
  margin-bottom: 1.25rem;
}

.hero-left {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  flex: 1;
  min-width: 220px;
}

.hero-icon {
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: var(--green-dim);
  border: 1px solid var(--line-strong);
  color: var(--green);
}

.hero-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.hero-eyebrow {
  margin: 0 0 0.2rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
  color: var(--green);
}

.notice-hero h1 {
  margin: 0;
  font-size: clamp(1.45rem, 3vw, 1.85rem);
  font-weight: 800;
  line-height: 1.2;
}

.hero-desc {
  margin: 0.4rem 0 0;
  font-size: 0.88rem;
  color: var(--text-muted);
  line-height: 1.45;
  max-width: 36rem;
}

.hero-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem 1rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--line);
  min-width: 4.5rem;
}

.hero-stat-value {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--green);
  line-height: 1;
}

.hero-stat-label {
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-soft);
  margin-top: 0.2rem;
}

.btn-post {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.6rem 1.1rem;
  border-radius: 10px;
  border: 1px solid var(--line-strong);
  background: linear-gradient(135deg, #dcfce7, #86efac);
  color: #14532d;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
  white-space: nowrap;
}

.btn-post svg {
  width: 1rem;
  height: 1rem;
}

.btn-post:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.btn-post:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.btn-post-inline {
  margin-top: 0.75rem;
}

/* Toolbar */
.notice-toolbar {
  display: flex;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.search-wrap {
  flex: 1;
  position: relative;
  min-width: 0;
}

.search-ico {
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  width: 1rem;
  height: 1rem;
  color: var(--text-soft);
  pointer-events: none;
}

.search-input,
.sort-select {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.22);
  color: var(--text);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.search-input {
  padding-left: 2.25rem;
}

.search-input::placeholder {
  color: var(--text-soft);
}

.sort-select {
  width: auto;
  min-width: 9rem;
  cursor: pointer;
}

.sort-select option {
  background: #132119;
  color: var(--text);
}

/* States */
.state-panel {
  text-align: center;
  padding: 3rem 1.5rem;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  color: var(--text-muted);
}

.state-spinner {
  width: 2rem;
  height: 2rem;
  margin: 0 auto 1rem;
  border: 3px solid var(--line);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.state-empty .state-icon {
  width: 3.5rem;
  height: 3.5rem;
  margin: 0 auto 1rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--green-dim);
  color: var(--green);
}

.state-empty .state-icon svg {
  width: 1.6rem;
  height: 1.6rem;
}

.state-empty h2 {
  margin: 0 0 0.4rem;
  font-size: 1.1rem;
  color: var(--text);
}

.state-empty p {
  margin: 0;
  font-size: 0.88rem;
}

/* Notice list */
.notice-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.notice-card {
  position: relative;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
  transition: box-shadow 0.2s, border-color 0.2s;
}

.notice-card:hover {
  border-color: rgba(74, 222, 128, 0.28);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
}

.notice-card--featured {
  border-color: rgba(74, 222, 128, 0.4);
  box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.12), 0 12px 32px rgba(0, 0, 0, 0.3);
}

.notice-card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, var(--green), #2dd4bf);
}

.notice-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  padding: 1rem 1.1rem 0.75rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.notice-header-end {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;
  flex-shrink: 0;
}

.notice-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-align: right;
}

.notice-date {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
}

.notice-time {
  font-size: 0.68rem;
  color: var(--text-soft);
}

.notice-author {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
}

.author-avatar {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: rgba(0, 0, 0, 0.2);
}

.author-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.author-name {
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author-role {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.author-role.role-president { color: #a5b4fc; }
.author-role.role-admin { color: #86efac; }
.author-role.role-other { color: var(--text-soft); }

.notice-actions {
  display: flex;
  gap: 0.35rem;
}

.action-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
  color: #2dd4bf;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s;
}

.action-btn svg {
  width: 0.9rem;
  height: 0.9rem;
}

.action-btn:hover {
  background: rgba(45, 212, 191, 0.12);
}

.action-btn--danger {
  color: #f87171;
}

.action-btn--danger:hover {
  background: rgba(248, 113, 113, 0.12);
}

.notice-card-body {
  padding: 1rem 1.1rem 0.85rem 1.25rem;
}

.notice-badge-latest {
  display: inline-block;
  margin-bottom: 0.5rem;
  padding: 0.15rem 0.5rem;
  border-radius: 6px;
  font-size: 0.6rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: var(--green-dim);
  color: var(--green);
  border: 1px solid var(--line-strong);
}

.notice-title {
  margin: 0 0 0.45rem;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.35;
  color: var(--text);
}

.notice-body-layout {
  width: 100%;
}

.notice-body-layout--with-image {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}

.notice-body-layout--with-image .notice-main {
  flex: 1;
  min-width: 0;
}

.notice-main {
  width: 100%;
}

.notice-figure {
  flex-shrink: 0;
  margin: 0;
  width: 108px;
  align-self: flex-start;
}

.notice-image {
  width: 108px;
  height: 82px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--line);
  cursor: zoom-in;
  display: block;
  background: rgba(0, 0, 0, 0.2);
  transition: border-color 0.15s, box-shadow 0.15s;
}

.notice-image:hover {
  border-color: var(--line-strong);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.25);
}

.notice-figure-cap {
  margin-top: 0.25rem;
  font-size: 0.58rem;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.2;
}

.notice-content-wrap {
  margin-top: 0;
}

.notice-content {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.6;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.notice-content--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 5;
  line-clamp: 5;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.read-more-btn {
  margin-top: 0.5rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--green);
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.read-more-btn:hover {
  color: #86efac;
}

.notice-card-footer {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.6rem 1.1rem 0.75rem 1.25rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.72rem;
  color: var(--text-soft);
}

.edited-tag {
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
}

/* Toast */
.toast {
  position: fixed;
  right: 1.25rem;
  top: 1.25rem;
  z-index: 1200;
  padding: 0.65rem 1rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.85rem;
  border: 1px solid var(--line-strong);
  background: rgba(20, 83, 45, 0.95);
  color: #dcfce7;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

.toast.error {
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(127, 29, 29, 0.95);
  color: #fee2e2;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2400;
  background: rgba(6, 12, 9, 0.75);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.modal {
  width: min(520px, 100%);
  max-height: min(92vh, 720px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: rgba(25, 38, 29, 0.98);
  border: 1px solid var(--line);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.modal-sm {
  width: min(400px, 100%);
}

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-head h3 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
}

.modal-close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--text);
}

.modal-body {
  padding: 1rem 1.15rem;
  overflow-y: auto;
  flex: 1;
}

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.15rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.form-field {
  margin-bottom: 1rem;
}

.form-field:last-child {
  margin-bottom: 0;
}

.form-field label {
  display: block;
  margin-bottom: 0.35rem;
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--text-muted);
}

.req { color: #f87171; }
.opt { font-weight: 500; color: var(--text-soft); }

.form-field input,
.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.7rem;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
  color: var(--text);
  font-size: 0.88rem;
  font-family: inherit;
}

.form-field textarea {
  resize: vertical;
  min-height: 7rem;
}

.upload-zone {
  position: relative;
  border: 2px dashed rgba(190, 235, 203, 0.25);
  border-radius: 10px;
  min-height: 7rem;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}

.upload-zone:hover {
  border-color: var(--line-strong);
  background: rgba(74, 222, 128, 0.04);
}

.upload-zone--has-file {
  border-style: solid;
}

.upload-input {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 1.5rem 1rem;
  color: var(--text-soft);
  text-align: center;
}

.upload-placeholder svg {
  width: 2rem;
  height: 2rem;
  opacity: 0.6;
}

.upload-placeholder span {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-muted);
}

.upload-placeholder small {
  font-size: 0.7rem;
}

.upload-preview {
  position: relative;
}

.upload-preview img {
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  display: block;
}

.upload-clear,
.upload-keep {
  display: block;
  width: 100%;
  padding: 0.45rem;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.upload-keep {
  cursor: default;
  color: var(--text-soft);
}

.btn-ghost {
  padding: 0.55rem 1rem;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-danger {
  padding: 0.55rem 1rem;
  border-radius: 9px;
  border: 1px solid rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
}

.delete-warning {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.5;
}

/* Image preview */
.preview-backdrop {
  z-index: 2600;
}

.preview-frame {
  position: relative;
  width: min(800px, 94vw);
  max-height: 88vh;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.preview-close {
  position: absolute;
  top: -0.5rem;
  right: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: rgba(15, 23, 17, 0.95);
  color: var(--text);
  font-size: 1.4rem;
  cursor: pointer;
  z-index: 1;
}

.preview-img {
  width: 100%;
  max-height: 80vh;
  object-fit: contain;
  border-radius: 12px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.5);
}

.preview-caption {
  margin: 0.65rem 0 0;
  font-size: 0.85rem;
  color: var(--text-muted);
  text-align: center;
}

@media (max-width: 640px) {
  .announcement-page {
    padding: 1rem 0.85rem 2rem;
  }

  .notice-hero {
    flex-direction: column;
    align-items: stretch;
    padding: 1.15rem;
  }

  .hero-right {
    justify-content: space-between;
  }

  .notice-toolbar {
    flex-direction: column;
  }

  .sort-select {
    width: 100%;
  }

  .notice-card-header {
    flex-direction: column;
    align-items: stretch;
  }

  .notice-header-end {
    width: 100%;
    margin-left: 0;
    justify-content: space-between;
  }

  .notice-meta {
    text-align: left;
  }

  .notice-title {
    font-size: 1.05rem;
  }

  .notice-body-layout--with-image {
    flex-direction: column;
    align-items: stretch;
  }

  .notice-body-layout--with-image .notice-figure {
    width: 100%;
    align-self: flex-end;
    max-width: 120px;
    margin-left: auto;
  }

  .notice-image {
    width: 100%;
    height: 72px;
  }
}
</style>
