<template>
  <div class="page-container operator-dashboard-page machinery-ui" :class="{ 'light-theme': isLight }">
    <div v-if="!isOperator" class="access-denied-card">
      <h2>{{ $t('ui.accessDenied') }}</h2>
      <p>{{ $t('ui.pageForOperators') }}</p>
    </div>

    <template v-else>
      <div class="page-header page-header-split">
        <div class="page-header-text">
          <h1 class="page-title">{{ $t('ui.operatorDashboard') }}</h1>
          <p class="page-subtitle">{{ $t('ui.operatorDashSub') }}</p>
        </div>
      </div>

      <div v-if="loading" class="loading-state">
        <div class="loading-spinner"></div>
        <div>{{ $t('ui.loadingDashboard') }}</div>
      </div>

      <template v-else>
        <!-- Earnings & booking statistics — forced 3×2 on desktop -->
        <div class="stats-grid op-stats-grid" role="list">
          <div class="stat-card stat-info" role="listitem">
            <div class="stat-content">
              <div class="stat-label">Total Earnings</div>
              <div class="stat-value">₱{{ formatMoney(summary.total_earnings) }}</div>
            </div>
          </div>
          <div class="stat-card" role="listitem">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.thisMonth') }}</div>
              <div class="stat-value">₱{{ formatMoney(summary.monthly_earnings) }}</div>
            </div>
          </div>
          <div class="stat-card stat-pending" role="listitem">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.thisYear') }}</div>
              <div class="stat-value">₱{{ formatMoney(summary.yearly_earnings) }}</div>
            </div>
          </div>
          <div class="stat-card stat-success" role="listitem">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.completedTransactions') }}</div>
              <div class="stat-value">{{ summary.total_completed_transactions || 0 }}</div>
            </div>
          </div>
          <div class="stat-card stat-pending" role="listitem">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.upcomingBookings') }}</div>
              <div class="stat-value">{{ upcomingBookings.length }}</div>
            </div>
          </div>
          <div class="stat-card stat-success" role="listitem">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.activeBookings') }}</div>
              <div class="stat-value">{{ activeBookings.length }}</div>
            </div>
          </div>
        </div>

        <div class="dashboard-grid">
          <section class="card section-card">
            <div class="section-header-row">
              <div class="section-heading">
                <h2 class="section-title">{{ $t('ui.assignedMachinery') }}</h2>
                <span class="section-count" aria-label="Assigned count">{{ assignedMachinery.length }}</span>
              </div>
            </div>
            <div v-if="assignedMachinery.length === 0" class="empty-state">{{ $t('ui.noMachineryAssigned') }}</div>
            <div v-else class="machinery-list">
              <button
                v-for="m in assignedMachinery"
                :key="m.id"
                type="button"
                class="machinery-item"
                @click="openMachineryModal(m)"
              >
                <div class="machinery-main">
                  <strong class="machinery-name">{{ m.machinery_name }}</strong>
                </div>
                <span :class="['status-badge', statusClass(m.status)]">{{ m.status }}</span>
              </button>
            </div>
          </section>

          <section class="card section-card">
            <div class="section-header-row">
              <div class="section-heading">
                <h2 class="section-title">{{ $t('ui.upcomingBookings') }}</h2>
                <span class="section-count">{{ upcomingBookings.length }}</span>
              </div>
            </div>
            <booking-mini-list
              :bookings="upcomingBookings"
              :highlighted-id="highlightedBookingId"
              empty-text="No upcoming bookings."
              @select="openBookingModal"
            />
          </section>

          <section class="card section-card">
            <div class="section-header-row">
              <div class="section-heading">
                <h2 class="section-title">{{ $t('ui.activeBookings') }}</h2>
                <span class="section-count">{{ activeBookings.length }}</span>
              </div>
            </div>
            <booking-mini-list
              :bookings="activeBookings"
              :highlighted-id="highlightedBookingId"
              empty-text="No active bookings."
              @select="openBookingModal"
            />
          </section>

          <section class="card section-card">
            <div class="section-header-row">
              <div class="section-heading">
                <h2 class="section-title">{{ $t('ui.completedBookings') }}</h2>
                <span class="section-count">{{ completedBookings.length }}</span>
              </div>
            </div>
            <booking-mini-list
              :bookings="completedBookings"
              :highlighted-id="highlightedBookingId"
              empty-text="No completed bookings yet."
              hide-booking-id
              @select="openBookingModal"
            />
          </section>

          <section class="card section-card">
            <div class="section-header-row">
              <div class="section-heading">
                <h2 class="section-title">{{ $t('ui.incompleteBookings') }}</h2>
                <span class="section-count">{{ incompleteBookings.length }}</span>
              </div>
            </div>
            <booking-mini-list
              :bookings="incompleteBookings"
              :highlighted-id="highlightedBookingId"
              empty-text="No incomplete bookings."
              hide-booking-id
              @select="openBookingModal"
            />
          </section>

          <section class="card section-card wide-card">
            <div class="section-header-row">
              <div class="section-heading">
                <h2 class="section-title">{{ $t('ui.recentTransactions') }}</h2>
                <span class="section-count">{{ recentTransactions.length }}</span>
              </div>
            </div>
            <div v-if="recentTransactions.length === 0" class="empty-state">{{ $t('ui.noIncomeTx') }}</div>
            <div v-else class="tx-list">
              <article
                v-for="tx in recentTransactions"
                :key="tx.id"
                class="tx-item"
              >
                <div class="tx-item-body">
                  <div class="tx-item-top">
                    <div class="tx-item-heading">
                      <strong class="tx-machine">{{ tx.machinery_name }}</strong>
                      <span class="status-badge status-credited">{{ tx.income_status }}</span>
                    </div>
                    <strong class="tx-amount amount">₱{{ formatMoney(tx.labor_cost_amount) }}</strong>
                  </div>
                  <div class="tx-item-bottom">
                    <div class="tx-item-meta">
                      <span class="tx-meta-chip">{{ formatDate(tx.transaction_date) }}</span>
                      <span v-if="tx.farmer_name" class="tx-meta-chip">{{ tx.farmer_name }}</span>
                      <span v-if="tx.receipt_number" class="tx-receipt-chip">{{ tx.receipt_number }}</span>
                    </div>
                    <button
                      type="button"
                      class="btn-secondary btn-sm tx-view-btn"
                      @click="viewRecentTransaction(tx)"
                    >
                      {{ $t('common.view') }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>

        <section class="card section-card income-section">
          <div class="section-header-row">
            <div class="section-heading">
              <h2 class="section-title">{{ $t('ui.incomeHistoryShort') }}</h2>
            </div>
          </div>

          <div class="income-toolbar">
            <div class="income-filters">
              <div class="form-group">
                <label class="form-label" for="op-start-date">Start Date</label>
                <input
                  id="op-start-date"
                  v-model="incomeFilters.start_date"
                  type="date"
                  class="form-input toolbar-input"
                  @change="loadIncome"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="op-end-date">End Date</label>
                <input
                  id="op-end-date"
                  v-model="incomeFilters.end_date"
                  type="date"
                  class="form-input toolbar-input"
                  @change="loadIncome"
                />
              </div>
              <div class="form-group">
                <label class="form-label" for="op-machinery">{{ $t('ui.machinery') }}</label>
                <select
                  id="op-machinery"
                  v-model="incomeFilters.machinery_id"
                  class="form-input toolbar-select"
                  @change="loadIncome"
                >
                  <option value="">{{ $t('ui.allMachinery') }}</option>
                  <option v-for="m in assignedMachinery" :key="m.id" :value="m.id">{{ m.machinery_name }}</option>
                </select>
              </div>
              <div class="form-group">
                <label class="form-label" for="op-booking-status">{{ $t('ui.status') }}</label>
                <select
                  id="op-booking-status"
                  v-model="incomeFilters.booking_status"
                  class="form-input toolbar-select"
                  @change="loadIncome"
                >
                  <option value="">{{ $t('ui.allStatus') }}</option>
                  <option value="Completed">{{ $t('common.completed') }}</option>
                  <option value="Incomplete">{{ $t('common.incomplete') }}</option>
                </select>
              </div>
            </div>
          </div>

          <div v-if="earningsPerMachinery.length" class="earnings-per-machinery">
            <h3>Earnings Per Machinery</h3>
            <div class="earnings-chips">
              <div v-for="row in earningsPerMachinery" :key="row.machinery_id" class="earnings-chip">
                <span class="chip-name">{{ row.machinery_name }}</span>
                <span class="chip-amount">₱{{ formatMoney(row.total_earnings) }}</span>
                <small>{{ row.transaction_count }} {{ Number(row.transaction_count) === 1 ? 'transaction' : 'transactions' }}</small>
              </div>
            </div>
          </div>
          <div v-else class="empty-state">{{ $t('ui.noEarningsFilters') }}</div>
        </section>
      </template>
    </template>

    <!-- View Booking Modal -->
    <Teleport to="body">
      <div
        v-if="showBookingModal && selectedBooking"
        class="modal-overlay app-modal-overlay machinery-ui"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content modal-large tx-detail-modal" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>{{ bookingModalTitle }}</h2>
            <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeModals">×</button>
          </div>
          <div class="modal-body">
            <div class="booking-details tx-detail-sections">
              <div class="detail-section tx-detail-section">
                <h3 class="tx-detail-section-title">Farmer Information</h3>
                <div class="details-grid tx-details-grid">
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.name') }}</label>
                    <span>{{ selectedBooking.farmer_name || '—' }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedBooking.reference_number">
                    <label>Reference</label>
                    <span>{{ selectedBooking.reference_number }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-section tx-detail-section">
                <h3 class="tx-detail-section-title">{{ $t('ui.machineryServiceDetails') }}</h3>
                <div class="details-grid tx-details-grid">
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.machinery') }}</label>
                    <span>{{ selectedBooking.machinery_name }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedBooking.machinery_type">
                    <label>{{ $t('ui.type') }}</label>
                    <span class="badge badge-info">{{ selectedBooking.machinery_type }}</span>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.date') }}</label>
                    <span>{{ formatDate(selectedBooking.booking_date) }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedBooking.service_location">
                    <label>{{ $t('ui.location') }}</label>
                    <span>{{ selectedBooking.service_location }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedBooking.area_size">
                    <label>{{ $t('ui.areaQuantity') }}</label>
                    <span>{{ selectedBooking.area_size }} {{ selectedBooking.area_unit }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedBooking.total_price != null">
                    <label>{{ $t('ui.totalPrice') }}</label>
                    <strong class="amount">₱{{ formatMoney(selectedBooking.total_price) }}</strong>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.status') }}</label>
                    <span :class="['status-badge', bookingStatusClass(selectedBooking.status)]">{{ selectedBooking.status }}</span>
                  </div>
                </div>
              </div>
              <div class="detail-section tx-detail-section" v-if="selectedBooking.notes">
                <h3 class="tx-detail-section-title">{{ $t('ui.notes') }}</h3>
                <p class="notes-text">{{ selectedBooking.notes }}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Machinery Modal -->
    <Teleport to="body">
      <div
        v-if="showMachineryModal && selectedMachinery"
        class="modal-overlay app-modal-overlay machinery-ui"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content modal-medium tx-detail-modal" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>{{ selectedMachinery.machinery_name }}</h2>
            <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeModals">×</button>
          </div>
          <div class="modal-body">
            <div class="tx-detail-sections">
              <div class="detail-section tx-detail-section">
                <h3 class="tx-detail-section-title">{{ $t('ui.machineryDetails') }}</h3>
                <div class="details-grid tx-details-grid">
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.type') }}</label>
                    <span class="badge badge-info">{{ selectedMachinery.machinery_type }}</span>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.status') }}</label>
                    <span :class="['status-badge', statusClass(selectedMachinery.status)]">{{ selectedMachinery.status }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedMachinery.barangay_name">
                    <label>{{ $t('ui.barangay') }}</label>
                    <span>{{ selectedMachinery.barangay_name }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedMachinery.member_price || selectedMachinery.price_per_unit">
                    <label>{{ $t('ui.memberRate') }}</label>
                    <span class="amount">
                      ₱{{ formatMoney(selectedMachinery.member_price || selectedMachinery.price_per_unit) }}
                      <small v-if="selectedMachinery.unit_type">/{{ selectedMachinery.unit_type }}</small>
                    </span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedMachinery.non_member_price">
                    <label>{{ $t('ui.nonMemberRate') }}</label>
                    <span class="amount">
                      ₱{{ formatMoney(selectedMachinery.non_member_price) }}
                      <small v-if="selectedMachinery.unit_type">/{{ selectedMachinery.unit_type }}</small>
                    </span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedMachinery.max_capacity">
                    <label>{{ $t('ui.capacity') }}</label>
                    <span>{{ selectedMachinery.max_capacity }} {{ selectedMachinery.capacity_unit }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Transaction Modal -->
    <Teleport to="body">
      <div
        v-if="showTransactionModal && selectedTransaction"
        class="modal-overlay app-modal-overlay machinery-ui"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content modal-medium tx-detail-modal" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>Transaction</h2>
            <button type="button" class="modal-close" :aria-label="$t('common.close')" @click="closeModals">×</button>
          </div>
          <div class="modal-body">
            <div class="tx-detail-sections">
              <div class="detail-section tx-detail-section">
                <h3 class="tx-detail-section-title">Income Details</h3>
                <div class="details-grid tx-details-grid">
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.date') }}</label>
                    <span>{{ formatDate(selectedTransaction.transaction_date) }}</span>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.machinery') }}</label>
                    <span>{{ selectedTransaction.machinery_name }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedTransaction.farmer_name">
                    <label>{{ $t('ui.farmer') }}</label>
                    <span>{{ selectedTransaction.farmer_name }}</span>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>Labor Cost</label>
                    <strong class="amount">₱{{ formatMoney(selectedTransaction.labor_cost_amount) }}</strong>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>Income Status</label>
                    <span class="status-badge status-credited">{{ selectedTransaction.income_status }}</span>
                  </div>
                  <div v-if="selectedTransaction.receipt_number" class="detail-item tx-detail-item">
                    <label>{{ $t('ui.receiptNo') }}</label>
                    <span>{{ selectedTransaction.receipt_number }}</span>
                  </div>
                </div>
              </div>
            </div>
            <div v-if="selectedTransaction.receipt_number" class="modal-actions tx-receipt-actions">
              <button type="button" class="btn-primary" @click="viewLaborReceipt(selectedTransaction)">
                View Labor Receipt
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showReceiptModal && lastReceipt"
          class="modal-overlay receipt-modal-overlay app-modal-overlay op-receipt-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeReceiptModal"
        >
          <div class="receipt-modal-box" @click.stop>
            <PaymentReceiptPrint
              :receipt="lastReceipt"
              :auto-print="false"
              kind="labor"
              @close="closeReceiptModal"
            />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, defineComponent, h, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useMachineryStore } from '../stores/machineryStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { consumeNotificationDeepLink, scrollElementWhenReady } from '../utils/paymentHistoryFocus'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'

const BookingMiniList = defineComponent({
  name: 'BookingMiniList',
  props: {
    bookings: { type: Array, default: () => [] },
    emptyText: { type: String, default: 'No bookings.' },
    /** Hide booking # — keep the same card layout, status stays on the right */
    hideBookingId: { type: Boolean, default: false },
    highlightedId: { type: [String, Number], default: null }
  },
  emits: ['select'],
  setup(props, { emit }) {
    const formatDate = (d) => {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    const statusClass = (status) =>
      `status-badge status-${String(status || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`

    return () => {
      if (!props.bookings.length) {
        return h('div', { class: 'empty-state' }, props.emptyText)
      }
      return h(
        'div',
        { class: 'booking-mini-list' },
        props.bookings.map((b) => {
          const titleChildren = []
          if (!props.hideBookingId) {
            titleChildren.push(h('span', { class: 'booking-mini-id' }, `#${b.id}`))
          }
          titleChildren.push(
            h('strong', { class: 'booking-mini-machine' }, b.machinery_name || 'Machinery')
          )

          return h(
            'button',
            {
              class: [
                'booking-mini-item',
                props.highlightedId != null && String(props.highlightedId) === String(b.id)
                  ? 'notification-highlight-row'
                  : null
              ],
              type: 'button',
              key: b.id,
              'data-booking-id': b.id,
              onClick: () => emit('select', b)
            },
            [
              h('div', { class: 'booking-mini-main' }, [
                h('div', { class: 'booking-mini-title' }, titleChildren),
                h('span', { class: 'booking-mini-farmer' }, [
                  h('span', { class: 'booking-mini-label' }, 'Farmer'),
                  h('span', b.farmer_name || '—')
                ])
              ]),
              h('div', { class: 'booking-mini-meta' }, [
                h('span', { class: 'booking-mini-date' }, [
                  h('span', { class: 'booking-mini-label' }, 'Service date'),
                  h('span', formatDate(b.booking_date))
                ]),
                h('span', { class: statusClass(b.status) }, b.status)
              ])
            ]
          )
        })
      )
    }
  }
})

export default {
  name: 'OperatorDashboardPage',
  components: { BookingMiniList, PaymentReceiptPrint },
  setup() {
    const authStore = useAuthStore()
    const machineryStore = useMachineryStore()
    const route = useRoute()
    const router = useRouter()
    const { isDark } = useBackdropTheme()
    const isLight = computed(() => !isDark.value)

    const loading = ref(true)
    const highlightedBookingId = ref(null)
    const assignedMachinery = ref([])
    const upcomingBookings = ref([])
    const activeBookings = ref([])
    const completedBookings = ref([])
    const incompleteBookings = ref([])
    const recentTransactions = ref([])
    const incomeHistory = ref([])
    const earningsPerMachinery = ref([])
    const summary = ref({
      total_earnings: 0,
      monthly_earnings: 0,
      yearly_earnings: 0,
      total_completed_transactions: 0
    })

    const incomeFilters = ref({
      start_date: '',
      end_date: '',
      machinery_id: '',
      booking_status: ''
    })

    const showBookingModal = ref(false)
    const showMachineryModal = ref(false)
    const showTransactionModal = ref(false)
    const showReceiptModal = ref(false)
    const selectedBooking = ref(null)
    const selectedMachinery = ref(null)
    const selectedTransaction = ref(null)
    const lastReceipt = ref(null)
    const receiptLoading = ref(false)

    const isOperator = computed(() => authStore.currentUser?.role === 'operator')

    const isAnyModalOpen = computed(
      () =>
        showBookingModal.value ||
        showMachineryModal.value ||
        showTransactionModal.value ||
        showReceiptModal.value
    )

    const bookingModalTitle = computed(() => {
      const status = selectedBooking.value?.status || ''
      if (status === 'Completed') return 'Completed Booking'
      if (status === 'Incomplete') return 'Incomplete Booking'
      if (status === 'Approved' || status === 'Assigned to Operator' || status === 'Booking Confirmed' || status === 'In Use') return 'Active Booking'
      return 'Booking Details'
    })

    const formatMoney = (v) =>
      Number(v || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
    const formatDate = (d) => {
      if (!d) return '—'
      return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
    }
    const statusClass = (status) => {
      const map = {
        Available: 'available',
        Unavailable: 'unavailable',
        'In Use': 'unavailable',
        'Under Maintenance': 'unavailable'
      }
      return `status-${map[status] || 'unknown'}`
    }
    const bookingStatusClass = (status) =>
      `status-${String(status || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '')}`

    const closeModals = () => {
      showBookingModal.value = false
      showMachineryModal.value = false
      showTransactionModal.value = false
      selectedBooking.value = null
      selectedMachinery.value = null
      selectedTransaction.value = null
    }

    const closeReceiptModal = () => {
      showReceiptModal.value = false
      lastReceipt.value = null
    }

    const openBookingModal = (booking) => {
      selectedBooking.value = booking
      showBookingModal.value = true
    }

    const openMachineryModal = (machinery) => {
      selectedMachinery.value = machinery
      showMachineryModal.value = true
    }

    const openTransactionModal = (tx) => {
      selectedTransaction.value = tx
      showTransactionModal.value = true
    }

    const viewRecentTransaction = async (tx) => {
      if (tx?.receipt_number) {
        await viewLaborReceipt(tx)
        return
      }
      openTransactionModal(tx)
    }

    const viewLaborReceipt = async (tx) => {
      const receiptNumber = tx?.receipt_number
      if (!receiptNumber || receiptLoading.value) return
      receiptLoading.value = true
      try {
        lastReceipt.value = await machineryStore.fetchReceipt(receiptNumber)
        if (!lastReceipt.value) throw new Error('Receipt not found')
        if (!lastReceipt.value.barangay_name) {
          lastReceipt.value.barangay_name = authStore.currentUser?.barangay_name || ''
        }
        if (!lastReceipt.value.collector_name) {
          lastReceipt.value.collector_name = 'Treasurer'
        }
        showReceiptModal.value = true
      } catch (e) {
        console.error('Failed to load labor receipt:', e)
        window.alert(e.message || 'Could not load labor receipt.')
      } finally {
        receiptLoading.value = false
      }
    }

    const loadDashboard = async () => {
      loading.value = true
      try {
        const data = await machineryStore.fetchOperatorDashboard()
        assignedMachinery.value = data.assigned_machinery || []
        upcomingBookings.value = data.upcoming_bookings || []
        activeBookings.value = data.active_bookings || []
        completedBookings.value = data.completed_bookings || []
        incompleteBookings.value = data.incomplete_bookings || []
        recentTransactions.value = data.recent_transactions || []
        summary.value = data.income_summary || summary.value
        earningsPerMachinery.value = data.earnings_per_machinery || []
      } finally {
        loading.value = false
      }
    }

    const loadIncome = async () => {
      const filters = {}
      Object.entries(incomeFilters.value).forEach(([k, v]) => {
        if (v) filters[k] = v
      })
      const data = await machineryStore.fetchOperatorIncome(filters)
      incomeHistory.value = data.income || []
      if (data.summary) summary.value = { ...summary.value, ...data.summary }
      if (data.earnings_per_machinery) earningsPerMachinery.value = data.earnings_per_machinery
    }

    const allDashboardBookings = computed(() => [
      ...upcomingBookings.value,
      ...activeBookings.value,
      ...completedBookings.value,
      ...incompleteBookings.value
    ])

    const applyDashboardHighlightFromRoute = async () => {
      const highlightId = route.query.highlight
      const linkType = String(route.query.type || '')
      if (!highlightId) return
      if (linkType && linkType !== 'booking') return

      highlightedBookingId.value = highlightId
      const found = allDashboardBookings.value.find((b) => String(b.id) === String(highlightId))
      if (found) {
        openBookingModal(found)
      }

      await scrollElementWhenReady(`[data-booking-id="${highlightId}"]`, nextTick)

      consumeNotificationDeepLink(router, route, () => {
        highlightedBookingId.value = null
      })
    }

    watch(
      () => [route.query.highlight, route.query.type, route.query.nav],
      () => {
        applyDashboardHighlightFromRoute()
      }
    )

    watch(
      allDashboardBookings,
      () => {
        const highlightId = route.query.highlight
        if (!highlightId || String(route.query.type || '') !== 'booking') return
        const found = allDashboardBookings.value.find((b) => String(b.id) === String(highlightId))
        if (!found) return
        highlightedBookingId.value = highlightId
        if (!showBookingModal.value || String(selectedBooking.value?.id) !== String(highlightId)) {
          openBookingModal(found)
        }
        void scrollElementWhenReady(`[data-booking-id="${highlightId}"]`, nextTick)
      },
      { deep: true }
    )

    watch(
      isAnyModalOpen,
      (open) => {
        document.body.style.overflow = open ? 'hidden' : ''
        document.body.classList.toggle('app-modal-open', open)
      },
      { immediate: true }
    )

    onMounted(async () => {
      if (!isOperator.value) return
      await loadDashboard()
      await loadIncome()
      await applyDashboardHighlightFromRoute()
    })

    onUnmounted(() => {
      document.body.style.overflow = ''
      document.body.classList.remove('app-modal-open')
    })

    return {
      loading,
      isOperator,
      isLight,
      highlightedBookingId,
      assignedMachinery,
      upcomingBookings,
      activeBookings,
      completedBookings,
      incompleteBookings,
      recentTransactions,
      earningsPerMachinery,
      summary,
      incomeFilters,
      showBookingModal,
      showMachineryModal,
      showTransactionModal,
      showReceiptModal,
      selectedBooking,
      selectedMachinery,
      selectedTransaction,
      lastReceipt,
      bookingModalTitle,
      formatMoney,
      formatDate,
      statusClass,
      bookingStatusClass,
      loadIncome,
      openBookingModal,
      openMachineryModal,
      openTransactionModal,
      viewRecentTransaction,
      viewLaborReceipt,
      closeReceiptModal,
      closeModals
    }
  }
}
</script>

<style scoped>
.page-container.operator-dashboard-page {
  --surface-1: rgba(28, 42, 33, 0.92);
  --surface-2: rgba(24, 39, 30, 0.92);
  --surface-3: #2d5c4a;
  --line-soft: rgba(190, 235, 203, 0.14);
  --line-strong: rgba(187, 227, 196, 0.35);
  --text-main: #eefde6;
  --text-muted: rgba(229, 235, 231, 0.82);
  --text-soft: rgba(229, 235, 231, 0.65);
  --success: #6ee7a8;
  --warning: #e8c468;
  --danger: #f87171;
  --info: #7dd3fc;
  --panel-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  padding: 2rem;
  max-width: none;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  min-height: calc(100vh - 70px - 3rem);
  box-sizing: border-box;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  color: #eefde6;
  border-radius: 18px;
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
  padding-bottom: 1.25rem;
}

.operator-dashboard-page::before,
.operator-dashboard-page::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}

.operator-dashboard-page::before {
  background:
    radial-gradient(ellipse 80% 50% at 12% 88%, rgba(110, 231, 168, 0.06) 0%, transparent 58%),
    radial-gradient(ellipse 70% 50% at 88% 12%, rgba(232, 196, 104, 0.05) 0%, transparent 55%);
}

.operator-dashboard-page::after {
  background:
    radial-gradient(circle at 90% 8%, rgba(232, 196, 104, 0.05) 0%, transparent 24%),
    radial-gradient(circle at 10% 90%, rgba(61, 122, 92, 0.08) 0%, transparent 22%);
}

.operator-dashboard-page > *:not(.modal-overlay):not(.alert) {
  position: relative;
  z-index: 1;
}

.page-header-split {
  margin-bottom: 1rem;
  padding: 0.9rem 1.1rem 0.85rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
}

.page-header-split::before {
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

.page-header-split::after {
  content: '';
  position: absolute;
  left: 1.4rem;
  right: 1.4rem;
  bottom: 0.55rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.42), rgba(45, 212, 191, 0.12));
  pointer-events: none;
}

.page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 220px;
}

.page-title {
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.2rem;
  color: #eefde6;
}

.page-subtitle {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(229, 235, 231, 0.82);
}

.btn-header-add {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 36px;
  padding: 0.4rem 0.85rem;
  border: 1.5px solid #15803d;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.84rem;
  line-height: 1.2;
  text-decoration: none;
  cursor: pointer;
  color: #000000;
  background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
  transition: transform 0.15s ease, filter 0.15s ease;
}

.btn-header-add:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

/* ===== Stats: EXACT 3×2 on desktop ===== */
.operator-dashboard-page .stats-grid.op-stats-grid,
.operator-dashboard-page .op-stats-grid {
  display: grid !important;
  grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  gap: 0.65rem !important;
  margin: 0 0 0.9rem !important;
  width: 100%;
}

.operator-dashboard-page .op-stats-grid .stat-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  width: 100%;
  min-width: 0;
  min-height: 72px;
  height: 100%;
  margin: 0;
  gap: 0.5rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  box-shadow: var(--panel-shadow);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  box-sizing: border-box;
}

.operator-dashboard-page .op-stats-grid .stat-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.operator-dashboard-page .op-stats-grid .stat-card:hover {
  transform: translateY(-2px);
  border-color: var(--line-strong);
}

.operator-dashboard-page .op-stats-grid .stat-card:hover::after {
  opacity: 1;
}

.operator-dashboard-page .op-stats-grid .stat-card:first-child {
  border-left: 3px solid var(--success);
}

.operator-dashboard-page .op-stats-grid .stat-success {
  border-left: 3px solid var(--success);
}

.operator-dashboard-page .op-stats-grid .stat-pending {
  border-left: 3px solid var(--warning);
}

.operator-dashboard-page .op-stats-grid .stat-info {
  border-left: 3px solid var(--info);
}

.operator-dashboard-page .op-stats-grid .stat-content {
  min-width: 0;
  width: 100%;
}

.operator-dashboard-page .op-stats-grid .stat-label {
  margin: 0 0 0.25rem;
  font-size: 0.68rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-soft);
  line-height: 1.2;
}

.operator-dashboard-page .op-stats-grid .stat-value {
  margin: 0;
  font-size: 1.25rem;
  line-height: 1.15;
  font-weight: 900;
  letter-spacing: -0.3px;
  color: var(--text-main);
  word-break: break-word;
}

.dashboard-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.75rem;
  align-items: start;
}

.card,
.section-card {
  background: rgba(28, 42, 33, 0.92);
  border-radius: 12px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  min-height: 0;
  margin-bottom: 0;
  padding: 0.8rem 0.85rem 0.85rem;
}

.wide-card {
  grid-column: 1 / -1;
}

.income-section {
  margin: 0;
  padding: 0.8rem 0.85rem 0.9rem;
}

.section-header-row {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 0.5rem;
  margin: 0 0 0.55rem;
  padding: 0 0 0.5rem;
  border-bottom: 1px solid var(--line-soft);
}

.section-heading {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-width: 0;
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  line-height: 1.2;
  color: var(--text-main);
}

.section-count {
  flex-shrink: 0;
  min-width: 1.5rem;
  height: 1.5rem;
  display: inline-grid;
  place-items: center;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.14);
  border: 1px solid rgba(74, 222, 128, 0.28);
  color: var(--success);
  font-size: 0.72rem;
  font-weight: 850;
  line-height: 1;
}

.machinery-list,
.booking-mini-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.machinery-item,
.booking-mini-item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(167, 211, 178, 0.22);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.15s ease, transform 0.15s ease;
}

.machinery-item:hover,
.booking-mini-item:hover {
  border-color: rgba(110, 231, 168, 0.35);
  background: rgba(110, 231, 168, 0.06);
}

.booking-mini-item.notification-highlight-row {
  animation: opHighlightPulse 2s ease-in-out 3;
  border-color: rgba(250, 204, 21, 0.85) !important;
  box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.35);
}

@keyframes opHighlightPulse {
  0%, 100% { box-shadow: 0 0 0 2px rgba(250, 204, 21, 0.35); }
  50% { box-shadow: 0 0 0 4px rgba(250, 204, 21, 0.55); }
}

.booking-mini-item:hover {
  border-color: var(--line-strong);
  transform: translateY(-1px);
}

.machinery-main {
  min-width: 0;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.machinery-name,
.machinery-main strong,
.booking-mini-machine {
  color: var(--text-main);
  font-size: 0.9rem;
  font-weight: 800;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(100%, 14rem);
}

.machinery-item > .status-badge {
  flex-shrink: 0;
  justify-self: end;
  align-self: center;
}

.booking-mini-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.booking-mini-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.booking-mini-id {
  flex-shrink: 0;
  padding: 0.2rem 0.42rem;
  border-radius: 7px;
  background: rgba(96, 165, 250, 0.16);
  border: 1px solid rgba(96, 165, 250, 0.24);
  color: #bfdbfe;
  font-size: 0.7rem;
  font-weight: 850;
}

.booking-mini-machine {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.booking-mini-farmer {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  color: var(--text-muted);
  font-size: 0.78rem;
}

.booking-mini-label {
  color: var(--text-soft);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.booking-mini-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.42rem;
  font-size: 0.76rem;
}

.booking-mini-date {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.12rem;
  color: var(--text-muted);
  white-space: nowrap;
}

.badge,
.status-badge {
  display: inline-flex;
  width: fit-content;
  padding: 0.18rem 0.5rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 750;
  white-space: nowrap;
}

.badge,
.badge-info {
  background: rgba(96, 165, 250, 0.16);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.25);
}

.status-badge {
  background: rgba(156, 163, 175, 0.15);
  color: var(--text-muted);
  border: 1px solid rgba(156, 163, 175, 0.22);
}

.status-available,
.status-completed,
.status-credited {
  background: rgba(22, 101, 52, 0.5);
  color: #dcfce7;
  border-color: rgba(74, 222, 128, 0.26);
}

.status-approved,
.status-booking-confirmed,
.status-assigned-to-operator,
.status-in-use {
  background: rgba(30, 64, 175, 0.42);
  color: #dbeafe;
  border-color: rgba(96, 165, 250, 0.28);
}

.status-incomplete,
.status-maintenance {
  background: rgba(146, 64, 14, 0.45);
  color: #fef3c7;
  border-color: rgba(251, 191, 36, 0.28);
}

.status-not-available,
.status-unavailable {
  background: rgba(127, 29, 29, 0.45);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.28);
}

.empty-state,
.loading-state,
.access-denied-card {
  padding: 0.7rem 0.75rem;
  border: 1px dashed var(--line-soft);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.12);
  color: var(--text-muted);
  font-size: 0.8rem;
  text-align: center;
}

.loading-state,
.access-denied-card {
  padding: 1.25rem;
  border-style: solid;
  background: var(--surface-1);
}

.loading-spinner {
  width: 24px;
  height: 24px;
  margin: 0 auto 0.55rem;
  border: 3px solid rgba(110, 231, 168, 0.2);
  border-top-color: var(--success);
  border-radius: 50%;
  animation: op-spin 0.8s linear infinite;
}

@keyframes op-spin {
  to {
    transform: rotate(360deg);
  }
}

/* ===== Transaction list (Recent + Income) ===== */
.tx-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tx-item {
  width: 100%;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(167, 211, 178, 0.22);
  background: rgba(0, 0, 0, 0.16);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: default;
  transition: border-color 0.15s ease;
}

.tx-item:hover {
  border-color: var(--line-strong);
}

.tx-item-body {
  display: flex;
  flex-direction: column;
  gap: 0.32rem;
  min-width: 0;
}

.tx-item-top,
.tx-item-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.45rem;
  min-width: 0;
}

.tx-item-heading {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.28rem 0.35rem;
  min-width: 0;
  flex: 1 1 auto;
}

.tx-machine {
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--text-main);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: min(100%, 11.5rem);
}

