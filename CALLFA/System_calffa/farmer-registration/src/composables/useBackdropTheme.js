/**
 * Backdrop Theme Composable
 * 
 * Manages the system-wide backdrop theme for the smart farming dashboard.
 * Supports light mode, dark mode, and standard mode switching.
 */

import { ref, computed } from 'vue'

const themeMode = ref('dark') // 'light' | 'dark'

function normalizeMode(mode) {
  return mode === 'light' ? 'light' : 'dark'
}

/**
 * Get the current theme mode
 */
export function useBackdropTheme() {
  const isDark = computed(() => themeMode.value !== 'light')

  const backdropThemeClass = computed(() =>
    themeMode.value === 'light' ? 'backdrop-theme-light' : 'backdrop-theme-dark'
  )

  /**
   * Set the theme mode
   * @param {string} mode - 'light' | 'dark' (legacy 'standard' maps to dark)
   */
  const setTheme = (mode) => {
    const normalized = normalizeMode(mode === 'standard' ? 'dark' : mode)
    if (!['light', 'dark'].includes(normalized)) return

    themeMode.value = normalized
    applyTheme(normalized)
    localStorage.setItem('backdrop-theme', normalized)
  }

  /**
   * Toggle between light and dark modes
   */
  const toggleTheme = () => {
    setTheme(themeMode.value === 'light' ? 'dark' : 'light')
  }

  /**
   * Apply theme to the document body
   */
  const applyTheme = (mode) => {
    const normalized = normalizeMode(mode)

    document.body.classList.remove(
      'backdrop-theme',
      'backdrop-theme-light',
      'backdrop-theme-dark',
      'glass-light',
      'glass-dark'
    )

    if (normalized === 'light') {
      document.body.classList.add('backdrop-theme-light', 'glass-light')
    } else {
      document.body.classList.add('backdrop-theme-dark', 'glass-dark')
    }

    document.documentElement.setAttribute('data-theme', normalized)
    document.documentElement.classList.toggle('dark', normalized === 'dark')
  }

  /**
   * Initialize theme from localStorage or system preference
   */
  const initTheme = () => {
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
   * Watch for system theme changes
   */
  const watchSystemTheme = () => {
    if (window.matchMedia) {
      const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const lightModeQuery = window.matchMedia('(prefers-color-scheme: light)')

      const handleDarkChange = (e) => {
        if (e.matches && !localStorage.getItem('backdrop-theme')) {
          setTheme('dark')
        }
      }

      const handleLightChange = (e) => {
        if (e.matches && !localStorage.getItem('backdrop-theme')) {
          setTheme('light')
        }
      }

      // Use addEventListener if available, otherwise use addListener for older browsers
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
    backdropThemeClass,
    setTheme,
    toggleTheme,
    applyTheme,
    initTheme,
    watchSystemTheme
  }
}

/**
 * Apply backdrop to a specific element
 * @param {HTMLElement} element - The element to apply backdrop to
 * @param {string} variant - 'dashboard' | 'login' | 'sidebar' | 'header' | 'banner'
 * @param {string} mode - 'standard' | 'light' | 'dark'
 */
export function applyBackdropToElement(element, variant = 'dashboard', mode = null) {
  if (!element) return

  const currentMode = mode || themeMode.value
  const variantClass = `backdrop-${variant}`
  const themeClass = currentMode === 'light'
    ? 'backdrop-theme-light'
    : 'backdrop-theme-dark'

  // Remove existing backdrop classes
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

  // Add new classes
  element.classList.add(themeClass, variantClass)
}

/**
 * Create a backdrop element and append it to a container
 * @param {HTMLElement} container - Container element
 * @param {string} variant - 'dashboard' | 'login' | 'sidebar' | 'header' | 'banner'
 * @param {string} mode - 'standard' | 'light' | 'dark'
 * @returns {HTMLElement} The created backdrop element
 */
export function createBackdropElement(container, variant = 'dashboard', mode = null) {
  if (!container) return null

  const backdrop = document.createElement('div')
  const currentMode = mode || themeMode.value
  const variantClass = `backdrop-${variant}`
  const themeClass = currentMode === 'light'
    ? 'backdrop-theme-light'
    : 'backdrop-theme-dark'

  backdrop.classList.add(themeClass, variantClass)
  container.appendChild(backdrop)

  return backdrop
}

