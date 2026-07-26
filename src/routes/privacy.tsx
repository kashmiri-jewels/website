import { createFileRoute } from '@tanstack/react-router'

import { StaticPageView } from '../components/content/StaticPageView'
import { createPageMeta } from '../lib/seo'
import { getStaticPageContent } from '../lib/storefront-content'

export const Route = createFileRoute('/privacy')({
  head: () => {
    const page = getStaticPageContent('privacy')

    return createPageMeta({
      title: page.seoTitle,
      description: page.seoDescription,
      path: '/privacy',
    })
  },
  component: PrivacyPage,
})

function PrivacyPage() {
  return <StaticPageView page={getStaticPageContent('privacy')} />
}
