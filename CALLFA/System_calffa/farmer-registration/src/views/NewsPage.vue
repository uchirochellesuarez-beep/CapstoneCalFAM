<template>
  <div class="financial-container glass-module-page news-page">
    <div class="page-header page-header--news">
      <div class="header-main">
        <div class="header-content">
          <p class="eyebrow">CALFFA Bulletin</p>
          <h1>News Feed</h1>
          <p class="page-subtitle hero-subtitle">
            Role-based posting and approval flow with live database data.
          </p>
        </div>

        <div class="header-actions">
          <span class="count-badge">{{ visiblePostCount }} post(s)</span>
          <button
            v-if="canCreateNews"
            class="btn btn-primary-action header-btn"
            type="button"
            @click="openCreateModal = true"
          >
            Create News
          </button>
          <button
            v-if="isPresident"
            class="btn btn-secondary-soft header-btn"
            type="button"
            @click="goToPendingApprovals"
          >
            Pending Approvals
          </button>
          <select v-model="quickFilter" class="control-select">
            <option value="all">All</option>
            <option v-if="isFarmer" value="my">My Posts</option>
            <option value="pending">Pending</option>
          </select>
          <select v-model="sortOrder" class="control-select">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>
    </div>

    <div v-if="toastMessage" class="toast" :class="toastType">{{ toastMessage }}</div>

    <div class="tab-content tab-content--main">
    <section v-if="showPublishedSection" class="news-section">
      <div class="section-head">
        <h2>{{ isFarmer ? 'Published News (Community Feed)' : 'Published News' }}</h2>
        <span>{{ publishedNews.length }} item(s)</span>
      </div>

      <p v-if="loading" class="muted">Loading news...</p>
      <p v-else-if="publishedNews.length === 0" class="muted">No published news available.</p>

      <div class="feed-scroll">
        <div class="feed-grid">
          <article v-for="item in publishedNews" :key="item.id" class="ig-card" :class="{ 'no-image-card': !item.image }">
            <div class="ig-top">
              <div class="avatar">{{ authorInitials(item.author_name) }}</div>
              <div class="ig-top-meta">
                <strong class="author-name">{{ item.author_name || item.author_role }}</strong>
                <span class="meta-line">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="top-right-tags">
                <span class="role-pill">{{ item.author_role }}</span>
                <span class="status-pill" :class="`status-${item.status}`">{{ formatStatus(item.status) }}</span>
              </div>
            </div>

            <div class="ig-caption">
              <h3 class="news-title">{{ item.title }}</h3>
              <p class="news-content">{{ item.content }}</p>
              <button
                v-if="isLongContent(item.content)"
                class="read-more-btn"
                type="button"
                @click="openContentModal(item)"
              >
                Read more
              </button>
            </div>

            <div
              v-if="item.image"
              class="ig-image-wrap"
              @click.stop="openImagePreview(resolveImageUrl(item.image), item.title || 'News image')"
            >
              <img
                :src="resolveImageUrl(item.image)"
                alt="News image"
                class="ig-image"
              />
            </div>

            <div class="ig-actions">
              <span class="action-right">
                <button
                  v-if="canEditNewsItem(item)"
                  class="icon-btn edit-btn"
                  type="button"
                  title="Edit news"
                  @click="openEditModal(item)"
                >
                  &#9998;
                </button>
                <button
                  v-if="canDeleteNewsItem(item)"
                  class="icon-btn delete-btn"
                  type="button"
                  title="Delete news"
                  @click="openDeleteModal(item.id)"
                >
                  &#128465;
                </button>
              </span>
            </div>

          </article>
        </div>
      </div>
    </section>

    <section v-if="showMyPostsSection" class="news-section">
      <div class="section-head">
        <h2>My Submissions</h2>
        <span>{{ mySubmissions.length }} item(s)</span>
      </div>

      <p v-if="loading" class="muted">Loading news...</p>
      <p v-else-if="mySubmissions.length === 0" class="muted">You have no submissions yet.</p>

      <div class="feed-scroll">
        <div class="feed-grid">
          <article v-for="item in mySubmissions" :key="`mine-${item.id}`" class="ig-card" :class="{ 'no-image-card': !item.image }">
            <div class="ig-top">
              <div class="avatar">{{ authorInitials(item.author_name) }}</div>
              <div class="ig-top-meta">
                <strong class="author-name">{{ item.author_name || item.author_role }}</strong>
                <span class="meta-line">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="top-right-tags">
                <span class="role-pill">{{ item.author_role }}</span>
                <span class="status-pill" :class="`status-${item.status}`">{{ formatStatus(item.status) }}</span>
              </div>
            </div>

            <div class="ig-caption">
              <h3 class="news-title">{{ item.title }}</h3>
              <p class="news-content">{{ item.content }}</p>
              <button
                v-if="isLongContent(item.content)"
                class="read-more-btn"
                type="button"
                @click="openContentModal(item)"
              >
                Read more
              </button>
            </div>

            <div
              v-if="item.image"
              class="ig-image-wrap"
              @click.stop="openImagePreview(resolveImageUrl(item.image), item.title || 'News image')"
            >
              <img
                :src="resolveImageUrl(item.image)"
                alt="News image"
                class="ig-image"
              />
            </div>

            <div class="ig-actions">
              <span class="action-right">
                <button
                  v-if="canEditNewsItem(item)"
                  class="icon-btn edit-btn"
                  type="button"
                  title="Edit news"
                  @click="openEditModal(item)"
                >
                  &#9998;
                </button>
                <button
                  v-if="canDeleteNewsItem(item)"
                  class="icon-btn delete-btn"
                  type="button"
                  title="Delete news"
                  @click="openDeleteModal(item.id)"
                >
                  &#128465;
                </button>
              </span>
            </div>

          </article>
        </div>
      </div>
    </section>

    <section v-if="showMyPostsSection && rejectedSubmissions.length" class="news-section">
      <div class="rejected-bottom">
        <h3>Rejected ({{ rejectedSubmissions.length }})</h3>
        <ul class="rejected-list">
          <li v-for="item in rejectedSubmissions" :key="`rejected-${item.id}`">
            <strong>{{ item.title }}</strong>
            <span class="meta-line"> - {{ formatDate(item.updated_at || item.created_at) }}</span>
            <span v-if="item.rejection_reason" class="rejection-reason-inline"> | {{ item.rejection_reason }}</span>
            <button class="mini-link" type="button" @click="openEditModal(item)">Edit</button>
            <button class="mini-link danger-link" type="button" @click="openDeleteModal(item.id)">Delete</button>
          </li>
        </ul>
      </div>
    </section>

    <section v-if="showPendingSection" class="news-section">
      <div class="section-head">
        <h2>{{ isPresident ? 'Pending News (For Review)' : 'Pending News' }}</h2>
        <span>{{ pendingPosts.length }} item(s)</span>
      </div>

      <p v-if="loading" class="muted">Loading news...</p>
      <p v-else-if="pendingPosts.length === 0" class="muted">No pending posts.</p>

      <div class="feed-scroll">
        <div class="feed-grid">
          <article v-for="item in pendingPosts" :key="`pending-${item.id}`" class="ig-card" :class="{ 'no-image-card': !item.image }">
            <div class="ig-top">
              <div class="avatar">{{ authorInitials(item.author_name) }}</div>
              <div class="ig-top-meta">
                <strong class="author-name">{{ item.author_name || item.author_role }}</strong>
                <span class="meta-line">{{ formatDate(item.created_at) }}</span>
              </div>
              <div class="top-right-tags">
                <span class="role-pill">{{ item.author_role }}</span>
                <span class="status-pill" :class="`status-${item.status}`">{{ formatStatus(item.status) }}</span>
              </div>
            </div>

            <div class="ig-caption">
              <h3 class="news-title">{{ item.title }}</h3>
              <p class="news-content">{{ item.content }}</p>
              <button
                v-if="isLongContent(item.content)"
                class="read-more-btn"
                type="button"
                @click="openContentModal(item)"
              >
                Read more
              </button>
            </div>

            <div
              v-if="item.image"
              class="ig-image-wrap"
              @click.stop="openImagePreview(resolveImageUrl(item.image), item.title || 'News image')"
            >
              <img
                :src="resolveImageUrl(item.image)"
                alt="News image"
                class="ig-image"
              />
            </div>

            <div class="ig-actions">
              <span class="action-right">
                <button
                  v-if="canEditNewsItem(item)"
                  class="icon-btn edit-btn"
                  type="button"
                  title="Edit news"
                  @click="openEditModal(item)"
                >
                  &#9998;
                </button>
                <button
                  v-if="canDeleteNewsItem(item)"
                  class="icon-btn delete-btn"
                  type="button"
                  title="Delete news"
                  @click="openDeleteModal(item.id)"
                >
                  &#128465;
                </button>
              </span>
            </div>
          </article>
        </div>
      </div>
    </section>
    </div>

    <div v-if="openCreateModal" class="modal-backdrop" @click.self="closeCreateModal">
      <div class="modal">
        <h3>Create News</h3>

        <label>Title</label>
        <input v-model="createForm.title" class="modal-input" type="text" maxlength="255" />

        <label>Content</label>
        <textarea v-model="createForm.content" class="modal-input" rows="6"></textarea>

        <label>Attach Image (optional)</label>
        <input type="file" class="modal-file" accept="image/*" @change="onImageSelected" />
        <p v-if="createForm.imageFileName" class="file-name">Selected: {{ createForm.imageFileName }}</p>

        <div class="modal-actions">
          <button class="btn btn-muted" type="button" @click="closeCreateModal">Cancel</button>
          <button class="btn btn-primary-action" type="button" :disabled="submitting" @click="submitCreateNews">
            {{ submitting ? 'Submitting...' : 'Submit' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="openEditNewsModal" class="modal-backdrop" @click.self="closeEditModal">
      <div class="modal">
        <h3>Edit News</h3>

        <label>Title</label>
        <input v-model="editForm.title" class="modal-input" type="text" maxlength="255" />

        <label>Content</label>
        <textarea v-model="editForm.content" class="modal-input" rows="6"></textarea>

        <label>Image Preview</label>
        <img v-if="editForm.imagePreview" :src="editForm.imagePreview" alt="Current image" class="preview-image" />
        <div v-else class="preview-empty">No image</div>

        <label>Replace Image (optional)</label>
        <input type="file" class="modal-file" accept="image/*" @change="onEditImageSelected" />
        <p v-if="editForm.imageFileName" class="file-name">Selected: {{ editForm.imageFileName }}</p>

        <div class="modal-actions">
          <button class="btn btn-muted" type="button" @click="closeEditModal">Cancel</button>
          <button class="btn btn-primary-action" type="button" :disabled="submitting" @click="submitEditNews">
            {{ submitting ? 'Saving...' : 'Save Changes' }}
          </button>
        </div>
      </div>
    </div>

    <div v-if="openDeleteConfirmModal" class="modal-backdrop" @click.self="closeDeleteModal">
      <div class="modal delete-modal">
        <h3>Confirm Deletion</h3>
        <p>This action cannot be undone.</p>
        <div class="modal-actions">
          <button class="btn btn-muted" type="button" @click="closeDeleteModal">Cancel</button>
          <button class="btn btn-danger-solid" type="button" @click="confirmDeleteNews">Delete</button>
        </div>
      </div>
    </div>

    <div v-if="openContentPreviewModal" class="modal-backdrop" @click.self="closeContentModal">
      <div class="modal">
        <h3>{{ contentPreviewItem.title }}</h3>
        <p class="full-content">{{ contentPreviewItem.content }}</p>
        <div class="modal-actions">
          <button class="btn btn-primary-action" type="button" @click="closeContentModal">Close</button>
        </div>
      </div>
    </div>

    <div v-if="openImagePreviewModal" class="modal-backdrop image-preview-backdrop" @click.self="closeImagePreview">
      <div class="image-preview-modal">
        <button class="image-close-btn" type="button" aria-label="Close image preview" @click="closeImagePreview">&times;</button>
        <img :src="previewImageSrc" :alt="previewImageAlt" class="image-preview-full" />
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
const openContentPreviewModal = ref(false)
const openImagePreviewModal = ref(false)
const pendingDeleteNewsId = ref(null)
const contentPreviewItem = ref({ title: '', content: '' })
const previewImageSrc = ref('')
const previewImageAlt = ref('News image')
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
  imageFileName: '',
  imagePreview: ''
})

