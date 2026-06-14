<template>
  <div class="financial-container glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-header">
      <div class="header-content">
        <h1>Machinery Financial Management</h1>
        <p class="page-subtitle">Record expenses, income, and manage profit distribution</p>
      </div>
    </div>

    <!-- Access Denied Message -->
    <div v-if="!hasAccess" class="access-denied">
      <div class="denied-content">
        <p class="denied-icon">🔒</p>
        <p class="denied-text">Access Denied</p>
        <p class="denied-reason">Only Admin, President, Treasurer, and Auditor can access this section.</p>
      </div>
    </div>

    <div v-else>
      <!-- Barangay Context Display -->
      <div v-if="!isDuesOnlyView && !isAdmin" class="barangay-context">
        <span class="context-badge">📍 {{ userRole === 'treasurer' ? 'Managing' : 'Viewing' }} financial data for your assigned barangay</span>
      </div>
      <div v-else-if="!isDuesOnlyView" class="barangay-context admin-context">
        <span class="context-badge">🌐 Admin View</span>
        <div class="admin-filter">
          <label for="barangay-select">Filter by Barangay:</label>
          <select id="barangay-select" v-model="selectedBarangayId" class="barangay-select">
            <option value="">All Barangays (Consolidated)</option>
            <option v-for="b in barangays" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
      </div>
      
      <!-- Financial Summary Cards -->
      <div v-if="!isDuesOnlyView" class="summary-cards">
        <div class="summary-card income-card">
          <div class="card-content">
            <span class="card-label">Total Income</span>
            <span class="card-amount">₱{{ formatNumber(profitSummary.total_income) }}</span>
          </div>
        </div>
        <div class="summary-card expense-card">
          <div class="card-content">
            <span class="card-label">Total Expenses</span>
            <span class="card-amount">₱{{ formatNumber(profitSummary.total_expenses) }}</span>
          </div>
        </div>
        <div class="summary-card profit-card" :class="{ negative: profitSummary.net_profit < 0 }">
          <div class="card-content">
            <span class="card-label">Net Profit</span>
            <span class="card-amount">₱{{ formatNumber(profitSummary.net_profit) }}</span>
          </div>
        </div>
      </div>

      <!-- Tabs Navigation -->
      <div v-if="!isDuesOnlyView" class="tabs-container">
        <button
          v-for="tab in tabs"
          :key="tab.id"
          type="button"
          :class="['tab', { active: activeTab === tab.id }]"
          @click="activeTab = tab.id"
        >
          <span class="tab-inner">
            <svg v-if="tab.id === 'expenses'" class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
            </svg>
            <svg v-else-if="tab.id === 'income'" class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/>
              <polyline points="17 6 23 6 23 12"/>
            </svg>
            <svg v-else-if="tab.id === 'ar'" class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="2" y="5" width="20" height="14" rx="2"/>
              <line x1="2" y1="10" x2="22" y2="10"/>
            </svg>
            <svg v-else-if="tab.id === 'profit'" class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M3 3v18h18"/>
              <path d="M7 16l4-4 4 4 5-6"/>
            </svg>
            <svg v-else-if="tab.id === 'reports'" class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
              <polyline points="14 2 14 8 20 8"/>
              <line x1="16" y1="13" x2="8" y2="13"/>
              <line x1="16" y1="17" x2="8" y2="17"/>
              <line x1="10" y1="9" x2="8" y2="9"/>
            </svg>
            <svg v-else-if="tab.id === 'dues'" class="tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2"/>
              <line x1="16" y1="2" x2="16" y2="6"/>
              <line x1="8" y1="2" x2="8" y2="6"/>
              <line x1="3" y1="10" x2="21" y2="10"/>
            </svg>
            <span class="tab-label">{{ tab.label }}</span>
          </span>
        </button>
      </div>

      <!-- TAB 1: EXPENSES MANAGEMENT -->
      <div v-if="activeTab === 'expenses'" class="tab-content">
        <div class="section-header">
          <h2>Expense Management</h2>
          <button v-if="canManage" @click="showExpenseForm = true" class="btn-primary">+ Record Expense</button>
          <span v-else class="view-only-badge">👁️ View Only</span>
        </div>

        <!-- Expense Filters -->
        <div class="filters-section">
          <div class="filter-group">
            <label class="filter-label">Income Source:</label>
            <select v-model="filters.income_source" class="filter-input">
              <option value="all">All Sources</option>
              <option value="machinery">Machinery Collections</option>
              <option value="dues">Monthly Dues</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Machinery/Equipment:</label>
            <select v-model="filters.machinery_id" class="filter-input">
              <option value="">All Machinery/Equipment</option>
              <option v-for="m in machinery" :key="m.id" :value="m.id">
                {{ m.machinery_name }} ({{ m.machinery_type }})
              </option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Start Date:</label>
            <input v-model="filters.start_date" type="date" class="filter-input" />
          </div>
          <div class="filter-group">
            <label class="filter-label">End Date:</label>
            <input v-model="filters.end_date" type="date" class="filter-input" />
          </div>
          <div class="filter-actions">
            <button @click="loadExpenses" class="btn-secondary">Filter</button>
            <button @click="clearFilters" class="btn-secondary-outline">Clear</button>
          </div>
        </div>

        <!-- Expenses Table -->
        <div class="table-container">
          <table class="expenses-table">
            <thead>
              <tr>
                <th>Machinery/Equipment</th>
                <th>Date</th>
                <th>Particulars</th>
                <th>Ref. No.</th>
                <th>Fuel & Oil</th>
                <th>Labor</th>
                <th>Per Diem</th>
                <th>Repair & Maint.</th>
                <th>Office Supply</th>
                <th>Communication</th>
                <th>Utilities</th>
                <th>Sundries</th>
                <th>Total</th>
                <th v-if="canManage">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="expense in filteredExpenses" :key="expense.id">
                <td><strong>{{ expense.machinery_name }}</strong></td>
                <td>{{ formatDate(expense.date_of_expense) }}</td>
                <td>{{ expense.particulars }}</td>
                <td>{{ expense.reference_number || '-' }}</td>
                <td>₱{{ formatNumber(expense.fuel_and_oil) }}</td>
                <td>₱{{ formatNumber(expense.labor_cost) }}</td>
                <td>₱{{ formatNumber(expense.per_diem) }}</td>
                <td>₱{{ formatNumber(expense.repair_and_maintenance) }}</td>
                <td>₱{{ formatNumber(expense.office_supply) }}</td>
                <td>₱{{ formatNumber(expense.communication_expense) }}</td>
                <td>₱{{ formatNumber(expense.utilities_expense) }}</td>
                <td>₱{{ formatNumber(expense.sundries) }}</td>
                <td class="amount-cell">₱{{ formatNumber(expense.total_amount) }}</td>
                <td v-if="canManage" class="actions-cell">
                  <button @click="editExpense(expense)" class="btn-edit" title="Edit">✏️</button>
                  <button @click="deleteExpense(expense.id)" class="btn-delete" title="Delete">🗑️</button>
                </td>
              </tr>
            </tbody>
          </table>
          <div v-if="filteredExpenses.length === 0" class="empty-state">
            <p>{{ filters.machinery_id ? 'No expenses for selected machinery' : 'No expenses recorded yet' }}</p>
          </div>
        </div>
      </div>

      <!-- TAB 2: INCOME MANAGEMENT -->
      <div v-if="activeTab === 'income'" class="tab-content">
        <div class="section-header">
          <h2>Income Management (Auto-Populated from Completed Bookings)</h2>
        </div>

        <!-- Income Filters -->
        <div class="filters-section">
          <div class="filter-group">
            <label class="filter-label">Income Source:</label>
            <select v-model="filters.income_source" class="filter-input">
              <option value="all">All Sources</option>
              <option value="machinery">Machinery Collections</option>
              <option value="dues">Association Dues</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Start Date:</label>
            <input v-model="filters.start_date" type="date" class="filter-input" />
          </div>
          <div class="filter-group">
            <label class="filter-label">End Date:</label>
            <input v-model="filters.end_date" type="date" class="filter-input" />
          </div>
          <div class="filter-actions">
            <button @click="loadIncome" class="btn-secondary">Filter</button>
            <button @click="clearFilters" class="btn-secondary-outline">Clear</button>
          </div>
        </div>

        <p class="info-text">💡 Income is automatically generated from machinery collections and association dues.</p>

        <div class="card" style="margin-bottom: 12px;">
          <div class="card-header">
            <h3 class="card-title">Total Income Breakdown</h3>
          </div>
          <div v-if="incomeSourceBreakdown.length === 0" class="empty-state">
            <p>No income sources available for current filters.</p>
          </div>
          <div v-else class="table-container">
            <table class="data-table">
              <thead>
                <tr>
                  <th>Source</th>
                  <th>Transactions</th>
                  <th>Total Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="item in incomeSourceBreakdown" :key="item.source">
                  <td>{{ item.source }}</td>
                  <td>{{ item.count }}</td>
                  <td class="amount-cell">₱{{ formatNumber(item.total) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <!-- Income Table -->
        <div class="table-container">
          <table class="income-table">
            <thead>
              <tr>
                <th>Source</th>
                <th>Farmer Name</th>
                <th>Machinery/Equipment</th>
                <th>Reference</th>
                <th>Coverage / Notes</th>
                <th>Total Amount</th>
                <th>Amount Paid</th>
                <th>Payment Status</th>
                <th>Payment Date</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="inc in consolidatedIncomeRecords" :key="getIncomeRowKey(inc)">
                <td>
                  <span :class="['badge', isDuesIncome(inc) ? 'badge-collection' : 'badge-income']">
                    {{ inc.income_type || 'Income' }}
                  </span>
                </td>
                <td><strong>{{ inc.farmer_name || '-' }}</strong></td>
                <td>{{ inc.machinery_name ? `${inc.machinery_name}${inc.machinery_type ? ` (${inc.machinery_type})` : ''}` : 'Association Dues' }}</td>
                <td>{{ inc.booking_id ? `Booking #${inc.booking_id}` : 'Dues Transaction' }}</td>
                <td>{{ isDuesIncome(inc) ? formatDuesCoverage(inc.period_start, inc.period_end) : (inc.remarks || '-') }}</td>
                <td class="amount-cell">₱{{ formatNumber(inc.original_amount) }}</td>
                <td class="amount-cell">₱{{ formatNumber(inc.income_amount) }}</td>
                <td>
                  <span :class="['status-badge', inc.payment_status.toLowerCase().replace(' ', '-')]">
                    {{ inc.payment_status }}
                  </span>
                </td>
                <td>{{ formatDate(inc.date_of_income) }}</td>
              </tr>
            </tbody>
          </table>
          <div v-if="consolidatedIncomeRecords.length === 0" class="empty-state">
            <p>No income records yet</p>
          </div>
        </div>
      </div>

      <!-- TAB 2: MONTHLY DUES COLLECTION -->
      <div v-if="activeTab === 'dues'" class="tab-content">
        <div class="page-header">
          <h1 class="page-title">💰 Association Dues Transactions</h1>
          <p class="page-subtitle">
            ₱120 every 6 months for all registered members (farmers and barangay officers) • President and Treasurer only
          </p>
        </div>

        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">Total Transactions</div>
            <div class="stat-value">{{ duesSummary.total_collections }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Total Amount Collected</div>
            <div class="stat-value">₱{{ formatNumber(duesSummary.total_amount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Paid This Cycle</div>
            <div class="stat-value">{{ paidFarmersCount }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">Unpaid This Cycle</div>
            <div class="stat-value">{{ unpaidFarmersCount }}</div>
          </div>
        </div>

        <!-- Two Column Layout -->
        <div class="grid-2">
          <!-- Left Column: Farmers List -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Registered Members (Your Barangay)</h2>
              <button class="btn" @click="loadEligibleFarmers" :disabled="false">Refresh</button>
            </div>
            
            <!-- Search Filter -->
            <div class="filter-section">
              <input
                v-model="duesSearchQuery"
                type="text"
                placeholder="Search by reference number, name, or role..."
                class="input filter-input"
              />
            </div>

            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Ref No.</th>
                    <th>Member</th>
                    <th>Role</th>
                    <th>This Cycle</th>
                    <th>Last Paid</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredEligibleFarmers.length === 0">
                    <td colspan="6" class="empty-message">No registered members found</td>
                  </tr>
                  <tr
                    v-else
                    v-for="farmer in filteredEligibleFarmers"
                    :key="farmer.id"
                    :class="{ selected: selectedFarmer?.id === farmer.id }"
                    @click="selectFarmer(farmer)"
                  >
                    <td>{{ farmer.reference_number || '-' }}</td>
                    <td class="name">{{ farmer.full_name }}</td>
                    <td>{{ formatRoleLabel(farmer.member_role) }}</td>
                    <td>
                      <span :class="['badge', Number(farmer.dues_paid) ? 'badge-paid' : 'badge-unpaid']">
                        {{ Number(farmer.dues_paid) ? 'Paid' : 'Unpaid' }}
                      </span>
                    </td>
                    <td>{{ farmer.last_payment_date ? formatDate(farmer.last_payment_date) : '—' }}</td>
                    <td class="actions" @click.stop>
                      <button class="btn btn-small" @click="selectFarmer(farmer)">View</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- Right Column: Selected Farmer Details -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">Association Dues</h2>
            </div>

            <div v-if="!selectedFarmer" class="empty-state">
              <div class="empty-title">Select a farmer</div>
              <div class="empty-text">Choose a farmer from the list to view and record six-month dues transactions.</div>
            </div>

            <div v-else>
              <div class="farmer-summary">
                <div class="farmer-name">{{ selectedFarmer.full_name }}</div>
                <div class="farmer-meta">
                  Reference: {{ selectedFarmer.reference_number || '—' }} • Role: {{ formatRoleLabel(selectedFarmer.member_role) }}
                </div>
              </div>

              <div class="stats-grid compact">
                <div class="stat-card">
                  <div class="stat-label">Dues Amount</div>
                  <div class="stat-value">₱120</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Current Cycle</div>
                  <div class="stat-value stat-value-sm">{{ currentPeriodLabel }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Last Paid</div>
                  <div class="stat-value">{{ selectedFarmer.last_payment_date ? formatDate(selectedFarmer.last_payment_date) : '—' }}</div>
                </div>
              </div>

              <!-- Dues Collection Form -->
              <div v-if="canCollectDues" class="action-row">
                <div class="form-inline">
                  <label class="inline-label">Collection Date</label>
                  <input class="input" type="date" v-model="duesForm.collection_date" />
                  <label class="inline-label">Amount</label>
                  <input class="input" type="number" :value="120" disabled />
                  <label class="inline-label">Payment Method</label>
                  <select class="input" v-model="duesForm.payment_method">
                    <option value="Cash">Cash</option>
                    <option value="GCash">GCash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Check">Check</option>
                  </select>
                  <button class="btn btn-success" @click="collectMonthlyDues" :disabled="!duesForm.collection_date || Number(selectedFarmer?.dues_paid)">
                    Record Dues
                  </button>
                </div>
                <div class="stat-card">
                  <div class="stat-label">Lifetime Total Paid</div>
                  <div class="stat-value">PHP {{ formatNumber(selectedFarmerTotalPaid) }}</div>
                </div>
              </div>

              <div v-if="canCollectDues" class="form-group dues-remarks-group">
                <label class="inline-label">Remarks</label>
                <textarea v-model="duesForm.remarks" class="input dues-remarks-input" placeholder="Optional notes about this dues transaction..."></textarea>
              </div>

              <div v-if="Number(selectedFarmer?.dues_paid)" class="info-text">
                This farmer already has a dues transaction recorded for the current 6-month cycle.
              </div>

              <!-- Dues Payment History -->
              <div class="section-title">Dues Transactions</div>
              <div class="table-container">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Amount</th>
                      <th>Period</th>
                      <th>Payment Method</th>
                      <th>Collected By</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="selectedFarmerPayments.length === 0">
                      <td colspan="5" class="empty-message">No dues transactions recorded yet</td>
                    </tr>
                    <tr v-else v-for="payment in selectedFarmerPayments" :key="payment.id">
                      <td>{{ formatDate(payment.collection_date) }}</td>
                      <td class="amount">₱{{ formatNumber(payment.amount) }}</td>
                      <td>{{ formatDuesCoverage(payment.period_start, payment.period_end) }}</td>
                      <td>{{ payment.payment_method }}</td>
                      <td>{{ payment.collected_by_name }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: ACCOUNTS RECEIVABLE & COLLECTIONS -->
      <div v-if="activeTab === 'ar'" class="tab-content">
        <div class="section-header">
          <h2>Accounts Receivable & Collections</h2>
        </div>
        <div class="auto-interest-indicator">
          Auto Interest Rule: <strong>2% (Partial)</strong> - automatically added once based on the full booking amount.
        </div>

        <!-- A/R Summary Cards -->
        <div class="summary-container">
          <div class="summary-card ar-card">
            <div class="card-icon icon-receivables">📈</div>
            <div class="card-content">
              <span class="card-label">Total Receivables</span>
              <span class="card-amount">₱{{ formatNumber(collectionsSummary.total_receivables) }}</span>
            </div>
          </div>
          <div class="summary-card collected-card">
            <div class="card-icon icon-collected">💵</div>
            <div class="card-content">
              <span class="card-label">Total Collected</span>
              <span class="card-amount">₱{{ formatNumber(collectionsSummary.total_collected) }}</span>
            </div>
          </div>
          <div class="summary-card balance-card">
            <div class="card-icon icon-balance">⚠️</div>
            <div class="card-content">
              <span class="card-label">Outstanding Balance</span>
              <span class="card-amount">₱{{ formatNumber(collectionsSummary.total_balance) }}</span>
            </div>
          </div>
        </div>

        <!-- Collections Filter -->
        <div class="filters-section">
          <div class="filter-group">
            <label class="filter-label">Machinery/Equipment:</label>
            <select v-model="filters.machinery_id" class="filter-input">
              <option value="">All Machinery/Equipment</option>
              <option v-for="m in machinery" :key="m.id" :value="m.id">
                {{ m.machinery_name }} ({{ m.machinery_type }})
              </option>
            </select>
          </div>
          <div class="filter-actions">
            <button @click="loadARData" class="btn-secondary">Filter</button>
            <button @click="clearFilters" class="btn-secondary-outline">Clear</button>
          </div>
        </div>

        <!-- A/R List -->
        <div class="ar-section">
          <div class="section-subheader">
            <h3>📑 List of Collectibles (Accounts Receivable)</h3>
            <span v-if="isViewOnly" class="view-only-badge">👁️ View Only</span>
          </div>
          <div class="table-container">
            <table class="ar-table">
              <thead>
                <tr>
                  <th>Farmer Name</th>
                  <th>Machinery</th>
                  <th>Booking Date</th>
                  <th>Accounts Receivable</th>
                  <th>Cash Collected</th>
                  <th>Remaining Balance</th>
                  <th v-if="canManage">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="ar in arList" :key="ar.id" :data-booking-id="ar.id" :class="{ 'notification-highlight-row': highlightedBookingId == ar.id }">
                  <td>{{ ar.farmer_name }}</td>
                  <td>{{ ar.machinery_name }}</td>
                  <td>{{ formatDate(ar.booking_date) }}</td>
                  <td class="amount-cell">₱{{ formatNumber(ar.total_price) }}</td>
                  <td class="amount-cell">₱{{ formatNumber(ar.amount_collected || 0) }}</td>
                  <td class="amount-cell balance" :class="{ highlight: ar.remaining_balance > 0 }">
                    ₱{{ formatNumber(ar.total_price - (ar.amount_collected || 0)) }}
                  </td>
                  <td v-if="canManage" class="actions-cell">
                    <button @click="recordCollection(ar)" class="btn-primary-small" title="Record Payment">💳</button>
                  </td>
                </tr>
              </tbody>
            </table>
            <div v-if="arList.length === 0" class="empty-state">
              <p>No outstanding receivables</p>
            </div>
          </div>
        </div>

        <!-- Collections Transactions -->
        <div class="collections-section">
          <div class="section-subheader">
            <h3>💵 Collections Transactions</h3>
            <small class="auto-interest-note">Auto Interest: 2% is added once on first partial payment (based on full booking amount).</small>
          </div>
          <div class="table-container">
            <table class="collections-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Farmer</th>
                  <th>Machinery</th>
                  <th>Collection Amount</th>
                  <th>Receipt Number</th>
                  <th>Remarks</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="col in collections" :key="col.id">
                  <td>{{ formatDate(col.collection_date) }}</td>
                  <td>{{ col.farmer_name }}</td>
                  <td>{{ col.machinery_name }}</td>
                  <td class="amount-cell">₱{{ formatNumber(col.collection_amount) }}</td>
                  <td>{{ col.receipt_number || '-' }}</td>
                  <td>{{ col.remarks || '-' }}</td>
                  <!-- Delete button removed to prevent income data inconsistencies -->
                </tr>
              </tbody>
            </table>
            <div v-if="collections.length === 0" class="empty-state">
              <p>No collections recorded yet</p>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 4: PROFIT COMPUTATION -->
      <div v-if="activeTab === 'profit'" class="tab-content">
        <div class="section-header">
          <h2>Profit Computation & Distribution</h2>
        </div>

        <div class="usage-leaders-card">
          <div class="section-subheader">
            <h3>Most Used Machinery (Completed Bookings Only)</h3>
          </div>
          <div v-if="bookingUsageLeaders.length === 0" class="empty-state">
            <p>No completed booking usage found for current filters.</p>
          </div>
          <div v-else class="table-container">
            <table class="data-table usage-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Machinery</th>
                  <th>Type</th>
                  <th v-if="isAdmin">Barangay</th>
                  <th>Completed Bookings</th>
                  <th>Total Area Booked</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(item, index) in bookingUsageLeaders" :key="item.machinery_id">
                  <td>{{ index + 1 }}</td>
                  <td class="font-semibold">{{ item.machinery_name || '-' }}</td>
                  <td>{{ item.machinery_type || '-' }}</td>
                  <td v-if="isAdmin">{{ item.barangay_name || '-' }}</td>
                  <td>{{ item.booking_count }}</td>
                  <td>
                    {{ formatNumber(item.total_area_booked) }}
                    <small>{{ item.area_unit_hint || '' }}</small>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div class="profit-breakdown">
          <div class="breakdown-card">
            <h3>Income Breakdown</h3>
            <p class="amount">₱{{ formatNumber(profitSummary.total_income) }}</p>
          </div>

          <div class="breakdown-card">
            <h3>Expense Breakdown</h3>
            <div class="expense-items">
              <div class="expense-item">
                <span>Fuel & Oil</span>
                <span>₱{{ formatNumber(expenseBreakdown.fuel_and_oil || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>Labor Cost</span>
                <span>₱{{ formatNumber(expenseBreakdown.labor_cost || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>Per Diem</span>
                <span>₱{{ formatNumber(expenseBreakdown.per_diem || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>Repair & Maintenance</span>
                <span>₱{{ formatNumber(expenseBreakdown.repair_and_maintenance || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>Office Supply</span>
                <span>₱{{ formatNumber(expenseBreakdown.office_supply || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>Communication</span>
                <span>₱{{ formatNumber(expenseBreakdown.communication_expense || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>Utilities</span>
                <span>₱{{ formatNumber(expenseBreakdown.utilities_expense || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>Sundries</span>
                <span>₱{{ formatNumber(expenseBreakdown.sundries || 0) }}</span>
              </div>
              <div class="expense-item total">
                <span>Total Expenses</span>
                <span>₱{{ formatNumber(expenseBreakdown.total || 0) }}</span>
              </div>
            </div>
          </div>

          <div class="breakdown-card profit">
            <h3>Net Profit</h3>
            <p class="amount" :class="{ negative: profitSummary.net_profit < 0 }">
              ₱{{ formatNumber(profitSummary.net_profit) }}
            </p>
          </div>
        </div>

        <!-- Profit Distribution Breakdown -->
        <div v-if="profitSummary.net_profit > 0" class="profit-distribution-section">
          <h3>Profit Distribution Allocation</h3>
          <p class="info-text">Net profit is distributed as follows:</p>
          
          <div class="distribution-grid">
            <div class="distribution-card org">
              <div class="distribution-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 21h18"/>
                  <path d="M5 21V7l7-4 7 4v14"/>
                  <path d="M9 21v-4h6v4"/>
                  <path d="M9 10h.01M15 10h.01"/>
                </svg>
              </div>
              <div class="distribution-content">
                <h4>Organization</h4>
                <p class="percentage">30%</p>
                <p class="amount">₱{{ formatNumber(profitDistribution.organization) }}</p>
              </div>
            </div>

            <div class="distribution-card training">
              <div class="distribution-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M12 3l8 4.5v9L12 21l-8-4.5v-9L12 3z"/>
                  <path d="M12 12l8-4.5"/>
                  <path d="M12 12v9"/>
                  <path d="M12 12L4 7.5"/>
                </svg>
              </div>
              <div class="distribution-content">
                <h4>Training & Development</h4>
                <p class="percentage">20%</p>
                <p class="amount">₱{{ formatNumber(profitDistribution.training) }}</p>
              </div>
            </div>

            <div class="distribution-card members">
              <div class="distribution-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
                  <circle cx="9" cy="7" r="4"/>
                  <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
                  <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
                </svg>
              </div>
              <div class="distribution-content">
                <h4>Members Distribution</h4>
                <p class="percentage">50%</p>
                <p class="amount">₱{{ formatNumber(profitDistribution.members) }}</p>
                <p v-if="totalMembers > 0" class="per-member">
                  Per Member: ₱{{ formatNumber(profitDistribution.per_member) }}
                </p>
              </div>
            </div>
          </div>

          <div v-if="canManage" class="distribution-actions">
            <button @click="generateProfitDistributionRecord" class="btn-primary">
              Generate Profit Distribution Record
            </button>
          </div>
        </div>

        <div v-else-if="profitSummary.net_profit === 0" class="empty-state">
          <p>No profit to distribute (Income = Expenses)</p>
        </div>

        <div v-else class="empty-state">
          <p>⚠️ Loss detected (Expenses > Income)</p>
        </div>
      </div>

      <!-- TAB 5: REPORTS -->
      <div v-if="activeTab === 'reports'" class="tab-content">
        <div class="section-header">
          <h2>Financial Reports</h2>
        </div>
        
        <!-- Report Generation Panel -->
        <div class="report-generator-panel">
          <div class="report-options-grid">
            <!-- Report Type Selection -->
            <div class="report-option-card">
              <h4>Report Period</h4>
              <div class="report-type-buttons">
                <button @click="generateReport('monthly')" class="report-type-btn" :class="{ active: reportData?.type === 'monthly' }" :disabled="reportLoading">
                  <span class="btn-text">Monthly</span>
                </button>
                <button @click="generateReport('quarterly')" class="report-type-btn" :class="{ active: reportData?.type === 'quarterly' }" :disabled="reportLoading">
                  <span class="btn-text">Quarterly</span>
                </button>
                <button @click="generateReport('annual')" class="report-type-btn" :class="{ active: reportData?.type === 'annual' }" :disabled="reportLoading">
                  <span class="btn-text">Annual</span>
                </button>
              </div>
              
              <!-- Custom Date Range -->
              <div class="custom-date-toggle">
                <label class="checkbox-inline">
                  <input type="checkbox" v-model="reportFilters.customDateRange" />
                  <span>Custom Date Range</span>
                </label>
              </div>
              <div v-if="reportFilters.customDateRange" class="custom-date-inputs">
                <div class="date-input-group">
                  <label>From:</label>
                  <input type="date" v-model="reportFilters.startDate" class="form-input-sm" />
                </div>
                <div class="date-input-group">
                  <label>To:</label>
                  <input type="date" v-model="reportFilters.endDate" class="form-input-sm" />
                </div>
                <button @click="generateReportCustom" class="btn-generate" :disabled="reportLoading || !reportFilters.startDate || !reportFilters.endDate">
                  {{ reportLoading ? 'Generating...' : 'Generate' }}
                </button>
              </div>
            </div>
            
            <!-- Report Sections Filter -->
            <div class="report-option-card">
              <h4>Include in Report</h4>
              <div class="filter-checkboxes">
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showSummary" />
                  <span>Summary</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showDistribution" />
                  <span>Profit Distribution</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showAllTransactions" />
                  <span>All Transactions</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showExpenses" />
                  <span>Expense Details</span>
                </label>
                <label class="filter-checkbox" title="Farmer Clients Transaction Record">
                  <input type="checkbox" v-model="reportFilters.showServiceLedger" />
                  <span>Farmer Clients Record</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showCollectiblesList" />
                  <span>List of Collectibles</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showBookings" />
                  <span>Bookings Summary</span>
                </label>
              </div>
            </div>
            
            <!-- Print/Export Actions -->
            <div class="report-option-card actions-card">
              <h4>Export Options</h4>
              
              <!-- Orientation Toggle -->
              <div class="orientation-setting">
                <span class="orientation-label">Page Orientation</span>
                <div class="orientation-toggle">
                  <button 
                    @click="printOrientation = 'portrait'" 
                    class="orient-btn" 
                    :class="{ active: printOrientation === 'portrait' }">
                    Portrait
                  </button>
                  <button 
                    @click="printOrientation = 'landscape'" 
                    class="orient-btn" 
                    :class="{ active: printOrientation === 'landscape' }">
                    Landscape
                  </button>
                </div>
              </div>

              <div class="action-buttons">
                <button @click="printReport" class="btn-action print" :disabled="!reportData">
                  <span>Print Report</span>
                </button>
                <button class="btn-action select-all" @click="selectAllFilters">
                  <span>Select All</span>
                </button>
                <button class="btn-action clear" @click="clearAllFilters">
                  <span>Clear All</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Machinery filter (after report option cards) -->
        <div class="filters-section reports-machinery-filter-bar">
          <div class="filter-group">
            <label class="filter-label">Machinery/Equipment:</label>
            <select v-model="filters.machinery_id" class="filter-input">
              <option value="">All Machinery/Equipment</option>
              <option v-for="m in machinery" :key="m.id" :value="m.id">
                {{ m.machinery_name }} ({{ m.machinery_type }})
              </option>
            </select>
          </div>
        </div>
        
        <!-- Loading State (initial generate only) -->
        <div v-if="reportLoading && !reportData" class="report-loading">
          <div class="loading-spinner"></div>
          <p>Generating report...</p>
        </div>
        
        <!-- Report Display -->
        <div
          v-if="reportData"
          class="report-display"
          :class="{ 'report-display-refreshing': reportLoading }"
          id="printable-report"
        >
          <div v-if="reportLoading" class="report-refresh-overlay" aria-live="polite">
            <div class="loading-spinner"></div>
            <p>Ina-update ang report...</p>
          </div>
          <!-- Report Header (CFA = Barangay scope; period from filter/API; no contact/address) -->
          <div class="report-header">
            <div class="report-logo">
              <img :src="reportLogoUrl" alt="CALFFA Logo" class="report-logo-image" />
              <div class="logo-text">
                <p class="report-cfa-line">
                  <strong>Name ng CFA:</strong> {{ reportBarangayNameForReport }}
                </p>
                <h3 class="report-doc-title">Machinery Financial Report</h3>
              </div>
            </div>
            <div class="report-meta">
              <h3>{{ reportData.type.charAt(0).toUpperCase() + reportData.type.slice(1) }} Transaction Report</h3>
              <p class="report-period-long">
                {{ formatReportPeriodLong(reportData.period.start, reportData.period.end) }}
              </p>
              <p class="report-generated">
                Generated: {{ formatReportDate(reportData.generated_at) }}
              </p>
            </div>
          </div>

          <!-- Farmer Clients Transaction Record (official collectibles-style sheet) -->
          <div v-if="reportFilters.showServiceLedger" class="collectibles-form-sheet farmer-clients-record-sheet">
            <div class="collectibles-form-title-block">
              <h2 class="collectibles-main-title">Farmer Clients Transaction Record</h2>
              <p class="collectibles-main-subtitle">Talaan ng Transaksyon ng mga Magsasakang Kliyente</p>
            </div>

            <div class="collectibles-meta-box collectibles-meta-box-compact">
              <div class="collectibles-meta-split">
                <div class="collectibles-meta-col collectibles-meta-col-left">
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Name ng CFA / Name of FCA:</span>
                    <span class="collectibles-meta-fill">{{ reportBarangayNameForReport }}</span>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Uri ng makinarya / Type of Farm Machinery:</span>
                    <span class="collectibles-meta-fill">{{ reportMachineryLabel }}</span>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Buwan saklaw ng talaan / Period covered:</span>
                    <span class="collectibles-meta-fill">{{ formatReportPeriodCompact(reportData.period.start, reportData.period.end) }}</span>
                  </div>
                </div>
                <div class="collectibles-meta-col collectibles-meta-col-right">
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Contact Person / Tauhan:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.contactPerson"
                        type="text"
                        data-sheet-field="contactPerson"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Cropping Period / Panahon ng Pagtatanim:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.croppingPeriod"
                        type="text"
                        data-sheet-field="croppingPeriod"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Address / Tirahan ng FCA:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.fcaAddress"
                        type="text"
                        data-sheet-field="fcaAddress"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Contact Number / Numero ng Telepono:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.contactNumber"
                        type="text"
                        data-sheet-field="contactNumber"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="collectibles-table-wrap fcr-responsive-wrap">
              <!-- Desktop / tablet: full table -->
              <div class="fcr-desktop-table">
                <table class="collectibles-data-table farmer-clients-record-table">
                  <thead>
                    <tr>
                      <th class="fcr-col-client">
                        Name of Client<br />
                        <span class="th-tl">(Pangalan ng Kliyente)</span>
                      </th>
                      <th class="fcr-col-loc">
                        Farm Location<br />
                        <span class="th-tl">(Lokasyon ng Bukid)</span>
                      </th>
                      <th class="fcr-col-cat">Category</th>
                      <th class="fcr-col-date">
                        Approved Schedule<br />
                        <span class="th-tl">(Aprubadong Iskedyul)</span>
                      </th>
                      <th class="fcr-col-date">
                        Actual Date<br />
                        <span class="th-tl">(Aktwal na Petsa)</span>
                      </th>
                      <th class="fcr-col-fee">
                        Service Fee<br />
                        <span class="th-tl">(Bayad sa Serbisyo)</span>
                      </th>
                      <th class="fcr-col-area">
                        Area Serviced<br />
                        <span class="th-tl">(Saklaw ng Serbisyo)</span>
                      </th>
                      <th class="fcr-col-hrs">Op. Hours</th>
                      <th class="fcr-col-amt text-right">
                        Total Amount<br />
                        <span class="th-tl">(Kabuuang Halaga)</span>
                      </th>
                      <th class="fcr-col-amt text-right">
                        Cash Collection<br />
                        <span class="th-tl">(Nakolektang Bayad)</span>
                      </th>
                      <th class="fcr-col-rcpt">Receipt No.</th>
                      <th class="fcr-col-amt text-right">
                        A/R<br />
                        <span class="th-tl">(Singilin)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in serviceLedgerRows" :key="'fcr-' + row.booking_id">
                      <td class="fcr-col-client">{{ row.client_name || '—' }}</td>
                      <td class="fcr-col-loc">{{ row.farm_location || '—' }}</td>
                      <td class="fcr-col-cat">{{ row.client_category || '—' }}</td>
                      <td class="fcr-col-date">{{ formatReportDateCompact(row.approved_schedule) }}</td>
                      <td class="fcr-col-date">{{ formatReportDateCompact(row.actual_service_date || row.booking_date) }}</td>
                      <td class="fcr-col-fee">{{ formatServiceFeeCompact(row) }}</td>
                      <td class="fcr-col-area">{{ formatAreaServicedCompact(row) }}</td>
                      <td class="fcr-col-hrs">N/A</td>
                      <td class="fcr-col-amt text-right">{{ formatReportMoneyCompact(row.total_price) }}</td>
                      <td class="fcr-col-amt text-right">{{ formatReportMoneyCompact(row.cash_collection) }}</td>
                      <td class="fcr-col-rcpt">{{ (row.last_receipt_number && String(row.last_receipt_number).trim()) || '—' }}</td>
                      <td class="fcr-col-amt text-right">{{ formatReportMoneyCompact(row.accounts_receivable) }}</td>
                    </tr>
                    <tr v-if="serviceLedgerRows.length === 0">
                      <td colspan="12" class="collectibles-empty-note">Walang rekord sa piniling saklaw ng petsa / No records in this period.</td>
                    </tr>
                  </tbody>
                  <tfoot v-if="serviceLedgerRows.length > 0">
                    <tr class="fcr-total-row">
                      <td colspan="8" class="fcr-total-label"><strong>Totals / Kabuuan</strong></td>
                      <td class="text-right fcr-col-amt"><strong>{{ formatReportMoneyCompact(serviceLedgerTotals.totalAmount) }}</strong></td>
                      <td class="text-right fcr-col-amt"><strong>{{ formatReportMoneyCompact(serviceLedgerTotals.cashCollection) }}</strong></td>
                      <td class="fcr-col-rcpt fcr-total-empty"></td>
                      <td class="text-right fcr-col-amt"><strong>{{ formatReportMoneyCompact(serviceLedgerTotals.accountsReceivable) }}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <!-- Mobile: one card per client record -->
              <div class="fcr-mobile-list">
                <p v-if="serviceLedgerRows.length === 0" class="fcr-mobile-empty">
                  Walang rekord sa piniling saklaw ng petsa / No records in this period.
                </p>
                <article
                  v-for="row in serviceLedgerRows"
                  :key="'fcr-m-' + row.booking_id"
                  class="fcr-mobile-card"
                >
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Name of Client</span>
                    <span class="fcr-mobile-value">{{ row.client_name || '—' }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Farm Location</span>
                    <span class="fcr-mobile-value">{{ row.farm_location || '—' }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Category</span>
                    <span class="fcr-mobile-value">{{ row.client_category || '—' }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Approved Schedule</span>
                    <span class="fcr-mobile-value">{{ formatReportDateCompact(row.approved_schedule) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Actual Date</span>
                    <span class="fcr-mobile-value">{{ formatReportDateCompact(row.actual_service_date || row.booking_date) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Service Fee</span>
                    <span class="fcr-mobile-value">{{ formatServiceFeeCompact(row) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Area Serviced</span>
                    <span class="fcr-mobile-value">{{ formatAreaServicedCompact(row) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Op. Hours</span>
                    <span class="fcr-mobile-value">N/A</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Total Amount</span>
                    <span class="fcr-mobile-value">{{ formatReportMoneyCompact(row.total_price) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Cash Collection</span>
                    <span class="fcr-mobile-value">{{ formatReportMoneyCompact(row.cash_collection) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Receipt No.</span>
                    <span class="fcr-mobile-value">{{ (row.last_receipt_number && String(row.last_receipt_number).trim()) || '—' }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">A/R</span>
                    <span class="fcr-mobile-value">{{ formatReportMoneyCompact(row.accounts_receivable) }}</span>
                  </div>
                </article>

                <div v-if="serviceLedgerRows.length > 0" class="fcr-mobile-totals">
                  <h4 class="fcr-mobile-totals-title">Totals / Kabuuan</h4>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Total Amount</span>
                    <span class="fcr-mobile-value"><strong>{{ formatReportMoneyCompact(serviceLedgerTotals.totalAmount) }}</strong></span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Cash Collection</span>
                    <span class="fcr-mobile-value"><strong>{{ formatReportMoneyCompact(serviceLedgerTotals.cashCollection) }}</strong></span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">A/R</span>
                    <span class="fcr-mobile-value"><strong>{{ formatReportMoneyCompact(serviceLedgerTotals.accountsReceivable) }}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- List of Collectibles (official collectibles-style sheet) -->
          <div v-if="reportFilters.showCollectiblesList" class="collectibles-form-sheet collectibles-list-sheet">
            <div class="collectibles-form-title-block">
              <h2 class="collectibles-main-title">List of Collectibles</h2>
              <p class="collectibles-main-subtitle">Talaan ng mga Singilin</p>
            </div>

            <div class="collectibles-meta-box collectibles-meta-box-compact">
              <div class="collectibles-meta-split">
                <div class="collectibles-meta-col collectibles-meta-col-left">
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Name ng CFA / Name of FCA:</span>
                    <span class="collectibles-meta-fill">{{ reportBarangayNameForReport }}</span>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Uri ng makinarya / Type of Farm Machinery:</span>
                    <span class="collectibles-meta-fill">{{ reportMachineryLabel }}</span>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Buwan saklaw ng talaan / Period covered:</span>
                    <span class="collectibles-meta-fill">{{ formatReportPeriodCompact(reportData.period.start, reportData.period.end) }}</span>
                  </div>
                </div>
                <div class="collectibles-meta-col collectibles-meta-col-right">
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Contact Person / Tauhan:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.contactPerson"
                        type="text"
                        data-sheet-field="contactPerson"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Cropping Period / Panahon ng Pagtatanim:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.croppingPeriod"
                        type="text"
                        data-sheet-field="croppingPeriod"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Address / Tirahan ng FCA:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.fcaAddress"
                        type="text"
                        data-sheet-field="fcaAddress"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                  <div class="collectibles-meta-field-block">
                    <span class="collectibles-meta-label-sm">Contact Number / Numero ng Telepono:</span>
                    <div class="sheet-fill-line">
                      <input
                        v-model="reportSheetMeta.contactNumber"
                        type="text"
                        data-sheet-field="contactNumber"
                        class="sheet-fill-input"
                        spellcheck="false"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="collectibles-table-wrap fcr-responsive-wrap">
              <div class="fcr-desktop-table">
                <table class="collectibles-data-table collectibles-list-table">
                  <thead>
                    <tr>
                      <th class="col-client">
                        Name of Client<br />
                        <span class="th-tl">(Pangalan ng Kliyente)</span>
                      </th>
                      <th class="col-ar text-right">
                        Accounts Receivables<br />
                        <span class="th-tl">(Sisingilin)</span>
                      </th>
                      <th class="col-cash text-right">
                        Cash Collection of Fees<br />
                        <span class="th-tl">(Nakolektang Bayad mula sa Singilin o Accounts Receivables)</span>
                      </th>
                      <th class="col-date">
                        Date of Payment<br />
                        <span class="th-tl">(Petsa kung Kailan Nagbayad)</span>
                      </th>
                      <th class="col-rcpt">Receipt No.</th>
                      <th class="col-bal text-right">
                        Remaining Balance<br />
                        <span class="th-tl">(Natitirang Balanse)</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="row in collectiblesListRows" :key="'col-' + row.booking_id">
                      <td class="col-client">{{ row.client_name || '—' }}</td>
                      <td class="col-ar text-right">{{ formatReportMoneyCompact(row.accounts_receivable) }}</td>
                      <td class="col-cash text-right">{{ formatReportMoneyCompact(row.cash_collection) }}</td>
                      <td class="col-date">{{ formatReportDateCompact(row.date_of_payment) }}</td>
                      <td class="col-rcpt">{{ (row.receipt_number && String(row.receipt_number).trim()) || '—' }}</td>
                      <td class="col-bal text-right">{{ formatReportMoneyCompact(row.remaining_balance) }}</td>
                    </tr>
                    <tr v-if="collectiblesListRows.length === 0">
                      <td colspan="6" class="collectibles-empty-note">Walang rekord sa piniling saklaw ng petsa / No records in this period.</td>
                    </tr>
                  </tbody>
                  <tfoot v-if="collectiblesListRows.length > 0">
                    <tr class="fcr-total-row">
                      <td class="col-client"><strong>Totals / Kabuuan</strong></td>
                      <td class="col-ar text-right"><strong>{{ formatReportMoneyCompact(collectiblesListTotals.accountsReceivable) }}</strong></td>
                      <td class="col-cash text-right"><strong>{{ formatReportMoneyCompact(collectiblesListTotals.cashCollection) }}</strong></td>
                      <td class="col-date"></td>
                      <td class="col-rcpt"></td>
                      <td class="col-bal text-right"><strong>{{ formatReportMoneyCompact(collectiblesListTotals.remainingBalance) }}</strong></td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              <div class="fcr-mobile-list">
                <p v-if="collectiblesListRows.length === 0" class="fcr-mobile-empty">
                  Walang rekord sa piniling saklaw ng petsa / No records in this period.
                </p>
                <div
                  v-for="row in collectiblesListRows"
                  :key="'col-m-' + row.booking_id"
                  class="fcr-mobile-card"
                >
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Name of Client</span>
                    <span class="fcr-mobile-value">{{ row.client_name || '—' }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Accounts Receivables</span>
                    <span class="fcr-mobile-value">{{ formatReportMoneyCompact(row.accounts_receivable) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Cash Collection</span>
                    <span class="fcr-mobile-value">{{ formatReportMoneyCompact(row.cash_collection) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Date of Payment</span>
                    <span class="fcr-mobile-value">{{ formatReportDateCompact(row.date_of_payment) }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Receipt No.</span>
                    <span class="fcr-mobile-value">{{ (row.receipt_number && String(row.receipt_number).trim()) || '—' }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Remaining Balance</span>
                    <span class="fcr-mobile-value">{{ formatReportMoneyCompact(row.remaining_balance) }}</span>
                  </div>
                </div>

                <div v-if="collectiblesListRows.length > 0" class="fcr-mobile-totals">
                  <h4 class="fcr-mobile-totals-title">Totals / Kabuuan</h4>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Accounts Receivables</span>
                    <span class="fcr-mobile-value"><strong>{{ formatReportMoneyCompact(collectiblesListTotals.accountsReceivable) }}</strong></span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Cash Collection</span>
                    <span class="fcr-mobile-value"><strong>{{ formatReportMoneyCompact(collectiblesListTotals.cashCollection) }}</strong></span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">Remaining Balance</span>
                    <span class="fcr-mobile-value"><strong>{{ formatReportMoneyCompact(collectiblesListTotals.remainingBalance) }}</strong></span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Summary -->
          <div v-if="reportFilters.showSummary" class="report-section report-section-card report-plain-section">
            <div class="section-title">
              <h4>Summary</h4>
            </div>
            <div class="table-container">
              <table class="data-table report-plain-table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th class="text-right">Amount</th>
                    <th>Records</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Total Expenses</td>
                    <td class="text-right">₱{{ reportData.summary.total_expenses.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td>{{ reportData.counts.expenses }} records</td>
                  </tr>
                  <tr>
                    <td>Total Income</td>
                    <td class="text-right">₱{{ reportData.summary.total_income.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td>{{ reportData.counts.income }} records</td>
                  </tr>
                  <tr>
                    <td>Total Collections</td>
                    <td class="text-right">₱{{ reportData.summary.total_collections.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td>{{ reportData.counts.collections }} payments</td>
                  </tr>
                  <tr>
                    <td>Net Profit/Loss</td>
                    <td class="text-right">₱{{ reportData.summary.net_profit.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td>{{ reportData.summary.net_profit >= 0 ? 'Profit' : 'Loss' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Profit Distribution -->
          <div v-if="reportFilters.showDistribution && reportData.summary.net_profit > 0" class="report-section report-section-card report-plain-section">
            <div class="section-title">
              <h4>Profit Distribution</h4>
            </div>
            <div class="table-container">
              <table class="data-table report-plain-table">
                <thead>
                  <tr>
                    <th>Allocation</th>
                    <th>Share</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Organization</td>
                    <td>30%</td>
                    <td class="text-right">₱{{ reportData.summary.distribution.organization_share.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                  <tr>
                    <td>Training</td>
                    <td>20%</td>
                    <td class="text-right">₱{{ reportData.summary.distribution.training_share.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                  <tr>
                    <td>Members</td>
                    <td>50%</td>
                    <td class="text-right">₱{{ reportData.summary.distribution.members_share.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                  <tr>
                    <td>Per Member ({{ reportData.summary.distribution.member_count }} members)</td>
                    <td>—</td>
                    <td class="text-right">₱{{ reportData.summary.distribution.per_member_share.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          <!-- All Transactions Table -->
          <div v-if="reportFilters.showAllTransactions" class="report-transactions report-section-card">
            <div class="section-title">
              <span class="section-icon">📝</span>
              <h4>All Transactions</h4>
              <span class="section-count">{{ reportData.transactions.all.length }} records</span>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Type</th>
                    <th>Machinery</th>
                    <th>Description</th>
                    <th>Farmer</th>
                    <th class="text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="txn in reportData.transactions.all" :key="txn.id + '-' + txn.transaction_type">
                    <td>{{ formatReportDate(txn.date) }}</td>
                    <td>
                      <span class="badge" :class="getTransactionTypeClass(txn.transaction_type)">
                        {{ txn.transaction_type }}
                      </span>
                    </td>
                    <td>{{ txn.machinery_name || '-' }}</td>
                    <td class="description-cell">{{ txn.description || '-' }}</td>
                    <td>{{ txn.farmer_name || '-' }}</td>
                    <td class="text-right" :class="txn.transaction_type === 'Expense' ? 'text-red' : 'text-green'">
                      {{ txn.transaction_type === 'Expense' ? '-' : '+' }}₱{{ parseFloat(txn.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}
                    </td>
                  </tr>
                  <tr v-if="reportData.transactions.all.length === 0">
                    <td colspan="6" class="empty-cell">No transactions found for this period</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Detailed Expenses Table -->
          <div v-if="reportFilters.showExpenses && reportData.transactions.expenses.length > 0" class="report-section report-section-card">
            <div class="section-title">
              <span class="section-icon">📤</span>
              <h4>Expense Details</h4>
              <span class="section-count">{{ reportData.transactions.expenses.length }} records</span>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Machinery</th>
                    <th>Particulars</th>
                    <th>Ref #</th>
                    <th class="text-right">Fuel & Oil</th>
                    <th class="text-right">Labor</th>
                    <th class="text-right">Per Diem</th>
                    <th class="text-right">R&M</th>
                    <th class="text-right">Others</th>
                    <th class="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="exp in reportData.transactions.expenses" :key="'exp-' + exp.id">
                    <td>{{ formatReportDate(exp.date) }}</td>
                    <td>{{ exp.machinery_name || '-' }}</td>
                    <td class="description-cell">{{ exp.description || '-' }}</td>
                    <td>{{ exp.reference_number || '-' }}</td>
                    <td class="text-right">₱{{ parseFloat(exp.fuel_and_oil || 0).toLocaleString() }}</td>
                    <td class="text-right">₱{{ parseFloat(exp.labor_cost || 0).toLocaleString() }}</td>
                    <td class="text-right">₱{{ parseFloat(exp.per_diem || 0).toLocaleString() }}</td>
                    <td class="text-right">₱{{ parseFloat(exp.repair_and_maintenance || 0).toLocaleString() }}</td>
                    <td class="text-right">₱{{ (parseFloat(exp.office_supply || 0) + parseFloat(exp.communication_expense || 0) + parseFloat(exp.utilities_expense || 0) + parseFloat(exp.sundries || 0)).toLocaleString() }}</td>
                    <td class="text-right text-red">₱{{ parseFloat(exp.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr class="total-row">
                    <td colspan="9"><strong>Total Expenses</strong></td>
                    <td class="text-right text-red"><strong>₱{{ reportData.summary.total_expenses.toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</strong></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
          
          <!-- Bookings Summary -->
          <div v-if="reportFilters.showBookings && reportData.transactions.bookings.length > 0" class="report-section report-section-card">
            <div class="section-title">
              <span class="section-icon">📅</span>
              <h4>Bookings Summary</h4>
              <span class="section-count">{{ reportData.transactions.bookings.length }} bookings</span>
            </div>
            <div class="table-container">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Booking #</th>
                    <th>Machinery</th>
                    <th>Farmer</th>
                    <th>Status</th>
                    <th class="text-right">Total Price</th>
                    <th class="text-right">Paid</th>
                    <th>Payment Status</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bk in reportData.transactions.bookings" :key="'bk-' + bk.id">
                    <td>{{ formatReportDate(bk.date) }}</td>
                    <td>#{{ bk.booking_id }}</td>
                    <td>{{ bk.machinery_name || '-' }}</td>
                    <td>{{ bk.farmer_name || '-' }}</td>
                    <td>
                      <span class="badge" :class="'badge-' + (bk.status || '').toLowerCase().replace(' ', '-')">
                        {{ bk.status }}
                      </span>
                    </td>
                    <td class="text-right">₱{{ parseFloat(bk.amount || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td class="text-right">₱{{ parseFloat(bk.total_paid || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td>
                      <span class="badge" :class="'badge-' + (bk.payment_status || '').toLowerCase()">
                        {{ bk.payment_status || 'Unpaid' }}
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
          
          <!-- Report Footer -->
          <div class="report-footer">
            <p>This report was generated automatically by CALFFA Financial Management System</p>
            <p class="footer-date">Report Date: {{ new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- EXPENSE FORM MODAL -->
    <div v-if="showExpenseForm" class="modal-overlay" @click.self="showExpenseForm = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>{{ editingExpense ? 'Edit Expense' : 'Record New Expense' }}</h2>
          <button @click="showExpenseForm = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Machinery / Equipment *</label>
            <select v-model="expenseForm.machinery_id" class="form-input">
              <option value="">-- Select Machinery/Equipment --</option>
              <option v-for="m in machinery" :key="m.id" :value="m.id">
                {{ m.machinery_name }} ({{ m.machinery_type }})
              </option>
            </select>
          </div>

          <div class="form-group">
            <label>Date of Expense *</label>
            <input v-model="expenseForm.date_of_expense" type="date" class="form-input" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Particulars (Details) *</label>
              <input v-model="expenseForm.particulars" type="text" class="form-input" placeholder="e.g., Fuel for machinery maintenance" />
            </div>
            <div class="form-group">
              <label>Receipt/Reference Number *</label>
              <input v-model="expenseForm.reference_number" type="text" class="form-input" placeholder="Enter receipt/reference number" required />
            </div>
          </div>

          <div class="expense-items-grid">
            <div class="form-group">
              <label>Fuel & Oil</label>
              <input v-model.number="expenseForm.fuel_and_oil" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
            <div class="form-group">
              <label>Labor Cost (Operator & Helper)</label>
              <input v-model.number="expenseForm.labor_cost" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
            <div class="form-group">
              <label>Per Diem (Incentive/hectare or hour)</label>
              <input v-model.number="expenseForm.per_diem" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
            <div class="form-group">
              <label>Repair & Maintenance</label>
              <input v-model.number="expenseForm.repair_and_maintenance" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
            <div class="form-group">
              <label>Office Supply (Ballpen, etc.)</label>
              <input v-model.number="expenseForm.office_supply" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
            <div class="form-group">
              <label>Communication (Load, Internet)</label>
              <input v-model.number="expenseForm.communication_expense" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
            <div class="form-group">
              <label>Utilities (Water & Electricity)</label>
              <input v-model.number="expenseForm.utilities_expense" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
            <div class="form-group">
              <label>Sundries (Other Expenses)</label>
              <input v-model.number="expenseForm.sundries" type="number" step="0.01" class="form-input" @input="updateTotal" />
            </div>
          </div>

          <div class="form-group">
            <label>Total Amount (Auto-Calculated) *</label>
            <input v-model.number="expenseForm.total_amount" type="number" step="0.01" class="form-input total-input" readonly />
            <small class="calculated">₱{{ formatNumber(expenseForm.total_amount) }}</small>
          </div>

          <div class="modal-actions">
            <button @click="showExpenseForm = false" class="btn-secondary">Cancel</button>
            <button @click="saveExpense" class="btn-success">{{ editingExpense ? 'Update' : 'Record' }} Expense</button>
          </div>
        </div>
      </div>
    </div>

    <!-- INCOME FORM MODAL -->
    <div v-if="showIncomeForm" class="modal-overlay" @click.self="showIncomeForm = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Record Income</h2>
          <button @click="showIncomeForm = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label>Date of Income *</label>
            <input v-model="incomeForm.date_of_income" type="date" class="form-input" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Machinery ID *</label>
              <input v-model.number="incomeForm.machinery_id" type="number" class="form-input" />
            </div>
            <div class="form-group">
              <label>Booking ID *</label>
              <input v-model.number="incomeForm.booking_id" type="number" class="form-input" />
            </div>
          </div>

          <div class="form-group">
            <label>Income Amount *</label>
            <input v-model.number="incomeForm.income_amount" type="number" step="0.01" class="form-input" />
          </div>

          <div class="form-group">
            <label>Remarks</label>
            <textarea v-model="incomeForm.remarks" class="form-input" placeholder="Optional notes"></textarea>
          </div>

          <div class="modal-actions">
            <button @click="showIncomeForm = false" class="btn-secondary">Cancel</button>
            <button @click="saveIncome" class="btn-success">Record Income</button>
          </div>
        </div>
      </div>
    </div>

    <!-- COLLECTION FORM MODAL -->
    <div v-if="showCollectionForm" class="modal-overlay" @click.self="showCollectionForm = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>💳 Record Payment / Collection</h2>
          <button @click="showCollectionForm = false" class="btn-close">×</button>
        </div>
        <div class="modal-body" v-if="editingCollection">
          <!-- Receivable Details -->
          <div class="form-group highlight-box">
            <label>Account Receivable Details:</label>
            <div class="details-grid">
              <div><strong>Farmer:</strong> {{ editingCollection.farmer_name }}</div>
              <div><strong>Machinery:</strong> {{ editingCollection.machinery_name }}</div>
              <div><strong>Total Amount:</strong> ₱{{ formatNumber(editingCollection.total_price) }}</div>
              <div v-if="editingCollection.pending_interest > 0"><strong>Includes Interest:</strong> ₱{{ formatNumber(editingCollection.pending_interest) }}</div>
              <div><strong>Already Collected:</strong> ₱{{ formatNumber(editingCollection.amount_collected || 0) }}</div>
              <div><strong>Current Balance:</strong> ₱{{ formatNumber(editingCollection.total_price - (editingCollection.amount_collected || 0)) }}</div>
              <div><strong>Due Date:</strong> {{ formatDate(getDueDate(editingCollection.booking_date)) }} <span v-if="isOverdue" style="color: #ef4444; font-weight: bold;">⚠️ OVERDUE</span></div>
            </div>
          </div>

          <!-- Payment Type Selection -->
          <fieldset class="form-group payment-type-group">
            <legend>Payment Type *</legend>
            <div class="radio-group">
              <label class="radio-label">
                <input v-model="collectionForm.paymentType" type="radio" value="full" @change="setFullPaymentAmount" />
                <span>Full Payment</span>
                <small>(Pay complete balance)</small>
              </label>
              <label class="radio-label">
                <input v-model="collectionForm.paymentType" type="radio" value="partial" />
                <span>Partial Payment</span>
                <small>(Pay partial amount)</small>
              </label>
            </div>
          </fieldset>

          <!-- Payment Amount -->
          <div class="form-row">
            <div class="form-group">
              <label>Payment Amount *</label>
              <input 
                v-model.number="collectionForm.paymentAmount" 
                type="number" 
                step="0.01" 
                class="form-input"
                :placeholder="collectionForm.paymentType === 'full' ? 'Full balance ' + formatNumber(remainingBalance) : 'Enter partial amount'"
                @input="validatePaymentAmount"
                :readonly="collectionForm.paymentType === 'full'"
              />
              <small v-if="collectionForm.paymentType === 'full'" class="info-text" style="color: #059669; font-weight: 600;">
                ✓ Auto-filled with full balance: ₱{{ formatNumber(remainingBalance) }}
              </small>
              <small v-if="showPartialWarning" class="warning-text">
                ⚠️ This amount equals the remaining balance. Consider using Full Payment instead.
              </small>
            </div>
            <div class="form-group">
              <label>Collection Date *</label>
              <input v-model="collectionForm.collectionDate" type="date" class="form-input" />
            </div>
          </div>

          <div v-if="collectionForm.paymentType === 'partial'" class="form-group payment-interest-box">
            <div class="interest-already-applied">
              <small style="color: #1d4ed8;">
                Auto Interest Rule: 2% (Partial). The system automatically adds 2% once, based on the full booking amount, when a partial payment is recorded.
              </small>
            </div>
          </div>

          <!-- Receipt Number -->
          <div class="form-group">
            <label>Receipt Number *</label>
            <input v-model="collectionForm.receiptNumber" type="text" class="form-input" placeholder="Enter receipt/reference number" required />
          </div>

          <!-- Remarks -->
          <div class="form-group">
            <label>Remarks</label>
            <textarea v-model="collectionForm.remarks" class="form-input" placeholder="Additional notes or details..."></textarea>
          </div>

          <!-- Summary -->
          <div class="modal-summary">
            <table class="summary-table">
              <tr>
                <td>Balance Due:</td>
                <td class="amount">₱{{ formatNumber(remainingBalance) }}</td>
              </tr>
              <tr>
                <td>Payment Amount:</td>
                <td class="amount">₱{{ formatNumber(collectionForm.paymentAmount || 0) }}</td>
              </tr>
              <tr class="total-row">
                <td><strong>Total Collection:</strong></td>
                <td class="amount"><strong>₱{{ formatNumber(totalCollectionAmount) }}</strong></td>
              </tr>
              <tr v-if="collectionForm.paymentType === 'partial'" class="balance-row">
                <td><strong>Remaining Balance After:</strong></td>
                <td class="amount"><strong>₱{{ formatNumber(remainingBalanceAfter) }}</strong></td>
              </tr>
            </table>
          </div>

          <div class="modal-actions">
            <button @click="showCollectionForm = false" class="btn-secondary">Cancel</button>
            <button @click="saveCollection" class="btn-success">Record Collection</button>
          </div>
        </div>
      </div>
    </div>

    <!-- MONTHLY DUES COLLECTION MODAL -->
    <div v-if="showDuesForm" class="modal-overlay" @click.self="showDuesForm = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>💰 Collect Monthly Dues</h2>
          <button @click="showDuesForm = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <!-- Farmer Selection -->
          <div class="form-group">
            <label>Select Farmer *</label>
            <div class="farmer-selection">
              <div v-if="selectedFarmer" class="selected-farmer">
                <div class="farmer-info">
                  <strong>{{ selectedFarmer.full_name }}</strong>
                  <small>{{ selectedFarmer.phone_number }}</small>
                  <span v-if="selectedFarmer.dues_paid" class="status-paid">✅ Paid for current period</span>
                  <span v-else class="status-unpaid">❌ Not paid for current period</span>
                </div>
                <button @click="selectedFarmer = null; duesForm.farmer_id = ''" class="btn-change">Change</button>
              </div>
              <div v-else class="farmer-list">
                <div class="farmer-search">
                  <input type="text" placeholder="Search farmers..." class="form-input" />
                </div>
                <div class="farmers-scroll">
                  <div
                    v-for="farmer in eligibleFarmers"
                    :key="farmer.id"
                    :class="['farmer-item', { 'paid': farmer.dues_paid }]"
                    @click="selectFarmer(farmer)"
                  >
                    <div class="farmer-info">
                      <strong>{{ farmer.full_name }}</strong>
                      <small>{{ farmer.phone_number }}</small>
                      <span v-if="farmer.dues_paid" class="status-badge paid">✅ Paid</span>
                      <span v-else class="status-badge unpaid">❌ Unpaid</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Collection Details -->
          <div v-if="selectedFarmer" class="form-row">
            <div class="form-group">
              <label>Collection Date *</label>
              <input v-model="duesForm.collection_date" type="date" class="form-input" />
            </div>
            <div class="form-group">
              <label>Payment Method</label>
              <select v-model="duesForm.payment_method" class="form-input">
                <option value="Cash">Cash</option>
                <option value="Bank Transfer">Bank Transfer</option>
                <option value="Check">Check</option>
                <option value="Digital Payment">Digital Payment</option>
              </select>
            </div>
          </div>

          <!-- Amount Display -->
          <div v-if="selectedFarmer" class="form-group highlight-box">
            <label>Collection Amount:</label>
            <div class="amount-display">
              <span class="amount-large">₱120.00</span>
              <small>(Monthly dues for 6-month period)</small>
            </div>
          </div>

          <!-- Remarks -->
          <div v-if="selectedFarmer" class="form-group">
            <label>Remarks</label>
            <textarea v-model="duesForm.remarks" class="form-input" placeholder="Additional notes or details..."></textarea>
          </div>

          <div class="modal-actions">
            <button @click="showDuesForm = false" class="btn-secondary">Cancel</button>
            <button @click="collectMonthlyDues" class="btn-success" :disabled="!selectedFarmer || !duesForm.collection_date">Collect Dues</button>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Messages -->
    <div v-if="alert.show" :class="['alert', 'alert-' + alert.type]">
      <span class="alert-message">{{ alert.message }}</span>
      <button @click="alert.show = false" class="alert-close">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useAuthStore } from '../stores/authStore';
import { useBackdropTheme } from '../composables/useBackdropTheme';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { isDark } = useBackdropTheme();
const isLight = computed(() => !isDark.value);
const reportLogoUrl = 'https://tse1.mm.bing.net/th/id/OIP.6bwLRZ62anox4000YCXuQwAAAA?rs=1&pid=ImgDetMain&o=7&rm=3';

const highlightedBookingId = ref(null);

// Get current user role
const userRole = computed(() => authStore.currentUser?.role);
const userBarangayId = computed(() => authStore.currentUser?.barangay_id);

// Admin barangay filter
const barangays = ref([]);
const selectedBarangayId = ref('');

// Authorization check - now includes auditor for viewing
const hasAccess = computed(() => {
  const role = authStore.currentUser?.role;
  return ['admin', 'president', 'treasurer'].includes(role);
});

// Check if user is treasurer (can manage/edit data)
const isTreasurer = computed(() => userRole.value === 'treasurer');

// Check if user is admin (sees only profit and reports tabs)
const isAdmin = computed(() => userRole.value === 'admin');

// Barangay tied to the report scope (admin = filter; others = user's barangay)
const reportEffectiveBarangayId = computed(() => {
  if (isAdmin.value) return selectedBarangayId.value || '';
  return userBarangayId.value != null && userBarangayId.value !== ''
    ? String(userBarangayId.value)
    : '';
});

const reportBarangayNameForReport = computed(() => {
  const bid = reportEffectiveBarangayId.value;
  if (!bid) {
    if (isAdmin.value) return '(Pumili ng Barangay sa filter sa itaas)';
    return '—';
  }
  const row = barangays.value.find((b) => String(b.id) === String(bid));
  return row?.name || bid;
});

// Check if user can manage (only treasurer)
const canManage = computed(() => isTreasurer.value);

// President and Treasurer can manage association dues transactions
const canCollectDues = computed(() => ['president', 'treasurer'].includes(userRole.value));

// Check if view only (president, auditor - no edit buttons)
const isViewOnly = computed(() => ['president', 'auditor'].includes(userRole.value));

// Compute filtered expenses based on selected machinery
const filteredExpenses = computed(() => {
  if (!filters.value.machinery_id) {
    return expenses.value;
  }
  return expenses.value.filter(exp => exp.machinery_id === parseInt(filters.value.machinery_id));
});

// Collection Form Computed Properties
const remainingBalance = computed(() => {
  if (!editingCollection.value) return 0;
  return editingCollection.value.total_price - (editingCollection.value.amount_collected || 0);
});

const totalCollectionAmount = computed(() => {
  // Total collection is just the payment amount (interest is added to remaining balance)
  return collectionForm.value.paymentAmount || 0;
});

const remainingBalanceAfter = computed(() => {
  if (collectionForm.value.paymentType === 'full') return 0;
  // Frontend preview excludes auto-interest because backend applies it server-side.
  const base = remainingBalance.value - (collectionForm.value.paymentAmount || 0);
  return base;
});

const showPartialWarning = computed(() => {
  if (collectionForm.value.paymentType !== 'partial') return false;
  return collectionForm.value.paymentAmount >= remainingBalance.value * 0.99; // 99% or more of balance
});

const getDueDate = (bookingDate) => {
  if (!bookingDate) return null;
  const d = new Date(bookingDate);
  d.setDate(d.getDate() + 30);
  return d;
};

// Check if booking is overdue (past 30 days from booking date)
const isOverdue = computed(() => {
  if (!editingCollection.value || !editingCollection.value.booking_date) return false;
  const bookingDate = new Date(editingCollection.value.booking_date);
  const dueDate = new Date(bookingDate);
  dueDate.setDate(dueDate.getDate() + 30);
  return new Date() > dueDate;
});

// Profit Distribution Calculation (30% Org, 20% Training, 50% Members)
const profitDistribution = computed(() => {
  const netProfit = profitSummary.value.net_profit || 0;
  const organization = netProfit * 0.30;      // 30% for organization
  const training = netProfit * 0.20;          // 20% for training
  const members = netProfit * 0.50;           // 50% for members distribution
  const perMember = totalMembers.value > 0 ? members / totalMembers.value : 0;
  
  return {
    organization: organization,
    training: training,
    members: members,
    per_member: perMember
  };
});

// Redirect if no access
if (!hasAccess.value) {
  onMounted(() => {
    if (!hasAccess.value) {
      router.push('/dashboard');
    }
  });
}

// Tabs - filtered based on role
// Admin: Only sees Profit Computation and Reports
// Others (Treasurer, President, Auditor): See all tabs
const activeTab = ref('expenses');
const allTabs = [
  { id: 'expenses', label: 'Expenses' },
  { id: 'income', label: 'Income' },
  { id: 'ar', label: 'A/R & Collections' },
  { id: 'profit', label: 'Profit Computation' },
  { id: 'reports', label: 'Reports' }
];

const tabs = computed(() => {
  if (isAdmin.value) {
    // Admin only sees profit and reports tabs
    return allTabs.filter(tab => ['profit', 'reports'].includes(tab.id));
  }
  if (!canCollectDues.value) {
    return allTabs.filter(tab => tab.id !== 'dues');
  }
  return allTabs;
});

// Set default active tab based on role
watch(() => userRole.value, (role) => {
  if (role === 'admin') {
    activeTab.value = 'profit';
  }
}, { immediate: true });

// State
const expenses = ref([]);
const income = ref([]);
const machinery = ref([]);
const arList = ref([]);
const collections = ref([]);
const collectionsSummary = ref({
  total_receivables: 0,
  total_collected: 0,
  total_balance: 0
});
const profitSummary = ref({
  total_income: 0,
  total_expenses: 0,
  net_profit: 0
});
const expenseBreakdown = ref({});
const totalMembers = ref(0); // Total cooperative members for distribution calculation
const bookingUsageLeaders = ref([]);

// Report data
const reportData = ref(null);
const reportLoading = ref(false);
const lastReportRequest = ref(null);
const reportFilters = ref({
  showSummary: true,
  showDistribution: true,
  showAllTransactions: true,
  showExpenses: true,
  showServiceLedger: true,
  showCollectiblesList: true,
  showBookings: true,
  customDateRange: false,
  startDate: '',
  endDate: ''
});

const reportSheetMeta = ref({
  contactPerson: '',
  croppingPeriod: '',
  fcaAddress: '',
  contactNumber: ''
});

const serviceLedgerRows = computed(() => {
  return reportData.value?.transactions?.service_ledger || [];
});

const collectiblesListRows = computed(() => {
  return reportData.value?.transactions?.collectibles_list || [];
});

const collectiblesListTotals = computed(() => {
  const rows = collectiblesListRows.value;
  return rows.reduce(
    (acc, row) => {
      acc.accountsReceivable += parseFloat(row.accounts_receivable || 0);
      acc.cashCollection += parseFloat(row.cash_collection || 0);
      acc.remainingBalance += parseFloat(row.remaining_balance || 0);
      return acc;
    },
    { accountsReceivable: 0, cashCollection: 0, remainingBalance: 0 }
  );
});

const farmerClientsMachineryLine = computed(() => {
  const rows = serviceLedgerRows.value;
  if (!rows?.length) return '—';
  const names = [...new Set(rows.map((r) => r.machinery_name).filter(Boolean))];
  return names.length ? names.join(', ') : '—';
});

const reportMachineryLabel = computed(() => {
  if (filters.value.machinery_id) {
    const m = machinery.value.find((item) => String(item.id) === String(filters.value.machinery_id));
    if (m) return `${m.machinery_name} (${m.machinery_type})`;
  }
  return farmerClientsMachineryLine.value;
});

const serviceLedgerTotals = computed(() => {
  const rows = serviceLedgerRows.value;
  return rows.reduce(
    (acc, row) => {
      acc.totalAmount += parseFloat(row.total_price || 0);
      acc.cashCollection += parseFloat(row.cash_collection || 0);
      acc.accountsReceivable += parseFloat(row.accounts_receivable || 0);
      return acc;
    },
    { totalAmount: 0, cashCollection: 0, accountsReceivable: 0 }
  );
});

const formatReportMoney = (num) => {
  const x = parseFloat(num);
  if (Number.isNaN(x)) return '—';
  return (
    '₱' +
    x.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
};

const formatReportMoneyCompact = (num) => {
  const x = parseFloat(num);
  if (Number.isNaN(x)) return '—';
  if (x === 0) return '₱0.00';
  return (
    '₱' +
    x.toLocaleString('en-PH', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })
  );
};

const compactUnitLabel = (unit) => {
  if (!unit) return '';
  if (unit === 'per hectare') return '/ha';
  if (unit === 'per load') return '/load';
  return unit.replace(/^per\s+/i, '/');
};

const formatServiceFeeRow = (row) => {
  const fee = parseFloat(row.unit_service_fee);
  const unit = row.unit_type || '';
  if (Number.isNaN(fee) || fee <= 0) {
    return unit ? `— ${unit}` : '—';
  }
  return `${formatReportMoney(fee)}${unit ? ` ${unit}` : ''}`;
};

const formatServiceFeeCompact = (row) => {
  const fee = parseFloat(row.unit_service_fee);
  const unit = compactUnitLabel(row.unit_type);
  if (Number.isNaN(fee) || fee <= 0) return unit ? `—${unit}` : '—';
  return `${formatReportMoneyCompact(fee)}${unit}`;
};

const formatAreaServiced = (row) => {
  const size = parseFloat(row.area_size);
  if (Number.isNaN(size) || size <= 0) return '—';
  const unit = row.area_unit || (row.unit_type === 'per load' ? 'load(s)' : 'hectare(s)');
  return `${size.toLocaleString('en-PH')} ${unit}`;
};

const formatAreaServicedCompact = (row) => {
  const size = parseFloat(row.area_size);
  if (Number.isNaN(size) || size <= 0) return '—';
  if (row.unit_type === 'per load' || (row.area_unit && /load/i.test(row.area_unit))) {
    return `${size} load${size !== 1 ? 's' : ''}`;
  }
  const unit = row.area_unit || 'ha';
  const shortUnit = /hectare/i.test(unit) ? 'ha' : unit;
  return `${size} ${shortUnit}`;
};

const printOrientation = ref('landscape');

const showExpenseForm = ref(false);
const showIncomeForm = ref(false);
const showCollectionForm = ref(false);
const editingExpense = ref(null);
const editingCollection = ref(null);

const filters = ref({
  machinery_id: '',
  income_source: 'all',
  start_date: '',
  end_date: ''
});

const expenseForm = ref({
  machinery_id: '',
  date_of_expense: '',
  particulars: '',
  reference_number: '',
  fuel_and_oil: 0,
  labor_cost: 0,
  per_diem: 0,
  repair_and_maintenance: 0,
  office_supply: 0,
  communication_expense: 0,
  utilities_expense: 0,
  sundries: 0,
  total_amount: 0
});

const incomeForm = ref({
  date_of_income: '',
  machinery_id: '',
  booking_id: '',
  income_amount: '',
  remarks: ''
});

const collectionForm = ref({
  paymentType: 'full', // 'full' or 'partial'
  paymentAmount: 0,
  collectionDate: new Date().toISOString().split('T')[0],
  receiptNumber: '',
  remarks: ''
});

const alert = ref({
  show: false,
  message: '',
  type: 'success'
});

// Monthly Dues State
const monthlyDues = ref([]);
const eligibleFarmers = ref([]);
const currentPeriod = ref({ start: '', end: '' });
const duesSummary = ref({
  total_collections: 0,
  total_amount: 0,
  unique_farmers: 0,
  last_collection_date: null
});
const showDuesForm = ref(false);
const selectedFarmer = ref(null);
const duesSearchQuery = ref('');
const filteredEligibleFarmers = computed(() => {
  const query = duesSearchQuery.value.trim().toLowerCase();
  if (!query) return eligibleFarmers.value;

  return eligibleFarmers.value.filter((farmer) => {
    return [
      farmer.reference_number,
      farmer.full_name,
      farmer.phone_number
    ].some(value => String(value || '').toLowerCase().includes(query));
  });
});

const selectedFarmerPayments = computed(() => {
  if (!selectedFarmer.value) return [];

  return monthlyDues.value.filter(payment => payment.farmer_id === selectedFarmer.value.id);
});

const selectedFarmerTotalPaid = computed(() => {
  return selectedFarmerPayments.value.reduce((sum, payment) => sum + parseFloat(payment.amount || 0), 0);
});

const paidFarmersCount = computed(() => eligibleFarmers.value.filter(farmer => Number(farmer.dues_paid)).length);
const unpaidFarmersCount = computed(() => eligibleFarmers.value.filter(farmer => !Number(farmer.dues_paid)).length);
const currentPeriodLabel = computed(() => formatDuesCoverage(currentPeriod.value.start, currentPeriod.value.end));
// Consolidated income records (direct income + collections + monthly dues)
const consolidatedIncomeRecords = computed(() => {
  const records = [];
  
  // Add direct income records
  if (income.value) {
    records.push(...income.value);
  }
  
  // Add collection transactions as income
  if (collections.value) {
    records.push(...collections.value.map(col => ({
      id: `collection-${col.id}`,
      income_id: col.id,
      income_type: 'Collection',
      date_of_income: col.collection_date,
      farmer_name: col.farmer_name || '-',
      machinery_name: col.machinery_name || 'Machinery Booking',
      machinery_type: col.machinery_type || '',
      booking_id: col.booking_id || col.id,
      income_amount: col.collection_amount,
      original_amount: col.original_amount || col.total_price,
      payment_status: 'Collected',
      remarks: col.remarks || '',
      period_start: null,
      period_end: null
    })));
  }
  
  // Add monthly dues as income
  if (monthlyDues.value) {
    records.push(...monthlyDues.value.map(dues => ({
      id: `dues-${dues.id}`,
      dues_id: dues.id,
      income_type: 'Association Dues',
      date_of_income: dues.collection_date,
      farmer_name: dues.farmer_name || '-',
      machinery_name: 'Association Dues',
      machinery_type: '',
      booking_id: null,
      income_amount: dues.amount || 120,
      original_amount: dues.amount || 120,
      payment_status: 'Collected',
      remarks: dues.remarks || '',
      period_start: dues.period_start || null,
      period_end: dues.period_end || null
    })));
  }
  
  // Filter by income source
  let filtered = records;
  if (filters.value.income_source === 'machinery') {
    filtered = records.filter(r => r.income_type === 'Collection');
  } else if (filters.value.income_source === 'dues') {
    filtered = records.filter(r => r.income_type === 'Association Dues');
  }
  
  // Filter by date range
  if (filters.value.start_date) {
    filtered = filtered.filter(r => new Date(r.date_of_income) >= new Date(filters.value.start_date));
  }
  if (filters.value.end_date) {
    filtered = filtered.filter(r => new Date(r.date_of_income) <= new Date(filters.value.end_date));
  }
  
  // Sort by date (most recent first)
  return filtered.sort((a, b) => new Date(b.date_of_income || 0) - new Date(a.date_of_income || 0));
});

const incomeSourceBreakdown = computed(() => {
  const sourceMap = new Map();
  for (const row of consolidatedIncomeRecords.value) {
    const source = row?.income_type || 'Income';
    const current = sourceMap.get(source) || { source, count: 0, total: 0 };
    current.count += 1;
    current.total += parseFloat(row?.income_amount || 0);
    sourceMap.set(source, current);
  }
  return Array.from(sourceMap.values()).sort((a, b) => b.total - a.total);
});

const duesForm = ref({
  farmer_id: '',
  collection_date: new Date().toISOString().split('T')[0],
  payment_method: 'Cash',
  remarks: ''
});

// Methods
const API_BASE_URL = 'http://localhost:3000/api';

const formatNumber = (num) => {
  if (!num) return '0.00';
  return parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-PH');
};

const formatRoleLabel = (role) => {
  const value = String(role || '').toLowerCase();
  if (!value) return 'Member';
  return value.charAt(0).toUpperCase() + value.slice(1);
};

const formatDuesCoverage = (start, end) => {
  if (!start || !end) return 'Current 6-month cycle';
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const isDuesIncome = (record) => {
  return String(record?.income_type || '').toLowerCase().includes('dues');
};

const getIncomeRowKey = (record) => {
  return record.income_id || record.booking_id || record.dues_id || `${record.date_of_income}-${record.farmer_name}`;
};

const calculateExpenseTotal = () => {
  const parseNum = (val) => {
    const num = parseFloat(val) || 0;
    return Math.max(0, num); // Ensure no negative values
  };
  
  const total = parseNum(expenseForm.value.fuel_and_oil) +
                parseNum(expenseForm.value.labor_cost) +
                parseNum(expenseForm.value.per_diem) +
                parseNum(expenseForm.value.repair_and_maintenance) +
                parseNum(expenseForm.value.office_supply) +
                parseNum(expenseForm.value.communication_expense) +
                parseNum(expenseForm.value.utilities_expense) +
                parseNum(expenseForm.value.sundries);
  
  // Round to 2 decimal places to avoid floating point errors
  return Math.round(total * 100) / 100;
};

const updateTotal = () => {
  expenseForm.value.total_amount = calculateExpenseTotal();
};

const normalizeNumericFields = (form) => {
  const numericFields = [
    'fuel_and_oil',
    'labor_cost',
    'per_diem',
    'repair_and_maintenance',
    'office_supply',
    'communication_expense',
    'utilities_expense',
    'sundries',
    'total_amount'
  ];
  
  numericFields.forEach(field => {
    const val = parseFloat(form[field]) || 0;
    form[field] = Math.max(0, val);
  });
  
  return form;
};

const loadExpenses = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.income_source && { income_source: filters.value.income_source }),
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id }),
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/expenses?${params}`);
    const data = await response.json();
    
    if (data.success) {
      expenses.value = data.expenses;
    }
  } catch (error) {
    console.error('Error loading expenses:', error);
    showAlert('Failed to load expenses', 'error');
  }
};

const loadMachinery = async () => {
  try {
    // Load machinery filtered by barangay for non-admin users
    const token = authStore.token;
    const response = await fetch(`${API_BASE_URL}/machinery/inventory`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    const data = await response.json();
    
    if (data.success) {
      machinery.value = data.inventory || [];
    }
  } catch (error) {
    console.error('Error loading machinery:', error);
  }
};

const loadBarangays = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/barangays`);
    const data = await response.json();
    if (data.success) {
      barangays.value = data.barangays || [];
    }
  } catch (error) {
    console.error('Error loading barangays:', error);
  }
};

const loadTotalMembers = async () => {
  try {
    // Load members for the user's barangay (for non-admin)
    const token = authStore.token;
    const response = await fetch(`${API_BASE_URL}/farmers`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    const data = await response.json();
    
    if (data.success) {
      // For non-admin users, filter by barangay
      const farmers = data.farmers || [];
      if (userRole.value !== 'admin' && userBarangayId.value) {
        totalMembers.value = farmers.filter(f => f.barangay_id === userBarangayId.value && f.status === 'approved').length;
      } else {
        totalMembers.value = farmers.filter(f => f.status === 'approved').length;
      }
    }
  } catch (error) {
    console.error('Error loading total members:', error);
  }
};

const loadIncome = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.income_source && { income_source: filters.value.income_source }),
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/income?${params}`);
    const data = await response.json();
    
    if (data.success) {
      income.value = data.income;
    }
  } catch (error) {
    console.error('Error loading income:', error);
    showAlert('Failed to load income records', 'error');
  }
};

const loadProfitSummary = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date }),
      ...(isAdmin.value && selectedBarangayId.value && { barangay_id: selectedBarangayId.value })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/profit-summary?${params}`);
    const data = await response.json();
    
    if (data.success) {
      profitSummary.value = data.summary;
    }
  } catch (error) {
    console.error('Error loading profit summary:', error);
  }
};

const loadExpenseBreakdown = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date }),
      ...(isAdmin.value && selectedBarangayId.value && { barangay_id: selectedBarangayId.value })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/expenses-breakdown?${params}`);
    const data = await response.json();
    
    if (data.success) {
      expenseBreakdown.value = data.breakdown;
    }
  } catch (error) {
    console.error('Error loading expense breakdown:', error);
  }
};

const loadBookingUsageStats = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date }),
      ...(isAdmin.value && selectedBarangayId.value && { barangay_id: selectedBarangayId.value }),
      limit: '10'
    });

    const response = await fetch(`${API_BASE_URL}/machinery-financial/booking-usage-stats?${params}`);
    const data = await response.json();

    if (data.success) {
      bookingUsageLeaders.value = data.leaders || [];
    }
  } catch (error) {
    console.error('Error loading booking usage stats:', error);
    bookingUsageLeaders.value = [];
  }
};

const saveExpense = async () => {
  try {
    // Validate required fields
    if (!expenseForm.value.machinery_id) {
      showAlert('Please select a Machinery/Equipment', 'error');
      return;
    }
    
    if (!expenseForm.value.date_of_expense) {
      showAlert('Please select a Date of Expense', 'error');
      return;
    }
    
    if (!expenseForm.value.particulars || expenseForm.value.particulars.trim() === '') {
      showAlert('Please enter Particulars (Details of expense)', 'error');
      return;
    }

    if (!expenseForm.value.reference_number || expenseForm.value.reference_number.trim() === '') {
      showAlert('Receipt/Reference number is required', 'error');
      return;
    }
    
    if (!expenseForm.value.total_amount || expenseForm.value.total_amount <= 0) {
      showAlert('Total Amount must be greater than 0', 'error');
      return;
    }
    
    const method = editingExpense.value ? 'PUT' : 'POST';
    const url = editingExpense.value 
      ? `${API_BASE_URL}/machinery-financial/expenses/${editingExpense.value.id}`
      : `${API_BASE_URL}/machinery-financial/expenses`;
    
    const payloadData = normalizeNumericFields({ ...expenseForm.value });
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...payloadData,
        user_id: authStore.currentUser.id
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert(
        editingExpense.value ? 'Expense updated successfully' : 'Expense recorded successfully',
        'success'
      );
      showExpenseForm.value = false;
      editingExpense.value = null;
      resetExpenseForm();
      loadExpenses();
      loadProfitSummary();
      loadExpenseBreakdown();
    } else {
      showAlert(data.message || 'Failed to save expense', 'error');
    }
  } catch (error) {
    console.error('Error saving expense:', error);
    showAlert('Failed to save expense', 'error');
  }
};

const saveIncome = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/machinery-financial/income`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...incomeForm.value,
        user_id: authStore.currentUser.id
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert('Income recorded successfully', 'success');
      showIncomeForm.value = false;
      resetIncomeForm();
      loadIncome();
      loadProfitSummary();
    } else {
      showAlert(data.message || 'Failed to save income', 'error');
    }
  } catch (error) {
    console.error('Error saving income:', error);
    showAlert('Failed to save income', 'error');
  }
};

const editExpense = (expense) => {
  editingExpense.value = expense;
  const normalized = normalizeNumericFields({ ...expense });
  expenseForm.value = normalized;
  showExpenseForm.value = true;
};

const deleteExpense = async (id) => {
  if (!confirm('Are you sure you want to delete this expense?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/machinery-financial/expenses/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: authStore.currentUser.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert('Expense deleted successfully', 'success');
      loadExpenses();
      loadProfitSummary();
      loadExpenseBreakdown();
    } else {
      showAlert(data.message || 'Failed to delete expense', 'error');
    }
  } catch (error) {
    console.error('Error deleting expense:', error);
    showAlert('Failed to delete expense', 'error');
  }
};

const deleteIncome = async (id) => {
  if (!confirm('Are you sure you want to delete this income record?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/machinery-financial/income/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: authStore.currentUser.id })
    });
    
    if (response.ok) {
      showAlert('Income deleted successfully', 'success');
      loadIncome();
      loadProfitSummary();
    }
  } catch (error) {
    console.error('Error deleting income:', error);
    showAlert('Failed to delete income', 'error');
  }
};

// ==================== ACCOUNTS RECEIVABLE & COLLECTIONS ====================

const loadARData = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/ar?${params}`);
    const data = await response.json();
    
    if (data.success) {
      arList.value = data.ar || [];
      collectionsSummary.value = data.summary || {
        total_receivables: 0,
        total_collected: 0,
        total_balance: 0
      };
    }
  } catch (error) {
    console.error('Error loading AR data:', error);
    showAlert('Failed to load A/R data', 'error');
  }
};

const loadCollections = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/collections?${params}`);
    const data = await response.json();
    
    if (data.success) {
      collections.value = data.collections || [];
    }
  } catch (error) {
    console.error('Error loading collections:', error);
    showAlert('Failed to load collections', 'error');
  }
};

const recordCollection = (ar) => {
  editingCollection.value = ar;
  showCollectionForm.value = true;
};

const deleteCollection = async (id) => {
  if (!confirm('Are you sure you want to delete this collection record?')) return;
  
  try {
    const response = await fetch(`${API_BASE_URL}/machinery-financial/collections/${id}`, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: authStore.currentUser.id })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert('Collection deleted successfully', 'success');
      loadCollections();
      loadARData();
      loadProfitSummary();
    }
  } catch (error) {
    console.error('Error deleting collection:', error);
    showAlert('Failed to delete collection', 'error');
  }
};

const setFullPaymentAmount = () => {
  // Auto-fill full payment with remaining balance
  collectionForm.value.paymentAmount = remainingBalance.value;
};

const validatePaymentAmount = () => {
  if (collectionForm.value.paymentType === 'full') {
    // For full payment, always match remaining balance
    collectionForm.value.paymentAmount = remainingBalance.value;
  } else if (collectionForm.value.paymentType === 'partial') {
    // For partial payment, ensure it doesn't exceed remaining balance
    if (collectionForm.value.paymentAmount > remainingBalance.value) {
      collectionForm.value.paymentAmount = remainingBalance.value;
      showAlert('Payment amount cannot exceed remaining balance', 'error');
    }
    // If partial amount equals full balance, auto-switch to Full Payment
    if (collectionForm.value.paymentAmount > 0 && Math.abs(collectionForm.value.paymentAmount - remainingBalance.value) < 0.01) {
      collectionForm.value.paymentType = 'full';
      showAlert('Amount equals full balance — switched to Full Payment automatically.', 'success');
    }
  }
};

const saveCollection = async () => {
  try {
    // Validation
    if (!collectionForm.value.collectionDate) {
      showAlert('Please select collection date', 'error');
      return;
    }
    
    if (collectionForm.value.paymentAmount <= 0) {
      showAlert('Payment amount must be greater than 0', 'error');
      return;
    }

    if (!collectionForm.value.receiptNumber || collectionForm.value.receiptNumber.trim() === '') {
      showAlert('Receipt number is required', 'error');
      return;
    }
    
    if (collectionForm.value.paymentAmount > remainingBalance.value + 0.01) {
      showAlert('Payment amount cannot exceed remaining balance (₱' + formatNumber(remainingBalance.value) + ')', 'error');
      return;
    }

    // Block partial payment if amount equals full balance
    if (collectionForm.value.paymentType === 'partial' && Math.abs(collectionForm.value.paymentAmount - remainingBalance.value) < 0.01) {
      collectionForm.value.paymentType = 'full';
      showAlert('Amount equals full balance — switched to Full Payment.', 'success');
      return;
    }
    
    // Prepare collection data
    const collectionData = {
      booking_id: editingCollection.value.booking_id || editingCollection.value.id,
      machinery_id: editingCollection.value.machinery_id,
      collection_amount: collectionForm.value.paymentAmount,
      collection_date: collectionForm.value.collectionDate,
      payment_method: 'cash', // Always cash for face-to-face payment
      receipt_number: collectionForm.value.receiptNumber.trim(),
      remarks: collectionForm.value.remarks || null,
      user_id: authStore.currentUser.id,
      payment_type: collectionForm.value.paymentType, // 'full' or 'partial'
      total_collection: totalCollectionAmount.value
    };
    
    // Save collection to backend
    const response = await fetch(`${API_BASE_URL}/machinery-financial/collections`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(collectionData)
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert(
        `Collection recorded successfully: ₱${formatNumber(collectionForm.value.paymentAmount)}. Payment moved to income section.`,
        'success'
      );
      
      showCollectionForm.value = false;
      resetCollectionForm();
      loadCollections();
      loadARData();
      loadIncome(); // Refresh income to show new collection
      loadProfitSummary();
    } else {
      showAlert(data.message || 'Failed to record collection', 'error');
    }
  } catch (error) {
    console.error('Error saving collection:', error);
    showAlert('Failed to record collection', 'error');
  }
};

const resetCollectionForm = () => {
  collectionForm.value = {
    paymentType: 'full',
    paymentAmount: 0,
    collectionDate: new Date().toISOString().split('T')[0],
    receiptNumber: '',
    remarks: ''
  };
  editingCollection.value = null;
};

const clearFilters = () => {
  filters.value.machinery_id = '';
  filters.value.income_source = 'all';
  filters.value.start_date = '';
  filters.value.end_date = '';
  loadExpenses();
  loadIncome();
  loadCollections();
  loadMonthlyDues();
  loadProfitSummary();
  loadExpenseBreakdown();
};

const distributeProfit = () => {
  showAlert('Profit distribution feature coming soon', 'success');
};

const generateProfitDistributionRecord = async () => {
  try {
    if (!canManage.value) {
      showAlert('Only treasurers can generate distribution records.', 'error');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/machinery-financial/profit-distribution/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user_id: authStore.currentUser.id,
        start_date: filters.value.start_date || null,
        end_date: filters.value.end_date || null,
        distribution_period: `${filters.value.start_date || 'beginning'} to ${filters.value.end_date || 'present'}`
      })
    });

    const data = await response.json();

    if (data.success) {
      showAlert('Profit distribution generated successfully.', 'success');
    } else {
      showAlert(data.message || 'Failed to generate profit distribution.', 'error');
    }
  } catch (error) {
    console.error('Error generating profit distribution record:', error);
    showAlert('Failed to generate profit distribution.', 'error');
  }
};

const generateReport = async (type, options = {}) => {
  const { silent = false } = options;
  if (!authStore.currentUser?.id) {
    showAlert('User not authenticated', 'error');
    return;
  }
  
  reportLoading.value = true;
  try {
    const response = await fetch(buildReportApiUrl({ type }));
    const data = await response.json();
    
    if (data.success) {
      reportData.value = data.report;
      lastReportRequest.value = { type };
      if (!silent) {
        showAlert(`${type.charAt(0).toUpperCase() + type.slice(1)} report generated successfully`, 'success');
      }
    } else {
      showAlert(data.message || 'Failed to generate report', 'error');
    }
  } catch (error) {
    console.error('Error generating report:', error);
    showAlert('Failed to generate report', 'error');
  } finally {
    reportLoading.value = false;
  }
};

const refreshCurrentReport = async (options = {}) => {
  const { silent = true } = options;
  if (!lastReportRequest.value || !authStore.currentUser?.id) return;

  const { type, startDate, endDate } = lastReportRequest.value;
  if (type === 'custom') {
    if (!startDate || !endDate) return;
    await generateReportCustom({ silent });
    return;
  }
  await generateReport(type, { silent });
};

const formatReportDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-PH', { 
    year: 'numeric', 
    month: 'short', 
    day: 'numeric' 
  });
};

const formatReportDateCompact = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return '—';
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  const yy = String(d.getFullYear()).slice(-2);
  return `${mm}/${dd}/${yy}`;
};

/** Compact period line for the farmer clients record header */
const formatReportPeriodCompact = (startStr, endStr) => {
  if (!startStr || !endStr) return '—';
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—';
  const fmt = (d) =>
    d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
  return `${fmt(start)} – ${fmt(end)}`;
};

/** e.g. Mula March 1 – September 30, Year: 2026 (from report / filter period) */
const formatReportPeriodLong = (startStr, endStr) => {
  if (!startStr || !endStr) return '-';
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '-';
  const monthDay = (d) =>
    d.toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
  const y1 = start.getFullYear();
  const y2 = end.getFullYear();
  if (y1 === y2) {
    return `Mula ${monthDay(start)} – ${monthDay(end)}, Year: ${y1}`;
  }
  return `Mula ${monthDay(start)}, Year: ${y1} – ${monthDay(end)}, Year: ${y2}`;
};

const buildReportApiUrl = ({ type, startDate, endDate }) => {
  const params = new URLSearchParams({
    user_id: String(authStore.currentUser.id),
    type: type || 'custom'
  });
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
  if (isAdmin.value && selectedBarangayId.value) {
    params.set('barangay_id', String(selectedBarangayId.value));
  }
  if (filters.value.machinery_id) {
    params.set('machinery_id', String(filters.value.machinery_id));
  }
  return `${API_BASE_URL}/machinery-financial/reports/transactions?${params.toString()}`;
};

const getTransactionTypeClass = (type) => {
  switch (type) {
    case 'Expense': return 'badge-expense';
    case 'Income': return 'badge-income';
    case 'Collection': return 'badge-collection';
    default: return '';
  }
};

// Report filter helper functions
const selectAllFilters = () => {
  reportFilters.value.showSummary = true;
  reportFilters.value.showDistribution = true;
  reportFilters.value.showAllTransactions = true;
  reportFilters.value.showExpenses = true;
  reportFilters.value.showServiceLedger = true;
  reportFilters.value.showCollectiblesList = true;
  reportFilters.value.showBookings = true;
};

const clearAllFilters = () => {
  reportFilters.value.showSummary = false;
  reportFilters.value.showDistribution = false;
  reportFilters.value.showAllTransactions = false;
  reportFilters.value.showExpenses = false;
  reportFilters.value.showServiceLedger = false;
  reportFilters.value.showCollectiblesList = false;
  reportFilters.value.showBookings = false;
};

// Generate report with custom date range
const generateReportCustom = async (options = {}) => {
  const { silent = false } = options;
  if (!authStore.currentUser?.id) {
    showAlert('User not authenticated', 'error');
    return;
  }
  
  if (!reportFilters.value.startDate || !reportFilters.value.endDate) {
    showAlert('Please select both start and end dates', 'error');
    return;
  }
  
  reportLoading.value = true;
  try {
    const response = await fetch(
      buildReportApiUrl({
        type: 'custom',
        startDate: reportFilters.value.startDate,
        endDate: reportFilters.value.endDate
      })
    );
    const data = await response.json();
    
    if (data.success) {
      reportData.value = data.report;
      lastReportRequest.value = {
        type: 'custom',
        startDate: reportFilters.value.startDate,
        endDate: reportFilters.value.endDate
      };
      if (!silent) {
        showAlert('Custom date range report generated successfully', 'success');
      }
    } else {
      showAlert(data.message || 'Failed to generate report', 'error');
    }
  } catch (error) {
    console.error('Error generating report:', error);
    showAlert('Failed to generate report', 'error');
  } finally {
    reportLoading.value = false;
  }
};

// Print report function — opens popup with report content for printing
let reportPrintFrame = null;

const removeReportPrintFrame = () => {
  if (reportPrintFrame) {
    reportPrintFrame.remove();
    reportPrintFrame = null;
  }
};

/** Clone report DOM and replace fill-in inputs with printed underline text (inputs don't serialize in outerHTML). */
const buildPrintableReportHtml = (root) => {
  const clone = root.cloneNode(true);
  const sheetFields = [
    ['contactPerson', reportSheetMeta.value.contactPerson],
    ['croppingPeriod', reportSheetMeta.value.croppingPeriod],
    ['fcaAddress', reportSheetMeta.value.fcaAddress],
    ['contactNumber', reportSheetMeta.value.contactNumber]
  ];

  for (const [field, value] of sheetFields) {
    clone.querySelectorAll(`[data-sheet-field="${field}"]`).forEach((input) => {
      const span = document.createElement('span');
      span.className = 'collectibles-meta-fill collectibles-meta-fill-printed';
      span.textContent = value || '';
      if (!value) span.innerHTML = '&nbsp;';
      const line = input.closest('.sheet-fill-line');
      if (line) {
        line.replaceWith(span);
      } else {
        input.replaceWith(span);
      }
    });
  }

  // Never print the mobile card layout — desktop table only
  clone.querySelectorAll('.fcr-mobile-list').forEach((el) => el.remove());

  return clone.outerHTML;
};

/** Self-contained print CSS — iframe cannot rely on Vue scoped styles or viewport media queries. */
const getMachineryReportPrintStyles = (orientation) => {
  const pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  return `
    @page { size: ${pageSize}; margin: 8mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #printable-report {
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: #fff !important;
      width: 100%;
    }
    #printable-report .report-header {
      background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
      color: #fff;
      padding: 16px 20px;
      border-radius: 12px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      justify-content: space-between;
      gap: 12px;
    }
    #printable-report .report-logo {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    #printable-report .report-logo-image {
      width: 52px;
      height: 52px;
      object-fit: contain;
    }
    #printable-report .report-meta { text-align: right; }
    #printable-report .report-meta h3 { margin: 0 0 6px; font-size: 1.1rem; }
    #printable-report .report-period-long,
    #printable-report .report-generated { margin: 4px 0; font-size: 0.85rem; opacity: 0.92; }
    #printable-report .report-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #64748b;
      font-size: 11px;
    }
    #printable-report .collectibles-form-sheet {
      margin: 16px 0 20px;
      padding: 18px 20px 20px;
      background: #fff;
      border: 2px solid #0f172a;
      border-radius: 12px;
      box-shadow: none;
      page-break-inside: avoid;
    }
    #printable-report .collectibles-form-title-block {
      text-align: center;
      margin-bottom: 14px;
    }
    #printable-report .collectibles-main-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
    }
    #printable-report .collectibles-main-subtitle {
      margin: 5px 0 0;
      font-size: 1rem;
      font-weight: 700;
      color: #334155;
    }
    #printable-report .collectibles-meta-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #f8fafc;
    }
    #printable-report .collectibles-meta-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      align-items: start;
    }
    #printable-report .collectibles-meta-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    #printable-report .collectibles-meta-col-left {
      padding-right: 12px;
      border-right: 1px solid #cbd5e1;
    }
    #printable-report .collectibles-meta-col-right { padding-left: 4px; }
    #printable-report .collectibles-meta-field-block {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
    }
    #printable-report .collectibles-meta-label-sm {
      font-size: 0.72rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
    }
    #printable-report .collectibles-meta-fill,
    #printable-report .collectibles-meta-fill-printed {
      display: block;
      width: 100%;
      min-height: 22px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 2px 4px 4px;
      line-height: 1.3;
    }
    #printable-report .sheet-fill-line,
    #printable-report .sheet-fill-input { display: none !important; }
    #printable-report .collectibles-table-wrap,
    #printable-report .fcr-responsive-wrap {
      overflow: visible !important;
      width: 100%;
    }
    #printable-report .fcr-mobile-list { display: none !important; }
    #printable-report .fcr-desktop-table {
      display: block !important;
      width: 100% !important;
    }
    #printable-report .collectibles-data-table,
    #printable-report .farmer-clients-record-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 0.62rem !important;
      display: table !important;
    }
    #printable-report .farmer-clients-record-table thead { display: table-header-group !important; }
    #printable-report .farmer-clients-record-table tbody { display: table-row-group !important; }
    #printable-report .farmer-clients-record-table tfoot { display: table-footer-group !important; }
    #printable-report .farmer-clients-record-table tr { display: table-row !important; }
    #printable-report .collectibles-data-table th,
    #printable-report .collectibles-data-table td,
    #printable-report .farmer-clients-record-table th,
    #printable-report .farmer-clients-record-table td {
      display: table-cell !important;
      border: 1px solid #1e293b !important;
      padding: 4px 3px !important;
      vertical-align: middle !important;
      line-height: 1.25 !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }
    #printable-report .collectibles-data-table th,
    #printable-report .farmer-clients-record-table th {
      background: #e2e8f0 !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      text-align: center !important;
      font-size: 0.58rem !important;
    }
    #printable-report .farmer-clients-record-table td {
      font-weight: 600 !important;
      color: #0f172a !important;
      font-size: 0.62rem !important;
    }
    #printable-report .farmer-clients-record-table .th-tl {
      display: block;
      margin-top: 2px;
      font-size: 0.85em;
      font-weight: 600;
      color: #475569;
      line-height: 1.15;
    }
    #printable-report .farmer-clients-record-table .fcr-col-client { width: 11%; text-align: left !important; }
    #printable-report .farmer-clients-record-table .fcr-col-loc { width: 10%; text-align: left !important; }
    #printable-report .farmer-clients-record-table .fcr-col-cat { width: 6%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-date { width: 7%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-fee { width: 9%; text-align: right !important; }
    #printable-report .farmer-clients-record-table .fcr-col-area { width: 7%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-hrs { width: 5%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-amt { width: 9%; text-align: right !important; }
    #printable-report .farmer-clients-record-table .fcr-col-rcpt { width: 7%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .text-right { text-align: right !important; }
    #printable-report .farmer-clients-record-table .fcr-total-row td {
      background: #f1f5f9 !important;
      font-weight: 800 !important;
      border-top: 2px solid #0f172a !important;
    }
    #printable-report .collectibles-list-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 0.68rem !important;
      display: table !important;
    }
    #printable-report .collectibles-list-table thead { display: table-header-group !important; }
    #printable-report .collectibles-list-table tbody { display: table-row-group !important; }
    #printable-report .collectibles-list-table tfoot { display: table-footer-group !important; }
    #printable-report .collectibles-list-table tr { display: table-row !important; }
    #printable-report .collectibles-list-table th,
    #printable-report .collectibles-list-table td {
      display: table-cell !important;
      border: 1px solid #1e293b !important;
      padding: 5px 4px !important;
      vertical-align: middle !important;
      line-height: 1.25 !important;
      word-wrap: break-word !important;
    }
    #printable-report .collectibles-list-table th {
      background: #e2e8f0 !important;
      font-weight: 800 !important;
      text-align: center !important;
      font-size: 0.62rem !important;
    }
    #printable-report .collectibles-list-table td {
      font-weight: 600 !important;
      font-size: 0.68rem !important;
    }
    #printable-report .collectibles-list-table .col-client { width: 22%; text-align: left !important; }
    #printable-report .collectibles-list-table .col-ar { width: 15%; text-align: right !important; }
    #printable-report .collectibles-list-table .col-cash { width: 18%; text-align: right !important; }
    #printable-report .collectibles-list-table .col-date { width: 14%; text-align: center !important; }
    #printable-report .collectibles-list-table .col-rcpt { width: 14%; text-align: center !important; }
    #printable-report .collectibles-list-table .col-bal { width: 17%; text-align: right !important; }
    #printable-report .collectibles-list-table .text-right { text-align: right !important; }
    #printable-report .collectibles-list-table .fcr-total-row td {
      background: #f1f5f9 !important;
      font-weight: 800 !important;
      border-top: 2px solid #0f172a !important;
    }
    #printable-report .collectibles-empty-note {
      text-align: center;
      color: #64748b;
      padding: 12px !important;
    }
    #printable-report .report-plain-section,
    #printable-report .report-section {
      page-break-inside: avoid;
      margin-bottom: 16px;
    }
    #printable-report .report-plain-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    #printable-report .report-plain-table th,
    #printable-report .report-plain-table td {
      border: 1px solid #e5e7eb;
      padding: 8px 10px;
    }
    #printable-report .text-right { text-align: right; }
  `;
};

const printReport = async () => {
  if (!reportData.value) {
    showAlert('No report data to print', 'error');
    return;
  }
  
  const printContents = document.getElementById('printable-report');
  if (!printContents) {
    showAlert('Report content not found', 'error');
    return;
  }
  await nextTick();

  removeReportPrintFrame();

  const iframe = document.createElement('iframe');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.border = '0';
  iframe.style.opacity = '0';
  iframe.style.pointerEvents = 'none';
  // Match A4 width so table-layout: fixed computes the same as on desktop screen
  iframe.style.width = printOrientation.value === 'landscape' ? '1123px' : '794px';
  iframe.style.height = '1px';

  document.body.appendChild(iframe);
  reportPrintFrame = iframe;

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  const iframeWindow = iframe.contentWindow;

  if (!iframeDoc || !iframeWindow) {
    removeReportPrintFrame();
    showAlert('Unable to prepare print preview', 'error');
    return;
  }

  const printableHtml = buildPrintableReportHtml(printContents);

  const printMarkup = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>CALFFA Machinery Financial Report</title>
  <style>${getMachineryReportPrintStyles(printOrientation.value)}</style>
</head>
<body>
  ${printableHtml}
</body>
</html>`;

  iframeDoc.open();
  iframeDoc.write(printMarkup);
  iframeDoc.close();

  window.setTimeout(() => {
    iframeWindow.focus();
    iframeWindow.print();
  }, 350);

  iframeWindow.addEventListener('afterprint', removeReportPrintFrame, { once: true });

  // Fallback cleanup for browsers that do not reliably fire afterprint
  window.setTimeout(removeReportPrintFrame, 60000);
};

const resetExpenseForm = () => {
  expenseForm.value = {
    machinery_id: '',
    date_of_expense: '',
    particulars: '',
    reference_number: '',
    fuel_and_oil: 0,
    labor_cost: 0,
    per_diem: 0,
    repair_and_maintenance: 0,
    office_supply: 0,
    communication_expense: 0,
    utilities_expense: 0,
    sundries: 0,
    total_amount: 0
  };
};

const resetIncomeForm = () => {
  incomeForm.value = {
    date_of_income: '',
    machinery_id: '',
    booking_id: '',
    income_amount: '',
    remarks: ''
  };
};

const showAlert = (message, type = 'success') => {
  alert.value = { show: true, message, type };
  setTimeout(() => {
    alert.value.show = false;
  }, 3000);
};

// Monthly Dues Methods
const loadMonthlyDues = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    });

    const response = await fetch(`${API_BASE_URL}/machinery-financial/monthly-dues?${params}`);
    const data = await response.json();

    if (data.success) {
      monthlyDues.value = data.dues;
    }
  } catch (error) {
    console.error('Error loading monthly dues:', error);
    showAlert('Failed to load monthly dues records', 'error');
  }
};

const loadEligibleFarmers = async () => {
  try {
    const response = await fetch(`${API_BASE_URL}/machinery-financial/monthly-dues/eligible-farmers?user_id=${authStore.currentUser.id}`);
    const data = await response.json();

    if (data.success) {
      eligibleFarmers.value = (data.farmers || []).map(farmer => ({
        ...farmer,
        last_payment_date: farmer.collection_date || null
      }));
      currentPeriod.value = data.current_period;

      if (selectedFarmer.value) {
        const refreshedSelectedFarmer = eligibleFarmers.value.find(farmer => farmer.id === selectedFarmer.value.id);
        selectedFarmer.value = refreshedSelectedFarmer || null;
      }
    }
  } catch (error) {
    console.error('Error loading eligible farmers:', error);
    showAlert('Failed to load registered members', 'error');
  }
};

const loadDuesSummary = async () => {
  try {
    const params = new URLSearchParams({
      user_id: authStore.currentUser.id,
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    });

    const response = await fetch(`${API_BASE_URL}/machinery-financial/monthly-dues/summary?${params}`);
    const data = await response.json();

    if (data.success) {
      duesSummary.value = data.summary;
    }
  } catch (error) {
    console.error('Error loading dues summary:', error);
  }
};

const collectMonthlyDues = async () => {
  try {
    if (!duesForm.value.farmer_id) {
      showAlert('Please select a member', 'error');
      return;
    }

    if (!duesForm.value.collection_date) {
      showAlert('Please select collection date', 'error');
      return;
    }

    const response = await fetch(`${API_BASE_URL}/machinery-financial/monthly-dues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...duesForm.value,
        user_id: authStore.currentUser.id
      })
    });

    const data = await response.json();

    if (data.success) {
      showAlert(`Association dues recorded successfully: ₱${formatNumber(120)} from ${data.farmer_name}`, 'success');
      showDuesForm.value = false;
      resetDuesForm();
      loadMonthlyDues();
      loadEligibleFarmers();
      loadDuesSummary();
      loadIncome(); // Refresh income to show new dues
      loadProfitSummary();
    } else {
      showAlert(data.message || 'Failed to collect monthly dues', 'error');
    }
  } catch (error) {
    console.error('Error collecting monthly dues:', error);
    showAlert('Failed to collect monthly dues', 'error');
  }
};

const resetDuesForm = () => {
  duesForm.value = {
    farmer_id: '',
    collection_date: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    remarks: ''
  };
  selectedFarmer.value = null;
};

const selectFarmer = (farmer) => {
  selectedFarmer.value = farmer;
  duesForm.value.farmer_id = farmer.id;
};

// Watch for admin barangay filter changes
watch(selectedBarangayId, () => {
  if (isAdmin.value) {
    loadProfitSummary();
    loadExpenseBreakdown();
    loadBookingUsageStats();
    if (activeTab.value === 'reports' && lastReportRequest.value) {
      refreshCurrentReport();
    } else {
      reportData.value = null;
      lastReportRequest.value = null;
    }
  }
});

const applyMachineryFilterRefresh = () => {
  if (activeTab.value === 'reports' && lastReportRequest.value) {
    refreshCurrentReport();
  }
  if (activeTab.value === 'expenses') {
    loadExpenses();
  }
  if (activeTab.value === 'ar') {
    loadARData();
    loadCollections();
  }
};

watch(() => filters.value.machinery_id, applyMachineryFilterRefresh);

const getDefaultTabForRole = () => (isAdmin.value ? 'profit' : 'expenses');

const resolveTabFromQuery = (tabQuery) => {
  const validTabs = ['expenses', 'income', 'dues', 'ar', 'profit', 'reports'];
  const requestedTab = tabQuery === 'monthly-dues' ? 'dues' : tabQuery;

  if (!requestedTab || !validTabs.includes(requestedTab)) {
    return getDefaultTabForRole();
  }

  if (requestedTab === 'dues' && !canCollectDues.value) {
    return getDefaultTabForRole();
  }

  return requestedTab;
};

const isDuesOnlyView = computed(() => {
  const requestedTab = route.query.tab === 'monthly-dues' ? 'dues' : route.query.tab;
  return requestedTab === 'dues' && canCollectDues.value;
});

// Watch for changes to refresh consolidated income
watch([income, collections, monthlyDues], () => {
  // This will trigger the consolidatedIncomeRecords computed property to update
}, { deep: true });

watch(
  () => route.query.tab,
  (tab) => {
    activeTab.value = resolveTabFromQuery(tab);
  },
  { immediate: true }
);

// Load data on mount
// Ctrl+P handler: intercept and trigger report print when on reports tab with data
const handleKeyDown = (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key === 'p') {
    if (activeTab.value === 'reports' && reportData.value) {
      e.preventDefault();
      printReport();
    }
  }
};

onMounted(async () => {
  // Listen for Ctrl+P
  window.addEventListener('keydown', handleKeyDown);

  if (hasAccess.value) {
    loadExpenses();
    loadIncome();
    loadARData();
    loadCollections();
    loadProfitSummary();
    loadExpenseBreakdown();
    loadBookingUsageStats();
    loadMachinery();
    loadTotalMembers();
    loadMonthlyDues();
    loadEligibleFarmers();
    loadDuesSummary();
    // Load barangays for admin filter
    if (isAdmin.value) {
      loadBarangays();
    }
  }

  // Handle notification highlight
  if (route.query.highlight && route.query.type === 'booking') {
    highlightedBookingId.value = route.query.highlight;
    // Switch to AR tab
    activeTab.value = 'ar';
    await nextTick();
    setTimeout(() => {
      const el = document.querySelector(`[data-booking-id="${route.query.highlight}"]`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
      setTimeout(() => { highlightedBookingId.value = null; }, 6000);
    }, 500);
  }
});

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeyDown);
  removeReportPrintFrame();
});
</script>

<style scoped>
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
  0%, 100% { box-shadow: inset 0 0 0 2px rgba(74, 222, 128, 0.2); }
  50% { box-shadow: inset 0 0 0 2px rgba(74, 222, 128, 0.6); }
}

/* ===== GLASSMORPHIC GREEN THEME ===== */
.financial-container {
  --glass-bg: rgba(29, 43, 33, 0.92);
  --glass-bg-soft: rgba(35, 52, 41, 0.84);
  --glass-panel: rgba(31, 48, 36, 0.94);
  --glass-line: rgba(255, 255, 255, 0.1);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --text-soft: rgba(220, 238, 211, 0.62);
  --green: #34d399;
  --yellow: #86efac;
  --blue: #22c55e;
  --teal: #2dd4bf;
  --lime: #a3e635;
  --red: #f87171;
  
  min-height: 100vh;
  padding: 28px;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  position: relative;
  isolation: isolate;
  overflow: visible;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: var(--text-main);
}

.financial-container::before,
.financial-container::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.financial-container::before {
  background:
    radial-gradient(ellipse 82% 56% at 12% 88%, rgba(17, 94, 41, 0.22) 0%, transparent 62%),
    radial-gradient(ellipse 75% 55% at 92% 10%, rgba(34, 197, 94, 0.14) 0%, transparent 64%),
    radial-gradient(circle at 50% 16%, rgba(45, 212, 191, 0.11) 0%, transparent 22%),
    linear-gradient(130deg, rgba(163, 230, 53, 0.03) 0%, transparent 38%, rgba(45, 212, 191, 0.03) 100%);
  animation: ambienceDrift 16s ease-in-out infinite alternate;
}

.financial-container::after {
  background:
    radial-gradient(circle at 94% 8%, rgba(34, 197, 94, 0.2) 0%, transparent 17%),
    radial-gradient(circle at 8% 86%, rgba(74, 222, 128, 0.16) 0%, transparent 20%),
    radial-gradient(circle at 80% 74%, rgba(45, 212, 191, 0.18) 0%, transparent 18%),
    radial-gradient(circle at 22% 30%, rgba(163, 230, 53, 0.14) 0%, transparent 16%),
    repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 14px);
  filter: blur(10px);
  animation: orbPulse 11s ease-in-out infinite;
}

@keyframes ambienceDrift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  100% {
    transform: translate3d(-10px, 8px, 0) scale(1.03);
  }
}

@keyframes orbPulse {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.financial-container > * {
  position: relative;
  z-index: 1;
}

.page-header {
  margin-bottom: 28px;
  padding: 36px 40px;
  background: linear-gradient(135deg, rgba(28, 41, 31, 0.94) 0%, rgba(35, 54, 40, 0.9) 56%, rgba(48, 78, 62, 0.84) 100%);
  border-radius: 26px;
  border: 1px solid var(--glass-line);
  box-shadow:
    18px 18px 34px rgba(8, 14, 10, 0.5),
    -14px -14px 26px rgba(42, 61, 46, 0.4),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset -1px -1px 0 rgba(0, 0, 0, 0.34);
  position: relative;
  overflow: hidden;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 760px;
  margin-left: 0;
  margin-right: auto;
  align-items: flex-start;
  text-align: left;
}

.page-header::before {
  content: '';
  position: absolute;
  inset: -35% -10% auto auto;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.22) 0%, rgba(45, 212, 191, 0) 68%);
  pointer-events: none;
}

.page-header::after {
  content: '';
  position: absolute;
  inset: auto auto -50% -8%;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(163, 230, 53, 0.18) 0%, rgba(163, 230, 53, 0) 70%);
  pointer-events: none;
}

.page-header h1 {
  font-size: 38px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.9px;
  margin: 0;
  background: linear-gradient(90deg, #86efac 0%, #4ade80 45%, #22c55e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.page-subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 500;
}

.access-denied {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
  padding: 32px;
}

.denied-content {
  text-align: center;
  background: var(--glass-bg);
  border: 1px solid var(--glass-line);
  border-radius: 24px;
  padding: 48px;
  backdrop-filter: blur(18px);
  box-shadow:
    16px 16px 30px rgba(8, 14, 10, 0.52),
    -14px -14px 28px rgba(42, 61, 46, 0.44),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08);
}

.denied-icon {
  font-size: 64px;
  margin-bottom: 16px;
}

.denied-text {
  font-size: 24px;
  color: var(--text-main);
  margin-bottom: 8px;
  font-weight: 700;
}

.denied-reason {
  color: var(--text-soft);
  font-size: 14px;
}

.summary-cards {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 18px;
  margin-bottom: 24px;
}

.distribution-actions {
  margin-top: 16px;
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}

.summary-card {
  background: linear-gradient(145deg, rgba(32, 48, 37, 0.96), rgba(24, 36, 28, 0.94));
  border: 1px solid rgba(190, 235, 203, 0.24);
  border-radius: 18px;
  padding: 22px 24px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow:
    12px 12px 24px rgba(8, 13, 10, 0.52),
    0 0 0 1px rgba(20, 32, 24, 0.5),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -20px 24px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.summary-card:hover {
  transform: translateY(-3px);
  box-shadow:
    18px 18px 32px rgba(8, 13, 10, 0.56),
    0 14px 28px rgba(16, 56, 33, 0.26),
    inset 1px 1px 0 rgba(255, 255, 255, 0.1);
}

.summary-card::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 88% 12%, rgba(163, 230, 53, 0.14) 0%, rgba(163, 230, 53, 0) 44%),
    linear-gradient(160deg, rgba(255, 255, 255, 0.04) 0%, transparent 55%);
  pointer-events: none;
}

.summary-card::after {
  content: '';
  position: absolute;
  width: 120px;
  height: 120px;
  border-radius: 999px;
  right: -36px;
  bottom: -40px;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.16) 0%, rgba(45, 212, 191, 0) 70%);
  pointer-events: none;
}

.summary-card:nth-child(odd) {
  animation: cardFloat 9s ease-in-out infinite;
}

.summary-card:nth-child(even) {
  animation: cardFloat 11s ease-in-out infinite reverse;
}

.income-card {
  border-image: linear-gradient(135deg, rgba(74, 222, 128, 0.8), rgba(74, 222, 128, 0.2)) 1;
}

.expense-card {
  border-image: linear-gradient(135deg, rgba(74, 222, 128, 0.75), rgba(22, 163, 74, 0.25)) 1;
}

.profit-card {
  border-image: linear-gradient(135deg, rgba(34, 197, 94, 0.85), rgba(16, 185, 129, 0.28)) 1;
}

.profit-card.negative {
  border-image: linear-gradient(135deg, rgba(248, 113, 113, 0.85), rgba(251, 191, 36, 0.2)) 1;
}

.card-icon {
  font-size: 42px;
  width: 58px;
  height: 58px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(22, 163, 74, 0.22));
  flex-shrink: 0;
}

.card-content {
  display: flex;
  flex-direction: column;
}

.card-label {
  color: #111;
  font-size: 13px;
  font-weight: 900;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  margin-bottom: 6px;
  text-shadow: none;
}

.card-amount {
  font-size: 33px;
  font-weight: 900;
  line-height: 1;
  letter-spacing: -0.7px;
  color: #1a5c2a;
  text-shadow: none;
}

.tabs-container {
  display: flex;
  gap: 14px;
  margin-bottom: 26px;
  flex-wrap: nowrap;
  width: 100%;
}

.tab {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 14px 22px;
  border: 1px solid rgba(134, 239, 172, 0.35);
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.95), rgba(220, 252, 231, 0.9));
  cursor: pointer;
  font-size: 1rem;
  font-weight: 800;
  color: #14532d;
  border-radius: 14px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  min-height: 52px;
  flex: 1 1 0;
  text-align: center;
  box-shadow: 0 8px 16px rgba(3, 16, 10, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.tab-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-width: 0;
}

.tab-icon {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  color: currentColor;
}

.tab-label {
  line-height: 1.25;
  white-space: nowrap;
}

.tab:hover {
  background: linear-gradient(135deg, rgba(220, 252, 231, 1), rgba(187, 247, 208, 0.96));
  border-color: rgba(22, 163, 74, 0.45);
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(3, 16, 10, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.tab.active {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%);
  border-color: rgba(167, 243, 208, 0.65);
  color: #ffffff;
  box-shadow: 0 12px 22px rgba(6, 78, 35, 0.35), inset 0 1px 0 rgba(220, 252, 231, 0.22);
}

.tab.active .tab-icon {
  color: #ffffff;
}

@media (max-width: 768px) {
  .tabs-container {
    flex-wrap: wrap;
  }

  .tab {
    padding: 12px 16px;
    font-size: 0.9375rem;
    min-height: 48px;
    flex: 1 1 calc(50% - 10px);
  }

  .tab-label {
    white-space: normal;
    text-align: center;
  }
}

.tab-content {
  background: var(--glass-bg);
  border: 1px solid var(--glass-line);
  border-radius: 18px;
  padding: 24px 28px;
  backdrop-filter: blur(18px);
  box-shadow:
    14px 14px 26px rgba(8, 13, 10, 0.5),
    0 0 0 1px rgba(20, 32, 24, 0.45),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -26px 30px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.tab-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 10%, rgba(163, 230, 53, 0.08) 0%, rgba(163, 230, 53, 0) 28%),
    radial-gradient(circle at 88% 88%, rgba(45, 212, 191, 0.08) 0%, rgba(45, 212, 191, 0) 30%);
  pointer-events: none;
}

@keyframes cardFloat {
  0%,
  100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
}

.section-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main);
}

.filters-section {
  display: flex;
  gap: 14px;
  margin-bottom: 24px;
  flex-wrap: wrap;
  align-items: end;
  padding: 14px 16px;
  border-radius: 14px;
  border: 1px solid rgba(187, 247, 208, 0.22);
  background: linear-gradient(135deg, rgba(39, 58, 45, 0.72), rgba(26, 41, 32, 0.7));
}

.filter-input,
.filter-select-glass {
  padding: 11px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  font-size: 15px;
  background: rgba(39, 58, 45, 0.92);
  color: var(--text-main);
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.34), inset -2px -2px 4px rgba(255, 255, 255, 0.04);
  transition: all 0.2s ease;
  min-height: 44px;
}

.filter-input:focus,
.filter-select-glass:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.34), 0 0 0 3px rgba(74, 222, 128, 0.1);
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 190px;
  flex: 1;
}

.filter-label {
  font-size: 13px;
  font-weight: 800;
  color: rgba(220, 238, 211, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.75px;
}

.filter-actions {
  margin-left: auto;
  display: flex;
  gap: 10px;
  align-self: end;
}

.table-container {
  overflow-x: auto;
  border-radius: 16px;
  border: 1px solid var(--glass-line);
  background: rgba(255, 255, 255, 0.03);
  backdrop-filter: blur(10px);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
}

.expenses-table,
.income-table,
.ar-table,
.collections-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 16px;
}

.expenses-table th:not(:last-child),
.income-table th:not(:last-child),
.ar-table th:not(:last-child),
.collections-table th:not(:last-child),
.expenses-table td:not(:last-child),
.income-table td:not(:last-child),
.ar-table td:not(:last-child),
.collections-table td:not(:last-child) {
  border-right: 1px solid rgba(167, 211, 178, 0.22);
}

.expenses-table thead,
.income-table thead,
.ar-table thead,
.collections-table thead {
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.08), rgba(255, 255, 255, 0.04));
}

.expenses-table th,
.income-table th,
.ar-table th,
.collections-table th {
  padding: 16px 18px;
  text-align: center;
  vertical-align: middle;
  font-weight: 800;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  font-size: 14px;
  text-transform: uppercase;
  letter-spacing: 0.8px;
  background: rgba(74, 222, 128, 0.08);
}

.expenses-table td,
.income-table td,
.ar-table td,
.collections-table td {
  padding: 16px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  vertical-align: middle;
}

.expenses-table tbody tr:nth-child(even),
.income-table tbody tr:nth-child(even),
.ar-table tbody tr:nth-child(even),
.collections-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.expenses-table tbody tr:hover,
.income-table tbody tr:hover,
.ar-table tbody tr:hover,
.collections-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.12);
  transition: all 0.2s ease;
}

.amount-cell {
  font-weight: 800;
  font-size: 15px;
  color: #b7f7c8;
  font-family: 'Courier New', monospace;
  text-align: center;
}

.amount-cell.balance {
  color: #bbf7d0;
  font-weight: 800;
}

.amount-cell.balance.highlight {
  background: rgba(248, 113, 113, 0.25);
  color: #fecaca;
  font-weight: 900;
  padding: 10px 14px;
  border-radius: 10px;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.ar-section,
.collections-section {
  margin-top: 24px;
}

.section-subheader {
  margin-bottom: 16px;
}

.section-subheader h3 {
  font-size: 19px;
  font-weight: 800;
  color: var(--text-main);
  margin: 0;
}

.ar-card {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.18), rgba(22, 163, 74, 0.12));
  border: 1px solid rgba(74, 222, 128, 0.24);
  padding: 12px;
  border-radius: 12px;
}

.collected-card {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.15), rgba(74, 222, 128, 0.1));
  border: 1px solid rgba(74, 222, 128, 0.2);
  padding: 12px;
  border-radius: 12px;
}

.balance-card {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.15), rgba(248, 113, 113, 0.1));
  border: 1px solid rgba(248, 113, 113, 0.2);
  padding: 12px;
  border-radius: 12px;
}

/* A/R summary cards: equal-size responsive layout */
.summary-container {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 14px;
  margin-bottom: 18px;
}

.summary-container > .summary-card {
  min-height: 148px;
  height: 100%;
  padding: 20px 16px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 11px;
  border-radius: 16px;
  transition: transform 220ms ease, box-shadow 240ms ease, border-color 220ms ease;
}

.summary-container > .summary-card:hover {
  transform: translateY(-3px) scale(1.01);
  border-color: rgba(187, 247, 208, 0.42);
  box-shadow: 0 16px 28px rgba(2, 10, 6, 0.3), inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.summary-container > .summary-card .card-content {
  align-items: center;
}

.summary-container > .summary-card .card-label {
  color: #f1fdf5;
  font-size: 12.5px;
  font-weight: 900;
  letter-spacing: 1.1px;
  text-transform: uppercase;
  margin-bottom: 4px;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
}

.summary-container > .summary-card .card-amount {
  font-size: clamp(2.1rem, 3.7vw, 2.5rem);
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.02em;
  text-shadow: 0 1px 0 rgba(0, 0, 0, 0.15);
}

.summary-container > .summary-card .card-icon {
  width: 52px;
  height: 52px;
  font-size: 30px;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.26);
  box-shadow: 0 10px 18px rgba(0, 0, 0, 0.24), inset 0 1px 0 rgba(255, 255, 255, 0.28);
  transition: transform 220ms ease, box-shadow 240ms ease, filter 220ms ease;
}

.summary-container > .summary-card:hover .card-icon {
  transform: translateY(-1px) scale(1.06);
  filter: saturate(1.08);
  box-shadow: 0 12px 22px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.32);
}

.summary-container .ar-card .card-icon.icon-receivables {
  background: linear-gradient(135deg, rgba(134, 239, 172, 0.42), rgba(34, 197, 94, 0.28));
}

.summary-container .collected-card .card-icon.icon-collected {
  background: linear-gradient(135deg, rgba(187, 247, 208, 0.4), rgba(16, 185, 129, 0.28));
}

.summary-container .balance-card .card-icon.icon-balance {
  background: linear-gradient(135deg, rgba(254, 202, 202, 0.75), rgba(248, 113, 113, 0.55));
  border-color: rgba(239, 68, 68, 0.45);
  color: #7f1d1d;
  font-size: 32px;
  box-shadow: 0 12px 22px rgba(127, 29, 29, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.35);
}

.summary-container .ar-card .card-amount {
  color: #86efac;
}

.summary-container .collected-card .card-amount {
  color: #bbf7d0;
}

.summary-container .balance-card .card-amount {
  color: #fca5a5;
}

@media (max-width: 980px) {
  .summary-container {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .summary-container {
    grid-template-columns: 1fr;
  }
}

.btn-primary-small {
  padding: 8px 14px;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.26), rgba(22, 163, 74, 0.2));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.3);
  border-radius: 10px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary-small:hover {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.36), rgba(22, 163, 74, 0.3));
  border-color: var(--green);
  transform: translateY(-1px);
}

.status-badge {
  display: inline-block;
  padding: 6px 12px;
  border-radius: 12px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.status-badge.full-payment {
  background: rgba(74, 222, 128, 0.2);
  color: #b7f7c8;
}

.status-badge.partial-payment {
  background: rgba(74, 222, 128, 0.2);
  color: #d1fae5;
}

.status-badge.unpaid {
  background: rgba(248, 113, 113, 0.2);
  color: #fecaca;
}

.status-badge.collected {
  background: rgba(34, 197, 94, 0.22);
  color: #ecfdf5;
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.income-table .badge {
  display: inline-flex;
  align-items: center;
  padding: 5px 12px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.income-table .badge-income {
  background: rgba(74, 222, 128, 0.2);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.income-table .badge-collection {
  background: rgba(96, 165, 250, 0.2);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.35);
}

.actions-cell {
  display: flex;
  gap: 8px;
  justify-content: center;
  align-items: center;
}

.btn-edit,
.btn-delete {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s;
  color: var(--green);
}

.btn-edit:hover {
  opacity: 0.9;
}

.btn-delete:hover {
  opacity: 0.9;
  color: var(--red);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-soft);
}

.info-text {
  padding: 12px 16px;
  background: rgba(34, 197, 94, 0.12);
  border-left: 4px solid var(--green);
  color: #d1fae5;
  border-radius: 8px;
  margin-bottom: 16px;
  font-size: 14px;
  font-weight: 500;
}

.profit-breakdown {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 24px;
  align-items: start;
}

.breakdown-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(190, 235, 203, 0.18);
  border-radius: 14px;
  padding: 20px 22px;
  backdrop-filter: blur(6px);
}

.breakdown-card h3 {
  margin: 0 0 14px 0;
  font-size: 16px;
  color: #b6f7cb;
  font-weight: 800;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 10px;
}

.amount {
  font-size: 29px;
  font-weight: 900;
  color: #4ade80;
  margin: 0;
  text-shadow: 0 0 12px rgba(74, 222, 128, 0.35);
}

.amount.negative {
  color: var(--red);
}

.expense-items {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.expense-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 8px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 15px;
}

.expense-item span:first-child {
  color: rgba(220, 238, 211, 0.88);
  font-weight: 600;
}

.expense-item span:last-child {
  color: #86efac;
  font-weight: 800;
  font-size: 15px;
  font-family: monospace;
}

.expense-item.total {
  font-weight: 800;
  border-top: 1px solid rgba(190, 235, 203, 0.3);
  border-bottom: none;
  margin-top: 4px;
  padding-top: 8px;
}

.expense-item.total span:first-child {
  color: #eefde6;
  font-size: 14px;
}

.expense-item.total span:last-child {
  color: #4ade80;
  font-size: 16px;
}

.profit {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(34, 197, 94, 0.08));
  border: 1px solid rgba(52, 211, 153, 0.25);
  padding: 20px 22px;
  border-radius: 14px;
}

.profit-distribution-section {
  margin-top: 40px;
  padding-top: 30px;
  border-top: 1px solid rgba(190, 235, 203, 0.15);
}

.profit-distribution-section h3 {
  margin: 0 0 6px 0;
  font-size: 22px;
  font-weight: 800;
  color: #b6f7cb;
  letter-spacing: 0.3px;
}

.distribution-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 360px));
  gap: 32px;
  
  margin-top: 20px;
  justify-content: center;
}

.distribution-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0;
  padding: 30px 20px 24px;
  border-radius: 18px;
  background: rgba(22, 35, 27, 0.82);
  border: 1px solid rgba(190, 235, 203, 0.16);
  border-top: 3px solid rgba(255, 255, 255, 0.15);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255,255,255,0.06);
  transition: all 0.25s ease;
  position: relative;
  overflow: hidden;
}

.distribution-card::before {
  content: '';
  position: absolute;
  top: 0; left: 0; right: 0;
  height: 3px;
  border-radius: 18px 18px 0 0;
}

.distribution-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.38);
}

.distribution-card.org {
  background: linear-gradient(160deg, rgba(251, 191, 36, 0.13) 0%, rgba(22, 35, 27, 0.9) 60%);
  border-color: rgba(251, 191, 36, 0.28);
}
.distribution-card.org::before { background: linear-gradient(90deg, #f59e0b, #fbbf24); }

.distribution-card.training {
  background: linear-gradient(160deg, rgba(45, 212, 191, 0.13) 0%, rgba(22, 35, 27, 0.9) 60%);
  border-color: rgba(45, 212, 191, 0.28);
}
.distribution-card.training::before { background: linear-gradient(90deg, #0d9488, #2dd4bf); }

.distribution-card.members {
  background: linear-gradient(160deg, rgba(74, 222, 128, 0.13) 0%, rgba(22, 35, 27, 0.9) 60%);
  border-color: rgba(74, 222, 128, 0.28);
}
.distribution-card.members::before { background: linear-gradient(90deg, #16a34a, #4ade80); }

.distribution-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 56px;
  height: 56px;
  margin-bottom: 14px;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.12);
  flex-shrink: 0;
}

.distribution-icon svg {
  width: 28px;
  height: 28px;
  display: block;
}

.distribution-card.org .distribution-icon {
  color: #fbbf24;
  background: rgba(251, 191, 36, 0.14);
  border-color: rgba(251, 191, 36, 0.35);
}

.distribution-card.training .distribution-icon {
  color: #2dd4bf;
  background: rgba(45, 212, 191, 0.14);
  border-color: rgba(45, 212, 191, 0.35);
}

.distribution-card.members .distribution-icon {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.14);
  border-color: rgba(74, 222, 128, 0.35);
}

.distribution-content {
  width: 100%;
}

.distribution-content h4 {
  margin: 0 0 8px 0;
  font-size: 14px;
  color: rgba(220, 238, 211, 0.75);
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.9px;
}

.distribution-content .percentage {
  margin: 0 auto 12px;
  display: inline-block;
  font-size: 22px;
  font-weight: 900;
  color: #fff;
  background: rgba(255,255,255,0.1);
  border: 1px solid rgba(255,255,255,0.18);
  border-radius: 999px;
  padding: 2px 18px;
  letter-spacing: 0.5px;
}

.distribution-content .amount {
  margin: 0 0 0 0;
  font-size: 29px;
  font-weight: 900;
  color: #4ade80;
  font-family: monospace;
  text-shadow: 0 0 14px rgba(74, 222, 128, 0.4);
}

.distribution-card.org .distribution-content .amount { color: #fbbf24; text-shadow: 0 0 14px rgba(251, 191, 36, 0.4); }
.distribution-card.training .distribution-content .amount { color: #2dd4bf; text-shadow: 0 0 14px rgba(45, 212, 191, 0.4); }

.distribution-content .per-member {
  margin: 10px 0 0 0;
  font-size: 13px;
  font-weight: 700;
  color: rgba(220, 238, 211, 0.65);
  background: rgba(255,255,255,0.06);
  border-radius: 8px;
  padding: 4px 10px;
  display: inline-block;
}

.reports-section {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.btn-primary,
.btn-secondary,
.btn-success {
  padding: 12px 22px;
  border: none;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
}

.btn-primary {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(96, 165, 250, 0.18));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.3);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-primary:hover {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.34), rgba(96, 165, 250, 0.28));
  border-color: var(--green);
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

.btn-secondary-outline {
  background: rgba(255, 255, 255, 0.07);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: var(--text-main);
  padding: 12px 22px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s ease;
}

.btn-secondary-outline:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
}

.btn-success {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.32), rgba(74, 222, 128, 0.2));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.4);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-success:hover {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.42), rgba(74, 222, 128, 0.3));
  border-color: var(--green);
  transform: translateY(-2px);
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  backdrop-filter: blur(4px);
}

.modal-content {
  background: var(--glass-panel);
  border: 1px solid var(--glass-line-strong);
  border-radius: 20px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow:
    20px 20px 40px rgba(0, 0, 0, 0.4),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
}

.modal-large {
  max-width: 900px;
}

.modal-header {
  padding: 20px 28px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text-main);
}

.btn-close {
  background: none;
  border: none;
  font-size: 24px;
  cursor: pointer;
  color: var(--text-soft);
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-close:hover {
  color: var(--text-main);
}

.modal-body {
  padding: 20px 28px;
}

.form-group {
  margin-bottom: 16px;
  display: flex;
  flex-direction: column;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}

.form-group label {
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-main);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.form-input {
  padding: 11px 14px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  font-size: 14px;
  font-family: inherit;
  background: rgba(39, 58, 45, 0.92);
  color: var(--text-main);
  min-height: 44px;
  transition: all 0.2s ease;
}

.form-input::placeholder {
  color: var(--text-soft);
}

.form-input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: inset 2px 2px 4px rgba(0, 0, 0, 0.34), 0 0 0 3px rgba(74, 222, 128, 0.1);
}

.expense-items-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
}

.total-input {
  font-size: 16px;
  font-weight: 700;
  background: rgba(74, 222, 128, 0.1);
  border: 2px solid var(--green);
  cursor: not-allowed;
  color: var(--green);
}

.total-input:readonly {
  background: rgba(74, 222, 128, 0.15);
  color: var(--green);
}

.calculated {
  font-size: 12px;
  color: var(--text-soft);
  margin-top: 4px;
}

.modal-actions {
  display: flex;
  gap: 12px;
  justify-content: flex-end;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
}

.alert {
  position: fixed;
  bottom: 24px;
  right: 24px;
  padding: 16px 20px;
  border-radius: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  z-index: 10060;
  box-shadow: 0 12px 28px rgba(15, 23, 42, 0.18);
  animation: slideUp 0.3s ease-out;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
  isolation: isolate;
  border: 1px solid rgba(15, 23, 42, 0.12);
  min-width: 320px;
  max-width: 520px;
}

@keyframes slideUp {
  from {
    transform: translateY(100px);
    opacity: 0;
  }
  to {
    transform: translateY(0);
    opacity: 1;
  }
}

.alert-success {
  background: #ecfdf5 !important;
  color: #14532d !important;
  border-color: #86efac !important;
}

.alert-error {
  background: #fef2f2 !important;
  color: #991b1b !important;
  border-color: #fca5a5 !important;
}

.alert-message {
  flex: 1;
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
  letter-spacing: 0.1px;
}

.alert-close {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 20px;
  font-weight: 800;
  color: inherit;
  opacity: 0.75;
  padding: 0 2px;
}

.alert-close:hover {
  opacity: 1;
}

.info-text {
  color: var(--text-soft);
  font-size: 14px;
  margin-bottom: 16px;
}

/* Collection Form Styles */
.highlight-box {
  background: rgba(96, 165, 250, 0.1);
  border: 2px solid var(--blue);
  padding: 16px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  font-size: 14px;
  color: var(--text-main);
}

.details-grid div {
  padding: 6px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.details-grid div:nth-child(even) {
  border-right: 1px solid rgba(255, 255, 255, 0.08);
  padding-right: 12px;
}

.details-grid div:nth-child(odd):not(:first-child) {
  padding-left: 12px;
}

.payment-type-group {
  border: 1px solid rgba(255, 255, 255, 0.08);
  padding: 16px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.payment-type-group legend {
  font-weight: 700;
  font-size: 14px;
  margin-bottom: 12px;
  color: var(--text-main);
}

.radio-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.radio-label {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  cursor: pointer;
  padding: 8px;
  border-radius: 8px;
  transition: background 0.2s;
  color: var(--text-main);
}

.radio-label:hover {
  background: rgba(255, 255, 255, 0.08);
}

.radio-label input[type="radio"] {
  margin-top: 4px;
  cursor: pointer;
}

.radio-label span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.radio-label small {
  font-size: 12px;
  color: var(--text-soft);
  font-weight: normal;
}

.payment-interest-box {
  background: rgba(251, 191, 36, 0.1);
  border: 2px solid var(--yellow);
  padding: 16px;
  border-radius: 12px;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-main);
}

.checkbox-label input[type="checkbox"] {
  cursor: pointer;
  width: 18px;
  height: 18px;
}

.interest-details {
  margin-top: 12px;
  padding: 12px;
  background: rgba(251, 191, 36, 0.1);
  border-radius: 8px;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
}

.detail-row.highlight {
  background: #fef08a;
  padding: 8px;
  border-radius: 4px;
  font-weight: 600;
  margin-top: 8px;
}

.modal-summary {
  margin-top: 20px;
  padding: 16px;
  background: #f3f4f6;
  border-radius: 8px;
}

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.summary-table tr {
  border-bottom: 1px solid #d1d5db;
}

.summary-table td {
  padding: 8px 0;
}

.summary-table td:last-child {
  text-align: right;
  padding-right: 8px;
}

.summary-table .amount {
  font-weight: 600;
  color: #1f2937;
}

.summary-table .total-row {
  background: #d1fae5;
  font-weight: 600;
}

.summary-table .total-row td {
  padding: 8px;
  border-radius: 4px;
}

.summary-table .balance-row {
  background: #dbeafe;
  font-weight: 600;
}

.summary-table .balance-row td {
  padding: 8px;
  border-radius: 4px;
}

.modal-large {
  max-width: 700px;
}

.warning-text {
  color: #d97706;
  font-size: 13px;
  font-weight: 500;
  margin-top: 4px;
}

/* Report Styles */
.report-display {
  margin-top: 24px;
}

.report-header {
  background: linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%);
  color: white;
  padding: 20px;
  border-radius: 12px;
  margin-bottom: 20px;
}

.report-header h3 {
  margin: 0 0 8px 0;
  font-size: 1.5rem;
}

.report-period-long,
.report-generated {
  margin: 4px 0;
  opacity: 0.9;
}

#printable-report .report-summary-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 24px;
}

@media (min-width: 1200px) {
  #printable-report .report-summary-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

/* Scoped to printable report only — avoids overriding main KPI / A&R cards */
#printable-report .report-summary-grid > .summary-card {
  padding: 16px;
  border-radius: 12px;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 16px;
}

#printable-report .report-summary-grid > .summary-card .summary-label {
  font-size: 0.85rem;
  font-weight: 500;
  color: #4b5563;
}

#printable-report .report-summary-grid > .summary-card .summary-value {
  font-size: 1.35rem;
  font-weight: 700;
}

#printable-report .report-summary-grid > .summary-card .summary-count {
  font-size: 0.75rem;
  color: #9ca3af;
}

#printable-report .report-summary-grid > .expense-card {
  background: linear-gradient(135deg, #fecaca 0%, #fee2e2 100%);
  color: #991b1b;
  border: 1px solid #fecaca;
}

#printable-report .report-summary-grid > .income-card {
  background: linear-gradient(135deg, #a7f3d0 0%, #d1fae5 100%);
  color: #065f46;
  border: 1px solid #a7f3d0;
}

#printable-report .report-summary-grid > .collection-card {
  background: linear-gradient(135deg, #bfdbfe 0%, #dbeafe 100%);
  color: #1e40af;
  border: 1px solid #bfdbfe;
}

#printable-report .report-summary-grid > .profit-card {
  background: linear-gradient(135deg, #86efac 0%, #bbf7d0 100%);
  color: #14532d;
  border: 1px solid #86efac;
}

#printable-report .report-summary-grid > .loss-card {
  background: linear-gradient(135deg, #fca5a5 0%, #fecaca 100%);
  color: #7f1d1d;
  border: 1px solid #fca5a5;
}

#printable-report .distribution-summary {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 1px solid #bbf7d0;
  border-radius: 16px;
  padding: 24px;
  margin-bottom: 24px;
}

#printable-report .distribution-summary h4 {
  margin: 0 0 18px;
  color: #166534;
  font-size: 1rem;
  font-weight: 700;
}

#printable-report .distribution-summary .distribution-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
}

@media (min-width: 1100px) {
  #printable-report .distribution-summary .distribution-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

#printable-report .distribution-summary .dist-item {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 12px;
  background: #ffffff;
  padding: 14px;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.06);
}

#printable-report .distribution-summary .dist-item.highlight {
  background: #fefce8;
  border-color: #fbbf24;
}

#printable-report .distribution-summary .dist-details .dist-label {
  font-size: 11px;
  color: #6b7280;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

#printable-report .distribution-summary .dist-details .dist-value {
  font-size: 1.125rem;
  font-weight: 700;
  color: #15803d;
}

#printable-report .report-plain-section .section-title h4 {
  margin: 0;
}

#printable-report .report-plain-table th,
#printable-report .report-plain-table td {
  font-size: 13px;
  padding: 10px 14px;
}

#printable-report .farmer-clients-record-table {
  font-size: 6.5pt;
}

