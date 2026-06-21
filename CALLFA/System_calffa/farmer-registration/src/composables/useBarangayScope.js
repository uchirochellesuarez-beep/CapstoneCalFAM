import { computed } from 'vue'
import { useAuthStore } from '../stores/authStore'

/**
 * Central barangay scope for multi-barangay federation support.
 * - Officers/farmers: locked to assigned barangay from login
 * - Admin: may select a barangay via adminBarangayId ref
 */
export function useBarangayScope(adminBarangayIdRef = null) {
  const authStore = useAuthStore()

  const isAdmin = computed(() => authStore.currentUser?.role === 'admin')

  const userBarangayId = computed(() => {
    const id = authStore.currentUser?.barangay_id
    return id != null && id !== '' ? String(id) : ''
  })

  const userBarangayName = computed(
    () => authStore.currentUser?.barangay_name || authStore.currentUser?.barangay || ''
  )

  const effectiveBarangayId = computed(() => {
    if (isAdmin.value && adminBarangayIdRef?.value) {
      return String(adminBarangayIdRef.value)
    }
    return userBarangayId.value
  })

  const isBarangayScoped = computed(() => !isAdmin.value || !!effectiveBarangayId.value)

  function appendBarangayParams(params = {}) {
    const search = params instanceof URLSearchParams ? params : new URLSearchParams(params)
    if (isAdmin.value && adminBarangayIdRef?.value) {
      search.set('barangay_id', String(adminBarangayIdRef.value))
    }
    return search
  }

  function authHeaders() {
    const token = authStore.token || localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
  }

  return {
    isAdmin,
    userBarangayId,
    userBarangayName,
    effectiveBarangayId,
    isBarangayScoped,
    appendBarangayParams,
    authHeaders
  }
}