.tx-item-heading .status-badge {
  margin: 0;
  flex-shrink: 0;
  font-size: 0.56rem;
  padding: 0.1rem 0.38rem;
  line-height: 1.15;
}

.tx-item-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  flex: 1 1 auto;
}

.tx-meta-chip {
  display: inline-flex;
  align-items: center;
  max-width: 10.5rem;
  padding: 0.08rem 0.32rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(190, 235, 203, 0.12);
  color: var(--text-muted);
  font-size: 0.64rem;
  font-weight: 600;
  line-height: 1.2;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tx-amount {
  font-size: 0.9rem;
  font-weight: 850;
  white-space: nowrap;
  line-height: 1.15;
  flex-shrink: 0;
}

.tx-receipt-chip {
  font-size: 0.58rem;
  font-weight: 700;
  color: var(--text-soft);
  letter-spacing: 0.01em;
  max-width: 9rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tx-view-btn {
  flex-shrink: 0;
  min-height: 28px;
  height: 28px;
  padding: 0 0.7rem;
  font-size: 0.72rem;
  border-radius: 7px;
  line-height: 1;
  font-weight: 700;
}

.tx-receipt-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.5rem;
  margin-top: 0.75rem;
  padding-top: 0.65rem;
  border-top: 1px solid var(--line-soft);
}

.tx-receipt-actions .btn-primary {
  min-height: 36px;
  padding: 0.4rem 0.85rem;
  font-size: 0.82rem;
}

.op-receipt-overlay.app-modal-overlay {
  z-index: 12000 !important;
}

.op-receipt-overlay .receipt-modal-box {
  width: min(440px, calc(100vw - 1.25rem));
  max-width: min(440px, calc(100vw - 1.25rem));
  background: #ffffff;
  border-radius: 14px;
  padding: 8px 10px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32);
}

