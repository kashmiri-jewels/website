import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowUpRight, LoaderCircle, RotateCcw, Search, Truck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { formatPrice } from '../lib/format'
import { createPageMeta } from '../lib/seo'
import { getSupabaseClient, isSupabaseConfigured } from '../lib/supabase'

type CustomerOrderResponse = {
  order: CustomerOrder
  returnRequested: boolean
}

type CustomerOrder = {
  orderNumber: string
  invoiceNumber: string | null
  status: string
  subtotalAmountPaise: number
  shippingAmountPaise: number
  totalAmountPaise: number
  customerName: string
  customerEmail: string
  customerPhone: string
  shippingAddress: {
    city: string
    state: string
    pincode: string
  }
  createdAt: string
  items: CustomerOrderItem[]
  payment: {
    status: string
    amountPaise: number
    currency: string
    verifiedAt: string | null
  } | null
  shipment: {
    provider: string
    status: string
    providerStatus: string | null
    trackingNumber: string | null
    trackingUrl: string | null
    updatedAt: string
  } | null
  returnRequests: Array<{
    id: string
    status: string
    reason: string
    note: string | null
    createdAt: string
  }>
  canRequestReturn: boolean
}

type CustomerOrderItem = {
  id: string
  productSlug: string
  variantSlug: string
  productCode: string
  title: string
  size: string
  quantity: number
  unitSellingPricePaise: number
  unitMrpPaise: number
  discountAmountPaise: number
  lineTotalPaise: number
  primaryImageUrl: string | null
}

type TurnstileWindow = Window & {
  turnstile?: {
    render: (
      element: HTMLElement,
      options: {
        sitekey: string
        callback: (token: string) => void
        'expired-callback': () => void
        'error-callback': () => void
      },
    ) => string
    reset: (widgetId: string) => void
    remove: (widgetId: string) => void
  }
  __kashmiriJewelsTurnstileReady?: () => void
}

const turnstileSiteKey = (import.meta.env.VITE_TURNSTILE_SITE_KEY as string | undefined) ?? ''

const returnReasons = [
  { value: 'size_issue', label: 'Size or fit issue' },
  { value: 'damaged_or_defective', label: 'Damaged or defective item' },
  { value: 'wrong_item', label: 'Wrong item received' },
  { value: 'quality_issue', label: 'Quality issue' },
  { value: 'changed_mind', label: 'Changed my mind' },
  { value: 'other', label: 'Other' },
]

export const Route = createFileRoute('/orders')({
  head: () =>
    createPageMeta({
      title: 'Track order | Kashmiri Jewels',
      description: 'Track a Kashmiri Jewels order or request a return using your order number and phone.',
      path: '/orders',
    }),
  component: OrdersPage,
})

function OrdersPage() {
  const [lookup, setLookup] = useState('')
  const [turnstileToken, setTurnstileToken] = useState('')
  const [order, setOrder] = useState<CustomerOrder | null>(null)
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState('')
  const [turnstileResetSignal, setTurnstileResetSignal] = useState(0)

  async function submitLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const response = await invokeCustomerOrder({
        action: 'lookup',
        lookup,
        turnstileToken,
      })
      setOrder(response.order)
      setStatus('success')
      setMessage('Order loaded.')
    } catch (error) {
      setOrder(null)
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to load this order.')
    } finally {
      setTurnstileToken('')
      setTurnstileResetSignal((current) => current + 1)
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
      <div className="mx-auto max-w-6xl">
        <div className={order ? 'grid gap-8 lg:grid-cols-[minmax(320px,0.8fr)_minmax(0,1.2fr)] lg:items-start' : 'mx-auto max-w-xl'}>
          <OrderLookupForm
            message={message}
            lookup={lookup}
            status={status}
            turnstileResetSignal={turnstileResetSignal}
            turnstileTokenEnabled={Boolean(turnstileSiteKey)}
            onLookupChange={setLookup}
            onSubmit={submitLookup}
            onTurnstileTokenChange={setTurnstileToken}
          />

          {order ? (
            <section>
              <OrderDetails order={order} lookup={lookup} onOrderChange={setOrder} />
            </section>
          ) : null}
        </div>
      </div>
    </main>
  )
}

