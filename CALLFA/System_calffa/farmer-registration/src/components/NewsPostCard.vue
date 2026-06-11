<template>
  <article class="notice-card" :class="{ 'notice-card--featured': showLatest }">
    <div class="notice-card-accent" aria-hidden="true"></div>

    <header class="notice-card-header">
      <div class="notice-author">
        <img
          :src="authorAvatar"
          :alt="item.author_name || 'Author'"
          class="author-avatar"
          loading="lazy"
        />
        <div class="author-info">
          <span class="author-name">{{ item.author_name || item.author_role || 'Member' }}</span>
          <span class="author-role" :class="roleClass">{{ item.author_role }}</span>
        </div>
      </div>
      <div class="notice-header-end">
        <span v-if="showStatus" class="status-pill" :class="`status-${item.status}`">{{ statusLabel }}</span>
        <div class="notice-meta">
          <time class="notice-date" :datetime="item.created_at">{{ dateShort }}</time>
          <span class="notice-time">{{ timeOnly }}</span>
        </div>
        <div v-if="canEdit || canDelete" class="notice-actions">
          <button v-if="canEdit" type="button" class="action-btn" title="Edit" @click="$emit('edit', item)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10.5-10.5a2 2 0 000-2.83L17.83 7a2 2 0 00-2.83 0L4 16.5V20z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button v-if="canDelete" type="button" class="action-btn action-btn--danger" title="Delete" @click="$emit('delete', item.id)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M5 7h16M9 7V5h6v2M8 10v7M12 10v7M16 10v7M6.5 7l1 13h6l1-13" stroke-linecap="round"/></svg>
          </button>
        </div>
      </div>
    </header>

    <div class="notice-card-body">
      <div v-if="showLatest" class="notice-badge-latest">Latest</div>
      <div class="notice-body-layout" :class="{ 'notice-body-layout--with-image': item.image }">
        <div class="notice-main">
          <h2 class="notice-title">{{ item.title }}</h2>
          <div class="notice-content-wrap">
            <p class="notice-content" :class="{ 'notice-content--clamped': !expanded && longContent }">{{ item.content }}</p>
            <button v-if="longContent" type="button" class="read-more-btn" @click="expanded = !expanded">
              {{ expanded ? 'Show less' : 'Read full article' }}
            </button>
          </div>
        </div>
        <figure v-if="item.image" class="notice-figure">
          <img
            :src="imageUrl"
            :alt="item.title"
            class="notice-image"
            loading="lazy"
            @click="$emit('preview-image', imageUrl, item.title)"
          />
          <figcaption class="notice-figure-cap">Enlarge</figcaption>
        </figure>
      </div>
    </div>

    <footer class="notice-card-footer">
      <span>Posted {{ relativeDate }}</span>
      <span v-if="item.updated_at && item.updated_at !== item.created_at" class="edited-tag">Edited</span>
      <span v-if="item.status === 'rejected' && item.rejection_reason" class="rejection-tag">{{ item.rejection_reason }}</span>
    </footer>
  </article>
</template>

<script setup>
import { computed, ref } from 'vue'

const props = defineProps({
  item: { type: Object, required: true },
  showLatest: { type: Boolean, default: false },
  showStatus: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  apiOrigin: { type: String, default: 'http://localhost:3000' }
})

defineEmits(['edit', 'delete', 'preview-image'])

const expanded = ref(false)
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
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric', timeZone: MANILA_TZ })
}

const formatTimeOnly = (date) => {
  const d = parseLocalDateTime(date)
  if (!d) return ''
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MANILA_TZ })
}

const formatRelativeDate = (date) => {
  const d = parseLocalDateTime(date)
  if (!d) return ''
  const now = new Date()
  const start = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  const dayDiff = Math.round((start(now) - start(d)) / 86400000)
  if (dayDiff === 0) return 'today'
  if (dayDiff === 1) return 'yesterday'
  if (dayDiff > 1 && dayDiff < 7) return `${dayDiff} days ago`
  return formatDateShort(date)
}

const resolveImageUrl = (imagePath) => {
  if (!imagePath) return ''
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) return imagePath
  const normalized = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${props.apiOrigin}${normalized}`
}

const authorAvatar = computed(() => {
  const name = props.item?.author_name || 'User'
  const profile = props.item?.author_profile
  if (profile) {
    if (profile.startsWith('http://') || profile.startsWith('https://')) return profile
    return resolveImageUrl(profile)
  }
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=166534&color=fff&size=128`
})

const imageUrl = computed(() => resolveImageUrl(props.item?.image))
const dateShort = computed(() => formatDateShort(props.item?.created_at))
const timeOnly = computed(() => formatTimeOnly(props.item?.created_at))
const relativeDate = computed(() => formatRelativeDate(props.item?.created_at))
const longContent = computed(() => String(props.item?.content || '').length > 280)

const roleClass = computed(() => {
  const r = String(props.item?.author_role || '').toLowerCase()
  if (r === 'president') return 'role-president'
  if (r === 'admin') return 'role-admin'
  if (r === 'farmer') return 'role-farmer'
  return 'role-other'
})

