/**
 * Backdrop Theme Composable
 *
 * Manages the system-wide backdrop theme for the smart farming dashboard.
 * Farmers always use senior-friendly light mode; staff (admin, operations, etc.)
 * can switch between light and dark.
 */

import { ref, computed } from 'vue'

const themeMode = ref('dark') // 'light' | 'dark'

function normalizeMode(mode) {
  return mode === 'light' ? 'light' : 'dark'
}

function getStoredUserRole() {
  try {
    const raw = localStorage.getItem('currentUser')
    if (!raw) return null
    const user = JSON.parse(raw)
    return user?.role ?? null
  } catch {
    return null
  }
}

export function isFarmerRole(role = getStoredUserRole()) {
  return role === 'farmer'
}

export function canUseDarkMode(role = getStoredUserRole()) {
  return !isFarmerRole(role)
}

function updateFarmerBodyClass(role = getStoredUserRole()) {
  document.body.classList.toggle('farmer-user', isFarmerRole(role))
}

/**
 * Get the current theme mode
 */
export function useBackdropTheme() {
  const isDark = computed(() => themeMode.value !== 'light')
  const canToggleDarkMode = computed(() => canUseDarkMode())

  const backdropThemeClass = computed(() =>
    themeMode.value === 'light' ? 'backdrop-theme-light' : 'backdrop-theme-dark'
  )

  /**
   * Set the theme mode
   * @param {string} mode - 'light' | 'dark' (legacy 'standard' maps to dark)
   * @param {{ persist?: boolean }} options
   */
  const setTheme = (mode, { persist = true } = {}) => {
    const role = getStoredUserRole()
    const requested = normalizeMode(mode === 'standard' ? 'dark' : mode)
    const normalized = isFarmerRole(role) ? 'light' : requested
    if (!['light', 'dark'].includes(normalized)) return

    themeMode.value = normalized
    applyTheme(normalized)
    updateFarmerBodyClass(role)

    if (persist && canUseDarkMode(role)) {
      localStorage.setItem('backdrop-theme', normalized)
    }
  }

  /**
   * Toggle between light and dark modes (staff only)
   */
  const toggleTheme = () => {
    if (!canUseDarkMode()) return
    setTheme(themeMode.value === 'light' ? 'dark' : 'light')
  }

  /**
   * Apply theme to the document body
   */
  const applyTheme = (mode) => {
    const normalized = normalizeMode(mode)
    const role = getStoredUserRole()
    const effective = isFarmerRole(role) ? 'light' : normalized

    document.body.classList.remove(
      'backdrop-theme',
      'backdrop-theme-light',
      'backdrop-theme-dark',
      'glass-light',
      'glass-dark'
    )

    if (effective === 'light') {
      document.body.classList.add('backdrop-theme-light', 'glass-light')
    } else {
      document.body.classList.add('backdrop-theme-dark', 'glass-dark')
    }

    document.documentElement.setAttribute('data-theme', effective)
    document.documentElement.classList.toggle('dark', effective === 'dark')
    updateFarmerBodyClass(role)
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  const initTheme = () => {
    updateFarmerBodyClass()

    if (isFarmerRole()) {
      setTheme('light', { persist: false })
      return
    }

    const savedTheme = localStorage.getItem('backdrop-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
      return
    }
    if (savedTheme === 'standard') {
      setTheme('dark')
      return
    }

    if (window.matchMedia?.('(prefers-color-scheme: light)').matches) {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  /**
   * Re-apply theme when the logged-in user changes (login/logout/role switch)
   */
  const syncThemeForUser = (user) => {
    updateFarmerBodyClass(user?.role ?? null)

    if (!user) {
      const savedTheme = localStorage.getItem('backdrop-theme')
      if (savedTheme === 'light' || savedTheme === 'dark') {
        setTheme(savedTheme)
      } else {
        setTheme('dark')
      }
      return
    }

    if (isFarmerRole(user.role)) {
      setTheme('light', { persist: false })
      return
    }

    const savedTheme = localStorage.getItem('backdrop-theme')
    if (savedTheme === 'light' || savedTheme === 'dark') {
      setTheme(savedTheme)
    } else {
      setTheme('dark')
    }
  }

  /**
   * Watch for system theme changes
   */
  const watchSystemTheme = () => {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)')

      const handleDarkChange = (e) => {
        if (e.matches && !localStorage.getItem('backdrop-theme') && canUseDarkMode()) {
          setTheme('dark')
        }
      }

      const handleLightChange = (e) => {
        if (e.matches && !localStorage.getItem('backdrop-theme') && canUseDarkMode()) {
          setTheme('light')
        }
      }

      if (darkModeQuery.addEventListener) {
        darkModeQuery.addEventListener('change', handleDarkChange)
        lightModeQuery.addEventListener('change', handleLightChange)
      } else if (darkModeQuery.addListener) {
        darkModeQuery.addListener(handleDarkChange)
        lightModeQuery.addListener(handleLightChange)
      }
    }
  }

  return {
    themeMode: computed(() => themeMode.value),
    isDark,
    canToggleDarkMode,
    backdropThemeClass,
    setTheme,
    toggleTheme,
    applyTheme,
    initTheme,
    syncThemeForUser,
    watchSystemTheme
  }
}

/**
 * Apply backdrop to a specific element
 */
export function applyBackdropToElement(element, variant = 'dashboard', mode = null) {
  if (!element) return

  const role = getStoredUserRole()
  const currentMode = isFarmerRole(role) ? 'light' : (mode || themeMode.value)
  const variantClass = `backdrop-${variant}`
  const themeClass = currentMode === 'light'
    ? 'backdrop-theme-light'
    : 'backdrop-theme-dark'

  element.classList.remove(
    'backdrop-theme',
    'backdrop-theme-light',
    'backdrop-theme-dark',
    'backdrop-dashboard',
    'backdrop-login',
    'backdrop-sidebar',
    'backdrop-header',
    'backdrop-banner'
  )

  element.classList.add(themeClass, variantClass)
}

/**
 * Create a backdrop element and append it to a container
 */
export function createBackdropElement(container, variant = 'dashboard', mode = null) {
  if (!container) return null

  const backdrop = document.createElement('div')
  const role = getStoredUserRole()
  const currentMode = isFarmerRole(role) ? 'light' : (mode || themeMode.value)
  const variantClass = `backdrop-${variant}`
  const themeClass = currentMode === 'light'
    ? 'backdrop-theme-light'
    : 'backdrop-theme-dark'

  backdrop.classList.add(themeClass, variantClass)
  container.appendChild(backdrop)

  return backdrop
}
