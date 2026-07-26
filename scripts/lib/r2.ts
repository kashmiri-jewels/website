import { createHash, createHmac } from 'node:crypto'

export type R2ClientConfig = {
  accessKeyId: string
  bucket: string
  endpoint: URL
  secretAccessKey: string
}

export async function r2ObjectExists(config: R2ClientConfig, objectKey: string) {
  const response = await signedR2Fetch(config, 'HEAD', objectKey)

  if (response.status === 404) return false
  if (!response.ok) {
    throw new Error(`Unable to check R2 object ${objectKey}: ${response.status} ${response.statusText}`)
  }

  return true
}

export async function putR2Object(
  config: R2ClientConfig,
  objectKey: string,
  body: Buffer,
  contentType: string,
) {
  const response = await signedR2Fetch(config, 'PUT', objectKey, body, {
    'cache-control': 'public, max-age=31536000, immutable',
    'content-type': contentType,
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Unable to upload R2 object ${objectKey}: ${response.status} ${response.statusText} ${text}`)
  }
}

async function signedR2Fetch(
  config: R2ClientConfig,
  method: 'HEAD' | 'PUT',
  objectKey: string,
  body?: Buffer,
  extraHeaders: Record<string, string> = {},
) {
  const payloadHash = createHash('sha256').update(body ?? '').digest('hex')
  const now = new Date()
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const dateStamp = amzDate.slice(0, 8)
  const objectPath = `/${config.bucket}/${encodeObjectKey(objectKey)}`
  const url = new URL(objectPath, config.endpoint)
  const canonicalHeaders: Record<string, string> = {
    ...normalizeHeaderNames(extraHeaders),
    host: config.endpoint.host,
    'x-amz-content-sha256': payloadHash,
    'x-amz-date': amzDate,
  }
  const signedHeaderNames = Object.keys(canonicalHeaders).sort()
  const signedHeaders = signedHeaderNames.join(';')
  const canonicalRequest = [
    method,
    objectPath,
    '',
    signedHeaderNames.map((name) => `${name}:${canonicalHeaders[name]}`).join('\n') + '\n',
    signedHeaders,
    payloadHash,
  ].join('\n')
  const credentialScope = `${dateStamp}/auto/s3/aws4_request`
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    credentialScope,
    createHash('sha256').update(canonicalRequest).digest('hex'),
  ].join('\n')
  const signature = hmacHex(getSigningKey(config.secretAccessKey, dateStamp), stringToSign)
  const headers = new Headers(extraHeaders)

  headers.set('x-amz-content-sha256', payloadHash)
  headers.set('x-amz-date', amzDate)
  headers.set(
    'authorization',
    [
      `AWS4-HMAC-SHA256 Credential=${config.accessKeyId}/${credentialScope}`,
      `SignedHeaders=${signedHeaders}`,
      `Signature=${signature}`,
    ].join(', '),
  )

  return fetch(url, {
    method,
    headers,
    body: body as unknown as BodyInit | undefined,
  })
}

function getSigningKey(secretAccessKey: string, dateStamp: string) {
  const dateKey = hmacBuffer(`AWS4${secretAccessKey}`, dateStamp)
  const dateRegionKey = hmacBuffer(dateKey, 'auto')
  const dateRegionServiceKey = hmacBuffer(dateRegionKey, 's3')
  return hmacBuffer(dateRegionServiceKey, 'aws4_request')
}

function hmacBuffer(key: string | Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest()
}

function hmacHex(key: Buffer, value: string) {
  return createHmac('sha256', key).update(value).digest('hex')
}

function normalizeHeaderNames(headers: Record<string, string>) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value.trim()]),
  )
}

export function encodeObjectKey(objectKey: string) {
  return objectKey.split('/').map(encodeURIComponent).join('/')
}
