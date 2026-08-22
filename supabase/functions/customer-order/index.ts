import { createClient, type SupabaseClient } from 'npm:@supabase/supabase-js@2.105.4'

import { handleCors, jsonResponse } from '../_shared/http/cors.ts'
import { RateLimitError, requireRateLimit } from '../_shared/http/rate-limit.ts'

type CustomerOrderAction = 'lookup' | 'request_return'

type OrderLookupCriteria = {
  orderLookup?: string
  phone?: {
    normalized: string
    lookupValues: string[]
  }
}

type OrderItemRow = {
  id: string
  product_slug: string
  variant_slug: string
  product_code: string
  title: string
  size_label: string
  quantity: number
  unit_selling_price_paise: number
  unit_mrp_paise: number
  discount_amount_paise: number
  line_total_paise: number
  primary_image_url: string | null
}

type PaymentRow = {
  status: string
  amount_paise: number
  currency: string
  verified_at: string | null
  created_at: string
}

type ShipmentRow = {
  provider: string
  status: string
  provider_status: string | null
  tracking_number: string | null
  created_at: string
  updated_at: string
}

type ReturnRequestRow = {
  id: string
  status: string
  reason: string
  customer_note: string | null
  created_at: string
}

type OrderRow = {
  id: string
  order_number: string
  invoice_number: string | null
  status: string
  currency: string
  subtotal_amount_paise: number
  shipping_amount_paise: number
  total_amount_paise: number
  customer_name: string
  customer_phone: string
  customer_email: string
  shipping_address: Record<string, unknown>
  created_at: string
  order_items?: OrderItemRow[] | OrderItemRow | null
  payments?: PaymentRow[] | PaymentRow | null
  shipments?: ShipmentRow[] | ShipmentRow | null
  order_return_requests?: ReturnRequestRow[] | ReturnRequestRow | null
}

const allowedReturnReasons = new Set([
  'size_issue',
  'damaged_or_defective',
  'wrong_item',
  'quality_issue',
  'changed_mind',
  'other',
])

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    requireRateLimit(request, {
      key: 'customer-order',
      limit: 12,
      windowMs: 10 * 60 * 1000,
    })

    const body = await request.json().catch(() => null)
    const action = normalizeAction(body?.action)
    const lookupCriteria = normalizeLookupCriteria(body)

    await verifyTurnstileIfConfigured(body?.turnstileToken, request)

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    )
    const order = await loadCustomerOrder(supabase, lookupCriteria)

    if (action === 'request_return') {
      const reason = normalizeReturnReason(body?.reason)
      const customerNote = normalizeCustomerNote(body?.note)
      const existingActiveReturn = relationRows(order.order_return_requests).find((requestRow) =>
        ['requested', 'reviewing', 'approved', 'pickup_scheduled'].includes(requestRow.status),
      )

      if (existingActiveReturn) {
        throw new CustomerOrderError('A return request is already open for this order.', 409)
      }

      if (!isReturnRequestAllowed(order)) {
        throw new CustomerOrderError('This order is not eligible for a return request yet.', 409)
      }

      const requestedItems = relationRows(order.order_items).map((item) => ({
        itemId: item.id,
        productCode: item.product_code,
        title: item.title,
        size: item.size_label,
        quantity: item.quantity,
      }))
      const { error: insertError } = await supabase
        .from('order_return_requests')
        .insert({
          order_id: order.id,
          order_number: order.order_number,
          customer_phone: lookupCriteria.phone?.normalized ?? order.customer_phone,
          reason,
          customer_note: customerNote,
          requested_items: requestedItems,
        })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new CustomerOrderError('A return request is already open for this order.', 409)
        }

        throw insertError
      }

      const updatedOrder = await loadCustomerOrder(supabase, {
        orderLookup: order.order_number,
        phone: {
          normalized: order.customer_phone,
          lookupValues: createPhoneLookupValues(order.customer_phone),
        },
      })
      return jsonResponse({ order: serializeCustomerOrder(updatedOrder), returnRequested: true })
    }

    return jsonResponse({ order: serializeCustomerOrder(order), returnRequested: false })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonResponse(
        { error: error.message },
        {
          status: error.status,
          headers: { 'Retry-After': String(error.retryAfterSeconds) },
        },
      )
    }

    if (error instanceof CustomerOrderError) {
      return jsonResponse({ error: error.message }, { status: error.status })
    }

    console.error(error)
    return jsonResponse({ error: 'Unable to load order details' }, { status: 500 })
  }
})

