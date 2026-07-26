import { createFileRoute } from '@tanstack/react-router'

import { StaticPageView } from '../components/content/StaticPageView'
import { createPageMeta } from '../lib/seo'
import { getStaticPageContent } from '../lib/storefront-content'

export const Route = createFileRoute('/about')({
  head: () => {
    const page = getStaticPageContent('about')

    return createPageMeta({
      title: page.seoTitle,
      description: page.seoDescription,
      path: '/about',
    })
  },
  component: AboutPage,
})

function AboutPage() {
  return <StaticPageView page={getStaticPageContent('about')} />
}
