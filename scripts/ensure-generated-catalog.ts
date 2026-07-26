import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { projectRoot } from './lib/runtime'

const generatedDir = path.join(projectRoot, 'src/generated')
const generatedFiles = [
  { path: path.join(generatedDir, 'products.json'), fallback: '[]\n' },
  { path: path.join(generatedDir, 'products-sync.json'), fallback: '[]\n' },
  { path: path.join(generatedDir, 'blog-posts.json'), fallback: '[]\n' },
  { path: path.join(generatedDir, 'site-content.json'), fallback: '{}\n' },
]

await mkdir(generatedDir, { recursive: true })

for (const file of generatedFiles) {
  try {
    await access(file.path)
  } catch {
    await writeFile(file.path, file.fallback)
  }
}
