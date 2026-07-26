# Analytics

Kashmiri Jewels uses Umami Cloud for privacy-friendly storefront analytics.

## Configuration

Analytics is enabled only when all public browser-safe Umami variables are present:

```text
VITE_UMAMI_SCRIPT_URL
VITE_UMAMI_WEBSITE_ID
VITE_UMAMI_DOMAINS
```

Recommended values:

```text
VITE_UMAMI_SCRIPT_URL=https://cloud.umami.is/script.js
```

QA:

```text
VITE_UMAMI_DOMAINS=qa.kashmirijewels.com
```

Production:

```text
VITE_UMAMI_DOMAINS=kashmirijewels.com,www.kashmirijewels.com
```

Keep `VITE_UMAMI_WEBSITE_ID` in GitHub environment variables for `qa` and `prod`. Do not hardcode
website IDs in app code.

## Implementation

- `src/routes/__root.tsx` injects Umami's deferred tracker script from environment config.
- `src/lib/analytics.ts` owns event names, payload normalization, and the `window.umami.track`
  wrapper.
- The script uses `data-domains` so local development is not tracked.
- The script uses `data-do-not-track="true"`.
- The script uses `data-exclude-search="true"` and `data-exclude-hash="true"` to avoid storing URL
  search and hash values.
- A `data-before-send` handler blocks analytics for `/admin`.

## Events

Tracked events:

```text
style_finder_open
style_finder_product_click
quick_view_open
size_select
add_to_bag
buy_now
cart_open
checkout_click
checkout_submit
checkout_started
razorpay_opened
payment_cancelled
payment_failed
purchase_completed
```

Allowed event properties:

```text
amount_bucket
budget
category
item_count
needs_review
occasion
preference
product_id
quantity
reused_order
size
source
stage
```

Do not send customer names, emails, phone numbers, addresses, order UUIDs, payment IDs, Razorpay
IDs, or exact cart line details to analytics.

## Free-Tier Discipline

Umami Cloud usage counts page hits, custom events, and stored event-data properties. Keep tracking
focused on the purchase funnel and style finder. Do not add click tracking for every navigation or
decorative control.
