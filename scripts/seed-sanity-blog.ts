import { createReadStream } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { createClient } from '@sanity/client'

const projectId = process.env.SANITY_STUDIO_PROJECT_ID || process.env.VITE_SANITY_PROJECT_ID || 'o4p78bwk'
const dataset = process.env.SANITY_STUDIO_DATASET || process.env.VITE_SANITY_DATASET || 'production'
const token = process.env.SANITY_WRITE_TOKEN || process.env.SANITY_AUTH_TOKEN

if (!token) {
  throw new Error('SANITY_WRITE_TOKEN is required to seed blog posts.')
}

const currentDir = path.dirname(fileURLToPath(import.meta.url))
const rootDir = path.resolve(currentDir, '..')

const client = createClient({
  projectId,
  dataset,
  apiVersion: '2026-06-16',
  token,
  useCdn: false,
})

const posts = [
  {
    id: 'blogPost.sample.easy-cotton-tops',
    title: 'Easy ways to style printed cotton tops',
    slug: 'easy-ways-to-style-printed-cotton-tops',
    excerpt:
      'A simple way to style printed cotton short tops for errands, lunches, and easy evenings without overthinking the outfit.',
    category: 'Styling',
    imagePath: 'public/assets/hero/kashmiri-jewels-everyday-elegance-01.jpg',
    imageAlt: 'Kashmiri Jewels everyday cotton styling mood',
    publishedAt: '2026-06-12T09:00:00.000Z',
    content: [
      paragraph('Printed cotton tops work best when the rest of the outfit stays quiet. Keep the base simple, let the print carry the mood, and choose accessories that do not compete.'),
      heading('Start with reliable bottoms'),
      paragraph('Straight pants, denims, and neutral palazzos are the easiest starting points. If the top has a busy print, pick one colour from the print and repeat it in the bottom or footwear.'),
      heading('Keep jewellery light'),
      paragraph('For daytime, small hoops or a slim bracelet is usually enough. For dinner, add one stronger detail like a cuff or a pair of statement earrings.'),
      heading('Use layers carefully'),
      paragraph('A cropped jacket or light shrug can work, but avoid heavy layers that hide the shape of the top. The goal is still comfort and movement.'),
    ],
  },
  {
    id: 'blogPost.sample.cotton-care',
    title: 'How to care for cotton everyday wear',
    slug: 'how-to-care-for-cotton-everyday-wear',
    excerpt:
      'Care habits that help cotton pieces hold their colour, shape, and softness through regular wear.',
    category: 'Fabric Care',
    imagePath: 'public/assets/hero/kashmiri-jewels-rooted-tradition-01.jpg',
    imageAlt: 'Folded everyday Indian wear in warm studio light',
    publishedAt: '2026-06-10T09:00:00.000Z',
    content: [
      paragraph('Cotton is easy to live with, but a little care makes it last better. The biggest wins come from gentle washing, shade drying, and avoiding harsh heat.'),
      heading('Wash inside out'),
      paragraph('Turn printed pieces inside out before washing. It reduces surface friction and helps the print stay fresh for longer.'),
      heading('Avoid direct harsh sun'),
      paragraph('Dry cotton in shade or soft indirect light. Strong sun can make deeper colours fade faster than expected.'),
      heading('Iron on medium heat'),
      paragraph('Use medium heat and avoid pressing directly over decorative details. A quick steam pass usually restores the shape without making the fabric stiff.'),
    ],
  },
  {
    id: 'blogPost.sample.coord-sets',
    title: 'Why co-ord sets make weekday dressing easier',
    slug: 'why-coord-sets-make-weekday-dressing-easier',
    excerpt:
      'Why coordinated sets are useful for busy days, and how to restyle the pieces separately.',
    category: 'Collections',
    imagePath: 'public/assets/hero/kashmiri-jewels-rooted-tradition-02.jpg',
    imageAlt: 'Coordinated everyday Indian outfit styling mood',
    publishedAt: '2026-06-08T09:00:00.000Z',
    content: [
      paragraph('A co-ord set removes one decision from the morning. The top and bottom are already balanced, so the outfit feels considered even when there is little time.'),
      heading('Wear it together first'),
      paragraph('The complete set is the easiest version. Add clean sandals, a small bag, and one piece of jewellery.'),
      heading('Restyle the kurta'),
      paragraph('Pair the top with denims, solid trousers, or a plain skirt. This makes the set feel like several outfits instead of one fixed look.'),
      heading('Restyle the pants'),
      paragraph('Printed pants can work with a plain cotton top or a short kurta. Keep the colour palette close so the outfit still feels intentional.'),
    ],
  },
]

for (const post of posts) {
  const imageFile = path.join(rootDir, post.imagePath)
  const asset = await client.assets.upload('image', createReadStream(imageFile), {
    filename: path.basename(imageFile),
  })

  await client.createOrReplace({
    _id: post.id,
    _type: 'blogPost',
    authorName: 'Kashmiri Jewels Studio',
    category: post.category,
    content: post.content,
    coverImage: {
      _type: 'image',
      alt: post.imageAlt,
      asset: {
        _type: 'reference',
        _ref: asset._id,
      },
    },
    excerpt: post.excerpt,
    publishedAt: post.publishedAt,
    seoDescription: post.excerpt,
    seoTitle: post.title,
    slug: {
      _type: 'slug',
      current: post.slug,
    },
    title: post.title,
  })

  console.log(`Seeded ${post.slug}`)
}

function paragraph(text: string) {
  return {
    _key: createKey(text),
    _type: 'block',
    children: [
      {
        _key: createKey(`${text}-span`),
        _type: 'span',
        marks: [],
        text,
      },
    ],
    markDefs: [],
    style: 'normal',
  }
}

function heading(text: string) {
  return {
    ...paragraph(text),
    style: 'h2',
  }
}

function createKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 32)
}
