import { createServerFn, useServerFn } from '@tanstack/react-start'
import { Ban, Download, Eye, PackageCheck, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useState } from 'react'

import type {
  AdminDashboard,
  AdminIntegrationErrorRow,
  AdminLowStockVariantRow,
  AdminOrderDetails,
  AdminOrderRow,
  AdminReturnRequestRow,
} from '../../lib/admin.server'
import {
  formatAdminDateTime,
  getAdminViewDescription,
  type AdminViewKey,
} from '../../lib/admin-ui'
import { formatPrice } from '../../lib/format'
import { getAdminViewLabel } from './AdminViewTabs'

const downloadAdminInvoice = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Order number is required')
    }

    return {
      orderNumber: String((data as { orderNumber?: unknown }).orderNumber ?? ''),
    }
  })
  .handler(async ({ data }) => {
    const { generateAdminInvoiceDownload } = await import('../../lib/admin.server')
    return generateAdminInvoiceDownload(data.orderNumber)
  })

const loadOrderDetails = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Order number is required')
    }

    return {
      orderNumber: String((data as { orderNumber?: unknown }).orderNumber ?? ''),
    }
  })
  .handler(async ({ data }) => {
    const { loadAdminOrderDetails } = await import('../../lib/admin.server')
    return loadAdminOrderDetails(data.orderNumber)
  })

const cancelAdminOrder = createServerFn({ method: 'POST' })
  .inputValidator((data: unknown) => {
    if (!data || typeof data !== 'object') {
      throw new Error('Order number is required')
    }

    return {
      orderNumber: String((data as { orderNumber?: unknown }).orderNumber ?? ''),
    }
  })
  .handler(async ({ data }) => {
    const { cancelOrderFromAdmin } = await import('../../lib/admin.server')
    return cancelOrderFromAdmin(data.orderNumber)
  })

export function AdminDataTable({
  dashboard,
  activeView,
  rows,
}: {
  dashboard: AdminDashboard
  activeView: AdminViewKey
  rows: AdminDashboard['views'][AdminViewKey]
}) {
  return (
    <section className="overflow-hidden border border-[var(--color-line)] bg-[var(--color-paper)]">
      <div className="flex flex-col gap-2 border-b border-[var(--color-line)] bg-[var(--color-surface)] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-base font-medium text-[var(--color-ink)]">
            {getAdminViewLabel(activeView)}
          </h2>
          <p className="mt-1 text-sm text-[var(--color-muted)]">
            {getAdminViewDescription(activeView)}
          </p>
        </div>
        <p className="text-xs font-medium text-[var(--color-muted)]">
          {dashboard.shownCounts[activeView]} shown
        </p>
      </div>
      {rows.length === 0 ? (
        <div className="bg-[var(--color-surface)] px-4 py-12 text-center">
          <PackageCheck className="mx-auto size-8 text-[var(--color-accent-muted)]" aria-hidden="true" />
          <p className="mt-3 text-sm font-medium text-[var(--color-ink)]">No rows to review</p>
        </div>
      ) : activeView === 'integrationErrors' ? (
        <IntegrationErrorsTable rows={rows as AdminIntegrationErrorRow[]} />
      ) : activeView === 'lowStockVariants' ? (
        <LowStockTable rows={rows as AdminLowStockVariantRow[]} />
      ) : activeView === 'returnRequests' ? (
        <ReturnRequestsTable rows={rows as AdminReturnRequestRow[]} />
      ) : (
        <OrdersTable rows={rows as AdminOrderRow[]} />
      )}
    </section>
  )
}

