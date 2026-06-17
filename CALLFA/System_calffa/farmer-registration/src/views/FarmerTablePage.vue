<template>
  <div class="farmer-table-page glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-inner">
      <div class="page-top-row">
        <h1 class="page-title">Members Management</h1>
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
          Members Summary
        </button>
      </div>

      <!-- Tabs -->
      <div class="members-summary-tabs mb-6">
        <button
          type="button"
          :class="['tab-btn', { active: activeTab === 'pending' }]"
          @click="activeTab = 'pending'"
        >
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <polyline points="12 6 12 12 16 14"/>
          </svg>
          <span class="tab-btn-label">Pending Approval</span>
          <span class="tab-btn-count">{{ pendingCount }}</span>
        </button>
        <button
          type="button"
          :class="['tab-btn', { active: activeTab === 'registered' }]"
          @click="activeTab = 'registered'"
        >
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
            <circle cx="9" cy="7" r="4"/>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
          </svg>
          <span class="tab-btn-label">Registered Members</span>
          <span class="tab-btn-count">{{ registeredCount }}</span>
        </button>
        <button
          type="button"
          :class="['tab-btn', { active: activeTab === 'rejected' }]"
          @click="activeTab = 'rejected'"
        >
          <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10"/>
            <line x1="15" y1="9" x2="9" y2="15"/>
            <line x1="9" y1="9" x2="15" y2="15"/>
          </svg>
          <span class="tab-btn-label">Rejected Accounts</span>
          <span class="tab-btn-count">{{ rejectedCount }}</span>
        </button>
      </div>

      <div class="filter-bar">
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
            placeholder="Search by name, reference #, or phone..."
          />
        </div>
        <template v-if="isAdmin">
          <label for="members-barangay-filter" class="filter-label">Barangay</label>
          <select id="members-barangay-filter" v-model="selectedBarangayId" class="filter-select">
            <option value="">All Barangays</option>
            <option v-for="barangay in barangays" :key="barangay.id" :value="String(barangay.id)">
              {{ barangay.name }}
            </option>
          </select>
        </template>
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
          <h2 class="registered-members-title">Rejected Accounts</h2>
          <div v-if="loading" class="state-center">
            <div class="spinner"></div>
            <p class="state-text">Loading...</p>
          </div>
          <div v-else-if="rejectedFarmers.length === 0" class="state-center">
            <p class="state-text">No rejected accounts found.</p>
          </div>
          <div v-else class="registered-table-scroll">
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
                    <th>Photo</th>
                    <th>Ref #</th>
                    <th>Name</th>
                    <th>DOB</th>
                    <th>Phone</th>
                    <th>Education</th>
                    <th class="members-th-role">Role</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th class="members-th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="farmer in rejectedFarmers" :key="farmer.id" class="members-data-row">
                    <td class="members-cell-center">
                      <div class="member-avatar-wrap">
                        <img
                          v-if="farmer.profile_picture"
                          :src="getProfilePictureUrl(farmer.profile_picture)"
                          alt="Profile"
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
                      <span class="status-chip status-chip-rejected">Rejected</span>
                    </td>
                    <td class="members-cell members-actions-cell">
                      <div class="members-action-row">
                        <button type="button" class="table-action-btn table-action-approve" title="Approve" aria-label="Approve" @click="handleApprove(farmer.id)">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="20 6 9 17 4 12"/>
                          </svg>
                        </button>
                        <button type="button" class="table-action-btn table-action-delete" title="Delete" aria-label="Delete" @click="handleDelete(farmer.id)">
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
  return authStore.currentUser?.barangay_id
})

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

const applyBarangayFilter = (farmers) => {
  if (!isAdmin.value || !selectedBarangayId.value) return farmers
  const barangayId = Number(selectedBarangayId.value)
  return farmers.filter((f) => Number(f.barangay_id) === barangayId)
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
  return Boolean(searchQuery.value.trim()) || (isAdmin.value && selectedBarangayId.value)
})

