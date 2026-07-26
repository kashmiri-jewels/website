import type { Product } from '../data/products'

export function getProductImage(product: Product, index: number) {
  return product.images[index] ?? product.images[0]
}

export function getProductImageSrcSet(product: Product, index: number) {
  const variants = product.imageVariants[index]
  if (!variants || variants.length === 0) return undefined

  return variants.map((variant) => `${variant.url} ${variant.width}w`).join(', ')
}

export function getProductImageProps(product: Product, index: number, sizes: string) {
  const srcSet = getProductImageSrcSet(product, index)

  return {
    sizes: srcSet ? sizes : undefined,
    src: getProductImage(product, index),
    srcSet,
  }
}
