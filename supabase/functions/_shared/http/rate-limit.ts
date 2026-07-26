type RateLimitOptions = {
  key: string
  limit: number
  windowMs: number
}

type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

export class RateLimitError extends Error {
  readonly status = 429

  constructor(readonly retryAfterSeconds: number) {
    super('Too many requests. Try again shortly.')
  }
}

export function requireRateLimit(request: Request, options: RateLimitOptions) {
  const now = Date.now()
  const clientKey = getClientKey(request)
  const bucketKey = `${options.key}:${clientKey}`
  const existing = buckets.get(bucketKey)

  if (!existing || existing.resetAt <= now) {
    buckets.set(bucketKey, { count: 1, resetAt: now + options.windowMs })
    return
  }

  existing.count += 1

  if (existing.count > options.limit) {
    throw new RateLimitError(Math.ceil((existing.resetAt - now) / 1000))
  }
}

function getClientKey(request: Request) {
  return (
    request.headers.get('cf-connecting-ip') ||
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip') ||
    'unknown'
  )
}
