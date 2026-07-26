export function createInventoryId(variantId: string, size: string) {
  return `${variantId.trim()}:${size.trim().toLowerCase()}`
}

export function normalizeSlugPart(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
}
