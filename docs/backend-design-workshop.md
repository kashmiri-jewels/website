# Backend Design Workshop

This document captures decisions for the storefront backend. It is intentionally practical: low
cost, low maintenance, enough operational features to run the shop, and room to add integrations
without rewriting the system.

## Baseline Direction

- Google Sheets is the shop owner's admin UI for catalog and inventory.
- Supabase is the runtime backend for validated products, orders, payments, shipments, and
  integration logs.
- TanStack Start remains the storefront app.
- Cart state stays client-side until checkout.
- No customer accounts or customer management for v1.
- Edge Functions are reserved for trusted workflows: payment, order creation, webhooks, product
  sync, and logistics integration.
- Razorpay is the payment provider for v1.
- Logistics should be modeled generically so Delhivery, Shiprocket, or another provider can be
  swapped without changing the order model.

## Working Constraints

- Keep within Supabase free project limits as long as traffic is low.
- Avoid building an admin UI initially.
- Prefer data that the shop owner can understand and edit in a spreadsheet.
- Avoid backend calls for browsing, filters, search, and cart changes unless there is a clear
  operational need.

## Review Status

High-level v1 decisions are resolved. Remaining work should move into implementation planning,
schema/API details, and provider-specific details discovered while integrating Delhivery.

## Low-Level Schema Notes

### Products Table Identity

`products` should include both identifiers:

- `product_id`: owner-provided internal SKU/id.
- `slug`: public storefront URL identifier.

Both fields are required and unique.

Rationale:

- Internal operations use stable owner-provided product IDs.
- Storefront URLs use customer-friendly slugs.
- Product title changes do not break identity or URLs.

### Product Pricing Location

Store price fields on `products` for v1.

Product-level fields:

- `mrp_paise`
- `selling_price_paise`

`product_variants` should not have price fields initially.

Deferred for later:

- optional variant price override

Rationale:

- Clothing sizes usually share the same price.
- Keeps Google Sheets and checkout calculation simpler.
- Variant table can focus on size, stock, and availability.

Money values should be stored in paise as integers.

Example:

```text
₹1,299 = 129900
```

Rationale:

- Razorpay expects paise.
- Avoids decimal rounding issues.
- Works cleanly in Postgres and TypeScript.

### Product Images Schema

Store product images as an ordered `text[]` on `products` for v1.

Behavior:

- Google Sheets stores product data.
- Google Drive stores owner-managed product image folders.
- Catalog publish resolves Drive images to public Cloudflare R2 URLs.
- `products.images` stores those ordered URLs.
- The first image is treated as the primary image unless a later field is added.

Deferred for later:

- `product_images` table
- per-image alt text
- per-image crop/focal metadata
- image-level sort/admin controls

Rationale:

- Matches the spreadsheet shape.
- Keeps sync and storefront rendering simple.
- Good enough for product gallery needs at launch.

### Size Chart Schema

Store `size_chart` as JSON on `products` for v1.

Behavior:

- Size chart data comes from the product spreadsheet row.
- Storefront displays it on the product detail page.
- Backend does not need to query or filter by individual measurements.

Deferred for later:

- shared size chart templates
- separate `size_charts` table
- brand/category-level size charts

Rationale:

- Simple sync from one sheet row.
- Good enough for product display.
- Avoids unnecessary schema joins.

### Product Variant Availability

Each `product_variants` row should have its own `active` flag.

Behavior:

- `products.active = false` hides/disables the whole product.
- `product_variants.active = false` disables a specific variant/size.
- `stock_available = 0` means the variant is temporarily out of stock.

Rationale:

- Allows product to remain visible while specific sizes are unavailable.
- Separates sellability from stock count.
- Leaves room for variants that should not be sold even if stock exists.

### Order Money Fields

Store order money values in paise as integers.

Recommended fields:

- `subtotal_amount_paise`
- `shipping_amount_paise`
- `total_amount_paise`
- `currency`

Behavior:

- Razorpay order amount uses `total_amount_paise` directly.
- Storefront display converts paise to rupees.
- Order item unit prices are snapshotted in paise.

Rationale:

- Matches Razorpay's amount format.
- Avoids decimal rounding issues.
- Keeps payment/order calculations consistent.

### Payments Table

Use a small separate `payments` table for payment provider data.

Recommended fields:

- `id`
- `order_id`
- `provider`
- `provider_order_id`
- `provider_payment_id`
- `signature`
- `status`
- `amount_paise`
- `currency`
- `verified_at`
- `raw_payload jsonb`
- `created_at`

V1 assumptions:

- One successful payment per order.
- Failed attempts can be recorded if useful.
- Refunds are manual and not automated by the backend.

Rationale:

- Keeps payment provider details separate from order lifecycle.
- Handles failed/retried Razorpay attempts more cleanly.
- Leaves room for refunds or multiple attempts later without bloating `orders`.

### Order Status Vs Payment Status

Keep order status and payment status separate.

Order status represents business/fulfillment state, for example:

```text
payment_pending
paid
payment_failed
payment_review_required
shipment_pending
shipped
delivered
cancelled
```

Payment status represents provider/payment state, for example:

```text
created
verified
failed
```

Rationale:

- Avoids overloading one status field.
- Makes payment retries and shipment state easier to reason about.
- Keeps order lifecycle readable in Supabase Dashboard.

### Order Customer And Address Fields

Store primary contact fields as columns and the delivery address as JSON.

Recommended columns:

- `customer_name`
- `customer_phone`
- `customer_email`
- `shipping_address jsonb`

Recommended `shipping_address` shape:

```json
{
  "addressLine": "",
  "landmark": "",
  "city": "",
  "state": "",
  "pincode": ""
}
```

Rationale:

- Keeps common contact fields easy to view/filter in Supabase Dashboard.
- Keeps address schema flexible without many columns.
- Captures enough data for logistics provider mapping.

