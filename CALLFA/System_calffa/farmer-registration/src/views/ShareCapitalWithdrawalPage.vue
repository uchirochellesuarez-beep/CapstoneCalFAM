<template>
  <div
    class="financial-container glass-module-page share-capital-withdrawal-page"
    :class="{ 'light-theme': isLight }"
  >
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.withdrawal') }}</h1>
        <p class="page-subtitle">{{ $t('ui.withdrawalSub') }}</p>
      </div>
    </div>

    <div v-if="!canAccess" class="tab-content">
      <div class="empty-state">
        <div class="empty-title">{{ $t('ui.accessLimited') }}</div>
        <div class="empty-text">{{ $t('ui.treasurerAdminOnly') }}</div>
      </div>
    </div>

    <div v-else class="tab-content tab-content--main">
      <div v-if="setupError" class="info-banner info-banner--error">
        <strong>{{ $t('ui.setupRequired') }}</strong> {{ setupError }}
      </div>

      <div v-if="isAdmin" class="admin-filter-bar">
        <label for="withdrawal-barangay" class="admin-filter-label">{{ $t('ui.barangay') }}</label>
        <select
          id="withdrawal-barangay"
          v-model="selectedBarangayId"
          class="input admin-filter-select"
          @change="onBarangayChange"
        >
          <option value="">{{ $t('ui.selectBarangay') }}</option>
          <option v-for="b in barangayOptions" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
        </select>
        <span v-if="selectedBarangayName" class="admin-filter-hint">{{ $t('ui.viewingColon', { name: selectedBarangayName }) }}</span>
      </div>

      <div v-if="isAdmin && !selectedBarangayId" class="empty-state empty-state--panel">
        <div class="empty-title">{{ $t('ui.selectABarangay') }}</div>
        <div class="empty-text">{{ $t('ui.chooseBarangaySavings') }}</div>
      </div>

      <template v-else>
        <div class="stats-group stats-group--overview">
          <div class="stats-grid stats-grid--withdrawal">
            <div class="stat-card">
              <div class="stat-content">
                <div class="stat-label">{{ $t('ui.membersWithSavings') }}</div>
                <div class="stat-value">{{ overviewTotals.total_members.toLocaleString() }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-content">
                <div class="stat-label">{{ $t('ui.totalShareCapital') }}</div>
                <div class="stat-value">₱{{ formatMoney(overviewTotals.total_share_capital) }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-content">
                <div class="stat-label">{{ $t('ui.seedFertilizerPaid') }}</div>
                <div class="stat-value">₱{{ formatMoney(overviewTotals.total_seed_fertilizer) }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-content">
                <div class="stat-label">{{ $t('ui.totalWithdrawable') }}</div>
                <div class="stat-value">₱{{ formatMoney(overviewTotals.total_withdrawable) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">{{ isAdmin && selectedBarangayName ? $t('ui.membersWithSavingsNamed', { name: selectedBarangayName }) : $t('ui.membersWithSavingsYours') }}</h2>
              <button type="button" class="btn btn-primary-action" :disabled="loading" @click="loadOverview">
                {{ $t('common.refresh') }}
              </button>
            </div>

            <div class="tools-card sc-tools-card">
              <div class="tools-card-top">
                <div class="search-bar">
                  <span class="search-icon-wrap" aria-hidden="true">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-svg">
                      <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
                    </svg>
                  </span>
                  <input
                    v-model="searchQuery"
                    type="text"
                    :placeholder="$t('ui.searchByNameRef')"
                    class="toolbar-input search-input-main"
                  />
                </div>
              </div>
            </div>

            <div class="table-container">
              <div class="fin-desktop-table">
                <table class="data-table ledger-table ledger-table-withdrawal-members">
                  <colgroup>
                    <col class="col-ref" />
                    <col class="col-member" />
                    <col class="col-share" />
                    <col class="col-seed" />
                    <col class="col-withdrawn" />
                    <col class="col-available" />
                    <col class="col-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="th-ref">{{ $t('ui.refNo') }}</th>
                      <th class="th-member">{{ $t('ui.member') }}</th>
                      <th class="th-amount">{{ $t('ui.shareCapitalHyphen') }}</th>
                      <th class="th-amount">{{ $t('ui.seedFertShort') }}</th>
                      <th class="th-amount">{{ $t('ui.withdrawn') }}</th>
                      <th class="th-amount">{{ $t('common.available') }}</th>
                      <th class="th-actions">{{ $t('ui.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loading">
                      <td colspan="7" class="table-empty">{{ $t('common.loading') }}</td>
                    </tr>
                    <tr v-else-if="members.length === 0">
                      <td colspan="7" class="table-empty">{{ $t('ui.noMembersWithPayments') }}</td>
                    </tr>
                    <tr v-else-if="filteredMembers.length === 0">
                      <td colspan="7" class="table-empty">{{ $t('ui.noMembersMatch') }}</td>
                    </tr>
                    <tr
                      v-else
                      v-for="m in filteredMembers"
                      :key="m.id"
                      :class="{ selected: selectedMember?.id === m.id }"
                      @click="selectMember(m)"
                    >
                      <td class="td-ref">{{ m.reference_number || '—' }}</td>
                      <td class="name td-member" :title="m.full_name">
                        <span class="cell-clip">{{ m.full_name }}</span>
                      </td>
                      <td class="amount td-amount">₱{{ formatMoney(m.share_capital_collected) }}</td>
                      <td class="amount td-amount">₱{{ formatMoney(m.seed_fertilizer_paid) }}</td>
                      <td class="amount td-amount">₱{{ formatMoney(m.total_withdrawn) }}</td>
                      <td class="amount td-amount"><strong>₱{{ formatMoney(m.withdrawable_balance) }}</strong></td>
                      <td class="actions td-actions" @click.stop>
                        <button type="button" class="btn btn-small" @click="selectMember(m)">{{ $t('common.view') }}</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="fin-mobile-list">
                <div v-if="loading" class="fin-mobile-empty">{{ $t('common.loading') }}</div>
                <div v-else-if="members.length === 0" class="fin-mobile-empty">
                  {{ $t('ui.noMembersWithPayments') }}
                </div>
                <div v-else-if="filteredMembers.length === 0" class="fin-mobile-empty">
                  {{ $t('ui.noMembersMatch') }}
                </div>
                <article
                  v-else
                  v-for="m in filteredMembers"
                  :key="'m-' + m.id"
                  class="fin-mobile-card"
                  :class="{ selected: selectedMember?.id === m.id }"
                  @click="selectMember(m)"
                >
                  <div class="fin-mobile-card-top">
                    <h4 class="fin-mobile-card-name">{{ m.full_name }}</h4>
                    <span class="amount">₱{{ formatMoney(m.withdrawable_balance) }}</span>
                  </div>
                  <div class="fin-mobile-card-meta">
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.refNo') }}</span>
                      <span>{{ m.reference_number || '—' }}</span>
                    </div>
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.shareCapitalHyphen') }}</span>
                      <span class="amount">₱{{ formatMoney(m.share_capital_collected) }}</span>
                    </div>
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.seedFertShort') }}</span>
                      <span class="amount">₱{{ formatMoney(m.seed_fertilizer_paid) }}</span>
                    </div>
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.withdrawn') }}</span>
                      <span class="amount">₱{{ formatMoney(m.total_withdrawn) }}</span>
                    </div>
                  </div>
                  <div class="fin-mobile-card-actions" @click.stop>
                    <button type="button" class="btn btn-small fin-mobile-action" @click="selectMember(m)">
                      {{ $t('common.view') }}
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <div class="card sc-member-detail-card">
            <div class="card-header">
              <h2 class="card-title">{{ $t('ui.memberWithdrawal') }}</h2>
            </div>

            <div v-if="!selectedMember" class="empty-state">
              <div class="empty-title">{{ $t('ui.selectAMember') }}</div>
              <div class="empty-text">{{ $t('ui.chooseMemberWithdrawal') }}</div>
            </div>

            <Teleport to="body" :disabled="!isMobile">
              <Transition :name="isMobile ? 'app-modal' : ''">
                <div
                  v-if="selectedMember"
                  class="sc-detail-portal"
                  :class="{ 'app-modal-overlay sc-detail-overlay': isMobile, 'light-theme': isMobile && isLight }"
                  @click.self="isMobile && closeMemberModal()"
                >
                  <div class="sc-detail-panel" :class="{ 'modal-content sc-detail-modal': isMobile }">
                    <div v-if="isMobile" class="modal-header sc-detail-modal-header">
                      <h2>{{ $t('ui.memberWithdrawal') }}</h2>
                      <button
                        type="button"
                        class="sc-detail-close"
                        :aria-label="$t('common.close')"
                        @click="closeMemberModal"
                      >×</button>
                    </div>
                    <div class="card-body sc-member-detail-body" :class="{ 'modal-body': isMobile }">
                      <div class="farmer-summary">
                        <div class="farmer-name">{{ selectedMember.full_name }}</div>
                        <div class="farmer-meta">{{ $t('ui.refColon', { ref: selectedMember.reference_number || '—' }) }}</div>
                      </div>

                      <div class="sc-member-stats-grid">
                        <div class="sc-member-stat">
                          <span class="sc-member-stat-label">{{ $t('ui.shareCapitalHyphen') }}</span>
                          <span class="sc-member-stat-value">₱{{ formatMoney(memberTotals.share_capital_collected) }}</span>
                        </div>
                        <div class="sc-member-stat">
                          <span class="sc-member-stat-label">{{ $t('ui.seedFertilizer') }}</span>
                          <span class="sc-member-stat-value">₱{{ formatMoney(memberTotals.seed_fertilizer_paid) }}</span>
                        </div>
                        <div class="sc-member-stat">
                          <span class="sc-member-stat-label">{{ $t('ui.totalWithdrawn') }}</span>
                          <span class="sc-member-stat-value">₱{{ formatMoney(memberTotals.total_withdrawn) }}</span>
                        </div>
                        <div class="sc-member-stat sc-member-stat--highlight">
                          <span class="sc-member-stat-label">{{ $t('common.available') }}</span>
                          <span class="sc-member-stat-value">₱{{ formatMoney(memberTotals.withdrawable_balance) }}</span>
                        </div>
                      </div>

                      <div v-if="availableBalance > 0" class="action-row payment-collection-panel">
                        <div class="withdrawal-form-grid">
                          <div class="payment-field">
                            <label class="inline-label" for="withdrawal-date">{{ $t('ui.withdrawalDate') }}</label>
                            <input id="withdrawal-date" v-model="withdrawalDate" type="date" class="input" />
                          </div>
                          <div class="payment-field">
                            <label class="inline-label" for="withdrawal-amount">{{ $t('ui.amountPeso') }}</label>
                            <input
                              id="withdrawal-amount"
                              v-model="withdrawalAmount"
                              type="text"
                              inputmode="decimal"
                              autocomplete="off"
                              class="input amount-text-input"
                              :placeholder="$t('ui.enterAmount')"
                              @wheel.prevent
                              @keydown="blockAmountScrollKeys"
                            />
                          </div>
                          <div class="payment-field payment-field--remarks">
                            <label class="inline-label" for="withdrawal-remarks">{{ $t('ui.remarks') }}</label>
                            <input
                              id="withdrawal-remarks"
                              v-model="withdrawalRemarks"
                              type="text"
                              class="input"
                              :placeholder="$t('ui.optional')"
                            />
                          </div>
                          <button
                            type="button"
                            class="btn btn-danger withdrawal-submit-btn"
                            :disabled="!canSubmitWithdrawal"
                            @click="processWithdrawal"
                          >
                            {{ $t('common.processPrintReceipt') }}
                          </button>
                        </div>
                        <p v-if="amountError" class="field-error">{{ amountError }}</p>
                        <p v-else class="ledger-note withdrawal-hint">
                          {{ $t('ui.availableBalanceColon') }} <strong>₱{{ formatMoney(availableBalance) }}</strong>.
                          Type the exact amount — hindi magbabago kapag nag-scroll.
                          Mananatiling <strong>active</strong> ang miyembro.
                        </p>
                      </div>
                      <p v-else class="ledger-note">{{ $t('ui.noAvailableWithdrawal') }}</p>

                      <div class="section-title">{{ $t('ui.withdrawalHistory') }}</div>
                      <div class="table-container sc-contributions-table">
                        <div class="withdrawal-history-desktop fin-desktop-table">
                          <table class="data-table ledger-table ledger-table-withdrawal-history">
                            <colgroup>
                              <col class="col-date" />
                              <col class="col-amount" />
                              <col class="col-remarks" />
                              <col class="col-receipt" />
                              <col class="col-actions" />
                            </colgroup>
                            <thead>
                              <tr>
                                <th class="th-date">{{ $t('ui.date') }}</th>
                                <th class="th-amount">{{ $t('ui.amount') }}</th>
                                <th class="th-remarks">{{ $t('ui.remarks') }}</th>
                                <th class="th-receipt">{{ $t('ui.receiptNo') }}</th>
                                <th class="th-actions">{{ $t('common.print') }}</th>
                              </tr>
                            </thead>
                            <tbody>
                              <tr v-if="loadingMember">
                                <td colspan="5" class="table-empty">{{ $t('common.loading') }}</td>
                              </tr>
                              <tr v-else-if="memberWithdrawals.length === 0">
                                <td colspan="5" class="table-empty">{{ $t('ui.noWithdrawals') }}</td>
                              </tr>
                              <tr v-else v-for="w in memberWithdrawals" :key="w.id">
                                <td class="td-date">{{ formatDate(w.withdrawal_date) }}</td>
                                <td class="amount td-amount">₱{{ formatMoney(w.amount) }}</td>
                                <td class="td-remarks"><span class="cell-clip">{{ w.remarks || '—' }}</span></td>
                                <td class="td-receipt">{{ w.receipt_number || '—' }}</td>
                                <td class="actions td-actions actions-cell">
                                  <button
                                    v-if="w.receipt_number"
                                    type="button"
                                    class="table-action-btn table-action-print"
                                    :title="$t('ui.printReceipt')"
                                    :aria-label="$t('ui.printReceipt')"
                                    @click="printWithdrawalReceipt(w.receipt_number)"
                                  >
                                    <PrintIcon />
                                  </button>
                                </td>
                              </tr>
                            </tbody>
                          </table>
                        </div>

                        <div class="withdrawal-history-mobile">
                          <div v-if="loadingMember" class="fin-mobile-empty">{{ $t('common.loading') }}</div>
                          <div v-else-if="memberWithdrawals.length === 0" class="fin-mobile-empty">
                            {{ $t('ui.noWithdrawals') }}
                          </div>
                          <article
                            v-else
                            v-for="w in memberWithdrawals"
                            :key="'wd-' + w.id"
                            class="fin-mobile-card"
                          >
                            <div class="fin-mobile-card-top">
                              <h4 class="fin-mobile-card-name">₱{{ formatMoney(w.amount) }}</h4>
                              <span class="fin-mobile-date">{{ formatDate(w.withdrawal_date) }}</span>
                            </div>
                            <div class="fin-mobile-card-meta">
                              <div class="fin-mobile-meta-row">
                                <span class="fin-mobile-label">{{ $t('ui.remarks') }}</span>
                                <span>{{ w.remarks || '—' }}</span>
                              </div>
                              <div class="fin-mobile-meta-row">
                                <span class="fin-mobile-label">{{ $t('ui.receipt') }}</span>
                                <span>{{ w.receipt_number || '—' }}</span>
                              </div>
                            </div>
                            <div v-if="w.receipt_number" class="fin-mobile-card-actions">
                              <button
                                type="button"
                                class="btn btn-small fin-mobile-action"
                                @click="printWithdrawalReceipt(w.receipt_number)"
                              >
                                {{ $t('common.print') }}
                              </button>
                            </div>
                          </article>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </Transition>
            </Teleport>
          </div>
        </div>
      </template>
    </div>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showReceiptModal && lastReceipt"
          class="modal-overlay receipt-modal-overlay app-modal-overlay sc-receipt-overlay"
          @click.self="closeReceiptModal"
        >
          <div class="modal-box receipt-modal-box" @click.stop>
            <PaymentReceiptPrint
              :receipt="lastReceipt"
              :auto-print="receiptAutoPrint"
              kind="withdrawal"
              @close="closeReceiptModal"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="alert.show"
          class="app-modal-overlay sc-alert-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="dismissAlert"
        >
          <div class="modal-content sc-alert-modal" :class="'sc-alert-' + alert.type" role="alertdialog" aria-live="polite">
            <div class="sc-alert-icon" aria-hidden="true">{{ alert.type === 'success' ? '✓' : '!' }}</div>
            <p class="sc-alert-message">{{ alert.message }}</p>
            <button type="button" class="btn sc-alert-ok" @click="dismissAlert">{{ $t('common.ok') }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import PrintIcon from '../components/icons/PrintIcon.vue'
import { usePaymentReceipt } from '../composables/usePaymentReceipt'

const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const role = computed(() => authStore.currentUser?.role)
const isAdmin = computed(() => role.value === 'admin')
const canAccess = computed(() => isAdmin.value || role.value === 'treasurer')

const barangays = ref([])
const selectedBarangayId = ref('')
const members = ref([])
const overviewTotals = ref({
  total_members: 0,
  total_share_capital: 0,
  total_seed_fertilizer: 0,
  total_withdrawn: 0,
  total_withdrawable: 0,
})
const selectedMember = ref(null)
const memberTotals = ref({
  share_capital_collected: 0,
  seed_fertilizer_paid: 0,
  total_withdrawn: 0,
  withdrawable_balance: 0,
})
const memberWithdrawals = ref([])
const loading = ref(false)
const loadingMember = ref(false)
const setupError = ref('')
const searchQuery = ref('')
const withdrawalDate = ref(todayISO())
const withdrawalAmount = ref('')
const withdrawalRemarks = ref('')

const {
  showReceiptModal,
  lastReceipt,
  receiptAutoPrint,
  showAndPrintReceipt,
  closeReceiptModal,
} = usePaymentReceipt()

const alert = ref({ show: false, message: '', type: 'success' })
let alertTimer = null

const isMobile = ref(false)
let mobileMql = null
function updateIsMobile(e) {
  isMobile.value = e && typeof e.matches === 'boolean'
    ? e.matches
    : (typeof window !== 'undefined' && window.innerWidth <= 768)
}

const showMemberModal = computed(() => isMobile.value && !!selectedMember.value)
const anyWithdrawalModalOpen = computed(
  () => showMemberModal.value || alert.value.show || showReceiptModal.value
)

function closeMemberModal() {
  selectedMember.value = null
  withdrawalAmount.value = ''
  withdrawalRemarks.value = ''
}

watch(anyWithdrawalModalOpen, (open) => {
  if (typeof document !== 'undefined') {
    document.body.classList.toggle('app-modal-open', open)
  }
})

const barangayOptions = computed(() =>
  barangays.value.map((b) => ({
    id: b.id || b.barangay_id,
    name: b.name || b.barangay_name || String(b.id),
  }))
)

const selectedBarangayName = computed(() => {
  if (!selectedBarangayId.value) return ''
  const match = barangayOptions.value.find((b) => String(b.id) === String(selectedBarangayId.value))
  return match?.name || ''
})

const filteredMembers = computed(() => {
  if (!searchQuery.value.trim()) return members.value
  const query = searchQuery.value.toLowerCase()
  return members.value.filter(
    (m) =>
      (m.reference_number && m.reference_number.toLowerCase().includes(query)) ||
      (m.full_name && m.full_name.toLowerCase().includes(query))
  )
})

const availableBalance = computed(() => parseFloat(memberTotals.value.withdrawable_balance || 0) || 0)

function parseAmountInput(value) {
  const cleaned = String(value || '').replace(/,/g, '').trim()
  if (!cleaned) return 0
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : NaN
}

const parsedWithdrawalAmount = computed(() => parseAmountInput(withdrawalAmount.value))

const amountError = computed(() => {
  if (!selectedMember.value || withdrawalAmount.value.trim() === '') return ''
  if (Number.isNaN(parsedWithdrawalAmount.value)) {
    return 'Enter a valid amount (numbers only).'
  }
  if (parsedWithdrawalAmount.value <= 0) {
    return 'Enter an amount greater than zero.'
  }
  if (parsedWithdrawalAmount.value > availableBalance.value + 0.009) {
    return `Amount cannot exceed available balance (₱${formatMoney(availableBalance.value)}).`
  }
  return ''
})

const canSubmitWithdrawal = computed(() => {
  if (loading.value || loadingMember.value) return false
  if (!withdrawalDate.value || availableBalance.value <= 0) return false
  if (withdrawalAmount.value.trim() === '' || amountError.value) return false
  return (
    parsedWithdrawalAmount.value > 0 &&
    parsedWithdrawalAmount.value <= availableBalance.value + 0.009
  )
})

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

function blockAmountScrollKeys(event) {
  if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
    event.preventDefault()
  }
}

function showAlert(message, type = 'success') {
  if (alertTimer) clearTimeout(alertTimer)
  alert.value = { show: true, message, type }
  alertTimer = setTimeout(() => {
    alert.value.show = false
    alertTimer = null
  }, 4000)
}

function dismissAlert() {
  if (alertTimer) {
    clearTimeout(alertTimer)
    alertTimer = null
  }
  alert.value.show = false
}

async function apiFetch(path, options = {}) {
  const token = authStore.token || localStorage.getItem('token')
  if (!token) {
    showAlert('Session expired. Please login again.', 'error')
    throw new Error('Unauthorized')
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`,
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
  selectedMember.value = null
  memberWithdrawals.value = []
  withdrawalAmount.value = ''
  withdrawalRemarks.value = ''
  searchQuery.value = ''
  loadOverview()
}

async function loadOverview() {
  if (!canAccess.value) return
  if (isAdmin.value && !selectedBarangayId.value) {
    members.value = []
    overviewTotals.value = {
      total_members: 0,
      total_share_capital: 0,
      total_seed_fertilizer: 0,
      total_withdrawn: 0,
      total_withdrawable: 0,
    }
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
    const res = await apiFetch(`/api/share-capital/withdrawals-overview${query ? `?${query}` : ''}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load withdrawal overview')
    }
    members.value = data.members || []
    overviewTotals.value = data.totals || overviewTotals.value

    if (selectedMember.value) {
      const stillThere = members.value.find((m) => m.id === selectedMember.value.id)
      if (stillThere) selectedMember.value = stillThere
    }
  } catch (e) {
    if (e.message && String(e.message).toLowerCase().includes('tables not found')) {
      setupError.value = e.message
    }
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadMemberDetails(farmerId) {
  loadingMember.value = true
  try {
    const res = await apiFetch(`/api/share-capital/farmer/${farmerId}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load member records')
    }
    const totals = data.totals || {}
    memberTotals.value = {
      share_capital_collected: totals.share_capital_collected ?? 0,
      seed_fertilizer_paid: totals.seed_fertilizer_paid ?? 0,
      total_withdrawn: totals.total_withdrawn ?? 0,
      withdrawable_balance: totals.withdrawable_balance ?? 0,
    }
    memberWithdrawals.value = data.withdrawals || []
    withdrawalAmount.value = ''
    withdrawalRemarks.value = ''
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loadingMember.value = false
  }
}

async function selectMember(member) {
  selectedMember.value = member
  await loadMemberDetails(member.id)
}

async function printWithdrawalReceipt(receiptNumber) {
  if (!receiptNumber) return
  try {
    await showAndPrintReceipt(receiptNumber, { autoPrint: !isMobile.value })
  } catch (e) {
    showAlert(e.message || 'Failed to load receipt.', 'error')
  }
}

async function processWithdrawal() {
  if (!selectedMember.value || !canSubmitWithdrawal.value) return

  const amount = Math.round(parsedWithdrawalAmount.value * 100) / 100
  const ok = confirm(
    `Process withdrawal for ${selectedMember.value.full_name}?\n\nAmount: ₱${formatMoney(amount)}\nAvailable after: ₱${formatMoney(availableBalance.value - amount)}\n\nThe member will remain active.`
  )
  if (!ok) return

  loading.value = true
  try {
    const res = await apiFetch('/api/share-capital/withdrawals', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_id: selectedMember.value.id,
        withdrawal_date: withdrawalDate.value,
        amount,
        remarks: withdrawalRemarks.value.trim() || null,
      }),
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to process withdrawal')
    }
    await loadMemberDetails(selectedMember.value.id)
    await loadOverview()
    showAlert(data.message || 'Withdrawal processed successfully', 'success')
    if (data.receipt_number) {
      try {
        await showAndPrintReceipt(data.receipt_number, { autoPrint: !isMobile.value })
      } catch (receiptErr) {
        showAlert('Withdrawal saved but receipt could not be loaded. Use Print from history.', 'error')
      }
    }
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mobileMql = window.matchMedia('(max-width: 768px)')
    isMobile.value = mobileMql.matches
    if (mobileMql.addEventListener) mobileMql.addEventListener('change', updateIsMobile)
    else if (mobileMql.addListener) mobileMql.addListener(updateIsMobile)
  }
  if (!authStore.token || !canAccess.value) return
  if (isAdmin.value) {
    await loadBarangays()
  } else {
    await loadOverview()
  }
})

onBeforeUnmount(() => {
  if (mobileMql) {
    if (mobileMql.removeEventListener) mobileMql.removeEventListener('change', updateIsMobile)
    else if (mobileMql.removeListener) mobileMql.removeListener(updateIsMobile)
  }
  if (typeof document !== 'undefined') {
    document.body.classList.remove('app-modal-open')
  }
})
</script>

<style scoped>
/* Page-specific scoped styles — colors, modals, mobile cards; layout in share-capital-withdrawal-ui.css */

/* ===== Header — match Share Capital / Machinery Financial ===== */
.share-capital-withdrawal-page .page-header,
.share-capital-withdrawal-page .page-header-split {
  margin-bottom: 0.75rem;
  padding: 0.65rem 0.85rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  border-radius: 10px;
  position: relative;
  overflow: hidden;
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  text-align: left;
}

.share-capital-withdrawal-page > .page-header.page-header-split {
  text-align: left;
}

.share-capital-withdrawal-page .page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-width: none;
  margin: 0 !important;
  align-items: flex-start !important;
  text-align: left !important;
}

.share-capital-withdrawal-page .page-header::before {
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

.share-capital-withdrawal-page .page-header::after {
  content: '';
  position: absolute;
  left: 1.4rem;
  right: 1.4rem;
  bottom: 0.55rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.42), rgba(45, 212, 191, 0.12));
  pointer-events: none;
}

.share-capital-withdrawal-page .page-header h1,
.share-capital-withdrawal-page .page-title {
  font-size: 1.05rem !important;
  font-weight: 800 !important;
  line-height: 1.15 !important;
  letter-spacing: -0.01em;
  margin: 0 !important;
  color: #eefde6;
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: currentColor !important;
  text-align: left !important;
}

.share-capital-withdrawal-page .page-subtitle {
  color: rgba(229, 235, 231, 0.82);
  margin: 0 !important;
  font-size: 0.7rem !important;
  line-height: 1.3 !important;
  font-weight: 600 !important;
  text-align: left !important;
  max-width: none !important;
}

.share-capital-withdrawal-page.light-theme .page-header,
.share-capital-withdrawal-page.light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  border-width: 1px !important;
  box-shadow: 0 8px 26px rgba(22, 101, 52, 0.12), inset 1px 1px 0 rgba(255, 255, 255, 0.05) !important;
  text-align: left !important;
}

.share-capital-withdrawal-page.light-theme .page-title {
  color: #052e16 !important;
}

.share-capital-withdrawal-page.light-theme .page-subtitle {
  color: #166534 !important;
}

/* Dual-render members list */
.fin-mobile-list,
.withdrawal-history-mobile {
  display: none;
}

.fin-desktop-table,
.withdrawal-history-desktop {
  display: block;
  width: 100%;
  overflow-x: auto;
}

.fin-mobile-empty {
  padding: 1.25rem 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft, rgba(220, 238, 211, 0.62));
}

.fin-mobile-card {
  padding: 0.7rem 0.75rem 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(167, 211, 178, 0.22);
  background: rgba(0, 0, 0, 0.16);
}

.fin-mobile-card.selected {
  outline: 2px solid rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.12);
}

.fin-mobile-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.fin-mobile-card-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-main, #ecfdf5);
  word-break: break-word;
}

.fin-mobile-date {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.65);
}

.fin-mobile-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin-bottom: 0.55rem;
}

.fin-mobile-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.55rem;
  font-size: 0.78rem;
  line-height: 1.3;
}

.fin-mobile-label {
  flex-shrink: 0;
  min-width: 4.8rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(229, 235, 231, 0.55);
}

.fin-mobile-card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding-top: 0.45rem;
  border-top: 1px solid rgba(190, 235, 203, 0.12);
}

.fin-mobile-action {
  flex: 1 1 auto;
  min-height: 40px;
  min-width: 0;
  justify-content: center;
  font-size: 0.78rem !important;
  padding: 0.45rem 0.65rem !important;
}

.share-capital-withdrawal-page.light-theme .fin-mobile-card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

.share-capital-withdrawal-page.light-theme .fin-mobile-card-name,
.share-capital-withdrawal-page.light-theme .fin-mobile-meta-row {
  color: #052e16 !important;
}

.share-capital-withdrawal-page.light-theme .fin-mobile-label,
.share-capital-withdrawal-page.light-theme .fin-mobile-date {
  color: #166534 !important;
}

.share-capital-withdrawal-page.light-theme .fin-mobile-card-actions {
  border-top-color: #bbf7d0 !important;
}

/* Member detail portal */
.sc-detail-portal:not(.app-modal-overlay),
.sc-detail-panel:not(.modal-content) {
  display: contents;
}

.sc-detail-overlay.app-modal-overlay {
  z-index: 11050;
  /* Teleported to body — lock rem base so light body 17px doesn't inflate modal geometry */
  font-size: 16px;
  line-height: 1.6;
}

.sc-detail-modal.modal-content {
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 2rem));
  max-width: min(560px, calc(100vw - 2rem));
  max-height: calc(100vh - 2rem);
  background: var(--glass-panel, rgba(31, 48, 36, 0.96));
  border: 1px solid rgba(190, 235, 203, 0.28);
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.5);
}

.sc-detail-modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.8rem 0.95rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(0, 0, 0, 0.18);
  flex-shrink: 0;
}

.sc-detail-modal-header h2 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main, #eefde6);
}

.sc-detail-close {
  background: none;
  border: none;
  color: var(--text-main, #eefde6);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0 0.25rem;
  opacity: 0.8;
}

.sc-detail-close:hover {
  opacity: 1;
}

.sc-detail-modal .card-body.modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  padding: 0.85rem 0.9rem 1rem;
}

.sc-detail-overlay.light-theme {
  --glass-panel: #ffffff;
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --green: #15803d;
}

.sc-detail-overlay.light-theme .sc-detail-modal.modal-content {
  border-color: #86efac;
}

.sc-detail-overlay.light-theme .sc-detail-modal-header {
  background: #f0fdf4;
  border-bottom-color: #bbf7d0;
}

.sc-detail-overlay.light-theme .sc-detail-close {
  color: #052e16;
}

.sc-detail-overlay.light-theme .farmer-summary {
  background: #f0fdf4;
  border-color: #86efac;
}

.sc-detail-overlay.light-theme .farmer-name {
  color: #052e16;
}

.sc-detail-overlay.light-theme .farmer-meta,
.sc-detail-overlay.light-theme .inline-label,
.sc-detail-overlay.light-theme .fin-mobile-label {
  color: #166534;
}

.sc-detail-overlay.light-theme .stat-card,
.sc-detail-overlay.light-theme .fin-mobile-card {
  background: #ffffff;
  border-color: #86efac;
}

.sc-detail-overlay.light-theme .stat-value,
.sc-detail-overlay.light-theme .fin-mobile-card-name,
.sc-detail-overlay.light-theme .fin-mobile-meta-row {
  color: #052e16;
}

.sc-detail-overlay.light-theme .input {
  background: #ffffff;
  color: #000000;
  border-color: #94a3b8;
  border-width: 1px;
}

.sc-detail-overlay.light-theme .section-title {
  color: #15803d;
  border-bottom-color: #bbf7d0;
}

.sc-detail-overlay.light-theme .btn:not(.btn-danger) {
  background: #ffffff;
  color: #052e16;
  border-color: #166534;
  border-width: 1px;
}

.sc-detail-overlay.light-theme .btn-danger {
  border-width: 1px;
}

/* Form + member detail */
.stats-group {
  margin-bottom: 0.75rem;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.sc-member-detail-body {
  padding: 8px 10px 10px;
}

.farmer-summary {
  margin-bottom: 6px;
  padding: 6px 8px;
  border-radius: 6px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.22);
}

.farmer-name {
  font-weight: 800;
  font-size: 0.82rem;
  line-height: 1.2;
  color: #ecfdf5;
  margin-bottom: 2px;
}

.farmer-meta {
  font-size: 10px;
  color: var(--text-muted);
}

.sc-member-stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px;
  margin-bottom: 8px;
}

.sc-member-stat {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 5px 7px;
  border-radius: 6px;
  background: rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(190, 235, 203, 0.16);
  min-width: 0;
}

.sc-member-stat-label {
  font-size: 7px;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-soft);
  line-height: 1.2;
}

.sc-member-stat-value {
  font-size: 0.78rem;
  font-weight: 800;
  line-height: 1.1;
  color: #bbf7d0;
  font-variant-numeric: tabular-nums;
}

.section-title {
  margin: 6px 0 4px;
  font-size: 9px;
  font-weight: 800;
  color: #b6f7cb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 3px;
}

.sc-contributions-table {
  padding: 0 !important;
}

.share-capital-withdrawal-page .withdrawal-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) minmax(0, 1.2fr) auto;
  gap: 4px 8px;
  align-items: end;
  width: 100%;
}

.payment-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.share-capital-withdrawal-page .withdrawal-submit-btn {
  align-self: end;
  white-space: nowrap;
}

.share-capital-withdrawal-page .amount-text-input {
  font-variant-numeric: tabular-nums;
}

.share-capital-withdrawal-page .field-error {
  margin: 8px 0 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #fca5a5;
}

.share-capital-withdrawal-page.light-theme .field-error {
  color: #b91c1c !important;
}

.share-capital-withdrawal-page .withdrawal-hint {
  margin-top: 10px;
}

/* Light theme: lock geometry to dark reference (colors only change) */
.share-capital-withdrawal-page.light-theme .tab-content,
.share-capital-withdrawal-page.light-theme .stat-card,
.share-capital-withdrawal-page.light-theme .tab-content .card,
.share-capital-withdrawal-page.light-theme .admin-filter-bar,
.share-capital-withdrawal-page.light-theme .page-header,
.share-capital-withdrawal-page.light-theme .fin-mobile-card,
.share-capital-withdrawal-page.light-theme .farmer-summary,
.share-capital-withdrawal-page.light-theme .ledger-note,
.share-capital-withdrawal-page.light-theme .info-banner {
  border-width: 1px !important;
}

.share-capital-withdrawal-page.light-theme .input {
  border-width: 1px !important;
}

.share-capital-withdrawal-page.light-theme .sc-member-stat {
  background: #ffffff !important;
  border-color: #86efac !important;
}

.share-capital-withdrawal-page.light-theme .sc-member-stat-value {
  color: #052e16 !important;
}

.share-capital-withdrawal-page.light-theme .sc-member-stat-label {
  color: #166534 !important;
}

.share-capital-withdrawal-page.light-theme .btn,
.share-capital-withdrawal-page.light-theme .btn-small,
.share-capital-withdrawal-page.light-theme .btn-primary-action,
.share-capital-withdrawal-page.light-theme .btn-muted,
.share-capital-withdrawal-page.light-theme .btn-success,
.share-capital-withdrawal-page.light-theme .btn-danger {
  border-width: 1px !important;
}

.share-capital-withdrawal-page.light-theme .empty-state--panel {
  border-width: 1px !important;
  border-style: dashed !important;
}

/* Mobile */
@media (max-width: 768px) {
  .share-capital-withdrawal-page.financial-container {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    max-width: none;
    padding: 0.75rem;
    border-radius: 0;
  }

  .share-capital-withdrawal-page > .tab-content {
    margin-top: 0;
  }

  .share-capital-withdrawal-page .page-header,
  .share-capital-withdrawal-page .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.85rem;
  }

  .share-capital-withdrawal-page .page-header::after {
    display: none;
  }

  .share-capital-withdrawal-page .page-header-text {
    gap: 0.15rem !important;
  }

  .share-capital-withdrawal-page .page-title {
    font-size: 1.2rem !important;
    margin: 0 !important;
    line-height: 1.25 !important;
  }

  .share-capital-withdrawal-page .page-subtitle {
    font-size: 0.75rem !important;
    line-height: 1.3 !important;
  }

  .share-capital-withdrawal-page .tab-content {
    padding: 0.75rem 0.65rem;
    border-radius: 14px;
  }

  .share-capital-withdrawal-page .withdrawal-form-grid {
    grid-template-columns: 1fr;
  }

  .share-capital-withdrawal-page .withdrawal-submit-btn {
    width: 100%;
  }

  .sc-member-stats-grid {
    grid-template-columns: 1fr 1fr;
  }

  .share-capital-withdrawal-page .stat-card {
    padding: 0.5rem 0.6rem;
    border-radius: 10px;
  }

  .share-capital-withdrawal-page .stat-label {
    font-size: 0.56rem;
    margin-bottom: 0.15rem;
  }

  .share-capital-withdrawal-page .stat-value {
    font-size: 0.92rem;
  }

  .share-capital-withdrawal-page .tab-content .card-header {
    padding: 0.55rem 0.7rem;
  }

  .share-capital-withdrawal-page .tab-content .card-title {
    font-size: 0.9rem;
  }

  .share-capital-withdrawal-page .btn-primary-action {
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
  }

  .share-capital-withdrawal-page .admin-filter-bar {
    padding: 0.55rem 0.65rem;
    gap: 0.4rem;
    margin-bottom: 0.6rem;
  }

  .share-capital-withdrawal-page .admin-filter-select {
    min-width: 0;
    max-width: none;
    width: 100%;
  }

  .share-capital-withdrawal-page .filter-section {
    padding: 0.55rem 0.65rem;
  }

  .share-capital-withdrawal-page .input {
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.5rem 0.6rem;
  }

  .share-capital-withdrawal-page .withdrawal-form-grid {
    grid-template-columns: 1fr;
    gap: 0.4rem;
  }

  .share-capital-withdrawal-page .withdrawal-submit-btn {
    width: 100%;
    justify-self: stretch;
  }

  .share-capital-withdrawal-page .action-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    margin: 0.4rem 0 0.6rem;
  }

  .share-capital-withdrawal-page .sc-member-detail-card {
    display: none;
  }

  .fin-desktop-table,
  .withdrawal-history-desktop {
    display: none !important;
  }

  .fin-mobile-list,
  .withdrawal-history-mobile {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
    width: 100%;
  }

  .fin-mobile-card {
    padding: 0.55rem 0.6rem 0.5rem;
  }

  .fin-mobile-card-name {
    font-size: 0.85rem;
  }

  .fin-mobile-label {
    font-size: 0.58rem;
    min-width: 4rem;
  }

  .fin-mobile-meta-row {
    font-size: 0.72rem;
  }

  .fin-mobile-meta-row > span:last-child {
    text-align: right;
    word-break: break-word;
  }

  .share-capital-withdrawal-page .table-container {
    overflow-x: visible;
    border: none;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
  }

  .share-capital-withdrawal-page .section-title {
    margin: 0.6rem 0 0.4rem;
    font-size: 0.6rem;
  }

  .share-capital-withdrawal-page .farmer-summary {
    padding: 0.6rem 0.7rem;
    margin-bottom: 0.6rem;
  }

  .share-capital-withdrawal-page .farmer-name {
    font-size: 0.95rem;
  }

  .share-capital-withdrawal-page .ledger-note {
    padding: 0.55rem 0.7rem;
    font-size: 0.72rem;
  }
}

@media (max-width: 480px) {
  .share-capital-withdrawal-page .page-title {
    font-size: 1.1rem !important;
  }

  .sc-detail-modal.modal-content {
    width: calc(100vw - 1.2rem);
    max-width: calc(100vw - 1.2rem);
    max-height: calc(100vh - 1.2rem);
  }
}
</style>

<style>
/* Receipt preview — compact on-screen only (print still uses full receipt styles) */
.sc-receipt-overlay.app-modal-overlay {
  z-index: 12000 !important;
  padding: 0.75rem !important;
  font-size: 16px;
  line-height: 1.6;
}

.sc-receipt-overlay .receipt-modal-box {
  width: min(340px, calc(100vw - 1.5rem)) !important;
  max-width: min(340px, calc(100vw - 1.5rem)) !important;
  max-height: calc(100vh - 1.5rem) !important;
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  background: #ffffff;
  border-radius: 12px;
  padding: 8px !important;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.sc-receipt-overlay .receipt-print-root {
  gap: 8px !important;
  font-size: 0.72rem !important;
}

.sc-receipt-overlay .payment-receipt {
  border-width: 1.5px !important;
  border-radius: 3px !important;
}

.sc-receipt-overlay .receipt-top {
  padding: 8px 10px 6px !important;
}

.sc-receipt-overlay .receipt-title {
  font-size: 13px !important;
  letter-spacing: 0.3px !important;
}

.sc-receipt-overlay .receipt-meta-box {
  font-size: 10px !important;
}

.sc-receipt-overlay .meta-line {
  gap: 4px !important;
  margin-bottom: 2px !important;
}

.sc-receipt-overlay .meta-line span {
  min-width: 24px !important;
}

.sc-receipt-overlay .receipt-org {
  padding: 6px 10px !important;
  font-size: 10px !important;
  gap: 1px !important;
}

.sc-receipt-overlay .receipt-org strong {
  font-size: 12px !important;
}

.sc-receipt-overlay .receipt-field {
  padding: 6px 10px 0 !important;
}

.sc-receipt-overlay .receipt-field label {
  font-size: 8px !important;
  margin-bottom: 2px !important;
}

.sc-receipt-overlay .field-line {
  min-height: 18px !important;
  padding-bottom: 2px !important;
  font-size: 11px !important;
}

.sc-receipt-overlay .receipt-amount-row {
  gap: 6px !important;
  padding: 6px 10px 0 !important;
}

.sc-receipt-overlay .amount-box {
  padding: 5px 8px !important;
  min-width: 78px !important;
}

.sc-receipt-overlay .amount-box .currency {
  font-size: 10px !important;
}

.sc-receipt-overlay .amount-box strong {
  font-size: 14px !important;
}

.sc-receipt-overlay .inline-two {
  gap: 8px !important;
}

.sc-receipt-overlay .receipt-signatures {
  grid-template-columns: 1fr 88px !important;
  gap: 10px !important;
  padding: 10px !important;
}

.sc-receipt-overlay .sig-block label {
  font-size: 8px !important;
}

.sc-receipt-overlay .sig-line {
  min-height: 18px !important;
  padding-top: 10px !important;
  font-size: 11px !important;
}

.sc-receipt-overlay .sign-area {
  height: 30px !important;
}

.sc-receipt-overlay .sign-box span {
  font-size: 9px !important;
}

.sc-receipt-overlay .receipt-footer-bar {
  padding: 6px 10px !important;
  font-size: 9px !important;
}

.sc-receipt-overlay .receipt-footer-bar strong {
  font-size: 10px !important;
}

.sc-receipt-overlay .receipt-actions {
  display: flex !important;
  gap: 8px !important;
  justify-content: stretch !important;
}

.sc-receipt-overlay .btn-print,
.sc-receipt-overlay .btn-close {
  flex: 1 1 0 !important;
  padding: 8px 10px !important;
  font-size: 0.75rem !important;
  min-height: 38px !important;
  border-radius: 8px !important;
}

@media (max-width: 480px) {
  .sc-receipt-overlay .receipt-modal-box {
    width: calc(100vw - 1.25rem) !important;
    max-width: calc(100vw - 1.25rem) !important;
    max-height: calc(100vh - 1.25rem) !important;
    padding: 6px !important;
  }
}

/* Alert modal */
.sc-alert-overlay.app-modal-overlay {
  z-index: 12050 !important;
  font-size: 16px;
  line-height: 1.6;
}

.sc-alert-modal.modal-content {
  width: min(22rem, calc(100vw - 2rem));
  max-width: min(22rem, calc(100vw - 2rem));
  max-height: none;
  padding: 1.25rem 1.15rem 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  background: rgba(31, 48, 36, 0.96);
  border: 1px solid rgba(190, 235, 203, 0.28);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.sc-alert-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 800;
}

.sc-alert-success .sc-alert-icon {
  background: rgba(74, 222, 128, 0.18);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.sc-alert-error .sc-alert-icon {
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.sc-alert-message {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
  color: #eefde6;
  word-break: break-word;
}

.sc-alert-ok {
  min-width: 6.5rem;
  min-height: 40px;
  justify-content: center;
}

.sc-alert-overlay.light-theme .sc-alert-modal.modal-content {
  background: #ffffff;
  border-color: #86efac;
}

.sc-alert-overlay.light-theme .sc-alert-message {
  color: #052e16;
}

.sc-alert-overlay.light-theme .sc-alert-ok {
  background: #ffffff;
  color: #052e16;
  border: 1px solid #166534;
}

@media (max-width: 768px) {
  .share-capital-withdrawal-page .fin-desktop-table {
    display: none !important;
  }

  .share-capital-withdrawal-page .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
  }

  .share-capital-withdrawal-page table.data-table,
  .share-capital-withdrawal-page table.data-table thead,
  .share-capital-withdrawal-page table.data-table tbody,
  .share-capital-withdrawal-page table.data-table tr,
  .share-capital-withdrawal-page table.data-table th,
  .share-capital-withdrawal-page table.data-table td {
    display: revert !important;
    width: auto !important;
    position: static !important;
    padding-left: revert !important;
    margin-bottom: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
}
</style>
