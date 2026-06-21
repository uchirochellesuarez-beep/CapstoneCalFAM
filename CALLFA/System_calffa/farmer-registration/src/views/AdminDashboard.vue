<template>
  <div class="dashboard-container glass-module-page" :class="{ 'light-theme': isLight }">
    <!-- Multi-layer background -->
    <div class="dashboard-bg-layer" aria-hidden="true"></div>
    <div class="dashboard-bg-orbs" aria-hidden="true"></div>

    <!-- Dashboard Header -->
    <div class="dashboard-header">
      <!-- Glass header top bar -->
      <div class="header-top">
        <div class="header-left">
          <div class="header-eyebrow">{{ dashboardEyebrow }}</div>
          <h1 class="dashboard-title">Dashboard</h1>
          <p class="dashboard-subtitle">{{ dashboardSubtitle }}</p>
        </div>
        <div class="header-time-card" :aria-label="`Current time and date, ${displayUserRole}`">
          <div class="header-time-label">Live Time</div>
          <div class="header-time-value">{{ currentTime }}</div>
          <div class="header-time-day">Day: {{ currentDay }}</div>
          <div class="header-time-date">{{ currentDate }}</div>
          <div v-if="displayUserRole" class="header-time-role" :class="userRole">{{ displayUserRole }}</div>
        </div>
      </div>

      <!-- Stats Overview -->
      <div class="stats-overview">
        <!-- Total Farmers - Green -->
        <div class="stat-card stat-green">
          <div class="stat-icon-wrap stat-icon-green">
            <img src="https://cdn-icons-png.flaticon.com/512/7417/7417717.png" alt="Farmer" class="stat-icon-img" />
          </div>
          <div class="stat-body">
            <div class="stat-label">{{ farmersStatLabel }}</div>
            <div class="stat-value">{{ animatedFarmers }}</div>
            <div class="stat-pill stat-pill-green">Active members</div>
          </div>
        </div>

        <!-- Barangays - Teal -->
        <div class="stat-card stat-teal">
          <div class="stat-icon-wrap stat-icon-teal">
            <span class="stat-emoji">📍</span>
          </div>
          <div class="stat-body">
            <div class="stat-label">{{ barangaysLabel }}</div>
            <div class="stat-value">{{ animatedBarangays }}</div>
            <div class="stat-pill stat-pill-teal">Covered areas</div>
          </div>
        </div>

        <template v-if="showPendingStat">
          <!-- Pending Approvals - Yellow -->
          <div class="stat-card stat-yellow">
            <div class="stat-icon-wrap stat-icon-yellow">
              <img src="https://cdn-icons-png.freepik.com/512/13366/13366070.png" alt="Pending" class="stat-icon-img" />
            </div>
            <div class="stat-body">
              <div class="stat-label">{{ pendingStatLabel }}</div>
              <div class="stat-value">{{ animatedPending }}</div>
              <div class="stat-pill stat-pill-yellow">Needs review</div>
            </div>
          </div>
        </template>
      </div>
    </div>

    <!-- Analytics & Insights Section - Glassmorphism -->
    <div class="analytics-section">
      <div class="analytics-bg" aria-hidden="true"></div>

      <!-- Section Header -->
      <div class="analytics-header">
        <div class="analytics-title-block">
          <h2 class="analytics-section-title">Analytics &amp; Insights</h2>
          <p class="analytics-section-sub">Real-time cooperative data at a glance</p>
        </div>
        <button v-if="isAdmin" class="filter-toggle-btn" @click="filterPanelOpen = !filterPanelOpen" :class="{ active: filterPanelOpen }" aria-label="Toggle filters">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>
          </svg>
          <span>Filter</span>
          <span v-if="activeFiltersCount > 0" class="filter-badge">{{ activeFiltersCount }}</span>
        </button>
      </div>

      <!-- Filter Panel -->
      <transition name="filter-slide">
        <div v-if="filterPanelOpen && isAdmin" class="filter-panel">
          <div class="filter-panel-grid">
            <div class="filter-group">
              <label class="filter-label">Barangay</label>
              <select v-model="filterBarangay" class="filter-select">
                <option value="">All Barangays</option>
                <option v-for="b in barangayFilterOptions" :key="b.id" :value="b.id">{{ b.name }}</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">Status</label>
              <select v-model="filterStatus" class="filter-select">
                <option value="">All Status</option>
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
              </select>
            </div>
            <div class="filter-group">
              <label class="filter-label">From Date</label>
              <input v-model="filterDateFrom" type="date" class="filter-select" />
            </div>
            <div class="filter-group">
              <label class="filter-label">To Date</label>
              <input v-model="filterDateTo" type="date" class="filter-select" />
            </div>
          </div>
          <div class="filter-actions">
            <button class="filter-apply-btn" @click="applyFilters">Apply Filters</button>
            <button class="filter-reset-btn" @click="resetFilters">Reset</button>
          </div>
        </div>
      </transition>

      <!-- Glass Charts Grid -->
      <div class="glass-charts-grid" :class="{ 'glass-charts-grid--two': !isAdmin }">

        <!-- Members by Status -->
        <div class="glass-chart-card">
          <div class="glass-chart-header">
            <div>
              <h3 class="glass-chart-title">Members by Status</h3>
              <p class="glass-chart-sub">{{ statusSegmentTotal }} Total Members</p>
            </div>
            <span class="glass-chart-badge">Status</span>
          </div>
          <div class="donut-wrap">
            <canvas ref="statusChartRef" class="donut-canvas"></canvas>
            <div class="donut-center-label">
              <span class="donut-center-num">{{ statusSegmentTotal }}</span>
              <span class="donut-center-text">Total</span>
            </div>
          </div>
          <div class="glass-legend">
            <span class="gl-item"><span class="gl-dot" style="background:#4ade80"></span>Approved <strong>{{ filteredApprovedCount }}</strong></span>
            <span class="gl-item"><span class="gl-dot" style="background:#fbbf24"></span>Pending <strong>{{ filteredPendingCount }}</strong></span>
            <span class="gl-item"><span class="gl-dot" style="background:#f87171"></span>Rejected <strong>{{ filteredRejectedCount }}</strong></span>
          </div>
        </div>

        <!-- Members by Barangay (admin) / Service Places (president) -->
        <div v-if="isAdmin" class="glass-chart-card">
          <div class="glass-chart-header">
            <div>
              <h3 class="glass-chart-title">Members by Barangay</h3>
              <p class="glass-chart-sub">{{ barangays.length }} registered barangays</p>
            </div>
            <button class="sort-toggle-btn" @click="toggleBarangaySort" :title="barangaySortDesc ? 'Sort Ascending' : 'Sort Descending'">
              <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path v-if="barangaySortDesc" d="M3 4h13M3 8h9m-9 4h6m4 0l4-4m0 0l4 4m-4-4v12"/>
                <path v-else d="M3 20h13M3 16h9m-9-4h9m5 4V4m0 0l-4 4m4-4l4 4"/>
              </svg>
              {{ barangaySortDesc ? 'Desc' : 'Asc' }}
            </button>
          </div>
          <canvas ref="barangayChartRef"></canvas>
          <div v-if="barangayChartData.length" class="glass-legend" style="margin-top:16px">
            <span v-for="row in barangayChartData" :key="row.name" class="gl-item">
              <span class="gl-dot" style="background:#4ade80"></span>
              {{ row.name }} <strong>{{ row.count }}</strong>
              <span class="gl-meta">({{ row.farmers }} farmers, {{ row.officers }} officers)</span>
            </span>
          </div>
        </div>

        <div v-else-if="isPresident" class="glass-chart-card">
          <div class="glass-chart-header">
            <div>
              <h3 class="glass-chart-title">Service Places</h3>
              <p class="glass-chart-sub">{{ servicePlaces.length }} covered areas in your barangay</p>
            </div>
            <span class="glass-chart-badge">Coverage</span>
          </div>
          <canvas ref="servicePlacesChartRef"></canvas>
          <div v-if="servicePlaceChartData.length" class="glass-legend" style="margin-top:16px">
            <span
              v-for="place in servicePlaceChartData"
              :key="place.name"
              class="gl-item"
            >
              <span class="gl-dot" :style="{ background: place.isActive ? '#4ade80' : '#94a3b8' }"></span>
              {{ place.name }} <strong>{{ place.count }}</strong>
            </span>
          </div>
        </div>

        <!-- Financial Overview -->
        <div class="glass-chart-card">
          <div class="glass-chart-header">
            <div>
              <h3 class="glass-chart-title">Financial Overview</h3>
              <p class="glass-chart-sub">{{ financialChartSub }}</p>
            </div>
            <span class="glass-chart-badge glass-chart-badge--finance">₱ Finance</span>
          </div>
          <canvas ref="financialChartRef"></canvas>
          <div class="glass-legend" style="margin-top:16px">
            <span class="gl-item"><span class="gl-dot" style="background:#60a5fa"></span>{{ isAdmin ? 'Outstanding Loans by Barangay' : 'My Shares' }}</span>
            <span v-if="!isAdmin" class="gl-item"><span class="gl-dot" style="background:#fb923c"></span>My Outstanding Loans</span>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { Chart, registerables } from 'chart.js'

