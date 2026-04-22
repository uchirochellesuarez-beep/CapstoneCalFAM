<template>
  <div class="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 p-4 lg:p-6">
    <DashboardHeader :user="authStore.currentUser" />
    <div class="max-w-6xl mx-auto">
      <div class="flex items-center justify-between gap-3 mb-6">
        <div>
          <h1 class="text-3xl font-bold text-green-900">Members Summary</h1>
          <p class="text-sm text-green-600">Search a farmer first, then view the full summary.</p>
        </div>
        <button
          v-if="selectedFarmer"
          type="button"
          @click="resetSelection"
          class="px-4 py-2 rounded-lg bg-white border border-green-300 hover:bg-green-50 font-semibold text-green-700 transition shadow-sm"
        >
          ← Back to Search
        </button>
      </div>

      <div v-if="pageError" class="mb-4 p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
        {{ pageError }}
      </div>

      <!-- SEARCH-FIRST -->
      <div v-if="!selectedFarmer" class="bg-white rounded-2xl shadow-lg border border-green-100 p-6">
        <label class="block text-sm font-semibold text-green-800 mb-2">Search farmer (name or reference #)</label>
        <input
          v-model="query"
          type="text"
          class="w-full px-4 py-3 border border-green-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-green-300 focus:border-green-400 bg-green-50/30"
          placeholder="Type a name or reference number…"
        />

        <div class="mt-4">
          <div v-if="!query.trim()" class="p-6 text-center text-sm text-green-600 border border-green-100 rounded-lg bg-green-50/50">
            Start typing to search.
          </div>

          <div v-else class="border border-green-200 rounded-lg overflow-hidden">
            <div class="max-h-[520px] overflow-y-auto">
              <button
                v-for="f in filteredFarmers"
                :key="f.id"
                @click="selectFarmer(f)"
                type="button"
                class="w-full text-left px-4 py-3 border-b border-green-100 last:border-b-0 hover:bg-green-50 flex items-center justify-between gap-3 transition"
              >
                <div class="min-w-0">
                  <div class="font-semibold text-green-900 truncate">{{ f.full_name }}</div>
                  <div class="text-xs text-green-600 truncate">
                    {{ f.reference_number }} • {{ f.barangay_name || ('Barangay #' + (f.barangay_id ?? 'N/A')) }}
                  </div>
                </div>
                <div
                  class="text-xs font-semibold px-2 py-1 rounded-full"
                  :class="f.membership_status === 'non-member' ? 'bg-gray-100 text-gray-700' : 'bg-green-100 text-green-800'"
                >
                  {{ f.membership_status || 'member' }}
                </div>
              </button>

              <div v-if="filteredFarmers.length === 0" class="p-6 text-center text-sm text-green-600">
                No matches.
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- SINGLE-FARMER SUMMARY -->
      <div v-else class="bg-white rounded-2xl shadow-lg border border-green-100 overflow-hidden">
        <!-- Professional Header with Profile -->
        <div class="px-8 py-8 bg-gradient-to-r from-green-600 via-emerald-600 to-teal-600 border-b">
          <div class="flex flex-col md:flex-row items-start md:items-center gap-8">
            <!-- Profile Picture Section -->
            <div class="flex-shrink-0">
              <img 
                v-if="getProfilePictureUrl(selectedFarmer.profile_picture)" 
                :src="getProfilePictureUrl(selectedFarmer.profile_picture)" 
                alt="Profile" 
                class="w-28 h-28 rounded-full object-cover border-4 border-white/90 shadow-xl"
              />
              <div v-else class="w-28 h-28 rounded-full bg-white/20 backdrop-blur flex items-center justify-center text-4xl border-4 border-white/50 shadow-xl">
                👤
              </div>
            </div>

            <!-- Profile Info Section -->
            <div class="flex-grow">
              <h2 class="text-3xl font-bold text-white mb-4">{{ selectedFarmer.full_name }}</h2>
              
              <div class="grid grid-cols-2 md:grid-cols-4 gap-3 mb-5">
                <div class="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
                  <p class="text-xs font-medium text-green-100 uppercase tracking-wider mb-1">Reference #</p>
                  <p class="text-base font-bold text-white">{{ selectedFarmer.reference_number }}</p>
                </div>
                <div class="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
                  <p class="text-xs font-medium text-green-100 uppercase tracking-wider mb-1">Role</p>
                  <p class="text-base font-bold text-white capitalize">{{ selectedFarmer.role }}</p>
                </div>
                <div class="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
                  <p class="text-xs font-medium text-green-100 uppercase tracking-wider mb-1">Status</p>
                  <p class="text-base font-bold" :class="selectedFarmer.status === 'approved' ? 'text-emerald-200' : 'text-yellow-200'">
                    {{ selectedFarmer.status }}
                  </p>
                </div>
                <div class="bg-white/15 backdrop-blur rounded-lg p-3 border border-white/20">
                  <p class="text-xs font-medium text-green-100 uppercase tracking-wider mb-1">Membership</p>
                  <p class="text-base font-bold text-white">{{ selectedFarmer.membership_status || 'member' }}</p>
                </div>
              </div>

              <button
                type="button"
                @click="refreshSummary"
                class="px-5 py-2 rounded-lg bg-white/20 backdrop-blur border border-white/30 hover:bg-white/30 text-sm font-semibold text-white transition"
                :disabled="loading"
              >
                {{ loading ? '⏳ Loading…' : '🔄 Refresh Data' }}
              </button>
            </div>
          </div>
        </div>

        <div class="p-8 space-y-8">
          <div v-if="summaryError" class="p-4 rounded-lg bg-red-50 border border-red-200 text-sm text-red-700">
            {{ summaryError }}
          </div>

          <!-- Personal Information Button -->
          <div>
            <button
              @click="showPersonalInfoModal = true"
              class="px-6 py-3 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow-md hover:shadow-lg flex items-center gap-2"
            >
              <span class="text-lg">📋</span>
              <span>View Personal Information</span>
            </button>
          </div>

          <!-- Financial Summary -->
          <div class="border-t border-green-100 pt-8">
            <h3 class="text-xl font-bold text-green-900 mb-6 flex items-center gap-2">
              <span class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">💰</span>
              <span>Financial Summary</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div class="p-6 rounded-xl border-2 border-teal-200 bg-gradient-to-br from-teal-50 to-cyan-50 hover:shadow-md transition">
                <div class="text-sm font-semibold text-teal-700 uppercase tracking-wide mb-3">Loan Balance</div>
                <div class="text-3xl font-bold text-teal-900 mb-2">₱{{ formatNumber(summary?.loans?.total_remaining_balance || 0) }}</div>
                <div class="text-sm text-teal-600">Active/Overdue loans: <span class="font-semibold">{{ summary?.loans?.active_count || 0 }}</span></div>
              </div>
              <div class="p-6 rounded-xl border-2 border-amber-200 bg-gradient-to-br from-amber-50 to-orange-50 hover:shadow-md transition">
                <div class="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-3">Machinery Outstanding</div>
                <div class="text-3xl font-bold text-amber-900 mb-2">₱{{ formatNumber(summary?.machinery?.outstanding_balance || 0) }}</div>
                <div class="text-sm text-amber-600">Unpaid bookings: <span class="font-semibold">{{ summary?.machinery?.unpaid_count || 0 }}</span></div>
              </div>
            </div>
          </div>

          <!-- Share Capital -->
          <div class="border-t border-green-100 pt-8">
            <h3 class="text-xl font-bold text-green-900 mb-6 flex items-center gap-2">
              <span class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">📊</span>
              <span>Share Capital</span>
            </h3>
            <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div class="p-6 rounded-xl border-2 border-emerald-200 bg-gradient-to-br from-emerald-50 to-green-50 hover:shadow-md transition">
                <div class="text-sm font-semibold text-emerald-700 uppercase tracking-wide mb-3">Contributed</div>
                <div class="text-3xl font-bold text-emerald-900">₱{{ formatNumber(summary?.shareCapital?.totals?.total_contributed || 0) }}</div>
              </div>
              <div class="p-6 rounded-xl border-2 border-rose-200 bg-gradient-to-br from-rose-50 to-red-50 hover:shadow-md transition">
                <div class="text-sm font-semibold text-rose-700 uppercase tracking-wide mb-3">Withdrawn</div>
                <div class="text-3xl font-bold text-rose-900">₱{{ formatNumber(summary?.shareCapital?.totals?.total_withdrawn || 0) }}</div>
              </div>
              <div class="p-6 rounded-xl border-2 border-green-300 bg-gradient-to-br from-green-100 to-emerald-100 hover:shadow-md transition">
                <div class="text-sm font-semibold text-green-700 uppercase tracking-wide mb-3">Balance</div>
                <div class="text-3xl font-bold text-green-900">₱{{ formatNumber(summary?.shareCapital?.totals?.balance || 0) }}</div>
              </div>
            </div>
          </div>

          <!-- Tulong na Natanggap -->
          <div class="border-t border-green-100 pt-8">
            <h3 class="text-xl font-bold text-green-900 mb-6 flex items-center gap-2">
              <span class="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center text-xl">🤝</span>
              <span>Tulong na Natanggap</span>
            </h3>
            <div class="p-6 rounded-xl border border-green-200 bg-gradient-to-br from-green-50/50 to-white">
              <div class="mb-4 text-sm font-semibold text-green-800">
                Total records: <span class="text-green-600 text-lg">{{ summary?.assistance?.count || 0 }}</span>
              </div>

              <div v-if="(summary?.assistance?.items || []).length" class="max-h-[500px] overflow-y-auto">
                <div class="space-y-3">
                  <div
                    v-for="a in summary.assistance.items"
                    :key="a.id"
                    class="p-4 rounded-lg border border-green-200 bg-white hover:bg-green-50 hover:shadow-sm transition"
                  >
                    <div class="flex items-center justify-between gap-3 mb-2">
                      <div class="font-semibold text-green-900 capitalize">{{ a.assistance_type }}</div>
                      <span class="text-xs px-3 py-1 rounded-full font-medium whitespace-nowrap" :class="a.status === 'Confirmed Received' || a.status === 'confirmed_received' ? 'bg-emerald-100 text-emerald-800' : 'bg-teal-100 text-teal-800'">
                        {{ a.status === 'Confirmed Received' || a.status === 'confirmed_received' ? 'Confirmed' : 'Distributed' }}
                      </span>
                    </div>
                    <div class="text-sm text-green-700">
                      Qty: <span class="font-semibold">{{ a.quantity }} {{ a.unit || '' }}</span> • {{ formatDateTime(a.created_at) }}
                    </div>
                  </div>
                </div>
              </div>
              <div v-else class="text-center py-8 text-green-600">
                <div class="text-4xl mb-2">📭</div>
                <div class="text-sm">No assistance records received yet.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Personal Information Modal -->
  <div 
    v-if="showPersonalInfoModal"
    class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    @click="showPersonalInfoModal = false"
  >
    <div 
      class="bg-white rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto"
      @click.stop
    >
      <!-- Modal Header -->
      <div class="sticky top-0 px-8 py-6 border-b border-green-100 flex items-center justify-between bg-gradient-to-r from-green-600 to-emerald-600">
        <h2 class="text-2xl font-bold text-white flex items-center gap-3">
          <span class="text-3xl">📋</span>
          <span>Personal Information</span>
        </h2>
        <button
          @click="showPersonalInfoModal = false"
          class="text-white/80 hover:text-white transition text-2xl w-10 h-10 rounded-full hover:bg-white/20 flex items-center justify-center"
        >
          ✕
        </button>
      </div>

      <!-- Modal Content -->
      <div class="p-8 space-y-6">
        <!-- Profile Picture Section -->
        <div class="flex justify-center">
          <img 
            v-if="getProfilePictureUrl(selectedFarmer.profile_picture)" 
            :src="getProfilePictureUrl(selectedFarmer.profile_picture)" 
            alt="Profile" 
            class="w-32 h-32 rounded-full object-cover border-4 border-green-400 shadow-lg"
          />
          <div v-else class="w-32 h-32 rounded-full bg-green-100 border-4 border-green-300 flex items-center justify-center text-green-400 text-4xl">
            👤
          </div>
        </div>

        <!-- Farmer Name -->
        <div class="text-center pb-4 border-b border-green-100">
          <h3 class="text-2xl font-bold text-green-900">{{ selectedFarmer.full_name }}</h3>
        </div>

        <!-- Information Grid -->
        <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
          <!-- Reference Number -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Reference Number</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.reference_number || 'N/A' }}</div>
          </div>

          <!-- Date of Birth -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Date of Birth</div>
            <div class="text-lg font-semibold text-green-900">{{ formatDate(selectedFarmer.date_of_birth) }}</div>
          </div>

          <!-- Phone Number -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Phone Number</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.phone_number || 'N/A' }}</div>
          </div>

          <!-- Address -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Address</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.address || 'N/A' }}</div>
          </div>

          <!-- Educational Status -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Educational Status</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.educational_status || 'N/A' }}</div>
          </div>

          <!-- Role -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Role</div>
            <div class="text-lg font-semibold text-green-900 capitalize">{{ selectedFarmer.role || 'N/A' }}</div>
          </div>

          <!-- Membership Status -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Membership Status</div>
            <div class="text-lg font-semibold text-green-900 capitalize">{{ selectedFarmer.membership_status || 'N/A' }}</div>
          </div>

          <!-- Membership Type -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Membership Type</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.membership_type || 'N/A' }}</div>
          </div>

          <!-- Primary Crop -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Primary Crop</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.primary_crop || 'N/A' }}</div>
          </div>

          <!-- Land Area -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Land Area</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.land_area ? selectedFarmer.land_area + ' sq.m' : 'N/A' }}</div>
          </div>

          <!-- Farm Location -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Farm Location</div>
            <div class="text-lg font-semibold text-green-900">{{ selectedFarmer.farm_location || 'N/A' }}</div>
          </div>

          <!-- Registered On -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Registered On</div>
            <div class="text-lg font-semibold text-green-900">{{ formatDate(selectedFarmer.registered_on) }}</div>
          </div>

          <!-- Last Activity -->
          <div class="p-4 rounded-xl bg-gradient-to-br from-green-50 to-emerald-50 border border-green-200">
            <div class="text-xs font-semibold text-green-600 uppercase tracking-wide mb-1">Last Activity</div>
            <div class="text-lg font-semibold text-green-900">{{ formatDateTime(selectedFarmer.last_activity) || 'N/A' }}</div>
          </div>
        </div>
      </div>

      <!-- Modal Footer -->
      <div class="sticky bottom-0 px-8 py-6 border-t border-green-100 bg-gradient-to-r from-green-50 to-emerald-50 flex justify-end">
        <button
          @click="showPersonalInfoModal = false"
          class="px-6 py-2.5 rounded-lg bg-green-600 hover:bg-green-700 text-white font-semibold transition shadow-md"
        >
          Close
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue'
import { useRouter } from 'vue-router'
import DashboardHeader from '../components/DashboardHeader.vue'
import { useAuthStore } from '../stores/authStore'

