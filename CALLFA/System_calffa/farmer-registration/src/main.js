// src/main.js
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { router } from './router'
import { i18n } from './i18n'
import './style.css'
import './assets/backdrop-theme.css'
import './styles/glass-unified-theme.css'
import './styles/page-hero-header.css'
import './styles/light-mode-senior.css'
import './styles/dark-mode-farm.css'
import './styles/table-action-buttons.css'
import './styles/compact-data-table.css'
import './styles/dues-payments-ui.css'
import './styles/transaction-detail.css'
import './styles/farmers-table-theme.css'
import './styles/share-capital-withdrawal-ui.css'
import './styles/seed-fertilizer-plan-ui.css'
import './styles/farmer-income-hub-layout.css'
import './styles/financial-overview-ui.css'
import './styles/barangays-ui.css'
import './styles/machinery-management-ui.css'
import './styles/members-summary-ui.css'
import './styles/machinery-approval-ui.css'
import './styles/machinery-booking-ui.css'






const app = createApp(App)
const pinia = createPinia()
app.use(pinia)
app.use(router)
app.use(i18n)

// Single-account session: sync tabs + kick out replaced sessions
import { useAuthStore } from './stores/authStore'
import { detectSessionReplaced } from './utils/authSession'

const authStore = useAuthStore()
authStore.initSessionGuard()

const originalFetch = window.fetch.bind(window)
window.fetch = async (...args) => {
  const response = await originalFetch(...args)
  try {
    // Ignore session-replaced handling while intentionally logging out
    if (!authStore.loggingOut && authStore.token) {
      const replaced = await detectSessionReplaced(response)
      if (replaced) {
        authStore.handleSessionReplaced(replaced.message)
      }
    }
  } catch {
    /* ignore */
  }
  return response
}

app.mount('#app')
