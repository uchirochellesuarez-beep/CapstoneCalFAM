const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const {
  getSmsConfig,
  normalizePhilippinePhoneNumber,
  sendSmsNotification
} = require('./services/sms-service');

async function main() {
  const [, , phoneArg, ...messageParts] = process.argv;
  const messageArg = messageParts.join(' ').trim();

  if (!phoneArg) {
    console.error('Usage: npm run sms:test -- <phone_number> "<message>"');
    process.exit(1);
  }

  const config = getSmsConfig();
  const normalized = normalizePhilippinePhoneNumber(phoneArg);
  const message = messageArg || 'CALFFA SMS test message. If you received this, your SMS gateway is working.';

  console.log('SMS provider:', config.provider);
  console.log('SMS enabled:', config.isEnabled ? 'yes' : 'no');
  console.log('Normalized number:', normalized.formatted || 'invalid');

  if (!normalized.valid) {
    console.error('Invalid phone number:', normalized.error);
    process.exit(1);
  }

  const result = await sendSmsNotification({
    to: normalized.formatted,
    message
  });

  if (result.success) {
    console.log('SMS sent successfully.');
    console.log('Recipient:', result.recipient);
    const d = result.providerResponse?.data;
    if (d && typeof d === 'object' && (d.status || d.uid)) {
      console.log('PhilSMS:', d.status || 'ok', d.uid ? `(uid ${d.uid})` : '');
    }
    process.exit(0);
  }

  console.error('SMS failed.');
  console.error('Status:', result.status);
  console.error('Provider:', result.provider || 'unknown');
  console.error('Error:', result.error || 'Unknown error');
  process.exit(1);
}

main().catch((error) => {
  console.error('Unexpected SMS test error:', error.message);
  process.exit(1);
});
