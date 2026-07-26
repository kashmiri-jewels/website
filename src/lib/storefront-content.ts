import siteContent from '../generated/site-content.json'

export type StorefrontLink = {
  label: string
  url: string
}

export type StorefrontImage = {
  alt: string
  url: string
}

export type HomePageContent = {
  bestSellersSection: SectionContent
  categorySection: SectionContent
  hero: {
    primaryCta: StorefrontLink
    screenReaderTitle: string
    slides: StorefrontImage[]
    styleFinderLabel: string
  }
  imageStory: SectionContent & {
    copy: string
  }
  newArrivalsSection: SectionContent
  seo: {
    description: string
    image: StorefrontImage
    title: string
  }
}

export type SiteSettingsContent = {
  announcement: {
    desktopText: string
    mobileText: string
  }
  benefits: Array<{
    copy: string
    icon: 'bag' | 'returns' | 'shield' | 'truck'
    title: string
  }>
  bottomNote: string
  copyrightLine: string
  footerDescription: string
  footerEyebrow: string
  footerHeadline: string
  footerSections: Array<{
    links: StorefrontLink[]
    title: string
  }>
  footerShortCopy: string
  headerLinks: StorefrontLink[]
  socialLinks: StorefrontLink[]
}

export type StaticPageSlug = string

export type StaticPageContent = {
  body: unknown[]
  eyebrow: string
  seoDescription: string
  seoTitle: string
  slug: StaticPageSlug
  title: string
}

type SectionContent = {
  eyebrow: string
  heading: string
  link: StorefrontLink
}

export function getSiteSettingsContent(): SiteSettingsContent {
  const settings = requireRecord(getGeneratedContent().siteSettings, 'siteSettings')

  return {
    announcement: {
      desktopText: requireString(settings.announcement, 'siteSettings.announcement.desktopText', [
        'desktopText',
      ]),
      mobileText: requireString(settings.announcement, 'siteSettings.announcement.mobileText', [
        'mobileText',
      ]),
    },
    headerLinks: requireLinks(settings.headerLinks, 'siteSettings.headerLinks'),
    footerEyebrow: requireString(settings, 'siteSettings.footerEyebrow', ['footerEyebrow']),
    footerHeadline: requireString(settings, 'siteSettings.footerHeadline', ['footerHeadline']),
    footerDescription: requireString(settings, 'siteSettings.footerDescription', [
      'footerDescription',
    ]),
    footerShortCopy: requireString(settings, 'siteSettings.footerShortCopy', ['footerShortCopy']),
    footerSections: requireFooterSections(settings.footerSections),
    socialLinks: readSocialLinks(settings.socialLinks),
    benefits: requireBenefits(settings.benefits),
    copyrightLine: requireString(settings, 'siteSettings.copyrightLine', ['copyrightLine']),
    bottomNote: requireString(settings, 'siteSettings.bottomNote', ['bottomNote']),
  }
}

export function getHomePageContent(): HomePageContent {
  const home = requireRecord(getGeneratedContent().homePage, 'homePage')
  const hero = requireRecord(home.hero, 'homePage.hero')
  const seo = requireRecord(home.seo, 'homePage.seo')
  const imageStory = requireRecord(home.imageStory, 'homePage.imageStory')

  return {
    seo: {
      title: requireString(seo, 'homePage.seo.title', ['title']),
      description: requireString(seo, 'homePage.seo.description', ['description']),
      image: requireImage(seo.image, 'homePage.seo.image'),
    },
    hero: {
      screenReaderTitle: requireString(hero, 'homePage.hero.screenReaderTitle', [
        'screenReaderTitle',
      ]),
      slides: requireImages(hero.slides, 'homePage.hero.slides'),
      primaryCta: requireLink(hero.primaryCta, 'homePage.hero.primaryCta'),
      styleFinderLabel: requireString(hero, 'homePage.hero.styleFinderLabel', [
        'styleFinderLabel',
      ]),
    },
    categorySection: requireSection(home.categorySection, 'homePage.categorySection'),
    bestSellersSection: requireSection(home.bestSellersSection, 'homePage.bestSellersSection'),
    imageStory: {
      eyebrow: requireString(imageStory, 'homePage.imageStory.eyebrow', ['eyebrow']),
      heading: requireString(imageStory, 'homePage.imageStory.heading', ['heading']),
      copy: requireString(imageStory, 'homePage.imageStory.copy', ['copy']),
      link: requireLink(imageStory.link, 'homePage.imageStory.link'),
    },
    newArrivalsSection: requireSection(home.newArrivalsSection, 'homePage.newArrivalsSection'),
  }
}

