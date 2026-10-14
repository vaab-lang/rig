const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

export type SqlRow = Record<string, string>

export type PgColumn = {
  name: string
  type: string
  pk: boolean
  fk: boolean
  nullable: boolean
  defaultValue: string
}

export type PgForeignKey = {
  sourceTable: string
  sourceCol: string
  targetTable: string
  targetCol: string
}

export type PgIndex = {
  name: string
  sql: string
}

export type PgTable = {
  name: string
  schema: string
  kind: string
  sql: string
  rowCount: string
  rlsEnabled: boolean
  columns: PgColumn[]
  foreignKeys: PgForeignKey[]
  indexes: PgIndex[]
}

export type PolicyRow = {
  id: string
  schema_name: string
  table_name: string
  name: string
  action: string
  roles: string
  command: string
  definition: string
  check_expr: string
  rls_enabled: string
}

export type PolicyBody = PolicyRow

export type MigrationRow = {
  version: string
  name: string
  statements: string
  applied_at: string
}

export type WebhookRow = {
  id: string
  name: string
  table_name: string
  events: string
  url: string
  method: string
  headers: string
  enabled: string
  created_at: string
}

export type DatabaseSettingsView = {
  max_rows: string
  exposed_schemas: string
  statement_timeout: string
}

export type SqlResult = {
  rows: SqlRow[]
  count?: number
}

export const POLICY_TEMPLATES = [
  {
    id: 'read-all',
    name: 'Enable read access for all users',
    command: 'SELECT',
    roles: 'public',
    definition: 'true',
    check_expr: '',
  },
  {
    id: 'insert-auth',
    name: 'Enable insert for authenticated users only',
    command: 'INSERT',
    roles: 'authenticated',
    definition: 'true',
    check_expr: 'true',
  },
  {
    id: 'update-uid',
    name: 'Enable update for users based on user_id',
    command: 'UPDATE',
    roles: 'authenticated',
    definition: 'auth.uid() = user_id',
    check_expr: '',
  },
  {
    id: 'delete-uid',
    name: 'Enable delete for users based on user_id',
    command: 'DELETE',
    roles: 'authenticated',
    definition: 'auth.uid() = user_id',
    check_expr: '',
  },
] as const

export const DEFAULT_DB_SETTINGS: DatabaseSettingsView = {
  max_rows: '1000',
  exposed_schemas: 'public',
  statement_timeout: '8s',
}

const SETTINGS_KEY = 'rig.studio.databaseSettings'

function explainStatus(status: number, text: string): string {
  if (status === 401) return 'Studio auth required. Reload and enter Basic credentials.'
  return text || `HTTP ${status}`
}

function studioInit(init?: RequestInit): RequestInit {
  return {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...init?.headers,
    },
  }
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(explainStatus(response.status, text))
  }
  const text = await response.text()
  if (!text) return [] as T
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(text)
  }
}

function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === 'object' && !Array.isArray(value)) return value as Record<string, unknown>
  return {}
}

function stringify(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

export function asSqlRow(value: unknown): SqlRow {
  const rec = asRecord(value)
  const row: SqlRow = {}
  for (const [key, item] of Object.entries(rec)) row[key] = stringify(item)
  return row
}

function pick(record: Record<string, unknown>, keys: string[], fallback = ''): string {
  for (const key of keys) {
    const value = record[key]
    if (value != null && stringify(value) !== '') return stringify(value)
  }
  return fallback
}

function truthy(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const next = value.trim().toLowerCase()
    if (next === 'true' || next === 'yes' || next === 'on') return true
    if (next === 'false' || next === 'no' || next === 'off' || next === '') return false
    const numeric = Number(next)
    return Number.isFinite(numeric) && numeric !== 0
  }
  return false
}

function policyBody(input: Partial<PolicyRow> & { id?: string }): PolicyRow {
  return {
    id: input.id ?? '',
    schema_name: input.schema_name || 'public',
    table_name: input.table_name ?? '',
    name: input.name ?? '',
    action: input.action || 'PERMISSIVE',
    roles: input.roles || 'public',
    command: input.command || 'SELECT',
    definition: input.definition || 'true',
    check_expr: input.check_expr ?? '',
    rls_enabled: input.rls_enabled || 'false',
  }
}

