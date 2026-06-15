<template>
  <div class="page-container barangays-page" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">Barangay Management</h1>
        <p class="page-subtitle">Manage barangays and land areas</p>
      </div>
      <button type="button" @click="openAddModal" class="btn-header-add">
        <svg class="btn-header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        Add Barangay
      </button>
    </div>

    <!-- Statistics -->
    <div class="stats-grid">
      <div class="stat-card stat-total">
        <div class="stat-icon-wrap" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" class="stat-svg">
            <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-4" stroke-linecap="round" stroke-linejoin="round" />
            <path d="M9 9v0M9 12v0M9 15v0" stroke-linecap="round" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ totalBarangays }}</div>
          <div class="stat-label">Total Barangays</div>
        </div>
      </div>
      <div class="stat-card stat-active">
        <div class="stat-icon-wrap stat-icon-accent" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="stat-svg">
            <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </div>
        <div class="stat-content">
          <div class="stat-value">{{ activeBarangays }}</div>
          <div class="stat-label">Active Barangays</div>
        </div>
      </div>
    </div>

    <!-- Search and Filter -->
    <div class="tools-card">
      <div class="search-bar">
        <span class="search-icon-wrap" aria-hidden="true">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-svg">
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
          </svg>
        </span>
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Search barangays..."
          class="toolbar-input search-input-main"
        />
      </div>
      <div class="filter-group">
        <select v-model="statusFilter" class="toolbar-select">
          <option value="">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select v-model="sortBy" class="toolbar-select">
          <option value="name">Sort by Name</option>
          <option value="area">Sort by Member Land (Ha)</option>
        </select>
      </div>
    </div>

    <!-- Barangays Table -->
    <div class="card">
      <div class="table-container">
      <table class="barangays-table">
        <colgroup>
          <col class="col-name" />
          <col class="col-area" />
          <col class="col-num" />
          <col class="col-num" />
          <col class="col-status" />
          <col class="col-actions" />
        </colgroup>
        <thead>
          <tr>
            <th>Barangay Name</th>
            <th>Land Area (Ha)</th>
            <th>Farmers</th>
            <th>Officers</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="loading-cell">Loading barangays...</td>
          </tr>
          <tr v-else-if="filteredBarangays.length === 0">
            <td colspan="6" class="empty-cell">No barangays found</td>
          </tr>
          <template v-else>
          <tr v-for="barangay in filteredBarangays" :key="barangay.id">
            <td class="td-name-link barangay-name-link" @click="viewBarangayDetails(barangay)">
              {{ barangay.name }}
            </td>
            <td class="area-cell">
              <span class="area-value">{{ formatHectares(barangay.total_area) }} ha</span>
            </td>
            <td class="num-cell">{{ barangay.total_farmers || 0 }}</td>
            <td class="num-cell">{{ barangay.total_officers || 0 }}</td>
            <td>
              <span :class="['status-pill', barangay.status]">
                {{ barangay.status }}
              </span>
            </td>
            <td class="td-actions">
              <div class="barangays-action-row">
              <button type="button" class="btn-view-area" @click="viewBarangayDetails(barangay)">
                View
              </button>
              <button type="button" @click="openPlacesModal(barangay)" class="barangays-icon-btn barangays-icon-places" title="Manage Places" aria-label="Manage Places">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 21s-8-5.5-8-11.8A8 8 0 0 1 12 3a8 8 0 0 1 8 6.2c0 6.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10.5" r="2.75"/>
                </svg>
              </button>
              <button type="button" @click="openEditModal(barangay)" class="barangays-icon-btn barangays-icon-edit" title="Edit" aria-label="Edit">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button type="button" @click="openDeleteBarangayConfirm(barangay)" class="barangays-icon-btn barangays-icon-delete" title="Delete" aria-label="Delete">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
              </div>
            </td>
          </tr>
          </template>
        </tbody>
      </table>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <div v-if="showModal" class="modal-overlay" @click="closeModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h2>{{ editingBarangay ? 'Edit Barangay' : 'Add New Barangay' }}</h2>
          <button type="button" @click="closeModal" class="close-btn" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <p class="form-hint-area">
            Land area is computed automatically from the farm hectares registered by approved farmers and officers.
          </p>
          <div class="compact-form-grid">
            <div class="form-group">
              <label>Barangay Name *</label>
              <input 
                v-model="formData.name" 
                type="text" 
                class="form-input"
                placeholder="Enter barangay name"
                required
              />
            </div>
            <div class="form-group">
              <label>Status</label>
              <select v-model="formData.status" class="form-input">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" @click="closeModal" class="btn-secondary">Cancel</button>
          <button type="button" @click="saveBarangay" class="btn-submit">
            {{ editingBarangay ? 'Update' : 'Add Barangay' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Barangay Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay modal-overlay-spaced" @click="closeDetailsModal">
      <div class="modal-content modal-large barangay-details-modal" @click.stop>
        <div class="modal-header">
          <div class="modal-title-row">
            <span class="barangay-details-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 21h18" />
                <path d="M5 21V7l7-4 7 4v14" />
                <path d="M9 21v-6h6v6" />
                <path d="M9 9h.01" />
                <path d="M15 9h.01" />
                <path d="M9 13h.01" />
                <path d="M15 13h.01" />
              </svg>
            </span>
            <div class="modal-title-text">
              <h2>{{ selectedBarangay?.name }}</h2>
              <p class="modal-subtitle">
                {{ officers.length }} officers · {{ farmers.length }} farmers · {{ places.length }} places
              </p>
            </div>
          </div>
          <button type="button" @click="closeDetailsModal" class="close-btn" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="area-summary-card" v-if="selectedBarangay">
            <div class="area-summary-title">Total land area (approved members)</div>
            <div class="area-summary-value">{{ formatHectares(detailsTotalLandArea) }} ha</div>
            <p class="area-summary-note">Sum of hectares reported by each registered farmer and officer below.</p>
          </div>

          <div class="details-tabs filter-tabs">
            <button 
              type="button"
              @click="activeTab = 'officers'" 
              :class="['tab', { active: activeTab === 'officers' }]"
            >
              Officers ({{ filteredOfficers.length }})
            </button>
            <button 
              type="button"
              @click="activeTab = 'farmers'" 
              :class="['tab', { active: activeTab === 'farmers' }]"
            >
              Farmers ({{ filteredFarmers.length }})
            </button>
            <button 
              type="button"
              @click="activeTab = 'places'" 
              :class="['tab', { active: activeTab === 'places' }]"
            >
              Places ({{ places.length }})
            </button>
          </div>

          <div class="places-card" v-if="selectedBarangay && activeTab === 'places'">
            <div class="places-header">
              <div class="places-section-title">
                <span class="places-section-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11z" />
                    <circle cx="12" cy="10" r="2.5" />
                  </svg>
                </span>
                <div>
                  <h3>Service Places</h3>
                  <p>Used in machinery booking location choices.</p>
                </div>
              </div>
              <span class="places-count">{{ places.length }} total</span>
            </div>

            <div class="place-form-card">
              <div class="place-form-title">{{ editingPlaceId ? 'Edit place' : 'Add new place' }}</div>
              <div class="place-form-row">
                <div class="place-form-field">
                  <label class="place-form-label">Place name</label>
                  <input
                    v-model="placeForm.name"
                    type="text"
                    class="form-input"
                    placeholder="e.g. Sitio Proper"
                  />
                </div>
                <div class="place-form-field">
                  <label class="place-form-label">Description</label>
                  <input
                    v-model="placeForm.description"
                    type="text"
                    class="form-input"
                    placeholder="Optional"
                  />
                </div>
                <div class="place-form-field place-form-field-status">
                  <label class="place-form-label">Status</label>
                  <select v-model="placeForm.is_active" class="form-input place-status">
                    <option :value="true">Active</option>
                    <option :value="false">Inactive</option>
                  </select>
                </div>
                <div class="place-form-actions">
                  <button type="button" class="btn-submit btn-place-save" @click="savePlace">
                    {{ editingPlaceId ? 'Update' : 'Add Place' }}
                  </button>
                  <button
                    v-if="editingPlaceId"
                    type="button"
                    class="btn-secondary btn-place-cancel"
                    @click="resetPlaceForm"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>

            <div class="places-table-wrap" v-if="places.length">
              <table class="places-table">
                <colgroup>
                  <col class="places-col-name" />
                  <col class="places-col-desc" />
                  <col class="places-col-status" />
                  <col class="places-col-actions" />
                </colgroup>
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th class="th-actions">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="place in places" :key="place.id">
                    <td class="td-place-name font-semibold">{{ place.name }}</td>
                    <td class="td-place-desc">{{ place.description || '—' }}</td>
                    <td class="td-place-status">
                      <span :class="['status-badge', 'place-status-badge', place.is_active ? 'active' : 'inactive']">
                        {{ place.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </td>
                    <td class="td-actions">
                      <div class="barangays-action-row">
                      <button type="button" class="barangays-icon-btn barangays-icon-edit" title="Edit" aria-label="Edit" @click="startEditPlace(place)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button type="button" class="barangays-icon-btn barangays-icon-delete" title="Delete" aria-label="Delete" @click="openDeletePlaceConfirm(place)">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M3 6h18" />
                          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                          <path d="M10 11v6" />
                          <path d="M14 11v6" />
                        </svg>
                      </button>
                      </div>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
            <div class="empty-state compact" v-else>
              No service places yet.
            </div>
          </div>

          <!-- Search Bar -->
          <div class="modal-search-bar" v-if="activeTab !== 'places'">
            <span class="search-icon-wrap" aria-hidden="true">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="search-svg">
                <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" stroke-linecap="round" />
              </svg>
            </span>
            <input 
              v-model="memberSearchQuery" 
              type="text" 
              placeholder="Search by name or reference number..."
              class="toolbar-input modal-search-input"
            />
          </div>

          <div class="tab-content">
            <!-- Officers Tab -->
            <div v-if="activeTab === 'officers'">
              <div v-if="officers.length === 0" class="empty-state">
                No officers assigned to this barangay yet.
              </div>
              <div v-else-if="filteredOfficers.length === 0" class="empty-state">
                No officers found matching "{{ memberSearchQuery }}".
              </div>
              <div v-else class="members-table-wrap">
                <table class="members-table">
                  <colgroup>
                    <col class="members-col-ref" />
                    <col class="members-col-name" />
                    <col class="members-col-role" />
                    <col class="members-col-land" />
                    <col class="members-col-phone" />
                    <col class="members-col-date" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Reference #</th>
                      <th>Full Name</th>
                      <th>Role</th>
                      <th>Land (Ha)</th>
                      <th>Phone Number</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="officer in filteredOfficers" :key="officer.id">
                      <td class="td-ref">{{ officer.reference_number }}</td>
                      <td class="td-name font-semibold">{{ officer.full_name }}</td>
                      <td class="td-role">
                        <span class="role-badge" :class="officer.role">
                          {{ formatMemberRole(officer.role) }}
                        </span>
                      </td>
                      <td class="td-land">{{ formatHectares(officer.land_area) }}</td>
                      <td class="td-phone">{{ officer.phone_number }}</td>
                      <td class="td-date">{{ formatDate(officer.registered_on) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            <!-- Farmers Tab -->
            <div v-if="activeTab === 'farmers'">
              <div v-if="farmers.length === 0" class="empty-state">
                No farmers registered from this barangay yet.
              </div>
              <div v-else-if="filteredFarmers.length === 0" class="empty-state">
                No farmers found matching "{{ memberSearchQuery }}".
              </div>
              <div v-else class="members-table-wrap">
                <table class="members-table">
                  <colgroup>
                    <col class="members-col-ref" />
                    <col class="members-col-name" />
                    <col class="members-col-land" />
                    <col class="members-col-phone" />
                    <col class="members-col-date" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th>Reference #</th>
                      <th>Full Name</th>
                      <th>Land (Ha)</th>
                      <th>Phone Number</th>
                      <th>Registered On</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="farmer in filteredFarmers" :key="farmer.id">
                      <td class="td-ref">{{ farmer.reference_number }}</td>
                      <td class="td-name font-semibold">{{ farmer.full_name }}</td>
                      <td class="td-land">{{ formatHectares(farmer.land_area) }}</td>
                      <td class="td-phone">{{ farmer.phone_number }}</td>
                      <td class="td-date">{{ formatDate(farmer.registered_on) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" @click="closeDetailsModal" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteConfirm"
      class="modal-overlay modal-delete-overlay"
      @click="closeDeleteConfirm"
    >
      <div
        class="modal-content modal-delete"
        role="alertdialog"
        aria-labelledby="delete-confirm-title"
        aria-describedby="delete-confirm-desc"
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
              <h2 id="delete-confirm-title">{{ deleteConfirmTitle }}</h2>
              <p id="delete-confirm-desc" class="modal-subtitle delete-confirm-message">{{ deleteConfirmMessage }}</p>
            </div>
          </div>
          <button type="button" @click="closeDeleteConfirm" class="close-btn" aria-label="Close" :disabled="deleteInProgress">×</button>
        </div>
        <div class="modal-body delete-modal-body">
          <p class="delete-warning-text">This action cannot be undone.</p>
        </div>
        <div class="modal-footer delete-modal-footer">
          <button type="button" class="btn-secondary" @click="closeDeleteConfirm" :disabled="deleteInProgress">Cancel</button>
          <button type="button" class="btn-delete-confirm" @click="confirmDelete" :disabled="deleteInProgress">
            {{ deleteInProgress ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFarmerStore } from '../stores/farmerStore'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import { formatMemberRole } from '../utils/roleLabels.js'

const farmerStore = useFarmerStore()
const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)
const isAdmin = computed(() => farmerStore.role === 'admin')

const authHeaders = (json = true) => {
  const h = {}
  if (json) h['Content-Type'] = 'application/json'
  if (authStore.token) h.Authorization = `Bearer ${authStore.token}`
  return h
}

const barangays = ref([])
const loading = ref(false)
const searchQuery = ref('')
const statusFilter = ref('')
const sortBy = ref('name')

const showModal = ref(false)
const editingBarangay = ref(null)
const formData = ref({
  name: '',
  status: 'active'
})

const showDetailsModal = ref(false)
const selectedBarangay = ref(null)
const activeTab = ref('officers')
const farmers = ref([])
const officers = ref([])
const memberSearchQuery = ref('')
const places = ref([])
const editingPlaceId = ref(null)

const showDeleteConfirm = ref(false)
const deleteInProgress = ref(false)
const deleteTarget = ref(null)

const deleteConfirmTitle = computed(() => {
  if (!deleteTarget.value) return 'Confirm delete'
  return deleteTarget.value.type === 'place' ? 'Delete place?' : 'Delete barangay?'
})

const deleteConfirmMessage = computed(() => {
  if (!deleteTarget.value?.item?.name) return ''
  const name = deleteTarget.value.item.name
  if (deleteTarget.value.type === 'place') {
    return `Remove "${name}" from service places.`
  }
  return `Remove "${name}" from the barangay list.`
})
const placeForm = ref({
  name: '',
  description: '',
  is_active: true
})

const totalBarangays = computed(() => barangays.value.length)
const activeBarangays = computed(() => barangays.value.filter(b => b.status === 'active').length)

const filteredOfficers = computed(() => {
  if (!memberSearchQuery.value) return officers.value
  
  const query = memberSearchQuery.value.toLowerCase()
  return officers.value.filter(officer => 
    officer.full_name.toLowerCase().includes(query) ||
    officer.reference_number.toLowerCase().includes(query)
  )
})

const filteredFarmers = computed(() => {
  if (!memberSearchQuery.value) return farmers.value
  
  const query = memberSearchQuery.value.toLowerCase()
  return farmers.value.filter(farmer => 
    farmer.full_name.toLowerCase().includes(query) ||
    farmer.reference_number.toLowerCase().includes(query)
  )
})

/** Sum of hectares from approved members shown in the details modal */
const detailsTotalLandArea = computed(() => {
  const sum = [...officers.value, ...farmers.value].reduce((acc, row) => {
    const n = parseFloat(row.land_area)
    return acc + (Number.isFinite(n) ? n : 0)
  }, 0)
  return Math.round(sum * 100) / 100
})

const filteredBarangays = computed(() => {
  let filtered = barangays.value

  // Search filter
  if (searchQuery.value) {
    filtered = filtered.filter(b => 
      b.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
  }

  // Status filter
  if (statusFilter.value) {
    filtered = filtered.filter(b => b.status === statusFilter.value)
  }

  // Sort
  if (sortBy.value === 'name') {
    filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name))
  } else if (sortBy.value === 'area') {
    filtered = [...filtered].sort((a, b) => (b.total_area || 0) - (a.total_area || 0))
  }

  return filtered
})

const fetchBarangays = async () => {
  loading.value = true
  try {
    const response = await fetch('http://localhost:3000/api/barangays')
    const data = await response.json()
    if (data.success) {
      barangays.value = data.barangays
    }
  } catch (error) {
    console.error('Error fetching barangays:', error)
    alert('Failed to load barangays')
  } finally {
    loading.value = false
  }
}

const openAddModal = () => {
  editingBarangay.value = null
  formData.value = {
    name: '',
    status: 'active'
  }
  showModal.value = true
}

const openEditModal = (barangay) => {
  editingBarangay.value = barangay
  formData.value = {
    name: barangay.name,
    status: barangay.status
  }
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingBarangay.value = null
  formData.value = {
    name: '',
    status: 'active'
  }
}

const saveBarangay = async () => {
  if (!formData.value.name || !String(formData.value.name).trim()) {
    alert('Barangay name is required')
    return
  }

  try {
    const url = editingBarangay.value 
      ? `http://localhost:3000/api/barangays/${editingBarangay.value.id}`
      : 'http://localhost:3000/api/barangays'
    
    const method = editingBarangay.value ? 'PUT' : 'POST'

    const response = await fetch(url, {
      method,
      headers: authHeaders(),
      body: JSON.stringify({
        name: formData.value.name,
        status: formData.value.status
      })
    })

    const data = await response.json()
    
    if (data.success) {
      alert(editingBarangay.value ? 'Barangay updated successfully!' : 'Barangay added successfully!')
      closeModal()
      fetchBarangays()
    } else {
      alert(data.message || 'Operation failed')
    }
  } catch (error) {
    console.error('Error saving barangay:', error)
    alert('Failed to save barangay')
  }
}

const deleteBarangay = async (barangay) => {
  try {
    const response = await fetch(`http://localhost:3000/api/barangays/${barangay.id}`, {
      method: 'DELETE',
      headers: authHeaders(false)
    })

    const data = await response.json()
    
    if (data.success) {
      alert('Barangay deleted successfully!')
      fetchBarangays()
    } else {
      alert(data.message || 'Failed to delete barangay')
    }
  } catch (error) {
    console.error('Error deleting barangay:', error)
    alert('Failed to delete barangay')
  }
}

const openDeleteBarangayConfirm = (barangay) => {
  deleteTarget.value = { type: 'barangay', item: barangay }
  showDeleteConfirm.value = true
}

const openDeletePlaceConfirm = (place) => {
  deleteTarget.value = { type: 'place', item: place }
  showDeleteConfirm.value = true
}

const closeDeleteConfirm = () => {
  if (deleteInProgress.value) return
  showDeleteConfirm.value = false
  deleteTarget.value = null
}

const confirmDelete = async () => {
  if (!deleteTarget.value || deleteInProgress.value) return

  deleteInProgress.value = true
  try {
    if (deleteTarget.value.type === 'place') {
      await deletePlace(deleteTarget.value.item)
    } else {
      await deleteBarangay(deleteTarget.value.item)
    }
    showDeleteConfirm.value = false
    deleteTarget.value = null
  } finally {
    deleteInProgress.value = false
  }
}

const viewBarangayDetails = async (barangay) => {
  selectedBarangay.value = barangay
  activeTab.value = 'officers'
  showDetailsModal.value = true
  
  try {
    const [detailsRes, placesRes] = await Promise.all([
      fetch(`http://localhost:3000/api/barangays/${barangay.id}`),
      fetch(`http://localhost:3000/api/barangays/${barangay.id}/places?active_only=0`)
    ])
    const detailsData = await detailsRes.json()
    const placesData = await placesRes.json()

    if (detailsData.success) {
      farmers.value = detailsData.farmers || []
      officers.value = detailsData.officers || []
    }
    places.value = placesData.success ? (placesData.places || []) : []
  } catch (error) {
    console.error('Error fetching barangay details:', error)
    alert('Failed to load barangay details')
  }
}

const openPlacesModal = async (barangay) => {
  await viewBarangayDetails(barangay)
  activeTab.value = 'places'
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedBarangay.value = null
  farmers.value = []
  officers.value = []
  places.value = []
  resetPlaceForm()
  memberSearchQuery.value = ''
}

const resetPlaceForm = () => {
  editingPlaceId.value = null
  placeForm.value = {
    name: '',
    description: '',
    is_active: true
  }
}

const startEditPlace = (place) => {
  editingPlaceId.value = place.id
  placeForm.value = {
    name: place.name || '',
    description: place.description || '',
    is_active: !!place.is_active
  }
}

const savePlace = async () => {
  if (!selectedBarangay.value?.id) return
  if (!String(placeForm.value.name || '').trim()) {
    alert('Place name is required')
    return
  }

  try {
    const isEdit = !!editingPlaceId.value
    const endpoint = isEdit
      ? `http://localhost:3000/api/barangays/${selectedBarangay.value.id}/places/${editingPlaceId.value}`
      : `http://localhost:3000/api/barangays/${selectedBarangay.value.id}/places`

    const res = await fetch(endpoint, {
      method: isEdit ? 'PUT' : 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        name: placeForm.value.name,
        description: placeForm.value.description,
        is_active: placeForm.value.is_active
      })
    })
    const data = await res.json()
    if (!data.success) {
      alert(data.message || 'Failed to save place')
      return
    }

    await viewBarangayDetails(selectedBarangay.value)
    resetPlaceForm()
  } catch (error) {
    console.error('Error saving place:', error)
    alert('Failed to save place')
  }
}

const deletePlace = async (place) => {
  if (!selectedBarangay.value?.id) return

  try {
    const res = await fetch(
      `http://localhost:3000/api/barangays/${selectedBarangay.value.id}/places/${place.id}`,
      { method: 'DELETE', headers: authHeaders(false) }
    )
    const data = await res.json()
    if (!data.success) {
      alert(data.message || 'Failed to delete place')
      return
    }
    await viewBarangayDetails(selectedBarangay.value)
    if (editingPlaceId.value === place.id) resetPlaceForm()
  } catch (error) {
    console.error('Error deleting place:', error)
    alert('Failed to delete place')
  }
}

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatHectares = (value) => {
  if (value == null || value === '') return '0'
  const n = parseFloat(value)
  if (!Number.isFinite(n)) return '0'
  return n.toLocaleString('en-PH', { minimumFractionDigits: 0, maximumFractionDigits: 2 })
}

onMounted(() => {
  fetchBarangays()
})
</script>

<style scoped>
.page-container.barangays-page {
  padding: 2rem;
  max-width: none;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  min-height: calc(100vh - 70px - 3rem);
  box-sizing: border-box;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  color: #eefde6;
  border-radius: 18px;
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
  gap: 0.5rem;
  padding: 0.7rem 1.25rem;
  border: 2px solid #15803d;
  border-radius: 12px;
  font-weight: 700;
  font-size: 1rem;
  cursor: pointer;
  color: #000000;
  background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.28);
  transition: transform 0.15s ease, filter 0.15s ease;
}

.btn-header-add:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.btn-header-icon {
  width: 1.25rem;
  height: 1.25rem;
  flex-shrink: 0;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 1.5rem;
  margin-bottom: 1.75rem;
}

.stat-card {
  background: rgba(24, 39, 30, 0.92);
  padding: 1.5rem;
  border-radius: 12px;
  display: flex;
  align-items: center;
  gap: 1rem;
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-left-width: 4px;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.24), inset 1px 1px 0 rgba(255, 255, 255, 0.04);
  transition: transform 0.15s ease;
}

.stat-card:hover {
  transform: translateY(-2px);
}

.stat-card.stat-total {
  border-left-color: #3b82f6;
}

.stat-card.stat-active {
  border-left-color: #22c55e;
}

.stat-icon-wrap {
  width: 3.5rem;
  height: 3.5rem;
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(190, 235, 203, 0.18);
  color: rgba(186, 240, 200, 0.95);
}

.stat-icon-accent {
  color: #86efac;
  border-color: rgba(74, 222, 128, 0.35);
}

.stat-svg {
  width: 1.65rem;
  height: 1.65rem;
}

.stat-content {
  flex: 1;
  min-width: 0;
}

.stat-value {
  font-size: 2rem;
  font-weight: 800;
  color: #eefde6;
  line-height: 1.15;
}

.stat-label {
  margin-top: 0.35rem;
  font-size: 1rem;
  font-weight: 700;
  color: rgba(229, 235, 231, 0.88);
}

.tools-card {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1.1rem 1.2rem;
  border-radius: 12px;
  background: rgba(28, 42, 33, 0.85);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.22), inset 1px 1px 0 rgba(255, 255, 255, 0.04);
}

.search-bar {
  flex: 1;
  min-width: 240px;
  position: relative;
}

.search-icon-wrap {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  color: rgba(186, 240, 200, 0.55);
  pointer-events: none;
}

.search-svg {
  width: 1.1rem;
  height: 1.1rem;
}

.toolbar-input,
.toolbar-select {
  width: 100%;
  padding: 0.8rem 1rem;
  border-radius: 10px;
  font-size: 1.0625rem;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.24);
  color: #eefde6;
  border: 1px solid rgba(190, 235, 203, 0.24);
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.toolbar-select {
  cursor: pointer;
  min-width: 150px;
  width: auto;
}

.search-input-main {
  padding-left: 2.5rem;
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
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.card {
  background: rgba(28, 42, 33, 0.92);
  border-radius: 12px;
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  overflow: hidden;
  min-height: 200px;
}

.table-container {
  overflow-x: auto;
  border-radius: 12px;
  max-height: min(70vh, 640px);
  overflow-y: auto;
}

.barangays-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: auto;
  min-width: 980px;
}

.barangays-table col.col-name { width: 24%; }
.barangays-table col.col-area { width: 14%; }
.barangays-table col.col-num { width: 10%; }
.barangays-table col.col-status { width: 12%; }
.barangays-table col.col-actions { width: 26%; }

.barangays-table th:first-child,
.barangays-table td:first-child {
  text-align: left;
  padding-left: 1rem !important;
}

.barangays-table th,
.barangays-table td {
  padding: 0.9rem 0.75rem;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  vertical-align: middle;
}

.barangays-table th:not(:last-child),
.barangays-table td:not(:last-child) {
  border-right: 1px solid rgba(203, 213, 225, 0.12);
}

.barangays-table th {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.18) 0%, rgba(45, 212, 191, 0.1) 100%);
  font-weight: 700;
  color: rgba(234, 241, 236, 0.94);
  font-size: 1rem;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  line-height: 1.4;
  white-space: nowrap;
}

