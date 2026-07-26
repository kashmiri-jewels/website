type PublicEnv = {
  VITE_UMAMI_DOMAINS?: string
  VITE_UMAMI_SCRIPT_URL?: string
  VITE_UMAMI_WEBSITE_ID?: string
}

type AnalyticsValue = boolean | number | string

type AnalyticsPayload = Record<string, AnalyticsValue | null | undefined>

type UmamiWindow = Window & {
  kashmiriJewelsUmamiBeforeSend?: (type: string, payload: { url?: string }) => false | { url?: string }
  umami?: {
    track: (eventName: AnalyticsEventName, payload?: Record<string, AnalyticsValue>) => void
  }
}

export type AnalyticsEventName =
  | 'add_to_bag'
  | 'buy_now'
  | 'cart_open'
  | 'checkout_click'
  | 'checkout_started'
  | 'checkout_submit'
  | 'payment_cancelled'
  | 'payment_failed'
  | 'purchase_completed'
  | 'quick_view_open'
  | 'razorpay_opened'
  | 'size_select'
  | 'style_finder_open'
  | 'style_finder_product_click'

const env = import.meta.env as PublicEnv

export function createUmamiHeadScripts() {
  if (!env.VITE_UMAMI_WEBSITE_ID || !env.VITE_UMAMI_SCRIPT_URL) return []

  return [
    {
      children: [
        'window.kashmiriJewelsUmamiBeforeSend=function(type,payload){',
        'try{',
        'var url=payload&&payload.url;',
        'var path=typeof url==="string"?new URL(url,window.location.origin).pathname:window.location.pathname;',
        'if(path.indexOf("/admin")===0){return false;}',
        '}catch(error){}',
        'return payload;',
        '};',
      ].join(''),
    },
    {
      defer: true,
      src: env.VITE_UMAMI_SCRIPT_URL,
      'data-before-send': 'kashmiriJewelsUmamiBeforeSend',
      'data-do-not-track': 'true',
      'data-domains': env.VITE_UMAMI_DOMAINS,
      'data-exclude-hash': 'true',
      'data-exclude-search': 'true',
      'data-website-id': env.VITE_UMAMI_WEBSITE_ID,
    },
  ]
}

export function trackAnalyticsEvent(eventName: AnalyticsEventName, payload: AnalyticsPayload = {}) {
  if (typeof window === 'undefined') return
  if (window.location.pathname.startsWith('/admin')) return

  const analytics = (window as UmamiWindow).umami
  if (!analytics) return

  const normalizedPayload = Object.fromEntries(
    Object.entries(payload).filter((entry): entry is [string, AnalyticsValue] => {
      const value = entry[1]
      return value !== null && value !== undefined && value !== ''
    }),
  )

  analytics.track(
    eventName,
    Object.keys(normalizedPayload).length > 0 ? normalizedPayload : undefined,
  )
}

export function createProductAnalyticsPayload(product: {
  category: string
  productId: string
  sellingPricePaise: number
}) {
  return {
    amount_bucket: getAmountBucket(product.sellingPricePaise),
    category: product.category,
    product_id: product.productId,
  }
}

export function getAmountBucket(amountPaise: number) {
  if (amountPaise < 100000) return 'under_1000'
  if (amountPaise < 150000) return '1000_1499'
  if (amountPaise < 200000) return '1500_1999'
  return '2000_plus'
}
