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
    }
  };
};

const buildAssistanceSmsMessage = ({ farmerName, assistanceLabel, notes }) => {
  const displayName = farmerName || 'Farmer';
  const baseMessage = `Hello ${displayName}, you have been approved to receive ${assistanceLabel}. Please wait for further instructions regarding the schedule and distribution details.`;
  const trimmedNotes = String(notes || '').trim();

  if (!trimmedNotes) {
    return baseMessage;
  }

  const compactNotes = trimmedNotes.length > 120
    ? `${trimmedNotes.slice(0, 117)}...`
    : trimmedNotes;

  return `${baseMessage} Details: ${compactNotes}`;
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
