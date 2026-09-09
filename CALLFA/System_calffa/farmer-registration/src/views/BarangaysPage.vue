<template>
  <div class="page-container barangays-page barangays-ui" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.barangayManagement') }}</h1>
        <p class="page-subtitle">{{ $t('ui.manageBarangaysSub') }}</p>
      </div>
      <button type="button" @click="openAddModal" class="btn-header-add">
        <svg class="btn-header-icon" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path d="M12 5v14M5 12h14" stroke-linecap="round" />
        </svg>
        {{ $t('common.addBarangay') }}
      </button>
    </div>

    <!-- Statistics -->
    <div class="stats-group stats-group--barangays">
      <div class="stats-grid stats-grid--barangays">
        <div class="stat-card stat-total">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.totalBarangays') }}</div>
            <div class="stat-value">{{ totalBarangays }}</div>
          </div>
        </div>
        <div class="stat-card stat-active">
          <div class="stat-content">
            <div class="stat-label">{{ $t('ui.activeBarangays') }}</div>
            <div class="stat-value">{{ activeBarangays }}</div>
          </div>
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
          :placeholder="$t('ui.searchBarangays')"
          class="toolbar-input search-input-main"
        />
      </div>
      <div class="filter-group">
        <select v-model="statusFilter" class="toolbar-select">
          <option value="">{{ $t('ui.allStatus') }}</option>
          <option value="active">{{ $t('common.active') }}</option>
          <option value="inactive">{{ $t('common.inactive') }}</option>
        </select>
        <select v-model="sortBy" class="toolbar-select">
          <option value="name">{{ $t('ui.sortByName') }}</option>
          <option value="area">{{ $t('ui.sortByLand') }}</option>
        </select>
      </div>
    </div>

    <!-- Barangays Table (desktop) + Mobile cards -->
    <div class="card">
      <div class="table-container barangays-desktop-wrap">
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
            <th>{{ $t('ui.barangayName') }}</th>
            <th>{{ $t('ui.landAreaHa') }}</th>
            <th>{{ $t('ui.farmers') }}</th>
            <th>{{ $t('ui.officers') }}</th>
            <th>{{ $t('ui.status') }}</th>
            <th>{{ $t('ui.actions') }}</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="loading">
            <td colspan="6" class="loading-cell">{{ $t('ui.loadingBarangays') }}</td>
          </tr>
          <tr v-else-if="filteredBarangays.length === 0">
            <td colspan="6" class="empty-cell">{{ $t('ui.noBarangaysFound') }}</td>
          </tr>
          <template v-else>
          <tr v-for="barangay in filteredBarangays" :key="'d-' + barangay.id">
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
              <button type="button" @click="viewBarangayDetails(barangay)" class="barangays-icon-btn barangays-icon-view" :title="$t('common.view')" :aria-label="$t('common.view')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                  <circle cx="12" cy="12" r="3"/>
                </svg>
              </button>
              <button type="button" @click="openPlacesModal(barangay)" class="barangays-icon-btn barangays-icon-places" :title="$t('ui.managePlaces')" :aria-label="$t('ui.managePlaces')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M12 21s-8-5.5-8-11.8A8 8 0 0 1 12 3a8 8 0 0 1 8 6.2c0 6.3-8 11.8-8 11.8z"/>
                  <circle cx="12" cy="10.5" r="2.75"/>
                </svg>
              </button>
              <button type="button" @click="openEditModal(barangay)" class="barangays-icon-btn barangays-icon-edit" :title="$t('common.edit')" :aria-label="$t('common.edit')">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button type="button" @click="openDeleteBarangayConfirm(barangay)" class="barangays-icon-btn barangays-icon-delete" :title="$t('common.delete')" :aria-label="$t('common.delete')">
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

      <div class="barangays-mobile-list" aria-label="Barangay list">
        <div v-if="loading" class="barangay-mobile-empty">{{ $t('ui.loadingBarangays') }}</div>
        <div v-else-if="filteredBarangays.length === 0" class="barangay-mobile-empty">{{ $t('ui.noBarangaysFound') }}</div>
        <article
          v-for="barangay in filteredBarangays"
          :key="'m-' + barangay.id"
          class="barangay-mobile-card"
        >
          <button
            type="button"
            class="barangay-mobile-main"
            @click="viewBarangayDetails(barangay)"
          >
            <span class="barangay-name-text">{{ barangay.name }}</span>
            <span class="barangay-mobile-meta">
              <span class="barangay-mobile-chip">{{ formatHectares(barangay.total_area) }} ha</span>
              <span class="barangay-mobile-chip">{{ barangay.total_farmers || 0 }} farmers</span>
              <span class="barangay-mobile-chip">{{ barangay.total_officers || 0 }} officers</span>
              <span :class="['status-pill', 'status-pill-sm', barangay.status]">{{ barangay.status }}</span>
            </span>
          </button>
          <div class="barangays-action-row barangay-mobile-actions">
            <button type="button" class="btn-action-text btn-view-area" @click="viewBarangayDetails(barangay)">
              {{ $t('common.view') }}
            </button>
            <button type="button" class="btn-action-text btn-places-text" @click="openPlacesModal(barangay)">
              Places
            </button>
            <button type="button" class="btn-action-text btn-edit-text" @click="openEditModal(barangay)">
              {{ $t('common.edit') }}
            </button>
            <button type="button" class="btn-action-text btn-delete-text" @click="openDeleteBarangayConfirm(barangay)">
              {{ $t('common.delete') }}
            </button>
          </div>
        </article>
      </div>
    </div>

    <!-- Add/Edit Modal -->
    <Teleport to="body">
      <div
        v-if="showModal"
        class="modal-overlay barangays-modal-overlay barangays-ui"
        :class="{ 'light-theme': isLight }"
        @click="closeModal"
      >
        <div class="modal-content barangay-edit-modal" role="dialog" aria-modal="true" @click.stop>
          <div class="modal-header">
            <div class="modal-title-text">
              <h2>{{ editingBarangay ? 'Edit Barangay' : 'Add New Barangay' }}</h2>
              <p class="modal-subtitle">{{ editingBarangay ? 'Update barangay details' : 'Create a new barangay record' }}</p>
            </div>
            <button type="button" @click="closeModal" class="close-btn" :aria-label="$t('common.close')">×</button>
          </div>
          <div class="modal-body">
            <section class="modal-section">
              <h3 class="modal-section-heading">General Information</h3>
              <p class="form-hint-area">
                Land area is computed automatically from the farm hectares registered by approved farmers and officers.
              </p>
              <div class="compact-form-grid">
                <div class="form-group">
                  <label for="barangay-name-input">Barangay Name *</label>
                  <input
                    id="barangay-name-input"
                    v-model="formData.name"
                    type="text"
                    class="form-input"
                    placeholder="Enter barangay name"
                    required
                    autocomplete="off"
                  />
                </div>
                <div class="form-group">
                  <label for="barangay-status-input">{{ $t('ui.status') }}</label>
                  <select id="barangay-status-input" v-model="formData.status" class="form-input">
                    <option value="active">{{ $t('common.active') }}</option>
                    <option value="inactive">{{ $t('common.inactive') }}</option>
                  </select>
                </div>
              </div>
            </section>
          </div>
          <div class="modal-footer">
            <button type="button" @click="closeModal" class="btn-secondary">{{ $t('common.cancel') }}</button>
            <button type="button" @click="saveBarangay" class="btn-submit">
              {{ editingBarangay ? 'Update' : 'Add Barangay' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Barangay Details Modal -->
    <Teleport to="body">
      <div
        v-if="showDetailsModal"
        class="modal-overlay barangays-modal-overlay barangays-ui"
        :class="{ 'light-theme': isLight }"
        @click="closeDetailsModal"
      >
        <div
          class="modal-content modal-large barangay-details-modal"
          role="dialog"
          aria-modal="true"
          @click.stop
        >
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
                <p class="modal-subtitle">Barangay details and membership overview</p>
              </div>
            </div>
            <button type="button" @click="closeDetailsModal" class="close-btn" :aria-label="$t('common.close')">×</button>
          </div>
          <div class="modal-body">
            <section class="modal-section" v-if="selectedBarangay">
              <h3 class="modal-section-heading">General Information</h3>
              <div class="modal-info-grid">
                <div class="modal-info-item">
                  <span class="modal-info-label">{{ $t('ui.barangayName') }}</span>
                  <span class="modal-info-value">{{ selectedBarangay.name }}</span>
                </div>
                <div class="modal-info-item">
                  <span class="modal-info-label">{{ $t('ui.status') }}</span>
                  <span class="modal-info-value">
                    <span :class="['status-pill', 'status-pill-sm', selectedBarangay.status]">
                      {{ selectedBarangay.status }}
                    </span>
                  </span>
                </div>
                <div class="modal-info-item">
                  <span class="modal-info-label">Total Land Area</span>
                  <span class="modal-info-value">{{ formatHectares(detailsTotalLandArea) }} ha</span>
                </div>
                <div class="modal-info-item">
                  <span class="modal-info-label">Land Area Note</span>
                  <span class="modal-info-value modal-info-value--muted">Sum of hectares from approved officers and farmers</span>
                </div>
              </div>
            </section>

            <section class="modal-section" v-if="selectedBarangay">
              <h3 class="modal-section-heading">Statistics</h3>
              <div class="modal-info-grid modal-info-grid--stats">
                <div class="modal-info-item">
                  <span class="modal-info-label">{{ $t('ui.officers') }}</span>
                  <span class="modal-info-value">{{ officers.length }}</span>
                </div>
                <div class="modal-info-item">
                  <span class="modal-info-label">{{ $t('ui.farmers') }}</span>
                  <span class="modal-info-value">{{ farmers.length }}</span>
                </div>
                <div class="modal-info-item">
                  <span class="modal-info-label">Service Places</span>
                  <span class="modal-info-value">{{ places.length }}</span>
                </div>
                <div class="modal-info-item">
                  <span class="modal-info-label">{{ $t('ui.totalMembers') }}</span>
                  <span class="modal-info-value">{{ officers.length + farmers.length }}</span>
                </div>
              </div>
            </section>

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
                {{ $t('common.farmers') }} ({{ filteredFarmers.length }})
              </button>
              <button
                type="button"
                @click="activeTab = 'places'"
                :class="['tab', { active: activeTab === 'places' }]"
              >
                Places ({{ places.length }})
              </button>
            </div>

            <div
              class="places-card"
              :class="{ 'places-card--busy': placesLoading || placeSaving }"
              v-if="selectedBarangay && activeTab === 'places'"
            >
              <div v-if="placesLoading || placeSaving" class="places-loading-overlay" role="status" aria-live="polite">
                <span class="places-loading-spinner" aria-hidden="true"></span>
                <span class="places-loading-text">
                  {{ placeSaving ? (editingPlaceId ? 'Updating place...' : 'Adding place...') : 'Loading places...' }}
                </span>
              </div>

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
                    <label class="place-form-label" for="place-name-input">Place name</label>
                    <input
                      id="place-name-input"
                      v-model="placeForm.name"
                      type="text"
                      class="form-input"
                      placeholder="e.g. Sitio Proper"
                      :disabled="placeSaving || placesLoading"
                    />
                  </div>
                  <div class="place-form-field">
                    <label class="place-form-label" for="place-desc-input">Description</label>
                    <input
                      id="place-desc-input"
                      v-model="placeForm.description"
                      type="text"
                      class="form-input"
                      :placeholder="$t('ui.optional')"
                      :disabled="placeSaving || placesLoading"
                    />
                  </div>
                  <div class="place-form-field place-form-field-status">
                    <label class="place-form-label" for="place-status-input">{{ $t('ui.status') }}</label>
                    <select id="place-status-input" v-model="placeForm.is_active" class="form-input place-status" :disabled="placeSaving || placesLoading">
                      <option :value="true">{{ $t('common.active') }}</option>
                      <option :value="false">{{ $t('common.inactive') }}</option>
                    </select>
                  </div>
                  <div class="place-form-actions">
                    <button
                      type="button"
                      class="btn-submit btn-place-save"
                      @click="savePlace"
                      :disabled="placeSaving || placesLoading"
                    >
                      {{
                        placeSaving
                          ? (editingPlaceId ? 'Updating...' : 'Adding...')
                          : (editingPlaceId ? 'Update' : 'Add Place')
                      }}
                    </button>
                    <button
                      v-if="editingPlaceId"
                      type="button"
                      class="btn-secondary btn-place-cancel"
                      @click="resetPlaceForm"
                      :disabled="placeSaving || placesLoading"
                    >
                      {{ $t('common.cancel') }}
                    </button>
                  </div>
                </div>
              </div>

              <div class="places-list" v-if="places.length">
                <article v-for="place in places" :key="place.id" class="place-item">
                  <div class="place-item-main">
                    <div class="place-item-top">
                      <h4 class="place-item-name">{{ place.name }}</h4>
                      <span :class="['status-badge', 'place-status-badge', place.is_active ? 'active' : 'inactive']">
                        {{ place.is_active ? 'Active' : 'Inactive' }}
                      </span>
                    </div>
                    <div class="place-item-meta">
                      <span class="place-item-label">Description</span>
                      <span class="place-item-desc">{{ place.description || '—' }}</span>
                    </div>
                  </div>
                  <div class="place-item-actions">
                    <button
                      type="button"
                      class="barangays-icon-btn barangays-icon-edit place-action-icon"
                      :title="$t('common.edit')"
                      aria-label="Edit place"
                      :disabled="placesLoading || placeSaving"
                      @click="startEditPlace(place)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="barangays-icon-btn barangays-icon-delete place-action-icon"
                      :title="$t('common.delete')"
                      aria-label="Delete place"
                      :disabled="placesLoading || placeSaving"
                      @click="openDeletePlaceConfirm(place)"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <path d="M3 6h18" />
                        <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                        <path d="M10 11v6" />
                        <path d="M14 11v6" />
                      </svg>
                    </button>
                    <button
                      type="button"
                      class="btn-action-text btn-edit-text place-action-text"
                      :disabled="placesLoading || placeSaving"
                      @click="startEditPlace(place)"
                    >
                      {{ $t('common.edit') }}
                    </button>
                    <button
                      type="button"
                      class="btn-action-text btn-delete-text place-action-text"
                      :disabled="placesLoading || placeSaving"
                      @click="openDeletePlaceConfirm(place)"
                    >
                      {{ $t('common.delete') }}
                    </button>
                  </div>
                </article>
              </div>
              <div class="empty-state compact" v-else>
                No service places yet.
              </div>
            </div>

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
              <div v-if="activeTab === 'officers'">
                <div v-if="officers.length === 0" class="empty-state">
                  No officers assigned to this barangay yet.
                </div>
                <div v-else-if="filteredOfficers.length === 0" class="empty-state">
                  No officers found matching "{{ memberSearchQuery }}".
                </div>
                <div v-else>
                  <div class="members-table-wrap members-table-desktop">
                    <table class="members-table">
                      <thead>
                        <tr>
                          <th>Reference #</th>
                          <th>Full Name</th>
                          <th>{{ $t('ui.role') }}</th>
                          <th>Land (Ha)</th>
                          <th>{{ $t('ui.phone') }}</th>
                          <th>{{ $t('ui.registered') }}</th>
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
                  <div class="members-card-list members-cards-mobile">
                    <article v-for="officer in filteredOfficers" :key="'m-' + officer.id" class="member-card">
                      <div class="member-card-title">{{ officer.full_name }}</div>
                      <div class="member-card-grid">
                        <div class="member-card-field">
                          <span class="member-card-label">Reference #</span>
                          <span class="member-card-value">{{ officer.reference_number }}</span>
                        </div>
                        <div class="member-card-field">
                          <span class="member-card-label">{{ $t('ui.role') }}</span>
                          <span class="member-card-value">
                            <span class="role-badge" :class="officer.role">{{ formatMemberRole(officer.role) }}</span>
                          </span>
                        </div>
                        <div class="member-card-field">
                          <span class="member-card-label">Land (Ha)</span>
                          <span class="member-card-value">{{ formatHectares(officer.land_area) }}</span>
                        </div>
                        <div class="member-card-field">
                          <span class="member-card-label">{{ $t('ui.phone') }}</span>
                          <span class="member-card-value">{{ officer.phone_number || '—' }}</span>
                        </div>
                        <div class="member-card-field member-card-field--full">
                          <span class="member-card-label">{{ $t('ui.registeredOn') }}</span>
                          <span class="member-card-value">{{ formatDate(officer.registered_on) }}</span>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>

              <div v-if="activeTab === 'farmers'">
                <div v-if="farmers.length === 0" class="empty-state">
                  No farmers registered from this barangay yet.
                </div>
                <div v-else-if="filteredFarmers.length === 0" class="empty-state">
                  No farmers found matching "{{ memberSearchQuery }}".
                </div>
                <div v-else>
                  <div class="members-table-wrap members-table-desktop">
                    <table class="members-table">
                      <thead>
                        <tr>
                          <th>Reference #</th>
                          <th>Full Name</th>
                          <th>Land (Ha)</th>
                          <th>{{ $t('ui.phone') }}</th>
                          <th>{{ $t('ui.registered') }}</th>
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
                  <div class="members-card-list members-cards-mobile">
                    <article v-for="farmer in filteredFarmers" :key="'m-' + farmer.id" class="member-card">
                      <div class="member-card-title">{{ farmer.full_name }}</div>
                      <div class="member-card-grid">
                        <div class="member-card-field">
                          <span class="member-card-label">Reference #</span>
                          <span class="member-card-value">{{ farmer.reference_number }}</span>
                        </div>
                        <div class="member-card-field">
                          <span class="member-card-label">Land (Ha)</span>
                          <span class="member-card-value">{{ formatHectares(farmer.land_area) }}</span>
                        </div>
                        <div class="member-card-field">
                          <span class="member-card-label">{{ $t('ui.phone') }}</span>
                          <span class="member-card-value">{{ farmer.phone_number || '—' }}</span>
                        </div>
                        <div class="member-card-field">
                          <span class="member-card-label">{{ $t('ui.registeredOn') }}</span>
                          <span class="member-card-value">{{ formatDate(farmer.registered_on) }}</span>
                        </div>
                      </div>
                    </article>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Confirmation Modal -->
    <Teleport to="body">
      <div
        v-if="showDeleteConfirm"
        class="modal-overlay barangays-modal-overlay barangays-ui modal-delete-overlay"
        :class="{ 'light-theme': isLight }"
        @click="closeDeleteConfirm"
      >
        <div
          class="modal-content modal-delete"
          role="alertdialog"
          aria-labelledby="delete-confirm-title"
          aria-describedby="delete-confirm-desc"
          @click.stop
        >
          <button
            type="button"
            class="close-btn delete-modal-close"
            @click="closeDeleteConfirm"
            :aria-label="$t('common.close')"
            :disabled="deleteInProgress"
          >×</button>

          <div class="delete-modal-inner">
            <span class="delete-warning-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">
                <path d="M3 6h18" />
                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6" />
                <path d="M10 11v6" />
                <path d="M14 11v6" />
              </svg>
            </span>

            <h2 id="delete-confirm-title" class="delete-modal-title">{{ deleteConfirmTitle }}</h2>
            <p id="delete-confirm-desc" class="delete-confirm-message">{{ deleteConfirmMessage }}</p>

            <div class="delete-warning-banner" role="note">
              <svg class="delete-warning-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 8v4m0 4h.01" stroke-linecap="round" />
              </svg>
              <p class="delete-warning-text">{{ $t('ui.thisActionUndone') }}</p>
            </div>

            <div class="delete-modal-footer">
              <button
                type="button"
                class="btn-secondary btn-delete-cancel"
                @click="closeDeleteConfirm"
                :disabled="deleteInProgress"
              >
                {{ $t('common.cancel') }}
              </button>
              <button
                type="button"
                class="btn-delete-confirm"
                @click="confirmDelete"
                :disabled="deleteInProgress"
              >
                {{ deleteInProgress ? 'Deleting...' : 'Delete' }}
              </button>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Toast notification (replaces browser alert) -->
    <Teleport to="body">
      <Transition name="toast-fade">
        <div
          v-if="toastMessage"
          class="barangays-toast"
          :class="toastType"
          role="alert"
          aria-live="assertive"
        >
          <span class="barangays-toast-icon" aria-hidden="true">
            <svg v-if="toastType === 'success'" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
            <svg v-else xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="10" /><path d="M12 8v4m0 4h.01" stroke-linecap="round" />
            </svg>
          </span>
          <span class="barangays-toast-text">{{ toastMessage }}</span>
          <button type="button" class="barangays-toast-close" @click="clearToast" :aria-label="$t('common.close')">×</button>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
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
const placesLoading = ref(false)
const placeSaving = ref(false)

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

const toastMessage = ref('')
const toastType = ref('success')
let toastTimer = null

const clearToast = () => {
  toastMessage.value = ''
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
}

const showToast = (message, type = 'success') => {
  toastMessage.value = message
  toastType.value = type
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(clearToast, type === 'error' ? 4000 : 2800)
}


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
    const response = await fetch('/api/barangays')
    const data = await response.json()
    if (data.success) {
      barangays.value = data.barangays
    }
  } catch (error) {
    console.error('Error fetching barangays:', error)
    showToast('Failed to load barangays', 'error')
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
    showToast('Barangay name is required', 'error')
    return
  }

  try {
    const url = editingBarangay.value 
      ? `/api/barangays/${editingBarangay.value.id}`
      : '/api/barangays'
    
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
      showToast(editingBarangay.value ? 'Barangay updated successfully!' : 'Barangay added successfully!')
      closeModal()
      fetchBarangays()
    } else {
      showToast(data.message || 'Operation failed', 'error')
    }
  } catch (error) {
    console.error('Error saving barangay:', error)
    showToast('Failed to save barangay', 'error')
  }
}

