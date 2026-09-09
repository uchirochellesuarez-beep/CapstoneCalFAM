<template>
  <div class="pay-checkout" :class="{ 'light-theme': isLight }">
    <header class="pay-head">
      <div class="pay-head-text">
        <p v-if="kicker" class="pay-kicker">{{ kicker }}</p>
        <h2>{{ title }}</h2>
        <p v-if="payee" class="pay-payee">{{ payee }}</p>
      </div>
      <button type="button" class="pay-close" :aria-label="$t('common.close')" @click="$emit('cancel')">×</button>
    </header>

    <div class="pay-hero">
      <span class="pay-hero-label">{{ $t('payCheckout.amountDue') }}</span>
      <strong class="pay-hero-amount">₱{{ formatMoney(amountDue) }}</strong>
      <p v-if="dueMeta" class="pay-hero-meta" :class="{ overdue: overdue }">{{ dueMeta }}</p>
      <dl v-if="detailRows.length" class="pay-lines">
        <div v-for="row in detailRows" :key="row.label" class="pay-line">
          <dt>{{ row.label }}</dt>
          <dd>{{ row.value }}</dd>
        </div>
      </dl>
    </div>

    <section class="pay-section">
      <p class="pay-label">{{ $t('payCheckout.paymentType') }}</p>
      <div class="pay-seg" role="group">
        <button
          type="button"
          class="pay-seg-btn"
          :class="{ active: paymentType === 'full' }"
          @click="setFull"
        >
          {{ $t('payCheckout.fullPayment') }}
        </button>
        <button
          type="button"
          class="pay-seg-btn"
          :class="{ active: paymentType === 'partial' }"
          @click="setPartial"
        >
          {{ $t('payCheckout.partialPayment') }}
        </button>
      </div>
    </section>

    <section class="pay-section">
      <label class="pay-label" for="pay-amount-input">{{ $t('payCheckout.amountToCollect') }}</label>
      <div class="pay-amount-wrap">
        <span class="pay-currency" aria-hidden="true">₱</span>
        <TypedNumberInput
          :model-value="amount"
          :min="0"
          :max="amountDue"
          :readonly="paymentType === 'full'"
          :placeholder="paymentType === 'full' ? formatMoney(amountDue) : $t('payCheckout.enterAmount')"
          input-class="pay-amount-input"
          @update:model-value="$emit('update:amount', $event)"
          @input="$emit('amount-input')"
        />
      </div>
      <p v-if="paymentType === 'full'" class="pay-hint">{{ $t('payCheckout.fullBalanceHint', { amount: formatMoney(amountDue) }) }}</p>
      <p v-if="showPartialWarning" class="pay-warn">{{ $t('payCheckout.useFullInstead') }}</p>
    </section>

    <section class="pay-section">
      <p class="pay-label">{{ $t('payCheckout.paymentMethod') }}</p>
      <div class="pay-methods">
        <button
          v-for="item in methods"
          :key="item"
          type="button"
          class="pay-method-card"
          :class="{ selected: method === item }"
          :disabled="methods.length === 1"
          @click="$emit('update:method', item)"
        >
          <span class="pay-method-icon" aria-hidden="true">
            <svg v-if="item === 'GCash'" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <rect x="3" y="5" width="18" height="14" rx="3" />
              <path d="M3 10h18" />
            </svg>
            <svg v-else viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
              <circle cx="12" cy="12" r="8" />
              <path d="M12 8v8M9.5 10.5h3.2a1.8 1.8 0 010 3.6H9.5" />
            </svg>
          </span>
          <span class="pay-method-name">{{ methodLabel(item) }}</span>
          <span class="pay-method-note">{{ item === 'Cash' ? $t('payCheckout.cashOnHand') : $t('payCheckout.eWallet') }}</span>
          <span class="pay-method-pip" aria-hidden="true" />
        </button>
      </div>
    </section>

    <div class="pay-grid">
      <label class="pay-field">
        <span class="pay-label">{{ $t('payCheckout.collectionDate') }}</span>
        <input
          :value="date"
          type="date"
          class="pay-input"
          :max="todayMax"
          @input="$emit('update:date', $event.target.value)"
        />
      </label>
      <label class="pay-field pay-field-wide">
        <span class="pay-label">{{ $t('ui.remarks') }}</span>
        <textarea
          :value="remarks"
          class="pay-input pay-textarea"
          rows="1"
          :placeholder="$t('payCheckout.optionalNote')"
          @input="$emit('update:remarks', $event.target.value)"
        />
      </label>
    </div>

    <slot name="hint" />

    <div class="pay-totals">
      <div class="pay-total-row">
        <span>{{ $t('payCheckout.collectingNow') }}</span>
        <strong>₱{{ formatMoney(amount || 0) }}</strong>
      </div>
      <div class="pay-total-row">
        <span>{{ $t('payCheckout.remainingAfter') }}</span>
        <strong>₱{{ formatMoney(remainingAfter) }}</strong>
      </div>
    </div>

    <p class="pay-secure">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" aria-hidden="true">
        <rect x="5" y="11" width="14" height="10" rx="2" />
        <path d="M8 11V8a4 4 0 018 0v3" />
      </svg>
      {{ $t('payCheckout.receiptNote') }}
    </p>

    <div class="pay-actions">
      <button type="button" class="pay-btn-ghost" @click="$emit('cancel')">{{ $t('common.cancel') }}</button>
      <button
        type="button"
        class="pay-btn-primary"
        :disabled="submitDisabled || loading"
        @click="$emit('submit')"
      >
        {{ loading ? $t('payCheckout.processing') : $t('payCheckout.collectAmount', { amount: formatMoney(amount || 0) }) }}
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import TypedNumberInput from './TypedNumberInput.vue'