#printable-report .farmer-clients-record-table th {
  font-size: 6pt;
}

#printable-report .farmer-clients-record-table td {
  font-size: 6.5pt;
}

#printable-report .farmer-clients-record-table .th-tl {
  font-size: 5.5pt;
}

#printable-report .farmer-clients-record-table th,
#printable-report .farmer-clients-record-table td {
  padding: 2px 1px;
}

#printable-report .collectibles-meta-box-compact {
  padding: 6px 8px;
  margin-bottom: 6px;
}

#printable-report .collectibles-meta-split {
  gap: 8px 16px;
}

#printable-report .collectibles-meta-field-block {
  gap: 2px;
}

#printable-report .collectibles-meta-label-sm,
#printable-report .collectibles-meta-fill,
#printable-report .collectibles-meta-fill-printed {
  font-size: 7pt;
}

#printable-report .collectibles-meta-fill,
#printable-report .collectibles-meta-fill-printed {
  min-height: 16px;
  border-bottom: 1px solid #334155;
  color: #0f172a !important;
}

#printable-report .report-transactions,
#printable-report .report-section {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 0;
  margin-bottom: 20px;
  overflow: hidden;
  box-shadow: 0 4px 24px rgba(15, 23, 42, 0.06);
}

#printable-report .report-transactions h4,
#printable-report .report-section h4 {
  margin: 0 0 16px 0;
  color: #1f2937;
  font-size: 1.1rem;
}

