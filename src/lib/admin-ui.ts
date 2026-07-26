import type { CatalogPublishRun } from './admin.server'

export type AdminViewKey =
  | 'recentOrders'
  | 'shipmentPendingOrders'
  | 'paymentReviewOrders'
  | 'failedPayments'
  | 'integrationErrors'
  | 'lowStockVariants'
  | 'returnRequests'

export type AdminActionStatus = 'idle' | 'loading' | 'success' | 'error'
export type AdminPublishEnvironment = 'qa' | 'prod'

export function getAdminViewDescription(view: AdminViewKey) {
  switch (view) {
    case 'recentOrders':
      return 'Latest orders across all operational states.'
    case 'shipmentPendingOrders':
      return 'Paid orders that need shipment creation, pickup, or logistics attention.'
    case 'paymentReviewOrders':
      return 'Orders where payment state needs manual review.'
    case 'failedPayments':
      return 'Orders or payment rows marked failed.'
    case 'integrationErrors':
      return 'Failed integration events and provider errors.'
    case 'lowStockVariants':
      return 'Active product variants at or below the low stock threshold.'
    case 'returnRequests':
      return 'Customer return requests waiting for review or follow-up.'
  }
}

export function formatAdminDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: 'Asia/Kolkata',
  }).format(date)
}

export function formatCatalogPublishRunStatus(run: CatalogPublishRun) {
  if (run.status === 'completed') return run.conclusion ?? 'completed'
  return run.status || 'queued'
}
