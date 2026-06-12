<template>
  <button
    type="button"
    :class="buttonClass"
    :title="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-label="isDark ? 'Switch to light mode' : 'Switch to dark mode'"
    :aria-pressed="isDark"
    @click="toggleTheme"
  >
    <!-- Sun = light mode active, Moon = dark mode active -->
    <svg
      v-if="!isDark"
      class="theme-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="4.25" stroke="currentColor" stroke-width="1.9" />
      <path
        d="M12 2.75V5.25M12 18.75V21.25M4.75 12H2.25M21.75 12H19.25M5.64 5.64L7.46 7.46M16.54 16.54L18.36 18.36M5.64 18.36L7.46 16.54M16.54 7.46L18.36 5.64"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
      />
    </svg>
    <svg
      v-else
      class="theme-icon"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M21 14.5A7.5 7.5 0 0 1 9.5 3a6.5 6.5 0 1 0 11.5 11.5Z"
        stroke="currentColor"
        stroke-width="1.9"
        stroke-linecap="round"
        stroke-linejoin="round"
      />
    </svg>
    <span v-if="showLabel" class="theme-label">{{ isDark ? 'Dark' : 'Light' }}</span>
  </button>
</template>

<script setup>
import { computed } from 'vue'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const props = defineProps({
  variant: {
    type: String,
    default: 'header',
    validator: (value) => ['header', 'floating', 'inline'].includes(value)
  },
  showLabel: {
    type: Boolean,
    default: false
  }
})

const { isDark, toggleTheme } = useBackdropTheme()

const buttonClass = computed(() => ({
  'icon-btn': props.variant === 'header',
  'theme-toggle-floating': props.variant === 'floating',
  'theme-toggle-inline': props.variant === 'inline'
}))
</script>

<style scoped>
.theme-icon {
  width: 21px;
  height: 21px;
  flex-shrink: 0;
}

.theme-label {
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.theme-toggle-floating,
.theme-toggle-inline {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.35rem;
  min-width: 44px;
  min-height: 44px;
  padding: 0.45rem 0.65rem;
  border-radius: 999px;
  border: 1px solid rgba(120, 180, 145, 0.38);
  background: linear-gradient(140deg, rgba(14, 43, 31, 0.94), rgba(10, 30, 22, 0.94));
  color: #fbbf24;
  cursor: pointer;
  box-shadow:
    0 8px 20px rgba(8, 12, 10, 0.35),
    inset 0 1px 0 rgba(255, 255, 255, 0.1);
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.theme-toggle-floating:hover,
.theme-toggle-inline:hover {
  transform: translateY(-1px);
  border-color: rgba(251, 191, 36, 0.55);
  box-shadow:
    0 10px 24px rgba(8, 12, 10, 0.42),
    0 0 18px rgba(251, 191, 36, 0.18);
}

.theme-toggle-floating:focus-visible,
.theme-toggle-inline:focus-visible {
  outline: 2px solid rgba(251, 191, 36, 0.55);
  outline-offset: 2px;
}

:global(body.glass-light) .theme-toggle-floating,
:global(body.glass-light) .theme-toggle-inline {
  border-color: rgba(22, 101, 52, 0.22);
  background: linear-gradient(140deg, rgba(255, 255, 255, 0.95), rgba(240, 253, 244, 0.92));
  color: #b45309;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.12);
}

@media (max-width: 768px) {
  .theme-icon {
    width: 18px;
    height: 18px;
  }
}
</style>
