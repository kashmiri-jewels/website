import { createDelhiveryShipment } from '../integrations/delhivery.ts'
import { notifyOwner } from '../integrations/telegram.ts'

export type SupabaseClient = {
  from: (table: string) => any
}

export type OrderItemForShipment = {
  product_id: string
  variant_id: string
  title: string
  size_label: string
  quantity: number
  unit_selling_price_paise: number
  package_length_cm: number | null
  package_breadth_cm: number | null
  package_height_cm: number | null
  package_weight_kg: number | null
}

export type OrderForShipment = {
  id: string
  order_number: string
  status: string
  total_amount_paise: number
  currency: string
  customer_name: string
  customer_phone: string
  customer_email: string
  shipping_address: Record<string, unknown>
  order_items: OrderItemForShipment[]
}

export type ShipmentRow = {
  id: string
  order_id: string
  provider: string
  provider_order_id: string | null
  tracking_number: string | null
  status: string
  provider_status: string | null
  label_url: string | null
  raw_provider_payload: unknown
}

export type ShipmentWorkflowResult = {
  ok: boolean
  orderId: string
  orderNumber: string
  orderStatus: string
  shipmentStatus: string
  provider: string
  providerOrderId: string | null
  trackingNumber: string | null
  providerAttempt: 'created' | 'failed' | 'skipped' | 'already_exists'
  reason?: string
}

export async function createShipmentWorkflow(
  supabase: SupabaseClient,
  input: {
    orderId?: string
    orderNumber?: string
    source: 'verify-payment' | 'razorpay-webhook' | 'create-shipment' | 'retry-shipment'
  },
): Promise<ShipmentWorkflowResult> {
  const order = await loadOrder(supabase, input)

  if (!order) {
    throw new ShipmentWorkflowError('Order not found', 404)
  }

  if (!['paid', 'shipment_pending'].includes(order.status)) {
    throw new ShipmentWorkflowError(`Order ${order.order_number} is not ready for shipment`, 409)
  }

  const existingShipment = await loadShipment(supabase, order.id)
  if (existingShipment && ['created', 'in_transit', 'delivered'].includes(existingShipment.status)) {
    await markOrderShipmentPending(supabase, order.id)

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.order_number,
      orderStatus: 'shipment_pending',
      shipmentStatus: existingShipment.status,
      provider: existingShipment.provider,
      providerOrderId: existingShipment.provider_order_id,
      trackingNumber: existingShipment.tracking_number,
      providerAttempt: 'already_exists',
    }
  }

  const shipment = existingShipment ?? await createPendingShipment(supabase, order.id)
  const providerResult = await createDelhiveryShipment({ order, shipment })

  if (providerResult.ok) {
    const updatedShipment = await updateShipment(supabase, shipment.id, {
      provider_order_id: providerResult.providerOrderId,
      tracking_number: providerResult.trackingNumber,
      status: 'created',
      provider_status: 'created',
      raw_provider_payload: providerResult.rawPayload,
    })

    await markOrderShipmentPending(supabase, order.id)
    await logIntegrationEvent(supabase, {
      source: 'delhivery',
      eventType: 'create_shipment',
      orderId: order.id,
      status: 'processed',
      payload: {
        source: input.source,
        providerOrderId: providerResult.providerOrderId,
        trackingNumber: providerResult.trackingNumber,
        response: providerResult.rawPayload,
      },
    })
    await notifyOwner(supabase, {
      eventType: 'shipment_created',
      orderId: order.id,
      message: `Shipment created for ${order.order_number}${providerResult.trackingNumber ? `\nTracking: ${providerResult.trackingNumber}` : ''}`,
      payload: { provider: 'delhivery' },
    })

    return {
      ok: true,
      orderId: order.id,
      orderNumber: order.order_number,
      orderStatus: 'shipment_pending',
      shipmentStatus: updatedShipment.status,
      provider: updatedShipment.provider,
      providerOrderId: updatedShipment.provider_order_id,
      trackingNumber: updatedShipment.tracking_number,
      providerAttempt: 'created',
    }
  }

  const status = providerResult.skipped ? 'pending' : 'failed'
  const updatedShipment = await updateShipment(supabase, shipment.id, {
    status,
    provider_status: providerResult.reason,
    raw_provider_payload: providerResult.rawPayload ?? { reason: providerResult.reason },
  })

  await markOrderShipmentPending(supabase, order.id)
  await logIntegrationEvent(supabase, {
    source: 'delhivery',
    eventType: 'create_shipment',
    orderId: order.id,
    status: providerResult.skipped ? 'ignored' : 'failed',
    payload: {
      source: input.source,
      reason: providerResult.reason,
      response: providerResult.rawPayload ?? null,
    },
    errorMessage: providerResult.skipped ? undefined : providerResult.reason,
  })
  await notifyOwner(supabase, {
    eventType: providerResult.skipped ? 'shipment_manual_pending' : 'shipment_failed',
    orderId: order.id,
    message: providerResult.skipped
      ? `Paid order ${order.order_number} is ready for manual shipment.`
      : `Shipment creation failed for ${order.order_number}\nReason: ${providerResult.reason}`,
    payload: { provider: 'delhivery', reason: providerResult.reason },
  })

  return {
    ok: providerResult.skipped === true,
    orderId: order.id,
    orderNumber: order.order_number,
    orderStatus: 'shipment_pending',
    shipmentStatus: updatedShipment.status,
    provider: updatedShipment.provider,
    providerOrderId: updatedShipment.provider_order_id,
    trackingNumber: updatedShipment.tracking_number,
    providerAttempt: providerResult.skipped ? 'skipped' : 'failed',
    reason: providerResult.reason,
  }
}

