# Store Operations

## Shipment Handling

Phase 4 keeps logistics operational without requiring live Delhivery shipment creation.

After payment is verified:

1. Stock is deducted atomically.
2. Payment is marked `verified`.
3. The order moves into shipment handling.
4. A `shipments` row is created or reused.
5. If Delhivery is disabled, the order is marked `shipment_pending` for manual fulfillment.
6. If Delhivery is enabled and fails, the order remains paid and `shipment_pending`.

`shipment_pending` means the order is paid and needs logistics attention. It does not mean the
package has shipped.

## Manual Retry

Use `/admin` for owner-facing shipment retries, or the GitHub Actions workflow `Retry shipment`
as the fallback developer path.

The admin page is protected by Cloudflare Access and the app-side `ADMIN_EMAILS` allowlist. V1 only
allows viewing ops data and retrying shipment creation.

Input:

```text
order_number
```

The workflow calls the `retry-shipment` Edge Function with the service-role key. The function only
accepts an exact `SUPABASE_SERVICE_ROLE_KEY` match or an exact `OPS_SERVICE_ROLE_KEY` match, and only
works on orders in valid shipment states. For v1, `OPS_SERVICE_ROLE_KEY` can be set to the same
value as the service-role key used by GitHub Actions.

## Product Sync

Use the GitHub Actions workflow `Publish catalog` when the owner has updated Google Sheets or
product images.

The workflow:

1. reads products from Google Sheets;
2. reads product image folders from Google Drive;
3. generates and validates the product image manifest;
4. generates ignored local catalog files under `src/generated/`;
5. validates generated image URLs against the configured media host;
6. uploads only new or changed images to Cloudflare R2;
7. syncs products and variants to Supabase;
8. builds/prerenders the public storefront catalog;
9. deploys through Cloudflare Workers.

The `/admin` page may dispatch this workflow, but the workflow still runs in CI/CD. There is no
local deployment path and no scheduled product sync.

## Optional Telegram Alerts

Set these Supabase Edge Function secrets to enable owner alerts:

```text
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Telegram failures never fail checkout, payment verification, or shipment retry.

## Delhivery Guard

Delhivery shipment creation is disabled unless all required account values are present:

```text
DELHIVERY_ENABLED=true
DELHIVERY_API_TOKEN=...
DELHIVERY_CREATE_SHIPMENT_URL=...
DELHIVERY_PICKUP_LOCATION=...
DELHIVERY_SELLER_GST=...
DELHIVERY_HSN_CODE=...
```

Use Delhivery's staging shipment URL in QA:

```text
https://staging-express.delhivery.com/api/cmu/create.json
```

Use Delhivery's production shipment URL in prod:

```text
https://track.delhivery.com/api/cmu/create.json
```

Default package configuration:

```text
DELHIVERY_PACKAGE_WEIGHT_GRAMS=500
DELHIVERY_PACKAGE_LENGTH_CM=30
DELHIVERY_PACKAGE_BREADTH_CM=25
DELHIVERY_PACKAGE_HEIGHT_CM=5
```

The pickup location must match the registered Delhivery warehouse name exactly, including case.
Until Delhivery account-specific staging details are confirmed, keep `DELHIVERY_ENABLED=false` and
fulfill from `shipment_pending` orders manually.

QA should use Delhivery staging credentials. Do not enable prod until the live token,
create-shipment URL, and pickup location are confirmed in Delhivery.
