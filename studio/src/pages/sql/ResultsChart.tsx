import { useEffect, useMemo, useState } from 'react'
import {
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
import type { SqlRow } from '@/lib/sql-api'
import { isNumericColumn } from './sql-utils'

type ResultsChartProps = {
  columns: string[]
  rows: SqlRow[]
}

const CHART_COLORS = ['var(--chart-1)', 'var(--chart-2)', 'var(--chart-3)', 'var(--chart-4)']

function toNumber(value: unknown): number {
  if (typeof value === 'number') return value
  return Number(value)
}

export function ResultsChart({ columns, rows }: ResultsChartProps) {
  const numeric = useMemo(() => columns.filter((column) => isNumericColumn(rows, column)), [columns, rows])
  const categorical = useMemo(() => columns.filter((column) => !numeric.includes(column)), [columns, numeric])
  const [xKey, setXKey] = useState(categorical[0] ?? columns[0] ?? '')
  const [yKeys, setYKeys] = useState<string[]>(numeric.slice(0, 1))
  const [kind, setKind] = useState<'bar' | 'line'>('bar')
  const [cumulative, setCumulative] = useState(false)
  const [log, setLog] = useState(false)

  useEffect(() => {
    const nextX = categorical[0] ?? columns[0] ?? ''
    setXKey((current) => (columns.includes(current) ? current : nextX))
    setYKeys((current) => {
      const kept = current.filter((key) => numeric.includes(key))
      const next = kept.length ? kept : numeric.slice(0, 1)
      if (next.length === current.length && next.every((key, index) => key === current[index])) return current
      return next
    })
  }, [categorical, columns, numeric])

  const data = useMemo(() => {
    const selectedY = yKeys.filter((key) => numeric.includes(key))
    if (!xKey || selectedY.length === 0) return []
    const acc: Record<string, number> = {}
    return rows.map((row) => {
      const next: Record<string, string | number> = { [xKey]: String(row[xKey] ?? '') }
      for (const key of selectedY) {
        const value = toNumber(row[key])
        acc[key] = (acc[key] ?? 0) + (Number.isFinite(value) ? value : 0)
        next[key] = cumulative ? acc[key] : Number.isFinite(value) ? value : 0
      }
      return next
    })
  }, [cumulative, numeric, rows, xKey, yKeys])

  if (numeric.length === 0) {
    return <p className="p-8 text-center text-sm text-muted-foreground">Chart needs at least one numeric column.</p>
  }

  const Chart = kind === 'line' ? LineChart : BarChart

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-end gap-3 border-b border-border px-3 py-2">
        <label className="grid gap-1 text-xs text-muted-foreground">
          X
          <select
            className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground"
            value={xKey}
            onChange={(event) => setXKey(event.target.value)}
          >
            {columns.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Y
          <select
            className="h-8 min-w-32 rounded-md border border-input bg-background px-2 font-mono text-xs text-foreground"
            value={yKeys[0] ?? ''}
            onChange={(event) => setYKeys([event.target.value])}
          >
            {numeric.map((column) => (
              <option key={column} value={column}>
                {column}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1 text-xs text-muted-foreground">
          Type
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
            value={kind}
            onChange={(event) => setKind(event.target.value === 'line' ? 'line' : 'bar')}
          >
            <option value="bar">bar</option>
            <option value="line">line</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={cumulative} onChange={(event) => setCumulative(event.target.checked)} />
          Cumulative
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          <input type="checkbox" checked={log} onChange={(event) => setLog(event.target.checked)} />
          Log
        </label>
      </div>
      <div className="min-h-0 flex-1 p-3">
        {data.length === 0 ? (
          <p className="p-8 text-center text-sm text-muted-foreground">No data in this interval</p>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <Chart data={data}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" />
              <XAxis dataKey={xKey} tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }} stroke="var(--border)" />
              <YAxis
                scale={log ? 'log' : 'auto'}
                domain={log ? ['auto', 'auto'] : undefined}
                allowDataOverflow
                tick={{ fill: 'var(--muted-foreground)', fontSize: 11 }}
                stroke="var(--border)"
              />
              <Tooltip
                contentStyle={{
                  background: 'var(--elevated)',
                  border: '1px solid var(--border)',
                  borderRadius: 6,
                  color: 'var(--foreground)',
                  fontSize: 12,
                  fontFamily: 'IBM Plex Sans, sans-serif',
                }}
              />
              {yKeys.map((key, index) =>
                kind === 'line' ? (
                  <Line
                    key={key}
                    type="monotone"
                    dataKey={key}
                    stroke={CHART_COLORS[index % CHART_COLORS.length]}
                    strokeWidth={1.5}
                    dot={false}
                    isAnimationActive={false}
                  />
                ) : (
                  <Bar
                    key={key}
                    dataKey={key}
                    fill={CHART_COLORS[index % CHART_COLORS.length]}
                    fillOpacity={0.8}
                    isAnimationActive={false}
                  />
                ),
              )}
            </Chart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  )
}
