<template>
  <div class="page-container income-hub-subpage">
    <div class="page-header">
      <h1 class="page-title">🔍 Pagsusuri ng Kita ng mga Magsasaka</h1>
      <p class="page-subtitle">Suriin at ipahayag kung ang nasiyang talaan ay tunay at karapat-dapat</p>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="errorMessage" class="alert alert-error">
      <span>❌ {{ errorMessage }}</span>
      <button class="alert-close" @click="errorMessage = ''">&times;</button>
    </div>
    <div v-if="successMessage" class="alert alert-success">
      <span>✅ {{ successMessage }}</span>
      <button class="alert-close" @click="successMessage = ''">&times;</button>
    </div>

    <!-- No barangay warning -->
    <div v-if="!currentUser?.barangay_id" class="alert alert-warning">
      ⚠️ Hindi ka naka-assign sa anumang barangay. Makipag-ugnayan sa admin.
    </div>

    <!-- Filter and Search -->
    <div class="filter-bar" v-if="records.length > 0">
      <div class="search-box">
        <span class="search-icon">🔍</span>
        <input
          type="text"
          v-model="searchQuery"
          placeholder="Hanapin ayon sa pangalan ng magsasaka..."
          class="search-input"
        />
      </div>
    </div>

    <!-- Stats -->
    <div class="stats-container" v-if="records.length > 0">
      <div class="stat-item">
        <div class="stat-icon">⏳</div>
        <div class="stat-content">
          <div class="stat-value">{{ pendingRecords.length }}</div>
          <div class="stat-label">Naghihintay ng Pagsusuri</div>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Kinukuha ang mga talaan...</p>
    </div>

    <!-- Empty State -->
    <div v-else-if="records.length === 0 && currentUser?.barangay_id" class="empty-state">
      <div class="empty-icon">📭</div>
      <p>Walang naihintay na pagsusuri sa iyong barangay.</p>
    </div>

    <!-- Records List -->
    <div v-else class="records-list">
      <div v-if="filteredRecords.length === 0" class="empty-state">
        <div class="empty-icon">🔍</div>
        <p>Walang nahanap na talaan para sa "{{ searchQuery }}"</p>
      </div>
      <div
        v-for="record in filteredRecords"
        :key="record.id"
        class="record-card"
      >
        <div class="record-header">
          <div class="farmer-info">
            <span class="farmer-name">👨‍🌾 {{ record.farmer_name }}</span>
            <span class="record-date">📅 {{ formatDate(record.created_at) }}</span>
          </div>
          <div class="header-actions">
            <span class="status-badge pending-badge">⏳ Naghihintay</span>
            <button class="view-btn" @click="openRecordDetail(record)">👁️ Tingnan</button>
          </div>
        </div>

        <div class="record-details">
          <div class="record-detail">
            <span class="detail-label">Lawak:</span>
            <span>{{ record.area_hectares }} ektarya</span>
          </div>
        </div>

        <div class="record-financials">
          <div class="financial-item income">
            <span>Benta:</span>
            <span>₱{{ parseFloat(record.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="financial-item expense">
            <span>Gastos:</span>
            <span>₱{{ parseFloat(record.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
          </div>
          <div class="financial-item" :class="parseFloat(record.net_income || 0) >= 0 ? 'profit' : 'loss'">
            <span>Net:</span>
            <span>₱{{ parseFloat(record.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
          </div>
        </div>

        <div class="record-actions">
          <button 
            class="btn-approve" 
            @click="approveRecord(record)"
            :disabled="approvingRecordId === record.id"
          >
            {{ approvingRecordId === record.id ? '⏳ Pinoproseso...' : '✅ Ipahayag bilang Tunay (Eligible)' }}
          </button>
          <button 
            class="btn-reject" 
            @click="openRejectModal(record)"
            :disabled="approvingRecordId === record.id"
          >
            ❌ I-uri-urong
          </button>
        </div>
      </div>
    </div>

    <!-- REJECT MODAL -->
    <Teleport to="body">
      <div v-if="showRejectModal" class="modal-overlay farmer-income-hub-modal" @click.self="closeRejectModal">
        <div class="modal-container">
          <div class="modal-header">
            <h2>I-uri-urong ang Talaan</h2>
            <button class="modal-close" @click="closeRejectModal">&times;</button>
          </div>
          <div class="modal-body">
            <p class="modal-text">Bakit mo gugustuhing i-uri-urong ang talaan ng <strong>{{ rejectingRecord?.farmer_name }}</strong>?</p>
            <textarea
              v-model="rejectReason"
              placeholder="Ilagay ang dahilan dito (halimbawa: Kulang impormasyon, Di-tumutugma ang mga numero, atbp.)"
              class="reject-textarea"
            ></textarea>
          </div>
          <div class="modal-footer">
            <button class="btn-cancel" @click="closeRejectModal">Bawiin</button>
            <button 
              class="btn-confirm-reject" 
              @click="confirmReject"
              :disabled="approvingRecordId === rejectingRecord?.id || !rejectReason.trim()"
            >
              {{ approvingRecordId === rejectingRecord?.id ? '⏳ Pinoproseso...' : 'I-uri-urong ang Talaan' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- VIEW DETAIL MODAL -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="modal-overlay farmer-income-hub-modal" @click.self="closeDetailModal">
        <div class="modal-container modal-lg">
          <div class="modal-header">
            <div class="modal-title-with-status">
              <h2>📋 Buong Detalye ng Talaan</h2>
              <span class="modal-status-badge pending-badge">⏳ Naghihintay</span>
            </div>
            <button class="modal-close" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modal-body" v-if="selectedRecord">

            <!-- Farmer Name Banner -->
            <div class="farmer-banner">
              <span class="banner-icon">👨‍🌾</span>
              <span class="banner-name">{{ selectedRecord.farmer_name }}</span>
            </div>

            <!-- Farm Info -->
            <div class="detail-section">
              <h3 class="detail-section-title">🌱 Detalye ng Taniman</h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">Petsa ng Talaan</span>
                  <span class="cell-value">{{ formatDate(selectedRecord.created_at) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Lawak (Ektarya)</span>
                  <span class="cell-value">{{ selectedRecord.area_hectares }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Paraan ng Pagtatanim</span>
                  <span class="cell-value">{{ selectedRecord.planting_method === 'sabog' ? 'Sabog' : 'Talok' }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Patubig</span>
                  <span class="cell-value">{{ formatIrrigation(selectedRecord.irrigation_type) }}</span>
                </div>
              </div>
            </div>

            <!-- Fertilizers -->
            <div class="detail-section" v-if="selectedRecord.fertilizers && selectedRecord.fertilizers.length > 0">
              <h3 class="detail-section-title">🧪 Mga Ginamit na Abono</h3>
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Klase</th>
                    <th>Sako</th>
                    <th>Presyo/Sako</th>
                    <th>Kabuuan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in selectedRecord.fertilizers" :key="f.id">
                    <td>{{ f.fertilizer_type }}</td>
                    <td>{{ f.sacks }}</td>
                    <td>₱{{ parseFloat(f.price_per_sack || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td class="amt">₱{{ parseFloat(f.line_total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="foot-label">Kabuuang Abono:</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_fertilizer_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Pesticides -->
            <div class="detail-section" v-if="selectedRecord.pesticides && selectedRecord.pesticides.length > 0">
              <h3 class="detail-section-title">🧴 Mga Ginamit na Lason</h3>
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Klase</th>
                    <th>Bilang</th>
                    <th>Presyo/Unit</th>
                    <th>Kabuuan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in selectedRecord.pesticides" :key="p.id">
                    <td>{{ p.pesticide_type }}</td>
                    <td>{{ p.quantity }}</td>
                    <td>₱{{ parseFloat(p.price_per_unit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td class="amt">₱{{ parseFloat(p.line_total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="foot-label">Kabuuang Lason:</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_pesticide_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>

            <!-- Labor & Expenses -->
            <div class="detail-section">
              <h3 class="detail-section-title">👷 Gastos sa Labor at Iba Pa</h3>
              <div class="expense-grid">
                <div class="expense-row">
                  <span>Paghahanda ng Lupa</span>
                  <span>₱{{ parseFloat(selectedRecord.land_preparation_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bunot / Talok / Hasik</span>
                  <span>₱{{ parseFloat(selectedRecord.planting_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Pagspray / Pagsabog ng Abono</span>
                  <span>₱{{ parseFloat(selectedRecord.spraying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Harvester</span>
                  <span>₱{{ parseFloat(selectedRecord.harvester_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Pagbibilad</span>
                  <span>₱{{ parseFloat(selectedRecord.drying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Paghakot</span>
                  <span>₱{{ parseFloat(selectedRecord.hauling_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Tarasko</span>
                  <span>₱{{ parseFloat(selectedRecord.tarasko_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Krudo</span>
                  <span>₱{{ parseFloat(selectedRecord.fuel_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Iba Pang Gastos</span>
                  <span>₱{{ parseFloat(selectedRecord.other_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row total-row">
                  <span>Kabuuang Labor:</span>
                  <span>₱{{ parseFloat(selectedRecord.total_labor_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <!-- Harvest -->
            <div class="detail-section">
              <h3 class="detail-section-title">🌾 Ani</h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">Sako na Naani</span>
                  <span class="cell-value">{{ selectedRecord.sacks_harvested }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Kilo Kada Sako</span>
                  <span class="cell-value">{{ selectedRecord.kg_per_sack }} kg</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Presyo Kada Kilo</span>
                  <span class="cell-value">₱{{ parseFloat(selectedRecord.price_per_kg || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Kabuuang Ani</span>
                  <span class="cell-value">{{ (parseFloat(selectedRecord.sacks_harvested || 0) * parseFloat(selectedRecord.kg_per_sack || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} kg</span>
                </div>
              </div>
            </div>

            <!-- Grand Summary -->
            <div class="detail-section summary-detail-section">
              <h3 class="detail-section-title">📊 Buod</h3>
              <div class="grand-summary">
                <div class="grand-row income-row">
                  <span>Kabuuang Benta</span>
                  <span>₱{{ parseFloat(selectedRecord.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row expense-summary-row">
                  <span>Kabuuang Gastos</span>
                  <span>₱{{ parseFloat(selectedRecord.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row" :class="parseFloat(selectedRecord.net_income || 0) >= 0 ? 'net-profit-row' : 'net-loss-row'">
                  <span>Netong Kita</span>
                  <span>₱{{ parseFloat(selectedRecord.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn-close-modal" @click="closeDetailModal">Isara</button>
          </div>
        </div>
      </div>
    </Teleport>

  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'

const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)

// Refs
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)
const records = ref([])
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedRecord = ref(null)
const showRejectModal = ref(false)
const rejectingRecord = ref(null)
const rejectReason = ref('')
const approvingRecordId = ref(null)

// Computed
const pendingRecords = computed(() => 
  records.value.filter(r => r.status === 'Pending' || r.status === 'Submitted')
)

const filteredRecords = computed(() => {
  if (!searchQuery.value.trim()) return pendingRecords.value
  const q = searchQuery.value.toLowerCase()
  return pendingRecords.value.filter(r =>
    (r.farmer_name || '').toLowerCase().includes(q)
  )
})

// Fetch records by barangay
const fetchRecords = async () => {
  if (!currentUser.value?.barangay_id) return
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`/api/farmer-income/by-barangay/${currentUser.value.barangay_id}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi makuha ang mga talaan.')
    records.value = data
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
}

// Approve record
const approveRecord = async (record) => {
  approvingRecordId.value = record.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const res = await fetch(`/api/farmer-income/${record.id}/verify`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ is_verified: true })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi maipadala ang pagpapatunay.')
    successMessage.value = `Ang talaan ng ${record.farmer_name} ay ipinagkumpitansa bilang Eligible.`
    await fetchRecords()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    approvingRecordId.value = null
  }
}

// Reject handling
const openRejectModal = (record) => {
  rejectingRecord.value = record
  rejectReason.value = ''
  showRejectModal.value = true
}

const closeRejectModal = () => {
  showRejectModal.value = false
  rejectingRecord.value = null
  rejectReason.value = ''
}

const confirmReject = async () => {
  if (!rejectingRecord.value || !rejectReason.value.trim()) return
  approvingRecordId.value = rejectingRecord.value.id
  errorMessage.value = ''
  successMessage.value = ''
  try {
    const res = await fetch(`/api/farmer-income/${rejectingRecord.value.id}/verify`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ 
        is_verified: false, 
        rejection_reason: rejectReason.value 
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi maipadala ang pag-uri-urong.')
    successMessage.value = `Ang talaan ng ${rejectingRecord.value.farmer_name} ay ibinalik para sa karagdagang impormasyon.`
    closeRejectModal()
    await fetchRecords()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    approvingRecordId.value = null
  }
}

// Modal functions
const openRecordDetail = (record) => {
  selectedRecord.value = record
  showDetailModal.value = true
}

const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}

// Helper functions
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('fil-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

const formatIrrigation = (type) => {
  const map = {
    'NIA': 'NIA',
    'bugsok_waterpump': 'Bugsok na Waterpump',
    'waterpump_irrigation': 'Waterpump na Nakalawit sa Irrigation',
    'waterpump_ilog': 'Waterpump na Nakalawit sa Ilog'
  }
  return map[type] || type
}

onMounted(() => {
  fetchRecords()
})
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 700;
  color: #166534;
  margin: 0 0 0.25rem 0;
}

.page-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0;
}

/* ALERTS */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fecaca;
}

.alert-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #bbf7d0;
}

.alert-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.alert-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.25rem;
  color: inherit;
  opacity: 0.7;
}

.alert-close:hover {
  opacity: 1;
}

/* STATS */
.stats-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.stat-icon {
  font-size: 1.75rem;
}

.stat-content {
  flex: 1;
}

.stat-value {
  font-size: 1.25rem;
  font-weight: 700;
  color: #1f2937;
}

.stat-label {
  font-size: 0.8rem;
  color: #6b7280;
}

/* FILTER */
.filter-bar {
  margin-bottom: 1.5rem;
  display: flex;
  gap: 1rem;
}

.search-box {
  flex: 1;
  display: flex;
  align-items: center;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
}

.search-icon {
  font-size: 1.1rem;
  color: #6b7280;
}

.search-input {
  border: none;
  outline: none;
  flex: 1;
  font-size: 0.9rem;
}

/* LOADING */
.loading-state {
  text-align: center;
  padding: 2rem;
}

.spinner {
  width: 30px;
  height: 30px;
  border: 3px solid #e5e7eb;
  border-top-color: #166534;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 0.75rem;
}

@keyframes spin {
  to { transform: rotate(360deg) }
}

/* EMPTY STATE */
.empty-state {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.empty-icon {
  font-size: 3rem;
  margin-bottom: 0.5rem;
}

/* RECORDS LIST */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.record-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
  transition: all 0.2s;
}

.record-card:hover {
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f3f4f6;
}

.farmer-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.farmer-name {
  font-weight: 700;
  color: #166534;
  font-size: 1.1rem;
}

.record-date {
  font-size: 0.85rem;
  color: #7b8295;
  font-weight: 500;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-badge {
  padding: 0.4rem 0.8rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.pending-badge {
  background: #fef3c7;
  color: #92400e;
}

.view-btn {
  padding: 0.4rem 1rem;
  background: linear-gradient(135deg, #166534, #16a34a);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  transition: all 0.2s;
  white-space: nowrap;
}

.view-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.3);
}

.record-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.75rem 0;
}

.record-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.detail-label {
  color: #7b8295;
  font-weight: 600;
  min-width: 60px;
}

.record-financials {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1.25rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
  margin-bottom: 1.25rem;
}

.financial-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.financial-item > span:first-child {
  font-size: 0.8rem;
  font-weight: 500;
  color: #7b8295;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.financial-item > span:last-child {
  font-size: 1.1rem;
  font-weight: 700;
}

.financial-item.income > span:last-child { color: #2563eb; }
.financial-item.expense > span:last-child { color: #dc2626; }
.financial-item.profit > span:last-child { color: #16a34a; font-weight: 800; }
.financial-item.loss > span:last-child { color: #dc2626; }

/* RECORD ACTIONS */
.record-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f3f4f6;
}

.record-actions button {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-approve {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.btn-approve:hover:not(:disabled) {
  background: #bbf7d0;
  box-shadow: 0 2px 8px rgba(22, 163, 74, 0.2);
}

.btn-approve:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-reject {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.btn-reject:hover:not(:disabled) {
  background: #fecaca;
  box-shadow: 0 2px 8px rgba(220, 38, 38, 0.2);
}

.btn-reject:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* MODAL */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
  max-height: 90vh;
  overflow-y: auto;
  width: 100%;
  max-width: 500px;
}

.modal-container.modal-lg {
  max-width: 800px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  flex-wrap: wrap;
  gap: 1rem;
}

.modal-title-with-status {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex: 1;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.modal-status-badge {
  padding: 0.3rem 0.6rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  transition: all 0.2s;
}

.modal-close:hover {
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-text {
  margin: 0 0 1rem 0;
  color: #374151;
  font-size: 0.95rem;
}

.reject-textarea {
  width: 100%;
  min-height: 100px;
  padding: 0.75rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
}

.reject-textarea:focus {
  outline: none;
  border-color: #166534;
  box-shadow: 0 0 0 3px rgba(22, 101, 52, 0.1);
}

.modal-footer {
  display: flex;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid #e5e7eb;
}

.modal-footer button {
  flex: 1;
  padding: 0.6rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-cancel {
  background: #e5e7eb;
  color: #374151;
}

.btn-cancel:hover {
  background: #d1d5db;
}

.btn-confirm-reject {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.btn-confirm-reject:hover:not(:disabled) {
  background: #fecaca;
}

.btn-confirm-reject:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-close-modal {
  flex: 1;
  padding: 0.6rem 1rem;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-close-modal:hover {
  background: #d1d5db;
}

/* DETAIL MODAL STYLES */
.farmer-banner {
  background: linear-gradient(135deg, #166534, #16a34a);
  color: white;
  padding: 1.25rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 1rem;
}

.banner-icon {
  font-size: 2rem;
}

.banner-name {
  font-weight: 700;
  font-size: 1.2rem;
}

.detail-section {
  margin-bottom: 1.5rem;
}

.detail-section-title {
  font-size: 1rem;
  font-weight: 700;
  color: #1f2937;
  margin: 0 0 0.75rem 0;
  padding: 0.5rem 0;
  border-bottom: 2px solid #f3f4f6;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1rem;
}

.detail-cell {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.cell-label {
  font-size: 0.75rem;
  color: #6b7280;
  font-weight: 600;
  text-transform: uppercase;
}

.cell-value {
  font-size: 0.95rem;
  font-weight: 600;
  color: #1f2937;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.detail-table thead {
  background: #f9fafb;
}

.detail-table th {
  padding: 0.75rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 2px solid #e5e7eb;
}

.detail-table td {
  padding: 0.75rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table td.amt {
  text-align: right;
  font-weight: 600;
}

.detail-table tfoot tr {
  background: #f9fafb;
  font-weight: 600;
}

.foot-label {
  text-align: right;
}

.foot-value {
  text-align: right;
  color: #166534;
}

.expense-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expense-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  font-size: 0.9rem;
  border-bottom: 1px solid #f0f0f0;
}

.expense-row.total-row {
  font-weight: 700;
  font-size: 0.95rem;
  background: #f9fafb;
  padding: 0.75rem;
  border-radius: 4px;
}

.summary-detail-section {
  background: linear-gradient(135deg, #f0fdf4, #dcfce7);
  padding: 1.25rem;
  border-radius: 8px;
}

.grand-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.grand-row {
  display: flex;
  justify-content: space-between;
  font-size: 1rem;
  font-weight: 700;
  padding: 0.75rem;
}

.income-row {
  color: #2563eb;
}

.expense-summary-row {
  color: #dc2626;
}

.net-profit-row {
  color: #16a34a;
  background: rgba(22, 163, 74, 0.05);
  border-radius: 4px;
}

.net-loss-row {
  color: #dc2626;
  background: rgba(220, 38, 38, 0.05);
  border-radius: 4px;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .record-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions {
    width: 100%;
    justify-content: space-between;
  }

  .record-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .record-financials {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .modal-container {
    max-width: 95vw;
  }

  .detail-grid {
    grid-template-columns: 1fr;
  }

  .record-actions {
    flex-direction: column;
  }
}

/* Dark shell when embedded under FarmerIncomeHubPage (Teleport modals use .farmer-income-hub-modal) */
.income-hub-subpage.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2px 1.25rem;
  background: transparent;
}

.income-hub-subpage .page-header {
  margin-bottom: 1.25rem;
  padding: 1.25rem 1.35rem;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.96), rgba(14, 33, 23, 0.95));
  border: 1px solid rgba(126, 184, 145, 0.22);
  border-radius: 22px;
  box-shadow: 0 14px 32px rgba(5, 12, 8, 0.22);
}

.income-hub-subpage .page-title {
  color: #4ade80;
  font-size: clamp(1.35rem, 2vw, 1.85rem);
  font-weight: 800;
}

.income-hub-subpage .page-subtitle {
  color: rgba(220, 252, 231, 0.76);
}

.income-hub-subpage .alert-error {
  background: rgba(127, 29, 29, 0.4);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.45);
}

.income-hub-subpage .alert-success {
  background: rgba(21, 128, 61, 0.35);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.45);
}

.income-hub-subpage .alert-warning {
  background: rgba(146, 64, 14, 0.35);
  color: #fde68a;
  border-color: rgba(250, 204, 21, 0.4);
}

.income-hub-subpage .stat-item {
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.94), rgba(14, 33, 23, 0.92));
  border: 1px solid rgba(126, 184, 145, 0.22);
  box-shadow: 0 12px 28px rgba(5, 12, 8, 0.18);
}

.income-hub-subpage .stat-value {
  color: #ecfdf5;
}

.income-hub-subpage .stat-label {
  color: rgba(220, 252, 231, 0.65);
}

.income-hub-subpage .search-box {
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(126, 184, 145, 0.35);
}

.income-hub-subpage .search-icon {
  color: rgba(186, 240, 200, 0.55);
}

.income-hub-subpage .search-input {
  color: #ecfdf5;
}

.income-hub-subpage .search-input::placeholder {
  color: rgba(220, 252, 231, 0.45);
}

.income-hub-subpage .loading-state {
  color: rgba(220, 252, 231, 0.8);
}

.income-hub-subpage .spinner {
  border-color: rgba(255, 255, 255, 0.15);
  border-top-color: #4ade80;
}

.income-hub-subpage .empty-state {
  color: rgba(220, 252, 231, 0.78);
  padding: 2rem 1.25rem;
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.82), rgba(14, 33, 23, 0.8));
  border: 1px solid rgba(126, 184, 145, 0.2);
}

.income-hub-subpage .record-card {
  background: linear-gradient(145deg, rgba(24, 48, 34, 0.96), rgba(14, 33, 23, 0.94));
  border: 1px solid rgba(126, 184, 145, 0.22);
  box-shadow: 0 14px 32px rgba(5, 12, 8, 0.22);
}

.income-hub-subpage .record-card:hover {
  box-shadow: 0 18px 40px rgba(5, 12, 8, 0.28);
}

.income-hub-subpage .record-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.income-hub-subpage .farmer-name {
  color: #86efac;
}

.income-hub-subpage .record-date {
  color: rgba(220, 252, 231, 0.62);
}

.income-hub-subpage .pending-badge {
  background: rgba(250, 204, 21, 0.16);
  color: #fde68a;
  border: 1px solid rgba(250, 204, 21, 0.35);
}

.income-hub-subpage .detail-label {
  color: rgba(220, 252, 231, 0.55);
}

.income-hub-subpage .record-detail span:last-child {
  color: rgba(236, 253, 245, 0.92);
}

.income-hub-subpage .record-financials {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.income-hub-subpage .financial-item > span:first-child {
  color: rgba(220, 252, 231, 0.55);
}

.income-hub-subpage .financial-item.income > span:last-child {
  color: #93c5fd;
}

.income-hub-subpage .financial-item.expense > span:last-child {
  color: #fca5a5;
}

.income-hub-subpage .financial-item.profit > span:last-child {
  color: #86efac;
}

.income-hub-subpage .record-actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.income-hub-subpage .btn-approve {
  background: rgba(74, 222, 128, 0.2);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.45);
}

.income-hub-subpage .btn-approve:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.3);
}

.income-hub-subpage .btn-reject {
  background: rgba(239, 68, 68, 0.2);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.45);
}

.income-hub-subpage .btn-reject:hover:not(:disabled) {
  background: rgba(239, 68, 68, 0.32);
}

/* Teleported modals (not under .income-hub-subpage in DOM) */
.farmer-income-hub-modal.modal-overlay {
  background: rgba(6, 12, 9, 0.78);
  backdrop-filter: blur(8px);
}

.farmer-income-hub-modal .modal-container {
  background: linear-gradient(145deg, rgba(22, 44, 32, 0.99), rgba(14, 33, 23, 0.99));
  border: 1px solid rgba(126, 184, 145, 0.28);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.farmer-income-hub-modal .modal-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.farmer-income-hub-modal .modal-header h2 {
  color: #ecfdf5;
}

.farmer-income-hub-modal .modal-close {
  color: rgba(220, 252, 231, 0.7);
}

.farmer-income-hub-modal .modal-close:hover {
  color: #fff;
}

.farmer-income-hub-modal .modal-body {
  color: rgba(226, 234, 229, 0.92);
}

.farmer-income-hub-modal .modal-text {
  color: rgba(226, 234, 229, 0.88);
}

.farmer-income-hub-modal .reject-textarea {
  background: rgba(0, 0, 0, 0.32);
  border-color: rgba(126, 184, 145, 0.35);
  color: #ecfdf5;
}

.farmer-income-hub-modal .modal-footer {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.farmer-income-hub-modal .btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(236, 253, 245, 0.9);
}

.farmer-income-hub-modal .btn-cancel:hover {
  background: rgba(255, 255, 255, 0.16);
}

.farmer-income-hub-modal .btn-confirm-reject {
  background: rgba(127, 29, 29, 0.45);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.5);
}

.farmer-income-hub-modal .detail-section-title {
  color: #bbf7d0;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.farmer-income-hub-modal .cell-label {
  color: rgba(220, 252, 231, 0.55);
}

.farmer-income-hub-modal .cell-value {
  color: #ecfdf5;
}

.farmer-income-hub-modal .detail-table thead {
  background: rgba(0, 0, 0, 0.28);
}

.farmer-income-hub-modal .detail-table th {
  color: rgba(236, 253, 245, 0.92);
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.farmer-income-hub-modal .detail-table td {
  color: rgba(226, 234, 229, 0.9);
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.farmer-income-hub-modal .detail-table tfoot tr {
  background: rgba(0, 0, 0, 0.22);
}

.farmer-income-hub-modal .foot-value {
  color: #86efac;
}

.farmer-income-hub-modal .no-data {
  color: rgba(220, 252, 231, 0.6);
}

.farmer-income-hub-modal .expense-row {
  border-bottom-color: rgba(255, 255, 255, 0.06);
  color: rgba(226, 234, 229, 0.88);
}

.farmer-income-hub-modal .expense-row.total-row {
  background: rgba(0, 0, 0, 0.25);
  color: #ecfdf5;
}

.farmer-income-hub-modal .summary-detail-section {
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(126, 184, 145, 0.25);
}

.farmer-income-hub-modal .btn-close-modal {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(236, 253, 245, 0.92);
}

.farmer-income-hub-modal .btn-close-modal:hover {
  background: rgba(255, 255, 255, 0.18);
}
</style>