const sortItems = (items) => [...items].sort((a, b) => {
  const aTime = new Date(a.created_at).getTime()
  const bTime = new Date(b.created_at).getTime()
  return sortOrder.value === 'oldest' ? aTime - bTime : bTime - aTime
})

const publishedNews = computed(() => sortItems(newsItems.value.filter((item) => item.status === 'published')))
const myOwnedNews = computed(() =>
  sortItems(newsItems.value.filter((item) => item.author_id === currentUserId.value))
)
const mySubmissions = computed(() =>
  myOwnedNews.value.filter((item) => item.status !== 'rejected')
)
const rejectedSubmissions = computed(() =>
  myOwnedNews.value.filter((item) => item.status === 'rejected')
)
const pendingPosts = computed(() => {
  const source = isFarmer.value
    ? myOwnedNews.value
    : newsItems.value
  return sortItems(source.filter((item) => item.status === 'pending'))
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

const onImageSelected = (event) => {
  const file = event.target.files?.[0] || null
  createForm.value.imageFile = file
  createForm.value.imageFileName = file ? file.name : ''
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
  editForm.value = {
    id: item.id,
    title: item.title || '',
    content: item.content || '',
    imageFile: null,
    imageFileName: '',
    imagePreview: item.image ? resolveImageUrl(item.image) : ''
  }
  openEditNewsModal.value = true
}

const closeEditModal = () => {
  openEditNewsModal.value = false
  editForm.value = {
    id: null,
    title: '',
    content: '',
    imageFile: null,
    imageFileName: '',
    imagePreview: ''
  }
}

const onEditImageSelected = (event) => {
  const file = event.target.files?.[0] || null
  editForm.value.imageFile = file
  editForm.value.imageFileName = file ? file.name : ''
  if (file) {
    editForm.value.imagePreview = URL.createObjectURL(file)
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

const isLongContent = (content) => String(content || '').trim().length > 130

const openContentModal = (item) => {
  contentPreviewItem.value = {
    title: item.title || '',
    content: item.content || ''
  }
  openContentPreviewModal.value = true
}

const closeContentModal = () => {
  openContentPreviewModal.value = false
  contentPreviewItem.value = { title: '', content: '' }
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

const authorInitials = (name) => {
  const source = (name || 'User').trim()
  const parts = source.split(/\s+/).filter(Boolean)
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[1][0]).toUpperCase()
}

const formatDate = (date) => {
  if (!date) return ''
  return new Date(date).toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const formatStatus = (status) => {
  const normalized = String(status || '').toLowerCase()
  if (normalized === 'pending') return 'Pending'
  if (normalized === 'published') return 'Published'
  if (normalized === 'rejected') return 'Rejected'
  return 'Unknown'
}

onMounted(fetchNews)
</script>

<style scoped>
/* ===== GLASS GREEN THEME (aligned with Machinery Financial / Share Capital) ===== */
.news-page.financial-container {
  --glass-bg: rgba(29, 43, 33, 0.92);
  --glass-panel: rgba(31, 48, 36, 0.94);
  --glass-line: rgba(255, 255, 255, 0.1);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --text-soft: rgba(220, 238, 211, 0.62);
  --green: #34d399;
  --lime: #a3e635;

  min-height: 100vh;
  max-width: 1200px;
  margin: 0 auto;
  padding: 28px;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: var(--text-main);
}

.news-page.financial-container::before,
.news-page.financial-container::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
}

.news-page.financial-container::before {
  background:
    radial-gradient(ellipse 82% 56% at 12% 88%, rgba(17, 94, 41, 0.22) 0%, transparent 62%),
    radial-gradient(ellipse 75% 55% at 92% 10%, rgba(34, 197, 94, 0.14) 0%, transparent 64%),
    radial-gradient(circle at 50% 16%, rgba(45, 212, 191, 0.11) 0%, transparent 22%),
    linear-gradient(130deg, rgba(163, 230, 53, 0.03) 0%, transparent 38%, rgba(45, 212, 191, 0.03) 100%);
  animation: newsAmbience 16s ease-in-out infinite alternate;
}

.news-page.financial-container::after {
  background:
    radial-gradient(circle at 94% 8%, rgba(34, 197, 94, 0.2) 0%, transparent 17%),
    radial-gradient(circle at 8% 86%, rgba(74, 222, 128, 0.16) 0%, transparent 20%),
    repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 14px);
  filter: blur(10px);
  animation: newsOrb 11s ease-in-out infinite;
}

@keyframes newsAmbience {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  100% {
    transform: translate3d(-8px, 6px, 0) scale(1.02);
  }
}

@keyframes newsOrb {
  0%,
  100% {
    opacity: 0.85;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.04);
  }
}

.news-page > * {
  position: relative;
  z-index: 1;
}

.page-header--news {
  margin-bottom: 0;
  padding: 28px 32px;
  background: linear-gradient(135deg, rgba(28, 41, 31, 0.94) 0%, rgba(35, 54, 40, 0.9) 56%, rgba(48, 78, 62, 0.84) 100%);
  border-radius: 26px;
  border: 1px solid var(--glass-line);
  box-shadow:
    18px 18px 34px rgba(8, 14, 10, 0.5),
    -14px -14px 26px rgba(42, 61, 46, 0.4),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset -1px -1px 0 rgba(0, 0, 0, 0.34);
  position: relative;
  overflow: hidden;
}

.page-header--news::before {
  content: '';
  position: absolute;
  inset: -35% -10% auto auto;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.2) 0%, transparent 68%);
  pointer-events: none;
}

