# Deployment

The storefront deploys as a TanStack Start app on Cloudflare Workers. Public catalog routes are
prerendered during catalog publish/build where possible; admin, checkout, payment, and ops flows
remain runtime Worker behavior. The runtime backend stays on Supabase Edge Functions.

## Cloudflare Workers

The project follows Cloudflare's current TanStack Start Workers guide:

- Cloudflare TanStack Start guide:
  `https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/`
- Cloudflare Vite plugin:
  `https://developers.cloudflare.com/workers/vite-plugin/`

Cloudflare files:

- `vite.config.ts` uses `@cloudflare/vite-plugin` with the TanStack Start SSR environment.
- `wrangler.jsonc` declares the Worker entrypoint as `@tanstack/react-start/server-entry`.
- `.github/workflows/deploy-cloudflare.yml` builds and deploys with Wrangler.

Local deploy commands are intentionally not provided. Deployment runs through GitHub Actions.
Cloudflare Worker custom-domain routes are one-time infrastructure setup. The deploy workflows do
not create or update routes on every deploy; they publish the Worker script/assets, then verify the
configured domain responds over HTTPS.

## GitHub Secrets

Required for deploy:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_SANITY_PROJECT_ID
VITE_SANITY_DATASET
VITE_SANITY_API_VERSION
SANITY_READ_TOKEN
```

The Cloudflare API token used by GitHub Actions must be scoped to deploy Workers for the account.
It does not need Worker route edit permission after the domain routes already exist.

Required as Cloudflare Worker secrets for `/admin`:

```text
ADMIN_EMAILS
CF_ACCESS_TEAM_DOMAIN
CF_ACCESS_AUD
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPS_SERVICE_ROLE_KEY
GITHUB_ACTIONS_TOKEN
```

`GITHUB_REPOSITORY`, `CATALOG_PUBLISH_WORKFLOW_FILE`, `CATALOG_PUBLISH_QA_REF`, and
`CATALOG_PUBLISH_PROD_REF` are non-secret Worker variables tracked in `wrangler.jsonc`.

For local development only, set `ADMIN_DEV_EMAIL` to one of the emails in `ADMIN_EMAILS`.
The local fallback is disabled unless `ADMIN_DEV_BYPASS=true`; never set that variable in
Cloudflare QA or production. Production builds also ignore the fallback even if that variable is
accidentally present.
Use the full Cloudflare Access team domain for `CF_ACCESS_TEAM_DOMAIN`, for example
`https://team-name.cloudflareaccess.com`.

Required when `Publish catalog` should fetch products from Google Sheets and images from Google
Drive:

```text
GOOGLE_SHEETS_SPREADSHEET_ID
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_DRIVE_IMAGE_FOLDER_ID
R2_PRODUCT_IMAGES_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
PRODUCT_IMAGE_PUBLIC_BASE_URL
```

Optional GitHub variable:

```text
GOOGLE_SHEETS_RANGE
```

## Secret Boundary

Only public browser-safe values may use the `VITE_` prefix.

Do not add these to Cloudflare public env vars or Vite env vars:

```text
SUPABASE_SERVICE_ROLE_KEY
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
DELHIVERY_API_TOKEN
OPS_SERVICE_ROLE_KEY
TELEGRAM_BOT_TOKEN
```

Those secrets belong only in Supabase Edge Function secrets, Cloudflare Worker secrets needed by
server-only admin code, or GitHub Actions jobs that need direct operational access.

## Admin Access

Protect both admin paths with Cloudflare Access:

```text
kashmirijewels.com/admin*
qa.kashmirijewels.com/admin*
kashmirijewels.com/_serverFn/*
qa.kashmirijewels.com/_serverFn/*
```

Use Google as the only login method, and keep the Access allowlist in sync with `ADMIN_EMAILS`.
The app also validates the Cloudflare Access JWT and rejects emails outside `ADMIN_EMAILS`.
The `_serverFn` paths are needed because TanStack Start calls admin server functions through those
endpoints after the page loads.
While admin is the only feature using `createServerFn`, treat `/_serverFn/*` as admin-only. If a
future public feature needs server-side logic, use a TanStack server route or revisit the server
function base path before deploying it.
