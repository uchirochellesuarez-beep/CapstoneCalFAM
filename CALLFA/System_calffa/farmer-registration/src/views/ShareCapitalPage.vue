<template>
  <div class="page-container">
    <div class="page-header">
      <h1 class="page-title">🏦 Share Capital</h1>
      <p class="page-subtitle">
        ₱100 every 6 months (₱200/year) • Members only • Barangay-based visibility
      </p>
    </div>

    <div v-if="!isAllowedRole" class="card">
      <div class="empty-state">
        <div class="empty-title">Access limited</div>
        <div class="empty-text">This module is available to Members, Treasurers, and Presidents.</div>
      </div>
    </div>

    <div v-else>
      <div v-if="error" class="card error-card">
        <div class="error-title">⚠️ Error Loading Share Capital</div>
        <div class="error-text">{{ error }}</div>
        <div v-if="error.includes('tables not found')" class="error-hint">
          <strong>Fix needed:</strong> Run the database migration by opening a terminal and executing:
          <div class="code-block">mysql -u root -p calffa < backend/migrations/create_share_capital_module.sql</div>
          Then restart the backend server. See SHARE_CAPITAL_SETUP.md for details.
        </div>
      </div>

      <div v-if="isAdmin" class="card">
        <div class="empty-state">
          <div class="empty-title">Barangay-based module</div>
          <div class="empty-text">Login as a barangay Treasurer/President or as a Farmer to use Share Capital.</div>
        </div>
      </div>

      <!-- Farmer view -->
      <div v-else-if="isFarmer">
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
              <button class="btn" @click="loadMe" :disabled="loading">Refresh</button>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="3">Loading...</td>
                  </tr>
                  <tr v-else-if="meContributions.length === 0">
                    <td colspan="3">No contributions recorded</td>
                  </tr>
                  <tr v-else v-for="c in meContributions" :key="c.id">
                    <td>{{ formatDate(c.contribution_date) }}</td>
                    <td class="amount">₱{{ formatMoney(c.amount) }}</td>
                    <td>
                      <span class="badge" :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'">{{ c.status }}</span>
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

      <!-- Treasurer/President view -->
      <div v-else>
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
              <h2 class="card-title">Members (Your Barangay)</h2>
              <button class="btn" @click="loadOverview" :disabled="loading">Refresh</button>
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

            <div v-else>
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
              <div v-if="canEdit" class="action-row">
                <div class="form-inline">
                  <label class="inline-label">Contribution Date</label>
                  <input class="input" type="date" v-model="newContributionDate" />
                  <label class="inline-label">Amount</label>
                  <input class="input" type="number" :value="100" disabled />
                  <button class="btn" @click="recordContribution" :disabled="loading">Record</button>
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
                      <th>Amount</th>
                      <th>Status</th>
                      <th v-if="canEdit"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loadingFarmer">
                      <td colspan="4">Loading...</td>
                    </tr>
                    <tr v-else-if="selectedContributions.length === 0">
                      <td colspan="4">No contributions recorded</td>
                    </tr>
                    <tr v-else v-for="c in selectedContributions" :key="c.id">
                      <td>
                        <template v-if="editingId === c.id">
                          <input class="input" type="date" v-model="editDate" />
                        </template>
                        <template v-else>
                          {{ formatDate(c.contribution_date) }}
                        </template>
                      </td>
                      <td class="amount">₱{{ formatMoney(c.amount) }}</td>
                      <td>
                        <template v-if="editingId === c.id">
                          <select class="input" v-model="editStatus">
                            <option value="confirmed">confirmed</option>
                            <option value="cancelled">cancelled</option>
                          </select>
                        </template>
                        <template v-else>
                          <span class="badge" :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'">{{ c.status }}</span>
                        </template>
                      </td>
                      <td v-if="canEdit" class="actions">
                        <template v-if="editingId === c.id">
                          <button class="btn btn-small" @click="saveEdit(c.id)" :disabled="loading">Save</button>
                          <button class="btn btn-small btn-muted" @click="cancelEdit" :disabled="loading">Cancel</button>
                        </template>
                        <template v-else>
                          <button class="btn btn-small" @click="startEdit(c)">Edit</button>
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
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()

const role = computed(() => authStore.currentUser?.role)
const isAdmin = computed(() => role.value === 'admin')
const isFarmer = computed(() => ['farmer', 'operation_manager', 'business_manager', 'operator'].includes(role.value))
const isTreasurer = computed(() => role.value === 'treasurer')
const isPresident = computed(() => role.value === 'president')
const isAllowedRole = computed(() => ['admin', 'farmer', 'treasurer', 'president', 'operation_manager', 'business_manager', 'operator'].includes(role.value))
const canEdit = computed(() => isTreasurer.value || isAdmin.value)

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
const error = ref('')

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

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    'Authorization': `Bearer ${authStore.token}`
  }
  const response = await fetch(path, { ...options, headers })
  if (response.status === 401) {
    error.value = 'Session expired. Please login again.'
    throw new Error('Unauthorized')
  }
  return response
}

