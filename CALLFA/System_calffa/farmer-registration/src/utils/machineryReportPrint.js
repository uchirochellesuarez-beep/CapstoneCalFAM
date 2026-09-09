/** Shared machinery financial report print helpers (iframe + self-contained CSS). */

export function buildPrintableSheetHtml(root, sheetMeta = {}) {
  const clone = root.cloneNode(true);
  const sheetFields = [
    ['contactPerson', sheetMeta.contactPerson],
    ['croppingPeriod', sheetMeta.croppingPeriod],
    ['fcaAddress', sheetMeta.fcaAddress],
    ['contactNumber', sheetMeta.contactNumber]
  ];

  for (const [field, value] of sheetFields) {
    clone.querySelectorAll(`[data-sheet-field="${field}"]`).forEach((input) => {
      const span = document.createElement('span');
      span.className = 'collectibles-meta-fill collectibles-meta-fill-printed';
      span.textContent = value || '';
      if (!value) span.innerHTML = '&nbsp;';
      const line = input.closest('.sheet-fill-line');
      if (line) {
        line.replaceWith(span);
      } else {
        input.replaceWith(span);
      }
    });
  }

  clone.querySelectorAll('.fcr-mobile-list').forEach((el) => el.remove());
  clone.querySelectorAll('.report-header, .report-refresh-overlay').forEach((el) => el.remove());

  return clone.outerHTML;
}

