# SMS Setup Guide

This project sends real SMS when an agriculturist creates a seed/fertilizer allocation (Farmer Income Hub) and the farmer is eligible to receive assistance.

## Recommended: PhilSMS

[PhilSMS](https://philsms.com/) is a hosted SMS API in the Philippines. It does **not** require an Android gateway app on your phone (unlike TextBee-style gateways).

1. Create an account and get an **API token** from the PhilSMS Developers page (often `dashboard.philsms.com/developers`).
2. Register a **sender_id** (brand name or approved number) as required by PhilSMS.
3. Set in `backend/.env`:

```env
SMS_ENABLED=true
SMS_PROVIDER=philsms
SMS_TIMEOUT_MS=10000
SMS_PHILSMS_API_TOKEN=YOUR_API_TOKEN
SMS_PHILSMS_SENDER_ID=PhilSMS
SMS_PHILSMS_ENDPOINT=https://dashboard.philsms.com/api/v3/sms/send
SMS_PHILSMS_TYPE=plain
```

The backend calls `POST https://dashboard.philsms.com/api/v3/sms/send` with JSON:

- `recipient`: `639171234567` (digits only, country code, **no** `+`)
- `sender_id`: your configured ID
- `type`: `plain`
- `message`: text body

Auth: `Authorization: Bearer <SMS_PHILSMS_API_TOKEN>`

## Test PhilSMS

From `backend/`:

```bash
npm run sms:test -- 09171234567 "Test message from CALFFA"
```

If successful, the terminal prints `SMS sent successfully.`

## Legacy: Android HTTP gateway (e.g. TextBee-style)

Use an Android phone with an app that exposes HTTP → SMS. The backend posts JSON to `SMS_ANDROID_ENDPOINT` using `phoneNumber` and `message` by default.

```env
SMS_ENABLED=true
SMS_PROVIDER=android_gateway
SMS_ANDROID_ENDPOINT=http://YOUR_PHONE_IP:PORT/send-sms
SMS_ANDROID_RECIPIENT_FIELD=phoneNumber
SMS_ANDROID_MESSAGE_FIELD=message
```

## httpSMS (Android + cloud relay)

```env
SMS_ENABLED=true
SMS_PROVIDER=httpsms
SMS_HTTPSMS_API_KEY=YOUR_HTTPSMS_API_KEY
SMS_HTTPSMS_FROM=+639171234567
```

See [httpSMS docs](https://docs.httpsms.com/).

## Semaphore

```env
SMS_ENABLED=true
SMS_PROVIDER=semaphore
SMS_SEMAPHORE_API_KEY=your_key
SMS_SEMAPHORE_SENDER_NAME=CALFFA
```

## Phone number format

The backend normalizes Philippine numbers (`09171234567`, `9171234567`, `+639171234567`) to E164 `+639…` internally. PhilSMS receives digits without `+`.

## After configuration

Restart the backend (`npm run dev`), then as agriculturist allocate seed/fertilizer on `/farmer-income-hub`. The farmer’s registered phone gets the SMS when the flow triggers a send. Failed sends can be retried from the agriculturist distribution UI.

## If SMS fails

- `SMS_ENABLED=true` and correct `SMS_PROVIDER`
- For PhilSMS: valid token, approved `sender_id`, account balance
- For Android gateway: phone on, reachable URL, SIM load
- Check `sms_failure_reason` in the distribution row in the UI