.header-main {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  flex-wrap: wrap;
}

.header-content {
  flex: 1 1 280px;
  min-width: 0;
}

.eyebrow {
  margin: 0 0 8px;
  font-size: 11px;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 800;
  color: var(--text-soft);
}

.page-header--news h1 {
  margin: 0;
  font-size: clamp(1.85rem, 4vw, 2.65rem);
  font-weight: 900;
  line-height: 1.08;
  letter-spacing: -0.6px;
  background: linear-gradient(90deg, #86efac 0%, #4ade80 45%, #22c55e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.page-subtitle.hero-subtitle {
  margin: 12px 0 0;
  color: var(--text-muted);
  font-size: 15px;
  line-height: 1.45;
  font-weight: 500;
  max-width: 36rem;
}

.header-actions {
  display: flex;
  gap: 10px;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  flex: 1 1 260px;
}

.count-badge {
  background: rgba(0, 0, 0, 0.25);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-main);
  border-radius: 999px;
  padding: 8px 14px;
  font-size: 0.88rem;
  font-weight: 800;
}

.control-select {
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 12px;
  padding: 10px 14px;
  background: rgba(39, 58, 45, 0.85);
  color: var(--text-main);
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  min-height: 44px;
}

.control-select:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
}

.control-select option {
  color: #14532d;
  background: #ecfdf5;
}

