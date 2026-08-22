import { Button } from '@base-ui/react/button'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { LockKeyhole, RefreshCw, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { AdminActionPanel } from '../components/admin/AdminActionPanel'
import { AdminDataTable } from '../components/admin/AdminDataTable'
import { AdminMetrics } from '../components/admin/AdminMetrics'
import { AdminViewTabs } from '../components/admin/AdminViewTabs'
import { createPageMeta } from '../lib/seo'
import type {
  AdminDashboard,
  AdminDashboardState,
  CatalogPublishEnvironment,
  CatalogPublishRun,
} from '../lib/admin.server'
import {
  formatAdminDateTime,
  type AdminActionStatus,
  type AdminViewKey,
} from '../lib/admin-ui'

const getAdminDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadAdminDashboardState } = await import('../lib/admin.server')
  return loadAdminDashboardState()
})

const loginAdmin = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Admin password is required')
    }

    return {
      password: String((data as { password?: unknown }).password ?? ''),
    }
  })
  .handler(async ({ data }) => {
    const { loginAdminWithPassword } = await import('../lib/admin.server')
    return loginAdminWithPassword(data.password)
  })

const retryAdminShipment = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Order number is required')
    }

    return {
      orderNumber: String((data as { orderNumber?: unknown }).orderNumber ?? ''),
    }
  })
  .handler(async ({ data }) => {
    const { retryShipmentFromAdmin } = await import('../lib/admin.server')
    return retryShipmentFromAdmin(data.orderNumber)
  })

const publishCatalog = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Publish environment is required')
    }

    const environment = String((data as { environment?: unknown }).environment ?? '')
    if (environment !== 'qa' && environment !== 'prod') {
      throw new Error('Publish environment must be qa or prod')
    }

    return { environment: environment as CatalogPublishEnvironment }
  })
  .handler(async ({ data }) => {
    const { publishCatalogFromAdmin } = await import('../lib/admin.server')
    return publishCatalogFromAdmin(data.environment)
  })

const getCatalogPublishStatus = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadCatalogPublishStatus } = await import('../lib/admin.server')
  return loadCatalogPublishStatus()
})

export const Route = createFileRoute('/admin')({
  head: () => {
    const pageMeta = createPageMeta({
      title: 'Admin | Kashmiri Jewels',
      description: 'Operational dashboard for Kashmiri Jewels order and shipment management.',
      path: '/admin',
    })

    return {
      ...pageMeta,
      meta: [
        ...pageMeta.meta,
        { name: 'robots', content: 'noindex, nofollow' },
      ],
    }
  },
  loader: () => getAdminDashboard(),
  component: AdminPage,
})

function AdminPage() {
  const initialState = Route.useLoaderData() as AdminDashboardState
  const [adminState, setAdminState] = useState(initialState)

  if (!adminState.authenticated) {
    return <AdminPasswordGate initialMessage={adminState.message} onAuthenticated={setAdminState} />
  }

  return <AdminDashboardPage dashboard={adminState.dashboard} />
}

function AdminPasswordGate({
  initialMessage,
  onAuthenticated,
}: {
  initialMessage: string
  onAuthenticated: (state: AdminDashboardState) => void
}) {
  const submitLogin = useServerFn(loginAdmin)
  const [password, setPassword] = useState('')
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const [message, setMessage] = useState(initialMessage)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setStatus('loading')
    setMessage('')

    try {
      const state = await submitLogin({ data: { password } })
      onAuthenticated(state)
      setPassword('')
      setStatus('idle')
    } catch (error) {
      setStatus('error')
      setMessage(error instanceof Error ? error.message : 'Unable to unlock admin')
    }
  }

  return (
    <main className="grid min-h-[55svh] place-items-center px-4 py-12 sm:px-6 lg:px-8">
      <section className="w-full max-w-md border border-[var(--color-line)] bg-[var(--color-paper)] p-6">
        <span className="grid size-11 place-items-center bg-[var(--color-primary)] text-[#f7df9a]">
          <LockKeyhole className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-serif text-4xl font-normal leading-none text-[var(--color-ink)]">
          Admin locked
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
          Enter the admin password to view orders and operations.
        </p>
        <form className="mt-6 grid gap-4" onSubmit={handleSubmit}>
          <label className="grid gap-2 text-sm">
            <span className="font-medium text-[var(--color-ink)]">Admin password</span>
            <input
              value={password}
              type="password"
              autoComplete="current-password"
              onChange={(event) => setPassword(event.target.value)}
              className="h-11 border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)]"
            />
          </label>
          <Button
            type="submit"
            disabled={status === 'loading'}
            className="inline-flex h-11 items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] disabled:cursor-not-allowed disabled:opacity-60"
          >
            {status === 'loading' ? 'Unlocking...' : 'Unlock admin'}
          </Button>
          {message ? (
            <p className={`text-sm leading-6 ${status === 'error' ? 'text-red-700' : 'text-[var(--color-muted)]'}`}>
              {message}
            </p>
          ) : null}
        </form>
      </section>
    </main>
  )
}