const statusLabel = computed(() => {
  const s = String(props.item?.status || '').toLowerCase()
  if (s === 'pending') return 'Pending'
  if (s === 'published') return 'Published'
  if (s === 'rejected') return 'Rejected'
  return s || 'Unknown'
})
</script>

<style scoped>
.notice-card {
  position: relative;
  border-radius: 14px;
  background: rgba(28, 42, 33, 0.94);
  border: 1px solid rgba(190, 235, 203, 0.14);
  overflow: hidden;
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.2);
}

.notice-card--featured {
  border-color: rgba(74, 222, 128, 0.4);
}

.notice-card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 4px;
  background: linear-gradient(180deg, #4ade80, #2dd4bf);
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
  flex-wrap: wrap;
  justify-content: flex-end;
}

.notice-meta {
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  text-align: right;
}

.notice-date { font-size: 0.8rem; font-weight: 700; color: #eefde6; }
.notice-time { font-size: 0.68rem; color: rgba(220, 238, 211, 0.5); }

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

.author-info { display: flex; flex-direction: column; min-width: 0; }
.author-name { font-size: 0.8rem; font-weight: 700; color: #eefde6; }
.author-role { font-size: 0.62rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.role-president { color: #a5b4fc; }
.role-admin { color: #86efac; }
.role-farmer { color: #fde68a; }
.role-other { color: rgba(220, 238, 211, 0.5); }

.status-pill {
  padding: 0.15rem 0.45rem;
  border-radius: 6px;
  font-size: 0.58rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid rgba(190, 235, 203, 0.25);
}
.status-pending { color: #fde68a; background: rgba(251, 191, 36, 0.12); border-color: rgba(251, 191, 36, 0.35); }
.status-published { color: #86efac; background: rgba(74, 222, 128, 0.12); border-color: rgba(74, 222, 128, 0.35); }
.status-rejected { color: #fca5a5; background: rgba(248, 113, 113, 0.12); border-color: rgba(248, 113, 113, 0.35); }

.notice-actions { display: flex; gap: 0.35rem; }
.action-btn {
  width: 2rem; height: 2rem; display: flex; align-items: center; justify-content: center;
  border-radius: 8px; border: 1px solid rgba(190, 235, 203, 0.14);
  background: rgba(0, 0, 0, 0.2); color: #2dd4bf; cursor: pointer; padding: 0;
}
.action-btn svg { width: 0.9rem; height: 0.9rem; }
.action-btn--danger { color: #f87171; }

.notice-card-body { padding: 1rem 1.1rem 0.85rem 1.25rem; }
.notice-badge-latest {
  display: inline-block; margin-bottom: 0.5rem; padding: 0.15rem 0.5rem; border-radius: 6px;
  font-size: 0.6rem; font-weight: 800; text-transform: uppercase; letter-spacing: 0.06em;
  background: rgba(74, 222, 128, 0.15); color: #4ade80; border: 1px solid rgba(74, 222, 128, 0.35);
}
.notice-title { margin: 0 0 0.45rem; font-size: 1.15rem; font-weight: 800; line-height: 1.35; color: #eefde6; }
.notice-body-layout { width: 100%; }
.notice-body-layout--with-image { display: flex; align-items: flex-start; gap: 0.75rem; }
.notice-body-layout--with-image .notice-main { flex: 1; min-width: 0; }
.notice-main { width: 100%; }
.notice-content { margin: 0; font-size: 0.9rem; line-height: 1.6; color: rgba(220, 238, 211, 0.72); white-space: pre-wrap; word-break: break-word; }
.notice-content--clamped {
  display: -webkit-box; -webkit-line-clamp: 5; line-clamp: 5; -webkit-box-orient: vertical; overflow: hidden;
}
.read-more-btn {
  margin-top: 0.5rem; padding: 0; border: none; background: none; color: #4ade80;
  font-size: 0.8rem; font-weight: 700; cursor: pointer; text-decoration: underline;
}
.notice-figure { flex-shrink: 0; margin: 0; width: 108px; }
.notice-image {
  width: 108px; height: 82px; object-fit: cover; border-radius: 8px;
  border: 1px solid rgba(190, 235, 203, 0.14); cursor: zoom-in; display: block;
}
.notice-figure-cap { margin-top: 0.25rem; font-size: 0.58rem; color: rgba(220, 238, 211, 0.5); text-align: center; }
.notice-card-footer {
  display: flex; align-items: center; flex-wrap: wrap; gap: 0.65rem;
  padding: 0.6rem 1.1rem 0.75rem 1.25rem; border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.72rem; color: rgba(220, 238, 211, 0.5);
}
.edited-tag, .rejection-tag {
  padding: 0.1rem 0.4rem; border-radius: 4px; background: rgba(255, 255, 255, 0.06);
  font-size: 0.62rem; font-weight: 700; text-transform: uppercase;
}
.rejection-tag { color: #fca5a5; text-transform: none; font-weight: 600; }
</style>
