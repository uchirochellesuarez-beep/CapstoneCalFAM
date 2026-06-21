<template>
  <div class="financial-container glass-module-page seed-fertilizer-plan" :class="{ 'light-theme': isLight }">
    <div class="page-header">
      <div class="header-content">
        <h1>Seed &amp; Fertilizer Plan</h1>
      </div>
    </div>

    <div v-if="!barangayId" class="tab-content">
      <div class="empty-state">
        <div class="empty-title">Walang barangay</div>
        <div class="empty-text">Kailangan ang barangay assignment para sa pahinang ito.</div>
      </div>
    </div>

    <div v-else class="tab-content tab-content--main">
      <div class="page-header inner-banner">
        <h1 class="page-title">Pamamahagi ng binhi at pataba</h1>
        <p class="page-subtitle inner-subtitle">
          ₱{{ formatMoney(perSack) }} bawat sako • Tala ng bayad ay sumasalamin sa Share Capital
        </p>
      </div>

      <div v-if="error" class="info-banner info-banner--error">
        <strong>Error:</strong> {{ error }}
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="stat-label">Naipamahagi (linya)</div>
          <div class="stat-value">{{ planStats.rows }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Fully paid</div>
          <div class="stat-value">{{ planStats.paidFull }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">May natitira</div>
          <div class="stat-value">{{ planStats.withBalance }}</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Kabuuang balance</div>
          <div class="stat-value">₱{{ formatMoney(planStats.totalRemaining) }}</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Naipamahagi na ang tulong (barangay mo)</h2>
            <p class="card-sub">
              Dapat (sako × ₱{{ formatMoney(perSack) }}), nabayad, natitira — kasaysayan ng bayad sa bawat hilera.
            </p>
            <p class="card-sub note-sub">
              Lalabas lang ang status na <strong>Distributed</strong> o <strong>Confirmed Received</strong>.
            </p>
          </div>
          <button type="button" class="btn btn-primary-action" :disabled="loading" @click="loadRows">Refresh</button>
        </div>

        <div class="table-container">
          <table class="data-table data-table--wide">
            <thead>
              <tr>
                <th>Magsasaka</th>
                <th>Uri</th>
                <th>Sako</th>
                <th>Dapat</th>
                <th>Nabayad</th>
                <th>Natitira</th>
                <th>Status</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="8">Naglo-load...</td>
              </tr>
              <tr v-else-if="rows.length === 0">
                <td colspan="8">Walang naitalang distribution (naipamahagi) para sa binhi/pataba.</td>
              </tr>
              <template v-else>
              <template v-for="r in rows" :key="r.distribution_id">
                <tr>
                  <td class="name">
                    {{ r.farmer_name }}
                    <div class="sub">{{ r.reference_number || '—' }}</div>
                  </td>
                  <td>{{ formatAssistanceType(r.assistance_type) }}</td>
                  <td>{{ r.sack_count }}</td>
                  <td class="amount">₱{{ formatMoney(r.expected_pesos) }}</td>
                  <td class="amount">₱{{ formatMoney(r.paid_pesos) }}</td>
                  <td class="amount">
                    <span :class="{ 'text-warn': r.remaining_pesos > 0 }">₱{{ formatMoney(r.remaining_pesos) }}</span>
                  </td>
                  <td>
                    <span class="badge badge-dist">{{ distributionStatusLabel(r) }}</span>
                  </td>
                  <td class="actions">
                    <button
                      v-if="r.remaining_pesos > 0.009"
                      type="button"
                      class="btn btn-small"
                      :disabled="busyId === r.distribution_id"
                      @click="openPayModal(r)"
                    >
                      Magtala ng bayad
                    </button>
                    <span v-else class="muted">Tapos na ang bayad</span>
                  </td>
                </tr>
                <tr v-if="(r.payments || []).length > 0" class="sub-row">
                  <td colspan="8">
                    <div class="pay-history">
                      <strong>Kasaysayan ng bayad:</strong>
                      <ul>
                        <li v-for="p in r.payments" :key="p.id">
                          <span class="pay-date">{{ formatDate(p.contribution_date) }}</span>
                          — ₱{{ formatMoney(p.amount) }}
                        </li>
                      </ul>
                    </div>
                  </td>
                </tr>
              </template>
              </template>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- Modal: record payment -->
    <Teleport to="body">
      <div v-if="payModal" class="modal-overlay" @click.self="closePayModal">
        <div class="modal-box payment-modal-box">
          <h3 class="modal-title">Record Payment</h3>
          <p class="modal-meta">
            {{ payModal.farmer_name }} · {{ formatAssistanceType(payModal.assistance_type) }} · Remaining:
            <strong>₱{{ formatMoney(payModal.remaining_pesos) }}</strong>
          </p>
          <div class="form-group">
            <label>Payment Date</label>
            <input v-model="payDate" type="date" class="input" />
          </div>
          <div class="form-group">
            <label>Amount (max ₱{{ formatMoney(payModal.remaining_pesos) }})</label>
            <TypedNumberInput v-model="payAmount" :min="0" :max="payModal.remaining_pesos" input-class="input" />
          </div>
          <div class="form-group">
            <label>Payment Method</label>
            <select v-model="payMethod" class="input">
              <option value="Cash">Cash</option>
              <option value="GCash">GCash</option>
            </select>
          </div>
          <div class="form-group auto-receipt-note">
            <label>Official Receipt</label>
            <input type="text" class="input" value="Auto-generated (RCPT-YYYY-######)" disabled />
          </div>
          <div class="modal-actions">
            <button type="button" class="btn btn-muted" @click="closePayModal">Cancel</button>
            <button type="button" class="btn btn-success" :disabled="paySubmitting" @click="submitPayment">Record &amp; Print Receipt</button>
          </div>
        </div>
      </div>
      <div v-if="showReceiptModal && lastReceipt" class="modal-overlay receipt-modal-overlay" @click.self="closeReceiptModal">
        <div class="modal-box receipt-modal-box" @click.stop>
          <PaymentReceiptPrint :receipt="lastReceipt" :auto-print="receiptAutoPrint" @close="closeReceiptModal" />
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import { useAuthStore } from '../stores/authStore'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import TypedNumberInput from '../components/TypedNumberInput.vue'
import { usePaymentReceipt } from '../composables/usePaymentReceipt'
import { useBackdropTheme } from '../composables/useBackdropTheme'

const authStore = useAuthStore()
const { isDark } = useBackdropTheme()
const isLight = computed(() => !isDark.value)

const barangayId = computed(() => {
  const id = authStore.currentUser?.barangay_id
  return id != null ? parseInt(String(id), 10) : null
})

const rows = ref([])
const planStats = computed(() => {
  const list = rows.value || []
  let totalRemaining = 0
  let paidFull = 0
  for (const r of list) {
    const rem = parseFloat(r.remaining_pesos || 0)
    totalRemaining += Number.isFinite(rem) ? rem : 0
    if (rem <= 0.009) paidFull += 1
  }
  const withBalance = list.filter((r) => parseFloat(r.remaining_pesos || 0) > 0.009).length
  return {
    rows: list.length,
    paidFull,
    withBalance,
    totalRemaining,
  }
})
const perSack = ref(50)
const loading = ref(false)
const error = ref('')
const busyId = ref(null)

const payModal = ref(null)
const payDate = ref('')
const payAmount = ref(0)
const payMethod = ref('Cash')
const paySubmitting = ref(false)

const { showReceiptModal, lastReceipt, receiptAutoPrint, showAndPrintReceipt, closeReceiptModal } = usePaymentReceipt()

function formatAssistanceType(type) {
  const map = { fertilizer: 'Pataba', seeds: 'Binhi', both: 'Pataba at Binhi' }
  return map[type] || type || '—'
}

function formatDate(value) {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return String(value)
  return d.toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' })
}

function formatMoney(value) {
  const n = parseFloat(value || 0)
  return Number.isFinite(n) ? n.toLocaleString() : '0'
}

function distributionStatusLabel(r) {
  const remaining = parseFloat(r?.remaining_pesos || 0)
  const paid = parseFloat(r?.paid_pesos || 0)
  if (remaining <= 0.009) return 'Fully Paid'
  if (paid > 0.009) return 'Partial / Pending'
  return 'Pending Payment'
}

function todayISO() {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

async function apiFetch(path, options = {}) {
  const headers = {
    ...(options.headers || {}),
    Authorization: `Bearer ${authStore.token}`
    }
  const res = await fetch(path, { ...options, headers })
  if (res.status === 401) {
    throw new Error('Nag-expire ang session. Mag-login muli.')
  }
  return res
}

async function loadRows() {
  if (!barangayId.value) return
  error.value = ''
  loading.value = true
  try {
    const res = await apiFetch(`/api/seed-fertilizer-plan/barangay/${barangayId.value}`)
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Hindi ma-load ang listahan.')
    }
    rows.value = data.rows || []
    if (data.per_sack_php != null) perSack.value = Number(data.per_sack_php) || 50
  } catch (e) {
    error.value = e.message
  } finally {
    loading.value = false
  }
}

function openPayModal(r) {
  payModal.value = r
  payDate.value = todayISO()
  payMethod.value = 'Cash'
  payAmount.value = Math.round(parseFloat(r.remaining_pesos) * 100) / 100
}

function closePayModal() {
  payModal.value = null
}

async function submitPayment() {
  if (!payModal.value) return
  const amt = parseFloat(payAmount.value)
  if (!Number.isFinite(amt) || amt <= 0) {
    error.value = 'Maglagay ng wastong halaga.'
    return
  }
  if (!payDate.value) {
    error.value = 'Piliin ang petsa ng bayad.'
    return
  }

  busyId.value = payModal.value.distribution_id
  paySubmitting.value = true
  error.value = ''
  try {
    const res = await apiFetch(
      `/api/seed-fertilizer-plan/distribution/${payModal.value.distribution_id}/payment`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: amt,
          contribution_date: payDate.value,
          payment_method: payMethod.value
    })
    }
    )
    const data = await res.json().catch(() => null)
    if (!res.ok || !data?.success) {
      throw new Error(data?.message || 'Hindi na-save.')
    }
    closePayModal()
    await loadRows()
    if (data.receipt_number) {
      try {
        await showAndPrintReceipt(data.receipt_number)
      } catch (receiptErr) {
        console.error('Receipt print failed:', receiptErr)
      }
    }
  } catch (e) {
    error.value = e.message
  } finally {
    busyId.value = null
    paySubmitting.value = false
  }
}