function OrdersTable({ rows }: { rows: AdminOrderRow[] }) {
  const loadDetails = useServerFn(loadOrderDetails)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetails | null>(null)
  const [loadingOrderNumber, setLoadingOrderNumber] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  async function handleOpenDetails(orderNumber: string) {
    setLoadingOrderNumber(orderNumber)
    setDetailsError(null)

    try {
      const details = await loadDetails({ data: { orderNumber } })
      setSelectedOrder(details)
    } catch {
      setDetailsError('Unable to load order details.')
    } finally {
      setLoadingOrderNumber(null)
    }
  }

  return (
    <>
      <OrderMobileCards rows={rows} />
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--color-paper)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Shipment</TableHead>
              <TableHead>Created</TableHead>
              <TableHead>Actions</TableHead>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)]">
            {rows.map((row) => (
              <tr key={`${row.order_number}-${row.created_at}`} className="border-t border-[var(--color-line)] transition duration-150 ease-out hover:bg-[var(--color-paper)]">
                <TableCell>
                  <p className="font-medium text-[var(--color-ink)]">{row.order_number}</p>
                  {row.invoice_number ? (
                    <p className="mt-1 text-xs text-[var(--color-muted)]">Invoice {row.invoice_number}</p>
                  ) : null}
                  <StatusBadge value={row.order_status} />
                </TableCell>
                <TableCell>
                  <p className="font-medium text-[var(--color-ink)]">{row.customer_name || '-'}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{row.customer_phone || '-'}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{row.customer_email || '-'}</p>
                </TableCell>
                <TableCell>
                  {typeof row.total_amount_paise === 'number'
                    ? formatPrice(row.total_amount_paise)
                    : '-'}
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.payment_status || '-'} />
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.shipment_status || '-'} />
                  <p className="mt-1 text-xs text-[var(--color-muted)]">
                    {row.tracking_number || 'No tracking'}
                  </p>
                </TableCell>
                <TableCell>{formatAdminDateTime(row.created_at)}</TableCell>
                <TableCell>
                  <div className="flex flex-wrap gap-2">
                    <OrderDetailsButton
                      loading={loadingOrderNumber === row.order_number}
                      onClick={() => void handleOpenDetails(row.order_number)}
                    />
                    <InvoiceDownloadButton orderNumber={row.order_number} />
                    <CancelOrderButton
                      orderNumber={row.order_number}
                      orderStatus={row.order_status}
                      shipmentStatus={row.shipment_status}
                    />
                  </div>
                  {detailsError && loadingOrderNumber === null ? (
                    <p className="mt-2 max-w-40 text-xs leading-5 text-red-700">{detailsError}</p>
                  ) : null}
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {selectedOrder ? (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      ) : null}
    </>
  )
}

