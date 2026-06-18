<template>
  <div class="page-container glass-module-page machinery-page machinery-approval-page">
    <div v-if="!canApproveBookings && !canCompleteBookings" class="access-denied-card">
      <h2 class="access-denied-title">Access Denied</h2>
      <p>This page is only available for:</p>
      <ul>
        <li>Business Managers</li>
        <li>Operation Managers</li>
        <li>Operators</li>
      </ul>
      <p><strong>Your Role:</strong> {{ authStore.currentUser?.role || 'Not logged in' }}</p>
      <p><strong>Your User ID:</strong> {{ authStore.currentUser?.id || 'N/A' }}</p>
    </div>

    <div v-else class="machinery-authorised-shell">
      <div class="page-header glass-header">
        <div class="header-title-row">
          <h1 class="page-title">
            {{ canApproveBookings ? 'Machinery Booking Approvals' : 'Machinery Booking Operations' }}
          </h1>
        </div>
        <p v-if="canApproveBookings" class="page-subtitle">
          Review and manage machinery booking requests with clear status tabs and filters.
        </p>
        <p v-else-if="canCompleteBookings" class="page-subtitle">
          Track approved bookings and mark completion or incomplete usage, same workflow style as Loans.
        </p>
      </div>

      <div class="stats-grid machinery-stats-grid">
        <div v-if="canApproveBookings" class="stat-card pending" @click="quickFilter('Pending')">
          <div class="stat-icon-wrap"><span class="stat-icon stat-abbr">Pn</span></div>
          <div class="stat-content">
            <div class="stat-value">{{ pendingCount }}</div>
            <div class="stat-label">Pending</div>
          </div>
        </div>
        <div v-if="canApproveBookings" class="stat-card approved" @click="quickFilter('Down Payment Verified')">
          <div class="stat-icon-wrap"><span class="stat-icon stat-abbr">Cf</span></div>
          <div class="stat-content">
            <div class="stat-value">{{ confirmCount }}</div>
            <div class="stat-label">To Confirm</div>
          </div>
        </div>
        <div v-if="canCompleteBookings" class="stat-card approved" @click="quickFilter('Assigned to Operator')">
          <div class="stat-icon-wrap"><span class="stat-icon stat-abbr">Ap</span></div>
          <div class="stat-content">
            <div class="stat-value">{{ approvedCount }}</div>
            <div class="stat-label">To Process</div>
          </div>
        </div>
        <div v-if="canCompleteBookings" class="stat-card incomplete" @click="quickFilter('Incomplete')">
          <div class="stat-icon-wrap"><span class="stat-icon stat-abbr">Ic</span></div>
          <div class="stat-content">
            <div class="stat-value">{{ incompleteCount }}</div>
            <div class="stat-label">Incomplete</div>
          </div>
        </div>
        <div class="stat-card rejected" @click="quickFilter('Rejected')">
          <div class="stat-icon-wrap"><span class="stat-icon stat-abbr">Rj</span></div>
          <div class="stat-content">
            <div class="stat-value">{{ rejectedCount }}</div>
            <div class="stat-label">Rejected</div>
          </div>
        </div>
        <div class="stat-card expired" @click="quickFilter('Expired')">
          <div class="stat-icon-wrap"><span class="stat-icon stat-abbr">Ex</span></div>
          <div class="stat-content">
            <div class="stat-value">{{ expiredCount }}</div>
            <div class="stat-label">Expired</div>
          </div>
        </div>
      </div>

      <div class="machinery-single-column">
        <div class="card machinery-bookings-card">
          <h2 class="card-title">Machinery bookings</h2>
          <p class="loan-guidance-text">
            Tip: Piliin ang status tab tulad sa Loan page. Puwede ding i-filter ayon sa petsa gamit ang start at end date.
          </p>

          <div class="tabs machinery-tabs">
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Pending' }"
              @click="quickFilter('Pending')"
            >
              Pending ({{ pendingCount }})
            </button>
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Down Payment Verified' }"
              @click="quickFilter('Down Payment Verified')"
            >
              To Confirm ({{ confirmCount }})
            </button>
            <button
              v-if="canCompleteBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Assigned to Operator' }"
              @click="quickFilter('Assigned to Operator')"
            >
              Assigned ({{ assignedCount }})
            </button>
            <button
              v-if="canCompleteBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Incomplete' }"
              @click="quickFilter('Incomplete')"
            >
              Incomplete ({{ incompleteCount }})
            </button>
            <button
              v-if="canCompleteBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Completed' }"
              @click="quickFilter('Completed')"
            >
              Completed ({{ completedCount }})
            </button>
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Rejected' }"
              @click="quickFilter('Rejected')"
            >
              Rejected ({{ rejectedCount }})
            </button>
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Expired' }"
              @click="quickFilter('Expired')"
            >
              Expired ({{ expiredCount }})
            </button>
          </div>

          <div v-if="isApprover && filters.status === 'Pending'" class="alert alert-info banner-inline-alert">
            Naka-<strong>Pending</strong> view ka. Gumamit ng ibang tabs para makita ang approved, rejected, o iba pang booking.
          </div>

          <div class="filters-row machinery-filters">
            <div class="form-group">
              <label>Start date</label>
              <div class="input-shell">
                <span class="field-icon" aria-hidden="true"></span>
                <input v-model="filters.start_date" type="date" @change="applyFilters" />
              </div>
            </div>
            <div class="form-group">
              <label>End date</label>
              <div class="input-shell">
                <span class="field-icon" aria-hidden="true"></span>
                <input v-model="filters.end_date" type="date" @change="applyFilters" />
              </div>
            </div>
            <button type="button" class="mach-clear-filters-btn" @click="clearFilters">Clear filters</button>
          </div>

          <div class="table-container machinery-table-container">
            <table class="loans-table machinery-loans-table">
              <colgroup v-if="canApproveBookings">
                <col class="col-name" />
                <col class="col-purpose" />
                <col class="col-date" />
                <col class="col-location" />
                <col class="col-term" />
                <col class="col-amount" />
                <col class="col-payment" />
                <col class="col-status" />
                <col class="col-actions" />
              </colgroup>
              <colgroup v-else>
                <col class="col-name" />
                <col class="col-purpose" />
                <col class="col-date" />
                <col class="col-location" />
                <col class="col-term" />
                <col class="col-amount" />
                <col class="col-status" />
                <col class="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th class="th-name">Farmer</th>
                  <th class="th-purpose">Machinery</th>
                  <th class="th-booking-date">Booking Date</th>
                  <th class="th-location">Location</th>
                  <th class="th-term">Area / Qty</th>
                  <th class="th-amount">Total</th>
                  <th v-if="canApproveBookings" class="th-payment">Payment</th>
                  <th class="th-status">Status</th>
                  <th class="th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td :colspan="tableColspan" class="loading-cell">Loading bookings...</td>
                </tr>
                <tr v-else-if="bookings.length === 0">
                  <td :colspan="tableColspan" class="empty-cell">No bookings found.</td>
                </tr>
                <tr v-else v-for="booking in bookings" :key="booking.id">
                  <td class="td-name">
                    <div class="machinery-td-stack">
                      <strong>{{ booking.farmer_name }}</strong>
                      <small class="mach-sub">{{ booking.reference_number }}</small>
                      <small v-if="booking.farmer_phone" class="mach-sub">Phone: {{ booking.farmer_phone }}</small>
                    </div>
                  </td>
                  <td class="td-purpose">
                    <div class="machinery-td-stack ma-type-cell">
                      <span class="mach-machinery-name">{{ booking.machinery_name }}</span>
                      <span class="badge" :class="'badge-' + getMachineryTypeClass(booking.machinery_type)">
                        {{ booking.machinery_type }}
                      </span>
                    </div>
                  </td>
                  <td class="td-booking-date td-date">{{ formatDate(booking.booking_date) }}</td>
                  <td class="td-location">{{ booking.service_location }}</td>
                  <td class="td-term">{{ booking.area_size }} {{ booking.area_unit }}</td>
                  <td class="td-amount amount">₱{{ formatNumber(booking.total_price) }}</td>
                  <td v-if="canApproveBookings" class="td-payment">
                    <div class="machinery-td-stack">
                      <span :class="['mach-loan-pay', 'payment-' + paymentStatusSlug(booking.payment_status)]">
                        {{ booking.payment_status || 'Unpaid' }}
                      </span>
                      <div v-if="booking.total_paid > 0" class="mach-pay-meta">
                        <small>Paid: ₱{{ formatNumber(booking.total_paid) }}</small>
                        <small v-if="booking.remaining_balance > 0">Balance: ₱{{ formatNumber(booking.remaining_balance) }}</small>
                      </div>
                    </div>
                  </td>
                  <td class="td-status">
                    <span :class="['mach-loan-status', bookingStatusSlug(booking.status)]">{{ booking.status }}</span>
                  </td>
                  <td class="td-actions">
                    <div class="action-buttons">
                      <button type="button" class="btn btn-view" title="View" @click="viewBooking(booking)">View</button>
                      <button
                        v-if="booking.status === 'Pending' && canApproveBookings"
                        type="button"
                        class="btn btn-approve"
                        title="Approve"
                        @click="approveBookingConfirm(booking)"
                      >
                        Approve
                      </button>
                      <button
                        v-if="booking.status === 'Pending' && canApproveBookings"
                        type="button"
                        class="btn btn-reject"
                        title="Reject"
                        @click="rejectBookingConfirm(booking)"
                      >
                        Reject
                      </button>
                      <button
                        v-if="booking.status === 'Down Payment Verified' && canApproveBookings"
                        type="button"
                        class="btn btn-approve"
                        title="Confirm booking"
                        @click="confirmBookingConfirm(booking)"
                      >
                        Confirm
                      </button>
                      <button
                        v-if="operatorWorkStatuses.includes(booking.status) && canCompleteBookings"
                        type="button"
                        class="btn btn-approve"
                        title="Mark completed"
                        @click="completeBookingConfirm(booking)"
                      >
                        Done
                      </button>
                      <button
                        v-if="operatorWorkStatuses.includes(booking.status) && canCompleteBookings"
                        type="button"
                        class="btn btn-reject"
                        title="Mark incomplete"
                        @click="incompleteBookingConfirm(booking)"
                      >
                        Issue
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

    <!-- View Booking Details Modal -->
    <div v-if="showViewModal && selectedBooking" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Booking Details #{{ selectedBooking.id }}</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="booking-details">
            <div class="detail-section">
              <h3>Farmer Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Name:</label>
                  <span>{{ selectedBooking.farmer_name }}</span>
                </div>
                <div class="detail-item">
                  <label>Reference Number:</label>
                  <span>{{ selectedBooking.reference_number }}</span>
                </div>
                <div class="detail-item" v-if="selectedBooking.farmer_phone">
                  <label>Phone:</label>
                  <span>Phone: {{ selectedBooking.farmer_phone }}</span>
                </div>
                <div class="detail-item full-width" v-if="selectedBooking.farmer_address">
                  <label>Address:</label>
                  <span>{{ selectedBooking.farmer_address }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h3>Machinery & Service Details</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Machinery:</label>
                  <span>{{ selectedBooking.machinery_name }}</span>
                </div>
                <div class="detail-item">
                  <label>Type:</label>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(selectedBooking.machinery_type)">
                    {{ selectedBooking.machinery_type }}
                  </span>
                </div>
                <div class="detail-item">
                  <label>Service Date:</label>
                  <span>{{ formatDate(selectedBooking.booking_date) }}</span>
                </div>
                <div class="detail-item">
                  <label>Service Location:</label>
                  <span>{{ selectedBooking.service_location }}</span>
                </div>
                <div class="detail-item">
                  <label>Area/Quantity:</label>
                  <span>{{ selectedBooking.area_size }} {{ selectedBooking.area_unit }}</span>
                </div>
                <div class="detail-item">
                  <label>Price Rate:</label>
                  <span>₱{{ formatNumber(selectedBooking.price_per_unit) }} {{ selectedBooking.unit_type }}</span>
                </div>
                <div class="detail-item">
                  <label>Total Price:</label>
                  <strong class="price-highlight">₱{{ formatNumber(selectedBooking.total_price) }}</strong>
                </div>
                <div class="detail-item">
                  <label>Status:</label>
                  <span class="status-badge" :class="'status-' + getBookingStatusClass(selectedBooking.status)">
                    {{ selectedBooking.status }}
                  </span>
                </div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedBooking.approved_by_name">
              <h3>Approval Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Approved By:</label>
                  <span>{{ selectedBooking.approved_by_name }}</span>
                </div>
                <div class="detail-item" v-if="selectedBooking.approved_date">
                  <label>Approved Date:</label>
                  <span>{{ formatDateTime(selectedBooking.approved_date) }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedBooking.rejection_reason">
              <h3>Rejection Information</h3>
              <div class="rejection-box">
                <strong>Reason:</strong>
                <p>{{ selectedBooking.rejection_reason }}</p>
              </div>
            </div>

            <div class="detail-section" v-if="selectedBooking.notes">
              <h3>Farmer's Notes</h3>
              <p class="notes-text">{{ selectedBooking.notes }}</p>
            </div>
          </div>

          <!-- Action Buttons in Modal -->
          <div class="modal-actions" v-if="selectedBooking.status === 'Pending' && canApproveBookings">
            <button @click="closeModals" class="btn-secondary">Close</button>
            <button @click="rejectBookingConfirm(selectedBooking)" class="btn-danger">
              Reject Booking
            </button>
            <button @click="approveBookingConfirm(selectedBooking)" class="btn-success">
              Approve Booking
            </button>
          </div>
          <div class="modal-actions" v-else-if="selectedBooking.status === 'Down Payment Verified' && canApproveBookings">
            <button @click="closeModals" class="btn-secondary">Close</button>
            <button @click="confirmBookingConfirm(selectedBooking)" class="btn-success">
              Confirm Booking & Reserve Dates
            </button>
          </div>
          <div class="modal-actions" v-else-if="selectedBooking.status === 'Pending'">
            <button @click="closeModals" class="btn-secondary">Close</button>
            <p class="modal-permission-note">Only Business Managers and Operation Managers can approve bookings.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Approve Confirmation Modal -->
    <div v-if="showApproveModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Approve Booking</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="booking-summary">
            <p><strong>Farmer:</strong> {{ bookingToProcess?.farmer_name }}</p>
            <p><strong>Machinery:</strong> {{ bookingToProcess?.machinery_name }}</p>
            <p><strong>Date:</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
            <p><strong>Total Amount:</strong> ₱{{ formatNumber(bookingToProcess?.total_price) }}</p>
          <p><strong>Down Payment (20%):</strong> ₱{{ formatNumber(bookingToProcess?.total_price * 0.2) }}</p>
          <p class="modal-hint">Dates will NOT be reserved until the farmer pays the down payment and the treasurer verifies it.</p>
          </div>

          <div class="modal-actions">
            <button @click="closeModals" class="btn-secondary">Cancel</button>
            <button @click="approveBooking" class="btn-success" :disabled="loading">
              {{ loading ? 'Approving...' : 'Approve Booking' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Booking Modal -->
    <div v-if="showConfirmModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Confirm Booking</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>Down payment has been verified. Confirming will reserve the machinery dates and assign the operator.</p>
          <div class="booking-summary">
            <p><strong>Farmer:</strong> {{ bookingToProcess?.farmer_name }}</p>
            <p><strong>Machinery:</strong> {{ bookingToProcess?.machinery_name }}</p>
            <p><strong>Date:</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
            <p><strong>Down Payment:</strong> ₱{{ formatNumber(bookingToProcess?.down_payment_amount) }}</p>
          </div>
          <div class="modal-actions">
            <button @click="closeModals" class="btn-secondary">Cancel</button>
            <button @click="confirmBookingFinal" class="btn-success" :disabled="loading">
              {{ loading ? 'Confirming...' : 'Confirm Booking' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Reject Modal -->
    <div v-if="showRejectModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>Reject Booking</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>Provide a reason for rejecting this booking:</p>
          <div class="booking-summary">
            <p><strong>Farmer:</strong> {{ bookingToProcess?.farmer_name }}</p>
            <p><strong>Machinery:</strong> {{ bookingToProcess?.machinery_name }}</p>
            <p><strong>Date:</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
          </div>
          <div class="form-group">
            <label class="form-label">Rejection Reason *</label>
            <textarea
              v-model="rejectionReason"
              class="form-input"
              rows="4"
              placeholder="Enter reason for rejection..."
              required
            ></textarea>
          </div>
          <div class="modal-actions">
            <button @click="closeModals" class="btn-secondary">Cancel</button>
            <button @click="rejectBooking" class="btn-danger" :disabled="loading || !rejectionReason">
              {{ loading ? 'Rejecting...' : 'Reject Booking' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Complete Confirmation Modal -->
    <div v-if="showCompleteModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content modal-medium">
        <div class="modal-header">
          <h2>Mark Booking Completed</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-subtitle">Mark this booking as completed?</p>
          <div class="booking-summary">
            <p><strong>Farmer:</strong> {{ bookingToProcess?.farmer_name }}</p>
            <p><strong>Machinery:</strong> {{ bookingToProcess?.machinery_name }}</p>
            <p><strong>Date:</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
          </div>
          
          <div class="complete-modal-actions">
            <button @click="closeModals" class="btn-secondary btn-block">Cancel</button>
            <button @click="completeBooking" class="btn-success btn-block" :disabled="loading">
              {{ loading ? 'Processing...' : 'Mark as Completed' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Incomplete Booking Modal -->
    <div v-if="showIncompleteModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>Mark Booking Incomplete</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>Please describe the issues encountered:</p>
          <div class="booking-summary">
            <p><strong>Farmer:</strong> {{ bookingToProcess?.farmer_name }}</p>
            <p><strong>Machinery:</strong> {{ bookingToProcess?.machinery_name }}</p>
            <p><strong>Date:</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
          </div>
          <div class="form-group">
            <label class="form-label">Notes on Issues *</label>
            <textarea
              v-model="completionNotes"
              class="form-input"
              rows="4"
              placeholder="Describe the issues or reasons for marking as incomplete..."
              required
            ></textarea>
          </div>
          <div class="modal-actions">
            <button @click="showIncompleteModal = false" class="btn-secondary">Cancel</button>
            <button @click="markIncompleteBooking" class="btn-warning" :disabled="loading || !completionNotes">
              {{ loading ? 'Processing...' : 'Mark as Incomplete' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="alert alert-error alert-floating">
      {{ error }}
      <button type="button" @click="clearError" class="alert-close" aria-label="Dismiss">×</button>
    </div>
    <div v-if="successMessage" class="alert alert-success alert-floating">
      {{ successMessage }}
      <button type="button" @click="successMessage = ''" class="alert-close" aria-label="Dismiss">×</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted } from 'vue'
import { useMachineryStore } from '../stores/machineryStore'
import { useAuthStore } from '../stores/authStore'

export default {
  name: 'MachineryApprovalPage',
  setup() {
    const machineryStore = useMachineryStore()
    const authStore = useAuthStore()

    // State
    const showViewModal = ref(false)
    const showApproveModal = ref(false)
    const showConfirmModal = ref(false)
    const showRejectModal = ref(false)
    const showCompleteModal = ref(false)
    const showIncompleteModal = ref(false)
    const bookingToProcess = ref(null)
    const rejectionReason = ref('')
    const completionNotes = ref('')
    const successMessage = ref('')
    const filters = ref({
      status: '',
      payment_status: '',
      start_date: '',
      end_date: ''
    })

    const approvalForm = ref({
      approved_by: null
    })

    const activeFilter = ref('')
    const allBookings = ref([]) // Store all bookings for counts
    const isApprover = computed(() => {
      const role = authStore.currentUser?.role
      return ['business_manager', 'operation_manager'].includes(role)
    })

    const todayDate = computed(() => new Date().toISOString().split('T')[0])

    // Computed
    const bookings = computed(() => machineryStore.bookings)
    const loading = computed(() => machineryStore.loading)
    const error = computed(() => machineryStore.error)
    const selectedBooking = computed(() => machineryStore.selectedBooking)

    // Use allBookings for counts to show total counts regardless of filters
    const pendingCount = computed(() => {
      return allBookings.value.filter(b => b.status === 'Pending').length
    })

    const approvedCount = computed(() => {
      return allBookings.value.filter(b => b.status === 'Approved').length
    })

    const confirmCount = computed(() => {
      return allBookings.value.filter(b => b.status === 'Down Payment Verified').length
    })

    const assignedCount = computed(() => {
      return allBookings.value.filter(b =>
        ['Assigned to Operator', 'Booking Confirmed', 'In Use'].includes(b.status)
      ).length
    })

    const operatorWorkStatuses = ['Assigned to Operator', 'Booking Confirmed', 'In Use', 'Approved']

    const rejectedCount = computed(() => {
      return allBookings.value.filter(b => b.status === 'Rejected').length
    })

    const expiredCount = computed(() => {
      return allBookings.value.filter(b => b.status === 'Expired').length
    })

    const incompleteCount = computed(() => {
      return allBookings.value.filter(b => b.status === 'Incomplete').length
    })



    const completedCount = computed(() => {
      return allBookings.value.filter(b => b.status === 'Completed').length
    })

    const approvedTodayCount = computed(() => {
      const today = new Date().toISOString().split('T')[0]
      return allBookings.value.filter(b => 
        b.status === 'Approved' && 
        b.approved_date && 
        b.approved_date.startsWith(today)
      ).length
    })

    const rejectedTodayCount = computed(() => {
      const today = new Date().toISOString().split('T')[0]
      return allBookings.value.filter(b => 
        b.status === 'Rejected' && 
        b.approved_date && 
        b.approved_date.startsWith(today)
      ).length
    })

    const totalBookingsCount = computed(() => allBookings.value.length)

    // Check if current user can approve bookings (Business Manager or Operation Manager only)
    const canApproveBookings = computed(() => {
      const userRole = authStore.currentUser?.role
      return ['business_manager', 'operation_manager'].includes(userRole)
    })

    // Check if current user can complete bookings (Operator only)
    const canCompleteBookings = computed(() => {
      const userRole = authStore.currentUser?.role
      return userRole === 'operator'
    })

    const tableColspan = computed(() => (canApproveBookings.value ? 9 : 8))

    const bookingStatusSlug = (status) => {
      const map = {
        Pending: 'pending',
        'Awaiting Down Payment': 'pending',
        'Awaiting Payment Verification': 'pending',
        'Payment Rejected': 'rejected',
        'Down Payment Verified': 'approved',
        'Booking Confirmed': 'approved',
        'Assigned to Operator': 'approved',
        'Awaiting Final Payment': 'pending',
        Approved: 'approved',
        Incomplete: 'incomplete',
        Completed: 'completed',
        Rejected: 'rejected',
        Expired: 'expired',
        Cancelled: 'cancelled'
      }
      return map[String(status || '').trim()] || 'unknown'
    }

    const paymentStatusSlug = (status) => {
      const key = String(status || 'Unpaid').trim()
      const map = {
        Unpaid: 'unpaid',
        Partial: 'partial',
        Paid: 'paid'
      }
      return map[key] || 'unpaid'
    }

    // Methods
    const loadData = async () => {
      try {
        // For Business Managers and Operation Managers, auto-filter to Pending if no other filters
        // For Operators, auto-filter to Approved if no other filters
        const filterToApply = { ...filters.value }
        if (isApprover.value && !filters.value.status && !filters.value.payment_status && !filters.value.start_date && !filters.value.end_date) {
          filterToApply.status = 'Pending'
          filters.value.status = 'Pending'
          activeFilter.value = 'Pending'
        } else if (canCompleteBookings.value && !filters.value.status && !filters.value.payment_status && !filters.value.start_date && !filters.value.end_date) {
          filterToApply.status = 'Assigned to Operator'
          filters.value.status = 'Assigned to Operator'
          activeFilter.value = 'Assigned to Operator'
        }
        
        // First load all bookings for counts
        await machineryStore.fetchBookings({})
        allBookings.value = [...machineryStore.bookings]
        
        // Then apply filters
        if (filterToApply.status || filterToApply.payment_status || filterToApply.start_date || filterToApply.end_date) {
          await machineryStore.fetchBookings(filterToApply)
        } else if (isApprover.value) {
          // If still no filter but is approver, ensure Pending is shown
          await machineryStore.fetchBookings({ status: 'Pending' })
        } else if (canCompleteBookings.value) {
          await machineryStore.fetchBookings({ status: 'Assigned to Operator' })
        }
      } catch (error) {
        console.error('Error loading bookings:', error)
      }
    }

    const applyFilters = () => {
      loadData()
    }

    const clearFilters = () => {
      filters.value = {
        status: '',
        payment_status: '',
        start_date: '',
        end_date: ''
      }
      activeFilter.value = ''
      // For approvers, clear filters will trigger auto-filter to Pending
      loadData()
    }

    const quickFilter = (status) => {
      activeFilter.value = status
      if (status === 'Completed') {
        // Show Completed bookings when operator clicks Completed button
        // For now, filter will show 'Completed' - backend needs to handle this
        filters.value.status = 'Completed'
      } else if (status === '') {
        filters.value.status = ''
      } else {
        filters.value.status = status
      }
      loadData()
    }

    const viewBooking = async (booking) => {
      try {
        await machineryStore.getBookingDetails(booking.id)
        showViewModal.value = true
      } catch (error) {
        console.error('Error viewing booking:', error)
      }
    }

    const approveBookingConfirm = (booking) => {
      // Check if user has permission to approve
      if (!['business_manager', 'operation_manager'].includes(authStore.currentUser?.role)) {
        alert('Only Business Managers and Operation Managers can approve bookings.')
        return
      }
      bookingToProcess.value = booking
      // Reset approval form
      approvalForm.value = {
        approved_by: authStore.currentUser?.id
      }
      showApproveModal.value = true
      showViewModal.value = false
    }

    const approveBooking = async () => {
      try {
        // Approval only - no payment involved
        // Payment is handled separately by Treasurer via Treasurer's dedicated page
        const approvalData = {
          approved_by: authStore.currentUser?.id
        }

        await machineryStore.approveBooking(bookingToProcess.value.id, approvalData)
        successMessage.value = 'Booking approved. Farmer must pay 20% down payment before dates are reserved.'
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error approving booking:', error)
      }
    }

    const confirmBookingConfirm = (booking) => {
      if (!['business_manager', 'operation_manager'].includes(authStore.currentUser?.role)) {
        alert('Only managers can confirm bookings.')
        return
      }
      bookingToProcess.value = booking
      showConfirmModal.value = true
      showViewModal.value = false
    }

    const confirmBookingFinal = async () => {
      try {
        await machineryStore.confirmBooking(bookingToProcess.value.id, authStore.currentUser?.id)
        successMessage.value = 'Booking confirmed. Machinery dates are now reserved and assigned to operator.'
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error confirming booking:', error)
        alert(error.message || 'Failed to confirm booking')
      }
    }

    const rejectBookingConfirm = (booking) => {
      // Check if user has permission to reject
      if (!['business_manager', 'operation_manager'].includes(authStore.currentUser?.role)) {
        alert('Only Business Managers and Operation Managers can reject bookings.')
        return
      }
      bookingToProcess.value = booking
      rejectionReason.value = ''
      showRejectModal.value = true
      showViewModal.value = false
    }

    const rejectBooking = async () => {
      if (!rejectionReason.value) {
        return
      }
      try {
        await machineryStore.rejectBooking(
          bookingToProcess.value.id, 
          authStore.currentUser?.id, 
          rejectionReason.value
        )
        successMessage.value = 'Booking rejected'
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error rejecting booking:', error)
      }
    }

    const completeBookingConfirm = (booking) => {
      // Check if user has permission to complete
      if (authStore.currentUser?.role !== 'operator') {
        alert('Only Operators can mark bookings.')
        return
      }
      bookingToProcess.value = booking
      completionNotes.value = ''
      showCompleteModal.value = true
    }

    const completeBooking = async () => {
      try {
        await machineryStore.completeBooking(bookingToProcess.value.id, 'completed')
        successMessage.value = 'Rental marked complete. Outstanding balance will appear in collectibles if unpaid.'
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error completing booking:', error)
      }
    }

    const incompleteBookingConfirm = (booking) => {
      // Check if user has permission
      if (authStore.currentUser?.role !== 'operator') {
        alert('Only Operators can mark bookings.')
        return
      }
      bookingToProcess.value = booking
      completionNotes.value = ''
      showCompleteModal.value = false
      showIncompleteModal.value = true
    }

    const markIncompleteBooking = async () => {
      if (!completionNotes.value) {
        alert('Please provide notes about the issues')
        return
      }
      try {
        await machineryStore.completeBooking(
          bookingToProcess.value.id, 
          'incomplete', 
          completionNotes.value
        )
        successMessage.value = 'Booking marked as incomplete. Down payment refund will be processed.'
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error marking booking incomplete:', error)
      }
    }

    const closeModals = () => {
      showViewModal.value = false
      showApproveModal.value = false
      showConfirmModal.value = false
      showRejectModal.value = false
      showCompleteModal.value = false
      showIncompleteModal.value = false
      bookingToProcess.value = null
      rejectionReason.value = ''
      completionNotes.value = ''
      machineryStore.clearSelection()
    }

    const clearError = () => {
      machineryStore.clearError()
    }

    const getMachineryTypeClass = (type) => {
      const classes = {
        'Harvester': 'primary',
        'Dryer': 'warning',
        'Hauling Track': 'info',
        'Tractor': 'success'
      }
      return classes[type] || 'default'
    }

    const getBookingStatusClass = (status) => {
      const classes = {
        'Pending': 'warning',
        'Approved': 'success',
        'Expired': 'danger',
        'Completed': 'success',
        'Incomplete': 'warning',
        'Rejected': 'danger',
        'Cancelled': 'default'
      }
      return classes[status] || 'default'
    }

    const getPaymentStatusClass = (status) => {
      const classes = {
        'Unpaid': 'danger',
        'Partial': 'warning',
        'Paid': 'success'
      }
      return classes[status] || 'default'
    }

    const formatNumber = (num) => {
      return new Intl.NumberFormat('en-PH').format(num)
    }

    const formatDate = (date) => {
      if (!date) return '-'
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const formatDateTime = (datetime) => {
      if (!datetime) return '-'
      return new Date(datetime).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Lifecycle
    onMounted(() => {
      loadData()
    })

    return {
      // Stores
      authStore,
      // State
      showViewModal,
      showApproveModal,
      showConfirmModal,
      showRejectModal,
      showCompleteModal,
      showIncompleteModal,
      bookingToProcess,
      rejectionReason,
      completionNotes,
      successMessage,
      filters,
      approvalForm,
      todayDate,
      allBookings,
      // Computed
      bookings,
      loading,
      error,
      selectedBooking,
      pendingCount,
      approvedCount,
      confirmCount,
      assignedCount,
      operatorWorkStatuses,
      rejectedCount,
      expiredCount,
      incompleteCount,
      completedCount,
      approvedTodayCount,
      rejectedTodayCount,
      totalBookingsCount,
      canApproveBookings,
      canCompleteBookings,
      isApprover,
      tableColspan,
      bookingStatusSlug,
      paymentStatusSlug,
      // Methods
      applyFilters,
      clearFilters,
      quickFilter,
      viewBooking,
      approveBookingConfirm,
      approveBooking,
      confirmBookingConfirm,
      confirmBookingFinal,
      rejectBookingConfirm,
      rejectBooking,
      completeBookingConfirm,
      completeBooking,
      incompleteBookingConfirm,
      markIncompleteBooking,
      closeModals,
      clearError,
      getMachineryTypeClass,
      getBookingStatusClass,
      getPaymentStatusClass,
      formatNumber,
      formatDate,
      formatDateTime,
      activeFilter
    }
  }
}
</script>

<style scoped>
/* Mirrors LoanPage.vue glass shell (machinery scoped) */

.machinery-page.page-container {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
  background: linear-gradient(145deg, #0f1712 0%, #132119 28%, #1f3627 64%, #2a4735 100%);
  border-radius: 20px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.machinery-page.page-container::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 10% 90%, rgba(17, 94, 41, 0.14) 0%, transparent 60%),
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(45, 212, 191, 0.08) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.access-denied-card,
.machinery-authorised-shell {
  position: relative;
  z-index: 1;
}

.access-denied-card {
  padding: 1.5rem;
  border-radius: 18px;
  background: linear-gradient(145deg, rgba(254, 243, 199, 0.94), rgba(253, 224, 171, 0.9));
  border: 1px solid rgba(245, 158, 11, 0.45);
  color: #78350f;
  box-shadow: 0 12px 26px rgba(15, 23, 42, 0.14);
}

.access-denied-title {
  margin: 0 0 0.75rem;
  font-size: 1.35rem;
  font-weight: 800;
}

.glass-header {
  background: linear-gradient(135deg, rgba(167, 243, 198, 0.18) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow:
    0 14px 30px rgba(6, 12, 9, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 1.5rem 1.75rem;
  margin-bottom: 1.5rem;
}

.header-title-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 0.35rem;
}

.page-title {
  color: #f0fdf4;
  font-weight: 900;
  font-size: clamp(1.5rem, 2.2vw, 2rem);
  margin: 0;
}

.page-subtitle {
  color: rgba(220, 252, 231, 0.78);
  font-size: 1rem;
  margin: 0;
  line-height: 1.5;
}

.stats-grid {
  display: grid;
  gap: 1.1rem;
  margin-bottom: 1.5rem;
}

.machinery-stats-grid {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.stat-card {
  background: linear-gradient(140deg, rgba(167, 243, 198, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 18px;
  box-shadow: 0 10px 22px rgba(5, 11, 8, 0.28);
  padding: 1.1rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  cursor: pointer;
  transition:
    transform 220ms ease,
    box-shadow 220ms ease,
    border-color 220ms ease;
}

.stat-card:hover {
  transform: scale(1.03);
  border-color: rgba(167, 243, 198, 0.55);
  box-shadow:
    0 14px 28px rgba(5, 11, 8, 0.38),
    0 0 20px rgba(74, 222, 128, 0.18);
}

.stat-icon-wrap {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.18);
  border: 1px solid rgba(255, 255, 255, 0.24);
  flex-shrink: 0;
}

.stat-icon.stat-abbr {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: #ecfdf5;
}

.stat-value {
  color: #ffffff;
  font-size: 2rem;
  line-height: 1.05;
  font-weight: 900;
}

.stat-label {
  color: rgba(236, 253, 245, 0.88);
  font-weight: 700;
  font-size: 0.875rem;
}

.stat-card.incomplete .stat-icon-wrap {
  border-color: rgba(251, 191, 36, 0.55);
  background: rgba(254, 243, 199, 0.22);
}

.stat-card.expired .stat-icon-wrap {
  border-color: rgba(148, 163, 184, 0.5);
  background: rgba(241, 245, 249, 0.12);
}

.card.machinery-bookings-card {
  background: linear-gradient(145deg, rgba(16, 44, 31, 0.86), rgba(13, 37, 27, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  padding: 1.5rem 1.65rem;
  box-shadow: 0 16px 30px rgba(4, 9, 7, 0.34);
}

.card-title {
  color: #ecfdf5;
  font-weight: 800;
  font-size: 1.35rem;
  margin: 0 0 0.75rem;
}

.loan-guidance-text {
  margin: -0.1rem 0 1rem;
  color: rgba(220, 252, 231, 0.86);
  font-size: 0.92rem;
  line-height: 1.45;
}

.tabs {
  display: flex;
  gap: 0.6rem;
  flex-wrap: wrap;
  border-bottom: none;
  padding-bottom: 0.4rem;
  margin-bottom: 1.1rem;
  overflow-x: auto;
}

.tab {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #e6fff1;
  font-weight: 700;
  padding: 0.52rem 0.92rem;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 220ms ease;
  white-space: nowrap;
}

.tab:hover {
  color: #ffffff;
  border-color: rgba(110, 231, 183, 0.5);
}

.tab.active {
  color: #052e16;
  background: linear-gradient(135deg, #86efac 0%, #4ade80 100%);
  border-color: rgba(187, 247, 208, 0.9);
  box-shadow: 0 0 16px rgba(74, 222, 128, 0.4);
}

.banner-inline-alert {
  margin-bottom: 1rem;
}

.alert.alert-info {
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(219, 234, 254, 0.88);
  color: #0f3f66;
  border-left: 4px solid #38bdf8;
  font-size: 0.92rem;
  line-height: 1.5;
}

.filters-row {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.25rem;
  align-items: flex-end;
  margin-bottom: 1.25rem;
}

.filters-row.machinery-filters .form-group {
  flex: 1;
  min-width: 160px;
  margin: 0;
}

.filters-row label {
  display: block;
  font-weight: 600;
  color: rgba(236, 253, 245, 0.9);
  font-size: 0.875rem;
  margin-bottom: 0.42rem;
}

.input-shell {
  position: relative;
}

.input-shell .field-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: rgba(187, 247, 208, 0.35);
}

.input-shell input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.85rem 0.92rem 0.85rem 2.05rem;
  border-radius: 12px;
  border: 1px solid rgba(134, 239, 172, 0.28);
  background: rgba(8, 30, 22, 0.52);
  color: #ecfdf5;
  font-size: 0.94rem;
  font-family: inherit;
}

.input-shell input:focus {
  outline: none;
  border-color: rgba(110, 231, 183, 0.9);
  box-shadow:
    0 0 0 3px rgba(74, 222, 128, 0.15),
    0 0 16px rgba(74, 222, 128, 0.22);
}

.mach-clear-filters-btn {
  align-self: center;
  margin-top: 1.1rem;
  padding: 0.65rem 1.25rem;
  border-radius: 999px;
  border: 1px solid rgba(187, 247, 208, 0.45);
  background: rgba(255, 255, 255, 0.08);
  color: #ecfdf5;
  font-weight: 700;
  cursor: pointer;
  transition:
    transform 180ms ease,
    background-color 220ms ease;
}

.mach-clear-filters-btn:hover {
  background: rgba(255, 255, 255, 0.14);
  transform: translateY(-1px);
}

/* Table shell — aligns with AdminLoansPage loans-table (+ dark-card theme overrides) */

.machinery-table-container.table-container {
  overflow-x: auto;
  border-radius: 12px;
  margin-top: 0.1rem;
}

.machinery-loans-table.loans-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 0;
}

.machinery-loans-table.loans-table th,
.machinery-loans-table.loans-table td {
  padding: 0.28rem 0.26rem;
  text-align: center;
  border-bottom: 1px solid #e2e8f0;
  vertical-align: middle;
}

.machinery-loans-table.loans-table th:not(:last-child),
.machinery-loans-table.loans-table td:not(:last-child) {
  border-right: 1px solid rgba(203, 213, 225, 0.22);
}

.machinery-loans-table.loans-table th {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.18) 0%, rgba(45, 212, 191, 0.1) 100%);
  font-weight: 700;
  color: rgba(234, 241, 236, 0.94);
  font-size: 0.56rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.1;
  border-bottom-color: rgba(190, 235, 203, 0.2);
}

.machinery-loans-table.loans-table td {
  font-size: 0.62rem;
  line-height: 1.12;
  color: rgba(226, 234, 229, 0.92);
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.machinery-loans-table.loans-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.07);
}

.machinery-loans-table col.col-name {
  width: 16%;
}
.machinery-loans-table col.col-purpose {
  width: 14%;
}
.machinery-loans-table col.col-date {
  width: 9%;
}
.machinery-loans-table col.col-location {
  width: 11%;
}
.machinery-loans-table col.col-term {
  width: 9%;
}
.machinery-loans-table col.col-amount {
  width: 10%;
}
.machinery-loans-table col.col-payment {
  width: 10%;
}
.machinery-loans-table col.col-status {
  width: 8%;
}
.machinery-loans-table col.col-actions {
  width: 15%;
}

@media (max-width: 768px) {
  .machinery-loans-table.loans-table th,
  .machinery-loans-table.loans-table td {
    padding: 0.52rem 0.35rem;
    font-size: 0.68rem;
  }

  .action-buttons {
    flex-direction: column;
  }

  .action-buttons .btn {
    width: 100%;
  }
}

.machinery-td-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.22rem;
  white-space: normal;
  width: 100%;
  box-sizing: border-box;
}

.mach-sub {
  font-size: 0.64rem;
  color: rgba(199, 210, 204, 0.86);
}

.mach-machinery-name {
  font-weight: 700;
}

.ma-type-cell .badge {
  margin-top: 2px;
}

.mach-pay-meta small {
  display: block;
  font-size: 0.61rem;
  color: rgba(199, 210, 204, 0.86);
}

.td-name,
.td-purpose,
.td-location {
  word-break: break-word;
}

.td-booking-date,
.td-term,
.td-status {
  overflow: visible;
  text-overflow: clip;
}

.amount {
  font-weight: 800;
  color: #6ee7b7;
}

.badge {
  display: inline-block;
  padding: 3px 9px;
  border-radius: 999px;
  font-size: 0.61rem;
  font-weight: 700;
}

.badge-primary {
  background: rgba(59, 130, 246, 0.2);
  color: #bae6fd;
  border: 1px solid rgba(147, 197, 253, 0.38);
}

.badge-warning {
  background: rgba(251, 191, 36, 0.16);
  color: #fef3c7;
  border: 1px solid rgba(251, 191, 36, 0.35);
}

.badge-info {
  background: rgba(129, 140, 248, 0.18);
  color: #e0e7ff;
  border: 1px solid rgba(165, 180, 252, 0.35);
}

.badge-success {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.badge-default {
  background: rgba(148, 163, 184, 0.16);
  color: #e2e8f0;
  border: 1px solid rgba(148, 163, 184, 0.35);
}

.mach-loan-status,
.mach-loan-pay {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 72px;
  padding: 0.3rem 0.52rem;
  border-radius: 10px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: capitalize;
  line-height: 1;
  white-space: nowrap;
  border: 1px solid rgba(190, 235, 203, 0.35);
  background: transparent;
}

.mach-loan-status.pending {
  color: #facc15;
  border-color: rgba(245, 158, 11, 0.55);
}
.mach-loan-status.approved {
  color: #86efac;
  border-color: rgba(16, 185, 129, 0.55);
}
.mach-loan-status.rejected {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.58);
}
.mach-loan-status.incomplete {
  color: #fcd34d;
  border-color: rgba(251, 191, 36, 0.55);
}
.mach-loan-status.completed {
  color: #6ee7b7;
  border-color: rgba(5, 150, 105, 0.58);
}
.mach-loan-status.expired {
  color: #94a3b8;
  border-color: rgba(148, 163, 184, 0.45);
}
.mach-loan-status.cancelled,
.mach-loan-status.unknown {
  color: #cbd5e1;
  border-color: rgba(148, 163, 184, 0.4);
}

.mach-loan-pay.payment-unpaid {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.5);
}
.mach-loan-pay.payment-partial {
  color: #fcd34d;
  border-color: rgba(245, 158, 11, 0.55);
}
.mach-loan-pay.payment-paid {
  color: #86efac;
  border-color: rgba(16, 185, 129, 0.55);
}

.action-buttons {
  display: flex;
  gap: 0.22rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 0.32rem 0.42rem;
  border: none;
  border-radius: 6px;
  font-size: 0.64rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.15;
  white-space: normal;
}

.btn-approve {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  color: #14532d;
  border: 1px solid rgba(22, 163, 74, 0.35);
}
.btn-approve:hover {
  background: linear-gradient(135deg, #86efac 0%, #4ade80 100%);
}

.btn-reject {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #b91c1c;
  border: 1px solid rgba(220, 38, 38, 0.28);
}
.btn-reject:hover {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
}

.btn-view {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid rgba(22, 163, 74, 0.3);
}
.btn-view:hover {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 3rem 1rem;
  color: rgba(199, 210, 204, 0.88);
}

/* Modal badges (detail view) */

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 4px 12px;
  border-radius: 10px;
  font-size: 0.74rem;
  font-weight: 700;
}

.status-success {
  background: #d1fae5;
  color: #065f46;
}

.status-warning {
  background: #fef3c7;
  color: #92400e;
}

.status-info {
  background: #dbeafe;
  color: #1e40af;
}

.status-danger {
  background: #fee2e2;
  color: #991b1b;
}

.status-default {
  background: #f3f4f6;
  color: #6b7280;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.52);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 5000;
}

.modal-content {
  background: #ffffff !important;
  border-radius: 16px;
  width: 92%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.25);
  border: 1px solid #bbf7d0 !important;
}

.modal-large {
  max-width: 840px;
}

.modal-small {
  max-width: 440px;
}

.modal-medium {
  max-width: 560px;
}

.modal-header {
  padding: 1.25rem 1.35rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 800;
  color: #14532d;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.35rem;
  cursor: pointer;
  color: #64748b;
  line-height: 1;
}

.modal-body {
  padding: 1.25rem 1.35rem;
}

.booking-details {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.detail-section h3 {
  margin: 0 0 0.75rem;
  font-size: 1rem;
  color: #14532d;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-weight: 700;
  color: #166534;
  font-size: 0.82rem;
}

.detail-item span,
.detail-item p {
  color: #0f172a;
}

.price-highlight {
  color: #047857 !important;
}

.rejection-box {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
  padding: 1rem;
  border-radius: 10px;
}

.rejection-box p {
  margin: 0.5rem 0 0;
  color: #7f1d1d !important;
}

.notes-text {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 10px;
  color: #334155;
  line-height: 1.55;
}

.booking-summary {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 10px;
}

.booking-summary p {
  margin: 0.42rem 0;
  color: #0f172a;
}

.modal-body .form-group {
  margin-bottom: 1rem;
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
  justify-content: flex-end;
  margin-top: 1.25rem;
}

.modal-permission-note {
  flex: 1 1 100%;
  margin: 0.5rem 0 0;
  color: #c2410c;
  font-size: 0.9rem;
  font-weight: 600;
}

.complete-modal-actions {
  margin-top: 1rem;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.btn-secondary {
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(148, 163, 184, 0.7);
  background: #64748b;
  color: #fff;
  font-weight: 700;
  cursor: pointer;
}

.btn-secondary:hover {
  filter: brightness(1.06);
}

.btn-success {
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-success:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-danger {
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  border: none;
  background: linear-gradient(135deg, #f87171 0%, #ef4444 100%);
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-warning {
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  border: none;
  background: #f59e0b;
  color: white;
  font-weight: 700;
  cursor: pointer;
}

.btn-block {
  width: 100%;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 0.42rem;
  color: #334155;
}

.form-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  border: 1px solid #cbd5e1;
  border-radius: 10px;
  font-family: inherit;
  font-size: 0.9rem;
}

.form-input:focus {
  outline: none;
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2);
}

.modal-subtitle {
  color: #64748b;
  margin-bottom: 0.85rem;
  font-size: 0.95rem;
}

.alert-floating {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 1.15rem 1.35rem;
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 320px;
  max-width: min(460px, 92vw);
  box-shadow: 0 14px 40px rgba(0, 0, 0, 0.26);
  z-index: 6000;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border-left: 4px solid #ef4444;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border-left: 4px solid #22c55e;
}

.alert-close {
  flex-shrink: 0;
  background: none;
  border: none;
  font-size: 1.1rem;
  cursor: pointer;
  opacity: 0.7;
}

.alert-close:hover {
  opacity: 1;
}

@media (max-width: 1024px) {
  .machinery-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .machinery-page.page-container {
    padding: 1.25rem;
    border-radius: 14px;
  }

  .machinery-stats-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .glass-header {
    padding: 1.15rem 1.25rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }

  .machinery-loans-table.loans-table th,
  .machinery-loans-table.loans-table td {
    padding: 8px 6px;
    font-size: 0.66rem;
  }
}

@import '../styles/compact-data-table.css';
</style>
