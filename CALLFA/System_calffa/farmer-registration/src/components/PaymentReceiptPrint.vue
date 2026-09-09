<template>
  <div ref="receiptRef" class="receipt-print-root">
    <div class="payment-receipt">
      <div class="receipt-top">
        <h1 class="receipt-title">{{ receiptTitle }}</h1>
        <div class="receipt-meta-box">
          <div class="meta-line"><span>{{ $t('ui.noDot') }}</span><strong>{{ receipt.receipt_number || '—' }}</strong></div>
          <div class="meta-line"><span>{{ $t('ui.date') }}</span><strong>{{ formatDate(receipt.payment_date) }}</strong></div>
        </div>
      </div>

      <div class="receipt-org">
        <strong>CalFFA</strong>
        <span>{{ $t('brand.name') }}</span>
        <span v-if="barangayAssociationLabel" class="barangay-line">{{ barangayAssociationLabel }}</span>
      </div>

      <div class="receipt-field">
        <label>{{ clientFieldLabel }}</label>
        <div class="field-line">{{ receipt.client_name || '—' }}</div>
      </div>

      <div class="receipt-amount-row">
        <div class="amount-words">
          <label>{{ $t('ui.amount') }}</label>
          <div class="field-line amount-text">{{ amountWords }}</div>
        </div>
        <div class="amount-box">
          <span class="currency">₱</span>
          <strong>{{ formatNumber(receipt.amount_paid) }}</strong>
        </div>
      </div>

      <div class="receipt-kv">
        <div class="kv-row">
          <span class="kv-label">Payment For</span>
          <span class="kv-value">{{ paymentForDisplay }}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">{{ $t('ui.paymentMethod') }}</span>
          <span class="kv-value">{{ receipt.payment_method || 'Cash' }}</span>
        </div>
        <div v-if="gcashMeta.transaction_type" class="kv-row">
          <span class="kv-label">{{ $t('ui.transactionType') }}</span>
          <span class="kv-value">{{ gcashMeta.transaction_type === 'loan' ? $t('ui.gcashTxnLoan') : $t('ui.gcashTxnMachinery') }}</span>
        </div>
        <div v-if="gcashMeta.reference_number" class="kv-row">
          <span class="kv-label">{{ $t('ui.refNo') }}</span>
          <span class="kv-value">{{ gcashMeta.reference_number }}</span>
        </div>
        <div v-if="gcashMeta.gcash_submission_id && receipt.collector_name" class="kv-row">
          <span class="kv-label">{{ $t('ui.verifiedBy') }}</span>
          <span class="kv-value">{{ receipt.collector_name }}</span>
        </div>
        <div class="kv-row">
          <span class="kv-label">{{ $t('ui.balance') }}</span>
          <span class="kv-value">₱{{ formatNumber(receipt.remaining_balance) }}</span>
        </div>
      </div>

      <div v-if="expenseLineItems.length" class="receipt-field expense-breakdown-field">
        <label>Expense Breakdown</label>
        <div class="expense-breakdown-list">
          <div
            v-for="(item, idx) in expenseLineItems"
            :key="'exp-line-' + idx"
            class="expense-breakdown-row"
          >
            <div class="expense-breakdown-text">
              <strong>{{ item.category }}</strong>
              <span v-if="item.description && item.description !== item.category">{{ item.description }}</span>
            </div>
            <strong class="expense-breakdown-amount">₱{{ formatNumber(item.amount) }}</strong>
          </div>
        </div>
      </div>

      <div class="receipt-signatures">
        <div class="sig-block">
          <label>{{ releasedByLabel }}</label>
          <div class="sig-line">{{ receipt.collector_name || 'Treasurer' }}</div>
        </div>
        <div class="sig-block sign-box">
          <div class="sign-area"></div>
          <span>Sign</span>
        </div>
      </div>

      <div class="receipt-footer-bar">
        <strong>Calapan Farmer Federation Association — {{ barangayAssociationLabel || 'Barangay Farmer Association' }}</strong>
        <span>{{ footerNote }}</span>
      </div>
    </div>

    <div class="receipt-actions no-print">
      <button type="button" class="btn-print" @click="printReceipt">{{ $t('common.printReceipt') }}</button>
      <button type="button" class="btn-close" @click="$emit('close')">{{ $t('common.close') }}</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { amountToWords } from '../utils/amountToWords';
