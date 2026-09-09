<template>
  <div
    class="members-summary-page min-h-screen p-4 lg:p-6"
    :class="{ 'light-theme': isLight, 'is-agriculturist': isAgriculturist }"
  >
    <div class="max-w-6xl mx-auto ms-page-inner">
      <div class="page-header page-header-split">
        <div class="page-header-text">
          <h1 class="page-title">{{ $t('common.membersSummary') }}</h1>
          <p class="page-subtitle">{{ $t('ui.searchFarmer') }}</p>
        </div>
        <div
          v-if="!isAgriculturist || selectedFarmer"
          class="page-header-actions"
        >
          <button
            v-if="!isAgriculturist"
            type="button"
            @click="goToMembersManagement"
            class="back-to-management-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="back-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ $t('common.backToMembers') }}
          </button>
          <button
            v-if="selectedFarmer"
            type="button"
            @click="resetSelection"
            class="back-to-members-btn"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="back-btn-icon" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
            </svg>
            {{ $t('common.backToSearch') }}
          </button>
        </div>
      </div>

      <div v-if="pageError" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        {{ pageError }}
      </div>

      <!-- SEARCH-FIRST -->
      <div v-if="!selectedFarmer" class="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 ms-search-panel">
        <label class="block text-sm font-semibold text-gray-700 mb-2">{{ $t('ui.searchFarmerLabel') }}</label>
        <input
          v-model="query"
          type="text"
          class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-400"
          :placeholder="$t('ui.typeNameOrRef')"
          autocomplete="off"
        />

        <div class="mt-4">
          <div v-if="!query.trim()" class="p-6 text-center text-sm text-gray-500 border rounded-lg bg-gray-50">
            Start typing to search.
          </div>

          <div v-else class="ms-search-results border rounded-lg overflow-hidden">
            <div class="max-h-[520px] overflow-y-auto overflow-x-hidden">
              <button
                v-for="f in filteredFarmers"
                :key="f.id"
                type="button"
                class="ms-search-result"
                @click="selectFarmer(f)"
              >
                <span class="ms-search-name">{{ f.full_name }}</span>
                <span class="ms-search-ref">{{ f.reference_number || 'N/A' }}</span>
              </button>
              <div v-if="filteredFarmers.length === 0" class="p-6 text-center text-sm text-gray-500">
                {{ $t('ui.noMatches') }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SINGLE-FARMER SUMMARY -->
      <div v-else class="profile-wrapper">

        <!-- â”€â”€ Hero Header Card â”€â”€ -->
        <div class="profile-hero">
          <!-- Top Action Bar -->
          <div class="hero-topbar">
            <button @click="refreshSummary" class="refresh-btn" :disabled="loading">
              <svg class="action-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M6 8V4M6 4H10M6 4C7.45904 2.75027 9.3511 2 11.4167 2C15.895 2 19.5833 5.68833 19.5833 10.1667C19.5833 14.645 15.895 18.3333 11.4167 18.3333C7.8048 18.3333 4.74267 15.9947 3.66667 12.75" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ loading ? 'Loading...' : 'Refresh' }}
            </button>
          </div>

          <!-- Identity Row: avatar + name + badges -->
          <div class="hero-identity">
            <div class="hero-avatar-wrap">
              <img
                v-if="getProfilePictureUrl(selectedFarmer.profile_picture)"
                :src="getProfilePictureUrl(selectedFarmer.profile_picture)"
                :alt="$t('ui.profile')"
                class="hero-avatar"
              />
              <div v-else class="hero-avatar hero-avatar-fallback">
                <svg class="avatar-fallback-icon avatar-fallback-icon-lg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                  <path d="M4 20C4 16.6863 7.58172 14 12 14C16.4183 14 20 16.6863 20 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </div>
              <span class="avatar-status-ring" :class="statusDotClass(selectedFarmer.status)"></span>
            </div>
            <div class="hero-info">
              <h2 class="hero-name">{{ selectedFarmer.full_name }}</h2>
              <div class="hero-badges">
                <span class="badge badge-role">{{ selectedFarmer.role || 'Farmer' }}</span>
                <span class="badge" :class="statusBadgeClass(selectedFarmer.status)">
                  <span class="badge-dot" :class="statusDotClass(selectedFarmer.status)"></span>
                  {{ selectedFarmer.status || 'approved' }}
                </span>
              </div>
              <p class="hero-since">Member since {{ formatDate(selectedFarmer.registered_on) }}</p>
            </div>
          </div>

          <!-- Quick Info Grid: ref / barangay / phone / address -->
          <div class="quick-info-grid">
            <div class="info-tile">
              <div class="info-tile-icon">
                <svg class="tile-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M9 3L7 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M17 3L15 21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M4 9H20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                  <path d="M3 15H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                </svg>
              </div>
              <div class="info-tile-body">
                <div class="info-tile-label">Reference No.</div>
                <div class="info-tile-value-row">
                  <span class="info-tile-value ref-highlight">{{ selectedFarmer.reference_number || 'N/A' }}</span>
                  <button
                    v-if="selectedFarmer.reference_number"
                    @click.stop="copyRefNumber"
                    class="copy-btn"
                    :title="copiedRef ? 'Copied!' : 'Copy to clipboard'"
                  >
                    <svg v-if="copiedRef" class="copy-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <path d="M5 12.5L9.5 17L19 7.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    <svg v-else class="copy-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                      <rect x="9" y="9" width="10" height="10" rx="2" stroke="currentColor" stroke-width="1.8"/>
                      <path d="M7 15H6C4.89543 15 4 14.1046 4 13V6C4 4.89543 4.89543 4 6 4H13C14.1046 4 15 4.89543 15 6V7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            <div class="info-tile">
              <div class="info-tile-icon">
                <svg class="tile-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M12 21C12 21 18 15.6274 18 10C18 6.68629 15.3137 4 12 4C8.68629 4 6 6.68629 6 10C6 15.6274 12 21 12 21Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <circle cx="12" cy="10" r="2.5" fill="currentColor"/>
                </svg>
              </div>
              <div class="info-tile-body">
                <div class="info-tile-label">{{ $t('ui.barangay') }}</div>
                <div class="info-tile-value">{{ selectedFarmer.barangay_name || (selectedFarmer.barangay_id ? 'Brgy #' + selectedFarmer.barangay_id : 'N/A') }}</div>
              </div>
            </div>
            <div class="info-tile">
              <div class="info-tile-icon">
                <svg class="tile-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M6.6 10.8C8.1 13.7 10.3 15.9 13.2 17.4L15.45 15.15C15.75 14.85 16.19 14.75 16.58 14.88C17.82 15.29 19.16 15.5 20.55 15.5C21.13 15.5 21.6 15.97 21.6 16.55V20.1C21.6 20.68 21.13 21.15 20.55 21.15C10.6 21.15 2.85 13.4 2.85 3.45C2.85 2.87 3.32 2.4 3.9 2.4H7.45C8.03 2.4 8.5 2.87 8.5 3.45C8.5 4.84 8.71 6.18 9.12 7.42C9.25 7.81 9.15 8.25 8.85 8.55L6.6 10.8Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="info-tile-body">
                <div class="info-tile-label">Phone Number</div>
                <div class="info-tile-value">{{ selectedFarmer.phone_number || 'N/A' }}</div>
              </div>
            </div>
            <div class="info-tile">
              <div class="info-tile-icon">
                <svg class="tile-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M4 10.5L12 4L20 10.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M6.5 9.5V19H17.5V9.5" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                  <path d="M10 19V13H14V19" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="info-tile-body">
                <div class="info-tile-label">{{ $t('ui.address') }}</div>
                <div class="info-tile-value">{{ selectedFarmer.address || 'N/A' }}</div>
              </div>
            </div>
          </div>
        </div><!-- /profile-hero -->

        <!-- Error -->
        <div v-if="summaryError" class="profile-error">{{ summaryError }}</div>

        <!-- â”€â”€ Tab Navigation â”€â”€ -->
        <div class="profile-tabs-nav">
          <button type="button" class="tab-pill" :class="{ active: activeTab === 'overview' }" @click="activeTab = 'overview'">
            <span class="tab-pill-label">{{ $t('common.overview') }}</span>
          </button>
          <button type="button" class="tab-pill" :class="{ active: activeTab === 'personal' }" @click="activeTab = 'personal'">
            <span class="tab-pill-label">{{ $t('common.personal') }}</span>
          </button>
          <button type="button" class="tab-pill" :class="{ active: activeTab === 'share' }" @click="activeTab = 'share'">
            <span class="tab-pill-label tab-pill-label-full">{{ $t('ui.shareCapital') }}</span>
            <span class="tab-pill-label tab-pill-label-short">{{ $t('common.share') }}</span>
          </button>
          <button type="button" class="tab-pill" :class="{ active: activeTab === 'assistance' }" @click="activeTab = 'assistance'">
            <span class="tab-pill-label tab-pill-label-full">{{ $t('common.assistance') }}</span>
            <span class="tab-pill-label tab-pill-label-short">Assist</span>
          </button>
        </div>

        <!-- â”€â”€ Tab Content â”€â”€ -->
        <div class="tab-content-area">

          <!-- Overview Tab: Financial Summary -->
          <div v-if="activeTab === 'overview'" class="tab-panel">
            <h3 class="tab-section-heading">
              <svg class="section-heading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 3V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M16.5 7.5C16.5 6.11929 14.4853 5 12 5C9.51472 5 7.5 6.11929 7.5 7.5C7.5 8.88071 9.51472 10 12 10C14.4853 10 16.5 11.1193 16.5 12.5C16.5 13.8807 14.4853 15 12 15C9.51472 15 7.5 13.8807 7.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              Financial Summary
            </h3>
            <div class="fin-cards-grid">
              <div class="fin-card fin-card-blue">
                <div class="fin-card-label">{{ $t('ui.loanBalance') }}</div>
                <div class="fin-card-value">{{ formatCurrency(summary?.loans?.total_remaining_balance || 0) }}</div>
                <div class="fin-card-sub">{{ summary?.loans?.active_count || 0 }} active / overdue loans</div>
              </div>
              <div class="fin-card fin-card-amber">
                <div class="fin-card-label">{{ $t('ui.machineryOutstanding') }}</div>
                <div class="fin-card-value">{{ formatCurrency(summary?.machinery?.outstanding_balance || 0) }}</div>
                <div class="fin-card-sub">{{ summary?.machinery?.unpaid_count || 0 }} unpaid bookings</div>
              </div>
            </div>
          </div>

          <!-- Personal Info Tab -->
          <div v-if="activeTab === 'personal'" class="tab-panel">
            <h3 class="tab-section-heading">
              <svg class="section-heading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 12C14.7614 12 17 9.76142 17 7C17 4.23858 14.7614 2 12 2C9.23858 2 7 4.23858 7 7C7 9.76142 9.23858 12 12 12Z" fill="currentColor"/>
                <path d="M4.5 20C4.5 16.9624 7.85786 14.5 12 14.5C16.1421 14.5 19.5 16.9624 19.5 20" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              </svg>
              Personal Information
            </h3>
            <div class="personal-info-grid">
              <div class="pi-item"><div class="pi-label">{{ $t('ui.dateOfBirth') }}</div><div class="pi-value">{{ formatDate(selectedFarmer.date_of_birth) }}</div></div>
              <div class="pi-item"><div class="pi-label">{{ $t('ui.educationalStatus') }}</div><div class="pi-value">{{ selectedFarmer.educational_status || 'N/A' }}</div></div>
              <div class="pi-item"><div class="pi-label">{{ $t('ui.membershipStatus') }}</div><div class="pi-value capitalize">{{ selectedFarmer.membership_status || 'N/A' }}</div></div>
              <div class="pi-item"><div class="pi-label">{{ $t('ui.landArea') }}</div><div class="pi-value">{{ selectedFarmer.land_area ? selectedFarmer.land_area + ' sq.m' : 'N/A' }}</div></div>
              <div class="pi-item"><div class="pi-label">{{ $t('ui.farmLocation') }}</div><div class="pi-value">{{ selectedFarmer.farm_location || 'N/A' }}</div></div>
              <div class="pi-item"><div class="pi-label">{{ $t('ui.registeredOn') }}</div><div class="pi-value">{{ formatDate(selectedFarmer.registered_on) }}</div></div>
            </div>
          </div>

          <!-- Share Capital Tab -->
          <div v-if="activeTab === 'share'" class="tab-panel">
            <h3 class="tab-section-heading">
              <svg class="section-heading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M12 3V21" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
                <path d="M16.5 7.5C16.5 6.11929 14.4853 5 12 5C9.51472 5 7.5 6.11929 7.5 7.5C7.5 8.88071 9.51472 10 12 10C14.4853 10 16.5 11.1193 16.5 12.5C16.5 13.8807 14.4853 15 12 15C9.51472 15 7.5 13.8807 7.5 12.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
              {{ $t('ui.shareCapital') }}
            </h3>
            <div class="share-cards-grid">
              <div class="fin-card fin-card-green">
                <div class="fin-card-label">{{ $t('ui.contributed') }}</div>
                <div class="fin-card-value">{{ formatCurrency(summary?.shareCapital?.totals?.total_contributed || 0) }}</div>
              </div>
              <div class="fin-card fin-card-red">
                <div class="fin-card-label">{{ $t('ui.withdrawn') }}</div>
                <div class="fin-card-value">{{ formatCurrency(summary?.shareCapital?.totals?.total_withdrawn || 0) }}</div>
              </div>
              <div class="fin-card fin-card-purple">
                <div class="fin-card-label">{{ $t('ui.balance') }}</div>
                <div class="fin-card-value">{{ formatCurrency(summary?.shareCapital?.totals?.balance || 0) }}</div>
              </div>
            </div>
          </div>

          <!-- Assistance Tab -->
          <div v-if="activeTab === 'assistance'" class="tab-panel">
            <h3 class="tab-section-heading">
              <svg class="section-heading-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                <path d="M8 12L10.5 14.5L16 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                <path d="M12 3L19 7V12C19 16.4183 15.866 20.1744 12 21C8.13401 20.1744 5 16.4183 5 12V7L12 3Z" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/>
              </svg>
              {{ $t('incomeForm.assistanceReceived') }} <span class="count-chip">{{ summary?.assistance?.count || 0 }}</span>
            </h3>
            <div v-if="(summary?.assistance?.items || []).length" class="assistance-list">
              <div v-for="a in summary.assistance.items" :key="a.id" class="assistance-item">
                <div class="assist-left">
                  <div class="assist-type capitalize">{{ a.assistance_type }}</div>
                  <div class="assist-meta">{{ a.quantity }} {{ a.unit || '' }} - {{ formatDateTime(a.created_at) }}</div>
                </div>
                <span
                  class="assist-badge"
                  :class="(a.status === 'Confirmed Received' || a.status === 'confirmed_received') ? 'assist-confirmed' : 'assist-distributed'"
                >
                  {{ (a.status === 'Confirmed Received' || a.status === 'confirmed_received') ? 'Confirmed' : 'Distributed' }}
                </span>
              </div>
            </div>
            <div v-else class="empty-state">
              <div class="empty-icon">
                <svg class="empty-icon-svg" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                  <path d="M4 7.5C4 6.67157 4.67157 6 5.5 6H18.5C19.3284 6 20 6.67157 20 7.5V16.5C20 17.3284 19.3284 18 18.5 18H5.5C4.67157 18 4 17.3284 4 16.5V7.5Z" stroke="currentColor" stroke-width="1.8"/>
                  <path d="M5 8L12 13L19 8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
              </div>
              <div class="empty-text">{{ $t('ui.noAssistanceYet') }}</div>
            </div>
          </div>

        </div><!-- /tab-content-area -->
      </div><!-- /profile-wrapper -->
    </div>
  </div>

