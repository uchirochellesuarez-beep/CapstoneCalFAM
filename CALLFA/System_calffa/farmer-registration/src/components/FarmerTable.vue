<template>
  <div class="registered-members-card section-card">
    <h2 class="registered-members-title">{{ $t('common.registeredMembers') }}</h2>
    
    <div v-if="displayLoading" class="registered-members-muted text-center py-8">
      {{ $t('ui.loadingMembers') }}
    </div>
    <div v-else-if="displayError" class="registered-members-error text-center py-8">
      Error: {{ displayError }}
    </div>
    <div v-else-if="displayFarmers.length === 0" class="registered-members-muted text-center py-8">
      {{ $t('ui.noMembersRegistered') }}
    </div>
    <div v-else>
      <!-- Role Tabs -->
      <div class="role-tabs stats-grid stats-grid--roles">
        <button
          type="button"
          @click="activeRole = 'operation_manager'"
          :class="['role-tab stat-card', { active: activeRole === 'operation_manager' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('ui.operation') }} Managers</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.operation_manager.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'business_manager'"
          :class="['role-tab stat-card', { active: activeRole === 'business_manager' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('ui.business') }} Managers</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.business_manager.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'farmer'"
          :class="['role-tab stat-card', { active: activeRole === 'farmer' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('ui.farmers') }}</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.farmer.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'admin'"
          :class="['role-tab stat-card', { active: activeRole === 'admin' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('common.admins') }}</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.admin.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'president'"
          :class="['role-tab stat-card', { active: activeRole === 'president' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('common.presidents') }}</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.president.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'treasurer'"
          :class="['role-tab stat-card', { active: activeRole === 'treasurer' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('common.treasurers') }}</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.treasurer.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'auditor'"
          :class="['role-tab stat-card', { active: activeRole === 'auditor' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('common.auditors') }}</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.auditor.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'operator'"
          :class="['role-tab stat-card', { active: activeRole === 'operator' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('ui.operators') }}</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.operator.length }}</span>
          </span>
        </button>
        <button
          type="button"
          @click="activeRole = 'agriculturist'"
          :class="['role-tab stat-card', { active: activeRole === 'agriculturist' }]"
        >
          <span class="role-tab-content stat-content">
            <span class="role-tab-label stat-label">{{ $t('common.agriculturists') }}</span>
            <span class="role-tab-count stat-value">{{ farmersByRole.agriculturist.length }}</span>
          </span>
        </button>
      </div>

      <!-- Role members — mobile cards + desktop table -->
      <div class="members-mobile-list">
        <article v-for="farmer in currentRoleFarmers" :key="'m-' + farmer.id" class="members-mobile-card">
          <div class="mmc-head">
            <div class="member-avatar-wrap">
              <img
                v-if="farmer.profile_picture"
                :src="getProfilePictureUrl(farmer.profile_picture)"
                :alt="$t('ui.profile')"
                class="member-avatar"
              />
              <div v-else class="member-avatar member-avatar-fallback">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-gray-400">
                  <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
            <div class="mmc-head-text">
              <h3 class="mmc-name">{{ farmer.full_name }}</h3>
              <p class="mmc-ref">{{ farmer.reference_number }}</p>
            </div>
            <span v-if="farmer.status === 'approved'" class="status-chip status-chip-approved">{{ $t('common.approved') }}</span>
            <span v-else-if="farmer.status === 'rejected'" class="status-chip status-chip-rejected">{{ $t('common.rejected') }}</span>
            <span v-else class="status-chip status-chip-pending">{{ $t('common.pending') }}</span>
          </div>
          <div class="mmc-rows">
            <div class="mmc-row"><span>{{ $t('ui.phone') }}</span><strong>{{ farmer.phone_number || 'N/A' }}</strong></div>
            <div class="mmc-row"><span>{{ $t('ui.address') }}</span><strong>{{ formatMemberAddress(farmer) }}</strong></div>
            <div class="mmc-row"><span>{{ $t('ui.role') }}</span><strong><span class="role-badge" :class="farmer.role">{{ formatMemberRole(farmer.role) }}</span></strong></div>
            <div class="mmc-row">
              <span>{{ $t('ui.membership') }}</span>
              <strong>
                <span v-if="(farmer.membership_status || 'member') === 'member'" class="member-chip member-chip-member">{{ $t('ui.member') }}</span>
                <span v-else class="member-chip member-chip-nonmember">{{ $t('ui.nonMember') }}</span>
              </strong>
            </div>
            <div class="mmc-row"><span>{{ $t('ui.registered') }}</span><strong>{{ formatDate(farmer.registered_on) }}</strong></div>
          </div>
          <div class="members-action-row mmc-actions">
            <button type="button" @click="viewDetails(farmer)" class="table-action-btn table-action-view mmc-action-text" :title="$t('common.view')" :aria-label="$t('common.view')">
              {{ $t('common.view') }}
            </button>
            <button type="button" @click="startEdit(farmer)" class="table-action-btn table-action-edit mmc-action-text" :title="$t('common.edit')" :aria-label="$t('common.edit')">
              {{ $t('common.edit') }}
            </button>
            <button
              v-if="farmer.role !== 'admin'"
              type="button"
              @click="deleteFarmer(farmer)"
              class="table-action-btn table-action-delete mmc-action-text"
              :title="$t('common.delete')"
              :aria-label="$t('common.delete')"
            >
              {{ $t('common.delete') }}
            </button>
          </div>
        </article>
        <p v-if="currentRoleFarmers.length === 0" class="mmc-empty">No {{ activeRole }}s registered yet.</p>
      </div>

      <!-- Table for selected role (layout matches AdminLoansPage loans-table) -->
      <div class="registered-table-scroll members-desktop-only">
        <div class="members-table-container">
          <table class="members-table w-full border-collapse">
          <colgroup>
            <col class="members-col-photo" />
            <col class="members-col-ref" />
            <col class="members-col-name" />
            <col class="members-col-dob" />
            <col class="members-col-address" />
            <col class="members-col-phone" />
            <col class="members-col-edu" />
            <col class="members-col-role" />
            <col class="members-col-member" />
            <col class="members-col-reg" />
            <col class="members-col-status" />
            <col class="members-col-actions" />
          </colgroup>
          <thead>
            <tr>
              <th>{{ $t('ui.photo') }}</th>
              <th>{{ $t('ui.refHash') }}</th>
              <th>{{ $t('ui.name') }}</th>
              <th>{{ $t('ui.dob') }}</th>
              <th>{{ $t('ui.address') }}</th>
              <th>{{ $t('ui.phone') }}</th>
              <th>{{ $t('ui.education') }}</th>
              <th class="members-th-role">{{ $t('ui.role') }}</th>
              <th>{{ $t('ui.membership') }}</th>
              <th>{{ $t('ui.registered') }}</th>
              <th>{{ $t('ui.status') }}</th>
              <th class="members-th-actions">{{ $t('ui.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-if="currentRoleFarmers.length === 0">
              <td colspan="12" class="members-empty-row">
                No {{ activeRole }}s registered yet.
              </td>
            </tr>
            <tr v-for="farmer in currentRoleFarmers" :key="farmer.id" class="members-data-row">
              <td class="members-cell-center">
                <div class="flex flex-col items-center gap-1">
                  <div class="relative member-avatar-wrap">
                    <img 
                      v-if="farmer.profile_picture" 
                      :src="getProfilePictureUrl(farmer.profile_picture)" 
                      :alt="$t('ui.profile')" 
                      class="member-avatar"
                    />
                    <div v-else class="member-avatar member-avatar-fallback">
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-6 h-6 text-gray-400">
                        <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                      </svg>
                    </div>
                  </div>
                </div>
              </td>
              <td class="members-cell members-td-ref">{{ farmer.reference_number }}</td>
              <td class="members-cell members-td-name">
                <span>{{ farmer.full_name }}</span>
              </td>
              <td class="members-cell">
                <span>{{ formatDate(farmer.date_of_birth) }}</span>
              </td>
              <td class="members-cell">
                <span>{{ formatMemberAddress(farmer) }}</span>
              </td>
              <td class="members-cell">
                <span>{{ farmer.phone_number }}</span>
              </td>
              <td class="members-cell">
                <span>{{ farmer.educational_status || 'N/A' }}</span>
              </td>
              <td class="members-cell members-td-role">
                <span class="role-badge" :class="farmer.role">{{ formatMemberRole(farmer.role) }}</span>
              </td>
              <td class="members-cell">
                <span v-if="(farmer.membership_status || 'member') === 'member'" class="member-chip member-chip-member">
                  {{ $t('ui.member') }}
                </span>
                <span v-else class="member-chip member-chip-nonmember">
                  {{ $t('ui.nonMember') }}
                </span>
              </td>
              <td class="members-cell">{{ formatDate(farmer.registered_on) }}</td>
              <td class="members-cell">
                <span v-if="farmer.status === 'approved'" class="status-chip status-chip-approved">
                  {{ $t('common.approved') }}
                </span>
                <span v-else-if="farmer.status === 'rejected'" class="status-chip status-chip-rejected">
                  {{ $t('common.rejected') }}
                </span>
              </td>
              <td class="members-cell members-actions-cell">
                <div class="members-action-row">
                  <button type="button" @click="viewDetails(farmer)" class="table-action-btn table-action-view" :title="$t('common.view')" :aria-label="$t('common.view')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button type="button" @click="startEdit(farmer)" class="table-action-btn table-action-edit" :title="$t('common.edit')" :aria-label="$t('common.edit')">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                    </svg>
                  </button>
                  <button
                    v-if="farmer.role !== 'admin'"
                    type="button"
                    @click="deleteFarmer(farmer)"
                    class="table-action-btn table-action-delete"
                    :title="$t('common.delete')"
                    :aria-label="$t('common.delete')"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6"/>
                      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                      <path d="M10 11v6M14 11v6"/>
                      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                    </svg>
                  </button>
                  <span
                    v-else
                    class="table-action-btn table-action-protected"
                    title="Admin accounts cannot be deleted"
                    aria-label="Protected"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                    </svg>
                  </span>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
        </div>
      </div>
    </div>

    <!-- View Member Information — teleported so it centers above header -->
    <Teleport to="body">
      <Transition name="member-info">
        <div
          v-if="showDetailsModal"
          class="member-info-overlay"
          :class="{ 'light-theme': isLight }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="member-info-title"
          @click.self="closeDetailsModal"
        >
          <div class="member-info-dialog" @click.stop>
            <div class="member-info-header">
              <h3 id="member-info-title" class="member-info-title">Member Information</h3>
              <button
                type="button"
                class="member-info-close"
                :aria-label="$t('common.close')"
                @click="closeDetailsModal"
              >
                &times;
              </button>
            </div>
            <div class="member-info-body" v-if="selectedFarmer">
              <div class="member-info-profile">
                <img
                  v-if="selectedFarmer.profile_picture"
                  :src="getProfilePictureUrl(selectedFarmer.profile_picture)"
                  :alt="$t('ui.profile')"
                  class="member-info-avatar"
                />
                <div v-else class="member-info-avatar member-info-avatar-fallback">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                  </svg>
                </div>
                <h4 class="member-name">{{ selectedFarmer.full_name }}</h4>
                <span class="role-badge mt-2" :class="selectedFarmer.role">{{ formatMemberRole(selectedFarmer.role) }}</span>
              </div>
              <div class="details-grid">
                <div class="detail-item">
                  <span class="detail-label">{{ $t('ui.referenceNumberColon') }}</span>
                  <span class="detail-value">{{ selectedFarmer.reference_number }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Date of Birth:</span>
                  <span class="detail-value">{{ formatDate(selectedFarmer.date_of_birth) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">{{ $t('ui.barangayColonLabel') }}</span>
                  <span class="detail-value">{{ selectedFarmer.barangay_name || 'Not assigned' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Address:</span>
                  <span class="detail-value">{{ formatMemberAddress(selectedFarmer) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Phone Number:</span>
                  <span class="detail-value">{{ selectedFarmer.phone_number }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Educational Status:</span>
                  <span class="detail-value">{{ selectedFarmer.educational_status || 'Not specified' }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Registered On:</span>
                  <span class="detail-value">{{ formatDate(selectedFarmer.registered_on) }}</span>
                </div>
                <div class="detail-item">
                  <span class="detail-label">Status:</span>
                  <span class="detail-value">
                    <span v-if="selectedFarmer.status === 'approved'" class="status-chip status-chip-approved">
                      {{ $t('common.approved') }}
                    </span>
                    <span v-else-if="selectedFarmer.status === 'rejected'" class="status-chip status-chip-rejected">
                      {{ $t('common.rejected') }}
                    </span>
                    <span v-else class="status-chip status-chip-pending">
                      {{ $t('common.pending') }}
                    </span>
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Member Modal -->
    <Teleport to="body">
      <Transition name="member-info">
        <div
          v-if="showEditMemberModal && editingFarmer"
          class="modal-overlay edit-member-overlay"
          :class="{ 'light-theme': isLight }"
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-member-title"
          @click.self="cancelEdit"
        >
          <div class="modal-content modal-edit-member" @click.stop>
            <div class="modal-header">
              <h3 id="edit-member-title" class="modal-title">Edit Member</h3>
              <button type="button" @click="cancelEdit" class="text-gray-400 hover:text-gray-600 text-3xl" :aria-label="$t('common.close')">&times;</button>
            </div>
            <div class="modal-body">
              <div class="edit-photo-row">
                <div class="edit-photo-thumb">
                  <img
                    v-if="editingFarmer.profile_picture"
                    :src="getProfilePictureUrl(editingFarmer.profile_picture)"
                    alt="Member"
                  />
                  <div v-else class="edit-photo-fallback">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" class="w-7 h-7">
                      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
                <div class="edit-photo-meta">
                  <p class="edit-photo-name">{{ editingFarmer.full_name }}</p>
                  <p class="edit-photo-sub">{{ editingFarmer.reference_number || '—' }}</p>
                  <button type="button" class="edit-photo-btn" @click="openEditPictureModal(editingFarmer)">
                    {{ $t('common.changePhoto') }}
                  </button>
                </div>
              </div>

              <div class="edit-grid">
                <div class="edit-field edit-field-full">
                  <label class="edit-label">{{ $t('ui.referenceNumberReq') }}</label>
                  <input
                    v-model="editForm.reference_number"
                    @input="handleReferenceInput"
                    type="text"
                    class="edit-input edit-input-modal"
                    placeholder="00-00-00-000-000000"
                    maxlength="19"
                    inputmode="numeric"
                    autocomplete="off"
                  />
                </div>

                <div class="edit-field">
                  <label class="edit-label">Full Name *</label>
                  <input
                    v-model="editForm.full_name"
                    type="text"
                    class="edit-input edit-input-modal"
                    :placeholder="$t('ui.memberFullName')"
                  />
                </div>

                <div class="edit-field">
                  <label class="edit-label">Date of Birth *</label>
                  <div class="edit-date-field">
                    <input
                      v-model="editForm.date_of_birth"
                      type="date"
                      class="edit-input edit-input-modal edit-input-date"
                    />
                    <span class="edit-date-icon-wrap" aria-hidden="true">
                      <svg
                        class="edit-date-icon"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        stroke-width="2.25"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                      >
                        <rect x="3" y="4" width="18" height="18" rx="2" />
                        <line x1="16" y1="2" x2="16" y2="6" />
                        <line x1="8" y1="2" x2="8" y2="6" />
                        <line x1="3" y1="10" x2="21" y2="10" />
                      </svg>
                    </span>
                  </div>
                </div>

                <div class="edit-field">
                  <label class="edit-label">Phone Number *</label>
                  <input
                    v-model="editForm.phone_number"
                    type="tel"
                    class="edit-input edit-input-modal"
                    placeholder="09XXXXXXXXX"
                    maxlength="11"
                    inputmode="numeric"
                    autocomplete="tel"
                    @input="handlePhoneInput"
                  />
                </div>

                <div class="edit-field">
                  <label class="edit-label">Barangay *</label>
                  <select
                    v-model.number="editForm.barangay_id"
                    class="edit-input edit-input-modal"
                    :disabled="!isAdmin && Boolean(userBarangayId)"
                    @change="onBarangayChange"
                  >
                    <option :value="null" disabled>{{ $t('ui.selectBarangayLabel') }}</option>
                    <option v-for="barangay in editableBarangays" :key="barangay.id" :value="barangay.id">
                      {{ barangay.name }}
                    </option>
                  </select>
                </div>

                <div class="edit-field edit-field-full">
                  <label class="edit-label">Home Address</label>
                  <input
                    v-model="editForm.address"
                    type="text"
                    class="edit-input edit-input-modal"
                    :placeholder="$t('ui.streetAddress')"
                  />
                </div>

                <div class="edit-field">
                  <label class="edit-label">{{ $t('ui.educationalStatus') }}</label>
                  <select v-model="editForm.educational_status" class="edit-input edit-input-modal">
                    <option value="">{{ $t('ui.select') }}</option>
                    <option value="No Formal Education">{{ $t('ui.noFormalEducation') }}</option>
                    <option value="Elementary Level">{{ $t('ui.elementaryLevel') }}</option>
                    <option value="Elementary Graduate">{{ $t('ui.elementaryGraduate') }}</option>
                    <option value="High School Level">{{ $t('ui.highSchoolLevel') }}</option>
                    <option value="High School Graduate">{{ $t('ui.highSchoolGraduate') }}</option>
                    <option value="Vocational">{{ $t('ui.vocational') }}</option>
                    <option value="College Level">{{ $t('ui.collegeLevel') }}</option>
                    <option value="College Graduate">{{ $t('ui.collegeGraduate') }}</option>
                    <option value="Post Graduate">{{ $t('ui.postGraduate') }}</option>
                  </select>
                </div>

                <div class="edit-field">
                  <label class="edit-label">Hectares Farmed</label>
                  <TypedNumberInput
                    v-model="editForm.land_area"
                    :min="0.01"
                    :max="LAND_AREA_MAX"
                    :max-integer-digits="LAND_AREA_MAX_INTEGER_DIGITS"
                    input-class="edit-input edit-input-modal"
                    :placeholder="$t('incomeForm.example15')"
                  />
                </div>

                <div class="edit-field">
                  <label class="edit-label">{{ $t('ui.farmLocation') }}</label>
                  <select
                    v-model="editForm.farm_location"
                    class="edit-input edit-input-modal"
                    :disabled="loadingFarmLocations || !editForm.barangay_id"
                  >
                    <option value="">{{ editForm.barangay_id ? 'Select Farm Location' : 'Select barangay first' }}</option>
                    <option v-for="loc in farmLocationOptions" :key="loc.id" :value="loc.name">
                      {{ loc.name }}
                    </option>
                  </select>
                  <small v-if="loadingFarmLocations" class="edit-hint">{{ $t('ui.loadingPlaces') }}</small>
                </div>

                <div
                  v-if="editingFarmer.role !== 'admin' && (editingFarmer.membership_status || 'member') !== 'non-member'"
                  class="edit-field"
                >
                  <label class="edit-label">Role *</label>
                  <select v-model="editForm.role" class="edit-input edit-input-modal">
                    <option value="farmer">{{ $t('ui.farmer') }}</option>
                    <option value="admin">{{ $t('ui.admin') }}</option>
                    <option value="president">{{ $t('ui.president') }}</option>
                    <option value="treasurer">{{ $t('ui.treasurer') }}</option>
                    <option value="auditor">{{ $t('ui.auditor') }}</option>
                    <option value="operator">{{ $t('ui.operator') }}</option>
                    <option value="operation_manager">{{ $t('ui.operationManager') }}</option>
                    <option value="business_manager">{{ $t('ui.businessManager') }}</option>
                    <option value="agriculturist">{{ $t('ui.agriculturist') }}</option>
                  </select>
                </div>

                <div class="edit-field">
                  <label class="edit-label">Membership Status *</label>
                  <select v-model="editForm.membership_status" class="edit-input edit-input-modal">
                    <option value="member">{{ $t('ui.member') }}</option>
                    <option value="non-member">{{ $t('ui.nonMember') }}</option>
                  </select>
                </div>
              </div>
            </div>
            <div class="modal-footer">
              <button type="button" @click="cancelEdit" class="btn-secondary">{{ $t('common.cancel') }}</button>
              <button type="button" @click="saveEdit(editingFarmer)" class="btn-primary">{{ $t('common.save') }}</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>

    <!-- Edit Profile Picture Modal -->
    <Teleport to="body">
      <div
        v-if="showEditPictureModal"
        class="modal-overlay edit-picture-overlay"
        :class="{ 'light-theme': isLight }"
        @click.self="closeEditPictureModal"
      >
        <div class="modal-content edit-picture-dialog" @click.stop>
          <div class="modal-header edit-picture-header">
            <h3 class="modal-title">Update Profile Picture</h3>
            <button type="button" @click="closeEditPictureModal" class="edit-picture-close" :aria-label="$t('common.close')">&times;</button>
          </div>
          <div class="modal-body edit-picture-body" v-if="selectedFarmer">
            <div class="edit-picture-preview-wrap">
              <img
                v-if="profilePicturePreview"
                :src="profilePicturePreview"
                alt="Preview"
                class="edit-picture-avatar"
              />
              <img
                v-else-if="selectedFarmer.profile_picture"
                :src="getProfilePictureUrl(selectedFarmer.profile_picture)"
                alt="Current"
                class="edit-picture-avatar"
              />
              <div v-else class="edit-picture-avatar edit-picture-avatar-fallback">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>

            <p class="edit-picture-name">{{ selectedFarmer.full_name }}</p>
            <p class="edit-picture-hint">{{ $t('ui.jpegPngGif') }}</p>

            <label class="edit-picture-choose">
              {{ selectedProfilePicture ? 'Change Photo' : 'Choose Photo' }}
              <input
                type="file"
                ref="profilePictureInput"
                @change="handleProfilePictureSelect"
                accept="image/jpeg,image/png,image/gif"
                class="hidden"
              />
            </label>

            <p v-if="selectedProfilePicture" class="edit-picture-filename">
              {{ selectedProfilePicture.name }}
            </p>
            <p v-if="uploadError" class="edit-picture-error">{{ uploadError }}</p>
          </div>
          <div class="modal-footer edit-picture-footer">
            <button type="button" @click="closeEditPictureModal" class="btn-secondary" :disabled="uploading">{{ $t('common.cancel') }}</button>
            <button
              type="button"
              @click="uploadProfilePicture"
              class="btn-primary"
              :disabled="!selectedProfilePicture || uploading"
            >
              {{ uploading ? 'Uploading…' : 'Save Photo' }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, defineProps, defineEmits } from 'vue'
import { formatMemberRole } from '../utils/roleLabels.js'
import { useFarmerStore } from '../stores/farmerStore'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import TypedNumberInput from './TypedNumberInput.vue'
import { LAND_AREA_MAX, LAND_AREA_MAX_INTEGER_DIGITS } from '../utils/numericInput'

const farmerStore = useFarmerStore()
const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

// Emits
const emit = defineEmits(['member-updated', 'member-deleted'])

// Props from parent
const props = defineProps({
  farmers: {
    type: Array,
    default: () => []
  },
  loading: {
    type: Boolean,
    default: false
  },
  error: {
    type: String,
    default: null
  },
  userBarangayId: {
    type: Number,
    default: null
  },
  isPresident: {
    type: Boolean,
    default: false
  }
})

const internalFarmers = ref([])
const barangays = ref([])
const internalLoading = ref(false)
const internalError = ref(null)
const activeRole = ref('farmer')
const editingId = ref(null)
const showEditMemberModal = ref(false)
const editingFarmer = ref(null)
const farmLocationOptions = ref([])
const loadingFarmLocations = ref(false)
const editForm = ref({
  reference_number: '',
  full_name: '',
  date_of_birth: '',
  address: '',
  barangay_name: '',
  phone_number: '',
  educational_status: '',
  land_area: '',
  farm_location: '',
  role: '',
  membership_status: 'member',
  barangay_id: null
})

// Modal states
const showDetailsModal = ref(false)
const showEditPictureModal = ref(false)
const selectedFarmer = ref(null)

// Profile picture upload states
const profilePictureInput = ref(null)
const selectedProfilePicture = ref(null)
const profilePicturePreview = ref(null)
const uploadError = ref('')
const uploading = ref(false)

// Helper function to get correct profile picture URL
// Handles both external Google URLs and local uploaded pictures
const getProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return null
  // Check if it's already a full URL (Google profile pictures start with https://)
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture
  }
  // For local uploads (starts with /uploads/), return as-is
  // The /uploads path is proxied to the backend via Vite in development
  // and served directly by the backend in production
  return profilePicture
}

// Use farmers from props if provided, otherwise use internalFarmers
const displayFarmers = computed(() => {
  if (props.farmers && props.farmers.length > 0) {
    return props.farmers
  }
  return internalFarmers.value
})

// Use loading/error from props if provided
const displayLoading = computed(() => {
  return props.loading !== null ? props.loading : internalLoading.value
})

const displayError = computed(() => {
  return props.error || internalError.value
})

const isAdmin = computed(() => authStore.currentUser?.role === 'admin')

const userBarangayId = computed(() => {
  const id = props.userBarangayId ?? authStore.currentUser?.barangay_id
  return id != null && id !== '' ? Number(id) : null
})

const editableBarangays = computed(() => {
  if (isAdmin.value) return barangays.value
  if (props.userBarangayId) {
    return barangays.value.filter((b) => Number(b.id) === Number(props.userBarangayId))
  }
  return barangays.value
})

const farmersByRole = computed(() => {
  return {
    farmer: displayFarmers.value.filter(f => f.role === 'farmer'),
    admin: displayFarmers.value.filter(f => f.role === 'admin'),
    president: displayFarmers.value.filter(f => f.role === 'president'),
    treasurer: displayFarmers.value.filter(f => f.role === 'treasurer'),
    auditor: displayFarmers.value.filter(f => f.role === 'auditor'),
    operator: displayFarmers.value.filter(f => f.role === 'operator'),
    agriculturist: displayFarmers.value.filter(f => f.role === 'agriculturist'),
    operation_manager: displayFarmers.value.filter(f => f.role === 'operation_manager'),
    business_manager: displayFarmers.value.filter(f => f.role === 'business_manager')
  }
})

const currentRoleFarmers = computed(() => {
  return farmersByRole.value[activeRole.value] || []
})

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const formatMemberAddress = (farmer) => {
  const barangay = farmer.barangay_name || ''
  const home = farmer.address || ''
  if (barangay && home && home !== barangay) return `${home}, ${barangay}`
  return barangay || home || 'N/A'
}

const startEdit = (farmer) => {
  editingId.value = farmer.id
  editingFarmer.value = farmer
  showEditMemberModal.value = true
  const barangayLabel = farmer.barangay_name || ''
  const storedAddress = farmer.address || ''
  const homeAddress =
    storedAddress && storedAddress !== barangayLabel ? storedAddress : ''

  editForm.value = {
    reference_number: farmer.reference_number || '',
    full_name: farmer.full_name,
    date_of_birth: farmer.date_of_birth?.split('T')[0] || '',
    address: homeAddress,
    barangay_name: barangayLabel,
    phone_number: String(farmer.phone_number || '').replace(/\D/g, '').slice(0, 11),
    educational_status: farmer.educational_status || '',
    land_area: farmer.land_area || '',
    farm_location: farmer.farm_location || '',
    role: farmer.role,
    membership_status: farmer.membership_status || 'member',
    barangay_id: farmer.barangay_id ? Number(farmer.barangay_id) : null
  }
  loadFarmLocationOptions(farmer.barangay_id, farmer.farm_location || '')
}

const formatReferenceNumberInput = (value = '') => {
  const digits = String(value).replace(/\D/g, '').slice(0, 15)
  const parts = [2, 2, 2, 3, 6]
  let index = 0
  const out = []
  for (const len of parts) {
    const chunk = digits.slice(index, index + len)
    if (!chunk) break
    out.push(chunk)
    index += len
  }
  return out.join('-')
}

const handleReferenceInput = () => {
  editForm.value.reference_number = formatReferenceNumberInput(editForm.value.reference_number)
}

const handlePhoneInput = () => {
  editForm.value.phone_number = String(editForm.value.phone_number || '')
    .replace(/\D/g, '')
    .slice(0, 11)
}

const onBarangayChange = () => {
  editForm.value.farm_location = ''
  loadFarmLocationOptions(editForm.value.barangay_id, '')
}

const cancelEdit = () => {
  editingId.value = null
  editingFarmer.value = null
  showEditMemberModal.value = false
  farmLocationOptions.value = []
  loadingFarmLocations.value = false
  editForm.value = {
    reference_number: '',
    full_name: '',
    date_of_birth: '',
    address: '',
    barangay_name: '',
    phone_number: '',
    educational_status: '',
    land_area: '',
    farm_location: '',
    role: '',
    membership_status: 'member',
    barangay_id: null
  }
}

const loadFarmLocationOptions = async (barangayId, currentFarmLocation = '') => {
  const id = parseInt(String(barangayId || ''), 10)
  if (!Number.isFinite(id)) {
    farmLocationOptions.value = []
    return
  }

  loadingFarmLocations.value = true
  try {
    const response = await fetch(`/api/barangays/${id}/places`)
    const data = await response.json().catch(() => null)
    let options = data?.success ? (data.places || []) : []

    // Keep legacy saved location selectable even if it's not in active places.
    if (currentFarmLocation && !options.some(p => p.name === currentFarmLocation)) {
      options = [{ id: `legacy-${currentFarmLocation}`, name: currentFarmLocation }, ...options]
    }

    farmLocationOptions.value = options
  } catch (error) {
    console.error('Failed to load farm location options:', error)
    farmLocationOptions.value = currentFarmLocation
      ? [{ id: `legacy-${currentFarmLocation}`, name: currentFarmLocation }]
      : []
  } finally {
    loadingFarmLocations.value = false
  }
}

const saveEdit = async (farmer) => {
  if (!farmer) return
  const referenceRegex = /^\d{2}-\d{2}-\d{2}-\d{3}-\d{6}$/
  if (!referenceRegex.test(String(editForm.value.reference_number || '').trim())) {
    alert('Reference number must follow 00-00-00-000-000000 format.')
    return
  }

  const phoneNumber = String(editForm.value.phone_number || '').replace(/\D/g, '')
  if (phoneNumber.length !== 11) {
    alert(`Phone number must be exactly 11 digits. You entered ${phoneNumber.length} digits.`)
    return
  }
  if (!/^09\d{9}$/.test(phoneNumber)) {
    alert('Phone number must be a valid Philippine mobile number (09XXXXXXXXX).')
    return
  }
  editForm.value.phone_number = phoneNumber

  const landHa = parseFloat(editForm.value.land_area)
  if (editForm.value.land_area !== '' && editForm.value.land_area != null) {
    if (!Number.isFinite(landHa) || landHa <= 0) {
      alert('Farm area (hectares) must be a number greater than 0.')
      return
    }
    if (landHa > LAND_AREA_MAX) {
      alert('Farm area must be at most 3 digits (maximum 999.99 hectares).')
      return
    }
  }

  if (!confirm(`Are you sure you want to update ${farmer.full_name}'s information?`)) {
    return
  }

  try {
    if (!isAdmin.value && userBarangayId.value) {
      editForm.value.barangay_id = userBarangayId.value
    }

    const selectedBarangay = barangays.value.find(
      (b) => Number(b.id) === Number(editForm.value.barangay_id)
    )
    const barangayName = selectedBarangay?.name || editForm.value.barangay_name || ''
    const homeAddress = String(editForm.value.address || '').trim()

    const updateData = {
      reference_number: editForm.value.reference_number,
      full_name: editForm.value.full_name,
      date_of_birth: editForm.value.date_of_birth,
      address: homeAddress || barangayName,
      phone_number: editForm.value.phone_number,
      educational_status: editForm.value.educational_status,
      land_area: editForm.value.land_area,
      farm_location: editForm.value.farm_location
    }

    if (editForm.value.barangay_id != null) {
      updateData.barangay_id = Number(editForm.value.barangay_id)
    }

    const token = authStore.token
    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: token ? `Bearer ${token}` : ''
    }

    const response = await fetch(`/api/farmers/${farmer.id}/profile`, {
      method: 'PUT',
      headers: authHeaders,
      body: JSON.stringify(updateData)
    })

    const profileResp = await response.json().catch(() => null)
    if (!response.ok || profileResp?.success === false) {
      throw new Error(profileResp?.message || 'Failed to update profile')
    }

    // Update role if changed and not admin
    if (editForm.value.role !== farmer.role && farmer.role !== 'admin') {
      const roleResponse = await fetch(`/api/farmers/${farmer.id}/role`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ role: editForm.value.role })
      })
      
      if (!roleResponse.ok) throw new Error('Failed to update role')
    }

    // Update membership status if changed
    if (editForm.value.membership_status !== farmer.membership_status) {
      const statusResponse = await fetch(`/api/farmers/${farmer.id}/membership-status`, {
        method: 'PUT',
        headers: authHeaders,
        body: JSON.stringify({ membership_status: editForm.value.membership_status })
      })
      
      if (!statusResponse.ok) throw new Error('Failed to update membership status')
    }

    // Update local data
    const updatedFarmer = profileResp?.farmer
    const index = internalFarmers.value.findIndex(f => f.id === farmer.id)
    if (index !== -1) {
      internalFarmers.value[index] = {
        ...internalFarmers.value[index],
        ...updateData,
        role: editForm.value.role,
        membership_status: editForm.value.membership_status,
        barangay_id: updatedFarmer?.barangay_id ?? editForm.value.barangay_id,
        barangay_name: updatedFarmer?.barangay_name ?? barangayName,
        address: updatedFarmer?.address ?? updateData.address
      }
    }

    cancelEdit()
    emit('member-updated', farmer.id)
    alert('Member information updated successfully!')
  } catch (err) {
    alert('Error updating member: ' + err.message)
  }
}

const deleteFarmer = async (farmer) => {
  if (!confirm(`Are you sure you want to delete ${farmer.full_name}? This action cannot be undone.`)) {
    return
  }
  
  try {
    const result = await farmerStore.deleteFarmer(farmer.id)
    if (result.success) {
      internalFarmers.value = internalFarmers.value.filter(f => f.id !== farmer.id)
      emit('member-deleted', farmer.id)
      alert('Member deleted successfully!')
    } else {
      alert('Failed to delete member: ' + result.message)
    }
  } catch (err) {
    alert('Error deleting member: ' + err.message)
  }
}

let mainScrollOverflow = ''

const lockPageScroll = (locked) => {
  const main = document.querySelector('.main-content')
  if (locked) {
    document.body.style.overflow = 'hidden'
    if (main) {
      mainScrollOverflow = main.style.overflowY || ''
      main.style.overflowY = 'hidden'
    }
  } else {
    document.body.style.overflow = ''
    if (main) {
      main.style.overflowY = mainScrollOverflow
      mainScrollOverflow = ''
    }
  }
}

const onDetailsEscape = (event) => {
  if (event.key !== 'Escape') return
  if (showEditPictureModal.value) {
    closeEditPictureModal()
    return
  }
  if (showEditMemberModal.value) {
    cancelEdit()
    return
  }
  if (showDetailsModal.value) {
    closeDetailsModal()
  }
}

const viewDetails = (farmer) => {
  selectedFarmer.value = farmer
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedFarmer.value = null
}

const anyMemberModalOpen = computed(
  () => showDetailsModal.value || showEditMemberModal.value || showEditPictureModal.value
)

watch(anyMemberModalOpen, (open) => {
  lockPageScroll(open)
  if (open) {
    document.addEventListener('keydown', onDetailsEscape)
  } else {
    document.removeEventListener('keydown', onDetailsEscape)
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onDetailsEscape)
  lockPageScroll(false)
})

const openEditPictureModal = (farmer) => {
  selectedFarmer.value = farmer
  selectedProfilePicture.value = null
  profilePicturePreview.value = null
  uploadError.value = ''
  showEditPictureModal.value = true
}

const closeEditPictureModal = () => {
  showEditPictureModal.value = false
  selectedFarmer.value = null
  selectedProfilePicture.value = null
  profilePicturePreview.value = null
  uploadError.value = ''
}

const handleProfilePictureSelect = (event) => {
  const file = event.target.files[0]
  if (!file) return

  // Validate file size (10MB max)
  if (file.size > 10 * 1024 * 1024) {
    uploadError.value = 'File size must be less than 10MB'
    selectedProfilePicture.value = null
    profilePicturePreview.value = null
    return
  }

  // Validate file type
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif']
  if (!allowedTypes.includes(file.type)) {
    uploadError.value = 'Only JPEG, PNG, and GIF images are allowed'
    selectedProfilePicture.value = null
    profilePicturePreview.value = null
    return
  }

  uploadError.value = ''
  selectedProfilePicture.value = file
  profilePicturePreview.value = URL.createObjectURL(file)
}

const uploadProfilePicture = async () => {
  if (!selectedProfilePicture.value || !selectedFarmer.value) return

  uploading.value = true
  uploadError.value = ''

  try {
    const formData = new FormData()
    formData.append('profile_picture', selectedProfilePicture.value)

    const response = await fetch(`/api/farmers/${selectedFarmer.value.id}/profile-picture`, {
      method: 'POST',
      body: formData
    })

    const data = await response.json()

    if (!response.ok || !data.success) {
      throw new Error(data.message || 'Failed to upload profile picture')
    }

    // Update local farmer data
    const farmerIndex = internalFarmers.value.findIndex(f => f.id === selectedFarmer.value.id)
    if (farmerIndex !== -1) {
      internalFarmers.value[farmerIndex].profile_picture = data.profile_picture
    }

    // Reflect immediately on the open Edit Member modal (if the same member)
    if (editingFarmer.value && editingFarmer.value.id === selectedFarmer.value.id) {
      editingFarmer.value = { ...editingFarmer.value, profile_picture: data.profile_picture }
    }

    // Ask parent to refresh so prop-driven lists also update
    emit('member-updated', selectedFarmer.value.id)

    alert('Profile picture updated successfully!')
    closeEditPictureModal()
  } catch (error) {
    uploadError.value = error.message || 'Failed to upload profile picture'
  } finally {
    uploading.value = false
  }
}

onMounted(async () => {
  // Only load farmers if they weren't provided as props
  if (!props.farmers || props.farmers.length === 0) {
    internalLoading.value = true
    internalError.value = null
    try {
      // Fetch farmers
      const data = await farmerStore.getAllFarmers()
      // Only show approved farmers, exclude rejected
      internalFarmers.value = data.filter(f => f.status === 'approved')
      
      // Fetch barangays
      const response = await fetch('/api/barangays')
      if (response.ok) {
        const barangayData = await response.json()
        barangays.value = barangayData.barangays || barangayData.data || (Array.isArray(barangayData) ? barangayData : [])
      }
    } catch (err) {
      internalError.value = err.message || 'Failed to load members'
    } finally {
      internalLoading.value = false
    }
  } else {
    // Farmers were provided as props, just load barangays
    try {
      const response = await fetch('/api/barangays')
      if (response.ok) {
        const barangayData = await response.json()
        barangays.value = barangayData.barangays || barangayData.data || (Array.isArray(barangayData) ? barangayData : [])
      }
    } catch (err) {
      // Barangay loading is not critical
      console.error('Error loading barangays:', err)
    }
  }
})
</script>

<style scoped>
@import '../styles/members-table.css';

.registered-members-card {
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  padding: 1rem;
}

.registered-members-title {
  font-size: var(--members-font-title, 1.25rem);
  font-weight: 800;
  color: #eefde6;
  margin: 0 0 0.85rem;
  letter-spacing: 0.02em;
}

.registered-members-muted {
  color: rgba(229, 235, 231, 0.85);
  font-size: var(--members-font-body, 0.875rem);
}

.registered-members-error {
  color: #fca5a5;
}

.modal-avatar-fallback {
  background: #e5e7eb;
}

.members-table .edit-input {
  padding: 3px 5px !important;
  font-size: 0.62rem !important;
}

.role-tabs {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  background: linear-gradient(145deg, rgba(14,25,19,0.97), rgba(10,19,15,0.96));
  padding: 4px;
  border-radius: 8px;
  border: 1px solid rgba(122,171,140,0.20);
  margin-bottom: 6px;
}

.role-tab {
  min-width: 0;
  padding: 4px 6px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(122,171,140,0.15);
  border-radius: 6px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
  color: rgba(220,252,231,0.78);
  display: flex;
  flex-direction: column;
  align-items: stretch;
  line-height: 1.2;
  text-align: left;
}

.role-tab-icon {
  display: none !important;
}

.role-tab-content,
.role-tab .stat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
  min-width: 0;
}

.role-tab-label {
  font-size: 8px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: rgba(220,252,231,0.72);
  line-height: 1.15;
  word-break: break-word;
}

.role-tab-count {
  font-size: 0.95rem;
  font-weight: 800;
  color: rgba(134,239,172,0.88);
  line-height: 1.05;
  margin-top: 1px;
}

.role-tab:hover {
  background: rgba(74,222,128,0.10);
  border-color: rgba(134,239,172,0.35);
  color: #ecfdf5;
  transform: none;
  box-shadow: none;
}

.role-tab:hover .role-tab-label {
  color: #ecfdf5;
}

.role-tab.active {
  background: linear-gradient(135deg, rgba(22,163,74,0.55) 0%, rgba(16,120,54,0.65) 100%);
  border-color: rgba(74,222,128,0.45);
  color: white;
  box-shadow: none;
  transform: none;
}

.role-tab.active .role-tab-label {
  color: #ecfdf5;
}

.role-tab.active .role-tab-count {
  color: #ffffff;
}

.edit-input {
  width: 100%;
  padding: 6px 8px;
  border: 1px solid rgba(190, 235, 203, 0.24);
  border-radius: 6px;
  font-size: 11px;
  transition: all 0.2s;
  background: rgba(0, 0, 0, 0.24);
  color: #eefde6;
}

.edit-input:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
}

.members-table .edit-input {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
}

@media (max-width: 1024px) {
  /* Compact 3×3 — small row gap matching column gap; count on right */
  .role-tabs {
    display: grid !important;
    grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
    column-gap: 3px !important;
    row-gap: 3px !important;
    gap: 3px !important;
    padding: 3px !important;
    margin-bottom: 0.35rem !important;
    overflow: visible !important;
  }

  .role-tab {
    width: 100% !important;
    min-width: 0 !important;
    min-height: 0 !important;
    height: auto !important;
    margin: 0 !important;
    flex: none !important;
    display: grid !important;
    grid-template-columns: 1fr auto !important;
    grid-template-rows: auto auto !important;
    column-gap: 2px !important;
    row-gap: 0 !important;
    padding: 3px 4px !important;
    border-radius: 5px !important;
    overflow: hidden !important;
    box-shadow: none !important;
    line-height: 1 !important;
    align-items: center !important;
    justify-items: center !important;
  }

  .role-tab:hover,
  .role-tab.active {
    transform: none !important;
    box-shadow: none !important;
  }

  .role-tab-icon {
    grid-column: 1 !important;
    grid-row: 1 !important;
    width: 10px !important;
    height: 10px !important;
    margin: 0 !important;
  }

  .role-tab-label {
    grid-column: 1 !important;
    grid-row: 2 !important;
    font-size: 0.5rem !important;
    line-height: 1.05 !important;
    letter-spacing: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    max-width: 100%;
    white-space: normal !important;
    overflow: visible;
    word-break: break-word;
    text-align: center !important;
  }

  .role-tab-count {
    grid-column: 2 !important;
    grid-row: 1 / -1 !important;
    align-self: center !important;
    justify-self: end !important;
    font-size: 0.48rem !important;
    line-height: 1 !important;
    margin: 0 !important;
    padding: 0 !important;
    white-space: nowrap !important;
  }

  .registered-members-card {
    padding: 0.65rem;
    margin-bottom: 0.65rem;
  }

  .registered-members-title {
    font-size: 1rem;
    margin-bottom: 0.45rem;
  }
}

/* ============================================
   Member Information modal (teleported to body)
   ============================================ */
.member-info-overlay {
  position: fixed;
  inset: 0;
  z-index: 10050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  background: rgba(6, 12, 9, 0.62);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  box-sizing: border-box;
}

.member-info-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  max-height: min(90vh, 860px);
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: linear-gradient(145deg, rgba(5, 46, 22, 0.96), rgba(20, 83, 45, 0.94));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), inset 1px 1px 0 rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.member-info-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  flex-shrink: 0;
  padding: 1.15rem 1.35rem;
  border-bottom: 1px solid rgba(74, 222, 128, 0.3);
}

.member-info-title {
  margin: 0;
  font-size: 1.25rem;
  font-weight: 700;
  color: #ffffff;
  letter-spacing: 0.3px;
}

.member-info-close {
  flex-shrink: 0;
  width: 36px;
  height: 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.9);
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}

.member-info-close:hover {
  background: rgba(255, 255, 255, 0.22);
  color: #ffffff;
  border-color: rgba(255, 255, 255, 0.45);
}

.member-info-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overflow-x: hidden;
  padding: 1.35rem;
  -webkit-overflow-scrolling: touch;
}

