import { Button } from '@base-ui/react/button'
import { Drawer } from '@base-ui/react/drawer'
import { Link } from '@tanstack/react-router'
import { Minus, Plus, ShoppingBag, X } from 'lucide-react'

import { getAmountBucket, trackAnalyticsEvent } from '../../lib/analytics'
import { formatPrice } from '../../lib/format'
import {
  calculateShippingPaise,
  formatShippingAmount,
  getFreeShippingMessage,
} from '../../lib/shipping'
import { isOrdersEnabled } from '../../lib/supabase'
import { ProductMedia } from '../product/ProductMedia'
import { RecentlyViewedRail } from '../product/RecentlyViewed'
import { useOptionalCart } from './CartProvider'

export function CartDrawer() {
  const cart = useOptionalCart()

  if (!cart) return null

  const {
    lines,
    itemCount,
    subtotal,
    savings,
    isOpen,
    setCartOpen,
    updateQuantity,
    removeItem,
    closeCart,
  } = cart
  const shipping = calculateShippingPaise(subtotal)
  const total = subtotal + shipping

  return (
    <Drawer.Root open={isOpen} onOpenChange={setCartOpen} swipeDirection="right">
      <Drawer.Portal>
        <Drawer.Backdrop className="fixed inset-0 z-40 bg-[var(--color-ink)]/35 backdrop-blur-sm transition duration-200 ease-out data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Drawer.Viewport>
          <Drawer.Popup className="fixed right-0 top-0 z-50 flex h-dvh w-full max-w-md flex-col border-l border-[var(--color-line)] bg-[var(--color-paper)] outline-none transition duration-200 ease-out data-[ending-style]:translate-x-full data-[starting-style]:translate-x-full">
            <div className="flex items-start justify-between gap-6 border-b border-[var(--color-line)] px-5 py-5">
              <div>
                <Drawer.Title className="flex items-center gap-2 font-serif text-3xl font-normal leading-none text-[var(--color-ink)]">
                  <ShoppingBag className="size-5" aria-hidden="true" />
                  Shopping bag
                </Drawer.Title>
                <Drawer.Description className="mt-1 text-sm text-[var(--color-muted)]">
                  {itemCount} {itemCount === 1 ? 'item' : 'items'}
                </Drawer.Description>
              </div>
              <Drawer.Close
                aria-label="Close cart"
                className="inline-flex size-9 items-center justify-center rounded-full text-[var(--color-muted)] transition duration-150 ease-out hover:bg-[var(--color-surface)] hover:text-[var(--color-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] active:scale-95"
              >
                <X className="size-4" aria-hidden="true" />
              </Drawer.Close>
            </div>

            {lines.length === 0 ? (
              <div className="flex-1 overflow-y-auto px-6 py-8">
                <div className="mx-auto max-w-sm text-center">
                  <p className="font-serif text-4xl font-normal leading-none text-[var(--color-ink)]">
                    Your bag is empty
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                    Choose a style and size to begin your order.
                  </p>
                  <Button
                    nativeButton={false}
                    render={
                      <Link
                        to="/products"
                        onClick={closeCart}
                        className="mt-6 inline-flex h-11 items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-200 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
                      />
                    }
                  >
                    Browse products
                  </Button>
                </div>
                <RecentlyViewedRail
                  compact
                  fallback="featured"
                  limit={2}
                  onProductClick={closeCart}
                  className="mt-10 text-left"
                  title="Recently viewed"
                />
              </div>
            ) : (
              <>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <div className="space-y-5">
                    {lines.map((line) => (
                      <div key={line.id} className="grid grid-cols-[88px_1fr] gap-4">
                        <Link
                          to="/products/$slug"
                          params={{ slug: line.product.slug }}
                          onClick={closeCart}
                          className="group"
                        >
                          <ProductMedia product={line.product} className="aspect-[4/5]" />
                        </Link>
                        <div className="min-w-0">
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <Link
                                to="/products/$slug"
                                params={{ slug: line.product.slug }}
                                onClick={closeCart}
                                className="text-sm font-medium text-[var(--color-ink)] transition hover:text-[var(--color-primary)]"
                              >
                                {line.product.title}
                              </Link>
                              <p className="mt-1 text-xs text-[var(--color-muted)]">
                                Size {line.size} / {line.product.categoryLabel}
                              </p>
                            </div>
                            <p className="text-sm font-medium text-[var(--color-ink)]">
                              {formatPrice(line.product.sellingPricePaise * line.quantity)}
                            </p>
                          </div>

                          <div className="mt-4 flex items-center justify-between gap-3">
                            <div className="inline-flex h-9 items-center overflow-hidden border border-[var(--color-line)] bg-[var(--color-surface)]">
                              <button
                                type="button"
                                aria-label={`Decrease ${line.product.title} quantity`}
                                disabled={line.quantity <= line.product.minOrderQuantity}
                                onClick={() => updateQuantity(line.id, line.quantity - 1)}
                                className="grid h-full w-9 place-items-center text-[var(--color-muted)] transition duration-150 ease-out hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] active:scale-95 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-stone-400 disabled:active:scale-100"
                              >
                                <Minus className="size-4" aria-hidden="true" />
                              </button>
                              <span className="w-8 text-center text-sm font-medium">
                                {line.quantity}
                              </span>
                              <button
                                type="button"
                                aria-label={`Increase ${line.product.title} quantity`}
                                disabled={line.quantity >= line.maxQuantity}
                                onClick={() => updateQuantity(line.id, line.quantity + 1)}
                                className="grid h-full w-9 place-items-center text-[var(--color-muted)] transition duration-150 ease-out hover:bg-[var(--color-canvas)] hover:text-[var(--color-ink)] active:scale-95 disabled:cursor-not-allowed disabled:bg-transparent disabled:text-stone-400 disabled:active:scale-100"
                              >
                                <Plus className="size-4" aria-hidden="true" />
                              </button>
                            </div>
                            <button
                              type="button"
                              onClick={() => removeItem(line.id)}
                              className="text-xs font-medium text-[var(--color-muted)] underline-offset-4 transition duration-150 ease-out hover:text-[var(--color-primary)] hover:underline active:scale-[0.98]"
                            >
                              Remove
                            </button>
                          </div>
                          {line.quantity >= line.maxQuantity ? (
                            <p className="mt-2 text-xs text-amber-700">
                              Only {line.maxQuantity} available in this size
                            </p>
                          ) : line.product.minOrderQuantity > 1 ? (
                            <p className="mt-2 text-xs text-[var(--color-muted)]">
                              Minimum order {line.product.minOrderQuantity}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="border-t border-[var(--color-line)] bg-[var(--color-surface)] px-5 py-5">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between text-[var(--color-muted)]">
                      <span>Subtotal</span>
                      <span className="font-medium text-[var(--color-ink)]">
                        {formatPrice(subtotal)}
                      </span>
                    </div>
                    {savings > 0 ? (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span>Savings</span>
                        <span>{formatPrice(savings)}</span>
                      </div>
                    ) : null}
                    <div className="flex items-center justify-between text-[var(--color-muted)]">
                      <span>Shipping</span>
                      <span>{formatShippingAmount(shipping)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--color-line)] pt-3 text-base font-medium text-[var(--color-ink)]">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-[var(--color-muted)]">
                    {getFreeShippingMessage(subtotal)} Taxes are included.
                  </p>
                  {isOrdersEnabled ? (
                    <Button
                      nativeButton={false}
                      render={
                        <Link
                          to="/checkout"
                          onClick={() => {
                            trackAnalyticsEvent('checkout_click', {
                              amount_bucket: getAmountBucket(total),
                              item_count: itemCount,
                              source: 'cart_drawer',
                            })
                            closeCart()
                          }}
                          className="mt-4 flex h-12 w-full items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-200 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
                        />
                      }
                    >
                      Checkout
                    </Button>
                  ) : (
                    <button
                      type="button"
                      disabled
                      className="mt-4 flex h-12 w-full cursor-not-allowed items-center justify-center bg-stone-100 px-5 text-sm font-medium text-stone-500"
                    >
                      Orders unavailable
                    </button>
                  )}
                </div>
              </>
            )}
          </Drawer.Popup>
        </Drawer.Viewport>
      </Drawer.Portal>
    </Drawer.Root>
  )
}
