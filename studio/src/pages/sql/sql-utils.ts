import { format } from 'sql-formatter'
import type { SqlRow } from '@/lib/sql-api'

const WRITE_RE = /^(insert|update|delete|drop|alter|truncate|create|grant|revoke|comment|replace)\b/i
const DESTRUCTIVE_RE = /^(insert|update|delete|drop|alter|truncate)\b/i
const EXPLAIN_RE = /^explain\b/i

export function stripSqlNoise(sql: string): string {
  return sql
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/--[^\n]*/g, ' ')
    .trim()
}

export function statementsOf(sql: string): string[] {
  return stripSqlNoise(sql)
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

export function isDestructiveSql(sql: string): boolean {
  return statementsOf(sql).some((statement) => DESTRUCTIVE_RE.test(statement))
}

export function isWriteSql(sql: string): boolean {
  return statementsOf(sql).some((statement) => WRITE_RE.test(statement))
}

export function isExplainSql(sql: string): boolean {
  return statementsOf(sql).some((statement) => EXPLAIN_RE.test(statement))
}

export function formatSql(sql: string): string {
  return format(sql, { language: 'sqlite', tabWidth: 2, keywordCase: 'lower' })
}

export function wrapExplain(sql: string): string {
  const trimmed = sql.trim()
  if (!trimmed) return 'explain query plan select 1'
  if (EXPLAIN_RE.test(stripSqlNoise(trimmed))) return trimmed
  return `explain query plan\n${trimmed}`
}

export function cellDisplay(value: unknown): string {
  if (value == null) return 'NULL'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function isNumericColumn(rows: SqlRow[], key: string): boolean {
  let seen = 0
  for (const row of rows) {
    const value = row[key]
    if (value == null || value === '') continue
    if (typeof value === 'number' && Number.isFinite(value)) {
      seen += 1
      continue
    }
    if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
      seen += 1
      continue
    }
    return false
  }
  return seen > 0
}

export function toCsv(columns: string[], rows: SqlRow[]): string {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replace(/"/g, '""')}"`
    return value
  }
  const header = columns.map(escape).join(',')
  const body = rows.map((row) => columns.map((column) => escape(cellDisplay(row[column] === null ? null : row[column]))).join(','))
  return [header, ...body].join('\n')
}

export function toMarkdown(columns: string[], rows: SqlRow[]): string {
  const header = `| ${columns.join(' | ')} |`
  const sep = `| ${columns.map(() => '---').join(' | ')} |`
  const body = rows.map((row) => `| ${columns.map((column) => cellDisplay(row[column]).replace(/\|/g, '\\|')).join(' | ')} |`)
  return [header, sep, ...body].join('\n')
}

export function downloadText(filename: string, content: string, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

export async function copyText(value: string) {
  await navigator.clipboard.writeText(value)
}

export type ExplainNode = {
  id: string
  label: string
  children: ExplainNode[]
}

export function parseExplainTree(rows: SqlRow[]): ExplainNode[] {
  if (rows.length === 0) return []

  const hasParent = rows.some((row) => 'parent' in row || 'Parent' in row)
  if (hasParent) {
    const nodes = new Map<string, ExplainNode>()
    const parents = new Map<string, string>()
    for (const [index, row] of rows.entries()) {
      const id = String(row.id ?? row.ID ?? index)
      const parent = String(row.parent ?? row.Parent ?? '')
      const label = cellDisplay(row.detail ?? row.Detail ?? row.opcode ?? row.explain ?? Object.values(row)[0])
      nodes.set(id, { id, label, children: [] })
      parents.set(id, parent)
    }
    const roots: ExplainNode[] = []
    for (const [id, node] of nodes) {
      const parent = parents.get(id) ?? ''
      if (parent && parent !== '0' && parent !== id && nodes.has(parent)) {
        nodes.get(parent)?.children.push(node)
      } else {
        roots.push(node)
      }
    }
    return roots.length ? roots : [...nodes.values()]
  }

  const labels = rows.map((row) =>
    cellDisplay(row.detail ?? row.Detail ?? row['QUERY PLAN'] ?? row.explain ?? Object.values(row)[0]),
  )
  const roots: ExplainNode[] = []
  const stack: { indent: number; node: ExplainNode }[] = []
  labels.forEach((label, index) => {
    const indent = (label.match(/^\s*/)?.[0].length ?? 0) + (label.match(/[|`+-]/g)?.length ?? 0)
    const node: ExplainNode = {
      id: `n${index}`,
      label: label.replace(/^[\s|`+\-]+/, '').trim() || label,
      children: [],
    }
    while (stack.length && (stack[stack.length - 1]?.indent ?? 0) >= indent) stack.pop()
    const parent = stack[stack.length - 1]
    if (parent) parent.node.children.push(node)
    else roots.push(node)
    stack.push({ indent, node })
  })
  return roots
}
