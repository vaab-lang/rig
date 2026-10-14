import type { TableColumnMeta } from '@/lib/table-api'

function escapeCsv(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`
  return value
}

export function cellText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function parseCsv(text: string): { headers: string[]; rows: string[][] } {
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false
  const input = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i]
    const next = input[i + 1]
    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"'
        i += 1
      } else if (ch === '"') {
        inQuotes = false
      } else {
        field += ch
      }
      continue
    }
    if (ch === '"') {
      inQuotes = true
      continue
    }
    if (ch === ',') {
      row.push(field)
      field = ''
      continue
    }
    if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && next === '\n') i += 1
      row.push(field)
      field = ''
      if (row.some((cell) => cell.length > 0)) rows.push(row)
      row = []
      continue
    }
    field += ch
  }
  if (field.length || row.length) {
    row.push(field)
    rows.push(row)
  }
  const headers = (rows.shift() ?? []).map((header, index) => header.trim() || `column_${index + 1}`)
  return { headers, rows }
}

export function toCsv(headers: string[], rows: Record<string, unknown>[]): string {
  const lines = [headers.map(escapeCsv).join(',')]
  for (const row of rows) {
    lines.push(headers.map((header) => escapeCsv(cellText(row[header]))).join(','))
  }
  return lines.join('\n')
}

export function rowToJson(row: Record<string, unknown>, headers: string[]): string {
  const out: Record<string, unknown> = {}
  for (const header of headers) out[header] = row[header] ?? null
  return JSON.stringify(out, null, 2)
}

export function sqlLiteral(value: unknown): string {
  if (value == null) return 'NULL'
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE'
  const text = typeof value === 'string' ? value : cellText(value)
  return `'${text.replace(/'/g, "''")}'`
}

export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

export function rowToSql(table: string, row: Record<string, unknown>, headers: string[]): string {
  const cols = headers.map(quoteIdent).join(', ')
  const vals = headers.map((header) => sqlLiteral(row[header])).join(', ')
  return `INSERT INTO ${quoteIdent(table)} (${cols}) VALUES (${vals});`
}

export function rowsToSql(table: string, rows: Record<string, unknown>[], headers: string[]): string {
  return rows.map((row) => rowToSql(table, row, headers)).join('\n')
}

export function createTableSql(
  table: string,
  columns: Array<Pick<TableColumnMeta, 'name' | 'type' | 'pk' | 'nullable' | 'unique' | 'default' | 'references'>>,
): string {
  const lines = columns.map((column) => {
    const parts = [`  ${quoteIdent(column.name)} ${column.type || 'text'}`]
    if (column.pk) parts.push('PRIMARY KEY')
    if (column.unique && !column.pk) parts.push('UNIQUE')
    if (!column.nullable && !column.pk) parts.push('NOT NULL')
    if (column.default) parts.push(`DEFAULT ${column.default}`)
    if (column.references) {
      parts.push(`REFERENCES ${quoteIdent(column.references.table)} (${quoteIdent(column.references.column)})`)
    }
    return parts.join(' ')
  })
  return `CREATE TABLE ${quoteIdent(table)} (\n${lines.join(',\n')}\n);`
}

export function downloadText(filename: string, text: string, type = 'text/plain') {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}
