import { createClient } from 'npm:@supabase/supabase-js@2.105.4'

import { handleCors, jsonResponse } from '../_shared/http/cors.ts'
import { RateLimitError, requireRateLimit } from '../_shared/http/rate-limit.ts'
import { createRazorpayOrder } from '../_shared/integrations/razorpay.ts'
import { calculateShippingPaise } from '../../../shared/shipping.ts'
import {
  isKnownIndianState,
  isPincodeLikelyForIndianState,
  isValidIndianPincode,
} from '../../../shared/indian-address.ts'

type CartItemInput = {
  productId: string
  variantId: string
  size: string
  quantity: number
}

type CustomerInput = {
  email: string
  fullName: string
  phone: string
  whatsappUpdatesOptIn: boolean
  addressLine: string
  landmark: string
  city: string
  state: string
  pincode: string
}

type ProductRow = {
  product_id: string
  title: string
  active: boolean
}

type VariantRow = {
  variant_id: string
  product_id: string
  product_code: string
  slug: string
  title: string
  images: string[]
  mrp_paise: number
  selling_price_paise: number
  min_order_quantity: number
  package_length_cm: number | null
  package_breadth_cm: number | null
  package_height_cm: number | null
  package_weight_kg: number | null
  active: boolean
}

type VariantSizeRow = {
  inventory_id: string
  variant_id: string
  size_label: string
  stock_available: number
  active: boolean
}

type CheckoutSupabaseClient = {
  from: (table: string) => any
  rpc: (name: string, args?: Record<string, unknown>) => Promise<{ data: unknown; error: unknown }>
}

