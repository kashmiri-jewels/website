import { createFileRoute } from '@tanstack/react-router'

import { StaticPageView } from '../components/content/StaticPageView'
import { createPageMeta } from '../lib/seo'
import { getStaticPageContent } from '../lib/storefront-content'

export const Route = createFileRoute('/contact')({
  head: () => {
    const page = getStaticPageContent('contact')

    return createPageMeta({
      title: page.seoTitle,
      description: page.seoDescription,
      path: '/contact',
    })
  },
  component: ContactPage,
})

function ContactPage() {
  return <StaticPageView page={getStaticPageContent('contact')} />
}
