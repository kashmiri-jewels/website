import { access, mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'

import { loadEnvFile, projectRoot } from './lib/runtime'

const generatedDir = path.join(projectRoot, 'src/generated')
const generatedFiles = [
  { path: path.join(generatedDir, 'products.json'), fallback: '[]\n' },
  { path: path.join(generatedDir, 'products-sync.json'), fallback: '[]\n' },
  { path: path.join(generatedDir, 'blog-posts.json'), fallback: '[]\n' },
  { path: path.join(generatedDir, 'site-content.json'), fallback: '{}\n' },
]

await mkdir(generatedDir, { recursive: true })
await loadEnvFile()

for (const file of generatedFiles) {
  try {
    await access(file.path)
  } catch {
    await writeFile(file.path, file.fallback)
  }
}

if (process.env.GOOGLE_SHEETS_SPREADSHEET_ID && process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
  await run('tsx', ['scripts/sync-products.ts'])
} else {
  console.log('Product catalog sync skipped: missing Google Sheets ID or service account JSON.')
}

function run(command: string, args: string[]) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: projectRoot,
      shell: process.platform === 'win32',
      stdio: 'inherit',
    })

    child.on('error', reject)
    child.on('exit', (code) => {
      if (code === 0) {
        resolve()
        return
      }

      reject(new Error(`${command} ${args.join(' ')} failed with exit code ${code}`))
    })
  })
}
