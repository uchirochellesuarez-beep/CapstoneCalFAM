let activePrintFrame = null;
let printTimer = null;

function removePrintFrame() {
  if (printTimer) {
    clearTimeout(printTimer);
    printTimer = null;
  }
  if (activePrintFrame?.parentNode) {
    activePrintFrame.parentNode.removeChild(activePrintFrame);
  }
  activePrintFrame = null;
}

/**
 * Print receipt via a hidden iframe on the same page (no new tab or popup).
 * Uses a real layout size off-screen — width/height 0 causes blank prints on mobile.
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
  // A4 printable width at 96dpi ≈ 794px. Use full height so long receipts are not clipped.
  iframe.style.cssText = [
    'position:fixed',
    'left:-10000px',
    'top:0',
    'width:794px',
    'height:1600px',
    'border:0',
    'opacity:0',
    'pointer-events:none',
    'z-index:-1',
    'overflow:visible'
  ].join(';');
  document.body.appendChild(iframe);
  activePrintFrame = iframe;

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  const win = iframe.contentWindow;
  if (!doc || !win) {
    removePrintFrame();
    return;
  }

  const title = String(options.title || 'Receipt').replace(/</g, '&lt;');
  const styles = options.styles || '';

  doc.open();
  doc.write(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${title}</title>
  <style>
    html, body {
      margin: 0;
      padding: 0;
      background: #fff;
      width: 100%;
      height: auto;
      overflow: visible;
    }
    ${styles}
  </style>
</head>
<body>
  ${receiptCard.outerHTML}
</body>
</html>`);
  doc.close();

  const cleanup = () => {
    try {
      win.removeEventListener('afterprint', cleanup);
    } catch (_) {
      /* ignore */
    }
    // Delay removal so mobile print preview finishes reading the iframe
    setTimeout(removePrintFrame, 1000);
  };

  win.addEventListener('afterprint', cleanup, { once: true });
  // Safety cleanup if afterprint never fires (some mobile browsers)
  printTimer = setTimeout(removePrintFrame, 120000);

  let printed = false;
  const doPrint = () => {
    if (printed || activePrintFrame !== iframe) return;
    printed = true;
    try {
      // Stretch iframe to content height so browsers measure full receipt
      try {
        const contentHeight = Math.max(
          doc.body?.scrollHeight || 0,
          doc.documentElement?.scrollHeight || 0,
          1123
        );
        iframe.style.height = `${contentHeight + 40}px`;
      } catch (_) {
        /* ignore */
      }
      win.focus();
      win.print();
    } catch (err) {
      console.error('printInPage failed:', err);
      removePrintFrame();
    }
  };

  // Wait for iframe document + a paint so layout exists before print()
  const start = () => {
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        setTimeout(doPrint, 300);
      });
    });
  };

  if (doc.readyState === 'complete') {
    start();
  } else {
    iframe.addEventListener('load', start, { once: true });
    // Fallback if load event is skipped after document.write
    setTimeout(start, 500);
  }
}
