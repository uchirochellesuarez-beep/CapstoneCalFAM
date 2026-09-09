<template>
  <div
    class="financial-container glass-module-page share-capital-page"
    :class="{ 'light-theme': isLight, 'dues-payments-page': isDuesPaymentsPage }"
  >
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ isManagementView ? $t('ui.shareCapital') : $t('ui.duesPayments') }}</h1>
        <p v-if="!isManagementView" class="page-subtitle">{{ $t('ui.duesPaymentsSub') }}</p>
      </div>
    </div>

    <div v-if="!isAllowedRole" class="tab-content">
      <div class="empty-state">
        <div class="empty-title">{{ $t('ui.accessLimited') }}</div>
        <div class="empty-text">{{ $t('ui.duesAvailableHint') }}</div>
      </div>
    </div>

    <div v-else class="tab-content tab-content--main">
      <div v-if="setupError" class="info-banner info-banner--error">
        <strong>{{ $t('ui.setupRequired') }}</strong> {{ setupError }}
        <div v-if="setupError.includes('tables not found')" class="error-hint">
          <strong>Fix needed:</strong> Run the database migration by opening a terminal and executing:
          <div class="code-block">
            mysql -u root -p calffa &lt; backend/migrations/create_share_capital_module.sql
          </div>
          Then restart the backend server. See SHARE_CAPITAL_SETUP.md for details.
        </div>
      </div>

      <!-- Member / officer ledger (transparency — not for recording) -->
      <div v-if="isLedgerView" class="ledger-view">
        <div class="stats-grid">
          <div class="stat-card">
            <div class="stat-label">{{ $t('ui.totalCollected') }}</div>
            <div class="stat-value">₱{{ formatMoney(ledgerTotals.total_collected) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('ui.withdrawal') }}</div>
            <div class="stat-value">₱{{ formatMoney(ledgerTotals.total_withdrawn) }}</div>
          </div>
          <div class="stat-card">
            <div class="stat-label">{{ $t('ui.balance') }}</div>
            <div class="stat-value">₱{{ formatMoney(ledgerTotals.balance) }}</div>
          </div>
        </div>

        <p class="ledger-note">
          <i18n-t keypath="ui.ledgerTotalsNote" tag="span">
            <template #totalCollected>
              <strong>{{ $t('ui.totalCollected') }}</strong>
            </template>
            <template #shareCapital>
              {{ $t('ui.shareCapital') }}
            </template>
            <template #seedFertilizerPlan>
              {{ $t('ui.seedFertilizerPlan') }}
            </template>
            <template #balance>
              <strong>{{ $t('ui.balance') }}</strong>
            </template>
            <template #withdrawal>
              {{ $t('ui.withdrawal') }}
            </template>
            <template #associationDues>
              <strong>{{ $t('ui.associationDues') }}</strong>
            </template>
          </i18n-t>
        </p>

        <div class="card">
            <div class="card-header">
              <h2 class="card-title">{{ $t('ui.shareCapitalPayments') }}</h2>
              <button type="button" class="btn btn-primary-action" @click="loadMe" :disabled="loading">{{ $t('common.refresh') }}</button>
            </div>
            <div class="table-container">
              <div class="fin-desktop-table">
                <table class="data-table ledger-table ledger-table-payments">
                  <colgroup>
                    <col class="col-date" />
                    <col class="col-type" />
                    <col class="col-amount" />
                    <col class="col-status" />
                    <col class="col-receipt" />
                    <col class="col-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="th-date">{{ $t('ui.date') }}</th>
                      <th class="th-type">{{ $t('ui.type') }}</th>
                      <th class="th-amount">{{ $t('ui.amount') }}</th>
                      <th class="th-status">{{ $t('ui.status') }}</th>
                      <th class="th-receipt">{{ $t('ui.receiptNo') }}</th>
                      <th class="th-actions">{{ $t('ui.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loading">
                      <td colspan="6" class="table-empty">{{ $t('common.loading') }}</td>
                    </tr>
                    <tr v-else-if="meContributions.length === 0">
                      <td colspan="6" class="table-empty">{{ $t('ui.noShareCapitalPayments') }}</td>
                    </tr>
                    <tr v-else v-for="c in meContributions" :key="c.id">
                      <td class="td-date">{{ formatDate(c.contribution_date) }}</td>
                      <td class="td-type" :title="formatContributionKind(c.contribution_kind)">
                        <span class="cell-clip">{{ formatContributionKind(c.contribution_kind) }}</span>
                      </td>
                      <td class="amount td-amount">₱{{ formatMoney(c.amount) }}</td>
                      <td class="td-status">
                        <span class="badge" :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'">{{ formatRecordStatus(c.status) }}</span>
                      </td>
                      <td class="td-receipt" :title="c.receipt_number || ''">
                        <span class="cell-clip">{{ c.receipt_number || '—' }}</span>
                      </td>
                      <td class="actions actions-cell td-actions">
                        <button
                          v-if="c.receipt_number"
                          type="button"
                          class="table-action-btn table-action-print"
                          :title="$t('ui.printReceipt')"
                          :aria-label="$t('ui.printReceipt')"
                          @click="printContributionReceipt(c.receipt_number)"
                        >
                          <PrintIcon />
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="fin-mobile-list ledger-mobile-list">
                <div v-if="loading" class="fin-mobile-empty">{{ $t('common.loading') }}</div>
                <div v-else-if="meContributions.length === 0" class="fin-mobile-empty">{{ $t('ui.noShareCapitalPayments') }}</div>
                <article
                  v-else
                  v-for="c in meContributions"
                  :key="'pay-m-' + c.id"
                  class="fin-mobile-card"
                >
                  <div class="fin-mobile-card-top">
                    <h4 class="fin-mobile-card-name">{{ formatContributionKind(c.contribution_kind) }}</h4>
                    <span class="badge" :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'">{{ formatRecordStatus(c.status) }}</span>
                  </div>
                  <div class="fin-mobile-card-meta">
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.date') }}</span>
                      <span class="fin-mobile-value">{{ formatDate(c.contribution_date) }}</span>
                    </div>
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.amount') }}</span>
                      <span class="amount fin-mobile-value">₱{{ formatMoney(c.amount) }}</span>
                    </div>
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.receipt') }}</span>
                      <span class="fin-mobile-value">{{ c.receipt_number || '—' }}</span>
                    </div>
                  </div>
                  <div v-if="c.receipt_number" class="fin-mobile-card-actions">
                    <button
                      type="button"
                      class="table-action-btn table-action-print fin-mobile-action"
                      :title="$t('ui.printReceipt')"
                      :aria-label="$t('ui.printReceipt')"
                      @click="printContributionReceipt(c.receipt_number)"
                    >
                      <PrintIcon />
                      <span>{{ $t('common.print') }}</span>
                    </button>
                  </div>
                </article>
              </div>
            </div>
        </div>

        <div class="card ledger-withdrawals-card">
          <div class="card-header">
            <h2 class="card-title">{{ $t('ui.withdrawalsSavings') }}</h2>
          </div>
          <p class="ledger-dues-hint">
            {{ $t('ui.withdrawalsHint') }}
          </p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="data-table ledger-table ledger-table-withdrawals">
                <colgroup>
                  <col class="col-date" />
                  <col class="col-amount" />
                  <col class="col-remarks" />
                  <col class="col-receipt" />
                  <col class="col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th class="th-date">{{ $t('ui.date') }}</th>
                    <th class="th-amount">{{ $t('ui.amount') }}</th>
                    <th class="th-remarks">{{ $t('ui.remarks') }}</th>
                    <th class="th-receipt">{{ $t('ui.receiptNo') }}</th>
                    <th class="th-actions">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="5" class="table-empty">{{ $t('common.loading') }}</td>
                  </tr>
                  <tr v-else-if="meWithdrawals.length === 0">
                    <td colspan="5" class="table-empty">{{ $t('ui.noWithdrawals') }}</td>
                  </tr>
                  <tr v-else v-for="w in meWithdrawals" :key="w.id">
                    <td class="td-date">{{ formatDate(w.withdrawal_date) }}</td>
                    <td class="amount td-amount">₱{{ formatMoney(w.amount) }}</td>
                    <td class="td-remarks" :title="w.remarks || ''">
                      <span class="cell-clip">{{ w.remarks || '—' }}</span>
                    </td>
                    <td class="td-receipt" :title="w.receipt_number || ''">
                      <span class="cell-clip">{{ w.receipt_number || '—' }}</span>
                    </td>
                    <td class="actions actions-cell td-actions">
                      <button
                        v-if="w.receipt_number"
                        type="button"
                        class="table-action-btn table-action-print"
                        :title="$t('ui.printReceipt')"
                        :aria-label="$t('ui.printReceipt')"
                        @click="printWithdrawalReceipt(w.receipt_number)"
                      >
                        <PrintIcon />
                      </button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="fin-mobile-list ledger-mobile-list">
              <div v-if="loading" class="fin-mobile-empty">{{ $t('common.loading') }}</div>
              <div v-else-if="meWithdrawals.length === 0" class="fin-mobile-empty">{{ $t('ui.noWithdrawals') }}</div>
              <article
                v-else
                v-for="w in meWithdrawals"
                :key="'wd-m-' + w.id"
                class="fin-mobile-card"
              >
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">₱{{ formatMoney(w.amount) }}</h4>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.date') }}</span>
                    <span class="fin-mobile-value">{{ formatDate(w.withdrawal_date) }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.remarks') }}</span>
                    <span class="fin-mobile-value">{{ w.remarks || '—' }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.receipt') }}</span>
                    <span class="fin-mobile-value">{{ w.receipt_number || '—' }}</span>
                  </div>
                </div>
                <div v-if="w.receipt_number" class="fin-mobile-card-actions">
                  <button
                    type="button"
                    class="table-action-btn table-action-print fin-mobile-action"
                    :title="$t('ui.printReceipt')"
                    :aria-label="$t('ui.printReceipt')"
                    @click="printWithdrawalReceipt(w.receipt_number)"
                  >
                    <PrintIcon />
                    <span>{{ $t('common.print') }}</span>
                  </button>
                </div>
              </article>
            </div>
          </div>
        </div>

        <div class="card ledger-dues-card">
          <div class="card-header">
            <h2 class="card-title">{{ $t('ui.associationDues') }}</h2>
            <span class="ledger-dues-total">{{ $t('ui.totalPaidLabel') }} ₱{{ formatMoney(meAssociationDuesTotal) }}</span>
          </div>
          <p class="ledger-dues-hint">
            {{ $t('ui.associationDuesHint') }}
          </p>
          <div class="table-container">
            <div class="fin-desktop-table">
              <table class="data-table ledger-table ledger-table-dues">
                <colgroup>
                  <col class="col-date" />
                  <col class="col-period" />
                  <col class="col-amount" />
                  <col class="col-method" />
                  <col class="col-receipt" />
                </colgroup>
                <thead>
                  <tr>
                    <th class="th-date">{{ $t('ui.date') }}</th>
                    <th class="th-period">{{ $t('ui.period') }}</th>
                    <th class="th-amount">{{ $t('ui.amount') }}</th>
                    <th class="th-method">{{ $t('ui.method') }}</th>
                    <th class="th-receipt">{{ $t('ui.receiptNo') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="loading">
                    <td colspan="5" class="table-empty">{{ $t('common.loading') }}</td>
                  </tr>
                  <tr v-else-if="meAssociationDues.length === 0">
                    <td colspan="5" class="table-empty">{{ $t('ui.noAssociationDues') }}</td>
                  </tr>
                  <tr v-else v-for="d in meAssociationDues" :key="d.id">
                    <td class="td-date">{{ formatDate(d.collection_date) }}</td>
                    <td class="td-period" :title="formatDuesPeriod(d.period_start, d.period_end)">
                      <span class="cell-clip">{{ formatDuesPeriod(d.period_start, d.period_end) }}</span>
                    </td>
                    <td class="amount td-amount">₱{{ formatMoney(d.amount) }}</td>
                    <td class="td-method">{{ formatPaymentMethod(d.payment_method) }}</td>
                    <td class="td-receipt" :title="d.receipt_number || ''">
                      <span class="cell-clip">{{ d.receipt_number || '—' }}</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="fin-mobile-list ledger-mobile-list">
              <div v-if="loading" class="fin-mobile-empty">{{ $t('common.loading') }}</div>
              <div v-else-if="meAssociationDues.length === 0" class="fin-mobile-empty">{{ $t('ui.noAssociationDues') }}</div>
              <article
                v-else
                v-for="d in meAssociationDues"
                :key="'dues-m-' + d.id"
                class="fin-mobile-card"
              >
                <div class="fin-mobile-card-top">
                  <h4 class="fin-mobile-card-name">₱{{ formatMoney(d.amount) }}</h4>
                </div>
                <div class="fin-mobile-card-meta">
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.date') }}</span>
                    <span class="fin-mobile-value">{{ formatDate(d.collection_date) }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.period') }}</span>
                    <span class="fin-mobile-value">{{ formatDuesPeriod(d.period_start, d.period_end) }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.method') }}</span>
                    <span class="fin-mobile-value">{{ formatPaymentMethod(d.payment_method) }}</span>
                  </div>
                  <div class="fin-mobile-meta-row">
                    <span class="fin-mobile-label">{{ $t('ui.receipt') }}</span>
                    <span class="fin-mobile-value">{{ d.receipt_number || '—' }}</span>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </div>
      </div>

      <!-- Treasurer / Admin: record share capital for members -->
      <div v-else-if="isManagementView">
        <div v-if="isAdmin" class="admin-filter-bar">
          <label for="share-capital-barangay" class="admin-filter-label">{{ $t('ui.barangay') }}</label>
          <select
            id="share-capital-barangay"
            v-model="selectedBarangayId"
            class="input admin-filter-select"
            @change="onBarangayChange"
          >
            <option value="">{{ $t('ui.selectBarangay') }}</option>
            <option v-for="b in barangayOptions" :key="b.id" :value="String(b.id)">{{ b.name }}</option>
          </select>
          <span v-if="selectedBarangayName" class="admin-filter-hint">{{ $t('ui.viewingColon', { name: selectedBarangayName }) }}</span>
        </div>

        <div v-if="isAdmin && !selectedBarangayId" class="empty-state empty-state--panel">
          <div class="empty-title">{{ $t('ui.selectABarangay') }}</div>
          <div class="empty-text">{{ $t('ui.chooseBarangayShare') }}</div>
        </div>

        <template v-else>
        <div class="stats-group stats-group--overview">
          <div class="stats-grid stats-grid--overview">
            <div class="stat-card">
              <div class="stat-content">
                <div class="stat-label">{{ $t('ui.totalMembers') }}</div>
                <div class="stat-value">{{ overviewTotals.total_farmers.toLocaleString() }}</div>
              </div>
            </div>
            <div class="stat-card">
              <div class="stat-content">
                <div class="stat-label">{{ $t('ui.totalShareCapital') }}</div>
                <div class="stat-value">₱{{ formatMoney(overviewTotals.total_share_capital_collected) }}</div>
              </div>
            </div>
          </div>
        </div>

        <div class="grid-2">
          <div class="card">
            <div class="card-header">
              <h2 class="card-title">{{ isAdmin && selectedBarangayName ? $t('ui.membersNamed', { name: selectedBarangayName }) : $t('ui.membersYourBarangayPanel') }}</h2>
              <button type="button" class="btn btn-primary-action" @click="loadOverview" :disabled="loading">
                {{ $t('common.refresh') }}
              </button>
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
                    v-model="searchQuery"
                    type="text"
                    class="toolbar-input search-input-main"
                    :placeholder="$t('ui.searchByNameRef')"
                  />
                </div>
              </div>
            </div>

            <div class="table-container">
              <div class="fin-desktop-table">
                <table class="data-table ledger-table ledger-table-members">
                  <colgroup>
                    <col class="col-ref" />
                    <col class="col-member" />
                    <col class="col-status" />
                    <col class="col-amount" />
                    <col class="col-actions" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th class="th-ref">{{ $t('ui.refNo') }}</th>
                      <th class="th-member">{{ $t('ui.member') }}</th>
                      <th class="th-status">{{ $t('ui.status') }}</th>
                      <th class="th-amount">{{ $t('ui.shareCapitalHyphen') }}</th>
                      <th class="th-actions">{{ $t('ui.actions') }}</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-if="loading">
                      <td colspan="5" class="table-empty">{{ $t('common.loading') }}</td>
                    </tr>
                    <tr v-else-if="farmers.length === 0">
                      <td colspan="5" class="table-empty">{{ $t('ui.noMembersBarangay') }}</td>
                    </tr>
                    <tr v-else-if="filteredFarmers.length === 0">
                      <td colspan="5" class="table-empty">{{ $t('ui.noMembersMatch') }}</td>
                    </tr>
                    <tr
                      v-else
                      v-for="f in filteredFarmers"
                      :key="f.id"
                      :class="{ selected: selectedFarmer?.id === f.id }"
                      @click="selectFarmer(f)"
                    >
                      <td class="td-ref">{{ f.reference_number || '—' }}</td>
                      <td class="name td-member" :title="f.full_name">
                        <span class="cell-clip">{{ f.full_name }}</span>
                      </td>
                      <td class="td-status">
                        <span class="badge" :class="String(f.status).toLowerCase() === 'inactive' ? 'badge-muted' : 'badge-success'">{{ formatRecordStatus(f.status || 'approved') }}</span>
                      </td>
                      <td class="amount td-amount">₱{{ formatMoney(f.share_capital_collected) }}</td>
                      <td class="actions td-actions" @click.stop>
                        <button class="btn btn-small" @click="selectFarmer(f)">{{ $t('common.view') }}</button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="fin-mobile-list">
                <div v-if="loading" class="fin-mobile-empty">{{ $t('common.loading') }}</div>
                <div v-else-if="farmers.length === 0" class="fin-mobile-empty">{{ $t('ui.noMembersBarangay') }}</div>
                <div v-else-if="filteredFarmers.length === 0" class="fin-mobile-empty">{{ $t('ui.noMembersMatch') }}</div>
                <article
                  v-else
                  v-for="f in filteredFarmers"
                  :key="'m-' + f.id"
                  class="fin-mobile-card"
                  :class="{ selected: selectedFarmer?.id === f.id }"
                  @click="selectFarmer(f)"
                >
                  <div class="fin-mobile-card-top">
                    <h4 class="fin-mobile-card-name">{{ f.full_name }}</h4>
                    <span class="badge" :class="String(f.status).toLowerCase() === 'inactive' ? 'badge-muted' : 'badge-success'">{{ formatRecordStatus(f.status || 'approved') }}</span>
                  </div>
                  <div class="fin-mobile-card-meta">
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.refNo') }}</span>
                      <span>{{ f.reference_number || '—' }}</span>
                    </div>
                    <div class="fin-mobile-meta-row">
                      <span class="fin-mobile-label">{{ $t('ui.shareCapitalHyphen') }}</span>
                      <span class="amount">₱{{ formatMoney(f.share_capital_collected) }}</span>
                    </div>
                  </div>
                  <div class="fin-mobile-card-actions" @click.stop>
                    <button type="button" class="btn btn-small fin-mobile-action" @click="selectFarmer(f)">{{ $t('common.view') }}</button>
                  </div>
                </article>
              </div>
            </div>
          </div>

          <div class="card sc-member-detail-card">
            <div class="card-header">
              <h2 class="card-title">{{ $t('ui.memberShares') }}</h2>
            </div>

            <div v-if="!selectedFarmer" class="empty-state">
              <div class="empty-title">{{ $t('ui.selectAMember') }}</div>
              <div class="empty-text">{{ $t('ui.chooseMemberShare') }}</div>
            </div>

            <Teleport to="body" :disabled="!isMobile">
              <Transition :name="isMobile ? 'app-modal' : ''">
                <div
                  v-if="selectedFarmer"
                  class="sc-detail-portal"
                  :class="{ 'app-modal-overlay sc-detail-overlay': isMobile, 'light-theme': isMobile && isLight }"
                  @click.self="isMobile && closeFarmerModal()"
                >
                  <div class="sc-detail-panel" :class="{ 'modal-content sc-detail-modal': isMobile }">
                    <div v-if="isMobile" class="modal-header sc-detail-modal-header">
                      <h2>{{ $t('ui.memberShares') }}</h2>
                      <button
                        type="button"
                        class="sc-detail-close"
                        :aria-label="$t('common.close')"
                        @click="closeFarmerModal"
                      >×</button>
                    </div>
                    <div class="card-body sc-member-detail-body" :class="{ 'modal-body': isMobile }">
              <div class="sc-member-header">
                <div class="farmer-summary">
                  <div class="farmer-name">{{ selectedFarmer.full_name }}</div>
                  <div class="farmer-meta">Ref: {{ selectedFarmer.reference_number || '—' }}</div>
                </div>
                <div class="sc-member-total">
                  <span class="sc-member-total-label">{{ $t('ui.totalShareCapital') }}</span>
                  <span class="sc-member-total-value">₱{{ formatMoney(selectedTotals.share_capital_collected) }}</span>
                </div>
              </div>

              <!-- Treasurer actions -->
              <div v-if="canEdit" class="action-row payment-collection-panel">
                <div class="payment-form-grid">
                  <div class="payment-field">
                    <label class="inline-label">{{ $t('ui.contributionDate') }}</label>
                    <input class="input" type="date" v-model="newContributionDate" />
                  </div>
                  <div class="payment-field">
                    <label class="inline-label">{{ $t('ui.paymentMethod') }}</label>
                    <select class="input" v-model="newContributionMethod">
                      <option value="Cash">{{ $t('ui.cash') }}</option>
                      <option value="GCash">{{ $t('ui.gcash') }}</option>
                    </select>
                  </div>
                  <div class="payment-field payment-field--amount">
                    <label class="inline-label">{{ $t('ui.sixMonthShare') }}</label>
                    <input class="input" type="number" :value="100" disabled />
                  </div>
                  <button type="button" class="btn btn-primary-action payment-form-submit" @click="recordContribution" :disabled="loading">{{ $t('common.recordPrintReceipt') }}</button>
                </div>
              </div>

              <div class="section-title">{{ $t('ui.shareCapitalContributions') }}</div>
              <div class="table-container sc-contributions-table">
                <div class="contribution-history-desktop">
                  <table class="data-table ledger-table ledger-table-contributions">
                    <colgroup>
                      <col class="col-date" />
                      <col class="col-type" />
                      <col class="col-amount" />
                      <col class="col-status" />
                      <col class="col-receipt" />
                      <col class="col-print" />
                      <col v-if="canEdit" class="col-actions" />
                    </colgroup>
                    <thead>
                      <tr>
                        <th class="th-date">{{ $t('ui.date') }}</th>
                        <th class="th-type">{{ $t('ui.type') }}</th>
                        <th class="th-amount">{{ $t('ui.amount') }}</th>
                        <th class="th-status">{{ $t('ui.status') }}</th>
                        <th class="th-receipt">{{ $t('ui.receiptNo') }}</th>
                        <th class="th-print">{{ $t('common.print') }}</th>
                        <th v-if="canEdit" class="th-actions">{{ $t('ui.actions') }}</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-if="loadingFarmer">
                        <td :colspan="canEdit ? 7 : 6" class="table-empty">{{ $t('common.loading') }}</td>
                      </tr>
                      <tr v-else-if="membershipContributions.length === 0">
                        <td :colspan="canEdit ? 7 : 6" class="table-empty">{{ $t('ui.noShareCapitalContrib') }}</td>
                      </tr>
                      <tr v-else v-for="c in membershipContributions" :key="c.id">
                        <td>
                          <template v-if="editingId === c.id && canEditContribution(c)">
                            <input class="input" type="date" v-model="editDate" />
                          </template>
                          <template v-else>
                            {{ formatDate(c.contribution_date) }}
                          </template>
                        </td>
                        <td>{{ formatContributionKind(c.contribution_kind) }}</td>
                        <td class="amount">₱{{ formatMoney(c.amount) }}</td>
                        <td>
                          <template v-if="editingId === c.id && canEditContribution(c)">
                            <select class="input" v-model="editStatus">
                              <option value="confirmed">{{ $t('common.confirmed') }}</option>
                              <option value="cancelled">{{ $t('common.cancelled') }}</option>
                            </select>
                          </template>
                          <template v-else>
                            <span class="badge" :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'">{{ formatRecordStatus(c.status) }}</span>
                          </template>
                        </td>
                        <td>{{ c.receipt_number || '—' }}</td>
                        <td class="actions">
                          <button
                            v-if="c.receipt_number"
                            type="button"
                            class="btn-link-inline"
                            @click="printContributionReceipt(c.receipt_number)"
                          >{{ $t('common.print') }}</button>
                        </td>
                        <td v-if="canEdit" class="actions">
                          <template v-if="editingId === c.id && canEditContribution(c)">
                            <button class="btn btn-small" @click="saveEdit(c.id)" :disabled="loading">{{ $t('common.saveShort') }}</button>
                            <button class="btn btn-small btn-muted" @click="cancelEdit" :disabled="loading">{{ $t('common.cancel') }}</button>
                          </template>
                          <template v-else>
                            <button v-if="canEditContribution(c)" class="btn btn-small" @click="startEdit(c)">{{ $t('common.edit') }}</button>
                            <span v-else class="muted">{{ $t('common.auto') }}</span>
                          </template>
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                <div class="contribution-history-mobile">
                  <div v-if="loadingFarmer" class="fin-mobile-empty">{{ $t('common.loading') }}</div>
                  <div v-else-if="membershipContributions.length === 0" class="fin-mobile-empty">
                    {{ $t('ui.noShareCapitalContrib') }}
                  </div>
                  <article
                    v-else
                    v-for="c in membershipContributions"
                    :key="'contribution-' + c.id"
                    class="fin-mobile-card contribution-mobile-card"
                  >
                    <div class="fin-mobile-card-top">
                      <h4 class="fin-mobile-card-name">{{ formatContributionKind(c.contribution_kind) }}</h4>
                      <span
                        v-if="editingId !== c.id || !canEditContribution(c)"
                        class="badge"
                        :class="c.status === 'confirmed' ? 'badge-success' : 'badge-muted'"
                      >{{ formatRecordStatus(c.status) }}</span>
                    </div>

                    <div class="fin-mobile-card-meta">
                      <div class="fin-mobile-meta-row">
                        <span class="fin-mobile-label">{{ $t('ui.date') }}</span>
                        <input
                          v-if="editingId === c.id && canEditContribution(c)"
                          class="input contribution-edit-input"
                          type="date"
                          v-model="editDate"
                        />
                        <span v-else>{{ formatDate(c.contribution_date) }}</span>
                      </div>
                      <div class="fin-mobile-meta-row">
                        <span class="fin-mobile-label">{{ $t('ui.amount') }}</span>
                        <span class="amount">₱{{ formatMoney(c.amount) }}</span>
                      </div>
                      <div class="fin-mobile-meta-row">
                        <span class="fin-mobile-label">{{ $t('ui.receipt') }}</span>
                        <span>{{ c.receipt_number || '—' }}</span>
                      </div>
                      <div v-if="editingId === c.id && canEditContribution(c)" class="fin-mobile-meta-row">
                        <span class="fin-mobile-label">{{ $t('ui.status') }}</span>
                        <select class="input contribution-edit-input" v-model="editStatus">
                          <option value="confirmed">{{ $t('common.confirmed') }}</option>
                          <option value="cancelled">{{ $t('common.cancelled') }}</option>
                        </select>
                      </div>
                    </div>

                    <div class="fin-mobile-card-actions contribution-mobile-actions">
                      <button
                        v-if="c.receipt_number"
                        type="button"
                        class="btn btn-small fin-mobile-action"
                        @click="printContributionReceipt(c.receipt_number)"
                      >{{ $t('common.print') }}</button>
                      <template v-if="canEdit">
                        <template v-if="editingId === c.id && canEditContribution(c)">
                          <button class="btn btn-small fin-mobile-action" @click="saveEdit(c.id)" :disabled="loading">{{ $t('common.saveShort') }}</button>
                          <button class="btn btn-small btn-muted fin-mobile-action" @click="cancelEdit" :disabled="loading">{{ $t('common.cancel') }}</button>
                        </template>
                        <button
                          v-else-if="canEditContribution(c)"
                          class="btn btn-small fin-mobile-action"
                          @click="startEdit(c)"
                        >{{ $t('common.edit') }}</button>
                        <span v-else class="muted">{{ $t('common.auto') }}</span>
                      </template>
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
        </template>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="showReceiptModal && lastReceipt"
          class="modal-overlay receipt-modal-overlay app-modal-overlay sc-receipt-overlay"
          @click.self="closeReceiptModal"
        >
          <div class="modal-box receipt-modal-box" @click.stop>
            <PaymentReceiptPrint
              :receipt="lastReceipt"
              :auto-print="receiptAutoPrint"
              :kind="receiptKind"
              @close="closeReceiptModal"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="alert.show"
          class="app-modal-overlay sc-alert-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="dismissAlert"
        >
          <div class="modal-content sc-alert-modal" :class="'sc-alert-' + alert.type" role="alertdialog" aria-live="polite">
            <div class="sc-alert-icon" aria-hidden="true">{{ alert.type === 'success' ? '✓' : '!' }}</div>
            <p class="sc-alert-message">{{ alert.message }}</p>
            <button type="button" class="btn sc-alert-ok" @click="dismissAlert">{{ $t('common.ok') }}</button>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useAuthStore } from '../stores/authStore'
import { canViewDuesPaymentsLedger } from '../utils/roleAccess'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import PrintIcon from '../components/icons/PrintIcon.vue'
import { usePaymentReceipt } from '../composables/usePaymentReceipt'

const authStore = useAuthStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const role = computed(() => authStore.currentUser?.role)
const isAdmin = computed(() => role.value === 'admin')
const isTreasurer = computed(() => role.value === 'treasurer')
const isDuesPaymentsUrl = computed(() => route.path === '/dues-payments' || route.query.view === 'my')
const isTreasurerLedgerView = computed(() => isTreasurer.value && isDuesPaymentsUrl.value)

const isManagementView = computed(() => {
  if (isAdmin.value) return true
  if (isTreasurer.value) return !isTreasurerLedgerView.value
  return false
})

const isAllowedRole = computed(() =>
  canViewDuesPaymentsLedger(role.value) || isTreasurer.value || isAdmin.value
)

const isLedgerView = computed(() => {
  if (!canViewDuesPaymentsLedger(role.value)) return false
  if (isAdmin.value) return false
  if (isTreasurer.value) return isTreasurerLedgerView.value
  return true
})
const canEdit = computed(() => isTreasurer.value || isAdmin.value)

const barangays = ref([])
const selectedBarangayId = ref('')

const barangayOptions = computed(() =>
  barangays.value.map(b => ({
    id: b.id || b.barangay_id,
    name: b.name || b.barangay_name || String(b.id)
  }))
)

const selectedBarangayName = computed(() => {
  if (!selectedBarangayId.value) return ''
  const match = barangayOptions.value.find(b => String(b.id) === String(selectedBarangayId.value))
  return match?.name || ''
})

const filteredFarmers = computed(() => {
  if (!searchQuery.value.trim()) return farmers.value
  
  const query = searchQuery.value.toLowerCase()
  return farmers.value.filter(f => 
    (f.reference_number && f.reference_number.toLowerCase().includes(query)) ||
    (f.full_name && f.full_name.toLowerCase().includes(query))
  )
})

const loading = ref(false)
const loadingFarmer = ref(false)
const setupError = ref('')

const alert = ref({
  show: false,
  message: '',
  type: 'success'
})

let alertTimer = null
const showAlert = (message, type = 'success') => {
  if (alertTimer) clearTimeout(alertTimer)
  alert.value = { show: true, message, type }
  alertTimer = setTimeout(() => {
    alert.value.show = false
    alertTimer = null
  }, 4000)
}

function dismissAlert() {
  if (alertTimer) {
    clearTimeout(alertTimer)
    alertTimer = null
  }
  alert.value.show = false
}

function setSetupError(message) {
  if (message && String(message).toLowerCase().includes('tables not found')) {
    setupError.value = message
  }
}

const farmers = ref([])
const overviewTotals = ref({ total_farmers: 0, total_share_capital_collected: 0 })
const selectedFarmer = ref(null)
const selectedContributions = ref([])
const selectedTotals = ref({ share_capital_collected: 0 })

const membershipContributions = computed(() =>
  selectedContributions.value.filter(
    (c) => String(c.contribution_kind || 'membership') === 'membership'
  )
)

const meContributions = ref([])
const meWithdrawals = ref([])
const meAssociationDues = ref([])
const meAssociationDuesTotal = ref(0)
const meTotals = ref({
  total_contributed: 0,
  total_withdrawn: 0,
  balance: 0,
  share_capital_collected: 0,
  seed_fertilizer_paid: 0
})

const ledgerTotals = computed(() => {
  const shareCapital = meTotals.value.share_capital_collected ?? 0
  const seedFertilizer = meTotals.value.seed_fertilizer_paid ?? 0
  const totalCollected =
    meTotals.value.total_contributed ??
    meTotals.value.total_savings ??
    shareCapital + seedFertilizer
  const totalWithdrawn = meTotals.value.total_withdrawn ?? 0
  const balance =
    meTotals.value.balance ??
    meTotals.value.withdrawable_balance ??
    totalCollected - totalWithdrawn

  return {
    total_collected: totalCollected,
    total_withdrawn: totalWithdrawn,
    balance,
  }
})

const newContributionDate = ref(todayISO())
const newContributionMethod = ref('Cash')

const { showReceiptModal, lastReceipt, receiptAutoPrint, showAndPrintReceipt, printReceiptDirect, closeReceiptModal } = usePaymentReceipt()
const receiptKind = ref('payment')

const isDuesPaymentsPage = computed(() => route.path === '/dues-payments')

async function printReceiptForPage(receiptNumber, kind = 'payment') {
  if (!receiptNumber) {
    showAlert('No receipt available for this transaction.', 'error')
    return
  }
  try {
    receiptKind.value = kind
    if (isMobile.value) {
      await showAndPrintReceipt(receiptNumber, { autoPrint: false })
    } else if (isDuesPaymentsPage.value) {
      await printReceiptDirect(receiptNumber, { kind })
    } else {
      await showAndPrintReceipt(receiptNumber, { autoPrint: true })
    }
  } catch (e) {
    showAlert(e.message || 'Failed to load receipt.', 'error')
  }
}

async function printContributionReceipt(receiptNumber) {
  await printReceiptForPage(receiptNumber, 'payment')
}

async function printWithdrawalReceipt(receiptNumber) {
  await printReceiptForPage(receiptNumber, 'withdrawal')
}

const editingId = ref(null)
const editDate = ref('')
const editStatus = ref('confirmed')
const searchQuery = ref('')

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMoney(value) {
  const n = parseFloat(value || 0)
  return Number.isFinite(n) ? n.toLocaleString() : '0'
}

function formatContributionKind(kind) {
  return String(kind || 'membership') === 'assistance_sacks'
    ? t('ui.seedFertilizerPlan')
    : t('ui.shareCapitalSixMonths')
}

function formatRecordStatus(status) {
  const key = String(status || '').trim().toLowerCase()
  if (key === 'confirmed') return t('common.confirmed')
  if (key === 'cancelled') return t('common.cancelled')
  if (key === 'approved') return t('common.approved')
  if (key === 'inactive') return t('common.inactive')
  if (key === 'pending') return t('common.pending')
  return status || '—'
}

function formatPaymentMethod(method) {
  const key = String(method || '').trim().toLowerCase()
  if (key === 'cash') return t('ui.cash')
  if (key === 'gcash') return t('ui.gcash')
  return method || '—'
}

function formatDuesPeriod(start, end) {
  if (!start && !end) return '—'
  const a = start ? formatDate(start) : '—'
  const b = end ? formatDate(end) : '—'
  return `${a} – ${b}`
}

function canEditContribution(contribution) {
  return String(contribution?.contribution_kind || 'membership') === 'membership'
}

async function apiFetch(path, options = {}) {
  const token = authStore.token || localStorage.getItem('token')
  if (!token) {
    showAlert('Session expired. Please login again.', 'error')
    throw new Error('Unauthorized')
  }
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${token}`
  }
  const response = await fetch(path, { ...options, headers })
  if (response.status === 401) {
    showAlert('Session expired. Please login again.', 'error')
    throw new Error('Unauthorized')
  }
  return response
}

async function loadBarangays() {
  try {
    const res = await fetch('/api/barangays')
    const data = await res.json()
    barangays.value = data.barangays || data.data || (Array.isArray(data) ? data : [])
  } catch (e) {
    console.error('Error loading barangays:', e)
  }
}

function onBarangayChange() {
  selectedFarmer.value = null
  selectedContributions.value = []
  searchQuery.value = ''
  loadOverview()
}

async function loadOverview() {
  if (!isManagementView.value) return
  if (isAdmin.value && !selectedBarangayId.value) {
    farmers.value = []
    overviewTotals.value = { total_farmers: 0, total_share_capital_collected: 0 }
    return
  }

  setupError.value = ''
  loading.value = true
  try {
    const params = new URLSearchParams()
    if (isAdmin.value && selectedBarangayId.value) {
      params.set('barangay_id', selectedBarangayId.value)
    }
    const query = params.toString()
    const res = await apiFetch(`/api/share-capital/overview${query ? `?${query}` : ''}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load overview')
    }
    farmers.value = data.farmers || []
    overviewTotals.value = data.totals || overviewTotals.value

    // Keep selection valid
    if (selectedFarmer.value) {
      const stillThere = farmers.value.find(f => f.id === selectedFarmer.value.id)
      if (stillThere) {
        selectedFarmer.value = stillThere
      }
    }
  } catch (e) {
    setSetupError(e.message)
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadFarmerDetails(farmerId) {
  loadingFarmer.value = true
  try {
    const res = await apiFetch(`/api/share-capital/farmer/${farmerId}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load farmer records')
    }
    selectedTotals.value = data.totals || selectedTotals.value
    selectedContributions.value = data.contributions || []
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loadingFarmer.value = false
  }
}

async function selectFarmer(f) {
  selectedFarmer.value = f
  editingId.value = null
  await loadFarmerDetails(f.id)
}

async function recordContribution() {
  if (!selectedFarmer.value) return
  if (!newContributionDate.value) {
    showAlert('Please select a contribution date', 'error')
    return
  }

  loading.value = true
  try {
    const res = await apiFetch('/api/share-capital/contributions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        farmer_id: selectedFarmer.value.id,
        contribution_date: newContributionDate.value,
        amount: 100,
        payment_method: newContributionMethod.value
      })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to record contribution')
    }
    await loadFarmerDetails(selectedFarmer.value.id)
    await loadOverview()
    if (data.receipt_number) {
      try {
        if (isMobile.value) {
          await showAndPrintReceipt(data.receipt_number, { autoPrint: false })
        } else if (isDuesPaymentsPage.value) {
          await printReceiptDirect(data.receipt_number, { kind: 'payment' })
        } else {
          await showAndPrintReceipt(data.receipt_number, { autoPrint: true })
        }
      } catch (receiptErr) {
        console.error('Receipt print failed:', receiptErr)
        showAlert('Contribution saved but receipt could not be loaded. Use Print from the history table.', 'error')
      }
    }
    showAlert(data.message || 'Share contribution recorded successfully', 'success')
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

function startEdit(c) {
  editingId.value = c.id
  editDate.value = String(c.contribution_date || '').slice(0, 10)
  editStatus.value = c.status || 'confirmed'
}

function cancelEdit() {
  editingId.value = null
  editDate.value = ''
  editStatus.value = 'confirmed'
}

async function saveEdit(id) {
  if (!editDate.value) {
    showAlert('Please select a date', 'error')
    return
  }

  loading.value = true
  try {
    const res = await apiFetch(`/api/share-capital/contributions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contribution_date: editDate.value,
        amount: 100,
        status: editStatus.value
      })
    })
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to update contribution')
    }
    cancelEdit()
    if (selectedFarmer.value) {
      await loadFarmerDetails(selectedFarmer.value.id)
      await loadOverview()
    }
    showAlert('Contribution updated successfully', 'success')
  } catch (e) {
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

async function loadMe() {
  setupError.value = ''
  loading.value = true
  try {
    const res = await apiFetch('/api/share-capital/me')
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Failed to load share capital data')
    }
    meTotals.value = data.totals || meTotals.value
    meContributions.value = data.contributions || []
    meWithdrawals.value = data.withdrawals || []
    meAssociationDues.value = data.association_dues || []
    meAssociationDuesTotal.value = data.association_dues_total ?? 0
  } catch (e) {
    setSetupError(e.message)
    showAlert(e.message, 'error')
  } finally {
    loading.value = false
  }
}

// Old link: /share-capital?view=my → new dedicated URL
function redirectLegacyLedgerUrl() {
  if (route.path === '/share-capital' && route.query.view === 'my') {
    router.replace('/dues-payments')
    return true
  }
  return false
}

// Mobile detection so the member detail can render as a centered modal on small screens
const isMobile = ref(false)
let mobileMql = null
function updateIsMobile(e) {
  isMobile.value = e && typeof e.matches === 'boolean'
    ? e.matches
    : (typeof window !== 'undefined' && window.innerWidth <= 768)
}

const showFarmerModal = computed(() => isMobile.value && !!selectedFarmer.value)
const anyShareCapitalModalOpen = computed(() => showFarmerModal.value || alert.value.show || showReceiptModal.value)

function closeFarmerModal() {
  cancelEdit()
  selectedFarmer.value = null
}

// Lock background scroll while detail modal or alert overlay is open
watch(anyShareCapitalModalOpen, (open) => {
  if (typeof document === 'undefined') return
  document.body.classList.toggle('app-modal-open', open)
  document.body.style.overflow = open ? 'hidden' : ''
})

onMounted(async () => {
  if (typeof window !== 'undefined' && window.matchMedia) {
    mobileMql = window.matchMedia('(max-width: 768px)')
    isMobile.value = mobileMql.matches
    if (mobileMql.addEventListener) mobileMql.addEventListener('change', updateIsMobile)
    else if (mobileMql.addListener) mobileMql.addListener(updateIsMobile)
  }
  if (!authStore.token) return
  if (redirectLegacyLedgerUrl()) return
  await loadPageData()
})

onBeforeUnmount(() => {
  if (mobileMql) {
    if (mobileMql.removeEventListener) mobileMql.removeEventListener('change', updateIsMobile)
    else if (mobileMql.removeListener) mobileMql.removeListener(updateIsMobile)
  }
  if (typeof document !== 'undefined') {
    document.body.classList.remove('app-modal-open')
    document.body.style.overflow = ''
  }
})

watch(
  () => [route.path, route.query.view],
  () => {
    if (redirectLegacyLedgerUrl()) return
    loadPageData()
  }
)

async function loadPageData() {
  if (isLedgerView.value) {
    await loadMe()
  } else if (isManagementView.value) {
    if (isAdmin.value) {
      await loadBarangays()
    } else {
      await loadOverview()
    }
  }
}
</script>

<style scoped>
@import '../styles/compact-data-table.css';

/* ===== GLASSMORPHIC GREEN THEME (aligned with Machinery Financial / Seed Fertilizer Plan) ===== */
.financial-container {
  --glass-bg: rgba(29, 43, 33, 0.92);
  --glass-panel: rgba(31, 48, 36, 0.94);
  --glass-line: rgba(255, 255, 255, 0.1);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --text-soft: rgba(220, 238, 211, 0.62);
  --green: #34d399;
  --lime: #a3e635;
  --red: #f87171;

  min-height: 100vh;
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

.financial-container > .tab-content {
  margin-top: 0;
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

.share-capital-page > .page-header.page-header-split {
  text-align: left;
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

/* Defeat global page-hero-header.css centering on this page */
.share-capital-page > .page-header .page-header-text,
.share-capital-page > .page-header .header-content {
  align-items: flex-start !important;
  text-align: left !important;
  margin: 0 !important;
  max-width: none !important;
  width: auto !important;
  gap: 0.35rem !important;
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
  -webkit-text-fill-color: currentColor;
  text-align: left;
}

.page-subtitle {
  color: rgba(229, 235, 231, 0.82);
  margin: 0;
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 700;
  text-align: left;
}

.hero-subtitle {
  max-width: none;
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

.tab-content--main {
  padding-top: 22px;
}

.tab-content .stats-grid,
.tab-content .grid-2 {
  position: relative;
  z-index: 1;
}

.ledger-note {
  margin: 0 0 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--glass-line);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.5;
  position: relative;
  z-index: 1;
}

.ledger-withdrawals-card {
  margin-top: 1.25rem;
  position: relative;
  z-index: 1;
}

.ledger-dues-card {
  margin-top: 1.25rem;
  position: relative;
  z-index: 1;
}

.ledger-dues-hint {
  margin: 0;
  padding: 0.65rem 1.25rem 0.85rem;
  font-size: 0.88rem;
  color: var(--text-soft);
  box-sizing: border-box;
}

.ledger-dues-total {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--green);
  white-space: nowrap;
}

.info-banner {
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 18px;
  font-size: 14px;
  line-height: 1.45;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-main);
  position: relative;
  z-index: 1;
}

.info-banner--error {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
}

.error-hint {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
  font-size: 13px;
  color: #fecaca;
  opacity: 0.95;
}

.code-block {
  margin-top: 8px;
  padding: 10px 12px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  font-family: ui-monospace, 'Courier New', monospace;
  font-size: 12px;
  overflow-x: auto;
  color: var(--lime);
}

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
  text-align: left;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
}

.stats-grid--overview {
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  margin-bottom: 0;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
}

.stats-grid.compact {
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
  gap: 10px;
  margin: 12px 0 16px;
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

.grid-2 {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

@media (max-width: 1024px) {
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
  padding: 0;
  margin: 0;
}

.tab-content .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.14);
  margin-bottom: 0;
  box-sizing: border-box;
}

.tab-content .card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
  flex: 1 1 auto;
  min-width: 0;
  line-height: 1.3;
}

.tab-content .card-header .btn-primary-action,
.tab-content .card-header .ledger-dues-total {
  flex-shrink: 0;
  align-self: center;
  margin-left: 0;
}

.card-body {
  padding: 16px 18px 18px;
  position: relative;
  z-index: 1;
}

.table-container {
  width: 100%;
  overflow-x: auto;
  position: relative;
  z-index: 1;
  padding: 0.75rem 1.25rem 1.1rem;
  box-sizing: border-box;
}

.admin-filter-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--glass-panel);
  border: 1px solid var(--glass-line);
}

.admin-filter-label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
}

.admin-filter-select {
  min-width: 220px;
  max-width: 320px;
}

.admin-filter-hint {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-soft);
}