export async function alertPaymentReview(
  supabase: SupabaseClient,
  input: {
    orderId: string
    reason: string
    payload?: Record<string, unknown>
  },
) {
  await notifyOwner(supabase, {
    eventType: 'payment_review_required',
    orderId: input.orderId,
    message: `Payment needs manual review.\nOrder ID: ${input.orderId}\nReason: ${input.reason}`,
    payload: input.payload,
  })
}

async function loadOrder(
  supabase: SupabaseClient,
  input: { orderId?: string; orderNumber?: string },
) {
  const query = supabase
    .from('orders')
    .select(
      'id,order_number,status,total_amount_paise,currency,customer_name,customer_phone,customer_email,shipping_address,order_items(product_id,variant_id,title,size_label,quantity,unit_selling_price_paise,package_length_cm,package_breadth_cm,package_height_cm,package_weight_kg)',
    )

  const { data, error } = input.orderId
    ? await query.eq('id', input.orderId).maybeSingle()
    : await query.eq('order_number', input.orderNumber ?? '').maybeSingle()

  if (error) {
    throw new ShipmentWorkflowError(`Unable to load order: ${error.message}`, 500)
  }

  return data as OrderForShipment | null
}

async function loadShipment(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('shipments')
    .select('id,order_id,provider,provider_order_id,tracking_number,status,provider_status,label_url,raw_provider_payload')
    .eq('order_id', orderId)
    .maybeSingle()

  if (error) {
    throw new ShipmentWorkflowError(`Unable to load shipment: ${error.message}`, 500)
  }

  return data as ShipmentRow | null
}

async function createPendingShipment(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('shipments')
    .insert({
      order_id: orderId,
      provider: 'delhivery',
      status: 'pending',
    })
    .select('id,order_id,provider,provider_order_id,tracking_number,status,provider_status,label_url,raw_provider_payload')
    .single()

  if (error) {
    throw new ShipmentWorkflowError(`Unable to create shipment row: ${error.message}`, 500)
  }

  return data as ShipmentRow
}

async function updateShipment(
  supabase: SupabaseClient,
  shipmentId: string,
  patch: Record<string, unknown>,
) {
  const { data, error } = await supabase
    .from('shipments')
    .update(patch)
    .eq('id', shipmentId)

  if (error) {
    throw new ShipmentWorkflowError(`Unable to update shipment: ${error.message}`, 500)
  }

  return {
    id: shipmentId,
    order_id: '',
    provider: 'delhivery',
    provider_order_id: (patch.provider_order_id as string | null | undefined) ?? null,
    tracking_number: (patch.tracking_number as string | null | undefined) ?? null,
    status: String(patch.status ?? 'pending'),
    provider_status: (patch.provider_status as string | null | undefined) ?? null,
    label_url: null,
    raw_provider_payload: patch.raw_provider_payload ?? {},
    ...(data as ShipmentRow | null ?? {}),
  } as ShipmentRow
}

async function markOrderShipmentPending(supabase: SupabaseClient, orderId: string) {
  const { error } = await supabase
    .from('orders')
    .update({ status: 'shipment_pending' })
    .eq('id', orderId)

  if (error) {
    throw new ShipmentWorkflowError(`Unable to update order shipment status: ${error.message}`, 500)
  }
}

async function logIntegrationEvent(
  supabase: SupabaseClient,
  input: {
    source: string
    eventType: string
    orderId: string
    status: 'received' | 'processed' | 'failed' | 'ignored'
    payload: Record<string, unknown>
    errorMessage?: string
  },
) {
  const { error } = await supabase.from('integration_events').insert({
    source: input.source,
    event_type: input.eventType,
    order_id: input.orderId,
    status: input.status,
    payload: input.payload,
    error_message: input.errorMessage ?? null,
  })

  if (error) {
    console.error(`Unable to log integration event: ${error.message}`)
  }
}

export class ShipmentWorkflowError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message)
  }
}