.member-info-profile {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 1.35rem;
}

.member-info-avatar {
  width: 100px;
  height: 100px;
  min-width: 100px;
  min-height: 100px;
  border-radius: 999px;
  object-fit: cover;
  border: 4px solid #22c55e;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.28);
}

.member-info-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  border-color: rgba(156, 163, 175, 0.65);
  background: rgba(255, 255, 255, 0.08);
  color: rgba(187, 247, 208, 0.75);
}

.member-info-footer {
  display: flex;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: 12px;
  padding: 1rem 1.35rem 1.25rem;
  border-top: 1px solid rgba(74, 222, 128, 0.3);
}

.member-info-enter-active,
.member-info-leave-active {
  transition: opacity 0.22s ease;
}

.member-info-enter-active .member-info-dialog,
.member-info-leave-active .member-info-dialog {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;
}

.member-info-enter-from,
.member-info-leave-to {
  opacity: 0;
}

.member-info-enter-from .member-info-dialog,
.member-info-leave-to .member-info-dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

.member-info-overlay.light-theme {
  background: rgba(15, 23, 42, 0.48);
}

.member-info-overlay.light-theme .member-info-dialog {
  background: linear-gradient(165deg, #ffffff 0%, #f7fdf9 42%, #ecfdf5 100%);
  border-color: #166534;
  color: #000000;
  box-shadow: 0 24px 56px rgba(22, 101, 52, 0.22);
}

.member-info-overlay.light-theme .member-info-header {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 48%, #bbf7d0 100%);
  border-bottom-color: #166534;
}

.member-info-overlay.light-theme .member-info-title,
.member-info-overlay.light-theme .member-name,
.member-info-overlay.light-theme .detail-label,
.member-info-overlay.light-theme .detail-value {
  color: #000000;
  -webkit-text-fill-color: #000000;
}

.member-info-overlay.light-theme .member-info-close {
  background: #ffffff;
  border-color: #166534;
  color: #166534;
}

.member-info-overlay.light-theme .member-info-close:hover {
  background: #fef2f2;
  border-color: #fca5a5;
  color: #b91c1c;
}

.member-info-overlay.light-theme .member-info-footer {
  border-top-color: rgba(22, 101, 52, 0.28);
}

.member-info-overlay.light-theme .detail-item {
  background: #ffffff;
  border-color: rgba(22, 101, 52, 0.35);
}

.member-info-overlay.light-theme .member-info-avatar-fallback {
  background: #f3f4f6;
  color: #9ca3af;
  border-color: #d1d5db;
}

.member-info-overlay.light-theme .btn-secondary {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%);
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  border-color: #15803d;
}

