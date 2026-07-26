import { Home } from 'lucide-react'
import { defineField, defineType } from 'sanity'

export const homePage = defineType({
  name: 'homePage',
  title: 'Home page',
  type: 'document',
  icon: Home,
  fields: [
    defineField({
      name: 'seo',
      title: 'SEO',
      type: 'object',
      fields: [
        defineField({ name: 'title', title: 'Title', type: 'string' }),
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
        defineField({ name: 'image', title: 'Image', type: 'externalImage' }),
      ],
    }),
    defineField({
      name: 'hero',
      title: 'Hero',
      type: 'object',
      fields: [
        defineField({
          name: 'screenReaderTitle',
          title: 'Screen reader title',
          type: 'string',
          validation: (rule) => rule.max(120),
        }),
        defineField({
          name: 'slides',
          title: 'Slides',
          type: 'array',
          of: [{ type: 'externalImage' }],
          validation: (rule) => rule.min(1).max(5),
        }),
        defineField({ name: 'primaryCta', title: 'Primary CTA', type: 'routeLink' }),
        defineField({ name: 'styleFinderLabel', title: 'Style finder label', type: 'string' }),
      ],
    }),
    defineField({
      name: 'categorySection',
      title: 'Category section',
      type: 'object',
      fields: [
        defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'link', title: 'Link', type: 'routeLink' }),
      ],
    }),
    defineField({
      name: 'bestSellersSection',
      title: 'Best sellers section',
      type: 'object',
      fields: [
        defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'link', title: 'Link', type: 'routeLink' }),
      ],
    }),
    defineField({
      name: 'imageStory',
      title: 'Image story',
      type: 'object',
      fields: [
        defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'copy', title: 'Copy', type: 'text', rows: 3 }),
        defineField({ name: 'link', title: 'Link', type: 'routeLink' }),
      ],
    }),
    defineField({
      name: 'newArrivalsSection',
      title: 'New arrivals section',
      type: 'object',
      fields: [
        defineField({ name: 'eyebrow', title: 'Eyebrow', type: 'string' }),
        defineField({ name: 'heading', title: 'Heading', type: 'string' }),
        defineField({ name: 'link', title: 'Link', type: 'routeLink' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Home page' }),
  },
})