.filter-section {
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.12);
  position: relative;
  z-index: 1;
}

.filter-input {
  width: 100%;
}

/* Search tools — matches Machinery Management tools-card pattern */
.sc-tools-card.tools-card {
  --tools-h: 38px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  gap: 0.5rem;
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

/* Dual-render: desktop table / mobile cards (avoids global style.css stacked-table cards) */
.fin-mobile-list {
  display: none;
}

.contribution-history-mobile {
  display: none;
}

.contribution-history-desktop {
  display: block;
  width: 100%;
  overflow-x: auto;
}

.fin-desktop-table {
  display: block;
  width: 100%;
  overflow-x: auto;
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
  outline: 2px solid rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.12);
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

.fin-mobile-action {
  flex: 1 1 auto;
  min-height: 40px;
  min-width: 0;
  justify-content: center;
  font-size: 0.78rem !important;
  padding: 0.45rem 0.65rem !important;
}

.table-action-btn.fin-mobile-action {
  width: auto;
  height: auto;
  min-width: 0;
  min-height: 40px;
  gap: 0.35rem;
  padding: 0.45rem 0.7rem !important;
  border-radius: 9px;
}

.table-action-btn.fin-mobile-action span {
  font-size: 0.78rem;
  font-weight: 700;
  line-height: 1;
}

.tab-content .data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;
  table-layout: fixed;
}

