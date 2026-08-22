import '@tanstack/react-start/server-only'

import { createRemoteJWKSet, jwtVerify } from 'jose'
import { env as workerEnv } from 'cloudflare:workers'
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { createClient } from '@supabase/supabase-js'
import {
  getRequestHeader,
  getRequestHost,
  setResponseHeader,
} from '@tanstack/react-start/server'

const adminViewLimit = 50
const recentOrdersLimit = 25
const productionSupabaseUrl = 'https://afsiomfcjayytqeqfojj.supabase.co'

const accessJwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>()

export type AdminOrderRow = {
  order_number: string
  invoice_number: string | null
  order_status: string
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  total_amount_paise: number | null
  currency: string | null
  payment_status: string | null
  shipment_status: string | null
  tracking_number: string | null
  created_at: string
  whatsapp_updates_opt_in?: boolean | null
}

export type AdminIntegrationErrorRow = {
  source: string | null
  event_type: string | null
  status: string | null
  order_number: string | null
  error_message: string | null
  created_at: string
}

export type AdminLowStockVariantRow = {
  product_id: string
  slug: string
  title: string
  category: string
  variant_id: string
  size_label: string
  stock_available: number
  variant_active: boolean
  product_active: boolean
}

export type AdminReturnRequestRow = {
  id: string
  order_number: string
  status: string
  reason: string
  customer_note: string | null
  customer_name: string | null
  customer_phone: string | null
  customer_email: string | null
  order_status: string | null
  total_amount_paise: number | null
  currency: string | null
  created_at: string
}

export type AdminDashboard = {
  adminEmail: string
  loadedAt: string
  shownCounts: {
    recentOrders: number
    shipmentPendingOrders: number
    paymentReviewOrders: number
    failedPayments: number
    integrationErrors: number
    lowStockVariants: number
    returnRequests: number
  }
  views: {
    recentOrders: AdminOrderRow[]
    shipmentPendingOrders: AdminOrderRow[]
    paymentReviewOrders: AdminOrderRow[]
    failedPayments: AdminOrderRow[]
    integrationErrors: AdminIntegrationErrorRow[]
    lowStockVariants: AdminLowStockVariantRow[]
    returnRequests: AdminReturnRequestRow[]
  }
}

export type RetryShipmentResult = {
  adminEmail: string
  orderNumber: string
  result: {
    ok: boolean
    orderId: string
    orderNumber: string
    orderStatus: string
    shipmentStatus: string
    provider: string
    providerOrderId: string | null
    trackingNumber: string | null
    providerAttempt: string
    reason?: string
  }
}

export type CancelOrderResult = {
  adminEmail: string
  orderNumber: string
  invoiceNumber: string | null
  status: string
  shipmentStatus: string | null
}

export type CatalogPublishEnvironment = 'qa' | 'prod'

export type CatalogPublishDispatchResult = {
  adminEmail: string
  environment: CatalogPublishEnvironment
  workflowFile: string
  ref: string
  actionsUrl: string
}

export type CatalogPublishStatus = {
  adminEmail: string
  workflowFile: string
  runs: CatalogPublishRun[]
}

export type CatalogPublishRun = {
  id: number
  name: string
  status: string
  conclusion: string | null
  branch: string
  event: string
  htmlUrl: string
  createdAt: string
  updatedAt: string
}

export type AdminInvoicePdf = {
  bytes: Uint8Array
  filename: string
}

export type AdminInvoiceDownload = {
  base64: string
  filename: string
}

export type AdminOrderDetails = InvoiceData

type AdminEnv = {
  adminEmails: string[]
  accessTeamDomain?: string
  accessAudience?: string
  adminDevEmail?: string
  adminDevBypass: boolean
  supabaseUrl: string
  supabaseServiceRoleKey: string
  opsServiceRoleKey: string
  githubActionsToken?: string
  githubRepository?: string
  catalogPublishWorkflowFile: string
  catalogPublishQaRef: string
  catalogPublishProdRef: string
  delhiveryApiToken?: string
  delhiveryCancelShipmentUrl: string
}

export async function loadAdminDashboard(): Promise<AdminDashboard> {
  setAdminResponseHeaders()

  try {
    const adminEmail = await requireAdminEmail()
    const env = readAdminEnv()
    const supabase = createAdminSupabaseClient(env)
    const [
      recentOrders,
      shipmentPendingOrders,
      paymentReviewOrders,
      failedPayments,
      integrationErrors,
      lowStockVariants,
      returnRequests,
    ] = await Promise.all([
      selectRows<AdminOrderRow>(supabase, 'ops_orders_recent', recentOrdersLimit),
      selectRows<AdminOrderRow>(supabase, 'ops_shipment_pending_orders', adminViewLimit),
      selectRows<AdminOrderRow>(supabase, 'ops_payment_review_orders', adminViewLimit),
      selectRows<AdminOrderRow>(supabase, 'ops_failed_payments', adminViewLimit),
      selectRows<AdminIntegrationErrorRow>(supabase, 'ops_integration_errors', adminViewLimit),
      selectRows<AdminLowStockVariantRow>(supabase, 'ops_low_stock_variants', adminViewLimit),
      selectRows<AdminReturnRequestRow>(supabase, 'ops_return_requests', adminViewLimit),
    ])

    return {
      adminEmail,
      loadedAt: new Date().toISOString(),
      shownCounts: {
        recentOrders: recentOrders.length,
        shipmentPendingOrders: shipmentPendingOrders.length,
        paymentReviewOrders: paymentReviewOrders.length,
        failedPayments: failedPayments.length,
        integrationErrors: integrationErrors.length,
        lowStockVariants: lowStockVariants.length,
        returnRequests: returnRequests.length,
      },
      views: {
        recentOrders,
        shipmentPendingOrders,
        paymentReviewOrders,
        failedPayments,
        integrationErrors,
        lowStockVariants,
        returnRequests,
      },
    }
  } catch (error) {
    throw sanitizeAdminError(error, 'Unable to load admin dashboard')
  }
}

