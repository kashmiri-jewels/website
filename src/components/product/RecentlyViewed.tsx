import { Link } from '@tanstack/react-router'
import { useEffect, useState } from 'react'

import { featuredProducts, getProductVariantById, type Product } from '../../data/products'
import { formatPrice, joinClasses } from '../../lib/format'
import { ProductMedia } from './ProductMedia'

const recentProductsStorageKey = 'kashmiri-jewels-recently-viewed'
const recentProductsEvent = 'kashmiri-jewels-recently-viewed:update'
const maxStoredProducts = 8

type RecentlyViewedRailProps = {
  className?: string
  compact?: boolean
  excludeProductId?: string
  fallback?: 'featured' | 'none'
  limit?: number
  onProductClick?: () => void
  title?: string
}

export function rememberRecentlyViewedProduct(product: Product) {
  if (typeof window === 'undefined') return

  const currentVariantIds = readStoredVariantIds()
  const nextVariantIds = [
    product.variantId,
    ...currentVariantIds.filter((variantId) => variantId !== product.variantId),
  ].slice(0, maxStoredProducts)

  window.localStorage.setItem(recentProductsStorageKey, JSON.stringify(nextVariantIds))
  window.dispatchEvent(new Event(recentProductsEvent))
}

export function useRecentlyViewedProducts(excludeProductId?: string, limit = 4) {
  const [recentProducts, setRecentProducts] = useState<Product[]>([])

  useEffect(() => {
    function refreshRecentProducts() {
      setRecentProducts(
        readStoredVariantIds()
          .map((variantId) => getProductVariantById(variantId))
          .filter((product): product is Product => Boolean(product))
          .filter((product) => product.variantId !== excludeProductId)
          .slice(0, limit),
      )
    }

    refreshRecentProducts()

    window.addEventListener('storage', refreshRecentProducts)
    window.addEventListener(recentProductsEvent, refreshRecentProducts)

    return () => {
      window.removeEventListener('storage', refreshRecentProducts)
      window.removeEventListener(recentProductsEvent, refreshRecentProducts)
    }
  }, [excludeProductId, limit])

  return recentProducts
}

export function RecentlyViewedRail({
  className,
  compact = false,
  excludeProductId,
  fallback = 'none',
  limit = 4,
  onProductClick,
  title = 'Recently viewed',
}: RecentlyViewedRailProps) {
  const recentProducts = useRecentlyViewedProducts(excludeProductId, limit)
  const fallbackProducts =
    fallback === 'featured'
      ? featuredProducts
          .filter((product) => product.variantId !== excludeProductId)
          .slice(0, limit)
      : []
  const products = recentProducts.length > 0 ? recentProducts : fallbackProducts
  const heading = recentProducts.length > 0 ? title : 'Picked for you'

  if (products.length === 0) return null

  return (
    <section className={joinClasses(className)}>
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          <p className="text-[0.6875rem] font-medium uppercase leading-4 tracking-[0.12em] text-[var(--color-muted)]">
            {recentProducts.length > 0 ? 'Continue browsing' : 'From the edit'}
          </p>
          <h2 className={joinClasses('mt-2 font-serif font-normal leading-none text-[var(--color-ink)]', compact ? 'text-3xl' : 'text-5xl')}>
            {heading}
          </h2>
        </div>
        {!compact ? (
          <Link
            to="/products"
            className="hidden text-sm font-medium text-[var(--color-ink)] underline-offset-4 transition duration-150 ease-out hover:text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 sm:inline"
          >
            View all
          </Link>
        ) : null}
      </div>
      <div
        className={joinClasses(
          'grid gap-4',
          compact ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4',
        )}
      >
        {products.map((product) => (
          <Link
            key={product.variantId}
            to="/products/$slug"
            params={{ slug: product.slug }}
            onClick={onProductClick}
            className="group min-w-0 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <ProductMedia product={product} className="aspect-[4/5]" hoverZoom />
            <div className="mt-3 min-w-0">
              <p className="truncate text-sm font-medium text-[var(--color-ink)]">
                {product.title}
              </p>
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                {formatPrice(product.sellingPricePaise)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

function readStoredVariantIds() {
  if (typeof window === 'undefined') return []

  try {
    const storedValue = window.localStorage.getItem(recentProductsStorageKey)
    if (!storedValue) return []

    const parsedValue = JSON.parse(storedValue)
    if (!Array.isArray(parsedValue)) return []

    return parsedValue.filter((variantId): variantId is string => typeof variantId === 'string')
  } catch {
    return []
  }
}
