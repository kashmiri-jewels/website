# Product Catalog

Products are managed by the shop owner in Google Sheets. Product images are managed in Google
Drive folders. The storefront catalog is published through the `Publish catalog` GitHub Actions
workflow or through the `/admin` page action that dispatches that workflow.

Do not edit generated catalog files by hand. The repository does not track generated product data,
catalog sync payloads, image manifests, owner spreadsheets, or product images. Real catalog files
are produced during the publish workflow from Google Sheets and Google Drive.

## Owner Sources

Catalog data:

```text
Google Sheets -> Products tab
```

Product images:

```text
Google Drive root folder
  product_id/
    01-front.jpg
    02-close.jpg
    03-side.jpg
```

The Google Drive root folder ID is environment-specific and belongs in GitHub environment variable
`GOOGLE_DRIVE_IMAGE_FOLDER_ID`.

## Required Sheet Columns

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

- `product_id`: stable owner-managed product ID. It must not change after publishing.
- `active`: `yes`, `true`, or `1` makes the product visible and purchasable when stock allows it.
- `images`: optional for the normal workflow. Leave it blank to use the matching Google Drive
  product folder. Fill it only when a product needs explicit image ordering by filename.
- `sizes`: comma-separated sizes, such as `S, M, L, XL`.
- `stock`: stock map, such as `S:2, M:4, L:1`.
- `restock`: exact replacement stock map for existing variants, such as `M:8`.
- `size_chart`: semicolon-separated rows such as
  `M: Bust=38 in, Length=27 in; L: Bust=40 in, Length=28 in`.
- `featured`: `yes`, `true`, or `1` marks the product for homepage merchandising.

## Image Rules

- Product image folder name must exactly match `product_id`.
- Active products must have at least one supported image.
- Supported extensions: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`.
- Filename order controls gallery order. Prefer `01-front.jpg`, `02-close.jpg`, and so on.
- Files without a supported image extension are ignored with a workflow warning.
- Active products without supported images are skipped with a workflow warning.
- Image sync computes a content hash and uploads only missing optimized WebP variants to Cloudflare R2.
- Generated storefront images include `400w`, `800w`, and `1200w` variants for responsive loading.
- Storefront image URLs are generated from the environment's `PRODUCT_IMAGE_PUBLIC_BASE_URL`.

## Publishing

Use one action for owner catalog updates:

```text
Publish catalog
```

It performs:

```text
read Google Sheets
read Google Drive images
generate catalog JSON
validate generated image URLs against the configured media host
upload new/changed images to R2
sync Supabase products and variants
build/prerender public storefront pages
deploy through Cloudflare Workers
```

This is push-based. There is no scheduled sync and no interval-based regeneration.

## Developer Commands

These commands are for validation and CI/CD jobs. They are not local deployment commands.

```bash
pnpm prepare:generated
pnpm sync:images:manifest
pnpm sync:images:r2
pnpm sync:images:r2:upload
pnpm sync:products
pnpm validate:catalog-assets
pnpm publish:catalog
```

`pnpm prepare:generated` only creates local empty generated files when missing so non-publish
typecheck/build jobs can run. It does not add catalog data to Git and does not overwrite real
generated catalog files created by publish.

`pnpm publish:catalog` requires environment-specific Google, R2, Supabase, and Cloudflare
configuration. It should normally run inside GitHub Actions.

## More Detail

See [Catalog Publish Workflow](./catalog-publish-workflow.md).
