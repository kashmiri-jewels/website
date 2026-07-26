import blogPosts from '../generated/blog-posts.json'
import type { SanityImage } from './sanity'

export type BlogPostSummary = {
  _id: string
  authorName: string
  category: string | null
  coverImage: SanityImage | null
  excerpt: string
  publishedAt: string
  slug: string
  title: string
}

export type BlogPost = BlogPostSummary & {
  content: unknown[]
  seoDescription: string | null
  seoTitle: string | null
}

export function listBlogPosts(): BlogPostSummary[] {
  return getGeneratedBlogPosts()
}

export function getBlogPostBySlug(slug: string): BlogPost | null {
  return getGeneratedBlogPosts().find((post) => post.slug === slug) ?? null
}

export function formatBlogDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''

  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date)
}

function getGeneratedBlogPosts(): BlogPost[] {
  return Array.isArray(blogPosts) ? (blogPosts as BlogPost[]) : []
}