export function getStaticPageContent(slug: StaticPageSlug): StaticPageContent {
  const page = findStaticPageContent(slug)
  if (!page) {
    throw new Error(`Generated Sanity content is missing staticPage.${slug}.`)
  }

  return page
}

export function findStaticPageContent(slug: StaticPageSlug): StaticPageContent | null {
  const pagesValue = getGeneratedContent().staticPages
  if (!Array.isArray(pagesValue)) {
    throw new Error('Generated Sanity content is missing staticPages.')
  }

  const normalizedSlug = normalizeStaticPageSlug(slug)
  if (!normalizedSlug) return null

  const page = pagesValue.find(
    (item) => isRecord(item) && normalizeStaticPageSlug(item.slug) === normalizedSlug,
  )
  if (!page) return null

  const record = requireRecord(page, `staticPage.${normalizedSlug}`)
  const body = record.body

  if (!Array.isArray(body) || body.length === 0) {
    throw new Error(`Generated Sanity content is missing staticPage.${normalizedSlug}.body.`)
  }

  return {
    slug: normalizedSlug,
    eyebrow: requireString(record, `staticPage.${normalizedSlug}.eyebrow`, ['eyebrow']),
    title: requireString(record, `staticPage.${normalizedSlug}.title`, ['title']),
    seoTitle: requireString(record, `staticPage.${normalizedSlug}.seoTitle`, ['seoTitle']),
    seoDescription: requireString(record, `staticPage.${normalizedSlug}.seoDescription`, [
      'seoDescription',
    ]),
    body,
  }
}

export function getStaticPagePaths() {
  const pagesValue = getGeneratedContent().staticPages
  if (!Array.isArray(pagesValue)) return []

  return pagesValue.flatMap((item) => {
    if (!isRecord(item)) return []

    const slug = normalizeStaticPageSlug(item.slug)
    return slug ? [`/${slug}`] : []
  })
}

export function validateGeneratedStorefrontContent() {
  getSiteSettingsContent()
  getHomePageContent()

  for (const path of getStaticPagePaths()) {
    getStaticPageContent(path)
  }
}

function getGeneratedContent(): Record<string, unknown> {
  if (!isRecord(siteContent)) {
    throw new Error('Generated Sanity content is invalid.')
  }

  return siteContent
}

function requireSection(value: unknown, path: string): SectionContent {
  const section = requireRecord(value, path)

  return {
    eyebrow: requireString(section, `${path}.eyebrow`, ['eyebrow']),
    heading: requireString(section, `${path}.heading`, ['heading']),
    link: requireLink(section.link, `${path}.link`),
  }
}

function requireFooterSections(value: unknown): SiteSettingsContent['footerSections'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Generated Sanity content is missing siteSettings.footerSections.')
  }

  return value.map((item, index) => {
    const section = requireRecord(item, `siteSettings.footerSections[${index}]`)

    return {
      title: requireString(section, `siteSettings.footerSections[${index}].title`, ['title']),
      links: requireLinks(section.links, `siteSettings.footerSections[${index}].links`),
    }
  })
}

