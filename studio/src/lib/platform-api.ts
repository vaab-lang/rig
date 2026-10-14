import { explainStatus, fetchAuthHealth, fetchHealth, type Health } from '@/lib/api'
import type { ImpersonationRole } from '@/lib/role-store'

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

export type AdvisorSeverity = 'ERROR' | 'WARN' | 'INFO'
export type AdvisorCategory = 'security' | 'performance'

export type AdvisorRow = {
  id: string
  ts: string
  service: string
  level: string
  status_code: string
  method: string
  path: string
  msg: string
  duration_ms: string
}

export type AdvisorFinding = {
  id: string
  title: string
  detail: string
  severity: AdvisorSeverity
  category: AdvisorCategory
  entity: string
  autofix: string
}

export type StudioLog = {
  id: string
  ts: string
  service: string
  level: string
  status_code: string
  method: string
  path: string
  msg: string
  duration_ms: string
}

export type StudioLogQuery = {
  service: string
  level: string
  sql: string
}

export type LogWindow = {
  service?: string
  q?: string
  from?: string
  to?: string
}

export type EdgeFunction = {
  id: string
  slug: string
  name: string
  status: string
  version: string
  entrypoint_path: string
  verify_jwt: boolean
  code: string
  created_at: string
  updated_at: string
}

export type StudioFunctionBody = {
  id: string
  slug: string
  name: string
  status: string
  version: string
  entrypoint_path: string
  verify_jwt: string
  code: string
  invoke: string
  method: string
  headers: string
  body: string
}

export type FunctionWrite = {
  id?: string
  slug: string
  name?: string
  status?: string
  version?: string
  entrypoint_path?: string
  verify_jwt?: boolean
  code?: string
}

export type FunctionInvoke = {
  slug: string
  method?: string
  headers?: string
  body?: string
}

export type FunctionInvokeResult = {
  count: number
  invoked: boolean
  status: string
  body: string
  duration_ms: string
}

export type PragmaColumn = {
  cid: string
  name: string
  type: string
  notnull: string
  dflt_value: string
  pk: string
}

export type StudioTableInfo = {
  name: string
  schema: string
  kind: string
  sql: string
  row_count: string
  rls_enabled: string
  columns: PragmaColumn[]
  foreign_keys: Record<string, string>[]
  indexes: Record<string, string>[]
}

export type GatewayHealth = Health & {
  engine?: string
  database?: string
  compute?: string
}

export type IntervalKey = '60m' | '24h' | '7d'

function studioInit(init?: RequestInit, role?: ImpersonationRole): RequestInit {
  return {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(role && role !== 'postgres' ? { 'X-Rig-Role': role } : {}),
      ...init?.headers,
    },
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null
}

function asString(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  return String(value)
}

function asBool(value: unknown): boolean {
  if (value === true || value === 1) return true
  if (typeof value === 'string') {
    const v = value.trim().toLowerCase()
    return v === 'true' || v === '1' || v === 'yes' || v === 'on'
  }
  return false
}

function asRows(data: unknown): unknown[] {
  return Array.isArray(data) ? data : []
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!response.ok) {
    throw new Error(explainStatus(response.status, text))
  }
  if (!text) return null
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error(text || `HTTP ${response.status}`)
  }
}

export async function fetchGatewayHealth(): Promise<GatewayHealth> {
  return (await fetchHealth()) as GatewayHealth
}

export async function fetchAuthServiceHealth(): Promise<Health> {
  return fetchAuthHealth()
}

export function databaseEngine(health: GatewayHealth | null): string {
  const raw = health?.engine ?? health?.database ?? health?.name ?? ''
  if (/postgres/i.test(raw)) return 'Postgres'
  if (/sqlite/i.test(raw)) return 'SQLite'
  return 'SQLite'
}

export function computeClass(health: GatewayHealth | null): string {
  const raw = health?.compute?.trim()
  return raw || 'Not reported'
}

export function intervalRange(interval: IntervalKey): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  if (interval === '60m') from.setMinutes(from.getMinutes() - 60)
  else if (interval === '24h') from.setHours(from.getHours() - 24)
  else from.setDate(from.getDate() - 7)
  return { from: from.toISOString(), to: to.toISOString() }
}

