import { createI18n } from 'vue-i18n'
import en from './locales/en.json'
import tl from './locales/tl.json'

export const LOCALE_STORAGE_KEY = 'calffa-locale'

export function getSavedLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    return stored === 'tl' ? 'tl' : 'en'
  } catch {
    return 'en'
  }
}

export function applyDocumentLang(locale) {
  if (typeof document === 'undefined') return
  document.documentElement.lang = locale === 'tl' ? 'tl' : 'en'
}

const locale = getSavedLocale()
applyDocumentLang(locale)

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale,
  fallbackLocale: 'en',
  messages: { en, tl }
})

if (import.meta.hot) {
  import.meta.hot.accept('./locales/en.json', (mod) => {
    if (mod?.default) i18n.global.setLocaleMessage('en', mod.default)
  })
  import.meta.hot.accept('./locales/tl.json', (mod) => {
    if (mod?.default) i18n.global.setLocaleMessage('tl', mod.default)
  })
}
