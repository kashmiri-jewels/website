import { Accordion } from '@base-ui/react/accordion'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ChevronDown } from 'lucide-react'
import { useEffect, useState } from 'react'

import { ProductGallery } from '../components/product/ProductGallery'
import { ProductCard } from '../components/product/ProductCard'
import { ProductPurchasePanel } from '../components/product/ProductPurchasePanel'
import {
  RecentlyViewedRail,
  rememberRecentlyViewedProduct,
} from '../components/product/RecentlyViewed'
import { getProductBySlug, getProductGroupVariants, products } from '../data/products'
import { formatPrice } from '../lib/format'
import { createPageMeta, createProductJsonLd } from '../lib/seo'

export const Route = createFileRoute('/products_/$slug')({
  loader: ({ params }) => {
    const product = getProductBySlug(params.slug)

    if (!product) {
      throw notFound()
    }

    return { product }
  },
  head: ({ params }) => {
    const product = getProductBySlug(params.slug)

    if (!product) {
      return createPageMeta({
        title: 'Product not found | Kashmiri Jewels',
        description: 'This Kashmiri Jewels product is unavailable.',
        path: '/products',
      })
    }

    const seo = createPageMeta({
      title: `${product.title} | Kashmiri Jewels`,
      description: product.description,
      path: `/products/${product.slug}`,
      image: product.images[0],
      type: 'product',
    })

    return {
      ...seo,
      meta: [
        ...seo.meta,
        { property: 'product:price:amount', content: String(product.sellingPricePaise / 100) },
        { property: 'product:price:currency', content: 'INR' },
      ],
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify(createProductJsonLd(product)),
        },
      ],
    }
  },
  component: ProductPreviewPage,
})