onMounted(async () => {
  if (!authStore.token) return
  await loadRows()
})
</script>

<style scoped>
/* ===== GLASSMORPHIC GREEN THEME (aligned with Machinery Financial → Dues) ===== */
.financial-container {
  --glass-bg: rgba(29, 43, 33, 0.92);
  --glass-bg-soft: rgba(35, 52, 41, 0.84);
  --glass-panel: rgba(31, 48, 36, 0.94);
  --glass-line: rgba(255, 255, 255, 0.1);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --text-soft: rgba(220, 238, 211, 0.62);
  --green: #34d399;
  --yellow: #86efac;
  --lime: #a3e635;
  --red: #f87171;

  min-height: 100vh;
  padding: 28px;
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  position: relative;
  isolation: isolate;
  overflow: visible;
  font-family: 'Inter', 'Segoe UI', system-ui, sans-serif;
  color: var(--text-main);
}

.financial-container::before,
.financial-container::after {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  z-index: -1;
}

.financial-container::before {
  background:
    radial-gradient(ellipse 82% 56% at 12% 88%, rgba(17, 94, 41, 0.22) 0%, transparent 62%),
    radial-gradient(ellipse 75% 55% at 92% 10%, rgba(34, 197, 94, 0.14) 0%, transparent 64%),
    radial-gradient(circle at 50% 16%, rgba(45, 212, 191, 0.11) 0%, transparent 22%),
    linear-gradient(130deg, rgba(163, 230, 53, 0.03) 0%, transparent 38%, rgba(45, 212, 191, 0.03) 100%);
  animation: ambienceDrift 16s ease-in-out infinite alternate;
}

