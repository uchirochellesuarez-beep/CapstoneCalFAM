export function historyRowKey(payment) {
  return `${payment?.history_kind || 'payment'}-${payment?.id}`
}

function isGcashHistoryRow(row) {
  const method = String(row?.payment_method || '').toLowerCase()
  const remarks = String(row?.remarks || '').toLowerCase()
  const type = String(row?.payment_type || '').toLowerCase()
  return method.includes('gcash') || remarks.includes('gcash') || type.startsWith('gcash_')
}

export function pickFocusedHistoryRow(rows, focus, submissionId) {
  const list = Array.isArray(rows) ? rows : []
  const sid = submissionId != null && String(submissionId).trim() !== '' ? String(submissionId) : ''
  if (sid) {
    const exact = list.find((p) => {
      const id = String(p?.id ?? '')
      return id === `gcash-${sid}` || id === sid || String(p?.gcash_submission_id || '') === sid
    })
    if (exact) return exact
  }
  if (focus === 'gcash-rejected') {
    return [...list].reverse().find((p) => p.payment_type === 'gcash_rejected') || null
  }
  if (focus === 'gcash-pending') {
    return list.find((p) => p.payment_type === 'gcash_pending') || null
  }
  if (focus === 'gcash-verified') {
    return (
      [...list].reverse().find((p) =>
        p.payment_type !== 'gcash_rejected' &&
        p.payment_type !== 'gcash_pending' &&
        isGcashHistoryRow(p)
      ) || null
    )
  }
  return null
}

const DEEP_LINK_KEYS = ['highlight', 'type', 'open', 'focus', 'nav', 'sid', 'view']

export function clearNotificationDeepLink(router, route) {
  if (!router || !route?.query) return
  const nextQuery = { ...route.query }
  let changed = false
  for (const key of DEEP_LINK_KEYS) {
    if (nextQuery[key] != null && nextQuery[key] !== '') {
      delete nextQuery[key]
      changed = true
    }
  }
  if (!changed) return
  router.replace({ path: route.path, query: nextQuery }).catch(() => {})
}

export function consumeNotificationDeepLink(router, route, clearHighlight, delayMs = 4000) {
  clearNotificationDeepLink(router, route)
  if (typeof clearHighlight === 'function') {
    window.setTimeout(clearHighlight, delayMs)
  }
}

function isShown(el) {
  if (!el || typeof window === 'undefined') return false
  if (!el.getClientRects().length) return false
  let node = el
  while (node && node !== document.body) {
    const style = window.getComputedStyle(node)
    if (style.display === 'none' || style.visibility === 'hidden') return false
    node = node.parentElement
  }
  return true
}

export function scrollFocusedHistoryRow(key) {
  if (typeof document === 'undefined') return false
  const keyed = key ? [...document.querySelectorAll(`[data-history-key="${key}"]`)] : []
  const target =
    keyed.find(isShown) ||
    [...document.querySelectorAll('.tx-history-card.notification-highlight-row, [data-payment-history]')].find(isShown) ||
    keyed[0]
  if (!target) return false
  const scroller =
    target.closest('.modal-body') ||
    target.closest('.tx-detail-modal') ||
    target.closest('.modal-content')
  if (scroller) {
    const elTop = target.getBoundingClientRect().top
    const scrollerTop = scroller.getBoundingClientRect().top
    const top = elTop - scrollerTop + scroller.scrollTop - 10
    scroller.scrollTo({ top: Math.max(0, top), behavior: 'smooth' })
    return true
  }
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })
  return true
}

export async function scrollFocusedHistoryRowWhenReady(key, nextTickFn, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    if (typeof nextTickFn === 'function') await nextTickFn()
    if (scrollFocusedHistoryRow(key)) return true
    await new Promise((resolve) => setTimeout(resolve, 90))
  }
  return false
}

/** Scroll the first visible match for CSS selectors to the viewport center (notification deep-links). */
export async function scrollElementWhenReady(selectors, nextTickFn, attempts = 16) {
  if (typeof document === 'undefined') return false
  const list = Array.isArray(selectors) ? selectors : [selectors]
  for (let i = 0; i < attempts; i++) {
    if (typeof nextTickFn === 'function') await nextTickFn()
    for (const selector of list) {
      if (!selector) continue
      const matches = [...document.querySelectorAll(selector)]
      const el = matches.find(isShown) || matches[0]
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return true
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return false
}
