import { createClient } from 'npm:@supabase/supabase-js@2.105.4'

import { alertPaymentReview, createShipmentWorkflow } from '../_shared/domain/shipments.ts'
import { handleCors, jsonResponse } from '../_shared/http/cors.ts'
import { verifyRazorpayWebhookSignature } from '../_shared/integrations/razorpay.ts'
import { notifyOrderConfirmedOnWhatsApp } from '../_shared/integrations/whatsapp.ts'

type RazorpayWebhookPayload = {
  event?: string
  created_at?: number
  payload?: {
    payment?: {
      entity?: {
        id?: string
        order_id?: string
      }
    }
    order?: {
      entity?: {
        id?: string
      }
    }
  }
}

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    const signature = request.headers.get('x-razorpay-signature')
    if (!signature) throw new CheckoutError('Missing Razorpay webhook signature', 400)

    const body = await request.text()
    const verified = await verifyRazorpayWebhookSignature({
      body,
      signature,
      secret: requiredEnv('RAZORPAY_WEBHOOK_SECRET'),
    })

    if (!verified) {
      return jsonResponse(
        { received: false, error: 'Webhook signature mismatch' },
        { status: 400 },
      )
    }

    const event = JSON.parse(body) as RazorpayWebhookPayload
    const eventName = event.event ?? 'unknown'
    const paymentId = event.payload?.payment?.entity?.id
    const providerOrderId =
      event.payload?.payment?.entity?.order_id ?? event.payload?.order?.entity?.id
    const eventKey = [eventName, providerOrderId, paymentId, event.created_at ?? Date.now()]
      .filter(Boolean)
      .join(':')

    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      serviceRoleKey(),
      { auth: { persistSession: false } },
    )
    const { data: payment } = providerOrderId
      ? await supabase
          .from('payments')
          .select('id,order_id,status')
          .eq('provider', 'razorpay')
          .eq('provider_order_id', providerOrderId)
          .maybeSingle()
      : { data: null }
    const { error: eventError } = await supabase
      .from('integration_events')
      .insert({
        source: 'razorpay',
        event_type: eventName,
        event_key: eventKey,
        order_id: payment?.order_id ?? null,
        status: payment ? 'received' : 'ignored',
        payload: event,
      })

    if (eventError && eventError.code !== '23505') throw eventError

    if (payment && providerOrderId && paymentId && eventName === 'payment.captured') {
      const { data: confirmation, error: confirmError } = await supabase.rpc('confirm_paid_order', {
        p_order_id: payment.order_id,
        p_payment_id: payment.id,
        p_provider_payment_id: paymentId,
        p_signature: `webhook:${signature.slice(0, 32)}`,
        p_raw_payload: event,
      })

      if (confirmError) throw confirmError

      const result = confirmation as { ok?: boolean; reason?: string; orderStatus?: string }
      if (!result.ok) {
        await alertPaymentReview(supabase, {
          orderId: payment.order_id,
          reason: result.reason ?? 'webhook_payment_confirmation_failed',
          payload: { source: 'razorpay-webhook', event: eventName, result },
        })
      } else if (['paid', 'shipment_pending'].includes(result.orderStatus ?? '')) {
        await createShipmentWorkflow(supabase, {
          orderId: payment.order_id,
          source: 'razorpay-webhook',
        }).catch(async (error) => {
          console.error('Shipment workflow failed from Razorpay webhook', error)

          try {
            await supabase
              .from('orders')
              .update({ status: 'shipment_pending' })
              .eq('id', payment.order_id)
          } catch (updateError) {
            console.error('Unable to mark order shipment_pending after webhook shipment failure', updateError)
          }
        })
        await notifyOrderConfirmedOnWhatsApp(supabase, { orderId: payment.order_id }).catch((error) => {
          console.error('WhatsApp order notification failed from Razorpay webhook', error)
        })
      }
    }

    if (payment && paymentId && eventName === 'payment.failed') {
      await supabase
        .from('payments')
        .update({
          provider_payment_id: paymentId,
          status: 'failed',
          raw_payload: event,
        })
        .eq('id', payment.id)

      await supabase
        .from('orders')
        .update({ status: 'payment_failed' })
        .eq('id', payment.order_id)
    }

    return jsonResponse({ received: true, event: eventName })
  } catch (error) {
    if (error instanceof CheckoutError) {
      return jsonResponse({ received: false, error: error.message }, { status: error.status })
    }

    console.error(error)
    if (Deno.env.get('RAZORPAY_WEBHOOK_DEBUG') === 'true') {
      return jsonResponse(
        {
          received: false,
          error: error instanceof Error ? error.message : 'Unable to process webhook',
        },
        { status: 500 },
      )
    }

    return jsonResponse({ received: false, error: 'Unable to process webhook' }, { status: 500 })
  }
})

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
