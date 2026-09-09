<template>
  <div class="financial-overview-container glass-module-page" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split no-print">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.financialOverview') }}</h1>
        <p class="page-subtitle">{{ $t('ui.financialOverviewSub') }}</p>
      </div>
      <div class="header-actions">
        <button type="button" class="export-btn" @click="printReport">
          <svg class="export-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>
          </svg>
          {{ $t('common.print') }}
        </button>
        <button type="button" class="export-btn export-btn-secondary" @click="exportCSV">
          <svg class="export-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
          {{ $t('common.csv') }}
        </button>
      </div>
    </div>

    <div class="filters-bar no-print">
      <div v-if="isAdmin" class="filter-group">
        <label class="filter-label" for="fin-barangay-filter">{{ $t('ui.barangay') }}</label>
        <select id="fin-barangay-filter" v-model="filterBarangay" class="filter-input">
          <option value="">{{ $t('ui.allBarangays') }}</option>
          <option v-for="b in barangayOptions" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
        </select>
      </div>
      <div class="filter-group">
        <label class="filter-label" for="fin-date-from">{{ $t('ui.dateFrom') }}</label>
        <div class="mf-date-field">
          <input id="fin-date-from" v-model="filterDateFrom" type="date" class="filter-input mf-date-input" />
          <span class="mf-date-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
        </div>
      </div>
      <div class="filter-group">
        <label class="filter-label" for="fin-date-to">{{ $t('ui.dateTo') }}</label>
        <div class="mf-date-field">
          <input id="fin-date-to" v-model="filterDateTo" type="date" class="filter-input mf-date-input" />
          <span class="mf-date-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.25" stroke-linecap="round" stroke-linejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
          </span>
        </div>
      </div>
      <button type="button" class="filter-clear-btn" @click="clearFilters">{{ $t('common.clearFilters') }}</button>
    </div>

    <div class="filters-bar no-print transactions-module-filter">
      <div class="filter-group">
        <label class="filter-label" for="fin-module-filter">{{ $t('ui.module') }}</label>
        <select id="fin-module-filter" v-model="filterModule" class="filter-input">
          <option value="">{{ $t('ui.allModules') }}</option>
          <option v-for="mod in moduleFilterOptions" :key="mod.value" :value="mod.value">{{ $t(mod.labelKey) }}</option>
        </select>
      </div>
      <p v-if="!isTreasurer" class="read-only-note">
        {{ $t('ui.viewOnlyFinanceHint') }}
      </p>
    </div>

    <div id="financial-overview-display" class="printable-report">
      <div class="report-banner print-only">
        <h2>{{ $t('ui.financialSystemReport') }}</h2>
        <p>{{ reportScope }}</p>
        <p class="report-date">{{ $t('ui.generatedColon') }} {{ reportGeneratedAt }}</p>
      </div>

      <!-- System-wide KPIs -->
      <div class="stats-group stats-group--overview">
        <div class="stats-grid stats-grid--overview">
        <div class="stat-card stat-card-loan-collected">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.loanCollections') }}</div>
            <div class="stat-value collected">₱{{ totalCollected.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card stat-card-loan-outstanding">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.loanOutstanding') }}</div>
            <div class="stat-value outstanding">₱{{ outstandingBalance.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card stat-card-machinery-income">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.machineryIncome') }}</div>
            <div class="stat-value collected">₱{{ machineryIncome.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card stat-card-machinery-expense">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.machineryExpenses') }}</div>
            <div class="stat-value expense">₱{{ machineryExpenses.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card stat-card-machinery-net">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.machineryNet') }}</div>
            <div class="stat-value" :class="machineryNet >= 0 ? 'collected' : 'overdue'">₱{{ machineryNet.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card stat-card-share-balance">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.shareCapitalBalance') }}</div>
            <div class="stat-value">₱{{ shareCapitalBalance.toLocaleString() }}</div>
          </div>
        </div>
        <div class="stat-card stat-card-share-contributed">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.shareCapitalContributed') }}</div>
            <div class="stat-value collected">₱{{ shareCapitalContributed.toLocaleString() }}</div>
          </div>
        </div>
        </div>
      </div>

      <!-- Charts -->
      <div class="charts-row">
        <div class="chart-card">
          <h3 class="chart-title">{{ $t('ui.financeByModule') }}</h3>
          <div class="chart-canvas-wrap">
            <canvas ref="moduleChartRef"></canvas>
          </div>
        </div>
        <div class="chart-card">
          <h3 class="chart-title">{{ $t('ui.machineryIncomeVsExpenses') }}</h3>
          <div class="chart-canvas-wrap">
            <canvas ref="machineryChartRef"></canvas>
          </div>
        </div>
      </div>

      <!-- Consolidated module summary -->
      <div class="financial-table-section">
        <div class="table-header">
          <h3 class="section-title">{{ $t('ui.consolidatedSummary') }}</h3>
        </div>
        <div class="financial-table-wrap fin-desktop-table fo-summary-table-wrap">
        <table class="financial-table financial-table-main">
          <colgroup>
            <col class="col-module" />
            <col class="col-amount" />
            <col class="col-amount" />
            <col class="col-amount" />
            <col class="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>{{ $t('ui.module') }}</th>
              <th>{{ $t('ui.inflowsCollected') }}</th>
              <th>{{ $t('ui.outflowsDisbursed') }}</th>
              <th>{{ $t('ui.netBalance') }}</th>
              <th class="no-print">{{ $t('ui.detailPage') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="5" class="loading-cell">{{ $t('ui.loadingFinancialData') }}</td>
            </tr>
            <template v-else>
              <tr v-for="row in moduleSummaryRows" :key="row.key">
                <td><strong>{{ row.label }}</strong></td>
                <td class="collected">₱{{ row.inflow.toLocaleString() }}</td>
                <td class="expense">₱{{ row.outflow.toLocaleString() }}</td>
                <td :class="row.net >= 0 ? 'collected' : 'overdue'">₱{{ row.net.toLocaleString() }}</td>
                <td class="module-link-cell no-print">
                  <router-link
                    v-if="!row.treasurerOnly || isTreasurer"
                    :to="row.route"
                    class="detail-link-btn"
                  >{{ row.linkLabel }}</router-link>
                  <span v-else class="view-only-label">{{ $t('ui.viewOnlyLower') }}</span>
                </td>
              </tr>
            </template>
          </tbody>
        </table>
        </div>
        <div class="fin-mobile-list no-print">
          <div v-if="loading" class="fin-mobile-empty">{{ $t('ui.loadingFinancialData') }}</div>
          <template v-else>
            <div
              v-for="row in moduleSummaryRows"
              :key="`mod-m-${row.key}`"
              class="fin-mobile-card"
            >
              <div class="fin-mobile-card-top">
                <h4 class="fin-mobile-card-name">{{ row.label }}</h4>
              </div>
              <div class="fin-mobile-card-meta">
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.inflows') }}</span>
                  <span class="collected">₱{{ row.inflow.toLocaleString() }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.outflows') }}</span>
                  <span class="expense">₱{{ row.outflow.toLocaleString() }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.net') }}</span>
                  <span :class="row.net >= 0 ? 'collected' : 'overdue'">₱{{ row.net.toLocaleString() }}</span>
                </div>
              </div>
              <div class="fin-mobile-card-actions">
                <router-link
                  v-if="!row.treasurerOnly || isTreasurer"
                  :to="row.route"
                  class="detail-link-btn fin-mobile-action"
                >{{ row.linkLabel }}</router-link>
                <span v-else class="view-only-label">{{ $t('ui.viewOnlyLower') }}</span>
              </div>
            </div>
          </template>
        </div>
      </div>

      <!-- All transactions (consolidated ledger) -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">{{ $t('ui.allTransactions') }}</h3>
          <span class="transaction-count-badge">{{ $t('ui.recordsCount', { n: filteredTransactions.length }) }}</span>
        </div>
        <p v-if="transactionsError" class="transactions-error no-print">{{ transactionsError }}</p>
        <div class="financial-table-wrap transactions-table-wrap fin-desktop-table fo-transactions-table-wrap">
          <table class="financial-table financial-table-transactions">
            <colgroup>
              <col class="col-date" />
              <col class="col-module" />
              <col class="col-type" />
              <col class="col-farmer" />
              <col class="col-desc" />
              <col class="col-amount" />
              <col class="col-receipt" />
              <col v-if="isAdmin" class="col-barangay" />
              <col class="col-actions" />
            </colgroup>
            <thead>
              <tr>
                <th>{{ $t('ui.date') }}</th>
                <th>{{ $t('ui.module') }}</th>
                <th>{{ $t('ui.type') }}</th>
                <th>{{ $t('ui.farmer') }}</th>
                <th>{{ $t('ui.description') }}</th>
                <th class="text-right">{{ $t('ui.amount') }}</th>
                <th>{{ $t('ui.receipt') }}</th>
                <th v-if="isAdmin">{{ $t('ui.barangay') }}</th>
                <th class="no-print manage-col">{{ $t('ui.source') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="transactionsLoading">
                <td :colspan="isAdmin ? 9 : 8" class="loading-cell">{{ $t('ui.loadingTransactions') }}</td>
              </tr>
              <tr v-else-if="filteredTransactions.length === 0">
                <td :colspan="isAdmin ? 9 : 8" class="loading-cell">{{ $t('ui.noTransactionsFilter') }}</td>
              </tr>
              <tr v-for="tx in filteredTransactions" :key="tx.id">
                <td>{{ formatTxDate(tx.date) }}</td>
                <td><span class="module-pill" :class="modulePillClass(tx.module)">{{ translateModule(tx.module) }}</span></td>
                <td>{{ translateTxType(tx.type) }}</td>
                <td>{{ tx.farmer_name || '—' }}</td>
                <td class="tx-desc">{{ tx.description }}</td>
                <td class="text-right" :class="txAmountClass(tx)">₱{{ formatTxAmount(tx.amount) }}</td>
                <td>{{ tx.receipt_number || '—' }}</td>
                <td v-if="isAdmin">{{ tx.barangay_name || '—' }}</td>
                <td class="no-print manage-col">
                  <router-link
                    v-if="isTreasurer && tx.source_route"
                    :to="tx.source_route"
                    class="detail-link-btn detail-link-btn-sm"
                  >{{ $t('ui.manage') }}</router-link>
                  <span v-else class="view-only-label">{{ $t('ui.viewOnlyLower') }}</span>
                </td>
              </tr>
            </tbody>
            <tfoot v-if="!transactionsLoading && filteredTransactions.length > 0">
              <tr class="totals-row">
                <td :colspan="isAdmin ? 5 : 5"><strong>{{ $t('ui.totalsFiltered') }}</strong></td>
                <td class="text-right collected"><strong>₱{{ formatTxAmount(transactionInflowTotal) }}</strong></td>
                <td :colspan="isAdmin ? 3 : 2"></td>
              </tr>
            </tfoot>
          </table>
        </div>
        <div class="fin-mobile-list no-print">
          <div v-if="transactionsLoading" class="fin-mobile-empty">{{ $t('ui.loadingTransactions') }}</div>
          <div v-else-if="filteredTransactions.length === 0" class="fin-mobile-empty">{{ $t('ui.noTransactionsFilter') }}</div>
          <template v-else>
            <div
              v-for="tx in filteredTransactions"
              :key="`tx-m-${tx.id}`"
              class="fin-mobile-card"
            >
              <div class="fin-mobile-card-top">
                <h4 class="fin-mobile-card-name">{{ tx.farmer_name || translateTxType(tx.type) || $t('ui.transaction') }}</h4>
                <div class="fin-mobile-card-top-right">
                  <span class="fin-mobile-amount" :class="txAmountClass(tx)">₱{{ formatTxAmount(tx.amount) }}</span>
                  <span class="fin-mobile-date">{{ formatTxDate(tx.date) }}</span>
                </div>
              </div>
              <div class="fin-mobile-card-meta">
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.module') }}</span>
                  <span class="module-pill" :class="modulePillClass(tx.module)">{{ translateModule(tx.module) }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.type') }}</span>
                  <span>{{ translateTxType(tx.type) }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.receipt') }}</span>
                  <span>{{ tx.receipt_number || '—' }}</span>
                </div>
                <div v-if="isAdmin" class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.barangay') }}</span>
                  <span>{{ tx.barangay_name || '—' }}</span>
                </div>
              </div>
              <div class="fin-mobile-card-actions">
                <router-link
                  v-if="isTreasurer && tx.source_route"
                  :to="tx.source_route"
                  class="detail-link-btn detail-link-btn-sm fin-mobile-action"
                >{{ $t('ui.manage') }}</router-link>
                <span v-else class="view-only-label">{{ $t('ui.viewOnlyLower') }}</span>
              </div>
            </div>
            <div class="fin-mobile-totals">
              <span class="fin-mobile-label">{{ $t('ui.totalsFiltered') }}</span>
              <strong class="collected">₱{{ formatTxAmount(transactionInflowTotal) }}</strong>
            </div>
          </template>
        </div>
      </div>

      <!-- Loans summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">{{ $t('ui.loansSummary') }}</h3>
          <router-link to="/admin-loans" class="view-all-link no-print detail-link-btn">{{ $t('ui.loanManagement') }}</router-link>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>{{ $t('ui.metric') }}</th>
              <th>{{ $t('ui.value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{{ $t('ui.totalDisbursed') }}</td><td class="amount">₱{{ totalDisbursed.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.totalCollected') }}</td><td class="collected">₱{{ totalCollected.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.outstandingBalance') }}</td><td class="outstanding">₱{{ outstandingBalance.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.overdueWithCount', { n: overdueCount }) }}</td><td class="overdue">₱{{ overdueAmount.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.collectionRate') }}</td><td class="rate">{{ collectionRate }}%</td></tr>
            <tr><td>{{ $t('ui.activePortfolio') }}</td><td>{{ $t('ui.loansCount', { n: activePortfolioCount }) }}</td></tr>
            <tr><td>{{ $t('ui.paymentTransactions') }}</td><td>{{ collectionsPerformance.paymentCount }}</td></tr>
          </tbody>
        </table>
        <table class="financial-table sub-table">
          <thead>
            <tr>
              <th>{{ $t('ui.status') }}</th>
              <th>{{ $t('ui.loans') }}</th>
              <th>{{ $t('ui.outstanding') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in statusSummaryRows" :key="row.status">
              <td>{{ row.label }}</td>
              <td>{{ row.count }}</td>
              <td class="outstanding">₱{{ row.outstanding.toLocaleString() }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <!-- Machinery summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">{{ $t('ui.machinerySummary') }}</h3>
          <router-link to="/machinery-financial" class="view-all-link no-print detail-link-btn">{{ $t('nav.machineryFinancial') }}</router-link>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>{{ $t('ui.metric') }}</th>
              <th>{{ $t('ui.value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{{ $t('ui.totalIncome') }}</td><td class="collected">₱{{ machineryIncome.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.totalExpensesLabel') }}</td><td class="expense">₱{{ machineryExpenses.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.netProfitLoss') }}</td><td :class="machineryNet >= 0 ? 'collected' : 'overdue'">₱{{ machineryNet.toLocaleString() }}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Share capital summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">{{ $t('ui.shareCapitalSummary') }}</h3>
          <router-link to="/share-capital" class="view-all-link no-print detail-link-btn">{{ $t('ui.shareCapital') }}</router-link>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>{{ $t('ui.metric') }}</th>
              <th>{{ $t('ui.value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{{ $t('ui.membersWithShareCapital') }}</td><td>{{ shareCapitalMembers }}</td></tr>
            <tr><td>{{ $t('ui.totalContributed') }}</td><td class="collected">₱{{ shareCapitalContributed.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.totalWithdrawn') }}</td><td class="expense">₱{{ shareCapitalWithdrawn.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.currentBalance') }}</td><td class="amount">₱{{ shareCapitalBalance.toLocaleString() }}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Seed & Fertilizer summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">{{ $t('ui.seedFertilizerSummary') }}</h3>
          <router-link
            v-if="isTreasurer"
            to="/seed-fertilizer-plan"
            class="view-all-link no-print detail-link-btn"
          >{{ $t('ui.seedFertilizerPlan') }}</router-link>
          <span v-else class="view-only-label no-print">{{ $t('ui.viewOnlyLower') }}</span>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>{{ $t('ui.metric') }}</th>
              <th>{{ $t('ui.value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{{ $t('ui.paymentsCollected') }}</td><td class="collected">₱{{ seedFertilizerCollected.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.transactionCount') }}</td><td>{{ seedFertilizerCount }}</td></tr>
          </tbody>
        </table>
      </div>

      <!-- Association Dues summary -->
      <div class="financial-table-section module-section">
        <div class="table-header">
          <h3 class="section-title">{{ $t('ui.associationDuesSummary') }}</h3>
          <router-link
            v-if="isTreasurer"
            to="/association-dues"
            class="view-all-link no-print detail-link-btn"
          >{{ $t('ui.associationDues') }}</router-link>
          <span v-else class="view-only-label no-print">{{ $t('ui.viewOnlyLower') }}</span>
        </div>
        <table class="financial-table">
          <thead>
            <tr>
              <th>{{ $t('ui.metric') }}</th>
              <th>{{ $t('ui.value') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>{{ $t('ui.totalCollected') }}</td><td class="collected">₱{{ associationDuesCollected.toLocaleString() }}</td></tr>
            <tr><td>{{ $t('ui.transactionCount') }}</td><td>{{ associationDuesCount }}</td></tr>
          </tbody>
        </table>
      </div>

      <p class="report-footer print-only">
        {{ $t('ui.financialOverviewPrintFooter') }}
      </p>
    </div>

    <!-- Print source: machinery-style sheet (filtered transactions only) -->
    <div class="fo-print-source" aria-hidden="true">
      <div id="printable-report">
        <MachineryReportSheet
          :title="$t('ui.allTransactions')"
          :subtitle="$t('ui.financialOverview')"
          :show-machinery-type="false"
          :barangay-name="reportBarangayNameForReport"
          :period-label="reportPeriodLabel"
          :sheet-meta="reportSheetMeta"
          sheet-class="collectibles-list-sheet"
        >
          <table class="collectibles-data-table collectibles-list-table fo-overview-transactions-table">
            <thead>
              <tr>
                <th class="fo-col-date">{{ $t('ui.date') }}</th>
                <th class="fo-col-module">{{ $t('ui.module') }}</th>
                <th class="fo-col-type">{{ $t('ui.type') }}</th>
                <th class="fo-col-member">{{ $t('ui.farmer') }}</th>
                <th class="fo-col-desc">{{ $t('ui.description') }}</th>
                <th class="fo-col-rcpt">{{ $t('ui.receiptNo') }}</th>
                <th class="fo-col-amt text-right">{{ $t('ui.amount') }}</th>
                <th v-if="isAdmin" class="fo-col-barangay">{{ $t('ui.barangay') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="tx in filteredTransactions" :key="'print-' + tx.id">
                <td class="fo-col-date">{{ formatReportDateCompact(tx.date) }}</td>
                <td class="fo-col-module">{{ translateModule(tx.module) }}</td>
                <td class="fo-col-type">{{ translateTxType(tx.type) }}</td>
                <td class="fo-col-member">{{ tx.farmer_name || '—' }}</td>
                <td class="fo-col-desc">{{ tx.description || '—' }}</td>
                <td class="fo-col-rcpt">{{ tx.receipt_number || '—' }}</td>
                <td class="fo-col-amt text-right">{{ formatPrintTxAmount(tx) }}</td>
                <td v-if="isAdmin" class="fo-col-barangay">{{ tx.barangay_name || '—' }}</td>
              </tr>
              <tr v-if="!transactionsLoading && filteredTransactions.length === 0">
                <td :colspan="isAdmin ? 8 : 7" class="collectibles-empty-note">
                  {{ $t('ui.noTransactionsFilter') }}
                </td>
              </tr>
            </tbody>
            <tfoot v-if="filteredTransactions.length > 0">
              <tr class="fcr-total-row">
                <td :colspan="isAdmin ? 6 : 6"><strong>{{ $t('ui.totalsFiltered') }}</strong></td>
                <td class="fo-col-amt text-right"><strong>{{ formatReportMoneyCompact(transactionInflowTotal) }}</strong></td>
                <td v-if="isAdmin"></td>
              </tr>
            </tfoot>
          </table>
        </MachineryReportSheet>
        <p class="report-footer">
          {{ reportScope }} · {{ $t('ui.moduleColonName', { name: filterModule ? translateModule(filterModule) : $t('ui.all') }) }} · {{ $t('ui.recordsCount', { n: filteredTransactions.length }) }} · {{ $t('ui.generatedColon') }} {{ reportGeneratedAt }}
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { Chart, registerables } from 'chart.js'
import { getManilaReferenceDateString } from '../utils/philippineTime'
import MachineryReportSheet from '../components/MachineryReportSheet.vue'
import { buildPrintableSheetHtml, getMachineryReportPrintStyles } from '../utils/machineryReportPrint'

Chart.register(...registerables)

const { t, locale } = useI18n()
const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const loading = ref(true)
const transactionsLoading = ref(false)
const transactionsError = ref('')
const allLoans = ref([])
const paymentHistory = ref([])
const allTransactions = ref([])
const apiModuleTotals = ref({})
const barangays = ref([])
const machinerySummary = ref({ total_income: 0, total_expenses: 0, net_profit: 0 })
const shareCapitalTotals = ref({ total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 })

const filterBarangay = ref('')
const filterDateFrom = ref('')
const filterDateTo = ref('')
const filterModule = ref('')

const reportSheetMeta = ref({
  contactPerson: '',
  croppingPeriod: '',
  fcaAddress: '',
  contactNumber: ''
})

const moduleFilterOptions = [
  { value: 'Loans', labelKey: 'ui.loans' },
  { value: 'Machinery', labelKey: 'ui.machinery' },
  { value: 'Share Capital', labelKey: 'ui.shareCapital' },
  { value: 'Seed & Fertilizer', labelKey: 'ui.seedFertilizer' },
  { value: 'Association Dues', labelKey: 'ui.associationDues' }
]

const MODULE_LABEL_KEYS = {
  Loans: 'ui.loans',
  Machinery: 'ui.machinery',
  'Share Capital': 'ui.shareCapital',
  'Seed & Fertilizer': 'ui.seedFertilizer',
  'Association Dues': 'ui.associationDues'
}

const TX_TYPE_KEYS = {
  'Machinery Income': 'ui.machineryIncome',
  'Machinery Expense': 'ui.machineryExpenses',
  'Booking Collection': 'ui.bookingCollection',
  'Share Capital Contribution': 'ui.shareCapitalContribution',
  'Share Capital Withdrawal': 'ui.shareCapitalWithdrawal',
  'Seed & Fertilizer Payment': 'ui.seedFertilizerPayment',
  'Association Dues': 'ui.associationDues'
}

function translateModule(module) {
  const key = MODULE_LABEL_KEYS[module]
  return key ? t(key) : (module || '')
}

function translateTxType(type) {
  if (!type) return ''
  const key = TX_TYPE_KEYS[type]
  if (key) return t(key)
  if (type.startsWith('Loan payment')) {
    return type.replace(/^Loan payment/, t('ui.loanPayment'))
  }
  return type
}

const moduleChartRef = ref(null)
const machineryChartRef = ref(null)
let moduleChart = null
let machineryChart = null

const STATUS_ORDER = [
  { key: 'pending', labelKey: 'common.pending' },
  { key: 'approved', labelKey: 'common.approved' },
  { key: 'active', labelKey: 'ui.partialPaid' },
  { key: 'overdue', labelKey: 'common.overdue' },
  { key: 'paid', labelKey: 'ui.fullyPaid' },
  { key: 'rejected', labelKey: 'common.rejected' }
]

const reportGeneratedAt = computed(() =>
  new Date().toLocaleString(locale.value === 'tl' ? 'fil-PH' : 'en-US', { dateStyle: 'medium', timeStyle: 'short' })
)

const isAdmin = computed(() => authStore.currentUser?.role === 'admin')
const isTreasurer = computed(() => authStore.currentUser?.role === 'treasurer')
const userBarangayId = computed(() => authStore.currentUser?.barangay_id)
const canViewShareCapital = computed(() => ['admin', 'president', 'treasurer'].includes(authStore.currentUser?.role))

const barangayOptions = computed(() =>
  barangays.value.map(b => ({
    id: b.id || b.barangay_id,
    name: b.name || b.barangay_name || String(b.id)
  }))
)

const resolveBarangayDisplayName = (barangayId) => {
  if (barangayId == null || barangayId === '') return ''

  const idStr = String(barangayId)
  const fromList = barangays.value.find((b) => String(b.id || b.barangay_id) === idStr)
  if (fromList?.name || fromList?.barangay_name) return fromList.name || fromList.barangay_name

  const user = authStore.currentUser
  if (user?.barangay_name && String(user.barangay_id) === idStr) {
    return user.barangay_name
  }

  return ''
}

const userBarangayName = computed(() => {
  if (!userBarangayId.value) return authStore.currentUser?.barangay_name || ''
  return resolveBarangayDisplayName(userBarangayId.value) || authStore.currentUser?.barangay_name || ''
})

const selectedBarangayName = computed(() => {
  if (!filterBarangay.value) return ''
  const match = barangayOptions.value.find(b => String(b.id) === String(filterBarangay.value))
  return match?.name || ''
})

const getLoanBarangayId = (loan) => String(loan.barangay_id || loan.farmer_barangay || '')

const filteredLoans = computed(() => {
  let list = allLoans.value
  if (filterBarangay.value) {
    list = list.filter(loan => getLoanBarangayId(loan) === String(filterBarangay.value))
  }
  if (filterDateFrom.value) {
    list = list.filter(loan => (loan.application_date || '').slice(0, 10) >= filterDateFrom.value)
  }
  if (filterDateTo.value) {
    list = list.filter(loan => (loan.application_date || '').slice(0, 10) <= filterDateTo.value)
  }
  return list
})

const filteredLoanIds = computed(() => new Set(filteredLoans.value.map(l => l.id)))

const portfolioLoans = computed(() =>
  filteredLoans.value.filter(l => ['approved', 'active', 'overdue', 'paid'].includes(l.status))
)

const totalDisbursed = computed(() =>
  portfolioLoans.value.reduce((sum, loan) => sum + parseFloat(loan.loan_amount || 0), 0)
)

const totalCollected = computed(() =>
  portfolioLoans.value.reduce((sum, loan) => sum + parseFloat(loan.total_paid || 0), 0)
)

const outstandingBalance = computed(() =>
  filteredLoans.value
    .filter(l => ['approved', 'active', 'overdue'].includes(l.status))
    .reduce((sum, loan) => {
      if (loan.status === 'approved') return sum + parseFloat(loan.loan_amount || 0)
      return sum + parseFloat(loan.remaining_balance || loan.loan_amount || 0)
    }, 0)
)

const overdueCount = computed(() => filteredLoans.value.filter(l => l.status === 'overdue').length)

const overdueAmount = computed(() =>
  filteredLoans.value
    .filter(l => l.status === 'overdue')
    .reduce((sum, loan) => sum + parseFloat(loan.total_with_penalty || loan.remaining_balance || loan.loan_amount || 0), 0)
)

const collectionRate = computed(() => {
  if (totalDisbursed.value <= 0) return '0.0'
  return ((totalCollected.value / totalDisbursed.value) * 100).toFixed(1)
})

const activePortfolioCount = computed(() =>
  filteredLoans.value.filter(l => ['approved', 'active', 'overdue'].includes(l.status)).length
)

const filteredPayments = computed(() => {
  let payments = paymentHistory.value.filter(p => filteredLoanIds.value.has(p.loan_id))
  if (filterDateFrom.value) {
    payments = payments.filter(p => (p.payment_date || '').slice(0, 10) >= filterDateFrom.value)
  }
  if (filterDateTo.value) {
    payments = payments.filter(p => (p.payment_date || '').slice(0, 10) <= filterDateTo.value)
  }
  return payments
})

const collectionsPerformance = computed(() => ({
  paymentCount: filteredPayments.value.length,
  totalAmount: filteredPayments.value.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
}))

const machineryIncome = computed(() => parseFloat(machinerySummary.value.total_income || 0))
const machineryExpenses = computed(() => parseFloat(machinerySummary.value.total_expenses || 0))
const machineryNet = computed(() => parseFloat(machinerySummary.value.net_profit || 0))

const shareCapitalMembers = computed(() => shareCapitalTotals.value.total_farmers || 0)
const shareCapitalContributed = computed(() => parseFloat(shareCapitalTotals.value.total_collected || 0))
const shareCapitalWithdrawn = computed(() => parseFloat(shareCapitalTotals.value.total_withdrawn || 0))
const shareCapitalBalance = computed(() => parseFloat(shareCapitalTotals.value.total_balance || 0))

const seedFertilizerCollected = computed(() => parseFloat(apiModuleTotals.value['Seed & Fertilizer']?.inflow || 0))
const seedFertilizerCount = computed(() => apiModuleTotals.value['Seed & Fertilizer']?.count || 0)
const associationDuesCollected = computed(() => parseFloat(apiModuleTotals.value['Association Dues']?.inflow || 0))
const associationDuesCount = computed(() => apiModuleTotals.value['Association Dues']?.count || 0)

const filteredTransactions = computed(() => {
  if (!filterModule.value) return allTransactions.value
  return allTransactions.value.filter(tx => tx.module === filterModule.value)
})

const transactionInflowTotal = computed(() =>
  filteredTransactions.value
    .filter(tx => tx.category !== 'Expense' && tx.category !== 'Withdrawal')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
)

const transactionOutflowTotal = computed(() =>
  filteredTransactions.value
    .filter(tx => tx.category === 'Expense' || tx.category === 'Withdrawal')
    .reduce((sum, tx) => sum + parseFloat(tx.amount || 0), 0)
)

const formatTxDate = (value) => {
  if (!value) return '—'
  const str = String(value).slice(0, 10)
  const [y, m, d] = str.split('-')
  if (!y || !m || !d) return str
  return `${m}/${d}/${y.slice(-2)}`
}

const formatTxAmount = (value) => parseFloat(value || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const txAmountClass = (tx) => {
  if (tx.category === 'Expense' || tx.category === 'Withdrawal') return 'expense'
  return 'collected'
}

const modulePillClass = (module) => {
  const map = {
    Loans: 'pill-loans',
    Machinery: 'pill-machinery',
    'Share Capital': 'pill-share',
    'Seed & Fertilizer': 'pill-seed',
    'Association Dues': 'pill-dues'
  }
  return map[module] || 'pill-default'
}

const moduleSummaryRows = computed(() => [
  {
    key: 'loans',
    label: t('ui.loans'),
    inflow: totalCollected.value,
    outflow: totalDisbursed.value,
    net: totalCollected.value - outstandingBalance.value,
    route: '/admin-loans',
    linkLabel: t('ui.loanManagement')
  },
  {
    key: 'machinery',
    label: t('ui.machinery'),
    inflow: machineryIncome.value,
    outflow: machineryExpenses.value,
    net: machineryNet.value,
    route: '/machinery-financial',
    linkLabel: t('nav.machineryFinancial')
  },
  {
    key: 'share-capital',
    label: t('ui.shareCapital'),
    inflow: shareCapitalContributed.value,
    outflow: shareCapitalWithdrawn.value,
    net: shareCapitalBalance.value,
    route: '/share-capital',
    linkLabel: t('ui.shareCapital')
  },
  {
    key: 'seed-fertilizer',
    label: t('ui.seedFertilizer'),
    inflow: seedFertilizerCollected.value,
    outflow: 0,
    net: seedFertilizerCollected.value,
    route: '/seed-fertilizer-plan',
    linkLabel: t('ui.seedFertilizerPlan'),
    treasurerOnly: true
  },
  {
    key: 'association-dues',
    label: t('ui.associationDues'),
    inflow: associationDuesCollected.value,
    outflow: 0,
    net: associationDuesCollected.value,
    route: '/association-dues',
    linkLabel: t('ui.associationDues'),
    treasurerOnly: true
  }
])

const sumLoanMetrics = (loans) => {
  const outstanding = loans
    .filter(l => ['approved', 'active', 'overdue'].includes(l.status))
    .reduce((sum, l) => {
      if (l.status === 'approved') return sum + parseFloat(l.loan_amount || 0)
      return sum + parseFloat(l.remaining_balance || l.loan_amount || 0)
    }, 0)
  return { count: loans.length, outstanding }
}

const statusSummaryRows = computed(() =>
  STATUS_ORDER.map(({ key, labelKey }) => {
    const loans = filteredLoans.value.filter(l => l.status === key)
    return { status: key, label: t(labelKey), ...sumLoanMetrics(loans) }
  }).filter(row => row.count > 0)
)

const reportScope = computed(() => {
  const parts = []
  if (isAdmin.value) {
    parts.push(filterBarangay.value
      ? t('ui.barangayColon', { name: selectedBarangayName.value })
      : t('ui.allBarangays'))
  } else if (userBarangayName.value) {
    parts.push(t('ui.barangayColon', { name: userBarangayName.value }))
  }
  if (filterDateFrom.value || filterDateTo.value) {
    parts.push(t('ui.periodRange', {
      from: filterDateFrom.value || '…',
      to: filterDateTo.value || '…'
    }))
  }
  if (filterModule.value) {
    parts.push(t('ui.moduleColonName', { name: translateModule(filterModule.value) }))
  }
  return parts.length ? parts.join(' · ') : t('ui.allFinancialModules')
})

const reportEffectiveBarangayId = computed(() => {
  if (isAdmin.value) return filterBarangay.value || ''
  return userBarangayId.value != null && userBarangayId.value !== ''
    ? String(userBarangayId.value)
    : ''
})

const reportBarangayNameForReport = computed(() => {
  const bid = reportEffectiveBarangayId.value
  if (!bid) {
    if (isAdmin.value) return t('ui.allBarangays')
    return authStore.currentUser?.barangay_name || userBarangayName.value || '—'
  }
  return resolveBarangayDisplayName(bid) || selectedBarangayName.value || userBarangayName.value || '—'
})

const reportPeriodLabel = computed(() => {
  if (filterDateFrom.value && filterDateTo.value) {
    return formatReportPeriodCompact(filterDateFrom.value, filterDateTo.value)
  }
  if (filterDateFrom.value) return t('ui.fromDateValue', { date: formatReportDateCompact(filterDateFrom.value) })
  if (filterDateTo.value) return t('ui.untilDateValue', { date: formatReportDateCompact(filterDateTo.value) })
  return t('ui.allDates')
})

const formatReportDateCompact = (dateStr) => {
  if (!dateStr) return '—'
  const d = new Date(dateStr)
  if (Number.isNaN(d.getTime())) return '—'
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  const yy = String(d.getFullYear()).slice(-2)
  return `${mm}/${dd}/${yy}`
}

const formatReportPeriodCompact = (startStr, endStr) => {
  if (!startStr || !endStr) return '—'
  const start = new Date(startStr)
  const end = new Date(endStr)
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '—'
  const fmt = (d) => d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })
  return `${fmt(start)} – ${fmt(end)}`
}

const formatReportMoneyCompact = (num) => {
  const x = parseFloat(num)
  if (Number.isNaN(x)) return '—'
  if (x === 0) return '₱0.00'
  return `₱${x.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

const formatPrintTxAmount = (tx) => {
  const sign = tx.category === 'Expense' || tx.category === 'Withdrawal' ? '-' : '+'
  return `${sign}${formatReportMoneyCompact(tx.amount)}`
}

const getDeviceDate = () => getManilaReferenceDateString()

const getAuthHeaders = () => {
  const headers = { 'Content-Type': 'application/json' }
  if (authStore.token) headers['Authorization'] = `Bearer ${authStore.token}`
  return headers
}

const loadBarangays = async () => {
  try {
    const response = await fetch('/api/barangays')
    const data = await response.json()
    barangays.value = data.barangays || data.data || (Array.isArray(data) ? data : [])
  } catch (err) {
    console.error('Error loading barangays:', err)
  }
}

const loadAllLoans = async () => {
  try {
    const response = await fetch(`/api/loans?deviceDate=${getDeviceDate()}`, { headers: getAuthHeaders() })
    if (response.ok) {
      const data = await response.json()
      allLoans.value = data.loans || []
    }
  } catch (err) {
    console.error('Error loading loans:', err)
  }
}

const loadPaymentHistory = async () => {
  try {
    const response = await fetch('/api/loan-payments/history', { headers: getAuthHeaders() })
    if (response.ok) {
      const data = await response.json()
      paymentHistory.value = data.payments || []
    }
  } catch (err) {
    console.error('Error loading payment history:', err)
    paymentHistory.value = []
  }
}

const loadMachinerySummary = async () => {
  try {
    const userId = authStore.currentUser?.id
    if (!userId) return
    const params = new URLSearchParams({ user_id: String(userId) })
    if (filterDateFrom.value) params.set('start_date', filterDateFrom.value)
    if (filterDateTo.value) params.set('end_date', filterDateTo.value)
    if (isAdmin.value && filterBarangay.value) params.set('barangay_id', filterBarangay.value)
    const response = await fetch(`/api/machinery-financial/profit-summary?${params}`, { headers: getAuthHeaders() })
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.summary) {
        machinerySummary.value = data.summary
      }
    }
  } catch (err) {
    console.error('Error loading machinery summary:', err)
  }
}

const loadShareCapitalSummary = async () => {
  if (!canViewShareCapital.value) {
    shareCapitalTotals.value = { total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 }
    return
  }

  const targets = []
  if (isAdmin.value) {
    if (filterBarangay.value) {
      targets.push(filterBarangay.value)
    } else {
      targets.push(...barangayOptions.value.map(b => String(b.id)))
    }
  } else if (userBarangayId.value) {
    targets.push(String(userBarangayId.value))
  }

  const aggregated = { total_farmers: 0, total_collected: 0, total_withdrawn: 0, total_balance: 0 }

  for (const barangayId of targets) {
    try {
      const params = new URLSearchParams({ barangay_id: barangayId })
      const response = await fetch(`/api/share-capital/overview?${params}`, { headers: getAuthHeaders() })
      if (!response.ok) continue
      const data = await response.json()
      if (!data.success || !data.totals) continue
      aggregated.total_farmers += data.totals.total_farmers || 0
      aggregated.total_collected += parseFloat(data.totals.total_collected || 0)
      aggregated.total_withdrawn += parseFloat(data.totals.total_withdrawn || 0)
      aggregated.total_balance += parseFloat(data.totals.total_balance || 0)
    } catch (err) {
      console.error(`Error loading share capital for barangay ${barangayId}:`, err)
    }
  }

  shareCapitalTotals.value = aggregated
}

const loadAllTransactions = async () => {
  transactionsLoading.value = true
  transactionsError.value = ''
  try {
    const params = new URLSearchParams()
    if (filterDateFrom.value) params.set('start_date', filterDateFrom.value)
    if (filterDateTo.value) params.set('end_date', filterDateTo.value)
    if (isAdmin.value && filterBarangay.value) params.set('barangay_id', filterBarangay.value)

    const response = await fetch(`/api/financial-overview/transactions?${params}`, { headers: getAuthHeaders() })
    const data = await response.json().catch(() => ({}))
    if (!response.ok || !data.success) {
      allTransactions.value = []
      apiModuleTotals.value = {}
      transactionsError.value = data.message || `Hindi ma-load ang transactions (HTTP ${response.status}). I-restart ang backend server kung bagong route.`
      return
    }
    allTransactions.value = data.transactions || []
    apiModuleTotals.value = data.module_totals || {}
  } catch (err) {
    console.error('Error loading consolidated transactions:', err)
    allTransactions.value = []
    apiModuleTotals.value = {}
    transactionsError.value = 'Hindi ma-load ang transactions. Siguraduhing tumatakbo ang backend server.'
  } finally {
    transactionsLoading.value = false
  }
}

const loadAllData = async () => {
  loading.value = true
  await Promise.all([
    loadAllLoans(),
    loadPaymentHistory(),
    loadMachinerySummary(),
    loadShareCapitalSummary(),
    loadAllTransactions()
  ])
  loading.value = false
  await nextTick()
  renderCharts()
}

const clearFilters = () => {
  filterBarangay.value = ''
  filterDateFrom.value = ''
  filterDateTo.value = ''
  filterModule.value = ''
}

// Print report — iframe print that also works on mobile Safari/Chrome
let overviewPrintFrame = null

const PRINT_PAGE_WIDTH = 794
const PRINT_PAGE_HEIGHT = 1123

const removeMobilePrintOverlay = () => {
  const overlay = document.getElementById('fo-mobile-print-overlay')
  if (overlay) overlay.remove()
  document.documentElement.style.removeProperty('overflow')
  document.body.style.removeProperty('overflow')
}

const removeOverviewPrintFrame = () => {
  removeMobilePrintOverlay()
  if (overviewPrintFrame?.parentNode) {
    overviewPrintFrame.parentNode.removeChild(overviewPrintFrame)
  }
  overviewPrintFrame = null
}

const waitForPrintFrameAssets = (doc) => {
  const images = Array.from(doc.images || [])
  if (!images.length) return Promise.resolve()
  return Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
          })
    )
  )
}

const isMobilePrintDevice = () =>
  /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
  (navigator.maxTouchPoints > 0 && window.matchMedia('(max-width: 900px)').matches) ||
  window.matchMedia('(max-width: 768px)').matches

const buildOverviewPrintMarkup = (printableHtml, { mobilePreview = false } = {}) => {
  const printStyles = getMachineryReportPrintStyles('portrait')

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
      body { padding: 12px 0 28px !important; }
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
        width: ${PRINT_PAGE_WIDTH}px;
        min-height: ${PRINT_PAGE_HEIGHT}px;
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
    }
    @media print {
      html, body { background: #fff !important; padding: 0 !important; }
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
      .mobile-print-page #printable-report { padding: 0 !important; }
    }
  `
    : ''

  const bodyHtml = mobilePreview
    ? `<div class="mobile-print-stage"><div class="mobile-print-page" data-orientation="portrait">${printableHtml}</div></div>`
    : printableHtml

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  <title>${t('ui.financialOverview')} — ${t('ui.allTransactions')}</title>
  <style>${printStyles}${mobilePreviewStyles}</style>
</head>
<body>
  ${bodyHtml}
</body>
</html>`
}

const fitMobilePrintPreview = (iframe) => {
  const doc = iframe.contentDocument
  if (!doc) return
  const stage = doc.querySelector('.mobile-print-stage')
  const page = doc.querySelector('.mobile-print-page')
  if (!stage || !page) return

  const viewportW = Math.max(280, iframe.clientWidth || doc.documentElement.clientWidth || 320)
  const available = Math.max(260, viewportW - 16)
  const scale = Math.min(1, available / PRINT_PAGE_WIDTH)

  page.style.transform = 'none'
  const naturalHeight = Math.max(PRINT_PAGE_HEIGHT, page.scrollHeight || PRINT_PAGE_HEIGHT)
  const left = Math.max(0, (viewportW - PRINT_PAGE_WIDTH * scale) / 2)

  page.style.transformOrigin = 'top left'
  page.style.transform = `scale(${scale})`
  page.style.left = `${left}px`
  page.style.top = '0'
  stage.style.height = `${Math.ceil(naturalHeight * scale)}px`
}

const printReport = async () => {
  const printContents = document.getElementById('printable-report')
  if (!printContents) return

  const mobile = isMobilePrintDevice()

  // Build sync while still in the click gesture (needed for mobile print reliability)
  const printableHtml = buildPrintableSheetHtml(printContents, reportSheetMeta.value)
  const printMarkup = buildOverviewPrintMarkup(printableHtml, { mobilePreview: mobile })

  removeOverviewPrintFrame()

  // Mobile: visible same-page A4 preview (scaled) + Print/Close bar (no flashing)
  if (mobile) {
    const overlay = document.createElement('div')
    overlay.id = 'fo-mobile-print-overlay'
    overlay.setAttribute('role', 'dialog')
    overlay.setAttribute('aria-label', 'Print preview')
    overlay.style.cssText = [
      'position:fixed',
      'inset:0',
      'z-index:2147483000',
      'display:flex',
      'flex-direction:column',
      'background:#64748b',
      'padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)',
      'box-sizing:border-box'
    ].join(';')

    const bar = document.createElement('div')
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
    ].join(';')

    const titleWrap = document.createElement('div')
    titleWrap.style.cssText = 'flex:1 1 140px;min-width:0;display:flex;flex-direction:column;gap:2px'

    const hint = document.createElement('span')
    hint.textContent = 'Print preview'
    hint.style.cssText =
      'font-size:13px;font-weight:700;line-height:1.2;white-space:nowrap;overflow:hidden;text-overflow:ellipsis'

    const sub = document.createElement('span')
    sub.textContent = 'Portrait · Tap Print when ready'
    sub.style.cssText = 'font-size:11px;font-weight:500;opacity:0.78;line-height:1.2'

    const actions = document.createElement('div')
    actions.style.cssText = 'display:flex;flex:0 0 auto;gap:8px;align-items:center;margin-left:auto'

    const printBtn = document.createElement('button')
    printBtn.type = 'button'
    printBtn.textContent = 'Print'
    printBtn.style.cssText =
      'flex:0 0 auto;border:0;border-radius:8px;padding:10px 14px;font-weight:700;font-size:14px;background:#16a34a;color:#fff'

    const closeBtn = document.createElement('button')
    closeBtn.type = 'button'
    closeBtn.textContent = 'Close'
    closeBtn.style.cssText =
      'flex:0 0 auto;border:0;border-radius:8px;padding:10px 14px;font-weight:700;font-size:14px;background:#e2e8f0;color:#0f172a'

    const frameWrap = document.createElement('div')
    frameWrap.style.cssText = ['flex:1 1 auto', 'min-height:0', 'position:relative', 'background:#94a3b8'].join(';')

    const iframe = document.createElement('iframe')
    iframe.setAttribute('title', 'Financial overview report print')
    iframe.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;border:0;background:#94a3b8'

    titleWrap.appendChild(hint)
    titleWrap.appendChild(sub)
    actions.appendChild(printBtn)
    actions.appendChild(closeBtn)
    bar.appendChild(titleWrap)
    bar.appendChild(actions)
    frameWrap.appendChild(iframe)
    overlay.appendChild(bar)
    overlay.appendChild(frameWrap)
    document.body.appendChild(overlay)
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
    overviewPrintFrame = iframe

    const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
    const iframeWindow = iframe.contentWindow
    if (!iframeDoc || !iframeWindow) {
      removeOverviewPrintFrame()
      return
    }

    iframeDoc.open()
    iframeDoc.write(printMarkup)
    iframeDoc.close()

    const syncFit = () => fitMobilePrintPreview(iframe)
    syncFit()
    window.setTimeout(syncFit, 50)
    window.setTimeout(syncFit, 250)

    const onResize = () => syncFit()
    window.addEventListener('resize', onResize)
    window.addEventListener('orientationchange', onResize)
    const stopFitListeners = () => {
      window.removeEventListener('resize', onResize)
      window.removeEventListener('orientationchange', onResize)
    }

    const triggerPrint = () => {
      try {
        iframeWindow.focus()
        iframeWindow.print()
      } catch (error) {
        console.error('Mobile print failed:', error)
      }
    }

    printBtn.addEventListener('click', triggerPrint)
    closeBtn.addEventListener('click', () => {
      stopFitListeners()
      removeOverviewPrintFrame()
    })

    return
  }

  await nextTick()

  const iframe = document.createElement('iframe')
  iframe.setAttribute('title', 'Financial overview report print')
  iframe.setAttribute('aria-hidden', 'true')
  iframe.style.cssText = [
    'position:fixed',
    'top:0',
    'left:0',
    `width:${PRINT_PAGE_WIDTH}px`,
    `height:${PRINT_PAGE_HEIGHT}px`,
    'border:0',
    'opacity:0.01',
    'z-index:-1',
    'pointer-events:none'
  ].join(';')

  document.body.appendChild(iframe)
  overviewPrintFrame = iframe

  const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document
  const iframeWindow = iframe.contentWindow

  if (!iframeDoc || !iframeWindow) {
    removeOverviewPrintFrame()
    return
  }

  iframeDoc.open()
  iframeDoc.write(printMarkup)
  iframeDoc.close()

  const cleanup = () => {
    removeOverviewPrintFrame()
    iframeWindow.removeEventListener('afterprint', cleanup)
  }
  iframeWindow.addEventListener('afterprint', cleanup, { once: true })
  window.setTimeout(cleanup, 120000)

  try {
    await waitForPrintFrameAssets(iframeDoc)
  } catch (_) {
    /* ignore asset wait errors */
  }

  await new Promise((resolve) => window.setTimeout(resolve, 80))

  try {
    iframeWindow.focus()
    iframeWindow.print()
  } catch (error) {
    console.error('Print failed:', error)
    cleanup()
  }
}

onBeforeUnmount(() => {
  removeOverviewPrintFrame()
})

const renderCharts = () => {
  renderModuleChart()
  renderMachineryChart()
}

const getChartAxisStyle = () => {
  if (isLight.value) {
    return {
      tickColor: '#000000',
      gridColor: 'rgba(0, 0, 0, 0.12)',
      legendColor: '#000000',
      doughnutBorder: '#ffffff',
      borderColor: 'rgba(0, 0, 0, 0.2)',
      gridLineWidth: 1
    }
  }
  return {
    tickColor: '#ffffff',
    gridColor: 'rgba(167, 211, 178, 0.42)',
    borderColor: 'rgba(167, 211, 178, 0.5)',
    legendColor: '#ffffff',
    doughnutBorder: 'rgba(236, 253, 245, 0.12)',
    gridLineWidth: 1.5
  }
}

const renderModuleChart = () => {
  if (!moduleChartRef.value) return
  if (moduleChart) moduleChart.destroy()

  const axis = getChartAxisStyle()
  const labels = [
    t('ui.loans'),
    t('ui.machinery'),
    t('ui.shareCapital'),
    t('ui.seedFertilizer'),
    t('ui.associationDues')
  ]
  const data = [
    totalCollected.value,
    machineryIncome.value,
    shareCapitalContributed.value,
    seedFertilizerCollected.value,
    associationDuesCollected.value
  ]
  const colors = ['#4ade80', '#38bdf8', '#a78bfa', '#facc15', '#2dd4bf']

  moduleChart = new Chart(moduleChartRef.value.getContext('2d'), {
    type: 'doughnut',
    data: {
      labels,
      datasets: [{ data, backgroundColor: colors, borderColor: axis.doughnutBorder, borderWidth: 2 }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: '58%',
      plugins: {
        legend: { position: 'bottom', labels: { color: axis.legendColor, boxWidth: 12, font: { size: 11 } } }
      }
    }
  })
}

const renderMachineryChart = () => {
  if (!machineryChartRef.value) return
  if (machineryChart) machineryChart.destroy()

  const axis = getChartAxisStyle()

  machineryChart = new Chart(machineryChartRef.value.getContext('2d'), {
    type: 'bar',
    data: {
      labels: [t('ui.income'), t('ui.expenses'), t('ui.net')],
      datasets: [{
        data: [machineryIncome.value, machineryExpenses.value, machineryNet.value],
        backgroundColor: ['#4ade80', '#f87171', machineryNet.value >= 0 ? '#38bdf8' : '#fb923c'],
        borderRadius: 6
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: axis.tickColor, font: { size: 11 } },
          grid: { color: axis.gridColor, lineWidth: axis.gridLineWidth || 1.5 },
          border: { color: axis.borderColor, width: 1.5 }
        },
        y: {
          ticks: { color: axis.tickColor, font: { size: 10 }, callback: (v) => '₱' + Number(v).toLocaleString() },
          grid: { color: axis.gridColor, lineWidth: axis.gridLineWidth || 1.5 },
          border: { color: axis.borderColor, width: 1.5 }
        }
      }
    }
  })
}

const csvEscape = (val) => {
  const str = String(val ?? '')
  return str.includes(',') || str.includes('"') ? `"${str.replace(/"/g, '""')}"` : str
}

const exportCSV = () => {
  const headerCols = ['Date', 'Module', 'Category', 'Type', t('ui.farmer'), 'Description', 'Amount', 'Receipt', 'Barangay']
  const rows = [
    ['Financial Overview — All Transactions'],
    ['Generated', reportGeneratedAt.value],
    ['Scope', reportScope.value],
    ['Records', filteredTransactions.value.length],
    [],
    headerCols,
    ...filteredTransactions.value.map((tx) => [
      tx.date,
      tx.module,
      tx.category,
      tx.type,
      tx.farmer_name || '',
      tx.description,
      (tx.category === 'Expense' || tx.category === 'Withdrawal' ? -1 : 1) * parseFloat(tx.amount || 0),
      tx.receipt_number || '',
      tx.barangay_name || ''
    ]),
    [],
    ['Total inflow (filtered)', transactionInflowTotal.value],
    ['Total outflow (filtered)', transactionOutflowTotal.value]
  ]

  const csv = rows.map((row) => row.map(csvEscape).join(',')).join('\n')
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = window.URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  const suffix = filterModule.value
    ? filterModule.value.toLowerCase().replace(/[^a-z0-9]+/g, '-')
    : 'all'
  a.download = `financial-overview-transactions-${suffix}-${new Date().toISOString().split('T')[0]}.csv`
  a.click()
  window.URL.revokeObjectURL(url)
}

watch([filterBarangay, filterDateFrom, filterDateTo], () => {
  loadMachinerySummary()
  loadShareCapitalSummary()
  loadAllTransactions()
})

watch([filteredLoans, machinerySummary, shareCapitalTotals, apiModuleTotals], async () => {
  await nextTick()
  renderCharts()
})

watch(isLight, () => {
  nextTick(() => renderCharts())
})

watch(locale, () => {
  nextTick(() => renderCharts())
})

onMounted(async () => {
  const role = authStore.currentUser?.role
  if (isAdmin.value || role === 'treasurer' || role === 'president') {
    await loadBarangays()
  }
  await loadAllData()
})
</script>

<style scoped>
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Poppins:wght@600;700;800&display=swap');

.financial-overview-container {
  min-height: calc(100vh - 70px);
  padding: 1.25rem 1.25rem 2rem;
  max-width: none;
  width: 100%;
  margin: 0 auto;
  font-family: 'Inter', sans-serif;
  position: relative;
  isolation: isolate;
  box-sizing: border-box;
  overflow-x: hidden;
}

.fo-print-source {
  position: fixed;
  left: -10000px;
  top: 0;
  width: 794px;
  visibility: hidden;
  pointer-events: none;
  overflow: hidden;
  z-index: -1;
}

.page-header,
.page-header-split {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.85rem;
  margin-bottom: 1rem;
  padding: 1.15rem 1.25rem 1rem;
  background: white;
  border-radius: 14px;
  border: 1px solid #e5e7eb;
  text-align: left;
  position: relative;
  overflow: hidden;
}

.page-header-text {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  align-items: flex-start;
  text-align: left;
  max-width: none;
  margin: 0;
}

.page-title {
  font-size: 1.75rem;
  font-weight: 800;
  color: #111827;
  margin: 0;
  font-family: 'Poppins', sans-serif;
  line-height: 1.2;
  letter-spacing: -0.02em;
  text-align: left;
}

.page-subtitle {
  font-size: 0.9rem;
  color: #374151;
  margin: 0;
  line-height: 1.4;
  font-weight: 600;
  max-width: none;
  text-align: left;
}

.page-note {
  font-size: 13px;
  color: #6b7280;
  margin: 8px 0 0;
  line-height: 1.45;
}

.inline-link, .view-all-link {
  font-weight: 700;
  color: #059669;
  text-decoration: none;
  font-size: 0.8rem;
}

.inline-link:hover, .view-all-link:hover { text-decoration: underline; }

.header-actions {
  display: flex;
  gap: 0.45rem;
  flex-wrap: wrap;
  align-items: center;
  flex-shrink: 0;
}

.export-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  padding: 0.45rem 0.85rem;
  min-height: 2.4rem;
  background: linear-gradient(135deg, #166534, #14532d);
  color: #ffffff;
  border: 1px solid #14532d;
  border-radius: 9px;
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.15s ease;
}

.export-btn:hover {
  filter: brightness(1.05);
  transform: translateY(-1px);
}

.export-btn-secondary {
  background: #f0fdf4;
  color: #14532d;
  border-color: #166534;
}

.export-btn-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
  display: block;
}

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
  align-items: flex-end;
  margin-bottom: 0.75rem;
  padding: 0.7rem 0.85rem;
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
}

.filter-group {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  min-width: 0;
}

.filter-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: #052e16;
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.filter-input {
  padding: 0.5rem 0.7rem;
  border: 1px solid #94a3b8;
  border-radius: 9px;
  font-size: 0.85rem;
  min-width: 140px;
  min-height: 2.4rem;
  color: #000000;
  background: #ffffff;
  box-sizing: border-box;
}

.mf-date-field {
  position: relative;
  width: 100%;
  display: block;
}

.mf-date-input {
  position: relative;
  width: 100%;
  min-width: 0;
  padding-right: 2.6rem !important;
  color-scheme: light;
}

.mf-date-input::-webkit-calendar-picker-indicator {
  position: absolute;
  top: 0;
  right: 0;
  width: 2.6rem;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
}

.mf-date-icon {
  position: absolute;
  right: 6px;
  top: 0;
  bottom: 0;
  margin: auto 0;
  width: 1.65rem;
  height: 1.65rem;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  box-sizing: border-box;
  color: #15803d;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 1px solid #16a34a;
  border-radius: 6px;
  pointer-events: none;
  z-index: 2;
}

.mf-date-icon svg {
  width: 0.85rem;
  height: 0.85rem;
  display: block;
  margin: 0;
}

.financial-overview-container:not(.light-theme) .mf-date-icon {
  color: #ecfdf5;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.72), rgba(21, 128, 61, 0.62));
  border-color: rgba(134, 239, 172, 0.55);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
}

.financial-overview-container.light-theme .mf-date-icon {
  color: #15803d;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: #16a34a;
}

.filter-clear-btn {
  padding: 0.45rem 0.85rem;
  min-height: 2.4rem;
  border: 1px solid #86efac;
  border-radius: 9px;
  background: #f0fdf4;
  font-size: 0.8rem;
  font-weight: 700;
  color: #166534;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.print-only { display: none; }

.report-banner { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e5e7eb; }
.report-banner h2 { margin: 0 0 6px; font-size: 18px; }
.report-banner p { margin: 0; font-size: 12px; color: #6b7280; }
.report-footer { margin-top: 20px; font-size: 11px; color: #6b7280; line-height: 1.5; }

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 0.65rem;
  margin-bottom: 0.85rem;
}

.stat-card {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  background: white;
  border-radius: 12px;
  padding: 0.7rem 0.8rem;
  border: 1px solid #e5e7eb;
  border-left-width: 3px;
}

.stat-card-loan-collected { border-left-color: #16a34a; }
.stat-card-loan-outstanding { border-left-color: #d97706; }
.stat-card-machinery-income { border-left-color: #2563eb; }
.stat-card-machinery-expense { border-left-color: #dc2626; }
.stat-card-machinery-net { border-left-color: #0891b2; }
.stat-card-share-balance { border-left-color: #7c3aed; }
.stat-card-share-contributed { border-left-color: #059669; }

.stat-icon-wrap {
  width: 2.35rem;
  height: 2.35rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  border: 1px solid transparent;
  box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.stat-card:hover .stat-icon-wrap {
  transform: translateY(-1px);
}

.stat-icon-wrap svg {
  width: 1.1rem;
  height: 1.1rem;
  display: block;
}

.stat-card-loan-collected .stat-icon-wrap {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #15803d;
  border-color: #86efac;
}

.stat-card-loan-outstanding .stat-icon-wrap {
  background: linear-gradient(135deg, #ffedd5 0%, #fed7aa 100%);
  color: #c2410c;
  border-color: #fdba74;
}

.stat-card-machinery-income .stat-icon-wrap {
  background: linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%);
  color: #1d4ed8;
  border-color: #93c5fd;
}

.stat-card-machinery-expense .stat-icon-wrap {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #b91c1c;
  border-color: #fca5a5;
}

.stat-card-machinery-net .stat-icon-wrap {
  background: linear-gradient(135deg, #cffafe 0%, #a5f3fc 100%);
  color: #0e7490;
  border-color: #67e8f9;
}

.stat-card-share-balance .stat-icon-wrap {
  background: linear-gradient(135deg, #ede9fe 0%, #ddd6fe 100%);
  color: #6d28d9;
  border-color: #c4b5fd;
}

.stat-card-share-contributed .stat-icon-wrap {
  background: linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%);
  color: #047857;
  border-color: #6ee7b7;
}

.stat-icon-peso {
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1;
}

.stat-info {
  text-align: left;
  min-width: 0;
}

.stat-label {
  font-size: 0.62rem;
  font-weight: 800;
  color: #374151;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  line-height: 1.25;
}

.stat-value {
  font-size: 1.05rem;
  font-weight: 800;
  color: #000000;
  margin-top: 0.2rem;
  font-family: 'Poppins', sans-serif;
  line-height: 1.2;
  word-break: break-word;
}

.stat-value.collected { color: #15803d; }
.stat-value.outstanding { color: #b45309; }
.stat-value.overdue { color: #dc2626; }
.stat-value.expense { color: #dc2626; }
.stat-value.rate { color: #2563eb; }
.stat-meta { font-size: 12px; color: #6b7280; margin-top: 4px; }

.charts-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 0.75rem;
  margin-bottom: 0.85rem;
}

.chart-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 16px;
  padding: 20px;
}

.chart-title {
  font-size: 1.0625rem;
  font-weight: 800;
  color: #052e16;
  margin: 0 0 14px;
  text-align: center;
}

.chart-canvas-wrap {
  height: 260px;
  position: relative;
}

.financial-table-section {
  background: white;
  border-radius: 14px;
  padding: 0.85rem 0.9rem;
  margin-bottom: 0.75rem;
  border: 1px solid #e5e7eb;
}

.module-section { margin-top: 0; }

.table-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.55rem;
}

.section-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: #052e16;
  margin: 0;
}

.financial-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border-radius: 10px;
  border: 1px solid #94a3b8;
}

.financial-table-section > .financial-table {
  border: 1px solid #94a3b8;
  border-radius: 10px;
  overflow: hidden;
}

.financial-table {
  width: 100%;
  border-collapse: collapse;
  margin-bottom: 12px;
  min-width: 680px;
}

.financial-table-wrap .financial-table {
  margin-bottom: 0;
  border: none;
}

.financial-table:last-child { margin-bottom: 0; }

.financial-table th,
.financial-table td {
  padding: 0.55rem 0.7rem;
  text-align: left;
  border-bottom: 1px solid #94a3b8;
  font-size: 0.875rem;
  line-height: 1.35;
}

.financial-table th:not(:last-child),
.financial-table td:not(:last-child) {
  border-right: 1px solid #94a3b8;
}

.financial-table th {
  background: #f0fdf4;
  font-weight: 800;
  color: #052e16;
  font-size: 0.8rem;
  text-transform: none;
  white-space: nowrap;
  border-bottom: 1px solid #16a34a;
}

.financial-table tbody tr:hover,
.financial-overview-container .financial-table tbody tr:hover td {
  background: inherit !important;
}

.financial-overview-container .financial-table th,
.financial-overview-container .financial-table td {
  -webkit-user-select: none;
  user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.financial-overview-container .financial-table ::selection {
  background: transparent;
  color: inherit;
}

.sub-table { margin-top: 12px; }

.detail-link-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.45rem 0.9rem;
  border-radius: 8px;
  font-size: 0.875rem;
  font-weight: 700;
  text-decoration: none !important;
  color: #ffffff !important;
  background: linear-gradient(135deg, #166534, #14532d);
  border: 1px solid #14532d;
  white-space: nowrap;
}

.detail-link-btn:hover {
  filter: brightness(1.06);
}

.detail-link-btn-sm {
  padding: 0.35rem 0.65rem;
  font-size: 0.78rem;
}

.transactions-module-filter {
  margin-top: -8px;
  padding-top: 0;
}

.read-only-note {
  margin: 0;
  flex: 1;
  align-self: center;
  font-size: 0.85rem;
  color: rgba(236, 253, 245, 0.85);
  line-height: 1.4;
}

.view-only-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: #94a3b8;
  font-style: italic;
}

.transactions-error {
  margin: 0 0 12px;
  padding: 10px 12px;
  border-radius: 8px;
  background: rgba(220, 38, 38, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.45);
  color: #fecaca;
  font-size: 0.85rem;
  line-height: 1.4;
}

.transaction-count-badge {
  font-size: 0.82rem;
  font-weight: 700;
  color: #86efac;
  background: rgba(22, 101, 52, 0.35);
  border: 1px solid rgba(134, 239, 172, 0.35);
  border-radius: 999px;
  padding: 0.25rem 0.65rem;
}

.transactions-table-wrap {
  overflow-x: auto;
  max-width: 100%;
}

.financial-table-transactions {
  min-width: 920px;
}

.financial-table-transactions .tx-desc {
  max-width: 280px;
  white-space: normal;
  word-break: break-word;
  font-size: 0.82rem;
}

.financial-table-transactions .text-right {
  text-align: right;
}

.financial-table-transactions .manage-col {
  white-space: nowrap;
  width: 1%;
}

.financial-table-transactions .totals-row td {
  background: rgba(22, 101, 52, 0.15);
  border-top: 2px solid rgba(134, 239, 172, 0.35);
}

.module-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.15rem 0.45rem;
  border-radius: 999px;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.2;
  white-space: nowrap;
}

.module-pill.pill-loans { background: #dcfce7; color: #166534; }
.module-pill.pill-machinery { background: #dbeafe; color: #1d4ed8; }
.module-pill.pill-share { background: #ede9fe; color: #5b21b6; }
.module-pill.pill-seed { background: #fef9c3; color: #a16207; }
.module-pill.pill-dues { background: #ccfbf1; color: #0f766e; }
.module-pill.pill-default { background: #e2e8f0; color: #334155; }

.financial-table .amount { font-weight: 700; }
.financial-table .collected { color: #15803d; font-weight: 700; }
.financial-table .outstanding { color: #b45309; font-weight: 700; }
.financial-table .overdue { color: #dc2626; font-weight: 700; }
.financial-table .expense { color: #dc2626; font-weight: 700; }
.financial-table .rate { color: #2563eb; font-weight: 700; }
.financial-table .loading-cell { text-align: center; color: #6b7280; font-style: italic; padding: 2rem; }

@media print {
  .no-print { display: none !important; }
  .print-only { display: block !important; }
  .financial-overview-container { background: #fff !important; color: #111 !important; padding: 0 !important; }
  .stat-card, .chart-card, .financial-table-section { break-inside: avoid; box-shadow: none !important; border: 1px solid #ddd !important; background: #fff !important; }
}

@media (max-width: 900px) {
  .header-actions { width: 100%; }
  .export-btn { flex: 1; min-width: 0; }
}

/* Dual-render: desktop tables / mobile cards */
.fin-mobile-list { display: none; }
.fin-desktop-table { display: block; width: 100%; }

.fin-mobile-empty {
  padding: 1rem 0.75rem;
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #64748b;
}

.fin-mobile-card {
  padding: 0.55rem 0.6rem 0.5rem;
  border-radius: 12px;
  border: 1px solid rgba(167, 211, 178, 0.35);
  background: rgba(0, 0, 0, 0.04);
}

.fin-mobile-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.45rem;
  margin-bottom: 0.35rem;
}

.fin-mobile-card-top-right {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.1rem;
  flex-shrink: 0;
}

.fin-mobile-card-name {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.25;
  word-break: break-word;
}

.fin-mobile-amount {
  font-size: 0.85rem;
  font-weight: 800;
  line-height: 1.2;
  white-space: nowrap;
}

.fin-mobile-date {
  flex-shrink: 0;
  font-size: 0.62rem;
  font-weight: 600;
  color: #64748b;
}

.fin-mobile-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  margin-bottom: 0.35rem;
}

.fin-mobile-meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  font-size: 0.72rem;
  line-height: 1.3;
}

.fin-mobile-meta-row > span:last-child {
  text-align: right;
  word-break: break-word;
}

.fin-mobile-meta-row--stack {
  flex-direction: column;
  align-items: stretch;
  gap: 0.15rem;
}

.fin-mobile-label {
  flex-shrink: 0;
  min-width: 4rem;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: #64748b;
}

.fin-mobile-card-actions {
  display: flex;
  gap: 0.35rem;
  padding-top: 0.35rem;
  border-top: 1px solid rgba(148, 163, 184, 0.35);
}

.fin-mobile-action {
  font-size: 0.72rem !important;
  padding: 0.3rem 0.55rem !important;
  min-height: 1.85rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.fin-mobile-totals {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.55rem 0.7rem;
  border-radius: 10px;
  border: 1px solid rgba(134, 239, 172, 0.45);
  background: rgba(34, 197, 94, 0.08);
  font-size: 0.8rem;
}

@media (max-width: 768px) {
  .financial-overview-container {
    padding: 0.55rem 0.55rem 1.25rem;
  }

  .page-header,
  .page-header-split {
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
    margin-bottom: 0.55rem;
    padding: 0.65rem 0.75rem;
    border-radius: 12px;
  }

  .page-title {
    font-size: 1.15rem !important;
    line-height: 1.2;
  }

  .page-subtitle {
    font-size: 0.72rem !important;
    line-height: 1.3;
  }

  .header-actions {
    width: 100%;
    gap: 0.35rem;
  }

  .export-btn {
    flex: 1;
    min-height: 2rem;
    padding: 0.35rem 0.55rem;
    font-size: 0.72rem;
  }

  .export-btn-icon {
    width: 0.85rem;
    height: 0.85rem;
  }

  .filters-bar {
    flex-direction: column;
    align-items: stretch;
    gap: 0.35rem;
    padding: 0.45rem 0.55rem;
    margin-bottom: 0.45rem;
    border-radius: 10px;
  }

  .filter-group {
    width: 100%;
    gap: 0.12rem;
  }
  .filter-label { font-size: 0.55rem; }
  .filter-input,
  .filter-clear-btn {
    width: 100%;
    min-width: 0;
    min-height: 1.85rem;
    height: 1.85rem;
    font-size: 0.75rem;
    padding: 0.2rem 0.5rem;
    box-sizing: border-box;
  }

  .filter-clear-btn { margin-top: 0.1rem; }

  .mf-date-field { height: 1.85rem; }
  .mf-date-input {
    height: 1.85rem;
    padding-right: 2.15rem !important;
  }
  .mf-date-icon {
    width: 1.35rem;
    height: 1.35rem;
    right: 0.28rem;
    top: 0;
    bottom: 0;
    margin: auto 0;
    transform: none;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .mf-date-icon svg {
    width: 0.72rem;
    height: 0.72rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
    margin-bottom: 0.55rem;
  }

  .stat-card {
    padding: 0.5rem 0.55rem;
    gap: 0.45rem;
    border-radius: 10px;
  }

  .stat-icon-wrap {
    width: 1.85rem;
    height: 1.85rem;
    border-radius: 8px;
  }

  .stat-icon-wrap svg {
    width: 0.9rem;
    height: 0.9rem;
  }

  .stat-label { font-size: 0.52rem; }
  .stat-value { font-size: 0.85rem; margin-top: 0.1rem; }
  .stat-icon-peso { font-size: 1rem; }

  .detail-link-btn {
    padding: 0.35rem 0.65rem;
    font-size: 0.72rem;
    min-height: 1.85rem;
  }

  .transaction-count-badge {
    font-size: 0.68rem;
    padding: 0.15rem 0.45rem;
  }

  .transactions-module-filter {
    margin-top: 0;
  }

  .charts-row {
    grid-template-columns: 1fr;
    gap: 0.55rem;
    margin-bottom: 0.55rem;
  }

  .chart-card {
    padding: 0.65rem;
    border-radius: 12px;
  }

  .chart-title { font-size: 0.85rem; }

  .financial-table-section {
    padding: 0.65rem 0.7rem;
    margin-bottom: 0.55rem;
    border-radius: 12px;
  }

  .section-title { font-size: 0.85rem; }
  .table-header { margin-bottom: 0.45rem; }

  .fin-desktop-table { display: none !important; }
  .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.45rem;
    width: 100%;
  }

  /* Defeat global style.css table→card stacking on metric summary tables */
  :deep(.financial-table),
  :deep(.financial-table thead),
  :deep(.financial-table tbody),
  :deep(.financial-table tr),
  :deep(.financial-table th),
  :deep(.financial-table td),
  :deep(.sub-table),
  :deep(.sub-table thead),
  :deep(.sub-table tbody),
  :deep(.sub-table tr),
  :deep(.sub-table th),
  :deep(.sub-table td) {
    display: revert !important;
    width: auto !important;
    position: static !important;
    margin-bottom: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  :deep(.financial-table td::before),
  :deep(.sub-table td::before) {
    content: none !important;
  }

  :deep(.financial-table) {
    min-width: 0 !important;
    width: 100% !important;
  }

  .module-pill {
    font-size: 0.62rem;
    padding: 0.12rem 0.4rem;
  }

  /* Compact metric summary tables (Loans / Machinery / Share Capital / ...) */
  .module-section > .financial-table,
  .module-section > .sub-table {
    font-size: 0.68rem;
    margin-bottom: 0;
    border-radius: 8px;
  }

  .module-section > .financial-table th,
  .module-section > .sub-table th {
    padding: 0.28rem 0.4rem;
    font-size: 0.58rem;
    text-transform: uppercase;
    letter-spacing: 0.03em;
    line-height: 1.25;
  }

  .module-section > .financial-table td,
  .module-section > .sub-table td {
    padding: 0.3rem 0.4rem;
    font-size: 0.68rem;
    line-height: 1.25;
  }

  /* Label column wraps, value columns hug the right edge */
  .module-section > .financial-table th:first-child,
  .module-section > .financial-table td:first-child,
  .module-section > .sub-table th:first-child,
  .module-section > .sub-table td:first-child {
    width: 55%;
    white-space: normal;
  }

  .module-section > .financial-table th:not(:first-child),
  .module-section > .financial-table td:not(:first-child),
  .module-section > .sub-table th:not(:first-child),
  .module-section > .sub-table td:not(:first-child) {
    text-align: right;
    white-space: nowrap;
  }

  .sub-table { margin-top: 0.45rem; }

  /* Section header: title + module link stay on one compact row */
  .table-header {
    gap: 0.4rem;
    flex-wrap: nowrap;
  }

  .table-header .section-title {
    font-size: 0.78rem;
    min-width: 0;
    flex: 1;
  }

  .table-header .detail-link-btn,
  .table-header .view-all-link {
    flex-shrink: 0;
    max-width: 55%;
    padding: 0.25rem 0.5rem;
    font-size: 0.62rem;
    min-height: 1.6rem;
    border-radius: 7px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .table-header .view-only-label {
    flex-shrink: 0;
    font-size: 0.62rem;
  }

  .read-only-note {
    font-size: 0.7rem;
    line-height: 1.35;
  }
}

@media (max-width: 380px) {
  .stats-grid { grid-template-columns: 1fr; }
  .page-title { font-size: 1.05rem !important; }
}

/* Glass theme — dark mode only */
.financial-overview-container:not(.light-theme) {
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%) !important;
  color: #ffffff;
  border-radius: 18px;
}

.financial-overview-container:not(.light-theme) :is(.page-header, .filters-bar, .stat-card, .financial-table-section) {
  background: rgba(28, 42, 33, 0.92) !important;
  border: 1px solid rgba(2, 8, 6, 0.82) !important;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.30), inset 1px 1px 0 rgba(255,255,255,0.05) !important;
}

.financial-overview-container:not(.light-theme) :is(.filter-input, .filter-clear-btn) {
  background: rgba(0,0,0,0.24) !important;
  border-color: rgba(190, 235, 203, 0.24) !important;
}

.financial-overview-container:not(.light-theme) .filter-input option {
  color: #052e16 !important;
  background: #ffffff !important;
}

.financial-overview-container:not(.light-theme) .financial-table th {
  background: rgba(34, 55, 44, 0.95) !important;
  border-bottom: 1px solid #6ee7a8 !important;
}

.financial-overview-container:not(.light-theme) .financial-table th:not(:last-child),
.financial-overview-container:not(.light-theme) .financial-table td:not(:last-child) {
  border-right: 1px solid rgba(4, 14, 10, 0.52) !important;
}

.financial-overview-container:not(.light-theme) .financial-table td {
  border-bottom: 1px solid rgba(4, 14, 10, 0.52) !important;
  color: #ffffff !important;
}

.financial-overview-container:not(.light-theme) :is(
  .financial-table-wrap,
  .financial-table-section > .financial-table,
  .financial-table-section > .sub-table
) {
  border: 1px solid rgba(4, 14, 10, 0.52) !important;
}

.financial-overview-container:not(.light-theme) .financial-table tbody tr:hover,
.financial-overview-container:not(.light-theme) .financial-table tbody tr:hover td {
  background: transparent !important;
}

.financial-overview-container:not(.light-theme) .export-btn {
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  border: 1px solid #86efac !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  box-shadow: 0 6px 16px rgba(6, 78, 35, 0.35) !important;
}

.financial-overview-container:not(.light-theme) .export-btn-secondary {
  background: rgba(255, 255, 255, 0.1) !important;
  border: 1px solid rgba(134, 239, 172, 0.4) !important;
  color: #ecfdf5 !important;
  -webkit-text-fill-color: #ecfdf5 !important;
}

.financial-overview-container:not(.light-theme) .export-btn-icon {
  color: inherit !important;
  stroke: currentColor !important;
  -webkit-text-fill-color: initial !important;
}

.financial-overview-container:not(.light-theme) .filter-clear-btn {
  background: rgba(34, 197, 94, 0.18) !important;
  border-color: rgba(134, 239, 172, 0.45) !important;
  color: #ecfdf5 !important;
  -webkit-text-fill-color: #ecfdf5 !important;
}

.financial-overview-container:not(.light-theme) .stat-card-loan-collected .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.72), rgba(21, 128, 61, 0.62)) !important;
  color: #ecfdf5 !important;
  border-color: rgba(134, 239, 172, 0.55) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.financial-overview-container:not(.light-theme) .stat-card-loan-outstanding .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(251, 146, 60, 0.72), rgba(234, 88, 12, 0.62)) !important;
  color: #fff7ed !important;
  border-color: rgba(253, 186, 116, 0.55) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.financial-overview-container:not(.light-theme) .stat-card-machinery-income .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(59, 130, 246, 0.72), rgba(37, 99, 235, 0.62)) !important;
  color: #eff6ff !important;
  border-color: rgba(147, 197, 253, 0.55) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.financial-overview-container:not(.light-theme) .stat-card-machinery-expense .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.72), rgba(185, 28, 28, 0.62)) !important;
  color: #fff1f2 !important;
  border-color: rgba(252, 165, 165, 0.55) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.financial-overview-container:not(.light-theme) .stat-card-machinery-net .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(45, 212, 191, 0.72), rgba(13, 148, 136, 0.62)) !important;
  color: #ecfdf5 !important;
  border-color: rgba(94, 234, 212, 0.55) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.financial-overview-container:not(.light-theme) .stat-card-share-balance .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(167, 139, 250, 0.72), rgba(124, 58, 237, 0.62)) !important;
  color: #f5f3ff !important;
  border-color: rgba(196, 181, 253, 0.55) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.financial-overview-container:not(.light-theme) .stat-card-share-contributed .stat-icon-wrap {
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.72), rgba(5, 150, 105, 0.62)) !important;
  color: #ecfdf5 !important;
  border-color: rgba(110, 231, 183, 0.55) !important;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.28), inset 0 1px 0 rgba(255, 255, 255, 0.18) !important;
}

.financial-overview-container:not(.light-theme) .stat-icon-wrap svg,
.financial-overview-container:not(.light-theme) .stat-icon-wrap svg * {
  stroke: currentColor !important;
  color: inherit !important;
  -webkit-text-fill-color: initial !important;
}

.financial-overview-container:not(.light-theme) .stat-icon-peso {
  color: inherit !important;
  -webkit-text-fill-color: initial !important;
}

.financial-overview-container:not(.light-theme) .stat-value.collected {
  color: #86efac !important;
  -webkit-text-fill-color: #86efac !important;
}

.financial-overview-container:not(.light-theme) .stat-value.outstanding {
  color: #fdba74 !important;
  -webkit-text-fill-color: #fdba74 !important;
}

.financial-overview-container:not(.light-theme) .stat-value.expense,
.financial-overview-container:not(.light-theme) .stat-value.overdue {
  color: #fca5a5 !important;
  -webkit-text-fill-color: #fca5a5 !important;
}

.financial-overview-container:not(.light-theme) .chart-card {
  background: rgba(28, 42, 33, 0.92) !important;
  border: 1px solid rgba(190, 235, 203, 0.14) !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-card {
  background: rgba(0, 0, 0, 0.18) !important;
  border-color: rgba(167, 211, 178, 0.22) !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-card-name,
.financial-overview-container:not(.light-theme) .fin-mobile-meta-row {
  color: #eefde6 !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-amount {
  color: #eefde6 !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-amount.collected,
.financial-overview-container:not(.light-theme) .fin-mobile-meta-row .collected {
  color: #4ade80 !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-amount.expense,
.financial-overview-container:not(.light-theme) .fin-mobile-amount.overdue,
.financial-overview-container:not(.light-theme) .fin-mobile-meta-row .expense,
.financial-overview-container:not(.light-theme) .fin-mobile-meta-row .overdue {
  color: #f87171 !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-label,
.financial-overview-container:not(.light-theme) .fin-mobile-date,
.financial-overview-container:not(.light-theme) .fin-mobile-empty {
  color: rgba(220, 238, 211, 0.62) !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-card-actions {
  border-top-color: rgba(255, 255, 255, 0.08) !important;
}

.financial-overview-container:not(.light-theme) .fin-mobile-totals {
  background: rgba(74, 222, 128, 0.1) !important;
  border-color: rgba(74, 222, 128, 0.35) !important;
  color: #eefde6 !important;
}

.financial-overview-container:not(.light-theme) :is(
  .page-title, .page-subtitle, .section-title, .chart-title, .page-note,
  .stat-label, .stat-value,
  .filter-label, .filter-input,
  .financial-table th, .financial-table td,
  .financial-table .loading-cell,
  .inline-link, .view-all-link,
  .detail-link-btn, .view-only-label, .transaction-count-badge, .tx-desc
) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-overview-container:not(.light-theme) .financial-table .collected {
  color: #86efac !important;
  -webkit-text-fill-color: #86efac !important;
}

.financial-overview-container:not(.light-theme) .financial-table .outstanding {
  color: #fdba74 !important;
  -webkit-text-fill-color: #fdba74 !important;
}

.financial-overview-container:not(.light-theme) .financial-table .overdue,
.financial-overview-container:not(.light-theme) .financial-table .expense {
  color: #fca5a5 !important;
  -webkit-text-fill-color: #fca5a5 !important;
}

.financial-overview-container:not(.light-theme) .financial-table .rate {
  color: #93c5fd !important;
  -webkit-text-fill-color: #93c5fd !important;
}

.financial-overview-container:not(.light-theme) .financial-table .amount {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-overview-container:not(.light-theme) .filter-input::placeholder {
  color: rgba(255, 255, 255, 0.72) !important;
}

/* ===== LIGHT MODE — colors only (geometry matches dark) ===== */
.financial-overview-container.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%) !important;
  color: #052e16;
  border-radius: 18px;
}

.financial-overview-container.light-theme :is(.page-header, .filters-bar, .stat-card, .financial-table-section, .chart-card) {
  background: #ffffff !important;
  border-color: #86efac !important;
  border-width: 1px !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.financial-overview-container.light-theme .page-title,
.financial-overview-container.light-theme .section-title,
.financial-overview-container.light-theme .chart-title {
  color: #052e16 !important;
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: currentColor !important;
}

.financial-overview-container.light-theme :is(.page-subtitle, .stat-label, .filter-label, .stat-meta) {
  color: #166534 !important;
}

.financial-overview-container.light-theme .page-note {
  color: #15803d !important;
}

.financial-overview-container.light-theme :is(.filter-input, .filter-clear-btn) {
  background: #ffffff !important;
  border-color: #94a3b8 !important;
  border-width: 1px !important;
  color: #052e16 !important;
}

.financial-overview-container.light-theme .filter-clear-btn {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

.financial-overview-container.light-theme .export-btn:not(.export-btn-secondary) {
  border-width: 1px !important;
}

.financial-overview-container.light-theme .export-btn.export-btn-secondary {
  background: #f0fdf4 !important;
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
  border-color: #166534 !important;
  border-width: 1px !important;
}

.financial-overview-container.light-theme :is(.financial-table-wrap, .financial-table-section > .financial-table) {
  border-color: #94a3b8 !important;
  border-width: 1px !important;
}

.financial-overview-container.light-theme .fin-mobile-card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

.financial-overview-container.light-theme .fin-mobile-card-name,
.financial-overview-container.light-theme .fin-mobile-meta-row {
  color: #052e16 !important;
}

.financial-overview-container.light-theme .fin-mobile-label,
.financial-overview-container.light-theme .fin-mobile-date,
.financial-overview-container.light-theme .fin-mobile-empty {
  color: #64748b !important;
}

.financial-overview-container.light-theme .fin-mobile-card-actions {
  border-top-color: #bbf7d0 !important;
}

.financial-overview-container.light-theme .fin-mobile-totals {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #052e16 !important;
}

.financial-overview-container.light-theme .stat-value {
  color: #052e16 !important;
}

.financial-overview-container.light-theme .stat-value.collected {
  color: #15803d !important;
}

.financial-overview-container.light-theme .stat-value.outstanding {
  color: #b45309 !important;
}

.financial-overview-container.light-theme .stat-value.overdue,
.financial-overview-container.light-theme .stat-value.expense {
  color: #dc2626 !important;
}

.financial-overview-container.light-theme .stat-value.rate {
  color: #2563eb !important;
}

.financial-overview-container.light-theme :is(.inline-link, .view-all-link) {
  color: #15803d !important;
}

.financial-overview-container.light-theme .export-btn:not(.export-btn-secondary) {
  background: linear-gradient(135deg, #166534, #14532d) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #14532d !important;
}

.financial-overview-container.light-theme .export-btn.export-btn-secondary {
  background: #f0fdf4 !important;
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
  border-color: #166534 !important;
}

.financial-overview-container.light-theme .export-btn.export-btn-secondary .export-btn-icon {
  color: #14532d !important;
  stroke: currentColor !important;
}

.financial-overview-container.light-theme .filter-label {
  color: #374151 !important;
}

.financial-overview-container.light-theme .stat-label {
  color: #374151 !important;
}

.financial-overview-container.light-theme .stat-card-loan-collected .stat-icon-wrap { color: #15803d !important; }
.financial-overview-container.light-theme .stat-card-loan-outstanding .stat-icon-wrap { color: #c2410c !important; }
.financial-overview-container.light-theme .stat-card-machinery-income .stat-icon-wrap { color: #1d4ed8 !important; }
.financial-overview-container.light-theme .stat-card-machinery-expense .stat-icon-wrap { color: #b91c1c !important; }
.financial-overview-container.light-theme .stat-card-machinery-net .stat-icon-wrap { color: #0e7490 !important; }
.financial-overview-container.light-theme .stat-card-share-balance .stat-icon-wrap { color: #6d28d9 !important; }
.financial-overview-container.light-theme .stat-card-share-contributed .stat-icon-wrap { color: #047857 !important; }

.financial-overview-container.light-theme .read-only-note {
  color: #475569 !important;
}

.financial-overview-container.light-theme .view-only-label {
  color: #64748b !important;
}

.financial-overview-container.light-theme .transaction-count-badge {
  color: #166534 !important;
  background: #dcfce7 !important;
  border-color: #86efac !important;
}

.financial-overview-container.light-theme .detail-link-btn {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-overview-container.light-theme .financial-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #052e16 !important;
  border-bottom-color: #16a34a !important;
}

.financial-overview-container.light-theme .financial-table th:not(:last-child),
.financial-overview-container.light-theme .financial-table td:not(:last-child) {
  border-right-color: #94a3b8 !important;
}

.financial-overview-container.light-theme .financial-table td {
  color: #14532d !important;
  border-bottom-color: #94a3b8 !important;
  background: #ffffff !important;
}

.financial-overview-container.light-theme .financial-table tbody tr:nth-child(even) td {
  background: #f8fdf9 !important;
}

.financial-overview-container.light-theme .financial-table .collected {
  color: #15803d !important;
}

.financial-overview-container.light-theme .financial-table .outstanding {
  color: #b45309 !important;
}

.financial-overview-container.light-theme .financial-table .overdue,
.financial-overview-container.light-theme .financial-table .expense {
  color: #dc2626 !important;
}

.financial-overview-container.light-theme .financial-table .rate {
  color: #2563eb !important;
}

.financial-overview-container.light-theme .financial-table .loading-cell {
  color: #166534 !important;
}

/* Lock geometry vs global theme sheets (colors may change; sizes must not) */
body.glass-dark .financial-overview-container:not(.light-theme) :is(
  .export-btn, .export-btn-secondary, .filter-clear-btn, .filter-input, .detail-link-btn, .mf-date-icon
),
body.glass-light .financial-overview-container.light-theme :is(
  .export-btn, .export-btn-secondary, .filter-clear-btn, .filter-input, .detail-link-btn, .mf-date-icon
) {
  border-width: 1px !important;
}

body.glass-dark .financial-overview-container:not(.light-theme) :is(
  .page-header, .filters-bar, .stat-card, .financial-table-section, .chart-card, .fin-mobile-card
),
body.glass-light .financial-overview-container.light-theme :is(
  .page-header, .filters-bar, .stat-card, .financial-table-section, .chart-card, .fin-mobile-card
) {
  border-width: 1px !important;
}

body.glass-dark .financial-overview-container:not(.light-theme) :is(.financial-table-wrap, .financial-table-section > .financial-table),
body.glass-light .financial-overview-container.light-theme :is(.financial-table-wrap, .financial-table-section > .financial-table) {
  border-width: 1px !important;
}

body.glass-dark .financial-overview-container:not(.light-theme) .financial-table th,
body.glass-light .financial-overview-container.light-theme .financial-table th {
  border-bottom-width: 1px !important;
}

body.glass-dark .financial-overview-container:not(.light-theme) .financial-table td,
body.glass-light .financial-overview-container.light-theme .financial-table td {
  border-bottom-width: 1px !important;
}

body.glass-dark .financial-overview-container:not(.light-theme) .financial-table th:not(:last-child),
body.glass-dark .financial-overview-container:not(.light-theme) .financial-table td:not(:last-child),
body.glass-light .financial-overview-container.light-theme .financial-table th:not(:last-child),
body.glass-light .financial-overview-container.light-theme .financial-table td:not(:last-child) {
  border-right-width: 1px !important;
}
</style>

<!-- Unscoped: defeat global style.css mobile table→card stacking -->
<style>
@media (max-width: 768px) {
  .financial-overview-container .fin-desktop-table {
    display: none !important;
  }

  .financial-overview-container .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.45rem;
    width: 100%;
  }

  .financial-overview-container table.financial-table,
  .financial-overview-container table.financial-table thead,
  .financial-overview-container table.financial-table tbody,
  .financial-overview-container table.financial-table tfoot,
  .financial-overview-container table.financial-table tr,
  .financial-overview-container table.financial-table th,
  .financial-overview-container table.financial-table td,
  .financial-overview-container table.sub-table,
  .financial-overview-container table.sub-table thead,
  .financial-overview-container table.sub-table tbody,
  .financial-overview-container table.sub-table tr,
  .financial-overview-container table.sub-table th,
  .financial-overview-container table.sub-table td {
    display: revert !important;
    width: auto !important;
    position: static !important;
    margin-bottom: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .financial-overview-container table.financial-table td::before,
  .financial-overview-container table.sub-table td::before {
    content: none !important;
  }

  .financial-overview-container .module-section > table.financial-table th,
  .financial-overview-container .module-section > table.sub-table th {
    padding: 0.28rem 0.4rem !important;
    font-size: 0.58rem !important;
  }

  .financial-overview-container .module-section > table.financial-table td,
  .financial-overview-container .module-section > table.sub-table td {
    padding: 0.3rem 0.4rem !important;
    font-size: 0.68rem !important;
  }

  .financial-overview-container table.financial-table,
  .financial-overview-container table.sub-table {
    min-width: 0 !important;
    width: 100% !important;
  }

  .financial-overview-container .financial-table-wrap {
    overflow-x: visible !important;
  }

  /* Compact filters — beat global style.css min-height:44px + glass padding */
  .financial-overview-container .filters-bar {
    gap: 0.35rem !important;
    padding: 0.45rem 0.55rem !important;
    margin-bottom: 0.45rem !important;
  }

  .financial-overview-container .filter-group {
    gap: 0.12rem !important;
    width: 100% !important;
  }

  .financial-overview-container .filter-label {
    font-size: 0.55rem !important;
    line-height: 1.15 !important;
    margin: 0 !important;
    letter-spacing: 0.04em !important;
  }

  .financial-overview-container .filters-bar :is(
    .filter-input,
    .filter-clear-btn,
    select.filter-input,
    input.filter-input,
    input.mf-date-input,
    input[type='date']
  ) {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 1.85rem !important;
    height: 1.85rem !important;
    max-height: 1.85rem !important;
    padding: 0.2rem 0.5rem !important;
    font-size: 0.75rem !important;
    line-height: 1.2 !important;
    border-radius: 8px !important;
    box-sizing: border-box !important;
  }

  .financial-overview-container .filters-bar .mf-date-input {
    padding-right: 2.15rem !important;
  }

  .financial-overview-container .filters-bar .mf-date-field {
    position: relative !important;
    display: block !important;
    height: 1.85rem !important;
    min-height: 1.85rem !important;
  }

  .financial-overview-container .filters-bar .mf-date-icon {
    width: 1.35rem !important;
    height: 1.35rem !important;
    right: 0.28rem !important;
    top: 0 !important;
    bottom: 0 !important;
    margin: auto 0 !important;
    transform: none !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    border-radius: 5px !important;
  }

  .financial-overview-container .filters-bar .mf-date-icon svg {
    width: 0.72rem !important;
    height: 0.72rem !important;
    display: block !important;
    margin: 0 !important;
  }

  .financial-overview-container .filters-bar .mf-date-input::-webkit-calendar-picker-indicator {
    width: 2rem !important;
    height: 100% !important;
  }

  .financial-overview-container .filters-bar .filter-clear-btn {
    margin-top: 0.1rem !important;
    font-size: 0.72rem !important;
    font-weight: 700 !important;
  }
}
</style>
