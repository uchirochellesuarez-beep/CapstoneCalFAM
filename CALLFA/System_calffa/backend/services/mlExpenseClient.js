const axios = require('axios');

/**
 * Calls the dedicated Python ML service (FastAPI + scikit-learn).
 * @param {number[]} totalExpensesSeries — chronological values
 * @returns {Promise<object|null>} Parsed JSON with ok:true or null if disabled/unreachable
 */
async function fetchExpenseForecastFromMlService(totalExpensesSeries) {
  const base = (process.env.ML_API_URL || '').trim().replace(/\/$/, '');
  if (!base) return null;

  const timeout =
    parseInt(String(process.env.ML_API_TIMEOUT_MS || '15000'), 10) || 15000;
  const url = `${base}/forecast/expenses`;

  try {
    const { data, status } = await axios.post(
      url,
      { total_expenses: totalExpensesSeries },
      {
        timeout,
        headers: { 'Content-Type': 'application/json' },
        validateStatus: () => true,
      }
    );
    if (
      status >= 200 &&
      status < 300 &&
      data &&
      data.ok === true &&
      Number.isFinite(Number(data.predicted_total_expenses))
    ) {
      return data;
    }
    if (data && data.ok === false && data.error) {
      console.warn('[mlExpenseClient] ML returned error:', data.error);
    }
  } catch (err) {
    console.warn('[mlExpenseClient] ML service unreachable:', err.message);
  }
  return null;
}

/**
 * Calls the standalone pretrained Linear Regression endpoint.
 * Returns parsed JSON (ok true/false) or null if ML_API_URL missing / unreachable.
 * Does not fall back to the legacy /forecast/expenses Ridge-RF path.
 */
async function fetchPretrainedLrFromMlService(payload) {
  const base = (process.env.ML_API_URL || '').trim().replace(/\/$/, '');
  if (!base) return null;

  const timeout =
    parseInt(String(process.env.ML_API_TIMEOUT_MS || '15000'), 10) || 15000;
  const url = `${base}/forecast/expenses/pretrained-lr`;

  try {
    const { data, status } = await axios.post(url, payload, {
      timeout,
      headers: { 'Content-Type': 'application/json' },
      validateStatus: () => true,
    });
    if (status >= 200 && status < 300 && data && typeof data === 'object') {
      return data;
    }
    console.warn(
      '[mlExpenseClient] pretrained-lr unexpected HTTP status:',
      status
    );
  } catch (err) {
    console.warn('[mlExpenseClient] pretrained-lr unreachable:', err.message);
  }
  return null;
}

module.exports = {
  fetchExpenseForecastFromMlService,
  fetchPretrainedLrFromMlService,
};
