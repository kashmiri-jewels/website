# CI/CD

The repository uses two long-lived Git branches:

- `dev`: QA branch. Merge feature work here to deploy `qa.kashmirijewels.com`.
- `main`: production branch. Merge into this branch to deploy `kashmirijewels.com` and `www.kashmirijewels.com`.

## Flow

1. Branch from `dev` for feature work.
2. Open a pull request into `dev`.
3. When merged, QA deploys automatically.
4. Test `https://qa.kashmirijewels.com`.
5. Open a pull request from `dev` to `main`.
6. When merged, production deploys automatically.

## Automation

- `CI` runs on pushes to `dev` and `main`.
- `CI` runs on pull requests targeting `dev` and `main`.
- `Deploy storefront QA` runs on pushes to `dev`, publishes the QA catalog from Google Sheets/Drive,
  builds with generated catalog data, deploys the QA Worker, and verifies `qa.kashmirijewels.com`.
- `Deploy storefront` runs on pushes to `main`, publishes the production catalog from Google
  Sheets/Drive, builds with generated catalog data, deploys the production Worker, and verifies the
  production domains.
- `Deploy Supabase` and `Publish catalog` are manual workflows with an environment selector.

Cloudflare Worker domain routes are managed as one-time infrastructure. Routine CI/CD deployments
publish Worker code only and fail if the configured domain is not reachable after deploy.

## Secret Layout

Keep shared, non-environment-specific secrets at repo level:

```text
CLOUDFLARE_ACCOUNT_ID
CLOUDFLARE_API_TOKEN
```

Keep runtime secrets only inside GitHub environments `qa` and `prod`:

```text
VITE_SUPABASE_URL
VITE_SUPABASE_ANON_KEY
VITE_UMAMI_DOMAINS
VITE_UMAMI_SCRIPT_URL
VITE_UMAMI_WEBSITE_ID
VITE_SANITY_PROJECT_ID
VITE_SANITY_DATASET
VITE_SANITY_API_VERSION
SANITY_READ_TOKEN
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

Do not keep runtime Supabase or Razorpay secrets at repo level after `qa` and `prod` environment secrets are set.

## Branch Protection

After `gh auth login -h github.com`, protect `dev` and `main` so they only change through pull requests.

```bash
gh api \
  --method PUT \
  repos/kashmiri-jewels/website/branches/dev/protection \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=build \
  --field enforce_admins=true \
  --field required_pull_request_reviews[required_approving_review_count]=0 \
  --field required_pull_request_reviews[require_code_owner_reviews]=false \
  --field required_pull_request_reviews[dismiss_stale_reviews]=false \
  --field restrictions=null

gh api \
  --method PUT \
  repos/kashmiri-jewels/website/branches/main/protection \
  --field required_status_checks[strict]=true \
  --field required_status_checks[contexts][]=build \
  --field enforce_admins=true \
  --field required_pull_request_reviews[required_approving_review_count]=0 \
  --field required_pull_request_reviews[require_code_owner_reviews]=false \
  --field required_pull_request_reviews[dismiss_stale_reviews]=false \
  --field restrictions=null
```

This keeps friction low: no mandatory reviewer, but direct pushes are blocked and CI must pass.

## Supabase Environments

Use separate Supabase environments for QA and production. The simplest reliable setup is two Supabase projects:

- `kashmiri-jewels-shop` for production.
- `kashmiri-jewels-shop-qa` for QA.

Supabase hosted projects have one main Postgres database per project. You can isolate QA and production inside
one project with schemas or Supabase Branching, but it is not the simplest operational setup for this shop:

- Auth, Storage, Edge Functions, API keys, and function secrets are environment-level concerns.
- Payment webhooks and shipping integrations need hard separation.
- Using schemas would require app-level schema routing and extra migration discipline.
- Supabase Branching creates separate environments and credentials, but it is not included in the Free plan.

For this project, two Supabase projects keep QA test keys and production live keys clearly separated while the
same migration files and Google Sheet drive both.
