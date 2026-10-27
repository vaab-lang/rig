export type PragmaColumn = {
  name: string
  type: string
  pk: boolean
  nullable: boolean
  defaultValue: string | null
  cid: string
  notnull: string
  dflt_value: string
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  const text = String(value).trim()
  return text
}

function truthy(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes' || v === 'on'
  }
  return false
}

function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim() !== '' && !Number.isNaN(Number(value))) return Number(value)
  return null
}

function isPragmaColumn(raw: Record<string, unknown>): boolean {
  return 'cid' in raw || ('notnull' in raw && 'dflt_value' in raw) || ('pk' in raw && 'notnull' in raw && 'name' in raw)
}

/** Shared column parser. Blank names are missing metadata, not a real column. */
export function readPragmaColumn(raw: unknown, index = 0): PragmaColumn | null {
  if (typeof raw === 'string') {
    const name = raw.trim()
    if (!name) return null
    const pk = name === 'id'
    return {
      name,
      type: 'text',
      pk,
      nullable: !pk,
      defaultValue: null,
      cid: String(index),
      notnull: pk ? '1' : '0',
      dflt_value: '',
    }
  }
  const record = asRecord(raw)
  if (!record) return null
  const pragma = isPragmaColumn(record)
  const name = asString(pragma ? record.name : (record.name ?? record.column_name ?? record.key))
  if (!name) return null
  const pk = pragma
    ? asString(record.pk) === '1' || asNumber(record.pk) === 1
    : truthy(record.pk ?? record.is_pk ?? record.primary_key) || asNumber(record.pk) === 1
  const notNull = pragma
    ? asString(record.notnull) === '1' || asNumber(record.notnull) === 1
    : truthy(record.notnull ?? record.not_null ?? record.is_not_null)
  const nullable =
    record.nullable !== undefined || record.is_nullable !== undefined
      ? truthy(record.nullable ?? record.is_nullable)
      : !pk && !notNull
  const dflt = record.dflt_value ?? record.default ?? record.column_default
  const defaultValue = dflt == null || dflt === '' ? null : String(dflt)
  return {
    name,
    type: asString(record.type ?? record.data_type ?? record.udt_name ?? record.typname, 'text') || 'text',
    pk,
    nullable,
    defaultValue,
    cid: asString(record.cid, String(index)),
    notnull: notNull ? '1' : '0',
    dflt_value: defaultValue ?? '',
  }
}

export function rowKeys(row: unknown): string[] {
  if (!row || typeof row !== 'object' || Array.isArray(row)) return []
  return Object.keys(row).filter((key) => !key.startsWith('__') && key.trim() !== '')
}

export function zipArrayRow(row: unknown[], names: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  const width = Math.max(row.length, names.length)
  for (let index = 0; index < width; index += 1) {
    const name = names[index]?.trim() || `col_${index}`
    out[name] = row[index] ?? null
  }
  return out
}
