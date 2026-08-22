import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'

import { productCatalogSchema, type Product, type ProductAttribute } from '../src/data/product-schema'
import {
  readProductImageManifest,
  resolveProductImagesFromManifest,
  type ImageManifest,
} from './lib/product-image-manifest'
import { getGoogleServiceAccountCredentials, loadEnvFile, projectRoot } from './lib/runtime'
import { parseBoolean, pick, pickOptional, sheetRowsFromValues, splitList, type SheetRow } from './lib/sheet-rows'

type SlugManifest = Record<string, string>

type ProductSyncRecord = {
  productId: string
  slug: string
  title: string
  category: string
  description: string
  active: boolean
  variants: Array<{
    variantId: string
    productCode: string
    slug: string
    title: string
    color: string | null
    tag: string | null
    brand: string | null
    images: string[]
    mrpPaise: number
    sellingPricePaise: number
    sizeChart: Product['sizeChart']
    attributes: ProductAttribute[]
    minOrderQuantity: number
    fulfillmentBy: string | null
    shippingProvider: string | null
    package: Product['package']
    hsn: string | null
    taxCode: string | null
    active: boolean
    featured: boolean
    sizes: Array<{
      inventoryId: string
      sizeLabel: string
      stock: number
      active: boolean
    }>
  }>
}

const slugsPath = path.join(projectRoot, 'scripts/product-slugs.json')
const outputPath = path.join(projectRoot, 'src/generated/products.json')
const syncOutputPath = path.join(projectRoot, 'src/generated/products-sync.json')
const defaultRange = 'Products!A1:Z'
const requiredColumns = ['product_id', 'active', 'title', 'category', 'description', 'mrp', 'selling_price']
const internalColumns = new Set(
  [
    'product_id',
    'variant_id',
    'active',
    'title',
    'category',
    'description',
    'mrp',
    'selling_price',
    'images',
    'sizes',
    'stock',
    'size_chart',
    'featured',
    'sku',
    'product_code',
    'tag',
    'brand',
    'color',
    'hsn',
    'tax_code',
    'min_order_quantity',
    'length_cm',
    'breadth_cm',
    'height_cm',
    'weight_kg',
  ].map(normalizeHeaderKey),
)

let imageManifest: ImageManifest | undefined

