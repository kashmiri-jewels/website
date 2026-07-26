import { z } from 'zod'

export const productSizeSchema = z.object({
  inventoryId: z.string().min(1),
  label: z.string().min(1),
  stockAvailable: z.number().int().min(0),
  active: z.boolean().default(true),
})

export const productAttributeSchema = z.object({
  label: z.string().min(1),
  section: z.enum(['details', 'disclosure']).default('details'),
  value: z.string().min(1),
})

export const sizeChartRowSchema = z.object({
  size: z.string().min(1),
  measurements: z.record(z.string(), z.string().min(1)),
})

export const productImageVariantSchema = z.object({
  width: z.number().int().positive(),
  url: z.string().min(1),
})

export const productSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1),
  productCode: z.string().min(1),
  slug: z.string().min(1),
  title: z.string().min(1),
  images: z.array(z.string().min(1)).min(1),
  imageStoragePaths: z.array(z.string().min(1)),
  imageVariants: z.array(z.array(productImageVariantSchema)),
  mrpPaise: z.number().int().positive(),
  sellingPricePaise: z.number().int().positive(),
  discountPercent: z.number().min(0).max(100),
  sizes: z.array(productSizeSchema).min(1),
  stockAvailable: z.number().int().min(0),
  description: z.string().min(1),
  sizeChart: z.array(sizeChartRowSchema),
  category: z.string().min(1),
  categoryLabel: z.string().min(1),
  imageAlt: z.string().min(1),
  tag: z.string().optional(),
  brand: z.string().optional(),
  color: z.string().optional(),
  minOrderQuantity: z.number().int().positive().default(1),
  attributes: z.array(productAttributeSchema).default([]),
  fulfillmentBy: z.string().optional(),
  shippingProvider: z.string().optional(),
  package: z.object({
    lengthCm: z.number().positive().nullable(),
    breadthCm: z.number().positive().nullable(),
    heightCm: z.number().positive().nullable(),
    weightKg: z.number().positive().nullable(),
  }),
  hsn: z.string().optional(),
  taxCode: z.string().optional(),
  featured: z.boolean().default(false),
  active: z.boolean().default(true),
})

export const productCatalogSchema = z.array(productSchema)

export type Product = z.infer<typeof productSchema>
export type ProductImageVariant = z.infer<typeof productImageVariantSchema>
export type ProductSize = z.infer<typeof productSizeSchema>
export type ProductAttribute = z.infer<typeof productAttributeSchema>
export type SizeChartRow = z.infer<typeof sizeChartRowSchema>
