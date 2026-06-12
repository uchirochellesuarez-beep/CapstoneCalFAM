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
          <p class="hero-eyebrow">CALFFA Cooperative</p>
          <h1>Community News</h1>
          <p class="hero-desc">Share updates from farmers and officers. Farmer posts require president approval.</p>
        </div>
      </div>
      <div class="hero-right">
        <div class="hero-stat">
          <span class="hero-stat-value">{{ visiblePostCount }}</span>
          <span class="hero-stat-label">{{ visiblePostCount === 1 ? 'Post' : 'Posts' }}</span>
        </div>
        <button v-if="canCreateNews" class="btn-post" type="button" @click="openCreateModal = true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
            <path d="M12 5v14M5 12h14" stroke-linecap="round" />
          </svg>
          Create News
        </button>
        <button v-if="isPresident" class="btn-ghost-header" type="button" @click="goToPendingApprovals">
          Pending Approvals
        </button>
      </div>
    </header>

    <div v-if="toastMessage" class="toast" :class="toastType">{{ toastMessage }}</div>

    <section class="notice-toolbar">
      <div class="search-wrap">
        <svg class="search-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
        </svg>
        <input v-model.trim="searchTitle" type="search" class="search-input" placeholder="Search news by title..." />
      </div>
      <select v-model="quickFilter" class="sort-select" aria-label="Filter">
        <option value="all">All published</option>
        <option v-if="isFarmer" value="my">My posts</option>
        <option value="pending">Pending</option>
      </select>
      <select v-model="sortOrder" class="sort-select" aria-label="Sort order">
        <option value="newest">Newest first</option>
        <option value="oldest">Oldest first</option>
      </select>
    </section>

    <div v-if="loading" class="state-panel">
      <div class="state-spinner" aria-hidden="true"></div>
      <p>Loading news...</p>
    </div>

    <template v-else>
      <section v-if="showPublishedSection" class="news-section">
        <div class="section-head">
          <h2>{{ isFarmer ? 'Published News' : 'Community Feed' }}</h2>
          <span>{{ publishedNews.length }} {{ publishedNews.length === 1 ? 'item' : 'items' }}</span>
        </div>
        <div v-if="publishedNews.length === 0" class="state-panel state-empty compact">
          <p>No published news available.</p>
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
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>

      <section v-if="showMyPostsSection" class="news-section">
        <div class="section-head">
          <h2>My Submissions</h2>
          <span>{{ mySubmissions.length }} {{ mySubmissions.length === 1 ? 'item' : 'items' }}</span>
        </div>
        <div v-if="mySubmissions.length === 0" class="state-panel state-empty compact">
          <p>You have no submissions yet.</p>
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
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>

      <section v-if="showMyPostsSection && rejectedSubmissions.length" class="news-section">
        <div class="section-head">
          <h2>Rejected</h2>
          <span>{{ rejectedSubmissions.length }} {{ rejectedSubmissions.length === 1 ? 'item' : 'items' }}</span>
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
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>

      <section v-if="showPendingSection" class="news-section">
        <div class="section-head">
          <h2>{{ isPresident ? 'Pending for Review' : 'Pending News' }}</h2>
          <span>{{ pendingPosts.length }} {{ pendingPosts.length === 1 ? 'item' : 'items' }}</span>
        </div>
        <div v-if="pendingPosts.length === 0" class="state-panel state-empty compact">
          <p>No pending posts.</p>
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
            @edit="openEditModal"
            @delete="openDeleteModal"
            @preview-image="openImagePreview"
          />
        </div>
      </section>
    </template>

    <div v-if="openCreateModal" class="modal-backdrop" @click.self="closeCreateModal">
      <div class="modal modal-form" role="dialog" aria-labelledby="create-news-title">
        <div class="modal-head">
          <h3 id="create-news-title">Create News</h3>
          <button type="button" class="modal-close" aria-label="Close" @click="closeCreateModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="create-news-title-input">Title <span class="req">*</span></label>
            <input id="create-news-title-input" v-model="createForm.title" type="text" maxlength="255" />
          </div>
          <div class="form-field">
            <label for="create-news-content">Content <span class="req">*</span></label>
            <textarea id="create-news-content" v-model="createForm.content" rows="7"></textarea>
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
          <button class="btn-post" type="button" :disabled="submitting" @click="submitCreateNews">
            {{ submitting ? 'Submitting...' : 'Submit News' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="openEditNewsModal" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal modal-form" role="dialog" aria-labelledby="edit-news-title">
        <div class="modal-head">
          <h3 id="edit-news-title">Edit News</h3>
          <button type="button" class="modal-close" aria-label="Close" @click="closeEditModal">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-field">
            <label for="edit-news-title-input">Title <span class="req">*</span></label>
            <input id="edit-news-title-input" v-model="editForm.title" type="text" maxlength="255" />
          </div>
          <div class="form-field">
            <label for="edit-news-content">Content <span class="req">*</span></label>
            <textarea id="edit-news-content" v-model="editForm.content" rows="7"></textarea>
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
                <button type="button" class="upload-clear" @click.stop="clearEditImage">Remove new image</button>
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
          <button class="btn-ghost" type="button" @click="closeEditModal">Cancel</button>
          <button class="btn-post" type="button" :disabled="submitting" @click="submitEditNews">
            {{ submitting ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="openDeleteConfirmModal" class="modal-backdrop" @click.self="closeDeleteModal">
      <div class="modal modal-sm" role="alertdialog">
        <div class="modal-head">
          <h3>Delete news post?</h3>
        </div>
        <div class="modal-body">
          <p class="delete-warning">This post will be permanently removed.</p>
        </div>
        <div class="modal-foot">
          <button class="btn-ghost" type="button" @click="closeDeleteModal">Cancel</button>
          <button class="btn-danger" type="button" @click="confirmDeleteNews">Delete</button>
        </div>
      </div>
    </div>

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
import { useBackdropTheme } from '../composables/useBackdropTheme'
import NewsPostCard from '../components/NewsPostCard.vue'

const API_ORIGIN = 'http://localhost:3000'

const authStore = useAuthStore()
const router = useRouter()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const userRole = computed(() => (authStore.currentUser?.role || '').toLowerCase())
const currentUserId = computed(() => Number(authStore.currentUser?.id || 0))
const token = computed(() => authStore.token)

const isFarmer = computed(() => userRole.value === 'farmer')
const isPresident = computed(() => userRole.value === 'president')
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
  if (isPresident.value) return true
  if (!isFarmer.value) return false
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

const confirmDeleteNews = async () => {
  if (!pendingDeleteNewsId.value) return
  await deleteNews(pendingDeleteNewsId.value)
  closeDeleteModal()
}

const canDeleteNewsItem = (item) => {
  if (isPresident.value) return true
  if (!isFarmer.value) return false
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

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${API_ORIGIN}${normalized}`
}

onMounted(fetchNews)
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

  max-width: 860px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 3rem;
  min-height: 100vh;
  color: var(--text);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

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

.hero-icon svg { width: 1.5rem; height: 1.5rem; }

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

.btn-post svg { width: 1rem; height: 1rem; }
.btn-post:hover:not(:disabled) { filter: brightness(1.06); transform: translateY(-1px); }
.btn-post:disabled { opacity: 0.65; cursor: not-allowed; }

.btn-ghost-header {
  padding: 0.55rem 1rem;
  border-radius: 10px;
  border: 1px solid var(--line);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-muted);
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  white-space: nowrap;
}

.btn-ghost-header:hover { background: rgba(255, 255, 255, 0.06); color: var(--text); }

.notice-toolbar {
  display: flex;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.search-wrap { flex: 1; position: relative; min-width: 0; }

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

.search-input { padding-left: 2.25rem; }
.search-input::placeholder { color: var(--text-soft); }
.sort-select { width: auto; min-width: 9rem; cursor: pointer; }
.sort-select option { background: #132119; color: var(--text); }

.news-section { margin-top: 1.5rem; }
.news-section:first-of-type { margin-top: 0; }

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-bottom: 0.85rem;
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
  padding: 3rem 1.5rem;
  border-radius: 14px;
  background: var(--bg-card);
  border: 1px solid var(--line);
  color: var(--text-muted);
}

.state-panel.compact { padding: 1.5rem 1rem; }

.state-spinner {
  width: 2rem;
  height: 2rem;
  margin: 0 auto 1rem;
  border: 3px solid var(--line);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin { to { transform: rotate(360deg); } }

.notice-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

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

.modal-sm { width: min(400px, 100%); }

.modal-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.15rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-head h3 { margin: 0; font-size: 1.05rem; font-weight: 800; }

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

.modal-close:hover { background: rgba(255, 255, 255, 0.1); color: var(--text); }

.modal-body { padding: 1rem 1.15rem; overflow-y: auto; flex: 1; }

.modal-foot {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  padding: 0.85rem 1.15rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.form-field { margin-bottom: 1rem; }
.form-field:last-child { margin-bottom: 0; }

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

.form-field textarea { resize: vertical; min-height: 7rem; }

.upload-zone {
  position: relative;
  border: 2px dashed rgba(190, 235, 203, 0.25);
  border-radius: 10px;
  min-height: 7rem;
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
  gap: 0.35rem;
  padding: 1.5rem 1rem;
  color: var(--text-soft);
  text-align: center;
}

.upload-placeholder svg { width: 2rem; height: 2rem; opacity: 0.6; }
.upload-placeholder span { font-size: 0.85rem; font-weight: 600; color: var(--text-muted); }
.upload-placeholder small { font-size: 0.7rem; }

.upload-preview { position: relative; }
.upload-preview img { width: 100%; max-height: 200px; object-fit: cover; display: block; }

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

.upload-keep { cursor: default; color: var(--text-soft); }

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

.btn-ghost:hover { background: rgba(255, 255, 255, 0.05); }

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

.preview-backdrop { z-index: 2600; }

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
  .news-page { padding: 1rem 0.85rem 2rem; }
  .notice-hero { flex-direction: column; align-items: stretch; padding: 1.15rem; }
  .hero-right { justify-content: space-between; }
  .notice-toolbar { flex-direction: column; }
  .sort-select { width: 100%; }
}

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
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

.news-page.light-theme .notice-hero {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.news-page.light-theme .hero-icon {
  background: #dcfce7;
  border-color: #86efac;
  color: #15803d;
}

.news-page.light-theme .hero-eyebrow {
  color: #15803d;
}

.news-page.light-theme .notice-hero h1 {
  color: #052e16;
}

.news-page.light-theme .hero-desc {
  color: #166534;
}

.news-page.light-theme .hero-stat {
  background: #f0fdf4;
  border: 1.5px solid #bbf7d0;
}

.news-page.light-theme .hero-stat-value {
  color: #15803d;
}

.news-page.light-theme .hero-stat-label {
  color: #64748b;
}

.news-page.light-theme .btn-ghost-header {
  background: #ffffff;
  border: 1.5px solid #86efac;
  color: #14532d;
}

.news-page.light-theme .btn-ghost-header:hover {
  background: #f0fdf4;
  color: #052e16;
}

.news-page.light-theme .search-ico {
  color: #15803d;
}

.news-page.light-theme .search-input,
.news-page.light-theme .sort-select {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: #052e16;
}

.news-page.light-theme .search-input::placeholder {
  color: #64748b;
}

.news-page.light-theme .sort-select option {
  background: #ffffff;
  color: #052e16;
}

.news-page.light-theme .section-head h2 {
  color: #052e16;
}

.news-page.light-theme .section-head span {
  color: #166534;
}

.news-page.light-theme .state-panel {
  background: #ffffff;
  border: 2px solid #86efac;
  color: #166534;
}

.news-page.light-theme .modal {
  background: #fffef9;
  border: 2px solid #86efac;
  color: #052e16;
}

.news-page.light-theme .modal-head {
  border-bottom: 1px solid #bbf7d0;
}

.news-page.light-theme .modal-head h3 {
  color: #052e16;
}

.news-page.light-theme .modal-close {
  background: #f0fdf4;
  color: #64748b;
}

.news-page.light-theme .modal-foot {
  border-top: 1px solid #bbf7d0;
}

.news-page.light-theme .form-field label {
  color: #166534;
}

.news-page.light-theme .form-field input,
.news-page.light-theme .form-field textarea {
  background: #ffffff;
  border: 1.5px solid #cbd5e1;
  color: #052e16;
}

.news-page.light-theme .upload-zone {
  border-color: #bbf7d0;
  background: #f8fdf9;
}

.news-page.light-theme .upload-placeholder {
  color: #64748b;
}

.news-page.light-theme .upload-placeholder span {
  color: #166534;
}

.news-page.light-theme .btn-ghost {
  background: #ffffff;
  border: 1.5px solid #86efac;
  color: #14532d;
}

.news-page.light-theme .btn-ghost:hover {
  background: #f0fdf4;
}

.news-page.light-theme .delete-warning {
  color: #166534;
}

.news-page.light-theme .preview-close {
  background: #ffffff;
  border: 1.5px solid #86efac;
  color: #052e16;
}

.news-page.light-theme .preview-caption {
  color: #166534;
}

/* News post cards (child component) */
.news-page.light-theme :deep(.notice-card) {
  background: #ffffff;
  border: 2px solid #86efac;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
}

.news-page.light-theme :deep(.notice-card--featured) {
  border-color: #22c55e;
}

.news-page.light-theme :deep(.notice-card-header) {
  border-bottom: 1px solid #e2e8f0;
}

.news-page.light-theme :deep(.author-name),
.news-page.light-theme :deep(.notice-date) {
  color: #052e16;
}

.news-page.light-theme :deep(.notice-time),
.news-page.light-theme :deep(.notice-card-footer),
.news-page.light-theme :deep(.notice-figure-cap) {
  color: #64748b;
}

.news-page.light-theme :deep(.notice-title) {
  color: #052e16;
}

.news-page.light-theme :deep(.notice-content) {
  color: #14532d;
}

.news-page.light-theme :deep(.read-more-btn) {
  color: #15803d;
}

.news-page.light-theme :deep(.notice-badge-latest) {
  background: #dcfce7;
  color: #15803d;
  border-color: #86efac;
}

.news-page.light-theme :deep(.action-btn) {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.news-page.light-theme :deep(.action-btn--danger) {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fca5a5;
}

.news-page.light-theme :deep(.notice-card-footer) {
  border-top: 1px solid #e2e8f0;
}

.news-page.light-theme :deep(.edited-tag) {
  background: #f0fdf4;
  color: #166534;
}

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