.financial-container > .tab-content {
  margin-top: 22px;
}

.tab-content {
  background: var(--glass-bg);
  border: 1px solid var(--glass-line);
  border-radius: 18px;
  padding: 22px 24px;
  backdrop-filter: blur(18px);
  box-shadow:
    14px 14px 26px rgba(8, 13, 10, 0.5),
    inset 1px 1px 0 rgba(255, 255, 255, 0.06);
  position: relative;
}

.tab-content::before {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: 18px;
  background:
    radial-gradient(circle at 10% 0%, rgba(163, 230, 53, 0.07) 0%, transparent 35%),
    radial-gradient(circle at 92% 100%, rgba(45, 212, 191, 0.08) 0%, transparent 32%);
  pointer-events: none;
}

.tab-content--main {
  padding-bottom: 28px;
}

.news-section {
  margin-top: 24px;
  position: relative;
  z-index: 1;
}

.news-section:first-child {
  margin-top: 8px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 12px;
  flex-wrap: wrap;
  margin-bottom: 14px;
}

.section-head h2 {
  margin: 0;
  font-size: clamp(1.15rem, 2vw, 1.35rem);
  font-weight: 800;
  color: #b6f7cb;
  letter-spacing: -0.02em;
}

.section-head span {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--text-soft);
}

