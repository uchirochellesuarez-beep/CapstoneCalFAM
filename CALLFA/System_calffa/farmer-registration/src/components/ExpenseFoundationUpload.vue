<template>
  <div class="foundation-panel">
    <h3 v-if="showTitle" class="foundation-title">📂 Pundasyong datos (lumang gastos)</h3>
    <p class="foundation-desc">
      Mag-upload ng <strong>listahan ng nakaraang kabuuang gastos</strong> (hal. nakaraang mga season bago gamitin ang app)
      bilang batayan ng modelo. Tinatanggap: <code>.json</code> o <code>.csv</code> (hindi ang buong Excel <code>.xlsx</code>) — hanggang 120 na puntos.
    </p>
    <p class="foundation-format">
      <strong>JSON:</strong> kailangan ang <code>farmer_id</code> na tumutugma sa magsasakang ito — sa bawat puntos,
      o isang beses sa ugat (lahat ng puntos na walang sariling <code>farmer_id</code> ay mana sa ugat).
      Ang <code>period_index</code> ay <strong>opsyonal</strong> (awtomatikong 1, 2, 3… kung wala).
      Kung 4-digit na <strong>taon</strong> (hal. <code>2026</code>), ginagamit iyan para <strong>ipwesto ang puntos sa timeline</strong>
      kasama ang mga tala sa database (hindi na palaging nasa unahan).
      <br />
      <code class="format-sample">{{ jsonExample }}</code>
      <span class="format-id-note">(ID na ginagamit: <strong>{{ farmerId }}</strong>)</span>
      <br />
      <strong>CSV:</strong> dapat may column na <code>farmer_id</code> (laging tumugma sa napiling magsasaka) at
      <code>total_expenses</code>; opsyonal na <code>period_index</code>. Puwede ang <code>80,000</code> na may kuwit
      (Excel) sa <code>total_expenses</code> — tinatanggap na rin ng server. Walang header: sunud-sunod na
      <code>farmer_id,total_expenses</code> o <code>farmer_id,period_index,total_expenses</code>.
    </p>
    <div v-if="foundationError" class="alert alert-error foundation-alert">{{ foundationError }}</div>
    <div v-if="foundationSuccess" class="alert alert-success foundation-alert">{{ foundationSuccess }}</div>
    <p v-if="summary && summary.count > 0" class="foundation-status">
      Kasalukuyan: <strong>{{ summary.count }}</strong> puntong naka-save
      <span v-if="summary.updated_at">(huling update: {{ formatShortDate(summary.updated_at) }})</span>
    </p>
    <p v-else class="foundation-status muted">Walang naka-upload na pundasyon para sa ID na ito.</p>
    <div class="foundation-actions">
      <!-- Walang accept: sa Windows ang mahigpit na MIME/extension filter ay nagtatago ng .csv sa dialog -->
      <input
        ref="fileInputRef"
        type="file"
        class="file-input-hidden"
        @change="onFileSelected"
      />
      <p class="foundation-file-hint">
        Lalabas ang lahat ng file sa folder. Kung galing sa Excel, i-<strong>Save As → CSV UTF-8</strong> muna
        (dapat makita sa filename ang <code>.csv</code>; ang berdeng icon na workbook ay <code>.xlsx</code> at hindi papasok).
      </p>
      <button type="button" class="btn-foundation primary" :disabled="loading" @click="triggerPick">
        {{ loading ? '⏳…' : '📤 Pumili ng file at i-upload' }}
      </button>
      <button
        type="button"
        class="btn-foundation secondary"
        :disabled="loading || !summary?.count"
        @click="clearFoundation"
      >
        🗑️ Alisin ang pundasyon
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

/** Tinatanggap: .csv / .json / .txt; o tamang MIME (hal. text/csv). Tinatanggihan ang .xlsx. */
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
  margin-bottom: 1.25rem;
  padding: 1rem 1.1rem;
  border-radius: 10px;
  border: 1px solid rgba(22, 101, 52, 0.25);
  background: linear-gradient(135deg, rgba(240, 253, 244, 0.95), rgba(255, 255, 255, 0.98));
}
.foundation-title {
  margin: 0 0 0.5rem 0;
  font-size: 1.05rem;
  color: #14532d;
}
.foundation-file-hint {
  margin: 0 0 0.5rem 0;
  font-size: 0.82rem;
  color: #64748b;
  line-height: 1.4;
}

.foundation-desc,
.foundation-format {
  margin: 0 0 0.5rem 0;
  font-size: 0.88rem;
  line-height: 1.45;
  color: #334155;
}
.foundation-format code {
  font-size: 0.78rem;
  word-break: break-word;
}
.format-sample {
  display: inline-block;
  margin-top: 0.25rem;
  max-width: 100%;
}
.format-id-note {
  display: block;
  font-size: 0.82rem;
  color: #475569;
  margin-top: 0.2rem;
}
.foundation-status {
  margin: 0.5rem 0;
  font-size: 0.9rem;
}
.foundation-status.muted {
  color: #64748b;
}
.foundation-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.6rem;
  margin-top: 0.5rem;
}
.file-input-hidden {
  position: absolute;
  width: 0;
  height: 0;
  opacity: 0;
  pointer-events: none;
}
.btn-foundation {
  padding: 0.5rem 0.9rem;
  border-radius: 8px;
  font-size: 0.9rem;
  cursor: pointer;
  border: none;
  font-weight: 600;
}
.btn-foundation.primary {
  background: #15803d;
  color: #fff;
}
.btn-foundation.primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
.btn-foundation.secondary {
  background: #f1f5f9;
  color: #475569;
  border: 1px solid #cbd5e1;
}
.btn-foundation.secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
.foundation-alert {
  margin: 0.4rem 0;
  font-size: 0.88rem;
}
.alert {
  padding: 0.45rem 0.65rem;
  border-radius: 6px;
}
.alert-error {
  background: #fef2f2;
  color: #b91c1c;
}
.alert-success {
  background: #f0fdf4;
  color: #166534;
}
</style>
