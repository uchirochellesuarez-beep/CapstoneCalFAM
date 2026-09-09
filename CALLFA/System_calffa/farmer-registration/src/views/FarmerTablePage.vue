<template>
  <div class="farmer-table-page glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-inner">
      <div class="page-top-row">
        <h1 class="page-title">{{ $t('ui.membersManagement') }}</h1>
        <button
          v-if="canViewMemberSummary"
          type="button"
          class="btn-summary"
          @click="goToMembersSummary"
        >
          <svg class="btn-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          {{ $t('common.membersSummary') }}
        </button>
      </div>

      <!-- Overview / status tabs -->
      <div class="stats-group stats-group--members">
        <div class="members-summary-tabs stats-grid stats-grid--members">
        <button
          type="button"
          :class="['tab-btn stat-card stat-card-pending', { active: activeTab === 'pending' }]"
          @click="activeTab = 'pending'"
        >
          <span class="stat-content">
            <span class="tab-btn-label stat-label">{{ $t('common.pendingApproval') }}</span>
            <span class="tab-btn-count stat-value">{{ pendingCount }}</span>
          </span>
        </button>
        <button
          type="button"
          :class="['tab-btn stat-card stat-card-registered', { active: activeTab === 'registered' }]"
          @click="activeTab = 'registered'"
        >
          <span class="stat-content">
            <span class="tab-btn-label stat-label">{{ $t('common.registeredMembers') }}</span>
            <span class="tab-btn-count stat-value">{{ registeredCount }}</span>
          </span>
        </button>
        <button
          type="button"
          :class="['tab-btn stat-card stat-card-rejected', { active: activeTab === 'rejected' }]"
          @click="activeTab = 'rejected'"
        >
          <span class="stat-content">
            <span class="tab-btn-label stat-label">{{ $t('common.rejectedAccounts') }}</span>
            <span class="tab-btn-count stat-value">{{ rejectedCount }}</span>
          </span>
        </button>
        </div>
      </div>

      <div class="filter-bar">
        <div class="filter-barangay-row">
          <template v-if="isAdmin">
            <label for="members-barangay-filter" class="filter-label">{{ $t('ui.barangay') }}</label>
            <select id="members-barangay-filter" v-model="selectedBarangayId" class="filter-select">
              <option value="">{{ $t('ui.allBarangays') }}</option>
              <option v-for="barangay in barangays" :key="barangay.id" :value="String(barangay.id)">
                {{ barangay.name }}
              </option>
            </select>
          </template>
          <span v-else-if="userBarangayName" class="filter-barangay-badge">
            Barangay: {{ userBarangayName }}
          </span>
        </div>
        <div class="filter-search-wrap">
          <span class="filter-search-icon" aria-hidden="true">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </span>
          <input
            id="members-search"
            v-model.trim="searchQuery"
            type="search"
            class="filter-search-input"
            :placeholder="$t('ui.searchMembers')"
          />
        </div>
        <span v-if="hasActiveFilters" class="filter-hint">
          {{ filterSummary }}
        </span>
      </div>

      <!-- Tab Content -->
      <div v-if="activeTab === 'pending'">
        <PendingFarmersTab
          :farmers="pendingFarmers"
          :loading="loading"
          :error="error"
          @approve="handleApprove"
          @reject="handleReject"
          @delete="handleDelete"
          @update-role="handleUpdateRole"
          @update-membership-status="handleUpdateMembershipStatus"
          @refresh="loadFarmers"
        />
      </div>
      <div v-else-if="activeTab === 'rejected'">
        <div class="registered-members-card">
          <h2 class="registered-members-title">{{ $t('common.rejectedAccounts') }}</h2>
          <div v-if="loading" class="state-center">
            <div class="spinner"></div>
            <p class="state-text">{{ $t('common.loading') }}</p>
          </div>
          <div v-else-if="rejectedFarmers.length === 0" class="state-center">
            <p class="state-text">{{ $t('ui.noRejectedAccounts') }}</p>
          </div>
          <template v-else>
          <div class="members-mobile-list">
            <article v-for="farmer in rejectedFarmers" :key="'rm-' + farmer.id" class="members-mobile-card">
              <div class="mmc-head">
                <div class="member-avatar-wrap">
                  <img
                    v-if="farmer.profile_picture"
                    :src="getProfilePictureUrl(farmer.profile_picture)"
                    :alt="$t('ui.profile')"
                    class="member-avatar"
                  />
                  <div v-else class="member-avatar member-avatar-fallback">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div class="mmc-head-text">
                  <h3 class="mmc-name">{{ farmer.full_name }}</h3>
                  <p class="mmc-ref">{{ farmer.reference_number }}</p>
                </div>
                <span class="status-chip status-chip-rejected">{{ $t('common.rejected') }}</span>
              </div>
              <div class="mmc-rows">
                <div class="mmc-row"><span>{{ $t('ui.phone') }}</span><strong>{{ farmer.phone_number || farmer.contact_number || 'N/A' }}</strong></div>
                <div class="mmc-row"><span>{{ $t('ui.education') }}</span><strong>{{ farmer.educational_status || 'N/A' }}</strong></div>
                <div class="mmc-row"><span>{{ $t('ui.role') }}</span><strong><span class="role-badge" :class="farmer.role">{{ formatMemberRole(farmer.role) }}</span></strong></div>
                <div class="mmc-row"><span>{{ $t('ui.registered') }}</span><strong>{{ formatMemberDate(farmer.registered_on) }}</strong></div>
              </div>
              <div class="members-action-row mmc-actions">
                <button type="button" class="table-action-btn table-action-approve mmc-action-text" :title="$t('common.approve')" :aria-label="$t('common.approve')" @click="handleApprove(farmer.id)">
                  {{ $t('common.approve') }}
                </button>
                <button type="button" class="table-action-btn table-action-delete mmc-action-text" :title="$t('common.delete')" :aria-label="$t('common.delete')" @click="handleDelete(farmer.id)">
                  {{ $t('common.delete') }}
                </button>
              </div>
            </article>
          </div>
          <div class="registered-table-scroll members-desktop-only">
            <div class="members-table-container">
              <table class="members-table">
                <colgroup>
                  <col class="members-col-photo" />
                  <col class="members-col-ref" />
                  <col class="members-col-name" />
                  <col class="members-col-dob" />
                  <col class="members-col-phone" />
                  <col class="members-col-edu" />
                  <col class="members-col-role" />
                  <col class="members-col-reg" />
                  <col class="members-col-status" />
                  <col class="members-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>{{ $t('ui.photo') }}</th>
                    <th>{{ $t('ui.refHash') }}</th>
                    <th>{{ $t('ui.name') }}</th>
                    <th>{{ $t('ui.dob') }}</th>
                    <th>{{ $t('ui.phone') }}</th>
                    <th>{{ $t('ui.education') }}</th>
                    <th class="members-th-role">{{ $t('ui.role') }}</th>
                    <th>{{ $t('ui.registered') }}</th>
                    <th>{{ $t('ui.status') }}</th>
                    <th class="members-th-actions">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="farmer in rejectedFarmers" :key="farmer.id" class="members-data-row">
                    <td class="members-cell-center">
                      <div class="member-avatar-wrap">
                        <img
                          v-if="farmer.profile_picture"
                          :src="getProfilePictureUrl(farmer.profile_picture)"
                          :alt="$t('ui.profile')"
                          class="member-avatar"
                        />
                        <div v-else class="member-avatar member-avatar-fallback">
                          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                            <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                          </svg>
                        </div>
                      </div>
                    </td>
                    <td class="members-cell members-td-ref">{{ farmer.reference_number }}</td>
                    <td class="members-cell members-td-name">{{ farmer.full_name }}</td>
                    <td class="members-cell">{{ formatMemberDate(farmer.date_of_birth) }}</td>
                    <td class="members-cell">{{ farmer.phone_number || farmer.contact_number || 'N/A' }}</td>
                    <td class="members-cell">{{ farmer.educational_status || 'N/A' }}</td>
                    <td class="members-cell members-td-role">
                      <span class="role-badge" :class="farmer.role">{{ formatMemberRole(farmer.role) }}</span>
                    </td>
                    <td class="members-cell">{{ formatMemberDate(farmer.registered_on) }}</td>
                    <td class="members-cell">
                      <span class="status-chip status-chip-rejected">{{ $t('common.rejected') }}</span>
                    </td>
                    <td class="members-cell members-actions-cell">
                      <div class="members-action-row">
                        <button type="button" class="table-action-btn table-action-approve" :title="$t('common.approve')" :aria-label="$t('common.approve')" @click="handleApprove(farmer.id)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                        <button type="button" class="table-action-btn table-action-delete" :title="$t('common.delete')" :aria-label="$t('common.delete')" @click="handleDelete(farmer.id)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          </template>
        </div>
      </div>
      <div v-else>
        <FarmerTable
          :farmers="registeredFarmers"
          :loading="loading"
          :error="error"
          :user-barangay-id="userBarangayId"
          :is-president="isPresident"
          @member-updated="loadFarmers"
          @member-deleted="loadFarmers"
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import FarmerTable from '../components/FarmerTable.vue'
import PendingFarmersTab from '../components/PendingFarmersTab.vue'
import { formatMemberRole } from '../utils/roleLabels.js'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const router = useRouter()
const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const activeTab = ref('pending')
const allFarmers = ref([])
const barangays = ref([])
const selectedBarangayId = ref('')
const searchQuery = ref('')
const loading = ref(false)
const error = ref(null)

