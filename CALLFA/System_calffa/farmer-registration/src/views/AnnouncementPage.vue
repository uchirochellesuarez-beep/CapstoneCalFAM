<template>
  <div class="announcement-page" :class="{ 'light-theme': isLight }">
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
          <p class="hero-eyebrow">{{ $t('ui.cooperativeName') }}</p>
          <h1>{{ $t('ui.officialAnnouncements') }}</h1>
        </div>
      </div>
      <div class="hero-right">
        <button
          v-if="canCreateAnnouncement"
          class="btn-post"
          type="button"
          @click="openCreateModal = true"
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          {{ $t('common.postAnnouncement') }}
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
          :placeholder="$t('ui.searchAnnouncements')"
        />
      </div>
      <select v-model="sortOrder" class="sort-select" :aria-label="$t('ui.sortOrder')">
        <option value="newest">{{ $t('ui.newestFirst') }}</option>
        <option value="oldest">{{ $t('ui.oldestFirst') }}</option>
      </select>
    </section>

    <!-- Loading -->
    <div v-if="loading" class="state-panel">
      <div class="state-spinner" aria-hidden="true"></div>
      <p>{{ $t('ui.loadingAnnouncements') }}</p>
    </div>

    <!-- Empty -->
    <div v-else-if="filteredAnnouncements.length === 0" class="state-panel state-empty">
      <div class="state-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6">
          <path d="M4 10v4a2 2 0 002 2h1l4 4V4L7 8H6a2 2 0 00-2 2z" stroke-linecap="round" stroke-linejoin="round" />
        </svg>
      </div>
      <h2>{{ $t('ui.noAnnouncements') }}</h2>
      <p v-if="canCreateAnnouncement">{{ $t('ui.postFirstNotice') }}</p>
      <p v-else>{{ $t('ui.checkBackLater') }}</p>
      <button
        v-if="canCreateAnnouncement"
        class="btn-post btn-post-inline"
        type="button"
        @click="openCreateModal = true"
      >
        {{ $t('common.postAnnouncement') }}
      </button>
    </div>

    <!-- Announcement list -->
    <div v-else class="notice-list">
      <article
        v-for="(item, index) in filteredAnnouncements"
        :key="item.id"
        class="notice-card"
        :class="{ 'notice-card--featured': index === 0 && sortOrder === 'newest' }"
        role="button"
        tabindex="0"
        @click="openDetailModal(item)"
        @keydown.enter.prevent="openDetailModal(item)"
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
              <div class="notice-meta">
                <time class="notice-date" :datetime="item.created_at">{{ formatDateShort(item.created_at) }}</time>
                <span class="notice-time">{{ formatTimeOnly(item.created_at) }}</span>
              </div>
            </div>
          </div>
          <div
            v-if="canEditAnnouncement(item) || canDeleteAnnouncement(item)"
            class="notice-header-end"
          >
            <div class="notice-actions" @click.stop>
            <button
              v-if="canEditAnnouncement(item)"
              type="button"
              class="action-btn"
              :title="$t('common.edit')"
              @click="openEditModalFn(item)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10.5-10.5a2 2 0 000-2.83L17.83 7a2 2 0 00-2.83 0L4 16.5V20z" stroke-linecap="round" stroke-linejoin="round"/></svg>
            </button>
            <button
              v-if="canDeleteAnnouncement(item)"
              type="button"
              class="action-btn action-btn--danger"
              :title="$t('ui.deleteAnnouncementTitle')"
              :aria-label="$t('ui.deleteAnnouncementTitle')"
              @click="openDeleteModal(item.id)"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </button>
            </div>
          </div>
        </header>

        <div class="notice-card-body">
          <div v-if="index === 0 && sortOrder === 'newest'" class="notice-badge-latest">{{ $t('ui.latest') }}</div>

          <div class="notice-body-layout" :class="{ 'notice-body-layout--with-image': item.image }">
            <div class="notice-main">
              <h2 class="notice-title">{{ item.title }}</h2>
              <div class="notice-content-wrap">
                <p class="notice-content notice-content--clamped">{{ item.content }}</p>
              </div>
            </div>

            <figure v-if="item.image" class="notice-figure" @click.stop>
              <img
                :src="resolveImageUrl(item.image)"
                :alt="item.title"
                class="notice-image"
                loading="lazy"
                @click="openImagePreview(resolveImageUrl(item.image), item.title)"
              />
            </figure>
          </div>
        </div>

        <footer class="notice-card-footer">
          <span>{{ $t('ui.postedDate', { date: formatRelativeDate(item.created_at) }) }}</span>
          <div class="notice-footer-end">
            <span v-if="item.updated_at && item.updated_at !== item.created_at" class="edited-tag">{{ $t('ui.edited') }}</span>
            <span class="notice-view-count" :title="`${formatViewCount(item.view_count)} unique`">
              <svg class="notice-view-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-linecap="round" stroke-linejoin="round"/>
                <circle cx="12" cy="12" r="3" />
              </svg>
              {{ formatViewCount(item.view_count) }}
            </span>
          </div>
        </footer>
      </article>
    </div>

    <!-- Detail modal -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openDetailModalVisible && selectedAnnouncement"
          class="app-modal-overlay announcement-detail-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeDetailModal"
        >
          <div
            class="modal-content announcement-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="announcement-detail-title"
            @click.stop
          >
            <div class="announcement-detail-head">
              <div class="announcement-detail-author">
                <img
                  :src="resolveAuthorAvatar(selectedAnnouncement)"
                  :alt="selectedAnnouncement.author_name || 'Author'"
                  class="announcement-detail-avatar"
                />
                <div class="announcement-detail-author-meta">
                  <span class="announcement-detail-author-name">
                    {{ selectedAnnouncement.author_name || selectedAnnouncement.author_role || 'Officer' }}
                  </span>
                  <span class="announcement-detail-meta-line">
                    {{ formatDateShort(selectedAnnouncement.created_at) }}
                    <template v-if="selectedAnnouncement.author_role"> · {{ selectedAnnouncement.author_role }}</template>
                  </span>
                </div>
              </div>
              <button type="button" class="announcement-detail-close" :aria-label="$t('common.close')" @click="closeDetailModal">&times;</button>
            </div>
            <div class="modal-body announcement-detail-body">
              <h2 id="announcement-detail-title" class="announcement-detail-title">{{ selectedAnnouncement.title }}</h2>
              <img
                v-if="selectedAnnouncement.image"
                :src="resolveImageUrl(selectedAnnouncement.image)"
                :alt="selectedAnnouncement.title"
                class="announcement-detail-image"
                @click="openImagePreview(resolveImageUrl(selectedAnnouncement.image), selectedAnnouncement.title)"
              />
              <p class="announcement-detail-content">{{ selectedAnnouncement.content }}</p>
              <p class="announcement-detail-views">
                <svg class="notice-view-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="12" r="3" />
                </svg>
                {{ formatViewCount(selectedAnnouncement.view_count) }}
              </p>
            </div>
            <div
              v-if="canEditAnnouncement(selectedAnnouncement) || canDeleteAnnouncement(selectedAnnouncement)"
              class="announcement-detail-foot"
            >
              <div class="announcement-detail-foot-actions">
                <button
                  v-if="canEditAnnouncement(selectedAnnouncement)"
                  type="button"
                  class="btn-ghost"
                  @click="editFromDetail"
                >
                  {{ $t('common.edit') }}
                </button>
                <button
                  v-if="canDeleteAnnouncement(selectedAnnouncement)"
                  type="button"
                  class="btn-danger"
                  @click="deleteFromDetail"
                >
                  {{ $t('common.delete') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Create modal -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openCreateModal"
          class="app-modal-overlay announcement-form-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeCreateModal"
        >
          <div class="modal-content modal modal-form" role="dialog" aria-labelledby="create-title" @click.stop>
            <div class="modal-head">
              <h3 id="create-title">{{ $t('common.postAnnouncement') }}</h3>
              <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeCreateModal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label for="create-title-input">Title <span class="req">*</span></label>
                <input id="create-title-input" v-model="createForm.title" type="text" maxlength="255" placeholder="e.g. Schedule of Annual Assembly" />
              </div>
              <div class="form-field">
                <label for="create-content">{{ $t('ui.noticeContent') }} <span class="req">*</span></label>
                <textarea id="create-content" v-model="createForm.content" rows="4" placeholder="Write the full announcement details here..."></textarea>
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
                    <button type="button" class="upload-clear" @click.stop="clearCreateImage">{{ $t('common.remove') }}</button>
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
              <button class="btn-post" type="button" :disabled="submitting" @click="submitCreateAnnouncement">
                {{ submitting ? 'Publishing...' : 'Publish Notice' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit modal -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openEditModal"
          class="app-modal-overlay announcement-form-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeEditModal"
        >
          <div class="modal-content modal modal-form" role="dialog" aria-labelledby="edit-title" @click.stop>
            <div class="modal-head">
              <h3 id="edit-title">{{ $t('ui.editAnnouncement') }}</h3>
              <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeEditModal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label for="edit-title-input">Title <span class="req">*</span></label>
                <input id="edit-title-input" v-model="editForm.title" type="text" maxlength="255" />
              </div>
              <div class="form-field">
                <label for="edit-content">{{ $t('ui.noticeContent') }} <span class="req">*</span></label>
                <textarea id="edit-content" v-model="editForm.content" rows="4"></textarea>
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
                    <button type="button" class="upload-clear" @click.stop="clearEditImage">{{ $t('common.removeNewImage') }}</button>
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
              <button class="btn-post" type="button" :disabled="submitting" @click="submitEditAnnouncement">
                {{ submitting ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirm -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openDeleteConfirmModal"
          class="app-modal-overlay announcement-form-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeDeleteModal"
        >
          <div class="modal-content modal modal-sm" role="alertdialog" @click.stop>
            <div class="modal-head">
              <h3>{{ $t('ui.deleteAnnouncement') }}</h3>
              <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeDeleteModal">&times;</button>
            </div>
            <div class="modal-body">
              <p class="delete-warning">This notice will be permanently removed for all members.</p>
            </div>
            <div class="modal-foot">
              <button class="btn-danger" type="button" @click="confirmDeleteAnnouncement">{{ $t('common.delete') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Image preview -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openImagePreviewModal"
          class="app-modal-overlay announcement-image-preview"
          :class="{ 'light-theme': isLight }"
          @click.self="closeImagePreview"
        >
          <div class="preview-frame" role="dialog" aria-modal="true" aria-label="Announcement image preview" @click.stop>
            <button class="preview-close" type="button" :aria-label="$t('common.close')" @click="closeImagePreview">&times;</button>
            <img :src="previewImageSrc" :alt="previewImageAlt" class="preview-img" />
            <p v-if="previewImageAlt" class="preview-caption">{{ previewImageAlt }}</p>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const API_ORIGIN = ''

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const userRole = computed(() => (authStore.currentUser?.role || '').toLowerCase())
const userId = computed(() => authStore.currentUser?.id)
const isAdmin = computed(() => userRole.value === 'admin')
const token = computed(() => authStore.token)
const canCreateAnnouncement = computed(() => ['president', 'admin'].includes(userRole.value))

const canEditAnnouncement = (item) => {
  if (!userId.value) return false
  if (isAdmin.value) return true
  return Number(item.author_id) === Number(userId.value)
}

const canDeleteAnnouncement = (item) => {
  if (!userId.value) return false
  if (isAdmin.value) return true
  return Number(item.author_id) === Number(userId.value)
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

const openCreateModal = ref(false)
const openEditModal = ref(false)
const openDeleteConfirmModal = ref(false)
const openImagePreviewModal = ref(false)
const openDetailModalVisible = ref(false)
const selectedAnnouncement = ref(null)
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

    announcements.value = (data.data || []).map((row) => ({
      ...row,
      view_count: Number(row.view_count) || 0
    }))
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

const formatViewCount = (count) => {
  const n = Number(count) || 0
  return `${n} ${n === 1 ? 'View' : 'Views'}`
}

const applyViewCount = (announcementId, viewCount) => {
  const n = Number(viewCount) || 0
  const idx = announcements.value.findIndex((row) => Number(row.id) === Number(announcementId))
  if (idx !== -1) {
    announcements.value[idx] = {
      ...announcements.value[idx],
      view_count: n
    }
  }
  if (selectedAnnouncement.value && Number(selectedAnnouncement.value.id) === Number(announcementId)) {
    selectedAnnouncement.value = {
      ...selectedAnnouncement.value,
      view_count: n
    }
  }
}

const registerAnnouncementView = async (announcementId) => {
  if (!token.value || !announcementId) return
  try {
    const response = await fetch(`/api/announcements/${announcementId}/view`, {
      method: 'POST',
      headers: {
        ...authHeaders(),
        'Content-Type': 'application/json'
      }
    })
    const data = await response.json().catch(() => ({}))
    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }
    if (!response.ok || !data.success) return
    if (typeof data.view_count === 'number') {
      applyViewCount(announcementId, data.view_count)
    }
  } catch (err) {
    console.error('Failed to register announcement view:', err)
  }
}

const openDetailModal = (item) => {
  if (!item) return
  selectedAnnouncement.value = { ...item, view_count: Number(item.view_count) || 0 }
  openDetailModalVisible.value = true
  registerAnnouncementView(item.id)
}

const closeDetailModal = () => {
  openDetailModalVisible.value = false
  selectedAnnouncement.value = null
}

const editFromDetail = () => {
  const item = selectedAnnouncement.value
  if (!item) return
  closeDetailModal()
  openEditModalFn(item)
}

const deleteFromDetail = () => {
  const item = selectedAnnouncement.value
  if (!item) return
  closeDetailModal()
  openDeleteModal(item.id)
}

const anyAnnouncementModalOpen = computed(() =>
  openDetailModalVisible.value ||
  openCreateModal.value ||
  openEditModal.value ||
  openDeleteConfirmModal.value ||
  openImagePreviewModal.value
)

const syncBodyScrollLock = () => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('app-modal-open', anyAnnouncementModalOpen.value)
}

watch(anyAnnouncementModalOpen, syncBodyScrollLock, { immediate: true })

const onGlobalKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (openImagePreviewModal.value) {
    closeImagePreview()
    return
  }
  if (openDetailModalVisible.value) {
    closeDetailModal()
    return
  }
  if (openDeleteConfirmModal.value) {
    closeDeleteModal()
    return
  }
  if (openEditModal.value) {
    closeEditModal()
    return
  }
  if (openCreateModal.value) {
    closeCreateModal()
  }
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
  if (dayDiff === 0) return t('ui.today')
  if (dayDiff === 1) return t('ui.yesterday')
  if (dayDiff > 1 && dayDiff < 7) return t('ui.daysAgo', { n: dayDiff })
  return formatDateShort(date)
}

onMounted(() => {
  fetchAnnouncements()
  window.addEventListener('keydown', onGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onGlobalKeydown)
  if (typeof document !== 'undefined') {
    document.body.classList.remove('app-modal-open')
  }
})
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

  max-width: 100%;
  width: 100%;
  margin: 0 auto;
  padding: 1.25rem 1.25rem 2.25rem;
  min-height: 100vh;
  color: var(--text);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  box-sizing: border-box;
  overflow-x: hidden;
}

.announcement-page *,
.announcement-page *::before,
.announcement-page *::after {
  box-sizing: border-box;
}

/* Hero */
.notice-hero {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  padding: 1.15rem 1.25rem;
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(22, 101, 52, 0.35) 0%, rgba(28, 42, 33, 0.95) 55%);
  border: 1px solid var(--line);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28);
  margin-bottom: 0.9rem;
}

.hero-left {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
  min-width: 0;
}

.hero-icon {
  width: 2.75rem;
  height: 2.75rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: var(--green-dim);
  border: 1px solid var(--line-strong);
  color: var(--green);
}

.hero-icon svg {
  width: 1.35rem;
  height: 1.35rem;
}

.hero-eyebrow {
  margin: 0 0 0.15rem;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: none;
  color: var(--green);
}

.notice-hero h1 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.2;
}

.hero-right {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex-wrap: wrap;
}

.hero-stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.45rem 0.85rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid var(--line);
  min-width: 4.25rem;
}

.hero-stat-value {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--green);
  line-height: 1;
}