.barangays-table td {
  font-size: 1.0625rem;
  line-height: 1.5;
  color: rgba(226, 234, 229, 0.92);
}

.barangays-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.07) !important;
}

.loading-cell,
.empty-cell {
  text-align: center;
  padding: 2rem 1rem !important;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.72);
}

.num-cell {
  font-variant-numeric: tabular-nums;
}

.area-cell {
  text-align: center;
}

.area-value {
  font-weight: 700;
  color: #bbf7d0;
}

.btn-view-area {
  padding: 0.5rem 0.9rem;
  font-size: 0.9375rem;
  font-weight: 700;
  color: #000000;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 2px solid #16a34a;
  border-radius: 8px;
  cursor: pointer;
  transition: filter 0.12s ease;
  white-space: nowrap;
  flex-shrink: 0;
}

.btn-view-area:hover {
  filter: brightness(1.08);
}

.td-name-link {
  font-weight: 700;
  word-break: break-word;
}

.barangay-name-link {
  cursor: pointer;
  color: #86efac;
  transition: color 0.15s ease;
}

.barangay-name-link:hover {
  color: #bbf7d0;
  text-decoration: underline;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 84px;
  padding: 0.4rem 0.75rem;
  border-radius: 10px;
  font-size: 0.9375rem;
  font-weight: 700;
  text-transform: capitalize;
  line-height: 1.3;
  border: 1px solid rgba(190, 235, 203, 0.35);
  background: transparent;
}

