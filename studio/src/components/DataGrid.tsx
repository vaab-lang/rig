import { useMemo, useState, type CSSProperties, type KeyboardEvent, type ReactNode } from 'react'
import * as ContextMenu from '@radix-ui/react-context-menu'
import { ChevronDown, Diamond, MoreHorizontal, Plus, SquareArrowOutUpRight } from 'lucide-react'
import DataGridBase, {
  SelectColumn,
  type Column,
  type RenderEditCellProps,
  type RenderHeaderCellProps,
  type SortColumn,
} from 'react-data-grid'
import 'react-data-grid/lib/styles.css'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export type DataGridColumn = {
  key: string
  name: string
  type?: string
  pk?: boolean
  fk?: boolean
  nullable?: boolean
  frozen?: boolean
}

export type DataGridRow = Record<string, unknown>
type GridRecord = DataGridRow & { __idx: number }

type DataGridProps = {
  columns: Array<string | DataGridColumn>
  rows: DataGridRow[]
  loading?: boolean
  error?: string | null
  onRetry?: () => void
  readOnly?: boolean
  selectable?: boolean
  empty?: string
  onCellCommit?: (rowIdx: number, key: string, value: unknown) => void
  onRowsDelete?: (rowIdxs: number[]) => void
  onAddColumn?: () => void
  onEditColumn?: (key: string) => void
  onDeleteColumn?: (key: string) => void
  onSort?: (key: string, dir: 'ASC' | 'DESC') => void
  onEditRow?: (rowIdx: number) => void
  onInspect?: (rowIdx: number, key: string) => void
  selectedRowIdxs?: number[]
  onSelectedRowIdxsChange?: (idxs: number[]) => void
  tableName?: string
  className?: string
}

const INDEX_KEY = '__index'
const ADD_KEY = '__add'

const rdgTokens: CSSProperties = {
  height: '100%',
  width: '100%',
  minHeight: 240,
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  ['--rdg-color' as string]: 'var(--foreground)',
  ['--rdg-border-color' as string]: 'var(--border)',
  ['--rdg-summary-border-color' as string]: 'var(--border)',
  ['--rdg-background-color' as string]: 'var(--background)',
  ['--rdg-header-background-color' as string]: 'var(--surface)',
  ['--rdg-header-draggable-background-color' as string]: 'var(--elevated)',
  ['--rdg-row-hover-background-color' as string]: 'var(--elevated)',
  ['--rdg-row-selected-background-color' as string]: 'color-mix(in oklch, var(--primary) 16%, var(--background))',
  ['--rdg-row-selected-hover-background-color' as string]: 'color-mix(in oklch, var(--primary) 22%, var(--background))',
  ['--rdg-checkbox-color' as string]: 'var(--primary)',
  ['--rdg-checkbox-focus-color' as string]: 'var(--primary)',
  ['--rdg-checkbox-disabled-border-color' as string]: 'var(--subtle)',
  ['--rdg-checkbox-disabled-background-color' as string]: 'var(--surface)',
  ['--rdg-selection-color' as string]: 'color-mix(in oklch, var(--primary) 28%, transparent)',
  ['--rdg-font-size' as string]: '13px',
}

function normalizeColumns(columns: Array<string | DataGridColumn>): DataGridColumn[] {
  return columns.map((column) =>
    typeof column === 'string' ? { key: column, name: column } : { ...column, key: column.key || column.name, name: column.name || column.key },
  )
}

function formatCell(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string') return value
  try {
    return JSON.stringify(value)
  } catch {
    return String(value)
  }
}

function looksJson(value: unknown, type?: string): boolean {
  if (type === 'jsonb' || type === 'json') return true
  if (typeof value !== 'string') return typeof value === 'object' && value != null
  const trimmed = value.trim()
  return (trimmed.startsWith('{') && trimmed.endsWith('}')) || (trimmed.startsWith('[') && trimmed.endsWith(']'))
}

