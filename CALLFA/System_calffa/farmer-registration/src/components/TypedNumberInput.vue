<template>
  <input
    type="text"
    :inputmode="decimal ? 'decimal' : 'numeric'"
    :class="inputClass"
    :placeholder="placeholder"
    :disabled="disabled"
    :readonly="readonly"
    :value="displayValue"
    @input="onInput"
    @blur="onBlur"
    @wheel.prevent
  />
</template>

<script setup>
import { ref, watch } from 'vue'
import { sanitizeNumericInput, parseNumericInput, formatNumericForInput } from '../utils/numericInput'

const props = defineProps({
  modelValue: {
    type: [Number, String],
    default: null
  },
  decimal: {
    type: Boolean,
    default: true
  },
  min: {
    type: Number,
    default: undefined
  },
  max: {
    type: Number,
    default: undefined
  },
  placeholder: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  readonly: {
    type: Boolean,
    default: false
  },
  inputClass: {
    type: String,
    default: 'form-input'
  }
})

const emit = defineEmits(['update:modelValue', 'input'])

const displayValue = ref('')

const clamp = (n) => {
  if (n == null) return null
  let out = n
  if (props.min != null && out < props.min) out = props.min
  if (props.max != null && out > props.max) out = props.max
  return out
}

watch(
  () => props.modelValue,
  (val) => {
    displayValue.value = formatNumericForInput(val)
  },
  { immediate: true }
)

const onInput = (event) => {
  const raw = sanitizeNumericInput(event.target.value, props.decimal)
  displayValue.value = raw
  event.target.value = raw
  const parsed = parseNumericInput(raw)
  emit('update:modelValue', parsed)
  emit('input', parsed)
}

const onBlur = () => {
  let parsed = clamp(parseNumericInput(displayValue.value))
  if (parsed != null) {
    displayValue.value = props.decimal ? String(parsed) : String(Math.round(parsed))
  } else {
    displayValue.value = ''
  }
  emit('update:modelValue', parsed)
}
</script>
