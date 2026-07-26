import { HeadContent, Scripts, createRootRoute } from '@tanstack/react-router'

import { AddToBagToast } from '../components/cart/AddToBagToast'
import { CartDrawer } from '../components/cart/CartDrawer'
import { CartProvider } from '../components/cart/CartProvider'
import { MobileBottomNav } from '../components/layout/MobileBottomNav'
import { SiteFooter } from '../components/layout/SiteFooter'
import { SiteHeader } from '../components/layout/SiteHeader'
import { RouteNotFound } from '../components/layout/RouteBoundaries'
import { createUmamiHeadScripts } from '../lib/analytics'
import { createPageMeta, siteDescription, siteName } from '../lib/seo'
import appCss from '../styles.css?url'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1',
      },
      ...createPageMeta({
        title: siteName,
        description: siteDescription,
        path: '/',
      }).meta,
      {
        name: 'theme-color',
        content: '#1C2E4A',
      },
      {
        name: 'application-name',
        content: siteName,
      },
      {
        name: 'apple-mobile-web-app-title',
        content: siteName,
      },
    ],
    links: [
      {
        rel: 'stylesheet',
        href: appCss,
      },
      {
        rel: 'preload',
        href: '/assets/fonts/neonfold/geist-latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'preload',
        href: '/assets/fonts/neonfold/instrument-serif-latin.woff2',
        as: 'font',
        type: 'font/woff2',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'icon',
        type: 'image/svg+xml',
        href: '/favicon.svg',
      },
      {
        rel: 'icon',
        type: 'image/png',
        sizes: '32x32',
        href: '/icon-32.png',
      },
      {
        rel: 'alternate icon',
        href: '/favicon.ico',
      },
      {
        rel: 'apple-touch-icon',
        sizes: '180x180',
        href: '/apple-touch-icon.png',
      },
      {
        rel: 'mask-icon',
        href: '/safari-pinned-tab.svg',
        color: '#1C2E4A',
      },
      {
        rel: 'manifest',
        href: '/site.webmanifest',
      },
    ],
    scripts: createUmamiHeadScripts(),
  }),
  notFoundComponent: RouteNotFound,
  shellComponent: RootDocument,
})

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body className="bg-[var(--color-canvas)] text-[var(--color-ink)] antialiased">
        <CartProvider>
          <a href="#page-content" className="skip-link">
            Skip to content
          </a>
          <SiteHeader />
          <div id="page-content" tabIndex={-1}>
            {children}
          </div>
          <SiteFooter />
          <AddToBagToast />
          <CartDrawer />
          <MobileBottomNav />
        </CartProvider>
        <Scripts />
      </body>
    </html>
  )
}
