<template>
  <div ref="receiptRef" class="receipt-print-root">
    <div class="expense-receipt">
      <h1 class="expense-title">EXPENSE RECEIPT</h1>

      <div class="org-block">
        <strong>CalFFA</strong>
        <span>Calapan Farmer Federation Association</span>
        <span v-if="receipt.barangay_name" class="chapter-line">{{ receipt.barangay_name }} Chapter</span>
      </div>

      <div class="info-grid">
        <div class="payee-panel">
          <div class="panel-head">TREASURER INFORMATION</div>
          <div class="panel-body">
            <div class="info-row">
              <span class="info-label">Name</span>
              <span class="info-value">{{ treasurerName }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Role</span>
              <span class="info-value">{{ treasurerRole }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Address</span>
              <span class="info-value">{{ treasurerAddress || '—' }}</span>
            </div>
            <div class="info-row">
              <span class="info-label">Phone</span>
              <span class="info-value">{{ treasurerPhone || '—' }}</span>
            </div>
            <div v-if="receipt.barangay_name" class="info-row">
              <span class="info-label">Barangay</span>
              <span class="info-value">{{ receipt.barangay_name }} Chapter</span>
            </div>
            <div v-if="expenseForLabel" class="info-row">
              <span class="info-label">Expense For</span>
              <span class="info-value">{{ expenseForLabel }}</span>
            </div>
          </div>
        </div>

        <div class="meta-panel">
          <div class="meta-row">
            <span class="meta-label">RECEIPT NO</span>
            <span class="meta-value">{{ receipt.receipt_number || '—' }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">DATE</span>
            <span class="meta-value">{{ formatDateShort(receipt.payment_date) }}</span>
          </div>
          <div class="meta-row">
            <span class="meta-label">PAYMENT METHOD</span>
            <span class="meta-value">{{ (receipt.payment_method || 'Cash').toUpperCase() }}</span>
          </div>
        </div>
      </div>

      <table class="expense-table">
        <thead>
          <tr>
            <th>DATE</th>
            <th>EXPENSE CATEGORY</th>
            <th>EXPENSE DESCRIPTION</th>
            <th class="amount-col">AMOUNT</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="(item, idx) in displayLineItems" :key="'line-' + idx">
            <td>{{ formatDateShort(item.date) }}</td>
            <td>{{ item.category }}</td>
            <td>{{ item.description }}</td>
            <td class="amount-col">₱{{ formatNumber(item.amount) }}</td>
          </tr>
          <tr v-for="n in fillerRows" :key="'empty-' + n">
            <td>&nbsp;</td>
            <td></td>
            <td></td>
            <td class="amount-col"></td>
          </tr>
        </tbody>
        <tfoot>
          <tr class="total-row">
            <td colspan="3"><strong>TOTAL</strong></td>
            <td class="amount-col"><strong>₱{{ formatNumber(totalAmount) }}</strong></td>
          </tr>
        </tfoot>
      </table>

      <div class="amount-words-block">
        <span class="words-label">Amount in words:</span>
        <em>{{ amountWords }}</em>
      </div>

      <div class="signatures">
        <div class="sig-col">
          <div class="sig-line">{{ receipt.collector_name || 'Treasurer' }}</div>
          <span>Prepared By</span>
        </div>
        <div class="sig-col">
          <div class="sig-box"></div>
          <span>Approved By</span>
        </div>
      </div>

      <div class="footer-bar">
        <strong>Calapan Farmer Federation Association</strong>
        <span>Official expense receipt · Keep for your records</span>
      </div>
    </div>

    <div class="receipt-actions no-print">
      <button type="button" class="btn-print" @click="printReceipt">Print Expense Receipt</button>
      <button type="button" class="btn-close" @click="$emit('close')">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { amountToWords } from '../utils/amountToWords';
import { printInPage } from '../utils/printInPage';
import { EXPENSE_RECEIPT_PRINT_STYLES } from '../utils/receiptPrintStyles';

const props = defineProps({
  receipt: { type: Object, required: true },
  autoPrint: { type: Boolean, default: false }
});

defineEmits(['close']);

const receiptRef = ref(null);

const meta = computed(() => {
  const m = props.receipt?.metadata;
  return m && typeof m === 'object' ? m : {};
});

const treasurerName = computed(
  () => meta.value.payee_name || props.receipt.collector_name || props.receipt.client_name || 'Treasurer'
);
const treasurerRole = computed(
  () => meta.value.payee_role || props.receipt.collector_role || 'Treasurer'
);
const treasurerAddress = computed(
  () => meta.value.payee_address || props.receipt.collector_address || ''
);
const treasurerPhone = computed(
  () => meta.value.payee_phone || props.receipt.collector_phone || ''
);
const EXPENSE_CATEGORY_DESCRIPTIONS = {
  'Fuel & Oil': 'Fuel & Oil',
  'Labor Cost': 'Operator and Helper wages',
  'Per Diem': 'Incentive per hectare/sq.m/hour of service',
  'Repair & Maintenance': 'Repair & Maintenance',
  'Office Supply': 'Ballpen, etc.',
  Communication: 'Load/Internet',
  Utilities: 'Water and electricity',
  Sundries: 'Other expenses',
  'Machinery Expense': 'Machinery expense'
};

const EXPENSE_LINE_FIELDS = [
  { key: 'fuel_and_oil', label: 'Fuel & Oil', description: 'Fuel & Oil' },
  { key: 'labor_cost', label: 'Labor Cost', description: 'Operator and Helper wages' },
  { key: 'per_diem', label: 'Per Diem', description: 'Incentive per hectare/sq.m/hour of service' },
  { key: 'repair_and_maintenance', label: 'Repair & Maintenance', description: 'Repair & Maintenance' },
  { key: 'office_supply', label: 'Office Supply', description: 'Ballpen, etc.' },
  { key: 'communication_expense', label: 'Communication', description: 'Load/Internet' },
  { key: 'utilities_expense', label: 'Utilities', description: 'Water and electricity' },
  { key: 'sundries', label: 'Sundries', description: 'Other expenses' }
];

function parseAmount(value) {
  const n = parseFloat(value);
  return Number.isFinite(n) ? n : 0;
}

function buildLineItemsFromBreakdown(breakdown, expenseDate) {
  if (!breakdown || typeof breakdown !== 'object') return [];
  const items = [];
  for (const field of EXPENSE_LINE_FIELDS) {
    const amount = parseAmount(breakdown[field.key]);
    if (amount > 0) {
      items.push({
        date: expenseDate,
        category: field.label,
        description: field.description,
        amount
      });
    }
  }
  if (items.length === 0) {
    const total = parseAmount(breakdown.total_amount);
    if (total > 0 && (breakdown.booking_id || breakdown.operator_id)) {
      items.push({
        date: expenseDate,
        category: 'Labor Cost',
        description: 'Operator and Helper wages',
        amount: total
      });
    }
  }
  return items;
}

function isGenericFallbackLine(items) {
  return items.length === 1 && String(items[0]?.category || '') === 'Machinery Expense';
}

const expenseForLabel = computed(() => {
  if (meta.value.machinery_name) return meta.value.machinery_name;
  const remarks = String(props.receipt.remarks || props.receipt.payment_for || '').trim();
  if (remarks && !/^Operational expenses for Booking #/i.test(remarks)) return remarks;
  return '';
});

function lineItemDescription(item) {
  const category = String(item.category || '').trim();
  const fromCategory = EXPENSE_CATEGORY_DESCRIPTIONS[category];
  if (fromCategory) return fromCategory;

  const text = String(item.description || '').trim();
  if (!text) return category || 'Machinery expense';
  if (/^Operational expenses for Booking #/i.test(text) || /^Operator —/i.test(text)) {
    return fromCategory || category || 'Machinery expense';
  }
  return text;
}

const lineItems = computed(() => {
  const items = meta.value.line_items;
  const expenseDate = props.receipt.payment_date;

  if (Array.isArray(items) && items.length) {
    if (isGenericFallbackLine(items) && meta.value.expense_breakdown) {
      const rebuilt = buildLineItemsFromBreakdown(meta.value.expense_breakdown, items[0].date || expenseDate);
      if (rebuilt.length) return rebuilt;
    }

    return items.map((item) => ({
      ...item,
      description: lineItemDescription(item)
    }));
  }

  const fromBreakdown = buildLineItemsFromBreakdown(meta.value.expense_breakdown, expenseDate);
  if (fromBreakdown.length) return fromBreakdown;

  return [
    {
      date: expenseDate,
      category: 'Machinery Expense',
      description: 'Machinery expense',
      amount: props.receipt.amount_paid
    }
  ];
});

const displayLineItems = computed(() => lineItems.value.filter((i) => parseFloat(i.amount) > 0));
const fillerRows = computed(() => Math.max(0, 4 - displayLineItems.value.length));
const totalAmount = computed(() =>
  displayLineItems.value.reduce((sum, item) => sum + (parseFloat(item.amount) || 0), 0)
);
const amountWords = computed(() => amountToWords(totalAmount.value));

const formatNumber = (n) =>
  new Intl.NumberFormat('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(n) || 0);

const formatDateShort = (d) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' });
};

const printReceipt = () => {
  if (!receiptRef.value) return;
  printInPage(receiptRef.value, {
    title: `Expense Receipt ${props.receipt.receipt_number || ''}`,
    styles: EXPENSE_RECEIPT_PRINT_STYLES
  });
};

onMounted(async () => {
  if (props.autoPrint) {
    await nextTick();
    setTimeout(() => printReceipt(), 350);
  }
});

defineExpose({ printReceipt });
</script>

<style scoped>
.receipt-print-root { display: flex; flex-direction: column; gap: 16px; }
.expense-receipt { border: 2px solid #0f4c5c; background: #fff; color: #111; border-radius: 4px; overflow: hidden; }
.expense-title { margin: 0; padding: 22px 24px 10px; text-align: center; font-size: 28px; font-weight: 800; color: #0f4c5c; letter-spacing: 1px; }
.org-block { text-align: center; padding: 0 24px 16px; border-bottom: 2px solid #0f4c5c; font-size: 13px; color: #374151; display: flex; flex-direction: column; gap: 2px; }
.org-block strong { font-size: 15px; color: #0f766e; }
.chapter-line { font-weight: 600; }
.info-grid { display: grid; grid-template-columns: 1.2fr 1fr; border-bottom: 2px solid #0f4c5c; }
.payee-panel { border-right: 2px solid #0f4c5c; }
.panel-head { background: #b8d4e3; color: #0f4c5c; font-weight: 800; font-size: 13px; padding: 10px 14px; }
.panel-body { padding: 12px 14px 16px; }
.info-row { display: grid; grid-template-columns: 72px 1fr; gap: 8px; margin-bottom: 8px; font-size: 13px; }
.info-label { font-weight: 700; color: #0f4c5c; }
.meta-panel { padding: 14px 18px; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
.meta-row { display: grid; grid-template-columns: 130px 1fr; gap: 8px; font-size: 13px; }
.meta-label { font-weight: 800; color: #0f4c5c; }
.meta-value { font-weight: 600; }
.expense-table { width: 100%; border-collapse: collapse; }
.expense-table thead th { background: #0f4c5c; color: #fff; padding: 10px 12px; font-size: 12px; text-align: left; }
.expense-table tbody td { border-bottom: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; }
.amount-col { text-align: right; }
.total-row td { background: #f0f9ff; border-top: 2px solid #0f4c5c; padding: 12px; }
.amount-words-block { padding: 14px 18px; font-size: 13px; border-top: 1px solid #cbd5e1; }
.words-label { font-weight: 700; color: #0f4c5c; margin-right: 8px; }
.signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 20px 24px; }
.sig-line { border-bottom: 1px solid #111; min-height: 28px; padding-top: 20px; font-weight: 600; margin-bottom: 4px; }
.sig-box { border: 1px solid #9ca3af; height: 52px; margin-bottom: 4px; }
.sig-col { text-align: center; font-size: 12px; color: #6b7280; }
.footer-bar { background: #0f4c5c; color: #fff; padding: 12px 24px; text-align: center; display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.footer-bar strong { font-size: 14px; }
.receipt-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn-print { background: #0f766e; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-close { background: #e5e7eb; color: #111; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; }
@media (max-width: 640px) {
  .info-grid { grid-template-columns: 1fr; }
  .payee-panel { border-right: none; border-bottom: 2px solid #0f4c5c; }
}
@media print { .no-print { display: none !important; } }
</style>