// Helper function to get correct profile picture URL
// Handles both external Google URLs and local uploaded pictures
const getProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return null
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture
  }
  return profilePicture
}

const formatMemberDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

// Check authorization - only admin, president, and treasurer can access
const isAuthorized = computed(() => {
  const user = authStore.currentUser
  return user && ['admin', 'president', 'treasurer'].includes(user.role)
})

const userBarangayId = computed(() => {
  const id = authStore.currentUser?.barangay_id
  return id != null && id !== '' ? Number(id) : null
})

const userBarangayName = computed(() => authStore.currentUser?.barangay_name || '')

const isAdmin = computed(() => {
  return authStore.currentUser?.role === 'admin'
})

const isPresident = computed(() => {
  return authStore.currentUser?.role === 'president'
})

const isTreasurer = computed(() => {
  return authStore.currentUser?.role === 'treasurer'
})

const canViewMemberSummary = computed(() => {
  const role = authStore.currentUser?.role
  return ['admin', 'president', 'treasurer'].includes(role)
})

const matchesUserBarangay = (farmer) => {
  if (userBarangayId.value == null) return false
  return Number(farmer.barangay_id) === Number(userBarangayId.value)
}

const applyBarangayFilter = (farmers) => {
  if (isAdmin.value) {
    if (!selectedBarangayId.value) return farmers
    return farmers.filter((f) => Number(f.barangay_id) === Number(selectedBarangayId.value))
  }
  return farmers.filter(matchesUserBarangay)
}