.status-pill.active {
  color: #86efac;
  border-color: rgba(16, 185, 129, 0.55);
}

.status-pill.inactive {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.5);
}

.barangays-table tbody tr {
  position: relative;
  isolation: isolate;
}

.td-actions {
  padding-left: 0.65rem !important;
  padding-right: 0.65rem !important;
  min-width: 220px;
  white-space: nowrap;
  background: inherit;
}

.barangays-action-row {
  display: inline-flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  position: relative;
  isolation: isolate;
}

.barangays-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  min-width: 34px;
  min-height: 34px;
  padding: 0;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(10, 24, 18, 0.95);
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: none !important;
  transform: none !important;
  -webkit-text-fill-color: currentColor;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.barangays-icon-btn svg {
  width: 16px;
  height: 16px;
  display: block;
  flex-shrink: 0;
  pointer-events: none;
  -webkit-text-fill-color: currentColor;
}

.barangays-icon-places { color: #ffffff; }
.barangays-icon-edit { color: #fb923c; }
.barangays-icon-delete { color: #ffffff; }

.barangays-icon-btn:hover {
  transform: none;
  box-shadow: none;
}

.barangays-icon-places:hover { color: #5eead4; }
.barangays-icon-edit:hover { color: #fdba74; background: rgba(16, 36, 28, 1); }
.barangays-icon-delete:hover {
  color: #ffffff;
  background: rgba(40, 20, 20, 0.95);
  border-color: rgba(248, 113, 113, 0.35);
}

.font-semibold {
  font-weight: 600;
}

.text-center {
  text-align: center;
}

.modal-overlay {
  position: fixed;
  top: 0;
  right: 0;
  bottom: 0;
  left: var(--app-sidebar-width, 260px);
  background: rgba(6, 12, 9, 0.72);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1200;
  padding: 1.25rem;
}

.modal-overlay-spaced {
  align-items: flex-start;
  padding-top: calc(var(--app-header-height, 70px) + 1.25rem);
  padding-bottom: 1.5rem;
  overflow-y: auto;
}

.modal-content {
  background: rgba(28, 42, 33, 0.96);
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 14px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  margin: 0 auto;
  flex-shrink: 0;
}

.modal-header {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.15rem;
  font-weight: 800;
  color: #eefde6;
}

.close-btn {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(190, 235, 203, 0.15);
  font-size: 1.5rem;
  line-height: 1;
  color: rgba(229, 235, 231, 0.65);
  cursor: pointer;
  width: 2.15rem;
  height: 2.15rem;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  transition: background 0.15s ease, color 0.15s ease;
}

.close-btn:hover {
  background: rgba(74, 222, 128, 0.12);
  color: #eefde6;
}

.modal-body {
  padding: 1.1rem 1.25rem 1.25rem;
}

.modal-footer {
  padding: 0.85rem 1.25rem 1.1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: flex-end;
  gap: 0.65rem;
  flex-wrap: wrap;
}

.btn-secondary {
  padding: 0.55rem 1.1rem;
  background: rgba(0, 0, 0, 0.22);
  color: rgba(229, 235, 231, 0.9);
  border: 1px solid rgba(190, 235, 203, 0.2);
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(190, 235, 203, 0.32);
}

.btn-submit {
  padding: 0.55rem 1.15rem;
  border-radius: 10px;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  border: 1px solid rgba(74, 222, 128, 0.45);
  color: #14532d;
  background: linear-gradient(135deg, #dcfce7 0%, #86efac 100%);
  transition: filter 0.15s ease, transform 0.15s ease;
}

.btn-submit:hover {
  filter: brightness(1.06);
  transform: translateY(-1px);
}

.form-group {
  margin-bottom: 12px;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-weight: 700;
  color: rgba(229, 235, 231, 0.88);
  font-size: 0.8rem;
}

.form-input {
  width: 100%;
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.24);
  color: #eefde6;
  border: 1px solid rgba(190, 235, 203, 0.24);
  transition: border-color 0.15s ease;
  box-sizing: border-box;
}

.form-input:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.55);
}

.form-input option {
  background: #132119;
  color: #eefde6;
}

.form-hint-area {
  margin: 0 0 1rem;
  padding: 0.75rem 0.9rem;
  font-size: 0.975rem;
  font-weight: 600;
  line-height: 1.55;
  color: rgba(238, 253, 230, 0.92);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(190, 235, 203, 0.2);
}

.modal-large {
  width: min(1120px, calc(100vw - var(--app-sidebar-width, 260px) - 2.5rem));
  max-width: min(1120px, calc(100vw - var(--app-sidebar-width, 260px) - 2.5rem));
  max-height: calc(100dvh - var(--app-header-height, 70px) - 2.5rem);
  overflow-y: auto;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
}

.barangay-details-modal .modal-header {
  padding: 1.35rem 1.5rem;
  gap: 1rem;
}

.modal-title-row {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
}

.barangay-details-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 3rem;
  height: 3rem;
  border-radius: 14px;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 2px solid #86efac;
  color: #15803d;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.12);
}

.barangay-details-icon svg {
  width: 1.55rem;
  height: 1.55rem;
}

.modal-title-text {
  min-width: 0;
}

.modal-title-text h2 {
  margin: 0;
  font-size: 1.45rem;
  font-weight: 800;
  line-height: 1.25;
  color: #eefde6;
}

.modal-subtitle {
  margin: 0.2rem 0 0;
  font-size: 1rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.78);
  line-height: 1.35;
}

.modal-large .modal-header h2 {
  font-size: 1.45rem;
  line-height: 1.3;
  padding-right: 0;
}

.modal-large .modal-body {
  padding: 1.25rem 1.5rem 1.5rem;
}

.barangay-details-modal .modal-footer {
  padding: 1rem 1.5rem 1.35rem;
  background: rgba(0, 0, 0, 0.12);
  border-top: 1px solid rgba(190, 235, 203, 0.2);
  border-radius: 0 0 16px 16px;
}

.barangay-details-modal .close-btn {
  width: 2.35rem;
  height: 2.35rem;
  font-size: 1.35rem;
  border-width: 2px;
}

.modal-delete-overlay {
  left: 0;
  z-index: 1300;
  align-items: center;
  padding: 1.25rem;
}

.modal-content.modal-delete {
  max-width: 480px;
  width: 100%;
  border-radius: 16px;
  overflow: hidden;
}

.delete-modal-header {
  padding: 1.25rem 1.35rem;
  gap: 0.75rem;
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

.delete-modal-footer {
  background: rgba(0, 0, 0, 0.1);
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

.compact-form-grid {
  display: grid;
  grid-template-columns: 1.5fr 1fr;
  gap: 10px;
  align-items: end;
}

.filter-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 1.35rem;
  border-bottom: 0 !important;
}

.details-tabs {
  padding-bottom: 0;
}

.tab {
  padding: 0.65rem 1.15rem;
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  color: #14532d !important;
  border-radius: 12px !important;
  font-weight: 700 !important;
  font-size: 0.95rem;
  cursor: pointer;
  transition: background 0.15s ease;
  white-space: nowrap;
}

.tab:hover {
  background: #f0fdf4 !important;
}

.tab.active {
  background: #dcfce7 !important;
}

.modal-search-bar {
  position: relative;
  margin-bottom: 1.1rem;
}

.modal-search-bar .search-icon-wrap {
  left: 14px;
}

.modal-search-input {
  padding-left: 2.65rem !important;
  width: 100%;
}

.tab-content {
  margin-top: 0.5rem;
}

.members-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
}

.members-table,
.places-table {
  width: 100%;
  border-collapse: collapse;
}

.members-table {
  min-width: 980px;
}

.members-table col.members-col-ref { width: 180px; }
.members-table col.members-col-name { width: 190px; }
.members-table col.members-col-role { width: 140px; }
.members-table col.members-col-land { width: 96px; }
.members-table col.members-col-phone { width: 140px; }
.members-table col.members-col-date { width: 128px; }

.members-table .td-ref {
  font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
  font-size: 0.9375rem;
  white-space: nowrap;
  min-width: 180px;
}

.members-table .td-name {
  white-space: nowrap;
  min-width: 190px;
}

.members-table .td-role,
.members-table .td-land,
.members-table .td-phone,
.members-table .td-date {
  white-space: nowrap;
}

.members-table th,
.members-table td,
.places-table th,
.places-table td {
  padding: 0.85rem 0.85rem;
  font-size: 1.0625rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(226, 234, 229, 0.92);
  vertical-align: middle;
}

.members-table th,
.places-table th {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.18) 0%, rgba(45, 212, 191, 0.1) 100%);
  font-weight: 700;
  color: rgba(234, 241, 236, 0.94);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: nowrap;
}

