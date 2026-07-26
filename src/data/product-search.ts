import { create, insertMultiple, search } from '@orama/orama'

import type { Product } from './product-schema'
import { categoryLabels, productCategories, products } from './products'

export type ProductSort = 'recommended' | 'newest' | 'price-asc' | 'price-desc' | 'discount-desc'

export type ProductSearchInput = {
  query: string
  category: string
  sort: ProductSort
  sizes: string[]
  minPrice?: number
  maxPrice?: number
  inStockOnly: boolean
  saleOnly: boolean
}

export type ProductSearchResult = {
  products: Product[]
  count: number
  elapsed?: string
}

export type ProductCategoryCounts = Record<string, number>

type ProductSearchDocument = {
  variantId: string
  title: string
  description: string
  category: string
  categoryLabel: string
  sizes: string
  sellingPricePaise: number
  mrpPaise: number
  discountPercent: number
  featured: boolean
  stockAvailable: number
}

type ProductSearchIndex = Awaited<ReturnType<typeof createProductSearchIndex>>

const productByVariantId = new Map(products.map((product) => [product.variantId, product]))
let indexPromise: Promise<ProductSearchIndex> | undefined

export async function searchProducts(input: ProductSearchInput): Promise<ProductSearchResult> {
  const intent = parseSearchIntent(input.query)
  const effectiveInput = applySearchIntent(input, intent)
  const query = intent.searchTerm
  const where = effectiveInput.category === 'all' ? undefined : { category: effectiveInput.category }
  const filterProduct = createProductFilter(effectiveInput)

  if (!query) {
    const filteredProducts = products.filter(filterProduct)

    return {
      products: sortProducts(filteredProducts, effectiveInput.sort),
      count: filteredProducts.length,
    }
  }

  const db = await getProductSearchIndex()
  const result = await search(db, {
    term: query,
    properties: ['title', 'description', 'categoryLabel', 'sizes'],
    boost: {
      title: 4,
      categoryLabel: 2,
      sizes: 1.2,
    },
    tolerance: query.length > 3 ? 1 : 0,
    threshold: 0,
    where,
    limit: products.length,
  })

  const matchedProducts = result.hits
    .map((hit) => productByVariantId.get(hit.document.variantId))
    .filter((product): product is Product => Boolean(product))
    .filter(filterProduct)

  return {
    products: sortProducts(matchedProducts, effectiveInput.sort, query),
    count: matchedProducts.length,
    elapsed: result.elapsed.formatted,
  }
}

export function getCategoryCounts(items: Product[]): ProductCategoryCounts {
  const counts: ProductCategoryCounts = {}

  for (const product of items) {
    counts[product.category] = (counts[product.category] ?? 0) + 1
  }

  return counts
}

export function getSmartSearchLabels(query: string) {
  const intent = parseSearchIntent(query)
  const labels: string[] = []

  if (intent.category) {
    labels.push(categoryLabels[intent.category] ?? intent.category)
  }

  for (const size of intent.sizes) {
    labels.push(`Size ${size}`)
  }

  if (intent.maxPrice !== undefined) {
    labels.push(`Up to ${formatRupees(intent.maxPrice)}`)
  }

  if (intent.minPrice !== undefined) {
    labels.push(`From ${formatRupees(intent.minPrice)}`)
  }

  if (intent.saleOnly) {
    labels.push('On sale')
  }

  if (intent.sort === 'newest') {
    labels.push('Newest')
  }

  return labels
}

function getProductSearchIndex() {
  indexPromise ??= createProductSearchIndex()
  return indexPromise
}

async function createProductSearchIndex() {
  const db = create({
    schema: {
      variantId: 'string',
      title: 'string',
      description: 'string',
      category: 'string',
      categoryLabel: 'string',
      sizes: 'string',
      sellingPricePaise: 'number',
      mrpPaise: 'number',
      discountPercent: 'number',
      featured: 'boolean',
      stockAvailable: 'number',
    },
    sort: {
      enabled: true,
      unsortableProperties: [
        'variantId',
        'title',
        'description',
        'category',
        'categoryLabel',
        'sizes',
      ],
    },
  })

  await insertMultiple(db, products.map(toSearchDocument))

  return db
}

function toSearchDocument(product: Product): ProductSearchDocument {
  return {
    variantId: product.variantId,
    title: product.title,
    description: product.description,
    category: product.category,
    categoryLabel: product.categoryLabel,
    sizes: product.sizes.map((size) => size.label).join(' '),
    sellingPricePaise: product.sellingPricePaise,
    mrpPaise: product.mrpPaise,
    discountPercent: product.discountPercent,
    featured: product.featured,
    stockAvailable: product.stockAvailable,
  }
}

function sortProducts(items: Product[], sort: ProductSort, query = '') {
  const productsToSort = [...items]

  if (sort === 'price-asc') {
    return productsToSort.sort((left, right) => left.sellingPricePaise - right.sellingPricePaise)
  }

  if (sort === 'price-desc') {
    return productsToSort.sort((left, right) => right.sellingPricePaise - left.sellingPricePaise)
  }

  if (sort === 'discount-desc') {
    return productsToSort.sort(
      (left, right) =>
        right.discountPercent - left.discountPercent ||
        left.sellingPricePaise - right.sellingPricePaise,
    )
  }

  if (sort === 'newest') {
    return productsToSort.sort(
      (left, right) => products.indexOf(left) - products.indexOf(right),
    )
  }

  if (!query) {
    return productsToSort.sort(
      (left, right) =>
        Number(right.featured) - Number(left.featured) ||
        left.title.localeCompare(right.title),
    )
  }

  return productsToSort
}

