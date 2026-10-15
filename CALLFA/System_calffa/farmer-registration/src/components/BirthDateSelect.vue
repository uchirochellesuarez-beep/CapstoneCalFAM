<template>
  <div class="birth-date-field" :class="`birth-date-field--${variant}`">
    <button
      type="button"
      class="birth-date-trigger"
      :class="selectClass"
      @click="openPicker"
    >
      <span class="birth-date-trigger-text" :class="{ 'is-placeholder': !displayText }">
        {{ displayText || labels.placeholder }}
      </span>
      <svg class="birth-date-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <line x1="16" y1="2" x2="16" y2="6" />
        <line x1="8" y1="2" x2="8" y2="6" />
        <line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    </button>
    <input
      class="birth-date-required"
      type="text"
      :value="modelValue"
      :required="required"
      tabindex="-1"
      autocomplete="bday"
      aria-hidden="true"
    />

    <Teleport to="body">
      <div
        v-if="open"
        class="birth-date-overlay"
        :class="{ 'is-light': isLight }"
        @click.self="closePicker"
      >
        <div class="birth-date-dialog" role="dialog" aria-modal="true" :aria-label="labels.title">
          <p class="birth-date-dialog-title">{{ labels.title }}</p>

          <label class="birth-date-line">
            <span>{{ labels.month }}</span>
            <select :value="month" @change="onMonth">
              <option value="">{{ labels.month }}</option>
              <option v-for="item in monthOptions" :key="item.value" :value="item.value">
                {{ item.label }}
              </option>
            </select>
          </label>

          <label class="birth-date-line">
            <span>{{ labels.day }}</span>
            <select :value="day" @change="onDay">
              <option value="">{{ labels.day }}</option>
              <option v-for="item in dayOptions" :key="item" :value="String(item)">{{ item }}</option>
            </select>
          </label>

          <label class="birth-date-line">
            <span>{{ labels.year }}</span>
            <select :value="year" @change="onYear">
              <option value="">{{ labels.year }}</option>
              <option v-for="item in yearOptions" :key="item" :value="String(item)">{{ item }}</option>
            </select>
          </label>

          <button type="button" class="birth-date-done" @click="closePicker">{{ labels.done }}</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'

const props = defineProps({
  modelValue: { type: String, default: '' },
  max: { type: String, default: '' },
  min: { type: String, default: '' },
  required: { type: Boolean, default: false },
  variant: { type: String, default: 'auth' },
  selectClass: { type: String, default: '' }
})

const emit = defineEmits(['update:modelValue'])
const { locale } = useI18n()

const MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]
const MONTHS_TL = [
  'Enero', 'Pebrero', 'Marso', 'Abril', 'Mayo', 'Hunyo',
  'Hulyo', 'Agosto', 'Setyembre', 'Oktubre', 'Nobyembre', 'Disyembre'
]

const open = ref(false)
const isLight = ref(false)
const month = ref('')
const day = ref('')
const year = ref('')

function parse(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ''))
  if (!match) return { y: '', m: '', d: '' }
  return {
    y: String(Number(match[1])),
    m: String(Number(match[2])),
    d: String(Number(match[3]))
  }
}

watch(
  () => props.modelValue,
  (value) => {
    const parts = parse(value)
    year.value = parts.y
    month.value = parts.m
    day.value = parts.d
  },
  { immediate: true }
)

const labels = computed(() => {
  const filipino = String(locale.value || '').toLowerCase().startsWith('tl')
  return filipino
    ? { month: 'Buwan', day: 'Araw', year: 'Taon', placeholder: 'Pumili ng petsa', title: 'Petsa ng kapanganakan', done: 'OK' }
    : { month: 'Month', day: 'Day', year: 'Year', placeholder: 'Select date', title: 'Date of birth', done: 'OK' }
})

const monthNames = computed(() =>
  String(locale.value || '').toLowerCase().startsWith('tl') ? MONTHS_TL : MONTHS_EN
)

const displayText = computed(() => {
  if (!year.value || !month.value || !day.value) return ''
  const name = monthNames.value[Number(month.value) - 1]
  if (!name) return ''
  return `${name} ${Number(day.value)}, ${year.value}`
})

const maxParts = computed(() => parse(props.max))
const minParts = computed(() => parse(props.min))

const yearOptions = computed(() => {
  const now = new Date().getFullYear()
  let hi = maxParts.value.y ? Number(maxParts.value.y) : now
  let lo = minParts.value.y ? Number(minParts.value.y) : hi - 100
  if (!Number.isFinite(hi)) hi = now
  if (!Number.isFinite(lo) || lo > hi) lo = hi - 100
  const years = []
  for (let y = hi; y >= lo; y -= 1) years.push(y)
  return years
})

const monthOptions = computed(() => {
  let start = 1
  let end = 12
  const selectedYear = Number(year.value)
  if (selectedYear && maxParts.value.y && selectedYear === Number(maxParts.value.y)) {
    end = Number(maxParts.value.m) || 12
  }
  if (selectedYear && minParts.value.y && selectedYear === Number(minParts.value.y)) {
    start = Number(minParts.value.m) || 1
  }
  const list = []
  for (let m = start; m <= end; m += 1) {
    list.push({ value: String(m), label: monthNames.value[m - 1] })
  }
  return list
})

