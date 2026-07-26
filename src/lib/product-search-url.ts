import type { ProductSort } from '../data/product-search'
import {
  categoryLabels,
  productCategories,
  productPriceRange,
  productSizes,
} from '../data/products'
import { formatPrice } from './format'

export type ProductCategoryFilter = string

export type ProductSearchState = {
  q?: string
  category?: ProductCategoryFilter
  sort?: ProductSort
  sizes?: string[]
  minPrice?: number
  maxPrice?: number
  inStockOnly?: boolean
  saleOnly?: boolean
}

export type ResolvedProductSearchState = Required<ProductSearchState>

export type ActiveProductFilter = {
  key: string
  label: string
  clear: Partial<ProductSearchState>
}

const categoryFilters: ProductCategoryFilter[] = ['all', ...productCategories]

const sortOptions: ProductSort[] = [
  'recommended',
  'newest',
  'price-asc',
  'price-desc',
  'discount-desc',
]

export function validateProductSearch(search: Record<string, unknown>): ProductSearchState {
  return {
    q: typeof search.q === 'string' && search.q.trim() ? search.q : undefined,
    category: isCategoryFilter(search.category) ? search.category : undefined,
    sort: isSort(search.sort) ? search.sort : undefined,
    sizes: parseOptionalArraySearch(search.sizes, isSizeFilter),
    minPrice: parsePrice(search.minPrice),
    maxPrice: parsePrice(search.maxPrice),
    inStockOnly: search.inStockOnly === 'true' ? true : undefined,
    saleOnly: search.saleOnly === 'true' ? true : undefined,
  }
}

export function resolveProductSearch(
  search: ProductSearchState,
): ResolvedProductSearchState {
  return {
    q: search.q ?? '',
    category: search.category ?? 'all',
    sort: search.sort ?? 'recommended',
    sizes: search.sizes ?? [],
    minPrice: search.minPrice ?? productPriceRange.min,
    maxPrice: search.maxPrice ?? productPriceRange.max,
    inStockOnly: search.inStockOnly ?? false,
    saleOnly: search.saleOnly ?? false,
  }
}

export function cleanProductSearch(
  search: ResolvedProductSearchState,
): ProductSearchState {
  return {
    q: search.q.trim() || undefined,
    category: search.category === 'all' ? undefined : search.category,
    sort: search.sort === 'recommended' ? undefined : search.sort,
    sizes: search.sizes.length > 0 ? search.sizes : undefined,
    minPrice: search.minPrice > productPriceRange.min ? search.minPrice : undefined,
    maxPrice: search.maxPrice < productPriceRange.max ? search.maxPrice : undefined,
    inStockOnly: search.inStockOnly || undefined,
    saleOnly: search.saleOnly || undefined,
  }
}

export function createActiveProductFilters(
  search: ResolvedProductSearchState,
): ActiveProductFilter[] {
  const filters: ActiveProductFilter[] = []

  if (search.category !== 'all') {
    filters.push({
      key: 'category',
      label: categoryLabels[search.category] ?? search.category,
      clear: { category: 'all' },
    })
  }

  for (const size of search.sizes) {
    filters.push({
      key: `size-${size}`,
      label: `Size ${size}`,
      clear: { sizes: search.sizes.filter((item) => item !== size) },
    })
  }

  if (search.minPrice > productPriceRange.min) {
    filters.push({
      key: 'min-price',
      label: `From ${formatPrice(search.minPrice)}`,
      clear: { minPrice: productPriceRange.min },
    })
  }

  if (search.maxPrice < productPriceRange.max) {
    filters.push({
      key: 'max-price',
      label: `Up to ${formatPrice(search.maxPrice)}`,
      clear: { maxPrice: productPriceRange.max },
    })
  }

  if (search.inStockOnly) {
    filters.push({
      key: 'in-stock',
      label: 'In stock',
      clear: { inStockOnly: false },
    })
  }

  if (search.saleOnly) {
    filters.push({
      key: 'sale',
      label: 'On sale',
      clear: { saleOnly: false },
    })
  }

  return filters
}

function isCategoryFilter(value: unknown): value is ProductCategoryFilter {
  return typeof value === 'string' && categoryFilters.includes(value as ProductCategoryFilter)
}

function isSort(value: unknown): value is ProductSort {
  return typeof value === 'string' && sortOptions.includes(value as ProductSort)
}

function isSizeFilter(value: string) {
  return productSizes.includes(value)
}

function parseArraySearch(value: unknown) {
  if (Array.isArray(value)) {
    return value.filter((item): item is string => typeof item === 'string')
  }

  return typeof value === 'string' && value ? [value] : []
}

function parseOptionalArraySearch(value: unknown, isAllowed: (value: string) => boolean) {
  const values = parseArraySearch(value).filter(isAllowed)
  return values.length > 0 ? values : undefined
}

function parsePrice(value: unknown) {
  if (typeof value !== 'string' && typeof value !== 'number') return undefined

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : undefined
}
