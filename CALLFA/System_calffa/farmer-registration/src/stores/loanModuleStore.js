import { defineStore } from 'pinia'
import { useAuthStore } from './authStore'

export const LOAN_MODULE_OFF_MESSAGE = 'Loaning is temporarily off.'

export const useLoanModuleStore = defineStore('loanModule', {
  state: () => ({
    enabled: true,
    barangayId: null,
    loaded: false,
    loading: false,
    error: null
  }),

  getters: {
    isActive: (state) => state.enabled,
    offMessage: () => LOAN_MODULE_OFF_MESSAGE
  },

  actions: {
    reset() {
      this.enabled = true
      this.barangayId = null
      this.loaded = false
      this.loading = false
      this.error = null
    },

    async fetchStatus() {
      const auth = useAuthStore()
      if (!auth.token) {
        this.reset()
        return
      }

      if (auth.currentUser?.role === 'admin') {
        this.enabled = true
        this.barangayId = null
        this.loaded = true
        this.error = null
        return
      }

      this.loading = true
      this.error = null

      try {
        const response = await fetch('/api/loans/module-status', {
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          }
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to load loan module status')
        }

        this.enabled = data.enabled !== false
        this.barangayId = data.barangay_id ?? auth.currentUser?.barangay_id ?? null
        this.loaded = true
      } catch (err) {
        this.error = err.message
        this.enabled = true
        this.loaded = true
      } finally {
        this.loading = false
      }
    },

    async setEnabled(enabled) {
      const auth = useAuthStore()
      if (auth.currentUser?.role !== 'president') {
        throw new Error('Only the President can change the loan module status.')
      }

      this.loading = true
      this.error = null

      try {
        const response = await fetch('/api/loans/module-status', {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ enabled: Boolean(enabled) })
        })

        const data = await response.json().catch(() => ({}))
        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Failed to update loan module status')
        }

        this.enabled = data.enabled !== false
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
