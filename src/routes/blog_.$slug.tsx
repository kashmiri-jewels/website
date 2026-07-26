import { PortableText, type PortableTextComponents } from '@portabletext/react'
import { Link, createFileRoute, notFound } from '@tanstack/react-router'
import { ArrowLeft } from 'lucide-react'

import { formatBlogDate, getBlogPostBySlug } from '../lib/blog'
import { getSanityImageUrl, type SanityImage } from '../lib/sanity'
import { createAbsoluteUrl, createPageMeta, siteName } from '../lib/seo'

export const Route = createFileRoute('/blog_/$slug')({
  loader: ({ params }) => {
    const post = getBlogPostBySlug(params.slug)

    if (!post) {
      throw notFound()
    }

    return { post }
  },
  head: ({ params }) => {
    const post = getBlogPostBySlug(params.slug)

    if (!post) {
      return createPageMeta({
        title: 'Blog post not found | Kashmiri Jewels',
        description: 'This Kashmiri Jewels blog post is unavailable.',
        path: '/blog',
      })
    }

    const image = getSanityImageUrl(post.coverImage, { width: 1200, height: 1500 })
    const seo = createPageMeta({
      title: `${post.seoTitle || post.title} | Kashmiri Jewels`,
      description: post.seoDescription || post.excerpt,
      path: `/blog/${post.slug}`,
      image,
      type: 'website',
    })

    return {
      ...seo,
      scripts: [
        {
          type: 'application/ld+json',
          children: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'BlogPosting',
            headline: post.title,
            description: post.seoDescription || post.excerpt,
            datePublished: post.publishedAt,
            image,
            author: {
              '@type': 'Organization',
              name: post.authorName || siteName,
            },
            publisher: {
              '@type': 'Organization',
              name: siteName,
            },
            mainEntityOfPage: createAbsoluteUrl(`/blog/${post.slug}`),
          }),
        },
      ],
    }
  },
  component: BlogDetailPage,
})

const portableTextComponents: PortableTextComponents = {
  block: {
    h2: ({ children }) => (
      <h2 className="mt-12 text-2xl font-medium leading-tight text-[var(--color-ink)] sm:text-3xl">
        {children}
      </h2>
    ),
    h3: ({ children }) => (
      <h3 className="mt-8 text-xl font-medium leading-tight text-[var(--color-ink)]">{children}</h3>
    ),
    normal: ({ children }) => (
      <p className="mt-5 text-base leading-8 text-[var(--color-ink-soft)] sm:text-lg sm:leading-9">
        {children}
      </p>
    ),
    blockquote: ({ children }) => (
      <blockquote className="my-9 border-l-2 border-[var(--color-primary)] bg-[var(--color-surface-soft)] py-5 pl-5 pr-6 font-serif text-2xl leading-9 text-[var(--color-ink)] sm:text-3xl sm:leading-10">
        {children}
      </blockquote>
    ),
  },
  list: {
    bullet: ({ children }) => (
      <ul className="mt-5 list-disc space-y-2 pl-6 text-base leading-8 text-[var(--color-ink-soft)] sm:text-lg sm:leading-9">
        {children}
      </ul>
    ),
    number: ({ children }) => (
      <ol className="mt-5 list-decimal space-y-2 pl-6 text-base leading-8 text-[var(--color-ink-soft)] sm:text-lg sm:leading-9">
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
  types: {
    externalImage: ({ value }) => {
      const image = value as SanityImage
      const url = getSanityImageUrl(image, { width: 1200 })
      if (!url) return null

      return (
        <figure className="my-10">
          <img
            src={url}
            alt={image.alt || ''}
            className="aspect-[16/10] w-full bg-[var(--color-surface)] object-cover"
            loading="lazy"
          />
          {image.alt ? (
            <figcaption className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {image.alt}
            </figcaption>
          ) : null}
        </figure>
      )
    },
    image: ({ value }) => {
      const image = value as SanityImage
      const url = getSanityImageUrl(image, { width: 1200 })
      if (!url) return null

      return (
        <figure className="my-10">
          <img
            src={url}
            alt={image.alt || ''}
            className="aspect-[16/10] w-full bg-[var(--color-surface)] object-cover"
            loading="lazy"
          />
          {image.alt ? (
            <figcaption className="mt-3 text-sm leading-6 text-[var(--color-muted)]">
              {image.alt}
            </figcaption>
          ) : null}
        </figure>
      )
    },
  },
}

function BlogDetailPage() {
  const { post } = Route.useLoaderData()
  const coverImage = getSanityImageUrl(post.coverImage, { width: 1600, height: 1000 })

  return (
    <main className="px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
      <article className="mx-auto max-w-7xl">
        <nav
          aria-label="Blog breadcrumb"
          className="mb-7 flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted)]"
        >
          <Link
            to="/blog"
            className="inline-flex items-center gap-2 transition hover:text-[var(--color-ink)]"
          >
            <ArrowLeft aria-hidden="true" className="h-4 w-4" />
            Blog
          </Link>
        </nav>

        <header className="border-b border-[var(--color-line)] pb-10">
          <div className="mx-auto max-w-4xl text-center">
            <PostMeta post={post} />
            <h1 className="mt-5 font-serif text-5xl font-normal leading-[0.98] text-[var(--color-ink)] sm:text-6xl lg:text-7xl">
              {post.title}
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-base leading-7 text-[var(--color-muted)] sm:text-lg sm:leading-8">
              {post.excerpt}
            </p>
          </div>
          {coverImage ? (
            <div className="mt-9 overflow-hidden bg-[var(--color-surface)]">
              <img
                src={coverImage}
                alt={post.coverImage?.alt || post.title}
                className="aspect-[16/10] w-full object-cover"
              />
            </div>
          ) : null}
        </header>

        <div className="grid gap-10 py-10 lg:grid-cols-[220px_minmax(0,760px)_220px] lg:items-start">
          <aside className="border-y border-[var(--color-line)] py-5 text-sm text-[var(--color-muted)] lg:sticky lg:top-[calc(var(--site-header-height)+1.5rem)] lg:border-b-0">
            <dl className="grid gap-4 sm:grid-cols-3 lg:grid-cols-1">
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em]">Written by</dt>
                <dd className="mt-1 text-[var(--color-ink)]">{post.authorName}</dd>
              </div>
              <div>
                <dt className="text-xs font-medium uppercase tracking-[0.12em]">Published</dt>
                <dd className="mt-1 text-[var(--color-ink)]">
                  <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
                </dd>
              </div>
              {post.category ? (
                <div>
                  <dt className="text-xs font-medium uppercase tracking-[0.12em]">Category</dt>
                  <dd className="mt-1 text-[var(--color-ink)]">{post.category}</dd>
                </div>
              ) : null}
            </dl>
          </aside>

          <div className="min-w-0">
            <PortableText value={post.content} components={portableTextComponents} />
            <footer className="mt-12 border-t border-[var(--color-line)] pt-6">
              <Link
                to="/blog"
                className="inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink)] transition hover:text-[var(--color-primary-dark)]"
              >
                <ArrowLeft aria-hidden="true" className="h-4 w-4" />
                Back to journal
              </Link>
            </footer>
          </div>

          <div aria-hidden="true" className="hidden lg:block" />
        </div>
      </article>
    </main>
  )
}

function PostMeta({ post }: { post: { category: string | null; publishedAt: string } }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
      {post.category ? <span>{post.category}</span> : null}
      {post.category ? <span aria-hidden="true">/</span> : null}
      <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
    </div>
  )
}
