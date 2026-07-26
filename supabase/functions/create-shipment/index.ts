import { createClient } from 'npm:@supabase/supabase-js@2.105.4'

import { createShipmentWorkflow, ShipmentWorkflowError } from '../_shared/domain/shipments.ts'
import { AuthError, requireServiceRole } from '../_shared/http/auth.ts'
import { handleCors, jsonResponse } from '../_shared/http/cors.ts'

type ShipmentRequest = {
  orderId?: string
  orderNumber?: string
}

Deno.serve(async (request) => {
  const cors = handleCors(request)
  if (cors) return cors

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 })
  }

  try {
    requireServiceRole(request)

    const input = normalizeInput(await request.json().catch(() => null))
    const supabase = createClient(
      requiredEnv('SUPABASE_URL'),
      requiredEnv('SUPABASE_SERVICE_ROLE_KEY'),
      { auth: { persistSession: false } },
    )
    const result = await createShipmentWorkflow(supabase, {
      orderId: input.orderId,
      orderNumber: input.orderNumber,
      source: 'create-shipment',
    })

    return jsonResponse(result)
  } catch (error) {
    if (error instanceof AuthError || error instanceof ShipmentWorkflowError) {
      return jsonResponse({ error: error.message }, { status: error.status })
    }

    console.error(error)
    return jsonResponse({ error: 'Unable to create shipment' }, { status: 500 })
  }
})

function normalizeInput(value: unknown): ShipmentRequest {
  if (!value || typeof value !== 'object') {
    throw new ShipmentWorkflowError('orderId or orderNumber is required', 400)
  }

  const input = value as ShipmentRequest
  const orderId = String(input.orderId ?? '').trim()
  const orderNumber = String(input.orderNumber ?? '').trim()

  if (!orderId && !orderNumber) {
    throw new ShipmentWorkflowError('orderId or orderNumber is required', 400)
  }

  return {
    orderId: orderId || undefined,
    orderNumber: orderNumber || undefined,
  }
}

function requiredEnv(name: string) {
  const value = Deno.env.get(name)
  if (!value) throw new ShipmentWorkflowError(`${name} is not configured`, 503)
  return value
}
