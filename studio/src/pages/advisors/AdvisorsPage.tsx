import { useMemo } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useRoleStore } from '@/lib/role-store'
import {
  fetchAdvisors,
  type AdvisorFinding,
  type AdvisorSeverity,
} from '@/lib/platform-api'
import { EmptyState, ErrorBanner, PageHeader, sqlEditorTarget } from '@/pages/home/ui'
import { cn } from '@/lib/utils'

const SEVERITIES: AdvisorSeverity[] = ['ERROR', 'WARN', 'INFO']

function severityVariant(severity: AdvisorSeverity) {
  if (severity === 'ERROR') return 'destructive' as const
  if (severity === 'WARN') return 'warning' as const
  return 'secondary' as const
}

export function AdvisorsPage() {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const role = useRoleStore((state) => state.role)
  const category = pathname.includes('/performance') ? 'performance' : 'security'
  const severityFilter = (params.get('severity')?.toUpperCase() ?? '') as AdvisorSeverity | ''

  const advisors = useQuery({
    queryKey: ['studio', 'advisors', role],
    queryFn: () => fetchAdvisors(role),
  })

  const rows = useMemo(() => {
    const all = advisors.data ?? []
    return all.filter((item) => {
      if (item.category !== category) return false
      if (severityFilter && SEVERITIES.includes(severityFilter) && item.severity !== severityFilter) return false
      return true
    })
  }, [advisors.data, category, severityFilter])

  return (
    <div className="p-4 md:p-6">
      <PageHeader
        title={category === 'performance' ? 'Performance' : 'Security'}
        detail="Schema lints from this gateway. Open autofix SQL in the SQL Editor."
      />
      <ErrorBanner error={advisors.error instanceof Error ? advisors.error.message : null} onRetry={() => void advisors.refetch()} />

      <div className="mb-4 inline-flex rounded-md border border-border bg-surface p-0.5" role="group" aria-label="Severity">
        <button
          type="button"
          onClick={() => navigate(pathname)}
          className={cn('rounded-sm px-2.5 py-1 text-xs', !severityFilter && 'bg-elevated')}
        >
          All
        </button>
        {SEVERITIES.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => navigate(`${pathname}?severity=${item}`)}
            className={cn('rounded-sm px-2.5 py-1 text-xs', severityFilter === item && 'bg-elevated')}
          >
            {item}
          </button>
        ))}
      </div>

      {advisors.isLoading ? (
        <div className="grid gap-2">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      ) : rows.length === 0 ? (
        <EmptyState message="No advisor findings" />
      ) : (
        <ul className="grid gap-2">
          {rows.map((item) => (
            <AdvisorRow
              key={item.id}
              item={item}
              onOpen={() => {
                const target = sqlEditorTarget(item.autofix, item.title)
                navigate(target.to, { state: target.state })
              }}
            />
          ))}
        </ul>
      )}
    </div>
  )
}

function AdvisorRow({ item, onOpen }: { item: AdvisorFinding; onOpen: () => void }) {
  return (
    <li className="rounded-md border border-border bg-surface px-3 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-2">
            <Badge variant={severityVariant(item.severity)}>{item.severity}</Badge>
            {item.entity ? <span className="font-mono text-[13px] text-muted-foreground">{item.entity}</span> : null}
          </div>
          <h2 className="text-sm font-medium">{item.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{item.detail}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={onOpen}>
          Open in SQL Editor
        </Button>
      </div>
    </li>
  )
}