const applySearchFilter = (farmers) => {
  const q = searchQuery.value.toLowerCase().trim()
  if (!q) return farmers
  return farmers.filter((f) => {
    const name = String(f.full_name || '').toLowerCase()
    const ref = String(f.reference_number || '').toLowerCase()
    const phone = String(f.phone_number || f.contact_number || '')
    return name.includes(q) || ref.includes(q) || phone.includes(q)
  })
}

const filterFarmers = (farmers) => applySearchFilter(applyBarangayFilter(farmers))

const selectedBarangayName = computed(() => {
  if (!selectedBarangayId.value) return ''
  const match = barangays.value.find((b) => String(b.id) === String(selectedBarangayId.value))
  return match?.name || 'selected barangay'
})

const hasActiveFilters = computed(() => {
  return Boolean(searchQuery.value.trim()) || (isAdmin.value && selectedBarangayId.value) || (!isAdmin.value && userBarangayName.value)
})

const filterSummary = computed(() => {
  const parts = []
  if (searchQuery.value.trim()) parts.push(`matching "${searchQuery.value.trim()}"`)
  if (isAdmin.value && selectedBarangayId.value) {
    parts.push(`in ${selectedBarangayName.value}`)
  } else if (!isAdmin.value && userBarangayName.value) {
    parts.push(`in ${userBarangayName.value} only`)
  }
  return parts.length ? `Showing members ${parts.join(' ')}` : ''
})

const pendingFarmers = computed(() => {
  const list = allFarmers.value.filter((f) => f.status === 'pending' || !f.status)
  return filterFarmers(list)
})

const registeredFarmers = computed(() => {
  const list = allFarmers.value.filter((f) => f.status === 'approved')
  return filterFarmers(list)
})

const rejectedFarmers = computed(() => {
  const list = allFarmers.value.filter((f) => f.status === 'rejected')
  return filterFarmers(list)
})

const pendingCount = computed(() => pendingFarmers.value.length)

const registeredCount = computed(() => registeredFarmers.value.length)

const rejectedCount = computed(() => rejectedFarmers.value.length)

const loadBarangays = async () => {
  if (!isAdmin.value) return
  try {
    const response = await fetch('/api/barangays')
    const data = await response.json()
    if (Array.isArray(data)) {
      barangays.value = data
    } else if (data.success && Array.isArray(data.barangays)) {
      barangays.value = data.barangays
    } else if (data.success && Array.isArray(data.data)) {
      barangays.value = data.data
    }
  } catch (err) {
    console.error('Error loading barangays:', err)
  }
}

const loadFarmers = async () => {
  loading.value = true
  error.value = null
  try {
    const token = authStore.token
    // Call root endpoint to get all farmers with all statuses (pending, approved, rejected)
    const response = await fetch('/api/farmers', {
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      }
    })
    if (response.ok) {
      const data = await response.json()
      const farmers = data.farmers || data || []
      if (isAdmin.value) {
        allFarmers.value = farmers
      } else if (isPresident.value || isTreasurer.value) {
        allFarmers.value = farmers.filter(matchesUserBarangay)
      } else {
        error.value = 'Insufficient permissions to view members'
        allFarmers.value = []
      }
    } else if (response.status === 403) {
      error.value =
        'You do not have permission to view members. Only Admins and Presidents can access this page.'
      allFarmers.value = []
    } else {
      error.value = 'Failed to load farmers'
    }
  } catch (err) {
    console.error('Error loading farmers:', err)
    error.value = err.message || 'Failed to load farmers'
  } finally {
    loading.value = false
  }
}

const handleApprove = async (farmerId) => {
  try {
    const token = authStore.token
    const response = await fetch(`/api/farmers/${farmerId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      }
    })
    const data = await response.json()
    if (response.ok) {
      await loadFarmers()
      alert('Farmer approved successfully!')
    } else {
      alert('Failed to approve farmer: ' + (data.message || 'Unknown error'))
    }
  } catch (err) {
    alert('Error approving farmer: ' + err.message)
  }
}

const handleReject = async (farmerId) => {
  try {
    const token = authStore.token
    const response = await fetch(`/api/farmers/${farmerId}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      }
    })
    const data = await response.json()
    if (response.ok) {
      await loadFarmers()
      alert('Farmer rejected successfully!')
    } else {
      alert('Failed to reject farmer: ' + (data.message || 'Unknown error'))
    }
  } catch (err) {
    alert('Error rejecting farmer: ' + err.message)
  }
}

const handleDelete = async (farmerId) => {
  try {
    const response = await fetch(`/api/farmers/${farmerId}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' }
    })
    if (response.ok) {
      await loadFarmers()
      alert('Farmer deleted successfully!')
    } else {
      const data = await response.json()
      alert('Failed to delete farmer: ' + (data.message || 'Unknown error'))
    }
  } catch (err) {
    alert('Error deleting farmer: ' + err.message)
  }
}

const handleUpdateRole = async ({ memberId, newRole }) => {
  try {
    const response = await fetch(`/api/farmers/${memberId}/role`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: newRole })
    })
    if (response.ok) {
      await loadFarmers()
    } else {
      const data = await response.json()
      alert('Failed to update role: ' + (data.message || 'Unknown error'))
      await loadFarmers() // Refresh to reset dropdown
    }
  } catch (err) {
    alert('Error updating role: ' + err.message)
    await loadFarmers() // Refresh to reset dropdown
  }
}

const handleUpdateMembershipStatus = async ({ memberId, membershipStatus }) => {
  try {
    const token = authStore.token
    const response = await fetch(`/api/farmers/${memberId}/membership-status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: token ? `Bearer ${token}` : ''
      },
      body: JSON.stringify({ membership_status: membershipStatus })
    })
    if (response.ok) {
      await loadFarmers()
    } else {
      const data = await response.json()
      alert('Failed to update membership status: ' + (data.message || 'Unknown error'))
      await loadFarmers() // Refresh to reset dropdown
    }
  } catch (err) {
    alert('Error updating membership status: ' + err.message)
    await loadFarmers() // Refresh to reset dropdown
  }
}