function createProductFilter(input: ProductSearchInput) {
  const sizeSet = new Set(input.sizes)

  return (product: Product) => {
    if (input.category !== 'all' && product.category !== input.category) return false
    if (input.saleOnly && product.discountPercent <= 0) return false
    if (input.inStockOnly && product.stockAvailable < 1) return false
    if (input.minPrice !== undefined && product.sellingPricePaise < input.minPrice) return false
    if (input.maxPrice !== undefined && product.sellingPricePaise > input.maxPrice) return false

    if (sizeSet.size > 0) {
      return product.sizes.some((size) => size.stockAvailable > 0 && sizeSet.has(size.label))
    }

    return true
  }
}

type SearchIntent = {
  category?: string
  maxPrice?: number
  minPrice?: number
  saleOnly?: boolean
  searchTerm: string
  sizes: string[]
  sort?: ProductSort
}

const sizeTokens = new Set(['S', 'M', 'L', 'XL', 'XXL'])
const coOrdSetCategory = productCategories.find((category) => category.includes('set'))
const kurtiCategory = productCategories.find((category) => category.includes('kurti'))
const shortTopCategory = productCategories.find((category) => category.includes('short'))

function parseSearchIntent(query: string): SearchIntent {
  let normalizedQuery = query.toLowerCase().trim()
  const sizes = new Set<string>()
  let category: string | undefined
  let maxPrice: number | undefined
  let minPrice: number | undefined
  let saleOnly = false
  let sort: ProductSort | undefined

  normalizedQuery = normalizedQuery
    .replace(/\bco[-\s]?ord(?:inate)?s?\b/g, 'sets')
    .replace(/\bpant\s+sets?\b/g, 'sets')
    .replace(/\bdaily\b/g, 'everyday')
    .replace(/\boffice\b/g, 'work everyday')
    .replace(/\bfunction\b/g, 'festive occasion')
    .replace(/\bpuja\b/g, 'festive occasion')

  for (const match of normalizedQuery.matchAll(/\b(?:size\s*)?(xxl|xl|l|m|s)\b/g)) {
    const size = match[1].toUpperCase()
    if (sizeTokens.has(size)) {
      sizes.add(size)
    }
  }

  const maxPriceMatch = normalizedQuery.match(
    /\b(?:under|below|less than|up to|upto|max|maximum)\s*(?:rs\.?|₹)?\s*([0-9][0-9,]*)\b/,
  )
  if (maxPriceMatch) {
    maxPrice = rupeesTextToPaise(maxPriceMatch[1])
  }

  const minPriceMatch = normalizedQuery.match(
    /\b(?:over|above|more than|from|min|minimum)\s*(?:rs\.?|₹)?\s*([0-9][0-9,]*)\b/,
  )
  if (minPriceMatch) {
    minPrice = rupeesTextToPaise(minPriceMatch[1])
  }

  if (/\b(?:sale|discount|discounted|offer|offers|saving|savings)\b/.test(normalizedQuery)) {
    saleOnly = true
    sort = 'discount-desc'
  }

  if (/\b(?:new|newest|latest|arrival|arrivals)\b/.test(normalizedQuery)) {
    sort = 'newest'
  }

  if (/\b(?:sets?|coordinated)\b/.test(normalizedQuery)) {
    category = coOrdSetCategory
  } else if (/\b(?:short\s+tops?|tops?)\b/.test(normalizedQuery)) {
    category = shortTopCategory
  } else if (/\b(?:kurti|kurtis|kurta|kurtas)\b/.test(normalizedQuery)) {
    category = kurtiCategory
  }

  const searchTerm = normalizedQuery
    .replace(/\b(?:under|below|less than|up to|upto|max|maximum)\s*(?:rs\.?|₹)?\s*[0-9][0-9,]*\b/g, ' ')
    .replace(/\b(?:over|above|more than|from|min|minimum)\s*(?:rs\.?|₹)?\s*[0-9][0-9,]*\b/g, ' ')
    .replace(/\b(?:size\s*)?(xxl|xl|l|m|s)\b/g, ' ')
    .replace(/\b(?:sale|discount|discounted|offer|offers|saving|savings|new|newest|latest|arrival|arrivals)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return {
    category,
    maxPrice,
    minPrice,
    saleOnly,
    searchTerm,
    sizes: Array.from(sizes),
    sort,
  }
}

function applySearchIntent(input: ProductSearchInput, intent: SearchIntent): ProductSearchInput {
  return {
    ...input,
    category: input.category === 'all' && intent.category ? intent.category : input.category,
    maxPrice:
      intent.maxPrice === undefined
        ? input.maxPrice
        : Math.min(input.maxPrice ?? intent.maxPrice, intent.maxPrice),
    minPrice:
      intent.minPrice === undefined
        ? input.minPrice
        : Math.max(input.minPrice ?? intent.minPrice, intent.minPrice),
    saleOnly: input.saleOnly || Boolean(intent.saleOnly),
    sizes: Array.from(new Set([...input.sizes, ...intent.sizes])),
    sort: input.sort === 'recommended' && intent.sort ? intent.sort : input.sort,
  }
}

function rupeesTextToPaise(value: string) {
  return Number(value.replace(/,/g, '')) * 100
}

function formatRupees(valuePaise: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(valuePaise / 100)
}
