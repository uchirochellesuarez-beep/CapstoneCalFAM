import { createApp, h } from 'vue'
import { createI18n } from 'vue-i18n'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import { i18n } from '../i18n'

const HOST_STYLE =
  'position:fixed;left:-10000px;top:0;width:794px;height:1600px;opacity:0;pointer-events:none;overflow:visible;z-index:-1'

function createPrintI18n() {
  const locale =
    typeof i18n.global.locale === 'object' && i18n.global.locale
      ? i18n.global.locale.value
      : i18n.global.locale

  return createI18n({
    legacy: false,
    globalInjection: true,
    locale: locale || 'en',
    fallbackLocale: 'en',
    messages: {
      en: i18n.global.getLocaleMessage('en'),
      tl: i18n.global.getLocaleMessage('tl')
    }
  })
}

/**
 * Print a payment receipt without showing the on-screen preview modal (desktop direct print).
 */
export function mountAndPrintPaymentReceipt(receipt, options = {}) {
  if (!receipt) return Promise.resolve()

  const host = document.createElement('div')
  host.setAttribute('aria-hidden', 'true')
  host.style.cssText = HOST_STYLE
  document.body.appendChild(host)

  const kind = options.kind || 'payment'
  const app = createApp({
    render: () =>
      h(PaymentReceiptPrint, {
        receipt,
        autoPrint: true,
        kind
      })
  })
  app.use(createPrintI18n())
  app.mount(host)

  return new Promise((resolve) => {
    setTimeout(() => {
      try {
        app.unmount()
      } catch {
        /* ignore */
      }
      host.remove()
      resolve()
    }, 4500)
  })
}
