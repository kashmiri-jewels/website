import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

import { google } from 'googleapis'

import {
  productCatalogSchema,
  type Product,
  type ProductAttribute,
} from '../src/data/product-schema'
import {
  readProductImageManifest,
  resolveProductImagesFromManifest,
  type ImageManifest,
  type ResolvedProductImage,
} from './lib/product-image-manifest'
import { getGoogleServiceAccountCredentials, loadEnvFile, projectRoot } from './lib/runtime'
import {
  parseBoolean,
  pick,
  pickOptional,
  sheetRowsFromValues,
  type SheetRow,
} from './lib/sheet-rows'

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

type StockRecord = {
  title: string
  sizes: Map<string, number>
}

const slugsPath = path.join(projectRoot, 'scripts/product-slugs.json')
const outputPath = path.join(projectRoot, 'src/generated/products.json')
const syncOutputPath = path.join(projectRoot, 'src/generated/products-sync.json')

const defaultDetailRanges = [
  "'Product Details - Kurti'!A1:BN",
  "'Product Details - Coord set'!A1:BN",
]
const defaultStockRange = "'Stock Sheet'!A1:Q"
const stockSizeColumns = ['XXS', 'XS', 'S', 'M', 'L', 'XL', '2XL', '3XL', '4XL', '5XL']
const detailRequiredColumns = [
  'Seller SKU ID',
  'Group ID',
  'Variant ID',
  'Listing Status',
  'MRP (INR)',
  'Your selling price (INR)',
  'Minimum Order Quantity (MinOQ)',
  'Brand',
  'Product Code',
  'Product Type',
  'Main Image URL',
]
const stockRequiredColumns = ['Variant ID', ...stockSizeColumns]
const internalAttributeColumns = new Set([
  'S.no',
  'Seller SKU ID',
  'Group ID',
  'Variant ID',
  'Listing Status',
  'MRP (INR)',
  'Your selling price (INR)',
  'Tag',
  'Fullfilment by (Seller)',
  'Stock',
  'Shipping provider',
  'Length (CM)',
  'Breadth (CM)',
  'Height (CM)',
  'Weight (KG)',
  'HSN',
  'Tax Code',
  'Minimum Order Quantity (MinOQ)',
  'Main Image URL',
  'Other Image URL 1',
  'Other Image URL 2',
  'Other Image URL 3',
  'Other Image URL 4',
  'Other Image URL 5',
  'Main Palette Image URL',
].map(normalizeHeaderKey))
const disclosureAttributeColumns = new Set([
  'Product Code',
  'Product Type',
  'MRP (Inclusive of all taxes)',
  'Net Quantity',
  'Month and Year of Manufacture',
  'Country Of Origin',
  'Packed By',
  'Marketed By',
  'Customer Care details',
].map(normalizeHeaderKey))

let productImageManifestPath: string | undefined
let imageManifest: ImageManifest | undefined

async function main() {
  await loadEnvFile()
  loadRuntimeConfig()
  imageManifest = await readImageManifest()

  const { detailRows, stockByVariantId } = await loadRows()
  assertUniqueVariantIds(detailRows)
  const slugs = await readSlugManifest()
  const normalized = await Promise.all(
    detailRows.map((row, index) => normalizeVariantProduct(row, index + 3, stockByVariantId, slugs)),
  )
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

  console.log(`Synced ${products.length} product variants to ${path.relative(projectRoot, outputPath)}`)
}

function loadRuntimeConfig() {
  productImageManifestPath = process.env.PRODUCT_IMAGE_MANIFEST_PATH
}

async function readImageManifest() {
  if (!productImageManifestPath) return undefined

  const manifestPath = path.resolve(projectRoot, productImageManifestPath)
  return readProductImageManifest(manifestPath, projectRoot)
}

async function loadRows() {
  const localDetailPaths = process.env.PRODUCT_DETAIL_CSV_PATHS
  const localStockPath = process.env.STOCK_CSV_PATH

  if (localDetailPaths && localStockPath) {
    return readLocalCsvRows(localDetailPaths, localStockPath)
  }

  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID

  if (!spreadsheetId) {
    throw new Error('GOOGLE_SHEETS_SPREADSHEET_ID is required unless PRODUCT_DETAIL_CSV_PATHS and STOCK_CSV_PATH are set')
  }

  return readGoogleSheetRows(spreadsheetId)
}

