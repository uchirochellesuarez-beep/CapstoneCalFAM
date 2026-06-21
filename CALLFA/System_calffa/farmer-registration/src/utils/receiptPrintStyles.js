/** Shared print CSS for payment receipts (iframe print — no new tab) */
export const PAYMENT_RECEIPT_PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; margin: 0; background: #fff; color: #111; }
  .payment-receipt { max-width: 720px; margin: 0 auto; border: 2px solid #111; background: #fff; color: #111; overflow: hidden; }
  .receipt-top { display: flex; justify-content: space-between; align-items: flex-start; padding: 20px 24px 12px; border-bottom: 2px solid #111; }
  .receipt-title { margin: 0; font-size: 28px; font-weight: 800; letter-spacing: 1px; color: #111; }
  .receipt-meta-box { text-align: right; font-size: 14px; }
  .meta-line { display: flex; gap: 8px; justify-content: flex-end; margin-bottom: 4px; }
  .meta-line span { color: #555; min-width: 36px; }
  .receipt-org { padding: 12px 24px; border-bottom: 1px solid #d1d5db; font-size: 13px; color: #374151; display: flex; flex-direction: column; gap: 2px; }
  .receipt-org strong { font-size: 16px; color: #1d4ed8; }
  .barangay-line { font-weight: 600; color: #111; }
  .receipt-field { padding: 14px 24px 0; }
  .receipt-field label { display: block; font-size: 12px; font-weight: 700; text-transform: uppercase; color: #6b7280; margin-bottom: 6px; }
  .field-line { border-bottom: 1px solid #9ca3af; min-height: 28px; padding-bottom: 4px; font-size: 15px; color: #111; }
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
  .receipt-footer-bar { background: #2563eb; color: #fff; padding: 12px 24px; text-align: center; display: flex; flex-direction: column; gap: 2px; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .receipt-footer-bar strong { font-size: 14px; }
  @page { margin: 12mm; }
`;

/** Shared print CSS for expense receipts */
export const EXPENSE_RECEIPT_PRINT_STYLES = `
  * { box-sizing: border-box; }
  body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; margin: 0; background: #fff; color: #111; }
  .expense-receipt { max-width: 820px; margin: 0 auto; border: 2px solid #0f4c5c; background: #fff; color: #111; overflow: hidden; }
  .expense-title { margin: 0; padding: 22px 24px 10px; text-align: center; font-size: 30px; font-weight: 800; color: #0f4c5c; letter-spacing: 1px; }
  .org-block { text-align: center; padding: 0 24px 16px; border-bottom: 2px solid #0f4c5c; color: #374151; font-size: 13px; display: flex; flex-direction: column; gap: 2px; }
  .org-block strong { font-size: 15px; color: #0f766e; }
  .chapter-line { font-weight: 600; color: #111; }
  .info-grid { display: grid; grid-template-columns: 1.2fr 1fr; gap: 0; border-bottom: 2px solid #0f4c5c; }
  .payee-panel { border-right: 2px solid #0f4c5c; }
  .panel-head { background: #b8d4e3; color: #0f4c5c; font-weight: 800; font-size: 13px; padding: 10px 14px; letter-spacing: 0.5px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .panel-body { padding: 12px 14px 16px; }
  .info-row { display: grid; grid-template-columns: 72px 1fr; gap: 8px; margin-bottom: 8px; font-size: 13px; }
  .info-label { font-weight: 700; color: #0f4c5c; }
  .info-value { color: #111; }
  .meta-panel { padding: 14px 18px; display: flex; flex-direction: column; justify-content: center; gap: 10px; }
  .meta-row { display: grid; grid-template-columns: 130px 1fr; gap: 8px; font-size: 13px; }
  .meta-label { font-weight: 800; color: #0f4c5c; }
  .meta-value { font-weight: 600; color: #111; }
  .expense-table { width: 100%; border-collapse: collapse; }
  .expense-table thead th { background: #0f4c5c; color: #fff; padding: 10px 12px; font-size: 12px; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .expense-table tbody td { border-bottom: 1px solid #cbd5e1; padding: 10px 12px; font-size: 13px; vertical-align: top; color: #111; }
  .amount-col { text-align: right; white-space: nowrap; }
  .total-row td { background: #f0f9ff; border-top: 2px solid #0f4c5c; padding: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .amount-words-block { padding: 14px 18px; font-size: 13px; border-top: 1px solid #cbd5e1; }
  .words-label { font-weight: 700; color: #0f4c5c; margin-right: 8px; }
  .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; padding: 20px 24px; }
  .sig-line { border-bottom: 1px solid #111; min-height: 28px; padding-top: 20px; font-weight: 600; margin-bottom: 4px; }
  .sig-box { border: 1px solid #9ca3af; height: 52px; margin-bottom: 4px; }
  .sig-col { text-align: center; font-size: 12px; color: #6b7280; }
  .footer-bar { background: #0f4c5c; color: #fff; padding: 12px 24px; text-align: center; display: flex; flex-direction: column; gap: 2px; font-size: 12px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .footer-bar strong { font-size: 14px; }
  @page { margin: 12mm; }
`;