### Shipment Cardinality

Use one shipment per order for v1.

Behavior:

- All items in an order ship together.
- No split shipments.
- `shipments.order_id` can be unique for v1.

Deferred for later:

- multiple shipments per order
- partial fulfillment
- split package tracking

Rationale:

- Simpler Delhivery integration.
- Easier owner operations.
- Good fit for small clothing orders.

### Shipment Status

Use a small internal shipment status set independent of provider-specific statuses.

Internal statuses:

```text
pending
created
in_transit
delivered
failed
cancelled
```

Also store raw provider status separately, for example `provider_status`.

Rationale:

- Keeps storefront/owner operations simple.
- Preserves Delhivery-specific status details for debugging.
- Makes future provider switching easier.

### Status Field Implementation

Use plain `text` columns with check constraints for status fields.

Applies to:

- order status
- payment status
- shipment status
- integration event status

Rationale:

- Easier to evolve than Postgres enum types.
- Still validates allowed values.
- Keeps migrations simpler as workflows change.

## Decisions

### MVP Backend Scope

Must build for v1:

- Product sync from Google Sheets.
- Product image upload/validation script.
- Supabase product/variant schema.
- Static storefront product JSON generation.
- Order creation before Razorpay checkout.
- Razorpay payment verification.
- Atomic stock deduction after verified payment.
- Order item snapshots.
- Basic shipment table.
- Delhivery shipment creation after payment.
- Shipment failure fallback to `shipment_pending`.
- Telegram alerts for paid orders and shipment failures when configured.
- Operational Supabase views.
- Manual GitHub Actions workflow for shipment retry.

Deferred:

- customer accounts
- customer management
- coupons
- automated refunds
- custom admin UI
- customer notifications
- low-stock alerts
- advanced shipment tracking
- returns/exchanges
- persistent carts

Rationale:

- Gives the shop a complete operational purchase flow.
- Keeps the backend small and low-maintenance.
- Avoids building features that require admin/customer account complexity.

### Explicit V1 Non-Goals

Do not build these in v1:

- customer accounts
- custom admin UI
- persistent carts
- coupons
- cash on delivery
- automated refunds
- returns/exchanges
- customer notifications
- advanced analytics
- real-time low-stock alerts
- multi-provider logistics
- split shipments

Rationale:

- Protects the implementation from scope creep.
- Keeps the backend focused on a complete purchase and fulfillment flow.
- Leaves clear extension points for later versions.

### Product And Inventory Source Of Truth

Google Sheets is the shop owner's editable source for catalog data: product names, descriptions,
images, pricing, categories, size charts, and initial stock inputs.

Supabase is the runtime source for live sellable stock. Product sync writes the latest spreadsheet
state into Supabase, and paid orders deduct stock in Supabase so checkout validation can prevent
overselling between spreadsheet updates.

Implications:

- The storefront can use generated/static product data for fast browsing.
- Checkout must validate product price, active status, size, and stock against Supabase.
- Paid orders should update Supabase stock.
- A later inventory audit/event model can be added without changing the owner-facing spreadsheet
  workflow.

### Google Sheets Product Shape

Use one spreadsheet row per product for v1.

Size and stock values live in structured cells, for example `S:2, M:4, L:1` or an equivalent
shop-owner-friendly format. The sync layer normalizes this into Supabase tables such as `products`
and `product_variants`.

Rationale:

- Easier for the shop owner to maintain than one variant per row.
- Keeps the sheet compact.
- Matches clothing catalog workflows where title, images, description, and size chart are shared
  across sizes.
- Still lets the runtime database validate each size independently at checkout.

Use `product_variants` rather than `product_sizes` in the long-term schema.

V1 variants can be size-only, but the name leaves room for later variant dimensions such as color,
fabric, or bundles without renaming the table.

### Variant Identity

Use `variant_id` for checkout/cart identity.

V1 variant IDs can be generated deterministically from product ID and size, for example an internal
`product_id:size` form or a stable hash of those values.

Frontend cart lines should carry:

- product_id
- variant_id
- size label
- quantity

Checkout validation should prefer `variant_id`, while still keeping product and size labels in order
item snapshots for readability.

Rationale:

- Cleaner checkout validation.
- Easier to extend if variants later include more than size.
- Keeps stable identity separate from display labels.

### Stock Field Naming

Use `product_variants.stock_available` as the v1 live stock field.

Behavior:

- Product sync initializes it for new variants.
- `restock` replaces it for existing variants.
- Paid orders decrement it.
- Checkout validates against it.

Deferred for later:

- `stock_on_hand`
- `reserved_quantity`
- inventory event ledger

Rationale:

- Clear enough for checkout.
- Avoids reservation complexity.
- Leaves room for a more advanced inventory model later.

### Atomic Stock Deduction

Deduct stock inside a database transaction/RPC function when payment is verified.

Recommended shape:

- Edge Function verifies Razorpay payment signature.
- Edge Function calls a Postgres function such as `confirm_paid_order(...)`.
- The Postgres function checks current `stock_available`.
- If stock is sufficient, it decrements stock and marks the order paid.
- If stock is insufficient, it marks the order `payment_review_required`.

Rationale:

- Prevents overselling under concurrent payments.
- Keeps payment/order/stock state consistent.
- Protects the most important inventory invariant without building a full reservation system.

### Inventory Deduction Timing

Deduct live stock only after payment is verified.

Rationale:

- Opening checkout does not block inventory.
- Abandoned Razorpay checkouts do not require stock release jobs.
- Stock stays simple for v1.

Operational behavior:

- `create-checkout-order` validates current stock but does not deduct it.
- `verify-payment` or a trusted Razorpay webhook confirms payment.
- After confirmation, Supabase deducts the purchased size quantities.
- If payment succeeds but stock is no longer available, the order should move to
  `payment_review_required` for manual refund or fulfillment resolution.

