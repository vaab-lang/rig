import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { loadDatabaseTables, listPolicies, synthesizeCreateTable, type PgTable } from '@/lib/database-api'
import { CatalogTable, PageChrome, SqlPreview, formatSql } from './shared'

function pkLabel(table: PgTable): string {
  const keys = table.columns.filter((col) => col.pk).map((col) => col.name)
  return keys.join(', ')
}

function toRow(table: PgTable): Record<string, string> {
  return {
    name: table.name,
    schema: table.schema,
    kind: table.kind,
    rows: table.rowCount,
    rls: table.rlsEnabled ? 'on' : 'off',
    pk: pkLabel(table),
  }
}

export function TablesCatalog() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const selectedName = params.get('table')

  const tablesQuery = useQuery({ queryKey: ['studio', 'tables'], queryFn: loadDatabaseTables })
  const policiesQuery = useQuery({ queryKey: ['studio', 'policies'], queryFn: listPolicies, retry: false })

  const tables = useMemo(() => {
    const list = tablesQuery.data ?? []
    const policyTables = new Set((policiesQuery.data ?? []).map((policy) => policy.table_name))
    return list.map((table) => (policyTables.has(table.name) ? { ...table, rlsEnabled: table.rlsEnabled || true } : table))
  }, [policiesQuery.data, tablesQuery.data])

  const selected = tables.find((table) => table.name === selectedName) ?? null
  const rows = tables.map(toRow)
  const error = tablesQuery.error instanceof Error ? tablesQuery.error.message : null

  return (
    <PageChrome
      title="Tables"
      description="Catalog of tables and views. Open a row for columns and definition."
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => void tablesQuery.refetch()}>
            Refresh
          </Button>
          <Button type="button" size="sm" onClick={() => navigate('/editor')}>
            New table
          </Button>
        </>
      }
    >
      <CatalogTable
        columns={[
          { key: 'name', label: 'name', mono: true },
          { key: 'schema', label: 'schema' },
          { key: 'kind', label: 'kind' },
          { key: 'rows', label: 'rows', mono: true },
          { key: 'rls', label: 'RLS' },
          { key: 'pk', label: 'PK', mono: true },
        ]}
        rows={rows}
        loading={tablesQuery.isLoading}
        error={error}
        empty="No tables"
        emptyAction={
          <Button type="button" size="sm" onClick={() => navigate('/editor')}>
            New table
          </Button>
        }
        onRetry={() => void tablesQuery.refetch()}
        onRowClick={(row) => setParams({ table: row.name ?? '' })}
        rowKey={(row) => `${row.schema}.${row.name}`}
      />

      <Sheet
        open={Boolean(selectedName)}
        onOpenChange={(open) => {
          if (!open) setParams({})
        }}
      >
        <SheetContent side="right" className="w-[min(420px,100vw)] overflow-auto">
          <SheetHeader>
            <SheetTitle className="font-mono text-base">{selected?.name ?? selectedName}</SheetTitle>
            <SheetDescription>
              {selected ? `${selected.schema} · ${selected.kind}` : 'Table is not in the current catalog.'}
            </SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="grid gap-4 px-4 pb-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={selected.rlsEnabled ? 'success' : 'secondary'}>
                  RLS {selected.rlsEnabled ? 'on' : 'off'}
                </Badge>
                {selected.rowCount ? <Badge variant="secondary">{selected.rowCount} rows</Badge> : null}
                <Button type="button" size="sm" asChild>
                  <Link to={`/editor?table=${encodeURIComponent(selected.name)}`}>Open in Table Editor</Link>
                </Button>
              </div>
              <div>
                <h2 className="mb-2 text-sm font-medium">Columns</h2>
                <CatalogTable
                  columns={[
                    { key: 'name', label: 'name', mono: true },
                    { key: 'type', label: 'type', mono: true },
                    { key: 'pk', label: 'PK' },
                    { key: 'fk', label: 'FK' },
                    { key: 'nullable', label: 'nullable' },
                  ]}
                  rows={selected.columns.map((col) => ({
                    name: col.name,
                    type: col.type,
                    pk: col.pk ? 'yes' : '',
                    fk: col.fk ? 'yes' : '',
                    nullable: col.nullable ? 'yes' : '',
                  }))}
                  empty="No columns"
                />
              </div>
              <div>
                <h2 className="mb-2 text-sm font-medium">View definition</h2>
                <SqlPreview value={formatSql(synthesizeCreateTable(selected))} height={220} />
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </PageChrome>
  )
}