export async function retryShipmentFromAdmin(orderNumber: string): Promise<RetryShipmentResult> {
  setAdminResponseHeaders()

  try {
    requireSameOriginMutation()

    const adminEmail = await requireAdminEmail()
    const env = readAdminEnv()
    const normalizedOrderNumber = normalizeOrderNumber(orderNumber)
    const response = await fetch(`${env.supabaseUrl}/functions/v1/retry-shipment`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${env.supabaseServiceRoleKey}`,
        apikey: env.supabaseServiceRoleKey,
        'x-ops-key': env.opsServiceRoleKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ orderNumber: normalizedOrderNumber }),
    })
    const responseBody = await response.json().catch(() => null)

    console.log('admin retry-shipment', {
      adminEmail,
      orderNumber: normalizedOrderNumber,
      ok: response.ok,
      status: response.status,
    })

    if (!response.ok) {
      const errorMessage =
        responseBody &&
        typeof responseBody === 'object' &&
        'error' in responseBody &&
        typeof responseBody.error === 'string'
          ? responseBody.error
          : 'Unable to retry shipment'
      throw new AdminError(
        response.status >= 500 ? 'Unable to retry shipment' : errorMessage,
        response.status,
        response.status < 500,
      )
    }

    const result = normalizeRetryResult(responseBody)

    return {
      adminEmail,
      orderNumber: normalizedOrderNumber,
      result,
    }
  } catch (error) {
    throw sanitizeAdminError(error, 'Unable to retry shipment')
  }
}

export async function cancelOrderFromAdmin(orderNumber: string): Promise<CancelOrderResult> {
  setAdminResponseHeaders()

  try {
    requireSameOriginMutation()

    const adminEmail = await requireAdminEmail()
    const env = readAdminEnv()
    const supabase = createAdminSupabaseClient(env)
    const normalizedOrderLookup = normalizeOrderLookup(orderNumber)
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id,order_number,invoice_number,status')
      .or(createOrderLookupFilter(normalizedOrderLookup))
      .single()

    if (orderError || !order) {
      throw new AdminError('Order not found', orderError?.code === 'PGRST116' ? 404 : 500, true)
    }

    const orderId = String(order.id)
    const orderStatus = readString(order.status)
    if (['delivered', 'cancelled'].includes(orderStatus)) {
      throw new AdminError('This order cannot be cancelled from admin.', 409, true)
    }

    const { data: shipment, error: shipmentError } = await supabase
      .from('shipments')
      .select('id,provider,provider_order_id,tracking_number,status')
      .eq('order_id', orderId)
      .maybeSingle()

    if (shipmentError) {
      throw new AdminError(`Unable to load shipment: ${shipmentError.message}`, 500, false)
    }

    if (shipment && ['in_transit', 'delivered'].includes(readString(shipment.status))) {
      throw new AdminError('Shipment is already in transit. Cancel it with the carrier first.', 409, true)
    }

    const trackingNumber = shipment ? readNullableString(shipment.tracking_number) : null
    const shipmentProvider = shipment ? readString(shipment.provider) : null
    let carrierCancelPayload: unknown = null

    if (shipment && shipmentProvider === 'delhivery' && trackingNumber) {
      const carrierCancelResult = await cancelDelhiveryShipment(env, trackingNumber)
      carrierCancelPayload = carrierCancelResult.rawPayload

      if (!carrierCancelResult.ok) {
        await supabase.from('integration_events').insert({
          source: 'delhivery',
          event_type: 'cancel_shipment',
          event_key: `cancel:${trackingNumber}:${Date.now()}`,
          order_id: orderId,
          status: 'failed',
          payload: {
            adminEmail,
            trackingNumber,
            providerOrderId: readNullableString(shipment.provider_order_id),
            response: carrierCancelResult.rawPayload,
          },
          error_message: carrierCancelResult.reason,
        })

        throw new AdminError('Shipment could not be cancelled with the carrier.', 502, true)
      }
    }

    const { error: updateOrderError } = await supabase
      .from('orders')
      .update({ status: 'cancelled' })
      .eq('id', orderId)

    if (updateOrderError) {
      throw new AdminError(`Unable to cancel order: ${updateOrderError.message}`, 500, false)
    }

    let shipmentStatus: string | null = null
    if (shipment) {
      const { data: updatedShipment, error: updateShipmentError } = await supabase
        .from('shipments')
        .update({ status: 'cancelled', provider_status: 'cancelled_by_admin' })
        .eq('id', shipment.id)
        .select('status')
        .single()

      if (updateShipmentError) {
        throw new AdminError(`Order cancelled, but shipment status could not be updated: ${updateShipmentError.message}`, 500, false)
      }

      shipmentStatus = readString(updatedShipment.status)
    }

    await supabase.from('integration_events').insert({
      source: 'admin',
      event_type: 'cancel_order',
      order_id: orderId,
      status: 'processed',
      payload: {
        adminEmail,
        previousOrderStatus: orderStatus,
        previousShipmentStatus: shipment ? readString(shipment.status) : null,
        carrierCancelPayload,
      },
    })

    console.log('admin cancel-order', {
      adminEmail,
      orderNumber: readString(order.order_number),
      invoiceNumber: readNullableString(order.invoice_number),
      orderId,
    })

    return {
      adminEmail,
      orderNumber: readString(order.order_number),
      invoiceNumber: readNullableString(order.invoice_number),
      status: 'cancelled',
      shipmentStatus,
    }
  } catch (error) {
    throw sanitizeAdminError(error, 'Unable to cancel order')
  }
}

export async function publishCatalogFromAdmin(
  environment: CatalogPublishEnvironment,
): Promise<CatalogPublishDispatchResult> {
  setAdminResponseHeaders()

  try {
    requireSameOriginMutation()

    const adminEmail = await requireAdminEmail()
    const env = readAdminEnv()
    const githubToken = requireOptionalAdminEnv(env.githubActionsToken, 'GITHUB_ACTIONS_TOKEN')
    const repository = requireOptionalAdminEnv(env.githubRepository, 'GITHUB_REPOSITORY')
    const ref = environment === 'prod' ? env.catalogPublishProdRef : env.catalogPublishQaRef
    const response = await fetch(
      `https://api.github.com/repos/${repository}/actions/workflows/${env.catalogPublishWorkflowFile}/dispatches`,
      {
        method: 'POST',
        headers: githubHeaders(githubToken),
        body: JSON.stringify({
          ref,
          inputs: { environment },
        }),
      },
    )

    if (!response.ok) {
      const message = await readGitHubError(response)
      throw new AdminError(message, response.status, response.status < 500)
    }

    console.log('admin publish-catalog dispatch', {
      adminEmail,
      environment,
      workflowFile: env.catalogPublishWorkflowFile,
      ref,
    })

    return {
      adminEmail,
      environment,
      workflowFile: env.catalogPublishWorkflowFile,
      ref,
      actionsUrl: `https://github.com/${repository}/actions/workflows/${env.catalogPublishWorkflowFile}`,
    }
  } catch (error) {
    throw sanitizeAdminError(error, 'Unable to publish catalog')
  }
}

