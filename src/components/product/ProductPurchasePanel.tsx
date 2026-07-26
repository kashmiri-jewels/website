import { Button } from '@base-ui/react/button'
import { useNavigate } from '@tanstack/react-router'
import { Minus, Plus, RotateCcw, ShieldCheck, Truck } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { useCart } from '../cart/CartProvider'
import type { Product } from '../../data/products'
import { createProductAnalyticsPayload, trackAnalyticsEvent } from '../../lib/analytics'
import { formatPrice, joinClasses } from '../../lib/format'
import { shippingConfig } from '../../lib/shipping'
import { FitConfidenceHelper } from './FitConfidenceHelper'

const addedMessageDurationMs = 4200

type ProductPurchasePanelProps = {
  product: Product
  showPrice?: boolean
  variant?: 'default' | 'quickLook'
}

export function ProductPurchasePanel({
  product,
  showPrice = true,
  variant = 'default',
}: ProductPurchasePanelProps) {
  const isQuickLook = variant === 'quickLook'
  const availableSizes = useMemo(
    () => product.sizes.filter((size) => size.stockAvailable > 0),
    [product.sizes],
  )
  const defaultSize = availableSizes[0]?.label ?? ''
  const [selectedSize, setSelectedSize] = useState(defaultSize)
  const [quantity, setQuantity] = useState(product.minOrderQuantity)
  const [addedMessage, setAddedMessage] = useState('')
  const addedMessageTimerRef = useRef<number | null>(null)
  const { addItem } = useCart()
  const navigate = useNavigate()
  const selectedInventory = availableSizes.find((size) => size.label === selectedSize)
  const maxQuantity = selectedInventory?.stockAvailable ?? 0
  const minQuantity = product.minOrderQuantity
  const canAddToCart = Boolean(selectedInventory && quantity >= minQuantity && quantity <= maxQuantity)

  useEffect(() => {
    setSelectedSize(defaultSize)
    setQuantity(product.minOrderQuantity)
    setAddedMessage('')
  }, [defaultSize, product.minOrderQuantity, product.variantId])

  useEffect(
    () => () => {
      if (addedMessageTimerRef.current) {
        window.clearTimeout(addedMessageTimerRef.current)
      }
    },
    [],
  )

  function addCurrentSelection() {
    if (!canAddToCart) return
    trackAnalyticsEvent('add_to_bag', {
      ...createProductAnalyticsPayload(product),
      quantity,
      size: selectedSize,
      source: isQuickLook ? 'quick_look' : 'product_page',
    })
    addItem({ product, size: selectedSize, quantity })
    showAddedMessage()
  }

  function buyCurrentSelection() {
    if (!canAddToCart) return
    trackAnalyticsEvent('buy_now', {
      ...createProductAnalyticsPayload(product),
      quantity,
      size: selectedSize,
      source: 'product_page',
    })
    addItem({ product, size: selectedSize, quantity })
    void navigate({ to: '/checkout' })
  }

  function showAddedMessage() {
    if (addedMessageTimerRef.current) {
      window.clearTimeout(addedMessageTimerRef.current)
    }

    setAddedMessage('Added to bag')
    addedMessageTimerRef.current = window.setTimeout(() => {
      setAddedMessage('')
      addedMessageTimerRef.current = null
    }, addedMessageDurationMs)
  }

  return (
    <>
      <div
        className={joinClasses(
          isQuickLook ? '' : 'border-y border-[var(--color-line)] bg-[var(--color-paper)] py-5',
        )}
      >
        {showPrice ? (
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-2xl font-medium text-[var(--color-primary)]">
                {formatPrice(product.sellingPricePaise)}
              </p>
              {product.discountPercent > 0 ? (
                <p className="mt-1 text-sm text-[var(--color-muted)]">
                  <span className="line-through">{formatPrice(product.mrpPaise)}</span>
                  <span className="ml-2 font-medium text-[var(--color-primary)]">
                    {product.discountPercent}% off
                  </span>
                </p>
              ) : null}
            </div>
            {product.stockAvailable <= 0 ? (
              <p className="bg-[var(--color-blush-surface)] px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-accent-muted)]">
                Sold out
              </p>
            ) : null}
          </div>
        ) : null}
        <div className={showPrice ? 'mt-6' : ''}>
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm font-medium text-[var(--color-ink)]">Select size</p>
            {product.sizeChart.length > 0 && !isQuickLook ? (
              <div className="ml-auto flex shrink-0 items-center gap-2 text-right">
                <FitConfidenceHelper product={product} onSelectSize={setSelectedSize} />
                <span className="h-4 w-px bg-[var(--color-line)]" aria-hidden="true" />
                <a
                  href="#size-chart"
                  className="inline-flex items-center text-xs font-medium leading-4 text-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                >
                  Size chart
                </a>
              </div>
            ) : null}
          </div>
          <div className="mt-3 grid grid-cols-5 gap-2">
            {product.sizes.map((size) => {
              const isSelected = selectedSize === size.label
              const isAvailable = size.stockAvailable > 0

              return (
                <button
                  key={size.label}
                  type="button"
                  disabled={!isAvailable}
                  aria-pressed={isSelected}
                  onClick={() => {
                    setSelectedSize(size.label)
                    setQuantity(product.minOrderQuantity)
                    trackAnalyticsEvent('size_select', {
                      ...createProductAnalyticsPayload(product),
                      size: size.label,
                      source: isQuickLook ? 'quick_look' : 'product_page',
                    })
                  }}
                  className={joinClasses(
                    'h-11 border text-sm font-medium transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                    isSelected
                      ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-paper)]'
                      : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)]',
                    !isAvailable &&
                      'cursor-not-allowed border-[var(--color-line)] bg-stone-100 text-stone-500 hover:border-[var(--color-line)]',
                  )}
                >
                  {size.label}
                </button>
              )
            })}
          </div>
          {selectedInventory && minQuantity > 1 ? (
            <p className="mt-2 text-xs text-[var(--color-muted)]">
              Minimum order {minQuantity}
            </p>
          ) : !selectedInventory ? (
            <p className="mt-2 text-xs text-red-700">This product is currently sold out.</p>
          ) : null}
        </div>

      <div
        className={joinClasses(
          'mt-6 grid gap-3',
          isQuickLook ? '' : 'sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2',
        )}
      >
        <Button
          type="button"
          disabled={!canAddToCart}
          onClick={addCurrentSelection}
          className="inline-flex h-12 items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
        >
          Add to bag
        </Button>
        {!isQuickLook ? (
          <Button
            type="button"
            disabled={!canAddToCart}
            onClick={buyCurrentSelection}
            className="inline-flex h-12 items-center justify-center border border-[var(--color-line)] bg-[var(--color-paper)] px-5 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-500"
          >
            Buy now
          </Button>
        ) : null}
      </div>

      {addedMessage ? (
        <p role="status" className="mt-3 text-sm font-medium text-emerald-700">
          {addedMessage}
        </p>
      ) : null}

      {!isQuickLook ? (
        <div className="mt-5">
          <p className="text-sm font-medium text-[var(--color-ink)]">Quantity</p>
          <div className="mt-3 inline-flex h-11 items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-paper)]">
            <button
              type="button"
              disabled={quantity <= minQuantity}
              aria-label="Decrease quantity"
              onClick={() => setQuantity((value) => Math.max(minQuantity, value - 1))}
              className="grid h-full w-11 place-items-center text-[var(--color-muted)] transition duration-150 ease-out hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset active:scale-95 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-stone-400 disabled:active:scale-100"
            >
              <Minus className="size-4" aria-hidden="true" />
            </button>
            <span className="w-10 text-center text-sm font-medium text-[var(--color-ink)]">
              {quantity}
            </span>
            <button
              type="button"
              disabled={!selectedInventory || quantity >= maxQuantity}
              aria-label="Increase quantity"
              onClick={() => setQuantity((value) => Math.min(maxQuantity, value + 1))}
              className="grid h-full w-11 place-items-center text-[var(--color-muted)] transition duration-150 ease-out hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-inset active:scale-95 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-stone-400 disabled:active:scale-100"
            >
              <Plus className="size-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      ) : null}

      <div
        className={joinClasses(
          'mt-5 grid gap-3 border-t border-[var(--color-line)] pt-5 text-sm text-[var(--color-muted)]',
          isQuickLook ? 'text-xs leading-5' : '',
        )}
      >
        <p className="flex gap-3">
          <Truck className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-muted)]" aria-hidden="true" />
          <span>Ships in 1-2 business days after order confirmation.</span>
        </p>
        {!isQuickLook ? (
          <>
            <p className="flex gap-3">
              <RotateCcw className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-muted)]" aria-hidden="true" />
              <span>7-day returns on eligible pieces.</span>
            </p>
            <p className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-muted)]"
                aria-hidden="true"
              />
              <span>Free shipping above {formatPrice(shippingConfig.freeShippingThresholdPaise)}.</span>
            </p>
            <p className="flex gap-3">
              <ShieldCheck
                className="mt-0.5 size-4 shrink-0 text-[var(--color-accent-muted)]"
                aria-hidden="true"
              />
              <span>Order total is confirmed before payment.</span>
            </p>
          </>
        ) : null}
      </div>
      </div>

      {!isQuickLook ? (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-line)] bg-[var(--color-paper)]/96 px-4 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 backdrop-blur-sm sm:hidden">
          <div className="mx-auto grid max-w-md grid-cols-[1fr_auto] items-center gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                {selectedSize ? `${product.title} - ${selectedSize}` : product.title}
              </p>
              <p
                role={addedMessage ? 'status' : undefined}
                className={joinClasses(
                  'mt-0.5 text-sm',
                  addedMessage ? 'font-medium text-emerald-700' : 'text-[var(--color-muted)]',
                )}
              >
                {addedMessage || formatPrice(product.sellingPricePaise)}
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                type="button"
                disabled={!canAddToCart}
                onClick={addCurrentSelection}
                className="inline-flex h-12 items-center justify-center border border-[var(--color-line)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:border-stone-200 disabled:bg-stone-100 disabled:text-stone-500"
              >
                Add
              </Button>
              <Button
                type="button"
                disabled={!canAddToCart}
                onClick={buyCurrentSelection}
                className="inline-flex h-12 items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500"
              >
                Buy
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
