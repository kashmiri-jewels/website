type SupabaseError = { code?: string; message: string }

type SupabaseClient = {
  from: (table: string) => any
}

type OrderForWhatsApp = {
  id: string
  order_number: string
  customer_name: string
  customer_phone: string
  created_at: string
  total_amount_paise: number
  currency: string
  whatsapp_updates_opt_in: boolean
}

type WhatsAppConfig = {
  accessToken: string
  graphApiVersion: string
  phoneNumberId: string
  templateName: string
  templateLanguage: string
}

type WhatsAppSendResult =
  | { sent: true; messageId: string | null }
  | { sent: false; skipped?: boolean; reason: string }

const source = 'whatsapp'
const eventType = 'order_confirmed'

export async function notifyOrderConfirmedOnWhatsApp(
  supabase: SupabaseClient,
  input: { orderId: string },
): Promise<WhatsAppSendResult> {
  if (Deno.env.get('WHATSAPP_ORDER_NOTIFICATIONS_ENABLED') !== 'true') {
    return { sent: false, skipped: true, reason: 'whatsapp_disabled' }
  }

  const order = await loadOrder(supabase, input.orderId)
  const eventKey = `${eventType}:${order.id}`
  const maskedPhone = maskPhone(order.customer_phone)

  if (!order.whatsapp_updates_opt_in) {
    const claimed = await claimNotificationEvent(supabase, {
      eventKey,
      orderId: order.id,
      status: 'ignored',
      payload: {
        orderNumber: order.order_number,
        reason: 'customer_not_opted_in',
        to: maskedPhone,
      },
    })

    return claimed
      ? { sent: false, skipped: true, reason: 'customer_not_opted_in' }
      : { sent: false, skipped: true, reason: 'already_recorded' }
  }

  const claimed = await claimNotificationEvent(supabase, {
    eventKey,
    orderId: order.id,
    status: 'received',
    payload: {
      orderNumber: order.order_number,
      to: maskedPhone,
      template: Deno.env.get('WHATSAPP_ORDER_CONFIRMED_TEMPLATE_NAME') ?? null,
    },
  })

  if (!claimed) {
    return { sent: false, skipped: true, reason: 'already_recorded' }
  }

  const config = readConfig()
  if (!config.ok) {
    await markNotificationEvent(supabase, {
      eventKey,
      status: 'failed',
      errorMessage: config.reason,
      payload: { orderNumber: order.order_number, to: maskedPhone },
    })

    return { sent: false, reason: config.reason }
  }

  const recipientPhone = normalizeWhatsAppPhone(order.customer_phone)
  if (!recipientPhone) {
    const reason = 'invalid_customer_whatsapp_phone'
    await markNotificationEvent(supabase, {
      eventKey,
      status: 'failed',
      errorMessage: reason,
      payload: { orderNumber: order.order_number, to: maskedPhone },
    })

    return { sent: false, reason }
  }

  try {
    const providerPayload = await sendOrderConfirmedTemplate({
      config: config.value,
      order,
      recipientPhone,
    })
    const messageId = readProviderMessageId(providerPayload)

    await markNotificationEvent(supabase, {
      eventKey,
      status: 'processed',
      payload: {
        orderNumber: order.order_number,
        to: maskedPhone,
        messageId,
        whatsapp: providerPayload,
      },
    })

    return { sent: true, messageId }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'whatsapp_send_failed'
    await markNotificationEvent(supabase, {
      eventKey,
      status: 'failed',
      errorMessage,
      payload: { orderNumber: order.order_number, to: maskedPhone },
    })

    return { sent: false, reason: errorMessage }
  }
}

async function loadOrder(supabase: SupabaseClient, orderId: string) {
  const { data, error } = await supabase
    .from('orders')
    .select('id,order_number,customer_name,customer_phone,created_at,total_amount_paise,currency,whatsapp_updates_opt_in')
    .eq('id', orderId)
    .single()

  if (error || !data) {
    throw new Error(error?.message ?? 'whatsapp_order_not_found')
  }

  return data as OrderForWhatsApp
}

async function claimNotificationEvent(
  supabase: SupabaseClient,
  input: {
    eventKey: string
    orderId: string
    status: 'received' | 'ignored'
    payload: Record<string, unknown>
  },
) {
  const { error } = await supabase.from('integration_events').insert({
    source,
    event_type: eventType,
    event_key: input.eventKey,
    order_id: input.orderId,
    status: input.status,
    payload: input.payload,
  })

  if (!error) return true
  if (error.code === '23505') return false

  throw new Error(error.message)
}

