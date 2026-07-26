import { Link } from '@tanstack/react-router'
import { Eye } from 'lucide-react'
import { useState } from 'react'

import type { Product } from '../../data/products'
import { formatPrice } from '../../lib/format'
import { ProductMedia } from './ProductMedia'
import { ProductQuickLook } from './ProductQuickLook'

type ProductCardProps = {
  product: Product
}

export function ProductCard({ product }: ProductCardProps) {
  const [quickLookOpen, setQuickLookOpen] = useState(false)

  return (
    <article className="group/card">
      <div className="relative overflow-hidden bg-[var(--color-surface)]">
        <Link
          to="/products/$slug"
          params={{ slug: product.slug }}
          className="group block focus:outline-none"
        >
          <ProductMedia product={product} className="aspect-[2/3]" hoverZoom />
          <span className="absolute inset-x-3 bottom-3 flex items-end justify-between gap-2 sm:bottom-auto sm:top-3 sm:items-start">
            <span />
            {product.discountPercent > 0 ? (
              <span className="shrink-0 bg-[var(--color-accent-muted)] px-2 py-1 text-[0.625rem] font-medium uppercase leading-4 tracking-[0.08em] text-[var(--color-paper)] sm:px-2.5 sm:text-[0.6875rem] sm:tracking-[0.12em]">
                Save {product.discountPercent}%
              </span>
            ) : null}
          </span>
        </Link>
        <button
          type="button"
          onClick={() => setQuickLookOpen(true)}
          aria-label={`Quick look at ${product.title}`}
          className="absolute bottom-3 right-3 inline-flex h-9 translate-y-1 items-center gap-1.5 border border-[var(--color-line)] bg-[var(--color-paper)]/92 px-3 text-xs font-medium text-[var(--color-ink)] opacity-0 backdrop-blur-sm transition duration-150 ease-out hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-primary)] group-hover/card:translate-y-0 group-hover/card:opacity-100 focus:translate-y-0 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.98]"
        >
          <Eye className="size-3.5" aria-hidden="true" />
          Quick look
        </button>
      </div>
      <Link
        to="/products/$slug"
        params={{ slug: product.slug }}
        className="group block focus:outline-none"
      >
        <div className="mt-2 grid gap-1.5 sm:mt-3">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <p className="text-[0.6875rem] font-medium uppercase leading-4 tracking-[0.12em] text-[var(--color-muted)]">
                {product.categoryLabel}
              </p>
              <h3 className="mt-1 text-sm font-medium leading-snug text-[var(--color-ink)] group-focus-visible:underline sm:text-base">
                {product.title}
              </h3>
            </div>
            <div className="shrink-0 sm:text-right">
              <p className="text-sm font-medium text-[var(--color-ink)]">
                {formatPrice(product.sellingPricePaise)}
              </p>
              {product.discountPercent > 0 ? (
                <p className="mt-1 text-xs text-[var(--color-muted)] line-through">
                  {formatPrice(product.mrpPaise)}
                </p>
              ) : null}
            </div>
          </div>
          {product.discountPercent > 0 ? (
            <p className="text-xs font-medium text-[var(--color-accent-muted)]">
              Save {formatPrice(product.mrpPaise - product.sellingPricePaise)} today
            </p>
          ) : null}
        </div>
      </Link>

      <ProductQuickLook
        product={product}
        open={quickLookOpen}
        onOpenChange={setQuickLookOpen}
      />
    </article>
  )
}
