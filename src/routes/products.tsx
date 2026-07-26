import { Dialog } from '@base-ui/react/dialog'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { SlidersHorizontal, X } from 'lucide-react'
import { useCallback, useState } from 'react'

import { ProductFilters } from '../components/product/ProductFilters'
import { ProductGrid } from '../components/product/ProductGrid'
import { ProductResultsHeader } from '../components/product/ProductResultsHeader'
import { StyleFinder } from '../components/product/StyleFinder'
import {
  getCategoryCounts,
  searchProducts,
} from '../data/product-search'
import { categoryLabels, productCategories } from '../data/products'
import {
  cleanProductSearch,
  createActiveProductFilters,
  resolveProductSearch,
  validateProductSearch,
  type ProductSearchState,
} from '../lib/product-search-url'
import { createPageMeta } from '../lib/seo'

export const Route = createFileRoute('/products')({
  head: () =>
    createPageMeta({
      title: 'Shop Handcrafted Jewellery | Kashmiri Jewels',
      description:
        'Browse Kashmiri Jewels handcrafted pieces by category, price, availability, and offers.',
      path: '/products',
    }),
  validateSearch: validateProductSearch,
  loaderDeps: ({ search }) => search,
  loader: async ({ deps }) => {
    const resolvedSearch = resolveProductSearch(deps)
    const results = await searchProducts({
      query: resolvedSearch.q,
      category: resolvedSearch.category,
      sort: resolvedSearch.sort,
      sizes: resolvedSearch.sizes,
      minPrice: resolvedSearch.minPrice,
      maxPrice: resolvedSearch.maxPrice,
      inStockOnly: resolvedSearch.inStockOnly,
      saleOnly: resolvedSearch.saleOnly,
    })
    const categoryResults =
      resolvedSearch.category === 'all'
        ? results.products
        : (
            await searchProducts({
              query: resolvedSearch.q,
              category: 'all',
              sort: 'recommended',
              sizes: resolvedSearch.sizes,
              minPrice: resolvedSearch.minPrice,
              maxPrice: resolvedSearch.maxPrice,
              inStockOnly: resolvedSearch.inStockOnly,
              saleOnly: resolvedSearch.saleOnly,
            })
          ).products

    return {
      categoryCounts: getCategoryCounts(categoryResults),
      results,
    }
  },
  component: ProductsPage,
})

