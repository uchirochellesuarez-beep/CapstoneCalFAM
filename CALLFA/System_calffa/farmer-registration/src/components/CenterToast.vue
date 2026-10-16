<template>
  <Teleport to="body">
    <div
      v-if="message"
      class="app-center-notice"
      :class="type"
      role="status"
    >
      <span class="app-center-notice-text">{{ message }}</span>
      <button type="button" class="app-center-notice-close" aria-label="Close" @click="$emit('close')">×</button>
    </div>
  </Teleport>
</template>

<script setup>
defineProps({
  message: { type: String, default: '' },
  type: { type: String, default: 'success' }
})
defineEmits(['close'])
</script>

<style>
.app-center-notice {
  position: fixed;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  z-index: 15000;
  display: flex;
  align-items: flex-start;
  gap: 12px;
  width: min(480px, calc(100vw - 2rem));
  padding: 16px 18px;
  border-radius: 14px;
  border: 1px solid #16a34a;
  border-left-width: 6px;
  background: #ffffff;
  color: #052e16;
  -webkit-text-fill-color: #052e16;
  box-shadow: 0 22px 50px rgba(15, 23, 42, 0.35);
  animation: app-center-notice-in 0.18s ease-out;
}

.app-center-notice.error {
  border-color: #dc2626;
  color: #7f1d1d;
  -webkit-text-fill-color: #7f1d1d;
}

.app-center-notice-text {
  flex: 1;
  font-size: 0.95rem;
  font-weight: 700;
  line-height: 1.45;
  white-space: pre-line;
  color: inherit;
  -webkit-text-fill-color: inherit;
}

.app-center-notice-close {
  flex-shrink: 0;
  width: 2rem !important;
  height: 2rem !important;
  min-width: 2rem !important;
  min-height: 2rem !important;
  padding: 0 !important;
  border: 1px solid #94a3b8;
  border-radius: 999px;
  background: #ffffff;
  color: #052e16;
  -webkit-text-fill-color: #052e16;
  font-size: 1.15rem;
  line-height: 1;
  cursor: pointer;
}

.app-center-notice.error .app-center-notice-close {
  color: #7f1d1d;
  -webkit-text-fill-color: #7f1d1d;
}

@keyframes app-center-notice-in {
  from { opacity: 0; }
  to { opacity: 1; }
}
</style>