function CellEditor({ row, column, onRowChange, onClose }: RenderEditCellProps<GridRecord>) {
  const raw = row[column.key]
  const [asNull, setAsNull] = useState(raw === null || raw === undefined)
  const [value, setValue] = useState(asNull ? '' : formatCell(raw))

  function commit(nextNull = asNull, nextValue = value) {
    onRowChange({ ...row, [column.key]: nextNull ? null : nextValue }, true)
  }

  return (
    <div className="flex h-full items-center gap-1 bg-background px-1">
      <input
        autoFocus
        className="h-7 min-w-0 flex-1 bg-transparent font-mono text-[13px] text-foreground outline-none placeholder:text-subtle"
        value={asNull ? '' : value}
        placeholder={asNull ? 'NULL' : ''}
        onChange={(event) => {
          setAsNull(false)
          setValue(event.target.value)
        }}
        onBlur={() => commit()}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault()
            commit()
          }
          if (event.key === 'Escape') {
            event.preventDefault()
            onClose(false)
          }
        }}
      />
      <button
        type="button"
        className="shrink-0 rounded-sm border border-border px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground hover:bg-elevated"
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => {
          setAsNull(true)
          setValue('')
          commit(true, '')
        }}
      >
        NULL
      </button>
    </div>
  )
}

function HeaderCell({
  column,
  meta,
  sortDirection,
  readOnly,
  onSort,
  onEditColumn,
  onDeleteColumn,
  onFreeze,
}: {
  column: { name: string | ReactNode; key: string }
  meta?: DataGridColumn
  sortDirection?: SortColumn['direction']
  readOnly: boolean
  onSort?: (key: string, dir: 'ASC' | 'DESC') => void
  onEditColumn?: (key: string) => void
  onDeleteColumn?: (key: string) => void
  onFreeze?: (key: string) => void
}) {
  return (
    <div className="flex h-full min-w-0 items-center gap-1 font-sans text-xs font-medium text-muted-foreground">
      <span className="truncate">{typeof column.name === 'string' ? column.name : meta?.name ?? column.key}</span>
      {meta?.pk ? <Diamond className="size-3 shrink-0 fill-primary text-primary" aria-label="Primary key" /> : null}
      {meta?.fk ? <SquareArrowOutUpRight className="size-3 shrink-0 text-info" aria-label="Foreign key" /> : null}
      {meta?.nullable ? <span className="text-[11px] text-subtle">?</span> : null}
      {meta?.type ? (
        <span className="rounded-sm border border-border px-1 font-mono text-[10px] text-subtle">{meta.type}</span>
      ) : null}
      {sortDirection ? (
        <ChevronDown
          className={cn('size-3 shrink-0', sortDirection === 'ASC' && 'rotate-180')}
          aria-label={sortDirection === 'ASC' ? 'sorted ascending' : 'sorted descending'}
        />
      ) : null}
      {!readOnly || onSort ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="ml-auto grid size-5 place-items-center rounded-sm text-subtle hover:bg-elevated hover:text-foreground"
              aria-label={`Column actions ${meta?.name ?? column.key}`}
            >
              <MoreHorizontal className="size-3.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => onSort?.(column.key, 'ASC')}>Sort asc</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => onSort?.(column.key, 'DESC')}>Sort desc</DropdownMenuItem>
            {!readOnly ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onEditColumn?.(column.key)}>Edit column</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onFreeze?.(column.key)}>Freeze column</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onDeleteColumn?.(column.key)}>Delete column</DropdownMenuItem>
              </>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  )
}