### Pricing Authority

Checkout uses the current Supabase price at order creation time.

The storefront cart may show generated/static prices for speed, but those prices are treated as an
estimate. The `create-checkout-order` function recalculates totals from Supabase before creating the
Razorpay order.

If the cart estimate differs from the backend total, the checkout UI should show the updated amount
before opening Razorpay.

Rationale:

- Prevents stale cart prices from being trusted.
- Lets the shop owner update prices in Sheets and sync them without worrying about old carts.
- Keeps all payment amounts server-authoritative.

### Order Creation Timing

Create an internal order row before opening Razorpay.

Initial order status should be `payment_pending`. The Razorpay order should include the internal
order id in notes/receipt so payments and webhooks can be matched back to Supabase.

Rationale:

- Provides a stable internal order id before payment.
- Makes Razorpay payment callbacks and webhooks easier to verify.
- Gives visibility into failed or abandoned checkout attempts.

Operational behavior:

- Abandoned unpaid orders can remain for debugging.
- A later cleanup job can cancel/delete old unpaid orders if needed.
- Fulfillment should only consider paid orders.

### Order Status Lifecycle

Use a deliberately small v1 order lifecycle:

```text
payment_pending
paid
payment_failed
payment_review_required
shipment_pending
shipped
delivered
cancelled
```

Status meanings:

- `payment_pending`: internal order exists, Razorpay checkout may or may not complete.
- `paid`: payment is verified, but fulfillment has not started.
- `payment_failed`: Razorpay payment failed or signature verification failed.
- `payment_review_required`: payment succeeded, but stock/payment/order state needs manual review.
- `shipment_pending`: order is ready for logistics creation or pickup scheduling.
- `shipped`: shipment exists and is in transit.
- `delivered`: logistics provider confirms delivery.
- `cancelled`: manually cancelled before fulfillment or after failed/unwanted checkout.

Deferred for later:

- returns
- refunds
- partial refunds
- exchanges
- split shipments
- failed delivery attempts

Rationale:

- Covers the simple v1 flow without modeling every commerce edge case.
- Gives enough visibility for payment and shipment operations.
- Leaves room to add return/refund states later without changing the core order tables.

### Shipment Creation Timing

Create the shipment automatically after payment is verified.

Operational behavior:

- Payment verification marks the order as paid.
- The backend then attempts to create a shipment with the configured logistics provider.
- If shipment creation succeeds, store provider ids/tracking details and keep the order as
  `shipment_pending` until pickup/in-transit confirmation.
- If shipment creation fails, keep the payment/order valid and mark the order as
  `shipment_pending` for manual retry.

Rationale:

- Reduces owner work for normal paid orders.
- Keeps payment capture independent from logistics failures.
- Allows a later retry function or script without needing a full admin UI.

### Logistics Provider Model

Use a generic shipment model with one provider implementation first.

The database should store provider-neutral fields such as:

- provider
- provider_order_id
- tracking_number
- shipment_status
- label_url
- raw_provider_payload

The first implementation can target Delhivery or another chosen provider, but the order and
shipment tables should not be Delhivery-specific.

Rationale:

- Keeps the v1 implementation simple.
- Makes provider switching possible later.
- Lets logistics webhooks map provider-specific events into a small internal shipment status set.

### Shipping Charges

Use a flat shipping rule for v1.

Example policy:

- Charge a fixed shipping fee such as `149`.
- Offer free shipping above a configured cart threshold such as `2500`.
- Store the actual shipping amount charged on the order.

Deferred for later:

- provider-calculated shipping rates
- distance or pincode-zone based pricing
- product weight/dimension based pricing
- multiple shipping speeds

Rationale:

- Keeps checkout simple and predictable.
- Avoids calling logistics APIs before payment.
- Still allows logistics provider fields such as package weight/dimensions to be added later for
  shipment creation.

### Delivery Address And Serviceability

Collect a simple delivery address for v1:

- full name
- phone
- email
- address line
- city
- state
- pincode

Add pincode/serviceability validation only if the selected logistics provider offers a lightweight,
free, low-maintenance API for it.

Operational behavior:

- If serviceability check is simple, run it before payment to avoid taking payment for clearly
  undeliverable pincodes.
- If serviceability check adds complexity, cost, or unreliable failure modes, skip it in v1.
- If shipment creation fails after payment because of address/serviceability issues, keep the order
  paid and move it to `shipment_pending` for manual handling.

Rationale:

- Keeps checkout low-friction.
- Avoids adding logistics complexity before it is clearly useful.
- Still protects the system from obvious undeliverable orders when the check is cheap and reliable.

### Owner Order Management

Use the Supabase Dashboard as the v1 order console.

Operational behavior:

- The owner can view orders in Supabase table editor.
- Paid, shipment pending, shipped, failed, and review-required orders are visible there.
- Manual corrections can be made directly in Supabase by the owner/developer.
- No custom admin UI for v1.

Deferred for later:

- exporting paid orders back to Google Sheets
- custom owner dashboard
- staff accounts and role-based access
- owner email/SMS notifications

Rationale:

- Keeps v1 low-maintenance.
- Avoids building authentication and admin screens too early.
- Supabase remains good enough for low-volume operational visibility.

Add simple operational database views to make Supabase Dashboard easier to use.

Recommended views:

- `ops_orders_recent`
- `ops_paid_orders`
- `ops_shipment_pending_orders`
- `ops_payment_review_orders`
- `ops_failed_payments`
- `ops_integration_errors`
- `ops_low_stock_variants`

Recommended readable fields:

- order number
- order status
- customer name
- customer phone
- total amount
- payment status
- shipment status
- tracking number
- created date
- relevant error message where applicable

Rationale:

- No custom admin UI required.
- Gives owner/developer quick filtered views.
- Free and low maintenance.
- Keeps operational queries consistent.

