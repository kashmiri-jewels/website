import { Button } from '@base-ui/react/button'
import { Link } from '@tanstack/react-router'

export function HomeEmptyCatalog() {
  return (
    <main className="pb-24 sm:pb-0">
      <section className="border-b border-[var(--color-line)] bg-[var(--color-paper)]">
        <div className="mx-auto flex min-h-[72svh] max-w-[90rem] items-center px-4 py-16 sm:px-6 lg:px-8">
          <div className="max-w-xl">
            <p className="text-sm font-medium text-[var(--color-muted)]">Catalog pending</p>
            <h1 className="mt-4 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-7xl">
              Kashmiri Jewels
            </h1>
            <p className="mt-6 max-w-lg text-base leading-7 text-[var(--color-muted)] sm:text-lg">
              The storefront catalog has not been published yet.
            </p>
            <Button
              nativeButton={false}
              render={
                <Link
                  to="/products"
                  className="mt-8 inline-flex h-12 items-center justify-center bg-[var(--color-primary)] px-6 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
                />
              }
            >
              View products
            </Button>
          </div>
        </div>
      </section>
    </main>
  )
}