Chart.register(...registerables)

const router = useRouter()
const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const authHeaders = () => {
  const headers = { 'Content-Type': 'application/json' }
  if (authStore.token) headers.Authorization = `Bearer ${authStore.token}`
  return headers
}

// State
const allFarmers = ref([])
const barangays = ref([])
const allApprovedLoans = ref([])
const allActiveLoans = ref([])
const allOverdueLoans = ref([])
const servicePlaces = ref([])
const loading = ref(false)
const currentTime = ref('')
const currentDay = ref('')
const currentDate = ref('')
let timeInterval = null

// Animated counters
const animatedFarmers = ref(0)
const animatedBarangays = ref(0)
const animatedPending = ref(0)

// Farmer-specific financial data
const farmerShares = ref(0)
const farmerLoans = ref(0)

// Chart refs
const statusChartRef = ref(null)
const barangayChartRef = ref(null)
const servicePlacesChartRef = ref(null)
const financialChartRef = ref(null)

let statusChart = null
let barangayChart = null
let servicePlacesChart = null
let financialChart = null

// Filter & Sort state
const filterPanelOpen = ref(false)
const filterBarangay = ref('')
const filterStatus = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const barangaySortDesc = ref(true)
// Applied filter values (committed on "Apply")
const appliedBarangay = ref('')
const appliedStatus = ref('')
const appliedDateFrom = ref('')
const appliedDateTo = ref('')

// Computed
const userRole = computed(() => authStore.currentUser?.role || '')
const displayUserRole = computed(() => {
  const role = userRole.value
  if (!role) return ''
  return role
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
})
const isAdmin = computed(() => userRole.value === 'admin')
const isPresident = computed(() => userRole.value === 'president')
const isFarmer = computed(() => userRole.value === 'farmer')
const showPendingStat = computed(() => isAdmin.value || isPresident.value)

const dashboardEyebrow = computed(() => {
  if (isAdmin.value) return 'CaLFFA Admin'
  if (isPresident.value) return 'CaLFFA President'
  if (isFarmer.value) return 'CaLFFA Farmer'
  return 'CaLFFA Operations'
})

const dashboardSubtitle = computed(() => {
  if (isPresident.value) {
    return 'Your barangay members, service areas, and cooperative overview'
  }
  if (isFarmer.value) {
    return 'Your barangay snapshot, member overview, and personal finances'
  }
  return 'Agricultural Intelligence & Cooperative Operations'
})

const farmersStatLabel = computed(() =>
  isAdmin.value ? 'Total Farmers' : 'Members in Your Barangay'
)

const pendingStatLabel = computed(() =>
  isAdmin.value ? 'Pending Approvals' : 'Pending in Your Barangay'
)

const financialChartSub = computed(() =>
  isAdmin.value ? 'All Members' : 'My Account'
)
const userBarangayId = computed(() => authStore.currentUser?.barangay_id)

const MEMBER_ROLES = ['farmer', 'president', 'treasurer', 'auditor', 'operator', 'operation_manager', 'business_manager']
const isMemberRole = (role) => MEMBER_ROLES.includes(role)

const normalizeMemberStatus = (status) => {
  const value = String(status ?? '').toLowerCase().trim()
  if (value === 'approved') return 'approved'
  if (value === 'rejected') return 'rejected'
  return 'pending'
}

// Filter options for filter panel
const barangayFilterOptions = computed(() => {
  return barangays.value.map(b => ({ id: b.id || b.barangay_id, name: b.name || b.barangay_name || b.barangay || String(b.id) }))
})

const activeFiltersCount = computed(() => {
  let n = 0
  if (appliedBarangay.value) n++
  if (appliedStatus.value) n++
  if (appliedDateFrom.value) n++
  if (appliedDateTo.value) n++
  return n
})

// Filter farmers based on user role (barangay restriction for non-admin)
const filteredFarmers = computed(() => {
  if (isAdmin.value) {
    return allFarmers.value
  }
  return allFarmers.value.filter(
    (f) => String(f.barangay_id) === String(userBarangayId.value)
  )
})

// Apply analytics filters on top of role-based farmer list
const filteredAnalyticsFarmers = computed(() => {
  let list = filteredFarmers.value.filter(f => isMemberRole(f.role))
  if (appliedBarangay.value) {
    list = list.filter(f => String(f.barangay_id) === String(appliedBarangay.value))
  }
  if (appliedStatus.value) {
    list = list.filter(f => normalizeMemberStatus(f.status) === appliedStatus.value)
  }
  if (appliedDateFrom.value) {
    list = list.filter(f => f.created_at && f.created_at >= appliedDateFrom.value)
  }
  if (appliedDateTo.value) {
    list = list.filter(f => f.created_at && f.created_at <= appliedDateTo.value + 'T23:59:59')
  }
  return list
})

// Total Members count = APPROVED farmers + officers only (excludes pending/rejected and agriculturists)
const totalFarmersCount = computed(() => {
  const fromMembers = filteredFarmers.value.filter(f =>
    isMemberRole(f.role) && normalizeMemberStatus(f.status) === 'approved'
  ).length

  if (fromMembers > 0 || allFarmers.value.length > 0) return fromMembers

  if (isAdmin.value && barangays.value.length) {
    return barangays.value.reduce(
      (sum, b) => sum + (Number(b.total_farmers) || 0) + (Number(b.total_officers) || 0),
      0
    )
  }

  return fromMembers
})

const getBarangayDisplayName = (barangay) =>
  barangay.name || barangay.barangay_name || barangay.barangay || 'Unnamed'

