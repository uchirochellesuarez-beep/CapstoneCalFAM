import { onBeforeUnmount, ref } from 'vue'

export function useCenterNotice() {
  const centerNotice = ref('')
  let timer = null

  function showCenterNotice(message) {
    centerNotice.value = String(message || '')
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      centerNotice.value = ''
    }, 4500)
  }

  function clearCenterNotice() {
    centerNotice.value = ''
    if (timer) clearTimeout(timer)
    timer = null
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return { centerNotice, showCenterNotice, clearCenterNotice }
}
