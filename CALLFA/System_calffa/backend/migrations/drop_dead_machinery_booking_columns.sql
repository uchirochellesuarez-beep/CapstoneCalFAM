-- Drop unused machinery_bookings columns that are never written/read by the app.
-- Payment method lives on machinery_booking_payments / down_payment_method.
-- Gateway/Xendit columns were leftover and unused (gateway payments table already dropped).

ALTER TABLE machinery_bookings
  DROP COLUMN IF EXISTS payment_method,
  DROP COLUMN IF EXISTS payment_gateway,
  DROP COLUMN IF EXISTS xendit_transaction_id,
  DROP COLUMN IF EXISTS external_reference_id;

-- Same unused gateway leftovers on payment history rows.
ALTER TABLE machinery_booking_payments
  DROP COLUMN IF EXISTS payment_gateway,
  DROP COLUMN IF EXISTS xendit_transaction_id,
  DROP COLUMN IF EXISTS external_reference_id;