@media (max-width: 768px) {
  .member-info-overlay {
    padding: 0.65rem;
  }

  .member-info-dialog {
    width: 94%;
    max-width: none;
    max-height: min(92vh, 920px);
    border-radius: 14px;
  }

  .member-info-header {
    padding: 0.95rem 1rem;
  }

  .member-info-title {
    font-size: 1.05rem;
  }

  .member-info-body {
    padding: 1rem;
  }

  .member-info-footer {
    padding: 0.85rem 1rem 1rem;
  }

  .member-info-avatar {
    width: 84px;
    height: 84px;
    min-width: 84px;
    min-height: 84px;
  }

  .member-info-overlay .details-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }
}

/* Modal Styles (edit / profile picture) */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 20px;
}

.modal-content {
  background: linear-gradient(145deg, rgba(5, 46, 22, 0.82), rgba(20, 83, 45, 0.78));
  border: 1px solid rgba(74, 222, 128, 0.35);
  border-radius: 16px;
  max-width: 600px;
  width: 100%;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.5), inset 1px 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px) saturate(140%);
  -webkit-backdrop-filter: blur(18px) saturate(140%);
  color: #ffffff;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24px;
  border-bottom: 1px solid rgba(74, 222, 128, 0.3);
}

.modal-title {
  font-size: 22px;
  font-weight: 700;
  color: #ffffff !important;
  letter-spacing: 0.4px;
}