const filterSummary = computed(() => {
  const parts = []
  if (searchQuery.value.trim()) parts.push(`matching "${searchQuery.value.trim()}"`)
  if (isAdmin.value && selectedBarangayId.value) parts.push(`in ${selectedBarangayName.value}`)
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
      if (isAdmin.value) {
        // Admin can see all farmers from all barangays
        allFarmers.value = data.farmers || data || []
      } else if (isPresident.value || isTreasurer.value) {
        // President/Treasurer sees only farmers from their own barangay
        const farmers = data.farmers || data || []
        if (userBarangayId.value) {
          allFarmers.value = farmers.filter((f) => f.barangay_id === userBarangayId.value)
        } else {
          allFarmers.value = farmers
        }
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
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  background: rgba(28, 42, 33, 0.9);
  border: 1px solid var(--glass-line);
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.2);
}

.filter-search-wrap {
  flex: 1;
  min-width: 220px;
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

@media (max-width: 900px) {
  .members-summary-tabs {
    grid-template-columns: 1fr;
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

/* ===== DARK MODE — readable light-surface controls ===== */
.farmer-table-page:not(.light-theme) .btn-summary,
.farmer-table-page:not(.light-theme) .btn-summary .btn-tab-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 2px solid #16a34a !important;
}

.farmer-table-page:not(.light-theme) .members-summary-tabs .tab-btn {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 2px solid #16a34a !important;
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
  border: 1.5px solid #94a3b8 !important;
}

.farmer-table-page:not(.light-theme) .filter-search-input::placeholder {
  color: #64748b !important;
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
  border: 2px solid #94a3b8 !important;
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
  border: 2px solid #15803d !important;
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
  font-size: 1.875rem;
  background: none !important;
  -webkit-text-fill-color: #052e16 !important;
}

.farmer-table-page.light-theme .filter-bar {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.1) !important;
}

.farmer-table-page.light-theme .filter-search-icon {
  color: #15803d !important;
}

.farmer-table-page.light-theme .filter-search-input,
.farmer-table-page.light-theme .filter-select {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1.5px solid #94a3b8 !important;
  font-size: 1.0625rem !important;
}

.farmer-table-page.light-theme .filter-search-input::placeholder {
  color: #64748b !important;
}

.farmer-table-page.light-theme .filter-label,
.farmer-table-page.light-theme .filter-hint,
.farmer-table-page.light-theme .state-text {
  color: #000000 !important;
  font-size: 0.9375rem !important;
}

.farmer-table-page.light-theme .filter-select option {
  background: #ffffff;
  color: #052e16;
}

.farmer-table-page.light-theme .members-summary-tabs .tab-btn {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 2px solid #bbf7d0 !important;
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
  border: 2px solid #86efac !important;
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
  border: 2px solid #86efac;
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
  background: #f8fdf9;
  border: 1.5px solid #bbf7d0;
  color: #14532d;
}

.farmer-table-page.light-theme :deep(.empty-state > p:first-child) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.empty-hint),
.farmer-table-page.light-theme :deep(.empty-checklist),
.farmer-table-page.light-theme :deep(.empty-checklist li) {
  color: #166534 !important;
  font-size: 14px;
}

.farmer-table-page.light-theme :deep(.empty-checklist code) {
  background: #ecfdf5;
  color: #14532d !important;
  border: 1px solid #bbf7d0;
}

.farmer-table-page.light-theme :deep(.loading-state),
.farmer-table-page.light-theme :deep(.error-state) {
  color: #14532d;
}

.farmer-table-page.light-theme :deep(.refresh-btn) {
  background: #ffffff;
  color: #15803d;
  border: 1.5px solid #86efac;
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

/* Registered Members — role filter cards */
.farmer-table-page.light-theme :deep(.role-tabs) {
  background: #f4faf6 !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08) !important;
}

.farmer-table-page.light-theme :deep(.role-tab) {
  background: #ffffff !important;
  border: 1.5px solid #bbf7d0 !important;
  color: #14532d !important;
  box-shadow: 0 2px 6px rgba(22, 101, 52, 0.06) !important;
}

.farmer-table-page.light-theme :deep(.role-tab-label) {
  color: #000000 !important;
  font-size: 0.9375rem !important;
  font-weight: 700 !important;
}

.farmer-table-page.light-theme :deep(.role-tab-count) {
  color: #15803d !important;
  font-size: 0.8125rem !important;
  font-weight: 700 !important;
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
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.1) !important;
}

.farmer-table-page.light-theme :deep(.role-tab:hover .role-tab-label) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.role-tab.active) {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  border-color: #15803d !important;
  color: #ffffff !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.22) !important;
}

.farmer-table-page.light-theme :deep(.role-tab.active .role-tab-label),
.farmer-table-page.light-theme :deep(.role-tab.active .role-tab-count) {
  color: #ffffff !important;
}

.farmer-table-page.light-theme :deep(.edit-input),
.farmer-table-page.light-theme :deep(.edit-input-modal) {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 1.5px solid #cbd5e1 !important;
}

.farmer-table-page.light-theme :deep(.edit-input-modal::placeholder) {
  color: #64748b !important;
}

.farmer-table-page.light-theme :deep(.edit-label),
.farmer-table-page.light-theme :deep(.detail-label) {
  color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.detail-value),
.farmer-table-page.light-theme :deep(.member-name),
.farmer-table-page.light-theme :deep(.edit-photo-name) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.edit-photo-sub),
.farmer-table-page.light-theme :deep(.edit-hint) {
  color: #166534 !important;
}

.farmer-table-page.light-theme :deep(.edit-photo-row) {
  background: #f8fdf9 !important;
  border: 1.5px solid #bbf7d0 !important;
}

.farmer-table-page.light-theme :deep(.modal-content) {
  background: #fffef9 !important;
  border: 2px solid #86efac !important;
  color: #052e16 !important;
  box-shadow: 0 16px 40px rgba(22, 101, 52, 0.15) !important;
}

.farmer-table-page.light-theme :deep(.modal-header) {
  border-bottom: 1px solid #bbf7d0 !important;
}

.farmer-table-page.light-theme :deep(.modal-title) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.modal-header button) {
  color: #64748b !important;
}

.farmer-table-page.light-theme :deep(.modal-header button:hover) {
  color: #052e16 !important;
}

.farmer-table-page.light-theme :deep(.modal-footer) {
  border-top: 1px solid #bbf7d0 !important;
}

.farmer-table-page.light-theme :deep(.btn-secondary) {
  background: #ffffff !important;
  color: #14532d !important;
  border: 1.5px solid #86efac !important;
}

.farmer-table-page.light-theme :deep(.btn-secondary:hover) {
  background: #f0fdf4 !important;
}
</style>