async function loadCustomerOrder(
  supabase: SupabaseClient,
  criteria: OrderLookupCriteria,
) {
  let query = supabase
    .from('orders')
    .select(
      'id,order_number,invoice_number,status,currency,subtotal_amount_paise,shipping_amount_paise,total_amount_paise,customer_name,customer_phone,customer_email,shipping_address,created_at,order_items(id,product_slug,variant_slug,product_code,title,size_label,quantity,unit_selling_price_paise,unit_mrp_paise,discount_amount_paise,line_total_paise,primary_image_url),payments(status,amount_paise,currency,verified_at,created_at),shipments(provider,status,provider_status,tracking_number,created_at,updated_at),order_return_requests(id,status,reason,customer_note,created_at)',
    )

  if (criteria.orderLookup) {
    query = query.or(
      `order_number.eq.${escapePostgrestValue(criteria.orderLookup)},invoice_number.eq.${escapePostgrestValue(criteria.orderLookup)}`,
    )
  }

  if (criteria.phone) {
    query = query.in('customer_phone', criteria.phone.lookupValues)
  }

  const { data, error } = await query
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  if (!data) throw new CustomerOrderError('No matching order found.', 404)

  return data as OrderRow
}

function serializeCustomerOrder(order: OrderRow) {
  const latestPayment = relationRows(order.payments).sort(compareCreatedDesc)[0] ?? null
  const latestShipment = relationRows(order.shipments).sort(compareUpdatedDesc)[0] ?? null
  const returnRequests = relationRows(order.order_return_requests).sort(compareCreatedDesc)
  const trackingNumber = latestShipment?.tracking_number ?? null

  return {
    orderNumber: order.order_number,
    invoiceNumber: order.invoice_number,
    status: order.status,
    currency: order.currency,
    subtotalAmountPaise: order.subtotal_amount_paise,
    shippingAmountPaise: order.shipping_amount_paise,
    totalAmountPaise: order.total_amount_paise,
    customerName: order.customer_name,
    customerEmail: maskEmail(order.customer_email),
    customerPhone: maskPhone(order.customer_phone),
    shippingAddress: summarizeAddress(order.shipping_address),
    createdAt: order.created_at,
    items: relationRows(order.order_items).map((item) => ({
      id: item.id,
      productSlug: item.product_slug,
      variantSlug: item.variant_slug,
      productCode: item.product_code,
      title: item.title,
      size: item.size_label,
      quantity: item.quantity,
      unitSellingPricePaise: item.unit_selling_price_paise,
      unitMrpPaise: item.unit_mrp_paise,
      discountAmountPaise: item.discount_amount_paise,
      lineTotalPaise: item.line_total_paise,
      primaryImageUrl: item.primary_image_url,
    })),
    payment: latestPayment
      ? {
          status: latestPayment.status,
          amountPaise: latestPayment.amount_paise,
          currency: latestPayment.currency,
          verifiedAt: latestPayment.verified_at,
        }
      : null,
    shipment: latestShipment
      ? {
          provider: latestShipment.provider,
          status: latestShipment.status,
          providerStatus: latestShipment.provider_status,
          trackingNumber,
          trackingUrl:
            latestShipment.provider === 'delhivery' && trackingNumber
              ? `https://www.delhivery.com/track-v2/package/${encodeURIComponent(trackingNumber)}`
              : null,
          updatedAt: latestShipment.updated_at,
        }
      : null,
    returnRequests: returnRequests.map((returnRequest) => ({
      id: returnRequest.id,
      status: returnRequest.status,
      reason: returnRequest.reason,
      note: returnRequest.customer_note,
      createdAt: returnRequest.created_at,
    })),
    canRequestReturn: isReturnRequestAllowed(order) && returnRequests.every((returnRequest) =>
      !['requested', 'reviewing', 'approved', 'pickup_scheduled'].includes(returnRequest.status),
    ),
  }
}

function normalizeAction(value: unknown): CustomerOrderAction {
  const action = String(value ?? 'lookup').trim()
  if (action === 'lookup' || action === 'request_return') return action
  throw new CustomerOrderError('Invalid order action.', 400)
}

function normalizeLookupCriteria(body: Record<string, unknown> | null): OrderLookupCriteria {
  const rawLookup = String(body?.lookup ?? '').trim()
  const rawOrderNumber = String(body?.orderNumber ?? '').trim()
  const rawPhone = String(body?.phone ?? '').trim()
  const criteria: OrderLookupCriteria = {}

  if (rawOrderNumber) {
    criteria.orderLookup = normalizeOrderLookup(rawOrderNumber)
  }

  if (rawPhone) {
    criteria.phone = normalizePhone(rawPhone)
  }

  if (rawLookup) {
    if (looksLikePhone(rawLookup)) {
      criteria.phone = normalizePhone(rawLookup)
    } else {
      criteria.orderLookup = normalizeOrderLookup(rawLookup)
    }
  }

  if (!criteria.orderLookup && !criteria.phone) {
    throw new CustomerOrderError('Enter an order ID, invoice number, or phone number.', 400)
  }

  return criteria
}

