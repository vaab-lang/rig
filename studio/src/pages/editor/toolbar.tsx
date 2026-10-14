import { useState } from 'react'
import * as Popover from '@radix-ui/react-popover'
import { ArrowUpDown, ChevronDown, ListFilter, Plus, Radio, Shield } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Switch } from '@/components/ui/switch'
import { FILTER_OPS } from '@/lib/table-api'
import { IMPERSONATION_ROLES, type ImpersonationRole } from '@/lib/role-store'
import type { FilterRule, SortRule } from '@/pages/editor/types'
import { newId } from '@/pages/editor/types'

type ToolbarProps = {
  columns: string[]
  filters: FilterRule[]
  sorts: SortRule[]
  onFiltersChange: (filters: FilterRule[]) => void
  onSortsChange: (sorts: SortRule[]) => void
  onInsertRow: () => void
  onInsertColumn: () => void
  onImportCsv: () => void
  rlsCount: number | null
  rlsHref: string
  role: ImpersonationRole
  onRoleChange: (role: ImpersonationRole) => void
  realtime: boolean
  onRealtimeChange: (value: boolean) => void
  view: 'grid' | 'definition'
  onViewChange: (view: 'grid' | 'definition') => void
  selectedCount: number
  onDeleteSelected: () => void
  onExportSelected: (kind: 'csv' | 'sql' | 'json') => void
  disabled: boolean
}

export function EditorToolbar({
  columns,
  filters,
  sorts,
  onFiltersChange,
  onSortsChange,
  onInsertRow,
  onInsertColumn,
  onImportCsv,
  rlsCount,
  rlsHref,
  role,
  onRoleChange,
  realtime,
  onRealtimeChange,
  view,
  onViewChange,
  selectedCount,
  onDeleteSelected,
  onExportSelected,
  disabled,
}: ToolbarProps) {
  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
      <FilterPopover columns={columns} filters={filters} onChange={onFiltersChange} />
      <SortPopover columns={columns} sorts={sorts} onChange={onSortsChange} />
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" disabled={disabled}>
            <Plus className="size-4" />
            Insert
            <ChevronDown className="size-3.5" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start">
          <DropdownMenuItem onSelect={onInsertRow}>Insert row</DropdownMenuItem>
          <DropdownMenuItem onSelect={onInsertColumn}>Insert column</DropdownMenuItem>
          <DropdownMenuItem onSelect={onImportCsv}>Import data from CSV</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <Button type="button" size="sm" variant="outline" asChild>
        <Link to={rlsHref}>
          <Shield className="size-3.5" />
          RLS policies
          {rlsCount != null ? <Badge variant="secondary">{rlsCount}</Badge> : null}
        </Link>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" size="sm" variant="outline" className={role !== 'postgres' ? 'border-l-2 border-l-primary' : undefined}>
            {role}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent>
          {IMPERSONATION_ROLES.map((item) => (
            <DropdownMenuItem key={item} onSelect={() => onRoleChange(item)}>
              {item}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
      <label className="flex items-center gap-2 text-sm text-muted-foreground">
        <Switch checked={realtime} onCheckedChange={onRealtimeChange} />
        <Radio className="size-3.5" />
        Realtime
      </label>
      <div className="flex rounded-md border border-border">
        <Button type="button" size="sm" variant={view === 'grid' ? 'secondary' : 'ghost'} onClick={() => onViewChange('grid')}>
          Grid
        </Button>
        <Button
          type="button"
          size="sm"
          variant={view === 'definition' ? 'secondary' : 'ghost'}
          onClick={() => onViewChange('definition')}
        >
          Definition
        </Button>
      </div>
      {selectedCount > 0 ? (
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button type="button" size="sm" variant="destructive" disabled={disabled} onClick={onDeleteSelected}>
            Delete {selectedCount} rows
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onExportSelected('csv')}>
            Export as CSV
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onExportSelected('sql')}>
            Export as SQL
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => onExportSelected('json')}>
            Export as JSON
          </Button>
        </div>
      ) : null}
    </div>
  )
}

