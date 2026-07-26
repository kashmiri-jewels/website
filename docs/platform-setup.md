# Platform Setup

Goal: zero-cost, simple CI/CD, with clear QA and production separation.

## GitHub

Best setup:

- Branches: `dev`, `main`.
- Work starts from `dev` on feature branches.
- Merge feature branches into `dev` to deploy QA.
- Merge `dev` into `main` to deploy production.
- Protect `dev` and `main`: no direct pushes, require CI.

Current repo setup:

- CI runs on `dev` and `main`.
- QA deploy runs when `dev` changes.
- Prod deploy runs when `main` changes.
- Workflows use standard GitHub environments. Missing secrets fail naturally in the relevant build, deploy,
  or CLI command.

Important GitHub secret rule:

- Environment secrets override repo secrets.
- If an environment secret is missing, GitHub can still expose a repo secret with the same name.
- To avoid QA accidentally using prod values, move runtime secrets from repo-level to environment-level, then
  delete the repo-level copies.

Keep repo-level only:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Put these in both `qa` and `prod` environments:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
SUPABASE_PROJECT_REF
SUPABASE_DB_PASSWORD
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
GOOGLE_SHEETS_SPREADSHEET_ID
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_DRIVE_IMAGE_FOLDER_ID
R2_PRODUCT_IMAGES_BUCKET
R2_ACCESS_KEY_ID
R2_SECRET_ACCESS_KEY
PRODUCT_IMAGE_PUBLIC_BASE_URL
```

After environment secrets are set, remove these repo-level secrets:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
GOOGLE_SHEETS_SPREADSHEET_ID
```

Need from you:

```bash
gh auth login -h github.com
```

Then I can apply branch protection.

## Supabase

Best zero-cost setup:

- Use two Supabase projects:
  - prod: existing `kashmiri-jewels-shop`
  - qa: `kashmiri-jewels-shop-qa`
- This fits Supabase Free only if you stay within the free active-project limit.
- Use the same migrations for both.
- Keep Google Sheet IDs configurable per environment. QA and production may use separate sheets, or the
  same spreadsheet if the owner intentionally wants one source.
- QA uses Razorpay test secrets.
- Prod uses Razorpay live secrets.

Do not use one Supabase project with “different DBs”:

- Hosted Supabase projects have one main Postgres database.
- Separate schemas are possible, but messy for Auth, Storage, Edge Functions, API keys, and secrets.
- Supabase Branching is not the best fit for a zero-cost setup because Branching is not included in Free.

Need from you:

- Razorpay QA test keys before checkout can be fully tested.

Current status:

- Prod Supabase project exists; keep the project ref in GitHub/Supabase config, not in docs.
- QA Supabase project exists; keep the project ref in GitHub/Supabase config, not in docs.
- QA migrations are applied.
- QA Edge Functions are deployed.
- QA GitHub environment has Supabase URL, anon key, service role key, project ref, DB password, and access token.
- QA and prod GitHub environments currently point to the same owner-managed Google Sheet and Drive image root.
- QA catalog publishing now runs through GitHub Actions after Google Sheets, Google Drive, R2, and
  environment secrets are configured. The manual `Publish catalog` workflow and the `dev` branch
  deploy both use the same generated catalog path.

## Cloudflare

Best setup:

- One Worker script for prod: `kashmiri-jewels`.
- One Worker environment for QA: `kashmiri-jewels-qa`.
- Prod domains: `kashmirijewels.com`, `www.kashmirijewels.com`.
- QA domain: `qa.kashmirijewels.com`.
- Stay on Workers Free. Avoid KV, D1, Queues, Images, or paid add-ons unless needed.

Current repo setup:

- `wrangler.jsonc` is configured for prod and QA domains.
- Cloudflare CLI is logged in.

Need first:

- `kashmirijewels.com` must be active in Cloudflare DNS.

## GoDaddy

Best setup:

- Use GoDaddy only as registrar.
- Use Cloudflare for DNS.

Need from you:

1. Add `kashmirijewels.com` to Cloudflare.
2. Copy existing DNS records from GoDaddy to Cloudflare if any.
3. In GoDaddy, change nameservers to the two Cloudflare nameservers.
4. Wait for Cloudflare to show the zone as active.

## Razorpay

Best setup:

- QA uses Razorpay test mode keys.
- Prod uses Razorpay live mode keys.
- Separate webhook secrets:
  - QA webhook points to QA Supabase function URL.
  - Prod webhook points to prod Supabase function URL.

Current status:

- QA GitHub environment has Razorpay test secrets.
- QA Supabase project has Razorpay test secrets.
- Prod is intentionally not configured because current local Razorpay keys are test keys.

Need from you:

- Razorpay live key ID/secret.
- Razorpay dashboard webhook setup.

QA webhook:

```text
URL: https://<qa-supabase-project-ref>.supabase.co/functions/v1/razorpay-webhook
Mode: Test
Events: payment.captured
Secret: use the configured QA RAZORPAY_WEBHOOK_SECRET
```

Prod webhook, later:

```text
URL: https://<prod-project-ref>.supabase.co/functions/v1/razorpay-webhook
Mode: Live
Events: payment.captured
Secret: separate live webhook secret
```

## Delhivery

Best setup:

- QA uses Delhivery staging credentials and staging shipment URL.
- Prod uses Delhivery live credentials and production shipment URL.
- Keep prod disabled until live pickup and billing details are confirmed.

Current status:

- QA GitHub environment has package dimension variables.
- Prod GitHub environment has Delhivery disabled and package dimension variables.
- QA Supabase project has package dimension secrets, but is still disabled until staging token and
  pickup location are provided.

QA Delhivery values:

```text
DELHIVERY_ENABLED=true
DELHIVERY_API_TOKEN=<staging token>
DELHIVERY_CREATE_SHIPMENT_URL=https://staging-express.delhivery.com/api/cmu/create.json
DELHIVERY_PICKUP_LOCATION=<staging warehouse name, exact case>
DELHIVERY_SELLER_GST=<seller GSTIN>
DELHIVERY_HSN_CODE=<catalog HSN code>
```

Prod Delhivery values:

```text
DELHIVERY_ENABLED=true
DELHIVERY_API_TOKEN=<live token>
DELHIVERY_CREATE_SHIPMENT_URL=https://track.delhivery.com/api/cmu/create.json
DELHIVERY_PICKUP_LOCATION=<live warehouse name, exact case>
DELHIVERY_SELLER_GST=<seller GSTIN>
DELHIVERY_HSN_CODE=<catalog HSN code>
```

Need later before enabling prod:

- Prod Delhivery token and pickup config.
- Prod create-shipment API URL from Delhivery.
- Pickup location name exactly as Delhivery expects it.
- Optional seller GST and HSN code.
- Confirmation before enabling real shipments.

## Setup Order

1. GitHub branch protection.
2. GoDaddy to Cloudflare DNS.
3. Cloudflare prod/QA domains.
4. Supabase QA project.
5. GitHub environment secrets.
6. Razorpay test/prod webhooks.
7. Delhivery prod enablement.