</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { getManilaTodayString } from '../utils/philippineTime'

const router = useRouter()
const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const isAgriculturist = computed(() => authStore.currentUser?.role === 'agriculturist')

const pageError = ref('')
const farmers = ref([])

const query = ref('')
const selectedFarmer = ref(null)

const loading = ref(false)
const summaryError = ref('')
const summary = ref(null)

const activeTab = ref('overview')
const copiedRef = ref(false)

const statusBadgeClass = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return 'badge-status-approved'
  if (s === 'pending')  return 'badge-status-pending'
  if (s === 'rejected') return 'badge-status-rejected'
  return 'badge-status-default'
}

const statusDotClass = (status) => {
  const s = (status || '').toLowerCase()
  if (s === 'approved') return 'status-dot-approved'
  if (s === 'pending')  return 'status-dot-pending'
  if (s === 'rejected') return 'status-dot-rejected'
  return 'status-dot-default'
}

const copyRefNumber = async () => {
  const val = selectedFarmer.value?.reference_number
  if (!val) return
  try {
    await navigator.clipboard.writeText(val)
    copiedRef.value = true
    setTimeout(() => { copiedRef.value = false }, 2000)
  } catch (e) {
    // Clipboard API unavailable
  }
}

// Helper function to get correct profile picture URL
// Handles both external Google URLs and local uploaded pictures
const getProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return null
  // Check if it's already a full URL (Google profile pictures start with https://)
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture
  }
  // Relative path works via Vite proxy (localhost + phone on same Wi-Fi)
  return `${profilePicture}`
}

