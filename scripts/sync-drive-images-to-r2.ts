import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'
import sharp from 'sharp'

import { mapWithConcurrency } from './lib/concurrency'
import { encodeObjectKey, putR2Object, r2ObjectExists } from './lib/r2'
import {
  getGoogleServiceAccountCredentials,
  loadEnvFile,
  projectRoot,
  requiredEnv,
} from './lib/runtime'

type DriveImageFile = {
  id: string
  name: string
  mimeType: string
  md5Checksum?: string
  size?: string
}

type DriveFolder = {
  id: string
  name: string
}

type ProductImageManifest = {
  generatedAt: string
  bucket: string
  publicBaseUrl: string
  products: Record<string, ProductImageManifestEntry[]>
  summary: {
    productFolders: number
    imagesDiscovered: number
    imagesUploaded: number
    imagesSkipped: number
  }
}

type ProductImageManifestEntry = {
  storagePath: string
  publicUrl: string
  sourceFileId: string
  sourceFileName: string
  contentHash: string
  contentType: string
  sizeBytes: number | null
  variants: ProductImageVariant[]
}

type ProductImageVariant = {
  width: number
  storagePath: string
  publicUrl: string
  contentType: string
}

type SyncMode = 'sync' | 'manifest-only' | 'upload-manifest'

const defaultManifestPath = path.join(projectRoot, 'src/generated/product-image-manifest.json')

const supportedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
const supportedExtensions = new Set(supportedImageExtensions)
const driveFolderConcurrency = 8
const r2UploadConcurrency = 8
const imageVariantWidths = [400, 800, 1200]
const imageVariantContentType = 'image/webp'
const defaultImageVariantWidth = 800

async function main() {
  await loadEnvFile()

  const mode = readMode()
  const config = readConfig(mode)
  const drive = google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      credentials: getGoogleServiceAccountCredentials(),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    }),
  })

  if (mode === 'upload-manifest') {
    await uploadManifestImages(drive, config)
    return
  }

  const productFolders = await listProductFolders(drive, config.driveFolderId)
  const manifest: ProductImageManifest = {
    generatedAt: new Date().toISOString(),
    bucket: config.bucket,
    publicBaseUrl: config.publicBaseUrl,
    products: {},
    summary: {
      productFolders: productFolders.length,
      imagesDiscovered: 0,
      imagesUploaded: 0,
      imagesSkipped: 0,
    },
  }

  const productImageEntries = await mapWithConcurrency(productFolders, driveFolderConcurrency, async (folder) => {
    assertStableProductId(folder.name)

    const files = await listImageFiles(drive, folder.id)
    const images: ProductImageManifestEntry[] = []
    let imagesUploaded = 0
    let imagesSkipped = 0

    for (const file of files) {
      const hash = await resolveContentHash(drive, file)
      const variants = createImageVariants(config.publicBaseUrl, folder.name, hash, file.name)
      const defaultVariant = pickDefaultVariant(variants)

      if (mode === 'sync') {
        const result = await syncImageVariants(drive, config, file.id, folder.name, variants)

        if (result === 'uploaded') imagesUploaded += 1
        if (result === 'skipped') imagesSkipped += 1
      }

      images.push({
        storagePath: defaultVariant.storagePath,
        publicUrl: defaultVariant.publicUrl,
        sourceFileId: file.id,
        sourceFileName: file.name,
        contentHash: hash,
        contentType: defaultVariant.contentType,
        sizeBytes: file.size ? Number(file.size) : null,
        variants,
      })
    }

    return { productId: folder.name, images, imagesUploaded, imagesSkipped }
  })

  for (const entry of productImageEntries) {
    if (entry.images.length === 0) continue

    manifest.products[entry.productId] = entry.images
    manifest.summary.imagesDiscovered += entry.images.length
    manifest.summary.imagesUploaded += entry.imagesUploaded
    manifest.summary.imagesSkipped += entry.imagesSkipped
  }

  await writeFile(config.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(
    [
      `Discovered ${manifest.summary.imagesDiscovered} product images from Google Drive`,
      mode === 'sync'
        ? `Uploaded ${manifest.summary.imagesUploaded} new or changed images to R2`
        : 'Deferred R2 upload until after product data validation',
      mode === 'sync'
        ? `Skipped ${manifest.summary.imagesSkipped} unchanged images`
        : 'Skipped 0 unchanged images during manifest-only discovery',
      `Wrote ${path.relative(projectRoot, config.manifestPath)}`,
    ].join('\n'),
  )
}

