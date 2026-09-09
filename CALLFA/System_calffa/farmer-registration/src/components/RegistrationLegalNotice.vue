<template>
  <aside class="registration-legal" :aria-label="t('legal.aria')">
    <button
      type="button"
      class="registration-legal-toggle"
      :aria-expanded="expanded"
      @click="expanded = !expanded"
    >
      <span class="registration-legal-toggle-title">{{ t('legal.title') }}</span>
      <span class="registration-legal-toggle-action">
        {{ expanded ? t('legal.hideDetails') : t('legal.showDetails') }}
      </span>
    </button>

    <p v-if="!expanded" class="registration-legal-summary">{{ t('legal.summary') }}</p>

    <div v-show="expanded" class="registration-legal-body">
      <section class="registration-legal-section">
        <h4>{{ t('legal.termsHeading') }}</h4>
        <ul>
          <li v-for="(item, index) in terms" :key="'t-' + index">{{ item }}</li>
        </ul>
      </section>

      <section class="registration-legal-section">
        <h4>{{ t('legal.privacyHeading') }}</h4>
        <p class="registration-legal-lead">{{ t('legal.privacyLead') }}</p>
        <ul>
          <li v-for="(item, index) in privacy" :key="'p-' + index">{{ item }}</li>
        </ul>
      </section>
    </div>

    <label class="registration-legal-agree">
      <input v-model="agreed" type="checkbox" class="registration-legal-checkbox" />
      <span>{{ t('legal.agreeLabel') }}</span>
    </label>
  </aside>
</template>

<script setup>
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const agreed = defineModel('agreed', { type: Boolean, default: false })
const expanded = ref(false)
const { t, tm, rt } = useI18n()

const asList = (key) => {
  const msgs = tm(key)
  if (!Array.isArray(msgs)) return []
  return msgs.map((item) => (typeof item === 'string' ? item : rt(item)))
}

const terms = computed(() => asList('legal.terms'))
const privacy = computed(() => asList('legal.privacy'))
</script>

<style scoped>
.registration-legal {
  grid-column: 1 / -1;
  margin-top: 0.35rem;
  padding: 0.65rem 0.75rem 0.7rem;
  border-radius: 12px;
  border: 1px solid rgba(134, 239, 172, 0.32);
  background: rgba(12, 38, 22, 0.45);
  color: rgba(236, 253, 245, 0.94);
  font-size: 0.72rem;
  line-height: 1.45;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.registration-legal-toggle {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.65rem;
  padding: 0;
  margin: 0;
  border: none;
  background: transparent;
  cursor: pointer;
  text-align: left;
  font: inherit;
  color: inherit;
}

.registration-legal-toggle-title {
  font-size: 0.8rem;
  font-weight: 700;
  color: #ffd966;
  letter-spacing: 0.01em;
}

.registration-legal-toggle-action {
  flex-shrink: 0;
  font-size: 0.72rem;
  font-weight: 700;
  color: rgba(134, 239, 172, 0.95);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.registration-legal-summary {
  margin: 0.4rem 0 0;
  color: rgba(211, 218, 206, 0.9);
  font-size: 0.72rem;
  line-height: 1.45;
}

.registration-legal-body {
  margin-top: 0.45rem;
  padding-top: 0.45rem;
  border-top: 1px solid rgba(134, 239, 172, 0.22);
  max-height: 9.5rem;
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
}

.registration-legal-section {
  margin-bottom: 0.4rem;
}

.registration-legal-section h4 {
  margin: 0 0 0.2rem;
  font-size: 0.74rem;
  font-weight: 700;
  color: rgba(220, 255, 235, 0.96);
}

.registration-legal-lead {
  margin: 0 0 0.2rem;
}

.registration-legal ul {
  margin: 0;
  padding-left: 1.1rem;
}

.registration-legal li {
  margin-bottom: 0.15rem;
}

.registration-legal-agree {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  margin-top: 0.55rem;
  padding-top: 0.55rem;
  padding-bottom: 0.05rem;
  border-top: 1px solid rgba(134, 239, 172, 0.22);
  cursor: pointer;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1.45;
  color: rgba(220, 255, 235, 0.96);
}

.registration-legal-checkbox {
  width: 1rem;
  height: 1rem;
  margin: 0;
  flex-shrink: 0;
  accent-color: #6bbf59;
  cursor: pointer;
}
</style>
