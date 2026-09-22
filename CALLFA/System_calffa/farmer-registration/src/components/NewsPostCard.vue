<template>
  <article
    class="notice-card"
    :class="{ 'notice-card--featured': showLatest }"
    role="button"
    tabindex="0"
    @click="onCardClick"
    @keydown.enter.prevent="emitOpen"
    @keydown.space.prevent="emitOpen"
  >
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
          <span class="author-role" :class="roleClass">{{ formatAuthorRole(item.author_role) }}</span>
          <div class="notice-meta">
            <time class="notice-date" :datetime="item.created_at">{{ dateShort }}</time>
            <span class="notice-time">{{ timeOnly }}</span>
          </div>
        </div>
      </div>
      <div
        v-if="showStatus || canEdit || canDelete"
        class="notice-header-end"
      >
        <span v-if="showStatus" class="status-pill" :class="`status-${item.status}`">{{ statusLabel }}</span>
        <div v-if="canEdit || canDelete" class="notice-actions" @click.stop>
          <button
            v-if="canEdit"
            type="button"
            class="action-btn"
            :title="$t('common.edit')"
            @click="$emit('edit', item)"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M4 20h4l10.5-10.5a2 2 0 000-2.83L17.83 7a2 2 0 00-2.83 0L4 16.5V20z" stroke-linecap="round" stroke-linejoin="round"/></svg>
          </button>
          <button
            v-if="canDelete"
            type="button"
            class="action-btn action-btn--danger"
            :title="$t('ui.deleteNews')"
            :aria-label="$t('ui.deleteNews')"
            @click="$emit('delete', item.id)"
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
      <div v-if="showLatest" class="notice-badge-latest">{{ $t('ui.latest') }}</div>
      <div class="notice-body-layout" :class="{ 'notice-body-layout--with-image': item.image }">
        <div class="notice-main">
          <h2 class="notice-title">{{ item.title }}</h2>
          <div class="notice-content-wrap">
            <p class="notice-content notice-content--clamped">{{ item.content }}</p>
            <span v-if="needsMore" class="read-more-hint">{{ $t('ui.readMore') }}</span>
          </div>
        </div>
        <figure v-if="item.image" class="notice-figure" @click.stop>
          <img
            :src="imageUrl"
            :alt="item.title"
            class="notice-image"
            loading="lazy"
            @click="$emit('preview-image', imageUrl, item.title)"
          />
        </figure>
      </div>
    </div>

    <footer class="notice-card-footer">
      <span>{{ $t('ui.postedDate', { date: relativeDate }) }}</span>
      <span v-if="item.updated_at && item.updated_at !== item.created_at" class="edited-tag">{{ $t('ui.edited') }}</span>
      <span v-if="item.status === 'rejected' && item.rejection_reason" class="rejection-tag">{{ item.rejection_reason }}</span>
    </footer>
  </article>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { mediaUrl } from '../utils/apiBase'

const props = defineProps({
  item: { type: Object, required: true },
  showLatest: { type: Boolean, default: false },
  showStatus: { type: Boolean, default: false },
  canEdit: { type: Boolean, default: false },
  canDelete: { type: Boolean, default: false },
  apiOrigin: { type: String, default: '' }
})

const emit = defineEmits(['edit', 'delete', 'preview-image', 'open'])

const { t, locale } = useI18n()

const MANILA_TZ = 'Asia/Manila'

const dateLocale = computed(() => (locale.value === 'tl' ? 'fil-PH' : 'en-PH'))

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
  return d.toLocaleDateString(dateLocale.value, { year: 'numeric', month: 'short', day: 'numeric', timeZone: MANILA_TZ })
}

const formatTimeOnly = (date) => {
  const d = parseLocalDateTime(date)
  if (!d) return ''
  return d.toLocaleTimeString(dateLocale.value, { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: MANILA_TZ })
}