.financial-container::after {
  background:
    radial-gradient(circle at 94% 8%, rgba(34, 197, 94, 0.2) 0%, transparent 17%),
    radial-gradient(circle at 8% 86%, rgba(74, 222, 128, 0.16) 0%, transparent 20%),
    radial-gradient(circle at 80% 74%, rgba(45, 212, 191, 0.18) 0%, transparent 18%),
    radial-gradient(circle at 22% 30%, rgba(163, 230, 53, 0.14) 0%, transparent 16%),
    repeating-linear-gradient(115deg, rgba(255, 255, 255, 0.015) 0px, rgba(255, 255, 255, 0.015) 1px, transparent 1px, transparent 14px);
  filter: blur(10px);
  animation: orbPulse 11s ease-in-out infinite;
}

@keyframes ambienceDrift {
  0% {
    transform: translate3d(0, 0, 0) scale(1);
  }
  100% {
    transform: translate3d(-10px, 8px, 0) scale(1.03);
  }
}

@keyframes orbPulse {
  0%,
  100% {
    opacity: 0.9;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
}

.financial-container > * {
  position: relative;
  z-index: 1;
}

.financial-container > .tab-content {
  margin-top: 22px;
}

.page-header {
  margin-bottom: 0;
  padding: 36px 40px;
  background: linear-gradient(135deg, rgba(28, 41, 31, 0.94) 0%, rgba(35, 54, 40, 0.9) 56%, rgba(48, 78, 62, 0.84) 100%);
  border-radius: 26px;
  border: 1px solid var(--glass-line);
  box-shadow:
    18px 18px 34px rgba(8, 14, 10, 0.5),
    -14px -14px 26px rgba(42, 61, 46, 0.4),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset -1px -1px 0 rgba(0, 0, 0, 0.34);
  position: relative;
  overflow: hidden;
  text-align: left;
}

.header-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  width: 100%;
  max-width: none;
  align-items: flex-start;
  text-align: left;
}

