import { explainStatus, insertRow, listRows, patchRow } from '@/lib/api'
import { readPragmaColumn } from '@/lib/columns'
import { useRoleStore, type ImpersonationRole } from '@/lib/role-store'

export class StudioApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.name = 'StudioApiError'
    this.status = status
  }
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof StudioApiError && error.status === 401
}

export function isNotFound(error: unknown): boolean {
  return error instanceof StudioApiError && error.status === 404
}

export const FILTER_OPS = ['=', '!=', '>', '>=', '<', '<=', 'LIKE', 'IS NULL'] as const
export type FilterOp = (typeof FILTER_OPS)[number]

export type RowFilter = {
  column: string
  op: FilterOp
  value?: string
}

export type RowSort = {
  column: string
  dir: 'ASC' | 'DESC'
}

export type TableColumnMeta = {
  name: string
  type: string
  pk: boolean
  fk: boolean
  nullable: boolean
  unique: boolean
  default: string | null
  references?: { table: string; column: string } | null
}

export type TableForeignKey = {
  from: string
  table: string
  to: string
}

export type StudioTable = {
  name: string
  schema: string
  kind: 'table' | 'view'
  sql: string
  rowCount: number | null
  estimated: boolean
  rlsEnabled: boolean | null
  rlsCount: number | null
  columns: TableColumnMeta[]
  foreignKeys: TableForeignKey[]
}

export type QueryRowsResult = {
  rows: Record<string, unknown>[]
  count: number
  estimated: boolean
  ms: number
  fallback: boolean
}

export type DdlAction =
  | 'create'
  | 'alter'
  | 'rename'
  | 'drop'
  | 'truncate'
  | 'duplicate'
  | 'add_column'
  | 'drop_column'
  | 'rename_column'
  | 'alter_column'

export type DdlColumn = {
  name: string
  type?: string
  default?: string
  pk?: string
  nullable?: string
  unique?: string
  fk_table?: string
  fk_column?: string
  references?: string
}

export type DdlBody = {
  action: DdlAction
  table: string
  schema?: string
  new_name?: string
  sql?: string
  columns?: DdlColumn[]
  rls_enabled?: string
}

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

function studioInit(init?: RequestInit, role?: ImpersonationRole): RequestInit {
  const headers = new Headers(init?.headers)
  if (!headers.has('Accept')) headers.set('Accept', 'application/json')
  if (role && role !== 'postgres') headers.set('X-Rig-Role', role)
  if (role === 'authenticated') {
    const uid = useRoleStore.getState().uid.trim()
    if (uid) headers.set('X-Rig-User', uid)
  }
  return {
    credentials: 'include',
    ...init,
    headers,
  }
}

async function readBody(response: Response): Promise<string> {
  try {
    return await response.text()
  } catch {
    return ''
  }
}

async function readJson<T>(response: Response): Promise<T> {
  const text = await readBody(response)
  if (!response.ok) {
    throw new StudioApiError(response.status, explainStatus(response.status, text))
  }
  if (!text) return {} as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new StudioApiError(response.status, text || `HTTP ${response.status}`)
  }
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

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  return String(value)
}

function unwrapList(data: unknown): unknown[] {
  if (Array.isArray(data)) return data
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    const nested = record.tables ?? record.data ?? record.items ?? record.result
    if (Array.isArray(nested)) return nested
  }
  return []
}

function normalizeColumn(raw: unknown, index: number): TableColumnMeta | null {
  const parsed = readPragmaColumn(raw, index)
  if (!parsed) return null
  const record = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : null
  const refTable = asString(
    record?.fk_table ??
      record?.referenced_table ??
      record?.ref_table ??
      (record?.references as Record<string, unknown> | undefined)?.table,
  )
  const refCol = asString(
    record?.fk_column ??
      record?.referenced_column ??
      record?.ref_column ??
      (record?.references as Record<string, unknown> | undefined)?.column,
  )
  const fk = truthy(record?.fk ?? record?.is_fk ?? record?.foreign_key) || Boolean(refTable)
  return {
    name: parsed.name,
    type: parsed.type,
    pk: parsed.pk,
    fk,
    nullable: parsed.nullable,
    unique: truthy(record?.unique ?? record?.is_unique) || parsed.pk,
    default: parsed.defaultValue,
    references: refTable ? { table: refTable, column: refCol || 'id' } : null,
  }
}