Low-stock alerts are deferred. A low-stock operational view can exist, but Telegram/reporting alerts
for low stock can be added later.

### Notifications

Skip customer-facing custom automated notifications in v1.

The storefront can show an on-screen payment/order confirmation. Razorpay's own payment receipt can
be used if enabled in Razorpay settings.

For owner/internal operational alerts, use Telegram if alerts are needed in v1.

Recommended owner alerts:

- new paid order
- shipment creation failed
- payment review required
- product sync failed
- restock applied during sync

Implementation:

- Create a Telegram bot.
- Store bot token and owner/group chat id as Supabase secrets or GitHub Actions secrets.
- Send a short text message from Edge Functions or sync scripts.
- Do not include full customer address in alerts; include order number, amount, and status.
- Alerts are optional/config-driven. If Telegram secrets are missing, checkout/sync should continue
  without alerts.

Deferred for later:

- customer order confirmation email
- owner new-order email
- WhatsApp/SMS notifications
- notification templates
- retry and delivery tracking

Rationale:

- Avoids provider setup and deliverability maintenance.
- Keeps the first backend focused on orders, payments, inventory, and shipments.
- Notification providers can be added later from order/payment/shipment events.
- Telegram owner alerts are simple and free enough for operational visibility.

### Product Images

Use Cloudflare R2 for product images.

Google Sheets stores product data. Google Drive stores image folders named by `product_id`. The
catalog publish workflow uploads new or changed images to R2 and writes public R2 URLs into the
product catalog used by Supabase and the storefront.

Recommended workflow:

- Create separate R2 buckets for QA and production.
- Attach separate media hostnames to those buckets.
- Share the Google Drive image root folder with the Google service account.
- Keep the `images` sheet column blank for the normal folder-based workflow.
- Keep the storefront decoupled from the upload workflow by reading image URLs from product data.

Scale expectation:

- Around 1000 product images is acceptable if images are compressed and sized for storefront use.
- Keep uploaded photos web-ready; avoid original full-resolution camera files.
- A practical target is web-ready images, for example roughly 150-400 KB each where quality allows.

Deferred for later:

- owner upload UI
- automatic image resizing pipeline
- paid image transformation service
- Cloudflare Images transformations if traffic or image operations grow

Rationale:

- Keeps image management outside git.
- Uses the same Cloudflare platform as the storefront.
- Lets the shop owner manage images in Google Drive without a product edit UI.

### Product Image Upload Workflow

Use a CI/CD-managed image upload and validation workflow.

Recommended workflow:

- The owner places optimized images in Google Drive folders grouped by product ID.
- The `Publish catalog` workflow validates image availability.
- The image sync computes content hashes and skips unchanged R2 objects.
- Product sync writes public R2 URLs into the generated storefront catalog and Supabase product rows.

Recommended Google Drive layout:

```text
Website Photo/
  KURTI-001/
    01-front.jpg
    02-close.jpg
    03-side.jpg
  KURTI-002/
    01-front.jpg
    02-close.jpg
```

Normal Google Sheets `images` cell:

```text
blank
```

Recommended R2 object key:

```text
products/KURTI-001/<content_hash>-01-front.jpg
```

Rationale:

- Avoids manual public URL copying.
- Reduces broken image links.
- Keeps the owner-facing spreadsheet simple.
- Does not require building an admin upload UI.
- Product ID folders keep owner image management predictable.

### Catalog And Image Sync Trigger

Use one manual `Publish catalog` workflow for v1.

Workflow behavior:

- The owner can dispatch it from `/admin`.
- Developers can dispatch it from GitHub Actions.
- It reads Google Sheets and Google Drive, validates product data and image availability, uploads
  changed images to R2, syncs Supabase, builds, prerenders public catalog pages, and deploys through
  Cloudflare Workers.

Operational behavior:

- The owner/developer runs publish after changing the spreadsheet or image folder.
- Sync validates data before writing to Supabase.
- CI automation can be added later once the workflow is stable.

Rationale:

- Avoids accidental syncs from half-edited spreadsheets.
- Keeps launch workflow understandable.
- Does not require scheduled jobs or extra infrastructure.

### Stock Sync Semantics

Use two spreadsheet stock fields for v1:

- `stock`: initial stock for new product sizes.
- `restock`: intentional live stock replacement for existing product sizes.

Sync behavior:

- For a new product or new size, `stock` initializes Supabase live stock.
- For an existing product size, `stock` does not overwrite Supabase live stock.
- For an existing product size, `restock` replaces Supabase live stock when provided.
- After applying `restock`, the owner should clear that cell in the sheet to avoid accidental repeat
  changes on the next sync.
- Paid orders always deduct Supabase live stock.

Recommended implementation detail:

- Treat empty `restock` as "do not change live stock".
- Treat numeric `restock` as "set live stock to this exact value".
- Log every restock application during sync.
- Optionally fail sync if `restock` is negative or not an integer.

Restock means exact replacement, not addition. If the owner enters `8`, Supabase live stock for that
product size becomes `8`.

Rationale:

- New products remain easy to add.
- Existing stock is protected from accidental overwrite.
- The owner still has a simple spreadsheet mechanism to correct or replenish inventory.
- This avoids building a full inventory adjustment system too early.

### Product Availability

Use an `active` spreadsheet column to control storefront visibility and checkout eligibility.

Behavior:

- `active = true/yes`: product can appear on the storefront and be checked out if stock exists.
- `active = false/no`: product is hidden and cannot be checked out.
- Out-of-stock products can remain visible when `active = true`, but purchase controls should show
  unavailable.
- Deleted/missing spreadsheet rows should not hard-delete Supabase products by default. Sync should
  mark them inactive instead.

Rationale:

- Safe and reversible product removal.
- Prevents broken historical order references.
- Keeps old order item snapshots valid even if the product is no longer sold.

### Product IDs And SKUs

The owner provides stable product IDs/SKUs in Google Sheets.

