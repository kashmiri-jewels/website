import { createFileRoute } from '@tanstack/react-router'

import { StaticPageView } from '../components/content/StaticPageView'
import { createPageMeta } from '../lib/seo'
import { getStaticPageContent } from '../lib/storefront-content'

export const Route = createFileRoute('/terms')({
  head: () => {
    const page = getStaticPageContent('terms')

    return createPageMeta({
      title: page.seoTitle,
      description: page.seoDescription,
      path: '/terms',
    })
  },
  component: TermsPage,
})

function TermsPage() {
  return <StaticPageView page={getStaticPageContent('terms')} />
}
