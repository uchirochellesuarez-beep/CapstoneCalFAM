<template>
  <div class="registered-members-card pending-members-card">
    <div class="section-header-with-actions">
      <h2 class="registered-members-title">{{ $t('ui.pendingMemberApprovals') }}</h2>
      <div v-if="farmers.length > 0" class="bulk-actions">
        <button @click="approveAllPending" class="bulk-approve-btn" :disabled="processingBulk">
          <span v-if="!processingBulk">{{ $t('common.approveAll', { count: farmers.length }) }}</span>
          <span v-else>{{ $t('common.processing') }}</span>
        </button>
        <button @click="$emit('refresh')" class="refresh-btn" :disabled="loading">
          {{ $t('common.refresh') }}
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>{{ $t('ui.loadingPendingMembers') }}</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="$emit('refresh')" class="retry-btn">{{ $t('common.retry') }}</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="farmers.length === 0" class="empty-state">
      <p>{{ $t('ui.noPendingMembers') }}</p>
    </div>

    <!-- Pending Members — mobile cards + desktop table -->
    <template v-else>
    <div class="members-mobile-list">
      <article v-for="member in farmers" :key="'m-' + member.id" class="members-mobile-card">
        <div class="mmc-head">
          <div class="member-avatar-wrap">
            <img
              v-if="member.profile_picture"
              :src="getProfilePictureUrl(member.profile_picture)"
              :alt="$t('ui.profile')"
              class="member-avatar"
            />
            <div v-else class="member-avatar member-avatar-fallback">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
              </svg>
            </div>
          </div>
          <div class="mmc-head-text">
            <h3 class="mmc-name">{{ member.full_name }}</h3>
            <p class="mmc-ref">{{ member.reference_number }}</p>
          </div>
          <span class="status-chip status-chip-pending">{{ $t('common.pending') }}</span>
        </div>
        <div class="mmc-rows">
          <div class="mmc-row"><span>{{ $t('ui.phone') }}</span><strong>{{ member.phone_number || 'N/A' }}</strong></div>
          <div class="mmc-row"><span>{{ $t('ui.barangay') }}</span><strong>{{ member.barangay_name || 'Not assigned' }}</strong></div>
          <div class="mmc-row"><span>{{ $t('ui.education') }}</span><strong>{{ member.educational_status || 'N/A' }}</strong></div>
          <div class="mmc-row"><span>{{ $t('ui.registered') }}</span><strong>{{ formatDate(member.registered_on) }}</strong></div>
        </div>
        <div class="mmc-controls">
          <label class="mmc-field">
            <span>{{ $t('ui.role') }}</span>
            <select
              :value="member.role"
              class="table-select"
              :disabled="processingId === member.id"
              @change="updateRole(member.id, $event.target.value)"
            >
              <option value="farmer">{{ $t('ui.farmer') }}</option>
              <option value="president">{{ $t('ui.president') }}</option>
              <option value="treasurer">{{ $t('ui.treasurer') }}</option>
              <option value="auditor">{{ $t('ui.auditor') }}</option>
              <option value="operator">{{ $t('ui.operator') }}</option>
              <option value="operation_manager">{{ $t('ui.operationManager') }}</option>
              <option value="business_manager">{{ $t('ui.businessManager') }}</option>
              <option value="agriculturist">{{ $t('ui.agriculturist') }}</option>
              <option value="admin">{{ $t('ui.admin') }}</option>
            </select>
          </label>
          <label class="mmc-field">
            <span>{{ $t('ui.membership') }}</span>
            <select
              :value="member.membership_status || 'member'"
              class="table-select"
              :disabled="processingId === member.id"
              @change="updateMembershipStatus(member.id, $event.target.value)"
            >
              <option value="member">{{ $t('ui.member') }}</option>
              <option value="non-member">{{ $t('ui.nonMember') }}</option>
            </select>
          </label>
        </div>
        <div class="members-action-row mmc-actions">
          <button
            type="button"
            class="table-action-btn table-action-approve mmc-action-text"
            :disabled="processingId === member.id || member.role === 'admin'"
            :title="$t('common.approve')"
            :aria-label="$t('common.approve')"
            @click="approveMember(member.id)"
          >
            {{ $t('common.approve') }}
          </button>
          <button
            type="button"
            class="table-action-btn table-action-reject mmc-action-text"
            :disabled="processingId === member.id || member.role === 'admin'"
            :title="$t('common.reject')"
            :aria-label="$t('common.reject')"
            @click="rejectMember(member.id)"
          >
            {{ $t('common.reject') }}
          </button>
          <button
            type="button"
            class="table-action-btn table-action-delete mmc-action-text"
            :disabled="processingId === member.id || member.role === 'admin'"
            :title="$t('common.delete')"
            :aria-label="$t('common.delete')"
            @click="deleteMember(member.id)"
          >
            {{ $t('common.delete') }}
          </button>
        </div>
      </article>
    </div>

    <!-- Pending Members Table (desktop/tablet) -->
    <div class="registered-table-scroll members-desktop-only">
      <div class="members-table-container">
        <table class="members-table">
          <colgroup>
            <col class="members-col-photo" />
            <col class="members-col-ref" />
            <col class="members-col-name" />
            <col class="members-col-dob" />
            <col class="members-col-phone" />
            <col class="members-col-edu" />
            <col class="members-col-role" />
            <col class="members-col-member" />
            <col class="members-col-address" />
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
              <th>{{ $t('ui.phone') }}</th>
              <th>{{ $t('ui.education') }}</th>
              <th>{{ $t('ui.role') }}</th>
              <th>{{ $t('ui.membership') }}</th>
              <th>{{ $t('ui.barangay') }}</th>
              <th>{{ $t('ui.registered') }}</th>
              <th>{{ $t('ui.status') }}</th>
              <th class="members-th-actions">{{ $t('ui.actions') }}</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in farmers" :key="member.id" class="members-data-row">
              <td class="members-cell-center">
                <div class="member-avatar-wrap">
                  <img
                    v-if="member.profile_picture"
                    :src="getProfilePictureUrl(member.profile_picture)"
                    :alt="$t('ui.profile')"
                    class="member-avatar"
                  />
                  <div v-else class="member-avatar member-avatar-fallback">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="16" height="16" class="text-gray-400">
                      <path fill-rule="evenodd" d="M7.5 6a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" clip-rule="evenodd" />
                    </svg>
                  </div>
                </div>
              </td>
              <td class="members-cell members-td-ref">{{ member.reference_number }}</td>
              <td class="members-cell members-td-name">{{ member.full_name }}</td>
              <td class="members-cell">{{ formatDate(member.date_of_birth) }}</td>
              <td class="members-cell">{{ member.phone_number }}</td>
              <td class="members-cell">{{ member.educational_status || 'N/A' }}</td>
              <td class="members-cell">
                <select
                  :value="member.role"
                  class="table-select"
                  :disabled="processingId === member.id"
                  @change="updateRole(member.id, $event.target.value)"
                >
                  <option value="farmer">{{ $t('ui.farmer') }}</option>
                  <option value="president">{{ $t('ui.president') }}</option>
                  <option value="treasurer">{{ $t('ui.treasurer') }}</option>
                  <option value="auditor">{{ $t('ui.auditor') }}</option>
                  <option value="operator">{{ $t('ui.operator') }}</option>
                  <option value="operation_manager">{{ $t('ui.operationManager') }}</option>
                  <option value="business_manager">{{ $t('ui.businessManager') }}</option>
                  <option value="agriculturist">{{ $t('ui.agriculturist') }}</option>
                  <option value="admin">{{ $t('ui.admin') }}</option>
                </select>
              </td>
              <td class="members-cell">
                <select
                  :value="member.membership_status || 'member'"
                  class="table-select"
                  :disabled="processingId === member.id"
                  @change="updateMembershipStatus(member.id, $event.target.value)"
                >
                  <option value="member">{{ $t('ui.member') }}</option>
                  <option value="non-member">{{ $t('ui.nonMember') }}</option>
                </select>
              </td>
              <td class="members-cell">{{ member.barangay_name || 'Not assigned' }}</td>
              <td class="members-cell">{{ formatDate(member.registered_on) }}</td>
              <td class="members-cell">
                <span class="status-chip status-chip-pending">{{ $t('common.pending') }}</span>
              </td>
              <td class="members-cell members-actions-cell">
                <div class="members-action-row">
                  <button
                    type="button"
                    class="table-action-btn table-action-approve"
                    :disabled="processingId === member.id || member.role === 'admin'"
                    :title="$t('common.approve')"
                    :aria-label="$t('common.approve')"
                    @click="approveMember(member.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <polyline points="20 6 9 17 4 12"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="table-action-btn table-action-reject"
                    :disabled="processingId === member.id || member.role === 'admin'"
                    :title="$t('common.reject')"
                    :aria-label="$t('common.reject')"
                    @click="rejectMember(member.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                      <line x1="18" y1="6" x2="6" y2="18"/>
                      <line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                  </button>
                  <button
                    type="button"
                    class="table-action-btn table-action-delete"
                    :disabled="processingId === member.id || member.role === 'admin'"
                    :title="$t('common.delete')"
                    :aria-label="$t('common.delete')"
                    @click="deleteMember(member.id)"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
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
    </template>

    <!-- Success Message -->
    <div v-if="successMessage" class="success-message-banner">
      <span class="success-text">{{ successMessage }}</span>
      <button @click="successMessage = ''" class="close-success">×</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { mediaUrl } from '../utils/apiBase'

