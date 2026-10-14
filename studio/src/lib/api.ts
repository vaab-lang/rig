export type Row = Record<string, string>

export type Health = {
  name: string
  ok: boolean
  version: string
}

export type TableInfo = {
  name: string
  columns: string[]
}

export type StudioMeta = {
  auth_secret_set: boolean
  can_patch: boolean
  can_insert: boolean
}

export type AuthConfigView = {
  email_enabled: boolean
  min_password_length: string
  magic_link_enabled: boolean
  google_enabled: boolean
  google_client_id: string
  google_has_secret: boolean
  google_client_secret_last4: string
  github_enabled: boolean
  github_client_id: string
  github_has_secret: boolean
  github_client_secret_last4: string
  site_url: string
  redirect_urls: string
}

export type AuthConfigBody = {
  email_enabled: boolean
  min_password_length: string
  magic_link_enabled: boolean
  google_enabled: boolean
  google_client_id: string
  google_client_secret: string
  google_client_secret_last4: string
  github_enabled: boolean
  github_client_id: string
  github_client_secret: string
  github_client_secret_last4: string
  site_url: string
  redirect_urls: string
}

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

export function explainStatus(status: number, text: string): string {
  if (status === 401) return 'Studio auth required. Reload and enter Basic credentials.'
  return text || `HTTP ${status}`
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(explainStatus(response.status, text))
  }
  return response.json() as Promise<T>
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

export async function fetchHealth(): Promise<Health> {
  const response = await fetch('/health', { credentials: 'include' })
  return readJson(response)
}

export async function fetchAuthHealth(): Promise<Health> {
  const response = await fetch('/auth/v1/health', { credentials: 'include' })
  return readJson(response)
}

export async function fetchMeta(): Promise<StudioMeta> {
  const response = await fetch('/studio-api/meta', studioInit())
  return readJson(response)
}

export async function listTables(): Promise<TableInfo[]> {
  const response = await fetch('/studio-api/tables', studioInit())
  return readJson(response)
}

export async function listRows(table: string): Promise<Row[]> {
  const response = await fetch(`/rest/v1/${encodeURIComponent(table)}`, studioInit())
  return readJson(response)
}

export async function insertRow(body: {
  table: string
  id?: string
  title?: string
  owner?: string
  email?: string
  name?: string
  done?: string
}): Promise<unknown> {
  const response = await fetch(
    '/studio-api/rows',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({
        table: body.table,
        id: body.id ?? '',
        title: body.title ?? '',
        owner: body.owner ?? '',
        email: body.email ?? '',
        name: body.name ?? '',
        done: body.done ?? '',
      }),
    }),
  )
  return readJson(response)
}

export async function patchRow(table: string, id: string, column: string, value: string): Promise<unknown> {
  const response = await fetch(
    '/studio-api/rows/patch',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ table, id, column, value }),
    }),
  )
  return readJson(response)
}

export async function runSql(sql: string): Promise<Row[]> {
  const response = await fetch(
    '/studio-api/sql',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify({ sql }),
    }),
  )
  return readJson(response)
}

export async function listStorage(): Promise<{ root: string; entries: string[] }> {
  const response = await fetch('/studio-api/storage', studioInit())
  return readJson(response)
}

export async function fetchAuthConfig(): Promise<AuthConfigView> {
  const response = await fetch('/studio-api/auth/config', studioInit())
  return readJson(response)
}

export async function saveAuthConfig(body: AuthConfigBody): Promise<AuthConfigView> {
  const response = await fetch(
    '/studio-api/auth/config',
    studioInit({
      method: 'POST',
      headers: jsonHeaders,
      body: JSON.stringify(body),
    }),
  )
  return readJson(response)
}