.modal-header button {
  color: rgba(255, 255, 255, 0.7) !important;
  font-size: 28px;
  line-height: 1;
  background: none;
  border: none;
  cursor: pointer;
  transition: color 0.2s;
}

.modal-header button:hover {
  color: #ffffff !important;
}

.member-name {
  font-size: 20px;
  font-weight: 700;
  color: #ffffff;
  margin-top: 12px;
  letter-spacing: 0.2px;
}

.modal-body {
  padding: 24px;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 24px;
  border-top: 1px solid rgba(74, 222, 128, 0.3);
}

.details-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px 24px;
}

.detail-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 0.7rem 0.85rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(74, 222, 128, 0.18);
}

.detail-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(187, 247, 208, 0.9);
  text-transform: uppercase;
  letter-spacing: 0.8px;
  margin-bottom: 2px;
}

.detail-value {
  font-size: 14px;
  color: #ffffff;
  font-weight: 500;
  line-height: 1.5;
}

.btn-primary {
  padding: 10px 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.12);
  color: #ffffff;
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.22);
}

/* ============================================
   Edit Member Modal — compact teleported dialog
   ============================================ */
.modal-content.modal-edit-member {
  max-width: 680px;
  max-height: min(90vh, 820px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  font-family: var(--glass-font, 'Plus Jakarta Sans', 'Segoe UI', sans-serif);
}

.modal-content.modal-edit-member :is(.modal-title, .edit-label, .edit-input, .edit-hint, .btn-primary, .btn-secondary, button, input, select, label, p, span) {
  font-family: inherit;
}

.modal-content.modal-edit-member .modal-header,
.modal-content.modal-edit-member .modal-footer {
  flex-shrink: 0;
  padding: 0.85rem 1rem;
}

.modal-content.modal-edit-member .modal-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  padding: 0.75rem 1rem 0.5rem;
}