onMounted(() => {
  if (!authStore.currentUser) {
    router.push('/login')
    return
  }
  // Check authorization
  if (!isAuthorized.value) {
    alert(
      'You do not have permission to access Member Management. Only Admins, Presidents, and Treasurers can access this page.'
    )
    router.push('/dashboard')
    return
  }
  loadBarangays()
  loadFarmers()
})

const goToMembersSummary = () => router.push('/members-summary')
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');
@import '../styles/members-table.css';

.registered-members-card {
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  padding: 1rem;
}

.registered-members-title {
  font-size: 1.1rem;
  font-weight: 800;
  color: #eefde6;
  margin: 0 0 0.85rem;
  letter-spacing: 0.02em;
}

/* ============================================
   PAGE — Dark Green Glassmorphic Theme
   ============================================ */
.farmer-table-page {
  --green: #34d399;
  --teal: #2dd4bf;
  --red: #f87171;
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --glass-line: rgba(190, 235, 203, 0.13);

  min-height: 100vh;
  padding: 24px;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: var(--text-main);
  position: relative;
  isolation: isolate;
}

.farmer-table-page::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 10% 90%, rgba(17, 94, 41, 0.18) 0%, transparent 60%),
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(45, 212, 191, 0.1) 0%, transparent 60%),
    radial-gradient(circle at 75% 75%, rgba(163, 230, 53, 0.08) 0%, transparent 30%);
  pointer-events: none;
  z-index: -1;
}

.page-inner {
  max-width: 100%;
  margin: 0 auto;
}

/* ============================================
   FILTER BAR (shared across tabs)
   ============================================ */
.filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  column-gap: 0.75rem;
  row-gap: 0.35rem;
  gap: 0.40rem 0.75rem;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  background: rgba(28, 42, 33, 0.9);
  border: 1px solid var(--glass-line);
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.filter-barangay-row {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  flex: 1 1 100%;
  width: 100%;
}

.filter-search-wrap {
  flex: 1 1 100%;
  min-width: 220px;
  width: 100%;
  position: relative;
}

.filter-search-icon {
  position: absolute;
  left: 0.65rem;
  top: 50%;
  transform: translateY(-50%);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: rgba(134, 239, 172, 0.9);
  pointer-events: none;
}

.filter-search-input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.6rem 0.75rem 0.6rem 2.25rem;
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 8px;
  font-size: 1.0625rem;
  color: var(--text-main);
  background: rgba(0, 0, 0, 0.22);
}

.filter-search-input::placeholder {
  color: rgba(229, 235, 231, 0.45);
}

.filter-search-input:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
}

.filter-label {
  font-size: 0.9375rem;
  font-weight: 700;
  color: #b6f7cb;
  white-space: nowrap;
}

.filter-select {
  min-width: 180px;
  padding: 0.55rem 0.75rem;
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 8px;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-main);
  background: rgba(0, 0, 0, 0.22);
  cursor: pointer;
}

.filter-select option {
  background: #132119;
  color: var(--text-main);
}

.filter-hint {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-muted);
  flex: 1 1 100%;
}

.filter-barangay-badge {
  display: inline-flex;
  align-items: center;
  padding: 0.45rem 0.75rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  color: #bbf7d0;
  background: rgba(34, 197, 94, 0.12);
  border: 1px solid rgba(74, 222, 128, 0.28);
  white-space: nowrap;
}

/* ============================================
   HEADER ROW
   ============================================ */
.page-top-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 24px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--text-main);
}

.btn-summary {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 18px;
  border-radius: 10px;
  border: 2px solid #166534 !important;
  background: #ffffff !important;
  color: #14532d !important;
  font-weight: 700;
  font-size: 14px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: none !important;
}

.btn-summary:hover {
  background: #f0fdf4 !important;
  color: #14532d !important;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.16) !important;
}

.btn-tab-icon {
  width: 20px;
  height: 20px;
  flex-shrink: 0;
  color: currentColor;
  transition: transform 0.2s ease;
}

.btn-summary:hover .btn-tab-icon {
  transform: scale(1.15);
}

/* ============================================
   MEMBERS SUMMARY TABS (top 3 boxes)
   ============================================ */
.members-summary-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

/* Tablet: keep 3 columns but slightly tighter */
@media (max-width: 900px) {
  .members-summary-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    margin-bottom: 0.85rem;
  }

  .tab-btn {
    min-height: 0;
    padding: 0.7rem 0.45rem;
    gap: 4px;
  }

  .tab-icon {
    width: 20px;
    height: 20px;
  }

  .tab-btn-label {
    font-size: 0.75rem;
  }

  .tab-btn-count {
    font-size: 0.95rem;
    min-width: 28px;
    padding: 2px 8px;
  }
}

.tab-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 96px;
  padding: 16px 14px;
  border: 1.5px solid rgba(134, 239, 172, 0.28);
  border-radius: 14px;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.22s ease;
  background: rgba(18, 31, 24, 0.92);
  color: #ecfdf5;
  text-align: center;
  box-shadow: 0 6px 16px rgba(4, 18, 12, 0.22);
}

.tab-btn-label {
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.25;
  color: inherit;
}

.tab-btn-count {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 40px;
  padding: 4px 12px;
  border-radius: 999px;
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1;
  background: rgba(255, 255, 255, 0.1);
  color: #86efac;
  border: 1px solid rgba(134, 239, 172, 0.35);
}

