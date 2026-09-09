<template>
  <div
    class="page-language-toggle"
    :class="[`lang-toggle--${variant}`]"
    role="group"
    :aria-label="t('language.selector')"
  >
    <button
      type="button"
      :class="['lang-btn', { active: locale === 'en' }]"
      @click="setLocale('en')"
    >
      <span class="lang-btn-full">{{ t('language.en') }}</span>
      <span class="lang-btn-short">EN</span>
    </button>
    <button
      type="button"
      :class="['lang-btn', { active: locale === 'tl' }]"
      @click="setLocale('tl')"
    >
      <span class="lang-btn-full">{{ t('language.tl') }}</span>
      <span class="lang-btn-short">TL</span>
    </button>
  </div>
</template>

<script setup>
import { useI18n } from 'vue-i18n'
import { useLocale } from '../composables/useLocale'

defineProps({
  variant: {
    type: String,
    default: 'floating',
    validator: (value) => ['floating', 'header', 'settings'].includes(value)
  }
})

const { t } = useI18n()
const { locale, setLocale } = useLocale()
</script>

<style scoped>
.page-language-toggle {
  box-sizing: border-box;
  display: inline-flex;
  align-items: stretch;
  gap: 2px;
  margin: 0;
  padding: 3px;
  border-radius: 999px;
  border: 1px solid #0d3f28;
  background: rgba(18, 58, 38, 0.72);
  box-shadow:
    0 8px 28px rgba(0, 0, 0, 0.22),
    inset 0 1px 0 rgba(255, 255, 255, 0.12);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
}

.lang-toggle--floating {
  height: var(--control-h, 38px) !important;
  min-height: var(--control-h, 38px) !important;
  max-height: var(--control-h, 38px) !important;
}

.lang-toggle--header {
  height: 44px;
  min-height: 44px;
  max-height: 44px;
  padding: 3px;
  border: 2px solid #16a34a !important;
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
  box-shadow: 0 4px 12px rgba(4, 18, 12, 0.2) !important;
  backdrop-filter: none;
  -webkit-backdrop-filter: none;
}

.lang-toggle--settings {
  height: 42px;
  min-height: 42px;
}

.lang-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  min-height: 0;
  min-width: 0;
  margin: 0;
  border-radius: 999px;
  padding: 0 0.85rem;
  font-family: inherit;
  font-weight: 600;
  font-size: 0.72rem;
  line-height: 1;
  border: 1px solid transparent;
  background: transparent;
  color: rgba(196, 230, 205, 0.95);
  cursor: pointer;
  transition: background 0.26s, color 0.2s, box-shadow 0.26s, border-color 0.2s;
}

.lang-toggle--header .lang-btn {
  padding: 0 0.7rem;
  font-size: 0.72rem;
  color: #14532d !important;
  -webkit-text-fill-color: #14532d !important;
  background: transparent !important;
  border-color: transparent !important;
  box-shadow: none !important;
}

.lang-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.18);
}

.lang-toggle--header .lang-btn:hover {
  background: rgba(255, 255, 255, 0.55) !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: transparent !important;
}

.lang-btn.active {
  background: #fff;
  color: #0f2e1f;
  border-color: rgba(13, 63, 40, 0.35);
  box-shadow:
    0 2px 8px rgba(0, 0, 0, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 1);
}

.lang-toggle--header .lang-btn.active {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border: 1.5px solid #16a34a !important;
  box-shadow: 0 1px 4px rgba(4, 18, 12, 0.12) !important;
}

.lang-btn-short {
  display: none;
}

@media (max-width: 480px) {
  .lang-toggle--header .lang-btn-full {
    display: none;
  }

  .lang-toggle--header .lang-btn-short {
    display: inline;
  }

  .lang-toggle--header .lang-btn {
    padding: 0 0.5rem;
  }
}

:global(.light-theme) .page-language-toggle:not(.lang-toggle--header),
:global(body.glass-light) .page-language-toggle:not(.lang-toggle--header) {
  background: rgba(255, 255, 255, 0.96);
  border: 2.5px solid #166534;
  box-shadow: 0 8px 24px rgba(22, 101, 52, 0.12);
}

:global(.light-theme) .page-language-toggle:not(.lang-toggle--header) .lang-btn,
:global(body.glass-light) .page-language-toggle:not(.lang-toggle--header) .lang-btn {
  color: #166534;
  border: 1.5px solid transparent;
}

:global(.light-theme) .page-language-toggle:not(.lang-toggle--header) .lang-btn:hover,
:global(body.glass-light) .page-language-toggle:not(.lang-toggle--header) .lang-btn:hover {
  background: #f0fdf4;
  color: #14532d;
  border-color: rgba(21, 128, 61, 0.45);
}

:global(.light-theme) .page-language-toggle:not(.lang-toggle--header) .lang-btn.active,
:global(body.glass-light) .page-language-toggle:not(.lang-toggle--header) .lang-btn.active {
  background: #dcfce7;
  color: #14532d;
  border: 1.5px solid #14532d;
  box-shadow: none;
}

:global(body.glass-light) .lang-toggle--header {
  background: #ffffff !important;
  border: 2px solid #16a34a !important;
  box-shadow: 0 4px 12px rgba(22, 101, 52, 0.12) !important;
}
</style>