.edit-photo-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  margin-bottom: 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(190, 235, 203, 0.18);
  border-radius: 10px;
}

.edit-photo-thumb img,
.edit-photo-thumb .edit-photo-fallback {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid rgba(74, 222, 128, 0.55);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.32);
}

.edit-photo-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, rgba(30, 50, 38, 0.9), rgba(20, 36, 28, 0.95));
  color: rgba(200, 220, 210, 0.85);
}

.edit-photo-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.edit-photo-name {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: #ffffff;
}

.edit-photo-sub {
  margin: 0;
  font-size: 11px;
  font-weight: 600;
  color: rgba(187, 247, 208, 0.7);
  font-variant-numeric: tabular-nums;
}

.edit-photo-btn {
  align-self: flex-start;
  margin-top: 4px;
  padding: 5px 12px;
  border-radius: 7px;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.2px;
  background: linear-gradient(135deg, rgba(34, 197, 94, 0.55) 0%, rgba(22, 163, 74, 0.55) 100%);
  border: 1px solid rgba(74, 222, 128, 0.4);
  color: #ffffff;
  cursor: pointer;
  transition: all 0.18s ease;
}

.edit-photo-btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.32);
}

.edit-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px 14px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 3px;
  margin: 0;
}

.edit-field-full {
  grid-column: 1 / -1;
}