const deleteBarangay = async (barangay) => {
  try {
    const response = await fetch(`/api/barangays/${barangay.id}`, {
      method: 'DELETE',
      headers: authHeaders(false)
    })

    const data = await response.json()
    
    if (data.success) {
      showToast('Barangay deleted successfully!')
      fetchBarangays()
    } else {
      showToast(data.message || 'Failed to delete barangay', 'error')
    }
  } catch (error) {
    console.error('Error deleting barangay:', error)
    showToast('Failed to delete barangay', 'error')
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

const viewBarangayDetails = async (barangay, { tab = 'officers' } = {}) => {
  selectedBarangay.value = barangay
  activeTab.value = tab
  showDetailsModal.value = true

  if (tab === 'places') placesLoading.value = true

  try {
    const [detailsRes, placesRes] = await Promise.all([
      fetch(`/api/barangays/${barangay.id}`),
      fetch(`/api/barangays/${barangay.id}/places?active_only=0`)
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
    showToast('Failed to load barangay details', 'error')
  } finally {
    if (tab === 'places') placesLoading.value = false
  }
}

const fetchPlacesForBarangay = async (barangayId) => {
  if (!barangayId) return false

  placesLoading.value = true
  try {
    const res = await fetch(`/api/barangays/${barangayId}/places?active_only=0`)
    const data = await res.json()
    if (!data.success) {
      showToast(data.message || 'Failed to refresh places', 'error')
      return false
    }
    places.value = data.places || []
    return true
  } catch (error) {
    console.error('Error fetching places:', error)
    showToast('Failed to refresh places', 'error')
    return false
  } finally {
    placesLoading.value = false
  }
}

const openPlacesModal = async (barangay) => {
  await viewBarangayDetails(barangay, { tab: 'places' })
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedBarangay.value = null
  farmers.value = []
  officers.value = []
  places.value = []
  placesLoading.value = false
  placeSaving.value = false
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
    showToast('Place name is required', 'error')
    return
  }
  if (placeSaving.value || placesLoading.value) return

  const isEdit = !!editingPlaceId.value
  placeSaving.value = true

  try {
    const endpoint = isEdit
      ? `/api/barangays/${selectedBarangay.value.id}/places/${editingPlaceId.value}`
      : `/api/barangays/${selectedBarangay.value.id}/places`

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
      showToast(data.message || 'Failed to save place', 'error')
      return
    }

    const refreshed = await fetchPlacesForBarangay(selectedBarangay.value.id)
    if (refreshed) {
      resetPlaceForm()
      showToast(isEdit ? 'Place updated successfully!' : 'Place added successfully!')
    }
  } catch (error) {
    console.error('Error saving place:', error)
    showToast('Failed to save place', 'error')
  } finally {
    placeSaving.value = false
  }
}

const deletePlace = async (place) => {
  if (!selectedBarangay.value?.id) return

  try {
    const res = await fetch(
      `/api/barangays/${selectedBarangay.value.id}/places/${place.id}`,
      { method: 'DELETE', headers: authHeaders(false) }
    )
    const data = await res.json()
    if (!data.success) {
      showToast(data.message || 'Failed to delete place', 'error')
      return
    }

    const refreshed = await fetchPlacesForBarangay(selectedBarangay.value.id)
    if (refreshed) {
      if (editingPlaceId.value === place.id) resetPlaceForm()
      showToast('Place deleted successfully!')
    }
  } catch (error) {
    console.error('Error deleting place:', error)
    showToast('Failed to delete place', 'error')
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

const isAnyModalOpen = computed(
  () => showModal.value || showDetailsModal.value || showDeleteConfirm.value
)

const lockPageScroll = (locked) => {
  document.body.style.overflow = locked ? 'hidden' : ''
}

watch(isAnyModalOpen, (open) => {
  lockPageScroll(open)
}, { immediate: true })

const onModalKeydown = (event) => {
  if (event.key !== 'Escape') return
  if (showDeleteConfirm.value) {
    closeDeleteConfirm()
    return
  }
  if (showModal.value) {
    closeModal()
    return
  }
  if (showDetailsModal.value) {
    closeDetailsModal()
  }
}

onMounted(() => {
  fetchBarangays()
  window.addEventListener('keydown', onModalKeydown)
})

onUnmounted(() => {
  clearToast()
  lockPageScroll(false)
  window.removeEventListener('keydown', onModalKeydown)
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
  border-bottom: 1.5px solid #94a3b8;
  vertical-align: middle;
}

.barangays-table th:not(:last-child),
.barangays-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
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

.btn-action-text {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0.42rem 0.7rem;
  min-height: 34px;
  border-radius: 8px;
  font-size: 0.8rem;
  font-weight: 700;
  line-height: 1.2;
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
  margin: 0 !important;
  text-align: center;
  transition: filter 0.12s ease, background 0.12s ease, border-color 0.12s ease;
}

.btn-places-text {
  color: #ecfdf5;
  background: rgba(10, 24, 18, 0.95);
  border: 1px solid rgba(134, 239, 172, 0.35);
}

.btn-edit-text {
  color: #ffedd5;
  background: rgba(10, 24, 18, 0.95);
  border: 1px solid rgba(251, 146, 60, 0.45);
}

.btn-delete-text {
  color: #fecaca;
  background: rgba(10, 24, 18, 0.95);
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.btn-places-text:hover,
.btn-edit-text:hover,
.btn-delete-text:hover {
  filter: brightness(1.1);
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

.barangays-icon-view { color: #86efac; }
.barangays-icon-places { color: #ffffff; }
.barangays-icon-edit { color: #fb923c; }
.barangays-icon-delete { color: #ffffff; }

.barangays-icon-btn:hover {
  transform: none;
  box-shadow: none;
}

.barangays-icon-view:hover { color: #bbf7d0; }
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
  inset: 0;
  left: 0;
  background: rgba(6, 12, 9, 0.62);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10050;
  padding:
    max(calc(var(--app-header-height, 70px) + 0.75rem), env(safe-area-inset-top, 0px))
    max(0.75rem, env(safe-area-inset-right, 0px))
    max(0.75rem, env(safe-area-inset-bottom, 0px))
    max(0.75rem, env(safe-area-inset-left, 0px));
  box-sizing: border-box;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.barangays-modal-overlay.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10050 !important;
}

.modal-overlay-spaced {
  align-items: center;
  padding-top: max(calc(var(--app-header-height, 70px) + 0.75rem), env(safe-area-inset-top, 0px));
  padding-bottom: max(0.75rem, env(safe-area-inset-bottom, 0px));
  overflow-y: auto;
}

.modal-content {
  background: rgba(28, 42, 33, 0.96);
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 14px;
  width: 100%;
  max-width: 480px;
  max-height: min(90dvh, calc(100dvh - var(--app-header-height, 70px) - 1.5rem));
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.45), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  margin: auto;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.barangay-edit-modal {
  max-width: 520px;
}

.barangay-edit-modal .modal-body {
  overflow-y: auto;
}

.barangay-edit-modal .modal-footer {
  flex-shrink: 0;
  position: sticky;
  bottom: 0;
  background: rgba(28, 42, 33, 0.98);
}

.modal-header {
  padding: 1.1rem 1.25rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.75rem;
  flex-shrink: 0;
  position: sticky;
  top: 0;
  z-index: 2;
  background: rgba(28, 42, 33, 0.98);
}

.modal-header .close-btn {
  flex-shrink: 0;
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
  width: min(960px, calc(100vw - 1.5rem));
  max-width: min(960px, calc(100vw - 1.5rem));
  max-height: min(90dvh, calc(100dvh - var(--app-header-height, 70px) - 1.5rem));
  overflow: hidden;
  border-radius: 16px;
  box-shadow: 0 24px 48px rgba(0, 0, 0, 0.35);
}

.barangay-details-modal .modal-body {
  overflow-y: auto;
  flex: 1 1 auto;
  min-height: 0;
}

.modal-section {
  margin-bottom: 1.15rem;
}

.modal-section:last-child {
  margin-bottom: 0;
}

.modal-section-heading {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(190, 235, 203, 0.78);
}

.modal-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}

.modal-info-grid--stats {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.modal-info-item {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
  padding: 0.75rem 0.85rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(190, 235, 203, 0.14);
  min-width: 0;
}

.modal-info-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(229, 235, 231, 0.62);
}

.modal-info-value {
  font-size: 0.95rem;
  font-weight: 700;
  color: #eefde6;
  line-height: 1.35;
  word-break: break-word;
}

.modal-info-value--muted {
  font-size: 0.85rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.78);
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
  z-index: 10120 !important;
  align-items: center;
  justify-content: center;
  padding: 1.25rem;
}

.modal-content.modal-delete {
  position: relative;
  max-width: 420px;
  width: 100%;
  border-radius: 18px;
  overflow: visible;
  border: 1px solid rgba(248, 113, 113, 0.28);
  box-shadow: 0 24px 56px rgba(0, 0, 0, 0.45);
}

.delete-modal-close {
  position: absolute !important;
  top: 0.85rem;
  right: 0.85rem;
  z-index: 2;
}

.delete-modal-inner {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.75rem 1.5rem 1.35rem;
  gap: 0;
}

.delete-modal-inner .delete-warning-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 3.25rem;
  height: 3.25rem;
  margin-bottom: 1rem;
  border-radius: 16px;
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border: 2px solid #f87171;
  color: #b91c1c;
  box-shadow: 0 8px 20px rgba(185, 28, 28, 0.18);
}

.delete-modal-inner .delete-warning-icon svg {
  width: 1.5rem;
  height: 1.5rem;
}

.delete-modal-title {
  margin: 0 0 0.45rem;
  padding: 0 1.5rem;
  font-size: 1.35rem;
  font-weight: 800;
  line-height: 1.25;
  color: #eefde6;
}

.delete-confirm-message {
  margin: 0 0 1.1rem;
  padding: 0 0.25rem;
  max-width: 22rem;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.45;
  color: rgba(229, 235, 231, 0.82) !important;
}

.delete-warning-banner {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  width: 100%;
  margin: 0 0 1.25rem;
  padding: 0.7rem 0.85rem;
  border-radius: 12px;
  background: rgba(254, 226, 226, 0.14);
  border: 1px solid rgba(248, 113, 113, 0.35);
  box-sizing: border-box;
}

.delete-warning-banner-icon {
  flex-shrink: 0;
  width: 1.15rem;
  height: 1.15rem;
  color: #fca5a5;
}

.delete-warning-text {
  margin: 0;
  padding: 0;
  border: none;
  background: transparent;
  color: #fecaca;
  font-size: 0.875rem;
  font-weight: 700;
  line-height: 1.35;
  text-align: left;
}

.delete-modal-footer {
  display: flex;
  align-items: stretch;
  justify-content: center;
  gap: 0.65rem;
  width: 100%;
  padding: 0;
  border: none;
  background: transparent;
}

.delete-modal-footer .btn-delete-cancel,
.delete-modal-footer .btn-delete-confirm {
  flex: 1 1 0;
  min-width: 0;
  min-height: 44px;
  padding: 0.65rem 1rem;
  border-radius: 12px;
  font-weight: 800;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: filter 0.15s ease, transform 0.15s ease, background 0.15s ease;
}

.btn-delete-confirm {
  border: 2px solid #991b1b;
  color: #ffffff;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%);
}

.btn-delete-confirm:hover:not(:disabled) {
  filter: brightness(1.08);
  transform: translateY(-1px);
}

.btn-delete-confirm:disabled {
  opacity: 0.65;
  cursor: not-allowed;
  transform: none;
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
  overflow: visible;
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
}

.members-table,
.places-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.members-table {
  min-width: 0;
}

.members-table .td-ref {
  font-family: ui-monospace, 'Cascadia Code', 'Segoe UI Mono', monospace;
  font-size: 0.875rem;
  word-break: break-word;
}

.members-table .td-name {
  word-break: break-word;
  white-space: normal;
}

.members-table .td-role,
.members-table .td-land,
.members-table .td-phone,
.members-table .td-date {
  white-space: normal;
  word-break: break-word;
}

.members-cards-mobile {
  display: none;
}

.members-card-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.member-card {
  padding: 0.85rem 0.9rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(190, 235, 203, 0.14);
}

.member-card-title {
  margin: 0 0 0.65rem;
  font-size: 0.98rem;
  font-weight: 800;
  color: #eefde6;
  line-height: 1.3;
  word-break: break-word;
}

.member-card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.55rem 0.75rem;
}

.member-card-field {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.member-card-field--full {
  grid-column: 1 / -1;
}

.member-card-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(229, 235, 231, 0.58);
}

.member-card-value {
  font-size: 0.88rem;
  font-weight: 650;
  color: rgba(238, 253, 230, 0.95);
  word-break: break-word;
}

.members-table th,
.members-table td,
.places-table th,
.places-table td {
  padding: 0.85rem 0.85rem;
  font-size: 1.0625rem;
  text-align: left;
  border-bottom: 1.5px solid #94a3b8;
  color: rgba(226, 234, 229, 0.92);
  vertical-align: middle;
}

.members-table th:not(:last-child),
.members-table td:not(:last-child),
.places-table th:not(:last-child),
.places-table td:not(:last-child) {
  border-right: 1.5px solid #94a3b8;
}

.members-table th,
.places-table th {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.18) 0%, rgba(45, 212, 191, 0.1) 100%);
  font-weight: 700;
  color: rgba(234, 241, 236, 0.94);
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  white-space: normal;
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
  position: relative;
  border: 1px solid rgba(190, 235, 203, 0.2);
  border-radius: 14px;
  padding: 1.25rem 1.35rem;
  margin-bottom: 0.5rem;
  background: rgba(0, 0, 0, 0.12);
}

.places-card--busy .place-form-card,
.places-card--busy .places-list,
.places-card--busy .empty-state.compact {
  pointer-events: none;
  opacity: 0.55;
}

.places-loading-overlay {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.82);
  backdrop-filter: blur(2px);
}

.places-loading-spinner {
  width: 2.25rem;
  height: 2.25rem;
  border: 3px solid #bbf7d0;
  border-top-color: #16a34a;
  border-radius: 50%;
  animation: places-spin 0.75s linear infinite;
}

.places-loading-text {
  font-size: 1rem;
  font-weight: 700;
  color: #052e16;
}

@keyframes places-spin {
  to { transform: rotate(360deg); }
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
  font-weight: 500;
  text-transform: none;
  letter-spacing: 0.01em;
  color: rgba(187, 247, 208, 0.92);
}

.place-form-card .form-input {
  font-weight: 500;
}

.place-form-card .form-input::placeholder {
  font-weight: 400 !important;
  opacity: 0.75;
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
  overflow: visible;
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
}

.places-table {
  min-width: 0;
}

.places-list {
  display: flex;
  flex-direction: column;
  gap: 0.65rem;
}

.place-item {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.85rem 0.9rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.16);
  border: 1px solid rgba(190, 235, 203, 0.14);
}

.place-item-main {
  min-width: 0;
  flex: 1 1 auto;
}

.place-item-top {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.45rem 0.65rem;
  margin-bottom: 0.45rem;
}

.place-item-name {
  margin: 0;
  font-size: 0.98rem;
  font-weight: 800;
  color: #eefde6;
  line-height: 1.3;
  word-break: break-word;
}

.place-item-meta {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.place-item-label {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(229, 235, 231, 0.58);
}

.place-item-desc {
  font-size: 0.88rem;
  font-weight: 600;
  color: rgba(229, 235, 231, 0.88);
  line-height: 1.4;
  word-break: break-word;
  white-space: normal;
}

.place-item-actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.35rem;
}

.place-action-text {
  display: none;
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

.barangay-name-text {
  display: block;
  font-weight: inherit;
}

.barangay-mobile-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.3rem;
}

.status-pill-sm {
  min-width: 0;
  padding: 0.15rem 0.45rem;
  font-size: 0.7rem;
  border-radius: 6px;
}

/* Mobile list — hidden on desktop */
.barangays-mobile-list {
  display: none;
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
    border-width: 1.5px;
    gap: 0.28rem;
    flex-shrink: 0;
    margin: 0 !important;
    white-space: nowrap;
  }

  .btn-header-icon {
    width: 0.9rem;
    height: 0.9rem;
  }

  .stats-grid {
    grid-template-columns: 1fr 1fr;
    gap: 0.55rem;
    margin-bottom: 0.75rem;
  }

  .stat-card {
    padding: 0.65rem 0.7rem;
    gap: 0.55rem;
    border-radius: 10px;
    border-left-width: 3px;
  }

  .stat-icon-wrap {
    width: 2.25rem;
    height: 2.25rem;
    border-radius: 8px;
  }

  .stat-svg {
    width: 1.1rem;
    height: 1.1rem;
  }

  .stat-value {
    font-size: 1.25rem;
  }

  .stat-label {
    margin-top: 0.15rem;
    font-size: 0.7rem;
    line-height: 1.25;
  }

  .tools-card {
    flex-direction: column;
    align-items: stretch;
    gap: 0.55rem;
    margin-bottom: 0.75rem;
    padding: 0.7rem 0.75rem;
  }

  .search-bar {
    min-width: 0;
    width: 100%;
  }

  .filter-group {
    width: 100%;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 0.45rem;
  }

  .toolbar-input,
  .toolbar-select {
    padding: 0.5rem 0.65rem;
    font-size: 0.85rem !important;
    min-height: 40px;
    border-radius: 8px;
    width: 100%;
    min-width: 0;
    margin: 0 !important;
  }

  .search-input-main {
    padding-left: 2.35rem !important;
  }

  .search-icon-wrap {
    left: 0.65rem;
  }

  .search-svg {
    width: 1rem;
    height: 1rem;
  }

  .card {
    border-radius: 10px;
    min-height: 0;
    overflow: visible;
  }

  /* Hide desktop table — use mobile cards instead */
  .barangays-desktop-wrap {
    display: none !important;
  }

  .barangays-mobile-list {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.55rem;
  }

  .barangay-mobile-empty {
    padding: 1.25rem 0.75rem;
    text-align: center;
    font-size: 0.85rem;
    font-weight: 600;
    color: rgba(229, 235, 231, 0.72);
  }

  .barangay-mobile-card {
    display: flex;
    flex-direction: column;
    gap: 0.55rem;
    padding: 0.7rem 0.75rem;
    border-radius: 10px;
    border: 1px solid rgba(190, 235, 203, 0.2);
    background: rgba(10, 22, 16, 0.55);
  }

  .barangay-mobile-main {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 0.4rem;
    width: 100%;
    padding: 0;
    margin: 0;
    border: none;
    background: transparent;
    text-align: left;
    cursor: pointer;
    color: inherit;
  }

  .barangay-name-text {
    font-size: 0.95rem;
    font-weight: 700;
    line-height: 1.3;
    color: #86efac;
    word-break: break-word;
  }

  .barangay-mobile-meta {
    width: 100%;
  }

  .barangay-mobile-chip {
    display: inline-flex;
    align-items: center;
    padding: 0.14rem 0.42rem;
    border-radius: 999px;
    font-size: 0.68rem;
    font-weight: 700;
    line-height: 1.25;
    color: rgba(220, 252, 231, 0.9);
    background: rgba(0, 0, 0, 0.3);
    border: 1px solid rgba(190, 235, 203, 0.22);
  }

  .barangay-mobile-actions {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 0.35rem;
    width: 100%;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(190, 235, 203, 0.12);
  }

  .barangay-mobile-actions .btn-action-text {
    flex: 1 1 0;
    min-width: 0;
    max-width: none;
    padding: 0.38rem 0.35rem;
    font-size: 0.72rem;
    min-height: 34px;
  }

  .btn-view-area {
    padding: 0.38rem 0.35rem;
    font-size: 0.72rem;
    border-radius: 8px;
    border-width: 1.5px;
    margin: 0 !important;
  }

  .status-pill {
    min-width: 0;
    padding: 0.2rem 0.45rem;
    font-size: 0.7rem;
  }

  .btn-header-add {
    margin: 0 !important;
  }

  .modal-content:not(.modal-large) {
    width: min(94%, 520px);
    max-width: none;
  }

  .modal-info-grid,
  .modal-info-grid--stats,
  .compact-form-grid {
    grid-template-columns: 1fr;
  }

  .members-table-desktop {
    display: none !important;
  }

  .members-cards-mobile {
    display: flex;
  }

  .place-item {
    flex-direction: column;
    align-items: stretch;
  }

  .place-item-actions {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: center;
    gap: 0.45rem;
    width: 100%;
    padding-top: 0.45rem;
    border-top: 1px solid rgba(190, 235, 203, 0.12);
  }

  .place-item-actions .place-action-icon {
    display: none !important;
  }

  .place-item-actions .place-action-text {
    display: inline-flex;
    flex: 1 1 0;
    min-width: 0;
    max-width: none;
    justify-content: center;
    align-items: center;
    padding: 0.42rem 0.55rem;
    font-size: 0.78rem;
    min-height: 36px;
  }

  .details-tabs.filter-tabs {
    display: flex;
    flex-wrap: nowrap;
    align-items: stretch;
    gap: 0.4rem;
    margin-bottom: 0.9rem;
  }

  .details-tabs .tab {
    flex: 1 1 0;
    min-width: 0;
    padding: 0.48rem 0.35rem;
    font-size: 0.72rem;
    border-radius: 10px !important;
    border-width: 1.5px !important;
    text-align: center;
    line-height: 1.2;
  }

  .places-header {
    margin-bottom: 0.55rem;
    gap: 0.55rem;
  }

  .places-section-title {
    gap: 0.5rem;
  }

  .places-section-icon {
    width: 2.15rem;
    height: 2.15rem;
    border-radius: 10px;
  }

  .places-header h3 {
    font-size: 1.05rem;
  }

  .places-header p {
    margin-top: 0.1rem;
    font-size: 0.8rem;
    line-height: 1.3;
  }

  .places-count {
    padding: 0.25rem 0.55rem;
    font-size: 0.75rem;
  }

  .place-form-card {
    padding: 0.7rem 0.75rem;
    margin-bottom: 0.65rem;
  }

  .place-form-title {
    margin-bottom: 0.45rem;
    font-size: 0.78rem;
    letter-spacing: 0.03em;
  }

  .place-form-row {
    gap: 0.5rem;
  }

  .place-form-field {
    gap: 0.2rem;
  }

  .place-form-label {
    margin: 0 !important;
    padding: 0 !important;
    font-size: 0.75rem;
    line-height: 1.2;
  }

  .place-form-card .form-input,
  .place-form-card .place-status {
    margin: 0 !important;
    padding: 0.45rem 0.65rem;
    font-size: 0.85rem;
    min-height: 38px;
  }

  .place-form-actions {
    gap: 0.4rem;
    margin-top: 0.1rem;
  }

  .btn-place-save,
  .btn-place-cancel {
    padding: 0.5rem 0.85rem;
    font-size: 0.85rem;
    min-height: 38px;
  }

  .modal-header h2 {
    font-size: 1.05rem;
  }

  .form-hint-area {
    font-size: 0.78rem;
    padding: 0.55rem 0.65rem;
  }
}

@media (max-width: 360px) {
  .details-tabs.filter-tabs {
    flex-wrap: wrap;
  }

  .details-tabs .tab {
    flex: 1 1 calc(50% - 0.2rem);
  }
}

@media (max-width: 1024px) {
  .modal-overlay,
  .modal-overlay-spaced {
    left: 0;
  }

  .modal-large {
    width: min(960px, calc(100vw - 1.25rem));
    max-width: calc(100vw - 1.25rem);
  }
}

@media (max-width: 480px) {
  .page-container.barangays-page {
    margin: 0 -0.5rem;
    width: calc(100% + 1rem);
    padding: 0.6rem;
  }

  .page-title {
    font-size: 1.1rem !important;
  }

  .btn-header-add {
    padding: 0.4rem 0.55rem;
    font-size: 0.72rem;
  }

  .stats-grid {
    gap: 0.45rem;
  }

  .stat-label {
    font-size: 0.65rem;
  }

  .modal-overlay,
  .modal-overlay-spaced {
    padding-top: max(calc(var(--app-header-height, 70px) + 0.65rem), env(safe-area-inset-top, 0px));
    padding-left: 0.65rem;
    padding-right: 0.65rem;
  }

  .modal-large {
    max-height: min(92dvh, calc(100dvh - var(--app-header-height, 70px) - 1.25rem));
  }

  .modal-large .modal-header {
    padding: 1rem 0.9rem;
  }

  .modal-large .modal-body {
    padding: 0.85rem 0.9rem 1rem;
  }

  .places-table {
    min-width: 0 !important;
  }
}

/* ===== LIGHT MODE — Senior-friendly bright theme ===== */
.page-container.barangays-page.barangays-ui.light-theme {
  font-size: 16px;
  line-height: 1.5;
  background: linear-gradient(160deg, #f7fdf9 0%, #f0fdf4 45%, #e8f8ec 100%);
  color: #052e16;
}

.barangays-ui.light-theme {
  font-size: 16px;
  line-height: 1.5;
  color: #052e16;
}

.barangays-modal-overlay.barangays-ui.light-theme {
  background: rgba(15, 23, 42, 0.48) !important;
}

.barangays-ui.light-theme .modal-header {
  background: #fffef9;
}

.barangays-ui.light-theme .barangay-edit-modal .modal-footer,
.barangays-ui.light-theme .modal-footer {
  background: #fffef9;
  border-top-color: #bbf7d0;
}

.barangays-ui.light-theme .barangay-edit-modal .modal-subtitle,
.barangays-ui.light-theme .modal-subtitle {
  color: #166534;
}

.barangays-ui.light-theme .modal-section-heading {
  color: #166534;
}

.barangays-ui.light-theme .modal-info-item,
.barangays-ui.light-theme .place-item,
.barangays-ui.light-theme .member-card {
  background: #ffffff;
  border-color: #bbf7d0;
}

.barangays-ui.light-theme .modal-info-label,
.barangays-ui.light-theme .place-item-label,
.barangays-ui.light-theme .member-card-label {
  color: #64748b;
}

.barangays-ui.light-theme .modal-info-value,
.barangays-ui.light-theme .place-item-name,
.barangays-ui.light-theme .place-item-desc,
.barangays-ui.light-theme .member-card-title,
.barangays-ui.light-theme .member-card-value {
  color: #052e16;
}

.barangays-ui.light-theme .modal-info-value--muted {
  color: #166534;
}

.barangays-ui.light-theme .place-item-actions {
  border-top-color: #bbf7d0;
}

.barangays-ui.light-theme .page-header-split {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.barangays-ui.light-theme .page-title {
  color: #000000;
}

.barangays-ui.light-theme .page-subtitle {
  color: #000000;
}

.barangays-ui.light-theme .stat-label {
  color: #000000;
}

.barangays-ui.light-theme .stat-card {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
}

.barangays-ui.light-theme .stat-icon-wrap {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #15803d;
}

.barangays-ui.light-theme .stat-value {
  color: #000000;
}

.barangays-ui.light-theme .tools-card {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08);
}

.barangays-ui.light-theme .search-icon-wrap {
  color: #15803d;
}

.barangays-ui.light-theme .toolbar-input,
.barangays-ui.light-theme .toolbar-select {
  background: #ffffff;
  border-color: #94a3b8;
  color: #000000;
}

.barangays-ui.light-theme .toolbar-input::placeholder {
  color: #475569;
  opacity: 1;
}

.barangays-ui.light-theme .toolbar-select option {
  background: #ffffff;
  color: #052e16;
}

.barangays-ui.light-theme .card {
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1);
}

.barangays-ui.light-theme .barangays-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #000000;
  border-bottom-color: #16a34a;
}

.barangays-ui.light-theme .barangays-table td {
  color: #000000;
  border-bottom-color: #94a3b8;
  background: #ffffff;
}

.barangays-ui.light-theme .barangays-table th:not(:last-child),
.barangays-ui.light-theme .barangays-table td:not(:last-child) {
  border-right-color: #94a3b8;
}

.barangays-ui.light-theme .barangays-table tbody tr:hover {
  background: #ecfdf5 !important;
}

.barangays-ui.light-theme .loading-cell,
.barangays-ui.light-theme .empty-cell {
  color: #000000;
}

.barangays-ui.light-theme .area-value {
  color: #000000;
}

.barangays-ui.light-theme .barangay-name-link {
  color: #000000;
}

.barangays-ui.light-theme .barangay-name-link:hover {
  color: #15803d;
}

.barangays-ui.light-theme .barangay-mobile-chip {
  color: #166534;
  background: #f0fdf4;
  border-color: #86efac;
}

.barangays-ui.light-theme .barangay-mobile-card {
  background: #ffffff;
  border-color: #86efac;
}

.barangays-ui.light-theme .barangay-mobile-main .barangay-name-text {
  color: #166534;
}

.barangays-ui.light-theme .barangay-mobile-actions {
  border-top-color: #d1fae5;
}

.barangays-ui.light-theme .barangay-mobile-empty {
  color: #166534;
}

.barangays-ui.light-theme .status-pill.active {
  color: #166534;
  border-color: rgba(16, 185, 129, 0.55);
  background: transparent;
}

.barangays-ui.light-theme .status-pill.inactive {
  color: #991b1b;
  border-color: rgba(248, 113, 113, 0.5);
  background: transparent;
}

.barangays-ui.light-theme .btn-view-area {
  color: #000000;
  background: #ffffff;
  border-color: #16a34a;
}

.barangays-ui.light-theme .btn-places-text {
  color: #166534;
  background: #f0fdf4;
  border-color: #86efac;
}

.barangays-ui.light-theme .btn-edit-text {
  color: #9a3412;
  background: #fff7ed;
  border-color: #fdba74;
}

.barangays-ui.light-theme .btn-delete-text {
  color: #991b1b;
  background: #fef2f2;
  border-color: #fca5a5;
}

.barangays-ui.light-theme .btn-header-add {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  border-color: #14532d;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.12);
}

.barangays-ui.light-theme .btn-header-add:hover {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  filter: none;
}

.barangays-ui.light-theme .modal-content {
  background: #fffef9;
  border-color: #86efac;
  color: #052e16;
}

.barangays-ui.light-theme .modal-header {
  border-bottom-color: #bbf7d0;
}

.barangays-ui.light-theme .modal-header h2 {
  color: #052e16;
}

.barangays-ui.light-theme .barangay-details-modal .modal-title-text h2 {
  color: #000000;
}

.barangays-ui.light-theme .barangay-details-modal .modal-subtitle {
  color: #166534;
}

.barangays-ui.light-theme .barangay-details-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: #86efac;
  color: #15803d;
}

