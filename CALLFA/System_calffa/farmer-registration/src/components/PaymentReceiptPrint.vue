<template>
  <div ref="receiptRef" class="receipt-print-root">
    <div class="payment-receipt">
      <div class="receipt-top">
        <h1 class="receipt-title">{{ receiptTitle }}</h1>
        <div class="receipt-meta-box">
          <div class="meta-line"><span>No.</span><strong>{{ receipt.receipt_number || '—' }}</strong></div>
          <div class="meta-line"><span>Date</span><strong>{{ formatDate(receipt.payment_date) }}</strong></div>
        </div>
      </div>

      <div class="receipt-org">
        <strong>CalFFA</strong>
        <span>Calapan Farmer Federation Association</span>
        <span v-if="receipt.barangay_name" class="barangay-line">{{ receipt.barangay_name }} Chapter</span>
      </div>

      <div class="receipt-field">
        <label>{{ clientFieldLabel }}</label>
        <div class="field-line">{{ receipt.client_name || '—' }}</div>
      </div>

      <div class="receipt-amount-row">
        <div class="amount-words">
          <label>Amount</label>
          <div class="field-line amount-text">{{ amountWords }}</div>
        </div>
        <div class="amount-box">
          <span class="currency">₱</span>
          <strong>{{ formatNumber(receipt.amount_paid) }}</strong>
        </div>
      </div>

      <div class="receipt-field">
        <label>Payment For</label>
        <div class="field-line">{{ paymentForLabel }}</div>
      </div>

      <div v-if="receiptSourceLabel" class="receipt-field">
        <label>Source Transaction</label>
        <div class="field-line">{{ receiptSourceLabel }}</div>
      </div>

      <div class="receipt-field inline-two">
        <div>
          <label>Payment Type</label>
          <div class="field-line payment-type">{{ receipt.payment_method || 'Cash' }}</div>
        </div>
        <div v-if="hasRemainingBalance">
          <label>Remaining Balance</label>
          <div class="field-line">₱{{ formatNumber(receipt.remaining_balance) }}</div>
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
        <strong>Calapan Farmer Federation Association — {{ receipt.barangay_name || 'Barangay Chapter' }}</strong>
        <span>{{ footerNote }}</span>
      </div>
    </div>

    <div class="receipt-actions no-print">
      <button type="button" class="btn-print" @click="printReceipt">Print Receipt</button>
      <button type="button" class="btn-close" @click="$emit('close')">Close</button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { amountToWords } from '../utils/amountToWords';
import { printInPage } from '../utils/printInPage';
import { PAYMENT_RECEIPT_PRINT_STYLES } from '../utils/receiptPrintStyles';

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

const receiptTitle = computed(() => (isRefund.value ? 'REFUND RECEIPT' : 'PAYMENT RECEIPT'));
const clientFieldLabel = computed(() => (isRefund.value ? 'Paid To' : 'Received From'));
const releasedByLabel = computed(() => (isRefund.value ? 'Released By' : 'Received By'));
const footerNote = computed(() =>
  isRefund.value
    ? 'Official refund receipt · Keep for your records'
    : 'Official payment receipt · Keep for your records'
);

const amountWords = computed(() => amountToWords(props.receipt?.amount_paid || 0));

const paymentForLabel = computed(() => {
  const r = props.receipt || {};
  return r.payment_for || r.remarks || (r.module ? String(r.module).replace(/_/g, ' ') : '') || 'Payment';
});

const receiptSourceLabel = computed(() => {
  const r = props.receipt || {};
  const moduleLabelMap = {
    association_dues: 'Association Dues',
    machinery_collection: 'Machinery Collection',
    machinery_rental: 'Machinery Rental',
    machinery_refund: 'Machinery Down Payment Refund',
    admin_loan_payment: 'Admin Loan Payment',
    share_capital: 'Share Capital',
    seed_fertilizer_payment: 'Seed & Fertilizer Payment'
  };
  return moduleLabelMap[r.module] || (r.module ? String(r.module).replace(/_/g, ' ') : '');
});

const hasRemainingBalance = computed(() => parseFloat(props.receipt?.remaining_balance) > 0.009);

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
    setTimeout(() => printReceipt(), 350);
  }
});

defineExpose({ printReceipt });
</script>

<style scoped>
.receipt-print-root { display: flex; flex-direction: column; gap: 16px; }
.payment-receipt { border: 2px solid #111; background: #fff; color: #111; border-radius: 4px; overflow: hidden; }
.receipt-top { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 12px; border-bottom: 2px solid #111; }
.receipt-title { margin: 0; font-size: 26px; font-weight: 800; letter-spacing: 1px; }
.receipt-meta-box { text-align: right; font-size: 14px; }
.meta-line { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 4px; }
.meta-line span { color: #555; min-width: 36px; }
.receipt-org { padding: 12px 24px; border-bottom: 1px solid #d1d5db; font-size: 13px; color: #374151; display: flex; flex-direction: column; gap: 2px; }
.receipt-org strong { font-size: 16px; color: #1d4ed8; }
.barangay-line { font-weight: 600; color: #111; }
.receipt-field { padding: 14px 24px 0; }
.receipt-field label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
.field-line { border-bottom: 1px solid #9ca3af; min-height: 28px; padding-bottom: 4px; font-size: 15px; }
.receipt-amount-row { display: grid; grid-template-columns: 1fr auto; gap: 16px; padding: 16px 24px 0; align-items: end; }
.amount-text { font-style: italic; line-height: 1.4; }
.amount-box { background: #dbeafe; border: 1px solid #93c5fd; padding: 12px 18px; min-width: 140px; text-align: right; }
.amount-box .currency { font-size: 14px; margin-right: 4px; color: #1e40af; }
.amount-box strong { font-size: 22px; color: #1e3a8a; }
.inline-two { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
.payment-type { font-weight: 700; text-transform: capitalize; }
.receipt-signatures { display: grid; grid-template-columns: 1fr 180px; gap: 24px; padding: 24px; }
.sig-line { border-bottom: 1px solid #111; min-height: 32px; padding-top: 24px; font-weight: 600; }
.sign-box { text-align: center; }
.sign-area { border: 1px solid #9ca3af; height: 56px; margin-bottom: 4px; }
.sign-box span { font-size: 12px; color: #6b7280; }
.receipt-footer-bar { background: #2563eb; color: #fff; padding: 12px 24px; text-align: center; display: flex; flex-direction: column; gap: 2px; font-size: 12px; }
.receipt-footer-bar strong { font-size: 14px; }
.receipt-actions { display: flex; gap: 12px; justify-content: flex-end; }
.btn-print { background: #2563eb; color: #fff; border: none; padding: 10px 18px; border-radius: 6px; font-weight: 600; cursor: pointer; }
.btn-close { background: #e5e7eb; color: #111; border: none; padding: 10px 18px; border-radius: 6px; cursor: pointer; }
@media print { .no-print { display: none !important; } }
</style>
