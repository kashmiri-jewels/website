import { defineConfig } from 'vite'
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { cloudflare } from '@cloudflare/vite-plugin'
import { tanstackStart } from '@tanstack/react-start/plugin/vite'

import viteReact from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const projectRoot = path.dirname(fileURLToPath(import.meta.url))
const staticPagePaths = readStaticPagePaths()

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: 'ssr' } }),
    tailwindcss(),
    tanstackStart({
      prerender: {
        enabled: true,
        crawlLinks: true,
        failOnError: true,
        filter: ({ path }) =>
          path === '/' ||
          path.startsWith('/products') ||
          path.startsWith('/blog') ||
          staticPagePaths.has(path),
      },
    }),
    viteReact(),
  ],
})

export default config

function readStaticPagePaths() {
  try {
    const content = JSON.parse(
      readFileSync(path.join(projectRoot, 'src/generated/site-content.json'), 'utf8'),
    ) as { staticPages?: Array<{ slug?: unknown }> }
    const paths = new Set<string>()

    for (const page of content.staticPages ?? []) {
      if (typeof page.slug !== 'string') continue

      const slug = page.slug.trim().replace(/^\/+|\/+$/g, '')
      if (slug) paths.add(`/${slug}`)
    }

    return paths
  } catch {
    return new Set<string>()
  }
}
