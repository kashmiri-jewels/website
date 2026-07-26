# Sanity Storefront Content

Kashmiri Jewels uses Sanity for lightweight storefront content that can be managed by a non-technical editor. Product catalog data, variants, inventory, orders, payments, returns, and shipments stay outside Sanity.

## Sanity Project

Sanity Cloud project:

- Project name: `Kashmiri Jewels Store`
- Project ID: `o4p78bwk`
- QA dataset: `qa`
- Production dataset: `production`

Use `qa` for QA deployments and `production` for production deployments. These datasets are isolated content stores inside the same Sanity project.

Set these environment variables in local development and deployment:

```bash
VITE_SANITY_PROJECT_ID=o4p78bwk
VITE_SANITY_DATASET=qa
VITE_SANITY_API_VERSION=2026-06-16
SANITY_STUDIO_PROJECT_ID=o4p78bwk
SANITY_STUDIO_DATASET=qa
SANITY_READ_TOKEN=
SANITY_WRITE_TOKEN=
```

The `VITE_` variables select the Sanity project and dataset at build time. The storefront reads generated JSON at runtime. `SANITY_READ_TOKEN` is used only during build-time sync if the dataset is not publicly readable. The `SANITY_STUDIO_` variables are used by Sanity Studio.

If `VITE_SANITY_PROJECT_ID` is not set, the storefront still builds with local fallback content and `/blog` shows an empty state.

Set `SANITY_VALIDATE_REQUIRED_CONTENT=true` when you want CI to fail if required singleton documents or static pages are missing. Keep it unset while first deploying the schema/code before the editorial documents have been created; the storefront will use local fallback content and still perform no runtime Sanity reads. This validation is explicit opt-in and is not enabled automatically by `CI`, `GITHUB_ACTIONS`, or `CLOUDFLARE_ENV`.

## Storefront Rendering

Storefront content is fetched from Sanity during `pnpm prepare:generated`, which runs before typecheck and build. The script writes ignored generated data to:

- `src/generated/blog-posts.json`
- `src/generated/site-content.json`

The storefront imports those JSON files instead of calling Sanity from route loaders.

This matters for TanStack Start because route loaders can run on the server for initial SSR and in the browser during client navigation. Keeping Sanity reads in the build-time sync avoids exposing tokens and avoids hitting the CMS on every page view.

The build prerenders the storefront and uses link crawling to discover linked static pages, products, and blog detail pages. When content changes in Sanity, trigger a QA or production rebuild through a Sanity webhook.

## Content Types

Sanity manages:

- `siteSettings`: announcement bar, header/footer links, footer copy, social links, trust cards, and SEO defaults.
- `homePage`: hero slides, homepage CTA labels/links, and fixed-section headings/copy.
- `staticPage`: `about`, `contact`, `shipping-returns`, `terms`, and `privacy`.
- `blogPost`: posts for `/blog` and `/blog/$slug`.

New content images should use external Cloudflare/R2/CDN URLs plus alt text. Existing blog posts that still use Sanity image assets are supported as a temporary fallback.

## Seed Sample Posts In Sanity Cloud

Create a write token in Sanity and set it locally:

```bash
SANITY_WRITE_TOKEN=...
```

Then seed QA:

```bash
SANITY_STUDIO_DATASET=qa pnpm sanity:seed-blog
```

This creates or updates three sample `Blog post` documents in the `qa` dataset and uploads local cover images as Sanity assets.

## Local Studio

Run:

```bash
pnpm studio:dev
```

The Studio is configured with site settings, homepage content, static pages, and blog posts. Editors can manage storefront copy, links, external image URLs, rich static-page content, blog title/slug/excerpt/category/author/publish date, and SEO fields.

## Studio Deployment

Sanity Studio can be deployed with:

```bash
pnpm studio:deploy
```

Use a Studio hostname like `kashmiri-jewels-blog` or similar. The hosted Studio is separate from the storefront and does not require hosting a CMS server.

## Publishing Flow

Recommended flow:

1. Editor creates or updates content in Sanity.
2. Editor publishes the post.
3. Sanity webhook triggers the storefront deploy workflow.
4. The storefront rebuilds generated JSON and prerendered pages.

The storefront reads only published posts where `publishedAt <= now()`.

## Webhook

Create a Sanity webhook for create/update/delete/publish events on these document types:

- `siteSettings`
- `homePage`
- `staticPage`
- `blogPost`

Point it to GitHub's repository dispatch API for the target environment:

- QA event type: `sanity-content-qa`
- Production event type: `sanity-content-production`

The deploy workflows listen for those event types, rebuild generated JSON, and deploy the existing storefront. Sanity webhooks should trigger rebuilds only; customer requests must not perform live Sanity API reads.

Keep the webhook secret in the deployment provider, not in Sanity document content.