async function main() {
  await loadEnvFile()
  imageManifest = await readImageManifest()

  const rows = await loadRows()
  assertUniqueIds(rows)
  const slugs = await readSlugManifest()
  const normalized = rows.map((row, index) => normalizeProduct(row, index + 2, slugs))
  const products = productCatalogSchema.parse(
    normalized
      .map(({ product }) => product)
      .filter((product): product is Product => Boolean(product)),
  )
  const syncRecords = createSyncRecords(
    normalized
      .map(({ product, syncVariant }) => (product && syncVariant ? { product, syncVariant } : null))
      .filter((entry): entry is { product: Product; syncVariant: ProductSyncRecord['variants'][number] } => Boolean(entry)),
  )

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(products, null, 2)}\n`)
  await writeFile(syncOutputPath, `${JSON.stringify(syncRecords, null, 2)}\n`)
  await writeFile(slugsPath, `${JSON.stringify(slugs, null, 2)}\n`)

  console.log(`Synced ${products.length} products to ${path.relative(projectRoot, outputPath)}`)
}

async function loadRows() {
  const localPath = process.env.PRODUCTS_CSV_PATH
  if (localPath) return sheetRowsFromValues(parseCsv(await readFile(localPath, 'utf8')), requiredColumns, localPath)

  const csvUrl = process.env.PRODUCTS_CSV_URL
  if (csvUrl) {
    const response = await fetch(csvUrl)
    if (!response.ok) throw new Error(`Unable to read PRODUCTS_CSV_URL: ${response.status} ${response.statusText}`)
    return sheetRowsFromValues(parseCsv(await response.text()), requiredColumns, 'PRODUCTS_CSV_URL')
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID
  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is required unless PRODUCTS_CSV_URL or PRODUCTS_CSV_PATH is set')
  }

  const auth = new google.auth.GoogleAuth({
    credentials: getGoogleServiceAccountCredentials(),
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  })
  const sheets = google.sheets({ version: 'v4', auth })
  const range = process.env.GOOGLE_SHEETS_RANGE || defaultRange
  const response = await sheets.spreadsheets.values.get({ spreadsheetId, range })
  return sheetRowsFromValues(response.data.values ?? [], requiredColumns, range)
}

async function readImageManifest() {
  const manifestPath = process.env.PRODUCT_IMAGE_MANIFEST_PATH
  if (!manifestPath) return undefined

  try {
    return await readProductImageManifest(path.resolve(projectRoot, manifestPath), projectRoot)
  } catch {
    return undefined
  }
}

function normalizeProduct(row: SheetRow, rowNumber: number, slugs: SlugManifest) {
  const productId = pick(row, ['product_id'], rowNumber)
  const variantId = pickOptional(row, ['variant_id']) || productId
  const productCode = pickOptional(row, ['sku', 'product_code']) || productId
  assertStableId(productId, 'product_id', rowNumber)
  assertStableId(variantId, 'variant_id', rowNumber)

  const active = parseBoolean(pick(row, ['active'], rowNumber))
  const title = pick(row, ['title'], rowNumber)
  const categoryLabel = pick(row, ['category'], rowNumber)
  const category = slugify(categoryLabel)
  const mrpPaise = parseMoneyToPaise(pick(row, ['mrp'], rowNumber), `MRP on row ${rowNumber}`)
  const sellingPricePaise = parseMoneyToPaise(pick(row, ['selling_price'], rowNumber), `selling price on row ${rowNumber}`)
  if (sellingPricePaise > mrpPaise) throw new Error(`selling_price cannot exceed mrp on row ${rowNumber}`)

  const slugKey = `${productId}:${variantId}`
  if (!slugs[slugKey]) slugs[slugKey] = createProductSlug(title, variantId)
  const slug = slugs[slugKey]
  if (!slug) throw new Error(`Unable to create slug for ${variantId}`)

  const imageValue = pickOptional(row, ['images', 'main_image_url']) ?? ''
  const resolvedImages = imageManifest
    ? resolveProductImagesFromManifest({ active, imageManifest, productId: variantId, rowNumber, value: imageValue })
    : []
  const fallbackImages = splitList(imageValue).map(toDisplayImageUrl)
  const images = resolvedImages.length > 0 ? resolvedImages.map((image) => image.publicUrl) : fallbackImages

  if (active && images.length === 0) {
    throw new Error(`Active product ${productId} on row ${rowNumber} must have at least one image`)
  }

  const sizes = createSizes(variantId, row, rowNumber)
  const attributes = createProductAttributes(row)
  const description = pick(row, ['description'], rowNumber)
  const featured = parseBoolean(pickOptional(row, ['featured', 'tag']) ?? '')

  const product: Product | undefined = active
    ? {
        productId,
        variantId,
        productCode,
        slug,
        title,
        images,
        imageStoragePaths: resolvedImages.map((image) => image.storagePath),
        imageVariants: resolvedImages.map((image) => image.variants),
        mrpPaise,
        sellingPricePaise,
        discountPercent: deriveDiscountPercent(mrpPaise, sellingPricePaise),
        sizes,
        stockAvailable: sizes.reduce((total, size) => total + size.stockAvailable, 0),
        description,
        sizeChart: parseSizeChart(pickOptional(row, ['size_chart'])),
        category,
        categoryLabel,
        imageAlt: title,
        tag: normalizeOptional(pickOptional(row, ['tag'])),
        brand: normalizeOptional(pickOptional(row, ['brand'])) ?? 'Kashmiri Jewels',
        color: normalizeOptional(pickOptional(row, ['color'])),
        minOrderQuantity: parseOptionalInteger(pickOptional(row, ['min_order_quantity']), 1, `min_order_quantity on row ${rowNumber}`),
        attributes,
        fulfillmentBy: undefined,
        shippingProvider: undefined,
        package: {
          lengthCm: parseOptionalNumber(pickOptional(row, ['length_cm']), `length_cm on row ${rowNumber}`),
          breadthCm: parseOptionalNumber(pickOptional(row, ['breadth_cm']), `breadth_cm on row ${rowNumber}`),
          heightCm: parseOptionalNumber(pickOptional(row, ['height_cm']), `height_cm on row ${rowNumber}`),
          weightKg: parseOptionalNumber(pickOptional(row, ['weight_kg']), `weight_kg on row ${rowNumber}`),
        },
        hsn: normalizeOptional(pickOptional(row, ['hsn'])),
        taxCode: normalizeOptional(pickOptional(row, ['tax_code'])),
        featured,
        active,
      }
    : undefined

  const syncVariant: ProductSyncRecord['variants'][number] | undefined = product
    ? {
        variantId,
        productCode,
        slug,
        title,
        color: product.color ?? null,
        tag: product.tag ?? null,
        brand: product.brand ?? null,
        images,
        mrpPaise,
        sellingPricePaise,
        sizeChart: product.sizeChart,
        attributes,
        minOrderQuantity: product.minOrderQuantity,
        fulfillmentBy: null,
        shippingProvider: null,
        package: product.package,
        hsn: product.hsn ?? null,
        taxCode: product.taxCode ?? null,
        active,
        featured,
        sizes: sizes.map((size) => ({
          inventoryId: size.inventoryId,
          sizeLabel: size.label,
          stock: size.stockAvailable,
          active: size.active,
        })),
      }
    : undefined

  return { product, syncVariant }
}

function createSizes(variantId: string, row: SheetRow, rowNumber: number): Product['sizes'] {
  const sizes = splitList(pickOptional(row, ['sizes']) || 'One Size')
  const stock = parseStock(pickOptional(row, ['stock']) || '1', sizes, rowNumber)

  return sizes.map((label) => ({
    inventoryId: createInventoryId(variantId, label),
    label,
    stockAvailable: stock.get(label) ?? 0,
    active: true,
  }))
}

function parseStock(value: string, sizes: string[], rowNumber: number) {
  const result = new Map<string, number>()
  const parts = splitList(value)

  if (parts.length === 1 && !parts[0]?.includes(':')) {
    const quantity = parseInteger(parts[0] || '0', `stock on row ${rowNumber}`)
    sizes.forEach((size) => result.set(size, quantity))
    return result
  }

  parts.forEach((part, index) => {
    const [label, quantity] = part.includes(':') ? part.split(':') : [sizes[index], part]
    if (!label) return
    result.set(label.trim(), parseInteger(quantity ?? '0', `stock on row ${rowNumber}`))
  })

  sizes.forEach((size) => {
    if (!result.has(size)) result.set(size, 0)
  })

  return result
}

function parseSizeChart(value: string | undefined): Product['sizeChart'] {
  const normalized = normalizeOptional(value)
  if (!normalized) return []

  return normalized.split(';').flatMap((row) => {
    const [size, measurementsValue] = row.split(':')
    if (!size || !measurementsValue) return []

    const measurements = Object.fromEntries(
      measurementsValue
        .split(',')
        .map((measurement) => measurement.trim())
        .filter(Boolean)
        .flatMap((measurement) => {
          const [label, value] = measurement.split('=')
          return label && value ? [[label.trim(), value.trim()]] : []
        }),
    )

    return Object.keys(measurements).length > 0 ? [{ size: size.trim(), measurements }] : []
  })
}

function createProductAttributes(row: SheetRow): ProductAttribute[] {
  return Object.entries(row)
    .filter(([key]) => !internalColumns.has(key))
    .flatMap(([key, value]) => {
      const normalized = normalizeOptional(value)
      return normalized
        ? [{
            label: humanizeHeaderKey(key),
            section: 'details' as const,
            value: normalized,
          }]
        : []
    })
}

function createSyncRecords(entries: Array<{ product: Product; syncVariant: ProductSyncRecord['variants'][number] }>) {
  const recordsByProductId = new Map<string, ProductSyncRecord>()

  for (const { product, syncVariant } of entries) {
    const existing = recordsByProductId.get(product.productId)
    if (existing) {
      existing.variants.push(syncVariant)
      continue
    }

    recordsByProductId.set(product.productId, {
      productId: product.productId,
      slug: createProductSlug(product.productId, product.productId),
      title: product.title,
      category: product.category,
      description: product.description,
      active: true,
      variants: [syncVariant],
    })
  }

  return Array.from(recordsByProductId.values())
}

function parseCsv(content: string) {
  const rows: string[][] = []
  let field = ''
  let row: string[] = []
  let inQuotes = false

  for (let index = 0; index < content.length; index += 1) {
    const character = content[index]
    const nextCharacter = content[index + 1]

    if (character === '"' && inQuotes && nextCharacter === '"') {
      field += '"'
      index += 1
      continue
    }

    if (character === '"') {
      inQuotes = !inQuotes
      continue
    }

    if (character === ',' && !inQuotes) {
      row.push(field)
      field = ''
      continue
    }

    if ((character === '\n' || character === '\r') && !inQuotes) {
      if (character === '\r' && nextCharacter === '\n') index += 1
      row.push(field)
      rows.push(row)
      field = ''
      row = []
      continue
    }

    field += character
  }

  if (field || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows
}

async function readSlugManifest(): Promise<SlugManifest> {
  try {
    return JSON.parse(await readFile(slugsPath, 'utf8')) as SlugManifest
  } catch {
    return {}
  }
}

function assertUniqueIds(rows: SheetRow[]) {
  const seen = new Set<string>()

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const productId = pick(row, ['product_id'], rowNumber)
    const variantId = pickOptional(row, ['variant_id']) || productId
    const key = variantId.toLowerCase()
    if (seen.has(key)) throw new Error(`Duplicate product/variant ID "${variantId}" on row ${rowNumber}`)
    seen.add(key)
  })
}

function toDisplayImageUrl(value: string) {
  const fileId = value.match(/\/file\/d\/([^/?#]+)/)?.[1] ?? value.match(/[?&]id=([^&#]+)/)?.[1]
  return fileId ? `https://drive.google.com/uc?export=view&id=${decodeURIComponent(fileId)}` : value
}