Sync behavior:

- Product IDs are required.
- Product IDs must be unique.
- Product IDs should not be regenerated from titles.
- Product IDs should remain stable even if product title, price, or images change.
- Sync should fail if duplicate or missing product IDs are found.

Rationale:

- Titles can change; product identity should not.
- Stable IDs keep URLs, orders, inventory, and image references reliable.
- Owner-provided IDs are easier to reconcile with offline inventory processes.

### Product URLs And Slugs

Use public product slugs for storefront URLs, not internal product IDs.

Example:

```text
/products/blue-printed-kurti-1042
```

Behavior:

- New products get a slug generated from the title plus a short unique suffix.
- Existing products keep their stored slug even if the title changes.
- Internal `product_id` remains owner-managed and is used for checkout, inventory, and order
  references.
- The slug is used for storefront routing and product detail pages.
- Optional later: support explicit slug overrides and redirects from old slugs.

Rationale:

- URLs look better for customers.
- Internal SKUs/product IDs stay operational rather than public-facing.
- Stable stored slugs avoid broken links when titles change.

Slug suffix:

- Use a short deterministic suffix derived from the internal product ID.
- Example: `blue-printed-kurti-p8x4`.
- Avoid plain incremental counters and avoid exposing the full product ID.

Rationale:

- Stable without a database counter.
- Easy to regenerate if needed.
- Low collision risk for a small catalog.
- Keeps URLs customer-friendly while preserving internal product identity.

### Checkout Customer Fields

Collect only the fields needed for payment, delivery, and basic order support:

- full name
- phone
- email
- address line
- landmark, optional
- city
- state
- pincode

Do not create customer accounts, saved addresses, or customer profiles in v1.

Rationale:

- Keeps checkout lightweight.
- Captures enough information for logistics providers.
- Avoids customer management complexity.

### Payment Methods

Use Razorpay prepaid payments only for v1.

Deferred for later:

- cash on delivery
- manual bank transfer
- partial payment
- store credit

Rationale:

- Keeps checkout and fulfillment logic simple.
- Reduces failed delivery and reconciliation complexity.
- Matches the current Razorpay integration direction.

### Payment Verification

Follow Razorpay Standard Checkout guidance:

- The checkout success callback sends `razorpay_payment_id`, `razorpay_order_id`, and
  `razorpay_signature` to the backend.
- The backend verifies the signature using Razorpay key secret.
- Only after backend verification should the order be treated as paid.

Use Razorpay webhooks as an idempotent backup/update path:

- Webhooks are signed and verified separately.
- Webhooks can confirm captured payments or failed payments if the browser callback is interrupted.
- If callback verification and webhook state disagree, move the order to `payment_review_required`.

Rationale:

- Matches Razorpay's required server-side verification flow.
- Keeps the customer confirmation path fast.
- Protects against browser interruptions with webhook recovery.

### Shipment Trigger Architecture

Keep shipment creation as a separate workflow from payment verification.

Simple v1 behavior:

- `verify-payment` verifies the payment and marks the order as `paid`.
- After the order is paid, the backend triggers a separate shipment creation function/workflow.
- Shipment creation reads the paid order, creates a provider shipment, and stores shipment metadata.
- If shipment creation fails, the payment remains valid and the order moves to `shipment_pending`
  for manual retry.

Rationale:

- Keeps payment logic clean.
- Isolates logistics provider complexity.
- Makes retries possible without re-verifying or touching payment state.

Payment confirmation should not depend on Delhivery being fast or available.

V1 behavior:

- Mark the order paid first.
- Attempt shipment creation with a short timeout.
- If shipment creation succeeds, store shipment details.
- If shipment creation fails or times out, return payment success to the customer and mark the order
  `shipment_pending` for manual retry.

Rationale:

- Customer payment confirmation remains reliable.
- Logistics outages do not break payment completion.
- Manual retry remains possible without touching payment state.

### Order State Transitions

V1 order/payment/shipment flow:

```text
create-checkout-order
  -> orders.status = payment_pending
  -> payments.status = created
  -> Razorpay order created

verify-payment
  -> verify Razorpay signature
  -> atomic stock deduction
  -> payments.status = verified
  -> orders.status = paid
  -> attempt create-shipment

create-shipment success
  -> shipments.status = created
  -> orders.status = shipment_pending

create-shipment failure
  -> orders.status = shipment_pending
  -> integration event stores provider error
  -> Telegram alert if configured

provider pickup/in-transit update, if available
  -> shipments.status = in_transit
  -> orders.status = shipped

provider delivery update, if available
  -> shipments.status = delivered
  -> orders.status = delivered
```

Shipment creation does not mean the order is shipped. Keep `orders.status = shipment_pending` after
successful shipment creation, and move to `shipped` only after pickup/in-transit confirmation.

Rationale:

- Matches Razorpay's server-side verification requirement.
- Matches Delhivery-style separation between order/shipment creation and pickup movement.
- Keeps customer payment success independent from logistics progress.

### Failure Handling Rules

Use these v1 failure rules:

```text
Payment signature invalid
  -> payments.status = failed
  -> orders.status = payment_failed

Payment valid but stock insufficient
  -> orders.status = payment_review_required
  -> alert owner if Telegram is configured
  -> manual refund or fulfillment resolution

Payment valid, stock deducted, shipment fails
  -> orders.status = shipment_pending
  -> integration event stores shipment error
  -> alert owner if Telegram is configured
  -> retry shipment via GitHub Actions workflow

Razorpay callback missed, webhook arrives
  -> webhook verifies and updates payment/order idempotently

Telegram alert fails
  -> log integration event
  -> never fail checkout, payment verification, or shipment flow

Product sync validation fails
  -> stop sync
  -> no partial publish
```

Rationale:

- Payment correctness remains strict.
- Logistics and alerting failures do not invalidate paid orders.
- Manual recovery paths stay clear without custom admin UI.

