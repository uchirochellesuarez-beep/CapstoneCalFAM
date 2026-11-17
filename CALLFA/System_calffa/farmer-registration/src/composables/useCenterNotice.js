import { onBeforeUnmount, ref } from 'vue'

export function useCenterNotice() {
  const centerNotice = ref('')
  const centerNoticeType = ref('success')
  let timer = null

  function showCenterNotice(message, type = 'success') {
    centerNotice.value = String(message || '')
    centerNoticeType.value = type === 'error' ? 'error' : 'success'
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      centerNotice.value = ''
      centerNoticeType.value = 'success'
    }, 4500)
  }

  function clearCenterNotice() {
    centerNotice.value = ''
    centerNoticeType.value = 'success'
    if (timer) clearTimeout(timer)
    timer = null
  }

  onBeforeUnmount(() => {
    if (timer) clearTimeout(timer)
  })

  return { centerNotice, centerNoticeType, showCenterNotice, clearCenterNotice }
}
