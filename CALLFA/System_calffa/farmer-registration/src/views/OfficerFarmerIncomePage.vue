<template>
  <div class="page-container income-hub-subpage" :class="{ 'light-theme': isLight }">
    <div class="page-header">
      <h1 class="page-title">
        <span class="title-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="8" y1="13" x2="16" y2="13" />
            <line x1="8" y1="17" x2="16" y2="17" />
            <line x1="8" y1="9" x2="10" y2="9" />
          </svg>
        </span>
        Talaan ng Kita ng mga Magsasaka
      </h1>
      <p class="page-subtitle">Suriin ang mga naitatalang kita mula sa mga magsasaka sa iyong barangay</p>
    </div>

    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button 
        class="tab-btn" 
        :class="{ active: activeTab === 'records' }"
        @click="activeTab = 'records'"
      >
        <span class="tab-btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
            <rect x="9" y="3" width="6" height="4" rx="1" />
            <path d="M9 12h6M9 16h6" />
          </svg>
        </span>
        Mga Talaan
      </button>
    </div>

    <!-- Error Message -->
    <div v-if="errorMessage" class="alert alert-error">
      <span>{{ errorMessage }}</span>
      <button class="alert-close" @click="errorMessage = ''">&times;</button>
    </div>

    <!-- Success Message -->
    <div v-if="successMessage" class="alert alert-success">
      <span>{{ successMessage }}</span>
      <button class="alert-close" @click="successMessage = ''">&times;</button>
    </div>

    <!-- No barangay warning -->
    <div v-if="!currentUser?.barangay_id" class="alert alert-warning">
      Hindi ka naka-assign sa anumang barangay. Makipag-ugnayan sa admin.
    </div>

    <!-- TAB 1: INCOME RECORDS -->
    <template v-if="activeTab === 'records'">
      <!-- Search / Filter -->
      <div class="filter-bar" v-if="records.length > 0">
        <div class="search-box">
          <span class="search-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </span>
          <input
            type="text"
            v-model="searchQuery"
            placeholder="Hanapin ayon sa pangalan ng magsasaka..."
            class="search-input"
          />
        </div>
        <p v-if="filteredRecords.length > 0" class="results-count">
          {{ filteredRecords.length }} {{ filteredRecords.length === 1 ? 'talaan' : 'mga talaan' }}
        </p>
      </div>

      <!-- Loading -->
      <div v-if="loading" class="loading-state">
        <div class="spinner"></div>
        <p>Kinukuha ang mga talaan...</p>
      </div>

      <!-- Empty State -->
      <div v-else-if="records.length === 0 && currentUser?.barangay_id" class="empty-state">
        <div class="empty-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
            <path d="M22 12h-6l-2 3H10l-2-3H4" />
            <path d="M5.45 5.11L2 12v6a2 2 0 002 2h16a2 2 0 002-2v-6l-3.45-6.89A2 2 0 0016.76 4H7.24a2 2 0 00-1.79 1.11z" />
          </svg>
        </div>
        <p>Wala pang naitatalang kita mula sa mga magsasaka sa iyong barangay.</p>
      </div>

      <!-- Records List -->
      <div v-else class="records-list">
        <div v-if="filteredRecords.length === 0 && searchQuery.trim()" class="empty-state empty-state--search" aria-label="Walang tumugmang talaan">
          <div class="empty-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
              <circle cx="11" cy="11" r="7" />
              <path d="M21 21l-4.35-4.35" />
            </svg>
          </div>
        </div>
        <div
          v-for="record in filteredRecords"
          :key="record.id"
          class="record-card"
        >
          <div class="record-header">
            <div class="farmer-info">
              <span class="farmer-name">
                <span class="inline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                {{ record.farmer_name }}
              </span>
              <span class="record-date">
                <span class="inline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" />
                    <path d="M16 2v4M8 2v4M3 10h18" />
                  </svg>
                </span>
                {{ formatDate(record.created_at) }}
              </span>
            </div>
            <div class="header-actions">
              <span class="status-badge" :class="'status-' + getStatusClass(record.status)">
                {{ record.status }}
              </span>
              <button class="view-btn" @click="openRecordDetail(record)">
                <span class="inline-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </span>
                Tingnan
              </button>
            </div>
          </div>
          <div class="record-details">
            <div class="record-detail">
              <span class="detail-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                  <polyline points="9 22 9 12 15 12 15 22" />
                </svg>
              </span>
              <span class="detail-label">Lawak:</span>
              <span>{{ record.area_hectares }} ektarya</span>
            </div>
          </div>
          <div class="record-financials">
            <div class="financial-stat income">
              <div class="fin-stat-head">
                <span class="fin-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
                    <polyline points="17 6 23 6 23 12" />
                  </svg>
                </span>
                <span class="fin-stat-label">Benta</span>
              </div>
              <span class="fin-stat-value">₱{{ parseFloat(record.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="financial-stat expense">
              <div class="fin-stat-head">
                <span class="fin-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <polyline points="23 18 13.5 8.5 8.5 13.5 1 6" />
                    <polyline points="17 18 23 18 23 12" />
                  </svg>
                </span>
                <span class="fin-stat-label">Gastos</span>
              </div>
              <span class="fin-stat-value">₱{{ parseFloat(record.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
            <div class="financial-stat" :class="parseFloat(record.net_income || 0) >= 0 ? 'profit' : 'loss'">
              <div class="fin-stat-head">
                <span class="fin-stat-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </span>
                <span class="fin-stat-label">Net</span>
              </div>
              <span class="fin-stat-value">₱{{ parseFloat(record.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
            </div>
          </div>
        </div>
      </div>
    </template>

    <!-- VIEW DETAIL MODAL - RECORD -->
    <Teleport to="body">
      <div v-if="showDetailModal" class="modal-overlay farmer-income-hub-modal" :class="{ 'light-theme': isLight }" @click.self="closeDetailModal">
        <div class="modal-container">
          <div class="modal-header">
            <div class="modal-title-with-status">
              <h2>
                <span class="modal-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2" />
                    <rect x="9" y="3" width="6" height="4" rx="1" />
                    <path d="M9 12h6M9 16h6" />
                  </svg>
                </span>
                Buong Detalye ng Talaan
              </h2>
              <span class="modal-status-badge" :class="'status-' + getStatusClass(selectedRecord.status)">
                {{ selectedRecord.status }}
              </span>
            </div>
            <button class="modal-close" @click="closeDetailModal">&times;</button>
          </div>
          <div class="modal-body" v-if="selectedRecord">

            <!-- Farmer Name Banner -->
            <div class="farmer-banner">
              <span class="banner-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                  <circle cx="12" cy="7" r="4" />
                </svg>
              </span>
              <span class="banner-name">{{ selectedRecord.farmer_name }}</span>
            </div>

            <!-- Farm Info -->
            <div class="detail-section">
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22V12" />
                    <path d="M12 12C12 8 8 4 4 4c0 4 4 8 8 8" />
                    <path d="M12 12c0-4 4-8 8-8 0 4-4 8-8 8" />
                  </svg>
                </span>
                Detalye ng Taniman
              </h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">Petsa ng Talaan</span>
                  <span class="cell-value">{{ formatDate(selectedRecord.created_at) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Lawak (Ektarya)</span>
                  <span class="cell-value">{{ selectedRecord.area_hectares }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Paraan ng Pagtatanim</span>
                  <span class="cell-value">{{ selectedRecord.planting_method === 'sabog' ? 'Sabog' : 'Talok' }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Patubig</span>
                  <span class="cell-value">{{ formatIrrigation(selectedRecord.irrigation_type) }}</span>
                </div>
              </div>
            </div>

            <!-- Fertilizers -->
            <div class="detail-section" v-if="selectedRecord.fertilizers && selectedRecord.fertilizers.length > 0">
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 2v6l-2 2v12a2 2 0 002 2h4a2 2 0 002-2V10l-2-2V2" />
                    <path d="M8 2h8" />
                    <path d="M12 10v4" />
                  </svg>
                </span>
                Mga Ginamit na Abono
              </h3>
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Klase</th>
                    <th>Sako</th>
                    <th>Presyo/Sako</th>
                    <th>Kabuuan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="f in selectedRecord.fertilizers" :key="f.id">
                    <td>{{ f.fertilizer_type }}</td>
                    <td>{{ f.sacks }}</td>
                    <td>₱{{ parseFloat(f.price_per_sack || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td class="amt">₱{{ parseFloat(f.line_total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="foot-label">Kabuuang Abono:</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_fertilizer_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="detail-section" v-else>
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M10 2v6l-2 2v12a2 2 0 002 2h4a2 2 0 002-2V10l-2-2V2" />
                    <path d="M8 2h8" />
                    <path d="M12 10v4" />
                  </svg>
                </span>
                Mga Ginamit na Abono
              </h3>
              <p class="no-data">Walang naitalang abono.</p>
            </div>

            <!-- Pesticides -->
            <div class="detail-section" v-if="selectedRecord.pesticides && selectedRecord.pesticides.length > 0">
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 2h6l1 7H8L9 2z" />
                    <path d="M12 9v13" />
                    <path d="M8 22h8" />
                  </svg>
                </span>
                Mga Ginamit na Lason
              </h3>
              <table class="detail-table">
                <thead>
                  <tr>
                    <th>Klase</th>
                    <th>Bilang</th>
                    <th>Presyo/Unit</th>
                    <th>Kabuuan</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="p in selectedRecord.pesticides" :key="p.id">
                    <td>{{ p.pesticide_type }}</td>
                    <td>{{ p.quantity }}</td>
                    <td>₱{{ parseFloat(p.price_per_unit || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                    <td class="amt">₱{{ parseFloat(p.line_total || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tbody>
                <tfoot>
                  <tr>
                    <td colspan="3" class="foot-label">Kabuuang Lason:</td>
                    <td class="foot-value">₱{{ parseFloat(selectedRecord.total_pesticide_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
            <div class="detail-section" v-else>
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M9 2h6l1 7H8L9 2z" />
                    <path d="M12 9v13" />
                    <path d="M8 22h8" />
                  </svg>
                </span>
                Mga Ginamit na Lason
              </h3>
              <p class="no-data">Walang naitalang lason.</p>
            </div>

            <!-- Labor & Expenses -->
            <div class="detail-section">
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                    <circle cx="9" cy="7" r="4" />
                    <path d="M22 21v-2a4 4 0 00-3-3.87" />
                    <path d="M16 3.13a4 4 0 010 7.75" />
                  </svg>
                </span>
                Gastos sa Labor at Iba Pa
              </h3>
              <div class="expense-grid">
                <div class="expense-row">
                  <span>Paghahanda ng Lupa</span>
                  <span>₱{{ parseFloat(selectedRecord.land_preparation_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bunot / Talok / Hasik</span>
                  <span>₱{{ parseFloat(selectedRecord.planting_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Pagspray / Pagsabog ng Abono</span>
                  <span>₱{{ parseFloat(selectedRecord.spraying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Harvester</span>
                  <span>₱{{ parseFloat(selectedRecord.harvester_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Pagbibilad</span>
                  <span>₱{{ parseFloat(selectedRecord.drying_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Bayad sa Paghakot</span>
                  <span>₱{{ parseFloat(selectedRecord.hauling_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Tarasko</span>
                  <span>₱{{ parseFloat(selectedRecord.tarasko_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Krudo</span>
                  <span>₱{{ parseFloat(selectedRecord.fuel_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row">
                  <span>Iba Pang Gastos</span>
                  <span>₱{{ parseFloat(selectedRecord.other_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="expense-row total-row">
                  <span>Kabuuang Labor:</span>
                  <span>₱{{ parseFloat(selectedRecord.total_labor_cost || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

            <!-- Harvest -->
            <div class="detail-section">
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 22V12" />
                    <path d="M12 12C12 8 8 4 4 4c0 4 4 8 8 8" />
                    <path d="M12 12c0-4 4-8 8-8 0 4-4 8-8 8" />
                    <path d="M12 12v10" />
                  </svg>
                </span>
                Ani
              </h3>
              <div class="detail-grid">
                <div class="detail-cell">
                  <span class="cell-label">Sako na Naani</span>
                  <span class="cell-value">{{ selectedRecord.sacks_harvested }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Kilo Kada Sako</span>
                  <span class="cell-value">{{ selectedRecord.kg_per_sack }} kg</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Presyo Kada Kilo</span>
                  <span class="cell-value">₱{{ parseFloat(selectedRecord.price_per_kg || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="detail-cell">
                  <span class="cell-label">Kabuuang Ani</span>
                  <span class="cell-value">{{ (parseFloat(selectedRecord.sacks_harvested || 0) * parseFloat(selectedRecord.kg_per_sack || 0)).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }} kg</span>
                </div>
              </div>
            </div>

            <!-- Grand Summary -->
            <div class="detail-section summary-detail-section">
              <h3 class="detail-section-title">
                <span class="section-title-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <line x1="18" y1="20" x2="18" y2="10" />
                    <line x1="12" y1="20" x2="12" y2="4" />
                    <line x1="6" y1="20" x2="6" y2="14" />
                  </svg>
                </span>
                Buod
              </h3>
              <div class="grand-summary">
                <div class="grand-row income-row">
                  <span>Kabuuang Benta</span>
                  <span>₱{{ parseFloat(selectedRecord.gross_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row expense-summary-row">
                  <span>Kabuuang Gastos</span>
                  <span>₱{{ parseFloat(selectedRecord.total_expenses || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
                <div class="grand-row" :class="parseFloat(selectedRecord.net_income || 0) >= 0 ? 'net-profit-row' : 'net-loss-row'">
                  <span>Netong Kita</span>
                  <span>₱{{ parseFloat(selectedRecord.net_income || 0).toLocaleString('en-PH', { minimumFractionDigits: 2 }) }}</span>
                </div>
              </div>
            </div>

          </div>
          <div class="modal-footer">
            <button class="btn-close-modal" @click="closeDetailModal">Isara</button>
          </div>
        </div>
      </div>
    </Teleport>


  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const authStore = useAuthStore()
const currentUser = computed(() => authStore.currentUser)

// Refs
const activeTab = ref('records')
const errorMessage = ref('')
const successMessage = ref('')
const loading = ref(false)
const records = ref([])
const searchQuery = ref('')
const showDetailModal = ref(false)
const selectedRecord = ref(null)



// Filter
const filteredRecords = computed(() => {
  // Only show eligible records
  const eligible = records.value.filter(r => r.status === 'Eligible')
  if (!searchQuery.value.trim()) return eligible
  const q = searchQuery.value.toLowerCase()
  return eligible.filter(r =>
    (r.farmer_name || '').toLowerCase().includes(q)
  )
})



// Fetch records by barangay
const fetchRecords = async () => {
  if (!currentUser.value?.barangay_id) return
  loading.value = true
  errorMessage.value = ''
  try {
    const res = await fetch(`/api/farmer-income/by-barangay/${currentUser.value.barangay_id}`, {
      headers: {
        'Authorization': `Bearer ${authStore.token}`
      }
    })
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi makuha ang mga talaan.')
    records.value = data
  } catch (err) {
    errorMessage.value = err.message
  } finally {
    loading.value = false
  }
}



// Modal functions
const openRecordDetail = (record) => {
  selectedRecord.value = record
  showDetailModal.value = true
}
const closeDetailModal = () => {
  showDetailModal.value = false
  selectedRecord.value = null
}



// Helper functions
const formatDate = (dateStr) => {
  return new Date(dateStr).toLocaleDateString('fil-PH', {
    year: 'numeric', month: 'long', day: 'numeric'
  })
}

const formatIrrigation = (type) => {
  const map = {
    'NIA': 'NIA',
    'bugsok_waterpump': 'Bugsok na Waterpump',
    'waterpump_irrigation': 'Waterpump na Nakalawit sa Irrigation',
    'waterpump_ilog': 'Waterpump na Nakalawit sa Ilog'
  }
  return map[type] || type
}

const getStatusClass = (status) => {
  const map = {
    'Submitted': 'submitted',
    'Under Review': 'review',
    'Eligible': 'eligible',
    'Upcoming Assistance': 'upcoming',
    'Received': 'received'
  }
  return map[status] || 'default'
}



onMounted(() => {
  fetchRecords()
})
</script>

<style scoped>
.page-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 1rem;
}

.page-header {
  margin-bottom: 1.5rem;
}

.page-title {
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 1.75rem;
  font-weight: 700;
  color: #166534;
  margin: 0 0 0.25rem 0;
}

.title-icon {
  width: 2.4rem;
  height: 2.4rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.22), rgba(34, 197, 94, 0.14));
  border: 1px solid rgba(134, 239, 172, 0.35);
  color: #86efac;
}

.title-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.inline-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.inline-icon svg {
  width: 0.95rem;
  height: 0.95rem;
}

.farmer-name,
.record-date,
.view-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}

.page-subtitle {
  color: #6b7280;
  font-size: 0.95rem;
  margin: 0;
}

/* TAB NAVIGATION */
.tab-navigation {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  border-bottom: 2px solid #e5e7eb;
}

.tab-btn {
  padding: 0.75rem 1.5rem;
  background: none;
  border: none;
  border-bottom: 3px solid transparent;
  cursor: pointer;
  font-weight: 600;
  color: #6b7280;
  transition: all 0.2s;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.tab-btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.tab-btn-icon svg {
  width: 1rem;
  height: 1rem;
}

.tab-btn:hover {
  color: #166534;
}

.tab-btn.active {
  color: #166534;
  border-bottom-color: #16a34a;
}

/* ALERTS */
.alert {
  padding: 0.75rem 1rem;
  border-radius: 8px;
  margin-bottom: 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.9rem;
}

.alert-error {
  background: #fee2e2;
  color: #991b1b;
  border: 1px solid #fca5a5;
}

.alert-warning {
  background: #fef3c7;
  color: #92400e;
  border: 1px solid #fcd34d;
}

.alert-success {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.alert-close {
  background: none;
  border: none;
  font-size: 1.2rem;
  cursor: pointer;
  color: inherit;
}

/* SEARCH */
.filter-bar {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
  margin-bottom: 1.25rem;
}

.results-count {
  margin: 0;
  font-size: 0.85rem;
  font-weight: 600;
  color: #166534;
}

.search-box {
  display: flex;
  align-items: center;
  background: #fff;
  border: 2px solid #86efac;
  border-radius: 14px;
  padding: 0 1rem;
  width: 100%;
  max-width: none;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.08);
}

.search-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-right: 0.35rem;
}

.search-icon svg {
  width: 1rem;
  height: 1rem;
}

.search-input {
  flex: 1;
  border: none;
  padding: 0.75rem 0;
  font-size: 0.95rem;
  outline: none;
  background: transparent;
}

/* LOADING / EMPTY */
.loading-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #6b7280;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid #e5e7eb;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1rem;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: #9ca3af;
}

.empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 4.5rem;
  height: 4.5rem;
  margin: 0 auto 0.75rem;
  border-radius: 18px;
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(134, 239, 172, 0.28);
  color: #4ade80;
}

.empty-icon svg {
  width: 2rem;
  height: 2rem;
}

.empty-state--search {
  padding: 1.5rem;
}

/* RECORDS LIST */
.records-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.record-card {
  background: #fff;
  border: 2px solid #86efac;
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.08);
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
  border-left: 4px solid #22c55e;
}

.record-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 12px 28px rgba(22, 101, 52, 0.12);
  border-color: #166534;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
  flex-wrap: wrap;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #d1fae5;
}

.farmer-info {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  flex: 1;
}

.farmer-name {
  font-weight: 700;
  color: #166534;
  font-size: 1.1rem;
  letter-spacing: -0.3px;
}

.farmer-name .inline-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  background: #f0fdf4;
  border: 1px solid #86efac;
  color: #166534;
  padding: 0.2rem;
}

.record-date {
  font-size: 0.85rem;
  color: #6b7280;
  font-weight: 500;
}

.record-date .inline-icon {
  width: 1.55rem;
  height: 1.55rem;
  border-radius: 8px;
  background: #fffbeb;
  border: 1px solid #fcd34d;
  color: #b45309;
  padding: 0.15rem;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.status-badge {
  padding: 0.4rem 0.85rem;
  border-radius: 999px;
  font-size: 0.75rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid transparent;
  letter-spacing: 0.02em;
  text-transform: uppercase;
}

.status-submitted { background: #dbeafe; color: #1e40af; border-color: #93c5fd; }
.status-review { background: #fef3c7; color: #92400e; border-color: #fcd34d; }
.status-eligible { background: #dcfce7; color: #166534; border-color: #86efac; }
.status-upcoming { background: #ffedd5; color: #9a3412; border-color: #fdba74; }
.status-received { background: #bbf7d0; color: #14532d; border-color: #4ade80; }

.view-btn {
  padding: 0.5rem 1.1rem;
  background: linear-gradient(135deg, #166534, #16a34a);
  color: white;
  border: 1px solid #15803d;
  border-radius: 10px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 700;
  transition: all 0.2s;
  white-space: nowrap;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.22);
}

.view-btn .inline-icon {
  width: 1.35rem;
  height: 1.35rem;
  border-radius: 6px;
  background: rgba(255, 255, 255, 0.18);
  padding: 0.1rem;
}

.view-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.3);
}

.record-details {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1rem;
  padding: 0.65rem 0.85rem;
  background: #f0fdf4;
  border: 1px solid #bbf7d0;
  border-radius: 10px;
}

.record-detail {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
}

.detail-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 8px;
  background: #ecfdf5;
  border: 1px solid #86efac;
  color: #166534;
  flex-shrink: 0;
}

.detail-icon svg {
  width: 0.9rem;
  height: 0.9rem;
}

.detail-label {
  color: #166534;
  font-weight: 700;
  min-width: auto;
}

.record-financials {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.85rem;
  padding-top: 0.25rem;
  border-top: none;
}

.financial-stat {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 2px solid transparent;
}

.fin-stat-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.fin-stat-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  border-radius: 8px;
  flex-shrink: 0;
}

.fin-stat-icon svg {
  width: 0.95rem;
  height: 0.95rem;
}

.fin-stat-label {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.fin-stat-value {
  font-size: 1.05rem;
  font-weight: 800;
  line-height: 1.2;
  word-break: break-word;
}

.financial-stat.income {
  background: #eff6ff;
  border-color: #93c5fd;
}

.financial-stat.income .fin-stat-icon {
  background: #dbeafe;
  color: #1d4ed8;
  border: 1px solid #93c5fd;
}

.financial-stat.income .fin-stat-label { color: #1e40af; }
.financial-stat.income .fin-stat-value { color: #1d4ed8; }

.financial-stat.expense {
  background: #fef2f2;
  border-color: #fca5a5;
}

.financial-stat.expense .fin-stat-icon {
  background: #fee2e2;
  color: #dc2626;
  border: 1px solid #fca5a5;
}

.financial-stat.expense .fin-stat-label { color: #991b1b; }
.financial-stat.expense .fin-stat-value { color: #dc2626; }

.financial-stat.profit {
  background: #f0fdf4;
  border-color: #86efac;
}

.financial-stat.profit .fin-stat-icon {
  background: #dcfce7;
  color: #15803d;
  border: 1px solid #86efac;
}

.financial-stat.profit .fin-stat-label { color: #166534; }
.financial-stat.profit .fin-stat-value { color: #15803d; }

.financial-stat.loss {
  background: #fef2f2;
  border-color: #f87171;
}

.financial-stat.loss .fin-stat-icon {
  background: #fee2e2;
  color: #b91c1c;
  border: 1px solid #f87171;
}

.financial-stat.loss .fin-stat-label { color: #991b1b; }
.financial-stat.loss .fin-stat-value { color: #b91c1c; }

/* Legacy financial-item — kept for modal/other sections */
.financial-item {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.financial-item > span:first-child {
  font-size: 0.8rem;
  font-weight: 500;
  color: #7b8295;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.financial-item > span:last-child {
  font-size: 1.1rem;
  font-weight: 700;
}

.financial-item.income > span:last-child { color: #2563eb; }
.financial-item.expense > span:last-child { color: #dc2626; }
.financial-item.profit > span:last-child { color: #16a34a; font-weight: 800; }
.financial-item.loss > span:last-child { color: #dc2626; }

@media (max-width: 768px) {
  .record-header {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .header-actions {
    width: 100%;
    justify-content: space-between;
  }
  
  .record-details {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }
  
  .record-financials {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .financial-stat {
    padding: 0.75rem 0.85rem;
  }
}

/* DISTRIBUTIONS */
.distributions-container {
  padding: 1rem 0;
}

.distributions-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
  gap: 1rem;
}

.distributions-header h2 {
  margin: 0;
  color: #166534;
  font-size: 1.25rem;
}

.btn-add-distribution {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #166534, #16a34a);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-add-distribution:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.3);
}

.distributions-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
}

.distribution-card {
  background: #fff;
  border: 1px solid #e5e7eb;
  border-radius: 12px;
  padding: 1rem;
  box-shadow: 0 1px 3px rgba(0,0,0,0.06);
}

.dist-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 0.75rem;
}

.dist-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.dist-farmer {
  font-weight: 700;
  color: #166534;
  font-size: 0.95rem;
}

.dist-type {
  font-size: 0.8rem;
  color: #6b7280;
}

.dist-status-badge {
  padding: 0.25rem 0.5rem;
  border-radius: 16px;
  font-size: 0.7rem;
  font-weight: 600;
  white-space: nowrap;
}

.dist-status-pending { background: #dbeafe; color: #0c4a6e; }
.dist-status-ready { background: #fef3c7; color: #92400e; }
.dist-status-distributed { background: #fbdba6; color: #78350f; }
.dist-status-confirmed { background: #c6f6d5; color: #22543d; }

.dist-details {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid #f0f0f0;
}

.dist-detail {
  display: flex;
  justify-content: space-between;
  font-size: 0.8rem;
}

.dist-detail .label {
  color: #6b7280;
  font-weight: 500;
}

.dist-actions {
  display: flex;
  gap: 0.5rem;
}

.btn-small, .btn-confirm {
  flex: 1;
  padding: 0.4rem 0.75rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.75rem;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-small {
  background: #e5e7eb;
  color: #374151;
}

.btn-small:hover {
  background: #d1d5db;
}

.btn-confirm {
  background: #dcfce7;
  color: #166534;
  border: 1px solid #86efac;
}

.btn-confirm:hover {
  background: #c6f6d5;
}

/* MODALS */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0,0,0,0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-container {
  background: white;
  border-radius: 12px;
  box-shadow: 0 10px 40px rgba(0,0,0,0.2);
  max-height: 90vh;
  overflow-y: auto;
  max-width: 600px;
  width: 100%;
}

.modal-container.modal-lg {
  max-width: 700px;
}

.modal-container.modal-md {
  max-width: 500px;
}

.modal-header {
  padding: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-title-with-status {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.modal-status-badge {
  padding: 0.35rem 0.75rem;
  border-radius: 20px;
  font-size: 0.75rem;
  font-weight: 600;
  white-space: nowrap;
}

.modal-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #6b7280;
  padding: 0;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-close:hover {
  color: #1f2937;
}

.modal-body {
  padding: 1.5rem;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #f0f0f0;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.btn-close-modal {
  padding: 0.5rem 1.5rem;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-close-modal:hover {
  background: #d1d5db;
}

/* STATUS MANAGEMENT */
.status-management-section {
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: #f9fafb;
  border-radius: 8px;
}

.section-title {
  margin: 0 0 1rem 0;
  color: #166534;
  font-size: 1rem;
  font-weight: 700;
}

.status-timeline {
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 1rem;
  overflow-x: auto;
}

.status-step {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
  min-width: 80px;
}

.status-circle {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: #e5e7eb;
  color: #6b7280;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  transition: all 0.2s;
}

.status-step.active .status-circle {
  background: #16a34a;
  color: white;
}

.status-step.completed .status-circle {
  background: #c6f6d5;
  color: #166534;
}

.status-label {
  font-size: 0.7rem;
  text-align: center;
  color: #6b7280;
  font-weight: 500;
}

.status-action {
  text-align: center;
}

.btn-update-status {
  padding: 0.5rem 1rem;
  background: linear-gradient(135deg, #166534, #16a34a);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.btn-update-status:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.3);
}

/* FORMS */
.farmer-banner {
  background: linear-gradient(135deg, #166534, #16a34a);
  color: white;
  padding: 1rem;
  border-radius: 8px;
  margin-bottom: 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.banner-icon {
  width: 2.25rem;
  height: 2.25rem;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(134, 239, 172, 0.28);
  color: #86efac;
}

.banner-icon svg {
  width: 1.15rem;
  height: 1.15rem;
}

.banner-name {
  font-weight: 700;
  font-size: 1.1rem;
}

.detail-section {
  margin-bottom: 1.5rem;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid #f0f0f0;
}

.detail-section:last-child {
  border-bottom: none;
}

.detail-section-title {
  margin: 0 0 1rem 0;
  color: #166534;
  font-size: 1rem;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.section-title-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(134, 239, 172, 0.28);
  color: #86efac;
}

.section-title-icon svg {
  width: 0.95rem;
  height: 0.95rem;
}

.modal-header h2 {
  margin: 0;
  color: #166534;
  font-size: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
}

.modal-title-icon {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 9px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: rgba(74, 222, 128, 0.15);
  border: 1px solid rgba(134, 239, 172, 0.28);
  color: #86efac;
}

.modal-title-icon svg {
  width: 1rem;
  height: 1rem;
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 1rem;
}

.detail-cell {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.cell-label {
  font-size: 0.8rem;
  color: #6b7280;
  font-weight: 500;
}

.cell-value {
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 600;
}

.detail-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.85rem;
}

.detail-table th {
  background: #f3f4f6;
  padding: 0.5rem;
  text-align: left;
  font-weight: 600;
  color: #374151;
  border-bottom: 1px solid #d1d5db;
}

.detail-table td {
  padding: 0.5rem;
  border-bottom: 1px solid #e5e7eb;
}

.detail-table td.amt {
  text-align: right;
  font-weight: 600;
}

.detail-table tfoot tr {
  background: #f9fafb;
}

.foot-label {
  text-align: right;
  font-weight: 600;
  color: #374151;
}

.foot-value {
  text-align: right;
  font-weight: 700;
  color: #166534;
}

.expense-grid {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.expense-row {
  display: flex;
  justify-content: space-between;
  padding: 0.4rem 0;
  border-bottom: 1px solid #e5e7eb;
}

.expense-row.total-row {
  font-weight: 700;
  color: #166534;
  border-top: 2px solid #16a34a;
  border-bottom: none;
  padding-top: 0.75rem;
  margin-top: 0.5rem;
}

.summary-detail-section {
  background: #f0fdf4;
  padding: 1rem;
  border-radius: 8px;
  border: 1px solid #86efac;
}

.grand-summary {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.grand-row {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem;
  font-weight: 600;
}

.income-row {
  color: #2563eb;
}

.expense-summary-row {
  color: #dc2626;
}

.net-profit-row {
  color: #16a34a;
  background: #dcfce7;
  padding: 0.75rem;
  border-radius: 6px;
}

.net-loss-row {
  color: #dc2626;
  background: #fee2e2;
  padding: 0.75rem;
  border-radius: 6px;
}

.no-data {
  color: #9ca3af;
  font-size: 0.9rem;
}

/* DISTRIBUTION FORM */
.distribution-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-weight: 600;
  color: #374151;
  font-size: 0.9rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  padding: 0.5rem;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.9rem;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #16a34a;
  box-shadow: 0 0 0 3px rgba(22, 163, 74, 0.1);
}

.form-group input:disabled {
  background: #f3f4f6;
  color: #9ca3af;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
}

.form-actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #f0f0f0;
}

.btn-primary {
  padding: 0.5rem 1.5rem;
  background: linear-gradient(135deg, #166534, #16a34a);
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-primary:hover {
  transform: translateY(-1px);
  box-shadow: 0 2px 8px rgba(22, 101, 52, 0.3);
}

.btn-cancel {
  padding: 0.5rem 1.5rem;
  background: #e5e7eb;
  color: #374151;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
  transition: all 0.2s;
}

.btn-cancel:hover {
  background: #d1d5db;
}

/* RESPONSIVE */
@media (max-width: 768px) {
  .distributions-grid {
    grid-template-columns: 1fr;
  }

  .form-row {
    grid-template-columns: 1fr;
  }

  .status-timeline {
    gap: 0.25rem;
  }

  .status-step {
    min-width: 60px;
  }

  .status-label {
    font-size: 0.65rem;
  }
}

/* Light shell when embedded under FarmerIncomeHubPage */
.income-hub-subpage.light-theme .page-header {
  margin-bottom: 1.5rem;
  padding: 1.5rem 1.75rem;
  background: #ffffff;
  border: 2px solid #86efac;
  border-radius: 22px;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.income-hub-subpage.light-theme .page-title {
  margin-bottom: 0.5rem;
}

.income-hub-subpage.light-theme .page-subtitle {
  margin: 0;
  line-height: 1.55;
}

.income-hub-subpage.light-theme .tab-navigation {
  padding: 14px 16px;
  border-radius: 18px;
  margin-bottom: 1.5rem;
}

.income-hub-subpage.light-theme .tab-navigation .tab-btn {
  padding: 0.85rem 1.5rem;
  min-height: 48px;
}

.income-hub-subpage.light-theme .search-box {
  padding: 12px 16px;
  gap: 10px;
  border-radius: 12px;
}

.income-hub-subpage.light-theme .search-input {
  padding: 4px 2px;
}

.income-hub-subpage.light-theme .results-count {
  color: #166534;
}

.income-hub-subpage.light-theme .record-card {
  padding: 1.75rem 1.85rem;
  border-radius: 16px;
  border-left: 4px solid #22c55e;
}

.income-hub-subpage.light-theme .record-details {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.income-hub-subpage.light-theme .farmer-name .inline-icon {
  background: #f0fdf4;
  border-color: #86efac;
  color: #166534;
}

.income-hub-subpage.light-theme .record-date .inline-icon {
  background: #fffbeb;
  border-color: #fcd34d;
  color: #b45309;
}

.income-hub-subpage.light-theme .detail-icon {
  background: #ecfdf5;
  border-color: #86efac;
  color: #166534;
}

.income-hub-subpage.light-theme .record-header {
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
}

.income-hub-subpage.light-theme .record-financials {
  padding-top: 1.25rem;
}

.income-hub-subpage.light-theme .empty-state {
  padding: 2.5rem 2rem;
}

/* Light mode — high-contrast readable text on stat chips */
.income-hub-subpage.light-theme .farmer-name {
  color: #052e16;
}

.income-hub-subpage.light-theme .record-date {
  color: #374151;
}

.income-hub-subpage.light-theme .detail-label {
  color: #166534;
}

.income-hub-subpage.light-theme .record-detail span:last-child {
  color: #052e16;
}

.income-hub-subpage.light-theme .financial-stat.income {
  background: #dbeafe;
  border-color: #3b82f6;
}

.income-hub-subpage.light-theme .financial-stat.income .fin-stat-icon {
  background: #bfdbfe;
  border-color: #3b82f6;
  color: #1e3a8a;
}

.income-hub-subpage.light-theme .financial-stat.income .fin-stat-label {
  color: #1e3a8a;
}

.income-hub-subpage.light-theme .financial-stat.income .fin-stat-value {
  color: #1e40af;
}

.income-hub-subpage.light-theme .financial-stat.expense {
  background: #fee2e2;
  border-color: #ef4444;
}

.income-hub-subpage.light-theme .financial-stat.expense .fin-stat-icon {
  background: #fecaca;
  border-color: #ef4444;
  color: #991b1b;
}

.income-hub-subpage.light-theme .financial-stat.expense .fin-stat-label {
  color: #991b1b;
}

.income-hub-subpage.light-theme .financial-stat.expense .fin-stat-value {
  color: #b91c1c;
}

.income-hub-subpage.light-theme .financial-stat.profit {
  background: #dcfce7;
  border-color: #22c55e;
}

.income-hub-subpage.light-theme .financial-stat.profit .fin-stat-icon {
  background: #bbf7d0;
  border-color: #22c55e;
  color: #14532d;
}

.income-hub-subpage.light-theme .financial-stat.profit .fin-stat-label {
  color: #14532d;
}

.income-hub-subpage.light-theme .financial-stat.profit .fin-stat-value {
  color: #15803d;
}

.income-hub-subpage.light-theme .financial-stat.loss {
  background: #fee2e2;
  border-color: #dc2626;
}

.income-hub-subpage.light-theme .financial-stat.loss .fin-stat-icon {
  background: #fecaca;
  border-color: #dc2626;
  color: #991b1b;
}

.income-hub-subpage.light-theme .financial-stat.loss .fin-stat-label {
  color: #991b1b;
}

.income-hub-subpage.light-theme .financial-stat.loss .fin-stat-value {
  color: #b91c1c;
}

.income-hub-subpage.light-theme .status-eligible {
  background: #dcfce7;
  color: #14532d;
  border-color: #22c55e;
}

.income-hub-subpage.light-theme .search-input {
  color: #052e16;
}

.income-hub-subpage.light-theme .search-input::placeholder {
  color: #6b7280;
}

/* Dark shell when embedded under FarmerIncomeHubPage */
.income-hub-subpage.page-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 2px 1.25rem;
  background: transparent;
}

.income-hub-subpage:not(.light-theme) .page-header {
  margin-bottom: 1.25rem;
  padding: 1.25rem 1.35rem;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.96), rgba(14, 33, 23, 0.95));
  border: 2px solid rgba(4, 14, 10, 0.68);
  border-radius: 22px;
  box-shadow: 0 14px 32px rgba(5, 12, 8, 0.22);
}

.income-hub-subpage:not(.light-theme) .page-title {
  color: #ffffff;
  font-size: clamp(1.35rem, 2vw, 1.85rem);
  font-weight: 800;
  display: inline-flex;
  align-items: center;
  gap: 0.65rem;
}

.income-hub-subpage:not(.light-theme) .title-icon {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.22), rgba(34, 197, 94, 0.14));
  border-color: rgba(134, 239, 172, 0.35);
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .page-subtitle {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .tab-navigation {
  border-bottom: none;
  margin-bottom: 1.25rem;
  padding: 12px 14px;
  background: linear-gradient(145deg, rgba(66, 129, 92, 0.16), rgba(41, 88, 61, 0.18));
  border: 2px solid rgba(4, 14, 10, 0.52);
  border-radius: 18px;
  gap: 10px;
}

.income-hub-subpage:not(.light-theme) .tab-navigation .tab-btn {
  padding: 0.65rem 1.25rem;
  border-radius: 12px;
  border: 1px solid rgba(255, 232, 179, 0.25);
  border-bottom: 1px solid rgba(255, 232, 179, 0.25);
  background: linear-gradient(135deg, rgba(156, 107, 40, 0.55), rgba(108, 149, 94, 0.55));
  color: rgba(255, 255, 255, 0.95);
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
}

.income-hub-subpage:not(.light-theme) .tab-navigation .tab-btn:hover {
  color: #fff;
  filter: brightness(1.08);
}

.income-hub-subpage:not(.light-theme) .tab-navigation .tab-btn.active {
  color: #052e16;
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 55%, #4ade80 100%);
  border-color: rgba(220, 252, 231, 0.85);
}

.income-hub-subpage:not(.light-theme) .alert-error {
  background: rgba(127, 29, 29, 0.4);
  color: #fecaca;
  border-color: rgba(248, 113, 113, 0.45);
}

.income-hub-subpage:not(.light-theme) .alert-success {
  background: rgba(21, 128, 61, 0.35);
  color: #bbf7d0;
  border-color: rgba(74, 222, 128, 0.45);
}

.income-hub-subpage:not(.light-theme) .alert-warning {
  background: rgba(146, 64, 14, 0.35);
  color: #fde68a;
  border-color: rgba(250, 204, 21, 0.4);
}

.income-hub-subpage:not(.light-theme) .search-box {
  max-width: none;
  background: rgba(0, 0, 0, 0.28);
  border: 2px solid rgba(4, 14, 10, 0.52);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.04);
}

.income-hub-subpage:not(.light-theme) .results-count {
  color: rgba(255, 255, 255, 0.82);
}

.income-hub-subpage:not(.light-theme) .search-icon {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .search-icon svg {
  width: 1.1rem;
  height: 1.1rem;
}

.income-hub-subpage:not(.light-theme) .search-input {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .search-input::placeholder {
  color: rgba(255, 255, 255, 0.62);
}

.income-hub-subpage:not(.light-theme) .loading-state {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .spinner {
  border-color: rgba(255, 255, 255, 0.15);
  border-top-color: #4ade80;
}

.income-hub-subpage:not(.light-theme) .empty-state {
  color: #ffffff;
  padding: 2rem 1.25rem;
  border-radius: 22px;
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.82), rgba(14, 33, 23, 0.8));
  border: 2px solid rgba(4, 14, 10, 0.52);
}

.income-hub-subpage:not(.light-theme) .record-card {
  background: linear-gradient(145deg, rgba(24, 48, 34, 0.96), rgba(14, 33, 23, 0.94));
  border: 2px solid rgba(4, 14, 10, 0.52);
  border-left: 4px solid #4ade80;
  box-shadow: 0 14px 32px rgba(5, 12, 8, 0.22);
}

.income-hub-subpage:not(.light-theme) .record-card:hover {
  box-shadow: 0 18px 40px rgba(5, 12, 8, 0.28);
}

.income-hub-subpage:not(.light-theme) .record-header {
  border-bottom-color: rgba(4, 14, 10, 0.44);
}

.income-hub-subpage:not(.light-theme) .farmer-name {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .farmer-name .inline-icon {
  background: rgba(74, 222, 128, 0.16);
  border-color: rgba(134, 239, 172, 0.45);
  color: #86efac;
}

.income-hub-subpage:not(.light-theme) .record-date {
  color: rgba(255, 255, 255, 0.88);
}

.income-hub-subpage:not(.light-theme) .record-date .inline-icon {
  background: rgba(250, 204, 21, 0.14);
  border-color: rgba(250, 204, 21, 0.35);
  color: #fde68a;
}

.income-hub-subpage:not(.light-theme) .status-submitted {
  background: rgba(59, 130, 246, 0.25);
  color: #bfdbfe;
  border: 1px solid rgba(96, 165, 250, 0.35);
}

.income-hub-subpage:not(.light-theme) .status-review,
.income-hub-subpage:not(.light-theme) .status-upcoming {
  background: rgba(250, 204, 21, 0.16);
  color: #fde68a;
  border: 1px solid rgba(250, 204, 21, 0.3);
}

.income-hub-subpage:not(.light-theme) .status-eligible,
.income-hub-subpage:not(.light-theme) .status-received {
  background: rgba(22, 101, 52, 0.72);
  color: #ffffff;
  border: 1px solid rgba(134, 239, 172, 0.45);
}

.income-hub-subpage:not(.light-theme) .detail-label {
  color: #86efac;
}

.income-hub-subpage:not(.light-theme) .record-details {
  background: rgba(0, 0, 0, 0.22);
  border-color: rgba(4, 14, 10, 0.44);
}

.income-hub-subpage:not(.light-theme) .detail-icon {
  background: rgba(74, 222, 128, 0.14);
  border-color: rgba(134, 239, 172, 0.35);
  color: #86efac;
}

.income-hub-subpage:not(.light-theme) .record-detail span:last-child {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .record-financials {
  border-top: none;
}

.income-hub-subpage:not(.light-theme) .financial-stat.income {
  background: rgba(37, 99, 235, 0.14);
  border-color: rgba(96, 165, 250, 0.38);
}

.income-hub-subpage:not(.light-theme) .financial-stat.income .fin-stat-icon {
  background: rgba(37, 99, 235, 0.22);
  border-color: rgba(96, 165, 250, 0.4);
  color: #93c5fd;
}

.income-hub-subpage:not(.light-theme) .financial-stat.income .fin-stat-label {
  color: #bfdbfe;
}

.income-hub-subpage:not(.light-theme) .financial-stat.income .fin-stat-value {
  color: #93c5fd;
}

.income-hub-subpage:not(.light-theme) .financial-stat.expense {
  background: rgba(220, 38, 38, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
}

.income-hub-subpage:not(.light-theme) .financial-stat.expense .fin-stat-icon {
  background: rgba(220, 38, 38, 0.2);
  border-color: rgba(248, 113, 113, 0.38);
  color: #fca5a5;
}

.income-hub-subpage:not(.light-theme) .financial-stat.expense .fin-stat-label {
  color: #fecaca;
}

.income-hub-subpage:not(.light-theme) .financial-stat.expense .fin-stat-value {
  color: #fca5a5;
}

.income-hub-subpage:not(.light-theme) .financial-stat.profit {
  background: rgba(22, 163, 74, 0.14);
  border-color: rgba(74, 222, 128, 0.38);
}

.income-hub-subpage:not(.light-theme) .financial-stat.profit .fin-stat-icon {
  background: rgba(22, 163, 74, 0.22);
  border-color: rgba(74, 222, 128, 0.4);
  color: #86efac;
}

.income-hub-subpage:not(.light-theme) .financial-stat.profit .fin-stat-label {
  color: #bbf7d0;
}

.income-hub-subpage:not(.light-theme) .financial-stat.profit .fin-stat-value {
  color: #4ade80;
}

.income-hub-subpage:not(.light-theme) .financial-stat.loss {
  background: rgba(220, 38, 38, 0.14);
  border-color: rgba(248, 113, 113, 0.38);
}

.income-hub-subpage:not(.light-theme) .financial-stat.loss .fin-stat-icon {
  background: rgba(220, 38, 38, 0.22);
  border-color: rgba(248, 113, 113, 0.4);
  color: #fca5a5;
}

.income-hub-subpage:not(.light-theme) .financial-stat.loss .fin-stat-label {
  color: #fecaca;
}

.income-hub-subpage:not(.light-theme) .financial-stat.loss .fin-stat-value {
  color: #f87171;
}

.income-hub-subpage:not(.light-theme) .financial-item > span:first-child {
  color: rgba(255, 255, 255, 0.88);
}

.income-hub-subpage:not(.light-theme) .financial-item.income > span:last-child {
  color: #93c5fd;
}

.income-hub-subpage:not(.light-theme) .financial-item.expense > span:last-child {
  color: #fca5a5;
}

.income-hub-subpage:not(.light-theme) .financial-item.profit > span:last-child {
  color: #4ade80;
}

.income-hub-subpage:not(.light-theme) .distributions-header h2 {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .distribution-card {
  background: linear-gradient(145deg, rgba(18, 43, 29, 0.92), rgba(14, 33, 23, 0.9));
  border: 1px solid rgba(126, 184, 145, 0.22);
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .distribution-form,
.income-hub-subpage:not(.light-theme) .form-group input,
.income-hub-subpage:not(.light-theme) .form-group select,
.income-hub-subpage:not(.light-theme) .form-group textarea {
  background: rgba(0, 0, 0, 0.25);
  border-color: rgba(126, 184, 145, 0.35);
  color: #ecfdf5;
}

.income-hub-subpage:not(.light-theme) .form-group label {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .form-actions {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.income-hub-subpage:not(.light-theme) .btn-cancel {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(236, 253, 245, 0.9);
}

.income-hub-subpage:not(.light-theme) .status-timeline,
.income-hub-subpage:not(.light-theme) .timeline-label {
  color: #ffffff;
}

/* Teleported detail modal */
.farmer-income-hub-modal:not(.light-theme).modal-overlay {
  background: rgba(6, 12, 9, 0.78);
  backdrop-filter: blur(8px);
}

.farmer-income-hub-modal:not(.light-theme) .modal-container {
  background: linear-gradient(145deg, rgba(22, 44, 32, 0.99), rgba(14, 33, 23, 0.99));
  border: 1px solid rgba(126, 184, 145, 0.28);
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45);
}

.farmer-income-hub-modal:not(.light-theme) .modal-header {
  border-bottom-color: rgba(255, 255, 255, 0.08);
}

.farmer-income-hub-modal:not(.light-theme) .modal-header h2 {
  color: #ffffff;
}

.farmer-income-hub-modal:not(.light-theme) .modal-close {
  color: rgba(255, 255, 255, 0.75);
}

.farmer-income-hub-modal:not(.light-theme) .modal-close:hover {
  color: #ffffff;
}

.farmer-income-hub-modal:not(.light-theme) .modal-body {
  color: #ffffff;
}

.farmer-income-hub-modal:not(.light-theme) .detail-section-title {
  color: #ffffff;
  border-bottom-color: rgba(255, 255, 255, 0.1);
}

.farmer-income-hub-modal:not(.light-theme) .cell-label {
  color: rgba(255, 255, 255, 0.88);
}

.farmer-income-hub-modal:not(.light-theme) .cell-value {
  color: #ffffff;
}

.farmer-income-hub-modal:not(.light-theme) .detail-table thead {
  background: rgba(0, 0, 0, 0.28);
}

.farmer-income-hub-modal:not(.light-theme) .detail-table th {
  color: #ffffff;
  border-bottom-color: rgba(255, 255, 255, 0.12);
}

.farmer-income-hub-modal:not(.light-theme) .detail-table td {
  color: #ffffff;
  border-bottom-color: rgba(255, 255, 255, 0.06);
}

.farmer-income-hub-modal:not(.light-theme) .detail-table tfoot tr {
  background: rgba(0, 0, 0, 0.22);
}

.farmer-income-hub-modal:not(.light-theme) .modal-footer {
  border-top-color: rgba(255, 255, 255, 0.08);
}

.farmer-income-hub-modal:not(.light-theme) .summary-detail-section {
  background: rgba(74, 222, 128, 0.08);
  border: 1px solid rgba(126, 184, 145, 0.25);
}

.farmer-income-hub-modal:not(.light-theme) .no-data {
  color: rgba(220, 252, 231, 0.6);
}

.farmer-income-hub-modal:not(.light-theme) .expense-row {
  border-bottom-color: rgba(255, 255, 255, 0.06);
  color: rgba(226, 234, 229, 0.88);
}

.farmer-income-hub-modal:not(.light-theme) .expense-row.total-row {
  background: rgba(0, 0, 0, 0.25);
  color: #ecfdf5;
}

.farmer-income-hub-modal:not(.light-theme) .net-profit-row {
  background: #bbf7d0 !important;
  border: 1px solid #86efac !important;
}

.farmer-income-hub-modal:not(.light-theme) .net-profit-row span {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  font-weight: 700 !important;
}

.farmer-income-hub-modal:not(.light-theme) .net-loss-row {
  background: #fecaca !important;
  border: 1px solid #f87171 !important;
}

.farmer-income-hub-modal:not(.light-theme) .net-loss-row span {
  color: #7f1d1d !important;
  -webkit-text-fill-color: #7f1d1d !important;
  font-weight: 700 !important;
}

.farmer-income-hub-modal:not(.light-theme) .income-row span {
  color: #93c5fd !important;
  -webkit-text-fill-color: #93c5fd !important;
}

.farmer-income-hub-modal:not(.light-theme) .expense-summary-row span {
  color: #fca5a5 !important;
  -webkit-text-fill-color: #fca5a5 !important;
}

/* Dark mode — ensure all SVG icons stay visible */
.income-hub-subpage:not(.light-theme) :is(
  .title-icon,
  .search-icon,
  .empty-icon,
  .stat-icon,
  .inline-icon,
  .tab-btn-icon,
  .section-title-icon,
  .modal-title-icon,
  .banner-icon
) svg,
.income-hub-subpage:not(.light-theme) :is(
  .title-icon,
  .search-icon,
  .empty-icon,
  .stat-icon,
  .inline-icon,
  .tab-btn-icon,
  .section-title-icon,
  .modal-title-icon,
  .banner-icon
) svg * {
  stroke: currentColor;
}

.income-hub-subpage:not(.light-theme) .title-icon {
  color: #86efac;
  border-color: rgba(134, 239, 172, 0.4);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(34, 197, 94, 0.16));
}

.income-hub-subpage:not(.light-theme) .search-icon {
  color: #bbf7d0;
}

.income-hub-subpage:not(.light-theme) .empty-icon {
  color: #4ade80;
  background: rgba(74, 222, 128, 0.14);
  border: 1px solid rgba(134, 239, 172, 0.32);
}

.income-hub-subpage:not(.light-theme) .stat-icon {
  color: #fde68a;
  border: 1px solid rgba(250, 204, 21, 0.4);
}

.income-hub-subpage:not(.light-theme) .farmer-name .inline-icon {
  color: #bbf7d0;
}

.income-hub-subpage:not(.light-theme) .record-date .inline-icon {
  color: rgba(220, 252, 231, 0.78);
}

.income-hub-subpage:not(.light-theme) .pending-badge .inline-icon {
  color: #fde68a;
}

.income-hub-subpage:not(.light-theme) .view-btn .inline-icon {
  color: #ffffff;
}

.income-hub-subpage:not(.light-theme) .tab-navigation .tab-btn .tab-btn-icon {
  color: rgba(255, 255, 255, 0.96);
}

.income-hub-subpage:not(.light-theme) .tab-navigation .tab-btn.active .tab-btn-icon {
  color: #052e16;
}

.farmer-income-hub-modal:not(.light-theme) :is(.section-title-icon, .modal-title-icon, .banner-icon) {
  color: #86efac;
  background: rgba(74, 222, 128, 0.16);
  border: 1px solid rgba(134, 239, 172, 0.32);
}

.farmer-income-hub-modal:not(.light-theme) :is(.section-title-icon, .modal-title-icon, .banner-icon) svg,
.farmer-income-hub-modal:not(.light-theme) :is(.section-title-icon, .modal-title-icon, .banner-icon) svg * {
  stroke: currentColor;
}
</style>