.edit-label {
  display: block;
  margin: 0;
  padding: 0;
  font-size: 10px;
  font-weight: 700;
  color: rgba(187, 247, 208, 0.92);
  text-transform: uppercase;
  letter-spacing: 0.6px;
  line-height: 1.2;
}

.edit-input-modal {
  width: 100%;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  margin: 0;
  padding: 0 10px;
  font-size: 13px;
  line-height: 40px;
  border-radius: 8px;
  border: 1px solid rgba(190, 235, 203, 0.32);
  background: rgba(0, 0, 0, 0.32);
  color: #f8fafc;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
  box-sizing: border-box;
}

.edit-input-modal::placeholder {
  color: rgba(220, 252, 231, 0.4);
}

.edit-input-modal:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.6);
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.18);
  background: rgba(0, 0, 0, 0.42);
}

.edit-input-modal:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.edit-input-modal option {
  background: #0f1d15;
  color: #f8fafc;
}

.edit-date-field {
  position: relative;
  width: 100%;
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: 40px;
  align-items: stretch;
  margin: 0;
}

.edit-input-date {
  grid-area: 1 / 1;
  position: relative;
  width: 100%;
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  margin: 0 !important;
  padding: 0 44px 0 10px !important;
  color-scheme: light;
  line-height: 40px;
  -webkit-appearance: none;
  appearance: none;
  box-sizing: border-box;
}