function webhookBody(input: Partial<WebhookRow>): {
  id: string
  name: string
  table_name: string
  events: string
  url: string
  method: string
  headers: string
  enabled: string
} {
  return {
    id: input.id ?? '',
    name: input.name ?? '',
    table_name: input.table_name ?? '',
    events: input.events ?? '',
    url: input.url ?? '',
    method: input.method || 'POST',
    headers: input.headers ?? '',
    enabled: input.enabled || 'true',
  }
}

function splitSqlStatements(sql: string): string[] {
  return sql
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean)
}

function withoutSemicolons(sql: string): string {
  return sql.replaceAll(';', '').trim()
}

function isWriteCountRows(rows: unknown[]): boolean {
  return (
    rows.length > 0 &&
    rows.every((row) => {
      const rec = asRecord(row)
      const keys = Object.keys(rec)
      return keys.length === 1 && keys[0] === 'count'
    })
  )
}

function quoteIdent(value: string): string {
  return `"${value.replaceAll('"', '""')}"`
}

function sqlString(value: string): string {
  return `'${value.replaceAll("'", "''")}'`
}

export function emptyTable(name: string, schema = 'public'): PgTable {
  return {
    name,
    schema,
    kind: 'table',
    sql: '',
    rowCount: '',
    rlsEnabled: false,
    columns: [],
    foreignKeys: [],
    indexes: [],
  }
}

function normalizeColumn(raw: unknown): PgColumn {
  const rec = asRecord(raw)
  return {
    name: pick(rec, ['name']),
    type: pick(rec, ['type'], 'text'),
    pk: truthy(rec.pk),
    fk: false,
    nullable: !truthy(rec.notnull),
    defaultValue: pick(rec, ['dflt_value']),
  }
}

function normalizeForeignKey(raw: unknown, fallbackTable: string): PgForeignKey {
  const rec = asRecord(raw)
  return {
    sourceTable: fallbackTable,
    sourceCol: pick(rec, ['from']),
    targetTable: pick(rec, ['table']),
    targetCol: pick(rec, ['to']),
  }
}

export function normalizeTable(raw: unknown): PgTable {
  const rec = asRecord(raw)
  const name = pick(rec, ['name'], 'unknown')
  const kindRaw = pick(rec, ['kind'], 'table').toLowerCase()
  const columns = (Array.isArray(rec.columns) ? rec.columns : []).map(normalizeColumn).filter((col) => col.name)
  const foreignKeys = (Array.isArray(rec.foreign_keys) ? rec.foreign_keys : [])
    .map((item) => normalizeForeignKey(item, name))
    .filter((fk) => fk.sourceCol && fk.targetTable)
  const fkCols = new Set(foreignKeys.map((fk) => fk.sourceCol))
  const indexesRaw = Array.isArray(rec.indexes) ? rec.indexes : []
  return {
    name,
    schema: 'public',
    kind: kindRaw.includes('view') ? 'view' : 'table',
    sql: pick(rec, ['sql']),
    rowCount: pick(rec, ['row_count']),
    rlsEnabled: truthy(rec.rls_enabled),
    columns: columns.map((col) => (fkCols.has(col.name) ? { ...col, fk: true } : col)),
    foreignKeys,
    indexes: indexesRaw.map((item) => {
      const index = asRecord(item)
      return { name: pick(index, ['name']), sql: pick(index, ['unique', 'origin']) }
    }),
  }
}

function normalizePolicy(raw: unknown): PolicyRow {
  const rec = asRecord(raw)
  return {
    id: pick(rec, ['id']),
    schema_name: pick(rec, ['schema_name', 'schema'], 'public'),
    table_name: pick(rec, ['table_name', 'table']),
    name: pick(rec, ['name', 'policy_name']),
    action: pick(rec, ['action']),
    roles: pick(rec, ['roles']),
    command: pick(rec, ['command', 'cmd'], 'SELECT'),
    definition: pick(rec, ['definition', 'using', 'qual']),
    check_expr: pick(rec, ['check_expr', 'check', 'with_check']),
    rls_enabled: pick(rec, ['rls_enabled'], truthy(rec.rls_enabled) ? 'true' : 'false'),
  }
}

