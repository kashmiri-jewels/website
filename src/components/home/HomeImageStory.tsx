import { Link } from '@tanstack/react-router'

import type { Product } from '../../data/products'
import { getProductImageProps } from '../../lib/product-images'
import type { HomePageContent } from '../../lib/storefront-content'

type HomeImageStoryProps = {
  content: HomePageContent['imageStory']
  products: Product[]
}

export function HomeImageStory({ content, products }: HomeImageStoryProps) {
  const featureProduct = products[0]
  const supportingProducts = products.slice(1, 4)

  if (!featureProduct) {
    return null
  }

  return (
    <section className="border-y border-[var(--color-line)] px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <div className="mx-auto grid max-w-[90rem] gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:items-center">
        <Link
          to="/products/$slug"
          params={{ slug: featureProduct.slug }}
          className="group relative aspect-[5/4] overflow-hidden bg-[var(--color-surface)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
        >
          <img
            {...getProductImageProps(featureProduct, 0, '(min-width: 1024px) 54vw, 100vw')}
            alt={featureProduct.imageAlt}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover object-top transition duration-500 ease-out group-hover:scale-[1.02]"
          />
        </Link>

        <div className="lg:pl-10">
          <p className="text-sm font-medium text-[var(--color-muted)]">{content.eyebrow}</p>
          <h2 className="mt-3 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-7xl">
            {content.heading}
          </h2>
          <p className="mt-5 max-w-xl text-base leading-7 text-[var(--color-muted)]">
            {content.copy}
          </p>
          <a
            href={content.link.url}
            className="mt-7 inline-flex h-11 items-center justify-center border border-[var(--color-line)] bg-[var(--color-paper)] px-6 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            {content.link.label}
          </a>

          {supportingProducts.length > 0 ? (
            <div className="mt-9 grid grid-cols-3 gap-3">
              {supportingProducts.map((product) => (
                <Link
                  key={product.variantId}
                  to="/products/$slug"
                  params={{ slug: product.slug }}
                  className="group block focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                >
                  <div className="aspect-[4/5] overflow-hidden bg-[var(--color-surface)]">
                    <img
                      {...getProductImageProps(product, 0, '(min-width: 1024px) 12vw, 30vw')}
                      alt={product.imageAlt}
                      loading="lazy"
                      decoding="async"
                      className="h-full w-full object-cover object-top transition duration-500 ease-out group-hover:scale-[1.02]"
                    />
                  </div>
                  <p className="mt-2 truncate text-sm font-medium text-[var(--color-ink)]">
                    {product.title}
                  </p>
                </Link>
              ))}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}
