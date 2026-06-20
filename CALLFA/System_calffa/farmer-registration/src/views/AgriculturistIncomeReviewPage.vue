<template>
  <div class="page-container agriculturist-income-page" :class="{ 'light-theme': isLight }">
    <div class="page-header">
      <h1 class="page-title">Talaan ng Kita at Pamamahagi ng Tulong</h1>
      <p class="page-subtitle">Tuklasin ang mga inaprubang talaan at pamahalaan ang distribusyon ng tulong sa pagsasaka</p>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'eligible' }"
        @click="activeTab = 'eligible'; fetchRecords()"
      >
        Eligible Records
      </button>
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'assistance' }"
        @click="activeTab = 'assistance'; fetchDistributions()"
      >
        Pamamahagi ng Tulong
      </button>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
      <button class="alert-close" type="button" @click="errorMessage = ''">&times;</button>
    </div>
    <div v-if="successMessage" class="alert alert-success">
      <span>{{ successMessage }}</span>
      <button class="alert-close" type="button" @click="successMessage = ''">&times;</button>
    </div>

    <!-- No barangay warning -->
    <div v-if="!currentUser?.barangay_id" class="alert alert-warning">
      Hindi ka naka-assign sa anumang barangay. Makipag-ugnayan sa admin.
    </div>

    <!-- TAB 1: ELIGIBLE RECORDS -->
    <template v-if="activeTab === 'eligible'">
      <!-- Loading State -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Kinukuha ang mga talaan...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="eligibleRecords.length === 0 && currentUser?.barangay_id" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />
          </svg>
        </div>
        <p>Walang eligible na naitatalang kita pa sa iyong barangay.</p>
      </div>

      <!-- Records Grid -->
      <div v-else class="records-grid">
        <div
          v-for="record in eligibleRecords"
          :key="record.id"
          class="record-card"
        >
          <!-- Header -->
          <div class="card-header">
            <div class="farmer-section">
              <div class="farmer-avatar" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                </svg>
              </div>
              <div class="farmer-details">
                <div class="farmer-name">{{ record.farmer_name }}</div>
                <div class="farmer-date">{{ formatDate(record.created_at) }}</div>
              </div>
            </div>
            <span class="status-badge eligible">Eligible</span>
          </div>

          <!-- Farm Info -->
          <div class="card-info">
            <div class="info-row">
              <span class="info-label">Lawak:</span>
              <span class="info-value">{{ record.area_hectares }} ektarya</span>
            </div>
            <div class="info-row">
              <span class="info-label">Pagtatanim:</span>
              <span class="info-value">{{ record.planting_method === 'sabog' ? 'Sabog' : 'Talok' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Ani:</span>
              <span class="info-value">{{ record.sacks_harvested }} sako</span>
            </div>
          </div>

          <!-- Financials -->
          <div class="card-financials">
            <div class="fin-item">
              <span>Benta:</span>
              <span class="fin-value income">₱{{ parseFloat(record.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="fin-item">
              <span>Gastos:</span>
              <span class="fin-value expense">₱{{ parseFloat(record.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="fin-item">
              <span>Net:</span>
              <span class="fin-value" :class="parseFloat(record.net_income || 0) >= 0 ? 'profit' : 'loss'">
                ₱{{ parseFloat(record.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
              </span>
            </div>
          </div>

          <!-- Actions -->
          <div class="card-actions">
            <button type="button" class="btn-details" @click="openRecordDetail(record)">
              Detalye
            </button>
            <button type="button" class="btn-assistance" @click="openAssistanceForm(record)">
              Gumawa ng Tulong
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- TAB 2: PAMAMAHAGI NG TULONG -->
    <template v-if="activeTab === 'assistance'">
      <!-- Loading State -->
      <div v-if="loadingDistributions" class="loading-state">
        <div class="spinner"></div>
        <p>Kinukuha ang mga pamamahagi...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="distributions.length === 0 && currentUser?.barangay_id" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5m16.125 0H3.093m17.157 0a2.28 2.28 0 00-.782-2.063L14.935 3.93a3.089 3.089 0 00-3.873 0L5.943 5.438A2.28 2.28 0 003.093 7.5" />
          </svg>
        </div>
        <p>Walang programa ng pamamahagi pa sa iyong barangay.</p>
      </div>

      <!-- Assistance Records Grid -->
      <div v-else class="distributions-container">
        <!-- Active Distributions -->
        <div v-if="activeAssistance.length > 0">
          <h3 class="section-title">Naghihintay ng Pagtanggap</h3>
          <div class="records-grid">
            <div v-for="dist in activeAssistance" :key="dist.id" class="record-card">
              <div class="card-header">
                <div class="farmer-section">
                  <div class="farmer-avatar" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="farmer-details">
                    <div class="farmer-name">{{ dist.farmer_name }}</div>
                    <div class="farmer-date">{{ formatDate(dist.created_at) }}</div>
                  </div>
                </div>
                <span class="status-badge pending">Assistance</span>
              </div>

              <div class="card-info">
                <div class="info-row">
                  <span class="info-label">Tulong:</span>
                  <span class="info-value">{{ formatAssistanceType(dist.assistance_type) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Dami:</span>
                  <span class="info-value">{{ dist.notes ? extractQuantityFromNotes(dist.notes) : dist.quantity + ' ' + (dist.unit || 'sako') }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">SMS:</span>
                  <span class="info-value">
                    <span class="sms-status" :class="getSmsStatusClass(dist.sms_status)">
                      {{ formatSmsStatus(dist.sms_status) }}
                    </span>
                  </span>
                </div>
                <div v-if="dist.sms_failure_reason" class="info-row">
                  <span class="info-label">Dahilan:</span>
                  <span class="info-value sms-error">{{ dist.sms_failure_reason }}</span>
                </div>
              </div>

              <div class="card-actions card-actions-split">
                <button
                  v-if="canRetrySms(dist)"
                  type="button"
                  class="btn-sms-retry"
                  @click="retryDistributionSms(dist)"
                >
                  Retry SMS
                </button>
                <button type="button" class="btn-completed" @click="markAsCompleted(dist)">
                  Tapos na
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Completed Distributions -->
        <div v-if="completedAssistance.length > 0">
          <h3 class="section-title">Tapos na</h3>
          <div class="records-grid">
            <div v-for="dist in completedAssistance" :key="dist.id" class="record-card completed">
              <div class="card-header">
                <div class="farmer-section">
                  <div class="farmer-avatar" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
                      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                    </svg>
                  </div>
                  <div class="farmer-details">
                    <div class="farmer-name">{{ dist.farmer_name }}</div>
                    <div class="farmer-date">{{ formatDate(dist.created_at) }}</div>
                  </div>
                </div>
                <span class="status-badge completed">Completed</span>
              </div>

              <div class="card-info">
                <div class="info-row">
                  <span class="info-label">Tulong:</span>
                  <span class="info-value">{{ formatAssistanceType(dist.assistance_type) }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">Dami:</span>
                  <span class="info-value">{{ dist.notes ? extractQuantityFromNotes(dist.notes) : dist.quantity + ' ' + (dist.unit || 'sako') }}</span>
                </div>
                <div class="info-row">
                  <span class="info-label">SMS:</span>
                  <span class="info-value">
                    <span class="sms-status" :class="getSmsStatusClass(dist.sms_status)">
                      {{ formatSmsStatus(dist.sms_status) }}
                    </span>
                  </span>
                </div>
                <div v-if="dist.distribution_date" class="info-row">
                  <span class="info-label">Tapos:</span>
                  <span class="info-value">{{ formatDate(dist.distribution_date) }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </div>

  <!-- DETAIL MODAL -->
  <Teleport to="body">
    <div v-if="showDetailModal" class="modal-overlay agriculturist-income-modal" :class="{ 'light-theme': isLight }" @click.self="closeModal">
      <div class="modal-container modal-lg">
        <div class="modal-header">
          <h2>Detalye ng Talaan ng Kita</h2>
          <button type="button" class="modal-close" @click="closeModal">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedRecord">
          <div class="detail-section">
            <h3>Impormasyon ng Magsasaka</h3>
            <div class="detail-grid">
              <div><strong>Pangalan:</strong> {{ selectedRecord.farmer_name }}</div>
              <div><strong>Petsa:</strong> {{ formatDate(selectedRecord.created_at) }}</div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Detalye ng Kalasahan</h3>
            <div class="detail-grid">
              <div><strong>Lawak:</strong> {{ selectedRecord.area_hectares }} ektarya</div>
              <div><strong>Pagtatanim:</strong> {{ selectedRecord.planting_method === 'sabog' ? 'Sabog' : 'Talok' }}</div>
              <div><strong>Ani:</strong> {{ selectedRecord.sacks_harvested }} sako × {{ selectedRecord.kg_per_sack }} kg</div>
            </div>
          </div>

          <div class="detail-section">
            <h3>Buod ng Pinansyal</h3>
            <div class="detail-grid">
              <div><strong>Halaga ng Ani:</strong> ₱{{ parseFloat(selectedRecord.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</div>
              <div><strong>Kabuuang Gastos:</strong> ₱{{ parseFloat(selectedRecord.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</div>
              <div><strong>Netong Kita:</strong> ₱{{ parseFloat(selectedRecord.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>

  <!-- ASSISTANCE FORM MODAL -->
  <Teleport to="body">
    <div v-if="showAssistanceModal" class="modal-overlay agriculturist-income-modal" :class="{ 'light-theme': isLight }" @click.self="closeModal">
      <div class="modal-container modal-md assistance-form-modal">
        <div class="modal-header">
          <h2>Lumikha ng Tulong</h2>
          <button type="button" class="modal-close" @click="closeModal" aria-label="Isara">&times;</button>
        </div>
        <div v-if="selectedRecord" class="assistance-form-content">
          <div class="modal-body assistance-form-body">
            <div class="assistance-farmer-banner">
              <span class="assistance-farmer-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <div class="assistance-farmer-text">
                <span class="assistance-farmer-label">Magsasaka</span>
                <strong class="assistance-farmer-name">{{ selectedRecord.farmer_name }}</strong>
              </div>
            </div>

            <div class="assistance-section">
              <h3 class="assistance-section-title">Dami ng tulong</h3>
              <div class="assistance-qty-grid">
                <div class="form-group">
                  <label for="assistance-fertilizer">Pataba (Fertilizer)</label>
                  <div class="input-group">
                    <input
                      id="assistance-fertilizer"
                      v-model.number="assistanceForm.fertilizer_sacks"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="form-input"
                    />
                    <span class="input-unit">sako</span>
                  </div>
                </div>
                <div class="form-group">
                  <label for="assistance-seeds">Binhi (Seeds)</label>
                  <div class="input-group">
                    <input
                      id="assistance-seeds"
                      v-model.number="assistanceForm.seed_sacks"
                      type="number"
                      min="0"
                      placeholder="0"
                      class="form-input"
                    />
                    <span class="input-unit">sako</span>
                  </div>
                </div>
              </div>
            </div>

            <div class="form-group assistance-notes">
              <label for="assistance-notes">Tala (opsyonal)</label>
              <textarea
                id="assistance-notes"
                v-model="assistanceForm.notes"
                placeholder="Anumang karagdagang impormasyon..."
                class="form-input form-textarea"
                rows="3"
              ></textarea>
            </div>
          </div>

          <div class="modal-footer assistance-form-footer">
            <button type="button" @click="closeModal" class="btn-cancel">Huwag</button>
            <button type="button" @click="submitAssistance" class="btn-submit" :disabled="submittingAssistance">
              {{ submittingAssistance ? 'Sinusubmit...' : 'Lumikha' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const currentUser = computed(() => authStore.currentUser)

// Tab state
const activeTab = ref('eligible')

// Messages
const errorMessage = ref('')
const successMessage = ref('')

// Record states
const loading = ref(false)
const records = ref([])
const eligibleRecords = computed(() => {
  // Filter eligible records that don't have any distributions yet
  const distributedRecordIds = new Set(distributions.value.map(d => d.income_record_id))
  return records.value.filter(r => r.status === 'Eligible' && !distributedRecordIds.has(r.id))
})

// Distribution states
const loadingDistributions = ref(false)
const distributions = ref([])
const activeAssistance = computed(() => distributions.value.filter(d => d.status === 'Pending' || d.status === 'Ready for Distribution'))
const completedAssistance = computed(() => distributions.value.filter(d => d.status === 'Distributed' || d.status === 'Confirmed Received'))

// Modals
const showDetailModal = ref(false)
const showAssistanceModal = ref(false)
const selectedRecord = ref(null)

// Assistance form
const submittingAssistance = ref(false)
const assistanceForm = ref({
  fertilizer_sacks: 0,
  seed_sacks: 0,
  notes: ''
})

// Fetch records
const fetchRecords = async () => {
  if (!currentUser.value?.barangay_id) return
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`/api/farmer-income/by-barangay/${currentUser.value.barangay_id}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
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

// Fetch distributions
const fetchDistributions = async () => {
  if (!currentUser.value?.barangay_id) return
  loadingDistributions.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`/api/farmer-income/distribution/by-barangay/${currentUser.value.barangay_id}`, {
      headers: { 'Authorization': `Bearer ${authStore.token}` }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi makuha ang mga pamamahagi.')
    distributions.value = data
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loadingDistributions.value = false
  }
}

// Modal functions
const openRecordDetail = (record) => {
  selectedRecord.value = record
  showDetailModal.value = true
}

const openAssistanceForm = (record) => {
  selectedRecord.value = record
  assistanceForm.value = {
    fertilizer_sacks: 0,
    seed_sacks: 0,
    notes: ''
  }
  showAssistanceModal.value = true
}

const closeModal = () => {
  showDetailModal.value = false
  showAssistanceModal.value = false
  selectedRecord.value = null
}

// Submit assistance
const submitAssistance = async () => {
  const fertilizer = assistanceForm.value.fertilizer_sacks || 0
  const seeds = assistanceForm.value.seed_sacks || 0
  
  if (fertilizer === 0 && seeds === 0) {
    errorMessage.value = 'Maglagay ng dami para sa Pataba o Binhi.'
    return
  }
  
  submittingAssistance.value = true
  errorMessage.value = ''
  
  try {
    // Determine assistance type based on which values are entered
    let assistanceType = ''
    if (fertilizer > 0 && seeds > 0) {
      assistanceType = 'both'
    } else if (fertilizer > 0) {
      assistanceType = 'fertilizer'
    } else {
      assistanceType = 'seeds'
    }
    
    const quantity = Math.max(fertilizer, seeds)
    
    const res = await fetch('/api/farmer-income/distribution/create', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        income_record_id: selectedRecord.value.id,
        assistance_type: assistanceType,
        quantity: quantity,
        unit: 'sako',
        notes: `Pataba: ${fertilizer} sako, Binhi: ${seeds} sako${assistanceForm.value.notes ? ' - ' + assistanceForm.value.notes : ''}`
      })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'May problema sa paglikha ng distribution record.')
    
    successMessage.value = getSmsFeedbackMessage(data.sms)
    closeModal()
    await fetchRecords()
    await fetchDistributions()
  } catch (err) {
    console.error('Assistance submission error:', err)
    errorMessage.value = err.message
  } finally {
    submittingAssistance.value = false
  }
}

// Mark assistance as completed
const markAsCompleted = async (distribution) => {
  if (!confirm('I-confirm na natanggap na ang assistance?')) return
  
  loadingDistributions.value = true
  errorMessage.value = ''
  
  try {
    const res = await fetch(`/api/farmer-income/distribution/${distribution.id}/status`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({ status: 'Distributed' })
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'May problema.')
    
    successMessage.value = 'Matagumpay na na-update ang tulong!'
    await fetchDistributions()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loadingDistributions.value = false
  }
}

// Helpers
const formatDate = (dateStr) => {
  if (!dateStr) return ''
  return new Date(dateStr).toLocaleDateString('fil-PH', { year: 'numeric', month: 'long', day: 'numeric' })
}

const formatAssistanceType = (type) => {
  const map = { 'fertilizer': 'Pataba', 'seeds': 'Binhi', 'both': 'Pataba at Binhi' }
  return map[type] || type
}

const extractQuantityFromNotes = (notes) => {
  // Extract the quantity breakdown from notes (format: "Pataba: X sako, Binhi: Y sako - ...")
  if (!notes) return ''
  const quantityPart = notes.split(' - ')[0] // Get the part before any user notes
  return quantityPart.trim()
}

const formatSmsStatus = (status) => {
  const map = {
    sent: 'Naipadala',
    failed: 'Hindi naipadala',
    not_configured: 'Hindi naka-set ang SMS (PhilSMS sa server)',
    pending: 'Nakaabang'
  }
  return map[status] || 'Walang status'
}

const getSmsStatusClass = (status) => {
  const map = {
    sent: 'status-sent',
    failed: 'status-failed',
    not_configured: 'status-warning',
    pending: 'status-pending'
  }
  return map[status] || 'status-pending'
}

const canRetrySms = (distribution) => {
  return ['failed', 'not_configured', 'pending'].includes(distribution.sms_status)
}

const getSmsFeedbackMessage = (sms) => {
  if (!sms) return 'Matagumpay na lumikha ng tulong!'
  if (sms.success) {
    return `Matagumpay na lumikha ng tulong at naipadala ang SMS sa ${sms.recipient || 'magsasaka'}.`
  }
  if (sms.status === 'not_configured') {
    return 'Matagumpay na lumikha ng tulong. Hindi naipadala ang SMS dahil hindi naka-enable ang PhilSMS o ibang provider sa backend (.env), pero may in-app notification ang magsasaka.'
  }
  return `Matagumpay na lumikha ng tulong, pero hindi naipadala ang SMS${sms.error ? `: ${sms.error}` : '.'} May in-app notification pa rin ang magsasaka.`
}

const retryDistributionSms = async (distribution) => {
  loadingDistributions.value = true
  errorMessage.value = ''

  try {
    const res = await fetch(`/api/farmer-income/distribution/${distribution.id}/retry-sms`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'May problema sa pagpapadala ng SMS.')

    successMessage.value = getSmsFeedbackMessage(data.sms)
    await fetchDistributions()
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loadingDistributions.value = false
  }
}

onMounted(() => {
  fetchRecords()
  fetchDistributions()
})
</script>

<style scoped>
* {
  box-sizing: border-box;
}

.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
  background-color: #f5f5f5;
  min-height: 100vh;
}

.page-header {
  margin-bottom: 30px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.page-title {
  font-size: 2rem;
  font-weight: bold;
  color: #2d5016;
  margin: 0 0 10px 0;
}

.page-subtitle {
  color: #666;
  font-size: 0.95rem;
  margin: 0;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  gap: 10px;
  margin-bottom: 30px;
  background-color: white;
  padding: 15px 20px;
  border-radius: 8px;
  border-bottom: 2px solid #e0e0e0;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.tab-btn {
  padding: 10px 20px;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-size: 0.95rem;
  color: #666;
  transition: all 0.3s ease;
  font-weight: 500;
}

.tab-btn.active {
  color: #2d5016;
  border-bottom-color: #2d5016;
}

.tab-btn:hover:not(.active) {
  color: #4a7c1c;
}

/* Alerts */
.alert {
  padding: 12px 16px;
  margin-bottom: 20px;
  border-radius: 10px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 500;
  gap: 12px;
}

.alert-success {
  background-color: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
}

.alert-error {
  background-color: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
}

.alert-warning {
  background-color: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
}

.alert-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 1.5rem;
  line-height: 1;
  flex-shrink: 0;
}

/* States */
.loading-state,
.empty-state {
  text-align: center;
  padding: 60px 20px;
  background-color: white;
  border-radius: 8px;
  margin-bottom: 20px;
}

.loading-state p,
.empty-state p {
  margin: 0;
}

.spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 20px;
  border: 4px solid #f3f3f3;
  border-top: 4px solid #2d5016;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.empty-icon {
  width: 3.25rem;
  height: 3.25rem;
  margin: 0 auto 15px;
  color: rgba(45, 80, 22, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-icon svg {
  width: 100%;
  height: 100%;
}

/* Records Grid */
.records-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.record-card {
  background: white;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  display: flex;
  flex-direction: column;
}

.record-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  transform: translateY(-2px);
}

.record-card.completed {
  opacity: 0.8;
}

/* Card Header */
.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  border-bottom: 1px solid #eee;
}

.farmer-section {
  display: flex;
  gap: 12px;
  align-items: center;
  flex: 1;
  min-width: 0;
}

.farmer-avatar {
  width: 52px;
  height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: rgba(45, 80, 22, 0.1);
  color: #2d5016;
  flex-shrink: 0;
}

.farmer-avatar svg {
  width: 28px;
  height: 28px;
}

.farmer-details {
  display: flex;
  flex-direction: column;
  min-width: 0;
  text-align: left;
}

.farmer-name {
  font-weight: 600;
  color: #333;
  font-size: 0.95rem;
  overflow-wrap: break-word;
}

.farmer-date {
  font-size: 0.8rem;
  color: #999;
}

.status-badge {
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.status-badge.eligible {
  background-color: #f3e5f5;
  color: #7b1fa2;
}

.status-badge.pending {
  background-color: #fff3e0;
  color: #f57c00;
}

.status-badge.completed {
  background-color: #e8f5e9;
  color: #2e7d32;
}

/* Card Info */
.card-info {
  padding: 16px;
  flex: 1;
}

.info-row {
  display: flex;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 0.9rem;
  align-items: flex-start;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-label {
  color: #999;
  font-weight: 500;
  flex-shrink: 0;
}

.info-value {
  color: #333;
  font-weight: 600;
  text-align: right;
  min-width: 0;
  overflow-wrap: break-word;
}

.sms-status {
  display: inline-flex;
  align-items: center;
  padding: 2px 10px;
  border-radius: 999px;
  font-size: 0.78rem;
  font-weight: 700;
}

.sms-status.status-sent {
  background-color: #dcfce7;
  color: #166534;
}

.sms-status.status-failed {
  background-color: #fee2e2;
  color: #991b1b;
}

.sms-status.status-warning {
  background-color: #fef3c7;
  color: #92400e;
}

.sms-status.status-pending {
  background-color: #e0f2fe;
  color: #075985;
}

.sms-error {
  color: #b91c1c;
  max-width: 72%;
}

/* Card Financials */
.card-financials {
  padding: 16px;
  background-color: #f9f9f9;
  border-top: 1px solid #eee;
}

.fin-item {
  display: flex;
  justify-content: space-between;
  font-size: 0.9rem;
  margin-bottom: 8px;
}

.fin-item:last-child {
  margin-bottom: 0;
}

.fin-value {
  font-weight: 600;
}

.fin-value.income {
  color: #388e3c;
}

.fin-value.expense {
  color: #d32f2f;
}

.fin-value.profit {
  color: #2e7d32;
}

.fin-value.loss {
  color: #c62828;
}

/* Card Actions */
.card-actions {
  display: flex;
  gap: 8px;
  padding: 16px;
  border-top: 1px solid #eee;
}

.card-actions button {
  flex: 1;
  padding: 8px 12px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.3s ease;
}

.card-actions-split {
  flex-wrap: wrap;
}

.btn-details {
  background-color: #f0f0f0;
  color: #333;
}

.btn-details:hover {
  background-color: #ddd;
}

.btn-assistance {
  background-color: #2d5016;
  color: white;
}

.btn-assistance:hover {
  background-color: #1f3a10;
}

.btn-completed {
  background-color: #e8f5e9;
  color: #2e7d32;
}

.btn-completed:hover {
  background-color: #c8e6c9;
}

.btn-sms-retry {
  background-color: #eff6ff;
  color: #1d4ed8;
}

.btn-sms-retry:hover {
  background-color: #dbeafe;
}

/* Distributions */
.distributions-container {
  display: flex;
  flex-direction: column;
  gap: 30px;
}

.section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #2d5016;
  margin: 0 0 20px 0;
}

/* Modal */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-container {
  background: white;
  border-radius: 8px;
  box-shadow: 0 5px 40px rgba(0, 0, 0, 0.3);
  max-height: 90vh;
  overflow-y: auto;
}

.modal-lg {
  width: 90%;
  max-width: 700px;
}

.modal-md {
  width: 100%;
  max-width: 520px;
}

/* Assistance form modal layout */
.assistance-form-modal {
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.assistance-form-content {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.assistance-form-body {
  padding: 20px 22px 8px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.assistance-farmer-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 16px;
  border-radius: 14px;
  border: 2px solid rgba(22, 101, 52, 0.28);
  background: #f0fdf4;
}

.assistance-farmer-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 10px;
  background: #dcfce7;
  border: 1px solid #86efac;
  color: #166534;
  flex-shrink: 0;
}

.assistance-farmer-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.assistance-farmer-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.assistance-farmer-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #166534;
}

.assistance-farmer-name {
  font-size: 1rem;
  font-weight: 800;
  color: #052e16;
  line-height: 1.3;
  overflow-wrap: anywhere;
}

.assistance-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.assistance-section-title {
  margin: 0;
  font-size: 0.82rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: #166534;
  padding-bottom: 8px;
  border-bottom: 2px solid rgba(22, 101, 52, 0.22);
}

.assistance-qty-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 14px;
}

.assistance-form-body .form-group {
  margin-bottom: 0;
  gap: 6px;
}

.assistance-form-body .form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: #166534;
}

.assistance-form-body .input-group {
  min-height: 44px;
}

.assistance-form-body .form-input {
  min-height: 44px;
  padding: 10px 12px;
  border-radius: 10px 0 0 10px;
  font-size: 0.95rem;
  font-weight: 600;
}

.assistance-form-body .input-unit {
  min-width: 3.25rem;
  padding: 10px 12px;
  font-size: 0.85rem;
  font-weight: 700;
  border-radius: 0 10px 10px 0;
}

.assistance-notes .form-textarea {
  min-height: 88px;
  padding: 12px 14px;
  border-radius: 10px;
  resize: vertical;
  line-height: 1.45;
}

.assistance-form-footer {
  margin-top: 0;
  padding: 16px 22px 22px;
  border-top: 2px solid rgba(22, 101, 52, 0.22);
  background: #fafdfa;
}

.assistance-form-footer .btn-cancel,
.assistance-form-footer .btn-submit {
  min-height: 46px;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 700;
}

.assistance-form-footer .btn-cancel {
  flex: 0 1 38%;
  background: #ffffff;
  color: #052e16;
  border: 2px solid #86efac;
}

.assistance-form-footer .btn-cancel:hover {
  background: #f0fdf4;
  border-color: #166534;
}

.assistance-form-footer .btn-submit {
  flex: 1 1 62%;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px;
  border-bottom: 1px solid #eee;
  background-color: #f9f9f9;
}

.modal-header h2 {
  margin: 0;
  color: #2d5016;
  font-size: 1.2rem;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  line-height: 1;
}

.modal-body {
  padding: 20px;
}

.detail-section {
  margin-bottom: 20px;
}

.detail-section h3 {
  margin: 0 0 12px 0;
  font-size: 1rem;
  color: #2d5016;
}

.detail-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  font-size: 0.9rem;
}

.detail-grid div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid #eee;
}

.detail-grid strong {
  color: #666;
  flex-shrink: 0;
}

/* Forms */
.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  margin-bottom: 6px;
  font-weight: 500;
  color: #333;
}

.form-input {
  padding: 8px 12px;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-textarea {
  min-height: 80px;
  resize: vertical;
}

.form-input:focus {
  outline: none;
  border-color: #2d5016;
  box-shadow: 0 0 0 3px rgba(45, 80, 22, 0.1);
}

.form-input:disabled {
  background-color: #f5f5f5;
  cursor: not-allowed;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.input-group {
  display: flex;
  align-items: stretch;
  gap: 0;
}

.input-group .form-input {
  flex: 1;
  margin-bottom: 0;
  border-radius: 4px 0 0 4px;
}

.input-unit {
  padding: 8px 12px;
  background-color: #f5f5f5;
  border: 1px solid #ccc;
  border-radius: 0 4px 4px 0;
  border-left: none;
  font-weight: 500;
  color: #666;
  font-size: 0.9rem;
  display: inline-flex;
  align-items: center;
}

.modal-footer {
  display: flex;
  gap: 10px;
  padding-top: 20px;
  border-top: 1px solid #eee;
}

.btn-cancel,
.btn-submit {
  flex: 1;
  padding: 10px 16px;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 600;
  transition: all 0.3s ease;
}

.btn-cancel {
  background-color: #f0f0f0;
  color: #333;
}

.btn-cancel:hover {
  background-color: #ddd;
}

.btn-submit {
  background-color: #2d5016;
  color: white;
}

.btn-submit:hover:not(:disabled) {
  background-color: #1f3a10;
}

.btn-submit:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

/* Shared layout when embedded in Farmer Income Hub */
.page-container.agriculturist-income-page {
  max-width: 100%;
  padding: 0;
  background: transparent;
  min-height: auto;
}

/* Dark forest theme */
.page-container.agriculturist-income-page:not(.light-theme) :is(
  .page-header,
  .tab-navigation,
  .record-card,
  .loading-state,
  .empty-state,
  .detail-section,
  .card-financials
) {
  background: linear-gradient(145deg, rgba(20, 38, 28, 0.95), rgba(14, 29, 21, 0.93)) !important;
  border: 2px solid rgba(4, 14, 10, 0.52) !important;
  border-radius: 20px;
  box-shadow: 0 12px 28px rgba(6, 12, 9, 0.24) !important;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .modal-container {
  background: linear-gradient(145deg, rgba(20, 38, 28, 0.95), rgba(14, 29, 21, 0.93)) !important;
  border: 2px solid rgba(4, 14, 10, 0.52) !important;
  border-radius: 20px;
  box-shadow: 0 12px 28px rgba(6, 12, 9, 0.24) !important;
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .page-header,
  .record-card,
  .loading-state,
  .empty-state
) {
  position: relative;
  overflow: hidden;
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .page-header,
  .record-card
)::before {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.03), transparent 40%, transparent 100%);
  pointer-events: none;
}

.page-container.agriculturist-income-page:not(.light-theme) .page-header {
  margin-bottom: 22px;
  padding: 20px 24px;
}

.page-container.agriculturist-income-page:not(.light-theme) .page-title {
  font-size: clamp(1.8rem, 2.2vw, 2.35rem);
  font-weight: 900;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  letter-spacing: -0.04em;
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .page-subtitle,
  .farmer-name,
  .farmer-date,
  .info-label,
  .info-value,
  .info-row,
  .fin-item,
  .fin-item span,
  .fin-value,
  .fin-value.income,
  .fin-value.expense,
  .fin-value.profit,
  .fin-value.loss,
  .section-title,
  .detail-grid div,
  .detail-grid strong,
  .detail-section h3,
  .form-group label,
  .input-unit,
  .loading-state p,
  .empty-state p,
  .tab-btn,
  .tab-btn.active,
  .sms-error
) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container.agriculturist-income-page:not(.light-theme) .tab-navigation {
  gap: 12px;
  margin-bottom: 24px;
  padding: 14px 16px;
  border-bottom: none;
}

.page-container.agriculturist-income-page:not(.light-theme) .tab-btn {
  min-height: 48px;
  padding: 12px 20px;
  background: rgba(14, 33, 23, 0.92) !important;
  border: 2px solid rgba(134, 239, 172, 0.32) !important;
  border-bottom: 2px solid rgba(134, 239, 172, 0.32) !important;
  border-radius: 14px;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-weight: 700;
  box-shadow: 0 4px 12px rgba(4, 18, 12, 0.22);
}

.page-container.agriculturist-income-page:not(.light-theme) .tab-btn.active {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: linear-gradient(145deg, rgba(28, 116, 68, 0.95), rgba(24, 84, 55, 0.95)) !important;
  border-color: rgba(134, 239, 172, 0.45) !important;
  box-shadow: 0 6px 16px rgba(4, 18, 12, 0.28);
}

.page-container.agriculturist-income-page:not(.light-theme) .tab-btn:hover:not(.active) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: rgba(24, 48, 34, 0.96) !important;
  border-color: rgba(134, 239, 172, 0.45) !important;
}

.page-container.agriculturist-income-page:not(.light-theme) .alert-success {
  background: rgba(34, 197, 94, 0.14);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.28);
}

.page-container.agriculturist-income-page:not(.light-theme) .alert-error {
  background: rgba(239, 68, 68, 0.12);
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.28);
}

.page-container.agriculturist-income-page:not(.light-theme) .alert-warning {
  background: rgba(245, 158, 11, 0.12);
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.28);
}

.page-container.agriculturist-income-page:not(.light-theme) .records-grid {
  gap: 1.25rem;
  margin-bottom: 24px;
}

.page-container.agriculturist-income-page:not(.light-theme) .record-card {
  border-radius: 18px;
}

.page-container.agriculturist-income-page:not(.light-theme) .record-card.completed {
  opacity: 0.92;
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .card-header,
  .card-actions,
  .detail-grid div,
  .modal-header,
  .modal-footer
) {
  border-color: rgba(4, 14, 10, 0.44) !important;
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .card-header,
  .card-info,
  .card-financials,
  .card-actions
),
.modal-overlay.agriculturist-income-modal:not(.light-theme) :is(
  .modal-header,
  .modal-body
) {
  padding: 18px;
}

.page-container.agriculturist-income-page:not(.light-theme) .farmer-avatar {
  background: rgba(74, 222, 128, 0.12);
  color: #ffffff;
}

.page-container.agriculturist-income-page:not(.light-theme) .empty-icon {
  color: #ffffff;
}

.page-container.agriculturist-income-page:not(.light-theme) .spinner {
  border-color: rgba(255, 255, 255, 0.12);
  border-top-color: #ffffff;
}

.page-container.agriculturist-income-page:not(.light-theme) .status-badge {
  padding: 0.45rem 0.85rem;
  font-weight: 700;
}

.page-container.agriculturist-income-page:not(.light-theme) .status-badge.eligible {
  background-color: rgba(168, 85, 247, 0.16);
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container.agriculturist-income-page:not(.light-theme) .status-badge.pending {
  background-color: rgba(251, 191, 36, 0.15);
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container.agriculturist-income-page:not(.light-theme) .status-badge.completed {
  background-color: rgba(74, 222, 128, 0.14);
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container.agriculturist-income-page:not(.light-theme) .fin-item {
  padding: 0.65rem 0;
  font-size: 0.92rem;
}

.page-container.agriculturist-income-page:not(.light-theme) .card-financials {
  background: rgba(255, 255, 255, 0.03) !important;
}

.page-container.agriculturist-income-page:not(.light-theme) .fin-value {
  font-weight: 800;
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .btn-details,
  .btn-assistance,
  .btn-completed,
  .btn-cancel,
  .btn-submit,
  .btn-sms-retry
) {
  min-height: 42px;
  border-radius: 10px;
  font-weight: 700;
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .btn-details,
  .btn-cancel
) {
  background-color: rgba(255, 255, 255, 0.08);
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1px solid rgba(126, 184, 145, 0.16);
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .btn-details,
  .btn-cancel
):hover {
  background-color: rgba(255, 255, 255, 0.14);
}

.page-container.agriculturist-income-page:not(.light-theme) :is(
  .btn-assistance,
  .btn-submit
) {
  background: linear-gradient(135deg, #166534, #16a34a);
  color: #fff;
  border: none;
}

.page-container.agriculturist-income-page:not(.light-theme) .btn-completed {
  background-color: rgba(74, 222, 128, 0.12);
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1px solid rgba(74, 222, 128, 0.22);
}

.page-container.agriculturist-income-page:not(.light-theme) .btn-sms-retry {
  background: rgba(59, 130, 246, 0.16);
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1px solid rgba(96, 165, 250, 0.35);
}

.page-container.agriculturist-income-page:not(.light-theme) .btn-completed:hover {
  background-color: rgba(74, 222, 128, 0.2);
}

.page-container.agriculturist-income-page:not(.light-theme) .btn-sms-retry:hover {
  background: rgba(59, 130, 246, 0.26);
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) {
  background-color: rgba(0, 0, 0, 0.64);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .modal-header {
  background-color: rgba(255, 255, 255, 0.03);
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .modal-close {
  color: rgba(220, 252, 231, 0.72);
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .modal-close:hover {
  color: #f0fdf4;
}

.page-container.agriculturist-income-page:not(.light-theme) .detail-grid {
  gap: 10px;
}

.page-container.agriculturist-income-page:not(.light-theme) .section-title {
  font-size: 1.2rem;
  font-weight: 600;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  margin: 0 0 20px 0;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) :is(
  .modal-header h2,
  .detail-section h3,
  .form-group label,
  .detail-grid div,
  .detail-grid strong,
  .assistance-farmer-label,
  .assistance-farmer-name,
  .assistance-section-title
) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .form-input {
  background: rgba(152, 174, 166, 0.14);
  border: 1px solid rgba(126, 184, 145, 0.18);
  border-radius: 10px;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .form-input:focus {
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .form-input:disabled {
  background-color: rgba(255, 255, 255, 0.06);
  color: rgba(220, 252, 231, 0.58);
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .input-unit {
  background-color: rgba(255, 255, 255, 0.06);
  border-color: rgba(126, 184, 145, 0.18);
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .input-group .form-input {
  border-radius: 10px 0 0 10px;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .input-unit {
  border-radius: 0 10px 10px 0;
}

.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-sent,
.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-failed,
.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-warning,
.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-pending {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-sent {
  background-color: rgba(34, 197, 94, 0.2);
}

.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-failed {
  background-color: rgba(239, 68, 68, 0.18);
}

.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-warning {
  background-color: rgba(245, 158, 11, 0.15);
}

.page-container.agriculturist-income-page:not(.light-theme) .sms-status.status-pending {
  background-color: rgba(56, 189, 248, 0.15);
}

.page-container.agriculturist-income-page:not(.light-theme) .sms-error {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

/* Light mode — readable white surfaces */
.page-container.agriculturist-income-page.light-theme :is(
  .page-header,
  .tab-navigation,
  .record-card,
  .loading-state,
  .empty-state
) {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.08) !important;
  border-radius: 20px;
}

.modal-overlay.agriculturist-income-modal.light-theme .modal-container {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 24px 56px rgba(22, 101, 52, 0.15) !important;
  border-radius: 20px;
}

.page-container.agriculturist-income-page.light-theme .page-header {
  margin-bottom: 22px;
  padding: 20px 24px;
}

.page-container.agriculturist-income-page.light-theme .page-title {
  color: #052e16 !important;
  font-size: clamp(1.8rem, 2.2vw, 2.35rem);
  font-weight: 900;
}

.page-container.agriculturist-income-page.light-theme .page-subtitle {
  color: #166534 !important;
}

.page-container.agriculturist-income-page.light-theme .tab-navigation {
  gap: 12px;
  margin-bottom: 24px;
  padding: 14px 16px;
  border-bottom: none !important;
}

.page-container.agriculturist-income-page.light-theme .tab-btn {
  min-height: 48px;
  padding: 12px 20px;
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  border-bottom: 2px solid #86efac !important;
  border-radius: 14px;
  color: #052e16 !important;
  font-weight: 700;
}

.page-container.agriculturist-income-page.light-theme .tab-btn.active {
  color: #052e16 !important;
  background: #ffffff !important;
  border-color: #166534 !important;
}

.page-container.agriculturist-income-page.light-theme .tab-btn:hover:not(.active) {
  border-color: #166534 !important;
}

.page-container.agriculturist-income-page.light-theme .record-card {
  border-left: 4px solid #22c55e !important;
}

.page-container.agriculturist-income-page.light-theme :is(
  .card-header,
  .card-financials,
  .card-actions
) {
  border-color: rgba(22, 101, 52, 0.42) !important;
}

.page-container.agriculturist-income-page.light-theme .card-header {
  border-bottom: 2px solid rgba(22, 101, 52, 0.42) !important;
}

.page-container.agriculturist-income-page.light-theme .card-financials {
  border-top: 2px solid rgba(22, 101, 52, 0.42) !important;
}

.page-container.agriculturist-income-page.light-theme .card-actions {
  border-top: 2px solid rgba(22, 101, 52, 0.42) !important;
}

.page-container.agriculturist-income-page.light-theme .info-row {
  border-bottom: 1px solid rgba(22, 101, 52, 0.28);
  padding-bottom: 8px;
}

.page-container.agriculturist-income-page.light-theme .info-row:last-child {
  border-bottom: none;
  padding-bottom: 0;
}

.page-container.agriculturist-income-page.light-theme .fin-item {
  border-bottom: 2px solid rgba(22, 101, 52, 0.24);
}

.page-container.agriculturist-income-page.light-theme .fin-item:last-child {
  border-bottom: none;
}

.page-container.agriculturist-income-page.light-theme .card-financials {
  background: #f9fafb !important;
}

.page-container.agriculturist-income-page.light-theme .farmer-name {
  color: #052e16 !important;
}

.page-container.agriculturist-income-page.light-theme .farmer-date {
  color: #6b7280 !important;
}

.page-container.agriculturist-income-page.light-theme .farmer-avatar {
  background: #f0fdf4 !important;
  color: #166534 !important;
}

.page-container.agriculturist-income-page.light-theme .info-label {
  color: #166534 !important;
}

.page-container.agriculturist-income-page.light-theme .info-value {
  color: #052e16 !important;
}

.page-container.agriculturist-income-page.light-theme .fin-item {
  color: #374151 !important;
}

.page-container.agriculturist-income-page.light-theme .fin-item span:first-child {
  color: #166534 !important;
  font-weight: 700;
}

.page-container.agriculturist-income-page.light-theme .fin-value.income {
  color: #1e40af !important;
}

.page-container.agriculturist-income-page.light-theme .fin-value.expense {
  color: #b91c1c !important;
}

.page-container.agriculturist-income-page.light-theme .fin-value.profit {
  color: #15803d !important;
}

.page-container.agriculturist-income-page.light-theme .fin-value.loss {
  color: #b91c1c !important;
}

.page-container.agriculturist-income-page.light-theme .status-badge.eligible {
  background-color: #f3e8ff !important;
  color: #7e22ce !important;
  border: 1px solid #c084fc;
}

.page-container.agriculturist-income-page.light-theme .status-badge.pending {
  background-color: #fff7ed !important;
  color: #c2410c !important;
  border: 1px solid #fdba74;
}

.page-container.agriculturist-income-page.light-theme .status-badge.completed {
  background-color: #dcfce7 !important;
  color: #15803d !important;
  border: 1px solid #86efac;
}

.page-container.agriculturist-income-page.light-theme .btn-details {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 2px solid #86efac !important;
}

.page-container.agriculturist-income-page.light-theme .btn-details:hover {
  border-color: #166534 !important;
  background: #f0fdf4 !important;
}

.page-container.agriculturist-income-page.light-theme :is(
  .btn-assistance,
  .btn-submit
) {
  background: linear-gradient(135deg, #166534, #16a34a) !important;
  color: #ffffff !important;
  border: none !important;
}

.page-container.agriculturist-income-page.light-theme .btn-cancel {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 2px solid #86efac !important;
}

.page-container.agriculturist-income-page.light-theme :is(
  .loading-state p,
  .empty-state p
) {
  color: #374151 !important;
}

.page-container.agriculturist-income-page.light-theme .empty-icon {
  color: #166534 !important;
}

.page-container.agriculturist-income-page.light-theme .spinner {
  border-color: rgba(22, 101, 52, 0.15) !important;
  border-top-color: #16a34a !important;
}

.modal-overlay.agriculturist-income-modal.light-theme {
  background-color: rgba(5, 46, 22, 0.35) !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .modal-header {
  border-bottom: 2px solid rgba(22, 101, 52, 0.44) !important;
  background: #ffffff !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .modal-footer {
  border-top: 2px solid rgba(22, 101, 52, 0.44) !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .detail-section {
  background: #ffffff !important;
  border: 2px solid rgba(22, 101, 52, 0.36) !important;
  border-radius: 14px !important;
  padding: 16px 18px !important;
  margin-bottom: 16px !important;
  box-shadow: none !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .detail-section:last-child {
  margin-bottom: 0 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .detail-section h3 {
  color: #166534 !important;
  padding-bottom: 10px !important;
  margin-bottom: 12px !important;
  border-bottom: 2px solid rgba(22, 101, 52, 0.32) !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .detail-grid div {
  border-bottom: 2px solid rgba(22, 101, 52, 0.28) !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .detail-grid div:last-child {
  border-bottom: none !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .detail-grid strong {
  color: #166534 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme :is(
  .modal-header h2,
  .form-group label,
  .detail-grid div
) {
  color: #052e16 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .modal-close {
  color: #166534 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .form-input {
  background: #ffffff !important;
  border: 2px solid rgba(22, 101, 52, 0.36) !important;
  color: #052e16 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .input-unit {
  background: #f0fdf4 !important;
  border: 2px solid rgba(22, 101, 52, 0.36) !important;
  border-left: none !important;
  color: #166534 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .input-group .form-input {
  border-right: none !important;
}

/* Assistance form — light mode */
.modal-overlay.agriculturist-income-modal.light-theme .assistance-form-modal .modal-header {
  padding: 18px 22px;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-farmer-banner {
  background: #f0fdf4 !important;
  border: 2px solid rgba(22, 101, 52, 0.36) !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-farmer-icon {
  background: #dcfce7 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-farmer-label {
  color: #166534 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-farmer-name {
  color: #052e16 !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-section-title {
  color: #166534 !important;
  border-bottom-color: rgba(22, 101, 52, 0.32) !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-form-footer {
  background: #f9fdfb !important;
  border-top-color: rgba(22, 101, 52, 0.36) !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-form-footer .btn-cancel {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 2px solid #86efac !important;
}

.modal-overlay.agriculturist-income-modal.light-theme .assistance-form-footer .btn-submit {
  background: linear-gradient(135deg, #166534, #16a34a) !important;
  color: #ffffff !important;
}

/* Assistance form — dark mode */
.modal-overlay.agriculturist-income-modal:not(.light-theme) .assistance-farmer-banner {
  background: rgba(74, 222, 128, 0.1) !important;
  border-color: rgba(134, 239, 172, 0.28) !important;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .assistance-farmer-icon {
  background: rgba(74, 222, 128, 0.16) !important;
  border-color: rgba(134, 239, 172, 0.32) !important;
  color: #ffffff !important;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .assistance-farmer-label {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .assistance-farmer-name {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .assistance-section-title {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-bottom-color: rgba(4, 14, 10, 0.44) !important;
}

.modal-overlay.agriculturist-income-modal:not(.light-theme) .assistance-form-footer {
  background: rgba(0, 0, 0, 0.14) !important;
  border-top-color: rgba(4, 14, 10, 0.44) !important;
}

.page-container.agriculturist-income-page.light-theme .section-title {
  color: #052e16 !important;
}

.page-container.agriculturist-income-page.light-theme .btn-completed {
  background: #ecfdf5 !important;
  color: #15803d !important;
  border: 2px solid #86efac !important;
}

.page-container.agriculturist-income-page.light-theme .btn-sms-retry {
  background: #eff6ff !important;
  color: #1d4ed8 !important;
  border: 2px solid #93c5fd !important;
}

.page-container.agriculturist-income-page.light-theme .sms-status.status-sent {
  background-color: #dcfce7 !important;
  color: #15803d !important;
}

.page-container.agriculturist-income-page.light-theme .sms-status.status-failed {
  background-color: #fee2e2 !important;
  color: #991b1b !important;
}

.page-container.agriculturist-income-page.light-theme .sms-status.status-warning {
  background-color: #fef3c7 !important;
  color: #92400e !important;
}

.page-container.agriculturist-income-page.light-theme .sms-status.status-pending {
  background-color: #e0f2fe !important;
  color: #075985 !important;
}

.page-container.agriculturist-income-page.light-theme .sms-error {
  color: #b91c1c !important;
}

/* Responsive */
@media (max-width: 768px) {
  .page-header,
  .tab-navigation,
  .card-header,
  .card-info,
  .card-financials,
  .card-actions,
  .modal-header,
  .modal-body {
    padding: 14px;
  }

  .tab-navigation {
    flex-direction: column;
  }

  .tab-btn {
    width: 100%;
  }

  .records-grid {
    grid-template-columns: 1fr;
  }

  .card-actions {
    flex-direction: column;
  }

  .form-row,
  .assistance-qty-grid {
    grid-template-columns: 1fr;
  }

  .assistance-form-body,
  .assistance-form-footer {
    padding-left: 16px;
    padding-right: 16px;
  }

  .assistance-form-footer {
    flex-direction: column;
  }

  .assistance-form-footer .btn-cancel,
  .assistance-form-footer .btn-submit {
    flex: 1 1 auto;
    width: 100%;
  }
}
</style>