function normalizeForeignKey(raw: unknown): TableForeignKey | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const from = asString(o.from)
  const table = asString(o.table)
  const to = asString(o.to, 'id')
  if (!from || !table) return null
  return { from, table, to }
}

export function normalizeTable(raw: unknown): StudioTable | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name = asString(o.name ?? o.table ?? o.table_name ?? o.id)
  if (!name) return null
  const schema = asString(o.schema ?? o.schema_name ?? o.nspname, 'public')
  const kindRaw = asString(o.kind ?? o.type ?? o.relkind, 'table').toLowerCase()
  const kind: 'table' | 'view' = kindRaw.includes('view') ? 'view' : 'table'
  const columnsRaw = Array.isArray(o.columns) ? o.columns : []
  const columns = columnsRaw.map((column, index) => normalizeColumn(column, index)).filter((column): column is TableColumnMeta => column !== null)
  const fks = Array.isArray(o.foreign_keys) ? o.foreign_keys : Array.isArray(o.foreignKeys) ? o.foreignKeys : []
  const foreignKeys = fks.map(normalizeForeignKey).filter((item): item is TableForeignKey => Boolean(item))
  for (const fk of foreignKeys) {
    const col = columns.find((column) => column.name === fk.from)
    if (col) {
      col.fk = true
      col.references = { table: fk.table, column: fk.to }
    }
  }
  const count = asNumber(o.row_count ?? o.rowCount ?? o.rows ?? o.estimate ?? o.estimated_rows)
  return {
    name,
    schema,
    kind,
    sql: asString(o.sql ?? o.definition ?? o.ddl),
    rowCount: count,
    estimated: o.row_count == null,
    rlsEnabled: o.rls_enabled == null && o.rls == null ? null : truthy(o.rls_enabled ?? o.rls),
    rlsCount: asNumber(o.rls_count ?? o.policy_count ?? o.policies),
    columns,
    foreignKeys,
  }
}

function mergeTables(primary: StudioTable[], extra: StudioTable[]): StudioTable[] {
  const map = new Map<string, StudioTable>()
  for (const table of primary) map.set(`${table.schema}.${table.name}`, table)
  for (const table of extra) {
    const key = `${table.schema}.${table.name}`
    const current = map.get(key)
    if (!current) {
      map.set(key, table)
      continue
    }
    map.set(key, {
      ...current,
      ...table,
      columns: table.columns.length ? table.columns : current.columns,
      foreignKeys: table.foreignKeys.length ? table.foreignKeys : current.foreignKeys,
      sql: table.sql || current.sql,
      rowCount: table.rowCount ?? current.rowCount,
      rlsEnabled: table.rlsEnabled ?? current.rlsEnabled,
      rlsCount: table.rlsCount ?? current.rlsCount,
    })
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name))
}

async function getTables(path: string, role?: ImpersonationRole): Promise<StudioTable[]> {
  const response = await fetch(path, studioInit(undefined, role))
  const data = await readJson<unknown>(response)
  return unwrapList(data).map(normalizeTable).filter((item): item is StudioTable => Boolean(item))
}

export async function fetchStudioTables(role?: ImpersonationRole): Promise<StudioTable[]> {
  const tables = await getTables('/studio-api/tables', role)
  try {
    const meta = await getTables('/studio-api/pg-meta/tables', role)
    return mergeTables(tables, meta)
  } catch (error) {
    if (isNotFound(error)) return tables
    if (isUnauthorized(error)) throw error
    return tables
  }
}

function stringifyValues(values: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    if (key.startsWith('__')) continue
    out[key] = value == null ? '' : typeof value === 'string' ? value : JSON.stringify(value)
  }
  return out
}

function likeMatch(value: string, pattern: string): boolean {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/%/g, '.*').replace(/_/g, '.')
  return new RegExp(`^${escaped}$`, 'i').test(value)
}

function cellString(value: unknown): string | null {
  if (value == null) return null
  return String(value)
}

