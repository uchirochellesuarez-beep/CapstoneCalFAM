<template>
  <div class="financial-container glass-module-page seed-fertilizer-plan" :class="{ 'light-theme': isLight }">
    <div class="page-header page-header-split">
      <div class="page-header-text">
        <h1 class="page-title">{{ $t('ui.seedFertilizerPlan') }}</h1>
        <p class="page-subtitle">{{ $t('ui.seedFertilizerPlanSub') }}</p>
      </div>
    </div>

    <div v-if="!barangayId" class="tab-content">
      <div class="empty-state">
        <div class="empty-title">{{ $t('ui.noBarangay') }}</div>
        <div class="empty-text">{{ $t('ui.barangayRequired') }}</div>
      </div>
    </div>

    <div v-else class="tab-content tab-content--main">
      <p class="ledger-note">
        {{ $t('ui.seedFertLedgerNote', { amount: formatMoney(perSack) }) }}
      </p>

      <div v-if="error" class="info-banner info-banner--error">
        <strong>Error:</strong> {{ error }}
      </div>

      <div class="stats-group stats-group--overview">
        <div class="stats-grid stats-grid--seed-fert">
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.distributedLines') }}</div>
              <div class="stat-value">{{ planStats.rows }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.fullyPaid') }}</div>
              <div class="stat-value">{{ planStats.paidFull }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.withRemaining') }}</div>
              <div class="stat-value">{{ planStats.withBalance }}</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-content">
              <div class="stat-label">{{ $t('ui.totalBalanceLabel') }}</div>
              <div class="stat-value">₱{{ formatMoney(planStats.totalRemaining) }}</div>
            </div>
          </div>
        </div>
      </div>

      <div class="card">
        <div class="card-header">
          <h2 class="card-title">{{ $t('ui.assistanceDistributedBarangay') }}</h2>
          <button type="button" class="btn btn-primary-action" :disabled="loading" @click="loadRows">{{ $t('common.refresh') }}</button>
        </div>
        <p class="card-hint">
          {{ $t('ui.seedFertCardHint', { amount: formatMoney(perSack) }) }}
        </p>

        <div class="table-container">
          <div class="fin-desktop-table">
            <table class="data-table ledger-table ledger-table-seed-fert">
              <colgroup>
                <col class="col-farmer" />
                <col class="col-type" />
                <col class="col-sacks" />
                <col class="col-amount" />
                <col class="col-amount" />
                <col class="col-amount" />
                <col class="col-status" />
                <col class="col-actions" />
              </colgroup>
              <thead>
                <tr>
                  <th class="th-farmer">{{ $t('ui.farmer') }}</th>
                  <th class="th-type">{{ $t('ui.type') }}</th>
                  <th class="th-sacks">{{ $t('ui.sacks') }}</th>
                  <th class="th-amount">{{ $t('ui.dueAmount') }}</th>
                  <th class="th-amount">{{ $t('ui.paidOff') }}</th>
                  <th class="th-amount">{{ $t('ui.remaining') }}</th>
                  <th class="th-status">{{ $t('ui.status') }}</th>
                  <th class="th-actions"></th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="loading">
                  <td colspan="8" class="table-empty">{{ $t('ui.loading') }}</td>
                </tr>
                <tr v-else-if="rows.length === 0">
                  <td colspan="8" class="table-empty">{{ $t('ui.noDistributionYet') }}</td>
                </tr>
                <template v-else>
                  <template v-for="r in rows" :key="r.distribution_id">
                    <tr>
                      <td class="name">
                        {{ r.farmer_name }}
                        <div class="sub">{{ r.reference_number || '—' }}</div>
                      </td>
                      <td>{{ formatAssistanceType(r.assistance_type) }}</td>
                      <td class="td-sacks">{{ r.sack_count }}</td>
                      <td class="td-amount amount">₱{{ formatMoney(r.expected_pesos) }}</td>
                      <td class="td-amount amount">₱{{ formatMoney(r.paid_pesos) }}</td>
                      <td class="td-amount amount">
                        <span :class="{ 'text-warn': r.remaining_pesos > 0 }">₱{{ formatMoney(r.remaining_pesos) }}</span>
                      </td>
                      <td class="td-status">
                        <span class="badge badge-dist">{{ distributionStatusLabel(r) }}</span>
                      </td>
                      <td class="actions-cell">
                        <button
                          v-if="r.remaining_pesos > 0.009"
                          type="button"
                          class="btn btn-small"
                          :disabled="busyId === r.distribution_id"
                          @click="openPayModal(r)"
                        >
                          {{ $t('ui.recordPaymentTl') }}
                        </button>
                        <span v-else class="muted">{{ $t('ui.paymentDone') }}</span>
                      </td>
                    </tr>
                    <tr v-if="(r.payments || []).length > 0" class="sub-row">
                      <td colspan="8">
                        <div class="pay-history">
                          <strong>{{ $t('ui.paymentHistoryColon') }}</strong>
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

          <div class="fin-mobile-list">
            <div v-if="loading" class="fin-mobile-empty">{{ $t('ui.loading') }}</div>
            <div v-else-if="rows.length === 0" class="fin-mobile-empty">
              {{ $t('ui.noDistributionYet') }}
            </div>
            <article
              v-else
              v-for="r in rows"
              :key="'m-' + r.distribution_id"
              class="fin-mobile-card"
            >
              <div class="fin-mobile-card-top">
                <h4 class="fin-mobile-card-name">{{ r.farmer_name }}</h4>
                <span class="badge badge-dist">{{ distributionStatusLabel(r) }}</span>
              </div>
              <div class="fin-mobile-card-meta">
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.refNo') }}</span>
                  <span>{{ r.reference_number || '—' }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.type') }}</span>
                  <span>{{ formatAssistanceType(r.assistance_type) }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.sacks') }}</span>
                  <span>{{ r.sack_count }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.dueAmount') }}</span>
                  <span class="amount">₱{{ formatMoney(r.expected_pesos) }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.paidOff') }}</span>
                  <span class="amount">₱{{ formatMoney(r.paid_pesos) }}</span>
                </div>
                <div class="fin-mobile-meta-row">
                  <span class="fin-mobile-label">{{ $t('ui.remaining') }}</span>
                  <span class="amount" :class="{ 'text-warn': r.remaining_pesos > 0 }">
                    ₱{{ formatMoney(r.remaining_pesos) }}
                  </span>
                </div>
              </div>
              <div v-if="(r.payments || []).length > 0" class="fin-mobile-pay-history">
                <strong>{{ $t('ui.paymentHistoryColon') }}</strong>
                <ul>
                  <li v-for="p in r.payments" :key="'mp-' + p.id">
                    <span class="pay-date">{{ formatDate(p.contribution_date) }}</span>
                    — ₱{{ formatMoney(p.amount) }}
                  </li>
                </ul>
              </div>
              <div class="fin-mobile-card-actions">
                <button
                  v-if="r.remaining_pesos > 0.009"
                  type="button"
                  class="btn btn-small fin-mobile-action"
                  :disabled="busyId === r.distribution_id"
                  @click="openPayModal(r)"
                >
                  {{ $t('ui.recordPaymentTl') }}
                </button>
                <span v-else class="muted">{{ $t('ui.paymentDone') }}</span>
              </div>
            </article>
          </div>
        </div>
      </div>
    </div>

    <Teleport to="body">
      <Transition name="app-modal">
        <div
          v-if="payModal"
          class="modal-overlay app-modal-overlay sfp-pay-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closePayModal"
        >
          <div class="modal-box payment-modal-box app-modal-dialog" role="dialog" aria-modal="true" @click.stop>
            <h3 class="modal-title">{{ $t('ui.recordPayment') }}</h3>
            <p class="modal-meta">
              {{ payModal.farmer_name }} · {{ formatAssistanceType(payModal.assistance_type) }} · Remaining:
              <strong>₱{{ formatMoney(payModal.remaining_pesos) }}</strong>
            </p>
            <div class="form-group">
              <label>{{ $t('ui.paymentDate') }}</label>
              <input v-model="payDate" type="date" class="input" />
            </div>
            <div class="form-group">
              <label>Amount (max ₱{{ formatMoney(payModal.remaining_pesos) }})</label>
              <TypedNumberInput v-model="payAmount" :min="0" :max="payModal.remaining_pesos" input-class="input" />
            </div>
            <div class="form-group">
              <label>{{ $t('ui.paymentMethod') }}</label>
              <select v-model="payMethod" class="input">
                <option value="Cash">{{ $t('ui.cash') }}</option>
                <option value="GCash">{{ $t('ui.gcash') }}</option>
              </select>
            </div>
            <div class="form-group auto-receipt-note">
              <label>{{ $t('ui.officialReceipt') }}</label>
              <input type="text" class="input" :value="$t('ui.receiptAutoGenerated')" disabled />
            </div>
            <div class="modal-actions">
              <button type="button" class="btn btn-muted" @click="closePayModal">{{ $t('common.cancel') }}</button>
              <button type="button" class="btn btn-success" :disabled="paySubmitting" @click="submitPayment">
                {{ $t('ui.recordPayment') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
      <Transition name="app-modal">
        <div
          v-if="showReceiptModal && lastReceipt"
          class="modal-overlay receipt-modal-overlay app-modal-overlay sfp-receipt-overlay"
          :class="{ 'light-theme': isLight }"
          @click.self="closeReceiptModal"
        >
          <div class="modal-box receipt-modal-box app-modal-dialog" @click.stop>
            <PaymentReceiptPrint :receipt="lastReceipt" :auto-print="receiptAutoPrint" @close="closeReceiptModal" />
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useAuthStore } from '../stores/authStore'
import { useBackdropTheme } from '../composables/useBackdropTheme'
import PaymentReceiptPrint from '../components/PaymentReceiptPrint.vue'
import TypedNumberInput from '../components/TypedNumberInput.vue'
import { usePaymentReceipt } from '../composables/usePaymentReceipt'

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

function setModalOpen(open) {
  document.body.classList.toggle('app-modal-open', open)
  document.body.style.overflow = open ? 'hidden' : ''
}

watch(
  () => !!(payModal.value || (showReceiptModal.value && lastReceipt.value)),
  (open) => setModalOpen(open),
  { immediate: true }
)

onBeforeUnmount(() => {
  setModalOpen(false)
})

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
/* Page colors + mobile cards — layout in seed-fertilizer-plan-ui.css (main.js) */
.financial-container {
  --glass-bg: rgba(29, 43, 33, 0.92);
  --glass-panel: rgba(31, 48, 36, 0.94);
  --glass-line: rgba(255, 255, 255, 0.1);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --text-soft: rgba(220, 238, 211, 0.62);
  --green: #34d399;
  --lime: #a3e635;
  --red: #f87171;

  min-height: 100vh;
  max-width: none;
  min-width: 0;
  box-sizing: border-box;
  padding: 2rem;
  margin: 0 -1.5rem;
  width: calc(100% + 3rem);
  background: linear-gradient(145deg, #0f1712 0%, #132119 22%, #1a2b20 45%, #243b2c 72%, #2f4a38 100%);
  position: relative;
  isolation: isolate;
  overflow: visible;
  border-radius: 18px;
  font-family: 'Segoe UI', system-ui, sans-serif;
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
  0% { transform: translate3d(0, 0, 0) scale(1); }
  100% { transform: translate3d(-10px, 8px, 0) scale(1.03); }
}

@keyframes orbPulse {
  0%, 100% { opacity: 0.9; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.financial-container > * {
  position: relative;
  z-index: 1;
}

.financial-container > .tab-content {
  margin-top: 0;
}

.page-header,
.page-header-split {
  margin-bottom: 2rem;
  padding: 1.25rem 1.4rem 1.1rem;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  border-radius: 14px;
  position: relative;
  overflow: hidden;
  background: rgba(28, 42, 33, 0.92);
  border: 1px solid rgba(190, 235, 203, 0.14);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.3), inset 1px 1px 0 rgba(255, 255, 255, 0.05);
  text-align: left;
}

.page-header-text,
.header-content {
  position: relative;
  z-index: 1;
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  max-width: none;
  margin: 0;
  align-items: flex-start;
  text-align: left;
}

.seed-fertilizer-plan > .page-header .page-header-text,
.seed-fertilizer-plan > .page-header .header-content {
  align-items: flex-start !important;
  text-align: left !important;
  margin: 0 !important;
  max-width: none !important;
  width: auto !important;
  gap: 0.35rem !important;
}

.page-header::before,
.page-header-split::before {
  content: '';
  position: absolute;
  top: -62px;
  right: -72px;
  width: 220px;
  height: 220px;
  border-radius: 999px;
  background: radial-gradient(circle, rgba(74, 222, 128, 0.2) 0%, transparent 68%);
  pointer-events: none;
}

.page-header::after,
.page-header-split::after {
  content: '';
  position: absolute;
  left: 1.4rem;
  right: 1.4rem;
  bottom: 0.55rem;
  height: 1px;
  background: linear-gradient(90deg, rgba(74, 222, 128, 0.42), rgba(45, 212, 191, 0.12));
  pointer-events: none;
}

.page-header h1,
.page-title {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
  letter-spacing: -0.02em;
  margin: 0 0 0.15rem;
  color: #eefde6;
  background: none;
  -webkit-background-clip: unset;
  background-clip: unset;
  -webkit-text-fill-color: currentColor;
  text-align: left;
}

.page-subtitle {
  color: rgba(229, 235, 231, 0.82);
  margin: 0;
  font-size: 1rem;
  line-height: 1.45;
  font-weight: 700;
  text-align: left;
}

.page-subtitle a {
  color: var(--lime);
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
}

.page-subtitle a:hover {
  color: var(--green);
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

.ledger-note {
  margin: 0 0 1.25rem;
  padding: 0.85rem 1rem;
  border-radius: 12px;
  border: 1px solid var(--glass-line);
  background: rgba(255, 255, 255, 0.06);
  color: var(--text-muted);
  font-size: 0.92rem;
  line-height: 1.5;
  position: relative;
  z-index: 1;
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
  position: relative;
  z-index: 1;
}

.stat-content {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  width: 100%;
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
  margin-bottom: 0;
}

.tab-content .card-title {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
}

.card-hint {
  margin: 0;
  padding: 0.65rem 1.25rem 0.85rem;
  font-size: 0.88rem;
  color: var(--text-soft);
  line-height: 1.45;
  box-sizing: border-box;
  position: relative;
  z-index: 1;
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
  padding: 2px 7px;
  font-size: 10px;
  border-radius: 6px;
  font-weight: 600;
  line-height: 1.2;
  white-space: nowrap;
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

.table-container {
  width: 100%;
  position: relative;
  z-index: 1;
  box-sizing: border-box;
}

.fin-desktop-table {
  display: block;
  width: 100%;
}

.fin-mobile-list {
  display: none;
}

.fin-mobile-empty {
  padding: 1.25rem 0.75rem;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--text-soft);
}

.fin-mobile-card {
  padding: 0.7rem 0.75rem 0.65rem;
  border-radius: 12px;
  border: 1px solid rgba(167, 211, 178, 0.22);
  background: rgba(0, 0, 0, 0.16);
}

.fin-mobile-card-top {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.5rem;
  margin-bottom: 0.45rem;
}

.fin-mobile-card-name {
  margin: 0;
  font-size: 0.95rem;
  font-weight: 800;
  line-height: 1.25;
  color: var(--text-main);
  word-break: break-word;
}

.fin-mobile-card-meta {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
  margin-bottom: 0.55rem;
}

.fin-mobile-meta-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.55rem;
  font-size: 0.78rem;
  line-height: 1.3;
  color: var(--text-main);
}

.fin-mobile-label {
  flex-shrink: 0;
  min-width: 4.8rem;
  font-size: 0.65rem;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  color: rgba(229, 235, 231, 0.55);
}

.fin-mobile-pay-history {
  margin: 0 0 0.55rem;
  padding: 0.45rem 0.55rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.18);
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.fin-mobile-pay-history ul {
  margin: 0.35rem 0 0;
  padding-left: 1.1rem;
}

.fin-mobile-card-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 0.4rem;
  width: 100%;
  padding-top: 0.45rem;
  border-top: 1px solid rgba(190, 235, 203, 0.12);
}

.fin-mobile-action {
  flex: 1 1 auto;
  min-height: 40px;
  min-width: 0;
  justify-content: center;
  font-size: 0.78rem !important;
  padding: 0.45rem 0.65rem !important;
}

.tab-content .data-table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.tab-content .data-table thead {
  background: rgba(74, 222, 128, 0.08);
}

.tab-content .data-table th {
  text-align: left;
  font-weight: 700;
  color: var(--text-main);
  border-bottom: 2px solid rgba(74, 222, 128, 0.2);
  text-transform: uppercase;
  letter-spacing: 0.03em;
  vertical-align: middle;
}

.tab-content .data-table td {
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  font-weight: 500;
  vertical-align: middle;
}

.tab-content .data-table tbody tr:nth-child(even) {
  background: rgba(255, 255, 255, 0.03);
}

.tab-content .data-table tbody tr:hover {
  background: rgba(74, 222, 128, 0.1);
}

.tab-content table.data-table tbody td.amount {
  font-weight: 600;
  color: #b7f7c8;
  font-variant-numeric: tabular-nums;
}

.name {
  font-weight: 500;
  color: var(--text-main);
}

.sub {
  font-size: 9px;
  font-weight: 500;
  color: var(--text-soft);
  margin-top: 2px;
}

.text-warn {
  color: #fbbf24;
}

.badge-dist {
  background: rgba(45, 212, 191, 0.16);
  color: #99f6e4;
  border-color: rgba(45, 212, 191, 0.28);
  display: inline-block;
  padding: 2px 6px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 600;
  border: 1px solid rgba(255, 255, 255, 0.12);
  white-space: nowrap;
}

.sub-row td {
  background: rgba(0, 0, 0, 0.18);
  padding-top: 0;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.pay-history {
  font-size: 10px;
  color: var(--text-muted);
  padding: 4px 0 4px 4px;
}

.pay-history ul {
  margin: 0.25rem 0 0;
  padding-left: 1rem;
}

.pay-date {
  font-weight: 700;
  color: var(--text-main);
}

.empty-state {
  text-align: center;
  padding: 40px 20px;
  color: var(--text-soft);
  position: relative;
  z-index: 1;
}

.empty-title {
  font-weight: 800;
  font-size: 1.05rem;
  color: var(--text-main);
  margin-bottom: 6px;
}

.empty-text {
  font-size: 13px;
  color: var(--text-muted);
  line-height: 1.45;
}

.muted {
  color: var(--text-soft);
  font-size: 10px;
  font-weight: 600;
}

.actions-cell {
  text-align: right;
  white-space: nowrap;
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
  box-sizing: border-box;
}

.input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
}

.input:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

select.input {
  cursor: pointer;
}

/* ===== LIGHT MODE — colors only ===== */
.financial-container.seed-fertilizer-plan.light-theme {
  --glass-bg: #fffef9;
  --glass-panel: #ffffff;
  --glass-line: rgba(34, 197, 94, 0.28);
  --glass-line-strong: rgba(22, 101, 52, 0.35);
  --text-main: #052e16;
  --text-muted: #14532d;
  --text-soft: #166534;
  --green: #15803d;
  --lime: #166534;

  background: linear-gradient(155deg, #d8f3de 0%, #bfeccc 42%, #a8e4b8 100%) !important;
  color: var(--text-main);
}

.financial-container.seed-fertilizer-plan.light-theme::before,
.financial-container.seed-fertilizer-plan.light-theme::after {
  opacity: 0.25;
}

.financial-container.seed-fertilizer-plan.light-theme .page-header,
.financial-container.seed-fertilizer-plan.light-theme .page-header-split {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 8px 26px rgba(22, 101, 52, 0.12), inset 1px 1px 0 rgba(255, 255, 255, 0.05) !important;
  text-align: left !important;
}

.financial-container.seed-fertilizer-plan.light-theme .page-header-text {
  align-items: flex-start !important;
  text-align: left !important;
  margin: 0 !important;
  max-width: none !important;
}

.financial-container.seed-fertilizer-plan.light-theme .page-header h1,
.financial-container.seed-fertilizer-plan.light-theme .page-title {
  background: none !important;
  -webkit-background-clip: unset !important;
  background-clip: unset !important;
  -webkit-text-fill-color: currentColor !important;
  color: #052e16 !important;
  text-align: left !important;
}

.financial-container.seed-fertilizer-plan.light-theme .page-subtitle {
  color: #166534 !important;
  text-align: left !important;
}

.financial-container.seed-fertilizer-plan.light-theme .page-subtitle a {
  color: #15803d !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 22px rgba(22, 101, 52, 0.1) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .ledger-note {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #14532d !important;
}

.financial-container.seed-fertilizer-plan.light-theme .info-banner {
  background: #f0fdf4 !important;
  border-color: #86efac !important;
  color: #14532d !important;
}

.financial-container.seed-fertilizer-plan.light-theme .info-banner--error {
  background: #fee2e2 !important;
  border-color: #fca5a5 !important;
  color: #991b1b !important;
}

.financial-container.seed-fertilizer-plan.light-theme .stat-card {
  background: #ffffff !important;
  border-color: #86efac !important;
  box-shadow: 0 8px 18px rgba(22, 101, 52, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.06) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .stat-label {
  color: #166534 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .stat-value {
  color: #052e16 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
  box-shadow: 0 6px 18px rgba(22, 101, 52, 0.08) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .card-header {
  background: #f0fdf4 !important;
  border-bottom-color: #bbf7d0 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .card-title {
  color: #000000 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .card-hint {
  color: #166534 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .data-table thead {
  background: linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .data-table th {
  color: #000000 !important;
  border-bottom-color: #86efac !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .data-table td {
  color: #000000 !important;
  border-bottom-color: #e2e8f0 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .data-table tbody tr:nth-child(even) {
  background: #f8fdf9 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content .data-table tbody tr:hover {
  background: #ecfdf5 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .tab-content table.data-table tbody td.amount {
  color: #15803d !important;
}

.financial-container.seed-fertilizer-plan.light-theme .name,
.financial-container.seed-fertilizer-plan.light-theme .pay-date {
  color: #052e16 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .sub,
.financial-container.seed-fertilizer-plan.light-theme .muted {
  color: #15803d !important;
}

.financial-container.seed-fertilizer-plan.light-theme .badge-dist {
  background: #ecfeff !important;
  color: #0f766e !important;
  border-color: #5eead4 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .empty-state {
  color: #166534 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .empty-title {
  color: #052e16 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .empty-text {
  color: #166534 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .input {
  background: #ffffff !important;
  color: #000000 !important;
  border-color: #94a3b8 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .input:focus {
  border-color: #16a34a !important;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.12) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .btn.btn-small,
.financial-container.seed-fertilizer-plan.light-theme .btn:not(.btn-primary-action):not(.btn-success):not(.btn-danger) {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #166534 !important;
  box-shadow: 0 1px 4px rgba(15, 23, 42, 0.08) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .btn.btn-primary-action,
.financial-container.seed-fertilizer-plan.light-theme .btn-primary-action {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #14532d !important;
  box-shadow: 0 8px 16px rgba(22, 101, 52, 0.22) !important;
}

.financial-container.seed-fertilizer-plan.light-theme .btn-muted {
  background: #ffffff !important;
  color: #052e16 !important;
  -webkit-text-fill-color: #052e16 !important;
  border-color: #94a3b8 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .btn-success {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%) !important;
  color: #ffffff !important;
  -webkit-text-fill-color: #ffffff !important;
  border-color: #14532d !important;
}

.financial-container.seed-fertilizer-plan.light-theme .fin-mobile-card {
  background: #ffffff !important;
  border-color: #bbf7d0 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .fin-mobile-card-name,
.financial-container.seed-fertilizer-plan.light-theme .fin-mobile-meta-row {
  color: #052e16 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .fin-mobile-label {
  color: #166534 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .fin-mobile-pay-history {
  background: #f0fdf4 !important;
  color: #14532d !important;
}

.financial-container.seed-fertilizer-plan.light-theme .fin-mobile-card-actions {
  border-top-color: #bbf7d0 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .fin-mobile-empty {
  color: #166534 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .sub-row td {
  background: #f8fdf9 !important;
}

.financial-container.seed-fertilizer-plan.light-theme .text-warn {
  color: #b45309 !important;
}

/* Light theme: lock geometry to dark reference (colors only change) */
.financial-container.seed-fertilizer-plan.light-theme :is(
  .page-header,
  .page-header-split,
  .tab-content,
  .stat-card,
  .tab-content .card,
  .ledger-note,
  .info-banner,
  .fin-mobile-card
) {
  border-width: 1px !important;
}

.financial-container.seed-fertilizer-plan.light-theme .input,
.financial-container.seed-fertilizer-plan.light-theme .btn,
.financial-container.seed-fertilizer-plan.light-theme .btn-small {
  border-width: 1px !important;
}

/* ===== MOBILE (match Share Capital) ===== */
@media (max-width: 768px) {
  .financial-container {
    margin-left: 0 !important;
    margin-right: 0 !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0.65rem 0.9rem !important;
    border-radius: 0;
    overflow: visible;
    min-height: 0;
    touch-action: pan-y;
    box-sizing: border-box;
  }

  .financial-container > .tab-content {
    margin-top: 0;
  }

  .page-header,
  .page-header-split {
    display: grid;
    grid-template-columns: minmax(0, 1fr);
    align-items: start;
    gap: 0.15rem;
    margin-bottom: 0.75rem;
    padding: 0.75rem 0.95rem;
  }

  .page-header::after,
  .page-header-split::after {
    display: none;
  }

  .page-header-text,
  .header-content {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    min-width: 0;
    align-items: flex-start;
    text-align: left;
    max-width: none;
    margin: 0;
  }

  .page-header h1,
  .page-title {
    font-size: 1.2rem !important;
    margin: 0;
    line-height: 1.25;
    color: var(--text-main);
    background: none;
    -webkit-background-clip: unset;
    background-clip: unset;
    text-align: left !important;
  }

  .page-subtitle {
    font-size: 0.75rem;
    line-height: 1.3;
    margin: 0;
    text-align: left !important;
  }

  .tab-content {
    padding: 0.8rem 0.9rem !important;
    border-radius: 14px;
    box-sizing: border-box;
  }

  .tab-content--main {
    padding-top: 0.8rem !important;
  }

  .ledger-note {
    padding: 0.6rem 0.8rem;
    font-size: 0.72rem;
    line-height: 1.4;
    margin-bottom: 0.6rem;
  }

  .info-banner {
    padding: 0.6rem 0.75rem;
    font-size: 0.78rem;
    margin-bottom: 0.6rem;
  }

  .stat-card {
    padding: 0.55rem 0.7rem;
    border-radius: 10px;
  }

  .stat-label {
    font-size: 0.56rem;
    margin-bottom: 0.15rem;
  }

  .stat-value {
    font-size: 1rem;
  }

  .tab-content .card {
    border-radius: 12px;
  }

  .tab-content .card-header {
    display: flex;
    flex-wrap: nowrap;
    align-items: center;
    justify-content: space-between;
    gap: 0.55rem;
    padding: 0.75rem 1rem !important;
  }

  .tab-content .card-title {
    font-size: 0.88rem;
    flex: 1 1 auto;
    min-width: 0;
    line-height: 1.25;
  }

  .tab-content .card-header .btn-primary-action {
    flex-shrink: 0;
    align-self: center;
    margin-left: 0;
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
    border-radius: 9px;
    min-height: 34px;
  }

  .card-hint {
    font-size: 0.72rem;
    padding: 0.55rem 1rem 0.65rem;
    margin: 0;
  }

  .btn-primary-action {
    padding: 0.4rem 0.7rem;
    font-size: 0.75rem;
    border-radius: 9px;
  }

  .fin-desktop-table {
    display: none !important;
  }

  .fin-mobile-list {
    display: flex !important;
    flex-direction: column;
    gap: 0.55rem;
    width: 100%;
  }

  .fin-mobile-card {
    padding: 0.7rem 0.8rem 0.65rem;
  }

  .fin-mobile-card-name {
    font-size: 0.85rem;
  }

  .fin-mobile-label {
    font-size: 0.58rem;
    min-width: 4rem;
  }

  .fin-mobile-meta-row {
    font-size: 0.72rem;
  }

  .fin-mobile-meta-row > span:last-child {
    text-align: right;
    word-break: break-word;
  }

  .table-container {
    overflow-x: visible;
    border: none;
    background: transparent;
    box-shadow: none;
    border-radius: 0;
    padding: 0.55rem 0.85rem 0.75rem !important;
  }

  .fin-mobile-empty {
    padding: 1rem 0.85rem;
  }

  .empty-state {
    padding: 1.5rem 1rem;
  }

  .empty-title {
    font-size: 0.95rem;
  }

  .empty-text {
    font-size: 0.75rem;
  }

  .input {
    min-height: 38px;
    font-size: 0.85rem;
    padding: 0.5rem 0.6rem;
  }

  .seed-fertilizer-plan :deep(table.data-table),
  :deep(.fin-desktop-table table) {
    display: table !important;
  }

  :deep(.fin-desktop-table table thead) {
    display: table-header-group !important;
  }

  :deep(.fin-desktop-table table tbody),
  :deep(.fin-desktop-table table tr),
  :deep(.fin-desktop-table table td),
  :deep(.tab-content table.data-table),
  :deep(.tab-content table.data-table thead),
  :deep(.tab-content table.data-table tbody),
  :deep(.tab-content table.data-table tr),
  :deep(.tab-content table.data-table td),
  :deep(.tab-content table.data-table th) {
    display: revert !important;
    width: auto !important;
    padding-left: revert !important;
    margin-bottom: 0 !important;
    border-radius: 0 !important;
    box-shadow: none !important;
  }
}

@media (max-width: 480px) {
  .financial-container {
    padding: 0.55rem 0.8rem !important;
  }

  .tab-content {
    padding: 0.7rem 0.8rem !important;
  }

  .tab-content .card-header {
    flex-wrap: nowrap !important;
    align-items: center !important;
    padding: 0.7rem 0.85rem !important;
  }

  .table-container {
    padding: 0.5rem 0.7rem 0.7rem !important;
  }

  .card-hint {
    padding: 0.5rem 0.85rem 0.6rem;
  }

  .page-header h1,
  .page-title {
    font-size: 1.1rem !important;
  }

  .stat-value {
    font-size: 0.92rem;
  }

  .fin-mobile-card {
    padding: 0.65rem 0.75rem;
  }

  .fin-mobile-card-name {
    font-size: 0.9rem;
  }

  .fin-mobile-label {
    min-width: 4.2rem;
    font-size: 0.62rem;
  }
}
</style>

<style>
/* Teleported modals — sit above app chrome with blur backdrop */
.sfp-pay-overlay.app-modal-overlay,
.sfp-receipt-overlay.app-modal-overlay {
  z-index: 11050 !important;
}

.sfp-pay-overlay .payment-modal-box,
.sfp-receipt-overlay .receipt-modal-box {
  --glass-panel: rgba(31, 48, 36, 0.96);
  --glass-line-strong: rgba(255, 255, 255, 0.18);
  --text-main: #eefde6;
  --text-muted: rgba(220, 238, 211, 0.78);
  --green: #34d399;

  background: var(--glass-panel);
  border: 1px solid var(--glass-line-strong);
  border-radius: 16px;
  padding: 1.15rem 1.2rem;
  max-width: min(26rem, calc(100vw - 1.5rem));
  width: 100%;
  margin: auto;
  box-shadow:
    20px 20px 40px rgba(0, 0, 0, 0.4),
    inset 1px 1px 0 rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(20px);
  color: var(--text-main);
  max-height: min(88dvh, 900px);
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
}

.sfp-pay-overlay .modal-title {
  margin: 0 0 0.4rem;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--text-main);
}

.sfp-pay-overlay .modal-meta {
  margin: 0 0 0.85rem;
  font-size: 0.8rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.sfp-pay-overlay .form-group {
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
}

.sfp-pay-overlay .form-group label {
  display: block;
  font-size: 0.68rem;
  font-weight: 700;
  margin-bottom: 0.35rem;
  color: var(--text-main);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.sfp-pay-overlay .input {
  width: 100%;
  padding: 0.5rem 0.65rem;
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(39, 58, 45, 0.92);
  color: var(--text-main);
  font-family: inherit;
  font-size: 0.88rem;
  min-height: 40px;
  box-sizing: border-box;
}

.sfp-pay-overlay .input:focus {
  outline: none;
  border-color: var(--green);
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.12);
}

.sfp-pay-overlay .modal-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 0.85rem;
}

.sfp-pay-overlay .btn {
  padding: 0.5rem 0.85rem;
  border-radius: 10px;
  font-size: 0.8rem;
  font-weight: 700;
  cursor: pointer;
  border: 1px solid rgba(74, 222, 128, 0.35);
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.24), rgba(22, 163, 74, 0.18));
  color: var(--green);
}

.sfp-pay-overlay .btn-muted {
  background: rgba(255, 255, 255, 0.08);
  color: var(--text-main);
  border-color: rgba(255, 255, 255, 0.12);
}

.sfp-pay-overlay .btn-success {
  background: linear-gradient(135deg, rgba(74, 222, 128, 0.32), rgba(74, 222, 128, 0.2));
  color: var(--green);
  border-color: rgba(74, 222, 128, 0.4);
}

.sfp-pay-overlay.light-theme .payment-modal-box,
.sfp-receipt-overlay.light-theme .receipt-modal-box {
  --glass-panel: #ffffff;
  --glass-line-strong: rgba(22, 101, 52, 0.28);
  --text-main: #052e16;
  --text-muted: #14532d;
  --green: #15803d;
  background: #ffffff;
  border-color: #86efac;
  box-shadow: 0 18px 40px rgba(22, 101, 52, 0.18);
}

.sfp-pay-overlay.light-theme .modal-title,
.sfp-pay-overlay.light-theme .form-group label {
  color: #052e16;
}

.sfp-pay-overlay.light-theme .modal-meta {
  color: #166534;
}

.sfp-pay-overlay.light-theme .input {
  background: #ffffff;
  color: #000000;
  border-color: #94a3b8;
}

.sfp-pay-overlay.light-theme .btn-muted {
  background: #ffffff;
  color: #052e16;
  border-color: #94a3b8;
}

.sfp-pay-overlay.light-theme .btn-success {
  background: linear-gradient(135deg, #166534 0%, #14532d 100%);
  color: #ffffff;
  border-color: #14532d;
}

@media (max-width: 480px) {
  .sfp-pay-overlay .payment-modal-box,
  .sfp-receipt-overlay .receipt-modal-box {
    width: calc(100vw - 1.2rem);
    max-width: calc(100vw - 1.2rem);
    max-height: calc(100dvh - 1.2rem);
    padding: 1rem;
  }

  .sfp-pay-overlay .modal-actions {
    flex-direction: column-reverse;
  }

  .sfp-pay-overlay .modal-actions .btn {
    width: 100%;
  }
}
</style>