const props = defineProps({
  isLight: { type: Boolean, default: false },
  title: { type: String, required: true },
  kicker: { type: String, default: '' },
  payee: { type: String, default: '' },
  amountDue: { type: Number, default: 0 },
  detailRows: { type: Array, default: () => [] },
  dueMeta: { type: String, default: '' },
  overdue: { type: Boolean, default: false },
  paymentType: { type: String, default: 'full' },
  amount: { type: [Number, String], default: 0 },
  date: { type: String, default: '' },
  method: { type: String, default: 'Cash' },
  methods: { type: Array, default: () => ['Cash'] },
  remarks: { type: String, default: '' },
  remainingAfter: { type: Number, default: 0 },
  showPartialWarning: { type: Boolean, default: false },
  submitDisabled: { type: Boolean, default: false },
  loading: { type: Boolean, default: false }
})

const emit = defineEmits([
  'cancel',
  'submit',
  'update:paymentType',
  'update:amount',
  'update:date',
  'update:method',
  'update:remarks',
  'amount-input'
])

const { t } = useI18n()

const todayMax = computed(() => new Date().toISOString().split('T')[0])

const formatMoney = (value) => {
  const n = parseFloat(value || 0)
  if (!Number.isFinite(n)) return '0.00'
  return n.toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const methodLabel = (item) => {
  if (item === 'GCash') return t('ui.gcash')
  return t('ui.cash')
}

const setFull = () => {
  emit('update:paymentType', 'full')
  emit('update:amount', props.amountDue)
}

const setPartial = () => {
  emit('update:paymentType', 'partial')
}
</script>

<style scoped>
.pay-checkout {
  display: flex;
  flex-direction: column;
  gap: 0.42rem;
  box-sizing: border-box;
  width: 100%;
  padding: 0.35rem 0.55rem 0.2rem;
  color: #ecfdf5;
}

.pay-checkout :is(button, input, textarea, select, label) {
  margin-bottom: 0 !important;
}

.pay-checkout .pay-method-card {
  min-height: 34px !important;
  min-width: 0 !important;
  height: auto !important;
  padding: 0.28rem 1.5rem 0.28rem 0.55rem !important;
  margin: 0 !important;
  font-size: 0.78rem !important;
  justify-content: flex-start !important;
  gap: 0.4rem !important;
}

.pay-checkout .pay-input,
.pay-checkout .pay-textarea {
  min-height: 32px !important;
  height: 32px !important;
  margin: 0 !important;
  padding: 0.2rem 0.55rem !important;
  font-size: 0.8rem !important;
}

.pay-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.65rem;
}

.pay-kicker {
  margin: 0 0 0.08rem;
  font-size: 0.58rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: #86efac;
}

