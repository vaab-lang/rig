import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import type { IntervalKey } from '@/lib/platform-api'

export const CHART = {
  1: '#E8A23A',
  2: '#6B9FD4',
  3: '#3DBF7A',
  4: '#E6B84D',
  grid: '#343B48',
  tick: '#9AA3B2',
} as const

export type SeriesPoint = { label: string; value: number }

const tooltipStyle = {
  background: '#232933',
  border: '1px solid #343B48',
  borderRadius: 6,
  color: '#ECE8E1',
  fontSize: 12,
  fontFamily: '"IBM Plex Sans", ui-sans-serif, sans-serif',
}

export function IntervalToggle({
  value,
  onChange,
}: {
  value: IntervalKey
  onChange: (value: IntervalKey) => void
}) {
  return (
    <div className="inline-flex rounded-md border border-border bg-surface p-0.5" role="group" aria-label="Interval">
      {(['60m', '24h', '7d'] as const).map((item) => (
        <button
          key={item}
          type="button"
          onClick={() => onChange(item)}
          className={cn(
            'rounded-sm px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
            value === item && 'bg-elevated text-foreground',
          )}
        >
          {item}
        </button>
      ))}
    </div>
  )
}

export function MetricChart({
  title,
  data,
  color,
  kind = 'bar',
  height = 148,
  empty = 'No data in this interval',
  onPointClick,
}: {
  title: string
  data: SeriesPoint[]
  color: string
  kind?: 'bar' | 'area' | 'line'
  height?: number
  empty?: string
  onPointClick?: (point: SeriesPoint, index: number) => void
}) {
  const hasValues = data.some((point) => point.value > 0)
  const reduced =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches

  return (
    <section className="rounded-md border border-border bg-surface p-3">
      <h2 className="mb-2 text-sm font-medium">{title}</h2>
      {!hasValues ? (
        <div className="flex h-[148px] items-end border-b border-border">
          <p className="w-full pb-2 text-center text-xs text-muted-foreground">{empty}</p>
        </div>
      ) : (
        <div style={{ height }}>
          <ResponsiveContainer width="100%" height="100%">
            {kind === 'area' ? (
              <AreaChart data={data}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke={color}
                  fill={color}
                  fillOpacity={0.18}
                  isAnimationActive={!reduced}
                />
              </AreaChart>
            ) : kind === 'line' ? (
              <LineChart data={data}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Line type="monotone" dataKey="value" stroke={color} dot={false} isAnimationActive={!reduced} />
              </LineChart>
            ) : (
              <BarChart data={data}>
                <CartesianGrid stroke={CHART.grid} vertical={false} />
                <XAxis dataKey="label" tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: CHART.tick, fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar
                  dataKey="value"
                  fill={color}
                  fillOpacity={0.8}
                  isAnimationActive={!reduced}
                  onClick={(_, index) => {
                    const point = data[index]
                    if (point) onPointClick?.(point, index)
                  }}
                />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}
    </section>
  )
}

export function PageHeader({
  title,
  detail,
  actions,
}: {
  title: string
  detail?: string
  actions?: ReactNode
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
        {detail ? <p className="mt-1 max-w-[72ch] text-sm text-muted-foreground">{detail}</p> : null}
      </div>
      {actions}
    </div>
  )
}

export function ErrorBanner({
  error,
  onRetry,
}: {
  error: string | null
  onRetry?: () => void
}) {
  if (!error) return null
  return (
    <Alert variant="destructive" className="mb-4">
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{error}</span>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export function EmptyState({
  message,
  actionLabel,
  to,
  onClick,
}: {
  message: string
  actionLabel?: string
  to?: string
  onClick?: () => void
}) {
  return (
    <div className="rounded-md border border-border bg-surface px-4 py-8 text-center">
      <p className="text-sm text-muted-foreground">{message}</p>
      {to && actionLabel ? (
        <Button type="button" className="mt-3" asChild>
          <Link to={to}>{actionLabel}</Link>
        </Button>
      ) : actionLabel && onClick ? (
        <Button type="button" className="mt-3" onClick={onClick}>
          {actionLabel}
        </Button>
      ) : null}
    </div>
  )
}

export function ChartSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {Array.from({ length: count }, (_, i) => (
        <Skeleton key={i} className="h-[196px]" />
      ))}
    </div>
  )
}

export function sqlEditorTarget(sql: string, name?: string) {
  const params = new URLSearchParams({ sql })
  if (name) params.set('name', name)
  return {
    to: { pathname: '/sql', search: `?${params.toString()}` },
    state: { sql, name },
  }
}
