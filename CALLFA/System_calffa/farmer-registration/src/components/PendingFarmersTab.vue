<template>
  <div class="registered-members-card pending-members-card">
    <div class="section-header-with-actions">
      <h2 class="registered-members-title">Pending Member Approvals</h2>
      <div v-if="farmers.length > 0" class="bulk-actions">
        <button @click="approveAllPending" class="bulk-approve-btn" :disabled="processingBulk">
          <span v-if="!processingBulk">Approve All ({{ farmers.length }})</span>
          <span v-else>Processing...</span>
        </button>
        <button @click="$emit('refresh')" class="refresh-btn" :disabled="loading">
          Refresh
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-state">
      <div class="spinner"></div>
      <p>Loading pending members...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="error" class="error-state">
      <p>{{ error }}</p>
      <button @click="$emit('refresh')" class="retry-btn">Retry</button>
    </div>

    <!-- Empty State -->
    <div v-else-if="farmers.length === 0" class="empty-state">
      <p>No pending members found.</p>
    </div>

    <!-- Pending Members Table -->
    <div v-else class="registered-table-scroll">
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
              <th>Photo</th>
              <th>Ref #</th>
              <th>Name</th>
              <th>DOB</th>
              <th>Phone</th>
              <th>Education</th>
              <th>Role</th>
              <th>Membership</th>
              <th>Barangay</th>
              <th>Registered</th>
              <th>Status</th>
              <th class="members-th-actions">Actions</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="member in farmers" :key="member.id" class="members-data-row">
              <td class="members-cell-center">
                <div class="member-avatar-wrap">
                  <img
                    v-if="member.profile_picture"
                    :src="getProfilePictureUrl(member.profile_picture)"
                    alt="Profile"
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
                  <option value="farmer">Farmer</option>
                  <option value="president">President</option>
                  <option value="treasurer">Treasurer</option>
                  <option value="auditor">Auditor</option>
                  <option value="operator">Operator</option>
                  <option value="operation_manager">Operation Manager</option>
                  <option value="business_manager">Business Manager</option>
                  <option value="agriculturist">Agriculturist</option>
                  <option value="admin">Admin</option>
                </select>
              </td>
              <td class="members-cell">
                <select
                  :value="member.membership_status || 'member'"
                  class="table-select"
                  :disabled="processingId === member.id"
                  @change="updateMembershipStatus(member.id, $event.target.value)"
                >
                  <option value="member">Member</option>
                  <option value="non-member">Non-Member</option>
                </select>
              </td>
              <td class="members-cell">{{ member.barangay_name || 'Not assigned' }}</td>
              <td class="members-cell">{{ formatDate(member.registered_on) }}</td>
              <td class="members-cell">
                <span class="status-chip status-chip-pending">Pending</span>
              </td>
              <td class="members-cell members-actions-cell">
                <div class="members-action-row">
                  <button
                    type="button"
                    class="table-action-btn table-action-approve"
                    :disabled="processingId === member.id || member.role === 'admin'"
                    title="Approve"
                    aria-label="Approve"
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
                    title="Reject"
                    aria-label="Reject"
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
                    title="Delete"
                    aria-label="Delete"
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
  if (profilePicture.startsWith('http://') || profilePicture.startsWith('https://')) {
    return profilePicture
  }
  return profilePicture
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
  .section-header-with-actions {
    flex-direction: column;
    align-items: flex-start;
  }

  .bulk-actions {
    width: 100%;
    flex-direction: column;
  }

  .bulk-approve-btn,
  .refresh-btn {
    width: 100%;
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
  border: 2px solid #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

:global(.farmer-table-page.light-theme) .registered-members-title {
  color: #052e16 !important;
  background: none !important;
  -webkit-text-fill-color: #052e16 !important;
}

:global(.farmer-table-page.light-theme) :is(.loading-state, .error-state, .empty-state) {
  color: #14532d !important;
  background: #f8fdf9 !important;
  border: 1.5px solid #bbf7d0 !important;
}

:global(.farmer-table-page.light-theme) .empty-state > p:first-child {
  color: #052e16 !important;
  font-size: 1rem !important;
}

:global(.farmer-table-page.light-theme) .refresh-btn {
  background: #ffffff !important;
  color: #15803d !important;
  border: 1.5px solid #86efac !important;
  font-size: 0.9375rem !important;
}
</style>
