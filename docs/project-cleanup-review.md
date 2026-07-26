# Project Cleanup Review

This document tracks the current repository cleanup and restructuring baseline.

## Current Structure

```text
.github/workflows/     CI/CD and operational GitHub Actions
docs/                  Setup, operations, catalog, deployment, and integration notes
public/                Static brand/browser assets only
scripts/               Catalog, image, validation, and Supabase sync scripts
shared/                Cross-runtime TypeScript helpers and shared schemas
src/                   TanStack Start storefront and admin UI
supabase/              Database migrations and Edge Functions
```

## Source-of-Truth Boundaries

- Product data lives in Google Sheets.
- Product images live in Google Drive and are published to Cloudflare R2.
- Generated catalog JSON and image manifests are local/CI artifacts and are not tracked in Git.
- Runtime secrets stay in GitHub environments, Supabase secrets, Cloudflare, or local ignored files.
- `dev` deploys QA. `main` deploys production.

## Cleanup Baseline

- Tracked catalog spreadsheets, generated catalog files, and product images are absent from current `dev`.
- `.gitignore` covers local owner data and generated catalog artifacts:
  - `public/Photo/`
  - `public/data.xlsx`
  - `product-images/`
  - `scripts/product-slugs.json`
  - `scripts/seed-products.json`
  - `src/generated/*.json`
- QA and production use the same owner-managed Google Sheet and Drive image root, with environment
  separation handled by Supabase projects, R2 buckets, media hostnames, Worker domains, and
  payment/shipping secrets.
- CI/CD branch conventions are aligned with the current model:
  - pull requests target `dev` or `main`;
  - pushes to `dev` deploy QA;
  - pushes to `main` deploy production.

## Restructuring Notes

Keep future changes incremental:

- Do not introduce a custom product-editing backend unless the Google Sheets workflow becomes a real
  owner bottleneck.
- Keep checkout, payments, shipment creation, and catalog sync as separate operational boundaries.
- Keep large static product assets out of Git.
- Keep admin actions as CI/CD dispatches where deployment or catalog publishing is involved.
- Prefer tightening docs, validation, and fail-fast checks before adding new abstractions.

## Completed Restructuring Baseline

- Checkout route orchestration is separated from checkout domain helpers and presentation
  components.
- Admin route presentation is separated into admin components, with shared admin UI formatting in
  `src/lib/admin-ui.ts`.
- Product listing URL search parsing and result header/chips are separated from the route module.
- Homepage sections are separated into focused components under `src/components/home/`.
- Script runtime helpers, R2 upload/signing helpers, sheet row parsing helpers, and product image
  manifest helpers are separated under `scripts/lib/`.

## React and Route Boundaries

Kashmiri Jewels uses TanStack Start rather than Next.js, but the same React 19 discipline applies:

- Keep route files focused on route orchestration, data loading, and page composition.
- Move repeated or dense UI sections into components under the relevant domain folder.
- Keep browser-only work behind event handlers, effects, or isomorphic client functions.
- Use `useEffect` only to synchronize with external systems such as `localStorage`, browser events,
  timers, scroll state, or third-party scripts.
- Do not wrap cheap pure calculations in `useMemo`; reserve memoization for expensive work or stable
  identity that is needed by child components/hooks.
- Keep server-only code in server-marked modules such as `src/lib/admin.server.ts`.

## Known Follow-Ups

- Merge the local Portless development URL PR separately from this cleanup branch.
- Review any additional large-file splits after this cleanup PR lands; avoid more movement unless a
  concrete change needs it.
- Enable Delhivery in QA only after staging token, pickup location, GST, and HSN values are provided.
- Complete production secrets only after QA publish/deploy and checkout flows are validated.
