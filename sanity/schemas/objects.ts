import { defineField, defineType } from 'sanity'

export const externalImage = defineType({
  name: 'externalImage',
  title: 'External image',
  type: 'object',
  fields: [
    defineField({
      name: 'url',
      title: 'Image URL',
      type: 'url',
      validation: (rule) => rule.required().uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'alt',
      title: 'Alt text',
      type: 'string',
      validation: (rule) => rule.required().max(160),
    }),
  ],
})

export const routeLink = defineType({
  name: 'routeLink',
  title: 'Link',
  type: 'object',
  fields: [
    defineField({
      name: 'label',
      title: 'Label',
      type: 'string',
      validation: (rule) => rule.required().max(60),
    }),
    defineField({
      name: 'url',
      title: 'URL or route',
      type: 'string',
      description: 'Use storefront paths such as /products?sort=newest, or full https URLs.',
      validation: (rule) => rule.required().max(240),
    }),
  ],
})

export const simpleRichText = defineType({
  name: 'simpleRichText',
  title: 'Simple rich text',
  type: 'array',
  of: [
    {
      type: 'block',
      styles: [
        { title: 'Normal', value: 'normal' },
        { title: 'Heading 2', value: 'h2' },
        { title: 'Heading 3', value: 'h3' },
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
                    allowRelative: true,
                  }),
              }),
            ],
          },
        ],
      },
    },
  ],
})
