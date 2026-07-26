import { Button } from '@base-ui/react/button'
import { Link } from '@tanstack/react-router'

import type { Product } from '../../data/products'
import { formatPrice } from '../../lib/format'
import { getProductImageProps } from '../../lib/product-images'
import type { HomePageContent } from '../../lib/storefront-content'

type HomeNewArrivalsProps = {
  collageProducts: Product[]
  content: HomePageContent['newArrivalsSection']
  products: Product[]
}

export function HomeNewArrivals({ collageProducts, content, products }: HomeNewArrivalsProps) {
  return (
    <section className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-[90rem] gap-10 border-y border-[var(--color-line)] py-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <div className="grid grid-cols-2 gap-2">
          {collageProducts.map((product, index) => (
            <Link
              key={product.variantId}
              to="/products/$slug"
              params={{ slug: product.slug }}
              className={`group overflow-hidden bg-[var(--color-surface)] ${
                index === 0 ? 'row-span-2' : ''
              }`}
            >
              <img
                {...getProductImageProps(
                  product,
                  index % product.images.length,
                  index === 0 ? '(min-width: 1024px) 25vw, 50vw' : '25vw',
                )}
                alt={product.imageAlt}
                loading="lazy"
                decoding="async"
                className={`${
                  index === 0 ? 'h-full min-h-[520px]' : 'aspect-[4/5]'
                } w-full object-cover object-top transition duration-500 ease-out group-hover:scale-[1.025]`}
              />
            </Link>
          ))}
        </div>
        <div>
          <p className="text-sm font-medium text-[var(--color-muted)]">{content.eyebrow}</p>
          <h2 className="mt-3 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-7xl">
            {content.heading}
          </h2>
          <div className="mt-8 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)]">
            {products.map((product) => (
              <Link
                key={product.variantId}
                to="/products/$slug"
                params={{ slug: product.slug }}
                className="flex items-center justify-between gap-5 py-4 text-sm transition duration-150 ease-out hover:translate-x-1"
              >
                <span>
                  <span className="block font-medium text-[var(--color-ink)]">
                    {product.title}
                  </span>
                  <span className="mt-1 block text-[var(--color-muted)]">
                    {product.categoryLabel}
                  </span>
                </span>
                <span className="font-normal text-[var(--color-ink)]">
                  {formatPrice(product.sellingPricePaise)}
                </span>
              </Link>
            ))}
          </div>
          <Button
            nativeButton={false}
            render={
              <a
                href={content.link.url}
                className="mt-8 inline-flex h-11 items-center justify-center bg-[var(--color-primary)] px-6 text-sm font-medium text-[var(--color-paper)] transition duration-200 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
              />
            }
          >
            {content.link.label}
          </Button>
        </div>
      </div>
    </section>
  )
}
