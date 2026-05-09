const axios = require('axios');

const DEFAULT_SMS_TIMEOUT_MS = 10000;

const normalizePhilippinePhoneNumber = (input) => {
  const raw = String(input || '').trim();
  const digits = raw.replace(/\D/g, '');

  if (!digits) {
    return {
      valid: false,
      formatted: null,
      error: 'No phone number provided.'
    };
  }

  if (digits.startsWith('63') && digits.length === 12) {
    return { valid: true, formatted: `+${digits}` };
  }

  if (digits.startsWith('09') && digits.length === 11) {
    return { valid: true, formatted: `+63${digits.slice(1)}` };
  }

  if (digits.startsWith('9') && digits.length === 10) {
    return { valid: true, formatted: `+63${digits}` };
  }

  return {
    valid: false,
    formatted: null,
    error: 'Invalid Philippine phone number format.'
  };
};

const parseJsonEnv = (value) => {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch (error) {
    console.warn('Invalid JSON in SMS_ANDROID_EXTRA_PAYLOAD:', error.message);
    return {};
  }
};

const getSmsConfig = () => {
  const provider = String(process.env.SMS_PROVIDER || 'android_gateway').trim();
  const enabled = String(process.env.SMS_ENABLED || '').trim().toLowerCase();

  return {
    provider,
    isEnabled: enabled === 'true' || enabled === '1' || enabled === 'yes',
    timeoutMs: Number(process.env.SMS_TIMEOUT_MS || DEFAULT_SMS_TIMEOUT_MS),
    httpsms: {
      endpoint: process.env.SMS_HTTPSMS_ENDPOINT || 'https://api.httpsms.com/v1/messages/send',
      apiKey: process.env.SMS_HTTPSMS_API_KEY || '',
      from: process.env.SMS_HTTPSMS_FROM || ''
    },
    android: {
      endpoint: process.env.SMS_ANDROID_ENDPOINT || '',
      authToken: process.env.SMS_ANDROID_AUTH_TOKEN || '',
      recipientField: process.env.SMS_ANDROID_RECIPIENT_FIELD || 'phoneNumber',
      messageField: process.env.SMS_ANDROID_MESSAGE_FIELD || 'message',
      extraPayload: parseJsonEnv(process.env.SMS_ANDROID_EXTRA_PAYLOAD)
    },
    semaphore: {
      endpoint: process.env.SMS_SEMAPHORE_ENDPOINT || 'https://api.semaphore.co/api/v4/messages',
      apiKey: process.env.SMS_SEMAPHORE_API_KEY || '',
      senderName: process.env.SMS_SEMAPHORE_SENDER_NAME || ''
    },
    philsms: {
      endpoint:
        process.env.SMS_PHILSMS_ENDPOINT ||
        'https://dashboard.philsms.com/api/v3/sms/send',
      apiToken: String(process.env.SMS_PHILSMS_API_TOKEN || '').trim(),
      senderId: String(process.env.SMS_PHILSMS_SENDER_ID || '').trim(),
      messageType: String(process.env.SMS_PHILSMS_TYPE || 'plain').trim() || 'plain'
    }
  };
};

/** PhilSMS expects country code digits only, e.g. 639171234567 (no + prefix). */
const formatRecipientForPhilSms = (e164Formatted) => {
  const s = String(e164Formatted || '').trim().replace(/^\+/, '');
  return s.replace(/\D/g, '');
};

/** How many sacks / units show in SMS (Tagalog). */
const formatAssistanceQuantitySms = (quantity, unit) => {
  const num = Number(quantity);
  const u = String(unit || '').trim().toLowerCase();
  if (!Number.isFinite(num) || num <= 0) {
    return 'nakatakdang dami (ilalagay ang detalye sa susunod na announcement)';
  }
  if (
    !u ||
    u === 'sako' ||
    u === 'sacks' ||
    u === 'bags' ||
    u === 'bag' ||
    u.includes('sack') ||
    u.includes('sako') ||
    u.includes('bag')
  ) {
    return `${num} na sako`;
  }
  return `${num} ${String(unit).trim()}`;
};

const tagalogGoodsPhrase = (assistanceType, assistanceLabelFallback) => {
  const t = String(assistanceType || '').trim();
  if (t === 'seeds') return 'binhi';
  if (t === 'fertilizer') return 'pataba (fertilizer)';
  if (t === 'both') return 'binhi at pataba';
  if (assistanceLabelFallback) return assistanceLabelFallback;
  return 'agricultural assistance';
};

/**
 * SMS sa magsasaka pagkalikha ng seed/fertilizer allocation.
 * Panatilihing maikli; iwasan ang mahabang unicode (segment limits).
 */
const buildAssistanceSmsMessage = ({
  farmerName,
  assistanceType,
  quantity,
  unit,
  notes,
  assistanceLabel // legacy: kung walang assistanceType
}) => {
  const first =
    String(farmerName || '')
      .trim()
      .split(/\s+/)
      .filter(Boolean)[0] || 'Magsasaka';
  const labelFallback = assistanceLabel || null;
  const goods = tagalogGoodsPhrase(assistanceType, labelFallback);
  const qtyStr = formatAssistanceQuantitySms(quantity, unit);

  let body = `${first}, makakatanggap ka ng ${goods} (${qtyStr}). Humanda sa susunod na announcement sa pagtanggap ng tulong.`;
  const n = String(notes || '').trim();
  if (n) {
    const short = n.length > 72 ? `${n.slice(0, 69)}...` : n;
    body += ` Karagdagan: ${short}`;
  }
  return body;
};

