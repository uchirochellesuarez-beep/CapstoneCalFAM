<template>
  <div class="page-container glass-module-page officer-loans-page" :class="{ 'light-theme': isLight }">
    <div class="page-header glass-header">
      <div class="header-content">
        <div class="header-title-row">
          <h1 class="page-title">{{ pageTitle }}</h1>
        </div>
      </div>
    </div>

    <!-- Loan Statistics -->
    <div class="stats-grid">
      <button type="button" class="stat-card pending stat-card-clickable" :class="{ 'stat-card-active': activeTab === 'pending' }" @click="activeTab = 'pending'">
        <div class="stat-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ pendingLoans.length }}</div>
          <div class="stat-label">Pending</div>
        </div>
      </button>
      <button type="button" class="stat-card approved stat-card-clickable" :class="{ 'stat-card-active': activeTab === 'approved' }" @click="activeTab = 'approved'">
        <div class="stat-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ approvedLoans.length }}</div>
          <div class="stat-label">Approved</div>
        </div>
      </button>
      <button type="button" class="stat-card active stat-card-clickable" :class="{ 'stat-card-active': activeTab === 'active' }" @click="activeTab = 'active'">
        <div class="stat-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ activeLoans.length }}</div>
          <div class="stat-label">Active</div>
        </div>
      </button>
      <button type="button" class="stat-card rejected stat-card-clickable" :class="{ 'stat-card-active': activeTab === 'rejected' }" @click="activeTab = 'rejected'">
        <div class="stat-icon-wrap" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ rejectedLoans.length }}</div>
          <div class="stat-label">Rejected</div>
        </div>
      </button>
    </div>

    <div class="content-grid">
      <!-- Loan Application Form -->
      <div class="card application-card">
        <div class="card-head">
          <h2 class="card-title card-title-with-icon">
            <span class="card-title-icon" aria-hidden="true">
              <LoanApplyIcon :size="18" />
            </span>
            Apply for New Loan
          </h2>
          <div class="application-steps" aria-label="Application steps">
            <div class="step-chip active">
              <span class="step-num">1</span>
              <span class="step-label">Fill in details</span>
            </div>
            <div class="step-connector" aria-hidden="true"></div>
            <div class="step-chip">
              <span class="step-num">2</span>
              <span class="step-label">Review terms</span>
            </div>
            <div class="step-connector" aria-hidden="true"></div>
            <div class="step-chip">
              <span class="step-num">3</span>
              <span class="step-label">Submit request</span>
            </div>
          </div>
        </div>

        <div class="card-body">
        <!-- Eligibility Message -->
        <div v-if="eligibilityMessage" class="alert alert-with-icon" :class="canApplyLoan ? 'alert-info' : 'alert-warning'">
          <svg v-if="canApplyLoan" class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <svg v-else class="alert-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M12 9v4" />
            <path d="M12 17h.01" />
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
          </svg>
          <span>{{ eligibilityMessage }}</span>
        </div>
        
        <form @submit.prevent="submitLoanApplication" class="loan-form" v-if="canApplyLoan">
          <div class="form-row-two">
          <div class="form-group">
            <label>Loan Type</label>
            <div class="input-shell">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <rect x="2" y="7" width="20" height="14" rx="2" />
                  <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
                </svg>
              </span>
              <select v-model="loanForm.type" required @change="updateMaxAmount">
                <option value="">Select loan type</option>
                <option value="agricultural">Agricultural Loan (Max: ₱5,000)</option>
                <option value="provident">Provident Loan (Max: ₱3,000)</option>
                <option value="educational">Educational Loan (Max: ₱3,000)</option>
              </select>
            </div>
          </div>
          <div class="form-group">
            <label>Loan Amount (₱)</label>
            <div class="input-shell">
              <span class="field-icon" aria-hidden="true">₱</span>
              <input
                type="number"
                v-model="loanForm.amount"
                placeholder="Enter amount"
                required
                min="500"
                :max="maxLoanAmount"
                step="100"
              />
            </div>
            <small v-if="loanForm.type" class="help-text">
              Max ₱{{ maxLoanAmount.toLocaleString() }} · 1% interest · 6 months
            </small>
          </div>
          </div>
          <div class="form-group form-group-full">
            <label>Purpose (Optional)</label>
            <div class="input-shell">
              <span class="field-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <line x1="17" y1="10" x2="3" y2="10" />
                  <line x1="21" y1="6" x2="3" y2="6" />
                  <line x1="21" y1="14" x2="3" y2="14" />
                  <line x1="17" y1="18" x2="3" y2="18" />
                </svg>
              </span>
              <input
                type="text"
                v-model="loanForm.purpose"
                placeholder="Enter loan purpose"
                maxlength="200"
              />
            </div>
          </div>
          <div v-if="loanForm.amount" class="amount-summary">
            <span>Principal <strong>₱{{ parseFloat(loanForm.amount).toLocaleString() }}</strong></span>
            <span>Interest <strong>₱{{ (parseFloat(loanForm.amount) * 0.01).toLocaleString() }}</strong></span>
            <span class="amount-total">Total <strong>₱{{ (parseFloat(loanForm.amount) * 1.01).toLocaleString() }}</strong></span>
          </div>
          <div class="loan-info-box">
            <h4 class="loan-info-title">
              <svg class="loan-info-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                <circle cx="12" cy="12" r="9" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              Loan Terms & Conditions
            </h4>
            <ul class="terms-grid">
              <li>Fixed interest: <strong>1%</strong></li>
              <li>Payment period: <strong>6 months</strong></li>
              <li>Max: <strong>1 loan / 6 months</strong></li>
              <li>Complete existing loans first</li>
              <li class="terms-full">{{ approvalDescription }}</li>
            </ul>
          </div>
          <div class="form-actions">
          <button type="submit" class="submit-btn" :disabled="loading || !canApplyLoan">
            <svg class="submit-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <line x1="22" y1="2" x2="11" y2="13" />
              <polygon points="22 2 15 22 11 13 2 9 22 2" />
            </svg>
            {{ loading ? 'Submitting...' : 'Submit Application' }}
          </button>
          </div>
        </form>
        </div>
      </div>

      <!-- My Loans Section with Tabs -->
      <div class="card loans-card">
        <div class="card-head">
        <h2 class="card-title card-title-with-icon">
          <span class="card-title-icon card-title-icon-list" aria-hidden="true">
            <LoanApplicationsIcon :size="18" />
          </span>
          My Loan Applications
        </h2>
        </div>

        <div class="card-body loans-card-body">
        <!-- Tabs -->
        <div class="tabs-wrap">
        <div class="tabs">
          <button
            :class="['tab', 'tab-pending', { active: activeTab === 'pending' }]"
            @click="activeTab = 'pending'"
          >
            <span class="tab-inner">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>
              Pending ({{ pendingLoans.length }})
            </span>
          </button>
          <button
            :class="['tab', 'tab-approved', { active: activeTab === 'approved' }]"
            @click="activeTab = 'approved'"
          >
            <span class="tab-inner">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg>
              Approved ({{ approvedLoans.length }})
            </span>
          </button>
          <button
            :class="['tab', 'tab-repaying', { active: activeTab === 'active' }]"
            @click="activeTab = 'active'"
          >
            <span class="tab-inner">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Active ({{ activeLoans.length }})
            </span>
          </button>
          <button
            :class="['tab', 'tab-rejected', { active: activeTab === 'rejected' }]"
            @click="activeTab = 'rejected'"
          >
            <span class="tab-inner">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
              Rejected ({{ rejectedLoans.length }})
            </span>
          </button>
          <button
            :class="['tab', 'tab-completed', { active: activeTab === 'completed' }]"
            @click="activeTab = 'completed'"
          >
            <span class="tab-inner">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              Completed ({{ completedLoans.length }})
            </span>
          </button>
          <button
            :class="['tab', 'tab-overdue', { active: activeTab === 'overdue' }]"
            @click="activeTab = 'overdue'"
          >
            <span class="tab-inner">
              <svg class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 9v4"/><path d="M12 17h.01"/><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
              Overdue ({{ overdueLoans.length }})
            </span>
          </button>
        </div>
        </div>

        <!-- Tab Content -->
        <div class="tab-content">
          <!-- Pending Loans -->
          <div v-if="activeTab === 'pending'">
            <div v-if="pendingLoans.length === 0" class="empty-state">
              <div class="empty-state-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <path d="M12 7v5l3 2" />
                </svg>
              </div>
              <p>No pending loan applications yet.</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in pendingLoans" :key="loan.id" class="loan-item pending" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">Pending approval</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="approval-progress">
                    <div class="approval-track">
                      <div class="approval-fill" :style="{ width: (getStageIndex(loan.status) / 3) * 100 + '%' }"></div>
                    </div>
                    <div class="approval-stage-text">Stage {{ getStageIndex(loan.status) + 1 }} of 4 • For review</div>
                  </div>
                  <div class="loan-details">
                    <p><strong>Type:</strong> {{ formatLoanType(loan.loan_type) }}</p>
                    <p><strong>Purpose:</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>Payment Term:</strong> {{ loan.payment_term }} months</p>
                    <p><strong>Applied:</strong> {{ formatDate(loan.application_date) }}</p>
                  </div>
                </div>
                <div class="loan-actions">
                  <button class="edit-btn primary-action" @click="editLoan(loan)">Edit</button>
                  <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">View Details</button>
                </div>
              </div>
            </div>
          </div>

          <!-- Approved Loans -->
          <div v-if="activeTab === 'approved'">
            <div v-if="approvedLoans.length === 0" class="empty-state">
              <div class="empty-state-icon empty-state-icon-success" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                  <polyline points="22 4 12 14.01 9 11.01" />
                </svg>
              </div>
              <p>No approved loan applications yet.</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in approvedLoans" :key="loan.id" class="loan-item approved" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">Approved</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="approval-progress">
                    <div class="approval-track">
                      <div class="approval-fill" :style="{ width: (getStageIndex(loan.status) / 3) * 100 + '%' }"></div>
                    </div>
                    <div class="approval-stage-text">Stage {{ getStageIndex(loan.status) + 1 }} of 4 • Approved</div>
                  </div>
                  <div class="loan-details">
                    <p><strong>Purpose:</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>Payment Term:</strong> {{ loan.payment_term }} months</p>
                    <p><strong>Approved:</strong> {{ formatDate(loan.approval_date) }}</p>
                    <p><strong>Due Date:</strong> {{ formatDate(loan.due_date) }}</p>
                    <p v-if="loan.remarks"><strong>Remarks:</strong> {{ loan.remarks }}</p>
                  </div>
                </div>
                <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">View Details</button>
              </div>
            </div>
          </div>

          <!-- Active Loans -->
          <div v-if="activeTab === 'active'">
            <div v-if="activeLoans.length === 0" class="empty-state">
              <div class="empty-state-icon empty-state-icon-active" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
                </svg>
              </div>
              <p>No active loans at the moment.</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in activeLoans" :key="loan.id" class="loan-item active" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">Active</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="approval-progress">
                    <div class="approval-track">
                      <div class="approval-fill" :style="{ width: (getStageIndex(loan.status) / 3) * 100 + '%' }"></div>
                    </div>
                    <div class="approval-stage-text">Stage {{ getStageIndex(loan.status) + 1 }} of 4 • Active repayment</div>
                  </div>
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
                    <p><strong>Purpose:</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>Remaining Balance:</strong> ₱{{ loan.remaining_balance.toLocaleString() }}</p>
                    <p><strong>Total Paid:</strong> ₱{{ loan.total_paid.toLocaleString() }}</p>
                    <p><strong>Due Date:</strong> {{ formatDate(loan.due_date) }}</p>
                  </div>
                </div>
                <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">View Details</button>
              </div>
            </div>
          </div>

          <!-- Rejected Loans -->
          <div v-if="activeTab === 'rejected'">
            <div v-if="rejectedLoans.length === 0" class="empty-state">
              <div class="empty-state-icon empty-state-icon-danger" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="9" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
              </div>
              <p>No rejected applications.</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in rejectedLoans" :key="loan.id" class="loan-item rejected" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">Rejected</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="loan-details">
                    <p><strong>Loan Type:</strong> {{ formatLoanType(loan.loan_type) }}</p>
                    <p><strong>Submitted:</strong> {{ formatDate(loan.application_date) }}</p>
                    <p><strong>Rejected:</strong> {{ formatDate(loan.rejection_date || loan.updated_at) }}</p>
                    <p class="rejection-reason"><strong>Reason:</strong> {{ loan.rejection_reason || 'Not specified' }}</p>
                  </div>
                </div>
                <button class="view-btn" @click="viewLoanDetails(loan)">View Details</button>
              </div>
            </div>
          </div>

          <!-- Overdue Loans -->
          <div v-if="activeTab === 'overdue'">
            <div v-if="overdueLoans.length === 0" class="empty-state">
              <div class="empty-state-icon empty-state-icon-warning" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 9v4" />
                  <path d="M12 17h.01" />
                  <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                </svg>
              </div>
              <p>No overdue loan balances.</p>
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
                    <span class="label">Due Date:</span>
                    <span class="value">{{ loan.due_date }}</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Days Overdue:</span>
                    <span v-if="loan.days_overdue" class="value warning-text">{{ loan.days_overdue }} days</span>
                  </div>
                  <div class="detail-row">
                    <span class="label">Remaining Balance:</span>
                    <span class="value">₱{{ loan.remaining_balance?.toLocaleString() }}</span>
                  </div>
                  <div v-if="loan.penalty_amount > 0" class="detail-row penalty-row">
                    <span class="label">Penalty (1%):</span>
                    <span class="value penalty-amount">₱{{ parseFloat(loan.penalty_amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</span>
                  </div>
                  <div v-if="loan.penalty_amount > 0" class="detail-row total-row">
                    <span class="label"><strong>Total Due with Penalty:</strong></span>
                    <span class="value total-amount"><strong>₱{{ parseFloat(loan.total_with_penalty).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}</strong></span>
                  </div>
                </div>
                <button class="view-btn warning-btn" @click.stop="viewLoanDetails(loan)">View & Pay</button>
              </div>
            </div>
          </div>

          <!-- Completed Loans -->
          <div v-if="activeTab === 'completed'">
            <div v-if="completedLoans.length === 0" class="empty-state">
              <div class="empty-state-icon empty-state-icon-success" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <polyline points="9 15 11 17 15 13" />
                </svg>
              </div>
              <p>No loan applications yet.</p>
            </div>
            <div v-else class="loans-list">
              <div v-for="loan in completedLoans" :key="loan.id" class="loan-item completed" :data-loan-id="loan.id" :class="{ 'notification-highlight': highlightedLoanId == loan.id }">
                <div class="loan-header">
                  <span class="loan-status">Paid</span>
                </div>
                <div class="loan-body">
                  <div class="loan-amount">₱{{ loan.loan_amount.toLocaleString() }}</div>
                  <div class="approval-progress">
                    <div class="approval-track">
                      <div class="approval-fill" :style="{ width: (getStageIndex(loan.status) / 3) * 100 + '%' }"></div>
                    </div>
                    <div class="approval-stage-text">Stage {{ getStageIndex(loan.status) + 1 }} of 4 • Completed</div>
                  </div>
                  <div class="loan-details">
                    <p><strong>Purpose:</strong> {{ formatPurpose(loan.loan_purpose) }}</p>
                    <p><strong>Total Paid:</strong> ₱{{ loan.total_paid.toLocaleString() }}</p>
                    <p><strong>Completed:</strong> {{ formatDate(loan.updated_at) }}</p>
                  </div>
                </div>
                <button class="view-btn secondary-action" @click="viewLoanDetails(loan)">View Details</button>
              </div>
            </div>
          </div>
        </div>
        </div>
      </div>
    </div>

    <!-- Loan Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3>Loan Details</h3>
          <button @click="closeModal" class="close-btn">&times;</button>
        </div>
        <div class="modal-body">
          <!-- Rejected Loan Details -->
          <div v-if="selectedLoan.status === 'rejected'" class="details-grid">
            <div class="detail-item">
              <label>Status</label>
              <p>
                <span class="status-badge rejected">Rejected</span>
              </p>
            </div>
            <div class="detail-item">
              <label>Loan Type</label>
              <p>{{ formatLoanType(selectedLoan.loan_type) }}</p>
            </div>
            <div class="detail-item">
              <label>Loan Amount</label>
              <p class="amount">₱{{ selectedLoan.loan_amount?.toLocaleString() }}</p>
            </div>
            <div class="detail-item">
              <label>Submitted Date</label>
              <p>{{ formatDate(selectedLoan.application_date) }}</p>
            </div>
            <div class="detail-item">
              <label>Rejected Date</label>
              <p>{{ formatDate(selectedLoan.rejection_date || selectedLoan.updated_at) }}</p>
            </div>
            <div class="detail-item full-width">
              <label>Rejection Reason</label>
              <p class="rejection-reason">{{ selectedLoan.rejection_reason || 'Not specified' }}</p>
            </div>
          </div>

          <!-- Other Loan Details (Pending, Approved, Active, Paid) -->
          <div v-else class="details-grid">
            <div class="detail-item">
              <label>Status</label>
              <p>
                <span :class="['status-badge', selectedLoan.status]">
                  {{ selectedLoan.status }}
                </span>
              </p>
            </div>
            <div class="detail-item">
              <label>Loan Amount</label>
              <p class="amount">₱{{ selectedLoan.loan_amount?.toLocaleString() }}</p>
            </div>
            <div class="detail-item">
              <label>Purpose</label>
              <p>{{ formatPurpose(selectedLoan.loan_purpose) }}</p>
            </div>
            <div class="detail-item">
              <label>Payment Term</label>
              <p>{{ selectedLoan.payment_term }} months</p>
            </div>
            <div class="detail-item">
              <label>Interest Rate</label>
              <p>{{ selectedLoan.interest_rate || 0 }}%</p>
            </div>
            <div class="detail-item">
              <label>Application Date</label>
              <p>{{ formatDate(selectedLoan.application_date) }}</p>
            </div>
            <div class="detail-item" v-if="selectedLoan.approval_date">
              <label>Approval Date</label>
              <p>{{ formatDate(selectedLoan.approval_date) }}</p>
            </div>
            <div class="detail-item" v-if="selectedLoan.due_date">
              <label>Due Date</label>
              <p>{{ formatDate(selectedLoan.due_date) }}</p>
            </div>
            <div class="detail-item" v-if="selectedLoan.remaining_balance">
              <label>Remaining Balance</label>
              <p class="amount">₱{{ selectedLoan.remaining_balance?.toLocaleString() }}</p>
            </div>
            <div class="detail-item" v-if="selectedLoan.total_paid">
              <label>Total Paid</label>
              <p class="amount">₱{{ selectedLoan.total_paid?.toLocaleString() }}</p>
            </div>
            <div class="detail-item" v-if="selectedLoan.status === 'overdue' && selectedLoan.penalty_amount > 0" style="background-color: #fff3cd; padding: 10px; border-radius: 4px;">
              <label style="color: #856404;">Overdue penalty</label>
              <p style="color: #856404;">
                <strong>Penalty Amount:</strong> ₱{{ parseFloat(selectedLoan.penalty_amount).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
              </p>
              <p style="color: #856404;">
                <strong>Days Overdue:</strong> {{ selectedLoan.days_overdue }} days
              </p>
              <p style="color: #856404; font-size: 0.9em;">
                <strong>Total with Penalty:</strong> ₱{{ parseFloat(selectedLoan.total_with_penalty || selectedLoan.remaining_balance).toLocaleString(undefined, {minimumFractionDigits: 2, maximumFractionDigits: 2}) }}
              </p>
            </div>
            <div class="detail-item full-width" v-if="selectedLoan.remarks">
              <label>Remarks</label>
              <p>{{ selectedLoan.remarks }}</p>
            </div>
            <div class="detail-item" v-if="loanReceiptNumbers">
              <label>Receipt Number</label>
              <p>{{ loanReceiptNumbers }}</p>
            </div>
          </div>

          <!-- Payment History Section -->
          <div v-if="loanPayments.length > 0" class="payment-history-section">
            <h4>Payment History</h4>
            <table class="payment-history-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Amount</th>
                  <th>Receipt No.</th>
                  <th>Method</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="payment in loanPayments" :key="payment.id">
                  <td>{{ formatDate(payment.payment_date) }}</td>
                  <td class="amount">₱{{ parseFloat(payment.amount).toLocaleString() }}</td>
                  <td>{{ payment.reference_number || '-' }}</td>
                  <td>{{ payment.payment_method || 'Cash' }}</td>
                  <td>{{ payment.remarks || '-' }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="selectedLoan && selectedLoan.status === 'pending'" class="modal-actions officer-pending-actions">
            <button type="button" class="edit-btn primary-action" @click="editLoanFromModal">Edit</button>
            <button
              type="button"
              class="danger-outline-btn"
              :disabled="loading"
              @click="openDeleteConfirm"
            >
              Delete
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Edit Loan Modal -->
    <Teleport to="body">
      <Transition name="loan-modal-fade">
        <div
          v-if="showEditModal"
          class="officer-loan-modal-backdrop"
          @click.self="closeEditModal"
        >
          <div
            class="officer-loan-modal officer-loan-modal--edit"
            :class="{ 'light-theme': isLight }"
            role="dialog"
            aria-labelledby="edit-loan-title"
            @click.stop
          >
            <div class="officer-loan-modal-header">
              <div class="officer-loan-modal-title-wrap">
                <span class="officer-loan-modal-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 20h9" />
                    <path d="M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4L16.5 3.5z" />
                  </svg>
                </span>
                <div>
                  <h3 id="edit-loan-title">Edit Loan Application</h3>
                  <p class="officer-loan-modal-sub">I-update ang detalye ng pending application</p>
                </div>
              </div>
              <button type="button" class="officer-loan-modal-close" aria-label="Close" @click="closeEditModal">×</button>
            </div>
            <div class="officer-loan-modal-body">
              <form @submit.prevent="updateLoan" class="edit-loan-form">
                <div class="form-group">
                  <label for="edit-loan-type">Loan Type</label>
                  <select id="edit-loan-type" v-model="editForm.type" required @change="updateEditMaxAmount">
                    <option value="">Select loan type</option>
                    <option value="agricultural">Agricultural Loan (Max: ₱5,000)</option>
                    <option value="provident">Provident Loan (Max: ₱3,000)</option>
                    <option value="educational">Educational Loan (Max: ₱3,000)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="edit-loan-amount">Loan Amount (₱)</label>
                  <input
                    id="edit-loan-amount"
                    type="number"
                    v-model="editForm.amount"
                    placeholder="Enter amount"
                    required
                    min="500"
                    :max="editMaxAmount"
                    step="100"
                  />
                  <small v-if="editForm.type" class="help-text">
                    Maximum: ₱{{ editMaxAmount.toLocaleString() }} · Interest: 1% · Payment Term: 6 months
                  </small>
                </div>
                <div v-if="editForm.amount" class="edit-amount-summary">
                  <div class="edit-summary-row">
                    <span>Principal</span>
                    <strong>₱{{ parseFloat(editForm.amount).toLocaleString() }}</strong>
                  </div>
                  <div class="edit-summary-row">
                    <span>Interest (1%)</span>
                    <strong>₱{{ (parseFloat(editForm.amount) * 0.01).toLocaleString() }}</strong>
                  </div>
                  <div class="edit-summary-row edit-summary-total">
                    <span>Total to Pay</span>
                    <strong>₱{{ (parseFloat(editForm.amount) * 1.01).toLocaleString() }}</strong>
                  </div>
                </div>
                <div class="form-group">
                  <label for="edit-loan-purpose">Purpose (Optional)</label>
                  <input
                    id="edit-loan-purpose"
                    type="text"
                    v-model="editForm.purpose"
                    placeholder="Enter loan purpose"
                    maxlength="200"
                  />
                </div>
                <div class="officer-loan-modal-actions">
                  <button type="button" class="officer-loan-modal-btn secondary" @click="closeEditModal">Cancel</button>
                  <button type="submit" class="officer-loan-modal-btn primary" :disabled="loading">
                    {{ loading ? 'Updating…' : 'Update Loan' }}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Toast notification -->
    <Transition name="loan-toast-fade">
      <div
        v-if="toastMessage"
        class="loan-toast"
        :class="toastType"
        role="status"
        aria-live="polite"
      >
        <span class="loan-toast-icon" aria-hidden="true">
          <svg v-if="toastType === 'success'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
            <polyline points="22 4 12 14.01 9 11.01" />
          </svg>
          <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </span>
        <span class="loan-toast-text">{{ toastMessage }}</span>
        <button type="button" class="loan-toast-close" aria-label="Dismiss" @click="clearToast">×</button>
      </div>
    </Transition>

    <!-- Success summary modal (replaces browser alert) -->
    <Teleport to="body">
      <Transition name="loan-modal-fade">
        <div
          v-if="showSuccessModal"
          class="loan-notice-backdrop"
          @click.self="closeSuccessModal"
        >
          <div
            class="loan-notice-modal"
            :class="{ 'light-theme': isLight }"
            role="dialog"
            aria-labelledby="loan-success-title"
          >
            <div class="loan-notice-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
                <polyline points="22 4 12 14.01 9 11.01" />
              </svg>
            </div>
            <h3 id="loan-success-title" class="loan-notice-title">{{ successModal.title }}</h3>
            <p class="loan-notice-sub">Narito ang buod ng inyong loan application:</p>
            <div class="loan-notice-details">
              <div class="loan-notice-row">
                <span>Principal</span>
                <strong>₱{{ successModal.principal.toLocaleString() }}</strong>
              </div>
              <div class="loan-notice-row">
                <span>Interest (1%)</span>
                <strong>₱{{ successModal.interest.toLocaleString() }}</strong>
              </div>
              <div class="loan-notice-row loan-notice-row-total">
                <span>Total to Pay</span>
                <strong>₱{{ successModal.total.toLocaleString() }}</strong>
              </div>
              <div class="loan-notice-row">
                <span>Payment Term</span>
                <strong>{{ successModal.paymentTerm }} months</strong>
              </div>
            </div>
            <p v-if="successModal.footnote" class="loan-notice-foot">{{ successModal.footnote }}</p>
            <button type="button" class="loan-notice-btn" @click="closeSuccessModal">OK, naintindihan ko</button>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Delete confirmation modal (replaces browser confirm) -->
    <Teleport to="body">
      <Transition name="loan-modal-fade">
        <div
          v-if="showDeleteConfirmModal"
          class="loan-notice-backdrop"
          @click.self="closeDeleteConfirm"
        >
          <div
            class="loan-delete-confirm-modal"
            :class="{ 'light-theme': isLight }"
            role="alertdialog"
            aria-labelledby="loan-delete-title"
            aria-describedby="loan-delete-desc"
            @click.stop
          >
            <div class="loan-delete-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </div>
            <h3 id="loan-delete-title" class="loan-delete-title">Delete Loan Application?</h3>
            <p id="loan-delete-desc" class="loan-delete-message">
              Are you sure you want to delete this loan application?
            </p>
            <p class="loan-delete-warning">This action cannot be undone.</p>
            <div class="loan-delete-actions">
              <button
                type="button"
                class="loan-delete-cancel"
                :disabled="deleteInProgress"
                @click="closeDeleteConfirm"
              >
                Cancel
              </button>
              <button
                type="button"
                class="loan-delete-btn"
                :disabled="deleteInProgress"
                @click="confirmDeleteLoan"
              >
                {{ deleteInProgress ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import { useRoute } from 'vue-router'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import LoanApplyIcon from '../components/icons/LoanApplyIcon.vue'
import LoanApplicationsIcon from '../components/icons/LoanApplicationsIcon.vue'

const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const authStore = useAuthStore()
const route = useRoute()

const highlightedLoanId = ref(null)

const toastMessage = ref('')
const toastType = ref('success')
let toastTimer = null

const showSuccessModal = ref(false)
const showDeleteConfirmModal = ref(false)
const deleteInProgress = ref(false)
const successModal = ref({
  title: '',
  principal: 0,
  interest: 0,
  total: 0,
  paymentTerm: 0,
  footnote: ''
})

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toastMessage.value = ''
  }, 4500)
}

const clearToast = () => {
  toastMessage.value = ''
  if (toastTimer) clearTimeout(toastTimer)
}

const openLoanSuccessModal = (title, details, footnote = '') => {
  successModal.value = {
    title,
    principal: Number(details?.principal || 0),
    interest: Number(details?.interest || 0),
    total: Number(details?.total || 0),
    paymentTerm: Number(details?.payment_term || 0),
    footnote
  }
  showSuccessModal.value = true
}

const closeSuccessModal = () => {
  showSuccessModal.value = false
}

const pageTitle = computed(() => {
  const role = authStore.currentUser?.role
  if (role === 'treasurer') return 'My Loans (Treasurer)'
  if (role === 'president') return 'My Loans (President)'
  if (role === 'operation_manager') return 'My Loans (Operation Manager)'
  if (role === 'business_manager') return 'My Loans (Business Manager)'
  if (role === 'operator') return 'My Loans (Operator)'
  return 'My Loans'
})

const approvalDescription = computed(() => {
  const role = authStore.currentUser?.role
  if (role === 'farmer') return 'Your loan will be reviewed by the President and Treasurer.'
  if (role === 'treasurer') return 'Your loan will be reviewed by the President.'
  if (role === 'president') return 'Your loan will be reviewed by the Treasurer.'
  if (['operation_manager', 'business_manager', 'operator'].includes(role)) {
    return 'Your loan will be reviewed by the Treasurer.'
  }
  return 'Your loan will be reviewed by the approving officer.'
})

const apiAuthHeaders = () => ({
  Authorization: `Bearer ${authStore.token}`
})

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
  await loadLoans()
  checkEligibility()

  // Handle notification highlight
  if (route.query.highlight && route.query.type === 'loan') {
    highlightedLoanId.value = route.query.highlight
    // Find which tab the loan is in and switch to it
    const loan = allLoans.value.find(l => l.id == route.query.highlight)
    if (loan) {
      activeTab.value = loan.status === 'paid' ? 'completed' : loan.status
    }
    await nextTick()
    // Scroll the highlighted loan into view
    setTimeout(() => {
      const el = document.querySelector(`[data-loan-id="${route.query.highlight}"]`)
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
      // Remove highlight after 6 seconds
      setTimeout(() => { highlightedLoanId.value = null }, 6000)
    }, 300)
  }
})

onUnmounted(() => {
  if (toastTimer) clearTimeout(toastTimer)
})

const checkEligibility = async () => {
  try {
    const farmerId = authStore.currentUser?.id
    if (!farmerId) return
    
    const response = await fetch(`http://localhost:3000/api/loans/eligibility/${farmerId}`, {
      headers: apiAuthHeaders()
    })
    if (response.ok) {
      const data = await response.json()
      canApplyLoan.value = data.allowed
      if (!data.allowed) {
        eligibilityMessage.value = data.reason
      } else {
        eligibilityMessage.value = 'You are eligible to apply for a loan.'
      }
    }
  } catch (error) {
    console.error('Error checking eligibility:', error)
  }
}

// Helper to get device date string for API calls
const getDeviceDate = () => {
  const d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

const loadLoans = async () => {
  loading.value = true
  try {
    const farmerId = authStore.currentUser?.id
    if (!farmerId) {
      console.error('No farmer ID found')
      return
    }

    const response = await fetch(`http://localhost:3000/api/loans?farmer_id=${farmerId}&deviceDate=${getDeviceDate()}`, {
      headers: apiAuthHeaders()
    })
    if (response.ok) {
      const data = await response.json()
      allLoans.value = data.loans || []
      console.log('Loaded loans:', allLoans.value)
    }
  } catch (error) {
    console.error('Error loading loans:', error)
  } finally {
    loading.value = false
  }
}

const submitLoanApplication = async () => {
  if (!authStore.currentUser || !authStore.currentUser.id) {
    showToast('Please log in to apply for a loan', 'error')
    return
  }
  
  if (!loanForm.value.type) {
    showToast('Please select a loan type', 'error')
    return
  }
  
  if (!loanForm.value.amount || parseFloat(loanForm.value.amount) <= 0) {
    showToast('Please enter a valid loan amount', 'error')
    return
  }
  
  if (parseFloat(loanForm.value.amount) > maxLoanAmount.value) {
    showToast(`Loan amount cannot exceed ₱${maxLoanAmount.value.toLocaleString()} for ${loanForm.value.type} loan`, 'error')
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
    
    const response = await fetch('http://localhost:3000/api/loans', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(loanData)
    })
    
    const result = await response.json()
    console.log('Loan application response:', result)
    
    if (response.ok) {
      openLoanSuccessModal(
        'Loan application submitted!',
        result.details,
        approvalDescription.value
      )
      loanForm.value = {
        type: '',
        amount: '',
        purpose: ''
      }
      activeTab.value = 'pending'
      await loadLoans()
      await checkEligibility()
    } else {
      showToast(result.message || 'Failed to submit loan application', 'error')
    }
  } catch (error) {
    console.error('Error submitting loan:', error)
    showToast('Failed to submit loan application: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const loanPayments = ref([])

const loanReceiptNumbers = computed(() => {
  if (loanPayments.value.length === 0) return ''
  const receipts = loanPayments.value
    .map(p => p.reference_number)
    .filter(Boolean)
  return receipts.length > 0 ? receipts.join(', ') : ''
})

const viewLoanDetails = async (loan) => {
  selectedLoan.value = loan
  loanPayments.value = []
  showDetailsModal.value = true

  // Fetch updated loan details including penalties
  try {
    const response = await fetch(`http://localhost:3000/api/loans/${loan.id}?deviceDate=${getDeviceDate()}`, {
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
  showDetailsModal.value = false
  selectedLoan.value = {}
}

// Auto-refresh loan details every 5 seconds when modal is open to show updated penalties
let autoRefreshInterval = null
watch(showDetailsModal, (isOpen) => {
  if (isOpen && selectedLoan.value.id) {
    // Start auto-refresh
    autoRefreshInterval = setInterval(async () => {
      try {
        const response = await fetch(`http://localhost:3000/api/loans/${selectedLoan.value.id}?deviceDate=${getDeviceDate()}`, {
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

const editLoanFromModal = () => {
  const loan = selectedLoan.value
  if (!loan?.id) return
  closeModal()
  nextTick(() => editLoan(loan))
}

const openDeleteConfirm = () => {
  if (!selectedLoan.value?.id) return
  showDeleteConfirmModal.value = true
}

const closeDeleteConfirm = () => {
  if (deleteInProgress.value) return
  showDeleteConfirmModal.value = false
}

const confirmDeleteLoan = async () => {
  const id = selectedLoan.value?.id
  if (!id) return

  deleteInProgress.value = true
  try {
    const response = await fetch(`http://localhost:3000/api/loans/${id}`, {
      method: 'DELETE',
      headers: apiAuthHeaders()
    })
    const result = await response.json()
    if (response.ok) {
      showToast('Loan application deleted successfully.')
      showDeleteConfirmModal.value = false
      closeModal()
      await loadLoans()
      await checkEligibility()
    } else {
      showToast(result.message || 'Failed to delete loan application', 'error')
    }
  } catch (error) {
    console.error('Error deleting loan:', error)
    showToast('Failed to delete loan application: ' + error.message, 'error')
  } finally {
    deleteInProgress.value = false
  }
}

const updateLoan = async () => {
  if (!editForm.value.type) {
    showToast('Please select a loan type', 'error')
    return
  }
  
  if (!editForm.value.amount || parseFloat(editForm.value.amount) <= 0) {
    showToast('Please enter a valid loan amount', 'error')
    return
  }
  
  if (parseFloat(editForm.value.amount) > editMaxAmount.value) {
    showToast(`Loan amount cannot exceed ₱${editMaxAmount.value.toLocaleString()} for ${editForm.value.type} loan`, 'error')
    return
  }
  
  loading.value = true
  try {
    const loanData = {
      loan_amount: parseFloat(editForm.value.amount),
      loan_type: editForm.value.type,
      loan_purpose: editForm.value.purpose || `${editForm.value.type} loan`
    }
    
    const response = await fetch(`http://localhost:3000/api/loans/${editForm.value.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authStore.token}`
      },
      body: JSON.stringify(loanData)
    })
    
    const result = await response.json()
    
    if (response.ok) {
      openLoanSuccessModal('Loan updated successfully!', result.details)
      closeEditModal()
      await loadLoans()
    } else {
      showToast(result.message || 'Failed to update loan application', 'error')
    }
  } catch (error) {
    console.error('Error updating loan:', error)
    showToast('Failed to update loan application: ' + error.message, 'error')
  } finally {
    loading.value = false
  }
}

const formatLoanType = (type) => {
  if (!type) return 'N/A'
  return type.charAt(0).toUpperCase() + type.slice(1) + ' Loan'
}

const getStageIndex = (status) => {
  const stageMap = {
    pending: 1,
    approved: 2,
    active: 3,
    overdue: 3,
    paid: 3,
    rejected: 1
  }
  return stageMap[status] ?? 1
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

/* Notification highlight animation */
.notification-highlight {
  animation: highlightPulse 2s ease-in-out 3;
  border: 2px solid #ef4444 !important;
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.3) !important;
  position: relative;
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

.page-header {
  margin-bottom: 2rem;
}

.page-title {
  font-size: 2rem;
  font-weight: 700;
  color: #1e293b;
  margin-bottom: 0.5rem;
}

.page-subtitle {
  color: #64748b;
  font-size: 1rem;
}

/* Alert messages */
.alert {
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  font-size: 0.95rem;
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
  margin-top: 0.5rem;
  color: #64748b;
  font-size: 0.85rem;
}

.calculation-text {
  display: block;
  margin-top: 0.5rem;
  color: #059669;
  font-size: 0.9rem;
  font-weight: 500;
}

/* Loan info box */
.loan-info-box {
  background-color: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1rem;
}

.loan-info-box h4 {
  color: #0369a1;
  font-size: 1rem;
  margin-bottom: 0.75rem;
}

.loan-info-box ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.loan-info-box li {
  padding: 0.4rem 0;
  color: #475569;
  font-size: 0.9rem;
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

.stat-icon {
  font-size: 2rem;
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
  margin-bottom: 1.5rem;
}

/* Loan Form */
.loan-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
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

.modal-content {
  background: white;
  border-radius: 12px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
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
  .content-grid {
    grid-template-columns: 1fr;
  }

  .stats-grid {
    grid-template-columns: repeat(2, 1fr);
  }

  .tabs {
    flex-wrap: wrap;
  }

  .page-container {
    padding: 1rem;
  }
  
  .loan-actions {
    flex-direction: column;
    width: 100%;
  }
  
  .loan-actions button {
    width: 100%;
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
  color: #2f855a;
  font-weight: 600;
}

/* ===== Modern Glass Redesign (Loan page shell) ===== */
.page-container {
  position: relative;
  isolation: isolate;
  min-height: 100vh;
  background: linear-gradient(145deg, #0f1712 0%, #132119 28%, #1f3627 64%, #2a4735 100%);
  border-radius: 20px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  padding: 1.75rem 1.85rem 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.35rem;
}

.page-container > * {
  position: relative;
  z-index: 1;
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
  z-index: 5000 !important;
}

.page-header.glass-header {
  margin-bottom: 0;
}

.glass-header {
  background: linear-gradient(135deg, rgba(167, 243, 198, 0.18) 0%, rgba(255, 255, 255, 0.1) 100%);
  border: 1px solid rgba(255, 255, 255, 0.22);
  box-shadow: 0 14px 30px rgba(6, 12, 9, 0.35), inset 0 1px 0 rgba(255, 255, 255, 0.16);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-radius: 24px;
  padding: 1.35rem 1.6rem;
  margin-bottom: 0;
}

.glass-header .header-content {
  max-width: none;
  margin-left: 0 !important;
  margin-right: auto !important;
  padding: 0;
  display: block;
  align-items: flex-start;
  text-align: left;
}

.card-title-with-icon {
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.card-title-icon {
  width: 38px;
  height: 38px;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(145deg, rgba(134, 239, 172, 0.55), rgba(74, 222, 128, 0.42));
  border: 1px solid rgba(74, 222, 128, 0.45);
  color: #052e16;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 4px 12px rgba(6, 78, 59, 0.28);
}

.card-title-icon-list {
  background: linear-gradient(145deg, rgba(147, 197, 253, 0.55), rgba(96, 165, 250, 0.42));
  border-color: rgba(59, 130, 246, 0.45);
  color: #1e3a8a;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.14),
    0 4px 12px rgba(30, 64, 175, 0.28);
}

.card-title-icon :deep(svg),
.card-title-icon :deep(svg *) {
  display: block;
  stroke: currentColor;
  filter: drop-shadow(0 1px 2px rgba(3, 12, 8, 0.2));
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
  margin: 0;
}

.page-subtitle {
  color: rgba(220, 252, 231, 0.78);
}

.stats-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 0;
}

.stat-card-clickable {
  cursor: pointer;
  font: inherit;
  text-align: left;
  width: 100%;
  appearance: none;
  -webkit-appearance: none;
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.stat-card-clickable:focus-visible {
  outline: 2px solid rgba(134, 239, 172, 0.85);
  outline-offset: 2px;
}

.stat-card-active {
  border-color: rgba(167, 243, 198, 0.65) !important;
  box-shadow: 0 14px 28px rgba(5, 11, 8, 0.38), 0 0 0 1px rgba(74, 222, 128, 0.35), 0 0 20px rgba(74, 222, 128, 0.18);
}

.stat-content {
  min-width: 0;
  flex: 1;
}

.stat-card {
  background: linear-gradient(140deg, rgba(167, 243, 198, 0.2) 0%, rgba(255, 255, 255, 0.08) 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 18px;
  box-shadow: 0 10px 22px rgba(5, 11, 8, 0.28);
  border-left: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1.1rem 1rem;
  transition: transform 220ms ease, box-shadow 220ms ease, border-color 220ms ease;
}

.stat-card:hover {
  transform: scale(1.03);
  border-color: rgba(167, 243, 198, 0.55);
  box-shadow: 0 14px 28px rgba(5, 11, 8, 0.38), 0 0 20px rgba(74, 222, 128, 0.18);
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
  transition: transform 220ms ease;
}

.stat-card:hover .stat-icon-wrap {
  transform: translateY(-1px);
}

.stat-icon-wrap svg {
  width: 1.25rem;
  height: 1.25rem;
  display: block;
}

.stat-card.pending .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(251, 191, 36, 0.55), rgba(217, 119, 6, 0.48));
  color: #78350f;
  border-color: rgba(180, 83, 9, 0.45);
}

.stat-card.approved .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.5), rgba(22, 163, 74, 0.45));
  color: #052e16;
  border-color: rgba(21, 128, 61, 0.45);
}

.stat-card.active .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.5), rgba(37, 99, 235, 0.45));
  color: #1e3a8a;
  border-color: rgba(29, 78, 216, 0.45);
}

.stat-card.rejected .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(252, 165, 165, 0.5), rgba(220, 38, 38, 0.45));
  color: #7f1d1d;
  border-color: rgba(185, 28, 28, 0.45);
}

.stat-icon-wrap svg,
.stat-icon-wrap svg * {
  stroke: currentColor;
  fill: none;
}

.stat-card.pending .stat-icon-wrap svg,
.stat-card.pending .stat-icon-wrap svg * {
  color: #78350f;
  stroke: #78350f;
}

.stat-card.approved .stat-icon-wrap svg,
.stat-card.approved .stat-icon-wrap svg * {
  color: #052e16;
  stroke: #052e16;
}

.stat-card.active .stat-icon-wrap svg,
.stat-card.active .stat-icon-wrap svg * {
  color: #1e3a8a;
  stroke: #1e3a8a;
}

.stat-card.rejected .stat-icon-wrap svg,
.stat-card.rejected .stat-icon-wrap svg * {
  color: #7f1d1d;
  stroke: #7f1d1d;
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
}

.content-grid {
  grid-template-columns: minmax(300px, 1fr) minmax(380px, 1.15fr);
  gap: 1.35rem;
  align-items: stretch;
  flex: 1;
}

.card {
  background: linear-gradient(145deg, rgba(16, 44, 31, 0.86), rgba(13, 37, 27, 0.82));
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 22px;
  box-shadow: 0 16px 30px rgba(4, 9, 7, 0.34);
  padding: 1.35rem 1.4rem;
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.card-head {
  flex-shrink: 0;
  padding-bottom: 1rem;
  margin-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.card-body {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.loans-card-body {
  gap: 0;
}

.card-title {
  color: #ecfdf5;
  font-weight: 800;
  margin-bottom: 0.85rem;
}

.card-head .card-title {
  margin-bottom: 0.85rem;
}

.alert-info {
  background: rgba(14, 116, 144, 0.22);
  color: #e0f2fe;
  border: 1px solid rgba(56, 189, 248, 0.35);
  border-left: 4px solid #38bdf8;
  border-radius: 12px;
}

.alert-with-icon {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
}

.alert-icon {
  width: 1.15rem;
  height: 1.15rem;
  flex-shrink: 0;
  margin-top: 0.1rem;
  color: inherit;
}

.alert-icon,
.alert-icon * {
  stroke: currentColor;
}

.alert-warning .alert-icon {
  color: #b45309;
}

.alert-info .alert-icon {
  color: #1d4ed8;
}

.alert-warning {
  border-radius: 12px;
  background: rgba(180, 83, 9, 0.22);
  color: #fef3c7;
  border: 1px solid rgba(251, 191, 36, 0.35);
  border-left: 4px solid #f59e0b;
}

.loan-form {
  gap: 0.9rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.form-row-two {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.85rem;
}

.form-group-full {
  margin-bottom: 0;
}

.amount-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  padding: 0.65rem 0.85rem;
  border-radius: 10px;
  background: rgba(8, 30, 22, 0.55);
  border: 1px solid rgba(134, 239, 172, 0.22);
  font-size: 0.82rem;
  color: rgba(220, 252, 231, 0.88);
}

.amount-summary strong {
  color: #86efac;
  font-weight: 800;
}

.amount-summary .amount-total strong {
  color: #bbf7d0;
}

.form-actions {
  margin-top: auto;
  padding-top: 0.35rem;
}

.form-actions .submit-btn {
  width: 100%;
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
  color: #16a34a;
  font-size: 14px;
  font-weight: 700;
  pointer-events: none;
  z-index: 2;
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.field-icon svg,
.field-icon svg * {
  width: 100%;
  height: 100%;
  display: block;
  stroke: currentColor;
}

.loan-form .form-group input,
.loan-form .form-group select {
  padding: 0.96rem 0.92rem 0.96rem 2.3rem;
  border-radius: 12px;
  border: 1px solid rgba(134, 239, 172, 0.28);
  background: rgba(8, 30, 22, 0.52);
  color: #ecfdf5;
  font-size: 0.98rem;
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
  background: rgba(8, 30, 22, 0.48);
  border: 1px solid rgba(134, 239, 172, 0.25);
  border-radius: 12px;
  padding: 0.8rem 0.9rem;
  margin-bottom: 0;
}

.loan-info-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.55rem;
  color: #bbf7d0;
  font-size: 0.88rem;
  font-weight: 700;
}

.loan-info-icon {
  width: 1.1rem;
  height: 1.1rem;
  flex-shrink: 0;
  color: #16a34a;
}

.terms-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.3rem 0.75rem;
  list-style: none;
  padding: 0;
  margin: 0;
}

.terms-grid li {
  padding: 0.2rem 0 0.2rem 0.75rem;
  font-size: 0.78rem;
  color: rgba(220, 252, 231, 0.85);
  position: relative;
  line-height: 1.4;
}

.terms-grid li::before {
  content: '•';
  position: absolute;
  left: 0;
  color: #86efac;
  font-weight: 700;
}

.terms-grid li strong {
  color: #bbf7d0;
}

.terms-grid .terms-full {
  grid-column: 1 / -1;
  padding-top: 0.15rem;
}

.submit-btn {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  border-radius: 12px;
  padding: 1rem 1rem;
  font-size: 0.98rem;
  font-weight: 800;
  transition: transform 180ms ease, box-shadow 220ms ease, filter 220ms ease;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.55rem;
}

.submit-btn-icon {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
}

.submit-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  transform: translateY(-1px);
  box-shadow: 0 10px 22px rgba(22, 163, 74, 0.34);
  filter: brightness(1.02);
}

.tabs-wrap {
  margin-bottom: 0.85rem;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: thin;
}

.tabs {
  border-bottom: none;
  gap: 0.5rem;
  padding-bottom: 0.25rem;
  margin-bottom: 0;
  flex-wrap: nowrap;
  min-width: min-content;
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

.tab-inner {
  display: inline-flex;
  align-items: center;
  gap: 0.42rem;
}

.tab-icon {
  width: 0.95rem;
  height: 0.95rem;
  flex-shrink: 0;
  opacity: 1;
  color: inherit;
}

.tab-icon,
.tab-icon * {
  stroke: currentColor;
}

.tab:not(.active) .tab-icon {
  opacity: 1;
}

.tab-pending:not(.active) .tab-icon {
  color: #b45309;
}

.tab-approved:not(.active) .tab-icon {
  color: #15803d;
}

.tab-repaying:not(.active) .tab-icon {
  color: #1d4ed8;
}

.tab-rejected:not(.active) .tab-icon {
  color: #b91c1c;
}

.tab-completed:not(.active) .tab-icon {
  color: #047857;
}

.tab-overdue:not(.active) .tab-icon {
  color: #c2410c;
}

.tab.active .tab-icon {
  color: #052e16;
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

.application-steps {
  display: flex;
  align-items: center;
  gap: 0;
  margin: 0;
}

.step-chip {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  padding: 0.55rem 0.4rem;
  border-radius: 12px;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(220, 252, 231, 0.75);
  background: rgba(16, 56, 39, 0.45);
  border: 1px solid rgba(134, 239, 172, 0.2);
  text-align: center;
  min-width: 0;
}

.step-connector {
  width: 1.25rem;
  height: 2px;
  flex-shrink: 0;
  background: rgba(134, 239, 172, 0.28);
  margin: 0 -0.15rem;
  align-self: center;
  margin-top: -1.1rem;
}

.step-label {
  line-height: 1.25;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}

.step-num {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.72rem;
  font-weight: 800;
  background: rgba(220, 252, 231, 0.15);
  color: #dcfce7;
  flex-shrink: 0;
}

.step-chip.active {
  background: rgba(22, 163, 74, 0.4);
  border-color: rgba(187, 247, 208, 0.5);
  color: #ecfdf5;
}

.step-chip.active .step-num {
  background: rgba(187, 247, 208, 0.35);
  color: #052e16;
}

.tab-content {
  flex: 1;
  min-height: 300px;
  display: flex;
  flex-direction: column;
}

.tab-content > div {
  flex: 1;
  display: flex;
  flex-direction: column;
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
  color: #16a34a;
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

.approval-progress {
  margin-bottom: 0.75rem;
}

.approval-track {
  width: 100%;
  height: 7px;
  border-radius: 999px;
  background: #dbe7df;
  overflow: hidden;
  margin-bottom: 0.3rem;
}

.approval-fill {
  height: 100%;
  background: linear-gradient(90deg, #16a34a 0%, #22c55e 100%);
  transition: width 240ms ease;
}

.approval-fill.rejected-fill {
  background: linear-gradient(90deg, #f97316 0%, #ef4444 100%);
}

.approval-stage-text {
  font-size: 0.92rem;
  color: #000000;
  font-weight: 700;
}

.modal-content {
  background: #ffffff !important;
  border: 1px solid #bbf7d0;
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .modal-content {
  background: linear-gradient(145deg, rgba(22, 44, 32, 0.99), rgba(14, 33, 23, 0.99)) !important;
  border: 1px solid rgba(134, 239, 172, 0.32) !important;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .modal-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .modal-header h3 {
  color: #ecfdf5 !important;
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .close-btn {
  color: rgba(220, 252, 231, 0.75);
  background: rgba(255, 255, 255, 0.08);
  border-radius: 8px;
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .close-btn:hover {
  color: #ffffff;
  background: rgba(255, 255, 255, 0.14);
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .detail-item {
  background: rgba(0, 0, 0, 0.24);
  border-color: rgba(126, 184, 145, 0.22);
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .detail-item label {
  color: rgba(220, 252, 231, 0.65) !important;
}

.page-container.officer-loans-page:not(.light-theme) .modal-overlay .detail-item p {
  color: #ecfdf5 !important;
}

.modal-header h3 {
  color: #14532d !important;
  font-size: 1.35rem;
  font-weight: 800;
}

.details-grid {
  gap: 1rem;
}

.detail-item {
  background: #f8fffb;
  border: 1px solid #dcfce7;
  border-radius: 10px;
  padding: 0.7rem 0.8rem;
}

.detail-item label {
  color: #166534 !important;
  font-size: 0.9rem;
  font-weight: 700;
}

.detail-item p {
  color: #0f172a !important;
  font-size: 1.06rem;
  font-weight: 700;
}

.detail-item .amount {
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
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  flex: 1;
  min-height: 300px;
  color: rgba(220, 252, 231, 0.86);
  gap: 0.65rem;
  padding: 1.5rem;
  border-radius: 16px;
  background: rgba(8, 30, 22, 0.35);
  border: 1px dashed rgba(134, 239, 172, 0.2);
}

.empty-state-icon {
  width: 56px;
  height: 56px;
  border-radius: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(134, 239, 172, 0.28), rgba(74, 222, 128, 0.18));
  border: 1px solid rgba(74, 222, 128, 0.28);
  color: #14532d;
}

.empty-state-icon svg,
.empty-state-icon svg * {
  width: 1.55rem;
  height: 1.55rem;
  display: block;
  stroke: currentColor;
}

.empty-state-icon-success {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.32), rgba(22, 163, 74, 0.24));
  border-color: rgba(21, 128, 61, 0.35);
  color: #14532d;
}

.empty-state-icon-active {
  background: linear-gradient(135deg, rgba(147, 197, 253, 0.32), rgba(37, 99, 235, 0.24));
  border-color: rgba(29, 78, 216, 0.35);
  color: #1e3a8a;
}

.empty-state-icon-danger {
  background: linear-gradient(135deg, rgba(252, 165, 165, 0.32), rgba(220, 38, 38, 0.24));
  border-color: rgba(185, 28, 28, 0.35);
  color: #7f1d1d;
}

.empty-state-icon-warning {
  background: linear-gradient(135deg, rgba(253, 186, 116, 0.32), rgba(217, 119, 6, 0.24));
  border-color: rgba(180, 83, 9, 0.35);
  color: #92400e;
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
  margin-top: 1rem;
  flex-wrap: wrap;
}

.officer-pending-actions {
  justify-content: flex-start;
  padding-top: 0.5rem;
  border-top: 1px solid #e2e8f0;
}

.danger-outline-btn {
  padding: 0.52rem 1.1rem;
  border-radius: 10px;
  border: 1px solid #b91c1c;
  background: #fff1f2;
  color: #991b1b;
  font-weight: 700;
  cursor: pointer;
  transition: background 0.2s, border-color 0.2s;
}

.danger-outline-btn:hover:not(:disabled) {
  background: #fee2e2;
  border-color: #991b1b;
}

.danger-outline-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-btn {
  padding: 0.65rem 1.2rem;
  border-radius: 10px;
  border: 1px solid #cbd5e1;
  background: #fff;
  color: #334155;
  font-weight: 600;
  cursor: pointer;
}

.cancel-btn:hover {
  background: #f8fafc;
}

/* Edit loan modal — teleported glass panel */
.officer-loan-modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 6500;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(6, 12, 9, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.officer-loan-modal {
  width: min(560px, 100%);
  max-height: min(92vh, 720px);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  border-radius: 20px;
  border: 1px solid rgba(134, 239, 172, 0.35);
  background: linear-gradient(145deg, rgba(22, 44, 32, 0.99), rgba(14, 33, 23, 0.99));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  color: #ffffff;
}

.officer-loan-modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  padding: 1.2rem 1.35rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.officer-loan-modal-title-wrap {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.officer-loan-modal-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(74, 222, 128, 0.16);
  border: 1px solid rgba(134, 239, 172, 0.35);
  color: #86efac;
}

.officer-loan-modal-icon svg {
  width: 1.15rem;
  height: 1.15rem;
  stroke: currentColor;
}

.officer-loan-modal-header h3 {
  margin: 0 0 0.2rem;
  font-size: 1.2rem;
  font-weight: 800;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  line-height: 1.3;
}

.officer-loan-modal-sub {
  margin: 0;
  font-size: 0.84rem;
  color: #ffffff;
  line-height: 1.4;
}

.officer-loan-modal-close {
  width: 2.25rem;
  height: 2.25rem;
  border: none;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(220, 252, 231, 0.85);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  flex-shrink: 0;
}

.officer-loan-modal-close:hover {
  background: rgba(255, 255, 255, 0.14);
  color: #ffffff;
}

.officer-loan-modal-body {
  padding: 1.2rem 1.35rem 1.35rem;
  overflow-y: auto;
}

.officer-loan-modal .edit-loan-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.officer-loan-modal .edit-loan-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.officer-loan-modal .edit-loan-form .form-group label {
  font-size: 0.88rem;
  font-weight: 700;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.officer-loan-modal .edit-loan-form .form-group input,
.officer-loan-modal .edit-loan-form .form-group select {
  width: 100%;
  box-sizing: border-box;
  padding: 0.8rem 0.9rem !important;
  border-radius: 12px !important;
  border: 1px solid rgba(134, 239, 172, 0.28) !important;
  background: rgba(8, 30, 22, 0.55) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-size: 0.95rem;
}

.officer-loan-modal .edit-loan-form .form-group select option {
  background: #142e22;
  color: #ffffff;
}

.officer-loan-modal .edit-loan-form .form-group input::placeholder {
  color: rgba(255, 255, 255, 0.55);
  -webkit-text-fill-color: rgba(255, 255, 255, 0.55);
}

.officer-loan-modal .edit-loan-form .form-group input:focus,
.officer-loan-modal .edit-loan-form .form-group select:focus {
  outline: none;
  border-color: rgba(110, 231, 183, 0.85) !important;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15) !important;
}

.officer-loan-modal .edit-loan-form .help-text {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-size: 0.8rem;
  line-height: 1.4;
  opacity: 0.9;
}

.edit-amount-summary {
  padding: 0.8rem 0.9rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(134, 239, 172, 0.22);
}

.edit-summary-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.3rem 0;
  font-size: 0.88rem;
  color: #ffffff;
}

.edit-summary-row strong {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  font-weight: 800;
}

.edit-summary-total {
  margin-top: 0.25rem;
  padding-top: 0.5rem;
  border-top: 1px solid rgba(134, 239, 172, 0.2);
}

.edit-summary-total strong {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  font-size: 1rem;
}

.officer-loan-modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.officer-loan-modal-btn {
  padding: 0.68rem 1.15rem;
  border-radius: 11px;
  font-size: 0.92rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid rgba(190, 235, 203, 0.28);
  transition: transform 0.18s ease, filter 0.18s ease, background 0.18s ease;
}

.officer-loan-modal-btn.primary {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1px solid rgba(190, 235, 203, 0.28) !important;
  box-shadow: none !important;
  filter: none !important;
}

.officer-loan-modal-btn.primary:hover:not(:disabled) {
  transform: translateY(-1px) !important;
  background: rgba(255, 255, 255, 0.14) !important;
  filter: none !important;
  box-shadow: none !important;
}

.officer-loan-modal-btn.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.officer-loan-modal-btn.secondary {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1px solid rgba(190, 235, 203, 0.28) !important;
  box-shadow: none !important;
  filter: none !important;
}

.officer-loan-modal-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.14) !important;
  box-shadow: none !important;
  filter: none !important;
}

.officer-loan-modal.light-theme {
  background: linear-gradient(165deg, #ffffff 0%, #f7fdf9 42%, #ecfdf5 100%);
  border: 2px solid #4ade80;
  color: #052e16;
  box-shadow:
    0 24px 48px rgba(22, 101, 52, 0.16),
    0 8px 20px rgba(22, 101, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.officer-loan-modal-backdrop:has(.officer-loan-modal.light-theme) {
  background: rgba(236, 253, 245, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.officer-loan-modal.light-theme .officer-loan-modal-header {
  position: relative;
  overflow: hidden;
  padding: 1.35rem 1.4rem;
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 48%, #bbf7d0 100%);
  border-bottom: 2px solid #86efac;
}

.officer-loan-modal.light-theme .officer-loan-modal-header::before {
  content: '';
  position: absolute;
  top: -40%;
  right: -8%;
  width: 140px;
  height: 140px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.28) 0%, transparent 68%);
  pointer-events: none;
}

.officer-loan-modal.light-theme .officer-loan-modal-header h3 {
  color: #052e16;
  -webkit-text-fill-color: #052e16;
  font-size: 1.28rem;
  letter-spacing: -0.02em;
}

.officer-loan-modal.light-theme .officer-loan-modal-sub {
  color: #166534;
  -webkit-text-fill-color: #166534;
  font-weight: 600;
}

.officer-loan-modal.light-theme .officer-loan-modal-icon {
  background: linear-gradient(135deg, #ffffff 0%, #dcfce7 100%);
  border: 2px solid #4ade80;
  color: #15803d;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.12);
}

.officer-loan-modal.light-theme .officer-loan-modal-close {
  background: #ffffff;
  border: 2px solid #86efac;
  color: #166534;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.08);
}

.officer-loan-modal.light-theme .officer-loan-modal-close:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.officer-loan-modal.light-theme .officer-loan-modal-body {
  padding: 1.35rem 1.4rem 1.45rem;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.6) 0%, rgba(240, 253, 244, 0.35) 100%);
}

.officer-loan-modal.light-theme .edit-loan-form .form-group label {
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  font-size: 0.78rem;
}

.officer-loan-modal.light-theme .edit-loan-form .form-group input,
.officer-loan-modal.light-theme .edit-loan-form .form-group select {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.06);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
}

.officer-loan-modal.light-theme .edit-loan-form .form-group input::placeholder {
  color: #6b7280 !important;
  -webkit-text-fill-color: #6b7280 !important;
}

.officer-loan-modal.light-theme .edit-loan-form .form-group input:focus,
.officer-loan-modal.light-theme .edit-loan-form .form-group select:focus {
  outline: none;
  border-color: #16a34a !important;
  background: #f0fdf4 !important;
  box-shadow: 0 0 0 4px rgba(74, 222, 128, 0.22), 0 4px 12px rgba(22, 101, 52, 0.1) !important;
}

.officer-loan-modal.light-theme .edit-loan-form .help-text {
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
  font-weight: 600;
  padding: 0.45rem 0.65rem;
  border-radius: 8px;
  background: rgba(220, 252, 231, 0.65);
  border: 1px solid rgba(134, 239, 172, 0.45);
}

.officer-loan-modal.light-theme .edit-amount-summary {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%);
  border: 2px solid #4ade80;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    0 6px 16px rgba(22, 101, 52, 0.1);
  padding: 1rem 1.05rem;
}

.officer-loan-modal.light-theme .edit-summary-row {
  color: #166534;
  font-weight: 600;
}

.officer-loan-modal.light-theme .edit-summary-row strong {
  color: #052e16;
  -webkit-text-fill-color: #052e16;
}

.officer-loan-modal.light-theme .edit-summary-total {
  border-top-color: rgba(22, 101, 52, 0.18);
  margin-top: 0.35rem;
  padding-top: 0.65rem;
}

.officer-loan-modal.light-theme .edit-summary-total strong {
  color: #15803d;
  -webkit-text-fill-color: #15803d;
  font-size: 1.08rem;
}

.officer-loan-modal.light-theme .officer-loan-modal-actions {
  margin-top: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgba(134, 239, 172, 0.45);
}

.officer-loan-modal.light-theme .officer-loan-modal-btn.secondary {
  background: #ffffff !important;
  color: #166534 !important;
  -webkit-text-fill-color: #166534 !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.08) !important;
}

.officer-loan-modal.light-theme .officer-loan-modal-btn.secondary:hover {
  background: #f0fdf4 !important;
  border-color: #22c55e !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.12) !important;
}

.officer-loan-modal.light-theme .officer-loan-modal-btn.primary {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 2px solid #15803d !important;
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.22) !important;
}

.officer-loan-modal.light-theme .officer-loan-modal-btn.primary:hover:not(:disabled) {
  background: linear-gradient(135deg, #86efac 0%, #4ade80 55%, #22c55e 100%) !important;
  border-color: #166534 !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(22, 101, 52, 0.28) !important;
}

.officer-loan-modal.light-theme .officer-loan-modal-btn.primary:disabled {
  opacity: 0.6;
  filter: grayscale(0.15);
}

.edit-loan-form .form-group input,
.edit-loan-form .form-group select {
  padding: 0.75rem 0.875rem !important;
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
  .stats-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .content-grid {
    grid-template-columns: 1fr;
  }

  .form-row-two {
    grid-template-columns: 1fr;
  }

  .terms-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .page-container {
    padding: 1rem;
    gap: 1rem;
  }

  .application-steps {
    flex-direction: column;
    gap: 0.4rem;
  }

  .step-connector {
    display: none;
  }

  .step-chip {
    flex-direction: row;
    width: 100%;
    justify-content: flex-start;
    padding: 0.5rem 0.75rem;
    text-align: left;
  }

  .step-label {
    white-space: normal;
  }

  .loan-amount {
    font-size: 1.82rem;
  }

  .tab {
    font-size: 0.78rem;
    padding: 0.48rem 0.7rem;
  }

  .tab-icon {
    display: none;
  }
}

/* ===== LIGHT MODE — Senior-friendly bright theme (matches Admin Loans) ===== */
.page-container.officer-loans-page.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
  border-radius: 18px;
}

.page-container.officer-loans-page.light-theme::before {
  opacity: 0.35;
}

.page-container.officer-loans-page.light-theme :is(.glass-header, .card) {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.page-container.officer-loans-page.light-theme .page-title {
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .page-subtitle {
  color: #166534 !important;
}

.page-container.officer-loans-page.light-theme .stat-card {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.page-container.officer-loans-page.light-theme .stat-card.pending {
  border-left-color: #f59e0b !important;
}

.page-container.officer-loans-page.light-theme .stat-card.approved {
  border-left-color: #10b981 !important;
}

.page-container.officer-loans-page.light-theme .stat-card.active {
  border-left-color: #3b82f6 !important;
}

.page-container.officer-loans-page.light-theme .stat-card.rejected {
  border-left-color: #ef4444 !important;
}

.page-container.officer-loans-page.light-theme .stat-value {
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .stat-label {
  color: #166534 !important;
}

.page-container.officer-loans-page.light-theme .stat-card-active {
  border-color: #22c55e !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.15), 0 0 0 2px rgba(34, 197, 94, 0.25) !important;
}

.page-container.officer-loans-page.light-theme .card-head {
  border-bottom-color: rgba(22, 101, 52, 0.16);
}

.page-container.officer-loans-page.light-theme .card-title {
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .application-card .form-group label {
  color: #166534 !important;
}

.page-container.officer-loans-page.light-theme .field-icon {
  color: #15803d;
}

.page-container.officer-loans-page.light-theme .loan-form .form-group input,
.page-container.officer-loans-page.light-theme .loan-form .form-group select {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 1.5px solid #cbd5e1 !important;
}

.page-container.officer-loans-page.light-theme .loan-form .form-group input::placeholder {
  color: #94a3b8;
}

.page-container.officer-loans-page.light-theme .loan-form .form-group input:focus,
.page-container.officer-loans-page.light-theme .loan-form .form-group select:focus {
  border-color: #22c55e !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15) !important;
}

.page-container.officer-loans-page.light-theme .application-card .help-text {
  color: #64748b;
}

.page-container.officer-loans-page.light-theme .application-card .calculation-text {
  color: #15803d;
}

.page-container.officer-loans-page.light-theme .amount-summary {
  background: #f0fdf4;
  border-color: #86efac;
  color: #16a34a;
}

.page-container.officer-loans-page.light-theme .amount-summary strong {
  color: #15803d;
}

.page-container.officer-loans-page.light-theme .loan-info-box {
  background: #ecfdf5;
  border-color: #86efac;
}

.page-container.officer-loans-page.light-theme .loan-info-title {
  color: #166534;
}

.page-container.officer-loans-page.light-theme .loan-info-icon {
  color: #15803d;
}

.page-container.officer-loans-page.light-theme .terms-grid li {
  color: #16a34a;
}

.page-container.officer-loans-page.light-theme .terms-grid li strong {
  color: #052e16;
}

.page-container.officer-loans-page.light-theme .step-chip {
  background: #ffffff;
  border-color: #86efac;
  color: #166534;
}

.page-container.officer-loans-page.light-theme .step-connector {
  background: rgba(34, 197, 94, 0.35);
}

.page-container.officer-loans-page.light-theme .step-chip.active {
  background: #dcfce7;
  border-color: #4ade80;
  color: #052e16;
}

.page-container.officer-loans-page.light-theme .step-num {
  background: #ffffff;
  color: #166534;
  border: 2px solid #22c55e;
  box-shadow: 0 2px 6px rgba(22, 101, 52, 0.14);
}

.page-container.officer-loans-page.light-theme .step-chip.active .step-num {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border: 2px solid #15803d;
  box-shadow: 0 3px 10px rgba(22, 101, 52, 0.22);
}

.page-container.officer-loans-page.light-theme .alert-info {
  background: #e0f2fe;
  color: #0369a1;
  border-color: #0ea5e9;
}

.page-container.officer-loans-page.light-theme .alert-warning {
  background: #fef3c7;
  color: #92400e;
  border-color: #f59e0b;
}

.page-container.officer-loans-page.light-theme .tab {
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  color: #14532d !important;
  box-shadow: none !important;
}

.page-container.officer-loans-page.light-theme .tab:hover {
  background: #f0fdf4 !important;
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .tab.active {
  background: #dcfce7 !important;
  color: #14532d !important;
  border-color: #22c55e !important;
  box-shadow: none !important;
}

.page-container.officer-loans-page.light-theme .empty-state {
  background: #ffffff;
  border: 2px dashed #86efac;
  color: #166534;
}

.page-container.officer-loans-page.light-theme .empty-state-icon {
  background: #ecfdf5;
  border-color: #86efac;
  color: #15803d;
}

.page-container.officer-loans-page.light-theme .modal-content {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
}

.page-container.officer-loans-page.light-theme .modal-header h3 {
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .detail-item {
  background: #f0fdf4;
  border-color: #86efac;
}

.page-container.officer-loans-page.light-theme .detail-item label {
  color: #166534 !important;
}

.page-container.officer-loans-page.light-theme .detail-item p {
  color: #052e16 !important;
}

.page-container.officer-loans-page.light-theme .loan-details {
  background: #ffffff;
  border-color: #86efac;
  color: #000000 !important;
}

.page-container.officer-loans-page.light-theme .loan-details p {
  color: #000000 !important;
}

.page-container.officer-loans-page.light-theme .loan-details strong {
  color: #000000 !important;
}

.page-container.officer-loans-page.light-theme .approval-stage-text {
  color: #000000;
}

.page-container.officer-loans-page.light-theme .loan-amount {
  color: #000000 !important;
}

.page-container.officer-loans-page.light-theme .officer-pending-actions {
  border-top-color: rgba(22, 101, 52, 0.16);
}

/* Toast + success modal notifications */
.loan-toast {
  position: fixed;
  top: 5.5rem;
  right: 1.25rem;
  z-index: 6000;
  display: flex;
  align-items: flex-start;
  gap: 0.55rem;
  max-width: min(22rem, calc(100vw - 2rem));
  padding: 0.75rem 0.9rem;
  border-radius: 14px;
  border: 1px solid rgba(134, 239, 172, 0.35);
  background: linear-gradient(145deg, rgba(20, 83, 45, 0.97), rgba(14, 50, 32, 0.98));
  color: #dcfce7;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38);
  font-size: 0.9rem;
  font-weight: 600;
  line-height: 1.4;
}

.loan-toast.error {
  border-color: rgba(248, 113, 113, 0.4);
  background: linear-gradient(145deg, rgba(127, 29, 29, 0.97), rgba(91, 22, 22, 0.98));
  color: #fee2e2;
}

.loan-toast-icon {
  display: inline-flex;
  flex-shrink: 0;
  margin-top: 0.05rem;
  color: #86efac;
}

.loan-toast.error .loan-toast-icon {
  color: #fca5a5;
}

.loan-toast-icon svg {
  width: 1.1rem;
  height: 1.1rem;
  stroke: currentColor;
}

.loan-toast-text {
  flex: 1;
}

.loan-toast-close {
  border: none;
  background: transparent;
  color: inherit;
  opacity: 0.75;
  font-size: 1.2rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.loan-toast-close:hover {
  opacity: 1;
}

.loan-toast-fade-enter-active,
.loan-toast-fade-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.loan-toast-fade-enter-from,
.loan-toast-fade-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.loan-notice-backdrop {
  position: fixed;
  inset: 0;
  z-index: 7000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
  background: rgba(6, 12, 9, 0.78);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
}

.loan-notice-modal {
  width: min(420px, 100%);
  padding: 1.35rem 1.4rem 1.25rem;
  border-radius: 20px;
  border: 1px solid rgba(134, 239, 172, 0.35);
  background: linear-gradient(145deg, rgba(22, 44, 32, 0.99), rgba(14, 33, 23, 0.99));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  text-align: center;
  color: #ffffff;
}

.loan-notice-icon {
  width: 3.25rem;
  height: 3.25rem;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(74, 222, 128, 0.18);
  border: 1px solid rgba(134, 239, 172, 0.4);
  color: #86efac;
}

.loan-notice-icon svg {
  width: 1.65rem;
  height: 1.65rem;
  stroke: currentColor;
}

.loan-notice-title {
  margin: 0 0 0.35rem;
  font-size: 1.2rem;
  font-weight: 800;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}

.loan-notice-sub {
  margin: 0 0 0.85rem;
  font-size: 0.88rem;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  opacity: 0.92;
}

.loan-notice-details {
  margin-bottom: 0.85rem;
  padding: 0.85rem 0.9rem;
  border-radius: 14px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(126, 184, 145, 0.22);
  text-align: left;
}

.loan-notice-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0;
  font-size: 0.9rem;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
}

.loan-notice-row strong {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  font-weight: 800;
}

.loan-notice-row-total {
  margin-top: 0.25rem;
  padding-top: 0.55rem;
  border-top: 1px solid rgba(134, 239, 172, 0.22);
}

.loan-notice-row-total strong {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  font-size: 1rem;
}

.loan-notice-foot {
  margin: 0 0 1rem;
  font-size: 0.86rem;
  line-height: 1.45;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  opacity: 0.92;
}

.loan-notice-btn {
  width: 100%;
  padding: 0.72rem 1rem;
  border: 1px solid rgba(190, 235, 203, 0.28);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.08) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: none !important;
  filter: none !important;
  transition: transform 0.18s ease, background 0.18s ease;
}

.loan-notice-btn:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.14) !important;
  filter: none !important;
  box-shadow: none !important;
}

.loan-notice-modal.light-theme {
  background: linear-gradient(165deg, #ffffff 0%, #f7fdf9 42%, #ecfdf5 100%);
  border: 2px solid #4ade80;
  color: #052e16;
  box-shadow:
    0 24px 48px rgba(22, 101, 52, 0.16),
    0 8px 20px rgba(22, 101, 52, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  padding: 1.5rem 1.45rem 1.35rem;
}

.loan-notice-backdrop:has(.loan-notice-modal.light-theme) {
  background: rgba(236, 253, 245, 0.55);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.loan-notice-modal.light-theme .loan-notice-icon {
  width: 3.75rem;
  height: 3.75rem;
  margin-bottom: 1rem;
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%);
  border: 3px solid #ffffff;
  color: #ffffff;
  box-shadow:
    0 8px 20px rgba(22, 101, 52, 0.22),
    0 0 0 4px rgba(74, 222, 128, 0.25);
}

.loan-notice-modal.light-theme .loan-notice-icon svg {
  stroke: #ffffff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.12));
}

.loan-notice-modal.light-theme .loan-notice-title {
  color: #052e16;
  -webkit-text-fill-color: #052e16;
  font-size: 1.32rem;
  letter-spacing: -0.02em;
  margin-bottom: 0.45rem;
}

.loan-notice-modal.light-theme .loan-notice-sub,
.loan-notice-modal.light-theme .loan-notice-foot {
  color: #166534;
  -webkit-text-fill-color: #166534;
  font-weight: 600;
}

.loan-notice-modal.light-theme .loan-notice-sub {
  display: inline-block;
  margin-bottom: 1rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  background: rgba(220, 252, 231, 0.75);
  border: 1px solid rgba(134, 239, 172, 0.5);
  font-size: 0.84rem;
}

.loan-notice-modal.light-theme .loan-notice-details {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 55%, #bbf7d0 100%);
  border: 2px solid #4ade80;
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.75),
    0 6px 16px rgba(22, 101, 52, 0.1);
  padding: 1rem 1.05rem;
  margin-bottom: 1rem;
}

.loan-notice-modal.light-theme .loan-notice-row {
  color: #166534;
  -webkit-text-fill-color: #166534;
  font-weight: 600;
  padding: 0.4rem 0;
}

.loan-notice-modal.light-theme .loan-notice-row strong {
  color: #052e16;
  -webkit-text-fill-color: #052e16;
}

.loan-notice-modal.light-theme .loan-notice-row-total {
  margin-top: 0.35rem;
  padding-top: 0.65rem;
  border-top: 2px solid rgba(22, 101, 52, 0.14);
}

.loan-notice-modal.light-theme .loan-notice-row-total strong {
  color: #15803d;
  -webkit-text-fill-color: #15803d;
  font-size: 1.1rem;
}

.loan-notice-modal.light-theme .loan-notice-foot {
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: rgba(254, 249, 195, 0.45);
  border: 1px solid rgba(250, 204, 21, 0.35);
  text-align: left;
}

.loan-notice-modal.light-theme .loan-notice-btn {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 2px solid #15803d !important;
  box-shadow: 0 6px 16px rgba(22, 101, 52, 0.22) !important;
  font-weight: 800;
  letter-spacing: 0.01em;
}

.loan-notice-modal.light-theme .loan-notice-btn:hover {
  background: linear-gradient(135deg, #86efac 0%, #4ade80 55%, #22c55e 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #166534 !important;
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(22, 101, 52, 0.28) !important;
}

.loan-modal-fade-enter-active,
.loan-modal-fade-leave-active {
  transition: opacity 0.22s ease;
}

.loan-modal-fade-enter-active .loan-notice-modal,
.loan-modal-fade-leave-active .loan-notice-modal,
.loan-modal-fade-enter-active .loan-delete-confirm-modal,
.loan-modal-fade-leave-active .loan-delete-confirm-modal,
.loan-modal-fade-enter-active .officer-loan-modal,
.loan-modal-fade-leave-active .officer-loan-modal {
  transition: transform 0.22s ease, opacity 0.22s ease;
}

.loan-modal-fade-enter-from,
.loan-modal-fade-leave-to {
  opacity: 0;
}

.loan-modal-fade-enter-from .loan-notice-modal,
.loan-modal-fade-leave-to .loan-notice-modal,
.loan-modal-fade-enter-from .loan-delete-confirm-modal,
.loan-modal-fade-leave-to .loan-delete-confirm-modal,
.loan-modal-fade-enter-from .officer-loan-modal,
.loan-modal-fade-leave-to .officer-loan-modal {
  transform: translateY(12px) scale(0.98);
  opacity: 0;
}

.loan-delete-confirm-modal {
  width: min(420px, 100%);
  padding: 1.35rem 1.4rem 1.25rem;
  border-radius: 20px;
  border: 1px solid rgba(248, 113, 113, 0.35);
  background: linear-gradient(145deg, rgba(44, 22, 22, 0.99), rgba(33, 14, 14, 0.99));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
  text-align: center;
  color: #fef2f2;
}

.loan-delete-icon {
  width: 3.25rem;
  height: 3.25rem;
  margin: 0 auto 0.75rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(248, 113, 113, 0.18);
  border: 1px solid rgba(252, 165, 165, 0.4);
  color: #fca5a5;
}

.loan-delete-icon svg {
  width: 1.65rem;
  height: 1.65rem;
  stroke: currentColor;
}

.loan-delete-title {
  margin: 0 0 0.5rem;
  font-size: 1.2rem;
  font-weight: 800;
  color: #fef2f2;
}

.loan-delete-message {
  margin: 0 0 0.5rem;
  font-size: 0.9rem;
  line-height: 1.45;
  color: rgba(254, 226, 226, 0.82);
}

.loan-delete-warning {
  margin: 0 0 1.1rem;
  font-size: 0.84rem;
  font-weight: 700;
  color: #fca5a5;
}

.loan-delete-actions {
  display: flex;
  gap: 0.65rem;
}

.loan-delete-cancel,
.loan-delete-btn {
  flex: 1;
  padding: 0.72rem 1rem;
  border-radius: 12px;
  font-size: 0.95rem;
  font-weight: 800;
  cursor: pointer;
  transition: transform 0.18s ease, filter 0.18s ease, opacity 0.18s ease;
}

.loan-delete-cancel {
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(255, 255, 255, 0.06);
  color: #e2e8f0;
}

.loan-delete-cancel:hover:not(:disabled) {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.1);
}

.loan-delete-btn {
  border: none;
  background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(220, 38, 38, 0.3);
}

.loan-delete-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.loan-delete-cancel:disabled,
.loan-delete-btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.loan-delete-confirm-modal.light-theme {
  background: linear-gradient(145deg, #ffffff, #fff1f2);
  border-color: #fca5a5;
  color: #450a0a;
}

.loan-delete-confirm-modal.light-theme .loan-delete-icon {
  background: rgba(254, 202, 202, 0.45);
  border-color: #fca5a5;
  color: #dc2626;
}

.loan-delete-confirm-modal.light-theme .loan-delete-title {
  color: #7f1d1d;
}

.loan-delete-confirm-modal.light-theme .loan-delete-message {
  color: #991b1b;
}

.loan-delete-confirm-modal.light-theme .loan-delete-warning {
  color: #b91c1c;
}

.loan-delete-confirm-modal.light-theme .loan-delete-cancel {
  border-color: #d1d5db;
  background: #f9fafb;
  color: #374151;
}

.loan-delete-confirm-modal.light-theme .loan-delete-cancel:hover:not(:disabled) {
  background: #f3f4f6;
}

.page-container.officer-loans-page.light-theme .loan-toast {
  background: linear-gradient(145deg, #ffffff, #f0fdf4);
  color: #16a34a;
  border-color: #86efac;
}

.page-container.officer-loans-page.light-theme .loan-toast.error {
  background: linear-gradient(145deg, #fff1f2, #fee2e2);
  color: #991b1b;
  border-color: #fca5a5;
}
</style>