export function getMachineryReportPrintStyles(orientation = 'portrait') {
  const pageSize = orientation === 'landscape' ? 'A4 landscape' : 'A4 portrait';
  return `
    @page { size: ${pageSize}; margin: 8mm; }
    *, *::before, *::after { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      font-family: 'Segoe UI', Arial, sans-serif;
      color: #0f172a;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    #printable-report {
      margin: 0 !important;
      padding: 0 !important;
      border: none !important;
      box-shadow: none !important;
      background: #fff !important;
      width: 100%;
    }
    #printable-report .report-header,
    #printable-report .report-refresh-overlay {
      display: none !important;
    }
    #printable-report .report-footer {
      margin-top: 20px;
      padding-top: 16px;
      border-top: 1px solid #e5e7eb;
      text-align: center;
      color: #64748b;
      font-size: 11px;
    }
    #printable-report .collectibles-form-sheet {
      margin: 16px 0 20px;
      padding: 18px 20px 20px;
      background: #fff;
      border: 2px solid #0f172a;
      border-radius: 12px;
      box-shadow: none;
      page-break-inside: avoid;
    }
    #printable-report .collectibles-form-title-block {
      text-align: center;
      margin-bottom: 14px;
    }
    #printable-report .collectibles-main-title {
      margin: 0;
      font-size: 1.25rem;
      font-weight: 800;
      color: #0f172a;
    }
    #printable-report .collectibles-main-subtitle {
      margin: 5px 0 0;
      font-size: 1rem;
      font-weight: 700;
      color: #334155;
    }
    #printable-report .collectibles-meta-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 10px 12px;
      margin-bottom: 10px;
      background: #f8fafc;
    }
    #printable-report .collectibles-meta-split {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 10px 24px;
      align-items: start;
    }
    #printable-report .collectibles-meta-col {
      display: flex;
      flex-direction: column;
      gap: 10px;
      min-width: 0;
    }
    #printable-report .collectibles-meta-col-left {
      padding-right: 12px;
      border-right: 1px solid #cbd5e1;
    }
    #printable-report .collectibles-meta-col-right { padding-left: 4px; }
    #printable-report .collectibles-meta-field-block {
      display: flex;
      flex-direction: column;
      gap: 3px;
      width: 100%;
    }
    #printable-report .collectibles-meta-label-sm {
      font-size: 0.72rem;
      font-weight: 800;
      color: #0f172a;
      line-height: 1.25;
    }
    #printable-report .collectibles-meta-fill,
    #printable-report .collectibles-meta-fill-printed {
      display: block;
      width: 100%;
      min-height: 22px;
      font-size: 0.75rem;
      font-weight: 600;
      color: #1e293b;
      border-bottom: 1px solid #334155;
      padding: 2px 4px 4px;
      line-height: 1.3;
    }
    #printable-report .sheet-fill-line,
    #printable-report .sheet-fill-input { display: none !important; }
    #printable-report .collectibles-table-wrap,
    #printable-report .fcr-responsive-wrap {
      overflow: visible !important;
      width: 100%;
    }
    #printable-report .fcr-mobile-list { display: none !important; }
    #printable-report .fcr-desktop-table {
      display: block !important;
      width: 100% !important;
    }
    #printable-report .collectibles-data-table,
    #printable-report .farmer-clients-record-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 0.62rem !important;
      display: table !important;
    }
    #printable-report .farmer-clients-record-table thead { display: table-header-group !important; }
    #printable-report .farmer-clients-record-table tbody { display: table-row-group !important; }
    #printable-report .farmer-clients-record-table tfoot { display: table-footer-group !important; }
    #printable-report .farmer-clients-record-table tr { display: table-row !important; }
    #printable-report .collectibles-data-table th,
    #printable-report .collectibles-data-table td,
    #printable-report .farmer-clients-record-table th,
    #printable-report .farmer-clients-record-table td {
      display: table-cell !important;
      border: 1px solid #1e293b !important;
      padding: 4px 3px !important;
      vertical-align: middle !important;
      line-height: 1.25 !important;
      word-wrap: break-word !important;
      overflow-wrap: break-word !important;
    }
    #printable-report .collectibles-data-table th,
    #printable-report .farmer-clients-record-table th {
      background: #e2e8f0 !important;
      font-weight: 800 !important;
      color: #0f172a !important;
      text-align: center !important;
      font-size: 0.58rem !important;
    }
    #printable-report .farmer-clients-record-table td {
      font-weight: 600 !important;
      color: #0f172a !important;
      font-size: 0.62rem !important;
    }
    #printable-report .farmer-clients-record-table .th-tl,
    #printable-report .collectibles-data-table .th-tl {
      display: block;
      margin-top: 2px;
      font-size: 0.85em;
      font-weight: 600;
      color: #475569;
      line-height: 1.15;
    }
    #printable-report .farmer-clients-record-table .fcr-col-client { width: 11%; text-align: left !important; }
    #printable-report .farmer-clients-record-table .fcr-col-loc { width: 10%; text-align: left !important; }
    #printable-report .farmer-clients-record-table .fcr-col-cat { width: 6%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-date { width: 7%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-fee { width: 9%; text-align: right !important; }
    #printable-report .farmer-clients-record-table .fcr-col-area { width: 7%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-hrs { width: 5%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-col-amt { width: 9%; text-align: right !important; }
    #printable-report .farmer-clients-record-table .fcr-col-rcpt { width: 7%; text-align: center !important; }
    #printable-report .farmer-clients-record-table .fcr-total-row td,
    #printable-report .collectibles-list-table .fcr-total-row td {
      background: #f1f5f9 !important;
      font-weight: 800 !important;
      border-top: 2px solid #0f172a !important;
    }
    #printable-report .collectibles-list-table {
      width: 100% !important;
      border-collapse: collapse !important;
      table-layout: fixed !important;
      font-size: 0.68rem !important;
      display: table !important;
    }
    #printable-report .collectibles-list-table thead { display: table-header-group !important; }
    #printable-report .collectibles-list-table tbody { display: table-row-group !important; }
    #printable-report .collectibles-list-table tfoot { display: table-footer-group !important; }
    #printable-report .collectibles-list-table tr { display: table-row !important; }
    #printable-report .collectibles-list-table th,
    #printable-report .collectibles-list-table td {
      display: table-cell !important;
      border: 1px solid #1e293b !important;
      padding: 5px 4px !important;
      vertical-align: middle !important;
      line-height: 1.25 !important;
      word-wrap: break-word !important;
    }
    #printable-report .collectibles-list-table th {
      background: #e2e8f0 !important;
      font-weight: 800 !important;
      text-align: center !important;
      font-size: 0.62rem !important;
    }
    #printable-report .collectibles-list-table td {
      font-weight: 600 !important;
      font-size: 0.68rem !important;
    }
    #printable-report .collectibles-list-table .text-right { text-align: right !important; }
    #printable-report .collectibles-list-table .col-client { width: 22%; text-align: left !important; }
    #printable-report .collectibles-list-table .col-ar { width: 15%; text-align: right !important; }
    #printable-report .collectibles-list-table .col-cash { width: 18%; text-align: right !important; }
    #printable-report .collectibles-list-table .col-date { width: 14%; text-align: center !important; }
    #printable-report .collectibles-list-table .col-rcpt { width: 14%; text-align: center !important; }
    #printable-report .collectibles-list-table .col-bal { width: 17%; text-align: right !important; }
    #printable-report .mfr-expense-table .fcr-total-row td,
    #printable-report .farmer-clients-record-table.mfr-expense-table .fcr-total-row td {
      background: #f1f5f9 !important;
      font-weight: 800 !important;
      border-top: 2px solid #0f172a !important;
    }
    #printable-report .mfr-summary-table .mfr-col-item { width: 50%; text-align: left !important; }
    #printable-report .mfr-summary-table .mfr-col-amt { width: 25%; text-align: right !important; }
    #printable-report .mfr-summary-table .mfr-col-rec { width: 25%; text-align: center !important; }
    #printable-report .mfr-distribution-table .mfr-col-alloc { width: 45%; text-align: left !important; }
    #printable-report .mfr-distribution-table .mfr-col-share { width: 15%; text-align: center !important; }
    #printable-report .mfr-distribution-table .mfr-col-amt { width: 40%; text-align: right !important; }
    #printable-report .mfr-transactions-table .mfr-col-date { width: 11%; text-align: center !important; }
    #printable-report .mfr-transactions-table .mfr-col-type { width: 12%; text-align: center !important; }
    #printable-report .mfr-transactions-table .mfr-col-mach { width: 14%; text-align: left !important; }
    #printable-report .mfr-transactions-table .mfr-col-desc { width: 28%; text-align: left !important; }
    #printable-report .mfr-transactions-table .mfr-col-farmer { width: 18%; text-align: left !important; }
    #printable-report .mfr-transactions-table .mfr-col-amt { width: 17%; text-align: right !important; }
    #printable-report .mfr-expense-table .mfr-col-date { width: 8%; text-align: center !important; }
    #printable-report .mfr-expense-table .mfr-col-mach { width: 10%; text-align: left !important; }
    #printable-report .mfr-expense-table .mfr-col-desc { width: 16%; text-align: left !important; }
    #printable-report .mfr-expense-table .mfr-col-ref { width: 7%; text-align: center !important; }
    #printable-report .mfr-expense-table .mfr-col-sm { width: 9%; text-align: right !important; }
    #printable-report .mfr-expense-table .mfr-col-amt { width: 11%; text-align: right !important; }
    #printable-report .mfr-bookings-table .mfr-col-date { width: 10%; text-align: center !important; }
    #printable-report .mfr-bookings-table .mfr-col-ref { width: 9%; text-align: center !important; }
    #printable-report .mfr-bookings-table .mfr-col-mach { width: 14%; text-align: left !important; }
    #printable-report .mfr-bookings-table .mfr-col-farmer { width: 16%; text-align: left !important; }
    #printable-report .mfr-bookings-table .mfr-col-status { width: 12%; text-align: center !important; }
    #printable-report .mfr-bookings-table .mfr-col-amt { width: 13%; text-align: right !important; }
    #printable-report .fo-overview-transactions-table .fo-col-date { width: 9%; text-align: center !important; }
    #printable-report .fo-overview-transactions-table .fo-col-module { width: 11%; text-align: left !important; }
    #printable-report .fo-overview-transactions-table .fo-col-type { width: 10%; text-align: center !important; }
    #printable-report .fo-overview-transactions-table .fo-col-member { width: 13%; text-align: left !important; }
    #printable-report .fo-overview-transactions-table .fo-col-desc { width: 24%; text-align: left !important; }
    #printable-report .fo-overview-transactions-table .fo-col-rcpt { width: 11%; text-align: center !important; }
    #printable-report .fo-overview-transactions-table .fo-col-amt { width: 11%; text-align: right !important; }
    #printable-report .fo-overview-transactions-table .fo-col-barangay { width: 11%; text-align: left !important; }
    #printable-report .collectibles-empty-note {
      text-align: center;
      color: #64748b;
      padding: 12px !important;
    }
    #printable-report .report-plain-section,
    #printable-report .report-section {
      page-break-inside: avoid;
      margin-bottom: 16px;
    }
    #printable-report .report-plain-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 12px;
    }
    #printable-report .report-plain-table th,
    #printable-report .report-plain-table td {
      border: 1px solid #e5e7eb;
      padding: 8px 10px;
    }
    #printable-report .text-right { text-align: right !important; }
  `;
}
