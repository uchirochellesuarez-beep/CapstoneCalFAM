<template>
  <div class="page-container barangays-page">
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
              <div class="action-buttons-row">
              <button type="button" class="btn-view-area" @click="viewBarangayDetails(barangay)">
                View
              </button>
              <button type="button" @click="openPlacesModal(barangay)" class="icon-action icon-places" title="Manage Places">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" aria-hidden="true"><path d="M12 21s-8-5.5-8-11.8A8 8 0 0112 3a8 8 0 018 6.2c0 6.3-8 11.8-8 11.8z" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="10.5" r="2.75" /></svg>
              </button>
              <button type="button" @click="openEditModal(barangay)" class="icon-action icon-edit" title="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2 2 0 000-2.83L17.83 7a2 2 0 00-2.83 0L4 16.5V20z" stroke-linecap="round" stroke-linejoin="round"/></svg>
              </button>
              <button type="button" @click="deleteBarangay(barangay)" class="icon-action icon-delete" title="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M10 11v8M14 11v8M8 7l1 13h6l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
            Total land area is computed automatically from registered members’ farm hectares (approved farmers and officers).
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
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal-content modal-large" @click.stop>
        <div class="modal-header">
          <h2>{{ selectedBarangay?.name }}</h2>
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
              <div>
                <h3>Service Places</h3>
                <p>Used in machinery booking location choices.</p>
              </div>
              <span class="places-count">{{ places.length }} total</span>
            </div>

            <div class="place-form-row">
              <input
                v-model="placeForm.name"
                type="text"
                class="form-input"
                placeholder="Place name (e.g. Sitio Proper)"
              />
              <input
                v-model="placeForm.description"
                type="text"
                class="form-input"
                placeholder="Description (optional)"
              />
              <select v-model="placeForm.is_active" class="form-input place-status">
                <option :value="true">Active</option>
                <option :value="false">Inactive</option>
              </select>
              <button type="button" class="btn-submit btn-place-save" @click="savePlace">
                {{ editingPlaceId ? 'Update' : 'Add Place' }}
              </button>
              <button
                v-if="editingPlaceId"
                type="button"
                class="btn-secondary"
                @click="resetPlaceForm"
              >
                Cancel
              </button>
            </div>

            <div class="places-table-wrap" v-if="places.length">
              <table class="places-table">
                <thead>
                  <tr>
                    <th>Place</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="place in places" :key="place.id">
                    <td class="font-semibold">{{ place.name }}</td>
                    <td>{{ place.description || '—' }}</td>
                    <td>
                      <span :class="['status-badge', place.is_active ? 'active' : 'inactive']">
                        {{ place.is_active ? 'active' : 'inactive' }}
                      </span>
                    </td>
                    <td class="td-actions">
                      <div class="action-buttons-row">
                      <button type="button" class="icon-action icon-edit" title="Edit" @click="startEditPlace(place)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" aria-hidden="true"><path d="M4 20h4l10.5-10.5a2 2 0 000-2.83L17.83 7a2 2 0 00-2.83 0L4 16.5V20z" stroke-linecap="round" stroke-linejoin="round"/></svg>
                      </button>
                      <button type="button" class="icon-action icon-delete" title="Delete" @click="deletePlace(place)">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" aria-hidden="true"><path d="M4 7h16M9 7V5h6v2M10 11v8M14 11v8M8 7l1 13h6l1-13" stroke-linecap="round" stroke-linejoin="round"/></svg>
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
              <table v-else class="members-table">
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
                    <td>{{ officer.reference_number }}</td>
                    <td class="font-semibold">{{ officer.full_name }}</td>
                    <td>
                      <span class="role-badge" :class="officer.role">
                        {{ officer.role }}
                      </span>
                    </td>
                    <td>{{ formatHectares(officer.land_area) }}</td>
                    <td>{{ officer.phone_number }}</td>
                    <td>{{ formatDate(officer.registered_on) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <!-- Farmers Tab -->
            <div v-if="activeTab === 'farmers'">
              <div v-if="farmers.length === 0" class="empty-state">
                No farmers registered from this barangay yet.
              </div>
              <div v-else-if="filteredFarmers.length === 0" class="empty-state">
                No farmers found matching "{{ memberSearchQuery }}".
              </div>
              <table v-else class="members-table">
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
                    <td>{{ farmer.reference_number }}</td>
                    <td class="font-semibold">{{ farmer.full_name }}</td>
                    <td>{{ formatHectares(farmer.land_area) }}</td>
                    <td>{{ farmer.phone_number }}</td>
                    <td>{{ formatDate(farmer.registered_on) }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button type="button" @click="closeDetailsModal" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useFarmerStore } from '../stores/farmerStore'
import { useAuthStore } from '../stores/authStore'

const farmerStore = useFarmerStore()
const authStore = useAuthStore()
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
  if (!confirm(`Are you sure you want to delete ${barangay.name}?`)) {
    return
  }

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
  if (!confirm(`Delete place "${place.name}"?`)) return

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
  padding: 0.62rem 1.15rem;
  border: 1px solid rgba(74, 222, 128, 0.45);
  border-radius: 12px;
  font-weight: 700;
  font-size: 0.9rem;
  cursor: pointer;
  color: #14532d;
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
  font-size: 1.75rem;
  font-weight: 800;
  color: #eefde6;
  line-height: 1.15;
}

.stat-label {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.78);
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
  padding: 0.62rem 0.85rem;
  border-radius: 10px;
  font-size: 0.875rem;
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
  table-layout: fixed;
  min-width: 0;
}

