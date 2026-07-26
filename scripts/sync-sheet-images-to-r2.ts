import { createHash } from 'node:crypto'
import { writeFile } from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'

import { mapWithConcurrency } from './lib/concurrency'
import { getGoogleServiceAccountCredentials, loadEnvFile, projectRoot, requiredEnv } from './lib/runtime'
import { parseBoolean, pick, pickOptional, sheetRowsFromValues, type SheetRow, splitList } from './lib/sheet-rows'

type DriveImageFile = {
  id: string
  name: string
  mimeType: string
  md5Checksum?: string
  size?: string
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

const defaultManifestPath = path.join(projectRoot, 'src/generated/product-image-manifest.json')
const defaultDetailRanges = [
  "'Product Details - Kurti'!A1:BN",
  "'Product Details - Coord set'!A1:BN",
]
const detailRequiredColumns = [
  'Variant ID',
  'Listing Status',
  'Main Image URL',
]
const supportedImageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.avif']
const supportedExtensions = new Set(supportedImageExtensions)
const driveFileConcurrency = 8
const imageVariantWidths = [400, 800, 1200]
const imageVariantContentType = 'image/webp'
const defaultImageVariantWidth = 800

async function main() {
  await loadEnvFile()

  const config = readConfig()
  const drive = google.drive({
    version: 'v3',
    auth: new google.auth.GoogleAuth({
      credentials: getGoogleServiceAccountCredentials(),
      scopes: ['https://www.googleapis.com/auth/drive.readonly'],
    }),
  })
  const detailRows = await readGoogleSheetRows(config.spreadsheetId)
  const imageRequests = collectSheetImageRequests(detailRows)
  const entries = await mapWithConcurrency(imageRequests, driveFileConcurrency, async (request) => {
    const file = await readDriveImageFile(drive, request.fileId, request.rowNumber)
    const contentHash = await resolveContentHash(drive, file)
    const variants = createImageVariants(config.publicBaseUrl, request.variantId, contentHash, file.name)
    const defaultVariant = pickDefaultVariant(variants)

    return {
      variantId: request.variantId,
      order: request.order,
      image: {
        storagePath: defaultVariant.storagePath,
        publicUrl: defaultVariant.publicUrl,
        sourceFileId: file.id,
        sourceFileName: file.name,
        contentHash,
        contentType: defaultVariant.contentType,
        sizeBytes: file.size ? Number(file.size) : null,
        variants,
      },
    }
  })
  const manifest: ProductImageManifest = {
    generatedAt: new Date().toISOString(),
    bucket: config.bucket,
    publicBaseUrl: config.publicBaseUrl,
    products: {},
    summary: {
      productFolders: 0,
      imagesDiscovered: entries.length,
      imagesUploaded: 0,
      imagesSkipped: 0,
    },
  }

  for (const entry of entries.sort((left, right) => left.order - right.order)) {
    manifest.products[entry.variantId] ??= []
    manifest.products[entry.variantId]?.push(entry.image)
  }

  await writeFile(config.manifestPath, `${JSON.stringify(manifest, null, 2)}\n`)

  console.log(
    [
      `Discovered ${manifest.summary.imagesDiscovered} product images from sheet Drive links`,
      'Deferred R2 upload until after product data validation',
      `Wrote ${path.relative(projectRoot, config.manifestPath)}`,
    ].join('\n'),
  )
}

function readConfig() {
  return {
    spreadsheetId: requiredEnv('GOOGLE_SHEETS_SPREADSHEET_ID'),
    bucket: requiredEnv('R2_PRODUCT_IMAGES_BUCKET'),
    publicBaseUrl: requiredEnv('PRODUCT_IMAGE_PUBLIC_BASE_URL').replace(/\/+$/, ''),
    manifestPath: path.resolve(
      projectRoot,
      process.env.PRODUCT_IMAGE_MANIFEST_PATH ?? path.relative(projectRoot, defaultManifestPath),
    ),
  }
}

async function readGoogleSheetRows(spreadsheetId: string) {
  const auth = new google.auth.GoogleAuth({
    credentials: getGoogleServiceAccountCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const detailRanges = (process.env.GOOGLE_SHEETS_PRODUCT_DETAIL_RANGES ?? defaultDetailRanges.join('|'))
    .split('|')
    .map((range) => range.trim())
    .filter(Boolean)
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: detailRanges,
  })
  const valueRanges = response.data.valueRanges ?? []

  return detailRanges.flatMap((range, index) => {
    const values = valueRanges[index]?.values ?? []
    return productDetailRowsFromValues(values, range)
  })
}

function productDetailRowsFromValues(values: unknown[][], range: string) {
  if (values.length < 3) {
    throw new Error(`No product detail rows found in range ${range}`)
  }

  return sheetRowsFromValues(values.slice(1), detailRequiredColumns, range)
}

function collectSheetImageRequests(rows: SheetRow[]) {
  const requests: Array<{ variantId: string; fileId: string; rowNumber: number; order: number }> = []
  let order = 0

  rows.forEach((row, index) => {
    const rowNumber = index + 3
    const variantId = pick(row, ['Variant ID'], rowNumber)
    const active = parseBoolean(pick(row, ['Listing Status'], rowNumber))
    const imageLinks = collectImageLinks(row)

    if (active && imageLinks.length === 0) {
      throw new Error(`Active variant ${variantId} on row ${rowNumber} must have at least one image link`)
    }

    for (const imageLink of imageLinks) {
      requests.push({
        variantId,
        fileId: extractGoogleDriveFileId(imageLink, rowNumber),
        rowNumber,
        order,
      })
      order += 1
    }
  })

  return requests
}

function collectImageLinks(row: SheetRow) {
  return [
    pickOptional(row, ['Main Image URL']),
    pickOptional(row, ['Other Image URL 1']),
    pickOptional(row, ['Other Image URL 2']),
    pickOptional(row, ['Other Image URL 3']),
    pickOptional(row, ['Other Image URL 4']),
    pickOptional(row, ['Other Image URL 5']),
    pickOptional(row, ['Main Palette Image URL']),
  ].flatMap((value) => (value ? splitList(value) : []))
}

async function readDriveImageFile(
  drive: ReturnType<typeof google.drive>,
  fileId: string,
  rowNumber: number,
) {
  const response = await drive.files.get({
    fileId,
    fields: 'id, name, mimeType, md5Checksum, size',
    supportsAllDrives: true,
  })
  const file = response.data as DriveImageFile

  if (!file.id || !file.name) {
    throw new Error(`Image link on row ${rowNumber} did not resolve to a readable Drive file`)
  }

  const extension = path.extname(file.name).toLowerCase()
  if (!supportedExtensions.has(extension)) {
    throw new Error(
      `Image file "${file.name}" on row ${rowNumber} is not supported. Supported formats: ${supportedImageExtensions.join(', ')}`,
    )
  }

  return file
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

function createImageVariants(
  publicBaseUrl: string,
  variantId: string,
  contentHash: string,
  sourceFileName: string,
) {
  return imageVariantWidths.map((width) => {
    const storagePath = createVariantObjectKey(variantId, contentHash, sourceFileName, width)

    return {
      width,
      storagePath,
      publicUrl: `${publicBaseUrl}/${storagePath}`,
      contentType: imageVariantContentType,
    }
  })
}

function pickDefaultVariant(variants: ProductImageVariant[]) {
  return variants.find((variant) => variant.width === defaultImageVariantWidth) ?? variants[0]
}

function createVariantObjectKey(variantId: string, hash: string, fileName: string, width: number) {
  const extension = path.extname(fileName)
  const baseName = sanitizeFileName(fileName.slice(0, -extension.length) || fileName)

  return `products/${variantId}/${hash}-${baseName}-${width}w.webp`
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

function extractGoogleDriveFileId(value: string, rowNumber: number) {
  const fileId = value.match(/\/file\/d\/([^/?#]+)/)?.[1]
    ?? value.match(/[?&]id=([^&#]+)/)?.[1]

  if (fileId) return decodeURIComponent(fileId)

  if (value.includes('/folders/')) {
    throw new Error(`Image link on row ${rowNumber} points to a Drive folder; use a Drive file share link`)
  }

  throw new Error(`Image link on row ${rowNumber} is not a supported Google Drive file link: ${value}`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