.barangays-ui.light-theme .barangay-details-modal .modal-footer {
  background: #f0fdf4;
  border-top-color: #86efac;
}

.barangays-ui.light-theme .barangay-details-modal .close-btn {
  background: #ffffff;
  border-color: #cbd5e1;
  color: #000000;
}

.barangays-ui.light-theme .members-table-wrap {
  border-color: #94a3b8;
  background: #ffffff;
}

.barangays-ui.light-theme .places-table-wrap {
  border-color: #94a3b8;
  background: #ffffff;
}

.barangays-ui.light-theme .close-btn {
  background: #f0fdf4;
  border-color: #bbf7d0;
  color: #64748b;
}

.barangays-ui.light-theme .modal-footer {
  background: #fffef9;
  border-top-color: #bbf7d0;
}

.barangays-ui.light-theme .form-group label {
  color: #000000;
}

.barangays-ui.light-theme .form-input {
  background: #ffffff;
  border-color: #94a3b8;
  color: #000000;
}

.barangays-ui.light-theme .form-hint-area {
  background: #f0fdf4;
  border-color: #86efac;
  color: #000000;
}

.barangays-ui.light-theme .btn-secondary {
  color: #000000;
  -webkit-text-fill-color: #000000;
  background: #ffffff;
  border-color: #64748b;
  box-shadow: 0 2px 8px rgba(15, 23, 42, 0.08);
  filter: none;
  transform: none;
}