function FilterPopover({
  columns,
  filters,
  onChange,
}: {
  columns: string[]
  filters: FilterRule[]
  onChange: (filters: FilterRule[]) => void
}) {
  const [freeform, setFreeform] = useState('')

  function applyFreeform() {
    const value = freeform.trim()
    if (!value || !columns[0]) return
    onChange([...filters, { id: newId('f'), column: columns[0], op: 'LIKE', value: `%${value}%` }])
    setFreeform('')
  }

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button type="button" size="sm" variant="outline">
          <ListFilter className="size-3.5" />
          Filter
          {filters.length ? <Badge variant="secondary">{filters.length}</Badge> : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" className="z-20 w-[420px] rounded-md border border-border bg-elevated p-3 shadow-md">
          <div className="grid gap-2">
            {filters.map((filter) => (
              <div key={filter.id} className="grid grid-cols-[1fr_110px_1fr_auto] items-center gap-2">
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={filter.column}
                  onChange={(event) =>
                    onChange(filters.map((item) => (item.id === filter.id ? { ...item, column: event.target.value } : item)))
                  }
                >
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 font-mono text-xs"
                  value={filter.op}
                  onChange={(event) =>
                    onChange(filters.map((item) => (item.id === filter.id ? { ...item, op: event.target.value as FilterRule['op'] } : item)))
                  }
                >
                  {FILTER_OPS.map((op) => (
                    <option key={op} value={op}>
                      {op}
                    </option>
                  ))}
                </select>
                <Input
                  className="h-8 font-mono"
                  disabled={filter.op === 'IS NULL'}
                  value={filter.value}
                  onChange={(event) =>
                    onChange(filters.map((item) => (item.id === filter.id ? { ...item, value: event.target.value } : item)))
                  }
                />
                <Button type="button" size="sm" variant="ghost" onClick={() => onChange(filters.filter((item) => item.id !== filter.id))}>
                  Remove
                </Button>
              </div>
            ))}
            <div className="flex gap-2">
              <Input
                className="h-8"
                placeholder="Freeform filter"
                value={freeform}
                onChange={(event) => setFreeform(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') applyFreeform()
                }}
              />
              <Button type="button" size="sm" variant="outline" onClick={applyFreeform}>
                Apply
              </Button>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange([...filters, { id: newId('f'), column: columns[0] ?? '', op: '=', value: '' }])}
            >
              Add filter
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

function SortPopover({
  columns,
  sorts,
  onChange,
}: {
  columns: string[]
  sorts: SortRule[]
  onChange: (sorts: SortRule[]) => void
}) {
  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <Button type="button" size="sm" variant="outline">
          <ArrowUpDown className="size-3.5" />
          Sort
          {sorts.length ? <Badge variant="secondary">{sorts.length}</Badge> : null}
        </Button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" className="z-20 w-[360px] rounded-md border border-border bg-elevated p-3 shadow-md">
          <div className="grid gap-2">
            {sorts.map((sort) => (
              <div key={sort.id} className="grid grid-cols-[1fr_100px_auto] items-center gap-2">
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={sort.column}
                  onChange={(event) =>
                    onChange(sorts.map((item) => (item.id === sort.id ? { ...item, column: event.target.value } : item)))
                  }
                >
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                  value={sort.dir}
                  onChange={(event) =>
                    onChange(sorts.map((item) => (item.id === sort.id ? { ...item, dir: event.target.value as 'ASC' | 'DESC' } : item)))
                  }
                >
                  <option value="ASC">ASC</option>
                  <option value="DESC">DESC</option>
                </select>
                <Button type="button" size="sm" variant="ghost" onClick={() => onChange(sorts.filter((item) => item.id !== sort.id))}>
                  Remove
                </Button>
              </div>
            ))}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => onChange([...sorts, { id: newId('s'), column: columns[0] ?? '', dir: 'ASC' }])}
            >
              Add sort
            </Button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  )
}

export function EditorFooter({
  page,
  pageCount,
  pageSize,
  onPageChange,
  onPageSizeChange,
  count,
  estimated,
  onRefresh,
  ms,
  loading,
}: {
  page: number
  pageCount: number
  pageSize: number
  onPageChange: (page: number) => void
  onPageSizeChange: (size: 100 | 500 | 1000) => void
  count: number
  estimated: boolean
  onRefresh: () => void
  ms: number | null
  loading: boolean
}) {
  return (
    <footer className="flex flex-wrap items-center gap-3 border-t border-border px-3 py-2 text-xs text-muted-foreground">
      <span>
        Page {page} of {Math.max(pageCount, 1)}
      </span>
      <div className="flex items-center gap-1">
        <Button type="button" size="sm" variant="ghost" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Prev
        </Button>
        <Button type="button" size="sm" variant="ghost" disabled={page >= pageCount} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
      <label className="flex items-center gap-1">
        <span className="sr-only">Rows per page</span>
        <select
          className="h-7 rounded-md border border-input bg-background px-2"
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value) as 100 | 500 | 1000)}
        >
          <option value={100}>100</option>
          <option value={500}>500</option>
          <option value={1000}>1000</option>
        </select>
        rows
      </label>
      <span>
        {estimated ? '~' : ''}
        {count} total
      </span>
      <Button type="button" size="sm" variant="outline" onClick={onRefresh} disabled={loading}>
        Refresh
      </Button>
      <span className="ml-auto font-mono">{ms != null ? `${ms} ms` : loading ? '…' : '—'}</span>
    </footer>
  )
}
