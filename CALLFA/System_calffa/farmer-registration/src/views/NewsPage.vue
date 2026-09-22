<template>
  <div class="news-page" :class="{ 'light-theme': isLight }">
    <header class="notice-hero">
      <div class="hero-left">
        <div class="hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M4 4h16v16H4z" /><path d="M8 8h8M8 12h8M8 16h5" />
          </svg>
        </div>
        <div class="hero-text">
          <p class="hero-eyebrow">{{ $t('ui.cooperativeName') }}</p>
          <h1>{{ $t('ui.communityNews') }}</h1>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-stat">
          <span class="hero-stat-value">{{ visiblePostCount }}</span>
          <span class="hero-stat-label">{{ visiblePostCount === 1 ? $t('ui.post') : $t('ui.posts') }}</span>
        </div>
        <button v-if="canCreateNews" class="btn-post" type="button" @click="openCreateModal = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          {{ $t('common.createNews') }}
        </button>
        <button v-if="isPresident" class="btn-ghost-header" type="button" @click="goToPendingApprovals">
          {{ $t('common.pendingApprovals') }}
        </button>
      </div>
    </header>

    <div v-if="toastMessage" class="toast" :class="toastType">{{ toastMessage }}</div>

    <section class="notice-toolbar">
      <div class="search-wrap">
        <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
        </svg>
        <input v-model.trim="searchTitle" type="search" class="search-input" :placeholder="$t('ui.searchNews')" />
      </div>
      <select v-model="quickFilter" class="sort-select" :aria-label="$t('common.filter')">
        <option value="all">{{ $t('ui.allPublished') }}</option>
        <option v-if="isFarmer" value="my">{{ $t('ui.myPosts') }}</option>
        <option value="pending">{{ $t('common.pending') }}</option>
      </select>
      <select v-model="sortOrder" class="sort-select" :aria-label="$t('ui.sortOrder')">
        <option value="newest">{{ $t('ui.newestFirst') }}</option>
        <option value="oldest">{{ $t('ui.oldestFirst') }}</option>
      </select>
    </section>

    <div v-if="loading" class="state-panel">
      <div class="state-spinner" aria-hidden="true"></div>
      <p>{{ $t('ui.loadingNews') }}</p>
    </div>

    <template v-else>
      <section v-if="showPublishedSection" class="news-section">
        <div class="section-head">
          <h2>{{ isFarmer ? $t('ui.publishedNews') : $t('ui.communityFeed') }}</h2>
          <span>{{ publishedNews.length }} {{ publishedNews.length === 1 ? $t('ui.item') : $t('ui.items') }}</span>
        </div>
        <div v-if="publishedNews.length === 0" class="state-panel state-empty compact">
          <p>{{ $t('ui.noPublishedNews') }}</p>
        </div>
        <div v-else class="notice-list">
          <NewsPostCard
            v-for="(item, index) in publishedNews"
            :key="item.id"
            :item="item"
            :show-latest="index === 0 && sortOrder === 'newest' && quickFilter === 'all'"
            :can-edit="canEditNewsItem(item)"
            :can-delete="canDeleteNewsItem(item)"
            :api-origin="API_ORIGIN"
            @open="openDetailModal"
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>

      <section v-if="showMyPostsSection" class="news-section">
        <div class="section-head">
          <h2>{{ $t('ui.mySubmissions') }}</h2>
          <span>{{ mySubmissions.length }} {{ mySubmissions.length === 1 ? $t('ui.item') : $t('ui.items') }}</span>
        </div>
        <div v-if="mySubmissions.length === 0" class="state-panel state-empty compact">
          <p>{{ $t('ui.noSubmissionsYet') }}</p>
        </div>
        <div v-else class="notice-list">
          <NewsPostCard
            v-for="item in mySubmissions"
            :key="`mine-${item.id}`"
            :item="item"
            show-status
            :can-edit="canEditNewsItem(item)"
            :can-delete="canDeleteNewsItem(item)"
            :api-origin="API_ORIGIN"
            @open="openDetailModal"
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>

      <section v-if="showMyPostsSection && rejectedSubmissions.length" class="news-section">
        <div class="section-head">
          <h2>{{ $t('common.rejected') }}</h2>
          <span>{{ rejectedSubmissions.length }} {{ rejectedSubmissions.length === 1 ? $t('ui.item') : $t('ui.items') }}</span>
        </div>
        <div class="notice-list">
          <NewsPostCard
            v-for="item in rejectedSubmissions"
            :key="`rejected-${item.id}`"
            :item="item"
            show-status
            :can-edit="canEditNewsItem(item)"
            :can-delete="canDeleteNewsItem(item)"
            :api-origin="API_ORIGIN"
            @open="openDetailModal"
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>

      <section v-if="showPendingSection" class="news-section">
        <div class="section-head">
          <h2>{{ isPresident ? $t('ui.pendingForReview') : $t('ui.pendingNews') }}</h2>
          <span>{{ pendingPosts.length }} {{ pendingPosts.length === 1 ? $t('ui.item') : $t('ui.items') }}</span>
        </div>
        <div v-if="pendingPosts.length === 0" class="state-panel state-empty compact">
          <p>{{ $t('ui.noPendingPosts') }}</p>
        </div>
        <div v-else class="notice-list">
          <NewsPostCard
            v-for="item in pendingPosts"
            :key="`pending-${item.id}`"
            :item="item"
            show-status
            :can-edit="canEditNewsItem(item)"
            :can-delete="canDeleteNewsItem(item)"
            :api-origin="API_ORIGIN"
            @open="openDetailModal"
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>
    </template>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openDetailModalVisible && selectedNews"
          class="app-modal-overlay news-detail-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeDetailModal"
        >
          <div
            class="modal-content news-detail-modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="news-detail-title"
            @click.stop
          >
            <div class="news-detail-head">
              <div class="news-detail-author">
                <img
                  :src="detailAuthorAvatar"
                  :alt="selectedNews.author_name || 'Author'"
                  class="news-detail-avatar"
                />
                <div class="news-detail-author-meta">
                  <span class="news-detail-author-name">{{ selectedNews.author_name || selectedNews.author_role || 'Member' }}</span>
                  <span class="news-detail-meta-line">
                    {{ formatDetailDate(selectedNews.created_at) }}
                    <template v-if="selectedNews.author_role"> · {{ formatAuthorRole(selectedNews.author_role) }}</template>
                  </span>
                </div>
              </div>
              <button type="button" class="news-detail-close" :aria-label="$t('common.close')" @click="closeDetailModal">&times;</button>
            </div>
            <div class="modal-body news-detail-body">
              <h2 id="news-detail-title" class="news-detail-title">{{ selectedNews.title }}</h2>
              <img
                v-if="selectedNews.image"
                :src="resolveImageUrl(selectedNews.image)"
                :alt="selectedNews.title"
                class="news-detail-image"
                @click="openImagePreview(resolveImageUrl(selectedNews.image), selectedNews.title)"
              />
              <p class="news-detail-content">{{ selectedNews.content }}</p>
              <p v-if="selectedNews.status === 'rejected' && selectedNews.rejection_reason" class="news-detail-rejection">
                {{ $t('ui.rejectionReasonColon', { reason: selectedNews.rejection_reason }) }}
              </p>
            </div>
            <div
              v-if="canEditNewsItem(selectedNews) || canDeleteNewsItem(selectedNews)"
              class="news-detail-foot"
            >
              <div class="news-detail-foot-actions">
                <button
                  v-if="canEditNewsItem(selectedNews)"
                  type="button"
                  class="btn-ghost"
                  @click="editFromDetail"
                >
                  {{ $t('common.edit') }}
                </button>
                <button
                  v-if="canDeleteNewsItem(selectedNews)"
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

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openCreateModal"
          class="app-modal-overlay news-form-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeCreateModal"
        >
          <div class="modal-content modal modal-form" role="dialog" aria-labelledby="create-news-title" @click.stop>
            <div class="modal-head">
              <h3 id="create-news-title">{{ $t('common.createNews') }}</h3>
              <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeCreateModal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label for="create-news-title-input">Title <span class="req">*</span></label>
                <input id="create-news-title-input" v-model="createForm.title" type="text" maxlength="255" />
              </div>
              <div class="form-field">
                <label for="create-news-content">Content <span class="req">*</span></label>
                <textarea id="create-news-content" v-model="createForm.content" rows="4"></textarea>
              </div>
              <div class="form-field">
                <label>Image <span class="opt">(optional)</span></label>
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
              <button class="btn-post" type="button" :disabled="submitting" @click="submitCreateNews">
                {{ submitting ? $t('common.submitting') : $t('common.submitNews') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openEditNewsModal"
          class="app-modal-overlay news-form-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeEditModal"
        >
          <div class="modal-content modal modal-form" role="dialog" aria-labelledby="edit-news-title" @click.stop>
            <div class="modal-head">
              <h3 id="edit-news-title">Edit News</h3>
              <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeEditModal">&times;</button>
            </div>
            <div class="modal-body">
              <div class="form-field">
                <label for="edit-news-title-input">Title <span class="req">*</span></label>
                <input id="edit-news-title-input" v-model="editForm.title" type="text" maxlength="255" />
              </div>
              <div class="form-field">
                <label for="edit-news-content">Content <span class="req">*</span></label>
                <textarea id="edit-news-content" v-model="editForm.content" rows="4"></textarea>
              </div>
              <div class="form-field">
                <label>Image <span class="opt">(optional)</span></label>
                <div
                  class="upload-zone"
                  :class="{ 'upload-zone--has-file': editForm.imageFile || editingNews?.image }"
                  @click="triggerEditFileInput"
                  @dragover.prevent
                  @drop.prevent="onEditDrop"
                >
                  <input ref="editFileInput" type="file" accept="image/*" class="upload-input" @change="onEditImageSelected" />
                  <div v-if="editPreviewUrl" class="upload-preview">
                    <img :src="editPreviewUrl" alt="Preview" />
                    <button type="button" class="upload-clear" @click.stop="clearEditImage">{{ $t('common.removeNewImage') }}</button>
                  </div>
                  <div v-else-if="editingNews?.image" class="upload-preview">
                    <img :src="resolveImageUrl(editingNews.image)" alt="Current" />
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
              <button class="btn-post" type="button" :disabled="submitting" @click="submitEditNews">
                {{ submitting ? 'Saving...' : 'Save Changes' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openDeleteConfirmModal"
          class="app-modal-overlay news-form-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeDeleteModal"
        >
          <div class="modal-content modal modal-sm" role="alertdialog" @click.stop>
            <div class="modal-head">
              <h3>Delete news post?</h3>
              <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeDeleteModal">&times;</button>
            </div>
            <div class="modal-body">
              <p class="delete-warning">This post will be permanently removed.</p>
            </div>
            <div class="modal-foot">
              <button class="btn-danger" type="button" @click="confirmDeleteNews">{{ $t('common.delete') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="openImagePreviewModal"
          class="app-modal-overlay news-image-preview"
          :class="{ 'light-theme': isLight }"
          @click.self="closeImagePreview"
        >
          <div class="preview-frame" role="dialog" aria-modal="true" aria-label="News image preview" @click.stop>
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
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import NewsPostCard from '../components/NewsPostCard.vue'
import { getApiOrigin, mediaUrl } from '../utils/apiBase'

const API_ORIGIN = getApiOrigin()

const { t } = useI18n()
const authStore = useAuthStore()
const router = useRouter()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const formatAuthorRole = (role) => {
  const value = String(role || '').toLowerCase()
  const map = {
    farmer: t('ui.farmer'),
    treasurer: t('ui.treasurer'),
    president: t('ui.president'),
    admin: t('ui.admin'),
    operator: t('ui.operator'),
    member: t('common.member')
  }
  return map[value] || role || ''
}

const userRole = computed(() => (authStore.currentUser?.role || '').toLowerCase())
const currentUserId = computed(() => Number(authStore.currentUser?.id || 0))
const token = computed(() => authStore.token)

const isFarmer = computed(() => userRole.value === 'farmer')
const isPresident = computed(() => userRole.value === 'president')
const isAdmin = computed(() => userRole.value === 'admin')
const canCreateNews = computed(() => ['farmer', 'president'].includes(userRole.value))

const loading = ref(false)
const submitting = ref(false)
const errorMessage = ref('')
const successMessage = ref('')
const toastMessage = ref('')
const toastType = ref('success')
let toastTimer = null
const newsItems = ref([])

const openCreateModal = ref(false)
const openEditNewsModal = ref(false)
const openDeleteConfirmModal = ref(false)
const openImagePreviewModal = ref(false)
const openDetailModalVisible = ref(false)
const selectedNews = ref(null)
const pendingDeleteNewsId = ref(null)
const previewImageSrc = ref('')
const previewImageAlt = ref('News image')
const searchTitle = ref('')
const quickFilter = ref('all')
const sortOrder = ref('newest')
const createForm = ref({
  title: '',
  content: '',
  imageFile: null,
  imageFileName: ''
})
const editForm = ref({
  id: null,
  title: '',
  content: '',
  imageFile: null,
  imageFileName: ''
})
const editingNews = ref(null)
const createFileInput = ref(null)
const editFileInput = ref(null)
const createPreviewUrl = ref('')
const editPreviewUrl = ref('')

const filterBySearch = (items) => {
  const q = searchTitle.value.toLowerCase().trim()
  if (!q) return items
  return items.filter((item) => String(item.title || '').toLowerCase().includes(q))
}

const sortItems = (items) => [...items].sort((a, b) => {
  const aTime = new Date(a.created_at).getTime()
  const bTime = new Date(b.created_at).getTime()
  return sortOrder.value === 'oldest' ? aTime - bTime : bTime - aTime
})

const publishedNews = computed(() =>
  filterBySearch(sortItems(newsItems.value.filter((item) => item.status === 'published')))
)
const myOwnedNews = computed(() =>
  filterBySearch(sortItems(newsItems.value.filter((item) => item.author_id === currentUserId.value)))
)
const mySubmissions = computed(() =>
  myOwnedNews.value.filter((item) => item.status !== 'rejected')
)
const rejectedSubmissions = computed(() =>
  myOwnedNews.value.filter((item) => item.status === 'rejected')
)
const pendingPosts = computed(() => {
  const source = isFarmer.value ? myOwnedNews.value : newsItems.value
  return filterBySearch(sortItems(source.filter((item) => item.status === 'pending')))
})

const showPublishedSection = computed(() => quickFilter.value === 'all')
const showMyPostsSection = computed(() => isFarmer.value && (quickFilter.value === 'all' || quickFilter.value === 'my'))
const showPendingSection = computed(() => quickFilter.value === 'pending')
const visiblePostCount = computed(() => {
  if (quickFilter.value === 'my' && isFarmer.value) return myOwnedNews.value.length
  if (quickFilter.value === 'pending') return pendingPosts.value.length
  return publishedNews.value.length
})

const clearMessages = () => {
  errorMessage.value = ''
  successMessage.value = ''
}

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

const fetchNews = async () => {
  clearMessages()
  if (!token.value) {
    errorMessage.value = 'Please log in first.'
    return
  }

  loading.value = true
  try {
    const response = await fetch('/api/news', { headers: authHeaders() })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to fetch news')
    }

    newsItems.value = data.data || []
  } catch (err) {
    errorMessage.value = err.message || 'Failed to fetch news'
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

const onCreateDrop = (event) => {
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    createForm.value.imageFile = file
    createForm.value.imageFileName = file.name
    setCreatePreview(file)
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

const submitCreateNews = async () => {
  clearMessages()
  if (!canCreateNews.value) {
    errorMessage.value = 'You are not allowed to create news.'
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
    const response = await fetch('/api/news', {
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
      throw new Error(data.message || 'Failed to create news')
    }

    successMessage.value = data.message || 'News submitted successfully.'
    closeCreateModal()
    await fetchNews()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to create news'
  } finally {
    submitting.value = false
  }
}

const closeCreateModal = () => {
  openCreateModal.value = false
  clearCreateImage()
  createForm.value = {
    title: '',
    content: '',
    imageFile: null,
    imageFileName: ''
  }
}

const canEditNewsItem = (item) => {
  if (isAdmin.value) return true
  return Number(item.author_id) === currentUserId.value
}

const openEditModal = (item) => {
  if (!canEditNewsItem(item)) return
  editingNews.value = item
  editForm.value = {
    id: item.id,
    title: item.title || '',
    content: item.content || '',
    imageFile: null,
    imageFileName: ''
  }
  setEditPreview(null)
  openEditNewsModal.value = true
}

const closeEditModal = () => {
  openEditNewsModal.value = false
  editingNews.value = null
  clearEditImage()
  editForm.value = {
    id: null,
    title: '',
    content: '',
    imageFile: null,
    imageFileName: ''
  }
}

const onEditImageSelected = (event) => {
  const file = event.target.files?.[0] || null
  editForm.value.imageFile = file
  editForm.value.imageFileName = file ? file.name : ''
  setEditPreview(file)
}

const onEditDrop = (event) => {
  const file = event.dataTransfer?.files?.[0]
  if (file && file.type.startsWith('image/')) {
    editForm.value.imageFile = file
    editForm.value.imageFileName = file.name
    setEditPreview(file)
  }
}

const submitEditNews = async () => {
  clearMessages()
  const title = editForm.value.title.trim()
  const content = editForm.value.content.trim()
  const id = Number(editForm.value.id)

  if (!id || !title || !content) {
    errorMessage.value = 'Title and content are required.'
    return
  }

  const formData = new FormData()
  formData.append('news_id', String(id))
  formData.append('title', title)
  formData.append('content', content)
  if (editForm.value.imageFile) {
    formData.append('image', editForm.value.imageFile)
  }

  submitting.value = true
  try {
    const response = await fetch('/api/news/update', {
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
      throw new Error(data.message || 'Failed to update news')
    }

    closeEditModal()
    showToast('Post updated successfully.')
    await fetchNews()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to update news'
  } finally {
    submitting.value = false
  }
}

const openDeleteModal = (id) => {
  pendingDeleteNewsId.value = id
  openDeleteConfirmModal.value = true
}

const closeDeleteModal = () => {
  openDeleteConfirmModal.value = false
  pendingDeleteNewsId.value = null
}

const openImagePreview = (src, alt = 'News image') => {
  previewImageSrc.value = src
  previewImageAlt.value = alt
  openImagePreviewModal.value = true
}

const closeImagePreview = () => {
  openImagePreviewModal.value = false
  previewImageSrc.value = ''
  previewImageAlt.value = 'News image'
}

const detailAuthorAvatar = computed(() => {
  const item = selectedNews.value
  if (!item) return ''
  const name = item.author_name || 'User'
  const profile = item.author_profile
  if (profile) return resolveImageUrl(profile)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=166534&color=fff&size=128`
})

const formatDetailDate = (date) => {
  if (!date) return ''
  const d = new Date(date)
  if (Number.isNaN(d.getTime())) return ''
  return d.toLocaleString('en-PH', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Manila'
  })
}

const openDetailModal = (item) => {
  selectedNews.value = item
  openDetailModalVisible.value = true
}

const closeDetailModal = () => {
  openDetailModalVisible.value = false
  selectedNews.value = null
}

const editFromDetail = () => {
  const item = selectedNews.value
  if (!item) return
  closeDetailModal()
  openEditModal(item)
}

const deleteFromDetail = () => {
  const item = selectedNews.value
  if (!item) return
  closeDetailModal()
  openDeleteModal(item.id)
}

const anyNewsModalOpen = computed(() =>
  openDetailModalVisible.value ||
  openCreateModal.value ||
  openEditNewsModal.value ||
  openDeleteConfirmModal.value ||
  openImagePreviewModal.value
)

const syncBodyScrollLock = () => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('app-modal-open', anyNewsModalOpen.value)
}

watch(anyNewsModalOpen, syncBodyScrollLock, { immediate: true })

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
  if (openEditNewsModal.value) {
    closeEditModal()
    return
  }
  if (openCreateModal.value) {
    closeCreateModal()
  }
}

const confirmDeleteNews = async () => {
  if (!pendingDeleteNewsId.value) return
  await deleteNews(pendingDeleteNewsId.value)
  closeDeleteModal()
}

const canDeleteNewsItem = (item) => {
  if (isAdmin.value) return true
  return Number(item.author_id) === currentUserId.value
}

const deleteNews = async (id) => {
  clearMessages()

  try {
    const response = await fetch('/api/news/delete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...authHeaders()
      },
      body: JSON.stringify({ news_id: id })
    })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete news')
    }

    showToast('Post deleted successfully.')
    await fetchNews()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to delete news'
  }
}

const goToPendingApprovals = () => {
  router.push('/president-news-approvals')
}

const resolveImageUrl = (imagePath) => mediaUrl(imagePath)

onMounted(() => {
  fetchNews()
  if (typeof window !== 'undefined') {
    window.addEventListener('keydown', onGlobalKeydown)
  }
})

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('keydown', onGlobalKeydown)
  }
  if (typeof document !== 'undefined') {
    document.body.classList.remove('app-modal-open')
  }
  if (toastTimer) clearTimeout(toastTimer)
  revokePreviewUrl(createPreviewUrl.value)
  revokePreviewUrl(editPreviewUrl.value)
})
</script>
<style scoped>
.news-page {
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

.news-page *,
.news-page *::before,
.news-page *::after {
  box-sizing: border-box;
}

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

.hero-icon svg { width: 1.35rem; height: 1.35rem; }

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

.hero-desc {
  margin: 0.35rem 0 0;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.4;
  max-width: 36rem;
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

.btn-post svg { width: 0.9rem; height: 0.9rem; }
.btn-post:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.btn-post:disabled { opacity: 0.65; cursor: not-allowed; }

.btn-ghost-header {
  padding: 0.45rem 0.8rem;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  white-space: nowrap;
}

.btn-ghost-header:hover { background: rgba(255, 255, 255, 0.06); color: var(--text); }

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

.search-wrap { flex: 1; position: relative; min-width: 10rem; }

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

.search-input { padding-left: 2.1rem; }
.search-input::placeholder { color: var(--text-soft); }
.sort-select { width: auto; min-width: 9.5rem; cursor: pointer; flex: 0 0 auto; }
.sort-select option { background: #132119; color: var(--text); }

.news-section { margin-top: 1.15rem; }
.news-section:first-of-type { margin-top: 0; }

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.55rem;
  flex-wrap: wrap;
  margin-bottom: 0.65rem;
}

.section-head h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text);
}

.section-head span {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--text-soft);
}

.state-panel {
  text-align: center;
  padding: 2rem 1.15rem;
  border-radius: 12px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  color: var(--text-muted);
}

.state-panel.compact { padding: 1.15rem 0.85rem; }

.state-spinner {
  width: 1.75rem;
  height: 1.75rem;
  margin: 0 auto 0.75rem;
  border: 3px solid var(--line);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.toast {
  position: fixed;
  right: 1rem;
  top: 1rem;
  z-index: 12100;
  padding: 0.55rem 0.85rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.8rem;
  border: 1px solid var(--line-strong);
  background: rgba(20, 83, 45, 0.95);
  color: #dcfce7;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
  max-width: calc(100vw - 2rem);
}

.toast.error {
  border-color: rgba(248, 113, 113, 0.34);
  background: rgba(127, 29, 29, 0.95);
  color: #fee2e2;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 12000;
  background: rgba(6, 12, 9, 0.75);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0.85rem;
}

.modal {
  width: min(520px, 100%);
  max-height: min(88dvh, 720px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 14px;
  background: rgba(25, 38, 29, 0.98);
  border: 1px solid var(--line);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.modal-sm { width: min(400px, 100%); }

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-head h3 { margin: 0; font-size: 1rem; font-weight: 800; }

.modal-close {
  width: 2rem;
  height: 2rem;
  border: none;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.modal-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }

.modal-body { padding: 0.85rem 1rem; overflow-y: auto; flex: 1; min-height: 0; }

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.45rem;
  padding: 0.7rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.form-field { margin-bottom: 0.28rem; }
.form-field:last-child { margin-bottom: 0; }

.form-field label {
  display: block;
  margin-bottom: 0.12rem;
  font-size: 0.7rem;
  font-weight: 700;
  color: var(--text-muted);
}

.req { color: #f87171; }
.opt { font-weight: 500; color: var(--text-soft); }

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
  min-height: 2rem;
}

.form-field textarea { resize: vertical; min-height: 4.25rem; }

.upload-zone {
  position: relative;
  border: 1px dashed rgba(190, 235, 203, 0.25);
  border-radius: 8px;
  min-height: 3.5rem;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.15s, background 0.15s;
}

.upload-zone:hover { border-color: var(--line-strong); background: rgba(74, 222, 128, 0.04); }
.upload-zone--has-file { border-style: solid; }

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

.upload-placeholder svg { width: 1.35rem; height: 1.35rem; opacity: 0.6; }
.upload-placeholder span { font-size: 0.8rem; font-weight: 600; color: var(--text-muted); }
.upload-placeholder small { font-size: 0.68rem; }

.upload-preview { position: relative; }
.upload-preview img { width: 100%; max-height: 180px; object-fit: cover; display: block; }

.upload-clear,
.upload-keep {
  display: block;
  width: 100%;
  padding: 0.4rem;
  border: none;
  background: rgba(0, 0, 0, 0.55);
  color: var(--text);
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  text-align: center;
}

.upload-keep { cursor: default; color: var(--text-soft); }

.btn-ghost {
  padding: 0.45rem 0.85rem;
  border-radius: 9px;
  border: 1px solid var(--line);
  background: transparent;
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.btn-ghost:hover { background: rgba(255, 255, 255, 0.05); }

.btn-danger {
  padding: 0.45rem 0.85rem;
  border-radius: 9px;
  border: 1px solid rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.delete-warning {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.85rem;
  line-height: 1.45;
}

.preview-backdrop { z-index: 12200; }

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
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 50%;
  border: 1px solid var(--line);
  background: rgba(15, 23, 17, 0.95);
  color: var(--text);
  font-size: 1.35rem;
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
  padding: 0.5rem 1rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: #eefde6;
  text-align: center;
  background: rgba(28, 42, 33, 0.95);
  border: 1px solid var(--line);
  border-radius: 10px;
  box-shadow: 0 8px 28px rgba(0, 0, 0, 0.4);
  max-width: min(800px, 94vw);
  line-height: 1.4;
  word-break: break-word;
}

@media (max-width: 768px) {
  .news-page { padding: 0.55rem 0.55rem 1.25rem; }

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

  .btn-post,
  .btn-ghost-header {
    padding: 0.35rem 0.55rem;
    font-size: 0.72rem;
    border-radius: 8px;
  }

  .notice-toolbar {
    display: grid;
    grid-template-columns: 1fr 1fr;
    padding: 0.4rem;
    gap: 0.3rem;
    margin-bottom: 0.65rem;
    border-radius: 10px;
  }

  .search-wrap {
    grid-column: 1 / -1;
    min-width: 0;
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
  }

  .search-input { padding-left: 1.75rem; }
  .sort-select { width: 100%; min-width: 0; }

  .notice-list { gap: 0.6rem; }
  .section-head {
    margin-bottom: 0.45rem;
  }
  .section-head h2 { font-size: 0.88rem; }
  .section-head span { font-size: 0.7rem; }
}

/* ===== LIGHT MODE — colors only (geometry matches dark) ===== */
.news-page.light-theme {
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

.news-page.light-theme .notice-toolbar {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.06);
}

.news-page.light-theme .notice-hero {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border-color: #86efac;
  border-width: 1px;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.news-page.light-theme .hero-icon {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.news-page.light-theme .hero-eyebrow { color: #15803d; }
.news-page.light-theme .notice-hero h1 { color: #052e16; }
.news-page.light-theme .hero-desc { color: #166534; }

.news-page.light-theme .hero-stat {
  background: #f0fdf4;
  border-color: #bbf7d0;
  border-width: 1px;
}

.news-page.light-theme .hero-stat-value { color: #15803d; }
.news-page.light-theme .hero-stat-label { color: #64748b; }

.news-page.light-theme .btn-ghost-header {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  color: #14532d;
}

.news-page.light-theme .btn-ghost-header:hover {
  background: #f0fdf4;
  color: #052e16;
}

.news-page.light-theme .search-ico { color: #15803d; }

.news-page.light-theme .search-input,
.news-page.light-theme .sort-select {
  background: #ffffff;
  border-color: #cbd5e1;
  border-width: 1px;
  color: #052e16;
}

.news-page.light-theme .search-input::placeholder { color: #64748b; }
.news-page.light-theme .sort-select option { background: #ffffff; color: #052e16; }
.news-page.light-theme .section-head h2 { color: #052e16; }
.news-page.light-theme .section-head span { color: #166534; }

.news-page.light-theme .state-panel {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  color: #166534;
}

.news-page.light-theme .modal {
  background: #fffef9;
  border-color: #86efac;
  border-width: 1px;
  color: #052e16;
}

.news-page.light-theme .modal-head { border-bottom-color: #bbf7d0; }
.news-page.light-theme .modal-head h3 { color: #052e16; }
.news-page.light-theme .modal-close { background: #f0fdf4; color: #64748b; }
.news-page.light-theme .modal-foot { border-top-color: #bbf7d0; }
.news-page.light-theme .form-field label { color: #166534; }

.news-page.light-theme .form-field input,
.news-page.light-theme .form-field textarea {
  background: #ffffff;
  border-color: #cbd5e1;
  border-width: 1px;
  color: #052e16;
}

.news-page.light-theme .upload-zone {
  border-color: #bbf7d0;
  background: #f8fdf9;
}

.news-page.light-theme .upload-placeholder { color: #64748b; }
.news-page.light-theme .upload-placeholder span { color: #166534; }

.news-page.light-theme .btn-ghost {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  color: #14532d;
}

.news-page.light-theme .btn-ghost:hover { background: #f0fdf4; }
.news-page.light-theme .delete-warning { color: #166534; }

.news-page.light-theme .preview-close {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  color: #052e16;
}

.news-page.light-theme .preview-caption {
  color: #000000;
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
}

.news-page.light-theme :deep(.notice-card) {
  background: #ffffff;
  border-color: #86efac;
  border-width: 1px;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
}

.news-page.light-theme :deep(.notice-card--featured) { border-color: #22c55e; }
.news-page.light-theme :deep(.notice-card-header) { border-bottom-color: #e2e8f0; }
.news-page.light-theme :deep(.author-name),
.news-page.light-theme :deep(.notice-date) { color: #052e16; }
.news-page.light-theme :deep(.notice-time),
.news-page.light-theme :deep(.notice-card-footer) { color: #64748b; }
.news-page.light-theme :deep(.notice-title) { color: #052e16; }
.news-page.light-theme :deep(.notice-content) { color: #14532d; }
.news-page.light-theme :deep(.read-more-hint) { color: #15803d; }
.news-page.light-theme :deep(.notice-badge-latest) {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}
.news-page.light-theme :deep(.action-btn) {
  background: #f0fdf4;
  border-color: #bbf7d0;
  border-width: 1px;
  color: #15803d;
}
.news-page.light-theme :deep(.action-btn--danger) {
  color: #dc2626;
  background: #fee2e2;
  border-color: #ef4444;
  border-width: 1px;
}
.news-page.light-theme :deep(.action-btn--danger:hover) {
  color: #b91c1b;
  background: #fecaca;
  border-color: #dc2626;
}
.news-page.light-theme :deep(.notice-card-footer) { border-top-color: #e2e8f0; }
.news-page.light-theme :deep(.edited-tag) { background: #f0fdf4; color: #166534; }
.news-page.light-theme :deep(.status-pending) {
  color: #a16207;
  background: #fef9c3;
  border-color: #fde047;
}
.news-page.light-theme :deep(.status-published) {
  color: #15803d;
  background: #dcfce7;
  border-color: #86efac;
}
.news-page.light-theme :deep(.role-president) { color: #4338ca; }
.news-page.light-theme :deep(.role-admin) { color: #15803d; }
.news-page.light-theme :deep(.role-farmer) { color: #a16207; }
.news-page.light-theme :deep(.role-other) { color: #64748b; }
</style>

<style>
/* Detail modal — teleported to body */
.news-detail-overlay.app-modal-overlay {
  z-index: 12050 !important;
  font-size: 16px;
  line-height: 1.5;
}

.news-detail-modal.modal-content {
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

.news-detail-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.news-detail-author {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  min-width: 0;
  flex: 1;
}

.news-detail-avatar {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid rgba(190, 235, 203, 0.28);
  flex-shrink: 0;
}

.news-detail-author-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.news-detail-author-name {
  font-size: 0.9rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.news-detail-meta-line {
  font-size: 0.72rem;
  color: rgba(220, 238, 211, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.news-detail-close {
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

.news-detail-close:hover {
  background: rgba(255, 255, 255, 0.12);
  color: #eefde6;
}

.news-detail-body.modal-body {
  padding: 1rem 1.05rem 1.1rem;
}

.news-detail-title {
  margin: 0 0 0.75rem;
  font-size: 1.25rem;
  font-weight: 800;
  line-height: 1.3;
  color: #eefde6;
  word-break: break-word;
}

.news-detail-image {
  width: 100%;
  max-height: 280px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  margin-bottom: 0.85rem;
  cursor: zoom-in;
  display: block;
}

.news-detail-content {
  margin: 0;
  font-size: 0.95rem;
  line-height: 1.6;
  color: rgba(220, 238, 211, 0.82);
  white-space: pre-wrap;
  word-break: break-word;
}

.news-detail-rejection {
  margin: 0.85rem 0 0;
  padding: 0.55rem 0.7rem;
  border-radius: 8px;
  background: rgba(248, 113, 113, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.35);
  color: #fecaca;
  font-size: 0.82rem;
  line-height: 1.4;
}

.news-detail-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
  padding: 0.7rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.news-detail-foot-actions {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.news-detail-overlay .btn-ghost {
  padding: 0.45rem 0.85rem;
  border-radius: 9px;
  border: 1px solid rgba(190, 235, 203, 0.18);
  background: transparent;
  color: rgba(220, 238, 211, 0.78);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.news-detail-overlay .btn-danger {
  padding: 0.45rem 0.85rem;
  border-radius: 9px;
  border: 1px solid rgba(248, 113, 113, 0.4);
  background: rgba(248, 113, 113, 0.15);
  color: #fca5a5;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
}

.news-detail-overlay.light-theme .news-detail-modal.modal-content {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}

.news-detail-overlay.light-theme .news-detail-head,
.news-detail-overlay.light-theme .news-detail-foot {
  border-color: #bbf7d0;
}

.news-detail-overlay.light-theme .news-detail-author-name,
.news-detail-overlay.light-theme .news-detail-title {
  color: #052e16;
}

.news-detail-overlay.light-theme .news-detail-meta-line {
  color: #64748b;
}

.news-detail-overlay.light-theme .news-detail-content {
  color: #14532d;
}

.news-detail-overlay.light-theme .news-detail-close {
  background: #f0fdf4;
  color: #64748b;
}

.news-detail-overlay.light-theme .btn-ghost {
  background: #ffffff;
  border-color: #86efac;
  color: #14532d;
}

.news-detail-overlay.light-theme .news-detail-image {
  border-color: #bbf7d0;
}

@media (max-width: 640px) {
  .news-detail-modal.modal-content {
    width: calc(100vw - 1.2rem);
    max-width: calc(100vw - 1.2rem);
    max-height: calc(100dvh - 1.2rem);
  }
  .news-detail-title { font-size: 1.1rem; }
  .news-detail-content { font-size: 0.88rem; }
  .news-detail-image { max-height: 200px; }
  .news-detail-head,
  .news-detail-body.modal-body,
  .news-detail-foot {
    padding-left: 0.85rem;
    padding-right: 0.85rem;
  }
}

/* Create / Edit / Delete — teleported, above header, centered + blurred */
.news-form-overlay.app-modal-overlay {
  z-index: 12050 !important;
}

.news-form-overlay .modal.modal-content,
.news-form-overlay .modal-content.modal {
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

.news-form-overlay .modal-sm {
  width: min(400px, calc(100vw - 1.5rem));
  max-width: min(400px, calc(100vw - 1.5rem));
}

.news-form-overlay .modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.news-form-overlay .modal-head h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #f0fdf4;
}

.news-form-overlay .modal-close {
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

.news-form-overlay .modal-body {
  padding: 0.55rem 0.85rem !important;
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.news-form-overlay .modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.55rem 0.85rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
}

.news-form-overlay .form-field {
  margin-bottom: 0.28rem !important;
}
.news-form-overlay .form-field:last-child { margin-bottom: 0 !important; }
.news-form-overlay .form-field label {
  display: block;
  margin-bottom: 0.12rem !important;
  font-size: 0.7rem !important;
  font-weight: 700;
  color: rgba(220, 238, 211, 0.85);
  line-height: 1.2;
}
.news-form-overlay .form-field .req { color: #f87171; }
.news-form-overlay .form-field .opt { font-weight: 500; opacity: 0.7; }
.news-form-overlay .form-field input,
.news-form-overlay .form-field textarea {
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
.news-form-overlay .form-field textarea {
  resize: vertical;
  min-height: 4.25rem !important;
  height: auto !important;
}

.news-form-overlay .upload-zone {
  border: 1px dashed rgba(190, 235, 203, 0.35);
  border-radius: 8px;
  padding: 0.45rem 0.55rem !important;
  min-height: 3.25rem !important;
  cursor: pointer;
  background: rgba(0, 0, 0, 0.18);
}
.news-form-overlay .upload-input { display: none; }
.news-form-overlay .upload-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
  color: rgba(220, 238, 211, 0.65);
  text-align: center;
  font-size: 0.72rem;
  padding: 0.15rem 0 !important;
}
.news-form-overlay .upload-placeholder svg {
  width: 1.35rem;
  height: 1.35rem;
  margin-bottom: 0.05rem;
}
.news-form-overlay .upload-placeholder small { font-size: 0.62rem; opacity: 0.75; }
.news-form-overlay .upload-preview {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  align-items: flex-start;
}
.news-form-overlay .upload-preview img {
  width: 100%;
  max-height: 110px;
  object-fit: cover;
  border-radius: 8px;
}
.news-form-overlay .upload-clear {
  border: none;
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
  border-radius: 6px;
  padding: 0.3rem 0.55rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
}
.news-form-overlay .upload-keep {
  font-size: 0.75rem;
  color: rgba(220, 238, 211, 0.65);
}
.news-form-overlay .delete-warning {
  margin: 0;
  color: rgba(238, 253, 230, 0.9);
  line-height: 1.5;
}
.news-form-overlay .btn-post {
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
.news-form-overlay .btn-post:disabled { opacity: 0.6; cursor: not-allowed; }
.news-form-overlay .btn-danger {
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

.news-form-overlay.light-theme .modal.modal-content,
.news-form-overlay.light-theme .modal-content.modal {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}
.news-form-overlay.light-theme .modal-head,
.news-form-overlay.light-theme .modal-foot {
  border-color: #bbf7d0;
}
.news-form-overlay.light-theme .modal-head h3 { color: #052e16; }
.news-form-overlay.light-theme .modal-close {
  background: #f0fdf4;
  color: #166534;
}
.news-form-overlay.light-theme .form-field label { color: #166534; }
.news-form-overlay.light-theme .form-field input,
.news-form-overlay.light-theme .form-field textarea {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}
.news-form-overlay.light-theme .upload-zone {
  background: #f8fdf9;
  border-color: #86efac;
}
.news-form-overlay.light-theme .upload-placeholder { color: #64748b; }
.news-form-overlay.light-theme .delete-warning { color: #14532d; }

/* Image preview — teleported above the header with readable theme colors */
.news-image-preview.app-modal-overlay {
  z-index: 12150 !important;
  background: rgba(3, 12, 8, 0.82) !important;
  backdrop-filter: blur(12px) saturate(0.9) !important;
  -webkit-backdrop-filter: blur(12px) saturate(0.9) !important;
}

.news-image-preview .preview-frame {
  position: relative;
  width: min(800px, calc(100vw - 1.5rem));
  max-height: calc(100dvh - 1.5rem);
  margin: auto;
  display: flex;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
}

.news-image-preview .preview-img {
  display: block;
  width: 100%;
  max-height: calc(100dvh - 5.5rem);
  object-fit: contain;
  border: 1px solid rgba(190, 235, 203, 0.25);
  border-radius: 12px;
  background: #07140d;
}

.news-image-preview .preview-close {
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

.news-image-preview .preview-caption {
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

.news-image-preview.light-theme {
  background: rgba(15, 23, 42, 0.58) !important;
}

.news-image-preview.light-theme .preview-img {
  background: #f8fafc;
  border-color: #86efac;
}

.news-image-preview.light-theme .preview-close {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}

.news-image-preview.light-theme .preview-caption {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}
</style>