.pay-head h2 {
  margin: 0;
  font-size: 1.02rem;
  font-weight: 800;
  line-height: 1.2;
  color: #f0fdf4;
}

.pay-payee {
  margin: 0.08rem 0 0;
  font-size: 0.8rem;
  font-weight: 600;
  color: rgba(220, 252, 231, 0.82);
}

.pay-close {
  width: 1.85rem;
  height: 1.85rem;
  flex-shrink: 0;
  border: 0;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #bbf7d0;
  font-size: 1.25rem;
  line-height: 1;
  cursor: pointer;
}

.pay-hero {
  padding: 0.7rem 1rem 0.65rem;
  border-radius: 12px;
  text-align: center;
  background: linear-gradient(180deg, rgba(22, 101, 52, 0.55), rgba(6, 78, 59, 0.35));
  border: 1px solid rgba(74, 222, 128, 0.28);
}

.pay-hero-label {
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #bbf7d0;
}

.pay-hero-amount {
  display: block;
  margin-top: 0.05rem;
  font-size: 1.42rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: #fff;
}

.pay-hero-meta {
  margin: 0.12rem 0 0;
  font-size: 0.7rem;
  color: rgba(220, 252, 231, 0.8);
}

.pay-hero-meta.overdue {
  color: #fecaca;
  font-weight: 700;
}

.pay-lines {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.22rem 0.7rem;
  margin: 0.4rem 0 0;
  padding-top: 0.38rem;
  border-top: 1px solid rgba(74, 222, 128, 0.22);
  text-align: left;
}

.pay-line {
  display: flex;
  justify-content: space-between;
  gap: 0.4rem;
  min-width: 0;
}

.pay-line:nth-child(3) {
  grid-column: 1 / -1;
}

.pay-line dt {
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
  color: rgba(187, 247, 208, 0.7);
}

.pay-line dd {
  margin: 0;
  font-size: 0.74rem;
  font-weight: 700;
  text-align: right;
  color: #ecfdf5;
  font-variant-numeric: tabular-nums;
}

.pay-section {
  display: flex;
  flex-direction: column;
  gap: 0.28rem;
}

.pay-label {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: #bbf7d0;
}

.pay-seg {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.2rem;
  padding: 0.12rem;
  border-radius: 8px;
  background: rgba(0, 0, 0, 0.35);
}

.pay-seg-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(187, 247, 208, 0.35) !important;
  border-radius: 7px !important;
  margin: 0 !important;
  padding: 0 !important;
  min-height: 30px !important;
  min-width: 0 !important;
  height: 30px !important;
  background: rgba(255, 255, 255, 0.12) !important;
  color: #ecfdf5 !important;
  font-weight: 700 !important;
  font-size: 0.74rem !important;
  line-height: 1 !important;
  box-shadow: none !important;
  cursor: pointer;
}

.pay-seg-btn:hover {
  background: rgba(255, 255, 255, 0.2) !important;
  color: #fff !important;
}

.pay-seg-btn.active {
  background: #16a34a !important;
  border-color: #4ade80 !important;
  color: #fff !important;
  box-shadow: none !important;
}

.pay-seg-btn.active:hover {
  background: #15803d !important;
  color: #fff !important;
}

.pay-amount-wrap {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  padding: 0 0.65rem;
  height: 34px;
  min-height: 34px;
  border-radius: 8px;
  border: 1px solid rgba(74, 222, 128, 0.32);
  background: rgba(8, 20, 14, 0.9);
}

.pay-amount-wrap:focus-within {
  border-color: #4ade80;
  box-shadow: 0 0 0 3px rgba(74, 222, 128, 0.18);
}

.pay-currency {
  font-size: 0.9rem;
  font-weight: 800;
  color: #86efac;
  line-height: 1;
}

.pay-amount-wrap :deep(.pay-amount-input) {
  flex: 1;
  width: 100% !important;
  min-width: 0;
  height: 32px !important;
  min-height: 32px !important;
  max-height: 32px !important;
  margin: 0 !important;
  padding: 0 !important;
  border: 0 !important;
  border-radius: 0 !important;
  background: transparent !important;
  box-shadow: none !important;
  color: #fff !important;
  font-size: 0.95rem !important;
  font-weight: 800 !important;
  line-height: 1.2 !important;
}

