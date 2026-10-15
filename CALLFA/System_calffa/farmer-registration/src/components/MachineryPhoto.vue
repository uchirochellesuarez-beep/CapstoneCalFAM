<template>
  <span class="machinery-photo" :class="{ 'is-fill': fill }">
    <img
      v-if="src && !failed"
      ref="imgRef"
      :src="src"
      :alt="alt"
      class="machinery-photo-img"
      :class="{ 'is-ready': loaded }"
      @load="onLoad"
      @error="onError"
    />
    <span v-if="src && !loaded && !failed" class="sk-bone machinery-photo-bone" aria-hidden="true"></span>
    <slot v-if="failed" />
  </span>
</template>

<script>
import { nextTick, ref, watch } from 'vue'

export default {
  name: 'MachineryPhoto',
  props: {
    src: { type: String, default: '' },
    alt: { type: String, default: '' },
    fill: { type: Boolean, default: true }
  },
  setup(props) {
    const loaded = ref(false)
    const failed = ref(false)
    const imgRef = ref(null)

    async function reveal(img) {
      if (!img) return
      try {
        if (img.decode) await img.decode()
      } catch {
        // The load event already means the file is complete.
      }
      if (imgRef.value === img) loaded.value = true
    }

    async function settleIfComplete() {
      await nextTick()
      const img = imgRef.value
      if (!img || !img.complete) return
      if (img.naturalWidth > 0) reveal(img)
      else failed.value = true
    }

    watch(() => props.src, () => {
      loaded.value = false
      failed.value = false
      settleIfComplete()
    }, { immediate: true })

    const onLoad = (event) => {
      reveal(event.target)
    }

    const onError = () => {
      failed.value = true
      loaded.value = false
    }

    return { loaded, failed, imgRef, onLoad, onError }
  }
}
</script>

<style scoped>
.machinery-photo {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-width: 0;
}

.machinery-photo.is-fill {
  height: 100%;
  align-self: stretch;
}

.machinery-photo-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
}

.machinery-photo-img.is-ready {
  opacity: 1;
}

.machinery-photo-bone {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  border-radius: inherit;
}
</style>