### Manual Shipment Retry

Use Supabase Dashboard for visibility and a GitHub Actions manual workflow for retry execution.

Operational behavior:

- Shipment creation failure sets order status to `shipment_pending`.
- Failure details are recorded in integration logs.
- Telegram alert notifies the owner/developer.
- Owner/developer can view affected orders in Supabase Dashboard by filtering
  `orders.status = shipment_pending`.
- Retry is executed through a `workflow_dispatch` GitHub Action with an input such as
  `order_number`.

Example:

```text
Workflow: Retry shipment
Input: order_number = KJ-260511-A7K2
```

Rationale:

- No custom admin UI required.
- Uses existing GitHub/Supabase security.
- Gives a clear manual recovery path for low order volume.
- Can later evolve into an owner-facing button or protected internal page if needed.

### Storefront Product Reads

Use static/generated product JSON for browsing, listing, detail pages, filtering, and search.

Use Supabase only for trusted checkout validation and operational state.

Behavior:

- Product browsing does not call Supabase.
- Search/filtering runs client-side from generated data.
- Product detail pages read generated data by public slug.
- Checkout sends cart lines to Supabase, where active status, current price, and live stock are
  validated.

Rationale:

- Faster storefront.
- Lower backend cost.
- Works well with Cloudflare Workers deployment with prerendered public catalog routes.
- Protects Supabase free tier from browse traffic.
- Keeps checkout safe because payment amounts are still backend-authoritative.

### Hosting Target

Target Cloudflare Workers for v1 storefront hosting.

Deployment shape:

- TanStack Start app hosted on Cloudflare Workers.
- Supabase hosts backend state and Edge Functions.
- Product browsing uses generated/static data.
- Checkout calls Supabase Edge Functions directly.

Rationale:

- Good fit for low-cost storefront hosting.
- Better than GitHub Pages if SSR/server behavior is retained.
- Keeps the frontend host separate from Supabase backend responsibilities.
- Deployment can remain portable if hosting needs change later.

### Deployment And Sync Flow

Keep catalog/image publishing explicit and push-based. The catalog publish workflow owns image sync,
product sync, build/prerender, and storefront deployment for product content changes.

Recommended flow:

```text
1. Owner/developer updates Google Sheet and Google Drive image folder.
2. Run the Publish catalog workflow.
3. Publish catalog validates data/images, uploads changed images to R2, syncs Supabase, builds, and deploys.
```

GitHub Actions can be used for this, but as an explicit/manual workflow rather than automatically
on every code deploy.

For v1, GitHub Actions sync should be `workflow_dispatch` only. No scheduled sync.

Rationale:

- Avoids publishing half-edited sheet data.
- Keeps catalog validation failures separate from app deployment.
- Lets the owner/developer intentionally choose when product changes go live.

### Repository Organization

Use a single repo with clear backend boundaries.

Top-level layout:

```text
src/          storefront
supabase/     backend runtime and database migrations
scripts/      sync and operational scripts
shared/       app/script shared utilities and schemas
docs/         decisions and operations docs
```

Backend function organization:

```text
supabase/
  migrations/
  functions/
    _shared/
      http/
      domain/
      integrations/
      db/
      schemas/
    create-checkout-order/
    verify-payment/
    razorpay-webhook/
    create-shipment/
    retry-shipment/
```

Rules:

- Function `index.ts` files should stay thin.
- Business rules live in `_shared/domain`.
- Provider-specific code lives in `_shared/integrations`.
- Database access lives in `_shared/db`.
- Request validation lives in `_shared/schemas`.
- HTTP helpers live in `_shared/http`.
- Do not add heavy monorepo tooling unless the project actually needs it.

Rationale:

- Keeps backend code separate from storefront code.
- Prevents Edge Functions from becoming large one-file handlers.
- Leaves room to add more integrations without turning the backend into spaghetti.

### Google Sheets Structure

Start with one `Products` tab for v1.

The `Products` tab contains catalog fields, pricing, image references, size stock, restock values,
active status, and inline size chart data.

V1 columns:

```text
product_id
active
title
category
description
mrp
selling_price
images
sizes
stock
restock
size_chart
featured
```

Column notes:

- `product_id`: required owner-provided stable ID.
- `active`: yes/no product visibility and checkout eligibility.
- `images`: list of image filenames, storage paths, or URLs.
- `category`: required category used for navigation/filtering.
- `sizes`: list such as `S, M, L, XL`.
- `stock`: initial stock map for new variants, such as `S:2, M:4, L:1`.
- `restock`: exact replacement stock map for existing variants, such as `M:8`.
- `size_chart`: structured text or JSON.
- `featured`: optional homepage merchandising flag.

Do not include `collection`, `color`, `fabric`, or `care` in v1 unless they become necessary for
the storefront.

Deferred optional tabs:

- `SizeCharts`, if inline size chart data becomes hard to maintain.
- `Settings`, for shipping thresholds, homepage collections, or storefront configuration.
- `Collections`, if category/collection merchandising becomes more complex.

Rationale:

- Easier for the owner to understand.
- Less risk of cross-tab mistakes.
- Enough for the initial clothing catalog workflow.

### Spreadsheet Validation

Product sync should fail hard if any product row is invalid.

Examples of invalid data:

- missing product ID
- duplicate product ID
- missing title
- invalid price or discount
- invalid stock/restock value
- missing required image
- referenced image does not exist in storage/local upload folder
- invalid active flag
- malformed size chart

Rationale:

- Avoids partial catalog publishes.
- Makes sync results predictable.
- Forces data issues to be fixed before storefront or Supabase data changes.

### Order Item Snapshots

Store immutable product snapshots on `order_items`.

Snapshot fields should include enough purchase-time data to understand the order later:

- product_id
- product slug
- title
- size
- quantity
- unit selling price
- MRP
- discount
- primary image URL

