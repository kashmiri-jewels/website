import { createFileRoute } from '@tanstack/react-router'

import { StaticPageView } from '../components/content/StaticPageView'
import { createPageMeta } from '../lib/seo'
import { getStaticPageContent } from '../lib/storefront-content'

export const Route = createFileRoute('/shipping-returns')({
  head: () => {
    const page = getStaticPageContent('shipping-returns')

    return createPageMeta({
      title: page.seoTitle,
      description: page.seoDescription,
      path: '/shipping-returns',
    })
  },
  component: ShippingReturnsPage,
})

function ShippingReturnsPage() {
  return <StaticPageView page={getStaticPageContent('shipping-returns')} />
}
