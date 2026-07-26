import { Dialog } from '@base-ui/react/dialog'
import { Link } from '@tanstack/react-router'
import { Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'

import { productSizes } from '../../data/products'
import { createProductAnalyticsPayload, trackAnalyticsEvent } from '../../lib/analytics'
import { formatPrice, joinClasses } from '../../lib/format'
import {
  getDefaultStyleFinderAnswers,
  getStyleFinderResults,
  type StyleFinderAnswers,
  type StyleFinderBudget,
  type StyleFinderOccasion,
  type StyleFinderPreference,
} from '../../lib/style-finder'
import { ProductMedia } from './ProductMedia'

type StyleFinderProps = {
  triggerClassName?: string
  triggerLabel?: string
  triggerVariant?: 'primary' | 'secondary'
}

const occasionOptions: Array<{
  label: string
  value: StyleFinderOccasion
}> = [
  { label: 'Any plan', value: 'any' },
  { label: 'Everyday', value: 'everyday' },
  { label: 'Work', value: 'work' },
  { label: 'Occasion', value: 'function' },
  { label: 'Gift', value: 'gift' },
]

const preferenceOptions: Array<{
  label: string
  value: StyleFinderPreference
}> = [
  { label: 'No preference', value: 'any' },
  { label: 'Minimal', value: 'short' },
  { label: 'Statement', value: 'long' },
  { label: 'Curated set', value: 'set' },
]

const budgetOptions: Array<{
  label: string
  value: StyleFinderBudget
}> = [
  { label: 'Any budget', value: 'any' },
  { label: 'Under Rs.1,500', value: 'under-1500' },
  { label: 'Under Rs.2,000', value: 'under-2000' },
]

export function StyleFinder({
  triggerClassName,
  triggerLabel = 'Help me choose',
  triggerVariant = 'secondary',
}: StyleFinderProps) {
  const [open, setOpen] = useState(false)
  const [answers, setAnswers] = useState<StyleFinderAnswers>(getDefaultStyleFinderAnswers)
  const results = useMemo(() => getStyleFinderResults(answers), [answers])
  const triggerClasses =
    triggerClassName ??
    (triggerVariant === 'primary'
      ? 'inline-flex h-12 items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]'
      : 'inline-flex h-12 items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-5 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]')

  function updateAnswer(nextAnswers: Partial<StyleFinderAnswers>) {
    setAnswers((currentAnswers) => ({
      ...currentAnswers,
      ...nextAnswers,
    }))
  }

  return (
    <Dialog.Root
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (nextOpen) trackAnalyticsEvent('style_finder_open')
      }}
    >
      <Dialog.Trigger
        render={
          <button type="button" className={triggerClasses} />
        }
      >
        <Search className="size-4" aria-hidden="true" />
        {triggerLabel}
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-sm transition duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0" />
        <Dialog.Viewport className="fixed inset-0 z-50 flex min-h-svh items-end justify-center p-0 sm:items-center sm:p-6">
          <Dialog.Popup className="max-h-[100svh] w-full overflow-y-auto border border-[var(--color-line)] bg-[var(--color-paper)] outline-none transition duration-200 data-[ending-style]:translate-y-4 data-[ending-style]:opacity-0 data-[starting-style]:translate-y-4 data-[starting-style]:opacity-0 sm:max-h-[90svh] sm:max-w-5xl sm:data-[ending-style]:scale-[0.98] sm:data-[starting-style]:scale-[0.98]">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-5 border-b border-[var(--color-line)] bg-[var(--color-paper)]/94 px-5 py-4 backdrop-blur sm:px-6">
              <div className="min-w-0">
                <Dialog.Title className="font-serif text-3xl font-normal leading-none text-[var(--color-ink)]">
                  Help me choose
                </Dialog.Title>
                <Dialog.Description className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                  Pick a few preferences and we will show the closest matches from the current
                  collection.
                </Dialog.Description>
              </div>
              <Dialog.Close
                aria-label="Close style finder"
                className="grid size-10 shrink-0 place-items-center rounded-full border border-[var(--color-line)] bg-[var(--color-surface)] text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-95"
              >
                <X className="size-4" aria-hidden="true" />
              </Dialog.Close>
            </div>

            <div className="grid gap-6 p-5 sm:p-6 lg:grid-cols-[320px_1fr]">
              <div className="space-y-6 lg:sticky lg:top-24 lg:self-start">
                <OptionGroup
                  label="Shopping for"
                  options={occasionOptions}
                  value={answers.occasion}
                  onChange={(occasion) => updateAnswer({ occasion })}
                />
                <OptionGroup
                  label="Preferred style"
                  options={preferenceOptions}
                  value={answers.preference}
                  onChange={(preference) => updateAnswer({ preference })}
                />
                <OptionGroup
                  label="Budget"
                  options={budgetOptions}
                  value={answers.budget}
                  onChange={(budget) => updateAnswer({ budget })}
                />
                <OptionGroup
                  label="Size"
                  options={[
                    { label: 'Any size', value: 'any' },
                    ...productSizes.map((size) => ({ label: size, value: size })),
                  ]}
                  value={answers.size}
                  onChange={(size) => updateAnswer({ size })}
                />
              </div>

              <div>
                <div className="mb-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="text-sm font-semibold text-[var(--color-ink)]">
                      {results.length} {results.length === 1 ? 'match' : 'matches'}
                    </p>
                    <p className="mt-1 text-sm text-[var(--color-muted)]">
                      Ranked from your preferences and product details.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAnswers(getDefaultStyleFinderAnswers())}
                    className="text-sm font-semibold text-[var(--color-muted)] underline decoration-[var(--color-line)] underline-offset-4 transition duration-150 ease-out hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                  >
                    Reset
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {results.map(({ product, reasons }) => (
                    <Link
                      key={product.variantId}
                      to="/products/$slug"
                      params={{ slug: product.slug }}
                      onClick={() => {
                        trackAnalyticsEvent('style_finder_product_click', {
                          ...createProductAnalyticsPayload(product),
                          budget: answers.budget,
                          occasion: answers.occasion,
                          preference: answers.preference,
                        })
                        setOpen(false)
                      }}
                      className="group border border-[var(--color-line)] bg-[var(--color-paper)] p-3 transition duration-150 ease-out hover:border-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                    >
                      <ProductMedia product={product} className="aspect-[3/4]" hoverZoom />
                      <div className="mt-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-[var(--color-ink)]">
                              {product.title}
                            </p>
                            <p className="mt-1 text-sm text-[var(--color-muted)]">
                              {product.categoryLabel}
                            </p>
                          </div>
                          <p className="shrink-0 text-sm font-semibold text-[var(--color-ink)]">
                            {formatPrice(product.sellingPricePaise)}
                          </p>
                        </div>
                        <ul className="mt-3 space-y-1.5 text-xs leading-5 text-[var(--color-muted)]">
                          {reasons.map((reason) => (
                            <li key={reason} className="flex gap-2">
                              <span className="mt-2 size-1 bg-[var(--color-primary)]" />
                              <span>{reason}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </Dialog.Popup>
        </Dialog.Viewport>
      </Dialog.Portal>
    </Dialog.Root>
  )
}

type OptionGroupProps<T extends string> = {
  label: string
  onChange: (value: T) => void
  options: Array<{ label: string; value: T }>
  value: T
}

function OptionGroup<T extends string>({
  label,
  onChange,
  options,
  value,
}: OptionGroupProps<T>) {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--color-ink)]">{label}</p>
      <div className="mt-3 flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.value === value

          return (
            <button
              key={option.value}
              type="button"
              aria-pressed={isSelected}
              onClick={() => onChange(option.value)}
              className={joinClasses(
                'min-h-9 border px-3 text-sm font-medium transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2',
                isSelected
                  ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-paper)]'
                  : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-primary)] hover:bg-[var(--color-surface-soft)]',
              )}
            >
              {option.label}
            </button>
          )
        })}
      </div>
    </div>
  )
}
