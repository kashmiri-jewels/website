# Neonfold Style Adoption Plan

## Goal

Adopt the visual and interaction quality of the Neonfold storefront while keeping Kashmiri Jewels' brand
palette:

- Primary Navy: `#1C2E4A`
- Pearl White: `#F4F2ED`
- Soft Silver: `#C9C7C3`
- Dusty Blush: `#D8B7B1`

This should be a layout, structure, spacing, transition, and typography upgrade, not a brand-color
replacement. The goal is to use Neonfold's storefront discipline without copying its exact hero
composition.

## References Reviewed

- Live reference: `https://qa.neonfold.com/`
- Live shop reference: `https://qa.neonfold.com/shop`
- Neonfold local repo: `/Users/optimus/Developer/overnight/ecom`
- Current Kashmiri Jewels local app: `http://localhost:3000/` and `http://localhost:3000/products`

Key Neonfold files reviewed:

- `apps/storefront/src/app/globals.css`
- `apps/storefront/src/components/site/site-header.tsx`
- `apps/storefront/src/features/home/home-hero-section.tsx`
- `apps/storefront/src/features/home/home-product-sections.tsx`
- `apps/storefront/src/features/home/home-fit-support-section.tsx`
- `apps/storefront/src/features/products/product-listing.tsx`
- `apps/storefront/src/features/products/product-listing-layout.tsx`
- `apps/storefront/src/features/products/product-card.tsx`
- `apps/storefront/src/features/products/product-gallery.tsx`

Key Kashmiri Jewels files reviewed:

- `src/styles.css`
- `src/components/layout/SiteHeader.tsx`
- `src/components/home/HomeHero.tsx`
- `src/components/home/HomeCategoryTiles.tsx`
- `src/components/home/HomeImageStory.tsx`
- `src/components/home/HomeNewArrivals.tsx`
- `src/components/product/ProductCard.tsx`
- `src/components/product/ProductGrid.tsx`
- `src/components/product/ProductFilters.tsx`
- `src/components/product/ProductResultsHeader.tsx`
- `src/routes/index.tsx`
- `src/routes/products.tsx`
- `src/routes/products_.$slug.tsx`

## What Makes Neonfold Feel Better

### 1. Strong Layout Structure, Not Decorative Layout

Neonfold uses fewer but stronger layout decisions:

- Product sections use bordered headers and large headings instead of decorative cards.
- Imagery is edge-to-edge inside its frame, with minimal radius and minimal overlays.
- Product grids feel like a lookbook/catalog spread: consistent `4/5` image ratios, tight metadata,
  and hover actions that stay quiet until needed.
- Gaps are intentional and repeated: large section padding, modest grid gutters, and tight product
  metadata spacing.
- Transitions are subtle: short reveal motion, slow image hover scale, and restrained hover states.

Current Kashmiri Jewels has good information density, but it often feels more like a component showcase:

- Multiple rounded pills, cards, shadows, and badges compete for attention.
- Hero content and gallery are more complex than needed for the desired direction.
- Product cards have more chrome than the product imagery needs.
- Filters are always visible on desktop, which makes the collection page feel more utility-heavy
  than editorial.

### 2. Stronger Typography Hierarchy

Neonfold uses `Instrument Serif` for display headings and `Geist` for navigation, body copy, and
commerce details.

Kashmiri Jewels should use the same font pairing, self-hosted from the local Neonfold-generated WOFF2
assets. The Tailwind `font-serif` token carries the same role Neonfold's `font-heading` carries,
while `font-sans` maps to Geist.

### 3. Squared Commerce Controls

Neonfold mostly uses square or barely rounded controls:

- Buttons are `rounded-none`.
- Product cards and galleries are square-edged.
- Filter chips are bordered rectangles.
- Icon buttons use familiar symbols with restrained styling.

Kashmiri Jewels currently uses many rounded pills. That reads friendlier, but less premium and less aligned
with Neonfold.

### 4. Fixed Header and Centered Brand

Neonfold's header is fixed, translucent, and centered around the brand name:

- Announcement strip on top.
- Left-side desktop navigation.
- Center brand wordmark.
- Right-side actions.

Kashmiri Jewels' current header is sticky, left-branded with a logo mark, and more compact/e-commerce
utility styled. It works, but it does not set the same premium first impression.

### 5. Product Listing Flow

Neonfold's shop page leads with:

- Big editorial title and description.
- Horizontal category navigation.
- Count and selected filters.
- Desktop filter rail.
- Four-column product grid on large screens.

Kashmiri Jewels' shop page currently leads with:

- Heading and description.
- Persistent left filter rail.
- Three-column large-screen product grid.

The current structure is usable, but it feels like a filter interface first and a collection second.

## Kashmiri Jewels Design Direction

### Keep

- Keep the existing Kashmiri Jewels colors and semantic token names.
- Keep current product data, routing, cart, checkout, search, fit helper, and analytics behavior.
- Keep the Kashmiri Jewels product categories and voice.
- Keep responsive product images and current product image helper APIs.

### Change