.members-table tbody tr:hover,
.places-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.06);
}

.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.22rem 0.5rem;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: capitalize;
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: transparent;
}

.status-badge.active {
  color: #86efac;
  border-color: rgba(16, 185, 129, 0.5);
}

.status-badge.inactive {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.45);
}

.role-badge {
  display: inline-block;
  padding: 0.35rem 0.65rem;
  border-radius: 8px;
  font-size: 0.8125rem;
  font-weight: 700;
  white-space: nowrap;
  border: 1px solid rgba(190, 235, 203, 0.2);
}

.role-badge.president {
  background: rgba(99, 102, 241, 0.2);
  color: #c7d2fe;
}

.role-badge.treasurer {
  background: rgba(236, 72, 153, 0.18);
  color: #fbcfe8;
}

.role-badge.auditor {
  background: rgba(245, 158, 11, 0.2);
  color: #fde68a;
}

.role-badge.operator {
  background: rgba(14, 165, 233, 0.2);
  color: #bae6fd;
}

.role-badge.operation_manager,
.role-badge.business_manager {
  background: rgba(34, 197, 94, 0.18);
  color: #bbf7d0;
}

.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: rgba(229, 235, 231, 0.65);
  font-size: 0.875rem;
  font-weight: 600;
}

.empty-state.compact {
  padding: 1.1rem 0.75rem;
}