async function uploadManifestImages(
  drive: ReturnType<typeof google.drive>,
  config: ReturnType<typeof readConfig>,
) {
  const manifest = JSON.parse(await readFile(config.manifestPath, 'utf8')) as ProductImageManifest

  if (!manifest || typeof manifest !== 'object' || !manifest.products || typeof manifest.products !== 'object') {
    throw new Error(`Invalid product image manifest at ${path.relative(projectRoot, config.manifestPath)}`)
  }

  if (manifest.bucket !== config.bucket) {
    throw new Error(`Image manifest bucket ${manifest.bucket} does not match ${config.bucket}`)
  }

  if (manifest.publicBaseUrl.replace(/\/+$/, '') !== config.publicBaseUrl) {
    throw new Error(`Image manifest publicBaseUrl ${manifest.publicBaseUrl} does not match ${config.publicBaseUrl}`)
  }

  const manifestImages = Object.entries(manifest.products).flatMap(([productId, images]) => {
    assertStableProductId(productId)

    return images.map((image) => ({ productId, image }))
  })
  const uploadResults = await mapWithConcurrency(manifestImages, r2UploadConcurrency, async ({ productId, image }) => {
    assertManifestImage(image, productId)

    return syncImageVariants(drive, config, image.sourceFileId, productId, image.variants)
  })
  const discovered = manifestImages.length
  const uploaded = uploadResults.filter((result) => result === 'uploaded').length
  const skipped = uploadResults.filter((result) => result === 'skipped').length

  console.log(
    [
      `Read ${discovered} product images from ${path.relative(projectRoot, config.manifestPath)}`,
      `Uploaded ${uploaded} new or changed images to R2`,
      `Skipped ${skipped} unchanged images`,
    ].join('\n'),
  )
}

function assertManifestImage(image: ProductImageManifestEntry, productId: string) {
  if (!image.storagePath || typeof image.storagePath !== 'string') {
    throw new Error(`Image manifest entry for ${productId} is missing storagePath`)
  }

  if (!image.sourceFileId || typeof image.sourceFileId !== 'string') {
    throw new Error(`Image manifest entry for ${productId} is missing sourceFileId`)
  }

  if (!image.contentType || typeof image.contentType !== 'string') {
    throw new Error(`Image manifest entry for ${productId} is missing contentType`)
  }

  if (!Array.isArray(image.variants) || image.variants.length === 0) {
    throw new Error(`Image manifest entry for ${productId} is missing optimized variants`)
  }
}

async function syncImageVariants(
  drive: ReturnType<typeof google.drive>,
  config: ReturnType<typeof readConfig>,
  sourceFileId: string,
  productId: string,
  variants: ProductImageVariant[],
) {
  const missingVariants: ProductImageVariant[] = []

  for (const variant of variants) {
    assertImageVariant(variant, productId)

    const exists = await r2ObjectExists(config, variant.storagePath)
    if (!exists) missingVariants.push(variant)
  }

  if (missingVariants.length === 0) return 'skipped' as const

  const content = await downloadDriveFile(drive, sourceFileId)
  const optimizedByWidth = await createOptimizedImageVariantBuffers(content, missingVariants)

  await Promise.all(
    missingVariants.map((variant) => {
      const optimized = optimizedByWidth.get(variant.width)
      if (!optimized) throw new Error(`Missing optimized ${variant.width}px variant for ${productId}`)

      return putR2Object(config, variant.storagePath, optimized, variant.contentType)
    }),
  )

  return 'uploaded' as const
}

