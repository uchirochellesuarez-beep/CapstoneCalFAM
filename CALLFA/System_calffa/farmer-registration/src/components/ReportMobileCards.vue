<template>
  <div class="fcr-mobile-list">
    <p v-if="isEmpty" class="fcr-mobile-empty">{{ emptyText }}</p>
    <article
      v-for="(card, index) in cards"
      :key="card.id != null ? card.id : index"
      class="fcr-mobile-card"
    >
      <div v-for="(row, rowIndex) in card.rows" :key="rowIndex" class="fcr-mobile-row">
        <span class="fcr-mobile-label">{{ row.label }}</span>
        <span class="fcr-mobile-value" :class="{ 'fcr-mobile-value-strong': row.strong }">{{ row.value }}</span>
      </div>
    </article>
    <div v-if="footerRows.length" class="fcr-mobile-totals">
      <h4 v-if="footerTitle" class="fcr-mobile-totals-title">{{ footerTitle }}</h4>
      <div v-for="(row, footerIndex) in footerRows" :key="'footer-' + footerIndex" class="fcr-mobile-row">
        <span class="fcr-mobile-label">{{ row.label }}</span>
        <span class="fcr-mobile-value"><strong>{{ row.value }}</strong></span>
      </div>
    </div>
  </div>
</template>

<script setup>
defineProps({
  cards: { type: Array, default: () => [] },
  isEmpty: { type: Boolean, default: false },
  emptyText: {
    type: String,
    default: 'Walang rekord sa piniling saklaw ng petsa / No records in this period.'
  },
  footerRows: { type: Array, default: () => [] },
  footerTitle: { type: String, default: 'Totals / Kabuuan' }
});
</script>

<style scoped>
.fcr-mobile-list {
  display: none;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}

.fcr-mobile-card,
.fcr-mobile-totals {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1px solid #1e293b;
  border-radius: 8px;
  background: #fff;
  overflow: hidden;
}

.fcr-mobile-card {
  margin-bottom: 12px;
}

.fcr-mobile-totals {
  margin-top: 4px;
}

.fcr-mobile-totals-title {
  margin: 0;
  padding: 10px 12px;
  font-size: 0.82rem;
  font-weight: 800;
  text-align: center;
  background: #f1f5f9;
  border-bottom: 2px solid #0f172a;
  color: #0f172a;
}

.fcr-mobile-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 12px;
  border-bottom: 1px solid #e2e8f0;
}

.fcr-mobile-row:last-child {
  border-bottom: none;
}

.fcr-mobile-label {
  flex: 0 0 46%;
  max-width: 46%;
  font-size: 0.72rem;
  font-weight: 800;
  color: #475569;
  line-height: 1.4;
  text-align: left;
}

.fcr-mobile-value {
  flex: 1;
  min-width: 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: #0f172a;
  text-align: right;
  line-height: 1.4;
  word-break: break-word;
}

.fcr-mobile-value-strong {
  font-weight: 800;
  color: #0f172a;
}

.fcr-mobile-empty {
  margin: 0;
  padding: 16px;
  text-align: center;
  font-size: 0.85rem;
  color: #64748b;
  border: 1px dashed #cbd5e1;
  border-radius: 8px;
  background: #f8fafc;
}

@media (max-width: 1100px) {
  .fcr-mobile-list {
    display: block;
  }
}

@media (max-width: 480px) {
  .fcr-mobile-label {
    flex: 0 0 42%;
    max-width: 42%;
    font-size: 0.68rem;
  }

  .fcr-mobile-value {
    font-size: 0.75rem;
  }
}

@media print {
  .fcr-mobile-list {
    display: none !important;
  }
}
</style>
