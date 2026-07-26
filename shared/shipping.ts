export type ShippingConfig = {
  freeShippingThresholdPaise: number
  standardShippingPaise: number
}

export const shippingConfig = {
  freeShippingThresholdPaise: 49900,
  standardShippingPaise: 10000,
} satisfies ShippingConfig

export function calculateShippingPaise(
  subtotalPaise: number,
  config: ShippingConfig = shippingConfig,
) {
  assertValidMoneyAmount(subtotalPaise, 'subtotalPaise')
  assertValidMoneyAmount(config.freeShippingThresholdPaise, 'freeShippingThresholdPaise')
  assertValidMoneyAmount(config.standardShippingPaise, 'standardShippingPaise')

  if (subtotalPaise <= 0) return 0
  if (subtotalPaise >= config.freeShippingThresholdPaise) return 0
  return config.standardShippingPaise
}

export function getFreeShippingRemainingPaise(
  subtotalPaise: number,
  config: ShippingConfig = shippingConfig,
) {
  assertValidMoneyAmount(subtotalPaise, 'subtotalPaise')
  assertValidMoneyAmount(config.freeShippingThresholdPaise, 'freeShippingThresholdPaise')

  return Math.max(0, config.freeShippingThresholdPaise - subtotalPaise)
}

function assertValidMoneyAmount(value: number, name: string) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${name} must be a non-negative integer paise amount`)
  }
}
