# Cloudflare Domains and Branch Deploys

This storefront deploys to Cloudflare Workers via Wrangler.

## What is already configured

- `main` deploys the production Worker, using `kashmirijewels.com` and `www.kashmirijewels.com`.
- `dev` deploys the Worker environment `qa`, using `qa.kashmirijewels.com`.
- `.github/workflows/deploy-cloudflare.yml` deploys production when `main` is pushed, or when run manually.
- `.github/workflows/deploy-cloudflare-qa.yml` deploys QA when the `dev` branch is pushed, or when run manually.
- The workflows use GitHub environments named `prod` and `qa`, so environment-specific secrets can override
  repository secrets if you create them.

## One-time Cloudflare and GoDaddy setup

Cloudflare Worker custom domains require `kashmirijewels.com` to be an active Cloudflare zone in the same Cloudflare
account as the Worker.

At setup time, public DNS returned `NXDOMAIN` for `kashmirijewels.com`. If GoDaddy shows the domain as
registered, check that the spelling is exact and that the registration has finished activating before
starting the nameserver switch.

1. In Cloudflare, add the site `kashmirijewels.com`.
2. Cloudflare will show two assigned nameservers. Keep that tab open.
3. Before changing nameservers in GoDaddy, copy all existing DNS records into Cloudflare, especially:
   - `MX`
   - `TXT`
   - SPF/DKIM/DMARC records
   - any existing `A`, `AAAA`, or `CNAME` records
4. In GoDaddy, open the domain, go to DNS or Nameservers, choose custom nameservers, and enter the two
   Cloudflare nameservers exactly.
5. Wait until Cloudflare marks the zone active.

After the zone is active, run the GitHub Actions deploy workflows. Wrangler should create the Worker custom domains and the necessary proxied DNS records for `kashmirijewels.com`,
`www.kashmirijewels.com`, and `qa.kashmirijewels.com`.

## Git branches

Create the branches once. `dev` is the QA deployment branch; `qa` is a GitHub/Cloudflare/Supabase
environment name, not a Git branch.

```bash
git switch main
git pull

git switch -c dev
git push -u origin dev

git switch main
```

After that:

- Pushing to `dev` deploys QA.
- Merging to `main` deploys production.

## Secrets

The workflows use GitHub environments named `prod` and `qa`. Add environment secrets with the same names in
both environments, but different values where appropriate.

Shared values:

```text
CLOUDFLARE_API_TOKEN
CLOUDFLARE_ACCOUNT_ID
SUPABASE_ACCESS_TOKEN
```

Environment-specific values:

```text
SUPABASE_PROJECT_REF
SUPABASE_DB_PASSWORD
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
OPS_SERVICE_ROLE_KEY
RAZORPAY_KEY_ID
RAZORPAY_KEY_SECRET
RAZORPAY_WEBHOOK_SECRET
```

Environment variables:

```text
GOOGLE_SHEETS_RANGE=Products!A1:Z
DELHIVERY_ENABLED=false
DELHIVERY_PACKAGE_WEIGHT_GRAMS=500
DELHIVERY_PACKAGE_LENGTH_CM=30
DELHIVERY_PACKAGE_BREADTH_CM=25
DELHIVERY_PACKAGE_HEIGHT_CM=5
```

The same Google Sheets source should be configured in both environments. QA should use Razorpay test keys and
prod should use Razorpay live keys.

## Supabase Environments

Use two Supabase projects:

- Prod: existing production Supabase project. Keep its project ref in GitHub/Supabase config, not
  in docs.
- QA: create a separate QA Supabase project, for example `kashmiri-jewels-shop-qa`.

Create QA with the Supabase CLI:

```bash
set -a
source .env
set +a
supabase projects create kashmiri-jewels-shop-qa \
  --org-id '<supabase-org-id>' \
  --region ap-southeast-1 \
  --db-password '<new-qa-db-password>'
```

After the project is ready, get its API keys:

```bash
set -a
source .env
set +a
supabase projects api-keys --project-ref '<qa-project-ref>'
```

Add the QA project ref, DB password, URL, anon key, and service role key to the GitHub `qa` environment.

Then run these GitHub Actions manually for `qa`:

1. `Deploy Supabase`
2. `Publish catalog`

Run the same actions for `prod` when live secrets change or migrations/functions need to deploy.

## Supabase

This storefront currently calls Supabase Edge Functions and does not rely on Supabase Auth redirects
for checkout. CORS is open in `supabase/functions/_shared/http/cors.ts`, so `qa.kashmirijewels.com` does not
need a function CORS change.

If Supabase Auth is added later, add this redirect URL in Supabase Auth settings:

```text
https://kashmirijewels.com/**
https://www.kashmirijewels.com/**
https://qa.kashmirijewels.com/**
```

## Verification

```bash
dig +short NS kashmirijewels.com
dig +short kashmirijewels.com
dig +short www.kashmirijewels.com
dig +short qa.kashmirijewels.com
curl -I https://kashmirijewels.com
curl -I https://qa.kashmirijewels.com
pnpm exec wrangler deployments list
pnpm exec wrangler deployments list --env qa
```