.hero-stat-label {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-soft);
  margin-top: 0.15rem;
}

.btn-post {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  border-radius: 9px;
  border: 1px solid var(--line-strong);
  background: linear-gradient(135deg, #dcfce7, #86efac);
  color: #14532d;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: filter 0.15s, transform 0.15s;
  white-space: nowrap;
}

.btn-post svg {
  width: 0.9rem;
  height: 0.9rem;
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
  gap: 0.55rem;
  margin-bottom: 1rem;
  padding: 0.7rem 0.8rem;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  flex-wrap: wrap;
}

.search-wrap {
  flex: 1;
  position: relative;
  min-width: 10rem;
}

.search-ico {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  width: 0.9rem;
  height: 0.9rem;
  color: var(--text-soft);
  pointer-events: none;
}

.search-input,
.sort-select {
  width: 100%;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.22);
  color: var(--text);
  font-size: 0.85rem;
  box-sizing: border-box;
  min-height: 2.4rem;
}

.search-input {
  padding-left: 2.1rem;
}

.search-input::placeholder {
  color: var(--text-soft);
}

.sort-select {
  width: auto;
  min-width: 9.5rem;
  cursor: pointer;
  flex: 0 0 auto;
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
  gap: 1.35rem;
}

.notice-card {
  position: relative;
  border-radius: 16px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  transition: box-shadow 0.2s, border-color 0.2s;
  cursor: pointer;
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
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem 0.85rem;
  padding: 0.85rem 1.15rem 0.7rem 1.25rem;
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
  gap: 0;
  margin-top: 0.08rem;
  text-align: left;
}

