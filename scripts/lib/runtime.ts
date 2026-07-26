import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))

export const projectRoot = path.resolve(dirname, '../..')

export function projectPath(...segments: string[]) {
  return path.join(projectRoot, ...segments)
}

export async function loadEnvFile() {
  const envPath = projectPath('.env')

  try {
    const content = await readFile(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue

      const [key, ...valueParts] = trimmed.split('=')
      if (!key || process.env[key]) continue

      process.env[key] = valueParts.join('=').replace(/^['"]|['"]$/g, '')
    }
  } catch {
    // .env is optional; CI can provide environment variables directly.
  }
}

export function requiredEnv(name: string) {
  const value = process.env[name]
  if (!value) throw new Error(`${name} is required`)
  return value
}

export function getGoogleServiceAccountCredentials() {
  return JSON.parse(requiredEnv('GOOGLE_SERVICE_ACCOUNT_JSON')) as Record<string, unknown>
}
