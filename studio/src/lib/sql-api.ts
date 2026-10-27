import { explainStatus } from '@/lib/api'
import { readPragmaColumn } from '@/lib/columns'
import { useRoleStore, type ImpersonationRole } from '@/lib/role-store'

export type SqlRow = Record<string, unknown>

export type SqlRunResult = {
  columns: string[]
  rows: SqlRow[]
  ms: number
  affected?: number
}

export type PgMetaColumn = {
  name: string
  type: string
  pk: boolean
  nullable: boolean
  cid: string
  notnull: string
  dflt_value: string
}

export type PgMetaTable = {
  schema: string
  name: string
  kind: string
  sql: string
  row_count: string
  rls_enabled: string
  columns: PgMetaColumn[]
  foreign_keys: Record<string, string>[]
  indexes: Record<string, string>[]
}

export type SqlSnippet = {
  id: string
  name: string
  description: string
  sql: string
  folder: 'Favorites' | 'Shared' | 'Private' | string
  favorite: boolean
  visibility: 'shared' | 'private' | string
  updated_at: string
  local?: boolean
}

export type SnippetWrite = {
  id?: string
  name: string
  description?: string
  sql: string
  folder: string
  favorite?: boolean
  visibility?: string
}

export type StudioSnippetBody = {
  id: string
  name: string
  description: string
  sql: string
  folder: string
  favorite: string
  visibility: string
}

export type SnippetSource = 'api' | 'local'

export const SNIPPETS_STORAGE_KEY = 'rig.studio.sqlSnippets'

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

function studioInit(init?: RequestInit, role?: ImpersonationRole): RequestInit {
  return {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(role && role !== 'postgres' ? { 'X-Rig-Role': role } : {}),
      ...(role === 'authenticated' && useRoleStore.getState().uid.trim()
        ? { 'X-Rig-User': useRoleStore.getState().uid.trim() }
        : {}),
      ...init?.headers,
    },
  }
}

async function readBody(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(explainStatus(response.status, text))
  }
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function cellText(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function textMap(value: unknown): Record<string, string> | null {
  const row = asRecord(value)
  if (!row) return null
  const next: Record<string, string> = {}
  for (const [key, item] of Object.entries(row)) {
    next[key] = cellText(item)
  }
  return next
}

function textMaps(value: unknown): Record<string, string>[] {
  if (!Array.isArray(value)) return []
  return value.map(textMap).filter((row): row is Record<string, string> => row !== null)
}

function boolish(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') return value === 'true' || value === '1' || value.toLowerCase() === 'yes'
  return false
}

export function oneStudioStatement(sql: string): string {
  let text = sql.trim()
  while (text.endsWith(';')) {
    text = text.slice(0, -1).trimEnd()
  }
  return text
}

function looksLikeRead(sql: string): boolean {
  const lowered = sql.toLowerCase()
  if (lowered.includes('insert into')) return false
  if (lowered.includes('delete from')) return false
  if (lowered.includes('update ')) return false
  if (lowered.includes('create table')) return false
  if (lowered.includes('create index')) return false
  if (lowered.includes('create view')) return false
  if (lowered.includes('create trigger')) return false
  if (lowered.includes('create unique')) return false
  if (lowered.includes('alter table')) return false
  if (lowered.includes('drop table')) return false
  if (lowered.includes('drop index')) return false
  if (lowered.includes('drop view')) return false
  if (lowered.includes('explain')) return true
  if (lowered.includes('pragma')) return true
  if (lowered.includes('select')) return true
  if (lowered.includes('with ')) return true
  return false
}

function writeCount(rows: SqlRow[]): number | undefined {
  if (rows.length !== 1) return undefined
  const row = rows[0]
  if (!row) return undefined
  const keys = Object.keys(row)
  if (keys.length !== 1 || keys[0] !== 'count') return undefined
  const n = Number(row.count)
  return Number.isFinite(n) ? n : undefined
}

function readLocalSnippets(): SqlSnippet[] {
  try {
    const raw = localStorage.getItem(SNIPPETS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed.map((item) => normalizeSnippet(item, true)).filter((item): item is SqlSnippet => item !== null)
  } catch {
    return []
  }
}

function writeLocalSnippets(snippets: SqlSnippet[]) {
  localStorage.setItem(SNIPPETS_STORAGE_KEY, JSON.stringify(snippets))
}

function normalizeSnippet(value: unknown, local = false): SqlSnippet | null {
  const row = textMap(value)
  if (!row) return null
  const id = row.id ?? ''
  const name = row.name ?? ''
  if (!id || !name) return null
  const folder = row.folder || 'Private'
  return {
    id,
    name,
    description: row.description ?? '',
    sql: row.sql ?? '',
    folder,
    favorite: boolish(row.favorite) || folder === 'Favorites',
    visibility: row.visibility || (folder === 'Shared' ? 'shared' : 'private'),
    updated_at: row.updated_at || new Date().toISOString(),
    local,
  }
}

function pragmaColumn(row: Record<string, string>): PgMetaColumn | null {
  const parsed = readPragmaColumn(row)
  if (!parsed) return null
  return {
    name: parsed.name,
    type: parsed.type,
    pk: parsed.pk,
    nullable: parsed.nullable,
    cid: parsed.cid,
    notnull: parsed.notnull,
    dflt_value: parsed.dflt_value,
  }
}

function normalizeTable(value: unknown): PgMetaTable | null {
  const row = asRecord(value)
  if (!row) return null
  const name = cellText(row.name)
  if (!name) return null
  const columns = textMaps(row.columns).map(pragmaColumn).filter((column): column is PgMetaColumn => column !== null)
  return {
    schema: 'public',
    name,
    kind: cellText(row.kind) || 'table',
    sql: cellText(row.sql),
    row_count: cellText(row.row_count) || '0',
    rls_enabled: cellText(row.rls_enabled) || 'false',
    columns,
    foreign_keys: textMaps(row.foreign_keys),
    indexes: textMaps(row.indexes),
  }
}

export function parseSqlResult(payload: unknown, elapsedMs: number, sql = ''): SqlRunResult {
  const rows = textMaps(payload)
  if (!looksLikeRead(sql)) {
    const affected = writeCount(rows)
    if (affected !== undefined) {
      return { columns: [], rows: [], ms: elapsedMs, affected }
    }
  }
  const columns = rows[0] ? Object.keys(rows[0]) : []
  return { columns, rows, ms: elapsedMs }
}

function snippetBody(input: SnippetWrite | SqlSnippet): StudioSnippetBody {
  const favorite = 'favorite' in input && typeof input.favorite === 'boolean' ? input.favorite : false
  return {
    id: input.id || `snp-${crypto.randomUUID()}`,
    name: input.name,
    description: input.description ?? '',
    sql: input.sql,
    folder: input.folder || 'Private',
    favorite: (favorite || input.folder === 'Favorites') ? 'true' : 'false',
    visibility: input.visibility || (input.folder === 'Shared' ? 'shared' : 'private'),
  }
}

export async function runStudioSql(
  sql: string,
  role: ImpersonationRole,
  signal?: AbortSignal,
): Promise<SqlRunResult> {
  const statement = oneStudioStatement(sql)
  const started = performance.now()
  const response = await fetch(
    '/studio-api/sql',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({ sql: statement }),
        signal,
      },
      role,
    ),
  )
  const payload = await readBody(response)
  return parseSqlResult(payload, Math.round(performance.now() - started), statement)
}