- Move from rounded, card-heavy styling to squared editorial commerce styling.
- Make product imagery the main visual surface.
- Use `Instrument Serif` for major page and section headings.
- Use `Geist` for body copy, navigation, forms, filters, product metadata, and utility labels.
- Use a consistent type scale:
  - Hero: large but controlled banner heading.
  - Section headings: large serif display, smaller than hero.
  - Product metadata: compact sans text.
  - Utility labels: small uppercase tracking.
- Standardize spacing:
  - Large vertical section padding.
  - Bordered section headers.
  - Consistent product grid gutters.
  - Tighter text stacks inside cards/panels.
- Standardize transitions:
  - 120-180ms UI hover/focus transitions.
  - 300-500ms image hover scale.
  - Optional small reveal animation for section entrance.
- Reduce badges, shadows, pills, and nested surfaces.
- Promote category navigation and collection story before filters.
- Keep filters persistent on desktop per the current Kashmiri Jewels direction, and drawer-based on mobile.
- Increase grid density to `2` columns on mobile/tablet and `4` columns on large screens where
  product imagery supports it.

### Hero-Specific Direction

Do not use Neonfold's exact image-led split hero for Kashmiri Jewels. Replace the current multi-image hero
with a simple banner-based hero:

- One full-width banner area.
- Text and CTAs placed over or beside the banner depending on image availability.
- No three-image collage.
- No fancy staggered product layout.
- One primary CTA and one secondary CTA.
- Clear first-viewport hierarchy:
  - Kashmiri Jewels / campaign headline.
  - Short supporting copy.
  - Shop action.
- After the hero, keep the rest of the homepage structure close to Neonfold's section system:
  - Bordered value strip.
  - Editorial section headers.
  - Image-led category/story sections.
  - Clean product grids.
  - Minimal card chrome.

## Proposed Implementation Plan

### Phase 1: Global Design Foundation

Files:

- `src/styles.css`
- `src/components/layout/SiteHeader.tsx`
- `src/components/layout/MobileBottomNav.tsx`

Work:

- Keep color values unchanged, but clarify their usage:
  - `--color-primary` / `--color-ink`: navy
  - `--color-surface`: pearl white
  - `--color-line-strong`: soft silver
  - `--color-blush`: dusty blush
- Replace the old helper-class typography with Tailwind `font-serif` / `font-sans` utilities backed
  by the Neonfold font files.
- Keep layout changes in component class names and Tailwind theme tokens only; do not introduce
  `@apply` utilities.
- Reduce default button roundness for primary and secondary fashion buttons.
- Convert header to a Neonfold-style structure:
  - Announcement strip.
  - Centered brand.
  - Desktop navigation left.
  - Actions right.
  - Fixed or sticky behavior to be decided after visual QA. Fixed matches Neonfold, sticky is less
    risky for Kashmiri Jewels' current route structure.

Risk:

- Changing the global font tokens affects many headings and commerce controls at once. This should
  be reviewed on product, checkout, admin, and modal surfaces before finalizing.

### Phase 2: Homepage Restructure

Files:

- `src/routes/index.tsx`
- `src/components/home/HomeHero.tsx`
- `src/components/home/HomeTrustBar.tsx`
- `src/components/home/HomeCategoryTiles.tsx`
- `src/components/home/HomeImageStory.tsx`
- `src/components/home/HomeNewArrivals.tsx`
- `src/components/home/HomeBenefits.tsx`

Work:

- Rebuild the hero as a simple banner, not a product collage:
  - One banner visual or solid brand-color/pearl composition.
  - Large but readable headline.
  - Short copy.
  - Primary and secondary CTA.
  - No stacked/staggered product-image layout.
- Move the hero trust signals into a bordered value strip below the hero, similar to Neonfold.
- Convert "Shop by style" into a tighter three-tile editorial row with minimal overlays.
- Replace repeated card-like sections with bordered full-width bands.
- Turn `HomeImageStory` into a fit/story section:
  - One wide image.
  - One large heading.
  - Short copy.
  - One clear action.
- Keep best sellers and new arrivals, but format headers like Neonfold:
  - Large serif heading.
  - Description.
  - Underlined text link.
  - Product grid below.

Risk:

- The current mock product images are returning local 404s under `/mock-products/...`. Layout QA will
  be unreliable until product image assets are available locally or placeholders are restored.

### Phase 3: Product Listing Upgrade

Files:

- `src/routes/products.tsx`
- `src/components/product/ProductResultsHeader.tsx`
- `src/components/product/ProductFilters.tsx`
- `src/components/product/ProductGrid.tsx`
- `src/components/product/ProductCard.tsx`

Work:

- Move collection title and description into a larger editorial intro.
- Add horizontal category navigation above the grid.
- Keep desktop filters persistent and visually quiet instead of toggle-driven.
- Keep mobile filters as a drawer, but align drawer styling with Neonfold: left-side, square-edged,
  bordered panel.
- Update active filter chips from rounded pills to bordered rectangular chips.
- Change grid to:
  - `grid-cols-2` by default.
  - `lg:grid-cols-4` on large screens.
- Simplify product cards:
  - `aspect-[2/3]` image for the current Kashmiri Jewels catalog so full outfits are less likely to crop.
  - No card shell.
  - Minimal tags.
  - Quick look appears on hover.
  - Metadata below image with category, title, and price.