const emit = defineEmits(['approve', 'reject', 'delete', 'refresh', 'update-role', 'update-membership-status'])
const authStore = useAuthStore()

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
  }
})

const processingId = ref(null)
const processingBulk = ref(false)
const successMessage = ref('')

const farmers = computed(() => props.farmers || [])

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

const getProfilePictureUrl = (profilePicture) => {
  if (!profilePicture) return null
  return mediaUrl(profilePicture)
}

const approveMember = async (memberId) => {
  if (!confirm('Are you sure you want to approve this member? They will be able to login after approval.')) {
    return
  }

  processingId.value = memberId
  successMessage.value = ''

  try {
    emit('approve', memberId)
    
    const member = props.farmers.find(m => m.id === memberId)
    successMessage.value = `Member "${member?.full_name || memberId}" approved successfully! They can now login.`
    
    setTimeout(() => {
      successMessage.value = ''
      processingId.value = null
    }, 3000)
  } catch (err) {
    processingId.value = null
    alert('Error approving member: ' + err.message)
  }
}

const rejectMember = async (memberId) => {
  if (!confirm('Are you sure you want to reject this member?')) {
    return
  }

  processingId.value = memberId
  successMessage.value = ''

  try {
    emit('reject', memberId)
    
    const member = props.farmers.find(m => m.id === memberId)
    successMessage.value = `Member "${member?.full_name || memberId}" has been rejected.`
    
    setTimeout(() => {
      successMessage.value = ''
      processingId.value = null
    }, 3000)
  } catch (err) {
    processingId.value = null
    alert('Error rejecting member: ' + err.message)
  }
}

