<template>
  <div
    class="financial-container page-container machinery-financial-page machinery-ui glass-module-page"
    :class="{ 'light-theme': isLight, 'association-dues-view': isDuesOnlyView }"
  >
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ activeTab === 'dues' ? $t('ui.associationDuesTransactions') : $t('ui.machineryFinancial') }}</h1>
        <p class="page-subtitle">{{ activeTab === 'dues' ? $t('ui.associationDuesSub') : $t('ui.machineryFinancialSub') }}</p>
      </div>
    </div>

    <!-- Access Denied Message -->
    <div v-if="!hasAccess" class="access-denied">
      <div class="denied-content">
        <p class="denied-text">{{ $t('ui.accessDenied') }}</p>
        <p class="denied-reason">{{ $t('ui.onlyFinanceAccess') }}</p>
      </div>
    </div>

    <div v-else>
      <!-- Barangay Context Display -->
      <div v-if="!isDuesOnlyView && !isAdmin" class="barangay-context">
        <span class="context-badge">{{ userRole === 'treasurer' ? $t('ui.managingFinancialAssigned') : $t('ui.viewingFinancialAssigned') }}</span>
      </div>
      <div v-else-if="!isDuesOnlyView" class="barangay-context admin-context">
        <div class="admin-filter">
          <label for="barangay-select">{{ $t('ui.filterByBarangayColon') }}</label>
          <select id="barangay-select" v-model="selectedBarangayId" class="barangay-select">
            <option value="">{{ $t('ui.allBarangaysConsolidated') }}</option>
            <option v-for="b in barangays" :key="b.id" :value="b.id">{{ b.name }}</option>
          </select>
        </div>
      </div>
      
      <!-- Page-level machinery filter (applies to all tabs) -->
      <div v-if="!isDuesOnlyView" class="filters-section tools-card page-machinery-filter">
        <div class="filter-group page-machinery-filter-group">
          <label class="filter-label page-machinery-filter-label" for="page-machinery-filter">{{ $t('ui.machineryEquipmentColon') }}</label>
          <select
            id="page-machinery-filter"
            v-model="filters.machinery_id"
            class="filter-input toolbar-select page-machinery-filter-select"
          >
            <option value="">{{ $t('ui.allMachinery') }}</option>
            <option v-for="m in scopedMachinery" :key="m.id" :value="String(m.id)">
              {{ m.machinery_name }} ({{ m.machinery_type }})
            </option>
          </select>
        </div>
        <p class="page-machinery-filter-hint">
          <span class="page-machinery-filter-hint-full">Applies to expenses, income, A/R &amp; collections, profit, and reports.</span>
          <span class="page-machinery-filter-hint-short">Applies to all tabs on this page.</span>
        </p>
      </div>

      <!-- Financial Summary Cards -->
      <div v-if="!isDuesOnlyView" class="summary-cards stats-grid">
        <div class="summary-card income-card stat-card">
          <div class="card-content stat-content">
            <span class="card-label stat-label">{{ $t('ui.totalIncome') }}</span>
            <span class="card-amount stat-value">₱{{ formatNumber(profitSummary.total_income) }}</span>
            <span v-if="filters.machinery_id" class="card-filter-hint">{{ reportMachineryLabel }}</span>
          </div>
        </div>
        <div class="summary-card expense-card stat-card">
          <div class="card-content stat-content">
            <span class="card-label stat-label">{{ $t('ui.totalExpenses') }}</span>
            <span class="card-amount stat-value">₱{{ formatNumber(profitSummary.total_expenses) }}</span>
          </div>
        </div>
        <div class="summary-card profit-card stat-card" :class="{ negative: profitSummary.net_profit < 0 }">
          <div class="card-content stat-content">
            <span class="card-label stat-label">{{ $t('ui.netProfit') }}</span>
            <span class="card-amount stat-value">₱{{ formatNumber(profitSummary.net_profit) }}</span>
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
          @click="selectTab(tab.id, $event)"
        >
          <span class="tab-label">{{ $t(tab.labelKey) }}</span>
          <span v-if="tab.badge" class="tab-badge">{{ tab.badge }}</span>
        </button>
      </div>

      <!-- TAB 1: EXPENSES MANAGEMENT -->
      <div v-if="activeTab === 'expenses'" class="tab-content">
        <div class="section-header">
          <h2>{{ $t('ui.expenseManagement') }}</h2>
          <button v-if="canManage" @click="openManualExpenseForm" class="btn-primary">{{ $t('common.recordManualExpense') }}</button>
          <span v-else class="view-only-badge">{{ $t('ui.viewOnly') }}</span>
        </div>

        <div v-if="expenseSummary.pending_count > 0" class="pending-expense-alert">
          <strong>{{ expenseSummary.pending_count }}</strong> completed rental(s) awaiting expense entry.
        </div>

        <div class="filters-section tools-card">
          <div class="filter-group">
            <label class="filter-label">Operator:</label>
            <select v-model="filters.operator_id" class="filter-input toolbar-select">
              <option value="">{{ $t('ui.allOperators') }}</option>
              <option v-for="op in expenseOperators" :key="op.id" :value="op.id">{{ op.name }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">Expense Status:</label>
            <select v-model="filters.expense_status" class="filter-input toolbar-select">
              <option value="">{{ $t('ui.allStatus') }}</option>
              <option value="Pending">{{ $t('ui.pendingEntry') }}</option>
              <option value="Recorded">{{ $t('ui.recorded') }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">{{ $t('ui.startDateColon') }}</label>
            <input v-model="filters.start_date" type="date" class="filter-input toolbar-input" />
          </div>
          <div class="filter-group">
            <label class="filter-label">{{ $t('ui.endDateColon') }}</label>
            <input v-model="filters.end_date" type="date" class="filter-input toolbar-input" />
          </div>
          <div class="filter-actions">
            <button type="button" @click="loadExpenses" class="btn-secondary">{{ $t('common.filter') }}</button>
            <button type="button" @click="clearExpenseFilters" class="btn-secondary-outline">{{ $t('common.clear') }}</button>
          </div>
        </div>

        <div class="expense-section-block">
          <h3 class="expense-section-title">{{ $t('ui.pendingExpenseEntriesTitle') }} <span class="section-count">{{ pendingExpenses.length }}</span></h3>
          <p class="section-hint">{{ $t('ui.generatedFromRentals') }}</p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.machinery') }}</th><th>{{ $t('ui.operator') }}</th><th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.serviceDate') }}</th><th>{{ $t('ui.location') }}</th><th>{{ $t('ui.status') }}</th>
                    <th v-if="canManage" class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="expense in pendingExpenses" :key="'p-' + expense.id">
                    <td>{{ expense.machinery_name }}</td>
                    <td>{{ expense.operator_name || '—' }}</td>
                    <td>{{ expense.farmer_name || '—' }}</td>
                    <td>{{ formatDate(expense.booking_date || expense.date_of_expense) }}</td>
                    <td>{{ expense.service_location || '—' }}</td>
                    <td><span class="badge badge-pending">{{ $t('ui.pendingEntry') }}</span></td>
                    <td v-if="canManage">
                      <div class="pending-expense-actions">
                        <button type="button" @click="completePendingExpense(expense)" class="btn-primary btn-sm">{{ $t('common.recordExpensesPrint') }}</button>
                        <button type="button" @click="removePendingExpense(expense)" class="btn-secondary-outline btn-sm">{{ $t('common.removeExpense') }}</button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="pendingExpenses.length === 0" class="fin-mobile-empty">{{ $t('ui.noPendingExpense') }}</div>
              <article v-else v-for="expense in pendingExpenses" :key="'pm-' + expense.id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ expense.machinery_name || 'Machinery Expense' }}</h4>
                  <span class="badge badge-pending">{{ $t('ui.pendingEntry') }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.operator') }}</span><span>{{ expense.operator_name || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.farmer') }}</span><span>{{ expense.farmer_name || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.serviceDate') }}</span><span>{{ formatDate(expense.booking_date || expense.date_of_expense) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.location') }}</span><span>{{ expense.service_location || '—' }}</span></div>
                </div>
                <div v-if="canManage" class="fin-mobile-card-actions pending-expense-actions">
                  <button type="button" class="btn-primary btn-sm fin-mobile-action" @click="completePendingExpense(expense)">{{ $t('common.recordExpensesPrint') }}</button>
                  <button type="button" class="btn-secondary-outline btn-sm fin-mobile-action" @click="removePendingExpense(expense)">{{ $t('common.removeExpense') }}</button>
                </div>
              </article>
            </div>
            <div v-if="pendingExpenses.length === 0" class="empty-state fin-desktop-empty"><p>{{ $t('ui.noPendingExpense') }}</p></div>
          </div>
        </div>

        <div class="expense-section-block">
          <h3 class="expense-section-title">{{ $t('ui.completedExpenseRecords') }} <span class="section-count">{{ recordedBookingExpenses.length }}</span></h3>
          <p class="section-hint">{{ $t('ui.expensesFromRentals') }}</p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.machinery') }}</th><th>{{ $t('ui.date') }}</th><th>{{ $t('ui.operator') }}</th>
                    <th>{{ $t('ui.labor') }}</th><th>{{ $t('ui.total') }}</th><th>{{ $t('ui.receiptNo') }}</th><th>{{ $t('ui.status') }}</th><th v-if="canManage" class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="expense in recordedBookingExpenses" :key="'rb-' + expense.id">
                    <td>{{ expense.machinery_name }}</td>
                    <td>{{ formatDate(expense.date_of_expense) }}</td>
                    <td>{{ expense.operator_name || '—' }}</td>
                    <td>₱{{ formatNumber(expense.labor_cost) }}</td>
                    <td class="amount-cell">₱{{ formatNumber(expense.total_amount) }}</td>
                    <td>{{ expense.reference_number || '—' }}</td>
                    <td><span class="badge badge-recorded">{{ $t('ui.recorded') }}</span></td>
                    <td v-if="canManage" class="actions-cell members-action-row">
                      <button
                        v-if="expense.reference_number"
                        type="button"
                        class="btn-secondary btn-sm receipt-view-btn"
                        :title="$t('ui.viewReceipt')"
                        @click="viewReceipt(expense.reference_number)"
                      >
                        {{ $t('common.viewReceipt') }}
                      </button>
                      <button type="button" @click="editExpense(expense)" class="table-action-btn table-action-edit" :title="$t('common.edit')" :aria-label="$t('common.edit')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="recordedBookingExpenses.length === 0" class="fin-mobile-empty">{{ $t('ui.noRecordedTxExpenses') }}</div>
              <article v-else v-for="expense in recordedBookingExpenses" :key="'rbm-' + expense.id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ expense.machinery_name || 'Machinery Expense' }}</h4>
                  <span class="badge badge-recorded">{{ $t('ui.recorded') }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.date') }}</span><span>{{ formatDate(expense.date_of_expense) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.operator') }}</span><span>{{ expense.operator_name || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.labor') }}</span><span>₱{{ formatNumber(expense.labor_cost) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.total') }}</span><span class="amount-cell">₱{{ formatNumber(expense.total_amount) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.receipt') }}</span><span>{{ expense.reference_number || '—' }}</span></div>
                </div>
                <div v-if="canManage" class="fin-mobile-card-actions">
                  <button
                    v-if="expense.reference_number"
                    type="button"
                    class="btn-secondary btn-sm fin-mobile-action receipt-view-btn"
                    @click="viewReceipt(expense.reference_number)"
                  >{{ $t('common.viewReceipt') }}</button>
                  <button type="button" class="fin-mobile-action-text fin-action-edit" @click="editExpense(expense)">{{ $t('common.edit') }}</button>
                </div>
              </article>
            </div>
            <div v-if="recordedBookingExpenses.length === 0" class="empty-state fin-desktop-empty"><p>{{ $t('ui.noRecordedTxExpenses') }}</p></div>
          </div>
        </div>

        <div class="expense-section-block">
          <h3 class="expense-section-title">{{ $t('ui.manualExpenseEntries') }} <span class="section-count">{{ manualExpenses.length }}</span></h3>
          <p class="section-hint">{{ $t('ui.expensesManualTreasurer') }}</p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.machinery') }}</th><th>{{ $t('ui.date') }}</th><th>{{ $t('ui.particulars') }}</th><th>{{ $t('ui.receiptNo') }}</th>
                    <th>{{ $t('ui.fuel') }}</th><th>{{ $t('ui.labor') }}</th><th>{{ $t('ui.total') }}</th><th v-if="canManage" class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="expense in manualExpenses" :key="'m-' + expense.id">
                    <td>{{ expense.machinery_name }}</td>
                    <td>{{ formatDate(expense.date_of_expense) }}</td>
                    <td>{{ expense.particulars }}</td>
                    <td>{{ expense.reference_number || '—' }}</td>
                    <td>₱{{ formatNumber(expense.fuel_and_oil) }}</td>
                    <td>₱{{ formatNumber(expense.labor_cost) }}</td>
                    <td class="amount-cell">₱{{ formatNumber(expense.total_amount) }}</td>
                    <td v-if="canManage" class="actions-cell members-action-row">
                      <button
                        v-if="expense.reference_number"
                        type="button"
                        class="btn-secondary btn-sm receipt-view-btn"
                        :title="$t('ui.viewReceipt')"
                        @click="viewReceipt(expense.reference_number)"
                      >
                        {{ $t('common.viewReceipt') }}
                      </button>
                      <button type="button" @click="editExpense(expense)" class="table-action-btn table-action-edit" :title="$t('common.edit')" :aria-label="$t('common.edit')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button type="button" @click="deleteExpense(expense.id)" class="table-action-btn table-action-delete" :title="$t('common.delete')" :aria-label="$t('common.delete')">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="manualExpenses.length === 0" class="fin-mobile-empty">{{ $t('ui.noManualExpenses') }}</div>
              <article v-else v-for="expense in manualExpenses" :key="'mm-' + expense.id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ expense.machinery_name || 'Manual Expense' }}</h4>
                  <span class="amount-cell">₱{{ formatNumber(expense.total_amount) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.date') }}</span><span>{{ formatDate(expense.date_of_expense) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.particulars') }}</span><span>{{ expense.particulars || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.receipt') }}</span><span>{{ expense.reference_number || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.fuel') }}</span><span>₱{{ formatNumber(expense.fuel_and_oil) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.labor') }}</span><span>₱{{ formatNumber(expense.labor_cost) }}</span></div>
                </div>
                <div v-if="canManage" class="fin-mobile-card-actions">
                  <button
                    v-if="expense.reference_number"
                    type="button"
                    class="btn-secondary btn-sm fin-mobile-action receipt-view-btn"
                    @click="viewReceipt(expense.reference_number)"
                  >{{ $t('common.viewReceipt') }}</button>
                  <button type="button" class="fin-mobile-action-text fin-action-edit" @click="editExpense(expense)">{{ $t('common.edit') }}</button>
                  <button type="button" class="fin-mobile-action-text fin-action-delete" @click="deleteExpense(expense.id)">{{ $t('common.delete') }}</button>
                </div>
              </article>
            </div>
            <div v-if="manualExpenses.length === 0" class="empty-state fin-desktop-empty"><p>{{ $t('ui.noManualExpenses') }}</p></div>
          </div>
        </div>
      </div>

      <!-- TAB 2: INCOME MANAGEMENT -->
      <div v-if="activeTab === 'income'" class="tab-content">
        <div class="section-header">
          <h2>{{ $t('ui.incomeManagement') }}</h2>
          <button v-if="canManage" @click="openManualIncomeForm" class="btn-primary">
            {{ $t('ui.recordOtherIncome') }}
          </button>
        </div>

        <!-- Income Filters -->
        <div class="filters-section tools-card">
          <div class="filter-group">
            <label class="filter-label">{{ $t('ui.incomeSourceColon') }}</label>
            <select v-model="filters.income_source" class="filter-input toolbar-select">
              <option value="all">{{ $t('ui.allSources') }}</option>
              <option value="machinery">{{ $t('ui.machineryDownPayment') }}</option>
              <option value="dues">{{ $t('ui.associationDues') }}</option>
              <option value="manual">{{ $t('ui.otherManualIncome') }}</option>
            </select>
          </div>
          <div class="filter-group">
            <label class="filter-label">{{ $t('ui.startDateColon') }}</label>
            <input v-model="filters.start_date" type="date" class="filter-input toolbar-input" />
          </div>
          <div class="filter-group">
            <label class="filter-label">{{ $t('ui.endDateColon') }}</label>
            <input v-model="filters.end_date" type="date" class="filter-input toolbar-input" />
          </div>
          <div class="filter-actions">
            <button @click="loadIncome" class="btn-secondary">{{ $t('common.filter') }}</button>
            <button @click="clearFilters" class="btn-secondary-outline">{{ $t('common.clear') }}</button>
          </div>
        </div>

        <p class="info-text">{{ $t('ui.incomeReceivedHint') }}</p>

        <div class="card" style="margin-bottom: 12px;">
          <div class="card-header">
            <h3 class="card-title">{{ $t('ui.incomeBreakdown') }}</h3>
          </div>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.source') }}</th>
                    <th>{{ $t('ui.transactions') }}</th>
                    <th>{{ $t('ui.totalAmount') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="item in incomeSourceBreakdown" :key="item.id">
                    <td>{{ formatIncomeSourceItem(item) }}</td>
                    <td>{{ item.count }}</td>
                    <td class="amount-cell">₱{{ formatNumber(item.total) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="incomeSourceBreakdown.length === 0" class="fin-mobile-empty">{{ $t('ui.noIncomeSources') }}</div>
              <article v-else v-for="item in incomeSourceBreakdown" :key="'ism-' + item.id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ formatIncomeSourceItem(item) }}</h4>
                  <span class="amount-cell">₱{{ formatNumber(item.total) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.transactions') }}</span><span>{{ item.count }}</span></div>
                </div>
              </article>
            </div>
            <div v-if="incomeSourceBreakdown.length === 0" class="empty-state fin-desktop-empty">
              <p>{{ $t('ui.noIncomeSources') }}</p>
            </div>
          </div>
        </div>

        <!-- Manual Income (Other Sources) -->
        <div class="card" style="margin-bottom: 12px;">
          <div class="card-header">
            <h3 class="card-title">{{ $t('ui.otherIncome') }}</h3>
          </div>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="data-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.source') }}</th>
                    <th>{{ $t('ui.date') }}</th>
                    <th>{{ $t('ui.amount') }}</th>
                    <th>{{ $t('ui.remarks') }}</th>
                    <th>{{ $t('ui.recordedBy') }}</th>
                    <th v-if="canManage" class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="entry in manualIncomeList" :key="'manual-' + entry.id">
                    <td>{{ entry.source_name }}</td>
                    <td>{{ formatDate(entry.date_of_income) }}</td>
                    <td class="amount-cell">₱{{ formatNumber(entry.income_amount) }}</td>
                    <td>{{ entry.remarks || $t('ui.na') }}</td>
                    <td>{{ entry.recorded_by_name || $t('ui.na') }}</td>
                    <td v-if="canManage" class="actions-cell members-action-row">
                      <button
                        type="button"
                        class="btn-secondary btn-sm"
                        @click="openEditManualIncome(entry)"
                      >
                        {{ $t('common.edit') }}
                      </button>
                      <button
                        type="button"
                        class="btn-secondary-outline btn-sm"
                        @click="deleteManualIncome(entry)"
                      >
                        {{ $t('common.delete') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="manualIncomeList.length === 0" class="fin-mobile-empty">{{ $t('ui.noManualIncomeYet') }}</div>
              <article v-else v-for="entry in manualIncomeList" :key="'manualm-' + entry.id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ entry.source_name }}</h4>
                  <span class="amount-cell">₱{{ formatNumber(entry.income_amount) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.date') }}</span><span>{{ formatDate(entry.date_of_income) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.remarks') }}</span><span>{{ entry.remarks || $t('ui.na') }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.recordedBy') }}</span><span>{{ entry.recorded_by_name || $t('ui.na') }}</span></div>
                </div>
                <div v-if="canManage" class="fin-mobile-card-actions">
                  <button type="button" class="fin-mobile-action-text fin-action-edit" @click="openEditManualIncome(entry)">{{ $t('common.edit') }}</button>
                  <button type="button" class="fin-mobile-action-text fin-action-delete" @click="deleteManualIncome(entry)">{{ $t('common.delete') }}</button>
                </div>
              </article>
            </div>
            <div v-if="manualIncomeList.length === 0" class="empty-state fin-desktop-empty">
              <p>{{ $t('ui.noManualIncomeYet') }}</p>
            </div>
          </div>
        </div>

        <!-- Income Transaction History -->
        <div class="card income-history-card" style="margin-bottom: 12px;">
          <div class="card-header">
            <h3 class="card-title">{{ $t('ui.incomeHistory') }}</h3>
          </div>
          <div class="table-container">
          <div class="fin-desktop-table">
            <table class="income-table">
              <thead>
                <tr>
                  <th>{{ $t('ui.source') }}</th>
                  <th>{{ $t('ui.farmer') }}</th>
                  <th>{{ $t('ui.machineryEquipment') }}</th>
                  <th>{{ $t('ui.incomeFrom') }}</th>
                  <th>{{ $t('ui.bookingTotal') }}</th>
                  <th>{{ $t('ui.amountReceived') }}</th>
                  <th>{{ $t('ui.paymentStatus') }}</th>
                  <th>{{ $t('ui.paymentDate') }}</th>
                  <th class="actions-col">{{ $t('ui.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="inc in consolidatedIncomeRecords" :key="getIncomeRowKey(inc)">
                  <td>
                    <span :class="['badge', isDuesIncome(inc) ? 'badge-collection' : (isDownPaymentIncome(inc) ? 'badge-down-payment' : 'badge-income')]">
                      {{ formatIncomeTypeLabel(inc.income_type) }}
                    </span>
                  </td>
                  <td>{{ inc.farmer_name || $t('ui.na') }}</td>
                  <td>{{ formatIncomeMachinery(inc) }}</td>
                  <td>{{ formatIncomeFrom(inc) }}</td>
                  <td class="amount-cell">₱{{ formatNumber(inc.original_amount) }}</td>
                  <td class="amount-cell">₱{{ formatNumber(inc.income_amount) }}</td>
                  <td>
                    <span :class="['status-badge', getIncomePaymentStatusClass(inc)]">
                      {{ getIncomePaymentStatusLabel(inc) }}
                    </span>
                  </td>
                  <td>{{ formatDate(inc.date_of_income) }}</td>
                  <td class="actions-cell">
                    <button
                      v-if="getIncomeReceiptNumber(inc)"
                      type="button"
                      class="btn-secondary btn-sm receipt-view-btn"
                      :title="$t('ui.viewReceipt')"
                      @click="viewIncomeReceipt(inc)"
                    >
                      {{ $t('common.viewReceipt') }}
                    </button>
                    <span v-else class="text-muted">—</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="fin-mobile-list">
            <div v-if="consolidatedIncomeRecords.length === 0" class="fin-mobile-empty">{{ $t('ui.noIncomeSources') }}</div>
            <article v-else v-for="inc in consolidatedIncomeRecords" :key="'incm-' + getIncomeRowKey(inc)" class="fin-mobile-card">
              <div class="fin-mobile-card-top">
                <h4 class="fin-mobile-card-name">{{ inc.farmer_name || $t('ui.na') }}</h4>
                <span :class="['badge', isDuesIncome(inc) ? 'badge-collection' : (isDownPaymentIncome(inc) ? 'badge-down-payment' : 'badge-income')]">
                  {{ formatIncomeTypeLabel(inc.income_type) }}
                </span>
              </div>
              <div class="fin-mobile-card-meta">
                <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.incomeFrom') }}</span><span>{{ formatIncomeFrom(inc) }}</span></div>
                <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.machineryEquipment') }}</span><span>{{ formatIncomeMachinery(inc) }}</span></div>
                <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.bookingTotal') }}</span><span class="amount-cell">₱{{ formatNumber(inc.original_amount) }}</span></div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.amountReceived') }}</span>
                  <span class="amount-cell" :class="{ 'income-dp-amount': isDownPaymentIncome(inc) }">₱{{ formatNumber(inc.income_amount) }}</span>
                </div>
                <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.paymentStatus') }}</span><span :class="['status-badge', getIncomePaymentStatusClass(inc)]">{{ getIncomePaymentStatusLabel(inc) }}</span></div>
                <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.paymentDate') }}</span><span>{{ formatDate(inc.date_of_income) }}</span></div>
                <div v-if="getIncomeReceiptNumber(inc)" class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.receiptNo') }}</span>
                  <span>{{ getIncomeReceiptNumber(inc) }}</span>
                </div>
              </div>
              <div v-if="getIncomeReceiptNumber(inc)" class="fin-mobile-card-actions">
                <button
                  type="button"
                  class="btn-secondary btn-sm fin-mobile-action receipt-view-btn"
                  @click="viewIncomeReceipt(inc)"
                >
                  {{ $t('common.viewReceipt') }}
                </button>
              </div>
            </article>
          </div>
          <div v-if="consolidatedIncomeRecords.length === 0" class="empty-state fin-desktop-empty">
            <p>{{ $t('ui.noIncomeTransactions') }}</p>
          </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: MONTHLY DUES COLLECTION -->
      <div v-if="activeTab === 'dues'" class="tab-content">
        <!-- Stats Grid -->
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">{{ $t('ui.totalTransactions') }}</div>
            <div class="stat-value">{{ duesSummary.total_collections }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('ui.totalAmountCollected') }}</div>
            <div class="stat-value">₱{{ formatNumber(duesSummary.total_amount) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('ui.paidThisCycle') }}</div>
            <div class="stat-value">{{ paidFarmersCount }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('ui.unpaidThisCycle') }}</div>
            <div class="stat-value">{{ unpaidFarmersCount }}</div>
          </div>
        </div>

        <!-- Two Column Layout -->
        <div class="grid-2">
          <!-- Left Column: Farmers List -->
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">{{ $t('ui.membersYourBarangay') }}</h2>
              <button type="button" class="btn btn-primary-action" @click="loadEligibleFarmers">{{ $t('common.refresh') }}</button>
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
                    v-model="duesSearchQuery"
                    type="text"
                    class="toolbar-input search-input-main"
                    :placeholder="$t('ui.searchByRefNameRole')"
                  />
                </div>
              </div>
            </div>

            <div class="table-container">
              <div class="fin-desktop-table">
                <table class="data-table">
                  <thead>
                    <tr>
                      <th>{{ $t('ui.refNo') }}</th>
                      <th>{{ $t('ui.member') }}</th>
                      <th>{{ $t('ui.role') }}</th>
                      <th>{{ $t('ui.thisCycle') }}</th>
                      <th>{{ $t('ui.lastPaid') }}</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="filteredEligibleFarmers.length === 0">
                      <td colspan="6" class="empty-message">{{ $t('ui.noRegisteredMembers') }}</td>
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
                          {{ Number(farmer.dues_paid) ? $t('ui.paid') : $t('ui.unpaid') }}
                        </span>
                      </td>
                      <td>{{ farmer.last_payment_date ? formatDate(farmer.last_payment_date) : '—' }}</td>
                      <td class="actions" @click.stop>
                        <button class="btn btn-small" @click="selectFarmer(farmer)">{{ $t('common.view') }}</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="fin-mobile-list">
                <div v-if="filteredEligibleFarmers.length === 0" class="fin-mobile-empty">{{ $t('ui.noRegisteredMembers') }}</div>
                <article
                  v-else
                  v-for="farmer in filteredEligibleFarmers"
                  :key="'fem-' + farmer.id"
                  class="fin-mobile-card"
                  :class="{ selected: selectedFarmer?.id === farmer.id }"
                  style="cursor: pointer"
                  @click="selectFarmer(farmer)"
                >
                  <div class="fin-mobile-card-top">
                    <h4 class="fin-mobile-card-name">{{ farmer.full_name }}</h4>
                    <span :class="['badge', Number(farmer.dues_paid) ? 'badge-paid' : 'badge-unpaid']">
                      {{ Number(farmer.dues_paid) ? $t('ui.paid') : $t('ui.unpaid') }}
                    </span>
                  </div>
                  <div class="fin-mobile-card-meta">
                    <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.refNo') }}</span><span>{{ farmer.reference_number || '-' }}</span></div>
                    <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.role') }}</span><span>{{ formatRoleLabel(farmer.member_role) }}</span></div>
                    <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.lastPaid') }}</span><span>{{ farmer.last_payment_date ? formatDate(farmer.last_payment_date) : '—' }}</span></div>
                  </div>
                  <div class="fin-mobile-card-actions" @click.stop>
                    <button type="button" class="btn btn-small fin-mobile-action" @click="selectFarmer(farmer)">{{ $t('common.view') }}</button>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <!-- Right Column: Selected Farmer Details -->
          <div class="card ad-member-detail-card">
            <div class="card-header">
              <h2 class="card-title">{{ $t('ui.associationDues') }}</h2>
            </div>

            <div v-if="!selectedFarmer" class="empty-state">
              <div class="empty-title">{{ $t('ui.selectAFarmer') }}</div>
              <div class="empty-text">{{ $t('ui.chooseFarmerDues') }}</div>
            </div>

            <Teleport to="body" :disabled="!isMobile">
              <Transition :name="isMobile ? 'app-modal' : ''">
                <div
                  v-if="selectedFarmer"
                  class="ad-detail-portal"
                  :class="{ 'app-modal-overlay sc-detail-overlay': isMobile, 'light-theme': isMobile && isLight }"
                  @click.self="isMobile && closeFarmerModal()"
                >
                  <div class="ad-detail-panel" :class="{ 'modal-content sc-detail-modal': isMobile }">
                    <div v-if="isMobile" class="modal-header sc-detail-modal-header">
                      <h2>{{ $t('ui.associationDues') }}</h2>
                      <button
                        type="button"
                        class="sc-detail-close"
                        :aria-label="$t('common.close')"
                        @click="closeFarmerModal"
                      >×</button>
                    </div>
                    <div class="card-body" :class="{ 'modal-body': isMobile }">
              <div class="farmer-summary">
                <div class="farmer-name">{{ selectedFarmer.full_name }}</div>
                <div class="farmer-meta">
                  {{ $t('ui.refRoleMeta', { ref: selectedFarmer.reference_number || '—', role: formatRoleLabel(selectedFarmer.member_role) }) }}
                </div>
              </div>

              <div class="stats-grid compact">
                <div class="stat-card">
                  <div class="stat-label">{{ $t('ui.duesAmount') }}</div>
                  <div class="stat-value">₱120</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">{{ $t('ui.currentCycle') }}</div>
                  <div class="stat-value stat-value-sm">{{ currentPeriodLabel }}</div>
                </div>
                <div class="stat-card">
                  <div class="stat-label">{{ $t('ui.lastPaid') }}</div>
                  <div class="stat-value">{{ selectedFarmer.last_payment_date ? formatDate(selectedFarmer.last_payment_date) : '—' }}</div>
                </div>
              </div>

              <!-- Dues Collection Form -->
              <div v-if="canCollectDues" class="dues-collection-panel">
                <div class="dues-form-grid">
                  <div class="form-field">
                    <label class="inline-label">{{ $t('ui.collectionDate') }}</label>
                    <input class="input" type="date" v-model="duesForm.collection_date" />
                  </div>
                  <div class="form-field">
                    <label class="inline-label">{{ $t('ui.amount') }}</label>
                    <input class="input" type="number" :value="120" disabled />
                  </div>
                  <div class="form-field">
                    <label class="inline-label">{{ $t('ui.paymentMethod') }}</label>
                    <select class="input" v-model="duesForm.payment_method">
                      <option value="Cash">{{ $t('ui.cash') }}</option>
                      <option value="GCash">{{ $t('ui.gcash') }}</option>
                    </select>
                  </div>
                  <div class="form-field form-field--action">
                    <button
                      type="button"
                      class="btn btn-success dues-collect-btn"
                      @click="collectMonthlyDues"
                      :disabled="!duesForm.collection_date || Number(selectedFarmer?.dues_paid) || duesCollecting"
                    >
                      {{ duesCollecting ? $t('common.processing') : $t('ui.recordPayment') }}
                    </button>
                  </div>
                </div>
                <div class="dues-lifetime-total">
                  <span class="dues-lifetime-label">{{ $t('ui.lifetimeTotalPaid') }}</span>
                  <span class="dues-lifetime-value">PHP {{ formatNumber(selectedFarmerTotalPaid) }}</span>
                </div>
              </div>

              <div v-if="canCollectDues" class="form-group dues-remarks-group">
                <label class="inline-label">{{ $t('ui.remarks') }}</label>
                <textarea v-model="duesForm.remarks" class="input dues-remarks-input" :placeholder="$t('ui.optionalNotes')"></textarea>
              </div>

              <div v-if="canCollectDues && !Number(selectedFarmer?.dues_paid)" class="form-group auto-receipt-note">
                <label>{{ $t('ui.officialReceipt') }}</label>
                <input type="text" class="input" :value="$t('ui.receiptAutoGenerated')" disabled />
                <small class="info-text">{{ $t('ui.receiptPrintsAfter') }}</small>
              </div>

              <div v-if="Number(selectedFarmer?.dues_paid)" class="info-text">
                {{ $t('ui.duesAlreadyRecorded') }}
              </div>

              <!-- Dues Payment History -->
              <div class="section-title">{{ $t('ui.duesTransactions') }}</div>
              <div class="table-container">
                <div class="fin-desktop-table dues-history-desktop">
                  <table class="data-table">
                    <thead>
                      <tr>
                        <th>{{ $t('ui.date') }}</th>
                        <th>{{ $t('ui.amount') }}</th>
                        <th>{{ $t('ui.period') }}</th>
                        <th>{{ $t('ui.paymentMethod') }}</th>
                        <th>{{ $t('ui.receiptNo') }}</th>
                        <th>{{ $t('ui.collectedBy') }}</th>
                        <th class="actions-col" aria-label="Actions"></th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="selectedFarmerPayments.length === 0">
                        <td colspan="7" class="empty-message">{{ $t('ui.noDuesTransactionsYet') }}</td>
                      </tr>
                      <tr v-else v-for="payment in selectedFarmerPayments" :key="payment.id">
                        <td>{{ formatDate(payment.collection_date) }}</td>
                        <td class="amount">₱{{ formatNumber(payment.amount) }}</td>
                        <td>{{ formatDuesCoverage(payment.period_start, payment.period_end) }}</td>
                        <td>{{ payment.payment_method }}</td>
                        <td>{{ payment.receipt_number || '—' }}</td>
                        <td>{{ payment.collected_by_name }}</td>
                        <td class="actions-cell">
                          <button
                            v-if="payment.receipt_number"
                            type="button"
                            class="btn-secondary btn-sm receipt-view-btn"
                            :title="$t('ui.viewReceipt')"
                            @click="viewReceipt(payment.receipt_number)"
                          >
                            {{ $t('common.viewReceipt') }}
                          </button>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
                <div class="fin-mobile-list dues-history-mobile">
                  <div v-if="selectedFarmerPayments.length === 0" class="fin-mobile-empty">{{ $t('ui.noDuesTransactionsYet') }}</div>
                  <article v-else v-for="payment in selectedFarmerPayments" :key="'duesm-' + payment.id" class="fin-mobile-card">
                    <div class="fin-mobile-card-top">
                      <h4 class="fin-mobile-card-name">{{ formatDate(payment.collection_date) }}</h4>
                      <span class="amount">₱{{ formatNumber(payment.amount) }}</span>
                    </div>
                    <div class="fin-mobile-card-meta">
                      <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.period') }}</span><span>{{ formatDuesCoverage(payment.period_start, payment.period_end) }}</span></div>
                      <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.paymentMethod') }}</span><span>{{ payment.payment_method }}</span></div>
                      <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.receiptNo') }}</span><span>{{ payment.receipt_number || '—' }}</span></div>
                      <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.collectedBy') }}</span><span>{{ payment.collected_by_name }}</span></div>
                    </div>
                    <div v-if="payment.receipt_number" class="fin-mobile-card-actions">
                      <button
                        type="button"
                        class="btn btn-small fin-mobile-action receipt-view-btn"
                        @click="viewReceipt(payment.receipt_number)"
                      >{{ $t('common.viewReceipt') }}</button>
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
      </div>

      <!-- TAB 3: ACCOUNTS RECEIVABLE & COLLECTIONS -->
      <div v-if="activeTab === 'ar'" class="tab-content">
        <div class="section-header">
          <h2>{{ $t('ui.accountsReceivableCollections') }}</h2>
          <p class="section-desc ar-tab-desc">
            {{ $t('ui.arCollectionsDesc') }}
          </p>
          <button
            v-if="isPaymentVerifier && downPaymentModuleOn"
            type="button"
            class="btn-primary dp-queue-btn"
            :title="$t('ui.downPaymentQueueBtnHint')"
            @click="focusDownPaymentQueue"
          >
            {{ $t('ui.downPaymentQueueBtn') }}
            <span v-if="pendingDownPayments.length" class="dp-queue-badge">{{ pendingDownPayments.length }}</span>
          </button>
          <button
            v-if="isPaymentVerifier"
            type="button"
            class="btn-primary dp-queue-btn"
            :title="$t('ui.downPaymentRefundsHint')"
            @click="focusRefundQueue"
          >
            {{ $t('ui.refundQueueBtn') }}
            <span v-if="pendingRefundRequests.length" class="dp-queue-badge">{{ pendingRefundRequests.length }}</span>
          </button>
        </div>
        <div class="auto-interest-indicator">
          {{ $t('ui.interestRuleHint') }}
        </div>

        <div
          v-if="isPaymentVerifier"
          id="down-payment-refunds"
          class="expense-section-block booking-payments-block"
        >
          <h3 class="expense-section-title">
            {{ $t('ui.downPaymentRefundsQueue') }}
            <span v-if="pendingRefundRequests.length" class="section-count">{{ pendingRefundRequests.length }}</span>
          </h3>
          <p class="section-hint">{{ $t('ui.downPaymentRefundsHint') }}</p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.refundNumber') }}</th>
                    <th>{{ $t('ui.booking') }}</th>
                    <th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.machinery') }}</th>
                    <th>{{ $t('ui.downPaymentColon') }}</th>
                    <th>{{ $t('ui.refundAmount') }}</th>
                    <th>{{ $t('ui.reason') }}</th>
                    <th>{{ $t('ui.status') }}</th>
                    <th class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="r in pendingRefundRequests"
                    :key="'rf-' + r.id"
                    :data-refund-id="r.id"
                    :data-booking-id="r.booking_id"
                    :class="{ 'notification-highlight-row': isHighlightedRefund(r) }"
                  >
                    <td>{{ r.refund_number || '—' }}</td>
                    <td>#{{ r.booking_id }}</td>
                    <td>{{ r.farmer_name }}</td>
                    <td>{{ r.machinery_name }}</td>
                    <td>₱{{ formatNumber(r.original_down_payment || r.refund_amount) }}</td>
                    <td class="amount-cell">₱{{ formatNumber(r.refund_amount) }}</td>
                    <td class="reason-cell">{{ r.refund_reason || r.reason || '—' }}</td>
                    <td><span class="status-badge">{{ r.refund_status }}</span></td>
                    <td class="payment-actions">
                      <span v-if="!canActOnRefund(r)" class="view-only-hint">—</span>
                      <div v-else-if="isRefundPendingReview(r)" class="payment-actions-inline">
                        <button type="button" class="btn-primary btn-sm" @click="approveRefundRequest(r)">{{ $t('common.approve') }}</button>
                        <button type="button" class="btn-secondary-outline btn-sm" @click="openRejectRefundModal(r)">{{ $t('common.reject') }}</button>
                      </div>
                      <button
                        v-else-if="isRefundApproved(r)"
                        type="button"
                        class="btn-primary btn-sm"
                        @click="openProcessRefundModal(r)"
                      >
                        {{ $t('ui.processRefundPayment') }}
                      </button>
                      <span v-else>—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="pendingRefundRequests.length === 0" class="fin-mobile-empty">{{ $t('ui.noRefundRequests') }}</div>
              <article
                v-else
                v-for="r in pendingRefundRequests"
                :key="'rfm-' + r.id"
                class="fin-mobile-card"
                :data-refund-id="r.id"
                :data-booking-id="r.booking_id"
                :class="{ 'notification-highlight-row': isHighlightedRefund(r) }"
              >
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ r.refund_number || ('#' + r.booking_id) }} · {{ r.farmer_name }}</h4>
                  <span class="amount-cell">₱{{ formatNumber(r.refund_amount) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.machinery') }}</span><span>{{ r.machinery_name }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.status') }}</span><span>{{ r.refund_status }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.reason') }}</span><span>{{ r.refund_reason || r.reason || '—' }}</span></div>
                </div>
                <div class="fin-mobile-card-actions payment-actions">
                  <div v-if="canActOnRefund(r) && isRefundPendingReview(r)" class="payment-actions-inline">
                    <button type="button" class="btn-primary btn-sm fin-mobile-action" @click="approveRefundRequest(r)">{{ $t('common.approve') }}</button>
                    <button type="button" class="btn-secondary-outline btn-sm fin-mobile-action" @click="openRejectRefundModal(r)">{{ $t('common.reject') }}</button>
                  </div>
                  <button
                    v-else-if="canActOnRefund(r) && isRefundApproved(r)"
                    type="button"
                    class="btn-primary btn-sm fin-mobile-action"
                    @click="openProcessRefundModal(r)"
                  >
                    {{ $t('ui.processRefundPayment') }}
                  </button>
                </div>
              </article>
            </div>
            <div v-if="pendingRefundRequests.length === 0" class="empty-state fin-desktop-empty">
              <p>{{ $t('ui.noRefundRequests') }}</p>
            </div>
          </div>
        </div>

        <div
          v-if="isPaymentVerifier && showDownPaymentQueueSection"
          id="down-payment-queue"
          class="expense-section-block"
        >
          <h3 class="expense-section-title">
            {{ $t('ui.downPaymentAwaiting') }}
            <span v-if="pendingDownPayments.length" class="section-count">{{ pendingDownPayments.length }}</span>
          </h3>
          <p class="section-hint">
            {{ $t('ui.verifyDownPaymentsHint') }}
          </p>
          <div v-if="!pendingDownPayments.length" class="empty-message" style="padding: 1rem 0;">
            {{ $t('ui.noDownPaymentsAwaiting') }}
          </div>
          <div v-else class="table-container">
            <div class="fin-desktop-table">
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.booking') }}</th>
                    <th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.machinery') }}</th>
                    <th>{{ $t('ui.downPaymentColon') }}</th>
                    <th>{{ $t('ui.dpStatus') }}</th>
                    <th>{{ $t('ui.method') }}</th>
                    <th>{{ $t('ui.submitted') }}</th>
                    <th>{{ $t('ui.proof') }}</th>
                    <th class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr
                    v-for="b in pendingDownPayments"
                    :key="'dp-' + b.id"
                    :data-dp-booking-id="b.id"
                    :data-booking-id="b.id"
                    :class="{ 'notification-highlight-row': highlightedBookingId == b.id }"
                  >
                    <td>#{{ b.id }}</td>
                    <td>{{ b.farmer_name }}</td>
                    <td>{{ b.machinery_name }}</td>
                    <td class="amount-cell">
                      <template v-if="b.down_payment_percent">{{ b.down_payment_percent }}% · </template>
                      ₱{{ formatNumber(b.down_payment_amount) }}
                    </td>
                    <td>{{ downPaymentQueueStatusLabel(b) }}</td>
                    <td>{{ b.down_payment_method || '—' }}</td>
                    <td>{{ formatDate(b.down_payment_submitted_at) }}</td>
                    <td>
                      <button
                        v-if="b.down_payment_proof"
                        type="button"
                        class="btn-secondary btn-sm proof-view-btn"
                        @click="openProofPreview(paymentProofUrl(b.down_payment_proof))"
                      >
                        {{ $t('common.viewProof') }}
                      </button>
                      <span v-else-if="b.down_payment_method === 'Cash'">{{ $t('ui.cash') }}</span>
                      <span v-else>—</span>
                    </td>
                    <td class="payment-actions">
                      <template v-if="canVerifyBookingPayment(b)">
                        <button
                          v-if="canRecordCashDownPayment(b)"
                          type="button"
                          class="btn-primary btn-sm"
                          @click="openRecordCashDownPaymentModal(b)"
                        >
                          {{ $t('ui.recordCashDownPayment') }}
                        </button>
                        <template v-if="b.status === 'Awaiting Payment Verification'">
                          <button type="button" class="btn-primary btn-sm" @click="openVerifyDownPaymentModal(b)">{{ $t('common.verifyPrintReceipt') }}</button>
                          <button type="button" class="btn-secondary-outline btn-sm" @click="openRejectDownPaymentModal(b)">{{ $t('common.reject') }}</button>
                        </template>
                      </template>
                      <span v-else class="text-muted">{{ $t('ui.awaitingRole', { role: b.booker_role === 'treasurer' ? $t('ui.president') : $t('ui.treasurer') }) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <article
                v-for="b in pendingDownPayments"
                :key="'dpm-' + b.id"
                class="fin-mobile-card"
                :data-dp-booking-id="b.id"
                :data-booking-id="b.id"
                :class="{ 'notification-highlight-row': highlightedBookingId == b.id }"
              >
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">#{{ b.id }} · {{ b.farmer_name }}</h4>
                  <span class="amount-cell">
                    <template v-if="b.down_payment_percent">{{ b.down_payment_percent }}% · </template>
                    ₱{{ formatNumber(b.down_payment_amount) }}
                  </span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.machinery') }}</span><span>{{ b.machinery_name }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.dpStatus') }}</span><span>{{ downPaymentQueueStatusLabel(b) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.method') }}</span><span>{{ b.down_payment_method || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.submitted') }}</span><span>{{ formatDate(b.down_payment_submitted_at) }}</span></div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.proof') }}</span>
                    <span>
                      <button
                        v-if="b.down_payment_proof"
                        type="button"
                        class="proof-link btn-link-inline"
                        @click="openProofPreview(paymentProofUrl(b.down_payment_proof))"
                      >{{ $t('common.viewProof') }}</button>
                      <template v-else-if="b.down_payment_method === 'Cash'">{{ $t('ui.cash') }}</template>
                      <template v-else>—</template>
                    </span>
                  </div>
                </div>
                <div class="fin-mobile-card-actions payment-actions">
                  <template v-if="canVerifyBookingPayment(b)">
                    <button
                      v-if="canRecordCashDownPayment(b)"
                      type="button"
                      class="btn-primary btn-sm fin-mobile-action"
                      @click="openRecordCashDownPaymentModal(b)"
                    >
                      {{ $t('ui.recordCashDownPayment') }}
                    </button>
                    <template v-if="b.status === 'Awaiting Payment Verification'">
                      <button type="button" class="btn-primary btn-sm fin-mobile-action" @click="openVerifyDownPaymentModal(b)">{{ $t('common.verifyPrintReceipt') }}</button>
                      <button type="button" class="btn-secondary-outline btn-sm fin-mobile-action" @click="openRejectDownPaymentModal(b)">{{ $t('common.reject') }}</button>
                    </template>
                  </template>
                  <span v-else class="text-muted">{{ $t('ui.awaitingRole', { role: b.booker_role === 'treasurer' ? $t('ui.president') : $t('ui.treasurer') }) }}</span>
                </div>
              </article>
            </div>
          </div>
        </div>

        <!-- A/R Summary Cards -->
        <div class="summary-container">
          <div class="summary-card ar-card">
            <div class="card-content">
              <span class="card-label">{{ $t('ui.totalReceivables') }}</span>
              <span class="card-amount">₱{{ formatNumber(collectionsSummary.total_receivables) }}</span>
            </div>
          </div>
          <div class="summary-card collected-card">
            <div class="card-content">
              <span class="card-label">{{ $t('ui.totalCollected') }}</span>
              <span class="card-amount">₱{{ formatNumber(collectionsSummary.total_collected) }}</span>
            </div>
          </div>
          <div class="summary-card balance-card">
            <div class="card-content">
              <span class="card-label">{{ $t('ui.outstandingBalance') }}</span>
              <span class="card-amount">₱{{ formatNumber(collectionsSummary.total_balance) }}</span>
            </div>
          </div>
        </div>

        <!-- Collections Filter (section dates/actions only — machinery is page-level) -->
        <div class="filters-section tools-card">
          <div class="filter-actions">
            <button @click="loadARData" class="btn-secondary">{{ $t('common.filter') }}</button>
            <button @click="clearFilters" class="btn-secondary-outline">{{ $t('common.clear') }}</button>
          </div>
        </div>

        <div v-if="isPaymentVerifier && pendingBalanceSubmissions.length" class="expense-section-block">
          <h3 class="expense-section-title">
            {{ $t('ui.farmerBalanceAwaiting') }}
            <span class="section-count">{{ pendingBalanceSubmissions.length }}</span>
          </h3>
          <p class="section-hint">
            {{ $t('ui.farmerBalanceHint') }}
          </p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="expenses-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.booking') }}</th>
                    <th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.machinery') }}</th>
                    <th>{{ $t('ui.amountSubmitted') }}</th>
                    <th>{{ $t('ui.balanceDue') }}</th>
                    <th>{{ $t('ui.method') }}</th>
                    <th>{{ $t('ui.submitted') }}</th>
                    <th>{{ $t('ui.proof') }}</th>
                    <th class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="s in pendingBalanceSubmissions" :key="'bs-' + s.id">
                    <td>#{{ s.booking_id }}</td>
                    <td>{{ s.farmer_name }}</td>
                    <td>{{ s.machinery_name }}</td>
                    <td class="amount-cell">₱{{ formatNumber(s.amount) }}</td>
                    <td>₱{{ formatNumber(s.remaining_balance) }}</td>
                    <td>{{ s.payment_method }}</td>
                    <td>{{ formatDate(s.submitted_at) }}</td>
                    <td>
                      <button
                        v-if="s.proof_path"
                        type="button"
                        class="btn-secondary btn-sm proof-view-btn"
                        @click="openProofPreview(paymentProofUrl(s.proof_path))"
                      >
                        {{ $t('common.viewProof') }}
                      </button>
                      <span v-else-if="s.payment_method === 'Cash'">{{ $t('ui.cash') }}</span>
                      <span v-else>—</span>
                    </td>
                    <td class="payment-actions">
                      <template v-if="canVerifyBookingPayment(s)">
                        <button type="button" class="btn-primary btn-sm" @click="openVerifyBalanceSubmissionModal(s)">{{ $t('common.verifyPrintReceipt') }}</button>
                        <button type="button" class="btn-secondary-outline btn-sm" @click="openRejectBalanceSubmissionModal(s)">{{ $t('common.reject') }}</button>
                      </template>
                      <span v-else class="text-muted">{{ $t('ui.awaitingRole', { role: s.booker_role === 'treasurer' ? $t('ui.president') : $t('ui.treasurer') }) }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="pendingBalanceSubmissions.length === 0" class="fin-mobile-empty">{{ $t('ui.noFarmerBalanceAwaiting') }}</div>
              <article v-else v-for="s in pendingBalanceSubmissions" :key="'bsm-' + s.id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">#{{ s.booking_id }} · {{ s.farmer_name }}</h4>
                  <span class="amount-cell">₱{{ formatNumber(s.amount) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.machinery') }}</span><span>{{ s.machinery_name }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.balanceDue') }}</span><span>₱{{ formatNumber(s.remaining_balance) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.method') }}</span><span>{{ s.payment_method }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.submitted') }}</span><span>{{ formatDate(s.submitted_at) }}</span></div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.proof') }}</span>
                    <span>
                      <button
                        v-if="s.proof_path"
                        type="button"
                        class="proof-link btn-link-inline"
                        @click="openProofPreview(paymentProofUrl(s.proof_path))"
                      >{{ $t('common.viewProof') }}</button>
                      <template v-else-if="s.payment_method === 'Cash'">{{ $t('ui.cash') }}</template>
                      <template v-else>—</template>
                    </span>
                  </div>
                </div>
                <div class="fin-mobile-card-actions payment-actions">
                  <template v-if="canVerifyBookingPayment(s)">
                    <button type="button" class="btn-primary btn-sm fin-mobile-action" @click="openVerifyBalanceSubmissionModal(s)">{{ $t('common.verifyPrintReceipt') }}</button>
                    <button type="button" class="btn-secondary-outline btn-sm fin-mobile-action" @click="openRejectBalanceSubmissionModal(s)">{{ $t('common.reject') }}</button>
                  </template>
                  <span v-else class="text-muted">{{ $t('ui.awaitingRole', { role: s.booker_role === 'treasurer' ? $t('ui.president') : $t('ui.treasurer') }) }}</span>
                </div>
              </article>
            </div>
            <div v-if="pendingBalanceSubmissions.length === 0" class="empty-state fin-desktop-empty">
              <p>{{ $t('ui.noFarmerBalanceAwaiting') }}</p>
            </div>
          </div>
        </div>

        <!-- A/R List -->
        <div class="ar-section">
          <div class="section-subheader">
            <h3>{{ $t('ui.listOfCollectiblesAr') }}</h3>
            <span v-if="isViewOnly" class="view-only-badge">{{ $t('ui.viewOnly') }}</span>
          </div>
          <p class="collections-note ar-list-note">
            {{ $t('ui.collectiblesNote') }}
          </p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="ar-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.sisingilinAr') }}</th>
                    <th>{{ $t('ui.nakolektangBayad') }}</th>
                    <th>{{ $t('ui.petsaNgBayad') }}</th>
                    <th>{{ $t('ui.receiptNo') }}</th>
                    <th>{{ $t('ui.outstandingBalance') }}</th>
                    <th class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="ar in arList" :key="ar.id" :data-booking-id="ar.id" :class="{ 'notification-highlight-row': highlightedBookingId == ar.id }">
                    <td>{{ ar.farmer_name }}</td>
                    <td class="amount-cell">₱{{ formatNumber(ar.remaining_balance ?? ar.accounts_receivable ?? 0) }}</td>
                    <td class="amount-cell">₱{{ formatNumber(ar.amount_collected || 0) }}</td>
                    <td>{{ ar.last_payment_date ? formatDate(ar.last_payment_date) : '—' }}</td>
                    <td>{{ ar.last_receipt_number || '—' }}</td>
                    <td class="amount-cell balance" :class="{ highlight: ar.remaining_balance > 0 }">
                      ₱{{ formatNumber(ar.remaining_balance) }}
                    </td>
                    <td class="actions-cell">
                      <div class="ar-row-actions">
                        <button
                          v-if="canManage"
                          type="button"
                          class="btn-primary btn-sm"
                          @click.stop="openRecordCollection(ar)"
                        >
                          {{ $t('ui.recordPayment') }}
                        </button>
                        <button
                          v-if="ar.last_receipt_number"
                          type="button"
                          class="btn-secondary btn-sm receipt-view-btn"
                          @click="viewReceipt(ar.last_receipt_number)"
                        >
                          {{ $t('common.viewReceipt') }}
                        </button>
                        <span v-if="!canManage && !ar.last_receipt_number">—</span>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="arList.length === 0" class="fin-mobile-empty">{{ $t('ui.noOutstandingReceivables') }}</div>
              <article
                v-else
                v-for="ar in arList"
                :key="'arm-' + ar.id"
                :data-booking-id="ar.id"
                class="fin-mobile-card"
                :class="{ 'notification-highlight-row': highlightedBookingId == ar.id }"
              >
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ ar.farmer_name }}</h4>
                  <span class="amount-cell balance" :class="{ highlight: ar.remaining_balance > 0 }">₱{{ formatNumber(ar.remaining_balance) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.sisingilinAr') }}</span><span>₱{{ formatNumber(ar.remaining_balance ?? ar.accounts_receivable ?? 0) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.nakolektangBayad') }}</span><span>₱{{ formatNumber(ar.amount_collected || 0) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.petsaNgBayad') }}</span><span>{{ ar.last_payment_date ? formatDate(ar.last_payment_date) : '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.receiptNo') }}</span><span>{{ ar.last_receipt_number || '—' }}</span></div>
                </div>
                <div class="fin-mobile-card-actions ar-mobile-actions">
                  <button
                    v-if="canManage"
                    type="button"
                    class="btn-primary btn-sm fin-mobile-action"
                    @click.stop="openRecordCollection(ar)"
                  >
                    {{ $t('ui.recordPayment') }}
                  </button>
                  <button
                    v-if="ar.last_receipt_number"
                    type="button"
                    class="btn-secondary btn-sm fin-mobile-action receipt-view-btn"
                    @click="viewReceipt(ar.last_receipt_number)"
                  >
                    {{ $t('common.viewReceipt') }}
                  </button>
                </div>
              </article>
            </div>
            <div v-if="arList.length === 0" class="empty-state fin-desktop-empty">
              <p>{{ $t('ui.noOutstandingReceivables') }}</p>
            </div>
          </div>
        </div>

        <!-- Collections Transactions — actual payments received (not A/R due) -->
        <div class="collections-section">
          <div class="section-subheader collections-header">
            <div>
              <h3>{{ $t('ui.collections') }}</h3>
              <p class="collections-note">
                {{ $t('ui.collectionsActualNote') }}
              </p>
            </div>
            <label class="collections-search">
              <span class="collections-search-icon" aria-hidden="true">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.3-4.3" stroke-linecap="round" />
                </svg>
              </span>
              <input
                v-model="collectionsSearchQuery"
                type="search"
                class="toolbar-input collections-search-input"
                :placeholder="$t('ui.searchCollectionsPlaceholder')"
                autocomplete="off"
              />
            </label>
          </div>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="collections-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.date') }}</th>
                    <th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.refNo') }}</th>
                    <th>{{ $t('ui.machinery') }}</th>
                    <th>{{ $t('ui.collectionAmount') }}</th>
                    <th>{{ $t('ui.receiptNumber') }}</th>
                    <th>{{ $t('ui.remarks') }}</th>
                    <th class="actions-col">{{ $t('ui.receipt') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="filteredCollections.length === 0">
                    <td colspan="8" class="empty-message">
                      {{ collections.length === 0 ? $t('ui.noCollectionsYet') : $t('ui.noMatchingCollections') }}
                    </td>
                  </tr>
                  <tr v-for="col in filteredCollections" :key="col.id">
                    <td>{{ formatDate(col.collection_date) }}</td>
                    <td>{{ col.farmer_name }}</td>
                    <td>{{ col.farmer_reference || '—' }}</td>
                    <td>{{ col.machinery_name }}</td>
                    <td class="amount-cell">₱{{ formatNumber(col.collection_amount) }}</td>
                    <td>{{ col.receipt_number || '—' }}</td>
                    <td>{{ col.remarks || '-' }}</td>
                    <td class="actions-cell">
                      <button
                        v-if="col.receipt_number"
                        type="button"
                        class="btn-secondary btn-sm receipt-view-btn"
                        @click="viewReceipt(col.receipt_number)"
                      >
                        {{ $t('common.viewReceipt') }}
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="filteredCollections.length === 0" class="fin-mobile-empty">
                <p>{{ collections.length === 0 ? $t('ui.noCollectionsYet') : $t('ui.noMatchingCollections') }}</p>
              </div>
              <article v-else v-for="col in filteredCollections" :key="'colm-' + col.id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ col.farmer_name }}</h4>
                  <span class="amount-cell">₱{{ formatNumber(col.collection_amount) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.refNo') }}</span><span>{{ col.farmer_reference || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.date') }}</span><span>{{ formatDate(col.collection_date) }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.machinery') }}</span><span>{{ col.machinery_name }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.receiptNumber') }}</span><span>{{ col.receipt_number || '—' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.remarks') }}</span><span>{{ col.remarks || '-' }}</span></div>
                </div>
                <div v-if="col.receipt_number" class="fin-mobile-card-actions">
                  <button
                    type="button"
                    class="btn-secondary btn-sm fin-mobile-action receipt-view-btn"
                    @click="viewReceipt(col.receipt_number)"
                  >{{ $t('common.viewReceipt') }}</button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB: GCASH QR CODE (treasurer) -->
      <div v-if="activeTab === 'inventory'" class="tab-content">
        <div class="section-header">
          <h2>{{ $t('ui.gcashQrCode') }}</h2>
          <p class="section-desc">{{ $t('ui.gcashQrInventorySub') }}</p>
        </div>

        <div class="card gcash-qr-card">
          <div class="gcash-qr-layout">
            <div class="gcash-qr-visual">
              <button
                v-if="gcashDisplaySrc"
                type="button"
                class="gcash-qr-frame"
                @click="openProofPreview(gcashDisplaySrc)"
              >
                <img :src="gcashDisplaySrc" :alt="$t('ui.gcashQrCode')" class="gcash-qr-preview" />
              </button>
              <div v-else class="gcash-qr-empty">
                {{ $t('ui.gcashNoQrUploaded') }}
              </div>
              <p v-if="gcashPendingPreview" class="gcash-qr-caption">{{ $t('ui.gcashNewQrPreview') }}</p>
              <p v-else-if="gcashQr" class="gcash-qr-caption">{{ $t('ui.gcashTapToEnlarge') }}</p>
            </div>
            <div class="gcash-qr-info">
              <h3 class="gcash-qr-heading">{{ $t('ui.gcashCurrentQr') }}</h3>
              <p v-if="gcashQr?.uploaded_by_name && !gcashPendingFile" class="gcash-qr-meta">
                {{ $t('ui.recordedBy') }}: {{ gcashQr.uploaded_by_name }}
              </p>
              <p v-if="gcashPendingFile" class="gcash-qr-meta">{{ gcashPendingFile.name }}</p>
              <input
                ref="gcashQrFileInput"
                type="file"
                class="gcash-qr-file-native"
                accept="image/jpeg,image/png,image/webp,image/gif,.jpg,.jpeg,.png,.webp,.gif"
                @change="onGcashQrFileSelect"
              />
              <div class="gcash-qr-actions">
                <button
                  type="button"
                  class="gcash-qr-choose"
                  :disabled="gcashQrBusy"
                  @click="gcashQrFileInput?.click()"
                >
                  {{ gcashQr || gcashPendingFile ? $t('ui.gcashReplaceQr') : $t('ui.gcashUploadQr') }}
                </button>
                <button
                  v-if="gcashPendingFile"
                  type="button"
                  class="btn-primary gcash-qr-save"
                  :disabled="gcashQrBusy"
                  @click="saveGcashQr"
                >
                  {{ gcashQrBusy ? $t('common.saving') : $t('ui.gcashSaveQr') }}
                </button>
                <button
                  v-if="gcashPendingFile"
                  type="button"
                  class="gcash-qr-text-btn"
                  :disabled="gcashQrBusy"
                  @click="clearGcashPendingQr"
                >
                  {{ $t('common.cancel') }}
                </button>
                <button
                  v-if="gcashQr && !gcashPendingFile"
                  type="button"
                  class="gcash-qr-delete"
                  :disabled="gcashQrBusy"
                  @click="deleteGcashQr"
                >
                  {{ $t('ui.gcashDeleteQr') }}
                </button>
                <button
                  type="button"
                  class="gcash-qr-history"
                  :disabled="gcashHistoryBusy"
                  @click="toggleGcashHistory"
                >
                  {{ showGcashHistory ? $t('ui.gcashHideHistory') : $t('ui.gcashHistory') }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div class="expense-section-block">
          <h3 class="expense-section-title">
            {{ $t('ui.gcashPendingPayments') }}
            <span v-if="pendingGcashPayments.length" class="section-count">{{ pendingGcashPayments.length }}</span>
          </h3>
          <p class="section-hint">{{ $t('ui.gcashPendingPaymentsHint') }}</p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="ar-table gcash-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.gcashTransactionType') }}</th>
                    <th>{{ $t('ui.refNo') }}</th>
                    <th>{{ $t('ui.petsaNgBayad') }}</th>
                    <th>{{ $t('ui.proof') }}</th>
                    <th>{{ $t('ui.paymentStatus') }}</th>
                    <th class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="pendingGcashPayments.length === 0">
                    <td colspan="7" class="empty-message">{{ $t('ui.gcashNoPending') }}</td>
                  </tr>
                  <tr v-else v-for="row in pendingGcashPayments" :key="'gcash-' + row.id" :data-gcash-id="row.id" :data-gcash-ref="row.reference_id" :class="{ 'notification-highlight-row': String(highlightedGcashRef) === String(row.id) || String(highlightedGcashRef) === String(row.reference_id) }">
                    <td>{{ row.farmer_name }}</td>
                    <td>{{ gcashTypeLabel(row.transaction_type) }}</td>
                    <td>{{ row.reference_number || row.reference_id }}</td>
                    <td>{{ formatDate(row.payment_date || row.submitted_at) }}</td>
                    <td>
                      <button
                        v-if="row.proof_path"
                        type="button"
                        class="btn-secondary btn-sm proof-view-btn"
                        @click="openProofPreview(paymentProofUrl(row.proof_path))"
                      >
                        {{ $t('common.viewProof') }}
                      </button>
                      <span v-else>—</span>
                    </td>
                    <td>{{ $t('ui.gcashPendingVerification') }}</td>
                    <td class="actions-cell">
                      <div class="ar-row-actions">
                        <button type="button" class="btn-primary btn-sm" @click="openGcashConfirm(row)">
                          {{ $t('ui.gcashConfirmPayment') }}
                        </button>
                        <button type="button" class="btn-secondary-outline btn-sm" @click="openGcashReject(row)">
                          {{ $t('common.reject') }}
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="pendingGcashPayments.length === 0" class="fin-mobile-empty">{{ $t('ui.gcashNoPending') }}</div>
              <article v-else v-for="row in pendingGcashPayments" :key="'gcashm-' + row.id" class="fin-mobile-card" :data-gcash-id="row.id" :data-gcash-ref="row.reference_id" :class="{ 'notification-highlight-row': String(highlightedGcashRef) === String(row.id) || String(highlightedGcashRef) === String(row.reference_id) }">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ row.farmer_name }}</h4>
                  <span>{{ gcashTypeLabel(row.transaction_type) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.refNo') }}</span>
                    <span>{{ row.reference_number || row.reference_id }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.petsaNgBayad') }}</span>
                    <span>{{ formatDate(row.payment_date || row.submitted_at) }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.paymentStatus') }}</span>
                    <span>{{ $t('ui.gcashPendingVerification') }}</span>
                  </div>
                </div>
                <div class="fin-mobile-card-actions">
                  <button
                    v-if="row.proof_path"
                    type="button"
                    class="btn-secondary btn-sm fin-mobile-action"
                    @click="openProofPreview(paymentProofUrl(row.proof_path))"
                  >
                    {{ $t('common.viewProof') }}
                  </button>
                  <button type="button" class="btn-primary btn-sm fin-mobile-action" @click="openGcashConfirm(row)">
                    {{ $t('ui.gcashConfirmPayment') }}
                  </button>
                  <button type="button" class="btn-secondary-outline btn-sm fin-mobile-action" @click="openGcashReject(row)">
                    {{ $t('common.reject') }}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div v-if="showGcashHistory" id="gcash-history" class="expense-section-block">
          <h3 class="expense-section-title">
            {{ $t('ui.gcashHistory') }}
            <span v-if="gcashHistoryRows.length" class="section-count">{{ gcashHistoryRows.length }}</span>
          </h3>
          <p class="section-hint">{{ $t('ui.gcashHistoryHint') }}</p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="ar-table gcash-table">
                <thead>
                  <tr>
                    <th>{{ $t('ui.farmer') }}</th>
                    <th>{{ $t('ui.gcashTransactionType') }}</th>
                    <th>{{ $t('ui.refNo') }}</th>
                    <th>{{ $t('ui.amount') }}</th>
                    <th>{{ $t('ui.petsaNgBayad') }}</th>
                    <th>{{ $t('ui.paymentStatus') }}</th>
                    <th>{{ $t('ui.notes') }}</th>
                    <th class="actions-col">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="gcashHistoryRows.length === 0">
                    <td colspan="8" class="empty-message">{{ $t('ui.gcashNoHistory') }}</td>
                  </tr>
                  <tr
                    v-else
                    v-for="row in gcashHistoryRows"
                    :key="'gcashh-' + row.id"
                    :data-gcash-id="row.id"
                    :class="{ 'notification-highlight-row': isHighlightedGcashRow(row) }"
                  >
                    <td>{{ row.farmer_name }}</td>
                    <td>{{ gcashTypeLabel(row.transaction_type) }}</td>
                    <td>{{ row.reference_number || row.reference_id }}</td>
                    <td>{{ row.status === 'verified' ? '₱' + formatNumber(row.amount_paid) : '—' }}</td>
                    <td>{{ formatDate(row.verified_at || row.payment_date || row.submitted_at) }}</td>
                    <td>
                      <span :class="['status-badge', row.status === 'rejected' ? 'unpaid' : 'verified']">
                        {{ row.status === 'rejected' ? $t('ui.gcashRejected') : $t('ui.gcashVerified') }}
                      </span>
                    </td>
                    <td>{{ gcashHistoryNote(row) }}</td>
                    <td class="actions-cell">
                      <button
                        v-if="row.proof_path"
                        type="button"
                        class="btn-secondary btn-sm proof-view-btn"
                        @click="openProofPreview(paymentProofUrl(row.proof_path))"
                      >
                        {{ $t('common.viewProof') }}
                      </button>
                      <span v-else>—</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="gcashHistoryRows.length === 0" class="fin-mobile-empty">{{ $t('ui.gcashNoHistory') }}</div>
              <article
                v-else
                v-for="row in gcashHistoryRows"
                :key="'gcashhm-' + row.id"
                class="fin-mobile-card"
                :data-gcash-id="row.id"
                :class="{ 'notification-highlight-row': isHighlightedGcashRow(row) }"
              >
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">{{ row.farmer_name }}</h4>
                  <span :class="['status-badge', row.status === 'rejected' ? 'unpaid' : 'verified']">
                    {{ row.status === 'rejected' ? $t('ui.gcashRejected') : $t('ui.gcashVerified') }}
                  </span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.gcashTransactionType') }}</span>
                    <span>{{ gcashTypeLabel(row.transaction_type) }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.refNo') }}</span>
                    <span>{{ row.reference_number || row.reference_id }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.amount') }}</span>
                    <span>{{ row.status === 'verified' ? '₱' + formatNumber(row.amount_paid) : '—' }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.petsaNgBayad') }}</span>
                    <span>{{ formatDate(row.verified_at || row.payment_date || row.submitted_at) }}</span>
                  </div>
                  <div v-if="gcashHistoryNote(row)" class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.notes') }}</span>
                    <span>{{ gcashHistoryNote(row) }}</span>
                  </div>
                </div>
                <div v-if="row.proof_path" class="fin-mobile-card-actions">
                  <button
                    type="button"
                    class="btn-secondary btn-sm fin-mobile-action"
                    @click="openProofPreview(paymentProofUrl(row.proof_path))"
                  >
                    {{ $t('common.viewProof') }}
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 4: PROFIT COMPUTATION -->
      <div v-if="activeTab === 'profit'" class="tab-content">
        <div class="section-header">
          <h2>{{ $t('ui.profitComputationDist') }}</h2>
          <p v-if="filters.machinery_id" class="section-hint">
            Filtered by:
            <strong>{{ reportMachineryLabel }}</strong>
          </p>
          <p v-else class="section-hint">Showing all machinery in scope.</p>
        </div>

        <div class="usage-leaders-card">
          <div class="section-subheader">
            <h3>{{ $t('ui.mostUsedMachineryCompleted') }}</h3>
          </div>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="data-table usage-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>{{ $t('ui.machinery') }}</th>
                    <th>{{ $t('ui.type') }}</th>
                    <th v-if="isAdmin">{{ $t('ui.barangay') }}</th>
                    <th>{{ $t('ui.completedBookings') }}</th>
                    <th>{{ $t('ui.totalAreaBooked') }}</th>
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
                      <small>{{ formatAreaUnit(item.area_unit_hint) }}</small>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="fin-mobile-list">
              <div v-if="bookingUsageLeaders.length === 0" class="fin-mobile-empty">{{ $t('ui.noCompletedBookingUsage') }}</div>
              <article v-else v-for="(item, index) in bookingUsageLeaders" :key="'usm-' + item.machinery_id" class="fin-mobile-card">
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">#{{ index + 1 }} · {{ item.machinery_name || '-' }}</h4>
                  <span>{{ $t('ui.bookingCount', { count: item.booking_count }) }}</span>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.type') }}</span><span>{{ item.machinery_type || '-' }}</span></div>
                  <div v-if="isAdmin" class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.barangay') }}</span><span>{{ item.barangay_name || '-' }}</span></div>
                  <div class="fin-mobile-meta-row"><span class="fin-mobile-label">{{ $t('ui.totalAreaBooked') }}</span><span>{{ formatNumber(item.total_area_booked) }} <small>{{ formatAreaUnit(item.area_unit_hint) }}</small></span></div>
                </div>
              </article>
            </div>
            <div v-if="bookingUsageLeaders.length === 0" class="empty-state fin-desktop-empty">
              <p>{{ $t('ui.noCompletedBookingUsage') }}</p>
            </div>
          </div>
        </div>

        <div class="profit-breakdown">
          <div class="breakdown-card">
            <h3>{{ $t('ui.incomeBreakdownShort') }}</h3>
            <p class="amount">₱{{ formatNumber(profitSummary.total_income) }}</p>
          </div>

          <div class="breakdown-card">
            <h3>{{ $t('ui.expenseBreakdown') }}</h3>
            <div class="expense-items">
              <div class="expense-item">
                <span>{{ $t('ui.fuelAndOil') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.fuel_and_oil || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>{{ $t('ui.laborCost') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.labor_cost || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>{{ $t('ui.perDiem') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.per_diem || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>{{ $t('ui.repairMaintenance') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.repair_and_maintenance || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>{{ $t('ui.officeSupply') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.office_supply || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>{{ $t('ui.communication') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.communication_expense || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>{{ $t('ui.utilities') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.utilities_expense || 0) }}</span>
              </div>
              <div class="expense-item">
                <span>{{ $t('ui.sundries') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.sundries || 0) }}</span>
              </div>
              <div class="expense-item total">
                <span>{{ $t('ui.totalExpenses') }}</span>
                <span>₱{{ formatNumber(expenseBreakdown.total || 0) }}</span>
              </div>
            </div>
          </div>

          <div class="breakdown-card profit">
            <h3>{{ $t('ui.netProfit') }}</h3>
            <p class="amount" :class="{ negative: profitSummary.net_profit < 0 }">
              ₱{{ formatNumber(profitSummary.net_profit) }}
            </p>
          </div>
        </div>

        <!-- Profit Distribution Breakdown -->
        <div v-if="profitSummary.net_profit > 0" class="profit-distribution-section">
          <h3>{{ $t('ui.profitDistAlloc') }}</h3>
          <p class="info-text">{{ $t('ui.netProfitDistributedAs') }}</p>
          
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
                <h4>{{ $t('ui.organization') }}</h4>
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
                <h4>{{ $t('ui.trainingDevelopment') }}</h4>
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
                <h4>{{ $t('ui.membersDistribution') }}</h4>
                <p class="percentage">50%</p>
                <p class="amount">₱{{ formatNumber(profitDistribution.members) }}</p>
              </div>
            </div>

            <div class="distribution-card per-member-card">
              <div class="distribution-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/>
                  <circle cx="12" cy="7" r="4"/>
                </svg>
              </div>
              <div class="distribution-content">
                <h4>{{ $t('ui.perMember') }}</h4>
                <p class="percentage">{{ totalMembers > 0 ? $t('dashboard.membersCount', { count: totalMembers }) : '—' }}</p>
                <p class="amount">₱{{ formatNumber(profitDistribution.per_member) }}</p>
              </div>
            </div>
          </div>

          <div v-if="canManage" class="distribution-actions">
            <button @click="generateProfitDistributionRecord" class="btn-primary">
              {{ $t('ui.generateProfitDistRecord') }}
            </button>
          </div>
        </div>

        <div v-else-if="profitSummary.net_profit === 0" class="empty-state">
          <p>{{ $t('ui.noProfitToDistribute') }}</p>
        </div>

        <div v-else class="empty-state">
          <p>{{ $t('ui.lossDetected') }}</p>
        </div>
      </div>

      <!-- TAB 5: REPORTS -->
      <div v-if="activeTab === 'reports'" class="tab-content">
        <div class="section-header">
          <h2>{{ $t('ui.financialReports') }}</h2>
        </div>
        
        <!-- Report Generation Panel -->
        <div class="report-generator-panel">
          <div class="report-options-grid">
            <!-- Report Type Selection -->
            <div class="report-option-card">
              <h4>{{ $t('ui.reportPeriod') }}</h4>
              <div class="report-type-buttons">
                <button type="button" @click="selectReportType('monthly', $event)" class="report-type-btn" :class="{ active: selectedReportType === 'monthly' }">
                  <span class="btn-text">{{ $t('ui.monthly') }}</span>
                </button>
                <button type="button" @click="selectReportType('quarterly', $event)" class="report-type-btn" :class="{ active: selectedReportType === 'quarterly' }">
                  <span class="btn-text">{{ $t('ui.quarterly') }}</span>
                </button>
                <button type="button" @click="selectReportType('annual', $event)" class="report-type-btn" :class="{ active: selectedReportType === 'annual' }">
                  <span class="btn-text">{{ $t('ui.annual') }}</span>
                </button>
              </div>
              
              <!-- Custom Date Range -->
              <div class="custom-date-toggle">
                <label class="checkbox-inline">
                  <input type="checkbox" v-model="reportFilters.customDateRange" />
                  <span>{{ $t('ui.customDateRange') }}</span>
                </label>
              </div>
              <div v-if="reportFilters.customDateRange" class="custom-date-inputs">
                <div class="date-input-group">
                  <label>{{ $t('ui.fromColon') }}</label>
                  <input type="date" v-model="reportFilters.startDate" class="form-input-sm" />
                </div>
                <div class="date-input-group">
                  <label>{{ $t('ui.toColon') }}</label>
                  <input type="date" v-model="reportFilters.endDate" class="form-input-sm" />
                </div>
                <button @click="generateReportCustom" class="btn-generate" :disabled="reportLoading || !reportFilters.startDate || !reportFilters.endDate">
                  {{ reportLoading ? $t('ui.generating') : $t('ui.generate') }}
                </button>
              </div>
            </div>
            
            <!-- Report Sections Filter -->
            <div class="report-option-card">
              <h4>{{ $t('ui.includeInReport') }}</h4>
              <div class="filter-checkboxes">
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showSummary" />
                  <span>{{ $t('incomeForm.summary') }}</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showDistribution" />
                  <span>{{ $t('ui.profitDistribution') }}</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showAllTransactions" />
                  <span>{{ $t('ui.allTransactions') }}</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showExpenses" />
                  <span>{{ $t('ui.expenseDetails') }}</span>
                </label>
                <label class="filter-checkbox" :title="$t('ui.farmerClientsRecordTitle')">
                  <input type="checkbox" v-model="reportFilters.showServiceLedger" />
                  <span>{{ $t('ui.farmerClientsRecord') }}</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showCollectiblesList" />
                  <span>{{ $t('ui.listOfCollectibles') }}</span>
                </label>
                <label class="filter-checkbox">
                  <input type="checkbox" v-model="reportFilters.showBookings" />
                  <span>{{ $t('ui.bookingsSummary') }}</span>
                </label>
              </div>
            </div>
            
            <!-- Print/Export Actions -->
            <div class="report-option-card actions-card">
              <h4>{{ $t('ui.exportOptions') }}</h4>
              
              <!-- Orientation Toggle -->
              <div class="orientation-setting">
                <span class="orientation-label">{{ $t('ui.pageOrientation') }}</span>
                <div class="orientation-toggle">
                  <button
                    type="button"
                    @click="selectOrientation('portrait', $event)"
                    class="orient-btn"
                    :class="{ active: printOrientation === 'portrait' }"
                  >
                    {{ $t('ui.portrait') }}
                  </button>
                  <button
                    type="button"
                    @click="selectOrientation('landscape', $event)"
                    class="orient-btn"
                    :class="{ active: printOrientation === 'landscape' }"
                  >
                    {{ $t('ui.landscape') }}
                  </button>
                </div>
              </div>

              <div class="action-buttons">
                <button
                  @click="printReport"
                  class="btn-action print btn-action-icon"
                  :disabled="!reportData"
                  :title="$t('ui.printReport')"
                  :aria-label="$t('ui.printReport')"
                >
                  <PrintIcon :size="18" />
                </button>
                <button class="btn-action select-all" @click="selectAllFilters">
                  <span>{{ $t('ui.selectAll') }}</span>
                </button>
                <button class="btn-action clear" @click="clearAllFilters">
                  <span>{{ $t('common.clearAll') }}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <!-- Loading State (initial generate only) -->
        <div v-if="reportLoading && !reportData" class="report-loading">
          <div class="loading-spinner"></div>
          <p>{{ $t('ui.generatingReport') }}</p>
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
            <p>{{ $t('ui.updatingReport') }}</p>
          </div>
          <!-- Report Header (CFA = Barangay scope; period from filter/API; no contact/address) -->
          <div class="report-header">
            <div class="report-logo">
              <img :src="reportLogoUrl" alt="CalFFA Logo" class="report-logo-image" />
              <div class="logo-text">
                <p class="report-cfa-line">
                  <strong>{{ $t('ui.nameOfCfa') }}</strong> {{ reportBarangayNameForReport }}
                </p>
                <h3 class="report-doc-title">{{ $t('ui.machineryFinancialReport') }}</h3>
              </div>
            </div>
            <div class="report-meta">
              <h3>{{ $t('ui.transactionReport', { type: reportTypeLabel(reportData.type) }) }}</h3>
              <p class="report-period-long">
                {{ formatReportPeriodLong(reportData.period.start, reportData.period.end) }}
              </p>
              <p class="report-generated">
                {{ $t('ui.generatedColon') }} {{ formatReportDate(reportData.generated_at) }}
              </p>
            </div>
          </div>

          <!-- Farmer Clients Transaction Record -->
          <MachineryReportSheet
            v-if="reportFilters.showServiceLedger"
            :title="$t('ui.farmerClientsRecordTitle')"
            :subtitle="$t('ui.farmerClientsRecord')"
            sheet-class="farmer-clients-record-sheet"
            :barangay-name="reportBarangayNameForReport"
            :machinery-label="reportMachineryLabel"
            :period-label="formatReportPeriodCompact(reportData.period.start, reportData.period.end)"
            :sheet-meta="reportSheetMeta"
          >
                <table class="collectibles-data-table farmer-clients-record-table">
                  <thead>
                    <tr>
                      <th class="fcr-col-client">
                        {{ $t('ui.nameOfFarmer') }}<br />
                        <span class="th-tl">({{ $t('ui.nameOfFarmerOther') }})</span>
                      </th>
                      <th class="fcr-col-loc">
                        {{ $t('ui.farmLocation') }}<br />
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
                      <th class="fcr-col-rcpt">{{ $t('ui.receiptNo') }}</th>
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
                      <td class="fcr-col-hrs">{{ $t('ui.na') }}</td>
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

            <template #mobile>
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
                    <span class="fcr-mobile-label">{{ $t('ui.nameOfFarmer') }}</span>
                    <span class="fcr-mobile-value">{{ row.client_name || '—' }}</span>
                  </div>
                  <div class="fcr-mobile-row">
                    <span class="fcr-mobile-label">{{ $t('ui.farmLocation') }}</span>
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
                    <span class="fcr-mobile-value">{{ $t('ui.na') }}</span>
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
                    <span class="fcr-mobile-label">{{ $t('ui.receiptNo') }}</span>
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
            </template>
          </MachineryReportSheet>

          <!-- List of Collectibles -->
          <MachineryReportSheet
            v-if="reportFilters.showCollectiblesList"
            :title="$t('ui.listOfCollectibles')"
            :subtitle="$t('ui.listOfCollectiblesOther')"
            :barangay-name="reportBarangayNameForReport"
            :machinery-label="reportMachineryLabel"
            :period-label="formatReportPeriodCompact(reportData.period.start, reportData.period.end)"
            :sheet-meta="reportSheetMeta"
          >
                <table class="collectibles-data-table collectibles-list-table">
                  <thead>
                    <tr>
                      <th class="col-client">
                        {{ $t('ui.nameOfFarmer') }}<br />
                        <span class="th-tl">({{ $t('ui.nameOfFarmerOther') }})</span>
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
                      <th class="col-rcpt">{{ $t('ui.receiptNo') }}</th>
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

            <template #mobile>
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
                    <span class="fcr-mobile-label">{{ $t('ui.nameOfFarmer') }}</span>
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
                    <span class="fcr-mobile-label">{{ $t('ui.receiptNo') }}</span>
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
            </template>
          </MachineryReportSheet>

          <!-- Summary -->
          <MachineryReportSheet
            v-if="reportFilters.showSummary"
            :title="$t('incomeForm.summary')"
            subtitle="Buod ng Pananalapi"
            :show-machinery-type="false"
            :barangay-name="reportBarangayNameForReport"
            :period-label="formatReportPeriodCompact(reportData.period.start, reportData.period.end)"
            :sheet-meta="reportSheetMeta"
          >
            <table class="collectibles-data-table collectibles-list-table mfr-summary-table">
                <thead>
                  <tr>
                  <th class="mfr-col-item">
                    Item<br />
                    <span class="th-tl">(Uri ng Item)</span>
                  </th>
                  <th class="mfr-col-amt text-right">
                    {{ $t('ui.amount') }}<br />
                    <span class="th-tl">(Halaga)</span>
                  </th>
                  <th class="mfr-col-rec">
                    {{ $t('ui.records') }}<br />
                    <span class="th-tl">(Bilang ng Rekord)</span>
                  </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                  <td class="mfr-col-item">{{ $t('ui.totalExpenses') }}</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.total_expenses) }}</td>
                  <td class="mfr-col-rec">{{ reportData.counts.expenses }} records</td>
                  </tr>
                  <tr>
                  <td class="mfr-col-item">{{ $t('ui.totalIncome') }}</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.total_income) }}</td>
                  <td class="mfr-col-rec">{{ reportData.counts.income }} records</td>
                  </tr>
                  <tr>
                  <td class="mfr-col-item">Total Collections</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.total_collections) }}</td>
                  <td class="mfr-col-rec">{{ reportData.counts.collections }} payments</td>
                  </tr>
                  <tr>
                  <td class="mfr-col-item">Net Profit/Loss</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.net_profit) }}</td>
                  <td class="mfr-col-rec">{{ reportData.summary.net_profit >= 0 ? 'Profit' : 'Loss' }}</td>
                  </tr>
                </tbody>
              </table>
            <template #mobile>
              <ReportMobileCards :cards="summaryMobileCards" />
            </template>
          </MachineryReportSheet>
          
          <!-- Profit Distribution -->
          <MachineryReportSheet
            v-if="reportFilters.showDistribution && reportData.summary.net_profit > 0"
            :title="$t('ui.profitDistribution')"
            subtitle="Pamamahagi ng Kita"
            :show-machinery-type="false"
            :barangay-name="reportBarangayNameForReport"
            :period-label="formatReportPeriodCompact(reportData.period.start, reportData.period.end)"
            :sheet-meta="reportSheetMeta"
          >
            <table class="collectibles-data-table collectibles-list-table mfr-distribution-table">
                <thead>
                  <tr>
                  <th class="mfr-col-alloc">
                    Allocation<br />
                    <span class="th-tl">(Paglalaan)</span>
                  </th>
                  <th class="mfr-col-share">
                    {{ $t('common.share') }}<br />
                    <span class="th-tl">(Bahagi)</span>
                  </th>
                  <th class="mfr-col-amt text-right">
                    {{ $t('ui.amount') }}<br />
                    <span class="th-tl">(Halaga)</span>
                  </th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                  <td class="mfr-col-alloc">{{ $t('ui.organization') }}</td>
                  <td class="mfr-col-share">30%</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.distribution.organization_share) }}</td>
                  </tr>
                  <tr>
                  <td class="mfr-col-alloc">{{ $t('ui.training') }}</td>
                  <td class="mfr-col-share">20%</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.distribution.training_share) }}</td>
                  </tr>
                  <tr>
                  <td class="mfr-col-alloc">{{ $t('nav.members') }}</td>
                  <td class="mfr-col-share">50%</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.distribution.members_share) }}</td>
                  </tr>
                  <tr>
                  <td class="mfr-col-alloc">{{ $t('ui.perMemberCount', { count: reportData.summary.distribution.member_count }) }}</td>
                  <td class="mfr-col-share">—</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(reportData.summary.distribution.per_member_share) }}</td>
                  </tr>
                </tbody>
              </table>
            <template #mobile>
              <ReportMobileCards :cards="distributionMobileCards" />
            </template>
          </MachineryReportSheet>

          <!-- All Transactions -->
          <MachineryReportSheet
            v-if="reportFilters.showAllTransactions"
            :title="$t('ui.allTransactions')"
            subtitle="Lahat ng Transaksyon"
            :show-machinery-type="false"
            :barangay-name="reportBarangayNameForReport"
            :period-label="formatReportPeriodCompact(reportData.period.start, reportData.period.end)"
            :sheet-meta="reportSheetMeta"
          >
            <table class="collectibles-data-table collectibles-list-table mfr-transactions-table">
                <thead>
                  <tr>
                  <th class="mfr-col-date">
                    {{ $t('ui.date') }}<br />
                    <span class="th-tl">(Petsa)</span>
                  </th>
                  <th class="mfr-col-type">
                    {{ $t('ui.type') }}<br />
                    <span class="th-tl">(Uri)</span>
                  </th>
                  <th class="mfr-col-mach">
                    {{ $t('ui.machinery') }}<br />
                    <span class="th-tl">(Makinarya)</span>
                  </th>
                  <th class="mfr-col-desc">
                    Description<br />
                    <span class="th-tl">(Paglalarawan)</span>
                  </th>
                  <th class="mfr-col-farmer">
                    {{ $t('ui.farmer') }}<br />
                    <span class="th-tl">(Magsasaka)</span>
                  </th>
                  <th class="mfr-col-amt text-right">
                    {{ $t('ui.amount') }}<br />
                    <span class="th-tl">(Halaga)</span>
                  </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="txn in reportData.transactions.all" :key="txn.id + '-' + txn.transaction_type">
                  <td class="mfr-col-date">{{ formatReportDateCompact(txn.date) }}</td>
                  <td class="mfr-col-type">{{ txn.transaction_type || '—' }}</td>
                  <td class="mfr-col-mach">{{ txn.machinery_name || '—' }}</td>
                  <td class="mfr-col-desc">{{ txn.description || '—' }}</td>
                  <td class="mfr-col-farmer">{{ txn.farmer_name || '—' }}</td>
                  <td class="mfr-col-amt text-right">
                    {{ txn.transaction_type === 'Expense' ? '-' : '+' }}{{ formatReportMoneyCompact(txn.amount) }}
                    </td>
                  </tr>
                  <tr v-if="reportData.transactions.all.length === 0">
                  <td colspan="6" class="collectibles-empty-note">Walang rekord sa piniling saklaw ng petsa / No records in this period.</td>
                  </tr>
                </tbody>
              </table>
            <template #mobile>
              <ReportMobileCards
                :cards="allTransactionsMobileCards"
                :is-empty="reportData.transactions.all.length === 0"
                :empty-text="REPORT_EMPTY_MOBILE_MSG"
              />
            </template>
          </MachineryReportSheet>

          <!-- Expense Details -->
          <MachineryReportSheet
            v-if="reportFilters.showExpenses"
            :title="$t('ui.expenseDetails')"
            subtitle="Detalye ng Gastos"
            :barangay-name="reportBarangayNameForReport"
            :machinery-label="reportMachineryLabel"
            :period-label="formatReportPeriodCompact(reportData.period.start, reportData.period.end)"
            :sheet-meta="reportSheetMeta"
          >
            <table class="collectibles-data-table farmer-clients-record-table mfr-expense-table">
                <thead>
                  <tr>
                  <th class="mfr-col-date">
                    {{ $t('ui.date') }}<br />
                    <span class="th-tl">(Petsa)</span>
                  </th>
                  <th class="mfr-col-mach">
                    {{ $t('ui.machinery') }}<br />
                    <span class="th-tl">(Makinarya)</span>
                  </th>
                  <th class="mfr-col-desc">
                    {{ $t('ui.particulars') }}<br />
                    <span class="th-tl">(Detalye)</span>
                  </th>
                  <th class="mfr-col-ref">{{ $t('ui.refHash') }}</th>
                  <th class="mfr-col-sm text-right">
                    Fuel &amp; Oil<br />
                    <span class="th-tl">(Gasolina at Langis)</span>
                  </th>
                  <th class="mfr-col-sm text-right">
                    {{ $t('ui.labor') }}<br />
                    <span class="th-tl">(Paggawa)</span>
                  </th>
                  <th class="mfr-col-sm text-right">
                    Per Diem<br />
                    <span class="th-tl">(Pang-araw-araw)</span>
                  </th>
                  <th class="mfr-col-sm text-right">R&amp;M</th>
                  <th class="mfr-col-sm text-right">
                    Others<br />
                    <span class="th-tl">(Iba pa)</span>
                  </th>
                  <th class="mfr-col-amt text-right">
                    {{ $t('ui.total') }}<br />
                    <span class="th-tl">(Kabuuan)</span>
                  </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="exp in reportData.transactions.expenses" :key="'exp-' + exp.id">
                  <td class="mfr-col-date">{{ formatReportDateCompact(exp.date) }}</td>
                  <td class="mfr-col-mach">{{ exp.machinery_name || '—' }}</td>
                  <td class="mfr-col-desc">{{ exp.description || '—' }}</td>
                  <td class="mfr-col-ref">{{ exp.reference_number || '—' }}</td>
                  <td class="mfr-col-sm text-right">{{ formatReportMoneyCompact(exp.fuel_and_oil) }}</td>
                  <td class="mfr-col-sm text-right">{{ formatReportMoneyCompact(exp.labor_cost) }}</td>
                  <td class="mfr-col-sm text-right">{{ formatReportMoneyCompact(exp.per_diem) }}</td>
                  <td class="mfr-col-sm text-right">{{ formatReportMoneyCompact(exp.repair_and_maintenance) }}</td>
                  <td class="mfr-col-sm text-right">{{ formatReportMoneyCompact((parseFloat(exp.office_supply || 0) + parseFloat(exp.communication_expense || 0) + parseFloat(exp.utilities_expense || 0) + parseFloat(exp.sundries || 0))) }}</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(exp.amount) }}</td>
                </tr>
                <tr v-if="reportData.transactions.expenses.length === 0">
                  <td colspan="10" class="collectibles-empty-note">Walang rekord sa piniling saklaw ng petsa / No records in this period.</td>
                  </tr>
                </tbody>
              <tfoot v-if="reportData.transactions.expenses.length > 0">
                <tr class="fcr-total-row">
                  <td colspan="9"><strong>Total Expenses / Kabuuang Gastos</strong></td>
                  <td class="mfr-col-amt text-right"><strong>{{ formatReportMoneyCompact(reportData.summary.total_expenses) }}</strong></td>
                  </tr>
                </tfoot>
              </table>
            <template #mobile>
              <ReportMobileCards
                :cards="expenseDetailsMobileCards"
                :is-empty="reportData.transactions.expenses.length === 0"
                :empty-text="REPORT_EMPTY_MOBILE_MSG"
                :footer-rows="expenseDetailsMobileFooter"
              />
            </template>
          </MachineryReportSheet>
          
          <!-- Bookings Summary -->
          <MachineryReportSheet
            v-if="reportFilters.showBookings"
            :title="$t('ui.bookingsSummary')"
            subtitle="Buod ng mga Booking"
            :show-machinery-type="false"
            :barangay-name="reportBarangayNameForReport"
            :period-label="formatReportPeriodCompact(reportData.period.start, reportData.period.end)"
            :sheet-meta="reportSheetMeta"
          >
            <table class="collectibles-data-table farmer-clients-record-table mfr-bookings-table">
                <thead>
                  <tr>
                  <th class="mfr-col-date">
                    {{ $t('ui.date') }}<br />
                    <span class="th-tl">(Petsa)</span>
                  </th>
                  <th class="mfr-col-ref">
                    Booking #<br />
                    <span class="th-tl">(Numero ng Booking)</span>
                  </th>
                  <th class="mfr-col-mach">
                    {{ $t('ui.machinery') }}<br />
                    <span class="th-tl">(Makinarya)</span>
                  </th>
                  <th class="mfr-col-farmer">
                    {{ $t('ui.farmer') }}<br />
                    <span class="th-tl">(Magsasaka)</span>
                  </th>
                  <th class="mfr-col-status">
                    {{ $t('ui.status') }}<br />
                    <span class="th-tl">(Katayuan)</span>
                  </th>
                  <th class="mfr-col-amt text-right">
                    {{ $t('ui.totalPrice') }}<br />
                    <span class="th-tl">(Kabuuang Presyo)</span>
                  </th>
                  <th class="mfr-col-amt text-right">
                    {{ $t('ui.paid') }}<br />
                    <span class="th-tl">(Nabayaran)</span>
                  </th>
                  <th class="mfr-col-status">
                    Payment Status<br />
                    <span class="th-tl">(Katayuan ng Bayad)</span>
                  </th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="bk in reportData.transactions.bookings" :key="'bk-' + bk.id">
                  <td class="mfr-col-date">{{ formatReportDateCompact(bk.date) }}</td>
                  <td class="mfr-col-ref">#{{ bk.booking_id }}</td>
                  <td class="mfr-col-mach">{{ bk.machinery_name || '—' }}</td>
                  <td class="mfr-col-farmer">{{ bk.farmer_name || '—' }}</td>
                  <td class="mfr-col-status">{{ bk.status || '—' }}</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(bk.amount) }}</td>
                  <td class="mfr-col-amt text-right">{{ formatReportMoneyCompact(bk.total_paid) }}</td>
                  <td class="mfr-col-status">{{ bk.payment_status || 'Unpaid' }}</td>
                </tr>
                <tr v-if="reportData.transactions.bookings.length === 0">
                  <td colspan="8" class="collectibles-empty-note">Walang rekord sa piniling saklaw ng petsa / No records in this period.</td>
                  </tr>
                </tbody>
              </table>
            <template #mobile>
              <ReportMobileCards
                :cards="bookingsSummaryMobileCards"
                :is-empty="reportData.transactions.bookings.length === 0"
                :empty-text="REPORT_EMPTY_MOBILE_MSG"
              />
            </template>
          </MachineryReportSheet>
          
          <!-- Report Footer -->
          <div class="report-footer">
            <p>This report was generated automatically by CalFFA Financial Management System</p>
            <p class="footer-date">Report Date: {{ new Date().toLocaleDateString('en-PH', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) }}</p>
          </div>
        </div>
      </div>
    </div>

    <!-- DOWN PAYMENT VERIFY MODAL -->
    <div v-if="showVerifyDpModal && paymentActionBooking" class="modal-overlay" @click.self="closePaymentModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ $t('ui.downPayment') }}</h2>
          <button type="button" class="btn-close" @click="closePaymentModals">×</button>
        </div>
        <div class="modal-body">
          <p>
            Confirm
            <template v-if="paymentActionBooking.down_payment_percent">{{ paymentActionBooking.down_payment_percent }}% </template>
            down payment of
            <strong>₱{{ formatNumber(paymentActionBooking.down_payment_amount) }}</strong>
            for {{ paymentActionBooking.farmer_name }} ({{ paymentActionBooking.machinery_name }}).
          </p>
          <div class="form-group auto-receipt-note">
            <label>{{ $t('ui.officialReceipt') }}</label>
            <input type="text" class="filter-input" :value="$t('ui.receiptAutoGenerated')" disabled />
            <small class="info-text">{{ $t('ui.receiptPrintsAfter') }}</small>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closePaymentModals">{{ $t('common.cancel') }}</button>
            <button type="button" class="btn-primary" :disabled="paymentActionLoading" @click="confirmVerifyDownPayment">
              {{ paymentActionLoading ? 'Verifying...' : 'Verify Payment & Print Receipt' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- RECORD CASH DOWN PAYMENT MODAL (above header) -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showRecordDpModal && paymentActionBooking"
          class="modal-overlay app-modal-overlay mf-record-dp-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closePaymentModals"
        >
          <div class="modal-content mf-record-dp-modal" @click.stop>
            <div class="modal-header">
              <h2>{{ $t('ui.recordCashDownPayment') }}</h2>
              <button type="button" class="btn-close" :aria-label="$t('common.close')" @click="closePaymentModals">×</button>
            </div>
            <div class="modal-body">
              <p class="mf-record-dp-meta">
                <strong>{{ paymentActionBooking.farmer_name }}</strong>
                <span>{{ paymentActionBooking.machinery_name }}</span>
                <span>#{{ paymentActionBooking.id }}</span>
              </p>
              <div class="form-group">
                <label>{{ $t('ui.downPayment') }}</label>
                <input
                  type="text"
                  class="filter-input"
                  :value="recordDpAmountDisplay"
                  disabled
                  readonly
                />
                <small v-if="paymentActionBooking.down_payment_percent" class="info-text">
                  {{ $t('ui.downPaymentPercentLabel', { percent: paymentActionBooking.down_payment_percent }) }}
                </small>
              </div>
              <div class="form-group">
                <label>{{ $t('ui.paymentDate') }}</label>
                <input v-model="recordDpDate" type="date" class="filter-input" />
              </div>
              <div class="form-group auto-receipt-note">
                <label>{{ $t('ui.officialReceipt') }}</label>
                <input type="text" class="filter-input" :value="$t('ui.receiptAutoGenerated')" disabled />
                <small class="info-text">{{ $t('ui.receiptPrintsAfter') }}</small>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="paymentActionLoading || !recordDpDate"
                  @click="confirmRecordCashDownPayment"
                >
                  {{ paymentActionLoading ? $t('ui.recordingCashDownPayment') : $t('ui.recordCashDownPaymentConfirm') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- REJECT PAYMENT MODAL -->
    <div v-if="showRejectDpModal && paymentActionBooking" class="modal-overlay" @click.self="closePaymentModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ $t('common.reject') }}</h2>
          <button type="button" class="btn-close" @click="closePaymentModals">×</button>
        </div>
        <div class="modal-body">
          <p>Reject this payment submission? The farmer may resubmit proof.</p>
          <div class="form-group">
            <label>{{ $t('ui.reason') }} *</label>
            <textarea v-model="rejectPaymentReason" class="filter-input" rows="3" required></textarea>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closePaymentModals">{{ $t('common.cancel') }}</button>
            <button type="button" class="btn-danger" :disabled="paymentActionLoading || !rejectPaymentReason.trim()" @click="confirmRejectDownPayment">
              {{ paymentActionLoading ? 'Rejecting...' : $t('common.reject') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- BALANCE PAYMENT VERIFY MODAL -->
    <div v-if="showVerifyFinalModal && paymentActionBooking" class="modal-overlay" @click.self="closePaymentModals">
      <div class="modal-content">
        <div class="modal-header">
          <h2>Verify Balance Payment</h2>
          <button type="button" class="btn-close" @click="closePaymentModals">×</button>
        </div>
        <div class="modal-body">
          <p>
            Confirm farmer-submitted payment of
            <strong>₱{{ formatNumber(paymentSubmissionTarget?.amount || paymentActionBooking.amount) }}</strong>
            against balance due of <strong>₱{{ formatNumber(paymentActionBooking.remaining_balance) }}</strong>.
          </p>
          <div class="form-group auto-receipt-note">
            <label>{{ $t('ui.officialReceipt') }}</label>
            <input type="text" class="filter-input" :value="$t('ui.receiptAutoGenerated')" disabled />
            <small class="info-text">{{ $t('ui.receiptPrintsAfter') }}</small>
          </div>
          <div class="modal-actions">
            <button type="button" class="btn-secondary" @click="closePaymentModals">{{ $t('common.cancel') }}</button>
            <button type="button" class="btn-primary" :disabled="paymentActionLoading" @click="confirmVerifyFinalPayment">
              {{ paymentActionLoading ? 'Verifying...' : 'Verify Payment & Print Receipt' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- RECEIPT PRINT MODAL (teleported above member detail / other overlays) -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showReceiptModal && lastReceipt"
          class="modal-overlay receipt-modal-overlay app-modal-overlay mf-receipt-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeReceiptModal"
        >
          <div
            class="receipt-modal-box"
            @click.stop
          >
            <PaymentReceiptPrint
              :receipt="lastReceipt"
              :auto-print="receiptAutoPrint"
              :kind="receiptPrintKind"
              @close="closeReceiptModal"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <ProofPreviewModal
      :show="showProofPreview"
      :src="proofPreviewSrc"
      title="GCash Payment Proof"
      @close="closeProofPreview"
    />

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showGcashConfirmModal && gcashActionRow"
          class="modal-overlay app-modal-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeGcashModals"
        >
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h2>{{ $t('ui.gcashConfirmTitle') }}</h2>
              <button type="button" class="btn-close" :aria-label="$t('common.close')" @click="closeGcashModals">×</button>
            </div>
            <div class="modal-body">
              <p class="section-hint">
                {{ isGcashDownPaymentConfirm ? $t('ui.gcashConfirmHintDownPayment') : $t('ui.gcashConfirmHint') }}
              </p>
              <div class="transaction-context-panel">
                <div class="context-grid">
                  <div><span class="ctx-label">{{ $t('ui.farmer') }}</span><strong>{{ gcashActionRow.farmer_name }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.gcashTransactionType') }}</span><strong>{{ gcashTypeLabel(gcashActionRow.transaction_type) }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.refNo') }}</span><strong>{{ gcashActionRow.reference_number || gcashActionRow.reference_id }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.petsaNgBayad') }}</span><strong>{{ formatDate(gcashActionRow.payment_date) }}</strong></div>
                </div>
              </div>
              <div v-if="gcashActionRow.proof_path" class="gcash-confirm-proof">
                <button type="button" class="btn-secondary btn-sm" @click="openProofPreview(paymentProofUrl(gcashActionRow.proof_path))">
                  {{ $t('common.viewProof') }}
                </button>
              </div>
              <div class="form-group">
                <label>{{ isGcashDownPaymentConfirm ? $t('ui.gcashAmountPaidFixed') : $t('ui.gcashAmountPaid') }} *</label>
                <TypedNumberInput
                  v-if="!isGcashDownPaymentConfirm"
                  v-model="gcashConfirmAmount"
                  :min="0"
                  input-class="form-input"
                  placeholder="0.00"
                />
                <input
                  v-else
                  type="text"
                  class="form-input"
                  :value="gcashFixedAmountDisplay"
                  disabled
                  readonly
                />
              </div>
              <div class="form-group">
                <label>{{ $t('ui.remarks') }}</label>
                <textarea v-model="gcashConfirmRemarks" class="form-input" :placeholder="$t('ui.optionalNotes')"></textarea>
              </div>
              <div class="modal-actions">
                <button type="button" class="btn-primary" :disabled="gcashVerifyBusy" @click="confirmGcashPayment">
                  {{ gcashVerifyBusy ? $t('common.processing') : $t('ui.gcashConfirmPayment') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showGcashRejectModal && gcashActionRow"
          class="modal-overlay app-modal-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeGcashModals"
        >
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h2>{{ $t('common.reject') }}</h2>
              <button type="button" class="btn-close" @click="closeGcashModals">×</button>
            </div>
            <div class="modal-body">
              <p>{{ gcashActionRow.farmer_name }} · {{ gcashTypeLabel(gcashActionRow.transaction_type) }}</p>
              <div class="form-group">
                <label>{{ $t('ui.reason') }} *</label>
                <textarea
                  v-model="gcashRejectReason"
                  class="form-input"
                  rows="3"
                  :placeholder="$t('ui.reason')"
                  required
                ></textarea>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="gcashVerifyBusy || !gcashRejectReason.trim()"
                  @click="rejectGcashPayment"
                >
                  {{ gcashVerifyBusy ? $t('common.processing') : $t('common.reject') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showRejectRefundModal && refundActionTarget"
          class="modal-overlay app-modal-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeRefundModals"
        >
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h2>{{ $t('ui.rejectRefundRequest') }}</h2>
              <button type="button" class="btn-close" @click="closeRefundModals">×</button>
            </div>
            <div class="modal-body">
              <p>
                {{ refundActionTarget.refund_number }} — Booking #{{ refundActionTarget.booking_id }}
                ({{ refundActionTarget.farmer_name }})
              </p>
              <div class="form-group">
                <label>{{ $t('ui.reason') }} *</label>
                <textarea
                  v-model="rejectRefundReason"
                  class="form-input"
                  rows="3"
                  :placeholder="$t('ui.reason')"
                ></textarea>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="paymentActionLoading || !rejectRefundReason.trim()"
                  @click="confirmRejectRefund"
                >
                  {{ paymentActionLoading ? $t('common.processing') : $t('common.reject') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showProcessRefundModal && refundActionTarget"
          class="modal-overlay app-modal-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeRefundModals"
        >
          <div class="modal-content" @click.stop>
            <div class="modal-header">
              <h2>{{ $t('ui.processRefundPayment') }}</h2>
              <button type="button" class="btn-close" @click="closeRefundModals">×</button>
            </div>
            <div class="modal-body">
              <p>
                Release <strong>₱{{ formatNumber(refundActionTarget.refund_amount) }}</strong>
                to {{ refundActionTarget.farmer_name }}.
              </p>
              <div class="form-group">
                <label>{{ $t('ui.petsaNgBayad') }}</label>
                <input v-model="refundProcessDate" type="date" class="form-input" />
              </div>
              <div class="form-group">
                <label>{{ $t('ui.remarks') }}</label>
                <textarea v-model="refundProcessRemarks" class="form-input" rows="2"></textarea>
              </div>
              <div class="modal-actions">
                <button
                  type="button"
                  class="btn-primary"
                  :disabled="paymentActionLoading"
                  @click="confirmProcessRefund"
                >
                  {{ paymentActionLoading ? $t('common.processing') : $t('ui.processRefundPrint') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- EXPENSE FORM MODAL (centered above header; scroll-locked backdrop) -->
    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showExpenseForm"
          class="modal-overlay app-modal-overlay mf-expense-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeExpenseForm"
        >
          <div class="modal-content modal-large mf-expense-modal" @click.stop>
            <div class="modal-header">
              <h2>{{ completingPendingExpense ? 'Record Transaction Expenses' : (editingExpense ? 'Edit Expense' : 'Record Manual Expense') }}</h2>
              <button type="button" @click="closeExpenseForm" class="btn-close" :aria-label="$t('common.close')">×</button>
            </div>
            <div class="modal-body">
              <div v-if="completingPendingExpense && pendingExpenseContext" class="transaction-context-panel">
                <h3>Transaction Details</h3>
                <div class="context-grid">
                  <div><span class="ctx-label">{{ $t('ui.machinery') }}</span><strong>{{ pendingExpenseContext.machinery_name }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.operator') }}</span><strong>{{ pendingExpenseContext.operator_name || '—' }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.farmer') }}</span><strong>{{ pendingExpenseContext.farmer_name || '—' }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.serviceDate') }}</span><strong>{{ formatDate(pendingExpenseContext.booking_date) }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.location') }}</span><strong>{{ pendingExpenseContext.service_location || '—' }}</strong></div>
                  <div><span class="ctx-label">{{ $t('ui.areaQty') }}</span><strong>{{ pendingExpenseContext.area_size }} {{ pendingExpenseContext.area_unit }}</strong></div>
                  <div><span class="ctx-label">Booking Total</span><strong>₱{{ formatNumber(pendingExpenseContext.booking_total) }}</strong></div>
                </div>
                <p class="context-hint">Enter actual expense amounts. Labor cost credits the assigned operator on save.</p>
              </div>

              <div class="expense-meta-grid">
                <div class="form-group">
                  <label>{{ $t('ui.machineryEquipmentReq') }}</label>
                  <select v-model="expenseForm.machinery_id" class="form-input" :disabled="completingPendingExpense">
                    <option value="">-- Select Machinery/Equipment --</option>
                    <option v-for="m in scopedMachinery" :key="m.id" :value="m.id">
                      {{ m.machinery_name }} ({{ m.machinery_type }})
                    </option>
                  </select>
                </div>

                <div class="form-group">
                  <label>Date of Expense *</label>
                  <input v-model="expenseForm.date_of_expense" type="date" class="form-input" />
                </div>

                <div class="form-group">
                  <label>{{ $t('ui.paymentMethod') }}</label>
                  <select v-model="expenseForm.payment_method" class="form-input">
                    <option value="Cash">{{ $t('ui.cash') }}</option>
                    <option value="GCash">{{ $t('ui.gcash') }}</option>
                  </select>
                </div>
              </div>

              <p class="auto-receipt-inline">Official receipt is auto-generated and prints after saving.</p>

              <input v-if="completingPendingExpense" type="hidden" v-model="expenseForm.booking_id" />

              <div class="expense-items-grid">
                <div class="form-group">
                  <label>{{ $t('ui.fuelAndOil') }}</label>
                  <TypedNumberInput v-model="expenseForm.fuel_and_oil" @input="updateTotal" />
                </div>
                <div class="form-group">
                  <label>{{ $t('ui.laborCost') }}</label>
                  <TypedNumberInput v-model="expenseForm.labor_cost" @input="updateTotal" />
                </div>
                <div class="form-group">
                  <label>{{ $t('ui.perDiem') }}</label>
                  <TypedNumberInput v-model="expenseForm.per_diem" @input="updateTotal" />
                </div>
                <div class="form-group">
                  <label>{{ $t('ui.repairMaintenance') }}</label>
                  <TypedNumberInput v-model="expenseForm.repair_and_maintenance" @input="updateTotal" />
                </div>
                <div class="form-group">
                  <label>{{ $t('ui.officeSupply') }}</label>
                  <TypedNumberInput v-model="expenseForm.office_supply" @input="updateTotal" />
                </div>
                <div class="form-group">
                  <label>{{ $t('ui.communication') }}</label>
                  <TypedNumberInput v-model="expenseForm.communication_expense" @input="updateTotal" />
                </div>
                <div class="form-group">
                  <label>{{ $t('ui.utilities') }}</label>
                  <TypedNumberInput v-model="expenseForm.utilities_expense" @input="updateTotal" />
                </div>
                <div class="form-group">
                  <label>{{ $t('ui.sundries') }}</label>
                  <TypedNumberInput v-model="expenseForm.sundries" @input="updateTotal" />
                </div>
              </div>

              <div class="form-group expense-total-group">
                <label>Total Amount *</label>
                <TypedNumberInput v-model="expenseForm.total_amount" readonly input-class="form-input total-input" />
              </div>

              <div class="modal-actions">
                <button type="button" @click="saveExpense" class="btn-success">
                  {{ completingPendingExpense ? 'Save & Print Receipt' : (editingExpense ? 'Update Expense' : 'Record Expense & Print Receipt') }}
                </button>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- INCOME FORM MODAL -->
    <div v-if="showIncomeForm" class="modal-overlay" @click.self="showIncomeForm = false">
      <div class="modal-content">
        <div class="modal-header">
          <h2>{{ editingManualIncomeId ? 'Edit Other Barangay Income' : 'Record Other Barangay Income' }}</h2>
          <button @click="showIncomeForm = false" class="btn-close">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-summary">
            Record income from donations, rentals, fundraising, sales, or another source outside machinery bookings and association dues.
          </p>

          <div class="form-group">
            <label>Income Source *</label>
            <input
              v-model="incomeForm.source_name"
              type="text"
              class="form-input"
              maxlength="150"
              placeholder="e.g. Donation, fundraising, product sales"
            />
          </div>

          <div class="form-group">
            <label>Date of Income *</label>
            <input v-model="incomeForm.date_of_income" type="date" class="form-input" />
          </div>

          <div class="form-group">
            <label>Income Amount *</label>
            <TypedNumberInput v-model="incomeForm.income_amount" :min="0.01" />
          </div>

          <div class="form-group">
            <label>{{ $t('ui.remarks') }}</label>
            <textarea v-model="incomeForm.remarks" class="form-input" :placeholder="$t('ui.optionalNotes')"></textarea>
          </div>

          <div class="modal-actions">
            <button @click="showIncomeForm = false" class="btn-secondary">{{ $t('common.cancel') }}</button>
            <button
              @click="saveIncome"
              class="btn-success"
              :disabled="!incomeForm.source_name.trim() || !incomeForm.date_of_income || Number(incomeForm.income_amount) <= 0"
            >
              {{ editingManualIncomeId ? 'Save Changes' : 'Record Income' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- COLLECTION FORM MODAL (teleported above header; scroll-locked) -->
    <Teleport to="body">
      <div
        v-if="showCollectionForm && editingCollection"
        class="modal-overlay app-modal-overlay mf-collection-overlay"
        :class="{ 'light-theme': isLight }"
        style="z-index: 12050; opacity: 1; visibility: visible; display: flex; pointer-events: auto;"
        @click.self="onCollectionOverlayBackdropClick"
      >
          <div class="modal-content mf-collection-modal pay-checkout-shell" @click.stop>
            <PaymentCheckoutPanel
              :is-light="isLight"
              :kicker="$t('payCheckout.secureCheckout')"
              :title="$t('payCheckout.collectMachinery')"
              :payee="editingCollection.farmer_name"
              :amount-due="remainingBalance"
              :detail-rows="collectionDetailRows"
              :due-meta="collectionDueMeta"
              :overdue="isOverdue"
              :payment-type="collectionForm.paymentType"
              :amount="collectionForm.paymentAmount"
              :date="collectionForm.collectionDate"
              :method="collectionForm.payment_method || 'Cash'"
              :methods="['Cash']"
              :remarks="collectionForm.remarks"
              :remaining-after="Math.max(0, remainingBalanceAfter)"
              :show-partial-warning="showPartialWarning"
              :submit-disabled="collectionSaving || !collectionForm.paymentAmount || collectionForm.paymentAmount <= 0 || showPartialWarning"
              :loading="collectionSaving"
              @cancel="closeCollectionForm"
              @submit="saveCollection"
              @update:payment-type="onCheckoutPaymentType"
              @update:amount="collectionForm.paymentAmount = $event"
              @update:date="collectionForm.collectionDate = $event"
              @update:method="collectionForm.payment_method = $event"
              @update:remarks="collectionForm.remarks = $event"
              @amount-input="validatePaymentAmount"
            >
              <template #hint>
                <p v-if="editingCollection.pending_interest > 0" class="pay-checkout-hint">
                  {{ $t('payCheckout.pendingInterest', { amount: formatNumber(editingCollection.pending_interest) }) }}
                </p>
                <p v-else-if="collectionForm.paymentType === 'partial' && (editingCollection.machinery_interest_rate || 0) > 0" class="pay-checkout-hint">
                  {{ $t('payCheckout.firstPartialInterest', { rate: formatInterestRateDisplay(editingCollection.machinery_interest_rate) }) }}
                </p>
              </template>
            </PaymentCheckoutPanel>
          </div>
      </div>
    </Teleport>

    <!-- MONTHLY DUES COLLECTION MODAL -->
    <div v-if="showDuesForm" class="modal-overlay" @click.self="showDuesForm = false">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>{{ $t('ui.collectMonthlyDues') }}</h2>
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
                  <span v-if="selectedFarmer.dues_paid" class="status-paid">{{ $t('ui.paidThisCycle') }}</span>
                  <span v-else class="status-unpaid">{{ $t('ui.unpaidThisCycle') }}</span>
                </div>
                <button @click="selectedFarmer = null; duesForm.farmer_id = ''" class="btn-change">{{ $t('common.change') }}</button>
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
                      <span v-if="farmer.dues_paid" class="status-badge paid">{{ $t('ui.paid') }}</span>
                      <span v-else class="status-badge unpaid">{{ $t('ui.unpaid') }}</span>
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
              <label>{{ $t('ui.paymentMethod') }}</label>
              <select v-model="duesForm.payment_method" class="form-input">
                <option value="Cash">{{ $t('ui.cash') }}</option>
                <option value="GCash">{{ $t('ui.gcash') }}</option>
              </select>
            </div>
          </div>

          <!-- Amount Display -->
          <div v-if="selectedFarmer" class="form-group highlight-box">
            <label>{{ $t('ui.duesAmount') }}:</label>
            <div class="amount-display">
              <span class="amount-large">₱120.00</span>
              <small>(Monthly dues for 6-month period)</small>
            </div>
          </div>

          <!-- Remarks -->
          <div v-if="selectedFarmer" class="form-group">
            <label>{{ $t('ui.remarks') }}</label>
            <textarea v-model="duesForm.remarks" class="form-input" :placeholder="$t('ui.optionalNotes')"></textarea>
          </div>

          <div v-if="selectedFarmer && !Number(selectedFarmer?.dues_paid)" class="form-group auto-receipt-note">
            <label>{{ $t('ui.officialReceipt') }}</label>
            <input type="text" class="form-input" :value="$t('ui.receiptAutoGenerated')" disabled />
            <small class="info-text">{{ $t('ui.receiptPrintsAfter') }}</small>
          </div>

          <div class="modal-actions">
            <button @click="showDuesForm = false" class="btn-secondary">{{ $t('common.cancel') }}</button>
            <button @click="collectMonthlyDues" class="btn-success" :disabled="!selectedFarmer || !duesForm.collection_date || Number(selectedFarmer?.dues_paid) || duesCollecting">
              {{ duesCollecting ? $t('common.processing') : $t('ui.recordPayment') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Alert Messages -->
    <Teleport to="body">
      <div
        v-if="alert.show"
        class="alert-center-stack mf-alert-stack"
        :class="{ 'light-theme': isLight }"
      >
        <div :class="['alert', 'alert-' + alert.type]">
          <span class="alert-message">{{ alert.message }}</span>
          <button type="button" @click="alert.show = false" class="alert-close" :aria-label="$t('common.close')">×</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useI18n } from 'vue-i18n';
import { useAuthStore } from '../stores/authStore';
import { useMachineryStore } from '../stores/machineryStore';
import { useDownPaymentStore } from '../stores/downPaymentStore';
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue';
import PaymentCheckoutPanel from '../components/PaymentCheckoutPanel.vue';
import MachineryReportSheet from '../components/MachineryReportSheet.vue';
import ReportMobileCards from '../components/ReportMobileCards.vue';
import PrintIcon from '../components/icons/PrintIcon.vue';
import ProofPreviewModal from '../components/ProofPreviewModal.vue';
import TypedNumberInput from '../components/TypedNumberInput.vue';
import { useGcashPaymentStore } from '../stores/gcashPaymentStore';
import { apiUrl } from '../utils/apiBase';
import { useBackdropTheme } from '../composables/useBackdropTheme';
import { useFinancialApi } from '../utils/financialApi';
import { canVerifyMachineryPayment } from '../utils/roleAccess';
import { getMachineryDueDateString, isMachineryOverdue, formatManilaDateLabel, getManilaTodayString, normalizeDateString } from '../utils/philippineTime';
import { buildPrintableSheetHtml, getMachineryReportPrintStyles } from '../utils/machineryReportPrint';
import { consumeNotificationDeepLink, scrollElementWhenReady } from '../utils/paymentHistoryFocus';

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();
const { t } = useI18n();
const machineryStore = useMachineryStore();
const downPaymentStore = useDownPaymentStore();
const gcashStore = useGcashPaymentStore();
const pendingDownPayments = ref([]);
const pendingBalanceSubmissions = ref([]);
const pendingGcashPayments = ref([]);
const gcashHistoryRows = ref([]);
const showGcashHistory = ref(false);
const gcashHistoryBusy = ref(false);
const gcashQr = ref(null);
const gcashQrBusy = ref(false);
const gcashQrFileInput = ref(null);
const gcashPendingFile = ref(null);
const gcashPendingPreview = ref('');
const gcashVerifyBusy = ref(false);
const showGcashConfirmModal = ref(false);
const showGcashRejectModal = ref(false);
const gcashActionRow = ref(null);
const gcashConfirmAmount = ref('');
const gcashConfirmRemarks = ref('');
const gcashRejectReason = ref('');
const pendingRefundRequests = ref([]);
const showVerifyDpModal = ref(false);
const showRecordDpModal = ref(false);
const showRejectDpModal = ref(false);
const showVerifyFinalModal = ref(false);
const showRejectRefundModal = ref(false);
const showProcessRefundModal = ref(false);
const refundActionTarget = ref(null);
const rejectRefundReason = ref('');
const refundProcessDate = ref('');
const refundProcessRemarks = ref('');
const paymentActionBooking = ref(null);
const verifyReceiptNumber = ref('');
const rejectPaymentReason = ref('');
const recordDpAmount = ref(null);
const recordDpDate = ref('');
const paymentActionLoading = ref(false);
const showDownPaymentPanel = ref(false);
const showReceiptModal = ref(false);
const lastReceipt = ref(null);
const receiptAutoPrint = ref(true);
const showProofPreview = ref(false);
const proofPreviewSrc = ref('');

const receiptPrintKind = computed(() => {
  const module = String(lastReceipt.value?.module || '');
  if (module === 'machinery_refund') return 'refund';
  if (module === 'machinery_expense') return 'expense';
  if (module === 'operator_labor') return 'labor';
  if (module === 'share_capital_withdrawal') return 'withdrawal';
  return 'payment';
});

const pendingPaymentsCount = computed(
  () => pendingRefundRequests.value.length
);
const { isDark } = useBackdropTheme();
const isLight = computed(() => !isDark.value);
const reportLogoUrl = 'https://tse1.mm.bing.net/th/id/OIP.6bwLRZ62anox4000YCXuQwAAAA?rs=1&pid=ImgDetMain&o=7&rm=3';

const highlightedBookingId = ref(null);
const highlightedRefundBookingId = ref(null);
const highlightedGcashRef = ref(null);

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
const isPresident = computed(() => userRole.value === 'president');
const isPaymentVerifier = computed(() => ['treasurer', 'president'].includes(userRole.value));
const downPaymentModuleOn = computed(() => downPaymentStore.isActive);
const showDownPaymentQueueSection = computed(
  () =>
    showDownPaymentPanel.value ||
    pendingDownPayments.value.length > 0
);

const canVerifyBookingPayment = (booking) =>
  canVerifyMachineryPayment(
    userRole.value,
    booking?.booker_role || 'farmer',
    authStore.currentUser?.id,
    booking?.farmer_id
  );

const canActOnRefund = (refund) => canVerifyBookingPayment(refund);

const isRefundPendingReview = (refund) =>
  ['Refund Requested', 'Under Review', 'Pending'].includes(String(refund?.refund_status || ''));

const isRefundApproved = (refund) => String(refund?.refund_status || '') === 'Approved';

const isHighlightedRefund = (refund) =>
  highlightedRefundBookingId.value != null &&
  String(highlightedRefundBookingId.value) === String(refund?.booking_id);

const canRecordCashDownPayment = (booking) =>
  ['Awaiting Down Payment', 'Payment Rejected'].includes(booking?.status);

const recordDpAmountDisplay = computed(() => {
  const booking = paymentActionBooking.value;
  if (!booking) return '';
  const amount = Number(booking.down_payment_amount ?? recordDpAmount.value);
  if (!Number.isFinite(amount)) return '—';
  const pct = booking.down_payment_percent
    ? `${booking.down_payment_percent}% · `
    : '';
  return `${pct}₱${formatNumber(amount)}`;
});

const downPaymentQueueStatusLabel = (booking) => {
  if (booking?.status === 'Awaiting Payment Verification') return t('ui.awaitingProofVerification');
  if (booking?.status === 'Payment Rejected') return t('ui.paymentRejectedResubmit');
  return t('ui.awaitingFarmerPayment');
};

const focusDownPaymentQueue = async () => {
  showDownPaymentPanel.value = true;
  activeTab.value = 'ar';
  await loadPendingDownPayments();
  await nextTick();
  document.getElementById('down-payment-queue')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const focusRefundQueue = async () => {
  activeTab.value = 'ar';
  await loadBookingPayments();
  await nextTick();
  document.getElementById('down-payment-refunds')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

// Check if user is admin (sees only profit and reports tabs)
const isAdmin = computed(() => userRole.value === 'admin');

/** Machinery visible in filters/forms: barangay-scoped for officers; admin optional barangay filter. */
const scopedMachinery = computed(() => {
  const list = Array.isArray(machinery.value) ? machinery.value : [];
  if (isAdmin.value) {
    if (!selectedBarangayId.value) return list;
    const bid = parseInt(selectedBarangayId.value, 10);
    return list.filter((m) => parseInt(m.barangay_id, 10) === bid);
  }
  if (userBarangayId.value) {
    const bid = parseInt(userBarangayId.value, 10);
    return list.filter((m) => parseInt(m.barangay_id, 10) === bid);
  }
  return list;
});

const syncMachineryFilterSelection = () => {
  if (!filters.value.machinery_id) return;
  const stillVisible = scopedMachinery.value.some(
    (m) => String(m.id) === String(filters.value.machinery_id)
  );
  if (!stillVisible) {
    filters.value.machinery_id = '';
  }
};

const { authHeaders, buildParams, financialGet, financialPost, financialPut, financialDelete } =
  useFinancialApi(authStore, selectedBarangayId, () => isAdmin.value);

const resolveBarangayDisplayName = (barangayId) => {
  if (barangayId == null || barangayId === '') return '';

  const idStr = String(barangayId);
  const fromList = barangays.value.find((b) => String(b.id) === idStr);
  if (fromList?.name) return fromList.name;

  const user = authStore.currentUser;
  if (user?.barangay_name && String(user.barangay_id) === idStr) {
    return user.barangay_name;
  }

  return '';
};

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
    const userName = authStore.currentUser?.barangay_name;
    return userName || '—';
  }
  return resolveBarangayDisplayName(bid) || '—';
});

// Check if user can manage (only treasurer)
const canManage = computed(() => isTreasurer.value);

// President and Treasurer can manage association dues transactions
const canCollectDues = computed(() => ['president', 'treasurer'].includes(userRole.value));

// Check if view only (president, auditor - no edit buttons)
const isViewOnly = computed(() => ['president', 'auditor'].includes(userRole.value));

// Compute filtered expenses based on selected machinery
const expenseSummary = ref({ pending_count: 0, recorded_booking_count: 0, manual_count: 0 });
const completingPendingExpense = ref(false);
const pendingExpenseContext = ref(null);

const applyPendingExpenseFilters = (list) => {
  let filtered = [...list];
  if (filters.value.machinery_id) {
    filtered = filtered.filter((exp) => exp.machinery_id === parseInt(filters.value.machinery_id, 10));
  }
  if (filters.value.operator_id) {
    filtered = filtered.filter((exp) => exp.operator_id === parseInt(filters.value.operator_id, 10));
  }
  return filtered;
};

const applyExpenseFilters = (list) => {
  let filtered = applyPendingExpenseFilters(list);
  if (filters.value.expense_status) {
    filtered = filtered.filter((exp) => exp.expense_status === filters.value.expense_status);
  }
  if (filters.value.start_date) {
    filtered = filtered.filter((exp) => new Date(exp.date_of_expense) >= new Date(filters.value.start_date));
  }
  if (filters.value.end_date) {
    filtered = filtered.filter((exp) => new Date(exp.date_of_expense) <= new Date(filters.value.end_date));
  }
  return filtered;
};

const pendingExpenses = computed(() =>
  applyPendingExpenseFilters(expenses.value.filter((exp) => exp.expense_status === 'Pending'))
);

const recordedBookingExpenses = computed(() =>
  applyExpenseFilters(
    expenses.value.filter((exp) => exp.expense_status === 'Recorded' && exp.expense_source === 'booking')
  )
);

const manualExpenses = computed(() =>
  applyExpenseFilters(
    expenses.value.filter((exp) => exp.expense_source === 'manual' && exp.expense_status === 'Recorded')
  )
);

const expenseOperators = computed(() => {
  const map = new Map();
  expenses.value.forEach((exp) => {
    if (exp.operator_id && exp.operator_name) {
      map.set(exp.operator_id, { id: exp.operator_id, name: exp.operator_name });
    }
  });
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
});

const filteredExpenses = computed(() => expenses.value);

// Collection Form Computed Properties — Balance Due = amount still to collect
const remainingBalance = computed(() => {
  if (!editingCollection.value) return 0;
  const fromApi = parseFloat(editingCollection.value.remaining_balance);
  if (Number.isFinite(fromApi) && fromApi >= 0) return fromApi;
  const total = parseFloat(editingCollection.value.total_price) || 0;
  const collected = parseFloat(editingCollection.value.amount_collected) || 0;
  return Math.max(0, total - collected);
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

const collectionDetailRows = computed(() => {
  const rec = editingCollection.value;
  if (!rec) return [];
  return [
    { label: t('payCheckout.totalAmount'), value: `₱${formatNumber(rec.total_price)}` },
    { label: t('payCheckout.alreadyCollected'), value: `₱${formatNumber(rec.amount_collected || 0)}` },
    { label: t('ui.machinery'), value: rec.machinery_name || rec.machinery_type || '—' }
  ];
});

const collectionDueMeta = computed(() => {
  const rec = editingCollection.value;
  if (!rec?.booking_date) return '';
  const date = formatManilaDateLabel(getDueDate(rec.booking_date));
  if (!date) return '';
  return isOverdue.value ? t('payCheckout.dueOverdue', { date }) : t('payCheckout.dueOn', { date });
});

const showPartialWarning = computed(() => {
  if (collectionForm.value.paymentType !== 'partial') return false;
  return collectionForm.value.paymentAmount >= remainingBalance.value * 0.99; // 99% or more of balance
});

const getDueDate = (bookingDate) => getMachineryDueDateString(bookingDate);

const isOverdue = computed(() => {
  if (!editingCollection.value || !editingCollection.value.booking_date) return false;
  return isMachineryOverdue(editingCollection.value.booking_date);
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
  { id: 'expenses', labelKey: 'ui.tabExpenses' },
  { id: 'income', labelKey: 'ui.tabIncome' },
  { id: 'ar', labelKey: 'ui.arCollections' },
  { id: 'inventory', labelKey: 'ui.gcashQrCode', treasurerOnly: true },
  { id: 'profit', labelKey: 'ui.profitComputation' },
  { id: 'reports', labelKey: 'ui.tabReports' }
];

const tabs = computed(() => {
  if (isAdmin.value) {
    return allTabs.filter((tab) => ['profit', 'reports'].includes(tab.id));
  }
  let list = allTabs.filter((tab) => !tab.paymentVerifierOnly || isPaymentVerifier.value);
  if (!canManage.value) {
    list = list.filter((tab) => !tab.treasurerOnly);
  }
  if (!canCollectDues.value) {
    list = list.filter((tab) => tab.id !== 'dues');
  }
  return list.map((tab) => {
    if (tab.id === 'ar' && isPaymentVerifier.value) {
      const badge =
        pendingBalanceSubmissions.value.length +
        pendingDownPayments.value.length +
        pendingRefundRequests.value.length;
      if (badge > 0) return { ...tab, badge };
    }
    if (tab.id === 'inventory' && pendingGcashPayments.value.length > 0) {
      return { ...tab, badge: pendingGcashPayments.value.length };
    }
    return tab;
  });
});

// Set default active tab based on role (skip when the URL already targets a tab, e.g. /association-dues)
watch(() => userRole.value, (role) => {
  if (route.path === '/association-dues' || route.query.tab) return;
  if (role === 'admin') {
    activeTab.value = 'profit';
  } else if (role === 'treasurer' || role === 'president') {
    activeTab.value = 'ar';
  }
}, { immediate: true });

watch(activeTab, (tab) => {
  if (tab === 'ar' && isPaymentVerifier.value) {
    loadPendingBalanceSubmissions();
    loadPendingDownPayments();
    loadBookingPayments();
  }
  if (tab === 'inventory' && canManage.value) {
    loadGcashInventory();
  }
  if (tab === 'expenses') {
    loadExpenses();
  }
  if (tab === 'profit') {
    loadProfitSummary();
    loadExpenseBreakdown();
    loadBookingUsageStats();
  }
  if (tab === 'income') {
    loadIncome();
  }
});

// State
const expenses = ref([]);
const income = ref([]);
const machinery = ref([]);
const arList = ref([]);
const collections = ref([]);
const collectionsSearchQuery = ref('');
const filteredCollections = computed(() => {
  const query = collectionsSearchQuery.value.trim().toLowerCase();
  if (!query) return collections.value;
  return collections.value.filter((col) => {
    return [
      col.farmer_name,
      col.farmer_reference,
      col.receipt_number,
      col.booking_id
    ].some((value) => String(value || '').toLowerCase().includes(query));
  });
});
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
const selectedReportType = ref(null);
let reportRequestId = 0;
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
    const m = scopedMachinery.value.find((item) => String(item.id) === String(filters.value.machinery_id))
      || machinery.value.find((item) => String(item.id) === String(filters.value.machinery_id));
    if (m) return `${m.machinery_name} (${m.machinery_type})`;
    return `Machinery #${filters.value.machinery_id}`;
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

const REPORT_EMPTY_MOBILE_MSG =
  'Walang rekord sa piniling saklaw ng petsa / No records in this period.';

const expenseOthersAmount = (exp) =>
  (parseFloat(exp.office_supply || 0) || 0) +
  (parseFloat(exp.communication_expense || 0) || 0) +
  (parseFloat(exp.utilities_expense || 0) || 0) +
  (parseFloat(exp.sundries || 0) || 0);

const summaryMobileCards = computed(() => {
  const data = reportData.value;
  if (!data) return [];
  const s = data.summary;
  const c = data.counts;
  return [
    {
      id: 'summary-expenses',
      rows: [
        { label: t('ui.module'), value: t('ui.totalExpenses') },
        { label: t('ui.amount'), value: formatReportMoneyCompact(s.total_expenses), strong: true },
        { label: t('ui.recorded'), value: `${c.expenses}` }
      ]
    },
    {
      id: 'summary-income',
      rows: [
        { label: t('ui.module'), value: t('ui.totalIncome') },
        { label: t('ui.amount'), value: formatReportMoneyCompact(s.total_income), strong: true },
        { label: t('ui.recorded'), value: `${c.income}` }
      ]
    },
    {
      id: 'summary-collections',
      rows: [
        { label: t('ui.module'), value: t('ui.collections') },
        { label: t('ui.amount'), value: formatReportMoneyCompact(s.total_collections), strong: true },
        { label: t('ui.recorded'), value: `${c.collections}` }
      ]
    },
    {
      id: 'summary-net',
      rows: [
        { label: t('ui.module'), value: t('ui.netProfit') },
        { label: t('ui.amount'), value: formatReportMoneyCompact(s.net_profit), strong: true },
        { label: t('ui.recorded'), value: s.net_profit >= 0 ? t('ui.netProfit') : t('ui.lossDetected') }
      ]
    }
  ];
});

const distributionMobileCards = computed(() => {
  const data = reportData.value;
  if (!data?.summary?.distribution) return [];
  const d = data.summary.distribution;
  return [
    {
      id: 'dist-org',
      rows: [
        { label: t('ui.profitDistAlloc'), value: t('ui.organization') },
        { label: t('common.share'), value: '30%' },
        { label: t('ui.amount'), value: formatReportMoneyCompact(d.organization_share), strong: true }
      ]
    },
    {
      id: 'dist-training',
      rows: [
        { label: t('ui.profitDistAlloc'), value: t('ui.training') },
        { label: t('common.share'), value: '20%' },
        { label: t('ui.amount'), value: formatReportMoneyCompact(d.training_share), strong: true }
      ]
    },
    {
      id: 'dist-members',
      rows: [
        { label: t('ui.profitDistAlloc'), value: t('nav.members') },
        { label: t('common.share'), value: '50%' },
        { label: t('ui.amount'), value: formatReportMoneyCompact(d.members_share), strong: true }
      ]
    },
    {
      id: 'dist-per-member',
      rows: [
        { label: t('ui.profitDistAlloc'), value: t('ui.perMemberCount', { count: d.member_count }) },
        { label: t('common.share'), value: '—' },
        { label: t('ui.amount'), value: formatReportMoneyCompact(d.per_member_share), strong: true }
      ]
    }
  ];
});

const allTransactionsMobileCards = computed(() => {
  const rows = reportData.value?.transactions?.all || [];
  return rows.map((txn) => {
    const sign = txn.transaction_type === 'Expense' ? '-' : '+';
    return {
      id: `${txn.id}-${txn.transaction_type}`,
      rows: [
        { label: 'Date', value: formatReportDateCompact(txn.date) },
        { label: 'Type', value: txn.transaction_type || '—' },
        { label: 'Machinery', value: txn.machinery_name || '—' },
        { label: 'Description', value: txn.description || '—' },
        { label: 'Farmer', value: txn.farmer_name || '—' },
        { label: 'Amount', value: `${sign}${formatReportMoneyCompact(txn.amount)}`, strong: true }
      ]
    };
  });
});

const expenseDetailsMobileCards = computed(() => {
  const rows = reportData.value?.transactions?.expenses || [];
  return rows.map((exp) => ({
    id: `exp-${exp.id}`,
    rows: [
      { label: 'Date', value: formatReportDateCompact(exp.date) },
      { label: 'Machinery', value: exp.machinery_name || '—' },
      { label: 'Particulars', value: exp.description || '—' },
      { label: 'Ref #', value: exp.reference_number || '—' },
      { label: t('ui.fuelAndOil'), value: formatReportMoneyCompact(exp.fuel_and_oil) },
      { label: t('ui.labor'), value: formatReportMoneyCompact(exp.labor_cost) },
      { label: t('ui.perDiem'), value: formatReportMoneyCompact(exp.per_diem) },
      { label: 'R&M', value: formatReportMoneyCompact(exp.repair_and_maintenance) },
      { label: 'Others', value: formatReportMoneyCompact(expenseOthersAmount(exp)) },
      { label: 'Total', value: formatReportMoneyCompact(exp.amount), strong: true }
    ]
  }));
});

const expenseDetailsMobileFooter = computed(() => {
  if (!reportData.value?.transactions?.expenses?.length) return [];
  return [
    {
      label: 'Total Expenses / Kabuuang Gastos',
      value: formatReportMoneyCompact(reportData.value.summary.total_expenses)
    }
  ];
});

const bookingsSummaryMobileCards = computed(() => {
  const rows = reportData.value?.transactions?.bookings || [];
  return rows.map((bk) => ({
    id: `bk-${bk.id}`,
    rows: [
      { label: 'Date', value: formatReportDateCompact(bk.date) },
      { label: 'Booking #', value: `#${bk.booking_id}` },
      { label: 'Machinery', value: bk.machinery_name || '—' },
      { label: 'Farmer', value: bk.farmer_name || '—' },
      { label: 'Status', value: bk.status || '—' },
      { label: 'Total Price', value: formatReportMoneyCompact(bk.amount), strong: true },
      { label: 'Paid', value: formatReportMoneyCompact(bk.total_paid), strong: true },
      { label: 'Payment Status', value: bk.payment_status || 'Unpaid' }
    ]
  }));
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
const manualIncomeList = ref([]);
const editingManualIncomeId = ref(null);
const showCollectionForm = ref(false);
const collectionSaving = ref(false);
const editingExpense = ref(null);
const editingCollection = ref(null);

const filters = ref({
  machinery_id: '',
  income_source: 'all',
  start_date: '',
  end_date: '',
  expense_status: '',
  operator_id: ''
});

const expenseForm = ref({
  machinery_id: '',
  booking_id: '',
  date_of_expense: '',
  particulars: '',
  payment_method: 'Cash',
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
  source_name: '',
  date_of_income: new Date().toISOString().split('T')[0],
  income_amount: '',
  remarks: ''
});

const collectionForm = ref({
  paymentType: 'full',
  paymentAmount: 0,
  collectionDate: new Date().toISOString().split('T')[0],
  payment_method: 'Cash',
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
const duesCollecting = ref(false);
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
// Consolidated income records (API income + collections fallback + monthly dues)
const consolidatedIncomeRecords = computed(() => {
  const records = [];
  const seenCollectionIds = new Set();

  // Machinery payments (including down payments), bookings, and manual income from API
  if (income.value) {
    for (const row of income.value) {
      if (row.income_type === 'Association Dues') continue;
      const incomeId = String(row.income_id || '');
      if (incomeId.startsWith('COL-')) {
        seenCollectionIds.add(incomeId.replace('COL-', ''));
      }
      records.push({
        ...row,
        id: row.income_id || `income-${row.booking_id || row.dues_id || Math.random()}`,
        income_type: row.income_type === 'Down Payment'
          ? 'Down Payment'
          : (row.income_type || 'Income'),
        payment_status: row.payment_status || 'Paid',
        remarks: row.remarks || (
          row.income_type === 'Down Payment'
            ? (row.machinery_name ? `Down payment verified — ${row.machinery_name}` : 'Down payment verified')
            : ''
        )
      });
    }
  }

  // Fallback: balance/final collections not already in /income (never include down payments here)
  if (collections.value) {
    for (const col of collections.value) {
      const colId = String(col.id);
      if (seenCollectionIds.has(colId)) continue;
      if (/down payment/i.test(String(col.remarks || ''))) continue;
      records.push({
        id: `collection-${col.id}`,
        income_id: col.id,
        income_type: 'Machinery Collection',
        date_of_income: col.collection_date,
        farmer_name: col.farmer_name || '-',
        machinery_name: col.machinery_name || 'Machinery Booking',
        machinery_type: col.machinery_type || '',
        booking_id: col.booking_id || col.id,
        income_amount: col.collection_amount,
        original_amount: col.original_amount || col.total_price,
        payment_status: 'Collected',
        remarks: col.remarks || '',
        receipt_number: col.receipt_number || null,
        period_start: null,
        period_end: null
      });
    }
  }

  // Association dues
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
      receipt_number: dues.receipt_number || null,
      period_start: dues.period_start || null,
      period_end: dues.period_end || null
    })));
  }

  let filtered = records;
  if (filters.value.income_source === 'machinery') {
    filtered = records.filter(r =>
      ['Collection', 'Machinery Collection', 'Machinery Booking', 'Down Payment'].includes(r.income_type)
    );
  } else if (filters.value.income_source === 'dues') {
    filtered = records.filter(r => r.income_type === 'Association Dues');
  } else if (filters.value.income_source === 'manual') {
    filtered = records.filter(r => r.income_type === 'Manual Income');
  }

  if (filters.value.start_date) {
    filtered = filtered.filter(r => new Date(r.date_of_income) >= new Date(filters.value.start_date));
  }
  if (filters.value.end_date) {
    filtered = filtered.filter(r => new Date(r.date_of_income) <= new Date(filters.value.end_date));
  }

  return filtered.sort((a, b) => new Date(b.date_of_income || 0) - new Date(a.date_of_income || 0));
});

const incomeSourceBreakdown = computed(() => {
  const sourceMap = new Map();
  for (const row of consolidatedIncomeRecords.value) {
    let kind = 'income';
    let name = '';
    if (isDownPaymentIncome(row)) {
      kind = 'downPayment';
      name = row?.machinery_name || '';
    } else if (isCollectionIncome(row)) {
      kind = 'balanceCollection';
      name = row?.machinery_name || '';
    } else if (String(row?.income_type || '') === 'Manual Income') {
      kind = 'otherIncome';
      name = row?.machinery_name || row?.source_name || '';
    } else if (isDuesIncome(row)) {
      kind = 'dues';
      name = '';
    } else {
      name = row?.income_type || '';
    }
    const id = `${kind}|${name}`;
    const current = sourceMap.get(id) || { id, kind, name, count: 0, total: 0 };
    current.count += 1;
    current.total += parseFloat(row?.income_amount || 0);
    sourceMap.set(id, current);
  }
  return Array.from(sourceMap.values()).sort((a, b) => b.total - a.total);
});

const formatIncomeSourceItem = (item) => {
  if (!item) return '';
  if (item.kind === 'downPayment') {
    return item.name ? t('ui.downPaymentNamed', { name: item.name }) : t('ui.downPayment');
  }
  if (item.kind === 'balanceCollection') {
    return item.name ? t('ui.balanceCollectionNamed', { name: item.name }) : t('ui.balanceCollection');
  }
  if (item.kind === 'dues') return t('ui.associationDues');
  if (item.kind === 'otherIncome') return item.name || t('ui.otherIncome');
  return item.name || t('ui.income');
};

const duesForm = ref({
  farmer_id: '',
  collection_date: new Date().toISOString().split('T')[0],
  payment_method: 'Cash',
  remarks: ''
});

// Methods
const API_BASE_URL = '/api';

const formatNumber = (num) => {
  if (!num) return '0.00';
  return parseFloat(num).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const formatInterestRateDisplay = (rate) => {
  const n = parseFloat(rate);
  if (!Number.isFinite(n) || n <= 0) return '0';
  return Number.isInteger(n) ? String(n) : String(n);
};

const formatAreaUnit = (hint) => {
  if (!hint) return '';
  const value = String(hint).toLowerCase();
  if (value.includes('hectare')) return t('ui.hectareUnit');
  return hint;
};

const reportTypeLabel = (type) => {
  const keys = { monthly: 'ui.monthly', quarterly: 'ui.quarterly', annual: 'ui.annual' };
  return t(keys[type] || 'ui.monthly');
};

const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-PH');
};

const formatRoleLabel = (role) => {
  const value = String(role || '').toLowerCase();
  if (!value) return t('common.member');
  const map = {
    farmer: t('ui.farmer'),
    treasurer: t('ui.treasurer'),
    president: t('ui.president'),
    admin: t('ui.admin'),
    operator: t('ui.operator'),
    member: t('common.member')
  };
  return map[value] || (value.charAt(0).toUpperCase() + value.slice(1));
};

const formatDuesCoverage = (start, end) => {
  if (!start || !end) return t('ui.currentSixMonthCycle');
  return `${formatDate(start)} - ${formatDate(end)}`;
};

const isDuesIncome = (record) => {
  return String(record?.income_type || '').toLowerCase().includes('dues');
};

const isDownPaymentIncome = (record) => {
  const type = String(record?.income_type || '').toLowerCase();
  const paymentType = String(record?.payment_type || '').toLowerCase();
  return type.includes('down payment') || paymentType === 'down_payment';
};

const isCollectionIncome = (record) => {
  const type = String(record?.income_type || '').toLowerCase();
  return type.includes('collection') || type.includes('machinery booking');
};

const getIncomeReceivedLabel = (record) => {
  if (isDownPaymentIncome(record)) return t('ui.downPayment');
  if (isCollectionIncome(record)) return t('ui.amountCollected');
  if (isDuesIncome(record)) return t('ui.amountCollected');
  return t('ui.amountReceived');
};

const getIncomePaymentStatusLabel = (record) => {
  if (isDownPaymentIncome(record)) return t('ui.verified');
  const status = record?.payment_status || 'Paid';
  const map = {
    'Partial Payment': t('ui.partialPayment'),
    Paid: t('ui.paid'),
    Verified: t('ui.verified'),
    Unpaid: t('ui.unpaid')
  };
  return map[status] || status;
};

const getIncomePaymentStatusClass = (record) => {
  const label = getIncomePaymentStatusLabel(record);
  return String(label || 'paid').toLowerCase().replace(/\s+/g, '-');
};

const getIncomeReceiptNumber = (record) => {
  const receipt = String(record?.receipt_number || '').trim();
  return receipt.startsWith('RCPT-') ? receipt : '';
};

const formatIncomeMachinery = (record) => {
  if (isDuesIncome(record)) return t('ui.associationDues');
  if (record?.machinery_name) {
    return `${record.machinery_name}${record.machinery_type ? ` (${record.machinery_type})` : ''}`;
  }
  if (record?.income_type === 'Manual Income') return record.machinery_name || t('ui.otherSource');
  return '—';
};

const stripBookingRef = (text) => {
  return String(text || '')
    .replace(/\s*[·•\-–—]?\s*Booking\s*#?\s*\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[·•]\s*$/g, '')
    .trim();
};

const formatIncomeTypeLabel = (type) => {
  const value = String(type || '').trim();
  const map = {
    'Down Payment': t('ui.downPayment'),
    'Machinery Collection': t('ui.balanceCollection'),
    'Association Dues': t('ui.associationDues'),
    'Manual Income': t('ui.otherManualIncome'),
    Income: t('ui.income')
  };
  return map[value] || value || t('ui.income');
};

const formatIncomeFrom = (record) => {
  if (isDownPaymentIncome(record)) {
    const machine = formatIncomeMachinery(record);
    const method = record?.payment_method ? String(record.payment_method) : '';
    const pctMatch = String(record?.remarks || '').match(/(\d+(?:\.\d+)?)%\s+down payment/i)
    const dpLabel = pctMatch
      ? t('ui.downPaymentPct20', { percent: pctMatch[1] })
      : t('ui.downPayment')
    return [dpLabel, machine !== '—' ? machine : '', method]
      .filter(Boolean)
      .join(' · ');
  }
  if (isCollectionIncome(record)) {
    const machine = formatIncomeMachinery(record);
    return [t('ui.balanceCollection'), machine !== '—' ? machine : '']
      .filter(Boolean)
      .join(' · ');
  }
  if (isDuesIncome(record)) {
    return `${t('ui.associationDues')} · ${formatDuesCoverage(record.period_start, record.period_end)}`;
  }
  if (String(record?.income_type || '') === 'Manual Income') {
    return record?.machinery_name || record?.source_name || t('ui.otherIncome');
  }
  return record?.remarks || formatIncomeTypeLabel(record?.income_type);
};

const viewIncomeReceipt = async (record) => {
  const receiptNumber = getIncomeReceiptNumber(record);
  if (!receiptNumber) {
    showAlert('No official receipt is available for this income record yet.', 'error');
    return;
  }
  await viewReceipt(receiptNumber, {
    autoPrint: false,
    paymentForOverride: formatIncomeFrom(record)
  });
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

const loadPendingBalanceSubmissions = async () => {
  if (!isPaymentVerifier.value || !authStore.currentUser?.id) return;
  try {
    const barangayScope = isAdmin.value && selectedBarangayId.value ? selectedBarangayId.value : null;
    pendingBalanceSubmissions.value = await machineryStore.fetchPendingBalancePayments(
      authStore.currentUser.id,
      barangayScope
    );
  } catch (e) {
    console.error('Failed to load pending balance payments:', e);
  }
};

const loadPendingDownPayments = async () => {
  if (!isPaymentVerifier.value || !authStore.currentUser?.id) return;
  try {
    const barangayScope = isAdmin.value && selectedBarangayId.value ? selectedBarangayId.value : null;
    pendingDownPayments.value = await machineryStore.fetchPendingDownPayments(
      authStore.currentUser.id,
      barangayScope
    );
  } catch (e) {
    console.error('Failed to load pending down payments:', e);
  }
};

const gcashTypeLabel = (type) =>
  type === 'loan' ? t('ui.gcashTxnLoan') : t('ui.gcashTxnMachinery');

const isHighlightedGcashRow = (row) => {
  const mark = highlightedGcashRef.value;
  if (mark == null || mark === '') return false;
  return String(row?.id) === String(mark) || String(row?.reference_id) === String(mark);
};

const gcashHistoryNote = (row) => {
  if (!row) return '';
  if (row.status === 'rejected') return row.rejection_reason || '';
  return row.receipt_number || row.remarks || '';
};

const loadGcashHistory = async () => {
  if (!canManage.value) return;
  gcashHistoryBusy.value = true;
  try {
    gcashHistoryRows.value = await gcashStore.fetchHistory();
  } catch (e) {
    console.error('Failed to load GCash history:', e);
  } finally {
    gcashHistoryBusy.value = false;
  }
};

const scrollToGcashRow = (id) => {
  return scrollElementWhenReady(`[data-gcash-id="${id}"]`, nextTick);
};

const openGcashHistoryPanel = async (sid) => {
  showGcashHistory.value = true;
  await loadGcashHistory();
  if (sid) {
    highlightedGcashRef.value = String(sid);
    await scrollToGcashRow(sid);
    return;
  }
  await nextTick();
  document.getElementById('gcash-history')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const toggleGcashHistory = async () => {
  if (showGcashHistory.value) {
    showGcashHistory.value = false;
    return;
  }
  await openGcashHistoryPanel();
};

const gcashDisplaySrc = computed(() => {
  if (gcashPendingPreview.value) return gcashPendingPreview.value;
  if (gcashQr.value?.image_path) return paymentProofUrl(gcashQr.value.image_path);
  return '';
});

const loadGcashInventory = async () => {
  if (!canManage.value) return;
  try {
    gcashQr.value = await gcashStore.fetchQr();
    pendingGcashPayments.value = await gcashStore.fetchPending();
  } catch (e) {
    console.error('Failed to load GCash inventory:', e);
  }
};

const clearGcashPendingQr = () => {
  gcashPendingFile.value = null;
  if (gcashPendingPreview.value) {
    URL.revokeObjectURL(gcashPendingPreview.value);
    gcashPendingPreview.value = '';
  }
  if (gcashQrFileInput.value) gcashQrFileInput.value.value = '';
};

const onGcashQrFileSelect = (event) => {
  const file = event.target.files?.[0];
  event.target.value = '';
  if (!file) return;
  const ok = (file.type || '').startsWith('image/') || /\.(jpe?g|png|gif|webp|jfif)$/i.test(file.name);
  if (!ok) {
    showAlert(t('ui.gcashImageOnly'), 'error');
    return;
  }
  clearGcashPendingQr();
  gcashPendingFile.value = file;
  gcashPendingPreview.value = URL.createObjectURL(file);
};

const saveGcashQr = async () => {
  if (!gcashPendingFile.value || gcashQrBusy.value) return;
  gcashQrBusy.value = true;
  try {
    gcashQr.value = await gcashStore.uploadQr(gcashPendingFile.value);
    clearGcashPendingQr();
    showAlert(t('ui.gcashQrSaved'), 'success');
  } catch (e) {
    showAlert(e.message || t('ui.gcashImageOnly'), 'error');
  } finally {
    gcashQrBusy.value = false;
  }
};

const deleteGcashQr = async () => {
  gcashQrBusy.value = true;
  try {
    await gcashStore.deleteQr();
    gcashQr.value = null;
    clearGcashPendingQr();
    showAlert(t('ui.gcashQrDeleted'), 'success');
  } catch (e) {
    showAlert(e.message || t('ui.gcashQrDeleted'), 'error');
  } finally {
    gcashQrBusy.value = false;
  }
};

const openGcashConfirm = (row) => {
  gcashActionRow.value = row;
  const fixed = resolveGcashFixedAmount(row);
  gcashConfirmAmount.value = fixed != null ? fixed : '';
  gcashConfirmRemarks.value = '';
  showGcashRejectModal.value = false;
  showGcashConfirmModal.value = true;
};

const resolveGcashFixedAmount = (row) => {
  if (!row) return null;
  if (row.is_down_payment && row.expected_amount != null) {
    const n = parseFloat(row.expected_amount);
    return Number.isFinite(n) && n > 0 ? Math.round(n * 100) / 100 : null;
  }
  const dp = parseFloat(row.down_payment_amount);
  if (
    row.transaction_type === 'machinery' &&
    Number.isFinite(dp) &&
    dp > 0 &&
    !row.down_payment_verified_at &&
    ['Awaiting Down Payment', 'Awaiting Payment Verification', 'Payment Rejected'].includes(row.booking_status)
  ) {
    return Math.round(dp * 100) / 100;
  }
  return null;
};

const isGcashDownPaymentConfirm = computed(() => resolveGcashFixedAmount(gcashActionRow.value) != null);

const gcashFixedAmountDisplay = computed(() => {
  const n = resolveGcashFixedAmount(gcashActionRow.value);
  if (n == null) return '';
  const pct = gcashActionRow.value?.down_payment_percent;
  return pct ? `${pct}% · ₱${formatNumber(n)}` : `₱${formatNumber(n)}`;
});

const openGcashReject = (row) => {
  gcashActionRow.value = row;
  gcashRejectReason.value = '';
  showGcashConfirmModal.value = false;
  showGcashRejectModal.value = true;
};

const closeGcashModals = () => {
  showGcashConfirmModal.value = false;
  showGcashRejectModal.value = false;
  gcashActionRow.value = null;
  gcashConfirmAmount.value = '';
  gcashConfirmRemarks.value = '';
  gcashRejectReason.value = '';
};

const applyGcashNotificationDeepLink = async () => {
  const highlight = route.query.highlight;
  const sid = route.query.sid;
  const type = String(route.query.type || '');
  const view = String(route.query.view || '');
  const focus = String(route.query.focus || '');
  const wantsHistory =
    view === 'history' ||
    type === 'gcash-history' ||
    focus === 'gcash-rejected' ||
    focus === 'gcash-verified';
  const isGcashLink = ['gcash-loan', 'gcash-booking', 'gcash-history'].includes(type) || wantsHistory;
  if (!isGcashLink) return;
  if (!highlight && !sid && !wantsHistory) return;
  if (!canManage.value) return;

  activeTab.value = 'inventory';
  await loadGcashInventory();

  const findPending = () =>
    pendingGcashPayments.value.find((item) =>
      (sid && String(item.id) === String(sid)) ||
      (highlight && String(item.reference_id) === String(highlight)) ||
      (highlight && String(item.id) === String(highlight))
    );

  if (wantsHistory) {
    highlightedGcashRef.value = sid || highlight || null;
    await openGcashHistoryPanel(sid || highlight);
    consumeNotificationDeepLink(router, route, () => {
      highlightedGcashRef.value = null;
    });
    return;
  }

  let pendingRow = findPending();
  for (let i = 0; !pendingRow && i < 6; i++) {
    await new Promise((resolve) => setTimeout(resolve, 120));
    await loadGcashInventory();
    pendingRow = findPending();
  }

  highlightedGcashRef.value = String(sid || pendingRow?.id || highlight || '');

  if (pendingRow) {
    await scrollToGcashRow(pendingRow.id);
    consumeNotificationDeepLink(router, route, () => {
      highlightedGcashRef.value = null;
    });
    return;
  }

  // Pending submission not in queue — still land on GCash tab and try to center any matching row
  await scrollToGcashRow(sid || highlight);
  consumeNotificationDeepLink(router, route, () => {
    highlightedGcashRef.value = null;
  });
};

const applyBookingNotificationDeepLink = async () => {
  const highlight = route.query.highlight;
  const type = String(route.query.type || '');
  const open = String(route.query.open || '');
  const isRefundLink = type === 'refund' || open === 'refund';
  if (!highlight || (type !== 'booking' && type !== 'refund')) return;

  activeTab.value = 'ar';

  if (isRefundLink) {
    highlightedRefundBookingId.value = highlight;
    highlightedBookingId.value = null;
    if (isPaymentVerifier.value) {
      await loadBookingPayments();
    }
    await nextTick();
    const scrolled = await scrollElementWhenReady(
      [
        `#down-payment-refunds [data-booking-id="${highlight}"]`,
        `[data-refund-id][data-booking-id="${highlight}"]`,
        '#down-payment-refunds'
      ],
      nextTick
    );
    if (!scrolled) {
      document.getElementById('down-payment-refunds')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
    consumeNotificationDeepLink(router, route, () => {
      highlightedRefundBookingId.value = null;
    });
    return;
  }

  highlightedBookingId.value = highlight;

  if (isPaymentVerifier.value) {
    await loadPendingDownPayments();
    await loadBookingPayments();
    const inDpQueue = pendingDownPayments.value.some(
      (b) => String(b.id) === String(highlight)
    );
    if (inDpQueue || open === 'dp') {
      showDownPaymentPanel.value = true;
    }
  }

  await loadARData();
  await scrollElementWhenReady(
    [
      `[data-dp-booking-id="${highlight}"]`,
      `[data-booking-id="${highlight}"]`
    ],
    nextTick
  );

  consumeNotificationDeepLink(router, route, () => {
    highlightedBookingId.value = null;
  });
};

watch(
  () => [route.query.tab, route.query.highlight, route.query.type, route.query.sid, route.query.view, route.query.focus, route.query.nav, route.query.open],
  () => {
    applyGcashNotificationDeepLink();
    applyBookingNotificationDeepLink();
  }
);

const confirmGcashPayment = async () => {
  if (!gcashActionRow.value) return;
  const fixed = resolveGcashFixedAmount(gcashActionRow.value);
  const amount = fixed != null ? fixed : parseFloat(gcashConfirmAmount.value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showAlert(t('ui.gcashEnterAmount'), 'error');
    return;
  }
  gcashVerifyBusy.value = true;
  try {
    const data = await gcashStore.confirmPayment(
      gcashActionRow.value.id,
      amount,
      gcashConfirmRemarks.value
    );
    closeGcashModals();
    await loadGcashInventory();
    loadARData();
    loadCollections();
    loadIncome();
    loadProfitSummary();
    if (showGcashHistory.value) await loadGcashHistory();
    await loadPendingDownPayments();

    const receiptNo = data.receipt_number || null;
    if (receiptNo) {
      // Show official receipt immediately (same as cash down payment / collection verify)
      await showReceiptAfterVerify(receiptNo);
    } else {
      showAlert(t('ui.gcashPaymentVerified'), 'success');
    }
  } catch (e) {
    showAlert(e.message || t('ui.gcashEnterAmount'), 'error');
  } finally {
    gcashVerifyBusy.value = false;
  }
};

const rejectGcashPayment = async () => {
  if (!gcashActionRow.value) return;
  const reason = String(gcashRejectReason.value || '').trim();
  if (!reason) {
    showAlert(t('ui.rejectionReasonRequired'), 'error');
    return;
  }
  gcashVerifyBusy.value = true;
  try {
    await gcashStore.rejectPayment(gcashActionRow.value.id, reason);
    showAlert(t('ui.gcashProofRejected'), 'success');
    closeGcashModals();
    await loadGcashInventory();
    if (showGcashHistory.value) await loadGcashHistory();
  } catch (e) {
    showAlert(e.message || t('ui.gcashProofRejected'), 'error');
  } finally {
    gcashVerifyBusy.value = false;
  }
};

const loadBookingPayments = async () => {
  if (!isPaymentVerifier.value || !authStore.currentUser?.id) {
    pendingRefundRequests.value = [];
    return;
  }
  try {
    const barangayScope = isAdmin.value && selectedBarangayId.value ? selectedBarangayId.value : null;
    pendingRefundRequests.value = await machineryStore.fetchRefundRequests(
      authStore.currentUser.id,
      'active',
      barangayScope
    );
  } catch (e) {
    console.error('Failed to load refund requests:', e);
    pendingRefundRequests.value = [];
  }
};

const closeRefundModals = () => {
  showRejectRefundModal.value = false;
  showProcessRefundModal.value = false;
  refundActionTarget.value = null;
  rejectRefundReason.value = '';
  refundProcessRemarks.value = '';
  refundProcessDate.value = '';
};

const approveRefundRequest = async (refund) => {
  paymentActionLoading.value = true;
  try {
    await machineryStore.reviewRefund(refund.id, {
      reviewed_by: authStore.currentUser.id,
      action: 'approve'
    });
    showAlert('Refund approved. Process payment when funds are released.', 'success');
    await loadBookingPayments();
  } catch (e) {
    showAlert(e.message || 'Failed to approve refund', 'error');
  } finally {
    paymentActionLoading.value = false;
  }
};

const openRejectRefundModal = (refund) => {
  refundActionTarget.value = refund;
  rejectRefundReason.value = '';
  showRejectRefundModal.value = true;
};

const openProcessRefundModal = (refund) => {
  refundActionTarget.value = refund;
  refundProcessDate.value = new Date().toISOString().slice(0, 10);
  refundProcessRemarks.value = '';
  showProcessRefundModal.value = true;
};

const confirmRejectRefund = async () => {
  if (!refundActionTarget.value || !rejectRefundReason.value.trim()) return;
  paymentActionLoading.value = true;
  try {
    await machineryStore.reviewRefund(refundActionTarget.value.id, {
      reviewed_by: authStore.currentUser.id,
      action: 'reject',
      rejection_reason: rejectRefundReason.value.trim()
    });
    showAlert('Refund request rejected.', 'success');
    closeRefundModals();
    await loadBookingPayments();
  } catch (e) {
    showAlert(e.message || 'Failed to reject refund', 'error');
  } finally {
    paymentActionLoading.value = false;
  }
};

const confirmProcessRefund = async () => {
  if (!refundActionTarget.value) return;
  paymentActionLoading.value = true;
  try {
    const data = await machineryStore.processRefund(refundActionTarget.value.id, {
      processed_by: authStore.currentUser.id,
      refund_date: refundProcessDate.value || undefined,
      remarks: refundProcessRemarks.value.trim() || undefined
    });
    showAlert('Refund processed. Down payment removed from machinery income.', 'success');
    closeRefundModals();
    await loadBookingPayments();
    loadIncome();
    if (data.receipt_number) await showReceiptAfterVerify(data.receipt_number);
  } catch (e) {
    showAlert(e.message || 'Failed to process refund', 'error');
  } finally {
    paymentActionLoading.value = false;
  }
};

const showReceiptAfterVerify = async (receiptNumber) => {
  // After save/verify: open receipt (auto-print on desktop non-dues so workflow stays fast)
  await viewReceipt(receiptNumber, { autoPrint: true });
};

/** Open receipt for on-screen review (no auto-print). Prefer this for View buttons. */
const viewReceipt = async (receiptNumber, options = {}) => {
  if (!receiptNumber) return;
  try {
    lastReceipt.value = await machineryStore.fetchReceipt(receiptNumber);
    if (!lastReceipt.value) throw new Error('Receipt not found');
    if (!lastReceipt.value.barangay_name) {
      lastReceipt.value.barangay_name = authStore.currentUser?.barangay_name || reportBarangayNameForReport.value || '';
    }
    if (!lastReceipt.value.collector_name) {
      lastReceipt.value.collector_name = authStore.currentUser?.full_name || 'Treasurer';
    }
    if (options.paymentForOverride) {
      lastReceipt.value.payment_for = stripBookingRef(options.paymentForOverride);
    } else if (!lastReceipt.value.payment_for || /^(20%\s*)?down payment$/i.test(String(lastReceipt.value.payment_for || lastReceipt.value.remarks || '').trim())) {
      // Prefer clearer down-payment / machinery context when receipt only has a short remark
      lastReceipt.value.payment_for = stripBookingRef(lastReceipt.value.payment_for || lastReceipt.value.remarks || 'Payment');
    }
    if (!lastReceipt.value.payment_for) {
      lastReceipt.value.payment_for = stripBookingRef(lastReceipt.value.remarks || 'Association dues');
    } else {
      lastReceipt.value.payment_for = stripBookingRef(lastReceipt.value.payment_for);
    }
    if (lastReceipt.value.remarks) {
      lastReceipt.value.remarks = stripBookingRef(lastReceipt.value.remarks);
    }
    const isDuesReceiptContext = activeTab.value === 'dues' || route.path === '/association-dues';
    const wantAutoPrint = options.autoPrint === true;
    if (wantAutoPrint && isDuesReceiptContext && !isMobile.value) {
      const kind = lastReceipt.value?.module === 'machinery_refund' ? 'refund' : 'payment';
      await mountAndPrintPaymentReceipt(lastReceipt.value, { kind });
      return;
    }
    // View always shows the modal first. Auto-print only when explicitly requested after verify/save.
    receiptAutoPrint.value = wantAutoPrint && !isDuesReceiptContext && !isMobile.value;
    showReceiptModal.value = true;
  } catch (e) {
    console.error('Failed to load receipt:', e);
    showAlert(e.message || 'Could not load receipt. Try again from the receipt list.', 'error');
  }
};

const closeReceiptModal = () => {
  showReceiptModal.value = false;
  receiptAutoPrint.value = false;
};

const paymentProofUrl = (path) => {
  if (!path) return '';
  if (/^https?:\/\//i.test(path) || path.startsWith('data:') || path.startsWith('blob:')) return path;
  return apiUrl(path);
};

const openProofPreview = (src) => {
  if (!src) return;
  proofPreviewSrc.value = src;
  showProofPreview.value = true;
};

const closeProofPreview = () => {
  showProofPreview.value = false;
  proofPreviewSrc.value = '';
};

const verifyDownPaymentBooking = async (booking) => {
  openVerifyDownPaymentModal(booking);
};

const openVerifyDownPaymentModal = (booking) => {
  paymentActionBooking.value = booking;
  verifyReceiptNumber.value = booking.down_payment_reference || '';
  showVerifyDpModal.value = true;
};

const openRecordCashDownPaymentModal = (booking) => {
  paymentActionBooking.value = booking;
  recordDpAmount.value = booking.down_payment_amount != null
    ? Number(booking.down_payment_amount)
    : null;
  // Default payment date to when this cash payment is being listed/recorded
  recordDpDate.value = getManilaTodayString();
  showRecordDpModal.value = true;
};

const openRejectDownPaymentModal = (booking) => {
  paymentActionBooking.value = booking;
  rejectPaymentReason.value = '';
  showRejectDpModal.value = true;
};

const closePaymentModals = () => {
  showVerifyDpModal.value = false;
  showRecordDpModal.value = false;
  showRejectDpModal.value = false;
  showVerifyFinalModal.value = false;
  paymentActionBooking.value = null;
  paymentSubmissionTarget.value = null;
  verifyReceiptNumber.value = '';
  rejectPaymentReason.value = '';
  recordDpAmount.value = null;
  recordDpDate.value = '';
};

const confirmVerifyDownPayment = async () => {
  if (!paymentActionBooking.value) return;
  paymentActionLoading.value = true;
  try {
    const data = await machineryStore.verifyDownPayment(paymentActionBooking.value.id, {
      verified_by: authStore.currentUser.id,
      receipt_number: verifyReceiptNumber.value || undefined
    });
    showAlert('Down payment verified and recorded in Income.', 'success');
    closePaymentModals();
    await loadPendingDownPayments();
    await loadBookingPayments();
    await Promise.all([
      loadIncome(),
      loadCollections(),
      loadProfitSummary(),
      loadARData()
    ]);
    if (data.receipt_number) await showReceiptAfterVerify(data.receipt_number);
  } catch (e) {
    showAlert(e.message || 'Verification failed', 'error');
  } finally {
    paymentActionLoading.value = false;
  }
};

const confirmRecordCashDownPayment = async () => {
  if (!paymentActionBooking.value) return;
  const amount = parseFloat(
    paymentActionBooking.value.down_payment_amount ?? recordDpAmount.value
  );
  if (!Number.isFinite(amount) || amount <= 0) {
    showAlert(t('ui.gcashEnterAmount'), 'error');
    return;
  }
  const paymentDate = normalizeDateString(recordDpDate.value) || getManilaTodayString();
  paymentActionLoading.value = true;
  try {
    const data = await machineryStore.recordCashDownPayment(paymentActionBooking.value.id, {
      recorded_by: authStore.currentUser.id,
      amount,
      payment_method: 'Cash',
      payment_date: paymentDate
    });
    showAlert(t('ui.cashDownPaymentRecorded'), 'success');
    closePaymentModals();
    await loadPendingDownPayments();
    await loadBookingPayments();
    await Promise.all([
      loadIncome(),
      loadCollections(),
      loadProfitSummary(),
      loadARData()
    ]);
    if (data.receipt_number) await showReceiptAfterVerify(data.receipt_number);
  } catch (e) {
    showAlert(e.message || 'Failed to record down payment', 'error');
  } finally {
    paymentActionLoading.value = false;
  }
};

const paymentSubmissionTarget = ref(null);

const openVerifyBalanceSubmissionModal = (submission) => {
  paymentSubmissionTarget.value = submission;
  paymentActionBooking.value = submission;
  verifyReceiptNumber.value = '';
  showVerifyDpModal.value = false;
  showVerifyFinalModal.value = true;
};

const openRejectBalanceSubmissionModal = (submission) => {
  paymentSubmissionTarget.value = submission;
  paymentActionBooking.value = submission;
  rejectPaymentReason.value = '';
  showRejectDpModal.value = true;
};

const confirmVerifyFinalPayment = async () => {
  if (!paymentSubmissionTarget.value) return;
  paymentActionLoading.value = true;
  try {
    const data = await machineryStore.verifyBalancePaymentSubmission(paymentSubmissionTarget.value.id, {
      verified_by: authStore.currentUser.id,
      receipt_number: verifyReceiptNumber.value || undefined
    });
    showAlert(data.is_full_payment ? 'Final payment verified.' : 'Partial payment verified.', 'success');
    closePaymentModals();
    paymentSubmissionTarget.value = null;
    await loadPendingBalanceSubmissions();
    loadIncome();
    loadProfitSummary();
    loadARData();
    loadCollections();
    loadExpenses();
    if (data.receipt_number) await showReceiptAfterVerify(data.receipt_number);
  } catch (e) {
    showAlert(e.message || 'Verification failed', 'error');
  } finally {
    paymentActionLoading.value = false;
  }
};

const confirmRejectDownPayment = async () => {
  if (paymentSubmissionTarget.value) {
    paymentActionLoading.value = true;
    try {
      await machineryStore.rejectBalancePaymentSubmission(paymentSubmissionTarget.value.id, {
        rejected_by: authStore.currentUser.id,
        rejection_reason: rejectPaymentReason.value.trim()
      });
      showAlert('Payment rejected. Farmer may resubmit.', 'success');
      closePaymentModals();
      paymentSubmissionTarget.value = null;
      await loadPendingBalanceSubmissions();
    } catch (e) {
      showAlert(e.message || 'Rejection failed', 'error');
    } finally {
      paymentActionLoading.value = false;
    }
    return;
  }
  if (!paymentActionBooking.value || !rejectPaymentReason.value.trim()) return;
  paymentActionLoading.value = true;
  try {
    await machineryStore.rejectDownPayment(paymentActionBooking.value.id, {
      rejected_by: authStore.currentUser.id,
      rejection_reason: rejectPaymentReason.value.trim()
    });
    showAlert('Payment rejected. Farmer may resubmit.', 'success');
    closePaymentModals();
    await loadPendingDownPayments();
    await loadBookingPayments();
  } catch (e) {
    showAlert(e.message || 'Rejection failed', 'error');
  } finally {
    paymentActionLoading.value = false;
  }
};

const rejectDownPaymentBooking = async (booking) => {
  openRejectDownPaymentModal(booking);
};

const loadExpenses = async () => {
  try {
    const params = buildParams({
      limit: 300,
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id }),
      ...(filters.value.operator_id && { operator_id: filters.value.operator_id })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/expenses?${params}`, {
      headers: authHeaders()
    });
    const data = await response.json();
    
    if (data.success) {
      expenses.value = data.expenses;
      if (data.summary) {
        expenseSummary.value = {
          pending_count: Number(data.summary.pending_count || 0),
          recorded_booking_count: Number(data.summary.recorded_booking_count || 0),
          manual_count: Number(data.summary.manual_count || 0)
        };
      }
    }
  } catch (error) {
    console.error('Error loading expenses:', error);
    showAlert('Failed to load expenses', 'error');
  }
};

const clearExpenseFilters = () => {
  // Keep page-level machinery_id — clear section filters only
  filters.value.expense_status = '';
  filters.value.operator_id = '';
  filters.value.start_date = '';
  filters.value.end_date = '';
  loadExpenses();
};

const openManualExpenseForm = () => {
  completingPendingExpense.value = false;
  pendingExpenseContext.value = null;
  editingExpense.value = null;
  resetExpenseForm();
  showExpenseForm.value = true;
};

const completePendingExpense = (expense) => {
  completingPendingExpense.value = true;
  pendingExpenseContext.value = { ...expense };
  editingExpense.value = expense;
  expenseForm.value = {
    machinery_id: expense.machinery_id,
    booking_id: expense.booking_id,
    date_of_expense: normalizeDateString(expense.date_of_expense) || getManilaTodayString(),
    particulars: expense.particulars || '',
    payment_method: 'Cash',
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
  showExpenseForm.value = true;
};

const closeExpenseForm = () => {
  showExpenseForm.value = false;
  completingPendingExpense.value = false;
  pendingExpenseContext.value = null;
  editingExpense.value = null;
  resetExpenseForm();
};

const loadMachinery = async () => {
  try {
    const token = authStore.token;
    const params = new URLSearchParams();
    if (isAdmin.value && selectedBarangayId.value) {
      params.set('barangay_id', String(selectedBarangayId.value));
    }
    const qs = params.toString();
    const response = await fetch(`${API_BASE_URL}/machinery/inventory${qs ? `?${qs}` : ''}`, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': token ? `Bearer ${token}` : ''
      }
    });
    const data = await response.json();
    
    if (data.success) {
      machinery.value = data.inventory || [];
      syncMachineryFilterSelection();
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
    const params = buildParams({
      ...(filters.value.income_source && { income_source: filters.value.income_source }),
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id }),
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/income?${params}`, {
      headers: authHeaders()
    });
    const data = await response.json();
    
    if (data.success) {
      income.value = data.income || [];
    } else {
      income.value = [];
      console.error('Failed to load income:', data.message);
      showAlert(data.message || 'Failed to load income records', 'error');
    }
  } catch (error) {
    console.error('Error loading income:', error);
    income.value = [];
    showAlert('Failed to load income records', 'error');
  }
};

let profitSummaryRequestId = 0;

const loadProfitSummary = async () => {
  const requestId = ++profitSummaryRequestId;
  try {
    const mid = filters.value.machinery_id;
    const extra = {
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    };
    if (mid !== undefined && mid !== null && String(mid).trim() !== '') {
      extra.machinery_id = String(mid);
    }
    const params = buildParams(extra);

    const response = await fetch(`${API_BASE_URL}/machinery-financial/profit-summary?${params}`, {
      headers: authHeaders()
    });
    const data = await response.json();

    // Ignore stale responses (e.g. unfiltered load finishing after a filtered one)
    if (requestId !== profitSummaryRequestId) return;

    if (data.success && data.summary) {
      profitSummary.value = {
        total_income: Number(data.summary.total_income) || 0,
        total_expenses: Number(data.summary.total_expenses) || 0,
        net_profit: Number(data.summary.net_profit) || 0
      };
    } else {
      console.error('Failed to load profit summary:', data.message, String(params));
    }
  } catch (error) {
    if (requestId !== profitSummaryRequestId) return;
    console.error('Error loading profit summary:', error);
  }
};

const onPageMachineryFilterChange = async () => {
  // Profit cards first (await) so Total Income/Expenses/Net Profit update immediately
  await loadProfitSummary();
  loadExpenseBreakdown();
  loadBookingUsageStats();
  loadExpenses();
  loadIncome();
  loadARData();
  loadCollections();
  if (activeTab.value === 'reports' && lastReportRequest.value) {
    refreshCurrentReport();
  }
  if (isPaymentVerifier.value) {
    loadPendingBalanceSubmissions();
    loadPendingDownPayments();
  }
};

const loadExpenseBreakdown = async () => {
  try {
    const params = buildParams({
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date }),
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/expenses-breakdown?${params}`, {
      headers: authHeaders()
    });
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
    const params = buildParams({
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date }),
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id }),
      limit: '10'
    });

    const response = await fetch(`${API_BASE_URL}/machinery-financial/booking-usage-stats?${params}`, {
      headers: authHeaders()
    });
    const data = await response.json();

    if (data.success) {
      bookingUsageLeaders.value = data.leaders || [];
    }
  } catch (error) {
    console.error('Error loading booking usage stats:', error);
    bookingUsageLeaders.value = [];
  }
};

const buildExpenseParticulars = () => {
  const machine = machinery.value.find((m) => String(m.id) === String(expenseForm.value.machinery_id))
  const name = machine?.machinery_name || pendingExpenseContext.value?.machinery_name || 'Machinery'
  return `${name} operational expense`
}

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
    
    if (!expenseForm.value.total_amount || expenseForm.value.total_amount <= 0) {
      showAlert('Total Amount must be greater than 0', 'error');
      return;
    }
    
    const method = editingExpense.value ? 'PUT' : 'POST';
    const url = editingExpense.value 
      ? `${API_BASE_URL}/machinery-financial/expenses/${editingExpense.value.id}`
      : `${API_BASE_URL}/machinery-financial/expenses`;
    
    const payloadData = normalizeNumericFields({
      ...expenseForm.value,
      particulars: (expenseForm.value.particulars || '').trim() || buildExpenseParticulars()
    });
    
    const response = await fetch(url, {
      method,
      headers: authHeaders(true),
      body: JSON.stringify({
        ...payloadData,
        user_id: authStore.currentUser.id
      })
    });
    
    const data = await response.json();
    
    if (data.success) {
      showAlert(
        completingPendingExpense.value
          ? 'Expense recorded successfully. Operator income credited from labor cost.'
          : (editingExpense.value ? 'Expense updated successfully' : 'Expense recorded successfully'),
        'success'
      );
      closeExpenseForm();
      loadExpenses();
      loadProfitSummary();
      loadExpenseBreakdown();
      if (data.receipt_number) await showReceiptAfterVerify(data.receipt_number);
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
    if (!incomeForm.value.source_name.trim() || !incomeForm.value.date_of_income || Number(incomeForm.value.income_amount) <= 0) {
      showAlert('Enter the income source, date, and a valid amount.', 'error');
      return;
    }

    const response = editingManualIncomeId.value
      ? await financialPut(`${API_BASE_URL}/machinery-financial/manual-income/${editingManualIncomeId.value}`, incomeForm.value)
      : await financialPost(`${API_BASE_URL}/machinery-financial/income`, incomeForm.value);

    const data = await response.json();

    if (data.success) {
      showAlert(editingManualIncomeId.value ? 'Income updated successfully' : 'Income recorded successfully', 'success');
      showIncomeForm.value = false;
      resetIncomeForm();
      loadIncome();
      loadManualIncome();
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
  completingPendingExpense.value = false;
  pendingExpenseContext.value = null;
  editingExpense.value = expense;
  const normalized = normalizeNumericFields({ ...expense });
  normalized.date_of_expense =
    normalizeDateString(expense.date_of_expense) || getManilaTodayString();
  expenseForm.value = normalized;
  showExpenseForm.value = true;
};

const deleteExpense = async (id) => {
  if (!confirm('Are you sure you want to delete this expense?')) return;
  
  try {
    const response = await financialDelete(`${API_BASE_URL}/machinery-financial/expenses/${id}`);
    
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

const removePendingExpense = async (expense) => {
  if (!expense?.id) return;
  const machine = expense.machinery_name || 'this booking';
  if (
    !confirm(
      `Remove pending expense for ${machine}?\n\nUse this when there was no actual expense. It will leave the pending list and will not be counted in profit.`
    )
  ) {
    return;
  }

  try {
    const response = await financialPost(
      `${API_BASE_URL}/machinery-financial/expenses/${expense.id}/dismiss`,
      {}
    );
    const data = await response.json();
    if (data.success) {
      showAlert(data.message || 'Pending expense removed', 'success');
      loadExpenses();
      loadProfitSummary();
      loadExpenseBreakdown();
    } else {
      showAlert(data.message || 'Failed to remove pending expense', 'error');
    }
  } catch (error) {
    console.error('Error removing pending expense:', error);
    showAlert('Failed to remove pending expense', 'error');
  }
};

const deleteIncome = async (id) => {
  if (!confirm('Are you sure you want to delete this income record?')) return;
  
  try {
    const response = await financialDelete(`${API_BASE_URL}/machinery-financial/income/${id}`);
    
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
    const params = buildParams({
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/ar?${params}`, {
      headers: authHeaders()
    });
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
    const params = buildParams({
      ...(filters.value.machinery_id && { machinery_id: filters.value.machinery_id })
    });
    
    const response = await fetch(`${API_BASE_URL}/machinery-financial/collections?${params}`, {
      headers: authHeaders()
    });
    const data = await response.json();
    
    if (data.success) {
      collections.value = data.collections || [];
    }
  } catch (error) {
    console.error('Error loading collections:', error);
    showAlert('Failed to load collections', 'error');
  }
};

const collectionCloseArmed = ref(false);
let collectionCloseArmTimer = null;

const openRecordCollection = async (ar) => {
  if (collectionCloseArmTimer) {
    clearTimeout(collectionCloseArmTimer);
    collectionCloseArmTimer = null;
  }
  collectionCloseArmed.value = false;

  // Plain snapshot so the modal is not tied to a table row proxy that may re-render away
  const totalPrice = parseFloat(ar.total_price) || 0;
  const remainingFromApi = parseFloat(ar.remaining_balance);
  const remaining =
    Number.isFinite(remainingFromApi) && remainingFromApi >= 0
      ? remainingFromApi
      : Math.max(0, totalPrice - (parseFloat(ar.amount_collected) || 0));
  const collectedRaw = parseFloat(ar.amount_collected);
  const amountCollected =
    Number.isFinite(collectedRaw) && collectedRaw >= 0
      ? collectedRaw
      : Math.max(0, totalPrice - remaining);

  editingCollection.value = {
    id: ar.id,
    booking_id: ar.booking_id ?? ar.id,
    machinery_id: ar.machinery_id,
    farmer_name: ar.farmer_name,
    machinery_name: ar.machinery_name,
    total_price: totalPrice,
    accounts_receivable: parseFloat(ar.accounts_receivable ?? ar.total_price) || totalPrice,
    amount_collected: amountCollected,
    remaining_balance: remaining,
    pending_interest: parseFloat(ar.pending_interest) || 0,
    machinery_interest_rate: parseFloat(ar.machinery_interest_rate) || 0,
    booking_date: ar.booking_date,
    last_payment_date: ar.last_payment_date,
    last_receipt_number: ar.last_receipt_number
  };

  collectionForm.value = {
    paymentType: 'full',
    paymentAmount: remaining,
    collectionDate: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    receiptNumber: '',
    remarks: ''
  };

  await nextTick();
  showCollectionForm.value = true;
  await nextTick();

  // Prevent the same click that opened the modal from instantly closing via backdrop
  collectionCloseArmTimer = setTimeout(() => {
    collectionCloseArmed.value = true;
    collectionCloseArmTimer = null;
  }, 350);
};

const recordCollection = openRecordCollection;

const closeCollectionForm = () => {
  if (collectionCloseArmTimer) {
    clearTimeout(collectionCloseArmTimer);
    collectionCloseArmTimer = null;
  }
  collectionCloseArmed.value = false;
  showCollectionForm.value = false;
  editingCollection.value = null;
};

const onCollectionOverlayBackdropClick = () => {
  if (!collectionCloseArmed.value) return;
  closeCollectionForm();
};

const deleteCollection = async (id) => {
  if (!confirm('Are you sure you want to delete this collection record?')) return;
  
  try {
    const response = await financialDelete(`${API_BASE_URL}/machinery-financial/collections/${id}`);
    
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

const onCheckoutPaymentType = (type) => {
  collectionForm.value.paymentType = type;
  if (type === 'full') setFullPaymentAmount();
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
  if (collectionSaving.value) return;
  collectionSaving.value = true;
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
      payment_method: collectionForm.value.payment_method || 'Cash',
      remarks: collectionForm.value.remarks || null,
      user_id: authStore.currentUser.id,
      payment_type: collectionForm.value.paymentType,
      total_collection: totalCollectionAmount.value
    };
    
    // Save collection to backend
    const response = await financialPost(`${API_BASE_URL}/machinery-financial/collections`, collectionData);
    
    const data = await response.json();
    
    if (data.success) {
      showAlert(
        `Collection recorded: ₱${formatNumber(collectionForm.value.paymentAmount)}. Receipt ${data.receipt_number || ''}`,
        'success'
      );
      
      showCollectionForm.value = false;
      editingCollection.value = null;
      resetCollectionForm();
      loadCollections();
      loadARData();
      loadIncome();
      loadProfitSummary();
      if (data.receipt_number) await showReceiptAfterVerify(data.receipt_number);
    } else {
      showAlert(data.message || 'Failed to record collection', 'error');
    }
  } catch (error) {
    console.error('Error saving collection:', error);
    showAlert('Failed to record collection', 'error');
  } finally {
    collectionSaving.value = false;
  }
};

const resetCollectionForm = () => {
  collectionForm.value = {
    paymentType: 'full',
    paymentAmount: 0,
    collectionDate: new Date().toISOString().split('T')[0],
    payment_method: 'Cash',
    receiptNumber: '',
    remarks: ''
  };
  editingCollection.value = null;
};

const clearFilters = () => {
  // Keep page-level machinery_id — clear section date/source filters only
  filters.value.income_source = 'all';
  filters.value.start_date = '';
  filters.value.end_date = '';
  loadExpenses();
  loadIncome();
  loadCollections();
  loadARData();
  loadMonthlyDues();
  loadProfitSummary();
  loadExpenseBreakdown();
  loadBookingUsageStats();
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

    const response = await financialPost(`${API_BASE_URL}/machinery-financial/profit-distribution/generate`, {
        start_date: filters.value.start_date || null,
        end_date: filters.value.end_date || null,
        distribution_period: `${filters.value.start_date || 'beginning'} to ${filters.value.end_date || 'present'}`
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

const selectTab = (tabId, event) => {
  activeTab.value = tabId;
  event?.currentTarget?.blur?.();
};

const selectOrientation = (orientation, event) => {
  printOrientation.value = orientation;
  event?.currentTarget?.blur?.();
};

const selectReportType = (type, event) => {
  selectedReportType.value = type;
  // Clear sticky :hover/:focus on touch so .active styles paint immediately
  event?.currentTarget?.blur?.();
  generateReport(type);
};

const generateReport = async (type, options = {}) => {
  const { silent = false } = options;
  if (!authStore.currentUser?.id) {
    showAlert('User not authenticated', 'error');
    return;
  }

  // Select immediately so active fill is instant (before any await)
  selectedReportType.value = type;
  const requestId = ++reportRequestId;
  reportLoading.value = true;
  try {
    const response = await fetch(buildReportApiUrl({ type }), { headers: authHeaders() });
    const data = await response.json();

    if (requestId !== reportRequestId) return;

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
    if (requestId !== reportRequestId) return;
    console.error('Error generating report:', error);
    showAlert('Failed to generate report', 'error');
  } finally {
    if (requestId === reportRequestId) {
      reportLoading.value = false;
    }
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
  const params = buildParams({ type: type || 'custom' });
  if (startDate) params.set('start_date', startDate);
  if (endDate) params.set('end_date', endDate);
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

  selectedReportType.value = 'custom';
  const requestId = ++reportRequestId;
  reportLoading.value = true;
  try {
    const response = await fetch(
      buildReportApiUrl({
        type: 'custom',
        startDate: reportFilters.value.startDate,
        endDate: reportFilters.value.endDate
      }),
      { headers: authHeaders() }
    );
    const data = await response.json();

    if (requestId !== reportRequestId) return;

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
    if (requestId !== reportRequestId) return;
    console.error('Error generating report:', error);
    showAlert('Failed to generate report', 'error');
  } finally {
    if (requestId === reportRequestId) {
      reportLoading.value = false;
    }
  }
};

// Print report — iframe print that also works on mobile Safari/Chrome
let reportPrintFrame = null;
let reportPrintBlobUrl = null;

const removeMobilePrintOverlay = () => {
  const overlay = document.getElementById('machinery-mobile-print-overlay');
  if (overlay) overlay.remove();
  document.documentElement.classList.remove('machinery-print-preview-open');
  document.body.classList.remove('machinery-print-preview-open');
  document.documentElement.style.removeProperty('overflow');
  document.body.style.removeProperty('overflow');
};

const removeReportPrintFrame = () => {
  removeMobilePrintOverlay();
  if (reportPrintFrame) {
    reportPrintFrame.remove();
    reportPrintFrame = null;
  }
  if (reportPrintBlobUrl) {
    URL.revokeObjectURL(reportPrintBlobUrl);
    reportPrintBlobUrl = null;
  }
};

const buildPrintableReportHtml = (root) => buildPrintableSheetHtml(root, reportSheetMeta.value);

const waitForPrintFrameAssets = (doc) => {
  const images = Array.from(doc.images || []);
  if (!images.length) return Promise.resolve();
  return Promise.all(
    images.map(
      (img) =>
        img.complete
          ? Promise.resolve()
          : new Promise((resolve) => {
              img.addEventListener('load', resolve, { once: true });
              img.addEventListener('error', resolve, { once: true });
            })
    )
  );
};

const isMobilePrintDevice = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 900px)').matches) ||
  window.matchMedia('(max-width: 768px)').matches;

const getPrintPageMetrics = () => {
  const landscape = printOrientation.value === 'landscape';
  return {
    landscape,
    orientationLabel: landscape ? 'Landscape' : 'Portrait',
    pageWidth: landscape ? 1123 : 794,
    pageHeight: landscape ? 794 : 1123
  };
};

const buildReportPrintMarkup = (printableHtml, { mobilePreview = false } = {}) => {
  const { landscape, pageWidth, pageHeight } = getPrintPageMetrics();
  const printStyles = getMachineryReportPrintStyles(printOrientation.value);

  // Screen-only preview chrome — does not change @media print / printed output
  const mobilePreviewStyles = mobilePreview
    ? `
    @media screen {
      html, body {
        margin: 0 !important;
        padding: 0 !important;
        background: #94a3b8 !important;
        overflow-x: hidden !important;
        min-height: 100% !important;
      }
      body {
        padding: 12px 0 28px !important;
      }
      .mobile-print-stage {
        position: relative;
        width: 100%;
        margin: 0 auto;
        overflow: hidden;
      }
      .mobile-print-page {
        position: absolute;
        top: 0;
        left: 0;
        width: ${pageWidth}px;
        min-height: ${pageHeight}px;
        background: #ffffff;
        box-shadow: 0 10px 28px rgba(15, 23, 42, 0.28);
        border-radius: 2px;
        transform-origin: top left;
        overflow: hidden;
      }
      .mobile-print-page #printable-report {
        width: 100% !important;
        max-width: 100% !important;
        margin: 0 !important;
        padding: 10px 12px !important;
        box-sizing: border-box !important;
      }
      .mobile-print-page #printable-report .collectibles-form-sheet {
        margin: 8px 0 12px !important;
        padding: 12px 12px 14px !important;
        border-radius: 8px !important;
      }
      .mobile-print-page #printable-report .collectibles-table-wrap,
      .mobile-print-page #printable-report .fcr-responsive-wrap {
        overflow-x: auto !important;
        -webkit-overflow-scrolling: touch;
        max-width: 100% !important;
      }
      .mobile-print-page #printable-report table {
        max-width: none;
      }
    }
    @media print {
      html, body {
        background: #fff !important;
        padding: 0 !important;
      }
      .mobile-print-stage {
        display: block !important;
        position: static !important;
        width: auto !important;
        height: auto !important;
        overflow: visible !important;
      }
      .mobile-print-page {
        position: static !important;
        left: auto !important;
        top: auto !important;
        width: auto !important;
        min-height: auto !important;
        box-shadow: none !important;
        border-radius: 0 !important;
        transform: none !important;
        margin: 0 !important;
        overflow: visible !important;
      }
      .mobile-print-page #printable-report {
        padding: 0 !important;
      }
    }
  `
    : '';

  const bodyHtml = mobilePreview
    ? `<div class="mobile-print-stage"><div class="mobile-print-page" data-orientation="${landscape ? 'landscape' : 'portrait'}">${printableHtml}</div></div>`
    : printableHtml;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>CalFFA Machinery Financial Report</title>
  <style>${printStyles}${mobilePreviewStyles}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`;
};

const fitMobilePrintPreview = (iframe, pageWidth, pageHeight) => {
  const doc = iframe.contentDocument;
  if (!doc) return;
  const stage = doc.querySelector('.mobile-print-stage');
  const page = doc.querySelector('.mobile-print-page');
  if (!stage || !page) return;

  const viewportW = Math.max(280, iframe.clientWidth || doc.documentElement.clientWidth || 320);
  const available = Math.max(260, viewportW - 16);
  const scale = Math.min(1, available / pageWidth);

  page.style.transform = 'none';
  const naturalHeight = Math.max(pageHeight, page.scrollHeight || pageHeight);
  const left = Math.max(0, (viewportW - pageWidth * scale) / 2);

  page.style.transformOrigin = 'top left';
  page.style.transform = `scale(${scale})`;
  page.style.left = `${left}px`;
  page.style.top = '0';
  stage.style.height = `${Math.ceil(naturalHeight * scale)}px`;
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

  const mobile = isMobilePrintDevice();
  const { landscape, orientationLabel, pageWidth, pageHeight } = getPrintPageMetrics();

  // Build sync while still in the click gesture (needed for mobile print reliability)
  const printableHtml = buildPrintableReportHtml(printContents);
  const printMarkup = buildReportPrintMarkup(printableHtml, { mobilePreview: mobile });

  removeReportPrintFrame();

  // Mobile: visible same-page A4 preview (scaled) + Print/Close bar
  if (mobile) {
    const overlay = document.createElement('div');
    overlay.id = 'machinery-mobile-print-overlay';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-label', 'Print preview');
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483000',
      'display:flex',
      'flex-direction:column',
      'background:#64748b',
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      'box-sizing:border-box'
    ].join(';');

    const bar = document.createElement('div');
    bar.style.cssText = [
      'flex:0 0 auto',
      'display:flex',
      'flex-wrap:wrap',
      'gap:8px',
      'align-items:center',
      'padding:10px 12px',
      'background:#0f172a',
      'color:#fff',
      'font-family:Segoe UI,Arial,sans-serif',
      'box-shadow:0 2px 10px rgba(0,0,0,0.25)'
    ].join(';');

    const titleWrap = document.createElement('div');
    titleWrap.style.cssText = 'flex:1 1 140px;min-width:0;display:flex;flex-direction:column;gap:2px';

    const hint = document.createElement('span');
    hint.textContent = 'Print preview';
    hint.style.cssText =
      'font-size:13px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis';

    const sub = document.createElement('span');
    sub.textContent = `${orientationLabel} · Tap Print when ready`;
    sub.style.cssText = 'font-size:11px;font-weight:500;opacity:0.78;line-height:1.2';

    const actions = document.createElement('div');
    actions.style.cssText = 'display:flex;flex:0 0 auto;gap:8px;align-items:center;margin-left:auto';

    const orientChip = document.createElement('span');
    orientChip.textContent = orientationLabel;
    orientChip.style.cssText = [
      'flex:0 0 auto',
      'border-radius:999px',
      'padding:6px 10px',
      'font-size:11px',
      'font-weight:700',
      'letter-spacing:0.02em',
      landscape ? 'background:#1d4ed8;color:#eff6ff' : 'background:#166534;color:#ecfdf5'
    ].join(';');

    const printBtn = document.createElement('button');
    printBtn.type = 'button';
    printBtn.textContent = 'Print';
    printBtn.style.cssText =
      'flex:0 0 auto;border:0;border-radius:8px;padding:10px 14px;font-weight:700;font-size:14px;background:#16a34a;color:#fff';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.textContent = 'Close';
    closeBtn.style.cssText =
      'flex:0 0 auto;border:0;border-radius:8px;padding:10px 14px;font-weight:700;font-size:14px;background:#e2e8f0;color:#0f172a';

    const frameWrap = document.createElement('div');
    frameWrap.style.cssText = [
      'flex:1 1 auto',
      'min-height:0',
      'position:relative',
      'background:#94a3b8'
    ].join(';');

    const iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'Machinery financial report print');
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#94a3b8';

    titleWrap.appendChild(hint);
    titleWrap.appendChild(sub);
    actions.appendChild(orientChip);
    actions.appendChild(printBtn);
    actions.appendChild(closeBtn);
    bar.appendChild(titleWrap);
    bar.appendChild(actions);
    frameWrap.appendChild(iframe);
    overlay.appendChild(bar);
    overlay.appendChild(frameWrap);
    document.body.appendChild(overlay);
    document.documentElement.classList.add('machinery-print-preview-open');
    document.body.classList.add('machinery-print-preview-open');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    reportPrintFrame = iframe;

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
    const iframeWindow = iframe.contentWindow;
    if (!iframeDoc || !iframeWindow) {
      removeReportPrintFrame();
      showAlert('Unable to prepare print preview', 'error');
      return;
    }

    iframeDoc.open();
    iframeDoc.write(printMarkup);
    iframeDoc.close();

    const syncFit = () => fitMobilePrintPreview(iframe, pageWidth, pageHeight);
    syncFit();
    window.setTimeout(syncFit, 50);
    window.setTimeout(syncFit, 250);

    const onResize = () => syncFit();
    window.addEventListener('resize', onResize);
    window.addEventListener('orientationchange', onResize);
    const stopFitListeners = () => {
      window.removeEventListener('resize', onResize);
      window.removeEventListener('orientationchange', onResize);
    };

    const triggerPrint = () => {
      try {
        iframeWindow.focus();
        iframeWindow.print();
      } catch (error) {
        console.error('Mobile print failed:', error);
        showAlert('Tap Print again, or use your browser Share / Print menu.', 'error');
      }
    };

    printBtn.addEventListener('click', triggerPrint);
    closeBtn.addEventListener('click', () => {
      stopFitListeners();
      removeReportPrintFrame();
    });

    // Keep preview open; user taps Print with a fresh gesture
    return;
  }

  await nextTick();

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Machinery financial report print');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    `width:${pageWidth}px`,
    `height:${pageHeight}px`,
    'border:0',
    'opacity:0.01',
    'z-index:-1',
    'pointer-events:none'
  ].join(';');

  document.body.appendChild(iframe);
  reportPrintFrame = iframe;

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
  const iframeWindow = iframe.contentWindow;

  if (!iframeDoc || !iframeWindow) {
    removeReportPrintFrame();
    showAlert('Unable to prepare print preview', 'error');
    return;
  }

  iframeDoc.open();
  iframeDoc.write(printMarkup);
  iframeDoc.close();

  const cleanup = () => {
    removeReportPrintFrame();
    iframeWindow.removeEventListener('afterprint', cleanup);
  };
  iframeWindow.addEventListener('afterprint', cleanup, { once: true });
  window.setTimeout(cleanup, 120000);

  try {
    await waitForPrintFrameAssets(iframeDoc);
  } catch (_) {
    /* ignore asset wait errors */
  }

  await new Promise((resolve) => window.setTimeout(resolve, 80));

  try {
    iframeWindow.focus();
    iframeWindow.print();
  } catch (error) {
    console.error('Print failed:', error);
    showAlert('Unable to print this report. Please try again.', 'error');
    cleanup();
  }
};

const resetExpenseForm = () => {
  expenseForm.value = {
    machinery_id: '',
    booking_id: '',
    date_of_expense: '',
    particulars: '',
    payment_method: 'Cash',
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
  editingManualIncomeId.value = null;
  incomeForm.value = {
    source_name: '',
    date_of_income: new Date().toISOString().split('T')[0],
    income_amount: '',
    remarks: ''
  };
};

const openManualIncomeForm = () => {
  resetIncomeForm();
  showIncomeForm.value = true;
};

const loadManualIncome = async () => {
  try {
    const params = buildParams({});
    const response = await fetch(`${API_BASE_URL}/machinery-financial/manual-income?${params}`, {
      headers: authHeaders()
    });
    const data = await response.json();
    if (data.success) {
      manualIncomeList.value = data.manual_income || [];
    }
  } catch (error) {
    console.error('Error loading manual income:', error);
  }
};

const toLocalDateInput = (value) => normalizeDateString(value) || '';

const openEditManualIncome = (entry) => {
  editingManualIncomeId.value = entry.id;
  incomeForm.value = {
    source_name: entry.source_name || '',
    date_of_income: toLocalDateInput(entry.date_of_income),
    income_amount: entry.income_amount,
    remarks: entry.remarks || ''
  };
  showIncomeForm.value = true;
};

const deleteManualIncome = async (entry) => {
  if (!confirm(`Delete manual income "${entry.source_name}" (₱${formatNumber(entry.income_amount)})? This cannot be undone.`)) {
    return;
  }
  try {
    const response = await financialDelete(`${API_BASE_URL}/machinery-financial/manual-income/${entry.id}`);
    const data = await response.json();
    if (data.success) {
      showAlert('Manual income deleted successfully', 'success');
      loadIncome();
      loadManualIncome();
      loadProfitSummary();
    } else {
      showAlert(data.message || 'Failed to delete manual income', 'error');
    }
  } catch (error) {
    console.error('Error deleting manual income:', error);
    showAlert('Failed to delete manual income', 'error');
  }
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
    const params = buildParams({
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    });

    const response = await fetch(`${API_BASE_URL}/machinery-financial/monthly-dues?${params}`, {
      headers: authHeaders()
    });
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
    const params = buildParams();
    const response = await fetch(
      `${API_BASE_URL}/machinery-financial/monthly-dues/eligible-farmers?${params}`,
      { headers: authHeaders() }
    );
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
    const params = buildParams({
      ...(filters.value.start_date && { start_date: filters.value.start_date }),
      ...(filters.value.end_date && { end_date: filters.value.end_date })
    });

    const response = await fetch(`${API_BASE_URL}/machinery-financial/monthly-dues/summary?${params}`, {
      headers: authHeaders()
    });
    const data = await response.json();

    if (data.success) {
      duesSummary.value = data.summary;
    }
  } catch (error) {
    console.error('Error loading dues summary:', error);
  }
};

const collectMonthlyDues = async () => {
  if (duesCollecting.value) return;

  try {
    if (!duesForm.value.farmer_id) {
      showAlert('Please select a member', 'error');
      return;
    }

    if (!duesForm.value.collection_date) {
      showAlert('Please select collection date', 'error');
      return;
    }

    duesCollecting.value = true;
    const farmerId = duesForm.value.farmer_id;

    const response = await financialPost(`${API_BASE_URL}/machinery-financial/monthly-dues`, duesForm.value);

    const data = await response.json();

    if (data.success) {
      const receiptNum = data.receipt_number;
      const farmerName = data.farmer_name;

      showDuesForm.value = false;

      await Promise.all([
        loadMonthlyDues(),
        loadEligibleFarmers(),
        loadDuesSummary()
      ]);
      loadIncome();
      loadProfitSummary();

      if (farmerId) {
        const refreshed = eligibleFarmers.value.find((farmer) => farmer.id === farmerId);
        if (refreshed) selectFarmer(refreshed);
      }

      duesForm.value.remarks = '';
      duesForm.value.collection_date = new Date().toISOString().split('T')[0];
      duesForm.value.payment_method = 'Cash';

      showAlert(`Association dues recorded: ₱${formatNumber(120)} from ${farmerName}`, 'success');

      if (receiptNum) {
        await showReceiptAfterVerify(receiptNum);
      } else {
        showAlert('Dues recorded but no receipt number was returned.', 'error');
      }
    } else {
      showAlert(data.message || 'Failed to collect monthly dues', 'error');
    }
  } catch (error) {
    console.error('Error collecting monthly dues:', error);
    showAlert('Failed to collect monthly dues', 'error');
  } finally {
    duesCollecting.value = false;
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
watch(selectedBarangayId, async () => {
  if (isAdmin.value) {
    await loadMachinery();
    loadProfitSummary();
    loadExpenseBreakdown();
    loadBookingUsageStats();
    loadExpenses();
    loadIncome();
    loadARData();
    loadCollections();
    loadManualIncome();
    if (activeTab.value === 'reports' && lastReportRequest.value) {
      refreshCurrentReport();
    } else {
      reportData.value = null;
      lastReportRequest.value = null;
      selectedReportType.value = null;
    }
  }
});

watch(
  () => filters.value.machinery_id,
  (next, prev) => {
    if (String(next ?? '') === String(prev ?? '')) return;
    onPageMachineryFilterChange();
  }
);

const getDefaultTabForRole = () => {
  if (isAdmin.value) return 'profit';
  if (isTreasurer.value) return 'ar';
  if (isPresident.value) return 'ar';
  return 'expenses';
};

// /association-dues is the dedicated URL for the dues tab
const requestedTabFromRoute = () => {
  if (route.path === '/association-dues') return 'dues';
  return route.query.tab === 'monthly-dues' ? 'dues' : route.query.tab;
};

const resolveTabFromQuery = (tabQuery) => {
  const validTabs = ['expenses', 'income', 'dues', 'ar', 'inventory', 'profit', 'reports'];
  const requestedTab = tabQuery === 'monthly-dues' ? 'dues' : tabQuery;

  if (!requestedTab || !validTabs.includes(requestedTab)) {
    return getDefaultTabForRole();
  }

  if (requestedTab === 'dues' && !canCollectDues.value) {
    return getDefaultTabForRole();
  }

  if (requestedTab === 'inventory' && !canManage.value) {
    return getDefaultTabForRole();
  }

  return requestedTab;
};

const isDuesOnlyView = computed(() => requestedTabFromRoute() === 'dues' && canCollectDues.value);

// Mobile detection — member detail renders as centered modal on small screens (Share Capital pattern)
const isMobile = ref(false);
let mobileMql = null;
function updateIsMobile(e) {
  isMobile.value = e && typeof e.matches === 'boolean'
    ? e.matches
    : (typeof window !== 'undefined' && window.innerWidth <= 768);
}

const showFarmerModal = computed(() => isMobile.value && !!selectedFarmer.value && activeTab.value === 'dues');
const anyAppModalOpen = computed(() =>
  showExpenseForm.value ||
  showCollectionForm.value ||
  showFarmerModal.value ||
  showDuesForm.value ||
  showGcashConfirmModal.value ||
  showGcashRejectModal.value ||
  showVerifyDpModal.value ||
  showRecordDpModal.value ||
  showRejectDpModal.value ||
  showRejectRefundModal.value ||
  showProcessRefundModal.value ||
  (showReceiptModal.value && lastReceipt.value) ||
  alert.value.show
);

function closeFarmerModal() {
  selectedFarmer.value = null;
  duesForm.value.farmer_id = '';
}

watch(anyAppModalOpen, (open) => {
  if (typeof document === 'undefined') return;
  document.body.classList.toggle('app-modal-open', open);
  document.body.style.overflow = open ? 'hidden' : '';
}, { immediate: true });

// Watch for changes to refresh consolidated income
watch([income, collections, monthlyDues], () => {
  // This will trigger the consolidatedIncomeRecords computed property to update
}, { deep: true });

// Old link: /machinery-financial?tab=dues → new dedicated URL
const redirectLegacyDuesUrl = () => {
  if (route.path === '/machinery-financial' && ['dues', 'monthly-dues'].includes(String(route.query.tab || ''))) {
    router.replace('/association-dues');
    return true;
  }
  return false;
};

watch(
  () => [route.path, route.query.tab],
  () => {
    if (redirectLegacyDuesUrl()) return;
    activeTab.value = resolveTabFromQuery(requestedTabFromRoute());
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
  if (typeof window !== 'undefined' && window.matchMedia) {
    mobileMql = window.matchMedia('(max-width: 768px)');
    isMobile.value = mobileMql.matches;
    if (mobileMql.addEventListener) mobileMql.addEventListener('change', updateIsMobile);
    else if (mobileMql.addListener) mobileMql.addListener(updateIsMobile);
  }

  // Listen for Ctrl+P
  window.addEventListener('keydown', handleKeyDown);

  if (hasAccess.value) {
    loadExpenses();
    loadIncome();
    loadManualIncome();
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
    if (isPaymentVerifier.value) {
      loadPendingBalanceSubmissions();
      loadPendingDownPayments();
      loadBookingPayments();
      downPaymentStore.fetchStatus(selectedBarangayId.value || null);
    }
    if (canManage.value) {
      loadGcashInventory();
    }
    loadBarangays();
  }

  // Handle notification highlight (also watched for in-page re-clicks via route.query.nav)
  if (
    route.query.highlight &&
    ['gcash-loan', 'gcash-booking', 'gcash-history'].includes(String(route.query.type || ''))
  ) {
    await applyGcashNotificationDeepLink();
  } else if (route.query.view === 'history' && (route.query.sid || route.query.focus)) {
    await applyGcashNotificationDeepLink();
  } else if (
    route.query.highlight &&
    ['booking', 'refund'].includes(String(route.query.type || ''))
  ) {
    await applyBookingNotificationDeepLink();
  }
});

onBeforeUnmount(() => {
  clearGcashPendingQr();
  if (collectionCloseArmTimer) {
    clearTimeout(collectionCloseArmTimer);
    collectionCloseArmTimer = null;
  }
  if (mobileMql) {
    if (mobileMql.removeEventListener) mobileMql.removeEventListener('change', updateIsMobile);
    else if (mobileMql.removeListener) mobileMql.removeListener(updateIsMobile);
  }
  if (typeof document !== 'undefined') {
    document.body.classList.remove('app-modal-open');
    document.body.style.overflow = '';
  }
  window.removeEventListener('keydown', handleKeyDown);
  removeReportPrintFrame();
});
</script>

<style scoped>
@import '../styles/compact-data-table.css';

/* Notification highlight: dark fill in dark mode so white card text stays readable */
.notification-highlight-row {
  animation: highlightRowPulse 2s ease-in-out 3;
  background: rgba(127, 29, 29, 0.42) !important;
  outline: 2px solid #f87171;
  outline-offset: -2px;
}

.notification-highlight-row td {
  background: rgba(127, 29, 29, 0.42) !important;
  color: var(--text-main, #eefde6);
  font-weight: 600;
}

.fin-mobile-card.notification-highlight-row,
.fin-mobile-card.notification-highlight-row .fin-mobile-card-name,
.fin-mobile-card.notification-highlight-row .fin-mobile-meta-row {
  color: var(--text-main, #eefde6);
}

.fin-mobile-card.notification-highlight-row .fin-mobile-label {
  color: var(--text-muted, rgba(220, 238, 211, 0.78));
}

.financial-container.light-theme .notification-highlight-row {
  background: #fef2f2 !important;
  outline-color: #ef4444;
}

.financial-container.light-theme .notification-highlight-row td {
  background: #fef2f2 !important;
  color: #991b1b;
}

.financial-container.light-theme .fin-mobile-card.notification-highlight-row {
  background: #fff1f2 !important;
}

.financial-container.light-theme .fin-mobile-card.notification-highlight-row .fin-mobile-card-name,
.financial-container.light-theme .fin-mobile-card.notification-highlight-row .fin-mobile-meta-row {
  color: #14532d;
}

.financial-container.light-theme .fin-mobile-card.notification-highlight-row .fin-mobile-label {
  color: #64748b;
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
  
  min-height: 0;
  max-width: none;
  min-width: 0;
  box-sizing: border-box;
  padding: 2rem;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  position: relative;
  isolation: isolate;
  overflow: visible;
  border-radius: 18px;
  font-family: 'Segoe UI', system-ui, sans-serif;
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

.machinery-financial-page > .page-header.page-header-split {
  text-align: left;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.page-header-actions {
  position: relative;
  z-index: 1;
  flex-shrink: 0;
}

.gcash-header-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 42px;
  padding: 0.55rem 1rem;
  border-radius: 14px;
  border: 1px solid rgba(255, 233, 188, 0.42);
  background: linear-gradient(125deg, rgba(239, 120, 50, 0.88), rgba(105, 179, 111, 0.86));
  color: #fff;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
}

.gcash-qr-card {
  margin-bottom: 20px;
  overflow: hidden;
}

.gcash-qr-layout {
  display: grid;
  grid-template-columns: 1fr;
  gap: 18px;
  padding: 16px;
  align-items: start;
}

.gcash-qr-visual {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.gcash-qr-frame {
  display: flex;
  justify-content: center;
  width: 100%;
  max-width: 280px;
  margin: 0;
  padding: 12px;
  border: 0;
  border-radius: 14px;
  background: #fff;
  cursor: pointer;
}

.gcash-qr-preview {
  width: 100%;
  max-width: 240px;
  height: auto;
  display: block;
}

.gcash-qr-empty {
  width: 100%;
  max-width: 280px;
  min-height: 160px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  border-radius: 14px;
  border: 1px dashed rgba(190, 235, 203, 0.35);
  opacity: 0.85;
}

.gcash-qr-caption,
.gcash-qr-meta {
  margin: 0;
  font-size: 0.88rem;
  line-height: 1.4;
  text-align: center;
  opacity: 0.88;
}

.gcash-qr-info {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  min-width: 0;
}

.gcash-qr-heading {
  margin: 0;
  font-size: 1.05rem;
}

.gcash-qr-info .gcash-qr-meta {
  text-align: left;
}

.gcash-qr-file-native {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  overflow: hidden;
}

.gcash-qr-actions {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.gcash-qr-choose,
.gcash-qr-delete,
.gcash-qr-save,
.gcash-qr-history {
  width: 100%;
  min-height: 44px;
  padding: 0.7rem 1rem;
  border-radius: 12px;
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}

.gcash-qr-choose {
  border: 1px dashed rgba(190, 235, 203, 0.4);
  background: rgba(255, 255, 255, 0.06);
  color: inherit;
}

.gcash-qr-history {
  border: 1px solid rgba(190, 235, 203, 0.35);
  background: rgba(74, 222, 128, 0.12);
  color: inherit;
}

.gcash-qr-delete {
  border: 1px solid rgba(239, 68, 68, 0.55) !important;
  background: rgba(127, 29, 29, 0.35) !important;
  color: #fecaca !important;
  box-shadow: none !important;
}

.gcash-qr-text-btn {
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
  opacity: 0.85;
}

.gcash-confirm-proof {
  margin: 12px 0;
}

@media (min-width: 720px) {
  .gcash-qr-layout {
    grid-template-columns: minmax(200px, 260px) minmax(0, 1fr);
    gap: 24px;
    padding: 20px 22px;
    align-items: center;
  }

  .gcash-qr-actions {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
  }

  .gcash-qr-choose,
  .gcash-qr-delete,
  .gcash-qr-save,
  .gcash-qr-history {
    width: auto;
    min-width: 160px;
  }
}

.financial-container.light-theme .gcash-qr-choose,
.financial-container.light-theme .gcash-qr-history {
  background: #fff;
  border-color: #cfe6d6;
  color: #14532d;
}

.financial-container.light-theme .gcash-qr-history {
  background: #ecfdf3;
}

.financial-container.light-theme .gcash-qr-delete {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #fecaca !important;
}

.financial-container.light-theme .gcash-header-btn {
  color: #fff;
}

.page-header-text,
.header-content {
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

.page-header h1,
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

/* Mobile card lists — hidden on desktop (shown at ≤768px) */
.fin-mobile-list {
  display: none;
}

.fin-desktop-table {
  display: block;
  width: 100%;
  overflow-x: auto;
}

.fin-desktop-empty {
  display: block;
}

.fin-mobile-empty {
  padding: 1.25rem 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
}

.fin-mobile-card {
  padding: 0.7rem 0.75rem 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(167, 211, 178, 0.22);
  background: rgba(0, 0, 0, 0.16);
}

.fin-mobile-card.selected {
  border-color: rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.12);
  box-shadow: 0 0 0 1px rgba(74, 222, 128, 0.25);
  cursor: pointer;
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

.pending-expense-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}

.pending-expense-actions .btn-sm {
  white-space: nowrap;
}

td .pending-expense-actions {
  justify-content: flex-start;
}

.fin-mobile-action {
  flex: 1 1 auto;
  min-height: 40px;
  min-width: 0;
  justify-content: center;
  font-size: 0.78rem !important;
  padding: 0.45rem 0.65rem !important;
}

.fin-mobile-action-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 36px;
  padding: 0.35rem 0.75rem;
  border-radius: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid transparent;
  transition: filter 0.15s ease, transform 0.15s ease;
}

.fin-action-edit {
  color: #052e16;
  background: linear-gradient(135deg, #dcfce7, #86efac);
  border-color: #15803d;
}

.fin-action-print {
  color: #0c4a6e;
  background: linear-gradient(135deg, #e0f2fe, #7dd3fc);
  border-color: #0284c7;
}

.fin-action-delete {
  color: #7f1d1d;
  background: linear-gradient(135deg, #fee2e2, #fca5a5);
  border-color: #dc2626;
}

.tools-card.filters-section {
  border-radius: 14px;
}

.page-machinery-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 0.75rem 1.25rem;
  margin-bottom: 1rem;
}

.page-machinery-filter-group {
  flex: 1 1 220px;
  min-width: 180px;
  max-width: 360px;
}

.page-machinery-filter-select {
  width: 100%;
  min-width: 0;
}

.page-machinery-filter-hint {
  margin: 0;
  flex: 1 1 220px;
  font-size: 0.85rem;
  opacity: 0.85;
  line-height: 1.35;
}

.page-machinery-filter-hint-short {
  display: none;
}

.card-filter-hint {
  display: block;
  margin-top: 0.35rem;
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0.8;
  line-height: 1.25;
}

@media (max-width: 640px) {
  .page-machinery-filter {
    flex-direction: column;
    align-items: stretch;
    gap: 0.45rem;
    padding: 0.65rem 0.75rem;
  }

  .page-machinery-filter .filter-group,
  .page-machinery-filter .page-machinery-filter-group,
  .page-machinery-filter .filter-input,
  .page-machinery-filter .page-machinery-filter-select {
    width: 100%;
    max-width: none;
    min-width: 0;
    flex: none;
  }

  .page-machinery-filter-label {
    display: block !important;
    font-size: 0.72rem;
    font-weight: 700;
    margin-bottom: 0.2rem;
  }

  .page-machinery-filter-select {
    min-height: 40px;
    height: 40px;
    font-size: 0.9rem;
    padding: 0.4rem 0.65rem;
    border-radius: 10px;
  }

  .page-machinery-filter-hint {
    flex: none;
    width: 100%;
    font-size: 0.72rem;
    line-height: 1.3;
    opacity: 0.75;
  }

  .page-machinery-filter-hint-full {
    display: none;
  }

  .page-machinery-filter-hint-short {
    display: inline;
  }
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin-bottom: 16px;
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
  border-radius: 12px;
  padding: 12px 14px;
  display: flex;
  align-items: center;
  gap: 10px;
  box-shadow:
    8px 8px 16px rgba(8, 13, 10, 0.4),
    0 0 0 1px rgba(20, 32, 24, 0.45),
    inset 1px 1px 0 rgba(255, 255, 255, 0.06);
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
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  margin-bottom: 2px;
  text-shadow: none;
}

.card-amount {
  font-size: 1.2rem;
  font-weight: 900;
  line-height: 1.1;
  letter-spacing: -0.02em;
  color: #1a5c2a;
  text-shadow: none;
}

.tabs-container {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(168px, 1fr));
  gap: 10px;
  margin-bottom: 26px;
  width: 100%;
}

.tab {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
  padding: 12px 14px;
  border: 1px solid rgba(134, 239, 172, 0.35);
  background: linear-gradient(135deg, rgba(236, 253, 245, 0.95), rgba(220, 252, 231, 0.9));
  cursor: pointer;
  font-size: 0.9375rem;
  font-weight: 800;
  color: #14532d;
  border-radius: 14px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  min-height: 52px;
  text-align: center;
  box-shadow: 0 8px 16px rgba(3, 16, 10, 0.2), inset 0 1px 0 rgba(255, 255, 255, 0.75);
}

.tab-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  line-height: 1.3;
  white-space: normal;
  text-align: center;
  word-break: break-word;
  max-width: 100%;
}

.tab-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 1.25rem;
  height: 1.25rem;
  margin-left: 0.35rem;
  padding: 0 0.35rem;
  border-radius: 999px;
  background: #dc2626 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  border: 1.5px solid #7f1d1d !important;
  box-shadow: 0 1px 2px rgba(127, 29, 29, 0.25);
}

/* Keep red badge when active — white chip + forced-white tab text was invisible */
.tab.active .tab-badge {
  background: #dc2626 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1.5px solid #7f1d1d !important;
}

.dp-queue-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  overflow: visible !important;
}

.dp-queue-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  min-width: 1.35rem;
  height: 1.35rem;
  padding: 0 0.4rem;
  border-radius: 999px;
  background: #b91c1c !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  font-size: 0.75rem;
  font-weight: 800;
  line-height: 1;
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow: 0 0 0 1px rgba(127, 29, 29, 0.35);
  opacity: 1 !important;
  visibility: visible !important;
}

/* Light mode: white chip + dark red number (readable on green/orange primary buttons) */
html body.glass-light .financial-container .dp-queue-btn .dp-queue-badge,
html body .financial-container.light-theme .dp-queue-btn .dp-queue-badge,
.financial-container.light-theme .dp-queue-btn .dp-queue-badge,
body.glass-light .financial-container .dp-queue-badge {
  background: #ffffff !important;
  color: #991b1b !important;
  -webkit-text-fill-color: #991b1b !important;
  border: 1.5px solid #991b1b !important;
  box-shadow: 0 1px 2px rgba(15, 23, 42, 0.18) !important;
  opacity: 1 !important;
  visibility: visible !important;
}

html body.glass-light .financial-container .dp-queue-btn:hover .dp-queue-badge,
html body.glass-light .financial-container .dp-queue-btn:active .dp-queue-badge,
html body.glass-light .financial-container .dp-queue-btn:focus .dp-queue-badge,
html body .financial-container.light-theme .dp-queue-btn:hover .dp-queue-badge,
html body .financial-container.light-theme .dp-queue-btn:active .dp-queue-badge,
.financial-container.light-theme .dp-queue-btn:hover .dp-queue-badge,
.financial-container.light-theme .dp-queue-btn:active .dp-queue-badge,
.dp-queue-btn:hover .dp-queue-badge,
.dp-queue-btn:active .dp-queue-badge,
.dp-queue-btn:focus .dp-queue-badge,
.dp-queue-btn:focus-visible .dp-queue-badge {
  background: #ffffff !important;
  color: #7f1d1d !important;
  -webkit-text-fill-color: #7f1d1d !important;
  border-color: #7f1d1d !important;
}

.btn-link-inline {
  margin: 0;
  padding: 0;
  background: none;
  border: none;
  color: #4ade80;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  font-size: inherit;
  font-weight: 500;
  line-height: inherit;
}

.payment-alert {
  border-left-color: #f59e0b;
}

.proof-preview img {
  max-width: 220px;
  max-height: 220px;
  border-radius: 8px;
  margin: 12px 0;
  border: 1px solid rgba(0, 0, 0, 0.1);
}

.payment-verify-grid {
  margin: 12px 0;
}

.dp-verify-modal {
  width: min(22.5rem, calc(100vw - 1.5rem));
  max-width: min(22.5rem, calc(100vw - 1.5rem));
  border-radius: 14px;
}

.dp-verify-modal .modal-header {
  padding: 0.7rem 0.9rem;
}

.dp-verify-modal .modal-header h2 {
  font-size: 0.95rem;
}

.dp-verify-modal .btn-close {
  width: 1.75rem;
  height: 1.75rem;
  font-size: 1.15rem;
}

.dp-verify-modal .modal-body {
  padding: 0.7rem 0.9rem 0.85rem;
}

.dp-verify-modal .modal-body > p {
  margin: 0 0 0.55rem;
  font-size: 0.82rem;
  line-height: 1.4;
}

.dp-verify-modal .payment-verify-grid {
  margin: 0 0 0.55rem;
  gap: 0.4rem 0.65rem;
  grid-template-columns: 1fr 1fr;
}

.dp-verify-modal .ctx-label {
  font-size: 0.65rem;
  margin-bottom: 0.1rem;
}

.dp-verify-modal .payment-verify-grid strong {
  font-size: 0.8rem;
}

.dp-verify-modal .proof-preview img {
  max-width: 140px;
  max-height: 140px;
  margin: 0 0 0.55rem;
}

.dp-verify-modal .form-group {
  margin-bottom: 0.55rem;
}

.dp-verify-modal .form-group label {
  font-size: 0.72rem;
  margin-bottom: 0.25rem;
}

.dp-verify-modal .filter-input {
  min-height: 34px;
  padding: 0.35rem 0.55rem;
  font-size: 0.78rem;
}

.dp-verify-modal .info-text {
  margin-top: 0.25rem;
  font-size: 0.7rem;
}

.dp-verify-modal .modal-actions {
  margin-top: 0.55rem;
  padding-top: 0.55rem;
}

.dp-verify-modal .modal-actions .btn-primary {
  width: 100%;
  justify-content: center;
  min-height: 36px;
  padding: 0.45rem 0.7rem;
  font-size: 0.78rem;
}

.payment-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.tab:hover:not(.active) {
  background: linear-gradient(135deg, rgba(220, 252, 231, 1), rgba(187, 247, 208, 0.96));
  border-color: rgba(22, 163, 74, 0.45);
  transform: translateY(-2px);
  box-shadow: 0 12px 20px rgba(3, 16, 10, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.85);
}

.tab.active,
.tab.active:hover,
.tab.active:focus,
.tab.active:focus-visible,
.tab.active:active {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%);
  border-color: rgba(167, 243, 208, 0.65);
  color: #ffffff;
  box-shadow: 0 12px 22px rgba(6, 78, 35, 0.35), inset 0 1px 0 rgba(220, 252, 231, 0.22);
  transform: none;
  filter: none;
  transition: none;
}

@media (max-width: 768px) {
  .tabs-container {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
    overflow: visible;
    padding-bottom: 0;
    margin-bottom: 14px;
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

  .tab-label {
    gap: 0.25rem;
    font-size: inherit;
  }

  .tab-badge {
    min-width: 1.1rem;
    height: 1.1rem;
    margin-left: 0.15rem;
    font-size: 0.65rem;
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
  overflow: visible;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
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
  font-size: 1.15rem;
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
  border: 2px solid #94a3b8;
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
  font-size: 0.625rem;
  table-layout: fixed;
}

.expenses-table th:not(:last-child),
.income-table th:not(:last-child),
.ar-table th:not(:last-child),
.collections-table th:not(:last-child),
.expenses-table td:not(:last-child),
.income-table td:not(:last-child),
.ar-table td:not(:last-child),
.collections-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
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
  padding: 0.28rem 0.32rem;
  text-align: center;
  vertical-align: middle;
  font-weight: 600;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  background: rgba(74, 222, 128, 0.08);
  line-height: 1.12;
  white-space: normal;
  word-break: break-word;
}

.expenses-table td,
.income-table td,
.ar-table td,
.collections-table td {
  padding: 0.26rem 0.3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-size: 0.625rem;
  font-weight: 500;
  text-align: center;
  vertical-align: middle;
  line-height: 1.25;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
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
  font-weight: 600;
  font-size: 0.625rem;
  color: #b7f7c8;
  font-family: 'Courier New', monospace;
  text-align: center;
}

.amount-cell.balance {
  color: #bbf7d0;
  font-weight: 600;
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
  min-height: 108px;
  height: 100%;
  padding: 16px 14px;
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

.ar-row-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
}

.ar-row-actions .btn-sm {
  min-height: 32px;
  padding: 0.28rem 0.6rem;
  font-size: 0.75rem;
  white-space: nowrap;
}

.fin-mobile-card-actions.ar-mobile-actions {
  flex-direction: column;
  align-items: stretch;
}

.fin-mobile-card-actions.ar-mobile-actions .fin-mobile-action {
  width: 100%;
  flex: 1 1 auto;
}

.status-badge {
  display: inline-block;
  padding: 0.08rem 0.28rem;
  border-radius: 999px;
  font-size: 0.55rem;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.1;
}

.status-badge.full-payment {
  background: rgba(74, 222, 128, 0.2);
  color: #b7f7c8;
}

.status-badge.partial-payment {
  background: rgba(245, 208, 154, 0.35);
  color: #f5e6c8;
}

.status-badge.verified {
  background: rgba(74, 222, 128, 0.22);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.4);
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
  padding: 0.08rem 0.28rem;
  border-radius: 999px;
  font-size: 0.55rem;
  font-weight: 600;
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.income-table .badge-income {
  background: rgba(74, 222, 128, 0.2);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.35);
}

.income-table .badge-down-payment,
.badge-down-payment {
  background: rgba(167, 243, 208, 0.92);
  color: #14532d;
  border: 1px solid rgba(74, 222, 128, 0.45);
}

.income-table .badge-collection {
  background: rgba(96, 165, 250, 0.2);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.35);
}

.actions-cell {
  text-align: center;
  vertical-align: middle;
}

.actions-cell .table-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 6px;
  vertical-align: middle;
}

.actions-cell .table-action-btn + .table-action-btn {
  margin-left: 0.25rem;
}

.actions-cell .table-action-btn svg {
  width: 14px;
  height: 14px;
  display: block;
}

.financial-container th.actions-col,
.financial-container td.actions-cell {
  text-align: center !important;
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-soft);
}

.empty-state-hint {
  margin: 8px auto 0;
  max-width: 36rem;
  font-size: 0.85rem;
  line-height: 1.45;
  color: var(--text-soft);
  opacity: 0.9;
}

.fin-mobile-empty .empty-state-hint {
  margin-top: 6px;
}

.ar-tab-desc {
  margin: 6px 0 0;
  font-size: 0.9rem;
  font-weight: 500;
  color: var(--text-soft);
}

.collections-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem 1rem;
  flex-wrap: wrap;
}

.collections-search {
  display: flex;
  align-items: center;
  gap: 0.45rem;
  min-width: min(18rem, 100%);
  flex: 1 1 16rem;
  max-width: 22rem;
  padding: 0 0.7rem;
  border-radius: 10px;
  border: 1px solid rgba(190, 235, 203, 0.22);
  background: rgba(8, 20, 14, 0.35);
}

.collections-search-icon {
  display: grid;
  place-items: center;
  width: 1rem;
  height: 1rem;
  color: rgba(187, 247, 208, 0.75);
  flex-shrink: 0;
}

.collections-search-icon svg {
  width: 1rem;
  height: 1rem;
}

.collections-search-input {
  flex: 1;
  min-width: 0;
  border: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  min-height: 38px;
  padding: 0.35rem 0 !important;
  font-size: 0.88rem;
  color: inherit;
}

.collections-note {
  margin: 4px 0 0;
  max-width: 40rem;
  font-size: 0.82rem;
  line-height: 1.4;
  color: var(--text-soft);
}

.ar-list-note {
  margin: 0 0 12px;
}

.income-amount-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.income-amount-kind {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #bbf7d0;
}

.income-dp-amount {
  font-weight: 700;
}

.interest-due-hint {
  display: block;
  margin-top: 2px;
  font-weight: 500;
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
  gap: 12px;
  align-items: start;
}

.breakdown-card {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(190, 235, 203, 0.18);
  border-radius: 12px;
  padding: 12px 14px;
  backdrop-filter: blur(6px);
}

.breakdown-card h3 {
  margin: 0 0 8px 0;
  font-size: 0.78rem;
  color: #b6f7cb;
  font-weight: 800;
  letter-spacing: 0.35px;
  text-transform: uppercase;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 6px;
}

.amount {
  font-size: 1.25rem;
  font-weight: 900;
  color: #4ade80;
  margin: 0;
  text-shadow: 0 0 10px rgba(74, 222, 128, 0.3);
}

.amount.negative {
  color: var(--red);
}

.expense-items {
  display: flex;
  flex-direction: column;
  gap: 0;
}

.expense-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 4px 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.78rem;
}

.expense-item span:first-child {
  color: rgba(220, 238, 211, 0.88);
  font-weight: 600;
}

.expense-item span:last-child {
  color: #86efac;
  font-weight: 800;
  font-size: 0.78rem;
  font-family: monospace;
}

.expense-item.total {
  font-weight: 800;
  border-top: 1px solid rgba(190, 235, 203, 0.3);
  border-bottom: none;
  margin-top: 2px;
  padding-top: 6px;
}

.expense-item.total span:first-child {
  color: #eefde6;
  font-size: 0.78rem;
}

.expense-item.total span:last-child {
  color: #4ade80;
  font-size: 0.85rem;
}

.profit {
  background: linear-gradient(135deg, rgba(52, 211, 153, 0.12), rgba(34, 197, 94, 0.08));
  border: 1px solid rgba(52, 211, 153, 0.25);
  padding: 12px 14px;
  border-radius: 12px;
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
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
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

.distribution-card.per-member-card {
  background: linear-gradient(160deg, rgba(125, 211, 252, 0.12) 0%, rgba(22, 35, 27, 0.9) 60%);
  border-color: rgba(125, 211, 252, 0.28);
}

.distribution-card.per-member-card::before {
  background: linear-gradient(90deg, #0284c7, #7dd3fc);
}

.distribution-card.per-member-card .distribution-icon {
  color: #7dd3fc;
  background: rgba(125, 211, 252, 0.14);
  border-color: rgba(125, 211, 252, 0.35);
}

.distribution-card.per-member-card .distribution-content .amount {
  color: #7dd3fc;
  text-shadow: 0 0 14px rgba(125, 211, 252, 0.35);
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

.modal-overlay:not(.app-modal-overlay) {
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

.receipt-modal-content {
  max-width: 560px;
  padding: 16px;
  background: #f8fafc;
}

.receipt-modal-expense {
  max-width: 880px;
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
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.55rem 0.65rem;
}

.expense-meta-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.55rem 0.65rem;
}

.auto-receipt-inline {
  margin: 0 0 0.55rem;
  font-size: 0.75rem;
  color: var(--text-soft);
  line-height: 1.35;
}

.expense-total-group {
  margin-top: 0.25rem;
  margin-bottom: 0.35rem;
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

.alert-center-stack {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 13000;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.6rem;
  width: min(420px, calc(100vw - 2rem));
  pointer-events: none;
}

.alert {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  width: 100%;
  padding: 16px 18px;
  border-radius: 14px;
  text-align: left;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.38);
  pointer-events: auto;
  animation: alert-pop-in 0.18s ease-out;
  isolation: isolate;
  min-width: 0;
}

@keyframes alert-pop-in {
  from {
    opacity: 0;
    transform: scale(0.94);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

.alert-success {
  background: rgba(6, 95, 70, 0.94) !important;
  color: #d1fae5 !important;
  border: none !important;
  border-left: 4px solid #10b981 !important;
}

.alert-error {
  background: rgba(127, 29, 29, 0.94) !important;
  color: #fecaca !important;
  border: none !important;
  border-left: 4px solid #ef4444 !important;
}

.alert-center-stack.light-theme .alert-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-left: 4px solid #16a34a !important;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.12) !important;
}

.alert-center-stack.light-theme .alert-error {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-left: 4px solid #dc2626 !important;
  box-shadow: 0 8px 24px rgba(153, 27, 27, 0.15) !important;
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

.badge-recorded {
  background: #d1fae5;
  color: #065f46;
}

.pending-expense-alert {
  margin: 0 0 1rem;
  padding: 0.75rem 1rem;
  border-radius: 8px;
  background: #fff7ed;
  border: 1px solid #fdba74;
  color: #9a3412;
}

.expense-section-block {
  margin-bottom: 1.75rem;
}

.expense-section-title {
  margin: 0 0 0.35rem;
  font-size: 1.05rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.section-count {
  display: inline-flex;
  min-width: 1.5rem;
  justify-content: center;
  padding: 0.1rem 0.45rem;
  border-radius: 999px;
  background: #e5e7eb;
  color: #1f2937;
  font-size: 0.8rem;
  font-weight: 700;
}

.section-hint {
  margin: 0 0 0.75rem;
  color: #6b7280;
  font-size: 0.88rem;
}

.transaction-context-panel {
  margin-bottom: 0.65rem;
  padding: 0.65rem 0.75rem;
  border-radius: 10px;
  background: rgba(15, 35, 24, 0.72);
  border: 1px solid rgba(74, 222, 128, 0.28);
  color: var(--text-main);
}

.transaction-context-panel h3 {
  margin: 0 0 0.45rem;
  font-size: 0.82rem;
  color: var(--text-main);
}

.context-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(140px, 1fr));
  gap: 0.4rem 0.75rem;
}

.context-grid strong {
  color: var(--text-main);
  font-size: 0.82rem;
}

.ctx-label {
  display: block;
  font-size: 0.68rem;
  color: var(--text-soft);
}

.context-hint {
  margin: 0.45rem 0 0;
  font-size: 0.75rem;
  color: var(--text-soft);
}

.btn-sm {
  padding: 0.16rem 0.3rem;
  font-size: 0.55rem;
  line-height: 1.1;
}

.badge-cancelled {
  background: #fee2e2;
  color: #991b1b;
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.18rem 0.52rem;
  border-radius: 999px;
  font-size: 0.62rem;
  font-weight: 700;
  line-height: 1.2;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  border: 1px solid transparent;
  white-space: nowrap;
}

.badge-paid {
  background: rgba(74, 222, 128, 0.16);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.35);
}

.badge-unpaid {
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.35);
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
  padding: 8px 10px;
  border: 1px solid rgba(150, 203, 171, 0.38);
  border-radius: 8px;
  background: linear-gradient(138deg,
    rgba(174, 112, 35, 0.76) 0%,
    rgba(124, 166, 74, 0.72) 100%);
  color: #f7fff9;
  cursor: pointer;
  transition: transform 0.12s ease, border-color 0.12s ease;
  flex: 1;
  min-width: 0;
  min-height: 40px;
}

.report-type-btn:hover:not(.active) {
  border-color: rgba(182, 238, 201, 0.58);
  transform: translateY(-1px);
  filter: brightness(1.06) saturate(1.04);
}

.report-type-btn.active,
.report-type-btn.active:hover,
.report-type-btn.active:focus,
.report-type-btn.active:focus-visible,
.report-type-btn.active:active {
  border-color: rgba(196, 246, 213, 0.76);
  background: linear-gradient(138deg,
    rgba(221, 126, 33, 0.92) 0%,
    rgba(102, 182, 102, 0.9) 100%);
  color: #ffffff;
  box-shadow: 0 8px 20px rgba(62, 116, 72, 0.28);
  transition: none;
  filter: none;
  transform: none;
  opacity: 1;
}

.report-type-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.report-type-btn.active:disabled {
  opacity: 1;
  cursor: pointer;
}

.report-type-btn .btn-icon {
  font-size: 1rem;
  margin-bottom: 2px;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.3));
}

.report-type-btn .btn-text {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1.2;
}

.custom-date-toggle {
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(148, 196, 165, 0.26);
}

.checkbox-inline {
  display: flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  font-size: 0.72rem;
  color: #ecfdf5;
  font-weight: 600;
  min-height: 28px;
  line-height: 1.2;
}

.checkbox-inline input[type="checkbox"] {
  width: 14px;
  height: 14px;
  min-width: 14px;
  margin: 0;
  accent-color: #16a34a;
}

.custom-date-inputs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
  padding: 8px;
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
  gap: 3px;
  align-items: stretch;
}

@media (min-width: 1180px) {
  .filter-checkboxes {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 4px;
  }
}

.filter-checkbox {
  display: flex;
  align-items: center;
  gap: 6px;
  box-sizing: border-box;
  width: 100%;
  min-height: 28px;
  height: auto;
  padding: 4px 8px;
  background: linear-gradient(140deg,
    rgba(18, 42, 31, 0.9) 0%,
    rgba(23, 51, 38, 0.92) 100%);
  border-radius: 6px;
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
  transform: none;
}

.filter-checkbox span {
  flex: 1;
  min-width: 0;
  color: #ffffff;
  font-weight: 600;
  font-size: 0.72rem;
  letter-spacing: 0.01em;
  line-height: 1.2;
  white-space: normal;
  word-break: break-word;
  overflow: visible;
}

.filter-checkbox input[type="checkbox"] {
  width: 14px;
  height: 14px;
  min-width: 14px;
  margin: 0;
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
  font-size: 0.85rem;
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
  padding: 8px 10px;
  border: 1px solid rgba(143, 194, 162, 0.4);
  border-radius: 8px;
  background: linear-gradient(135deg,
    rgba(173, 108, 40, 0.78),
    rgba(93, 168, 96, 0.78));
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.25;
  transition: transform 0.12s ease, border-color 0.12s ease;
  text-align: center;
  color: #f6fff9;
  min-height: 36px;
}

.orient-btn:hover:not(.active) {
  border-color: rgba(191, 242, 207, 0.72);
  transform: translateY(-1px);
}

.orient-btn.active,
.orient-btn.active:hover,
.orient-btn.active:focus,
.orient-btn.active:focus-visible,
.orient-btn.active:active {
  border-color: rgba(201, 248, 215, 0.82);
  background: linear-gradient(135deg,
    rgba(220, 123, 31, 0.95),
    rgba(89, 180, 97, 0.94));
  color: #ffffff;
  font-weight: 600;
  box-shadow: 0 6px 16px rgba(55, 110, 68, 0.3);
  transition: none;
  filter: none;
  transform: none;
}

.btn-action {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 12px;
  border: 1px solid rgba(152, 203, 171, 0.45);
  border-radius: 8px;
  cursor: pointer;
  font-size: 0.82rem;
  font-weight: 700;
  line-height: 1.25;
  transition: all 0.2s;
  color: #f6fff9;
  box-shadow: 0 4px 12px rgba(7, 15, 11, 0.25);
  min-height: 36px;
}

.btn-action.print {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  color: white;
}

.btn-action.print.btn-action-icon {
  padding: 8px 10px;
  min-width: 36px;
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
  font-size: 0.95rem;
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
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
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
    gap: 4px;
  }

  .collectibles-meta-col {
    gap: 3px;
  }

  .collectibles-meta-col-left {
    padding-right: 0;
    border-right: none;
    padding-bottom: 4px;
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

/* Machinery financial report tables (Summary, Distribution, Transactions, Expenses, Bookings) */
.mfr-summary-table .mfr-col-item { width: 50%; text-align: left; }
.mfr-summary-table .mfr-col-amt { width: 25%; text-align: right; }
.mfr-summary-table .mfr-col-rec { width: 25%; text-align: center; }

.mfr-distribution-table .mfr-col-alloc { width: 45%; text-align: left; }
.mfr-distribution-table .mfr-col-share { width: 15%; text-align: center; }
.mfr-distribution-table .mfr-col-amt { width: 40%; text-align: right; }

.mfr-transactions-table .mfr-col-date { width: 11%; text-align: center; }
.mfr-transactions-table .mfr-col-type { width: 12%; text-align: center; }
.mfr-transactions-table .mfr-col-mach { width: 14%; text-align: left; }
.mfr-transactions-table .mfr-col-desc { width: 28%; text-align: left; }
.mfr-transactions-table .mfr-col-farmer { width: 18%; text-align: left; }
.mfr-transactions-table .mfr-col-amt { width: 17%; text-align: right; }

.mfr-expense-table .mfr-col-date { width: 8%; text-align: center; }
.mfr-expense-table .mfr-col-mach { width: 10%; text-align: left; }
.mfr-expense-table .mfr-col-desc { width: 16%; text-align: left; }
.mfr-expense-table .mfr-col-ref { width: 7%; text-align: center; }
.mfr-expense-table .mfr-col-sm { width: 9%; text-align: right; }
.mfr-expense-table .mfr-col-amt { width: 11%; text-align: right; }

.mfr-bookings-table .mfr-col-date { width: 10%; text-align: center; }
.mfr-bookings-table .mfr-col-ref { width: 9%; text-align: center; }
.mfr-bookings-table .mfr-col-mach { width: 14%; text-align: left; }
.mfr-bookings-table .mfr-col-farmer { width: 16%; text-align: left; }
.mfr-bookings-table .mfr-col-status { width: 12%; text-align: center; }
.mfr-bookings-table .mfr-col-amt { width: 13%; text-align: right; }

.mfr-expense-table .fcr-total-row td,
.mfr-bookings-table .fcr-total-row td,
.mfr-transactions-table .fcr-total-row td,
.mfr-summary-table .fcr-total-row td,
.mfr-distribution-table .fcr-total-row td {
  background: #f1f5f9;
  font-weight: 800;
  border-top: 2px solid #0f172a;
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

.fcr-mobile-value-strong {
  font-weight: 800;
  color: #0f172a;
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

@media (max-width: 1100px) {
  :deep(.fcr-desktop-table) {
    display: none !important;
  }

  :deep(.fcr-mobile-list) {
    display: block !important;
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
  }

  :deep(.collectibles-table-wrap),
  :deep(.fcr-responsive-wrap) {
    overflow: visible;
    width: 100%;
    max-width: 100%;
    min-width: 0;
  }
}

@media (max-width: 768px) {

  .collectibles-form-sheet {
    padding: 12px 10px 14px;
    margin: 14px 0 18px;
    border-radius: 10px;
  }

  .report-display {
    padding: 12px 8px;
    border-radius: 12px;
    overflow-x: hidden;
  }

  .report-header {
    flex-direction: column;
    gap: 12px;
    padding: 14px 12px;
    text-align: center;
  }

  .report-header .report-logo,
  .report-header .report-meta {
    width: 100%;
    text-align: center;
    justify-content: center;
  }

  .report-header .report-logo {
    flex-direction: column;
  }

  .report-generator-panel {
    padding: 14px 12px;
    margin-bottom: 16px;
    border-radius: 14px;
  }

  .report-options-grid {
    grid-template-columns: 1fr;
    gap: 14px;
  }

  .report-option-card {
    padding: 14px 12px;
  }

  .report-option-card h4 {
    font-size: 1.05rem;
    margin-bottom: 12px;
  }

  .report-type-buttons {
    flex-direction: column;
  }

  .report-type-btn {
    width: 100%;
    min-width: 0;
  }

  .custom-date-inputs {
    flex-direction: column;
    align-items: stretch;
  }

  .custom-date-toggle {
    margin-top: 6px;
    padding-top: 6px;
  }

  .checkbox-inline {
    min-height: 26px;
    gap: 5px;
    font-size: 0.68rem;
  }

  .checkbox-inline input[type="checkbox"] {
    width: 13px;
    height: 13px;
    min-width: 13px;
  }

  .date-input-group {
    width: 100%;
  }

  .filter-checkboxes {
    grid-template-columns: 1fr;
  }

  .reports-machinery-filter-bar {
    margin-bottom: 14px;
  }

  .reports-machinery-filter-bar .filter-group {
    width: 100%;
  }

  .reports-machinery-filter-bar .filter-input {
    width: 100%;
    max-width: 100%;
  }

  .action-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: stretch;
    gap: 6px;
  }

  .action-buttons .btn-action {
    flex: 1 1 calc(50% - 4px);
    width: auto;
    min-width: 0;
    justify-content: center;
    padding: 7px 8px;
    font-size: 0.75rem;
    min-height: 36px;
  }

  .action-buttons .btn-action.print {
    flex: 0 0 auto;
  }

  .orientation-toggle {
    flex-direction: row;
    gap: 6px;
  }

  .orient-btn {
    width: auto;
    flex: 1;
    padding: 7px 8px;
    font-size: 0.75rem;
    min-height: 36px;
  }

  .report-type-buttons {
    gap: 6px;
  }

  .report-type-btn {
    padding: 7px 6px;
    min-height: 38px;
    font-size: 0.72rem;
  }

  .report-option-card {
    padding: 12px;
  }

  .report-option-card h4 {
    font-size: 0.95rem;
    margin-bottom: 10px;
  }

  .financial-container .tab-content {
    padding: 14px 10px;
    border-radius: 14px;
    overflow: visible;
  }

  .section-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .section-header h2 {
    font-size: 1rem;
  }

  .profit-breakdown {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .breakdown-card,
  .profit.breakdown-card,
  .profit {
    padding: 10px 12px;
    border-radius: 10px;
  }

  .breakdown-card h3 {
    font-size: 0.72rem;
    margin-bottom: 6px;
    padding-bottom: 5px;
  }

  .amount {
    font-size: 1.05rem;
  }

  .expense-item {
    padding: 3px 0;
    font-size: 0.72rem;
  }

  .expense-item span:last-child,
  .expense-item.total span:last-child {
    font-size: 0.72rem;
  }

  .usage-leaders-card {
    padding: 10px 12px;
    border-radius: 10px;
    margin-bottom: 12px;
  }

  .usage-leaders-card .section-subheader h3 {
    font-size: 0.85rem;
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

  .filter-checkbox {
    min-height: 26px;
    padding: 3px 7px;
    gap: 5px;
  }

  .filter-checkbox span {
    font-size: 0.68rem;
    line-height: 1.15;
  }

  .filter-checkbox input[type="checkbox"] {
    width: 13px;
    height: 13px;
    min-width: 13px;
  }

  .filter-checkboxes {
    gap: 2px;
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

  .collectibles-form-sheet {
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

  .collectibles-form-sheet {
    padding: 10px 8px;
    border-width: 1px;
  }

  .collectibles-form-title-block {
    margin-bottom: 4px;
  }

  .collectibles-main-title {
    font-size: 0.82rem;
    line-height: 1.2;
  }

  .collectibles-main-subtitle {
    font-size: 0.68rem;
    line-height: 1.15;
    margin-top: 1px;
  }

  .collectibles-meta-box-compact {
    padding: 4px 6px;
    margin-bottom: 6px;
  }

  .collectibles-meta-label-sm {
    font-size: 0.55rem;
    line-height: 1.15;
  }

  .collectibles-meta-fill {
    font-size: 0.62rem;
    min-height: 14px;
    line-height: 1.15;
    padding: 0 2px 1px;
  }

  /* Keep contact fill fields as visible compact textboxes on small screens */
  .sheet-fill-line {
    min-height: 28px;
    padding: 0;
    border: 1px solid #94a3b8;
    border-radius: 6px;
    background: #ffffff;
  }

  .sheet-fill-input {
    font-size: 0.68rem;
    min-height: 26px;
    line-height: 1.2;
    padding: 4px 8px;
  }

  .fcr-mobile-label {
    flex: 0 0 42%;
    max-width: 42%;
    font-size: 0.68rem;
  }

  .fcr-mobile-value {
    font-size: 0.75rem;
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
  border-radius: 10px;
  padding: 8px 12px;
  margin-bottom: 14px;
  text-align: left;
  backdrop-filter: blur(10px);
}

.barangay-context.admin-context {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(74, 222, 128, 0.2);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  text-align: left;
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
  gap: 2px;
  padding: 10px 12px;
  min-height: 0;
}

.summary-cards > .summary-card .card-content {
  align-items: center;
}

.summary-cards > .summary-card .card-label {
  color: #111827;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  margin-bottom: 2px;
}

.summary-cards > .summary-card .card-amount {
  color: #111827;
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

/* Expense Breakdown readability — dark mode only */
.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item {
  padding: 4px 0;
}

.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:first-child {
  font-weight: 700;
  color: #effbe8;
  letter-spacing: 0.15px;
  font-size: 0.78rem;
}

.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:last-child {
  font-weight: 800;
  font-size: 0.78rem;
  color: #f8fff5;
}

.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:first-child,
.financial-container:not(.light-theme) .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:last-child {
  font-weight: 800;
}

.admin-filter {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-top: 0;
  width: 100%;
}

.admin-filter label {
  font-weight: 700;
  font-size: 0.72rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: var(--text-soft);
}

.barangay-select {
  padding: 7px 10px;
  border: 1px solid rgba(190, 235, 203, 0.35);
  border-radius: 8px;
  font-size: 0.82rem;
  font-weight: 650;
  color: #f3ffef;
  background: rgba(25, 37, 29, 0.96);
  min-width: 0;
  width: 100%;
  max-width: 100%;
  min-height: 36px;
  cursor: pointer;
  transition: all 0.2s ease;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.08), 0 4px 10px rgba(0, 0, 0, 0.18);
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

/* Profit distribution cards: 2×2 compact grid */
.profit-distribution-section .distribution-grid {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 16px;
  row-gap: 14px;
  justify-content: center;
  align-items: stretch;
  width: 100%;
  max-width: 720px;
  margin-top: 20px;
  margin-left: auto;
  margin-right: auto;
}

@media (max-width: 1200px) {
  .profit-distribution-section .distribution-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    column-gap: 14px;
    row-gap: 12px;
    max-width: 640px;
  }
}

@media (max-width: 768px) {
  .profit-distribution-section .distribution-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    max-width: none;
    margin-left: 0;
    margin-right: 0;
    column-gap: 8px;
    row-gap: 8px;
  }

  .profit-distribution-section {
    margin-top: 22px;
    padding-top: 16px;
  }

  .profit-distribution-section h3 {
    font-size: 1rem;
    margin-bottom: 4px;
  }

  .distribution-card {
    padding: 10px 8px 10px;
    border-radius: 12px;
    gap: 0;
  }

  .distribution-icon {
    width: 32px;
    height: 32px;
    margin-bottom: 6px;
    border-radius: 8px;
  }

  .distribution-icon svg {
    width: 16px;
    height: 16px;
  }

  .distribution-content h4 {
    font-size: 0.62rem;
    letter-spacing: 0.04em;
    margin-bottom: 4px;
    line-height: 1.2;
  }

  .distribution-content .percentage {
    font-size: 0.7rem;
    padding: 1px 8px;
    margin-bottom: 6px;
  }

  .distribution-content .amount {
    font-size: 0.95rem;
    line-height: 1.15;
  }

  /* ===== Mobile page layout (aligned with Machinery Management) ===== */
  .financial-container.machinery-financial-page,
  .financial-container.page-container {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    max-width: none;
    padding: 0.75rem;
    border-radius: 0;
    overflow: visible;
    min-height: 0;
    touch-action: pan-y;
  }

  .page-header,
  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.85rem;
  }

  .page-header-actions {
    width: 100%;
    margin-top: 0.45rem;
  }

  .gcash-header-btn {
    width: 100%;
  }

  .page-header::after,
  .page-header-split::after {
    display: none;
  }

  .page-header-text,
  .header-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
  }

  .page-header h1,
  .page-title {
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
    color: #eefde6;
    background: none;
    -webkit-background-clip: unset;
    background-clip: unset;
  }

  .page-subtitle {
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
  }

  .summary-cards,
  .summary-cards.stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 6px;
    margin-bottom: 10px;
  }

  .stats-grid:not(.summary-cards) {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
    margin-bottom: 10px;
  }

  .summary-card,
  .stat-card {
    padding: 8px 10px;
    gap: 4px;
    border-radius: 10px;
    min-height: 0;
  }

  .summary-cards > .summary-card {
    padding: 8px 10px;
    gap: 2px;
  }

  .summary-card .card-label,
  .summary-cards > .summary-card .card-label,
  .stat-label {
    font-size: 0.58rem !important;
    margin-bottom: 1px;
  }

  .summary-card .card-amount,
  .summary-cards > .summary-card .card-amount,
  .stat-value {
    font-size: 0.92rem !important;
    line-height: 1.15;
  }

  .summary-container {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .summary-container > .summary-card {
    min-height: 0;
    padding: 10px 12px;
    flex-direction: row;
    justify-content: flex-start;
    text-align: left;
    gap: 8px;
  }

  .summary-container > .summary-card .card-icon {
    width: 34px;
    height: 34px;
    font-size: 18px;
    border-radius: 8px;
    flex-shrink: 0;
  }

  .summary-container > .summary-card .card-amount {
    font-size: 1.05rem;
  }

  .barangay-context {
    flex-direction: column;
    align-items: stretch;
    gap: 6px;
    padding: 8px 10px;
    margin-bottom: 10px;
    border-radius: 10px;
  }

  .barangay-context .admin-filter {
    display: flex;
    flex-direction: column;
    gap: 4px;
    width: 100%;
    margin-top: 0;
  }

  .barangay-context .barangay-select {
    width: 100%;
    min-height: 34px;
    padding: 6px 8px;
    font-size: 0.78rem;
  }

  .filters-section,
  .tools-card.filters-section {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem 0.4rem;
    margin-bottom: 0.55rem;
    padding: 0.4rem 0.45rem;
    border-radius: 10px;
    align-items: stretch;
  }

  .filters-section .filter-group {
    min-width: 0;
    width: 100%;
    flex: none;
    gap: 0.15rem;
  }

  /* Full-width fields that need more room (first select on expense/income) */
  .filters-section .filter-group:first-child {
    grid-column: 1 / -1;
  }

  .filters-section .filter-label {
    display: none;
  }

  .filters-section .filter-input,
  .filters-section .toolbar-input,
  .filters-section .toolbar-select {
    width: 100%;
    min-height: 30px;
    height: 30px;
    font-size: 0.72rem;
    border-radius: 7px;
    padding: 0.2rem 0.4rem;
    line-height: 1.2;
  }

  .filters-section .filter-actions {
    margin-left: 0;
    grid-column: 1 / -1;
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.35rem;
    align-self: stretch;
  }

  .filters-section .filter-actions .btn-secondary,
  .filters-section .filter-actions .btn-secondary-outline {
    width: 100%;
    min-height: 30px;
    height: 30px;
    padding: 0.2rem 0.45rem;
    justify-content: center;
    font-size: 0.72rem;
    border-radius: 7px;
    line-height: 1.1;
  }

  .section-header {
    flex-direction: row;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.4rem 0.5rem;
    margin-bottom: 0.55rem;
  }

  .section-header h2 {
    font-size: 0.92rem;
    line-height: 1.2;
    flex: 1 1 auto;
    min-width: 0;
  }

  .section-header .btn-primary,
  .section-header .btn-secondary {
    width: auto;
    min-height: 30px;
    height: 30px;
    padding: 0.2rem 0.55rem;
    justify-content: center;
    font-size: 0.72rem;
    border-radius: 7px;
    white-space: nowrap;
  }

  .section-header .dp-queue-btn.btn-primary {
    height: auto !important;
    min-height: 32px;
    max-height: none;
    padding: 0.25rem 0.6rem;
    overflow: visible !important;
    gap: 0.35rem;
  }

  .section-header .dp-queue-btn .dp-queue-badge {
    min-width: 1.2rem;
    height: 1.2rem;
    font-size: 0.68rem;
    flex-shrink: 0;
  }

  .view-only-badge {
    font-size: 0.65rem;
    align-self: center;
    padding: 0.15rem 0.4rem;
  }

  .expense-section-title {
    font-size: 0.95rem;
  }

  .section-hint,
  .info-text {
    font-size: 0.78rem;
    line-height: 1.4;
  }

  .pending-expense-alert {
    font-size: 0.8rem;
    padding: 10px 12px;
    border-radius: 10px;
  }

  /* Dual-render: hide tables, show stacked cards */
  .fin-desktop-table,
  .fin-desktop-empty {
    display: none !important;
  }

  .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
    width: 100%;
  }

  .fin-mobile-list .amount-cell {
    font-size: 0.82rem;
    font-family: inherit;
  }

  .fin-mobile-meta-row > span:last-child {
    text-align: right;
    word-break: break-word;
  }

  .table-container {
    overflow-x: visible;
    border: none;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    padding: 0;
  }

  .fin-mobile-card-actions.payment-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .fin-mobile-card-actions.payment-actions .fin-mobile-action,
  .fin-mobile-card-actions.payment-actions .btn-sm {
    width: 100%;
  }

  .btn-sm,
  .btn-primary-small {
    min-height: 40px;
    font-size: 0.78rem !important;
    padding: 0.45rem 0.7rem !important;
  }

  .form-inline {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .form-inline .input,
  .form-inline .btn {
    width: 100%;
    min-height: 40px;
  }

  .action-row {
    flex-direction: column;
    gap: 10px;
  }

  .tab-content .card-header {
    padding: 12px;
    gap: 8px;
  }

  .tab-content .card-title {
    font-size: 0.95rem;
  }

  .filter-section {
    padding: 10px 12px;
  }

  .filter-section .input,
  .filter-section .filter-input {
    width: 100%;
    min-height: 40px;
    font-size: 0.82rem;
  }

  .modal-overlay .modal-content:not(.mf-expense-modal):not(.mf-collection-modal):not(.receipt-modal-box):not(.receipt-modal-content),
  .modal-content.modal-large:not(.mf-expense-modal):not(.mf-collection-modal) {
    width: calc(100% - 1rem) !important;
    max-width: calc(100% - 1rem) !important;
    max-height: 90vh;
    overflow-y: auto;
    margin: 0.5rem;
    border-radius: 14px;
    padding: 14px 12px;
  }

  .modal-overlay .modal-content.dp-verify-modal {
    width: min(22.5rem, calc(100vw - 1.5rem)) !important;
    max-width: min(22.5rem, calc(100vw - 1.5rem)) !important;
    padding: 0;
  }

  .profit-breakdown {
    grid-template-columns: 1fr;
    gap: 8px;
  }

  .usage-leaders-card {
    padding: 10px 12px;
    border-radius: 10px;
    margin-bottom: 12px;
  }
}

@media (max-width: 480px) {
  .summary-cards,
  .summary-cards.stats-grid,
  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 6px;
  }

  .summary-cards > .summary-card .card-amount,
  .summary-card .card-amount {
    font-size: 0.85rem !important;
  }

  .page-header h1,
  .page-title {
    font-size: 1.1rem !important;
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

  .filters-section,
  .tools-card.filters-section {
    gap: 0.3rem 0.35rem;
    padding: 0.35rem 0.4rem;
    margin-bottom: 0.45rem;
  }

  .filters-section .filter-input,
  .filters-section .toolbar-input,
  .filters-section .toolbar-select,
  .filters-section .filter-actions .btn-secondary,
  .filters-section .filter-actions .btn-secondary-outline {
    min-height: 28px;
    height: 28px;
    font-size: 0.68rem;
  }

  .section-header h2 {
    font-size: 0.86rem;
  }

  .section-header .btn-primary,
  .section-header .btn-secondary {
    min-height: 28px;
    height: 28px;
    font-size: 0.68rem;
    padding: 0.15rem 0.45rem;
  }
}

@media print {
  .fin-mobile-list {
    display: none !important;
  }

  .fin-desktop-table,
  .fin-desktop-empty {
    display: block !important;
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

.auto-interest-indicator {
  margin: 0 0 16px;
  padding: 12px 14px;
  border-radius: 10px;
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: rgba(32, 48, 37, 0.72);
  color: #d1fae5;
  font-size: 0.88rem;
  line-height: 1.45;
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
  padding: 0.16rem 0.3rem;
  font-size: 0.55rem;
  border-radius: 5px;
  line-height: 1.1;
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
  font-size: 0.625rem;
  table-layout: fixed;
}

.tab-content .data-table th:not(:last-child),
.tab-content .data-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
}

.tab-content .data-table thead {
  background: rgba(74, 222, 128, 0.08);
}

.tab-content .data-table th {
  padding: 0.28rem 0.32rem;
  text-align: center;
  vertical-align: middle;
  font-weight: 600;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  font-size: 0.58rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.12;
  white-space: normal;
  word-break: break-word;
}

.tab-content .data-table td {
  padding: 0.26rem 0.3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 500;
  font-size: 0.625rem;
  text-align: center;
  vertical-align: middle;
  line-height: 1.25;
  white-space: normal;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.tab-content .data-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.tab-content .data-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.1);
}

.tab-content table.data-table tbody td.amount {
  font-size: 0.625rem;
  font-weight: 600;
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
  border-radius: 12px;
  padding: 12px 14px;
  margin-bottom: 14px;
  box-shadow: 8px 8px 16px rgba(8, 13, 10, 0.35);
}

.usage-leaders-card .section-subheader h3 {
  font-size: 0.9rem;
  margin: 0;
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

.interest-already-applied small {
  color: inherit;
}

.font-semibold {
  font-weight: 800;
  color: var(--text-main);
}

.name {
  font-weight: 500;
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
  :global(body.printing-machinery-report) #printable-report .report-refresh-overlay {
    display: none !important;
  }

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

.financial-container.light-theme .page-header,
.financial-container.light-theme .page-header-split {
  background: #ffffff;
  border-color: #bbf7d0;
}

.financial-container.light-theme .page-header h1,
.financial-container.light-theme .page-title {
  background: none;
  -webkit-background-clip: unset;
  background-clip: unset;
  color: #052e16;
}

.financial-container.light-theme .page-subtitle {
  color: #14532d;
}

.financial-container.light-theme .fin-mobile-card {
  background: #ffffff;
  border-color: #bbf7d0;
}

.financial-container.light-theme .fin-mobile-card-name {
  color: #052e16;
}

.financial-container.light-theme .fin-mobile-label {
  color: #64748b;
}

.financial-container.light-theme .fin-mobile-meta-row {
  color: #14532d;
}

.financial-container.light-theme .fin-mobile-card-actions {
  border-top-color: #dcfce7;
}

.financial-container.light-theme .fin-mobile-empty {
  color: #64748b;
}

.financial-container.light-theme .tabs-container .tab {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #bbf7d0 !important;
}

.financial-container.light-theme .tabs-container .tab:hover:not(.active) {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  border-color: #86efac !important;
}

.financial-container.light-theme .tabs-container .tab.active,
.financial-container.light-theme .tabs-container .tab.active:hover,
.financial-container.light-theme .tabs-container .tab.active:focus,
.financial-container.light-theme .tabs-container .tab.active:focus-visible {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #14532d !important;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.35), 0 4px 14px rgba(22, 101, 52, 0.28) !important;
  filter: none !important;
  transform: none !important;
  transition: none !important;
}

.financial-container.light-theme .tabs-container .tab.active :is(.tab-label, .tab-icon, span:not(.tab-badge)) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.light-theme .tabs-container .tab .tab-badge,
.financial-container.light-theme .tabs-container .tab.active .tab-badge {
  background: #dc2626 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1.5px solid #7f1d1d !important;
}

.financial-container:not(.light-theme) .tabs-container .tab {
  background: linear-gradient(155deg, rgba(28, 48, 38, 0.94), rgba(18, 34, 26, 0.97)) !important;
  color: #bbf7d0 !important;
  -webkit-text-fill-color: #bbf7d0 !important;
  border-color: rgba(134, 239, 172, 0.28) !important;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
}

.financial-container:not(.light-theme) .tabs-container .tab .tab-label {
  color: #bbf7d0 !important;
  -webkit-text-fill-color: #bbf7d0 !important;
}

.financial-container:not(.light-theme) .tabs-container .tab:hover:not(.active) {
  background: linear-gradient(155deg, rgba(36, 68, 52, 0.96), rgba(24, 48, 36, 0.98)) !important;
  color: #ecfdf5 !important;
  -webkit-text-fill-color: #ecfdf5 !important;
  border-color: rgba(74, 222, 128, 0.42) !important;
}

.financial-container:not(.light-theme) .tabs-container .tab.active,
.financial-container:not(.light-theme) .tabs-container .tab.active:hover,
.financial-container:not(.light-theme) .tabs-container .tab.active:focus,
.financial-container:not(.light-theme) .tabs-container .tab.active:focus-visible {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 60%, #166534 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: rgba(167, 243, 208, 0.65) !important;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.45), 0 8px 18px rgba(6, 78, 35, 0.4) !important;
  filter: none !important;
  transform: none !important;
  transition: none !important;
}

.financial-container:not(.light-theme) .tabs-container .tab.active .tab-label,
.financial-container:not(.light-theme) .tabs-container .tab.active :is(.tab-icon, span:not(.tab-badge)) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container:not(.light-theme) .tabs-container .tab .tab-badge,
.financial-container:not(.light-theme) .tabs-container .tab.active .tab-badge {
  background: #dc2626 !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 1.5px solid #7f1d1d !important;
}

.financial-container:not(.light-theme) :is(.report-type-btn, .orient-btn, .btn-action:not(.print), .btn-generate) {
  background: linear-gradient(155deg, rgba(28, 48, 38, 0.94), rgba(18, 34, 26, 0.97)) !important;
  color: #bbf7d0 !important;
  -webkit-text-fill-color: #bbf7d0 !important;
  border-color: rgba(134, 239, 172, 0.28) !important;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
  filter: none !important;
  transition: none !important;
  transform: none !important;
}

.financial-container:not(.light-theme) :is(.report-type-btn, .orient-btn, .btn-action:not(.print), .btn-generate) :is(.btn-text, .btn-icon, span) {
  color: #bbf7d0 !important;
  -webkit-text-fill-color: #bbf7d0 !important;
}

.financial-container:not(.light-theme) :is(.report-type-btn, .orient-btn, .btn-action:not(.print), .btn-generate):hover:not(.active):not(:disabled) {
  background: linear-gradient(155deg, rgba(36, 68, 52, 0.96), rgba(24, 48, 36, 0.98)) !important;
  color: #ecfdf5 !important;
  -webkit-text-fill-color: #ecfdf5 !important;
  border-color: rgba(74, 222, 128, 0.42) !important;
}

.financial-container:not(.light-theme) :is(.report-type-btn.active, .orient-btn.active),
.financial-container:not(.light-theme) :is(.report-type-btn.active, .orient-btn.active):hover,
.financial-container:not(.light-theme) :is(.report-type-btn.active, .orient-btn.active):focus,
.financial-container:not(.light-theme) :is(.report-type-btn.active, .orient-btn.active):focus-visible,
.financial-container:not(.light-theme) :is(.report-type-btn.active, .orient-btn.active):active {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 55%, #166534 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: rgba(167, 243, 208, 0.55) !important;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.45), 0 8px 22px rgba(6, 78, 35, 0.45), inset 0 1px 0 rgba(220, 252, 231, 0.18) !important;
  opacity: 1 !important;
  transition: none !important;
  filter: none !important;
  transform: none !important;
}

.financial-container:not(.light-theme) :is(.report-type-btn.active, .orient-btn.active) :is(.btn-text, .btn-icon, span) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container:not(.light-theme) .tab-content h2 {
  color: #ffffff !important;
}

.financial-container:not(.light-theme) .report-generator-panel,
.financial-container:not(.light-theme) .report-option-card,
.financial-container:not(.light-theme) .actions-card {
  background: linear-gradient(155deg, rgba(24, 49, 38, 0.95) 0%, rgba(17, 34, 28, 0.98) 100%) !important;
  border-color: #94a3b8 !important;
}

.financial-container:not(.light-theme) :is(
  .report-option-card h4, .orientation-label, .checkbox-inline, .checkbox-inline span,
  .filter-checkbox span, .date-input-group label, .filter-label, .report-type-btn .btn-text
) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container:not(.light-theme) .filter-checkbox {
  background: linear-gradient(140deg, rgba(18, 42, 31, 0.95) 0%, rgba(23, 51, 38, 0.98) 100%) !important;
  border-color: #94a3b8 !important;
}

.financial-container:not(.light-theme) .filters-section,
.financial-container:not(.light-theme) .reports-machinery-filter-bar {
  background: rgba(28, 42, 33, 0.92) !important;
  border-color: #94a3b8 !important;
}

.financial-container:not(.light-theme) .filter-input,
.financial-container:not(.light-theme) .form-input-sm {
  background: rgba(20, 48, 38, 0.92) !important;
  color: #ffffff !important;
  border-color: #94a3b8 !important;
}

.financial-container:not(.light-theme) :is(
  .summary-cards > .summary-card .card-amount,
  .summary-container > .summary-card .card-amount,
  .card-amount,
  .income-card .card-amount,
  .expense-card .card-amount,
  .profit-card .card-amount,
  .profit-card.negative .card-amount,
  .ar-card .card-amount,
  .collected-card .card-amount,
  .balance-card .card-amount
) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  text-shadow: none !important;
}

.financial-container.light-theme .denied-content {
  background: #fffef9;
  border-color: #86efac;
}

.financial-container.light-theme .summary-card {
  background: linear-gradient(145deg, #ffffff 0%, #f4fdf7 100%);
  border-color: #86efac;
}

.financial-container.light-theme .summary-card:hover {
  border-color: #4ade80;
}

.financial-container.light-theme .card-label {
  color: #166534;
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
  border-color: #86efac;
}

.financial-container.light-theme .filters-section {
  background: linear-gradient(135deg, #f0fdf4 0%, #ecfdf5 100%);
  border-color: #bbf7d0;
}

.financial-container.light-theme .filter-label {
  color: #14532d;
}

.financial-container.light-theme .filter-input,
.financial-container.light-theme .filter-select-glass,
.financial-container.light-theme .barangay-select {
  background: #ffffff;
  color: #052e16;
  border-color: #cbd5e1;
}

.financial-container.light-theme .filter-input:focus,
.financial-container.light-theme .filter-select-glass:focus {
  border-color: #22c55e;
}

.financial-container.light-theme .table-container {
  background: #ffffff;
  border-color: #bbf7d0;
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) th {
  color: #052e16;
  background: transparent;
  border-bottom-color: #86efac;

}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) td {
  color: #14532d;
  border-bottom-color: #e2e8f0;

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
  border-color: #86efac;
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
  border-color: #86efac;
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

.financial-container.light-theme .distribution-card.per-member-card {
  background: #ffffff;
  border-color: #7dd3fc;
}

.financial-container.light-theme .distribution-card.per-member-card .distribution-icon {
  color: #0369a1;
  background: #f0f9ff;
  border-color: #7dd3fc;
}

.financial-container.light-theme .distribution-card.per-member-card .distribution-content .amount {
  color: #0369a1;
  text-shadow: none;
}

.financial-container.light-theme .btn-secondary,
.financial-container.light-theme .btn-secondary-outline {
  background: #ffffff;
  color: #14532d;
  border-color: #86efac;
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

.financial-container.light-theme .status-badge.full-payment {
  color: #166534;
  background: #dcfce7;
}

.financial-container.light-theme .status-badge.partial-payment {
  color: #92400e;
  background: #fef3c7;
  border: 1px solid #fcd34d;
}

.financial-container.light-theme .status-badge.verified {
  color: #14532d;
  background: #dcfce7;
  border: 1px solid #86efac;
}

.financial-container.light-theme .status-badge.unpaid {
  color: #991b1b;
  background: #fee2e2;
}

.financial-container.light-theme .income-amount-kind,
.financial-container.light-theme .income-dp-amount {
  color: #14532d;
}

.financial-container.light-theme .badge-down-payment,
.financial-container.light-theme .income-table .badge-down-payment {
  background: #bbf7d0;
  color: #14532d;
  border-color: #86efac;
}

.financial-container.light-theme .collections-note,
.financial-container.light-theme .empty-state-hint,
.financial-container.light-theme .ar-tab-desc {
  color: #166534;
}

.financial-container.light-theme .collections-search {
  background: #ffffff;
  border-color: #bbf7d0;
}

.financial-container.light-theme .collections-search-icon {
  color: #166534;
}

.financial-container.light-theme .collections-search-input {
  color: #14532d;
}

.financial-container.light-theme .auto-interest-indicator {
  background: #f0fdf4;
  border-color: #86efac;
  color: #14532d;
}

.financial-container.light-theme .interest-already-applied,
.financial-container.light-theme .interest-already-applied small {
  color: #1d4ed8;
}

.financial-container.light-theme .interest-due-hint {
  color: #166534;
}

.financial-container.light-theme .barangay-context,
.financial-container.light-theme .context-badge {
  color: #14532d;
}

.financial-container.light-theme .report-generator-panel,
.financial-container.light-theme .report-option-card,
.financial-container.light-theme .actions-card {
  background: #fffef9 !important;
  border-color: #86efac !important;
  color: #14532d !important;
}

.financial-container.light-theme .filter-checkbox {
  background: #ffffff !important;
  border-color: #86efac !important;
}

.financial-container.light-theme .filter-checkbox:hover {
  background: #f0fdf4 !important;
  border-color: #22c55e !important;
}

.financial-container.light-theme .filter-checkbox span {
  color: #000000 !important;
  text-shadow: none !important;

}

.financial-container.light-theme .report-option-card h4,
.financial-container.light-theme .orientation-label,
.financial-container.light-theme .checkbox-inline {
  color: #052e16 !important;
}

.financial-container.light-theme .report-type-btn .btn-text {
  color: #052e16 !important;
}

.financial-container.light-theme .orient-btn,
.financial-container.light-theme .btn-action.select-all,
.financial-container.light-theme .btn-action.clear {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #15803d !important;
}

.financial-container.light-theme .report-type-btn.active,
.financial-container.light-theme .orient-btn.active,
.financial-container.light-theme .report-type-btn.active:hover,
.financial-container.light-theme .orient-btn.active:hover,
.financial-container.light-theme .report-type-btn.active:focus,
.financial-container.light-theme .orient-btn.active:focus {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #14532d !important;
  box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.35), 0 4px 12px rgba(22, 101, 52, 0.25) !important;
  opacity: 1 !important;
  transition: none !important;
  filter: none !important;
  transform: none !important;
}

.financial-container.light-theme .report-type-btn.active .btn-text,
.financial-container.light-theme .report-type-btn.active :is(.btn-icon, span),
.financial-container.light-theme .orient-btn.active :is(span, .btn-text) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.light-theme .btn-action.print {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  color: #ffffff !important;
  border-color: #14532d !important;

}

.financial-container.light-theme .btn-action.print:disabled {
  background: #e2e8f0 !important;
  color: #334155 !important;
  border-color: #94a3b8 !important;
}

.financial-container.light-theme .breakdown-card {
  background: #fffef9;
  border-color: #86efac;
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
  border-color: #86efac;
  color: #14532d;
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

}

.financial-container.light-theme :is(.input, .form-input, textarea, select) {
  background: #ffffff;
  color: #052e16;
  border-color: #cbd5e1;
}

.financial-container.light-theme .empty-state-hint {
  color: #3f6212;
}

.financial-container.light-theme .view-only-badge {
  color: #14532d;
  background: #fef9c3;
  border-color: #fbbf24;
}

/* Expense breakdown — force dark readable text (beats nth-child dark rules) */
.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item {
  border-bottom-color: #e2e8f0;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:first-child {

  color: #052e16 !important;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item span:last-child {

  color: #15803d !important;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total {
  border-top-color: #86efac;
}

.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:first-child,
.financial-container.light-theme .profit-breakdown .breakdown-card:nth-child(2) .expense-item.total span:last-child {
  color: #052e16 !important;

}

/* Most Used Machinery card */
.financial-container.light-theme .usage-leaders-card {
  background: linear-gradient(145deg, #ffffff 0%, #f4fdf7 100%);
  border-color: #86efac;
}

.financial-container.light-theme .usage-leaders-card .section-subheader h3 {
  color: #052e16;
}

.financial-container.light-theme .tab-content .data-table thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) th:not(:last-child),
.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) td:not(:last-child) {
  border-right-color: #64748b !important;
}

.financial-container.light-theme :is(.expenses-table, .income-table, .ar-table, .collections-table) th:not(:last-child) {
  border-right-color: #15803d !important;
}

.financial-container.light-theme .tab-content .data-table th:not(:last-child),
.financial-container.light-theme .tab-content .data-table td:not(:last-child) {
  border-right-color: #64748b !important;
}

.financial-container.light-theme .tab-content .data-table th:not(:last-child) {
  border-right-color: #15803d !important;
}

.financial-container.light-theme .usage-leaders-card .data-table th:not(:last-child),
.financial-container.light-theme .usage-leaders-card .data-table td:not(:last-child) {
  border-right-color: #64748b !important;
}

.financial-container.light-theme .usage-leaders-card .data-table th:not(:last-child) {
  border-right-color: #15803d !important;
}

.financial-container.light-theme .tab-content .data-table th {
  color: #052e16;
  border-bottom-color: #86efac;

}

.financial-container.light-theme .tab-content .data-table td {
  color: #14532d;
  border-bottom-color: #e2e8f0;

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
  border-color: #cbd5e1;
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

}

.financial-container.light-theme .expense-item span:last-child {
  color: #15803d !important;

}

.financial-container.light-theme .expense-item.total span:last-child {
  color: #065f46 !important;
}

/* ===== Association Dues — Share Capital aligned tools + detail modal ===== */
.sc-tools-card.tools-card {
  --tools-h: 40px;
  margin: 0;
  padding: 0.75rem 0.85rem;
  border-radius: 0;
  border: none;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.12);
  box-shadow: none;
}

.sc-tools-card .tools-card-top {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  min-width: 0;
}

.sc-tools-card .search-bar {
  position: relative;
  flex: 1;
  min-width: 0;
  height: var(--tools-h);
}

.sc-tools-card .search-icon-wrap {
  position: absolute;
  inset: 0 auto 0 0;
  width: 2.25rem;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(186, 240, 200, 0.55);
  pointer-events: none;
  z-index: 1;
}

.sc-tools-card .search-svg {
  display: block;
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.sc-tools-card .toolbar-input.search-input-main {
  width: 100%;
  height: var(--tools-h);
  min-height: var(--tools-h);
  padding: 0 0.75rem 0 2.25rem;
  border-radius: 10px;
  border: 1px solid rgba(190, 235, 203, 0.22);
  background: rgba(10, 18, 14, 0.55);
  color: var(--text-main);
  font-size: 0.85rem;
  box-sizing: border-box;
}

.sc-tools-card .toolbar-input.search-input-main::placeholder {
  color: var(--text-soft);
  opacity: 0.9;
}

.sc-tools-card .toolbar-input.search-input-main:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 0 2px rgba(74, 222, 128, 0.15);
}

.btn-primary-action {
  padding: 12px 22px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(96, 165, 250, 0.18));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.3);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-primary-action:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.34), rgba(96, 165, 250, 0.28));
  border-color: var(--green);
  transform: translateY(-2px);
}

.payment-form-grid {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-end;
  gap: 10px 14px;
}

.dues-collection-panel {
  margin: 0.75rem 0 0.85rem;
}

.dues-form-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.45rem;
}

.dues-form-grid .form-field {
  display: flex;
  flex-direction: column;
  gap: 0.22rem;
  min-width: 0;
}

.dues-form-grid .inline-label {
  margin-bottom: 0;
}

.dues-lifetime-total {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  margin-top: 0.55rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.14);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.dues-lifetime-label {
  font-size: 0.62rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-soft);
  line-height: 1.2;
}

.dues-lifetime-value {
  font-size: 0.95rem;
  font-weight: 800;
  color: #bbf7d0;
  font-family: ui-monospace, 'Courier New', monospace;
  line-height: 1.2;
}

.ad-member-detail-card .card-body {
  padding: 0.85rem 0.95rem 1rem;
  font-family: 'Segoe UI', system-ui, sans-serif;
}

.ad-member-detail-card .form-group {
  margin-bottom: 0.55rem;
}

.ad-member-detail-card .form-group label:not(.inline-label) {
  display: block;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-soft);
  margin-bottom: 0.3rem;
}

.ad-member-detail-card .section-title {
  margin: 0.65rem 0 0.4rem;
  font-size: 0.62rem;
  padding-bottom: 0.35rem;
}

@media (min-width: 769px) {
  .ad-member-detail-card .card-body {
    padding: 1rem 1.15rem 1.1rem;
  }

  .ad-member-detail-card .farmer-summary {
    margin-bottom: 0.75rem;
    padding: 0.65rem 0.85rem;
    border-radius: 10px;
  }

  .ad-member-detail-card .farmer-name {
    font-size: 0.95rem;
    font-weight: 800;
    line-height: 1.25;
    margin-bottom: 0.2rem;
  }

  .ad-member-detail-card .farmer-meta {
    font-size: 0.78rem;
    line-height: 1.35;
  }

  .ad-member-detail-card .stats-grid.compact {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .ad-member-detail-card .stats-grid.compact .stat-card {
    padding: 0.55rem 0.65rem;
    border-radius: 10px;
  }

  .ad-member-detail-card .stats-grid.compact .stat-label {
    font-size: 0.58rem;
    letter-spacing: 0.04em;
    margin-bottom: 0.15rem;
  }

  .ad-member-detail-card .stats-grid.compact .stat-value {
    font-size: 0.95rem;
    line-height: 1.2;
  }

  .ad-member-detail-card .stats-grid.compact .stat-value-sm {
    font-size: 0.72rem;
    font-weight: 700;
    line-height: 1.25;
  }

  .dues-collection-panel {
    margin: 0.55rem 0 0.75rem;
    padding: 0 0.1rem;
  }

  .dues-form-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
    gap: 0.45rem 0.55rem;
    align-items: end;
  }

  .dues-form-grid .input,
  .dues-form-grid select.input {
    min-height: 36px;
    padding: 0.4rem 0.55rem;
    font-size: 0.82rem;
    border-radius: 8px;
  }

  .dues-form-grid .inline-label {
    font-size: 0.62rem;
    letter-spacing: 0.04em;
  }

  .dues-collect-btn {
    min-height: 36px;
    padding: 0.4rem 0.65rem;
    font-size: 0.78rem;
    width: 100%;
    border-radius: 8px;
  }

  .dues-lifetime-total {
    margin-top: 0.55rem;
    padding: 0.5rem 0.65rem;
  }

  .dues-lifetime-value {
    font-size: 1rem;
  }

  .ad-member-detail-card .dues-remarks-group {
    margin-top: 0.55rem;
  }

  .ad-member-detail-card .dues-remarks-input {
    min-height: 52px;
    font-size: 0.82rem;
    margin-top: 0;
  }

  .ad-member-detail-card .auto-receipt-note {
    margin-bottom: 0.5rem;
  }

  .ad-member-detail-card .auto-receipt-note .input {
    min-height: 36px;
    font-size: 0.82rem;
  }

  .ad-member-detail-card .info-text {
    font-size: 0.78rem;
    line-height: 1.4;
    margin-bottom: 0.45rem;
  }

  .ad-member-detail-card .table-container {
    padding: 0.45rem 0.55rem 0.65rem !important;
  }
}

.financial-container.light-theme .dues-lifetime-total {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.financial-container.light-theme .dues-lifetime-label {
  color: #166534;
}

.financial-container.light-theme .dues-lifetime-value {
  color: #052e16;
}

.dues-history-mobile {
  display: none;
}

.dues-history-desktop {
  display: block;
  width: 100%;
  overflow-x: auto;
}

.ad-detail-portal:not(.app-modal-overlay),
.ad-detail-panel:not(.modal-content) {
  display: contents;
}

.sc-detail-overlay.app-modal-overlay {
  z-index: 11050;
}

.sc-detail-modal.modal-content {
  display: flex;
  flex-direction: column;
  width: min(560px, calc(100vw - 2rem));
  max-width: min(560px, calc(100vw - 2rem));
  max-height: min(88dvh, calc(100vh - 2rem));
  background: var(--glass-panel);
  border: 1px solid var(--glass-line-strong);
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
  color: var(--text-main);
}

.sc-detail-close {
  background: none;
  border: none;
  color: var(--text-main);
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

.sc-detail-modal .data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.62rem;
  table-layout: fixed;
}

.sc-detail-modal .data-table thead {
  background: rgba(74, 222, 128, 0.08);
}

.sc-detail-modal .data-table th {
  padding: 0.28rem 0.32rem;
  text-align: left;
  font-weight: 600;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  font-size: 0.55rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.12;
}

.sc-detail-modal .data-table td {
  padding: 0.26rem 0.3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 500;
  font-size: 0.6rem;
  line-height: 1.15;
}

.sc-detail-modal .data-table th:not(:last-child),
.sc-detail-modal .data-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
}

.sc-detail-modal .data-table td.amount {
  color: #b7f7c8;
  font-weight: 600;
  font-family: ui-monospace, 'Courier New', monospace;
}

.sc-detail-overlay.light-theme {
  --glass-panel: #ffffff;
  --glass-line: rgba(34, 197, 94, 0.28);
  --glass-line-strong: rgba(22, 101, 52, 0.35);
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --green: #15803d;
}

.sc-detail-overlay.light-theme .sc-detail-modal.modal-content {
  background: #ffffff;
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

.sc-detail-overlay.light-theme .farmer-meta {
  color: #166534;
}

.sc-detail-overlay.light-theme .stat-card {
  background: #ffffff;
  border-color: #86efac;
}

.sc-detail-overlay.light-theme .stat-label {
  color: #166534;
}

.sc-detail-overlay.light-theme .stat-value {
  color: #052e16;
}

.sc-detail-overlay.light-theme .section-title {
  color: #15803d;
  border-bottom-color: #bbf7d0;
}

.sc-detail-overlay.light-theme .inline-label {
  color: #166534;
}

.sc-detail-overlay.light-theme .badge-paid {
  background: #dcfce7 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
  -webkit-text-fill-color: #15803d !important;
}

.sc-detail-overlay.light-theme .badge-unpaid {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #fca5a5 !important;
  -webkit-text-fill-color: #991b1b !important;
}

.sc-detail-overlay.light-theme .input {
  background: #ffffff;
  color: #000000;
  border-color: #94a3b8;
}

.sc-detail-overlay.light-theme .data-table thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
}

.sc-detail-overlay.light-theme .data-table th {
  color: #000000;
  border-bottom-color: #86efac;
}

.sc-detail-overlay.light-theme .data-table td {
  color: #000000;
  border-bottom-color: #e2e8f0;
}

.sc-detail-overlay.light-theme .data-table td.amount {
  color: #15803d;
}

.sc-detail-overlay.light-theme .fin-mobile-card {
  background: #ffffff;
  border-color: #bbf7d0;
}

.sc-detail-overlay.light-theme .fin-mobile-card-name,
.sc-detail-overlay.light-theme .fin-mobile-meta-row {
  color: #052e16;
}

.sc-detail-overlay.light-theme .fin-mobile-label {
  color: #166534;
}

.sc-detail-overlay.light-theme .fin-mobile-card-actions {
  border-top-color: #bbf7d0;
}

.financial-container.light-theme .sc-tools-card.tools-card {
  background: #f0fdf4;
  border-bottom-color: #bbf7d0;
}

.financial-container.light-theme .sc-tools-card .search-icon-wrap {
  color: #166534;
}

.financial-container.light-theme .sc-tools-card .toolbar-input.search-input-main {
  background: #ffffff;
  color: #052e16;
  border-color: #94a3b8;
}

.financial-container.light-theme .sc-tools-card .toolbar-input.search-input-main::placeholder {
  color: #64748b;
}

.financial-container.light-theme .btn-primary-action {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%);
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border-color: #14532d;
}

/* Association Dues — light surfaces (match Share Capital) */
.financial-container.light-theme.association-dues-view :is(
  .stats-grid .stat-card,
  .tab-content .card,
  .ad-member-detail-card
) {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.05) !important;
}

.financial-container.light-theme .stats-grid .stat-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 18px rgba(22, 101, 52, 0.08) !important;
}

.financial-container.light-theme .stats-grid .stat-label {
  color: #166534 !important;
}

.financial-container.light-theme .stats-grid .stat-value {
  color: #052e16 !important;
}

.financial-container.light-theme .tab-content .card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

.financial-container.light-theme .tab-content .card-header {
  background: #f0fdf4 !important;
  border-bottom-color: #bbf7d0 !important;
}

.financial-container.light-theme .tab-content .card-title {
  color: #052e16 !important;
}

.financial-container.light-theme .farmer-summary {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
}

.financial-container.light-theme .farmer-name {
  color: #052e16 !important;
}

.financial-container.light-theme .farmer-meta {
  color: #166534 !important;
}

.financial-container.light-theme .section-title {
  color: #15803d !important;
  border-bottom-color: #bbf7d0 !important;
}

.financial-container.light-theme .table-container {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: none !important;
}

.financial-container.light-theme .fin-mobile-card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

.financial-container.light-theme .fin-mobile-card.selected {
  background: #f0fdf4 !important;
  border-color: #16a34a !important;
}

.financial-container.light-theme .fin-mobile-card-name {
  color: #052e16 !important;
}

.financial-container.light-theme .fin-mobile-meta-row {
  color: #14532d !important;
}

.financial-container.light-theme .fin-mobile-label {
  color: #64748b !important;
}

.financial-container.light-theme .badge-paid {
  background: #dcfce7 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
  -webkit-text-fill-color: #15803d !important;
}

.financial-container.light-theme .badge-unpaid {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #fca5a5 !important;
  -webkit-text-fill-color: #991b1b !important;
}

@media (max-width: 768px) {
  .association-dues-view.financial-container {
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0.65rem 0.9rem !important;
    box-sizing: border-box;
  }

  .association-dues-view .tab-content {
    padding: 0.8rem 0.9rem !important;
  }

  .ad-member-detail-card {
    display: none;
  }

  .dues-history-desktop {
    display: none !important;
  }

  .dues-history-mobile {
    display: flex !important;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .association-dues-view .tab-content .card-header {
    flex-wrap: nowrap !important;
    align-items: center !important;
    gap: 0.55rem !important;
    padding: 0.75rem 1rem !important;
  }

  .association-dues-view .tab-content .card-title {
    font-size: 0.88rem;
    flex: 1 1 auto;
    min-width: 0;
    line-height: 1.25;
  }

  .association-dues-view .tab-content .card-header .btn-primary-action {
    flex-shrink: 0;
    align-self: center;
    margin-left: 0;
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
    border-radius: 9px;
    min-height: 34px;
  }

  .association-dues-view .sc-tools-card.tools-card {
    --tools-h: 36px;
    padding: 0.55rem 0.75rem;
  }

  .association-dues-view .sc-tools-card .search-icon-wrap {
    width: 2.1rem;
  }

  .association-dues-view .sc-tools-card .search-svg {
    width: 0.95rem;
    height: 0.95rem;
  }

  .association-dues-view .sc-tools-card .toolbar-input.search-input-main {
    font-size: 0.8rem;
    padding-left: 2.1rem;
    border-radius: 9px;
  }

  .association-dues-view .table-container {
    padding: 0.55rem 0.85rem 0.75rem !important;
  }

  .association-dues-view .stats-grid:not(.compact),
  .sc-detail-modal .stats-grid:not(.compact) {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
  }

  .association-dues-view .stats-grid.compact,
  .sc-detail-modal .stats-grid.compact {
    grid-template-columns: 1fr 1fr !important;
    gap: 0.45rem;
    margin: 0.5rem 0 0.6rem;
  }

  .association-dues-view .stats-grid.compact > .stat-card:last-child:nth-child(odd),
  .sc-detail-modal .stats-grid.compact > .stat-card:last-child:nth-child(odd) {
    grid-column: auto;
  }

  .association-dues-view .stats-grid:not(.compact) > .stat-card:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .association-dues-view .stats-grid.compact .stat-card,
  .sc-detail-modal .stats-grid.compact .stat-card {
    padding: 0.55rem 0.65rem;
    border-radius: 10px;
  }

  .association-dues-view .stats-grid.compact .stat-label,
  .sc-detail-modal .stats-grid.compact .stat-label {
    font-size: 0.56rem;
    margin-bottom: 0.15rem;
  }

  .association-dues-view .stats-grid.compact .stat-value,
  .sc-detail-modal .stats-grid.compact .stat-value {
    font-size: 0.92rem;
    line-height: 1.15;
  }

  .association-dues-view .stats-grid.compact .stat-value-sm,
  .sc-detail-modal .stats-grid.compact .stat-value-sm {
    font-size: 0.72rem;
    line-height: 1.25;
  }

  .dues-collection-panel {
    margin: 0.5rem 0 0.65rem;
  }

  .dues-form-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0.4rem 0.45rem;
    align-items: end;
  }

  .dues-form-grid .input,
  .dues-form-grid select.input,
  .dues-collect-btn {
    width: 100%;
    min-height: 40px;
    font-size: 0.82rem;
  }

  .payment-form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.4rem;
    width: 100%;
  }

  .payment-form-grid .input,
  .payment-form-grid .btn {
    width: 100%;
    min-height: 40px;
  }

  .sc-detail-modal.modal-content {
    width: calc(100vw - 1.2rem);
    max-width: calc(100vw - 1.2rem);
    max-height: calc(100dvh - 1.2rem);
  }

  .sc-detail-modal .dues-collection-panel {
    margin: 0.45rem 0 0.6rem;
  }

  .sc-detail-modal .dues-lifetime-total {
    margin-top: 0.45rem;
    padding: 0.5rem 0.6rem;
  }

  .sc-detail-modal .dues-lifetime-value {
    font-size: 0.88rem;
  }
}

@media (max-width: 480px) {
  .association-dues-view .tab-content .card-header {
    padding: 0.7rem 0.85rem !important;
  }

  .association-dues-view .table-container {
    padding: 0.5rem 0.7rem 0.7rem !important;
  }
}
</style>

<style>
/* Kill sticky touch :hover / :focus masking selected buttons on this page */
.financial-container :is(.tab.active, .report-type-btn.active, .orient-btn.active),
.financial-container :is(.tab.active, .report-type-btn.active, .orient-btn.active):hover,
.financial-container :is(.tab.active, .report-type-btn.active, .orient-btn.active):focus,
.financial-container :is(.tab.active, .report-type-btn.active, .orient-btn.active):focus-visible,
.financial-container :is(.tab.active, .report-type-btn.active, .orient-btn.active):active {
  -webkit-tap-highlight-color: transparent;
}

/* Report mobile layout — unscoped so child components (MachineryReportSheet, ReportMobileCards) are covered */
#printable-report {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

#printable-report .collectibles-form-sheet,
#printable-report .collectibles-table-wrap,
#printable-report .fcr-responsive-wrap,
#printable-report .fcr-mobile-list,
#printable-report .fcr-mobile-card,
#printable-report .fcr-mobile-totals {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

#printable-report .fcr-mobile-card,
#printable-report .fcr-mobile-totals {
  border: 1px solid #1e293b;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

#printable-report .fcr-mobile-card {
  margin-bottom: 12px;
}

#printable-report .fcr-mobile-totals {
  margin-top: 4px;
}

#printable-report .fcr-mobile-totals-title {
  margin: 0;
  padding: 10px 12px;
  font-size: 0.82rem;
  font-weight: 800;
  text-align: center;
  background: #f1f5f9;
  border-bottom: 2px solid #0f172a;
  color: #0f172a;
}

#printable-report .fcr-mobile-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}

#printable-report .fcr-mobile-row:last-child {
  border-bottom: none;
}

#printable-report .fcr-mobile-label {
  flex: 0 0 46%;
  max-width: 46%;
  font-size: 0.72rem;
  font-weight: 800;
  color: #475569;
  line-height: 1.4;
  text-align: left;
}

#printable-report .fcr-mobile-value {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f172a;
  text-align: right;
  line-height: 1.4;
  word-break: break-word;
}

@media (max-width: 1100px) {
  #printable-report .fcr-desktop-table {
    display: none !important;
  }

  #printable-report .fcr-mobile-list {
    display: block !important;
    width: 100% !important;
    max-width: 100% !important;
  }

  #printable-report .collectibles-table-wrap,
  #printable-report .fcr-responsive-wrap {
    overflow: visible;
    width: 100%;
  }

  #printable-report .collectibles-meta-split {
    grid-template-columns: 1fr !important;
    gap: 6px !important;
  }

  #printable-report .collectibles-meta-col {
    gap: 4px !important;
  }

  #printable-report .collectibles-meta-col-left {
    padding-right: 0 !important;
    border-right: none !important;
    padding-bottom: 6px !important;
    border-bottom: 1px solid #cbd5e1 !important;
  }

  #printable-report .collectibles-meta-col-right {
    padding-left: 0 !important;
  }
}

/* Mobile screen preview only — compact A4-like density (print CSS unchanged) */
@media screen and (max-width: 768px) {
  #printable-report.report-display {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 !important;
    padding: 8px 6px !important;
    border-radius: 10px !important;
    overflow-x: hidden !important;
    transform: none !important;
  }

  /* Header — compact centered block */
  #printable-report .report-header {
    flex-direction: column !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    padding: 8px 10px !important;
    margin-bottom: 10px !important;
    border-radius: 8px !important;
    text-align: center !important;
  }

  #printable-report .report-header .report-logo,
  #printable-report .report-header .report-meta {
    width: 100% !important;
    text-align: center !important;
    justify-content: center !important;
    align-items: center !important;
  }

  #printable-report .report-header .report-logo {
    flex-direction: column !important;
    gap: 4px !important;
  }

  #printable-report .report-logo-image {
    width: 32px !important;
    height: 32px !important;
    padding: 2px !important;
    border-width: 1px !important;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.18) !important;
  }

  #printable-report .logo-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 1px;
  }

  #printable-report .report-cfa-line {
    margin: 0 !important;
    font-size: 0.62rem !important;
    line-height: 1.25 !important;
    overflow-wrap: anywhere;
  }

  #printable-report .report-doc-title {
    margin: 0 !important;
    font-size: 0.82rem !important;
    line-height: 1.2 !important;
    letter-spacing: 0.01em !important;
  }

  #printable-report .report-meta h3 {
    margin: 0 !important;
    font-size: 0.78rem !important;
    line-height: 1.2 !important;
  }

  #printable-report .report-period-long {
    margin: 2px 0 0 !important;
    font-size: 0.62rem !important;
    line-height: 1.25 !important;
    overflow-wrap: anywhere;
  }

  #printable-report .report-generated {
    margin: 2px 0 0 !important;
    font-size: 0.58rem !important;
    line-height: 1.25 !important;
    opacity: 0.9 !important;
  }

  /* Information / meta block — tight rows (title, CFA info, contact fields) */
  #printable-report .collectibles-meta-box,
  #printable-report .collectibles-meta-box-compact {
    padding: 4px 6px !important;
    margin-bottom: 6px !important;
    border-radius: 6px !important;
  }

  #printable-report .collectibles-meta-split {
    gap: 4px !important;
  }

  #printable-report .collectibles-meta-col {
    gap: 3px !important;
  }

  #printable-report .collectibles-meta-col-left {
    padding-bottom: 4px !important;
    margin-bottom: 0 !important;
  }

  #printable-report .collectibles-meta-col-right {
    padding-top: 0 !important;
    gap: 3px !important;
  }

  #printable-report .collectibles-meta-field-block {
    gap: 0 !important;
    margin: 0 !important;
  }

  #printable-report .collectibles-meta-label-sm,
  #printable-report .collectibles-meta-label {
    font-size: 0.55rem !important;
    line-height: 1.15 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow-wrap: anywhere;
    word-break: break-word;
  }

  #printable-report .collectibles-meta-fill,
  #printable-report .collectibles-meta-value {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 14px !important;
    font-size: 0.62rem !important;
    line-height: 1.15 !important;
    padding: 0 2px 1px !important;
    margin: 0 !important;
  }

  /* Visible compact textboxes for Contact Person / Cropping / Address / Phone */
  #printable-report .sheet-fill-line {
    min-height: 28px !important;
    height: auto !important;
    padding: 0 !important;
    margin: 2px 0 0 !important;
    border: 1px solid #94a3b8 !important;
    border-bottom: 1px solid #94a3b8 !important;
    border-radius: 6px !important;
    background: #ffffff !important;
    align-items: center !important;
    box-shadow: inset 0 1px 2px rgba(15, 23, 42, 0.04) !important;
  }

  #printable-report .sheet-fill-line:focus-within {
    border-color: #16a34a !important;
    box-shadow: 0 0 0 2px rgba(22, 163, 74, 0.2) !important;
  }

  #printable-report .sheet-fill-input,
  #printable-report input.sheet-fill-input {
    width: 100% !important;
    max-width: 100% !important;
    min-height: 26px !important;
    height: 26px !important;
    font-size: 0.68rem !important;
    line-height: 1.2 !important;
    padding: 4px 8px !important;
    margin: 0 !important;
    border: 0 !important;
    border-radius: 6px !important;
    background: transparent !important;
    box-shadow: none !important;
    color: #0f172a !important;
    -webkit-text-fill-color: #0f172a !important;
  }

  #printable-report .sheet-fill-input::placeholder {
    color: #94a3b8 !important;
    opacity: 1 !important;
  }

  #printable-report .collectibles-meta-col-right .sheet-fill-line {
    margin-top: 2px !important;
  }

  #printable-report .collectibles-form-title-block {
    margin-bottom: 4px !important;
    text-align: center !important;
  }

  #printable-report .collectibles-main-title {
    margin: 0 !important;
    font-size: 0.78rem !important;
    line-height: 1.15 !important;
  }

  #printable-report .collectibles-main-subtitle {
    margin: 1px 0 0 !important;
    font-size: 0.62rem !important;
    line-height: 1.15 !important;
  }

  #printable-report .collectibles-form-sheet {
    width: 100% !important;
    margin: 6px 0 8px !important;
    padding: 6px 6px 8px !important;
    border-radius: 8px !important;
    border-width: 1px !important;
    box-shadow: 0 2px 8px rgba(15, 23, 42, 0.05) !important;
  }

  /* Summary cards inside report */
  #printable-report .report-summary-grid {
    gap: 6px !important;
    margin: 0 0 8px !important;
  }

  #printable-report .report-summary-grid > .summary-card {
    padding: 6px 8px !important;
    min-height: 0 !important;
    border-radius: 8px !important;
  }

  #printable-report .report-summary-grid > .summary-card .summary-label,
  #printable-report .report-summary-grid > .summary-card .card-label {
    font-size: 0.58rem !important;
    margin-bottom: 1px !important;
    line-height: 1.15 !important;
  }

  #printable-report .report-summary-grid > .summary-card .summary-value,
  #printable-report .report-summary-grid > .summary-card .card-amount {
    font-size: 0.85rem !important;
    line-height: 1.15 !important;
  }

  #printable-report .report-summary-grid > .summary-card .summary-count {
    font-size: 0.55rem !important;
    line-height: 1.15 !important;
  }

  /* Mobile record cards */
  #printable-report .fcr-mobile-list,
  #printable-report .fcr-mobile-card,
  #printable-report .fcr-mobile-totals {
    width: 100% !important;
    max-width: 100% !important;
  }

  #printable-report .fcr-mobile-card {
    margin-bottom: 6px !important;
    border-radius: 6px !important;
  }

  #printable-report .fcr-mobile-totals {
    margin-top: 2px !important;
    border-radius: 6px !important;
  }

  #printable-report .fcr-mobile-totals-title {
    padding: 5px 8px !important;
    font-size: 0.68rem !important;
    line-height: 1.2 !important;
  }

  #printable-report .fcr-mobile-row {
    gap: 6px !important;
    padding: 4px 8px !important;
  }

  #printable-report .fcr-mobile-label {
    flex: 0 0 42% !important;
    max-width: 42% !important;
    font-size: 0.58rem !important;
    line-height: 1.2 !important;
    overflow-wrap: anywhere;
  }

  #printable-report .fcr-mobile-value {
    font-size: 0.66rem !important;
    line-height: 1.2 !important;
  }

  #printable-report .fcr-mobile-empty {
    padding: 8px !important;
    font-size: 0.68rem !important;
  }

  /* Plain / table sections still shown in preview */
  #printable-report .report-plain-section {
    margin: 8px 0 !important;
  }

  #printable-report .report-plain-section .section-title {
    margin-bottom: 4px !important;
  }

  #printable-report .report-plain-table th,
  #printable-report .report-plain-table td,
  #printable-report .collectibles-data-table th,
  #printable-report .collectibles-data-table td {
    font-size: 0.62rem !important;
    padding: 3px 4px !important;
    line-height: 1.2 !important;
  }

  /* Footer */
  #printable-report .report-footer {
    margin-top: 8px !important;
    padding: 6px 2px 2px !important;
    font-size: 0.58rem !important;
    line-height: 1.25 !important;
  }

  #printable-report .report-footer p {
    margin: 0 0 2px !important;
  }

  #printable-report .report-footer .footer-date {
    margin: 0 !important;
    font-size: 0.55rem !important;
  }
}

@media screen and (max-width: 480px) {
  #printable-report.report-display {
    padding: 6px 4px !important;
  }

  #printable-report .report-logo-image {
    width: 28px !important;
    height: 28px !important;
  }

  #printable-report .report-doc-title {
    font-size: 0.76rem !important;
  }

  #printable-report .collectibles-main-title {
    font-size: 0.76rem !important;
  }

  #printable-report .fcr-mobile-label {
    flex: 0 0 40% !important;
    max-width: 40% !important;
    font-size: 0.55rem !important;
  }

  #printable-report .fcr-mobile-value {
    font-size: 0.62rem !important;
  }
}

@media print {
  #printable-report .fcr-mobile-list {
    display: none !important;
  }

  #printable-report .fcr-desktop-table {
    display: block !important;
  }
}

.mf-record-dp-overlay.app-modal-overlay {
  z-index: 12100 !important;
  opacity: 1 !important;
  visibility: visible !important;
  display: flex !important;
  pointer-events: auto !important;
  position: fixed !important;
  inset: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 12px !important;
}

.mf-record-dp-overlay .mf-record-dp-modal.modal-content {
  width: min(380px, calc(100vw - 24px));
  max-width: 380px;
  margin: 0 auto;
  border-radius: 12px;
  overflow: hidden;
  box-sizing: border-box;
}

.mf-record-dp-overlay .mf-record-dp-modal .modal-header {
  padding: 10px 12px;
  gap: 8px;
}

.mf-record-dp-overlay .mf-record-dp-modal .modal-header h2 {
  font-size: 0.95rem;
  margin: 0;
  line-height: 1.25;
}

.mf-record-dp-overlay .mf-record-dp-modal .btn-close {
  width: 28px;
  height: 28px;
  font-size: 1.1rem;
  line-height: 1;
}

.mf-record-dp-overlay .mf-record-dp-modal .modal-body {
  padding: 10px 12px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.mf-record-dp-overlay .mf-record-dp-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 4px 8px;
  margin: 0;
  font-size: 0.78rem;
  line-height: 1.35;
  color: var(--text-soft, #6b7280);
}

.mf-record-dp-overlay .mf-record-dp-meta strong {
  color: var(--text-main, #111827);
  font-size: 0.85rem;
  width: 100%;
}

.mf-record-dp-overlay .mf-record-dp-modal .form-group {
  margin: 0;
  gap: 4px;
  display: flex;
  flex-direction: column;
}

.mf-record-dp-overlay .mf-record-dp-modal .form-group label {
  font-size: 0.72rem;
  font-weight: 600;
  margin: 0;
}

.mf-record-dp-overlay .mf-record-dp-modal .filter-input {
  min-height: 34px;
  height: 34px;
  padding: 6px 10px;
  font-size: 0.85rem;
  border-radius: 8px;
}

.mf-record-dp-overlay .mf-record-dp-modal .filter-input:disabled {
  opacity: 0.9;
  cursor: default;
}

.mf-record-dp-overlay .mf-record-dp-modal .info-text {
  font-size: 0.68rem;
  margin: 0;
  line-height: 1.3;
}

.mf-record-dp-overlay .mf-record-dp-modal .modal-actions {
  margin-top: 4px;
  padding-top: 0;
  display: flex;
  justify-content: stretch;
  gap: 0;
}

.mf-record-dp-overlay .mf-record-dp-modal .modal-actions .btn-primary {
  width: 100%;
  min-height: 36px;
  height: 36px;
  padding: 0 12px;
  font-size: 0.82rem;
  border-radius: 8px;
}

.mf-record-dp-overlay.light-theme {
  background: rgba(15, 23, 42, 0.45);
}

.mf-record-dp-overlay.light-theme .mf-record-dp-modal.modal-content {
  background: #ffffff;
  border: 1px solid #e5e7eb;
  box-shadow: 0 16px 40px rgba(15, 23, 42, 0.18);
}

.mf-record-dp-overlay.light-theme .mf-record-dp-modal .modal-header {
  border-bottom: 1px solid #eef2f0;
}

.mf-record-dp-overlay.light-theme .mf-record-dp-modal .modal-header h2 {
  color: #14532d;
}

.mf-record-dp-overlay.light-theme .mf-record-dp-meta strong {
  color: #111827;
}

.mf-record-dp-overlay.light-theme .mf-record-dp-modal .form-group label {
  color: #374151;
}

.mf-record-dp-overlay.light-theme .mf-record-dp-modal .filter-input {
  background: #f9fafb;
  border: 1px solid #d1d5db;
  color: #111827;
}

.mf-record-dp-overlay.light-theme .mf-record-dp-modal .filter-input:disabled {
  background: #f3f4f6;
  color: #111827;
}

.mf-collection-overlay.app-modal-overlay {
  z-index: 12050 !important;
  opacity: 1 !important;
  visibility: visible !important;
  display: flex !important;
  pointer-events: auto !important;
  position: fixed !important;
  inset: 0 !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 1rem 1.15rem !important;
}

.mf-collection-overlay .mf-collection-modal.modal-content,
.mf-collection-overlay.app-modal-overlay .modal-content.pay-checkout-shell {
  width: min(26.5rem, calc(100vw - 2.25rem)) !important;
  max-width: min(26.5rem, calc(100vw - 2.25rem)) !important;
  max-height: min(92dvh, calc(100dvh - 2rem)) !important;
  margin: auto !important;
  padding: 1.35rem 1.5rem 1.25rem !important;
  overflow: auto !important;
  background: #102018;
  border: 1px solid rgba(74, 222, 128, 0.28);
  color: #ecfdf5;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
  border-radius: 18px;
  box-sizing: border-box !important;
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

.mf-collection-overlay .mf-collection-modal .modal-header {
  padding: 0.65rem 0.85rem;
  border-bottom: 1px solid rgba(74, 222, 128, 0.18);
  background: rgba(0, 0, 0, 0.22);
}

.mf-collection-overlay .mf-collection-modal .modal-header h2 {
  font-size: 0.98rem;
  color: #ecfdf5;
}

.mf-collection-overlay .mf-collection-modal .btn-close {
  color: #bbf7d0;
}

.mf-collection-overlay .mf-collection-modal .modal-body {
  padding: 0.65rem 0.85rem 0.8rem;
}

.mf-collection-overlay .mf-collection-modal .form-group {
  margin-bottom: 0;
}

.mf-collection-overlay .mf-collection-modal .form-group label,
.mf-collection-overlay .mf-collection-modal .payment-type-group legend {
  margin-bottom: 0.25rem;
  font-size: 0.66rem;
  letter-spacing: 0.03em;
  color: #d1fae5;
}

.mf-collection-overlay .mf-collection-modal .form-input,
.mf-collection-overlay .mf-collection-modal textarea.form-input {
  min-height: 34px;
  padding: 0.35rem 0.55rem;
  font-size: 0.82rem;
  background: rgba(8, 20, 14, 0.88);
  color: #ecfdf5;
  border-color: rgba(74, 222, 128, 0.28);
}

.mf-collection-overlay .mf-collection-modal textarea.collection-remarks {
  min-height: 52px;
  resize: vertical;
}

.collection-context-panel {
  margin-bottom: 0.55rem;
  padding: 0.55rem 0.65rem;
  border-radius: 10px;
  background: rgba(15, 35, 24, 0.72);
  border: 1px solid rgba(74, 222, 128, 0.28);
  color: #ecfdf5;
}

.collection-context-panel h3 {
  margin: 0 0 0.4rem;
  font-size: 0.78rem;
  color: #ecfdf5;
}

.collection-context-panel .context-grid strong,
.collection-context-panel .ctx-label {
  color: inherit;
}

.collection-context-panel .ctx-label {
  color: #86efac;
}

.overdue-inline {
  margin-left: 0.35rem;
  color: #fca5a5;
  font-size: 0.72rem;
  font-weight: 800;
}

.collection-meta-grid {
  display: grid;
  grid-template-columns: 1.2fr 1fr 0.9fr;
  gap: 0.45rem 0.55rem;
  margin-bottom: 0.45rem;
}

.mf-collection-overlay .payment-type-group {
  margin-bottom: 0.45rem;
  padding: 0.45rem 0.55rem;
  border: 1px solid rgba(74, 222, 128, 0.2);
  background: rgba(0, 0, 0, 0.18);
  border-radius: 10px;
}

.mf-collection-overlay .radio-group-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.35rem;
}

.mf-collection-overlay .radio-label {
  gap: 0.4rem;
  padding: 0.35rem 0.45rem;
  margin: 0;
  color: #ecfdf5;
  background: rgba(8, 20, 14, 0.55);
  border: 1px solid rgba(74, 222, 128, 0.18);
}

.mf-collection-overlay .radio-label span {
  font-size: 0.78rem;
  font-weight: 700;
}

.mf-collection-overlay .radio-label small {
  display: none;
}

.collection-ok-hint {
  color: #86efac !important;
  font-weight: 600;
  font-size: 0.68rem;
}

.collection-interest-note,
.mf-collection-overlay .auto-receipt-inline {
  margin: 0 0 0.45rem;
  font-size: 0.7rem;
  line-height: 1.35;
  color: #bbf7d0;
}

.collection-summary-panel {
  margin: 0.35rem 0 0.45rem;
  padding: 0.5rem 0.6rem;
  border-radius: 10px;
  background: rgba(8, 20, 14, 0.72);
  border: 1px solid rgba(74, 222, 128, 0.22);
}

.collection-summary-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.22rem 0;
  font-size: 0.78rem;
  color: #d1fae5;
}

.collection-summary-row strong {
  color: #ecfdf5;
  font-weight: 800;
}

.collection-summary-row.total {
  margin-top: 0.15rem;
  padding-top: 0.35rem;
  border-top: 1px solid rgba(74, 222, 128, 0.22);
  color: #86efac;
}

.collection-summary-row.total strong {
  color: #86efac;
}

.mf-collection-overlay .mf-collection-modal .modal-actions {
  margin-top: 0.45rem;
  padding-top: 0.45rem;
  border-top: 1px solid rgba(74, 222, 128, 0.18);
  justify-content: stretch;
}

.mf-collection-overlay .mf-collection-modal .modal-actions .btn-success {
  width: 100%;
  min-height: 38px;
}

.mf-collection-overlay.light-theme {
  --text-main: #052e16;
  --text-soft: #166534;
  --green: #15803d;
}

.mf-collection-overlay.light-theme .mf-collection-modal.modal-content {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}

.mf-collection-overlay.light-theme .pay-checkout-hint {
  background: #fffbeb;
  border-color: #fde68a;
  color: #92400e;
}

.mf-collection-overlay.light-theme .mf-collection-modal .modal-header {
  background: #f0fdf4;
  border-bottom-color: #bbf7d0;
}

.mf-collection-overlay.light-theme .mf-collection-modal .modal-header h2 {
  color: #052e16;
}

.mf-collection-overlay.light-theme .mf-collection-modal .btn-close {
  color: #14532d;
}

.mf-collection-overlay.light-theme .mf-collection-modal .form-group label,
.mf-collection-overlay.light-theme .mf-collection-modal .payment-type-group legend {
  color: #14532d;
}

.mf-collection-overlay.light-theme .mf-collection-modal .form-input,
.mf-collection-overlay.light-theme .mf-collection-modal textarea.form-input {
  background: #ffffff;
  color: #052e16;
  border-color: #cbd5e1;
}

.mf-collection-overlay.light-theme .collection-context-panel {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #052e16;
}

.mf-collection-overlay.light-theme .collection-context-panel h3,
.mf-collection-overlay.light-theme .collection-context-panel .context-grid strong {
  color: #052e16;
}

.mf-collection-overlay.light-theme .collection-context-panel .ctx-label {
  color: #166534;
}

.mf-collection-overlay.light-theme .payment-type-group {
  background: #f8fafc;
  border-color: #bbf7d0;
}

.mf-collection-overlay.light-theme .radio-label {
  background: #ffffff;
  border-color: #bbf7d0;
  color: #052e16;
}

.mf-collection-overlay.light-theme .collection-ok-hint {
  color: #15803d !important;
}

.mf-collection-overlay.light-theme .collection-interest-note,
.mf-collection-overlay.light-theme .auto-receipt-inline {
  color: #166534;
}

.mf-collection-overlay.light-theme .collection-summary-panel {
  background: #f0fdf4;
  border-color: #86efac;
}

.mf-collection-overlay.light-theme .collection-summary-row {
  color: #14532d;
}

.mf-collection-overlay.light-theme .collection-summary-row strong {
  color: #052e16;
}

.mf-collection-overlay.light-theme .collection-summary-row.total,
.mf-collection-overlay.light-theme .collection-summary-row.total strong {
  color: #15803d;
}

.mf-collection-overlay.light-theme .mf-collection-modal .modal-actions {
  border-top-color: #bbf7d0;
  background: #ffffff;
}

@media (max-width: 720px) {
  .collection-meta-grid {
    grid-template-columns: 1fr;
  }

  .mf-collection-overlay .mf-collection-modal.modal-content,
  .mf-collection-overlay.app-modal-overlay .modal-content.pay-checkout-shell {
    width: min(100%, calc(100vw - 2rem)) !important;
    max-width: min(100%, calc(100vw - 2rem)) !important;
    max-height: min(92dvh, calc(100dvh - 1.75rem)) !important;
    padding: 1.2rem 1.35rem 1.15rem !important;
  }

  .mf-collection-overlay .mf-collection-modal .modal-header {
    padding: 0.5rem 0.65rem;
  }

  .mf-collection-overlay .mf-collection-modal .modal-header h2 {
    font-size: 0.9rem;
  }

  .mf-collection-overlay .mf-collection-modal .modal-body {
    padding: 0.5rem 0.65rem 0.65rem;
  }

  .collection-context-panel {
    padding: 0.45rem 0.5rem;
  }

  .mf-collection-overlay .radio-group-row {
    grid-template-columns: 1fr 1fr;
  }
}

.mf-collection-overlay .warning-text {
  color: #fcd34d;
  font-size: 0.68rem;
}

.mf-collection-overlay.light-theme .warning-text {
  color: #b45309;
}

.mf-expense-overlay.app-modal-overlay {
  z-index: 11060 !important;
  align-items: center !important;
  justify-content: center !important;
}

.mf-expense-overlay .mf-expense-modal.modal-content {
  width: min(42rem, calc(100vw - 1.5rem)) !important;
  max-width: min(42rem, calc(100vw - 1.5rem)) !important;
  max-height: min(88dvh, calc(100dvh - 1.5rem)) !important;
  margin: auto !important;
  background: #14261c;
  border: 1px solid rgba(74, 222, 128, 0.28);
  color: #ecfdf5;
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.45);
}

.mf-expense-overlay .mf-expense-modal .modal-header {
  padding: 0.7rem 0.9rem;
  border-bottom: 1px solid rgba(74, 222, 128, 0.18);
  background: rgba(0, 0, 0, 0.22);
}

.mf-expense-overlay .mf-expense-modal .modal-header h2 {
  font-size: 1rem;
  color: #ecfdf5;
}

.mf-expense-overlay .mf-expense-modal .btn-close {
  color: #bbf7d0;
}

.mf-expense-overlay .mf-expense-modal .modal-body {
  padding: 0.7rem 0.9rem 0.85rem;
}

.mf-expense-overlay .mf-expense-modal .form-group {
  margin-bottom: 0;
}

.mf-expense-overlay .mf-expense-modal .form-group label {
  margin-bottom: 0.28rem;
  font-size: 0.68rem;
  letter-spacing: 0.03em;
  color: #d1fae5;
}

.mf-expense-overlay .mf-expense-modal .form-input {
  min-height: 36px;
  padding: 0.4rem 0.65rem;
  font-size: 0.85rem;
  background: rgba(8, 20, 14, 0.88);
  color: #ecfdf5;
  border-color: rgba(74, 222, 128, 0.28);
}

.mf-expense-overlay .mf-expense-modal .form-input:disabled {
  opacity: 0.75;
  color: #bbf7d0;
}

.mf-expense-overlay .mf-expense-modal .total-input,
.mf-expense-overlay .mf-expense-modal .total-input:readonly {
  background: rgba(74, 222, 128, 0.14);
  color: #86efac;
}

.mf-expense-overlay .mf-expense-modal .modal-actions {
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  border-top: 1px solid rgba(74, 222, 128, 0.18);
  justify-content: stretch;
}

.mf-expense-overlay .mf-expense-modal .modal-actions .btn-success {
  width: 100%;
  min-height: 40px;
}

.mf-expense-overlay.light-theme {
  --text-main: #052e16;
  --text-soft: #166534;
  --text-muted: #14532d;
  --green: #15803d;
  --glass-panel: #ffffff;
}

.mf-expense-overlay.light-theme .mf-expense-modal.modal-content {
  background: #ffffff;
  border-color: #86efac;
  color: #052e16;
}

.mf-expense-overlay.light-theme .mf-expense-modal .modal-header {
  background: #f0fdf4;
  border-bottom-color: #bbf7d0;
}

.mf-expense-overlay.light-theme .mf-expense-modal .modal-header h2 {
  color: #052e16;
}

.mf-expense-overlay.light-theme .mf-expense-modal .btn-close {
  color: #14532d;
}

.mf-expense-overlay.light-theme .mf-expense-modal .form-group label {
  color: #14532d;
}

.mf-expense-overlay.light-theme .mf-expense-modal .form-input {
  background: #ffffff;
  color: #052e16;
  border-color: #cbd5e1;
}

.mf-expense-overlay.light-theme .mf-expense-modal .form-input:disabled {
  background: #f8fafc;
  color: #166534;
}

.mf-expense-overlay.light-theme .mf-expense-modal .total-input,
.mf-expense-overlay.light-theme .mf-expense-modal .total-input:readonly {
  background: #f0fdf4;
  color: #15803d;
  border-color: #4ade80;
}

.mf-expense-overlay.light-theme .transaction-context-panel {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #052e16;
}

.mf-expense-overlay.light-theme .transaction-context-panel h3,
.mf-expense-overlay.light-theme .context-grid strong {
  color: #052e16;
}

.mf-expense-overlay.light-theme .ctx-label,
.mf-expense-overlay.light-theme .context-hint,
.mf-expense-overlay.light-theme .auto-receipt-inline {
  color: #166534;
}

.mf-expense-overlay.light-theme .mf-expense-modal .modal-actions {
  border-top-color: #bbf7d0;
  background: #ffffff;
}

@media (max-width: 720px) {
  .expense-meta-grid {
    grid-template-columns: 1fr;
  }

  .mf-expense-overlay .mf-expense-modal.modal-content {
    width: min(100%, calc(100vw - 1rem)) !important;
    max-width: min(100%, calc(100vw - 1rem)) !important;
    max-height: min(92dvh, calc(100dvh - 1rem)) !important;
  }

  .mf-expense-overlay .mf-expense-modal .modal-header {
    padding: 0.55rem 0.7rem;
  }

  .mf-expense-overlay .mf-expense-modal .modal-header h2 {
    font-size: 0.92rem;
    line-height: 1.25;
  }

  .mf-expense-overlay .mf-expense-modal .modal-body {
    padding: 0.55rem 0.7rem 0.7rem;
  }

  .expense-items-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.4rem 0.45rem;
  }

  .transaction-context-panel {
    padding: 0.5rem 0.55rem;
    margin-bottom: 0.5rem;
  }

  .context-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.3rem 0.45rem;
  }

  .context-hint {
    display: none;
  }

  .mf-expense-overlay .mf-expense-modal .form-input {
    min-height: 34px;
    padding: 0.32rem 0.5rem;
    font-size: 0.8rem;
  }

  .mf-expense-overlay .mf-expense-modal .form-group label {
    font-size: 0.62rem;
    margin-bottom: 0.18rem;
  }

  .auto-receipt-inline {
    margin-bottom: 0.4rem;
    font-size: 0.68rem;
  }
}

.mf-receipt-overlay.app-modal-overlay {
  z-index: 12000 !important;
  padding: max(0.5rem, env(safe-area-inset-top, 0px))
    max(0.5rem, env(safe-area-inset-right, 0px))
    max(0.5rem, env(safe-area-inset-bottom, 0px))
    max(0.5rem, env(safe-area-inset-left, 0px)) !important;
  align-items: center !important;
  justify-content: center !important;
  overflow-y: auto !important;
  -webkit-overflow-scrolling: touch;
}

.mf-receipt-overlay .receipt-modal-box {
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
  margin: auto !important;
  box-sizing: border-box !important;
  flex-shrink: 0 !important;
}

.mf-receipt-overlay .receipt-modal-box.receipt-modal-expense {
  width: min(720px, calc(100vw - 1.25rem)) !important;
  max-width: min(720px, calc(100vw - 1.25rem)) !important;
}

.mf-receipt-overlay :deep(.receipt-print-root) {
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow: visible;
}

.mf-receipt-overlay :deep(.payment-receipt),
.mf-receipt-overlay :deep(.expense-receipt) {
  width: 100%;
  max-width: 100%;
  overflow: visible !important;
  border-width: 1.5px;
}

.mf-receipt-overlay :deep(.receipt-actions) {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  justify-content: flex-end;
  padding-top: 0.25rem;
  position: static;
  background: transparent;
}

.mf-receipt-overlay :deep(.btn-print),
.mf-receipt-overlay :deep(.btn-close) {
  min-height: 34px;
  padding: 0.35rem 0.85rem;
  font-size: 0.82rem;
}

.income-history-card .card-header {
  margin-bottom: 8px;
}

.financial-container.light-theme .mf-receipt-overlay .receipt-modal-box,
.mf-receipt-overlay.light-theme .receipt-modal-box {
  background: #ffffff;
  border: 1px solid #bbf7d0;
}

@media (max-width: 420px) {
  .mf-receipt-overlay .receipt-modal-box {
    width: calc(100vw - 1rem) !important;
    max-width: calc(100vw - 1rem) !important;
    padding: 6px 8px !important;
  }

  .mf-receipt-overlay :deep(.receipt-actions) {
    justify-content: stretch;
  }

  .mf-receipt-overlay :deep(.btn-print),
  .mf-receipt-overlay :deep(.btn-close) {
    flex: 1 1 auto;
  }
}

.mf-alert-stack.alert-center-stack {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  /* Above collection/expense modals (12050) so success/error stay centered in front */
  z-index: 14000 !important;
  display: flex;
  flex-direction: column;
  align-items: center;
  width: min(420px, calc(100vw - 2rem));
  pointer-events: none;
}

.mf-alert-stack .alert {
  pointer-events: auto;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 18px;
  border-radius: 14px;
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.38);
}

.mf-alert-stack .alert-success {
  background: rgba(6, 95, 70, 0.94);
  color: #d1fae5;
  border-left: 4px solid #10b981;
}

.mf-alert-stack .alert-error {
  background: rgba(127, 29, 29, 0.94);
  color: #fecaca;
  border-left: 4px solid #ef4444;
}

.mf-alert-stack.light-theme .alert-success {
  background: #f0fdf4;
  color: #15803d;
  border-left: 4px solid #16a34a;
}

.mf-alert-stack.light-theme .alert-error {
  background: #fee2e2;
  color: #991b1b;
  border-left: 4px solid #dc2626;
}

.mf-alert-stack .alert-message {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
}

.mf-alert-stack .alert-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 20px;
  font-weight: 800;
  cursor: pointer;
  opacity: 0.75;
}

@media (min-width: 769px) {
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page {
    padding: 12px 16px !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    font-size: 16px !important;
    line-height: 1.5 !important;
    border-radius: 14px !important;
    min-height: 0 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-header,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-header-split {
    margin-bottom: 10px !important;
    padding: 10px 14px !important;
    gap: 8px !important;
    border-radius: 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page h1.page-title,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-title {
    font-size: 1.25rem !important;
    line-height: 1.2 !important;
    margin: 0 0 2px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-subtitle {
    font-size: 0.75rem !important;
    line-height: 1.35 !important;
    margin: 0 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .barangay-context {
    margin-bottom: 8px !important;
    padding: 6px 10px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .context-badge {
    font-size: 0.78rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .admin-filter label,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .barangay-select {
    font-size: 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .barangay-select {
    min-height: 32px !important;
    height: 32px !important;
    padding: 4px 10px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-cards.stats-grid,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid:not(.compact) {
    gap: 8px !important;
    margin-bottom: 10px !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-cards > .summary-card,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid:not(.compact) .stat-card {
    padding: 7px 10px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
    min-height: 0 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-cards > .summary-card .card-label,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid:not(.compact) .stat-label {
    font-size: 9px !important;
    margin-bottom: 2px !important;
    letter-spacing: 0.05em !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-cards > .summary-card .card-amount,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid:not(.compact) .stat-value {
    font-size: 1.05rem !important;
    line-height: 1.1 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid.compact {
    gap: 8px !important;
    margin-bottom: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid.compact .stat-card {
    padding: 7px 10px !important;
    border-radius: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid.compact .stat-label {
    font-size: 9px !important;
    margin-bottom: 2px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid.compact .stat-value {
    font-size: 0.95rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .stats-grid.compact .stat-value-sm {
    font-size: 0.78rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tabs-container {
    gap: 6px !important;
    margin-bottom: 10px !important;
    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab {
    min-height: 32px !important;
    padding: 6px 8px !important;
    font-size: 11px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
    box-shadow: none !important;
    transform: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab:hover:not(.active) {
    transform: none !important;
    box-shadow: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-label {
    line-height: 1.2 !important;
    gap: 0.2rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-badge {
    min-width: 1.1rem !important;
    height: 1.1rem !important;
    font-size: 0.65rem !important;
    margin-left: 0.25rem !important;
    font-weight: 800 !important;
  }

  html body.glass-light .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab .tab-badge,
  html body.glass-light .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab.active .tab-badge,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page.light-theme .tab .tab-badge,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page.light-theme .tab.active .tab-badge {
    background: #dc2626 !important;
    color: #ffffff !important;
    -webkit-text-fill-color: #ffffff !important;
    border: 1.5px solid #7f1d1d !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-content {
    padding: 12px 14px !important;
    border-radius: 12px !important;
    border-width: 1px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-header {
    margin-bottom: 10px !important;
    gap: 8px 12px !important;
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: space-between !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-header h2 {
    font-size: 1rem !important;
    flex: 1 1 auto !important;
    min-width: 0 !important;
    margin: 0 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-header:has(.section-desc) {
    flex-direction: column !important;
    align-items: stretch !important;
    justify-content: flex-start !important;
    gap: 4px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-header:has(.section-desc) h2 {
    flex: none !important;
    width: 100% !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(.section-desc, .ar-tab-desc, .collections-note, .ar-list-note) {
    width: 100% !important;
    margin: 0 0 6px !important;
    font-size: 12px !important;
    line-height: 1.35 !important;
    font-weight: 500 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-header :is(.btn-primary, .btn-secondary, .view-only-badge) {
    flex: 0 0 auto !important;
    margin-left: auto !important;
    white-space: nowrap !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-header .dp-queue-btn {
    overflow: visible !important;
    height: auto !important;
    min-height: 32px !important;
  }

  html body.glass-light .financial-container.machinery-financial-page.machinery-ui.glass-module-page .dp-queue-btn .dp-queue-badge,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page.light-theme .dp-queue-btn .dp-queue-badge {
    background: #ffffff !important;
    color: #991b1b !important;
    -webkit-text-fill-color: #991b1b !important;
    border: 1.5px solid #991b1b !important;
    opacity: 1 !important;
    visibility: visible !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-subheader.collections-header {
    align-items: center !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filters-section.tools-card,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filters-section {
    display: flex !important;
    flex-wrap: wrap !important;
    align-items: flex-end !important;
    gap: 6px 8px !important;
    padding: 8px 10px !important;
    margin-bottom: 8px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filters-section.page-machinery-filter {
    flex-direction: column !important;
    align-items: stretch !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    padding: 10px 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filter-group {
    flex: 0 1 148px !important;
    min-width: 120px !important;
    max-width: 170px !important;
    gap: 3px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-machinery-filter .filter-group,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-machinery-filter .page-machinery-filter-group {
    flex: 1 1 auto !important;
    width: 100% !important;
    min-width: 0 !important;
    max-width: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-machinery-filter .page-machinery-filter-label {
    display: block !important;
    font-size: 0.72rem !important;
    font-weight: 700 !important;
    margin: 0 0 2px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-machinery-filter .page-machinery-filter-select,
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-machinery-filter .filter-input {
    width: 100% !important;
    max-width: none !important;
    min-width: 0 !important;
    min-height: 40px !important;
    height: 40px !important;
    font-size: 0.9rem !important;
    padding: 0.4rem 0.65rem !important;
    border-radius: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .page-machinery-filter .page-machinery-filter-hint {
    width: 100% !important;
    flex: none !important;
    font-size: 0.72rem !important;
    line-height: 1.3 !important;
    margin: 0 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filter-actions {
    flex: 0 0 auto !important;
    display: inline-flex !important;
    flex-wrap: nowrap !important;
    gap: 6px !important;
    margin-left: auto !important;
    grid-column: unset !important;
    width: auto !important;
    justify-content: flex-end !important;
    align-items: center !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filter-actions :is(.btn-secondary, .btn-secondary-outline) {
    flex: 0 0 auto !important;
    white-space: nowrap !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-content .card-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    gap: 8px !important;
    padding: 8px 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-content .card-header .card-title {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    margin: 0 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-content .card-header :is(.btn-primary-action, .btn, .btn-primary) {
    flex: 0 0 auto !important;
    margin-left: auto !important;
    white-space: nowrap !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .distribution-actions {
    display: flex !important;
    flex-wrap: wrap !important;
    justify-content: flex-end !important;
    align-items: center !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .expense-section-block {
    margin-bottom: 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .expense-section-title {
    font-size: 0.95rem !important;
    margin-bottom: 4px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-hint {
    font-size: 12px !important;
    margin-bottom: 6px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-count {
    font-size: 10px !important;
    padding: 1px 6px !important;
    min-width: 1.25rem !important;
    font-weight: 700 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .fin-desktop-table:has(.gcash-table) {
    max-height: min(26rem, 50vh) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .gcash-table :is(th, td) {
    padding: 4px 6px !important;
    font-size: 10px !important;
    line-height: 1.25 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .gcash-table th {
    font-size: 9px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .proof-view-btn {
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
    text-decoration: none !important;
    white-space: nowrap !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .fin-desktop-table {
    display: block !important;
    width: 100% !important;
    max-height: min(36rem, 62vh) !important;
    overflow: auto !important;
    border-radius: 8px !important;
    -webkit-overflow-scrolling: touch !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table,
    .income-table,
    .ar-table,
    .collections-table,
    .usage-table,
    .tab-content .data-table
  ) {
    width: max-content !important;
    min-width: 100% !important;
    border-collapse: collapse !important;
    table-layout: auto !important;
    font-size: 11px !important;
    font-family: inherit !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table th,
    .income-table th,
    .ar-table th,
    .collections-table th,
    .usage-table th,
    .tab-content .data-table th
  ) {
    position: sticky !important;
    top: 0 !important;
    z-index: 2 !important;
    padding: 5px 7px !important;
    font-size: 10px !important;
    font-weight: 700 !important;
    font-family: inherit !important;
    line-height: 1.25 !important;
    text-align: left !important;
    vertical-align: middle !important;
    white-space: normal !important;
    word-break: break-word !important;
    text-transform: none !important;
    letter-spacing: 0.01em !important;
    border-right: none !important;
    border-bottom: 1px solid rgba(74, 222, 128, 0.28) !important;
    background: rgba(22, 38, 28, 0.98) !important;
    box-shadow: 0 1px 0 rgba(74, 222, 128, 0.18) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table td,
    .income-table td,
    .ar-table td,
    .collections-table td,
    .usage-table td,
    .tab-content .data-table td
  ) {
    padding: 5px 7px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    font-family: inherit !important;
    line-height: 1.3 !important;
    text-align: left !important;
    vertical-align: middle !important;
    border-right: none !important;
    border-bottom: 1px solid rgba(255, 255, 255, 0.08) !important;
    white-space: normal !important;
    overflow: visible !important;
    text-overflow: clip !important;
    word-break: break-word !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table td.amount-cell,
    .income-table td.amount-cell,
    .ar-table td.amount-cell,
    .collections-table td.amount-cell,
    .usage-table td.amount-cell,
    .tab-content .data-table td.amount-cell,
    .tab-content table.data-table tbody td.amount
  ) {
    white-space: nowrap !important;
    word-break: normal !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table th:not(:last-child),
    .income-table th:not(:last-child),
    .ar-table th:not(:last-child),
    .collections-table th:not(:last-child),
    .usage-table th:not(:last-child),
    .tab-content .data-table th:not(:last-child),
    .expenses-table td:not(:last-child),
    .income-table td:not(:last-child),
    .ar-table td:not(:last-child),
    .collections-table td:not(:last-child),
    .usage-table td:not(:last-child),
    .tab-content .data-table td:not(:last-child)
  ) {
    border-right: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table tbody tr:nth-child(even),
    .income-table tbody tr:nth-child(even),
    .ar-table tbody tr:nth-child(even),
    .collections-table tbody tr:nth-child(even),
    .usage-table tbody tr:nth-child(even),
    .tab-content .data-table tbody tr:nth-child(even)
  ) {
    background: rgba(255, 255, 255, 0.03) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table tbody tr:hover,
    .income-table tbody tr:hover,
    .ar-table tbody tr:hover,
    .collections-table tbody tr:hover,
    .usage-table tbody tr:hover,
    .tab-content .data-table tbody tr:hover
  ) {
    background: rgba(74, 222, 128, 0.1) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table th.actions-col,
    .expenses-table td.actions-cell,
    .income-table th.actions-col,
    .income-table td.actions-cell,
    .ar-table th.actions-col,
    .ar-table td.actions-cell,
    .collections-table th.actions-col,
    .collections-table td.actions-cell,
    .tab-content .data-table th.actions-col,
    .tab-content .data-table td.actions-cell
  ) {
    text-align: center !important;
    white-space: normal !important;
    overflow: visible !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .amount-cell,
    .tab-content table.data-table tbody td.amount,
    .tab-content .data-table td.text-right
  ) {
    text-align: right !important;
    font-variant-numeric: tabular-nums !important;
    font-weight: 700 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table .badge,
    .income-table .badge,
    .ar-table .badge,
    .collections-table .badge,
    .tab-content .data-table .badge,
    .status-badge,
    .badge
  ) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    min-width: 0 !important;
    padding: 2px 6px !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    font-family: inherit !important;
    line-height: 1.2 !important;
    border-radius: 999px !important;
    border-width: 1px !important;
    white-space: normal !important;
    text-transform: none !important;
    letter-spacing: 0 !important;
    word-break: break-word !important;
    text-align: center !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table td .btn-sm,
    .income-table td .btn-sm,
    .ar-table td .btn-sm,
    .collections-table td .btn-sm,
    .tab-content .data-table td .btn-sm,
    .tab-content .data-table td .btn-primary,
    .ar-row-actions .btn-sm
  ) {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: auto !important;
    max-width: none !important;
    padding: 3px 7px !important;
    font-size: 10px !important;
    font-weight: 600 !important;
    font-family: inherit !important;
    line-height: 1.2 !important;
    min-height: 26px !important;
    border-width: 1px !important;
    border-radius: 6px !important;
    white-space: nowrap !important;
    vertical-align: middle !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page td.members-action-row {
    white-space: nowrap !important;
    overflow: visible !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page td.members-action-row .table-action-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 28px !important;
    height: 28px !important;
    min-width: 28px !important;
    min-height: 28px !important;
    padding: 0 !important;
    border-radius: 8px !important;
    vertical-align: middle !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page td.members-action-row .table-action-btn + .table-action-btn {
    margin-left: 4px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page.light-theme :is(
    .expenses-table th,
    .income-table th,
    .ar-table th,
    .collections-table th,
    .usage-table th,
    .tab-content .data-table th
  ) {
    background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
    border-bottom-color: #16a34a !important;
    box-shadow: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page.light-theme :is(
    .expenses-table td,
    .income-table td,
    .ar-table td,
    .collections-table td,
    .usage-table td,
    .tab-content .data-table td
  ) {
    border-bottom-color: rgba(148, 163, 184, 0.35) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-subheader {
    margin-bottom: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .section-subheader h3 {
    font-size: 0.9rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .view-only-badge {
    padding: 3px 8px !important;
    font-size: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filter-label {
    font-size: 10px !important;
    font-weight: 700 !important;
    letter-spacing: 0.02em !important;
    text-transform: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .filter-input,
    .filter-select-glass,
    .input,
    select.input
  ) {
    padding: 6px 10px !important;
    font-size: 13px !important;
    min-height: 32px !important;
    height: 32px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page textarea.input {
    height: auto !important;
    min-height: 52px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .table-container {
    border-width: 1px !important;
    border-radius: 10px !important;
    padding: 6px 8px 8px !important;
    border-color: rgba(148, 163, 184, 0.45) !important;
    background: rgba(255, 255, 255, 0.02) !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-content .card {
    border-radius: 12px !important;
    border-width: 1px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-content .card-header {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    flex-wrap: wrap !important;
    padding: 8px 12px !important;
    gap: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab-content .card-title {
    flex: 1 1 auto !important;
    min-width: 0 !important;
    font-size: 0.95rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .filter-section {
    padding: 8px 12px 6px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-container {
    gap: 8px !important;
    margin-bottom: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-container > .summary-card {
    min-height: 0 !important;
    height: auto !important;
    padding: 6px 10px !important;
    gap: 4px !important;
    border-radius: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-container > .summary-card:hover {
    transform: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-container > .summary-card .card-label {
    font-size: 10px !important;
    margin-bottom: 2px !important;
    letter-spacing: 0.06em !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .summary-container > .summary-card .card-amount {
    font-size: 1.05rem !important;
    line-height: 1.1 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .auto-interest-indicator {
    margin: 0 0 8px !important;
    padding: 6px 10px !important;
    font-size: 12px !important;
    line-height: 1.35 !important;
    border-radius: 8px !important;
    border-width: 1px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(.ar-section, .collections-section) {
    margin-top: 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .collections-header {
    margin-bottom: 6px !important;
    gap: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .collections-search {
    min-height: 32px !important;
    padding: 0 8px !important;
    border-radius: 8px !important;
    border-width: 1px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .collections-search-input {
    font-size: 13px !important;
    min-height: 30px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .expenses-table th.actions-col,
    .income-table th.actions-col,
    .ar-table th.actions-col,
    .collections-table th.actions-col,
    .tab-content .data-table th.actions-col
  ) {
    width: auto !important;
    min-width: 96px !important;
    white-space: normal !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .ar-table th.actions-col,
    .ar-table td.actions-cell,
    .collections-table th.actions-col,
    .collections-table td.actions-cell
  ) {
    min-width: 148px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .ar-row-actions,
    td.payment-actions
  ) {
    display: inline-flex !important;
    flex-direction: row !important;
    flex-wrap: wrap !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 4px !important;
    width: auto !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page td.payment-actions {
    text-align: center !important;
    white-space: normal !important;
    overflow: visible !important;
    vertical-align: middle !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .ar-row-actions :is(.btn-sm, .btn-primary, .btn-secondary, .btn-secondary-outline) {
    flex: 0 0 auto !important;
    width: auto !important;
    max-width: none !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .amount-cell.balance.highlight {
    display: inline-block !important;
    padding: 2px 6px !important;
    border-radius: 6px !important;
    font-weight: 700 !important;
    font-size: 11px !important;
    line-height: 1.2 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .profit-breakdown {
    gap: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .breakdown-card {
    padding: 8px 10px !important;
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .breakdown-card h3 {
    font-size: 0.68rem !important;
    margin-bottom: 6px !important;
    padding-bottom: 4px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .breakdown-card .amount {
    font-size: 1rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .expense-item {
    padding: 2px 0 !important;
    font-size: 0.72rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .expense-item span:last-child {
    font-size: 0.72rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .usage-leaders-card {
    margin-top: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .report-type-buttons {
    gap: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .report-type-btn {
    min-height: 34px !important;
    padding: 6px 8px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .report-type-btn .btn-text {
    font-size: 11px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .distribution-actions {
    margin-top: 10px !important;
    gap: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .btn,
    .btn-primary,
    .btn-secondary,
    .btn-secondary-outline,
    .btn-success,
    .btn-danger,
    .btn-primary-action,
    .btn-muted
  ) {
    padding: 6px 14px !important;
    font-size: 13px !important;
    min-height: 32px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(.btn-sm, .btn-small, .btn-primary-small) {
    padding: 4px 8px !important;
    font-size: 11px !important;
    min-height: 28px !important;
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .empty-message {
    padding: 12px 10px !important;
    font-size: 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .empty-title {
    font-size: 0.95rem !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .empty-text {
    font-size: 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .info-banner {
    padding: 8px 12px !important;
    margin-bottom: 10px !important;
    font-size: 12px !important;
    border-width: 1px !important;
    border-radius: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .gcash-qr-card {
    margin-bottom: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .gcash-qr-layout {
    gap: 10px !important;
    padding: 10px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .gcash-header-btn {
    min-height: 32px !important;
    padding: 6px 12px !important;
    font-size: 12px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .sc-detail-modal.modal-content {
    border-radius: 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .sc-detail-modal-header {
    padding: 10px 12px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .sc-detail-modal-header h2 {
    font-size: 0.95rem !important;
  }

  body.glass-dark .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .btn,
    .btn-primary,
    .btn-secondary,
    .btn-secondary-outline,
    .btn-success,
    .btn-danger,
    .btn-primary-action,
    .btn-muted,
    .tab,
    .report-type-btn
  ),
  body.glass-light .financial-container.machinery-financial-page.machinery-ui.glass-module-page :is(
    .btn,
    .btn-primary,
    .btn-secondary,
    .btn-secondary-outline,
    .btn-success,
    .btn-danger,
    .btn-primary-action,
    .btn-muted,
    .tab,
    .report-type-btn
  ) {
    border-radius: 8px !important;
    font-weight: 600 !important;
  }

  body.glass-dark .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab,
  body.glass-light .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab {
    border-width: 1px !important;
  }
}

@media (min-width: 769px) and (max-width: 1280px) {
  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tabs-container {
    grid-template-columns: repeat(6, minmax(0, 1fr)) !important;
    gap: 4px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .tab {
    font-size: 10px !important;
    padding: 5px 6px !important;
    min-height: 30px !important;
  }

  html body .financial-container.machinery-financial-page.machinery-ui.glass-module-page .profit-breakdown {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }
}
</style>