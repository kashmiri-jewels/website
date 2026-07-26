import { PortableText, type PortableTextComponents } from '@portabletext/react'

import type { StaticPageContent } from '../../lib/storefront-content'

const staticPageComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="pt-5 text-base font-medium text-[var(--color-ink)]">{children}</h2>
    ),
    h3: ({ children }) => (
      <h3 className="pt-4 text-sm font-medium text-[var(--color-ink)]">{children}</h3>
    ),
    normal: ({ children }) => (
      <p className="mt-2 text-sm leading-7 text-[var(--color-muted)] sm:text-base">
        {children}
      </p>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-7 text-[var(--color-muted)] sm:text-base">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm leading-7 text-[var(--color-muted)] sm:text-base">
        {children}
      </ol>
    ),
  },
  marks: {
    link: ({ children, value }) => {
      const href = typeof value?.href === 'string' ? value.href : '#'
      const external = href.startsWith('http')

      return (
        <a
          href={href}
          target={external ? '_blank' : undefined}
          rel={external ? 'noreferrer' : undefined}
          className="text-[var(--color-primary)] underline underline-offset-4"
        >
          {children}
        </a>
      )
    },
  },
}

export function StaticPageView({ page }: { page: StaticPageContent }) {
  return (
    <main className="px-4 pb-24 pt-10 sm:px-6 lg:px-8">
      <section className="mx-auto max-w-3xl">
        <p className="text-sm font-medium text-[var(--color-muted)]">{page.eyebrow}</p>
        <h1 className="mt-3 font-serif text-5xl font-normal leading-none text-[var(--color-ink)] sm:text-6xl">
          {page.title}
        </h1>
        <div className="mt-8 divide-y divide-[var(--color-line)] border-y border-[var(--color-line)] py-3">
          <PortableText value={page.body} components={staticPageComponents} />
        </div>
      </section>
    </main>
  )
}
