<template>
  <div v-if="show && src" class="proof-preview-overlay" @click.self="$emit('close')">
    <div class="proof-preview-panel">
      <div class="proof-preview-header">
        <strong>{{ title }}</strong>
        <button type="button" class="proof-preview-close" aria-label="Close" @click="$emit('close')">×</button>
      </div>
      <div class="proof-preview-body">
        <img :src="src" alt="Payment proof" class="proof-preview-image" />
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  show: { type: Boolean, default: false },
  src: { type: String, default: '' },
  title: { type: String, default: 'Payment Proof' }
});

defineEmits(['close']);
</script>

<style scoped>
.proof-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 12000;
  background: rgba(0, 0, 0, 0.72);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.proof-preview-panel {
  background: #fff;
  border-radius: 12px;
  max-width: min(560px, 96vw);
  max-height: 92vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.35);
}

.proof-preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #e5e7eb;
}

.proof-preview-close {
  border: none;
  background: transparent;
  font-size: 24px;
  line-height: 1;
  cursor: pointer;
  color: #374151;
}

.proof-preview-body {
  padding: 16px;
  overflow: auto;
  text-align: center;
}

.proof-preview-image {
  max-width: 100%;
  max-height: 70vh;
  border-radius: 8px;
  border: 1px solid #d1d5db;
}
</style>