export async function loadCatalogPublishStatus(): Promise<CatalogPublishStatus> {
  setAdminResponseHeaders()

  try {
    const adminEmail = await requireAdminEmail()
    const env = readAdminEnv()
    const githubToken = requireOptionalAdminEnv(env.githubActionsToken, 'GITHUB_ACTIONS_TOKEN')
    const repository = requireOptionalAdminEnv(env.githubRepository, 'GITHUB_REPOSITORY')
    const url = new URL(
      `https://api.github.com/repos/${repository}/actions/workflows/${env.catalogPublishWorkflowFile}/runs`,
    )

    url.searchParams.set('event', 'workflow_dispatch')
    url.searchParams.set('per_page', '5')

    const response = await fetch(url, {
      headers: githubHeaders(githubToken),
    })

    if (!response.ok) {
      const message = await readGitHubError(response)
      throw new AdminError(message, response.status, response.status < 500)
    }

    const payload = await response.json() as { workflow_runs?: unknown[] }

    return {
      adminEmail,
      workflowFile: env.catalogPublishWorkflowFile,
      runs: (payload.workflow_runs ?? []).map(normalizeCatalogPublishRun),
    }
  } catch (error) {
    throw sanitizeAdminError(error, 'Unable to load catalog publish status')
  }
}

export async function generateAdminInvoicePdf(orderNumber: string): Promise<AdminInvoicePdf> {
  setAdminResponseHeaders()

  try {
    const adminEmail = await requireAdminEmail()
    const env = readAdminEnv()
    const supabase = createAdminSupabaseClient(env)
    const normalizedOrderNumber = normalizeOrderNumber(orderNumber)
    const invoiceData = await loadInvoiceData(supabase, normalizedOrderNumber)
    const bytes = await renderInvoicePdf(invoiceData)

    console.log('admin invoice download', {
      adminEmail,
      orderNumber: normalizedOrderNumber,
      orderId: invoiceData.order.id,
    })

    return {
      bytes,
      filename: `${invoiceData.order.invoice_number ?? normalizedOrderNumber}-invoice.pdf`,
    }
  } catch (error) {
    throw sanitizeAdminError(error, 'Unable to generate invoice')
  }
}

export async function generateAdminInvoiceDownload(
  orderNumber: string,
): Promise<AdminInvoiceDownload> {
  const invoice = await generateAdminInvoicePdf(orderNumber)

  return {
    base64: encodeBase64(invoice.bytes),
    filename: invoice.filename,
  }
}

export async function loadAdminOrderDetails(orderNumber: string): Promise<AdminOrderDetails> {
  setAdminResponseHeaders()

  try {
    const adminEmail = await requireAdminEmail()
    const env = readAdminEnv()
    const supabase = createAdminSupabaseClient(env)
    const normalizedOrderNumber = normalizeOrderNumber(orderNumber)
    const details = await loadInvoiceData(supabase, normalizedOrderNumber)

    console.log('admin order details view', {
      adminEmail,
      orderNumber: normalizedOrderNumber,
      orderId: details.order.id,
    })

    return details
  } catch (error) {
    throw sanitizeAdminError(error, 'Unable to load order details')
  }
}

export type InvoiceOrder = {
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
  shipping_address: InvoiceAddress
  created_at: string
}