.area-summary-card {
  margin-bottom: 1.15rem;
  padding: 1.15rem 1.25rem;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.14) 0%, rgba(16, 185, 129, 0.08) 100%);
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 12px;
}

.area-summary-title {
  font-size: 0.8125rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(187, 247, 208, 0.92);
}

.area-summary-value {
  margin-top: 0.4rem;
  font-size: 1.85rem;
  font-weight: 800;
  color: #bbf7d0;
  line-height: 1.2;
}

.area-summary-note {
  margin: 0.55rem 0 0;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.5;
  color: rgba(229, 235, 231, 0.85);
}

.places-card {
  border: 1px solid rgba(190, 235, 203, 0.2);
  border-radius: 14px;
  padding: 1.25rem 1.35rem;
  margin-bottom: 0.5rem;
  background: rgba(0, 0, 0, 0.12);
}

.places-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1rem;
}

.places-section-title {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  min-width: 0;
}

.places-section-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2.6rem;
  height: 2.6rem;
  border-radius: 12px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.22) 0%, rgba(16, 185, 129, 0.12) 100%);
  border: 2px solid rgba(134, 239, 172, 0.45);
  color: #86efac;
}

.places-section-icon svg {
  width: 1.25rem;
  height: 1.25rem;
}

.places-header h3 {
  margin: 0;
  font-size: 1.2rem;
  font-weight: 800;
  color: #eefde6;
}

