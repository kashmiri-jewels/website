# Razorpay and Supabase Checkout

Razorpay checkout is backed by Supabase Edge Functions. The browser never receives the key secret
and never decides the payable amount.

Flow:

1. Checkout sends cart lines and delivery details to the `create-checkout-order` Edge Function.
2. The function reloads product prices and inventory from Supabase, creates an `orders` row and
   `order_items`, then creates a Razorpay order.
3. The client opens Razorpay Standard Checkout with the returned public key id and order id.
4. Checkout success returns `razorpay_payment_id`, `razorpay_order_id`, and `razorpay_signature`.
5. The client sends those fields to `verify-payment`.
6. The function verifies the HMAC signature, confirms the payment, deducts stock, and moves the
   order into shipment handling.
7. Shipment creation is best-effort and separate from payment success. If Delhivery is not enabled
   or shipment creation fails, the order remains paid and moves to `shipment_pending`.
8. The `razorpay-webhook` function also records signed webhook events and can recover missed
   browser callbacks idempotently.

## Environment

Browser:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

Product sync and Supabase Edge Functions:

```bash
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
OPS_SERVICE_ROLE_KEY=
RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=
DELHIVERY_ENABLED=false
DELHIVERY_API_TOKEN=
DELHIVERY_CREATE_SHIPMENT_URL=
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

Use test mode Razorpay keys locally. Deploy the Edge Functions and set the same secrets with the
Supabase CLI or dashboard before testing hosted checkout.

For QA, create the Razorpay webhook in Test mode:

```text
https://<qa-supabase-project-ref>.supabase.co/functions/v1/razorpay-webhook
```

Select `payment.captured` and use the same `RAZORPAY_WEBHOOK_SECRET` configured for QA.

Checkout delivery details use this address shape:

```json
{
  "addressLine": "",
  "landmark": "",
  "city": "",
  "state": "",
  "pincode": ""
}
```

`landmark` is optional. The Edge Function stores this JSON in `orders.shipping_address` and keeps
customer name, phone, and email as order columns for Supabase Dashboard visibility.

## Supabase Deploy

Run the GitHub Actions `Deploy Supabase` workflow for the target environment after migration or
Edge Function changes.

Set the Razorpay webhook URL to the deployed `razorpay-webhook` function and configure the same
`RAZORPAY_WEBHOOK_SECRET` in Razorpay and Supabase.

## Product Sync

Use the GitHub Actions `Publish catalog` workflow after product data, stock, or images change. It
generates the catalog from Google Sheets, syncs images from Google Drive to R2, syncs Supabase
products/variants for checkout validation, builds, prerenders, and deploys the storefront.

## Test Checkout

See [Checkout Test Runbook](./checkout-test.md) for the full Razorpay test-mode flow and Supabase
verification checklist.

## Shipment Retry

Paid orders that need manual logistics work are visible as `shipment_pending` in Supabase. To retry
shipment creation without an admin UI, run the GitHub Actions workflow `Retry shipment` with the
friendly `order_number`, or call the `retry-shipment` Edge Function using the service-role key.
The retry function accepts the exact service-role key or the exact `OPS_SERVICE_ROLE_KEY` Edge
Function secret.