.feed-scroll {
  max-height: 520px;
  overflow-y: auto;
  padding-right: 8px;
}

.feed-scroll::-webkit-scrollbar {
  width: 8px;
}

.feed-scroll::-webkit-scrollbar-thumb {
  background: rgba(74, 222, 128, 0.25);
  border-radius: 999px;
}

.feed-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(480px, 1fr));
  gap: 20px;
  justify-content: center;
}

.ig-card {
  border: 1px solid var(--glass-line);
  border-radius: 16px;
  background: rgba(22, 35, 27, 0.82);
  margin: 0;
  overflow: hidden;
  box-shadow:
    12px 12px 22px rgba(8, 13, 10, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  min-height: 380px;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 560px;
  justify-self: center;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.ig-card:hover {
  transform: translateY(-4px);
  border-color: rgba(74, 222, 128, 0.28);
  box-shadow:
    16px 20px 32px rgba(8, 13, 10, 0.5),
    0 0 0 1px rgba(74, 222, 128, 0.12);
}

.ig-top {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px 14px 10px;
  background: rgba(0, 0, 0, 0.12);
}

.ig-top-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.author-name {
  font-size: 13px;
  line-height: 1.25;
  color: var(--text-main);
  font-weight: 800;
}

.meta-line {
  font-size: 12px;
  color: var(--text-soft);
}

.avatar {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: linear-gradient(135deg, #166534, #22c55e);
  color: #fff;
  display: grid;
  place-items: center;
  font-weight: 800;
  font-size: 12px;
  flex-shrink: 0;
}

.role-pill {
  padding: 4px 9px;
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.12);
  color: var(--lime);
  font-size: 11px;
  font-weight: 800;
  border: 1px solid rgba(74, 222, 128, 0.22);
}

.top-right-tags {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.status-pill {
  padding: 4px 9px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.02em;
  border: 1px solid transparent;
}

.status-pending {
  background: rgba(251, 191, 36, 0.14);
  color: #fcd34d;
  border-color: rgba(251, 191, 36, 0.3);
}

.status-published {
  background: rgba(74, 222, 128, 0.14);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.28);
}

.status-rejected {
  background: rgba(248, 113, 113, 0.14);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.35);
}

.ig-image {
  width: min(92%, 300px);
  display: block;
  aspect-ratio: 1 / 1;
  object-fit: cover;
  flex-shrink: 0;
  margin: 10px auto 0;
  border: 1px solid rgba(74, 222, 128, 0.25);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  box-sizing: border-box;
}

.ig-image-wrap {
  width: min(92%, 300px);
  display: block;
  margin: 10px auto 0;
  border: 1px solid rgba(74, 222, 128, 0.25);
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.2);
  padding: 4px;
  cursor: zoom-in;
  overflow: hidden;
  transition: transform 0.18s ease, box-shadow 0.18s ease, border-color 0.18s ease;
  box-sizing: border-box;
  flex-shrink: 0;
}

