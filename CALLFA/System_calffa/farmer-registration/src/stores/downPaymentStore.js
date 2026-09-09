import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'

export const useDownPaymentStore = defineStore('machineryDownPayment', {
  state: () => ({
    enabled: false,
    percent: null,
    barangayId: null,
    loaded: false,
    loading: false,
    error: null
  }),

  getters: {
    isActive: (state) => Boolean(state.enabled && Number(state.percent) > 0),
    percentLabel: (state) => {
      const n = Number(state.percent)
      if (!Number.isFinite(n) || n <= 0) return null
      return Number.isInteger(n) ? String(n) : String(n)
    }
  },

  actions: {
    reset() {
      this.enabled = false
      this.percent = null
      this.barangayId = null
      this.loaded = false
      this.loading = false
      this.error = null
    },

    async fetchStatus(barangayId = null) {
      const auth = useAuthStore()
      if (!auth.token) {
        this.reset()
        return
      }

      this.loading = true
      this.error = null

      try {
        const params = new URLSearchParams()
        if (barangayId) params.set('barangay_id', String(barangayId))
        const qs = params.toString()
        const response = await fetch(`/api/machinery/down-payment-settings${qs ? `?${qs}` : ''}`, {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load down payment settings')
        }

        this.enabled = data.enabled === true
        this.percent = data.percent != null ? Number(data.percent) : null
        this.barangayId = data.barangay_id ?? auth.currentUser?.barangay_id ?? null
        this.loaded = true
      } catch (err) {
        this.error = err.message
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    async saveSettings({ enabled, percent }) {
      const auth = useAuthStore()
      if (auth.currentUser?.role !== 'president') {
        throw new Error('Only the President can change machinery down payment settings.')
      }

      this.loading = true
      this.error = null

      try {
        const body = {}
        if (typeof enabled === 'boolean') body.enabled = enabled
        if (percent !== undefined) body.percent = percent

        const response = await fetch('/api/machinery/down-payment-settings', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(body)
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to update down payment settings')
        }

        this.enabled = data.enabled === true
        this.percent = data.percent != null ? Number(data.percent) : null
        this.barangayId = data.barangay_id ?? this.barangayId
        this.loaded = true
        return data
      } catch (err) {
        this.error = err.message
        throw err
      } finally {
        this.loading = false
      }
    }
  }
})