.amount {
  color: var(--success);
  font-weight: 800;
}

/* ===== Compact Income History toolbar ===== */
.income-toolbar {
  display: flex;
  align-items: flex-end;
  gap: 0.5rem;
  margin-bottom: 0.65rem;
  padding: 0.55rem 0.6rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(190, 235, 203, 0.14);
}

.income-filters {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 0.45rem;
  flex: 1;
  min-width: 0;
}

.income-toolbar .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  min-width: 0;
  margin: 0;
}

.income-toolbar .form-label {
  display: block;
  margin: 0;
  font-size: 0.65rem;
  font-weight: 700;
  line-height: 1.2;
  color: var(--text-muted);
}

.operator-dashboard-page .income-toolbar :is(.form-input, .toolbar-input, .toolbar-select) {
  width: 100%;
  height: 34px;
  min-height: 34px !important;
  max-height: 34px;
  padding: 0.25rem 0.55rem;
  border-radius: 8px;
  font-size: 0.78rem !important;
  font-weight: 600;
  line-height: 1.2;
  background-color: rgba(0, 0, 0, 0.24);
  color: var(--text-main);
  border: 1px solid rgba(190, 235, 203, 0.24);
  box-sizing: border-box;
}

.operator-dashboard-page .income-toolbar :is(.toolbar-select, select.form-input) {
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a7f3c8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.45rem center;
  padding-right: 1.5rem;
  cursor: pointer;
}

