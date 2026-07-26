import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { createClient } from '@supabase/supabase-js'

import { loadEnvFile, projectRoot, requiredEnv } from './lib/runtime'

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
    sizeChart: unknown
    attributes: unknown
    minOrderQuantity: number
    fulfillmentBy: string | null
    shippingProvider: string | null
    package: {
      lengthCm: number | null
      breadthCm: number | null
      heightCm: number | null
      weightKg: number | null
    }
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

type ExistingProductRow = {
  product_id: string
}

type ExistingVariantRow = {
  active: boolean
  slug: string
  variant_id: string
}

type ExistingVariantSizeRow = {
  inventory_id: string
}

const syncPath = path.join(projectRoot, 'src/generated/products-sync.json')

async function main() {
  await loadEnvFile()

  const supabaseUrl = requiredEnv('SUPABASE_URL')
  const serviceRoleKey = requiredEnv('SUPABASE_SERVICE_ROLE_KEY')
  assertExpectedSupabaseProject(supabaseUrl)
  const records = JSON.parse(await readFile(syncPath, 'utf8')) as ProductSyncRecord[]
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const { data: existingProducts, error: productReadError } = await supabase
    .from('products')
    .select('product_id')

  if (productReadError) throw productReadError

  const { data: existingVariants, error: variantReadError } = await supabase
    .from('product_variants')
    .select('variant_id, slug, active')

  if (variantReadError) throw variantReadError

  const { data: existingVariantSizes, error: variantSizeReadError } = await supabase
    .from('product_variant_sizes')
    .select('inventory_id')

  if (variantSizeReadError) throw variantSizeReadError

  const productIds = new Set(records.map((product) => product.productId))
  const variantIds = new Set(records.flatMap((product) => product.variants.map((variant) => variant.variantId)))
  const variantSlugToId = new Map(
    records.flatMap((product) => product.variants.map((variant) => [variant.slug, variant.variantId] as const)),
  )
  const inventoryIds = new Set(
    records.flatMap((product) =>
      product.variants.flatMap((variant) => variant.sizes.map((size) => size.inventoryId)),
    ),
  )

  await assertOk(
    supabase.from('products').upsert(
      records.map((product) => ({
        product_id: product.productId,
        slug: product.slug,
        title: product.title,
        category: product.category,
        description: product.description,
        active: product.active,
      })),
      { onConflict: 'product_id' },
    ),
    'Unable to upsert products',
  )

  for (const variant of (existingVariants ?? []) as ExistingVariantRow[]) {
    const incomingVariantId = variantSlugToId.get(variant.slug)
    if (!incomingVariantId || incomingVariantId === variant.variant_id) continue

    await assertOk(
      supabase
        .from('product_variants')
        .update({
          active: false,
          slug: archiveVariantSlug(variant.slug, variant.variant_id),
        })
        .eq('variant_id', variant.variant_id),
      `Unable to archive stale variant slug ${variant.slug}`,
    )
  }

  await assertOk(
    supabase.from('product_variants').upsert(
      records.flatMap((product) =>
        product.variants.map((variant) => ({
          variant_id: variant.variantId,
          product_id: product.productId,
          product_code: variant.productCode,
          slug: variant.slug,
          title: variant.title,
          color: variant.color,
          tag: variant.tag,
          brand: variant.brand,
          images: variant.images,
          mrp_paise: variant.mrpPaise,
          selling_price_paise: variant.sellingPricePaise,
          size_chart: variant.sizeChart,
          attributes: variant.attributes,
          min_order_quantity: variant.minOrderQuantity,
          fulfillment_by: variant.fulfillmentBy,
          shipping_provider: variant.shippingProvider,
          package_length_cm: variant.package.lengthCm,
          package_breadth_cm: variant.package.breadthCm,
          package_height_cm: variant.package.heightCm,
          package_weight_kg: variant.package.weightKg,
          hsn: variant.hsn,
          tax_code: variant.taxCode,
          active: variant.active && product.active,
          featured: variant.featured,
        })),
      ),
      { onConflict: 'variant_id' },
    ),
    'Unable to upsert product variants',
  )

  await assertOk(
    supabase.from('product_variant_sizes').upsert(
      records.flatMap((product) =>
        product.variants.flatMap((variant) =>
          variant.sizes.map((size) => ({
            inventory_id: size.inventoryId,
            variant_id: variant.variantId,
            size_label: size.sizeLabel,
            stock_available: size.stock,
            active: size.active && variant.active && product.active,
          })),
        ),
      ),
      { onConflict: 'inventory_id' },
    ),
    'Unable to upsert product variant sizes',
  )

  for (const size of (existingVariantSizes ?? []) as ExistingVariantSizeRow[]) {
    if (inventoryIds.has(size.inventory_id)) continue

    await assertOk(
      supabase.from('product_variant_sizes').update({ active: false }).eq('inventory_id', size.inventory_id),
      `Unable to deactivate stale inventory ${size.inventory_id}`,
    )
  }

  for (const variant of (existingVariants ?? []) as ExistingVariantRow[]) {
    if (variantIds.has(variant.variant_id)) continue

    await assertOk(
      supabase.from('product_variants').update({ active: false }).eq('variant_id', variant.variant_id),
      `Unable to deactivate stale variant ${variant.variant_id}`,
    )
  }

  for (const product of (existingProducts ?? []) as ExistingProductRow[]) {
    if (productIds.has(product.product_id)) continue

    await assertOk(
      supabase.from('products').update({ active: false }).eq('product_id', product.product_id),
      `Unable to deactivate stale product ${product.product_id}`,
    )
  }

  const variantCount = records.reduce((total, product) => total + product.variants.length, 0)
  const sizeCount = records.reduce(
    (total, product) =>
      total + product.variants.reduce((variantTotal, variant) => variantTotal + variant.sizes.length, 0),
    0,
  )
  console.log(`Synced ${records.length} products, ${variantCount} variants, and ${sizeCount} size rows to Supabase`)
}

async function assertOk<T>(
  operation: PromiseLike<{ data: T | null; error: { message: string } | null }>,
  message: string,
) {
  const { error } = await operation

  if (error) {
    throw new Error(`${message}: ${error.message}`)
  }
}

function assertExpectedSupabaseProject(supabaseUrl: string) {
  const expectedRef = process.env.EXPECTED_SUPABASE_PROJECT_REF
  if (!expectedRef) {
    throw new Error('EXPECTED_SUPABASE_PROJECT_REF is required before syncing products')
  }

  const actualRef = new URL(supabaseUrl).hostname.split('.')[0]
  if (actualRef !== expectedRef) {
    throw new Error(
      `SUPABASE_URL points to ${actualRef}; expected ${expectedRef}. Refusing to sync products.`,
    )
  }
}

function archiveVariantSlug(slug: string, variantId: string) {
  const suffix = variantId.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  return `${slug}--archived-${suffix}`
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
