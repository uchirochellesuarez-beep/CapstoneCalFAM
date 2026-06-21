// src/stores/machineryStore.js
import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'

const API_BASE_URL = '/api/machinery'
const API_BASE_BARANGAYS = '/api/barangays'

function authJsonHeaders() {
  const authStore = useAuthStore()
  const token = authStore.token || localStorage.getItem('token')
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers.Authorization = `Bearer ${token}`
  return headers
}

function authHeadersOnly() {
  const authStore = useAuthStore()
  const token = authStore.token || localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

export const useMachineryStore = defineStore('machinery', {
  state: () => ({
    inventory: [],
    bookings: [],
    operators: [],
    stats: null,
    barangays: [],
    loading: false,
    error: null,
    selectedMachinery: null,
    selectedBooking: null,
    machineryTypes: []
  }),

  getters: {
    availableMachinery: (state) => state.inventory.filter(m => m.status === 'Available'),
    pendingBookings: (state) => state.bookings.filter(b => b.status === 'Pending'),
    approvedBookings: (state) => state.bookings.filter(b => b.status === 'Approved'),
    myBookings: (state) => (farmerId) => state.bookings.filter(b => b.farmer_id === farmerId),
    machineryByType: (state) => (type) => state.inventory.filter(m => m.machinery_type === type),
    distinctMachineryTypes: (state) => {
      const types = [...new Set(state.inventory.map(m => m.machinery_type))]
      return types.filter(Boolean).sort()
    }
  },

  actions: {
    // ========================================
    // INVENTORY ACTIONS (Admin)
    // ========================================
    async fetchInventory(filters = {}) {
      this.loading = true
      this.error = null
      
      try {
        const params = new URLSearchParams(filters)
        
        // Get token from authStore for barangay-filtered views
        const authStore = useAuthStore()
        const token = authStore.token
        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch(`${API_BASE_URL}/inventory?${params}`, {
          headers
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch machinery inventory')
        }
        
        const data = await response.json()
        this.inventory = data.inventory
        return data.inventory
      } catch (error) {
        this.error = error.message
        console.error('Error fetching inventory:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async getMachineryDetails(id) {
      this.loading = true
      this.error = null
      
      try {
        // Get token from authStore
        const authStore = useAuthStore()
        const token = authStore.token
        const headers = {}
        if (token) {
          headers['Authorization'] = `Bearer ${token}`
        }
        
        const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
          headers
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch machinery details')
        }
        
        const data = await response.json()
        this.selectedMachinery = { ...data.machinery, operators: data.operators }
        return data
      } catch (error) {
        this.error = error.message
        console.error('Error fetching machinery details:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async addMachinery(machineryData) {
      this.loading = true
      this.error = null
      
      try {
        console.log('🔄 Sending add machinery request:', machineryData)
        
        // Get token from authStore
        const authStore = useAuthStore()
        const token = authStore.token
        console.log('🔑 Token from authStore:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN FOUND')
        console.log('🔑 Token exists:', !!token)
        console.log('🔑 Token length:', token ? token.length : 0)
        
        if (!token) {
          throw new Error('Authorization token required. Please login again.')
        }
        
        const response = await fetch(`${API_BASE_URL}/inventory`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(machineryData)
        })
        
        console.log('📡 Response status:', response.status)
        
        const data = await response.json()
        console.log('📦 Response data:', data)
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to add machinery')
        }
        
        await this.fetchInventory() // Refresh inventory
        return data
      } catch (error) {
        this.error = error.message
        console.error('❌ Error adding machinery:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async updateMachinery(id, machineryData) {
      this.loading = true
      this.error = null
      
      try {
        // Get token from authStore
        const authStore = useAuthStore()
        const token = authStore.token
        console.log('🔑 Update - Token from authStore:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN FOUND')
        
        if (!token) {
          throw new Error('Authorization token required. Please login again.')
        }
        
        const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(machineryData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to update machinery')
        }
        
        const data = await response.json()
        await this.fetchInventory() // Refresh inventory
        return data
      } catch (error) {
        this.error = error.message
        console.error('Error updating machinery:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async deleteMachinery(id) {
      this.loading = true
      this.error = null
      
      try {
        // Get token from authStore
        const authStore = useAuthStore()
        const token = authStore.token
        console.log('🔑 Delete - Token from authStore:', token ? `${token.substring(0, 20)}...` : 'NO TOKEN FOUND')
        
        if (!token) {
          throw new Error('Authorization token required. Please login again.')
        }
        
        const response = await fetch(`${API_BASE_URL}/inventory/${id}`, {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to delete machinery')
        }
        
        await this.fetchInventory() // Refresh inventory
        return true
      } catch (error) {
        this.error = error.message
        console.error('Error deleting machinery:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // ========================================
    // OPERATORS ACTIONS
    // ========================================
    async fetchOperators(filters = {}) {
      this.loading = true
      this.error = null
      
      try {
        const params = new URLSearchParams(filters)
        const response = await fetch(`${API_BASE_URL}/operators?${params}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch operators')
        }
        
        const data = await response.json()
        this.operators = data.operators
        return data.operators
      } catch (error) {
        this.error = error.message
        console.error('Error fetching operators:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async assignOperator(operatorData) {
      this.loading = true
      this.error = null
      
      try {
        const authStore = useAuthStore()
        const token = authStore.token
        const headers = { 'Content-Type': 'application/json' }
        if (token) headers['Authorization'] = `Bearer ${token}`

        const response = await fetch(`${API_BASE_URL}/operators`, {
          method: 'POST',
          headers,
          body: JSON.stringify(operatorData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to assign operator')
        }
        
        const data = await response.json()
        await Promise.all([this.fetchOperators(), this.fetchInventory()])
        return data
      } catch (error) {
        this.error = error.message
        console.error('Error assigning operator:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async assignOperatorToMachinery(machineryId, { operator_id, assigned_by, assignment_date }) {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const token = authStore.token
        if (!token) throw new Error('Authorization required')

        const response = await fetch(`${API_BASE_URL}/inventory/${machineryId}/assign-operator`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ operator_id, assigned_by, assignment_date })
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Failed to assign operator')

        await this.fetchInventory()
        return data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchEligibleOperators(barangayId = null) {
      try {
        const authStore = useAuthStore()
        const token = authStore.token
        const params = new URLSearchParams()
        if (barangayId) params.set('barangay_id', barangayId)

        const response = await fetch(`${API_BASE_URL}/operators/eligible?${params}`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {}
        })

        if (!response.ok) throw new Error('Failed to fetch eligible operators')
        const data = await response.json()
        return data.operators || []
      } catch (error) {
        console.error('Error fetching eligible operators:', error)
        throw error
      }
    },

    async fetchOperatorDashboard() {
      this.loading = true
      this.error = null

      try {
        const authStore = useAuthStore()
        const token = authStore.token
        if (!token) throw new Error('Authorization required')

        const response = await fetch('/api/operator-income/dashboard', {
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Failed to load operator dashboard')
        return data
      } catch (error) {
        this.error = error.message
        throw error
      } finally {
        this.loading = false
      }
    },

    async fetchOperatorIncome(filters = {}) {
      try {
        const authStore = useAuthStore()
        const token = authStore.token
        if (!token) throw new Error('Authorization required')

        const params = new URLSearchParams(filters)
        const response = await fetch(`/api/operator-income?${params}`, {
          headers: { Authorization: `Bearer ${token}` }
        })

        const data = await response.json()
        if (!response.ok) throw new Error(data.message || 'Failed to fetch operator income')
        return data
      } catch (error) {
        console.error('Error fetching operator income:', error)
        throw error
      }
    },

    async updateOperatorStatus(id, status) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/operators/${id}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ status })
        })
        
        if (!response.ok) {
          throw new Error('Failed to update operator status')
        }
        
        await this.fetchOperators() // Refresh operators
        return true
      } catch (error) {
        this.error = error.message
        console.error('Error updating operator status:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async removeOperator(id) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/operators/${id}`, {
          method: 'DELETE'
        })
        
        if (!response.ok) {
          throw new Error('Failed to remove operator')
        }
        
        await this.fetchOperators() // Refresh operators
        return true
      } catch (error) {
        this.error = error.message
        console.error('Error removing operator:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // ========================================
    // BOOKINGS ACTIONS
    // ========================================
    async fetchBookings(filters = {}) {
      this.loading = true
      this.error = null
      
      try {
        const params = new URLSearchParams(filters)
        const response = await fetch(`${API_BASE_URL}/bookings?${params}`, {
          headers: authHeadersOnly()
        })
        
        if (!response.ok) {
          throw new Error('Failed to fetch bookings')
        }
        
        const data = await response.json()
        this.bookings = data.bookings
        return data.bookings
      } catch (error) {
        this.error = error.message
        console.error('Error fetching bookings:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async getBookingDetails(id) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}`, { headers: authHeadersOnly() })
        
        if (!response.ok) {
          throw new Error('Failed to fetch booking details')
        }
        
        const data = await response.json()
        this.selectedBooking = data.booking
        return data.booking
      } catch (error) {
        this.error = error.message
        console.error('Error fetching booking details:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async createBooking(bookingData) {
      this.loading = true
      this.error = null
      
      try {
        console.log('🔄 Store sending booking request:', JSON.stringify(bookingData, null, 2))
        
        const response = await fetch(`${API_BASE_URL}/bookings`, {
          method: 'POST',
          headers: authJsonHeaders(),
          credentials: 'include',
          body: JSON.stringify(bookingData)
        })
        
        console.log('📡 Booking response status:', response.status)
        
        const data = await response.json()
        console.log('📦 Booking response data:', data)
        
        if (!response.ok) {
          throw new Error(data.message || 'Failed to create booking')
        }
        
        await this.fetchBookings() // Refresh bookings
        return data
      } catch (error) {
        this.error = error.message
        console.error('❌ Error creating booking:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async approveBooking(id, approvalData) {
      this.loading = true
      this.error = null
      
      try {
        // Approval only - no payment involved
        // Payment is handled separately by Treasurer via recordBookingPayment()
        const payload = {
          approved_by: approvalData.approved_by
        }

        const response = await fetch(`${API_BASE_URL}/bookings/${id}/approve`, {
          method: 'PUT',
          headers: authJsonHeaders(),
          body: JSON.stringify(payload)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to approve booking')
        }
        
        const data = await response.json()
        await this.fetchBookings() // Refresh bookings
        return data
      } catch (error) {
        this.error = error.message
        console.error('Error approving booking:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async rejectBooking(id, approvedBy, rejectionReason) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}/reject`, {
          method: 'PUT',
          headers: authJsonHeaders(),
          body: JSON.stringify({ 
            approved_by: approvedBy,
            rejection_reason: rejectionReason 
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to reject booking')
        }
        
        const data = await response.json()
        await this.fetchBookings() // Refresh bookings
        return data
      } catch (error) {
        this.error = error.message
        console.error('Error rejecting booking:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async completeBooking(id, statusAction = 'completed', notes = null) {
      this.loading = true
      this.error = null
      
      try {
        const authStore = useAuthStore()
        const operatorId = authStore.currentUser?.id

        if (!operatorId) {
          throw new Error('You must be logged in as an operator to update booking status')
        }

        const response = await fetch(`${API_BASE_URL}/bookings/${id}/complete`, {
          method: 'PUT',
          headers: authJsonHeaders(),
          body: JSON.stringify({
            status_action: statusAction,
            operator_id: operatorId,
            operational_notes: notes || undefined
          })
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to update booking status')
        }
        
        await this.fetchBookings() // Refresh bookings
        return true
      } catch (error) {
        this.error = error.message
        console.error('Error updating booking status:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async markBookingIncomplete(id, notes = null) {
      return this.completeBooking(id, 'incomplete', notes)
    },

    async submitDownPayment(bookingId, formData) {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/submit-down-payment`, {
        method: 'POST',
        headers: authHeadersOnly(),
        body: formData
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to submit down payment')
      await this.fetchBookings()
      return data
    },

    async confirmBooking(id, confirmedBy) {
      const response = await fetch(`${API_BASE_URL}/bookings/${id}/confirm-booking`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify({ confirmed_by: confirmedBy })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to confirm booking')
      await this.fetchBookings()
      return data
    },

    async verifyDownPayment(id, payload) {
      const response = await fetch(`${API_BASE_URL}/bookings/${id}/verify-down-payment`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to verify payment')
      return data
    },

    async rejectDownPayment(id, payload) {
      const response = await fetch(`${API_BASE_URL}/bookings/${id}/reject-down-payment`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to reject payment')
      return data
    },

    async fetchPendingDownPayments(_userId, barangayId = null) {
      const params = new URLSearchParams()
      if (barangayId) params.set('barangay_id', String(barangayId))
      const response = await fetch(`${API_BASE_URL}/bookings/pending-down-payments?${params}`, {
        headers: authHeadersOnly()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to load pending payments')
      return data.bookings || []
    },

    async fetchGcashQr() {
      const response = await fetch(`${API_BASE_URL}/gcash-qr`)
      const data = await response.json()
      if (!response.ok) throw new Error('Failed to load GCash QR')
      return data
    },

    async verifyFinalPayment(id, payload) {
      const response = await fetch(`${API_BASE_URL}/bookings/${id}/verify-final-payment`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to verify final payment')
      await this.fetchBookings()
      return data
    },

    async submitBalancePayment(bookingId, formData) {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/submit-balance-payment`, {
        method: 'POST',
        headers: authHeadersOnly(),
        body: formData
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to submit balance payment')
      await this.fetchBookings()
      return data
    },

    async fetchPendingBalancePayments(_userId, barangayId = null) {
      const params = new URLSearchParams()
      if (barangayId) params.set('barangay_id', String(barangayId))
      const response = await fetch(`${API_BASE_URL}/bookings/pending-balance-payments?${params}`, {
        headers: authHeadersOnly()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to load pending balance payments')
      return data.submissions || []
    },

    async verifyBalancePaymentSubmission(submissionId, payload) {
      const response = await fetch(`${API_BASE_URL}/bookings/balance-submissions/${submissionId}/verify`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to verify payment')
      return data
    },

    async rejectBalancePaymentSubmission(submissionId, payload) {
      const response = await fetch(`${API_BASE_URL}/bookings/balance-submissions/${submissionId}/reject`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to reject payment')
      return data
    },

    async fetchRefundRequests(_userId, status = 'active', barangayId = null) {
      const params = new URLSearchParams({ status })
      if (barangayId) params.set('barangay_id', String(barangayId))
      const response = await fetch(`${API_BASE_URL}/bookings/refund-requests?${params}`, {
        headers: authHeadersOnly()
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to load refund requests')
      return data.refunds || []
    },

    async requestRefund(bookingId, payload) {
      const response = await fetch(`${API_BASE_URL}/bookings/${bookingId}/request-refund`, {
        method: 'POST',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to submit refund request')
      await this.fetchBookings()
      return data
    },

    async reviewRefund(refundId, payload) {
      const response = await fetch(`${API_BASE_URL}/refunds/${refundId}/review`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to review refund')
      return data
    },

    async processRefund(refundId, payload) {
      const response = await fetch(`${API_BASE_URL}/refunds/${refundId}/process`, {
        method: 'PUT',
        headers: authJsonHeaders(),
        body: JSON.stringify(payload)
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Failed to process refund')
      return data
    },

    async fetchReceipt(receiptNumber) {
      const authStore = useAuthStore()
      const token = authStore.token || localStorage.getItem('token')
      const response = await fetch(`/api/receipts/${encodeURIComponent(receiptNumber)}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.message || 'Receipt not found')
      return data.receipt
    },

    async recordBookingPayment(id, paymentData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}/payment`, {
          method: 'POST',
          headers: authJsonHeaders(),
          body: JSON.stringify(paymentData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to record payment')
        }
        
        const data = await response.json()
        await this.fetchBookings() // Refresh bookings
        return data
      } catch (error) {
        this.error = error.message
        console.error('Error recording payment:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async cancelBooking(id, farmerId) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}/cancel`, {
          method: 'PUT',
          headers: authJsonHeaders(),
          body: JSON.stringify({ farmer_id: farmerId })
        })
        
        if (!response.ok) {
          throw new Error('Failed to cancel booking')
        }
        
        await this.fetchBookings() // Refresh bookings
        return true
      } catch (error) {
        this.error = error.message
        console.error('Error cancelling booking:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    async editBooking(id, bookingData) {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/bookings/${id}/edit`, {
          method: 'PUT',
          headers: authJsonHeaders(),
          body: JSON.stringify(bookingData)
        })
        
        if (!response.ok) {
          const errorData = await response.json()
          throw new Error(errorData.message || 'Failed to update booking')
        }
        
        const updatedBooking = await response.json()
        await this.fetchBookings() // Refresh bookings
        return updatedBooking
      } catch (error) {
        this.error = error.message
        console.error('Error updating booking:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // ========================================
    // BARANGAY ACTIONS
    // ========================================
    async fetchBarangays() {
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_BARANGAYS}`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch barangays')
        }
        
        const data = await response.json()
        this.barangays = data.barangays || []
        return data.barangays
      } catch (error) {
        this.error = error.message
        console.error('Error fetching barangays:', error)
        throw error
      }
    },

    // ========================================
    // STATISTICS ACTIONS
    // ========================================
    async fetchStats() {
      this.loading = true
      this.error = null
      
      try {
        const response = await fetch(`${API_BASE_URL}/stats`)
        
        if (!response.ok) {
          throw new Error('Failed to fetch statistics')
        }
        
        const data = await response.json()
        this.stats = data.stats
        return data.stats
      } catch (error) {
        this.error = error.message
        console.error('Error fetching stats:', error)
        throw error
      } finally {
        this.loading = false
      }
    },

    // ========================================
    // UTILITY ACTIONS
    // ========================================
    clearError() {
      this.error = null
    },

    clearSelection() {
      this.selectedMachinery = null
      this.selectedBooking = null
    }
  }
})