const isAllowed = computed(() => {
  const role = authStore.currentUser?.role
  return ['admin', 'president', 'treasurer', 'agriculturist'].includes(role)
})

const fetchJson = async (url) => {
  const token = authStore.token
  const headers = {}
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(url, { headers })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.message || data?.error || `Request failed (${res.status})`
    throw new Error(msg)
  }
  return data
}

const loadFarmers = async () => {
  pageError.value = ''
  try {
    const data = await fetchJson('/api/farmers')
    // Backend already applies barangay filtering for non-admin tokens.
    farmers.value = data.farmers || data || []
  } catch (e) {
    pageError.value = e.message || 'Failed to load farmers'
    farmers.value = []
  }
}

const filteredFarmers = computed(() => {
  const q = query.value.trim().toLowerCase()
  if (!q) return []
  return (farmers.value || [])
    .filter(f => {
      const name = (f.full_name || '').toLowerCase()
      const refNo = (f.reference_number || '').toLowerCase()
      return name.includes(q) || refNo.includes(q)
    })
    .slice(0, 50)
})

const buildLoanSummary = (loans = []) => {
  const activeStatuses = new Set(['approved', 'active', 'overdue'])
  const active = loans.filter(l => activeStatuses.has(String(l.status || '').toLowerCase()))
  const totalRemaining = active.reduce((sum, l) => sum + parseFloat(l.remaining_balance || 0), 0)
  return { active_count: active.length, total_remaining_balance: parseFloat(totalRemaining.toFixed(2)) }
}

const refreshSummary = async () => {
  if (!selectedFarmer.value?.id) return
  loading.value = true
  summaryError.value = ''
  summary.value = null
  try {
    const farmerId = selectedFarmer.value.id
    const [assistanceRaw, shareCapitalRaw, loansRaw, machineryBalanceRaw] = await Promise.all([
      fetchJson(`/api/farmer-income/distribution/completed/${farmerId}`),
      fetchJson(`/api/share-capital/farmer/${farmerId}`),
      fetchJson(`/api/loans/farmer/${farmerId}?deviceDate=${getManilaTodayString()}`),
      fetchJson(`/api/machinery/bookings/farmer-balance/${farmerId}`)
    ])

    const loansList = loansRaw?.loans || []
    const unpaidBookings = machineryBalanceRaw?.unpaid_bookings || []
    const shareTotals = shareCapitalRaw?.totals || {}

    summary.value = {
      assistance: {
        count: Array.isArray(assistanceRaw) ? assistanceRaw.length : 0,
        items: Array.isArray(assistanceRaw) ? assistanceRaw : []
      },
      shareCapital: shareCapitalRaw
        ? {
            ...shareCapitalRaw,
            totals: {
              ...shareTotals,
              // Normalize API field names for Members Summary UI
              total_contributed:
                shareTotals.total_savings ??
                shareTotals.share_capital_collected ??
                shareTotals.total_contributed ??
                0,
              total_withdrawn: shareTotals.total_withdrawn ?? 0,
              balance:
                shareTotals.withdrawable_balance ??
                shareTotals.balance ??
                0
            }
          }
        : null,
      loans: buildLoanSummary(loansList),
      machinery: {
        outstanding_balance: machineryBalanceRaw?.total_outstanding_balance || 0,
        unpaid_count: unpaidBookings.length
      }
    }
  } catch (e) {
    summaryError.value = e.message || 'Failed to load summary'
  } finally {
    loading.value = false
  }
}

const selectFarmer = async (f) => {
  selectedFarmer.value = f
  activeTab.value = 'overview'
  try {
    const fullProfile = await fetchJson(`/api/farmers/${f.id}/profile`)
    const farmerData = fullProfile?.farmer || fullProfile
    if (farmerData && typeof farmerData === 'object') {
      selectedFarmer.value = { ...selectedFarmer.value, ...farmerData }
    }
  } catch (e) {
    console.error('Could not fetch full profile:', e.message)
  }
  await refreshSummary()
}

