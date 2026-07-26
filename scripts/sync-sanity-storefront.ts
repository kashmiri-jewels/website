import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { createClient } from '@sanity/client'

import { projectRoot } from './lib/runtime'

const projectId = process.env.VITE_SANITY_PROJECT_ID || process.env.SANITY_STUDIO_PROJECT_ID
const dataset = process.env.VITE_SANITY_DATASET || process.env.SANITY_STUDIO_DATASET
const apiVersion = process.env.VITE_SANITY_API_VERSION || '2026-06-16'
const perspective = parsePerspective(process.env.SANITY_CONTENT_PERSPECTIVE)
const token = process.env.SANITY_READ_TOKEN || process.env.SANITY_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN
const generatedDir = path.join(projectRoot, 'src/generated')
const blogOutputPath = path.join(generatedDir, 'blog-posts.json')
const siteContentOutputPath = path.join(generatedDir, 'site-content.json')

const reservedStaticPageSlugs = new Set(['admin', 'blog', 'checkout', 'orders', 'products'])

await mkdir(generatedDir, { recursive: true })

if (!projectId || !dataset) {
  console.log('Sanity storefront content sync skipped: missing project or dataset.')
  process.exit(0)
}

const client = createClient({
  projectId,
  dataset,
  apiVersion,
  perspective,
  token,
  useCdn: false,
})

const [posts, siteContent] = await Promise.all([
  client.fetch(`
    *[
      _type == "blogPost" &&
      defined(slug.current) &&
      defined(publishedAt) &&
      publishedAt <= now()
    ] | order(publishedAt desc) {
      _id,
      title,
      "slug": slug.current,
      excerpt,
      category,
      authorName,
      publishedAt,
      seoTitle,
      seoDescription,
      "coverImage": {
        "url": coalesce(coverImageUrl, coverImage.asset->url),
        "alt": coalesce(coverImageAlt, coverImage.alt)
      },
      content[] {
        ...,
        _type == "externalImage" => {
          _key,
          _type,
          alt,
          url
        },
        _type == "image" => {
          _key,
          _type,
          alt,
          "url": asset->url
        }
      }
    }
  `),
  client.fetch(`
    {
      "siteSettings": *[_type == "siteSettings"][0] {
        announcement,
        headerLinks,
        footerEyebrow,
        footerHeadline,
        footerDescription,
        footerShortCopy,
        footerSections,
        socialLinks,
        benefits,
        copyrightLine,
        bottomNote,
        seoDefaults
      },
      "homePage": *[_type == "homePage"][0] {
        seo,
        hero,
        categorySection,
        bestSellersSection,
        imageStory,
        newArrivalsSection
      },
      "staticPages": *[_type == "staticPage"] {
        _id,
        _originalId,
        _updatedAt,
        slug,
        eyebrow,
        title,
        body,
        seoTitle,
        seoDescription
      }
    }
  `),
])

const normalizedSiteContent = normalizeSiteContent(siteContent)
overrideHeroSlides(normalizedSiteContent)

await writeJson(blogOutputPath, posts)
await writeJson(siteContentOutputPath, normalizedSiteContent)

console.log(
  `Synced ${Array.isArray(posts) ? posts.length : 0} blog posts and storefront content from ${dataset} with ${perspective} perspective.`,
)

async function writeJson(filePath: string, value: unknown) {
  await writeFile(filePath, `${JSON.stringify(value, null, 2)}\n`)
}

function normalizeSiteContent(content: unknown) {
  if (!isRecord(content)) {
    throw new Error('Sanity storefront content query returned an invalid response.')
  }

  const staticPages = Array.isArray(content.staticPages) ? content.staticPages : []
  const normalizedStaticPages = normalizeStaticPages(staticPages)

  return {
    ...content,
    staticPages: normalizedStaticPages,
  }
}

function overrideHeroSlides(content: Record<string, unknown>) {
  const homePage = content.homePage
  if (!isRecord(homePage)) return

  const hero = homePage.hero
  if (!isRecord(hero)) return

  const bannerSlides = [
    { url: '/banners/40.jpg', alt: 'Kashmiri Jewels collection — style 1' },
    { url: '/banners/37.jpg', alt: 'Kashmiri Jewels collection — style 2' },
  ]

  hero.slides = bannerSlides

  // Also update the OG image to use the first banner
  const seo = homePage.seo
  if (isRecord(seo)) {
    seo.image = { url: '/banners/40.jpg', alt: 'Kashmiri Jewels fashion' }
  }
}

function normalizeStaticPages(staticPages: unknown[]) {
  const seenSlugs = new Set<string>()
  const pageBySlug = new Map<string, Record<string, unknown>>()

  for (const page of staticPages) {
    if (!isRecord(page)) {
      throw new Error('Sanity staticPage documents must include a valid slug.')
    }

    const slug = normalizeStaticPageSlug(page.slug)
    if (!slug) {
      throw new Error('Sanity staticPage documents must include a valid slug.')
    }

    if (reservedStaticPageSlugs.has(slug)) {
      throw new Error(`Sanity staticPage slug "${slug}" is reserved by the storefront.`)
    }

    page.slug = slug

    if (seenSlugs.has(slug)) {
      if (perspective !== 'drafts') {
        throw new Error(`Sanity has multiple staticPage documents for "${slug}".`)
      }

      const existingPage = pageBySlug.get(slug)
      if (!existingPage || compareUpdatedAtDesc(page, existingPage) < 0) {
        pageBySlug.set(slug, page)
      }

      continue
    }

    seenSlugs.add(slug)
    pageBySlug.set(slug, page)
  }

  return [...pageBySlug.values()]
}

validateContent(normalizedSiteContent)

function validateContent(content: Record<string, unknown>) {
  if (!shouldRequireContent()) return

  if (!content.siteSettings) {
    throw new Error('Sanity required document missing: siteSettings.')
  }

  if (!content.homePage) {
    throw new Error('Sanity required document missing: homePage.')
  }
}

function compareUpdatedAtDesc(left: Record<string, unknown>, right: Record<string, unknown>) {
  return readDateMs(right._updatedAt) - readDateMs(left._updatedAt)
}

function readDateMs(value: unknown) {
  return typeof value === 'string' ? Date.parse(value) || 0 : 0
}

function normalizeStaticPageSlug(value: unknown) {
  const rawSlug = typeof value === 'string'
    ? value
    : isRecord(value) && typeof value.current === 'string'
      ? value.current
      : ''
  const slug = rawSlug.trim().replace(/^\/+|\/+$/g, '')

  if (!slug || slug.includes('/') || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) return null

  return slug
}

function shouldRequireContent() {
  return process.env.SANITY_VALIDATE_REQUIRED_CONTENT === 'true'
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function parsePerspective(value: string | undefined): 'drafts' | 'published' {
  if (!value) return 'published'

  if (value === 'drafts' || value === 'published') return value

  throw new Error('SANITY_CONTENT_PERSPECTIVE must be "drafts" or "published".')
}
