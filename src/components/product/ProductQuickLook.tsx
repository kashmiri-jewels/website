import { Dialog } from '@base-ui/react/dialog'
import { Link } from '@tanstack/react-router'
import { ArrowRight, X } from 'lucide-react'
import { useEffect } from 'react'

import type { Product } from '../../data/products'
import { createProductAnalyticsPayload, trackAnalyticsEvent } from '../../lib/analytics'
import { formatPrice } from '../../lib/format'
import { ProductGallery } from './ProductGallery'
import { ProductPurchasePanel } from './ProductPurchasePanel'
import { ProductReasons } from './ProductReasons'

type ProductQuickLookProps = {
  product: Product
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function ProductQuickLook({ product, open, onOpenChange }: ProductQuickLookProps) {
  useEffect(() => {
    if (!open) return

    trackAnalyticsEvent('quick_view_open', createProductAnalyticsPayload(product))
  }, [open, product])

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-950/45 backdrop-blur-sm transition duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex min-h-svh items-end justify-center overflow-y-auto p-0 sm:items-center sm:p-6">
          <Dialog.Popup className="relative max-h-[100svh] w-full overflow-y-auto border border-[var(--color-line)] bg-[var(--color-paper)] outline-none transition duration-200 data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:max-h-[90svh] sm:max-w-6xl sm:data-[ending-style]:scale-[0.98] sm:data-[starting-style]:scale-[0.98]">
            <div className="sticky top-0 z-10 flex items-center justify-between gap-4 border-b border-[var(--color-line)] bg-[var(--color-paper)]/94 px-5 py-4 backdrop-blur sm:px-6">
              <div className="min-w-0">
                <Dialog.Title className="truncate font-serif text-2xl text-[var(--color-ink)]">
                  {product.title}
                </Dialog.Title>
                <Dialog.Description className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--color-muted)]">
                  <span>{product.categoryLabel}</span>
                  <span aria-hidden="true">/</span>
                  <span className="font-medium text-[var(--color-ink)]">
                    {formatPrice(product.sellingPricePaise)}
                  </span>
                  {product.discountPercent > 0 ? (
                    <span className="font-medium text-[var(--color-primary)]">
                      Save {formatPrice(product.mrpPaise - product.sellingPricePaise)}
                    </span>
                  ) : null}
                </Dialog.Description>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <Dialog.Close
                  aria-label="Close quick look"
                  className="grid size-10 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-blush)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                >
                  <X className="size-4" aria-hidden="true" />
                </Dialog.Close>
              </div>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:gap-8">
              <div>
                <ProductGallery product={product} imageFit="contain" variant="quickLook" />
              </div>

              <section className="border border-[var(--color-line)] bg-[var(--color-paper)] p-4 lg:sticky lg:top-24 lg:self-start lg:p-5">
                <ProductPurchasePanel
                  product={product}
                  variant="quickLook"
                />
                <p className="mt-5 border-t border-[var(--color-line)] pt-4 text-sm leading-6 text-[var(--color-muted)]">
                  {product.description}
                </p>
                <div className="mt-4">
                  <ProductReasons product={product} compact includeAvailability={false} />
                </div>
                <Link
                  to="/products/$slug"
                  params={{ slug: product.slug }}
                  onClick={() => onOpenChange(false)}
                  className="mt-5 inline-flex h-11 items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-blush)] hover:bg-[var(--color-surface-soft)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                >
                  More about this piece
                  <ArrowRight className="size-4" aria-hidden="true" />
                </Link>
              </section>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