.places-header p {
  margin: 0.25rem 0 0;
  font-size: 0.9375rem;
  line-height: 1.45;
  color: rgba(229, 235, 231, 0.78);
}

.places-count {
  font-size: 0.875rem;
  font-weight: 800;
  color: #14532d;
  background: #bbf7d0;
  border: 1px solid rgba(22, 101, 52, 0.35);
  border-radius: 999px;
  padding: 0.35rem 0.75rem;
  white-space: nowrap;
  flex-shrink: 0;
}

.place-form-card {
  padding: 1rem 1.05rem;
  margin-bottom: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(190, 235, 203, 0.18);
  background: rgba(0, 0, 0, 0.1);
}

.place-form-title {
  margin-bottom: 0.85rem;
  font-size: 0.9375rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(187, 247, 208, 0.92);
}

.place-form-row {
  display: grid;
  grid-template-columns: 1.2fr 1.4fr 0.85fr auto;
  gap: 0.85rem;
  align-items: end;
}

.place-form-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.place-form-label {
  font-size: 0.875rem;
  font-weight: 700;
  color: rgba(229, 235, 231, 0.88);
}

.place-form-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.5rem;
}

.place-status {
  min-width: 0;
  width: 100%;
}

.btn-place-save,
.btn-place-cancel {
  white-space: nowrap;
  font-size: 0.9375rem;
  padding: 0.6rem 1rem;
}

.places-table-wrap {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
}

.places-table {
  min-width: 720px;
}

.places-table col.places-col-name { width: 180px; }
.places-table col.places-col-desc { width: auto; }
.places-table col.places-col-status { width: 120px; }
.places-table col.places-col-actions { width: 130px; }

.places-table .td-place-name {
  white-space: nowrap;
  min-width: 160px;
}

.places-table .td-place-desc {
  min-width: 180px;
}

.places-table .td-place-status {
  white-space: nowrap;
}

.places-table .th-actions,
.places-table .td-actions {
  text-align: center !important;
  min-width: 130px;
}