const getBarangayMemberBreakdown = (barangayId, barangayRecord) => {
  if (allFarmers.value.length > 0) {
    const approvedInBarangay = filteredFarmers.value.filter(
      (f) =>
        isMemberRole(f.role) &&
        normalizeMemberStatus(f.status) === 'approved' &&
        String(f.barangay_id) === String(barangayId)
    )
    const farmers = approvedInBarangay.filter((f) => f.role === 'farmer').length
    const officers = approvedInBarangay.filter((f) => f.role !== 'farmer').length
    return { farmers, officers, count: farmers + officers }
  }

  const farmers = Number(barangayRecord?.total_farmers) || 0
  const officers = Number(barangayRecord?.total_officers) || 0
  return { farmers, officers, count: farmers + officers }
}

const barangayChartData = computed(() => {
  const rows = barangays.value.map((b) => {
    const id = b.id || b.barangay_id
    const breakdown = getBarangayMemberBreakdown(id, b)
    return {
      name: getBarangayDisplayName(b),
      ...breakdown
    }
  })

  return [...rows].sort((a, b) =>
    barangaySortDesc.value ? b.count - a.count : a.count - b.count
  )
})

// Barangays card:
// - Admin: total registered barangays
// - Non-admin: number of barangay_service_places under their barangay
const barangaysCount = computed(() => {
  if (isAdmin.value) return barangays.value.length
  return servicePlaces.value.length
})
const barangaysLabel = computed(() => isAdmin.value ? 'Barangays' : 'Service Places')

// Filtered status counts (approved / pending / rejected only)
const filteredApprovedCount = computed(() =>
  filteredAnalyticsFarmers.value.filter(f => normalizeMemberStatus(f.status) === 'approved').length
)
const filteredPendingCount = computed(() =>
  filteredAnalyticsFarmers.value.filter(f => normalizeMemberStatus(f.status) === 'pending').length
)
const filteredRejectedCount = computed(() =>
  filteredAnalyticsFarmers.value.filter(f => normalizeMemberStatus(f.status) === 'rejected').length
)
const statusSegmentTotal = computed(() =>
  filteredApprovedCount.value + filteredPendingCount.value + filteredRejectedCount.value
)
const filteredTotalCount = computed(() => filteredAnalyticsFarmers.value.length)

const memberMatchesServicePlace = (member, placeName) => {
  if (!placeName) return false
  const needle = placeName.toLowerCase().trim()
  const location = `${member.farm_location || ''} ${member.address || ''}`.toLowerCase()
  if (!location.trim()) return false
  return location.includes(needle)
}

const servicePlaceChartData = computed(() => {
  return servicePlaces.value.map((place) => {
    const name = place.name || 'Unnamed'
    const count = filteredAnalyticsFarmers.value.filter((f) => {
      if (normalizeMemberStatus(f.status) !== 'approved') return false
      return memberMatchesServicePlace(f, name)
    }).length
    return {
      name,
      count,
      isActive: place.is_active !== 0 && place.is_active !== false
    }
  })
})

// Pending counts
const pendingCount = computed(() => filteredFarmers.value.filter(f =>
  isMemberRole(f.role) && normalizeMemberStatus(f.status) === 'pending'
).length)
// Helper: outstanding amount for a loan record
const outstandingAmount = (loan) => parseFloat(loan?.remaining_balance || 0)

// All outstanding loans across approved/active/overdue
const allOutstandingLoans = computed(() => [
  ...allApprovedLoans.value,
  ...allActiveLoans.value,
  ...allOverdueLoans.value
])

// Methods
const loadAllFarmers = async () => {
  try {
    const response = await fetch('/api/farmers', { headers: authHeaders() })
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    allFarmers.value = data.farmers || data || []
  } catch (err) {
    console.error('Error loading farmers:', err)
  }
}

const loadBarangays = async () => {
  try {
    const response = await fetch('/api/barangays')
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const data = await response.json()
    barangays.value = data.barangays || []
  } catch (err) {
    console.error('Error loading barangays:', err)
  }
}

const loadApprovedLoans = async () => {
  try {
    const response = await fetch('/api/loans?status=approved&limit=500', { headers: authHeaders() })
    if (response.ok) {
      const data = await response.json()
      allApprovedLoans.value = data.loans || []
    }
  } catch (err) {
    console.error('Error loading approved loans:', err)
  }
}

const loadActiveLoans = async () => {
  try {
    const response = await fetch('/api/loans?status=active&limit=500', { headers: authHeaders() })
    if (response.ok) {
      const data = await response.json()
      allActiveLoans.value = data.loans || []
    }
  } catch (err) {
    console.error('Error loading active loans:', err)
  }
}

const loadOverdueLoans = async () => {
  try {
    const response = await fetch('/api/loans?status=overdue&limit=500', { headers: authHeaders() })
    if (response.ok) {
      const data = await response.json()
      allOverdueLoans.value = data.loans || []
    }
  } catch (err) {
    console.error('Error loading overdue loans:', err)
  }
}

// Load barangay_service_places for the non-admin user's barangay
const loadServicePlaces = async () => {
  if (isAdmin.value) return
  if (!userBarangayId.value) return

  try {
    const response = await fetch(`/api/barangays/${userBarangayId.value}/places?active_only=0`)
    if (response.ok) {
      const data = await response.json()
      servicePlaces.value = data.places || []
    }
  } catch (err) {
    console.error('Error loading service places:', err)
  }
}

const loadFarmerFinancialData = async () => {
  if (isAdmin.value) return // Admin uses aggregated data

  try {
    const userId = authStore.currentUser?.id
    if (!userId) {
      console.warn('No user ID found for loading financial data')
      return
    }

    // Shares come from the Share Capital module (NOT generic contributions)
    try {
      const sharesResponse = await fetch('/api/share-capital/me', { headers: authHeaders() })
      if (sharesResponse.ok) {
        const sharesData = await sharesResponse.json()
        if (sharesData.success && sharesData.totals) {
          farmerShares.value = parseFloat(sharesData.totals.balance || 0)
        }
      }
    } catch (e) {
      console.error('Failed to load share capital:', e)
    }

    const loansResponse = await fetch(
      `/api/loans?farmer_id=${userId}&limit=100`,
      { headers: authHeaders() }
    )
    if (loansResponse.ok) {
      const loansData = await loansResponse.json()
      if (loansData.success && loansData.loans) {
        const outstanding = loansData.loans.filter(l =>
          ['approved', 'active', 'overdue'].includes(l.status)
        )
        farmerLoans.value = outstanding.reduce(
          (sum, l) => sum + parseFloat(l.remaining_balance || 0), 0
        )
      }
    }
  } catch (err) {
    console.error('Error loading farmer financial data:', err)
  }
}

const toggleBarangaySort = () => {
  barangaySortDesc.value = !barangaySortDesc.value
  renderBarangayChart()
}

const applyFilters = () => {
  appliedBarangay.value = filterBarangay.value
  appliedStatus.value = filterStatus.value
  appliedDateFrom.value = filterDateFrom.value
  appliedDateTo.value = filterDateTo.value
  filterPanelOpen.value = false
  nextTick(() => renderCharts())
}

const resetFilters = () => {
  filterBarangay.value = ''
  filterStatus.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  appliedBarangay.value = ''
  appliedStatus.value = ''
  appliedDateFrom.value = ''
  appliedDateTo.value = ''
  filterPanelOpen.value = false
  nextTick(() => renderCharts())
}

const updateTime = () => {
  const now = new Date()
  currentTime.value = now.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  })
  currentDay.value = now.toLocaleDateString('en-US', { weekday: 'long' })
  currentDate.value = now.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  })
}