#printable-report .report-section-card .data-table thead {
  background: linear-gradient(180deg, #ecfdf5 0%, #d1fae5 100%);
}

#printable-report .report-section-card .data-table th {
  color: #14532d;
  font-weight: 800;
  font-size: 12px;
  border-bottom: 1px solid #bbf7d0;
}

#printable-report .report-section-card .data-table td {
  color: #334155;
  font-size: 13px;
  border-bottom: 1px solid #f1f5f9;
}

#printable-report .report-section-card .data-table tbody tr:nth-child(even) {
  background: #fafafa;
}

#printable-report .report-section-card .badge {
  display: inline-block;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

#printable-report .report-section-card .badge-income {
  background: #dcfce7;
  color: #047857;
  border: 1px solid #6ee7b7;
}

#printable-report .report-section-card .badge-collection {
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #93c5fd;
}

#printable-report .report-section-card .badge-expense {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #fecaca;
}

.badge-expense {
  background: #fee2e2;
  color: #991b1b;
}

.badge-income {
  background: #d1fae5;
  color: #065f46;
}

.badge-collection {
  background: #dbeafe;
  color: #1e40af;
}

.badge-full {
  background: #d1fae5;
  color: #065f46;
}

.badge-partial {
  background: #fef3c7;
  color: #92400e;
}