.page-header::before {
  content: '';
  position: absolute;
  inset: -35% -10% auto auto;
  width: 240px;
  height: 240px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(45, 212, 191, 0.22) 0%, rgba(45, 212, 191, 0) 68%);
  pointer-events: none;
}

.page-header::after {
  content: '';
  position: absolute;
  inset: auto auto -50% -8%;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(163, 230, 53, 0.18) 0%, rgba(163, 230, 53, 0) 70%);
  pointer-events: none;
}

.page-header h1 {
  font-size: 38px;
  font-weight: 900;
  line-height: 1.05;
  letter-spacing: -0.9px;
  margin: 0;
  width: 100%;
  text-align: left;
  background: linear-gradient(90deg, #86efac 0%, #4ade80 45%, #22c55e 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.financial-container.seed-fertilizer-plan:not(.light-theme) .page-header h1 {
  background: none;
  -webkit-background-clip: border-box;
  background-clip: border-box;
  color: #ffffff;
  -webkit-text-fill-color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.35);
}

.financial-container.seed-fertilizer-plan:not(.light-theme) :is(
  .page-subtitle,
  .page-title,
  .inner-subtitle,
  .card-title,
  .card-sub,
  .stat-label,
  .stat-value,
  .empty-title,
  .empty-text,
  .name,
  .sub,
  .pay-history,
  .pay-date,
  .info-banner,
  .muted,
  .modal-title,
  .modal-meta,
  .form-group label
) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.seed-fertilizer-plan:not(.light-theme) :is(
  .card-sub,
  .note-sub,
  .sub,
  .muted,
  .empty-text
) {
  opacity: 0.92;
}