function ProductsPage() {
  const search = Route.useSearch()
  const { categoryCounts, results } = Route.useLoaderData()
  const resolvedSearch = resolveProductSearch(search)
  const navigate = useNavigate({ from: Route.fullPath })
  const [filtersOpen, setFiltersOpen] = useState(false)
  const selectedSizesKey = resolvedSearch.sizes.join('|')
  const activeFilters = createActiveProductFilters(resolvedSearch)
  const updateSearch = useCallback(
    (nextSearch: Partial<ProductSearchState>) =>
      navigate({
        search: cleanProductSearch({
          ...resolvedSearch,
          ...nextSearch,
        }),
        replace: true,
      }),
    [
      navigate,
      resolvedSearch.category,
      resolvedSearch.inStockOnly,
      resolvedSearch.maxPrice,
      resolvedSearch.minPrice,
      resolvedSearch.q,
      resolvedSearch.saleOnly,
      selectedSizesKey,
      resolvedSearch.sort,
    ],
  )

  return (
    <main className="px-4 pb-32 pt-8 sm:px-6 sm:pt-8 lg:px-8 lg:pb-20 lg:pt-4">
      <div className="mx-auto max-w-[90rem]">
      <div className="grid gap-7 border-b border-[var(--color-line)] pb-7 lg:grid-cols-[0.82fr_1.18fr] lg:items-end">
        <div>
          <p className="text-sm font-medium text-[var(--color-muted)]">Fresh drops, every week</p>
          <h1 className="mt-3 max-w-3xl font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-7xl">
            Shop the collection
          </h1>
        </div>
        <div className="max-w-2xl lg:justify-self-end">
          <p className="text-base leading-7 text-[var(--color-muted)]">
            Find heritage-inspired jewellery, everyday accents, and occasion-ready pieces by category,
            price, and availability.
          </p>
          <StyleFinder
            triggerLabel="Find my jewel"
            triggerClassName="mt-5 inline-flex h-11 items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] transition duration-200 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
          />
        </div>
      </div>

        <div className="grid gap-5 py-5">
          <div className="flex w-full min-w-0 max-w-full flex-col gap-4 overflow-hidden border-b border-[var(--color-line)] pb-5 lg:flex-row lg:items-center lg:justify-between">
            <nav
              aria-label="Shop categories"
              className="flex w-full min-w-0 max-w-full gap-1.5 overflow-x-auto sm:gap-2"
            >
              <button
                type="button"
                aria-current={resolvedSearch.category === 'all' ? 'page' : undefined}
                onClick={() => updateSearch({ category: 'all' })}
                className={`inline-flex shrink-0 items-center border px-3 py-2 text-sm transition sm:px-4 ${
                  resolvedSearch.category === 'all'
                    ? 'border-[var(--color-blush)] bg-[var(--color-ink)] text-[#f7df9a]'
                    : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-ink)]'
                }`}
              >
                All products
              </button>
              {productCategories.map((category) => (
                <button
                  key={category}
                  type="button"
                  aria-current={resolvedSearch.category === category ? 'page' : undefined}
                  onClick={() => updateSearch({ category })}
                  className={`inline-flex shrink-0 items-center border px-3 py-2 text-sm transition sm:px-4 ${
                    resolvedSearch.category === category
                      ? 'border-[var(--color-blush)] bg-[var(--color-ink)] text-[#f7df9a]'
                      : 'border-[var(--color-line)] bg-[var(--color-paper)] text-[var(--color-ink)] hover:border-[var(--color-ink)]'
                  }`}
                >
                  {categoryLabels[category]}
                </button>
              ))}
            </nav>
            <p className="shrink-0 text-sm text-[var(--color-muted)]">
              {results.count} {results.count === 1 ? 'piece' : 'pieces'}
            </p>
          </div>

          <ProductResultsHeader
            activeFilters={activeFilters}
            resultCount={results.count}
            search={resolvedSearch}
            onSearchChange={updateSearch}
          />
        </div>

        <div className="grid min-w-0 gap-6 lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="hidden min-w-0 overflow-hidden lg:sticky lg:top-[calc(var(--site-header-height)+1.5rem)] lg:block lg:h-[calc(100svh-var(--site-header-height)-3rem)] lg:self-start">
            <div className="flex h-full min-h-0 flex-col border-r border-[var(--color-line)] bg-[var(--color-paper)]">
              <div className="border-b border-[var(--color-line)] px-5 py-5">
                <div>
                  <h2 className="font-serif text-3xl font-normal leading-none text-[var(--color-ink)]">
                    Filters
                  </h2>
                  <p className="mt-1 text-sm text-[var(--color-muted)]">
                    Refine by category, price, and availability.
                  </p>
                </div>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">
                <ProductFilters
                  search={resolvedSearch}
                  resultCount={results.count}
                  categoryCounts={categoryCounts}
                  onSearchChange={updateSearch}
                  idPrefix="desktop"
                  showHeader={false}
                />
              </div>
            </div>
          </aside>

          <section className="min-w-0">
            <div className="hidden lg:mb-5 lg:block" />
            <Dialog.Root open={filtersOpen} onOpenChange={setFiltersOpen}>
              <Dialog.Trigger
                render={
                  <button
                    type="button"
                    className="mb-6 inline-flex h-11 items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-4 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.98] lg:hidden"
                    aria-label="Open product filters"
                  />
                }
              >
                <SlidersHorizontal className="size-4" aria-hidden="true" />
                Filters
                {activeFilters.length > 0 ? (
                  <span className="grid min-w-5 place-items-center bg-[var(--color-primary)] px-1.5 text-xs text-[var(--color-paper)]">
                    {activeFilters.length}
                  </span>
                ) : null}
              </Dialog.Trigger>
              <Dialog.Portal>
                <Dialog.Backdrop className="fixed inset-0 z-40 bg-stone-950/40 backdrop-blur-sm transition duration-200 data-[ending-style]:opacity-0 data-[starting-style]:opacity-0 lg:hidden" />
                <Dialog.Viewport className="fixed inset-0 z-50 flex min-h-svh items-stretch justify-start lg:hidden">
                  <Dialog.Popup className="h-dvh w-[88vw] max-w-sm overflow-hidden border-r border-[var(--color-line)] bg-[var(--color-paper)] outline-none transition duration-200 data-[ending-style]:-translate-x-4 data-[ending-style]:opacity-0 data-[starting-style]:-translate-x-4 data-[starting-style]:opacity-0">
                    <div className="flex items-start justify-between gap-4 border-b border-[var(--color-line)] px-5 py-4">
                      <div>
                        <Dialog.Title className="font-serif text-3xl font-normal leading-none text-[var(--color-ink)]">
                          Filters
                        </Dialog.Title>
                        <Dialog.Description className="mt-1 text-sm text-[var(--color-muted)]">
                          Refine the shop without leaving this page.
                        </Dialog.Description>
                      </div>
                      <Dialog.Close
                        aria-label="Close filters"
                        className="grid size-10 shrink-0 place-items-center text-[var(--color-muted)] transition duration-150 ease-out hover:text-[var(--color-ink)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
                      >
                        <X className="size-4" aria-hidden="true" />
                      </Dialog.Close>
                    </div>
                    <div className="h-[calc(100dvh-81px)] overflow-y-auto px-5 py-5">
                      <ProductFilters
                        search={resolvedSearch}
                        resultCount={results.count}
                        categoryCounts={categoryCounts}
                        onSearchChange={updateSearch}
                        idPrefix="mobile"
                        onDone={() => setFiltersOpen(false)}
                        showHeader={false}
                        variant="sheet"
                      />
                    </div>
                  </Dialog.Popup>
                </Dialog.Viewport>
              </Dialog.Portal>
            </Dialog.Root>
            <ProductGrid products={results.products} />
          </section>
        </div>
      </div>
    </main>
  )
}