function assertImageVariant(variant: ProductImageVariant, productId: string) {
  if (!Number.isInteger(variant.width) || variant.width <= 0) {
    throw new Error(`Image manifest entry for ${productId} has invalid variant width`)
  }

  if (!variant.storagePath || typeof variant.storagePath !== 'string') {
    throw new Error(`Image manifest entry for ${productId} has invalid variant storagePath`)
  }

  if (variant.contentType !== imageVariantContentType) {
    throw new Error(`Image manifest entry for ${productId} has invalid variant contentType`)
  }
}

function createImageVariants(
  publicBaseUrl: string,
  productId: string,
  contentHash: string,
  sourceFileName: string,
) {
  return imageVariantWidths.map((width) => {
    const storagePath = createVariantObjectKey(productId, contentHash, sourceFileName, width)

    return {
      width,
      storagePath,
      publicUrl: `${publicBaseUrl}/${encodeObjectKey(storagePath)}`,
      contentType: imageVariantContentType,
    }
  })
}

function pickDefaultVariant(variants: ProductImageVariant[]) {
  return variants.find((variant) => variant.width === defaultImageVariantWidth) ?? variants[0]
}

async function createOptimizedImageVariantBuffers(
  source: Buffer,
  variants: ProductImageVariant[],
) {
  const uniqueWidths = Array.from(new Set(variants.map((variant) => variant.width)))
  const entries = await Promise.all(
    uniqueWidths.map(async (width) => [
      width,
      await sharp(source)
        .rotate()
        .resize({ width, withoutEnlargement: true })
        .webp({ quality: 80 })
        .toBuffer(),
    ] as const),
  )

  return new Map(entries)
}

function readMode(): SyncMode {
  const args = new Set(process.argv.slice(2))

  if (args.has('--manifest-only') && args.has('--upload-manifest')) {
    throw new Error('Use only one image sync mode')
  }

  if (args.has('--manifest-only')) return 'manifest-only'
  if (args.has('--upload-manifest')) return 'upload-manifest'
  return 'sync'
}

function readConfig(mode: SyncMode) {
  const needsR2Access = mode !== 'manifest-only'
  const endpoint = new URL(
    (
      process.env.R2_S3_ENDPOINT
      ?? (needsR2Access ? `https://${requiredEnv('CLOUDFLARE_ACCOUNT_ID')}.r2.cloudflarestorage.com` : 'https://example.invalid')
    ).replace(/\/+$/, ''),
  )
  const publicBaseUrl = requiredEnv('PRODUCT_IMAGE_PUBLIC_BASE_URL').replace(/\/+$/, '')

  return {
    driveFolderId: mode === 'upload-manifest' ? '' : requiredEnv('GOOGLE_DRIVE_IMAGE_FOLDER_ID'),
    bucket: requiredEnv('R2_PRODUCT_IMAGES_BUCKET'),
    publicBaseUrl,
    accessKeyId: needsR2Access ? requiredEnv('R2_ACCESS_KEY_ID') : '',
    secretAccessKey: needsR2Access ? requiredEnv('R2_SECRET_ACCESS_KEY') : '',
    endpoint,
    manifestPath: path.resolve(
      projectRoot,
      process.env.PRODUCT_IMAGE_MANIFEST_PATH ?? path.relative(projectRoot, defaultManifestPath),
    ),
  }
}

async function listProductFolders(drive: ReturnType<typeof google.drive>, parentFolderId: string) {
  const folders = await listDriveFiles<DriveFolder>(drive, {
    q: [
      `'${escapeDriveQueryValue(parentFolderId)}' in parents`,
      "mimeType = 'application/vnd.google-apps.folder'",
      'trashed = false',
    ].join(' and '),
    fields: 'nextPageToken, files(id, name)',
  })

  assertUniqueFolderNames(folders)

  return folders.sort((left, right) => left.name.localeCompare(right.name, undefined, { numeric: true }))
}

