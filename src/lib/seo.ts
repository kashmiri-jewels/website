import type { Product } from '../data/products'

type SeoInput = {
  title: string
  description: string
  path: string
  image?: string
  type?: 'website' | 'product'
}

export const siteName = 'Kashmiri Jewels'
export const siteDescription = 'Heritage handcrafted jewellery from Kashmir, made for timeless everyday elegance.'
export const siteUrl = 'https://kashmirijewels.com'

export function createPageMeta({
  title,
  description,
  path,
  image,
  type = 'website',
}: SeoInput) {
  const canonicalUrl = createAbsoluteUrl(path)
  const imageUrl = image ? createAbsoluteUrl(image) : undefined

  return {
    meta: [
      { title },
      { name: 'description', content: description },
      { property: 'og:site_name', content: siteName },
      { property: 'og:type', content: type },
      { property: 'og:title', content: title },
      { property: 'og:description', content: description },
      { property: 'og:url', content: canonicalUrl },
      ...(imageUrl ? [{ property: 'og:image', content: imageUrl }] : []),
      { name: 'twitter:card', content: imageUrl ? 'summary_large_image' : 'summary' },
      { name: 'twitter:title', content: title },
      { name: 'twitter:description', content: description },
      ...(imageUrl ? [{ name: 'twitter:image', content: imageUrl }] : []),
    ],
    links: [{ rel: 'canonical', href: canonicalUrl }],
  }
}

export function createProductJsonLd(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.title,
    description: product.description,
    image: product.images.map(createAbsoluteUrl),
    brand: {
      '@type': 'Brand',
      name: siteName,
    },
    sku: product.productId,
    offers: {
      '@type': 'Offer',
      url: createAbsoluteUrl(`/products/${product.slug}`),
      priceCurrency: 'INR',
      price: (product.sellingPricePaise / 100).toFixed(0),
      availability:
        product.stockAvailable > 0
          ? 'https://schema.org/InStock'
          : 'https://schema.org/OutOfStock',
      itemCondition: 'https://schema.org/NewCondition',
    },
  }
}

export function createAbsoluteUrl(path: string) {
  if (path.startsWith('http://') || path.startsWith('https://')) return path
  return `${siteUrl}${path.startsWith('/') ? path : `/${path}`}`
}