.financial-container.seed-fertilizer-plan:not(.light-theme) .tab-content .data-table :is(th, td) {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.seed-fertilizer-plan:not(.light-theme) .tab-content table.data-table tbody td.amount {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.seed-fertilizer-plan:not(.light-theme) .badge-dist {
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
}

.financial-container.seed-fertilizer-plan.light-theme {
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  background: linear-gradient(155deg, #d8f3de 0%, #bfeccc 42%, #a8e4b8 100%) !important;
  color: var(--text-main);
}

.financial-container.seed-fertilizer-plan.light-theme .page-header {
  background: linear-gradient(135deg, #ffffff 0%, #f0fdf4 100%) !important;
  border: 2px solid #86efac !important;
}

.financial-container.seed-fertilizer-plan.light-theme .page-header h1 {
  background: none !important;
  -webkit-background-clip: border-box !important;
  background-clip: border-box !important;
  -webkit-text-fill-color: #052e16 !important;
  color: #052e16 !important;
  text-shadow: none;
}

.financial-container.seed-fertilizer-plan.light-theme :is(
  .page-title,
  .page-subtitle,
  .inner-subtitle,
  .card-title,
  .card-sub,
  .stat-label,
  .stat-value,
  .name,
  .sub,
  .pay-history,
  .modal-title,
  .form-group label
) {
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .stat-card {
  background: #ffffff !important;
  border: 2px solid rgba(22, 101, 52, 0.38) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .card {
  background: #ffffff !important;
  border: 2px solid rgba(22, 101, 52, 0.38) !important;
}

.page-subtitle {
  color: var(--text-muted);
  margin: 0;
  font-size: 16px;
  line-height: 1.45;
  font-weight: 500;
}

.page-title {
  margin: 0;
  font-size: clamp(1.25rem, 3vw, 1.45rem);
  line-height: 1.2;
  font-weight: 800;
  color: var(--text-main);
}

.inner-subtitle {
  font-size: 14px;
  color: var(--text-soft);
}

.tab-content {
  background: var(--glass-bg);
  border: 1px solid var(--glass-line);
  border-radius: 18px;
  padding: 24px 28px;
  backdrop-filter: blur(18px);
  box-shadow:
    14px 14px 26px rgba(8, 13, 10, 0.5),
    0 0 0 1px rgba(20, 32, 24, 0.45),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset 0 -26px 30px rgba(0, 0, 0, 0.2);
  position: relative;
  overflow: hidden;
}

.tab-content::before {
  content: '';
  position: absolute;
  inset: 0;
  background:
    radial-gradient(circle at 12% 10%, rgba(163, 230, 53, 0.08) 0%, rgba(163, 230, 53, 0) 28%),
    radial-gradient(circle at 88% 88%, rgba(45, 212, 191, 0.08) 0%, rgba(45, 212, 191, 0) 30%);
  pointer-events: none;
}

.tab-content--main {
  padding-top: 22px;
}

.tab-content .page-header.inner-banner {
  margin-bottom: 20px;
  padding: 22px 26px;
  border-radius: 20px;
  text-align: left;
}

.tab-content .page-header.inner-banner :is(.page-title, .page-subtitle) {
  text-align: left;
  width: 100%;
}

.info-banner {
  padding: 12px 16px;
  border-radius: 12px;
  margin-bottom: 18px;
  font-size: 14px;
  line-height: 1.45;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(0, 0, 0, 0.2);
  color: var(--text-main);
  position: relative;
  z-index: 1;
}

.info-banner--error {
  background: rgba(248, 113, 113, 0.12);
  border-color: rgba(248, 113, 113, 0.35);
  color: #fecaca;
}

.stats-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 20px;
  position: relative;
  z-index: 1;
}

.stat-card {
  background: linear-gradient(145deg, rgba(32, 48, 37, 0.92), rgba(24, 36, 28, 0.88));
  border: 1px solid rgba(190, 235, 203, 0.22);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow:
    8px 8px 18px rgba(8, 13, 10, 0.38),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
}

.stat-label {
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.6px;
  text-transform: uppercase;
  color: var(--text-soft);
  margin-bottom: 6px;
}

.stat-value {
  font-size: 1.65rem;
  font-weight: 900;
  color: #bbf7d0;
  letter-spacing: -0.02em;
  line-height: 1.15;
}

.tab-content .card {
  background: rgba(22, 35, 27, 0.78);
  border: 1px solid var(--glass-line);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    12px 12px 22px rgba(8, 13, 10, 0.42),
    inset 0 1px 0 rgba(255, 255, 255, 0.06);
  margin-bottom: 0;
  padding: 0;
  position: relative;
  z-index: 1;
}

.tab-content .card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  background: rgba(0, 0, 0, 0.14);
}

.tab-content .card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
}

.card-sub {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}

.note-sub {
  margin-top: 8px;
  font-size: 12px;
  color: var(--text-soft);
}

.btn {
  padding: 10px 18px;
  border-radius: 12px;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(22, 163, 74, 0.18));
  color: var(--green);
  font-weight: 800;
  cursor: pointer;
  font-size: 14px;
  transition: transform 0.2s ease, box-shadow 0.2s ease, border-color 0.2s ease;
}

.btn:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(74, 222, 128, 0.55);
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-small {
  padding: 6px 12px;
  font-size: 12px;
  border-radius: 10px;
}

.btn-primary-action {
  padding: 12px 22px;
  border-radius: 12px;
  cursor: pointer;
  font-weight: 700;
  font-size: 14px;
  transition: all 0.2s ease;
  backdrop-filter: blur(10px);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(96, 165, 250, 0.18));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.3);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-primary-action:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.34), rgba(96, 165, 250, 0.28));
  border-color: var(--green);
  transform: translateY(-2px);
}