.barangays-ui.light-theme .btn-secondary:hover {
  background: #f1f5f9;
  border-color: #475569;
  color: #000000;
  -webkit-text-fill-color: #000000;
  filter: none;
}

.barangays-ui.light-theme .members-table th,
.barangays-ui.light-theme .places-table th {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  color: #000000;
  border-bottom-color: #16a34a;
}

.barangays-ui.light-theme .members-table th:not(:last-child),
.barangays-ui.light-theme .members-table td:not(:last-child),
.barangays-ui.light-theme .places-table th:not(:last-child),
.barangays-ui.light-theme .places-table td:not(:last-child) {
  border-right-color: #94a3b8;
}

.barangays-ui.light-theme .members-table td,
.barangays-ui.light-theme .places-table td {
  color: #000000;
  border-bottom-color: #94a3b8;
  background: #ffffff;
}

.barangays-ui.light-theme .members-table tbody tr:hover,
.barangays-ui.light-theme .places-table tbody tr:hover {
  background: #ecfdf5;
}

.barangays-ui.light-theme .empty-state {
  color: #000000;
}

.barangays-ui.light-theme .area-summary-card {
  background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%);
  border-color: #86efac;
}

.barangays-ui.light-theme .area-summary-title {
  color: #166534;
}

.barangays-ui.light-theme .area-summary-value {
  color: #15803d;
}