export function DataGrid({
  columns,
  rows,
  loading = false,
  error = null,
  onRetry,
  readOnly,
  selectable = false,
  empty = 'No rows',
  onCellCommit,
  onRowsDelete,
  onAddColumn,
  onEditColumn,
  onDeleteColumn,
  onSort,
  onEditRow,
  onInspect,
  selectedRowIdxs,
  onSelectedRowIdxsChange,
  tableName,
  className,
}: DataGridProps) {
  const [frozen, setFrozen] = useState<Set<string>>(new Set())
  const [menu, setMenu] = useState<{ rowIdx: number; key: string } | null>(null)
  const [internalSelected, setInternalSelected] = useState<Set<number>>(new Set())

  const canEdit = Boolean(onCellCommit) && readOnly !== true
  const locked = readOnly === true || !onCellCommit
  const normalized = useMemo(() => normalizeColumns(columns), [columns])
  const selected = selectedRowIdxs ? new Set(selectedRowIdxs) : internalSelected

  const gridRows = useMemo<GridRecord[]>(
    () => rows.map((row, index) => ({ ...row, __idx: index })),
    [rows],
  )

  function setSelected(next: Set<number>) {
    if (onSelectedRowIdxsChange) onSelectedRowIdxsChange([...next].sort((a, b) => a - b))
    else setInternalSelected(next)
  }

  const rdgColumns = useMemo(() => {
    const cols: Column<GridRecord>[] = []
    if (selectable) {
      cols.push({
        ...SelectColumn,
        frozen: true,
        width: 44,
        minWidth: 44,
        maxWidth: 44,
      })
    }
    cols.push({
      key: INDEX_KEY,
      name: '',
      frozen: true,
      width: 56,
      minWidth: 52,
      maxWidth: 64,
      renderHeaderCell: () => <span className="sr-only">Row</span>,
      renderCell: ({ row }) => {
        const idx = Number(row.__idx ?? 0)
        return (
          <div className="flex items-center justify-between gap-1 font-mono text-[11px] text-subtle">
            <span>{idx + 1}</span>
            {onEditRow ? (
              <button
                type="button"
                className="rounded-sm p-0.5 hover:bg-elevated hover:text-foreground"
                aria-label={`Expand row ${idx + 1}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onEditRow(idx)
                }}
              >
                <ChevronDown className="size-3 -rotate-90" />
              </button>
            ) : null}
          </div>
        )
      },
    })
    for (const meta of normalized) {
      cols.push({
        key: meta.key,
        name: meta.name,
        frozen: Boolean(meta.frozen || frozen.has(meta.key)),
        resizable: true,
        sortable: true,
        minWidth: 120,
        editable: canEdit,
        renderEditCell: canEdit ? CellEditor : undefined,
        renderHeaderCell: (props: RenderHeaderCellProps<GridRecord>) => (
          <HeaderCell
            column={props.column}
            meta={meta}
            sortDirection={props.sortDirection}
            readOnly={!canEdit && !onSort}
            onSort={onSort}
            onEditColumn={onEditColumn}
            onDeleteColumn={onDeleteColumn}
            onFreeze={(key) => setFrozen((prev) => new Set(prev).add(key))}
          />
        ),
        renderCell: ({ row, rowIdx }) => {
          const value = row[meta.key]
          const isNull = value === null || value === undefined
          const inspectable = Boolean(onInspect && (meta.fk || looksJson(value, meta.type)))
          const body = (
            <span className={cn('block truncate font-mono text-[13px]', isNull && 'italic text-subtle')}>
              {isNull ? 'NULL' : formatCell(value)}
            </span>
          )
          if (readOnly === true && onCellCommit == null && !inspectable) {
            return (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="block truncate">{isNull ? '' : formatCell(value)}</span>
                </TooltipTrigger>
                <TooltipContent>API not mounted</TooltipContent>
              </Tooltip>
            )
          }
          if (inspectable) {
            return (
              <button type="button" className="block w-full truncate text-left" onClick={() => onInspect?.(rowIdx, meta.key)}>
                {body}
              </button>
            )
          }
          return body
        },
      })
    }
    if (onAddColumn && !locked) {
      cols.push({
        key: ADD_KEY,
        name: '',
        width: 44,
        minWidth: 44,
        maxWidth: 44,
        renderHeaderCell: () => (
          <button
            type="button"
            className="grid size-full place-items-center text-muted-foreground hover:text-foreground"
            aria-label="Add column"
            onClick={onAddColumn}
          >
            <Plus className="size-4" />
          </button>
        ),
        renderCell: () => null,
      })
    }
    return cols
  }, [canEdit, frozen, locked, normalized, onAddColumn, onCellCommit, onDeleteColumn, onEditColumn, onEditRow, onInspect, onSort, readOnly, selectable])

  function copyText(text: string) {
    void navigator.clipboard.writeText(text)
    toast.success('Copied')
  }

  function selectedRows(): DataGridRow[] {
    return [...selected].map((idx) => rows[idx]).filter((row): row is DataGridRow => Boolean(row))
  }

  function copyCell() {
    if (!menu) return
    const row = rows[menu.rowIdx]
    copyText(formatCell(row?.[menu.key] ?? null) || 'NULL')
  }

  function copyRowAs(kind: 'json' | 'sql' | 'csv') {
    const idx = menu?.rowIdx ?? [...selected][0]
    if (idx == null) return
    const row = rows[idx]
    if (!row) return
    const keys = normalized.map((column) => column.key)
    if (kind === 'json') {
      const out: Record<string, unknown> = {}
      for (const key of keys) out[key] = row[key] ?? null
      copyText(JSON.stringify(out, null, 2))
      return
    }
    if (kind === 'csv') {
      copyText(keys.map((key) => formatCell(row[key])).join(','))
      return
    }
    const cols = keys.map((key) => `"${key.replace(/"/g, '""')}"`).join(', ')
    const vals = keys
      .map((key) => {
        const value = row[key]
        if (value == null) return 'NULL'
        return `'${String(value).replace(/'/g, "''")}'`
      })
      .join(', ')
    const ident = (tableName || 'table').replace(/"/g, '""')
    copyText(`INSERT INTO "${ident}" (${cols}) VALUES (${vals});`)
  }

  function onGridKey(event: KeyboardEvent<HTMLDivElement>) {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'c' && menu) {
      copyCell()
    }
    if (event.key === 'Delete' && selected.size && onRowsDelete && !locked) {
      event.preventDefault()
      onRowsDelete([...selected])
    }
  }

  if (error) {
    return (
      <Alert variant="destructive">
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

  if (loading && rows.length === 0) {
    return (
      <div className={cn('min-h-[240px] overflow-hidden rounded-md border border-border bg-background', className)}>
        <div className="flex h-9 items-center gap-3 border-b border-border bg-surface px-3 opacity-60">
          {normalized.slice(0, 5).map((column) => (
            <span key={column.key} className="text-xs text-muted-foreground">
              {column.name}
            </span>
          ))}
        </div>
        <div className="grid gap-2 p-3">
          {[0, 1, 2, 3, 4].map((index) => (
            <Skeleton key={index} className="h-8 w-full" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <ContextMenu.Root>
      <ContextMenu.Trigger asChild>
        <div className={cn('h-full min-h-[240px] min-w-0', className)} onKeyDown={onGridKey}>
          <DataGridBase
            className="sb-grid fill-grid"
            style={rdgTokens}
            columns={rdgColumns}
            rows={gridRows}
            rowKeyGetter={(row) => Number(row.__idx ?? 0)}
            rowHeight={35}
            headerRowHeight={36}
            selectedRows={selectable ? selected : undefined}
            onSelectedRowsChange={selectable ? setSelected : undefined}
            onRowsChange={(next, data) => {
              if (!canEdit || !onCellCommit) return
              const columnKey = data.column.key
              if (columnKey === INDEX_KEY || columnKey === ADD_KEY || columnKey === SelectColumn.key) return
              for (const index of data.indexes) {
                const row = next[index]
                if (!row) continue
                onCellCommit(Number(row.__idx ?? index), columnKey, row[columnKey])
              }
            }}
            onCellContextMenu={(args) => {
              const key = args.column.key
              if (key === INDEX_KEY || key === ADD_KEY || key === SelectColumn.key) return
              setMenu({ rowIdx: Number(args.row.__idx ?? 0), key })
            }}
            onCopy={(event) => {
              const value = event.sourceRow[event.sourceColumnKey]
              copyText(value == null ? 'NULL' : formatCell(value))
            }}
            renderers={{
              noRowsFallback: (
                <div className="px-4 py-12 text-center text-sm text-muted-foreground" style={{ gridColumn: '1 / -1' }}>
                  {empty}
                </div>
              ),
            }}
          />
        </div>
      </ContextMenu.Trigger>
      <ContextMenu.Portal>
        <ContextMenu.Content className="z-20 min-w-44 rounded-md border border-border bg-elevated p-1 text-sm shadow-md">
          <ContextMenu.Item
            className="rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-surface"
            onSelect={copyCell}
          >
            Copy cell
          </ContextMenu.Item>
          <ContextMenu.Item
            className="rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-surface"
            onSelect={() => copyRowAs('json')}
          >
            Copy row as JSON
          </ContextMenu.Item>
          <ContextMenu.Item
            className="rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-surface"
            onSelect={() => copyRowAs('sql')}
          >
            Copy row as SQL
          </ContextMenu.Item>
          <ContextMenu.Item
            className="rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-surface"
            onSelect={() => copyRowAs('csv')}
          >
            Copy row as CSV
          </ContextMenu.Item>
          {!locked && onEditRow ? (
            <ContextMenu.Item
              className="rounded-sm px-2 py-1.5 outline-none data-[highlighted]:bg-surface"
              onSelect={() => menu && onEditRow(menu.rowIdx)}
            >
              Edit row
            </ContextMenu.Item>
          ) : null}
          {!locked && onRowsDelete ? (
            <ContextMenu.Item
              className="rounded-sm px-2 py-1.5 text-destructive outline-none data-[highlighted]:bg-surface"
              onSelect={() => {
                const idxs = selected.size ? [...selected] : menu ? [menu.rowIdx] : []
                if (idxs.length) onRowsDelete(idxs)
              }}
            >
              Delete row
            </ContextMenu.Item>
          ) : null}
        </ContextMenu.Content>
      </ContextMenu.Portal>
      {selectedRows().length ? <span className="sr-only">{selected.size} selected</span> : null}
    </ContextMenu.Root>
  )
}
