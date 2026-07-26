import { Link } from '@tanstack/react-router'

import type { Product } from '../../data/products'
import { ProductCard } from './ProductCard'
import { RecentlyViewedRail } from './RecentlyViewed'

type ProductGridProps = {
  products: Product[]
}

export function ProductGrid({ products }: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="border border-dashed border-[var(--color-line)] bg-[var(--color-paper)] px-5 py-10 sm:px-8">
        <div className="mx-auto max-w-xl text-center">
          <p className="font-serif text-4xl font-normal leading-none text-[var(--color-ink)]">
            No pieces match this
          </p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            Clear a filter or jump into the latest arrivals. We keep the catalog considered, so
            the right piece is usually only a step away.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <Link
              to="/products"
              className="border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              Clear filters
            </Link>
            <Link
              to="/products"
              search={{ sort: 'newest' }}
              className="border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              New arrivals
            </Link>
            <Link
              to="/products"
              search={{ saleOnly: true }}
              className="border border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-2 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              Offers
            </Link>
          </div>
        </div>
        <RecentlyViewedRail
          compact
          fallback="featured"
          limit={2}
          className="mx-auto mt-10 max-w-lg text-left"
          title="Recently viewed"
        />
      </div>
    )
  }

  return (
    <div className="grid grid-cols-2 gap-x-3 gap-y-8 sm:gap-x-5 sm:gap-y-11 lg:grid-cols-4">
      {products.map((product) => (
        <ProductCard key={product.variantId} product={product} />
      ))}
    </div>
  )
}