function requireBenefits(value: unknown): SiteSettingsContent['benefits'] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error('Generated Sanity content is missing siteSettings.benefits.')
  }

  return value.map((item, index) => {
    const benefit = requireRecord(item, `siteSettings.benefits[${index}]`)
    const icon = requireString(benefit, `siteSettings.benefits[${index}].icon`, ['icon'])

    if (!isBenefitIcon(icon)) {
      throw new Error(`Generated Sanity content has invalid benefit icon "${icon}".`)
    }

    return {
      icon,
      title: requireString(benefit, `siteSettings.benefits[${index}].title`, ['title']),
      copy: requireString(benefit, `siteSettings.benefits[${index}].copy`, ['copy']),
    }
  })
}

function requireLinks(value: unknown, path: string): StorefrontLink[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Generated Sanity content is missing ${path}.`)
  }

  return value.map((item, index) => requireLink(item, `${path}[${index}]`))
}

function requireLink(value: unknown, path: string): StorefrontLink {
  const record = requireRecord(value, path)

  return {
    label: requireString(record, `${path}.label`, ['label']),
    url: requireString(record, `${path}.url`, ['url']),
  }
}

function readSocialLinks(value: unknown): StorefrontLink[] {
  if (!Array.isArray(value)) return []

  return value.flatMap((item): StorefrontLink[] => {
    if (!isRecord(item)) return []

    const url = readTrimmedString(item.url)
    if (!url) return []

    return [
      {
        label: readTrimmedString(item.label) ?? inferSocialLabel(url),
        url,
      },
    ]
  })
}

function inferSocialLabel(url: string) {
  try {
    const parsedUrl = new URL(url, 'https://kashmirijewels.com')
    const host = parsedUrl.hostname.replace(/^www\./, '')
    const knownLabels: Record<string, string> = {
      'facebook.com': 'Facebook',
      'instagram.com': 'Instagram',
      'linkedin.com': 'LinkedIn',
      'pinterest.com': 'Pinterest',
      'twitter.com': 'X',
      'x.com': 'X',
      'youtube.com': 'YouTube',
      'youtu.be': 'YouTube',
    }

    if (knownLabels[host]) return knownLabels[host]

    const domainLabel = host.split('.')[0]
    if (domainLabel) return toTitleCase(domainLabel)
  } catch {
    // Fall through to route/path label inference.
  }

  const pathLabel = url
    .replace(/^https?:\/\//, '')
    .replace(/^\/+/, '')
    .split(/[/?#]/)[0]

  return pathLabel ? toTitleCase(pathLabel.replace(/[-_]+/g, ' ')) : 'Social'
}

function requireImages(value: unknown, path: string): StorefrontImage[] {
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error(`Generated Sanity content is missing ${path}.`)
  }

  return value.map((item, index) => requireImage(item, `${path}[${index}]`))
}

function requireImage(value: unknown, path: string): StorefrontImage {
  const record = requireRecord(value, path)

  return {
    url: requireString(record, `${path}.url`, ['url']),
    alt: requireString(record, `${path}.alt`, ['alt']),
  }
}

function requireRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) {
    throw new Error(`Generated Sanity content is missing ${path}.`)
  }

  return value
}

function requireString(
  value: unknown,
  path: string,
  nestedKeys: [string] | [string, string],
): string {
  let candidate = value

  for (const key of nestedKeys) {
    candidate = isRecord(candidate) ? candidate[key] : undefined
  }

  if (typeof candidate !== 'string' || !candidate.trim()) {
    throw new Error(`Generated Sanity content is missing ${path}.`)
  }

  return candidate.trim()
}

function readTrimmedString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function normalizeStaticPageSlug(value: unknown) {
  if (typeof value === 'string') {
    return value.trim().replace(/^\/+|\/+$/g, '') || null
  }

  if (isRecord(value) && typeof value.current === 'string') {
    return value.current.trim().replace(/^\/+|\/+$/g, '') || null
  }

  return null
}

function toTitleCase(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function isBenefitIcon(value: string): value is SiteSettingsContent['benefits'][number]['icon'] {
  return value === 'bag' || value === 'returns' || value === 'shield' || value === 'truck'
}