async function readLocalCsvRows(detailPathsValue: string, stockPathValue: string) {
  const detailPaths = detailPathsValue
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
  const detailValues = await Promise.all(
    detailPaths.map(async (csvPath) => parseCsv(await readFile(csvPath, 'utf8'))),
  )
  const stockValues = parseCsv(await readFile(stockPathValue, 'utf8'))

  return {
    detailRows: detailValues.flatMap((values, index) =>
      productDetailRowsFromValues(values, detailPaths[index] ?? `detail CSV ${index + 1}`),
    ),
    stockByVariantId: stockRowsFromValues(stockValues, stockPathValue),
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
  const stockRange = process.env.GOOGLE_SHEETS_STOCK_RANGE ?? defaultStockRange
  const response = await sheets.spreadsheets.values.batchGet({
    spreadsheetId,
    ranges: [...detailRanges, stockRange],
  })
  const valueRanges = response.data.valueRanges ?? []
  const detailRows = detailRanges.flatMap((range, index) => {
    const values = valueRanges[index]?.values ?? []
    return productDetailRowsFromValues(values, range)
  })
  const stockValues = valueRanges[detailRanges.length]?.values ?? []

  return {
    detailRows,
    stockByVariantId: stockRowsFromValues(stockValues, stockRange),
  }
}

function productDetailRowsFromValues(values: unknown[][], range: string) {
  if (values.length < 3) {
    throw new Error(`No product detail rows found in range ${range}`)
  }

  return sheetRowsFromValues(values.slice(1), detailRequiredColumns, range)
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

function stockRowsFromValues(values: unknown[][], range: string) {
  const rows = sheetRowsFromValues(values, stockRequiredColumns, range)
  const stockByVariantId = new Map<string, StockRecord>()

  rows.forEach((row, index) => {
    const rowNumber = index + 2
    const variantId = pickOptional(row, ['Variant ID'])
    if (!variantId) return

    if (stockByVariantId.has(variantId)) {
      throw new Error(`Duplicate Variant ID "${variantId}" in stock sheet`)
    }

    const sizes = new Map<string, number>()
    for (const size of stockSizeColumns) {
      const rawValue = pickOptional(row, [size])
      if (!rawValue) continue

      sizes.set(size, parseInteger(rawValue, `${size} stock on row ${rowNumber}`))
    }

    stockByVariantId.set(variantId, {
      title: pickOptional(row, ['Title']) ?? '',
      sizes,
    })
  })

  return stockByVariantId
}

async function readSlugManifest(): Promise<SlugManifest> {
  try {
    return JSON.parse(await readFile(slugsPath, 'utf8')) as SlugManifest
  } catch {
    return {}
  }
}

async function normalizeVariantProduct(
  row: SheetRow,
  rowNumber: number,
  stockByVariantId: Map<string, StockRecord>,
  slugs: SlugManifest,
) {
  const productId = pick(row, ['Seller SKU ID'], rowNumber)
  const variantId = pick(row, ['Variant ID'], rowNumber)
  const productCode = pick(row, ['Product Code'], rowNumber)
  assertStableId(productId, 'Seller SKU ID', rowNumber)
  assertStableId(variantId, 'Variant ID', rowNumber)
  assertStableId(productCode, 'Product Code', rowNumber)

  const active = parseBoolean(pick(row, ['Listing Status'], rowNumber))
  const stock = stockByVariantId.get(variantId)
  if (!stock) throw new Error(`Missing stock sheet row for Variant ID "${variantId}"`)

  const categoryLabel = pick(row, ['Group ID'], rowNumber)
  const category = slugify(categoryLabel)
  const title = createDisplayTitle(stock.title || productCode, row)
  const mrpPaise = parseMoneyToPaise(pick(row, ['MRP (INR)', 'MRP'], rowNumber), `MRP on row ${rowNumber}`)
  const sellingPricePaise = parseMoneyToPaise(
    pick(row, ['Your selling price (INR)', 'selling_price'], rowNumber),
    `selling price on row ${rowNumber}`,
  )
  if (sellingPricePaise > mrpPaise) {
    throw new Error(`selling price cannot exceed MRP on row ${rowNumber}`)
  }

  const slugKey = `${productId}:${variantId}`
  if (!slugs[slugKey]) slugs[slugKey] = createProductSlug(title, variantId)
  const slug = slugs[slugKey]
  if (!slug) throw new Error(`Unable to create slug for ${variantId}`)

  const resolvedImages = await resolveProductImages(
    variantId,
    collectImageUrls(row).join('|'),
    rowNumber,
    active,
  )
  const imageStoragePaths = resolvedImages.map((image) => image.storagePath)
  const publicImages = resolvedImages.map((image) => image.publicUrl)
  const imageVariants = resolvedImages.map((image) => image.variants)
  const fallbackImages = collectImageUrls(row)
  const images = publicImages.length > 0 ? publicImages : fallbackImages

  if (active && images.length === 0) {
    throw new Error(`Active variant ${variantId} on row ${rowNumber} must have at least one image`)
  }

  for (const { storagePath: imagePath } of resolvedImages) assertSafeStoragePath(imagePath, rowNumber)

  const sizes = Array.from(stock.sizes.entries()).map(([label, quantity]) => ({
    inventoryId: createInventoryId(variantId, label),
    label,
    stockAvailable: quantity,
    active: true,
  }))
  if (sizes.length === 0) {
    throw new Error(`Variant ${variantId} has no size stock in the stock sheet`)
  }

  const attributes = createProductAttributes(row)
  const description = createDescription(row, attributes)
  const minOrderQuantity = parseInteger(
    pick(row, ['Minimum Order Quantity (MinOQ)'], rowNumber),
    `minimum order quantity on row ${rowNumber}`,
  )
  if (minOrderQuantity < 1) {
    throw new Error(`Minimum Order Quantity must be at least 1 on row ${rowNumber}`)
  }

  const product: Product | undefined = active
    ? {
        productId,
        variantId,
        productCode,
        slug,
        title,
        images,
        imageStoragePaths,
        imageVariants,
        mrpPaise,
        sellingPricePaise,
        discountPercent: deriveDiscountPercent(mrpPaise, sellingPricePaise),
        sizes,
        stockAvailable: sizes.reduce((total, size) => total + size.stockAvailable, 0),
        description,
        sizeChart: [],
        category,
        categoryLabel,
        imageAlt: title,
        tag: normalizeOptional(pickOptional(row, ['Tag'])),
        brand: normalizeOptional(pickOptional(row, ['Brand'])),
        color: normalizeOptional(pickOptional(row, ['Color'])),
        minOrderQuantity,
        attributes,
        fulfillmentBy: normalizeOptional(pickOptional(row, ['Fullfilment by (Seller)'])),
        shippingProvider: normalizeOptional(pickOptional(row, ['Shipping provider'])),
        package: {
          lengthCm: parseOptionalNumber(pickOptional(row, ['Length (CM)']), `Length (CM) on row ${rowNumber}`),
          breadthCm: parseOptionalNumber(pickOptional(row, ['Breadth (CM)']), `Breadth (CM) on row ${rowNumber}`),
          heightCm: parseOptionalNumber(pickOptional(row, ['Height (CM)']), `Height (CM) on row ${rowNumber}`),
          weightKg: parseOptionalNumber(pickOptional(row, ['Weight (KG)']), `Weight (KG) on row ${rowNumber}`),
        },
        hsn: normalizeOptional(pickOptional(row, ['HSN'])),
        taxCode: normalizeOptional(pickOptional(row, ['Tax Code'])),
        featured: isFeaturedTag(pickOptional(row, ['Tag']) ?? ''),
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
        minOrderQuantity,
        fulfillmentBy: product.fulfillmentBy ?? null,
        shippingProvider: product.shippingProvider ?? null,
        package: product.package,
        hsn: product.hsn ?? null,
        taxCode: product.taxCode ?? null,
        active,
        featured: product.featured,
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

async function resolveProductImages(
  variantId: string,
  value: string,
  rowNumber: number,
  active: boolean,
): Promise<ResolvedProductImage[]> {
  if (!imageManifest) return []

  return resolveProductImagesFromManifest({
    active,
    imageManifest,
    productId: variantId,
    rowNumber,
    value,
  })
}

function collectImageUrls(row: SheetRow) {
  return [
    pickOptional(row, ['Main Image URL']),
    pickOptional(row, ['Other Image URL 1']),
    pickOptional(row, ['Other Image URL 2']),
    pickOptional(row, ['Other Image URL 3']),
    pickOptional(row, ['Other Image URL 4']),
    pickOptional(row, ['Other Image URL 5']),
    pickOptional(row, ['Main Palette Image URL']),
  ].flatMap((value) => {
    const normalized = normalizeOptional(value)
    return normalized ? [toDisplayImageUrl(normalized)] : []
  })
}

function toDisplayImageUrl(value: string) {
  const match = value.match(/\/file\/d\/([^/]+)/)
  if (!match) return value

  return `https://drive.google.com/uc?export=view&id=${match[1]}`
}

function createProductAttributes(row: SheetRow): ProductAttribute[] {
  return Object.entries(row)
    .filter(([key]) => !internalAttributeColumns.has(key))
    .flatMap(([key, value]) => {
      const normalized = normalizeOptional(value)
      return normalized
        ? [{
            label: humanizeHeaderKey(key),
            section: disclosureAttributeColumns.has(key) ? 'disclosure' : 'details',
            value: normalized,
          }]
        : []
    })
}

function createDescription(row: SheetRow, attributes: ProductAttribute[]) {
  const productDetails = normalizeOptional(
    pickOptional(row, ['Product details', 'Product Details', 'Product Description', 'Description']),
  )
  if (productDetails) return productDetails

  const disclaimer = normalizeOptional(pickOptional(row, ['Disclaimer']))
  if (disclaimer) return disclaimer

  const summaryAttributes = attributes
    .filter((attribute) => ['Product Material', 'Color', 'Fit', 'Pattern', 'Product Type'].includes(attribute.label))
    .map((attribute) => `${attribute.label}: ${attribute.value}`)

  return summaryAttributes.length > 0 ? summaryAttributes.join('\n') : pick(row, ['Product Code'], 0)
}

function assertUniqueVariantIds(rows: SheetRow[]) {
  const seen = new Map<string, number>()

  rows.forEach((row, index) => {
    const rowNumber = index + 3
    const variantId = pick(row, ['Variant ID'], rowNumber)
    const normalizedVariantId = variantId.toLowerCase()
    const existingRowNumber = seen.get(normalizedVariantId)

    if (existingRowNumber !== undefined) {
      throw new Error(`Duplicate Variant ID "${variantId}" on detail rows ${existingRowNumber} and ${rowNumber}`)
    }

    seen.set(normalizedVariantId, rowNumber)
  })
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
    .map((part) => {
      if (/^(cod|hsn|mrp)$/i.test(part)) return part.toUpperCase()
      return `${part.charAt(0).toUpperCase()}${part.slice(1)}`
    })
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
  const suffix = shortDeterministicSuffix(id)
  return `${slugify(title)}-${suffix}`
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

function createDisplayTitle(title: string, row: SheetRow) {
  const color = normalizeOptional(pickOptional(row, ['Color']))
  const productType = normalizeOptional(pickOptional(row, ['Product Type']))
  const cleanTitle = title
    .replace(/^women'?s?\s+/i, '')
    .replace(/\s+for women$/i, '')
    .replace(/\s+/g, ' ')
    .trim()

  if (cleanTitle && cleanTitle !== pickOptional(row, ['Product Code'])) return cleanTitle
  return [color, productType].filter(Boolean).join(' ') || cleanTitle
}

function isFeaturedTag(tag: string) {
  return /featured|most wanted|new arrivals?/i.test(tag)
}

function assertStableId(value: string, label: string, rowNumber: number) {
  if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(value)) {
    throw new Error(`${label} on row ${rowNumber} must use letters, numbers, hyphens, or underscores`)
  }
}

function assertSafeStoragePath(imagePath: string, rowNumber: number) {
  if (path.isAbsolute(imagePath) || imagePath.startsWith('/') || imagePath.includes('..')) {
    throw new Error(`images on row ${rowNumber} must be relative storage paths`)
  }
}

function deriveDiscountPercent(mrpPaise: number, sellingPricePaise: number) {
  return Math.round(((mrpPaise - sellingPricePaise) / mrpPaise) * 100)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