.badge-completed {
  background: #d1fae5;
  color: #065f46;
}

.badge-in-use {
  background: #dbeafe;
  color: #1e40af;
}

.badge-pending {
  background: #fef3c7;
  color: #92400e;
}

.badge-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.badge-paid {
  background: #d1fae5;
  color: #065f46;
}

.badge-unpaid {
  background: #fee2e2;
  color: #991b1b;
}

.text-red {
  color: #dc2626;
}

.text-green {
  color: #16a34a;
}

.text-right {
  text-align: right;
}

.empty-cell {
  text-align: center;
  padding: 24px;
  color: #6b7280;
  font-style: italic;
}

.total-row {
  background: #f3f4f6;
  font-weight: 600;
}

.total-row td {
  padding: 12px 8px;
}

/* Enhanced Report Panel Styles */
.report-generator-panel {
  background: linear-gradient(140deg,
    rgba(14, 36, 27, 0.92) 0%,
    rgba(17, 48, 33, 0.9) 52%,
    rgba(12, 32, 25, 0.94) 100%);
  border: 1px solid rgba(121, 169, 138, 0.36);
  border-radius: 18px;
  padding: 22px;
  margin-bottom: 24px;
  box-shadow:
    0 18px 34px rgba(5, 14, 10, 0.36),
    inset 0 1px 0 rgba(184, 230, 201, 0.1);
}

