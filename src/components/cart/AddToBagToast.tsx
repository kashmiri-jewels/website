import { Link } from '@tanstack/react-router'
import { ShoppingBag, X } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

import { formatPrice } from '../../lib/format'
import { isOrdersEnabled } from '../../lib/supabase'
import { ProductMedia } from '../product/ProductMedia'
import { type AddedCartItem, useOptionalCart } from './CartProvider'

export function AddToBagToast() {
  const cart = useOptionalCart()
  const dismissAddedItem = cart?.dismissAddedItem
  const openCart = cart?.openCart
  const closeTimerRef = useRef<number | null>(null)
  const [visibleItem, setVisibleItem] = useState<AddedCartItem | null>(null)
  const [isVisible, setIsVisible] = useState(false)

  const closeToast = useCallback(() => {
    setIsVisible(false)

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
    }

    closeTimerRef.current = window.setTimeout(() => {
      dismissAddedItem?.()
      setVisibleItem(null)
      closeTimerRef.current = null
    }, 180)
  }, [dismissAddedItem])

  useEffect(() => {
    if (!cart?.addedItem) return

    if (closeTimerRef.current) {
      window.clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }

    setIsVisible(false)
    setVisibleItem(cart.addedItem)
    const frame = window.requestAnimationFrame(() => setIsVisible(true))

    return () => window.cancelAnimationFrame(frame)
  }, [cart?.addedItem])

  useEffect(() => {
    if (!visibleItem || !isVisible) return

    const timeout = window.setTimeout(closeToast, 5200)
    return () => window.clearTimeout(timeout)
  }, [closeToast, isVisible, visibleItem])

  useEffect(
    () => () => {
      if (closeTimerRef.current) {
        window.clearTimeout(closeTimerRef.current)
      }
    },
    [],
  )

  if (!cart || !visibleItem) return null

  return (
    <div
      aria-live="polite"
      className={`fixed bottom-[calc(env(safe-area-inset-bottom)+5.25rem)] left-1/2 z-50 w-[calc(100%-2rem)] max-w-md -translate-x-1/2 border border-[var(--color-line)] bg-[var(--color-paper)] p-3 transition duration-200 ease-out sm:bottom-5 sm:left-auto sm:right-5 sm:translate-x-0 ${
        isVisible
          ? 'translate-y-0 opacity-100 sm:translate-y-0'
          : 'translate-y-2 opacity-0 sm:translate-y-2'
      }`}
    >
      <div className="grid grid-cols-[64px_minmax(0,1fr)_auto] gap-3">
        <ProductMedia product={visibleItem.product} className="aspect-[4/5]" />
        <div className="min-w-0 py-1">
          <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-primary)]">
            <ShoppingBag className="size-3.5" aria-hidden="true" />
            Added to bag
          </p>
          <p className="mt-1 truncate text-sm font-medium text-[var(--color-ink)]">
            {visibleItem.product.title}
          </p>
          <p className="mt-1 text-xs text-[var(--color-muted)]">
            Size {visibleItem.size} / Qty {visibleItem.quantity} /{' '}
            {formatPrice(visibleItem.product.sellingPricePaise * visibleItem.quantity)}
          </p>
        </div>
        <button
          type="button"
          aria-label="Dismiss add to bag message"
          onClick={closeToast}
          className="grid size-8 place-items-center text-[var(--color-muted)] transition duration-150 ease-out hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-95"
        >
          <X className="size-4" aria-hidden="true" />
        </button>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => {
            closeToast()
            openCart?.()
          }}
          className="h-10 border border-[var(--color-line)] bg-[var(--color-surface)] text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
        >
          View bag
        </button>
        {isOrdersEnabled ? (
          <Link
            to="/checkout"
            onClick={closeToast}
            className="inline-flex h-10 items-center justify-center bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            Checkout
          </Link>
        ) : (
          <span className="inline-flex h-10 cursor-not-allowed items-center justify-center bg-stone-100 px-4 text-sm font-medium text-stone-500">
            Orders unavailable
          </span>
        )}
      </div>
    </div>
  )
}
