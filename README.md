# Kashmiri Jewels

Jewellery storefront built with TanStack Start, Tailwind CSS v4, Base UI, Supabase, and Cloudflare.

## Getting Started

To run this application:

```bash
pnpm install
pnpm dev
```

## Building

To build this application:

```bash
pnpm build
```

## Deployment

The storefront deploys through GitHub Actions to Cloudflare Workers. Public catalog pages are
prerendered during build where possible; admin, checkout, payment, and ops flows stay runtime.

See `docs/deployment.md` for Wrangler config, GitHub Actions, and secret boundaries.

## Catalog Publishing

Products are managed in Google Sheets. Product images are managed in Google Drive and published to
Cloudflare R2. Use the GitHub Actions `Publish catalog` workflow, or the protected `/admin`
`Publish catalog` action, to publish product changes.

See `docs/catalog.md` and `docs/catalog-publish-workflow.md`.

## Search

Product search uses a local Orama index over the generated catalog.

See `docs/search.md` for the search architecture.

## Payments

Razorpay checkout uses server routes for order creation, payment verification, and webhook signature validation.

See `docs/razorpay.md` for required environment variables and launch notes.

## Styling

This project uses [Tailwind CSS](https://tailwindcss.com/) for styling.

## Routing

This project uses [TanStack Router](https://tanstack.com/router) with file-based routing. Routes are managed as files in `src/routes`.