.report-options-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
  align-items: stretch;
}

@media (min-width: 960px) {
  .report-options-grid {
    grid-template-columns: minmax(220px, 1fr) minmax(320px, 1.55fr) minmax(220px, 1fr);
  }
}

.report-option-card {
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
  background: linear-gradient(155deg,
    rgba(24, 49, 38, 0.88) 0%,
    rgba(21, 44, 35, 0.9) 58%,
    rgba(17, 34, 28, 0.94) 100%);
  border-radius: 14px;
  padding: 18px;
  box-shadow:
    0 10px 22px rgba(5, 12, 9, 0.34),
    inset 0 1px 0 rgba(184, 230, 201, 0.08);
  border: 1px solid rgba(126, 170, 141, 0.3);
}

.report-option-card h4 {
  margin: 0 0 16px 0;
  font-size: 1.375rem;
  color: #ecfdf5;
  font-weight: 800;
  letter-spacing: 0.01em;
  display: flex;
  align-items: center;
  gap: 8px;
}

.report-type-buttons {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.report-type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 14px 18px;
  border: 1px solid rgba(150, 203, 171, 0.38);
  border-radius: 10px;
  background: linear-gradient(138deg,
    rgba(174, 112, 35, 0.76) 0%,
    rgba(124, 166, 74, 0.72) 100%);
  color: #f7fff9;
  cursor: pointer;
  transition: all 0.2s ease;
  flex: 1;
  min-width: 80px;
}

