import type { FilterOp, StudioTable, TableColumnMeta } from '@/lib/table-api'

export const PAGE_SIZES = [100, 500, 1000] as const
export type PageSize = (typeof PAGE_SIZES)[number]

export const COLUMN_TYPES = [
  'text',
  'int8',
  'int4',
  'bool',
  'jsonb',
  'uuid',
  'timestamptz',
  'real',
  'numeric',
  'date',
] as const

export type EditorTab = {
  id: string
  schema: string
  table: string
  dirty: boolean
}

export type FilterRule = {
  id: string
  column: string
  op: FilterOp
  value: string
}

export type SortRule = {
  id: string
  column: string
  dir: 'ASC' | 'DESC'
}

export type DrawerKind =
  | { type: 'none' }
  | { type: 'table'; mode: 'new' | 'edit'; table?: StudioTable }
  | { type: 'column'; mode: 'new' | 'edit'; column?: TableColumnMeta }
  | { type: 'row'; mode: 'insert' | 'edit'; row?: Record<string, unknown> }
  | { type: 'csv' }
  | { type: 'inspect'; rowIdx: number; key: string }

export type ColumnDraft = {
  id: string
  name: string
  type: string
  default: string
  pk: boolean
  nullable: boolean
  unique: boolean
}

export type ForeignKeyDraft = {
  id: string
  from: string
  table: string
  to: string
}

export const TABS_KEY = 'rig.studio.editorTabs'

export function newId(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

export function emptyColumnDraft(): ColumnDraft {
  return { id: newId('col'), name: '', type: 'text', default: '', pk: false, nullable: true, unique: false }
}

export function parseEditorTarget(pathname: string, search: string): { schema: string; table: string } | null {
  const params = new URLSearchParams(search)
  const queryTable = params.get('table')?.trim()
  if (queryTable) {
    if (queryTable.includes('.')) {
      const [schema, table] = queryTable.split('.', 2)
      return { schema: schema || 'public', table: table || queryTable }
    }
    return { schema: params.get('schema')?.trim() || 'public', table: queryTable }
  }
  const rest = pathname.replace(/^.*\/editor\/?/, '')
  if (!rest) return null
  const parts = rest.split('/').filter(Boolean).map(decodeURIComponent)
  if (parts.length >= 2) return { schema: parts[0] || 'public', table: parts[1] || '' }
  if (parts[0]) return { schema: 'public', table: parts[0] }
  return null
}

export function editorPath(schema: string, table: string): string {
  if (!table) return '/editor'
  const value = schema && schema !== 'public' ? `${schema}.${table}` : table
  return `/editor?table=${encodeURIComponent(value)}`
}

export function readEditorTabs(): EditorTab[] {
  try {
    const raw = localStorage.getItem(TABS_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as EditorTab[]
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((tab) => tab && typeof tab.id === 'string')
      .map((tab) => ({
        id: tab.id,
        schema: tab.schema || 'public',
        table: tab.table || '',
        dirty: Boolean(tab.dirty),
      }))
  } catch {
    return []
  }
}

export function writeEditorTabs(tabs: EditorTab[]) {
  localStorage.setItem(TABS_KEY, JSON.stringify(tabs.map(({ id, schema, table, dirty }) => ({ id, schema, table, dirty }))))
}

export function qualify(schema: string, name: string): string {
  return schema && schema !== 'public' ? `${schema}.${name}` : name
}
