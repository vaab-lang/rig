import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Button } from '@/components/ui/button'
import { useRoleStore } from '@/lib/role-store'
import { fetchLogs, type StudioLog } from '@/lib/platform-api'
import { ErrorBanner, PageHeader } from '@/pages/home/ui'

const SERVICE_BY_PATH: Record<string, string> = {
  '/logs/api': 'api',
  '/logs/postgres': 'postgres',
  '/logs/auth': 'auth',
  '/logs/storage': 'storage',
  '/logs/functions': 'edge',
  '/logs/realtime': 'realtime',
}

function matches(log: StudioLog, service: string): boolean {
  if (!service) return true
  const haystack = `${log.service} ${log.path}`.toLowerCase()
  return haystack.includes(service)
}

export function LogsPage() {
  const { pathname } = useLocation()
  const role = useRoleStore((state) => state.role)
  const service = SERVICE_BY_PATH[pathname] ?? ''
  const [selected, setSelected] = useState<StudioLog | null>(null)
  const logs = useQuery({
    queryKey: ['studio', 'logs', 'explorer', role],
    queryFn: () => fetchLogs(role),
  })
  const rows = useMemo(
    () => (logs.data ?? []).filter((log) => matches(log, service)),
    [logs.data, service],
  )

  return (
    <div className="flex h-full min-h-0">
      <div className="min-w-0 flex-1 overflow-auto p-4 md:p-6">
        <PageHeader
          title={service ? `Logs / ${service}` : 'Logs'}
          detail="Rows from studio_logs. This is the gateway log, not Logflare."
          actions={
            <Button type="button" variant="outline" size="sm" onClick={() => void logs.refetch()}>
              Refresh
            </Button>
          }
        />
        <ErrorBanner error={logs.error instanceof Error ? logs.error.message : null} onRetry={() => void logs.refetch()} />
        {logs.isLoading ? <p className="text-sm text-muted-foreground">Loading logs</p> : null}
        {!logs.isLoading && rows.length === 0 ? <p className="text-sm text-muted-foreground">No logs in this window.</p> : null}
        {rows.length > 0 ? (
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-left text-sm">
              <thead className="bg-surface text-xs text-muted-foreground">
                <tr>
                  <th className="px-3 py-2 font-medium">ts</th>
                  <th className="px-3 py-2 font-medium">service</th>
                  <th className="px-3 py-2 font-medium">level</th>
                  <th className="px-3 py-2 font-medium">status</th>
                  <th className="px-3 py-2 font-medium">path</th>
                  <th className="px-3 py-2 font-medium">msg</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((log) => (
                  <tr
                    key={log.id}
                    className="cursor-pointer border-t border-border hover:bg-elevated"
                    onClick={() => setSelected(log)}
                  >
                    <td className="px-3 py-2 font-mono text-[13px]">{log.ts}</td>
                    <td className="px-3 py-2">{log.service}</td>
                    <td className="px-3 py-2">{log.level}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{log.status_code || '—'}</td>
                    <td className="max-w-[240px] truncate px-3 py-2 font-mono text-[13px]">{log.path || '—'}</td>
                    <td className="max-w-[360px] truncate px-3 py-2">{log.msg || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
      {selected ? (
        <aside className="w-[min(420px,100%)] overflow-auto border-l border-border bg-surface p-4">
          <div className="mb-3 flex items-center justify-between gap-2">
            <h2 className="text-sm font-medium">Log detail</h2>
            <Button type="button" variant="outline" size="sm" onClick={() => setSelected(null)}>
              Close
            </Button>
          </div>
          <pre className="whitespace-pre-wrap font-mono text-[13px] text-foreground">{JSON.stringify(selected, null, 2)}</pre>
        </aside>
      ) : null}
    </div>
  )
}