const deleteMember = async (memberId) => {
  if (!confirm('Are you sure you want to permanently delete this member? This action cannot be undone.')) {
    return
  }

  processingId.value = memberId
  successMessage.value = ''

  try {
    emit('delete', memberId)
    
    successMessage.value = 'Member deleted successfully.'
    
    setTimeout(() => {
      successMessage.value = ''
      processingId.value = null
    }, 3000)
  } catch (err) {
    processingId.value = null
    alert('Error deleting member: ' + err.message)
  }
}

const updateRole = async (memberId, newRole) => {
  if (!confirm(`Are you sure you want to change this account role to "${newRole.toUpperCase()}"?`)) {
    emit('refresh') // Refresh to reset the dropdown
    return
  }

  processingId.value = memberId
  successMessage.value = ''

  try {
    emit('update-role', { memberId, newRole })
    
    successMessage.value = `Role updated to ${newRole} successfully!`
    
    setTimeout(() => {
      successMessage.value = ''
      processingId.value = null
    }, 2000)
  } catch (err) {
    processingId.value = null
    emit('refresh') // Refresh to reset on error
    alert('Error updating role: ' + err.message)
  }
}

const updateMembershipStatus = async (memberId, newStatus) => {
  const statusLabel = newStatus === 'member' ? 'Member' : 'Non-Member'
  if (!confirm(`Are you sure you want to change this farmer's status to "${statusLabel}"?`)) {
    emit('refresh') // Refresh to reset the dropdown
    return
  }

  processingId.value = memberId
  successMessage.value = ''

  try {
    emit('update-membership-status', { memberId, membershipStatus: newStatus })
    
    successMessage.value = `Membership status updated to ${statusLabel} successfully!`
    
    setTimeout(() => {
      successMessage.value = ''
      processingId.value = null
    }, 2000)
  } catch (err) {
    processingId.value = null
    emit('refresh') // Refresh to reset on error
    alert('Error updating membership status: ' + err.message)
  }
}