function rowMatches(row: Record<string, unknown>, filters: RowFilter[]): boolean {
  return filters.every((filter) => {
    const raw = row[filter.column]
    const text = cellString(raw)
    switch (filter.op) {
      case 'IS NULL':
        return raw == null || raw === ''
      case '=':
        return text === (filter.value ?? '')
      case '!=':
        return text !== (filter.value ?? '')
      case '>':
        return text != null && text > (filter.value ?? '')
      case '>=':
        return text != null && text >= (filter.value ?? '')
      case '<':
        return text != null && text < (filter.value ?? '')
      case '<=':
        return text != null && text <= (filter.value ?? '')
      case 'LIKE':
        return text != null && likeMatch(text, filter.value ?? '')
      default:
        return true
    }
  })
}

function compareRows(a: Record<string, unknown>, b: Record<string, unknown>, sorts: RowSort[]): number {
  for (const sort of sorts) {
    const av = a[sort.column]
    const bv = b[sort.column]
    if (av == null && bv == null) continue
    if (av == null) return sort.dir === 'ASC' ? -1 : 1
    if (bv == null) return sort.dir === 'ASC' ? 1 : -1
    const an = asNumber(av)
    const bn = asNumber(bv)
    let cmp = 0
    if (an != null && bn != null) cmp = an - bn
    else cmp = String(av).localeCompare(String(bv))
    if (cmp !== 0) return sort.dir === 'ASC' ? cmp : -cmp
  }
  return 0
}

function normalizePage(data: unknown, fallbackCount?: number): Omit<QueryRowsResult, 'fallback' | 'ms'> & { ms?: number } {
  if (Array.isArray(data)) {
    return { rows: data as Record<string, unknown>[], count: fallbackCount ?? data.length, estimated: fallbackCount == null }
  }
  if (data && typeof data === 'object') {
    const o = data as Record<string, unknown>
    const rows = (Array.isArray(o.rows) ? o.rows : unwrapList(o.rows ?? o.data ?? o.result ?? o.items)) as Record<string, unknown>[]
    const count = asNumber(o.count) ?? fallbackCount ?? rows.length
    return { rows, count, estimated: false, ms: asNumber(o.ms ?? o.duration_ms ?? o.elapsed_ms) ?? undefined }
  }
  return { rows: [], count: fallbackCount ?? 0, estimated: true }
}

async function queryRowsRemote(
  body: {
    table: string
    schema?: string
    filters: RowFilter[]
    sorts: RowSort[]
    limit: number
    offset: number
  },
  role?: ImpersonationRole,
): Promise<QueryRowsResult> {
  const started = performance.now()
  const response = await fetch(
    '/studio-api/rows/query',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          table: body.table,
          limit: body.limit,
          offset: body.offset,
          filters: body.filters.map((filter) => ({
            column: filter.column,
            op: filter.op,
            value: filter.value ?? '',
          })),
          sorts: body.sorts.map((sort) => ({ column: sort.column, dir: sort.dir })),
        }),
      },
      role,
    ),
  )
  const data = await readJson<unknown>(response)
  const page = normalizePage(data)
  return {
    rows: page.rows,
    count: page.count,
    estimated: page.estimated,
    ms: page.ms ?? Math.round(performance.now() - started),
    fallback: false,
  }
}

async function queryRowsFallback(
  table: string,
  filters: RowFilter[],
  sorts: RowSort[],
  limit: number,
  offset: number,
): Promise<QueryRowsResult> {
  const started = performance.now()
  const all = (await listRows(table)) as Record<string, unknown>[]
  const filtered = filters.length ? all.filter((row) => rowMatches(row, filters)) : all
  if (sorts.length) filtered.sort((a, b) => compareRows(a, b, sorts))
  return {
    rows: filtered.slice(offset, offset + limit),
    count: filtered.length,
    estimated: false,
    ms: Math.round(performance.now() - started),
    fallback: true,
  }
}

export async function queryTableRows(
  body: {
    table: string
    schema?: string
    filters?: RowFilter[]
    sorts?: RowSort[]
    limit: number
    offset: number
  },
  role?: ImpersonationRole,
): Promise<QueryRowsResult> {
  const filters = body.filters ?? []
  const sorts = body.sorts ?? []
  try {
    return await queryRowsRemote({ ...body, filters, sorts }, role)
  } catch (error) {
    if (isNotFound(error)) return queryRowsFallback(body.table, filters, sorts, body.limit, body.offset)
    throw error
  }
}

function primaryId(values: Record<string, unknown>): string {
  const id = values.id
  if (id == null) return ''
  return String(id)
}