.tab-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  color: #86efac;
  transition: transform 0.22s ease, color 0.22s ease;
}

.tab-btn:hover {
  background: rgba(25, 42, 32, 0.96);
  border-color: rgba(134, 239, 172, 0.5);
  color: #ffffff;
  transform: translateY(-2px);
  box-shadow: 0 10px 22px rgba(4, 18, 12, 0.28);
}

.tab-btn:hover .tab-icon {
  transform: scale(1.08);
  color: #bbf7d0;
}

.tab-btn:hover .tab-btn-count {
  background: rgba(255, 255, 255, 0.14);
  color: #bbf7d0;
}

.tab-btn.active {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  border-color: #86efac;
  color: #ffffff;
  box-shadow: 0 10px 24px rgba(22, 163, 74, 0.32);
  transform: translateY(-1px);
}

.tab-btn.active .tab-icon {
  color: #ffffff;
}

.tab-btn.active .tab-btn-count {
  background: rgba(255, 255, 255, 0.2);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.35);
}

.tab-btn.active .tab-btn-label {
  color: #ffffff;
}

.state-center {
  text-align: center;
  padding: 32px 0;
}

.state-text {
  color: var(--text-muted);
  margin-top: 8px;
}

.spinner {
  width: 28px;
  height: 28px;
  border: 3px solid rgba(74, 222, 128, 0.18);
  border-top-color: var(--green);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  margin: 0 auto;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== DARK MODE — readable light-surface controls (colors only; layout matches base) ===== */
.farmer-table-page:not(.light-theme) .btn-summary,
.farmer-table-page:not(.light-theme) .btn-summary .btn-tab-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #16a34a !important;
}

.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #16a34a !important;
  box-shadow: 0 4px 12px rgba(4, 18, 12, 0.2) !important;
}

.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn :is(.tab-icon, .tab-btn-label, .tab-btn-count) {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn:hover {
  background: linear-gradient(135deg, #ecfdf5 0%, #86efac 100%) !important;
  color: #052e16 !important;
}

.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn.active {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%) !important;
  border-color: #15803d !important;
  color: #052e16 !important;
  box-shadow: 0 0 0 1px rgba(22, 163, 74, 0.25), 0 6px 16px rgba(4, 18, 12, 0.22) !important;
}

.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn.active :is(.tab-icon, .tab-btn-label, .tab-btn-count) {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn-count {
  background: rgba(5, 46, 22, 0.08) !important;
  border-color: #16a34a !important;
}

.farmer-table-page:not(.light-theme) .filter-search-input,
.farmer-table-page:not(.light-theme) .filter-select {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #94a3b8 !important;
  box-shadow: none !important;
}

.farmer-table-page:not(.light-theme) .filter-search-input::placeholder {
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
  opacity: 1 !important;
}

.farmer-table-page:not(.light-theme) .filter-select option {
  background: #ffffff !important;
  color: #052e16 !important;
}

.farmer-table-page:not(.light-theme) .filter-search-icon {
  color: #15803d !important;
}

.farmer-table-page:not(.light-theme) .filter-label,
.farmer-table-page:not(.light-theme) .filter-hint {
  color: #ecfdf5 !important;
}

.farmer-table-page:not(.light-theme) .registered-members-title {
  background: none !important;
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
  -webkit-text-fill-color: #ffffff !important;
  color: #ffffff !important;
}

.farmer-table-page:not(.light-theme) :deep(.empty-state),
.farmer-table-page:not(.light-theme) :deep(.loading-state),
.farmer-table-page:not(.light-theme) :deep(.error-state) {
  background: #ffffff !important;
  border-color: #94a3b8 !important;
  color: #052e16 !important;
}

.farmer-table-page:not(.light-theme) :deep(.empty-state > p:first-child),
.farmer-table-page:not(.light-theme) :deep(.loading-state p),
.farmer-table-page:not(.light-theme) :deep(.error-state p) {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-table-page:not(.light-theme) :deep(.bulk-approve-btn),
.farmer-table-page:not(.light-theme) :deep(.refresh-btn),
.farmer-table-page:not(.light-theme) :deep(.retry-btn) {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%) !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #15803d !important;
}

.farmer-table-page:not(.light-theme) .state-text {
  color: #ecfdf5 !important;
}

/* ===== LIGHT MODE — Senior-friendly bright sage theme ===== */
.farmer-table-page.light-theme {
  --text-main: #052e16;
  --text-muted: #14532d;
  --glass-line: rgba(34, 197, 94, 0.28);
  --green: #15803d;

  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%) !important;
  color: var(--text-main) !important;
}

.farmer-table-page.light-theme::before {
  opacity: 0.15;
}

.farmer-table-page.light-theme .page-title {
  color: #052e16 !important;
  background: none !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-table-page.light-theme .filter-bar {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.1) !important;
}

.farmer-table-page.light-theme .filter-search-icon {
  color: #15803d !important;
}

.farmer-table-page.light-theme .filter-search-input,
.farmer-table-page.light-theme .filter-select {
  background: #ffffff !important;
  color: #000000 !important;
  border-color: #94a3b8 !important;
}

.farmer-table-page.light-theme .filter-search-input::placeholder {
  color: #64748b !important;
}

.farmer-table-page.light-theme .filter-label,
.farmer-table-page.light-theme .filter-hint,
.farmer-table-page.light-theme .state-text {
  color: #000000 !important;
}

.farmer-table-page.light-theme .filter-barangay-badge {
  color: #14532d !important;
  background: #f0fdf4 !important;
  border-color: #86efac !important;
}

.farmer-table-page.light-theme .filter-select option {
  background: #ffffff;
  color: #052e16;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.08) !important;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn-label {
  color: #052e16 !important;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn-count {
  color: #15803d !important;
  background: #f0fdf4 !important;
  border-color: #86efac !important;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-icon {
  color: #16a34a !important;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn:hover {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  border-color: #86efac !important;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  border-color: #15803d !important;
  color: #ffffff !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.22) !important;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn.active :is(.tab-btn-label, .tab-btn-count, .tab-icon) {
  color: #ffffff !important;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn.active .tab-btn-count {
  background: rgba(255, 255, 255, 0.22) !important;
  border-color: rgba(255, 255, 255, 0.35) !important;
}

.farmer-table-page.light-theme .registered-members-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.farmer-table-page.light-theme .registered-members-title {
  color: #052e16;
  background: none;
  -webkit-background-clip: border-box;
  background-clip: border-box;
  -webkit-text-fill-color: currentColor;
}

.farmer-table-page.light-theme :deep(.registered-members-card) {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.farmer-table-page.light-theme :deep(.registered-members-title) {
  color: #052e16;
  background: none;
  -webkit-background-clip: border-box;
  background-clip: border-box;
  -webkit-text-fill-color: currentColor;
}

.farmer-table-page.light-theme :deep(.empty-state) {
  background: #ffffff;
  border-color: #94a3b8;
  color: #14532d;
}

.farmer-table-page.light-theme :deep(.empty-state > p:first-child) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.empty-hint),
.farmer-table-page.light-theme :deep(.empty-checklist),
.farmer-table-page.light-theme :deep(.empty-checklist li) {
  color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.empty-checklist code) {
  background: #ecfdf5;
  color: #14532d !important;
  border-color: #bbf7d0;
}

.farmer-table-page.light-theme :deep(.loading-state),
.farmer-table-page.light-theme :deep(.error-state) {
  color: #14532d;
}

.farmer-table-page.light-theme :deep(.refresh-btn) {
  background: #ffffff;
  color: #15803d;
  border-color: #86efac;
}

.farmer-table-page.light-theme :deep(.refresh-btn:hover:not(:disabled)) {
  background: #f0fdf4;
  color: #052e16;
}

.farmer-table-page.light-theme :deep(.registered-members-muted) {
  color: #166534 !important;
}

.farmer-table-page.light-theme .btn-tab-icon {
  color: #15803d !important;
}

/* Registered Members — role filter cards (colors only; layout matches dark) */
.farmer-table-page.light-theme :deep(.role-tabs) {
  background: #f4faf6 !important;
  border-color: #86efac !important;
}

.farmer-table-page.light-theme :deep(.role-tab) {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  color: #14532d !important;
}

.farmer-table-page.light-theme :deep(.role-tab-label) {
  color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.role-tab-count) {
  color: #15803d !important;
}

.farmer-table-page.light-theme :deep(.role-tab-icon) {
  color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.role-tab:hover .role-tab-icon) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.role-tab.active .role-tab-icon) {
  color: #ffffff !important;
}

