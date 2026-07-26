import { Button } from '@base-ui/react/button'
import { Link } from '@tanstack/react-router'
import { AlertTriangle, LoaderCircle, RefreshCw, Search } from 'lucide-react'
import type { ErrorComponentProps } from '@tanstack/react-router'

export function RoutePending() {
  return (
    <main className="mx-auto grid min-h-[55svh] max-w-[90rem] place-items-center px-4 py-16 sm:px-6 lg:px-8">
      <div className="text-center">
        <LoaderCircle
          className="mx-auto size-8 animate-spin text-[var(--color-primary)]"
          aria-hidden="true"
        />
        <p className="mt-4 text-sm font-medium text-[var(--color-ink)]">Loading Kashmiri Jewels</p>
        <p className="mt-2 text-sm text-[var(--color-muted)]">
          Preparing the latest styles and availability.
        </p>
      </div>
    </main>
  )
}

export function RouteError({ error, reset }: ErrorComponentProps) {
  const message =
    error instanceof Error && error.message
      ? error.message
      : 'Something went wrong while loading this page.'

  return (
    <main className="mx-auto grid min-h-[55svh] max-w-[90rem] place-items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full max-w-2xl border-b border-[var(--color-line)] pb-10 text-center">
        <span className="mx-auto grid size-12 place-items-center bg-red-50 text-red-700">
          <AlertTriangle className="size-5" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-6xl">
          We could not load this page
        </h1>
        <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{message}</p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button
            type="button"
            onClick={reset}
            className="inline-flex h-11 items-center justify-center gap-2 bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
          >
            <RefreshCw className="size-4" aria-hidden="true" />
            Try again
          </Button>
          <Button
            nativeButton={false}
            render={
              <Link
                to="/products"
                className="inline-flex h-11 items-center justify-center gap-2 border border-[var(--color-line)] bg-[var(--color-paper)] px-5 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
              />
            }
          >
            <Search className="size-4" aria-hidden="true" />
            Browse shop
          </Button>
        </div>
      </section>
    </main>
  )
}

export function RouteNotFound() {
  return (
    <main className="mx-auto grid min-h-[55svh] max-w-[90rem] place-items-center px-4 py-16 sm:px-6 lg:px-8">
      <section className="w-full max-w-2xl border-b border-[var(--color-line)] pb-10 text-center">
        <p className="text-sm font-medium text-[var(--color-muted)]">404</p>
        <h1 className="mt-2 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-6xl">
          Page not found
        </h1>
        <p className="mt-4 text-sm leading-6 text-[var(--color-muted)]">
          The page or product you are looking for is unavailable. Browse the current edit instead.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button
            nativeButton={false}
            render={
              <Link
                to="/products"
                className="inline-flex h-11 items-center justify-center bg-[var(--color-primary)] px-5 text-sm font-medium text-[var(--color-paper)] transition duration-150 ease-out hover:bg-[var(--color-primary-dark)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
              />
            }
          >
            Shop current styles
          </Button>
          <Button
            nativeButton={false}
            render={
              <Link
                to="/"
                className="inline-flex h-11 items-center justify-center border border-[var(--color-line)] bg-[var(--color-paper)] px-5 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:border-[var(--color-primary)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.99]"
              />
            }
          >
            Go home
          </Button>
        </div>
      </section>
    </main>
  )
}