function normalizeMigration(raw: unknown): MigrationRow {
  const rec = asRecord(raw)
  return {
    version: pick(rec, ['version']),
    name: pick(rec, ['name']),
    statements: pick(rec, ['statements', 'sql']),
    applied_at: pick(rec, ['applied_at', 'appliedAt']),
  }
}

function normalizeWebhook(raw: unknown): WebhookRow {
  const rec = asRecord(raw)
  const enabled = rec.enabled
  return {
    id: pick(rec, ['id']),
    name: pick(rec, ['name']),
    table_name: pick(rec, ['table_name', 'table']),
    events: pick(rec, ['events']),
    url: pick(rec, ['url']),
    method: pick(rec, ['method'], 'POST'),
    headers: pick(rec, ['headers'], '{}'),
    enabled: enabled == null ? 'true' : truthy(enabled) ? 'true' : 'false',
    created_at: pick(rec, ['created_at', 'createdAt']),
  }
}

function normalizeSettings(raw: unknown): DatabaseSettingsView {
  const rec = asRecord(raw)
  return {
    max_rows: pick(rec, ['max_rows', 'maxRows'], DEFAULT_DB_SETTINGS.max_rows),
    exposed_schemas: pick(rec, ['exposed_schemas', 'exposedSchemas', 'schemas'], DEFAULT_DB_SETTINGS.exposed_schemas),
    statement_timeout: pick(rec, ['statement_timeout', 'statementTimeout'], DEFAULT_DB_SETTINGS.statement_timeout),
  }
}

export async function runStudioSql(sql: string): Promise<SqlResult> {
  const statement = withoutSemicolons(sql)
  if (!statement) throw new Error('empty sql')
  const response = await fetch(
    '/studio-api/sql',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ sql: statement }),
    }),
  )
  const data = await readJson<unknown>(response)
  if (Array.isArray(data)) {
    if (isWriteCountRows(data)) {
      const count = Number(asRecord(data[0]).count)
      return { rows: [], count: Number.isFinite(count) ? count : 0 }
    }
    return { rows: data.map(asSqlRow) }
  }
  return { rows: [] }
}

async function fetchJsonList(path: string): Promise<unknown[]> {
  const response = await fetch(path, studioInit())
  const data = await readJson<unknown>(response)
  return Array.isArray(data) ? data : []
}

export async function fetchPgMetaTables(): Promise<PgTable[]> {
  const list = await fetchJsonList('/studio-api/pg-meta/tables')
  return list.map(normalizeTable).filter((table) => table.name)
}

export async function fetchStudioTables(): Promise<PgTable[]> {
  const list = await fetchJsonList('/studio-api/tables')
  return list.map(normalizeTable).filter((table) => table.name)
}

export async function loadDatabaseTables(): Promise<PgTable[]> {
  try {
    return await fetchStudioTables()
  } catch (err) {
    try {
      return await fetchPgMetaTables()
    } catch {
      throw err instanceof Error ? err : new Error('Failed to load tables')
    }
  }
}

export async function listPolicies(): Promise<PolicyRow[]> {
  const list = await fetchJsonList('/studio-api/policies')
  return list.map(normalizePolicy)
}

export async function savePolicy(body: PolicyBody): Promise<unknown> {
  const response = await fetch(
    '/studio-api/policies',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(policyBody(body)),
    }),
  )
  return readJson(response)
}

export async function deletePolicy(id: string): Promise<unknown> {
  const response = await fetch(
    '/studio-api/policies/delete',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(policyBody({ id })),
    }),
  )
  return readJson(response)
}

export async function listMigrations(): Promise<MigrationRow[]> {
  const list = await fetchJsonList('/studio-api/migrations')
  return list.map(normalizeMigration)
}

async function postMigration(body: { version: string; name: string; statements: string }): Promise<unknown> {
  const response = await fetch(
    '/studio-api/migrations',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        version: body.version,
        name: body.name,
        statements: withoutSemicolons(body.statements),
      }),
    }),
  )
  return readJson(response)
}

