import {
  AlertTriangle,
  Boxes,
  Clock3,
  CreditCard,
  RotateCcw,
  Truck,
  type LucideIcon,
} from 'lucide-react'

import type { AdminDashboard } from '../../lib/admin.server'
import type { AdminViewKey } from '../../lib/admin-ui'

const adminTabs: Array<{
  key: AdminViewKey
  label: string
  Icon: LucideIcon
}> = [
  { key: 'recentOrders', label: 'Recent', Icon: Clock3 },
  { key: 'shipmentPendingOrders', label: 'Shipments', Icon: Truck },
  { key: 'paymentReviewOrders', label: 'Review', Icon: CreditCard },
  { key: 'failedPayments', label: 'Payments', Icon: AlertTriangle },
  { key: 'returnRequests', label: 'Returns', Icon: RotateCcw },
  { key: 'integrationErrors', label: 'Errors', Icon: AlertTriangle },
  { key: 'lowStockVariants', label: 'Low stock', Icon: Boxes },
]

export function getAdminViewLabel(view: AdminViewKey) {
  return adminTabs.find((tab) => tab.key === view)?.label ?? 'Admin view'
}

export function AdminViewTabs({
  activeView,
  counts,
  onChange,
}: {
  activeView: AdminViewKey
  counts: AdminDashboard['shownCounts']
  onChange: (view: AdminViewKey) => void
}) {
  return (
    <div className="mb-3 overflow-x-auto">
      <div className="inline-flex min-w-max border border-[var(--color-line)] bg-[var(--color-surface)]">
        {adminTabs.map(({ key, label, Icon }) => (
          <button
            key={key}
            type="button"
            onClick={() => onChange(key)}
            className={`inline-flex h-11 items-center gap-2 border-r border-[var(--color-line)] px-3 text-sm font-medium transition duration-150 ease-out last:border-r-0 focus:outline-none focus-visible:relative focus-visible:z-10 focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] ${
              activeView === key
                ? 'bg-[var(--color-ink)] text-[var(--color-paper)]'
                : 'text-[var(--color-muted)] hover:bg-[var(--color-paper)] hover:text-[var(--color-ink)]'
            }`}
          >
            <Icon className="size-4" aria-hidden="true" />
            {label}
            <span
              className={`px-2 py-0.5 text-xs ${
                activeView === key
                  ? 'bg-[var(--color-paper)]/15 text-[var(--color-paper)]'
                  : 'bg-[var(--color-paper)] text-[var(--color-muted)]'
              }`}
            >
              {counts[key]}
            </span>
          </button>
        ))}
      </div>
    </div>
  )
}
