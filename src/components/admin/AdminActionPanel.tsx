import { Button } from '@base-ui/react/button'
import {
  ExternalLink,
  LoaderCircle,
  PackageCheck,
  RefreshCw,
  Rocket,
  RotateCw,
} from 'lucide-react'
import type { FormEvent } from 'react'

import type { CatalogPublishRun } from '../../lib/admin.server'
import {
  formatAdminDateTime,
  formatCatalogPublishRunStatus,
  type AdminActionStatus,
} from '../../lib/admin-ui'

type AdminActionPanelProps = {
  publishStatus: AdminActionStatus
  publishMessage: string
  publishRuns: CatalogPublishRun[]
  onPublishSubmit: (event: FormEvent<HTMLFormElement>) => void
  onRefreshPublishStatus: () => void
  orderNumber: string
  retryStatus: AdminActionStatus
  retryMessage: string
  onOrderNumberChange: (orderNumber: string) => void
  onRetrySubmit: (event: FormEvent<HTMLFormElement>) => void
}

export function AdminActionPanel({
  publishStatus,
  publishMessage,
  publishRuns,
  onPublishSubmit,
  onRefreshPublishStatus,
  orderNumber,
  retryStatus,
  retryMessage,
  onOrderNumberChange,
  onRetrySubmit,
}: AdminActionPanelProps) {
  return (
    <section className="grid gap-6 lg:grid-cols-2">
      <form
        onSubmit={onPublishSubmit}
        className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-[var(--color-ink)] text-[var(--color-paper)]">
            <Rocket className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-medium text-[var(--color-ink)]">
              Update website products
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
              Click this after changing the Google Sheet. It updates products, prices, stock, and
              images on the live website.
            </p>
          </div>
        </div>

        <Button
          type="submit"
          disabled={publishStatus === 'loading'}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:active:scale-100"
        >
          {publishStatus === 'loading' ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <Rocket className="size-4" aria-hidden="true" />
          )}
          Update website products
        </Button>

        <Button
          type="button"
          onClick={onRefreshPublishStatus}
          disabled={publishStatus === 'loading'}
          className="mt-3 inline-flex h-10 w-full items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:active:scale-100"
        >
          <RefreshCw className="size-4" aria-hidden="true" />
          Check update status
        </Button>

        {publishMessage ? (
          <p
            className={`mt-3 px-3 py-2 text-sm leading-6 ${
              publishStatus === 'error'
                ? 'bg-red-50 text-red-800'
                : publishStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-[var(--color-paper)] text-[var(--color-muted)]'
            }`}
          >
            {publishMessage}
          </p>
        ) : null}

        {publishRuns.length > 0 ? (
          <div className="mt-4 divide-y divide-[var(--color-line)] border border-[var(--color-line)] bg-[var(--color-paper)]">
            {publishRuns.map((run) => (
              <a
                key={run.id}
                href={run.htmlUrl}
                target="_blank"
                rel="noreferrer"
                className="flex items-start justify-between gap-3 px-3 py-3 text-sm transition hover:bg-[var(--color-surface)]"
              >
                <span>
                  <span className="font-medium text-[var(--color-ink)]">
                    {run.branch || 'workflow'}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--color-muted)]">
                    {formatCatalogPublishRunStatus(run)} · {formatAdminDateTime(run.createdAt)}
                  </span>
                </span>
                <ExternalLink className="mt-0.5 size-4 shrink-0 text-[var(--color-muted)]" aria-hidden="true" />
              </a>
            ))}
          </div>
        ) : null}
      </form>

      <form
        onSubmit={onRetrySubmit}
        className="border border-[var(--color-line)] bg-[var(--color-surface)] p-5"
      >
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center bg-[var(--color-ink)] text-[var(--color-paper)]">
            <RotateCw className="size-5" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-base font-medium text-[var(--color-ink)]">
              Retry shipment
            </h2>
            <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
              Runs the existing shipment retry function for a paid order in a valid shipment
              state.
            </p>
          </div>
        </div>
        <label className="mt-5 block text-sm font-medium text-[var(--color-ink)]">
          Order number
          <input
            value={orderNumber}
            onChange={(event) => onOrderNumberChange(event.target.value)}
            placeholder="KJ-20260511-A7K2F1"
            className="mt-2 h-11 w-full border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-sm text-[var(--color-ink)] outline-none transition focus:border-[var(--color-primary)] focus:ring-2 focus:ring-[var(--color-primary)]/20"
          />
        </label>
        <Button
          type="submit"
          disabled={retryStatus === 'loading'}
          className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 bg-[var(--color-primary)] px-4 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:active:scale-100"
        >
          {retryStatus === 'loading' ? (
            <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          ) : (
            <PackageCheck className="size-4" aria-hidden="true" />
          )}
          Retry shipment
        </Button>
        {retryMessage ? (
          <p
            className={`mt-3 px-3 py-2 text-sm leading-6 ${
              retryStatus === 'error'
                ? 'bg-red-50 text-red-800'
                : retryStatus === 'success'
                  ? 'bg-emerald-50 text-emerald-800'
                  : 'bg-[var(--color-paper)] text-[var(--color-muted)]'
            }`}
          >
            {retryMessage}
          </p>
        ) : null}
      </form>
    </section>
  )
}
