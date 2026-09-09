/** Shared receipt branding — single calm green, white paper, black text */

export const RECEIPT_GREEN = '#2d8f4e';

export const formatBarangayAssociation = (barangayName) => {
  const name = String(barangayName || '').trim();
  return name ? `${name} Farmer Association` : '';
};

const G = RECEIPT_GREEN;
const G_SOFT = 'rgba(45, 143, 78, 0.1)';
const G_LINE = 'rgba(45, 143, 78, 0.28)';

const RECEIPT_BASE = `
  * { box-sizing: border-box; }
  html, body {
    width: 100%;
    height: auto;
    margin: 0;
    padding: 0;
    background: #ffffff;
    color: #000000;
    overflow: visible;
  }
  body {
    font-family: 'Segoe UI', Arial, sans-serif;
    padding: 8mm;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-field label,
  .kv-label,
  .meta-line span,
  .words-label,
  .info-label,
  .meta-label,
  .sig-block label,
  .sig-col span,
  .sign-box span {
    color: ${G} !important;
  }
  .field-line,
  .kv-value,
  .info-value,
  .meta-value,
  .meta-line strong,
  .payment-type,
  .sig-line,
  .receipt-org,
  .org-block,
  td,
  th,
  em,
  .amount-text {
    color: #000000 !important;
  }
  .receipt-org strong,
  .org-block strong,
  .barangay-line,
  .chapter-line,
  .receipt-title,
  .expense-title {
    color: ${G} !important;
  }
  .amount-box {
    background: #ffffff !important;
    border: 2px solid ${G} !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .amount-box .currency,
  .amount-box strong {
    color: #000000 !important;
  }
  .receipt-footer-bar,
  .footer-bar,
  .expense-table thead th {
    background: ${G} !important;
    color: #ffffff !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .receipt-footer-bar strong,
  .footer-bar strong,
  .receipt-footer-bar span,
  .footer-bar span,
  .expense-table thead th {
    color: #ffffff !important;
  }
  .panel-head {
    background: ${G_SOFT} !important;
    color: ${G} !important;
    border-bottom: 1px solid ${G_LINE} !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  .total-row td {
    background: ${G_SOFT} !important;
    border-top: 2px solid ${G} !important;
    color: #000000 !important;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }
  @page {
    size: A4 portrait;
    margin: 10mm;
  }
`;

/** Shared print CSS for payment receipts (iframe print — no new tab) */
export const PAYMENT_RECEIPT_PRINT_STYLES = `
  ${RECEIPT_BASE}
  .payment-receipt {
    width: 100% !important;
    max-width: 520px !important;
    margin: 0 auto;
    border: 1.5px solid ${G};
    background: #ffffff;
    color: #000000;
    overflow: visible !important;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .receipt-top {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    padding: 10px 12px 6px;
    border-bottom: 1.5px solid ${G};
    background: ${G_SOFT};
  }
  .receipt-title {
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    letter-spacing: 0.3px;
    line-height: 1.15;
    max-width: 58%;
    word-wrap: break-word;
  }
  .receipt-meta-box {
    text-align: right;
    font-size: 11px;
    flex-shrink: 0;
    max-width: 42%;
  }
  .meta-line {
    display: flex;
    gap: 6px;
    justify-content: flex-end;
    margin-bottom: 1px;
    flex-wrap: wrap;
  }
  .meta-line span { min-width: 28px; font-weight: 700; }
  .meta-line strong { word-break: break-word; }
  .receipt-org {
    padding: 6px 12px;
    border-bottom: 1px solid ${G_LINE};
    font-size: 11px;
    display: flex;
    flex-direction: column;
    gap: 0;
    line-height: 1.25;
    background: #ffffff;
  }
  .receipt-org strong { font-size: 13px; }
  .barangay-line { font-weight: 600; }
  .receipt-field { padding: 6px 12px 0; }
  .receipt-field label {
    display: block;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    margin-bottom: 2px;
  }
  .field-line {
    border-bottom: 1px solid ${G_LINE};
    min-height: 0;
    padding-bottom: 2px;
    font-size: 12px;
    line-height: 1.25;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  .expense-breakdown-list {
    border: 1px solid ${G_LINE};
    border-radius: 3px;
    overflow: hidden;
    background: #ffffff;
  }
  .expense-breakdown-row {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 8px;
    padding: 5px 8px;
    border-bottom: 1px solid ${G_LINE};
    font-size: 11px;
    line-height: 1.25;
    color: #000000;
  }
  .expense-breakdown-row:last-child { border-bottom: none; }
  .expense-breakdown-text {
    display: flex;
    flex-direction: column;
    gap: 1px;
    min-width: 0;
  }
  .expense-breakdown-text strong { font-size: 11px; color: #000000; }
  .expense-breakdown-text span { font-size: 10px; color: #333333; }
  .expense-breakdown-amount {
    flex-shrink: 0;
    font-size: 12px;
    color: #000000;
    white-space: nowrap;
  }
  .receipt-amount-row {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    gap: 8px;
    padding: 6px 12px 0;
    align-items: end;
  }
  .amount-words { min-width: 0; }
  .amount-text { font-style: italic; line-height: 1.25; word-wrap: break-word; font-size: 12px; }
  .amount-box {
    padding: 4px 8px;
    min-width: 0;
    max-width: 100%;
    text-align: right;
    white-space: nowrap;
  }
  .amount-box .currency { font-size: 11px; margin-right: 2px; }
  .amount-box strong { font-size: 15px; }
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
    border-bottom: 1px solid ${G_LINE};
    padding: 4px 0;
  }
  .kv-label {
    font-size: 11px;
    font-weight: 800;
    text-transform: uppercase;
    color: ${G} !important;
  }
  .kv-value {
    font-size: 13px;
    font-weight: 700;
    color: #000000 !important;
    word-wrap: break-word;
  }
  .receipt-signatures {
    display: grid;
    grid-template-columns: minmax(0, 1fr) 90px;
    gap: 10px;
    padding: 8px 12px;
    background: #ffffff;
  }
  .sig-line {
    border-bottom: 1px solid #000000;
    min-height: 0;
    padding-top: 8px;
    font-weight: 600;
    font-size: 12px;
    word-wrap: break-word;
  }
  .sign-box { text-align: center; }
  .sign-area { border: 1px solid ${G_LINE}; height: 28px; margin-bottom: 2px; }
  .sign-box span { font-size: 10px; }
  .receipt-footer-bar {
    padding: 6px 10px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 0;
    font-size: 10px;
    line-height: 1.25;
    word-wrap: break-word;
  }
  .receipt-footer-bar strong { font-size: 11px; }
  .no-print { display: none !important; }

  @media print {
    html, body {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    body { padding: 0 !important; }
    .payment-receipt {
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
      box-shadow: none !important;
    }
  }
`;