function IntegrationErrorsTable({ rows }: { rows: AdminIntegrationErrorRow[] }) {
  return (
    <>
      <IntegrationErrorMobileCards rows={rows} />
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[860px] w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--color-paper)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <TableHead>Source</TableHead>
              <TableHead>Event</TableHead>
              <TableHead>Order</TableHead>
              <TableHead>Error</TableHead>
              <TableHead>Created</TableHead>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)]">
            {rows.map((row) => (
              <tr
                key={`${row.source}-${row.event_type}-${row.order_number}-${row.created_at}`}
                className="border-t border-[var(--color-line)] transition duration-150 ease-out hover:bg-[var(--color-paper)]"
              >
                <TableCell>
                  <p className="font-medium text-[var(--color-ink)]">{row.source || '-'}</p>
                  <StatusBadge value={row.status || '-'} />
                </TableCell>
                <TableCell>{row.event_type || '-'}</TableCell>
                <TableCell>{row.order_number || '-'}</TableCell>
                <TableCell>
                  <p className="max-w-xl whitespace-normal leading-6">{row.error_message || '-'}</p>
                </TableCell>
                <TableCell>{formatAdminDateTime(row.created_at)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function LowStockTable({ rows }: { rows: AdminLowStockVariantRow[] }) {
  return (
    <>
      <LowStockMobileCards rows={rows} />
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[760px] w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--color-paper)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <TableHead>Product</TableHead>
              <TableHead>Variant</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Stock</TableHead>
              <TableHead>Status</TableHead>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)]">
            {rows.map((row) => (
              <tr key={row.variant_id} className="border-t border-[var(--color-line)] transition duration-150 ease-out hover:bg-[var(--color-paper)]">
                <TableCell>
                  <p className="font-medium text-[var(--color-ink)]">{row.title}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{row.slug}</p>
                </TableCell>
                <TableCell>
                  <p>{row.size_label}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{row.variant_id}</p>
                </TableCell>
                <TableCell>{row.category}</TableCell>
                <TableCell>
                  <span className="text-base font-medium text-[var(--color-primary)]">
                    {row.stock_available}
                  </span>
                </TableCell>
                <TableCell>
                  <StatusBadge value={row.product_active && row.variant_active ? 'active' : 'inactive'} />
                </TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function ReturnRequestsTable({ rows }: { rows: AdminReturnRequestRow[] }) {
  return (
    <>
      <ReturnRequestMobileCards rows={rows} />
      <div className="hidden overflow-x-auto sm:block">
        <table className="min-w-[980px] w-full border-collapse text-left text-sm">
          <thead className="bg-[var(--color-paper)] text-xs uppercase text-[var(--color-muted)]">
            <tr>
              <TableHead>Order</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Reason</TableHead>
              <TableHead>Total</TableHead>
              <TableHead>Requested</TableHead>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-surface)]">
            {rows.map((row) => (
              <tr key={row.id} className="border-t border-[var(--color-line)] transition duration-150 ease-out hover:bg-[var(--color-paper)]">
                <TableCell>
                  <p className="font-medium text-[var(--color-ink)]">{row.order_number}</p>
                  <StatusBadge value={row.status} />
                  <p className="mt-2 text-xs text-[var(--color-muted)]">
                    Order {formatStatusText(row.order_status || '-')}
                  </p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-[var(--color-ink)]">{row.customer_name || '-'}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{row.customer_phone || '-'}</p>
                  <p className="mt-1 text-xs text-[var(--color-muted)]">{row.customer_email || '-'}</p>
                </TableCell>
                <TableCell>
                  <p className="font-medium text-[var(--color-ink)]">{formatStatusText(row.reason)}</p>
                  {row.customer_note ? (
                    <p className="mt-2 max-w-md whitespace-normal text-xs leading-5 text-[var(--color-muted)]">
                      {row.customer_note}
                    </p>
                  ) : null}
                </TableCell>
                <TableCell>
                  {typeof row.total_amount_paise === 'number'
                    ? formatPrice(row.total_amount_paise)
                    : '-'}
                </TableCell>
                <TableCell>{formatAdminDateTime(row.created_at)}</TableCell>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  )
}

function OrderMobileCards({ rows }: { rows: AdminOrderRow[] }) {
  const loadDetails = useServerFn(loadOrderDetails)
  const [selectedOrder, setSelectedOrder] = useState<AdminOrderDetails | null>(null)
  const [loadingOrderNumber, setLoadingOrderNumber] = useState<string | null>(null)
  const [detailsError, setDetailsError] = useState<string | null>(null)

  async function handleOpenDetails(orderNumber: string) {
    setLoadingOrderNumber(orderNumber)
    setDetailsError(null)

    try {
      const details = await loadDetails({ data: { orderNumber } })
      setSelectedOrder(details)
    } catch {
      setDetailsError('Unable to load order details.')
    } finally {
      setLoadingOrderNumber(null)
    }
  }

  return (
    <>
      <div className="divide-y divide-[var(--color-line)] sm:hidden">
        {rows.map((row) => (
          <article key={`${row.order_number}-${row.created_at}`} className="px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="break-words text-sm font-medium text-[var(--color-ink)]">
                  {row.order_number}
                </p>
                {row.invoice_number ? (
                  <p className="mt-1 break-words text-xs text-[var(--color-muted)]">
                    Invoice {row.invoice_number}
                  </p>
                ) : null}
                <StatusBadge value={row.order_status} />
              </div>
              <p className="shrink-0 text-sm font-medium text-[var(--color-ink)]">
                {typeof row.total_amount_paise === 'number'
                  ? formatPrice(row.total_amount_paise)
                  : '-'}
              </p>
            </div>

            <div className="mt-4 grid gap-3 text-sm">
              <MobileField label="Customer">
                <p className="font-medium text-[var(--color-ink)]">{row.customer_name || '-'}</p>
                <p className="mt-1 break-words text-xs text-[var(--color-muted)]">
                  {row.customer_phone || '-'}
                </p>
                <p className="mt-1 break-words text-xs text-[var(--color-muted)]">
                  {row.customer_email || '-'}
                </p>
              </MobileField>
              <div className="grid grid-cols-2 gap-3">
                <MobileField label="Payment">
                  <StatusBadge value={row.payment_status || '-'} />
                </MobileField>
                <MobileField label="Shipment">
                  <StatusBadge value={row.shipment_status || '-'} />
                </MobileField>
              </div>
              <MobileField label="Tracking">
                {row.tracking_number || 'No tracking'}
              </MobileField>
              <MobileField label="Created">
                {formatAdminDateTime(row.created_at)}
              </MobileField>
              <div className="flex flex-wrap gap-2">
                <OrderDetailsButton
                  loading={loadingOrderNumber === row.order_number}
                  onClick={() => void handleOpenDetails(row.order_number)}
                />
                <InvoiceDownloadButton orderNumber={row.order_number} />
                <CancelOrderButton
                  orderNumber={row.order_number}
                  orderStatus={row.order_status}
                  shipmentStatus={row.shipment_status}
                />
              </div>
              {detailsError && loadingOrderNumber === null ? (
                <p className="text-xs leading-5 text-red-700">{detailsError}</p>
              ) : null}
            </div>
          </article>
        ))}
      </div>
      {selectedOrder ? (
        <OrderDetailsModal order={selectedOrder} onClose={() => setSelectedOrder(null)} />
      ) : null}
    </>
  )
}

function IntegrationErrorMobileCards({ rows }: { rows: AdminIntegrationErrorRow[] }) {
  return (
    <div className="divide-y divide-[var(--color-line)] sm:hidden">
      {rows.map((row) => (
        <article
          key={`${row.source}-${row.event_type}-${row.order_number}-${row.created_at}`}
          className="px-4 py-4"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-[var(--color-ink)]">
                {row.source || '-'}
              </p>
              <StatusBadge value={row.status || '-'} />
            </div>
            <p className="shrink-0 text-xs font-medium text-[var(--color-muted)]">
              {formatAdminDateTime(row.created_at)}
            </p>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <MobileField label="Event">{row.event_type || '-'}</MobileField>
            <MobileField label="Order">{row.order_number || '-'}</MobileField>
            <MobileField label="Error">
              <span className="break-words leading-6">{row.error_message || '-'}</span>
            </MobileField>
          </div>
        </article>
      ))}
    </div>
  )
}

function LowStockMobileCards({ rows }: { rows: AdminLowStockVariantRow[] }) {
  return (
    <div className="divide-y divide-[var(--color-line)] sm:hidden">
      {rows.map((row) => (
        <article key={row.variant_id} className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-[var(--color-ink)]">
                {row.title}
              </p>
              <p className="mt-1 break-words text-xs text-[var(--color-muted)]">{row.slug}</p>
            </div>
            <p className="shrink-0 text-lg font-medium text-[var(--color-primary)]">
              {row.stock_available}
            </p>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            <MobileField label="Variant">
              <span className="font-medium text-[var(--color-ink)]">{row.size_label}</span>
              <span className="mt-1 block break-words text-xs text-[var(--color-muted)]">
                {row.variant_id}
              </span>
            </MobileField>
            <MobileField label="Category">{row.category}</MobileField>
            <MobileField label="Status">
              <StatusBadge value={row.product_active && row.variant_active ? 'active' : 'inactive'} />
            </MobileField>
          </div>
        </article>
      ))}
    </div>
  )
}

function ReturnRequestMobileCards({ rows }: { rows: AdminReturnRequestRow[] }) {
  return (
    <div className="divide-y divide-[var(--color-line)] sm:hidden">
      {rows.map((row) => (
        <article key={row.id} className="px-4 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-words text-sm font-medium text-[var(--color-ink)]">
                {row.order_number}
              </p>
              <StatusBadge value={row.status} />
            </div>
            <p className="shrink-0 text-xs font-medium text-[var(--color-muted)]">
              {formatAdminDateTime(row.created_at)}
            </p>
          </div>
          <div className="mt-4 grid gap-3 text-sm">
            <MobileField label="Customer">
              <p className="font-medium text-[var(--color-ink)]">{row.customer_name || '-'}</p>
              <p className="mt-1 break-words text-xs text-[var(--color-muted)]">
                {row.customer_phone || '-'}
              </p>
            </MobileField>
            <MobileField label="Reason">{formatStatusText(row.reason)}</MobileField>
            {row.customer_note ? (
              <MobileField label="Note">
                <span className="break-words leading-6">{row.customer_note}</span>
              </MobileField>
            ) : null}
            <MobileField label="Total">
              {typeof row.total_amount_paise === 'number'
                ? formatPrice(row.total_amount_paise)
                : '-'}
            </MobileField>
          </div>
        </article>
      ))}
    </div>
  )
}

function MobileField({ children, label }: { children: ReactNode; label: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[0.68rem] font-medium uppercase text-[var(--color-muted)]">{label}</p>
      <div className="mt-1 text-[var(--color-ink-soft)]">{children}</div>
    </div>
  )
}

function TableHead({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-medium">{children}</th>
}

function TableCell({ children }: { children: ReactNode }) {
  return <td className="px-4 py-4 align-top text-[var(--color-ink-soft)]">{children}</td>
}

function StatusBadge({ value }: { value: string }) {
  const normalized = value.replaceAll('_', ' ')
  const alert = /failed|review|pending|error/i.test(value)

  return (
    <span
      className={`mt-2 inline-flex border px-2 py-1 text-xs font-medium ${
        alert ? 'bg-red-50 text-red-800' : 'bg-emerald-50 text-emerald-800'
      }`}
    >
      {normalized}
    </span>
  )
}

function InvoiceDownloadButton({ orderNumber }: { orderNumber: string }) {
  const downloadInvoice = useServerFn(downloadAdminInvoice)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')

  async function handleDownload() {
    setStatus('loading')

    try {
      const invoice = await downloadInvoice({ data: { orderNumber } })
      downloadBase64File(invoice.base64, invoice.filename)
      setStatus('idle')
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={status === 'loading'}
        className="inline-flex w-fit items-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Download className="size-3.5" aria-hidden="true" />
        {status === 'loading' ? 'Generating...' : 'Invoice'}
      </button>
      {status === 'error' ? (
        <p className="mt-2 max-w-36 text-xs leading-5 text-red-700">Unable to generate invoice.</p>
      ) : null}
    </div>
  )
}

function CancelOrderButton({
  orderNumber,
  orderStatus,
  shipmentStatus,
}: {
  orderNumber: string
  orderStatus: string
  shipmentStatus: string | null
}) {
  const cancelOrder = useServerFn(cancelAdminOrder)
  const [status, setStatus] = useState<'idle' | 'loading' | 'error'>('idle')
  const canCancel =
    !['cancelled', 'delivered'].includes(orderStatus) &&
    !['in_transit', 'delivered'].includes(shipmentStatus ?? '')

  async function handleCancel() {
    if (!canCancel) return
    const confirmed = window.confirm(
      `Cancel order ${orderNumber}? This marks the order as cancelled in admin.`,
    )
    if (!confirmed) return

    setStatus('loading')

    try {
      await cancelOrder({ data: { orderNumber } })
      window.location.reload()
    } catch {
      setStatus('error')
    }
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        disabled={!canCancel || status === 'loading'}
        className="inline-flex w-fit items-center gap-2 border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-800 transition duration-150 ease-out hover:border-red-300 hover:bg-red-100 disabled:cursor-not-allowed disabled:border-[var(--color-line)] disabled:bg-[var(--color-paper)] disabled:text-[var(--color-muted)] disabled:opacity-70"
      >
        <Ban className="size-3.5" aria-hidden="true" />
        {status === 'loading' ? 'Cancelling...' : 'Cancel'}
      </button>
      {status === 'error' ? (
        <p className="mt-2 max-w-40 text-xs leading-5 text-red-700">Unable to cancel order.</p>
      ) : null}
    </div>
  )
}

function OrderDetailsButton({ loading, onClick }: { loading: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={loading}
      className="inline-flex w-fit items-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-3 py-2 text-xs font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] disabled:cursor-not-allowed disabled:opacity-60"
    >
      <Eye className="size-3.5" aria-hidden="true" />
      {loading ? 'Loading...' : 'Details'}
    </button>
  )
}

function OrderDetailsModal({
  onClose,
  order,
}: {
  onClose: () => void
  order: AdminOrderDetails
}) {
  const address = formatShippingAddress(order.order.shipping_address)

  return (
    <div className="fixed inset-0 z-50 flex items-end bg-black/35 p-0 sm:items-center sm:p-6">
      <div className="max-h-[92vh] w-full overflow-y-auto border border-[var(--color-line)] bg-[var(--color-paper)] shadow-xl sm:mx-auto sm:max-w-5xl">
        <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[var(--color-line)] bg-[var(--color-paper)] px-4 py-4 sm:px-6">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Order details
            </p>
            <h2 className="mt-1 text-xl font-medium text-[var(--color-ink)]">
              {order.order.order_number}
            </h2>
            {order.order.invoice_number ? (
              <p className="mt-1 text-sm text-[var(--color-muted)]">
                Invoice {order.order.invoice_number}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close order details"
            className="grid size-10 shrink-0 place-items-center border border-[var(--color-line)] text-[var(--color-ink)] transition hover:border-[var(--color-primary)] hover:text-[var(--color-primary)]"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </div>

        <div className="grid gap-6 px-4 py-5 sm:px-6 lg:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
          <section>
            <h3 className="text-sm font-medium text-[var(--color-ink)]">Items ordered</h3>
            <div className="mt-3 divide-y divide-[var(--color-line)] border border-[var(--color-line)]">
              {order.items.map((item) => (
                <div key={item.id} className="grid gap-3 bg-[var(--color-surface)] p-3 sm:grid-cols-[56px_minmax(0,1fr)_auto]">
                  <div className="size-14 overflow-hidden bg-[var(--color-paper)]">
                    {item.primary_image_url ? (
                      <img
                        src={item.primary_image_url}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : null}
                  </div>
                  <div className="min-w-0">
                    <p className="font-medium leading-6 text-[var(--color-ink)]">{item.title}</p>
                    <p className="mt-1 text-xs leading-5 text-[var(--color-muted)]">
                      {item.product_code || item.variant_id} / {item.size_label}
                    </p>
                    <p className="mt-1 break-words text-xs leading-5 text-[var(--color-muted)]">
                      Product: {item.product_id || '-'} · Variant: {item.variant_id || '-'}
                    </p>
                  </div>
                  <div className="text-sm sm:text-right">
                    <p className="font-medium text-[var(--color-ink)]">
                      {formatPrice(item.line_total_paise)}
                    </p>
                    <p className="mt-1 text-xs text-[var(--color-muted)]">
                      {item.quantity} × {formatPrice(item.unit_selling_price_paise)}
                    </p>
                    {item.discount_amount_paise > 0 ? (
                      <p className="mt-1 text-xs text-[var(--color-muted)]">
                        Discount {formatPrice(item.discount_amount_paise * item.quantity)}
                      </p>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <aside className="grid gap-4">
            <DetailPanel title="Customer">
              <DetailRow label="Name" value={order.order.customer_name} />
              <DetailRow label="Phone" value={order.order.customer_phone} />
              <DetailRow label="Email" value={order.order.customer_email} />
              <DetailRow label="Shipping" value={address} multiline />
            </DetailPanel>

            <DetailPanel title="Order">
              <DetailRow label="Order number" value={order.order.order_number} />
              <DetailRow label="Invoice number" value={order.order.invoice_number || '-'} />
              <DetailRow label="Status" value={formatStatusText(order.order.status)} />
              <DetailRow label="Created" value={formatAdminDateTime(order.order.created_at)} />
              <DetailRow label="Subtotal" value={formatPrice(order.order.subtotal_amount_paise)} />
              <DetailRow label="Shipping" value={formatPrice(order.order.shipping_amount_paise)} />
              <DetailRow label="Total" value={formatPrice(order.order.total_amount_paise)} />
            </DetailPanel>

            <DetailPanel title="Payment and shipment">
              <DetailRow label="Payment" value={order.payment ? formatStatusText(order.payment.status) : '-'} />
              <DetailRow label="Payment ID" value={order.payment?.provider_payment_id || '-'} />
              <DetailRow label="Provider order" value={order.payment?.provider_order_id || '-'} />
              <DetailRow label="Shipment" value={order.shipment ? formatStatusText(order.shipment.status) : '-'} />
              <DetailRow label="Tracking" value={order.shipment?.tracking_number || '-'} />
            </DetailPanel>

            {order.returnRequests.length > 0 ? (
              <DetailPanel title="Return requests">
                {order.returnRequests.map((returnRequest) => (
                  <div key={returnRequest.id} className="border-b border-[var(--color-line)] pb-3 last:border-b-0 last:pb-0">
                    <DetailRow label="Status" value={formatStatusText(returnRequest.status)} />
                    <DetailRow label="Reason" value={formatStatusText(returnRequest.reason)} />
                    <DetailRow label="Requested" value={formatAdminDateTime(returnRequest.created_at)} />
                    {returnRequest.customer_note ? (
                      <DetailRow label="Note" value={returnRequest.customer_note} multiline />
                    ) : null}
                  </div>
                ))}
              </DetailPanel>
            ) : null}
          </aside>
        </div>
      </div>
    </div>
  )
}

function DetailPanel({ children, title }: { children: ReactNode; title: string }) {
  return (
    <section className="border border-[var(--color-line)] bg-[var(--color-surface)] p-4">
      <h3 className="text-sm font-medium text-[var(--color-ink)]">{title}</h3>
      <dl className="mt-3 grid gap-3">{children}</dl>
    </section>
  )
}

function DetailRow({
  label,
  multiline = false,
  value,
}: {
  label: string
  multiline?: boolean
  value: string
}) {
  return (
    <div>
      <dt className="text-[0.68rem] font-medium uppercase text-[var(--color-muted)]">{label}</dt>
      <dd className={`mt-1 text-sm text-[var(--color-ink-soft)] ${multiline ? 'whitespace-pre-line leading-6' : 'break-words'}`}>
        {value || '-'}
      </dd>
    </div>
  )
}

function formatShippingAddress(value: unknown) {
  if (!value || typeof value !== 'object') return '-'
  const address = value as Record<string, unknown>
  const lines = [
    readDisplayString(address.addressLine),
    readDisplayString(address.landmark),
    [readDisplayString(address.city), readDisplayString(address.state), readDisplayString(address.pincode)]
      .filter(Boolean)
      .join(', '),
  ].filter(Boolean)

  return lines.length > 0 ? lines.join('\n') : '-'
}

function readDisplayString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function formatStatusText(value: string) {
  return value.replaceAll('_', ' ') || '-'
}

function downloadBase64File(base64: string, filename: string) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength)
  const blob = new Blob([buffer], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}
