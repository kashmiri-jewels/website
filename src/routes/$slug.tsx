import { createFileRoute, notFound } from '@tanstack/react-router'

import { StaticPageView } from '../components/content/StaticPageView'
import { createPageMeta } from '../lib/seo'
import { findStaticPageContent } from '../lib/storefront-content'

export const Route = createFileRoute('/$slug')({
  loader: ({ params }) => {
    const page = findStaticPageContent(params.slug)

    if (!page) {
      throw notFound()
    }

    return { page }
  },
  head: ({ params }) => {
    const page = findStaticPageContent(params.slug)

    if (!page) {
      return createPageMeta({
        title: 'Page not found | Kashmiri Jewels',
        description: 'This Kashmiri Jewels page is unavailable.',
        path: `/${params.slug}`,
      })
    }

    return createPageMeta({
      title: page.seoTitle,
      description: page.seoDescription,
      path: `/${page.slug}`,
    })
  },
  component: StaticPageRoute,
})

function StaticPageRoute() {
  const { page } = Route.useLoaderData()

  return <StaticPageView page={page} />
}