.edit-input-date::-webkit-calendar-picker-indicator {
  position: absolute;
  inset: 0 0 0 auto;
  width: 44px;
  height: 100%;
  margin: 0;
  padding: 0;
  opacity: 0;
  cursor: pointer;
  z-index: 3;
}

.edit-date-icon-wrap {
  grid-area: 1 / 1;
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  padding-right: 8px;
  pointer-events: none;
  box-sizing: border-box;
}

.edit-date-icon {
  width: 16px;
  height: 16px;
  padding: 4px;
  box-sizing: content-box;
  color: #052e16;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%);
  border: 1px solid #16a34a;
  border-radius: 6px;
  pointer-events: none;
  display: block;
  flex-shrink: 0;
}

.edit-hint {
  font-size: 11px;
  color: rgba(220, 252, 231, 0.62);
  letter-spacing: 0.2px;
}

@media (max-width: 768px) {
  .modal-content.modal-edit-member {
    width: 94%;
    max-width: none;
    max-height: min(92vh, 900px);
  }

  .modal-content.modal-edit-member .modal-header,
  .modal-content.modal-edit-member .modal-footer {
    padding: 0.65rem 0.8rem;
  }

  .modal-content.modal-edit-member .modal-body {
    padding: 0.55rem 0.8rem 0.35rem;
  }

  .edit-photo-row {
    gap: 10px;
    padding: 8px 10px;
    margin-bottom: 8px;
  }

  .edit-grid {
    grid-template-columns: 1fr;
    gap: 12px;
  }

  .edit-field {
    gap: 3px;
  }

  .edit-input-modal {
    padding: 0 10px;
    font-size: 13px;
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    margin: 0 !important;
  }

  .edit-date-field {
    grid-template-rows: 40px;
  }

  .edit-input-date {
    height: 40px;
    min-height: 40px;
    max-height: 40px;
    line-height: 40px;
    padding: 0 44px 0 10px !important;
  }
}

@media (max-width: 640px) {
  .edit-grid {
    grid-template-columns: 1fr;
  }
}

/* Light mode — parent page sets .light-theme on .farmer-table-page */
:global(.farmer-table-page.light-theme) .registered-members-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

:global(.farmer-table-page.light-theme) .registered-members-title {
  color: #052e16 !important;
  background: none !important;
  -webkit-text-fill-color: #052e16 !important;
}

:global(.farmer-table-page.light-theme) .registered-members-muted {
  color: #166534 !important;
}

:global(.farmer-table-page.light-theme) .role-tabs {
  background: #f4faf6 !important;
  border-color: #86efac !important;
}

:global(.farmer-table-page.light-theme) .role-tab {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  color: #000000 !important;
}

:global(.farmer-table-page.light-theme) .role-tab-label {
  color: #000000 !important;
}

:global(.farmer-table-page.light-theme) .role-tab-count {
  color: #15803d !important;
}

:global(.farmer-table-page.light-theme) .role-tab-icon {
  color: #166534 !important;
}

:global(.farmer-table-page.light-theme) .role-tab.active {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%) !important;
  border-color: #15803d !important;
}

:global(.farmer-table-page.light-theme) .role-tab.active :is(.role-tab-label, .role-tab-count, .role-tab-icon) {
  color: #ffffff !important;
}

:global(.farmer-table-page.light-theme) .edit-input {
  background: #ffffff !important;
  color: #000000 !important;
  border-color: #cbd5e1 !important;
}

:global(.farmer-table-page.light-theme) .edit-input-modal[type="date"],
:global(.farmer-table-page.light-theme) .edit-input-date {
  color-scheme: light;
}

:global(.farmer-table-page.light-theme) .edit-date-icon {
  color: #052e16 !important;
  background: #f0fdf4 !important;
  border-color: #86efac !important;
}

/* Member Details modal — colors only; layout matches dark */
:global(.farmer-table-page.light-theme) .modal-overlay {
  background: rgba(236, 253, 245, 0.55) !important;
}