export function parseLogTs(value: string): number {
  if (!value) return Number.NaN
  const asNum = Number(value)
  if (Number.isFinite(asNum) && asNum > 1e11) return asNum
  if (Number.isFinite(asNum) && asNum > 1e9) return asNum * 1000
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : Number.NaN
}

function severityOf(level: string): AdvisorSeverity {
  const upper = level.trim().toUpperCase()
  if (upper === 'ERROR') return 'ERROR'
  if (upper === 'WARN') return 'WARN'
  return 'INFO'
}

function categoryFromMsg(msg: string): AdvisorCategory {
  const lower = msg.toLowerCase()
  if (lower.includes('unindexed foreign key') || lower.includes('missing primary key')) return 'performance'
  return 'security'
}

function entityFromMsg(msg: string): string {
  const fk = msg.match(/unindexed foreign key\s+([a-zA-Z_][\w]*\.[a-zA-Z_][\w]*)/i)
  if (fk?.[1]) return fk[1]
  const named = msg.match(/(?:exposed view|table missing primary key|table without RLS policies)\s+([a-zA-Z_][\w]*)/i)
  return named?.[1] ?? ''
}

function autofixFor(msg: string, entity: string): string {
  const lower = msg.toLowerCase()
  const table = entity.includes('.') ? entity.split('.')[0]! : entity || 'items'
  const column = entity.includes('.') ? entity.split('.')[1]! : 'id'
  if (lower.includes('unindexed foreign key')) {
    return `create index if not exists idx_${table}_${column} on ${table} (${column});`
  }
  if (lower.includes('missing primary key')) {
    return `-- add a primary key\n-- alter table ${table} add column id text primary key;`
  }
  if (lower.includes('without rls')) {
    return `-- enable rls and add a read policy\n-- alter table ${table} enable row level security;\ncreate policy "${table}_select_all" on ${table} for select using (true);`
  }
  if (lower.includes('exposed view')) {
    return `-- review grants on view ${table}\n-- revoke all on ${table} from anon;`
  }
  return `-- review ${msg}`
}

export function normalizeLog(raw: unknown, index: number): StudioLog | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  return {
    id: asString(o.id, `log-${index}`),
    ts: asString(o.ts),
    service: asString(o.service),
    level: asString(o.level),
    status_code: asString(o.status_code),
    method: asString(o.method),
    path: asString(o.path),
    msg: asString(o.msg),
    duration_ms: asString(o.duration_ms, '0'),
  }
}

export function normalizeAdvisor(raw: unknown, index: number): AdvisorFinding | null {
  const row = normalizeLog(raw, index)
  if (!row || !row.msg) return null
  const entity = entityFromMsg(row.msg)
  return {
    id: row.id,
    title: row.msg,
    detail: row.msg,
    severity: severityOf(row.level),
    category: categoryFromMsg(row.msg),
    entity,
    autofix: autofixFor(row.msg, entity),
  }
}

export function normalizeFunction(raw: unknown, index: number): EdgeFunction | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const slug = asString(o.slug)
  if (!slug && !asString(o.id)) return null
  return {
    id: asString(o.id, slug || `fn-${index}`),
    slug: slug || asString(o.id),
    name: asString(o.name),
    status: asString(o.status, 'draft'),
    version: asString(o.version, '1'),
    entrypoint_path: asString(o.entrypoint_path, 'index.ts'),
    verify_jwt: asBool(o.verify_jwt),
    code: asString(o.code),
    created_at: asString(o.created_at),
    updated_at: asString(o.updated_at),
  }
}

function normalizePragmaColumn(raw: unknown, index: number): PragmaColumn {
  const o = asRecord(raw) ?? {}
  return {
    cid: asString(o.cid, String(index)),
    name: asString(o.name, `col_${index}`),
    type: asString(o.type, 'TEXT'),
    notnull: asString(o.notnull, '0'),
    dflt_value: asString(o.dflt_value),
    pk: asString(o.pk, '0'),
  }
}

function normalizeMapRows(raw: unknown): Record<string, string>[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const o = asRecord(item) ?? {}
    return Object.fromEntries(Object.entries(o).map(([key, value]) => [key, asString(value)]))
  })
}