.tab-content .data-table thead {
  background: rgba(74, 222, 128, 0.1);
}

.tab-content .data-table th {
  padding: 0.7rem 0.85rem;
  text-align: left;
  font-weight: 700;
  color: var(--text-main);
  border-bottom: 1px solid rgba(74, 222, 128, 0.28);
  font-size: 0.72rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.3;
}

.tab-content .data-table th:not(:last-child),
.tab-content .data-table td:not(:last-child) {
  border-right: none;
}

.tab-content .data-table td {
  padding: 0.72rem 0.85rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 500;
  font-size: 0.875rem;
  line-height: 1.35;
}

.tab-content .data-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.tab-content .data-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.1);
}

.tab-content table.data-table tbody td.amount {
  font-size: 0.875rem;
  font-weight: 700;
  color: #b7f7c8;
  font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI', sans-serif;
  line-height: 1.35;
}

.tab-content .data-table tr.selected {
  outline: 2px solid rgba(74, 222, 128, 0.55);
  background: rgba(74, 222, 128, 0.12) !important;
}

.name {
  font-weight: 500;
  color: var(--text-main);
}

.actions {
  white-space: nowrap;
  text-align: right;
}

.muted {
  color: var(--text-soft);
  font-size: 12px;
  font-weight: 700;
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
  padding: 0.32rem 0.7rem;
  font-size: 0.75rem;
  border-radius: 8px;
  font-weight: 700;
  line-height: 1.2;
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

.btn-muted {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-muted:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

.btn-success {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.32), rgba(74, 222, 128, 0.2));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.4);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.42), rgba(74, 222, 128, 0.3));
  border-color: var(--green);
  transform: translateY(-2px);
}