export async function saveMigration(body: { version: string; name: string; statements: string }): Promise<unknown> {
  const parts = splitSqlStatements(body.statements)
  if (!parts.length) throw new Error('empty sql')
  let last: unknown
  for (let index = 0; index < parts.length; index += 1) {
    const version = parts.length === 1 ? body.version : `${body.version}${String(index + 1).padStart(2, '0')}`
    last = await postMigration({
      version,
      name: body.name,
      statements: parts[index] ?? '',
    })
  }
  return last
}

export async function listWebhooks(): Promise<WebhookRow[]> {
  const list = await fetchJsonList('/studio-api/webhooks')
  return list.map(normalizeWebhook)
}

export async function saveWebhook(body: Omit<WebhookRow, 'created_at'> | WebhookRow): Promise<unknown> {
  const response = await fetch(
    '/studio-api/webhooks',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(webhookBody(body)),
    }),
  )
  return readJson(response)
}

function isAuthError(err: Error): boolean {
  return err.message.includes('Studio auth required')
}

export async function listSqlObjects(queries: string[]): Promise<SqlRow[]> {
  for (const sql of queries) {
    try {
      return (await runStudioSql(sql)).rows
    } catch (err) {
      const error = err instanceof Error ? err : new Error('SQL failed')
      if (isAuthError(error)) throw error
    }
  }
  return []
}

export async function listIndexes(): Promise<SqlRow[]> {
  return listSqlObjects([
    "SELECT name, tbl_name AS table_name, COALESCE(sql, '') AS definition FROM sqlite_master WHERE type = 'index' AND name NOT LIKE 'sqlite_%' ORDER BY name",
    "SELECT indexname AS name, tablename AS table_name, indexdef AS definition FROM pg_indexes WHERE schemaname NOT IN ('pg_catalog', 'information_schema') ORDER BY indexname",
  ])
}

export async function listTriggers(): Promise<SqlRow[]> {
  return listSqlObjects([
    "SELECT name, tbl_name AS table_name, COALESCE(sql, '') AS definition FROM sqlite_master WHERE type = 'trigger' ORDER BY name",
    `SELECT t.tgname AS name, c.relname AS table_name, pg_get_triggerdef(t.oid) AS definition
     FROM pg_trigger t
     JOIN pg_class c ON c.oid = t.tgrelid
     WHERE NOT t.tgisinternal
     ORDER BY t.tgname`,
  ])
}

export async function listFunctions(): Promise<SqlRow[]> {
  return listSqlObjects([
    `SELECT p.proname AS name, n.nspname AS schema, pg_get_function_result(p.oid) AS result, pg_get_function_identity_arguments(p.oid) AS args
     FROM pg_proc p
     JOIN pg_namespace n ON n.oid = p.pronamespace
     WHERE n.nspname NOT IN ('pg_catalog', 'information_schema')
     ORDER BY n.nspname, p.proname`,
    "SELECT name, COALESCE(sql, '') AS definition FROM sqlite_master WHERE type = 'function' ORDER BY name",
  ])
}

export async function listEnumTypes(): Promise<SqlRow[]> {
  return listSqlObjects([
    `SELECT t.typname AS name, n.nspname AS schema, string_agg(e.enumlabel, ', ' ORDER BY e.enumsortorder) AS values
     FROM pg_type t
     JOIN pg_enum e ON t.oid = e.enumtypid
     JOIN pg_namespace n ON n.oid = t.typnamespace
     GROUP BY n.nspname, t.typname
     ORDER BY n.nspname, t.typname`,
    "SELECT name, COALESCE(sql, '') AS definition FROM sqlite_master WHERE type = 'type' ORDER BY name",
  ])
}

export async function listExtensions(): Promise<SqlRow[]> {
  return listSqlObjects([
    `SELECT name, COALESCE(default_version, '') AS version, CASE WHEN installed_version IS NULL THEN 'false' ELSE 'true' END AS installed
     FROM pg_available_extensions
     ORDER BY name`,
    'SELECT extname AS name, extversion AS version, \'true\' AS installed FROM pg_extension ORDER BY extname',
  ])
}