export async function insertTableRow(
  table: string,
  values: Record<string, unknown>,
  role?: ImpersonationRole,
): Promise<{ fallback: boolean }> {
  const id = primaryId(values)
  try {
    const response = await fetch(
      '/studio-api/rows/insert',
      studioInit(
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ table, id, values: stringifyValues(values) }),
        },
        role,
      ),
    )
    await readJson<unknown>(response)
    return { fallback: false }
  } catch (error) {
    if (!isNotFound(error)) throw error
    await insertRow({
      table,
      id,
      values: stringifyValues(values),
    })
    return { fallback: true }
  }
}

function cellValue(value: unknown): string {
  if (value == null) return ''
  return typeof value === 'string' ? value : String(value)
}

export async function patchTableRow(
  table: string,
  id: string,
  column: string,
  value: unknown,
  role?: ImpersonationRole,
): Promise<{ fallback: boolean }> {
  const text = cellValue(value)
  try {
    const response = await fetch(
      '/studio-api/rows/patch',
      studioInit(
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ table, id, column, value: text }),
        },
        role,
      ),
    )
    await readJson<unknown>(response)
    return { fallback: false }
  } catch (error) {
    if (!isNotFound(error)) throw error
    await patchRow(table, id, column, text)
    return { fallback: true }
  }
}

export async function updateTableRow(
  table: string,
  id: string,
  values: Record<string, unknown>,
  role?: ImpersonationRole,
): Promise<{ fallback: boolean }> {
  const mapped = stringifyValues(values)
  try {
    const response = await fetch(
      '/studio-api/rows/update',
      studioInit(
        {
          method: 'POST',
          headers: jsonHeaders,
          body: JSON.stringify({ table, id, values: mapped }),
        },
        role,
      ),
    )
    await readJson<unknown>(response)
    return { fallback: false }
  } catch (error) {
    if (!isNotFound(error)) throw error
    for (const [column, value] of Object.entries(mapped)) {
      await patchRow(table, id, column, value)
    }
    return { fallback: true }
  }
}

export async function deleteTableRows(table: string, ids: string[], role?: ImpersonationRole): Promise<void> {
  const response = await fetch(
    '/studio-api/rows/delete',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ table, ids }),
      },
      role,
    ),
  )
  await readJson<unknown>(response)
}

function oneStatement(sql: string): string {
  return sql.replace(/;+\s*$/g, '').trim()
}

function ddlAction(body: DdlBody): string {
  if (body.action === 'alter') return body.new_name ? 'rename' : 'alter'
  if (body.action === 'alter_column') return 'rename_column'
  return body.action
}

type DdlColumnMap = {
  name: string
  type: string
  pk: string
  nullable: string
  default: string
  references: string
}

function ddlColumnMap(column: DdlColumn): DdlColumnMap {
  const refs =
    column.references ??
    (column.fk_table ? `${column.fk_table}(${column.fk_column || 'id'})` : '')
  return {
    name: column.name,
    type: column.type ?? 'text',
    pk: column.pk ?? 'false',
    nullable: column.nullable ?? 'true',
    default: column.default ?? '',
    references: refs,
  }
}

export async function runTableDdl(body: DdlBody, role?: ImpersonationRole): Promise<unknown> {
  const columns = (body.columns ?? []).map(ddlColumnMap)
  const first = columns[0]
  let newName = body.new_name ?? ''
  const action = ddlAction(body)
  if (!newName && first && (action === 'drop_column' || action === 'rename_column')) {
    newName = first.name
  }
  const response = await fetch(
    '/studio-api/tables/ddl',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          action,
          table: body.table,
          new_name: newName,
          sql: oneStatement(body.sql ?? ''),
          columns,
        }),
      },
      role,
    ),
  )
  return readJson<unknown>(response)
}

export function rowPrimaryId(row: Record<string, unknown>, columns: TableColumnMeta[]): string {
  const pk = columns.find((column) => column.pk)
  if (pk && row[pk.name] != null) return String(row[pk.name])
  if (row.id != null) return String(row.id)
  return ''
}

export function tableKey(table: Pick<StudioTable, 'schema' | 'name'>): string {
  return table.schema && table.schema !== 'public' ? `${table.schema}.${table.name}` : table.name
}
