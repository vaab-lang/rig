import { useMemo, useState, type ReactNode } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { Eye, Plus, Search, Table2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { StudioTable } from '@/lib/table-api'
import { cn } from '@/lib/utils'
import { qualify } from '@/pages/editor/types'

type SortMode = 'name' | 'count'

type TableListProps = {
  tables: StudioTable[]
  loading: boolean
  schema: string
  schemas: string[]
  active: { schema: string; table: string } | null
  onSchemaChange: (schema: string) => void
  onSelect: (table: StudioTable) => void
  onNewTable: () => void
  onEditTable: (table: StudioTable) => void
  onDuplicate: (table: StudioTable) => void
  onViewDefinition: (table: StudioTable) => void
  onExportCsv: (table: StudioTable) => void
  onExportSql: (table: StudioTable) => void
  onTruncate: (table: StudioTable) => void
  onDelete: (table: StudioTable) => void
}

export function TableList({
  tables,
  loading,
  schema,
  schemas,
  active,
  onSchemaChange,
  onSelect,
  onNewTable,
  onEditTable,
  onDuplicate,
  onViewDefinition,
  onExportCsv,
  onExportSql,
  onTruncate,
  onDelete,
}: TableListProps) {
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<SortMode>('name')

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = tables.filter((table) => {
      if (schema !== 'all' && table.schema !== schema) return false
      if (!q) return true
      return table.name.toLowerCase().includes(q) || (table.schema || '').toLowerCase().includes(q)
    })
    return list.sort((a, b) => {
      if (sort === 'count') return (b.rowCount ?? -1) - (a.rowCount ?? -1)
      return a.name.localeCompare(b.name)
    })
  }, [query, schema, sort, tables])

  return (
    <aside className="flex h-full min-h-0 w-[220px] shrink-0 flex-col border-r border-border bg-surface">
      <div className="grid gap-2 p-3">
        <label className="grid gap-1">
          <span className="text-[11px] font-medium text-subtle">Schema</span>
          <select
            className="h-8 rounded-md border border-input bg-background px-2 text-sm"
            value={schema}
            onChange={(event) => onSchemaChange(event.target.value)}
          >
            <option value="all">All schemas</option>
            {schemas.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label className="relative block">
          <span className="sr-only">Search tables</span>
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search" className="h-8 pl-7" />
        </label>
        <div className="flex gap-1">
          <Button type="button" size="sm" variant={sort === 'name' ? 'secondary' : 'ghost'} onClick={() => setSort('name')}>
            Name
          </Button>
          <Button type="button" size="sm" variant={sort === 'count' ? 'secondary' : 'ghost'} onClick={() => setSort('count')}>
            Rows
          </Button>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-3">
          {loading ? (
            <div className="grid gap-2 p-1">
              {[0, 1, 2, 3, 4].map((index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          ) : null}
          {!loading && filtered.length === 0 ? (
            <p className="px-2 py-6 text-center text-sm text-muted-foreground">No tables</p>
          ) : null}
          {filtered.map((table) => {
            const selected = active?.table === table.name && active.schema === table.schema
            return (
              <ContextMenu.Root key={`${table.schema}.${table.name}`}>
                <ContextMenu.Trigger asChild>
                  <button
                    type="button"
                    className={cn(
                      'mb-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-muted-foreground hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                      selected && 'border-l-2 border-primary bg-primary/10 pl-[6px] text-primary',
                    )}
                    onClick={() => onSelect(table)}
                  >
                    {table.kind === 'view' ? <Eye className="size-3.5 shrink-0" /> : <Table2 className="size-3.5 shrink-0" />}
                    <span className="min-w-0 flex-1 truncate">{qualify(table.schema, table.name)}</span>
                    {table.rowCount != null ? (
                      <Badge variant="secondary" className="font-mono text-[10px]">
                        {table.estimated ? '~' : ''}
                        {table.rowCount}
                      </Badge>
                    ) : null}
                  </button>
                </ContextMenu.Trigger>
                <ContextMenu.Portal>
                  <ContextMenu.Content className="z-20 min-w-44 rounded-md border border-border bg-elevated p-1 text-sm shadow-md">
                    <MenuItem onSelect={() => onEditTable(table)}>Edit table</MenuItem>
                    <MenuItem onSelect={() => onDuplicate(table)}>Duplicate table</MenuItem>
                    <MenuItem onSelect={() => onViewDefinition(table)}>View definition</MenuItem>
                    <MenuItem onSelect={() => onExportCsv(table)}>Export CSV</MenuItem>
                    <MenuItem onSelect={() => onExportSql(table)}>Export SQL</MenuItem>
                    <MenuItem onSelect={() => onTruncate(table)}>Truncate</MenuItem>
                    <MenuItem danger onSelect={() => onDelete(table)}>
                      Delete
                    </MenuItem>
                  </ContextMenu.Content>
                </ContextMenu.Portal>
              </ContextMenu.Root>
            )
          })}
        </div>
      </ScrollArea>
      <div className="border-t border-border p-3">
        <Button type="button" className="w-full" size="sm" onClick={onNewTable}>
          <Plus className="size-4" />
          New table
        </Button>
      </div>
    </aside>
  )
}

function MenuItem({
  children,
  onSelect,
  danger,
}: {
  children: ReactNode
  onSelect: () => void
  danger?: boolean
}) {
  return (
    <ContextMenu.Item
      className={cn(
        'rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-surface',
        danger && 'text-destructive',
      )}
      onSelect={onSelect}
    >
      {children}
    </ContextMenu.Item>
  )
}
