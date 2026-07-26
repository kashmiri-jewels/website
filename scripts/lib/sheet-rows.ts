export type SheetRow = Record<string, string>

export function sheetRowsFromValues(
  values: unknown[][],
  requiredColumns: string[],
  range: string,
) {
  if (values.length < 2) {
    throw new Error(`No product rows found in range ${range}`)
  }

  const [headers = [], ...bodyRows] = values
  const rows = bodyRows
    .map((row) => rowToObject(headers, row))
    .filter((row) => Object.values(row).some(Boolean))

  assertRequiredColumns(rows[0] ?? {}, requiredColumns)
  return rows.map(normalizeRowKeys)
}

export function pick(row: SheetRow, aliases: string[], rowNumber: number) {
  const value = pickOptional(row, aliases)

  if (!value) {
    throw new Error(`Missing required value for ${aliases[0]} on row ${rowNumber}`)
  }

  return value
}

export function pickOptional(row: SheetRow, aliases: string[]) {
  for (const alias of aliases) {
    const value = row[normalizeHeader(alias)]

    if (value) return value
  }

  return undefined
}

export function splitList(value: string) {
  return value
    .split(/\n|\||,/)
    .map((item) => item.trim())
    .filter(Boolean)
}

export function parseBoolean(value: string) {
  return ['true', 'yes', '1', 'active', 'featured'].includes(value.trim().toLowerCase())
}

function rowToObject(headers: unknown[], values: unknown[]) {
  return Object.fromEntries(
    headers.map((header, index) => [String(header), String(values[index] ?? '').trim()]),
  )
}

function normalizeRowKeys(row: SheetRow) {
  return Object.fromEntries(
    Object.entries(row).map(([key, value]) => [normalizeHeader(key), String(value ?? '').trim()]),
  )
}

function assertRequiredColumns(row: SheetRow, requiredColumns: string[]) {
  const normalized = new Set(Object.keys(normalizeRowKeys(row)))
  const missing = requiredColumns.filter((column) => !normalized.has(normalizeHeader(column)))

  if (missing.length > 0) {
    throw new Error(`Missing required product column(s): ${missing.join(', ')}`)
  }
}

function normalizeHeader(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '')
}
