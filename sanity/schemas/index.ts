import { blogPost } from './blogPost'
import { homePage } from './homePage'
import { externalImage, routeLink, simpleRichText } from './objects'
import { siteSettings } from './siteSettings'
import { staticPage } from './staticPage'

export const schemaTypes = [
  externalImage,
  routeLink,
  simpleRichText,
  blogPost,
  siteSettings,
  homePage,
  staticPage,
]