.ig-image-wrap:hover {
  transform: translateY(-2px);
  border-color: rgba(74, 222, 128, 0.55);
  box-shadow: 0 10px 24px rgba(74, 222, 128, 0.22);
}

.ig-image-wrap .ig-image {
  width: 100%;
  margin: 0;
  border: none;
  background: transparent;
  padding: 0;
  border-radius: 10px;
  display: block;
}

.no-image-card .ig-actions {
  margin-top: auto;
}

.ig-actions {
  display: flex;
  gap: 10px;
  padding: 10px 14px 12px;
  font-size: 18px;
  color: var(--text-muted);
  margin-top: auto;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(0, 0, 0, 0.1);
}

.action-right {
  margin-left: auto;
  display: inline-flex;
  gap: 10px;
  align-items: center;
}

.icon-btn {
  border: none;
  background: rgba(255, 255, 255, 0.06);
  cursor: pointer;
  font-size: 18px;
  line-height: 1;
  padding: 6px 8px;
  border-radius: 10px;
  transition: background 0.15s ease;
}

.icon-btn:hover {
  background: rgba(74, 222, 128, 0.15);
}

.delete-btn {
  color: #f87171;
}

.edit-btn {
  color: #7dd3fc;
}

.toast {
  position: fixed;
  right: 22px;
  top: 22px;
  z-index: 2000;
  background: rgba(22, 35, 27, 0.95);
  color: var(--text-main);
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  box-shadow:
    0 16px 40px rgba(0, 0, 0, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  font-weight: 700;
  backdrop-filter: blur(12px);
}

.toast.error {
  border-color: rgba(248, 113, 113, 0.45);
  color: #fecaca;
}

.ig-caption {
  padding: 6px 14px 14px;
  overflow: visible;
  background: transparent;
}

.news-title {
  margin: 4px 0 8px;
  font-size: 18px;
  font-weight: 800;
  color: #ecfdf5;
}

.news-content {
  margin: 0;
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.read-more-btn {
  margin-top: 10px;
  border: none;
  background: transparent;
  color: var(--green);
  font-weight: 800;
  cursor: pointer;
  padding: 0;
  font-size: 13px;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.read-more-btn:hover {
  color: var(--lime);
}

.full-content {
  color: var(--text-muted);
  font-size: 14px;
  line-height: 1.65;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  max-height: 52vh;
  overflow-y: auto;
  padding-right: 8px;
}

.btn {
  padding: 12px 20px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(22, 163, 74, 0.18));
  color: var(--green);
  font-weight: 800;
  cursor: pointer;
  font-size: 15px;
  transition: transform 0.2s ease, border-color 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(74, 222, 128, 0.55);
}

.btn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-primary-action {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.32), rgba(96, 165, 250, 0.2));
  border: 1px solid rgba(74, 222, 128, 0.42);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.25);
}

