<template>
  <span
    class="app-image"
    :class="{ 'app-image--pending': showSkeleton && layout !== 'frame' }"
    v-bind="wrapperAttrs"
  >
    <img
      v-if="src"
      ref="imgEl"
      :key="src"
      :src="src"
      :alt="alt"
      :class="[imgClass, frameClass]"
      :loading="lazy ? 'lazy' : 'eager'"
      decoding="async"
      @load="onLoad"
      @error="onError"
    />
    <span v-if="showSkeleton && layout !== 'frame'" class="app-image__skeleton" aria-hidden="true"></span>
  </span>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, useAttrs, watch } from 'vue'

defineOptions({ inheritAttrs: false })

const props = defineProps({
  src: { type: String, default: '' },
  alt: { type: String, default: '' },
  imgClass: { type: [String, Array, Object], default: '' },
  frameClass: { type: [String, Array, Object], default: '' },
  shape: { type: String, default: 'rect' },
  layout: { type: String, default: 'inline' },
  lazy: { type: Boolean, default: false },
  reserve: { type: Boolean, default: false }
})

const emit = defineEmits(['load', 'error'])
const attrs = useAttrs()
const wrapperAttrs = computed(() => {
  const { class: _class, style: _style, ...rest } = attrs
  return rest
})

const imgEl = ref(null)
const phase = ref('loading')
const showSkeleton = ref(false)
let delayTimer = null

function clearDelay() {
  if (delayTimer) {
    clearTimeout(delayTimer)
    delayTimer = null
  }
}

function settleCached() {
  const el = imgEl.value
  if (!el || phase.value !== 'loading') return
  if (el.complete && el.naturalWidth > 0) {
    phase.value = 'loaded'
    showSkeleton.value = false
    clearDelay()
  } else if (el.complete && el.naturalWidth === 0) {
    phase.value = 'error'
    showSkeleton.value = false
    clearDelay()
  }
}

function begin() {
  clearDelay()
  showSkeleton.value = false
  if (!props.src) {
    phase.value = 'error'
    return
  }
  phase.value = 'loading'
  delayTimer = setTimeout(() => {
    if (phase.value === 'loading') showSkeleton.value = true
  }, 90)
  nextTick(() => settleCached())
}

function onLoad(event) {
  phase.value = 'loaded'
  showSkeleton.value = false
  clearDelay()
  emit('load', event)
}

function onError(event) {
  phase.value = 'error'
  showSkeleton.value = false
  clearDelay()
  emit('error', event)
}

watch(() => props.src, begin, { immediate: true })
onBeforeUnmount(clearDelay)
</script>

<style>
.app-image {
  display: contents;
}

.app-image--pending {
  display: inline-block;
  position: relative;
  line-height: 0;
  vertical-align: top;
}

.app-image--pending > img {
  opacity: 0;
}

.app-image__skeleton {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
}

.app-image__skeleton::before {
  content: '';
  width: 22%;
  height: 22%;
  min-width: 14px;
  min-height: 14px;
  max-width: 28px;
  max-height: 28px;
  border-radius: 50%;
  border: 2px solid rgba(22, 101, 52, 0.22);
  border-top-color: #166534;
  animation: app-image-spin 0.7s linear infinite;
}

@keyframes app-image-spin {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .app-image__skeleton::before {
    animation: none;
  }
}
</style>