Rationale:

- Orders remain historically accurate even if product data changes later.
- Old orders do not break when products are renamed, repriced, hidden, or removed from the catalog.
- Fulfillment and support can see what the customer actually bought.

### Order Numbers

Use internal UUIDs for database identity and generate friendly order numbers for customer/owner
reference.

Example:

```text
KJ-260511-A7K2
```

Behavior:

- UUID remains the primary key.
- Friendly order number is unique and shown in confirmation screens and owner workflows.
- Razorpay notes/receipt can include either UUID or friendly order number, but backend matching
  should still use the internal UUID/razorpay order id.

Rationale:

- Easier for customers and owner to communicate.
- Keeps database identity stable and implementation-friendly.
- Simple to add during order creation.

Use a timestamp plus short random suffix for v1 rather than a strict daily sequence.

Rationale:

- Avoids sequence/counter locking in serverless functions.
- Easier to implement safely.
- Readable enough for customers.
- Good fit for low order volume.

### Product Pricing Fields

Store `MRP` and `selling_price` in Google Sheets.

Derived fields:

- discount amount
- discount percent

Behavior:

- Checkout charges `selling_price`.
- Product listing can display derived discount percent.
- Sync should validate that `selling_price <= MRP` unless an explicit exception is needed later.

Rationale:

- The owner can control exact payable price.
- Avoids rounding issues from percentage-based pricing.
- Discount percent is mostly a display concern.

### Coupons And Promotions

Do not support coupons or cart-level promotions in v1.

Discounts are handled as product-level `selling_price` values from Google Sheets.

Deferred for later:

- coupon codes
- usage limits
- expiry dates
- minimum cart values
- customer-specific discounts

Rationale:

- Avoids validation and abuse complexity.
- Keeps checkout amount calculation straightforward.
- Product-level sale pricing is enough for launch.

### Tax And GST

Use tax-inclusive prices for v1.

Behavior:

- `selling_price` is the final product price shown to the customer.
- Checkout charges product totals plus shipping.
- No separate tax calculation or GST invoice breakdown in v1.

Deferred for later:

- GST rate per product
- tax-exclusive pricing
- invoice generation
- tax reports

Rationale:

- Keeps checkout simple.
- Avoids accounting and invoice complexity before it is required.
- Matches a lightweight storefront launch.

### Cancellations And Refunds

Handle refunds manually in the Razorpay dashboard for v1.

Backend behavior:

- Orders can be marked `cancelled` or `payment_review_required`.
- The backend does not call Razorpay refund APIs in v1.
- Refund reference/status can be recorded manually later if needed.

Deferred for later:

- automated refunds
- partial refunds
- return/refund workflows
- refund webhooks

Rationale:

- Keeps payment integration smaller.
- Avoids refund edge cases before operational volume justifies automation.
- Razorpay dashboard remains the source for manual refund execution.

### Logs And Audit Trail

Keep lightweight logs for integration events only.

Store:

- Razorpay webhook payloads
- logistics webhook payloads
- shipment creation response/error payloads
- product sync summary/errors
- restock applications during product sync

Do not log:

- customer browsing behavior
- search analytics
- cart change events
- detailed frontend interaction data

Rationale:

- Helps debug payments, shipments, and sync failures.
- Avoids analytics complexity.
- Keeps database usage low.

Use one generic `integration_events` table rather than separate event tables.

Recommended fields:

- `id`
- `source`
- `event_type`
- `order_id`, nullable
- `status`
- `payload jsonb`
- `error_message`, nullable
- `created_at`

Example sources:

- `razorpay`
- `delhivery`
- `product_sync`
- `image_sync`
- `telegram`

Rationale:

- Simple schema.
- One place to inspect integration behavior.
- Easy to extend without adding tables for every provider.

### PII Retention

Defer formal PII retention rules for later.

V1 behavior:

- Collect only delivery/support fields needed for checkout and fulfillment.
- Store customer delivery details on the order record.
- Do not collect customer profiles, birthdays, preferences, saved addresses, or accounts.

Deferred for later:

- retention policy
- data export process
- data deletion/anonymization process
- privacy operations documentation

Rationale:

- Order delivery details are operationally needed for fulfillment and support.
- The main v1 privacy control is minimizing collected data.

### Database Access And RLS

Keep Supabase tables private for v1.

Access model:

- Public storefront does not read Supabase tables directly.
- Product browsing uses generated/static JSON.
- Checkout calls Supabase Edge Functions.
- Edge Functions use server-side/service-role access where needed.
- Sync scripts use service-role access.
- Orders, payments, shipments, and customer delivery details are never publicly readable.

Rationale:

- Simple access control.
- Lower risk of accidental data exposure.
- RLS policies can stay minimal.
- Public API surface is limited to Edge Functions designed for checkout and webhooks.

### Edge Function Access Rules

Use simple access rules by caller type.

Website-called functions:

- `create-checkout-order`
- `verify-payment`

These require the normal Supabase anon JWT/public client key.

Provider-called webhook functions:

- `razorpay-webhook`
- future `logistics-webhook`

These do not require Supabase JWT because providers cannot send it. They must verify the provider's
own signature or shared secret instead.

Admin/sync operations:

- product sync
- image sync
- manual shipment retry scripts

These use service-role credentials from local scripts or GitHub Actions secrets. They are not public
storefront endpoints.

Rationale:

- Website functions are not fully open.
- External providers can still call webhooks.
- Sensitive admin operations stay outside public access.

### Backend API Surface

V1 Edge Functions:

```text
create-checkout-order
verify-payment
razorpay-webhook
create-shipment
retry-shipment
logistics-webhook
```

`logistics-webhook` is optional for v1 and only added if Delhivery webhook setup is straightforward.

Function responsibilities:

