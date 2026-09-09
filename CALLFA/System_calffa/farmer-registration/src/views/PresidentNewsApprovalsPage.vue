<template>
  <div class="page-container president-news-approvals-page" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.pendingNewsApprovals') }}</h1>
        <p class="page-subtitle">{{ $t('ui.reviewPublishReject') }}</p>
      </div>
      <button type="button" class="btn-header-add" @click="goBack">
        {{ $t('common.backToNews') }}
      </button>
    </div>

    <div v-if="toastMessage" class="toast" :class="toastType">{{ toastMessage }}</div>

    <div class="tools-card">
      <span class="record-count">{{ $t('ui.itemsCountParen', { n: pendingNews.length }) }}</span>
    </div>

    <div class="card news-data-card">
      <div v-if="loading" class="empty-state">{{ $t('ui.loadingPendingNews') }}</div>
      <div v-else-if="pendingNews.length === 0" class="empty-state">{{ $t('ui.noPendingNews') }}</div>

      <div v-else class="news-card-list">
        <article v-for="item in pendingNews" :key="item.id" class="news-mobile-card">
          <div class="news-card-top">
            <h3 class="news-card-title">{{ item.title }}</h3>
            <span class="status-badge pending">{{ item.status }}</span>
          </div>
          <div class="news-card-meta">
            <div class="news-meta-row">
              <span class="news-meta-label">{{ $t('ui.date') }}</span>
              <span>{{ formatDate(item.created_at) }}</span>
            </div>
            <div class="news-meta-row">
              <span class="news-meta-label">{{ $t('ui.author') }}</span>
              <span>{{ item.author_name || item.author_role || '—' }}</span>
            </div>
            <div class="news-meta-row">
              <span class="news-meta-label">{{ $t('ui.newsContent') }}</span>
              <span>{{ truncateText(item.content) }}</span>
            </div>
          </div>
          <img
            v-if="item.image"
            :src="resolveImageUrl(item.image)"
            :alt="item.title"
            class="news-card-thumb"
          />
          <div class="news-card-actions">
            <button type="button" class="news-action-text news-action-view" @click="openViewModal(item)">
              {{ $t('common.view') }}
            </button>
            <button type="button" class="news-action-text news-action-approve" :disabled="processingId === item.id" @click="approveNews(item)">
              {{ $t('common.approve') }}
            </button>
            <button type="button" class="news-action-text news-action-reject" :disabled="processingId === item.id" @click="openRejectModal(item)">
              {{ $t('common.reject') }}
            </button>
            <button type="button" class="news-action-text news-action-delete" :disabled="processingId === item.id" @click="openDeleteModal(item)">
              {{ $t('common.delete') }}
            </button>
          </div>
        </article>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showViewModal && selectedNews"
          class="modal-overlay app-modal-overlay news-approvals-modal"
          :class="{ 'light-theme': isLight }"
          @click.self="closeModals"
        >
          <div class="modal-content modal-large" role="dialog" aria-modal="true" @click.stop>
            <div class="modal-header">
              <div class="modal-title-text">
                <h3>{{ selectedNews.title }}</h3>
                <p class="modal-subtitle">{{ selectedNews.author_name || selectedNews.author_role }} · {{ formatDate(selectedNews.created_at) }}</p>
              </div>
              <button type="button" class="close-btn" :aria-label="$t('common.close')" @click="closeModals">&times;</button>
            </div>
            <div class="modal-body">
              <img
                v-if="selectedNews.image"
                :src="resolveImageUrl(selectedNews.image)"
                :alt="selectedNews.title"
                class="modal-news-image"
              />
              <p class="modal-news-content">{{ selectedNews.content }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" @click="closeModals">{{ $t('common.close') }}</button>
              <button type="button" class="btn btn-submit" :disabled="processingId === selectedNews.id" @click="approveNews(selectedNews)">
                {{ $t('common.approve') }}
              </button>
              <button type="button" class="btn btn-submit btn-danger" :disabled="processingId === selectedNews.id" @click="openRejectModal(selectedNews)">
                {{ $t('common.reject') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>

      <Transition name="app-modal">
        <div
          v-if="showRejectModal && selectedNews"
          class="modal-overlay app-modal-overlay news-approvals-modal"
          :class="{ 'light-theme': isLight }"
          @click.self="closeModals"
        >
          <div class="modal-content" role="dialog" aria-modal="true" @click.stop>
            <div class="modal-header">
              <div class="modal-title-text">
                <h3>{{ $t('common.reject') }}</h3>
                <p class="modal-subtitle">{{ selectedNews.title }}</p>
              </div>
              <button type="button" class="close-btn" :aria-label="$t('common.close')" @click="closeModals">&times;</button>
            </div>
            <form class="modal-body" @submit.prevent="confirmReject">
              <div class="form-group">
                <label>{{ $t('ui.rejectionReasonRequired') }}</label>
                <textarea
                  v-model="rejectReason"
                  rows="4"
                  required
                  :placeholder="$t('ui.rejectionReasonRequired')"
                ></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn btn-cancel" @click="closeModals">{{ $t('common.cancel') }}</button>
                <button type="submit" class="btn btn-submit btn-danger" :disabled="processingId === selectedNews.id">
                  {{ $t('common.reject') }}
                </button>
              </div>
            </form>
          </div>
        </div>
      </Transition>

      <Transition name="app-modal">
        <div
          v-if="showDeleteModal && selectedNews"
          class="modal-overlay app-modal-overlay news-approvals-modal"
          :class="{ 'light-theme': isLight }"
          @click.self="closeModals"
        >
          <div class="modal-content" role="alertdialog" aria-modal="true" @click.stop>
            <div class="modal-header">
              <div class="modal-title-text">
                <h3>{{ $t('ui.deleteNews') }}</h3>
                <p class="modal-subtitle">{{ selectedNews.title }}</p>
              </div>
              <button type="button" class="close-btn" :aria-label="$t('common.close')" @click="closeModals">&times;</button>
            </div>
            <div class="modal-body">
              <p class="delete-warning">{{ $t('ui.deleteThisNewsPost') }}</p>
            </div>
            <div class="modal-footer">
              <button type="button" class="btn btn-cancel" @click="closeModals">{{ $t('common.cancel') }}</button>
              <button type="button" class="btn btn-submit btn-danger" :disabled="processingId === selectedNews.id" @click="confirmDelete">
                {{ $t('common.delete') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const API_ORIGIN = ''

const authStore = useAuthStore()
const router = useRouter()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const token = computed(() => authStore.token)
const userRole = computed(() => (authStore.currentUser?.role || '').toLowerCase())

const loading = ref(false)
const processingId = ref(null)
const errorMessage = ref('')
const successMessage = ref('')
const toastMessage = ref('')
const toastType = ref('success')
let toastTimer = null
const newsItems = ref([])

const selectedNews = ref(null)
const showViewModal = ref(false)
const showRejectModal = ref(false)
const showDeleteModal = ref(false)
const rejectReason = ref('')

const pendingNews = computed(() => newsItems.value.filter((item) => item.status === 'pending'))

const anyModalOpen = computed(() => showViewModal.value || showRejectModal.value || showDeleteModal.value)

watch(anyModalOpen, (open) => {
  document.body.classList.toggle('app-modal-open', open)
  document.body.style.overflow = open ? 'hidden' : ''
  document.documentElement.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

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
  'Content-Type': 'application/json',
  Authorization: `Bearer ${token.value}`
})

const handleUnauthorized = (message) => {
  authStore.logout()
  errorMessage.value = message || 'Session expired. Please log in again.'
  setTimeout(() => {
    router.push('/login')
  }, 250)
}

const fetchPendingNews = async () => {
  clearMessages()
  if (userRole.value !== 'president') {
    errorMessage.value = 'President access required.'
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
      throw new Error(data.message || 'Failed to fetch pending news')
    }

    newsItems.value = data.data || []
  } catch (err) {
    errorMessage.value = err.message || 'Failed to fetch pending news'
  } finally {
    loading.value = false
  }
}

const closeModals = () => {
  showViewModal.value = false
  showRejectModal.value = false
  showDeleteModal.value = false
  selectedNews.value = null
  rejectReason.value = ''
}

const openViewModal = (item) => {
  selectedNews.value = item
  showRejectModal.value = false
  showDeleteModal.value = false
  showViewModal.value = true
}

const openRejectModal = (item) => {
  selectedNews.value = item
  rejectReason.value = ''
  showViewModal.value = false
  showDeleteModal.value = false
  showRejectModal.value = true
}

const openDeleteModal = (item) => {
  selectedNews.value = item
  showViewModal.value = false
  showRejectModal.value = false
  showDeleteModal.value = true
}

const reviewNews = async (id, action, reason = '') => {
  clearMessages()
  if (userRole.value !== 'president') {
    errorMessage.value = 'Only President can review news.'
    return
  }

  const rejection_reason = String(reason || '').trim()
  if (action === 'rejected' && !rejection_reason) {
    errorMessage.value = 'Rejection reason is required when rejecting.'
    return
  }

  processingId.value = id
  try {
    const response = await fetch(`/api/news/${id}/review`, {
      method: 'PATCH',
      headers: authHeaders(),
      body: JSON.stringify({ action, rejection_reason: rejection_reason || null })
    })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to review news')
    }

    successMessage.value = data.message || 'Review completed.'
    closeModals()
    await fetchPendingNews()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to review news'
  } finally {
    processingId.value = null
  }
}

const approveNews = (item) => reviewNews(item.id, 'published')

const confirmReject = () => {
  if (!selectedNews.value) return
  return reviewNews(selectedNews.value.id, 'rejected', rejectReason.value)
}

const confirmDelete = async () => {
  if (!selectedNews.value) return
  const id = selectedNews.value.id

  clearMessages()
  if (userRole.value !== 'president') {
    errorMessage.value = 'Only President can delete news here.'
    return
  }

  processingId.value = id
  try {
    const response = await fetch(`/api/news/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token.value}` }
    })
    const data = await response.json()

    if (response.status === 401) {
      handleUnauthorized(data.message || 'Session expired. Please log in again.')
      return
    }

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to delete news')
    }

    successMessage.value = data.message || 'News deleted successfully.'
    closeModals()
    await fetchPendingNews()
  } catch (err) {
    errorMessage.value = err.message || 'Failed to delete news'
  } finally {
    processingId.value = null
  }
}

