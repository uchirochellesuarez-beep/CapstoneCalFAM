<template>
  <div class="page-container admin-loans-page glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t(pageTitleKey) }}</h1>
        <p v-if="pageSubtitleKey" class="page-subtitle">{{ $t(pageSubtitleKey) }}</p>
      </div>
    </div>

    <!-- President: loan module on/off for barangay -->
    <div v-if="isPresident" class="loan-module-panel" :class="{ 'loan-module-panel--off': !loanModuleEnabled }">
      <div class="loan-module-panel__text">
        <h2 class="loan-module-panel__title">{{ $t('ui.loanModule') }}</h2>
        <p class="loan-module-panel__desc">
          <template v-if="loanModuleEnabled">
            {{ $t('ui.loanModuleOnDesc') }}
          </template>
          <template v-else>
            {{ $t('ui.loanModuleOffDesc', { message: $t('ui.loaningTemporarilyOff') }) }}
          </template>
        </p>
      </div>
      <button
        type="button"
        class="loan-module-toggle"
        :class="{ 'loan-module-toggle--on': loanModuleEnabled, 'loan-module-toggle--off': !loanModuleEnabled }"
        :disabled="loanModuleToggling"
        @click="toggleLoanModule"
        :aria-pressed="loanModuleEnabled"
      >
        <span class="loan-module-toggle__track">
          <span class="loan-module-toggle__thumb"></span>
        </span>
        <span class="loan-module-toggle__label">{{ loanModuleEnabled ? $t('ui.loanModuleOnLabel') : $t('ui.loanModuleOffLabel') }}</span>
      </button>
      <p v-if="loanModuleMessage" class="loan-module-panel__msg" :class="loanModuleMessageType">{{ loanModuleMessage }}</p>
    </div>

    <!-- Loan Overview -->
    <div class="stats-group">
      <div class="stats-group-title">{{ $t('ui.loanOverview') }}</div>
      <div class="stats-grid loan-stats">
        <div class="stat-card pending">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.pending') }}</div>
            <div class="stat-value">{{ stats.pending }}</div>
          </div>
        </div>
        <div class="stat-card approved">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.approved') }}</div>
            <div class="stat-value">{{ stats.approved }}</div>
          </div>
        </div>
        <div class="stat-card active">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.active') }}</div>
            <div class="stat-value">{{ stats.active }}</div>
          </div>
        </div>
        <div class="stat-card rejected">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.rejected') }}</div>
            <div class="stat-value">{{ stats.rejected }}</div>
          </div>
        </div>
        <div class="stat-card completed">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.completed') }}</div>
            <div class="stat-value">{{ stats.paid }}</div>
          </div>
        </div>
        <div class="stat-card overdue">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.overdue') }}</div>
            <div class="stat-value">{{ stats.overdue }}</div>
          </div>
        </div>
      </div>
      <div class="stat-card total stat-card--summary">
        <div class="stat-content">
          <div class="stat-label">{{ $t('ui.totalLoanAmount') }}</div>
          <div class="stat-value">₱{{ stats.totalAmount.toLocaleString() }}</div>
        </div>
      </div>
    </div>

    <!-- Barangay Filter (admin) -->
    <div v-if="isAdmin" class="barangay-filter-bar">
      <label for="loan-barangay-filter" class="barangay-filter-label">{{ $t('ui.barangay') }}</label>
      <select id="loan-barangay-filter" v-model="filterBarangay" class="barangay-filter-select">
        <option value="">{{ $t('ui.allBarangays') }}</option>
        <option v-for="b in barangayOptions" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
      </select>
      <span v-if="filterBarangay" class="barangay-filter-hint">
        {{ $t('ui.showingLoansFrom', { name: selectedBarangayName }) }}
      </span>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <button
        :class="['tab', { active: activeTab === 'pending' }]"
        @click="activeTab = 'pending'"
      >
        {{ $t('common.pending') }} ({{ stats.pending }})
      </button>
      <button
        :class="['tab', { active: activeTab === 'approved' }]"
        @click="activeTab = 'approved'"
      >
        {{ $t('common.approved') }} ({{ stats.approved }})
      </button>
      <button
        :class="['tab', { active: activeTab === 'active' }]"
        @click="activeTab = 'active'"
      >
        {{ $t('ui.partialPaid') }} ({{ stats.active }})
      </button>
      <button
        :class="['tab', { active: activeTab === 'overdue' }]"
        @click="activeTab = 'overdue'"
      >
        {{ $t('common.overdue') }} ({{ stats.overdue }})
      </button>
      <button
        :class="['tab', { active: activeTab === 'paid' }]"
        @click="activeTab = 'paid'"
      >
        {{ $t('ui.fullPaid') }} ({{ stats.paid }})
      </button>
      <button
        :class="['tab', { active: activeTab === 'rejected' }]"
        @click="activeTab = 'rejected'"
      >
        {{ $t('common.rejected') }} ({{ stats.rejected }})
      </button>
      <button
        :class="['tab', { active: activeTab === 'all' }]"
        @click="activeTab = 'all'"
      >
        {{ $t('ui.allLoans') }}
      </button>
    </div>

    <!-- Loans Table / Mobile Cards -->
    <div class="card loans-data-card">
      <div class="table-container">
        <div class="fin-desktop-table">
          <table class="loans-table">
            <colgroup>
              <col class="col-name" />
              <col class="col-amount" />
              <col class="col-purpose" />
              <col class="col-payer" />
              <col class="col-date" />
              <col class="col-date" />
              <col class="col-date" />
              <col class="col-term" />
              <col class="col-status" />
              <col class="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th class="th-name">{{ $t('ui.name') }}</th>
                <th class="th-amount">{{ $t('ui.amount') }}</th>
                <th class="th-purpose">{{ $t('ui.purposeColon') }}</th>
                <th class="th-payer">{{ $t('ui.payer') }}</th>
                <th class="th-date">{{ $t('ui.applied') }}</th>
                <th class="th-date">{{ $t('common.approved') }}</th>
                <th class="th-date">{{ $t('ui.lastPaid') }}</th>
                <th class="th-term">{{ $t('ui.term') }}</th>
                <th class="th-status">{{ $t('ui.status') }}</th>
                <th class="th-actions">{{ $t('ui.actions') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="10" class="loading-cell">{{ $t('ui.loadingLoans') }}</td>
              </tr>
              <tr v-else-if="filteredLoans.length === 0">
                <td colspan="10" class="empty-cell">{{ $t('ui.noLoansFound') }}</td>
              </tr>
              <tr v-else v-for="loan in filteredLoans" :key="loan.id" :data-loan-id="loan.id" :class="{ 'notification-highlight-row': highlightedLoanId == loan.id }">
                <td class="td-name" :title="loan.full_name">{{ loan.full_name }}</td>
                <td class="td-amount amount">
                  ₱{{ (loan.status === 'active' ? (loan.remaining_balance || 0) : loan.loan_amount).toLocaleString() }}
                </td>
                <td class="td-purpose" :title="formatPurpose(loan.loan_purpose)">{{ formatPurposeShort(loan.loan_purpose) }}</td>
                <td class="td-payer">
                  <div v-if="getPayerAssessment(loan.farmer_id)" class="payer-cell">
                    <div :class="['payer-badge', getPayerAssessment(loan.farmer_id).assessment.riskLevel.toLowerCase()]">
                      <span class="payer-text">{{ formatPayerStatusShort(getPayerAssessment(loan.farmer_id).assessment.classification) }}</span>
                    </div>
                    <span class="credit-score-compact">{{ getPayerAssessment(loan.farmer_id).assessment.creditScore }}/100</span>
                  </div>
                  <div v-else class="payer-badge unknown">
                    <span class="payer-text">{{ $t('ui.na') }}</span>
                  </div>
                </td>
                <td class="td-date">{{ formatTableDate(loan.application_date) }}</td>
                <td class="td-date">{{ formatTableDate(loan.approval_date) }}</td>
                <td class="td-date">{{ formatTableDate(loan.last_payment_date) }}</td>
                <td class="td-term">{{ loan.payment_term }}mo</td>
                <td class="td-status">
                  <span :class="['status-badge', loan.status]">
                    {{ loan.status }}
                  </span>
                </td>
                <td class="td-actions">
                  <div class="action-buttons">
                    <button
                      v-if="canModifyLoans && loan.status === 'pending'"
                      @click="openApproveModal(loan)"
                      class="btn btn-approve"
                      title="Approve Loan"
                    >
                      {{ $t('common.approve') }}
                    </button>
                    <button
                      v-if="canModifyLoans && loan.status === 'pending'"
                      @click="openRejectModal(loan)"
                      class="btn btn-reject"
                      title="Reject Loan"
                    >
                      {{ $t('common.reject') }}
                    </button>
                    <button
                      v-if="canModifyLoans && (loan.status === 'approved' || loan.status === 'active') && canRecordPayment(loan)"
                      @click="openPaymentModal(loan)"
                      class="btn btn-payment"
                      title="Record Payment"
                    >
                      {{ $t('ui.recordPayment') }}
                    </button>
                    <button
                      v-else-if="canModifyLoans && (loan.status === 'approved' || loan.status === 'active')"
                      class="btn btn-payment"
                      style="opacity: 0.5; cursor: not-allowed;"
                      :title="`You cannot record payments for ${loan.applicant_role === 'treasurer' ? 'Treasurer' : loan.applicant_role === 'president' ? 'President' : 'this'} loans`"
                      disabled
                    >
                      {{ $t('ui.recordPayment') }}
                    </button>
                    <button
                      @click="viewLoanDetails(loan)"
                      class="btn btn-view"
                      :title="$t('common.viewDetails')"
                    >
                      {{ $t('common.view') }}
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="fin-mobile-list">
          <div v-if="loading" class="fin-mobile-empty">{{ $t('ui.loadingLoans') }}</div>
          <div v-else-if="filteredLoans.length === 0" class="fin-mobile-empty">{{ $t('ui.noLoansFound') }}</div>
          <article
            v-else
            v-for="loan in filteredLoans"
            :key="'m-' + loan.id"
            class="fin-mobile-card"
            :data-loan-id="loan.id"
            :class="{ 'notification-highlight-card': highlightedLoanId == loan.id }"
          >
            <div class="fin-mobile-card-top">
              <h4 class="fin-mobile-card-name">{{ loan.full_name }}</h4>
              <span :class="['status-badge', loan.status]">{{ loan.status }}</span>
            </div>
            <div class="fin-mobile-card-meta">
              <div class="fin-mobile-meta-row">
                <span class="fin-mobile-label">{{ $t('ui.amount') }}</span>
                <span class="amount-cell">₱{{ (loan.status === 'active' ? (loan.remaining_balance || 0) : loan.loan_amount).toLocaleString() }}</span>
              </div>
              <div class="fin-mobile-meta-row">
                <span class="fin-mobile-label">{{ $t('ui.purposeColon') }}</span>
                <span>{{ formatPurposeShort(loan.loan_purpose) }}</span>
              </div>
              <div class="fin-mobile-meta-row">
                <span class="fin-mobile-label">{{ $t('ui.payer') }}</span>
                <span class="fin-mobile-payer">
                  <template v-if="getPayerAssessment(loan.farmer_id)">
                    <span :class="['payer-badge', getPayerAssessment(loan.farmer_id).assessment.riskLevel.toLowerCase()]">
                      <span class="payer-text">{{ formatPayerStatusShort(getPayerAssessment(loan.farmer_id).assessment.classification) }}</span>
                    </span>
                    <span class="credit-score-compact">{{ getPayerAssessment(loan.farmer_id).assessment.creditScore }}/100</span>
                  </template>
                  <span v-else class="payer-badge unknown"><span class="payer-text">{{ $t('ui.na') }}</span></span>
                </span>
              </div>
              <div class="fin-mobile-meta-row">
                <span class="fin-mobile-label">{{ $t('ui.applied') }}</span>
                <span>{{ formatTableDate(loan.application_date) }}</span>
              </div>
              <div class="fin-mobile-meta-row">
                <span class="fin-mobile-label">{{ $t('common.approved') }}</span>
                <span>{{ formatTableDate(loan.approval_date) }}</span>
              </div>
              <div class="fin-mobile-meta-row">
                <span class="fin-mobile-label">{{ $t('ui.lastPaid') }}</span>
                <span>{{ formatTableDate(loan.last_payment_date) }}</span>
              </div>
              <div class="fin-mobile-meta-row">
                <span class="fin-mobile-label">{{ $t('ui.term') }}</span>
                <span>{{ loan.payment_term }} mo</span>
              </div>
            </div>
            <div class="fin-mobile-card-actions action-buttons">
              <button
                v-if="canModifyLoans && loan.status === 'pending'"
                type="button"
                class="loan-action-text loan-action-approve"
                title="Approve Loan"
                @click="openApproveModal(loan)"
              >
                {{ $t('common.approve') }}
              </button>
              <button
                v-if="canModifyLoans && loan.status === 'pending'"
                type="button"
                class="loan-action-text loan-action-reject"
                title="Reject Loan"
                @click="openRejectModal(loan)"
              >
                {{ $t('common.reject') }}
              </button>
              <button
                v-if="canModifyLoans && (loan.status === 'approved' || loan.status === 'active') && canRecordPayment(loan)"
                type="button"
                class="loan-action-text loan-action-payment"
                title="Record Payment"
                @click="openPaymentModal(loan)"
              >
                {{ $t('ui.recordPayment') }}
              </button>
              <button
                v-else-if="canModifyLoans && (loan.status === 'approved' || loan.status === 'active')"
                type="button"
                class="loan-action-text loan-action-payment"
                style="opacity: 0.5; cursor: not-allowed;"
                :title="`You cannot record payments for ${loan.applicant_role === 'treasurer' ? 'Treasurer' : loan.applicant_role === 'president' ? 'President' : 'this'} loans`"
                disabled
              >
                {{ $t('ui.recordPayment') }}
              </button>
              <button
                type="button"
                class="loan-action-text loan-action-view"
                :title="$t('common.viewDetails')"
                @click="viewLoanDetails(loan)"
              >
                {{ $t('common.view') }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </div>

    <Teleport to="body">
    <!-- Approval Modal -->
    <Transition name="app-modal">
    <div v-if="showApproveModal" class="modal-overlay app-modal-overlay admin-loans-modal" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>✓ Approve Loan Application</h3>
          <button @click="closeModals" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="loan-summary">
            <p><strong>{{ $t('ui.farmerColon') }}</strong> {{ selectedLoan.full_name }}</p>
            <p><strong>Amount:</strong> ₱{{ selectedLoan.loan_amount.toLocaleString() }}</p>
            <p><strong>{{ $t('ui.purposeColon') }}</strong> {{ formatPurpose(selectedLoan.loan_purpose) }}</p>
            <p><strong>{{ $t('ui.paymentTermColon') }}</strong> {{ selectedLoan.payment_term }} months</p>
          </div>

          <form @submit.prevent="approveLoan">
            <div class="form-group">
              <label>Due Date</label>
              <input
                type="date"
                v-model="approvalForm.due_date"
                :min="minDueDate"
                required
              />
            </div>
            <div class="form-group">
              <label>Remarks (Optional)</label>
              <textarea
                v-model="approvalForm.remarks"
                placeholder="Add any notes or conditions..."
                rows="3"
              ></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn btn-cancel">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-submit" :disabled="processing">
                {{ processing ? 'Approving...' : 'Confirm Approval' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Transition>

    <!-- Rejection Modal -->
    <Transition name="app-modal">
    <div v-if="showRejectModal" class="modal-overlay app-modal-overlay admin-loans-modal" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>✗ Reject Loan Application</h3>
          <button @click="closeModals" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <div class="loan-summary">
            <p><strong>{{ $t('ui.farmerColon') }}</strong> {{ selectedLoan.full_name }}</p>
            <p><strong>Amount:</strong> ₱{{ selectedLoan.loan_amount.toLocaleString() }}</p>
            <p><strong>{{ $t('ui.purposeColon') }}</strong> {{ formatPurpose(selectedLoan.loan_purpose) }}</p>
          </div>

          <form @submit.prevent="rejectLoan">
            <div class="form-group">
              <label>Rejection Reason *</label>
              <textarea
                v-model="rejectionForm.reason"
                placeholder="Please provide a reason for rejection..."
                rows="4"
                required
              ></textarea>
            </div>
            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn btn-cancel">
                {{ $t('common.cancel') }}
              </button>
              <button type="submit" class="btn btn-submit btn-danger" :disabled="processing">
                {{ processing ? 'Rejecting...' : 'Confirm Rejection' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Transition>

    <!-- Details Modal -->
    <Transition name="app-modal">
    <div v-if="showDetailsModal" class="modal-overlay app-modal-overlay admin-loans-modal" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content modal-large loan-details-modal tx-detail-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="loan-details-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
                <line x1="8" y1="13" x2="16" y2="13" />
                <line x1="8" y1="17" x2="13" y2="17" />
                <path d="M8 9h2" />
              </svg>
            </span>
            <div class="modal-title-text">
              <h3>Loan Details</h3>
              <p v-if="selectedLoan?.full_name" class="modal-subtitle">{{ selectedLoan.full_name }}</p>
            </div>
          </div>
          <button type="button" @click="closeModals" class="close-btn" :aria-label="$t('common.close')">&times;</button>
        </div>
        <div class="modal-body">
          <div class="loan-details-body tx-detail-sections">
            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">Borrower Information</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item">
                  <label>Farmer Name</label>
                  <p>{{ selectedLoan.full_name }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.barangay_name">
                  <label>{{ $t('ui.barangay') }}</label>
                  <p>{{ selectedLoan.barangay_name }}</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Reference Number</label>
                  <p>{{ selectedLoan.reference_number }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="loanReceiptNumbers">
                  <label>Receipt Number</label>
                  <p>{{ loanReceiptNumbers }}</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.status') }}</label>
                  <p>
                    <span :class="['status-badge', selectedLoan.status]">
                      {{ selectedLoan.status }}
                    </span>
                  </p>
                </div>
              </div>
            </div>

            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">{{ $t('ui.loanTerms') }}</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item">
                  <label>Loan Amount</label>
                  <p class="amount">₱{{ selectedLoan.loan_amount.toLocaleString() }}</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Interest Rate</label>
                  <p>{{ selectedLoan.interest_rate }}%</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.purposeColon') }}</label>
                  <p>{{ formatPurpose(selectedLoan.loan_purpose) }}</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Payment Term</label>
                  <p>{{ selectedLoan.payment_term }} months</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Application Date</label>
                  <p>{{ formatDate(selectedLoan.application_date) }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.due_date">
                  <label>Due Date</label>
                  <p>{{ formatDate(selectedLoan.due_date) }}</p>
                </div>
              </div>
            </div>

            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">Payment Status</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item" v-if="selectedLoan.last_payment_date">
                  <label>Last Payment Date</label>
                  <p>{{ formatDate(selectedLoan.last_payment_date) }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.paid_date">
                  <label>Paid Date</label>
                  <p>{{ formatDate(selectedLoan.paid_date) }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.remaining_balance">
                  <label>Remaining Balance</label>
                  <p class="amount">₱{{ selectedLoan.remaining_balance.toLocaleString() }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.total_paid">
                  <label>Total Paid</label>
                  <p class="amount">₱{{ selectedLoan.total_paid.toLocaleString() }}</p>
                </div>
                <div
                  v-if="selectedLoan.status === 'overdue' && selectedLoan.penalty_amount > 0"
                  class="detail-item detail-item-penalty tx-detail-item tx-detail-item--penalty tx-detail-item--full full-width"
                >
                  <label>Overdue Penalty</label>
                  <p>
                    <strong>Penalty Amount:</strong> ₱{{ parseFloat(selectedLoan.penalty_amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
                  </p>
                  <p>
                    <strong>Days Overdue:</strong> {{ selectedLoan.days_overdue }} days ({{ selectedLoan.penalty_periods }} penalty periods)
                  </p>
                  <p>
                    <strong>Total with Penalty:</strong> ₱{{ parseFloat(selectedLoan.total_with_penalty).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
                  </p>
                  <p class="penalty-note">2% penalty per 6-month period overdue</p>
                </div>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="selectedLoan.approval_date || selectedLoan.approved_by_name || selectedLoan.remarks || selectedLoan.rejection_reason">
              <h3 class="tx-detail-section-title">Approval Information</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item" v-if="selectedLoan.approval_date">
                  <label>{{ $t('ui.approvalDate') }}</label>
                  <p>{{ formatDate(selectedLoan.approval_date) }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.approved_by_name">
                  <label>{{ $t('ui.approvedBy') }}</label>
                  <p>{{ selectedLoan.approved_by_name }}</p>
                </div>
                <div class="detail-item tx-detail-item tx-detail-item--full full-width" v-if="selectedLoan.remarks">
                  <label>{{ $t('ui.remarks') }}</label>
                  <p>{{ selectedLoan.remarks }}</p>
                </div>
                <div class="detail-item tx-detail-item tx-detail-item--full full-width tx-detail-item--rejection" v-if="selectedLoan.rejection_reason">
                  <label>Rejection Reason</label>
                  <p class="rejection-reason">{{ selectedLoan.rejection_reason }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Payment History Section -->
          <div v-if="loanPayments.length > 0" class="payment-history-section tx-history-section" data-payment-history>
            <div class="section-title-row">
              <span class="section-title-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="5" width="20" height="14" rx="2" />
                  <line x1="2" y1="10" x2="22" y2="10" />
                  <line x1="6" y1="15" x2="10" y2="15" />
                </svg>
              </span>
              <h4 class="tx-detail-section-title">Payment History</h4>
            </div>
            <div class="payment-history-table-wrap tx-table-wrap">
            <table class="payment-history-table">
              <thead>
                <tr>
                  <th>{{ $t('ui.date') }}</th>
                  <th>{{ $t('ui.amount') }}</th>
                  <th>{{ $t('ui.receiptNo') }}</th>
                  <th>{{ $t('ui.method') }}</th>
                  <th>{{ $t('ui.remarks') }}</th>
                  <th>{{ $t('ui.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr
                  v-for="payment in loanPayments"
                  :key="historyRowKey(payment)"
                  :data-history-key="historyRowKey(payment)"
                  :class="{ 'notification-highlight-row': highlightedHistoryKey === historyRowKey(payment) }"
                >
                  <td :data-label="$t('ui.date')">{{ formatDate(payment.payment_date) }}</td>
                  <td class="amount" :data-label="$t('ui.amount')">{{ formatHistoryAmount(payment) }}</td>
                  <td :data-label="$t('ui.receiptNo')">{{ historyReceipt(payment) }}</td>
                  <td :data-label="$t('ui.method')">{{ payment.payment_method || 'Cash' }}</td>
                  <td :data-label="$t('ui.remarks')">{{ payment.remarks || '-' }}</td>
                  <td :data-label="$t('ui.actions')">
                    <span class="history-actions">
                      <button
                        v-if="paymentReceiptNumber(payment)"
                        type="button"
                        class="history-proof-btn"
                        @click="viewLoanReceipt(paymentReceiptNumber(payment))"
                      >
                        {{ $t('common.viewReceipt') }}
                      </button>
                      <button
                        v-if="payment.proof_path"
                        type="button"
                        class="history-proof-btn"
                        @click="openLoanProofPreview(loanProofUrl(payment.proof_path))"
                      >
                        {{ $t('common.viewProof') }}
                      </button>
                      <span v-if="!paymentReceiptNumber(payment) && !payment.proof_path">—</span>
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Transition>

    <!-- Payment Recording Modal -->
    <Transition name="app-modal">
    <div v-if="showPaymentModal" class="modal-overlay app-modal-overlay admin-loans-modal" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content pay-checkout-shell" @click.stop>
        <PaymentCheckoutPanel
          :is-light="isLight"
          :kicker="$t('payCheckout.secureCheckout')"
          :title="$t('payCheckout.recordLoanPayment')"
          :payee="selectedLoan.full_name"
          :amount-due="loanAmountDue"
          :detail-rows="loanDetailRows"
          :due-meta="loanDueMeta"
          :overdue="loanIsOverdue"
          :payment-type="paymentForm.paymentType"
          :amount="paymentForm.amount"
          :date="paymentForm.payment_date"
          :method="paymentForm.payment_method"
          :methods="['Cash', 'GCash']"
          :remarks="paymentForm.remarks"
          :remaining-after="loanRemainingAfter"
          :show-partial-warning="loanShowPartialWarning"
          :submit-disabled="processing || !paymentForm.amount || parseFloat(paymentForm.amount) <= 0 || loanShowPartialWarning"
          :loading="processing"
          @cancel="closeModals"
          @submit="recordPayment"
          @update:payment-type="onLoanPaymentType"
          @update:amount="paymentForm.amount = $event"
          @update:date="paymentForm.payment_date = $event"
          @update:method="paymentForm.payment_method = $event"
          @update:remarks="paymentForm.remarks = $event"
        >
          <template #hint>
            <p v-if="loanRemainingAfter <= 0 && paymentForm.amount" class="pay-checkout-hint">
              {{ $t('payCheckout.fullyPaidNotice') }}
            </p>
          </template>
        </PaymentCheckoutPanel>
      </div>
    </div>
    </Transition>

    <Transition name="app-modal">
    <div v-if="showReceiptModal && lastReceipt" class="modal-overlay app-modal-overlay receipt-modal-overlay admin-loans-modal" :class="{ 'light-theme': isLight }" @click.self="closeReceiptModal">
      <div class="modal-content receipt-modal-content" @click.stop>
        <PaymentReceiptPrint :receipt="lastReceipt" :auto-print="receiptAutoPrint" @close="closeReceiptModal" />
      </div>
    </div>
    </Transition>
    <ProofPreviewModal
      :show="showLoanProofPreview"
      :src="loanProofSrc"
      :title="$t('ui.gcashUploadProof')"
      @close="showLoanProofPreview = false"
    />
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { useLoanModuleStore } from '../stores/loanModuleStore'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import PaymentCheckoutPanel from '../components/PaymentCheckoutPanel.vue'
import { getManilaTodayString, addMonths } from '../utils/philippineTime'
import { apiUrl } from '../utils/apiBase'
import { historyRowKey, pickFocusedHistoryRow, clearNotificationDeepLink, consumeNotificationDeepLink, scrollFocusedHistoryRowWhenReady } from '../utils/paymentHistoryFocus'
import ProofPreviewModal from '../components/ProofPreviewModal.vue'
import TypedNumberInput from '../components/TypedNumberInput.vue'
import { usePaymentReceipt } from '../composables/usePaymentReceipt'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const authStore = useAuthStore()
const loanModuleStore = useLoanModuleStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const highlightedLoanId = ref(null)
const highlightedHistoryKey = ref(null)

const loans = ref([])
const barangays = ref([])
const filterBarangay = ref('')
const loading = ref(true)
const activeTab = ref('pending')
const showApproveModal = ref(false)
const showRejectModal = ref(false)
const showDetailsModal = ref(false)
const showPaymentModal = ref(false)
const selectedLoan = ref({})
const loanPayments = ref([])
const showLoanProofPreview = ref(false)
const loanProofSrc = ref('')

const historyReceipt = (payment) => paymentReceiptNumber(payment) || payment?.receipt_number || payment?.reference_number || '-'
const isOfficialReceipt = (num) => Boolean(num && String(num).startsWith('RCPT-'))
const paymentReceiptNumber = (payment) => {
  const n = payment?.receipt_number || payment?.reference_number || ''
  return isOfficialReceipt(n) ? n : ''
}
const formatHistoryAmount = (payment) => {
  if (payment?.amount == null || payment.amount === '') return '—'
  const n = Number(payment.amount)
  if (!Number.isFinite(n)) return '—'
  return `₱${n.toLocaleString()}`
}
const loanProofUrl = (path) => apiUrl(path)
const openLoanProofPreview = (src) => {
  if (!src) return
  loanProofSrc.value = src
  showLoanProofPreview.value = true
}
const farmerAssessments = ref({}) // Store ML assessments by farmer ID

// System time change detection
const lastKnownTime = ref(Date.now())
const timeChangeCheckInterval = ref(null)
const TIME_CHECK_INTERVAL = 15000 // Check every 15 seconds
const TIME_DRIFT_THRESHOLD = 5000 // 5 second threshold for detecting actual time change

const loanReceiptNumbers = computed(() => {
  if (loanPayments.value.length === 0) return ''
  const receipts = loanPayments.value
    .map(p => p.receipt_number || p.reference_number)
    .filter(Boolean)
  return receipts.length > 0 ? receipts.join(', ') : ''
})
const processing = ref(false)

const approvalForm = ref({
  due_date: '',
  remarks: ''
})

const rejectionForm = ref({
  reason: ''
})

const paymentForm = ref({
  paymentType: 'full',
  amount: '',
  payment_date: new Date().toISOString().split('T')[0],
  payment_method: 'Cash',
  remarks: ''
})

const loanAmountDue = computed(() => Number(selectedLoan.value.remaining_balance || selectedLoan.value.loan_amount || 0))

const loanRemainingAfter = computed(() => {
  if (paymentForm.value.paymentType === 'full') return 0
  return Math.max(0, loanAmountDue.value - (parseFloat(paymentForm.value.amount) || 0))
})

const loanShowPartialWarning = computed(() => {
  if (paymentForm.value.paymentType !== 'partial') return false
  const amount = parseFloat(paymentForm.value.amount) || 0
  return amount > 0 && amount >= loanAmountDue.value * 0.99
})

const loanDetailRows = computed(() => {
  const loan = selectedLoan.value
  if (!loan?.id) return []
  return [
    { label: t('payCheckout.loanAmount'), value: `₱${Number(loan.loan_amount || 0).toLocaleString()}` },
    { label: t('payCheckout.totalPaid'), value: `₱${Number(loan.total_paid || 0).toLocaleString()}` }
  ]
})

const loanIsOverdue = computed(() => {
  const loan = selectedLoan.value
  if (!loan) return false
  if (loan.status === 'overdue') return true
  if (!loan.due_date) return false
  return String(loan.due_date).slice(0, 10) < getManilaTodayString()
})

const loanDueMeta = computed(() => {
  const due = selectedLoan.value?.due_date
  if (!due) return ''
  const date = formatDate(due)
  return loanIsOverdue.value ? t('payCheckout.dueOverdue', { date }) : t('payCheckout.dueOn', { date })
})

const { showReceiptModal, lastReceipt, receiptAutoPrint, showAndPrintReceipt, closeReceiptModal } = usePaymentReceipt()

const viewLoanReceipt = async (receiptNumber) => {
  if (!receiptNumber) return
  try {
    await showAndPrintReceipt(receiptNumber, { autoPrint: false })
  } catch (error) {
    console.error('Failed to load receipt:', error)
    alert(error.message || 'Could not load receipt')
  }
}

const isAdmin = computed(() => authStore.currentUser?.role === 'admin')
const isPresident = computed(() => authStore.currentUser?.role === 'president')
const loanModuleEnabled = computed(() => loanModuleStore.enabled)
const loanModuleToggling = ref(false)
const loanModuleMessage = ref('')
const loanModuleMessageType = ref('success')

const toggleLoanModule = async () => {
  const next = !loanModuleEnabled.value
  const confirmMsg = next
    ? t('ui.loanModuleConfirmOn')
    : t('ui.loanModuleConfirmOff')
  if (!window.confirm(confirmMsg)) return

  loanModuleToggling.value = true
  loanModuleMessage.value = ''
  try {
    await loanModuleStore.setEnabled(next)
    loanModuleMessage.value = next ? t('ui.loanModuleActivated') : t('ui.loanModuleOnHold')
    loanModuleMessageType.value = 'success'
  } catch (err) {
    loanModuleMessage.value = err.message || t('ui.loanModuleUpdateFailed')
    loanModuleMessageType.value = 'error'
  } finally {
    loanModuleToggling.value = false
  }
}

const canModifyLoans = computed(() => !isAdmin.value)

const barangayOptions = computed(() => {
  return barangays.value.map(b => ({
    id: b.id || b.barangay_id,
    name: b.name || b.barangay_name || b.barangay || String(b.id)
  }))
})

const selectedBarangayName = computed(() => {
  if (!filterBarangay.value) return ''
  const match = barangayOptions.value.find(b => String(b.id) === String(filterBarangay.value))
  return match?.name || ''
})

const getLoanBarangayId = (loan) => String(loan.barangay_id || loan.farmer_barangay || '')

const loansByBarangay = computed(() => {
  if (!filterBarangay.value) return loans.value
  return loans.value.filter(loan => getLoanBarangayId(loan) === String(filterBarangay.value))
})

const stats = computed(() => {
  return {
    pending: loansByBarangay.value.filter(l => l.status === 'pending').length,
    approved: loansByBarangay.value.filter(l => l.status === 'approved').length,
    active: loansByBarangay.value.filter(l => l.status === 'active').length,
    overdue: loansByBarangay.value.filter(l => l.status === 'overdue').length,
    paid: loansByBarangay.value.filter(l => l.status === 'paid').length,
    rejected: loansByBarangay.value.filter(l => l.status === 'rejected').length,
    totalAmount: loansByBarangay.value.reduce((sum, l) => {
      if (l.status === 'approved') {
        // For approved loans, include full loan amount
        return sum + parseFloat(l.loan_amount || 0)
      } else if (l.status === 'active') {
        // For partial paid loans, include only remaining balance
        return sum + parseFloat(l.remaining_balance || 0)
      } else if (l.status === 'overdue') {
        // For overdue loans, include remaining balance + penalty
        return sum + parseFloat(l.total_with_penalty || l.remaining_balance || 0)
      } else if (l.status === 'paid') {
        // For full paid loans, include full loan amount (historical)
        return sum + parseFloat(l.loan_amount || 0)
      }
      return sum
    }, 0)
  }
})

const filteredLoans = computed(() => {
  if (activeTab.value === 'all') {
    return loansByBarangay.value
  }
  return loansByBarangay.value.filter(loan => loan.status === activeTab.value)
})

const pageTitleKey = computed(() => {
  const userRole = authStore.currentUser?.role;
  if (userRole === 'president') return 'ui.treasurerLoanApprovals'
  if (userRole === 'operation_manager') return 'ui.loanManagementOm'
  if (userRole === 'business_manager') return 'ui.loanManagementBm'
  return 'ui.loanManagement'
})

const pageSubtitleKey = computed(() => {
  const userRole = authStore.currentUser?.role;
  if (userRole === 'admin' || userRole === 'operation_manager') return ''
  if (userRole === 'president') return 'ui.loanSubtitlePresident'
  if (userRole === 'treasurer') return 'ui.loanSubtitleTreasurer'
  if (userRole === 'business_manager') return 'ui.loanSubtitleBm'
  return 'ui.loanSubtitleDefault'
})

const canRecordPayment = computed(() => {
  return (loan) => {
    const userRole = authStore.currentUser?.role;
    const userId = authStore.currentUser?.id;
    const isOfficerLoan = ['treasurer', 'president'].includes(loan.applicant_role);
    
    // Officer loans require cross-approval for payment recording
    if (isOfficerLoan) {
      // Officers cannot record payments on their own loans
      if (userId === loan.farmer_id) return false;
      
      // Treasurer loans can only be recorded by President
      if (loan.applicant_role === 'treasurer' && userRole === 'president') return true;
      
      // President loans can only be recorded by Treasurer
      if (loan.applicant_role === 'president' && userRole === 'treasurer') return true;
      
      return false;
    }
    
    // Farmer loans can be recorded by treasurer, operation_manager, business_manager, president
    const allowedRoles = ['treasurer', 'operation_manager', 'business_manager', 'president'];
    return allowedRoles.includes(userRole);
  };
})

const minDueDate = computed(() => {
  const today = new Date()
  today.setDate(today.getDate() + 1)
  return today.toISOString().split('T')[0]
})

async function fetchBarangays() {
  try {
    const response = await fetch('/api/barangays')
    const data = await response.json()
    if (Array.isArray(data)) {
      barangays.value = data
    } else if (data.success && Array.isArray(data.barangays)) {
      barangays.value = data.barangays
    } else if (data.success && Array.isArray(data.data)) {
      barangays.value = data.data
    }
  } catch (error) {
    console.error('Error fetching barangays:', error)
  }
}

async function fetchLoans() {
  loading.value = true
  try {
    const token = authStore.token;
    const headers = {
      'Content-Type': 'application/json'
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    const params = new URLSearchParams({ deviceDate: getManilaTodayString() })
    if (isAdmin.value && filterBarangay.value) {
      params.set('barangay_id', filterBarangay.value)
    }
    const response = await fetch(`/api/loans?${params}`, { headers })
    const data = await response.json()
    if (data.success) {
      // Filter loans based on user role
      const userRole = authStore.currentUser?.role;
      const userId = authStore.currentUser?.id;
      
      if (userRole === 'president') {
        // President sees:
        // - All non-officer loans (farmers, operators, etc.)
        // - All treasurer loans (for cross-approval)
        // - Their own president loans
        loans.value = data.loans.filter(loan => 
          !['president', 'treasurer'].includes(loan.applicant_role) ||  // All non-officer loans
          loan.applicant_role === 'treasurer' ||  // Treasurer loans for cross-approval
          (loan.applicant_role === 'president' && loan.farmer_id === userId)  // Their own president loans
        );
      } else if (userRole === 'treasurer') {
        // Treasurer sees:
        // - All non-officer loans (farmers, operators, etc.)
        // - All president loans (for cross-approval reference)
        // - Their own treasurer loans
        // - But NOT other treasurers' loans
        loans.value = data.loans.filter(loan => 
          !['president', 'treasurer'].includes(loan.applicant_role) ||  // All non-officer loans
          loan.applicant_role === 'president' ||  // President loans for cross-reference
          (loan.applicant_role === 'treasurer' && loan.farmer_id === userId)  // Only their own treasurer loans
        );
      } else if (['operation_manager', 'business_manager'].includes(userRole)) {
        // Operations officers manage member (non-officer) loans in their barangay
        loans.value = data.loans.filter(loan =>
          !['president', 'treasurer'].includes(loan.applicant_role)
        );
      } else {
        // Admin sees all loans
        loans.value = data.loans;
      }

      // Fetch payer assessments for loan table badges
      await fetchFarmerAssessments()
    }
  } catch (error) {
    console.error('Error fetching loans:', error)
    alert('Failed to fetch loans')
  } finally {
    loading.value = false
  }
}

async function fetchFarmerAssessments() {
  try {
    const uniqueFarmerIds = [...new Set(loans.value.map(l => l.farmer_id))]

    for (const farmerId of uniqueFarmerIds) {
      try {
        const token = authStore.token
        const headers = {
          'Content-Type': 'application/json'
        }
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }

        const response = await fetch(`/api/ml-assessments/farmer/${farmerId}`, { headers })
        const data = await response.json()

        if (data.success) {
          farmerAssessments.value[farmerId] = data.data
        }
      } catch (error) {
        console.error(`Error fetching assessment for farmer ${farmerId}:`, error)
      }
    }
  } catch (error) {
    console.error('Error fetching farmer assessments:', error)
  }
}

function getPayerAssessment(farmerId) {
  return farmerAssessments.value[farmerId] || null;
}

function getPayerAssessmentIcon(classification) {
  return ''
}

function formatPayerStatus(classification) {
  switch (classification) {
    case 'GOOD_PAYER':
      return 'Good Payer';
    case 'AVERAGE_PAYER':
      return 'Average Payer';
    case 'HIGH_RISK_PAYER':
      return 'High Risk';
    case 'NEW_BORROWER':
      return 'New Borrower';
    default:
      return 'Unknown';
  }
}

function openApproveModal(loan) {
  selectedLoan.value = loan
  const termMonths = loan.payment_term || 12
  approvalForm.value.due_date = addMonths(getManilaTodayString(), termMonths)
  approvalForm.value.remarks = ''
  showApproveModal.value = true
}

function openRejectModal(loan) {
  selectedLoan.value = loan
  rejectionForm.value.reason = ''
  showRejectModal.value = true
}

async function viewLoanDetails(loan) {
  selectedLoan.value = loan
  loanPayments.value = []
  showDetailsModal.value = true
  
  // Fetch payment history for this loan
  try {
    const response = await fetch(`/api/loans/${loan.id}?deviceDate=${getManilaTodayString()}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await response.json()
    if (data.success && data.payments) {
      loanPayments.value = data.payments
    }
  } catch (error) {
    console.error('Error fetching loan payments:', error)
  }
}

function openPaymentModal(loan) {
  selectedLoan.value = loan
  paymentForm.value = {
    paymentType: 'full',
    amount: loan.remaining_balance || loan.loan_amount,
    payment_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    remarks: ''
  }
  showPaymentModal.value = true
}

function onLoanPaymentType(type) {
  paymentForm.value.paymentType = type
  if (type === 'full') selectFullPayment()
}

function selectFullPayment() {
  paymentForm.value.paymentType = 'full'
  paymentForm.value.amount = selectedLoan.value.remaining_balance || selectedLoan.value.loan_amount
}

function selectPartialPayment() {
  paymentForm.value.paymentType = 'partial'
  paymentForm.value.amount = ''
}

function closeModals() {
  const wasViewingDetails = showDetailsModal.value
  showApproveModal.value = false
  showRejectModal.value = false
  showDetailsModal.value = false
  showPaymentModal.value = false
  selectedLoan.value = {}
  highlightedHistoryKey.value = null
  highlightedLoanId.value = null
  if (wasViewingDetails) clearNotificationDeepLink(router, route)
}

async function applyLoanHighlightFromRoute() {
  if (!route.query.highlight || route.query.type !== 'loan') return
  const highlightId = route.query.highlight
  const focus = String(route.query.focus || '')
  const sid = route.query.sid
  const openDetails = route.query.open === '1' || focus.startsWith('gcash')
  highlightedLoanId.value = highlightId
  highlightedHistoryKey.value = null
  let loan = loans.value.find((l) => String(l.id) === String(highlightId))
  if (!loan) loan = { id: highlightId }
  if (loan.status) activeTab.value = loan.status
  await viewLoanDetails(loan)
  await nextTick()
  if (focus.startsWith('gcash')) {
    const row = pickFocusedHistoryRow(loanPayments.value, focus, sid)
    highlightedHistoryKey.value = row ? historyRowKey(row) : null
    await scrollFocusedHistoryRowWhenReady(highlightedHistoryKey.value, nextTick)
  } else if (!openDetails) {
    setTimeout(() => {
      const el = document.querySelector(`[data-loan-id="${highlightId}"]`)
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }, 300)
  }
  consumeNotificationDeepLink(router, route, () => {
    highlightedLoanId.value = null
    highlightedHistoryKey.value = null
  })
}

watch(
  () => [route.query.highlight, route.query.type, route.query.open, route.query.focus, route.query.sid, route.query.nav],
  () => {
    applyLoanHighlightFromRoute()
  }
)

const anyLoanModalOpen = computed(() =>
  showApproveModal.value ||
  showRejectModal.value ||
  showDetailsModal.value ||
  showPaymentModal.value ||
  !!(showReceiptModal.value && lastReceipt.value)
)

watch(anyLoanModalOpen, (open) => {
  document.body.classList.toggle('app-modal-open', open)
  document.body.style.overflow = open ? 'hidden' : ''
  document.documentElement.style.overflow = open ? 'hidden' : ''
}, { immediate: true })

async function approveLoan() {
  if (!canModifyLoans.value) {
    alert('Admins have view-only access and cannot approve loans.')
    return
  }

  processing.value = true
  try {
    const adminId = authStore.currentUser?.id || authStore.userId
    
    if (!adminId) {
      alert('User not authenticated properly')
      processing.value = false
      return
    }
    
    console.log('Approving loan with data:', {
      loan_id: selectedLoan.value.id,
      approved_by: adminId,
      due_date: approvalForm.value.due_date,
      remarks: approvalForm.value.remarks
    })
    
    const response = await fetch(`/api/loans/${selectedLoan.value.id}/approve`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        approved_by: adminId,
        due_date: approvalForm.value.due_date,
        remarks: approvalForm.value.remarks
      })
    })

    const data = await response.json()
    console.log('Approval response:', data)
    
    if (data.success) {
      alert('Loan approved successfully!')
      closeModals()
      await fetchLoans()
    } else {
      alert('Failed to approve loan: ' + (data.error || data.message))
      console.error('Server error:', data)
    }
  } catch (error) {
    console.error('Error approving loan:', error)
    alert('Failed to approve loan: ' + error.message)
  } finally {
    processing.value = false
  }
}

async function rejectLoan() {
  if (!canModifyLoans.value) {
    alert('Admins have view-only access and cannot reject loans.')
    return
  }

  processing.value = true
  try {
    const adminId = authStore.currentUser?.id || authStore.userId
    
    if (!adminId) {
      alert('User not authenticated properly')
      processing.value = false
      return
    }

    const response = await fetch(`/api/loans/${selectedLoan.value.id}/reject`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        rejected_by: adminId,
        rejection_reason: rejectionForm.value.reason
      })
    })

    const data = await response.json()
    
    if (data.success) {
      alert('Loan rejected')
      closeModals()
      await fetchLoans()
    } else {
      alert('Failed to reject loan: ' + (data.error || data.message))
    }
  } catch (error) {
    console.error('Error rejecting loan:', error)
    alert('Failed to reject loan: ' + error.message)
  } finally {
    processing.value = false
  }
}

async function recordPayment() {
  if (!canModifyLoans.value) {
    alert('Admins have view-only access and cannot record payments.')
    return
  }

  if (!paymentForm.value.paymentType) {
    alert('Please select payment type (Full or Partial)')
    return
  }

  if (!paymentForm.value.amount || parseFloat(paymentForm.value.amount) <= 0) {
    alert('Please enter a valid payment amount')
    return
  }

  const remainingBalance = selectedLoan.value.remaining_balance || selectedLoan.value.loan_amount
  if (parseFloat(paymentForm.value.amount) > remainingBalance) {
    alert('Payment amount cannot exceed remaining balance')
    return
  }

  processing.value = true
  try {
    const adminId = authStore.currentUser?.id || authStore.userId
    
    const response = await fetch(`/api/loans/${selectedLoan.value.id}/payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify({
        amount: parseFloat(paymentForm.value.amount),
        payment_date: paymentForm.value.payment_date,
        payment_method: paymentForm.value.payment_method,
        remarks: paymentForm.value.remarks || null,
        recorded_by: adminId
      })
    })

    const data = await response.json()
    
    if (data.success) {
      closeModals()
      await fetchLoans()
      if (data.receipt_number) {
        await showAndPrintReceipt(data.receipt_number)
      }
    } else {
      alert('Failed to record payment: ' + data.message)
    }
  } catch (error) {
    console.error('Error recording payment:', error)
    alert('Failed to record payment')
  } finally {
    processing.value = false
  }
}

function formatDate(dateString) {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatTableDate(dateString) {
  if (!dateString) return '—'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: '2-digit' })
}

function formatPurpose(purpose) {
  if (!purpose) return 'N/A'
  const purposes = {
    seeds: 'Seeds Purchase',
    equipment: 'Equipment Purchase',
    fertilizer: 'Fertilizer & Chemicals',
    irrigation: 'Irrigation System',
    other: 'Other'
  }
  return purposes[purpose] || purpose
}

function formatPurposeShort(purpose) {
  if (!purpose) return '—'
  const short = {
    seeds: 'Seeds',
    equipment: 'Equipment',
    fertilizer: 'Fertilizer',
    irrigation: 'Irrigation',
    other: 'Other'
  }
  return short[purpose] || purpose
}

function formatPayerStatusShort(classification) {
  switch (classification) {
    case 'GOOD_PAYER': return 'Good'
    case 'AVERAGE_PAYER': return 'Average'
    case 'HIGH_RISK_PAYER': return 'High Risk'
    case 'NEW_BORROWER': return 'New'
    default: return '—'
  }
}

// Function to detect system time/date changes and refresh loan statuses
function startTimeChangeDetection() {
  timeChangeCheckInterval.value = setInterval(() => {
    const currentTime = Date.now()
    const timeDifference = currentTime - lastKnownTime.value
    
    // If time has jumped forward or backward abnormally (beyond drift threshold)
    // This detects system date/time changes
    if (Math.abs(timeDifference - TIME_CHECK_INTERVAL) > TIME_DRIFT_THRESHOLD) {
      console.log(`⏰ System time change detected! Difference: ${timeDifference}ms (threshold: ${TIME_DRIFT_THRESHOLD}ms)`);
      console.log(`Last known: ${new Date(lastKnownTime.value).toLocaleString()}, Current: ${new Date(currentTime).toLocaleString()}`);
      
      // Refresh loans to recalculate overdue status
      fetchLoans();
    }
    
    lastKnownTime.value = currentTime;
  }, TIME_CHECK_INTERVAL);
}

// Function to stop time change detection
function stopTimeChangeDetection() {
  if (timeChangeCheckInterval.value) {
    clearInterval(timeChangeCheckInterval.value);
    timeChangeCheckInterval.value = null;
    console.log('⏰ Time change detection stopped');
  }
}

onMounted(async () => {
  if (isPresident.value) {
    await loanModuleStore.fetchStatus()
  }
  if (isAdmin.value) {
    await fetchBarangays()
  }
  await fetchLoans()

  startTimeChangeDetection()
  await applyLoanHighlightFromRoute()
})

onUnmounted(() => {
  // Stop detecting time changes when component is unmounted
  stopTimeChangeDetection()
  document.body.classList.remove('app-modal-open')
  document.body.style.overflow = ''
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
@import '../styles/compact-data-table.css';

/* Notification highlight for table rows */
.notification-highlight-row {
  animation: highlightRowPulse 2s ease-in-out 3;
  background: #fef2f2 !important;
  outline: 2px solid #ef4444;
  outline-offset: -2px;
}

.notification-highlight-row td {
  background: #fef2f2 !important;
  color: #991b1b;
  font-weight: 600;
}

@keyframes highlightRowPulse {
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.2); }
  50% { box-shadow: inset 0 0 0 2px rgba(239, 68, 68, 0.6); }
}

.page-container {
  padding: 2rem;
  max-width: none;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  min-height: calc(100vh - 70px - 3rem);
  box-sizing: border-box;
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

.page-header,
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
}

.page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
}

.page-header::before {
  content: '';
  position: absolute;
  top: -62px;
  right: -72px;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.2) 0%, rgba(74, 222, 128, 0) 68%);
  pointer-events: none;
}

.page-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  margin: 0 0 0.35rem;
  color: #1e293b;
}

.page-subtitle {
  color: #64748b;
  font-size: 1rem;
  font-weight: 700;
  line-height: 1.45;
  margin: 0;
}

.page-header::after {
  content: '';
  position: absolute;
  left: 1.4rem;
  right: 1.4rem;
  bottom: 0.55rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.42), rgba(45, 212, 191, 0.12));
  pointer-events: none;
}

/* Stats / Overview */
.stats-group {
  margin-bottom: 1rem;
}

.stats-group-title {
  font-size: 12px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  font-weight: 800;
  color: rgba(220, 238, 211, 0.78);
  margin-bottom: 8px;
  text-align: center;
}

.stats-grid.loan-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 8px;
}

.stat-card--summary {
  margin-top: 0;
}

.stats-grid.loan-stats .stat-card,
.stat-card--summary {
  background: white;
  padding: 10px 8px;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 4px solid;
  min-width: 0;
  min-height: 0;
}

.stats-grid.loan-stats .stat-card .stat-content,
.stat-card--summary .stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  text-align: center;
}

.stats-grid.loan-stats .stat-label,
.stat-card--summary .stat-label {
  order: 1;
  color: #64748b;
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.02em;
  line-height: 1.2;
  margin-bottom: 3px;
}

.stats-grid.loan-stats .stat-value,
.stat-card--summary .stat-value {
  order: 2;
  font-size: 1.2rem;
  font-weight: 800;
  color: #1e293b;
  line-height: 1.1;
}

.stats-grid.loan-stats .stat-card.pending,
.stat-card--summary.pending { border-left-color: #f59e0b; }
.stats-grid.loan-stats .stat-card.approved { border-left-color: #10b981; }
.stats-grid.loan-stats .stat-card.active { border-left-color: #8b5cf6; }
.stats-grid.loan-stats .stat-card.completed { border-left-color: #059669; }
.stats-grid.loan-stats .stat-card.rejected { border-left-color: #ef4444; }
.stats-grid.loan-stats .stat-card.overdue { border-left-color: #ef4444; }
.stat-card--summary.total { border-left-color: #3b82f6; }

/* Legacy stats grid alias */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
  margin-bottom: 1.25rem;
}

.stat-card {
  background: white;
  padding: 1.35rem 1.35rem 1.25rem;
  border-radius: 18px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  border-left: 4px solid;
  min-width: 0;
}

.stat-card.pending {
  border-left-color: #f59e0b;
}

.stat-card.approved {
  border-left-color: #10b981;
}

.stat-card.active {
  border-left-color: #8b5cf6;
}

.stat-card.paid,
.stat-card.completed {
  border-left-color: #059669;
}

.stat-card.rejected {
  border-left-color: #ef4444;
}

.stat-card.overdue {
  border-left-color: #ef4444;
}

.stat-card.total {
  border-left-color: #3b82f6;
}

.stat-icon {
  display: none;
}

.stat-content {
  min-width: 0;
  width: 100%;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
  line-height: 1.15;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
  line-height: 1.3;
}

.stats-group,
.stats-grid.loan-stats,
.stat-card--summary,
.filter-tabs,
.barangay-filter-bar,
.loan-module-panel,
.loans-data-card,
.fin-mobile-list {
  max-width: 100%;
  box-sizing: border-box;
}

.barangay-filter-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.65rem;
  margin-bottom: 0.75rem;
  padding: 0.85rem 1rem;
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}

.barangay-filter-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: #334155;
}

.barangay-filter-select {
  min-width: 220px;
  padding: 0.5rem 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 600;
  color: #1e293b;
  background: #fff;
}

.barangay-filter-hint {
  font-size: 0.8125rem;
  font-weight: 600;
  color: #64748b;
}

/* Filter Tabs */
.filter-tabs {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  border-bottom: 2px solid #e2e8f0;
  flex-wrap: wrap;
}

.tab {
  padding: 0.55rem 1.05rem;
  min-height: 38px;
  background: none;
  border: none;
  font-weight: 500;
  font-size: 0.9rem;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  box-sizing: border-box;
}

.tab:hover {
  color: #1e293b;
}

.tab.active {
  color: #3b82f6;
}

.tab.active::after {
  content: '';
  position: absolute;
  bottom: -2px;
  left: 0;
  right: 0;
  height: 2px;
  background: #3b82f6;
}

/* Card */
.card {
  background: white;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  overflow: hidden;
}

/* Table */
.table-container {
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  border-radius: 12px;
  border: 1px solid #94a3b8;
  max-width: 100%;
}

.fin-desktop-table {
  display: block;
  width: 100%;
  max-width: 100%;
  overflow-x: auto;
  overflow-y: auto;
  max-height: min(36rem, 62vh);
  -webkit-overflow-scrolling: touch;
}

.loans-table {
  width: 100%;
  border-collapse: collapse;
  min-width: 960px;
  table-layout: fixed;
}

.loans-table th,
.loans-table td {
  padding: 0.22rem 0.24rem;
  text-align: center;
  border-bottom: 1.5px solid #94a3b8;
  vertical-align: middle;
}

.loans-table th:not(:last-child),
.loans-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
}

.loans-table th {
  background: #f8fafc;
  font-weight: 600;
  color: #475569;
  font-size: 0.52rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.08;
  white-space: normal;
  word-break: break-word;
}

.loans-table td {
  font-size: 0.58rem;
  line-height: 1.12;
  white-space: normal;
  word-break: break-word;
  font-weight: 500;
}

.loans-table col.col-name { width: 118px; }
.loans-table col.col-amount { width: 88px; }
.loans-table col.col-purpose { width: 100px; }
.loans-table col.col-payer { width: 108px; }
.loans-table col.col-date { width: 78px; }
.loans-table col.col-term { width: 52px; }
.loans-table col.col-status { width: 82px; }
.loans-table col.col-actions { width: 168px; }

.th-name,
.td-name {
  text-align: left;
  padding-left: 0.35rem !important;
  min-width: 0;
}

.td-name {
  font-weight: 500;
  font-size: 0.58rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.td-purpose {
  text-align: center;
  min-width: 0;
  font-size: 0.58rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.th-payer,
.td-payer,
.th-actions,
.td-actions {
  padding-left: 0.28rem;
  padding-right: 0.28rem;
}

.td-actions {
  min-width: 0;
}

.th-date,
.td-date,
.th-term,
.td-term,
.th-status,
.td-status {
  text-align: center !important;
}

.th-date,
.th-term {
  white-space: normal;
  line-height: 1.08;
  font-size: 0.52rem;
}

.td-date,
.td-term {
  white-space: nowrap;
  font-size: 0.58rem;
}

.td-status {
  white-space: nowrap;
}

.loans-table tbody tr:hover {
  background: #f8fafc;
}

.amount {
  font-weight: 600;
  font-size: 0.58rem;
  color: #059669;
  white-space: nowrap;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
  padding: 0.1rem 0.32rem;
  border-radius: 5px;
  font-size: 0.52rem;
  font-weight: 600;
  text-transform: capitalize;
  line-height: 1.08;
  white-space: nowrap;
  background: transparent !important;
  border: 1px solid rgba(190, 235, 203, 0.35);
}

.status-badge.pending {
  color: #facc15;
  border-color: rgba(245, 158, 11, 0.55);
}

.status-badge.overdue {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.58);
}

.status-badge.approved {
  color: #86efac;
  border-color: rgba(16, 185, 129, 0.55);
}

.status-badge.rejected {
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.58);
}

.status-badge.active {
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.55);
}

.status-badge.paid {
  color: #6ee7b7;
  border-color: rgba(5, 150, 105, 0.58);
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 3rem;
  color: #64748b;
}

/* Action Buttons */
.action-buttons {
  display: flex;
  gap: 0.2rem;
  flex-wrap: wrap;
  justify-content: center;
}

.btn {
  padding: 0.12rem 0.26rem;
  border: none;
  border-radius: 4px;
  font-size: 0.5rem;
  font-weight: 600;
  letter-spacing: 0;
  white-space: nowrap;
  cursor: pointer;
  transition: all 0.2s;
  line-height: 1.08;
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

.btn-payment {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #5b21b6;
  border: 1px solid rgba(124, 58, 237, 0.24);
}

.btn-payment:hover {
  background: linear-gradient(135deg, #ddd6fe 0%, #c4b5fd 100%);
}

.btn-view {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #166534;
  border: 1px solid rgba(22, 163, 74, 0.3);
}

.btn-view:hover {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.15rem;
}

.modal-actions .btn,
.modal-content .btn-submit,
.modal-content .btn-cancel {
  padding: 0.55rem 1.15rem;
  font-size: 0.9rem;
  min-height: 40px;
  border-radius: 10px;
  line-height: 1.2;
}

.btn-cancel {
  background: rgba(255, 255, 255, 0.08);
  color: #eefde6;
  border: 1.5px solid rgba(190, 235, 203, 0.28);
  padding: 0.55rem 1.15rem;
  font-size: 0.9rem;
  min-height: 40px;
}

.btn-cancel:hover {
  background: rgba(255, 255, 255, 0.14);
  border-color: rgba(190, 235, 203, 0.4);
}

.btn-submit {
  background: #16a34a;
  color: white;
  padding: 0.55rem 1.15rem;
  font-size: 0.9rem;
  min-height: 40px;
  border-radius: 10px;
}

.btn-submit:hover {
  background: #15803d;
}

.btn-submit.btn-danger {
  background: #ef4444;
}

.btn-submit.btn-danger:hover {
  background: #dc2626;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-overlay.receipt-modal-overlay {
  z-index: 12000 !important;
}

/* Modal — layout matches Machinery Management; colors come from theme blocks */
.modal-overlay {
  --surface-1: rgba(28, 42, 33, 0.92);
  --line-soft: rgba(190, 235, 203, 0.14);
  --text-main: #eefde6;
  --text-muted: rgba(229, 235, 231, 0.82);
  position: fixed !important;
  inset: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  z-index: 11050 !important;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
  background: rgba(6, 12, 9, 0.62);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-content {
  background: rgba(28, 42, 33, 0.96);
  color: #eefde6;
  border-radius: 14px;
  max-width: 520px;
  width: 100%;
  max-height: min(92dvh, calc(100dvh - 1.5rem));
  overflow: hidden;
  display: flex;
  flex-direction: column;
  margin: auto;
  flex-shrink: 0;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(190, 235, 203, 0.14);
}

.modal-content.modal-large {
  width: min(48rem, calc(100vw - 1.5rem));
  max-width: min(48rem, calc(100vw - 1.5rem));
}

.modal-content > .modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.loan-details-modal .modal-header {
  padding: 1.1rem 1.25rem;
  gap: 0.75rem;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.loan-details-icon,
.section-title-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 14px;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 2px solid #86efac;
  color: #15803d;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.12);
}

.loan-details-icon {
  width: 3rem;
  height: 3rem;
}

.loan-details-icon svg {
  width: 1.55rem;
  height: 1.55rem;
}

.modal-title-text {
  min-width: 0;
}

.modal-title-text h3 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1.25;
  color: #eefde6;
}

.modal-subtitle {
  margin: 0.2rem 0 0;
  font-size: 0.82rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.82);
  line-height: 1.35;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.modal-header {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
}

.modal-header h3 {
  font-size: 1.15rem;
  font-weight: 800;
  color: #eefde6;
  margin: 0;
}

.close-btn {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(190, 235, 203, 0.15);
  font-size: 1.5rem;
  line-height: 1;
  color: rgba(229, 235, 231, 0.65);
  cursor: pointer;
  padding: 0;
  width: 2.15rem;
  height: 2.15rem;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.15s ease, color 0.15s ease, border-color 0.15s ease;
}

.close-btn:hover {
  color: #eefde6;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(190, 235, 203, 0.28);
}

.modal-body {
  padding: 1.1rem 1.25rem;
}

.modal-footer {
  padding: 0.85rem 1.25rem 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  background: transparent;
  border-radius: 0 0 14px 14px;
}

.loan-summary {
  background: rgba(0, 0, 0, 0.18);
  padding: 0.85rem 1rem;
  border-radius: 10px;
  margin-bottom: 1.15rem;
  border: 1px solid rgba(190, 235, 203, 0.12);
}

.loan-summary p {
  margin: 0.4rem 0;
  color: rgba(229, 235, 231, 0.82);
}

.payment-summary {
  background: #eff6ff;
  padding: 1rem;
  border-radius: 8px;
  margin-top: 1rem;
  border-left: 4px solid #3b82f6;
}

.payment-summary p {
  margin: 0.5rem 0;
  color: #1e40af;
}

.paid-notice {
  color: #059669 !important;
  font-weight: 600;
  margin-top: 1rem !important;
  padding-top: 1rem;
  border-top: 2px solid #d1fae5;
}

.form-group {
  margin-bottom: 1.05rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.4rem;
  font-weight: 600;
  font-size: 0.85rem;
  color: rgba(229, 235, 231, 0.82);
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgba(190, 235, 203, 0.24);
  border-radius: 9px;
  font-size: 0.95rem;
  background: rgba(0, 0, 0, 0.24);
  color: #eefde6;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.form-group small {
  display: block;
  margin-top: 0.25rem;
  color: #64748b;
  font-size: 0.875rem;
}

.payment-type-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.65rem;
}

.payment-type-btn {
  padding: 0.75rem 0.65rem;
  min-height: 42px;
  border: 1.5px solid rgba(190, 235, 203, 0.24);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.82);
  cursor: pointer;
  transition: all 0.2s;
}

.payment-type-btn:hover {
  border-color: #3b82f6;
  background: #eff6ff;
}

.payment-type-btn.active {
  border-color: #3b82f6;
  background: #3b82f6;
  color: white;
}

.full-payment-display {
  background: #f0fdf4;
  padding: 1.5rem;
  border-radius: 8px;
  border: 2px solid #10b981;
}

.full-payment-display label {
  color: #065f46;
  font-weight: 600;
  margin-bottom: 0.5rem;
}

.full-amount {
  font-size: 1.75rem;
  font-weight: 700;
  color: #059669;
  margin: 0;
}

/* Details Grid */
.modal-content:not(.tx-detail-modal) .details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 1rem;
}

.modal-content:not(.tx-detail-modal) .detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 1rem 1.05rem;
  background: #f8fafc;
  border: 1px solid #e2e8f0;
  border-radius: 12px;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.detail-item p {
  font-size: 1.0625rem;
  color: #1e293b;
  margin: 0;
  line-height: 1.45;
  font-weight: 600;
}

.detail-item-penalty {
  background: #fef9c3;
  border-color: #fde047;
}

.detail-item-penalty label,
.detail-item-penalty p {
  color: #92400e;
}

.penalty-note {
  margin-top: 0.35rem !important;
  font-size: 0.9375rem !important;
  font-weight: 500 !important;
  font-style: italic;
}

.rejection-reason {
  color: #dc2626;
  font-style: italic;
}

/* Payment History Section */
.payment-history-section {
  margin-top: 1.75rem;
  padding-top: 1.35rem;
  border-top: 2px solid #e2e8f0;
}

.section-title-row {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  margin-bottom: 1rem;
}

.section-title-icon {
  width: 2.35rem;
  height: 2.35rem;
  border-radius: 10px;
}

.section-title-icon svg {
  width: 1.2rem;
  height: 1.2rem;
}

.payment-history-section h4 {
  margin: 0;
  color: #1e293b;
  font-size: 1.15rem;
  font-weight: 800;
}

.payment-history-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 2px solid #94a3b8;
  border-radius: 12px;
}

.payment-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.58rem;
  min-width: 520px;
  table-layout: fixed;
}

.payment-history-table th,
.payment-history-table td {
  padding: 0.22rem 0.26rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
  line-height: 1.12;
}

.payment-history-table th {
  background: #f8fafc;
  font-weight: 700;
  color: #475569;
  font-size: 0.52rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  white-space: normal;
}

.payment-history-table td.amount {
  color: #059669;
  font-weight: 700;
  font-size: 0.58rem;
  white-space: nowrap;
}

.history-actions {
  display: inline-flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 0.35rem 0.7rem;
  text-align: right;
}

.history-proof-btn {
  border: 0;
  background: none;
  padding: 0;
  color: #2563eb;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

/* Mobile card lists — hidden on desktop (shown at ≤768px) */
.fin-mobile-list {
  display: none;
}

.fin-mobile-empty {
  padding: 1.25rem 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: #64748b;
}

.fin-mobile-card {
  padding: 0.7rem 0.75rem 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(167, 211, 178, 0.22);
  background: rgba(0, 0, 0, 0.16);
  width: 100%;
  max-width: 100%;
  box-sizing: border-box;
  overflow: hidden;
}

.fin-mobile-card.notification-highlight-card {
  border-color: rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.12);
  box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.25);
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
  color: #ecfdf5;
  word-break: break-word;
  min-width: 0;
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
  color: rgba(236, 253, 245, 0.92);
}

.fin-mobile-meta-row > span:last-child {
  text-align: right;
  word-break: break-word;
  min-width: 0;
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

.fin-mobile-payer {
  display: inline-flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 0.25rem;
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

.loan-action-text {
  display: none;
  align-items: center;
  justify-content: center;
  flex: 1 1 0;
  min-width: 0;
  min-height: 36px;
  padding: 0.42rem 0.45rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  margin: 0;
  text-align: center;
  border: 1.5px solid transparent;
}

.loan-action-approve {
  color: #d1fae5;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(52, 211, 153, 0.45);
}

.loan-action-reject {
  color: #fecaca;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(248, 113, 113, 0.45);
}

.loan-action-payment {
  color: #ddd6fe;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(167, 139, 250, 0.5);
}

.loan-action-view {
  color: #d1fae5;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(52, 211, 153, 0.45);
}

.fin-mobile-action {
  flex: 1 1 auto;
  min-height: 36px;
  min-width: 0;
  justify-content: center;
  font-size: 0.78rem !important;
  padding: 0.42rem 0.55rem !important;
}

.amount-cell {
  font-weight: 800;
  color: #86efac;
}

.page-container.admin-loans-page.light-theme .fin-mobile-card {
  background: #ffffff;
  border-color: #bbf7d0;
}

.page-container.admin-loans-page.light-theme .fin-mobile-card-name {
  color: #0f172a;
}

.page-container.admin-loans-page.light-theme .fin-mobile-label {
  color: #64748b;
}

.page-container.admin-loans-page.light-theme .fin-mobile-meta-row {
  color: #1e293b;
}

.page-container.admin-loans-page.light-theme .fin-mobile-card-actions {
  border-top-color: #bbf7d0;
}

.page-container.admin-loans-page.light-theme .fin-mobile-empty {
  color: #64748b;
}

.page-container.admin-loans-page.light-theme .amount-cell {
  color: #15803d;
}

.page-container.admin-loans-page.light-theme .loan-action-approve {
  color: #166534;
  background: #f0fdf4;
  border-color: #86efac;
}

.page-container.admin-loans-page.light-theme .loan-action-reject {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fca5a5;
}

.page-container.admin-loans-page.light-theme .loan-action-payment {
  color: #5b21b6;
  background: #f5f3ff;
  border-color: #c4b5fd;
}

.page-container.admin-loans-page.light-theme .loan-action-view {
  color: #166534;
  background: #f0fdf4;
  border-color: #86efac;
}

@media (max-width: 1024px) {
  .modal-overlay {
    left: 0;
  }

  .modal-content.modal-large {
    width: min(48rem, calc(100vw - 1.5rem));
    max-width: calc(100vw - 1.5rem);
  }
}

@media (max-width: 768px) {
  .page-container,
  .page-container.admin-loans-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    max-width: none;
    padding: 0.75rem;
    border-radius: 0;
    overflow-x: hidden;
    min-height: 0;
    touch-action: pan-y;
  }

  .page-header,
  .page-header-split {
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.85rem;
    gap: 0.35rem;
  }

  .page-header::after {
    display: none;
  }

  .page-header-text {
    min-width: 0;
  }

  .page-title {
    font-size: 1.2rem;
    margin: 0;
    line-height: 1.25;
  }

  .page-subtitle {
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
  }

  .loan-module-panel {
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    align-content: flex-start;
    gap: 0.4rem;
    padding: 0.6rem 0.7rem;
    margin-bottom: 0.75rem;
    border-radius: 12px;
    min-height: 0;
    height: auto;
  }

  .loan-module-panel__text {
    flex: 0 0 auto;
    width: 100%;
  }

  .loan-module-panel__title {
    font-size: 0.75rem;
    margin-bottom: 0.12rem;
  }

  .loan-module-panel__desc {
    font-size: 0.62rem;
    line-height: 1.35;
  }

  .loan-module-toggle {
    width: auto;
    max-width: 100%;
    align-self: flex-start;
    justify-content: flex-start;
    min-height: 32px;
    padding: 0.3rem 0.55rem;
    font-size: 0.65rem;
    gap: 0.45rem;
  }

  .loan-module-toggle__label {
    font-size: 0.65rem;
  }

  .stats-grid.loan-stats {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.5rem;
  }

  .stats-grid.loan-stats .stat-card,
  .stat-card--summary {
    padding: 0.7rem 0.75rem 0.65rem;
    gap: 0;
    border-radius: 12px;
    min-height: 0;
  }

  .stat-card--summary {
    margin-top: 0.35rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .stat-card.total,
  .stat-card--summary {
    grid-column: 1 / -1;
  }

  .stat-card {
    padding: 0.7rem 0.75rem 0.65rem;
    gap: 0.45rem;
    border-radius: 12px;
    min-height: 0;
  }

  .stat-icon {
    width: 32px;
    height: 32px;
    border-radius: 9px;
  }

  .stat-icon-image {
    width: 18px;
    height: 18px;
  }

  .stats-grid.loan-stats .stat-label,
  .stat-card--summary .stat-label,
  .stat-label {
    font-size: 0.62rem;
    margin-bottom: 0.15rem;
    letter-spacing: 0.04em;
    line-height: 1.2;
  }

  .stats-grid.loan-stats .stat-value,
  .stat-card--summary .stat-value,
  .stat-value {
    font-size: 1.15rem;
    line-height: 1.15;
  }

  .barangay-filter-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    padding: 0.65rem 0.7rem;
    margin-bottom: 0.75rem;
    border-radius: 12px;
  }

  .barangay-filter-label {
    font-size: 0.65rem;
    letter-spacing: 0.03em;
    text-transform: uppercase;
  }

  .barangay-filter-select {
    width: 100%;
    min-width: 0;
    min-height: 36px;
    height: 36px;
    font-size: 0.82rem;
    border-radius: 8px;
    padding: 0 0.7rem;
  }

  .barangay-filter-hint {
    font-size: 0.72rem;
  }

  .filter-tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem;
    overflow: visible;
    padding-bottom: 0;
    margin-bottom: 0.75rem;
    border-bottom: 0;
  }

  .filter-tabs .tab {
    flex: none;
    width: 100%;
    min-width: 0;
    padding: 0.4rem 0.45rem;
    font-size: 0.72rem;
    min-height: 36px;
    white-space: normal;
    border-radius: 9px;
    line-height: 1.2;
  }

  .loans-data-card {
    padding: 0;
    border-radius: 14px;
    background: transparent;
    border: none;
    box-shadow: none;
  }

  .table-container {
    overflow-x: visible;
    border: none;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
  }

  .fin-desktop-table {
    display: none !important;
  }

  .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
    width: 100%;
  }

  .loan-action-text {
    display: inline-flex;
  }

  .fin-mobile-card .status-badge {
    font-size: 0.62rem;
    padding: 0.2rem 0.45rem;
    flex-shrink: 0;
  }

  .fin-mobile-card .payer-badge {
    font-size: 0.58rem;
  }

  .fin-mobile-card .credit-score-compact {
    font-size: 0.58rem;
  }

  .modal-overlay {
    padding:
      max(0.65rem, env(safe-area-inset-top, 0px))
      0.75rem
      0.75rem !important;
    padding-left: 0.75rem !important;
    align-items: center !important;
    justify-content: center !important;
  }

  .modal-overlay .modal-content,
  .modal-content.modal-large {
    width: min(calc(100vw - 1.5rem), 100%) !important;
    max-width: calc(100vw - 1.5rem) !important;
    max-height: min(92dvh, calc(100dvh - 1.5rem)) !important;
    margin: auto !important;
    border-radius: 14px;
    padding: 0;
    overflow: hidden;
  }

  .modal-header,
  .modal-body {
    padding-left: 0.95rem;
    padding-right: 0.95rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
    align-items: stretch;
    gap: 0.5rem;
  }

  .modal-actions > * {
    width: 100%;
    min-height: 40px;
  }

  .payment-type-buttons {
    gap: 0.45rem;
  }

  .payment-type-btn {
    padding: 0.6rem 0.4rem;
    font-size: 0.78rem;
    min-height: 40px;
  }
}

@media (max-width: 480px) {
  .page-container,
  .page-container.admin-loans-page {
    padding: 0.65rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }

  .page-title {
    font-size: 1.1rem;
  }

  .fin-mobile-card {
    padding: 0.65rem 0.7rem;
  }

  .fin-mobile-card-name {
    font-size: 0.9rem;
  }

  .fin-mobile-label {
    min-width: 4.2rem;
    font-size: 0.62rem;
  }

  .filter-tabs {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.35rem;
  }

  .loan-action-text {
    font-size: 0.72rem;
    min-height: 34px;
    padding: 0.35rem 0.3rem;
  }
}

/* Payer Status Badge */
.payer-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.15rem;
  padding: 0.1rem 0.3rem;
  border-radius: 5px;
  font-weight: 600;
  font-size: 0.5rem;
  white-space: nowrap;
  line-height: 1.08;
}

.credit-score-compact {
  font-size: 0.5rem;
  font-weight: 600;
  color: #64748b;
  line-height: 1.08;
}

.payer-badge.low {
  background: rgba(134, 239, 172, 0.28);
  color: #d9fbe8;
  border: 1px solid rgba(134, 239, 172, 0.55);
}

.payer-badge.medium {
  background: rgba(253, 224, 71, 0.24);
  color: #fef3c7;
  border: 1px solid rgba(250, 204, 21, 0.5);
}

.payer-badge.high {
  background: rgba(248, 113, 113, 0.25);
  color: #fee2e2;
  border: 1px solid rgba(248, 113, 113, 0.55);
}

.payer-badge.loading {
  background: #e0e7ff;
  color: #3730a3;
  border: 1px solid #a5b4fc;
}

.payer-badge.unknown {
  background: rgba(125, 211, 252, 0.2);
  color: #dbeafe;
  border: 1px solid rgba(125, 211, 252, 0.48);
}

.payer-icon {
  display: none;
}

.payer-text {
  letter-spacing: 0.5px;
}

.payer-cell {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  min-width: 0;
  align-items: center;
  text-align: center;
}

.payer-reason {
  display: flex;
  flex-direction: column;
  gap: 0.14rem;
  font-size: 0.65rem;
  color: #555;
  line-height: 1.15;
}

.credit-score {
  color: #374151;
}

.score-factors {
  display: flex;
  gap: 0.24rem;
  flex-wrap: wrap;
  font-size: 0.62rem;
  color: #6b7280;
  justify-content: center;
}

.score-factors span {
  cursor: help;
}

.payer-desc {
  font-style: italic;
  color: #6b7280;
  font-size: 0.76rem;
}

/* Dashboard theme — shared geometry; colors differ by theme */
.page-container.admin-loans-page {
  min-height: calc(100vh - 70px - 3rem);
  border-radius: 18px;
}

.page-container.admin-loans-page:not(.light-theme) {
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  color: #eefde6;
}

.page-container.admin-loans-page:not(.light-theme) :is(.page-header, .card, .summary-card, .alert-card, .loan-module-panel) {
  background: rgba(28, 42, 33, 0.92) !important;
  border: 1px solid rgba(190, 235, 203, 0.14) !important;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.30), inset 1px 1px 0 rgba(255,255,255,0.05) !important;
}

.page-container.admin-loans-page:not(.light-theme) .stat-card:not([style]) {
  background: rgba(24, 39, 30, 0.92) !important;
  border: 1px solid rgba(190, 235, 203, 0.14) !important;
  border-left-width: 4px !important;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24), inset 1px 1px 0 rgba(255,255,255,0.04) !important;
}

.page-container.admin-loans-page:not(.light-theme) .stat-card.overdue {
  background: linear-gradient(135deg, #ff6b6b 0%, #ee5a52 100%) !important;
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  border-left-width: 4px !important;
  border-left-color: #ef4444 !important;
}

.page-container.admin-loans-page:not(.light-theme) .stat-card.overdue :is(.stat-value, .stat-label) {
  color: #ffffff !important;
}

.page-container.admin-loans-page:not(.light-theme) .stat-card[style] {
  border: 1px solid rgba(255, 255, 255, 0.25) !important;
  border-left-width: 4px !important;
}

.page-container.admin-loans-page:not(.light-theme) :is(.page-title, .stat-value, .payment-history-section h4) {
  color: #ffffff !important;
}

.page-container.admin-loans-page:not(.light-theme) :is(.page-subtitle, .stat-label, .form-group small, .score-factors, .payer-desc, .barangay-filter-label, .barangay-filter-hint) {
  color: #ffffff !important;
}

/* Loan Details modal — theme-aware compact cards (teleported, so target overlay) */
.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .modal-title-text h3 {
  color: #f9fafb !important;
  -webkit-text-fill-color: #f9fafb !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .modal-subtitle {
  color: #d1d5db !important;
  -webkit-text-fill-color: #d1d5db !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .detail-item {
  background: #15241b !important;
  border: 1px solid rgba(134, 239, 172, 0.22) !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .detail-item label {
  color: #9ca3af !important;
  -webkit-text-fill-color: #9ca3af !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .detail-item p,
.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .detail-item p.amount {
  color: #f9fafb !important;
  -webkit-text-fill-color: #f9fafb !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .detail-item p.amount {
  color: #86efac !important;
  -webkit-text-fill-color: #86efac !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .detail-item-penalty {
  background: rgba(251, 191, 36, 0.14) !important;
  border-color: rgba(251, 191, 36, 0.4) !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .detail-item-penalty :is(label, p) {
  color: #fde68a !important;
  -webkit-text-fill-color: #fde68a !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .rejection-reason {
  color: #fecaca !important;
  -webkit-text-fill-color: #fecaca !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .modal-footer {
  background: #1a2b20 !important;
  border-top: 1px solid rgba(255, 255, 255, 0.1) !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .payment-history-section {
  border-color: rgba(255, 255, 255, 0.1) !important;
  background: #1f3024 !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .payment-history-table th {
  background: rgba(134, 239, 172, 0.12) !important;
  color: #bbf7d0 !important;
  -webkit-text-fill-color: #bbf7d0 !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal.tx-detail-modal .payment-history-table td {
  background: transparent !important;
  color: #f9fafb !important;
  -webkit-text-fill-color: #f9fafb !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal .status-badge.pending {
  color: #fef3c7 !important;
  background: rgba(146, 64, 14, 0.45) !important;
  border-color: rgba(251, 191, 36, 0.3) !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal .status-badge.approved,
.modal-overlay:not(.light-theme) .loan-details-modal .status-badge.active {
  color: #dbeafe !important;
  background: rgba(30, 64, 175, 0.42) !important;
  border-color: rgba(96, 165, 250, 0.3) !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal .status-badge.paid {
  color: #dcfce7 !important;
  background: rgba(22, 101, 52, 0.55) !important;
  border-color: rgba(74, 222, 128, 0.28) !important;
}

.modal-overlay:not(.light-theme) .loan-details-modal .status-badge.rejected,
.modal-overlay:not(.light-theme) .loan-details-modal .status-badge.overdue {
  color: #fee2e2 !important;
  background: rgba(153, 27, 27, 0.42) !important;
  border-color: rgba(248, 113, 113, 0.28) !important;
}

.page-container.admin-loans-page .barangay-filter-bar {
  border: 1px solid transparent;
  box-shadow: 0 4px 14px rgba(4, 18, 12, 0.2);
}

.page-container.admin-loans-page .barangay-filter-select {
  border: 1px solid #cbd5e1;
}

.page-container.admin-loans-page:not(.light-theme) .barangay-filter-bar {
  background: rgba(30, 66, 52, 0.92) !important;
  border-color: rgba(167, 211, 178, 0.22) !important;
  box-shadow: 0 4px 14px rgba(4, 18, 12, 0.2) !important;
}

.page-container.admin-loans-page:not(.light-theme) .barangay-filter-select {
  background: rgba(20, 48, 38, 0.9) !important;
  color: #ffffff !important;
  border-color: rgba(167, 211, 178, 0.22) !important;
}

.page-container.admin-loans-page:not(.light-theme) .page-title {
  background: none !important;
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
  -webkit-text-fill-color: #ffffff !important;
}

.page-container.admin-loans-page:not(.light-theme) .stat-card[style] :is(.stat-value, .stat-label) {
  color: #ffffff !important;
}

.page-container.admin-loans-page:not(.light-theme) .stat-icon-image {
  opacity: 0.96;
}

.page-container.admin-loans-page:not(.light-theme) :is(.payer-badge, .payer-reason, .credit-score, .credit-score-compact, .score-factors, .payer-desc, .payer-text) {
  color: rgba(238, 245, 240, 0.96) !important;
}

.page-container.admin-loans-page:not(.light-theme) .payer-text {
  color: inherit !important;
}

.page-container.admin-loans-page:not(.light-theme) :is(.payer-badge.low, .payer-badge.medium, .payer-badge.high, .payer-badge.loading, .payer-badge.unknown) {
  color: inherit !important;
}

.page-container.admin-loans-page:not(.light-theme) .payer-badge.low {
  background: rgba(134, 239, 172, 0.28) !important;
  border-color: rgba(134, 239, 172, 0.55) !important;
  color: #d9fbe8 !important;
}

.page-container.admin-loans-page:not(.light-theme) .payer-badge.medium {
  background: rgba(253, 224, 71, 0.24) !important;
  border-color: rgba(250, 204, 21, 0.5) !important;
  color: #fef3c7 !important;
}

.page-container.admin-loans-page:not(.light-theme) .payer-badge.high {
  background: rgba(248, 113, 113, 0.25) !important;
  border-color: rgba(248, 113, 113, 0.55) !important;
  color: #fee2e2 !important;
}

.page-container.admin-loans-page:not(.light-theme) .payer-badge.unknown {
  background: rgba(125, 211, 252, 0.2) !important;
  border-color: rgba(125, 211, 252, 0.48) !important;
  color: #dbeafe !important;
}

.page-container.admin-loans-page .filter-tabs {
  border-bottom: 0 !important;
  gap: 0.75rem !important;
}

.page-container.admin-loans-page .tab {
  border: 1px solid transparent !important;
  border-radius: 12px !important;
  font-weight: 700 !important;
  box-shadow: none !important;
}

.page-container.admin-loans-page .tab.active::after {
  display: none !important;
  content: none !important;
}

.page-container.admin-loans-page:not(.light-theme) .filter-tabs {
  border-bottom: 0 !important;
}

.page-container.admin-loans-page:not(.light-theme) .tab {
  background: rgba(30, 66, 52, 0.92) !important;
  border-color: rgba(167, 211, 178, 0.22) !important;
  color: #ffffff !important;
}

.page-container.admin-loans-page:not(.light-theme) .tab:hover {
  background: rgba(37, 82, 65, 0.96) !important;
  color: #ffffff !important;
}

.page-container.admin-loans-page:not(.light-theme) .tab.active {
  background: rgba(45, 92, 74, 0.98) !important;
  color: #ffffff !important;
  border-color: rgba(232, 196, 104, 0.35) !important;
}

.page-container.admin-loans-page:not(.light-theme) :is(.loans-table th, .payment-history-table th) {
  background: linear-gradient(135deg, #255241 0%, #2d5c4a 100%) !important;
  color: #ffffff !important;
  border-bottom-color: #6ee7a8 !important;
}

.page-container.admin-loans-page :is(.loans-table th, .payment-history-table th):not(:last-child),
.page-container.admin-loans-page :is(.loans-table td, .payment-history-table td):not(:last-child) {
  border-right: 1.5px solid #94a3b8 !important;
}

.page-container.admin-loans-page :is(.loans-table td, .payment-history-table td) {
  border-bottom: 1.5px solid #94a3b8 !important;
}

.page-container.admin-loans-page:not(.light-theme) :is(.loans-table td, .payment-history-table td) {
  color: #ffffff !important;
}

.page-container.admin-loans-page :is(.loans-table th, .payment-history-table th) {
  border-bottom: 2px solid #94a3b8 !important;
}

.page-container.admin-loans-page .table-container,
.page-container.admin-loans-page .payment-history-table-wrap {
  border: 2px solid #94a3b8 !important;
}

.page-container.admin-loans-page:not(.light-theme) .empty-state {
  color: #ffffff !important;
}

.page-container.admin-loans-page:not(.light-theme) .loans-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.07) !important;
}

.modal-overlay:not(.light-theme) :is(.form-group input, .form-group textarea, .form-group select, .payment-type-btn) {
  background: rgba(0,0,0,0.24) !important;
  color: #eefde6 !important;
  border-color: rgba(190, 235, 203, 0.24) !important;
}

.modal-overlay:not(.light-theme) .payment-type-btn.active {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.28), rgba(34, 197, 94, 0.2)) !important;
  border-color: rgba(74, 222, 128, 0.38) !important;
}

.modal-overlay:not(.light-theme) .payment-type-btn:hover {
  background: rgba(74, 222, 128, 0.12) !important;
  border-color: rgba(74, 222, 128, 0.38) !important;
}

/* ===== LIGHT MODE — colors only (geometry matches dark) ===== */
.page-container.admin-loans-page.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
}

.page-container.admin-loans-page.light-theme :is(.page-header, .card) {
  background: #ffffff !important;
  border: 1px solid #86efac !important;
  box-shadow: 0 8px 26px rgba(22, 101, 52, 0.1), inset 1px 1px 0 rgba(255, 255, 255, 0.65) !important;
}

.page-container.admin-loans-page.light-theme .stats-group-title {
  color: #166534 !important;
}

.page-container.admin-loans-page.light-theme .stats-grid.loan-stats .stat-label,
.page-container.admin-loans-page.light-theme .stat-card--summary .stat-label {
  color: #64748b !important;
}

.page-container.admin-loans-page.light-theme .stats-grid.loan-stats .stat-value,
.page-container.admin-loans-page.light-theme .stat-card--summary .stat-value {
  color: #14532d !important;
}

.page-container.admin-loans-page.light-theme .stat-card {
  background: #ffffff !important;
  border: 1px solid #86efac !important;
  border-left-width: 4px !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.08), inset 1px 1px 0 rgba(255, 255, 255, 0.65) !important;
}

.page-container.admin-loans-page.light-theme .stat-card.pending {
  border-left-color: #f59e0b !important;
}

.page-container.admin-loans-page.light-theme .stat-card.approved {
  border-left-color: #10b981 !important;
}

.page-container.admin-loans-page.light-theme .stat-card.active {
  border-left-color: #8b5cf6 !important;
}

.page-container.admin-loans-page.light-theme .stat-card.overdue {
  border-left-color: #ef4444 !important;
}

.page-container.admin-loans-page.light-theme .stat-card.paid,
.page-container.admin-loans-page.light-theme .stat-card.completed {
  border-left-color: #059669 !important;
}

.page-container.admin-loans-page.light-theme .stat-card.rejected {
  border-left-color: #ef4444 !important;
}

.page-container.admin-loans-page.light-theme .stat-card.total {
  border-left-color: #3b82f6 !important;
}

.page-container.admin-loans-page.light-theme .stat-card.overdue :is(.stat-value, .stat-label) {
  color: #052e16 !important;
}

.page-container.admin-loans-page.light-theme .page-title {
  color: #052e16 !important;
  background: none !important;
  -webkit-text-fill-color: currentColor !important;
}

.page-container.admin-loans-page.light-theme .page-subtitle {
  color: #166534 !important;
}

.page-container.admin-loans-page.light-theme .stat-value {
  color: #052e16 !important;
}

.page-container.admin-loans-page.light-theme .stat-label {
  color: #166534 !important;
}

.page-container.admin-loans-page.light-theme .barangay-filter-bar {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08);
}

.page-container.admin-loans-page.light-theme .barangay-filter-label {
  color: #166534;
}

.page-container.admin-loans-page.light-theme .barangay-filter-select {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #052e16;
}

.page-container.admin-loans-page.light-theme .barangay-filter-hint {
  color: #64748b;
}

.page-container.admin-loans-page.light-theme .tab {
  background: #ffffff !important;
  border-color: #166534 !important;
  color: #14532d !important;
}

.page-container.admin-loans-page.light-theme .tab.active {
  background: #dcfce7 !important;
  color: #14532d !important;
}

.page-container.admin-loans-page.light-theme .table-container {
  border-color: #94a3b8;
  background: #ffffff;
}

.page-container.admin-loans-page.light-theme :is(.loans-table th, .payment-history-table th) {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #000000 !important;
  border-bottom-color: #16a34a !important;
}

.page-container.admin-loans-page.light-theme :is(.loans-table th, .payment-history-table th):not(:last-child),
.page-container.admin-loans-page.light-theme :is(.loans-table td, .payment-history-table td):not(:last-child) {
  border-right-color: #94a3b8 !important;
}

.page-container.admin-loans-page.light-theme :is(.loans-table td, .payment-history-table td) {
  color: #000000 !important;
  border-bottom-color: #94a3b8 !important;
  background: #ffffff !important;
}

.page-container.admin-loans-page.light-theme :is(.td-purpose, .td-date, .td-term, .td-payer, .td-amount, .num-cell) {
  color: #14532d !important;
}

.page-container.admin-loans-page.light-theme .loading-cell,
.page-container.admin-loans-page.light-theme .empty-cell {
  color: #000000 !important;
}

.page-container.admin-loans-page.light-theme .payment-history-table-wrap {
  border-color: #94a3b8;
  background: #ffffff;
}

.page-container.admin-loans-page.light-theme .status-badge {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #052e16 !important;
}

.page-container.admin-loans-page.light-theme .status-badge.pending {
  background: #fef9c3 !important;
  border-color: #ca8a04 !important;
  color: #92400e !important;
}

.page-container.admin-loans-page.light-theme .status-badge.overdue {
  background: #fee2e2 !important;
  border-color: #dc2626 !important;
  color: #991b1b !important;
}

.page-container.admin-loans-page.light-theme .status-badge.approved {
  background: #f0fdf4 !important;
  border-color: #16a34a !important;
  color: #15803d !important;
}

.page-container.admin-loans-page.light-theme .status-badge.rejected {
  background: #fef2f2 !important;
  border-color: #dc2626 !important;
  color: #991b1b !important;
}

.page-container.admin-loans-page.light-theme .status-badge.active {
  background: #eff6ff !important;
  border-color: #2563eb !important;
  color: #1d4ed8 !important;
}

.page-container.admin-loans-page.light-theme .status-badge.paid {
  background: #f0fdf4 !important;
  border-color: #16a34a !important;
  color: #15803d !important;
}

.page-container.admin-loans-page.light-theme .loans-table tbody tr:nth-child(even) td {
  background: #f8fdf9 !important;
}

.page-container.admin-loans-page.light-theme .loans-table tbody tr:hover td {
  background: #ecfdf5 !important;
}

.page-container.admin-loans-page.light-theme .td-name {
  color: #052e16 !important;
}

.page-container.admin-loans-page.light-theme .amount {
  color: #15803d !important;
}

.page-container.admin-loans-page.light-theme .payer-text {
  color: inherit !important;
}

.page-container.admin-loans-page.light-theme .payer-reason,
.page-container.admin-loans-page.light-theme .score-factors,
.page-container.admin-loans-page.light-theme .payer-desc {
  color: #166534 !important;
}

.page-container.admin-loans-page.light-theme .btn-view {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #166534 !important;
  border-color: #16a34a !important;
}

.page-container.admin-loans-page.light-theme .payer-badge.low {
  background: #dcfce7 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}

.page-container.admin-loans-page.light-theme .payer-badge.medium {
  background: #fef9c3 !important;
  border-color: #fde047 !important;
  color: #a16207 !important;
}

.page-container.admin-loans-page.light-theme .payer-badge.high {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #b91c1c !important;
}

.page-container.admin-loans-page.light-theme .payer-badge.unknown {
  background: #dbeafe !important;
  border-color: #93c5fd !important;
  color: #1d4ed8 !important;
}

.page-container.admin-loans-page.light-theme .credit-score-compact {
  color: #166534 !important;
}

.modal-overlay.light-theme :is(.form-group input, .form-group textarea, .form-group select, .payment-type-btn) {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #cbd5e1 !important;
}

.modal-overlay.light-theme .detail-item label {
  color: #64748b !important;
}

.modal-overlay.light-theme .detail-item p {
  color: #052e16 !important;
}

.modal-overlay.light-theme .loan-summary,
.modal-overlay.light-theme .payment-summary {
  background: #f8fdf9 !important;
  border-color: #bbf7d0;
}

.modal-overlay.light-theme .loan-summary p {
  color: #166534 !important;
}

.modal-overlay.light-theme .loan-details-modal {
  background: #fffef9 !important;
  border-color: #86efac !important;
}

.modal-overlay.light-theme .loan-details-modal .modal-title-text h3,
.modal-overlay.light-theme .payment-history-section h4 {
  color: #000000 !important;
}

.modal-overlay.light-theme .loan-details-modal .modal-subtitle {
  color: #166534 !important;
}

.modal-overlay.light-theme .loan-details-icon,
.modal-overlay.light-theme .section-title-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  border-color: #86efac !important;
  color: #15803d !important;
}

.modal-overlay.light-theme .detail-item {
  background: #ffffff !important;
  border-color: #e2e8f0 !important;
}

.modal-overlay.light-theme .detail-item label {
  color: #166534 !important;
}

.modal-overlay.light-theme .detail-item p {
  color: #000000 !important;
}

.modal-overlay.light-theme .detail-item-penalty {
  background: #fef9c3 !important;
  border-color: #fde047 !important;
}

.modal-overlay.light-theme .detail-item-penalty label,
.modal-overlay.light-theme .detail-item-penalty p {
  color: #92400e !important;
}

.modal-overlay.light-theme .loan-details-modal .modal-footer {
  background: #f0fdf4 !important;
  border-top-color: #86efac !important;
}

.modal-overlay.light-theme .loan-details-modal .btn-cancel {
  background: #ffffff !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  border-color: #64748b !important;
}

.modal-overlay.light-theme .loan-details-modal .btn-cancel:hover {
  background: #f1f5f9 !important;
  border-color: #475569 !important;
}

.modal-overlay.light-theme .loan-details-modal .close-btn {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #000000 !important;
}

.modal-overlay.light-theme .modal-content {
  background: #fffef9 !important;
  border-color: #86efac !important;
  color: #052e16 !important;
  box-shadow: 0 24px 48px rgba(22, 101, 52, 0.14), inset 1px 1px 0 rgba(255, 255, 255, 0.65) !important;
}

.modal-overlay.light-theme .modal-header {
  border-bottom-color: #bbf7d0 !important;
  background: #fffef9 !important;
}

.modal-overlay.light-theme .modal-header h3,
.modal-overlay.light-theme .modal-title-text h3 {
  color: #052e16 !important;
}

.modal-overlay.light-theme .modal-subtitle {
  color: #166534 !important;
}

.modal-overlay.light-theme .close-btn {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

.modal-overlay.light-theme .close-btn:hover {
  background: #dcfce7 !important;
  color: #052e16 !important;
}

.modal-overlay.light-theme .form-group label {
  color: #166534 !important;
}

.modal-overlay.light-theme .loan-summary p,
.modal-overlay.light-theme .form-group small {
  color: #166534 !important;
}

.modal-overlay.light-theme .btn-cancel {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #86efac !important;
}

.modal-overlay.light-theme .btn-cancel:hover {
  background: #f0fdf4 !important;
}

.modal-overlay.light-theme .payment-type-btn:hover {
  border-color: #86efac !important;
  background: #f0fdf4 !important;
}

.modal-overlay.light-theme .payment-type-btn.active {
  border-color: #16a34a !important;
  background: #dcfce7 !important;
  color: #14532d !important;
}

.modal-overlay.light-theme {
  background: rgba(15, 23, 42, 0.48) !important;
}

.loan-module-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  align-content: flex-start;
  justify-content: flex-start;
  gap: 8px 12px;
  margin-bottom: 1.25rem;
  padding: 10px 12px;
  border-radius: 12px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  background: rgba(28, 42, 33, 0.92);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  min-height: 0;
  height: auto;
}

.loan-module-panel__text {
  flex: 1 1 auto;
  min-width: 0;
}

.loan-module-panel--off {
  border-color: rgba(252, 211, 77, 0.45);
}

.loan-module-panel__title {
  margin: 0 0 3px;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.25;
  color: #eefde6;
}

.loan-module-panel--off .loan-module-panel__title {
  color: #fde68a;
}

.loan-module-panel__desc {
  margin: 0;
  font-size: 0.68rem;
  line-height: 1.35;
  color: rgba(229, 235, 231, 0.82);
  max-width: 52rem;
}

.loan-module-panel--off .loan-module-panel__desc {
  color: #fde68a;
}

.loan-module-panel__msg {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.68rem;
}

.loan-module-panel__msg.success {
  color: #15803d;
}

.loan-module-panel__msg.error {
  color: #b91c1c;
}

.loan-module-toggle {
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  gap: 8px;
  padding: 6px 10px;
  min-height: 32px;
  border-radius: 999px;
  border: 1.5px solid rgba(190, 235, 203, 0.24);
  background: rgba(0, 0, 0, 0.24);
  cursor: pointer;
  font-weight: 700;
  font-size: 0.68rem;
  line-height: 1.2;
  color: #eefde6;
  transition: all 0.2s ease;
}

.loan-module-toggle__label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.01em;
  white-space: nowrap;
}

.loan-module-toggle:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.loan-module-toggle__track {
  position: relative;
  width: 36px;
  height: 20px;
  border-radius: 999px;
  background: #cbd5e1;
  transition: background 0.2s ease;
  flex-shrink: 0;
}

.loan-module-toggle--on .loan-module-toggle__track {
  background: #16a34a;
}

.loan-module-toggle--off .loan-module-toggle__track {
  background: #f59e0b;
}

.loan-module-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 2px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
  transition: transform 0.2s ease;
}

.loan-module-toggle--on .loan-module-toggle__thumb {
  transform: translateX(16px);
}

.loan-module-toggle--on {
  border-color: #16a34a;
  color: #d1fae5;
}

.loan-module-toggle--off {
  border-color: #f59e0b;
  color: #fde68a;
}

.page-container.admin-loans-page.light-theme .loan-module-panel {
  background: linear-gradient(135deg, rgba(220, 252, 231, 0.95) 0%, rgba(187, 247, 208, 0.75) 100%) !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.page-container.admin-loans-page.light-theme .loan-module-panel--off {
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.65) 100%) !important;
  border-color: #fcd34d !important;
}

.page-container.admin-loans-page.light-theme .loan-module-panel__title {
  color: #14532d;
}

.page-container.admin-loans-page.light-theme .loan-module-panel--off .loan-module-panel__title {
  color: #92400e;
}

.page-container.admin-loans-page.light-theme .loan-module-panel__desc {
  color: #166534;
}

.page-container.admin-loans-page.light-theme .loan-module-panel--off .loan-module-panel__desc {
  color: #78350f;
}

.page-container.admin-loans-page.light-theme .loan-module-toggle {
  background: #ffffff;
  color: #14532d;
  border-color: #86efac;
}

.page-container.admin-loans-page.light-theme .loan-module-toggle--off {
  color: #92400e;
  border-color: #f59e0b;
}

@media (min-width: 769px) {
  html body .page-container.admin-loans-page.glass-module-page {
    padding: 12px 16px !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    min-height: 0 !important;
    overflow-x: hidden !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .page-header,
  html body .page-container.admin-loans-page.glass-module-page .page-header-split {
    margin-bottom: 10px !important;
    padding: 10px 14px !important;
    gap: 8px !important;
    border-radius: 12px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page h1.page-title,
  html body .page-container.admin-loans-page.glass-module-page .page-title {
    font-size: 1.25rem !important;
    line-height: 1.2 !important;
    margin: 0 0 2px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .page-subtitle {
    font-size: 0.75rem !important;
    line-height: 1.35 !important;
    margin: 0 !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loan-module-panel {
    margin-bottom: 10px !important;
    padding: 8px 12px !important;
    gap: 8px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loan-module-panel__title {
    font-size: 0.9rem !important;
    margin-bottom: 2px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loan-module-panel__desc {
    font-size: 12px !important;
    line-height: 1.35 !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .stats-group {
    margin-bottom: 10px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .stats-group-title {
    font-size: 10px !important;
    margin-bottom: 6px !important;
    letter-spacing: 0.06em !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .stats-grid.loan-stats {
    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin-bottom: 8px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .stats-grid.loan-stats .stat-card,
  html body .page-container.admin-loans-page.glass-module-page .stat-card--summary {
    padding: 7px 8px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
    border-left-width: 4px !important;
    min-height: 0 !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .stats-grid.loan-stats .stat-label,
  html body .page-container.admin-loans-page.glass-module-page .stat-card--summary .stat-label {
    font-size: 9px !important;
    margin-bottom: 2px !important;
    line-height: 1.15 !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .stats-grid.loan-stats .stat-value,
  html body .page-container.admin-loans-page.glass-module-page .stat-card--summary .stat-value {
    font-size: 1.05rem !important;
    line-height: 1.1 !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .barangay-filter-bar {
    margin-bottom: 8px !important;
    padding: 8px 10px !important;
    gap: 8px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .barangay-filter-label {
    font-size: 11px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .barangay-filter-select {
    min-height: 32px !important;
    height: 32px !important;
    padding: 4px 10px !important;
    font-size: 13px !important;
    min-width: 180px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .barangay-filter-hint {
    font-size: 11px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .filter-tabs {
    display: grid !important;
    grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
    gap: 6px !important;
    margin-bottom: 10px !important;
    border-bottom: 0 !important;
    padding-bottom: 0 !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .filter-tabs .tab {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 32px !important;
    padding: 6px 8px !important;
    font-size: 11px !important;
    font-weight: 600 !important;
    line-height: 1.2 !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    white-space: normal !important;
    text-align: center !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .filter-tabs .tab.active::after {
    display: none !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-data-card {
    border-radius: 12px !important;
    border-width: 1px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .table-container {
    border-width: 1px !important;
    border-radius: 10px !important;
    overflow: hidden !important;
    max-width: 100% !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .fin-desktop-table {
    display: block !important;
    max-height: min(36rem, 62vh) !important;
    overflow: auto !important;
    -webkit-overflow-scrolling: touch !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table {
    width: max-content !important;
    min-width: 100% !important;
    table-layout: auto !important;
    font-size: 11px !important;
    font-family: inherit !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table th {
    padding: 5px 7px !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    font-family: inherit !important;
    line-height: 1.25 !important;
    text-transform: none !important;
    letter-spacing: 0.01em !important;
    white-space: normal !important;
    word-break: break-word !important;
    vertical-align: middle !important;
    border-right: none !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table td {
    padding: 5px 7px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    font-family: inherit !important;
    line-height: 1.3 !important;
    white-space: normal !important;
    word-break: break-word !important;
    overflow: visible !important;
    text-overflow: clip !important;
    vertical-align: middle !important;
    border-right: none !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table .td-name {
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
    font-size: 11px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table .td-purpose,
  html body .page-container.admin-loans-page.glass-module-page .loans-table .td-date,
  html body .page-container.admin-loans-page.glass-module-page .loans-table .td-term {
    white-space: nowrap !important;
    word-break: normal !important;
    font-size: 11px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table .amount {
    font-size: 11px !important;
    white-space: nowrap !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table :is(.status-badge, .payer-badge) {
    font-size: 10px !important;
    padding: 2px 6px !important;
    font-weight: 600 !important;
    font-family: inherit !important;
    line-height: 1.2 !important;
    white-space: normal !important;
    text-transform: none !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table .credit-score-compact {
    font-size: 10px !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .loans-table .td-actions {
    min-width: 148px !important;
    white-space: normal !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .action-buttons {
    display: inline-flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: 100% !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .action-buttons .btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    padding: 3px 7px !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    font-family: inherit !important;
    line-height: 1.2 !important;
    min-height: 26px !important;
    border-width: 1px !important;
    border-radius: 6px !important;
    white-space: nowrap !important;
  }

  body.glass-dark .page-container.admin-loans-page.glass-module-page :is(.btn, .filter-tabs .tab),
  body.glass-light .page-container.admin-loans-page.glass-module-page :is(.btn, .filter-tabs .tab) {
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  body.glass-dark .page-container.admin-loans-page.glass-module-page .filter-tabs .tab,
  body.glass-light .page-container.admin-loans-page.glass-module-page .filter-tabs .tab {
    border-width: 1px !important;
  }
}

@media (min-width: 769px) and (max-width: 1100px) {
  html body .page-container.admin-loans-page.glass-module-page .stats-grid.loan-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  html body .page-container.admin-loans-page.glass-module-page .filter-tabs {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}

/* ===== Mobile polish (must stay last) ===== */
@media (max-width: 768px) {
  .page-container.admin-loans-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    max-width: none;
    padding: 0.75rem !important;
    border-radius: 0;
    overflow-x: hidden;
  }

  .page-container.admin-loans-page .page-header,
  .page-container.admin-loans-page .page-header-split {
    padding: 0.75rem 0.85rem !important;
    margin-bottom: 0.75rem !important;
  }

  .page-container.admin-loans-page .page-title {
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
  }

  .page-container.admin-loans-page .page-subtitle {
    font-size: 0.75rem !important;
    line-height: 1.3;
  }

  .page-container.admin-loans-page .stats-grid.loan-stats {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.5rem !important;
    margin-bottom: 0.5rem !important;
  }

  .page-container.admin-loans-page .stats-grid.loan-stats .stat-card,
  .page-container.admin-loans-page .stat-card--summary {
    padding: 0.7rem 0.75rem 0.65rem !important;
    border-radius: 12px !important;
    gap: 0 !important;
  }

  .page-container.admin-loans-page .stat-card--summary {
    margin-top: 0.35rem !important;
  }

  .page-container.admin-loans-page .stats-grid {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.5rem !important;
    margin-bottom: 0.75rem !important;
  }

  .page-container.admin-loans-page .stat-card.total,
  .page-container.admin-loans-page .stat-card--summary {
    grid-column: 1 / -1;
  }

  .page-container.admin-loans-page .stat-card {
    padding: 0.7rem 0.75rem 0.65rem !important;
    border-radius: 12px !important;
    gap: 0.45rem !important;
  }

  .page-container.admin-loans-page .stat-card.total {
    grid-column: 1 / -1;
  }

  .page-container.admin-loans-page .stats-grid.loan-stats .stat-value,
  .page-container.admin-loans-page .stat-card--summary .stat-value,
  .page-container.admin-loans-page .stat-value {
    font-size: 1.15rem !important;
  }

  .page-container.admin-loans-page .stats-grid.loan-stats .stat-label,
  .page-container.admin-loans-page .stat-card--summary .stat-label,
  .page-container.admin-loans-page .stat-label {
    font-size: 0.62rem !important;
  }

  .page-container.admin-loans-page .filter-tabs {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 0.4rem !important;
    overflow: visible !important;
    margin-bottom: 0.75rem !important;
  }

  .page-container.admin-loans-page .filter-tabs .tab {
    width: 100% !important;
    min-width: 0 !important;
    padding: 0.4rem 0.45rem !important;
    font-size: 0.72rem !important;
    min-height: 36px !important;
    white-space: normal !important;
    border-radius: 9px !important;
  }

  .page-container.admin-loans-page .fin-desktop-table {
    display: none !important;
  }

  .page-container.admin-loans-page .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
  }

  .page-container.admin-loans-page .loans-data-card {
    padding: 0 !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  .page-container.admin-loans-page .table-container {
    overflow: visible !important;
    border: none !important;
    background: transparent !important;
    box-shadow: none !important;
  }

  .page-container.admin-loans-page .loan-action-text {
    display: inline-flex !important;
  }

  /* Teleported loan-details modal — no nested payment-history scroll on mobile */
  .loan-details-modal.tx-detail-modal .payment-history-table-wrap,
  .loan-details-modal.tx-detail-modal .tx-table-wrap {
    overflow: visible !important;
    -webkit-overflow-scrolling: auto !important;
  }

  .loan-details-modal.tx-detail-modal .payment-history-table {
    min-width: 0 !important;
    width: 100% !important;
    table-layout: fixed !important;
  }

  .loan-details-modal.tx-detail-modal .payment-history-table th,
  .loan-details-modal.tx-detail-modal .payment-history-table td {
    white-space: normal !important;
    word-break: break-word !important;
    overflow-wrap: anywhere !important;
  }

  .page-container.admin-loans-page .loan-module-panel {
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    align-content: flex-start !important;
    gap: 0.4rem !important;
    padding: 0.6rem 0.7rem !important;
    margin-bottom: 0.75rem !important;
    min-height: 0 !important;
    height: auto !important;
  }

  .page-container.admin-loans-page .loan-module-panel__text {
    flex: 0 0 auto !important;
    width: 100% !important;
  }

  .page-container.admin-loans-page .loan-module-panel__title {
    font-size: 0.75rem !important;
  }

  .page-container.admin-loans-page .loan-module-panel__desc {
    font-size: 0.62rem !important;
  }

  .page-container.admin-loans-page .loan-module-toggle {
    width: auto !important;
    max-width: 100% !important;
    align-self: flex-start !important;
    justify-content: flex-start !important;
  }

  .page-container.admin-loans-page .loan-module-toggle,
  .page-container.admin-loans-page .loan-module-toggle__label {
    font-size: 0.65rem !important;
  }
}

@media (max-width: 480px) {
  .page-container.admin-loans-page {
    padding: 0.65rem !important;
  }

  .page-container.admin-loans-page .page-title {
    font-size: 1.1rem !important;
  }
}
</style>

<style>
/* Teleported loan modals — above header, centered, theme-aware chrome */
.admin-loans-modal.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 11050 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  background: rgba(6, 12, 9, 0.62) !important;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.admin-loans-modal.modal-overlay.light-theme {
  background: rgba(15, 23, 42, 0.48) !important;
}

.admin-loans-modal.modal-overlay .modal-content.pay-checkout-shell,
.admin-loans-modal.modal-overlay.app-modal-overlay .modal-content.pay-checkout-shell {
  width: min(26.5rem, calc(100vw - 2.25rem)) !important;
  max-width: min(26.5rem, calc(100vw - 2.25rem)) !important;
  max-height: min(92dvh, calc(100dvh - 2rem)) !important;
  margin: auto !important;
  padding: 1.35rem 1.5rem 1.25rem !important;
  overflow: auto !important;
  background: #102018;
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 18px;
  color: #ecfdf5;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  box-sizing: border-box !important;
}

.admin-loans-modal.modal-overlay.light-theme .modal-content.pay-checkout-shell {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}

.pay-checkout-hint {
  margin: 0;
  padding: 0.38rem 0.6rem;
  border-radius: 8px;
  background: rgba(250, 204, 21, 0.12);
  border: 1px solid rgba(250, 204, 21, 0.28);
  color: #fde68a;
  font-size: 0.7rem;
  line-height: 1.3;
}

.admin-loans-modal.modal-overlay.light-theme .pay-checkout-hint {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

@media (max-width: 768px) {
  .admin-loans-modal.modal-overlay {
    padding:
      max(0.65rem, env(safe-area-inset-top, 0px))
      0.75rem
      0.75rem !important;
  }

  .admin-loans-modal.modal-overlay .modal-content,
  .admin-loans-modal.modal-overlay .modal-content.modal-large,
  .admin-loans-modal.modal-overlay .modal-content.tx-detail-modal {
    width: min(calc(100vw - 1.5rem), 100%) !important;
    max-width: calc(100vw - 1.5rem) !important;
    max-height: min(92dvh, calc(100dvh - 1.5rem)) !important;
    margin: auto !important;
  }

  .admin-loans-modal.modal-overlay .modal-content.pay-checkout-shell {
    width: min(calc(100vw - 2rem), 100%) !important;
    max-width: calc(100vw - 2rem) !important;
    padding: 1.2rem 1.35rem 1.15rem !important;
  }
}
</style>