.notice-date {
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--text-soft);
  line-height: 1.15;
}

.notice-time {
  font-size: 0.52rem;
  color: var(--text-soft);
  opacity: 0.85;
  line-height: 1.15;
}

.notice-author {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  min-width: 0;
  flex: 1;
}

.author-avatar {
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 0.05rem;
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: rgba(0, 0, 0, 0.2);
}

.author-info {
  display: flex;
  flex-direction: column;
  gap: 0.02rem;
  min-width: 0;
  line-height: 1.15;
}

.author-name {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.author-role {
  font-size: 0.58rem;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}

.author-role.role-president { color: #a5b4fc; }
.author-role.role-admin { color: #86efac; }
.author-role.role-other { color: var(--text-soft); }

.notice-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-shrink: 0;
}

.action-btn {
  width: 2.5rem;
  height: 2.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
  color: #2dd4bf;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}

.action-btn svg {
  width: 1.2rem;
  height: 1.2rem;
}

.action-btn:hover {
  background: rgba(45, 212, 191, 0.12);
}

.action-btn--danger {
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.35);
  border-color: rgba(248, 113, 113, 0.55);
}

.action-btn--danger svg {
  width: 1.25rem;
  height: 1.25rem;
}

.action-btn--danger:hover {
  color: #fecaca;
  background: rgba(153, 27, 27, 0.55);
  border-color: #f87171;
}

.notice-card-body {
  padding: 1.15rem 1.35rem 1rem 1.5rem;
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
  margin: 0 0 0.55rem;
  font-size: 1.25rem;
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
  gap: 1rem;
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
  width: 148px;
  align-self: flex-start;
}

.notice-image {
  width: 148px;
  height: 112px;
  object-fit: cover;
  border-radius: 10px;
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
  margin-top: 0.35rem;
  font-size: 0.6875rem;
  color: var(--text-soft);
  text-align: center;
  line-height: 1.2;
}

.notice-content-wrap {
  margin-top: 0;
}

.notice-content {
  margin: 0;
  font-size: 0.975rem;
  line-height: 1.65;
  color: var(--text-muted);
  white-space: pre-wrap;
  word-break: break-word;
}

.notice-content--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.read-more-btn {
  margin-top: 0.55rem;
  padding: 0;
  border: none;
  background: none;
  color: var(--green);
  font-size: 0.875rem;
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
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  padding: 0.75rem 1.35rem 0.9rem 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.8125rem;
  color: var(--text-soft);
}

.notice-footer-end {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  margin-left: auto;
}

.notice-view-count,
.announcement-detail-views {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-weight: 700;
  color: var(--text-muted);
}

.notice-view-ico {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
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

.modal-form {
  width: min(580px, 100%);
}

.modal-head h3 {
  margin: 0;
  font-size: 1.2rem;
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
  margin-bottom: 0.28rem;
}

.form-field:last-child {
  margin-bottom: 0;
}

.form-field label {
  display: block;
  margin-bottom: 0.12rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text);
}

.req { color: #f87171; }
.opt { font-weight: 600; color: var(--text-muted); }

.form-field input,
.form-field textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 0.35rem 0.55rem;
  border-radius: 8px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.24);
  color: var(--text);
  font-size: 0.82rem;
  font-family: inherit;
  line-height: 1.35;
  min-height: 2rem;
}

.form-field input::placeholder,
.form-field textarea::placeholder {
  color: rgba(220, 238, 211, 0.45);
  opacity: 1;
}

.form-field textarea {
  resize: vertical;
  min-height: 4.25rem;
}

.upload-zone {
  position: relative;
  border: 1px dashed rgba(190, 235, 203, 0.25);
  border-radius: 8px;
  min-height: 3.5rem;
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
  gap: 0.1rem;
  padding: 0.35rem 0.55rem;
  color: var(--text-soft);
  text-align: center;
}

.upload-placeholder svg {
  width: 1.35rem;
  height: 1.35rem;
  opacity: 0.6;
}

.upload-placeholder span {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--text-muted);
}

