const encoder = new TextEncoder()

export type RazorpayOrder = {
  id: string
  amount: number
  currency: string
  status: string
}

export async function createRazorpayOrder(input: {
  keyId: string
  keySecret: string
  amount: number
  currency: string
  receipt: string
  notes: Record<string, string>
}) {
  const response = await fetch('https://api.razorpay.com/v1/orders', {
    method: 'POST',
    headers: {
      Authorization: `Basic ${btoa(`${input.keyId}:${input.keySecret}`)}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: input.amount,
      currency: input.currency,
      receipt: input.receipt,
      notes: input.notes,
    }),
  })

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const description =
      payload && typeof payload === 'object' && 'error' in payload
        ? (payload.error as { description?: string }).description
        : undefined

    throw new Error(description ?? 'Unable to create Razorpay order')
  }

  return payload as RazorpayOrder
}

export async function verifyRazorpayPaymentSignature(input: {
  orderId: string
  paymentId: string
  signature: string
  secret: string
}) {
  const expected = await hmacSha256Hex(`${input.orderId}|${input.paymentId}`, input.secret)
  return timingSafeEqual(expected, input.signature)
}

export async function verifyRazorpayWebhookSignature(input: {
  body: string
  signature: string
  secret: string
}) {
  const expected = await hmacSha256Hex(input.body, input.secret)
  return timingSafeEqual(expected, input.signature)
}

async function hmacSha256Hex(value: string, secret: string) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signature = await crypto.subtle.sign('HMAC', key, encoder.encode(value))

  return [...new Uint8Array(signature)]
    .map((byte) => byte.toString(16).padStart(2, '0'))
    .join('')
}

function timingSafeEqual(left: string, right: string) {
  if (left.length !== right.length) return false

  let mismatch = 0
  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}