const sendViaAndroidGateway = async ({ to, message, config }) => {
  if (!config.endpoint) {
    return {
      success: false,
      status: 'not_configured',
      provider: 'android_gateway',
      error: 'Android SMS gateway endpoint is not configured.'
    };
  }

  const payload = {
    ...config.extraPayload,
    [config.recipientField]: to,
    [config.messageField]: message
  };

  const headers = { 'Content-Type': 'application/json' };
  if (config.authToken) {
    headers.Authorization = `Bearer ${config.authToken}`;
  }

  const response = await axios.post(config.endpoint, payload, {
    headers,
    timeout: config.timeoutMs
  });

  return {
    success: true,
    status: 'sent',
    provider: 'android_gateway',
    providerResponse: response.data || null
  };
};

const sendViaSemaphore = async ({ to, message, config }) => {
  if (!config.apiKey) {
    return {
      success: false,
      status: 'not_configured',
      provider: 'semaphore',
      error: 'Semaphore API key is not configured.'
    };
  }

  const payload = new URLSearchParams({
    apikey: config.apiKey,
    number: to,
    message
  });

  if (config.senderName) {
    payload.append('sendername', config.senderName);
  }

  const response = await axios.post(config.endpoint, payload.toString(), {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    timeout: config.timeoutMs
  });

  return {
    success: true,
    status: 'sent',
    provider: 'semaphore',
    providerResponse: response.data || null
  };
};

const sendViaPhilSms = async ({ to, message, config }) => {
  const token = String(config.apiToken || '').trim();
  if (!token) {
    return {
      success: false,
      status: 'not_configured',
      provider: 'philsms',
      error: 'PhilSMS API token is not configured (SMS_PHILSMS_API_TOKEN).'
    };
  }

  const senderId = String(config.senderId || '').trim();
  if (!senderId) {
    return {
      success: false,
      status: 'not_configured',
      provider: 'philsms',
      error: 'PhilSMS sender_id is not configured (SMS_PHILSMS_SENDER_ID).'
    };
  }

  const recipient = formatRecipientForPhilSms(to);
  if (!recipient || recipient.length < 11) {
    return {
      success: false,
      status: 'failed',
      provider: 'philsms',
      error: 'Could not format phone number for PhilSMS.'
    };
  }

  const response = await axios.post(
    config.endpoint,
    {
      recipient,
      sender_id: senderId,
      type: config.messageType || 'plain',
      message
    },
    {
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json'
      },
      timeout: config.timeoutMs
    }
  );

  const body = response.data;
  const ok = body && String(body.status).toLowerCase() === 'success';

  if (ok) {
    return {
      success: true,
      status: 'sent',
      provider: 'philsms',
      providerResponse: body
    };
  }

  const errMsg =
    body && (body.message || body.error || body.errors)
      ? String(body.message || body.error || (Array.isArray(body.errors) ? body.errors.join(' ') : body.errors))
      : 'PhilSMS rejected the send request.';

  return {
    success: false,
    status: 'failed',
    provider: 'philsms',
    error: errMsg,
    providerResponse: body
  };
};

const sendViaHttpSms = async ({ to, message, config }) => {
  if (!config.apiKey) {
    return {
      success: false,
      status: 'not_configured',
      provider: 'httpsms',
      error: 'httpSMS API key is not configured.'
    };
  }

  if (!config.from) {
    return {
      success: false,
      status: 'not_configured',
      provider: 'httpsms',
      error: 'httpSMS sender number is not configured.'
    };
  }

  const response = await axios.post(config.endpoint, {
    from: config.from,
    to,
    content: message
  }, {
    headers: {
      'x-api-key': config.apiKey,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    timeout: config.timeoutMs
  });

  return {
    success: true,
    status: 'sent',
    provider: 'httpsms',
    providerResponse: response.data || null
  };
};

const sendSmsNotification = async ({ to, message }) => {
  const config = getSmsConfig();

  if (!config.isEnabled) {
    return {
      success: false,
      status: 'not_configured',
      provider: config.provider,
      error: 'SMS sending is disabled in the backend configuration.'
    };
  }

  const normalizedPhone = normalizePhilippinePhoneNumber(to);
  if (!normalizedPhone.valid) {
    return {
      success: false,
      status: 'failed',
      provider: config.provider,
      error: normalizedPhone.error,
      recipient: null
    };
  }

  try {
    let result;
    if (config.provider === 'semaphore') {
      result = await sendViaSemaphore({
        to: normalizedPhone.formatted,
        message,
        config: { ...config.semaphore, timeoutMs: config.timeoutMs }
      });
    } else if (config.provider === 'httpsms') {
      result = await sendViaHttpSms({
        to: normalizedPhone.formatted,
        message,
        config: { ...config.httpsms, timeoutMs: config.timeoutMs }
      });
    } else if (config.provider === 'philsms') {
      result = await sendViaPhilSms({
        to: normalizedPhone.formatted,
        message,
        config: { ...config.philsms, timeoutMs: config.timeoutMs }
      });
    } else {
      result = await sendViaAndroidGateway({
        to: normalizedPhone.formatted,
        message,
        config: { ...config.android, timeoutMs: config.timeoutMs }
      });
    }

    return {
      ...result,
      recipient: normalizedPhone.formatted
    };
  } catch (error) {
    return {
      success: false,
      status: 'failed',
      provider: config.provider,
      recipient: normalizedPhone.formatted,
      error: error.response?.data?.message || error.message || 'SMS sending failed.'
    };
  }
};

module.exports = {
  buildAssistanceSmsMessage,
  getSmsConfig,
  normalizePhilippinePhoneNumber,
  sendSmsNotification
};