const currency = 'INR'
const maxCheckoutQuantity = 20

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    requireRateLimit(request, {
      key: 'create-checkout-order',
      limit: 20,
      windowMs: 10 * 60 * 1000,
    })

    const body = await request.json().catch(() => null)
    const customer = normalizeCustomer(body?.customer)
    const items = normalizeCartItems(body?.items)

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      serviceRoleKey(),
      { auth: { persistSession: false } },
    )
    const productIds = [...new Set(items.map((item) => item.productId))]
    const variantIds = [...new Set(items.map((item) => item.variantId))]
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('product_id,title,active')
      .in('product_id', productIds)

    if (productError) throw productError

    const { data: variants, error: variantError } = await supabase
      .from('product_variants')
      .select('variant_id,product_id,product_code,slug,title,images,mrp_paise,selling_price_paise,min_order_quantity,package_length_cm,package_breadth_cm,package_height_cm,package_weight_kg,active')
      .in('variant_id', variantIds)

    if (variantError) throw variantError

    const inventoryIds = items.map((item) => createInventoryId(item.variantId, item.size))
    const { data: variantSizes, error: variantSizeError } = await supabase
      .from('product_variant_sizes')
      .select('inventory_id,variant_id,size_label,stock_available,active')
      .in('inventory_id', inventoryIds)

    if (variantSizeError) throw variantSizeError

    const productById = new Map(
      ((products ?? []) as ProductRow[]).map((product) => [product.product_id, product]),
    )
    const variantById = new Map(
      ((variants ?? []) as VariantRow[]).map((variant) => [variant.variant_id, variant]),
    )
    const variantSizeById = new Map(
      ((variantSizes ?? []) as VariantSizeRow[]).map((variantSize) => [
        variantSize.inventory_id,
        variantSize,
      ]),
    )
    const orderItems = items.map((item) => {
      const product = productById.get(item.productId)
      if (!product || !product.active) {
        throw new CheckoutError('One item in your bag is no longer available', 400)
      }

      const variant = variantById.get(item.variantId)
      if (
        !variant ||
        !variant.active ||
        variant.product_id !== product.product_id
      ) {
        throw new CheckoutError(`${product.title} is unavailable`, 400)
      }

      const inventoryId = createInventoryId(item.variantId, item.size)
      const variantSize = variantSizeById.get(inventoryId)

      if (
        !variantSize ||
        !variantSize.active ||
        variantSize.variant_id !== variant.variant_id ||
        variantSize.size_label !== item.size
      ) {
        throw new CheckoutError(`${variant.title} is unavailable in ${item.size}`, 400)
      }

      if (item.quantity < variant.min_order_quantity) {
        throw new CheckoutError(
          `Minimum order quantity for ${variant.title} is ${variant.min_order_quantity}`,
          400,
        )
      }

      if (variantSize.stock_available < 1) {
        throw new CheckoutError(`${variant.title} is sold out in ${item.size}`, 400)
      }

      if (item.quantity > variantSize.stock_available) {
        throw new CheckoutError(
          `Only ${variantSize.stock_available} item(s) available in ${item.size}`,
          400,
        )
      }

      return {
        product_id: product.product_id,
        variant_id: variant.variant_id,
        inventory_id: variantSize.inventory_id,
        product_slug: variant.slug,
        variant_slug: variant.slug,
        product_code: variant.product_code,
        title: variant.title,
        size_label: variantSize.size_label,
        quantity: item.quantity,
        unit_selling_price_paise: variant.selling_price_paise,
        unit_mrp_paise: variant.mrp_paise,
        discount_amount_paise: Math.max(0, variant.mrp_paise - variant.selling_price_paise),
        line_total_paise: variant.selling_price_paise * item.quantity,
        primary_image_url: variant.images[0] ?? null,
        package_length_cm: variant.package_length_cm,
        package_breadth_cm: variant.package_breadth_cm,
        package_height_cm: variant.package_height_cm,
        package_weight_kg: variant.package_weight_kg,
      }
    })
    const subtotal = orderItems.reduce((total, item) => total + item.line_total_paise, 0)
    const shipping = calculateShippingPaise(subtotal)
    const total = subtotal + shipping

    if (total < 100) {
      throw new CheckoutError('Checkout amount must be at least INR 1', 400)
    }

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        order_number: createOrderNumber(),
        invoice_number: await createInvoiceNumber(supabase),
        status: 'payment_pending',
        currency,
        subtotal_amount_paise: subtotal,
        shipping_amount_paise: shipping,
        total_amount_paise: total,
        customer_email: customer.email,
        customer_name: customer.fullName,
        customer_phone: customer.phone,
        whatsapp_updates_opt_in: customer.whatsappUpdatesOptIn,
        shipping_address: {
          addressLine: customer.addressLine,
          landmark: customer.landmark,
          city: customer.city,
          state: customer.state,
          pincode: customer.pincode,
        },
      })
      .select('id,order_number,invoice_number')
      .single()

    if (orderError) throw orderError

    const orderId = String(order.id)
    const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItems.map((item) => ({ ...item, order_id: orderId })))

    if (itemsError) throw itemsError

    const keyId = requiredEnv('RAZORPAY_KEY_ID')
    const razorpayOrder = await createRazorpayOrder({
      keyId,
      keySecret: requiredEnv('RAZORPAY_KEY_SECRET'),
      amount: total,
      currency,
      receipt: String(order.invoice_number).slice(0, 40),
      notes: {
        orderId,
        orderNumber: String(order.order_number),
        invoiceNumber: String(order.invoice_number),
        customerEmail: customer.email,
      },
    }).catch(async (error) => {
      await markOrderPaymentFailed(supabase, orderId)
      await logCheckoutIntegrationError(supabase, {
        orderId,
        source: 'razorpay',
        eventType: 'create_order',
        error,
        payload: {
          orderNumber: String(order.order_number),
          invoiceNumber: String(order.invoice_number),
          amount: total,
          currency,
          keyIdPrefix: keyId.slice(0, 8),
        },
      })

      throw error
    })

    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        order_id: orderId,
        provider: 'razorpay',
        provider_order_id: razorpayOrder.id,
        status: 'created',
        amount_paise: total,
        currency,
        raw_payload: razorpayOrder,
      })

    if (paymentError) {
      await markOrderPaymentFailed(supabase, orderId)
      await logCheckoutIntegrationError(supabase, {
        orderId,
        source: 'supabase',
        eventType: 'create_payment_row',
        error: paymentError,
        payload: {
          orderNumber: String(order.order_number),
          invoiceNumber: String(order.invoice_number),
          razorpayOrderId: razorpayOrder.id,
        },
      })

      throw paymentError
    }

    return jsonResponse({
      keyId,
      orderUuid: orderId,
      orderNumber: order.order_number,
      invoiceNumber: order.invoice_number,
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      totals: {
        subtotal,
        shipping,
        total,
      },
    })
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

    if (error instanceof CheckoutError) {
      return jsonResponse({ error: error.message }, { status: error.status })
    }

    console.error(error)
    return jsonResponse({ error: 'Unable to create checkout order' }, { status: 500 })
  }
})

function normalizeCartItems(value: unknown): CartItemInput[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new CheckoutError('Your bag is empty', 400)
  }

  if (value.length > 50) {
    throw new CheckoutError('Too many cart lines', 400)
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') {
      throw new CheckoutError('Invalid cart item', 400)
    }

    const input = item as Partial<CartItemInput>
    const productId = String(input.productId ?? '').trim()
    const variantId = String(input.variantId ?? '').trim()
    const size = String(input.size ?? '').trim()
    const quantity = Number(input.quantity)

    if (!productId || !variantId || !size || !Number.isInteger(quantity) || quantity < 1) {
      throw new CheckoutError('Invalid cart item', 400)
    }

    if (quantity > maxCheckoutQuantity) {
      throw new CheckoutError(`Quantity cannot exceed ${maxCheckoutQuantity}`, 400)
    }

    return { productId, variantId, size, quantity }
  })
}