async function loadOverview() {
  if (!(isTreasurer.value || isPresident.value || isAdmin.value)) return

  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch('/api/share-capital/overview')
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
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadFarmerDetails(farmerId) {
  error.value = ''
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
    error.value = e.message
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
    alert('Please select a contribution date')
    return
  }

  loading.value = true
  error.value = ''
  try {
    const res = await apiFetch('/api/share-capital/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_id: selectedFarmer.value.id,
        contribution_date: newContributionDate.value,
        amount: 100
      })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to record contribution')
    }
    await loadFarmerDetails(selectedFarmer.value.id)
    await loadOverview()
  } catch (e) {
    error.value = e.message
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
    alert('Please select a date')
    return
  }

  loading.value = true
  error.value = ''
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
  } catch (e) {
    error.value = e.message
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
  error.value = ''
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
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

async function loadMe() {
  error.value = ''
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
    error.value = e.message
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (!authStore.token) return
  if (isFarmer.value) {
    await loadMe()
  } else if (isTreasurer.value || isPresident.value) {
    await loadOverview()
  }
})
</script>

<style scoped>
.page-container {
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  margin-bottom: 20px;
}

.page-title {
  margin: 0;
  font-size: 28px;
  font-weight: 800;
  color: var(--text-dark);
}

.page-subtitle {
  margin: 6px 0 0 0;
  color: var(--text-light);
}

.card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  box-shadow: 0 2px 10px var(--shadow);
  padding: 16px;
}

.error-card {
  border-color: var(--error);
}

.error-title {
  font-weight: 700;
  color: var(--error);
  margin-bottom: 6px;
}

.error-text {
  color: var(--text-dark);
}

.error-hint {
  margin-top: 12px;
  padding: 10px;
  background: var(--light-green);
  border-radius: 8px;
  font-size: 13px;
}

.code-block {
  margin-top: 6px;
  padding: 8px;
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 6px;
  font-family: monospace;
  font-size: 12px;
  overflow-x: auto;
  color: var(--text-dark);
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 12px;
  margin-bottom: 12px;
}

.stats-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  margin: 12px 0;
}

.stat-card {
  background: var(--card-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 12px;
}

.stat-label {
  color: var(--text-light);
  font-size: 13px;
}

.stat-value {
  font-size: 20px;
  font-weight: 800;
  color: var(--text-dark);
  margin-top: 6px;
}

.grid-2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 1024px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
}

.card-title {
  margin: 0;
  font-size: 16px;
  font-weight: 800;
  color: var(--text-dark);
}

.filter-section {
  padding: 16px;
  border-bottom: 1px solid #e5e7eb;
  background-color: #f9fafb;
}

.filter-input {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 14px;
  transition: border-color 0.2s, box-shadow 0.2s;
}

.filter-input:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.table-container {
  width: 100%;
  overflow-x: auto;
}

.data-table {
  width: 100%;
  border-collapse: collapse;
}

.data-table th,
.data-table td {
  text-align: left;
  padding: 10px;
  border-bottom: 1px solid var(--border);
  font-size: 14px;
  color: var(--text-dark);
}

.data-table th {
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-light);
}

.data-table tr.selected {
  background: var(--light-green);
}

.amount {
  font-weight: 700;
}

.name {
  font-weight: 700;
}

.actions {
  white-space: nowrap;
}

.btn {
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-dark);
  padding: 8px 10px;
  border-radius: 10px;
  cursor: pointer;
  font-weight: 700;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 8px;
  border-radius: 9px;
}

.btn-muted {
  color: var(--text-light);
}

.btn-danger {
  border-color: var(--error);
  color: var(--error);
}

.badge {
  display: inline-block;
  padding: 4px 8px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 800;
  border: 1px solid var(--border);
}

.badge-success {
  color: var(--success);
}

.badge-muted {
  color: var(--text-light);
}

.empty-state {
  padding: 18px 10px;
}

.empty-title {
  font-weight: 800;
  color: var(--text-dark);
}

.empty-text {
  margin-top: 6px;
  color: var(--text-light);
}

.farmer-summary {
  margin-bottom: 10px;
}

.farmer-name {
  font-weight: 900;
  color: var(--text-dark);
}

.farmer-meta {
  margin-top: 4px;
  color: var(--text-light);
  font-size: 13px;
}

.section-title {
  margin: 12px 0 8px 0;
  font-size: 13px;
  font-weight: 900;
  color: var(--text-dark);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.action-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 12px;
  margin-bottom: 12px;
}

.form-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.inline-label {
  font-size: 12px;
  color: var(--text-light);
  font-weight: 800;
}

.input {
  padding: 8px 10px;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: var(--card-bg);
  color: var(--text-dark);
}
</style>