.report-type-btn:hover {
  border-color: rgba(182, 238, 201, 0.58);
  transform: translateY(-1px);
  filter: brightness(1.06) saturate(1.04);
}

.report-type-btn.active {
  border-color: rgba(196, 246, 213, 0.76);
  background: linear-gradient(138deg,
    rgba(221, 126, 33, 0.92) 0%,
    rgba(102, 182, 102, 0.9) 100%);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(62, 116, 72, 0.28);
}

.report-type-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.report-type-btn .btn-icon {
  font-size: 1.45rem;
  margin-bottom: 4px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.report-type-btn .btn-text {
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1.25;
}

.custom-date-toggle {
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid rgba(148, 196, 165, 0.26);
}

.checkbox-inline {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
  font-size: 1.125rem;
  color: #ecfdf5;
  font-weight: 700;
}

.checkbox-inline input[type="checkbox"] {
  width: 22px;
  height: 22px;
  accent-color: #16a34a;
}

.custom-date-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  margin-top: 12px;
  padding: 12px;
  background: rgba(12, 32, 23, 0.58);
  border-radius: 8px;
  border: 1px solid rgba(132, 182, 150, 0.24);
}

.date-input-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.date-input-group label {
  font-size: 12px;
  color: #cde7d7;
  font-weight: 600;
}