const dayOptions = computed(() => {
  const selectedYear = Number(year.value) || 2000
  const selectedMonth = Number(month.value) || 1
  let maxDay = new Date(selectedYear, selectedMonth, 0).getDate()
  let minDay = 1
  if (
    year.value &&
    month.value &&
    maxParts.value.y &&
    Number(year.value) === Number(maxParts.value.y) &&
    Number(month.value) === Number(maxParts.value.m)
  ) {
    maxDay = Math.min(maxDay, Number(maxParts.value.d) || maxDay)
  }
  if (
    year.value &&
    month.value &&
    minParts.value.y &&
    Number(year.value) === Number(minParts.value.y) &&
    Number(month.value) === Number(minParts.value.m)
  ) {
    minDay = Number(minParts.value.d) || 1
  }
  const days = []
  for (let d = minDay; d <= maxDay; d += 1) days.push(d)
  return days
})

function pad(value) {
  return String(value).padStart(2, '0')
}

function clampParts() {
  if (month.value && !monthOptions.value.some((item) => item.value === month.value)) {
    month.value = ''
  }
  if (day.value && !dayOptions.value.includes(Number(day.value))) {
    day.value = ''
  }
}

function emitValue() {
  if (!year.value || !month.value || !day.value) {
    if (props.modelValue) emit('update:modelValue', '')
    return
  }
  const next = `${year.value}-${pad(month.value)}-${pad(day.value)}`
  if (next !== String(props.modelValue || '').slice(0, 10)) {
    emit('update:modelValue', next)
  }
}

function onYear(event) {
  year.value = event.target.value
  clampParts()
  emitValue()
}

function onMonth(event) {
  month.value = event.target.value
  clampParts()
  emitValue()
}

function onDay(event) {
  day.value = event.target.value
  emitValue()
}

function onKeydown(event) {
  if (event.key === 'Escape') closePicker()
}

function openPicker() {
  isLight.value = document.body.classList.contains('backdrop-theme-light')
  open.value = true
  document.addEventListener('keydown', onKeydown)
}

function closePicker() {
  open.value = false
  document.removeEventListener('keydown', onKeydown)
}

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
})
</script>

<style scoped>
.birth-date-field {
  position: relative;
  width: 100%;
  min-width: 0;
}

.birth-date-trigger {
  width: 100% !important;
  min-width: 0 !important;
  margin: 0 !important;
  display: flex !important;
  align-items: center;
  justify-content: space-between !important;
  gap: 8px;
  text-align: left;
  cursor: pointer;
  transform: none !important;
  box-shadow: none;
}

.birth-date-trigger:hover,
.birth-date-trigger:active {
  transform: none !important;
}

.birth-date-trigger-text {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 500;
}

.birth-date-trigger-text.is-placeholder {
  opacity: 0.62;
  font-weight: 500;
}

.birth-date-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  opacity: 0.85;
}

.birth-date-required {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  opacity: 0;
  pointer-events: none;
  border: 0;
  padding: 0;
  margin: 0;
}

.birth-date-field--edit .birth-date-trigger {
  height: 40px;
  min-height: 40px;
  max-height: 40px;
  padding: 0 10px !important;
  box-sizing: border-box;
}
</style>

<style>
.birth-date-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 12px;
  background: rgba(8, 12, 10, 0.55);
}

.birth-date-dialog {
  width: min(100%, 360px);
  margin-bottom: env(safe-area-inset-bottom, 0px);
  padding: 14px;
  border-radius: 16px;
  background: #10281c;
  border: 1px solid rgba(167, 211, 178, 0.35);
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.35);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.birth-date-dialog-title {
  margin: 0;
  color: #ecfdf5;
  font-size: 15px;
  font-weight: 700;
}

.birth-date-line {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: 0;
  color: #bbf7d0;
  font-size: 12px;
  font-weight: 700;
}

.birth-date-line select {
  width: 100%;
  height: 42px;
  margin: 0;
  padding: 0 10px;
  border-radius: 10px;
  border: 1px solid rgba(187, 247, 208, 0.35);
  background: #07150e;
  color: #f8fafc;
  font-size: 15px;
  font-weight: 600;
}

.birth-date-line select option {
  color: #0f172a;
  background: #ffffff;
}

.birth-date-done {
  height: 42px;
  margin: 2px 0 0 !important;
  border: 0;
  border-radius: 999px;
  background: #16a34a;
  color: #ffffff;
  font-weight: 700;
  cursor: pointer;
}

.birth-date-overlay.is-light .birth-date-dialog {
  background: #ffffff;
  border-color: #86efac;
}

.birth-date-overlay.is-light .birth-date-dialog-title {
  color: #052e16;
}

.birth-date-overlay.is-light .birth-date-line {
  color: #166534;
}

.birth-date-overlay.is-light .birth-date-line select {
  background: #f8fafc;
  color: #052e16;
  border-color: #86efac;
}
</style>
