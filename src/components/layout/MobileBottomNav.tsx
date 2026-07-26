import { Link, useRouterState } from '@tanstack/react-router'
import { Home, ShoppingBag, Store } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { useOptionalCart } from '../cart/CartProvider'

export function MobileBottomNav() {
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const cart = useOptionalCart()
  const itemCount = cart?.itemCount ?? 0
  const openCart = cart?.openCart ?? (() => {})
  const shouldShow = pathname === '/' || pathname === '/products'

  if (!shouldShow) return null

  return (
    <nav
      aria-label="Mobile navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-[var(--color-line)] bg-[var(--color-paper)]/96 px-3 pb-[calc(env(safe-area-inset-bottom)+0.45rem)] pt-2 backdrop-blur-sm sm:hidden"
    >
      <div className="mx-auto grid max-w-sm grid-cols-3 gap-1">
        <MobileNavLink to="/" label="Home" Icon={Home} />
        <MobileNavLink to="/products" label="Shop" Icon={Store} />
        <button
          type="button"
          aria-label="Open shopping bag"
          onClick={openCart}
          className="relative flex min-h-14 flex-col items-center justify-center gap-1 px-2 text-xs font-medium text-[var(--color-muted)] transition duration-150 ease-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-primary)] focus-visible:ring-offset-2 active:scale-[0.97]"
        >
          <span className="relative">
            <ShoppingBag className="size-5" aria-hidden="true" />
            {itemCount > 0 ? (
              <span className="absolute -right-2.5 -top-2 grid min-w-4 place-items-center bg-[var(--color-primary)] px-1 text-[0.65rem] leading-4 text-[var(--color-paper)]">
                {itemCount}
              </span>
            ) : null}
          </span>
          Bag
        </button>
      </div>
    </nav>
  )
}

function MobileNavLink({
  to,
  label,
  Icon,
}: {
  to: '/' | '/products'
  label: string
  Icon: LucideIcon
}) {
  return (
    <Link
      to={to}
      activeProps={{
        className: 'bg-[var(--color-surface)] text-[var(--color-ink)]',
      }}
      inactiveProps={{
        className: 'text-[var(--color-muted)]',
      }}
      className="flex min-h-14 flex-col items-center justify-center gap-1 px-2 text-xs font-medium transition duration-150 ease-out active:scale-[0.97]"
    >
      <Icon className="size-5" aria-hidden="true" />
      {label}
    </Link>
  )
}