.upload-placeholder small {
  font-size: 0.62rem;
  color: var(--text-soft);
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
  padding: 0.65rem 1.15rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text);
  font-weight: 700;
  font-size: 0.9375rem;
  cursor: pointer;
}

.btn-ghost:hover {
  background: rgba(255, 255, 255, 0.05);
}

.btn-danger {
  padding: 0.65rem 1.25rem;
  border-radius: 10px;
  border: 2px solid #dc2626;
  background: #dc2626;
  color: #ffffff;
  font-weight: 700;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: background 0.15s, border-color 0.15s;
}

.btn-danger:hover {
  background: #b91c1c;
  border-color: #b91c1c;
}

.delete-warning {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.975rem;
  line-height: 1.55;
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
  margin: 0.85rem 0 0;
  padding: 0.7rem 1.35rem;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #000000;
  text-align: center;
  background: #ffffff;
  border: 2px solid #86efac;
  border-radius: 12px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
  max-width: min(800px, 94vw);
  line-height: 1.45;
  word-break: break-word;
}

@media (max-width: 768px) {
  .announcement-page {
    padding: 0.55rem 0.55rem 1.25rem;
  }

  .notice-hero {
    flex-direction: row;
    flex-wrap: nowrap;
    align-items: center;
    padding: 0.5rem 0.65rem;
    gap: 0.45rem;
    margin-bottom: 0.5rem;
    border-radius: 12px;
  }

  .hero-left {
    gap: 0.45rem;
    min-width: 0;
  }

  .hero-icon {
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 8px;
  }

  .hero-icon svg {
    width: 0.95rem;
    height: 0.95rem;
  }

  .hero-eyebrow {
    margin: 0 0 0.05rem;
    font-size: 0.55rem;
    letter-spacing: 0.06em;
  }

  .notice-hero h1 {
    font-size: 1rem;
    line-height: 1.15;
  }

  .hero-right {
    flex-shrink: 0;
    gap: 0.3rem;
    justify-content: flex-end;
    flex-wrap: wrap;
  }

  .hero-stat {
    min-width: 0;
    padding: 0.25rem 0.45rem;
    border-radius: 8px;
  }

  .hero-stat-value { font-size: 0.95rem; }
  .hero-stat-label {
    font-size: 0.52rem;
    margin-top: 0.05rem;
  }

  .btn-post {
    padding: 0.35rem 0.55rem;
    font-size: 0.72rem;
    border-radius: 8px;
  }

  .notice-toolbar {
    display: flex;
    flex-direction: column;
    padding: 0.4rem;
    gap: 0.3rem;
    margin-bottom: 0.65rem;
    border-radius: 10px;
  }

  .search-wrap {
    min-width: 0;
    width: 100%;
  }

  .search-ico {
    left: 0.5rem;
    width: 0.8rem;
    height: 0.8rem;
  }

  .search-input,
  .sort-select {
    padding: 0.35rem 0.5rem;
    font-size: 0.78rem;
    min-height: 2rem;
    border-radius: 8px;
    width: 100%;
  }

  .search-input { padding-left: 1.75rem; }
  .sort-select { min-width: 0; }

  .notice-card-header {
    padding: 0.7rem 0.75rem 0.55rem 0.85rem;
    gap: 0.4rem;
  }

  .notice-card-body {
    padding: 0.6rem 0.75rem 0.55rem 0.85rem;
  }

  .notice-card-footer {
    padding: 0.45rem 0.75rem 0.55rem 0.85rem;
  }

  .notice-title {
    font-size: 0.95rem;
  }

  .notice-content {
    font-size: 0.8rem;
    line-height: 1.4;
  }

  .notice-body-layout--with-image {
    gap: 0.55rem;
  }

  .notice-figure {
    width: 88px;
  }

  .notice-image {
    width: 88px;
    height: 66px;
  }

  .author-name { font-size: 0.72rem; }
  .author-role { font-size: 0.54rem; }

  .author-avatar {
    width: 2.25rem;
    height: 2.25rem;
  }
}

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
.announcement-page.light-theme {
  --bg-card: #ffffff;
  --line: rgba(34, 197, 94, 0.28);
  --line-strong: #86efac;
  --green: #15803d;
  --green-dim: #dcfce7;
  --text: #052e16;
  --text-muted: #166534;
  --text-soft: #64748b;

  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: var(--text);
}