.barangays-ui.light-theme .area-summary-note {
  color: #000000;
}

.barangays-ui.light-theme .places-card {
  background: #f8fdf9;
  border-color: #bbf7d0;
}

.barangays-ui.light-theme .places-loading-overlay {
  background: rgba(255, 255, 255, 0.9);
}

.barangays-ui.light-theme .places-loading-text {
  color: #000000;
}

.barangays-ui.light-theme .places-section-icon {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border-color: #86efac;
  color: #15803d;
}

.barangays-ui.light-theme .places-header h3 {
  color: #000000;
}

.barangays-ui.light-theme .places-header p {
  color: #166534;
}

.barangays-ui.light-theme .place-form-card {
  background: #ffffff;
  border-color: #e2e8f0;
}

.barangays-ui.light-theme .place-form-title {
  color: #166534;
  font-weight: 500;
}

.barangays-ui.light-theme .place-form-card .form-input::placeholder {
  font-weight: 400 !important;
  color: #64748b !important;
  -webkit-text-fill-color: #64748b !important;
}

.barangays-ui.light-theme .place-form-label {
  color: #000000;
}

.barangays-ui.light-theme .places-table-wrap {
  border-color: #94a3b8;
  background: #ffffff;
}

.barangays-ui.light-theme .places-card .place-status-badge.active {
  color: #15803d;
  background: #f0fdf4;
  border-color: #86efac;
}

