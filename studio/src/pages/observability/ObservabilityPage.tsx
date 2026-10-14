import { useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { menuLinkFromPath } from '@/lib/studio-nav'
import { useRoleStore } from '@/lib/role-store'
import {
  bucketLogs,
  fetchLogs,
  filterLogs,
  intervalRange,
  OBS_SERVICE_BY_PATH,
  queryLogs,
  type IntervalKey,
} from '@/lib/platform-api'
import { CHART, ChartSkeleton, ErrorBanner, IntervalToggle, MetricChart, PageHeader, sqlEditorTarget } from '@/pages/home/ui'

export function ObservabilityPage() {
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const role = useRoleStore((state) => state.role)
  const [interval, setInterval] = useState<IntervalKey>('24h')
  const range = intervalRange(interval)
  const service = OBS_SERVICE_BY_PATH[pathname]
  const title = menuLinkFromPath(pathname)?.label ?? 'Overview'

  const logs = useQuery({
    queryKey: ['studio', 'logs', 'obs', pathname, interval, role],
    queryFn: () =>
      service
        ? queryLogs({ service, level: '', sql: '' }, role)
        : fetchLogs(role),
  })

  const scoped = useMemo(
    () => filterLogs(logs.data ?? [], { service, from: range.from, to: range.to }),
    [logs.data, service, range.from, range.to],
  )
  const requests = bucketLogs(scoped, interval)
  const errors = bucketLogs(
    scoped.filter((log) => /error|err|4\d\d|5\d\d/i.test(`${log.level} ${log.status_code}`)),
    interval,
  )
  const latency = bucketLogs(scoped, interval).map((point, index) => {
    const slice = scoped.filter((_, i) => i % Math.max(1, Math.ceil(scoped.length / requests.length)) === index)
    const mean =
      slice.length === 0
        ? 0
        : slice.reduce((sum, log) => sum + (Number(log.duration_ms) || 0), 0) / slice.length
    return { ...point, value: Math.round(mean) }
  })

  const queries = useMemo(() => {
    const groups = new Map<string, { query: string; calls: number; total: number }>()
    for (const log of scoped) {
      const key = log.msg || log.path || 'unknown'
      const current = groups.get(key) ?? { query: key, calls: 0, total: 0 }
      current.calls += 1
      current.total += Number(log.duration_ms) || 0
      groups.set(key, current)
    }
    return [...groups.values()]
      .sort((a, b) => b.total - a.total)
      .slice(0, 40)
      .map((item) => ({
        query: item.query,
        calls: String(item.calls),
        mean_ms: String(item.calls ? Math.round(item.total / item.calls) : 0),
        total_ms: String(item.total),
      }))
  }, [scoped])

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title={title}
        detail="Telemetry from studio logs. Empty series stay empty."
        actions={<IntervalToggle value={interval} onChange={setInterval} />}
      />
      <ErrorBanner error={logs.error instanceof Error ? logs.error.message : null} onRetry={() => void logs.refetch()} />

      {logs.isLoading ? (
        <ChartSkeleton count={3} />
      ) : pathname.endsWith('/queries') ? (
        queries.length === 0 ? (
          <p className="rounded-md border border-border bg-surface px-4 py-8 text-center text-sm text-muted-foreground">
            No telemetry in this interval
          </p>
        ) : (
          <div className="overflow-auto rounded-md border border-border">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-3 py-2">query</th>
                  <th className="px-3 py-2">calls</th>
                  <th className="px-3 py-2">mean_ms</th>
                  <th className="px-3 py-2">total_ms</th>
                </tr>
              </thead>
              <tbody>
                {queries.map((row) => (
                  <tr
                    key={row.query}
                    className="cursor-pointer border-b border-border hover:bg-elevated"
                    onClick={() => {
                      const target = sqlEditorTarget(row.query, 'Query')
                      navigate(target.to, { state: target.state })
                    }}
                  >
                    <td className="max-w-[420px] truncate px-3 py-2 font-mono text-[13px]">{row.query}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{row.calls}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{row.mean_ms}</td>
                    <td className="px-3 py-2 font-mono text-[13px]">{row.total_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <MetricChart title="Requests" data={requests} color={CHART[1]} kind="area" empty="No telemetry in this interval" />
          <MetricChart title="Errors" data={errors} color={CHART[4]} kind="line" empty="No telemetry in this interval" />
          <div className="md:col-span-2">
            <MetricChart title="Mean duration (ms)" data={latency} color={CHART[2]} kind="line" empty="No telemetry in this interval" />
          </div>
        </div>
      )}
    </div>
  )
}
