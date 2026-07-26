import { Cog, LinkIcon, Megaphone, ShieldCheck } from 'lucide-react'
import { defineField, defineType } from 'sanity'

export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site settings',
  type: 'document',
  icon: Cog,
  fields: [
    defineField({
      name: 'announcement',
      title: 'Announcement bar',
      type: 'object',
      icon: Megaphone,
      fields: [
        defineField({ name: 'mobileText', title: 'Mobile text', type: 'string' }),
        defineField({ name: 'desktopText', title: 'Desktop text', type: 'string' }),
      ],
    }),
    defineField({
      name: 'headerLinks',
      title: 'Header links',
      type: 'array',
      of: [{ type: 'routeLink' }],
      validation: (rule) => rule.max(8),
    }),
    defineField({
      name: 'footerEyebrow',
      title: 'Footer eyebrow',
      type: 'string',
      validation: (rule) => rule.max(80),
    }),
    defineField({
      name: 'footerHeadline',
      title: 'Footer headline',
      type: 'string',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'footerDescription',
      title: 'Footer description',
      type: 'text',
      rows: 3,
      validation: (rule) => rule.max(260),
    }),
    defineField({
      name: 'footerShortCopy',
      title: 'Footer short copy',
      type: 'text',
      rows: 2,
      validation: (rule) => rule.max(180),
    }),
    defineField({
      name: 'footerSections',
      title: 'Footer link sections',
      type: 'array',
      icon: LinkIcon,
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (rule) => rule.required().max(50),
            }),
            defineField({
              name: 'links',
              title: 'Links',
              type: 'array',
              of: [{ type: 'routeLink' }],
              validation: (rule) => rule.required().min(1),
            }),
          ],
        },
      ],
    }),
    defineField({
      name: 'socialLinks',
      title: 'Social links',
      type: 'array',
      of: [{ type: 'routeLink' }],
      validation: (rule) => rule.max(8),
    }),
    defineField({
      name: 'benefits',
      title: 'Trust and benefit cards',
      type: 'array',
      icon: ShieldCheck,
      of: [
        {
          type: 'object',
          fields: [
            defineField({
              name: 'icon',
              title: 'Icon',
              type: 'string',
              options: {
                list: [
                  { title: 'Secure payments', value: 'shield' },
                  { title: 'Shipping', value: 'truck' },
                  { title: 'Returns', value: 'returns' },
                  { title: 'Order review', value: 'bag' },
                ],
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'title',
              title: 'Title',
              type: 'string',
              validation: (rule) => rule.required().max(60),
            }),
            defineField({
              name: 'copy',
              title: 'Copy',
              type: 'text',
              rows: 2,
              validation: (rule) => rule.required().max(180),
            }),
          ],
        },
      ],
      validation: (rule) => rule.max(6),
    }),
    defineField({
      name: 'copyrightLine',
      title: 'Copyright line',
      type: 'string',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'bottomNote',
      title: 'Bottom note',
      type: 'string',
      validation: (rule) => rule.max(120),
    }),
    defineField({
      name: 'seoDefaults',
      title: 'SEO defaults',
      type: 'object',
      fields: [
        defineField({ name: 'title', title: 'Title', type: 'string' }),
        defineField({ name: 'description', title: 'Description', type: 'text', rows: 2 }),
        defineField({ name: 'image', title: 'Image', type: 'externalImage' }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site settings' }),
  },
})