async function listImageFiles(drive: ReturnType<typeof google.drive>, parentFolderId: string) {
  const files = await listDriveFiles<DriveImageFile>(drive, {
    q: [
      `'${escapeDriveQueryValue(parentFolderId)}' in parents`,
      "mimeType != 'application/vnd.google-apps.folder'",
      'trashed = false',
    ].join(' and '),
    fields: 'nextPageToken, files(id, name, mimeType, md5Checksum, size)',
  })
  const imageFiles = files.filter((file) => supportedExtensions.has(path.extname(file.name).toLowerCase()))
  const ignoredFiles = files.filter((file) => !supportedExtensions.has(path.extname(file.name).toLowerCase()))

  if (ignoredFiles.length > 0) {
    console.warn(
      [
        `Ignoring unsupported product media file(s): ${ignoredFiles.map((file) => file.name).join(', ')}`,
        `Supported formats: ${supportedImageExtensions.join(', ')}`,
      ].join('\n'),
    )
  }

  return imageFiles.sort(sortImageFiles)
}

async function listDriveFiles<T>(
  drive: ReturnType<typeof google.drive>,
  params: { q: string; fields: string },
) {
  const files: T[] = []
  let pageToken: string | undefined

  do {
    const response = await drive.files.list({
      q: params.q,
      fields: params.fields,
      pageToken,
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })

    files.push(...((response.data.files ?? []) as T[]))
    pageToken = response.data.nextPageToken ?? undefined
  } while (pageToken)

  return files
}

async function resolveContentHash(drive: ReturnType<typeof google.drive>, file: DriveImageFile) {
  if (file.md5Checksum) return file.md5Checksum.slice(0, 12)

  const content = await downloadDriveFile(drive, file.id)
  return createHash('sha256').update(content).digest('hex').slice(0, 12)
}

async function downloadDriveFile(drive: ReturnType<typeof google.drive>, fileId: string) {
  const response = await drive.files.get(
    { fileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' },
  )

  if (response.data instanceof ArrayBuffer) {
    return Buffer.from(response.data)
  }

  return Buffer.from(response.data as ArrayBuffer)
}

function createVariantObjectKey(productId: string, hash: string, fileName: string, width: number) {
  const extension = path.extname(fileName)
  const baseName = sanitizeFileName(fileName.slice(0, -extension.length) || fileName)

  return `products/${productId}/${hash}-${baseName}-${width}w.webp`
}

function sanitizeFileName(fileName: string) {
  const extension = path.extname(fileName).toLowerCase()
  const baseName = path.basename(fileName, extension)
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase()

  if (!baseName) throw new Error(`Image filename "${fileName}" does not contain a safe basename`)

  return `${baseName}${extension}`
}

function sortImageFiles(left: DriveImageFile, right: DriveImageFile) {
  return imageSortRank(left.name) - imageSortRank(right.name)
    || left.name.localeCompare(right.name, undefined, { numeric: true })
}

function imageSortRank(fileName: string) {
  const prefix = fileName.match(/^(\d+)[\s._-]/)?.[1]
  if (prefix) return Number(prefix)

  const suffix = fileName.match(/_([A-Za-z])\.[^.]+$/)?.[1]?.toUpperCase()
  const order = ['F', 'C', 'L', 'R', 'B', 'S', 'W']
  const index = suffix ? order.indexOf(suffix) : -1
  return index === -1 ? 999 : index + 1
}

function assertStableProductId(productId: string) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(productId)) {
    throw new Error(`Google Drive product image folder "${productId}" must match a valid product_id`)
  }
}

function assertUniqueFolderNames(folders: DriveFolder[]) {
  const seen = new Set<string>()

  for (const folder of folders) {
    const normalizedName = folder.name.toLowerCase()
    if (seen.has(normalizedName)) {
      throw new Error(`Duplicate Google Drive product image folder "${folder.name}"`)
    }

    seen.add(normalizedName)
  }
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'")
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