.barangays-ui.light-theme .places-card .place-status-badge.inactive {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fca5a5;
}

.barangays-ui.light-theme .modal-delete {
  border-color: #fca5a5;
  box-shadow: 0 24px 48px rgba(15, 23, 42, 0.18);
}

.barangays-ui.light-theme .modal-delete .delete-modal-title {
  color: #0f172a;
}

.barangays-ui.light-theme .modal-delete .delete-confirm-message {
  color: #475569 !important;
}

.barangays-ui.light-theme .modal-delete .delete-warning-banner {
  background: #fef2f2;
  border-color: #fecaca;
}

.barangays-ui.light-theme .modal-delete .delete-warning-banner-icon {
  color: #dc2626;
}

.barangays-ui.light-theme .modal-delete .delete-warning-text {
  background: transparent;
  border: none;
  color: #991b1b;
}

.barangays-ui.light-theme .modal-delete .delete-warning-icon {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  border-color: #f87171;
  color: #b91c1c;
}

.barangays-ui.light-theme .modal-delete .delete-modal-footer {
  background: transparent;
  border: none;
}

.barangays-ui.light-theme .modal-delete .btn-delete-confirm {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%) !important;
  border-color: #991b1b !important;
}

.barangays-ui.light-theme .status-badge.active {
  color: #15803d;
  background: #f0fdf4;
  border-color: #86efac;
}