const router = useRouter()
const authStore = useAuthStore()

const pageError = ref('')
const farmers = ref([])

const query = ref('')
const selectedFarmer = ref(null)

const loading = ref(false)
const summaryError = ref('')
const summary = ref(null)
const showPersonalInfoModal = ref(false)

// Helper function to get correct profile picture URL
// Handles both external Google URLs and local uploaded pictures
const getProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return null
  // Check if it's already a full URL (Google profile pictures start with https://)
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture
  }
  // Otherwise, prepend localhost for uploaded pictures
  return `http://localhost:3000${profilePicture}`
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
      fetchJson(`/api/loans/farmer/${farmerId}?deviceDate=${new Date().getFullYear() + '-' + String(new Date().getMonth() + 1).padStart(2, '0') + '-' + String(new Date().getDate()).padStart(2, '0')}`),
      fetchJson(`/api/machinery/bookings/farmer-balance/${farmerId}`)
    ])

    const loansList = loansRaw?.loans || []
    const unpaidBookings = machineryBalanceRaw?.unpaid_bookings || []

    summary.value = {
      assistance: {
        count: Array.isArray(assistanceRaw) ? assistanceRaw.length : 0,
        items: Array.isArray(assistanceRaw) ? assistanceRaw : []
      },
      shareCapital: shareCapitalRaw || null,
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
  // Fetch complete farmer profile to get all fields including primary_crop, membership_type, last_activity
  try {
    const fullProfile = await fetchJson(`/api/farmers/${f.id}/profile`)
    if (fullProfile) {
      selectedFarmer.value = { ...selectedFarmer.value, ...fullProfile }
    }
  } catch (e) {
    console.error('Could not fetch full profile:', e.message)
    // Continue with partial data if full profile fetch fails
  }
  await refreshSummary()
}

const resetSelection = () => {
  selectedFarmer.value = null
  summary.value = null
  summaryError.value = ''
}

const formatNumber = (num) => new Intl.NumberFormat('en-PH').format(num || 0)
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