.income-manage-btn {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 34px;
  min-height: 34px;
  padding: 0 0.7rem;
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.4);
  background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
  color: #14532d;
  text-decoration: none;
  font-size: 0.75rem;
  font-weight: 750;
  white-space: nowrap;
  box-sizing: border-box;
}

.earnings-per-machinery {
  margin-bottom: 0.65rem;
  padding: 0.55rem 0.65rem;
  border: 1px solid var(--line-soft);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.12);
}

.earnings-per-machinery h3 {
  color: var(--text-main);
  font-size: 0.8rem;
  margin: 0 0 0.4rem;
}

.earnings-chips {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.4rem;
}

.earnings-chip {
  min-width: 0;
  padding: 0.4rem 0.55rem;
  display: flex;
  flex-direction: column;
  gap: 0.1rem;
  border: 1px solid var(--line-soft);
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.16);
}

.chip-name {
  color: var(--text-main);
  font-size: 0.74rem;
  font-weight: 700;
}

.chip-amount {
  color: var(--success);
  font-weight: 850;
  font-size: 0.86rem;
}

.earnings-chip small {
  color: var(--text-muted);
  font-size: 0.65rem;
}

.mobile-card-list {
  display: none;
}

.notes-text {
  margin: 0;
  color: var(--text-muted);
  font-size: 0.88rem;
  line-height: 1.45;
}

