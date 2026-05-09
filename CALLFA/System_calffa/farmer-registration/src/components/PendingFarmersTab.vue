<template>
  <div class="pending-members-card section-card">
    <div class="section-header-with-actions">
      <h2 class="section-title">Pending Member Approvals</h2>
      <div v-if="filteredFarmers.length > 0" class="bulk-actions">
        <button @click="approveAllPending" class="bulk-approve-btn" :disabled="processingBulk">
          <span v-if="!processingBulk">Approve All ({{ filteredFarmers.length }})</span>
          <span v-else>Processing...</span>
        </button>
        <button @click="$emit('refresh')" class="refresh-btn" :disabled="loading">
          Refresh
        </button>
      </div>
    </div>

    <!-- Search Bar -->
    <div class="search-container">
      <span class="search-icon" aria-hidden="true">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      </span>
      <input
        v-model="searchQuery"
        type="text"
        placeholder="Search by name, reference number, or phone..."
        class="search-input"
      />
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
    <div v-else-if="filteredFarmers.length === 0" class="empty-state">
      <p>No pending members to approve.</p>
      <p class="empty-hint">If you expect pending accounts, verify that:</p>
      <ul class="empty-checklist">
        <li>- You are logged in as an admin account</li>
        <li>- The backend server is running (http://localhost:5000)</li>
        <li>- New users have status set to <code>pending</code> in the database</li>
      </ul>
    </div>

    <!-- Pending Members Table -->
    <div v-else class="members-table">
      <table>
        <thead>
          <tr>
            <th>Reference Number</th>
            <th>Full Name</th>
            <th>Date of Birth</th>
            <th>Phone Number</th>
            <th>Education</th>
            <th>Role</th>
            <th>Membership Status</th>
            <th>Barangay</th>
            <th>Registered Date</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="member in filteredFarmers" :key="member.id">
            <td>{{ member.reference_number }}</td>
            <td>{{ member.full_name }}</td>
            <td>{{ formatDate(member.date_of_birth) }}</td>
            <td>{{ member.phone_number }}</td>
            <td>{{ member.educational_status || 'N/A' }}</td>
            <td>
              <select 
                :value="member.role" 
                @change="updateRole(member.id, $event.target.value)"
                class="role-select"
                :disabled="processingId === member.id"
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
            <td>
              <select 
                :value="member.membership_status || 'member'" 
                @change="updateMembershipStatus(member.id, $event.target.value)"
                class="role-select"
                :disabled="processingId === member.id"
              >
                <option value="member">Member</option>
                <option value="non-member">Non-Member</option>
              </select>
            </td>
            <td>{{ member.barangay_name || 'Not assigned' }}</td>
            <td>{{ formatDate(member.registered_on) }}</td>
            <td>
              <div class="action-buttons">
                <button
                  @click="approveMember(member.id)"
                  class="approve-btn"
                  :disabled="processingId === member.id || member.role === 'admin'"
                >
                  {{ processingId === member.id ? 'Processing...' : 'Approve' }}
                </button>
                <button
                  @click="rejectMember(member.id)"
                  class="reject-btn"
                  :disabled="processingId === member.id || member.role === 'admin'"
                >
                  Reject
                </button>
                <button
                  @click="deleteMember(member.id)"
                  class="delete-btn"
                  :disabled="processingId === member.id || member.role === 'admin'"
                >
                  Delete
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
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

const searchQuery = ref('')
const processingId = ref(null)
const processingBulk = ref(false)
const successMessage = ref('')

const filteredFarmers = computed(() => {
  const farmerList = props.farmers || []
  if (!searchQuery.value) return farmerList

  const query = searchQuery.value.toLowerCase()
  return farmerList.filter(farmer =>
    farmer.full_name?.toLowerCase().includes(query) ||
    farmer.reference_number?.toLowerCase().includes(query) ||
    farmer.phone_number?.includes(query)
  )
})

const formatDate = (dateString) => {
  if (!dateString) return 'N/A'
  const date = new Date(dateString)
  return date.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
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
  if (filteredFarmers.value.length === 0) {
    return
  }

  if (!confirm(`Are you sure you want to approve all ${filteredFarmers.value.length} pending members?`)) {
    return
  }

  processingBulk.value = true
  successMessage.value = ''

  try {
    // Emit approve for each member
    for (const member of filteredFarmers.value) {
      emit('approve', member.id)
    }
    
    successMessage.value = `Successfully processing ${filteredFarmers.value.length} member(s) for approval!`
    
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
.pending-members-card {
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  border-radius: 12px;
  padding: 1.5rem;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
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

.section-title {
  font-size: 1.35rem;
  font-weight: 800;
  color: #eefde6;
  margin: 0;
  letter-spacing: 0.02em;
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

.search-container {
  margin-bottom: 20px;
  position: relative;
}

.search-input {
  width: 100%;
  padding: 10px 14px 10px 44px;
  border: 1px solid rgba(190, 235, 203, 0.24);
  border-radius: 8px;
  font-size: 13px;
  color: #eefde6;
  background: rgba(0, 0, 0, 0.24);
  transition: all 0.2s;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 28px;
  height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  color: rgba(134, 239, 172, 0.9);
  background: rgba(74, 222, 128, 0.1);
  border: 1px solid rgba(74, 222, 128, 0.22);
  pointer-events: none;
}

.search-icon svg {
  display: block;
}

.search-input::placeholder {
  color: rgba(229, 235, 231, 0.45);
}

.search-input:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.15);
}

.loading-state,
.error-state,
.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: rgba(229, 235, 231, 0.8);
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

.empty-hint {
  margin-top: 10px;
  font-size: 13px;
  color: rgba(229, 235, 231, 0.75) !important;
  font-weight: 600;
}

.empty-checklist {
  margin-top: 8px;
  padding-left: 0;
  list-style: none;
  font-size: 12px;
  color: rgba(229, 235, 231, 0.7) !important;
  line-height: 1.6;
  font-weight: 500;
}

.empty-checklist code {
  background: rgba(255, 255, 255, 0.1);
  color: rgba(238, 253, 230, 0.95) !important;
  padding: 1px 6px;
  border-radius: 4px;
  font-size: 11px;
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

.members-table {
  overflow-x: auto;
  border-radius: 12px;
}

table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

thead tr {
  background: linear-gradient(90deg, rgba(34, 197, 94, 0.18) 0%, rgba(45, 212, 191, 0.10) 100%);
  border-bottom: 1px solid rgba(190, 235, 203, 0.2);
  backdrop-filter: blur(8px) saturate(120%);
  -webkit-backdrop-filter: blur(8px) saturate(120%);
}

th {
  padding: 8px 6px;
  text-align: center;
  font-weight: 700;
  color: rgba(234, 241, 236, 0.94);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  line-height: 1.2;
}

td {
  padding: 8px 6px;
  color: rgba(226, 234, 229, 0.92) !important;
  font-size: 11px;
  text-align: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  vertical-align: middle;
  background: transparent !important;
}

tbody tr {
  transition: none;
  background: transparent !important;
}

tbody tr:hover {
  background: rgba(74, 222, 128, 0.07) !important;
}

/* Remove click/tap highlight on member rows */
tbody tr,
tbody tr td {
  -webkit-tap-highlight-color: transparent;
}

/* Also remove tap/click highlight from interactive controls in rows */
.members-table button,
.members-table select,
.members-table input,
.members-table td,
.members-table tr {
  -webkit-tap-highlight-color: transparent;
}

tbody tr:active,
tbody tr:focus,
tbody tr:focus-within,
tbody tr:active td,
tbody tr:focus td,
tbody tr:focus-within td {
  background: transparent !important;
  outline: none;
}

.role-select {
  padding: 5px 8px;
  border: 1px solid rgba(190, 235, 203, 0.28);
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  background: rgba(0, 0, 0, 0.28);
  color: rgba(226, 234, 229, 0.95);
  cursor: pointer;
  transition: all 0.2s;
  text-transform: capitalize;
  max-width: 100%;
}

.role-select:hover:not(:disabled) {
  border-color: rgba(74, 222, 128, 0.45);
}

.role-select:focus {
  outline: none;
  border-color: rgba(74, 222, 128, 0.45);
  box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.12);
  background: rgba(0, 0, 0, 0.32);
}

.role-select:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  background: rgba(0, 0, 0, 0.15);
}

.role-select option {
  color: #111827;
  background: #fff;
}

.action-buttons {
  display: flex;
  gap: 6px;
  justify-content: center;
  flex-wrap: wrap;
}

.approve-btn,
.reject-btn,
.delete-btn {
  padding: 6px 10px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-weight: 700;
  font-size: 11px;
  cursor: pointer;
  transition: all 0.2s;
}

.approve-btn {
  background: linear-gradient(135deg, #bbf7d0 0%, #86efac 100%);
  color: #14532d;
  border-color: rgba(22, 163, 74, 0.35);
}

.approve-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #86efac 0%, #4ade80 100%);
}

.reject-btn {
  background: linear-gradient(135deg, #fee2e2 0%, #fecaca 100%);
  color: #b91c1c;
  border-color: rgba(220, 38, 38, 0.28);
}

.reject-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #fecaca 0%, #fca5a5 100%);
}

.delete-btn {
  background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%);
  color: #92400e;
  border-color: rgba(217, 119, 6, 0.28);
}

.delete-btn:hover:not(:disabled) {
  background: linear-gradient(135deg, #fde68a 0%, #fcd34d 100%);
}

.approve-btn:disabled,
.reject-btn:disabled,
.delete-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Prevent focus/active click flash on action buttons */
.approve-btn:focus,
.reject-btn:focus,
.delete-btn:focus,
.approve-btn:active,
.reject-btn:active,
.delete-btn:active {
  outline: none;
  box-shadow: none;
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
    font-size: 12px;
  }

  th, td {
    padding: 8px;
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
</style>