export function normalizeTable(raw: unknown): StudioTableInfo | null {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  const name = asString(o.name)
  if (!name) return null
  const columnsRaw = Array.isArray(o.columns) ? o.columns : []
  return {
    name,
    schema: asString(o.schema ?? o.schema_name ?? o.nspname),
    kind: asString(o.kind, 'table'),
    sql: asString(o.sql),
    row_count: asString(o.row_count, '0'),
    rls_enabled: asString(o.rls_enabled, 'false'),
    columns: columnsRaw.map((column, index) => normalizePragmaColumn(column, index)),
    foreign_keys: normalizeMapRows(o.foreign_keys),
    indexes: normalizeMapRows(o.indexes),
  }
}

function functionBody(partial: {
  id?: string
  slug: string
  name?: string
  status?: string
  version?: string
  entrypoint_path?: string
  verify_jwt?: boolean | string
  code?: string
  invoke: string
  method?: string
  headers?: string
  body?: string
}): StudioFunctionBody {
  return {
    id: partial.id ?? '',
    slug: partial.slug,
    name: partial.name ?? partial.slug,
    status: partial.status ?? 'active',
    version: partial.version ?? '1',
    entrypoint_path: partial.entrypoint_path ?? 'index.ts',
    verify_jwt: partial.verify_jwt === false || partial.verify_jwt === 'false' ? 'false' : 'true',
    code: partial.code ?? '',
    invoke: partial.invoke,
    method: partial.method ?? '',
    headers: partial.headers ?? '',
    body: partial.body ?? '',
  }
}

function invokeResult(payload: unknown): FunctionInvokeResult {
  const record = asRecord(payload) ?? {}
  return {
    count: Number(record.count ?? 0),
    invoked: asBool(record.invoked),
    status: asString(record.status),
    body: asString(record.body),
    duration_ms: asString(record.duration_ms, '0'),
  }
}

export async function fetchAdvisors(role?: ImpersonationRole): Promise<AdvisorFinding[]> {
  const response = await fetch('/studio-api/advisors', studioInit(undefined, role))
  const payload = await readJson(response)
  return asRows(payload)
    .map((item, index) => normalizeAdvisor(item, index))
    .filter((item): item is AdvisorFinding => item !== null)
}

export async function fetchLogs(role?: ImpersonationRole): Promise<StudioLog[]> {
  const response = await fetch('/studio-api/logs', studioInit(undefined, role))
  const payload = await readJson(response)
  return asRows(payload)
    .map((item, index) => normalizeLog(item, index))
    .filter((item): item is StudioLog => item !== null)
}

export async function queryLogs(body: StudioLogQuery, role?: ImpersonationRole): Promise<StudioLog[]> {
  const response = await fetch(
    '/studio-api/logs',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify({
          service: body.service,
          level: body.level,
          sql: body.sql,
        } satisfies StudioLogQuery),
      },
      role,
    ),
  )
  const payload = await readJson(response)
  return asRows(payload)
    .map((item, index) => normalizeLog(item, index))
    .filter((item): item is StudioLog => item !== null)
}

export async function fetchFunctions(role?: ImpersonationRole): Promise<EdgeFunction[]> {
  const response = await fetch('/studio-api/functions', studioInit(undefined, role))
  const payload = await readJson(response)
  return asRows(payload)
    .map((item, index) => normalizeFunction(item, index))
    .filter((item): item is EdgeFunction => item !== null)
}

export async function saveFunction(body: FunctionWrite, role?: ImpersonationRole): Promise<FunctionInvokeResult> {
  const payload = functionBody({ ...body, invoke: '' })
  const response = await fetch(
    '/studio-api/functions',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      role,
    ),
  )
  return invokeResult(await readJson(response))
}

export async function invokeFunction(body: FunctionInvoke, role?: ImpersonationRole): Promise<FunctionInvokeResult> {
  const payload = functionBody({
    id: '',
    slug: body.slug,
    name: body.slug,
    status: '',
    version: '',
    entrypoint_path: '',
    verify_jwt: 'true',
    code: '',
    invoke: 'true',
    method: body.method ?? 'POST',
    headers: body.headers ?? '',
    body: body.body ?? '',
  })
  const response = await fetch(
    '/studio-api/functions',
    studioInit(
      {
        method: 'POST',
        headers: jsonHeaders,
        body: JSON.stringify(payload),
      },
      role,
    ),
  )
  return invokeResult(await readJson(response))
}