export type InvoiceItem = {
  id: string
  product_id: string
  variant_id: string
  inventory_id: string
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

export type InvoicePayment = {
  provider: string
  status: string
  provider_payment_id: string | null
  provider_order_id: string | null
  amount_paise: number
  currency: string
  verified_at: string | null
  created_at: string
}

export type InvoiceShipment = {
  provider: string
  status: string
  provider_order_id: string | null
  tracking_number: string | null
}

export type InvoiceReturnRequest = {
  id: string
  status: string
  reason: string
  customer_note: string | null
  created_at: string
}

export type InvoiceData = {
  order: InvoiceOrder
  items: InvoiceItem[]
  payment: InvoicePayment | null
  shipment: InvoiceShipment | null
  returnRequests: InvoiceReturnRequest[]
}

type InvoiceAddress = {
  addressLine: string
  landmark: string
  city: string
  state: string
  pincode: string
}

type InvoicePdfContext = {
  document: PDFDocument
  page: PDFPage
  fonts: {
    regular: PDFFont
    bold: PDFFont
  }
  y: number
}

async function loadInvoiceData(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  orderLookup: string,
): Promise<InvoiceData> {
  const { data: order, error: orderError } = await supabase
    .from('orders')
    .select(
      'id,order_number,invoice_number,status,currency,subtotal_amount_paise,shipping_amount_paise,total_amount_paise,customer_name,customer_phone,customer_email,shipping_address,created_at',
    )
    .or(createOrderLookupFilter(orderLookup))
    .single()

  if (orderError || !order) {
    throw new AdminError('Order not found', orderError?.code === 'PGRST116' ? 404 : 500, true)
  }

  const orderId = String(order.id)
  const [itemsResult, paymentsResult, shipmentResult, returnRequestsResult] = await Promise.all([
    selectInvoiceItems(supabase, orderId),
    supabase
      .from('payments')
      .select('provider,status,provider_order_id,provider_payment_id,amount_paise,currency,verified_at,created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false })
      .limit(1),
    supabase
      .from('shipments')
      .select('provider,status,provider_order_id,tracking_number')
      .eq('order_id', orderId)
      .maybeSingle(),
    supabase
      .from('order_return_requests')
      .select('id,status,reason,customer_note,created_at')
      .eq('order_id', orderId)
      .order('created_at', { ascending: false }),
  ])

  if (itemsResult.error) {
    throw new AdminError(`Unable to load invoice items: ${itemsResult.error.message}`, 500, false)
  }

  if (paymentsResult.error) {
    throw new AdminError(`Unable to load invoice payment: ${paymentsResult.error.message}`, 500, false)
  }

  if (shipmentResult.error) {
    throw new AdminError(`Unable to load invoice shipment: ${shipmentResult.error.message}`, 500, false)
  }

  if (returnRequestsResult.error && !isMissingRelationError(returnRequestsResult.error)) {
    throw new AdminError(
      `Unable to load return requests: ${returnRequestsResult.error.message}`,
      500,
      false,
    )
  }

  const items = (itemsResult.data ?? []).map((value) => {
    const item = value as Record<string, unknown>

    return {
      id: String(item.id),
      product_id: readString(item.product_id),
      variant_id: readString(item.variant_id),
      inventory_id: readString(item.inventory_id),
      product_slug: readString(item.product_slug),
      variant_slug: readString(item.variant_slug),
      product_code: readString(item.product_code) || readString(item.variant_id),
      title: readString(item.title),
      size_label: readString(item.size_label),
      quantity: readNumber(item.quantity),
      unit_selling_price_paise: readNumber(item.unit_selling_price_paise),
      unit_mrp_paise: readNumber(item.unit_mrp_paise),
      discount_amount_paise: readNumber(item.discount_amount_paise),
      line_total_paise: readNumber(item.line_total_paise),
      primary_image_url: readNullableString(item.primary_image_url),
    }
  })

  if (items.length === 0) {
    throw new AdminError('Order has no items to invoice', 409)
  }

  return {
    order: {
      id: orderId,
      order_number: readString(order.order_number),
      invoice_number: readNullableString(order.invoice_number),
      status: readString(order.status),
      currency: readString(order.currency) || 'INR',
      subtotal_amount_paise: readNumber(order.subtotal_amount_paise),
      shipping_amount_paise: readNumber(order.shipping_amount_paise),
      total_amount_paise: readNumber(order.total_amount_paise),
      customer_name: readString(order.customer_name),
      customer_phone: readString(order.customer_phone),
      customer_email: readString(order.customer_email),
      shipping_address: normalizeInvoiceAddress(order.shipping_address),
      created_at: readString(order.created_at),
    },
    items,
    payment: normalizeInvoicePayment(paymentsResult.data?.[0]),
    shipment: normalizeInvoiceShipment(shipmentResult.data),
    returnRequests: ((returnRequestsResult.data ?? []) as Array<Record<string, unknown>>).map(
      (request) => ({
        id: readString(request.id),
        status: readString(request.status),
        reason: readString(request.reason),
        customer_note: readNullableString(request.customer_note),
        created_at: readString(request.created_at),
      }),
    ),
  }
}

async function selectInvoiceItems(
  supabase: ReturnType<typeof createAdminSupabaseClient>,
  orderId: string,
) {
  const result = await supabase
    .from('order_items')
    .select(
      'id,product_id,variant_id,inventory_id,product_slug,variant_slug,product_code,title,size_label,quantity,unit_selling_price_paise,unit_mrp_paise,discount_amount_paise,line_total_paise,primary_image_url,created_at',
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })

  if (!isMissingColumnError(result.error)) {
    return result
  }

  return supabase
    .from('order_items')
    .select(
      'id,variant_id,title,size_label,quantity,unit_selling_price_paise,unit_mrp_paise,discount_amount_paise,line_total_paise,created_at',
    )
    .eq('order_id', orderId)
    .order('created_at', { ascending: true })
}

function isMissingColumnError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes('does not exist'))
}

function isMissingRelationError(error: { message?: string } | null) {
  return Boolean(error?.message?.includes('does not exist'))
}

async function renderInvoicePdf(invoice: InvoiceData) {
  const document = await PDFDocument.create()
  const regular = await document.embedFont(StandardFonts.Helvetica)
  const bold = await document.embedFont(StandardFonts.HelveticaBold)
  const context: InvoicePdfContext = {
    document,
    page: document.addPage([595.28, 841.89]),
    fonts: { regular, bold },
    y: 792,
  }

  drawInvoiceHeader(context, invoice)
  drawCustomerBlocks(context, invoice)
  drawOrderMeta(context, invoice)
  drawItemsTable(context, invoice)
  drawTotals(context, invoice)
  drawInvoiceFooter(context)

  return document.save()
}

