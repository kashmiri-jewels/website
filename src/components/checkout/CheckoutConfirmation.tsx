import { Button } from '@base-ui/react/button'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, CheckCircle2 } from 'lucide-react'

import type { CheckoutConfirmation as CheckoutConfirmationData } from '../../lib/checkout'
import {
  formatCustomerDeliveryStatus,
  formatCustomerOrderStatus,
} from '../../lib/checkout'

type CheckoutConfirmationProps = {
  confirmation: CheckoutConfirmationData
  message: string
}

export function CheckoutConfirmation({ confirmation, message }: CheckoutConfirmationProps) {
  return (
    <main className="px-4 py-14 sm:px-6 sm:py-20 lg:px-8">
      <section className="mx-auto max-w-3xl text-center">
        <span className="mx-auto grid size-14 place-items-center bg-[var(--color-accent-muted)] text-[var(--color-paper)]">
          {confirmation.needsReview ? (
            <AlertTriangle className="size-6" aria-hidden="true" />
          ) : (
            <CheckCircle2 className="size-6" aria-hidden="true" />
          )}
        </span>
        <p className="mt-6 text-sm font-medium text-[var(--color-muted)]">Order {confirmation.orderNumber}</p>
        <h1 className="mt-3 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-6xl">
          {confirmation.needsReview ? 'Payment received' : 'Order confirmed'}
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-6 text-[var(--color-muted)]">
          {message}
        </p>
      </section>

      <section className="mx-auto mt-10 max-w-3xl border-y border-[var(--color-line)] py-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <ConfirmationLine label="Order number" value={confirmation.orderNumber} />
          <ConfirmationLine label="Payment reference" value={confirmation.paymentId ?? 'Recorded'} />
          <ConfirmationLine
            label="Order"
            value={formatCustomerOrderStatus(confirmation.orderStatus ?? 'paid')}
          />
          <ConfirmationLine
            label="Delivery"
            value={
              confirmation.trackingNumber
                ? confirmation.trackingNumber
                : formatCustomerDeliveryStatus(confirmation.shipmentStatus ?? 'shipment_pending')
            }
          />
        </div>
        <div className="mt-6 flex flex-col gap-3 border-t border-[var(--color-line)] pt-5 sm:flex-row sm:justify-end">
          <Button
            nativeButton={false}
            render={
              <Link
                to="/products"
                className="inline-flex h-11 items-center justify-center border border-[var(--color-line)] bg-[var(--color-paper)] px-5 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
              />
            }
          >
            Continue shopping
          </Button>
        </div>
      </section>
    </main>
  )
}

function ConfirmationLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--color-line)] bg-[var(--color-surface)] p-4 text-left">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-[var(--color-muted)]">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-medium leading-6 text-[var(--color-ink)]">{value}</p>
    </div>
  )
}