.barangays-table col.col-name { width: 22%; }
.barangays-table col.col-area { width: 12%; }
.barangays-table col.col-num { width: 8%; }
.barangays-table col.col-status { width: 10%; }
.barangays-table col.col-actions { width: 18%; }

.barangays-table th:first-child,
.barangays-table td:first-child {
  text-align: left;
  padding-left: 0.4rem !important;
}

.barangays-table th,
.barangays-table td {
  padding: 0.35rem 0.28rem;
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
  font-size: 0.62rem;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  line-height: 1.1;
}

.barangays-table td {
  font-size: 0.68rem;
  line-height: 1.15;
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
  padding: 0.2rem 0.45rem;
  font-size: 0.6rem;
  font-weight: 700;
  color: #14532d;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 1px solid rgba(74, 222, 128, 0.45);
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
  min-width: 58px;
  padding: 0.18rem 0.38rem;
  border-radius: 8px;
  font-size: 0.58rem;
  font-weight: 700;
  text-transform: capitalize;
  line-height: 1;
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

.td-actions {
  padding-left: 0.35rem !important;
  padding-right: 0.35rem !important;
}

.action-buttons-row {
  display: flex;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: center;
  gap: 0.22rem;
}

.icon-action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.55rem;
  height: 1.55rem;
  padding: 0;
  border-radius: 7px;
  border: 1px solid rgba(190, 235, 203, 0.22);
  background: rgba(0, 0, 0, 0.22);
  color: rgba(226, 234, 229, 0.9);
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.icon-action svg {
  width: 0.78rem;
  height: 0.78rem;
}

.icon-action:hover {
  background: rgba(74, 222, 128, 0.12);
  border-color: rgba(74, 222, 128, 0.35);
}

.icon-places:hover {
  color: #5eead4;
}

.icon-edit:hover {
  color: #93c5fd;
}

.icon-delete:hover {
  color: #fca5a5;
  border-color: rgba(248, 113, 113, 0.4);
}

.font-semibold {
  font-weight: 600;
}

.text-center {
  text-align: center;
}

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(6, 12, 9, 0.72);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
}

.modal-content {
  background: rgba(28, 42, 33, 0.96);
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 14px;
  width: 100%;
  max-width: 460px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
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
  margin: 0 0 12px;
  padding: 0.55rem 0.65rem;
  font-size: 0.75rem;
  line-height: 1.45;
  color: rgba(229, 235, 231, 0.78);
  background: rgba(0, 0, 0, 0.2);
  border-radius: 10px;
  border: 1px solid rgba(190, 235, 203, 0.16);
}

.modal-large {
  max-width: 900px;
  max-height: 90vh;
  overflow-y: auto;
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
  padding: 0.55rem 1rem;
  background: #ffffff !important;
  border: 2px solid #166534 !important;
  color: #14532d !important;
  border-radius: 12px !important;
  font-weight: 700 !important;
  font-size: 0.8rem;
  cursor: pointer;
  transition: background 0.15s ease;
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

.members-table,
.places-table {
  width: 100%;
  border-collapse: collapse;
}

.members-table th,
.members-table td,
.places-table th,
.places-table td {
  padding: 0.55rem 0.45rem;
  font-size: 0.76rem;
  text-align: left;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  color: rgba(226, 234, 229, 0.92);
}

.places-table th,
.places-table td {
  font-size: 0.74rem;
}

.members-table th,
.places-table th {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.18) 0%, rgba(45, 212, 191, 0.1) 100%);
  font-weight: 700;
  color: rgba(234, 241, 236, 0.94);
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.02em;
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
  padding: 0.22rem 0.5rem;
  border-radius: 8px;
  font-size: 0.65rem;
  font-weight: 700;
  text-transform: capitalize;
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
  padding: 1rem 1.1rem;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.14) 0%, rgba(16, 185, 129, 0.08) 100%);
  border: 1px solid rgba(74, 222, 128, 0.28);
  border-radius: 12px;
}

.area-summary-title {
  font-size: 0.68rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: rgba(187, 247, 208, 0.92);
}

.area-summary-value {
  margin-top: 0.35rem;
  font-size: 1.65rem;
  font-weight: 800;
  color: #bbf7d0;
}

.area-summary-note {
  margin: 0.45rem 0 0;
  font-size: 0.8rem;
  line-height: 1.4;
  color: rgba(229, 235, 231, 0.72);
}

.places-card {
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
  padding: 1rem;
  margin-bottom: 1rem;
  background: rgba(0, 0, 0, 0.16);
}

.places-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
}

.places-header h3 {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  color: #eefde6;
}

.places-header p {
  margin: 4px 0 0;
  font-size: 0.72rem;
  color: rgba(229, 235, 231, 0.65);
}

.places-count {
  font-size: 0.72rem;
  font-weight: 800;
  color: #14532d;
  background: #bbf7d0;
  border: 1px solid rgba(22, 101, 52, 0.35);
  border-radius: 999px;
  padding: 4px 10px;
  white-space: nowrap;
}

.place-form-row {
  display: grid;
  grid-template-columns: 1.3fr 1.6fr 0.9fr auto auto;
  gap: 8px;
  margin-bottom: 12px;
}

.place-status {
  min-width: 110px;
}

.btn-place-save {
  white-space: nowrap;
}

.places-table-wrap {
  overflow-x: auto;
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
    padding: 0.55rem 0.35rem;
    font-size: 0.72rem;
  }

  .table-container {
    max-height: none;
  }
}

@media (max-width: 480px) {
  .page-container.barangays-page {
    margin: 0 -0.5rem;
    width: calc(100% + 1rem);
  }
}
</style>