.farmer-table-page.light-theme :deep(.role-tab:hover) {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.role-tab:hover .role-tab-label) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.role-tab.active) {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  border-color: #15803d !important;
  color: #ffffff !important;
}

.farmer-table-page.light-theme :deep(.role-tab.active .role-tab-label),
.farmer-table-page.light-theme :deep(.role-tab.active .role-tab-count) {
  color: #ffffff !important;
}

.farmer-table-page.light-theme :deep(.edit-input),
.farmer-table-page.light-theme :deep(.edit-input-modal) {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #cbd5e1 !important;
}

.farmer-table-page.light-theme :deep(.edit-input-modal::placeholder) {
  color: #64748b !important;
}

.farmer-table-page.light-theme :deep(.edit-label),
.farmer-table-page.light-theme :deep(.detail-label) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.detail-value),
.farmer-table-page.light-theme :deep(.member-name),
.farmer-table-page.light-theme :deep(.edit-photo-name) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.edit-photo-sub),
.farmer-table-page.light-theme :deep(.edit-hint) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.edit-photo-row) {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
  border-color: rgba(22, 101, 52, 0.38) !important;
}

.farmer-table-page.light-theme :deep(.modal-overlay) {
  background: rgba(236, 253, 245, 0.55) !important;
}

.farmer-table-page.light-theme :deep(.modal-content) {
  background: linear-gradient(165deg, #ffffff 0%, #f7fdf9 42%, #ecfdf5 100%) !important;
  border-color: #166534 !important;
  color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.modal-header) {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 48%, #bbf7d0 100%) !important;
  border-bottom-color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.modal-title) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.modal-header button) {
  background: #ffffff !important;
  border-color: #166534 !important;
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.modal-header button:hover) {
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
  -webkit-text-fill-color: #b91c1c !important;
}

.farmer-table-page.light-theme :deep(.modal-body) {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.65) 0%, rgba(240, 253, 244, 0.35) 100%) !important;
}

.farmer-table-page.light-theme :deep(.member-name) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.modal-body .rounded-full.object-cover) {
  border-color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.modal-avatar-fallback) {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
  border-color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.detail-item) {
  background: #ffffff !important;
  border-color: rgba(22, 101, 52, 0.35) !important;
}

