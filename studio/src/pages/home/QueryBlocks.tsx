import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { DataGrid } from '@/components/DataGrid'
import { Button } from '@/components/ui/button'
import { listSnippets, runStudioSql, type SqlSnippet } from '@/lib/sql-api'
import { useRoleStore } from '@/lib/role-store'
import { CHART, MetricChart, sqlEditorTarget } from './ui'

type Mode = 'table' | 'chart'

export function QueryBlocks() {
  const navigate = useNavigate()
  const role = useRoleStore((state) => state.role)
  const snippets = useQuery({
    queryKey: ['studio', 'snippets', role],
    queryFn: () => listSnippets(role),
  })

  const reports = useMemo(
    () => (snippets.data?.snippets ?? []).filter((item) => item.folder === 'Private' || item.favorite).slice(0, 4),
    [snippets.data],
  )

  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium">Reports</h2>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const target = sqlEditorTarget('', 'New report')
            navigate(target.to, { state: target.state })
          }}
        >
          Add report
        </Button>
      </div>
      {reports.length === 0 ? (
        <p className="text-sm text-muted-foreground">No saved reports. Add a report in the SQL Editor.</p>
      ) : (
        <ul className="grid gap-3 lg:grid-cols-2">
          {reports.map((snippet) => (
            <li key={snippet.id}>
              <QueryBlock snippet={snippet} />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function QueryBlock({ snippet }: { snippet: SqlSnippet }) {
  const role = useRoleStore((state) => state.role)
  const [mode, setMode] = useState<Mode>('table')
  const result = useQuery({
    queryKey: ['studio', 'query-block', snippet.id, role],
    queryFn: () => runStudioSql(snippet.sql, role),
    enabled: Boolean(snippet.sql.trim()),
  })
  const rows = (result.data?.rows ?? []).map((row) =>
    Object.fromEntries(Object.entries(row).map(([key, value]) => [key, value == null ? '' : String(value)])),
  )
  const columns = result.data?.columns ?? (rows[0] ? Object.keys(rows[0]) : [])
  const numeric = columns.filter((column) => rows.some((row) => row[column] && !Number.isNaN(Number(row[column]))))
  const x = columns[0] ?? 'x'
  const y = numeric[0] ?? columns[1] ?? columns[0] ?? 'y'
  const chart = rows.slice(0, 24).map((row, index) => ({
    label: row[x] || String(index + 1),
    value: Number(row[y] ?? 0) || 0,
  }))

  return (
    <div className="rounded-md border border-border bg-surface p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="truncate text-sm font-medium">{snippet.name}</h3>
        <div className="inline-flex rounded-md border border-border p-0.5">
          {(['table', 'chart'] as const).map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => setMode(item)}
              className={`rounded-sm px-2 py-0.5 text-xs ${mode === item ? 'bg-elevated text-foreground' : 'text-muted-foreground'}`}
            >
              {item}
            </button>
          ))}
        </div>
      </div>
      {mode === 'table' ? (
        <DataGrid columns={columns} rows={rows} loading={result.isLoading} error={result.error instanceof Error ? result.error.message : null} empty="0 rows" />
      ) : (
        <MetricChart title={y} data={chart} color={CHART[1]} height={140} empty="No numeric columns" />
      )}
    </div>
  )
}
