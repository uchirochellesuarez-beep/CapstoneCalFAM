<template>
  <ul
    v-if="visible"
    class="password-requirements"
    :aria-label="t('signup.passwordRequirements')"
  >
    <li
      v-for="item in items"
      :key="item.key"
      class="password-requirement"
      :class="{ met: item.met }"
    >
      <span class="password-requirement-icon" aria-hidden="true">{{ item.met ? '✓' : '○' }}</span>
      <span>{{ item.label }}</span>
    </li>
  </ul>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { getPasswordChecks } from '../utils/passwordRules'

const props = defineProps({
  password: { type: String, default: '' },
  /** Show checklist even before typing (signup hint). */
  alwaysShow: { type: Boolean, default: false },
})

const { t } = useI18n()

const checks = computed(() => getPasswordChecks(props.password))

const visible = computed(() => props.alwaysShow || Boolean(props.password))

const items = computed(() => [
  {
    key: 'minLength',
    met: checks.value.minLength,
    label: t('signup.passwordReqMinLength'),
  },
  {
    key: 'hasLetter',
    met: checks.value.hasLetter,
    label: t('signup.passwordReqLetter'),
  },
  {
    key: 'hasNumber',
    met: checks.value.hasNumber,
    label: t('signup.passwordReqNumber'),
  },
  {
    key: 'hasSpecial',
    met: checks.value.hasSpecial,
    label: t('signup.passwordReqSpecial'),
  },
])
</script>

<style scoped>
.password-requirements {
  list-style: none;
  margin: 0.55rem 0 0;
  padding: 0.65rem 0.75rem;
  display: grid;
  gap: 0.35rem;
  border-radius: 10px;
  border: 1px solid rgba(148, 163, 184, 0.35);
  background: rgba(15, 23, 42, 0.04);
}

.password-requirement {
  display: flex;
  align-items: flex-start;
  gap: 0.45rem;
  font-size: 0.82rem;
  line-height: 1.35;
  color: #64748b;
  font-weight: 600;
}

.password-requirement.met {
  color: #15803d;
}

.password-requirement-icon {
  flex-shrink: 0;
  width: 1rem;
  text-align: center;
  font-size: 0.85rem;
  line-height: 1.35;
}

:global(.auth-panel.light-theme) .password-requirements,
:global(.light-theme) .password-requirements {
  background: #f8fafc;
  border-color: #e2e8f0;
}

:global(.auth-panel:not(.light-theme)) .password-requirements,
:global(.glass-module-page:not(.light-theme)) .password-requirements {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(148, 163, 184, 0.28);
  color: inherit;
}

:global(.auth-panel:not(.light-theme)) .password-requirement,
:global(.glass-module-page:not(.light-theme)) .password-requirement {
  color: #94a3b8;
}

:global(.auth-panel:not(.light-theme)) .password-requirement.met,
:global(.glass-module-page:not(.light-theme)) .password-requirement.met {
  color: #4ade80;
}
</style>
