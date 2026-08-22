# Product Catalog

Products are managed by the shop owner in Google Sheets. The urgent production setup uses one
simple tab named `Products`, with image links pasted directly into the `images` column. R2 image
optimization can still be added later.

Do not edit generated catalog files by hand. The repository does not track generated product data,
catalog sync payloads, image manifests, owner spreadsheets, or product images. Real catalog files
are produced during the publish workflow from Google Sheets and Google Drive.

## Owner Sources

Catalog data:

```text
Google Sheets -> Products tab
```

Product images can be Google Drive file share links, Cloudflare R2 URLs, or any public image URL.

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
size_chart
featured
```

Column notes:

- `product_id`: stable owner-managed product ID. It must not change after publishing.
- `active`: `yes`, `true`, or `1` makes the product visible and purchasable when stock allows it.
- `images`: one or more image links. Use commas, pipes, or new lines for multiple images.
- `sizes`: comma-separated sizes, such as `One Size` or `S, M, L, XL`.
- `stock`: either one number such as `5`, or a stock map such as `S:2, M:4, L:1`.
- `size_chart`: semicolon-separated rows such as
  `M: Bust=38 in, Length=27 in; L: Bust=40 in, Length=28 in`.
- `featured`: `yes`, `true`, or `1` marks the product for homepage merchandising.

Optional helpful columns:

```text
variant_id
sku
brand
color
material
occasion
hsn
tax_code
min_order_quantity
length_cm
breadth_cm
height_cm
weight_kg
```

## Publishing

The Cloudflare build automatically reads Google Sheets when these build variables are configured:

```text
GOOGLE_SHEETS_SPREADSHEET_ID
GOOGLE_SERVICE_ACCOUNT_JSON
GOOGLE_SHEETS_RANGE=Products!A1:Z
```

After editing the sheet, use Cloudflare `Deployments -> Retry build`.

## Developer Commands

These commands are for validation and CI/CD jobs. They are not local deployment commands.

```bash
pnpm prepare:generated
pnpm sync:products
```

`pnpm prepare:generated` only creates local empty generated files when missing so non-publish
typecheck/build jobs can run. It does not add catalog data to Git and does not overwrite real
generated catalog files created by publish.

Use `docs/product-catalog-template.csv` as the quickest template for the Google Sheet columns.

## More Detail

See [Catalog Publish Workflow](./catalog-publish-workflow.md).