const goBack = () => {
  router.push('/news')
}

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath
  }
  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${API_ORIGIN}${normalized}`
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

const truncateText = (text, max = 110) => {
  const value = String(text || '').trim()
  if (value.length <= max) return value || '—'
  return `${value.slice(0, max).trim()}…`
}

onMounted(fetchPendingNews)

onUnmounted(() => {
  document.body.classList.remove('app-modal-open')
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
  if (toastTimer) clearTimeout(toastTimer)
})
</script>

<style scoped>
.page-container.president-news-approvals-page {
  --surface-1: rgba(28, 42, 33, 0.92);
  --surface-2: rgba(24, 39, 30, 0.92);
  --line-soft: rgba(190, 235, 203, 0.14);
  --text-main: #eefde6;
  --text-muted: rgba(229, 235, 231, 0.82);
  --text-soft: rgba(229, 235, 231, 0.65);
  --panel-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  padding: 2rem;
  max-width: none;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  min-height: calc(100vh - 70px - 3rem);
  box-sizing: border-box;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  color: #eefde6;
  border-radius: 18px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

.page-header-split {
  margin-bottom: 2rem;
  padding: 1.25rem 1.4rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  box-shadow: var(--panel-shadow);
}

.page-header-split::before {
  content: '';
  position: absolute;
  top: -62px;
  right: -72px;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.2) 0%, transparent 68%);
  pointer-events: none;
}

.page-header-split::after {
  content: '';
  position: absolute;
  left: 1.4rem;
  right: 1.4rem;
  bottom: 0.55rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.42), rgba(45, 212, 191, 0.12));
  pointer-events: none;
}

.page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.35rem;
  color: var(--text-main);
}

.page-subtitle {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--text-muted);
}

.btn-header-add {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.45rem 0.95rem;
  border: 1.5px solid #15803d;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9rem;
  line-height: 1.2;
  cursor: pointer;
  color: #000000;
  background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
}

.tools-card {
  display: flex;
  align-items: center;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(28, 42, 33, 0.85);
  border: 1px solid var(--line-soft);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22), inset 1px 1px 0 rgba(255, 255, 255, 0.04);
}

.record-count {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

.news-data-card {
  padding: 0.85rem;
  border-radius: 14px;
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  box-shadow: var(--panel-shadow);
}

.empty-state {
  padding: 1.25rem 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
}

.news-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.news-mobile-card {
  padding: 0.85rem 0.9rem 0.75rem;
  border-radius: 12px;
  border: 1px solid rgba(167, 211, 178, 0.22);
  background: rgba(0, 0, 0, 0.16);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.news-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.news-card-title {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-main);
  word-break: break-word;
  min-width: 0;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  padding: 0.18rem 0.45rem;
  border-radius: 6px;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: capitalize;
  line-height: 1.1;
  background: transparent;
  border: 1px solid rgba(245, 158, 11, 0.55);
  color: #facc15;
}

.news-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin-bottom: 0.55rem;
}

.news-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.55rem;
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--text-main);
}

.news-meta-row > span:last-child {
  text-align: right;
  word-break: break-word;
  min-width: 0;
}

.news-meta-label {
  flex-shrink: 0;
  min-width: 4.8rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.news-card-thumb {
  display: block;
  width: 100%;
  max-height: 160px;
  object-fit: cover;
  border-radius: 8px;
  margin-bottom: 0.55rem;
}

.news-card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding-top: 0.45rem;
  border-top: 1px solid rgba(190, 235, 203, 0.12);
}

.news-action-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-width: 4.6rem;
  min-height: 36px;
  padding: 0.42rem 0.45rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  text-align: center;
  border: 1.5px solid transparent;
  background: rgba(10, 24, 18, 0.95);
}

.news-action-text:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.news-action-view {
  color: #d1fae5;
  border-color: rgba(52, 211, 153, 0.45);
}

.news-action-approve {
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.5);
}

.news-action-reject,
.news-action-delete {
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.45);
}

.toast {
  position: fixed;
  right: 1rem;
  top: calc(70px + 0.85rem);
  z-index: 1200;
  background: #14532d;
  color: #fff;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.28);
  font-weight: 600;
  font-size: 0.85rem;
  max-width: min(22rem, calc(100vw - 2rem));
}

.toast.error {
  background: #991b1b;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11050;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
  background: rgba(6, 12, 9, 0.62);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-content {
  width: 100%;
  max-width: 520px;
  max-height: min(92dvh, calc(100dvh - 1.5rem));
  margin: auto;
  background: rgba(28, 42, 33, 0.96);
  color: #eefde6;
  border-radius: 14px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.modal-content.modal-large {
  max-width: min(48rem, calc(100vw - 1.5rem));
}

.modal-header,
.modal-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 1.1rem 1.25rem;
}

.modal-header {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-footer {
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  justify-content: flex-end;
  flex-wrap: wrap;
}

.modal-title-text {
  min-width: 0;
}

.modal-header h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.25;
  color: #eefde6;
}

.modal-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.82);
  line-height: 1.35;
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid rgba(190, 235, 203, 0.15);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(229, 235, 231, 0.65);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 1.1rem 1.25rem;
}

.modal-news-image {
  display: block;
  width: 100%;
  max-height: 240px;
  object-fit: cover;
  border-radius: 10px;
  margin-bottom: 0.85rem;
}

.modal-news-content,
.delete-warning {
  margin: 0;
  font-size: 0.92rem;
  line-height: 1.5;
  color: rgba(229, 235, 231, 0.9);
  white-space: pre-wrap;
  word-break: break-word;
}

.form-group {
  margin-bottom: 1.05rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(229, 235, 231, 0.82);
}

.form-group textarea {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(190, 235, 203, 0.24);
  border-radius: 9px;
  font-size: 0.95rem;
  background: rgba(0, 0, 0, 0.24);
  color: #eefde6;
  box-sizing: border-box;
  resize: vertical;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 40px;
  padding: 0.55rem 1.15rem;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  border: 1.5px solid transparent;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.08);
  color: #eefde6;
  border-color: rgba(190, 235, 203, 0.28);
}

.btn-submit {
  background: #16a34a;
  color: #ffffff;
  border-color: #14532d;
}

.btn-submit.btn-danger {
  background: #ef4444;
  border-color: #b91c1c;
}

@media (max-width: 768px) {
  .page-container.president-news-approvals-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    padding: 0.75rem;
    border-radius: 0;
    overflow-x: hidden;
  }

  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "title action"
      "subtitle action";
    align-items: center;
    column-gap: 0.65rem;
    row-gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.85rem;
  }

  .page-header-split::after {
    display: none;
  }

  .page-header-text {
    display: contents;
    min-width: 0;
  }

  .page-title {
    grid-area: title;
    font-size: 1.2rem;
    margin: 0;
    line-height: 1.25;
  }

  .page-subtitle {
    grid-area: subtitle;
    font-size: 0.75rem;
    line-height: 1.3;
  }

  .btn-header-add {
    grid-area: action;
    min-height: 34px;
    padding: 0.35rem 0.65rem;
    font-size: 0.78rem;
    border-radius: 9px;
  }

  .tools-card {
    padding: 0.65rem 0.7rem;
    margin-bottom: 0.75rem;
  }

  .record-count {
    font-size: 0.75rem;
  }

  .news-data-card {
    padding: 0;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .news-card-list {
    gap: 0.55rem;
  }

  .news-mobile-card {
    padding: 0.7rem 0.75rem 0.65rem;
  }

  .news-card-title {
    font-size: 0.95rem;
  }

  .news-action-text {
    min-height: 36px;
    font-size: 0.78rem;
  }

  .modal-overlay {
    padding:
      max(0.65rem, env(safe-area-inset-top, 0px))
      0.75rem
      0.75rem;
  }

  .modal-header,
  .modal-body,
  .modal-footer {
    padding-left: 0.95rem;
    padding-right: 0.95rem;
  }

  .modal-actions,
  .modal-footer {
    flex-direction: column-reverse;
    align-items: stretch;
  }

  .modal-actions > *,
  .modal-footer > * {
    width: 100%;
  }
}

@media (max-width: 480px) {
  .page-container.president-news-approvals-page {
    padding: 0.65rem;
  }

  .page-title {
    font-size: 1.1rem;
  }

  .btn-header-add {
    min-height: 32px;
    padding: 0.3rem 0.55rem;
    font-size: 0.72rem;
  }

  .news-action-text {
    font-size: 0.72rem;
    min-height: 34px;
    padding: 0.35rem 0.3rem;
  }
}

.president-news-approvals-page.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
}

.president-news-approvals-page.light-theme .page-header-split,
.president-news-approvals-page.light-theme .tools-card,
.president-news-approvals-page.light-theme .news-data-card {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 8px 26px rgba(22, 101, 52, 0.1), inset 1px 1px 0 rgba(255, 255, 255, 0.65);
}

.president-news-approvals-page.light-theme .page-title {
  color: #052e16;
}

.president-news-approvals-page.light-theme .page-subtitle,
.president-news-approvals-page.light-theme .record-count,
.president-news-approvals-page.light-theme .empty-state {
  color: #166534;
}

.president-news-approvals-page.light-theme .news-mobile-card {
  background: #ffffff;
  border-color: #bbf7d0;
}

.president-news-approvals-page.light-theme .news-card-title,
.president-news-approvals-page.light-theme .news-meta-row {
  color: #052e16;
}

.president-news-approvals-page.light-theme .news-meta-label {
  color: #64748b;
}

.president-news-approvals-page.light-theme .news-card-actions {
  border-top-color: #bbf7d0;
}

.president-news-approvals-page.light-theme .status-badge.pending {
  background: #fef9c3;
  border-color: #ca8a04;
  color: #92400e;
}

.president-news-approvals-page.light-theme .news-action-view,
.president-news-approvals-page.light-theme .news-action-approve {
  color: #166534;
  background: #f0fdf4;
  border-color: #86efac;
}

.president-news-approvals-page.light-theme .news-action-reject,
.president-news-approvals-page.light-theme .news-action-delete {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fca5a5;
}

.modal-overlay.light-theme .modal-content {
  background: #fffef9;
  border-color: #86efac;
  color: #052e16;
}

.modal-overlay.light-theme .modal-header,
.modal-overlay.light-theme .modal-footer {
  background: #fffef9;
  border-color: #bbf7d0;
}

.modal-overlay.light-theme .modal-header h3 {
  color: #052e16;
}

.modal-overlay.light-theme .modal-subtitle,
.modal-overlay.light-theme .form-group label,
.modal-overlay.light-theme .modal-news-content,
.modal-overlay.light-theme .delete-warning {
  color: #166534;
}

.modal-overlay.light-theme .close-btn {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.modal-overlay.light-theme .form-group textarea {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #052e16;
}

.modal-overlay.light-theme .btn-cancel {
  background: #ffffff;
  color: #052e16;
  border-color: #86efac;
}
</style>

<style>
.news-approvals-modal.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 11050 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: rgba(6, 12, 9, 0.62) !important;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.news-approvals-modal.modal-overlay.light-theme {
  background: rgba(15, 23, 42, 0.48) !important;
}

@media (max-width: 768px) {
  .news-approvals-modal.modal-overlay {
    padding:
      max(0.65rem, env(safe-area-inset-top, 0px))
      0.75rem
      0.75rem !important;
  }

  .news-approvals-modal.modal-overlay .modal-content,
  .news-approvals-modal.modal-overlay .modal-content.modal-large {
    width: min(calc(100vw - 1.5rem), 100%) !important;
    max-width: calc(100vw - 1.5rem) !important;
    max-height: min(92dvh, calc(100dvh - 1.5rem)) !important;
    margin: auto !important;
  }
}
</style>