const resetSelection = () => {
  selectedFarmer.value = null
  summary.value = null
  summaryError.value = ''
  activeTab.value = 'overview'
}

const goToMembersManagement = () => router.push('/farmers-table')

const formatNumber = (num) => new Intl.NumberFormat('en-PH').format(num || 0)
const formatCurrency = (num) => `\u20B1${formatNumber(num)}`
const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}
const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A'
  const d = new Date(dateString)
  if (Number.isNaN(d.getTime())) return 'N/A'
  return d.toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

onMounted(async () => {
  if (!authStore.currentUser) {
    router.push('/login')
    return
  }
  if (!isAllowed.value) {
    router.push('/dashboard')
    return
  }
  await loadFarmers()
})
</script>

<style scoped>
.members-summary-page {
  font-family: var(--glass-font, 'Plus Jakarta Sans', 'Segoe UI', sans-serif);
  font-size: 15px;
  line-height: 1.45;
  -webkit-font-smoothing: antialiased;
  box-sizing: border-box;
  overflow-x: clip;
  width: 100%;
  max-width: 100%;
}

.members-summary-page :is(h1, h2, h3, h4, button, input, label, table, th, td, span, p, div) {
  font-family: inherit;
}

.ms-page-inner {
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

/* Header — match Share Capital page-header-split */
.members-summary-page .page-header,
.members-summary-page .page-header-split {
  margin-bottom: 1.25rem;
  padding: 1.25rem 1.4rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  text-align: left;
}

.members-summary-page .page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  align-items: flex-start;
  text-align: left;
}

.members-summary-page .page-header::before,
.members-summary-page .page-header-split::before {
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

.members-summary-page .page-header::after,
.members-summary-page .page-header-split::after {
  content: '';
  position: absolute;
  left: 1.4rem;
  right: 1.4rem;
  bottom: 0.55rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.42), rgba(45, 212, 191, 0.12));
  pointer-events: none;
}

.members-summary-page .page-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0 0 0.15rem;
  color: #eefde6;
  text-align: left;
}

.members-summary-page .page-subtitle {
  color: rgba(229, 235, 231, 0.82);
  margin: 0;
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 700;
  text-align: left;
}

.members-summary-page .page-header-actions {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.55rem;
  flex-shrink: 0;
}

.ms-search-results {
  background: transparent;
}

.ms-search-result {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  width: 100%;
  padding: 0.85rem 1rem;
  border: none;
  border-bottom: 1px solid rgba(148, 163, 184, 0.25);
  background: transparent;
  text-align: left;
  cursor: pointer;
  transition: background 0.15s ease;
}

.ms-search-result:last-child {
  border-bottom: none;
}

.ms-search-result:hover {
  background: rgba(34, 197, 94, 0.1);
}

.ms-search-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: inherit;
  min-width: 0;
  word-break: break-word;
}

.ms-search-ref {
  flex-shrink: 0;
  font-size: 0.85rem;
  font-weight: 600;
  opacity: 0.8;
  letter-spacing: 0.02em;
}

@media (max-width: 768px) {
  .ms-search-panel {
    padding: 0.85rem !important;
    border-radius: 14px !important;
  }

  .ms-search-results {
    border-radius: 10px;
  }

  .ms-search-result {
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 0.2rem;
    width: 100%;
    margin: 0 !important;
    padding: 0.7rem 0.85rem;
    min-height: 44px;
    box-sizing: border-box;
  }

  .ms-search-name {
    display: block;
    width: 100%;
    font-size: 0.88rem;
    line-height: 1.3;
    font-weight: 700;
    word-break: break-word;
    overflow-wrap: anywhere;
  }

  .ms-search-ref {
    display: block;
    width: 100%;
    flex-shrink: 1;
    font-size: 0.75rem;
    line-height: 1.3;
    font-weight: 600;
    letter-spacing: 0.01em;
    opacity: 0.78;
  }

  .members-summary-page {
    padding: 0.75rem !important;
  }

  .members-summary-page .page-header,
  .members-summary-page .page-header-split {
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.95rem;
    gap: 0.55rem;
  }

  .members-summary-page .page-header::after,
  .members-summary-page .page-header-split::after {
    display: none;
  }

  .members-summary-page .page-header-text {
    gap: 0.15rem;
  }

  .members-summary-page .page-title {
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
  }

  .members-summary-page .page-subtitle {
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
  }

  .members-summary-page .page-header-actions {
    width: 100%;
    justify-content: stretch;
    gap: 0.4rem;
  }

  .back-to-management-btn,
  .back-to-members-btn {
    flex: 1 1 auto;
    justify-content: center;
    min-height: 2.35rem;
    padding: 0.45rem 0.7rem;
    font-size: 0.75rem;
    border-radius: 9px;
  }

  .back-btn-icon {
    width: 14px;
    height: 14px;
  }

  .ms-search-panel input[type="text"] {
    min-height: 2.45rem;
    padding: 0.55rem 0.75rem !important;
    font-size: 0.88rem !important;
  }
}

.back-to-management-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 2px solid #166534;
  background: #ffffff;
  color: #14532d;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;
  letter-spacing: 0.2px;
}

.back-to-management-btn:hover {
  background: #f0fdf4;
  color: #052e16;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.16);
}

.back-to-management-btn:active {
  transform: translateY(0);
}

/* Back to search (when viewing a farmer profile) */
.back-to-members-btn {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 9px 18px;
  background: linear-gradient(135deg, rgba(14,25,19,0.97), rgba(10,19,15,0.96));
  border: 1px solid rgba(74, 222, 128, 0.40);
  border-radius: 10px;
  color: #86efac;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s ease;
  box-shadow: 0 2px 10px rgba(0,0,0,0.25), 0 0 0 0 rgba(74,222,128,0);
  letter-spacing: 0.3px;
}

.back-to-members-btn:hover {
  background: linear-gradient(135deg, rgba(22,163,74,0.45), rgba(16,120,54,0.55));
  border-color: rgba(74, 222, 128, 0.65);
  color: #ecfdf5;
  box-shadow: 0 4px 16px rgba(0,0,0,0.3), 0 0 0 3px rgba(74,222,128,0.12);
  transform: translateY(-1px);
}

.back-to-members-btn:active {
  transform: translateY(0);
}

.back-btn-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.action-icon,
.tab-pill-icon,
.section-heading-icon,
.tile-icon-svg,
.copy-icon-svg,
.empty-icon-svg,
.avatar-fallback-icon {
  display: block;
  flex-shrink: 0;
}

.action-icon,
.tab-pill-icon,
.back-btn-icon {
  width: 16px;
  height: 16px;
}

.section-heading-icon {
  width: 18px;
  height: 18px;
}

.tile-icon-svg {
  width: 18px;
  height: 18px;
}

.copy-icon-svg {
  width: 15px;
  height: 15px;
}

.empty-icon-svg {
  width: 48px;
  height: 48px;
  margin: 0 auto;
}

.avatar-fallback-icon {
  width: 20px;
  height: 20px;
  color: rgba(220, 252, 231, 0.82);
}

.avatar-fallback-icon-lg {
  width: 34px;
  height: 34px;
}

