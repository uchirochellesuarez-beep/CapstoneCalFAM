import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'

const API = '/api/gcash-payments'

function authHeaders(json = false) {
  const authStore = useAuthStore()
  const token = authStore.token || localStorage.getItem('token')
  const headers = {}
  if (token) headers.Authorization = `Bearer ${token}`
  if (json) headers['Content-Type'] = 'application/json'
  return headers
}

async function readJson(response) {
  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.success === false) {
    const err = new Error(data.message || 'Request failed')
    err.status = response.status
    throw err
  }
  return data
}

export async function fetchGcashSubmissionById(submissionId) {
  const id = parseInt(submissionId, 10)
  if (!id) return null
  const data = await readJson(await fetch(`${API}/submissions/${id}`, { headers: authHeaders() }))
  return data.submission || null
}

export const useGcashPaymentStore = defineStore('gcashPayment', {
  state: () => ({
    qr: null,
    pending: [],
    loading: false,
    error: null
  }),

  actions: {
    async fetchQr() {
      const data = await readJson(await fetch(`${API}/qr`, { headers: authHeaders() }))
      this.qr = data.qr || null
      return this.qr
    },

    async uploadQr(file) {
      const body = new FormData()
      body.append('qr_image', file)
      const data = await readJson(await fetch(`${API}/qr`, {
        method: 'POST',
        headers: authHeaders(),
        body
      }))
      this.qr = data.qr || null
      return this.qr
    },

    async deleteQr() {
      const data = await readJson(await fetch(`${API}/qr`, {
        method: 'DELETE',
        headers: authHeaders()
      }))
      this.qr = null
      return data
    },

    async fetchPending() {
      const data = await readJson(await fetch(`${API}/pending`, { headers: authHeaders() }))
      this.pending = data.submissions || []
      return this.pending
    },

    async fetchHistory() {
      const data = await readJson(await fetch(`${API}/history`, { headers: authHeaders() }))
      return data.submissions || []
    },

    async fetchLookup(transactionType, referenceId) {
      const params = new URLSearchParams({
        transaction_type: transactionType === 'loan' ? 'loan' : 'machinery',
        reference_id: String(referenceId)
      })
      const data = await readJson(await fetch(`${API}/lookup?${params}`, { headers: authHeaders() }))
      return data.submission || null
    },

    async fetchById(submissionId) {
      return fetchGcashSubmissionById(submissionId)
    },

    async fetchMine(transactionType, referenceId) {
      const params = new URLSearchParams({
        transaction_type: transactionType,
        reference_id: String(referenceId)
      })
      const data = await readJson(await fetch(`${API}/mine?${params}`, { headers: authHeaders() }))
      return data.submissions || []
    },

    async submitProof({ transactionType, referenceId, paymentDate, file }) {
      const body = new FormData()
      body.append('transaction_type', transactionType)
      body.append('reference_id', String(referenceId))
      if (paymentDate) body.append('payment_date', paymentDate)
      body.append('payment_proof', file)
      return readJson(await fetch(`${API}/submit`, {
        method: 'POST',
        headers: authHeaders(),
        body
      }))
    },

    async confirmPayment(id, amountPaid, remarks) {
      return readJson(await fetch(`${API}/${id}/confirm`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ amount_paid: amountPaid, remarks })
      }))
    },

    async rejectPayment(id, reason) {
      return readJson(await fetch(`${API}/${id}/reject`, {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ reason })
      }))
    }
  }
})
