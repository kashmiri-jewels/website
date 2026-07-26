import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { loadEnvFile, projectRoot, requiredEnv } from './lib/runtime'

type GeneratedProduct = {
  productId?: string
  variantId?: string
  images?: unknown
  imageStoragePaths?: unknown
  imageVariants?: unknown
}

type ProductSyncRecord = {
  productId?: string
  variants?: unknown
}

const productsPath = path.join(projectRoot, 'src/generated/products.json')
const productsSyncPath = path.join(projectRoot, 'src/generated/products-sync.json')
const expectedImageVariantWidths = [400, 800, 1200]

async function main() {
  await loadEnvFile()

  const publicBaseUrl = requiredEnv('PRODUCT_IMAGE_PUBLIC_BASE_URL').replace(/\/+$/, '')
  const products = JSON.parse(await readFile(productsPath, 'utf8')) as GeneratedProduct[]
  const syncRecords = JSON.parse(await readFile(productsSyncPath, 'utf8')) as ProductSyncRecord[]

  if (!Array.isArray(products) || products.length === 0) {
    throw new Error('Generated storefront catalog is empty. Run the catalog publish workflow first.')
  }
  if (!Array.isArray(syncRecords) || syncRecords.length === 0) {
    throw new Error('Generated Supabase catalog sync payload is empty. Run the catalog publish workflow first.')
  }

  validateProducts(products, publicBaseUrl)
  validateSyncRecords(syncRecords, publicBaseUrl)

  console.log(`Validated generated catalog image URLs against ${publicBaseUrl}`)
}

function validateProducts(products: GeneratedProduct[], publicBaseUrl: string) {
  for (const product of products) {
    const productId = readProductId(product.productId)
    const variantId = readProductId(product.variantId)
    const images = readStringArray(product.images, `${productId}.images`)
    const storagePaths = readStringArray(product.imageStoragePaths, `${productId}.imageStoragePaths`)
    const imageVariants = readImageVariants(product.imageVariants, `${productId}.imageVariants`)

    if (images.length === 0) {
      throw new Error(`${productId} must have at least one generated product image URL`)
    }

    if (storagePaths.length !== images.length) {
      throw new Error(`${productId}.imageStoragePaths must have one storage path per product image`)
    }

    if (imageVariants.length !== images.length) {
      throw new Error(`${productId}.imageVariants must have one variant list per product image`)
    }

    for (const image of images) {
      assertPublicImageUrl(image, publicBaseUrl, `${productId}.images`)
    }

    for (const variants of imageVariants) {
      const widths = variants.map((variant) => variant.width).join(',')
      if (widths !== expectedImageVariantWidths.join(',')) {
        throw new Error(`${productId}.imageVariants must contain ${expectedImageVariantWidths.join(',')} width variants`)
      }

      for (const variant of variants) {
        assertPublicImageUrl(variant.url, publicBaseUrl, `${productId}.imageVariants`)
      }
    }

    for (const storagePath of storagePaths) {
      assertR2StoragePath(storagePath, variantId)
    }
  }
}

function validateSyncRecords(records: ProductSyncRecord[], publicBaseUrl: string) {
  for (const record of records) {
    const productId = readProductId(record.productId)
    if (!Array.isArray(record.variants)) {
      throw new Error(`${productId}.variants must be an array`)
    }

    for (const variant of record.variants) {
      if (!variant || typeof variant !== 'object') {
        throw new Error(`${productId}.variants must contain variant objects`)
      }

      const variantId = readProductId((variant as { variantId?: unknown }).variantId)
      const images = readStringArray((variant as { images?: unknown }).images, `${variantId}.images`)

      for (const image of images) {
        assertPublicImageUrl(image, publicBaseUrl, `${variantId}.images`)
      }
    }
  }
}

function assertPublicImageUrl(value: string, publicBaseUrl: string, context: string) {
  if (value.startsWith('/') || value.includes('/Photo/')) {
    throw new Error(`${context} contains local product image path "${value}"`)
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${context} must contain absolute hosted image URLs, received "${value}"`)
  }

  if (url.protocol !== 'https:') {
    throw new Error(`${context} must use https image URLs, received "${value}"`)
  }

  if (!value.startsWith(`${publicBaseUrl}/`)) {
    throw new Error(`${context} image URL "${value}" must start with ${publicBaseUrl}/`)
  }
}

function assertR2StoragePath(value: string, productId: string) {
  if (path.isAbsolute(value) || value.startsWith('/') || value.includes('..')) {
    throw new Error(`${productId}.imageStoragePaths contains unsafe path "${value}"`)
  }

  if (!value.startsWith('products/')) {
    throw new Error(`${productId}.imageStoragePaths must use products/ R2 keys`)
  }
}

function readProductId(value: unknown) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Generated catalog product is missing productId')
  }

  return value
}

function readStringArray(value: unknown, context: string) {
  if (!Array.isArray(value) || !value.every((item) => typeof item === 'string')) {
    throw new Error(`${context} must be a string array`)
  }

  return value as string[]
}

function readImageVariants(value: unknown, context: string) {
  if (!Array.isArray(value)) {
    throw new Error(`${context} must be an array of image variant arrays`)
  }

  return value.map((variants, index) => {
    if (!Array.isArray(variants) || variants.length === 0) {
      throw new Error(`${context}[${index}] must contain at least one image variant`)
    }

    return variants.map((variant, variantIndex) => {
      if (!variant || typeof variant !== 'object') {
        throw new Error(`${context}[${index}][${variantIndex}] must be an image variant object`)
      }

      const width = (variant as { width?: unknown }).width
      const url = (variant as { url?: unknown }).url

      if (typeof width !== 'number' || !Number.isInteger(width) || width <= 0) {
        throw new Error(`${context}[${index}][${variantIndex}].width must be a positive integer`)
      }

      if (typeof url !== 'string') {
        throw new Error(`${context}[${index}][${variantIndex}].url must be a string`)
      }

      return { width, url }
    })
  })
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