.barangays-ui.light-theme .status-badge.inactive {
  color: #b91c1c;
  background: #fef2f2;
  border-color: #fca5a5;
}

.barangays-ui.light-theme .role-badge {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #14532d !important;
}

.barangays-ui.light-theme .role-badge.president {
  background: #e0e7ff !important;
  color: #4338ca !important;
  border-color: #a5b4fc !important;
}

.barangays-ui.light-theme .role-badge.treasurer {
  background: #fce7f3 !important;
  color: #be185d !important;
  border-color: #f9a8d4 !important;
}

.barangays-ui.light-theme .role-badge.auditor {
  background: #fef9c3 !important;
  color: #a16207 !important;
  border-color: #fcd34d !important;
}

.barangays-ui.light-theme .role-badge.operator {
  background: #e0f2fe !important;
  color: #0369a1 !important;
  border-color: #7dd3fc !important;
}

.barangays-ui.light-theme .role-badge.farmer {
  background: #dbeafe !important;
  color: #1d4ed8 !important;
  border-color: #93c5fd !important;
}

.barangays-ui.light-theme .role-badge.admin {
  background: #fef9c3 !important;
  color: #a16207 !important;
  border-color: #fcd34d !important;
}

.barangays-ui.light-theme .role-badge.agriculturist {
  background: #f0fdf4 !important;
  color: #15803d !important;
  border-color: #86efac !important;
}