const formatRelativeDate = (date) => {
  const d = parseLocalDateTime(date)
  if (!d) return ''
  const now = new Date()
  const start = (dt) => new Date(dt.getFullYear(), dt.getMonth(), dt.getDate())
  const dayDiff = Math.round((start(now) - start(d)) / 86400000)
  if (dayDiff === 0) return t('ui.today')
  if (dayDiff === 1) return t('ui.yesterday')
  if (dayDiff > 1 && dayDiff < 7) return t('ui.daysAgo', { n: dayDiff })
  return formatDateShort(date)
}

const resolveImageUrl = (imagePath) => mediaUrl(imagePath)

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

const authorAvatar = computed(() => {
  const name = props.item?.author_name || 'User'
  const profile = props.item?.author_profile
  if (profile) return resolveImageUrl(profile)
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=166534&color=fff&size=128`
})

const imageUrl = computed(() => resolveImageUrl(props.item?.image))
const dateShort = computed(() => formatDateShort(props.item?.created_at))
const timeOnly = computed(() => formatTimeOnly(props.item?.created_at))
const relativeDate = computed(() => formatRelativeDate(props.item?.created_at))
const needsMore = computed(() => String(props.item?.content || '').trim().length > 90)

const roleClass = computed(() => {
  const r = String(props.item?.author_role || '').toLowerCase()
  if (r === 'president') return 'role-president'
  if (r === 'admin') return 'role-admin'
  if (r === 'farmer') return 'role-farmer'
  return 'role-other'
})

const statusLabel = computed(() => {
  const s = String(props.item?.status || '').toLowerCase()
  if (s === 'pending') return t('common.pending')
  if (s === 'published') return t('ui.publishedStatus')
  if (s === 'rejected') return t('common.rejected')
  return s || t('ui.unknownStatus')
})

const emitOpen = () => emit('open', props.item)

const onCardClick = () => emitOpen()
</script>

<style scoped>
.notice-card {
  position: relative;
  border-radius: 14px;
  background: rgba(28, 42, 33, 0.94);
  border: 1px solid rgba(190, 235, 203, 0.14);
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
  height: 100%;
  display: flex;
  flex-direction: column;
  max-width: 100%;
  box-sizing: border-box;
}

.notice-card:hover {
  border-color: rgba(74, 222, 128, 0.35);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28);
}

.notice-card:focus-visible {
  outline: 2px solid rgba(74, 222, 128, 0.65);
  outline-offset: 2px;
}

.notice-card--featured {
  border-color: rgba(74, 222, 128, 0.4);
}

.notice-card-accent {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 3px;
  background: linear-gradient(180deg, #4ade80, #2dd4bf);
}

.notice-card-header {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.4rem 0.65rem;
  padding: 0.7rem 0.85rem 0.55rem 0.9rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
}

.notice-header-end {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-left: auto;
  flex-shrink: 0;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.notice-meta {
  display: flex;
  flex-direction: column;
  gap: 0;
  margin-top: 0.06rem;
  text-align: left;
}

.notice-date {
  font-size: 0.54rem;
  font-weight: 600;
  color: rgba(220, 238, 211, 0.65);
  line-height: 1.15;
}
.notice-time {
  font-size: 0.5rem;
  color: rgba(220, 238, 211, 0.5);
  line-height: 1.15;
}

.notice-author {
  display: flex;
  align-items: flex-start;
  gap: 0.4rem;
  min-width: 0;
  flex: 1;
}

.author-avatar {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
  margin-top: 0.04rem;
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
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1.2;
  color: #eefde6;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.author-role {
  font-size: 0.55rem;
  font-weight: 700;
  line-height: 1.2;
  text-transform: uppercase;
  letter-spacing: 0.03em;
}
.role-president { color: #a5b4fc; }
.role-admin { color: #86efac; }
.role-farmer { color: #fde68a; }
.role-other { color: rgba(220, 238, 211, 0.5); }

.status-pill {
  padding: 0.12rem 0.4rem;
  border-radius: 6px;
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 1px solid rgba(190, 235, 203, 0.25);
}
.status-pending { color: #fde68a; background: rgba(251, 191, 36, 0.12); border-color: rgba(251, 191, 36, 0.35); }
.status-published { color: #86efac; background: rgba(74, 222, 128, 0.12); border-color: rgba(74, 222, 128, 0.35); }
.status-rejected { color: #fca5a5; background: rgba(248, 113, 113, 0.12); border-color: rgba(248, 113, 113, 0.35); }

.notice-actions { display: flex; gap: 0.3rem; }
.action-btn {
  width: 2rem;
  height: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  background: rgba(0, 0, 0, 0.2);
  color: #2dd4bf;
  cursor: pointer;
  padding: 0;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.action-btn svg { width: 1rem; height: 1rem; }
.action-btn:hover { background: rgba(45, 212, 191, 0.12); }
.action-btn--danger {
  color: #fca5a5;
  background: rgba(127, 29, 29, 0.35);
  border-color: rgba(248, 113, 113, 0.55);
}
.action-btn--danger svg { width: 1.05rem; height: 1.05rem; }
.action-btn--danger:hover {
  color: #fecaca;
  background: rgba(153, 27, 27, 0.55);
  border-color: #f87171;
}

.notice-card-body {
  padding: 0.75rem 0.95rem 0.7rem 1.05rem;
  flex: 1;
  min-width: 0;
}
.notice-badge-latest {
  display: inline-block;
  margin-bottom: 0.4rem;
  padding: 0.12rem 0.45rem;
  border-radius: 6px;
  font-size: 0.55rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  background: rgba(74, 222, 128, 0.15);
  color: #4ade80;
  border: 1px solid rgba(74, 222, 128, 0.35);
}
.notice-title {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.3;
  color: #eefde6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.notice-body-layout { width: 100%; min-width: 0; }
.notice-body-layout--with-image {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
}
.notice-body-layout--with-image .notice-main { flex: 1; min-width: 0; }
.notice-main { width: 100%; min-width: 0; }
.notice-content {
  margin: 0;
  font-size: 0.875rem;
  line-height: 1.45;
  color: rgba(220, 238, 211, 0.72);
  white-space: pre-wrap;
  word-break: break-word;
}
.notice-content--clamped {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  white-space: normal;
}
.read-more-hint {
  display: inline-block;
  margin-top: 0.35rem;
  color: #4ade80;
  font-size: 0.78rem;
  font-weight: 700;
}
.notice-figure { flex-shrink: 0; margin: 0; width: 112px; max-width: 34%; }
.notice-image {
  width: 112px;
  max-width: 100%;
  height: 84px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  cursor: zoom-in;
  display: block;
}
.notice-card-footer {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.5rem;
  padding: 0.55rem 0.95rem 0.7rem 1.05rem;
  border-top: 1px solid rgba(255, 255, 255, 0.05);
  font-size: 0.72rem;
  color: rgba(220, 238, 211, 0.5);
  margin-top: auto;
}
.edited-tag, .rejection-tag {
  padding: 0.08rem 0.35rem;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.06);
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
}
.rejection-tag { color: #fca5a5; text-transform: none; font-weight: 600; }

@media (max-width: 640px) {
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
  .author-avatar {
    width: 2.1rem;
    height: 2.1rem;
  }
  .author-name { font-size: 0.7rem; }
  .author-role { font-size: 0.52rem; }
  .notice-title { font-size: 0.95rem; margin-bottom: 0.3rem; }
  .notice-content { font-size: 0.8rem; line-height: 1.4; }
  .notice-figure { width: 88px; }
  .notice-image { width: 88px; height: 66px; }
  .action-btn {
    width: 1.85rem;
    height: 1.85rem;
  }
  .notice-body-layout--with-image {
    gap: 0.55rem;
  }
}
</style>