.btn-danger {
  background: linear-gradient(135deg, rgba(248, 113, 113, 0.22), rgba(248, 113, 113, 0.12));
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.45);
}

.btn-danger:hover:not(:disabled) {
  border-color: #f87171;
  transform: translateY(-1px);
}

.badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.18rem 0.55rem;
  border-radius: 999px;
  font-size: 0.72rem;
  font-weight: 700;
  border: 1px solid rgba(255, 255, 255, 0.12);
  text-transform: capitalize;
}

.badge-success {
  background: rgba(74, 222, 128, 0.16);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.35);
}

.badge-muted {
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-soft);
  border-color: rgba(255, 255, 255, 0.1);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-soft);
  position: relative;
  z-index: 1;
}

.empty-state--panel {
  padding: 32px 20px;
  border-radius: 14px;
  border: 1px dashed rgba(255, 255, 255, 0.15);
  background: rgba(0, 0, 0, 0.15);
  margin-bottom: 8px;
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
  margin-bottom: 0;
  padding: 8px 10px;
  border-radius: 8px;
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.22);
  flex: 1 1 auto;
  min-width: 0;
}

.sc-member-header {
  display: flex;
  align-items: stretch;
  gap: 8px;
  margin-bottom: 8px;
}

.sc-member-total {
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 2px;
  padding: 8px 10px;
  border-radius: 8px;
  background: linear-gradient(145deg, rgba(32, 48, 37, 0.92), rgba(24, 36, 28, 0.88));
  border: 1px solid rgba(190, 235, 203, 0.22);
  min-width: 6.5rem;
}