function AdminDashboardPage({ dashboard }: { dashboard: AdminDashboard }) {
  const router = useRouter()
  const retryShipment = useServerFn(retryAdminShipment)
  const dispatchCatalogPublish = useServerFn(publishCatalog)
  const loadPublishStatus = useServerFn(getCatalogPublishStatus)
  const [activeView, setActiveView] = useState<AdminViewKey>('recentOrders')
  const [orderNumber, setOrderNumber] = useState('')
  const [retryStatus, setRetryStatus] = useState<AdminActionStatus>('idle')
  const [retryMessage, setRetryMessage] = useState('')
  const [publishStatus, setPublishStatus] = useState<AdminActionStatus>('idle')
  const [publishMessage, setPublishMessage] = useState('')
  const [publishRuns, setPublishRuns] = useState<CatalogPublishRun[]>([])
  const activeRows = dashboard.views[activeView]

  function refreshDashboard() {
    void router.invalidate()
  }

  async function submitRetry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setRetryStatus('loading')
    setRetryMessage('Retrying shipment...')

    try {
      const result = await retryShipment({ data: { orderNumber } })
      setRetryStatus('success')
      setRetryMessage(`Shipment retry requested for ${result.orderNumber}.`)
      setOrderNumber('')
    } catch (error) {
      setRetryStatus('error')
      setRetryMessage(error instanceof Error ? error.message : 'Unable to retry shipment')
    }
  }

  async function refreshPublishStatus() {
    setPublishStatus('loading')
    setPublishMessage('Loading publish status...')

    try {
      const status = await loadPublishStatus()
      setPublishRuns(status.runs)
      setPublishStatus('idle')
      setPublishMessage(status.runs.length > 0 ? 'Latest publish runs loaded.' : 'No publish runs found.')
    } catch (error) {
      setPublishStatus('error')
      setPublishMessage(error instanceof Error ? error.message : 'Unable to load publish status')
    }
  }

  async function submitPublishCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    setPublishStatus('loading')
    setPublishMessage('Updating website products...')

    try {
      const result = await dispatchCatalogPublish({ data: { environment: 'prod' } })
      setPublishStatus('success')
      setPublishMessage(
        'Product update started. Please wait 1-2 minutes, then refresh the website.',
      )
      await refreshPublishStatus()
    } catch (error) {
      setPublishStatus('error')
      setPublishMessage(error instanceof Error ? error.message : 'Unable to update website products')
    }
  }

  return (
    <main className="px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
      <div className="mx-auto max-w-[90rem]">
        <div className="mb-7 grid gap-5 border-b border-[var(--color-line)] pb-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
          <div className="min-w-0">
            <div className="inline-flex max-w-full items-center gap-2 border border-[var(--color-line)] bg-[var(--color-surface)] px-3 py-1.5 text-xs font-medium text-[var(--color-muted)]">
              <ShieldCheck className="size-4 shrink-0 text-[var(--color-accent-muted)]" aria-hidden="true" />
              <span className="min-w-0 truncate">{dashboard.adminEmail}</span>
            </div>
            <h1 className="mt-4 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-6xl">
              Admin
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--color-muted)]">
              Order, payment, shipment, integration, and inventory signals from Supabase ops views.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3 lg:justify-end">
            <p className="text-xs font-medium text-[var(--color-muted)]">
              Updated {formatAdminDateTime(dashboard.loadedAt)}
            </p>
            <Button
              type="button"
              onClick={refreshDashboard}
              className="inline-flex h-10 items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
            >
              <RefreshCw className="size-4" aria-hidden="true" />
              Refresh
            </Button>
          </div>
        </div>

        <AdminMetrics dashboard={dashboard} />

        <section className="mt-6 grid gap-6">
          <div className="min-w-0">
            <AdminViewTabs
              activeView={activeView}
              counts={dashboard.shownCounts}
              onChange={setActiveView}
            />
            <AdminDataTable dashboard={dashboard} activeView={activeView} rows={activeRows} />
          </div>

          <AdminActionPanel
            publishStatus={publishStatus}
            publishMessage={publishMessage}
            publishRuns={publishRuns}
            onPublishSubmit={submitPublishCatalog}
            onRefreshPublishStatus={refreshPublishStatus}
            orderNumber={orderNumber}
            retryStatus={retryStatus}
            retryMessage={retryMessage}
            onOrderNumberChange={setOrderNumber}
            onRetrySubmit={submitRetry}
          />
        </section>
      </div>
    </main>
  )
}