.places-card .barangays-icon-btn {
  width: 42px;
  height: 42px;
  min-width: 42px;
  min-height: 42px;
  border-radius: 10px;
  border-width: 2px;
}

.places-card .barangays-icon-btn svg {
  width: 20px;
  height: 20px;
}

.places-card .place-status-badge {
  padding: 0.35rem 0.65rem;
  font-size: 0.875rem;
  font-weight: 700;
  text-transform: capitalize;
}

@media (max-width: 1024px) {
  .page-container.barangays-page {
    margin: 0 -1rem;
    width: calc(100% + 2rem);
  }
}

@media (min-width: 1400px) {
  .page-container.barangays-page {
    margin: 0 -2rem;
    width: calc(100% + 4rem);
  }
}

@media (max-width: 860px) {
  .place-form-row {
    grid-template-columns: 1fr;
  }

  .place-form-actions {
    width: 100%;
  }

  .place-form-actions .btn-place-save,
  .place-form-actions .btn-place-cancel {
    flex: 1;
    min-width: 0;
  }

  .compact-form-grid {
    grid-template-columns: 1fr;
  }

  .page-title {
    font-size: 1.55rem;
  }
}

@media (max-width: 768px) {
  .page-container.barangays-page {
    margin: 0 -0.75rem;
    width: calc(100% + 1.5rem);
    padding: 1rem;
    border-radius: 0;
  }

  .barangays-table th,
  .barangays-table td {
    padding: 0.75rem 0.55rem;
    font-size: 0.9375rem;
  }

  .table-container {
    max-height: none;
  }
}

@media (max-width: 1024px) {
  .modal-overlay,
  .modal-overlay-spaced {
    left: 0;
  }

  .modal-large {
    width: min(1120px, calc(100vw - 1.5rem));
    max-width: calc(100vw - 1.5rem);
  }
}

@media (max-width: 480px) {
  .page-container.barangays-page {
    margin: 0 -0.5rem;
    width: calc(100% + 1rem);
  }

  .modal-overlay-spaced {
    padding-top: calc(var(--app-header-height, 70px) + 0.85rem);
    padding-left: 0.75rem;
    padding-right: 0.75rem;
  }

  .modal-large {
    max-height: calc(100dvh - var(--app-header-height, 70px) - 1.75rem);
  }

  .modal-large .modal-header {
    padding: 1.15rem 1.1rem;
  }

  .modal-large .modal-body {
    padding: 1rem 1.1rem 1.15rem;
  }
}

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
.page-container.barangays-page.light-theme {
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
}

.page-container.barangays-page.light-theme .page-header-split {
  background: #ffffff;
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.page-container.barangays-page.light-theme .page-title {
  color: #000000;
}

.page-container.barangays-page.light-theme .page-subtitle {
  color: #000000;
}

.page-container.barangays-page.light-theme .stat-label {
  color: #000000;
}

.page-container.barangays-page.light-theme .stat-card {
  background: #ffffff;
  border: 2px solid #86efac;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
}

.page-container.barangays-page.light-theme .stat-icon-wrap {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.page-container.barangays-page.light-theme .stat-value {
  color: #000000;
}

.page-container.barangays-page.light-theme .tools-card {
  background: #ffffff;
  border: 2px solid #86efac;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
}

.page-container.barangays-page.light-theme .search-icon-wrap {
  color: #15803d;
}

.page-container.barangays-page.light-theme .toolbar-input,
.page-container.barangays-page.light-theme .toolbar-select {
  background: #ffffff;
  border: 2px solid #94a3b8;
  color: #000000;
  font-size: 1rem;
}

.page-container.barangays-page.light-theme .toolbar-input::placeholder {
  color: #475569;
  opacity: 1;
}

.page-container.barangays-page.light-theme .toolbar-select option {
  background: #ffffff;
  color: #052e16;
}

.page-container.barangays-page.light-theme .card {
  background: #ffffff;
  border: 2px solid #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.page-container.barangays-page.light-theme .barangays-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #000000;
  border-bottom: 1px solid #86efac;
}

.page-container.barangays-page.light-theme .barangays-table td {
  color: #000000;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.page-container.barangays-page.light-theme .barangays-table th:not(:last-child),
.page-container.barangays-page.light-theme .barangays-table td:not(:last-child) {
  border-right: 1px solid #e2e8f0;
}

.page-container.barangays-page.light-theme .barangays-table tbody tr:hover {
  background: #ecfdf5 !important;
}

.page-container.barangays-page.light-theme .loading-cell,
.page-container.barangays-page.light-theme .empty-cell {
  color: #000000;
}

.page-container.barangays-page.light-theme .area-value {
  color: #000000;
  font-weight: 700;
}

.page-container.barangays-page.light-theme .barangay-name-link {
  color: #000000;
  text-decoration: underline;
}

.page-container.barangays-page.light-theme .barangay-name-link:hover {
  color: #15803d;
}

.page-container.barangays-page.light-theme .status-pill.active {
  color: #000000;
  border: 2px solid #16a34a;
  background: #ffffff;
}

.page-container.barangays-page.light-theme .status-pill.inactive {
  color: #991b1b;
  border: 2px solid #ef4444;
  background: #ffffff;
}

.page-container.barangays-page.light-theme .btn-view-area {
  color: #000000;
  background: #ffffff;
  border: 2px solid #16a34a;
}

.page-container.barangays-page.light-theme .btn-header-add {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  border: 2px solid #14532d;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.28);
}

.page-container.barangays-page.light-theme .btn-header-add:hover {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  filter: none;
}

.page-container.barangays-page.light-theme .modal-content {
  background: #fffef9;
  border: 2px solid #86efac;
  color: #052e16;
}

.page-container.barangays-page.light-theme .modal-header {
  border-bottom: 1px solid #bbf7d0;
}

.page-container.barangays-page.light-theme .modal-header h2 {
  color: #052e16;
}

.page-container.barangays-page.light-theme .barangay-details-modal .modal-title-text h2 {
  color: #000000;
}

.page-container.barangays-page.light-theme .barangay-details-modal .modal-subtitle {
  color: #166534;
}

.page-container.barangays-page.light-theme .barangay-details-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: #86efac;
  color: #15803d;
}

.page-container.barangays-page.light-theme .barangay-details-modal .modal-footer {
  background: #f0fdf4;
  border-top: 2px solid #86efac;
}

.page-container.barangays-page.light-theme .barangay-details-modal .close-btn {
  background: #ffffff;
  border: 2px solid #cbd5e1;
  color: #000000;
}

.page-container.barangays-page.light-theme .members-table-wrap {
  border-color: #cbd5e1;
  background: #ffffff;
}

.page-container.barangays-page.light-theme .close-btn {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #64748b;
}

.page-container.barangays-page.light-theme .modal-footer {
  border-top: 1px solid #bbf7d0;
}

.page-container.barangays-page.light-theme .form-group label {
  color: #000000;
  font-size: 1rem;
}

.page-container.barangays-page.light-theme .form-input {
  background: #ffffff;
  border: 2px solid #94a3b8;
  color: #000000;
  font-size: 1rem;
}

.page-container.barangays-page.light-theme .form-hint-area {
  background: #f0fdf4;
  border: 2px solid #86efac;
  color: #000000;
  font-size: 1rem;
  font-weight: 600;
  line-height: 1.55;
}

.page-container.barangays-page.light-theme .btn-secondary {
  color: #000000;
  -webkit-text-fill-color: #000000;
  background: #ffffff;
  border: 2px solid #64748b;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  filter: none;
  transform: none;
}

.page-container.barangays-page.light-theme .btn-secondary:hover {
  background: #f1f5f9;
  border-color: #475569;
  color: #000000;
  -webkit-text-fill-color: #000000;
  filter: none;
}

.page-container.barangays-page.light-theme .members-table th,
.page-container.barangays-page.light-theme .places-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #000000;
}

.page-container.barangays-page.light-theme .members-table td,
.page-container.barangays-page.light-theme .places-table td {
  color: #000000;
  border-bottom: 1px solid #e2e8f0;
  background: #ffffff;
}

.page-container.barangays-page.light-theme .members-table tbody tr:hover,
.page-container.barangays-page.light-theme .places-table tbody tr:hover {
  background: #ecfdf5;
}

.page-container.barangays-page.light-theme .empty-state {
  color: #000000;
  font-size: 1rem;
}

.page-container.barangays-page.light-theme .area-summary-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
}