.pay-hint,
.pay-warn {
  margin: 0;
  font-size: 0.66rem;
  line-height: 1.3;
}

.pay-hint { color: rgba(187, 247, 208, 0.8); }
.pay-warn { color: #fecaca; font-weight: 700; }

.pay-methods {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
  gap: 0.35rem;
}

.pay-method-card {
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 0.45rem;
  padding: 0.38rem 1.6rem 0.38rem 0.6rem;
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid rgba(74, 222, 128, 0.22);
  background: rgba(0, 0, 0, 0.22);
  color: #ecfdf5;
  text-align: left;
  cursor: pointer;
}

.pay-method-card.selected {
  border-color: #4ade80;
  background: rgba(22, 163, 74, 0.22);
  box-shadow: inset 0 0 0 1px rgba(74, 222, 128, 0.35);
}

.pay-method-card:disabled {
  cursor: default;
}

.pay-method-icon {
  display: grid;
  place-items: center;
  width: 1.2rem;
  height: 1.2rem;
  margin: 0;
  color: #86efac;
}

.pay-method-icon svg {
  width: 1.1rem;
  height: 1.1rem;
}

.pay-method-name {
  font-weight: 800;
  font-size: 0.82rem;
  line-height: 1.1;
}

.pay-method-note {
  display: none;
}

.pay-method-pip {
  position: absolute;
  top: 50%;
  right: 0.6rem;
  width: 0.62rem;
  height: 0.62rem;
  transform: translateY(-50%);
  border-radius: 999px;
  border: 1.5px solid rgba(187, 247, 208, 0.45);
  background: transparent;
}

.pay-method-card.selected .pay-method-pip {
  border-color: #4ade80;
  background: #22c55e;
  box-shadow: 0 0 0 3px rgba(34, 197, 94, 0.22);
}

.pay-grid {
  display: grid;
  grid-template-columns: minmax(9.5rem, 0.9fr) minmax(0, 1.1fr);
  gap: 0.4rem 0.55rem;
  align-items: start;
}

.pay-field {
  display: flex;
  flex-direction: column;
  gap: 0.18rem;
}

.pay-input,
.pay-textarea {
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(74, 222, 128, 0.28);
  background: rgba(8, 20, 14, 0.88);
  color: #ecfdf5;
  padding: 0.38rem 0.6rem;
  font-size: 0.84rem;
  min-height: 38px;
}

.pay-textarea {
  resize: none;
  min-height: 38px;
  max-height: 38px;
}

.pay-totals {
  padding: 0.38rem 0.7rem;
  border-radius: 10px;
  background: rgba(0, 0, 0, 0.28);
  border: 1px solid rgba(74, 222, 128, 0.18);
}

.pay-total-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.12rem 0;
  font-size: 0.76rem;
}

.pay-total-row strong {
  font-variant-numeric: tabular-nums;
}

.pay-secure {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin: 0;
  font-size: 0.66rem;
  line-height: 1.3;
  color: rgba(187, 247, 208, 0.75);
}

.pay-secure svg {
  flex-shrink: 0;
  width: 0.85rem;
  height: 0.85rem;
  margin-top: 0;
}

.pay-actions {
  display: flex;
  gap: 0.45rem;
}

.pay-btn-ghost,
.pay-btn-primary {
  flex: 1;
  min-height: 40px;
  border-radius: 10px;
  font-weight: 800;
  font-size: 0.84rem;
  cursor: pointer;
}

.pay-btn-ghost {
  border: 1px solid rgba(190, 235, 203, 0.28);
  background: transparent;
  color: #d1fae5;
}