async function markNotificationEvent(
  supabase: SupabaseClient,
  input: {
    eventKey: string
    status: 'processed' | 'failed'
    payload: Record<string, unknown>
    errorMessage?: string
  },
) {
  const { error } = await supabase
    .from('integration_events')
    .update({
      status: input.status,
      payload: input.payload,
      error_message: input.errorMessage ?? null,
    })
    .eq('event_key', input.eventKey)

  if (error) {
    console.error(`Unable to update WhatsApp event: ${error.message}`)
  }
}

function readConfig(): { ok: true; value: WhatsAppConfig } | { ok: false; reason: string } {
  const config = {
    accessToken: Deno.env.get('WHATSAPP_ACCESS_TOKEN') || Deno.env.get('WHATSAPP_API_TOKEN') || '',
    graphApiVersion: Deno.env.get('WHATSAPP_GRAPH_API_VERSION') ?? '',
    phoneNumberId: Deno.env.get('WHATSAPP_PHONE_NUMBER_ID') ?? '',
    templateName: Deno.env.get('WHATSAPP_ORDER_CONFIRMED_TEMPLATE_NAME') ?? '',
    templateLanguage: Deno.env.get('WHATSAPP_ORDER_CONFIRMED_TEMPLATE_LANGUAGE') ?? '',
  }

  const missing = Object.entries(config)
    .filter(([, value]) => !value)
    .map(([key]) => key)

  if (missing.length > 0) {
    return { ok: false, reason: `whatsapp_config_missing:${missing.join(',')}` }
  }

  if (!/^v\d+\.\d+$/.test(config.graphApiVersion)) {
    return { ok: false, reason: 'whatsapp_graph_api_version_invalid' }
  }

  return { ok: true, value: config }
}

async function sendOrderConfirmedTemplate(input: {
  config: WhatsAppConfig
  order: OrderForWhatsApp
  recipientPhone: string
}) {
  const response = await fetch(
    `https://graph.facebook.com/${input.config.graphApiVersion}/${input.config.phoneNumberId}/messages`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${input.config.accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        recipient_type: 'individual',
        to: input.recipientPhone,
        type: 'template',
        template: {
          name: input.config.templateName,
          language: { code: input.config.templateLanguage },
          components: [
            {
              type: 'body',
              parameters: [
                { type: 'text', text: firstName(input.order.customer_name) },
                { type: 'text', text: input.order.order_number },
                { type: 'text', text: estimatedDeliveryDate(input.order.created_at) },
              ],
            },
          ],
        },
      }),
    },
  )
  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    throw new Error(readProviderError(payload) ?? `whatsapp_http_${response.status}`)
  }

  return payload
}

function normalizeWhatsAppPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (/^\d{10}$/.test(digits)) return `91${digits}`
  if (/^91\d{10}$/.test(digits)) return digits

  return ''
}

function maskPhone(phone: string) {
  const digits = phone.replace(/\D/g, '')
  if (digits.length <= 4) return '****'

  return `${'*'.repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`
}

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? 'there'
}

function estimatedDeliveryDate(orderCreatedAt: string) {
  const baseDateMs = Date.parse(orderCreatedAt)
  const baseDate = Number.isFinite(baseDateMs) ? new Date(baseDateMs) : new Date()
  const deliveryDays = readPositiveIntegerEnv('WHATSAPP_ESTIMATED_DELIVERY_DAYS', 7)
  baseDate.setUTCDate(baseDate.getUTCDate() + deliveryDays)

  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'long',
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
  }).format(baseDate)
}

function readPositiveIntegerEnv(name: string, fallback: number) {
  const value = Number(Deno.env.get(name))
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function readProviderMessageId(payload: unknown) {
  if (!payload || typeof payload !== 'object') return null
  const messages = (payload as { messages?: unknown }).messages
  if (!Array.isArray(messages) || messages.length === 0) return null
  const first = messages[0]

  return first && typeof first === 'object' && 'id' in first ? String(first.id ?? '') || null : null
}

function readProviderError(payload: unknown) {
  if (!payload || typeof payload !== 'object' || !('error' in payload)) return null
  const error = (payload as { error?: { message?: unknown; code?: unknown; error_subcode?: unknown } }).error
  if (!error) return null
  const message = typeof error.message === 'string' ? error.message : 'WhatsApp API request failed'
  const code = error.code ? ` code=${error.code}` : ''
  const subcode = error.error_subcode ? ` subcode=${error.error_subcode}` : ''

  return `${message}${code}${subcode}`
}