:global(.farmer-table-page.light-theme) .modal-content {
  background: linear-gradient(165deg, #ffffff 0%, #f7fdf9 42%, #ecfdf5 100%) !important;
  border-color: #166534 !important;
  color: #000000 !important;
}

:global(.farmer-table-page.light-theme) .modal-header {
  background: linear-gradient(135deg, #ecfdf5 0%, #d1fae5 48%, #bbf7d0 100%) !important;
  border-bottom-color: #166534 !important;
}

:global(.farmer-table-page.light-theme) .modal-title,
:global(.farmer-table-page.light-theme) .member-name,
:global(.farmer-table-page.light-theme) .detail-label,
:global(.farmer-table-page.light-theme) .detail-value {
  color: #000000 !important;
  -webkit-text-fill-color: #000000 !important;
}

:global(.farmer-table-page.light-theme) .detail-item {
  background: #ffffff !important;
  border-color: rgba(22, 101, 52, 0.35) !important;
}

:global(.farmer-table-page.light-theme) .btn-secondary {
  background: linear-gradient(135deg, #4ade80 0%, #22c55e 55%, #16a34a 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #15803d !important;
}
</style>

<!-- Unscoped: teleported Member Information modal (must sit above fixed header) -->
<style>
.member-info-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10050 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: max(1rem, env(safe-area-inset-top)) max(1rem, env(safe-area-inset-right)) max(1rem, env(safe-area-inset-bottom)) max(1rem, env(safe-area-inset-left));
  background: rgba(6, 12, 9, 0.62);
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  box-sizing: border-box;
}

.member-info-overlay .member-info-dialog {
  display: flex;
  flex-direction: column;
  width: 100%;
  max-width: 720px;
  max-height: min(90vh, 860px);
  overflow: hidden;
  border-radius: 16px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: linear-gradient(145deg, rgba(5, 46, 22, 0.96), rgba(20, 83, 45, 0.94));
  box-shadow: 0 24px 64px rgba(0, 0, 0, 0.55), inset 1px 1px 0 rgba(255, 255, 255, 0.1);
  color: #ffffff;
}

.member-info-enter-active,
.member-info-leave-active {
  transition: opacity 0.22s ease;
}

.member-info-enter-active .member-info-dialog,
.member-info-leave-active .member-info-dialog {
  transition: transform 0.24s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.22s ease;
}

.member-info-enter-from,
.member-info-leave-to {
  opacity: 0;
}

.member-info-enter-from .member-info-dialog,
.member-info-leave-to .member-info-dialog {
  opacity: 0;
  transform: translateY(12px) scale(0.96);
}

@media (max-width: 768px) {
  .member-info-overlay {
    padding: 0.65rem !important;
  }

  .member-info-overlay .member-info-dialog {
    width: 94%;
    max-width: none;
    max-height: min(92vh, 920px);
  }
}

/* Teleported Edit Member modal — above header */
.edit-member-overlay.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10050 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: max(0.75rem, env(safe-area-inset-top)) 0.75rem max(0.75rem, env(safe-area-inset-bottom));
  background: rgba(6, 12, 9, 0.62) !important;
  backdrop-filter: blur(10px) saturate(120%);
  -webkit-backdrop-filter: blur(10px) saturate(120%);
  box-sizing: border-box;
}

.edit-member-overlay .modal-content.modal-edit-member {
  width: 100%;
  max-width: 680px;
  max-height: min(90vh, 820px);
}

.edit-member-overlay.light-theme {
  background: rgba(15, 23, 42, 0.48) !important;
}

/*
 * Beat global style.css mobile rules that add:
 *   label { margin-bottom: clamp(0.75rem…) }
 *   input[type=text|date], select { margin-bottom: clamp(1rem…) }
 * (tel is excluded there → inconsistent gaps)
 */
.edit-member-overlay label,
.edit-member-overlay .edit-label {
  display: block !important;
  margin: 0 !important;
  padding: 0 !important;
  gap: 0 !important;
  font-size: 10px !important;
  line-height: 1.2 !important;
  letter-spacing: 0.6px !important;
  align-items: unset !important;
  cursor: default !important;
}

.edit-member-overlay input,
.edit-member-overlay select,
.edit-member-overlay textarea,
.edit-member-overlay .edit-input-modal,
.edit-member-overlay .edit-input-modal.edit-input {
  margin: 0 !important;
  margin-bottom: 0 !important;
  border-radius: 8px !important;
  padding: 0 10px !important;
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  font-size: 13px !important;
  line-height: 40px !important;
  box-sizing: border-box !important;
}

.edit-member-overlay .edit-date-field {
  display: grid !important;
  grid-template-columns: 1fr !important;
  grid-template-rows: 40px !important;
  align-items: stretch !important;
  margin: 0 !important;
  padding: 0 !important;
  min-height: 40px !important;
  height: 40px !important;
}

.edit-member-overlay .edit-input-date,
.edit-member-overlay .edit-input-modal.edit-input-date {
  grid-area: 1 / 1 !important;
  height: 40px !important;
  min-height: 40px !important;
  max-height: 40px !important;
  padding: 0 44px 0 10px !important;
  line-height: 40px !important;
  margin: 0 !important;
  -webkit-appearance: none !important;
  appearance: none !important;
}

.edit-member-overlay .edit-input-date::-webkit-calendar-picker-indicator {
  position: absolute !important;
  inset: 0 0 0 auto !important;
  width: 44px !important;
  height: 100% !important;
  margin: 0 !important;
  padding: 0 !important;
  opacity: 0 !important;
  cursor: pointer !important;
  z-index: 3 !important;
}

.edit-member-overlay .edit-date-icon-wrap {
  grid-area: 1 / 1 !important;
  position: relative !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  left: auto !important;
  width: auto !important;
  height: auto !important;
  display: flex !important;
  align-items: center !important;
  justify-content: flex-end !important;
  padding: 0 8px 0 0 !important;
  margin: 0 !important;
  pointer-events: none !important;
  z-index: 2 !important;
  box-sizing: border-box !important;
}

.edit-member-overlay .edit-date-icon {
  position: static !important;
  top: auto !important;
  right: auto !important;
  bottom: auto !important;
  transform: none !important;
  margin: 0 !important;
  width: 16px !important;
  height: 16px !important;
  padding: 4px !important;
  box-sizing: content-box !important;
  display: block !important;
  flex-shrink: 0 !important;
}

.edit-member-overlay .edit-grid {
  gap: 12px 14px !important;
  row-gap: 12px !important;
  column-gap: 14px !important;
}

.edit-member-overlay .edit-field {
  gap: 3px !important;
  margin: 0 !important;
  padding: 0 !important;
}

.edit-member-overlay .modal-body {
  padding: 0.75rem 1rem 0.5rem !important;
}

@media (max-width: 768px) {
  .edit-member-overlay.modal-overlay {
    padding: 0.55rem !important;
  }

  .edit-member-overlay .modal-content.modal-edit-member {
    width: 94%;
    max-width: none;
  }

  .edit-member-overlay .modal-header,
  .edit-member-overlay .modal-footer {
    padding: 0.65rem 0.8rem !important;
  }

  .edit-member-overlay .modal-body {
    padding: 0.5rem 0.8rem 0.3rem !important;
  }

  .edit-member-overlay .edit-photo-row {
    gap: 10px !important;
    padding: 8px 10px !important;
    margin-bottom: 8px !important;
  }

  .edit-member-overlay .edit-grid {
    grid-template-columns: 1fr !important;
    gap: 12px !important;
    row-gap: 12px !important;
  }

  .edit-member-overlay .edit-field {
    gap: 3px !important;
  }

  .edit-member-overlay label,
  .edit-member-overlay .edit-label {
    margin: 0 !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
  }

  .edit-member-overlay input,
  .edit-member-overlay select,
  .edit-member-overlay textarea,
  .edit-member-overlay .edit-input-modal,
  .edit-member-overlay .edit-input-modal.edit-input,
  .edit-member-overlay input[type='text'],
  .edit-member-overlay input[type='tel'],
  .edit-member-overlay input[type='date'],
  .edit-member-overlay input[type='number'] {
    margin: 0 !important;
    margin-bottom: 0 !important;
    height: 40px !important;
    min-height: 40px !important;
    max-height: 40px !important;
    padding: 0 10px !important;
    border-radius: 8px !important;
  }

  .edit-member-overlay .edit-input-date,
  .edit-member-overlay .edit-input-modal.edit-input-date,
  .edit-member-overlay input[type='date'] {
    padding: 0 44px 0 10px !important;
  }

  .edit-member-overlay .edit-date-field {
    grid-template-rows: 40px !important;
    height: 40px !important;
    min-height: 40px !important;
    margin: 0 !important;
  }
}

.edit-picture-overlay.modal-overlay {
  position: fixed !important;
  inset: 0 !important;
  z-index: 10060 !important;
  display: flex !important;
  align-items: center !important;
  justify-content: center !important;
  padding: 0.75rem !important;
  background: rgba(6, 12, 9, 0.7) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  box-sizing: border-box;
}

.edit-picture-dialog {
  width: 100%;
  max-width: 420px;
  overflow: hidden;
  font-family: var(--glass-font, 'Plus Jakarta Sans', 'Segoe UI', sans-serif);
}

.edit-picture-header {
  padding: 0.9rem 1rem !important;
}

.edit-picture-header .modal-title {
  font-size: 1.1rem !important;
}

.edit-picture-close {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.1);
  color: #fff;
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.edit-picture-body {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  padding: 1.15rem 1.25rem 0.85rem !important;
  gap: 0.45rem;
}

.edit-picture-preview-wrap {
  margin-bottom: 0.35rem;
}

.edit-picture-avatar {
  width: 128px;
  height: 128px;
  border-radius: 999px;
  object-fit: cover;
  border: 3px solid #22c55e;
  box-shadow: 0 8px 22px rgba(0, 0, 0, 0.28);
  display: block;
}

.edit-picture-avatar-fallback {
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(156, 163, 175, 0.55);
  color: rgba(187, 247, 208, 0.75);
}

.edit-picture-avatar-fallback svg {
  width: 52px;
  height: 52px;
}

.edit-picture-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 700;
  color: #f0fdf4;
}

.edit-picture-hint {
  margin: 0 0 0.35rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: rgba(187, 247, 208, 0.72);
}

.edit-picture-choose {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 9.5rem;
  padding: 0.55rem 1.1rem;
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.4);
  background: linear-gradient(135deg, #22c55e, #16a34a);
  color: #ffffff;
  font-size: 0.85rem;
  font-weight: 700;
  cursor: pointer;
}

.edit-picture-choose:hover {
  filter: brightness(1.05);
}

.edit-picture-filename {
  margin: 0.15rem 0 0;
  max-width: 100%;
  font-size: 0.75rem;
  font-weight: 600;
  color: rgba(220, 252, 231, 0.8);
  word-break: break-all;
}

.edit-picture-error {
  margin: 0.25rem 0 0;
  font-size: 0.8rem;
  font-weight: 700;
  color: #fca5a5;
}

.edit-picture-footer {
  padding: 0.85rem 1rem !important;
  gap: 0.55rem;
}

.edit-picture-overlay.light-theme .edit-picture-dialog {
  background: linear-gradient(165deg, #ffffff 0%, #f7fdf9 42%, #ecfdf5 100%);
  border-color: #166534;
  color: #052e16;
}

.edit-picture-overlay.light-theme .edit-picture-header {
  background: linear-gradient(135deg, #ecfdf5, #d1fae5);
  border-bottom-color: #86efac;
}

.edit-picture-overlay.light-theme .edit-picture-header .modal-title,
.edit-picture-overlay.light-theme .edit-picture-name {
  color: #052e16 !important;
}

.edit-picture-overlay.light-theme .edit-picture-hint,
.edit-picture-overlay.light-theme .edit-picture-filename {
  color: #166534;
}

.edit-picture-overlay.light-theme .edit-picture-close {
  background: #ffffff;
  border-color: #166534;
  color: #166534;
}

.edit-picture-overlay.light-theme .edit-picture-avatar-fallback {
  background: #f3f4f6;
  color: #9ca3af;
  border-color: #d1d5db;
}

@media (max-width: 768px) {
  .edit-picture-dialog {
    width: 94%;
    max-width: none;
  }

  .edit-picture-avatar {
    width: 112px;
    height: 112px;
  }
}
</style>