.btn-primary-action:hover:not(:disabled) {
  border-color: var(--green);
  transform: translateY(-2px);
}

.btn-secondary-soft {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.14);
  color: var(--text-main);
}

.btn-secondary-soft:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.22);
}

.btn-muted {
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-main);
}

.btn-muted:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}

.btn-danger-solid {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.35), rgba(220, 38, 38, 0.25));
  border: 1px solid rgba(248, 113, 113, 0.5);
  color: #fecaca;
}

.btn-danger-solid:hover:not(:disabled) {
  border-color: #f87171;
  transform: translateY(-1px);
}

.header-btn {
  min-width: 170px;
  min-height: 52px;
  font-size: 0.95rem;
  line-height: 1.15;
}

.muted {
  color: var(--text-soft);
  font-size: 14px;
}

.rejected-bottom {
  margin-top: 8px;
  padding: 16px 18px;
  border: 1px solid rgba(248, 113, 113, 0.28);
  background: rgba(248, 113, 113, 0.08);
  border-radius: 14px;
}

.rejected-bottom h3 {
  margin: 0 0 12px;
  font-size: 13px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #fecaca;
}

.rejected-list {
  margin: 0;
  padding-left: 18px;
  color: var(--text-muted);
}

.rejected-list li {
  margin-bottom: 10px;
  font-size: 13px;
  line-height: 1.4;
}