.pay-btn-primary {
  border: 0;
  background: linear-gradient(180deg, #22c55e, #15803d);
  color: #fff;
  box-shadow: 0 10px 22px rgba(21, 128, 61, 0.35);
}

.pay-btn-primary:disabled {
  opacity: 0.55;
  cursor: not-allowed;
  box-shadow: none;
}

.pay-checkout.light-theme {
  color: #14532d;
}

.pay-checkout.light-theme .pay-kicker { color: #15803d; }
.pay-checkout.light-theme .pay-head h2 { color: #052e16; }
.pay-checkout.light-theme .pay-payee { color: #3f621a; }
.pay-checkout.light-theme .pay-close {
  background: #f0fdf4;
  color: #166534;
}
.pay-checkout.light-theme .pay-hero {
  background: linear-gradient(180deg, #f0fdf4, #ecfdf5);
  border-color: #86efac;
}
.pay-checkout.light-theme .pay-lines { border-top-color: #bbf7d0; }
.pay-checkout.light-theme .pay-hero-label { color: #166534; }
.pay-checkout.light-theme .pay-hero-amount { color: #14532d; }
.pay-checkout.light-theme .pay-hero-meta { color: #3f621a; }
.pay-checkout.light-theme .pay-hero-meta.overdue { color: #b91c1c; }
.pay-checkout.light-theme .pay-line dt { color: #4d7c0f; }
.pay-checkout.light-theme .pay-line dd { color: #14532d; }
.pay-checkout.light-theme .pay-label { color: #166534; }
.pay-checkout.light-theme .pay-seg { background: #dcfce7; }
.pay-checkout.light-theme .pay-seg-btn {
  background: #ffffff !important;
  border-color: #86efac !important;
  color: #14532d !important;
}
.pay-checkout.light-theme .pay-seg-btn:hover {
  background: #bbf7d0 !important;
  color: #052e16 !important;
}
.pay-checkout.light-theme .pay-seg-btn.active {
  background: #166534 !important;
  border-color: #166534 !important;
  color: #ffffff !important;
}
.pay-checkout.light-theme .pay-seg-btn.active:hover {
  background: #14532d !important;
  color: #ffffff !important;
}
.pay-checkout.light-theme .pay-amount-wrap,
.pay-checkout.light-theme .pay-input,
.pay-checkout.light-theme .pay-textarea {
  background: #fff;
  border-color: #bbf7d0;
  color: #14532d;
}
.pay-checkout.light-theme .pay-currency { color: #15803d; }
.pay-checkout.light-theme .pay-amount-wrap :deep(.pay-amount-input) {
  color: #14532d !important;
}
.pay-checkout.light-theme .pay-method-card {
  background: #fff;
  border-color: #bbf7d0;
  color: #14532d;
}
.pay-checkout.light-theme .pay-method-card.selected {
  background: #f0fdf4;
  border-color: #16a34a;
}
.pay-checkout.light-theme .pay-method-icon { color: #15803d; }
.pay-checkout.light-theme .pay-method-note { color: #4d7c0f; }
.pay-checkout.light-theme .pay-method-pip { border-color: #86efac; }
.pay-checkout.light-theme .pay-method-card.selected .pay-method-pip {
  border-color: #16a34a;
  background: #16a34a;
}
.pay-checkout.light-theme .pay-totals {
  background: #f8fafc;
  border-color: #d1fae5;
}
.pay-checkout.light-theme .pay-secure { color: #3f621a; }
.pay-checkout.light-theme .pay-btn-ghost {
  border-color: #86efac;
  color: #166534;
}

@media (max-width: 640px) {
  .pay-checkout {
    gap: 0.36rem;
    padding: 0.2rem 0.35rem 0.1rem;
  }
  .pay-hero { padding: 0.62rem 0.85rem 0.55rem; }
  .pay-hero-amount { font-size: 1.28rem; }
  .pay-grid { grid-template-columns: 1fr 1fr; }

  .pay-lines {
    display: flex;
    flex-direction: column;
    gap: 0;
    margin-top: 0.4rem;
    padding-top: 0.15rem;
  }

  .pay-line,
  .pay-line:nth-child(3) {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    grid-column: auto;
    align-items: center;
    gap: 0.65rem;
    min-height: 1.85rem;
    padding: 0.38rem 0;
    border-bottom: 1px solid rgba(74, 222, 128, 0.18);
  }

  .pay-line:last-child {
    border-bottom: 0;
    padding-bottom: 0.05rem;
  }

  .pay-line dt {
    font-size: 0.68rem;
    letter-spacing: 0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .pay-line dd {
    font-size: 0.82rem;
    white-space: nowrap;
  }
}

.pay-checkout.light-theme .pay-line {
  border-bottom-color: #bbf7d0;
}
</style>
