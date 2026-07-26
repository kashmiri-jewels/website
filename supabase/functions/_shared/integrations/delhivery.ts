import type { OrderForShipment, ShipmentRow } from '../domain/shipments.ts'

export type DelhiveryShipmentResult =
  | {
      ok: true
      providerOrderId: string | null
      trackingNumber: string | null
      rawPayload: unknown
    }
  | {
      ok: false
      skipped?: boolean
      reason: string
      rawPayload?: unknown
    }

export async function createDelhiveryShipment(input: {
  order: OrderForShipment
  shipment: ShipmentRow
}): Promise<DelhiveryShipmentResult> {
  if (Deno.env.get('DELHIVERY_ENABLED') !== 'true') {
    return {
      ok: false,
      skipped: true,
      reason: 'delhivery_disabled',
    }
  }

  const apiToken = Deno.env.get('DELHIVERY_API_TOKEN')
  const apiUrl = Deno.env.get('DELHIVERY_CREATE_SHIPMENT_URL')

  if (!apiToken || !apiUrl) {
    return {
      ok: false,
      reason: 'delhivery_config_missing',
    }
  }

  const payloadResult = buildShipmentPayload(input.order, input.shipment)
  if (!payloadResult.ok) return payloadResult

  const payload = payloadResult.payload
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      Authorization: `Token ${apiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      format: 'json',
      data: JSON.stringify(payload),
    }),
  })
  const responsePayload = await response.json().catch(() => null)
  const providerError = readProviderError(responsePayload)

  if (!response.ok || isProviderFailure(responsePayload)) {
    return {
      ok: false,
      reason: providerError ?? `delhivery_http_${response.status}`,
      rawPayload: responsePayload,
    }
  }

  return {
    ok: true,
    providerOrderId: pickString(responsePayload, [
      'order_id',
      'orderId',
      'shipment_id',
      'shipmentId',
      'refnum',
    ]),
    trackingNumber: pickString(responsePayload, [
      'waybill',
      'awb',
      'tracking_number',
      'trackingNumber',
    ]),
    rawPayload: responsePayload,
  }
}

function buildShipmentPayload(
  order: OrderForShipment,
  shipment: ShipmentRow,
): { ok: true; payload: Record<string, unknown> } | Extract<DelhiveryShipmentResult, { ok: false }> {
  const address = order.shipping_address
  const pickupLocationName = Deno.env.get('DELHIVERY_PICKUP_LOCATION')
  const sellerGst = Deno.env.get('DELHIVERY_SELLER_GST')
  const hsnCode = Deno.env.get('DELHIVERY_HSN_CODE')
  const packageSize = calculatePackageSize(order)

  if (!pickupLocationName) {
    return { ok: false, reason: 'delhivery_pickup_location_missing' }
  }
  if (!sellerGst) {
    return { ok: false, reason: 'delhivery_seller_gst_missing' }
  }
  if (!hsnCode) {
    return { ok: false, reason: 'delhivery_hsn_code_missing' }
  }

  try {
    return {
      ok: true,
      payload: {
        shipments: [
          {
            order: order.order_number,
            waybill: '',
            name: order.customer_name,
            phone: order.customer_phone,
            add: formatAddress(address),
            city: requiredAddressPart(address, 'city'),
            state: requiredAddressPart(address, 'state'),
            pin: requiredAddressPart(address, 'pincode', 'postalCode'),
            country: 'India',
            payment_mode: 'Prepaid',
            cod_amount: '0',
            total_amount: paiseToRupees(order.total_amount_paise),
            quantity: String(totalQuantity(order)),
            products_desc: productDescription(order),
            weight: packageSize.weightGrams,
            shipment_length: packageSize.lengthCm,
            shipment_width: packageSize.breadthCm,
            shipment_height: packageSize.heightCm,
            seller_gst_tin: sellerGst,
            hsn_code: hsnCode,
            extra_parameters: {
              kashmiriJewelsOrderId: order.id,
              kashmiriJewelsShipmentId: shipment.id,
              customerEmail: order.customer_email,
              currency: order.currency,
            },
          },
        ],
        pickup_location: {
          name: pickupLocationName,
        },
      },
    }
  } catch (error) {
    if (error instanceof DelhiveryConfigError) {
      return { ok: false, reason: error.message }
    }

    throw error
  }
}

function requiredAddressPart(address: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const value = address[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
    if (typeof value === 'number') return String(value)
  }

  throw new DelhiveryConfigError(`Order shipping address is missing ${keys.join('/')}`)
}

function formatAddress(address: Record<string, unknown>) {
  const addressLine = requiredAddressPart(address, 'address', 'addressLine')
  const landmark = address.landmark

  if (typeof landmark === 'string' && landmark.trim()) {
    return `${addressLine}, ${landmark.trim()}`
  }

  return addressLine
}

function paiseToRupees(value: number) {
  return String(Math.round(value) / 100)
}

function totalQuantity(order: OrderForShipment) {
  return order.order_items.reduce((total, item) => total + item.quantity, 0)
}

function productDescription(order: OrderForShipment) {
  return order.order_items
    .map((item) => `${item.title} ${item.size_label}`.trim())
    .join(', ')
    .slice(0, 250)
}

function calculatePackageSize(order: OrderForShipment) {
  const fallback = {
    breadthCm: readNumberEnv('DELHIVERY_PACKAGE_BREADTH_CM', 25),
    heightCm: readNumberEnv('DELHIVERY_PACKAGE_HEIGHT_CM', 5),
    lengthCm: readNumberEnv('DELHIVERY_PACKAGE_LENGTH_CM', 30),
    weightGrams: readNumberEnv('DELHIVERY_PACKAGE_WEIGHT_GRAMS', 500),
  }
  const sizedItems = order.order_items.flatMap((item) => {
    const length = readPositiveNumber(item.package_length_cm)
    const breadth = readPositiveNumber(item.package_breadth_cm)
    const height = readPositiveNumber(item.package_height_cm)
    const weightKg = readPositiveNumber(item.package_weight_kg)

    if (!length || !breadth || !height || !weightKg) return []

    return [{
      breadthCm: Math.min(length, breadth),
      heightCm: height,
      lengthCm: Math.max(length, breadth),
      quantity: item.quantity,
      weightGrams: weightKg * 1000,
    }]
  })

  if (sizedItems.length === 0) return fallback

  return {
    breadthCm: Math.ceil(Math.max(...sizedItems.map((item) => item.breadthCm))),
    heightCm: Math.ceil(sizedItems.reduce((total, item) => total + item.heightCm * item.quantity, 0)),
    lengthCm: Math.ceil(Math.max(...sizedItems.map((item) => item.lengthCm))),
    weightGrams: Math.ceil(sizedItems.reduce((total, item) => total + item.weightGrams * item.quantity, 0)),
  }
}

function readPositiveNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function readNumberEnv(name: string, fallback: number) {
  const value = Number(Deno.env.get(name))
  return Number.isFinite(value) && value > 0 ? value : fallback
}

function pickString(value: unknown, keys: string[]) {
  if (!value || typeof value !== 'object') return null

  for (const key of keys) {
    const nested = findNestedValue(value as Record<string, unknown>, key)
    if (typeof nested === 'string' && nested.trim()) return nested.trim()
    if (typeof nested === 'number') return String(nested)
  }

  return null
}

function findNestedValue(value: Record<string, unknown>, key: string): unknown {
  if (key in value) return value[key]

  for (const nested of Object.values(value)) {
    if (Array.isArray(nested)) {
      for (const item of nested) {
        if (item && typeof item === 'object') {
          const result = findNestedValue(item as Record<string, unknown>, key)
          if (result !== undefined) return result
        }
      }
    }

    if (nested && typeof nested === 'object') {
      const result = findNestedValue(nested as Record<string, unknown>, key)
      if (result !== undefined) return result
    }
  }

  return undefined
}

function readProviderError(value: unknown) {
  return pickString(value, ['rmk', 'remark', 'error', 'message', 'description'])
}

function isProviderFailure(value: unknown) {
  if (!value || typeof value !== 'object') return false

  const payload = value as Record<string, unknown>
  if (payload.success === false) return true
  if (payload.error === true) return true
  if (typeof payload.error === 'string' && payload.error.trim()) return true

  return false
}

class DelhiveryConfigError extends Error {}
