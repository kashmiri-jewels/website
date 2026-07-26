import { createClient } from 'npm:@supabase/supabase-js@2.105.4'

import {
  alertPaymentReview,
  createShipmentWorkflow,
  type SupabaseClient,
} from '../_shared/domain/shipments.ts'
import { handleCors, jsonResponse } from '../_shared/http/cors.ts'
import { RateLimitError, requireRateLimit } from '../_shared/http/rate-limit.ts'
import { verifyRazorpayPaymentSignature } from '../_shared/integrations/razorpay.ts'
import { notifyOrderConfirmedOnWhatsApp } from '../_shared/integrations/whatsapp.ts'

type VerifyPaymentInput = {
  orderUuid: string
  razorpay_order_id: string
  razorpay_payment_id: string
  razorpay_signature: string
}

type OrderSummary = {
  order_number: string
  invoice_number: string | null
  status: string
}

type PaymentSummary = {
  id: string
  order_id: string
  status: string
  provider_payment_id: string | null
}

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    requireRateLimit(request, {
      key: 'verify-payment',
      limit: 60,
      windowMs: 10 * 60 * 1000,
    })

    const input = normalizeInput(await request.json().catch(() => null))
    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      serviceRoleKey(),
      { auth: { persistSession: false } },
    )
    const { data: payment, error: paymentError } = await supabase
      .from('payments')
      .select('id,order_id,status,provider_payment_id')
      .eq('provider', 'razorpay')
      .eq('provider_order_id', input.razorpay_order_id)
      .eq('order_id', input.orderUuid)
      .single()

    if (paymentError || !payment) {
      throw new CheckoutError('Payment order not found', 404)
    }

    const paymentSummary = payment as PaymentSummary
    const order = await loadOrderSummary(supabase, input.orderUuid)

    if (paymentSummary.status === 'verified') {
      return jsonResponse({
        verified: true,
        orderUuid: input.orderUuid,
        orderNumber: order.order_number,
        invoiceNumber: order.invoice_number,
        orderId: input.razorpay_order_id,
        paymentId: paymentSummary.provider_payment_id ?? input.razorpay_payment_id,
        orderStatus: order.status,
      })
    }

    const verified = await verifyRazorpayPaymentSignature({
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      signature: input.razorpay_signature,
      secret: requiredEnv('RAZORPAY_KEY_SECRET'),
    })

    if (!verified) {
      await supabase
        .from('payments')
        .update({
          provider_payment_id: input.razorpay_payment_id,
          signature: input.razorpay_signature,
          status: 'failed',
          raw_payload: { source: 'checkout', reason: 'signature_mismatch' },
        })
        .eq('id', paymentSummary.id)

      await supabase
        .from('orders')
        .update({ status: 'payment_failed' })
        .eq('id', input.orderUuid)

      return jsonResponse(
        { verified: false, error: 'Payment signature mismatch' },
        { status: 400 },
      )
    }

    const { data: confirmation, error: confirmError } = await supabase.rpc(
      'confirm_paid_order',
      {
        p_order_id: input.orderUuid,
        p_payment_id: paymentSummary.id,
        p_provider_payment_id: input.razorpay_payment_id,
        p_signature: input.razorpay_signature,
        p_raw_payload: {
          source: 'checkout',
          razorpay_order_id: input.razorpay_order_id,
          razorpay_payment_id: input.razorpay_payment_id,
        },
      },
    )

    if (confirmError) throw confirmError

    const result = confirmation as { ok?: boolean; reason?: string; orderStatus?: string }
    if (!result.ok) {
      await alertPaymentReview(supabase, {
        orderId: input.orderUuid,
        reason: result.reason ?? 'payment_confirmation_failed',
        payload: { source: 'verify-payment', result },
      })

      return jsonResponse(
        {
          verified: false,
          error:
            result.reason === 'insufficient_stock'
              ? 'Payment received, but one item needs manual stock review.'
              : 'Payment requires manual review.',
          orderUuid: input.orderUuid,
          orderNumber: order.order_number,
          invoiceNumber: order.invoice_number,
          paymentId: input.razorpay_payment_id,
          orderStatus: result.orderStatus,
        },
      )
    }

    const shipment = await attemptShipmentCreation(supabase, input.orderUuid)
    await notifyOrderConfirmedOnWhatsApp(supabase, { orderId: input.orderUuid }).catch((error) => {
      console.error('WhatsApp order notification failed after payment verification', error)
    })

    return jsonResponse({
      verified: true,
      orderUuid: input.orderUuid,
      orderNumber: order.order_number,
      invoiceNumber: order.invoice_number,
      orderId: input.razorpay_order_id,
      paymentId: input.razorpay_payment_id,
      orderStatus: shipment?.orderStatus ?? 'shipment_pending',
      shipment,
    })
  } catch (error) {
    if (error instanceof RateLimitError) {
      return jsonResponse(
        { verified: false, error: error.message },
        {
          status: error.status,
          headers: { 'Retry-After': String(error.retryAfterSeconds) },
        },
      )
    }

    if (error instanceof CheckoutError) {
      return jsonResponse({ verified: false, error: error.message }, { status: error.status })
    }

    console.error(error)
    return jsonResponse(
      { verified: false, error: 'Unable to verify payment' },
      { status: 500 },
    )
  }
})

async function attemptShipmentCreation(supabase: SupabaseClient, orderId: string) {
  try {
    return await createShipmentWorkflow(supabase, {
      orderId,
      source: 'verify-payment',
    })
  } catch (error) {
    console.error('Shipment workflow failed after payment verification', error)

    try {
      await supabase
        .from('orders')
        .update({ status: 'shipment_pending' })
        .eq('id', orderId)
    } catch (updateError) {
      console.error('Unable to mark order shipment_pending after shipment failure', updateError)
    }

    return null
  }
}

async function loadOrderSummary(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('order_number,invoice_number,status')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new CheckoutError('Order not found', 404)
  }

  return data as OrderSummary
}

function normalizeInput(value: unknown): VerifyPaymentInput {
  if (!value || typeof value !== 'object') {
    throw new CheckoutError('Invalid payment verification request', 400)
  }

  const input = value as Partial<VerifyPaymentInput>
  const normalized = {
    orderUuid: String(input.orderUuid ?? '').trim(),
    razorpay_order_id: String(input.razorpay_order_id ?? '').trim(),
    razorpay_payment_id: String(input.razorpay_payment_id ?? '').trim(),
    razorpay_signature: String(input.razorpay_signature ?? '').trim(),
  }

  if (Object.values(normalized).some((field) => field.length === 0)) {
    throw new CheckoutError('Invalid payment verification request', 400)
  }

  return normalized
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new CheckoutError(`${name} is not configured`, 503)
  return value
}

function serviceRoleKey() {
  return Deno.env.get('OPS_SERVICE_ROLE_KEY') || requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
}

class CheckoutError extends Error {
  constructor(
    message: string,
    readonly status = 500,
  ) {
    super(message)
  }
}
