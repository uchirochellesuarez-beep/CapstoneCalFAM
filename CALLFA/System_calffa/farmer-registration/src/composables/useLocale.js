import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { applyDocumentLang, LOCALE_STORAGE_KEY } from '../i18n'

export function useLocale() {
  const { locale } = useI18n()

  const setLocale = (next) => {
    const value = next === 'tl' ? 'tl' : 'en'
    locale.value = value
    try {
      localStorage.setItem(LOCALE_STORAGE_KEY, value)
    } catch {
      /* ignore */
    }
    applyDocumentLang(value)
  }

  return {
    locale,
    setLocale,
    isTagalog: computed(() => locale.value === 'tl')
  }
}