.farmer-table-page.light-theme :deep(.detail-label),
.farmer-table-page.light-theme :deep(.detail-value) {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.farmer-table-page.light-theme :deep(.modal-footer) {
  border-top-color: rgba(22, 101, 52, 0.35) !important;
  background: #ffffff !important;
}

.farmer-table-page.light-theme :deep(.btn-secondary) {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #15803d !important;
}

.farmer-table-page.light-theme :deep(.btn-secondary:hover) {
  background: linear-gradient(135deg, #86efac 0%, #4ade80 55%, #22c55e 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.btn-primary) {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #15803d !important;
}

/* Compact tables in child tabs (Pending / Registered Members) */
.farmer-table-page :deep(.members-table-container) {
  --members-font-table-head: 0.58rem;
  --members-font-table-cell: 0.625rem;
  --members-font-chip: 0.55rem;
}

.farmer-table-page :deep(.members-table) {
  min-width: 960px;
  table-layout: fixed;
}

.farmer-table-page :deep(.members-table th),
.farmer-table-page :deep(.members-table td) {
  padding: 0.26rem 0.28rem !important;
  font-size: var(--members-font-table-cell) !important;
  line-height: 1.12;
}

.farmer-table-page :deep(.members-table th) {
  font-size: var(--members-font-table-head) !important;
}

.farmer-table-page :deep(.member-avatar),
.farmer-table-page :deep(.member-avatar-wrap) {
  width: 36px !important;
  height: 36px !important;
  min-width: 36px !important;
  min-height: 36px !important;
}

.farmer-table-page :deep(.members-action-row .table-action-btn),
.farmer-table-page :deep(.members-action-row .table-action-protected) {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  min-height: 24px !important;
}

.farmer-table-page :deep(.mmc-actions .table-action-btn.mmc-action-text) {
  width: auto !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 1.85rem !important;
  padding: 0.28rem 0.55rem !important;
  font-size: 0.72rem !important;
  font-weight: 700 !important;
  line-height: 1.1 !important;
  border-radius: 7px !important;
}

.farmer-table-page :deep(.members-action-row .table-action-btn svg) {
  width: 11px !important;
  height: 11px !important;
}

.farmer-table-page :deep(.members-table .table-select) {
  font-size: 0.58rem !important;
  padding: 0.12rem 0.2rem !important;
  min-height: 1.45rem;
}

/* Theme parity lock — same geometry in light & dark; themes only recolor */
.farmer-table-page .members-summary-tabs .tab-btn,
.farmer-table-page.light-theme .members-summary-tabs .tab-btn,
.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn {
  border-width: 1.5px !important;
  border-radius: 14px !important;
}

.farmer-table-page :deep(.table-action-btn),
.farmer-table-page.light-theme :deep(.table-action-btn),
.farmer-table-page:not(.light-theme) :deep(.table-action-btn) {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 6px !important;
  border-width: 1px !important;
}

.farmer-table-page :deep(.members-action-row .table-action-btn) {
  width: 24px !important;
  height: 24px !important;
  min-width: 24px !important;
  min-height: 24px !important;
}

.farmer-table-page :deep(.mmc-actions .table-action-btn.mmc-action-text) {
  width: auto !important;
  min-width: 0 !important;
  height: auto !important;
  min-height: 1.85rem !important;
  border-radius: 7px !important;
}

/* Compact position grid — phones + tablets */
@media (max-width: 1024px) {
  .farmer-table-page :deep(.role-tabs) {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    column-gap: 3px !important;
    row-gap: 3px !important;
    gap: 3px !important;
    padding: 3px !important;
    margin-bottom: 0.35rem !important;
    overflow: visible !important;
  }

  .farmer-table-page :deep(.role-tab) {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    flex: none !important;
    display: grid !important;
    grid-template-columns: 1fr auto !important;
    grid-template-rows: auto auto !important;
    column-gap: 2px !important;
    row-gap: 0 !important;
    padding: 3px 4px !important;
    border-radius: 5px !important;
    overflow: hidden !important;
    box-shadow: none !important;
    line-height: 1 !important;
    align-items: center !important;
    justify-items: center !important;
  }

  .farmer-table-page :deep(.role-tab:hover),
  .farmer-table-page :deep(.role-tab.active) {
    transform: none !important;
    box-shadow: none !important;
  }

  .farmer-table-page :deep(.role-tab-icon) {
    grid-column: 1 !important;
    grid-row: 1 !important;
    width: 10px !important;
    height: 10px !important;
    margin: 0 !important;
  }

  .farmer-table-page :deep(.role-tab-label) {
    grid-column: 1 !important;
    grid-row: 2 !important;
    font-size: 0.5rem !important;
    line-height: 1.05 !important;
    letter-spacing: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100% !important;
    white-space: normal !important;
    overflow: visible !important;
    word-break: break-word !important;
    text-align: center !important;
  }

  .farmer-table-page :deep(.role-tab-count) {
    grid-column: 2 !important;
    grid-row: 1 / -1 !important;
    align-self: center !important;
    justify-self: end !important;
    font-size: 0.48rem !important;
    line-height: 1 !important;
    margin: 0 !important;
    padding: 0 !important;
    white-space: nowrap !important;
  }

  .farmer-table-page.light-theme :deep(.role-tabs),
  .farmer-table-page.light-theme :deep(.role-tab) {
    box-shadow: none !important;
  }
}

/* ============================================
   MOBILE — compact chrome, content above the fold
   ============================================ */
@media (max-width: 768px) {
  .farmer-table-page {
    padding: 0.55rem 0.55rem 1rem;
  }

  .page-top-row {
    display: flex !important;
    flex-wrap: nowrap !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 0.45rem !important;
    margin-bottom: 0.55rem !important;
  }

  .page-title {
    flex: 1 1 auto;
    min-width: 0;
    margin: 0;
    font-size: 1.05rem !important;
    line-height: 1.2 !important;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .btn-summary {
    flex: 0 0 auto !important;
    white-space: nowrap !important;
    padding: 0.4rem 0.7rem !important;
    font-size: 0.72rem !important;
    gap: 5px !important;
    border-radius: 8px !important;
  }

  .btn-tab-icon {
    width: 15px;
    height: 15px;
  }

  /* Keep all 3 status tabs visible in one row — no stacked cards */
  .members-summary-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 5px;
    margin-bottom: 0.55rem;
  }

  .tab-btn {
    min-height: 0;
    padding: 0.4rem 0.25rem;
    gap: 2px;
    border-radius: 10px;
    box-shadow: 0 2px 8px rgba(4, 18, 12, 0.16);
  }

  .tab-btn:hover,
  .tab-btn.active {
    transform: none;
  }

  .tab-icon {
    width: 15px;
    height: 15px;
  }

  .tab-btn-label {
    font-size: 0.62rem;
    line-height: 1.15;
    /* Shorten visual height of long labels */
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .tab-btn-count {
    font-size: 0.8rem;
    min-width: 22px;
    padding: 1px 6px;
  }

  .filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 6px !important;
    row-gap: 6px !important;
    column-gap: 0.45rem;
    margin-bottom: 0.55rem;
    padding: 0.5rem 0.55rem;
    border-radius: 10px;
  }

  .filter-barangay-row {
    flex: 0 0 auto;
    width: 100%;
    flex-wrap: wrap;
    margin: 0 !important;
    padding: 0 !important;
  }

  .filter-search-wrap {
    flex: 0 0 auto;
    min-width: 0;
    width: 100%;
    margin: 0 !important;
    padding: 0 !important;
  }

  .filter-select,
  .filter-search-input {
    margin: 0 !important;
  }

  .filter-search-input {
    padding: 0.5rem 0.6rem 0.5rem 2rem;
    font-size: 16px; /* prevent iOS zoom */
  }

  .filter-label {
    font-size: 0.78rem;
  }

  .filter-select {
    flex: 1;
    min-width: 0;
    padding: 0.45rem 0.55rem;
    font-size: 0.88rem;
  }

  .filter-barangay-badge {
    padding: 0.35rem 0.55rem;
    font-size: 0.75rem;
  }

  .filter-hint {
    font-size: 0.75rem;
  }

  /* Child tab cards / headers */
  .farmer-table-page :deep(.registered-members-card),
  .farmer-table-page :deep(.pending-members-card) {
    padding: 0.65rem !important;
    margin-bottom: 0.65rem !important;
    border-radius: 10px !important;
  }

  .farmer-table-page :deep(.registered-members-title) {
    font-size: 1rem !important;
  }

  .farmer-table-page :deep(.section-header-with-actions) {
    margin-bottom: 0.55rem !important;
    gap: 0.45rem !important;
  }

  .farmer-table-page :deep(.bulk-actions) {
    gap: 0.4rem !important;
  }

  /* Mobile cards — tighter stack + larger tap targets */
  .farmer-table-page :deep(.members-mobile-card) {
    display: flex !important;
    flex-direction: column !important;
    gap: 0.4rem !important;
    padding: 0.55rem 0.6rem !important;
  }

  .farmer-table-page :deep(.mmc-head),
  .farmer-table-page :deep(.mmc-rows),
  .farmer-table-page :deep(.mmc-controls) {
    margin-bottom: 0 !important;
  }

  .farmer-table-page :deep(.mmc-actions .table-action-btn),
  .farmer-table-page :deep(.mmc-actions .table-action-protected) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    padding: 0 !important;
    border-radius: 8px !important;
    transform: none !important;
  }

  .farmer-table-page :deep(.mmc-actions .table-action-btn svg) {
    display: block !important;
    width: 16px !important;
    height: 16px !important;
    margin: 0 !important;
  }

  .farmer-table-page :deep(.mmc-actions .table-action-btn.mmc-action-text) {
    width: auto !important;
    min-width: 0 !important;
    height: 40px !important;
    min-height: 40px !important;
    padding: 0 0.7rem !important;
    font-size: 0.8rem !important;
    font-weight: 700 !important;
    line-height: 1 !important;
    border-radius: 8px !important;
  }

  .farmer-table-page :deep(.mmc-actions) {
    justify-content: center !important;
    gap: 0.35rem !important;
    width: 100% !important;
  }

  .farmer-table-page :deep(.mmc-actions .table-action-btn:hover),
  .farmer-table-page :deep(.mmc-actions .table-action-btn:active) {
    transform: none !important;
  }

  .farmer-table-page :deep(.bulk-approve-btn),
  .farmer-table-page :deep(.refresh-btn) {
    padding: 0.4rem 0.7rem !important;
    font-size: 0.75rem !important;
  }

  .farmer-table-page :deep(.member-avatar),
  .farmer-table-page :deep(.member-avatar-wrap) {
    width: 30px !important;
    height: 30px !important;
    min-width: 30px !important;
    min-height: 30px !important;
  }

  .state-center,
  .farmer-table-page :deep(.loading-state),
  .farmer-table-page :deep(.empty-state),
  .farmer-table-page :deep(.error-state) {
    padding: 1.25rem 0.5rem !important;
  }
}

@media (max-width: 480px) {
  .farmer-table-page {
    padding: 0.4rem 0.4rem 0.85rem;
  }

  .page-top-row {
    flex-wrap: nowrap !important;
  }

  .page-title {
    font-size: 15px !important;
  }

  .btn-summary {
    font-size: 11px !important;
    padding: 0.35rem 0.55rem !important;
  }

  .tab-btn-label {
    font-size: 0.58rem;
  }

  .tab-btn-count {
    font-size: 0.75rem;
  }
}
</style>
