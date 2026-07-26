import { AlertTriangle, Boxes, CreditCard, Truck, type LucideIcon } from 'lucide-react'

import type { AdminDashboard } from '../../lib/admin.server'

type AdminMetricsProps = {
  dashboard: AdminDashboard
}

export function AdminMetrics({ dashboard }: AdminMetricsProps) {
  const criticalCount =
    dashboard.shownCounts.shipmentPendingOrders +
    dashboard.shownCounts.paymentReviewOrders +
    dashboard.shownCounts.failedPayments +
    dashboard.shownCounts.integrationErrors

  return (
    <section className="grid grid-cols-2 gap-px border border-[var(--color-line)] bg-[var(--color-line)] md:grid-cols-4">
      <MetricCard
        label="Open issues"
        value={criticalCount}
        tone={criticalCount > 0 ? 'alert' : 'normal'}
        Icon={AlertTriangle}
      />
      <MetricCard
        label="Shipment pending"
        value={dashboard.shownCounts.shipmentPendingOrders}
        tone={dashboard.shownCounts.shipmentPendingOrders > 0 ? 'alert' : 'normal'}
        Icon={Truck}
      />
      <MetricCard
        label="Payment review"
        value={dashboard.shownCounts.paymentReviewOrders}
        tone={dashboard.shownCounts.paymentReviewOrders > 0 ? 'alert' : 'normal'}
        Icon={CreditCard}
      />
      <MetricCard
        label="Low stock"
        value={dashboard.shownCounts.lowStockVariants}
        tone={dashboard.shownCounts.lowStockVariants > 0 ? 'alert' : 'normal'}
        Icon={Boxes}
      />
    </section>
  )
}

function MetricCard({
  label,
  value,
  tone,
  Icon,
}: {
  label: string
  value: number
  tone: 'normal' | 'alert'
  Icon: LucideIcon
}) {
  return (
    <div className="min-w-0 bg-[var(--color-surface)] p-3 sm:p-4">
      <div className="flex items-center justify-between gap-4">
        <p className="min-w-0 text-xs font-medium uppercase leading-4 tracking-[0.08em] text-[var(--color-muted)] sm:text-sm sm:normal-case sm:tracking-normal">
          {label}
        </p>
        <Icon
          className={`size-5 shrink-0 ${tone === 'alert' ? 'text-[var(--color-primary)]' : 'text-[var(--color-accent-muted)]'}`}
          aria-hidden="true"
        />
      </div>
      <p className="mt-3 text-3xl font-medium leading-none text-[var(--color-ink)]">{value}</p>
    </div>
  )
}
