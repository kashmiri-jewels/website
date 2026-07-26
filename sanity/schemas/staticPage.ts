import { FileText } from 'lucide-react'
import { defineField, defineType } from 'sanity'

export const staticPage = defineType({
  name: 'staticPage',
  title: 'Static page',
  type: 'document',
  icon: FileText,
  fields: [
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'string',
      description: 'Use one URL segment, for example "about" or "size-guide". The page opens at /slug.',
      validation: (rule) =>
        rule.required().custom((value) => {
          if (typeof value !== 'string') return 'Slug is required'

          const slug = value.trim().replace(/^\/+|\/+$/g, '')
          if (!slug) return 'Slug is required'
          if (slug.includes('/')) return 'Use one URL segment without slashes'
          if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
            return 'Use lowercase letters, numbers, and hyphens only'
          }
          if (['admin', 'blog', 'checkout', 'orders', 'products'].includes(slug)) {
            return 'This slug is reserved by the storefront'
          }

          return true
        }),
    }),
    defineField({
      name: 'eyebrow',
      title: 'Eyebrow',
      type: 'string',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(140),
    }),
    defineField({
      name: 'body',
      title: 'Body',
      type: 'simpleRichText',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'seoTitle',
      title: 'SEO title',
      type: 'string',
      validation: (rule) => rule.max(70),
    }),
    defineField({
      name: 'seoDescription',
      title: 'SEO description',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.max(160),
    }),
  ],
  preview: {
    select: {
      title: 'title',
      subtitle: 'slug',
    },
  },
})
