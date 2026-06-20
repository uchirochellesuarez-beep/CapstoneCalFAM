<template>
  <div class="foundation-panel">
    <div class="foundation-panel-head">
      <span class="foundation-title-icon" aria-hidden="true">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
        </svg>
      </span>
      <div>
        <h3 v-if="showTitle" class="foundation-title">Pundasyong datos (lumang gastos)</h3>
        <p class="foundation-desc">
          Mag-upload ng <strong>listahan ng nakaraang kabuuang gastos</strong> (hal. nakaraang mga season bago gamitin ang app)
          bilang batayan ng modelo. Tinatanggap: <code>.json</code> o <code>.csv</code> — hanggang 120 na puntos.
        </p>
      </div>
    </div>

    <details class="foundation-format-block">
      <summary class="foundation-format-toggle">
        <span class="format-toggle-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
        </span>
        Format ng JSON at CSV
      </summary>
      <div class="foundation-format-body">
        <p class="foundation-format">
          <strong>JSON:</strong> kailangan ang <code>farmer_id</code> na tumutugma sa magsasakang ito. Ang
          <code>period_index</code> ay opsyonal (awtomatikong 1, 2, 3… kung wala). Kung 4-digit na taon (hal.
          <code>2026</code>), ginagamit iyan para ipwesto ang puntos sa timeline.
        </p>
        <pre class="format-sample"><code>{{ jsonExample }}</code></pre>
        <p class="format-id-note">ID na ginagamit: <strong>{{ farmerId }}</strong></p>
        <p class="foundation-format">
          <strong>CSV:</strong> dapat may column na <code>farmer_id</code> at <code>total_expenses</code>; opsyonal na
          <code>period_index</code>. Puwede ang <code>80,000</code> na may kuwit sa Excel export.
        </p>
      </div>
    </details>

    <div v-if="foundationError" class="alert alert-error foundation-alert">{{ foundationError }}</div>
    <div v-if="foundationSuccess" class="alert alert-success foundation-alert">{{ foundationSuccess }}</div>

    <div class="foundation-status-card" :class="{ 'has-data': summary && summary.count > 0 }">
      <span class="status-card-icon" aria-hidden="true">
        <svg v-if="summary && summary.count > 0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M22 11.08V12a10 10 0 11-5.93-9.14" />
          <polyline points="22 4 12 14.01 9 11.01" />
        </svg>
        <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
      </span>
      <p v-if="summary && summary.count > 0" class="foundation-status">
        Kasalukuyan: <strong>{{ summary.count }}</strong> puntong naka-save
        <span v-if="summary.updated_at">(huling update: {{ formatShortDate(summary.updated_at) }})</span>
      </p>
      <p v-else class="foundation-status muted">Walang naka-upload na pundasyon para sa ID na ito.</p>
    </div>

    <p class="foundation-file-hint">
      Lalabas ang lahat ng file sa folder. Kung galing sa Excel, i-<strong>Save As → CSV UTF-8</strong> muna
      (dapat makita sa filename ang <code>.csv</code>).
    </p>

    <div class="foundation-actions">
      <input
        ref="fileInputRef"
        type="file"
        class="file-input-hidden"
        @change="onFileSelected"
      />
      <button type="button" class="btn-foundation primary" :disabled="loading" @click="triggerPick">
        <span class="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
        </span>
        {{ loading ? 'Pinoproseso…' : 'Pumili ng file at i-upload' }}
      </button>
      <button
        type="button"
        class="btn-foundation secondary"
        :disabled="loading || !summary?.count"
        @click="clearFoundation"
      >
        <span class="btn-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M3 6h18" />
            <path d="M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6" />
            <path d="M10 11v6M14 11v6" />
          </svg>
        </span>
        Alisin ang pundasyon
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, computed } from 'vue'
import { useAuthStore } from '../stores/authStore'

const props = defineProps({
  farmerId: { type: Number, required: true },
  showTitle: { type: Boolean, default: true }
})

const jsonExample = computed(() => {
  const id = props.farmerId
  return `{ "farmer_id": ${id}, "points": [ { "farmer_id": ${id}, "total_expenses": 45000, "period_index": 1 }, { "farmer_id": ${id}, "total_expenses": 52000 } ] }`
})

const emit = defineEmits(['uploaded', 'cleared'])

const authStore = useAuthStore()
const fileInputRef = ref(null)
const loading = ref(false)
const summary = ref(null)
const foundationError = ref('')
const foundationSuccess = ref('')

const formatShortDate = (iso) => {
  if (!iso) return ''
  try {
    return new Date(iso).toLocaleString('fil-PH', {
      dateStyle: 'medium',
      timeStyle: 'short'
    })
  } catch {
    return String(iso)
  }
}