function parseMoneyToPaise(value: string, context: string) {
  const rupees = Number(value.replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(rupees) || rupees <= 0) {
    throw new Error(`Expected a positive amount for ${context}, received "${value}"`)
  }

  return Math.round(rupees * 100)
}

function parseInteger(value: string, context: string) {
  const parsed = Number(value.replace(/[^\d-]/g, ''))
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Expected a non-negative integer for ${context}, received "${value}"`)
  }

  return parsed
}

function parseOptionalInteger(value: string | undefined, fallback: number, context: string) {
  const normalized = normalizeOptional(value)
  return normalized ? parseInteger(normalized, context) : fallback
}

function parseOptionalNumber(value: string | undefined, context: string) {
  const normalized = normalizeOptional(value)
  if (!normalized) return null

  const parsed = Number(normalized.replace(/[^\d.-]/g, ''))
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive number for ${context}, received "${value}"`)
  }

  return parsed
}

function normalizeOptional(value: string | undefined) {
  const normalized = String(value ?? '').trim()
  if (!normalized || /^na$/i.test(normalized)) return undefined
  return normalized
}

function normalizeHeaderKey(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}

function humanizeHeaderKey(value: string) {
  return value
    .split('_')
    .filter(Boolean)
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join(' ')
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}

function createProductSlug(title: string, id: string) {
  return `${slugify(title)}-${shortDeterministicSuffix(id)}`
}

function shortDeterministicSuffix(value: string) {
  let hash = 0

  for (const character of value) {
    hash = (hash * 31 + character.charCodeAt(0)) >>> 0
  }

  return hash.toString(36).slice(0, 4).padStart(4, '0')
}

function createInventoryId(variantId: string, size: string) {
  return `${variantId}:${size.trim().toLowerCase()}`
}

function assertStableId(value: string, label: string, rowNumber: number) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${label} on row ${rowNumber} must use letters, numbers, hyphens, or underscores`)
  }
}

function deriveDiscountPercent(mrpPaise: number, sellingPricePaise: number) {
  return Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
