import { ref, onMounted, onBeforeUnmount, watch } from 'vue'

/**
 * Mobile breakpoint + body scroll lock when income-hub modals are open.
 * @param {() => boolean} getModalOpen
 */
export function useIncomeHubMobile(getModalOpen) {
  const isMobile = ref(false)
  let mql = null

  const updateIsMobile = () => {
    isMobile.value = window.matchMedia('(max-width: 768px)').matches
  }

  const setScrollLock = (open) => {
    document.body.classList.toggle('app-modal-open', open)
    document.documentElement.classList.toggle('app-modal-open', open)
  }

  onMounted(() => {
    mql = window.matchMedia('(max-width: 768px)')
    updateIsMobile()
    mql.addEventListener('change', updateIsMobile)
  })

  onBeforeUnmount(() => {
    if (mql) mql.removeEventListener('change', updateIsMobile)
    setScrollLock(false)
  })

  watch(getModalOpen, (open) => {
    setScrollLock(!!open)
  }, { immediate: true })

  return { isMobile }
}
