import { products, type Product } from '../data/products'
import { formatPrice } from './format'
import { getProductReasons } from './product-insights'

export type StyleFinderOccasion = 'any' | 'everyday' | 'work' | 'function' | 'gift'
export type StyleFinderPreference = 'any' | 'short' | 'long' | 'set'
export type StyleFinderBudget = 'any' | 'under-1500' | 'under-2000'

export type StyleFinderAnswers = {
  budget: StyleFinderBudget
  occasion: StyleFinderOccasion
  preference: StyleFinderPreference
  size: string
}

export type StyleFinderResult = {
  product: Product
  reasons: string[]
  score: number
}

const defaultAnswers: StyleFinderAnswers = {
  budget: 'any',
  occasion: 'any',
  preference: 'any',
  size: 'any',
}

export function getDefaultStyleFinderAnswers() {
  return { ...defaultAnswers }
}

export function getStyleFinderResults(answers: StyleFinderAnswers, limit = 3) {
  return products
    .map((product) => scoreProduct(product, answers))
    .filter((result) => result.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        Number(right.product.featured) - Number(left.product.featured) ||
        left.product.sellingPricePaise - right.product.sellingPricePaise,
    )
    .slice(0, limit)
}

function scoreProduct(product: Product, answers: StyleFinderAnswers): StyleFinderResult {
  const text = `${product.title} ${product.description}`.toLowerCase()
  const isSet = isSetProduct(product)
  const reasons: string[] = []
  let score = product.featured ? 2 : 1

  if (answers.size !== 'any') {
    const hasSize = product.sizes.some(
      (size) => size.label === answers.size && size.stockAvailable > 0,
    )

    if (!hasSize) {
      return { product, reasons: [], score: 0 }
    }

    score += 5
    reasons.push(`Available in ${answers.size}`)
  }

  if (answers.budget === 'under-1500') {
    if (product.sellingPricePaise > 150000) return { product, reasons: [], score: 0 }
    score += 4
    reasons.push(`Under ${formatPrice(150000)}`)
  }

  if (answers.budget === 'under-2000') {
    if (product.sellingPricePaise > 200000) return { product, reasons: [], score: 0 }
    score += 3
    reasons.push(`Under ${formatPrice(200000)}`)
  }

  if (answers.preference === 'set') {
    if (!isSet) return { product, reasons: [], score: 0 }
    score += 5
    reasons.push('Curated set')
  }

  if (answers.preference === 'short') {
    if (!text.includes('short')) return { product, reasons: [], score: 0 }
    score += 5
    reasons.push('Minimal profile')
  }

  if (answers.preference === 'long') {
    if (!text.includes('long')) return { product, reasons: [], score: 0 }
    score += 5
    reasons.push('Statement silhouette')
  }

  if (answers.occasion === 'everyday') {
    if (text.includes('everyday') || text.includes('warm days') || text.includes('quick plans')) {
      score += 4
      reasons.push('Easy everyday styling')
    }
  }

  if (answers.occasion === 'work') {
    if (text.includes('clean') || text.includes('polished') || text.includes('structured')) {
      score += 4
      reasons.push('Polished enough for work')
    }
  }

  if (answers.occasion === 'function') {
    if (
      isSet ||
      text.includes('festive') ||
      text.includes('puja') ||
      text.includes('occasion')
    ) {
      score += 4
      reasons.push('Works for special occasions')
    }
  }

  if (answers.occasion === 'gift') {
    score += isSet ? 3 : 2
    reasons.push(isSet ? 'Curated pairing for gifting' : 'Easy piece to gift')
  }

  return {
    product,
    reasons: Array.from(new Set([...reasons, ...getProductReasons(product, 2)])).slice(0, 3),
    score,
  }
}

function isSetProduct(product: Product) {
  const categoryText = `${product.category} ${product.categoryLabel}`.toLowerCase()
  return categoryText.includes('set')
}
