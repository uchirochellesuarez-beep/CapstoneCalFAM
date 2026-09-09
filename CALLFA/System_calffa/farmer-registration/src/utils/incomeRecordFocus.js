export function getIncomeHighlightId(query) {
  const highlightId = query?.highlight
  if (highlightId == null || String(highlightId).trim() === '') return null
  const type = String(query?.type || '')
  if (type && type !== 'income') return null
  return String(highlightId)
}

function findScrollContainer(el) {
  if (!el || typeof window === 'undefined') return null
  const main = el.closest('.main-content')
  if (main) return main
  let node = el.parentElement
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node)
    const overflowY = style.overflowY
    if ((overflowY === 'auto' || overflowY === 'scroll') && node.scrollHeight > node.clientHeight + 8) {
      return node
    }
    node = node.parentElement
  }
  return document.scrollingElement || document.documentElement
}

export function scrollElementToCenter(el) {
  if (!el || typeof window === 'undefined') return false
  const scroller = findScrollContainer(el)
  if (scroller && scroller !== document.body && scroller !== document.documentElement && scroller !== document.scrollingElement) {
    const elRect = el.getBoundingClientRect()
    const scrollerRect = scroller.getBoundingClientRect()
    const offset = ((elRect.top + elRect.bottom) / 2) - ((scrollerRect.top + scrollerRect.bottom) / 2)
    scroller.scrollTo({
      top: scroller.scrollTop + offset,
      behavior: 'smooth'
    })
    return true
  }
  el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' })
  return true
}

export async function scrollIncomeRecordIntoView(recordId, nextTickFn, attempts = 10) {
  const id = String(recordId || '')
  if (!id || typeof document === 'undefined') return false
  if (typeof nextTickFn === 'function') await nextTickFn()

  for (let i = 0; i < attempts; i += 1) {
    const selectorId = (typeof CSS !== 'undefined' && typeof CSS.escape === 'function')
      ? CSS.escape(id)
      : id.replace(/["\\]/g, '')
    const el = document.querySelector(`[data-income-record-id="${selectorId}"]`)
    if (el) {
      scrollElementToCenter(el)
      return true
    }
    await new Promise((resolve) => window.setTimeout(resolve, 120))
  }
  return false
}
