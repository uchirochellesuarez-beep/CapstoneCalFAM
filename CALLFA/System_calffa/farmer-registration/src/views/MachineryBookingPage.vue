<template>
  <div class="page-container glass-module-page machinery-booking-page" :class="{ 'light-theme': isLight }">
    <!-- Page Header -->
    <div class="page-header">
      <div class="glass-header">
        <div class="header-text">
          <h1 class="page-title">Machinery Booking Service</h1>
          <p class="page-subtitle">Book farm machinery and equipment for your agricultural needs</p>
        </div>
      </div>
    </div>

    <!-- My Bookings Stats -->
    <div class="stats-group">
      <div class="stats-group-title">Booking Overview</div>
      <div class="stats-grid">
        <div class="stat-card glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">My Bookings</div>
            <div class="stat-value">{{ myBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-pending glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">Pending</div>
            <div class="stat-value">{{ pendingBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-success glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">Approved</div>
            <div class="stat-value">{{ approvedBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-info glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">Completed</div>
            <div class="stat-value">{{ completedBookingsCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Status Stats -->
    <div class="stats-group payment-group">
      <div class="stats-group-title">Payment Overview</div>
      <div class="stats-grid payment-stats">
        <div class="stat-card stat-danger glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">Unpaid</div>
            <div class="stat-value">{{ unpaidBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-warning glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">Partial</div>
            <div class="stat-value">{{ partialBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-paid glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">Fully Paid</div>
            <div class="stat-value">{{ paidBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card glass-stat-card stat-outstanding" :class="outstandingBalance > 0 ? 'stat-danger' : 'stat-paid'">
          <div class="stat-content">
            <div class="stat-label">Outstanding Balance</div>
            <div class="stat-value">₱{{ formatNumber(outstandingBalance) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Outstanding Balance Warning -->
    <div v-if="outstandingBalance > 0" class="outstanding-warning">
      <div class="warning-icon" aria-hidden="true">!</div>
      <div class="warning-content">
        <h3>Outstanding Balance Alert</h3>
        <p>You have an outstanding balance of <strong>₱{{ formatNumber(outstandingBalance) }}</strong> from previous completed bookings.</p>
        <p>Please settle your balance before booking new machinery.</p>
        <div class="unpaid-bookings-list" v-if="unpaidBookingsList.length > 0">
          <h4>Unpaid Bookings:</h4>
          <ul>
            <li v-for="booking in unpaidBookingsList" :key="booking.id">
              <span class="booking-info">{{ booking.machinery_name }} - {{ formatDate(booking.booking_date) }}</span>
              <span class="booking-balance">₱{{ formatNumber(booking.remaining_balance) }}</span>
            </li>
          </ul>
        </div>
      </div>
    </div>

    <!-- Available Machinery -->
    <div class="section">
      <h2 class="section-title">Available Machinery</h2>
      
      <!-- Machinery Type Filter -->
      <div class="filters" style="margin-bottom: 20px;">
        <select v-model="machineryTypeFilter" @change="applyMachineryFilter" class="filter-select">
          <option value="">All Machinery Types</option>
          <option v-for="type in distinctMachineryTypes" :key="type" :value="type">
            {{ type }}
          </option>
        </select>
      </div>

      <div class="machinery-grid">
        <div v-if="loading && availableMachinery.length === 0" class="loading-container">
          <div class="loading-spinner"></div>
          <p>Loading available machinery...</p>
        </div>
        <div v-else-if="availableMachinery.length === 0" class="empty-state">
          <div class="empty-icon" aria-hidden="true"></div>
          <p>No machinery available at the moment</p>
        </div>
        <div v-else v-for="machine in availableMachinery" :key="machine.id" class="machinery-card">
          <div class="machinery-header">
            <h3 class="machinery-title">{{ machine.machinery_name }}</h3>
            <span class="badge" :class="'badge-' + getMachineryTypeClass(machine.machinery_type)">
              {{ machine.machinery_type }}
            </span>
          </div>
          
          <!-- Machinery Picture -->
          <div class="machinery-picture-container">
            <img 
              v-if="machine.machinery_picture" 
              :src="getImageUrl(machine.machinery_picture)" 
              :alt="machine.machinery_name"
              class="machinery-picture"
            />
            <div v-else class="machinery-picture-placeholder">
              <div class="placeholder-icon" aria-hidden="true"></div>
              <p>No image available</p>
            </div>
          </div>
          
          <p class="machinery-description">{{ machine.description || 'No description available' }}</p>
          <div class="machinery-details">
            <div class="detail-row">
              <span class="detail-label">Price:</span>
              <span class="detail-value">₱{{ formatNumber(getEffectivePricePerUnit(machine)) }} {{ machine.unit_type }}</span>
            </div>
            <div class="detail-row" v-if="machine.max_capacity">
              <span class="detail-label">Max Capacity:</span>
              <span class="detail-value">{{ machine.max_capacity }} {{ machine.capacity_unit }}/day</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="status-badge status-success">{{ machine.status }}</span>
            </div>
          </div>
          <button 
            @click="bookMachinery(machine)" 
            class="btn-book" 
            :disabled="outstandingBalance > 0"
            :title="outstandingBalance > 0 ? 'Please settle your outstanding balance first' : 'Book this machinery'"
          >
            {{ outstandingBalance > 0 ? 'Settle Balance First' : 'Book Now' }}
          </button>
        </div>
      </div>
    </div>

    <!-- My Bookings -->
    <div class="section">
      <h2 class="section-title">My Bookings</h2>
      
      <!-- Filters -->
      <div class="filters">
        <select v-model="bookingFilter" @change="applyFilter" class="filter-select">
          <option value="">All Bookings</option>
          <option value="Pending">Pending</option>
          <option value="Approved">Approved</option>
          <option value="Expired">Expired</option>
          <option value="Completed">Completed</option>
          <option value="Rejected">Rejected</option>
        </select>
        <select v-model="paymentFilter" @change="applyFilter" class="filter-select">
          <option value="">All Payment Status</option>
          <option value="Unpaid">Unpaid</option>
          <option value="Partial">Partial</option>
          <option value="Paid">Paid</option>
        </select>
      </div>

      <div class="bookings-table-container">
        <table class="bookings-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Machinery</th>
              <th>Booking Date</th>
              <th>Location</th>
              <th>Area/Quantity</th>
              <th>Total Price</th>
              <th>Paid</th>
              <th>Balance</th>
              <th>Status</th>
              <th>Payment</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="11" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>Loading bookings...</span>
              </td>
            </tr>
            <tr v-else-if="filteredBookings.length === 0">
              <td colspan="11" class="empty-cell">
                No bookings found. Book a machinery to get started!
              </td>
            </tr>
            <tr v-else v-for="booking in filteredBookings" :key="booking.id" :data-booking-id="booking.id" :class="{ 'notification-highlight-row': highlightedBookingId == booking.id }">
              <td>{{ booking.id }}</td>
              <td>
                <div class="booking-machinery">
                  <strong>{{ booking.machinery_name }}</strong>
                  <small>{{ booking.machinery_type }}</small>
                </div>
              </td>
              <td>{{ formatDate(booking.booking_date) }}</td>
              <td>{{ booking.service_location }}</td>
              <td>{{ booking.area_size }} {{ booking.area_unit }}</td>
              <td class="price-cell">₱{{ formatNumber(booking.total_price) }}</td>
              <td class="price-cell">₱{{ formatNumber(booking.total_paid || 0) }}</td>
              <td class="price-cell" :class="{ 'balance-unpaid': (booking.total_price - (booking.total_paid || 0)) > 0 }">
                ₱{{ formatNumber(booking.total_price - (booking.total_paid || 0)) }}
              </td>
              <td>
                <span class="status-badge" :class="'status-' + getBookingStatusClass(booking.status)">
                  {{ booking.status }}
                </span>
              </td>
              <td>
                <span class="payment-badge" :class="'payment-' + getPaymentStatusClass(booking.payment_status)">
                  {{ booking.payment_status || 'Unpaid' }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button type="button" @click="viewBookingDetails(booking)" class="btn-icon-small btn-text-action" title="View">
                    View
                  </button>
                  <button 
                    v-if="booking.status === 'Pending' && booking.farmer_id === authStore.currentUser?.id" 
                    type="button"
                    @click="editBookingConfirm(booking)" 
                    class="btn-icon-small btn-edit btn-text-action" 
                    title="Edit"
                  >
                    Edit
                  </button>
                  <button 
                    v-if="booking.status === 'Pending'" 
                    type="button"
                    @click="cancelBookingConfirm(booking)" 
                    class="btn-icon-small btn-danger btn-text-action" 
                    title="Cancel"
                  >
                    Cancel
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Booking Modal -->
    <div v-if="showBookingModal" class="modal-overlay" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Book Machinery</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="submitBooking">
            <div class="form-group">
              <label class="form-label">Select Machinery *</label>
              <select v-model="bookingForm.machinery_id" @change="onMachinerySelect" class="form-input" required>
                <option value="">Choose machinery...</option>
                <option v-for="machine in availableMachinery" :key="machine.id" :value="machine.id">
                  {{ machine.machinery_name }} ({{ machine.machinery_type }}) - ₱{{ formatNumber(getEffectivePricePerUnit(machine)) }} {{ machine.unit_type }}
                </option>
              </select>
            </div>

            <div class="form-group" v-if="selectedMachineryForBooking">
              <div class="machinery-info-box">
                <h4>{{ selectedMachineryForBooking.machinery_type }} Details</h4>
                <p>
                  <strong>Price:</strong>
                  ₱{{ formatNumber(getEffectivePricePerUnit(selectedMachineryForBooking)) }} {{ selectedMachineryForBooking.unit_type }}
                  <span v-if="isNonMember" style="opacity: 0.8;">(non-member rate)</span>
                </p>
                <p v-if="selectedMachineryForBooking.max_capacity">
                  <strong>Max Capacity:</strong> {{ selectedMachineryForBooking.max_capacity }} {{ selectedMachineryForBooking.capacity_unit }} per day
                </p>
              </div>
            </div>

            <div class="form-group" v-if="selectedMachineryForBooking">
              <label class="form-label">Booking Date *</label>
              <div v-if="selectedMachineryForBooking.max_capacity" class="booking-date-calendar">
                <p v-if="loadingUnavailableDates" class="cal-loading">Checking availability…</p>
                <div class="cal-nav">
                  <button type="button" class="cal-nav-btn" @click="shiftBookingMonth(-1)" :disabled="!canShiftBookingMonth(-1)">
                    ‹
                  </button>
                  <span class="cal-nav-title">{{ bookingMonthTitle }}</span>
                  <button type="button" class="cal-nav-btn" @click="shiftBookingMonth(1)" :disabled="!canShiftBookingMonth(1)">
                    ›
                  </button>
                </div>
                <div class="cal-weekdays">
                  <span v-for="w in weekdayLabels" :key="w">{{ w }}</span>
                </div>
                <div class="cal-grid">
                  <button
                    v-for="c in bookingCalendarCells"
                    :key="c.key"
                    type="button"
                    class="cal-cell"
                    :class="{
                      'cal-cell--outside': !c.inMonth,
                      'cal-cell--disabled': c.disabled,
                      'cal-cell--full': c.isFull,
                      'cal-cell--selected': c.selected
                    }"
                    :disabled="c.disabled"
                    @click="selectBookingCalendarDate(c)"
                  >
                    <span class="cal-day-num">{{ c.dayNum }}</span>
                    <span v-if="c.isFull" class="cal-full-label">FULL</span>
                  </button>
                </div>
                <p v-if="bookingForm.booking_date" class="cal-selected-hint">
                  Selected: <strong>{{ formatDate(bookingForm.booking_date) }}</strong>
                </p>
                <p v-else class="cal-selected-hint cal-selected-hint--muted">Pumili ng petsa sa kalendaryo.</p>
              </div>
              <input
                v-else
                v-model="bookingForm.booking_date"
                type="date"
                :min="minDate"
                class="form-input"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Service Location *</label>
              <p v-if="barangayPlacesLoading" class="form-hint">Nilo-load ang mga lokasyon…</p>
              <template v-else-if="bookingUsesPlaceDropdown">
                <select
                  v-model="bookingForm.barangay_place_id"
                  class="form-input"
                  required
                >
                  <option value="">Pumili ng lugar sa inyong barangay…</option>
                  <option
                    v-for="p in barangayServicePlaces"
                    :key="p.id"
                    :value="String(p.id)"
                  >
                    {{ p.name }}{{ p.description ? ' — ' + p.description : '' }}
                  </option>
                </select>
                <small class="form-hint">Batay sa inyong rehistradong barangay.</small>
              </template>
              <template v-else>
                <p v-if="!authStore.currentUser?.barangay_id" class="form-hint">
                  Walang naka-link na barangay sa account; ilagay manu-mano ang lokasyon.
                </p>
                <p v-if="barangayPlacesLoadError && authStore.currentUser?.barangay_id" class="form-hint">
                  Hindi ma-load ang listahan ng lugar. Puwedeng maglagay ng teksto sa ibaba.
                </p>
                <input
                  v-model="bookingForm.service_location"
                  type="text"
                  class="form-input"
                  placeholder="Ilagay ang lokasyon ng serbisyo"
                  required
                />
                <small
                  v-if="authStore.currentUser?.barangay_id && !barangayPlacesLoadError"
                  class="form-hint"
                >
                  Walang naka-program na lugar para sa inyong barangay — ilagay ang address o detalye.
                </small>
              </template>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">{{ getAreaLabel() }} *</label>
                <input
                  v-model.number="bookingForm.area_size"
                  type="number"
                  step="0.01"
                  min="0.01"
                  :max="selectedMachineryForBooking?.max_capacity || undefined"
                  class="form-input"
                  :class="{ 'input-error': capacityError }"
                  @input="validateAndCalculate"
                  placeholder="0.00"
                  required
                />
                <small v-if="selectedMachineryForBooking?.max_capacity" class="form-hint">
                  Maximum: {{ selectedMachineryForBooking.max_capacity }} {{ selectedMachineryForBooking.capacity_unit }}
                </small>
                <small v-if="capacityError" class="error-message">{{ capacityError }}</small>
              </div>
              <div class="form-group">
                <label class="form-label">Unit *</label>
                <input
                  v-model="bookingForm.area_unit"
                  type="text"
                  class="form-input input-readonly"
                  readonly
                  placeholder="Auto-filled"
                />
                <small v-if="bookingForm.area_unit" class="form-hint">Using: {{ bookingForm.area_unit }}</small>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Additional Notes</label>
              <textarea
                v-model="bookingForm.notes"
                class="form-input"
                rows="3"
                placeholder="Any special instructions or notes..."
              ></textarea>
            </div>

            <div class="price-summary" v-if="calculatedPrice > 0">
              <div class="summary-row">
                <span v-if="selectedMachineryForBooking?.unit_type === 'per load'">
                  ₱{{ formatNumber(getEffectivePricePerUnit(selectedMachineryForBooking) || 0) }} per load
                  (up to {{ selectedMachineryForBooking?.max_capacity }} {{ selectedMachineryForBooking?.capacity_unit }})
                </span>
                <span v-else>
                  {{ bookingForm.area_size }} {{ bookingForm.area_unit }} × ₱{{ formatNumber(getEffectivePricePerUnit(selectedMachineryForBooking) || 0) }}
                </span>
                <strong class="total-price">₱{{ formatNumber(calculatedPrice) }}</strong>
              </div>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="loading || !bookingForm.machinery_id || !!capacityError">
                {{ loading ? 'Booking...' : 'Confirm Booking' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Booking Details Modal -->
    <div v-if="showViewBookingModal && selectedBooking" class="modal-overlay" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Booking Details #{{ selectedBooking.id }}</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="booking-details">
            <div class="detail-section">
              <h3>Machinery Information</h3>
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
                  <label>Price Rate:</label>
                  <span>₱{{ formatNumber(selectedBooking.price_per_unit) }} {{ selectedBooking.unit_type }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section">
              <h3>Booking Information</h3>
              <div class="details-grid">
                <div class="detail-item">
                  <label>Booking Date:</label>
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
                  <label>Total Price:</label>
                  <strong class="price-highlight">₱{{ formatNumber(selectedBooking.total_price) }}</strong>
                </div>
                <div class="detail-item">
                  <label>Status:</label>
                  <span class="status-badge" :class="'status-' + getBookingStatusClass(selectedBooking.status)">
                    {{ selectedBooking.status }}
                  </span>
                </div>
                <div class="detail-item" v-if="selectedBooking.created_at">
                  <label>Created:</label>
                  <span>{{ formatDateTime(selectedBooking.created_at) }}</span>
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
              <h3>Additional Notes</h3>
              <p class="notes-text">{{ selectedBooking.notes }}</p>
            </div>

            <div class="detail-section" v-if="selectedBooking.status === 'Completed' || (selectedBooking.total_paid || 0) > 0">
              <h3>Payment History</h3>
              <div v-if="paymentHistoryLoading" class="empty-payments">Loading payment records...</div>
              <div v-else-if="paymentHistory.length === 0" class="empty-payments">
                No payment records yet.
              </div>
              <div v-else class="payments-table-wrap">
                <table class="payments-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th class="text-right">Amount Paid</th>
                      <th>Receipt Number</th>
                      <th>Recorded By</th>
                      <th>Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="payment in paymentHistory" :key="payment.id">
                      <td>{{ formatDate(payment.payment_date) }}</td>
                      <td class="text-right">₱{{ formatNumber(payment.amount || 0) }}</td>
                      <td>{{ payment.receipt_number || '-' }}</td>
                      <td>{{ payment.recorded_by_name || '-' }}</td>
                      <td>{{ payment.remarks || '-' }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Booking Modal -->
    <div v-if="showEditModal" class="modal-overlay" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Edit Booking</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="editBooking">
            <div class="form-group">
              <label class="form-label">Select Machinery *</label>
              <select v-model="bookingToEdit.machinery_id" @change="onEditMachinerySelect" class="form-input" required>
                <option value="">Choose machinery...</option>
                <option v-for="machine in availableMachinery" :key="machine.id" :value="machine.id">
                  {{ machine.machinery_name }} ({{ machine.machinery_type }}) - ₱{{ formatNumber(machine.price_per_unit) }} {{ machine.unit_type }}
                </option>
              </select>
            </div>

            <div class="form-group" v-if="bookingToEdit">
              <label class="form-label">Booking Date *</label>
              <div v-if="selectedEditMachinery && selectedEditMachinery.max_capacity" class="booking-date-calendar">
                <p v-if="loadingEditUnavailableDates" class="cal-loading">Checking availability…</p>
                <div class="cal-nav">
                  <button type="button" class="cal-nav-btn" @click="shiftEditMonth(-1)" :disabled="!canShiftEditMonth(-1)">
                    ‹
                  </button>
                  <span class="cal-nav-title">{{ editMonthTitle }}</span>
                  <button type="button" class="cal-nav-btn" @click="shiftEditMonth(1)" :disabled="!canShiftEditMonth(1)">
                    ›
                  </button>
                </div>
                <div class="cal-weekdays">
                  <span v-for="w in weekdayLabels" :key="'e-' + w">{{ w }}</span>
                </div>
                <div class="cal-grid">
                  <button
                    v-for="c in editCalendarCells"
                    :key="c.key"
                    type="button"
                    class="cal-cell"
                    :class="{
                      'cal-cell--outside': !c.inMonth,
                      'cal-cell--disabled': c.disabled,
                      'cal-cell--full': c.isFull,
                      'cal-cell--selected': c.selected
                    }"
                    :disabled="c.disabled"
                    @click="selectEditCalendarDate(c)"
                  >
                    <span class="cal-day-num">{{ c.dayNum }}</span>
                    <span v-if="c.isFull" class="cal-full-label">FULL</span>
                  </button>
                </div>
                <p v-if="bookingToEdit.booking_date" class="cal-selected-hint">
                  Selected: <strong>{{ formatDate(bookingToEdit.booking_date) }}</strong>
                </p>
                <p v-else class="cal-selected-hint cal-selected-hint--muted">Pumili ng petsa sa kalendaryo.</p>
              </div>
              <input
                v-else
                v-model="bookingToEdit.booking_date"
                type="date"
                class="form-input"
                :min="minDate"
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Service Location *</label>
              <p v-if="barangayPlacesLoading" class="form-hint">Nilo-load ang mga lokasyon…</p>
              <template v-else-if="bookingUsesPlaceDropdown">
                <select
                  v-model="bookingToEdit.barangay_place_id"
                  class="form-input"
                  required
                >
                  <option value="">Pumili ng lugar sa inyong barangay…</option>
                  <option
                    v-for="p in barangayServicePlaces"
                    :key="p.id"
                    :value="String(p.id)"
                  >
                    {{ p.name }}{{ p.description ? ' — ' + p.description : '' }}
                  </option>
                </select>
                <small class="form-hint">Batay sa inyong rehistradong barangay.</small>
              </template>
              <template v-else>
                <p v-if="!authStore.currentUser?.barangay_id" class="form-hint">
                  Walang naka-link na barangay sa account; ilagay manu-mano ang lokasyon.
                </p>
                <p v-if="barangayPlacesLoadError && authStore.currentUser?.barangay_id" class="form-hint">
                  Hindi ma-load ang listahan ng lugar. Puwedeng maglagay ng teksto sa ibaba.
                </p>
                <input
                  v-model="bookingToEdit.service_location"
                  type="text"
                  class="form-input"
                  placeholder="Ilagay ang lokasyon ng serbisyo"
                  required
                />
              </template>
            </div>

            <div class="form-group">
              <label class="form-label">Area/Quantity ({{ bookingToEdit.area_unit }}) *</label>
              <input 
                v-model.number="bookingToEdit.area_size" 
                type="number" 
                min="0" 
                step="0.01" 
                class="form-input" 
                required
              />
            </div>

            <div class="form-group">
              <label class="form-label">Notes/Instructions</label>
              <textarea 
                v-model="bookingToEdit.notes" 
                class="form-input" 
                rows="3"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="loading">
                {{ loading ? 'Updating...' : 'Update Booking' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- Cancel Booking Confirmation Modal -->
    <div v-if="showCancelModal" class="modal-overlay" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content modal-small">
        <div class="modal-header">
          <h2>Cancel Booking</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to cancel this booking?</p>
          <div class="booking-summary">
            <p><strong>Machinery:</strong> {{ bookingToCancel?.machinery_name }}</p>
            <p><strong>Date:</strong> {{ formatDate(bookingToCancel?.booking_date) }}</p>
            <p><strong>Total:</strong> ₱{{ formatNumber(bookingToCancel?.total_price) }}</p>
          </div>
          <div class="modal-actions">
            <button @click="closeModals" class="btn-secondary">No, Keep It</button>
            <button @click="cancelBooking" class="btn-danger" :disabled="loading">
              {{ loading ? 'Cancelling...' : 'Yes, Cancel' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Error/Success Messages -->
    <div v-if="error" class="alert alert-error">
      {{ error }}
      <button type="button" @click="clearError" class="alert-close" aria-label="Dismiss">×</button>
    </div>
    <div v-if="successMessage" class="alert alert-success">
      {{ successMessage }}
      <button type="button" @click="successMessage = ''" class="alert-close" aria-label="Dismiss">×</button>
    </div>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useMachineryStore } from '../stores/machineryStore'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

export default {
  name: 'MachineryBookingPage',
  setup() {
    const machineryStore = useMachineryStore()
    const authStore = useAuthStore()
    const route = useRoute()
    const { isDark } = useBackdropTheme()
    const isLight = computed(() => !isDark.value)

    const isNonMember = computed(() => authStore.currentUser?.membership_status === 'non-member')

    const getEffectivePricePerUnit = (machine) => {
      if (!machine) return 0
      const base = parseFloat(machine.price_per_unit || 0)
      const memberPrice = parseFloat(machine.member_price || 0)
      const nonMemberPrice = parseFloat(machine.non_member_price || 0)

      // Prefer explicit tiered pricing if present; otherwise fall back to base pricing
      if (isNonMember.value) {
        return nonMemberPrice || (base ? base * 1.25 : 0)
      }

      return memberPrice || base
    }

    // State
    const highlightedBookingId = ref(null)
    const showBookingModal = ref(false)
    const showViewBookingModal = ref(false)
    const showCancelModal = ref(false)
    const showEditModal = ref(false)
    const bookingToCancel = ref(null)
    const bookingToEdit = ref(null)
    const successMessage = ref('')
    const bookingFilter = ref('')
    const paymentFilter = ref('')
    const machineryTypeFilter = ref('')
    const calculatedPrice = ref(0)
    const capacityError = ref('')
    const outstandingBalance = ref(0)
    const unpaidBookingsList = ref([])
    const paymentHistory = ref([])
    const paymentHistoryLoading = ref(false)
    let bookingsRefreshInterval = null

    const bookingForm = ref({
      farmer_id: null,
      machinery_id: '',
      booking_date: '',
      barangay_place_id: '',
      service_location: '',
      area_size: 0,
      area_unit: '',
      notes: ''
    })

    const barangayServicePlaces = ref([])
    const barangayPlacesLoading = ref(false)
    const barangayPlacesLoadError = ref(false)

    const bookingUsesPlaceDropdown = computed(() => {
      const bid = authStore.currentUser?.barangay_id
      return !!(
        bid &&
        barangayServicePlaces.value.length > 0 &&
        !barangayPlacesLoadError.value
      )
    })

    const loadBarangayServicePlaces = async () => {
      const bid = authStore.currentUser?.barangay_id
      if (!bid) {
        barangayServicePlaces.value = []
        return
      }
      barangayPlacesLoading.value = true
      barangayPlacesLoadError.value = false
      try {
        const res = await fetch(`/api/barangays/${bid}/places`, { credentials: 'include' })
        const data = await res.json().catch(() => ({}))
        if (!res.ok || !data.success) {
          throw new Error(data.message || 'Failed to load barangay places')
        }
        barangayServicePlaces.value = Array.isArray(data.places) ? data.places : []
      } catch (e) {
        console.error('loadBarangayServicePlaces:', e)
        barangayPlacesLoadError.value = true
        barangayServicePlaces.value = []
      } finally {
        barangayPlacesLoading.value = false
      }
    }

    // Helper function to construct proper image URLs
    const getImageUrl = (imagePath) => {
      if (!imagePath) return ''
      
      // If it's a data URL (from file input), return as-is
      if (imagePath.startsWith('data:')) {
        return imagePath
      }
      
      // If it's a server path, construct full backend URL
      if (imagePath.startsWith('/uploads/')) {
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        return `${apiBaseUrl}${imagePath}`
      }
      
      return imagePath
    }

    // Computed
    const distinctMachineryTypes = computed(() => machineryStore.distinctMachineryTypes)
    
    const allAvailableMachinery = computed(() => machineryStore.availableMachinery)
    
    const availableMachinery = computed(() => {
      if (!machineryTypeFilter.value) return allAvailableMachinery.value
      return allAvailableMachinery.value.filter(m => m.machinery_type === machineryTypeFilter.value)
    })
    
    const bookings = computed(() => machineryStore.bookings)
    const loading = computed(() => machineryStore.loading)
    const error = computed(() => machineryStore.error)
    const selectedBooking = computed(() => machineryStore.selectedBooking)

    const minDate = computed(() => {
      const tomorrow = new Date()
      tomorrow.setDate(tomorrow.getDate() + 1)
      return formatYMD(tomorrow)
    })

    const formatYMD = (d) => {
      const y = d.getFullYear()
      const m = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      return `${y}-${m}-${day}`
    }

    const addDaysToYMD = (ymdStr, days) => {
      const parts = String(ymdStr || '').split('-').map(Number)
      if (parts.length !== 3 || parts.some((n) => Number.isNaN(n))) return minDate.value
      const dt = new Date(parts[0], parts[1] - 1, parts[2])
      dt.setDate(dt.getDate() + days)
      return formatYMD(dt)
    }

    const BOOKING_CALENDAR_RANGE_DAYS = 120
    const weekdayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

    const maxBookableDateStr = computed(() => addDaysToYMD(minDate.value, BOOKING_CALENDAR_RANGE_DAYS))

    const fullCapacityDateMap = ref({})
    const loadingUnavailableDates = ref(false)
    const bookingCalendarMonth = ref(new Date())

    const editFullCapacityMap = ref({})
    const loadingEditUnavailableDates = ref(false)
    const editCalendarMonth = ref(new Date())

    const buildCalendarGrid = (year, month, minStr, maxStr, selected, fullMap) => {
      const first = new Date(year, month, 1)
      const startOffset = (first.getDay() + 6) % 7
      const gridStart = new Date(year, month, 1 - startOffset)
      const cells = []
      for (let i = 0; i < 42; i++) {
        const d = new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i)
        const ymd = formatYMD(d)
        const inMonth = d.getMonth() === month && d.getFullYear() === year
        const beforeMin = ymd < minStr
        const afterMax = ymd > maxStr
        const isFull = !!(fullMap && fullMap[ymd])
        const disabled = !inMonth || beforeMin || afterMax || isFull
        cells.push({
          key: `${ymd}-${i}`,
          ymd,
          dayNum: d.getDate(),
          inMonth,
          disabled,
          isFull,
          selected: ymd === selected
        })
      }
      return cells
    }

    const initBookingCalendarMonth = () => {
      const seed = bookingForm.value.booking_date || minDate.value
      const parts = String(seed).split('-').map(Number)
      if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
        bookingCalendarMonth.value = new Date(parts[0], parts[1] - 1, 1)
      }
    }

    const initEditCalendarMonth = () => {
      if (!bookingToEdit.value) return
      const seed = bookingToEdit.value.booking_date || minDate.value
      const parts = String(seed).split('-').map(Number)
      if (parts.length === 3 && !parts.some((n) => Number.isNaN(n))) {
        editCalendarMonth.value = new Date(parts[0], parts[1] - 1, 1)
      }
    }

    const loadUnavailableDatesForCreate = async () => {
      const id = bookingForm.value.machinery_id
      const machine = selectedMachineryForBooking.value
      if (!id || !machine?.max_capacity) {
        fullCapacityDateMap.value = {}
        return
      }
      loadingUnavailableDates.value = true
      try {
        const start = minDate.value
        const end = maxBookableDateStr.value
        const res = await fetch(
          `/api/machinery/bookings/unavailable-dates/${id}?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`
        )
        const data = await res.json().catch(() => ({}))
        const m = {}
        if (data.success && Array.isArray(data.unavailable_dates)) {
          for (const row of data.unavailable_dates) {
            if (row.date) m[row.date] = true
          }
        }
        fullCapacityDateMap.value = m
        const cur = bookingForm.value.booking_date
        if (cur && m[cur]) {
          bookingForm.value.booking_date = ''
        }
      } catch (e) {
        console.error('Failed to load unavailable dates:', e)
      } finally {
        loadingUnavailableDates.value = false
      }
    }

    const loadUnavailableForEdit = async () => {
      if (!bookingToEdit.value) return
      const id = bookingToEdit.value.machinery_id
      const machine = availableMachinery.value.find((mm) => mm.id == id)
      if (!id || !machine?.max_capacity) {
        editFullCapacityMap.value = {}
        return
      }
      loadingEditUnavailableDates.value = true
      try {
        const start = minDate.value
        const end = maxBookableDateStr.value
        const res = await fetch(
          `/api/machinery/bookings/unavailable-dates/${id}?start_date=${encodeURIComponent(start)}&end_date=${encodeURIComponent(end)}`
        )
        const data = await res.json().catch(() => ({}))
        const map = {}
        if (data.success && Array.isArray(data.unavailable_dates)) {
          for (const row of data.unavailable_dates) {
            if (row.date) map[row.date] = true
          }
        }
        editFullCapacityMap.value = map
        const cur = bookingToEdit.value.booking_date
        if (cur && map[cur]) {
          bookingToEdit.value.booking_date = ''
        }
      } catch (e) {
        console.error('Failed to load unavailable dates (edit):', e)
      } finally {
        loadingEditUnavailableDates.value = false
      }
    }

    const monthStartTs = (y, m0) => new Date(y, m0, 1).getTime()

    const canShiftBookingMonth = (delta) => {
      const cur = bookingCalendarMonth.value
      const next = new Date(cur.getFullYear(), cur.getMonth() + delta, 1)
      const minP = minDate.value.split('-').map(Number)
      const maxP = maxBookableDateStr.value.split('-').map(Number)
      const minTs = monthStartTs(minP[0], minP[1] - 1)
      const maxTs = monthStartTs(maxP[0], maxP[1] - 1)
      const nts = next.getTime()
      if (delta < 0) return nts >= minTs
      return nts <= maxTs
    }

    const shiftBookingMonth = (delta) => {
      if (!canShiftBookingMonth(delta)) return
      const cur = bookingCalendarMonth.value
      bookingCalendarMonth.value = new Date(cur.getFullYear(), cur.getMonth() + delta, 1)
    }

    const canShiftEditMonth = (delta) => {
      const cur = editCalendarMonth.value
      const next = new Date(cur.getFullYear(), cur.getMonth() + delta, 1)
      const minP = minDate.value.split('-').map(Number)
      const maxP = maxBookableDateStr.value.split('-').map(Number)
      const minTs = monthStartTs(minP[0], minP[1] - 1)
      const maxTs = monthStartTs(maxP[0], maxP[1] - 1)
      const nts = next.getTime()
      if (delta < 0) return nts >= minTs
      return nts <= maxTs
    }

    const shiftEditMonth = (delta) => {
      if (!canShiftEditMonth(delta)) return
      const cur = editCalendarMonth.value
      editCalendarMonth.value = new Date(cur.getFullYear(), cur.getMonth() + delta, 1)
    }

    const bookingMonthTitle = computed(() => {
      const d = bookingCalendarMonth.value
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    })

    const editMonthTitle = computed(() => {
      const d = editCalendarMonth.value
      return d.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
    })

    const bookingCalendarCells = computed(() => {
      const d = bookingCalendarMonth.value
      return buildCalendarGrid(
        d.getFullYear(),
        d.getMonth(),
        minDate.value,
        maxBookableDateStr.value,
        bookingForm.value.booking_date,
        fullCapacityDateMap.value
      )
    })

    const selectedEditMachinery = computed(() => {
      if (!bookingToEdit.value?.machinery_id) return null
      return availableMachinery.value.find((m) => m.id == bookingToEdit.value.machinery_id)
    })

    const editCalendarCells = computed(() => {
      const d = editCalendarMonth.value
      if (!bookingToEdit.value) return []
      return buildCalendarGrid(
        d.getFullYear(),
        d.getMonth(),
        minDate.value,
        maxBookableDateStr.value,
        bookingToEdit.value.booking_date,
        editFullCapacityMap.value
      )
    })

    const selectBookingCalendarDate = (c) => {
      if (c.disabled) return
      bookingForm.value.booking_date = c.ymd
    }

    const selectEditCalendarDate = (c) => {
      if (c.disabled || !bookingToEdit.value) return
      bookingToEdit.value.booking_date = c.ymd
    }

    const myBookings = computed(() => {
      return bookings.value.filter(b => b.farmer_id === authStore.currentUser?.id)
    })

    const myBookingsCount = computed(() => myBookings.value.length)
    
    const pendingBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Pending').length
    })
    
    const approvedBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Approved').length
    })
    
    const completedBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Completed').length
    })

    // Payment tracking computed properties
    const unpaidBookingsCount = computed(() => {
      return myBookings.value.filter(b => 
        b.status === 'Completed' && 
        (b.payment_status === 'Unpaid' || !b.payment_status)
      ).length
    })

    const partialBookingsCount = computed(() => {
      return myBookings.value.filter(b => 
        b.status === 'Completed' && 
        b.payment_status === 'Partial'
      ).length
    })

    const paidBookingsCount = computed(() => {
      return myBookings.value.filter(b => 
        b.status === 'Completed' && 
        b.payment_status === 'Paid'
      ).length
    })

    const filteredBookings = computed(() => {
      let filtered = myBookings.value
      if (bookingFilter.value) {
        filtered = filtered.filter(b => b.status === bookingFilter.value)
      }
      if (paymentFilter.value) {
        filtered = filtered.filter(b => (b.payment_status || 'Unpaid') === paymentFilter.value)
      }
      return filtered
    })

    const selectedMachineryForBooking = computed(() => {
      if (!bookingForm.value.machinery_id) return null
      return availableMachinery.value.find(m => m.id == bookingForm.value.machinery_id)
    })

    // Methods
    const loadFarmerBalance = async () => {
      try {
        if (!authStore.currentUser?.id) return
        
        const response = await fetch(`http://localhost:3000/api/machinery/bookings/farmer-balance/${authStore.currentUser.id}`)
        const data = await response.json()
        
        if (data.success) {
          outstandingBalance.value = data.total_outstanding_balance || 0
          unpaidBookingsList.value = data.unpaid_bookings || []
        }
      } catch (error) {
        console.error('Error loading farmer balance:', error)
      }
    }

    const loadData = async () => {
      try {
        await Promise.all([
          machineryStore.fetchInventory({ status: 'Available' }),
          machineryStore.fetchBookings({ farmer_id: authStore.currentUser?.id }),
          loadFarmerBalance(),
          loadBarangayServicePlaces()
        ])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    const applyFilter = () => {
      // Filter is reactive, no action needed
    }

    const applyMachineryFilter = () => {
      // Filter is reactive, no action needed
    }

    const onMachinerySelect = () => {
      if (selectedMachineryForBooking.value) {
        capacityError.value = ''
        console.log('Selected machinery:', selectedMachineryForBooking.value)

        // Use the machinery's capacity_unit directly to ensure correct unit matching
        const unit = selectedMachineryForBooking.value.capacity_unit ||
          selectedMachineryForBooking.value.unit_type ||
          'units'
        bookingForm.value.area_unit = unit.replace(/^per /, '').trim()

        console.log('Area unit set to:', bookingForm.value.area_unit)
        calculatePrice()
      }
      initBookingCalendarMonth()
      void loadUnavailableDatesForCreate()
    }

    const validateAndCalculate = () => {
      capacityError.value = ''
      
      if (selectedMachineryForBooking.value && bookingForm.value.area_size > 0) {
        // Check capacity limit
        if (selectedMachineryForBooking.value.max_capacity && 
            bookingForm.value.area_size > selectedMachineryForBooking.value.max_capacity) {
          capacityError.value = `Maximum capacity is ${selectedMachineryForBooking.value.max_capacity} ${selectedMachineryForBooking.value.capacity_unit} per day`
          calculatedPrice.value = 0
          return
        }
        
        // IMPROVED: Handle 'per load' pricing (flat rate) vs per unit pricing (multiply)
        if (selectedMachineryForBooking.value.unit_type === 'per load') {
          // Flat rate for entire load (e.g., Dryer: ₱7,500 for up to 100 kabans)
          calculatedPrice.value = getEffectivePricePerUnit(selectedMachineryForBooking.value)
        } else {
          // Per unit pricing (e.g., Tractor: ₱500 per hectare = 60 × 500)
          calculatedPrice.value = getEffectivePricePerUnit(selectedMachineryForBooking.value) * bookingForm.value.area_size
        }
      } else {
        calculatedPrice.value = 0
      }
    }

    const calculatePrice = () => {
      validateAndCalculate()
    }

    const getAreaLabel = () => {
      if (!bookingForm.value.machinery_id) return 'Area/Quantity'
      const machinery = selectedMachineryForBooking.value
      if (!machinery) return 'Area/Quantity'
      
      // Use the machinery's capacity_unit for the label to be clear
      const unit = machinery.capacity_unit || 'units'
      const type = machinery.machinery_type
      
      if (type === 'Harvester' || type === 'Tractor') return `Area (${unit})`
      if (type === 'Dryer') return `Quantity (${unit})`
      if (type === 'Hauling Track') return `Quantity (${unit})`
      return `Quantity (${unit})`
    }

    const bookMachinery = async (machine) => {
      bookingForm.value.machinery_id = machine.id
      onMachinerySelect()
      await loadBarangayServicePlaces()
      showBookingModal.value = true
    }

    const submitBooking = async () => {
      try {
        console.log('Current user:', authStore.currentUser)
        console.log('Form values before validation:', JSON.stringify({
          machinery_id: bookingForm.value.machinery_id,
          booking_date: bookingForm.value.booking_date,
          service_location: bookingForm.value.service_location,
          area_size: bookingForm.value.area_size,
          area_unit: bookingForm.value.area_unit,
          notes: bookingForm.value.notes
        }, null, 2))
        
        // Check if user is authenticated
        if (!authStore.currentUser || !authStore.currentUser.id) {
          machineryStore.error = 'You must be logged in to book machinery'
          console.error('User not authenticated:', authStore.currentUser)
          return
        }
        
        // Check capacity one more time before submitting
        if (capacityError.value) {
          return
        }

        // Validate all required fields
        if (!bookingForm.value.machinery_id) {
          machineryStore.error = 'Please select a machinery'
          return
        }
        if (!bookingForm.value.booking_date) {
          machineryStore.error = 'Please select a booking date'
          return
        }

        const useDd = bookingUsesPlaceDropdown.value
        if (useDd) {
          const pid = parseInt(String(bookingForm.value.barangay_place_id || ''), 10)
          if (!Number.isFinite(pid) || pid <= 0) {
            machineryStore.error = 'Pumili ng lokasyon ng serbisyo mula sa listahan.'
            return
          }
        } else if (!bookingForm.value.service_location || bookingForm.value.service_location.trim() === '') {
          machineryStore.error = 'Ilagay ang lokasyon ng serbisyo.'
          return
        }
        if (!bookingForm.value.area_size || bookingForm.value.area_size <= 0) {
          machineryStore.error = 'Please enter a valid area/quantity'
          return
        }
        if (!bookingForm.value.area_unit || bookingForm.value.area_unit.trim() === '') {
          console.error('Area unit is empty:', bookingForm.value.area_unit)
          machineryStore.error = 'Area unit is missing. Please reselect the machinery.'
          return
        }

        // Prepare booking data with proper values
        const bookingData = {
          farmer_id: authStore.currentUser.id,
          machinery_id: parseInt(bookingForm.value.machinery_id),
          booking_date: bookingForm.value.booking_date,
          area_size: parseFloat(bookingForm.value.area_size),
          area_unit: bookingForm.value.area_unit.trim(),
          notes: bookingForm.value.notes ? bookingForm.value.notes.trim() : ''
        }
        if (useDd) {
          bookingData.barangay_place_id = parseInt(String(bookingForm.value.barangay_place_id), 10)
          bookingData.service_location = ''
        } else {
          bookingData.service_location = bookingForm.value.service_location.trim()
        }
        
        console.log('Submitting booking:', JSON.stringify(bookingData, null, 2))
        
        // Validate bookingData one more time before sending
        const missingFields = []
        if (!bookingData.farmer_id) missingFields.push('farmer_id')
        if (!bookingData.machinery_id) missingFields.push('machinery_id')
        if (!bookingData.booking_date) missingFields.push('booking_date')
        if (!useDd && !bookingData.service_location) missingFields.push('service_location')
        if (!bookingData.area_size) missingFields.push('area_size')
        if (!bookingData.area_unit) missingFields.push('area_unit')
        
        if (missingFields.length > 0) {
          console.error('Missing fields in booking data:', missingFields)
          machineryStore.error = `Missing required fields: ${missingFields.join(', ')}`
          return
        }
        
        await machineryStore.createBooking(bookingData)
        successMessage.value = 'Booking created successfully! Waiting for operator approval.'
        closeModals()
        resetBookingForm()
        await loadData()
      } catch (error) {
        console.error('Error creating booking:', error)
      }
    }

    const viewBookingDetails = async (booking) => {
      try {
        paymentHistoryLoading.value = true
        await machineryStore.getBookingDetails(booking.id)

        const response = await fetch(`http://localhost:3000/api/machinery/bookings/${booking.id}/payments`)
        const data = await response.json().catch(() => ({ success: false, payments: [] }))
        paymentHistory.value = data.success ? (data.payments || []) : []
        showViewBookingModal.value = true
      } catch (error) {
        console.error('Error viewing booking:', error)
        paymentHistory.value = []
      } finally {
        paymentHistoryLoading.value = false
      }
    }

    const cancelBookingConfirm = (booking) => {
      bookingToCancel.value = booking
      showCancelModal.value = true
    }

    const cancelBooking = async () => {
      try {
        await machineryStore.cancelBooking(bookingToCancel.value.id, authStore.currentUser?.id)
        successMessage.value = 'Booking cancelled successfully'
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error cancelling booking:', error)
      }
    }

    const editBookingConfirm = (booking) => {
      bookingToEdit.value = {
        ...booking,
        originalMachineryId: booking.machinery_id,
        booking_date: formatDateForInput(booking.booking_date), // Ensure date is in YYYY-MM-DD format
        barangay_place_id:
          booking.barangay_place_id != null && booking.barangay_place_id !== ''
            ? String(booking.barangay_place_id)
            : ''
      }
      showEditModal.value = true
      nextTick(async () => {
        initEditCalendarMonth()
        await Promise.all([loadUnavailableForEdit(), loadBarangayServicePlaces()])
      })
    }

    const onEditMachinerySelect = () => {
      // Convert machinery_id to number and update area_unit when machinery is changed
      bookingToEdit.value.machinery_id = parseInt(bookingToEdit.value.machinery_id, 10)
      const selectedMachine = availableMachinery.value.find(m => m.id === bookingToEdit.value.machinery_id)
      if (selectedMachine) {
        bookingToEdit.value.area_unit = selectedMachine.capacity_unit || ''
      }
      initEditCalendarMonth()
      void loadUnavailableForEdit()
    }

    const editBooking = async () => {
      try {
        if (!bookingToEdit.value.machinery_id) {
          alert('Please select a machinery')
          return
        }
        if (!bookingToEdit.value.booking_date) {
          alert('Please select a booking date')
          return
        }
        if (bookingToEdit.value.area_size <= 0) {
          alert('Please enter valid area/quantity')
          return
        }

        const useDd = bookingUsesPlaceDropdown.value
        if (useDd) {
          const pid = parseInt(String(bookingToEdit.value.barangay_place_id || ''), 10)
          if (!Number.isFinite(pid) || pid <= 0) {
            alert('Pumili ng lokasyon ng serbisyo mula sa listahan.')
            return
          }
        } else if (
          !bookingToEdit.value.service_location ||
          String(bookingToEdit.value.service_location).trim() === ''
        ) {
          alert('Ilagay ang lokasyon ng serbisyo.')
          return
        }

        // Prepare booking data with proper type conversions
        const bookingData = {
          machinery_id: parseInt(bookingToEdit.value.machinery_id, 10),
          booking_date: bookingToEdit.value.booking_date,
          area_size: parseFloat(bookingToEdit.value.area_size),
          area_unit: bookingToEdit.value.area_unit || '',
          notes: bookingToEdit.value.notes || ''
        }
        if (useDd) {
          bookingData.barangay_place_id = parseInt(String(bookingToEdit.value.barangay_place_id), 10)
          bookingData.service_location = ''
        } else {
          bookingData.service_location = String(bookingToEdit.value.service_location || '').trim()
        }

        console.log('Sending edit booking data:', bookingData)
        await machineryStore.editBooking(bookingToEdit.value.id, bookingData)
        successMessage.value = 'Booking updated successfully'
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error updating booking:', error)
        alert('Error updating booking: ' + (error.message || 'Unknown error'))
      }
    }

    const closeModals = () => {
      showBookingModal.value = false
      showViewBookingModal.value = false
      showCancelModal.value = false
      showEditModal.value = false
      bookingToCancel.value = null
      bookingToEdit.value = null
      paymentHistory.value = []
      paymentHistoryLoading.value = false
      machineryStore.clearSelection()
    }

    const resetBookingForm = () => {
      bookingForm.value = {
        farmer_id: null,
        machinery_id: '',
        booking_date: '',
        barangay_place_id: '',
        service_location: '',
        area_size: 0,
        area_unit: '',
        notes: ''
      }
      calculatedPrice.value = 0
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
        'Completed': 'info',
        'Rejected': 'danger',
        'Cancelled': 'default'
      }
      return classes[status] || 'default'
    }

    const getPaymentStatusClass = (paymentStatus) => {
      const classes = {
        'Unpaid': 'unpaid',
        'Partial': 'partial',
        'Paid': 'paid'
      }
      return classes[paymentStatus] || 'unpaid'
    }

    const formatNumber = (num) => {
      return new Intl.NumberFormat('en-PH').format(num)
    }

    // Format date for HTML date input (YYYY-MM-DD format)
    const formatDateForInput = (date) => {
      if (!date) return ''
      const d = new Date(date)
      const month = String(d.getMonth() + 1).padStart(2, '0')
      const day = String(d.getDate()).padStart(2, '0')
      const year = d.getFullYear()
      return `${year}-${month}-${day}`
    }

    const formatDate = (date) => {
      return new Date(date).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      })
    }

    const formatDateTime = (datetime) => {
      return new Date(datetime).toLocaleString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      })
    }

    // Lifecycle
    onMounted(async () => {
      await loadData()

      bookingsRefreshInterval = setInterval(() => {
        loadData().catch((error) => {
          console.error('Error refreshing booking data:', error)
        })
      }, 3000)

      // Handle notification highlight
      if (route.query.highlight && route.query.type === 'booking') {
        highlightedBookingId.value = route.query.highlight
        await nextTick()
        setTimeout(() => {
          const el = document.querySelector(`[data-booking-id="${route.query.highlight}"]`)
          if (el) {
            el.scrollIntoView({ behavior: 'smooth', block: 'center' })
          }
          setTimeout(() => { highlightedBookingId.value = null }, 6000)
        }, 300)
      }
    })

    onUnmounted(() => {
      if (bookingsRefreshInterval) {
        clearInterval(bookingsRefreshInterval)
        bookingsRefreshInterval = null
      }
    })

    return {
      isLight,
      // Stores
      authStore,
      // State
      highlightedBookingId,
      showBookingModal,
      showViewBookingModal,
      showCancelModal,
      showEditModal,
      bookingToCancel,
      bookingToEdit,
      successMessage,
      bookingFilter,
      machineryTypeFilter,
      bookingForm,
      barangayServicePlaces,
      barangayPlacesLoading,
      barangayPlacesLoadError,
      bookingUsesPlaceDropdown,
      calculatedPrice,
      capacityError,
      weekdayLabels,
      loadingUnavailableDates,
      loadingEditUnavailableDates,
      bookingMonthTitle,
      editMonthTitle,
      bookingCalendarCells,
      editCalendarCells,
      selectedEditMachinery,
      canShiftBookingMonth,
      shiftBookingMonth,
      canShiftEditMonth,
      shiftEditMonth,
      selectBookingCalendarDate,
      selectEditCalendarDate,
      // Computed
      distinctMachineryTypes,
      availableMachinery,
      loading,
      error,
      minDate,
      myBookingsCount,
      pendingBookingsCount,
      approvedBookingsCount,
      completedBookingsCount,
      filteredBookings,
      selectedMachineryForBooking,
      selectedBooking,
      // Methods
      applyFilter,
      applyMachineryFilter,
      onMachinerySelect,
      calculatePrice,
      validateAndCalculate,
      getAreaLabel,
      bookMachinery,
      submitBooking,
      viewBookingDetails,
      editBookingConfirm,
      onEditMachinerySelect,
      editBooking,
      cancelBookingConfirm,
      cancelBooking,
      closeModals,
      clearError,
      getMachineryTypeClass,
      getBookingStatusClass,
      getPaymentStatusClass,
      formatNumber,
      formatDateForInput,
      formatDate,
      formatDateTime,
      // Payment tracking
      paymentFilter,
      outstandingBalance,
      unpaidBookingsList,
      unpaidBookingsCount,
      partialBookingsCount,
      paidBookingsCount,
      paymentHistory,
      paymentHistoryLoading,
      getImageUrl,
      // Pricing helpers
      isNonMember,
      getEffectivePricePerUnit
    }
  }
}
</script>

<style scoped>
/* Notification highlight for table rows */
.notification-highlight-row {
  animation: highlightRowPulse 2s ease-in-out 3;
  background: rgba(127, 29, 29, 0.25) !important;
  outline: 2px solid #ef4444;
  outline-offset: -2px;
}

.notification-highlight-row td {
  background: rgba(127, 29, 29, 0.2) !important;
  color: #fecaca;
  font-weight: 600;
}

@keyframes highlightRowPulse {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.2); }
  50% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.55); }
}

.machinery-booking-page {
  padding: 24px;
  max-width: 1400px;
  margin: 0 auto;
  min-height: 100vh;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  color: #ecfbe2;
  border-radius: 20px;
}

.page-header {
  margin-bottom: 24px;
}

.glass-header {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  text-align: center;
  padding: 28px 24px;
  border-radius: 24px;
  background: linear-gradient(110deg, #0b3a2a 0%, #0d4a35 52%, #0b3a2a 100%);
  border: 1px solid rgba(52, 104, 81, 0.7);
  box-shadow:
    0 14px 28px rgba(4, 14, 10, 0.32),
    inset 0 1px 0 rgba(196, 255, 224, 0.12),
    inset 0 -1px 0 rgba(0, 0, 0, 0.22);
  backdrop-filter: blur(14px);
  -webkit-backdrop-filter: blur(14px);
}

.header-text {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.page-title {
  font-size: 34px;
  font-weight: 900;
  color: #f7fff4;
  margin: 0;
  line-height: 1.1;
}

.page-subtitle {
  color: rgba(240, 255, 238, 0.72);
  margin: 4px 0 0 0;
  font-size: 14px;
  font-weight: 700;
}

.stats-group {
  margin-bottom: 18px;
}

.payment-group {
  padding-top: 18px;
  margin-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.18);
}

.stats-group-title {
  font-size: 12px;
  letter-spacing: 1px;
  text-transform: uppercase;
  font-weight: 900;
  color: rgba(220, 238, 211, 0.78);
  margin-bottom: 12px;
  text-align: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 22px;
  margin-bottom: 24px;
}

.stat-card {
  border-radius: 16px;
  padding: 20px 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  transition: transform 220ms ease, box-shadow 240ms ease, border-color 240ms ease;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.glass-stat-card {
  background: linear-gradient(135deg, rgba(162, 246, 195, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 14px 24px rgba(8, 13, 10, 0.26), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.glass-stat-card:hover {
  transform: scale(1.05);
  border-color: rgba(220, 255, 233, 0.5);
  box-shadow: 0 18px 32px rgba(10, 25, 14, 0.34), 0 0 22px rgba(110, 231, 183, 0.22);
}

.stat-label {
  color: rgba(220, 238, 211, 0.74);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.4px;
  margin-bottom: 4px;
  text-align: center;
}

.stat-value {
  font-size: 34px;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  text-align: center;
}

.stat-pending { border-left: 4px solid rgba(251, 191, 36, 0.92); }
.stat-success { border-left: 4px solid rgba(74, 222, 128, 0.92); }
.stat-info { border-left: 4px solid rgba(96, 165, 250, 0.92); }
.stat-danger { border-left: 4px solid rgba(248, 113, 113, 0.9); }
.stat-warning { border-left: 4px solid rgba(251, 191, 36, 0.92); }
.stat-paid { border-left: 4px solid rgba(74, 222, 128, 0.92); }

.stat-outstanding .stat-value {
  color: #ffffff;
  text-shadow: none;
}

.payment-stats {
  margin-top: 4px;
}

.outstanding-warning {
  background: linear-gradient(135deg, rgba(110, 38, 38, 0.4) 0%, rgba(78, 24, 24, 0.4) 100%);
  border: 1px solid rgba(248, 113, 113, 0.35);
  border-left: 4px solid #ef4444;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 30px;
  display: flex;
  gap: 16px;
  align-items: flex-start;
}

.warning-icon {
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22px;
  font-weight: 900;
  color: #fef2f2;
  background: rgba(220, 38, 38, 0.85);
  border: 2px solid rgba(254, 226, 226, 0.6);
}

.warning-content h3 {
  margin: 0 0 8px 0;
  color: #fecaca;
  font-size: 18px;
}

.warning-content p {
  margin: 0 0 8px 0;
  color: rgba(254, 226, 226, 0.92);
}

.unpaid-bookings-list {
  margin-top: 12px;
  background: rgba(255, 255, 255, 0.94);
  border-radius: 8px;
  padding: 12px;
}

.unpaid-bookings-list h4 {
  margin: 0 0 8px 0;
  color: #991b1b;
  font-size: 14px;
}

.unpaid-bookings-list ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.unpaid-bookings-list li {
  display: flex;
  justify-content: space-between;
  padding: 8px 0;
  border-bottom: 1px solid #fecaca;
}

.unpaid-bookings-list li:last-child {
  border-bottom: none;
}

.booking-info {
  color: #7f1d1d;
}

.booking-balance {
  font-weight: bold;
  color: #dc2626;
}

.payment-badge {
  padding: 4px 10px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.payment-unpaid {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.payment-partial {
  background: #fffbeb;
  color: #d97706;
  border: 1px solid #fde68a;
}

.payment-paid {
  background: #f0fdf4;
  color: #16a34a;
  border: 1px solid #bbf7d0;
}

.balance-unpaid {
  color: #fca5a5;
  font-weight: 600;
}

.btn-book:disabled {
  background: #475569;
  color: #cbd5e1;
  cursor: not-allowed;
  transform: none;
  opacity: 0.85;
}

.btn-book:disabled:hover {
  background: #475569;
  transform: none;
}

.section {
  margin-bottom: 40px;
}

.section-title {
  font-size: 22px;
  font-weight: bold;
  margin-bottom: 20px;
  color: #ecfbe2;
}

.machinery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 20px;
  margin-bottom: 40px;
}

.machinery-card {
  background: #1f3024;
  border-radius: 12px;
  padding: 20px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    14px 14px 26px rgba(8, 13, 10, 0.55),
    -12px -12px 24px rgba(43, 62, 47, 0.52),
    inset -1px -1px 0 rgba(0,0,0,0.36);
  transition: transform 0.2s;
}

.machinery-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

.machinery-header {
  display: flex;
  justify-content: space-between;
  align-items: start;
  margin-bottom: 12px;
}

.machinery-title {
  font-size: 18px;
  font-weight: 600;
  color: #ecfbe2;
  margin: 0;
}

.machinery-description {
  color: rgba(236, 252, 231, 0.82);
  font-size: 14px;
  margin-bottom: 16px;
  min-height: 40px;
}

.machinery-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 16px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.detail-label {
  color: rgba(220, 238, 211, 0.76);
  font-size: 14px;
}

.detail-value {
  font-weight: 600;
  color: #f2ffe8;
}

.btn-book {
  width: 100%;
  background: linear-gradient(135deg, #53b476 0%, #2f8f53 100%);
  color: white;
  border: none;
  padding: 12px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.btn-book:hover:not(:disabled) {
  background: linear-gradient(135deg, #45a669 0%, #267947 100%);
}

.machinery-picture-container {
  width: 100%;
  height: 220px;
  background: #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
  overflow: hidden;
}

.machinery-picture {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 8px;
}

.machinery-picture-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  color: #9ca3af;
  text-align: center;
}

.machinery-picture-placeholder .placeholder-icon {
  width: 44px;
  height: 44px;
  margin-bottom: 8px;
  border-radius: 8px;
  border: 2px dashed #cbd5e1;
  background: rgba(255, 255, 255, 0.5);
}

.machinery-picture-placeholder p {
  margin: 0;
  font-size: 14px;
  color: #6b7280;
}

.filters {
  margin-bottom: 20px;
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.filter-select {
  padding: 10px 14px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 8px;
  font-size: 14px;
  min-width: 200px;
  background: #223427;
  color: #ecfbe2;
}

.bookings-table-container {
  background: #1f3024;
  border-radius: 12px;
  overflow: hidden;
  border: 1px solid rgba(255,255,255,0.07);
  box-shadow: 0 2px 8px rgba(0,0,0,0.22);
}

.bookings-table {
  width: 100%;
  border-collapse: collapse;
}

.bookings-table thead {
  background: #223427;
}

.bookings-table th {
  padding: 16px;
  text-align: left;
  font-weight: 600;
  color: #eaf9e0;
  border-bottom: 2px solid rgba(255,255,255,0.1);
}

.bookings-table td {
  padding: 16px;
  border-bottom: 1px solid rgba(255,255,255,0.08);
  color: rgba(236, 252, 231, 0.9);
}

.booking-machinery {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.booking-machinery small {
  color: rgba(220, 238, 211, 0.72);
  font-size: 12px;
}

.price-cell {
  font-weight: 600;
  color: #6ee7b7;
}

.badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.badge-primary { background: #dbeafe; color: #1e40af; }
.badge-warning { background: #fef3c7; color: #92400e; }
.badge-info { background: #e0e7ff; color: #3730a3; }
.badge-success { background: #d1fae5; color: #065f46; }
.badge-default { background: #e5e7eb; color: #374151; }

.status-badge {
  display: inline-block;
  padding: 4px 12px;
  border-radius: 20px;
  font-size: 12px;
  font-weight: 600;
}

.status-success { background: #d1fae5; color: #065f46; }
.status-warning { background: #fef3c7; color: #92400e; }
.status-info { background: #dbeafe; color: #1e40af; }
.status-danger { background: #fee2e2; color: #991b1b; }
.status-default { background: #f3f4f6; color: #6b7280; }

.action-buttons {
  display: flex;
  gap: 8px;
}

.btn-icon-small {
  padding: 6px 10px;
  border: none;
  background: #2a3d30;
  color: #ecfbe2;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-small:hover {
  background: #324a3b;
}

.btn-text-action {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 6px 10px;
}

.btn-icon-small.btn-edit:hover {
  background: rgba(59, 130, 246, 0.35);
}

.btn-icon-small.btn-danger:hover {
  background: rgba(248, 113, 113, 0.35);
}

.btn-primary {
  background: linear-gradient(135deg, #53b476 0%, #2f8f53 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-primary:hover {
  background: linear-gradient(135deg, #45a669 0%, #267947 100%);
}

.btn-secondary {
  background: #3f4f44;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

.btn-danger {
  background: #ef4444;
  color: white;
  border: none;
  padding: 10px 20px;
  border-radius: 8px;
  cursor: pointer;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(8, 12, 10, 0.62);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: linear-gradient(155deg, rgba(24, 34, 29, 0.96) 0%, rgba(22, 31, 27, 0.94) 45%, rgba(19, 28, 24, 0.96) 100%);
  border-radius: 16px;
  width: 90%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  border: 1px solid rgba(116, 150, 128, 0.35);
  box-shadow: 0 20px 60px rgba(6, 10, 8, 0.62);
}

.modal-large {
  max-width: 800px;
}

.modal-small {
  max-width: 400px;
}

.modal-header {
  padding: 24px;
  border-bottom: 1px solid rgba(152, 186, 164, 0.22);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 22px;
  color: #f2eee4;
}

.modal-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: #d7cfbf;
}

.modal-body {
  padding: 24px;
}

.form-group {
  margin-bottom: 20px;
}

/* Booking date calendar (FULL / capacity) */
.booking-date-calendar {
  margin-top: 6px;
  padding: 12px;
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 20, 14, 0.45);
}

.cal-loading {
  margin: 0 0 10px;
  font-size: 13px;
  color: #a8d8b8;
}

.cal-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 10px;
}

.cal-nav-title {
  font-weight: 800;
  font-size: 15px;
  color: #ecfdf5;
  flex: 1;
  text-align: center;
}

.cal-nav-btn {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(34, 197, 94, 0.15);
  color: #bbf7d0;
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
  transition: background 0.15s ease, opacity 0.15s ease;
}

.cal-nav-btn:hover:not(:disabled) {
  background: rgba(34, 197, 94, 0.28);
}

.cal-nav-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.cal-weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 4px;
  margin-bottom: 6px;
  text-align: center;
  font-size: 11px;
  font-weight: 700;
  color: #86b89a;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.cal-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.cal-cell {
  position: relative;
  min-height: 48px;
  padding: 4px 2px 6px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
  color: #ecfdf5;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-start;
  gap: 0;
  transition: border-color 0.15s ease, background 0.15s ease;
}

.cal-cell:hover:not(:disabled) {
  border-color: rgba(74, 222, 128, 0.45);
  background: rgba(74, 222, 128, 0.12);
}

.cal-day-num {
  font-weight: 800;
  font-size: 14px;
  line-height: 1.1;
}

.cal-full-label {
  font-size: 8px;
  font-weight: 900;
  letter-spacing: 0.06em;
  color: #fff;
  line-height: 1;
}

.cal-cell--outside {
  opacity: 0.25;
}

.cal-cell--disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.cal-cell--disabled:hover {
  border-color: rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.04);
}

.cal-cell--full {
  background: rgba(153, 27, 27, 0.55) !important;
  border-color: rgba(254, 202, 202, 0.55) !important;
  color: #fee2e2 !important;
  cursor: not-allowed;
}

.cal-cell--full:hover {
  background: rgba(153, 27, 27, 0.6) !important;
  border-color: rgba(254, 202, 202, 0.65) !important;
}

.cal-cell--selected:not(.cal-cell--disabled) {
  outline: 2px solid rgba(74, 222, 128, 0.85);
  outline-offset: 1px;
  background: rgba(74, 222, 128, 0.2);
}

.cal-selected-hint {
  margin: 12px 0 0;
  font-size: 13px;
  color: #b6e4c5;
}

.cal-selected-hint--muted {
  color: #89b099;
  font-style: italic;
}

.form-label {
  display: block;
  font-weight: 600;
  margin-bottom: 8px;
  color: #eaf9e0;
}

.form-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 8px;
  font-size: 14px;
  box-sizing: border-box;
  background: #223427;
  color: #ecfbe2;
}

.form-input.input-error {
  border-color: #ef4444;
  background-color: rgba(254, 242, 242, 0.95);
  color: #1e293b;
}

.form-input.input-readonly {
  background-color: #f3f4f6;
  cursor: not-allowed;
  color: #1e293b;
}

.form-hint {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: rgba(209, 250, 229, 0.65);
}

.error-message {
  display: block;
  margin-top: 4px;
  font-size: 12px;
  color: #fca5a5;
  font-weight: 600;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.machinery-info-box {
  background: #f0f9ff;
  border-left: 4px solid #3b82f6;
  padding: 16px;
  border-radius: 8px;
}

.machinery-info-box h4 {
  margin: 0 0 12px 0;
  color: #1e40af;
}

.machinery-info-box p {
  margin: 8px 0;
  color: #1e3a8a;
}

.price-summary {
  background: #223427;
  border-radius: 8px;
  padding: 16px;
  margin-top: 20px;
}

.summary-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.total-price {
  font-size: 24px;
  color: #6ee7b7;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
}

.booking-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.detail-section h3 {
  font-size: 18px;
  margin: 0 0 16px 0;
  color: #ecfbe2;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-weight: 600;
  color: rgba(220, 238, 211, 0.75);
  font-size: 14px;
}

.price-highlight {
  color: #6ee7b7;
  font-size: 20px;
}

.rejection-box {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
  padding: 16px;
  border-radius: 8px;
}

.rejection-box strong {
  color: #991b1b;
}

.rejection-box p {
  margin: 8px 0 0 0;
  color: #7f1d1d;
}

.notes-text {
  background: #223427;
  padding: 16px;
  border-radius: 8px;
  color: #ecfbe2;
  line-height: 1.6;
}

.payments-table-wrap {
  overflow-x: auto;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(15, 30, 22, 0.5);
}

.payments-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.88rem;
}

.payments-table th,
.payments-table td {
  padding: 10px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: #ecfbe2;
}

.payments-table th {
  background: #1a2b20;
  font-weight: 700;
  text-align: left;
}

.payments-table .text-right {
  text-align: right;
}

.empty-payments {
  padding: 1rem;
  color: rgba(220, 238, 211, 0.75);
  font-size: 0.92rem;
}

.booking-summary {
  background: #223427;
  padding: 16px;
  border-radius: 8px;
  margin: 16px 0;
}

.booking-summary p {
  margin: 8px 0;
  color: rgba(236, 252, 231, 0.92);
}

.loading-container,
.empty-state,
.loading-cell,
.empty-cell {
  text-align: center;
  padding: 40px;
  color: rgba(220, 238, 211, 0.78);
}

.empty-icon {
  width: 48px;
  height: 48px;
  margin: 0 auto 16px;
  border-radius: 12px;
  border: 2px dashed rgba(220, 238, 211, 0.35);
  background: rgba(255, 255, 255, 0.04);
}

.loading-spinner {
  border: 3px solid rgba(255, 255, 255, 0.15);
  border-top: 3px solid #86efac;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  animation: spin 1s linear infinite;
  margin: 0 auto 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

/* ===== LIGHT MODE — matches Loans / sidebar light theme ===== */
.page-container.machinery-booking-page.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
  border-radius: 18px;
}

.page-container.machinery-booking-page.light-theme .glass-header {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.page-container.machinery-booking-page.light-theme .page-title {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .page-subtitle {
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .stats-group-title {
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .payment-group {
  border-top-color: rgba(22, 101, 52, 0.18);
}

.page-container.machinery-booking-page.light-theme .glass-stat-card {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.page-container.machinery-booking-page.light-theme .glass-stat-card:hover {
  border-color: #4ade80 !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.12) !important;
}

.page-container.machinery-booking-page.light-theme .stat-label {
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .stat-value {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .stat-outstanding .stat-value {
  color: #b91c1c !important;
}

.page-container.machinery-booking-page.light-theme .outstanding-warning {
  background: linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%);
  border: 2px solid #fca5a5;
  border-left: 4px solid #ef4444;
}

.page-container.machinery-booking-page.light-theme .warning-content h3 {
  color: #991b1b;
}

.page-container.machinery-booking-page.light-theme .warning-content p {
  color: #7f1d1d;
}

.page-container.machinery-booking-page.light-theme .section-title {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .filter-select {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 1.5px solid #cbd5e1 !important;
}

.page-container.machinery-booking-page.light-theme .machinery-card {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.page-container.machinery-booking-page.light-theme .machinery-card:hover {
  box-shadow: 0 10px 24px rgba(22, 101, 52, 0.14) !important;
}

.page-container.machinery-booking-page.light-theme .machinery-title {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .machinery-description {
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .detail-label {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .detail-value {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .bookings-table-container {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.page-container.machinery-booking-page.light-theme .bookings-table thead {
  background: #ecfdf5 !important;
}

.page-container.machinery-booking-page.light-theme .bookings-table th {
  color: #052e16 !important;
  border-bottom-color: #86efac !important;
}

.page-container.machinery-booking-page.light-theme .bookings-table td {
  color: #052e16 !important;
  border-bottom-color: rgba(22, 101, 52, 0.12) !important;
}

.page-container.machinery-booking-page.light-theme .booking-machinery small {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .price-cell {
  color: #15803d !important;
}

.page-container.machinery-booking-page.light-theme .balance-unpaid {
  color: #dc2626 !important;
}

.page-container.machinery-booking-page.light-theme .btn-icon-small {
  background: #f0fdf4 !important;
  color: #166534 !important;
  border: 1.5px solid #86efac !important;
}

.page-container.machinery-booking-page.light-theme .btn-icon-small:hover {
  background: #dcfce7 !important;
}

.page-container.machinery-booking-page.light-theme .btn-secondary {
  background: #ffffff !important;
  color: #166534 !important;
  border: 2px solid #86efac !important;
}

.page-container.machinery-booking-page.light-theme .loading-container,
.page-container.machinery-booking-page.light-theme .empty-state,
.page-container.machinery-booking-page.light-theme .loading-cell,
.page-container.machinery-booking-page.light-theme .empty-cell {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .empty-icon {
  border-color: #86efac !important;
  background: #f0fdf4 !important;
}

.page-container.machinery-booking-page.light-theme .notification-highlight-row td {
  color: #991b1b !important;
}

/* Modals — light theme */
.page-container.machinery-booking-page.light-theme .modal-overlay.light-theme,
.modal-overlay.light-theme {
  background: rgba(15, 23, 42, 0.35);
}

.page-container.machinery-booking-page.light-theme .modal-content,
.modal-overlay.light-theme .modal-content {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 20px 48px rgba(22, 101, 52, 0.16) !important;
}

.page-container.machinery-booking-page.light-theme .modal-header,
.modal-overlay.light-theme .modal-header {
  border-bottom-color: rgba(22, 101, 52, 0.16) !important;
}

.page-container.machinery-booking-page.light-theme .modal-header h2,
.modal-overlay.light-theme .modal-header h2 {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .modal-close,
.modal-overlay.light-theme .modal-close {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .form-label,
.modal-overlay.light-theme .form-label {
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .form-input,
.modal-overlay.light-theme .form-input {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 1.5px solid #cbd5e1 !important;
}

.page-container.machinery-booking-page.light-theme .form-input:focus,
.modal-overlay.light-theme .form-input:focus {
  border-color: #22c55e !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15) !important;
}

.page-container.machinery-booking-page.light-theme .form-hint,
.modal-overlay.light-theme .form-hint {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .booking-date-calendar,
.modal-overlay.light-theme .booking-date-calendar {
  background: #f0fdf4 !important;
  border: 1.5px solid #86efac !important;
}

.page-container.machinery-booking-page.light-theme .cal-loading,
.modal-overlay.light-theme .cal-loading {
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .cal-nav-title,
.modal-overlay.light-theme .cal-nav-title {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .cal-nav-btn,
.modal-overlay.light-theme .cal-nav-btn {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .cal-nav-btn:hover:not(:disabled),
.modal-overlay.light-theme .cal-nav-btn:hover:not(:disabled) {
  background: #dcfce7 !important;
}

.page-container.machinery-booking-page.light-theme .cal-weekdays,
.modal-overlay.light-theme .cal-weekdays {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .cal-cell,
.modal-overlay.light-theme .cal-cell {
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .cal-cell:hover:not(:disabled),
.modal-overlay.light-theme .cal-cell:hover:not(:disabled) {
  border-color: #22c55e !important;
  background: #ecfdf5 !important;
}

.page-container.machinery-booking-page.light-theme .cal-selected-hint,
.modal-overlay.light-theme .cal-selected-hint {
  color: #166534 !important;
}

.page-container.machinery-booking-page.light-theme .cal-selected-hint--muted,
.modal-overlay.light-theme .cal-selected-hint--muted {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .price-summary,
.modal-overlay.light-theme .price-summary {
  background: #f0fdf4 !important;
  border: 1.5px solid #86efac !important;
}

.page-container.machinery-booking-page.light-theme .total-price,
.modal-overlay.light-theme .total-price {
  color: #15803d !important;
}

.page-container.machinery-booking-page.light-theme .detail-section h3,
.modal-overlay.light-theme .detail-section h3 {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .detail-item label,
.modal-overlay.light-theme .detail-item label {
  color: #64748b !important;
}

.page-container.machinery-booking-page.light-theme .detail-item p,
.page-container.machinery-booking-page.light-theme .detail-item span,
.modal-overlay.light-theme .detail-item p,
.modal-overlay.light-theme .detail-item span {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .price-highlight,
.modal-overlay.light-theme .price-highlight {
  color: #15803d !important;
}

.page-container.machinery-booking-page.light-theme .notes-text,
.modal-overlay.light-theme .notes-text {
  background: #f8fafc !important;
  color: #052e16 !important;
  border: 1.5px solid #cbd5e1 !important;
}

.page-container.machinery-booking-page.light-theme .booking-summary,
.modal-overlay.light-theme .booking-summary {
  background: #f0fdf4 !important;
  border: 1.5px solid #86efac !important;
}

.page-container.machinery-booking-page.light-theme .booking-summary p,
.modal-overlay.light-theme .booking-summary p {
  color: #052e16 !important;
}

.page-container.machinery-booking-page.light-theme .payments-table-wrap,
.modal-overlay.light-theme .payments-table-wrap {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
}

.page-container.machinery-booking-page.light-theme .payments-table th,
.modal-overlay.light-theme .payments-table th {
  background: #ecfdf5 !important;
  color: #052e16 !important;
  border-bottom-color: #86efac !important;
}

.page-container.machinery-booking-page.light-theme .payments-table td,
.modal-overlay.light-theme .payments-table td {
  color: #052e16 !important;
  border-bottom-color: rgba(22, 101, 52, 0.12) !important;
}

.page-container.machinery-booking-page.light-theme .empty-payments,
.modal-overlay.light-theme .empty-payments {
  color: #64748b !important;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .glass-header {
    padding: 20px 16px;
    gap: 12px;
  }

  .page-title {
    font-size: 26px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .stat-value {
    font-size: 28px;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }
}

.alert {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 300px;
  box-shadow: 0 4px 12px rgba(0,0,0,0.35);
  z-index: 2000;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border-left: 4px solid #ef4444;
}

.alert-success {
  background: #d1fae5;
  color: #065f46;
  border-left: 4px solid #10b981;
}

.alert-close {
  background: none;
  border: none;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.7;
}

.alert-close:hover {
  opacity: 1;
}
</style>