const animateCounter = (targetRef, finalValue, duration = 900) => {
  const start = performance.now()
  const from = 0
  const to = Number(finalValue) || 0

  const step = (time) => {
    const progress = Math.min((time - start) / duration, 1)
    targetRef.value = Math.floor(from + (to - from) * (1 - Math.pow(1 - progress, 3)))
    if (progress < 1) requestAnimationFrame(step)
  }

  requestAnimationFrame(step)
}

const animateOverviewCounters = () => {
  animateCounter(animatedFarmers, totalFarmersCount.value)
  animateCounter(animatedBarangays, barangaysCount.value)
  animateCounter(animatedPending, pendingCount.value)
}

const getChartAxisStyle = () => {
  if (isLight.value) {
    return {
      tickColor: '#000000',
      gridColor: 'rgba(0, 0, 0, 0.18)',
      borderColor: 'rgba(0, 0, 0, 0.28)',
      doughnutBorder: '#ffffff',
      legendColor: '#000000',
      gridLineWidth: 1
    }
  }
  return {
    tickColor: '#ffffff',
    gridColor: 'rgba(167, 211, 178, 0.55)',
    borderColor: 'rgba(167, 211, 178, 0.65)',
    doughnutBorder: 'rgba(236, 253, 245, 0.12)',
    legendColor: '#ffffff',
    gridLineWidth: 1.5
  }
}

const niceCeil = (value) => {
  const n = Number(value) || 0
  if (n <= 0) return 5
  const magnitude = Math.pow(10, Math.floor(Math.log10(n)))
  const normalized = n / magnitude
  if (normalized <= 1) return magnitude
  if (normalized <= 2) return 2 * magnitude
  if (normalized <= 5) return 5 * magnitude
  return 10 * magnitude
}

const buildChartScales = (axis, values, { currency = false, integerSteps = true } = {}) => {
  const maxValue = Math.max(...values.map((v) => Number(v) || 0), 0)
  const hasData = maxValue > 0
  const suggestedMax = hasData
    ? (currency ? niceCeil(maxValue * 1.12) : Math.max(Math.ceil(maxValue * 1.15), 5))
    : (currency ? 1000 : 5)

  const yTicks = {
    color: axis.tickColor,
    font: { size: 11, family: 'Inter, system-ui, sans-serif', weight: '600' }
  }

  if (currency) {
    yTicks.callback = (value) => '₱' + Number(value).toLocaleString()
  } else if (integerSteps) {
    yTicks.stepSize = suggestedMax <= 10 ? 1 : undefined
    yTicks.precision = 0
  }

  return {
    x: {
      grid: {
        display: true,
        color: axis.gridColor,
        lineWidth: axis.gridLineWidth || 1,
        drawOnChartArea: true
      },
      ticks: {
        color: axis.tickColor,
        font: { size: 10, family: 'Inter, system-ui, sans-serif', weight: '600' },
        maxRotation: 35
      },
      border: { color: axis.borderColor, width: 1.5 }
    },
    y: {
      beginAtZero: true,
      suggestedMax,
      grid: {
        display: true,
        color: axis.gridColor,
        lineWidth: axis.gridLineWidth || 1.5,
        drawOnChartArea: true
      },
      ticks: yTicks,
      border: { color: axis.borderColor, width: 1.5 }
    }
  }
}

const renderCharts = () => {
  renderStatusChart()
  if (isAdmin.value) renderBarangayChart()
  else if (isPresident.value) renderServicePlacesChart()
  renderFinancialChart()
}

watch(isLight, () => {
  nextTick(() => renderCharts())
})

watch(
  [
    filteredApprovedCount,
    filteredPendingCount,
    filteredRejectedCount,
    filteredTotalCount,
    farmerShares,
    farmerLoans,
    servicePlaces,
    servicePlaceChartData,
    barangayChartData,
    barangays,
    allOutstandingLoans
  ],
  () => nextTick(() => renderCharts()),
  { deep: true }
)

const renderStatusChart = () => {
  if (!statusChartRef.value) return
  if (statusChart) statusChart.destroy()

  const axis = getChartAxisStyle()
  const ctx = statusChartRef.value.getContext('2d')
  const approved = filteredApprovedCount.value
  const pending = filteredPendingCount.value
  const rejected = filteredRejectedCount.value
  const hasData = approved + pending + rejected > 0

  statusChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: hasData ? ['Approved', 'Pending', 'Rejected'] : ['No members yet'],
      datasets: [{
        data: hasData ? [approved, pending, rejected] : [1],
        backgroundColor: hasData ? ['#22c55e', '#facc15', '#fb7185'] : ['rgba(255,255,255,0.14)'],
        hoverBackgroundColor: hasData ? ['#16a34a', '#eab308', '#f43f5e'] : ['rgba(255,255,255,0.18)'],
        borderWidth: 3,
        borderColor: axis.doughnutBorder,
        hoverOffset: hasData ? 10 : 0,
        spacing: hasData ? 2 : 0
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      cutout: '68%',
      animation: {
        animateScale: true,
        animateRotate: true,
        duration: 1400,
        easing: 'easeOutCubic'
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.85)',
          padding: 12,
          titleFont: { size: 13, weight: '700', family: 'Inter, system-ui, sans-serif' },
          bodyFont: { size: 12, family: 'Inter, system-ui, sans-serif' },
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => ` ${ctx.label}: ${ctx.parsed} members`
          }
        }
      }
    }
  })
}

const buildBarangayGradient = (ctx, chartArea) => {
  if (!chartArea) return '#22c55e'
  const gradient = ctx.createLinearGradient(chartArea.left, 0, chartArea.right, 0)
  gradient.addColorStop(0, '#16a34a')
  gradient.addColorStop(0.45, '#4ade80')
  gradient.addColorStop(0.78, '#facc15')
  gradient.addColorStop(1, '#eab308')
  return gradient
}

// Admin: bar chart of approved members for each registered barangay
const renderBarangayChart = () => {
  if (!barangayChartRef.value) return
  if (barangayChart) barangayChart.destroy()

  const rows = barangayChartData.value
  const labels = rows.length ? rows.map((r) => r.name) : ['No barangays yet']
  const values = rows.length ? rows.map((r) => r.count) : [0]
  const axis = getChartAxisStyle()
  const ctx = barangayChartRef.value.getContext('2d')
  let gradientColor = null

  barangayChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Approved Members',
        data: values,
        backgroundColor: (context) => {
          const chart = context.chart
          const { ctx: c, chartArea } = chart
          if (!chartArea) return '#4ade80'
          if (!gradientColor) gradientColor = buildBarangayGradient(c, chartArea)
          return gradientColor
        },
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: rows.length <= 3 ? 0.55 : 0.72,
        categoryPercentage: rows.length <= 3 ? 0.72 : 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: rows.length <= 3 ? 1.35 : 1.6,
      animation: {
        duration: 1100,
        easing: 'easeOutQuart',
        onProgress: () => { gradientColor = null }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.85)',
          padding: 12,
          titleFont: { size: 13, weight: '700', family: 'Inter, system-ui, sans-serif' },
          bodyFont: { size: 12, family: 'Inter, system-ui, sans-serif' },
          cornerRadius: 10,
          callbacks: {
            label: (ctx) => {
              const row = rows[ctx.dataIndex]
              if (!row) return ` ${ctx.parsed.y} members`
              return ` ${row.count} members (${row.farmers} farmers, ${row.officers} officers)`
            }
          }
        }
      },
      scales: buildChartScales(axis, values, { integerSteps: true })
    }
  })
}