async function readTableList(response: Response): Promise<PgMetaTable[]> {
  const payload = await readBody(response)
  return (Array.isArray(payload) ? payload : []).map(normalizeTable).filter((table): table is PgMetaTable => table !== null)
}

export async function fetchPgMetaTables(role: ImpersonationRole): Promise<PgMetaTable[]> {
  const response = await fetch('/studio-api/pg-meta/tables', studioInit(undefined, role))
  if (response.status === 404) {
    const fallback = await fetch('/studio-api/tables', studioInit(undefined, role))
    return readTableList(fallback)
  }
  return readTableList(response)
}

export async function listSnippets(role: ImpersonationRole): Promise<{ snippets: SqlSnippet[]; source: SnippetSource }> {
  const response = await fetch('/studio-api/snippets', studioInit(undefined, role))
  if (response.status === 404) {
    return { snippets: readLocalSnippets(), source: 'local' }
  }
  const payload = await readBody(response)
  const snippets = (Array.isArray(payload) ? payload : [])
    .map((item) => normalizeSnippet(item, false))
    .filter((item): item is SqlSnippet => item !== null)
  return { snippets, source: 'api' }
}

export async function saveSnippet(
  body: SnippetWrite,
  role: ImpersonationRole,
  source: SnippetSource,
): Promise<SqlSnippet> {
  const sent = snippetBody(body)
  const snippet: SqlSnippet = {
    id: sent.id,
    name: sent.name,
    description: sent.description,
    sql: sent.sql,
    folder: sent.folder,
    favorite: sent.favorite === 'true',
    visibility: sent.visibility,
    updated_at: new Date().toISOString(),
    local: source === 'local',
  }

  if (source === 'local') {
    writeLocalSnippets([snippet, ...readLocalSnippets().filter((item) => item.id !== snippet.id)])
    return snippet
  }

  const response = await fetch(
    '/studio-api/snippets',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(sent),
      },
      role,
    ),
  )
  if (response.status === 404) {
    snippet.local = true
    writeLocalSnippets([snippet, ...readLocalSnippets().filter((item) => item.id !== snippet.id)])
    return snippet
  }
  await readBody(response)
  return snippet
}

export async function deleteSnippet(snippet: SqlSnippet, role: ImpersonationRole, source: SnippetSource): Promise<void> {
  if (source === 'local') {
    writeLocalSnippets(readLocalSnippets().filter((item) => item.id !== snippet.id))
    return
  }
  const sent = snippetBody(snippet)
  const response = await fetch(
    '/studio-api/snippets/delete',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(sent),
      },
      role,
    ),
  )
  if (response.status === 404) {
    writeLocalSnippets(readLocalSnippets().filter((item) => item.id !== snippet.id))
    return
  }
  await readBody(response)
}
