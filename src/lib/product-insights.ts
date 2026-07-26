import type { Product } from '../data/products'
import { formatPrice } from './format'

export function getProductReasons(product: Product, limit = 3) {
  const text = `${product.title} ${product.description}`.toLowerCase()
  const reasons: string[] = []

  if (text.includes('short')) {
    reasons.push('Easy short length for daily styling')
  } else if (text.includes('long')) {
    reasons.push('Long silhouette for a polished look')
  } else if (product.category === 'sets') {
    reasons.push('Coordinated set, no extra pairing needed')
  }

  if (text.includes('belt') || text.includes('waist')) {
    reasons.push('Defined waist detail')
  }

  if (text.includes('festive') || text.includes('puja') || text.includes('occasion')) {
    reasons.push('Works for small functions and festive plans')
  } else if (text.includes('everyday') || text.includes('warm days') || text.includes('quick plans')) {
    reasons.push('Comfortable for repeat everyday wear')
  }

  const availableSizes = product.sizes
    .filter((size) => size.stockAvailable > 0)
    .map((size) => size.label)

  if (availableSizes.length > 0) {
    reasons.push(`Available in ${availableSizes.join(', ')}`)
  }

  if (product.discountPercent > 0) {
    reasons.push(`Save ${formatPrice(product.mrpPaise - product.sellingPricePaise)}`)
  }

  return Array.from(new Set(reasons)).slice(0, limit)
}