const renderServicePlacesChart = () => {
  if (!servicePlacesChartRef.value) return
  if (servicePlacesChart) servicePlacesChart.destroy()

  const axis = getChartAxisStyle()
  const ctx = servicePlacesChartRef.value.getContext('2d')
  const rows = servicePlaceChartData.value
  const labels = rows.length ? rows.map((r) => r.name) : ['No service places yet']
  const values = rows.length ? rows.map((r) => r.count) : [0]
  const barColors = rows.map((r) => (r.isActive ? '#4ade80' : '#94a3b8'))
  let gradientColor = null

  servicePlacesChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Approved Members',
        data: values,
        backgroundColor: (context) => {
          const idx = context.dataIndex
          if (rows[idx] && !rows[idx].isActive) return '#94a3b8'
          const chart = context.chart
          const { ctx: c, chartArea } = chart
          if (!chartArea) return barColors[idx] || '#4ade80'
          if (!gradientColor) gradientColor = buildBarangayGradient(c, chartArea)
          return gradientColor
        },
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: rows.length <= 3 ? 0.55 : 0.72,
        categoryPercentage: rows.length <= 3 ? 0.72 : 0.8
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: rows.length <= 3 ? 1.35 : 1.6,
      animation: {
        duration: 1100,
        easing: 'easeOutQuart',
        onProgress: () => { gradientColor = null }
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.85)',
          padding: 12,
          cornerRadius: 10,
          callbacks: {
            title: (items) => items[0]?.label || '',
            label: (ctx) => {
              const row = rows[ctx.dataIndex]
              const status = row?.isActive ? 'Active area' : 'Inactive area'
              return ` ${ctx.parsed.y} approved member${ctx.parsed.y === 1 ? '' : 's'} · ${status}`
            }
          }
        }
      },
      scales: buildChartScales(axis, values, { integerSteps: true })
    }
  })
}

