<template>
  <div class="registered-members-card section-card">
    <h2 class="registered-members-title">Registered Members</h2>
    
    <div v-if="displayLoading" class="registered-members-muted text-center py-8">
      Loading members...
    </div>
    <div v-else-if="displayError" class="registered-members-error text-center py-8">
      Error: {{ displayError }}
    </div>
    <div v-else-if="displayFarmers.length === 0" class="registered-members-muted text-center py-8">
      No members registered yet.
    </div>
    <div v-else>
      <!-- Role Tabs -->
      <div class="role-tabs mb-6">
        <button
          type="button"
          @click="activeRole = 'operation_manager'"
          :class="['role-tab', { 'active': activeRole === 'operation_manager' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><path d="M12 12v4M10 14h4"/></svg>
          <span class="role-tab-label">Operation<br>Managers</span>
          <span class="role-tab-count">({{ farmersByRole.operation_manager.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'business_manager'"
          :class="['role-tab', { 'active': activeRole === 'business_manager' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3v18h18"/><path d="M7 16l4-4 4 4 5-6"/></svg>
          <span class="role-tab-label">Business<br>Managers</span>
          <span class="role-tab-count">({{ farmersByRole.business_manager.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'farmer'"
          :class="['role-tab', { 'active': activeRole === 'farmer' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
          <span class="role-tab-label">Farmers</span>
          <span class="role-tab-count">({{ farmersByRole.farmer.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'admin'"
          :class="['role-tab', { 'active': activeRole === 'admin' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span class="role-tab-label">Admins</span>
          <span class="role-tab-count">({{ farmersByRole.admin.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'president'"
          :class="['role-tab', { 'active': activeRole === 'president' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2l2.4 7.4H22l-6 4.6 2.3 7L12 17.8 5.7 21.1 8 14 2 9.4h7.6L12 2z"/></svg>
          <span class="role-tab-label">Presidents</span>
          <span class="role-tab-count">({{ farmersByRole.president.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'treasurer'"
          :class="['role-tab', { 'active': activeRole === 'treasurer' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="2" y="6" width="20" height="12" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
          <span class="role-tab-label">Treasurers</span>
          <span class="role-tab-count">({{ farmersByRole.treasurer.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'auditor'"
          :class="['role-tab', { 'active': activeRole === 'auditor' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>
          <span class="role-tab-label">Auditors</span>
          <span class="role-tab-count">({{ farmersByRole.auditor.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'operator'"
          :class="['role-tab', { 'active': activeRole === 'operator' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
          <span class="role-tab-label">Operators</span>
          <span class="role-tab-count">({{ farmersByRole.operator.length }})</span>
        </button>
        <button
          type="button"
          @click="activeRole = 'agriculturist'"
          :class="['role-tab', { 'active': activeRole === 'agriculturist' }]"
        >
          <svg class="role-tab-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22c5-3 7-7 7-11a7 7 0 0 0-14 0c0 4 2 8 7 11z"/><path d="M12 11V7"/></svg>
          <span class="role-tab-label">Agriculturists</span>
          <span class="role-tab-count">({{ farmersByRole.agriculturist.length }})</span>
        </button>
      </div>

      <!-- Table for selected role (layout matches AdminLoansPage loans-table) -->
      <div class="registered-table-scroll">
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
              <th>Photo</th>
              <th>Ref #</th>
              <th>Name</th>
              <th>DOB</th>
              <th>Address</th>
              <th>Phone</th>
              <th>Education</th>
              <th class="members-th-role">Role</th>
              <th>Membership</th>
              <th>Registered</th>
              <th>Status</th>
              <th class="members-th-actions">Actions</th>
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
                      alt="Profile" 
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
                <span>{{ farmer.barangay_name || farmer.address }}</span>
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
                  Member
                </span>
                <span v-else class="member-chip member-chip-nonmember">
                  Non-Member
                </span>
              </td>
              <td class="members-cell">{{ formatDate(farmer.registered_on) }}</td>
              <td class="members-cell">
                <span v-if="farmer.status === 'approved'" class="status-chip status-chip-approved">
                  Approved
                </span>
                <span v-else-if="farmer.status === 'rejected'" class="status-chip status-chip-rejected">
                  Rejected
                </span>
              </td>
              <td class="members-cell members-actions-cell">
                <div class="members-action-row">
                  <button type="button" @click="viewDetails(farmer)" class="table-action-btn table-action-view" title="View" aria-label="View">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
                      <circle cx="12" cy="12" r="3"/>
                    </svg>
                  </button>
                  <button type="button" @click="startEdit(farmer)" class="table-action-btn table-action-edit" title="Edit" aria-label="Edit">
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
                    title="Delete"
                    aria-label="Delete"
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

    <!-- View Details Modal -->
    <div v-if="showDetailsModal" class="modal-overlay" @click="closeDetailsModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Member Details</h3>
          <button @click="closeDetailsModal" class="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedFarmer">
          <div class="flex flex-col items-center mb-6">
            <img 
              v-if="selectedFarmer.profile_picture" 
              :src="getProfilePictureUrl(selectedFarmer.profile_picture)" 
              alt="Profile Picture" 
              class="rounded-full object-cover border-4 border-green-500 shadow-lg"
              style="width: 100px; height: 100px; min-width: 100px; min-height: 100px;"
            />
            <div v-else class="rounded-full modal-avatar-fallback flex items-center justify-center border-4 border-gray-300" style="width: 100px; height: 100px; min-width: 100px; min-height: 100px;">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-12 h-12 text-gray-400" viewBox="0 0 24 24" fill="currentColor">
                <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
              </svg>
            </div>
            <h4 class="member-name">{{ selectedFarmer.full_name }}</h4>
            <span class="role-badge mt-2" :class="selectedFarmer.role">{{ formatMemberRole(selectedFarmer.role) }}</span>
          </div>
          <div class="details-grid">
            <div class="detail-item">
              <span class="detail-label">Reference Number:</span>
              <span class="detail-value">{{ selectedFarmer.reference_number }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Date of Birth:</span>
              <span class="detail-value">{{ formatDate(selectedFarmer.date_of_birth) }}</span>
            </div>
            <div class="detail-item">
              <span class="detail-label">Address:</span>
              <span class="detail-value">{{ selectedFarmer.address }}</span>
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
                  Approved
                </span>
                <span v-else-if="selectedFarmer.status === 'rejected'" class="status-chip status-chip-rejected">
                  Rejected
                </span>
                <span v-else class="status-chip status-chip-pending">
                  Pending
                </span>
              </span>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeDetailsModal" class="btn-secondary">Close</button>
        </div>
      </div>
    </div>

    <!-- Edit Member Modal -->
    <div v-if="showEditMemberModal && editingFarmer" class="modal-overlay" @click="cancelEdit">
      <div class="modal-content modal-edit-member" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title">Edit Member</h3>
          <button @click="cancelEdit" class="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
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
                Change Photo
              </button>
            </div>
          </div>

          <div class="edit-grid">
            <div class="edit-field edit-field-full">
              <label class="edit-label">Reference Number *</label>
              <input
                v-model="editForm.reference_number"
                @input="handleReferenceInput"
                type="text"
                class="edit-input edit-input-modal"
                placeholder="00-00-00-000-000000"
                maxlength="19"
              />
              <small class="edit-hint">Format: 00-00-00-000-000000 (digits only; auto-formatted)</small>
            </div>

            <div class="edit-field">
              <label class="edit-label">Full Name *</label>
              <input
                v-model="editForm.full_name"
                type="text"
                class="edit-input edit-input-modal"
                placeholder="Member full name"
              />
            </div>

            <div class="edit-field">
              <label class="edit-label">Date of Birth *</label>
              <input
                v-model="editForm.date_of_birth"
                type="date"
                class="edit-input edit-input-modal"
              />
            </div>

            <div class="edit-field">
              <label class="edit-label">Phone Number *</label>
              <input
                v-model="editForm.phone_number"
                type="text"
                class="edit-input edit-input-modal"
                placeholder="e.g., 09171234567"
              />
            </div>

            <div class="edit-field">
              <label class="edit-label">Address (Barangay) *</label>
              <select
                v-model.number="editForm.barangay_id"
                class="edit-input edit-input-modal"
                @change="onBarangayChange"
              >
                <option :value="null" disabled>Select Barangay</option>
                <option v-for="barangay in barangays" :key="barangay.id" :value="barangay.id">
                  {{ barangay.name }}
                </option>
              </select>
            </div>

            <div class="edit-field">
              <label class="edit-label">Educational Status</label>
              <select v-model="editForm.educational_status" class="edit-input edit-input-modal">
                <option value="">Select</option>
                <option value="No Formal Education">No Formal Education</option>
                <option value="Elementary Level">Elementary Level</option>
                <option value="Elementary Graduate">Elementary Graduate</option>
                <option value="High School Level">High School Level</option>
                <option value="High School Graduate">High School Graduate</option>
                <option value="Vocational">Vocational</option>
                <option value="College Level">College Level</option>
                <option value="College Graduate">College Graduate</option>
                <option value="Post Graduate">Post Graduate</option>
              </select>
            </div>

            <div class="edit-field">
              <label class="edit-label">Hectares Farmed</label>
              <input
                v-model="editForm.land_area"
                type="number"
                step="0.01"
                min="0"
                class="edit-input edit-input-modal"
                placeholder="e.g., 1.5"
              />
            </div>

            <div class="edit-field">
              <label class="edit-label">Farm Location</label>
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
              <small v-if="loadingFarmLocations" class="edit-hint">Loading places...</small>
            </div>

            <div
              v-if="editingFarmer.role !== 'admin' && (editingFarmer.membership_status || 'member') !== 'non-member'"
              class="edit-field"
            >
              <label class="edit-label">Role *</label>
              <select v-model="editForm.role" class="edit-input edit-input-modal">
                <option value="farmer">Farmer</option>
                <option value="admin">Admin</option>
                <option value="president">President</option>
                <option value="treasurer">Treasurer</option>
                <option value="auditor">Auditor</option>
                <option value="operator">Operator</option>
                <option value="operation_manager">Operation Manager</option>
                <option value="business_manager">Business Manager</option>
                <option value="agriculturist">Agriculturist</option>
              </select>
            </div>

            <div class="edit-field">
              <label class="edit-label">Membership Status *</label>
              <select v-model="editForm.membership_status" class="edit-input edit-input-modal">
                <option value="member">Member</option>
                <option value="non-member">Non-Member</option>
              </select>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="cancelEdit" class="btn-secondary">Cancel</button>
          <button @click="saveEdit(editingFarmer)" class="btn-primary">Save Changes</button>
        </div>
      </div>
    </div>

    <!-- Edit Profile Picture Modal -->
    <div v-if="showEditPictureModal" class="modal-overlay" @click="closeEditPictureModal">
      <div class="modal-content" @click.stop>
        <div class="modal-header">
          <h3 class="modal-title text-2xl">Update Profile Picture</h3>
          <button @click="closeEditPictureModal" class="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
        </div>
        <div class="modal-body" v-if="selectedFarmer">
          <div class="flex flex-col items-center">
            <div class="relative mb-4">
              <img 
                v-if="profilePicturePreview" 
                :src="profilePicturePreview" 
                alt="Preview" 
                class="w-40 h-40 rounded-full object-cover border-4 border-green-500"
              />
              <img 
                v-else-if="selectedFarmer.profile_picture" 
                :src="getProfilePictureUrl(selectedFarmer.profile_picture)" 
                alt="Current" 
                class="w-40 h-40 rounded-full object-cover border-4 border-gray-300"
              />
              <div v-else class="w-40 h-40 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 border-4 border-gray-300">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-16 h-16" viewBox="0 0 24 24" fill="currentColor">
                  <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                </svg>
              </div>
            </div>
            <label class="btn-primary cursor-pointer">
              Choose Photo
              <input 
                type="file" 
                ref="profilePictureInput"
                @change="handleProfilePictureSelect" 
                accept="image/jpeg,image/png,image/gif"
                class="hidden"
              />
            </label>
            <p class="text-xs text-gray-500 mt-2">Max 5MB - JPEG, PNG, GIF only</p>
            <p v-if="uploadError" class="text-sm text-red-600 mt-2">{{ uploadError }}</p>
          </div>
        </div>
        <div class="modal-footer">
          <button @click="closeEditPictureModal" class="btn-secondary">Cancel</button>
          <button 
            @click="uploadProfilePicture" 
            class="btn-primary"
            :disabled="!selectedProfilePicture || uploading"
          >
            <span v-if="uploading">Uploading...</span>
            <span v-else>💾 Save Photo</span>
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch, defineProps, defineEmits } from 'vue'
import { formatMemberRole } from '../utils/roleLabels.js'
import { useFarmerStore } from '../stores/farmerStore'
import { useAuthStore } from '../stores/authStore'

const farmerStore = useFarmerStore()
const authStore = useAuthStore()

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

const startEdit = (farmer) => {
  editingId.value = farmer.id
  editingFarmer.value = farmer
  showEditMemberModal.value = true
  editForm.value = {
    reference_number: farmer.reference_number || '',
    full_name: farmer.full_name,
    date_of_birth: farmer.date_of_birth?.split('T')[0] || '',
    address: farmer.address,
    barangay_name: farmer.barangay_name || farmer.address || '',
    phone_number: farmer.phone_number,
    educational_status: farmer.educational_status || '',
    land_area: farmer.land_area || '',
    farm_location: farmer.farm_location || '',
    role: farmer.role,
    membership_status: farmer.membership_status || 'member',
    barangay_id: farmer.barangay_id || null
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

  if (!confirm(`Are you sure you want to update ${farmer.full_name}'s information?`)) {
    return
  }

  try {
    // Find the selected barangay name
    const selectedBarangay = barangays.value.find(b => b.id === editForm.value.barangay_id)
    const barangayName = selectedBarangay ? selectedBarangay.name : editForm.value.address

    const updateData = {
      reference_number: editForm.value.reference_number,
      full_name: editForm.value.full_name,
      date_of_birth: editForm.value.date_of_birth,
      address: barangayName,
      phone_number: editForm.value.phone_number,
      educational_status: editForm.value.educational_status,
      land_area: editForm.value.land_area,
      farm_location: editForm.value.farm_location
    }

    // Update basic info
    const response = await fetch(`/api/farmers/${farmer.id}/profile`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updateData)
    })

    if (!response.ok) throw new Error('Failed to update profile')
    const profileResp = await response.json().catch(() => null)
    if (profileResp && profileResp.success === false) {
      throw new Error(profileResp.message || 'Failed to update profile')
    }

    // Update role if changed and not admin
    if (editForm.value.role !== farmer.role && farmer.role !== 'admin') {
      const roleResponse = await fetch(`/api/farmers/${farmer.id}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: editForm.value.role })
      })
      
      if (!roleResponse.ok) throw new Error('Failed to update role')
    }

    // Update membership status if changed
    if (editForm.value.membership_status !== farmer.membership_status) {
      const token = authStore.token
      const statusResponse = await fetch(`/api/farmers/${farmer.id}/membership-status`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({ membership_status: editForm.value.membership_status })
      })
      
      if (!statusResponse.ok) throw new Error('Failed to update membership status')
    }

    // Update local data
    const index = internalFarmers.value.findIndex(f => f.id === farmer.id)
    if (index !== -1) {
      internalFarmers.value[index] = {
        ...internalFarmers.value[index],
        ...updateData,
        role: editForm.value.role,
        membership_status: editForm.value.membership_status,
        barangay_id: editForm.value.barangay_id,
        barangay_name: barangayName
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

const viewDetails = (farmer) => {
  selectedFarmer.value = farmer
  showDetailsModal.value = true
}

const closeDetailsModal = () => {
  showDetailsModal.value = false
  selectedFarmer.value = null
}

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

  // Validate file size (5MB max)
  if (file.size > 5 * 1024 * 1024) {
    uploadError.value = 'File size must be less than 5MB'
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

    const response = await fetch(`http://localhost:3000/api/farmers/${selectedFarmer.value.id}/profile-picture`, {
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
        barangays.value = barangayData.barangays || []
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
        barangays.value = barangayData.barangays || []
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
  display: flex;
  gap: 6px;
  background: linear-gradient(145deg, rgba(14,25,19,0.97), rgba(10,19,15,0.96));
  padding: 8px;
  border-radius: 12px;
  border: 1px solid rgba(122,171,140,0.20);
  flex-wrap: wrap;
}

.role-tab {
  flex: 1;
  min-width: 84px;
  padding: 10px 8px 8px;
  background: rgba(255,255,255,0.05);
  border: 1px solid rgba(122,171,140,0.15);
  border-radius: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.22s ease;
  color: rgba(220,252,231,0.70);
  font-size: var(--members-font-tab, 1rem);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  line-height: 1.3;
  text-align: center;
}

.role-tab-icon {
  width: 28px;
  height: 28px;
  flex-shrink: 0;
  color: rgba(220, 252, 231, 0.88);
  transition: transform 0.22s ease, color 0.22s ease;
}

.role-tab-label {
  font-size: 0.9375rem;
  font-weight: 700;
  letter-spacing: 0.2px;
  color: rgba(220,252,231,0.80);
  line-height: 1.25;
}

.role-tab-count {
  font-size: 0.8125rem;
  font-weight: 700;
  color: rgba(134,239,172,0.65);
}

.role-tab:hover {
  background: rgba(74,222,128,0.10);
  border-color: rgba(134,239,172,0.35);
  color: #ecfdf5;
  transform: translateY(-2px);
  box-shadow: 0 4px 14px rgba(0,0,0,0.25);
}

.role-tab:hover .role-tab-icon {
  transform: scale(1.12);
  color: #ecfdf5;
}

.role-tab:hover .role-tab-label {
  color: #ecfdf5;
}

.role-tab.active {
  background: linear-gradient(135deg, rgba(22,163,74,0.55) 0%, rgba(16,120,54,0.65) 100%);
  border-color: rgba(74,222,128,0.45);
  color: white;
  box-shadow: 0 4px 16px rgba(16,185,129,0.30), inset 0 1px 0 rgba(255,255,255,0.08);
  transform: translateY(-1px);
}

.role-tab.active .role-tab-icon {
  color: #ffffff;
  transform: scale(1.08);
}

.role-tab.active .role-tab-label {
  color: #ecfdf5;
}

.role-tab.active .role-tab-count {
  color: rgba(134,239,172,0.90);
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

@media (max-width: 768px) {
  .role-tabs {
    flex-direction: column;
  }

  .role-tab {
    width: 100%;
  }
}

/* Modal Styles */
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
   Edit Member Modal — bigger, two-column grid
   ============================================ */
.modal-content.modal-edit-member {
  max-width: 760px;
}

.edit-photo-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 16px;
  margin-bottom: 18px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(190, 235, 203, 0.18);
  border-radius: 12px;
}

.edit-photo-thumb img,
.edit-photo-thumb .edit-photo-fallback {
  width: 64px;
  height: 64px;
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
  gap: 2px;
}

.edit-photo-name {
  margin: 0;
  font-size: 15px;
  font-weight: 700;
  color: #ffffff;
}

.edit-photo-sub {
  margin: 0;
  font-size: 12px;
  font-weight: 600;
  color: rgba(187, 247, 208, 0.7);
  font-variant-numeric: tabular-nums;
}

.edit-photo-btn {
  align-self: flex-start;
  margin-top: 6px;
  padding: 6px 14px;
  border-radius: 8px;
  font-size: 12px;
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
  gap: 16px 22px;
}

.edit-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.edit-field-full {
  grid-column: 1 / -1;
}

.edit-label {
  font-size: 11px;
  font-weight: 700;
  color: rgba(187, 247, 208, 0.92);
  text-transform: uppercase;
  letter-spacing: 0.7px;
}

.edit-input-modal {
  width: 100%;
  padding: 10px 12px;
  font-size: 13.5px;
  border-radius: 8px;
  border: 1px solid rgba(190, 235, 203, 0.32);
  background: rgba(0, 0, 0, 0.32);
  color: #f8fafc;
  transition: border-color 0.18s ease, box-shadow 0.18s ease, background 0.18s ease;
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

.edit-hint {
  font-size: 11px;
  color: rgba(220, 252, 231, 0.62);
  letter-spacing: 0.2px;
}

@media (max-width: 640px) {
  .edit-grid {
    grid-template-columns: 1fr;
  }
}

/* Light mode — parent page sets .light-theme on .farmer-table-page */
:global(.farmer-table-page.light-theme) .registered-members-card {
  background: #ffffff !important;
  border: 2px solid #86efac !important;
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
  border: 2px solid #86efac !important;
}

:global(.farmer-table-page.light-theme) .role-tab {
  background: #ffffff !important;
  border: 1.5px solid #bbf7d0 !important;
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
  border: 1.5px solid #cbd5e1 !important;
  font-size: 0.875rem !important;
}
</style>
