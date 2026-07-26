import { Link, createFileRoute } from '@tanstack/react-router'
import { ArrowRight } from 'lucide-react'

import { formatBlogDate, listBlogPosts, type BlogPostSummary } from '../lib/blog'
import { getSanityImageUrl } from '../lib/sanity'
import { createPageMeta } from '../lib/seo'

export const Route = createFileRoute('/blog')({
  loader: () => listBlogPosts(),
  head: () =>
    createPageMeta({
      title: 'Blog | Kashmiri Jewels',
      description: 'Styling notes, care guides, and collection stories from Kashmiri Jewels.',
      path: '/blog',
    }),
  component: BlogIndexPage,
})

function BlogIndexPage() {
  const posts = Route.useLoaderData()
  const [featuredPost, ...remainingPosts] = posts

  return (
    <main className="px-4 pb-20 pt-8 sm:px-6 sm:pb-24 sm:pt-12 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <section className="grid gap-8 border-b border-[var(--color-line)] pb-10 lg:grid-cols-[minmax(0,0.8fr)_minmax(320px,0.42fr)] lg:items-end">
          <div>
            <p className="text-sm font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
              Journal
            </p>
            <h1 className="mt-4 max-w-3xl font-serif text-5xl font-normal leading-[0.98] text-[var(--color-ink)] sm:text-6xl lg:text-7xl">
              Styling notes for everyday Indian wear
            </h1>
          </div>
          <p className="max-w-lg text-base leading-7 text-[var(--color-muted)] lg:pb-2">
            Clean guidance on fabrics, fit, care, and styling choices that make your wardrobe
            easier to wear.
          </p>
        </section>

        {featuredPost ? (
          <>
            <FeaturedBlogPost post={featuredPost} />
            {remainingPosts.length > 0 ? (
              <section className="pt-12">
                <div className="mb-6 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
                      Latest
                    </p>
                    <h2 className="mt-2 text-xl font-medium text-[var(--color-ink)]">
                      More from the journal
                    </h2>
                  </div>
                </div>
                <div className="grid gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                  {remainingPosts.map((post) => (
                    <BlogPostCard key={post._id} post={post} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        ) : (
          <section className="py-14">
            <div className="max-w-xl border border-[var(--color-line)] bg-[var(--color-surface-soft)] p-6">
              <h2 className="text-base font-medium text-[var(--color-ink)]">
                Blog is being prepared
              </h2>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                Posts will appear here after Sanity is connected and the first article is published.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  )
}

function FeaturedBlogPost({ post }: { post: BlogPostSummary }) {
  const image = getSanityImageUrl(post.coverImage, { width: 1400, height: 980 })

  return (
    <section className="border-b border-[var(--color-line)] py-10 sm:py-12">
      <article className="grid gap-7 lg:grid-cols-[minmax(0,0.64fr)_minmax(320px,0.36fr)] lg:items-center">
        <Link
          to="/blog/$slug"
          params={{ slug: post.slug }}
          className="group relative block overflow-hidden bg-[var(--color-surface)]"
          aria-label={post.title}
        >
          <div className="aspect-[16/10]">
            {image ? (
              <img
                src={image}
                alt={post.coverImage?.alt || post.title}
                className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.02]"
                loading="eager"
              />
            ) : null}
          </div>
        </Link>
        <div>
          <PostMeta post={post} />
          <h2 className="mt-4 font-serif text-4xl font-normal leading-tight text-[var(--color-ink)] sm:text-5xl">
            <Link
              to="/blog/$slug"
              params={{ slug: post.slug }}
              className="hover:text-[var(--color-primary-dark)]"
            >
              {post.title}
            </Link>
          </h2>
          <p className="mt-4 text-base leading-7 text-[var(--color-muted)]">{post.excerpt}</p>
          <Link
            to="/blog/$slug"
            params={{ slug: post.slug }}
            className="mt-6 inline-flex items-center gap-2 text-sm font-medium text-[var(--color-ink)] transition hover:text-[var(--color-primary-dark)]"
          >
            Read article
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Link>
        </div>
      </article>
    </section>
  )
}

function BlogPostCard({ post }: { post: BlogPostSummary }) {
  const image = getSanityImageUrl(post.coverImage, { width: 900, height: 675 })

  return (
    <article className="group">
      <Link to="/blog/$slug" params={{ slug: post.slug }} className="block">
        <div className="relative aspect-[4/3] overflow-hidden bg-[var(--color-surface)]">
          {image ? (
            <img
              src={image}
              alt={post.coverImage?.alt || post.title}
              className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.025]"
              loading="lazy"
            />
          ) : null}
        </div>
        <div className="mt-4">
          <PostMeta post={post} />
          <h2 className="mt-3 text-xl font-medium leading-snug text-[var(--color-ink)]">
            {post.title}
          </h2>
          <p className="mt-3 text-sm leading-6 text-[var(--color-muted)]">{post.excerpt}</p>
        </div>
      </Link>
    </article>
  )
}

function PostMeta({ post }: { post: BlogPostSummary }) {
  return (
    <div className="flex flex-wrap items-center gap-2 text-xs font-medium uppercase tracking-[0.12em] text-[var(--color-muted)]">
      {post.category ? <span>{post.category}</span> : null}
      {post.category ? <span aria-hidden="true">/</span> : null}
      <time dateTime={post.publishedAt}>{formatBlogDate(post.publishedAt)}</time>
    </div>
  )
}