Risk:

- Four columns may be too dense if Kashmiri Jewels' product photography is lower resolution or inconsistent.
  Validate with real catalog images before locking it in.

### Phase 4: Product Detail Page

Files:

- `src/routes/products_.$slug.tsx`
- `src/components/product/ProductGallery.tsx`
- `src/components/product/ProductPurchasePanel.tsx`
- `src/components/product/ProductQuickLook.tsx`
- `src/components/product/ProductReasons.tsx`

Work:

- Keep the two-column product detail structure, but make it cleaner:
  - Larger serif product title.
  - Bordered sections instead of cards.
  - Square gallery thumbnails and viewer controls.
  - Remove rounded badges where possible.
- Align the assurance block with Neonfold's three-item row.
- Make related products use the same updated `ProductCard`.
- Keep Kashmiri Jewels' size chart and fit-confidence helper, but present them in flatter bordered rows.

Risk:

- Product purchase interactions are higher risk than homepage styling. Do this after the global and
  listing changes are stable.

### Phase 5: Checkout, Cart, and Admin Cleanup

Files:

- `src/routes/checkout.tsx`
- `src/components/cart/*`
- `src/components/checkout/*`
- `src/routes/admin.tsx`
- `src/components/admin/*`

Work:

- Apply only the global language where appropriate:
  - Square controls.
  - Less shadow.
  - Consistent headings.
  - Bordered panels.
- Keep checkout highly utilitarian. Do not over-editorialize conversion-critical steps.
- Admin can remain denser and more operational, but should inherit the typography and button polish.

Risk:

- Checkout styling changes can affect conversion and mobile usability. Keep this phase constrained.

## Acceptance Criteria

- The Kashmiri Jewels palette remains unchanged.
- Homepage first viewport has one clear banner-led campaign story.
- Header feels premium and aligned with Neonfold's structure.
- Product listing reads as a collection page before it reads as a filter tool.
- Product cards are image-led, consistent, and less chrome-heavy.
- Mobile layout has no text overlap, horizontal overflow, or hidden critical actions.
- Existing cart, quick look, filters, checkout, and analytics behavior still works.
- `pnpm typecheck` and `pnpm build` pass after implementation.
- Browser QA covers:
  - Home desktop and mobile.
  - Products desktop and mobile.
  - Product detail desktop and mobile.
  - Cart drawer.
  - Quick look.
  - Checkout first step.

## Current Implementation Audit

Last local visual audit: `2026-05-31`.

Evidence collected:

- Home desktop and mobile screenshots: simple banner hero, fixed header, mobile bottom navigation,
  editorial section headers, and 2-column mobile flow render without obvious overlap.
- Products desktop and mobile screenshots: editorial intro, horizontal category navigation,
  persistent desktop filter rail, mobile filter trigger, 4-column desktop grid, and 2-column mobile
  grid render with the current catalog images.
- Product detail desktop and mobile screenshots: two-column desktop product page, mobile gallery,
  sticky mobile purchase bar, round expand control, and round magnifier render correctly.
- Quick look desktop interaction: backdrop is present, body scroll is locked, modal opens, and the
  product image uses `contain` so the full item can be inspected.
- Checkout desktop screenshot: bordered checkout form, order summary, typography, and spacing match
  the new restrained commerce language.
- Cart drawer mobile screenshot: drawer opens from the bag action, quantity controls and totals fit
  cleanly, and the checkout action stays visible without overlap.
- Checkout mobile screenshot: order summary is compact below the `sm` breakpoint, the duplicate final
  total is removed from the summary, and the sticky Pay bar carries the payable total without covering
  summary content.
- Admin desktop and mobile screenshots: metrics, tabs, responsive order cards, and action panels keep
  the same restrained panel language with no page-level horizontal overflow locally.
- Static source check: no `@apply` rules are present.
- Secondary surfaces source pass: add-to-bag toast, route boundaries, checkout confirmation, empty
  catalog, style finder, and fit helper now use the same squared controls, focus rings, and
  150ms interaction timing.

Open audit items before calling the full goal complete:

- Re-run `pnpm typecheck` and `pnpm build` after the final layout pass.
- Verify admin on QA after Cloudflare Access/email delivery is working; the local admin page renders
  and has been visually checked, but the protected QA route remains externally gated.
- Re-run admin screenshots after the latest admin layout polish. The route returns `200` locally and
  build checks pass, but the browser transport was unavailable during this pass.
- Re-run screenshots for secondary surfaces after the latest polish pass. SSR route checks passed,
  but add-to-bag toast and modal surfaces still need interactive browser verification.
- Re-check production/QA pages after deployment because live product images and CDN behavior are part
  of the visual result.

## Recommended First Build Slice

Do this first because it provides the most visible improvement with manageable risk:

1. Global typography, spacing, transition, button, and header language.
2. Simple banner hero and value strip.
3. ProductCard and ProductGrid.
4. Products page intro/category/filter layout.

Defer product detail, checkout, cart, and admin until the first slice is reviewed visually.