- `create-checkout-order`: validates cart, creates internal order/payment, creates Razorpay order.
- `verify-payment`: verifies Razorpay callback, deducts stock, marks payment/order paid, triggers
  shipment flow.
- `razorpay-webhook`: backup/idempotent Razorpay updates.
- `create-shipment`: internal service flow for Delhivery shipment creation.
- `retry-shipment`: manual ops retry, called by GitHub Actions/local script.
- `logistics-webhook`: provider shipment status updates.

### API Security And Abuse Resistance

Public website functions:

- Require Supabase anon JWT.
- Validate request body strictly.
- Never trust frontend price, total, title, product active status, or stock.
- Load products and variants from Supabase.
- Reject inactive products and variants.
- Recalculate totals server-side.
- Create Razorpay orders only from server-calculated totals.
- Enforce input limits such as max cart lines and max quantity per line.
- Store internal order before opening Razorpay.
- Verify Razorpay signatures server-side.
- Deduct stock atomically in Postgres.
- Make payment verification idempotent so repeated callbacks do not double-deduct stock.
- Return minimal customer-facing error details.

Provider webhook functions:

- Do not require Supabase JWT because providers cannot send it.
- Require provider signature or shared secret.
- Verify raw request body signatures where applicable.
- Store event keys to prevent duplicate processing.
- Process events idempotently.
- Ignore unknown/unmatched events safely.

Admin/ops functions:

- Not called by the public storefront.
- Use service-role credentials from GitHub Actions or local scripts.
- Restrict actions to valid states, such as retrying shipment only for `shipment_pending` orders.

Rate/abuse posture:

- Avoid complex rate-limit infrastructure in v1.
- Keep public functions cheap and strictly validated.
- Add simple in-memory best-effort rate limiting inside public Edge Functions where practical.
- Do not rely on in-memory rate limiting as a hard security boundary because serverless isolates can
  restart or run in parallel.
- The worst acceptable abuse outcome is unpaid `payment_pending` orders, which can be cleaned later.
- Abuse must not be able to create paid orders, alter totals, bypass stock checks, or trigger
  shipments without verified payment.

### Secrets And Environments

Use separate environment scopes for local development, Supabase Edge Functions, GitHub Actions, and
Cloudflare Workers.

Local `.env`:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_SHEETS_SPREADSHEET_ID
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
DELHIVERY_API_TOKEN
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

Supabase Edge Function secrets:

```text
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
DELHIVERY_API_TOKEN
TELEGRAM_BOT_TOKEN
TELEGRAM_CHAT_ID
```

GitHub Actions secrets:

```text
SUPABASE_ACCESS_TOKEN
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_SHEETS_SPREADSHEET_ID
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
```

Cloudflare Workers environment variables:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
GITHUB_REPOSITORY
CATALOG_PUBLISH_WORKFLOW_FILE
```

Security rules:

- Never expose service role keys, Razorpay secrets, Delhivery token, Telegram token, or Google
  service account JSON to the browser.
- Only `VITE_*` variables are browser-exposed.
- Edge Functions use provider secrets server-side.
- GitHub Actions uses service-role credentials only for sync/ops workflows.

### Backend Runtime

Use TypeScript on Supabase Edge Functions for backend runtime code.

Applies to:

- checkout order creation
- payment verification
- Razorpay webhook
- shipment creation
- logistics webhook
- optional Telegram alerts

Rationale:

- Same language as the TanStack Start frontend.
- Native path for Supabase Edge Functions.
- No separate server hosting.
- Good fit for HTTP integrations with Razorpay, Delhivery, and Telegram.

### Shared Backend Contracts

Use shared TypeScript validation contracts for important backend boundaries.

Recommended validated inputs:

- checkout cart/order creation request
- payment verification request
- product sync row
- image sync manifest/path
- shipment creation request
- logistics webhook payload normalization

Implementation options:

- Use `zod` where it fits the existing app/tooling.
- Use small manual validators in Edge Functions if bundle/runtime constraints make that simpler.

Rationale:

- Keeps Edge Functions consistent.
- Prevents drift between frontend payloads, sync scripts, and backend functions.
- Makes future integrations easier to add safely.

### First Logistics Provider

Use Delhivery as the first logistics provider.

Implementation approach:

- Keep a small provider adapter boundary in code.
- Do not over-abstract for many providers in v1.
- Store provider-neutral shipment fields in the database.
- Keep Delhivery-specific request/response mapping inside the Delhivery adapter/function.

Delhivery-like data needs:

- pickup location/config
- package weight/dimensions
- consignee name, phone, address, pincode
- prepaid order value
- provider shipment/order id
- tracking number or waybill
- shipment status updates

Rationale:

- Lets us start with one concrete provider.
- Avoids hardcoding Delhivery fields throughout the order model.
- Keeps the code simple while preserving a clean place to change providers later.

### Shipment Status Updates

Support Delhivery shipment status webhook if setup is straightforward, but do not block v1 launch on
automated delivery tracking.

V1 minimum:

- Create shipment after payment.
- Store provider shipment id/tracking number.
- Owner can inspect tracking in Supabase Dashboard or Delhivery dashboard.

If webhook setup is simple:

- Add `logistics-webhook`.
- Verify provider signature/token.
- Map provider status into internal shipment/order status.

Rationale:

- Keeps the core online shop complete.
- Avoids delaying launch on non-critical tracking automation.
- Still leaves a clean path to automated shipment updates.

### Package Dimensions And Weight

Use one default package configuration for v1.

Default shipment config should include:

- package weight
- package length
- package breadth
- package height
- pickup location/config

Do not add product-level weight/dimensions to Google Sheets initially unless Delhivery requires more
accurate values for this catalog.

Rationale:

- Clothing orders can usually start with a simple default package profile.
- Keeps the owner spreadsheet smaller.
- Avoids premature logistics complexity.
- Product-level package metadata can be added later if shipping accuracy or provider requirements
  demand it.