.btn-muted {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  border: 1px solid rgba(255, 255, 255, 0.12);
}

.btn-muted:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  border-color: rgba(255, 255, 255, 0.18);
  transform: translateY(-2px);
}

.btn-success {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.32), rgba(74, 222, 128, 0.2));
  color: var(--green);
  border: 1px solid rgba(74, 222, 128, 0.4);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.2);
}

.btn-success:hover:not(:disabled) {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.42), rgba(74, 222, 128, 0.3));
  border-color: var(--green);
  transform: translateY(-2px);
}

.tab-content .data-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 14px;
}

.tab-content .data-table thead {
  background: rgba(74, 222, 128, 0.08);
}

.tab-content .data-table th {
  padding: 12px 14px;
  text-align: left;
  font-weight: 800;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  font-size: 12px;
  text-transform: uppercase;
  letter-spacing: 0.6px;
}

.tab-content .data-table td {
  padding: 12px 14px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 600;
}

.tab-content .data-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.tab-content .data-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.1);
}

.tab-content table.data-table tbody td.amount {
  font-size: 15px;
  font-weight: 800;
  color: #b7f7c8;
  font-family: ui-monospace, 'Courier New', monospace;
  white-space: nowrap;
  line-height: 1.25;
}

.table-container {
  overflow-x: auto;
}

.data-table--wide {
  min-width: 880px;
}

.name {
  font-weight: 700;
  color: var(--text-main);
}

.sub {
  font-size: 12px;
  font-weight: 500;
  color: var(--text-soft);
  margin-top: 2px;
}

.text-warn {
  color: #fbbf24;
}

.badge {
  display: inline-block;
  padding: 4px 10px;
  border-radius: 999px;
  font-size: 11px;
  font-weight: 700;
}

.badge-dist {
  background: rgba(45, 212, 191, 0.16);
  color: #99f6e4;
  border: 1px solid rgba(45, 212, 191, 0.28);
}

.sub-row td {
  background: rgba(0, 0, 0, 0.18);
  padding-top: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.pay-history {
  font-size: 13px;
  color: var(--text-muted);
  padding: 8px 0 12px 12px;
}

.pay-history ul {
  margin: 6px 0 0;
  padding-left: 18px;
}

.pay-date {
  font-weight: 700;
  color: var(--text-main);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-soft);
}

.empty-title {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-main);
  margin-bottom: 8px;
}

.empty-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}

.muted {
  color: var(--text-soft);
  font-size: 13px;
}

.modal-overlay {
  /* Teleport renders under body — vars must live here, not on .financial-container */
  --glass-panel: rgba(31, 48, 36, 0.94);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --green: #34d399;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  padding: 16px;
  backdrop-filter: blur(4px);
}

.modal-box {
  background: var(--glass-panel);
  border: 1px solid var(--glass-line-strong);
  border-radius: 20px;
  padding: 22px 24px;
  max-width: 400px;
  width: 100%;
  box-shadow:
    20px 20px 40px rgba(0, 0, 0, 0.4),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  color: var(--text-main);
}

.modal-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 800;
  color: var(--text-main);
}

.modal-meta {
  margin: 0 0 16px;
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.4;
}

.form-group {
  margin-bottom: 14px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  display: block;
  font-size: 13px;
  font-weight: 700;
  margin-bottom: 8px;
  color: var(--text-main);
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.input {
  width: 100%;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(39, 58, 45, 0.92);
  color: var(--text-main);
  font-family: inherit;
  font-size: 14px;
  min-height: 42px;
}

.input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
}

.modal-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 18px;
}

@media (max-width: 768px) {
  .financial-container {
    padding: 16px;
  }

  .page-header {
    padding: 24px 20px;
  }

  .page-header h1 {
    font-size: 30px;
    line-height: 1.12;
  }

  .page-subtitle {
    font-size: 14px;
  }

  .tab-content {
    padding: 18px 16px;
  }
}
</style>
