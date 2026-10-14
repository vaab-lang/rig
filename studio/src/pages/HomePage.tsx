import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ConnectModal } from '@/components/ConnectModal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useRoleStore } from '@/lib/role-store'
import {
  advisorCounts,
  bucketLogs,
  databaseEngine,
  fetchAdvisors,
  fetchAuthServiceHealth,
  fetchGatewayHealth,
  fetchLogs,
  fetchStudioTables,
  filterLogs,
  intervalRange,
  type IntervalKey,
} from '@/lib/platform-api'
import { SQL_QUICKSTARTS } from '@/pages/sql/quickstarts'
import { QueryBlocks } from '@/pages/home/QueryBlocks'
import { CHART, ChartSkeleton, ErrorBanner, IntervalToggle, MetricChart, sqlEditorTarget } from '@/pages/home/ui'

export function HomePage() {
  const navigate = useNavigate()
  const role = useRoleStore((state) => state.role)
  const [interval, setInterval] = useState<IntervalKey>('24h')
  const range = intervalRange(interval)

  const health = useQuery({ queryKey: ['studio', 'health'], queryFn: fetchGatewayHealth })
  const auth = useQuery({ queryKey: ['studio', 'auth-health'], queryFn: fetchAuthServiceHealth })
  const tables = useQuery({ queryKey: ['studio', 'tables', role], queryFn: () => fetchStudioTables(role) })
  const advisors = useQuery({ queryKey: ['studio', 'advisors', role], queryFn: () => fetchAdvisors(role) })
  const restLogs = useQuery({
    queryKey: ['studio', 'logs', 'home', interval, role],
    queryFn: () => fetchLogs(role),
  })

  const error =
    health.error instanceof Error
      ? health.error.message
      : auth.error instanceof Error
        ? auth.error.message
        : tables.error instanceof Error
          ? tables.error.message
          : advisors.error instanceof Error
            ? advisors.error.message
            : restLogs.error instanceof Error
              ? restLogs.error.message
              : null

  const allLogs = restLogs.data ?? []
  const counts = advisorCounts(advisors.data ?? [])
  const engine = databaseEngine(health.data ?? null)
  const series = useMemo(() => {
    const scoped = filterLogs(allLogs, { from: range.from, to: range.to })
    return {
      rest: bucketLogs(
        scoped.filter((log) => log.service === 'api' || log.path.startsWith('/rest')),
        interval,
      ),
      auth: bucketLogs(
        scoped.filter((log) => log.service === 'auth' || log.path.startsWith('/auth')),
        interval,
      ),
      storage: bucketLogs(
        scoped.filter((log) => log.service === 'storage' || log.path.startsWith('/storage')),
        interval,
      ),
      connections: bucketLogs(
        scoped.filter((log) => log.service === 'postgres' || log.path.includes('/sql')),
        interval,
      ),
    }
  }, [allLogs, interval, range.from, range.to])

  const loading = health.isLoading || restLogs.isLoading

  return (
    <div className="p-4 md:p-6">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border pb-4">
        <div>
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">rig</h1>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant={health.data?.ok ? 'success' : 'destructive'}>API {health.data?.ok ? 'ok' : 'down'}</Badge>
            <Badge variant={auth.data?.ok ? 'success' : 'destructive'}>Auth {auth.data?.ok ? 'ok' : 'down'}</Badge>
            <Badge variant="secondary">{engine}</Badge>
            <Badge variant="secondary">tables {tables.data?.length ?? '—'}</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <IntervalToggle value={interval} onChange={setInterval} />
          <ConnectModal />
        </div>
      </div>

      <ErrorBanner
        error={error}
        onRetry={() => {
          void health.refetch()
          void auth.refetch()
          void tables.refetch()
          void advisors.refetch()
          void restLogs.refetch()
        }}
      />

      {loading ? (
        <ChartSkeleton />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          <MetricChart title="REST API Requests" data={series.rest} color={CHART[1]} />
          <MetricChart title="Auth Requests" data={series.auth} color={CHART[2]} />
          <MetricChart title="Storage Requests" data={series.storage} color={CHART[3]} />
          <MetricChart title="Database Connections" data={series.connections} color={CHART[4]} />
        </div>
      )}

      <section className="mt-5 rounded-md border border-border bg-surface p-3">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium">Advisors</h2>
          <Button type="button" variant="ghost" size="sm" asChild>
            <Link to="/advisors">Open</Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/advisors?severity=ERROR" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
            Errors <span className="font-mono text-destructive">{counts.error}</span>
          </Link>
          <Link to="/advisors?severity=WARN" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
            Warnings <span className="font-mono text-warning">{counts.warn}</span>
          </Link>
          <Link to="/advisors?severity=INFO" className="rounded-md border border-border px-3 py-2 text-sm hover:bg-elevated">
            Info <span className="font-mono text-info">{counts.info}</span>
          </Link>
        </div>
      </section>

      <section className="mt-5">
        <h2 className="mb-3 text-sm font-medium">Starters</h2>
        <ul className="grid gap-2 sm:grid-cols-2">
          {SQL_QUICKSTARTS.map((item, index) => (
            <li key={item.id} className={index === 0 ? 'sm:col-span-2' : undefined}>
              <button
                type="button"
                onClick={() => {
                  const target = sqlEditorTarget(item.sql, item.name)
                  navigate(target.to, { state: target.state })
                }}
                className="flex w-full items-start gap-3 rounded-md border border-border bg-surface px-3 py-3 text-left hover:bg-elevated focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <span>
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="block text-sm text-muted-foreground">{item.description}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <QueryBlocks />
    </div>
  )
}
