let activePrintFrame = null;

function removePrintFrame() {
  if (activePrintFrame?.parentNode) {
    activePrintFrame.parentNode.removeChild(activePrintFrame);
  }
  activePrintFrame = null;
}

/**
 * Print receipt via a hidden iframe on the same page (no new tab or popup).
 * @param {HTMLElement} sourceEl - receipt root element (.receipt-print-root)
 * @param {{ title?: string, styles?: string }} options
 */
export function printInPage(sourceEl, options = {}) {
  if (!sourceEl) return;

  removePrintFrame();

  const clone = sourceEl.cloneNode(true);
  clone.querySelectorAll('.no-print').forEach((el) => el.remove());

  const receiptCard = clone.querySelector('.payment-receipt, .expense-receipt');
  if (!receiptCard) return;

  const iframe = document.createElement('iframe');
  iframe.setAttribute('title', 'Receipt print');
  iframe.setAttribute('aria-hidden', 'true');
  iframe.style.cssText =
    'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden;pointer-events:none';
  document.body.appendChild(iframe);
  activePrintFrame = iframe;

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    removePrintFrame();
    return;
  }

  const title = options.title || 'Receipt';
  const styles = options.styles || '';

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${title}</title>
  <style>${styles}</style>
</head>
<body>
  ${receiptCard.outerHTML}
</body>
</html>`);
  doc.close();

  const cleanup = () => {
    removePrintFrame();
    win.removeEventListener('afterprint', cleanup);
  };

  win.addEventListener('afterprint', cleanup, { once: true });
  setTimeout(removePrintFrame, 120000);

  setTimeout(() => {
    win.focus();
    win.print();
  }, 400);
}