/* Deep selectors for BookingMiniList child render */
:deep(.booking-mini-list) {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

:deep(.booking-mini-item) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 0.55rem;
  width: 100%;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(167, 211, 178, 0.22);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

:deep(.booking-mini-main) {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

:deep(.booking-mini-title) {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

:deep(.booking-mini-id) {
  flex-shrink: 0;
  padding: 0.2rem 0.42rem;
  border-radius: 7px;
  background: rgba(96, 165, 250, 0.16);
  border: 1px solid rgba(96, 165, 250, 0.24);
  color: #bfdbfe;
  font-size: 0.7rem;
  font-weight: 850;
}

:deep(.booking-mini-machine) {
  overflow: hidden;
  color: var(--text-main);
  font-size: 0.9rem;
  font-weight: 800;
  text-overflow: ellipsis;
  white-space: nowrap;
}

:deep(.booking-mini-farmer) {
  display: flex;
  align-items: baseline;
  gap: 0.4rem;
  color: var(--text-muted);
  font-size: 0.78rem;
}

:deep(.booking-mini-label) {
  color: var(--text-soft);
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

:deep(.booking-mini-meta) {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.42rem;
}

:deep(.booking-mini-date) {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.12rem;
  color: var(--text-muted);
  font-size: 0.76rem;
  white-space: nowrap;
}

:deep(.booking-mini-meta .status-badge) {
  display: inline-flex;
  width: fit-content;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 800;
}

/* ===== Modal theme extras (positioning from .app-modal-overlay) ===== */
.modal-overlay.machinery-ui .modal-content:not(.tx-detail-modal) {
  background: rgba(28, 42, 33, 0.96);
  color: #eefde6;
  border: 1px solid rgba(190, 235, 203, 0.14);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  background: rgba(28, 42, 33, 0.98);
}

.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #eefde6;
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid rgba(190, 235, 203, 0.15);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(229, 235, 231, 0.65);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.modal-body {
  padding: 1.1rem 1.25rem 1.25rem;
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.detail-section {
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(190, 235, 203, 0.12);
}

.detail-section:last-child {
  margin-bottom: 0;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.detail-item label {
  font-size: 0.68rem;
  font-weight: 800;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(229, 235, 231, 0.65);
}

.detail-item span,
.detail-item strong {
  color: #eefde6;
  font-size: 0.9rem;
  word-break: break-word;
}

/* ===== Light theme — colors only ===== */
.operator-dashboard-page.light-theme {
  --surface-1: #ffffff;
  --surface-2: #f8fdf9;
  --surface-3: #ffffff;
  --line-soft: #bbf7d0;
  --line-strong: #86efac;
  --text-main: #052e16;
  --text-muted: #166534;
  --text-soft: #15803d;
  --success: #15803d;
  --warning: #ca8a04;
  --info: #0284c7;
  --panel-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
}

.operator-dashboard-page.light-theme::before,
.operator-dashboard-page.light-theme::after {
  background: none !important;
}

.operator-dashboard-page.light-theme .page-header-split {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.operator-dashboard-page.light-theme .page-title {
  color: #052e16 !important;
}

.operator-dashboard-page.light-theme .page-subtitle {
  color: #166534 !important;
}

.operator-dashboard-page.light-theme .stat-card,
.operator-dashboard-page.light-theme .card,
.operator-dashboard-page.light-theme .section-card {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.operator-dashboard-page.light-theme .stat-card::after {
  display: none;
}

.operator-dashboard-page.light-theme .tools-card,
.operator-dashboard-page.light-theme .earnings-per-machinery,
.operator-dashboard-page.light-theme .machinery-item,
.operator-dashboard-page.light-theme .booking-mini-item,
.operator-dashboard-page.light-theme .earnings-chip,
.operator-dashboard-page.light-theme .tx-item,
.operator-dashboard-page.light-theme .income-toolbar,
.operator-dashboard-page.light-theme .empty-state,
.operator-dashboard-page.light-theme .loading-state,
.operator-dashboard-page.light-theme .access-denied-card {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
  color: #14532d !important;
}

.operator-dashboard-page.light-theme .income-toolbar :is(.form-input, .toolbar-input, .toolbar-select) {
  background: #ffffff !important;
  border: 1.5px solid #94a3b8 !important;
  color: #000000 !important;
}

.operator-dashboard-page.light-theme .income-toolbar :is(.form-input option, .toolbar-select option) {
  background: #ffffff !important;
  color: #052e16 !important;
}

.operator-dashboard-page.light-theme .tx-machine,
.operator-dashboard-page.light-theme :is(.stat-value, .section-title, .chip-name) {
  color: #052e16 !important;
}

.operator-dashboard-page.light-theme :is(.stat-label, .form-label, .booking-mini-label) {
  color: #166534 !important;
}

.operator-dashboard-page.light-theme .tx-meta-chip {
  background: #ecfdf5 !important;
  border-color: #bbf7d0 !important;
  color: #166534 !important;
}

.operator-dashboard-page.light-theme .amount,
.operator-dashboard-page.light-theme .chip-amount,
.operator-dashboard-page.light-theme .section-count {
  color: #15803d !important;
}

.operator-dashboard-page.light-theme .section-count {
  background: #dcfce7 !important;
  border-color: #86efac !important;
}

/* Beat global light-mode white text on pale green — solid green CTA */
.operator-dashboard-page.light-theme .btn-header-add,
.operator-dashboard-page.light-theme .income-manage-btn {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  border-color: #14532d !important;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.22) !important;
}

.operator-dashboard-page.light-theme .btn-header-add:hover,
.operator-dashboard-page.light-theme .income-manage-btn:hover {
  filter: brightness(1.05);
}

.operator-dashboard-page.light-theme .badge,
.operator-dashboard-page.light-theme .badge-info,
.operator-dashboard-page.light-theme .booking-mini-id,
.operator-dashboard-page.light-theme :deep(.booking-mini-id) {
  background: #dbeafe !important;
  border-color: #93c5fd !important;
  color: #1d4ed8 !important;
}

.operator-dashboard-page.light-theme :is(.status-available, .status-completed, .status-credited) {
  background: #dcfce7 !important;
  color: #166534 !important;
  border-color: #86efac !important;
}

.operator-dashboard-page.light-theme :is(.status-approved, .status-booking-confirmed, .status-assigned-to-operator, .status-in-use) {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
  border-color: #93c5fd !important;
}

.operator-dashboard-page.light-theme :is(.status-incomplete, .status-maintenance) {
  background: #fef3c7 !important;
  color: #92400e !important;
  border-color: #fcd34d !important;
}

.operator-dashboard-page.light-theme :is(.status-not-available, .status-unavailable) {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #fca5a5 !important;
}

.operator-dashboard-page.light-theme :deep(.booking-mini-item) {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
}

.operator-dashboard-page.light-theme :deep(.booking-mini-machine) {
  color: #052e16 !important;
}

.modal-overlay.machinery-ui.light-theme {
  background: rgba(15, 23, 42, 0.45) !important;
}

.modal-overlay.machinery-ui.light-theme .modal-content {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 24px 48px rgba(22, 101, 52, 0.18) !important;
}

.modal-overlay.machinery-ui.light-theme .modal-header {
  background: #ffffff !important;
  border-bottom-color: #bbf7d0 !important;
}

.modal-overlay.machinery-ui.light-theme .modal-header h2 {
  color: #052e16 !important;
}

.modal-overlay.machinery-ui.light-theme .modal-close {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
  color: #166534 !important;
}

.modal-overlay.machinery-ui.light-theme .detail-section {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
}

.modal-overlay.machinery-ui.light-theme .detail-item label {
  color: #166534 !important;
}

.modal-overlay.machinery-ui.light-theme .detail-item span,
.modal-overlay.machinery-ui.light-theme .detail-item strong,
.modal-overlay.machinery-ui.light-theme .notes-text {
  color: #052e16 !important;
}

.modal-overlay.machinery-ui.light-theme .amount {
  color: #15803d !important;
}

/* ===== Tablet ===== */
@media (max-width: 1024px) {
  .operator-dashboard-page .stats-grid.op-stats-grid,
  .operator-dashboard-page .op-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
  }

  .dashboard-grid {
    grid-template-columns: 1fr;
  }

  .income-toolbar {
    flex-wrap: wrap;
    align-items: stretch;
  }

  .income-filters {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    width: 100%;
    flex: 1 1 100%;
  }

  .income-manage-btn {
    width: 100%;
  }
}

/* ===== Mobile page layout (match Machinery Management) ===== */
@media (max-width: 768px) {
  .page-container.operator-dashboard-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    padding: 0.75rem;
    border-radius: 0;
  }

  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      'title action'
      'subtitle action';
    align-items: center;
    column-gap: 0.65rem;
    row-gap: 0.15rem;
    margin-bottom: 0.65rem;
    padding: 0.65rem 0.75rem;
  }

  .page-header-split::after {
    display: none;
  }

  .page-header-text {
    display: contents;
    min-width: 0;
  }

  .page-title {
    grid-area: title;
    font-size: 1.15rem !important;
    margin: 0;
    line-height: 1.25;
  }

  .page-subtitle {
    grid-area: subtitle;
    font-size: 0.72rem;
    line-height: 1.3;
    margin: 0;
  }

  .btn-header-add {
    grid-area: action;
    align-self: center;
    min-height: 32px;
    padding: 0.3rem 0.55rem;
    font-size: 0.72rem;
    border-radius: 8px;
  }

  .operator-dashboard-page .stats-grid.op-stats-grid,
  .operator-dashboard-page .op-stats-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.45rem !important;
    margin-bottom: 0.65rem !important;
  }

  .operator-dashboard-page .op-stats-grid .stat-card {
    min-height: 64px;
    padding: 0.55rem 0.6rem;
    border-radius: 10px;
  }

  .operator-dashboard-page .op-stats-grid .stat-label {
    font-size: 0.58rem;
    margin-bottom: 0.15rem;
  }

  .operator-dashboard-page .op-stats-grid .stat-value {
    font-size: 1.05rem;
  }

  .dashboard-grid {
    gap: 0.55rem;
    margin-bottom: 0.55rem;
  }

  .card,
  .section-card,
  .income-section {
    padding: 0.65rem 0.65rem 0.7rem;
    border-radius: 10px;
  }

  .section-title {
    font-size: 0.92rem;
  }

  .section-header-row {
    margin-bottom: 0.45rem;
    padding-bottom: 0.4rem;
  }

  .section-count {
    min-width: 1.35rem;
    height: 1.35rem;
    font-size: 0.68rem;
  }

  .income-toolbar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    padding: 0.5rem;
    margin-bottom: 0.55rem;
  }

  .income-filters {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem;
  }

  .operator-dashboard-page .income-toolbar :is(.form-input, .toolbar-input, .toolbar-select),
  .income-manage-btn {
    height: 32px;
    min-height: 32px !important;
    max-height: 32px;
    font-size: 0.74rem !important;
  }

  .income-manage-btn {
    width: 100%;
  }

  .tx-item {
    padding: 0.45rem 0.5rem;
  }

  .tx-item-body {
    gap: 0.28rem;
  }

  .tx-machine {
    font-size: 0.82rem;
    max-width: min(100%, 9.5rem);
  }

  .tx-amount {
    font-size: 0.82rem;
  }

  .tx-meta-chip {
    max-width: 8.5rem;
    font-size: 0.6rem;
  }

  .tx-view-btn {
    min-height: 26px;
    height: 26px;
    padding: 0 0.55rem;
    font-size: 0.68rem;
  }

  /* Keep Assigned Machinery as name | status on one row */
  .machinery-item {
    grid-template-columns: minmax(0, 1fr) auto !important;
    align-items: center !important;
    gap: 0.45rem;
    padding: 0.5rem 0.55rem;
  }

  .machinery-name {
    max-width: 100%;
  }

  .booking-mini-item,
  :deep(.booking-mini-item) {
    grid-template-columns: 1fr;
    align-items: flex-start;
    gap: 0.4rem;
    padding: 0.5rem 0.55rem;
  }

  .booking-mini-meta,
  :deep(.booking-mini-meta) {
    width: 100%;
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }

  .booking-mini-date,
  :deep(.booking-mini-date) {
    align-items: flex-start;
  }

  .earnings-chips {
    grid-template-columns: 1fr 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .modal-header,
  .modal-body {
    padding: 0.75rem 0.8rem;
  }

  .modal-header h2 {
    font-size: 1rem;
  }
}

@media (max-width: 480px) {
  .page-container.operator-dashboard-page {
    margin: 0 -0.5rem;
    width: calc(100% + 1rem);
    padding: 0.5rem;
  }

  .operator-dashboard-page .op-stats-grid .stat-value {
    font-size: 0.98rem;
  }

  .earnings-chips {
    grid-template-columns: 1fr;
  }

  .btn-header-add {
    padding: 0.28rem 0.45rem;
    font-size: 0.68rem;
  }
}

@media (max-width: 360px) {
  .operator-dashboard-page .op-stats-grid {
    gap: 0.35rem !important;
  }

  .operator-dashboard-page .op-stats-grid .stat-card {
    padding: 0.45rem 0.5rem;
    min-height: 58px;
  }

  .operator-dashboard-page .op-stats-grid .stat-value {
    font-size: 0.92rem;
  }

  .income-filters {
    grid-template-columns: 1fr;
  }
}
</style>