.form-input-sm {
  padding: 8px 12px;
  border: 1px solid rgba(137, 188, 156, 0.38);
  border-radius: 6px;
  font-size: 13px;
  min-width: 140px;
  background: rgba(11, 30, 22, 0.64);
  color: #f0fff5;
}

.form-input-sm:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.1);
}

.btn-generate {
  padding: 8px 16px;
  background: #16a34a;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
  align-self: flex-end;
  transition: background 0.2s;
}

.btn-generate:hover {
  background: #15803d;
}

.btn-generate:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.filter-checkboxes {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
  align-items: stretch;
}

@media (min-width: 1180px) {
  .filter-checkboxes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.filter-checkbox {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  box-sizing: border-box;
  width: 100%;
  min-height: 56px;
  padding: 12px 14px;
  background: linear-gradient(140deg,
    rgba(18, 42, 31, 0.9) 0%,
    rgba(23, 51, 38, 0.92) 100%);
  border-radius: 10px;
  border: 1px solid rgba(136, 186, 153, 0.32);
  cursor: pointer;
  transition: all 0.2s;
  box-shadow: inset 0 1px 0 rgba(184, 230, 201, 0.08);
}

.filter-checkbox:hover {
  border-color: rgba(178, 233, 196, 0.54);
  background: linear-gradient(140deg,
    rgba(22, 50, 36, 0.95) 0%,
    rgba(26, 59, 43, 0.97) 100%);
  transform: translateY(-1px);
}

.filter-checkbox span {
  flex: 1;
  min-width: 0;
  color: #ffffff;
  font-weight: 700;
  font-size: 1.0625rem;
  letter-spacing: 0.01em;
  line-height: 1.35;
  white-space: normal;
  word-break: break-word;
  overflow: visible;
}

.filter-checkbox input[type="checkbox"] {
  width: 22px;
  height: 22px;
  min-width: 22px;
  margin-top: 1px;
  flex-shrink: 0;
  accent-color: #16a34a;
}

.actions-card .action-buttons {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: auto;
}

.orientation-setting {
  margin-bottom: 12px;
  padding: 10px;
  border: 1px solid rgba(136, 186, 153, 0.3);
  border-radius: 10px;
  background: rgba(14, 36, 26, 0.5);
}

.orientation-label {
  display: block;
  font-size: 1.0625rem;
  font-weight: 700;
  color: #d8f3e3;
  margin-bottom: 8px;
}

.orientation-toggle {
  display: flex;
  gap: 6px;
}

.orient-btn {
  flex: 1;
  padding: 12px 14px;
  border: 1px solid rgba(143, 194, 162, 0.4);
  border-radius: 8px;
  background: linear-gradient(135deg,
    rgba(173, 108, 40, 0.78),
    rgba(93, 168, 96, 0.78));
  cursor: pointer;
  font-size: 1.0625rem;
  font-weight: 800;
  line-height: 1.25;
  transition: all 0.2s;
  text-align: center;
  color: #f6fff9;
}

.orient-btn:hover {
  border-color: rgba(191, 242, 207, 0.72);
  transform: translateY(-1px);
}

.orient-btn.active {
  border-color: rgba(201, 248, 215, 0.82);
  background: linear-gradient(135deg,
    rgba(220, 123, 31, 0.95),
    rgba(89, 180, 97, 0.94));
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(55, 110, 68, 0.3);
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 13px 16px;
  border: 1px solid rgba(152, 203, 171, 0.45);
  border-radius: 8px;
  cursor: pointer;
  font-size: 1.125rem;
  font-weight: 800;
  line-height: 1.25;
  transition: all 0.2s;
  color: #f6fff9;
  box-shadow: 0 6px 16px rgba(7, 15, 11, 0.3);
}

.btn-action.print {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
}

.btn-action.print:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.25);
}

.btn-action.print:disabled {
  background: #64748b;
  color: #f8fafc;
  cursor: not-allowed;
  transform: none;
  box-shadow: none;
  opacity: 1;
}

.btn-action.select-all {
  background: linear-gradient(135deg, rgba(212, 123, 39, 0.88), rgba(104, 173, 99, 0.88));
  color: #f6fff9;
}

.btn-action.select-all:hover {
  filter: brightness(1.06);
}

.btn-action.clear {
  background: linear-gradient(135deg, rgba(183, 105, 35, 0.86), rgba(100, 160, 89, 0.84));
  color: #fff6f6;
}

.btn-action.clear:hover {
  filter: brightness(1.06);
}

.btn-action .btn-icon {
  font-size: 1.15rem;
  line-height: 1;
}

/* Loading state */
.report-loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px;
  color: #6b7280;
}

.report-display {
  position: relative;
  background: linear-gradient(180deg, #f6fdf9 0%, #eefaf3 48%, #f2fbf6 100%);
  border-radius: 20px;
  padding: 28px;
  box-shadow: 0 8px 32px rgba(15, 23, 42, 0.08);
  border: 1px solid rgba(187, 247, 208, 0.65);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #e5e7eb;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Enhanced Report Display */
.report-display-refreshing {
  pointer-events: none;
}

.report-refresh-overlay {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.82);
  border-radius: inherit;
  color: #475569;
  font-weight: 600;
}

.report-plain-section .report-plain-table th,
.report-plain-section .report-plain-table td {
  font-size: 13px;
}

.report-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  background: linear-gradient(135deg, #166534 0%, #15803d 100%);
  color: white;
  padding: 24px;
  border-radius: 12px;
  margin-bottom: 24px;
}

.report-logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.report-logo-image {
  width: 56px;
  height: 56px;
  border-radius: 999px;
  object-fit: cover;
  border: 2px solid rgba(255, 255, 255, 0.86);
  background: #ffffff;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.22);
  padding: 3px;
}

.report-cfa-line {
  margin: 0 0 6px;
  font-size: 0.98rem;
  font-weight: 600;
  color: #f0fdf4;
  line-height: 1.4;
}

.report-cfa-line strong {
  color: #ffffff;
  font-weight: 800;
}

.report-doc-title {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #ffffff;
  letter-spacing: 0.02em;
}

.report-meta {
  text-align: right;
}

.report-meta h3 {
  margin: 0 0 8px;
  font-size: 18px;
}

.report-period-long {
  margin: 6px 0 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: rgba(240, 253, 244, 0.96);
  line-height: 1.45;
}

.report-generated {
  margin: 10px 0 0;
  font-size: 12px;
  font-weight: 600;
  opacity: 0.88;
  color: rgba(240, 253, 244, 0.95);
}

/* Official collectibles sheet (screen + print via shared classes) */
.collectibles-form-sheet {
  margin: 20px 0 28px;
  padding: 20px 22px 22px;
  background: #ffffff;
  border: 2px solid #0f172a;
  border-radius: 12px;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.06);
}

.collectibles-form-title-block {
  text-align: center;
  margin-bottom: 16px;
}

.collectibles-main-title {
  margin: 0;
  font-size: 1.35rem;
  font-weight: 800;
  color: #0f172a;
}

.collectibles-main-subtitle {
  margin: 6px 0 0;
  font-size: 1.08rem;
  font-weight: 700;
  color: #334155;
}

.collectibles-meta-box {
  border: 1px solid #cbd5e1;
  border-radius: 8px;
  padding: 14px 16px;
  margin-bottom: 14px;
  background: #f8fafc;
}

.collectibles-meta-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px 12px;
  align-items: baseline;
  margin-bottom: 10px;
  font-size: 0.92rem;
}

.collectibles-meta-row-full {
  margin-bottom: 0;
}

.collectibles-meta-label {
  font-weight: 800;
  color: #0f172a;
  min-width: min(100%, 260px);
}

.collectibles-meta-value {
  flex: 1;
  min-width: 200px;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #94a3b8;
  padding: 0 2px 4px;
}

.collectibles-meta-box-compact {
  padding: 10px 12px;
  margin-bottom: 10px;
}

.collectibles-meta-split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px 24px;
  align-items: start;
}

.collectibles-meta-col {
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.collectibles-meta-col-left {
  padding-right: 12px;
  border-right: 1px solid #cbd5e1;
}

.collectibles-meta-col-right {
  padding-left: 4px;
}

@media (max-width: 720px) {
  .collectibles-meta-split {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .collectibles-meta-col-left {
    padding-right: 0;
    border-right: none;
    padding-bottom: 10px;
    border-bottom: 1px solid #cbd5e1;
  }

  .collectibles-meta-col-right {
    padding-left: 0;
  }
}

.collectibles-meta-field-block {
  display: flex;
  flex-direction: column;
  gap: 3px;
  width: 100%;
}

.collectibles-meta-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 6px 14px;
}

.collectibles-meta-field {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 4px 8px;
  min-width: 0;
}

.collectibles-meta-field-wide {
  grid-column: 1 / -1;
}

.collectibles-meta-label-sm {
  font-size: 0.72rem;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.25;
}

.collectibles-meta-fill {
  display: block;
  width: 100%;
  min-height: 22px;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e293b;
  border-bottom: 1px solid #334155;
  padding: 2px 4px 4px;
  line-height: 1.3;
  box-sizing: border-box;
}

/* Underline-only fill fields — no visible input box */
.sheet-fill-line {
  width: 100%;
  border-bottom: 2px solid #334155;
  min-height: 28px;
  display: flex;
  align-items: center;
  padding: 2px 4px 4px;
  box-sizing: border-box;
  background: transparent;
  cursor: text;
}

.sheet-fill-line:focus-within {
  border-bottom-color: #15803d;
}

.sheet-fill-input {
  flex: 1;
  width: 100%;
  min-height: 22px;
  border: 0 !important;
  background: transparent !important;
  outline: none !important;
  box-shadow: none !important;
  appearance: none;
  -webkit-appearance: none;
  font-size: 0.75rem;
  font-weight: 600;
  color: #0f172a;
  padding: 0;
  margin: 0;
  line-height: 1.35;
  border-radius: 0;
  font-family: inherit;
}

.sheet-fill-input::placeholder {
  color: transparent;
}

.sheet-fill-input:focus {
  outline: none !important;
  box-shadow: none !important;
}

.collectibles-meta-col-right .sheet-fill-line {
  margin-top: 1px;
}

.collectibles-fill-input {
  display: block;
  width: 100%;
  min-height: 22px;
  border: none;
  border-bottom: 1px solid #334155;
  background: transparent;
  font-size: 0.75rem;
  font-weight: 600;
  color: #1e293b;
  padding: 2px 4px 4px;
  line-height: 1.3;
  outline: none;
  box-sizing: border-box;
  appearance: none;
  -webkit-appearance: none;
}

.collectibles-fill-input:focus {
  border-bottom-color: #15803d;
}

.report-period-filters {
  margin-bottom: 12px;
}

.reports-machinery-filter-bar {
  margin-top: 0;
  margin-bottom: 20px;
}

.report-machinery-filter {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.filter-label-sm {
  font-size: 0.78rem;
  font-weight: 700;
  color: #334155;
}

.collectibles-table-wrap {
  overflow-x: auto;
}

.collectibles-data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  table-layout: fixed;
}

.collectibles-data-table th,
.collectibles-data-table td {
  border: 1px solid #1e293b;
  padding: 10px 8px;
  vertical-align: middle;
}

.collectibles-data-table th {
  background: #e2e8f0;
  font-weight: 800;
  color: #0f172a;
  line-height: 1.3;
  text-align: center;
}

.collectibles-data-table .th-tl {
  display: block;
  margin-top: 4px;
  font-size: 0.72rem;
  font-weight: 600;
  color: #475569;
}

.collectibles-data-table td {
  color: #0f172a;
  font-weight: 600;
  word-wrap: break-word;
}

.collectibles-data-table .col-client { width: 22%; text-align: left; }
.collectibles-data-table .col-ar { width: 15%; }
.collectibles-data-table .col-cash { width: 18%; }
.collectibles-data-table .col-date { width: 14%; }
.collectibles-data-table .col-rcpt { width: 14%; text-align: center; }
.collectibles-data-table .col-bal { width: 17%; }

/* List of Collectibles report table (6 columns) */
.collectibles-list-sheet {
  margin-top: 0;
  max-width: 100%;
}

.collectibles-list-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: clamp(0.58rem, 0.5vw + 0.52rem, 0.75rem);
}

.collectibles-list-table th,
.collectibles-list-table td {
  padding: clamp(4px, 0.45vw, 8px) clamp(3px, 0.35vw, 6px);
  line-height: 1.25;
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.collectibles-list-table th {
  font-weight: 800;
  text-align: center;
}

.collectibles-list-table .th-tl {
  font-size: 0.85em;
  margin-top: 2px;
  line-height: 1.15;
  font-weight: 600;
  color: #475569;
}

.collectibles-list-table td {
  font-weight: 600;
  color: #0f172a;
}

.collectibles-list-table .col-client { width: 22%; text-align: left; }
.collectibles-list-table .col-ar { width: 15%; text-align: right; }
.collectibles-list-table .col-cash { width: 18%; text-align: right; }
.collectibles-list-table .col-date { width: 14%; text-align: center; }
.collectibles-list-table .col-rcpt { width: 14%; text-align: center; }
.collectibles-list-table .col-bal { width: 17%; text-align: right; }

.collectibles-list-table .fcr-total-row td {
  background: #f1f5f9;
  font-weight: 800;
  border-top: 2px solid #0f172a;
}

.collectibles-list-table .text-right {
  text-align: right;
}

.collectibles-empty-row td {
  height: 28px;
  background: #fff;
}

.collectibles-empty-note {
  margin-top: 12px;
  font-size: 0.88rem;
  color: #64748b;
  text-align: center;
}

/* Farmer Clients Transaction Record — fluid table + mobile cards */
.farmer-clients-record-sheet {
  margin-top: 0;
  max-width: 100%;
}

.fcr-responsive-wrap {
  width: 100%;
  max-width: 100%;
}

.fcr-desktop-table {
  display: block;
  width: 100%;
}

.fcr-mobile-list {
  display: none;
}

.farmer-clients-record-table {
  width: 100%;
  table-layout: fixed;
  border-collapse: collapse;
  font-size: clamp(0.52rem, 0.55vw + 0.48rem, 0.68rem);
}

.farmer-clients-record-table th,
.farmer-clients-record-table td {
  padding: clamp(3px, 0.4vw, 6px) clamp(2px, 0.3vw, 5px);
  line-height: 1.25;
  vertical-align: middle;
  word-wrap: break-word;
  overflow-wrap: break-word;
}

.farmer-clients-record-table th {
  font-weight: 800;
  text-align: center;
}

.farmer-clients-record-table .th-tl {
  font-size: 0.85em;
  margin-top: 2px;
  line-height: 1.15;
  font-weight: 600;
  color: #475569;
}

.farmer-clients-record-table td {
  font-weight: 600;
  color: #0f172a;
}

.farmer-clients-record-table .fcr-col-client { width: 11%; text-align: left; }
.farmer-clients-record-table .fcr-col-loc { width: 10%; text-align: left; }
.farmer-clients-record-table .fcr-col-cat { width: 6%; text-align: center; }
.farmer-clients-record-table .fcr-col-date { width: 7%; text-align: center; }
.farmer-clients-record-table .fcr-col-fee { width: 9%; text-align: right; }
.farmer-clients-record-table .fcr-col-area { width: 7%; text-align: center; }
.farmer-clients-record-table .fcr-col-hrs { width: 5%; text-align: center; }
.farmer-clients-record-table .fcr-col-amt { width: 9%; text-align: right; }
.farmer-clients-record-table .fcr-col-rcpt { width: 7%; text-align: center; }

.farmer-clients-record-table .fcr-total-row td {
  background: #f1f5f9;
  font-weight: 800;
  border-top: 2px solid #0f172a;
}

.farmer-clients-record-table .text-right {
  text-align: right;
}

/* Mobile card list */
.fcr-mobile-card,
.fcr-mobile-totals {
  border: 1px solid #1e293b;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.fcr-mobile-card {
  margin-bottom: 12px;
}

.fcr-mobile-totals {
  margin-top: 4px;
}

.fcr-mobile-totals-title {
  margin: 0;
  padding: 10px 12px;
  font-size: 0.82rem;
  font-weight: 800;
  text-align: center;
  background: #f1f5f9;
  border-bottom: 2px solid #0f172a;
  color: #0f172a;
}

.fcr-mobile-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.fcr-mobile-row:last-child {
  border-bottom: none;
}

.fcr-mobile-label {
  flex: 0 0 46%;
  max-width: 46%;
  font-size: 0.72rem;
  font-weight: 800;
  color: #475569;
  line-height: 1.4;
  text-align: left;
}

.fcr-mobile-value {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f172a;
  text-align: right;
  line-height: 1.4;
  word-break: break-word;
}

.fcr-mobile-empty {
  margin: 0;
  padding: 16px;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

@media (max-width: 768px) {
  .fcr-desktop-table {
    display: none;
  }

  .fcr-mobile-list {
    display: block;
  }
}

@media (max-width: 1100px) {
  .farmer-clients-record-table .fcr-col-client,
  .farmer-clients-record-table .fcr-col-loc {
    font-size: 0.95em;
  }
}

@media print {
  .fcr-mobile-list {
    display: none !important;
  }

  .fcr-desktop-table {
    display: block !important;
  }

  .farmer-clients-record-table {
    width: 100% !important;
    table-layout: fixed !important;
    font-size: 6.5pt !important;
  }

  .collectibles-list-table {
    width: 100% !important;
    table-layout: fixed !important;
    font-size: 7pt !important;
  }

  .collectibles-list-table th {
    font-size: 6.5pt !important;
  }

  .collectibles-list-table td {
    font-size: 7pt !important;
    display: table-cell !important;
    padding: 3px 2px !important;
    border: 1px solid #1e293b !important;
  }

  .farmer-clients-record-table th {
    font-size: 6pt !important;
  }

  .farmer-clients-record-table td {
    font-size: 6.5pt !important;
    display: table-cell !important;
    width: auto !important;
    padding: 2px 1px !important;
    border: 1px solid #1e293b !important;
  }

  .farmer-clients-record-table .th-tl {
    font-size: 5.5pt !important;
  }
}

@media (max-width: 1024px) {
  .report-display {
    padding: 16px;
    border-radius: 14px;
  }

  .farmer-clients-record-sheet.collectibles-form-sheet {
    padding: 14px 12px;
  }

  .collectibles-main-title {
    font-size: 1.15rem;
  }

  .collectibles-main-subtitle {
    font-size: 0.95rem;
  }
}

@media (max-width: 720px) {
  .report-display {
    padding: 10px;
    border-radius: 10px;
  }

  .farmer-clients-record-sheet.collectibles-form-sheet {
    padding: 10px 8px;
    border-width: 1px;
  }

  .collectibles-form-title-block {
    margin-bottom: 10px;
  }

  .collectibles-main-title {
    font-size: 1rem;
  }

  .collectibles-main-subtitle {
    font-size: 0.85rem;
  }

  .collectibles-meta-box-compact {
    padding: 8px;
  }

  .collectibles-meta-label-sm {
    font-size: 0.65rem;
  }

  .collectibles-meta-fill,
  .sheet-fill-input {
    font-size: 0.68rem;
  }

  .sheet-fill-line {
    min-height: 26px;
  }
}

#printable-report .card-icon-wrapper {
  width: 56px;
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  font-size: 28px;
  flex-shrink: 0;
}

#printable-report .card-icon-wrapper.expense { background: #fee2e2; }
#printable-report .card-icon-wrapper.income { background: #dcfce7; }
#printable-report .card-icon-wrapper.collection { background: #dbeafe; }
#printable-report .card-icon-wrapper.profit { background: #bbf7d0; }
#printable-report .card-icon-wrapper.loss { background: #fecaca; }

#printable-report .card-details {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

#printable-report .card-details .summary-label {
  font-size: 13px;
  color: #6b7280;
  font-weight: 600;
}

#printable-report .card-details .summary-value {
  font-size: 22px;
  font-weight: 800;
  color: #15803d;
  letter-spacing: -0.02em;
}

#printable-report .report-summary-grid > .loss-card .card-details .summary-value {
  color: #991b1b;
}

#printable-report .report-summary-grid > .expense-card .card-details .summary-value {
  color: #991b1b;
}

#printable-report .report-summary-grid > .collection-card .card-details .summary-value {
  color: #1e40af;
}

#printable-report .card-details .summary-count {
  font-size: 12px;
  color: #9ca3af;
}

#printable-report .distribution-summary .dist-icon {
  font-size: 26px;
  flex-shrink: 0;
}

/* Report Section Cards (generated report only) */
#printable-report .report-section-card {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  overflow: hidden;
  margin-bottom: 20px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.06);
}

#printable-report .section-title {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: linear-gradient(90deg, #f0fdf4 0%, #ffffff 100%);
  border-bottom: 1px solid #e2e8f0;
}

#printable-report .section-icon {
  font-size: 20px;
}

#printable-report .section-title h4 {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #14532d;
}

#printable-report .section-count {
  margin-left: auto;
  font-size: 12px;
  color: #64748b;
  background: #e2e8f0;
  padding: 5px 11px;
  border-radius: 999px;
  font-weight: 600;
}

#printable-report .report-section-card .table-container {
  padding: 0;
  border: none;
  border-radius: 0;
  background: transparent;
}

#printable-report .report-section-card .data-table {
  margin: 0;
}

/* Dues & other tabs: plain section divider (report uses #printable-report rules above) */
.tab-content .section-title {
  font-size: 15px;
  font-weight: 800;
  color: var(--text-main);
  margin: 16px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  letter-spacing: 0.02em;
}

.description-cell {
  max-width: 200px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Report Footer */
#printable-report .report-footer {
  margin-top: 24px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
  text-align: center;
  color: #64748b;
  font-size: 12px;
}

#printable-report .footer-date {
  margin-top: 4px;
  color: #94a3b8;
}

/* Responsive for Report */
@media (max-width: 1200px) {
  #printable-report .report-summary-grid,
  #printable-report .distribution-summary .distribution-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 768px) {
  #printable-report .report-header {
    flex-direction: column;
    gap: 16px;
    text-align: center;
  }
  
  #printable-report .report-meta {
    text-align: center;
  }
  
  #printable-report .report-logo {
    flex-direction: column;
    text-align: center;
  }
  
  #printable-report .report-summary-grid,
  #printable-report .distribution-summary .distribution-grid {
    grid-template-columns: 1fr;
  }

  .filter-checkboxes {
    grid-template-columns: 1fr;
  }
}