function normalizeOrderLookup(value: unknown) {
  const orderLookup = String(value ?? '').trim().toUpperCase()
  if (/^KJ-\d{8}-[A-Z0-9]{6,8}$/.test(orderLookup) || /^KJ\/ECOM\/\d{3,}\/\d{2}-\d{2}$/.test(orderLookup)) {
    return orderLookup
  }

  throw new CustomerOrderError('Enter a valid order or invoice number.', 400)
}

function escapePostgrestValue(value: string) {
  return value.replace(/["\\]/g, '\\$&')
}

function normalizePhone(value: unknown) {
  const rawPhone = String(value ?? '').trim()
  const digits = rawPhone.replace(/\D/g, '')

  if (/^\+\d{10,15}$/.test(rawPhone.replace(/\s/g, ''))) {
    const normalized = rawPhone.replace(/\s/g, '')
    return { normalized, lookupValues: createPhoneLookupValues(normalized) }
  }
  if (/^\d{10}$/.test(digits)) {
    const normalized = `+91${digits}`
    return { normalized, lookupValues: createPhoneLookupValues(normalized) }
  }
  if (/^91\d{10}$/.test(digits)) {
    const normalized = `+${digits}`
    return { normalized, lookupValues: createPhoneLookupValues(normalized) }
  }

  throw new CustomerOrderError('Enter the phone number used for this order.', 400)
}

function looksLikePhone(value: string) {
  const digits = value.replace(/\D/g, '')
  return /^\+?\d[\d\s()-]{8,}$/.test(value) && (digits.length === 10 || digits.length === 12)
}

function createPhoneLookupValues(value: string) {
  const digits = value.replace(/\D/g, '')
  const lookupValues = new Set<string>()
  const normalized = digits.startsWith('91') && digits.length === 12 ? `+${digits}` : value

  if (normalized) lookupValues.add(normalized)
  if (digits.length === 10) {
    lookupValues.add(digits)
    lookupValues.add(`+91${digits}`)
  }
  if (digits.length === 12 && digits.startsWith('91')) {
    lookupValues.add(digits.slice(2))
    lookupValues.add(`+${digits}`)
  }

  return [...lookupValues]
}

function normalizeReturnReason(value: unknown) {
  const reason = String(value ?? '').trim()
  if (!allowedReturnReasons.has(reason)) {
    throw new CustomerOrderError('Select a valid return reason.', 400)
  }

  return reason
}

function normalizeCustomerNote(value: unknown) {
  const note = String(value ?? '').trim()
  if (note.length > 600) {
    throw new CustomerOrderError('Return note must be 600 characters or less.', 400)
  }

  return note || null
}

function isReturnRequestAllowed(order: OrderRow) {
  const payment = relationRows(order.payments).sort(compareCreatedDesc)[0]
  if (!payment || payment.status !== 'verified') return false

  return ['paid', 'shipment_pending', 'shipped', 'delivered'].includes(order.status)
}

function relationRows<Row>(value: Row[] | Row | null | undefined): Row[] {
  if (!value) return []
  return Array.isArray(value) ? value : [value]
}

async function verifyTurnstileIfConfigured(token: unknown, request: Request) {
  const secret = Deno.env.get('TURNSTILE_SECRET_KEY')
  if (!secret) return

  const responseToken = String(token ?? '').trim()
  if (!responseToken) {
    throw new CustomerOrderError('Complete the verification challenge.', 400)
  }

  const formData = new FormData()
  formData.set('secret', secret)
  formData.set('response', responseToken)
  const remoteIp = request.headers.get('cf-connecting-ip')
  if (remoteIp) formData.set('remoteip', remoteIp)

  const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
    method: 'POST',
    body: formData,
  })
  const result = await response.json().catch(() => null)

  if (!response.ok || !result?.success) {
    throw new CustomerOrderError('Verification failed. Please try again.', 400)
  }
}

function compareCreatedDesc(left: { created_at: string }, right: { created_at: string }) {
  return Date.parse(right.created_at) - Date.parse(left.created_at)
}

function compareUpdatedDesc(left: { updated_at: string }, right: { updated_at: string }) {
  return Date.parse(right.updated_at) - Date.parse(left.updated_at)
}

function summarizeAddress(value: Record<string, unknown>) {
  return {
    city: readString(value.city),
    state: readString(value.state),
    pincode: readString(value.pincode),
  }
}

function maskEmail(value: string) {
  const [local = '', domain = ''] = value.split('@')
  if (!local || !domain) return ''
  return `${local.slice(0, 2)}***@${domain}`
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '')
  if (digits.length < 4) return ''
  return `******${digits.slice(-4)}`
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new CustomerOrderError(`${name} is not configured`, 503)
  return value
}

class CustomerOrderError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message)
  }
}