function drawInvoiceHeader(context: InvoicePdfContext, invoice: InvoiceData) {
  drawText(context, 'Kashmiri Jewels', 48, context.y, {
    font: context.fonts.bold,
    size: 22,
    color: rgb(0.12, 0.11, 0.09),
  })
  drawText(context, 'INVOICE', 465, context.y + 2, {
    font: context.fonts.bold,
    size: 16,
    color: rgb(0.12, 0.11, 0.09),
  })
  context.y -= 24
  drawText(context, 'Kashmiri Jewels order invoice', 48, context.y, {
    size: 9,
    color: rgb(0.45, 0.42, 0.36),
  })
  drawText(context, invoice.order.invoice_number ?? invoice.order.order_number, 404, context.y, {
    font: context.fonts.bold,
    size: 10,
    color: rgb(0.45, 0.42, 0.36),
  })
  context.y -= 28
  drawRule(context, context.y)
  context.y -= 26
}

function drawCustomerBlocks(context: InvoicePdfContext, invoice: InvoiceData) {
  const address = normalizeInvoiceAddress(invoice.order.shipping_address)
  const leftX = 48
  const rightX = 318
  const startY = context.y

  drawSectionLabel(context, 'Bill To', leftX, startY)
  drawWrappedText(context, invoice.order.customer_name, leftX, startY - 18, 210, {
    font: context.fonts.bold,
    size: 10,
  })
  drawWrappedText(context, invoice.order.customer_phone, leftX, startY - 34, 210, { size: 9 })
  drawWrappedText(context, invoice.order.customer_email, leftX, startY - 48, 210, { size: 9 })

  drawSectionLabel(context, 'Ship To', rightX, startY)
  const addressLines = [
    invoice.order.customer_name,
    address.addressLine,
    address.landmark,
    [address.city, address.state, address.pincode].filter(Boolean).join(', '),
  ].filter(Boolean)
  let y = startY - 18
  for (const line of addressLines) {
    y = drawWrappedText(context, line, rightX, y, 220, { size: 9 }) - 4
  }

  context.y = Math.min(startY - 74, y - 10)
}

function drawOrderMeta(context: InvoicePdfContext, invoice: InvoiceData) {
  const payment = invoice.payment
  const shipment = invoice.shipment
  const rows = [
    ['Invoice date', formatInvoiceDate(invoice.order.created_at)],
    ['Order number', invoice.order.order_number],
    ['Order status', formatStatus(invoice.order.status)],
    ['Payment', payment ? formatStatus(payment.status) : 'Not recorded'],
    ['Payment ID', payment?.provider_payment_id || '-'],
    ['Shipment', shipment ? formatStatus(shipment.status) : 'Not created'],
    ['Tracking', shipment?.tracking_number || '-'],
  ]
  const startX = 48
  const cellWidth = 165
  const rowHeight = 28

  drawRule(context, context.y)
  context.y -= 18

  rows.forEach(([label, value], index) => {
    const column = index % 3
    const row = Math.floor(index / 3)
    const x = startX + column * cellWidth
    const y = context.y - row * rowHeight
    drawText(context, label.toUpperCase(), x, y, {
      font: context.fonts.bold,
      size: 7,
      color: rgb(0.48, 0.45, 0.39),
    })
    drawText(context, value, x, y - 12, {
      size: 9,
      color: rgb(0.12, 0.11, 0.09),
    })
  })

  context.y -= 72
}

function drawItemsTable(context: InvoicePdfContext, invoice: InvoiceData) {
  ensureSpace(context, 92)
  drawSectionLabel(context, 'Items', 48, context.y)
  context.y -= 18
  drawTableHeader(context)

  for (const item of invoice.items) {
    const titleLines = wrapText(`${item.title}`, 28, context.fonts.regular, 9)
    const codeLines = wrapText(`${item.product_code} / ${item.size_label}`, 18, context.fonts.regular, 8)
    const rowHeight = Math.max(34, Math.max(titleLines.length, codeLines.length) * 11 + 18)
    ensureSpace(context, rowHeight + 20)

    const rowTop = context.y
    drawWrappedText(context, item.title, 48, rowTop - 14, 175, { size: 9 })
    drawWrappedText(context, `${item.product_code} / ${item.size_label}`, 238, rowTop - 14, 100, {
      size: 8,
      color: rgb(0.38, 0.36, 0.31),
    })
    drawText(context, String(item.quantity), 355, rowTop - 14, { size: 9 })
    drawText(context, formatPaise(item.unit_selling_price_paise), 388, rowTop - 14, { size: 9 })
    drawText(context, formatPaise(item.discount_amount_paise * item.quantity), 455, rowTop - 14, { size: 9 })
    drawText(context, formatPaise(item.line_total_paise), 514, rowTop - 14, {
      font: context.fonts.bold,
      size: 9,
    })
    context.y -= rowHeight
    drawRule(context, context.y, 48, 548, rgb(0.88, 0.86, 0.8))
    context.y -= 10
  }
}

function drawTotals(context: InvoicePdfContext, invoice: InvoiceData) {
  ensureSpace(context, 96)
  const labelX = 382
  const valueX = 500
  const rows = [
    ['Subtotal', formatPaise(invoice.order.subtotal_amount_paise)],
    ['Shipping', formatPaise(invoice.order.shipping_amount_paise)],
    ['Total', formatPaise(invoice.order.total_amount_paise)],
  ]

  context.y -= 8
  rows.forEach(([label, value], index) => {
    const isTotal = index === rows.length - 1
    drawText(context, label, labelX, context.y, {
      font: isTotal ? context.fonts.bold : context.fonts.regular,
      size: isTotal ? 12 : 9,
      color: rgb(0.12, 0.11, 0.09),
    })
    drawText(context, value, valueX, context.y, {
      font: isTotal ? context.fonts.bold : context.fonts.regular,
      size: isTotal ? 12 : 9,
      color: rgb(0.12, 0.11, 0.09),
    })
    context.y -= isTotal ? 22 : 18
  })
}