import { printInPage } from '../utils/printInPage';
import { PAYMENT_RECEIPT_PRINT_STYLES, formatBarangayAssociation, RECEIPT_GREEN } from '../utils/receiptPrintStyles';

const props = defineProps({
  receipt: { type: Object, required: true },
  autoPrint: { type: Boolean, default: false },
  kind: { type: String, default: 'payment' }
});

defineEmits(['close']);

const receiptRef = ref(null);

const formatNumber = (n) =>
  new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const formatDate = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'long', day: 'numeric' });
};

const isRefund = computed(() => props.kind === 'refund' || props.receipt?.module === 'machinery_refund');
const isWithdrawal = computed(
  () => props.kind === 'withdrawal' || props.receipt?.module === 'share_capital_withdrawal'
);
const isOperatorLabor = computed(
  () => props.kind === 'labor' || props.receipt?.module === 'operator_labor'
);
const isExpense = computed(
  () => props.kind === 'expense' || props.receipt?.module === 'machinery_expense'
);

const receiptTitle = computed(() => {
  if (isRefund.value) return 'REFUND RECEIPT';
  if (isWithdrawal.value) return 'WITHDRAWAL RECEIPT';
  if (isOperatorLabor.value) return 'LABOR PAYMENT RECEIPT';
  if (isExpense.value) return 'EXPENSE RECEIPT';
  return 'PAYMENT RECEIPT';
});
const clientFieldLabel = computed(() => {
  if (isExpense.value) return 'Recorded By';
  if (isRefund.value || isWithdrawal.value || isOperatorLabor.value) return 'Paid To';
  return 'Received From';
});
const releasedByLabel = computed(() => {
  if (isExpense.value) return 'Approved By';
  if (isRefund.value || isWithdrawal.value || isOperatorLabor.value) return 'Released By';
  return 'Received By';
});
const footerNote = computed(() => {
  if (isRefund.value) return 'Official refund receipt · Keep for your records';
  if (isWithdrawal.value) return 'Official withdrawal receipt · Keep for your records';
  if (isOperatorLabor.value) return 'Official labor payment receipt · Proof of operator compensation';
  if (isExpense.value) return 'Official expense receipt · Keep for your records';
  return 'Official payment receipt · Keep for your records';
});

const amountWords = computed(() => amountToWords(props.receipt?.amount_paid || 0));

const barangayAssociationLabel = computed(() =>
  formatBarangayAssociation(props.receipt?.barangay_name)
);