export async function listPublications(): Promise<SqlRow[]> {
  return listSqlObjects([
    `SELECT pubname AS name,
            CASE WHEN puballtables THEN 'true' ELSE 'false' END AS all_tables,
            CASE WHEN pubinsert THEN 'true' ELSE 'false' END AS inserts,
            CASE WHEN pubupdate THEN 'true' ELSE 'false' END AS updates,
            CASE WHEN pubdelete THEN 'true' ELSE 'false' END AS deletes
     FROM pg_publication
     ORDER BY pubname`,
  ])
}

export async function listRoles(): Promise<SqlRow[]> {
  return listSqlObjects([
    `SELECT rolname AS name,
            CASE WHEN rolsuper THEN 'true' ELSE 'false' END AS superuser,
            CASE WHEN rolcanlogin THEN 'true' ELSE 'false' END AS can_login
     FROM pg_roles
     ORDER BY rolname`,
  ])
}

function readLocalSettings(): DatabaseSettingsView {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (!raw) return { ...DEFAULT_DB_SETTINGS }
    return normalizeSettings({ ...DEFAULT_DB_SETTINGS, ...(JSON.parse(raw) as Record<string, unknown>) })
  } catch {
    return { ...DEFAULT_DB_SETTINGS }
  }
}

function writeLocalSettings(view: DatabaseSettingsView) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(view))
}

export async function loadDatabaseSettings(): Promise<{ view: DatabaseSettingsView; localOnly: boolean }> {
  return { view: readLocalSettings(), localOnly: true }
}

export async function saveDatabaseSettings(view: DatabaseSettingsView): Promise<{ localOnly: boolean }> {
  writeLocalSettings(view)
  return { localOnly: true }
}

export function tableQualifiedName(table: Pick<PgTable, 'schema' | 'name'>): string {
  return `${table.schema}.${table.name}`
}

export function synthesizeCreateTable(table: PgTable): string {
  if (table.sql.trim()) return table.sql
  const cols = table.columns.length
    ? table.columns
        .map((col) => {
          const bits = [`  ${quoteIdent(col.name)} ${col.type || 'text'}`]
          if (col.pk) bits.push('PRIMARY KEY')
          if (!col.nullable && !col.pk) bits.push('NOT NULL')
          if (col.defaultValue) bits.push(`DEFAULT ${col.defaultValue}`)
          return bits.join(' ')
        })
        .join(',\n')
    : '  id text'
  const fks = table.foreignKeys
    .map(
      (fk) =>
        `  FOREIGN KEY (${quoteIdent(fk.sourceCol)}) REFERENCES ${quoteIdent(fk.targetTable)} (${quoteIdent(fk.targetCol)})`,
    )
    .join(',\n')
  const body = [cols, fks].filter(Boolean).join(',\n')
  return `CREATE TABLE ${quoteIdent(table.name)} (\n${body}\n);`
}

export function schemaAsMarkdown(tables: PgTable[]): string {
  return tables
    .map((table) => {
      const header = `## ${tableQualifiedName(table)}`
      const rows = table.columns.length
        ? table.columns
            .map((col) => `| ${col.name} | ${col.type || 'text'} | ${col.pk ? 'yes' : ''} | ${col.fk ? 'yes' : ''} | ${col.nullable ? 'yes' : ''} |`)
            .join('\n')
        : '| (none) |  |  |  |  |'
      return `${header}\n\n| column | type | pk | fk | nullable |\n| --- | --- | --- | --- | --- |\n${rows}`
    })
    .join('\n\n')
}

export function schemaAsSql(tables: PgTable[]): string {
  return tables.map(synthesizeCreateTable).join('\n\n')
}

export function newMigrationVersion(): string {
  return new Date().toISOString().replaceAll(/[-:TZ.]/g, '').slice(0, 14)
}

export function newObjectId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return `${prefix}-${crypto.randomUUID()}`
  return `${prefix}-${Date.now()}`
}

export { quoteIdent, sqlString, truthy }