const approveAllPending = async () => {
  if (farmers.value.length === 0) {
    return
  }

  if (!confirm(`Are you sure you want to approve all ${farmers.value.length} pending members?`)) {
    return
  }

  processingBulk.value = true
  successMessage.value = ''

  try {
    // Emit approve for each member
    for (const member of farmers.value) {
      emit('approve', member.id)
    }
    
    successMessage.value = `Successfully processing ${farmers.value.length} member(s) for approval!`
    
    setTimeout(() => {
      successMessage.value = ''
      processingBulk.value = false
      emit('refresh')
    }, 2000)
  } catch (err) {
    processingBulk.value = false
    alert('Error approving members: ' + err.message)
  }
}
</script>

<style scoped>
@import '../styles/members-table.css';

.registered-members-card {
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  padding: 1rem;
  margin-bottom: 24px;
}

.registered-members-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: #eefde6;
  margin: 0;
  letter-spacing: 0.02em;
}

.pending-members-card {
  margin-bottom: 24px;
}

.section-header-with-actions {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 16px;
}

.bulk-actions {
  display: flex;
  gap: 12px;
}

.bulk-approve-btn {
  padding: 10px 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.bulk-approve-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.bulk-approve-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.refresh-btn {
  padding: 10px 20px;
  background: transparent;
  color: #86efac;
  border: 1px solid rgba(74, 222, 128, 0.45);
  border-radius: 8px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.refresh-btn:hover:not(:disabled) {
  background: rgba(74, 222, 128, 0.12);
  color: #bbf7d0;
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(229, 235, 231, 0.9);
  font-size: 0.875rem;
}

.empty-state {
  background: rgba(0, 0, 0, 0.2);
  border: 1px solid rgba(190, 235, 203, 0.12);
  border-radius: 12px;
}

.empty-state > p:first-child {
  color: rgba(238, 253, 230, 0.95) !important;
  font-size: 16px;
  font-weight: 700;
}

.spinner {
  display: inline-block;
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.12);
  border-top: 4px solid #34d399;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

.error-state {
  color: #fca5a5;
}

.retry-btn {
  margin-top: 16px;
  padding: 8px 24px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-weight: 600;
}

.success-message-banner {
  position: fixed;
  top: 20px;
  right: 20px;
  background: linear-gradient(135deg, #10b981 0%, #059669 100%);
  color: white;
  padding: 16px 24px;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
  display: flex;
  align-items: center;
  gap: 12px;
  z-index: 1000;
  animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
  from {
    transform: translateX(400px);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

.success-text {
  font-weight: 600;
}

.close-success {
  background: rgba(255, 255, 255, 0.2);
  border: none;
  color: white;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  cursor: pointer;
  font-size: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.2s;
}

.close-success:hover {
  background: rgba(255, 255, 255, 0.3);
}

@media (max-width: 768px) {
  .registered-members-card {
    padding: 0.65rem;
    margin-bottom: 0.65rem;
  }

  .section-header-with-actions {
    flex-direction: column;
    align-items: stretch;
    margin-bottom: 0.55rem;
    gap: 0.45rem;
  }

  .registered-members-title {
    font-size: 1rem;
  }

  .bulk-actions {
    width: 100%;
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.4rem;
  }

  .bulk-approve-btn,
  .refresh-btn {
    width: auto;
    flex: 1 1 auto;
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
  }

  .members-table {
    font-size: 0.625rem;
  }

  :deep(.members-table th),
  :deep(.members-table td) {
    padding: 0.24rem 0.22rem;
  }

  .action-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    justify-content: center;
  }

  .approve-btn,
  .reject-btn,
  .delete-btn {
    width: auto;
    min-width: 64px;
  }

  .success-message-banner {
    left: 20px;
    right: 20px;
  }
}

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

:global(.farmer-table-page.light-theme) :is(.loading-state, .error-state, .empty-state) {
  color: #14532d !important;
  background: #ffffff !important;
  border-color: #94a3b8 !important;
}

:global(.farmer-table-page.light-theme) .empty-state > p:first-child {
  color: #052e16 !important;
}

:global(.farmer-table-page.light-theme) .refresh-btn {
  background: #ffffff !important;
  color: #15803d !important;
  border-color: #86efac !important;
}
</style>
