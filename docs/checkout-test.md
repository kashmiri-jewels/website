# Checkout Test Runbook

Use this runbook for a Razorpay test-mode checkout. Do not use live-mode keys for this flow.

Official references:

- Razorpay Standard Checkout: https://razorpay.com/docs/payments/payment-gateway/web-integration/standard/integration-steps/
- Razorpay test UPI details: https://razorpay.com/docs/payments/payments/test-upi-details/

## Preconditions

Local or deployed storefront environment:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
```

Supabase Edge Function secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPS_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
DELHIVERY_ENABLED=false
```

Use Razorpay test-mode key id and secret. Keep `DELHIVERY_ENABLED=false` unless the Delhivery
account-specific create-shipment URL and token are confirmed.

## Deploy Before Testing

Run the GitHub Actions `Deploy Supabase` workflow for the target environment after migration or
Edge Function changes.

Run the GitHub Actions `Publish catalog` workflow for the target environment before checkout tests
when product data, stock, or images changed.

## Browser Test

1. Start the storefront locally or open the deployed storefront.
2. Add one in-stock product and size to the bag.
3. Open checkout and fill contact plus delivery fields.
4. Submit checkout.
5. If the backend-confirmed total changes, review the summary and submit again.
6. Complete Razorpay test checkout with a test-mode payment method such as UPI `success@razorpay`.
7. Confirm the storefront shows the friendly order number, payment id, order status, and shipment
   state.

## Supabase Verification

Inspect these tables or operational views in Supabase Dashboard:

```text
orders
order_items
payments
product_variants
shipments
integration_events
ops_orders_recent
ops_shipment_pending_orders
ops_payment_review_orders
ops_integration_errors
```

Expected successful test-mode result with Delhivery disabled:

- `orders.status` becomes `shipment_pending`.
- `payments.status` becomes `verified`.
- `payments.provider_payment_id` is populated.
- Purchased `product_variants.stock_available` decrements once.
- A `shipments` row exists with `status = pending`.
- `integration_events` records shipment manual-pending or related provider events.

If stock runs out after checkout opens, the expected state is:

- `orders.status = payment_review_required`.
- `payments.status = verified`.
- No automatic refund is attempted.
- Owner handles fulfillment or refund manually from Razorpay and Supabase.

## Shipment Retry

For a paid order that remains `shipment_pending`, run the GitHub Actions workflow `Retry shipment`
with the friendly order number, for example:

```text
KJ-20260511-A7K2F1
```
