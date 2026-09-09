<template>
  <div class="page-container officer-loans-page glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.loans') }}</h1>
        <p class="page-subtitle">{{ $t('ui.loanSubtitle') }}</p>
      </div>
    </div>

    <div v-if="!loanModuleActive" class="loan-module-off-banner" role="status">
      {{ $t('ui.loaningTemporarilyOff') }}
    </div>

    <div class="stats-group">
      <div class="stats-group-title">{{ $t('ui.loanOverview') }}</div>
      <div class="stats-grid loan-stats">
        <div class="stat-card glass-stat-card pending">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.pending') }}</div>
            <div class="stat-value">{{ pendingLoans.length }}</div>
          </div>
        </div>
        <div class="stat-card glass-stat-card approved">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.approved') }}</div>
            <div class="stat-value">{{ approvedLoans.length }}</div>
          </div>
        </div>
        <div class="stat-card glass-stat-card active">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.active') }}</div>
            <div class="stat-value">{{ activeLoans.length }}</div>
          </div>
        </div>
        <div class="stat-card glass-stat-card rejected">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.rejected') }}</div>
            <div class="stat-value">{{ rejectedLoans.length }}</div>
          </div>
        </div>
        <div class="stat-card glass-stat-card completed">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.completed') }}</div>
            <div class="stat-value">{{ completedLoans.length }}</div>
          </div>
        </div>
        <div class="stat-card glass-stat-card overdue">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.overdue') }}</div>
            <div class="stat-value">{{ overdueLoans.length }}</div>
          </div>
        </div>
      </div>
    </div>

    <div class="tabs loan-filter-tabs" role="tablist">
      <button
        type="button"
        :class="['tab', { active: activeTab === 'pending' }]"
        @click="activeTab = 'pending'"
      >
        {{ $t('common.pending') }} ({{ pendingLoans.length }})
      </button>
      <button
        type="button"
        :class="['tab', { active: activeTab === 'approved' }]"
        @click="activeTab = 'approved'"
      >
        {{ $t('common.approved') }} ({{ approvedLoans.length }})
      </button>
      <button
        type="button"
        :class="['tab', { active: activeTab === 'active' }]"
        @click="activeTab = 'active'"
      >
        {{ $t('common.active') }} ({{ activeLoans.length }})
      </button>
      <button
        type="button"
        :class="['tab', { active: activeTab === 'rejected' }]"
        @click="activeTab = 'rejected'"
      >
        {{ $t('common.rejected') }} ({{ rejectedLoans.length }})
      </button>
      <button
        type="button"
        :class="['tab', { active: activeTab === 'completed' }]"
        @click="activeTab = 'completed'"
      >
        {{ $t('common.completed') }} ({{ completedLoans.length }})
      </button>
      <button
        type="button"
        :class="['tab', { active: activeTab === 'overdue' }]"
        @click="activeTab = 'overdue'"
      >
        {{ $t('common.overdue') }} ({{ overdueLoans.length }})
      </button>
    </div>

    <div class="content-grid">
      <!-- Loan Application Form -->
      <div class="card application-card">
        <h2 class="card-title">{{ $t('ui.applyNewLoan') }}</h2>
        
        <!-- Eligibility Message -->
        <div v-if="eligibilityMessage" class="alert" :class="canApplyLoan ? 'alert-info' : 'alert-warning'">
          {{ eligibilityMessage }}
        </div>
        
        <form @submit.prevent="submitLoanApplication" class="loan-form" v-if="canApplyLoan">
          <div class="form-group">
            <label>{{ $t('ui.loanType') }}</label>
            <div class="input-shell">
              <select v-model="loanForm.type" required @change="updateMaxAmount">
                <option value="">{{ $t('ui.selectLoanType') }}</option>
                <option value="agricultural">{{ $t('ui.agriLoan') }}</option>
                <option value="provident">{{ $t('ui.providentLoan') }}</option>
                <option value="educational">{{ $t('ui.eduLoan') }}</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>{{ $t('ui.loanAmountPeso') }}</label>
            <div class="input-shell">
              <input
                type="number"
                v-model="loanForm.amount"
                :placeholder="$t('ui.enterAmount')"
                required
                min="500"
                :max="maxLoanAmount"
                step="100"
                @wheel.prevent
              />
            </div>
            <small v-if="loanForm.type" class="help-text">
              {{ $t('ui.maxInterestTermHint', { amount: maxLoanAmount.toLocaleString() }) }}
            </small>
            <small v-if="loanForm.amount" class="calculation-text">
              {{ $t('ui.principalInterestTotal', {
                principal: parseFloat(loanForm.amount).toLocaleString(),
                interest: (parseFloat(loanForm.amount) * 0.01).toLocaleString(),
                total: (parseFloat(loanForm.amount) * 1.01).toLocaleString()
              }) }}
            </small>
          </div>
          <div class="form-group">
            <label>{{ $t('ui.purposeOptional') }}</label>
            <div class="input-shell">
              <input
                type="text"
                v-model="loanForm.purpose"
                :placeholder="$t('ui.enterLoanPurpose')"
                maxlength="200"
              />
            </div>
          </div>
          <div class="loan-info-box">
            <h4>{{ $t('ui.loanTermsConditions') }}</h4>
            <ul>
              <li>{{ $t('ui.fixedInterestRate') }} <strong>1%</strong></li>
              <li>{{ $t('ui.paymentPeriodColon') }} <strong>{{ $t('ui.sixMonths') }}</strong></li>
              <li>{{ $t('ui.mustSettleBalance') }}</li>
              <li>{{ $t('ui.mayApplyAfterPaid') }}</li>
            </ul>
          </div>
          <button type="submit" class="submit-btn" :disabled="loading || !canApplyLoan">
            {{ loading ? $t('common.submitting') : $t('common.submitApplication') }}
          </button>
        </form>
      </div>

      <!-- My Loans Section -->
      <div class="card loans-card">
        <h2 class="card-title">{{ $t('ui.myLoanApplications') }}</h2>

        <div class="tab-content">
          <!-- Pending Loans -->
          <div v-if="activeTab === 'pending'">
            <div v-if="pendingLoans.length === 0" class="empty-state">
              <p>{{ $t('ui.noPendingLoans') }}</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in pendingLoans" :key="loan.id" class="loan-item pending" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">{{ $t('ui.pendingApprovalStatus') }}</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="loan-details">
                    <p><strong>{{ $t('ui.typeColon') }}</strong> {{ formatLoanType(loan.loan_type) }}</p>
                    <p><strong>{{ $t('ui.purposeColon') }}</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>{{ $t('ui.paymentTermColon') }}</strong> {{ loan.payment_term }} months</p>
                    <p><strong>{{ $t('ui.appliedColon') }}</strong> {{ formatDate(loan.application_date) }}</p>
                  </div>
                </div>
                <div class="loan-actions">
                  <button class="edit-btn primary-action" @click="editLoan(loan)">{{ $t('common.edit') }}</button>
                  <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">{{ $t('common.viewDetails') }}</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Approved Loans -->
          <div v-if="activeTab === 'approved'">
            <div v-if="approvedLoans.length === 0" class="empty-state">
              <p>{{ $t('ui.noApprovedLoans') }}</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in approvedLoans" :key="loan.id" class="loan-item approved" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">{{ $t('common.approved') }}</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="loan-details">
                    <p><strong>{{ $t('ui.purposeColon') }}</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>{{ $t('ui.paymentTermColon') }}</strong> {{ loan.payment_term }} months</p>
                    <p><strong>{{ $t('ui.approvedColon') }}</strong> {{ formatDate(loan.approval_date) }}</p>
                    <p><strong>{{ $t('ui.dueDateColon') }}</strong> {{ formatDate(loan.due_date) }}</p>
                    <p v-if="loan.remarks"><strong>{{ $t('ui.remarksColon') }}</strong> {{ loan.remarks }}</p>
                  </div>
                </div>
                <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">{{ $t('common.viewDetails') }}</button>
              </div>
            </div>
          </div>

          <!-- Active Loans -->
          <div v-if="activeTab === 'active'">
            <div v-if="activeLoans.length === 0" class="empty-state">
              <p>{{ $t('ui.noActiveLoans') }}</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in activeLoans" :key="loan.id" class="loan-item active" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">{{ $t('common.active') }}</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="loan-progress">
                    <div class="progress-bar">
                      <div 
                        class="progress-fill" 
                        :style="{ width: ((loan.total_paid / loan.loan_amount) * 100) + '%' }"
                      ></div>
                    </div>
                    <div class="progress-text">
                      {{ ((loan.total_paid / loan.loan_amount) * 100).toFixed(0) }}% Paid
                    </div>
                  </div>
                  <div class="loan-details">
                    <p><strong>{{ $t('ui.purposeColon') }}</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>{{ $t('ui.remainingBalanceColon') }}</strong> ₱{{ loan.remaining_balance.toLocaleString() }}</p>
                    <p><strong>{{ $t('ui.totalPaidColon') }}</strong> ₱{{ loan.total_paid.toLocaleString() }}</p>
                    <p><strong>{{ $t('ui.dueDateColon') }}</strong> {{ formatDate(loan.due_date) }}</p>
                  </div>
                </div>
                <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">{{ $t('common.viewDetails') }}</button>
              </div>
            </div>
          </div>

          <!-- Rejected Loans -->
          <div v-if="activeTab === 'rejected'">
            <div v-if="rejectedLoans.length === 0" class="empty-state">
              <p>{{ $t('ui.noRejectedLoans') }}</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in rejectedLoans" :key="loan.id" class="loan-item rejected" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">{{ $t('common.rejected') }}</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="loan-details">
                    <p><strong>{{ $t('ui.loanTypeColon') }}</strong> {{ formatLoanType(loan.loan_type) }}</p>
                    <p><strong>{{ $t('ui.submittedColon') }}</strong> {{ formatDate(loan.application_date) }}</p>
                    <p><strong>{{ $t('ui.rejectedColon') }}</strong> {{ formatDate(loan.rejection_date || loan.updated_at) }}</p>
                    <p class="rejection-reason"><strong>{{ $t('ui.reasonColon') }}</strong> {{ loan.rejection_reason || 'Not specified' }}</p>
                  </div>
                </div>
                <button class="view-btn" @click="viewLoanDetails(loan)">{{ $t('common.viewDetails') }}</button>
              </div>
            </div>
          </div>

          <!-- Overdue Loans -->
          <div v-if="activeTab === 'overdue'">
            <div v-if="overdueLoans.length === 0" class="empty-state">
              <p>{{ $t('ui.noOverdueLoans') }}</p>
            </div>
            <div v-else class="loans-list">
              <div
                v-for="loan in overdueLoans"
                :key="loan.id"
                class="loan-card warning"
                :class="{ highlight: highlightedLoanId === loan.id }"
                :data-loan-id="loan.id"
                @click="viewLoanDetails(loan)"
              >
                <div class="loan-header">
                  <div class="loan-badge">OVERDUE</div>
                  <div class="loan-type">{{ loan.loan_type }}</div>
                  <div class="loan-amount">₱{{ loan.loan_amount?.toLocaleString() }}</div>
                </div>
                <div class="loan-details">
                  <div class="detail-row">
                    <span class="label">{{ $t('ui.dueDateColon') }}</span>
                    <span class="value">{{ loan.due_date }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Days Overdue:</span>
                    <span v-if="loan.days_overdue" class="value warning-text">{{ loan.days_overdue }} days</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">{{ $t('ui.remainingBalanceColon') }}</span>
                    <span class="value">₱{{ loan.remaining_balance?.toLocaleString() }}</span>
                  </div>
                  <div v-if="loan.penalty_amount > 0" class="detail-row penalty-row">
                    <span class="label">Penalty (1%):</span>
                    <span class="value penalty-amount">₱{{ parseFloat(loan.penalty_amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</span>
                  </div>
                  <div v-if="loan.penalty_amount > 0" class="detail-row total-row">
                    <span class="label"><strong>{{ $t('ui.totalDuePenaltyColon') }}</strong></span>
                    <span class="value total-amount"><strong>₱{{ parseFloat(loan.total_with_penalty).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</strong></span>
                  </div>
                </div>
                <button class="view-btn warning-btn" @click.stop="viewLoanDetails(loan)">{{ $t('common.viewPay') }}</button>
              </div>
            </div>
          </div>

          <!-- Completed Loans -->
          <div v-if="activeTab === 'completed'">
            <div v-if="completedLoans.length === 0" class="empty-state">
              <p>{{ $t('ui.noLoanApps') }}</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in completedLoans" :key="loan.id" class="loan-item completed" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">{{ $t('ui.paid') }}</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="loan-details">
                    <p><strong>{{ $t('ui.purposeColon') }}</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>{{ $t('ui.totalPaidColon') }}</strong> ₱{{ loan.total_paid.toLocaleString() }}</p>
                    <p><strong>{{ $t('ui.completedColon') }}</strong> {{ formatDate(loan.updated_at) }}</p>
                  </div>
                </div>
                <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">{{ $t('common.viewDetails') }}</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
    <!-- Loan Details Modal -->
    <Transition name="app-modal">
    <div v-if="showDetailsModal" class="modal-overlay app-modal-overlay" @click="closeModal">
      <div class="modal-content tx-detail-modal" @click.stop>
        <div class="modal-header">
          <h3>Loan Details</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Rejected Loan Details -->
          <div v-if="selectedLoan.status === 'rejected'" class="loan-details-body tx-detail-sections">
            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">{{ $t('ui.rejectionInfo') }}</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.status') }}</label>
                  <p>
                    <span class="status-badge rejected">{{ $t('common.rejected') }}</span>
                  </p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Loan Type</label>
                  <p>{{ formatLoanType(selectedLoan.loan_type) }}</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Loan Amount</label>
                  <p class="amount">₱{{ selectedLoan.loan_amount?.toLocaleString() }}</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Submitted Date</label>
                  <p>{{ formatDate(selectedLoan.application_date) }}</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Rejected Date</label>
                  <p>{{ formatDate(selectedLoan.rejection_date || selectedLoan.updated_at) }}</p>
                </div>
                <div class="detail-item tx-detail-item tx-detail-item--full full-width tx-detail-item--rejection">
                  <label>Rejection Reason</label>
                  <p class="rejection-reason">{{ selectedLoan.rejection_reason || 'Not specified' }}</p>
                </div>
              </div>
            </div>
          </div>

          <!-- Other Loan Details (Pending, Approved, Active, Paid) -->
          <div v-else class="loan-details-body tx-detail-sections">
            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">{{ $t('ui.loanTerms') }}</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item">
                  <label>{{ $t('ui.status') }}</label>
                  <p>
                    <span :class="['status-badge', selectedLoan.status]">
                      {{ selectedLoan.status }}
                    </span>
                  </p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Loan Amount</label>
                  <p class="amount">₱{{ selectedLoan.loan_amount?.toLocaleString() }}</p>
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
                  <label>Interest Rate</label>
                  <p>{{ selectedLoan.interest_rate || 0 }}%</p>
                </div>
                <div class="detail-item tx-detail-item">
                  <label>Application Date</label>
                  <p>{{ formatDate(selectedLoan.application_date) }}</p>
                </div>
              </div>
            </div>

            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">Payment Status</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item" v-if="selectedLoan.approval_date">
                  <label>{{ $t('ui.approvalDate') }}</label>
                  <p>{{ formatDate(selectedLoan.approval_date) }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.due_date">
                  <label>Due Date</label>
                  <p>{{ formatDate(selectedLoan.due_date) }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.remaining_balance">
                  <label>Remaining Balance</label>
                  <p class="amount">₱{{ selectedLoan.remaining_balance?.toLocaleString() }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="selectedLoan.total_paid">
                  <label>Total Paid</label>
                  <p class="amount">₱{{ selectedLoan.total_paid?.toLocaleString() }}</p>
                </div>
                <div
                  class="detail-item detail-item-penalty tx-detail-item tx-detail-item--penalty tx-detail-item--full full-width"
                  v-if="selectedLoan.status === 'overdue' && selectedLoan.penalty_amount > 0"
                >
                  <label>Overdue penalty</label>
                  <p>
                    <strong>Penalty Amount:</strong> ₱{{ parseFloat(selectedLoan.penalty_amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
                  </p>
                  <p>
                    <strong>Days Overdue:</strong> {{ selectedLoan.days_overdue }} days
                  </p>
                  <p>
                    <strong>Total with Penalty:</strong> ₱{{ parseFloat(selectedLoan.total_with_penalty || selectedLoan.remaining_balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
                  </p>
                </div>
                <div class="detail-item tx-detail-item tx-detail-item--full full-width" v-if="selectedLoan.remarks">
                  <label>{{ $t('ui.remarks') }}</label>
                  <p>{{ selectedLoan.remarks }}</p>
                </div>
                <div class="detail-item tx-detail-item" v-if="loanReceiptNumbers">
                  <label>Receipt Number</label>
                  <p>{{ loanReceiptNumbers }}</p>
                </div>
              </div>
            </div>
            <GcashQrPayPanel
              v-if="showLoanGcashPanel"
              :key="'gcash-loan-' + selectedLoan.id + '-' + (route.query.nav || '0')"
              transaction-type="loan"
              :reference-id="selectedLoan.id"
              :enabled="canPayLoanGcash"
              @preview-proof="openLoanProofPreview"
              @submitted="onGcashProofSubmitted"
              @error="onGcashPayError"
            />
          </div>

          <!-- Payment History Section -->
          <div v-if="loanPayments.length > 0" class="payment-history-section tx-history-section" data-payment-history>
            <h4 class="tx-detail-section-title">Payment History</h4>
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

    <!-- Edit Loan Modal -->
    <Transition name="app-modal">
    <div v-if="showEditModal" class="modal-overlay app-modal-overlay" @click="closeEditModal">
      <div class="modal-content app-modal-dialog" @click.stop>
        <div class="modal-header">
          <h3>{{ $t('ui.editLoanApp') }}</h3>
          <button @click="closeEditModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="updateLoan" class="edit-loan-form">
            <div class="form-group">
              <label>{{ $t('ui.loanType') }}</label>
              <select v-model="editForm.type" required @change="updateEditMaxAmount">
                <option value="">{{ $t('ui.selectLoanType') }}</option>
                <option value="agricultural">{{ $t('ui.agriLoan') }}</option>
                <option value="provident">{{ $t('ui.providentLoan') }}</option>
                <option value="educational">{{ $t('ui.eduLoan') }}</option>
              </select>
            </div>
            <div class="form-group">
              <label>{{ $t('ui.loanAmountPeso') }}</label>
              <input
                type="number"
                v-model="editForm.amount"
                :placeholder="$t('ui.enterAmount')"
                required
                min="500"
                :max="editMaxAmount"
                step="100"
                @wheel.prevent
              />
              <small v-if="editForm.type" class="help-text">
                {{ $t('ui.maxInterestTermHint', { amount: editMaxAmount.toLocaleString() }) }}
              </small>
              <small v-if="editForm.amount" class="calculation-text">
                {{ $t('ui.principalInterestTotal', {
                  principal: parseFloat(editForm.amount).toLocaleString(),
                  interest: (parseFloat(editForm.amount) * 0.01).toLocaleString(),
                  total: (parseFloat(editForm.amount) * 1.01).toLocaleString()
                }) }}
              </small>
            </div>
            <div class="form-group">
              <label>{{ $t('ui.purposeOptional') }}</label>
              <input
                type="text"
                v-model="editForm.purpose"
                :placeholder="$t('ui.enterLoanPurpose')"
                maxlength="200"
              />
            </div>
            <div class="modal-actions">
              <button type="submit" class="submit-btn" :disabled="loading">
                {{ loading ? $t('incomeForm.updating') : $t('ui.updateLoan') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
    </Transition>
    <ProofPreviewModal
      :show="showLoanProofPreview"
      :src="loanProofSrc"
      :title="$t('ui.gcashUploadProof')"
      @close="showLoanProofPreview = false"
    />
    <Transition name="app-modal">
    <div
      v-if="showReceiptModal && lastReceipt"
      class="modal-overlay app-modal-overlay receipt-modal-overlay"
      :class="{ 'light-theme': isLight }"
      @click.self="closeReceiptModal"
    >
      <div class="modal-content receipt-modal-content" @click.stop>
        <PaymentReceiptPrint
          :receipt="lastReceipt"
          :auto-print="receiptAutoPrint"
          @close="closeReceiptModal"
        />
      </div>
    </div>
    </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute, useRouter } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useLoanModuleStore } from '../stores/loanModuleStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import GcashQrPayPanel from '../components/GcashQrPayPanel.vue'
import ProofPreviewModal from '../components/ProofPreviewModal.vue'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import { usePaymentReceipt } from '../composables/usePaymentReceipt'
import { getManilaReferenceDateString } from '../utils/philippineTime'
import { apiUrl } from '../utils/apiBase'
import { historyRowKey, pickFocusedHistoryRow, clearNotificationDeepLink, consumeNotificationDeepLink, scrollFocusedHistoryRowWhenReady } from '../utils/paymentHistoryFocus'

const { t } = useI18n()
const authStore = useAuthStore()
const loanModuleStore = useLoanModuleStore()
const route = useRoute()
const router = useRouter()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const loanModuleActive = computed(() => loanModuleStore.enabled)

const apiAuthHeaders = () => ({
  Authorization: `Bearer ${authStore.token}`,
  'Content-Type': 'application/json'
})

const highlightedLoanId = ref(null)
const highlightedHistoryKey = ref(null)

const LOAN_LIMITS = {
  agricultural: 5000,
  provident: 3000,
  educational: 3000
}

const loanForm = ref({
  type: '',
  amount: '',
  purpose: ''
})

const editForm = ref({
  id: null,
  type: '',
  amount: '',
  purpose: ''
})

const allLoans = ref([])
const loading = ref(false)
const activeTab = ref('pending')
const showDetailsModal = ref(false)
const showLoanProofPreview = ref(false)
const loanProofSrc = ref('')

const canPayLoanGcash = computed(() => {
  const loan = selectedLoan.value
  if (!loan?.id) return false
  if (!['approved', 'active', 'overdue'].includes(loan.status)) return false
  return parseFloat(loan.remaining_balance) > 0.01
})

const showLoanGcashPanel = computed(() => {
  const loan = selectedLoan.value
  if (!loan?.id) return false
  return ['approved', 'active', 'overdue', 'paid'].includes(loan.status)
})

const openLoanProofPreview = (src) => {
  if (!src) return
  loanProofSrc.value = src
  showLoanProofPreview.value = true
}

const onGcashProofSubmitted = async () => {
  const loanId = selectedLoan.value?.id
  if (!loanId) return
  try {
    const response = await fetch(`/api/loans/${loanId}?deviceDate=${getDeviceDate()}`, {
      headers: apiAuthHeaders()
    })
    const data = await response.json()
    if (data.success) {
      selectedLoan.value = data.loan
      loanPayments.value = data.payments || []
    }
  } catch (error) {
    console.error('Error refreshing loan details:', error)
  }
}

const onGcashPayError = () => {}
const showEditModal = ref(false)
const selectedLoan = ref({})
const canApplyLoan = ref(true)
const eligibilityMessage = ref('')

const maxLoanAmount = computed(() => {
  return LOAN_LIMITS[loanForm.value.type] || 5000
})

const editMaxAmount = computed(() => {
  return LOAN_LIMITS[editForm.value.type] || 5000
})

// Update max amount when loan type changes
const updateMaxAmount = () => {
  if (loanForm.value.amount > maxLoanAmount.value) {
    loanForm.value.amount = maxLoanAmount.value
  }
}

const updateEditMaxAmount = () => {
  if (editForm.value.amount > editMaxAmount.value) {
    editForm.value.amount = editMaxAmount.value
  }
}

// Computed properties for different loan categories
const pendingLoans = computed(() => 
  allLoans.value.filter(loan => loan.status === 'pending')
)

const approvedLoans = computed(() => 
  allLoans.value.filter(loan => loan.status === 'approved')
)

const activeLoans = computed(() => 
  allLoans.value.filter(loan => loan.status === 'active')
)

const rejectedLoans = computed(() => 
  allLoans.value.filter(loan => loan.status === 'rejected')
)

const completedLoans = computed(() => 
  allLoans.value.filter(loan => loan.status === 'paid')
)

const overdueLoans = computed(() => 
  allLoans.value.filter(loan => loan.status === 'overdue')
)

onMounted(async () => {
  if (!loanModuleStore.loaded) {
    await loanModuleStore.fetchStatus()
  }
  await loadLoans()
  checkEligibility()
  await applyLoanHighlightFromRoute()
})

const checkEligibility = async () => {
  try {
    if (!loanModuleStore.loaded) {
      await loanModuleStore.fetchStatus()
    }
    if (!loanModuleStore.enabled) {
      canApplyLoan.value = false
      eligibilityMessage.value = t('ui.loaningTemporarilyOff')
      return
    }

    const farmerId = authStore.currentUser?.id
    if (!farmerId) return
    
    const response = await fetch(`/api/loans/eligibility/${farmerId}`, {
      headers: apiAuthHeaders()
    })
    if (response.ok) {
      const data = await response.json()
      canApplyLoan.value = data.allowed
      if (!data.allowed) {
        eligibilityMessage.value = data.reason
      } else {
        eligibilityMessage.value = t('ui.eligibleToApply')
      }
    }
  } catch (error) {
    console.error('Error checking eligibility:', error)
  }
}

// Manila calendar date for loan overdue checks (backend uses Asia/Manila)
const getDeviceDate = () => getManilaReferenceDateString()

const loadLoans = async () => {
  loading.value = true
  try {
    const farmerId = authStore.currentUser?.id
    if (!farmerId) {
      console.error('No farmer ID found')
      return
    }

    const response = await fetch(`/api/loans?farmer_id=${farmerId}&deviceDate=${getDeviceDate()}`, {
      headers: apiAuthHeaders()
    })
    if (response.ok) {
      const data = await response.json()
      allLoans.value = data.loans || []
    } else {
      const err = await response.json().catch(() => ({}))
      console.error('Error loading loans:', err.message || response.status)
      allLoans.value = []
    }
  } catch (error) {
    console.error('Error loading loans:', error)
  } finally {
    loading.value = false
  }
}

const submitLoanApplication = async () => {
  if (!authStore.currentUser || !authStore.currentUser.id) {
    alert('Please log in to apply for a loan')
    return
  }
  
  if (!loanForm.value.type) {
    alert('Please select a loan type')
    return
  }
  
  if (!loanForm.value.amount || parseFloat(loanForm.value.amount) <= 0) {
    alert('Please enter a valid loan amount')
    return
  }
  
  if (parseFloat(loanForm.value.amount) > maxLoanAmount.value) {
    alert(`Loan amount cannot exceed ₱${maxLoanAmount.value.toLocaleString()} for ${loanForm.value.type} loan`)
    return
  }
  
  loading.value = true
  try {
    const loanData = {
      farmer_id: authStore.currentUser.id,
      loan_amount: parseFloat(loanForm.value.amount),
      loan_type: loanForm.value.type,
      loan_purpose: loanForm.value.purpose || `${loanForm.value.type} loan`
    }
    
    console.log('Submitting loan application:', loanData)
    
    const response = await fetch('/api/loans', {
      method: 'POST',
      headers: apiAuthHeaders(),
      body: JSON.stringify(loanData)
    })
    
    const result = await response.json()
    console.log('Loan application response:', result)
    
    if (response.ok) {
      const details = result.details
      alert(`Loan application submitted successfully!\n\nPrincipal: ₱${details.principal.toLocaleString()}\nInterest (1%): ₱${details.interest.toLocaleString()}\nTotal to Pay: ₱${details.total.toLocaleString()}\nPayment Term: ${details.payment_term} months\n\nPlease wait for admin approval.`)
      loanForm.value = {
        type: '',
        amount: '',
        purpose: ''
      }
      activeTab.value = 'pending'
      await loadLoans()
      await checkEligibility()
    } else {
      alert(result.message || 'Failed to submit loan application')
    }
  } catch (error) {
    console.error('Error submitting loan:', error)
    alert('Failed to submit loan application: ' + error.message)
  } finally {
    loading.value = false
  }
}

const loanPayments = ref([])

const { showReceiptModal, lastReceipt, receiptAutoPrint, showAndPrintReceipt, closeReceiptModal } = usePaymentReceipt()

const isOfficialReceipt = (num) => Boolean(num && String(num).startsWith('RCPT-'))
const paymentReceiptNumber = (payment) => {
  const n = payment?.receipt_number || payment?.reference_number || ''
  return isOfficialReceipt(n) ? n : ''
}
const historyReceipt = (payment) => paymentReceiptNumber(payment) || payment?.receipt_number || payment?.reference_number || '-'
const formatHistoryAmount = (payment) => {
  if (payment?.amount == null || payment.amount === '') return '—'
  const n = Number(payment.amount)
  if (!Number.isFinite(n)) return '—'
  return `₱${n.toLocaleString()}`
}
const loanProofUrl = (path) => apiUrl(path)

const viewLoanReceipt = async (receiptNumber) => {
  if (!receiptNumber) return
  try {
    await showAndPrintReceipt(receiptNumber, { autoPrint: false })
  } catch (error) {
    console.error('Failed to load receipt:', error)
    alert(error.message || 'Could not load receipt')
  }
}

const loanReceiptNumbers = computed(() => {
  if (loanPayments.value.length === 0) return ''
  const receipts = loanPayments.value
    .map(p => p.receipt_number || p.reference_number)
    .filter(Boolean)
  return receipts.length > 0 ? receipts.join(', ') : ''
})

const viewLoanDetails = async (loan) => {
  selectedLoan.value = loan
  loanPayments.value = []
  showDetailsModal.value = true

  // Fetch updated loan details including penalties
  try {
    const response = await fetch(`/api/loans/${loan.id}?deviceDate=${getDeviceDate()}`, {
      headers: apiAuthHeaders()
    })
    const data = await response.json()
    if (data.success) {
      // Update selectedLoan with fresh data including penalties
      selectedLoan.value = data.loan
      loanPayments.value = data.payments || []
      console.log('Loan details updated with penalty info:', { penalty_amount: data.loan.penalty_amount, days_overdue: data.loan.days_overdue })
    }
  } catch (error) {
    console.error('Error fetching loan details:', error)
  }
}

const closeModal = () => {
  const wasOpen = showDetailsModal.value
  showDetailsModal.value = false
  selectedLoan.value = {}
  highlightedHistoryKey.value = null
  highlightedLoanId.value = null
  if (wasOpen) clearNotificationDeepLink(router, route)
}

const applyLoanHighlightFromRoute = async () => {
  if (!route.query.highlight || route.query.type !== 'loan') return
  const highlightId = route.query.highlight
  const focus = String(route.query.focus || '')
  const sid = route.query.sid
  const openDetails = route.query.open === '1' || focus.startsWith('gcash')
  highlightedLoanId.value = highlightId
  highlightedHistoryKey.value = null
  let loan = allLoans.value.find((l) => String(l.id) === String(highlightId))
  if (!loan) loan = { id: highlightId }
  activeTab.value = loan.status === 'paid' ? 'completed' : (loan.status || activeTab.value)
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

const anyLoanModalOpen = computed(() => showDetailsModal.value || showEditModal.value || showLoanProofPreview.value)

// Auto-refresh loan details every 5 seconds when modal is open to show updated penalties
let autoRefreshInterval = null

watch(anyLoanModalOpen, (open) => {
  document.body.classList.toggle('app-modal-open', open)
}, { immediate: true })

onUnmounted(() => {
  document.body.classList.remove('app-modal-open')
  if (autoRefreshInterval) {
    clearInterval(autoRefreshInterval)
    autoRefreshInterval = null
  }
})

watch(showDetailsModal, (isOpen) => {
  if (isOpen && selectedLoan.value.id) {
    // Start auto-refresh
    autoRefreshInterval = setInterval(async () => {
      try {
        const response = await fetch(`/api/loans/${selectedLoan.value.id}?deviceDate=${getDeviceDate()}`, {
          headers: apiAuthHeaders()
        })
        const data = await response.json()
        if (data.success) {
          selectedLoan.value = data.loan
          loanPayments.value = data.payments || []
        }
      } catch (error) {
        console.error('Auto-refresh error:', error)
      }
    }, 5000) // Refresh every 5 seconds
  } else {
    // Stop auto-refresh
    if (autoRefreshInterval) {
      clearInterval(autoRefreshInterval)
      autoRefreshInterval = null
    }
  }
})

const editLoan = (loan) => {
  // Calculate the principal amount (remove the 1% interest)
  const totalAmount = parseFloat(loan.loan_amount)
  const principal = totalAmount / 1.01
  
  editForm.value = {
    id: loan.id,
    type: loan.loan_type,
    amount: Math.round(principal),
    purpose: loan.loan_purpose
  }
  showEditModal.value = true
}

const closeEditModal = () => {
  showEditModal.value = false
  editForm.value = {
    id: null,
    type: '',
    amount: '',
    purpose: ''
  }
}

const updateLoan = async () => {
  if (!editForm.value.type) {
    alert('Please select a loan type')
    return
  }
  
  if (!editForm.value.amount || parseFloat(editForm.value.amount) <= 0) {
    alert('Please enter a valid loan amount')
    return
  }
  
  if (parseFloat(editForm.value.amount) > editMaxAmount.value) {
    alert(`Loan amount cannot exceed ₱${editMaxAmount.value.toLocaleString()} for ${editForm.value.type} loan`)
    return
  }
  
  loading.value = true
  try {
    const loanData = {
      loan_amount: parseFloat(editForm.value.amount),
      loan_type: editForm.value.type,
      loan_purpose: editForm.value.purpose || `${editForm.value.type} loan`
    }
    
    const response = await fetch(`/api/loans/${editForm.value.id}`, {
      method: 'PUT',
      headers: apiAuthHeaders(),
      body: JSON.stringify(loanData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      const details = result.details
      alert(`Loan updated successfully!\n\nPrincipal: ₱${details.principal.toLocaleString()}\nInterest (1%): ₱${details.interest.toLocaleString()}\nTotal to Pay: ₱${details.total.toLocaleString()}\nPayment Term: ${details.payment_term} months`)
      closeEditModal()
      await loadLoans()
    } else {
      alert(result.message || 'Failed to update loan application')
    }
  } catch (error) {
    console.error('Error updating loan:', error)
    alert('Failed to update loan application: ' + error.message)
  } finally {
    loading.value = false
  }
}

const formatLoanType = (type) => {
  if (!type) return 'N/A'
  return type.charAt(0).toUpperCase() + type.slice(1) + ' Loan'
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })
}

const formatPurpose = (purpose) => {
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
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&display=swap');

.loan-module-off-banner {
  margin: 0 0 20px;
  padding: 14px 18px;
  border-radius: 12px;
  border: 2px solid #f59e0b;
  background: linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%);
  color: #92400e;
  font-weight: 700;
  font-size: 1rem;
  text-align: center;
}

/* Notification highlight animation */
.notification-highlight {
  animation: highlightPulse 2s ease-in-out 3;
  border: 2px solid #ef4444 !important;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3) !important;
  position: relative;
}

.notification-highlight-row {
  animation: highlightPulse 2s ease-in-out 3;
  background: rgba(127, 29, 29, 0.22) !important;
  outline: 2px solid #ef4444;
  outline-offset: -2px;
}

.notification-highlight::before {
  content: 'Payment Due';
  position: absolute;
  top: -12px;
  right: 12px;
  background: #ef4444;
  color: white;
  font-size: 11px;
  font-weight: 700;
  padding: 2px 10px;
  border-radius: 10px;
  z-index: 10;
}

@keyframes highlightPulse {
  0%, 100% { box-shadow: 0 0 5px rgba(239, 68, 68, 0.2); }
  50% { box-shadow: 0 0 25px rgba(239, 68, 68, 0.5); }
}

.page-container {
  padding: 2rem;
  max-width: 1400px;
  margin: 0 auto;
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
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  text-align: left;
}

.page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-width: none;
  margin: 0;
  align-items: flex-start;
  text-align: left;
}

.page-header::before,
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

.page-header::after,
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

.page-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0 0 0.15rem;
  color: #eefde6;
  background: none;
  -webkit-background-clip: unset;
  background-clip: unset;
}

.page-subtitle {
  color: rgba(229, 235, 231, 0.82);
  margin: 0;
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 700;
}

/* Alert messages */
.alert {
  padding: 0.6rem 0.75rem;
  border-radius: 8px;
  margin-bottom: 0.75rem;
  font-size: 0.88rem;
}

.alert-info {
  background-color: #e0f2fe;
  color: #0369a1;
  border-left: 4px solid #0ea5e9;
}

.alert-warning {
  background-color: #fef3c7;
  color: #92400e;
  border-left: 4px solid #f59e0b;
}

/* Help text */
.help-text {
  display: block;
  margin-top: 0.15rem;
  color: #64748b;
  font-size: 0.78rem;
  line-height: 1.3;
}

.calculation-text {
  display: block;
  margin-top: 0.15rem;
  color: #059669;
  font-size: 0.8rem;
  font-weight: 500;
  line-height: 1.3;
}

/* Loan info box */
.loan-info-box {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 0.5rem 0.65rem;
  margin-bottom: 0.35rem;
}

.loan-info-box h4 {
  color: #0369a1;
  font-size: 0.85rem;
  margin: 0 0 0.3rem;
}

.loan-info-box ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.loan-info-box li {
  padding: 0.08rem 0;
  color: #475569;
  font-size: 0.8rem;
  line-height: 1.35;
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.stat-card {
  background: white;
  padding: 1.5rem;
  border-radius: 12px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  display: flex;
  align-items: center;
  gap: 1rem;
  border-left: 4px solid;
}

.stat-card.pending {
  border-left-color: #f59e0b;
}

.stat-card.approved {
  border-left-color: #10b981;
}

.stat-card.active {
  border-left-color: #3b82f6;
}

.stat-card.rejected {
  border-left-color: #ef4444;
}

.stat-card.completed {
  border-left-color: #3b82f6;
}

.stat-card.overdue {
  border-left-color: #ef4444;
}

.stat-value {
  font-size: 1.75rem;
  font-weight: 700;
  color: #1e293b;
}

.stat-label {
  color: #64748b;
  font-size: 0.875rem;
}

/* Content Grid */
.content-grid {
  display: grid;
  grid-template-columns: 1fr 2fr;
  gap: 2rem;
}

/* Card */
.card {
  background: white;
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
  height: fit-content;
}

.loans-card {
  height: auto;
}

.card-title {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin-bottom: 0.75rem;
}

.application-card {
  padding: 1rem 1.05rem;
}

.application-card .card-title {
  font-size: 1.1rem;
  margin-bottom: 0.45rem;
}

.application-card .alert {
  padding: 0.45rem 0.65rem;
  margin-bottom: 0.5rem;
  font-size: 0.82rem;
}

/* Loan Form */
.loan-form {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.application-card .loan-form {
  gap: 0.4rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.application-card .form-group {
  gap: 0.15rem;
}

.loan-form .form-group,
.edit-loan-form .form-group {
  margin: 0;
}

.loan-form input[type='number']::-webkit-outer-spin-button,
.loan-form input[type='number']::-webkit-inner-spin-button,
.edit-loan-form input[type='number']::-webkit-outer-spin-button,
.edit-loan-form input[type='number']::-webkit-inner-spin-button {
  -webkit-appearance: none;
  margin: 0;
}

.loan-form input[type='number'],
.edit-loan-form input[type='number'] {
  -moz-appearance: textfield;
  appearance: textfield;
}

.application-card .form-group label {
  font-size: 0.78rem;
  margin: 0;
  line-height: 1.2;
}

.form-group label {
  font-weight: 500;
  color: #475569;
  font-size: 0.875rem;
}

.form-group input,
.form-group select {
  padding: 0.75rem;
  border: 1px solid #cbd5e1;
  border-radius: 6px;
  font-size: 1rem;
  transition: all 0.2s;
}

.form-group input:focus,
.form-group select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.submit-btn {
  padding: 0.75rem 1.5rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
  margin-top: 0.5rem;
}

.submit-btn:hover:not(:disabled) {
  background: #2563eb;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Tabs */
.tabs {
  display: flex;
  gap: 0.5rem;
  border-bottom: 2px solid #e2e8f0;
  margin-bottom: 1.5rem;
  overflow-x: auto;
}

.loan-filter-tabs {
  flex-wrap: wrap;
  overflow: visible;
  border-bottom: none;
}

.tab {
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  font-weight: 500;
  color: #64748b;
  cursor: pointer;
  position: relative;
  transition: color 0.2s;
  white-space: nowrap;
  font-size: 0.875rem;
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

/* Tab Content */
.tab-content {
  min-height: 300px;
}

.empty-state {
  text-align: center;
  padding: 3rem;
  color: #64748b;
  font-size: 1rem;
}

/* Loans List */
.loans-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.loan-item {
  background: #f8fafc;
  border-radius: 8px;
  padding: 1.25rem;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.loan-item:hover {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
  transform: translateY(-2px);
}

.loan-item.pending {
  border-left: 4px solid #f59e0b;
}

.loan-item.approved {
  border-left: 4px solid #10b981;
}

.loan-item.active {
  border-left: 4px solid #3b82f6;
}

.loan-item.rejected {
  border-left: 4px solid #ef4444;
}

.loan-item.completed {
  border-left: 4px solid #8b5cf6;
}

.loan-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #e2e8f0;
}

.loan-id {
  font-weight: 600;
  color: #64748b;
  font-size: 0.875rem;
}

.loan-status {
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  background: #e2e8f0;
  color: #475569;
}

.loan-body {
  margin-bottom: 1rem;
}

.loan-amount {
  font-size: 1.5rem;
  font-weight: 700;
  color: #000000;
  margin-bottom: 0.75rem;
}

.loan-progress {
  margin: 0.75rem 0;
}

.progress-bar {
  height: 8px;
  background: #e2e8f0;
  border-radius: 9999px;
  overflow: hidden;
  margin-bottom: 0.5rem;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.3s;
}

.progress-text {
  font-size: 0.75rem;
  color: #000000;
  text-align: right;
}

.loan-details {
  font-size: 0.875rem;
  color: #475569;
  line-height: 1.6;
}

.loan-details p {
  margin: 0.5rem 0;
}

.rejection-reason {
  color: #dc2626;
  font-style: italic;
}

.view-btn {
  width: 100%;
  padding: 0.625rem;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
  font-size: 0.875rem;
}

.view-btn:hover {
  background: #2563eb;
}

/* Modal */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.58);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 11050;
  padding: 1rem;
}

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: min(88dvh, 900px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-content > .modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #e2e8f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1e293b;
  margin: 0;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  color: #64748b;
  cursor: pointer;
  padding: 0;
  width: 2rem;
  height: 2rem;
}

.close-btn:hover {
  color: #1e293b;
}

.modal-body {
  padding: 1.5rem;
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 1.5rem;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.detail-item.full-width {
  grid-column: 1 / -1;
}

.detail-item label {
  font-size: 0.875rem;
  color: #64748b;
  font-weight: 500;
}

.detail-item p {
  font-size: 1rem;
  color: #1e293b;
  margin: 0;
}

.detail-item .amount {
  color: #059669;
  font-weight: 600;
}

.status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge.pending {
  background: #fef3c7;
  color: #92400e;
}

.status-badge.approved {
  background: #d1fae5;
  color: #065f46;
}

.status-badge.active {
  background: #dbeafe;
  color: #1e40af;
}

.status-badge.rejected {
  background: #fee2e2;
  color: #991b1b;
}

.status-badge.paid {
  background: #ede9fe;
  color: #6b21a8;
}

.loan-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.edit-btn {
  background: #3b82f6;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  font-size: 0.875rem;
  font-weight: 500;
  transition: background-color 0.2s;
}

.edit-btn:hover {
  background: #2563eb;
}

@media (max-width: 768px) {
  .page-container.officer-loans-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    max-width: none;
    padding: 0.75rem;
    border-radius: 0;
    overflow-x: hidden;
    min-height: 0;
    touch-action: pan-y;
  }

  .page-header {
    margin-bottom: 0.75rem;
  }

  .page-header,
  .page-header-split {
    padding: 0.75rem 0.85rem;
    border-radius: 12px;
    gap: 0.15rem;
  }

  .page-header::after,
  .page-header-split::after {
    display: none;
  }

  .page-header-text {
    gap: 0.15rem;
  }

  .page-title {
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
  }

  .page-subtitle {
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
  }

  .loan-module-off-banner {
    padding: 0.65rem 0.75rem;
    margin-bottom: 0.75rem;
    font-size: 0.78rem;
    border-radius: 10px;
    line-height: 1.35;
  }

  .loan-filter-tabs {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 10px;
    overflow: visible;
  }

  .content-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .card {
    padding: 0.75rem 0.7rem;
    border-radius: 14px;
  }

  .application-card {
    padding: 0.7rem 0.65rem;
  }

  .card-title {
    font-size: 1.05rem;
    margin-bottom: 0.55rem;
  }

  .application-card .card-title {
    font-size: 0.98rem;
    margin-bottom: 0.35rem;
  }

  .alert {
    padding: 0.45rem 0.6rem;
    font-size: 0.75rem;
    border-radius: 8px;
    margin-bottom: 0.45rem;
  }

  .loan-form {
    gap: 0.4rem;
  }

  .application-card .loan-form {
    gap: 0.35rem;
  }

  .application-card .form-group label {
    font-size: 0.7rem;
    margin-bottom: 0;
  }

  .input-shell select,
  .input-shell input,
  .form-group select,
  .form-group input {
    width: 100%;
    min-height: 36px;
    font-size: 0.82rem;
    border-radius: 8px;
    padding: 0.4rem 0.6rem;
  }

  .help-text,
  .calculation-text {
    font-size: 0.7rem;
    line-height: 1.3;
    margin-top: 0.15rem;
  }

  .loan-info-box {
    padding: 0.45rem 0.55rem;
    border-radius: 8px;
    margin-top: 0;
    margin-bottom: 0.25rem;
  }

  .loan-info-box h4 {
    font-size: 0.78rem;
    margin-bottom: 0.25rem;
  }

  .loan-info-box li {
    font-size: 0.72rem;
    line-height: 1.3;
    margin-bottom: 0;
    padding: 0.06rem 0;
  }

  .submit-btn {
    width: 100%;
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.45rem 0.75rem;
    border-radius: 8px;
    margin-top: 0.15rem;
  }

  .tabs {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    overflow: visible;
    border-bottom: 0;
    margin-bottom: 0.75rem;
    padding-bottom: 0;
  }

  .tab {
    flex: none;
    width: 100%;
    min-width: 0;
    padding: 8px 6px;
    font-size: 0.72rem;
    min-height: 40px;
    white-space: normal;
    border-radius: 10px;
    line-height: 1.2;
  }

  .loans-list {
    gap: 0.55rem;
  }

  .loan-item {
    padding: 0.7rem 0.75rem 0.65rem;
    border-radius: 12px;
    border-left-width: 3px;
  }

  .loan-header {
    margin-bottom: 0.45rem;
    padding-bottom: 0.4rem;
  }

  .loan-status {
    font-size: 0.68rem;
    padding: 0.22rem 0.55rem;
    border-radius: 8px;
  }

  .loan-amount {
    font-size: 1.15rem !important;
    margin-bottom: 0.35rem;
    line-height: 1.2;
  }

  .loan-details {
    display: flex;
    flex-direction: column;
    gap: 0.28rem;
  }

  .loan-details p {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 0.55rem;
    margin: 0;
    font-size: 0.78rem;
    line-height: 1.3;
  }

  .loan-details p strong {
    flex-shrink: 0;
    min-width: 4.8rem;
    font-size: 0.65rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: rgba(15, 81, 50, 0.55);
  }

  .loan-progress {
    margin-bottom: 0.45rem;
  }

  .progress-text {
    font-size: 0.72rem;
  }

  .loan-actions {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    width: 100%;
    margin-top: 0.45rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(148, 163, 184, 0.25);
  }

  .loan-actions button,
  .loan-item > .view-btn,
  .loan-item > .edit-btn,
  .loan-card > .view-btn {
    width: 100%;
    min-height: 40px;
    font-size: 0.78rem;
    padding: 0.45rem 0.65rem;
    border-radius: 8px;
    justify-content: center;
  }

  .loan-card.warning {
    padding: 0.7rem 0.75rem 0.65rem;
    border-radius: 12px;
  }

  .loan-card.warning .loan-header {
    flex-wrap: wrap;
    gap: 0.35rem;
    margin-bottom: 0.45rem;
  }

  .loan-badge {
    font-size: 0.62rem;
    padding: 0.2rem 0.45rem;
  }

  .loan-card.warning .loan-amount {
    font-size: 1.15rem !important;
  }

  .detail-row {
    font-size: 0.78rem;
    gap: 0.55rem;
    padding: 0.1rem 0;
  }

  .detail-row .label {
    font-size: 0.65rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    font-weight: 700;
    color: rgba(15, 81, 50, 0.55);
  }

  .modal-overlay .modal-content,
  .modal-content {
    width: calc(100% - 1rem) !important;
    max-width: calc(100% - 1rem) !important;
    max-height: 90vh;
    overflow-y: auto;
    margin: 0.5rem;
    border-radius: 14px;
    padding: 14px 12px;
  }
}

.payment-history-section {
  margin-top: 1.5rem;
  border-top: 1px solid #e2e8f0;
  padding-top: 1rem;
}

.payment-history-section h4 {
  margin-bottom: 0.75rem;
  color: #2d3748;
}

.payment-history-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.9rem;
}

.payment-history-table th,
.payment-history-table td {
  padding: 0.5rem 0.75rem;
  text-align: left;
  border-bottom: 1px solid #e2e8f0;
}

.payment-history-table th {
  background: #f7fafc;
  font-weight: 600;
  color: #4a5568;
}

.payment-history-table .amount {
  font-weight: 600;
  color: #38a169;
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

.receipt-modal-overlay {
  z-index: 12000 !important;
}

/* ===== Modern Glass Redesign (Loan page shell) ===== */
.page-container {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: linear-gradient(145deg, #0f1712 0%, #132119 28%, #1f3627 64%, #2a4735 100%);
  border-radius: 20px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
}

.page-container::before {
  content: '';
  position: fixed;
  inset: 0;
  background:
    radial-gradient(ellipse 80% 50% at 10% 90%, rgba(17, 94, 41, 0.14) 0%, transparent 60%),
    radial-gradient(ellipse 70% 50% at 90% 10%, rgba(45, 212, 191, 0.08) 0%, transparent 60%);
  pointer-events: none;
  z-index: 0;
}

.modal-overlay {
  z-index: 11050 !important;
}

.page-container.officer-loans-page .page-header,
.page-container.officer-loans-page .page-header-split {
  margin-bottom: 2rem !important;
  padding: 1.25rem 1.4rem 1.1rem !important;
  display: flex !important;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 14px !important;
  position: relative;
  overflow: hidden;
  background: rgba(28, 42, 33, 0.92) !important;
  border: 1px solid rgba(190, 235, 203, 0.14) !important;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05) !important;
  text-align: left !important;
}

.page-container.officer-loans-page .page-header-text {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex !important;
  flex-direction: column;
  gap: 0.35rem;
  max-width: none !important;
  margin: 0 !important;
  align-items: flex-start !important;
  text-align: left !important;
}

.page-container.officer-loans-page .page-title {
  font-size: 2rem !important;
  font-weight: 800 !important;
  line-height: 1.2 !important;
  letter-spacing: -0.02em;
  margin: 0 0 0.15rem !important;
  color: #eefde6 !important;
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: #eefde6 !important;
}

.page-container.officer-loans-page .page-subtitle {
  color: rgba(229, 235, 231, 0.82) !important;
  margin: 0 !important;
  font-size: 1rem !important;
  line-height: 1.45 !important;
  font-weight: 700 !important;
  text-align: left !important;
  max-width: none !important;
}

.stats-group {
  margin-bottom: 18px;
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

.stats-grid.loan-stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 0;
}

@media (min-width: 900px) {
  .stats-grid.loan-stats {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (min-width: 1280px) {
  .stats-grid.loan-stats {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.stats-grid.loan-stats .stat-card {
  border-radius: 12px;
  padding: 10px 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  pointer-events: none;
}

.stats-grid.loan-stats .glass-stat-card {
  background: linear-gradient(135deg, rgba(162, 246, 195, 0.2) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 10px 18px rgba(8, 13, 10, 0.22), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
}

.stats-grid.loan-stats .stat-card .stat-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
}

.stats-grid.loan-stats .stat-label {
  color: rgba(220, 238, 211, 0.74);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.3px;
  margin-bottom: 3px;
  text-align: center;
  line-height: 1.2;
}

.stats-grid.loan-stats .stat-value {
  font-size: 1.2rem;
  font-weight: 900;
  color: #ffffff;
  line-height: 1;
  text-align: center;
}

.stats-grid.loan-stats .stat-card.pending { border-left: 4px solid rgba(251, 191, 36, 0.92); }
.stats-grid.loan-stats .stat-card.approved { border-left: 4px solid rgba(74, 222, 128, 0.92); }
.stats-grid.loan-stats .stat-card.active { border-left: 4px solid rgba(96, 165, 250, 0.92); }
.stats-grid.loan-stats .stat-card.rejected { border-left: 4px solid rgba(248, 113, 113, 0.9); }
.stats-grid.loan-stats .stat-card.completed { border-left: 4px solid rgba(45, 212, 191, 0.92); }
.stats-grid.loan-stats .stat-card.overdue { border-left: 4px solid rgba(248, 113, 113, 0.9); }

.content-grid {
  grid-template-columns: minmax(300px, 0.95fr) minmax(460px, 1.35fr);
  gap: 1.5rem;
}

.card {
  background: linear-gradient(145deg, rgba(16, 44, 31, 0.86), rgba(13, 37, 27, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  box-shadow: 0 16px 30px rgba(4, 9, 7, 0.34);
}

.card-title {
  color: #ecfdf5;
  font-weight: 800;
}

.alert-info {
  background: rgba(219, 234, 254, 0.88);
  color: #0f3f66;
  border-left: 4px solid #38bdf8;
  border-radius: 12px;
}

.alert-warning {
  border-radius: 12px;
}

.loan-form {
  gap: 0.4rem;
}

.application-card .form-group label {
  color: rgba(236, 253, 245, 0.9);
  font-weight: 600;
}

.input-shell {
  position: relative;
}

.input-shell select,
.input-shell input {
  width: 100%;
  box-sizing: border-box;
}

.field-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: rgba(187, 247, 208, 0.9);
  font-size: 14px;
  pointer-events: none;
  z-index: 2;
}

.loan-form .form-group input,
.loan-form .form-group select {
  padding: 0.48rem 0.75rem;
  border-radius: 10px;
  border: 1px solid rgba(134, 239, 172, 0.28);
  background: rgba(8, 30, 22, 0.52);
  color: #ecfdf5;
  font-size: 0.9rem;
}

.loan-form .form-group input::placeholder {
  color: rgba(209, 250, 229, 0.55);
}

.loan-form .form-group input:focus,
.loan-form .form-group select:focus {
  border-color: rgba(110, 231, 183, 0.9);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15), 0 0 16px rgba(74, 222, 128, 0.22);
}

.application-card .help-text {
  color: rgba(220, 252, 231, 0.78);
}

.application-card .calculation-text {
  color: #86efac;
}

.loan-info-box {
  background: rgba(239, 246, 255, 0.9);
  border-radius: 14px;
}

.submit-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-radius: 10px;
  padding: 0.55rem 0.9rem;
  font-size: 0.9rem;
  font-weight: 800;
  transition: transform 180ms ease, box-shadow 220ms ease, filter 220ms ease;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.34);
  filter: brightness(1.02);
}

.tabs {
  border-bottom: none;
  gap: 0.6rem;
  padding-bottom: 0.4rem;
  margin-bottom: 1.1rem;
}

.loan-filter-tabs {
  margin-bottom: 1.35rem;
}

@media (min-width: 769px) {
  .loan-filter-tabs {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
    overflow: visible;
  }

  .loan-filter-tabs .tab {
    width: 100%;
    min-width: 0;
    min-height: 40px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    text-align: center;
    padding: 10px 8px;
    font-size: 13px;
    border-radius: 10px;
  }
}

@media (min-width: 1200px) {
  .loan-filter-tabs {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }
}

.tab {
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
  color: #e6fff1;
  font-weight: 700;
  padding: 0.52rem 0.85rem;
  transition: all 220ms ease;
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

.tab.active::after {
  display: none;
}

.loan-item {
  border-radius: 14px;
  background: linear-gradient(135deg, rgba(245, 255, 250, 0.94), rgba(236, 253, 245, 0.9));
  border: 1px solid rgba(148, 163, 184, 0.22);
  box-shadow: 0 8px 18px rgba(3, 10, 7, 0.12);
}

.loan-amount {
  color: #000000;
  font-size: 2.15rem;
  font-weight: 900;
  margin-bottom: 0.42rem;
}

.loan-status {
  font-size: 0.86rem;
  font-weight: 800;
  padding: 0.34rem 0.86rem;
  border-radius: 999px;
  letter-spacing: 0.01em;
}

.loan-item.pending .loan-status {
  background: #fef3c7;
  color: #854d0e;
  border: 1px solid #fcd34d;
}

.loan-item.approved .loan-status,
.loan-item.completed .loan-status {
  background: #dcfce7;
  color: #14532d;
  border: 1px solid #86efac;
}

.loan-item.active .loan-status {
  background: #dbeafe;
  color: #1e3a8a;
  border: 1px solid #93c5fd;
}

.loan-item.rejected .loan-status {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.modal-content:not(.tx-detail-modal) {
  background: #ffffff !important;
  border: 1px solid #bbf7d0;
}

.modal-content:not(.tx-detail-modal) .modal-header h3 {
  color: #14532d !important;
  font-size: 1.35rem;
  font-weight: 800;
}

.modal-content:not(.tx-detail-modal) .details-grid {
  gap: 1rem;
}

.modal-content:not(.tx-detail-modal) .detail-item {
  background: #f8fffb;
  border: 1px solid #dcfce7;
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
}

.modal-content:not(.tx-detail-modal) .detail-item label {
  color: #166534 !important;
  font-size: 0.9rem;
  font-weight: 700;
}

.modal-content:not(.tx-detail-modal) .detail-item p {
  color: #0f172a !important;
  font-size: 1.06rem;
  font-weight: 700;
}

.modal-content:not(.tx-detail-modal) .detail-item .amount {
  color: #065f46 !important;
  font-size: 1.18rem;
  font-weight: 900;
}

.status-badge {
  font-size: 0.83rem;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: capitalize;
}

.status-badge.pending {
  background: #fde68a !important;
  color: #78350f !important;
  border: 1px solid #f59e0b;
}

.loan-details {
  font-size: 1.04rem;
  color: #000000 !important;
  line-height: 1.75;
  background: #ffffff;
  border: 1px solid #d1fae5;
  border-radius: 12px;
  padding: 0.65rem 0.82rem;
}

.loan-details p {
  margin: 0.42rem 0;
  color: #000000 !important;
  font-weight: 600;
}

.loan-details strong {
  color: #000000 !important;
  font-weight: 800;
}

.loan-actions .edit-btn,
.loan-actions .view-btn {
  width: auto;
  flex: 1;
}

.primary-action {
  background: linear-gradient(135deg, #15803d 0%, #16a34a 100%);
  border: 1px solid rgba(21, 128, 61, 0.9);
  color: #ffffff;
  box-shadow: 0 6px 14px rgba(22, 163, 74, 0.3);
  transition: transform 180ms ease, box-shadow 220ms ease, filter 220ms ease;
}

.primary-action:hover {
  transform: translateY(-1px);
  box-shadow: 0 10px 16px rgba(22, 163, 74, 0.38);
  filter: brightness(1.03);
}

.secondary-action {
  background: #ffffff;
  border: 1px solid #16a34a;
  color: #000000;
  font-weight: 700;
  transition: transform 180ms ease, background-color 220ms ease, box-shadow 220ms ease;
}

.secondary-action:hover {
  background: #f0fdf4;
  transform: translateY(-1px);
  box-shadow: 0 8px 15px rgba(15, 81, 50, 0.16);
}

.empty-state {
  display: grid;
  place-items: center;
  text-align: center;
  min-height: 220px;
  color: rgba(220, 252, 231, 0.86);
}

.empty-illustration {
  font-size: 1.55rem;
  display: inline-block;
  margin-bottom: 0.42rem;
  filter: drop-shadow(0 2px 6px rgba(3, 12, 8, 0.22));
}

.empty-state p {
  margin: 0;
  font-size: 0.98rem;
}

.loan-card.warning {
  border-radius: 14px;
  padding: 1.25rem;
  border: 1px solid rgba(251, 191, 36, 0.55);
  background: linear-gradient(145deg, rgba(254, 252, 232, 0.98), rgba(254, 226, 226, 0.9));
  box-shadow: 0 10px 22px rgba(120, 53, 15, 0.15);
}

.loan-card.warning.highlight {
  box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.45), 0 10px 22px rgba(120, 53, 15, 0.2);
}

.loan-card.warning .loan-header {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 0.35rem;
  border-bottom-color: rgba(251, 191, 36, 0.4);
}

.loan-badge {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  color: #92400e;
}

.loan-card.warning .loan-type {
  text-transform: capitalize;
  font-size: 0.9rem;
  font-weight: 700;
  color: #1e293b;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  font-size: 0.9rem;
  margin: 0.35rem 0;
}

.detail-row .label {
  color: #64748b;
  font-weight: 600;
}

.detail-row .value {
  color: #0f172a;
  font-weight: 700;
  text-align: right;
}

.warning-text {
  color: #c2410c !important;
}

.penalty-amount {
  color: #b91c1c !important;
}

.view-btn.warning-btn {
  background: linear-gradient(135deg, #ea580c 0%, #dc2626 100%);
  margin-top: 0.75rem;
  border: none;
  color: #fff;
}

.view-btn.warning-btn:hover {
  filter: brightness(1.05);
}

.modal-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 0.5rem;
  flex-wrap: wrap;
}

.edit-loan-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.edit-loan-form .form-group {
  gap: 0.25rem;
}

.edit-loan-form .form-group label {
  margin-bottom: 0;
  font-size: 0.82rem;
}

.edit-loan-form .form-group input,
.edit-loan-form .form-group select {
  padding: 0.5rem 0.75rem !important;
  border-radius: 8px !important;
  border: 1px solid #cbd5e1 !important;
  background: #ffffff !important;
  color: #1e293b !important;
}

.edit-loan-form .form-group input:focus,
.edit-loan-form .form-group select:focus {
  border-color: #3b82f6 !important;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.12) !important;
}

.edit-loan-form .form-group label {
  color: #475569 !important;
}

.edit-loan-form .help-text,
.edit-loan-form .calculation-text {
  color: #64748b !important;
}

@media (max-width: 1024px) {
  .loan-filter-tabs {
    flex-wrap: wrap;
  }

  .content-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 1.1rem !important;
  }

  .loan-amount {
    font-size: 1.05rem !important;
  }

  .loan-details p strong,
  .detail-row .label {
    min-width: 4.2rem;
    font-size: 0.62rem;
  }
}

/* ===== LIGHT MODE — colors only (geometry matches dark) ===== */
.page-container.officer-loans-page.light-theme {
  background: linear-gradient(155deg, #d8f3de 0%, #bfeccc 42%, #a8e4b8 100%);
  color: #052e16;
}

.page-container.officer-loans-page.light-theme .page-header,
.page-container.officer-loans-page.light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 8px 26px rgba(22, 101, 52, 0.1), inset 1px 1px 0 rgba(255, 255, 255, 0.65) !important;
}

.page-container.officer-loans-page.light-theme .page-title {
  background: none !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .page-subtitle {
  color: #14532d !important;
}

.page-container.officer-loans-page.light-theme .stats-group-title {
  color: #166534 !important;
}

.page-container.officer-loans-page.light-theme .stats-grid.loan-stats .glass-stat-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.page-container.officer-loans-page.light-theme .stats-grid.loan-stats .stat-label {
  color: #166534 !important;
}

.page-container.officer-loans-page.light-theme .stats-grid.loan-stats .stat-value {
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .stat-card {
  background: linear-gradient(145deg, #ffffff 0%, #f4fdf7 100%) !important;
  border-color: #86efac !important;
  box-shadow: 0 10px 22px rgba(22, 101, 52, 0.1) !important;
}

.page-container.officer-loans-page.light-theme .stat-card.pending {
  border-left-color: #f59e0b !important;
}

.page-container.officer-loans-page.light-theme .stat-card.approved {
  border-left-color: #10b981 !important;
}

.page-container.officer-loans-page.light-theme .stat-card.active {
  border-left-color: #8b5cf6 !important;
}

.page-container.officer-loans-page.light-theme .stat-card.rejected {
  border-left-color: #ef4444 !important;
}

.page-container.officer-loans-page.light-theme .stat-card.completed {
  border-left-color: #3b82f6 !important;
}

.page-container.officer-loans-page.light-theme .stat-card.overdue {
  border-left-color: #ef4444 !important;
}

.page-container.officer-loans-page.light-theme .stat-value {
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .stat-label {
  color: #166534 !important;
}

.page-container.officer-loans-page.light-theme .card {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 16px 30px rgba(22, 101, 52, 0.1);
}

.page-container.officer-loans-page.light-theme .card-title {
  color: #052e16;
}

.page-container.officer-loans-page.light-theme .application-card .form-group label {
  color: #14532d;
}

.page-container.officer-loans-page.light-theme .loan-form .form-group input,
.page-container.officer-loans-page.light-theme .loan-form .form-group select {
  background: #ffffff;
  color: #052e16;
  border-color: #cbd5e1;
}

.page-container.officer-loans-page.light-theme .loan-form .form-group input::placeholder {
  color: #64748b;
}

.page-container.officer-loans-page.light-theme .loan-form .form-group input:focus,
.page-container.officer-loans-page.light-theme .loan-form .form-group select:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15), 0 0 16px rgba(34, 197, 94, 0.18);
}

.page-container.officer-loans-page.light-theme .field-icon {
  color: #166534;
}

.page-container.officer-loans-page.light-theme .application-card .help-text {
  color: #166534;
}

.page-container.officer-loans-page.light-theme .application-card .calculation-text {
  color: #15803d;
}

.page-container.officer-loans-page.light-theme .loan-info-box {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.page-container.officer-loans-page.light-theme .loan-info-box h4 {
  color: #052e16;
}

.page-container.officer-loans-page.light-theme .loan-info-box li {
  color: #14532d;
}

.page-container.officer-loans-page.light-theme .tab {
  background: #ffffff;
  color: #14532d;
  border-color: #bbf7d0;
}

.page-container.officer-loans-page.light-theme .tab:hover {
  background: #f0fdf4;
  color: #052e16;
  border-color: #86efac;
}

.page-container.officer-loans-page.light-theme .tab.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #ffffff;
  border-color: #15803d;
  box-shadow: 0 0 16px rgba(34, 197, 94, 0.28);
}

.page-container.officer-loans-page.light-theme .empty-state {
  color: #166534;
}

.page-container.officer-loans-page.light-theme .loan-item {
  background: linear-gradient(145deg, #ffffff 0%, #f8fdf9 100%);
  border-color: #bbf7d0;
  box-shadow: 0 8px 18px rgba(22, 101, 52, 0.08);
}

.page-container.officer-loans-page.light-theme .payment-history-table-wrap {
  background: #ffffff;
}

.page-container.officer-loans-page.light-theme .payment-history-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #052e16;
  border-bottom-color: #86efac;
}

.page-container.officer-loans-page.light-theme .payment-history-table td {
  color: #14532d;
  border-bottom-color: #e2e8f0;
}

.page-container.officer-loans-page.light-theme .modal-overlay {
  background: rgba(15, 23, 42, 0.35);
}

/* ===== Mobile polish (must stay last to beat glass redesign) ===== */
@media (max-width: 768px) {
  .page-container.officer-loans-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    max-width: none;
    padding: 0.75rem !important;
    border-radius: 0;
    overflow-x: hidden;
  }

  .page-container.officer-loans-page .page-header,
  .page-container.officer-loans-page .page-header-split {
    padding: 0.75rem 0.85rem !important;
    border-radius: 12px !important;
    margin-bottom: 0.75rem !important;
  }

  .page-container.officer-loans-page .page-header::after,
  .page-container.officer-loans-page .page-header-split::after {
    display: none;
  }

  .page-container.officer-loans-page .page-title {
    font-size: 1.2rem !important;
    line-height: 1.25 !important;
    margin: 0 !important;
  }

  .page-container.officer-loans-page .page-subtitle {
    font-size: 0.75rem !important;
    line-height: 1.3 !important;
    margin: 0 !important;
  }

  .page-container.officer-loans-page .loan-filter-tabs {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    margin-bottom: 10px !important;
  }

  .page-container.officer-loans-page .content-grid {
    grid-template-columns: 1fr !important;
    gap: 0.75rem !important;
  }

  .page-container.officer-loans-page .card {
    padding: 0.75rem 0.7rem !important;
    border-radius: 14px !important;
  }

  .page-container.officer-loans-page .card-title {
    font-size: 1.05rem !important;
    margin-bottom: 0.55rem !important;
  }

  .page-container.officer-loans-page .tabs {
    display: grid !important;
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 8px !important;
    overflow: visible !important;
    border-bottom: 0 !important;
    margin-bottom: 0.75rem !important;
  }

  .page-container.officer-loans-page .tab {
    width: 100% !important;
    min-width: 0 !important;
    padding: 8px 6px !important;
    font-size: 0.72rem !important;
    min-height: 40px !important;
    white-space: normal !important;
    border-radius: 10px !important;
  }

  .page-container.officer-loans-page .loan-item {
    padding: 0.7rem 0.75rem 0.65rem !important;
    border-radius: 12px !important;
  }

  .page-container.officer-loans-page .loan-amount {
    font-size: 1.15rem !important;
    margin-bottom: 0.35rem !important;
  }

  .page-container.officer-loans-page .loan-status {
    font-size: 0.68rem !important;
    padding: 0.22rem 0.55rem !important;
  }

  .page-container.officer-loans-page .loan-header {
    margin-bottom: 0.45rem !important;
    padding-bottom: 0.4rem !important;
  }

  .page-container.officer-loans-page .loan-details p {
    display: flex;
    justify-content: space-between;
    gap: 0.55rem;
    margin: 0;
    font-size: 0.78rem !important;
  }

  .page-container.officer-loans-page .loan-details p strong {
    flex-shrink: 0;
    min-width: 4.8rem;
    font-size: 0.65rem !important;
    text-transform: uppercase;
    letter-spacing: 0.03em;
  }

  .page-container.officer-loans-page .loan-actions {
    flex-direction: column !important;
    gap: 0.4rem !important;
    width: 100%;
    margin-top: 0.45rem;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(148, 163, 184, 0.25);
  }

  .page-container.officer-loans-page .loan-actions button,
  .page-container.officer-loans-page .loan-item > .view-btn,
  .page-container.officer-loans-page .loan-item > .edit-btn,
  .page-container.officer-loans-page .loan-card > .view-btn,
  .page-container.officer-loans-page .submit-btn {
    width: 100% !important;
    min-height: 40px !important;
    font-size: 0.78rem !important;
    justify-content: center;
  }

  .page-container.officer-loans-page .submit-btn {
    font-size: 0.88rem !important;
    min-height: 42px !important;
  }

  .page-container.officer-loans-page .input-shell select,
  .page-container.officer-loans-page .input-shell input,
  .page-container.officer-loans-page .form-group select,
  .page-container.officer-loans-page .form-group input {
    min-height: 40px !important;
    font-size: 0.85rem !important;
  }

  .page-container.officer-loans-page .modal-content {
    width: calc(100% - 1rem) !important;
    max-width: calc(100% - 1rem) !important;
    margin: 0.5rem !important;
    border-radius: 14px !important;
    padding: 14px 12px !important;
  }
}

@media (max-width: 480px) {
  .page-container.officer-loans-page .page-title {
    font-size: 1.1rem !important;
  }

  .page-container.officer-loans-page .loan-amount {
    font-size: 1.05rem !important;
  }
}
</style>
