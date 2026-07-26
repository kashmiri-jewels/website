import type { Product, SizeChartRow } from '../data/products'

const fitPreferenceStorageKey = 'kashmiri-jewels-fit-reference-bust'

export type FitRecommendation = {
  difference: number
  length?: string
  size: string
  sizeBust: number
}

export function getStoredFitBust() {
  if (typeof window === 'undefined') return ''

  const storedValue = window.localStorage.getItem(fitPreferenceStorageKey)
  if (!storedValue) return ''

  const parsedValue = Number(storedValue)
  return Number.isFinite(parsedValue) && parsedValue > 0 ? String(parsedValue) : ''
}

export function storeFitBust(value: string) {
  if (typeof window === 'undefined') return

  const parsedValue = Number(value)

  if (!Number.isFinite(parsedValue) || parsedValue <= 0) {
    window.localStorage.removeItem(fitPreferenceStorageKey)
    return
  }

  window.localStorage.setItem(fitPreferenceStorageKey, String(parsedValue))
}

export function getFitRecommendation(product: Product, referenceBust: number) {
  const availableSizes = new Set(
    product.sizes
      .filter((size) => size.stockAvailable > 0)
      .map((size) => size.label),
  )
  const rowsWithBust = product.sizeChart.flatMap((row) => {
    if (!availableSizes.has(row.size)) return []

    const sizeBust = parseMeasurement(row, 'Bust')
    if (sizeBust === undefined || !Number.isFinite(sizeBust)) return []

    return [
      {
        length: row.measurements.Length,
        size: row.size,
        sizeBust,
      },
    ]
  })

  if (rowsWithBust.length === 0 || !Number.isFinite(referenceBust)) return null

  return rowsWithBust
    .map((row) => ({
      ...row,
      difference: Math.abs(row.sizeBust - referenceBust),
    }))
    .sort((left, right) => left.difference - right.difference || left.sizeBust - right.sizeBust)[0]
}

export function getFitMessage(recommendation: FitRecommendation, referenceBust: number) {
  if (recommendation.difference === 0) {
    return `${recommendation.size} matches your reference bust measurement.`
  }

  const direction = recommendation.sizeBust > referenceBust ? 'roomier' : 'closer fitting'
  return `${recommendation.size} is the closest match and is ${recommendation.difference} in ${direction}.`
}

function parseMeasurement(row: SizeChartRow, key: string) {
  const value = row.measurements[key]
  if (!value) return undefined

  const match = value.match(/[\d.]+/)
  return match ? Number(match[0]) : undefined
}