.page-container.barangays-page.light-theme .area-summary-title {
  color: #166534;
}

.page-container.barangays-page.light-theme .area-summary-value {
  color: #15803d;
}

.page-container.barangays-page.light-theme .area-summary-note {
  color: #000000;
  font-size: 1rem;
}

.page-container.barangays-page.light-theme .places-card {
  background: #f8fdf9;
  border: 2px solid #bbf7d0;
}

.page-container.barangays-page.light-theme .places-section-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: #86efac;
  color: #15803d;
}

.page-container.barangays-page.light-theme .places-header h3 {
  color: #000000;
}

.page-container.barangays-page.light-theme .places-header p {
  color: #166534;
}

.page-container.barangays-page.light-theme .place-form-card {
  background: #ffffff;
  border: 2px solid #e2e8f0;
}

.page-container.barangays-page.light-theme .place-form-title {
  color: #166534;
}

.page-container.barangays-page.light-theme .place-form-label {
  color: #000000;
}

.page-container.barangays-page.light-theme .places-table-wrap {
  border-color: #cbd5e1;
  background: #ffffff;
}

.page-container.barangays-page.light-theme .places-card .place-status-badge.active {
  color: #15803d;
  background: #f0fdf4;
  border-color: #86efac;
  font-size: 0.875rem;
}

.page-container.barangays-page.light-theme .places-card .place-status-badge.inactive {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fca5a5;
  font-size: 0.875rem;
}

.page-container.barangays-page.light-theme .modal-delete .modal-title-text h2 {
  color: #000000;
}

.page-container.barangays-page.light-theme .modal-delete .delete-confirm-message {
  color: #166534 !important;
}

.page-container.barangays-page.light-theme .modal-delete .delete-warning-text {
  background: #fef2f2;
  border: 2px solid #fca5a5;
  color: #991b1b;
}

.page-container.barangays-page.light-theme .modal-delete .delete-warning-icon {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #fca5a5;
  color: #b91c1c;
}

.page-container.barangays-page.light-theme .modal-delete .delete-modal-footer {
  background: #f8fafc;
  border-top: 2px solid #e2e8f0;
}

.page-container.barangays-page.light-theme .modal-delete .btn-delete-confirm {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: linear-gradient(135deg, #dc2626 0%, #b91c1c 100%) !important;
  border: 2px solid #991b1b !important;
}

.page-container.barangays-page.light-theme .status-badge.active {
  color: #15803d;
  background: #f0fdf4;
  border-color: #86efac;
}

.page-container.barangays-page.light-theme .status-badge.inactive {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fca5a5;
}

.page-container.barangays-page.light-theme .role-badge {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #14532d !important;
}

.page-container.barangays-page.light-theme .role-badge.president {
  background: #e0e7ff !important;
  color: #4338ca !important;
  border-color: #a5b4fc !important;
}

.page-container.barangays-page.light-theme .role-badge.treasurer {
  background: #fce7f3 !important;
  color: #be185d !important;
  border-color: #f9a8d4 !important;
}

.page-container.barangays-page.light-theme .role-badge.auditor {
  background: #fef9c3 !important;
  color: #a16207 !important;
  border-color: #fcd34d !important;
}

.page-container.barangays-page.light-theme .role-badge.operator {
  background: #e0f2fe !important;
  color: #0369a1 !important;
  border-color: #7dd3fc !important;
}

.page-container.barangays-page.light-theme .role-badge.farmer {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
  border-color: #93c5fd !important;
}

.page-container.barangays-page.light-theme .role-badge.admin {
  background: #fef9c3 !important;
  color: #a16207 !important;
  border-color: #fcd34d !important;
}

.page-container.barangays-page.light-theme .role-badge.agriculturist {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #86efac !important;
}

.page-container.barangays-page.light-theme .role-badge.operation_manager,
.page-container.barangays-page.light-theme .role-badge.business_manager {
  background: #dcfce7 !important;
  color: #15803d !important;
  border-color: #bbf7d0 !important;
}

.page-container.barangays-page.light-theme .modal-search-input {
  background: #ffffff !important;
  border: 1.5px solid #cbd5e1 !important;
  color: #052e16 !important;
}

.page-container.barangays-page.light-theme .tab.active {
  color: #052e16 !important;
  background: #dcfce7 !important;
  border-color: #16a34a !important;
}

.page-container.barangays-page.light-theme .barangays-table tbody tr:nth-child(even) td:not(.td-actions) {
  background: #f8fdf9;
}

.page-container.barangays-page.light-theme .barangays-table tbody tr:nth-child(even) td.td-actions {
  background: #ffffff;
}

.page-container.barangays-page.light-theme .barangays-icon-btn {
  background: #374151;
  border-color: #4b5563;
}

.page-container.barangays-page.light-theme .barangays-icon-places {
  color: #ffffff;
}

.page-container.barangays-page.light-theme .barangays-icon-edit {
  color: #ea580c;
}

.page-container.barangays-page.light-theme .barangays-icon-delete {
  color: #ffffff;
}

.page-container.barangays-page.light-theme .barangays-icon-edit:hover {
  color: #f97316;
  background: #4b5563;
}

.page-container.barangays-page.light-theme .barangays-icon-delete:hover {
  color: #ffffff;
  background: #7f1d1d;
  border-color: #b91c1c;
}

.page-container.barangays-page.light-theme .members-table tbody tr:nth-child(even) td,
.page-container.barangays-page.light-theme .places-table tbody tr:nth-child(even) td {
  background: #f8fdf9;
}

.page-container.barangays-page.light-theme .font-semibold {
  color: #000000;
}

.page-container.barangays-page.light-theme .btn-submit {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  border: 2px solid #14532d;
  font-size: 1rem;
  font-weight: 700;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.28);
}

.page-container.barangays-page.light-theme .btn-submit:hover {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  filter: none;
}
</style>