.rejection-reason-inline {
  color: #fca5a5;
}

.mini-link {
  margin-left: 8px;
  border: none;
  background: transparent;
  color: #7dd3fc;
  cursor: pointer;
  font-size: 12px;
  font-weight: 700;
  text-decoration: underline;
}

.danger-link {
  color: #f87171;
}

.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 3000;
  background: rgba(0, 0, 0, 0.72);
  display: grid;
  place-items: center;
  padding: 16px;
  backdrop-filter: blur(6px);
}

.modal {
  width: min(560px, 100%);
  background: var(--glass-panel);
  border: 1px solid var(--glass-line-strong);
  border-radius: 18px;
  padding: 20px 22px;
  box-shadow:
    20px 24px 48px rgba(0, 0, 0, 0.5),
    inset 1px 1px 0 rgba(255, 255, 255, 0.06);
  backdrop-filter: blur(20px);
  color: var(--text-main);
}

.modal h3 {
  margin: 0 0 6px;
  font-size: 1.2rem;
  font-weight: 800;
  color: #ecfdf5;
}

.modal label {
  display: block;
  margin-top: 12px;
  font-weight: 700;
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-soft);
}

.modal-input {
  width: 100%;
  box-sizing: border-box;
  margin-top: 6px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(39, 58, 45, 0.92);
  color: var(--text-main);
  font-family: inherit;
  font-size: 14px;
}

.modal-input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
}

.modal-file {
  margin-top: 8px;
  width: 100%;
  font-size: 13px;
  color: var(--text-muted);
}

.file-name {
  margin-top: 6px;
  color: var(--text-soft);
  font-size: 13px;
}

.preview-image {
  margin-top: 8px;
  width: 100%;
  max-height: 200px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.preview-empty {
  margin-top: 8px;
  padding: 12px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  border-radius: 10px;
  color: var(--text-soft);
  font-size: 13px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
  flex-wrap: wrap;
}

@media (max-width: 1024px) {
  .feed-grid {
    grid-template-columns: repeat(auto-fill, minmax(360px, 1fr));
  }

  .header-btn {
    min-width: 160px;
  }
}

@media (max-width: 640px) {
  .news-page.financial-container {
    padding: 16px;
  }

  .page-header--news {
    padding: 22px 18px;
  }

  .feed-grid {
    grid-template-columns: 1fr;
  }

  .ig-card {
    min-height: 340px;
  }

  .header-btn {
    min-width: 140px;
    min-height: 48px;
    font-size: 0.92rem;
  }

  .header-main {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-start;
  }
}

/* ============================================
   Image Preview Lightbox
   ============================================ */
.image-preview-backdrop {
  background: rgba(0, 0, 0, 0.86);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1100;
  padding: 24px;
}

.image-preview-modal {
  position: relative;
  max-width: 94vw;
  max-height: 94vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
}

.image-preview-full {
  max-width: 94vw;
  max-height: 94vh;
  width: auto;
  height: auto;
  border-radius: 14px;
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.65);
  display: block;
  object-fit: contain;
  background: rgba(0, 0, 0, 0.4);
}

.image-close-btn {
  position: absolute;
  top: -16px;
  right: -16px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  border: 2px solid rgba(255, 255, 255, 0.9);
  background: rgba(15, 23, 42, 0.95);
  color: #ffffff;
  font-size: 26px;
  font-weight: 800;
  line-height: 1;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.55);
  transition: transform 0.18s ease, background 0.18s ease;
  z-index: 2;
}

.image-close-btn:hover {
  transform: scale(1.1);
  background: rgba(220, 38, 38, 0.95);
}

@media (max-width: 768px) {
  .image-close-btn {
    top: -8px;
    right: -8px;
    width: 38px;
    height: 38px;
    font-size: 22px;
  }
}
</style>