const renderFinancialChart = () => {
  if (!financialChartRef.value) return
  if (financialChart) financialChart.destroy()

  const axis = getChartAxisStyle()
  const ctx = financialChartRef.value.getContext('2d')

  let labels = []
  let data = []
  let colors = []
  let datasetLabel = 'Amount (₱)'

  if (isAdmin.value) {
    // Admin: outstanding loans grouped by barangay
    const idToName = {}
    barangays.value.forEach(b => { idToName[b.id || b.barangay_id] = b.name || b.barangay_name || b.barangay })

    const totals = {}
    barangays.value.forEach(b => { totals[b.name || b.barangay_name || b.barangay] = 0 })

    allOutstandingLoans.value.forEach(loan => {
      const name = loan.barangay_name || idToName[loan.barangay_id] || idToName[loan.farmer_barangay] || 'Unassigned'
      totals[name] = (totals[name] || 0) + outstandingAmount(loan)
    })

    const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1])
    labels = sorted.map(([name]) => name)
    data = sorted.map(([, amount]) => amount)
    colors = sorted.map(() => '#60a5fa')
    datasetLabel = 'Outstanding Loans (₱)'
  } else {
    // Non-admin: Shares (from Share Capital) vs Outstanding Loans (from Loans)
    labels = ['My Shares', 'My Outstanding Loans']
    data = [farmerShares.value, farmerLoans.value]
    colors = ['#60a5fa', '#fb923c']
  }

  // Build per-bar gradient
  const makeVertGradient = (top, bottom) => {
    const height = ctx.canvas.height
    const grad = ctx.createLinearGradient(0, 0, 0, height)
    grad.addColorStop(0, top)
    grad.addColorStop(1, bottom)
    return grad
  }

  // Use gradient backgrounds for admin (single color set) or non-admin (two distinct colors)
  let backgroundColor
  if (!isAdmin.value) {
    backgroundColor = [
      makeVertGradient('#bfdbfe', '#1e40af'),
      makeVertGradient('#fed7aa', '#c2410c')
    ]
  } else {
    backgroundColor = colors
  }

  financialChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: datasetLabel,
        data,
        backgroundColor,
        borderRadius: 8,
        borderSkipped: false,
        barPercentage: 0.55
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: true,
      aspectRatio: 1.6,
      animation: {
        duration: 1300,
        easing: 'easeOutQuart',
        from: 0
      },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(15,23,42,0.85)',
          padding: 12,
          titleFont: { size: 13, weight: '700', family: 'Inter, system-ui, sans-serif' },
          bodyFont: { size: 12, family: 'Inter, system-ui, sans-serif' },
          cornerRadius: 10,
          callbacks: {
            label: (context) => ` ₱${Number(context.parsed.y).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }
        }
      },
      scales: buildChartScales(axis, data, { currency: true, integerSteps: false })
    }
  })
}

// Lifecycle
onMounted(async () => {
  if (!authStore.currentUser) {
    router.push('/login')
    return
  }

  loading.value = true

  // Common loaders for everyone
  const tasks = [
    loadAllFarmers(),
    loadBarangays()
  ]

  if (isAdmin.value) {
    // Admin needs aggregate loan data per barangay
    tasks.push(loadApprovedLoans(), loadActiveLoans(), loadOverdueLoans())
  } else {
    // Non-admin needs their service places and personal financial data
    tasks.push(loadServicePlaces(), loadFarmerFinancialData())
  }

  await Promise.all(tasks)

  loading.value = false

  animateOverviewCounters()
  updateTime()
  timeInterval = setInterval(updateTime, 1000)

  await nextTick()
  renderCharts()
})

onUnmounted(() => {
  if (timeInterval) clearInterval(timeInterval)
  if (statusChart) statusChart.destroy()
  if (barangayChart) barangayChart.destroy()
  if (servicePlacesChart) servicePlacesChart.destroy()
  if (financialChart) financialChart.destroy()
})
</script>

<style scoped>
/* =============================================
   DASHBOARD CONTAINER — Sunset → Green Canvas
   ============================================= */
.dashboard-container {
  min-height: 100vh;
  background: linear-gradient(145deg,
    #0f1712 0%,
    #132119 22%,
    #1a2b20 45%,
    #243b2c 72%,
    #2f4a38 100%);
  padding: 28px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
  /* Full-bleed: remove pale frame from AuthenticatedLayout .main-content padding */
  margin: -1.5rem -1.5rem -1.5rem -1.5rem;
  width: calc(100% + 3rem);
  max-width: none;
}

@media (max-width: 1024px) {
  .dashboard-container {
    margin: -1rem -1rem -1rem -1rem;
    width: calc(100% + 2rem);
  }
}

@media (min-width: 1400px) {
  .dashboard-container {
    margin: -2rem -2rem -2rem -2rem;
    width: calc(100% + 4rem);
  }
}

/* Ambient background layers */
.dashboard-bg-layer {
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 10% 90%, rgba(17, 94, 41, 0.18) 0%, transparent 60%),
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(234, 179, 8, 0.08) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.dashboard-bg-orbs {
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  overflow: hidden;
}
.dashboard-bg-orbs::before {
  content: '';
  position: absolute;
  width: 500px;
  height: 500px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(250,204,21,0.12) 0%, transparent 70%);
  top: -120px;
  right: -100px;
  animation: orb-drift 20s ease-in-out infinite alternate;
}
.dashboard-bg-orbs::after {
  content: '';
  position: absolute;
  width: 400px;
  height: 400px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(74,222,128,0.12) 0%, transparent 70%);
  bottom: -100px;
  left: -80px;
  animation: orb-drift 25s ease-in-out infinite alternate-reverse;
}

@keyframes orb-drift {
  from { transform: translate(0, 0) scale(1); }
  to   { transform: translate(30px, 20px) scale(1.08); }
}

/* =============================================
   DASHBOARD HEADER — Frosted Glass Panel
   ============================================= */
.dashboard-header {
  position: relative;
  z-index: 1;
  background: #1d2b21;
  border-radius: 24px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  padding: 32px 36px;
  box-shadow:
    16px 16px 30px rgba(8, 14, 10, 0.55),
    -14px -14px 28px rgba(42, 61, 46, 0.5),
    inset -1px -1px 0 rgba(0, 0, 0, 0.35);
  margin-bottom: 28px;
  animation: slideDown 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes slideDown {
  from { opacity: 0; transform: translateY(-22px); }
  to   { opacity: 1; transform: translateY(0); }
}

.header-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28px;
  padding-bottom: 22px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.header-left { flex: 1; }

.header-time-card {
  min-width: 190px;
  padding: 14px 16px;
  border-radius: 14px;
  background: linear-gradient(145deg, #f0fdf4 0%, #dcfce7 52%, #bbf7d0 100%);
  border: 2px solid #4ade80;
  box-shadow:
    0 10px 28px rgba(74, 222, 128, 0.28),
    0 0 0 1px rgba(134, 239, 172, 0.45),
    inset 0 1px 0 rgba(255, 255, 255, 0.85);
  display: flex;
  flex-direction: column;
  gap: 3px;
  align-items: flex-end;
}

.header-time-label {
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 1px;
  text-transform: uppercase;
  color: #166534;
}

.header-time-value {
  font-size: 26px;
  line-height: 1;
  font-weight: 800;
  color: #052e16;
  letter-spacing: 0.2px;
}

.header-time-date,
.header-time-day {
  font-size: 11px;
  font-weight: 700;
  color: #14532d;
}

.header-time-role {
  margin-top: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: capitalize;
  color: #052e16;
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  border: 1px solid #22c55e;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.15);
}

.header-time-role.admin {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  border-color: #f59e0b;
  color: #92400e;
  box-shadow: 0 4px 12px rgba(245, 158, 11, 0.22);
}

.header-time-role.president {
  background: linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%);
  border-color: #6366f1;
  color: #3730a3;
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.2);
}

.header-time-role.treasurer {
  background: linear-gradient(135deg, #fce7f3 0%, #fbcfe8 100%);
  border-color: #ec4899;
  color: #9d174d;
  box-shadow: 0 4px 12px rgba(236, 72, 153, 0.18);
}

.header-time-role.farmer {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  border-color: #3b82f6;
  color: #1e40af;
  box-shadow: 0 4px 12px rgba(59, 130, 246, 0.18);
}

.header-eyebrow {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.4px;
  color: rgba(220, 238, 211, 0.72);
  margin-bottom: 6px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.dashboard-title {
  font-size: 38px;
  font-weight: 900;
  color: #eefde6;
  margin: 0 0 8px 0;
  letter-spacing: -0.8px;
  line-height: 1.05;
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.dashboard-subtitle {
  font-size: 14px;
  color: rgba(220, 238, 211, 0.75);
  margin: 0;
  font-weight: 500;
  letter-spacing: 0.2px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

/* =============================================
   STATS OVERVIEW — Frosted Glass Cards
   ============================================= */
.stats-overview {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: 18px;
  animation: fadeIn 0.6s ease-out 0.1s backwards;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(12px); }
  to   { opacity: 1; transform: translateY(0); }
}

.stat-card {
  position: relative;
  background: #202f24;
  border-radius: 18px;
  padding: 20px 22px 18px;
  display: flex;
  align-items: center;
  gap: 16px;
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
  border: 1px solid rgba(255, 255, 255, 0.06);
  box-shadow:
    12px 12px 22px rgba(8, 13, 10, 0.5),
    -10px -10px 20px rgba(44, 63, 48, 0.48),
    inset -1px -1px 0 rgba(0, 0, 0, 0.35);
  overflow: hidden;
}

.stat-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: transparent;
  opacity: 0;
  transition: opacity 0.3s ease;
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-7px) scale(1.015);
  box-shadow:
    16px 16px 28px rgba(7, 12, 9, 0.58),
    -12px -12px 22px rgba(45, 66, 50, 0.56),
    inset -1px -1px 0 rgba(0, 0, 0, 0.4);
  border-color: rgba(255, 255, 255, 0.1);
  background: #223427;
}

.stat-card:hover::after { opacity: 1; }

.stat-green  { border-left: 3px solid #4ade80; }
.stat-teal   { border-left: 3px solid #2dd4bf; }
.stat-yellow { border-left: 3px solid #fbbf24; }
.stat-red    { border-left: 3px solid #f87171; }

.stat-icon-wrap {
  width: 56px;
  height: 56px;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  position: relative;
}

.stat-emoji {
  font-size: 26px;
  line-height: 1;
  filter: drop-shadow(0 1px 4px rgba(0,0,0,0.2));
}

.stat-icon-img {
  width: 34px;
  height: 34px;
  object-fit: contain;
  filter: drop-shadow(0 2px 6px rgba(0,0,0,0.35)) brightness(1.05);
}

.stat-icon-green  { background: linear-gradient(135deg, rgba(74,222,128,0.35) 0%, rgba(22,163,74,0.45) 100%); box-shadow: 0 4px 14px rgba(74,222,128,0.28); }
.stat-icon-teal   { background: linear-gradient(135deg, rgba(45,212,191,0.35) 0%, rgba(13,148,136,0.45) 100%); box-shadow: 0 4px 14px rgba(45,212,191,0.28); }
.stat-icon-yellow { background: linear-gradient(135deg, rgba(251,191,36,0.35) 0%, rgba(217,119,6,0.45) 100%); box-shadow: 0 4px 14px rgba(251,191,36,0.28); }
.stat-icon-red    { background: linear-gradient(135deg, rgba(248,113,113,0.35) 0%, rgba(220,38,38,0.45) 100%); box-shadow: 0 4px 14px rgba(248,113,113,0.28); }

.stat-body { flex: 1; min-width: 0; }

.stat-label {
  font-size: 10.5px;
  color: rgba(220, 238, 211, 0.7);
  margin-bottom: 4px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.stat-value {
  font-size: 32px;
  font-weight: 900;
  color: #f2ffe8;
  line-height: 1;
  letter-spacing: -0.5px;
  text-shadow: 0 2px 10px rgba(0,0,0,0.15);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  margin-bottom: 6px;
}

.stat-pill {
  display: inline-flex;
  align-items: center;
  font-size: 10px;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 20px;
  letter-spacing: 0.4px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  text-transform: uppercase;
}

.stat-pill-green  { background: rgba(74,222,128,0.22);  color: #bbf7d0; border: 1px solid rgba(74,222,128,0.35); }
.stat-pill-teal   { background: rgba(45,212,191,0.22);  color: #99f6e4; border: 1px solid rgba(45,212,191,0.35); }
.stat-pill-yellow { background: rgba(251,191,36,0.22);  color: #fef08a; border: 1px solid rgba(251,191,36,0.35); }
.stat-pill-red    { background: rgba(248,113,113,0.22); color: #fecaca; border: 1px solid rgba(248,113,113,0.35); }

.notification-badge {
  position: absolute;
  top: 10px;
  right: 10px;
  background: #ef4444;
  color: #fff;
  min-width: 22px;
  height: 22px;
  padding: 0 5px;
  border-radius: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 800;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  box-shadow: 0 2px 8px rgba(239,68,68,0.5);
  animation: pulse 2s ease-in-out infinite;
  border: 2px solid rgba(255,255,255,0.3);
}

@keyframes pulse {
  0%, 100% { transform: scale(1);    box-shadow: 0 2px 8px rgba(239,68,68,0.5); }
  50%       { transform: scale(1.12); box-shadow: 0 4px 14px rgba(239,68,68,0.7); }
}

/* =============================
   Analytics & Insights – Glassmorphism
   ============================= */
.analytics-section {
  position: relative;
  margin-bottom: 32px;
  border-radius: 24px;
  overflow: hidden;
  padding: 36px 32px 32px;
  background: linear-gradient(135deg, #17231b 0%, #1f3125 28%, #294032 58%, #345343 100%);
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.22);
  animation: fadeIn 0.7s ease-out 0.15s backwards;
}

.analytics-bg {
  position: absolute;
  inset: 0;
  background:
    url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='600' height='400'%3E%3Cellipse cx='120' cy='340' rx='180' ry='80' fill='%2316a34a' fill-opacity='.18'/%3E%3Cellipse cx='480' cy='60' rx='140' ry='60' fill='%23ea580c' fill-opacity='.15'/%3E%3Cellipse cx='300' cy='200' rx='260' ry='100' fill='%2386efac' fill-opacity='.10'/%3E%3C/svg%3E") center/cover no-repeat;
  backdrop-filter: blur(2px);
  pointer-events: none;
  z-index: 0;
}

.analytics-section > *:not(.analytics-bg) {
  position: relative;
  z-index: 1;
}

.analytics-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  margin-bottom: 24px;
  flex-wrap: wrap;
  gap: 12px;
}

.analytics-title-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.analytics-section-title {
  font-size: 26px;
  font-weight: 800;
  color: #fff;
  margin: 0;
  letter-spacing: -0.4px;
  text-shadow: 0 2px 12px rgba(0,0,0,0.18);
}

.analytics-section-sub {
  font-size: 14px;
  font-weight: 500;
  color: rgba(255,255,255,0.82);
  margin: 0;
}

/* Filter Toggle Button */
.filter-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 9px 18px;
  background: rgba(255,255,255,0.18);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1.5px solid rgba(255,255,255,0.35);
  border-radius: 30px;
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  cursor: pointer;
  transition: all 0.25s ease;
  box-shadow: 0 4px 14px rgba(0,0,0,0.12);
  position: relative;
  white-space: nowrap;
}

.filter-toggle-btn:hover,
.filter-toggle-btn.active {
  background: rgba(255,255,255,0.28);
  border-color: rgba(255,255,255,0.55);
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(0,0,0,0.16);
}

.filter-badge {
  background: #ef4444;
  color: #fff;
  font-size: 10px;
  font-weight: 800;
  min-width: 18px;
  height: 18px;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 4px;
  margin-left: 2px;
  box-shadow: 0 2px 6px rgba(239,68,68,0.4);
}

/* Filter Panel */
.filter-panel {
  background: #1f3024;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 20px 24px;
  margin-bottom: 24px;
  box-shadow:
    12px 12px 22px rgba(8, 13, 10, 0.52),
    -10px -10px 20px rgba(43, 62, 47, 0.5),
    inset -1px -1px 0 rgba(0, 0, 0, 0.36);
}

.filter-panel-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 16px;
  margin-bottom: 16px;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.filter-label {
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  color: rgba(220, 238, 211, 0.82);
}

.filter-select {
  background: #ffffff;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  color: #111111;
  font-size: 13px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  font-weight: 600;
  padding: 8px 12px;
  outline: none;
  transition: border-color 0.2s;
  box-shadow: inset 2px 2px 4px rgba(0,0,0,0.06), inset -2px -2px 4px rgba(255,255,255,0.8);
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  background-image: none;
}

.filter-select:focus {
  border-color: #7f9d81;
}

.filter-select option {
  background: #ffffff;
  color: #111111;
}

.filter-actions {
  display: flex;
  gap: 10px;
}

.filter-apply-btn {
  padding: 8px 20px;
  background: #ffffff;
  color: #111111;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 800;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: 0 4px 12px rgba(0,0,0,0.08);
}

.filter-apply-btn:hover {
  background: #f3f4f6;
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(0,0,0,0.12);
}

.filter-reset-btn {
  padding: 8px 20px;
  background: #f8fafc;
  color: #111111;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-size: 13px;
  font-weight: 700;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
}

.filter-reset-btn:hover {
  background: #2d4333;
  border-color: rgba(255,255,255,0.2);
}

.filter-slide-enter-active,
.filter-slide-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}
.filter-slide-enter-from,
.filter-slide-leave-to {
  opacity: 0;
  transform: translateY(-10px);
}

/* Glass Charts Grid */
.glass-charts-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  gap: 28px;
  animation: fadeIn 0.6s ease-out 0.2s backwards;
}

.glass-charts-grid--two {
  grid-template-columns: repeat(2, minmax(340px, 1fr));
}

@media (max-width: 900px) {
  .glass-charts-grid--two {
    grid-template-columns: 1fr;
  }
}

.glass-chart-card {
  background: #1f3024;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 20px;
  padding: 24px 24px 20px;
  box-shadow:
    14px 14px 26px rgba(8, 13, 10, 0.55),
    -12px -12px 24px rgba(43, 62, 47, 0.52),
    inset -1px -1px 0 rgba(0,0,0,0.36);
  transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.glass-chart-card:hover {
  transform: translateY(-6px);
  box-shadow:
    18px 18px 32px rgba(7, 12, 9, 0.6),
    -14px -14px 26px rgba(46, 66, 50, 0.58),
    inset -1px -1px 0 rgba(0,0,0,0.42);
  border-color: rgba(255,255,255,0.1);
  background: #23362a;
}

.glass-chart-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid rgba(255,255,255,0.1);
  gap: 8px;
}

.glass-chart-title {
  font-size: 16px;
  font-weight: 800;
  color: #ecfbe2;
  margin: 0 0 3px;
  letter-spacing: -0.2px;
  text-shadow: 0 1px 6px rgba(0,0,0,0.12);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.glass-chart-sub {
  font-size: 12px;
  font-weight: 500;
  color: rgba(236, 252, 231, 0.88);
  margin: 0;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.glass-chart-badge {
  background: rgba(255,255,255,0.22);
  color: #ecfbe2;
  padding: 5px 13px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  border: 1px solid rgba(255,255,255,0.28);
  white-space: nowrap;
  flex-shrink: 0;
}

.glass-chart-badge--finance {
  background: rgba(251,191,36,0.28);
  border-color: rgba(251,191,36,0.4);
  color: #fef9c3;
}

/* Sort Button */
.sort-toggle-btn {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 13px;
  background: rgba(255,255,255,0.18);
  border: 1.5px solid rgba(255,255,255,0.3);
  border-radius: 20px;
  color: #ecfbe2;
  font-size: 11px;
  font-weight: 700;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  cursor: pointer;
  transition: all 0.2s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.sort-toggle-btn:hover {
  background: rgba(255,255,255,0.28);
  border-color: rgba(255,255,255,0.5);
  transform: translateY(-1px);
}

/* Donut Center Label */
.donut-wrap {
  position: relative;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 14px;
  min-height: 220px;
  width: 100%;
}

.donut-canvas {
  width: min(100%, 260px) !important;
  max-height: 240px;
  min-height: 200px;
}

.glass-chart-card > canvas {
  width: 100% !important;
  min-height: 220px;
  max-height: 260px;
}

.donut-center-label {
  position: absolute;
  display: flex;
  flex-direction: column;
  align-items: center;
  pointer-events: none;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.donut-center-num {
  font-size: 28px;
  font-weight: 900;
  color: #ecfbe2;
  line-height: 1;
  text-shadow: 0 2px 8px rgba(0,0,0,0.18);
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.donut-center-text {
  font-size: 11px;
  font-weight: 600;
  color: rgba(220, 238, 211, 0.72);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  margin-top: 2px;
}

/* Legend */
.glass-legend {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  justify-content: center;
}

.gl-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  font-weight: 600;
  color: #eaf9e0;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  flex-wrap: wrap;
}

.gl-meta {
  font-size: 10px;
  font-weight: 500;
  color: rgba(220, 238, 211, 0.68);
}

.gl-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 6px rgba(255,255,255,0.3);
}

canvas {
  max-height: 260px;
}

/* Responsive */
@media (max-width: 768px) {
  .dashboard-container {
    padding: 16px;
    margin: -0.75rem -0.75rem -0.75rem -0.75rem;
    width: calc(100% + 1.5rem);
  }
  .dashboard-header { padding: 22px 20px; border-radius: 18px; }
  .header-top { flex-direction: column; align-items: flex-start; gap: 8px; }
  .header-time-card { width: 100%; align-items: flex-start; }
  .dashboard-title { font-size: 28px; }
  .stats-overview { grid-template-columns: repeat(2, 1fr); gap: 12px; }
  .glass-charts-grid { grid-template-columns: 1fr; gap: 18px; }
  .analytics-section { padding: 24px 18px 20px; border-radius: 18px; }
  .filter-panel-grid { grid-template-columns: 1fr 1fr; }
}

@media (max-width: 480px) {
  .dashboard-container {
    margin: -0.5rem -0.5rem -0.5rem -0.5rem;
    width: calc(100% + 1rem);
  }
  .stats-overview { grid-template-columns: 1fr; }
  .dashboard-title { font-size: 22px; }
  .filter-panel-grid { grid-template-columns: 1fr; }
}

/* =============================================
   LIGHT MODE — Senior-friendly (warm, bright, readable)
   ============================================= */
.dashboard-container.light-theme {
  background: linear-gradient(155deg, #d8f3de 0%, #bfeccc 42%, #a8e4b8 100%);
}

.dashboard-container.light-theme .dashboard-bg-layer,
.dashboard-container.light-theme .dashboard-bg-orbs {
  opacity: 0.35;
}

.dashboard-container.light-theme .dashboard-header {
  background: linear-gradient(135deg, #ffffff 0%, #f4fdf7 100%);
  border: 2px solid #86efac;
  box-shadow: 0 10px 30px rgba(22, 101, 52, 0.12);
}

.dashboard-container.light-theme .header-top {
  border-bottom-color: rgba(22, 101, 52, 0.16);
}

.dashboard-container.light-theme .header-eyebrow {
  color: #166534;
  font-size: 12px;
}

.dashboard-container.light-theme .dashboard-title {
  color: #052e16;
  font-size: 40px;
  text-shadow: none;
}

.dashboard-container.light-theme .dashboard-subtitle {
  color: #14532d;
  font-size: 15px;
}

.dashboard-container.light-theme .header-time-card {
  background: #ecfdf5;
  border: 2px solid #86efac;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.1);
}

.dashboard-container.light-theme .header-time-label,
.dashboard-container.light-theme .header-time-date,
.dashboard-container.light-theme .header-time-day {
  color: #14532d;
  font-size: 12px;
}

.dashboard-container.light-theme .header-time-value {
  color: #065f46;
  font-size: 26px;
}

.dashboard-container.light-theme .header-time-role {
  color: #052e16;
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  border-color: #4ade80;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.12);
}

.dashboard-container.light-theme .stat-card {
  background: #fffef9;
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.dashboard-container.light-theme .stat-card:hover {
  background: #ffffff;
  border-color: #4ade80;
  box-shadow: 0 12px 28px rgba(22, 101, 52, 0.14);
}

.dashboard-container.light-theme .stat-label {
  color: #166534;
  font-size: 12px;
}

.dashboard-container.light-theme .stat-value {
  color: #052e16;
  font-size: 34px;
  text-shadow: none;
}

.dashboard-container.light-theme .stat-pill-green {
  background: #dcfce7;
  color: #166534;
  border-color: #4ade80;
}

.dashboard-container.light-theme .stat-pill-teal {
  background: #ccfbf1;
  color: #0f766e;
  border-color: #2dd4bf;
}

.dashboard-container.light-theme .stat-pill-yellow {
  background: #fef9c3;
  color: #a16207;
  border-color: #fbbf24;
}

.dashboard-container.light-theme .analytics-section {
  background: linear-gradient(135deg, #e8f9ed 0%, #d1f5dc 50%, #bbf7d0 100%);
  border: 2px solid #86efac;
  box-shadow: 0 12px 36px rgba(22, 101, 52, 0.1);
}

.dashboard-container.light-theme .analytics-section-title {
  color: #052e16;
  font-size: 28px;
  text-shadow: none;
}

.dashboard-container.light-theme .analytics-section-sub {
  color: #14532d;
  font-size: 15px;
}

.dashboard-container.light-theme .filter-toggle-btn {
  background: #ffffff;
  color: #14532d;
  border: 2px solid #4ade80;
  font-size: 14px;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08);
}

.dashboard-container.light-theme .filter-toggle-btn:hover,
.dashboard-container.light-theme .filter-toggle-btn.active {
  background: #f0fdf4;
  border-color: #22c55e;
  color: #052e16;
}

.dashboard-container.light-theme .filter-panel {
  background: #fffef9;
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.08);
}

.dashboard-container.light-theme .filter-label {
  color: #14532d;
  font-size: 12px;
}

.dashboard-container.light-theme .glass-chart-card {
  background: #fffef9;
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.08);
}

.dashboard-container.light-theme .glass-chart-card:hover {
  background: #ffffff;
  border-color: #4ade80;
  box-shadow: 0 12px 28px rgba(22, 101, 52, 0.12);
}

.dashboard-container.light-theme .glass-chart-header {
  border-bottom-color: rgba(22, 101, 52, 0.14);
}

.dashboard-container.light-theme .glass-chart-title {
  color: #052e16;
  font-size: 17px;
  text-shadow: none;
}

.dashboard-container.light-theme .glass-chart-sub {
  color: #166534;
  font-size: 13px;
}

.dashboard-container.light-theme .glass-chart-badge {
  background: #dcfce7;
  color: #14532d;
  border-color: #86efac;
}

.dashboard-container.light-theme .glass-chart-badge--finance {
  background: #fef9c3;
  color: #a16207;
  border-color: #fbbf24;
}

.dashboard-container.light-theme .sort-toggle-btn {
  background: #ffffff;
  color: #14532d;
  border: 2px solid #86efac;
}

.dashboard-container.light-theme .donut-center-num {
  color: #052e16;
  text-shadow: none;
  font-size: 30px;
}

.dashboard-container.light-theme .donut-center-text {
  color: #166534;
  font-size: 12px;
}

.dashboard-container.light-theme .gl-item {
  color: #14532d;
  font-size: 13px;
}

.dashboard-container.light-theme .gl-item strong {
  color: #052e16;
}

.dashboard-container.light-theme .gl-meta {
  color: #166534;
}

.dashboard-container.light-theme .gl-dot {
  box-shadow: 0 0 4px rgba(22, 101, 52, 0.2);
}
</style>
