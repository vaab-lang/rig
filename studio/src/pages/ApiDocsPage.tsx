import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { fetchStudioTables, type StudioTableInfo } from '@/lib/platform-api'
import { useRoleStore } from '@/lib/role-store'
import { origin } from '@/lib/utils'
import { downloadText, generateDatabaseTypes } from '@/pages/api/generate-types'
import { EmptyState, ErrorBanner, PageHeader } from '@/pages/home/ui'
import { Skeleton } from '@/components/ui/skeleton'

type Resource =
  | { id: string; label: string; kind: 'table'; table: StudioTableInfo }
  | { id: string; label: string; kind: 'auth' | 'storage' | 'health' }

export function ApiDocsPage() {
  const role = useRoleStore((state) => state.role)
  const tables = useQuery({ queryKey: ['studio', 'tables', role], queryFn: () => fetchStudioTables(role) })
  const [keyKind, setKeyKind] = useState<'anon' | 'service_role'>('anon')
  const [active, setActive] = useState('')
  const base = origin()
  const key = base

  const tableResources = useMemo<Resource[]>(
    () =>
      (tables.data ?? []).map((table) => ({
        id: `table:${table.name}`,
        label: table.name,
        kind: 'table' as const,
        table,
      })),
    [tables.data],
  )

  const serviceResources = useMemo<Resource[]>(
    () => [
      { id: 'auth', label: 'Auth', kind: 'auth' },
      { id: 'storage', label: 'Storage', kind: 'storage' },
      { id: 'health', label: 'Health', kind: 'health' },
    ],
    [],
  )

  const resources = useMemo<Resource[]>(
    () => [...tableResources, ...serviceResources],
    [tableResources, serviceResources],
  )

  const current = resources.find((item) => item.id === active) ?? tableResources[0] ?? resources[0]

  return (
    <div className="flex min-h-0 flex-col lg:flex-row">
      <aside className="w-full shrink-0 border-b border-border lg:w-60 lg:border-b-0 lg:border-r">
        <div className="p-3">
          <p className="mb-2 text-[11px] font-medium uppercase tracking-wider text-subtle">Tables (/rest/v1)</p>
          {tables.isLoading ? (
            <div className="grid gap-2">
              <Skeleton className="h-7" />
              <Skeleton className="h-7" />
            </div>
          ) : tableResources.length === 0 ? (
            <p className="px-2 py-1 text-xs text-muted-foreground">No tables yet</p>
          ) : (
            <ul className="grid gap-1">
              {tableResources.map((item) => (
                <li key={item.id}>
                  <button
                    type="button"
                    onClick={() => setActive(item.id)}
                    className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left font-mono text-xs ${
                      current?.id === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-elevated'
                    }`}
                  >
                    <span className="truncate">/rest/v1/{item.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}

          <p className="mb-2 mt-4 text-[11px] font-medium uppercase tracking-wider text-subtle">Services</p>
          <ul className="grid gap-1">
            {serviceResources.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setActive(item.id)}
                  className={`w-full rounded-md px-2 py-1.5 text-left text-sm ${
                    current?.id === item.id ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-elevated'
                  }`}
                >
                  {item.label}
                </button>
              </li>
            ))}
          </ul>
        </div>
      </aside>
      <div className="min-w-0 flex-1 p-4 md:p-6">
        <PageHeader
          title="API"
          detail="Live REST endpoints generated from the tables in Studio."
          actions={
            <div className="flex flex-wrap gap-2">
              <div className="inline-flex rounded-md border border-border p-0.5">
                {(['anon', 'service_role'] as const).map((item) => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setKeyKind(item)}
                    className={`rounded-sm px-2 py-1 font-mono text-[11px] ${keyKind === item ? 'bg-elevated' : 'text-muted-foreground'}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!tables.data?.length}
                onClick={() => {
                  downloadText('database.types.ts', generateDatabaseTypes(tables.data ?? []))
                  toast.success('Saved')
                }}
              >
                Generate and download types
              </Button>
            </div>
          }
        />
        <ErrorBanner error={tables.error instanceof Error ? tables.error.message : null} onRetry={() => void tables.refetch()} />
        {!tables.isLoading && !tables.data?.length ? <EmptyState message="No tables. Create a table first." actionLabel="New table" to="/editor" /> : null}
        {current ? <ResourceDocs resource={current} base={base} apiKey={key} keyKind={keyKind} /> : null}
      </div>
    </div>
  )
}

function samplePayload(table: StudioTableInfo): Record<string, string> {
  if (!table.columns.length) return { id: '1' }
  return Object.fromEntries(
    table.columns.map((column) => [
      column.name,
      column.dflt_value ? column.dflt_value.replace(/^'|'$/g, '') : `<${(column.type || 'text').toLowerCase()}>`,
    ]),
  )
}

function ResourceDocs({
  resource,
  base,
  apiKey,
  keyKind,
}: {
  resource: Resource
  base: string
  apiKey: string
  keyKind: string
}) {
  const path =
    resource.kind === 'table'
      ? `/rest/v1/${resource.table.name}`
      : resource.kind === 'auth'
        ? '/auth/v1/user'
        : resource.kind === 'storage'
          ? '/storage/v1/object/{path}'
          : '/health'
  const pk =
    resource.kind === 'table'
      ? (resource.table.columns.find((col) => col.pk === '1')?.name ?? resource.table.columns[0]?.name ?? 'id')
      : 'id'
  const itemPath = resource.kind === 'table' ? `${path}/{${pk}}` : path
  const methods = resource.kind === 'table' ? ['GET', 'POST', 'PATCH', 'DELETE'] : ['GET']
  const payloadJson =
    resource.kind === 'table' ? JSON.stringify(samplePayload(resource.table), null, 2) : '{}'

  const js =
    resource.kind === 'table'
      ? `// List ${resource.table.name} rows\nconst listRes = await fetch('${base}${path}', {\n  headers: {\n    apikey: '${apiKey}',\n    Authorization: 'Bearer ${apiKey}',\n  },\n  credentials: 'include',\n})\nconst rows = await listRes.json()\n\n// Get one ${resource.table.name} row by ${pk}\nconst rowRes = await fetch('${base}${path}/1', {\n  headers: {\n    apikey: '${apiKey}',\n    Authorization: 'Bearer ${apiKey}',\n  },\n})\n\n// Insert into ${resource.table.name}\nawait fetch('${base}${path}', {\n  method: 'POST',\n  headers: {\n    'Content-Type': 'application/json',\n    apikey: '${apiKey}',\n    Authorization: 'Bearer ${apiKey}',\n  },\n  body: JSON.stringify(${payloadJson}),\n})\n\n// Patch ${resource.table.name} row\nawait fetch('${base}${path}/1', {\n  method: 'PATCH',\n  headers: {\n    'Content-Type': 'application/json',\n    apikey: '${apiKey}',\n    Authorization: 'Bearer ${apiKey}',\n  },\n  body: JSON.stringify(${payloadJson}),\n})\n\n// Delete ${resource.table.name} row\nawait fetch('${base}${path}/1', {\n  method: 'DELETE',\n  headers: {\n    apikey: '${apiKey}',\n    Authorization: 'Bearer ${apiKey}',\n  },\n})`
      : `const res = await fetch('${base}${path}', {\n  headers: {\n    apikey: '${apiKey}',\n    Authorization: 'Bearer ${apiKey}',\n  },\n  credentials: 'include',\n})\nconst data = await res.json()`

  const curl =
    resource.kind === 'table'
      ? `# List ${resource.table.name}\ncurl '${base}${path}' \\\n  -H "apikey: ${apiKey}" \\\n  -H "Authorization: Bearer ${apiKey}"\n\n# Get ${resource.table.name} by ${pk}\ncurl '${base}${path}/1' \\\n  -H "apikey: ${apiKey}" \\\n  -H "Authorization: Bearer ${apiKey}"\n\n# Insert into ${resource.table.name}\ncurl -X POST '${base}${path}' \\\n  -H "Content-Type: application/json" \\\n  -H "apikey: ${apiKey}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -d '${JSON.stringify(samplePayload(resource.table))}'\n\n# Patch ${resource.table.name}\ncurl -X PATCH '${base}${path}/1' \\\n  -H "Content-Type: application/json" \\\n  -H "apikey: ${apiKey}" \\\n  -H "Authorization: Bearer ${apiKey}" \\\n  -d '${JSON.stringify(samplePayload(resource.table))}'\n\n# Delete from ${resource.table.name}\ncurl -X DELETE '${base}${path}/1' \\\n  -H "apikey: ${apiKey}" \\\n  -H "Authorization: Bearer ${apiKey}"`
      : `curl '${base}${path}' \\\n  -H "apikey: ${apiKey}" \\\n  -H "Authorization: Bearer ${apiKey}"`

  const mountSnippet =
    resource.kind === 'table'
      ? 'mount rig_api at "/rest/v1"'
      : resource.kind === 'auth'
        ? 'mount rig_auth at "/auth/v1"'
        : resource.kind === 'storage'
          ? 'mount rig_storage at "/storage/v1"'
          : 'mount rig_api at "/rest/v1"'
  const vaab =
    resource.kind === 'table'
      ? `need rig\n\nserve on port 54321 {\n    # Exposes ${path} and ${itemPath} for Studio table "${resource.table.name}"\n    ${mountSnippet}\n}`
      : `need rig\n\nserve on port 54321 {\n    ${mountSnippet}\n}`
  const params =
    resource.kind === 'table'
      ? resource.table.columns.map((column) => `${column.name} (${column.type})`).join(', ') || 'none'
      : 'none'

  return (
    <div className="rounded-md border border-border bg-surface p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {methods.map((method) => (
          <Badge key={method} variant={method === 'POST' || method === 'PATCH' ? 'warning' : method === 'DELETE' ? 'destructive' : 'success'}>
            {method}
          </Badge>
        ))}
        <span className="font-mono text-[13px]">{path}</span>
        {resource.kind === 'table' ? (
          <span className="font-mono text-[12px] text-muted-foreground">· {itemPath}</span>
        ) : null}
      </div>
      <p className="mb-3 text-sm text-muted-foreground">
        Key preview uses the window origin as a {keyKind} placeholder. Columns: {params}.
      </p>
      <Tabs defaultValue="js">
        <TabsList>
          <TabsTrigger value="js">JavaScript</TabsTrigger>
          <TabsTrigger value="curl">Bash (cURL)</TabsTrigger>
          <TabsTrigger value="vaab">Vaab</TabsTrigger>
        </TabsList>
        <TabsContent value="js">
          <pre className="overflow-auto font-mono text-[13px]">{js}</pre>
        </TabsContent>
        <TabsContent value="curl">
          <pre className="overflow-auto font-mono text-[13px]">{curl}</pre>
        </TabsContent>
        <TabsContent value="vaab">
          <pre className="overflow-auto font-mono text-[13px]">{vaab}</pre>
        </TabsContent>
      </Tabs>
    </div>
  )
}
