import { Link, useRouterState } from '@tanstack/react-router'
import { Search, ShoppingBag } from 'lucide-react'

import { getSiteSettingsContent } from '../../lib/storefront-content'
import { useOptionalCart } from '../cart/CartProvider'

export function SiteHeader() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const cart = useOptionalCart()
  const itemCount = cart?.itemCount ?? 0
  const openCart = cart?.openCart ?? (() => {})
  const mobileBottomNavVisible = pathname === '/' || pathname === '/products'
  const settings = getSiteSettingsContent()

  return (
    <header className="fixed inset-x-0 top-0 z-30 border-b border-[var(--color-line)] bg-[var(--color-paper)]/96 shadow-[0_1px_0_rgb(184_148_70_/_0.16)] backdrop-blur-sm">
      <div className="bg-[var(--color-primary)] px-4 py-2 text-center text-[0.6875rem] font-medium uppercase leading-4 tracking-[0.12em] text-[#f7df9a] sm:px-6 lg:px-8">
        <span className="sm:hidden">{settings.announcement.mobileText}</span>
        <span className="hidden sm:inline">{settings.announcement.desktopText}</span>
      </div>
      <div className="mx-auto flex h-16 max-w-[90rem] items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-7">
          <Link
            to="/"
            aria-label="Kashmiri Jewels home"
            className="inline-flex shrink-0 items-center transition duration-150 ease-out hover:opacity-80 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <img
              src="/assets/brand/kashmiri-jewels-logo.webp"
              alt="Kashmiri Jewels"
              className="h-10 w-auto sm:h-12"
            />
          </Link>
          <nav
            aria-label="Main navigation"
            className="hidden items-center gap-7 text-sm text-[var(--color-muted)] lg:flex"
          >
            {settings.headerLinks.map((link) => {
              const active = getPathFromUrl(link.url) === pathname

              return (
                <a
                  key={`${link.label}-${link.url}`}
                  href={link.url}
                  className={`transition duration-150 ease-out ${
                    active
                      ? 'text-[var(--color-ink)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {link.label}
                </a>
              )
            })}
          </nav>
        </div>
        <nav aria-label="Shop actions" className="flex shrink-0 items-center justify-end gap-4 text-sm sm:gap-5">
          <Link
            to="/products"
            aria-label="Search products"
            className="flex size-10 items-center justify-center rounded-full text-[var(--color-ink)] transition duration-150 ease-out hover:bg-[var(--color-surface)] hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2"
          >
            <Search className="size-4" aria-hidden="true" />
          </Link>
          <Link
            to="/checkout"
            activeProps={{ className: 'text-[var(--color-ink)]' }}
            inactiveProps={{ className: 'text-[var(--color-muted)] hover:text-[var(--color-ink)]' }}
            className="hidden text-sm transition duration-150 ease-out lg:inline"
          >
            Checkout
          </Link>
          <Link
            to="/orders"
            activeProps={{ className: 'text-[var(--color-ink)]' }}
            inactiveProps={{ className: 'text-[var(--color-muted)] hover:text-[var(--color-ink)]' }}
            className="hidden text-sm transition duration-150 ease-out sm:inline lg:hidden"
          >
            Track Order
          </Link>
          <button
            type="button"
            onClick={openCart}
            className={
              mobileBottomNavVisible
                ? 'relative hidden h-10 items-center justify-center gap-2 px-1 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 sm:inline-flex'
                : 'relative inline-flex h-10 items-center justify-center gap-2 px-1 text-sm font-medium text-[var(--color-ink)] transition duration-150 ease-out hover:text-[var(--color-primary)] focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2'
            }
          >
            <ShoppingBag className="size-4" aria-hidden="true" />
            Bag
            {itemCount > 0 ? (
              <span className="ml-1 inline-flex min-w-5 justify-center bg-[var(--color-primary)] px-1.5 py-0.5 text-xs leading-none text-[var(--color-paper)]">
                {itemCount}
              </span>
            ) : null}
          </button>
        </nav>
      </div>
    </header>
  )
}

function getPathFromUrl(url: string) {
  if (url.startsWith('http://') || url.startsWith('https://')) return ''
  return url.split('?')[0] || '/'
}
