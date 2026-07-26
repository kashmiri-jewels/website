import { X } from 'lucide-react'

import { getSmartSearchLabels } from '../../data/product-search'
import { productPriceRange } from '../../data/products'
import {
  type ActiveProductFilter,
  type ProductSearchState,
  type ResolvedProductSearchState,
} from '../../lib/product-search-url'

type ProductResultsHeaderProps = {
  activeFilters: ActiveProductFilter[]
  resultCount: number
  search: ResolvedProductSearchState
  onSearchChange: (search: Partial<ProductSearchState>) => void
}

export function ProductResultsHeader({
  activeFilters,
  search,
  onSearchChange,
}: ProductResultsHeaderProps) {
  const smartSearchLabels = search.q ? getSmartSearchLabels(search.q) : []

  if (smartSearchLabels.length === 0 && activeFilters.length === 0) {
    return null
  }

  return (
    <div className="border-b border-[var(--color-line)] pb-5">
      {smartSearchLabels.length > 0 ? (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
          <span className="font-medium text-[var(--color-muted)]">
            Results for <span className="text-[var(--color-ink)]">"{search.q}"</span>
          </span>
          {smartSearchLabels.map((label) => (
            <span
              key={label}
              className="border border-[var(--color-line)] bg-[var(--color-paper)] px-2.5 py-1 font-medium text-[var(--color-ink)]"
            >
              {label}
            </span>
          ))}
        </div>
      ) : null}
      {activeFilters.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {activeFilters.map((filter) => (
            <button
              key={filter.key}
              type="button"
              onClick={() => onSearchChange(filter.clear)}
              className="inline-flex min-h-9 items-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-3 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
            >
              {filter.label}
              <X className="size-3.5" aria-hidden="true" />
            </button>
          ))}
          <button
            type="button"
            onClick={() =>
              onSearchChange({
                category: 'all',
                sizes: [],
                minPrice: productPriceRange.min,
                maxPrice: productPriceRange.max,
                inStockOnly: false,
                saleOnly: false,
              })
            }
            className="min-h-9 px-3 text-sm font-medium text-[var(--color-muted)] underline-offset-4 transition duration-150 ease-out hover:text-[var(--color-primary)] hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            Clear all
          </button>
        </div>
      ) : null}
    </div>
  )
}