const fetchSummary = async () => {
  if (!props.farmerId || !authStore.token) {
    summary.value = null
    return
  }
  foundationError.value = ''
  try {
    const res = await fetch(
      `/api/farmer-income/expense-history-foundation/${props.farmerId}`,
      { headers: { Authorization: `Bearer ${authStore.token}` } }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi makuha ang pundasyon.')
    summary.value = data
  } catch (e) {
    summary.value = null
    foundationError.value = e.message || String(e)
  }
}

const MSG_EXCEL =
  'Ang napili ay Excel workbook (.xlsx / .xls), hindi CSV. Sa Excel: File → Save As → piliin ang **CSV UTF-8 (Comma delimited) (*.csv)** (o *CSV Comma delimited*), i-save, tapos i-upload ang bagong file na may dugtong .csv sa pangalan.'

const MSG_GENERIC =
  'Pumili ng file na may dugtong .csv, .json, o .txt — na-export mula sa Excel bilang CSV, hindi bilang .xlsx.'

function validateFoundationUploadFile(file) {
  const name = (file.name || '').toLowerCase()
  const mime = String(file.type || '').toLowerCase()

  if (name.endsWith('.xlsx') || name.endsWith('.xls')) {
    return MSG_EXCEL
  }
  if (
    mime.includes('spreadsheetml.sheet') ||
    mime === 'application/vnd.ms-excel.sheet.macroenabled.12' ||
    (mime.includes('excel') && !name.endsWith('.csv'))
  ) {
    return MSG_EXCEL
  }

  if (
    name.endsWith('.csv') ||
    name.endsWith('.json') ||
    name.endsWith('.txt')
  ) {
    return null
  }
  if (
    mime === 'text/csv' ||
    mime === 'application/csv' ||
    mime === 'text/comma-separated-values' ||
    mime === 'application/json' ||
    mime.endsWith('+json')
  ) {
    return null
  }
  if ((mime === 'text/plain' || mime === '') && !name.includes('.')) {
    return `${MSG_GENERIC} (Sa Windows, i-on ang “File name extensions” sa View → Show → File name extensions para makita kung .csv o .xlsx ang file.)`
  }
  return MSG_GENERIC
}

const triggerPick = () => {
  foundationSuccess.value = ''
  foundationError.value = ''
  fileInputRef.value?.click()
}

const onFileSelected = async (ev) => {
  const file = ev.target.files?.[0]
  if (!file || !props.farmerId) return
  const rejectReason = validateFoundationUploadFile(file)
  if (rejectReason) {
    foundationError.value = rejectReason
    ev.target.value = ''
    return
  }
  loading.value = true
  foundationError.value = ''
  foundationSuccess.value = ''
  try {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch(
      `/api/farmer-income/expense-history-foundation/${props.farmerId}`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${authStore.token}` },
        body: fd
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi na-upload.')
    foundationSuccess.value = data.message || 'Matagumpay.'
    await fetchSummary()
    emit('uploaded', data)
  } catch (e) {
    foundationError.value = e.message || String(e)
  } finally {
    loading.value = false
    ev.target.value = ''
  }
}

const clearFoundation = async () => {
  if (!props.farmerId || !summary.value?.count) return
  loading.value = true
  foundationError.value = ''
  foundationSuccess.value = ''
  try {
    const res = await fetch(
      `/api/farmer-income/expense-history-foundation/${props.farmerId}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${authStore.token}` }
      }
    )
    const data = await res.json()
    if (!res.ok) throw new Error(data.error || 'Hindi naalis.')
    foundationSuccess.value = data.message || 'Naalis.'
    await fetchSummary()
    emit('cleared')
  } catch (e) {
    foundationError.value = e.message || String(e)
  } finally {
    loading.value = false
  }
}

watch(
  () => props.farmerId,
  () => {
    fetchSummary()
  }
)

onMounted(() => {
  fetchSummary()
})

defineExpose({ fetchSummary })
</script>

<style scoped>
.foundation-panel {
  margin-top: 0.5rem;
  padding: 1.25rem 1.35rem;
  border-radius: 18px;
  border: 1px solid rgba(126, 184, 145, 0.28);
  background: linear-gradient(145deg, rgba(24, 48, 34, 0.96), rgba(14, 33, 23, 0.94));
  box-shadow: 0 12px 28px rgba(5, 12, 8, 0.22);
  color: rgba(236, 253, 245, 0.92);
}

.foundation-panel-head {
  display: flex;
  align-items: flex-start;
  gap: 0.85rem;
  margin-bottom: 1rem;
}

.foundation-title-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.22), rgba(34, 197, 94, 0.14));
  border: 1px solid rgba(134, 239, 172, 0.35);
  color: #86efac;
}

.foundation-title-icon svg {
  width: 1.2rem;
  height: 1.2rem;
  stroke: currentColor;
}

.foundation-title {
  margin: 0 0 0.35rem;
  font-size: 1.08rem;
  font-weight: 800;
  color: #ecfdf5;
}

.foundation-desc {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: rgba(220, 252, 231, 0.82);
}

.foundation-desc strong {
  color: #bbf7d0;
}

.foundation-format-block {
  margin-bottom: 1rem;
  border-radius: 12px;
  border: 1px solid rgba(126, 184, 145, 0.22);
  background: rgba(0, 0, 0, 0.22);
  overflow: hidden;
}

.foundation-format-toggle {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem 1rem;
  cursor: pointer;
  font-weight: 700;
  font-size: 0.9rem;
  color: #bbf7d0;
  list-style: none;
  user-select: none;
}

.foundation-format-toggle::-webkit-details-marker {
  display: none;
}

.format-toggle-icon {
  display: inline-flex;
  color: #86efac;
}

.format-toggle-icon svg {
  width: 1rem;
  height: 1rem;
  stroke: currentColor;
}

.foundation-format-body {
  padding: 0 1rem 1rem;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.foundation-format {
  margin: 0.75rem 0 0.5rem;
  font-size: 0.86rem;
  line-height: 1.5;
  color: rgba(220, 252, 231, 0.78);
}

.foundation-format strong {
  color: #bbf7d0;
}

code {
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
  background: rgba(74, 222, 128, 0.12);
  border: 1px solid rgba(134, 239, 172, 0.22);
  color: #86efac;
  font-size: 0.82em;
}

.format-sample {
  margin: 0.5rem 0;
  padding: 0.75rem 0.85rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.35);
  border: 1px solid rgba(126, 184, 145, 0.2);
  overflow-x: auto;
  font-size: 0.75rem;
  line-height: 1.45;
  color: #d1fae5;
  white-space: pre-wrap;
  word-break: break-word;
}

.format-id-note {
  margin: 0.35rem 0 0;
  font-size: 0.82rem;
  color: rgba(220, 252, 231, 0.65);
}

.format-id-note strong {
  color: #86efac;
}

.foundation-status-card {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  margin: 0.85rem 0;
  padding: 0.75rem 0.9rem;
  border-radius: 12px;
  background: rgba(0, 0, 0, 0.24);
  border: 1px solid rgba(126, 184, 145, 0.2);
}

.foundation-status-card.has-data {
  background: rgba(74, 222, 128, 0.1);
  border-color: rgba(134, 239, 172, 0.32);
}

.status-card-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  color: #fde68a;
  background: rgba(250, 204, 21, 0.12);
}

.foundation-status-card.has-data .status-card-icon {
  color: #86efac;
  background: rgba(74, 222, 128, 0.15);
}

.status-card-icon svg {
  width: 1rem;
  height: 1rem;
  stroke: currentColor;
}

.foundation-status {
  margin: 0;
  font-size: 0.9rem;
  color: #ecfdf5;
  line-height: 1.45;
}

.foundation-status strong {
  color: #bbf7d0;
}

.foundation-status.muted {
  color: rgba(220, 252, 231, 0.65);
}

.foundation-file-hint {
  margin: 0 0 0.85rem;
  font-size: 0.84rem;
  color: rgba(220, 252, 231, 0.68);
  line-height: 1.45;
}

.foundation-file-hint strong {
  color: #bbf7d0;
}

.foundation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.65rem;
}

.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}

.btn-foundation {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  padding: 0.62rem 1rem;
  border-radius: 10px;
  font-size: 0.9rem;
  cursor: pointer;
  font-weight: 700;
  transition: transform 0.18s ease, filter 0.18s ease, box-shadow 0.18s ease;
}

.btn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-icon svg {
  width: 1rem;
  height: 1rem;
  stroke: currentColor;
}

.btn-foundation.primary {
  background: linear-gradient(135deg, #22c55e 0%, #16a34a 100%);
  color: #ffffff;
  border: 1px solid rgba(187, 247, 208, 0.35);
  box-shadow: 0 6px 16px rgba(22, 163, 74, 0.28);
}

.btn-foundation.primary:hover:not(:disabled) {
  transform: translateY(-1px);
  filter: brightness(1.04);
}

.btn-foundation.primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.btn-foundation.secondary {
  background: rgba(127, 29, 29, 0.28);
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.45);
}

.btn-foundation.secondary:hover:not(:disabled) {
  background: rgba(153, 27, 27, 0.42);
  transform: translateY(-1px);
}

.btn-foundation.secondary:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  color: rgba(254, 202, 202, 0.55);
  border-color: rgba(248, 113, 113, 0.25);
}

.foundation-alert {
  margin: 0.5rem 0;
  font-size: 0.88rem;
}

.alert {
  padding: 0.55rem 0.75rem;
  border-radius: 10px;
  line-height: 1.4;
}

.alert-error {
  background: rgba(127, 29, 29, 0.35);
  color: #fecaca;
  border: 1px solid rgba(248, 113, 113, 0.4);
}

.alert-success {
  background: rgba(21, 128, 61, 0.3);
  color: #bbf7d0;
  border: 1px solid rgba(74, 222, 128, 0.4);
}

@media (max-width: 640px) {
  .foundation-panel-head {
    flex-direction: column;
  }

  .foundation-actions {
    flex-direction: column;
  }

  .btn-foundation {
    width: 100%;
    justify-content: center;
  }
}
</style>
