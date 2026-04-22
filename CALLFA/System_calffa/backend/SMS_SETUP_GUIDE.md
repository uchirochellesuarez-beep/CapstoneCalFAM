# SMS Setup Guide

This project is already wired to send real SMS when an agriculturist creates a seed/fertilizer allocation.

## Recommended Setup

Use an Android phone as the SMS gateway.

Why:
- no per-message API cost
- works well in the Philippines
- uses your SIM/load/unli text promo

## What You Need

- an Android phone with a working SIM
- the phone and backend machine on the same network, or a reachable public/local tunnel URL
- an SMS gateway app on the phone that exposes an HTTP API

The backend expects to send:
- recipient field: `phoneNumber`
- message field: `message`

If your app uses different field names, update:
- `SMS_ANDROID_RECIPIENT_FIELD`
- `SMS_ANDROID_MESSAGE_FIELD`

If your app requires extra payload fields, put them in:
- `SMS_ANDROID_EXTRA_PAYLOAD`

Example:

```env
SMS_ANDROID_EXTRA_PAYLOAD={"simSlot":1}
```

## Backend .env

Update `backend/.env`:

```env
SMS_ENABLED=true
SMS_PROVIDER=android_gateway
SMS_TIMEOUT_MS=10000
SMS_ANDROID_ENDPOINT=http://YOUR_PHONE_IP:PORT/send-sms
SMS_ANDROID_AUTH_TOKEN=
SMS_ANDROID_RECIPIENT_FIELD=phoneNumber
SMS_ANDROID_MESSAGE_FIELD=message
SMS_ANDROID_EXTRA_PAYLOAD={}
```

Replace `YOUR_PHONE_IP:PORT/send-sms` with the real endpoint from your Android SMS gateway app.

## Easier Real-World Setup: httpSMS

If you want a concrete working setup with less custom wiring, use `httpSMS`.

Official docs:
- https://docs.httpsms.com/
- Android app download:
  https://github.com/NdoleStudio/httpsms/releases/latest/download/HttpSms.apk

According to the official docs, sending SMS uses:
- endpoint: `https://api.httpsms.com/v1/messages/send`
- auth header: `x-api-key`
- body fields: `from`, `to`, `content`

Use this config:

```env
SMS_ENABLED=true
SMS_PROVIDER=httpsms
SMS_TIMEOUT_MS=10000
SMS_HTTPSMS_API_KEY=YOUR_HTTPSMS_API_KEY
SMS_HTTPSMS_FROM=+639171234567
SMS_HTTPSMS_ENDPOINT=https://api.httpsms.com/v1/messages/send
```

`SMS_HTTPSMS_FROM` should be the number connected to the Android phone/SIM registered in httpSMS.

## Phone Number Format

The backend already normalizes Philippine numbers like:

- `09171234567`
- `9171234567`
- `+639171234567`

All of these become `+639171234567`.

## Test the SMS Gateway

From `backend/`, run:

```bash
npm run sms:test -- 09171234567 "Test message from CALFFA"
```

If successful, the terminal should say:

```text
SMS sent successfully.
```

## After Testing

Restart the backend server:

```bash
npm run dev
```

Then in the app:

1. Open `/farmer-income-hub`
2. Log in as agriculturist
3. Create a seed/fertilizer allocation for an eligible farmer
4. The system will:
   - save the allocation
   - create an in-app notification
   - attempt to send SMS automatically

## If SMS Fails

Check:
- the phone is powered on
- mobile signal is available
- the phone has internet access
- the app endpoint is reachable from the backend machine
- the SIM has enough load or an active text promo
- `SMS_ENABLED=true`
- `SMS_ANDROID_ENDPOINT` is correct

In the UI, failed sends can be retried from the agriculturist distribution screen.

## Optional API Provider

This project also supports `SMS_PROVIDER=semaphore`.

Example:

```env
SMS_ENABLED=true
SMS_PROVIDER=semaphore
SMS_SEMAPHORE_API_KEY=your_key
SMS_SEMAPHORE_SENDER_NAME=CALFFA
SMS_SEMAPHORE_ENDPOINT=https://api.semaphore.co/api/v4/messages
```

Then test with:

```bash
npm run sms:test -- 09171234567 "Test message from CALFFA"
```
