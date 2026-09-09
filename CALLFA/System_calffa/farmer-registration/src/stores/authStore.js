// src/stores/authStore.js
import { defineStore } from 'pinia'
import {
  broadcastAuthEvent,
  getTokenSessionId,
  initAuthSessionGuard,
  isSameAccountAlreadyInBrowser
} from '../utils/authSession'
import { i18n } from '../i18n'

const API_BASE_URL = '/api/farmers'

let sessionGuardUnsub = null

export const useAuthStore = defineStore('auth', {
  state: () => ({
    currentUser: JSON.parse(localStorage.getItem('currentUser') || 'null'),
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null,
    sessionNotice: null,
    loggingOut: false
  }),
  actions: {
    /**
     * Cross-tab / session-replaced guard (call once from main.js).
     */
    initSessionGuard() {
      if (sessionGuardUnsub) return
      sessionGuardUnsub = initAuthSessionGuard({
        onRemoteLogout: (data) => {
          if (this.loggingOut) return
          if (!this.token && !this.currentUser) return
          this.clearLocalAuth()
          this.sessionNotice =
            data?.reason === 'session_replaced' || data?.type === 'session_replaced'
              ? i18n.global.t('auth.sessionReplaced')
              : null
          import('../router').then(({ router }) => {
            if (router.currentRoute.value.path !== '/login') {
              router.push('/login')
            }
          }).catch(() => {})
        },
        onRemoteLogin: () => {
          if (this.loggingOut) return
          // Another tab logged in — adopt shared localStorage session only if both exist
          try {
            const raw = localStorage.getItem('currentUser')
            const token = localStorage.getItem('token')
            if (!raw || !token) {
              this.clearLocalAuth()
              return
            }
            this.currentUser = JSON.parse(raw)
            this.token = token
          } catch {
            this.clearLocalAuth()
          }
        }
      })
    },

    clearLocalAuth() {
      this.currentUser = null
      this.token = null
      localStorage.removeItem('currentUser')
      localStorage.removeItem('token')
        import('./loanModuleStore').then(({ useLoanModuleStore }) => {
          useLoanModuleStore().reset()
        }).catch(() => {})
        import('./downPaymentStore').then(({ useDownPaymentStore }) => {
          useDownPaymentStore().reset()
        }).catch(() => {})
    },

    persistAuth(user, token) {
      if (user?.email && String(user.email).includes('@')) {
        try {
          localStorage.setItem(`calffa_google_email_${user.id}`, String(user.email).trim())
        } catch {
          /* ignore */
        }
      }
      this.currentUser = user
      this.token = token
      localStorage.setItem('currentUser', JSON.stringify(user))
      localStorage.setItem('token', token)
      broadcastAuthEvent('login', {
        userId: user?.id,
        sessionId: getTokenSessionId(token)
      })
    },

    /**
     * Force logout when API reports this account is active elsewhere.
     */
    handleSessionReplaced(message) {
      if (this.loggingOut || (!this.token && !this.currentUser)) return
      this.clearLocalAuth()
      this.sessionNotice =
        message || i18n.global.t('auth.sessionReplaced')
      broadcastAuthEvent('session_replaced', { reason: 'session_replaced' })
      import('../router').then(({ router }) => {
        if (router.currentRoute.value.path !== '/login') {
          router.push('/login')
        }
      }).catch(() => {})
    },

    async login(referenceNumber, password) {
      this.loading = true
      this.error = null
      this.sessionNotice = null

      try {
        // Same account already active in this browser — do not create a duplicate session
        if (this.isLoggedIn() && this.currentUser?.reference_number === referenceNumber) {
          this.loading = false
          return {
            success: false,
            error: i18n.global.t('auth.alreadySignedInHere')
          }
        }

        const response = await fetch(`${API_BASE_URL}/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            reference_number: referenceNumber,
            password: password
          })
        })

        if (!response.ok) {
          const errorBody = await response.json().catch(() => null)
          const errorText = errorBody?.message || (await response.text().catch(() => null))
          throw new Error(errorText || 'Login failed')
        }

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || 'Login failed')
        }

        if (isSameAccountAlreadyInBrowser(data.farmer?.id) && this.token === data.token) {
          this.loading = false
          return {
            success: false,
            error: i18n.global.t('auth.alreadySignedInHere')
          }
        }

        const user = { ...data.farmer }
        if (data.barangay) {
          user.barangay_id = data.barangay.id
          user.barangay_name = data.barangay.name
          user.barangay_location = data.barangay.location
        }
        delete user.password_hash
        this.persistAuth(user, data.token)

        import('./loanModuleStore').then(({ useLoanModuleStore }) => {
          useLoanModuleStore().fetchStatus()
        })
        import('./downPaymentStore').then(({ useDownPaymentStore }) => {
          useDownPaymentStore().fetchStatus()
        })

        this.loading = false
        const warning = !this.currentUser.is_approved && this.currentUser.status === 'pending'
          ? 'Your account is pending approval. Some features may be limited.'
          : null

        return { success: true, user: this.currentUser, warning }
      } catch (error) {
        this.error = error.message
        this.loading = false
        if (error.message.includes('fetch') || error.message.includes('Failed to fetch')) {
          return {
            success: false,
            error: 'Cannot connect to server. Please make sure the backend is running on http://localhost:5000'
          }
        }
        return { success: false, error: error.message }
      }
    },

    async logout() {
      if (this.loggingOut) return
      this.loggingOut = true
      const token = this.token
      // Clear local auth first so UI never flashes a placeholder "test" user
      this.clearLocalAuth()
      broadcastAuthEvent('logout')
      try {
        if (token) {
          await fetch(`${API_BASE_URL}/logout`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          })
        }
      } catch {
        /* still cleared locally */
      } finally {
        this.loggingOut = false
      }
    },

    isLoggedIn() {
      return this.currentUser !== null
    },

    /**
     * Google OAuth Login Handler
     */
    async googleLogin(googleId, farmerId, email) {
      this.loading = true
      this.error = null
      this.sessionNotice = null

      try {
        if (this.isLoggedIn() && Number(this.currentUser?.id) === Number(farmerId)) {
          this.loading = false
          return {
            success: false,
            error: i18n.global.t('auth.alreadySignedInHere')
          }
        }

        const response = await fetch('/api/auth/google/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            google_id: googleId,
            farmerId: farmerId,
            email: email || undefined
          })
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || 'Google login failed')
        }

        const user = { ...data.farmer }
        if (data.barangay) {
          user.barangay_id = data.barangay.id
          user.barangay_name = data.barangay.name
          user.barangay_location = data.barangay.location
        }
        delete user.password_hash

        this.persistAuth(user, data.token)

        import('./loanModuleStore').then(({ useLoanModuleStore }) => {
          useLoanModuleStore().fetchStatus()
        })
        import('./downPaymentStore').then(({ useDownPaymentStore }) => {
          useDownPaymentStore().fetchStatus()
        })

        this.loading = false
        return { success: true, user: this.currentUser }
      } catch (error) {
        this.error = error.message
        this.loading = false
        return { success: false, error: error.message }
      }
    },

    async verifyGoogleToken(token) {
      try {
        const response = await fetch('/api/auth/google/verify-token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ token })
        })

        const data = await response.json()
        return data
      } catch (error) {
        return {
          success: false,
          error: error.message || 'Token verification failed'
        }
      }
    },

    async googleRegister(registrationData) {
      this.loading = true
      this.error = null

      try {
        const response = await fetch('/api/auth/google/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registrationData)
        })

        const data = await response.json()

        if (!data.success) {
          throw new Error(data.message || 'Registration failed')
        }

        this.loading = false
        return { success: true, farmerId: data.farmerId }
      } catch (error) {
        this.error = error.message
        this.loading = false
        return { success: false, error: error.message }
      }
    },

    async completeGooglePasswordReset({ resetToken, password, confirmPassword }) {
      this.loading = true
      this.error = null

      try {
        const response = await fetch('/api/auth/google/reset-password', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resetToken, password, confirmPassword })
        })

        const raw = await response.text()
        let data = {}
        if (raw) {
          try {
            data = JSON.parse(raw)
          } catch {
            throw new Error('Unable to update password. Please try again.')
          }
        }

        if (!response.ok || !data.success) {
          throw new Error(data.message || 'Unable to update password. Please try again.')
        }

        this.loading = false
        return { success: true, message: data.message }
      } catch (error) {
        this.error = error.message
        this.loading = false
        return { success: false, error: error.message }
      }
    }
  }
})
