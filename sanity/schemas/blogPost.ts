import { BookOpen, Calendar, Image, Tag, UserRound } from 'lucide-react'
import { defineField, defineType } from 'sanity'

export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog post',
  type: 'document',
  icon: BookOpen,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required().max(90),
    }),
    defineField({
      name: 'slug',
      title: 'Slug',
      type: 'slug',
      options: {
        source: 'title',
        maxLength: 96,
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Excerpt',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.required().max(220),
    }),
    defineField({
      name: 'coverImageUrl',
      title: 'Cover image URL',
      type: 'url',
      icon: Image,
      description: 'Use a Cloudflare/R2/CDN image URL for new posts.',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'coverImageAlt',
      title: 'Cover image alt text',
      type: 'string',
      validation: (rule) => rule.max(140),
    }),
    defineField({
      name: 'coverImage',
      title: 'Legacy Sanity cover image',
      type: 'image',
      description: 'Temporary fallback for posts created before external image URLs.',
      options: { hotspot: true },
      fields: [
        defineField({
          name: 'alt',
          title: 'Alt text',
          type: 'string',
          validation: (rule) => rule.required().max(140),
        }),
      ],
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      icon: Tag,
      options: {
        list: [
          { title: 'Styling', value: 'Styling' },
          { title: 'Fabric Care', value: 'Fabric Care' },
          { title: 'Size Guide', value: 'Size Guide' },
          { title: 'Collections', value: 'Collections' },
          { title: 'Behind The Studio', value: 'Behind The Studio' },
        ],
      },
    }),
    defineField({
      name: 'authorName',
      title: 'Author name',
      type: 'string',
      icon: UserRound,
      initialValue: 'Kashmiri Jewels Studio',
      validation: (rule) => rule.required().max(80),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Published date',
      type: 'datetime',
      icon: Calendar,
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'content',
      title: 'Content',
      type: 'array',
      of: [
        {
          type: 'block',
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading 2', value: 'h2' },
            { title: 'Heading 3', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bullet', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
          marks: {
            decorators: [
              { title: 'Strong', value: 'strong' },
              { title: 'Emphasis', value: 'em' },
            ],
            annotations: [
              {
                name: 'link',
                title: 'Link',
                type: 'object',
                fields: [
                  defineField({
                    name: 'href',
                    title: 'URL',
                    type: 'url',
                    validation: (rule) =>
                      rule.uri({
                        scheme: ['http', 'https', 'mailto', 'tel'],
                      }),
                  }),
                ],
              },
            ],
          },
        },
        {
          type: 'externalImage',
        },
        {
          type: 'image',
          title: 'Legacy Sanity image',
          description: 'Use only for older posts. Prefer external image URLs for new content.',
          options: {
            hotspot: true,
          },
          fields: [
            defineField({
              name: 'alt',
              title: 'Alt text',
              type: 'string',
              validation: (rule) => rule.required().max(140),
            }),
          ],
        },
      ],
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
      subtitle: 'category',
      media: 'coverImage',
    },
  },
})