function OrderLookupForm({
  message,
  onLookupChange,
  onSubmit,
  onTurnstileTokenChange,
  lookup,
  status,
  turnstileResetSignal,
  turnstileTokenEnabled,
}: {
  message: string
  onLookupChange: (value: string) => void
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  onTurnstileTokenChange: (token: string) => void
  lookup: string
  status: 'idle' | 'loading' | 'success' | 'error'
  turnstileResetSignal: number
  turnstileTokenEnabled: boolean
}) {
  return (
    <section className="border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:p-6">
      <p className="text-sm font-medium text-[var(--color-muted)]">Orders</p>
      <h1 className="mt-2 font-serif text-4xl font-normal leading-none text-[var(--color-ink)] sm:text-5xl">
        Track your order
      </h1>
      <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
        Enter your order number, invoice number, or phone number to view shipment status or request a return.
      </p>

      <form className="mt-6 grid gap-4" onSubmit={onSubmit}>
        <FormField
          label="Order ID or phone"
          value={lookup}
          inputMode="text"
          placeholder="KJ-20260823-ABC123 or 10 digit mobile number"
          onChange={onLookupChange}
        />
        {turnstileTokenEnabled ? (
          <TurnstileWidget
            resetSignal={turnstileResetSignal}
            siteKey={turnstileSiteKey}
            onTokenChange={onTurnstileTokenChange}
          />
        ) : null}
        <button
          type="submit"
          disabled={status === 'loading'}
          className="inline-flex h-11 items-center justify-center gap-2 bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {status === 'loading' ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Search className="size-4" aria-hidden="true" />
          )}
          {status === 'loading' ? 'Checking...' : 'View order'}
        </button>
        {message && status === 'error' ? (
          <p className="text-sm leading-6 text-red-700">{message}</p>
        ) : null}
      </form>
    </section>
  )
}