.sc-member-total-label {
  font-size: 8px;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--text-soft);
  line-height: 1.2;
}

.sc-member-total-value {
  font-size: 0.95rem;
  font-weight: 900;
  line-height: 1.1;
  color: #bbf7d0;
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.02em;
}

.farmer-name {
  font-weight: 800;
  font-size: 0.88rem;
  color: #ecfdf5;
  margin-bottom: 2px;
  line-height: 1.2;
}

.farmer-meta {
  font-size: 11px;
  color: var(--text-muted);
  line-height: 1.25;
}

.section-title {
  margin: 8px 0 4px;
  font-size: 10px;
  font-weight: 800;
  color: #b6f7cb;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  padding-bottom: 4px;
}

.action-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 0;
  margin-bottom: 8px;
}

.payment-form-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) 4.25rem auto;
  gap: 4px 8px;
  align-items: end;
  width: 100%;
}

.payment-field {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.payment-field--amount {
  max-width: 4.25rem;
}

.payment-form-submit {
  align-self: end;
  white-space: nowrap;
}

.sc-contributions-table {
  padding: 0 !important;
  margin-top: 0;
}

.sc-member-detail-card .contribution-history-desktop {
  max-height: min(14rem, 38vh);
  border-radius: 6px;
}

.sc-member-detail-card .ledger-table-contributions {
  min-width: 0;
  width: 100%;
}

.sc-member-detail-body {
  padding: 8px 10px 10px;
}

.form-inline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 14px;
}

.inline-label {
  font-size: 11px;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-soft);
  margin: 0;
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

.input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

select.input {
  cursor: pointer;
}

/* ===== Member detail: inline card on desktop, centered modal on mobile ===== */
.sc-detail-portal:not(.app-modal-overlay),
.sc-detail-panel:not(.modal-content) {
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

/* Table inside the teleported modal has no .tab-content ancestor, so restyle it */
.sc-detail-modal .data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  table-layout: fixed;
}

.sc-detail-modal .data-table thead {
  background: rgba(74, 222, 128, 0.1);
}

.sc-detail-modal .data-table th {
  padding: 0.55rem 0.6rem;
  text-align: left;
  font-weight: 700;
  color: var(--text-main);
  border-bottom: 1px solid rgba(74, 222, 128, 0.28);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.3;
}

.sc-detail-modal .data-table td {
  padding: 0.55rem 0.6rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 500;
  font-size: 0.82rem;
  line-height: 1.35;
}

.sc-detail-modal .data-table th:not(:last-child),
.sc-detail-modal .data-table td:not(:last-child) {
  border-right: none;
}

.sc-detail-modal .data-table td.amount {
  color: #b7f7c8;
  font-weight: 700;
  font-family: ui-monospace, 'Cascadia Mono', 'Segoe UI', sans-serif;
}

/* Light-theme colours for the teleported modal (lives outside .financial-container) */
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
  border-color: #86efac;
  box-shadow: 0 24px 60px rgba(22, 101, 52, 0.25);
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
  border: 1px solid #86efac;
}

.sc-detail-overlay.light-theme .sc-member-total {
  background: #ffffff;
  border: 1px solid #86efac;
}

.sc-detail-overlay.light-theme .sc-member-total-value {
  color: #052e16;
}

.sc-detail-overlay.light-theme .farmer-name {
  color: #052e16;
}

.sc-detail-overlay.light-theme .farmer-meta {
  color: #166534;
}

