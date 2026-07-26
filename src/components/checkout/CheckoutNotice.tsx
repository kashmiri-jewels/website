import type { CheckoutStatus } from '../../lib/checkout'
import { formatPrice } from '../../lib/format'

type CheckoutNoticeProps = {
  status: CheckoutStatus
  message: string
  total: number
}

export function CheckoutNotice({ status, message, total }: CheckoutNoticeProps) {
  const isError = status === 'error'
  const isCancelled = status === 'cancelled'
  const isReady = status === 'ready'
  const title =
    status === 'preparing'
      ? 'Preparing payment'
      : status === 'opening'
        ? 'Opening payment'
        : status === 'payment-open'
          ? 'Payment window is open'
          : status === 'confirming'
            ? 'Confirming payment'
            : isReady
              ? 'Total refreshed'
              : isCancelled
                ? 'Payment paused'
                : isError
                  ? 'Check details'
                  : 'Checkout'
  const copy =
    message ||
    (status === 'preparing'
      ? 'We are checking stock and creating your secure payment order.'
      : status === 'opening'
        ? 'The payment window will open in a moment.'
        : status === 'payment-open'
          ? 'Complete payment in the secure payment window. You can return here if you close it.'
          : status === 'confirming'
            ? 'Do not refresh. We are verifying your payment and order.'
            : `Payable total: ${formatPrice(total)}`)

  return (
    <div
      className={`mt-4 border px-4 py-3 text-sm ${
        isError
          ? 'border-red-200 bg-red-50 text-red-800'
          : isCancelled
            ? 'border-amber-200 bg-amber-50 text-amber-900'
            : 'border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-muted)]'
      }`}
      aria-live="polite"
    >
      <p className="font-medium text-[var(--color-ink)]">{title}</p>
      <p className="mt-1 leading-6">{copy}</p>
    </div>
  )
}
