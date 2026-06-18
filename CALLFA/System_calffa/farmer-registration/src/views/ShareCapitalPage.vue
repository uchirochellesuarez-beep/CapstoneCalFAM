<template>
  <div class="financial-container glass-module-page share-capital-page" :class="{ 'light-theme': isLight }">
    <div class="page-header">
      <div class="header-content">
        <h1>Share Capital</h1>
        <p class="page-subtitle hero-subtitle">
          ₱100 every 6 months (₱200/year) • Members only • Barangay-based visibility
        </p>
      </div>
    </div>

    <div v-if="!isAllowedRole" class="tab-content">
      <div class="empty-state">
        <div class="empty-title">Access limited</div>
        <div class="empty-text">This module is available to Members, Treasurers, Presidents, and Admins.</div>
      </div>
    </div>

    <div v-else class="tab-content tab-content--main">
      <div v-if="setupError" class="info-banner info-banner--error">
        <strong>Setup required:</strong> {{ setupError }}
        <div v-if="setupError.includes('tables not found')" class="error-hint">
          <strong>Fix needed:</strong> Run the database migration by opening a terminal and executing:
          <div class="code-block">
            mysql -u root -p calffa &lt; backend/migrations/create_share_capital_module.sql
          </div>
          Then restart the backend server. See SHARE_CAPITAL_SETUP.md for details.
        </div>
      </div>

      <!-- Farmer view -->
      <div v-if="isFarmer">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Shares Contributed</div>
            <div class="stat-value">₱{{ meTotals.total_contributed.toLocaleString() }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Withdrawn</div>
            <div class="stat-value">₱{{ meTotals.total_withdrawn.toLocaleString() }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Current Total Balance</div>
            <div class="stat-value">₱{{ meTotals.balance.toLocaleString() }}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Payment History</h2>
              <button type="button" class="btn btn-primary-action" @click="loadMe" :disabled="loading">Refresh</button>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Amount</th>
                    <th>Status</th>
                    <th>Receipt No.</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="6">Loading...</td>
                  </tr>
                  <tr v-else-if="meContributions.length === 0">
                    <td colspan="6">No contributions recorded</td>
                  </tr>
                  <tr v-else v-for="c in meContributions" :key="c.id">
                    <td>{{ formatDate(c.contribution_date) }}</td>
                    <td>{{ formatContributionKind(c.contribution_kind) }}</td>
                    <td class="amount">₱{{ formatMoney(c.amount) }}</td>
                    <td>
                      <span class="badge" :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'">{{ c.status }}</span>
                    </td>
                    <td>{{ c.receipt_number || '—' }}</td>
                    <td class="actions">
                      <button
                        v-if="c.receipt_number"
                        type="button"
                        class="btn-link-inline"
                        @click="printContributionReceipt(c.receipt_number)"
                      >Print</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Withdrawals</h2>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Remarks</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="3">Loading...</td>
                  </tr>
                  <tr v-else-if="meWithdrawals.length === 0">
                    <td colspan="3">No withdrawals</td>
                  </tr>
                  <tr v-else v-for="w in meWithdrawals" :key="w.id">
                    <td>{{ formatDate(w.withdrawal_date) }}</td>
                    <td class="amount">₱{{ formatMoney(w.amount) }}</td>
                    <td>{{ w.remarks || '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      <!-- Treasurer / President / Admin view -->
      <div v-else-if="isOfficerView">
        <div v-if="isAdmin" class="admin-filter-bar">
          <label for="share-capital-barangay" class="admin-filter-label">Barangay</label>
          <select
            id="share-capital-barangay"
            v-model="selectedBarangayId"
            class="input admin-filter-select"
            @change="onBarangayChange"
          >
            <option value="">Select barangay...</option>
            <option v-for="b in barangayOptions" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
          </select>
          <span v-if="selectedBarangayName" class="admin-filter-hint">Viewing: {{ selectedBarangayName }}</span>
        </div>

        <div v-if="isAdmin && !selectedBarangayId" class="empty-state empty-state--panel">
          <div class="empty-title">Select a barangay</div>
          <div class="empty-text">Choose a barangay above to view share capital records for that area.</div>
        </div>

        <template v-else>
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Members</div>
            <div class="stat-value">{{ overviewTotals.total_farmers.toLocaleString() }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Shares Collected</div>
            <div class="stat-value">₱{{ overviewTotals.total_collected.toLocaleString() }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Withdrawn</div>
            <div class="stat-value">₱{{ overviewTotals.total_withdrawn.toLocaleString() }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Balance</div>
            <div class="stat-value">₱{{ overviewTotals.total_balance.toLocaleString() }}</div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">{{ membersPanelTitle }}</h2>
              <button type="button" class="btn btn-primary-action" @click="loadOverview" :disabled="loading">
                Refresh
              </button>
            </div>
            
            <!-- Filter Input -->
            <div class="filter-section">
              <input
                v-model="searchQuery"
                type="text"
                placeholder="Search by reference number or member name..."
                class="input filter-input"
              />
            </div>

            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ref No.</th>
                    <th>Member</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Balance</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="6">Loading...</td>
                  </tr>
                  <tr v-else-if="farmers.length === 0">
                    <td colspan="6">No members found for your barangay</td>
                  </tr>
                  <tr v-else-if="filteredFarmers.length === 0">
                    <td colspan="6">No members match the search criteria</td>
                  </tr>
                  <tr
                    v-else
                    v-for="f in filteredFarmers"
                    :key="f.id"
                    :class="{ selected: selectedFarmer?.id === f.id }"
                    @click="selectFarmer(f)"
                  >
                    <td>{{ f.reference_number || '—' }}</td>
                    <td class="name">{{ f.full_name }}</td>
                    <td>
                      <span class="badge" :class="String(f.status).toLowerCase() === 'inactive' ? 'badge-muted' : 'badge-success'">{{ f.status || 'approved' }}</span>
                    </td>
                    <td class="amount">₱{{ formatMoney(f.total_contributed) }}</td>
                    <td class="amount">₱{{ formatMoney(f.balance) }}</td>
                    <td class="actions" @click.stop>
                      <button class="btn btn-small" @click="selectFarmer(f)">View</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Member Shares</h2>
            </div>

            <div v-if="!selectedFarmer" class="empty-state">
              <div class="empty-title">Select a member</div>
              <div class="empty-text">Choose a member from the list to view share capital records.</div>
            </div>

            <div v-else class="card-body">
              <div class="farmer-summary">
                <div class="farmer-name">{{ selectedFarmer.full_name }}</div>
                <div class="farmer-meta">Ref: {{ selectedFarmer.reference_number || '—' }}</div>
              </div>

              <div class="stats-grid compact">
                <div class="stat-card">
                  <div class="stat-label">Total Contributed</div>
                  <div class="stat-value">₱{{ selectedTotals.total_contributed.toLocaleString() }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Total Withdrawn</div>
                  <div class="stat-value">₱{{ selectedTotals.total_withdrawn.toLocaleString() }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Balance</div>
                  <div class="stat-value">₱{{ selectedTotals.balance.toLocaleString() }}</div>
                </div>
              </div>

              <!-- Treasurer actions -->
              <div v-if="canEdit" class="action-row payment-collection-panel">
                <div class="form-inline payment-form-grid">
                  <label class="inline-label">Contribution Date</label>
                  <input class="input" type="date" v-model="newContributionDate" />
                  <label class="inline-label">Payment Method</label>
                  <select class="input" v-model="newContributionMethod">
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                  </select>
                  <label class="inline-label">6-Month Share</label>
                  <input class="input" type="number" :value="100" disabled />
                  <button class="btn" @click="recordContribution" :disabled="loading">Record &amp; Print Receipt</button>
                </div>

                <button class="btn btn-danger" @click="processWithdrawal" :disabled="loading || selectedTotals.balance <= 0">
                  Withdraw / Exit
                </button>
              </div>

              <div class="section-title">Contributions</div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Type</th>
                      <th>Amount</th>
                      <th>Status</th>
                      <th>Receipt No.</th>
                      <th></th>
                      <th v-if="canEdit">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loadingFarmer">
                      <td :colspan="canEdit ? 7 : 6">Loading...</td>
                    </tr>
                    <tr v-else-if="selectedContributions.length === 0">
                      <td :colspan="canEdit ? 7 : 6">No contributions recorded</td>
                    </tr>
                    <tr v-else v-for="c in selectedContributions" :key="c.id">
                      <td>
                        <template v-if="editingId === c.id && canEditContribution(c)">
                          <input class="input" type="date" v-model="editDate" />
                        </template>
                        <template v-else>
                          {{ formatDate(c.contribution_date) }}
                        </template>
                      </td>
                      <td>{{ formatContributionKind(c.contribution_kind) }}</td>
                      <td class="amount">₱{{ formatMoney(c.amount) }}</td>
                      <td>
                        <template v-if="editingId === c.id && canEditContribution(c)">
                          <select class="input" v-model="editStatus">
                            <option value="confirmed">confirmed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </template>
                        <template v-else>
                          <span class="badge" :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'">{{ c.status }}</span>
                        </template>
                      </td>
                      <td>{{ c.receipt_number || '—' }}</td>
                      <td class="actions">
                        <button
                          v-if="c.receipt_number"
                          type="button"
                          class="btn-link-inline"
                          @click="printContributionReceipt(c.receipt_number)"
                        >Print</button>
                      </td>
                      <td v-if="canEdit" class="actions">
                        <template v-if="editingId === c.id && canEditContribution(c)">
                          <button class="btn btn-small" @click="saveEdit(c.id)" :disabled="loading">Save</button>
                          <button class="btn btn-small btn-muted" @click="cancelEdit" :disabled="loading">Cancel</button>
                        </template>
                        <template v-else>
                          <button v-if="canEditContribution(c)" class="btn btn-small" @click="startEdit(c)">Edit</button>
                          <span v-else class="muted">Auto</span>
                        </template>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="section-title">Withdrawals</div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loadingFarmer">
                      <td colspan="3">Loading...</td>
                    </tr>
                    <tr v-else-if="selectedWithdrawals.length === 0">
                      <td colspan="3">No withdrawals</td>
                    </tr>
                    <tr v-else v-for="w in selectedWithdrawals" :key="w.id">
                      <td>{{ formatDate(w.withdrawal_date) }}</td>
                      <td class="amount">₱{{ formatMoney(w.amount) }}</td>
                      <td>{{ w.remarks || '—' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        </template>
      </div>
    </div>

    <Teleport to="body">
      <div v-if="showReceiptModal && lastReceipt" class="modal-overlay receipt-modal-overlay" @click.self="closeReceiptModal">
        <div class="modal-box receipt-modal-box" @click.stop>
          <PaymentReceiptPrint :receipt="lastReceipt" :auto-print="receiptAutoPrint" @close="closeReceiptModal" />
        </div>
      </div>
    </Teleport>

    <div v-if="alert.show" :class="['alert', 'alert-' + alert.type]">
      <span class="alert-message">{{ alert.message }}</span>
      <button type="button" @click="alert.show = false" class="alert-close">×</button>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import { usePaymentReceipt } from '../composables/usePaymentReceipt'

const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const role = computed(() => authStore.currentUser?.role)
const isAdmin = computed(() => role.value === 'admin')
const isFarmer = computed(() => ['farmer', 'operation_manager', 'business_manager', 'operator'].includes(role.value))
const isTreasurer = computed(() => role.value === 'treasurer')
const isPresident = computed(() => role.value === 'president')
const isOfficerView = computed(() => isTreasurer.value || isPresident.value || isAdmin.value)
const isAllowedRole = computed(() => ['admin', 'farmer', 'treasurer', 'president', 'operation_manager', 'business_manager', 'operator'].includes(role.value))
const canEdit = computed(() => isTreasurer.value || isPresident.value || isAdmin.value)

const barangays = ref([])
const selectedBarangayId = ref('')

const barangayOptions = computed(() =>
  barangays.value.map(b => ({
    id: b.id || b.barangay_id,
    name: b.name || b.barangay_name || String(b.id)
  }))
)

const selectedBarangayName = computed(() => {
  if (!selectedBarangayId.value) return ''
  const match = barangayOptions.value.find(b => String(b.id) === String(selectedBarangayId.value))
  return match?.name || ''
})

const membersPanelTitle = computed(() => {
  if (isAdmin.value && selectedBarangayName.value) {
    return `Members — ${selectedBarangayName.value}`
  }
  return 'Members (Your Barangay)'
})

const filteredFarmers = computed(() => {
  if (!searchQuery.value.trim()) return farmers.value
  
  const query = searchQuery.value.toLowerCase()
  return farmers.value.filter(f => 
    (f.reference_number && f.reference_number.toLowerCase().includes(query)) ||
    (f.full_name && f.full_name.toLowerCase().includes(query))
  )
})

const loading = ref(false)
const loadingFarmer = ref(false)
const setupError = ref('')

const alert = ref({
  show: false,
  message: '',
  type: 'success'
})

let alertTimer = null
const showAlert = (message, type = 'success') => {
  if (alertTimer) clearTimeout(alertTimer)
  alert.value = { show: true, message, type }
  alertTimer = setTimeout(() => {
    alert.value.show = false
    alertTimer = null
  }, 4000)
}

function setSetupError(message) {
  if (message && String(message).toLowerCase().includes('tables not found')) {
    setupError.value = message
  }
}

const farmers = ref([])
const overviewTotals = ref({ total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 })
const selectedFarmer = ref(null)
const selectedContributions = ref([])
const selectedWithdrawals = ref([])
const selectedTotals = ref({ total_contributed: 0, total_withdrawn: 0, balance: 0 })

const meContributions = ref([])
const meWithdrawals = ref([])
const meTotals = ref({ total_contributed: 0, total_withdrawn: 0, balance: 0 })

const newContributionDate = ref(todayISO())
const newContributionMethod = ref('Cash')

const { showReceiptModal, lastReceipt, receiptAutoPrint, showAndPrintReceipt, closeReceiptModal } = usePaymentReceipt()

async function printContributionReceipt(receiptNumber) {
  if (!receiptNumber) {
    showAlert('No receipt available for this contribution.', 'error')
    return
  }
  try {
    await showAndPrintReceipt(receiptNumber)
  } catch (e) {
    showAlert(e.message || 'Failed to load receipt.', 'error')
  }
}

const editingId = ref(null)
const editDate = ref('')
const editStatus = ref('confirmed')
const searchQuery = ref('')

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMoney(value) {
  const n = parseFloat(value || 0)
  return Number.isFinite(n) ? n.toLocaleString() : '0'
}

function formatContributionKind(kind) {
  return String(kind || 'membership') === 'assistance_sacks'
    ? 'Seed/Fertilizer Plan (₱50/sack)'
    : '6-Month Share (₱100)'
}

function canEditContribution(contribution) {
  return String(contribution?.contribution_kind || 'membership') === 'membership'
}

async function apiFetch(path, options = {}) {
  const token = authStore.token || localStorage.getItem('token')
  if (!token) {
    showAlert('Session expired. Please login again.', 'error')
    throw new Error('Unauthorized')
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }
  const response = await fetch(path, { ...options, headers })
  if (response.status === 401) {
    showAlert('Session expired. Please login again.', 'error')
    throw new Error('Unauthorized')
  }
  return response
}

async function loadBarangays() {
  try {
    const res = await fetch('/api/barangays')
    const data = await res.json()
    barangays.value = data.barangays || data.data || (Array.isArray(data) ? data : [])
  } catch (e) {
    console.error('Error loading barangays:', e)
  }
}

function onBarangayChange() {
  selectedFarmer.value = null
  selectedContributions.value = []
  selectedWithdrawals.value = []
  searchQuery.value = ''
  loadOverview()
}

async function loadOverview() {
  if (!isOfficerView.value) return
  if (isAdmin.value && !selectedBarangayId.value) {
    farmers.value = []
    overviewTotals.value = { total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 }
    return
  }

  setupError.value = ''
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (isAdmin.value && selectedBarangayId.value) {
      params.set('barangay_id', selectedBarangayId.value)
    }
    const query = params.toString()
    const res = await apiFetch(`/api/share-capital/overview${query ? `?${query}` : ''}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load overview')
    }
    farmers.value = data.farmers || []
    overviewTotals.value = data.totals || overviewTotals.value

    // Keep selection valid
    if (selectedFarmer.value) {
      const stillThere = farmers.value.find(f => f.id === selectedFarmer.value.id)
      if (stillThere) {
        selectedFarmer.value = stillThere
      }
    }
  } catch (e) {
    setSetupError(e.message)
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadFarmerDetails(farmerId) {
  loadingFarmer.value = true
  try {
    const res = await apiFetch(`/api/share-capital/farmer/${farmerId}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load farmer records')
    }
    selectedTotals.value = data.totals || selectedTotals.value
    selectedContributions.value = data.contributions || []
    selectedWithdrawals.value = data.withdrawals || []
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loadingFarmer.value = false
  }
}

async function selectFarmer(f) {
  selectedFarmer.value = f
  editingId.value = null
  await loadFarmerDetails(f.id)
}

async function recordContribution() {
  if (!selectedFarmer.value) return
  if (!newContributionDate.value) {
    showAlert('Please select a contribution date', 'error')
    return
  }

  loading.value = true
  try {
    const res = await apiFetch('/api/share-capital/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_id: selectedFarmer.value.id,
        contribution_date: newContributionDate.value,
        amount: 100,
        payment_method: newContributionMethod.value
      })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to record contribution')
    }
    await loadFarmerDetails(selectedFarmer.value.id)
    await loadOverview()
    if (data.receipt_number) {
      try {
        await showAndPrintReceipt(data.receipt_number)
      } catch (receiptErr) {
        console.error('Receipt print failed:', receiptErr)
        showAlert('Contribution saved but receipt could not be loaded. Use Print from the history table.', 'error')
      }
    }
    showAlert(data.message || 'Share contribution recorded successfully', 'success')
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

function startEdit(c) {
  editingId.value = c.id
  editDate.value = String(c.contribution_date || '').slice(0, 10)
  editStatus.value = c.status || 'confirmed'
}

function cancelEdit() {
  editingId.value = null
  editDate.value = ''
  editStatus.value = 'confirmed'
}

async function saveEdit(id) {
  if (!editDate.value) {
    showAlert('Please select a date', 'error')
    return
  }

  loading.value = true
  try {
    const res = await apiFetch(`/api/share-capital/contributions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contribution_date: editDate.value,
        amount: 100,
        status: editStatus.value
      })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to update contribution')
    }
    cancelEdit()
    if (selectedFarmer.value) {
      await loadFarmerDetails(selectedFarmer.value.id)
      await loadOverview()
    }
    showAlert('Contribution updated successfully', 'success')
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function processWithdrawal() {
  if (!selectedFarmer.value) return

  const ok = confirm(
    `Process withdrawal for ${selectedFarmer.value.full_name}?\n\nThis will withdraw the remaining balance and mark the farmer as inactive.`
  )
  if (!ok) return

  const remarks = prompt('Remarks (optional):')

  loading.value = true
  try {
    const res = await apiFetch('/api/share-capital/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_id: selectedFarmer.value.id,
        withdrawal_date: todayISO(),
        remarks: remarks || null
      })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to process withdrawal')
    }
    await loadFarmerDetails(selectedFarmer.value.id)
    await loadOverview()
    showAlert('Withdrawal processed successfully', 'success')
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadMe() {
  setupError.value = ''
  loading.value = true
  try {
    const res = await apiFetch('/api/share-capital/me')
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load share capital data')
    }
    meTotals.value = data.totals || meTotals.value
    meContributions.value = data.contributions || []
    meWithdrawals.value = data.withdrawals || []
  } catch (e) {
    setSetupError(e.message)
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!authStore.token) return
  if (isFarmer.value) {
    await loadMe()
  } else if (isOfficerView.value) {
    if (isAdmin.value) {
      await loadBarangays()
    } else {
      await loadOverview()
    }
  }
})
</script>

<style scoped>
/* ===== GLASSMORPHIC GREEN THEME (aligned with Machinery Financial / Seed Fertilizer Plan) ===== */
.financial-container {
  --glass-bg: rgba(29, 43, 33, 0.92);
  --glass-panel: rgba(31, 48, 36, 0.94);
  --glass-line: rgba(255, 255, 255, 0.1);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --text-soft: rgba(220, 238, 211, 0.62);
  --green: #34d399;
  --lime: #a3e635;
  --red: #f87171;

  min-height: 100vh;
  padding: 28px;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  position: relative;
  isolation: isolate;
  overflow: visible;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: var(--text-main);
}

.financial-container::before,
.financial-container::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.financial-container::before {
  background:
    radial-gradient(ellipse 82% 56% at 12% 88%, rgba(17, 94, 41, 0.22) 0%, transparent 62%),
    radial-gradient(ellipse 75% 55% at 92% 10%, rgba(34, 197, 94, 0.14) 0%, transparent 64%),
    radial-gradient(circle at 50% 16%, rgba(45, 212, 191, 0.11) 0%, transparent 22%),
    linear-gradient(130deg, rgba(163, 230, 53, 0.03) 0%, transparent 38%, rgba(45, 212, 191, 0.03) 100%);
  animation: ambienceDrift 16s ease-in-out infinite alternate;
}

.financial-container::after {
  background:
    radial-gradient(circle at 94% 8%, rgba(34, 197, 94, 0.2) 0%, transparent 17%),
    radial-gradient(circle at 8% 86%, rgba(74, 222, 128, 0.16) 0%, transparent 20%),
    radial-gradient(circle at 80% 74%, rgba(45, 212, 191, 0.18) 0%, transparent 18%),
    radial-gradient(circle at 22% 30%, rgba(163, 230, 53, 0.14) 0%, transparent 16%),
    repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 14px);
  filter: blur(10px);
  animation: orbPulse 11s ease-in-out infinite;
}

@keyframes ambienceDrift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  100% {
    transform: translate3d(-10px, 8px, 0) scale(1.03);
  }
}

@keyframes orbPulse {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.financial-container > * {
  position: relative;
  z-index: 1;
}

.financial-container > .tab-content {
  margin-top: 22px;
}

.page-header {
  margin-bottom: 0;
  padding: 36px 40px;
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

.header-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 760px;
  align-items: flex-start;
  text-align: left;
}

.page-header::before {
  content: '';
  position: absolute;
  inset: -35% -10% auto auto;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.22) 0%, rgba(45, 212, 191, 0) 68%);
  pointer-events: none;
}

.page-header::after {
  content: '';
  position: absolute;
  inset: auto auto -50% -8%;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(163, 230, 53, 0.18) 0%, rgba(163, 230, 53, 0) 70%);
  pointer-events: none;
}

.page-header h1 {
  font-size: 38px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.9px;
  margin: 0;
  background: linear-gradient(90deg, #86efac 0%, #4ade80 45%, #22c55e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.page-subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 500;
}

.hero-subtitle {
  max-width: 52rem;
}

.tab-content {
  background: var(--glass-bg);
  border: 1px solid var(--glass-line);
  border-radius: 18px;
  padding: 24px 28px;
  backdrop-filter: blur(18px);
  box-shadow:
    14px 14px 26px rgba(8, 13, 10, 0.5),
    0 0 0 1px rgba(20, 32, 24, 0.45),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -26px 30px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.tab-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 10%, rgba(163, 230, 53, 0.08) 0%, rgba(163, 230, 53, 0) 28%),
    radial-gradient(circle at 88% 88%, rgba(45, 212, 191, 0.08) 0%, rgba(45, 212, 191, 0) 30%);
  pointer-events: none;
}

.tab-content--main {
  padding-top: 22px;
}

.tab-content .stats-grid,
.tab-content .grid-2 {
  position: relative;
  z-index: 1;
}

.info-banner {
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 18px;
  font-size: 14px;
  line-height: 1.45;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-main);
  position: relative;
  z-index: 1;
}

.info-banner--error {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
}

.error-hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 13px;
  color: #fecaca;
  opacity: 0.95;
}

.code-block {
  margin-top: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-family: ui-monospace, 'Courier New', monospace;
  font-size: 12px;
  overflow-x: auto;
  color: var(--lime);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.stats-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 12px 0 16px;
}

.stat-card {
  background: linear-gradient(145deg, rgba(32, 48, 37, 0.92), rgba(24, 36, 28, 0.88));
  border: 1px solid rgba(190, 235, 203, 0.22);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow:
    8px 8px 18px rgba(8, 13, 10, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.stat-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 1.65rem;
  font-weight: 900;
  color: #bbf7d0;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 1024px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.tab-content .card {
  background: rgba(22, 35, 27, 0.78);
  border: 1px solid var(--glass-line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    12px 12px 22px rgba(8, 13, 10, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  padding: 0;
  margin: 0;
}

.tab-content .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.14);
  margin-bottom: 0;
}

.tab-content .card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
}

.card-body {
  padding: 16px 18px 18px;
  position: relative;
  z-index: 1;
}

.admin-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--glass-panel);
  border: 1px solid var(--glass-line);
}

.admin-filter-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.admin-filter-select {
  min-width: 220px;
  max-width: 320px;
}

.admin-filter-hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}

.filter-section {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.12);
  position: relative;
  z-index: 1;
}

.filter-input {
  width: 100%;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  position: relative;
  z-index: 1;
}

.tab-content .data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.625rem;
  table-layout: fixed;
}

.tab-content .data-table thead {
  background: rgba(74, 222, 128, 0.08);
}

.tab-content .data-table th {
  padding: 0.28rem 0.32rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.12;
}

.tab-content .data-table th:not(:last-child),
.tab-content .data-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
}

.tab-content .data-table td {
  padding: 0.26rem 0.3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 500;
  font-size: 0.625rem;
  line-height: 1.15;
}

.tab-content .data-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.tab-content .data-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.1);
}

.tab-content table.data-table tbody td.amount {
  font-size: 0.625rem;
  font-weight: 600;
  color: #b7f7c8;
  font-family: ui-monospace, 'Courier New', monospace;
  line-height: 1.25;
}

.tab-content .data-table tr.selected {
  outline: 2px solid rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.12) !important;
}

.name {
  font-weight: 500;
  color: var(--text-main);
}

.actions {
  white-space: nowrap;
  text-align: right;
}

.muted {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
}

.btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(22, 163, 74, 0.18));
  color: var(--green);
  font-weight: 800;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(74, 222, 128, 0.55);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 0.16rem 0.3rem;
  font-size: 0.55rem;
  border-radius: 6px;
  font-weight: 600;
  line-height: 1.1;
}

.btn-primary-action {
  padding: 12px 22px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(96, 165, 250, 0.18));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.3);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-primary-action:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.34), rgba(96, 165, 250, 0.28));
  border-color: var(--green);
  transform: translateY(-2px);
}

.btn-muted {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-muted:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

.btn-success {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.32), rgba(74, 222, 128, 0.2));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.4);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.42), rgba(74, 222, 128, 0.3));
  border-color: var(--green);
  transform: translateY(-2px);
}

.btn-danger {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(248, 113, 113, 0.12));
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.45);
}

.btn-danger:hover:not(:disabled) {
  border-color: #f87171;
  transform: translateY(-1px);
}

.badge {
  display: inline-block;
  padding: 0.08rem 0.28rem;
  border-radius: 999px;
  font-size: 0.55rem;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.badge-success {
  background: rgba(74, 222, 128, 0.16);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.35);
}

.badge-muted {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-soft);
  border-color: rgba(255, 255, 255, 0.1);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-soft);
  position: relative;
  z-index: 1;
}

.empty-state--panel {
  padding: 32px 20px;
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.15);
  margin-bottom: 8px;
}

.empty-title {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-main);
  margin-bottom: 6px;
}

.empty-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}

.farmer-summary {
  margin-bottom: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.22);
}

.farmer-name {
  font-weight: 900;
  font-size: 1.08rem;
  color: #ecfdf5;
  margin-bottom: 4px;
}

.farmer-meta {
  font-size: 13px;
  color: var(--text-muted);
}

.section-title {
  margin: 16px 0 8px;
  font-size: 12px;
  font-weight: 800;
  color: #b6f7cb;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 8px;
}

.action-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  margin-bottom: 16px;
}

.form-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.inline-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-soft);
  margin: 0;
}

.input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(39, 58, 45, 0.92);
  color: var(--text-main);
  font-family: inherit;
  font-size: 14px;
  min-height: 42px;
}

.input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
}

.input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

select.input {
  cursor: pointer;
}

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
.financial-container.share-capital-page.light-theme {
  --glass-bg: #fffef9;
  --glass-panel: #ffffff;
  --glass-line: rgba(34, 197, 94, 0.28);
  --glass-line-strong: rgba(22, 101, 52, 0.35);
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --green: #15803d;

  background: linear-gradient(155deg, #d8f3de 0%, #bfeccc 42%, #a8e4b8 100%) !important;
  color: var(--text-main);
}

.financial-container.share-capital-page.light-theme::before,
.financial-container.share-capital-page.light-theme::after {
  opacity: 0.25;
}

.financial-container.share-capital-page.light-theme .page-header {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%) !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 10px 28px rgba(22, 101, 52, 0.12) !important;
}

.financial-container.share-capital-page.light-theme .page-header h1 {
  background: none !important;
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
  -webkit-text-fill-color: currentColor !important;
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .page-subtitle {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .tab-content {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.financial-container.share-capital-page.light-theme .admin-filter-bar {
  background: #f0fdf4 !important;
  border: 2px solid #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .admin-filter-label {
  color: #000000 !important;
  font-size: 14px !important;
  font-weight: 800 !important;
  text-transform: none;
}

.financial-container.share-capital-page.light-theme .admin-filter-hint {
  color: #166534 !important;
  font-size: 14px !important;
}

.financial-container.share-capital-page.light-theme .empty-state {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .empty-state--panel {
  background: #f8fdf9 !important;
  border: 2px dashed #86efac !important;
}

.financial-container.share-capital-page.light-theme .empty-title {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .empty-text {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .stat-card {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.financial-container.share-capital-page.light-theme .stat-label {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .stat-value {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .card {
  background: #ffffff !important;
  border: 2px solid #bbf7d0 !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.financial-container.share-capital-page.light-theme .tab-content .card-header {
  background: #f0fdf4 !important;
  border-bottom: 1px solid #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .card-title {
  color: #000000 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table th {
  color: #000000 !important;
  border-bottom-color: #86efac !important;
  font-size: 0.58rem !important;
  font-weight: 600 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table td {
  color: #000000 !important;
  border-bottom-color: #e2e8f0 !important;
  font-size: 0.625rem !important;
  font-weight: 500 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table tbody tr:nth-child(even) {
  background: #f8fdf9 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table tbody tr:hover {
  background: #ecfdf5 !important;
}

.financial-container.share-capital-page.light-theme .tab-content table.data-table tbody td.amount {
  color: #15803d !important;
}

.financial-container.share-capital-page.light-theme .input {
  background: #ffffff !important;
  color: #000000 !important;
  border: 1.5px solid #94a3b8 !important;
  font-size: 16px !important;
  min-height: 48px;
}

.financial-container.share-capital-page.light-theme .input::placeholder {
  color: #4b5563 !important;
  opacity: 1 !important;
}

.financial-container.share-capital-page.light-theme .input:focus {
  border-color: #16a34a !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2) !important;
}

.financial-container.share-capital-page.light-theme .filter-section {
  background: #f8fdf9 !important;
  border-bottom-color: #e2e8f0 !important;
}

.financial-container.share-capital-page.light-theme .farmer-summary {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
}

.financial-container.share-capital-page.light-theme .farmer-name {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .farmer-meta {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .section-title {
  color: #15803d !important;
  border-bottom-color: #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .inline-label {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .muted {
  color: #15803d !important;
}

.financial-container.share-capital-page.light-theme .name {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .badge-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
}

.financial-container.share-capital-page.light-theme .badge-muted {
  background: #f1f5f9 !important;
  color: #475569 !important;
  border-color: #cbd5e1 !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-small,
.financial-container.share-capital-page.light-theme .btn:not(.btn-primary-action):not(.btn-success):not(.btn-danger) {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 2px solid #166534 !important;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08) !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-small:hover:not(:disabled),
.financial-container.share-capital-page.light-theme .btn:not(.btn-primary-action):not(.btn-success):not(.btn-danger):hover:not(:disabled) {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #15803d !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-primary-action,
.financial-container.share-capital-page.light-theme .btn-primary-action {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 2px solid #14532d !important;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.22) !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-primary-action:hover:not(:disabled),
.financial-container.share-capital-page.light-theme .btn-primary-action:hover:not(:disabled) {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.share-capital-page.light-theme .btn-muted {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 2px solid #94a3b8 !important;
}

.financial-container.share-capital-page.light-theme .btn-success {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 2px solid #14532d !important;
}

.financial-container.share-capital-page.light-theme .btn-danger {
  background: #fee2e2 !important;
  color: #991b1b !important;
  -webkit-text-fill-color: #991b1b !important;
  border: 2px solid #fca5a5 !important;
}

.financial-container.share-capital-page.light-theme .info-banner {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #14532d !important;
}

.financial-container.share-capital-page.light-theme .info-banner--error {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

@media (max-width: 768px) {
  .financial-container {
    padding: 16px;
  }

  .page-header {
    padding: 24px 20px;
  }

  .page-header h1 {
    font-size: 30px;
    line-height: 1.12;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .tab-content {
    padding: 18px 16px;
  }
}

.btn-link-inline {
  background: none;
  border: none;
  color: #4ade80;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  font-weight: 500;
  font-size: inherit;
  line-height: inherit;
  padding: 0;
  margin: 0;
}

.financial-container.share-capital-page.light-theme .btn-link-inline {
  color: #166534;
}

.alert {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  z-index: 10060;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  animation: shareCapitalAlertSlideUp 0.3s ease-out;
  border: 1px solid rgba(15, 23, 42, 0.12);
  min-width: 320px;
  max-width: 520px;
}

@keyframes shareCapitalAlertSlideUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.alert-success {
  background: #ecfdf5 !important;
  color: #14532d !important;
  border-color: #86efac !important;
}

.alert-error {
  background: #fef2f2 !important;
  color: #991b1b !important;
  border-color: #fca5a5 !important;
}

.alert-message {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
}

.alert-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  font-weight: 800;
  color: inherit;
  opacity: 0.75;
  padding: 0 2px;
}

.alert-close:hover {
  opacity: 1;
}

@import '../styles/compact-data-table.css';
</style>
