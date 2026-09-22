<template>
  <div class="page-container machinery-management-page machinery-ui" :class="{ 'light-theme': isLight }">
    <!-- Page Header (Barangays-style split) -->
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.machineryManagement') }}</h1>
        <p class="page-subtitle" v-if="isAdminOnly">{{ $t('ui.machineryManagementAdminSub') }}</p>
        <p class="page-subtitle" v-else-if="isPresidentRole">{{ $t('ui.machineryManagementPresidentSub') }}</p>
        <p class="page-subtitle" v-else>{{ $t('ui.machineryManagementSub') }}</p>
      </div>
      <button
        v-if="isAdminOnly || isPresidentRole"
        type="button"
        class="btn-header-add"
        @click="showAddMachineryModal = true"
      >
        <svg class="btn-header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        {{ $t('common.addMachinery') }}
      </button>
    </div>

    <div
      v-if="isPresidentRole"
      class="dp-module-panel"
      :class="{ 'dp-module-panel--off': !dpEnabled }"
    >
      <div class="dp-module-panel__text">
        <h2 class="dp-module-panel__title">{{ $t('ui.machineryDownPaymentModule') }}</h2>
        <p class="dp-module-panel__desc">
          {{ dpEnabled ? $t('ui.machineryDownPaymentOnDesc') : $t('ui.machineryDownPaymentOffDesc') }}
        </p>
        <label class="dp-percent-label" for="dp-percent-input">{{ $t('ui.machineryDownPaymentPercent') }}</label>
        <div class="dp-percent-row">
          <input
            id="dp-percent-input"
            v-model="dpPercentInput"
            type="text"
            class="dp-percent-input"
            inputmode="decimal"
            placeholder="10, 15, 20, 30"
            :disabled="dpSaving"
            @blur="normalizeDownPaymentPercentField"
          />
          <span class="dp-percent-suffix">%</span>
          <button
            type="button"
            class="btn-secondary dp-percent-save"
            :disabled="dpSaving || !dpPercentDirty"
            @click="saveDownPaymentPercent"
          >
            {{ $t('common.save') }}
          </button>
        </div>
        <p class="dp-percent-hint">{{ $t('ui.machineryDownPaymentPercentHint') }}</p>
      </div>
      <button
        type="button"
        class="dp-module-toggle"
        :class="{ 'dp-module-toggle--on': dpEnabled, 'dp-module-toggle--off': !dpEnabled }"
        :disabled="dpSaving"
        @click="toggleDownPayment"
        :aria-pressed="dpEnabled"
      >
        <span class="dp-module-toggle__track">
          <span class="dp-module-toggle__thumb"></span>
        </span>
        <span class="dp-module-toggle__label">{{ dpEnabled ? $t('ui.machineryDownPaymentOnLabel') : $t('ui.machineryDownPaymentOffLabel') }}</span>
      </button>
      <p v-if="dpMessage" class="dp-module-panel__msg" :class="dpMessageType">{{ dpMessage }}</p>
    </div>

    <!-- Stats Overview (Hidden for Admin-Only) -->
    <div v-if="!isAdminOnly" class="stats-group stats-group--machinery">
      <div class="stats-grid stats-grid--machinery">
        <div class="stat-card stat-card-total">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.totalMachinery') }}</div>
            <div class="stat-value">{{ totalMachinery }}</div>
          </div>
        </div>
        <div class="stat-card stat-success">
          <div class="stat-content">
            <div class="stat-label">{{ $t('common.available') }}</div>
            <div class="stat-value">{{ availableMachinery }}</div>
          </div>
        </div>
        <div class="stat-card stat-pending">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.pendingBookings') }}</div>
            <div class="stat-value">{{ pendingBookingsCount }}</div>
          </div>
        </div>
        <div class="stat-card stat-info">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.totalRevenue') }}</div>
            <div class="stat-value">₱{{ formatNumber(totalRevenue) }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- Admin Inventory View -->
    <template v-if="isAdminOnly">
      <div class="tools-card">
        <div class="tools-card-top">
          <div class="search-bar">
            <span class="search-icon-wrap" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-svg">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
              </svg>
            </span>
            <input v-model="invQ" type="text" class="toolbar-input search-input-main" :placeholder="$t('ui.searchNameType')" />
          </div>
          <div class="inv2-view-toggle" title="View format">
            <button type="button" class="inv2-view-btn" :class="{ active: invView === 'table' }" @click="invView = 'table'" :title="$t('ui.tableView')" :aria-label="$t('ui.tableView')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3h18M3 9h18M3 15h18M3 21h18"/></svg>
            </button>
            <button type="button" class="inv2-view-btn" :class="{ active: invView === 'card' }" @click="invView = 'card'" :title="$t('ui.cardView')" :aria-label="$t('ui.cardView')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
          </div>
        </div>
        <div class="filter-group">
          <select v-model="invTypeF" class="toolbar-select">
            <option value="">{{ $t('ui.allTypes') }}</option>
            <option v-for="t in invUniqueTypes" :key="t" :value="t">{{ t }}</option>
          </select>
          <select v-model="invStatusF" class="toolbar-select">
            <option value="">{{ $t('ui.allStatus') }}</option>
            <option value="Available">{{ $t('common.available') }}</option>
            <option value="Unavailable">{{ $t('common.unavailable') }}</option>
          </select>
          <select v-model="invBarangayF" class="toolbar-select">
            <option value="">{{ $t('ui.allBarangays') }}</option>
            <option v-for="barangay in barangays" :key="barangay.id" :value="String(barangay.id)">
              {{ barangay.name }}
            </option>
          </select>
        </div>
        <div v-if="invQ || invTypeF || invStatusF || invBarangayF" class="tools-chips">
          <div class="tools-chips-list">
            <span v-if="invQ" class="inv2-chip">
              Search: "{{ invQ }}"
              <button type="button" @click="invQ = ''" class="inv2-chip-x" aria-label="Clear search chip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
            <span v-if="invTypeF" class="inv2-chip">
              Type: {{ invTypeF }}
              <button type="button" @click="invTypeF = ''" class="inv2-chip-x" aria-label="Clear type chip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
            <span v-if="invStatusF" class="inv2-chip">
              Status: {{ invStatusF }}
              <button type="button" @click="invStatusF = ''" class="inv2-chip-x" aria-label="Clear status chip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
            <span v-if="invBarangayF" class="inv2-chip">
              Barangay: {{ getBarangayName(invBarangayF) }}
              <button type="button" @click="invBarangayF = ''" class="inv2-chip-x" aria-label="Clear barangay chip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          </div>
          <button type="button" @click="clearInvFilters" class="inv2-clear-all">{{ $t('common.clearAll') }}</button>
        </div>
      </div>

      <div class="card inv2-data-card">
        <div class="inv2-card-meta-bar">
          <span class="inv2-record-count">{{ invFiltered.length }} record{{ invFiltered.length !== 1 ? 's' : '' }} found</span>
        </div>
        <div class="inv2-body">
          <div v-if="loading" class="inv2-empty">
            <div class="loading-spinner"></div>
            <div>{{ $t('ui.loadingMachinery') }}</div>
          </div>

          <template v-if="!loading && invView === 'table'">
          <div class="inv2-table-wrap inv2-desktop-table">
            <table class="inv2-table">
              <colgroup>
                <col class="inv2-col-name" />
                <col class="inv2-col-type" />
                <col class="inv2-col-barangay" />
                <col class="inv2-col-member" />
                <col class="inv2-col-nonmember" />
                <col class="inv2-col-interest" />
                <col class="inv2-col-capacity" />
                <col class="inv2-col-status" />
                <col class="inv2-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th class="inv2-th-name">{{ $t('ui.name') }}</th>
                  <th>{{ $t('ui.type') }}</th>
                  <th>{{ $t('ui.barangay') }}</th>
                  <th class="inv2-th-rate">{{ $t('ui.memberRate') }}</th>
                  <th class="inv2-th-rate">{{ $t('ui.nonMemberRate') }}</th>
                  <th class="inv2-th-rate">{{ $t('ui.interestRate') }}</th>
                  <th>{{ $t('ui.capacity') }}</th>
                  <th>{{ $t('ui.status') }}</th>
                  <th class="inv2-th-actions">{{ $t('ui.actions') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="invFiltered.length === 0">
                  <td colspan="9" class="inv2-empty">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:10px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <div>{{ $t('ui.noMachinery') }}</div>
                  </td>
                </tr>
                <tr v-else v-for="(m, i) in invPaged" :key="m.id" class="inv2-row" :class="i % 2 === 0 ? 'inv2-row-a' : 'inv2-row-b'">
                  <td class="inv2-td-name">
                    <span class="inv2-name">{{ m.machinery_name }}</span>
                  </td>
                  <td>
                    <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                  </td>
                  <td>
                    <span class="barangay-badge">{{ getBarangayName(m.barangay_id) }}</span>
                  </td>
                  <td class="inv2-td-rate">
                    <span v-if="m.member_price" class="inv2-price inv2-price-member">₱{{ formatNumber(m.member_price) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                    <span v-else class="inv2-price inv2-price-main">₱{{ formatNumber(m.price_per_unit) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                  </td>
                  <td class="inv2-td-rate">
                    <span v-if="m.non_member_price" class="inv2-price inv2-price-nonmember">₱{{ formatNumber(m.non_member_price) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                    <span v-else class="inv2-na">—</span>
                  </td>
                  <td class="inv2-td-center inv2-td-interest">
                    <span class="inv2-interest">{{ formatInterestRateDisplay(m.interest_rate) }}</span>
                  </td>
                  <td class="inv2-td-center">
                    <span v-if="m.max_capacity" class="inv2-cap">{{ m.max_capacity }} {{ m.capacity_unit }}</span>
                    <span v-else class="inv2-na">—</span>
                  </td>
                  <td class="inv2-td-center">
                    <span class="status-badge" :class="'status-' + getStatusClass(machineryStatusLabel(m))">{{ machineryStatusLabel(m) }}</span>
                  </td>
                  <td class="inv2-td-actions">
                    <div class="inv2-actions action-buttons">
                      <button type="button" @click="editMachinery(m)" class="machinery-action-btn machinery-action-edit machinery-action-icon" :title="$t('ui.editMachinery')" :aria-label="$t('ui.editMachinery')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-btn machinery-action-delete machinery-action-icon" :title="$t('common.delete')" :aria-label="$t('common.delete')">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div class="inv2-mobile-list">
            <div v-if="invFiltered.length === 0" class="inv2-empty">
              <div>{{ $t('ui.noMachinery') }}</div>
            </div>
            <article v-else v-for="m in invPaged" :key="'ml-' + m.id" class="inv2-mobile-card">
              <div class="inv2-mobile-card-top">
                <h4 class="inv2-mobile-card-name">{{ m.machinery_name }}</h4>
                <span class="status-badge" :class="'status-' + getStatusClass(machineryStatusLabel(m))">{{ machineryStatusLabel(m) }}</span>
              </div>
              <div class="inv2-mobile-card-meta">
                <div class="inv2-mobile-meta-row">
                  <span class="inv2-mobile-label">{{ $t('ui.type') }}</span>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                </div>
                <div class="inv2-mobile-meta-row">
                  <span class="inv2-mobile-label">{{ $t('ui.barangay') }}</span>
                  <span>{{ getBarangayName(m.barangay_id) || '—' }}</span>
                </div>
                <div class="inv2-mobile-meta-row">
                  <span class="inv2-mobile-label">{{ $t('ui.member') }}</span>
                  <span>₱{{ formatNumber(m.member_price || m.price_per_unit) }}/{{ m.unit_type }}</span>
                </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.nonMember') }}</span>
                    <span v-if="m.non_member_price">₱{{ formatNumber(m.non_member_price) }}/{{ m.unit_type }}</span>
                    <span v-else>—</span>
                  </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.interestRate') }}</span>
                    <span>{{ formatInterestRateDisplay(m.interest_rate) }}</span>
                  </div>
                  <div class="inv2-mobile-meta-row" v-if="m.max_capacity">
                  <span class="inv2-mobile-label">{{ $t('ui.capacity') }}</span>
                  <span>{{ m.max_capacity }} {{ m.capacity_unit }}</span>
                </div>
              </div>
              <div class="inv2-mobile-card-actions action-buttons">
                <button type="button" class="machinery-action-text machinery-action-edit-text" @click="editMachinery(m)">{{ $t('common.edit') }}</button>
                <button type="button" class="machinery-action-text machinery-action-delete-text" @click="deleteMachineryConfirm(m)">{{ $t('common.delete') }}</button>
              </div>
            </article>
          </div>
          </template>

          <div v-if="!loading && invView === 'card'" class="inv2-cards-grid">
            <div v-if="invFiltered.length === 0" class="inv2-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:10px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <div>{{ $t('ui.noMachinery') }}</div>
            </div>
            <div v-else v-for="m in invPaged" :key="'c' + m.id" class="inv2-card">
              <div class="inv2-card-img">
                <img v-if="getImageUrl(m.machinery_picture)" :src="getImageUrl(m.machinery_picture)" :alt="m.machinery_name" @error="handleImageError" />
                <div v-else class="inv2-card-img-fallback">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                </div>
                <span class="inv2-card-status-badge status-badge" :class="'status-' + getStatusClass(machineryStatusLabel(m))">{{ machineryStatusLabel(m) }}</span>
              </div>
              <div class="inv2-card-body">
                <div class="inv2-card-top">
                  <span class="inv2-card-name">{{ m.machinery_name }}</span>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                </div>
                <div class="inv2-card-barangay">{{ getBarangayName(m.barangay_id) }}</div>
                <div class="inv2-card-pricing">
                  <div class="inv2-card-price-row">
                    <span class="inv2-card-price-label">{{ $t('ui.member') }}</span>
                    <span class="inv2-price inv2-price-member">₱{{ formatNumber(m.member_price || m.price_per_unit) }}/{{ m.unit_type }}</span>
                  </div>
                  <div v-if="m.non_member_price" class="inv2-card-price-row">
                    <span class="inv2-card-price-label">{{ $t('ui.nonMember') }}</span>
                    <span class="inv2-price inv2-price-nonmember">₱{{ formatNumber(m.non_member_price) }}/{{ m.unit_type }}</span>
                  </div>
                  <div class="inv2-card-price-row">
                    <span class="inv2-card-price-label">{{ $t('ui.interestRate') }}</span>
                    <span class="inv2-interest">{{ formatInterestRateDisplay(m.interest_rate) }}</span>
                  </div>
                </div>
                <div v-if="m.max_capacity" class="inv2-card-cap">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  {{ m.max_capacity }} {{ m.capacity_unit }}
                </div>
                <div class="inv2-card-actions action-buttons">
                  <button type="button" @click="editMachinery(m)" class="machinery-action-btn machinery-action-edit machinery-action-icon" :title="$t('ui.editMachinery')" :aria-label="$t('ui.editMachinery')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-btn machinery-action-delete machinery-action-icon" :title="$t('common.delete')" :aria-label="$t('common.delete')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <button type="button" @click="editMachinery(m)" class="machinery-action-text machinery-action-edit-text">{{ $t('common.edit') }}</button>
                  <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-text machinery-action-delete-text">{{ $t('common.delete') }}</button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!loading && invTotalPg > 1" class="inv2-pagination">
            <button type="button" class="inv2-pg-btn" :disabled="invPg === 1" @click="invPg--">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="inv2-pg-info">{{ invPg }} / {{ invTotalPg }}</span>
            <button type="button" class="inv2-pg-btn" :disabled="invPg === invTotalPg" @click="invPg++">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- President's Machinery Inventory Section (Admin-aligned layout) -->
    <template v-if="isPresidentRole">
      <div class="tools-card">
        <div class="tools-card-top">
          <div class="search-bar">
            <span class="search-icon-wrap" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-svg">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
              </svg>
            </span>
            <input v-model="invQ" type="text" class="toolbar-input search-input-main" :placeholder="$t('ui.searchNameType')" />
          </div>
          <div class="inv2-view-toggle" title="View format">
            <button type="button" class="inv2-view-btn" :class="{ active: invView === 'table' }" @click="invView = 'table'" :title="$t('ui.tableView')" :aria-label="$t('ui.tableView')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3h18M3 9h18M3 15h18M3 21h18"/></svg>
            </button>
            <button type="button" class="inv2-view-btn" :class="{ active: invView === 'card' }" @click="invView = 'card'" :title="$t('ui.cardView')" :aria-label="$t('ui.cardView')">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
            </button>
          </div>
        </div>
        <div class="filter-group filter-group-2">
          <select v-model="invTypeF" class="toolbar-select">
            <option value="">{{ $t('ui.allTypes') }}</option>
            <option v-for="t in invUniqueTypes" :key="t" :value="t">{{ t }}</option>
          </select>
          <select v-model="invStatusF" class="toolbar-select">
            <option value="">{{ $t('ui.allStatus') }}</option>
            <option value="Available">{{ $t('common.available') }}</option>
            <option value="Unavailable">{{ $t('common.unavailable') }}</option>
          </select>
        </div>
        <div v-if="invQ || invTypeF || invStatusF" class="tools-chips">
          <div class="tools-chips-list">
            <span v-if="invQ" class="inv2-chip">
              Search: "{{ invQ }}"
              <button type="button" @click="invQ = ''" class="inv2-chip-x" aria-label="Clear search chip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
            <span v-if="invTypeF" class="inv2-chip">
              Type: {{ invTypeF }}
              <button type="button" @click="invTypeF = ''" class="inv2-chip-x" aria-label="Clear type chip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
            <span v-if="invStatusF" class="inv2-chip">
              Status: {{ invStatusF }}
              <button type="button" @click="invStatusF = ''" class="inv2-chip-x" aria-label="Clear status chip">
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
              </button>
            </span>
          </div>
          <button type="button" @click="clearInvFilters" class="inv2-clear-all">{{ $t('common.clearAll') }}</button>
        </div>
      </div>

      <div class="card inv2-data-card">
        <div class="inv2-card-meta-bar">
          <span class="inv2-record-count">
            {{ invFiltered.length }} record{{ invFiltered.length !== 1 ? 's' : '' }} found
            <span class="inv2-barangay-hint">· {{ barangays.find(b => b.id === userBarangayId)?.name || 'Your Barangay' }}</span>
          </span>
        </div>
        <div class="inv2-body">
          <div v-if="loading" class="inv2-empty">
            <div class="loading-spinner"></div>
            <div>{{ $t('ui.loadingMachinery') }}</div>
          </div>

          <template v-if="!loading && invView === 'table'">
            <div class="inv2-table-wrap inv2-desktop-table">
              <table class="inv2-table inv2-table-president">
                <colgroup>
                  <col class="inv2-col-name" />
                  <col class="inv2-col-type" />
                  <col class="inv2-col-operator" />
                  <col class="inv2-col-member" />
                  <col class="inv2-col-nonmember" />
                  <col class="inv2-col-interest" />
                  <col class="inv2-col-status" />
                  <col class="inv2-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th class="inv2-th-name">{{ $t('ui.name') }}</th>
                    <th>{{ $t('ui.type') }}</th>
                    <th class="inv2-th-operator">{{ $t('ui.operator') }}</th>
                    <th class="inv2-th-rate">{{ $t('ui.memberRate') }}</th>
                    <th class="inv2-th-rate">{{ $t('ui.nonMemberRate') }}</th>
                    <th class="inv2-th-rate">{{ $t('ui.interestRate') }}</th>
                    <th>{{ $t('ui.status') }}</th>
                    <th class="inv2-th-actions">{{ $t('ui.actions') }}</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-if="invFiltered.length === 0">
                    <td colspan="8" class="inv2-empty">
                      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:10px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                      <div>{{ $t('ui.noMachinery') }}</div>
                    </td>
                  </tr>
                  <tr v-else v-for="(m, i) in invPaged" :key="m.id" class="inv2-row" :class="i % 2 === 0 ? 'inv2-row-a' : 'inv2-row-b'">
                    <td class="inv2-td-name">
                      <span class="inv2-name">{{ m.machinery_name }}</span>
                    </td>
                    <td>
                      <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                    </td>
                    <td class="inv2-td-operator">
                      <div v-if="m.assigned_operator_name" class="operator-assigned">
                        <span class="operator-assigned__name">{{ m.assigned_operator_name }}</span>
                        <span v-if="m.assignment_date" class="operator-assigned__date">Since {{ formatDate(m.assignment_date) }}</span>
                      </div>
                      <span v-else class="operator-missing">{{ $t('ui.notAssigned') }}</span>
                    </td>
                    <td class="inv2-td-rate">
                      <span v-if="m.member_price" class="inv2-price inv2-price-member">₱{{ formatNumber(m.member_price) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                      <span v-else class="inv2-price inv2-price-main">₱{{ formatNumber(m.price_per_unit) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                    </td>
                    <td class="inv2-td-rate">
                      <span v-if="m.non_member_price" class="inv2-price inv2-price-nonmember">₱{{ formatNumber(m.non_member_price) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                      <span v-else class="inv2-na">—</span>
                    </td>
                    <td class="inv2-td-center inv2-td-interest">
                      <span class="inv2-interest">{{ formatInterestRateDisplay(m.interest_rate) }}</span>
                    </td>
                    <td class="inv2-td-center">
                      <span class="status-badge" :class="'status-' + getStatusClass(machineryStatusLabel(m))">{{ machineryStatusLabel(m) }}</span>
                    </td>
                    <td class="inv2-td-actions">
                      <div class="inv2-actions action-buttons">
                        <button type="button" @click="openAssignOperatorModal(m)" class="machinery-action-btn machinery-action-assign machinery-action-icon" title="Assign Operator" aria-label="Assign Operator">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                          </svg>
                        </button>
                        <button type="button" @click="editMachinery(m)" class="machinery-action-btn machinery-action-edit machinery-action-icon" :title="$t('common.edit')" :aria-label="$t('common.edit')">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-btn machinery-action-delete machinery-action-icon" :title="$t('common.delete')" :aria-label="$t('common.delete')">
                          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                            <polyline points="3 6 5 6 21 6"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6M14 11v6"/>
                            <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div class="inv2-mobile-list">
              <div v-if="invFiltered.length === 0" class="inv2-empty">
                <div>{{ $t('ui.noMachinery') }}</div>
              </div>
              <article v-else v-for="m in invPaged" :key="'pml-' + m.id" class="inv2-mobile-card">
                <div class="inv2-mobile-card-top">
                  <h4 class="inv2-mobile-card-name">{{ m.machinery_name }}</h4>
                  <span class="status-badge" :class="'status-' + getStatusClass(machineryStatusLabel(m))">{{ machineryStatusLabel(m) }}</span>
                </div>
                <div class="inv2-mobile-card-meta">
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.type') }}</span>
                    <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                  </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.operator') }}</span>
                    <span>{{ m.assigned_operator_name || 'Not assigned' }}</span>
                  </div>
                  <div v-if="m.requires_machinery_name" class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.requires') }}</span>
                    <span>{{ m.requires_machinery_name }}</span>
                  </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.member') }}</span>
                    <span>₱{{ formatNumber(m.member_price || m.price_per_unit) }}/{{ m.unit_type }}</span>
                  </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.nonMember') }}</span>
                    <span v-if="m.non_member_price">₱{{ formatNumber(m.non_member_price) }}/{{ m.unit_type }}</span>
                    <span v-else>—</span>
                  </div>
                  <div class="inv2-mobile-meta-row">
                    <span class="inv2-mobile-label">{{ $t('ui.interestRate') }}</span>
                    <span>{{ formatInterestRateDisplay(m.interest_rate) }}</span>
                  </div>
                </div>
                <div class="inv2-mobile-card-actions action-buttons">
                  <button type="button" class="machinery-action-text machinery-action-assign-text" @click="openAssignOperatorModal(m)">{{ $t('common.assign') }}</button>
                  <button type="button" class="machinery-action-text machinery-action-edit-text" @click="editMachinery(m)">{{ $t('common.edit') }}</button>
                  <button type="button" class="machinery-action-text machinery-action-delete-text" @click="deleteMachineryConfirm(m)">{{ $t('common.delete') }}</button>
                </div>
              </article>
            </div>
          </template>

          <div v-if="!loading && invView === 'card'" class="inv2-cards-grid">
            <div v-if="invFiltered.length === 0" class="inv2-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:10px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <div>{{ $t('ui.noMachinery') }}</div>
            </div>
            <div v-else v-for="m in invPaged" :key="'pc' + m.id" class="inv2-card">
              <div class="inv2-card-img">
                <img v-if="getImageUrl(m.machinery_picture)" :src="getImageUrl(m.machinery_picture)" :alt="m.machinery_name" @error="handleImageError" />
                <div v-else class="inv2-card-img-fallback">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                </div>
                <span class="inv2-card-status-badge status-badge" :class="'status-' + getStatusClass(machineryStatusLabel(m))">{{ machineryStatusLabel(m) }}</span>
              </div>
              <div class="inv2-card-body">
                <div class="inv2-card-top">
                  <span class="inv2-card-name">{{ m.machinery_name }}</span>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                </div>
                <div class="inv2-card-barangay">{{ m.assigned_operator_name || 'No operator assigned' }}</div>
                <div v-if="m.requires_machinery_name" class="inv2-card-barangay inv2-card-requires">
                  {{ $t('ui.requires') }}: {{ m.requires_machinery_name }}
                </div>
                <div class="inv2-card-pricing">
                  <div class="inv2-card-price-row">
                    <span class="inv2-card-price-label">{{ $t('ui.member') }}</span>
                    <span class="inv2-price inv2-price-member">₱{{ formatNumber(m.member_price || m.price_per_unit) }}/{{ m.unit_type }}</span>
                  </div>
                  <div v-if="m.non_member_price" class="inv2-card-price-row">
                    <span class="inv2-card-price-label">{{ $t('ui.nonMember') }}</span>
                    <span class="inv2-price inv2-price-nonmember">₱{{ formatNumber(m.non_member_price) }}/{{ m.unit_type }}</span>
                  </div>
                  <div class="inv2-card-price-row">
                    <span class="inv2-card-price-label">{{ $t('ui.interestRate') }}</span>
                    <span class="inv2-interest">{{ formatInterestRateDisplay(m.interest_rate) }}</span>
                  </div>
                </div>
                <div class="inv2-card-actions action-buttons">
                  <button type="button" @click="openAssignOperatorModal(m)" class="machinery-action-btn machinery-action-assign machinery-action-icon" title="Assign Operator" aria-label="Assign Operator">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><line x1="19" y1="8" x2="19" y2="14"/><line x1="22" y1="11" x2="16" y2="11"/>
                    </svg>
                  </button>
                  <button type="button" @click="editMachinery(m)" class="machinery-action-btn machinery-action-edit machinery-action-icon" :title="$t('common.edit')" :aria-label="$t('common.edit')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-btn machinery-action-delete machinery-action-icon" :title="$t('common.delete')" :aria-label="$t('common.delete')">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <button type="button" @click="openAssignOperatorModal(m)" class="machinery-action-text machinery-action-assign-text">{{ $t('common.assign') }}</button>
                  <button type="button" @click="editMachinery(m)" class="machinery-action-text machinery-action-edit-text">{{ $t('common.edit') }}</button>
                  <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-text machinery-action-delete-text">{{ $t('common.delete') }}</button>
                </div>
              </div>
            </div>
          </div>

          <div v-if="!loading && invTotalPg > 1" class="inv2-pagination">
            <button type="button" class="inv2-pg-btn" :disabled="invPg === 1" @click="invPg--">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="inv2-pg-info">{{ invPg }} / {{ invTotalPg }}</span>
            <button type="button" class="inv2-pg-btn" :disabled="invPg === invTotalPg" @click="invPg++">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>
      </div>
    </template>

    <!-- All Bookings Table -->
    <div v-if="!isAdminOnly" class="section bookings-section">
      <h2 class="section-title">{{ $t('ui.machineryBookings') }}</h2>

      <div class="tools-card bookings-tools-card">
        <div class="filter-group filter-group-2">
          <select v-model="filters.status" @change="applyFilters" class="toolbar-select">
            <option value="">{{ $t('ui.allStatus') }}</option>
            <option value="Pending">{{ $t('common.pending') }}</option>
            <option value="Approved">{{ $t('common.approved') }}</option>
            <option value="Rejected">{{ $t('common.rejected') }}</option>
            <option value="Completed">{{ $t('common.completed') }}</option>
            <option value="Cancelled">{{ $t('common.cancelled') }}</option>
          </select>
          <select v-model="filters.machinery_type" @change="applyFilters" class="toolbar-select">
            <option value="">{{ $t('ui.allTypes') }}</option>
            <option v-for="type in distinctMachineryTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>
      </div>

      <div class="table-container bookings-table-wrap">
        <table class="bookings-table bookings-desktop-table">
          <colgroup>
            <col class="col-farmer" />
            <col class="col-machinery" />
            <col class="col-date" />
            <col class="col-location" />
            <col class="col-area" />
            <col class="col-total" />
            <col class="col-status" />
            <col class="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>{{ $t('ui.farmer') }}</th>
              <th>{{ $t('ui.machinery') }}</th>
              <th>{{ $t('ui.date') }}</th>
              <th>{{ $t('ui.location') }}</th>
              <th>Area/Qty</th>
              <th>{{ $t('ui.total') }}</th>
              <th>{{ $t('ui.status') }}</th>
              <th>{{ $t('ui.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>{{ $t('ui.loadingBookings') }}</span>
              </td>
            </tr>
            <tr v-else-if="bookings.length === 0">
              <td colspan="8" class="empty-cell">
                {{ $t('ui.noBookings') }}
              </td>
            </tr>
            <tr v-else v-for="booking in bookings" :key="booking.id">
              <td data-label="Farmer">
                <div class="farmer-info">
                  <strong>{{ booking.farmer_name }}</strong>
                  <small>{{ booking.reference_number }}</small>
                </div>
              </td>
              <td data-label="Machinery">
                <div class="machinery-info">
                  <strong>{{ booking.machinery_name }}</strong>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(booking.machinery_type)">
                    {{ booking.machinery_type }}
                  </span>
                </div>
              </td>
              <td data-label="Date">{{ formatDate(booking.booking_date) }}</td>
              <td data-label="Location">{{ booking.service_location }}</td>
              <td data-label="Area/Qty">{{ booking.area_size }} {{ booking.area_unit }}</td>
              <td class="price-cell" data-label="Total">₱{{ formatNumber(booking.total_price) }}</td>
              <td data-label="Status">
                <span class="status-badge" :class="'status-' + getBookingStatusClass(booking.status)">
                  {{ booking.status }}
                </span>
              </td>
              <td class="actions-cell booking-actions-cell">
                <button type="button" @click="viewBooking(booking)" class="btn-icon-small booking-view-btn machinery-action-icon" :title="$t('common.viewDetails')" aria-label="View booking details">
                  <svg class="booking-view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"></path>
                    <circle cx="12" cy="12" r="2.7"></circle>
                  </svg>
                </button>
                <button type="button" @click="viewBooking(booking)" class="machinery-action-text machinery-action-view-text">{{ $t('common.view') }}</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="inv2-mobile-list bookings-mobile-list">
          <div v-if="loading" class="inv2-empty">
            <div class="loading-spinner"></div>
            <div>{{ $t('ui.loadingBookings') }}</div>
          </div>
          <div v-else-if="bookings.length === 0" class="inv2-empty">
            <div>{{ $t('ui.noBookings') }}</div>
          </div>
          <article v-else v-for="booking in bookings" :key="'bml-' + booking.id" class="inv2-mobile-card">
            <div class="inv2-mobile-card-top">
              <h4 class="inv2-mobile-card-name">{{ booking.farmer_name }}</h4>
              <span class="status-badge" :class="'status-' + getBookingStatusClass(booking.status)">{{ booking.status }}</span>
            </div>
            <div class="inv2-mobile-card-meta">
              <div class="inv2-mobile-meta-row">
                <span class="inv2-mobile-label">{{ $t('ui.ref') }}</span>
                <span>{{ booking.reference_number || '—' }}</span>
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
            </div>
            <div class="inv2-mobile-card-actions action-buttons">
              <button type="button" class="machinery-action-text machinery-action-view-text" @click="viewBooking(booking)">{{ $t('common.view') }}</button>
            </div>
          </article>
        </div>
      </div>
    </div>

    <!-- Add/Edit Machinery Modal -->
    <Teleport to="body">
      <div
        v-if="showAddMachineryModal || showEditMachineryModal"
        class="modal-overlay machinery-modal-overlay machinery-ui"
        :class="{ 'light-theme': isLight }"
        @click.self="closeModals"
      >
        <div class="modal-content machinery-edit-modal" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <div class="modal-title-text">
              <h2>{{ showEditMachineryModal ? $t('ui.editMachinery') : $t('common.addNewMachinery') }}</h2>
            </div>
            <button type="button" class="close-btn" :aria-label="$t('common.close')" @click="closeModals">×</button>
          </div>
          <div class="modal-body">
            <form id="machinery-form" @submit.prevent="showEditMachineryModal ? updateMachinery() : addMachinery()">
              <section class="machinery-form-section">
                <h3 class="machinery-form-section-title">{{ $t('ui.barangayAssignment') }}</h3>
                <template v-if="!isPresidentRole">
                  <div class="form-group">
                    <label class="form-label">{{ $t('ui.assignToBarangayReq') }}</label>
                    <div v-if="barangays.length === 0" class="barangay-loading">
                      <div class="spinner-small"></div>
                      {{ $t('ui.loadingBarangays') }}
                    </div>
                    <select
                      v-else
                      v-model="machineryForm.barangay_id"
                      class="form-input"
                      required
                      @change="handleBarangayChange"
                    >
                      <option value="">{{ $t('ui.selectABarangay') }}</option>
                      <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.id">
                        {{ barangay.name }}
                      </option>
                    </select>
                  </div>
                </template>
                <template v-else>
                  <div class="form-group">
                    <label class="form-label">{{ $t('ui.yourBarangay') }}</label>
                    <div class="barangay-read-only">
                      <div class="barangay-info">{{ getBarangayName(userBarangayId) }}</div>
                    </div>
                  </div>
                </template>
              </section>

              <section class="machinery-form-section">
                <h3 class="machinery-form-section-title">{{ $t('ui.machineryDetails') }}</h3>
                <div class="form-group">
                  <label class="form-label">{{ $t('ui.machineryNameReq') }}</label>
                  <input v-model="machineryForm.machinery_name" type="text" class="form-input" required />
                </div>
                <div class="form-group">
                  <label class="form-label">{{ $t('ui.machineryTypeReq') }}</label>
                  <input v-model="machineryForm.machinery_type" type="text" class="form-input" required :placeholder="$t('ui.egMachineryTypes')" />
                </div>
                <div class="form-group">
                  <label class="form-label">{{ $t('ui.description') }}</label>
                  <textarea v-model="machineryForm.description" class="form-input" rows="2" :placeholder="$t('ui.optionalNotes')"></textarea>
                </div>
              </section>

              <section class="machinery-form-section">
                <h3 class="machinery-form-section-title">{{ $t('ui.pricing') }}</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">{{ $t('ui.memberPriceReq') }}</label>
                    <div class="price-input-wrap">
                      <span class="price-input-prefix" aria-hidden="true">₱</span>
                      <input
                        v-model="machineryForm.member_price"
                        type="text"
                        inputmode="decimal"
                        class="form-input price-input"
                        required
                        placeholder="0.00"
                        @blur="normalizePriceField('member_price')"
                      />
                    </div>
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ $t('ui.nonMemberPriceReq') }}</label>
                    <div class="price-input-wrap">
                      <span class="price-input-prefix" aria-hidden="true">₱</span>
                      <input
                        v-model="machineryForm.non_member_price"
                        type="text"
                        inputmode="decimal"
                        class="form-input price-input"
                        required
                        placeholder="0.00"
                        @blur="normalizePriceField('non_member_price')"
                      />
                    </div>
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ $t('ui.unitTypeReq') }}</label>
                  <input v-model="machineryForm.unit_type" type="text" class="form-input" required :placeholder="$t('ui.egPerHectareLoad')" />
                </div>
                <div class="form-group">
                  <label class="form-label">{{ $t('ui.interestRate') }}</label>
                  <input
                    v-model="machineryForm.interest_rate"
                    type="text"
                    inputmode="decimal"
                    class="form-input"
                    :placeholder="$t('ui.interestRatePlaceholder')"
                    @blur="normalizeInterestRateField"
                  />
                  <p class="form-hint">{{ $t('ui.interestRateHint') }}</p>
                </div>
              </section>

              <section class="machinery-form-section">
                <h3 class="machinery-form-section-title">{{ $t('ui.capacityAndStatus') }}</h3>
                <div class="form-row">
                  <div class="form-group">
                    <label class="form-label">{{ $t('ui.maxCapacity') }}</label>
                    <input v-model="machineryForm.max_capacity" type="text" inputmode="decimal" class="form-input" :placeholder="$t('ui.optional')" />
                  </div>
                  <div class="form-group">
                    <label class="form-label">{{ $t('ui.capacityUnit') }}</label>
                    <input v-model="machineryForm.capacity_unit" type="text" class="form-input" :placeholder="$t('ui.egHectaresLoads')" />
                  </div>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ $t('ui.statusReq') }}</label>
                  <select v-model="machineryForm.status" class="form-input" required>
                    <option value="Available">{{ $t('common.available') }}</option>
                    <option value="Unavailable">{{ $t('common.unavailable') }}</option>
                  </select>
                </div>
                <div class="form-group">
                  <label class="form-label">{{ $t('ui.prerequisiteMachine') }}</label>
                  <select v-model="machineryForm.requires_machinery_id" class="form-input">
                    <option value="">{{ $t('ui.prerequisiteNone') }}</option>
                    <option
                      v-for="opt in prerequisiteMachineOptions"
                      :key="'req-' + opt.id"
                      :value="String(opt.id)"
                    >
                      {{ opt.machinery_name }} ({{ opt.machinery_type }})
                    </option>
                  </select>
                  <p class="form-hint">{{ $t('ui.prerequisiteMachineHint') }}</p>
                </div>
              </section>

              <section class="machinery-form-section">
                <h3 class="machinery-form-section-title">{{ $t('ui.machineryPicture') }}</h3>
                <div class="form-group">
                  <div class="picture-upload-section">
                    <div v-if="machineryForm.machinery_picture && machineryForm.machinery_picture.trim() !== ''" class="picture-preview">
                      <img
                        :src="getImageUrl(machineryForm.machinery_picture)"
                        :alt="$t('ui.machineryPreview')"
                        class="preview-image"
                        @error="handleImageError"
                        @load="handleImageLoad"
                      />
                      <button type="button" @click.prevent="removeMachineryPicture()" class="btn-remove-picture">
                        {{ $t('ui.removePicture') }}
                      </button>
                    </div>
                    <div v-else class="picture-placeholder">
                      <p>{{ $t('ui.noImageUploaded') }}</p>
                    </div>
                    <input
                      type="file"
                      ref="machineryPictureInput"
                      @change="handleMachineryPictureChange"
                      accept="image/*"
                      class="file-input-hidden"
                    />
                    <button type="button" @click.prevent="$refs.machineryPictureInput.click()" class="btn-upload-picture">
                      {{ $t('ui.uploadPicture') }}
                    </button>
                  </div>
                </div>
              </section>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn-secondary" @click="closeModals">{{ $t('common.cancel') }}</button>
            <button type="submit" form="machinery-form" class="btn-submit" :disabled="loading">
              {{ loading ? $t('common.saving') : (showEditMachineryModal ? $t('ui.update') : $t('common.add')) }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- View Booking Modal -->
    <Teleport to="body">
    <div v-if="showViewBookingModal && selectedBooking" class="modal-overlay machinery-ui" :class="{ 'light-theme': isLight }" @click.self="closeModals">
      <div class="modal-content modal-large tx-detail-modal">
        <div class="modal-header">
          <h2>Booking Details #{{ selectedBooking.id }}</h2>
          <button type="button" @click="closeModals" class="modal-close" :aria-label="$t('common.close')">×</button>
        </div>
        <div class="modal-body">
          <div class="booking-details tx-detail-sections">
            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">Farmer Information</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.name') }}</label><span>{{ selectedBooking.farmer_name }}</span></div>
                <div class="detail-item tx-detail-item"><label>Reference</label><span>{{ selectedBooking.reference_number }}</span></div>
                <div class="detail-item tx-detail-item" v-if="selectedBooking.farmer_phone"><label>{{ $t('ui.phone') }}</label><span>{{ selectedBooking.farmer_phone }}</span></div>
              </div>
            </div>

            <div class="detail-section tx-detail-section">
              <h3 class="tx-detail-section-title">{{ $t('ui.machineryServiceDetails') }}</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.machinery') }}</label><span>{{ selectedBooking.machinery_name }}</span></div>
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.type') }}</label><span class="badge" :class="'badge-' + getMachineryTypeClass(selectedBooking.machinery_type)">{{ selectedBooking.machinery_type }}</span></div>
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.date') }}</label><span>{{ formatDate(selectedBooking.booking_date) }}</span></div>
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.location') }}</label><span>{{ selectedBooking.service_location }}</span></div>
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.areaQuantity') }}</label><span>{{ selectedBooking.area_size }} {{ selectedBooking.area_unit }}</span></div>
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.totalPrice') }}</label><strong class="price-highlight">₱{{ formatNumber(selectedBooking.total_price) }}</strong></div>
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.status') }}</label><span class="status-badge" :class="'status-' + getBookingStatusClass(selectedBooking.status)">{{ selectedBooking.status }}</span></div>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="selectedBooking.approved_by_name">
              <h3 class="tx-detail-section-title">Approval Information</h3>
              <div class="details-grid tx-details-grid">
                <div class="detail-item tx-detail-item"><label>{{ $t('ui.approvedBy') }}</label><span>{{ selectedBooking.approved_by_name }}</span></div>
                <div class="detail-item tx-detail-item" v-if="selectedBooking.approved_date"><label>{{ $t('ui.date') }}</label><span>{{ formatDateTime(selectedBooking.approved_date) }}</span></div>
              </div>
            </div>

            <div class="detail-section tx-detail-section" v-if="selectedBooking.notes">
              <h3 class="tx-detail-section-title">{{ $t('ui.notes') }}</h3>
              <p class="notes-text">{{ selectedBooking.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Assign Operator Modal -->
    <Teleport to="body">
    <div v-if="showAssignOperatorModal" class="modal-overlay machinery-ui" :class="{ 'light-theme': isLight }" @click.self="closeAssignOperatorModal">
      <div class="modal-content modal-medium" @click.stop>
        <div class="modal-header">
          <h2>Assign Operator</h2>
          <button type="button" @click="closeAssignOperatorModal" class="close-btn">×</button>
        </div>
        <div class="modal-body">
          <p class="modal-subtitle">
            {{ $t('ui.machineryColon') }} <strong>{{ machineryToAssign?.machinery_name }}</strong>
          </p>
          <div class="form-group">
            <label>Operator *</label>
            <select v-model="assignOperatorForm.operator_id" class="form-input" required>
              <option value="">Select operator...</option>
              <option v-for="op in eligibleOperators" :key="op.id" :value="op.id">
                {{ op.full_name }} ({{ op.reference_number }})
              </option>
            </select>
          </div>
          <div class="form-group">
            <label>Assignment Date</label>
            <input v-model="assignOperatorForm.assignment_date" type="date" class="form-input" />
          </div>
          <p v-if="assignOperatorError" class="validation-error">{{ assignOperatorError }}</p>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="closeAssignOperatorModal">{{ $t('common.cancel') }}</button>
          <button type="button" class="btn-primary" @click="saveOperatorAssignment" :disabled="assigningOperator">
            {{ assigningOperator ? 'Saving...' : 'Assign Operator' }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
    <div
      v-if="showDeleteModal"
      class="modal-overlay modal-delete-overlay machinery-ui"
      :class="{ 'light-theme': isLight }"
      @click="closeDeleteModal"
    >
      <div
        class="modal-content modal-delete"
        role="alertdialog"
        aria-labelledby="machinery-delete-title"
        aria-describedby="machinery-delete-desc"
        @click.stop
      >
        <div class="modal-header delete-modal-header">
          <div class="modal-title-row">
            <span class="delete-warning-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </span>
            <div class="modal-title-text">
              <h2 id="machinery-delete-title">{{ $t('ui.deleteMachinery') }}</h2>
              <p id="machinery-delete-desc" class="modal-subtitle delete-confirm-message">
                {{ $t('ui.remove') }} <strong>{{ machineryToDelete?.machinery_name }}</strong> from the inventory?
              </p>
            </div>
          </div>
          <button type="button" @click="closeDeleteModal" class="close-btn" :aria-label="$t('common.close')" :disabled="deleteInProgress">×</button>
        </div>
        <div class="modal-body delete-modal-body">
          <p class="delete-warning-text">This action cannot be undone. All booking records linked to this machinery may be affected.</p>
        </div>
        <div class="modal-footer delete-modal-footer">
          <button type="button" class="btn-secondary" @click="closeDeleteModal" :disabled="deleteInProgress">{{ $t('common.cancel') }}</button>
          <button type="button" class="btn-delete-confirm" @click="deleteMachinery" :disabled="deleteInProgress || loading">
            {{ deleteInProgress || loading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
    </Teleport>

    <!-- Alerts (teleported so they appear above fixed header) -->
    <Teleport to="body">
      <div v-if="validationError || error || successMessage" class="alert-center-stack" :class="{ 'light-theme': isLight }">
        <div v-if="validationError" class="alert alert-warning">
          {{ validationError }}
          <button @click="validationError = ''" class="alert-close">✕</button>
        </div>
        <div v-if="error" class="alert alert-error">
          {{ error }}
          <button @click="clearError" class="alert-close">✕</button>
        </div>
        <div v-if="successMessage" class="alert alert-success">
          {{ successMessage }}
          <button @click="successMessage = ''" class="alert-close">✕</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useMachineryStore } from '../stores/machineryStore'
import { useAuthStore } from '../stores/authStore'
import { useDownPaymentStore } from '../stores/downPaymentStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { machineryStatusLabel } from '../utils/machineryStatus'
import { mediaUrl, apiUrl } from '../utils/apiBase'

export default {
  name: 'MachineryManagementPage',
  setup() {
    const machineryStore = useMachineryStore()
    const authStore = useAuthStore()
    const downPaymentStore = useDownPaymentStore()
    const { t } = useI18n()
    const { isDark } = useBackdropTheme()
    const isLight = computed(() => !isDark.value)

    const showInventoryModal = ref(false)
    const showAddMachineryModal = ref(false)
    const showEditMachineryModal = ref(false)
    const showViewBookingModal = ref(false)
    const showDeleteModal = ref(false)
    const showAssignOperatorModal = ref(false)
    const machineryToAssign = ref(null)
    const eligibleOperators = ref([])
    const assignOperatorError = ref('')
    const assigningOperator = ref(false)
    const assignOperatorForm = ref({
      operator_id: '',
      assignment_date: new Date().toISOString().split('T')[0]
    })
    const machineryToDelete = ref(null)
    const deleteInProgress = ref(false)
    const successMessage = ref('')
    let successToastTimer = null

    const showSuccessToast = (message) => {
      successMessage.value = message
      if (successToastTimer) clearTimeout(successToastTimer)
      successToastTimer = setTimeout(() => {
        successMessage.value = ''
      }, 4000)
    }
    const validationError = ref('')
    const filters = ref({ status: '', machinery_type: '' })

    const machineryForm = ref({
      machinery_name: '', machinery_type: '', description: '',
      member_price: '', non_member_price: '', interest_rate: '', price_per_unit: '', unit_type: '', max_capacity: '',
      capacity_unit: '', status: 'Available', created_by: null, barangay_id: '', machinery_picture: '',
      requires_machinery_id: ''
    })

    const prerequisiteMachineOptions = computed(() => {
      const barangayId = machineryForm.value.barangay_id
        ? parseInt(machineryForm.value.barangay_id, 10)
        : null
      const selfId = machineryForm.value.id != null ? Number(machineryForm.value.id) : null
      return (inventory.value || []).filter((m) => {
        if (selfId != null && Number(m.id) === selfId) return false
        if (barangayId && Number(m.barangay_id) !== barangayId) return false
        return true
      })
    })
    
    const currentPictureFile = ref(null)
    const machineryPictureInput = ref(null)

    // Helper function to construct correct image URL
    const getImageUrl = (imagePath) => mediaUrl(imagePath)

    const invQ = ref('')
    const invTypeF = ref('')
    const invStatusF = ref('')
    const invBarangayF = ref('')
    const invView = ref('table')
    const invPg = ref(1)
    const invPerPg = 10

    const isAdminRole = computed(() => {
      const role = authStore.currentUser?.role
      return role === 'admin' || role === 'president'
    })
    const isAdminOnly = computed(() => authStore.currentUser?.role === 'admin')
    const isPresidentRole = computed(() => authStore.currentUser?.role === 'president')
    const userBarangayId = computed(() => authStore.currentUser?.barangay_id)
    const dpEnabled = computed(() => downPaymentStore.enabled)
    const dpPercentInput = ref('')
    const dpSaving = ref(false)
    const dpMessage = ref('')
    const dpMessageType = ref('success')
    const dpPercentDirty = computed(() => {
      const typed = parseFloat(String(dpPercentInput.value).trim())
      const stored = Number(downPaymentStore.percent)
      if (!Number.isFinite(typed)) return String(dpPercentInput.value).trim() !== ''
      return typed !== stored
    })

    const parsePercentInput = () => {
      const cleaned = String(dpPercentInput.value).replace(/,/g, '').replace(/[^\d.-]/g, '').trim()
      if (!cleaned || cleaned === '-' || cleaned === '.') return null
      const n = Number(cleaned)
      if (!Number.isFinite(n) || n <= 0 || n > 100) return null
      return Math.round(n * 100) / 100
    }

    const normalizeDownPaymentPercentField = () => {
      const parsed = parsePercentInput()
      if (parsed == null) return
      dpPercentInput.value = Number.isInteger(parsed) ? String(parsed) : String(parsed)
    }

    const syncPercentInput = () => {
      dpPercentInput.value = downPaymentStore.percent != null ? String(downPaymentStore.percent) : ''
    }

    const toggleDownPayment = async () => {
      const next = !dpEnabled.value
      const percent = parsePercentInput()
      if (next && percent == null) {
        dpMessage.value = t('ui.machineryDownPaymentPercentRequired')
        dpMessageType.value = 'error'
        return
      }
      const confirmMsg = next ? t('ui.machineryDownPaymentConfirmOn') : t('ui.machineryDownPaymentConfirmOff')
      if (!window.confirm(confirmMsg)) return

      dpSaving.value = true
      dpMessage.value = ''
      try {
        await downPaymentStore.saveSettings(next ? { enabled: next, percent } : { enabled: next })
        syncPercentInput()
        dpMessage.value = next ? t('ui.machineryDownPaymentActivated') : t('ui.machineryDownPaymentOnHold')
        dpMessageType.value = 'success'
      } catch (err) {
        dpMessage.value = err.message || t('ui.machineryDownPaymentUpdateFailed')
        dpMessageType.value = 'error'
      } finally {
        dpSaving.value = false
      }
    }

    const saveDownPaymentPercent = async () => {
      const percent = parsePercentInput()
      if (percent == null) {
        dpMessage.value = t('ui.machineryDownPaymentPercentRequired')
        dpMessageType.value = 'error'
        return
      }
      dpSaving.value = true
      dpMessage.value = ''
      try {
        await downPaymentStore.saveSettings({
          enabled: dpEnabled.value,
          percent
        })
        syncPercentInput()
        dpMessage.value = t('ui.machineryDownPaymentPercentSaved')
        dpMessageType.value = 'success'
      } catch (err) {
        dpMessage.value = err.message || t('ui.machineryDownPaymentUpdateFailed')
        dpMessageType.value = 'error'
      } finally {
        dpSaving.value = false
      }
    }

    const inventory = computed(() => {
      const list = machineryStore.inventory || []
      // President management: only machinery assigned to their barangay
      if (isPresidentRole.value && userBarangayId.value != null && userBarangayId.value !== '') {
        return list.filter((m) => String(m.barangay_id) === String(userBarangayId.value))
      }
      return list
    })
    const bookings = computed(() => machineryStore.bookings)
    const loading = computed(() => machineryStore.loading)
    const error = computed(() => machineryStore.error)
    const selectedBooking = computed(() => machineryStore.selectedBooking)
    const distinctMachineryTypes = computed(() => machineryStore.distinctMachineryTypes)
    const barangays = computed(() => machineryStore.barangays)

    const adminFilters = ref({ status: '', machinery_type: '', barangay_id: '' })

    const filteredInventory = computed(() => {
      if (!inventory.value) return []
      return inventory.value.filter(machine => {
        const statusMatch = !adminFilters.value.status || machineryStatusLabel(machine) === adminFilters.value.status
        const typeMatch = !adminFilters.value.machinery_type || machine.machinery_type === adminFilters.value.machinery_type
        const barangayMatch = !adminFilters.value.barangay_id || machine.barangay_id === parseInt(adminFilters.value.barangay_id)
        return statusMatch && typeMatch && barangayMatch
      })
    })

    const invUniqueTypes = computed(() => {
      const s = new Set((inventory.value || []).map((m) => m.machinery_type).filter(Boolean))
      return [...s].sort()
    })
    const invFiltered = computed(() => {
      const q = invQ.value.trim().toLowerCase()
      return (inventory.value || []).filter((m) => {
        const qMatch =
          !q ||
          (m.machinery_name || '').toLowerCase().includes(q) ||
          (m.machinery_type || '').toLowerCase().includes(q)
        const tMatch = !invTypeF.value || m.machinery_type === invTypeF.value
        const sMatch = !invStatusF.value || machineryStatusLabel(m) === invStatusF.value
        const bMatch =
          !invBarangayF.value ||
          String(m.barangay_id) === String(invBarangayF.value)
        return qMatch && tMatch && sMatch && bMatch
      })
    })
    const invTotalPg = computed(() => Math.max(1, Math.ceil(invFiltered.value.length / invPerPg)))
    const invPaged = computed(() => {
      const s = (invPg.value - 1) * invPerPg
      return invFiltered.value.slice(s, s + invPerPg)
    })

    const clearInvFilters = () => {
      invQ.value = ''
      invTypeF.value = ''
      invStatusF.value = ''
      invBarangayF.value = ''
      invPg.value = 1
    }

    watch([invQ, invTypeF, invStatusF, invBarangayF], () => {
      invPg.value = 1
    })

    const applyAdminFilters = () => {
      // Filters are applied reactively through computed property
    }

    const handleBarangayChange = (event) => {
      // Ensure barangay_id is stored as a number, not a string
      const value = event.target.value
      machineryForm.value.barangay_id = value ? parseInt(value) : ''
      console.log('Barangay selected and converted:', machineryForm.value.barangay_id)
    }

    const totalMachinery = computed(() => {
      if (!inventory.value) return 0
      return inventory.value.length
    })

    const availableMachinery = computed(() => {
      if (!inventory.value) return 0
      return inventory.value.filter(m => machineryStatusLabel(m) === 'Available').length
    })

    const pendingBookingsCount = computed(() => {
      return bookings.value.filter(b => b.status === 'Pending').length
    })

    const totalRevenue = computed(() => {
      if (!bookings.value || bookings.value.length === 0) return 0
      // Sum revenue from completed bookings only
      return bookings.value
        .filter(b => b.status === 'Completed')
        .reduce((sum, b) => sum + (parseFloat(b.total_price) || 0), 0)
    })

    const loadData = async () => {
      try {
        const inventoryFilters =
          isPresidentRole.value && userBarangayId.value != null && userBarangayId.value !== ''
            ? { barangay_id: String(userBarangayId.value) }
            : {}
        await Promise.all([
          machineryStore.fetchInventory(inventoryFilters),
          machineryStore.fetchBookings(filters.value),
          machineryStore.fetchBarangays()
        ])
      } catch (error) {
        console.error('Error loading data:', error)
      }
    }

    const applyFilters = () => {
      machineryStore.fetchBookings(filters.value)
    }

    const addMachinery = async () => {
      try {
        // For presidents, automatically use their barangay
        let barangayId = machineryForm.value.barangay_id
        if (isPresidentRole.value) {
          barangayId = userBarangayId.value
        } else {
          // For admins, validate barangay is selected
          if (!machineryForm.value.barangay_id || machineryForm.value.barangay_id === '') {
            validationError.value = 'Please select a barangay for this machinery'
            setTimeout(() => validationError.value = '', 5000)
            return
          }
          barangayId = typeof machineryForm.value.barangay_id === 'string' 
            ? parseInt(machineryForm.value.barangay_id) 
            : machineryForm.value.barangay_id
        }
        
        const memberPrice = parsePriceValue(machineryForm.value.member_price)
        const nonMemberPrice = parsePriceValue(machineryForm.value.non_member_price)
        if (memberPrice === null || memberPrice <= 0 || nonMemberPrice === null || nonMemberPrice <= 0) {
          validationError.value = 'Enter valid member and non-member prices (numbers greater than 0).'
          setTimeout(() => { validationError.value = '' }, 5000)
          return
        }
        
        const data = {
          machinery_name: machineryForm.value.machinery_name.trim(),
          machinery_type: machineryForm.value.machinery_type.trim(),
          description: machineryForm.value.description ? machineryForm.value.description.trim() : null,
          price_per_unit: memberPrice,  // For backward compatibility
          member_price: memberPrice,
          non_member_price: nonMemberPrice,
          unit_type: machineryForm.value.unit_type.trim(),
          max_capacity: machineryForm.value.max_capacity && machineryForm.value.max_capacity !== '' 
            ? parseFloat(machineryForm.value.max_capacity) 
            : null,
          capacity_unit: machineryForm.value.capacity_unit && machineryForm.value.capacity_unit.trim() !== '' 
            ? machineryForm.value.capacity_unit.trim() 
            : null,
          status: machineryForm.value.status,
          created_by: authStore.currentUser?.id || null,
          barangay_id: barangayId,  // Auto-set for president, admin-selected for admin
          requires_machinery_id: machineryForm.value.requires_machinery_id
            ? parseInt(machineryForm.value.requires_machinery_id, 10)
            : null,
          interest_rate: parseInterestRateValue(machineryForm.value.interest_rate)
        }
        
        console.log('Submitting machinery data:', data)
        const result = await machineryStore.addMachinery(data)
        
        // Upload picture if one was selected
        if (result && (result.id || result.machinery_id) && currentPictureFile.value) {
          const machineId = result.id || result.machinery_id
          await uploadMachineryPicture(machineId)
        }
        
        machineryStore.clearError()
        showSuccessToast('Machinery added successfully!')
        closeModals()
        resetForm()
        await loadData()
      } catch (error) {
        console.error('Error adding machinery:', error)
        // Error is already set in store, no need to catch it here
      }
    }

    const editMachinery = (machine) => {
      machineryForm.value = { ...machine }
      machineryForm.value.status = machine.stored_status === 'Available' || machine.status === 'Available'
        ? 'Available'
        : 'Unavailable'
      // Ensure barangay_id is properly initialized for the form
      if (!machineryForm.value.barangay_id) {
        machineryForm.value.barangay_id = ''
      }
      machineryForm.value.requires_machinery_id = machine.requires_machinery_id
        ? String(machine.requires_machinery_id)
        : ''
      // Keep prices as plain numeric strings for the text inputs
      if (machineryForm.value.member_price != null && machineryForm.value.member_price !== '') {
        machineryForm.value.member_price = String(machineryForm.value.member_price)
      }
      if (machineryForm.value.non_member_price != null && machineryForm.value.non_member_price !== '') {
        machineryForm.value.non_member_price = String(machineryForm.value.non_member_price)
      }
      const rate = parseFloat(machine.interest_rate)
      machineryForm.value.interest_rate = Number.isFinite(rate) && rate > 0 ? String(rate) : ''
      showEditMachineryModal.value = true
      showInventoryModal.value = false
    }

    const parsePriceValue = (raw) => {
      if (raw === null || raw === undefined || raw === '') return null
      const cleaned = String(raw).replace(/,/g, '').replace(/[^\d.-]/g, '').trim()
      if (!cleaned || cleaned === '-' || cleaned === '.') return null
      const n = Number(cleaned)
      return Number.isFinite(n) ? n : null
    }

    const normalizePriceField = (field) => {
      const parsed = parsePriceValue(machineryForm.value[field])
      if (parsed === null) {
        machineryForm.value[field] = ''
        return
      }
      machineryForm.value[field] = Number.isInteger(parsed)
        ? String(parsed)
        : parsed.toFixed(2)
    }

    const parseInterestRateValue = (raw) => {
      if (raw === null || raw === undefined || String(raw).trim() === '') return 0
      const cleaned = String(raw).replace(/,/g, '').replace(/[^\d.-]/g, '').trim()
      if (!cleaned || cleaned === '-' || cleaned === '.') return 0
      const n = Number(cleaned)
      if (!Number.isFinite(n) || n < 0) return 0
      return Math.min(n, 100)
    }

    const normalizeInterestRateField = () => {
      const parsed = parseInterestRateValue(machineryForm.value.interest_rate)
      machineryForm.value.interest_rate = parsed > 0
        ? (Number.isInteger(parsed) ? String(parsed) : String(parsed))
        : ''
    }

    const updateMachinery = async () => {
      try {
        // For presidents, automatically use their barangay
        let barangayId = machineryForm.value.barangay_id
        if (isPresidentRole.value) {
          barangayId = userBarangayId.value
        } else {
          // For admins, validate barangay is selected
          if (!machineryForm.value.barangay_id || machineryForm.value.barangay_id === '') {
            validationError.value = 'Please select a barangay for this machinery'
            setTimeout(() => validationError.value = '', 5000)
            return
          }
          barangayId = typeof machineryForm.value.barangay_id === 'string' 
            ? parseInt(machineryForm.value.barangay_id) 
            : machineryForm.value.barangay_id
        }

        validationError.value = ''
        
        const memberPrice = parsePriceValue(machineryForm.value.member_price)
        const nonMemberPrice = parsePriceValue(machineryForm.value.non_member_price)
        if (memberPrice === null || memberPrice <= 0 || nonMemberPrice === null || nonMemberPrice <= 0) {
          validationError.value = 'Enter valid member and non-member prices (numbers greater than 0).'
          setTimeout(() => { validationError.value = '' }, 5000)
          return
        }
        
        const data = {
          machinery_name: machineryForm.value.machinery_name.trim(),
          machinery_type: machineryForm.value.machinery_type.trim(),
          description: machineryForm.value.description ? machineryForm.value.description.trim() : null,
          price_per_unit: memberPrice,  // For backward compatibility
          member_price: memberPrice,
          non_member_price: nonMemberPrice,
          unit_type: machineryForm.value.unit_type.trim(),
          max_capacity: machineryForm.value.max_capacity && machineryForm.value.max_capacity !== '' 
            ? parseFloat(machineryForm.value.max_capacity) 
            : null,
          capacity_unit: machineryForm.value.capacity_unit && machineryForm.value.capacity_unit.trim() !== '' 
            ? machineryForm.value.capacity_unit.trim() 
            : null,
          status: machineryForm.value.status,
          barangay_id: barangayId,  // Auto-set for president, admin-selected for admin
          requires_machinery_id: machineryForm.value.requires_machinery_id
            ? parseInt(machineryForm.value.requires_machinery_id, 10)
            : null,
          interest_rate: parseInterestRateValue(machineryForm.value.interest_rate)
        }
        
        console.log('Updating machinery data:', data)
        await machineryStore.updateMachinery(machineryForm.value.id, data)
        
        // Upload picture if one was selected
        if (currentPictureFile.value && machineryForm.value.id) {
          await uploadMachineryPicture(machineryForm.value.id)
        }
        
        machineryStore.clearError()
        showSuccessToast('Machinery updated successfully!')
        closeModals()
        resetForm()
        await loadData()
      } catch (error) {
        console.error('Error updating machinery:', error)
        // Error is already set in store
      }
    }

    const deleteMachineryConfirm = (machine) => {
      machineryToDelete.value = machine
      showDeleteModal.value = true
      showInventoryModal.value = false
    }

    const openAssignOperatorModal = async (machine) => {
      machineryToAssign.value = machine
      assignOperatorError.value = ''
      assignOperatorForm.value = {
        operator_id: machine.assigned_operator_id || '',
        assignment_date: machine.assignment_date || new Date().toISOString().split('T')[0]
      }
      try {
        // President always loads operators from their own barangay
        const barangayId = isPresidentRole.value
          ? (userBarangayId.value || machine.barangay_id)
          : (machine.barangay_id || userBarangayId.value)
        eligibleOperators.value = await machineryStore.fetchEligibleOperators(barangayId)
        if (!eligibleOperators.value.length) {
          assignOperatorError.value = 'No approved operators found in this barangay.'
        }
        showAssignOperatorModal.value = true
      } catch (err) {
        eligibleOperators.value = []
        assignOperatorError.value = err.message || 'Failed to load operators'
        showAssignOperatorModal.value = true
      }
    }

    const closeAssignOperatorModal = () => {
      showAssignOperatorModal.value = false
      machineryToAssign.value = null
      assignOperatorError.value = ''
    }

    const saveOperatorAssignment = async () => {
      if (!assignOperatorForm.value.operator_id) {
        assignOperatorError.value = 'Please select an operator'
        return
      }
      assigningOperator.value = true
      assignOperatorError.value = ''
      try {
        await machineryStore.assignOperatorToMachinery(machineryToAssign.value.id, {
          operator_id: parseInt(assignOperatorForm.value.operator_id, 10),
          assigned_by: authStore.currentUser.id,
          assignment_date: assignOperatorForm.value.assignment_date
        })
        successMessage.value = `Operator assigned to ${machineryToAssign.value.machinery_name}`
        closeAssignOperatorModal()
      } catch (err) {
        assignOperatorError.value = err.message || 'Failed to assign operator'
      } finally {
        assigningOperator.value = false
      }
    }

    const closeDeleteModal = () => {
      if (deleteInProgress.value) return
      showDeleteModal.value = false
      machineryToDelete.value = null
    }

    const deleteMachinery = async () => {
      if (!machineryToDelete.value || deleteInProgress.value) return
      deleteInProgress.value = true
      try {
        await machineryStore.deleteMachinery(machineryToDelete.value.id)
        machineryStore.clearError()
        showSuccessToast('Machinery deleted successfully!')
        closeDeleteModal()
        closeModals()
        await loadData()
      } catch (error) {
        console.error('Error deleting machinery:', error)
      } finally {
        deleteInProgress.value = false
      }
    }

    const viewBooking = async (booking) => {
      try {
        await machineryStore.getBookingDetails(booking.id)
        showViewBookingModal.value = true
      } catch (error) {
        console.error('Error viewing booking:', error)
      }
    }

    const closeModals = () => {
      showInventoryModal.value = false
      showAddMachineryModal.value = false
      showEditMachineryModal.value = false
      showViewBookingModal.value = false
      showDeleteModal.value = false
      machineryToDelete.value = null
      validationError.value = ''
      machineryStore.clearSelection()
    }

    const resetForm = () => {
      machineryForm.value = {
        machinery_name: '', machinery_type: '', description: '',
        member_price: '', non_member_price: '', interest_rate: '', price_per_unit: '', unit_type: '', max_capacity: '',
        capacity_unit: '', status: 'Available', created_by: null, barangay_id: '', machinery_picture: '',
        requires_machinery_id: ''
      }
      currentPictureFile.value = null
      if (machineryPictureInput.value) {
        machineryPictureInput.value.value = ''
      }
    }

    const handleMachineryPictureChange = async (event) => {
      try {
        const file = event.target.files[0]
        if (!file) return
        
        console.log('📸 Picture selected:', file.name, file.type, file.size, 'bytes');
        
        // Validate file size (10MB max)
        if (file.size > 10 * 1024 * 1024) {
          validationError.value = 'File size must be less than 10MB'
          setTimeout(() => validationError.value = '', 5000)
          return
        }

        // Validate file type
        const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
        if (!allowedTypes.includes(file.type)) {
          validationError.value = 'Only JPEG, PNG, GIF, or WebP images are allowed'
          setTimeout(() => validationError.value = '', 5000)
          return
        }

        // Create preview
        const reader = new FileReader()
        reader.onload = (e) => {
          console.log('🖼️ Preview created, size:', e.target.result.length, 'bytes');
          machineryForm.value.machinery_picture = e.target.result
        }
        reader.onerror = (e) => {
          console.error('❌ Error reading file:', e);
          validationError.value = 'Error reading image file'
          setTimeout(() => validationError.value = '', 5000)
        }
        reader.readAsDataURL(file)
        
        // Store file for later upload
        currentPictureFile.value = file
        console.log('✓ File ready for upload');
      } catch (error) {
        console.error('Error handling picture change:', error)
        validationError.value = '⚠️ Error reading image file'
        setTimeout(() => validationError.value = '', 5000)
      }
    }

    const removeMachineryPicture = () => {
      console.log('🗑️ Removing machinery picture...');
      machineryForm.value.machinery_picture = '';
      currentPictureFile.value = null;
      if (machineryPictureInput.value) {
        machineryPictureInput.value.value = '';
      }
      console.log('✓ Picture removed from form');
    }

    const handleImageError = (event) => {
      console.warn('⚠️ Failed to load image:', event.target.src);
      console.warn('This may be a CORS or file path issue');
    }

    const handleImageLoad = (event) => {
      console.log('✅ Image loaded successfully:', event.target.src);
    }

    const uploadMachineryPicture = async (machineryId) => {
      if (!currentPictureFile.value) {
        console.log('No picture file to upload');
        return true;
      }
      
      try {
        console.log('🖼️ Starting picture upload for machinery:', machineryId);
        console.log('File:', currentPictureFile.value.name, currentPictureFile.value.size, 'bytes');
        
        const formData = new FormData();
        formData.append('machinery_picture', currentPictureFile.value);
        
        const token = authStore.token;
        if (!token) {
          throw new Error('No authentication token found');
        }
        
        const uploadUrl = apiUrl(`/api/machinery/inventory/${machineryId}/picture`);
        console.log('📤 Uploading to:', uploadUrl);
        const response = await fetch(uploadUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`
          },
          body: formData
        });
        
        console.log('📥 Upload response status:', response.status);
        
        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || `Picture upload failed with status ${response.status}`);
        }
        
        const uploadResult = await response.json();
        console.log('✅ Upload successful:', uploadResult);
        
        currentPictureFile.value = null;
        showSuccessToast('Picture uploaded successfully!')
        return true;
      } catch (error) {
        console.error('❌ Error uploading picture:', error);
        validationError.value = `Picture upload failed: ${error.message}`
        setTimeout(() => validationError.value = '', 5000);
        return false;
      }
    }

    const clearError = () => machineryStore.clearError()

    const getMachineryTypeClass = (type) => ({
      'Harvester': 'primary', 'Dryer': 'warning',
      'Hauling Track': 'info', 'Tractor': 'success'
    }[type] || 'default')

    const getStatusClass = (status) => ({
      'Available': 'success',
      'Unavailable': 'danger',
      'In Use': 'danger',
      'Under Maintenance': 'danger'
    }[status] || 'default')

    const getBookingStatusClass = (status) => ({
      'Pending': 'warning', 'Approved': 'success',
      'Completed': 'success', 'Rejected': 'danger', 'Cancelled': 'default'
    }[status] || 'default')

    const formatNumber = (num) => new Intl.NumberFormat('en-PH').format(num)

    const formatInterestRateDisplay = (rate) => {
      const n = parseFloat(rate)
      if (!Number.isFinite(n) || n <= 0) return '0%'
      return Number.isInteger(n) ? `${n}%` : `${n}%`
    }
    const formatUnitLabel = (unit) => {
      if (!unit) return ''
      const trimmed = String(unit).trim()
      if (!trimmed) return ''
      return /^per\s/i.test(trimmed) ? trimmed : `per ${trimmed}`
    }
    const formatCapacity = (machine) => {
      const cap = machine?.max_capacity
      const unit = String(machine?.capacity_unit || '').trim()
      if (cap == null || cap === '') return '-'
      return unit ? `${cap} ${unit}` : String(cap)
    }
    const formatDate = (date) => new Date(date).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    const formatDateTime = (dt) => new Date(dt).toLocaleString('en-US', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
    
    const getBarangayName = (barangayId) => {
      if (!barangayId) return ''
      const barangay = barangays.value.find(b => b.id === parseInt(barangayId))
      return barangay ? barangay.name : ''
    }

    onMounted(async () => {
      machineryStore.clearError()
      loadData()
      if (isPresidentRole.value) {
        await downPaymentStore.fetchStatus()
        syncPercentInput()
      }
    })

    const isAnyModalOpen = computed(
      () =>
        showAddMachineryModal.value ||
        showEditMachineryModal.value ||
        showViewBookingModal.value ||
        showAssignOperatorModal.value ||
        showDeleteModal.value
    )

    watch(
      isAnyModalOpen,
      (open) => {
        document.body.style.overflow = open ? 'hidden' : ''
      },
      { immediate: true }
    )

    onUnmounted(() => {
      document.body.style.overflow = ''
    })

    // Auto-set barangay for president when opening add modal
    watch(showAddMachineryModal, (isOpen) => {
      if (isOpen && isPresidentRole.value) {
        machineryForm.value.barangay_id = userBarangayId.value
      }
    })

    return {
      isLight,
      showInventoryModal, showAddMachineryModal, showEditMachineryModal,
      showViewBookingModal, showDeleteModal, showAssignOperatorModal, machineryToDelete, machineryToAssign,
      eligibleOperators, assignOperatorForm, assignOperatorError, assigningOperator,
      openAssignOperatorModal, closeAssignOperatorModal, saveOperatorAssignment,
      successMessage, validationError, filters, adminFilters, machineryForm, inventory, bookings,
      prerequisiteMachineOptions,
      loading, error, selectedBooking, distinctMachineryTypes,
      totalMachinery, availableMachinery, barangays, isAdminRole, isAdminOnly,
      pendingBookingsCount, totalRevenue, applyFilters, applyAdminFilters,
      filteredInventory, handleBarangayChange, isPresidentRole, userBarangayId,
      dpEnabled, dpPercentInput, dpSaving, dpMessage, dpMessageType, dpPercentDirty,
      toggleDownPayment, saveDownPaymentPercent, normalizeDownPaymentPercentField,
      addMachinery, editMachinery, updateMachinery, deleteMachineryConfirm,
      deleteMachinery, viewBooking, closeModals, closeDeleteModal, deleteInProgress, clearError, loadData,
      getMachineryTypeClass, getStatusClass, getBookingStatusClass, machineryStatusLabel,
      getBarangayName, formatNumber, formatInterestRateDisplay, formatUnitLabel, formatCapacity, formatDate, formatDateTime,
      handleMachineryPictureChange, removeMachineryPicture, uploadMachineryPicture,
      handleImageError, handleImageLoad, machineryPictureInput, currentPictureFile, resetForm,
      getImageUrl,
      invQ,
      invTypeF,
      invStatusF,
      invBarangayF,
      invView,
      invPg,
      invTotalPg,
      invPaged,
      invUniqueTypes,
      invFiltered,
      clearInvFilters,
      normalizePriceField,
      normalizeInterestRateField
    }
  }
}
</script>

<style scoped>
.page-container.machinery-management-page {
  --surface-1: rgba(28, 42, 33, 0.92);
  --surface-2: rgba(24, 39, 30, 0.92);
  --surface-3: #2d5c4a;
  --line-soft: rgba(190, 235, 203, 0.14);
  --line-strong: rgba(187, 227, 196, 0.35);
  --text-main: #eefde6;
  --text-muted: rgba(229, 235, 231, 0.82);
  --text-soft: rgba(229, 235, 231, 0.65);
  --success: #6ee7a8;
  --warning: #e8c468;
  --danger: #f87171;
  --info: #7dd3fc;
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
  font-family: 'Segoe UI', system-ui, sans-serif;
  position: relative;
  overflow-x: hidden;
}

.dp-module-panel {
  display: flex;
  flex-wrap: wrap;
  align-items: flex-start;
  gap: 1rem;
  margin: 0 0 1.25rem;
  padding: 1rem 1.15rem;
  border-radius: 14px;
  border: 1px solid rgba(190, 235, 203, 0.18);
  background: rgba(28, 42, 33, 0.92);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
}
.dp-module-panel--off {
  border-color: rgba(252, 211, 77, 0.45);
}
.dp-module-panel__text {
  flex: 1 1 18rem;
  min-width: 0;
}
.dp-module-panel__title {
  margin: 0 0 4px;
  font-size: 0.92rem;
  font-weight: 700;
  color: #eefde6;
}
.dp-module-panel--off .dp-module-panel__title {
  color: #fde68a;
}
.dp-module-panel__desc {
  margin: 0 0 0.7rem;
  font-size: 0.75rem;
  line-height: 1.4;
  color: rgba(229, 235, 231, 0.82);
}
.dp-percent-label {
  display: block;
  font-size: 0.72rem;
  font-weight: 600;
  margin-bottom: 0.28rem;
}
.dp-percent-row {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}
.dp-percent-input {
  width: 5.5rem;
  padding: 0.38rem 0.5rem;
  border-radius: 8px;
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: rgba(0, 0, 0, 0.22);
  color: #eefde6;
  font-size: 0.9rem;
}
.dp-percent-suffix {
  font-weight: 700;
}
.dp-percent-hint {
  margin: 0.35rem 0 0;
  font-size: 0.68rem;
  color: rgba(229, 235, 231, 0.65);
}
.dp-module-panel__msg {
  flex: 1 1 100%;
  margin: 0;
  font-size: 0.72rem;
}
.dp-module-panel__msg.success { color: #86efac; }
.dp-module-panel__msg.error { color: #fca5a5; }
.dp-module-toggle {
  display: inline-flex;
  align-items: center;
  gap: 0.55rem;
  border: 1px solid rgba(74, 222, 128, 0.45);
  background: rgba(0, 0, 0, 0.18);
  color: #bbf7d0;
  border-radius: 999px;
  padding: 0.35rem 0.7rem 0.35rem 0.4rem;
  cursor: pointer;
}
.dp-module-toggle--off {
  border-color: #f59e0b;
  color: #fde68a;
}
.dp-module-toggle__track {
  width: 2.1rem;
  height: 1.15rem;
  border-radius: 999px;
  background: rgba(74, 222, 128, 0.35);
  position: relative;
  display: inline-block;
}
.dp-module-toggle--off .dp-module-toggle__track {
  background: rgba(245, 158, 11, 0.35);
}
.dp-module-toggle__thumb {
  position: absolute;
  top: 2px;
  left: 18px;
  width: 0.85rem;
  height: 0.85rem;
  border-radius: 50%;
  background: #fff;
}
.dp-module-toggle--off .dp-module-toggle__thumb {
  left: 3px;
}
.dp-module-toggle__label {
  font-size: 0.75rem;
  font-weight: 700;
}
.page-container.machinery-management-page.light-theme .dp-module-panel {
  background: linear-gradient(135deg, rgba(220, 252, 231, 0.95) 0%, rgba(187, 247, 208, 0.75) 100%);
  border-color: #86efac;
}
.page-container.machinery-management-page.light-theme .dp-module-panel--off {
  background: linear-gradient(135deg, rgba(254, 243, 199, 0.95) 0%, rgba(253, 230, 138, 0.65) 100%);
  border-color: #fcd34d;
}
.page-container.machinery-management-page.light-theme .dp-module-panel__title,
.page-container.machinery-management-page.light-theme .dp-module-panel__desc,
.page-container.machinery-management-page.light-theme .dp-percent-label,
.page-container.machinery-management-page.light-theme .dp-percent-hint,
.page-container.machinery-management-page.light-theme .dp-percent-suffix {
  color: #14532d;
}
.page-container.machinery-management-page.light-theme .dp-module-panel--off .dp-module-panel__title,
.page-container.machinery-management-page.light-theme .dp-module-panel--off .dp-module-panel__desc {
  color: #92400e;
}
.page-container.machinery-management-page.light-theme .dp-percent-input {
  background: #fff;
  color: #14532d;
  border-color: #86efac;
}
.page-container.machinery-management-page.light-theme .dp-module-panel__msg.success { color: #15803d; }
.page-container.machinery-management-page.light-theme .dp-module-panel__msg.error { color: #b91c1c; }

.machinery-management-page::before,
.machinery-management-page::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: 0;
  border-radius: inherit;
}

.machinery-management-page::before {
  background:
    radial-gradient(ellipse 80% 50% at 12% 88%, rgba(110, 231, 168, 0.06) 0%, transparent 58%),
    radial-gradient(ellipse 70% 50% at 88% 12%, rgba(232, 196, 104, 0.05) 0%, transparent 55%);
}

.machinery-management-page::after {
  background:
    radial-gradient(circle at 90% 8%, rgba(232, 196, 104, 0.05) 0%, transparent 24%),
    radial-gradient(circle at 10% 90%, rgba(61, 122, 92, 0.08) 0%, transparent 22%);
}

.machinery-management-page > *:not(.modal-overlay):not(.alert) {
  position: relative;
  z-index: 1;
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

.btn-header-add {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  min-height: 40px !important;
  padding: 0.45rem 0.95rem !important;
  border: 1.5px solid #15803d !important;
  border-radius: 10px !important;
  font-weight: 700;
  font-size: 0.9rem !important;
  line-height: 1.2;
  cursor: pointer;
  color: #000000;
  background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.22);
  transition: transform 0.15s ease, filter 0.15s ease;
}

.btn-header-add:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.btn-header-icon {
  width: 1.05rem;
  height: 1.05rem;
  flex-shrink: 0;
}

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

.filter-group-2 {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.bookings-tools-card {
  margin-bottom: 0.85rem;
}

.bookings-mobile-list {
  display: none;
}

.inv2-barangay-hint {
  font-weight: 500;
  opacity: 0.72;
}

.inv2-col-operator {
  width: 11%;
}

.inv2-th-operator {
  font-size: 0.68rem !important;
  letter-spacing: 0.02em;
}

.inv2-td-operator {
  max-width: 0;
  overflow: hidden;
  text-align: left !important;
  padding-left: 6px !important;
  padding-right: 4px !important;
}

.inv2-td-operator .operator-assigned {
  display: block;
  line-height: 1.15;
  min-width: 0;
}

.inv2-td-operator .operator-assigned__name {
  display: block;
  font-size: 10px;
  font-weight: 600;
  color: #ecfdf5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv2-td-operator .operator-assigned__date {
  display: block;
  margin-top: 1px;
  font-size: 9px;
  color: rgba(200, 235, 210, 0.55);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.inv2-td-operator .operator-missing {
  font-size: 10px;
  font-style: italic;
  opacity: 0.65;
  white-space: nowrap;
}

.tools-chips {
  display: flex;
  align-items: flex-start;
  gap: 0.35rem;
  margin: 0;
  padding: 0.35rem 0 0;
  border-radius: 0;
  background: transparent !important;
  border: none !important;
  border-top: 1px solid rgba(190, 235, 203, 0.14) !important;
  box-shadow: none !important;
}

.tools-chips-list {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.25rem;
  flex: 1;
  min-width: 0;
}

.tools-chips .inv2-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  max-width: 100%;
  min-height: 0;
  height: 1.55rem;
  padding: 0 0.18rem 0 0.42rem;
  border-radius: 5px;
  font-size: 0.68rem;
  font-weight: 500;
  line-height: 1;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(167, 211, 178, 0.25);
  color: rgba(220, 252, 231, 0.9);
}

.tools-chips .inv2-chip-x {
  width: 1rem;
  height: 1rem;
  display: inline-flex !important;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 3px;
  padding: 0;
  margin: 0;
  line-height: 0;
  opacity: 0.75;
  color: rgba(220, 252, 231, 0.9);
  flex-shrink: 0;
}

.tools-chips .inv2-chip-x:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

.tools-chips .inv2-chip-x svg {
  width: 8px;
  height: 8px;
  display: block;
  margin: 0;
  flex-shrink: 0;
}

.tools-chips .inv2-clear-all {
  margin-left: 0;
  flex-shrink: 0;
  align-self: center;
  margin-top: 0;
  padding: 0;
  height: 1.55rem;
  font-size: 0.68rem;
  font-weight: 600;
  line-height: 1.55rem;
  text-decoration: none;
  color: #86efac;
}

.tools-chips .inv2-clear-all:hover {
  text-decoration: underline;
  color: #bbf7d0;
}

.inv2-view-toggle {
  display: inline-grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  height: var(--tools-h);
  width: calc(var(--tools-h) * 2 + 6px);
  padding: 3px;
  gap: 2px;
  box-sizing: border-box;
  flex-shrink: 0;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.inv2-view-btn {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  background: transparent;
  border: none;
  padding: 0;
  margin: 0;
  line-height: 0;
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}

.inv2-view-btn svg {
  display: block;
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  color: currentColor;
  stroke: currentColor;
}

.inv2-view-btn.active {
  background: rgba(45, 92, 74, 0.85);
  color: #ffffff;
}

.inv2-view-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.card,
.inv2-data-card {
  background: rgba(28, 42, 33, 0.92);
  border-radius: 12px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  min-height: 160px;
  margin-bottom: 1.5rem;
}

.inv2-card-meta-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0.4rem 0.65rem 0.15rem;
}

.inv2-record-count {
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(229, 235, 231, 0.7);
}

.page-header,
.section {
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 12px;
  box-shadow: var(--panel-shadow);
}

.page-header:not(.page-header-split) {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  text-align: center;
  gap: 20px;
  margin-bottom: 26px;
  padding: 28px 32px;
}

.header-content {
  flex: 1;
  min-width: 0;
  max-width: 820px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 18px;
  margin-bottom: 26px;
}

.stat-card {
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 22px 22px 20px;
  border-radius: 18px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  box-shadow: var(--panel-shadow);
  transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
}

.stat-card::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(120deg, transparent 30%, rgba(255, 255, 255, 0.08) 50%, transparent 70%);
  opacity: 0;
  transition: opacity 0.25s ease;
  pointer-events: none;
}

.stat-card:hover {
  transform: translateY(-3px);
  border-color: var(--line-strong);
  box-shadow: 0 14px 32px rgba(4, 18, 12, 0.38);
}

.stat-card:hover::after {
  opacity: 1;
}

.stat-card:first-child {
  border-left: 3px solid var(--success);
}

.stat-success {
  border-left: 3px solid var(--success);
}

.stat-pending {
  border-left: 3px solid var(--warning);
}

.stat-info {
  border-left: 3px solid var(--info);
}

.stat-content {
  min-width: 0;
}

.stat-label {
  margin-bottom: 6px;
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--text-soft);
}

.stat-value {
  font-size: 30px;
  line-height: 1;
  font-weight: 900;
  letter-spacing: -0.4px;
  color: var(--text-main);
}

.section {
  margin-bottom: 28px;
  padding: 26px 28px 28px;
}

.section-title {
  margin: 0 0 18px;
  font-size: 24px;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.4px;
  color: var(--text-main);
}

.filters-section {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 18px;
  margin-bottom: 22px;
  padding: 20px 22px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-radius: 18px;
  box-shadow: none;
}

@media (max-width: 900px) {
  .filters-section {
    grid-template-columns: 1fr;
  }
}

.filter-group {
  min-width: 0;
}

.filter-label,
.form-label {
  display: block;
  margin-bottom: 10px;
  font-size: 14px;
  font-weight: 800;
  letter-spacing: 0.02em;
  text-transform: none;
  color: var(--text-main);
}

.filter-select,
.form-input {
  width: 100%;
  min-height: 50px;
  padding: 12px 16px;
  border-radius: 12px;
  border: 1px solid var(--line-soft);
  background: rgba(20, 48, 38, 0.85);
  color: var(--text-main);
  font-size: 16px;
  font-weight: 600;
  outline: none;
  transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
  box-shadow: none;
}

.filter-select:focus,
.form-input:focus {
  border-color: rgba(110, 231, 168, 0.45);
  box-shadow: 0 0 0 3px rgba(110, 231, 168, 0.12);
}

.filter-select option,
.form-input option {
  background: #1e4234;
  color: var(--text-main);
}

.table-container,
.inventory-table-container {
  overflow-x: auto;
  border-radius: 20px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  box-shadow: var(--panel-shadow);
  -webkit-overflow-scrolling: touch;
}

.inventory-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 16px 20px 0;
  margin-bottom: 12px;
}

.btn-inventory-add {
  font-size: 15px;
  min-height: 48px;
  padding: 12px 20px;
}

.btn-add-icon {
  flex-shrink: 0;
}

.inv2-section {
  margin-top: 0.25rem;
}

.inv2-panel {
  padding: 0;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: none;
  border-radius: 16px;
  background: linear-gradient(165deg, #1e4234 0%, #255241 100%);
  border: 1px solid rgba(167, 211, 178, 0.24);
  box-shadow: 0 12px 32px rgba(4, 18, 12, 0.28);
}

.inv2-panel .inv2-body {
  max-height: none;
  overflow: visible;
}

.inv2-panel .inv2-table-wrap {
  max-height: none;
  overflow-x: auto;
}

.inv2-col-barangay { width: auto; }
.inv2-td-rate { text-align: right; }
.inv2-td-center { text-align: center; }

.inv2-card-barangay {
  margin: 0.15rem 0 0.55rem;
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-soft, #8fb89e);
}

.inv2-add-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
}

.inv2-modal {
  padding: 0 !important;
  overflow: hidden;
  display: flex !important;
  flex-direction: column;
  width: min(calc(100vw - var(--app-sidebar-width, 260px) - 48px), 1020px) !important;
  max-width: min(calc(100vw - var(--app-sidebar-width, 260px) - 48px), 1020px) !important;
  max-height: 88vh !important;
  margin: 0 auto !important;
  background: linear-gradient(165deg, #1e4234 0%, #255241 100%) !important;
  backdrop-filter: none !important;
  border: 1px solid rgba(167, 211, 178, 0.24) !important;
  box-shadow: 0 20px 48px rgba(4, 18, 12, 0.45) !important;
}

.inv2-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 20px 24px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.07);
  flex-shrink: 0;
}
.inv2-header-left {
  display: flex;
  align-items: center;
  gap: 13px;
}
.inv2-header-icon {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(45, 92, 74, 0.45);
  border: 1px solid rgba(167, 211, 178, 0.28);
  border-radius: 12px;
  color: #a7f3c8;
  flex-shrink: 0;
}
.inv2-title {
  margin: 0;
  font-size: 19px;
  font-weight: 800;
  color: #ecfdf5;
  line-height: 1.2;
}
.inv2-subtitle {
  margin: 2px 0 0;
  font-size: 11px;
  color: #8fb89e;
}
.inv2-header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}
.inv2-close {
  width: 36px;
  height: 36px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.22);
  border-radius: 9px;
  color: #ffffff;
  cursor: pointer;
  transition: all 0.18s ease;
}
.inv2-close svg {
  color: currentColor;
  stroke: currentColor;
}
.inv2-close:hover {
  background: rgba(248, 113, 113, 0.16);
  border-color: rgba(248, 113, 113, 0.28);
  color: #fca5a5;
}

.inv2-toolbar {
  display: grid;
  grid-template-columns: minmax(200px, 1.4fr) minmax(120px, 0.8fr) minmax(120px, 0.8fr) minmax(130px, 0.9fr) auto;
  align-items: center;
  gap: 10px;
  padding: 13px 24px;
  background: rgba(255, 255, 255, 0.025);
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  flex-shrink: 0;
}
.inv2-search {
  position: relative;
  min-width: 0;
  display: flex;
  align-items: center;
}
.inv2-search-ico {
  position: absolute;
  left: 11px;
  color: rgba(200, 235, 210, 0.45);
  pointer-events: none;
}
.inv2-search-input {
  width: 100%;
  padding: 8px 32px 8px 32px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 9px;
  color: #ecfdf5;
  font-size: 13px;
  outline: none;
  transition: border-color 0.2s, box-shadow 0.2s;
}
.inv2-search-input::placeholder {
  color: #8fb89e;
}
.inv2-search-input:focus {
  border-color: rgba(110, 231, 168, 0.45);
  box-shadow: 0 0 0 3px rgba(110, 231, 168, 0.1);
}
.inv2-clear-btn {
  position: absolute;
  right: 10px;
  background: none;
  border: none;
  color: rgba(200, 235, 210, 0.5);
  cursor: pointer;
  padding: 2px;
  display: flex;
}
.inv2-clear-btn:hover {
  color: #f0fdf4;
}
.inv2-select {
  width: 100%;
  min-width: 0;
  padding: 8px 12px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.11);
  border-radius: 9px;
  color: #f0fdf4;
  font-size: 13px;
  outline: none;
  cursor: pointer;
}
.inv2-select option {
  background: #1a3025;
  color: #f0fdf4;
}
.inv2-add-btn {
  justify-self: end;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 8px 18px;
  background: linear-gradient(135deg, #3d7a5c, #2d5c4a);
  border: 1px solid rgba(110, 231, 168, 0.3);
  border-radius: 9px;
  color: #ecfdf5;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(4, 18, 12, 0.25);
  transition: all 0.2s ease;
}
.inv2-add-btn:hover {
  background: linear-gradient(135deg, #4a8f6c, #3d7a5c);
  transform: translateY(-1px);
  box-shadow: 0 6px 16px rgba(4, 18, 12, 0.3);
}
.inv2-add-btn:active {
  transform: translateY(0);
}

.inv2-chips {
  display: flex;
  align-items: center;
  gap: 7px;
  flex-wrap: wrap;
  padding: 8px 24px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
}
.inv2-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  max-width: 100%;
  min-height: 26px;
  padding: 0.2rem 0.35rem 0.2rem 0.55rem;
  border-radius: 999px;
  font-size: 0.7rem;
  font-weight: 600;
  line-height: 1.2;
  background: rgba(45, 92, 74, 0.45);
  border: 1px solid rgba(167, 211, 178, 0.3);
  color: #d1fae5;
}
.inv2-chip-x {
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #d1fae5;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  border-radius: 999px;
  padding: 0;
  flex-shrink: 0;
  opacity: 0.85;
}
.inv2-chip-x:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.16);
}
.inv2-clear-all {
  margin-left: auto;
  background: transparent;
  border: none;
  color: #86efac;
  font-size: 0.72rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.2rem 0.15rem;
  border-radius: 0;
  text-decoration: underline;
  text-underline-offset: 2px;
  white-space: nowrap;
  min-height: auto;
}
.inv2-clear-all:hover {
  background: transparent;
  color: #bbf7d0;
}

.inv2-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 0.35rem 0.65rem 0.65rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
}

.inv2-table-wrap {
  border-radius: 14px;
  overflow-x: auto;
  overflow-y: visible;
  -webkit-overflow-scrolling: touch;
  border: 2px solid #94a3b8;
  background: rgba(255, 255, 255, 0.025);
  scrollbar-width: thin;
  scrollbar-color: #94a3b8 #f1f5f9;
}

.inv2-table-wrap::-webkit-scrollbar {
  height: 10px;
}

.inv2-table-wrap::-webkit-scrollbar-track {
  background: #f1f5f9;
  border-radius: 0 0 14px 14px;
}

.inv2-table-wrap::-webkit-scrollbar-thumb {
  background: #94a3b8;
  border-radius: 5px;
}

.inv2-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.inv2-col-name { width: auto; }
.inv2-col-type { width: auto; }
.inv2-col-member { width: auto; }
.inv2-col-nonmember { width: auto; }
.inv2-col-interest { width: auto; }
.inv2-col-capacity { width: auto; }
.inv2-col-status { width: auto; }
.inv2-col-actions { width: 1%; white-space: nowrap; }

.inv2-th-name,
.inv2-td-name {
  text-align: left !important;
  min-width: 4.5rem;
  white-space: normal;
  word-break: break-word;
}

.inv2-th-rate,
.inv2-table td[style*="text-align:right"] {
  text-align: right !important;
  white-space: nowrap;
}

.inv2-th-actions,
.inv2-td-actions {
  text-align: center !important;
  white-space: nowrap;
  min-width: 4.5rem;
  padding-left: 4px !important;
  padding-right: 4px !important;
}
.inv2-table thead {
  background: rgba(255, 255, 255, 0.04);
}
.inv2-table th {
  padding: 5px 6px;
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(200, 235, 210, 0.5);
  white-space: nowrap;
  text-align: center;
  border-bottom: 1px solid #94a3b8;
}

.inv2-table th:not(:last-child),
.inv2-table td:not(:last-child) {
  border-right: 1px solid #94a3b8;
}

.inv2-table td {
  padding: 5px 6px;
  font-size: 11px;
  color: #e8f5ee;
  vertical-align: middle;
  border-bottom: 1px solid #94a3b8;
}
.inv2-row {
  transition: background 0.15s ease;
  cursor: default;
}
.inv2-row-a td {
  background: rgba(255, 255, 255, 0.01);
}
.inv2-row-b td {
  background: rgba(0, 0, 0, 0.06);
}
.inv2-row:hover td {
  background: rgba(110, 231, 168, 0.06) !important;
}
.inv2-name-wrap {
  display: flex;
  align-items: center;
  gap: 9px;
}
.inv2-machine-icon {
  width: 28px;
  height: 28px;
  background: rgba(45, 92, 74, 0.45);
  border: 1px solid rgba(167, 211, 178, 0.28);
  border-radius: 7px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #a7f3c8;
  flex-shrink: 0;
}
.inv2-name {
  font-weight: 600;
  font-size: 11px;
  line-height: 1.2;
  color: #ecfdf5;
}
.inv2-price {
  font-weight: 700;
  font-size: 11px;
  white-space: nowrap;
}
.inv2-price-main {
  color: #a7f3c8;
}
.inv2-price-member {
  color: #6ee7a8;
}
.inv2-price-nonmember {
  color: #fb923c;
}
.inv2-unit {
  font-size: 8px;
  font-weight: 500;
  color: rgba(200, 235, 210, 0.5);
  margin-left: 1px;
}
.inv2-cap {
  font-size: 10px;
  color: rgba(200, 235, 210, 0.7);
}
.inv2-na {
  color: rgba(200, 235, 210, 0.3);
  font-size: 10px;
}
.inv2-interest {
  font-weight: 600;
  font-size: 10px;
  color: #eefde6;
  white-space: nowrap;
}

.inv2-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  min-width: 0;
  flex-wrap: nowrap;
}
.inv2-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-width: 42px;
  min-height: 38px;
  padding: 8px 10px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.18s ease;
  white-space: nowrap;
}
.inv2-btn-edit {
  background: rgba(59, 130, 246, 0.12);
  color: #93c5fd;
  border-color: rgba(59, 130, 246, 0.22);
}
.inv2-btn-edit:hover {
  background: rgba(59, 130, 246, 0.24);
  transform: translateY(-1px);
}
.inv2-btn-del {
  background: rgba(239, 68, 68, 0.1);
  color: #fca5a5;
  border-color: rgba(239, 68, 68, 0.2);
}
.inv2-btn-del:hover {
  background: rgba(239, 68, 68, 0.22);
  transform: translateY(-1px);
}

.inv2-cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 14px;
  width: 100%;
}

/* Hidden on desktop; shown in the mobile media query below */
.inv2-mobile-list {
  display: none;
}
.inv2-card {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
  border-radius: 14px;
  overflow: hidden;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}
.inv2-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
  border-color: rgba(74, 222, 128, 0.2);
}
.inv2-card-img {
  height: 110px;
  position: relative;
  background: linear-gradient(135deg, rgba(18, 46, 28, 0.9), rgba(28, 56, 38, 0.9));
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.inv2-card-img img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.inv2-card-img-fallback {
  color: rgba(100, 200, 130, 0.35);
}
.inv2-card-status-badge {
  position: absolute;
  top: 8px;
  right: 8px;
  font-size: 10px !important;
  padding: 3px 9px !important;
}
.inv2-card-body {
  padding: 13px 14px 14px;
}
.inv2-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 4px;
}
.inv2-card-name {
  font-size: 14px;
  font-weight: 700;
  color: #f0fdf4;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}
.inv2-card-pricing {
  display: flex;
  flex-direction: column;
  gap: 5px;
  margin-bottom: 8px;
}
.inv2-card-price-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.inv2-card-price-label {
  font-size: 10px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(200, 235, 210, 0.45);
}
.inv2-card-cap {
  display: flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  color: rgba(200, 235, 210, 0.55);
  margin-bottom: 12px;
}
.inv2-card-actions {
  display: flex;
  gap: 8px;
}
.inv2-card-actions .inv2-action-btn {
  flex: 1;
  justify-content: center;
  padding: 8px;
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

.inv2-pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 4px 0;
}
.inv2-pg-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #f0fdf4;
  cursor: pointer;
  transition: all 0.15s ease;
}
.inv2-pg-btn:hover:not(:disabled) {
  background: rgba(45, 92, 74, 0.5);
  border-color: rgba(167, 211, 178, 0.32);
}
.inv2-pg-btn:disabled {
  opacity: 0.28;
  cursor: not-allowed;
}
.inv2-pg-info {
  font-size: 13px;
  font-weight: 600;
  color: rgba(200, 235, 210, 0.55);
  min-width: 52px;
  text-align: center;
}

.inv2-fab {
  display: none;
  position: absolute;
  bottom: 22px;
  right: 22px;
  width: 52px;
  height: 52px;
  border-radius: 9999px;
  background: linear-gradient(135deg, #16a34a, #15803d);
  border: none;
  color: #fff;
  box-shadow: 0 4px 16px rgba(22, 163, 74, 0.5);
  align-items: center;
  justify-content: center;
  cursor: pointer;
  z-index: 10;
  transition: all 0.2s ease;
}
.inv2-fab:hover {
  box-shadow: 0 6px 22px rgba(22, 163, 74, 0.65);
  transform: scale(1.06);
}

@media (max-width: 1120px) {
  .inv2-toolbar {
    grid-template-columns: 1fr 1fr 1fr;
  }
  .inv2-add-btn {
    grid-column: 1 / -1;
    justify-self: start;
  }
}

@media (max-width: 640px) {
  .inv2-fab {
    display: none;
  }
  .inv2-panel .inv2-add-btn {
    display: inline-flex;
    width: 100%;
    justify-content: center;
  }
  .inv2-modal {
    max-height: 95vh !important;
    width: min(calc(100vw - 28px), calc(100vw - 28px)) !important;
    max-width: calc(100vw - 28px) !important;
    margin: 0 auto !important;
  }
  .inv2-toolbar {
    grid-template-columns: 1fr;
    align-items: stretch;
  }
  .inv2-cards-grid {
    grid-template-columns: 1fr;
  }
  .modal-form-content {
    margin-top: 8px;
  }
}

/* ===== Mobile page layout (desktop unchanged) ===== */
@media (max-width: 768px) {
  .page-container.machinery-management-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    padding: 0.75rem;
    border-radius: 0;
  }

  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-template-areas:
      "title action"
      "subtitle action";
    align-items: center;
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

  .btn-header-add {
    grid-area: action;
    align-self: center;
    padding: 0.45rem 0.7rem;
    font-size: 0.78rem;
    border-radius: 9px;
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

  .inv2-view-toggle {
    height: var(--tools-h);
    width: calc(var(--tools-h) * 2 + 4px);
    padding: 2px;
    border-radius: 8px;
  }

  .inv2-view-btn {
    border-radius: 6px;
  }

  .inv2-view-btn svg {
    width: 13px;
    height: 13px;
  }

  .filter-group {
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.4rem;
    width: 100%;
  }

  .filter-group-2 {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .filter-group .toolbar-select:last-child {
    grid-column: auto;
  }

  .bookings-section {
    padding: 0.75rem 0.7rem 0.85rem;
    margin-bottom: 0.85rem;
  }

  .bookings-section .section-title {
    font-size: 1rem;
    margin-bottom: 0.65rem;
  }

  .bookings-tools-card {
    margin-bottom: 0.65rem;
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

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.5rem;
    margin-bottom: 0.75rem;
  }

  .stat-card {
    padding: 0.7rem 0.75rem 0.65rem;
    gap: 0.35rem;
    border-radius: 12px;
  }

  .stat-label {
    font-size: 0.62rem;
    margin-bottom: 0.2rem;
    letter-spacing: 0.04em;
  }

  .stat-value {
    font-size: 1.15rem;
  }

  .tools-chips {
    margin: 0;
    padding: 0.3rem 0 0;
    gap: 0.3rem;
  }

  .tools-chips-list {
    gap: 0.22rem;
  }

  .tools-chips .inv2-chip {
    height: 1.45rem;
    font-size: 0.65rem;
    padding: 0 0.15rem 0 0.38rem;
    border-radius: 5px;
  }

  .tools-chips .inv2-chip-x {
    width: 0.95rem;
    height: 0.95rem;
  }

  .tools-chips .inv2-clear-all {
    height: 1.45rem;
    font-size: 0.65rem;
    line-height: 1.45rem;
  }

  .btn-header-add {
    min-height: 34px;
    padding: 0.35rem 0.65rem;
    font-size: 0.78rem;
    border-radius: 9px;
  }

  .page-header:not(.page-header-split) {
    margin-bottom: 14px;
    padding: 14px 14px 12px;
    gap: 8px;
    border-radius: 14px;
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

  .filters-section {
    display: grid;
    grid-template-columns: 1fr;
    gap: 8px;
    margin-bottom: 12px;
  }

  .inv2-header {
    padding: 12px 12px 10px;
    gap: 8px;
  }

  .inv2-header-icon {
    width: 36px;
    height: 36px;
    border-radius: 10px;
  }

  .inv2-title {
    font-size: 1.05rem;
  }

  .inv2-subtitle {
    font-size: 0.72rem;
  }

  .inv2-toolbar {
    grid-template-columns: 1fr;
    gap: 8px;
    padding: 10px 12px;
  }

  .inv2-chips {
    padding: 8px 12px;
    gap: 6px;
  }

  .inv2-panel .inv2-body {
    padding: 8px 10px 12px;
  }

  .inv2-desktop-table {
    display: none !important;
  }

  .inv2-mobile-list {
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

  .machinery-action-icon {
    display: none !important;
  }

  .machinery-action-text {
    display: inline-flex !important;
  }

  .inv2-card-actions.action-buttons {
    justify-content: center;
    width: 100%;
  }

  .inv2-cards-grid {
    grid-template-columns: 1fr;
    gap: 10px;
    padding: 0;
  }

  .inv2-card {
    border-radius: 12px;
  }

  .inv2-card-img {
    height: 120px;
  }

  .inv2-card-body {
    padding: 0.7rem 0.75rem 0.75rem;
  }

  .inventory-table-container,
  .table-container {
    overflow-x: visible;
  }

  .inventory-table thead,
  .bookings-table thead {
    display: none;
  }

  .inventory-table,
  .inventory-table tbody,
  .inventory-table tr,
  .inventory-table td,
  .bookings-table,
  .bookings-table tbody,
  .bookings-table tr,
  .bookings-table td {
    display: block;
    width: 100%;
  }

  .inventory-table tr,
  .bookings-table tr {
    border: 1px solid rgba(167, 211, 178, 0.22);
    border-radius: 12px;
    margin-bottom: 8px;
    padding: 0.65rem 0.75rem;
    background: rgba(0, 0, 0, 0.14);
  }

  .inventory-table td,
  .bookings-table td {
    padding: 0.28rem 0;
    border: none !important;
    white-space: normal;
    word-break: break-word;
  }

  .inventory-table td::before,
  .bookings-table td::before {
    content: attr(data-label);
    display: block;
    font-size: 0.68rem;
    font-weight: 700;
    letter-spacing: 0.03em;
    text-transform: uppercase;
    color: rgba(229, 235, 231, 0.55);
    margin-bottom: 0.15rem;
  }

  .inventory-table .actions-cell::before,
  .bookings-table .booking-actions-cell::before,
  .bookings-table td.actions-cell::before {
    content: none;
  }

  .inventory-table .actions-cell,
  .bookings-table .booking-actions-cell {
    padding-top: 0.55rem;
    margin-top: 0.35rem;
    border-top: 1px solid rgba(190, 235, 203, 0.12);
  }

  .inventory-table .action-buttons,
  .booking-actions-cell {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 0.4rem;
    width: 100%;
  }

  .standalone-actions {
    padding: 0 0 10px;
  }

  .btn-inventory-add {
    width: 100%;
    justify-content: center;
    min-height: 42px;
    font-size: 0.9rem;
  }

  .form-row {
    grid-template-columns: 1fr;
  }
}

.machinery-management-page.light-theme .machinery-action-edit-text {
  color: #9a3412;
  background: #fff7ed;
  border-color: #fdba74;
}

.machinery-management-page.light-theme .machinery-action-delete-text {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fca5a5;
}

.machinery-management-page.light-theme .machinery-action-assign-text {
  color: #1d4ed8;
  background: #eff6ff;
  border-color: #93c5fd;
}

.machinery-management-page.light-theme .machinery-action-view-text {
  color: #166534;
  background: #f0fdf4;
  border-color: #86efac;
}

.machinery-management-page.light-theme .inv2-mobile-label {
  color: #64748b;
}

@media (max-width: 768px) {
  .machinery-management-page.light-theme .inv2-mobile-card {
    background: #ffffff;
    border-color: #bbf7d0;
  }

  .machinery-management-page.light-theme .inv2-mobile-card-name {
    color: #052e16;
  }

  .machinery-management-page.light-theme .inv2-mobile-label {
    color: #64748b;
  }

  .machinery-management-page.light-theme .inv2-mobile-card-actions {
    border-top-color: #bbf7d0;
  }

  .machinery-management-page.light-theme .bookings-table-wrap {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
  }

  .machinery-management-page.light-theme .inv2-table tr.inv2-row,
  .machinery-management-page.light-theme .inventory-table tr,
  .machinery-management-page.light-theme .bookings-table tr {
    background: #ffffff;
    border-color: #bbf7d0;
  }

  .machinery-management-page.light-theme .inv2-table .inv2-td-actions,
  .machinery-management-page.light-theme .inventory-table .actions-cell,
  .machinery-management-page.light-theme .bookings-table .booking-actions-cell {
    border-top-color: #bbf7d0;
  }

  .machinery-management-page.light-theme .inventory-table td::before,
  .machinery-management-page.light-theme .bookings-table td::before {
    color: #64748b;
  }
}

.standalone-actions {
  padding: 0 0 18px;
}

.bookings-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
  min-width: 0;
}

.inventory-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  min-width: 100%;
}

.bookings-table col.col-farmer { width: 13%; }
.bookings-table col.col-machinery { width: 14%; }
.bookings-table col.col-date { width: 8%; }
.bookings-table col.col-location { width: 12%; }
.bookings-table col.col-area { width: 8%; }
.bookings-table col.col-total { width: 9%; }
.bookings-table col.col-status { width: 9%; }
.bookings-table col.col-actions { width: 6%; }

.inventory-table-admin col.col-name { width: auto; }
.inventory-table-admin col.col-type { width: auto; }
.inventory-table-admin col.col-barangay { width: auto; }
.inventory-table-admin col.col-pricing { width: auto; }
.inventory-table-admin col.col-capacity { width: auto; }
.inventory-table-admin col.col-status { width: auto; }
.inventory-table-admin col.col-actions { width: auto; }

.inventory-table-president col.col-operator { width: 11%; }
.operator-cell { min-width: 0; max-width: 9rem; }
.operator-assigned { display: block; line-height: 1.15; font-size: 10px; }
.operator-assigned small { color: var(--text-soft, #8fb89e); font-size: 9px; }
.operator-missing { color: #e65100; font-size: 10px; font-weight: 600; }
.machinery-action-assign { color: #1565c0; }

.inventory-table-president col.col-name { width: auto; }
.inventory-table-president col.col-type { width: auto; }
.inventory-table-president col.col-pricing { width: auto; }
.inventory-table-president col.col-status { width: auto; }
.inventory-table-president col.col-actions { width: auto; }

.inventory-table-admin th:nth-child(1),
.inventory-table-admin td:nth-child(1) { min-width: 7.5rem; }
.inventory-table-admin th:nth-child(2),
.inventory-table-admin td:nth-child(2) { min-width: 6.5rem; }
.inventory-table-admin th:nth-child(3),
.inventory-table-admin td:nth-child(3) { min-width: 7rem; }
.inventory-table-admin th:nth-child(4),
.inventory-table-admin td:nth-child(4) { min-width: 15rem; }
.inventory-table-admin th:nth-child(5),
.inventory-table-admin td:nth-child(5) { min-width: 8.5rem; }
.inventory-table-admin th:nth-child(6),
.inventory-table-admin td:nth-child(6) { min-width: 7.5rem; }
.inventory-table-admin th:nth-child(7),
.inventory-table-admin td:nth-child(7) { min-width: 6.5rem; }

.bookings-table thead,
.inventory-table thead {
  background: linear-gradient(135deg, #255241 0%, #2d5c4a 100%);
}

.bookings-table th,
.inventory-table th {
  padding: 0.85rem 0.75rem;
  text-align: center;
  vertical-align: middle;
  border-bottom: 1.5px solid #94a3b8;
  font-size: 1rem;
  font-weight: 800;
  text-transform: none;
  letter-spacing: 0.01em;
  color: var(--text-main);
  line-height: 1.3;
  white-space: nowrap;
}

.bookings-table th:not(:last-child),
.inventory-table th:not(:last-child),
.bookings-table td:not(:last-child),
.inventory-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
}

.bookings-table td,
.inventory-table td {
  padding: 0.85rem 0.75rem;
  vertical-align: middle;
  text-align: center;
  border-bottom: 1.5px solid #94a3b8;
  color: var(--text-main);
  font-size: 1.125rem;
  line-height: 1.4;
  word-break: normal;
  overflow-wrap: normal;
}

.inventory-table td:first-child {
  font-weight: 700;
  text-align: left;
}

.inventory-table .pricing-cell {
  text-align: left;
  vertical-align: top;
}

.inventory-table .capacity-cell {
  white-space: nowrap;
  font-weight: 600;
  font-size: 1.0625rem;
}

.bookings-table tbody tr,
.inventory-table tbody tr {
  transition: background 0.2s ease;
}

.bookings-table tbody tr:hover,
.inventory-table tbody tr:hover {
  background: rgba(110, 231, 168, 0.06);
}

.farmer-info,
.machinery-info {
  display: flex;
  flex-direction: column;
  gap: 0.12rem;
  align-items: center;
  text-align: center;
}

.farmer-info strong,
.machinery-info strong {
  color: var(--text-main);
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1.15;
}

.farmer-info small,
.machinery-info small {
  color: var(--text-soft);
  font-size: 0.58rem;
  line-height: 1.1;
}

.price-cell {
  font-weight: 800;
  color: #9af0b5;
  font-size: 0.65rem;
  white-space: normal;
  word-break: break-word;
}

.price-display {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
  align-items: flex-start;
  text-align: left;
  padding: 0.15rem 0.25rem;
}

.price-stack {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  min-width: 13.5rem;
}

.price-block {
  display: grid;
  grid-template-columns: 5.75rem 1fr;
  align-items: baseline;
  gap: 0.35rem 0.5rem;
  padding: 0.45rem 0.6rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(167, 211, 178, 0.14);
}

.price-block-label {
  font-size: 0.8125rem;
  font-weight: 800;
  color: var(--text-soft);
  line-height: 1.3;
}

.price-block-value {
  font-size: 1.0625rem;
  font-weight: 800;
  color: #a7f3c8;
  line-height: 1.35;
}

.price-block-value small {
  display: block;
  margin-top: 0.15rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-soft);
}

.price-block-member {
  border-left: 3px solid rgba(110, 231, 168, 0.55);
}

.price-block-nonmember {
  border-left: 3px solid rgba(96, 165, 250, 0.45);
}

.price-row {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: flex-start;
  gap: 0.35rem;
  font-size: 0.9375rem;
  line-height: 1.35;
}

.price-label {
  font-weight: 700;
  color: var(--text-soft);
  font-size: 0.8125rem;
  min-width: 5.5rem;
  text-align: right;
}

.price-value {
  font-weight: 800;
  color: #a7f3c8;
  word-break: break-word;
  font-size: 0.9375rem;
}

.badge,
.status-badge,
.barangay-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.2rem;
  padding: 0.4rem 0.75rem;
  border-radius: 999px;
  font-size: 0.9375rem;
  font-weight: 700;
  line-height: 1.25;
  white-space: nowrap;
  text-align: center;
}

.badge-primary {
  background: rgba(96, 165, 250, 0.18);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.24);
}
.badge-warning {
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.24);
}
.badge-info {
  background: rgba(129, 140, 248, 0.18);
  color: #c7d2fe;
  border: 1px solid rgba(129, 140, 248, 0.24);
}
.badge-success {
  background: rgba(45, 92, 74, 0.45);
  color: #d1fae5;
  border: 1px solid rgba(110, 231, 168, 0.3);
}
.badge-default {
  background: rgba(203, 213, 225, 0.14);
  color: #dbe4ec;
  border: 1px solid rgba(203, 213, 225, 0.2);
}

.status-success {
  background: rgba(45, 92, 74, 0.5);
  color: #d1fae5;
  border: 1px solid rgba(110, 231, 168, 0.32);
}
.status-info {
  background: rgba(96, 165, 250, 0.18);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.24);
}
.status-warning {
  background: rgba(251, 191, 36, 0.18);
  color: #fde68a;
  border: 1px solid rgba(251, 191, 36, 0.24);
}
.status-danger {
  background: rgba(248, 113, 113, 0.18);
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.24);
}
.status-default {
  background: rgba(203, 213, 225, 0.14);
  color: #dbe4ec;
  border: 1px solid rgba(203, 213, 225, 0.2);
}

.barangay-badge {
  justify-content: flex-start;
  background: rgba(96, 165, 250, 0.16);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.22);
}

.action-buttons,
.actions-cell {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: nowrap;
}

.machinery-management-page .inventory-table .machinery-action-btn,
.machinery-management-page .inv2-table .machinery-action-btn,
.machinery-management-page .inv2-card .machinery-action-btn {
  width: 28px;
  height: 28px;
  min-width: 28px;
  min-height: 28px;
  border-radius: 6px;
}

.machinery-management-page .inventory-table .machinery-action-btn svg,
.machinery-management-page .inv2-table .machinery-action-btn svg,
.machinery-management-page .inv2-card .machinery-action-btn svg {
  width: 14px;
  height: 14px;
}

.inv2-card-actions.action-buttons {
  justify-content: flex-start;
  margin-top: 10px;
}

.inv2-mobile-meta {
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

.machinery-action-assign-text {
  color: #dbeafe;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(96, 165, 250, 0.45);
}

.machinery-action-view-text {
  color: #d1fae5;
  background: rgba(10, 24, 18, 0.95);
  border-color: rgba(52, 211, 153, 0.45);
}

.btn-icon-small,
.btn-sm {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  height: 1.5rem;
  padding: 0 0.28rem;
  font-size: 0.72rem;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-main);
  cursor: pointer;
  transition: transform 0.18s ease, background 0.18s ease, border-color 0.18s ease;
}

.btn-icon-small:hover,
.btn-sm:hover {
  transform: translateY(-1px);
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.2);
}

.btn-info {
  background: rgba(96, 165, 250, 0.16);
  border-color: rgba(96, 165, 250, 0.2);
}

.btn-icon-small.btn-danger,
.btn-sm.btn-danger {
  background: rgba(248, 113, 113, 0.14);
  border-color: rgba(248, 113, 113, 0.2);
  color: #fecaca;
}

.btn-icon-small.btn-danger:hover,
.btn-sm.btn-danger:hover {
  background: rgba(248, 113, 113, 0.2);
}

.booking-view-btn {
  background: rgba(96, 165, 250, 0.16);
  border-color: rgba(147, 197, 253, 0.42);
  color: #dbeafe;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.12);
}

.booking-view-btn:hover {
  background: rgba(96, 165, 250, 0.26);
  border-color: rgba(147, 197, 253, 0.62);
  box-shadow: 0 8px 14px rgba(30, 64, 175, 0.24);
}

.booking-view-icon {
  width: 0.85rem;
  height: 0.85rem;
  display: block;
}

.btn-primary,
.btn-secondary,
.btn-success,
.btn-danger,
.btn-upload-picture,
.btn-remove-picture {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 44px;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 14px;
  font-weight: 800;
  border: 1px solid transparent;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease;
}

.btn-primary {
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: white;
  box-shadow: 0 8px 20px rgba(37, 99, 235, 0.28);
}

.btn-success {
  background: linear-gradient(135deg, #3d7a5c, #2d5c4a);
  color: #ecfdf5;
  border-color: rgba(110, 231, 168, 0.3);
  box-shadow: 0 6px 16px rgba(4, 18, 12, 0.28);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  border-color: rgba(255, 255, 255, 0.12);
}

.btn-danger,
.btn-remove-picture {
  background: linear-gradient(135deg, #f87171, #dc2626);
  color: white;
  box-shadow: 0 8px 20px rgba(220, 38, 38, 0.24);
}

.btn-upload-picture {
  width: 100%;
  background: linear-gradient(135deg, #60a5fa, #2563eb);
  color: white;
}

.btn-primary:hover,
.btn-secondary:hover,
.btn-success:hover,
.btn-danger:hover,
.btn-upload-picture:hover,
.btn-remove-picture:hover {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.btn-primary:disabled,
.btn-secondary:disabled,
.btn-success:disabled,
.btn-danger:disabled {
  opacity: 0.7;
  cursor: not-allowed;
  transform: none;
}

.btn-icon {
  font-size: 16px;
}

.modal-overlay {
  /* Theme vars duplicated from the page container so teleported modals resolve them */
  --surface-1: rgba(28, 42, 33, 0.92);
  --surface-2: rgba(24, 39, 30, 0.92);
  --surface-3: #2d5c4a;
  --line-soft: rgba(190, 235, 203, 0.14);
  --line-strong: rgba(187, 227, 196, 0.35);
  --text-main: #eefde6;
  --text-muted: rgba(229, 235, 231, 0.82);
  --text-soft: rgba(229, 235, 231, 0.65);
  --success: #6ee7a8;
  --warning: #e8c468;
  --danger: #f87171;
  --info: #7dd3fc;
  --panel-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  position: fixed !important;
  inset: 0 !important;
  left: 0 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding:
    max(0.75rem, env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
  background: rgba(6, 12, 9, 0.62) !important;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  z-index: 10050 !important;
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.modal-content {
  width: 100%;
  max-width: 520px;
  max-height: min(92dvh, calc(100dvh - 1.5rem));
  margin: auto;
  background: rgba(28, 42, 33, 0.96);
  color: #eefde6;
  border-radius: 14px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.machinery-edit-modal {
  max-width: 560px;
}

.machinery-edit-modal .modal-body {
  overflow-y: auto;
  flex: 1;
  min-height: 0;
}

.modal-form-content {
  margin-top: 0;
}

.modal-large {
  max-width: 820px;
}
.modal-xlarge {
  max-width: 1080px;
}
.modal-small {
  max-width: 420px;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(28, 42, 33, 0.98);
}

.modal-title-text h2,
.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #eefde6;
}

.modal-close,
.close-btn,
.modal-content .close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.15rem;
  height: 2.15rem;
  border: 1px solid rgba(190, 235, 203, 0.15);
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.2);
  color: rgba(229, 235, 231, 0.65);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}

.modal-body {
  padding: 1.1rem 1.25rem 1.25rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 0.85rem 1.25rem 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  flex-shrink: 0;
  background: rgba(28, 42, 33, 0.98);
}

.modal-footer .btn-secondary {
  padding: 0.55rem 1.1rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.875rem;
  background: rgba(0, 0, 0, 0.22);
  border: 1px solid rgba(190, 235, 203, 0.2);
  color: #eefde6;
  cursor: pointer;
}

.modal-footer .btn-submit {
  padding: 0.55rem 1.15rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.875rem;
  color: #14532d;
  background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
  border: 1px solid rgba(74, 222, 128, 0.45);
  cursor: pointer;
}

.modal-footer .btn-submit:disabled {
  opacity: 0.7;
  cursor: not-allowed;
}

.form-group {
  margin-bottom: 0.65rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label,
.form-label {
  display: block;
  margin: 0 0 0.25rem !important;
  padding: 0 !important;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.25;
  color: rgba(229, 235, 231, 0.88);
}

.form-group .form-input,
.form-group input,
.form-group select,
.form-group textarea {
  margin: 0 !important;
}

.modal-content .form-input,
.modal-content input.form-input,
.modal-content select.form-input,
.modal-content textarea.form-input {
  width: 100%;
  min-height: 40px;
  padding: 0.5rem 0.7rem;
  font-size: 0.875rem;
  font-weight: 600;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(190, 235, 203, 0.24);
  color: #eefde6;
  box-sizing: border-box;
}

.price-input-wrap {
  position: relative;
  display: flex;
  align-items: center;
}

.price-input-prefix {
  position: absolute;
  left: 0.75rem;
  z-index: 1;
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(229, 235, 231, 0.55);
  pointer-events: none;
}

.price-input-wrap .price-input {
  padding-left: 1.65rem !important;
}

.modal-content textarea.form-input {
  min-height: 72px;
}

.form-hint {
  display: block;
  margin-top: 0.28rem;
  font-size: 0.72rem;
  color: var(--text-soft);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.7rem;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  margin-top: 0.85rem;
  padding-top: 0.15rem;
}

.modal-delete-overlay {
  z-index: 1300;
}

.modal-content.modal-delete {
  max-width: 520px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.modal-title-row {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  min-width: 0;
}

.modal-title-text {
  min-width: 0;
}

.modal-subtitle {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  line-height: 1.45;
  font-weight: 500;
}

.delete-modal-header {
  padding: 1.25rem 1.35rem;
  gap: 0.75rem;
  align-items: flex-start;
}

.delete-warning-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #fca5a5;
  color: #b91c1c;
}

.delete-warning-icon svg {
  width: 1.45rem;
  height: 1.45rem;
}

.delete-modal-body {
  padding: 0 1.35rem 1.1rem;
}

.delete-confirm-message {
  color: rgba(229, 235, 231, 0.82) !important;
}

.delete-warning-text {
  margin: 0;
  padding: 0.85rem 1rem;
  border-radius: 10px;
  background: rgba(254, 226, 226, 0.12);
  border: 1px solid rgba(248, 113, 113, 0.28);
  color: #fecaca;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.45;
}

.delete-modal-footer,
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  padding: 1rem 1.35rem 1.2rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.1);
}

.close-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-main);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
}

.close-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-delete-confirm {
  padding: 0.55rem 1.15rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.9375rem;
  cursor: pointer;
  border: 2px solid #b91c1c;
  color: #ffffff;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%);
  transition: filter 0.15s ease, transform 0.15s ease;
}

.btn-delete-confirm:hover:not(:disabled) {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.btn-delete-confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.inventory-table-admin td:nth-child(4) .price-stack,
.inventory-table-president td:nth-child(3) .price-stack {
  margin: 0;
}

.booking-details {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.detail-section {
  padding: 18px;
  background: var(--surface-2);
  border: 1px solid var(--line-soft);
  border-radius: 16px;
}

.detail-section h3 {
  margin: 0 0 14px;
  font-size: 18px;
  color: var(--text-main);
}

.details-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px 20px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-item label {
  font-size: 12px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.7px;
  color: var(--text-soft);
}

.price-highlight {
  color: #9af0b5;
  font-size: 20px;
}

.notes-text {
  margin: 0;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  color: var(--text-muted);
  line-height: 1.7;
}

.loading-cell,
.empty-cell {
  padding: 42px 24px !important;
  text-align: center;
  color: var(--text-muted);
}

.empty-state {
  padding: 26px;
  border-radius: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.12);
  text-align: center;
  color: var(--text-muted);
}

.loading-spinner,
.spinner-small {
  border-radius: 999px;
  animation: spin 1s linear infinite;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  margin: 0 auto 16px;
  border: 3px solid rgba(255, 255, 255, 0.08);
  border-top: 3px solid var(--success);
}

.spinner-small {
  width: 20px;
  height: 20px;
  border: 2px solid rgba(255, 255, 255, 0.1);
  border-top: 2px solid var(--info);
}

@keyframes spin {
  0% {
    transform: rotate(0deg);
  }
  100% {
    transform: rotate(360deg);
  }
}

.alert-center-stack {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10060;
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
  backdrop-filter: blur(12px);
  pointer-events: auto;
  animation: alert-pop-in 0.18s ease-out;
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

.alert-error {
  background: rgba(127, 29, 29, 0.92);
  color: #fecaca;
  border-left: 4px solid #ef4444;
}
.alert-success {
  background: rgba(6, 95, 70, 0.92);
  color: #d1fae5;
  border-left: 4px solid #10b981;
}
.alert-warning {
  background: rgba(120, 53, 15, 0.92);
  color: #fde68a;
  border-left: 4px solid #f59e0b;
}

.alert-close {
  background: none;
  border: none;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
  opacity: 0.85;
}

.warning-text {
  color: #fecaca;
  font-size: 14px;
  margin-top: 8px;
}

.barangay-assignment-group {
  padding: 0;
  margin-bottom: 0;
  border-radius: 0;
  background: transparent;
  border: none;
}

.machinery-form-section {
  margin-bottom: 0.65rem;
  padding: 0.65rem 0.75rem 0.25rem;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(190, 235, 203, 0.18);
}

.machinery-form-section:last-of-type {
  margin-bottom: 0;
}

.machinery-form-section-title {
  margin: 0 0 0.4rem;
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(229, 235, 231, 0.78);
}

.machinery-form-section-desc {
  display: none;
}

.barangay-loading {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 0;
  color: var(--text-muted);
}

.barangay-select-emphasized {
  border-color: rgba(74, 222, 128, 0.35);
}

.barangay-select-emphasized:focus {
  border-color: rgba(74, 222, 128, 0.55);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.15);
}

.barangay-selected {
  margin-top: 10px;
  padding: 0;
  border-radius: 0;
  background: transparent;
  border-left: none;
  color: #86efac;
  font-size: 0.9375rem;
  font-weight: 700;
}

.barangay-hint {
  color: var(--text-soft);
}

.barangay-read-only {
  margin-top: 0;
  padding: 14px;
  border-radius: 12px;
  background: rgba(45, 92, 74, 0.35);
  border: 1px solid rgba(167, 211, 178, 0.28);
  color: #d1fae5;
}

.barangay-read-only .barangay-info {
  margin-bottom: 8px;
  font-size: 1rem;
  font-weight: 700;
}

.picture-upload-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px dashed rgba(255, 255, 255, 0.16);
  border-radius: 16px;
}

.picture-preview {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 14px;
}

.preview-image {
  width: 100%;
  max-width: 250px;
  min-height: 150px;
  height: auto;
  display: block;
  object-fit: contain;
  object-position: center;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
}

.picture-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  text-align: center;
  color: var(--text-soft);
}

.placeholder-icon {
  margin-bottom: 8px;
  font-size: 48px;
}

.picture-placeholder p {
  margin: 0;
  font-size: 14px;
}

.file-input-hidden {
  display: none;
}

@media (max-width: 1100px) {
  .page-header {
    flex-direction: column;
    align-items: stretch;
  }

  .inventory-actions {
    justify-content: flex-start;
  }

  .table-container,
  .inventory-table-container {
    overflow-x: auto;
  }
}

@media (max-width: 768px) {
  .form-row,
  .details-grid {
    grid-template-columns: 1fr;
  }

  .modal-overlay {
    padding:
      max(0.65rem, env(safe-area-inset-top, 0px))
      0.75rem
      0.75rem !important;
    padding-left: 0.75rem !important;
  }

  .modal-header,
  .modal-body {
    padding-left: 0.95rem;
    padding-right: 0.95rem;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions > * {
    width: 100%;
  }

  .alert-center-stack {
    width: calc(100vw - 1.75rem);
    gap: 0.5rem;
  }

  .alert {
    padding: 0.85rem 0.95rem;
    font-size: 0.85rem;
    border-radius: 12px;
  }
}

@media (max-width: 480px) {
  .page-container.machinery-management-page {
    padding: 0.65rem;
  }

  .btn-header-add {
    min-height: 32px;
    padding: 0.3rem 0.55rem;
    font-size: 0.72rem;
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

  .bookings-table th,
  .inventory-table th,
  .bookings-table td,
  .inventory-table td {
    padding-top: 0.65rem;
    padding-bottom: 0.65rem;
    font-size: 1rem;
  }

  .inventory-table .price-block-value {
    font-size: 1rem;
  }
}

/* ===== Dark-only — night farm dashboard (skip in light mode) ===== */
.machinery-management-page:not(.light-theme)::before,
.machinery-management-page:not(.light-theme)::after {
  opacity: 0.85 !important;
}

.machinery-management-page:not(.light-theme) :is(
  .page-header, .section, .stat-card, .filters-section, .table-container,
  .inventory-table-container, .detail-section, .empty-state,
  .picture-upload-section, .picture-preview, .notes-text, .inv2-card, .inv2-table-wrap,
  .tools-card, .card, .inv2-data-card
) {
  background: var(--surface-1) !important;
  border-color: var(--line-soft) !important;
  box-shadow: var(--panel-shadow) !important;
  backdrop-filter: none !important;
  -webkit-backdrop-filter: none !important;
}

.machinery-management-page:not(.light-theme) .inv2-modal {
  background: linear-gradient(165deg, #1e4234 0%, #255241 100%) !important;
}

.machinery-management-page:not(.light-theme) :is(.bookings-table thead, .inventory-table thead, .inv2-table thead) {
  background: linear-gradient(135deg, #255241 0%, #2d5c4a 100%) !important;
  border-color: var(--line-soft) !important;
}

.machinery-management-page:not(.light-theme) :is(.bookings-table th, .inventory-table th, .inv2-table th) {
  border-bottom: 2px solid #6ee7a8 !important;
}

.machinery-management-page:not(.light-theme) :is(.bookings-table th, .inventory-table th, .inv2-table th):not(:last-child),
.machinery-management-page:not(.light-theme) :is(.bookings-table td, .inventory-table td, .inv2-table td):not(:last-child) {
  border-right: 1.5px solid #94a3b8 !important;
}

.machinery-management-page:not(.light-theme) :is(.bookings-table td, .inventory-table td, .inv2-table td) {
  border-bottom: 1.5px solid #94a3b8 !important;
}

.machinery-management-page:not(.light-theme) :is(.table-container, .inventory-table-container, .inv2-table-wrap) {
  border: 2px solid #94a3b8 !important;
}

.machinery-management-page:not(.light-theme) :is(.inv2-toolbar) {
  background: rgba(30, 66, 52, 0.65) !important;
  border-color: var(--line-soft) !important;
}

.machinery-management-page:not(.light-theme) .tools-chips {
  background: transparent !important;
  border: none !important;
  border-top: 1px solid rgba(190, 235, 203, 0.14) !important;
  box-shadow: none !important;
}

.machinery-management-page:not(.light-theme) :is(.inv2-view-btn, .inv2-close) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.machinery-management-page:not(.light-theme) :is(.inv2-view-btn, .inv2-close) svg {
  color: #ffffff !important;
  stroke: #ffffff !important;
}

.machinery-management-page:not(.light-theme) .inv2-view-btn.active {
  background: rgba(45, 92, 74, 0.82) !important;
  color: #ffffff !important;
}

.machinery-management-page:not(.light-theme) .inv2-view-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.12) !important;
  color: #ffffff !important;
}

.machinery-management-page:not(.light-theme) .inv2-close {
  background: rgba(255, 255, 255, 0.08) !important;
  border-color: rgba(255, 255, 255, 0.24) !important;
}

.machinery-management-page:not(.light-theme) .inv2-close:hover {
  color: #ffffff !important;
}

.machinery-management-page:not(.light-theme) :is(.bookings-table tbody tr:hover, .inventory-table tbody tr:hover, .inv2-row:hover td) {
  background: rgba(110, 231, 168, 0.06) !important;
}

.machinery-management-page:not(.light-theme) :is(
  .filter-select, .form-input, .inv2-search-input, .inv2-select,
  .modal-close, .btn-icon-small, .btn-sm
) {
  background: rgba(20, 48, 38, 0.9) !important;
  border-color: var(--line-soft) !important;
  color: var(--text-main) !important;
  box-shadow: none !important;
}

.machinery-management-page:not(.light-theme) .stat-card::after {
  background: transparent !important;
}

.machinery-management-page:not(.light-theme) .machinery-inventory-btn {
  background: #f7fdf9 !important;
  border: 2px solid rgba(110, 231, 168, 0.45) !important;
  color: #0f2e1f !important;
  box-shadow: 0 4px 12px rgba(4, 18, 12, 0.15) !important;
}

.machinery-management-page:not(.light-theme) .machinery-inventory-btn:hover {
  background: #ecfdf5 !important;
  border-color: rgba(110, 231, 168, 0.55) !important;
  color: #0f2e1f !important;
}

.machinery-management-page:not(.light-theme) :is(.page-title, .section-title, .stat-value) {
  color: #ecfdf5 !important;
}

.machinery-management-page:not(.light-theme) :is(.page-subtitle, .stat-label, .filter-label, .form-label) {
  color: #b8dcc6 !important;
}

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
.machinery-management-page.light-theme {
  --surface-1: #ffffff;
  --surface-2: #f8fdf9;
  --surface-3: #ffffff;
  --line-soft: #bbf7d0;
  --line-strong: #86efac;
  --text-main: #052e16;
  --text-muted: #166534;
  --text-soft: #15803d;
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
}

.machinery-management-page.light-theme::before,
.machinery-management-page.light-theme::after {
  background: none !important;
}

.machinery-management-page.light-theme :is(.page-header, .section) {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.machinery-management-page.light-theme .page-title {
  color: #052e16 !important;
  text-shadow: none !important;
}

.machinery-management-page.light-theme .page-subtitle,
.machinery-management-page.light-theme .section-title {
  color: #166534 !important;
}

.machinery-management-page.light-theme .stat-card {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.machinery-management-page.light-theme .stat-card::after {
  display: none;
}

.machinery-management-page.light-theme :is(.stat-value, .stat-label) {
  color: #052e16 !important;
}

.machinery-management-page.light-theme .stat-label {
  color: #166534 !important;
}

.machinery-management-page.light-theme .filters-section {
  background: #f0fdf4 !important;
  border: 2px solid #bbf7d0 !important;
  box-shadow: none !important;
}

.machinery-management-page.light-theme .filter-label,
.machinery-management-page.light-theme .form-label {
  color: #052e16 !important;
  font-size: 14px !important;
  font-weight: 800 !important;
}

.machinery-management-page.light-theme :is(.filter-select, .form-input, .form-select, .inv2-search-input, .inv2-select) {
  background: #ffffff !important;
  border: 1.5px solid #94a3b8 !important;
  color: #000000 !important;
  font-size: 16px !important;
  box-shadow: none !important;
}

.machinery-management-page.light-theme :is(.filter-select option, .form-input option) {
  background: #ffffff !important;
  color: #052e16 !important;
}

.machinery-management-page.light-theme :is(.table-container, .inventory-table-container, .inv2-table-wrap) {
  background: #ffffff !important;
  border: 2px solid #94a3b8 !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.machinery-management-page.light-theme :is(.bookings-table th, .inventory-table th, .inv2-table th) {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #000000 !important;
  border-bottom: 2px solid #16a34a !important;
}

.machinery-management-page.light-theme :is(.bookings-table th, .inventory-table th, .inv2-table th):not(:last-child),
.machinery-management-page.light-theme :is(.bookings-table td, .inventory-table td, .inv2-table td):not(:last-child) {
  border-right: 1.5px solid #94a3b8 !important;
}

.machinery-management-page.light-theme :is(.bookings-table td, .inventory-table td, .inv2-table td) {
  color: #000000 !important;
  border-bottom: 1.5px solid #94a3b8 !important;
  background: #ffffff !important;
}

.machinery-management-page.light-theme :is(.bookings-table tbody tr:nth-child(even) td, .inventory-table tbody tr:nth-child(even) td) {
  background: #f8fdf9 !important;
}

.machinery-management-page.light-theme :is(.bookings-table tbody tr:hover, .inventory-table tbody tr:hover, .inv2-row:hover td) {
  background: #ecfdf5 !important;
}

.machinery-management-page.light-theme :is(.loading-cell, .empty-cell) {
  color: #166534 !important;
}

.machinery-management-page.light-theme :is(.price-cell, .price-value) {
  color: #15803d !important;
}

.machinery-management-page.light-theme .price-label {
  color: #166534 !important;
}

.machinery-management-page.light-theme .badge-primary {
  background: #dbeafe !important;
  color: #1e40af !important;
  border-color: #93c5fd !important;
}

.machinery-management-page.light-theme .badge-warning {
  background: #fef9c3 !important;
  color: #92400e !important;
  border-color: #ca8a04 !important;
}

.machinery-management-page.light-theme .badge-info {
  background: #e0e7ff !important;
  color: #3730a3 !important;
  border-color: #a5b4fc !important;
}

.machinery-management-page.light-theme .badge-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
}

.machinery-management-page.light-theme .badge-default {
  background: #f1f5f9 !important;
  color: #334155 !important;
  border-color: #cbd5e1 !important;
}

.machinery-management-page.light-theme .status-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
}

.machinery-management-page.light-theme .status-info {
  background: #dbeafe !important;
  color: #1e40af !important;
  border-color: #93c5fd !important;
}

.machinery-management-page.light-theme .status-warning {
  background: #fef9c3 !important;
  color: #92400e !important;
  border-color: #ca8a04 !important;
}

.machinery-management-page.light-theme .status-danger {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #dc2626 !important;
}

.machinery-management-page.light-theme .status-default {
  background: #f1f5f9 !important;
  color: #334155 !important;
  border-color: #cbd5e1 !important;
}

.machinery-management-page.light-theme .barangay-badge {
  background: #dbeafe !important;
  color: #1e40af !important;
  border-color: #93c5fd !important;
}

.machinery-management-page.light-theme :is(.btn-icon-small, .btn-sm) {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme :is(.btn-icon-small:hover, .btn-sm:hover) {
  background: #dcfce7 !important;
  border-color: #16a34a !important;
}

.machinery-management-page.light-theme :is(.btn-icon-small.btn-danger, .btn-sm.btn-danger) {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

.machinery-management-page.light-theme .booking-view-btn {
  background: #dbeafe !important;
  border-color: #93c5fd !important;
  color: #1e40af !important;
}

.machinery-management-page.light-theme .btn-secondary {
  background: #ffffff !important;
  color: #166534 !important;
  border: 1.5px solid #86efac !important;
}

.machinery-management-page.light-theme .modal-overlay {
  background: rgba(5, 46, 22, 0.35) !important;
}

.machinery-management-page.light-theme :is(.modal-content, .inv2-modal) {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  color: #052e16 !important;
  box-shadow: 0 16px 40px rgba(22, 101, 52, 0.15) !important;
}

.machinery-management-page.light-theme .modal-header {
  border-bottom: 1px solid #e2e8f0 !important;
}

.machinery-management-page.light-theme .modal-header h2,
.machinery-management-page.light-theme .inv2-title {
  color: #052e16 !important;
}

.machinery-management-page.light-theme .inv2-panel {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.08);
}

.machinery-management-page.light-theme .inv2-card-barangay {
  color: #166534;
}

.machinery-management-page.light-theme .inv2-subtitle {
  color: #166534 !important;
}

.machinery-management-page.light-theme .modal-close {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme :is(.inv2-toolbar) {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
}

.machinery-management-page.light-theme .inv2-card {
  background: #ffffff !important;
  border: 2px solid #bbf7d0 !important;
}

.machinery-management-page.light-theme :is(.inv2-price-main, .inv2-price-member, .inv2-price-nonmember, .price-highlight) {
  color: #15803d !important;
}

.machinery-management-page.light-theme .inv2-card-price-label {
  color: #166534 !important;
}

/* Machinery Inventory modal (inv2) — readable table & toolbar text */
.machinery-management-page.light-theme :is(.inv2-name, .inv2-card-name) {
  color: #052e16 !important;
}

.machinery-management-page.light-theme :is(.inv2-cap, .inv2-card-cap) {
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-na {
  color: #64748b !important;
}

.machinery-management-page.light-theme .inv2-interest {
  color: #166534 !important;
}

.machinery-management-page.light-theme .operator-assigned__name {
  color: #052e16 !important;
}

.machinery-management-page.light-theme .operator-assigned__date {
  color: #64748b !important;
}

.machinery-management-page.light-theme .inv2-unit {
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-price-nonmember {
  color: #c2410c !important;
}

.machinery-management-page.light-theme .inv2-row-a td {
  background: #ffffff !important;
}

.machinery-management-page.light-theme .inv2-table-wrap {
  background: #ffffff !important;
  border: 2px solid #94a3b8 !important;
  scrollbar-color: #64748b #f1f5f9;
}

.machinery-management-page.light-theme .inv2-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  color: #000000 !important;
  border-bottom: 2px solid #16a34a !important;
}

.machinery-management-page.light-theme .inv2-table th:not(:last-child),
.machinery-management-page.light-theme .inv2-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8 !important;
}

.machinery-management-page.light-theme .inv2-table td {
  color: #000000 !important;
  border-bottom: 1.5px solid #94a3b8 !important;
  background: #ffffff !important;
}

.machinery-management-page.light-theme .inv2-row-b td {
  background: #f8fdf9 !important;
}

.machinery-management-page.light-theme .inv2-header {
  border-bottom: 1px solid #e2e8f0 !important;
}

.machinery-management-page.light-theme .inv2-header-icon {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}

.machinery-management-page.light-theme .inv2-search-ico {
  color: #15803d !important;
}

.machinery-management-page.light-theme .inv2-search-input::placeholder {
  color: #64748b !important;
}

.machinery-management-page.light-theme .inv2-select option {
  background: #ffffff !important;
  color: #052e16 !important;
}

.machinery-management-page.light-theme .inv2-view-toggle {
  background: #ffffff !important;
  border: 1px solid #bbf7d0 !important;
}

.machinery-management-page.light-theme .inv2-view-btn {
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-view-btn.active {
  background: #dcfce7 !important;
  color: #15803d !important;
}

.machinery-management-page.light-theme .inv2-view-btn:hover:not(.active) {
  background: #f0fdf4 !important;
  color: #052e16 !important;
}

.machinery-management-page.light-theme .inv2-close {
  background: #ffffff !important;
  border: 1px solid #bbf7d0 !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-close:hover {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

.machinery-management-page.light-theme .tools-chips {
  background: transparent !important;
  border: none !important;
  border-top: 1px solid #bbf7d0 !important;
}

.machinery-management-page.light-theme .tools-chips .inv2-chip {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme .tools-chips .inv2-chip-x {
  background: transparent !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme .tools-chips .inv2-clear-all {
  background: transparent !important;
  border: none !important;
  color: #15803d !important;
  box-shadow: none !important;
}

.machinery-management-page.light-theme .inv2-clear-all:hover {
  background: transparent !important;
  color: #052e16 !important;
}

.machinery-management-page.light-theme .inv2-empty {
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-pg-btn {
  background: #ffffff !important;
  border: 1px solid #bbf7d0 !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-pg-info {
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-machine-icon {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #15803d !important;
}

.machinery-management-page.light-theme .inv2-btn-edit {
  background: #dbeafe !important;
  color: #1e40af !important;
  border-color: #93c5fd !important;
}

.machinery-management-page.light-theme .inv2-btn-del {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #fca5a5 !important;
}

.machinery-management-page.light-theme .inv2-card-img {
  background: linear-gradient(135deg, #ecfdf5, #dcfce7) !important;
}

.machinery-management-page.light-theme .inv2-card-img-fallback {
  color: #86efac !important;
}

.machinery-management-page.light-theme :is(.detail-section, .empty-state, .picture-upload-section, .picture-preview) {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
  color: #14532d !important;
}

.machinery-management-page.light-theme .machinery-inventory-btn {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  border: 2px solid #14532d !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.28) !important;
  filter: none !important;
  font-size: 1rem !important;
  font-weight: 700 !important;
}

.machinery-management-page.light-theme .machinery-inventory-btn:hover {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  filter: none !important;
}

.machinery-management-page.light-theme .btn-inventory-add {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  border: 2px solid #14532d !important;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.22) !important;
}

.machinery-management-page.light-theme .btn-inventory-add:hover {
  background: linear-gradient(135deg, #15803d 0%, #166534 100%) !important;
  filter: none !important;
}

.machinery-management-page.light-theme .modal-delete .delete-confirm-message {
  color: #166534 !important;
}

.machinery-management-page.light-theme .modal-delete .delete-warning-text {
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

.machinery-management-page.light-theme .modal-delete .delete-modal-footer {
  background: #f8fafc !important;
  border-top-color: #e2e8f0 !important;
}

.machinery-management-page.light-theme .modal-delete .btn-secondary {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  background: #ffffff !important;
  border: 2px solid #cbd5e1 !important;
}

.machinery-management-page.light-theme .modal-delete .btn-delete-confirm {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
  border-color: #b91c1c !important;
}

.machinery-management-page.light-theme :is(.bookings-table th, .inventory-table th, .inv2-table th) {
  color: #000000 !important;
  font-size: 1rem !important;
}

.machinery-management-page.light-theme :is(.bookings-table td, .inventory-table td, .inv2-table td) {
  color: #000000 !important;
  font-size: 1.125rem !important;
}

.machinery-management-page.light-theme .inventory-table td:first-child,
.machinery-management-page.light-theme .inventory-table .capacity-cell {
  color: #000000 !important;
  font-weight: 700 !important;
}

.machinery-management-page.light-theme .price-block {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
}

.machinery-management-page.light-theme .price-block-label {
  color: #166534 !important;
}

.machinery-management-page.light-theme .price-block-value {
  color: #15803d !important;
}

.machinery-management-page.light-theme .price-block-value small {
  color: #374151 !important;
}

.machinery-management-page.light-theme .price-block-member {
  border-left-color: #16a34a !important;
}

.machinery-management-page.light-theme .price-block-nonmember {
  border-left-color: #2563eb !important;
}

/* Modal form — high-contrast text for light mode */
.machinery-management-page.light-theme .barangay-assignment-group,
.machinery-management-page.light-theme .machinery-form-section {
  background: #f8fdf9 !important;
  border: 2px solid #bbf7d0 !important;
}

.machinery-management-page.light-theme .machinery-form-section-title {
  color: #052e16 !important;
}

.machinery-management-page.light-theme .machinery-form-section-desc {
  color: #166534 !important;
}

.machinery-management-page.light-theme .form-hint,
.machinery-management-page.light-theme .barangay-hint,
.machinery-management-page.light-theme .barangay-read-only .form-hint {
  color: #166534 !important;
}

.machinery-management-page.light-theme .barangay-selected {
  color: #15803d !important;
}

.machinery-management-page.light-theme .barangay-read-only {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #15803d !important;
}

.machinery-management-page.light-theme .barangay-read-only .barangay-info {
  color: #052e16 !important;
}

.machinery-management-page.light-theme .barangay-select-emphasized {
  border-color: #94a3b8 !important;
  background: #ffffff !important;
  color: #052e16 !important;
}

.machinery-management-page.light-theme .barangay-select-emphasized:focus {
  border-color: #16a34a !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.2) !important;
}

.machinery-management-page.light-theme .warning-text {
  color: #991b1b !important;
}

.machinery-management-page.light-theme .detail-item label {
  color: #166534 !important;
}

.machinery-management-page.light-theme .detail-section h3 {
  color: #052e16 !important;
}

.machinery-management-page.light-theme .notes-text {
  color: #14532d !important;
  background: #f8fdf9 !important;
}

.machinery-management-page.light-theme textarea.form-input {
  background: #ffffff !important;
  color: #052e16 !important;
}

.machinery-management-page.light-theme .picture-upload-section {
  background: #f8fdf9 !important;
  border: 2px dashed #86efac !important;
}

.machinery-management-page.light-theme .picture-preview {
  background: #ffffff !important;
  border: 1px solid #bbf7d0 !important;
}

.machinery-management-page.light-theme .picture-placeholder {
  color: #166534 !important;
}

.machinery-management-page.light-theme .alert-warning {
  background: #fef9c3 !important;
  color: #92400e !important;
  border-left: 4px solid #ca8a04 !important;
  box-shadow: 0 8px 24px rgba(146, 64, 14, 0.15) !important;
}

.machinery-management-page.light-theme .alert-error {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-left: 4px solid #dc2626 !important;
  box-shadow: 0 8px 24px rgba(153, 27, 27, 0.15) !important;
}

.machinery-management-page.light-theme .alert-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-left: 4px solid #16a34a !important;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.12) !important;
}

.alert-center-stack.light-theme .alert-warning {
  background: #fef9c3 !important;
  color: #92400e !important;
  border-left: 4px solid #ca8a04 !important;
  box-shadow: 0 8px 24px rgba(146, 64, 14, 0.15) !important;
}

.alert-center-stack.light-theme .alert-error {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-left: 4px solid #dc2626 !important;
  box-shadow: 0 8px 24px rgba(153, 27, 27, 0.15) !important;
}

.alert-center-stack.light-theme .alert-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-left: 4px solid #16a34a !important;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.12) !important;
}

.inv2-modal {
  position: relative;
}

/* ===== Teleported modals (view booking / assign operator / delete) — light theme ===== */
.modal-overlay.machinery-ui.light-theme {
  --surface-1: #ffffff;
  --surface-2: #f8fdf9;
  --surface-3: #ffffff;
  --line-soft: #bbf7d0;
  --line-strong: #86efac;
  --text-main: #052e16;
  --text-muted: #166534;
  --text-soft: #15803d;
  background: rgba(15, 23, 42, 0.48) !important;
}

.modal-overlay.machinery-ui.light-theme .modal-content {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
  color: #052e16 !important;
  box-shadow: 0 16px 40px rgba(22, 101, 52, 0.15) !important;
}

.modal-overlay.machinery-ui.light-theme .modal-header {
  background: #ffffff !important;
  border-bottom: 1px solid #e2e8f0 !important;
}

.modal-overlay.machinery-ui.light-theme .modal-header h2 {
  color: #052e16 !important;
}

.modal-overlay.machinery-ui.light-theme :is(.modal-close, .close-btn) {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #166534 !important;
}

.modal-overlay.machinery-ui.light-theme :is(.modal-footer, .delete-modal-footer) {
  background: #f8fafc !important;
  border-top: 1px solid #e2e8f0 !important;
}

.modal-overlay.machinery-ui.light-theme .btn-secondary {
  background: #ffffff !important;
  color: #166534 !important;
  border: 1.5px solid #86efac !important;
}

.modal-overlay.machinery-ui.light-theme .modal-subtitle {
  color: #166534 !important;
}

.modal-overlay.machinery-ui.light-theme .form-group label {
  color: #052e16 !important;
}

.modal-overlay.machinery-ui.light-theme .modal-content .form-input {
  background: #ffffff !important;
  border: 1.5px solid #94a3b8 !important;
  color: #052e16 !important;
}

.modal-overlay.machinery-ui.light-theme .form-input option {
  background: #ffffff;
  color: #052e16;
}

.modal-overlay.machinery-ui.light-theme :is(.detail-section, .empty-state) {
  background: #f8fdf9 !important;
  border-color: #bbf7d0 !important;
  color: #14532d !important;
}

.modal-overlay.machinery-ui.light-theme .detail-section h3 {
  color: #052e16 !important;
}

.modal-overlay.machinery-ui.light-theme .detail-item label {
  color: #166534 !important;
}

.modal-overlay.machinery-ui.light-theme .price-highlight {
  color: #15803d !important;
}

.modal-overlay.machinery-ui.light-theme .notes-text {
  color: #14532d !important;
  background: #f8fdf9 !important;
}

.modal-overlay.machinery-ui.light-theme .delete-confirm-message {
  color: #166534 !important;
}

.modal-overlay.machinery-ui.light-theme .delete-warning-text {
  background: #fef2f2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

.modal-overlay.machinery-ui.light-theme .badge-primary {
  background: #dbeafe !important;
  color: #1e40af !important;
  border-color: #93c5fd !important;
}

.modal-overlay.machinery-ui.light-theme .badge-warning {
  background: #fef9c3 !important;
  color: #92400e !important;
  border-color: #ca8a04 !important;
}

.modal-overlay.machinery-ui.light-theme .badge-info {
  background: #e0e7ff !important;
  color: #3730a3 !important;
  border-color: #a5b4fc !important;
}

.modal-overlay.machinery-ui.light-theme .badge-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
}

.modal-overlay.machinery-ui.light-theme .badge-default {
  background: #f1f5f9 !important;
  color: #334155 !important;
  border-color: #cbd5e1 !important;
}

.modal-overlay.machinery-ui.light-theme .status-success {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #16a34a !important;
}

.modal-overlay.machinery-ui.light-theme .status-info {
  background: #dbeafe !important;
  color: #1e40af !important;
  border-color: #93c5fd !important;
}

.modal-overlay.machinery-ui.light-theme .status-warning {
  background: #fef9c3 !important;
  color: #92400e !important;
  border-color: #ca8a04 !important;
}

.modal-overlay.machinery-ui.light-theme .status-danger {
  background: #fee2e2 !important;
  color: #991b1b !important;
  border-color: #dc2626 !important;
}

.modal-overlay.machinery-ui.light-theme .status-default {
  background: #f1f5f9 !important;
  color: #334155 !important;
  border-color: #cbd5e1 !important;
}

</style>

<style>
/* Teleported Add/Edit modal — Barangays-parity chrome */
.machinery-modal-overlay.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10050 !important;
  background: rgba(6, 12, 9, 0.62) !important;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
}

.machinery-ui.light-theme.machinery-modal-overlay.modal-overlay {
  background: rgba(15, 23, 42, 0.48) !important;
}

.machinery-edit-modal.modal-content {
  background: rgba(28, 42, 33, 0.96) !important;
  border: 1px solid rgba(190, 235, 203, 0.14) !important;
  color: #eefde6 !important;
}

.machinery-ui.light-theme .machinery-edit-modal.modal-content {
  background: #fffef9 !important;
  border-color: #86efac !important;
  color: #052e16 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .modal-header,
.machinery-ui.light-theme .machinery-edit-modal .modal-footer {
  background: #fffef9 !important;
  border-color: #bbf7d0 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .modal-header h2,
.machinery-ui.light-theme .machinery-edit-modal .form-label {
  color: #052e16 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .close-btn {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .form-input {
  background: #ffffff !important;
  border-color: #86efac !important;
  color: #052e16 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .machinery-form-section {
  background: #f0fdf4 !important;
  border-color: #bbf7d0 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .machinery-form-section-title {
  color: #166534 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .btn-submit {
  color: #ffffff !important;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  border-color: #14532d !important;
}

.machinery-ui.light-theme .machinery-edit-modal .btn-secondary {
  background: #ffffff !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

.machinery-ui.light-theme .machinery-edit-modal .price-input-prefix {
  color: #64748b !important;
}

.page-container.machinery-management-page.machinery-ui.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%) !important;
  color: #052e16 !important;
}

.machinery-ui.light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #86efac !important;
}

.machinery-ui.light-theme .page-title {
  color: #052e16 !important;
}

.machinery-ui.light-theme .page-subtitle {
  color: #166534 !important;
}

.machinery-ui.light-theme .btn-header-add {
  color: #ffffff !important;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%) !important;
  border-color: #14532d !important;
}

.machinery-ui.light-theme .tools-card,
.machinery-ui.light-theme .card,
.machinery-ui.light-theme .inv2-data-card {
  background: #ffffff !important;
  border-color: #86efac !important;
}

.machinery-ui.light-theme .toolbar-input,
.machinery-ui.light-theme .toolbar-select {
  background: #ffffff !important;
  border-color: #86efac !important;
  color: #052e16 !important;
}

.machinery-ui.light-theme .inv2-record-count {
  color: #166534 !important;
}
</style>