.barangays-ui.light-theme .role-badge.operation_manager,
.barangays-ui.light-theme .role-badge.business_manager {
  background: #dcfce7 !important;
  color: #15803d !important;
  border-color: #bbf7d0 !important;
}

.barangays-ui.light-theme .modal-search-input {
  background: #ffffff !important;
  border-color: #cbd5e1 !important;
  color: #052e16 !important;
}

.barangays-ui.light-theme .tab.active {
  color: #052e16 !important;
  background: #dcfce7 !important;
  border-color: #16a34a !important;
}

.barangays-ui.light-theme .barangays-table tbody tr:nth-child(even) td:not(.td-actions) {
  background: #f8fdf9;
}

.barangays-ui.light-theme .barangays-table tbody tr:nth-child(even) td.td-actions {
  background: #ffffff;
}

.barangays-ui.light-theme .barangays-icon-btn {
  background: #374151;
  border-color: #4b5563;
}

.barangays-ui.light-theme .barangays-icon-places {
  color: #ffffff;
}

.barangays-ui.light-theme .barangays-icon-view {
  color: #86efac;
}

.barangays-ui.light-theme .barangays-icon-edit {
  color: #ea580c;
}

.barangays-ui.light-theme .barangays-icon-delete {
  color: #ffffff;
}

.barangays-ui.light-theme .barangays-icon-edit:hover {
  color: #f97316;
  background: #4b5563;
}

.barangays-ui.light-theme .barangays-icon-delete:hover {
  color: #ffffff;
  background: #7f1d1d;
  border-color: #b91c1c;
}

.barangays-ui.light-theme .members-table tbody tr:nth-child(even) td,
.barangays-ui.light-theme .places-table tbody tr:nth-child(even) td {
  background: #f8fdf9;
}

.barangays-ui.light-theme .font-semibold {
  color: #000000;
}

.barangays-ui.light-theme .btn-submit {
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  background: linear-gradient(135deg, #16a34a 0%, #15803d 100%);
  border-color: #14532d;
  box-shadow: 0 4px 14px rgba(22, 101, 52, 0.28);
}

.barangays-ui.light-theme .btn-submit:hover {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  filter: none;
}
</style>

<!-- Toast is teleported to body — needs unscoped styles -->
<style>
.barangays-toast {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 10100;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  min-width: min(420px, calc(100vw - 2rem));
  max-width: min(560px, calc(100vw - 2rem));
  padding: 1rem 1.15rem;
  border-radius: 14px;
  box-shadow: 0 20px 48px rgba(15, 23, 42, 0.35);
  border: 1px solid #16a34a;
  border-left-width: 6px;
  background: #ffffff !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

.barangays-toast.success {
  border-color: #16a34a !important;
  border-left-color: #15803d !important;
}

.barangays-toast.error {
  border-color: #dc2626 !important;
  border-left-color: #b91c1c !important;
}

.barangays-toast-icon {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
}

.barangays-toast.success .barangays-toast-icon {
  color: #15803d !important;
  -webkit-text-fill-color: #15803d !important;
}

.barangays-toast.error .barangays-toast-icon {
  color: #dc2626 !important;
  -webkit-text-fill-color: #dc2626 !important;
}

.barangays-toast-icon svg {
  width: 1.75rem;
  height: 1.75rem;
}

.barangays-toast-text {
  flex: 1;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.45;
}

.barangays-toast-close {
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid #64748b !important;
  border-radius: 8px;
  background: #f1f5f9 !important;
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
  cursor: pointer;
  box-shadow: none !important;
  filter: none !important;
}

.barangays-toast-close:hover {
  background: #e2e8f0 !important;
  border-color: #334155 !important;
  transform: none !important;
}

/* Beat global dark-mode mint button overrides on delete confirm */
body.glass-dark .barangays-modal-overlay .modal-delete .btn-delete-confirm,
.barangays-modal-overlay .modal-delete .btn-delete-confirm {
  background: linear-gradient(135deg, #ef4444 0%, #b91c1c 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border: 2px solid #991b1b !important;
  box-shadow: 0 8px 18px rgba(185, 28, 28, 0.28) !important;
  filter: none !important;
}

body.glass-dark .barangays-modal-overlay .modal-delete .btn-delete-confirm:hover:not(:disabled),
.barangays-modal-overlay .modal-delete .btn-delete-confirm:hover:not(:disabled) {
  background: linear-gradient(135deg, #f87171 0%, #dc2626 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  filter: none !important;
}

body.glass-dark .barangays-modal-overlay .modal-delete .btn-delete-cancel,
.barangays-modal-overlay .modal-delete .btn-delete-cancel {
  background: rgba(255, 255, 255, 0.08) !important;
  color: #eefde6 !important;
  -webkit-text-fill-color: #eefde6 !important;
  border: 2px solid rgba(190, 235, 203, 0.35) !important;
  box-shadow: none !important;
}

body.glass-dark .barangays-modal-overlay.light-theme .modal-delete .btn-delete-cancel,
.barangays-modal-overlay.light-theme .modal-delete .btn-delete-cancel {
  background: #ffffff !important;
  color: #0f172a !important;
  -webkit-text-fill-color: #0f172a !important;
  border: 2px solid #94a3b8 !important;
}

body.glass-dark .barangays-modal-overlay .modal-delete .delete-modal-close,
.barangays-modal-overlay .modal-delete .delete-modal-close {
  background: rgba(0, 0, 0, 0.22) !important;
  color: rgba(238, 253, 230, 0.85) !important;
  -webkit-text-fill-color: rgba(238, 253, 230, 0.85) !important;
  border: 1px solid rgba(190, 235, 203, 0.2) !important;
}

body.glass-dark .barangays-modal-overlay.light-theme .modal-delete .delete-modal-close,
.barangays-modal-overlay.light-theme .modal-delete .delete-modal-close {
  background: #f8fafc !important;
  color: #334155 !important;
  -webkit-text-fill-color: #334155 !important;
  border: 1px solid #cbd5e1 !important;
}

/* Service Places form — keep title + placeholders normal weight */
.barangays-modal-overlay .place-form-title {
  font-weight: 500 !important;
  text-transform: none !important;
}

.barangays-modal-overlay .place-form-card .form-input::placeholder,
.barangays-modal-overlay .place-form-card input::placeholder {
  font-weight: 400 !important;
  opacity: 0.8;
}

.toast-fade-enter-active,
.toast-fade-leave-active {
  transition: opacity 0.28s ease, transform 0.28s ease;
}

.toast-fade-enter-from,
.toast-fade-leave-to {
  opacity: 0;
  transform: translate(-50%, -50%) scale(0.96);
}
</style>