/* View Only Badge */
.view-only-badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: linear-gradient(135deg, #22c55e 0%, #15803d 100%);
  color: white;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.88rem;
  font-weight: 700;
  margin-left: 12px;
  border: 1px solid rgba(187, 247, 208, 0.4);
  box-shadow: 0 6px 12px rgba(20, 83, 45, 0.25);
}

.view-only-badge .badge-icon {
  width: 20px;
  height: 20px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.22);
  font-size: 12px;
  line-height: 1;
}

/* Barangay Context Styles */
.barangay-context {
  background: rgba(22, 163, 74, 0.14);
  border: 1px solid rgba(74, 222, 128, 0.24);
  border-radius: 12px;
  padding: 12px 20px;
  margin-bottom: 20px;
  text-align: center;
  backdrop-filter: blur(10px);
}

.barangay-context.admin-context {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.2);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.context-badge {
  font-size: 0.95rem;
  font-weight: 700;
  color: #d1fae5;
}

.admin-context .context-badge {
  color: var(--green);
}

/* Main KPI row: stacked label (subtitle) + amount, no icons */
.summary-cards > .summary-card {
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 6px;
}

.summary-cards > .summary-card .card-content {
  align-items: center;
}

.summary-cards > .summary-card .card-label {
  color: #111827;
  font-size: 1.0625rem;
  font-weight: 600;
  letter-spacing: 0.02em;
  text-transform: none;
  margin-bottom: 4px;
}

.summary-cards > .summary-card .card-amount {
  color: #111827;
  font-size: clamp(1.85rem, 4.2vw, 2.25rem);
  font-weight: 800;
  letter-spacing: -0.03em;
}

/* Expense Breakdown readability — dark mode only */
.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item {
  padding: 8px 0;
}

.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:first-child {
  font-weight: 800;
  color: #effbe8;
  letter-spacing: 0.2px;
}

.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:last-child {
  font-weight: 900;
  font-size: 15px;
  color: #f8fff5;
}

.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:first-child,
.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:last-child {
  font-weight: 900;
}

.admin-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 10px;
}

.admin-filter label {
  font-weight: 700;
  color: var(--text-main);
}

.barangay-select {
  padding: 10px 14px;
  border: 1px solid rgba(190, 235, 203, 0.35);
  border-radius: 8px;
  font-size: 0.95rem;
  font-weight: 700;
  color: #f3ffef;
  background: rgba(25, 37, 29, 0.96);
  min-width: 270px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 6px 14px rgba(0, 0, 0, 0.22);
}

.barangay-select:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.18), 0 8px 18px rgba(0, 0, 0, 0.28);
}

.barangay-select option {
  background: #f3fff1;
  color: #142016;
}

/* Profit distribution cards: centered 3-column layout with wider spacing */
.profit-distribution-section .distribution-grid {
  grid-template-columns: repeat(3, minmax(250px, 320px));
  column-gap: 56px;
  row-gap: 28px;
  justify-content: center;
  align-items: stretch;
  width: 100%;
  margin-top: 28px;
}

@media (max-width: 1200px) {
  .profit-distribution-section .distribution-grid {
    grid-template-columns: repeat(2, minmax(240px, 320px));
    column-gap: 32px;
  }
}

@media (max-width: 768px) {
  .profit-distribution-section .distribution-grid {
    grid-template-columns: 1fr;
    max-width: 420px;
    margin-left: auto;
    margin-right: auto;
    row-gap: 18px;
  }

  .page-header {
    padding: 26px 20px;
    border-radius: 20px;
  }

  .header-content {
    gap: 10px;
  }

  .page-header h1 {
    font-size: 30px;
    line-height: 1.12;
  }

  .page-subtitle {
    font-size: 14px;
    line-height: 1.45;
  }
}

/* Print Styles */
@media print {
  .report-generator-panel,
  .tabs-container,
  .main-header,
  .sidebar { display: none !important; }
  
  .report-display {
    box-shadow: none;
    border: none;
    padding: 0;
  }
  
  .barangay-context {
    display: none;
  }
}

/* App extras: dues tab, nested headers, tables, conflicts — keep after reference sheet */

.tab-content .page-header {
  margin-bottom: 20px;
  padding: 22px 26px;
  border-radius: 20px;
}

.tab-content .page-header h1,
.tab-content .page-header .page-title {
  font-size: clamp(1.25rem, 3vw, 1.45rem);
  line-height: 1.2;
}

.section-subheader {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.auto-interest-note {
  flex: 1 1 auto;
  text-align: right;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.stats-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
}

.stat-card {
  background: linear-gradient(145deg, rgba(32, 48, 37, 0.92), rgba(24, 36, 28, 0.88));
  border: 1px solid rgba(190, 235, 203, 0.22);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow:
    8px 8px 18px rgba(8, 13, 10, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.stat-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 1.65rem;
  font-weight: 900;
  color: #bbf7d0;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.stat-value-sm {
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.35;
}

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 980px) {
  .grid-2 {
    grid-template-columns: 1fr;
  }
}

.tab-content .card {
  background: rgba(22, 35, 27, 0.78);
  border: 1px solid var(--glass-line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    12px 12px 22px rgba(8, 13, 10, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.tab-content .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.14);
}

.tab-content .card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
}

.filter-section {
  padding: 12px 18px 8px;
}

.btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(22, 163, 74, 0.18));
  color: var(--green);
  font-weight: 800;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(74, 222, 128, 0.55);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 10px;
}

.tab-content .btn-success {
  border: 1px solid rgba(74, 222, 128, 0.45);
}

.input {
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(39, 58, 45, 0.92);
  color: var(--text-main);
  font-family: inherit;
  font-size: 14px;
  min-height: 42px;
}

.input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
}

.tab-content .data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 15px;
}

.tab-content .data-table th:not(:last-child),
.tab-content .data-table td:not(:last-child) {
  border-right: 1px solid rgba(167, 211, 178, 0.22);
}

.tab-content .data-table thead {
  background: rgba(74, 222, 128, 0.08);
}

.tab-content .data-table th {
  padding: 14px 16px;
  text-align: center;
  vertical-align: middle;
  font-weight: 800;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  font-size: 13px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.tab-content .data-table td {
  padding: 14px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 600;
  font-size: 15px;
  text-align: center;
  vertical-align: middle;
}

.tab-content .data-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.tab-content .data-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.1);
}

.tab-content table.data-table tbody td.amount {
  font-size: 15px;
  font-weight: 800;
  color: #b7f7c8;
  font-family: ui-monospace, 'Courier New', monospace;
  margin: 0;
  text-shadow: none;
  line-height: 1.25;
  text-align: center;
}

.empty-message {
  text-align: center;
  padding: 24px 16px;
  color: var(--text-soft);
}

.empty-title {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-main);
  margin-bottom: 6px;
}

.empty-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}

.farmer-summary {
  margin-bottom: 16px;
  padding: 14px 16px;
  border-radius: 12px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.22);
}

.farmer-name {
  font-weight: 900;
  font-size: 1.08rem;
  color: #ecfdf5;
  margin-bottom: 4px;
}

.farmer-meta {
  font-size: 13px;
  color: var(--text-muted);
}

.action-row {
  margin: 14px 0 18px;
}

.form-inline {
  display: flex;
  flex-wrap: wrap;
  gap: 10px 14px;
  align-items: flex-end;
}

.inline-label {
  display: block;
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-soft);
  margin-bottom: 4px;
}

.dues-remarks-group {
  margin-top: 14px;
}

.dues-remarks-input {
  width: 100%;
  min-height: 80px;
  resize: vertical;
  margin-top: 4px;
}

.usage-leaders-card {
  background: linear-gradient(145deg, rgba(32, 48, 37, 0.92), rgba(22, 35, 27, 0.88));
  border: 1px solid var(--glass-line);
  border-radius: 16px;
  padding: 18px 20px;
  margin-bottom: 20px;
  box-shadow: 12px 12px 22px rgba(8, 13, 10, 0.42);
}

.tab-content .data-table th.text-right,
.expenses-table th.text-right,
.income-table th.text-right,
.ar-table th.text-right,
.collections-table th.text-right,
.collectibles-data-table th.text-right,
.collectibles-list-table th.text-right,
.farmer-clients-record-table th.text-right,
.tab-content .data-table td.text-right,
.expenses-table td.text-right,
.income-table td.text-right,
.ar-table td.text-right,
.collections-table td.text-right,
.collectibles-data-table td.text-right,
.collectibles-list-table td.text-right,
.farmer-clients-record-table td.text-right,
.tab-content .data-table td.amount,
.expenses-table td.amount-cell,
.income-table td.amount-cell,
.ar-table td.amount-cell,
.collections-table td.amount-cell {
  text-align: center !important;
}

.usage-table td small {
  display: block;
  margin-top: 3px;
  margin-left: auto;
  margin-right: auto;
  color: var(--text-soft);
  font-weight: 600;
  font-size: 12px;
  text-align: center;
}

.interest-already-applied {
  display: block;
  color: #bfdbfe;
  line-height: 1.45;
}

.font-semibold {
  font-weight: 800;
  color: var(--text-main);
}

.name {
  font-weight: 700;
  color: var(--text-main);
}

.actions {
  text-align: right;
}

tr.selected {
  outline: 2px solid rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.12) !important;
}

@media print {
  :global(body.printing-machinery-report) {
    background: #fff;
  }

  :global(body.printing-machinery-report) .financial-container,
  :global(body.printing-machinery-report) .financial-container * {
    visibility: hidden !important;
  }

  :global(body.printing-machinery-report) #printable-report,
  :global(body.printing-machinery-report) #printable-report * {
    visibility: visible !important;
  }

  :global(body.printing-machinery-report) #printable-report {
    position: absolute;
    inset: 0;
    width: 100%;
    margin: 0;
    padding: 0;
    border: none;
    box-shadow: none;
    background: #fff;
  }

  :global(body.printing-machinery-report) #printable-report .report-header,
  :global(body.printing-machinery-report) #printable-report .summary-card,
  :global(body.printing-machinery-report) #printable-report .dist-item,
  :global(body.printing-machinery-report) #printable-report .badge,
  :global(body.printing-machinery-report) #printable-report .total-row td {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  :global(body.printing-machinery-report) #printable-report .table-container {
    overflow: visible !important;
  }
}

@media (max-width: 920px) {
  .profit-breakdown {
    grid-template-columns: 1fr;
  }
}

/* ===== LIGHT MODE — Senior-friendly bright sage theme ===== */
.financial-container.light-theme {
  --glass-bg: #fffef9;
  --glass-bg-soft: #f4fdf7;
  --glass-panel: #ffffff;
  --glass-line: rgba(34, 197, 94, 0.28);
  --glass-line-strong: rgba(22, 101, 52, 0.35);
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --green: #15803d;

  background: linear-gradient(155deg, #d8f3de 0%, #bfeccc 42%, #a8e4b8 100%);
  color: var(--text-main);
}

.financial-container.light-theme::before,
.financial-container.light-theme::after {
  opacity: 0.28;
}

.financial-container.light-theme .page-header {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%);
  border: 2px solid #86efac;
  box-shadow: 0 10px 28px rgba(22, 101, 52, 0.12);
}

.financial-container.light-theme .page-header h1 {
  background: linear-gradient(90deg, #065f46 0%, #15803d 45%, #22c55e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.financial-container.light-theme .page-subtitle {
  color: #14532d;
  font-size: 17px;
}

.financial-container.light-theme .tabs-container .tab {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 1.5px solid #bbf7d0 !important;
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.08) !important;
  filter: none !important;
}

.financial-container.light-theme .tabs-container .tab .tab-icon {
  color: #166534 !important;
}

.financial-container.light-theme .tabs-container .tab:hover {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  border-color: #86efac !important;
}

.financial-container.light-theme .tabs-container .tab.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  color: #ffffff !important;
  border-color: #15803d !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.22) !important;
}

.financial-container.light-theme .tabs-container .tab.active .tab-icon {
  color: #ffffff !important;
}

.financial-container:not(.light-theme) .tabs-container .tab {
  background: rgba(30, 66, 52, 0.92) !important;
  color: #ecfdf5 !important;
  border-color: rgba(167, 211, 178, 0.28) !important;
  box-shadow: 0 4px 12px rgba(4, 18, 12, 0.22) !important;
}

.financial-container:not(.light-theme) .tabs-container .tab .tab-icon {
  color: #86efac !important;
}

.financial-container:not(.light-theme) .tabs-container .tab:hover {
  background: rgba(37, 82, 65, 0.96) !important;
  color: #ffffff !important;
}

.financial-container:not(.light-theme) .tabs-container .tab.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  color: #ffffff !important;
  border-color: rgba(232, 196, 104, 0.35) !important;
}

.financial-container:not(.light-theme) .tabs-container .tab.active .tab-icon {
  color: #ffffff !important;
}

.financial-container.light-theme .denied-content {
  background: #fffef9;
  border: 2px solid #86efac;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.1);
}

.financial-container.light-theme .summary-card {
  background: linear-gradient(145deg, #ffffff 0%, #f4fdf7 100%);
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.financial-container.light-theme .summary-card:hover {
  border-color: #4ade80;
  box-shadow: 0 12px 28px rgba(22, 101, 52, 0.14);
}

.financial-container.light-theme .card-label {
  color: #166534;
  font-size: 14px;
}

.financial-container.light-theme .card-amount {
  color: #052e16;
}

.financial-container.light-theme .income-card .card-amount {
  color: #15803d;
}

.financial-container.light-theme .expense-card .card-amount {
  color: #c2410c;
}

.financial-container.light-theme .profit-card .card-amount {
  color: #065f46;
}

.financial-container.light-theme .profit-card.negative .card-amount {
  color: #b91c1c;
}

.financial-container.light-theme .tab-content {
  background: #fffef9;
  border: 2px solid #86efac;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.1);
}

.financial-container.light-theme .filters-section {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border: 2px solid #bbf7d0;
}

.financial-container.light-theme .filter-label {
  color: #14532d;
  font-size: 14px;
}

.financial-container.light-theme .filter-input,
.financial-container.light-theme .filter-select-glass,
.financial-container.light-theme .barangay-select {
  background: #ffffff;
  color: #052e16;
  border: 1.5px solid #cbd5e1;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
}

.financial-container.light-theme .filter-input:focus,
.financial-container.light-theme .filter-select-glass:focus {
  border-color: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.15);
}

.financial-container.light-theme .table-container {
  background: #ffffff;
  border: 2px solid #bbf7d0;
  box-shadow: 0 4px 16px rgba(22, 101, 52, 0.08);
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) th {
  color: #052e16;
  background: transparent;
  border-bottom-color: #86efac;
  font-size: 14px;
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) td {
  color: #14532d;
  border-bottom-color: #e2e8f0;
  font-size: 16px;
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) tbody tr:nth-child(even) {
  background: #f8fdf9;
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) tbody tr:hover {
  background: #ecfdf5;
}

.financial-container.light-theme .amount-cell {
  color: #15803d;
}

.financial-container.light-theme .amount-cell.balance {
  color: #166534;
}

.financial-container.light-theme .summary-container > .summary-card {
  background: #fffef9;
  border: 2px solid #86efac;
}

.financial-container.light-theme .summary-container > .summary-card .card-label {
  color: #166534;
  text-shadow: none;
}

.financial-container.light-theme .summary-container > .summary-card .card-amount {
  text-shadow: none;
}

.financial-container.light-theme .summary-container .ar-card .card-amount {
  color: #15803d;
}

.financial-container.light-theme .summary-container .collected-card .card-amount {
  color: #0f766e;
}

.financial-container.light-theme .summary-container .balance-card .card-amount {
  color: #b91c1c;
}

.financial-container.light-theme .profit-distribution-section h3 {
  color: #052e16;
}

.financial-container.light-theme .distribution-card {
  background: #fffef9;
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.financial-container.light-theme .distribution-card.org {
  background: linear-gradient(160deg, #fffbeb 0%, #fffef9 60%);
  border-color: #fcd34d;
}

.financial-container.light-theme .distribution-card.training {
  background: linear-gradient(160deg, #f0fdfa 0%, #fffef9 60%);
  border-color: #5eead4;
}

.financial-container.light-theme .distribution-card.members {
  background: linear-gradient(160deg, #f0fdf4 0%, #fffef9 60%);
  border-color: #86efac;
}

.financial-container.light-theme .distribution-content h4 {
  color: #166534;
}

.financial-container.light-theme .distribution-content .percentage {
  color: #052e16;
  background: #f0fdf4;
  border-color: #86efac;
}

.financial-container.light-theme .distribution-content .amount {
  text-shadow: none;
}

.financial-container.light-theme .distribution-content .per-member {
  color: #14532d;
  background: #f0fdf4;
}

.financial-container.light-theme .distribution-card.org .distribution-icon {
  color: #d97706;
  background: #fffbeb;
  border-color: #fcd34d;
}

.financial-container.light-theme .distribution-card.training .distribution-icon {
  color: #0d9488;
  background: #f0fdfa;
  border-color: #5eead4;
}

.financial-container.light-theme .distribution-card.members .distribution-icon {
  color: #15803d;
  background: #f0fdf4;
  border-color: #86efac;
}

.financial-container.light-theme .btn-secondary,
.financial-container.light-theme .btn-secondary-outline {
  background: #ffffff;
  color: #14532d;
  border: 1.5px solid #86efac;
}

.financial-container.light-theme .btn-secondary:hover,
.financial-container.light-theme .btn-secondary-outline:hover {
  background: #f0fdf4;
  border-color: #4ade80;
}

.financial-container.light-theme .btn-primary {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #ffffff;
  border-color: #15803d;
}

.financial-container.light-theme .status-badge.full-payment,
.financial-container.light-theme .status-badge.partial-payment {
  color: #166534;
  background: #dcfce7;
}

.financial-container.light-theme .status-badge.unpaid {
  color: #991b1b;
  background: #fee2e2;
}

.financial-container.light-theme .barangay-context,
.financial-container.light-theme .context-badge {
  color: #14532d;
}

.financial-container.light-theme .report-generator-panel,
.financial-container.light-theme .report-option-card,
.financial-container.light-theme .actions-card {
  background: #fffef9 !important;
  border: 2px solid #86efac !important;
  color: #14532d !important;
}

.financial-container.light-theme .filter-checkbox {
  background: #ffffff !important;
  border: 1.5px solid #86efac !important;
  box-shadow: 0 2px 6px rgba(22, 101, 52, 0.06) !important;
}

.financial-container.light-theme .filter-checkbox:hover {
  background: #f0fdf4 !important;
  border-color: #22c55e !important;
}

.financial-container.light-theme .filter-checkbox span {
  color: #000000 !important;
  text-shadow: none !important;
  font-size: 1.0625rem !important;
  font-weight: 700 !important;
  overflow: visible !important;
  -webkit-line-clamp: unset !important;
}

.financial-container.light-theme .report-option-card h4,
.financial-container.light-theme .orientation-label,
.financial-container.light-theme .checkbox-inline {
  color: #052e16 !important;
  font-weight: 800 !important;
}

.financial-container.light-theme .report-option-card h4 {
  font-size: 1.375rem !important;
}

.financial-container.light-theme .orientation-label {
  font-size: 1.0625rem !important;
}

.financial-container.light-theme .checkbox-inline span {
  font-size: 1.125rem !important;
}

.financial-container.light-theme .report-type-btn .btn-text {
  color: #052e16 !important;
  font-size: 1.125rem !important;
}

.financial-container.light-theme .report-type-btn.active .btn-text {
  color: #14532d !important;
}

.financial-container.light-theme .orient-btn,
.financial-container.light-theme .btn-action.select-all,
.financial-container.light-theme .btn-action.clear {
  background: #ffffff !important;
  color: #052e16 !important;
  border: 2px solid #15803d !important;
  opacity: 1 !important;
  font-size: 1.0625rem !important;
}

.financial-container.light-theme .orient-btn.active {
  background: #dcfce7 !important;
  color: #14532d !important;
  border-color: #15803d !important;
}

.financial-container.light-theme .btn-action.print {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  color: #ffffff !important;
  border: 2px solid #14532d !important;
  opacity: 1 !important;
  font-size: 1.125rem !important;
}

.financial-container.light-theme .btn-action.print:disabled {
  background: #e2e8f0 !important;
  color: #334155 !important;
  border: 2px solid #94a3b8 !important;
  opacity: 1 !important;
}

.financial-container.light-theme .breakdown-card {
  background: #fffef9;
  border: 2px solid #86efac;
  color: #14532d;
}

.financial-container.light-theme .breakdown-card h3 {
  color: #052e16;
  border-bottom-color: #bbf7d0;
}

.financial-container.light-theme .breakdown-card .amount {
  color: #15803d;
  text-shadow: none;
}

.financial-container.light-theme .expense-item span:first-child {
  color: #14532d;
}

.financial-container.light-theme .expense-item span:last-child {
  color: #15803d;
}

.financial-container.light-theme .expense-item.total span:first-child {
  color: #052e16;
}

.financial-container.light-theme .profit.breakdown-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #fffef9 100%);
  border-color: #4ade80;
}

.financial-container.light-theme .modal-overlay {
  background: rgba(5, 46, 22, 0.35);
}

.financial-container.light-theme .modal-content {
  background: #fffef9;
  border: 2px solid #86efac;
  color: #14532d;
  box-shadow: 0 16px 40px rgba(22, 101, 52, 0.16);
}

.financial-container.light-theme .modal-header {
  border-bottom-color: #bbf7d0;
}

.financial-container.light-theme .modal-header h2 {
  color: #052e16;
}

.financial-container.light-theme .form-group label,
.financial-container.light-theme .form-label {
  color: #14532d;
  font-size: 14px;
  font-weight: 700;
}

.financial-container.light-theme :is(.input, .form-input, textarea, select) {
  background: #ffffff;
  color: #052e16;
  border: 1.5px solid #cbd5e1;
}

.financial-container.light-theme .empty-state {
  color: #166534;
}

.financial-container.light-theme .view-only-badge {
  color: #14532d;
  background: #fef9c3;
  border: 1px solid #fbbf24;
}

/* Expense breakdown — force dark readable text (beats nth-child dark rules) */
.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item {
  padding: 8px 0;
  border-bottom-color: #e2e8f0;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:first-child {
  font-weight: 700;
  font-size: 15px;
  color: #052e16 !important;
  letter-spacing: 0.01em;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:last-child {
  font-weight: 800;
  font-size: 15px;
  color: #15803d !important;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total {
  border-top-color: #86efac;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:first-child,
.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:last-child {
  color: #052e16 !important;
  font-weight: 900;
  font-size: 16px;
}

/* Most Used Machinery card */
.financial-container.light-theme .usage-leaders-card {
  background: linear-gradient(145deg, #ffffff 0%, #f4fdf7 100%);
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.financial-container.light-theme .usage-leaders-card .section-subheader h3 {
  color: #052e16;
  font-size: 18px;
}

.financial-container.light-theme .tab-content .data-table thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) th:not(:last-child),
.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) td:not(:last-child) {
  border-right: 1px solid #64748b !important;
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) th:not(:last-child) {
  border-right: 2px solid #15803d !important;
}

.financial-container.light-theme .tab-content .data-table th:not(:last-child),
.financial-container.light-theme .tab-content .data-table td:not(:last-child) {
  border-right: 1px solid #64748b !important;
}

.financial-container.light-theme .tab-content .data-table th:not(:last-child) {
  border-right: 2px solid #15803d !important;
}

.financial-container.light-theme .usage-leaders-card .data-table th:not(:last-child),
.financial-container.light-theme .usage-leaders-card .data-table td:not(:last-child) {
  border-right: 1px solid #64748b !important;
}

.financial-container.light-theme .usage-leaders-card .data-table th:not(:last-child) {
  border-right: 2px solid #15803d !important;
}

.financial-container.light-theme .tab-content .data-table th {
  color: #052e16;
  border-bottom-color: #86efac;
  font-size: 14px;
}

.financial-container.light-theme .tab-content .data-table td {
  color: #14532d;
  border-bottom-color: #e2e8f0;
  font-size: 16px;
}

.financial-container.light-theme .tab-content .data-table tbody tr:nth-child(even) {
  background: #f8fdf9;
}

.financial-container.light-theme .tab-content .data-table tbody tr:hover {
  background: #ecfdf5;
}

.financial-container.light-theme .tab-content table.data-table tbody td.amount {
  color: #15803d;
}

.financial-container.light-theme .usage-table td small {
  color: #166534;
  font-size: 13px;
}

.financial-container.light-theme .section-subheader h3 {
  color: #052e16;
}

.financial-container.light-theme .section-header h2 {
  color: #052e16;
}

.financial-container.light-theme .farmer-name {
  color: #052e16;
}

.financial-container.light-theme .farmer-meta,
.financial-container.light-theme .empty-message,
.financial-container.light-theme .empty-title,
.financial-container.light-theme .empty-text {
  color: #14532d;
}

.financial-container.light-theme .barangay-select {
  background: #ffffff;
  color: #052e16;
  border: 1.5px solid #cbd5e1;
  box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04);
}

.financial-container.light-theme .admin-filter label {
  color: #14532d;
}

.financial-container.light-theme .inline-label {
  color: #166534;
}

.financial-container.light-theme .expense-item {
  border-bottom-color: #e2e8f0;
}

.financial-container.light-theme .expense-item span:first-child {
  color: #052e16 !important;
  font-weight: 700;
  font-size: 15px;
}

.financial-container.light-theme .expense-item span:last-child {
  color: #15803d !important;
  font-weight: 800;
  font-size: 15px;
}

.financial-container.light-theme .expense-item.total span:last-child {
  color: #065f46 !important;
}

</style>