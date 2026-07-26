import { Button } from '@base-ui/react/button'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { createServerFn, useServerFn } from '@tanstack/react-start'
import { RefreshCw, ShieldCheck } from 'lucide-react'
import type { FormEvent } from 'react'
import { useState } from 'react'

import { AdminActionPanel } from '../components/admin/AdminActionPanel'
import { AdminDataTable } from '../components/admin/AdminDataTable'
import { AdminMetrics } from '../components/admin/AdminMetrics'
import { AdminViewTabs } from '../components/admin/AdminViewTabs'
import { createPageMeta } from '../lib/seo'
import type {
  CatalogPublishEnvironment,
  CatalogPublishRun,
} from '../lib/admin.server'
import {
  formatAdminDateTime,
  type AdminActionStatus,
  type AdminPublishEnvironment,
  type AdminViewKey,
} from '../lib/admin-ui'

const getAdminDashboard = createServerFn({ method: 'GET' }).handler(async () => {
  const { loadAdminDashboard } = await import('../lib/admin.server')
  return loadAdminDashboard()
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
  const dashboard = Route.useLoaderData()
  const router = useRouter()
  const retryShipment = useServerFn(retryAdminShipment)
  const dispatchCatalogPublish = useServerFn(publishCatalog)
  const loadPublishStatus = useServerFn(getCatalogPublishStatus)
  const [activeView, setActiveView] = useState<AdminViewKey>('recentOrders')
  const [orderNumber, setOrderNumber] = useState('')
  const [retryStatus, setRetryStatus] = useState<AdminActionStatus>('idle')
  const [retryMessage, setRetryMessage] = useState('')
  const [publishEnvironment, setPublishEnvironment] = useState<AdminPublishEnvironment>('qa')
  const [publishConfirmation, setPublishConfirmation] = useState('')
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

    if (publishEnvironment === 'prod' && publishConfirmation.trim().toUpperCase() !== 'PUBLISH PROD') {
      setPublishStatus('error')
      setPublishMessage('Type PUBLISH PROD before publishing production.')
      return
    }

    setPublishStatus('loading')
    setPublishMessage(`Dispatching ${publishEnvironment.toUpperCase()} catalog publish...`)

    try {
      const result = await dispatchCatalogPublish({ data: { environment: publishEnvironment } })
      setPublishStatus('success')
      setPublishMessage(
        `Catalog publish dispatched for ${result.environment.toUpperCase()} from ${result.ref}.`,
      )
      setPublishConfirmation('')
      await refreshPublishStatus()
    } catch (error) {
      setPublishStatus('error')
      setPublishMessage(error instanceof Error ? error.message : 'Unable to publish catalog')
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

        <section className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px] xl:items-start">
          <div className="min-w-0">
            <AdminViewTabs
              activeView={activeView}
              counts={dashboard.shownCounts}
              onChange={setActiveView}
            />
            <AdminDataTable dashboard={dashboard} activeView={activeView} rows={activeRows} />
          </div>

          <AdminActionPanel
            publishEnvironment={publishEnvironment}
            publishConfirmation={publishConfirmation}
            publishStatus={publishStatus}
            publishMessage={publishMessage}
            publishRuns={publishRuns}
            onPublishEnvironmentChange={setPublishEnvironment}
            onPublishConfirmationChange={setPublishConfirmation}
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