function drawInvoiceFooter(context: InvoicePdfContext) {
  ensureSpace(context, 54)
  context.y -= 6
  drawRule(context, context.y)
  context.y -= 18
  drawWrappedText(
    context,
    'This invoice is generated from Kashmiri Jewels admin order records. Prices are inclusive of applicable taxes where charged.',
    48,
    context.y,
    498,
    { size: 8, color: rgb(0.45, 0.42, 0.36) },
  )
}

function drawTableHeader(context: InvoicePdfContext) {
  const y = context.y
  drawText(context, 'Product', 48, y, { font: context.fonts.bold, size: 8 })
  drawText(context, 'Code / Size', 238, y, { font: context.fonts.bold, size: 8 })
  drawText(context, 'Qty', 355, y, { font: context.fonts.bold, size: 8 })
  drawText(context, 'Unit', 388, y, { font: context.fonts.bold, size: 8 })
  drawText(context, 'Discount', 455, y, { font: context.fonts.bold, size: 8 })
  drawText(context, 'Amount', 514, y, { font: context.fonts.bold, size: 8 })
  context.y -= 10
  drawRule(context, context.y)
  context.y -= 10
}

function drawSectionLabel(context: InvoicePdfContext, value: string, x: number, y: number) {
  drawText(context, value.toUpperCase(), x, y, {
    font: context.fonts.bold,
    size: 8,
    color: rgb(0.48, 0.45, 0.39),
  })
}

function drawText(
  context: InvoicePdfContext,
  text: string,
  x: number,
  y: number,
  options: {
    font?: PDFFont
    size?: number
    color?: ReturnType<typeof rgb>
  } = {},
) {
  context.page.drawText(sanitizePdfText(text || '-'), {
    x,
    y,
    size: options.size ?? 10,
    font: options.font ?? context.fonts.regular,
    color: options.color ?? rgb(0.18, 0.17, 0.14),
  })
}

function drawWrappedText(
  context: InvoicePdfContext,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  options: {
    font?: PDFFont
    size?: number
    color?: ReturnType<typeof rgb>
  } = {},
) {
  const font = options.font ?? context.fonts.regular
  const size = options.size ?? 10
  const lines = wrapText(text || '-', maxWidth, font, size)
  let nextY = y
  for (const line of lines) {
    drawText(context, line, x, nextY, { ...options, font, size })
    nextY -= size + 3
  }

  return nextY
}

function wrapText(text: string, maxWidth: number, font: PDFFont, size: number) {
  const words = text.split(/\s+/).filter(Boolean)
  const lines: string[] = []
  let line = ''

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) {
      line = candidate
      continue
    }

    if (line) lines.push(line)
    line = word
  }

  if (line) lines.push(line)
  return lines.length > 0 ? lines : ['-']
}

function drawRule(
  context: InvoicePdfContext,
  y: number,
  xStart = 48,
  xEnd = 548,
  color = rgb(0.79, 0.76, 0.68),
) {
  context.page.drawLine({
    start: { x: xStart, y },
    end: { x: xEnd, y },
    thickness: 0.6,
    color,
  })
}

function ensureSpace(context: InvoicePdfContext, requiredHeight: number) {
  if (context.y - requiredHeight >= 54) return

  context.page = context.document.addPage([595.28, 841.89])
  context.y = 792
}

function normalizeInvoicePayment(value: unknown): InvoicePayment | null {
  if (!value || typeof value !== 'object') return null
  const payment = value as Record<string, unknown>

  return {
    provider: readString(payment.provider),
    status: readString(payment.status),
    provider_order_id: readNullableString(payment.provider_order_id),
    provider_payment_id: readNullableString(payment.provider_payment_id),
    amount_paise: readNumber(payment.amount_paise),
    currency: readString(payment.currency) || 'INR',
    verified_at: readNullableString(payment.verified_at),
    created_at: readString(payment.created_at),
  }
}

function normalizeInvoiceShipment(value: unknown): InvoiceShipment | null {
  if (!value || typeof value !== 'object') return null
  const shipment = value as Record<string, unknown>

  return {
    provider: readString(shipment.provider),
    status: readString(shipment.status),
    provider_order_id: readNullableString(shipment.provider_order_id),
    tracking_number: readNullableString(shipment.tracking_number),
  }
}

function normalizeInvoiceAddress(value: unknown): InvoiceAddress {
  if (!value || typeof value !== 'object') {
    return { addressLine: '', landmark: '', city: '', state: '', pincode: '' }
  }

  const address = value as Record<string, unknown>
  return {
    addressLine: readString(address.addressLine),
    landmark: readString(address.landmark),
    city: readString(address.city),
    state: readString(address.state),
    pincode: readString(address.pincode),
  }
}

function formatInvoiceDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ') || '-'
}

function formatPaise(value: number) {
  const amount = new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(value / 100)

  return `INR ${amount}`
}

function sanitizePdfText(value: string) {
  return value.replace(/[^\x20-\x7e]/g, '-')
}

function encodeBase64(bytes: Uint8Array) {
  let binary = ''
  const chunkSize = 0x8000

  for (let index = 0; index < bytes.length; index += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunkSize))
  }

  return btoa(binary)
}

