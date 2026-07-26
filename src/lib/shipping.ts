import {
  calculateShippingPaise,
  getFreeShippingRemainingPaise,
  shippingConfig,
} from '#shared/shipping'

import { formatPrice } from './format'

export { calculateShippingPaise, getFreeShippingRemainingPaise, shippingConfig }

export function formatShippingAmount(shippingPaise: number) {
  return shippingPaise === 0 ? 'Free' : formatPrice(shippingPaise)
}

export function getFreeShippingMessage(subtotalPaise: number) {
  const remainingPaise = getFreeShippingRemainingPaise(subtotalPaise)

  if (remainingPaise === 0 && subtotalPaise > 0) {
    return 'Your bag qualifies for free shipping.'
  }

  return `Add ${formatPrice(remainingPaise)} more for free shipping.`
}
