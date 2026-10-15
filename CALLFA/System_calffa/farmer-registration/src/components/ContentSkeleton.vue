<template>
  <div v-if="visible" class="sk-wrap" :class="'sk-wrap--' + variant" role="status" aria-live="polite" aria-busy="true">
    <span class="sk-sr">{{ labelText }}</span>

    <template v-if="variant === 'dashboard'">
      <div class="sk-stats">
        <div v-for="n in 4" :key="'stat-' + n" class="sk-card">
          <span class="sk-bone sk-bone--label"></span>
          <span class="sk-bone sk-bone--value"></span>
        </div>
      </div>
      <div class="sk-card">
        <span class="sk-bone sk-bone--title"></span>
        <span class="sk-bone sk-bone--chart"></span>
      </div>
    </template>

    <template v-else-if="variant === 'chart'">
      <div class="sk-card">
        <span class="sk-bone sk-bone--title"></span>
        <span class="sk-bone sk-bone--chart"></span>
        <span class="sk-bone sk-bone--line-short"></span>
      </div>
    </template>

    <template v-else-if="variant === 'cards'">
      <div class="sk-grid">
        <div v-for="n in count" :key="'card-' + n" class="sk-card">
          <span class="sk-bone sk-bone--thumb"></span>
          <span class="sk-bone sk-bone--title"></span>
          <span class="sk-bone sk-bone--line"></span>
          <span class="sk-bone sk-bone--line-short"></span>
          <span class="sk-bone sk-bone--btn"></span>
        </div>
      </div>
    </template>

    <template v-else-if="variant === 'news'">
      <div v-for="n in count" :key="'news-' + n" class="sk-card">
        <span class="sk-bone sk-bone--thumb"></span>
        <span class="sk-bone sk-bone--title"></span>
        <span class="sk-bone sk-bone--line"></span>
        <span class="sk-bone sk-bone--line"></span>
        <span class="sk-bone sk-bone--line-short"></span>
      </div>
    </template>

    <template v-else-if="variant === 'profile'">
      <div class="sk-card">
        <div class="sk-profile-head">
          <span class="sk-bone sk-bone--avatar"></span>
          <div class="sk-profile-copy">
            <span class="sk-bone sk-bone--title"></span>
            <span class="sk-bone sk-bone--line-short"></span>
          </div>
        </div>
        <span v-for="n in 4" :key="'field-' + n" class="sk-bone sk-bone--field"></span>
      </div>
    </template>

    <template v-else-if="variant === 'form'">
      <div v-for="n in count" :key="'form-' + n" class="sk-form-row">
        <span class="sk-bone sk-bone--label"></span>
        <span class="sk-bone sk-bone--field"></span>
      </div>
    </template>

    <template v-else-if="variant === 'table'">
      <div class="sk-table">
        <div v-for="n in count" :key="'row-' + n" class="sk-table-row">
          <span class="sk-bone sk-bone--line"></span>
          <span class="sk-bone sk-bone--line"></span>
          <span class="sk-bone sk-bone--line"></span>
          <span class="sk-bone sk-bone--line"></span>
        </div>
      </div>
    </template>

    <template v-else>
      <div v-for="n in count" :key="'list-' + n" class="sk-card">
        <div class="sk-list-row">
          <span class="sk-bone sk-bone--avatar"></span>
          <div class="sk-list-copy">
            <span class="sk-bone sk-bone--title"></span>
            <span class="sk-bone sk-bone--line-short"></span>
          </div>
        </div>
        <div class="sk-pills">
          <span class="sk-bone sk-bone--field"></span>
          <span class="sk-bone sk-bone--field"></span>
          <span class="sk-bone sk-bone--field"></span>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  variant: { type: String, default: 'list' },
  rows: { type: Number, default: 0 },
  label: { type: String, default: '' },
  delay: { type: Number, default: 80 }
})

const { t } = useI18n()
const visible = ref(false)
let timer = null

const count = computed(() => {
  if (props.rows > 0) return props.rows
  if (props.variant === 'cards' || props.variant === 'news') return 3
  if (props.variant === 'form') return 4
  if (props.variant === 'table') return 6
  return 4
})

const labelText = computed(() => props.label || t('common.loading'))

onMounted(() => {
  const wait = Number(props.delay) || 0
  if (wait <= 0) {
    visible.value = true
    return
  }
  timer = setTimeout(() => {
    visible.value = true
  }, wait)
})

onBeforeUnmount(() => {
  if (timer) clearTimeout(timer)
})
</script>