function OrderDetails({
  lookup,
  onOrderChange,
  order,
}: {
  lookup: string
  onOrderChange: (order: CustomerOrder) => void
  order: CustomerOrder
}) {
  const [reason, setReason] = useState(returnReasons[0].value)
  const [note, setNote] = useState('')
  const [returnTurnstileToken, setReturnTurnstileToken] = useState('')
  const [returnTurnstileResetSignal, setReturnTurnstileResetSignal] = useState(0)
  const [returnStatus, setReturnStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [returnMessage, setReturnMessage] = useState('')
  const latestReturn = order.returnRequests[0]
  const address = [order.shippingAddress.city, order.shippingAddress.state, order.shippingAddress.pincode]
    .filter(Boolean)
    .join(', ')

  async function submitReturn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setReturnStatus('loading')
    setReturnMessage('')

    try {
      const response = await invokeCustomerOrder({
        action: 'request_return',
        lookup: lookup || order.orderNumber,
        reason,
        note,
        turnstileToken: returnTurnstileToken,
      })
      onOrderChange(response.order)
      setReturnStatus('success')
      setReturnMessage('Return request received. Our team will review eligibility and follow up.')
      setNote('')
    } catch (error) {
      setReturnStatus('error')
      setReturnMessage(error instanceof Error ? error.message : 'Unable to request return.')
    } finally {
      setReturnTurnstileToken('')
      setReturnTurnstileResetSignal((current) => current + 1)
    }
  }

  return (
    <div className="grid gap-5">
      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-sm font-medium text-[var(--color-muted)]">{order.orderNumber}</p>
            <h2 className="mt-1 text-2xl font-medium text-[var(--color-ink)]">
              {formatStatus(order.status)}
            </h2>
            <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
              Ordered on {formatDate(order.createdAt)} for {order.customerName}
            </p>
          </div>
          <div className="text-sm sm:text-right">
            <p className="font-medium text-[var(--color-ink)]">{formatPrice(order.totalAmountPaise)}</p>
            <p className="mt-1 text-[var(--color-muted)]">{order.customerPhone}</p>
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <StatusPanel label="Payment" value={formatStatus(order.payment?.status ?? 'not started')} />
          <StatusPanel label="Shipment" value={formatStatus(order.shipment?.status ?? 'not created')} />
          <StatusPanel label="Delivering to" value={address || '-'} />
        </div>
      </div>

      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <Truck className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          <h3 className="text-base font-medium text-[var(--color-ink)]">Tracking</h3>
        </div>
        {order.shipment?.trackingNumber ? (
          <div className="mt-4 grid gap-3 text-sm">
            <p className="text-[var(--color-muted)]">
              Tracking number <span className="font-medium text-[var(--color-ink)]">{order.shipment.trackingNumber}</span>
            </p>
            {order.shipment.providerStatus ? (
              <p className="text-[var(--color-muted)]">Carrier status: {order.shipment.providerStatus}</p>
            ) : null}
            {order.shipment.trackingUrl ? (
              <a
                href={order.shipment.trackingUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex w-fit items-center gap-2 border border-[var(--color-line)] px-4 py-2 font-medium text-[var(--color-ink)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
              >
                Open Delhivery tracking
                <ArrowUpRight className="size-4" aria-hidden="true" />
              </a>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Tracking will appear here after the shipment is created.
          </p>
        )}
      </div>

      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:p-6">
        <h3 className="text-base font-medium text-[var(--color-ink)]">Items</h3>
        <div className="mt-4 divide-y divide-[var(--color-line)] border border-[var(--color-line)]">
          {order.items.map((item) => (
            <div key={item.id} className="grid gap-3 bg-[var(--color-surface)] p-3 sm:grid-cols-[64px_minmax(0,1fr)_auto]">
              <div className="size-16 overflow-hidden bg-[var(--color-paper)]">
                {item.primaryImageUrl ? (
                  <img src={item.primaryImageUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
                ) : null}
              </div>
              <div className="min-w-0">
                <Link
                  to="/products/$slug"
                  params={{ slug: item.variantSlug }}
                  className="font-medium leading-6 text-[var(--color-ink)] transition hover:text-[var(--color-primary)]"
                >
                  {item.title}
                </Link>
                <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                  {item.productCode} / {item.size} / Qty {item.quantity}
                </p>
              </div>
              <p className="text-sm font-medium text-[var(--color-ink)] sm:text-right">
                {formatPrice(item.lineTotalPaise)}
              </p>
            </div>
          ))}
        </div>
      </div>

      <div className="border border-[var(--color-line)] bg-[var(--color-paper)] p-4 sm:p-6">
        <div className="flex items-center gap-2">
          <RotateCcw className="size-4 text-[var(--color-primary)]" aria-hidden="true" />
          <h3 className="text-base font-medium text-[var(--color-ink)]">Return request</h3>
        </div>
        {latestReturn ? (
          <div className="mt-4 bg-[var(--color-surface)] p-4 text-sm">
            <p className="font-medium text-[var(--color-ink)]">
              {formatStatus(latestReturn.status)}
            </p>
            <p className="mt-2 text-[var(--color-muted)]">
              Requested on {formatDate(latestReturn.createdAt)} for {formatStatus(latestReturn.reason)}.
            </p>
          </div>
        ) : null}
        {order.canRequestReturn ? (
          <form className="mt-4 grid gap-4" onSubmit={submitReturn}>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--color-ink)]">Reason</span>
              <select
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                className="h-11 border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
              >
                {returnReasons.map((returnReason) => (
                  <option key={returnReason.value} value={returnReason.value}>
                    {returnReason.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm">
              <span className="font-medium text-[var(--color-ink)]">Note</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={600}
                rows={4}
                className="resize-y border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-[var(--color-ink)] outline-none focus:border-[var(--color-primary)]"
                placeholder="Add any detail that helps us review the return."
              />
            </label>
            {turnstileSiteKey ? (
              <TurnstileWidget
                resetSignal={returnTurnstileResetSignal}
                siteKey={turnstileSiteKey}
                onTokenChange={setReturnTurnstileToken}
              />
            ) : null}
            <button
              type="submit"
              disabled={returnStatus === 'loading'}
              className="inline-flex h-11 w-fit items-center justify-center gap-2 bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {returnStatus === 'loading' ? <LoaderCircle className="size-4 animate-spin" aria-hidden="true" /> : null}
              Request return
            </button>
          </form>
        ) : latestReturn ? null : (
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
            Return requests become available after payment is confirmed.
          </p>
        )}
        {returnMessage ? (
          <p className={`mt-3 text-sm leading-6 ${returnStatus === 'error' ? 'text-red-700' : 'text-[var(--color-muted)]'}`}>
            {returnMessage}
          </p>
        ) : null}
      </div>
    </div>
  )
}

function FormField({
  inputMode,
  label,
  onChange,
  placeholder,
  value,
}: {
  inputMode?: 'text' | 'tel'
  label: string
  onChange: (value: string) => void
  placeholder: string
  value: string
}) {
  return (
    <label className="grid gap-2 text-sm">
      <span className="font-medium text-[var(--color-ink)]">{label}</span>
      <input
        value={value}
        inputMode={inputMode}
        placeholder={placeholder}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)]"
      />
    </label>
  )
}

function StatusPanel({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-3">
      <p className="text-[0.68rem] font-medium uppercase text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-sm font-medium text-[var(--color-ink)]">{value}</p>
    </div>
  )
}

function TurnstileWidget({
  onTokenChange,
  resetSignal,
  siteKey,
}: {
  onTokenChange: (token: string) => void
  resetSignal: number
  siteKey: string
}) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const widgetIdRef = useRef<string | null>(null)
  const widgetKey = useMemo(() => `turnstile-${siteKey}`, [siteKey])

  useEffect(() => {
    const turnstileWindow = window as TurnstileWindow

    function renderWidget() {
      if (!containerRef.current || !turnstileWindow.turnstile || widgetIdRef.current) return

      widgetIdRef.current = turnstileWindow.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        callback: onTokenChange,
        'expired-callback': () => onTokenChange(''),
        'error-callback': () => onTokenChange(''),
      })
    }

    if (turnstileWindow.turnstile) {
      renderWidget()
    } else {
      turnstileWindow.__kashmiriJewelsTurnstileReady = renderWidget
      const existingScript = document.querySelector<HTMLScriptElement>('script[data-kashmiri-jewels-turnstile]')
      if (!existingScript) {
        const script = document.createElement('script')
        script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?onload=__kashmiriJewelsTurnstileReady&render=explicit'
        script.async = true
        script.defer = true
        script.dataset.kashmiriJewelsTurnstile = 'true'
        document.head.appendChild(script)
      }
    }

    return () => {
      if (widgetIdRef.current && turnstileWindow.turnstile) {
        turnstileWindow.turnstile.remove(widgetIdRef.current)
      }
      widgetIdRef.current = null
    }
  }, [onTokenChange, siteKey, widgetKey])

  useEffect(() => {
    const turnstileWindow = window as TurnstileWindow
    if (widgetIdRef.current && turnstileWindow.turnstile) {
      turnstileWindow.turnstile.reset(widgetIdRef.current)
    }
  }, [resetSignal])

  return <div ref={containerRef} className="min-h-[65px]" />
}

async function invokeCustomerOrder(body: Record<string, unknown>) {
  if (!isSupabaseConfigured) {
    throw new Error('Order lookup is temporarily unavailable.')
  }

  const supabase = getSupabaseClient()
  const { data, error } = await supabase.functions.invoke<CustomerOrderResponse>('customer-order', {
    body,
  })

  if (error || !data) {
    throw new Error(await readFunctionErrorMessage(error))
  }

  return data
}

async function readFunctionErrorMessage(error: unknown) {
  if (error && typeof error === 'object' && 'context' in error) {
    const context = (error as { context?: { json?: () => Promise<unknown> } }).context
    const body = await context?.json?.().catch(() => null)

    if (body && typeof body === 'object' && 'error' in body) {
      const message = (body as { error?: unknown }).error
      if (typeof message === 'string' && message) return message
    }
  }

  return error instanceof Error ? error.message : 'Unable to load this order.'
}

function formatStatus(value: string) {
  return value.replaceAll('_', ' ')
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}
