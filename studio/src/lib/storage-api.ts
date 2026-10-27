import { explainStatus, listStorage } from '@/lib/api'
import { origin } from '@/lib/utils'
import { asBool, asText, isNotFound, StudioApiError, unwrapList } from '@/lib/auth-api'

export type StorageBucket = {
  id: string
  name: string
  public: boolean
  file_size_limit: string
  allowed_mime_types: string
  created_at: string
  updated_at: string
}

export type StorageBucketBody = {
  id: string
  name: string
  public: string
  file_size_limit: string
  allowed_mime_types: string
}

export type StorageObject = {
  id: string
  bucket_id: string
  name: string
  size: string
  mime_type: string
  content: string
  created_at: string
  updated_at: string
}

export type StorageObjectBody = {
  id: string
  bucket_id: string
  name: string
  size: string
  mime_type: string
  content: string
}

export type StorageObjectDelete = {
  id: string
  bucket_id: string
  name: string
}

async function studioJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new StudioApiError(explainStatus(response.status, text), response.status)
  }
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

function parseBucket(row: Record<string, unknown>): StorageBucket {
  return {
    id: asText(row.id ?? row.name),
    name: asText(row.name ?? row.id),
    public: asBool(row.public, false),
    file_size_limit: asText(row.file_size_limit),
    allowed_mime_types: asText(row.allowed_mime_types),
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  }
}

function parseObject(row: Record<string, unknown>): StorageObject {
  return {
    id: asText(row.id),
    bucket_id: asText(row.bucket_id),
    name: asText(row.name),
    size: asText(row.size, '0'),
    mime_type: asText(row.mime_type),
    content: asText(row.content),
    created_at: asText(row.created_at),
    updated_at: asText(row.updated_at),
  }
}

export async function listBuckets(): Promise<StorageBucket[]> {
  try {
    const data = await studioJson<unknown>('/studio-api/storage/buckets')
    return unwrapList(data, ['buckets', 'rows']).map(parseBucket)
  } catch (error) {
    if (!isNotFound(error)) throw error
    const listing = await listStorage()
    return [
      {
        id: 'files',
        name: listing.root || 'files',
        public: false,
        file_size_limit: '',
        allowed_mime_types: '',
        created_at: '',
        updated_at: '',
      },
    ]
  }
}

function bucketBody(body: Partial<StorageBucketBody>): StorageBucketBody {
  return {
    id: body.id ?? '',
    name: body.name ?? '',
    public: body.public ?? 'false',
    file_size_limit: body.file_size_limit ?? '',
    allowed_mime_types: body.allowed_mime_types ?? '',
  }
}

function objectBody(body: Partial<StorageObjectBody>): StorageObjectBody {
  return {
    id: body.id ?? '',
    bucket_id: body.bucket_id ?? '',
    name: body.name ?? '',
    size: body.size ?? '',
    mime_type: body.mime_type ?? '',
    content: body.content ?? '',
  }
}

function objectDeleteBody(body: Partial<StorageObjectDelete>): StorageObjectDelete {
  return {
    id: body.id ?? '',
    bucket_id: body.bucket_id ?? '',
    name: body.name ?? '',
  }
}

export async function saveBucket(body: StorageBucketBody): Promise<void> {
  await studioJson('/studio-api/storage/buckets', {
    method: 'POST',
    body: JSON.stringify(bucketBody(body)),
  })
}

export async function listObjects(bucketId: string): Promise<StorageObject[]> {
  try {
    const data = await studioJson<unknown>('/studio-api/storage/objects')
    return unwrapList(data, ['objects', 'rows'])
      .map(parseObject)
      .filter((object) => !bucketId || object.bucket_id === bucketId)
  } catch (error) {
    if (!isNotFound(error)) throw error
    const listing = await listStorage()
    return listing.entries.map((path, index) => ({
      id: `legacy-${index}`,
      bucket_id: bucketId,
      name: path,
      size: '',
      mime_type: '',
      content: '',
      created_at: '',
      updated_at: '',
    }))
  }
}

export async function saveObject(body: StorageObjectBody): Promise<void> {
  await studioJson('/studio-api/storage/objects', {
    method: 'POST',
    body: JSON.stringify(objectBody(body)),
  })
}

export async function deleteObject(body: StorageObjectDelete): Promise<void> {
  await studioJson('/studio-api/storage/objects/delete', {
    method: 'POST',
    body: JSON.stringify(objectDeleteBody(body)),
  })
}

export function publicObjectUrl(bucketId: string, name: string): string {
  return `${origin()}/storage/v1/object/public/${encodeURIComponent(bucketId)}/${name
    .split('/')
    .map(encodeURIComponent)
    .join('/')}`
}

export async function createSignedObjectUrl(bucketId: string, name: string, expiresIn: number): Promise<string> {
  const data = await studioJson<{ url: string }>('/studio-api/storage/sign', {
    method: 'POST',
    body: JSON.stringify({ bucket: bucketId, name, expires_in: String(expiresIn) }),
  })
  if (data.url.startsWith('http')) return data.url
  return `${origin()}${data.url}`
}

export function joinPath(...parts: string[]): string {
  return parts.filter(Boolean).join('/')
}

export function entriesAt(
  objects: StorageObject[],
  prefix: string,
): { folders: string[]; files: StorageObject[] } {
  const folders = new Set<string>()
  const files: StorageObject[] = []
  const base = prefix ? `${prefix.replace(/\/$/, '')}/` : ''
  for (const object of objects) {
    const name = object.name.replace(/^\//, '')
    if (base && !name.startsWith(base)) continue
    const rest = base ? name.slice(base.length) : name
    if (!rest) continue
    const slash = rest.indexOf('/')
    if (slash === -1) {
      if (object.mime_type === 'inode/directory' || rest.endsWith('/')) {
        folders.add(rest.replace(/\/$/, ''))
      } else {
        files.push(object)
      }
    } else {
      folders.add(rest.slice(0, slash))
    }
  }
  return {
    folders: [...folders].sort((a, b) => a.localeCompare(b)),
    files: files.sort((a, b) => a.name.localeCompare(b.name)),
  }
}

export function formatBytes(value: string): string {
  const size = Number(value)
  if (!Number.isFinite(size) || size <= 0) return value || '—'
  if (size < 1024) return `${size} B`
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`
  return `${(size / (1024 * 1024)).toFixed(1)} MB`
}

export function readFileAsBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      const comma = result.indexOf(',')
      resolve(comma >= 0 ? result.slice(comma + 1) : result)
    }
    reader.readAsDataURL(file)
  })
}

export function previewSrc(object: StorageObject): string | null {
  if (!object.content) return null
  if (object.content.startsWith('data:')) return object.content
  if (object.mime_type.startsWith('image/')) return `data:${object.mime_type};base64,${object.content}`
  return null
}

export function decodeObjectText(object: StorageObject): string | null {
  if (!object.content) return null
  if (object.mime_type.startsWith('image/')) return null
  if (object.content.startsWith('data:')) {
    try {
      return atob(object.content.slice(object.content.indexOf(',') + 1))
    } catch {
      return object.content
    }
  }
  try {
    if (/^[A-Za-z0-9+/=\s]+$/.test(object.content) && object.content.length % 4 === 0) {
      const decoded = atob(object.content)
      if (/^[\x09\x0A\x0D\x20-\x7E]*$/.test(decoded)) return decoded
    }
  } catch {
    return object.content
  }
  return object.content
}