function createInventoryId(variantId: string, size: string) {
  return `${variantId}:${size.trim().toLowerCase()}`
}

function normalizeCustomer(value: unknown): CustomerInput {
  if (!value || typeof value !== 'object') {
    throw new CheckoutError('Delivery details are required', 400)
  }

  const input = value as Partial<CustomerInput> & {
    address?: string
    postalCode?: string
  }
  const customer = {
    email: String(input.email ?? '').trim(),
    fullName: String(input.fullName ?? '').trim(),
    phone: String(input.phone ?? '').trim(),
    whatsappUpdatesOptIn: input.whatsappUpdatesOptIn === true,
    addressLine: String(input.addressLine ?? input.address ?? '').trim(),
    landmark: String(input.landmark ?? '').trim(),
    city: String(input.city ?? '').trim(),
    state: String(input.state ?? '').trim(),
    pincode: String(input.pincode ?? input.postalCode ?? '').trim(),
  }

  const requiredFields = [
    customer.email,
    customer.fullName,
    customer.phone,
    customer.addressLine,
    customer.city,
    customer.state,
    customer.pincode,
  ]

  if (requiredFields.some((field) => field.length === 0)) {
    throw new CheckoutError('Complete delivery details to continue', 400)
  }

  if (!/^\S+@\S+\.\S+$/.test(customer.email)) {
    throw new CheckoutError('Enter a valid email address', 400)
  }

  if (customer.fullName.length < 2) {
    throw new CheckoutError('Enter the full name for delivery', 400)
  }

  if (!/^\+?\d{10,15}$/.test(customer.phone.replace(/\s/g, ''))) {
    throw new CheckoutError('Enter a valid phone number', 400)
  }

  if (customer.addressLine.length < 8) {
    throw new CheckoutError('Enter a complete delivery address', 400)
  }

  if (!/^[A-Za-z][A-Za-z .'-]{1,79}$/.test(customer.city)) {
    throw new CheckoutError('Enter a valid city or town', 400)
  }

  if (!isKnownIndianState(customer.state)) {
    throw new CheckoutError('Select a valid state or union territory', 400)
  }

  if (!isValidIndianPincode(customer.pincode)) {
    throw new CheckoutError('Enter a valid 6 digit pincode', 400)
  }

  if (!isPincodeLikelyForIndianState(customer.pincode, customer.state)) {
    throw new CheckoutError('Pincode does not look valid for the selected state', 400)
  }

  return customer
}

function createOrderNumber() {
  const date = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date()).replaceAll('-', '')
  const suffix = crypto.randomUUID().replaceAll('-', '').slice(0, 8).toUpperCase()

  return `KJ-${date}-${suffix}`
}

async function createInvoiceNumber(supabase: CheckoutSupabaseClient) {
  const { data, error } = await supabase.rpc('next_invoice_number')
  if (error) throw error

  const invoiceNumber = typeof data === 'string' ? data : ''
  if (!/^KJ\/ECOM\/\d{3,}\/\d{2}-\d{2}$/.test(invoiceNumber)) {
    throw new CheckoutError('Unable to reserve invoice number', 500)
  }

  return invoiceNumber
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new CheckoutError(`${name} is not configured`, 503)
  return value
}

function serviceRoleKey() {
  return Deno.env.get('OPS_SERVICE_ROLE_KEY') || requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
}

async function logCheckoutIntegrationError(
  supabase: CheckoutSupabaseClient,
  input: {
    orderId: string
    source: string
    eventType: string
    error: unknown
    payload: Record<string, unknown>
  },
) {
  const message = readErrorMessage(input.error)
  const { error } = await supabase.from('integration_events').insert({
    source: input.source,
    event_type: input.eventType,
    order_id: input.orderId,
    status: 'failed',
    payload: input.payload,
    error_message: message,
  })

  if (error) {
    console.error('Unable to log checkout integration error', error)
  }

  console.error('checkout integration failed', {
    source: input.source,
    eventType: input.eventType,
    orderId: input.orderId,
    message,
  })
}

async function markOrderPaymentFailed(supabase: CheckoutSupabaseClient, orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'payment_failed' })
    .eq('id', orderId)

  if (error) {
    console.error('Unable to mark checkout order payment_failed', error)
  }
}

function readErrorMessage(error: unknown) {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }

  return 'checkout_integration_failed'
}

class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message)
  }
}