const paymentForLabel = computed(() => {
  const r = props.receipt || {};
  let raw =
    r.payment_for || r.remarks || (r.module ? String(r.module).replace(/_/g, ' ') : '') || 'Payment';
  if (isExpense.value) {
    const machine = r.metadata?.machinery_name;
    if (machine && !String(raw).toLowerCase().includes(String(machine).toLowerCase())) {
      raw = `${raw} — ${machine}`;
    }
  }
  return String(raw)
    .replace(/\s*[·•\-–—]?\s*Booking\s*#?\s*\d+/gi, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/\s*[·•]\s*$/g, '')
    .trim() || 'Payment';
});

const receiptSourceLabel = computed(() => {
  const r = props.receipt || {};
  const moduleLabelMap = {
    association_dues: 'Association Dues',
    machinery_collection: 'Machinery Collection',
    machinery_rental: 'Machinery Rental',
    machinery_refund: 'Machinery Down Payment Refund',
    machinery_expense: 'Machinery Expense',
    operator_labor: 'Operator Labor Compensation',
    admin_loan_payment: 'Admin Loan Payment',
    share_capital: 'Share Capital',
    share_capital_withdrawal: 'Share Capital / Savings Withdrawal',
    seed_fertilizer_payment: 'Seed & Fertilizer Payment'
  };
  return moduleLabelMap[r.module] || (r.module ? String(r.module).replace(/_/g, ' ') : '');
});

const paymentForDisplay = computed(() => {
  const source = receiptSourceLabel.value
  const forLabel = paymentForLabel.value
  if (!forLabel || /^collection$/i.test(forLabel)) return source || forLabel || 'Payment'
  if (source && forLabel.toLowerCase() === source.toLowerCase()) return source
  return forLabel
});

const hasRemainingBalance = computed(() => parseFloat(props.receipt?.remaining_balance) > 0.009);

const gcashMeta = computed(() => {
  const meta = props.receipt?.metadata;
  if (!meta || typeof meta !== 'object' || !meta.gcash_submission_id) return {};
  return meta;
});

const EXPENSE_BREAKDOWN_KEYS = [
  { key: 'fuel_and_oil', label: 'Fuel & Oil', description: 'Fuel & Oil' },
  { key: 'labor_cost', label: 'Labor Cost', description: 'Operator and Helper wages' },
  { key: 'per_diem', label: 'Per Diem', description: 'Incentive per hectare/sq.m/hour of service' },
  { key: 'repair_and_maintenance', label: 'Repair & Maintenance', description: 'Repair & Maintenance' },
  { key: 'office_supply', label: 'Office Supply', description: 'Ballpen, etc.' },
  { key: 'communication_expense', label: 'Communication', description: 'Load/Internet' },
  { key: 'utilities_expense', label: 'Utilities', description: 'Water and electricity' },
  { key: 'sundries', label: 'Sundries', description: 'Other expenses' }
];

const expenseLineItems = computed(() => {
  if (!isExpense.value) return [];
  const meta = props.receipt?.metadata || {};
  const fromLines = Array.isArray(meta.line_items) ? meta.line_items : [];
  const normalized = fromLines
    .map((item) => ({
      category: item.category || item.label || 'Expense',
      description: item.description || '',
      amount: parseFloat(item.amount) || 0
    }))
    .filter((item) => item.amount > 0);
  if (normalized.length) return normalized;

  const breakdown = meta.expense_breakdown || {};
  const fromBreakdown = EXPENSE_BREAKDOWN_KEYS
    .map((cat) => ({
      category: cat.label,
      description: cat.description,
      amount: parseFloat(breakdown[cat.key]) || 0
    }))
    .filter((item) => item.amount > 0);
  return fromBreakdown;
});

const printReceipt = () => {
  if (!receiptRef.value) return;
  printInPage(receiptRef.value, {
    title: `Receipt ${props.receipt.receipt_number || ''}`,
    styles: PAYMENT_RECEIPT_PRINT_STYLES
  });
};

onMounted(async () => {
  if (props.autoPrint) {
    await nextTick();
    // Give the modal/layout time to paint before printing (avoids blank mobile prints)
    setTimeout(() => printReceipt(), 600);
  }
});

defineExpose({ printReceipt });
</script>

<style scoped>
.receipt-print-root {
  --rg: v-bind(RECEIPT_GREEN);
  --rg-soft: rgba(45, 143, 78, 0.1);
  --rg-line: rgba(45, 143, 78, 0.28);
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
}
.payment-receipt {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  border: 1.5px solid var(--rg);
  background: #fff;
  color: #000;
  border-radius: 4px;
  overflow: visible;
}
.receipt-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 8px;
  padding: 8px 12px 6px;
  border-bottom: 1.5px solid var(--rg);
  background: var(--rg-soft);
}
.receipt-title {
  margin: 0;
  font-size: 1rem;
  font-weight: 800;
  letter-spacing: 0.3px;
  color: var(--rg);
  line-height: 1.15;
  max-width: 58%;
  word-wrap: break-word;
}
.receipt-meta-box {
  text-align: right;
  font-size: 0.72rem;
  color: #000;
  flex-shrink: 0;
  max-width: 42%;
  min-width: 0;
  line-height: 1.25;
}
.meta-line {
  display: flex;
  gap: 6px;
  justify-content: flex-end;
  margin-bottom: 1px;
  flex-wrap: wrap;
}
.meta-line span { color: var(--rg); min-width: 28px; font-weight: 700; }
.meta-line strong { color: #000; word-break: break-word; font-size: 0.72rem; }
.receipt-org {
  padding: 6px 12px;
  border-bottom: 1px solid var(--rg-line);
  font-size: 0.7rem;
  color: #000;
  display: flex;
  flex-direction: column;
  gap: 0;
  line-height: 1.25;
  background: #fff;
}
.receipt-org strong { font-size: 0.82rem; color: var(--rg); }
.barangay-line { font-weight: 600; color: var(--rg); }
.receipt-field { padding: 6px 12px 0; min-width: 0; }
.receipt-field label {
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--rg);
  margin-bottom: 2px;
}
.field-line {
  border-bottom: 1px solid var(--rg-line);
  min-height: 0;
  padding-bottom: 2px;
  font-size: 0.8rem;
  line-height: 1.25;
  color: #000;
  word-wrap: break-word;
  overflow-wrap: anywhere;
}
.receipt-amount-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 8px;
  padding: 6px 12px 0;
  align-items: end;
}
.amount-words { min-width: 0; }
.amount-words label {
  display: block;
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--rg);
  margin-bottom: 2px;
}
.amount-text { font-style: italic; line-height: 1.25; color: #000; font-size: 0.78rem; }
.amount-box {
  background: #fff;
  border: 1.5px solid var(--rg);
  padding: 4px 8px;
  min-width: 0;
  text-align: right;
  white-space: nowrap;
}
.amount-box .currency { font-size: 0.72rem; margin-right: 2px; color: #000; }
.amount-box strong { font-size: 0.95rem; color: #000; }
.receipt-kv {
  padding: 8px 12px 2px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}
.kv-row {
  display: grid;
  grid-template-columns: 110px minmax(0, 1fr);
  gap: 8px;
  align-items: baseline;
  border-bottom: 1px solid var(--rg-line);
  padding: 4px 0;
}
.kv-label {
  font-size: 0.72rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.02em;
  color: var(--rg);
}
.kv-value {
  font-size: 0.84rem;
  font-weight: 700;
  color: #000;
  word-wrap: break-word;
}
.expense-breakdown-field { padding-bottom: 2px; }
.expense-breakdown-list {
  border: 1px solid var(--rg-line);
  border-radius: 3px;
  overflow: hidden;
  background: #fff;
}
.expense-breakdown-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
  padding: 5px 8px;
  border-bottom: 1px solid var(--rg-line);
  font-size: 0.74rem;
  line-height: 1.25;
  color: #000;
}
.expense-breakdown-row:last-child { border-bottom: none; }
.expense-breakdown-text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}
.expense-breakdown-text strong {
  font-size: 0.76rem;
  color: #000;
}
.expense-breakdown-text span {
  font-size: 0.66rem;
  color: #333;
}
.expense-breakdown-amount {
  flex-shrink: 0;
  font-size: 0.78rem;
  color: #000;
  white-space: nowrap;
}
.receipt-signatures {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 88px;
  gap: 10px;
  padding: 8px 12px;
  background: #fff;
}
.sig-block { min-width: 0; }
.sig-block label {
  color: var(--rg);
  font-size: 0.62rem;
  font-weight: 700;
  text-transform: uppercase;
}
.sig-line {
  border-bottom: 1px solid #000;
  min-height: 0;
  padding-top: 8px;
  font-weight: 600;
  font-size: 0.78rem;
  color: #000;
  word-wrap: break-word;
}
.sign-box { text-align: center; }
.sign-area { border: 1px solid var(--rg-line); height: 28px; margin-bottom: 2px; }
.sign-box span { font-size: 0.62rem; color: var(--rg); }
.receipt-footer-bar {
  background: var(--rg);
  color: #fff;
  padding: 6px 10px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 0;
  font-size: 0.65rem;
  line-height: 1.25;
  word-wrap: break-word;
}
.receipt-footer-bar strong { font-size: 0.72rem; color: #fff; }
.receipt-footer-bar span { color: #fff; }
.receipt-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: flex-end;
}
.btn-print {
  background: var(--rg);
  color: #fff;
  border: none;
  padding: 7px 14px;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.82rem;
  cursor: pointer;
}
.btn-close {
  background: #fff;
  color: #000;
  border: 1px solid var(--rg-line);
  padding: 7px 14px;
  border-radius: 6px;
  font-size: 0.82rem;
  cursor: pointer;
}
@media (max-width: 420px) {
  .receipt-title { font-size: 0.92rem; }
  .receipt-meta-box { font-size: 0.68rem; }
  .receipt-signatures {
    grid-template-columns: minmax(0, 1fr) 72px;
  }
  .receipt-actions { justify-content: stretch; }
  .btn-print,
  .btn-close { flex: 1 1 auto; }
}
@media print {
  .no-print { display: none !important; }
  .payment-receipt {
    overflow: visible !important;
    width: 100% !important;
    max-width: 100% !important;
  }
}
</style>