function normalizeRetryResult(value: unknown): RetryShipmentResult['result'] {
  if (!value || typeof value !== 'object') {
    throw new AdminError('Shipment retry returned an invalid response', 502, false)
  }

  const result = value as Record<string, unknown>

  return {
    ok: result.ok === true,
    orderId: readString(result.orderId),
    orderNumber: readString(result.orderNumber),
    orderStatus: readString(result.orderStatus),
    shipmentStatus: readString(result.shipmentStatus),
    provider: readString(result.provider),
    providerOrderId: readNullableString(result.providerOrderId),
    trackingNumber: readNullableString(result.trackingNumber),
    providerAttempt: readString(result.providerAttempt),
    reason: typeof result.reason === 'string' ? result.reason : undefined,
  }
}

function readString(value: unknown) {
  return typeof value === 'string' ? value : ''
}

function readNullableString(value: unknown) {
  return typeof value === 'string' ? value : null
}

function readStringFromRecord(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value
  }

  return null
}

function normalizeCatalogPublishRun(value: unknown): CatalogPublishRun {
  if (!value || typeof value !== 'object') {
    throw new AdminError('GitHub Actions returned an invalid workflow run', 502, false)
  }

  const run = value as Record<string, unknown>
  const headBranch = readString(run.head_branch)

  return {
    id: readNumber(run.id),
    name: readString(run.name),
    status: readString(run.status),
    conclusion: readNullableString(run.conclusion),
    branch: headBranch,
    event: readString(run.event),
    htmlUrl: readString(run.html_url),
    createdAt: readString(run.created_at),
    updatedAt: readString(run.updated_at),
  }
}

function readNumber(value: unknown) {
  return typeof value === 'number' ? value : 0
}

async function requireAdminEmail() {
  const env = readAdminEnv()
  const localEmail = resolveLocalAdminEmail(env)

  if (localEmail) {
    return localEmail
  }

  if (!env.accessTeamDomain || !env.accessAudience) {
    if (env.adminEmails.length === 1) return env.adminEmails[0]

    throw new AdminError('Admin access is not configured', 503, true)
  }

  const assertion = getRequestHeader('cf-access-jwt-assertion')
  if (!assertion) {
    throw new AdminError('Admin sign-in is required', 401)
  }

  const issuer = normalizeAccessIssuer(env.accessTeamDomain)
  const jwks = getAccessJwks(issuer)
  const { payload } = await jwtVerify(assertion, jwks, {
    issuer,
    audience: env.accessAudience,
  })
  const email = typeof payload.email === 'string' ? payload.email.toLowerCase() : ''

  if (!email || !env.adminEmails.includes(email)) {
    throw new AdminError('Admin access is not allowed', 403)
  }

  return email
}

function resolveLocalAdminEmail(env: AdminEnv) {
  const host = getRequestHost()
  const isLocalHost = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const email = env.adminDevEmail?.toLowerCase()

  if (!env.adminDevBypass || !isLocalDevRuntime() || !isLocalHost || !email) return null
  if (!env.adminEmails.includes(email)) {
    throw new AdminError('ADMIN_DEV_EMAIL must also be listed in ADMIN_EMAILS', 403)
  }

  return email
}

function isLocalDevRuntime() {
  const nodeEnv = typeof process !== 'undefined' ? process.env.NODE_ENV : undefined
  return import.meta.env.DEV || nodeEnv === 'development'
}

