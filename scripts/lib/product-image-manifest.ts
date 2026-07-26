import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { ProductImageVariant } from '../../src/data/product-schema'
import { splitList } from './sheet-rows'

export type ImageManifest = {
  products: Record<string, ImageManifestEntry[]>
}

type ImageManifestEntry = {
  storagePath: string
  publicUrl: string
  sourceFileId?: string
  sourceFileName?: string
  variants: ImageManifestVariant[]
}

type ImageManifestVariant = {
  width: number
  storagePath: string
  publicUrl: string
  contentType: string
}

export type ResolvedProductImage = {
  storagePath: string
  publicUrl: string
  variants: ProductImageVariant[]
}

export async function readProductImageManifest(
  manifestPath: string,
  projectRoot: string,
) {
  const content = await readFile(manifestPath, 'utf8')
  const parsed = JSON.parse(content) as ImageManifest

  if (!parsed || typeof parsed !== 'object' || !parsed.products || typeof parsed.products !== 'object') {
    throw new Error(`Invalid product image manifest at ${path.relative(projectRoot, manifestPath)}`)
  }

  return parsed
}

export function resolveProductImagesFromManifest({
  active,
  imageManifest,
  productId,
  rowNumber,
  value,
}: {
  active: boolean
  imageManifest: ImageManifest
  productId: string
  rowNumber: number
  value: string
}): ResolvedProductImage[] {
  const explicitPaths = splitList(value)
  const manifestImages = imageManifest.products[productId]

  if (explicitPaths.length > 0) {
    if (!manifestImages || manifestImages.length === 0) {
      throw new Error(`Image manifest has no images for ${productId} on row ${rowNumber}`)
    }

    const resolvedManifestImages = orderManifestImages(productId, explicitPaths, imageManifest, rowNumber)
    return dedupeProductImages(
      resolvedManifestImages.map(toResolvedProductImage(productId, rowNumber)),
    )
  }

  if (!manifestImages || manifestImages.length === 0) {
    if (!active) return []

    console.warn(`Skipping active product ${productId} on row ${rowNumber}: no supported images found`)
    return []
  }

  return dedupeProductImages(manifestImages.map(toResolvedProductImage(productId, rowNumber)))
}

function toResolvedProductImage(productId: string, rowNumber: number) {
  return (image: ImageManifestEntry) => {
    if (!Array.isArray(image.variants) || image.variants.length === 0) {
      throw new Error(`Image manifest entry for ${productId} on row ${rowNumber} is missing optimized variants`)
    }

    return {
      storagePath: image.storagePath,
      publicUrl: image.publicUrl,
      variants: image.variants
        .map((variant) => ({
          width: variant.width,
          url: variant.publicUrl,
        }))
        .sort((left, right) => left.width - right.width),
    }
  }
}

function orderManifestImages(
  productId: string,
  explicitPaths: string[],
  imageManifest: ImageManifest,
  rowNumber: number,
) {
  const byName = new Map<string, ImageManifestEntry>()
  const manifestImages = imageManifest.products[productId] ?? []

  for (const image of manifestImages) {
    const fileName = image.storagePath.split('/').pop() ?? image.storagePath
    byName.set(fileName.toLowerCase(), image)
    byName.set(image.storagePath.toLowerCase(), image)
    byName.set(image.publicUrl.toLowerCase(), image)
    if (image.sourceFileId) byName.set(image.sourceFileId.toLowerCase(), image)
    if (image.sourceFileName) byName.set(image.sourceFileName.toLowerCase(), image)
  }

  return explicitPaths.map((explicitPath) => {
    const driveFileId = extractGoogleDriveFileId(explicitPath)
    const match = byName.get(explicitPath.toLowerCase()) || (driveFileId ? byName.get(driveFileId.toLowerCase()) : undefined)
    if (!match) {
      throw new Error(
        `Image "${explicitPath}" on row ${rowNumber} was not found in the ${productId} image manifest`,
      )
    }

    return match
  })
}

function dedupeProductImages(images: ResolvedProductImage[]) {
  const seen = new Set<string>()

  return images.filter((image) => {
    const key = image.storagePath || image.publicUrl
    if (seen.has(key)) return false

    seen.add(key)
    return true
  })
}

function extractGoogleDriveFileId(value: string) {
  return value.match(/\/file\/d\/([^/]+)/)?.[1] ?? value.match(/[?&]id=([^&]+)/)?.[1]
}