export async function fetchStudioTables(role?: ImpersonationRole): Promise<StudioTableInfo[]> {
  const response = await fetch('/studio-api/tables', studioInit(undefined, role))
  const payload = await readJson(response)
  return asRows(payload).map(normalizeTable).filter((item): item is StudioTableInfo => item !== null)
}

export async function fetchPgMetaTables(role?: ImpersonationRole): Promise<StudioTableInfo[]> {
  const response = await fetch('/studio-api/pg-meta/tables', studioInit(undefined, role))
  const payload = await readJson(response)
  return asRows(payload).map(normalizeTable).filter((item): item is StudioTableInfo => item !== null)
}

export function filterLogs(logs: StudioLog[], query: LogWindow): StudioLog[] {
  const fromMs = query.from ? parseLogTs(query.from) : Number.NaN
  const toMs = query.to ? parseLogTs(query.to) : Number.NaN
  const needle = query.q?.trim().toLowerCase() ?? ''
  return logs.filter((log) => {
    if (query.service && log.service !== query.service) return false
    const ts = parseLogTs(log.ts)
    if (Number.isFinite(fromMs) && Number.isFinite(ts) && ts < fromMs) return false
    if (Number.isFinite(toMs) && Number.isFinite(ts) && ts > toMs) return false
    if (!needle) return true
    const hay = `${log.msg} ${log.path} ${log.method} ${log.level} ${log.status_code}`.toLowerCase()
    return hay.includes(needle)
  })
}

export function bucketLogs(logs: StudioLog[], interval: IntervalKey): { label: string; value: number; start: number }[] {
  const { from, to } = intervalRange(interval)
  const fromMs = Date.parse(from)
  const toMs = Date.parse(to)
  const steps = interval === '60m' ? 12 : interval === '24h' ? 24 : 7
  const span = toMs - fromMs
  const step = span / steps
  const buckets = Array.from({ length: steps }, (_, i) => {
    const start = fromMs + i * step
    const date = new Date(start)
    const label =
      interval === '7d'
        ? date.toLocaleDateString(undefined, { weekday: 'short' })
        : date.toLocaleTimeString(undefined, { hour: '2-digit', minute: interval === '60m' ? '2-digit' : undefined })
    return { label, value: 0, start }
  })
  for (const log of logs) {
    const ts = parseLogTs(log.ts)
    if (!Number.isFinite(ts) || ts < fromMs || ts > toMs) continue
    const index = Math.min(steps - 1, Math.max(0, Math.floor((ts - fromMs) / step)))
    const bucket = buckets[index]
    if (bucket) bucket.value += 1
  }
  return buckets
}

export function advisorCounts(findings: AdvisorFinding[]): { error: number; warn: number; info: number } {
  return findings.reduce(
    (acc, item) => {
      if (item.severity === 'ERROR') acc.error += 1
      else if (item.severity === 'WARN') acc.warn += 1
      else acc.info += 1
      return acc
    },
    { error: 0, warn: 0, info: 0 },
  )
}

export function logToRow(log: StudioLog): Record<string, string> {
  return {
    id: log.id,
    ts: log.ts,
    service: log.service,
    level: log.level,
    status_code: log.status_code,
    method: log.method,
    path: log.path,
    msg: log.msg,
    duration_ms: log.duration_ms,
  }
}

export const DEFAULT_LOG_SQL =
  'select id, ts, service, level, status_code, method, path, msg, duration_ms from studio_logs order by ts desc limit 100'

export const LOG_SERVICE_BY_PATH: Record<string, string> = {
  '/logs/api': 'api',
  '/logs/postgres': 'postgres',
  '/logs/auth': 'auth',
  '/logs/storage': 'storage',
  '/logs/functions': 'edge-functions',
  '/logs/realtime': 'realtime',
}

export const OBS_SERVICE_BY_PATH: Record<string, string | undefined> = {
  '/observability': undefined,
  '/observability/api': 'api',
  '/observability/postgres': 'postgres',
  '/observability/auth': 'auth',
  '/observability/storage': 'storage',
  '/observability/queries': 'postgres',
}