.announcement-page.light-theme .notice-hero {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border-color: #86efac;
  border-width: 1px;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.announcement-page.light-theme .notice-toolbar {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.06);
}

.announcement-page.light-theme .hero-icon {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.announcement-page.light-theme .hero-eyebrow {
  color: #15803d;
}

.announcement-page.light-theme .notice-hero h1 {
  color: #052e16;
}

.announcement-page.light-theme .hero-stat {
  background: #f0fdf4;
  border-color: #bbf7d0;
  border-width: 1px;
}

.announcement-page.light-theme .hero-stat-value {
  color: #15803d;
}

.announcement-page.light-theme .hero-stat-label {
  color: #64748b;
}

.announcement-page.light-theme .search-ico {
  color: #15803d;
}

.announcement-page.light-theme .search-input,
.announcement-page.light-theme .sort-select {
  background: #ffffff;
  border-color: #cbd5e1;
  border-width: 1px;
  color: #052e16;
}

.announcement-page.light-theme .search-input::placeholder {
  color: #64748b;
}

.announcement-page.light-theme .sort-select option {
  background: #ffffff;
  color: #052e16;
}

.announcement-page.light-theme .state-panel {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  color: #166534;
}

.announcement-page.light-theme .state-empty h2 {
  color: #052e16;
}

.announcement-page.light-theme .state-empty p {
  color: #166534;
}

.announcement-page.light-theme .notice-card {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
}

.announcement-page.light-theme .notice-card:hover {
  border-color: #22c55e;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.12);
}

.announcement-page.light-theme .notice-card--featured {
  border-color: #22c55e;
  box-shadow: 0 0 0 1px rgba(34, 197, 94, 0.2), 0 8px 22px rgba(22, 101, 52, 0.12);
}

.announcement-page.light-theme .notice-card-header {
  border-bottom: 1px solid #e2e8f0;
}

.announcement-page.light-theme .author-name {
  color: #052e16;
}

.announcement-page.light-theme .notice-date,
.announcement-page.light-theme .notice-time,
.announcement-page.light-theme .notice-card-footer,
.announcement-page.light-theme .notice-figure-cap {
  color: #64748b;
}

.announcement-page.light-theme .author-role.role-president { color: #4338ca; }
.announcement-page.light-theme .author-role.role-admin { color: #15803d; }
.announcement-page.light-theme .author-role.role-other { color: #64748b; }

.announcement-page.light-theme .notice-title {
  color: #052e16;
}

.announcement-page.light-theme .notice-content {
  color: #14532d;
}

.announcement-page.light-theme .read-more-btn {
  color: #15803d;
}

.announcement-page.light-theme .read-more-btn:hover {
  color: #052e16;
}

.announcement-page.light-theme .notice-badge-latest {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.announcement-page.light-theme .action-btn {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.announcement-page.light-theme .action-btn--danger {
  color: #dc2626;
  background: #fee2e2;
  border: 2px solid #ef4444;
}

.announcement-page.light-theme .action-btn--danger:hover {
  color: #b91c1c;
  background: #fecaca;
  border-color: #dc2626;
}

.announcement-page.light-theme .notice-card-footer {
  border-top: 1px solid #e2e8f0;
}

.announcement-page.light-theme .edited-tag {
  background: #f0fdf4;
  color: #166534;
}

.announcement-page.light-theme .modal {
  background: #fffef9;
  border: 2px solid #86efac;
  color: #052e16;
}

.announcement-page.light-theme .modal-head {
  border-bottom: 1px solid #bbf7d0;
}

.announcement-page.light-theme .modal-head h3 {
  color: #000000;
  font-size: 1.25rem;
}

.announcement-page.light-theme .modal-close {
  background: #f0fdf4;
  color: #000000;
  border: 1.5px solid #cbd5e1;
}

.announcement-page.light-theme .modal-foot {
  border-top: 1px solid #bbf7d0;
}

.announcement-page.light-theme .form-field label {
  color: #000000;
  font-size: 1rem;
}

.announcement-page.light-theme .form-field input,
.announcement-page.light-theme .form-field textarea {
  background: #ffffff;
  border: 2px solid #94a3b8;
  color: #000000;
  font-size: 1rem;
}

.announcement-page.light-theme .form-field input::placeholder,
.announcement-page.light-theme .form-field textarea::placeholder {
  color: #475569;
  opacity: 1;
}

.announcement-page.light-theme .opt {
  color: #334155;
}

.announcement-page.light-theme .upload-zone {
  border-color: #86efac;
  background: #f8fdf9;
}

.announcement-page.light-theme .upload-placeholder {
  color: #334155;
}

.announcement-page.light-theme .upload-placeholder span {
  color: #000000;
  font-size: 1rem;
}

.announcement-page.light-theme .upload-placeholder small {
  color: #475569;
  font-size: 0.875rem;
}

.announcement-page.light-theme .btn-ghost {
  background: #ffffff;
  border: 2px solid #64748b;
  color: #000000;
  font-size: 1rem;
}

.announcement-page.light-theme .btn-ghost:hover {
  background: #f1f5f9;
  border-color: #475569;
}

.announcement-page.light-theme .delete-warning {
  color: #000000;
  font-size: 1rem;
}

.announcement-page.light-theme .btn-danger {
  background: #dc2626;
  border: 2px solid #b91c1c;
  color: #ffffff;
}

.announcement-page.light-theme .btn-danger:hover {
  background: #b91c1c;
  border-color: #991b1b;
  color: #ffffff;
}

.announcement-page.light-theme .preview-close {
  background: #ffffff;
  border: 1.5px solid #86efac;
  color: #000000;
}

.announcement-page.light-theme .preview-caption {
  color: #000000;
  background: #ffffff;
  border: 2px solid #86efac;
}

.announcement-page.light-theme .notice-view-count,
.announcement-page.light-theme .announcement-detail-views {
  color: #166534;
}
</style>

<style>
/* Detail modal — teleported to body */
.announcement-detail-overlay.app-modal-overlay {
  z-index: 12050 !important;
  font-size: 16px;
  line-height: 1.5;
}

.announcement-detail-modal.modal-content {
  width: min(40rem, calc(100vw - 1.5rem));
  max-width: min(40rem, calc(100vw - 1.5rem));
  max-height: min(88dvh, 860px);
  background: rgba(25, 38, 29, 0.98);
  border: 1px solid rgba(190, 235, 203, 0.18);
  color: #eefde6;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.announcement-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.announcement-detail-author {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
}

.announcement-detail-avatar {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(190, 235, 203, 0.28);
  flex-shrink: 0;
}

.announcement-detail-author-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.announcement-detail-author-name {
  font-size: 0.9rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.announcement-detail-meta-line {
  font-size: 0.72rem;
  color: rgba(220, 238, 211, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.announcement-detail-close {
  width: 2.1rem;
  height: 2.1rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(220, 238, 211, 0.72);
  font-size: 1.4rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.announcement-detail-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

.announcement-detail-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1rem 1.1rem 1.15rem;
}

.announcement-detail-title {
  margin: 0 0 0.75rem;
  font-size: 1.2rem;
  font-weight: 800;
  line-height: 1.3;
  color: #f0fdf4;
}

.announcement-detail-image {
  display: block;
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  border-radius: 10px;
  margin-bottom: 0.85rem;
  cursor: zoom-in;
}

.announcement-detail-content {
  margin: 0 0 0.85rem;
  font-size: 0.95rem;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
  color: rgba(238, 253, 230, 0.92);
}

.announcement-detail-views {
  margin: 0;
  font-size: 0.8rem;
  color: rgba(220, 238, 211, 0.62);
}

.announcement-detail-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.75rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.announcement-detail-foot-actions {
  display: flex;
  align-items: center;
  gap: 0.45rem;
}

.announcement-detail-overlay .btn-ghost {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.1rem;
  padding: 0.4rem 0.85rem;
  border-radius: 9px;
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: transparent;
  color: #eefde6;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.announcement-detail-overlay .btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.1rem;
  padding: 0.4rem 0.85rem;
  border: none;
  border-radius: 9px;
  background: #dc2626;
  color: #fff;
  font-weight: 800;
  font-size: 0.8rem;
  cursor: pointer;
}

.announcement-detail-overlay.light-theme .announcement-detail-modal.modal-content {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}

.announcement-detail-overlay.light-theme .announcement-detail-head,
.announcement-detail-overlay.light-theme .announcement-detail-foot {
  border-color: #bbf7d0;
}

.announcement-detail-overlay.light-theme .announcement-detail-author-name,
.announcement-detail-overlay.light-theme .announcement-detail-title {
  color: #052e16;
}

.announcement-detail-overlay.light-theme .announcement-detail-meta-line,
.announcement-detail-overlay.light-theme .announcement-detail-views {
  color: #64748b;
}

.announcement-detail-overlay.light-theme .announcement-detail-content {
  color: #14532d;
}

.announcement-detail-overlay.light-theme .announcement-detail-close {
  background: #f0fdf4;
  color: #166534;
}

.announcement-detail-overlay.light-theme .btn-ghost {
  background: #ffffff;
  border-color: #86efac;
  color: #166534;
}

@media (max-width: 768px) {
  .announcement-detail-modal.modal-content {
    width: calc(100vw - 1rem);
    max-width: calc(100vw - 1rem);
    max-height: min(90dvh, 900px);
  }

  .announcement-detail-title {
    font-size: 1.05rem;
  }

  .announcement-detail-content {
    font-size: 0.88rem;
  }
}

/* Create / Edit / Delete — teleported, above header, centered + blurred */
.announcement-form-overlay.app-modal-overlay {
  z-index: 12050 !important;
}

.announcement-form-overlay .modal.modal-content,
.announcement-form-overlay .modal-content.modal {
  width: min(580px, calc(100vw - 1.5rem));
  max-width: min(580px, calc(100vw - 1.5rem));
  max-height: min(88dvh, 720px);
  background: rgba(25, 38, 29, 0.98);
  border: 1px solid rgba(190, 235, 203, 0.18);
  color: #eefde6;
  border-radius: 14px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.announcement-form-overlay .modal-sm {
  width: min(400px, calc(100vw - 1.5rem));
  max-width: min(400px, calc(100vw - 1.5rem));
}

.announcement-form-overlay .modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.announcement-form-overlay .modal-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #f0fdf4;
}

.announcement-form-overlay .modal-close {
  width: 1.85rem;
  height: 1.85rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: rgba(220, 238, 211, 0.72);
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.announcement-form-overlay .modal-body {
  padding: 0.55rem 0.85rem !important;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.announcement-form-overlay .modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.announcement-form-overlay .form-field {
  margin-bottom: 0.28rem !important;
}
.announcement-form-overlay .form-field:last-child { margin-bottom: 0 !important; }
.announcement-form-overlay .form-field label {
  display: block;
  margin-bottom: 0.12rem !important;
  font-size: 0.7rem !important;
  font-weight: 700;
  color: rgba(220, 238, 211, 0.85);
  line-height: 1.2;
}
.announcement-form-overlay .form-field .req { color: #f87171; }
.announcement-form-overlay .form-field .opt { font-weight: 500; opacity: 0.7; }
.announcement-form-overlay .form-field input,
.announcement-form-overlay .form-field textarea {
  width: 100% !important;
  box-sizing: border-box !important;
  padding: 0.35rem 0.55rem !important;
  min-height: 2rem !important;
  height: auto !important;
  max-height: none !important;
  border-radius: 8px !important;
  border: 1px solid rgba(190, 235, 203, 0.22) !important;
  background: rgba(0, 0, 0, 0.28) !important;
  color: #eefde6 !important;
  font-size: 0.82rem !important;
  font-family: inherit;
  line-height: 1.35 !important;
}
.announcement-form-overlay .form-field textarea {
  resize: vertical;
  min-height: 4.25rem !important;
  height: auto !important;
}

.announcement-form-overlay .upload-zone {
  border: 1px dashed rgba(190, 235, 203, 0.35);
  border-radius: 8px;
  padding: 0.45rem 0.55rem !important;
  min-height: 3.25rem !important;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.18);
}
.announcement-form-overlay .upload-input { display: none; }
.announcement-form-overlay .upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  color: rgba(220, 238, 211, 0.65);
  text-align: center;
  font-size: 0.72rem;
  padding: 0.15rem 0 !important;
}
.announcement-form-overlay .upload-placeholder svg {
  width: 1.35rem;
  height: 1.35rem;
  margin-bottom: 0.05rem;
}
.announcement-form-overlay .upload-placeholder small { font-size: 0.62rem; opacity: 0.75; }
.announcement-form-overlay .upload-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: flex-start;
}
.announcement-form-overlay .upload-preview img {
  width: 100%;
  max-height: 110px;
  object-fit: cover;
  border-radius: 8px;
}
.announcement-form-overlay .upload-clear {
  border: none;
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.announcement-form-overlay .upload-keep {
  font-size: 0.75rem;
  color: rgba(220, 238, 211, 0.65);
}
.announcement-form-overlay .delete-warning {
  margin: 0;
  color: rgba(238, 253, 230, 0.9);
  line-height: 1.5;
}
.announcement-form-overlay .btn-post {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 2.35rem;
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 9px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
}
.announcement-form-overlay .btn-post:disabled { opacity: 0.6; cursor: not-allowed; }
.announcement-form-overlay .btn-danger {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  padding: 0.45rem 1rem;
  border: none;
  border-radius: 9px;
  background: #dc2626;
  color: #fff;
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
}

.announcement-form-overlay.light-theme .modal.modal-content,
.announcement-form-overlay.light-theme .modal-content.modal {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}
.announcement-form-overlay.light-theme .modal-head,
.announcement-form-overlay.light-theme .modal-foot {
  border-color: #bbf7d0;
}
.announcement-form-overlay.light-theme .modal-head h3 { color: #052e16; }
.announcement-form-overlay.light-theme .modal-close {
  background: #f0fdf4;
  color: #166534;
}
.announcement-form-overlay.light-theme .form-field label { color: #166534; }
.announcement-form-overlay.light-theme .form-field input,
.announcement-form-overlay.light-theme .form-field textarea {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}
.announcement-form-overlay.light-theme .upload-zone {
  background: #f8fdf9;
  border-color: #86efac;
}
.announcement-form-overlay.light-theme .upload-placeholder { color: #64748b; }
.announcement-form-overlay.light-theme .delete-warning { color: #14532d; }

/* Image preview — teleported above the header with readable theme colors */
.announcement-image-preview.app-modal-overlay {
  z-index: 12150 !important;
  background: rgba(3, 12, 8, 0.82) !important;
  backdrop-filter: blur(12px) saturate(0.9) !important;
  -webkit-backdrop-filter: blur(12px) saturate(0.9) !important;
}

.announcement-image-preview .preview-frame {
  position: relative;
  width: min(800px, calc(100vw - 1.5rem));
  max-height: calc(100dvh - 1.5rem);
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.announcement-image-preview .preview-img {
  display: block;
  width: 100%;
  max-height: calc(100dvh - 5.5rem);
  object-fit: contain;
  border: 1px solid rgba(190, 235, 203, 0.25);
  border-radius: 12px;
  background: #07140d;
}

.announcement-image-preview .preview-close {
  position: absolute;
  top: 0.55rem;
  right: 0.55rem;
  width: 2.15rem;
  height: 2.15rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 50%;
  background: rgba(5, 20, 12, 0.92);
  color: #ffffff;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  z-index: 2;
}

.announcement-image-preview .preview-caption {
  width: fit-content;
  max-width: 100%;
  margin: 0.55rem 0 0;
  padding: 0.45rem 0.75rem;
  border: 1px solid rgba(190, 235, 203, 0.22);
  border-radius: 9px;
  background: rgba(15, 39, 25, 0.96);
  color: #f0fdf4;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: center;
  word-break: break-word;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.35);
}

.announcement-image-preview.light-theme {
  background: rgba(15, 23, 42, 0.58) !important;
}

.announcement-image-preview.light-theme .preview-img {
  background: #f8fafc;
  border-color: #86efac;
}

.announcement-image-preview.light-theme .preview-close {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}

.announcement-image-preview.light-theme .preview-caption {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}
</style>