.sc-detail-overlay.light-theme .stat-card {
  background: #ffffff;
  border: 1px solid #86efac;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
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

.sc-detail-overlay.light-theme .input {
  background: #ffffff;
  color: #000000;
  border: 1.5px solid #94a3b8;
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

.sc-detail-overlay.light-theme .badge-success {
  background: #f0fdf4;
  color: #15803d;
  border-color: #16a34a;
}

.sc-detail-overlay.light-theme .badge-muted {
  background: #f1f5f9;
  color: #475569;
  border-color: #cbd5e1;
}

.sc-detail-overlay.light-theme .muted {
  color: #15803d;
}

.sc-detail-overlay.light-theme .btn:not(.btn-primary-action):not(.btn-success):not(.btn-danger) {
  background: #ffffff;
  color: #052e16;
  -webkit-text-fill-color: #052e16;
  border-color: #166534;
}

.sc-detail-overlay.light-theme .btn-muted {
  background: #ffffff;
  color: #052e16;
  -webkit-text-fill-color: #052e16;
  border-color: #94a3b8;
}

.sc-detail-overlay.light-theme .btn-link-inline {
  color: #166534;
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

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
.financial-container.share-capital-page.light-theme {
  --glass-bg: #fffef9;
  --glass-panel: #ffffff;
  --glass-line: rgba(34, 197, 94, 0.28);
  --glass-line-strong: rgba(22, 101, 52, 0.35);
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --green: #15803d;

  background: linear-gradient(155deg, #d8f3de 0%, #bfeccc 42%, #a8e4b8 100%) !important;
  color: var(--text-main);
}

.financial-container.share-capital-page.light-theme::before,
.financial-container.share-capital-page.light-theme::after {
  opacity: 0.25;
}

.financial-container.share-capital-page.light-theme .page-header,
.financial-container.share-capital-page.light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 8px 26px rgba(22, 101, 52, 0.12), inset 1px 1px 0 rgba(255, 255, 255, 0.05) !important;
  text-align: left !important;
}

.financial-container.share-capital-page.light-theme .page-header-text {
  align-items: flex-start !important;
  text-align: left !important;
  margin: 0 !important;
  max-width: none !important;
}

.financial-container.share-capital-page.light-theme .page-header h1,
.financial-container.share-capital-page.light-theme .page-title {
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: currentColor !important;
  color: #052e16 !important;
  text-align: left !important;
}

.financial-container.share-capital-page.light-theme .page-subtitle {
  color: #166534 !important;
  text-align: left !important;
}

.financial-container.share-capital-page.light-theme .tab-content {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.financial-container.share-capital-page.light-theme .admin-filter-bar {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .admin-filter-label {
  color: #000000 !important;
}

.financial-container.share-capital-page.light-theme .admin-filter-hint {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .empty-state {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .empty-state--panel {
  background: #f8fdf9 !important;
  border-color: #86efac !important;
}

.financial-container.share-capital-page.light-theme .empty-title {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .empty-text {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .stat-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 18px rgba(22, 101, 52, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
}

.financial-container.share-capital-page.light-theme .stats-group-title {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .stat-label {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .stat-value {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.financial-container.share-capital-page.light-theme .tab-content .card-header {
  background: #f0fdf4 !important;
  border-bottom-color: #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .card-title {
  color: #000000 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table th {
  color: #000000 !important;
  border-bottom-color: #86efac !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table td {
  color: #000000 !important;
  border-bottom-color: #e2e8f0 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table tbody tr:nth-child(even) {
  background: #f8fdf9 !important;
}

.financial-container.share-capital-page.light-theme .tab-content .data-table tbody tr:hover {
  background: #ecfdf5 !important;
}

.financial-container.share-capital-page.light-theme .tab-content table.data-table tbody td.amount {
  color: #15803d !important;
}

.financial-container.share-capital-page.light-theme .input {
  background: #ffffff !important;
  color: #000000 !important;
  border-color: #94a3b8 !important;
}

.financial-container.share-capital-page.light-theme .input::placeholder {
  color: #4b5563 !important;
  opacity: 1 !important;
}

.financial-container.share-capital-page.light-theme .input:focus {
  border-color: #16a34a !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2) !important;
}

.financial-container.share-capital-page.light-theme .filter-section {
  background: #f8fdf9 !important;
  border-bottom-color: #e2e8f0 !important;
}

.financial-container.share-capital-page.light-theme .farmer-summary {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
}

.financial-container.share-capital-page.light-theme .sc-member-total {
  background: #ffffff !important;
  border-color: #86efac !important;
}

.financial-container.share-capital-page.light-theme .sc-member-total-value {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .farmer-name {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .farmer-meta {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .section-title {
  color: #15803d !important;
  border-bottom-color: #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .inline-label {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .muted {
  color: #15803d !important;
}

.financial-container.share-capital-page.light-theme .name {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .badge-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
}

.financial-container.share-capital-page.light-theme .badge-muted {
  background: #f1f5f9 !important;
  color: #475569 !important;
  border-color: #cbd5e1 !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-small,
.financial-container.share-capital-page.light-theme .btn:not(.btn-primary-action):not(.btn-success):not(.btn-danger) {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #166534 !important;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08) !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-small:hover:not(:disabled),
.financial-container.share-capital-page.light-theme .btn:not(.btn-primary-action):not(.btn-success):not(.btn-danger):hover:not(:disabled) {
  background: #f0fdf4 !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #15803d !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-primary-action,
.financial-container.share-capital-page.light-theme .btn-primary-action {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #14532d !important;
  box-shadow: 0 8px 16px rgba(22, 101, 52, 0.22) !important;
}

.financial-container.share-capital-page.light-theme .btn.btn-primary-action:hover:not(:disabled),
.financial-container.share-capital-page.light-theme .btn-primary-action:hover:not(:disabled) {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.share-capital-page.light-theme .btn-muted {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #94a3b8 !important;
}

.financial-container.share-capital-page.light-theme .btn-success {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #14532d !important;
}

.financial-container.share-capital-page.light-theme .btn-danger {
  background: #fee2e2 !important;
  color: #991b1b !important;
  -webkit-text-fill-color: #991b1b !important;
  border-color: #fca5a5 !important;
}

.financial-container.share-capital-page.light-theme .info-banner {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #14532d !important;
}

.financial-container.share-capital-page.light-theme .info-banner--error {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

.financial-container.share-capital-page.light-theme .fin-mobile-card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .fin-mobile-card-name {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .fin-mobile-label {
  color: #64748b !important;
}

.financial-container.share-capital-page.light-theme .fin-mobile-meta-row {
  color: #052e16 !important;
}

.financial-container.share-capital-page.light-theme .fin-mobile-card-actions {
  border-top-color: #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .fin-mobile-empty {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .sc-tools-card.tools-card {
  background: #f0fdf4 !important;
  border-bottom-color: #bbf7d0 !important;
}

.financial-container.share-capital-page.light-theme .sc-tools-card .search-icon-wrap {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .sc-tools-card .toolbar-input.search-input-main {
  background: #ffffff !important;
  color: #052e16 !important;
  border-color: #94a3b8 !important;
}

.financial-container.share-capital-page.light-theme .sc-tools-card .toolbar-input.search-input-main::placeholder {
  color: #64748b !important;
}

@media (max-width: 768px) {
  .financial-container {
    /* Keep content inset — do not bleed past layout gutters */
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0.65rem 0.9rem !important;
    border-radius: 0;
    overflow: visible;
    min-height: 0;
    touch-action: pan-y;
    box-sizing: border-box;
  }

  .financial-container > .tab-content {
    margin-top: 0;
  }

  .page-header,
  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.95rem;
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
    align-items: flex-start;
    text-align: left;
    max-width: none;
    margin: 0;
  }

  .page-header h1,
  .page-title {
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
    color: var(--text-main);
    background: none;
    -webkit-background-clip: unset;
    background-clip: unset;
    text-align: left !important;
  }

  .page-subtitle {
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
    text-align: left !important;
  }

  .hero-subtitle {
    max-width: none;
  }

  .tab-content {
    padding: 0.8rem 0.9rem !important;
    border-radius: 14px;
    box-sizing: border-box;
  }

  .tab-content--main {
    padding-top: 0.8rem !important;
  }

  .info-banner {
    padding: 0.6rem 0.75rem;
    font-size: 0.78rem;
    margin-bottom: 0.6rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.6rem;
  }

  .stats-grid > .stat-card:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }

  .stats-grid.compact {
    grid-template-columns: 1fr;
    margin: 0.5rem 0 0.6rem;
  }

  .stat-card {
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
  }

  .stat-label {
    font-size: 0.56rem;
    margin-bottom: 0.15rem;
  }

  .stat-value {
    font-size: 1rem;
  }

  .ledger-note {
    padding: 0.6rem 0.8rem;
    font-size: 0.72rem;
    line-height: 1.4;
    margin-bottom: 0.6rem;
  }

  .grid-2 {
    gap: 0.6rem;
  }

  .tab-content .card {
    border-radius: 12px;
  }

  .tab-content .card-header {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    padding: 0.75rem 1rem !important;
  }

  .tab-content .card-title {
    font-size: 0.88rem;
    flex: 1 1 auto;
    min-width: 0;
    line-height: 1.25;
  }

  .tab-content .card-header .btn-primary-action {
    flex-shrink: 0;
    align-self: center;
    margin-left: 0;
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
    border-radius: 9px;
    min-height: 34px;
  }

  .tab-content .card-header .ledger-dues-total {
    flex-shrink: 0;
    align-self: center;
    font-size: 0.75rem;
  }

  .card-body {
    padding: 0.75rem 0.85rem 0.85rem;
  }

  .btn-primary-action {
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
    border-radius: 9px;
  }

  .admin-filter-bar {
    padding: 0.55rem 0.75rem;
    gap: 0.4rem;
    margin-bottom: 0.6rem;
    border-radius: 10px;
  }

  .admin-filter-label {
    font-size: 0.6rem;
  }

  .admin-filter-select {
    min-width: 0;
    max-width: none;
    width: 100%;
  }

  .admin-filter-hint {
    font-size: 0.68rem;
    width: 100%;
  }

  .filter-section {
    padding: 0.55rem 0.75rem;
  }

  .sc-tools-card.tools-card {
    --tools-h: 36px;
    padding: 0.55rem 0.75rem;
  }

  .sc-tools-card .search-icon-wrap {
    width: 2.1rem;
  }

  .sc-tools-card .search-svg {
    width: 0.95rem;
    height: 0.95rem;
  }

  .sc-tools-card .toolbar-input.search-input-main {
    font-size: 0.8rem;
    padding-left: 2.1rem;
    border-radius: 9px;
  }

  .ledger-dues-hint {
    font-size: 0.72rem;
    padding: 0.55rem 1rem 0.65rem;
    margin: 0;
  }

  .ledger-dues-total {
    font-size: 0.78rem;
  }

  .ledger-withdrawals-card,
  .ledger-dues-card {
    margin-top: 0.6rem;
  }

  .section-title {
    margin: 0.6rem 0 0.4rem;
    font-size: 0.6rem;
    padding-bottom: 0.35rem;
  }

  .farmer-summary {
    padding: 0.6rem 0.7rem;
    margin-bottom: 0.6rem;
  }

  .farmer-name {
    font-size: 0.95rem;
  }

  .farmer-meta {
    font-size: 0.72rem;
  }

  .empty-state {
    padding: 1.5rem 1rem;
  }

  .empty-title {
    font-size: 0.95rem;
  }

  .empty-text {
    font-size: 0.75rem;
  }

  .input {
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.5rem 0.6rem;
  }

  .inline-label {
    font-size: 0.62rem;
  }

  /* Record / inline forms stack full-width on mobile */
  .action-row {
    flex-direction: column;
    align-items: stretch;
    gap: 0.4rem;
    margin: 0.4rem 0 0.6rem;
  }

  .action-row .form-inline,
  .payment-collection-panel .payment-form-grid {
    display: grid;
    grid-template-columns: 1fr;
    gap: 0.4rem;
    width: 100%;
  }

  .sc-member-header {
    flex-direction: column;
    gap: 0.45rem;
  }

  .payment-field--amount {
    max-width: none;
  }

  .payment-form-grid .input,
  .payment-form-grid .btn,
  .payment-form-submit {
    width: 100%;
  }

  /* Member detail is shown as a centered modal — hide the in-grid detail card */
  .sc-member-detail-card {
    display: none;
  }

  /* Dual-render: hide desktop table, show compact mobile cards */
  .fin-desktop-table {
    display: none !important;
  }

  .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
    width: 100%;
  }

  .fin-mobile-card {
    padding: 0.7rem 0.8rem 0.65rem;
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

  .fin-mobile-meta-row > span:last-child {
    text-align: right;
    word-break: break-word;
  }

  .contribution-history-desktop {
    display: none !important;
  }

  .contribution-history-mobile {
    display: flex !important;
    flex-direction: column;
    gap: 0.5rem;
    width: 100%;
  }

  .contribution-mobile-card {
    padding: 0.65rem 0.75rem;
  }

  .contribution-mobile-card .fin-mobile-card-meta {
    margin-bottom: 0.45rem;
  }

  .contribution-mobile-actions {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .contribution-mobile-actions .fin-mobile-action {
    width: 100%;
  }

  .contribution-edit-input {
    width: min(11rem, 65%);
    min-height: 36px;
    height: 36px;
    padding: 0.35rem 0.5rem;
    font-size: 0.75rem;
  }

  .table-container {
    overflow-x: visible;
    border: none;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    padding: 0.55rem 0.7rem 0.75rem !important;
  }

  .fin-mobile-empty {
    padding: 1rem 0.85rem;
  }

  /* Prevent global style.css stacked-table cards on remaining tables */
  .share-capital-page :deep(table.data-table),
  :deep(.fin-desktop-table table),
  :deep(.sc-detail-modal table.data-table) {
    display: table !important;
  }

  :deep(.fin-desktop-table table thead),
  :deep(.sc-detail-modal table.data-table thead) {
    display: table-header-group !important;
  }

  :deep(.fin-desktop-table table tbody),
  :deep(.fin-desktop-table table tr),
  :deep(.fin-desktop-table table td),
  :deep(.sc-detail-modal table.data-table tbody),
  :deep(.sc-detail-modal table.data-table tr),
  :deep(.sc-detail-modal table.data-table td),
  :deep(.tab-content table.data-table),
  :deep(.tab-content table.data-table thead),
  :deep(.tab-content table.data-table tbody),
  :deep(.tab-content table.data-table tr),
  :deep(.tab-content table.data-table td),
  :deep(.tab-content table.data-table th) {
    display: revert !important;
    width: auto !important;
    padding-left: revert !important;
    margin-bottom: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
}

@media (max-width: 480px) {
  .financial-container {
    padding: 0.55rem 0.8rem !important;
  }

  .tab-content {
    padding: 0.7rem 0.8rem !important;
  }

  .tab-content .card-header {
    flex-wrap: wrap !important;
    align-items: center !important;
    padding: 0.7rem 0.85rem !important;
  }

  .table-container {
    padding: 0.5rem 0.7rem 0.7rem !important;
  }

  .ledger-dues-hint {
    padding: 0.5rem 0.85rem 0.6rem;
    margin: 0;
  }

  .page-header h1,
  .page-title {
    font-size: 1.1rem !important;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }

  .stat-value {
    font-size: 0.92rem;
  }

  .fin-mobile-card {
    padding: 0.65rem 0.75rem;
  }

  .fin-mobile-card-name {
    font-size: 0.9rem;
  }

  .fin-mobile-label {
    min-width: 4.2rem;
    font-size: 0.62rem;
  }

  .sc-detail-modal.modal-content {
    width: calc(100vw - 1.2rem);
    max-width: calc(100vw - 1.2rem);
    max-height: calc(100vh - 1.2rem);
  }
}

.btn-link-inline {
  background: none;
  border: none;
  color: #4ade80;
  text-decoration: underline;
  text-underline-offset: 2px;
  cursor: pointer;
  font-weight: 500;
  font-size: inherit;
  line-height: inherit;
  padding: 0;
  margin: 0;
}

.financial-container.share-capital-page.light-theme .btn-link-inline {
  color: #166534;
}

/* Receipt preview modal — compact on-screen preview (print output stays full size) */
.sc-receipt-overlay.app-modal-overlay {
  z-index: 12000 !important;
  padding: 0.75rem !important;
}

.sc-receipt-overlay .receipt-modal-box {
  width: min(380px, calc(100vw - 1.5rem));
  max-width: min(380px, calc(100vw - 1.5rem));
  max-height: calc(100vh - 1.5rem);
  overflow: auto;
  -webkit-overflow-scrolling: touch;
  overscroll-behavior: contain;
  background: #ffffff;
  border-radius: 12px;
  padding: 10px;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

/* Shrink on-screen preview only — printInPage uses separate print styles */
.sc-receipt-overlay :deep(.receipt-print-root) {
  gap: 10px;
  font-size: 0.78rem;
}

.sc-receipt-overlay :deep(.payment-receipt) {
  border-width: 1.5px;
  border-radius: 3px;
}

.sc-receipt-overlay :deep(.receipt-top) {
  padding: 10px 12px 8px;
}

.sc-receipt-overlay :deep(.receipt-title) {
  font-size: 15px;
  letter-spacing: 0.4px;
}

.sc-receipt-overlay :deep(.receipt-meta-box) {
  font-size: 11px;
}

.sc-receipt-overlay :deep(.meta-line) {
  gap: 4px;
  margin-bottom: 2px;
}

.sc-receipt-overlay :deep(.meta-line span) {
  min-width: 28px;
}

.sc-receipt-overlay :deep(.receipt-org) {
  padding: 8px 12px;
  font-size: 11px;
  gap: 1px;
}

.sc-receipt-overlay :deep(.receipt-org strong) {
  font-size: 13px;
}

.sc-receipt-overlay :deep(.receipt-field) {
  padding: 8px 12px 0;
}

.sc-receipt-overlay :deep(.receipt-field label) {
  font-size: 9px;
  margin-bottom: 3px;
}

.sc-receipt-overlay :deep(.field-line) {
  min-height: 20px;
  padding-bottom: 2px;
  font-size: 12px;
}

.sc-receipt-overlay :deep(.receipt-amount-row) {
  gap: 8px;
  padding: 8px 12px 0;
}

.sc-receipt-overlay :deep(.amount-box) {
  padding: 6px 10px;
  min-width: 90px;
}

.sc-receipt-overlay :deep(.amount-box .currency) {
  font-size: 11px;
}

.sc-receipt-overlay :deep(.amount-box strong) {
  font-size: 15px;
}

.sc-receipt-overlay :deep(.inline-two) {
  gap: 10px;
}

.sc-receipt-overlay :deep(.receipt-signatures) {
  grid-template-columns: 1fr 100px;
  gap: 12px;
  padding: 12px;
}

.sc-receipt-overlay :deep(.sig-block label) {
  font-size: 9px;
}

.sc-receipt-overlay :deep(.sig-line) {
  min-height: 22px;
  padding-top: 12px;
  font-size: 12px;
}

.sc-receipt-overlay :deep(.sign-area) {
  height: 36px;
}

.sc-receipt-overlay :deep(.sign-box span) {
  font-size: 10px;
}

.sc-receipt-overlay :deep(.receipt-footer-bar) {
  padding: 8px 12px;
  font-size: 10px;
}

.sc-receipt-overlay :deep(.receipt-footer-bar strong) {
  font-size: 11px;
}

.sc-receipt-overlay :deep(.receipt-actions) {
  gap: 8px;
  justify-content: stretch;
}

.sc-receipt-overlay :deep(.btn-print),
.sc-receipt-overlay :deep(.btn-close) {
  flex: 1;
  padding: 8px 10px;
  font-size: 0.78rem;
  min-height: 40px;
  border-radius: 8px;
}

@media (max-width: 480px) {
  .sc-receipt-overlay .receipt-modal-box {
    width: calc(100vw - 1.25rem);
    max-width: calc(100vw - 1.25rem);
    max-height: calc(100vh - 1.25rem);
    padding: 8px;
  }
}

/* Centered success/error alert modal (in front of forms, blurred backdrop) */
.sc-alert-overlay.app-modal-overlay {
  z-index: 12050 !important;
}

.sc-alert-modal.modal-content {
  width: min(22rem, calc(100vw - 2rem));
  max-width: min(22rem, calc(100vw - 2rem));
  max-height: none;
  padding: 1.25rem 1.15rem 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 0.75rem;
  background: var(--glass-panel, rgba(31, 48, 36, 0.96));
  border: 1px solid rgba(190, 235, 203, 0.28);
  border-radius: 16px;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
}

.sc-alert-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 800;
  line-height: 1;
}

.sc-alert-success .sc-alert-icon {
  background: rgba(74, 222, 128, 0.18);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.4);
}

.sc-alert-error .sc-alert-icon {
  background: rgba(248, 113, 113, 0.16);
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.sc-alert-message {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
  color: var(--text-main, #eefde6);
  word-break: break-word;
}

.sc-alert-ok {
  min-width: 6.5rem;
  min-height: 40px;
  justify-content: center;
  margin-top: 0.15rem;
}

.sc-alert-overlay.light-theme {
  --glass-panel: #ffffff;
  --text-main: #052e16;
}

.sc-alert-overlay.light-theme .sc-alert-modal.modal-content {
  border-color: #86efac;
  box-shadow: 0 24px 60px rgba(22, 101, 52, 0.22);
}

.sc-alert-overlay.light-theme .sc-alert-success .sc-alert-icon {
  background: #f0fdf4;
  color: #15803d;
  border-color: #86efac;
}

.sc-alert-overlay.light-theme .sc-alert-error .sc-alert-icon {
  background: #fee2e2;
  color: #991b1b;
  border-color: #fca5a5;
}

.sc-alert-overlay.light-theme .sc-alert-message {
  color: #052e16;
}

.sc-alert-overlay.light-theme .sc-alert-ok {
  background: #ffffff;
  color: #052e16;
  -webkit-text-fill-color: #052e16;
  border-color: #166534;
}

.financial-container.share-capital-page.light-theme .ledger-note {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #14532d !important;
}

.financial-container.share-capital-page.light-theme .ledger-dues-hint {
  color: #166534 !important;
}

.financial-container.share-capital-page.light-theme .ledger-dues-total {
  color: #15803d !important;
}
</style>

<!-- Unscoped: dual-render + card padding (defeat global overrides) -->
<style>
.share-capital-page .tab-content .card-header {
  display: flex !important;
  align-items: center !important;
  justify-content: space-between !important;
  flex-wrap: wrap !important;
  gap: 0.75rem !important;
  padding: 1rem 1.25rem !important;
  box-sizing: border-box !important;
}

.share-capital-page .tab-content .card-title {
  flex: 1 1 auto !important;
  min-width: 0 !important;
  margin: 0 !important;
}

.share-capital-page .tab-content .card-header .btn-primary-action,
.share-capital-page .tab-content .card-header .ledger-dues-total {
  flex-shrink: 0 !important;
  align-self: center !important;
  margin-left: 0 !important;
}

.share-capital-page .table-container {
  padding: 0.75rem 1.25rem 1.1rem !important;
  box-sizing: border-box !important;
}

.share-capital-page .ledger-dues-hint {
  padding-left: 1.25rem !important;
  padding-right: 1.25rem !important;
  margin-left: 0 !important;
  margin-right: 0 !important;
}

@media (max-width: 768px) {
  .share-capital-page.financial-container {
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding-left: 0.9rem !important;
    padding-right: 0.9rem !important;
    box-sizing: border-box !important;
  }

  .share-capital-page .tab-content {
    padding-left: 0.9rem !important;
    padding-right: 0.9rem !important;
  }

  .share-capital-page .tab-content .card-header {
    flex-wrap: wrap !important;
    align-items: center !important;
    gap: 0.55rem !important;
    padding: 0.75rem 1rem !important;
  }

  .share-capital-page .tab-content .card-header .btn-primary-action {
    flex-shrink: 0 !important;
    align-self: center !important;
    margin-left: 0 !important;
    min-height: 34px;
  }

  .share-capital-page .table-container {
    padding: 0.55rem 0.85rem 0.75rem !important;
  }

  .share-capital-page .ledger-dues-hint {
    padding-left: 1rem !important;
    padding-right: 1rem !important;
  }

  .share-capital-page .fin-desktop-table {
    display: none !important;
  }

  .share-capital-page .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
  }

  .share-capital-page .fin-desktop-table table.data-table,
  .share-capital-page .fin-desktop-table table.data-table thead,
  .share-capital-page .fin-desktop-table table.data-table tbody,
  .share-capital-page .fin-desktop-table table.data-table tr,
  .share-capital-page .fin-desktop-table table.data-table th,
  .share-capital-page .fin-desktop-table table.data-table td {
    display: revert !important;
    width: auto !important;
    position: static !important;
    padding-left: revert !important;
    margin-bottom: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }

  .share-capital-page .stats-grid,
  .share-capital-page .stats-grid--overview {
    grid-template-columns: 1fr 1fr !important;
  }

  .share-capital-page .stats-group {
    margin-bottom: 0.75rem !important;
  }

  .share-capital-page .stats-group-title {
    font-size: 0.62rem !important;
    margin-bottom: 0.4rem !important;
  }

  .share-capital-page .stats-grid > .stat-card:last-child:nth-child(odd) {
    grid-column: 1 / -1;
  }
}

@media (max-width: 480px) {
  .share-capital-page.financial-container {
    padding-left: 0.8rem !important;
    padding-right: 0.8rem !important;
  }

  .share-capital-page .tab-content {
    padding-left: 0.8rem !important;
    padding-right: 0.8rem !important;
  }

  .share-capital-page .tab-content .card-header {
    padding: 0.7rem 0.85rem !important;
  }

  .share-capital-page .table-container {
    padding: 0.5rem 0.7rem 0.7rem !important;
  }

  .share-capital-page .ledger-dues-hint {
    padding-left: 0.85rem !important;
    padding-right: 0.85rem !important;
  }
}

@media (min-width: 769px) {
  html body .financial-container.share-capital-page.glass-module-page {
    padding: 8px 12px !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    font-size: 14px !important;
    line-height: 1.45 !important;
    border-radius: 12px !important;
    min-height: 0 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .page-header,
  html body .financial-container.share-capital-page.glass-module-page .page-header-split {
    margin-bottom: 6px !important;
    padding: 6px 10px !important;
    gap: 4px !important;
    border-radius: 10px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page h1.page-title,
  html body .financial-container.share-capital-page.glass-module-page .page-title {
    font-size: 1.05rem !important;
    line-height: 1.15 !important;
    margin: 0 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .page-subtitle {
    font-size: 0.7rem !important;
    line-height: 1.3 !important;
    margin: 0 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content {
    padding: 8px 10px !important;
    border-radius: 10px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content--main {
    padding-top: 8px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .info-banner {
    padding: 6px 10px !important;
    margin-bottom: 6px !important;
    font-size: 11px !important;
    border-width: 1px !important;
    border-radius: 8px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .stats-grid {
    gap: 6px !important;
    margin-bottom: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .stat-card {
    padding: 6px 8px !important;
    border-radius: 8px !important;
    border-width: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .stat-label {
    font-size: 8px !important;
    margin-bottom: 1px !important;
    letter-spacing: 0.04em !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .stat-value {
    font-size: 0.95rem !important;
    line-height: 1.05 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .ledger-note {
    margin: 0 0 6px !important;
    padding: 5px 8px !important;
    font-size: 11px !important;
    line-height: 1.35 !important;
    border-radius: 8px !important;
    border-width: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page :is(
    .ledger-withdrawals-card,
    .ledger-dues-card
  ) {
    margin-top: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .card {
    border-radius: 10px !important;
    border-width: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .card-header {
    gap: 6px !important;
    padding: 5px 8px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .card-title {
    font-size: 0.82rem !important;
    line-height: 1.2 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .ledger-dues-total {
    font-size: 0.72rem !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .ledger-dues-hint {
    padding: 3px 8px 6px !important;
    font-size: 11px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .table-container {
    padding: 5px 8px 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .fin-desktop-table,
  html body .financial-container.share-capital-page.glass-module-page .contribution-history-desktop {
    max-height: min(22rem, 52vh) !important;
    border-radius: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .data-table,
  html body .financial-container.share-capital-page.glass-module-page table.data-table {
    font-size: 11px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .data-table th {
    padding: 4px 6px !important;
    font-size: 9px !important;
    line-height: 1.2 !important;
    border-bottom-width: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .data-table td {
    padding: 4px 6px !important;
    font-size: 11px !important;
    line-height: 1.25 !important;
    border-bottom-width: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .data-table tbody tr {
    height: 1.9rem !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content table.data-table tbody td.amount,
  html body .financial-container.share-capital-page.glass-module-page .tab-content .data-table td.td-amount {
    font-size: 11px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .data-table .badge {
    min-width: 4rem !important;
    padding: 1px 5px !important;
    font-size: 9px !important;
    border-width: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .data-table .btn-small {
    padding: 2px 7px !important;
    font-size: 10px !important;
    min-height: 24px !important;
    border-radius: 6px !important;
    font-weight: 600 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page td.actions-cell .table-action-btn {
    width: 24px !important;
    height: 24px !important;
    min-width: 24px !important;
    min-height: 24px !important;
    border-radius: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page td.actions-cell .table-action-btn svg {
    width: 12px !important;
    height: 12px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .table-empty {
    padding: 8px 6px !important;
    font-size: 11px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .data-table td .input {
    min-height: 24px !important;
    height: 24px !important;
    font-size: 10px !important;
    padding: 2px 5px !important;
    border-width: 1px !important;
    border-radius: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page :is(
    .btn,
    .btn-primary-action,
    .btn-muted,
    .btn-success,
    .btn-danger
  ) {
    padding: 4px 10px !important;
    font-size: 12px !important;
    min-height: 28px !important;
    border-width: 1px !important;
    border-radius: 6px !important;
    font-weight: 600 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .btn-small {
    padding: 2px 7px !important;
    font-size: 10px !important;
    min-height: 24px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .input,
  html body .financial-container.share-capital-page.glass-module-page select.input {
    padding: 4px 8px !important;
    font-size: 12px !important;
    min-height: 28px !important;
    height: 28px !important;
    border-width: 1px !important;
    border-radius: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .admin-filter-bar {
    gap: 6px !important;
    margin-bottom: 6px !important;
    padding: 5px 8px !important;
    border-radius: 8px !important;
    border-width: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .admin-filter-label {
    font-size: 10px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .admin-filter-hint {
    font-size: 10px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-tools-card.tools-card {
    --tools-h: 28px;
    gap: 4px !important;
    padding: 5px 8px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-tools-card .toolbar-input.search-input-main {
    font-size: 11px !important;
    min-height: 28px !important;
    height: 28px !important;
    border-width: 1px !important;
    border-radius: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .filter-section {
    padding: 5px 8px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .card-body {
    padding: 6px 8px 8px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .empty-state {
    padding: 14px 10px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .empty-title {
    font-size: 0.85rem !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .empty-text {
    font-size: 11px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .stats-group {
    margin-bottom: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .stats-grid--overview {
    grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
    gap: 6px !important;
    margin-bottom: 0 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .stat-content {
    display: flex !important;
    flex-direction: column !important;
    align-items: flex-start !important;
    width: 100% !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .grid-2 {
    gap: 8px !important;
    align-items: start !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .tab-content .card-header .btn-primary-action {
    padding: 4px 10px !important;
    font-size: 11px !important;
    min-height: 28px !important;
    white-space: nowrap !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .sc-member-detail-body {
    padding: 6px 8px 8px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .sc-member-header {
    gap: 6px !important;
    margin-bottom: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .farmer-summary {
    margin-bottom: 0 !important;
    padding: 5px 8px !important;
    border-radius: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .farmer-name {
    font-size: 0.78rem !important;
    margin-bottom: 1px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .farmer-meta {
    font-size: 10px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .sc-member-total {
    padding: 5px 8px !important;
    border-radius: 6px !important;
    min-width: 5.5rem !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .sc-member-total-label {
    font-size: 7px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .sc-member-total-value {
    font-size: 0.82rem !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .action-row {
    margin-top: 0 !important;
    margin-bottom: 6px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .payment-form-grid {
    display: grid !important;
    grid-template-columns: minmax(0, 1.15fr) minmax(0, 0.95fr) 3.6rem auto !important;
    gap: 3px 6px !important;
    align-items: end !important;
    width: 100% !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .payment-field .inline-label {
    font-size: 7px !important;
    letter-spacing: 0.04em !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .payment-field .input {
    min-height: 26px !important;
    height: 26px !important;
    padding: 3px 6px !important;
    font-size: 11px !important;
    border-radius: 6px !important;
    max-width: none !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .payment-field--amount {
    max-width: 3.6rem !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .payment-form-submit {
    padding: 4px 8px !important;
    font-size: 10px !important;
    min-height: 26px !important;
    height: 26px !important;
    border-radius: 6px !important;
    margin-left: 0 !important;
    align-self: end !important;
    line-height: 1.2 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .section-title {
    font-size: 9px !important;
    margin: 4px 0 3px !important;
    padding-bottom: 3px !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .contribution-history-desktop {
    max-height: min(11rem, 32vh) !important;
    overflow-x: auto !important;
    overflow-y: auto !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .ledger-table-contributions {
    min-width: 0 !important;
    width: 100% !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .sc-member-detail-card .sc-contributions-table {
    padding: 0 !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .table-container {
    overflow: hidden !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .fin-desktop-table {
    overflow-x: auto !important;
    overflow-y: auto !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .ledger-table-members {
    min-width: 32rem !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .td-actions .btn-small {
    min-width: 3rem !important;
    padding-left: 8px !important;
    padding-right: 8px !important;
  }

  body.glass-dark .financial-container.share-capital-page.glass-module-page :is(
    .btn,
    .btn-primary-action,
    .btn-muted,
    .btn-success,
    .btn-danger,
    .btn-small
  ),
  body.glass-light .financial-container.share-capital-page.glass-module-page :is(
    .btn,
    .btn-primary-action,
    .btn-muted,
    .btn-success,
    .btn-danger,
    .btn-small
  ) {
    border-radius: 6px !important;
    font-weight: 600 !important;
  }

  body.glass-dark .financial-container.share-capital-page.glass-module-page :is(
    .btn,
    .btn-primary-action,
    .btn-muted,
    .btn-success,
    .btn-danger
  ),
  body.glass-light .financial-container.share-capital-page.glass-module-page :is(
    .btn,
    .btn-primary-action,
    .btn-muted,
    .btn-success,
    .btn-danger
  ) {
    border-width: 1px !important;
  }
}

@media (min-width: 769px) and (max-width: 1280px) {
  html body .financial-container.share-capital-page.glass-module-page .ledger-view .stats-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
  }

  html body .financial-container.share-capital-page.glass-module-page .fin-desktop-table,
  html body .financial-container.share-capital-page.glass-module-page .contribution-history-desktop {
    max-height: min(20rem, 48vh) !important;
  }
}
</style>
