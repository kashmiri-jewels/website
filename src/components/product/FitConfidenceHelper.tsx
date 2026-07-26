import { Dialog } from '@base-ui/react/dialog'
import { Button } from '@base-ui/react/button'
import { Ruler, X } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'

import type { Product } from '../../data/products'
import {
  getFitMessage,
  getFitRecommendation,
  getStoredFitBust,
  storeFitBust,
} from '../../lib/fit-confidence'

type FitConfidenceHelperProps = {
  product: Product
  onSelectSize?: (size: string) => void
}

export function FitConfidenceHelper({
  product,
  onSelectSize,
}: FitConfidenceHelperProps) {
  const [open, setOpen] = useState(false)
  const [referenceBust, setReferenceBust] = useState('')
  const numericReferenceBust = Number(referenceBust)
  const recommendation = useMemo(
    () => getFitRecommendation(product, numericReferenceBust),
    [numericReferenceBust, product],
  )
  const canCompare = Number.isFinite(numericReferenceBust) && numericReferenceBust > 0
  const hasBustChart = product.sizeChart.some((row) => row.measurements.Bust)

  useEffect(() => {
    setReferenceBust(getStoredFitBust())
  }, [])

  if (!hasBustChart) return null

  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger
        render={
          <button
            type="button"
            className="inline-flex items-center gap-1 text-xs font-medium leading-4 text-[var(--color-muted)] underline-offset-4 transition hover:text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          />
        }
      >
        <Ruler className="size-3 shrink-0" aria-hidden="true" />
        <span className="text-xs font-medium leading-4">Compare fit</span>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-sm transition duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex min-h-svh items-end justify-center p-0 sm:items-center sm:p-6">
          <Dialog.Popup className="w-full max-w-lg border border-[var(--color-line)] bg-[var(--color-paper)] outline-none transition duration-200 data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:data-[ending-style]:scale-[0.98] sm:data-[starting-style]:scale-[0.98]">
            <div className="flex items-start justify-between gap-5 border-b border-[var(--color-line)] px-5 py-4 sm:px-6">
              <div>
                <Dialog.Title className="font-serif text-2xl text-[var(--color-ink)]">
                  Compare your fit
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                  Use a similar piece you already like. This compares item measurements, not body
                  measurements.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close fit helper"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-blush)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-95"
              >
                <X className="size-4" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="px-5 py-5 sm:px-6">
              <label className="block">
                <span className="text-sm font-medium text-[var(--color-ink)]">
                  Garment bust measurement
                </span>
                <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">
                  Measure flat across the bust, then double it. Enter that full measurement in
                  inches.
                </span>
                <div className="mt-3 flex items-center border border-[var(--color-line)] bg-[var(--color-surface)] px-4 focus-within:border-[var(--color-primary)] focus-within:bg-[var(--color-surface-soft)]">
                  <Ruler className="size-4 text-[var(--color-muted)]" aria-hidden="true" />
                  <input
                    type="number"
                    min="24"
                    max="60"
                    step="0.5"
                    value={referenceBust}
                    onChange={(event) => setReferenceBust(event.currentTarget.value)}
                    placeholder="Example: 38"
                    className="h-12 min-w-0 flex-1 bg-transparent px-3 text-sm text-[var(--color-ink)] outline-none placeholder:text-[var(--color-muted)]/70"
                  />
                  <span className="text-sm font-medium text-[var(--color-muted)]">in</span>
                </div>
              </label>

              <div className="mt-5 border border-[var(--color-line)] bg-[var(--color-paper)] p-4">
                {canCompare && recommendation ? (
                  <>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-primary)]">
                      Best match
                    </p>
                    <div className="mt-3 flex items-end justify-between gap-4">
                      <div>
                        <p className="font-serif text-4xl text-[var(--color-ink)]">
                          {recommendation.size}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                          {getFitMessage(recommendation, numericReferenceBust)}
                        </p>
                      </div>
                      <div className="shrink-0 text-right text-sm text-[var(--color-muted)]">
                        <p>Bust {recommendation.sizeBust} in</p>
                        {recommendation.length ? <p>Length {recommendation.length}</p> : null}
                      </div>
                    </div>
                  </>
                ) : (
                  <p className="text-sm leading-6 text-[var(--color-muted)]">
                    Enter a garment bust measurement to see the closest available size for this
                    piece.
                  </p>
                )}
              </div>

              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <Button
                  type="button"
                  disabled={!canCompare || !recommendation}
                  onClick={() => {
                    storeFitBust(referenceBust)
                    if (recommendation) {
                      onSelectSize?.(recommendation.size)
                    }
                    setOpen(false)
                  }}
                  className="inline-flex h-11 items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99] disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-500 disabled:active:scale-100"
                >
                  Use this size
                </Button>
                <Dialog.Close className="inline-flex h-11 items-center justify-center border border-[var(--color-line)] bg-[var(--color-paper)] px-5 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]">
                  Keep browsing
                </Dialog.Close>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