async function cancelDelhiveryShipment(
  env: AdminEnv,
  trackingNumber: string,
): Promise<{ ok: true; rawPayload: unknown } | { ok: false; reason: string; rawPayload: unknown }> {
  if (!env.delhiveryApiToken) {
    return {
      ok: false,
      reason: 'delhivery_config_missing',
      rawPayload: null,
    }
  }

  const response = await fetch(env.delhiveryCancelShipmentUrl, {
    method: 'POST',
    headers: {
      Authorization: `Token ${env.delhiveryApiToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      waybill: trackingNumber,
      cancellation: 'true',
    }),
  })
  const responsePayload = await response.json().catch(() => null)
  const providerError = readDelhiveryCancelError(responsePayload)

  if (!response.ok || providerError) {
    return {
      ok: false,
      reason: providerError ?? `delhivery_http_${response.status}`,
      rawPayload: responsePayload,
    }
  }

  return {
    ok: true,
    rawPayload: responsePayload,
  }
}

function readDelhiveryCancelError(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null

  const record = payload as Record<string, unknown>
  const success = record.success ?? record.Success
  if (success === false || success === 'false') {
    return readStringFromRecord(record, ['error', 'message', 'remark', 'remarks']) ?? 'delhivery_cancel_failed'
  }

  const status = readStringFromRecord(record, ['status', 'Status'])
  if (status && ['failed', 'failure', 'error'].includes(status.toLowerCase())) {
    return readStringFromRecord(record, ['error', 'message', 'remark', 'remarks']) ?? 'delhivery_cancel_failed'
  }

  return readStringFromRecord(record, ['error', 'Error']) ?? null
}

function readAdminEnv(): AdminEnv {
  const adminEmails = parseAdminEmails(readEnv('ADMIN_EMAILS'))
  const supabaseUrl = readEnv('SUPABASE_URL') || readEnv('VITE_SUPABASE_URL') || productionSupabaseUrl
  const supabaseServiceRoleKey = requireEnv('SUPABASE_SERVICE_ROLE_KEY', 'OPS_SERVICE_ROLE_KEY')
  const opsServiceRoleKey = readEnv('OPS_SERVICE_ROLE_KEY') || supabaseServiceRoleKey

  return {
    adminEmails,
    accessTeamDomain: readEnv('CF_ACCESS_TEAM_DOMAIN'),
    accessAudience: readEnv('CF_ACCESS_AUD'),
    adminDevEmail: readEnv('ADMIN_DEV_EMAIL'),
    adminDevBypass: readEnv('ADMIN_DEV_BYPASS') === 'true',
    supabaseUrl,
    supabaseServiceRoleKey,
    opsServiceRoleKey,
    githubActionsToken: readEnv('GITHUB_ACTIONS_TOKEN'),
    githubRepository: readEnv('GITHUB_REPOSITORY'),
    catalogPublishWorkflowFile: readEnv('CATALOG_PUBLISH_WORKFLOW_FILE') ?? 'publish-catalog.yml',
    catalogPublishQaRef: readEnv('CATALOG_PUBLISH_QA_REF') ?? 'dev',
    catalogPublishProdRef: readEnv('CATALOG_PUBLISH_PROD_REF') ?? 'main',
    delhiveryApiToken: readEnv('DELHIVERY_API_TOKEN'),
    delhiveryCancelShipmentUrl:
      readEnv('DELHIVERY_CANCEL_SHIPMENT_URL') ?? 'https://track.delhivery.com/api/p/edit',
  }
}

function readEnv(name: string) {
  const nodeEnv = typeof process !== 'undefined' ? process.env[name] : undefined
  return workerEnv[name] || nodeEnv
}

function requireEnv(name: string, fallbackName?: string) {
  const value = readEnv(name) || (fallbackName ? readEnv(fallbackName) : undefined)
  if (!value) {
    const message = fallbackName
      ? `${name} or ${fallbackName} is not configured`
      : `${name} is not configured`

    throw new AdminError(message, 503, true)
  }

  return value
}

function requireOptionalAdminEnv(value: string | undefined, name: string) {
  if (!value) {
    throw new AdminError(`${name} is not configured`, 503, true)
  }

  return value
}

function githubHeaders(token: string) {
  return {
    Accept: 'application/vnd.github+json',
    Authorization: `Bearer ${token}`,
    'Content-Type': 'application/json',
    'User-Agent': 'kashmiri-jewels-admin',
    'X-GitHub-Api-Version': '2022-11-28',
  }
}

async function readGitHubError(response: Response) {
  const body = await response.json().catch(() => null)
  const message =
    body &&
    typeof body === 'object' &&
    'message' in body &&
    typeof body.message === 'string'
      ? body.message
      : 'GitHub Actions request failed'

  return `GitHub Actions request failed: ${message}`
}

function parseAdminEmails(value: string | undefined) {
  const emails =
    value
      ?.split(',')
      .map((email) => email.trim().toLowerCase())
      .filter(Boolean) ?? []

  if (emails.length === 0) {
    throw new AdminError('ADMIN_EMAILS is not configured', 503, true)
  }

  return emails
}

function createAdminSupabaseClient(env: AdminEnv) {
  return createClient(env.supabaseUrl, env.supabaseServiceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
}

async function selectRows<Row>(supabase: ReturnType<typeof createAdminSupabaseClient>, view: string, limit: number) {
  const { data, error } = await supabase.from(view).select('*').limit(limit)

  if (error) {
    console.error(`Unable to load ${view}: ${error.message}`)
    return [] as Row[]
  }

  return (data ?? []) as Row[]
}

function normalizeAccessIssuer(teamDomain: string) {
  const normalizedDomain = teamDomain.replace(/^https?:\/\//, '').replace(/\/+$/, '')
  return `https://${normalizedDomain}`
}

function getAccessJwks(issuer: string) {
  const cached = accessJwksCache.get(issuer)
  if (cached) return cached

  const jwks = createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`))
  accessJwksCache.set(issuer, jwks)
  return jwks
}

function normalizeOrderNumber(value: string) {
  return normalizeOrderLookup(value)
}

function normalizeOrderLookup(value: string) {
  const orderNumber = value.trim().toUpperCase()

  if (
    !/^KJ-\d{8}-[A-Z0-9]{6,8}$/.test(orderNumber) &&
    !/^KJ\/ECOM\/\d{3,}\/\d{2}-\d{2}$/.test(orderNumber)
  ) {
    throw new AdminError('Enter a valid order or invoice number', 400)
  }

  return orderNumber
}

function createOrderLookupFilter(value: string) {
  const escapedValue = value.replace(/["\\]/g, '\\$&')
  return `order_number.eq.${escapedValue},invoice_number.eq.${escapedValue}`
}

function setAdminResponseHeaders() {
  setResponseHeader('Cache-Control', 'private, no-store, max-age=0, must-revalidate')
  setResponseHeader('CDN-Cache-Control', 'no-store')
  setResponseHeader('Pragma', 'no-cache')
  setResponseHeader('X-Robots-Tag', 'noindex, nofollow')
}

function requireSameOriginMutation() {
  const host = getRequestHost({ xForwardedHost: true })
  const origin = getRequestHeader('origin')
  const secFetchSite = getRequestHeader('sec-fetch-site')

  if (secFetchSite && !['same-origin', 'none'].includes(secFetchSite)) {
    throw new AdminError('Admin request origin is not allowed', 403)
  }

  if (!origin) return

  let originHost = ''
  try {
    originHost = new URL(origin).host
  } catch {
    throw new AdminError('Admin request origin is not allowed', 403)
  }

  if (originHost !== host) {
    throw new AdminError('Admin request origin is not allowed', 403)
  }
}

function sanitizeAdminError(error: unknown, fallbackMessage: string) {
  if (error instanceof AdminError && error.expose) {
    return error
  }

  console.error(fallbackMessage, error)
  return new AdminError(fallbackMessage, error instanceof AdminError ? error.status : 500)
}

class AdminError extends Error {
  constructor(
    message: string,
    readonly status = 500,
    readonly expose = true,
  ) {
    super(message)
  }
}