/** Shared print CSS for expense receipts */
export const EXPENSE_RECEIPT_PRINT_STYLES = `
  ${RECEIPT_BASE}
  .expense-receipt {
    width: 100% !important;
    max-width: 100% !important;
    margin: 0 auto;
    border: 2px solid ${G};
    background: #ffffff;
    color: #000000;
    overflow: visible !important;
  }
  .expense-title {
    margin: 0;
    padding: 18px 18px 8px;
    text-align: center;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: 0.5px;
    background: ${G_SOFT};
  }
  .org-block {
    text-align: center;
    padding: 0 18px 12px;
    border-bottom: 2px solid ${G};
    font-size: 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: #ffffff;
  }
  .org-block strong { font-size: 14px; }
  .chapter-line { font-weight: 600; }
  .info-grid {
    display: grid;
    grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr);
    gap: 0;
    border-bottom: 2px solid ${G};
  }
  .payee-panel { border-right: 2px solid ${G}; min-width: 0; }
  .panel-head {
    font-weight: 800;
    font-size: 12px;
    padding: 8px 12px;
    letter-spacing: 0.5px;
  }
  .panel-body { padding: 10px 12px 14px; background: #ffffff; }
  .info-row {
    display: grid;
    grid-template-columns: 72px minmax(0, 1fr);
    gap: 8px;
    margin-bottom: 8px;
    font-size: 12px;
  }
  .meta-panel {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 8px;
    background: #ffffff;
    min-width: 0;
  }
  .meta-row {
    display: grid;
    grid-template-columns: minmax(90px, 120px) minmax(0, 1fr);
    gap: 8px;
    font-size: 12px;
  }
  .meta-value { font-weight: 600; word-wrap: break-word; }
  .expense-table-wrap {
    width: 100%;
    padding: 0;
    margin: 0;
    overflow: visible;
  }
  .expense-table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
    border: 2px solid ${G};
    margin: 0;
  }
  .expense-table th,
  .expense-table td {
    border: 1px solid ${G_LINE};
    padding: 8px 10px;
    font-size: 12px;
    vertical-align: middle;
    word-wrap: break-word;
    overflow-wrap: anywhere;
  }
  .expense-table thead th {
    border: 1px solid ${G};
    padding: 10px 12px;
    font-size: 11px;
    font-weight: 800;
    text-align: left;
  }
  .expense-table th:nth-child(4),
  .expense-table td.amount-col {
    text-align: right;
    width: 18%;
  }
  .expense-table tfoot .total-row td {
    border-top: 2px solid ${G} !important;
    font-weight: 700;
    padding: 10px 12px;
  }
  .expense-signatures,
  .signatures {
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    gap: 24px;
    padding: 20px 18px;
    background: #ffffff;
  }
  .amount-words-block {
    padding: 12px 18px;
    font-size: 12px;
    border-top: 1px solid ${G_LINE};
    background: #ffffff;
  }
  .words-label { font-weight: 700; margin-right: 8px; }
  .sig-col {
    text-align: center;
    font-size: 12px;
  }
  .sig-line {
    border-bottom: 1px solid #000000;
    min-height: 28px;
    padding-top: 18px;
    font-weight: 600;
    margin-bottom: 4px;
    word-wrap: break-word;
  }
  .sig-box,
  .sig-col .sign-area {
    border: 1px solid ${G_LINE};
    height: 48px;
    margin-bottom: 6px;
  }
  .footer-bar {
    padding: 10px 16px;
    text-align: center;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 11px;
    word-wrap: break-word;
  }
  .footer-bar strong { font-size: 13px; }
  .no-print { display: none !important; }

  @media print {
    html, body {
      width: 100% !important;
      height: auto !important;
      margin: 0 !important;
      padding: 0 !important;
      overflow: visible !important;
    }
    body { padding: 0 !important; }
    .expense-receipt {
      width: 100% !important;
      max-width: 100% !important;
      overflow: visible !important;
    }
  }
`;
