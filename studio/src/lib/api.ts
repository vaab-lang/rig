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

const jsonHeaders = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

async function readJson<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const text = await response.text()
    throw new Error(text || `HTTP ${response.status}`)
  }
  return response.json() as Promise<T>
}

export async function fetchHealth(): Promise<Health> {
  const response = await fetch('/health')
  return readJson(response)
}

export async function fetchAuthHealth(): Promise<Health> {
  const response = await fetch('/auth/v1/health')
  return readJson(response)
}

export async function listTables(): Promise<TableInfo[]> {
  const response = await fetch('/studio-api/tables')
  return readJson(response)
}

export async function listRows(table: string): Promise<Row[]> {
  const response = await fetch(`/rest/v1/${encodeURIComponent(table)}`)
  return readJson(response)
}

export async function insertTodo(title: string, token: string): Promise<unknown> {
  const response = await fetch('/rest/v1/todos', {
    method: 'POST',
    headers: {
      ...jsonHeaders,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ title }),
  })
  return readJson(response)
}

export async function runSql(sql: string): Promise<Row[]> {
  const response = await fetch('/studio-api/sql', {
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ sql }),
  })
  return readJson(response)
}

export async function listStorage(): Promise<{ root: string; entries: string[] }> {
  const response = await fetch('/studio-api/storage')
  return readJson(response)
}