/* Search results table */
.search-results-table {
  border-collapse: separate;
  border-spacing: 0;
  table-layout: fixed;
  width: 100%;
  max-width: 100%;
}

/* Prevent global image rules from stretching profile avatars */
.profile-avatar {
  width: 96px !important;
  height: 96px !important;
  min-width: 96px !important;
  min-height: 96px !important;
  max-width: 96px !important;
  max-height: 96px !important;
  border-radius: 9999px !important;
  object-fit: cover !important;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.modal-profile-avatar {
  width: 128px !important;
  height: 128px !important;
  min-width: 128px !important;
  min-height: 128px !important;
  max-width: 128px !important;
  max-height: 128px !important;
  border-radius: 9999px !important;
  object-fit: cover !important;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.search-results-table thead th {
  position: sticky;
  top: 0;
  z-index: 1;
  background: rgba(161, 192, 176, 0.95);
  color: #1f4b3a;
  font-weight: 700;
  font-size: 14px;
  text-align: center;
  padding: 12px 10px;
  border-right: 1px solid rgba(120, 150, 136, 0.45);
  border-bottom: 1px solid rgba(120, 150, 136, 0.55);
}

.search-results-table thead th:last-child {
  border-right: none;
}

.search-results-table tbody td {
  padding: 18px 12px;
  font-size: 14px;
  color: #edf8f1;
  text-align: center;
  border-right: 1px solid rgba(120, 150, 136, 0.35);
  border-bottom: 1px solid rgba(120, 150, 136, 0.35);
  background: rgba(176, 196, 190, 0.10);
  white-space: normal;
  overflow-wrap: anywhere;
}

.search-results-table tbody td:nth-child(5) {
  white-space: normal;
  line-height: 1.4;
}

.search-results-table tbody td:last-child {
  border-right: none;
}

.name-cell {
  text-align: center !important;
}

.name-primary {
  font-size: 16px;
  font-weight: 700;
  color: #f4fff8;
  line-height: 1.25;
}

.name-secondary {
  margin-top: 4px;
  font-size: 12px;
  text-transform: capitalize;
  color: rgba(210, 236, 220, 0.78);
}

.resume-cell {
  text-align: left !important;
}

.resume-label {
  display: block;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: rgba(210, 236, 220, 0.68);
}

.resume-value {
  display: block;
  margin-top: 3px;
  font-size: 14px;
  font-weight: 600;
  color: #edf8f1;
  line-height: 1.35;
}

.result-row {
  cursor: pointer;
  transition: background 0.2s ease;
}

.result-row:hover td {
  background: rgba(176, 196, 190, 0.18);
}

.photo-cell {
  min-width: 96px;
}

.row-avatar {
  width: 54px;
  height: 54px;
  border-radius: 9999px;
  object-fit: cover;
  margin: 0 auto;
  display: block;
}

.row-avatar-fallback {
  background: rgba(59, 130, 246, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
}

/* â”€â”€ Dark green theme â€” only when dark mode is active â”€â”€ */
.members-summary-page:not(.light-theme) {
  background: linear-gradient(145deg, #0a1a0f 0%, #0f2518 30%, #163020 60%, #1c3d28 100%) !important;
}

.members-summary-page:not(.light-theme) .ms-search-result {
  border-bottom-color: rgba(100, 200, 130, 0.15) !important;
  color: #ffffff !important;
}
.members-summary-page:not(.light-theme) .ms-search-result:hover {
  background: rgba(100, 200, 130, 0.12) !important;
}
.members-summary-page:not(.light-theme) .ms-search-ref {
  color: rgba(200, 235, 210, 0.75) !important;
}

.members-summary-page:not(.light-theme) :is(h1, .page-title, .text-gray-800) { color: #eefde6 !important; }
.members-summary-page:not(.light-theme) :is(.text-gray-500, .page-subtitle) { color: rgba(229, 235, 231, 0.82) !important; }
.members-summary-page:not(.light-theme) button.border { background: rgba(255,255,255,0.07) !important; border-color: rgba(255,255,255,0.18) !important; color: #ffffff !important; }
.members-summary-page:not(.light-theme) .bg-white { background: rgba(20, 45, 28, 0.95) !important; border-color: rgba(100, 200, 130, 0.18) !important; color: #ffffff !important; }
.members-summary-page:not(.light-theme) input[type="text"] { background: rgba(0, 0, 0, 0.3) !important; border-color: rgba(100, 200, 130, 0.3) !important; color: #ffffff !important; }
.members-summary-page:not(.light-theme) input[type="text"]::placeholder { color: rgba(200, 235, 210, 0.5) !important; }
.members-summary-page:not(.light-theme) button.w-full.text-left { background: transparent !important; border-color: rgba(100, 200, 130, 0.15) !important; }
.members-summary-page:not(.light-theme) button.w-full.text-left:hover { background: rgba(255,255,255,0.06) !important; }
.members-summary-page:not(.light-theme) .text-gray-900 { color: #ffffff !important; }
.members-summary-page:not(.light-theme) .bg-gradient-to-r { background: linear-gradient(135deg, rgba(18, 50, 30, 0.98), rgba(25, 65, 40, 0.98)) !important; border-color: rgba(100, 200, 130, 0.15) !important; }
.members-summary-page:not(.light-theme) .bg-white.rounded-lg { background: rgba(15, 38, 22, 0.9) !important; border-color: rgba(100, 200, 130, 0.2) !important; }
.members-summary-page:not(.light-theme) :is(.text-gray-500, .text-xs.font-semibold.text-gray-500) { color: rgba(180, 230, 195, 0.7) !important; }
.members-summary-page:not(.light-theme) :is(.text-gray-600, .text-gray-700) { color: rgba(200, 235, 210, 0.85) !important; }
.members-summary-page:not(.light-theme) :is(.text-indigo-600, .text-blue-600, .text-green-600, .text-yellow-600, .text-blue-900, .text-amber-900, .text-green-900, .text-red-900, .text-purple-900) { color: #ffffff !important; }
.members-summary-page:not(.light-theme) h3 { color: #ffffff !important; }
.members-summary-page:not(.light-theme) .border-t { border-color: rgba(100, 200, 130, 0.15) !important; }
.members-summary-page:not(.light-theme) .border-2 { border-color: rgba(100, 200, 130, 0.25) !important; }
.members-summary-page:not(.light-theme) :is(.bg-blue-50, .bg-amber-50, .bg-green-50, .bg-red-50, .bg-purple-50) { background: rgba(18, 50, 30, 0.85) !important; }
.members-summary-page:not(.light-theme) :is(.text-blue-600, .text-amber-600, .text-green-600, .text-red-600, .text-purple-600) { color: rgba(160, 230, 185, 0.9) !important; }
.members-summary-page:not(.light-theme) :is(.text-blue-700, .text-amber-700) { color: rgba(200, 235, 210, 0.8) !important; }
.members-summary-page:not(.light-theme) .bg-gray-50 { background: rgba(18, 50, 30, 0.7) !important; border-color: rgba(100, 200, 130, 0.15) !important; }
.members-summary-page:not(.light-theme) .bg-gray-50:hover { background: rgba(25, 65, 40, 0.9) !important; }
.members-summary-page:not(.light-theme) .bg-red-50 { background: rgba(80, 10, 10, 0.6) !important; }
.members-summary-page:not(.light-theme) button.border-2.border-indigo-300 { background: rgba(255,255,255,0.07) !important; border-color: rgba(100, 200, 130, 0.4) !important; color: #aff5c8 !important; }
.members-summary-page:not(.light-theme) button.border-2.border-indigo-300:hover { background: rgba(100, 200, 130, 0.12) !important; }
.members-summary-page:not(.light-theme) .bg-blue-100 { background: rgba(30, 80, 120, 0.5) !important; }
.members-summary-page:not(.light-theme) .bg-gray-100 { background: rgba(255,255,255,0.08) !important; }
.members-summary-page:not(.light-theme) .text-blue-800 { color: #a5d8f5 !important; }
.members-summary-page:not(.light-theme) .bg-green-100 { background: rgba(20, 90, 45, 0.5) !important; }
.members-summary-page:not(.light-theme) .text-green-800 { color: #a8f0c0 !important; }

/* â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
   FARMER PROFILE REDESIGN â€” Modern Card UI
   â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â• */

.profile-wrapper {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

/* â”€â”€ Hero Card â”€â”€ */
.profile-hero {
  background: linear-gradient(145deg, #0d2416 0%, #112b1a 50%, #163520 100%);
  border: 1px solid rgba(100, 200, 130, 0.22);
  border-radius: 20px;
  padding: 26px 28px 24px;
  box-shadow: 0 4px 28px rgba(0, 0, 0, 0.4);
}

.hero-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 22px;
}

.refresh-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(100, 200, 130, 0.28);
  border-radius: 10px;
  color: #a8f0c0;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
}
.refresh-btn:hover:not(:disabled) { background: rgba(100, 200, 130, 0.13); }
.refresh-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* Identity row */
.hero-identity {
  display: flex;
  align-items: center;
  gap: 22px;
  margin-bottom: 26px;
}

.hero-avatar-wrap { position: relative; flex-shrink: 0; }

.hero-avatar {
  width: 96px !important; height: 96px !important;
  min-width: 96px !important; min-height: 96px !important;
  max-width: 96px !important; max-height: 96px !important;
  border-radius: 9999px !important;
  object-fit: cover !important;
  border: 3px solid rgba(100, 200, 130, 0.5) !important;
  box-shadow: 0 0 0 5px rgba(100, 200, 130, 0.1) !important;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.hero-avatar-fallback {
  background: rgba(28, 65, 42, 0.9);
  font-size: 38px;
}

.row-avatar-fallback,
.hero-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-status-ring {
  position: absolute;
  bottom: 4px; right: 4px;
  width: 16px; height: 16px;
  border-radius: 9999px;
  border: 2.5px solid #0d2416;
}
.status-dot-approved { background: #22c55e; }
.status-dot-pending  { background: #eab308; }
.status-dot-rejected { background: #ef4444; }
.status-dot-default  { background: #6b7280; }

.hero-info { flex: 1; min-width: 0; }
.hero-name {
  font-size: 26px;
  font-weight: 800;
  color: #f0fdf4;
  line-height: 1.2;
  margin: 0 0 10px;
  word-break: break-word;
}
.hero-badges { display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 8px; }

.badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 13px;
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 700;
  text-transform: capitalize;
  letter-spacing: 0.03em;
}
.badge-dot { width: 7px; height: 7px; border-radius: 9999px; flex-shrink: 0; }

.badge-role           { background: rgba(100,200,130,0.14); border: 1px solid rgba(100,200,130,0.32); color: #a8f0c0; }
.badge-status-approved{ background: rgba(34,197,94,0.14);  border: 1px solid rgba(34,197,94,0.32);  color: #86efac; }
.badge-status-pending { background: rgba(234,179,8,0.14);  border: 1px solid rgba(234,179,8,0.32);  color: #fde047; }
.badge-status-rejected{ background: rgba(239,68,68,0.14);  border: 1px solid rgba(239,68,68,0.28);  color: #fca5a5; }
.badge-status-default { background: rgba(107,114,128,0.14);border: 1px solid rgba(107,114,128,0.28);color: #d1d5db; }

.hero-since { font-size: 12px; color: rgba(200,235,210,0.5); margin: 0; }

/* Quick Info Grid */
.quick-info-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}
@media (max-width: 768px) {
  .profile-wrapper {
    gap: 0.65rem;
  }

  .profile-hero {
    padding: 0.85rem 0.9rem 0.8rem;
    border-radius: 14px;
  }

  .hero-topbar {
    margin-bottom: 0.75rem;
  }

  .refresh-btn {
    min-height: 2.2rem;
    padding: 0.4rem 0.7rem;
    font-size: 0.72rem;
    border-radius: 8px;
  }

  .hero-name {
    font-size: 1.05rem !important;
    line-height: 1.25;
  }

  .hero-since {
    font-size: 0.7rem !important;
  }

  .info-tile {
    gap: 0.55rem;
    padding: 0.65rem 0.7rem;
    border-radius: 10px;
  }

  .info-tile-icon {
    width: 1.75rem;
    height: 1.75rem;
    font-size: 0.75rem;
    border-radius: 7px;
  }

  .info-tile-label {
    font-size: 0.58rem;
  }

  .info-tile-value,
  .ref-highlight {
    font-size: 0.78rem;
  }

  .profile-tabs-nav {
    flex-wrap: nowrap !important;
    gap: 3px;
    padding: 4px;
    overflow: hidden;
    border-radius: 10px;
  }

  .tab-pill {
    flex: 1 1 0 !important;
    min-width: 0 !important;
    padding: 0.55rem 0.2rem !important;
    font-size: 0.7rem !important;
    gap: 3px !important;
    border-radius: 8px !important;
    min-height: 2.4rem;
  }

  .tab-pill-icon {
    width: 12px !important;
    height: 12px !important;
  }

  .tab-pill-label-full { display: none !important; }
  .tab-pill-label-short { display: inline !important; }

  .tab-content-area {
    padding: 0.75rem !important;
    border-radius: 12px !important;
  }

  .tab-section-heading {
    font-size: 0.85rem !important;
    margin-bottom: 0.55rem !important;
  }

  .fin-cards-grid,
  .share-cards-grid {
    gap: 0.5rem !important;
  }

  .fin-card {
    padding: 0.7rem 0.75rem !important;
    border-radius: 10px !important;
  }

  .fin-card-label {
    font-size: 0.62rem !important;
  }

  .fin-card-value {
    font-size: 0.95rem !important;
  }

  .fin-card-sub {
    font-size: 0.65rem !important;
  }

  .pi-item,
  .assistance-item {
    padding: 0.55rem 0.65rem !important;
  }

  .pi-label,
  .assist-meta {
    font-size: 0.62rem !important;
  }

  .pi-value,
  .assist-type {
    font-size: 0.78rem !important;
  }
}

@media (max-width: 640px) {
  .members-summary-page {
    padding: 0.65rem !important;
  }

  .quick-info-grid { grid-template-columns: 1fr; gap: 0.45rem; }
  .hero-identity    { flex-direction: column; align-items: flex-start; gap: 0.65rem; }
  .fin-cards-grid, .share-cards-grid { grid-template-columns: 1fr !important; }
  .personal-info-grid { grid-template-columns: 1fr !important; }

  .hero-topbar {
    flex-wrap: wrap;
    gap: 0.55rem;
  }

  .hero-avatar,
  .hero-avatar-fallback {
    width: 3.25rem !important;
    height: 3.25rem !important;
    min-width: 3.25rem !important;
    min-height: 3.25rem !important;
  }

  .members-summary-page .page-title {
    font-size: 1.1rem !important;
  }

  .back-to-management-btn,
  .back-to-members-btn {
    width: 100%;
  }
}

.info-tile {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(100,200,130,0.14);
  border-radius: 12px;
  padding: 14px 16px;
  transition: all 0.2s ease;
}
.info-tile:hover {
  background: rgba(100,200,130,0.07);
  border-color: rgba(100,200,130,0.26);
  transform: translateY(-1px);
}

.info-tile-icon {
  width: 34px; height: 34px;
  background: rgba(100,200,130,0.1);
  border-radius: 8px;
  display: flex; align-items: center; justify-content: center;
  font-size: 15px; font-weight: 700; color: #a8f0c0;
  flex-shrink: 0;
}
.info-tile-body { flex: 1; min-width: 0; }
.info-tile-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: rgba(200,235,210,0.52);
  margin-bottom: 3px;
}
.info-tile-value {
  font-size: 14px; font-weight: 600;
  color: #edf8f1; line-height: 1.35; word-break: break-word;
}
.info-tile-value-row { display: flex; align-items: center; gap: 8px; }
.ref-highlight { font-size: 14px; font-weight: 700; color: #86efac; }

.copy-btn {
  background: rgba(100,200,130,0.11);
  border: 1px solid rgba(100,200,130,0.24);
  border-radius: 6px; color: #a8f0c0;
  font-size: 14px; width: 28px; height: 28px;
  display: flex; align-items: center; justify-content: center;
  cursor: pointer; transition: all 0.2s ease; flex-shrink: 0;
}
.copy-btn:hover { background: rgba(100,200,130,0.22); }

/* Profile Error */
.profile-error {
  padding: 12px 16px;
  background: rgba(80,10,10,0.6);
  border: 1px solid rgba(239,68,68,0.28);
  border-radius: 10px; color: #fca5a5; font-size: 14px;
}

/* â”€â”€ Tab Navigation â”€â”€ */
.profile-tabs-nav {
  display: flex;
  gap: 6px;
  flex-wrap: nowrap;
  background: rgba(10, 24, 15, 0.7);
  padding: 7px;
  border-radius: 14px;
  border: 1px solid rgba(100,200,130,0.12);
}
.tab-pill {
  flex: 1 1 0;
  min-width: 0;
  padding: 10px 14px;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 600;
  color: rgba(200,235,210,0.6);
  background: transparent;
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  white-space: nowrap;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}
.tab-pill-label-short { display: none; }
.tab-pill:hover:not(.active) { background: rgba(100,200,130,0.08); color: rgba(200,235,210,0.9); }
.tab-pill.active {
  background: rgba(100,200,130,0.18);
  color: #a8f0c0;
  box-shadow: 0 1px 6px rgba(0,0,0,0.25);
}

/* â”€â”€ Tab Content Area â”€â”€ */
.tab-content-area {
  background: rgba(10, 24, 15, 0.6);
  border: 1px solid rgba(100,200,130,0.12);
  border-radius: 16px; padding: 24px;
}
.tab-panel { animation: fadeInTab 0.22s ease; }
@keyframes fadeInTab {
  from { opacity: 0; transform: translateY(6px); }
  to   { opacity: 1; transform: translateY(0); }
}
.tab-section-heading {
  font-size: 17px; font-weight: 700; color: #d1fae5;
  margin: 0 0 18px; display: flex; align-items: center; gap: 8px;
}

/* Financial & Share Cards */
.fin-cards-grid   { display: grid; grid-template-columns: repeat(2, 1fr); gap: 14px; }
.share-cards-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }

.fin-card {
  padding: 20px 22px; border-radius: 14px;
  border: 1px solid transparent;
  transition: all 0.2s ease;
}
.fin-card:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(0,0,0,0.3); }

.fin-card-blue   { background: rgba(28,60,118,0.38);  border-color: rgba(59,130,246,0.24); }
.fin-card-amber  { background: rgba(118,78,18,0.38);  border-color: rgba(245,158,11,0.24); }
.fin-card-green  { background: rgba(18,76,42,0.48);   border-color: rgba(34,197,94,0.24); }
.fin-card-red    { background: rgba(100,18,18,0.38);  border-color: rgba(239,68,68,0.24); }
.fin-card-purple { background: rgba(74,28,148,0.3);   border-color: rgba(168,85,247,0.24); }

.fin-card-label {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: rgba(200,235,210,0.58); margin-bottom: 8px;
}
.fin-card-value {
  font-size: 26px; font-weight: 800;
  color: #f0fdf4; line-height: 1.1; margin-bottom: 6px;
}
.fin-card-sub { font-size: 12px; color: rgba(200,235,210,0.55); }

/* Personal Info Grid */
.personal-info-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 11px; }

.pi-item {
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(100,200,130,0.13);
  border-radius: 10px; padding: 13px 15px;
  transition: all 0.2s ease;
}
.pi-item:hover { background: rgba(100,200,130,0.06); }
.pi-label {
  font-size: 10px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.07em;
  color: rgba(200,235,210,0.52); margin-bottom: 4px;
}
.pi-value { font-size: 14px; font-weight: 600; color: #edf8f1; line-height: 1.35; }

/* Assistance List */
.assistance-list {
  display: flex; flex-direction: column; gap: 9px;
  max-height: 420px; overflow-y: auto;
}
.assistance-item {
  display: flex; align-items: center;
  justify-content: space-between; gap: 12px;
  padding: 14px 16px;
  background: rgba(255,255,255,0.04);
  border: 1px solid rgba(100,200,130,0.13);
  border-radius: 10px; transition: all 0.2s ease;
}
.assistance-item:hover { background: rgba(100,200,130,0.07); }
.assist-left { flex: 1; min-width: 0; }
.assist-type { font-size: 14px; font-weight: 600; color: #edf8f1; }
.assist-meta { font-size: 12px; color: rgba(200,235,210,0.58); margin-top: 3px; }
.assist-badge {
  flex-shrink: 0; padding: 4px 12px; border-radius: 9999px;
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.05em;
}
.assist-confirmed  { background: rgba(18,86,44,0.5);  color: #a8f0c0; border: 1px solid rgba(34,197,94,0.24); }
.assist-distributed{ background: rgba(28,62,118,0.5); color: #93c5fd; border: 1px solid rgba(59,130,246,0.24); }

/* Count Chip */
.count-chip {
  display: inline-block;
  background: rgba(100,200,130,0.18); color: #a8f0c0;
  border-radius: 9999px; padding: 2px 10px;
  font-size: 13px; font-weight: 700; margin-left: 8px; vertical-align: middle;
}

/* Empty State */
.empty-state { text-align: center; padding: 48px 24px; color: rgba(200,235,210,0.45); }
.empty-icon  { margin-bottom: 12px; }
.empty-text  { font-size: 14px; }

/* ===== LIGHT MODE â€” Senior-friendly bright theme ===== */
.members-summary-page.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%) !important;
  color: #052e16;
}

.members-summary-page.light-theme .page-header,
.members-summary-page.light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 8px 26px rgba(22, 101, 52, 0.12), inset 1px 1px 0 rgba(255, 255, 255, 0.05) !important;
}

.members-summary-page.light-theme .page-title,
.members-summary-page.light-theme :is(h1, .text-gray-800) {
  color: #052e16 !important;
}

.members-summary-page.light-theme .page-subtitle,
.members-summary-page.light-theme :is(.text-gray-500, .text-gray-600, .text-gray-700) {
  color: #166534 !important;
}

.members-summary-page.light-theme .bg-white {
  background: #ffffff !important;
  border-color: #86efac !important;
  color: #052e16 !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.members-summary-page.light-theme input[type="text"] {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #052e16 !important;
}

.members-summary-page.light-theme input[type="text"]::placeholder {
  color: #64748b !important;
}

.members-summary-page.light-theme .bg-gray-50 {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
  color: #166534 !important;
}

.members-summary-page.light-theme .back-to-management-btn {
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  color: #14532d !important;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.08) !important;
}

.members-summary-page.light-theme .back-to-management-btn:hover {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.12) !important;
}

.members-summary-page.light-theme .back-to-members-btn {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  color: #15803d !important;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.08) !important;
}

.members-summary-page.light-theme .back-to-members-btn:hover {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  border-color: #22c55e !important;
}

.members-summary-page:not(.light-theme) .back-to-management-btn {
  background: linear-gradient(135deg, rgba(14, 25, 19, 0.97), rgba(10, 19, 15, 0.96));
  border: 1px solid rgba(74, 222, 128, 0.4);
  color: #86efac;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.25);
}

.members-summary-page:not(.light-theme) .back-to-management-btn:hover {
  background: linear-gradient(135deg, rgba(22, 163, 74, 0.45), rgba(16, 120, 54, 0.55));
  border-color: rgba(74, 222, 128, 0.65);
  color: #ecfdf5;
}

.members-summary-page.light-theme .search-results-table thead th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  border-color: #86efac !important;
}

.members-summary-page.light-theme .search-results-table tbody td {
  background: #ffffff !important;
  color: #14532d !important;
  border-color: #e2e8f0 !important;
}

.members-summary-page.light-theme .result-row:hover td {
  background: #ecfdf5 !important;
}

.members-summary-page.light-theme .name-primary {
  color: #052e16 !important;
}

.members-summary-page.light-theme .name-secondary {
  color: #166534 !important;
}

.members-summary-page.light-theme .resume-label {
  color: #64748b !important;
}

.members-summary-page.light-theme .resume-value {
  color: #14532d !important;
}

.members-summary-page.light-theme .avatar-fallback-icon {
  color: #15803d !important;
}

.members-summary-page.light-theme .profile-hero {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.members-summary-page.light-theme .hero-name {
  color: #052e16 !important;
}

.members-summary-page.light-theme .hero-since {
  color: #166534 !important;
}

.members-summary-page.light-theme .refresh-btn {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  color: #15803d !important;
}

.members-summary-page.light-theme .refresh-btn:hover:not(:disabled) {
  background: #f0fdf4 !important;
  color: #052e16 !important;
}

.members-summary-page.light-theme .info-tile {
  background: #f8fdf9 !important;
  border: 1.5px solid #bbf7d0 !important;
}

.members-summary-page.light-theme .info-tile:hover {
  background: #ecfdf5 !important;
  border-color: #86efac !important;
}

.members-summary-page.light-theme .info-tile-icon {
  background: #dcfce7 !important;
  color: #15803d !important;
}

.members-summary-page.light-theme .info-tile-label {
  color: #64748b !important;
}

.members-summary-page.light-theme .info-tile-value {
  color: #052e16 !important;
}

.members-summary-page.light-theme .ref-highlight {
  color: #15803d !important;
}

.members-summary-page.light-theme .copy-btn {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}

.members-summary-page.light-theme .profile-tabs-nav {
  background: #f4faf6 !important;
  border: 2px solid #86efac !important;
}

.members-summary-page.light-theme .tab-pill {
  color: #166534 !important;
}

.members-summary-page.light-theme .tab-pill:hover:not(.active) {
  background: #ffffff !important;
  color: #052e16 !important;
}

.members-summary-page.light-theme .tab-pill.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  color: #ffffff !important;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.18) !important;
}

.members-summary-page.light-theme .tab-content-area {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.members-summary-page.light-theme .tab-section-heading {
  color: #052e16 !important;
}

.members-summary-page.light-theme .fin-card {
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.08) !important;
}

.members-summary-page.light-theme .fin-card-blue {
  background: #eff6ff !important;
  border-color: #93c5fd !important;
}

.members-summary-page.light-theme .fin-card-amber {
  background: #fffbeb !important;
  border-color: #fcd34d !important;
}

.members-summary-page.light-theme .fin-card-green {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
}

.members-summary-page.light-theme .fin-card-red {
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
}

.members-summary-page.light-theme .fin-card-purple {
  background: #faf5ff !important;
  border-color: #d8b4fe !important;
}

.members-summary-page.light-theme .fin-card-label {
  color: #64748b !important;
}

.members-summary-page.light-theme .fin-card-value {
  color: #052e16 !important;
}

.members-summary-page.light-theme .fin-card-sub {
  color: #166534 !important;
}

.members-summary-page.light-theme .pi-item {
  background: #f8fdf9 !important;
  border: 1.5px solid #bbf7d0 !important;
}

.members-summary-page.light-theme .pi-item:hover {
  background: #ecfdf5 !important;
}

.members-summary-page.light-theme .pi-label {
  color: #64748b !important;
}

.members-summary-page.light-theme .pi-value {
  color: #052e16 !important;
}

.members-summary-page.light-theme .assistance-item {
  background: #f8fdf9 !important;
  border: 1.5px solid #bbf7d0 !important;
}

.members-summary-page.light-theme .assistance-item:hover {
  background: #ecfdf5 !important;
}

.members-summary-page.light-theme .assist-type {
  color: #052e16 !important;
}

.members-summary-page.light-theme .assist-meta {
  color: #166534 !important;
}

.members-summary-page.light-theme .count-chip {
  background: #dcfce7 !important;
  color: #15803d !important;
}

.members-summary-page.light-theme .empty-state {
  color: #166534 !important;
}

.members-summary-page.light-theme .badge-role {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}

.members-summary-page.light-theme .badge-status-approved {
  background: #dcfce7 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}

.members-summary-page.light-theme .badge-status-pending {
  background: #fef9c3 !important;
  border-color: #fde047 !important;
  color: #a16207 !important;
}

.members-summary-page.light-theme .badge-status-rejected {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
}

.members-summary-page.light-theme .assist-confirmed {
  background: #dcfce7 !important;
  color: #15803d !important;
  border-color: #86efac !important;
}

.members-summary-page.light-theme .assist-distributed {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
  border-color: #93c5fd !important;
}
</style>
