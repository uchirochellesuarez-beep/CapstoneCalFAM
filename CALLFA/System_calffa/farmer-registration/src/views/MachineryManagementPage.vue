<template>
  <div class="machinery-management-page" :class="{ 'light-theme': isLight }">
    <!-- Page Header -->
    <div class="page-header">
      <div class="header-content">
        <h1 class="page-title">Machinery Management System</h1>
        <p class="page-subtitle" v-if="isPresidentRole">Manage machinery inventory and monitor bookings for your barangay</p>
        <p class="page-subtitle" v-else-if="!isAdminOnly">Monitor machinery bookings</p>
      </div>
      <button v-if="isAdminRole" @click="showInventoryModal = true" class="btn-primary machinery-inventory-btn">
        Machinery Inventory
      </button>
    </div>

    <!-- Stats Overview (Hidden for Admin-Only) -->
    <div v-if="!isAdminOnly" class="stats-grid">
      <div class="stat-card">
        <div class="stat-content">
          <div class="stat-label">Total Machinery</div>
          <div class="stat-value">{{ totalMachinery }}</div>
        </div>
      </div>
      <div class="stat-card stat-success">
        <div class="stat-content">
          <div class="stat-label">Available</div>
          <div class="stat-value">{{ availableMachinery }}</div>
        </div>
      </div>
      <div class="stat-card stat-pending">
        <div class="stat-content">
          <div class="stat-label">Pending Bookings</div>
          <div class="stat-value">{{ pendingBookingsCount }}</div>
        </div>
      </div>
      <div class="stat-card stat-info">
        <div class="stat-content">
          <div class="stat-label">Total Revenue</div>
          <div class="stat-value">₱{{ formatNumber(totalRevenue) }}</div>
        </div>
      </div>
    </div>

    <!-- Admin Inventory View -->
    <div v-if="isAdminOnly" class="section">
      <h2 class="section-title">Machinery Inventory by Barangay</h2>
      
      <!-- Admin Inventory Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label class="filter-label">Status</label>
          <select v-model="adminFilters.status" @change="applyAdminFilters" class="filter-select">
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="In Use">In Use</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Unavailable">Unavailable</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Machinery Type</label>
          <select v-model="adminFilters.machinery_type" @change="applyAdminFilters" class="filter-select">
            <option value="">All Types</option>
            <option v-for="type in distinctMachineryTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Barangay</label>
          <select v-model="adminFilters.barangay_id" @change="applyAdminFilters" class="filter-select">
            <option value="">All Barangays</option>
            <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.id">
              {{ barangay.name }}
            </option>
          </select>
        </div>
      </div>

      <!-- Admin Inventory Table -->
      <div class="inventory-table-container">
        <div class="inventory-actions">
          <button @click="showAddMachineryModal = true" class="btn-success btn-inventory-add">
            <svg class="btn-add-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Add New Machinery
          </button>
        </div>
        <table class="inventory-table inventory-table-admin">
          <colgroup>
            <col class="col-name" />
            <col class="col-type" />
            <col class="col-barangay" />
            <col class="col-pricing" />
            <col class="col-capacity" />
            <col class="col-status" />
            <col class="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Barangay</th>
              <th>Pricing</th>
              <th>Max Cap.</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="7" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>Loading machinery...</span>
              </td>
            </tr>
            <tr v-else-if="filteredInventory.length === 0">
              <td colspan="7" class="empty-cell">No machinery found matching the filters</td>
            </tr>
            <tr v-else v-for="machine in filteredInventory" :key="machine.id">
              <td>{{ machine.machinery_name }}</td>
              <td>
                <span class="badge" :class="'badge-' + getMachineryTypeClass(machine.machinery_type)">
                  {{ machine.machinery_type }}
                </span>
              </td>
              <td>
                <span class="barangay-badge">{{ getBarangayName(machine.barangay_id) }}</span>
              </td>
              <td class="pricing-cell">
                <div class="price-stack">
                  <div class="price-block price-block-member">
                    <span class="price-block-label">Member</span>
                    <span class="price-block-value">
                      ₱{{ formatNumber(machine.member_price || machine.price_per_unit) }}
                      <small>{{ formatUnitLabel(machine.unit_type) }}</small>
                    </span>
                  </div>
                  <div class="price-block price-block-nonmember">
                    <span class="price-block-label">Non-Member</span>
                    <span class="price-block-value">
                      ₱{{ formatNumber(machine.non_member_price || (machine.price_per_unit * 1.25)) }}
                      <small>{{ formatUnitLabel(machine.unit_type) }}</small>
                    </span>
                  </div>
                </div>
              </td>
              <td class="capacity-cell">
                <span v-if="machine.max_capacity">{{ formatCapacity(machine) }}</span>
                <span v-else>-</span>
              </td>
              <td>
                <span class="status-badge" :class="'status-' + getStatusClass(machine.status)">
                  {{ machine.status }}
                </span>
              </td>
              <td>
                <div class="action-buttons">
                  <button type="button" @click="editMachinery(machine)" class="machinery-action-btn machinery-action-edit" title="Edit" aria-label="Edit">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" @click="deleteMachineryConfirm(machine)" class="machinery-action-btn machinery-action-delete" title="Delete" aria-label="Delete">
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
    </div>

    <!-- President's Machinery Inventory Section -->
    <div v-if="isPresidentRole" class="section">
      <h2 class="section-title">Machinery Inventory ({{ barangays.find(b => b.id === userBarangayId)?.name || 'Your Barangay' }})</h2>
      
      <div class="inventory-actions standalone-actions">
        <button @click="showAddMachineryModal = true" class="btn-success btn-inventory-add">
          <svg class="btn-add-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" aria-hidden="true">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
          Add Machinery
        </button>
      </div>

      <div v-if="inventory.length === 0" class="empty-state">
        <p>No machinery in your barangay yet</p>
      </div>

      <div v-else class="inventory-table-container">
        <table class="inventory-table inventory-table-president">
          <colgroup>
            <col class="col-name" />
            <col class="col-type" />
            <col class="col-pricing" />
            <col class="col-status" />
            <col class="col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>Name</th>
              <th>Type</th>
              <th>Pricing</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="machine in inventory" :key="machine.id">
              <td><strong>{{ machine.machinery_name }}</strong></td>
              <td>
                <span :class="['badge', `badge-${getMachineryTypeClass(machine.machinery_type)}`]">
                  {{ machine.machinery_type }}
                </span>
              </td>
              <td class="pricing-cell">
                <div class="price-stack">
                  <div class="price-block price-block-member">
                    <span class="price-block-label">Member</span>
                    <span class="price-block-value">
                      ₱{{ formatNumber(machine.member_price || machine.price_per_unit) }}
                      <small v-if="machine.unit_type">{{ formatUnitLabel(machine.unit_type) }}</small>
                    </span>
                  </div>
                  <div class="price-block price-block-nonmember">
                    <span class="price-block-label">Non-Member</span>
                    <span class="price-block-value">
                      ₱{{ formatNumber(machine.non_member_price || (machine.price_per_unit * 1.25)) }}
                      <small v-if="machine.unit_type">{{ formatUnitLabel(machine.unit_type) }}</small>
                    </span>
                  </div>
                </div>
              </td>
              <td>
                <span :class="['status-badge', `status-${getStatusClass(machine.status)}`]">
                  {{ machine.status }}
                </span>
              </td>
              <td class="actions-cell">
                <div class="action-buttons">
                  <button type="button" @click="editMachinery(machine)" class="machinery-action-btn machinery-action-edit" title="Edit" aria-label="Edit">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" @click="deleteMachineryConfirm(machine)" class="machinery-action-btn machinery-action-delete" title="Delete" aria-label="Delete">
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
    </div>

    <!-- All Bookings Table -->
    <div v-if="!isAdminOnly" class="section">
      <h2 class="section-title">Machinery Bookings</h2>
      
      <!-- Filters -->
      <div class="filters-section">
        <div class="filter-group">
          <label class="filter-label">Status</label>
          <select v-model="filters.status" @change="applyFilters" class="filter-select">
            <option value="">All Status</option>
            <option value="Pending">Pending</option>
            <option value="Approved">Approved</option>
            <option value="Rejected">Rejected</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
          </select>
        </div>
        <div class="filter-group">
          <label class="filter-label">Machinery Type</label>
          <select v-model="filters.machinery_type" @change="applyFilters" class="filter-select">
            <option value="">All Types</option>
            <option v-for="type in distinctMachineryTypes" :key="type" :value="type">
              {{ type }}
            </option>
          </select>
        </div>
      </div>

      <!-- Bookings Table -->
      <div class="table-container">
        <table class="bookings-table">
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
              <th>Farmer</th>
              <th>Machinery</th>
              <th>Date</th>
              <th>Location</th>
              <th>Area/Qty</th>
              <th>Total</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="loading">
              <td colspan="8" class="loading-cell">
                <div class="loading-spinner"></div>
                <span>Loading bookings...</span>
              </td>
            </tr>
            <tr v-else-if="bookings.length === 0">
              <td colspan="8" class="empty-cell">
                No bookings found.
              </td>
            </tr>
            <tr v-else v-for="booking in bookings" :key="booking.id">
              <td>
                <div class="farmer-info">
                  <strong>{{ booking.farmer_name }}</strong>
                  <small>{{ booking.reference_number }}</small>
                </div>
              </td>
              <td>
                <div class="machinery-info">
                  <strong>{{ booking.machinery_name }}</strong>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(booking.machinery_type)">
                    {{ booking.machinery_type }}
                  </span>
                </div>
              </td>
              <td>{{ formatDate(booking.booking_date) }}</td>
              <td>{{ booking.service_location }}</td>
              <td>{{ booking.area_size }} {{ booking.area_unit }}</td>
              <td class="price-cell">₱{{ formatNumber(booking.total_price) }}</td>
              <td>
                <span class="status-badge" :class="'status-' + getBookingStatusClass(booking.status)">
                  {{ booking.status }}
                </span>
              </td>
              <td>
                <button @click="viewBooking(booking)" class="btn-icon-small booking-view-btn" title="View Details" aria-label="View booking details">
                  <svg class="booking-view-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                    <path d="M2 12s3.6-6 10-6 10 6 10 6-3.6 6-10 6-10-6-10-6z"></path>
                    <circle cx="12" cy="12" r="2.7"></circle>
                  </svg>
                </button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- Inventory Modal (Hidden for Admin) -->
    <div v-if="showInventoryModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content modal-xlarge inv2-modal">

        <!-- ── Header ── -->
        <div class="inv2-header">
          <div class="inv2-header-left">
            <div class="inv2-header-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
            </div>
            <div>
              <h2 class="inv2-title">Machinery Inventory</h2>
              <p class="inv2-subtitle">{{ invFiltered.length }} record{{ invFiltered.length !== 1 ? 's' : '' }} found</p>
            </div>
          </div>
          <div class="inv2-header-right">
            <!-- View toggle -->
            <div class="inv2-view-toggle">
              <button type="button" class="inv2-view-btn" :class="{ active: invView === 'table' }" @click="invView = 'table'" title="Table view">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M3 3h18M3 9h18M3 15h18M3 21h18"/></svg>
              </button>
              <button type="button" class="inv2-view-btn" :class="{ active: invView === 'card' }" @click="invView = 'card'" title="Card view">
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
              </button>
            </div>
            <button type="button" @click="closeModals" class="inv2-close" title="Close">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>

        <!-- ── Toolbar ── -->
        <div class="inv2-toolbar">
          <div class="inv2-search">
            <svg class="inv2-search-ico" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
            <input v-model="invQ" type="text" class="inv2-search-input" placeholder="Search name or type…" />
            <button v-if="invQ" type="button" @click="invQ = ''" class="inv2-clear-btn">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </div>

          <select v-model="invTypeF" class="inv2-select">
            <option value="">All Types</option>
            <option v-for="t in invUniqueTypes" :key="t" :value="t">{{ t }}</option>
          </select>

          <select v-model="invStatusF" class="inv2-select">
            <option value="">All Status</option>
            <option value="Available">Available</option>
            <option value="In Use">In Use</option>
            <option value="Under Maintenance">Under Maintenance</option>
            <option value="Unavailable">Unavailable</option>
          </select>

          <button type="button" @click="showAddMachineryModal = true; showInventoryModal = false" class="inv2-add-btn">
            ➕ Add New Machinery
          </button>
        </div>

        <!-- Active filter chips -->
        <div v-if="invQ || invTypeF || invStatusF" class="inv2-chips">
          <span v-if="invQ" class="inv2-chip">
            Search: "{{ invQ }}"
            <button type="button" @click="invQ = ''" class="inv2-chip-x">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </span>
          <span v-if="invTypeF" class="inv2-chip">
            Type: {{ invTypeF }}
            <button type="button" @click="invTypeF = ''" class="inv2-chip-x">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </span>
          <span v-if="invStatusF" class="inv2-chip">
            Status: {{ invStatusF }}
            <button type="button" @click="invStatusF = ''" class="inv2-chip-x">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3"><path d="M18 6L6 18M6 6l12 12"/></svg>
            </button>
          </span>
          <button type="button" @click="invQ = ''; invTypeF = ''; invStatusF = ''" class="inv2-clear-all">Clear all</button>
        </div>

        <!-- ── Body ── -->
        <div class="inv2-body">

          <!-- TABLE VIEW -->
          <div v-if="invView === 'table'" class="inv2-table-wrap">
            <table class="inv2-table">
              <colgroup>
                <col class="inv2-col-name" />
                <col class="inv2-col-type" />
                <col class="inv2-col-member" />
                <col class="inv2-col-nonmember" />
                <col class="inv2-col-capacity" />
                <col class="inv2-col-status" />
                <col class="inv2-col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th class="inv2-th-name">Name</th>
                  <th>Type</th>
                  <th class="inv2-th-rate">Member Rate</th>
                  <th class="inv2-th-rate">Non-Member Rate</th>
                  <th>Capacity</th>
                  <th>Status</th>
                  <th class="inv2-th-actions">Actions</th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="invFiltered.length === 0">
                  <td colspan="7" class="inv2-empty">
                    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:10px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                    <div>No machinery found</div>
                  </td>
                </tr>
                <tr v-else v-for="(m, i) in invPaged" :key="m.id" class="inv2-row" :class="i % 2 === 0 ? 'inv2-row-a' : 'inv2-row-b'">
                  <td class="inv2-td-name">
                    <span class="inv2-name">{{ m.machinery_name }}</span>
                  </td>
                  <td>
                    <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                  </td>
                  <td style="text-align:right">
                    <span v-if="m.member_price" class="inv2-price inv2-price-member">₱{{ formatNumber(m.member_price) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                    <span v-else class="inv2-price inv2-price-main">₱{{ formatNumber(m.price_per_unit) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                  </td>
                  <td style="text-align:right">
                    <span v-if="m.non_member_price" class="inv2-price inv2-price-nonmember">₱{{ formatNumber(m.non_member_price) }}<span class="inv2-unit">/{{ m.unit_type }}</span></span>
                    <span v-else class="inv2-na">—</span>
                  </td>
                  <td style="text-align:center">
                    <span v-if="m.max_capacity" class="inv2-cap">{{ m.max_capacity }} {{ m.capacity_unit }}</span>
                    <span v-else class="inv2-na">—</span>
                  </td>
                  <td style="text-align:center">
                    <span class="status-badge" :class="'status-' + getStatusClass(m.status)">{{ m.status }}</span>
                  </td>
                  <td class="inv2-td-actions">
                    <div class="inv2-actions action-buttons">
                      <button type="button" @click="editMachinery(m)" class="machinery-action-btn machinery-action-edit" title="Edit Machinery" aria-label="Edit Machinery">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                        </svg>
                      </button>
                      <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-btn machinery-action-delete" title="Delete" aria-label="Delete">
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

          <!-- CARD VIEW -->
          <div v-else class="inv2-cards-grid">
            <div v-if="invFiltered.length === 0" class="inv2-empty">
              <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity:.4;margin-bottom:10px"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
              <div>No machinery found</div>
            </div>
            <div v-else v-for="m in invPaged" :key="'c' + m.id" class="inv2-card">
              <!-- Card image / icon -->
              <div class="inv2-card-img">
                <img v-if="getImageUrl(m.machinery_picture)" :src="getImageUrl(m.machinery_picture)" :alt="m.machinery_name" @error="handleImageError" />
                <div v-else class="inv2-card-img-fallback">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M4.93 4.93a10 10 0 0 0 0 14.14"/></svg>
                </div>
                <span class="inv2-card-status-badge status-badge" :class="'status-' + getStatusClass(m.status)">{{ m.status }}</span>
              </div>
              <!-- Card body -->
              <div class="inv2-card-body">
                <div class="inv2-card-top">
                  <span class="inv2-card-name">{{ m.machinery_name }}</span>
                  <span class="badge" :class="'badge-' + getMachineryTypeClass(m.machinery_type)">{{ m.machinery_type }}</span>
                </div>
                <!-- Pricing rows -->
                <div class="inv2-card-pricing">
                  <div class="inv2-card-price-row">
                    <span class="inv2-card-price-label">Member</span>
                    <span class="inv2-price inv2-price-member">₱{{ formatNumber(m.member_price || m.price_per_unit) }}/{{ m.unit_type }}</span>
                  </div>
                  <div v-if="m.non_member_price" class="inv2-card-price-row">
                    <span class="inv2-card-price-label">Non-Member</span>
                    <span class="inv2-price inv2-price-nonmember">₱{{ formatNumber(m.non_member_price) }}/{{ m.unit_type }}</span>
                  </div>
                </div>
                <div v-if="m.max_capacity" class="inv2-card-cap">
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
                  {{ m.max_capacity }} {{ m.capacity_unit }}
                </div>
                <div class="inv2-card-actions action-buttons">
                  <button type="button" @click="editMachinery(m)" class="machinery-action-btn machinery-action-edit" title="Edit Machinery" aria-label="Edit Machinery">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button type="button" @click="deleteMachineryConfirm(m)" class="machinery-action-btn machinery-action-delete" title="Delete" aria-label="Delete">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Pagination -->
          <div v-if="invTotalPg > 1" class="inv2-pagination">
            <button type="button" class="inv2-pg-btn" :disabled="invPg === 1" @click="invPg--">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <span class="inv2-pg-info">{{ invPg }} / {{ invTotalPg }}</span>
            <button type="button" class="inv2-pg-btn" :disabled="invPg === invTotalPg" @click="invPg++">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        </div>

        <!-- Mobile FAB -->
        <button type="button" @click="showAddMachineryModal = true; showInventoryModal = false" class="inv2-fab" title="Add New Machinery">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.8"><path d="M12 5v14M5 12h14"/></svg>
        </button>
      </div>
    </div>

    <!-- Add/Edit Machinery Modal -->
    <div v-if="showAddMachineryModal || showEditMachineryModal" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content modal-form-content">
        <div class="modal-header">
          <h2>{{ showEditMachineryModal ? 'Edit Machinery' : 'Add New Machinery' }}</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <form @submit.prevent="showEditMachineryModal ? updateMachinery() : addMachinery()">
            <section class="machinery-form-section barangay-assignment-group">
              <h3 class="machinery-form-section-title">Barangay Assignment</h3>
              <p class="machinery-form-section-desc" v-if="isPresidentRole">
                Machinery will be assigned to your barangay only.
              </p>
              <p class="machinery-form-section-desc" v-else>
                Select which barangay will own and manage this machinery.
              </p>

              <!-- For Admin: Show dropdown for selection -->
              <template v-if="!isPresidentRole">
                <div class="form-group">
                  <label class="form-label">Assign to Barangay *</label>

                  <div v-if="barangays.length === 0" class="barangay-loading">
                    <div class="spinner-small"></div>
                    Loading barangays...
                  </div>

                  <select
                    v-else
                    v-model="machineryForm.barangay_id"
                    class="form-input barangay-select-emphasized"
                    required
                    @change="handleBarangayChange"
                  >
                    <option value="">Select a barangay</option>
                    <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.id">
                      {{ barangay.name }}
                    </option>
                  </select>

                  <p v-if="machineryForm.barangay_id" class="barangay-selected">
                    Selected: {{ getBarangayName(machineryForm.barangay_id) }}
                  </p>

                  <small class="form-hint barangay-hint">This machinery will belong to and be managed by the selected barangay only.</small>
                </div>
              </template>

              <!-- For President: Show read-only barangay info -->
              <template v-else>
                <div class="form-group">
                  <label class="form-label">Your Barangay</label>
                  <div class="barangay-read-only">
                    <div class="barangay-info">{{ getBarangayName(userBarangayId) }}</div>
                    <small class="form-hint">All machinery will be assigned to your barangay only.</small>
                  </div>
                </div>
              </template>
            </section>

            <section class="machinery-form-section">
              <h3 class="machinery-form-section-title">Machinery Details</h3>

            <div class="form-group">
              <label class="form-label">Machinery Name *</label>
              <input v-model="machineryForm.machinery_name" type="text" class="form-input" required />
            </div>

            <div class="form-group">
              <label class="form-label">Machinery Type *</label>
              <input v-model="machineryForm.machinery_type" type="text" class="form-input" required placeholder="e.g., Harvester, Dryer, Tractor" />
              <small class="form-hint">Enter any machinery type — not limited to predefined options.</small>
            </div>

            <div class="form-group">
              <label class="form-label">Description</label>
              <textarea v-model="machineryForm.description" class="form-input" rows="3" placeholder="Optional notes about this machinery"></textarea>
            </div>
            </section>

            <section class="machinery-form-section">
              <h3 class="machinery-form-section-title">Pricing</h3>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Member Price (₱) *</label>
                <input v-model.number="machineryForm.member_price" type="number" step="0.01" min="0.01" class="form-input" required placeholder="e.g., 5000" />
                <small class="form-hint">Price for barangay/association members.</small>
              </div>
              <div class="form-group">
                <label class="form-label">Non-Member Price (₱) *</label>
                <input v-model.number="machineryForm.non_member_price" type="number" step="0.01" min="0.01" class="form-input" required placeholder="e.g., 6250" />
                <small class="form-hint">Price for non-members (typically 20–30% higher).</small>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Unit Type *</label>
              <input v-model="machineryForm.unit_type" type="text" class="form-input" required placeholder="e.g., per hectare, per load" />
            </div>
            </section>

            <section class="machinery-form-section">
              <h3 class="machinery-form-section-title">Capacity &amp; Status</h3>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Max Capacity</label>
                <input v-model.number="machineryForm.max_capacity" type="number" step="0.01" min="0" class="form-input" placeholder="Optional" />
              </div>
              <div class="form-group">
                <label class="form-label">Capacity Unit</label>
                <input v-model="machineryForm.capacity_unit" type="text" class="form-input" placeholder="e.g., hectares, loads" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Status *</label>
              <select v-model="machineryForm.status" class="form-input" required>
                <option value="Available">Available</option>
                <option value="In Use">In Use</option>
                <option value="Under Maintenance">Under Maintenance</option>
                <option value="Unavailable">Unavailable</option>
              </select>
            </div>
            </section>

            <!-- Machinery Picture Upload -->
            <section class="machinery-form-section">
              <h3 class="machinery-form-section-title">Machinery Picture</h3>
            <div class="form-group">
              <div class="picture-upload-section">
                <div v-if="machineryForm.machinery_picture && machineryForm.machinery_picture.trim() !== ''" class="picture-preview">
                  <img 
                    :src="getImageUrl(machineryForm.machinery_picture)" 
                    alt="Machinery preview" 
                    class="preview-image"
                    @error="handleImageError"
                    @load="handleImageLoad"
                  />
                  <button type="button" @click.prevent="removeMachineryPicture()" class="btn-remove-picture">
                    Remove Picture
                  </button>
                </div>
                <div v-else class="picture-placeholder">
                  <p>No image uploaded</p>
                </div>
                <input 
                  type="file" 
                  ref="machineryPictureInput" 
                  @change="handleMachineryPictureChange" 
                  accept="image/*" 
                  class="file-input-hidden"
                />
                <button type="button" @click.prevent="$refs.machineryPictureInput.click()" class="btn-upload-picture">
                  Upload Picture
                </button>
              </div>
              <small class="form-hint">JPG, PNG, GIF or WebP (max 10MB).</small>
            </div>
            </section>

            <div class="modal-actions">
              <button type="button" @click="closeModals" class="btn-secondary">Cancel</button>
              <button type="submit" class="btn-primary" :disabled="loading">
                {{ loading ? 'Saving...' : (showEditMachineryModal ? 'Update' : 'Add') }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- View Booking Modal -->
    <div v-if="showViewBookingModal && selectedBooking" class="modal-overlay" @click.self="closeModals">
      <div class="modal-content modal-large">
        <div class="modal-header">
          <h2>Booking Details #{{ selectedBooking.id }}</h2>
          <button type="button" @click="closeModals" class="modal-close" aria-label="Close">×</button>
        </div>
        <div class="modal-body">
          <div class="booking-details">
            <div class="detail-section">
              <h3>Farmer Information</h3>
              <div class="details-grid">
                <div class="detail-item"><label>Name:</label><span>{{ selectedBooking.farmer_name }}</span></div>
                <div class="detail-item"><label>Reference:</label><span>{{ selectedBooking.reference_number }}</span></div>
                <div class="detail-item" v-if="selectedBooking.farmer_phone"><label>Phone:</label><span>{{ selectedBooking.farmer_phone }}</span></div>
              </div>
            </div>

            <div class="detail-section">
              <h3>Booking Information</h3>
              <div class="details-grid">
                <div class="detail-item"><label>Machinery:</label><span>{{ selectedBooking.machinery_name }}</span></div>
                <div class="detail-item"><label>Type:</label><span class="badge" :class="'badge-' + getMachineryTypeClass(selectedBooking.machinery_type)">{{ selectedBooking.machinery_type }}</span></div>
                <div class="detail-item"><label>Date:</label><span>{{ formatDate(selectedBooking.booking_date) }}</span></div>
                <div class="detail-item"><label>Location:</label><span>{{ selectedBooking.service_location }}</span></div>
                <div class="detail-item"><label>Area/Quantity:</label><span>{{ selectedBooking.area_size }} {{ selectedBooking.area_unit }}</span></div>
                <div class="detail-item"><label>Total Price:</label><strong class="price-highlight">₱{{ formatNumber(selectedBooking.total_price) }}</strong></div>
                <div class="detail-item"><label>Status:</label><span class="status-badge" :class="'status-' + getBookingStatusClass(selectedBooking.status)">{{ selectedBooking.status }}</span></div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedBooking.approved_by_name">
              <h3>Approval Information</h3>
              <div class="details-grid">
                <div class="detail-item"><label>Approved By:</label><span>{{ selectedBooking.approved_by_name }}</span></div>
                <div class="detail-item" v-if="selectedBooking.approved_date"><label>Date:</label><span>{{ formatDateTime(selectedBooking.approved_date) }}</span></div>
              </div>
            </div>

            <div class="detail-section" v-if="selectedBooking.notes">
              <h3>Notes</h3>
              <p class="notes-text">{{ selectedBooking.notes }}</p>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- Delete Confirmation Modal -->
    <div
      v-if="showDeleteModal"
      class="modal-overlay modal-delete-overlay"
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
              <h2 id="machinery-delete-title">Delete Machinery</h2>
              <p id="machinery-delete-desc" class="modal-subtitle delete-confirm-message">
                Remove <strong>{{ machineryToDelete?.machinery_name }}</strong> from the inventory?
              </p>
            </div>
          </div>
          <button type="button" @click="closeDeleteModal" class="close-btn" aria-label="Close" :disabled="deleteInProgress">×</button>
        </div>
        <div class="modal-body delete-modal-body">
          <p class="delete-warning-text">This action cannot be undone. All booking records linked to this machinery may be affected.</p>
        </div>
        <div class="modal-footer delete-modal-footer">
          <button type="button" class="btn-secondary" @click="closeDeleteModal" :disabled="deleteInProgress">Cancel</button>
          <button type="button" class="btn-delete-confirm" @click="deleteMachinery" :disabled="deleteInProgress || loading">
            {{ deleteInProgress || loading ? 'Deleting...' : 'Delete' }}
          </button>
        </div>
      </div>
    </div>

    <!-- Alerts -->
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
</template>

<script>
import { ref, computed, onMounted, watch } from 'vue'
import { useMachineryStore } from '../stores/machineryStore'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'

export default {
  name: 'MachineryManagementPage',
  setup() {
    const machineryStore = useMachineryStore()
    const authStore = useAuthStore()
    const { isDark } = useBackdropTheme()
    const isLight = computed(() => !isDark.value)

    const showInventoryModal = ref(false)
    const showAddMachineryModal = ref(false)
    const showEditMachineryModal = ref(false)
    const showViewBookingModal = ref(false)
    const showDeleteModal = ref(false)
    const machineryToDelete = ref(null)
    const deleteInProgress = ref(false)
    const successMessage = ref('')
    const validationError = ref('')
    const filters = ref({ status: '', machinery_type: '' })

    const machineryForm = ref({
      machinery_name: '', machinery_type: '', description: '',
      member_price: '', non_member_price: '', price_per_unit: '', unit_type: '', max_capacity: '',
      capacity_unit: '', status: 'Available', created_by: null, barangay_id: '', machinery_picture: ''
    })
    
    const currentPictureFile = ref(null)
    const machineryPictureInput = ref(null)

    // Helper function to construct correct image URL
    const getImageUrl = (imagePath) => {
      if (!imagePath) return ''
      
      // If it's a data URL (from file input), return as-is
      if (imagePath.startsWith('data:')) {
        return imagePath
      }
      
      // If it's a server path, construct full backend URL
      if (imagePath.startsWith('/uploads/')) {
        // In development, construct the backend URL
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000'
        return `${apiBaseUrl}${imagePath}`
      }
      
      // Otherwise return as-is
      return imagePath
    }

    const invQ = ref('')
    const invTypeF = ref('')
    const invStatusF = ref('')
    const invView = ref('table')
    const invPg = ref(1)
    const invPerPg = 10

    const inventory = computed(() => machineryStore.inventory)
    const bookings = computed(() => machineryStore.bookings)
    const loading = computed(() => machineryStore.loading)
    const error = computed(() => machineryStore.error)
    const stats = computed(() => machineryStore.stats)
    const selectedBooking = computed(() => machineryStore.selectedBooking)
    const distinctMachineryTypes = computed(() => machineryStore.distinctMachineryTypes)
    const barangays = computed(() => machineryStore.barangays)
    const isAdminRole = computed(() => {
      const role = authStore.currentUser?.role
      return role === 'admin' || role === 'president'
    })
    const isAdminOnly = computed(() => authStore.currentUser?.role === 'admin')
    const isPresidentRole = computed(() => authStore.currentUser?.role === 'president')
    const userBarangayId = computed(() => authStore.currentUser?.barangay_id)

    const adminFilters = ref({ status: '', machinery_type: '', barangay_id: '' })

    const filteredInventory = computed(() => {
      if (!inventory.value) return []
      return inventory.value.filter(machine => {
        const statusMatch = !adminFilters.value.status || machine.status === adminFilters.value.status
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
        const sMatch = !invStatusF.value || m.status === invStatusF.value
        return qMatch && tMatch && sMatch
      })
    })
    const invTotalPg = computed(() => Math.max(1, Math.ceil(invFiltered.value.length / invPerPg)))
    const invPaged = computed(() => {
      const s = (invPg.value - 1) * invPerPg
      return invFiltered.value.slice(s, s + invPerPg)
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
      return inventory.value.filter(m => m.status === 'Available').length
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
        await Promise.all([
          machineryStore.fetchInventory(),
          machineryStore.fetchBookings(filters.value),
          machineryStore.fetchStats(),
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
        
        const memberPrice = parseFloat(machineryForm.value.member_price) || 0
        const nonMemberPrice = parseFloat(machineryForm.value.non_member_price) || 0
        
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
          barangay_id: barangayId  // Auto-set for president, admin-selected for admin
        }
        
        console.log('Submitting machinery data:', data)
        const result = await machineryStore.addMachinery(data)
        
        // Upload picture if one was selected
        if (result && (result.id || result.machinery_id) && currentPictureFile.value) {
          const machineId = result.id || result.machinery_id
          await uploadMachineryPicture(machineId)
        }
        
        successMessage.value = 'Machinery added successfully!'
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
      // Ensure barangay_id is properly initialized for the form
      if (!machineryForm.value.barangay_id) {
        machineryForm.value.barangay_id = ''
      }
      showEditMachineryModal.value = true
      showInventoryModal.value = false
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
        
        const memberPrice = parseFloat(machineryForm.value.member_price) || 0
        const nonMemberPrice = parseFloat(machineryForm.value.non_member_price) || 0
        
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
          barangay_id: barangayId  // Auto-set for president, admin-selected for admin
        }
        
        console.log('Updating machinery data:', data)
        await machineryStore.updateMachinery(machineryForm.value.id, data)
        
        // Upload picture if one was selected
        if (currentPictureFile.value && machineryForm.value.id) {
          await uploadMachineryPicture(machineryForm.value.id)
        }
        
        successMessage.value = 'Machinery updated successfully!'
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
        successMessage.value = 'Machinery deleted successfully!'
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
        member_price: '', non_member_price: '', price_per_unit: '', unit_type: '', max_capacity: '',
        capacity_unit: '', status: 'Available', created_by: null, barangay_id: '', machinery_picture: ''
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
        
        const apiBaseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000';
        const uploadUrl = `${apiBaseUrl}/api/machinery/inventory/${machineryId}/picture`;
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
        successMessage.value = 'Picture uploaded successfully!'
        setTimeout(() => successMessage.value = '', 3000);
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
      'Available': 'success', 'In Use': 'info',
      'Under Maintenance': 'warning', 'Unavailable': 'danger'
    }[status] || 'default')

    const getBookingStatusClass = (status) => ({
      'Pending': 'warning', 'Approved': 'success',
      'Completed': 'info', 'Rejected': 'danger', 'Cancelled': 'default'
    }[status] || 'default')

    const formatNumber = (num) => new Intl.NumberFormat('en-PH').format(num)
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

    onMounted(() => loadData())

    // Auto-set barangay for president when opening add modal
    watch(showAddMachineryModal, (isOpen) => {
      if (isOpen && isPresidentRole.value) {
        machineryForm.value.barangay_id = userBarangayId.value
      }
    })

    return {
      isLight,
      showInventoryModal, showAddMachineryModal, showEditMachineryModal,
      showViewBookingModal, showDeleteModal, machineryToDelete,
      successMessage, validationError, filters, adminFilters, machineryForm, inventory, bookings,
      loading, error, selectedBooking, distinctMachineryTypes,
      totalMachinery, availableMachinery, barangays, isAdminRole, isAdminOnly,
      pendingBookingsCount, totalRevenue, applyFilters, applyAdminFilters,
      filteredInventory, handleBarangayChange, isPresidentRole, userBarangayId,
      addMachinery, editMachinery, updateMachinery, deleteMachineryConfirm,
      deleteMachinery, viewBooking, closeModals, closeDeleteModal, deleteInProgress, clearError, loadData,
      getMachineryTypeClass, getStatusClass, getBookingStatusClass,
      getBarangayName, formatNumber, formatUnitLabel, formatCapacity, formatDate, formatDateTime,
      handleMachineryPictureChange, removeMachineryPicture, uploadMachineryPicture,
      handleImageError, handleImageLoad, machineryPictureInput, currentPictureFile, resetForm,
      getImageUrl,
      invQ,
      invTypeF,
      invStatusF,
      invView,
      invPg,
      invTotalPg,
      invPaged,
      invUniqueTypes,
      invFiltered
    }
  }
}
</script>

<style scoped>
.machinery-management-page {
  --surface-1: #1e4234;
  --surface-2: #255241;
  --surface-3: #2d5c4a;
  --line-soft: rgba(167, 211, 178, 0.22);
  --line-strong: rgba(187, 227, 196, 0.35);
  --text-main: #ecfdf5;
  --text-muted: #b8dcc6;
  --text-soft: #8fb89e;
  --success: #6ee7a8;
  --warning: #e8c468;
  --danger: #f87171;
  --info: #7dd3fc;
  --panel-shadow: 0 10px 28px rgba(4, 18, 12, 0.32);
  min-height: 100vh;
  max-width: 1440px;
  margin: 0 auto;
  padding: 28px;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  background: linear-gradient(160deg, #0c2418 0%, #123222 42%, #1a3d2e 100%);
  position: relative;
  overflow-x: hidden;
}

.machinery-management-page::before,
.machinery-management-page::after {
  content: '';
  position: fixed;
  inset: 0;
  pointer-events: none;
  z-index: 0;
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

.page-header,
.section {
  background: var(--surface-1);
  border: 1px solid var(--line-soft);
  border-radius: 24px;
  box-shadow: var(--panel-shadow);
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 20px;
  margin-bottom: 26px;
  padding: 28px 32px;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.page-title {
  margin: 0 0 8px;
  font-size: 34px;
  line-height: 1.05;
  font-weight: 900;
  letter-spacing: -0.8px;
  color: var(--text-main);
  text-shadow: 0 2px 16px rgba(0, 0, 0, 0.18);
}

.page-subtitle {
  margin: 0;
  font-size: 14px;
  font-weight: 500;
  color: var(--text-muted);
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
.inv2-view-toggle {
  display: flex;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 9px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  padding: 3px;
  gap: 2px;
}
.inv2-view-btn {
  width: 32px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 7px;
  background: transparent;
  border: none;
  color: rgba(255, 255, 255, 0.88);
  cursor: pointer;
  transition: all 0.18s ease;
}
.inv2-view-btn svg {
  color: currentColor;
  stroke: currentColor;
}
.inv2-view-btn.active {
  background: rgba(45, 92, 74, 0.75);
  color: #ffffff;
}
.inv2-view-btn:hover:not(.active) {
  background: rgba(255, 255, 255, 0.1);
  color: #ffffff;
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
  grid-template-columns: minmax(260px, 1fr) 170px 170px auto;
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
  gap: 6px;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(45, 92, 74, 0.4);
  border: 1px solid rgba(167, 211, 178, 0.28);
  color: #b8dcc6;
}
.inv2-chip-x {
  background: none;
  border: none;
  color: #b8dcc6;
  cursor: pointer;
  display: flex;
  padding: 0;
  opacity: 0.7;
}
.inv2-chip-x:hover {
  opacity: 1;
}
.inv2-clear-all {
  background: none;
  border: none;
  color: rgba(200, 235, 210, 0.45);
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  padding: 4px 6px;
  text-decoration: underline;
}
.inv2-clear-all:hover {
  color: rgba(200, 235, 210, 0.8);
}

.inv2-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 18px 24px 24px;
  display: flex;
  flex-direction: column;
  gap: 14px;
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
  table-layout: auto;
}

.inv2-col-name { width: auto; }
.inv2-col-type { width: auto; }
.inv2-col-member { width: auto; }
.inv2-col-nonmember { width: auto; }
.inv2-col-capacity { width: auto; }
.inv2-col-status { width: auto; }
.inv2-col-actions { width: 1%; white-space: nowrap; }

.inv2-th-name,
.inv2-td-name {
  text-align: left !important;
  min-width: 6.5rem;
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
  min-width: 5.75rem;
}
.inv2-table thead {
  background: rgba(255, 255, 255, 0.04);
}
.inv2-table th {
  padding: 11px 10px;
  font-size: 0.8125rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: rgba(200, 235, 210, 0.5);
  white-space: nowrap;
  text-align: center;
  border-bottom: 1.5px solid #94a3b8;
}

.inv2-table th:not(:last-child),
.inv2-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
}

.inv2-table td {
  padding: 11px 10px;
  font-size: 0.9375rem;
  color: #e8f5ee;
  vertical-align: middle;
  border-bottom: 1.5px solid #94a3b8;
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
  color: #ecfdf5;
}
.inv2-price {
  font-weight: 800;
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
  font-size: 10px;
  font-weight: 500;
  color: rgba(200, 235, 210, 0.5);
  margin-left: 1px;
}
.inv2-cap {
  font-size: 12px;
  color: rgba(200, 235, 210, 0.7);
}
.inv2-na {
  color: rgba(200, 235, 210, 0.3);
  font-size: 13px;
}

.inv2-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: 88px;
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
  padding: 52px 20px;
  color: rgba(200, 235, 210, 0.4);
  font-size: 14px;
  display: flex;
  flex-direction: column;
  align-items: center;
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
    display: flex;
  }
  .inv2-add-btn {
    display: none;
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
  .inv2-table-wrap {
    overflow-x: auto;
  }
  .inv2-table th,
  .inv2-table td {
    white-space: nowrap;
  }
  .inv2-cards-grid {
    grid-template-columns: 1fr;
  }
  .modal-form-content {
    margin-top: 8px;
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
  width: 36px;
  height: 36px;
  min-width: 36px;
  min-height: 36px;
  border-radius: 8px;
}

.machinery-management-page .inventory-table .machinery-action-btn svg,
.machinery-management-page .inv2-table .machinery-action-btn svg,
.machinery-management-page .inv2-card .machinery-action-btn svg {
  width: 18px;
  height: 18px;
}

.inv2-card-actions.action-buttons {
  justify-content: flex-start;
  margin-top: 10px;
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
  position: fixed !important;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  padding-left: calc(var(--app-sidebar-width, 260px) + 20px);
  background: rgba(12, 36, 24, 0.72);
  backdrop-filter: blur(4px);
  z-index: 1200;
}

.modal-content {
  width: min(90%, 640px);
  max-height: 90vh;
  overflow-y: auto;
  background: var(--surface-1);
  color: var(--text-main);
  border-radius: 22px;
  border: 1px solid var(--line-soft);
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.4);
}

.modal-form-content {
  margin-top: 14px;
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
  align-items: center;
  gap: 16px;
  padding: 24px 26px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.modal-header h2 {
  margin: 0;
  font-size: 24px;
  font-weight: 800;
  color: var(--text-main);
}

.modal-close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-main);
  font-size: 20px;
  cursor: pointer;
}

.modal-body {
  padding: 24px 26px 28px;
}

.form-group {
  margin-bottom: 18px;
}

.form-hint {
  display: block;
  margin-top: 6px;
  font-size: 12px;
  color: var(--text-soft);
}

.form-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 24px;
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

.alert {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  min-width: 320px;
  max-width: 420px;
  padding: 16px 18px;
  border-radius: 14px;
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.24);
  backdrop-filter: blur(12px);
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
  margin-bottom: 1.35rem;
  padding: 1.15rem 1.2rem 0.25rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(190, 235, 203, 0.18);
}

.machinery-form-section-title {
  margin: 0 0 0.35rem;
  font-size: 1rem;
  font-weight: 800;
  color: var(--text-main);
  letter-spacing: 0.02em;
}

.machinery-form-section-desc {
  margin: 0 0 1rem;
  font-size: 0.9375rem;
  font-weight: 600;
  line-height: 1.45;
  color: var(--text-soft);
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
  .machinery-management-page {
    padding: 18px;
  }

  .page-header,
  .section {
    padding: 20px;
    border-radius: 20px;
  }

  .page-title {
    font-size: 28px;
  }

  .stats-grid {
    grid-template-columns: 1fr;
  }

  .form-row,
  .details-grid {
    grid-template-columns: 1fr;
  }

  .modal-overlay {
    padding: 14px;
    padding-left: 14px;
  }

  .modal-header,
  .modal-body {
    padding-left: 18px;
    padding-right: 18px;
  }

  .modal-actions {
    flex-direction: column-reverse;
  }

  .modal-actions > * {
    width: 100%;
  }

  .alert {
    left: 14px;
    right: 14px;
    min-width: auto;
    max-width: none;
  }
}

@media (max-width: 480px) {
  .machinery-management-page {
    padding: 14px;
  }

  .page-header,
  .section {
    padding: 18px;
  }

  .page-title {
    font-size: 24px;
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
  .inventory-table-container, .modal-content, .detail-section, .empty-state,
  .picture-upload-section, .picture-preview, .notes-text, .inv2-card, .inv2-table-wrap
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

.machinery-management-page:not(.light-theme) :is(.inv2-toolbar, .inv2-chips) {
  background: rgba(30, 66, 52, 0.65) !important;
  border-color: var(--line-soft) !important;
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

.machinery-management-page.light-theme .inv2-subtitle {
  color: #166534 !important;
}

.machinery-management-page.light-theme .modal-close {
  background: #f0fdf4 !important;
  border: 1px solid #86efac !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme :is(.inv2-toolbar, .inv2-chips) {
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

.machinery-management-page.light-theme .inv2-chip {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #166534 !important;
}

.machinery-management-page.light-theme .inv2-clear-all {
  color: #15803d !important;
}

.machinery-management-page.light-theme .inv2-clear-all:hover {
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

.inv2-modal {
  position: relative;
}

</style>