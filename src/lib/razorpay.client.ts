export type RazorpaySuccessResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export type RazorpayOptions = {
  key: string
  amount: number
  currency: string
  name: string
  description: string
  order_id: string
  readonly?: {
    name?: boolean
    email?: boolean
    contact?: boolean
  }
  prefill?: {
    name?: string
    email?: string
    contact?: string
  }
  notes?: Record<string, string>
  theme?: {
    color: string
    backdrop_color?: string
  }
  modal?: {
    backdropclose?: boolean
    confirm_close?: boolean
    escape?: boolean
    handleback?: boolean
    ondismiss?: () => void
  }
  handler: (response: RazorpaySuccessResponse) => void
}

declare global {
  interface Window {
    Razorpay?: new (options: RazorpayOptions) => {
      open: () => void
    }
  }
}

export function loadRazorpayCheckout() {
  if (window.Razorpay) return Promise.resolve()

  return new Promise<void>((resolve, reject) => {
    const existingScript = document.querySelector<HTMLScriptElement>(
      'script[src="https://checkout.razorpay.com/v1/checkout.js"]',
    )

    if (existingScript) {
      if (existingScript.dataset.loaded === 'true' && window.Razorpay) {
        resolve()
        return
      }

      existingScript.addEventListener('load', () => resolve(), { once: true })
      existingScript.addEventListener('error', () => reject(new Error('Unable to load Razorpay')), {
        once: true,
      })
      return
    }

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => {
      script.dataset.loaded = 'true'
      resolve()
    }
    script.onerror = () => reject(new Error('Unable to load Razorpay'))
    document.head.append(script)
  })
}