function ProductPreviewPage() {
  const { product } = Route.useLoaderData()
  const productVariants = getProductGroupVariants(product)
  const relatedProducts = products
    .filter(
      (item) =>
        item.category === product.category && item.variantId !== product.variantId,
    )
    .slice(0, 4)
  const detailAttributes = product.attributes.filter((attribute) => attribute.section === 'details')
  const disclosureAttributes = product.attributes.filter((attribute) => attribute.section === 'disclosure')

  useEffect(() => {
    rememberRecentlyViewedProduct(product)
  }, [product])

  return (
    <main className="px-4 pb-28 pt-8 sm:px-6 sm:pt-10 lg:px-8 lg:pb-14 lg:pt-4">
      <div className="mx-auto max-w-[90rem]">
        <section className="grid gap-10 lg:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)] xl:gap-14">
          <div className="min-w-0 max-w-full lg:sticky lg:top-28 lg:self-start">
            <ProductGallery product={product} imageFit="contain" />
          </div>

          <div className="min-w-0">
            <nav
              aria-label="Product breadcrumb"
              className="mb-6 flex min-w-0 flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]"
            >
              <Link to="/products" className="transition hover:text-[var(--color-ink)]">
                Shop
              </Link>
              <span aria-hidden="true">/</span>
              <span className="min-w-0 break-words text-[var(--color-ink)]">
                {product.title}
              </span>
            </nav>

            <section>
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-medium text-[var(--color-muted)]">{product.categoryLabel}</p>
                {product.tag ? (
                  <p className="bg-[var(--color-surface)] px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--color-primary)]">
                    {product.tag}
                  </p>
                ) : null}
                {product.stockAvailable <= 0 ? (
                  <p className="bg-[var(--color-blush-surface)] px-2.5 py-1 text-[0.6875rem] font-medium uppercase tracking-[0.12em] text-[var(--color-accent-muted)]">
                    Sold out
                  </p>
                ) : null}
              </div>
              <h1 className="mt-3 min-w-0 break-words font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-6xl [overflow-wrap:anywhere]">
                {product.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-2">
                <p className="text-2xl font-medium leading-tight text-[var(--color-primary)]">
                  {formatPrice(product.sellingPricePaise)}
                </p>
                {product.discountPercent > 0 ? (
                  <>
                    <p className="text-sm text-[var(--color-muted)] line-through">
                      {formatPrice(product.mrpPaise)}
                    </p>
                    <p className="border border-[var(--color-primary)]/20 bg-[var(--color-primary)]/5 px-2 py-1 text-xs font-medium uppercase text-[var(--color-primary)]">
                      {product.discountPercent}% off
                    </p>
                  </>
                ) : null}
              </div>
            </section>

            {productVariants.length > 1 ? (
              <section className="mt-6">
                <div className="flex items-baseline gap-2">
                  <p className="text-sm font-medium text-[var(--color-ink)]">Color</p>
                  {product.color ? (
                    <p className="text-sm text-[var(--color-muted)]">{product.color}</p>
                  ) : null}
                </div>
                <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
                  {productVariants.map((variant) => (
                    <Link
                      key={variant.variantId}
                      to="/products/$slug"
                      params={{ slug: variant.slug }}
                      aria-current={variant.variantId === product.variantId ? 'page' : undefined}
                      className={`relative aspect-[4/5] w-16 shrink-0 overflow-hidden border bg-[var(--color-surface)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 ${
                        variant.variantId === product.variantId
                          ? 'border-[var(--color-primary)]'
                          : 'border-transparent hover:border-[var(--color-line)]'
                      }`}
                    >
                      <img
                        src={variant.images[0]}
                        alt={variant.color ?? variant.title}
                        className="h-full w-full object-cover text-transparent"
                        loading="lazy"
                      />
                    </Link>
                  ))}
                </div>
              </section>
            ) : null}

            <div id="buy-panel" className="mt-7 scroll-mt-24">
              <ProductPurchasePanel product={product} showPrice={false} />
            </div>

            {detailAttributes.length > 0 || disclosureAttributes.length > 0 ? (
              <Accordion.Root
                defaultValue={['product-details']}
                className="mt-7 divide-y divide-[var(--color-line)]"
              >
                {detailAttributes.length > 0 ? (
                  <AttributeAccordionItem
                    value="product-details"
                    title="Product Details"
                    attributes={detailAttributes}
                    description={product.description}
                    initialVisibleCount={5}
                  />
                ) : null}
                {disclosureAttributes.length > 0 ? (
                  <AttributeAccordionItem
                    value="product-disclosure"
                    title="Product Disclosure"
                    attributes={disclosureAttributes}
                  />
                ) : null}
              </Accordion.Root>
            ) : null}

            {product.sizeChart.length > 0 ? (
              <div id="size-chart" className="mt-8 scroll-mt-24">
                <h2 className="text-sm font-medium text-[var(--color-ink)]">Size chart</h2>
                <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                  Measurements are garment measurements. Pick your usual size for a regular fit.
                </p>
                <div className="mt-4 overflow-hidden border border-[var(--color-line)] bg-[var(--color-paper)]">
                  <table className="w-full text-left text-sm">
                    <tbody>
                      {product.sizeChart.map((row) => (
                        <tr
                          key={row.size}
                          className="border-b border-[var(--color-line)] last:border-b-0"
                        >
                          <th className="w-20 bg-[var(--color-surface)] px-4 py-3 font-medium text-[var(--color-ink)]">
                            {row.size}
                          </th>
                          <td className="px-4 py-3 text-[var(--color-muted)]">
                            {Object.entries(row.measurements)
                              .map(([label, value]) => `${label}: ${value}`)
                              .join(' / ')}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            ) : null}
          </div>
        </section>

        {relatedProducts.length > 0 ? (
          <section className="mt-14">
            <div className="flex items-end justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-[var(--color-muted)]">Keep browsing</p>
                <h2 className="mt-2 font-serif text-5xl font-normal leading-none text-[var(--color-ink)]">
                  More from this edit
                </h2>
              </div>
              <Link
                to="/products"
                search={{ category: product.category }}
                className="text-sm font-medium text-[var(--color-ink)] underline-offset-4 transition hover:underline"
              >
                View edit
              </Link>
            </div>
            <div className="mt-7 grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
              {relatedProducts.map((item) => (
                <ProductCard key={item.variantId} product={item} />
              ))}
            </div>
          </section>
        ) : null}

        <RecentlyViewedRail
          excludeProductId={product.variantId}
          limit={4}
          className="mt-14"
          title="Recently viewed"
        />

      </div>
    </main>
  )
}

const accordionPanelClass =
  'h-[var(--accordion-panel-height)] overflow-hidden text-sm leading-6 text-[var(--color-muted)] transition-[height,opacity] duration-200 ease-out data-[ending-style]:h-0 data-[ending-style]:opacity-0 data-[starting-style]:h-0 data-[starting-style]:opacity-0'

function AttributeAccordionItem({
  attributes,
  description,
  initialVisibleCount,
  title,
  value,
}: {
  attributes: Array<{ label: string; value: string }>
  description?: string
  initialVisibleCount?: number
  title: string
  value: string
}) {
  const [expanded, setExpanded] = useState(false)
  const visibleCount = expanded || !initialVisibleCount
    ? attributes.length
    : Math.min(initialVisibleCount, attributes.length)
  const visibleAttributes = attributes.slice(0, visibleCount)
  const hiddenCount = attributes.length - visibleCount

  return (
    <Accordion.Item value={value}>
      <Accordion.Header>
        <Accordion.Trigger className="group flex w-full items-center justify-between py-4 text-left text-sm font-medium text-[var(--color-ink)] outline-none transition duration-150 ease-out hover:text-[var(--color-primary)] focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2">
          {title}
          <ChevronDown
            className="size-4 text-[var(--color-muted)] transition duration-150 ease-out group-data-panel-open:rotate-180"
            aria-hidden="true"
          />
        </Accordion.Trigger>
      </Accordion.Header>
      <Accordion.Panel className={accordionPanelClass}>
        <div className="pb-4">
          {description ? (
            <p className="whitespace-pre-line pb-4 text-sm leading-6 text-[var(--color-muted)]">
              {description}
            </p>
          ) : null}
          <dl className="divide-y divide-[var(--color-line)]">
          {visibleAttributes.map((attribute) => (
            <div
              key={attribute.label}
              className="grid grid-cols-[minmax(8rem,0.4fr)_1fr] gap-4 py-3 text-sm"
            >
              <dt className="text-[var(--color-muted)]">{attribute.label}</dt>
              <dd className="whitespace-pre-line text-[var(--color-ink)]">{attribute.value}</dd>
            </div>
          ))}
          </dl>
          {hiddenCount > 0 || expanded ? (
            <button
              type="button"
              onClick={() => setExpanded((current) => !current)}
              className="mt-3 text-sm font-medium text-[var(--color-primary)] underline-offset-4 transition hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              {expanded ? 'Show less' : `Show more${hiddenCount > 0 ? ` (${hiddenCount})` : ''}`}
            </button>
          ) : null}
        </div>
      </Accordion.Panel>
    </Accordion.Item>
  )
}
