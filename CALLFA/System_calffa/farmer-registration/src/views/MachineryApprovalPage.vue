<template>
  <div class="page-container glass-module-page machinery-page machinery-approval-page machinery-approval-ui" :class="{ 'light-theme': isLight }">
    <div v-if="!canApproveBookings && !canCompleteBookings" class="access-denied-card">
      <h2 class="access-denied-title">{{ $t('ui.accessDenied') }}</h2>
      <p>{{ $t('ui.thisPageFor') }}</p>
      <ul>
        <li>{{ $t('common.businessManagers') }}</li>
        <li>{{ $t('common.operationManagers') }}</li>
        <li>{{ $t('ui.operators') }}</li>
      </ul>
      <p><strong>{{ $t('ui.yourRole') }}</strong> {{ authStore.currentUser?.role || $t('ui.notLoggedIn') }}</p>
      <p><strong>{{ $t('ui.yourUserId') }}</strong> {{ authStore.currentUser?.id || $t('ui.na') }}</p>
    </div>

    <div v-else class="machinery-authorised-shell">
      <div class="page-header page-header-split">
        <div class="page-header-text">
          <h1 class="page-title">
            {{ canApproveBookings ? $t('ui.machineryBookingApprovals') : $t('ui.machineryBookingOperations') }}
          </h1>
          <p v-if="canApproveBookings" class="page-subtitle">
            {{ $t('ui.machineryApprovalsSub') }}
          </p>
          <p v-else-if="canCompleteBookings" class="page-subtitle">
            {{ $t('ui.machineryOpsSub') }}
          </p>
        </div>
        <div v-if="canApproveBookings" class="page-header-actions">
          <router-link to="/machinery-booking?create=1" class="btn-primary">
            {{ $t('ui.createBookingForFarmer') }}
          </router-link>
        </div>
      </div>

      <div class="stats-group stats-group--machinery-approval">
        <div class="stats-grid stats-grid--machinery-approval machinery-stats-grid">
        <div v-if="canApproveBookings" class="stat-card pending" @click="quickFilter('Pending')">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.pending') }}</div>
            <div class="stat-value">{{ pendingCount }}</div>
          </div>
        </div>
        <div v-if="canApproveBookings" class="stat-card approved" @click="quickFilter('Approved')">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.approved') }}</div>
            <div class="stat-value">{{ approvedCount }}</div>
          </div>
        </div>
        <div v-if="canCompleteBookings" class="stat-card approved" @click="quickFilter('Approved')">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.toProcess') }}</div>
            <div class="stat-value">{{ assignedCount }}</div>
          </div>
        </div>
        <div v-if="canCompleteBookings" class="stat-card incomplete" @click="quickFilter('Incomplete')">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.incomplete') }}</div>
            <div class="stat-value">{{ incompleteCount }}</div>
          </div>
        </div>
        <div
          v-if="canCompleteBookings || canApproveBookings"
          class="stat-card completed"
          @click="quickFilter('Completed')"
        >
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.completed') }}</div>
            <div class="stat-value">{{ completedCount }}</div>
          </div>
        </div>
        <div class="stat-card rejected" @click="quickFilter('Rejected')">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.rejected') }}</div>
            <div class="stat-value">{{ rejectedCount }}</div>
          </div>
        </div>
        <div class="stat-card expired" @click="quickFilter('Expired')">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.expired') }}</div>
            <div class="stat-value">{{ expiredCount }}</div>
          </div>
        </div>
        </div>
      </div>

      <div class="machinery-single-column">
        <div class="card machinery-bookings-card">
          <h2 class="card-title">{{ $t('ui.machineryBookingsLower') }}</h2>
          <p class="loan-guidance-text">
            {{ $t('ui.tipStatusTab') }}
          </p>

          <div class="tabs machinery-tabs">
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Pending' }"
              @click="quickFilter('Pending')"
            >
              {{ $t('common.pending') }} ({{ pendingCount }})
            </button>
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Down Payment Verified' }"
              @click="quickFilter('Down Payment Verified')"
            >
              {{ $t('ui.toConfirm') }} ({{ confirmCount }})
            </button>
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Approved' }"
              @click="quickFilter('Approved')"
            >
              {{ $t('common.approved') }} ({{ approvedCount }})
            </button>
            <button
              v-if="canCompleteBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Approved' }"
              @click="quickFilter('Approved')"
            >
              {{ $t('common.assigned') }} ({{ assignedCount }})
            </button>
            <button
              v-if="canCompleteBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Incomplete' }"
              @click="quickFilter('Incomplete')"
            >
              {{ $t('common.incomplete') }} ({{ incompleteCount }})
            </button>
            <button
              v-if="canCompleteBookings || canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Completed' }"
              @click="quickFilter('Completed')"
            >
              {{ $t('common.completed') }} ({{ completedCount }})
            </button>
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Rejected' }"
              @click="quickFilter('Rejected')"
            >
              {{ $t('common.rejected') }} ({{ rejectedCount }})
            </button>
            <button
              v-if="canApproveBookings"
              type="button"
              class="tab"
              :class="{ active: activeFilter === 'Expired' }"
              @click="quickFilter('Expired')"
            >
              {{ $t('common.expired') }} ({{ expiredCount }})
            </button>
          </div>

          <div v-if="isApprover && filters.status === 'Pending'" class="alert alert-info banner-inline-alert">
            Naka-<strong>{{ $t('common.pending') }}</strong> view ka. Gumamit ng ibang tabs para makita ang approved, rejected, o iba pang booking.
          </div>

          <div class="tools-card ma-tools-card">
            <div class="tools-card-top filters-row machinery-filters">
              <div class="form-group">
                <label>Start date</label>
                <div class="input-shell">
                  <span class="field-icon" aria-hidden="true"></span>
                  <input v-model="filters.start_date" type="date" class="toolbar-input" @change="applyFilters" />
                </div>
              </div>
              <div class="form-group">
                <label>End date</label>
                <div class="input-shell">
                  <span class="field-icon" aria-hidden="true"></span>
                  <input v-model="filters.end_date" type="date" class="toolbar-input" @change="applyFilters" />
                </div>
              </div>
              <button type="button" class="mach-clear-filters-btn" @click="clearFilters">{{ $t('common.clear') }}</button>
            </div>
          </div>

          <div class="table-container machinery-table-container">
            <table class="loans-table machinery-loans-table machinery-desktop-table">
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
                  <th class="th-name">{{ $t('ui.farmer') }}</th>
                  <th class="th-purpose">{{ $t('ui.machinery') }}</th>
                  <th class="th-booking-date">{{ $t('ui.bookingDate') }}</th>
                  <th class="th-location">{{ $t('ui.location') }}</th>
                  <th class="th-term">{{ $t('ui.areaQty') }}</th>
                  <th class="th-amount">{{ $t('ui.total') }}</th>
                  <th v-if="canApproveBookings" class="th-payment">{{ $t('ui.payment') }}</th>
                  <th class="th-status">{{ $t('ui.status') }}</th>
                  <th class="th-actions">{{ $t('ui.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td :colspan="tableColspan" class="loading-cell">{{ $t('ui.loadingBookings') }}</td>
                </tr>
                <tr v-else-if="bookings.length === 0">
                  <td :colspan="tableColspan" class="empty-cell">{{ $t('ui.noBookings') }}</td>
                </tr>
                <tr v-else v-for="booking in bookings" :key="booking.id" :data-booking-id="booking.id" :class="{ 'notification-highlight-row': highlightedBookingId == booking.id }">
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
                      <button type="button" class="btn btn-view" :title="$t('common.view')" @click="viewBooking(booking)">{{ $t('common.view') }}</button>
                      <button
                        v-if="booking.status === 'Pending' && canApproveBookings"
                        type="button"
                        class="btn btn-approve"
                        :title="$t('common.approve')"
                        @click="approveBookingConfirm(booking)"
                      >
                        {{ $t('common.approve') }}
                      </button>
                      <button
                        v-if="booking.status === 'Down Payment Verified' && canApproveBookings"
                        type="button"
                        class="btn btn-approve"
                        :title="$t('header.notif.confirmBooking')"
                        @click="confirmBookingConfirm(booking)"
                      >
                        {{ $t('header.notif.confirmBooking') }}
                      </button>
                      <button
                        v-if="['Pending', 'Down Payment Verified'].includes(booking.status) && canApproveBookings"
                        type="button"
                        class="btn btn-reject"
                        :title="$t('common.reject')"
                        @click="rejectBookingConfirm(booking)"
                      >
                        {{ $t('common.reject') }}
                      </button>
                      <button
                        v-if="operatorWorkStatuses.includes(booking.status) && canCompleteBookings"
                        type="button"
                        class="btn btn-approve"
                        :title="$t('ui.markCompleted')"
                        @click="completeBookingConfirm(booking)"
                      >
                        {{ $t('common.done') }}
                      </button>
                      <button
                        v-if="operatorWorkStatuses.includes(booking.status) && canCompleteBookings"
                        type="button"
                        class="btn btn-reject"
                        :title="$t('ui.markIncomplete')"
                        @click="incompleteBookingConfirm(booking)"
                      >
                        {{ $t('common.issue') }}
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>

            <div class="inv2-mobile-list ma-mobile-list">
              <div v-if="loading" class="inv2-empty">{{ $t('ui.loadingBookings') }}</div>
              <div v-else-if="bookings.length === 0" class="inv2-empty">{{ $t('ui.noBookings') }}</div>
              <article
                v-else
                v-for="booking in bookings"
                :key="'ma-m-' + booking.id"
                class="inv2-mobile-card"
                :data-booking-id="booking.id"
                :class="{ 'notification-highlight-row': highlightedBookingId == booking.id }"
              >
                <div class="inv2-mobile-card-top">
                  <h4 class="inv2-mobile-card-name">{{ booking.farmer_name }}</h4>
                  <span :class="['mach-loan-status', bookingStatusSlug(booking.status)]">{{ booking.status }}</span>
                </div>
                <div class="inv2-mobile-card-meta">
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.ref') }}</span>
                    <span>{{ booking.reference_number || '—' }}</span>
                  </div>
                  <div v-if="booking.farmer_phone" class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.phone') }}</span>
                    <span>{{ booking.farmer_phone }}</span>
                  </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.machinery') }}</span>
                    <span>{{ booking.machinery_name }}</span>
                  </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.type') }}</span>
                    <span class="badge" :class="'badge-' + getMachineryTypeClass(booking.machinery_type)">{{ booking.machinery_type }}</span>
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
                  <div v-if="canApproveBookings" class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.payment') }}</span>
                    <span :class="['mach-loan-pay', 'payment-' + paymentStatusSlug(booking.payment_status)]">
                      {{ booking.payment_status || 'Unpaid' }}
                    </span>
                  </div>
                </div>
                <div class="inv2-mobile-card-actions action-buttons">
                  <button type="button" class="btn btn-view" @click="viewBooking(booking)">{{ $t('common.view') }}</button>
                  <button
                    v-if="booking.status === 'Pending' && canApproveBookings"
                    type="button"
                    class="btn btn-approve"
                    @click="approveBookingConfirm(booking)"
                  >
                    {{ $t('common.approve') }}
                  </button>
                  <button
                    v-if="booking.status === 'Down Payment Verified' && canApproveBookings"
                    type="button"
                    class="btn btn-approve"
                    @click="confirmBookingConfirm(booking)"
                  >
                    {{ $t('header.notif.confirmBooking') }}
                  </button>
                  <button
                    v-if="['Pending', 'Down Payment Verified'].includes(booking.status) && canApproveBookings"
                    type="button"
                    class="btn btn-reject"
                    @click="rejectBookingConfirm(booking)"
                  >
                    {{ $t('common.reject') }}
                  </button>
                  <button
                    v-if="operatorWorkStatuses.includes(booking.status) && canCompleteBookings"
                    type="button"
                    class="btn btn-approve"
                    @click="completeBookingConfirm(booking)"
                  >
                    {{ $t('common.done') }}
                  </button>
                  <button
                    v-if="operatorWorkStatuses.includes(booking.status) && canCompleteBookings"
                    type="button"
                    class="btn btn-reject"
                    @click="incompleteBookingConfirm(booking)"
                  >
                    {{ $t('common.issue') }}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- View Booking Details Modal -->
    <Teleport to="body">
      <div
        v-if="showViewModal && selectedBooking"
        class="modal-overlay app-modal-overlay machinery-approval-modal"
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
                <h3 class="tx-detail-section-title">Farmer Information</h3>
                <div class="details-grid tx-details-grid">
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.name') }}</label>
                    <span>{{ selectedBooking.farmer_name }}</span>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>Reference Number</label>
                    <span>{{ selectedBooking.reference_number }}</span>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="selectedBooking.farmer_phone">
                    <label>{{ $t('ui.phone') }}</label>
                    <span>{{ selectedBooking.farmer_phone }}</span>
                  </div>
                  <div class="detail-item tx-detail-item tx-detail-item--full full-width" v-if="selectedBooking.farmer_address">
                    <label>{{ $t('ui.address') }}</label>
                    <span>{{ selectedBooking.farmer_address }}</span>
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
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.type') }}</label>
                    <span class="badge" :class="'badge-' + getMachineryTypeClass(selectedBooking.machinery_type)">
                      {{ selectedBooking.machinery_type }}
                    </span>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.serviceDate') }}</label>
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
                    <label>Price Rate</label>
                    <span>₱{{ formatNumber(selectedBooking.price_per_unit) }} {{ selectedBooking.unit_type }}</span>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.totalPrice') }}</label>
                    <strong class="price-highlight">₱{{ formatNumber(selectedBooking.total_price) }}</strong>
                  </div>
                  <div class="detail-item tx-detail-item" v-if="bookingDownPaymentPreview(selectedBooking).on">
                    <label>{{ $t('ui.downPaymentColon') }}</label>
                    <strong>{{ bookingDownPaymentPreview(selectedBooking).percent }}% — ₱{{ formatNumber(bookingDownPaymentPreview(selectedBooking).amount) }}</strong>
                  </div>
                  <div class="detail-item tx-detail-item">
                    <label>{{ $t('ui.status') }}</label>
                    <span class="status-badge" :class="'status-' + getBookingStatusClass(selectedBooking.status)">
                      {{ selectedBooking.status }}
                    </span>
                  </div>
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
                <h3 class="tx-detail-section-title">Farmer's Notes</h3>
                <p class="notes-text">{{ selectedBooking.notes }}</p>
              </div>
            </div>
          </div>

          <div class="modal-actions" v-if="selectedBooking.status === 'Pending' && canApproveBookings">
            <button type="button" @click="approveBookingConfirm(selectedBooking)" class="btn-success">
              {{ $t('common.approve') }}
            </button>
            <button type="button" @click="rejectBookingConfirm(selectedBooking)" class="btn-danger">
              {{ $t('common.reject') }}
            </button>
          </div>
          <div class="modal-actions" v-else-if="selectedBooking.status === 'Down Payment Verified' && canApproveBookings">
            <button type="button" @click="confirmBookingConfirm(selectedBooking)" class="btn-success">
              {{ $t('header.notif.confirmBooking') }}
            </button>
            <button type="button" @click="rejectBookingConfirm(selectedBooking)" class="btn-danger">
              {{ $t('common.reject') }}
            </button>
          </div>
          <p
            v-else-if="selectedBooking.status === 'Pending' && !canApproveBookings"
            class="modal-permission-note"
          >
            {{ $t('ui.onlyManagersApprove') }}
          </p>
        </div>
      </div>
    </Teleport>

    <!-- Approve Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showApproveModal"
        class="modal-overlay app-modal-overlay machinery-approval-modal"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content modal-small" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>Approve Booking</h2>
            <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
          </div>
          <div class="modal-body">
            <p class="confirm-message">{{ approveModalMessage }}</p>
            <div class="booking-summary">
              <p><strong>{{ $t('ui.farmerColon') }}</strong> {{ bookingToProcess?.farmer_name }}</p>
              <p><strong>{{ $t('ui.machineryColon') }}</strong> {{ bookingToProcess?.machinery_name }}</p>
              <p><strong>{{ $t('ui.dateColon') }}</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
              <p><strong>{{ $t('ui.totalAmountColon') }}</strong> ₱{{ formatNumber(bookingToProcess?.total_price) }}</p>
              <p v-if="bookingDownPaymentPreview(bookingToProcess).on">
                <strong>{{ $t('ui.downPaymentColon') }}</strong>
                {{ bookingDownPaymentPreview(bookingToProcess).percent }}% — ₱{{ formatNumber(bookingDownPaymentPreview(bookingToProcess).amount) }}
              </p>
            </div>
            <div class="modal-actions">
              <button type="button" @click="approveBooking" class="btn-success" :disabled="loading">
                {{ loading ? 'Approving...' : 'Yes' }}
              </button>
              <button type="button" @click="closeModals" class="btn-secondary">No</button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Confirm Booking Modal -->
    <Teleport to="body">
      <div
        v-if="showConfirmModal"
        class="modal-overlay app-modal-overlay machinery-approval-modal"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>Confirm Booking</h2>
            <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
          </div>
          <div class="modal-body">
            <p>{{ $t('ui.confirmDownPaymentBooking') }}</p>
            <div class="booking-summary">
              <p><strong>{{ $t('ui.farmerColon') }}</strong> {{ bookingToProcess?.farmer_name }}</p>
              <p><strong>{{ $t('ui.machineryColon') }}</strong> {{ bookingToProcess?.machinery_name }}</p>
              <p><strong>{{ $t('ui.dateColon') }}</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
              <p><strong>{{ $t('ui.downPaymentColon') }}</strong>
                <template v-if="bookingDownPaymentPreview(bookingToProcess).percent">
                  {{ bookingDownPaymentPreview(bookingToProcess).percent }}% —
                </template>
                ₱{{ formatNumber(bookingToProcess?.down_payment_amount) }}
              </p>
            </div>
            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary">{{ $t('common.cancel') }}</button>
              <button type="button" @click="confirmBookingFinal" class="btn-success" :disabled="loading">
                {{ loading ? 'Confirming...' : 'Confirm Booking' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Reject Modal -->
    <Teleport to="body">
      <div
        v-if="showRejectModal"
        class="modal-overlay app-modal-overlay machinery-approval-modal"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content modal-small" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>Reject Booking</h2>
            <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
          </div>
          <div class="modal-body">
            <p class="confirm-message">
              {{
                bookingToProcess?.status === 'Down Payment Verified'
                  ? $t('ui.rejectAfterDownPaymentHint')
                  : $t('ui.rejectBookingConfirm')
              }}
            </p>
            <div class="booking-summary">
              <p><strong>{{ $t('ui.farmerColon') }}</strong> {{ bookingToProcess?.farmer_name }}</p>
              <p><strong>{{ $t('ui.machineryColon') }}</strong> {{ bookingToProcess?.machinery_name }}</p>
              <p><strong>{{ $t('ui.dateColon') }}</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
              <p v-if="bookingToProcess?.status === 'Down Payment Verified' && bookingToProcess?.down_payment_amount">
                <strong>{{ $t('ui.downPaymentColon') }}</strong>
                ₱{{ formatNumber(bookingToProcess.down_payment_amount) }}
                — {{ $t('ui.willQueueDownPaymentRefund') }}
              </p>
            </div>
            <div class="form-group">
              <label class="form-label">{{ $t('ui.rejectionReason') }} *</label>
              <textarea
                v-model="rejectionReason"
                class="form-input"
                rows="4"
                :placeholder="$t('ui.rejectSlotUnavailablePlaceholder')"
                required
              ></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary">No</button>
              <button type="button" @click="rejectBooking" class="btn-danger" :disabled="loading || !rejectionReason">
                {{ loading ? 'Rejecting...' : 'Yes' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Complete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showCompleteModal"
        class="modal-overlay app-modal-overlay machinery-approval-modal"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content modal-medium" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>Mark Booking Completed</h2>
            <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
          </div>
          <div class="modal-body">
            <p class="modal-subtitle">Mark this booking as completed?</p>
            <div class="booking-summary">
              <p><strong>{{ $t('ui.farmerColon') }}</strong> {{ bookingToProcess?.farmer_name }}</p>
              <p><strong>{{ $t('ui.machineryColon') }}</strong> {{ bookingToProcess?.machinery_name }}</p>
              <p><strong>{{ $t('ui.dateColon') }}</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
            </div>
            <div class="complete-modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary btn-block">{{ $t('common.cancel') }}</button>
              <button type="button" @click="completeBooking" class="btn-success btn-block" :disabled="loading">
                {{ loading ? 'Processing...' : 'Mark as Completed' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Incomplete Booking Modal -->
    <Teleport to="body">
      <div
        v-if="showIncompleteModal"
        class="modal-overlay app-modal-overlay machinery-approval-modal"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content modal-small" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <h2>Mark Booking Incomplete</h2>
            <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
          </div>
          <div class="modal-body">
            <p>Please describe the issues encountered:</p>
            <div class="booking-summary">
              <p><strong>{{ $t('ui.farmerColon') }}</strong> {{ bookingToProcess?.farmer_name }}</p>
              <p><strong>{{ $t('ui.machineryColon') }}</strong> {{ bookingToProcess?.machinery_name }}</p>
              <p><strong>{{ $t('ui.dateColon') }}</strong> {{ formatDate(bookingToProcess?.booking_date) }}</p>
            </div>
            <div class="form-group">
              <label class="form-label">Notes on Issues *</label>
              <textarea
                v-model="completionNotes"
                class="form-input"
                rows="4"
                :placeholder="$t('ui.describeIncomplete')"
                required
              ></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary">{{ $t('common.cancel') }}</button>
              <button type="button" @click="markIncompleteBooking" class="btn-warning" :disabled="loading || !completionNotes">
                {{ loading ? 'Processing...' : 'Mark as Incomplete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Error/Success Messages -->
    <Teleport to="body">
      <div v-if="error" class="alert alert-error alert-floating">
        {{ error }}
        <button type="button" @click="clearError" class="alert-close" :aria-label="$t('common.close')">×</button>
      </div>
      <div v-if="successMessage" class="alert alert-success alert-floating">
        {{ successMessage }}
        <button type="button" @click="successMessage = ''" class="alert-close" :aria-label="$t('common.close')">×</button>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useMachineryStore } from '../stores/machineryStore'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { consumeNotificationDeepLink, scrollElementWhenReady } from '../utils/paymentHistoryFocus'

export default {
  name: 'MachineryApprovalPage',
  setup() {
    const machineryStore = useMachineryStore()
    const authStore = useAuthStore()
    const { t } = useI18n()
    const route = useRoute()
    const router = useRouter()
    const { isDark } = useBackdropTheme()
    const isLight = computed(() => !isDark.value)

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
    const highlightedBookingId = ref(null)
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
        ['Approved', 'Assigned to Operator', 'Booking Confirmed', 'In Use'].includes(b.status)
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
          filterToApply.status = 'Approved'
          filters.value.status = 'Approved'
          activeFilter.value = 'Approved'
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
          await machineryStore.fetchBookings({ status: 'Approved' })
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

    const bookingDownPaymentPreview = (booking) => {
      if (!booking) return { on: false, percent: null, amount: 0 }
      const storedAmt = parseFloat(booking.down_payment_amount)
      const pct = parseFloat(booking.down_payment_percent || booking.barangay_down_payment_percent)
      const enabled = Number(booking.barangay_down_payment_enabled) === 1 || (Number.isFinite(storedAmt) && storedAmt > 0)
      const amount = Number.isFinite(storedAmt) && storedAmt > 0
        ? storedAmt
        : Math.round(((parseFloat(booking.total_price) || 0) * (Number.isFinite(pct) ? pct : 0))) / 100
      const percent = Number.isFinite(pct) && pct > 0
        ? (Number.isInteger(pct) ? String(pct) : String(pct))
        : null
      return { on: enabled && (percent || amount > 0), percent, amount }
    }

    const approveModalMessage = computed(() => {
      const preview = bookingDownPaymentPreview(bookingToProcess.value)
      if (preview.on && preview.percent) {
        return t('ui.approveRequiresDownPayment', {
          percent: preview.percent,
          amount: `₱${Number(preview.amount).toLocaleString('en-PH', { minimumFractionDigits: 2 })}`
        })
      }
      return t('ui.approvePayAfterService')
    })

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
        successMessage.value = machineryStore.error ? '' : (bookingDownPaymentPreview(bookingToProcess.value).on
          ? 'Booking approved. The farmer must pay the down payment to reserve the slot.'
          : 'Booking approved and assigned to the operator.')
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
        const hadDp =
          bookingToProcess.value?.status === 'Down Payment Verified' ||
          bookingToProcess.value?.down_payment_verified_at ||
          parseFloat(bookingToProcess.value?.down_payment_amount) > 0
        successMessage.value = hadDp
          ? 'Booking rejected. Down payment refund was queued for the treasurer.'
          : 'Booking rejected'
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
        successMessage.value = 'Booking marked as incomplete. The farmer will not be charged unless the service is resumed and completed.'
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

    const isAnyModalOpen = computed(
      () =>
        showViewModal.value ||
        showApproveModal.value ||
        showConfirmModal.value ||
        showRejectModal.value ||
        showCompleteModal.value ||
        showIncompleteModal.value
    )

    watch(
      isAnyModalOpen,
      (open) => {
        document.body.classList.toggle('app-modal-open', open)
        document.body.style.overflow = open ? 'hidden' : ''
      },
      { immediate: true }
    )

    const resolveApprovalFilterForBooking = (booking) => {
      if (!booking?.status) return null
      if (['Assigned to Operator', 'Booking Confirmed', 'In Use'].includes(booking.status)) {
        return 'Approved'
      }
      return booking.status
    }

    const applyApprovalHighlightFromRoute = async () => {
      const created = route.query.created === '1' || route.query.created === 'true'
      const highlightId = route.query.highlight

      if (created) {
        filters.value.status = 'Approved'
        activeFilter.value = 'Approved'
        successMessage.value = 'Booking created and approved for the selected farmer. It has been assigned to the operator.'
        await loadData()
        return
      }

      if (!highlightId) return
      const linkType = String(route.query.type || '')
      if (linkType && linkType !== 'booking') return

      await machineryStore.fetchBookings({})
      allBookings.value = [...machineryStore.bookings]
      const found = allBookings.value.find((b) => String(b.id) === String(highlightId))
      const statusFilter = resolveApprovalFilterForBooking(found)
      if (statusFilter) {
        filters.value.status = statusFilter
        activeFilter.value = statusFilter
      }

      await loadData()

      highlightedBookingId.value = highlightId
      await scrollElementWhenReady(`[data-booking-id="${highlightId}"]`, nextTick)

      consumeNotificationDeepLink(router, route, () => {
        highlightedBookingId.value = null
      })
    }

    watch(
      () => [route.query.highlight, route.query.type, route.query.open, route.query.nav, route.query.created],
      () => {
        applyApprovalHighlightFromRoute()
      }
    )

    // Lifecycle
    onMounted(async () => {
      if (!route.query.highlight && route.query.created !== '1' && route.query.created !== 'true') {
        await loadData()
      }
      await applyApprovalHighlightFromRoute()
    })

    onUnmounted(() => {
      document.body.classList.remove('app-modal-open')
      document.body.style.overflow = ''
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
      highlightedBookingId,
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
      bookingDownPaymentPreview,
      approveModalMessage,
      isLight,
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
  0%, 100% { box-shadow: none; }
  50% { box-shadow: inset 0 0 0 999px rgba(239, 68, 68, 0.08); }
}

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
}

.page-header,
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
  text-align: left;
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
  display: flex;
  flex-direction: column;
  align-items: flex-start !important;
  text-align: left !important;
  max-width: none !important;
  margin: 0 !important;
  gap: 0;
}

.page-header-actions {
  position: relative;
  z-index: 1;
}

.page-header-actions .btn-primary {
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  white-space: nowrap;
}

.page-title {
  font-size: 1.55rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.2rem;
  color: #eefde6;
  text-align: left;
}

.page-subtitle {
  margin: 0;
  font-size: 0.88rem;
  font-weight: 600;
  line-height: 1.35;
  color: rgba(229, 235, 231, 0.82);
  text-align: left;
}

.tools-card.ma-tools-card {
  --tools-h: 34px;
  margin: 0 0 0.75rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  border: 1px solid rgba(126, 184, 145, 0.35);
  background: rgba(0, 0, 0, 0.12);
  box-shadow: none;
}

.ma-tools-card .tools-card-top {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.4rem 0.5rem;
}

.inv2-mobile-list,
.ma-mobile-list {
  display: none;
}

.inv2-empty {
  padding: 1.25rem 0.85rem;
  text-align: center;
  font-size: 0.85rem;
  color: rgba(220, 252, 231, 0.78);
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

.stat-card.completed {
  border-color: rgba(74, 222, 128, 0.38);
}

.stat-content {
  min-width: 0;
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
  gap: 0.45rem 0.55rem;
  align-items: flex-end;
  margin-bottom: 0;
}

.filters-row.machinery-filters .form-group {
  flex: 1;
  min-width: 140px;
  margin: 0;
}

.ma-tools-card .filters-row label,
.filters-row label {
  display: block;
  font-weight: 700;
  color: rgba(236, 253, 245, 0.9);
  font-size: 0.68rem;
  line-height: 1.2;
  margin: 0 0 0.2rem;
}

.input-shell {
  position: relative;
}

.input-shell .field-icon {
  position: absolute;
  left: 0.55rem;
  top: 50%;
  transform: translateY(-50%);
  pointer-events: none;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(187, 247, 208, 0.35);
}

.ma-tools-card .input-shell input,
.ma-tools-card .toolbar-input,
.input-shell input {
  width: 100%;
  box-sizing: border-box;
  height: var(--tools-h, 34px);
  min-height: var(--tools-h, 34px) !important;
  max-height: var(--tools-h, 34px);
  padding: 0.2rem 0.55rem 0.2rem 1.35rem !important;
  border-radius: 8px !important;
  border: 1px solid rgba(134, 239, 172, 0.28);
  background: rgba(8, 30, 22, 0.52);
  color: #ecfdf5;
  font-size: 0.78rem !important;
  font-weight: 600;
  font-family: inherit;
  line-height: 1.2;
}

.input-shell input:focus {
  outline: none;
  border-color: rgba(110, 231, 183, 0.9);
  box-shadow:
    0 0 0 2px rgba(74, 222, 128, 0.12),
    0 0 10px rgba(74, 222, 128, 0.16);
}

.mach-clear-filters-btn {
  align-self: flex-end;
  margin-top: 0;
  height: var(--tools-h, 34px);
  min-height: var(--tools-h, 34px);
  padding: 0 0.85rem;
  border-radius: 8px;
  border: 1px solid rgba(187, 247, 208, 0.45);
  background: rgba(255, 255, 255, 0.08);
  color: #ecfdf5;
  font-size: 0.75rem;
  font-weight: 700;
  line-height: 1;
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
  .page-container.machinery-approval-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    max-width: none;
    padding: 0.75rem;
    border-radius: 0;
  }

  .page-header,
  .page-header-split {
    margin-bottom: 0.65rem;
    padding: 0.65rem 0.75rem;
    border-radius: 14px;
    gap: 0.15rem;
  }

  .page-header-split::after {
    display: none;
  }

  .page-title {
    font-size: 1.15rem !important;
    margin: 0 0 0.15rem;
    line-height: 1.25;
  }

  .page-subtitle {
    font-size: 0.72rem;
    line-height: 1.3;
  }

  .stats-grid,
  .machinery-stats-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .stat-card {
    padding: 0.7rem 0.75rem 0.65rem;
    border-radius: 12px;
    gap: 0.35rem;
  }

  .stat-value {
    font-size: 1.15rem;
  }

  .stat-label {
    font-size: 0.62rem;
    letter-spacing: 0.04em;
  }

  .card.machinery-bookings-card {
    padding: 0.75rem 0.7rem 0.85rem;
    border-radius: 14px;
  }

  .card-title {
    font-size: 1rem;
    margin-bottom: 0.45rem;
  }

  .loan-guidance-text {
    font-size: 0.75rem;
    margin-bottom: 0.65rem;
  }

  .tabs.machinery-tabs {
    gap: 0.35rem;
    margin-bottom: 0.65rem;
  }

  .tab {
    flex: 1 1 calc(50% - 0.2rem);
    min-height: 34px;
    padding: 0.4rem 0.5rem;
    font-size: 0.68rem;
    border-radius: 9px;
  }

  .tools-card.ma-tools-card {
    --tools-h: 32px;
    padding: 0.45rem 0.5rem;
    margin-bottom: 0.55rem;
    border-radius: 10px;
  }

  .ma-tools-card .tools-card-top {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem 0.4rem;
    align-items: end;
  }

  .ma-tools-card .mach-clear-filters-btn {
    grid-column: 1 / -1;
    width: 100%;
    height: var(--tools-h);
    min-height: var(--tools-h);
    margin-top: 0;
    font-size: 0.72rem;
    border-radius: 8px;
  }

  .ma-tools-card .form-group label {
    font-size: 0.6rem;
    margin-bottom: 0.15rem;
  }

  .ma-tools-card .input-shell input,
  .ma-tools-card .toolbar-input {
    min-height: var(--tools-h) !important;
    height: var(--tools-h) !important;
    max-height: var(--tools-h);
    padding: 0.15rem 0.45rem 0.15rem 1.2rem !important;
    font-size: 0.74rem !important;
    border-radius: 8px !important;
  }

  .machinery-table-container {
    overflow: visible;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
    padding: 0;
  }

  .machinery-desktop-table {
    display: none !important;
  }

  .inv2-mobile-list,
  .ma-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
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
    color: #ecfdf5;
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
    color: rgba(236, 253, 245, 0.92);
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
    flex-wrap: wrap;
    flex-direction: row;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(190, 235, 203, 0.12);
  }

  .inv2-mobile-card-actions .btn {
    width: auto;
    min-height: 32px;
    padding: 0.4rem 0.65rem;
    font-size: 0.72rem;
    border-radius: 8px;
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
  background: var(--tx-detail-surface, #ffffff);
  border-radius: 16px;
  width: 92%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.25);
  border: 1px solid var(--tx-detail-border, #bbf7d0);
}

.modal-content:not(.tx-detail-modal) {
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.98), rgba(14, 33, 23, 0.96));
  border-color: rgba(126, 184, 145, 0.28);
  color: #ecfdf5;
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
  color: #ecfdf5;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.35rem;
  cursor: pointer;
  color: rgba(236, 253, 245, 0.85);
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

.modal-content:not(.tx-detail-modal) .detail-item label {
  font-weight: 700;
  color: #166534;
  font-size: 0.82rem;
}

.modal-content:not(.tx-detail-modal) .detail-item span,
.modal-content:not(.tx-detail-modal) .detail-item p {
  color: #0f172a;
}

.price-highlight {
  color: #047857 !important;
}

.modal-content:not(.tx-detail-modal) .rejection-box {
  background: #fee2e2;
  border-left: 4px solid #ef4444;
  padding: 1rem;
  border-radius: 10px;
}

.modal-content:not(.tx-detail-modal) .rejection-box p {
  margin: 0.5rem 0 0;
  color: #7f1d1d !important;
}

.modal-content:not(.tx-detail-modal) .notes-text {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 10px;
  color: #334155;
  line-height: 1.55;
}

.modal-content:not(.tx-detail-modal) .booking-summary {
  background: #f8fafc;
  padding: 1rem;
  border-radius: 10px;
}

.modal-content:not(.tx-detail-modal) .booking-summary p {
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
  margin: 0;
  padding: 0 1.25rem 1.15rem;
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

.confirm-message {
  margin: 0 0 0.85rem;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
  color: #ecfdf5;
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
  z-index: 12000;
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

/* Light mode — use the same bright cooperative surfaces as other light pages. */
.machinery-page.page-container.light-theme {
  background: linear-gradient(145deg, #f7fff8 0%, #f0fdf4 48%, #fffef9 100%) !important;
  color: #111827 !important;
  border: 1px solid #bbf7d0 !important;
  box-shadow: 0 12px 32px rgba(22, 101, 52, 0.08) !important;
}

.machinery-page.page-container.light-theme::before {
  background:
    radial-gradient(ellipse 80% 50% at 10% 90%, rgba(34, 197, 94, 0.08) 0%, transparent 60%),
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(245, 158, 11, 0.07) 0%, transparent 60%) !important;
}

.machinery-page.page-container.light-theme :is(
  .page-header,
  .page-header-split,
  .stat-card,
  .card.machinery-bookings-card,
  .tools-card.ma-tools-card
) {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.09) !important;
}

.machinery-page.page-container.light-theme .page-header,
.machinery-page.page-container.light-theme .page-header-split {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.machinery-page.page-container.light-theme .page-header-split::before,
.machinery-page.page-container.light-theme .page-header-split::after {
  opacity: 0.55;
}

.machinery-page.page-container.light-theme .page-title {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.machinery-page.page-container.light-theme .page-subtitle {
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
}

.machinery-page.page-container.light-theme .tools-card.ma-tools-card {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
  box-shadow: none !important;
}

.machinery-page.page-container.light-theme .stat-card:hover {
  background: #f7fff8 !important;
  border-color: #22c55e !important;
  box-shadow: 0 12px 28px rgba(22, 101, 52, 0.14) !important;
}

.machinery-page.page-container.light-theme .stat-card.completed {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%) !important;
  border-color: #4ade80 !important;
}

.machinery-page.page-container.light-theme :is(
  .page-title,
  .card-title,
  .stat-value,
  .inv2-mobile-card-name
) {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.machinery-page.page-container.light-theme :is(
  .page-subtitle,
  .loan-guidance-text,
  .stat-label,
  .filters-row label,
  .inv2-mobile-label,
  .inv2-empty
) {
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
}

.machinery-page.page-container.light-theme .inv2-mobile-meta-row {
  color: #14532d !important;
}

.machinery-page.page-container.light-theme .tab {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
  box-shadow: none !important;
}

.machinery-page.page-container.light-theme .tab:hover {
  background: #f0fdf4 !important;
  border-color: #22c55e !important;
  color: #14532d !important;
}

.machinery-page.page-container.light-theme .tab.active {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  border-color: #166534 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  box-shadow: 0 5px 14px rgba(22, 101, 52, 0.18) !important;
}

.machinery-page.page-container.light-theme .input-shell input {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
}

.machinery-page.page-container.light-theme .input-shell .field-icon {
  background: #16a34a !important;
}

.machinery-page.page-container.light-theme .mach-clear-filters-btn {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  color: #166534 !important;
}

.machinery-page.page-container.light-theme .mach-clear-filters-btn:hover {
  background: #f0fdf4 !important;
  border-color: #22c55e !important;
}

.machinery-page.page-container.light-theme .machinery-table-container {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
}

@media (max-width: 768px) {
  .machinery-page.page-container.light-theme .machinery-table-container {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  .machinery-page.page-container.light-theme .inv2-mobile-card {
    background: #ffffff !important;
    border-color: #bbf7d0 !important;
  }

  .machinery-page.page-container.light-theme .inv2-mobile-card-actions.action-buttons {
    border-top-color: #dcfce7 !important;
  }
}

.machinery-page.page-container.light-theme .machinery-loans-table.loans-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #86efac !important;
}

.machinery-page.page-container.light-theme .machinery-loans-table.loans-table td {
  background: #ffffff !important;
  color: #111827 !important;
  -webkit-text-fill-color: #111827 !important;
  border-color: #d1d5db !important;
}

.machinery-page.page-container.light-theme .machinery-loans-table.loans-table tbody tr:hover td {
  background: #f0fdf4 !important;
}

@media (max-width: 1024px) {
  .machinery-stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .page-container.machinery-approval-page {
    padding-left: 0.65rem;
    padding-right: 0.65rem;
  }

  .details-grid {
    grid-template-columns: 1fr;
  }

  .modal-actions {
    flex-direction: column;
  }
}

@import '../styles/compact-data-table.css';
</style>

<style>
/* Teleported modals — unscoped so body Teleport still themes correctly */
.modal-overlay.app-modal-overlay.machinery-approval-modal {
  z-index: 11050 !important;
  background: rgba(4, 12, 8, 0.58) !important;
  backdrop-filter: blur(10px) saturate(120%) !important;
  -webkit-backdrop-filter: blur(10px) saturate(120%) !important;
  padding: max(0.75rem, env(safe-area-inset-top)) max(0.75rem, env(safe-area-inset-right))
    max(0.75rem, env(safe-area-inset-bottom)) max(0.75rem, env(safe-area-inset-left)) !important;
  align-items: center !important;
  justify-content: center !important;
}

.machinery-approval-modal .modal-content {
  width: min(920px, calc(100vw - 1.5rem));
  max-height: min(90vh, calc(100dvh - 1.5rem));
  margin: auto;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 16px;
  box-shadow: 0 22px 50px rgba(0, 0, 0, 0.35);
}

.machinery-approval-modal:not(.light-theme) .modal-content:not(.tx-detail-modal) {
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.98), rgba(14, 33, 23, 0.96)) !important;
  border: 1px solid rgba(126, 184, 145, 0.28) !important;
  color: #ecfdf5 !important;
}

.machinery-approval-modal:not(.light-theme) .modal-header {
  border-bottom-color: rgba(126, 184, 145, 0.22) !important;
}

.machinery-approval-modal:not(.light-theme) .modal-header h2,
.machinery-approval-modal:not(.light-theme) .booking-summary,
.machinery-approval-modal:not(.light-theme) .booking-summary p,
.machinery-approval-modal:not(.light-theme) .booking-summary strong,
.machinery-approval-modal:not(.light-theme) .modal-body > p,
.machinery-approval-modal:not(.light-theme) .confirm-message,
.machinery-approval-modal:not(.light-theme) .form-label,
.machinery-approval-modal:not(.light-theme) .modal-subtitle,
.machinery-approval-modal:not(.light-theme) .modal-hint {
  color: #ecfdf5 !important;
}

.machinery-approval-modal:not(.light-theme) .booking-summary {
  background: rgba(4, 16, 10, 0.45) !important;
  border: 1px solid rgba(126, 184, 145, 0.28) !important;
}

.machinery-approval-modal:not(.light-theme) .modal-close {
  color: rgba(236, 253, 245, 0.9) !important;
}

.machinery-approval-modal:not(.light-theme) .form-input,
.machinery-approval-modal:not(.light-theme) textarea.form-input {
  background: rgba(0, 0, 0, 0.28) !important;
  border: 1px solid rgba(126, 184, 145, 0.35) !important;
  color: #ecfdf5 !important;
}

.machinery-approval-modal:not(.light-theme) .form-input::placeholder,
.machinery-approval-modal:not(.light-theme) textarea.form-input::placeholder {
  color: rgba(236, 253, 245, 0.55) !important;
}

.machinery-approval-modal:not(.light-theme) .btn-secondary {
  background: #334155 !important;
  border-color: rgba(148, 163, 184, 0.55) !important;
  color: #f8fafc !important;
}

.machinery-approval-modal:not(.light-theme) .btn-success,
.machinery-approval-modal:not(.light-theme) .btn-danger {
  color: #ffffff !important;
}

.machinery-approval-modal.light-theme .modal-content:not(.tx-detail-modal) {
  background: #ffffff !important;
  border: 1px solid #86efac !important;
  color: #14532d !important;
}

.machinery-approval-modal.light-theme .modal-header h2 {
  color: #14532d !important;
}

.machinery-approval-modal.light-theme .modal-close {
  color: #64748b !important;
}

.machinery-approval-modal.light-theme .booking-summary,
.machinery-approval-modal.light-theme .booking-summary p,
.machinery-approval-modal.light-theme .booking-summary strong,
.machinery-approval-modal.light-theme .modal-body > p,
.machinery-approval-modal.light-theme .confirm-message,
.machinery-approval-modal.light-theme .form-label,
.machinery-approval-modal.light-theme .modal-subtitle {
  color: #14532d !important;
}

.machinery-approval-modal.light-theme .booking-summary {
  background: #f0fdf4 !important;
  border: 1px solid #bbf7d0 !important;
}

.machinery-approval-modal.light-theme .btn-secondary {
  background: #e2e8f0 !important;
  border-color: #cbd5e1 !important;
  color: #0f172a !important;
}

.machinery-approval-modal.light-theme .form-input,
.machinery-approval-modal.light-theme textarea.form-input {
  background: #ffffff !important;
  border: 1px solid #94a3b8 !important;
  color: #0f172a !important;
}

.machinery-approval-modal .modal-body {
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.machinery-approval-modal .modal-actions,
.machinery-approval-modal .complete-modal-actions {
  flex-shrink: 0;
}

@media (max-width: 768px) {
  .machinery-approval-modal .modal-content {
    width: calc(100vw - 1.25rem);
    max-height: min(92vh, calc(100dvh - 1.25rem));
    border-radius: 14px;
  }

  .machinery-approval-modal .modal-header {
    padding: 0.75rem 0.85rem;
  }

  .machinery-approval-modal .modal-header h2 {
    font-size: 0.95rem;
  }

  .machinery-approval-modal .modal-body {
    padding: 0.75rem 0.85rem;
  }

  .machinery-approval-modal .modal-actions {
    flex-wrap: wrap;
    gap: 0.45rem;
  }

  .machinery-approval-modal .modal-actions button {
    min-height: 36px;
    font-size: 0.78rem;
  }
}
</style>
