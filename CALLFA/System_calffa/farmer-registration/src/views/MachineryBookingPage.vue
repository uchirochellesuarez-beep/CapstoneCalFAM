<template>
  <div class="page-container machinery-booking-page machinery-ui machinery-booking-ui glass-module-page" :class="{ 'light-theme': isLight }">
    <!-- Page Header (Management-aligned split) -->
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.machineryBooking') }}</h1>
        <p class="page-subtitle">{{ $t('ui.machineryBookingSub') }}</p>
      </div>
    </div>

    <!-- My Bookings Stats -->
    <div class="stats-group">
      <div class="stats-group-title">{{ $t('ui.bookingOverview') }}</div>
      <div class="stats-grid booking-stats">
        <div class="stat-card glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.allBookings') }}</div>
            <div class="stat-value">{{ myBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-pending glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.pending') }}</div>
            <div class="stat-value">{{ pendingBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-success glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.approved') }}</div>
            <div class="stat-value">{{ approvedBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-assigned glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.assignedToOperator') }}</div>
            <div class="stat-value">{{ assignedToOperatorCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-expired glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.expired') }}</div>
            <div class="stat-value">{{ expiredBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-info glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.completed') }}</div>
            <div class="stat-value">{{ completedBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-danger glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.rejected') }}</div>
            <div class="stat-value">{{ rejectedBookingsCount }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Payment Status Stats -->
    <div class="stats-group payment-group">
      <div class="stats-group-title">{{ $t('ui.paymentOverview') }}</div>
      <div class="stats-grid payment-stats">
        <div class="stat-card stat-danger glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.unpaid') }}</div>
            <div class="stat-value">{{ unpaidBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-warning glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.partial') }}</div>
            <div class="stat-value">{{ partialBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-paid glass-stat-card">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.fullyPaid') }}</div>
            <div class="stat-value">{{ paidBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card glass-stat-card stat-outstanding" :class="outstandingBalance > 0 ? 'stat-danger' : 'stat-paid'">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.outstandingBalance') }}</div>
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
        <p>{{ $t('ui.outstandingBalanceOf') }} <strong>₱{{ formatNumber(outstandingBalance) }}</strong> from previous completed bookings.</p>
        <p>{{ $t('ui.pleaseSettleBalance') }}</p>
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
      <h2 class="section-title">{{ $t('ui.availableMachinery') }}</h2>

      <div class="tools-card">
        <div class="tools-card-top">
          <div class="search-bar">
            <span class="search-icon-wrap" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-svg">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
              </svg>
            </span>
            <input
              v-model="machinerySearch"
              type="text"
              class="toolbar-input search-input-main"
              :placeholder="$t('ui.searchNameType')"
            />
          </div>
        </div>
        <div class="filter-group filter-group-1">
          <select v-model="machineryTypeFilter" @change="applyMachineryFilter" class="toolbar-select">
            <option value="">{{ $t('ui.allMachineryTypes') }}</option>
            <option v-for="type in distinctMachineryTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>
      </div>

      <div class="machinery-grid">
        <div v-if="loading && availableMachinery.length === 0" class="loading-container">
          <div class="loading-spinner"></div>
          <p>{{ $t('ui.loadingAvailableMachinery') }}</p>
        </div>
        <div v-else-if="availableMachinery.length === 0" class="empty-state">
          <div class="empty-icon" aria-hidden="true"></div>
          <p>{{ $t('ui.noMachineryAvailable') }}</p>
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
              <p>{{ $t('ui.noImage') }}</p>
            </div>
          </div>
          
          <p class="machinery-description">{{ machine.description || 'No description available' }}</p>
          <div class="machinery-details">
            <div class="detail-row">
              <span class="detail-label">{{ $t('ui.barangayColonLabel') }}</span>
              <span class="detail-value">{{ machine.barangay_name || '—' }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ $t('ui.memberColon') }}</span>
              <span class="detail-value">₱{{ formatNumber(machine.member_price || machine.price_per_unit) }} {{ machine.unit_type }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">{{ $t('ui.nonMemberColon') }}</span>
              <span class="detail-value">₱{{ formatNumber(machine.non_member_price || ((machine.price_per_unit || 0) * 1.25)) }} {{ machine.unit_type }}</span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Your Rate:</span>
              <span class="detail-value" :class="{ 'non-member-rate': usesNonMemberRate(machine) }">
                ₱{{ formatNumber(getEffectivePricePerUnit(machine)) }} {{ machine.unit_type }}
                <small class="rate-hint">{{ usesNonMemberRate(machine) ? '(non-member)' : '(member)' }}</small>
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Max Capacity:</span>
              <span class="detail-value">
                {{ machine.max_capacity ? `${machine.max_capacity} ${machine.capacity_unit || ''}/day` : 'N/A' }}
              </span>
            </div>
            <div class="detail-row">
              <span class="detail-label">Status:</span>
              <span class="status-badge status-success">{{ machine.status }}</span>
            </div>
            <div class="detail-row" v-if="isMachineDownPaymentOn(machine)">
              <span class="detail-label">{{ $t('ui.machineryDownPaymentModule') }}</span>
              <span class="detail-value dp-on-badge">{{ $t('ui.machineryDownPaymentEnabledBadge', { percent: machineDownPaymentPercent(machine) }) }}</span>
            </div>
            <div class="detail-row" v-if="machine.requires_machinery_name">
              <span class="detail-label">{{ $t('ui.requires') }}</span>
              <span class="detail-value">{{ machine.requires_machinery_name }}</span>
            </div>
            <p
              v-if="isMachinePrerequisiteLocked(machine)"
              class="prerequisite-lock-hint"
            >
              {{ $t('ui.prerequisiteLockedHint', { name: machine.requires_machinery_name }) }}
            </p>
          </div>
          <button 
            @click="bookMachinery(machine)" 
            class="btn-book" 
            :disabled="isBookButtonDisabled(machine)"
            :title="bookButtonTitle(machine)"
          >
            {{ bookButtonLabel(machine) }}
          </button>
        </div>
      </div>
    </div>

    <!-- My Bookings -->
    <div class="section bookings-section">
      <h2 class="section-title">{{ $t('ui.myBookings') }}</h2>

      <div class="tools-card bookings-tools-card">
        <div class="filter-group filter-group-2">
          <select v-model="bookingFilter" @change="applyFilter" class="toolbar-select">
            <option value="">{{ $t('ui.allBookings') }}</option>
            <option value="Pending">{{ $t('common.pending') }}</option>
            <template v-if="showDownPaymentStatusFilters">
              <option value="Awaiting Down Payment">{{ $t('ui.statusAwaitingDownPayment') }}</option>
              <option value="Awaiting Payment Verification">{{ $t('ui.statusAwaitingPaymentVerification') }}</option>
              <option value="Payment Rejected">{{ $t('header.notif.paymentRejectedPlain') }}</option>
              <option value="Down Payment Verified">{{ $t('header.notif.downPaymentVerifiedPlain') }}</option>
              <option value="Booking Confirmed">{{ $t('header.notif.bookingConfirmedPlain') }}</option>
              <option value="Awaiting Final Payment">{{ $t('ui.statusAwaitingFinalPayment') }}</option>
            </template>
            <option value="Approved">{{ $t('common.approved') }}</option>
            <option value="Assigned to Operator">{{ $t('common.assignedToOperator') }}</option>
            <option value="Expired">{{ $t('common.expired') }}</option>
            <option value="Completed">{{ $t('common.completed') }}</option>
            <option value="Rejected">{{ $t('common.rejected') }}</option>
          </select>
          <select v-model="paymentFilter" @change="applyFilter" class="toolbar-select">
            <option value="">{{ $t('ui.allPaymentStatus') }}</option>
            <option value="Unpaid">{{ $t('ui.unpaid') }}</option>
            <option value="Partial">{{ $t('ui.partial') }}</option>
            <option value="Paid">{{ $t('ui.paid') }}</option>
          </select>
        </div>
      </div>

      <div class="bookings-table-container bookings-table-wrap">
        <table class="bookings-table bookings-desktop-table">
          <thead>
            <tr>
              <th>{{ $t('ui.machinery') }}</th>
              <th>{{ $t('ui.bookingDate') }}</th>
              <th>{{ $t('ui.location') }}</th>
              <th>{{ $t('ui.areaQuantity') }}</th>
              <th>{{ $t('ui.totalPrice') }}</th>
              <th>{{ $t('ui.paid') }}</th>
              <th>{{ $t('ui.balance') }}</th>
              <th>{{ $t('ui.status') }}</th>
              <th>{{ $t('ui.payment') }}</th>
              <th>{{ $t('ui.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td :colspan="bookingTableColspan" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>{{ $t('ui.loadingBookings') }}</span>
              </td>
            </tr>
            <tr v-else-if="filteredBookings.length === 0">
              <td :colspan="bookingTableColspan" class="empty-cell">
                {{ $t('ui.bookToStart') }}
              </td>
            </tr>
            <tr v-else v-for="booking in filteredBookings" :key="booking.id" :data-booking-id="booking.id" :class="{ 'notification-highlight-row': highlightedBookingId == booking.id }">
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
                  <button type="button" @click="viewBookingDetails(booking)" class="btn-icon-small btn-text-action" :title="$t('common.view')">
                    View
                  </button>
                  <button
                    v-if="booking.status === 'Pending' && booking.farmer_id === authStore.currentUser?.id"
                    type="button"
                    @click="editBookingConfirm(booking)"
                    class="btn-icon-small btn-edit btn-text-action"
                    :title="$t('common.edit')"
                  >
                    {{ $t('common.edit') }}
                  </button>
                  <button
                    v-if="booking.status === 'Pending'"
                    type="button"
                    @click="cancelBookingConfirm(booking)"
                    class="btn-icon-small btn-danger btn-text-action"
                    :title="$t('common.cancel')"
                  >
                    {{ $t('common.cancel') }}
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="inv2-mobile-list bookings-mobile-list">
          <div v-if="loading" class="inv2-empty">
            <div class="loading-spinner"></div>
            <div>{{ $t('ui.loadingBookings') }}</div>
          </div>
          <div v-else-if="filteredBookings.length === 0" class="inv2-empty">
            <div>{{ $t('ui.bookToStart') }}</div>
          </div>
          <article
            v-else
            v-for="booking in filteredBookings"
            :key="'bml-' + booking.id"
            class="inv2-mobile-card"
            :data-booking-id="booking.id"
            :class="{ 'notification-highlight-row': highlightedBookingId == booking.id }"
          >
            <div class="inv2-mobile-card-top">
              <h4 class="inv2-mobile-card-name">{{ booking.machinery_name }}</h4>
              <span class="status-badge" :class="'status-' + getBookingStatusClass(booking.status)">
                {{ booking.status }}
              </span>
            </div>
            <div class="inv2-mobile-card-meta">
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.type') }}</span>
                <span>{{ booking.machinery_type || '—' }}</span>
              </div>
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.date') }}</span>
                <span>{{ formatDate(booking.booking_date) }}</span>
              </div>
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.location') }}</span>
                <span>{{ booking.service_location }}</span>
              </div>
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">Area/Qty</span>
                <span>{{ booking.area_size }} {{ booking.area_unit }}</span>
              </div>
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.total') }}</span>
                <span>₱{{ formatNumber(booking.total_price) }}</span>
              </div>
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.paid') }}</span>
                <span>₱{{ formatNumber(booking.total_paid || 0) }}</span>
              </div>
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.balance') }}</span>
                <span :class="{ 'balance-unpaid': (booking.total_price - (booking.total_paid || 0)) > 0 }">
                  ₱{{ formatNumber(booking.total_price - (booking.total_paid || 0)) }}
                </span>
              </div>
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.payment') }}</span>
                <span class="payment-badge" :class="'payment-' + getPaymentStatusClass(booking.payment_status)">
                  {{ booking.payment_status || 'Unpaid' }}
                </span>
              </div>
            </div>
            <div class="inv2-mobile-card-actions action-buttons">
              <button type="button" class="machinery-action-text machinery-action-view-text" @click="viewBookingDetails(booking)">
                {{ $t('common.view') }}
              </button>
              <button
                v-if="booking.status === 'Pending' && booking.farmer_id === authStore.currentUser?.id"
                type="button"
                class="machinery-action-text machinery-action-edit-text"
                @click="editBookingConfirm(booking)"
              >
                {{ $t('common.edit') }}
              </button>
              <button
                v-if="booking.status === 'Pending'"
                type="button"
                class="machinery-action-text machinery-action-delete-text"
                @click="cancelBookingConfirm(booking)"
              >
                {{ $t('common.cancel') }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Booking Modal -->
    <Teleport to="body">
    <div
      v-if="showBookingModal"
      class="modal-overlay app-modal-overlay machinery-booking-modal machinery-ui"
      :class="{ 'light-theme': isLight }"
      @click.self="closeModals"
    >
      <div class="modal-content booking-form-modal" role="dialog" aria-modal="true" @click.stop>
        <div class="modal-header">
          <h2>{{ $t('ui.bookMachinery') }}</h2>
          <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
        </div>
        <div class="modal-body">
          <form
            class="booking-form-compact"
            :class="{ 'is-machinery-ready': !!selectedMachineryForBooking }"
            @submit.prevent="submitBooking"
          >
            <div v-if="canCreateOnBehalf" class="form-group farmer-combobox">
              <label class="form-label">{{ $t('ui.chooseFarmerLabel') }} *</label>
              <div class="farmer-combobox-wrap">
                <input
                  type="text"
                  class="form-input"
                  v-model="farmerSearchQuery"
                  :placeholder="$t('ui.searchFarmerLabel')"
                  autocomplete="off"
                  role="combobox"
                  aria-autocomplete="list"
                  :aria-expanded="showFarmerPicker ? 'true' : 'false'"
                  @focus="openFarmerPicker"
                  @input="onFarmerSearchInput"
                  @keydown="onFarmerSearchKeydown"
                  @blur="closeFarmerPickerSoon"
                />
                <ul v-if="showFarmerPicker" class="farmer-combobox-list" role="listbox">
                  <li
                    v-for="(farmer, index) in filteredBookableFarmers"
                    :key="farmer.id"
                    class="farmer-combobox-option"
                    :class="{
                      active: index === farmerPickerIndex,
                      selected: bookingForm.farmer_id == farmer.id
                    }"
                    role="option"
                    @mousedown.prevent="selectFarmerForBooking(farmer)"
                  >
                    <strong>{{ farmer.full_name }}</strong>
                    <small>{{ farmer.reference_number || farmer.role }}</small>
                  </li>
                  <li v-if="filteredBookableFarmers.length === 0" class="farmer-combobox-empty">
                    {{ $t('ui.noMatchingFarmers') }}
                  </li>
                </ul>
              </div>
              <small class="form-hint">{{ $t('ui.chooseFarmerBookingHint') }}</small>
            </div>

            <div class="form-group booking-machine-group">
              <label class="form-label">Select Machinery *</label>
              <select v-model="bookingForm.machinery_id" @change="onMachinerySelect" class="form-input" required>
                <option value="">{{ $t('ui.chooseMachinery') }}</option>
                <option v-for="machine in machineryOptions" :key="machine.id" :value="machine.id">
                  {{ machine.machinery_name }} ({{ machine.machinery_type }}) - ₱{{ formatNumber(getEffectivePricePerUnit(machine)) }} {{ machine.unit_type }}
                </option>
              </select>
            </div>

            <div class="form-group booking-machine-summary" v-if="selectedMachineryForBooking">
              <div class="machinery-info-box">
                <h4>{{ selectedMachineryForBooking.machinery_type }} Details</h4>
                <p>
                  <strong>Price:</strong>
                  ₱{{ formatNumber(getEffectivePricePerUnit(selectedMachineryForBooking)) }} {{ selectedMachineryForBooking.unit_type }}
                  <span v-if="isNonMember" style="opacity: 0.8;">{{ $t('ui.nonMemberRateParen') }}</span>
                </p>
                <p v-if="selectedMachineryForBooking.max_capacity">
                  <strong>Max Capacity:</strong> {{ selectedMachineryForBooking.max_capacity }} {{ selectedMachineryForBooking.capacity_unit }} per day
                </p>
              </div>
            </div>

            <div class="form-group booking-date-group" v-if="selectedMachineryForBooking">
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
                    <span v-if="c.isFull" class="cal-full-label">{{ $t('common.full') }}</span>
                  </button>
                </div>
                <p v-if="bookingForm.booking_date" class="cal-selected-hint">
                  {{ $t('ui.selectedColon') }} <strong>{{ formatDate(bookingForm.booking_date) }}</strong>
                </p>
                <p
                  v-if="bookingForm.booking_date && selectedMachineryForBooking?.max_capacity"
                  class="cal-availability-hint"
                  :class="{ 'cal-availability-hint--low': selectedDateRemainingCapacity != null && selectedDateRemainingCapacity <= 0 }"
                >
                  <strong>Available:</strong>
                  {{ formatCapacityAmount(selectedDateRemainingCapacity) }}
                  {{ selectedMachineryForBooking.capacity_unit || 'hectares' }}
                  <span class="cal-availability-meta">
                    (max {{ selectedMachineryForBooking.max_capacity }} − booked {{ formatCapacityAmount(selectedDateBookedCapacity) }})
                  </span>
                </p>
                <p v-if="!bookingForm.booking_date" class="cal-selected-hint cal-selected-hint--muted">{{ $t('ui.pickCalendarDate') }}</p>
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

            <div class="form-group booking-location-group">
              <label class="form-label">Service Location *</label>
              <p v-if="barangayPlacesLoading" class="form-hint">{{ $t('ui.loadingLocations') }}</p>
              <template v-else-if="bookingUsesPlaceDropdown">
                <select
                  v-model="bookingForm.barangay_place_id"
                  class="form-input"
                  required
                >
                  <option value="">{{ $t('ui.pickPlaceInBarangay') }}</option>
                  <option
                    v-for="p in barangayServicePlaces"
                    :key="p.id"
                    :value="String(p.id)"
                  >
                    {{ p.name }}{{ p.description ? ' — ' + p.description : '' }}
                  </option>
                </select>
                <small class="form-hint">{{ $t('ui.basedOnBarangay') }}</small>
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

            <div class="form-row booking-capacity-row">
              <div class="form-group">
                <label class="form-label">{{ getAreaLabel() }} *</label>
                <TypedNumberInput
                  v-model="bookingForm.area_size"
                  :min="0.01"
                  :input-class="capacityError ? 'form-input input-error' : 'form-input'"
                  placeholder="0.00"
                  @input="validateAndCalculate"
                />
                <small v-if="selectedMachineryForBooking?.max_capacity" class="form-hint">
                  <template v-if="bookingForm.booking_date">
                    Available for {{ formatDate(bookingForm.booking_date) }}:
                    <strong>{{ formatCapacityAmount(selectedDateRemainingCapacity) }} {{ selectedMachineryForBooking.capacity_unit }}</strong>
                  </template>
                  <template v-else>
                    Maximum: {{ selectedMachineryForBooking.max_capacity }} {{ selectedMachineryForBooking.capacity_unit }} per day
                  </template>
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

            <div class="form-group booking-notes-group">
              <label class="form-label">{{ $t('ui.additionalNotes') }}</label>
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
              <div v-if="selectedMachineDownPaymentOn" class="summary-row dp-preview-row">
                <span>{{ $t('ui.machineryDownPaymentRequiredForBarangay', { percent: selectedMachineDownPaymentPercent }) }}</span>
                <strong>₱{{ formatNumber(selectedMachineDownPaymentAmount) }}</strong>
              </div>
              <div v-if="selectedMachineDownPaymentOn" class="summary-row">
                <span>{{ $t('ui.remainingAfterDown') }}</span>
                <strong>₱{{ formatNumber(calculatedPrice - selectedMachineDownPaymentAmount) }}</strong>
              </div>
            </div>

            <div class="modal-actions">
              <button type="submit" class="btn-primary" :disabled="loading">
                {{ loading ? 'Booking...' : (canCreateOnBehalf ? 'Create Approved Booking' : 'Confirm Booking') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- View Booking Details Modal -->
    <Teleport to="body">
    <div
      v-if="showViewBookingModal && selectedBooking"
      class="modal-overlay app-modal-overlay machinery-booking-modal machinery-ui"
      :class="{ 'light-theme': isLight }"
      @click.self="closeModals"
    >
      <div class="modal-content modal-large tx-detail-modal" role="dialog" aria-modal="true" @click.stop>
        <div class="modal-header">
          <h2>{{ $t('ui.bookingDetails') }}</h2>
          <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
        </div>
        <div class="modal-body">
          <div class="booking-details tx-detail-sections">
            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">{{ $t('ui.machineryServiceDetails') }}</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item" v-if="selectedBooking.farmer_name">
                  <label>{{ $t('ui.farmer') }}</label>
                  <span>{{ selectedBooking.farmer_name }} ({{ selectedBooking.reference_number || '—' }})</span>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.machinery') }}</label>
                  <span>{{ selectedBooking.machinery_name }}</span>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.type') }}</label>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(selectedBooking.machinery_type)">
                    {{ selectedBooking.machinery_type }}
                  </span>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Price Rate</label>
                  <span>₱{{ formatNumber(selectedBooking.price_per_unit) }} {{ selectedBooking.unit_type }}</span>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.bookingDate') }}</label>
                  <span>{{ formatDate(selectedBooking.booking_date) }}</span>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Service Location</label>
                  <span>{{ selectedBooking.service_location }}</span>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.areaQuantity') }}</label>
                  <span>{{ selectedBooking.area_size }} {{ selectedBooking.area_unit }}</span>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.totalPrice') }}</label>
                  <strong class="price-highlight">₱{{ formatNumber(selectedBooking.total_price) }}</strong>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.status') }}</label>
                  <span class="status-badge" :class="'status-' + getBookingStatusClass(selectedBooking.status)">
                    {{ selectedBooking.status }}
                  </span>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedBooking.created_at">
                  <label>{{ $t('ui.created') }}</label>
                  <span>{{ formatDateTime(selectedBooking.created_at) }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="showLegacyDownPaymentSection">
              <h3 class="tx-detail-section-title">{{ $t('ui.paymentInformation') }}</h3>
              <div class="down-payment-box">
                <div class="dp-row"><span>{{ $t('ui.totalRental') }}</span><strong>₱{{ formatNumber(selectedBooking.total_price) }}</strong></div>
                <div class="dp-row" v-if="bookingDownPercent">
                  <span>{{ $t('ui.downPaymentDue') }} ({{ bookingDownPercent }}%)</span>
                  <strong>₱{{ formatNumber(bookingDownAmount) }}</strong>
                </div>
                <div class="dp-row"><span>{{ $t('ui.paid') }}</span><strong>₱{{ formatNumber(selectedBooking.total_paid || 0) }}</strong></div>
                <div class="dp-row"><span>{{ $t('ui.balance') }}</span><strong>₱{{ formatNumber(selectedBooking.remaining_balance || selectedBooking.total_price) }}</strong></div>
              </div>
              <p
                v-if="['Awaiting Down Payment', 'Payment Rejected'].includes(selectedBooking.status)"
                class="dp-hint"
              >
                {{ $t('ui.awaitingDownPaymentHint', { percent: bookingDownPercent || '—', amount: '₱' + formatNumber(bookingDownAmount) }) }}
              </p>
              <p v-else-if="selectedBooking.status === 'Awaiting Payment Verification'" class="dp-hint">
                {{ $t('ui.awaitingVerificationHint') }}
              </p>
              <p v-else-if="selectedBooking.status === 'Down Payment Verified'" class="dp-hint">
                {{ $t('ui.downPaymentVerifiedHint') }}
              </p>
              <p v-if="selectedBooking.status === 'Payment Rejected' && selectedBooking.down_payment_rejection_reason" class="dp-hint dp-hint-error">
                {{ selectedBooking.down_payment_rejection_reason }}
              </p>

              <GcashQrPayPanel
                v-if="showBookingGcashPanel"
                :key="'gcash-pay-' + gcashPanelKey"
                transaction-type="machinery"
                :reference-id="selectedBooking.id"
                :enabled="canPayBookingGcash"
                @preview-proof="openProofPreview"
                @submitted="onGcashProofSubmitted"
                @error="onGcashPayError"
              />

              <div v-if="showDownPaymentSubmittedInfo" class="down-payment-status">
                <div v-if="selectedBooking.down_payment_method" class="dp-row">
                  <span>{{ $t('ui.paymentMethod') }}</span><strong>{{ selectedBooking.down_payment_method }}</strong>
                </div>
                <div v-if="selectedBooking.down_payment_reference" class="dp-row">
                  <span>Reference No.</span><strong>{{ selectedBooking.down_payment_reference }}</strong>
                </div>
                <div v-if="selectedBooking.receipt_number && isOfficialReceipt(selectedBooking.receipt_number)" class="dp-row dp-row-action">
                  <span>{{ $t('ui.officialReceipt') }}</span>
                  <button type="button" class="btn-secondary btn-sm receipt-view-btn" @click="viewBookingReceipt(selectedBooking.receipt_number)">
                    {{ $t('common.viewReceipt') }}
                  </button>
                </div>
                <div v-if="selectedBooking.down_payment_proof" class="dp-row dp-row-action">
                  <span>{{ $t('ui.proof') }}</span>
                  <button type="button" class="btn-text-action" @click="openProofPreview(paymentProofUrl(selectedBooking.down_payment_proof))">
                    View Proof
                  </button>
                </div>
              </div>
            </div>

            <div
              class="detail-section tx-detail-section"
              v-else-if="selectedBooking && !['Cancelled', 'Rejected'].includes(selectedBooking.status)"
            >
              <h3 class="tx-detail-section-title">{{ $t('ui.paymentInformation') }}</h3>
              <div class="down-payment-box">
                <div class="dp-row"><span>{{ $t('ui.totalRental') }}</span><strong>₱{{ formatNumber(selectedBooking.total_price) }}</strong></div>
                <div class="dp-row"><span>{{ $t('ui.paid') }}</span><strong>₱{{ formatNumber(selectedBooking.total_paid || 0) }}</strong></div>
                <div class="dp-row"><span>{{ $t('ui.balance') }}</span><strong>₱{{ formatNumber(selectedBooking.remaining_balance || selectedBooking.total_price) }}</strong></div>
              </div>
              <p
                v-if="(parseFloat(selectedBooking.remaining_balance) || parseFloat(selectedBooking.total_price) || 0) > 0"
                class="dp-hint"
              >
                {{ $t('ui.payAfterServiceHint') }}
              </p>
              <GcashQrPayPanel
                v-if="showBookingGcashPanel"
                :key="'gcash-pay-' + gcashPanelKey"
                transaction-type="machinery"
                :reference-id="selectedBooking.id"
                :enabled="canPayBookingGcash"
                @preview-proof="openProofPreview"
                @submitted="onGcashProofSubmitted"
                @error="onGcashPayError"
              />
            </div>


            <div
              class="detail-section tx-detail-section"
              v-if="selectedBooking && (selectedBooking.refund || showRefundRequestForm)"
            >
              <h3 class="tx-detail-section-title">{{ $t('ui.downPaymentRefund') }}</h3>
              <div v-if="selectedBooking.refund" class="down-payment-box">
                <div class="dp-row">
                  <span>{{ $t('ui.refundNumber') }}</span>
                  <strong>{{ selectedBooking.refund.refund_number || '—' }}</strong>
                </div>
                <div class="dp-row">
                  <span>{{ $t('ui.refundAmount') }}</span>
                  <strong>₱{{ formatNumber(selectedBooking.refund.refund_amount) }}</strong>
                </div>
                <div class="dp-row">
                  <span>{{ $t('ui.status') }}</span>
                  <strong>{{ selectedBooking.refund.refund_status }}</strong>
                </div>
                <div v-if="selectedBooking.refund.refund_reason" class="dp-row">
                  <span>{{ $t('ui.reason') }}</span>
                  <span>{{ selectedBooking.refund.refund_reason }}</span>
                </div>
                <div v-if="selectedBooking.refund.rejection_reason" class="rejection-box">
                  <strong>{{ $t('ui.reviewNote') }}</strong> {{ selectedBooking.refund.rejection_reason }}
                </div>
                <div v-if="refundReceiptNumber" class="dp-row dp-row-action">
                  <span>{{ $t('ui.refundReceipt') }}</span>
                  <button type="button" class="btn-text-action" @click="viewBookingReceipt(refundReceiptNumber)">
                    {{ $t('common.viewReceipt') }} ({{ refundReceiptNumber }})
                  </button>
                </div>
              </div>
              <div v-if="showRefundRequestForm" class="down-payment-form">
                <p class="dp-hint">{{ refundReviewHint }}</p>
                <div class="form-group">
                  <label>{{ $t('ui.reasonForRefund') }} *</label>
                  <textarea
                    v-model="refundReason"
                    class="form-input"
                    rows="3"
                    :placeholder="$t('ui.refundReasonPlaceholder')"
                  ></textarea>
                </div>
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="submittingRefund || !refundReason.trim()"
                  @click="submitRefundRequest"
                >
                  {{ submittingRefund ? $t('ui.submitting') : $t('ui.submitRefundRequest') }}
                </button>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="selectedBooking.approved_by_name">
              <h3 class="tx-detail-section-title">Approval Information</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.approvedBy') }}</label>
                  <span>{{ selectedBooking.approved_by_name }}</span>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedBooking.approved_date">
                  <label>Approved Date</label>
                  <span>{{ formatDateTime(selectedBooking.approved_date) }}</span>
                </div>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="selectedBooking.rejection_reason">
              <h3 class="tx-detail-section-title">{{ $t('ui.rejectionInfo') }}</h3>
              <div class="rejection-box">
                <strong>{{ $t('ui.reasonColon') }}</strong>
                <p>{{ selectedBooking.rejection_reason }}</p>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="selectedBooking.notes">
              <h3 class="tx-detail-section-title">{{ $t('ui.additionalNotes') }}</h3>
              <p class="notes-text">{{ selectedBooking.notes }}</p>
            </div>

            <div class="detail-section tx-detail-section" v-if="balanceSubmissions.length > 0">
              <h3 class="tx-detail-section-title">Balance Payment Submissions</h3>
              <div class="payments-table-wrap">
                <table class="payments-table">
                  <thead>
                    <tr>
                      <th>{{ $t('ui.date') }}</th>
                      <th class="text-right">{{ $t('ui.amount') }}</th>
                      <th>{{ $t('ui.method') }}</th>
                      <th>{{ $t('ui.status') }}</th>
                      <th>{{ $t('ui.receipt') }}</th>
                      <th>{{ $t('ui.proof') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="sub in balanceSubmissions" :key="'bs-' + sub.id">
                      <td>{{ formatDate(sub.submitted_at || sub.created_at) }}</td>
                      <td class="text-right">₱{{ formatNumber(sub.amount) }}</td>
                      <td>{{ sub.payment_method || '—' }}</td>
                      <td>{{ sub.status }}</td>
                      <td>
                        <button
                          v-if="sub.receipt_number && isOfficialReceipt(sub.receipt_number)"
                          type="button"
                          class="btn-secondary btn-sm receipt-view-btn"
                          @click="viewBookingReceipt(sub.receipt_number)"
                        >
                          {{ $t('common.viewReceipt') }}
                        </button>
                        <span v-else>—</span>
                      </td>
                      <td>
                        <button
                          v-if="sub.proof_path"
                          type="button"
                          class="btn-text-action"
                          @click="openProofPreview(paymentProofUrl(sub.proof_path))"
                        >
                          View Proof
                        </button>
                        <span v-else>—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="showPaymentHistorySection" data-payment-history>
              <h3 class="tx-detail-section-title">Payment History &amp; Receipts</h3>
              <div v-if="paymentHistoryLoading" class="empty-payments">Loading payment records...</div>
              <div v-else-if="paymentHistory.length === 0" class="empty-payments">
                No payment records yet.
              </div>
              <div v-else class="payments-table-wrap tx-history-desktop">
                <table class="payments-table">
                  <thead>
                    <tr>
                      <th>{{ $t('ui.date') }}</th>
                      <th>{{ $t('ui.type') }}</th>
                      <th class="text-right">{{ $t('ui.amount') }}</th>
                      <th>{{ $t('ui.receiptNo') }}</th>
                      <th>{{ $t('ui.recordedBy') }}</th>
                      <th>{{ $t('ui.remarks') }}</th>
                      <th>{{ $t('ui.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr
                      v-for="payment in paymentHistory"
                      :key="historyRowKey(payment)"
                      :data-history-key="historyRowKey(payment)"
                      :class="{ 'notification-highlight-row': highlightedHistoryKey === historyRowKey(payment) }"
                    >
                      <td>{{ formatDate(payment.payment_date) }}</td>
                      <td>{{ formatPaymentType(payment.payment_type) }}</td>
                      <td class="text-right">{{ formatHistoryAmount(payment) }}</td>
                      <td>{{ payment.receipt_number || '—' }}</td>
                      <td>{{ payment.recorded_by_name || '—' }}</td>
                      <td>{{ payment.remarks || '—' }}</td>
                      <td>
                        <button
                          v-if="payment.receipt_number && isOfficialReceipt(payment.receipt_number)"
                          type="button"
                          class="btn-secondary btn-sm receipt-view-btn"
                          @click="viewBookingReceipt(payment.receipt_number)"
                        >
                          {{ $t('common.viewReceipt') }}
                        </button>
                        <button
                          v-else-if="payment.proof_path"
                          type="button"
                          class="btn-text-action"
                          @click="openProofPreview(paymentProofUrl(payment.proof_path))"
                        >
                          View Proof
                        </button>
                        <span v-else>—</span>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="tx-history-mobile">
                <article
                  v-for="payment in paymentHistory"
                  :key="'m-' + historyRowKey(payment)"
                  :data-history-key="historyRowKey(payment)"
                  class="tx-history-card"
                  :class="{
                    'notification-highlight-row': highlightedHistoryKey === historyRowKey(payment),
                    'tx-history-card--rejected': payment.payment_type === 'gcash_rejected'
                  }"
                >
                  <div class="tx-history-card-top">
                    <h4 class="tx-history-card-title">{{ formatPaymentType(payment.payment_type) }}</h4>
                    <span class="tx-history-card-amount">{{ formatHistoryAmount(payment) }}</span>
                  </div>
                  <div class="tx-history-card-meta">
                    <div class="tx-history-meta-row">
                      <span>{{ $t('ui.date') }}</span>
                      <span>{{ formatDate(payment.payment_date) }}</span>
                    </div>
                    <div class="tx-history-meta-row">
                      <span>{{ $t('ui.receiptNo') }}</span>
                      <span>{{ payment.receipt_number || '—' }}</span>
                    </div>
                    <div class="tx-history-meta-row">
                      <span>{{ $t('ui.recordedBy') }}</span>
                      <span>{{ payment.recorded_by_name || '—' }}</span>
                    </div>
                    <div class="tx-history-meta-row">
                      <span>{{ $t('ui.remarks') }}</span>
                      <span>{{ payment.remarks || '—' }}</span>
                    </div>
                  </div>
                  <div class="tx-history-card-actions">
                    <button
                      v-if="payment.receipt_number && isOfficialReceipt(payment.receipt_number)"
                      type="button"
                      class="btn-secondary btn-sm receipt-view-btn"
                      @click="viewBookingReceipt(payment.receipt_number)"
                    >
                      {{ $t('common.viewReceipt') }}
                    </button>
                    <button
                      v-else-if="payment.proof_path"
                      type="button"
                      class="btn-secondary btn-sm"
                      @click="openProofPreview(paymentProofUrl(payment.proof_path))"
                    >
                      View Proof
                    </button>
                  </div>
                </article>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- RECEIPT VIEW MODAL -->
    <Teleport to="body">
    <div
      v-if="showReceiptModal && lastReceipt"
      class="modal-overlay receipt-modal-overlay app-modal-overlay machinery-booking-modal machinery-ui mf-receipt-overlay"
      :class="{ 'light-theme': isLight }"
      @click.self="closeReceiptModal"
    >
      <div class="modal-content receipt-modal-content receipt-modal-box" role="dialog" aria-modal="true" @click.stop>
        <PaymentReceiptPrint
          :receipt="lastReceipt"
          :auto-print="receiptAutoPrint"
          :kind="lastReceipt?.module === 'machinery_refund' ? 'refund' : 'payment'"
          @close="closeReceiptModal"
        />
      </div>
    </div>
    </Teleport>

    <ProofPreviewModal
      :show="showProofPreview"
      :src="proofPreviewSrc"
      title="Payment Proof"
      @close="closeProofPreview"
    />

    <!-- Edit Booking Modal -->
    <Teleport to="body">
    <div
      v-if="showEditModal"
      class="modal-overlay app-modal-overlay machinery-booking-modal machinery-ui"
      :class="{ 'light-theme': isLight }"
      @click.self="closeModals"
    >
      <div class="modal-content" role="dialog" aria-modal="true" @click.stop>
        <div class="modal-header">
          <h2>{{ $t('ui.editBooking') }}</h2>
          <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="editBooking">
            <div class="form-group">
              <label class="form-label">Select Machinery *</label>
              <select v-model="bookingToEdit.machinery_id" @change="onEditMachinerySelect" class="form-input" required>
                <option value="">{{ $t('ui.chooseMachinery') }}</option>
                <option v-for="machine in machineryOptions" :key="machine.id" :value="machine.id">
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
                    <span v-if="c.isFull" class="cal-full-label">{{ $t('common.full') }}</span>
                  </button>
                </div>
                <p v-if="bookingToEdit.booking_date" class="cal-selected-hint">
                  {{ $t('ui.selectedColon') }} <strong>{{ formatDate(bookingToEdit.booking_date) }}</strong>
                </p>
                <p v-else class="cal-selected-hint cal-selected-hint--muted">{{ $t('ui.pickCalendarDate') }}</p>
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
              <p v-if="barangayPlacesLoading" class="form-hint">{{ $t('ui.loadingLocations') }}</p>
              <template v-else-if="bookingUsesPlaceDropdown">
                <select
                  v-model="bookingToEdit.barangay_place_id"
                  class="form-input"
                  required
                >
                  <option value="">{{ $t('ui.pickPlaceInBarangay') }}</option>
                  <option
                    v-for="p in barangayServicePlaces"
                    :key="p.id"
                    :value="String(p.id)"
                  >
                    {{ p.name }}{{ p.description ? ' — ' + p.description : '' }}
                  </option>
                </select>
                <small class="form-hint">{{ $t('ui.basedOnBarangay') }}</small>
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
              <TypedNumberInput
                v-model="bookingToEdit.area_size"
                :min="0.01"
              />
            </div>

            <div class="form-group">
              <label class="form-label">{{ $t('ui.notesInstructions') }}</label>
              <textarea 
                v-model="bookingToEdit.notes" 
                class="form-input" 
                rows="3"
              ></textarea>
            </div>

            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary">{{ $t('common.cancel') }}</button>
              <button type="submit" class="btn-primary" :disabled="loading">
                {{ loading ? 'Updating...' : 'Update Booking' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Cancel Booking Confirmation Modal -->
    <Teleport to="body">
    <div
      v-if="showCancelModal"
      class="modal-overlay app-modal-overlay machinery-booking-modal machinery-ui"
      :class="{ 'light-theme': isLight }"
      @click.self="closeModals"
    >
      <div class="modal-content modal-small" role="dialog" aria-modal="true" @click.stop>
        <div class="modal-header">
          <h2>{{ $t('ui.cancelBooking') }}</h2>
          <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
        </div>
        <div class="modal-body">
          <p>Are you sure you want to cancel this booking?</p>
          <div class="booking-summary">
            <p><strong>{{ $t('ui.machineryColon') }}</strong> {{ bookingToCancel?.machinery_name }}</p>
            <p><strong>{{ $t('ui.dateColon') }}</strong> {{ formatDate(bookingToCancel?.booking_date) }}</p>
            <p><strong>Total:</strong> ₱{{ formatNumber(bookingToCancel?.total_price) }}</p>
          </div>
          <div class="modal-actions">
            <button @click="closeModals" class="btn-secondary">{{ $t('common.noKeepIt') }}</button>
            <button @click="cancelBooking" class="btn-danger" :disabled="loading">
              {{ loading ? 'Cancelling...' : 'Yes, Cancel' }}
            </button>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Error/Success Messages -->
    <Teleport to="body">
      <div v-if="error || successMessage" class="booking-alert-stack" :class="{ 'light-theme': isLight }">
        <div v-if="error" class="alert alert-error">
          {{ error }}
          <button type="button" @click="clearError" class="alert-close" :aria-label="$t('common.close')">×</button>
        </div>
        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
          <button type="button" @click="successMessage = ''" class="alert-close" :aria-label="$t('common.close')">×</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMachineryStore } from '../stores/machineryStore'
import { useAuthStore } from '../stores/authStore'
import { useDownPaymentStore } from '../stores/downPaymentStore'
import TypedNumberInput from '../components/TypedNumberInput.vue'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import ProofPreviewModal from '../components/ProofPreviewModal.vue'
import GcashQrPayPanel from '../components/GcashQrPayPanel.vue'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { canCreateBookingOnBehalf } from '../utils/roleAccess'
import { historyRowKey, pickFocusedHistoryRow, clearNotificationDeepLink, consumeNotificationDeepLink, scrollFocusedHistoryRowWhenReady, scrollElementWhenReady } from '../utils/paymentHistoryFocus'
import { mediaUrl } from '../utils/apiBase'

export default {
  name: 'MachineryBookingPage',
  components: {
    TypedNumberInput,
    PaymentReceiptPrint,
    ProofPreviewModal,
    GcashQrPayPanel
  },
  setup() {
    const machineryStore = useMachineryStore()
    const authStore = useAuthStore()
    const downPaymentStore = useDownPaymentStore()
    const route = useRoute()
    const router = useRouter()
    const { isDark } = useBackdropTheme()
    const isLight = computed(() => !isDark.value)

    const canCreateOnBehalf = computed(() => canCreateBookingOnBehalf(authStore.currentUser?.role))
    const refundReviewHint = computed(() => {
      const role = String(authStore.currentUser?.role || '').toLowerCase()
      const reviewer = role === 'treasurer' ? 'president' : 'treasurer'
      return `Request a refund of your verified down payment (e.g. lost slot or service not completed). The ${reviewer} will review before funds are released.`
    })

    const isCrossBarangayMachine = (machine) => {
      if (!machine?.barangay_id || !userBarangayId.value) return false
      return String(machine.barangay_id) !== String(userBarangayId.value)
    }

    // Same barangay → member rate; other barangay (or account non-member) → non-member rate
    const usesNonMemberRate = (machine) =>
      isNonMember.value || isCrossBarangayMachine(machine)

    const getEffectivePricePerUnit = (machine) => {
      if (!machine) return 0
      const base = parseFloat(machine.price_per_unit || 0)
      const memberPrice = parseFloat(machine.member_price || 0)
      const nonMemberPrice = parseFloat(machine.non_member_price || 0)

      if (usesNonMemberRate(machine)) {
        return nonMemberPrice || (base ? base * 1.25 : 0)
      }

      return memberPrice || base
    }

    // State
    const highlightedBookingId = ref(null)
    const highlightedHistoryKey = ref(null)
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
    const machinerySearch = ref('')
    const calculatedPrice = ref(0)
    const capacityError = ref('')
    const outstandingBalance = ref(0)
    const unpaidBookingsList = ref([])
    const paymentHistory = ref([])
    const paymentHistoryLoading = ref(false)
    const balanceSubmissions = ref([])
    const showReceiptModal = ref(false)
    const lastReceipt = ref(null)
    const receiptAutoPrint = ref(false)
    const showProofPreview = ref(false)
    const proofPreviewSrc = ref('')
    const refundReason = ref('')
    const submittingRefund = ref(false)
    const downPaymentStatuses = ['Awaiting Down Payment', 'Awaiting Payment Verification', 'Payment Rejected', 'Down Payment Verified']
    let bookingsRefreshInterval = null

    const bookingForm = ref({
      farmer_id: null,
      machinery_id: '',
      booking_date: '',
      barangay_place_id: '',
      service_location: '',
      area_size: null,
      area_unit: '',
      notes: ''
    })
    const bookableFarmers = computed(() =>
      (machineryStore.bookableFarmers || []).filter(
        (farmer) => parseInt(farmer.id, 10) !== parseInt(authStore.currentUser?.id, 10)
      )
    )
    const farmerSearchQuery = ref('')
    const showFarmerPicker = ref(false)
    const farmerPickerIndex = ref(-1)
    let farmerPickerBlurTimer = null

    const farmerOptionLabel = (farmer) => {
      if (!farmer) return ''
      const refNo = farmer.reference_number ? ` (${farmer.reference_number})` : ''
      return `${farmer.full_name || ''}${refNo}`.trim()
    }

    const filteredBookableFarmers = computed(() => {
      const q = farmerSearchQuery.value.trim().toLowerCase()
      const list = bookableFarmers.value
      const selected = selectedFarmerForBooking.value
      if (selected && farmerSearchQuery.value.trim() === farmerOptionLabel(selected)) {
        return list
      }
      if (!q) return list
      return list.filter((farmer) => {
        const name = String(farmer.full_name || '').toLowerCase()
        const refNo = String(farmer.reference_number || '').toLowerCase()
        const role = String(farmer.role || '').toLowerCase()
        return name.includes(q) || refNo.includes(q) || role.includes(q)
      })
    })

    const selectedFarmerForBooking = computed(() => {
      if (!canCreateOnBehalf.value) return authStore.currentUser
      const id = parseInt(bookingForm.value.farmer_id, 10)
      if (!id) return null
      return bookableFarmers.value.find(f => parseInt(f.id, 10) === id) || null
    })
    const isNonMember = computed(() => {
      const farmer = selectedFarmerForBooking.value || authStore.currentUser
      return String(farmer?.membership_status || '').toLowerCase() === 'non-member'
    })
    const userBarangayId = computed(() => selectedFarmerForBooking.value?.barangay_id || authStore.currentUser?.barangay_id)
    const showLegacyDownPaymentSection = computed(() => {
      const b = selectedBooking.value
      if (!b) return false
      return downPaymentStatuses.includes(b.status)
    })
    const bookingDownPercent = computed(() => {
      const b = selectedBooking.value
      if (!b) return null
      const n = parseFloat(b.down_payment_percent || b.barangay_down_payment_percent)
      return Number.isFinite(n) && n > 0 ? (Number.isInteger(n) ? String(n) : String(n)) : null
    })
    const bookingDownAmount = computed(() => {
      const b = selectedBooking.value
      if (!b) return 0
      const stored = parseFloat(b.down_payment_amount)
      if (Number.isFinite(stored) && stored > 0) return stored
      const total = parseFloat(b.total_price) || 0
      const pct = parseFloat(b.down_payment_percent || b.barangay_down_payment_percent) || 0
      return Math.round(total * pct) / 100
    })
    const isOwnBooking = computed(() => {
      const b = selectedBooking.value
      if (!b) return false
      return parseInt(b.farmer_id, 10) === parseInt(authStore.currentUser?.id, 10)
    })
    const canPayBookingGcash = computed(() => {
      const b = selectedBooking.value
      if (!b || !isOwnBooking.value) return false
      if (['Cancelled', 'Rejected'].includes(b.status)) return false
      if (['Awaiting Down Payment', 'Payment Rejected'].includes(b.status)) {
        return bookingDownAmount.value > 0.01
      }
      if (['Awaiting Payment Verification', 'Down Payment Verified'].includes(b.status)) {
        return false
      }
      if (parseFloat(b.down_payment_amount) > 0 && !['Completed', 'Awaiting Final Payment'].includes(b.status)) {
        return false
      }
      const remaining = parseFloat(b.remaining_balance)
      const due = Number.isFinite(remaining)
        ? remaining
        : (parseFloat(b.total_price) || 0) - (parseFloat(b.total_paid) || 0)
      return due > 0.01
    })
    const showBookingGcashPanel = computed(() => {
      const b = selectedBooking.value
      if (!b || !isOwnBooking.value) return false
      if (['Cancelled', 'Rejected', 'Down Payment Verified'].includes(b.status)) return false
      if (canPayBookingGcash.value) return true
      return b.status === 'Awaiting Payment Verification' && b.down_payment_method === 'GCash'
    })
    const onGcashProofSubmitted = async () => {
      const id = selectedBooking.value?.id
      if (id) {
        await machineryStore.getBookingDetails(id)
        await loadBookingPayments(id)
      }
    }
    const onGcashPayError = () => {}
    const bookingTableColspan = computed(() => 10)
    const bookNowDisabled = computed(() => !canCreateOnBehalf.value && outstandingBalance.value > 0)
    const bookNowLabel = computed(() => {
      if (!canCreateOnBehalf.value && outstandingBalance.value > 0) return 'Settle Balance First'
      return canCreateOnBehalf.value ? 'Book for Farmer' : 'Book Now'
    })
    const bookNowTitle = computed(() => {
      if (!canCreateOnBehalf.value && outstandingBalance.value > 0) return 'Please settle your outstanding balance first'
      return canCreateOnBehalf.value ? 'Create a booking for a farmer' : 'Book this machinery'
    })

    const isMachinePrerequisiteLocked = (machine) => {
      if (canCreateOnBehalf.value) return false
      return !!(machine?.requires_machinery_id && machine?.prerequisite_satisfied === false)
    }

    const isBookButtonDisabled = (machine) =>
      bookNowDisabled.value || isMachinePrerequisiteLocked(machine)

    const bookButtonLabel = (machine) => {
      if (isMachinePrerequisiteLocked(machine)) return 'Complete Prerequisite First'
      return bookNowLabel.value
    }

    const bookButtonTitle = (machine) => {
      if (isMachinePrerequisiteLocked(machine)) {
        const name = machine.requires_machinery_name || 'the required machinery'
        return `Complete a booking for ${name} first`
      }
      return bookNowTitle.value
    }

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
    const getImageUrl = (imagePath) => mediaUrl(imagePath)

    // Computed
    const distinctMachineryTypes = computed(() => machineryStore.distinctMachineryTypes)
    
    const allAvailableMachinery = computed(() => machineryStore.availableMachinery)
    
    const availableMachinery = computed(() => {
      let list = allAvailableMachinery.value || []
      if (machineryTypeFilter.value) {
        list = list.filter((m) => m.machinery_type === machineryTypeFilter.value)
      }
      const q = machinerySearch.value.trim().toLowerCase()
      if (q) {
        list = list.filter(
          (m) =>
            (m.machinery_name || '').toLowerCase().includes(q) ||
            (m.machinery_type || '').toLowerCase().includes(q) ||
            (m.barangay_name || '').toLowerCase().includes(q)
        )
      }
      return list
    })

    const machineryOptions = computed(() => allAvailableMachinery.value || [])
    
    const bookings = computed(() => machineryStore.bookings)
    const loading = computed(() => machineryStore.loading)
    const error = computed(() => machineryStore.error)
    const selectedBooking = computed(() => machineryStore.selectedBooking)
    const gcashPanelKey = computed(() => `${selectedBooking.value?.id || '0'}-${route.query.nav || '0'}`)

    const showDownPaymentSubmittedInfo = computed(() => {
      const b = selectedBooking.value
      if (!b) return false
      return !!(
        b.down_payment_method ||
        b.down_payment_proof ||
        b.receipt_number ||
        ['Awaiting Payment Verification', 'Down Payment Verified'].includes(b.status)
      )
    })

    const showPaymentHistorySection = computed(() => {
      const b = selectedBooking.value
      if (!b) return paymentHistoryLoading.value || paymentHistory.value.length > 0
      return (
        paymentHistoryLoading.value ||
        paymentHistory.value.length > 0 ||
        (b.total_paid || 0) > 0 ||
        b.status === 'Completed' ||
        !!b.receipt_number
      )
    })

    const refundReceiptNumber = computed(() => {
      const refundPayment = paymentHistory.value.find(
        (p) => p.payment_type === 'refund' && isOfficialReceipt(p.receipt_number)
      )
      return refundPayment?.receipt_number || null
    })

    const isOfficialReceipt = (num) => num && String(num).startsWith('RCPT-')

    const paymentProofUrl = (path) => getImageUrl(path)

    const formatPaymentType = (type) => {
      const map = {
        down_payment: selectedBooking.value?.down_payment_percent
          ? `Down Payment (${selectedBooking.value.down_payment_percent}%)`
          : 'Down Payment',
        partial: 'Partial Balance',
        balance_payment: 'Balance Payment',
        final_payment: 'Final Payment',
        refund: 'Refund',
        gcash_rejected: 'GCash Proof Rejected',
        gcash_pending: 'GCash Pending'
      }
      return map[type] || type || 'Payment'
    }

    const formatHistoryAmount = (payment) => {
      if (payment?.amount == null || payment.amount === '') return '—'
      const n = Math.abs(Number(payment.amount))
      if (!Number.isFinite(n)) return '—'
      return `₱${formatNumber(n)}`
    }

    const viewBookingReceipt = async (receiptNumber) => {
      if (!receiptNumber) return
      try {
        lastReceipt.value = await machineryStore.fetchReceipt(receiptNumber)
        if (!lastReceipt.value) throw new Error('Receipt not found')
        if (!lastReceipt.value.barangay_name) {
          lastReceipt.value.barangay_name =
            selectedBooking.value?.barangay_name || authStore.currentUser?.barangay_name || ''
        }
        receiptAutoPrint.value = false
        showReceiptModal.value = true
      } catch (e) {
        console.error('Failed to load receipt:', e)
        alert(e.message || 'Could not load receipt')
      }
    }

    const closeReceiptModal = () => {
      showReceiptModal.value = false
      receiptAutoPrint.value = false
    }

    const openProofPreview = (src) => {
      if (!src) return
      proofPreviewSrc.value = src
      showProofPreview.value = true
    }

    const closeProofPreview = () => {
      showProofPreview.value = false
      proofPreviewSrc.value = ''
    }

    const refundEligibleStatuses = [
      'Down Payment Verified',
      'Booking Confirmed',
      'Incomplete',
      'Cancelled',
      'Rejected',
      'Expired',
      'Payment Rejected'
    ]
    const openRefundStatuses = ['Refund Requested', 'Under Review', 'Approved', 'Pending', 'Refunded', 'Processed']

    const showRefundRequestForm = computed(() => {
      const b = selectedBooking.value
      if (!b) return false
      if (b.status === 'Completed' || parseInt(b.machine_used, 10) === 1) return false
      if (!refundEligibleStatuses.includes(b.status)) return false
      const downPaid = parseFloat(b.down_payment_amount) || parseFloat(b.total_paid) || 0
      if (downPaid <= 0 && !b.down_payment_verified_at) return false
      // Own booking only
      if (parseInt(b.farmer_id, 10) !== parseInt(authStore.currentUser?.id, 10)) return false
      const refund = b.refund
      if (!refund) return true
      if (refund.refund_status === 'Rejected') return true
      return !openRefundStatuses.includes(refund.refund_status)
    })

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
    const remainingCapacityByDate = ref({})
    const loadingUnavailableDates = ref(false)
    const bookingCalendarMonth = ref(new Date())

    const editFullCapacityMap = ref({})
    const editRemainingCapacityByDate = ref({})
    const loadingEditUnavailableDates = ref(false)
    const editCalendarMonth = ref(new Date())

    const formatCapacityAmount = (value) => {
      const n = parseFloat(value)
      if (!Number.isFinite(n)) return '0'
      return Number.isInteger(n) ? String(n) : n.toFixed(2).replace(/\.?0+$/, '')
    }

    const getRemainingForDate = (ymd, remainingMap, machine) => {
      if (!machine?.max_capacity || !ymd) return null
      const maxCap = parseFloat(machine.max_capacity)
      if (!Number.isFinite(maxCap)) return null
      if (remainingMap && Object.prototype.hasOwnProperty.call(remainingMap, ymd)) {
        return Math.max(0, parseFloat(remainingMap[ymd]) || 0)
      }
      return maxCap
    }

    const selectedDateRemainingCapacity = computed(() =>
      getRemainingForDate(
        bookingForm.value.booking_date,
        remainingCapacityByDate.value,
        selectedMachineryForBooking.value
      )
    )

    const selectedDateBookedCapacity = computed(() => {
      const machine = selectedMachineryForBooking.value
      const remaining = selectedDateRemainingCapacity.value
      if (!machine?.max_capacity || remaining == null) return 0
      return Math.max(0, parseFloat(machine.max_capacity) - remaining)
    })

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
        remainingCapacityByDate.value = {}
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
        const remaining = {}
        if (data.success && Array.isArray(data.unavailable_dates)) {
          for (const row of data.unavailable_dates) {
            if (row.date) {
              m[row.date] = true
              remaining[row.date] = 0
            }
          }
        }
        if (data.success && Array.isArray(data.partially_available_dates)) {
          for (const row of data.partially_available_dates) {
            if (!row.date) continue
            const rem = parseFloat(row.remaining_capacity)
            remaining[row.date] = Number.isFinite(rem)
              ? Math.max(0, rem)
              : Math.max(0, parseFloat(machine.max_capacity) - (parseFloat(row.total_booked) || 0))
          }
        }
        fullCapacityDateMap.value = m
        remainingCapacityByDate.value = remaining
        const cur = bookingForm.value.booking_date
        if (cur && m[cur]) {
          bookingForm.value.booking_date = ''
        }
        validateAndCalculate()
      } catch (e) {
        console.error('Failed to load unavailable dates:', e)
      } finally {
        loadingUnavailableDates.value = false
      }
    }

    const loadUnavailableForEdit = async () => {
      if (!bookingToEdit.value) return
      const id = bookingToEdit.value.machinery_id
      const machine = machineryOptions.value.find((mm) => mm.id == id)
      if (!id || !machine?.max_capacity) {
        editFullCapacityMap.value = {}
        editRemainingCapacityByDate.value = {}
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
        const remaining = {}
        if (data.success && Array.isArray(data.unavailable_dates)) {
          for (const row of data.unavailable_dates) {
            if (row.date) {
              map[row.date] = true
              remaining[row.date] = 0
            }
          }
        }
        if (data.success && Array.isArray(data.partially_available_dates)) {
          for (const row of data.partially_available_dates) {
            if (!row.date) continue
            const rem = parseFloat(row.remaining_capacity)
            remaining[row.date] = Number.isFinite(rem)
              ? Math.max(0, rem)
              : Math.max(0, parseFloat(machine.max_capacity) - (parseFloat(row.total_booked) || 0))
          }
        }
        editFullCapacityMap.value = map
        editRemainingCapacityByDate.value = remaining
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
      return machineryOptions.value.find((m) => m.id == bookingToEdit.value.machinery_id)
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
      validateAndCalculate()
    }

    const selectEditCalendarDate = (c) => {
      if (c.disabled || !bookingToEdit.value) return
      bookingToEdit.value.booking_date = c.ymd
    }

    const myBookings = computed(() => {
      const currentId = parseInt(authStore.currentUser?.id, 10)
      return bookings.value.filter(b => parseInt(b.farmer_id, 10) === currentId)
    })

    const showDownPaymentStatusFilters = computed(() => {
      if (downPaymentStore.isActive) return true
      return myBookings.value.some((b) =>
        [
          'Awaiting Down Payment',
          'Awaiting Payment Verification',
          'Payment Rejected',
          'Down Payment Verified',
          'Booking Confirmed',
          'Awaiting Final Payment'
        ].includes(b.status)
      )
    })

    const myBookingsCount = computed(() => myBookings.value.length)
    
    const pendingBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Pending').length
    })
    
    const approvedBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Approved').length
    })

    const assignedToOperatorCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Assigned to Operator').length
    })

    const expiredBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Expired').length
    })
    
    const completedBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Completed').length
    })

    const rejectedBookingsCount = computed(() => {
      return myBookings.value.filter(b => b.status === 'Rejected').length
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
      return machineryOptions.value.find(m => m.id == bookingForm.value.machinery_id)
    })

    const isMachineDownPaymentOn = (machine) => Number(machine?.down_payment_enabled) === 1 && parseFloat(machine?.down_payment_percent) > 0
    const machineDownPaymentPercent = (machine) => {
      const n = parseFloat(machine?.down_payment_percent)
      if (!Number.isFinite(n) || n <= 0) return '—'
      return Number.isInteger(n) ? String(n) : String(n)
    }
    const selectedMachineDownPaymentOn = computed(() => isMachineDownPaymentOn(selectedMachineryForBooking.value))
    const selectedMachineDownPaymentPercent = computed(() => machineDownPaymentPercent(selectedMachineryForBooking.value))
    const selectedMachineDownPaymentAmount = computed(() => {
      if (!selectedMachineDownPaymentOn.value) return 0
      const pct = parseFloat(selectedMachineryForBooking.value?.down_payment_percent) || 0
      return Math.round((calculatedPrice.value || 0) * pct) / 100
    })

    const authHeaders = () => {
      const token = authStore.token || localStorage.getItem('token')
      return token ? { Authorization: `Bearer ${token}` } : {}
    }

    const parseCapacity = (value) => {
      const n = parseFloat(value)
      return Number.isFinite(n) ? n : undefined
    }

    // Methods
    const loadFarmerBalance = async (farmerId = null) => {
      try {
        const targetId = farmerId || authStore.currentUser?.id
        if (!targetId) return
        
        const response = await fetch(
          `/api/machinery/bookings/farmer-balance/${targetId}`,
          { headers: authHeaders() }
        )
        const data = await response.json()
        
        if (data.success) {
          outstandingBalance.value = data.total_outstanding_balance || 0
          unpaidBookingsList.value = data.unpaid_bookings || []
        }
      } catch (error) {
        console.error('Error loading farmer balance:', error)
      }
    }

    const onSelectedFarmerChange = async () => {
      const farmerId = bookingForm.value.farmer_id
      outstandingBalance.value = 0
      unpaidBookingsList.value = []
      if (farmerId) {
        await loadFarmerBalance(farmerId)
      }
      calculatePrice()
    }

    const openFarmerPicker = () => {
      if (farmerPickerBlurTimer) {
        clearTimeout(farmerPickerBlurTimer)
        farmerPickerBlurTimer = null
      }
      showFarmerPicker.value = true
      farmerPickerIndex.value = filteredBookableFarmers.value.findIndex(
        (f) => parseInt(f.id, 10) === parseInt(bookingForm.value.farmer_id, 10)
      )
    }

    const closeFarmerPickerSoon = () => {
      farmerPickerBlurTimer = setTimeout(() => {
        showFarmerPicker.value = false
        farmerPickerIndex.value = -1
        const selected = selectedFarmerForBooking.value
        if (selected) {
          farmerSearchQuery.value = farmerOptionLabel(selected)
        }
      }, 120)
    }

    const onFarmerSearchInput = () => {
      showFarmerPicker.value = true
      farmerPickerIndex.value = filteredBookableFarmers.value.length ? 0 : -1
      const selected = selectedFarmerForBooking.value
      if (selected && farmerSearchQuery.value.trim() !== farmerOptionLabel(selected)) {
        bookingForm.value.farmer_id = null
        outstandingBalance.value = 0
        unpaidBookingsList.value = []
      }
    }

    const selectFarmerForBooking = async (farmer) => {
      if (!farmer) return
      bookingForm.value.farmer_id = farmer.id
      farmerSearchQuery.value = farmerOptionLabel(farmer)
      showFarmerPicker.value = false
      farmerPickerIndex.value = -1
      await onSelectedFarmerChange()
    }

    const onFarmerSearchKeydown = (event) => {
      if (!showFarmerPicker.value && ['ArrowDown', 'Enter'].includes(event.key)) {
        openFarmerPicker()
      }
      const options = filteredBookableFarmers.value
      if (event.key === 'ArrowDown') {
        event.preventDefault()
        if (!options.length) return
        farmerPickerIndex.value = (farmerPickerIndex.value + 1) % options.length
      } else if (event.key === 'ArrowUp') {
        event.preventDefault()
        if (!options.length) return
        farmerPickerIndex.value = farmerPickerIndex.value <= 0
          ? options.length - 1
          : farmerPickerIndex.value - 1
      } else if (event.key === 'Enter') {
        if (showFarmerPicker.value && farmerPickerIndex.value >= 0 && options[farmerPickerIndex.value]) {
          event.preventDefault()
          selectFarmerForBooking(options[farmerPickerIndex.value])
        }
      } else if (event.key === 'Escape') {
        showFarmerPicker.value = false
      }
    }

    const loadData = async () => {
      try {
        const bookingQuery = { farmer_id: authStore.currentUser?.id }
        const tasks = [
          machineryStore.fetchInventory({ status: 'Available', catalog: '1' }),
          machineryStore.fetchBookings(bookingQuery),
          loadBarangayServicePlaces(),
          downPaymentStore.fetchStatus(authStore.currentUser?.barangay_id || null)
        ]
        if (!canCreateOnBehalf.value) {
          tasks.push(loadFarmerBalance())
        }
        if (canCreateOnBehalf.value) {
          tasks.push(machineryStore.fetchBookableFarmers().catch((err) => {
            console.error('Error loading bookable farmers:', err)
          }))
        }
        await Promise.all(tasks)
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
        const requested = parseFloat(bookingForm.value.area_size) || 0
        const unit = selectedMachineryForBooking.value.capacity_unit || 'hectares'
        const remaining = selectedDateRemainingCapacity.value
        const maxCap = parseFloat(selectedMachineryForBooking.value.max_capacity)

        if (selectedMachineryForBooking.value.max_capacity && requested > maxCap) {
          capacityError.value = `Maximum capacity is ${formatCapacityAmount(maxCap)} ${unit} per day`
          calculatedPrice.value = 0
          return
        }

        if (remaining != null && requested > remaining + 0.001) {
          capacityError.value = `Only ${formatCapacityAmount(remaining)} ${unit} available on ${formatDate(bookingForm.value.booking_date)}. Please book ${formatCapacityAmount(remaining)} ${unit} or less.`
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
      if (isBookButtonDisabled(machine)) return
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
        validateAndCalculate()
        if (capacityError.value) {
          machineryStore.error = capacityError.value
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

        if (canCreateOnBehalf.value) {
          if (!bookingForm.value.farmer_id) {
            machineryStore.error = 'Please choose the farmer who requested this booking'
            return
          }
          if (outstandingBalance.value > 0) {
            machineryStore.error = `This farmer has an outstanding balance of ₱${Number(outstandingBalance.value).toFixed(2)}. Please settle it before creating a new booking.`
            return
          }
        }

        // Prepare booking data with proper values
        const bookingData = {
          farmer_id: canCreateOnBehalf.value
            ? parseInt(bookingForm.value.farmer_id, 10)
            : authStore.currentUser.id,
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
        
        const created = await machineryStore.createBooking(
          bookingData,
          { skipRefresh: canCreateOnBehalf.value }
        )
        closeModals()
        resetBookingForm()
        if (canCreateOnBehalf.value) {
          await router.push({
            path: '/machinery-approval',
            query: {
              created: '1',
              highlight: created?.booking_id ? String(created.booking_id) : undefined,
              type: 'booking'
            }
          })
          return
        }
        successMessage.value = 'Booking created successfully. Waiting for Operations Manager or Business Manager approval.'
        await loadData()
      } catch (error) {
        console.error('Error creating booking:', error)
      }
    }

    const loadBookingPayments = async (bookingId) => {
      if (!bookingId) {
        paymentHistory.value = []
        return
      }
      const response = await fetch(`/api/machinery/bookings/${bookingId}/payments`, {
        headers: authHeaders()
      })
      const data = await response.json().catch(() => ({ success: false, payments: [] }))
      paymentHistory.value = data.success ? (data.payments || []) : []
    }

    const viewBookingDetails = async (booking) => {
      try {
        paymentHistoryLoading.value = true
        await machineryStore.getBookingDetails(booking.id)
        await loadBookingPayments(booking.id)

        try {
          const subRes = await fetch(`/api/machinery/bookings/${booking.id}/balance-submissions`, {
            headers: authHeaders()
          })
          const subData = await subRes.json().catch(() => ({ success: false, submissions: [] }))
          balanceSubmissions.value = subData.success ? (subData.submissions || []) : []
        } catch {
          balanceSubmissions.value = []
        }

        refundReason.value = ''
        showViewBookingModal.value = true
      } catch (error) {
        console.error('Error viewing booking:', error)
        paymentHistory.value = []
        balanceSubmissions.value = []
      } finally {
        paymentHistoryLoading.value = false
      }
    }

    const submitRefundRequest = async () => {
      if (!selectedBooking.value || !refundReason.value.trim()) return
      submittingRefund.value = true
      try {
        await machineryStore.requestRefund(selectedBooking.value.id, {
          farmer_id: authStore.currentUser.id,
          refund_reason: refundReason.value.trim()
        })
        successMessage.value = 'Refund request submitted. The treasurer will review your request.'
        await machineryStore.getBookingDetails(selectedBooking.value.id)
        selectedBooking.value = machineryStore.selectedBooking
        refundReason.value = ''
        await loadData()
      } catch (error) {
        console.error('Error submitting refund request:', error)
      } finally {
        submittingRefund.value = false
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
      const selectedMachine = machineryOptions.value.find(m => m.id === bookingToEdit.value.machinery_id)
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
      const wasViewingDetails = showViewBookingModal.value
      showBookingModal.value = false
      showViewBookingModal.value = false
      showCancelModal.value = false
      showEditModal.value = false
      bookingToCancel.value = null
      bookingToEdit.value = null
      paymentHistory.value = []
      paymentHistoryLoading.value = false
      balanceSubmissions.value = []
      highlightedHistoryKey.value = null
      highlightedBookingId.value = null
      closeReceiptModal()
      closeProofPreview()
      machineryStore.clearSelection()
      if (wasViewingDetails) clearNotificationDeepLink(router, route)
    }

    const resetBookingForm = () => {
      bookingForm.value = {
        farmer_id: null,
        machinery_id: '',
        booking_date: '',
        barangay_place_id: '',
        service_location: '',
        area_size: null,
        area_unit: '',
        notes: ''
      }
      calculatedPrice.value = 0
      farmerSearchQuery.value = ''
      showFarmerPicker.value = false
      farmerPickerIndex.value = -1
      if (canCreateOnBehalf.value) {
        outstandingBalance.value = 0
        unpaidBookingsList.value = []
      }
    }

    const clearError = () => {
      machineryStore.clearError()
    }

    let bookingErrorTimer = null
    let bookingSuccessTimer = null
    const clearBookingAlertTimers = () => {
      if (bookingErrorTimer) {
        clearTimeout(bookingErrorTimer)
        bookingErrorTimer = null
      }
      if (bookingSuccessTimer) {
        clearTimeout(bookingSuccessTimer)
        bookingSuccessTimer = null
      }
    }

    watch(error, (value) => {
      if (bookingErrorTimer) {
        clearTimeout(bookingErrorTimer)
        bookingErrorTimer = null
      }
      if (!value) return
      bookingErrorTimer = setTimeout(() => {
        clearError()
        bookingErrorTimer = null
      }, 5500)
    })

    watch(successMessage, (value) => {
      if (bookingSuccessTimer) {
        clearTimeout(bookingSuccessTimer)
        bookingSuccessTimer = null
      }
      if (!value) return
      bookingSuccessTimer = setTimeout(() => {
        successMessage.value = ''
        bookingSuccessTimer = null
      }, 4000)
    })

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
        'Awaiting Down Payment': 'warning',
        'Awaiting Payment Verification': 'info',
        'Payment Rejected': 'danger',
        'Down Payment Verified': 'info',
        'Booking Confirmed': 'success',
        'Assigned to Operator': 'success',
        'Awaiting Final Payment': 'warning',
        'Approved': 'success',
        'Expired': 'danger',
        'Completed': 'success',
        'Rejected': 'danger',
        'Cancelled': 'default',
        'Incomplete': 'danger',
        'In Use': 'success'
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
    const applyBookingHighlightFromRoute = async () => {
      if (!route.query.highlight || route.query.type !== 'booking') return
      const highlightId = route.query.highlight
      const focus = String(route.query.focus || '')
      const sid = route.query.sid
      // List card highlight + center only. Open detail form only for GCash payment history focus.
      const openDetails = focus.startsWith('gcash')
      highlightedBookingId.value = highlightId
      highlightedHistoryKey.value = null

      try {
        await loadData()
        const found = myBookings.value.find((b) => String(b.id) === String(highlightId))
        if (found?.status) {
          bookingFilter.value = found.status
        }
      } catch (error) {
        console.error('Error preparing booking highlight:', error)
      }

      await nextTick()
      await scrollElementWhenReady(`[data-booking-id="${highlightId}"]`, nextTick)

      if (openDetails) {
        try {
          await viewBookingDetails({ id: highlightId })
        } catch (error) {
          console.error('Error opening booking from notification:', error)
          consumeNotificationDeepLink(router, route, () => {
            highlightedBookingId.value = null
            highlightedHistoryKey.value = null
          })
          return
        }
        await nextTick()
        const row = pickFocusedHistoryRow(paymentHistory.value, focus, sid)
        highlightedHistoryKey.value = row ? historyRowKey(row) : null
        await scrollFocusedHistoryRowWhenReady(highlightedHistoryKey.value, nextTick)
      }

      consumeNotificationDeepLink(router, route, () => {
        highlightedBookingId.value = null
        highlightedHistoryKey.value = null
      })
    }

    watch(
      () => [route.query.highlight, route.query.type, route.query.open, route.query.focus, route.query.sid, route.query.nav],
      () => {
        applyBookingHighlightFromRoute()
      }
    )

    onMounted(async () => {
      await loadData()

      bookingsRefreshInterval = setInterval(() => {
        loadData().catch((error) => {
          console.error('Error refreshing booking data:', error)
        })
      }, 15000) // Refresh every 15 seconds

      await applyBookingHighlightFromRoute()

      if (canCreateOnBehalf.value && (route.query.create === '1' || route.query.create === 'true')) {
        showBookingModal.value = true
      }
    })

    const isAnyModalOpen = computed(() =>
      showBookingModal.value ||
      showViewBookingModal.value ||
      showCancelModal.value ||
      showEditModal.value ||
      showReceiptModal.value ||
      showProofPreview.value
    )

    watch(
      isAnyModalOpen,
      (open) => {
        document.body.classList.toggle('app-modal-open', open)
        document.documentElement.classList.toggle('app-modal-open', open)
        document.body.style.overflow = open ? 'hidden' : ''
      },
      { immediate: true }
    )

    onUnmounted(() => {
      if (bookingsRefreshInterval) {
        clearInterval(bookingsRefreshInterval)
        bookingsRefreshInterval = null
      }
      clearBookingAlertTimers()
      document.body.classList.remove('app-modal-open')
      document.documentElement.classList.remove('app-modal-open')
      document.body.style.overflow = ''
    })

    return {
      // Stores
      authStore,
      isLight,
      // State
      highlightedBookingId,
      highlightedHistoryKey,
      showBookingModal,
      showViewBookingModal,
      showCancelModal,
      showEditModal,
      bookingToCancel,
      bookingToEdit,
      successMessage,
      bookingFilter,
      showDownPaymentStatusFilters,
      machineryTypeFilter,
      machinerySearch,
      bookingForm,
      canCreateOnBehalf,
      bookableFarmers,
      farmerSearchQuery,
      showFarmerPicker,
      farmerPickerIndex,
      filteredBookableFarmers,
      openFarmerPicker,
      onFarmerSearchInput,
      onFarmerSearchKeydown,
      closeFarmerPickerSoon,
      selectFarmerForBooking,
      onSelectedFarmerChange,
      showLegacyDownPaymentSection,
      bookingDownPercent,
      bookingDownAmount,
      isMachineDownPaymentOn,
      machineDownPaymentPercent,
      selectedMachineDownPaymentOn,
      selectedMachineDownPaymentPercent,
      selectedMachineDownPaymentAmount,
      canPayBookingGcash,
      showBookingGcashPanel,
      onGcashProofSubmitted,
      onGcashPayError,
      bookingTableColspan,
      bookNowDisabled,
      bookNowLabel,
      bookNowTitle,
      isMachinePrerequisiteLocked,
      isBookButtonDisabled,
      bookButtonLabel,
      bookButtonTitle,
      bookNowLabel,
      bookNowTitle,
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
      selectedDateRemainingCapacity,
      selectedDateBookedCapacity,
      formatCapacityAmount,
      canShiftBookingMonth,
      shiftBookingMonth,
      canShiftEditMonth,
      shiftEditMonth,
      selectBookingCalendarDate,
      selectEditCalendarDate,
      // Computed
      distinctMachineryTypes,
      availableMachinery,
      machineryOptions,
      loading,
      error,
      minDate,
      myBookingsCount,
      pendingBookingsCount,
      approvedBookingsCount,
      assignedToOperatorCount,
      expiredBookingsCount,
      completedBookingsCount,
      rejectedBookingsCount,
      filteredBookings,
      selectedMachineryForBooking,
      selectedBooking,
      gcashPanelKey,
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
      balanceSubmissions,
      showDownPaymentSubmittedInfo,
      showPaymentHistorySection,
      refundReceiptNumber,
      isOfficialReceipt,
      paymentProofUrl,
      formatPaymentType,
      historyRowKey,
      formatHistoryAmount,
      viewBookingReceipt,
      closeReceiptModal,
      showReceiptModal,
      lastReceipt,
      receiptAutoPrint,
      openProofPreview,
      closeProofPreview,
      showProofPreview,
      proofPreviewSrc,
      getImageUrl,
      showRefundRequestForm,
      refundReason,
      refundReviewHint,
      submittingRefund,
      submitRefundRequest,
      // Pricing helpers
      isNonMember,
      getEffectivePricePerUnit,
      isCrossBarangayMachine,
      usesNonMemberRate,
      parseCapacity
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

.payments-table tr.notification-highlight-row {
  border: 2px solid #ef4444 !important;
}

@keyframes highlightRowPulse {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.2); }
  50% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.55); }
}

.page-container.machinery-booking-page {
  --surface-1: rgba(28, 42, 33, 0.92);
  --surface-2: rgba(24, 39, 30, 0.92);
  --line-soft: rgba(190, 235, 203, 0.14);
  --line-strong: rgba(187, 227, 196, 0.35);
  --text-main: #eefde6;
  --text-muted: rgba(229, 235, 231, 0.82);
  --text-soft: rgba(229, 235, 231, 0.65);
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
  font-size: 16px;
  line-height: 1.5;
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

.page-header {
  margin-bottom: 24px;
}

.page-header-split {
  margin-bottom: 2rem;
  padding: 1.25rem 1.4rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
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
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.35rem;
  color: #eefde6;
}

.page-subtitle {
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
  color: rgba(229, 235, 231, 0.82);
}

/* Management-aligned tools card */
.tools-card {
  --tools-h: 38px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  background: rgba(28, 42, 33, 0.85);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22), inset 1px 1px 0 rgba(255, 255, 255, 0.04);
}

.tools-card-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.search-bar {
  position: relative;
  flex: 1;
  min-width: 0;
  height: var(--tools-h);
}

.search-icon-wrap {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2.25rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(186, 240, 200, 0.55);
  pointer-events: none;
  z-index: 1;
}

.search-svg {
  display: block;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.toolbar-input,
.toolbar-select {
  width: 100%;
  height: var(--tools-h);
  min-height: var(--tools-h);
  max-height: var(--tools-h);
  padding: 0 0.85rem;
  border-radius: 9px;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.2;
  background-color: rgba(0, 0, 0, 0.24);
  color: #eefde6;
  border: 1px solid rgba(190, 235, 203, 0.24);
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.toolbar-input::placeholder {
  color: rgba(229, 235, 231, 0.5);
  font-weight: 400;
  opacity: 1;
}

.toolbar-select {
  cursor: pointer;
  min-width: 0;
  appearance: none;
  -webkit-appearance: none;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23a7f3c8' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 0.65rem center;
  padding-right: 1.85rem;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
}

.search-input-main {
  padding-left: 2.25rem;
  padding-right: 0.85rem;
}

.toolbar-input:focus,
.toolbar-select:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.55);
}

.toolbar-select option {
  background: #132119;
  color: #eefde6;
}

.filter-group {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  width: 100%;
}

.filter-group-1 {
  grid-template-columns: minmax(0, 1fr);
}

.filter-group-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bookings-tools-card {
  margin-bottom: 0.85rem;
}

.bookings-mobile-list {
  display: none;
}

.inv2-empty {
  text-align: center;
  padding: 1.75rem 1rem;
  color: rgba(200, 235, 210, 0.55);
  font-size: 0.88rem;
  font-weight: 600;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-height: 120px;
}

.inv2-mobile-list {
  display: none;
}

.machinery-action-text {
  display: none;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
  min-height: 36px;
  padding: 0.42rem 0.55rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  margin: 0 !important;
  text-align: center;
  border: 1.5px solid transparent;
}

.machinery-action-view-text {
  color: #dbeafe;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(96, 165, 250, 0.45);
}

.machinery-action-edit-text {
  color: #ffedd5;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(251, 146, 60, 0.45);
}

.machinery-action-delete-text {
  color: #fecaca;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(248, 113, 113, 0.45);
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
  cursor: default;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

@media (min-width: 900px) {
  .stats-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .stats-grid.booking-stats {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .stats-grid.booking-stats {
    grid-template-columns: repeat(7, minmax(0, 1fr));
  }
}

.stat-card {
  border-radius: 14px;
  padding: 16px 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  cursor: default;
  pointer-events: none;
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

.stat-label {
  color: rgba(220, 238, 211, 0.74);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.4px;
  margin-bottom: 4px;
  text-align: center;
}

.stat-value {
  font-size: 1.65rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  text-align: center;
}

.stat-pending { border-left: 4px solid rgba(251, 191, 36, 0.92); }
.stat-success { border-left: 4px solid rgba(74, 222, 128, 0.92); }
.stat-assigned { border-left: 4px solid rgba(45, 212, 191, 0.92); }
.stat-expired { border-left: 4px solid rgba(148, 163, 184, 0.92); }
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
  padding: 14px 16px;
  margin-bottom: 18px;
  display: flex;
  gap: 12px;
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

.prerequisite-lock-hint {
  margin: 0.5rem 0 0;
  font-size: 0.82rem;
  line-height: 1.35;
  color: #fbbf24;
}

.btn-book:disabled:hover {
  background: #475569;
  transform: none;
}

.section {
  margin-bottom: 28px;
  padding: 26px 28px 28px;
  border-radius: 14px;
  background: rgba(28, 42, 33, 0.72);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.22), inset 1px 1px 0 rgba(255, 255, 255, 0.04);
}

.section-title {
  margin: 0 0 18px;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.3px;
  color: #eefde6;
}

.machinery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr));
  grid-auto-rows: 1fr;
  align-items: stretch;
  gap: 20px;
  margin-bottom: 40px;
}

.machinery-card {
  background: #1f3024;
  border-radius: 12px;
  padding: 16px;
  border: 1px solid rgba(255, 255, 255, 0.07);
  box-shadow:
    14px 14px 26px rgba(8, 13, 10, 0.55),
    -12px -12px 24px rgba(43, 62, 47, 0.52),
    inset -1px -1px 0 rgba(0,0,0,0.36);
  transition: transform 0.2s;
  box-sizing: border-box;
  min-width: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.machinery-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

.machinery-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 10px;
  min-height: 32px;
  margin-bottom: 10px;
}

.machinery-title {
  min-width: 0;
  font-size: 16px;
  line-height: 1.25;
  font-weight: 700;
  color: #ecfbe2;
  margin: 0;
  overflow-wrap: anywhere;
}

.machinery-header .badge {
  flex: 0 0 auto;
  max-width: 45%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.machinery-description {
  color: rgba(236, 252, 231, 0.82);
  font-size: 12.5px;
  line-height: 1.4;
  margin: 0 0 10px;
  min-height: 35px;
  max-height: 35px;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  overflow: hidden;
}

.machinery-details {
  display: grid;
  gap: 0;
  margin-bottom: 12px;
}

.detail-row {
  display: grid;
  grid-template-columns: minmax(78px, 0.8fr) minmax(0, 1.2fr);
  align-items: start;
  gap: 10px;
  min-height: 31px;
  padding: 6px 0;
  border-bottom: 1px solid rgba(148, 163, 184, 0.13);
}

.detail-row:last-child {
  border-bottom: 0;
}

.detail-label {
  color: rgba(220, 238, 211, 0.76);
  font-size: 12px;
  line-height: 1.35;
  font-weight: 600;
}

.detail-value {
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
  font-size: 13px;
  line-height: 1.35;
  font-weight: 600;
  color: #f2ffe8;
}

.detail-row .status-badge {
  justify-self: end;
  white-space: nowrap;
}

.detail-value.non-member-rate {
  font-size: 12px;
  line-height: 1.3;
}

.rate-hint {
  display: block;
  font-size: 0.68rem;
  font-weight: 600;
  opacity: 0.75;
  margin-top: 0.1rem;
}

.btn-book {
  width: 100%;
  min-height: 40px;
  margin-top: auto;
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
  height: auto;
  aspect-ratio: 4 / 3;
  background: #e5e7eb;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 10px;
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
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: #2a3d30;
  color: #ecfbe2;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-icon-small:hover {
  background: #324a3b;
}

.down-payment-status {
  margin-top: 12px;
  padding-top: 8px;
  border-top: 1px dashed rgba(255, 255, 255, 0.15);
}

.dp-row-action {
  align-items: center;
}

.down-payment-status .btn-text-action {
  background: transparent;
  border: none;
  color: #7dd3fc;
  cursor: pointer;
  font-weight: 600;
  padding: 0;
  text-decoration: underline;
}

.receipt-modal-overlay {
  z-index: 12000 !important;
  align-items: center !important;
  justify-content: center !important;
  padding: max(0.5rem, env(safe-area-inset-top, 0px))
    max(0.5rem, env(safe-area-inset-right, 0px))
    max(0.5rem, env(safe-area-inset-bottom, 0px))
    max(0.5rem, env(safe-area-inset-left, 0px)) !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
}

.receipt-modal-content,
.receipt-modal-box {
  width: min(440px, calc(100vw - 1.25rem)) !important;
  max-width: min(440px, calc(100vw - 1.25rem)) !important;
  max-height: none !important;
  height: auto !important;
  overflow: visible !important;
  display: block !important;
  background: #ffffff !important;
  border-radius: 10px !important;
  padding: 8px 10px !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.32) !important;
  box-sizing: border-box !important;
  border: none !important;
  margin: auto !important;
  flex-shrink: 0 !important;
}

.receipt-modal-content :deep(.receipt-print-root),
.receipt-modal-box :deep(.receipt-print-root) {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
  gap: 8px;
}

.receipt-modal-content :deep(.payment-receipt),
.receipt-modal-box :deep(.payment-receipt) {
  width: 100%;
  max-width: 100%;
  overflow: visible !important;
}

.receipt-modal-content :deep(.receipt-actions),
.receipt-modal-box :deep(.receipt-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
  padding-top: 0.25rem;
  position: static;
  background: transparent;
}

.receipt-view-btn {
  font-weight: 700;
  letter-spacing: 0.02em;
}

.btn-text-action {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.02em;
  padding: 6px 10px;
}

@media (max-width: 420px) {
  .receipt-modal-content,
  .receipt-modal-box {
    width: calc(100vw - 1rem) !important;
    max-width: calc(100vw - 1rem) !important;
    padding: 6px 8px !important;
  }

  .receipt-modal-content :deep(.receipt-actions),
  .receipt-modal-box :deep(.receipt-actions) {
    justify-content: stretch;
  }

  .receipt-modal-content :deep(.btn-print),
  .receipt-modal-content :deep(.btn-close),
  .receipt-modal-box :deep(.btn-print),
  .receipt-modal-box :deep(.btn-close) {
    flex: 1 1 auto;
  }
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

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
  border-radius: 6px;
  line-height: 1.2;
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

.cal-availability-hint {
  margin: 10px 0 0;
  padding: 10px 12px;
  border-radius: 10px;
  background: rgba(22, 163, 74, 0.16);
  border: 1px solid rgba(74, 222, 128, 0.35);
  color: #dcfce7;
  font-size: 13px;
  line-height: 1.4;
}

.cal-availability-hint--low {
  background: rgba(220, 38, 38, 0.16);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fecaca;
}

.cal-availability-meta {
  opacity: 0.85;
  font-size: 12px;
  margin-left: 4px;
}

@media (max-width: 640px) {
  .cal-availability-hint {
    font-size: 12.5px;
  }

  .cal-availability-meta {
    display: block;
    margin: 4px 0 0;
  }
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

.farmer-combobox-wrap {
  position: relative;
}

.farmer-combobox-list {
  position: absolute;
  z-index: 40;
  left: 0;
  right: 0;
  top: calc(100% + 4px);
  max-height: 220px;
  overflow-y: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  background: #1c2a21;
  border: 1px solid rgba(190, 235, 203, 0.22);
  border-radius: 8px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.35);
}

.farmer-combobox-option {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  color: #ecfbe2;
}

.farmer-combobox-option small {
  color: rgba(209, 250, 229, 0.7);
  font-size: 12px;
}

.farmer-combobox-option:hover,
.farmer-combobox-option.active {
  background: rgba(74, 222, 128, 0.16);
}

.farmer-combobox-option.selected {
  background: rgba(34, 197, 94, 0.22);
}

.farmer-combobox-empty {
  padding: 10px;
  color: rgba(209, 250, 229, 0.7);
  font-size: 13px;
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
  background: rgba(8, 28, 20, 0.72);
  border-left: 4px solid #38bdf8;
  padding: 16px;
  border-radius: 8px;
}

.machinery-info-box h4 {
  margin: 0 0 12px 0;
  color: #7dd3fc;
}

.machinery-info-box p,
.machinery-info-box strong {
  margin: 8px 0;
  color: #e0f2fe;
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

/* Compact booking form: keep the calendar and related fields visible
   together on desktop without excessive vertical scrolling. */
.booking-form-modal {
  max-width: 920px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.booking-form-modal .modal-header {
  padding: 14px 18px;
  flex-shrink: 0;
}

.booking-form-modal .modal-body {
  padding: 14px 18px 16px;
  max-height: none;
  min-height: 0;
  flex: 1 1 auto;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.booking-form-compact {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: none;
  column-gap: 12px;
  row-gap: 10px;
  align-items: start;
}

.booking-form-compact.is-machinery-ready {
  grid-template-columns: minmax(280px, 1.1fr) minmax(240px, 0.9fr);
}

.booking-form-compact > .form-group,
.booking-form-compact .form-row > .form-group {
  margin-bottom: 0;
}

.booking-form-compact > .farmer-combobox,
.booking-form-compact > .booking-machine-group,
.booking-form-compact > .modal-actions {
  grid-column: 1 / -1;
}

.booking-form-compact.is-machinery-ready .booking-machine-group {
  grid-row: auto;
}

.booking-form-compact.is-machinery-ready .booking-date-group {
  grid-column: 1;
  align-self: start;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) .booking-machine-group {
  grid-row: 1;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) .booking-machine-group {
  grid-row: 2;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) .booking-date-group {
  grid-row: 2 / span 5;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) .booking-date-group {
  grid-row: 3 / span 5;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) .booking-machine-summary {
  grid-column: 2;
  grid-row: 2;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) .booking-machine-summary {
  grid-column: 2;
  grid-row: 3;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) .booking-location-group {
  grid-column: 2;
  grid-row: 3;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) .booking-location-group {
  grid-column: 2;
  grid-row: 4;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) .booking-capacity-row {
  grid-column: 2;
  grid-row: 4;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) .booking-capacity-row {
  grid-column: 2;
  grid-row: 5;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) .booking-notes-group {
  grid-column: 2;
  grid-row: 5;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) .booking-notes-group {
  grid-column: 2;
  grid-row: 6;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) > .price-summary {
  grid-column: 2;
  grid-row: 6;
  margin-top: 0;
  padding: 10px 12px;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) > .price-summary {
  grid-column: 2;
  grid-row: 7;
  margin-top: 0;
  padding: 10px 12px;
}

.booking-form-compact.is-machinery-ready:not(:has(.farmer-combobox)) > .modal-actions {
  grid-row: 7;
}

.booking-form-compact.is-machinery-ready:has(.farmer-combobox) > .modal-actions {
  grid-row: 8;
}

.booking-form-compact > .price-summary {
  grid-column: 1 / -1;
  margin-top: 0;
  padding: 10px 12px;
}

.booking-form-compact > .modal-actions {
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid rgba(148, 163, 184, 0.22);
}

.booking-form-compact .form-label {
  margin-bottom: 4px;
  font-size: 13px;
}

.booking-form-compact .form-input {
  padding: 8px 11px;
  min-height: 38px;
}

.booking-form-compact textarea.form-input {
  min-height: 62px;
  height: 62px;
  resize: vertical;
}

.booking-form-compact .form-hint {
  margin-top: 2px;
  line-height: 1.25;
}

.booking-form-compact .machinery-info-box {
  padding: 10px 12px;
  border-left-width: 3px;
}

.booking-form-compact .machinery-info-box h4 {
  margin: 0 0 5px;
  font-size: 14px;
}

.booking-form-compact .machinery-info-box p {
  margin: 3px 0;
  font-size: 12px;
  line-height: 1.35;
}

.booking-form-compact .booking-date-calendar {
  margin-top: 3px;
  padding: 8px;
}

.booking-form-compact .cal-nav {
  margin-bottom: 6px;
}

.booking-form-compact .cal-nav-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
}

.booking-form-compact .cal-weekdays {
  margin-bottom: 4px;
}

.booking-form-compact .cal-grid {
  gap: 3px;
}

.booking-form-compact .cal-cell {
  min-height: 36px;
  padding: 3px 2px 4px;
  border-radius: 7px;
}

.booking-form-compact .cal-day-num {
  font-size: 12px;
}

.booking-form-compact .cal-selected-hint {
  margin-top: 6px;
  font-size: 12px;
}

.booking-form-compact .total-price {
  font-size: 19px;
}

@media (max-width: 760px) {
  .booking-form-modal {
    width: 100%;
    max-height: none;
    overflow: hidden;
  }

  .booking-form-compact {
    display: grid;
    grid-template-columns: 1fr;
    row-gap: 10px;
  }

  .booking-form-compact > * {
    grid-column: 1 !important;
    grid-row: auto !important;
  }

  .booking-form-compact .form-row {
    grid-template-columns: 1fr 1fr;
    gap: 10px;
  }
}

@media (max-width: 480px) {
  .booking-form-modal .modal-header,
  .booking-form-modal .modal-body {
    padding-left: 12px;
    padding-right: 12px;
  }

  .booking-form-compact .form-row {
    grid-template-columns: 1fr;
  }

  .booking-form-compact .cal-cell {
    min-height: 34px;
  }
}

.booking-details {
  display: flex;
  flex-direction: column;
  gap: 24px;
}


.down-payment-box {
  background: rgba(0, 0, 0, 0.2);
  border-radius: 8px;
  padding: 12px 16px;
  margin-bottom: 16px;
}
.dp-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.dp-hint {
  font-size: 13px;
  color: #b8d4a8;
  margin-bottom: 12px;
}
.dp-hint-error {
  color: #fca5a5;
}
.dp-on-badge {
  font-weight: 700;
  color: #fde68a;
}
.dp-preview-row {
  margin-top: 0.35rem;
}
.dp-hint-warn {
  color: #fbbf24;
}
.gcash-qr {
  max-width: 200px;
  margin: 12px 0;
  border-radius: 8px;
}
.down-payment-form .btn-primary {
  margin-top: 12px;
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
  border: 1px solid transparent;
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
  border: 1px solid transparent;
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

/* ===== LIGHT MODE — colors only (layout matches dark) ===== */
.machinery-booking-page.light-theme {
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --line-soft: #bbf7d0;
  --line-strong: #86efac;
  --surface-1: #ffffff;
  --surface-2: #f8fdf9;
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%) !important;
  color: var(--text-main) !important;
}

.machinery-booking-modal.light-theme {
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --line-soft: #bbf7d0;
  --line-strong: #86efac;
  --surface-1: #ffffff;
  --surface-2: #f8fdf9;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .page-header-split::before {
  background: radial-gradient(circle, rgba(74, 222, 128, 0.14) 0%, transparent 68%);
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .page-header-split::after {
  background: linear-gradient(90deg, rgba(22, 101, 52, 0.35), rgba(134, 239, 172, 0.12));
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .page-title {
  color: #052e16 !important;
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .page-subtitle {
  color: #14532d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .stats-group-title {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .payment-group {
  border-top-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .glass-stat-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .stat-label {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .stat-value,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .stat-outstanding .stat-value {
  color: #052e16 !important;
  text-shadow: none !important;
  -webkit-text-fill-color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .outstanding-warning {
  background: linear-gradient(135deg, #fff1f2 0%, #ffe4e6 100%) !important;
  border-color: #fecaca !important;
  border-left-color: #ef4444 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .warning-content h3 {
  color: #991b1b !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .warning-content p {
  color: #7f1d1d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .section {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .section-title {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .tools-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .search-icon-wrap {
  color: #15803d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .toolbar-input,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .toolbar-select {
  background-color: #ffffff !important;
  color: #052e16 !important;
  border-color: #94a3b8 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .toolbar-input::placeholder {
  color: #64748b !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .toolbar-select {
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%23166534' stroke-width='2.5'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E");
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .toolbar-select option {
  background: #ffffff;
  color: #052e16;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .detail-row {
  border-bottom-color: #dcfce7 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-title {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-description,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .detail-label,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .rate-hint {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .detail-value {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-picture-container {
  background: #f1f5f9 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-picture-placeholder {
  color: #64748b !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .filter-select,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .form-input,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-form-compact .form-input {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #cbd5e1 !important;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .filter-select:focus,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .form-input:focus {
  border-color: #22c55e !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .form-input.input-readonly {
  background: #f8fafc !important;
  color: #334155 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .farmer-combobox-list {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.12);
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .farmer-combobox-option {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .farmer-combobox-option small,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .farmer-combobox-empty {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .farmer-combobox-option:hover,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .farmer-combobox-option.active {
  background: #dcfce7 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .farmer-combobox-option.selected {
  background: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .form-label,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-form-compact .form-label {
  color: #14532d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .form-hint,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-form-compact .form-hint {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table-container {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 4px 16px rgba(22, 101, 52, 0.08) !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table th {
  color: #052e16 !important;
  border-bottom-color: #86efac !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table th:not(:last-child),
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table td:not(:last-child) {
  border-right-color: #e2e8f0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table td {
  color: #14532d !important;
  border-bottom-color: #e2e8f0 !important;
  background: #ffffff !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table tbody tr:nth-child(even) td {
  background: #f8fdf9 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table tbody tr:hover td {
  background: #ecfdf5 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-machinery small {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .price-cell {
  color: #15803d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .btn-icon-small {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .btn-icon-small:hover {
  background: #dcfce7 !important;
  border-color: #16a34a !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .btn-secondary {
  background: #e2e8f0 !important;
  color: #1e293b !important;
}

.receipt-modal-overlay.light-theme .receipt-modal-box,
.receipt-modal-overlay.light-theme .receipt-modal-content {
  background: #ffffff !important;
  border: 1px solid #bbf7d0;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .modal-overlay {
  background: rgba(15, 23, 42, 0.42) !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .modal-content {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 20px 50px rgba(22, 101, 52, 0.18) !important;
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .modal-header {
  border-bottom-color: #bbf7d0 !important;
  background: #ffffff !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .modal-header h2 {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .modal-close {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .modal-body {
  background: #ffffff !important;
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .detail-section h3 {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .detail-item label {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .detail-item span:not(.badge):not(.status-badge):not(.payment-badge) {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .down-payment-box {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .dp-row {
  border-bottom-color: #d1fae5 !important;
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .dp-hint {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .down-payment-status {
  border-top-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .down-payment-status .btn-text-action {
  color: #15803d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .price-highlight,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .total-price,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-form-compact .total-price {
  color: #15803d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .notes-text,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-summary,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .price-summary {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  border-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-summary p {
  color: #14532d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .payments-table-wrap {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .payments-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .payments-table td {
  color: #14532d !important;
  border-bottom-color: #e2e8f0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .empty-payments,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .loading-container,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .empty-state,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .loading-cell,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .empty-cell {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .empty-icon {
  border-color: #86efac !important;
  background: #f0fdf4 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .loading-spinner {
  border-color: #bbf7d0 !important;
  border-top-color: #16a34a !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-nav-title,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-selected-hint,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-weekdays {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-availability-hint {
  background: rgba(22, 163, 74, 0.1) !important;
  border-color: rgba(22, 163, 74, 0.3) !important;
  color: #14532d !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-availability-hint--low {
  background: rgba(220, 38, 38, 0.1) !important;
  border-color: rgba(220, 38, 38, 0.28) !important;
  color: #991b1b !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-nav-btn {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-cell {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-cell--selected {
  background: #22c55e !important;
  color: #ffffff !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-cell--full,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .cal-cell--disabled {
  background: #f1f5f9 !important;
  color: #94a3b8 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-date-calendar {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .balance-unpaid {
  color: #b91c1c !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-info-box {
  background: #eff6ff !important;
  border-left-color: #3b82f6 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-info-box h4 {
  color: #1e40af !important;
  -webkit-text-fill-color: #1e40af !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-info-box p,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-info-box strong {
  color: #1e3a8a !important;
  -webkit-text-fill-color: #1e3a8a !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .modal-actions,
:is(.machinery-booking-page, .machinery-booking-modal).light-theme .booking-form-compact > .modal-actions {
  background: #f8fafc !important;
  border-top-color: #e2e8f0 !important;
}

@media (max-width: 1200px) {
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  .page-container.machinery-booking-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    padding: 0.75rem;
    border-radius: 0;
  }

  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas:
      "title"
      "subtitle";
    align-items: start;
    column-gap: 0.65rem;
    row-gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.85rem;
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
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
  }

  .page-subtitle {
    grid-area: subtitle;
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
  }

  .tools-card {
    --tools-h: 36px;
    gap: 0.5rem;
    padding: 0.65rem 0.7rem;
    margin-bottom: 0.75rem;
  }

  .tools-card-top {
    align-items: center;
    gap: 0.45rem;
  }

  .search-bar {
    height: var(--tools-h);
  }

  .search-icon-wrap {
    width: 2.1rem;
  }

  .search-svg {
    width: 0.95rem;
    height: 0.95rem;
  }

  .tools-card .toolbar-input,
  .tools-card .toolbar-select {
    height: var(--tools-h);
    min-height: var(--tools-h);
    max-height: var(--tools-h);
    font-size: 0.82rem;
    border-radius: 8px;
    font-weight: 500;
  }

  .tools-card .search-input-main {
    padding-left: 2.1rem;
  }

  .tools-card .toolbar-select {
    padding-left: 0.55rem;
    padding-right: 1.55rem;
    background-position: right 0.45rem center;
  }

  .filter-group {
    gap: 0.4rem;
  }

  .filter-group-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .stats-group {
    margin-bottom: 0.65rem;
  }

  .stats-group-title {
    font-size: 0.65rem;
    margin-bottom: 0.45rem;
    text-align: left;
  }

  .stats-grid,
  .stats-grid.payment-stats {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0.5rem;
    margin-bottom: 0.55rem;
  }

  .stat-card {
    padding: 0.65rem 0.55rem 0.55rem;
    border-radius: 10px;
    min-width: 0;
  }

  .stat-label {
    font-size: 0.58rem;
    margin-bottom: 0.15rem;
    letter-spacing: 0.02em;
    line-height: 1.2;
  }

  .stat-value {
    font-size: 1.05rem;
    word-break: break-word;
  }

  .payment-group {
    padding-top: 0.65rem;
    margin-top: 0.35rem;
  }

  .outstanding-warning {
    padding: 0.75rem 0.85rem;
    margin-bottom: 0.85rem;
    gap: 0.65rem;
    border-radius: 12px;
  }

  .warning-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .warning-content h3 {
    font-size: 0.95rem;
  }

  .section {
    border-radius: 14px;
    padding: 12px;
    margin-bottom: 14px;
  }

  .section-title {
    font-size: 1.05rem;
    margin-bottom: 10px;
  }

  .bookings-section {
    padding: 0.75rem 0.7rem 0.85rem;
    margin-bottom: 0.85rem;
  }

  .bookings-tools-card {
    margin-bottom: 0.65rem;
  }

  .machinery-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    margin-bottom: 0.5rem;
  }

  .machinery-card {
    padding: 0.75rem;
    border-radius: 12px;
  }

  .btn-book {
    min-height: 36px;
    padding: 0.55rem 0.75rem;
    border-radius: 9px;
    font-size: 0.85rem;
  }

  .bookings-desktop-table {
    display: none !important;
  }

  .bookings-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
  }

  .bookings-table-wrap {
    overflow: visible;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0;
  }

  .inv2-mobile-card {
    padding: 0.7rem 0.75rem 0.65rem;
    border-radius: 12px;
    border: 1px solid rgba(167, 211, 178, 0.22);
    background: rgba(0, 0, 0, 0.16);
  }

  .inv2-mobile-card-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.5rem;
    margin-bottom: 0.45rem;
  }

  .inv2-mobile-card-name {
    margin: 0;
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1.25;
    color: var(--text-main, #ecfdf5);
    word-break: break-word;
  }

  .inv2-mobile-card-meta {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
    margin-bottom: 0.55rem;
  }

  .inv2-mobile-meta-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    font-size: 0.78rem;
    line-height: 1.3;
  }

  .inv2-mobile-label {
    flex-shrink: 0;
    min-width: 4.8rem;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: rgba(229, 235, 231, 0.55);
  }

  .inv2-mobile-card-actions.action-buttons {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(190, 235, 203, 0.12);
  }

  .inv2-mobile-card-actions .machinery-action-text {
    display: inline-flex !important;
  }

  .form-row,
  .details-grid {
    grid-template-columns: 1fr;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-card {
    background: #ffffff !important;
    border-color: #bbf7d0 !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-card-name {
    color: #052e16 !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-label {
    color: #64748b !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-card-actions {
    border-top-color: #bbf7d0 !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table-wrap {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-action-view-text {
    color: #1e40af !important;
    background: #eff6ff !important;
    border-color: #93c5fd !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-action-edit-text {
    color: #9a3412 !important;
    background: #fff7ed !important;
    border-color: #fdba74 !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-action-delete-text {
    color: #991b1b !important;
    background: #fef2f2 !important;
    border-color: #fca5a5 !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .glass-stat-card {
    background: #ffffff !important;
    border-color: #86efac !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .stat-label {
    color: #166534 !important;
  }

  :is(.machinery-booking-page, .machinery-booking-modal).light-theme .stat-value {
    color: #052e16 !important;
    -webkit-text-fill-color: #052e16 !important;
  }
}

@media (max-width: 480px) {
  .page-container.machinery-booking-page {
    padding: 0.65rem;
  }

  .tools-card {
    --tools-h: 34px;
    padding: 0.55rem 0.6rem;
    gap: 0.45rem;
  }

  .filter-group {
    gap: 0.35rem;
  }

  .page-title {
    font-size: 1.1rem !important;
  }
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-card-name {
  color: #052e16 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-label {
  color: #64748b !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-mobile-card-actions {
  border-top-color: #bbf7d0 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .inv2-empty {
  color: #166534 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-action-view-text {
  color: #1e40af !important;
  background: #eff6ff !important;
  border-color: #93c5fd !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-action-edit-text {
  color: #9a3412 !important;
  background: #fff7ed !important;
  border-color: #fdba74 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .machinery-action-delete-text {
  color: #991b1b !important;
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
}

:is(.machinery-booking-page, .machinery-booking-modal).light-theme .bookings-table-wrap {
  background: transparent;
}

.booking-alert-stack {
  position: fixed;
  inset: 0;
  z-index: 14000 !important;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  pointer-events: none;
}

.alert {
  position: relative;
  top: auto;
  left: auto;
  transform: none;
  padding: 16px 20px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 300px;
  max-width: min(440px, calc(100vw - 2rem));
  box-shadow: 0 4px 12px rgba(0,0,0,0.35);
  z-index: 14000;
  pointer-events: auto;
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

<style>
/* Teleported booking alerts — centered on screen above modals */
.booking-alert-stack {
  position: fixed !important;
  inset: 0 !important;
  z-index: 14000 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 16px !important;
  pointer-events: none !important;
}

.booking-alert-stack .alert {
  position: relative !important;
  top: auto !important;
  left: auto !important;
  transform: none !important;
  padding: 1rem 1.15rem !important;
  border-radius: 12px !important;
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  gap: 12px !important;
  min-width: min(300px, calc(100vw - 2rem)) !important;
  max-width: min(440px, calc(100vw - 2rem)) !important;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.4) !important;
  z-index: 14001 !important;
  pointer-events: auto !important;
  font-size: 0.95rem !important;
  line-height: 1.4 !important;
  font-weight: 600 !important;
}

.booking-alert-stack .alert-error {
  background: linear-gradient(145deg, rgba(127, 29, 29, 0.96), rgba(69, 10, 10, 0.94)) !important;
  color: #fff7f7 !important;
  border: 1px solid rgba(248, 113, 113, 0.45) !important;
  border-left: 4px solid #f87171 !important;
}

.booking-alert-stack .alert-success {
  background: linear-gradient(145deg, rgba(21, 128, 61, 0.96), rgba(20, 83, 45, 0.94)) !important;
  color: #f0fdf4 !important;
  border: 1px solid rgba(74, 222, 128, 0.45) !important;
  border-left: 4px solid #4ade80 !important;
}

.booking-alert-stack.light-theme .alert-error {
  background: #fff1f2 !important;
  color: #9f1239 !important;
  border-color: #fda4af !important;
}

.booking-alert-stack.light-theme .alert-success {
  background: #f0fdf4 !important;
  color: #14532d !important;
  border-color: #86efac !important;
}

.booking-alert-stack .alert-close {
  background: none !important;
  border: none !important;
  font-size: 1.25rem !important;
  cursor: pointer !important;
  color: inherit !important;
  opacity: 0.85 !important;
  line-height: 1 !important;
  padding: 0 0.15rem !important;
}

.booking-alert-stack .alert-close:hover {
  opacity: 1 !important;
}

/* Teleported booking modals — above header, centered, viewport-safe */
.modal-overlay.app-modal-overlay.machinery-booking-modal {
  z-index: 11050 !important;
  align-items: center !important;
  justify-content: center !important;
  padding: max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px)) !important;
}

.modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content {
  margin: auto !important;
  max-height: min(88dvh, calc(100dvh - 1.5rem));
}

.modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content.receipt-modal-content,
.modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content.receipt-modal-box,
.modal-overlay.app-modal-overlay.machinery-booking-modal.mf-receipt-overlay .receipt-modal-box {
  max-height: none !important;
  height: auto !important;
  overflow: visible !important;
  display: block !important;
  width: min(440px, calc(100vw - 1.25rem)) !important;
  max-width: min(440px, calc(100vw - 1.25rem)) !important;
  background: #ffffff !important;
  padding: 8px 10px !important;
}

.modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content.booking-form-modal {
  width: min(57.5rem, calc(100vw - 1.5rem)) !important;
  max-width: min(57.5rem, calc(100vw - 1.5rem)) !important;
}

.modal-overlay.app-modal-overlay.machinery-booking-modal.light-theme {
  background: rgba(15, 23, 42, 0.45) !important;
}

.machinery-booking-modal:not(.light-theme) .machinery-info-box {
  background: rgba(8, 28, 20, 0.85) !important;
  border-left: 4px solid #38bdf8 !important;
}

.machinery-booking-modal:not(.light-theme) .machinery-info-box h4 {
  color: #7dd3fc !important;
  -webkit-text-fill-color: #7dd3fc !important;
}

.machinery-booking-modal:not(.light-theme) .machinery-info-box p,
.machinery-booking-modal:not(.light-theme) .machinery-info-box strong,
.machinery-booking-modal:not(.light-theme) .machinery-info-box span {
  color: #e0f2fe !important;
  -webkit-text-fill-color: #e0f2fe !important;
}

.machinery-booking-modal.light-theme .machinery-info-box {
  background: #eff6ff !important;
  border-left-color: #3b82f6 !important;
}

.machinery-booking-modal.light-theme .machinery-info-box h4 {
  color: #1e40af !important;
  -webkit-text-fill-color: #1e40af !important;
}

.machinery-booking-modal.light-theme .machinery-info-box p,
.machinery-booking-modal.light-theme .machinery-info-box strong {
  color: #1e3a8a !important;
  -webkit-text-fill-color: #1e3a8a !important;
}

.machinery-booking-modal:not(.light-theme) .badge-primary {
  background: rgba(37, 99, 235, 0.28) !important;
  color: #bfdbfe !important;
  border-color: rgba(96, 165, 250, 0.45) !important;
}

.machinery-booking-modal:not(.light-theme) .badge-warning {
  background: rgba(180, 83, 9, 0.32) !important;
  color: #fde68a !important;
  border-color: rgba(251, 191, 36, 0.4) !important;
}

.machinery-booking-modal:not(.light-theme) .badge-info {
  background: rgba(79, 70, 229, 0.3) !important;
  color: #c7d2fe !important;
  border-color: rgba(129, 140, 248, 0.45) !important;
}

.machinery-booking-modal:not(.light-theme) .badge-success {
  background: rgba(22, 101, 52, 0.4) !important;
  color: #bbf7d0 !important;
  border-color: rgba(74, 222, 128, 0.4) !important;
}

.machinery-booking-modal:not(.light-theme) .badge-default {
  background: rgba(51, 65, 85, 0.55) !important;
  color: #e2e8f0 !important;
  border-color: rgba(148, 163, 184, 0.4) !important;
}

.machinery-booking-modal.light-theme .badge-primary {
  background: #dbeafe !important;
  color: #1e40af !important;
  border: 1px solid #93c5fd !important;
}

.machinery-booking-modal.light-theme .badge-warning {
  background: #fef3c7 !important;
  color: #92400e !important;
  border: 1px solid #f59e0b !important;
}

.machinery-booking-modal.light-theme .badge-info {
  background: #e0e7ff !important;
  color: #3730a3 !important;
  border: 1px solid #a5b4fc !important;
}

.machinery-booking-modal.light-theme .badge-success {
  background: #d1fae5 !important;
  color: #065f46 !important;
  border: 1px solid #34d399 !important;
}

.machinery-booking-modal.light-theme .badge-default {
  background: #e5e7eb !important;
  color: #374151 !important;
  border: 1px solid #cbd5e1 !important;
}

@media (max-width: 768px) {
  .modal-overlay.app-modal-overlay.machinery-booking-modal {
    padding: max(0.75rem, env(safe-area-inset-top, 0px))
      max(0.75rem, env(safe-area-inset-right, 0px))
      max(0.75rem, env(safe-area-inset-bottom, 0px))
      max(0.75rem, env(safe-area-inset-left, 0px)) !important;
  }

  .modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content,
  .modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content.booking-form-modal,
  .modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content.modal-large,
  .modal-overlay.app-modal-overlay.machinery-booking-modal .modal-content.modal-small {
    width: min(100%, calc(100vw - 1.5rem)) !important;
    max-width: min(100%, calc(100vw - 1.5rem)) !important;
    max-height: min(90dvh, calc(100dvh - 1.5rem));
  }

  .modal-overlay.app-modal-overlay.machinery-booking-modal .booking-form-compact > .modal-actions {
    position: sticky;
    bottom: 0;
    z-index: 1;
    margin-top: 0.5rem;
    padding-top: 0.75rem;
    padding-bottom: 0.15rem;
    flex-wrap: wrap;
    gap: 8px;
  }

  .modal-overlay.app-modal-overlay.machinery-booking-modal .booking-form-compact > .modal-actions .btn-primary {
    flex: 1 1 100%;
    min-width: 0;
    justify-content: center;
  }
}

/* Desktop compact — same geometry in light and dark (theme files change colors only) */
@media (min-width: 769px) {
  .page-container.machinery-booking-page {
    padding: 1.15rem 1.25rem;
  }

  .page-header {
    margin-bottom: 16px;
  }

  .page-header-split {
    margin-bottom: 1.15rem;
    padding: 0.9rem 1.1rem 0.85rem;
    border-radius: 12px !important;
    gap: 0.75rem;
  }

  .page-title {
    font-size: 1.5rem;
    margin: 0 0 0.2rem;
  }

  .page-subtitle {
    font-size: 0.85rem;
    line-height: 1.4;
  }

  .tools-card {
    --tools-h: 34px;
    gap: 0.5rem;
    margin-bottom: 0.9rem;
    padding: 0.65rem 0.75rem;
    border-radius: 10px;
  }

  .toolbar-input,
  .toolbar-select {
    font-size: 0.8rem !important;
    border-radius: 8px !important;
    min-height: 34px !important;
    height: 34px !important;
    max-height: 34px !important;
  }

  .stats-group {
    margin-bottom: 12px;
  }

  .payment-group {
    padding-top: 12px;
    margin-top: 4px;
  }

  .stats-group-title {
    font-size: 11px;
    margin-bottom: 8px;
  }

  .stats-grid {
    gap: 10px;
    margin-bottom: 12px;
  }

  .stat-card {
    padding: 10px 12px;
    border-radius: 12px !important;
  }

  .stat-label {
    font-size: 11px;
    margin-bottom: 3px;
  }

  .stat-value {
    font-size: 1.35rem;
  }

  .outstanding-warning {
    padding: 10px 12px;
    margin-bottom: 14px;
    gap: 10px;
    border-radius: 10px;
  }

  .warning-icon {
    width: 32px;
    height: 32px;
    font-size: 16px;
  }

  .warning-content h3 {
    font-size: 15px;
    margin: 0 0 6px;
  }

  .warning-content p {
    font-size: 13px;
    margin: 0 0 6px;
  }

  .unpaid-bookings-list {
    padding: 8px 10px;
    margin-top: 8px;
  }

  .unpaid-bookings-list h4 {
    font-size: 12px;
  }

  .unpaid-bookings-list li {
    padding: 5px 0;
    font-size: 12px;
  }

  .section {
    margin-bottom: 18px;
    padding: 16px 18px 16px;
    border-radius: 12px !important;
  }

  .section-title {
    margin: 0 0 12px;
    font-size: 1.15rem;
  }

  .machinery-grid {
    gap: 14px;
    margin-bottom: 20px;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 250px), 1fr));
  }

  .machinery-card {
    padding: 12px;
    border-radius: 12px !important;
  }

  .machinery-header {
    min-height: 28px;
    margin-bottom: 8px;
    gap: 8px;
  }

  .machinery-title {
    font-size: 14px;
  }

  .machinery-description {
    font-size: 12px;
    min-height: 32px;
    max-height: 32px;
    margin: 0 0 8px;
  }

  .machinery-details {
    margin-bottom: 10px;
  }

  .detail-row {
    min-height: 26px;
    padding: 4px 0;
    gap: 8px;
  }

  .detail-label {
    font-size: 11px;
  }

  .detail-value {
    font-size: 12px;
  }

  .machinery-picture-container {
    margin-bottom: 8px;
  }

  .machinery-picture-placeholder .placeholder-icon {
    width: 36px;
    height: 36px;
    margin-bottom: 6px;
  }

  .machinery-picture-placeholder p {
    font-size: 12px;
  }

  .btn-book {
    min-height: 34px;
    padding: 8px 12px;
    font-size: 13px;
    border-radius: 8px !important;
  }

  .bookings-table-container {
    border-radius: 10px;
    overflow-x: auto;
  }

  .bookings-table {
    font-size: 13px;
  }

  .bookings-table th,
  .bookings-table td {
    padding: 8px 10px;
  }

  .booking-machinery small {
    font-size: 11px;
  }

  .badge,
  .status-badge,
  .payment-badge {
    padding: 3px 8px;
    font-size: 11px;
  }

  .btn-icon-small {
    padding: 4px 8px;
    font-size: 12px;
    min-height: 28px;
    border-radius: 6px !important;
  }

  .action-buttons {
    gap: 6px;
  }

  .loading-container,
  .empty-state,
  .loading-cell,
  .empty-cell {
    padding: 24px;
    font-size: 13px;
  }

  .loading-spinner {
    width: 32px;
    height: 32px;
    margin: 0 auto 12px;
  }

  .empty-icon {
    width: 40px;
    height: 40px;
    margin: 0 auto 12px;
  }
}

@media (min-width: 769px) and (max-width: 1280px) {
  .page-title {
    font-size: 1.35rem;
  }

  .stat-value {
    font-size: 1.2rem;
  }

  .section-title {
    font-size: 1.05rem;
  }

  .machinery-grid {
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 220px), 1fr));
  }

  .bookings-table {
    font-size: 12px;
  }

  .bookings-table th,
  .bookings-table td {
    padding: 7px 8px;
  }
}
</style>

<!-- Unscoped: desktop compact + identical Light/Dark geometry (colors stay in theme files) -->
<style>
.machinery-booking-modal {
  font-size: 16px;
  line-height: 1.5;
}

@media (min-width: 769px) {
  html body .page-container.machinery-booking-page {
    padding: 12px 16px !important;
  }

  html body .page-container.machinery-booking-page .page-header,
  html body .page-container.machinery-booking-page .page-header-split {
    margin-bottom: 10px !important;
    padding: 10px 14px 10px !important;
    gap: 8px !important;
    border-radius: 12px !important;
  }

  html body .page-container.machinery-booking-page h1.page-title,
  html body .page-container.machinery-booking-page .page-title {
    font-size: 1.25rem !important;
    line-height: 1.2 !important;
    margin: 0 0 2px !important;
  }

  html body .page-container.machinery-booking-page .page-subtitle {
    font-size: 0.75rem !important;
    line-height: 1.35 !important;
    margin: 0 !important;
  }

  html body .page-container.machinery-booking-page .stats-group {
    margin-bottom: 8px !important;
  }

  html body .page-container.machinery-booking-page .payment-group {
    padding-top: 8px !important;
    margin-top: 2px !important;
  }

  html body .page-container.machinery-booking-page .stats-group-title {
    font-size: 10px !important;
    margin-bottom: 6px !important;
    letter-spacing: 0.06em !important;
  }

  html body .page-container.machinery-booking-page .stats-grid,
  html body .page-container.machinery-booking-page .stats-grid.payment-stats {
    gap: 8px !important;
    margin-bottom: 8px !important;
  }

  html body .page-container.machinery-booking-page .stat-card,
  html body .page-container.machinery-booking-page .glass-stat-card {
    padding: 8px 10px !important;
    border-radius: 10px !important;
    min-height: 0 !important;
  }

  html body .page-container.machinery-booking-page .stat-label {
    font-size: 10px !important;
    margin-bottom: 2px !important;
  }

  html body .page-container.machinery-booking-page .stat-value {
    font-size: 1.2rem !important;
    line-height: 1.1 !important;
  }

  html body .page-container.machinery-booking-page .section {
    margin-bottom: 12px !important;
    padding: 12px 14px !important;
    border-radius: 12px !important;
  }

  html body .page-container.machinery-booking-page h2.section-title,
  html body .page-container.machinery-booking-page .section-title {
    font-size: 1rem !important;
    margin: 0 0 8px !important;
  }

  html body .page-container.machinery-booking-page .tools-card {
    --tools-h: 32px;
    gap: 6px !important;
    margin-bottom: 10px !important;
    padding: 8px 10px !important;
    border-radius: 10px !important;
  }

  html body .page-container.machinery-booking-page :is(.toolbar-input, .toolbar-select, .search-input-main) {
    font-size: 12px !important;
    min-height: 32px !important;
    height: 32px !important;
    max-height: 32px !important;
    padding-top: 0 !important;
    padding-bottom: 0 !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .page-container.machinery-booking-page .machinery-grid {
    gap: 10px !important;
    margin-bottom: 12px !important;
    grid-template-columns: repeat(auto-fit, minmax(min(100%, 230px), 1fr)) !important;
  }

  html body .page-container.machinery-booking-page .machinery-card {
    padding: 10px !important;
    border-radius: 10px !important;
  }

  html body .page-container.machinery-booking-page h3.machinery-title,
  html body .page-container.machinery-booking-page .machinery-title {
    font-size: 13px !important;
    margin: 0 !important;
  }

  html body .page-container.machinery-booking-page .machinery-header {
    min-height: 24px !important;
    margin-bottom: 6px !important;
  }

  html body .page-container.machinery-booking-page .machinery-picture-container {
    aspect-ratio: 16 / 10 !important;
    max-height: 120px !important;
    margin-bottom: 6px !important;
  }

  html body .page-container.machinery-booking-page .machinery-description {
    font-size: 11px !important;
    min-height: 28px !important;
    max-height: 28px !important;
    margin: 0 0 6px !important;
  }

  html body .page-container.machinery-booking-page .detail-row {
    min-height: 22px !important;
    padding: 3px 0 !important;
  }

  html body .page-container.machinery-booking-page .detail-label {
    font-size: 11px !important;
  }

  html body .page-container.machinery-booking-page .detail-value {
    font-size: 11px !important;
  }

  html body .page-container.machinery-booking-page .btn-book {
    min-height: 32px !important;
    padding: 6px 10px !important;
    font-size: 12px !important;
    border-radius: 8px !important;
    border-width: 0 !important;
    font-weight: 600 !important;
  }

  html body .page-container.machinery-booking-page .badge,
  html body .page-container.machinery-booking-page .status-badge,
  html body .page-container.machinery-booking-page .payment-badge {
    padding: 2px 7px !important;
    font-size: 10px !important;
  }

  html body .page-container.machinery-booking-page .bookings-table {
    font-size: 12px !important;
  }

  html body .page-container.machinery-booking-page .bookings-table th,
  html body .page-container.machinery-booking-page .bookings-table td {
    padding: 7px 8px !important;
  }

  html body .page-container.machinery-booking-page .btn-icon-small {
    padding: 3px 7px !important;
    font-size: 11px !important;
    min-height: 26px !important;
    border-width: 1px !important;
    border-radius: 6px !important;
    font-weight: 600 !important;
  }

  html body .page-container.machinery-booking-page :is(.btn-primary, .btn-secondary, .btn-danger, .btn-sm) {
    border-width: 0 !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  html body .page-container.machinery-booking-page .outstanding-warning {
    padding: 8px 10px !important;
    margin-bottom: 10px !important;
    gap: 8px !important;
  }

  html body .page-container.machinery-booking-page .warning-icon {
    width: 28px !important;
    height: 28px !important;
    font-size: 14px !important;
  }

  html body .page-container.machinery-booking-page .warning-content h3 {
    font-size: 13px !important;
    margin: 0 0 4px !important;
  }

  html body .page-container.machinery-booking-page .warning-content p {
    font-size: 12px !important;
    margin: 0 0 4px !important;
  }

  body.glass-dark .page-container.machinery-booking-page :is(.btn-book, .btn-primary, .btn-secondary, .btn-danger, .btn-sm),
  body.glass-light .page-container.machinery-booking-page :is(.btn-book, .btn-primary, .btn-secondary, .btn-danger, .btn-sm),
  body.glass-dark .machinery-booking-modal :is(.btn-book, .btn-primary, .btn-secondary, .btn-danger, .btn-sm),
  body.glass-light .machinery-booking-modal :is(.btn-book, .btn-primary, .btn-secondary, .btn-danger, .btn-sm) {
    border-width: 0 !important;
    border-style: none !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  body.glass-dark .page-container.machinery-booking-page .btn-icon-small,
  body.glass-light .page-container.machinery-booking-page .btn-icon-small,
  body.glass-dark .machinery-booking-modal .btn-icon-small,
  body.glass-light .machinery-booking-modal .btn-icon-small {
    border-width: 1px !important;
    border-style: solid !important;
    border-radius: 6px !important;
    font-weight: 600 !important;
  }

  body.glass-dark .page-container.machinery-booking-page :is(.toolbar-input, .toolbar-select, .form-input, .filter-select),
  body.glass-light .page-container.machinery-booking-page :is(.toolbar-input, .toolbar-select, .form-input, .filter-select),
  body.glass-dark .machinery-booking-modal :is(.toolbar-input, .toolbar-select, .form-input, .filter-select),
  body.glass-light .machinery-booking-modal :is(.toolbar-input, .toolbar-select, .form-input, .filter-select) {
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  .machinery-booking-modal .modal-header {
    padding: 12px 16px !important;
  }

  .machinery-booking-modal .modal-header h2 {
    font-size: 16px !important;
    margin: 0 !important;
  }

  .machinery-booking-modal .modal-body {
    padding: 12px 16px !important;
  }

  .machinery-booking-modal .form-group {
    margin-bottom: 12px !important;
  }

  .machinery-booking-modal .form-label {
    margin-bottom: 4px !important;
    font-size: 12px !important;
  }

  .machinery-booking-modal .form-input {
    padding: 6px 10px !important;
    font-size: 13px !important;
    min-height: 32px !important;
    border-radius: 8px !important;
  }

  .machinery-booking-modal .booking-form-compact .form-input {
    min-height: 32px !important;
    padding: 6px 10px !important;
  }

  .machinery-booking-modal .booking-form-compact textarea.form-input {
    min-height: 52px !important;
    height: 52px !important;
  }

  .machinery-booking-modal .btn-primary,
  .machinery-booking-modal .btn-secondary,
  .machinery-booking-modal .btn-danger {
    padding: 6px 14px !important;
    font-size: 13px !important;
    min-height: 32px !important;
  }

  .machinery-booking-modal .cal-nav-btn {
    width: 30px !important;
    height: 30px !important;
    font-size: 16px !important;
    border-radius: 8px !important;
  }

  .machinery-booking-modal .cal-cell {
    min-height: 36px !important;
    padding: 2px 2px 4px !important;
    border-radius: 8px !important;
  }

  .machinery-booking-modal .cal-day-num {
    font-size: 12px !important;
  }

  .machinery-booking-modal .detail-section h3 {
    font-size: 15px !important;
    margin: 0 0 10px !important;
  }

  .machinery-booking-modal .details-grid {
    gap: 12px !important;
  }

  .machinery-booking-modal .detail-item label {
    font-size: 12px !important;
  }

  .machinery-booking-modal .price-highlight,
  .machinery-booking-modal .total-price {
    font-size: 16px !important;
  }

  .machinery-booking-modal .modal-actions {
    gap: 8px !important;
    margin-top: 12px !important;
  }

  .machinery-booking-modal .payments-table {
    font-size: 12px !important;
  }

  .machinery-booking-modal .payments-table th,
  .machinery-booking-modal .payments-table td {
    padding: 6px 8px !important;
  }
}
</style>
