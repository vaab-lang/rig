import { useEffect, useMemo, useState, type DragEvent } from 'react'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import { useLocation, useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { DataGrid, type DataGridColumn } from '@/components/DataGrid'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { rowKeys, zipArrayRow } from '@/lib/columns'
import { fetchMeta } from '@/lib/api'
import { useRoleStore } from '@/lib/role-store'
import {
  deleteTableRows,
  fetchStudioTables,
  insertTableRow,
  isUnauthorized,
  patchTableRow,
  queryTableRows,
  rowPrimaryId,
  runTableDdl,
  updateTableRow,
  type DdlBody,
  type RowFilter,
  type RowSort,
  type StudioTable,
} from '@/lib/table-api'
import { cn } from '@/lib/utils'
import { createTableSql, downloadText, rowToJson, rowsToSql, toCsv } from '@/pages/editor/csv'
import { DefinitionView } from '@/pages/editor/definition-view'
import { ColumnDrawer, CsvImportDrawer, InspectDrawer, RowDrawer, TableDrawer } from '@/pages/editor/drawers'
import { TableList } from '@/pages/editor/table-list'
import { EditorFooter, EditorToolbar } from '@/pages/editor/toolbar'
import {
  editorPath,
  newId,
  parseEditorTarget,
  qualify,
  readEditorTabs,
  writeEditorTabs,
  type ColumnDraft,
  type DrawerKind,
  type EditorTab,
  type FilterRule,
  type ForeignKeyDraft,
  type PageSize,
  type SortRule,
} from '@/pages/editor/types'

export function TableEditorPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const role = useRoleStore((state) => state.role)
  const uid = useRoleStore((state) => state.uid)
  const setRole = useRoleStore((state) => state.setRole)

  const target = useMemo(() => parseEditorTarget(location.pathname, location.search), [location.pathname, location.search])

  const [tabs, setTabs] = useState<EditorTab[]>(() => readEditorTabs())
  const [activeTabId, setActiveTabId] = useState<string>(() => {
    const stored = readEditorTabs()
    return stored[0]?.id ?? ''
  })
  const [schemaFilter, setSchemaFilter] = useState('all')
  const [filters, setFilters] = useState<FilterRule[]>([])
  const [sorts, setSorts] = useState<SortRule[]>([])
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState<PageSize>(100)
  const [view, setView] = useState<'grid' | 'definition'>('grid')
  const [realtime, setRealtime] = useState(false)
  const [selected, setSelected] = useState<number[]>([])
  const [drawer, setDrawer] = useState<DrawerKind>({ type: 'none' })
  const [csvSeed, setCsvSeed] = useState('')
  const [offline, setOffline] = useState(!navigator.onLine)
  const [confirm, setConfirm] = useState<{ title: string; body: string; action: () => void } | null>(null)
  const [listOpen, setListOpen] = useState(true)

  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? null
  const activeRef = activeTab?.table ? { schema: activeTab.schema, table: activeTab.table } : target

  useEffect(() => {
    const on = () => setOffline(!navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])

  useEffect(() => {
    writeEditorTabs(tabs)
  }, [tabs])

  useEffect(() => {
    if (!target?.table) return
    setTabs((current) => {
      const existing = current.find((tab) => tab.table === target.table && tab.schema === target.schema)
      if (existing) {
        setActiveTabId(existing.id)
        return current
      }
      const tab: EditorTab = { id: newId('tab'), schema: target.schema, table: target.table, dirty: false }
      setActiveTabId(tab.id)
      return [...current.filter((item) => item.table), tab]
    })
    setPage(1)
    setSelected([])
    setFilters([])
    setSorts([])
  }, [target?.schema, target?.table])

  const tablesQuery = useQuery({
    queryKey: ['studio', 'tables', 'editor', role],
    queryFn: () => fetchStudioTables(role),
  })

  const metaQuery = useQuery({
    queryKey: ['studio', 'meta'],
    queryFn: fetchMeta,
    retry: false,
  })

  const tables = tablesQuery.data ?? []
  const schemas = useMemo(() => {
    return [...new Set(tables.map((table) => table.schema).filter(Boolean))].sort((a, b) => a.localeCompare(b))
  }, [tables])

  const activeTable = tables.find((table) => table.name === activeRef?.table && table.schema === (activeRef?.schema || 'public'))
    ?? tables.find((table) => table.name === activeRef?.table)
    ?? null

  const queryFilters: RowFilter[] = filters.map(({ column, op, value }) => ({ column, op, value }))
  const querySorts: RowSort[] = sorts.map(({ column, dir }) => ({ column, dir }))

  const rowsQuery = useQuery({
    queryKey: ['studio', 'rows', activeRef?.schema, activeRef?.table, queryFilters, querySorts, page, pageSize, role, uid],
    queryFn: () =>
      queryTableRows(
        {
          table: activeRef!.table,
          schema: activeRef?.schema,
          filters: queryFilters,
          sorts: querySorts,
          limit: pageSize,
          offset: (page - 1) * pageSize,
        },
        role,
      ),
    enabled: Boolean(activeRef?.table),
    placeholderData: keepPreviousData,
  })

  useEffect(() => {
    const table = activeRef?.table
    if (!realtime || !table) return
    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const socket = new WebSocket(`${proto}//${window.location.host}/realtime/v1/websocket`)
    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(String(event.data)) as { table?: string; event?: string }
        if (message.table !== table) return
        toast.success(`${message.event ?? 'change'} ${table}`)
        void queryClient.invalidateQueries({ queryKey: ['studio', 'rows'] })
      } catch {
        return
      }
    }
    return () => socket.close()
  }, [realtime, activeRef?.table, queryClient])

  const canPatch = metaQuery.data?.can_patch !== false && !offline
  const canInsert = metaQuery.data?.can_insert !== false && !offline
  const fallback = Boolean(rowsQuery.data?.fallback)
  const unauthorized = isUnauthorized(tablesQuery.error) || isUnauthorized(rowsQuery.error)
  const errorMessage =
    !unauthorized && (tablesQuery.error instanceof Error ? tablesQuery.error.message : rowsQuery.error instanceof Error ? rowsQuery.error.message : null)

  const columnsMeta = useMemo(() => {
    const named = (activeTable?.columns ?? []).filter((column) => column.name.trim())
    const first = rowsQuery.data?.rows[0]
    const keys = rowKeys(first)
    const hits = named.filter((column) => keys.includes(column.name)).length
    if (named.length && (keys.length === 0 || hits > 0 || Array.isArray(first))) return named
    const fallback = keys.length
      ? keys
      : Array.isArray(first)
        ? first.map((_, index) => `col_${index}`)
        : []
    return fallback.map((name) => ({
      name,
      type: 'text',
      pk: name === 'id',
      fk: false,
      nullable: name !== 'id',
      unique: name === 'id',
      default: null,
    }))
  }, [activeTable, rowsQuery.data?.rows])

  const rows = useMemo(() => {
    const raw = rowsQuery.data?.rows ?? []
    const names = columnsMeta.map((column) => column.name)
    return raw.map((row) => (Array.isArray(row) ? zipArrayRow(row, names) : row))
  }, [columnsMeta, rowsQuery.data?.rows])

  const gridColumns: DataGridColumn[] = columnsMeta.map((column) => ({
    key: column.name,
    name: column.name,
    type: column.type,
    pk: column.pk,
    fk: column.fk,
    nullable: column.nullable,
  }))

  const columnNames = columnsMeta.map((column) => column.name)
  const count = rowsQuery.data?.count ?? 0
  const pageCount = Math.max(1, Math.ceil(count / pageSize))

  function markDirty(dirty: boolean) {
    setTabs((current) => current.map((tab) => (tab.id === activeTabId ? { ...tab, dirty } : tab)))
  }

  function openTable(table: StudioTable) {
    navigate(editorPath(table.schema, table.name))
  }

  function addBlankTab() {
    const tab: EditorTab = { id: newId('tab'), schema: 'public', table: '', dirty: false }
    setTabs((current) => [...current, tab])
    setActiveTabId(tab.id)
    navigate('/editor')
  }

  function closeTab(id: string) {
    const tab = tabs.find((item) => item.id === id)
    if (tab?.dirty && !window.confirm('Discard unsaved cell?')) return
    const next = tabs.filter((item) => item.id !== id)
    setTabs(next)
    if (id !== activeTabId) return
    const fallbackTab = next[next.length - 1]
    if (fallbackTab?.table) {
      setActiveTabId(fallbackTab.id)
      navigate(editorPath(fallbackTab.schema, fallbackTab.table))
    } else {
      setActiveTabId(fallbackTab?.id ?? '')
      navigate('/editor')
    }
  }

  function invalidateRows() {
    void queryClient.invalidateQueries({ queryKey: ['studio', 'rows'] })
    void queryClient.invalidateQueries({ queryKey: ['studio', 'tables'] })
  }

  const insertMutation = useMutation({
    mutationFn: (values: Record<string, unknown>) => insertTableRow(activeRef!.table, values, role),
    onSuccess: (result) => {
      toast.success('Inserted')
      if (result.fallback) toast.message('Used fallback insert API')
      setDrawer({ type: 'none' })
      markDirty(false)
      invalidateRows()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const patchMutation = useMutation({
    mutationFn: (input: { id: string; column: string; value: unknown }) =>
      patchTableRow(activeRef!.table, input.id, input.column, input.value, role),
    onSuccess: (result) => {
      toast.success('Saved')
      if (result.fallback) toast.message('Used fallback patch API')
      markDirty(false)
      invalidateRows()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const updateMutation = useMutation({
    mutationFn: (input: { id: string; values: Record<string, unknown> }) =>
      updateTableRow(activeRef!.table, input.id, input.values, role),
    onSuccess: (result) => {
      toast.success('Saved')
      if (result.fallback) toast.message('Used fallback patch API')
      markDirty(false)
      invalidateRows()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => deleteTableRows(activeRef!.table, ids, role),
    onSuccess: () => {
      toast.success('Deleted')
      setSelected([])
      invalidateRows()
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const ddlMutation = useMutation({
    mutationFn: (body: DdlBody) => runTableDdl(body, role),
    onSuccess: () => {
      toast.success('Saved')
      setDrawer({ type: 'none' })
      void queryClient.invalidateQueries({ queryKey: ['studio', 'tables'] })
      void queryClient.invalidateQueries({ queryKey: ['studio', 'rows'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  async function onCellCommit(rowIdx: number, key: string, value: unknown) {
    const row = rows[rowIdx]
    if (!row) return
    const id = rowPrimaryId(row, columnsMeta)
    if (!id) {
      toast.error('Row has no primary key')
      return
    }
    markDirty(true)
    await patchMutation.mutateAsync({ id, column: key, value })
  }

  function idsFromSelection(idxs: number[]): string[] {
    return idxs
      .map((idx) => rows[idx])
      .filter((row): row is Record<string, unknown> => Boolean(row))
      .map((row) => rowPrimaryId(row, columnsMeta))
      .filter(Boolean)
  }

  function confirmDelete(idxs: number[]) {
    const ids = idsFromSelection(idxs)
    if (!ids.length) {
      toast.error('Selected rows have no primary key')
      return
    }
    setConfirm({
      title: `Delete ${ids.length} rows`,
      body: 'This cannot be undone from Studio.',
      action: () => deleteMutation.mutate(ids),
    })
  }

  function exportRows(kind: 'csv' | 'sql' | 'json', source: Record<string, unknown>[], filename: string) {
    if (kind === 'csv') {
      downloadText(`${filename}.csv`, toCsv(columnNames, source), 'text/csv')
      return
    }
    if (kind === 'sql') {
      downloadText(`${filename}.sql`, rowsToSql(activeRef?.table || filename, source, columnNames), 'text/sql')
      return
    }
    downloadText(`${filename}.json`, JSON.stringify(source.map((row) => JSON.parse(rowToJson(row, columnNames))), null, 2), 'application/json')
  }

  function exportSelected(kind: 'csv' | 'sql' | 'json') {
    const source = selected.map((idx) => rows[idx]).filter((row): row is Record<string, unknown> => Boolean(row))
    exportRows(kind, source, activeRef?.table || 'rows')
  }

  async function exportTable(table: StudioTable, kind: 'csv' | 'sql') {
    const page = await queryTableRows({ table: table.name, schema: table.schema, limit: 1000, offset: 0 }, role)
    const headers = table.columns.map((column) => column.name)
    if (kind === 'csv') downloadText(`${table.name}.csv`, toCsv(headers, page.rows), 'text/csv')
    else downloadText(`${table.name}.sql`, rowsToSql(table.name, page.rows, headers), 'text/sql')
  }

  function saveTable(payload: { name: string; columns: ColumnDraft[]; foreignKeys: ForeignKeyDraft[]; rls: boolean }) {
    const columns = payload.columns
      .filter((column) => column.name.trim())
      .map((column) => {
        const fk = payload.foreignKeys.find((item) => item.from === column.name)
        return {
          name: column.name.trim(),
          type: column.type,
          default: column.default,
          pk: column.pk ? 'true' : 'false',
          nullable: column.nullable ? 'true' : 'false',
          unique: column.unique ? 'true' : 'false',
          fk_table: fk?.table ?? '',
          fk_column: fk?.to ?? '',
        }
      })
    const sql = createTableSql(
      payload.name,
      payload.columns.map((column) => ({
        name: column.name,
        type: column.type,
        pk: column.pk,
        nullable: column.nullable,
        unique: column.unique,
        default: column.default || null,
        references: payload.foreignKeys.find((fk) => fk.from === column.name)
          ? { table: payload.foreignKeys.find((fk) => fk.from === column.name)!.table, column: payload.foreignKeys.find((fk) => fk.from === column.name)!.to }
          : null,
      })),
    )
    const editing = drawer.type === 'table' && drawer.mode === 'edit'
    ddlMutation.mutate(
      {
        action: editing ? 'alter' : 'create',
        table: editing ? (activeTable?.name ?? payload.name) : payload.name,
        new_name: editing && payload.name !== activeTable?.name ? payload.name : '',
        sql,
        columns,
        rls_enabled: payload.rls ? 'true' : 'false',
        schema: activeTable?.schema ?? 'public',
      },
      {
        onSuccess: () => {
          navigate(editorPath(activeTable?.schema ?? 'public', payload.name))
        },
      },
    )
  }

  function saveColumn(draft: ColumnDraft) {
    if (!activeRef?.table) return
    const editing = drawer.type === 'column' && drawer.mode === 'edit'
    ddlMutation.mutate({
      action: editing ? 'alter_column' : 'add_column',
      table: activeRef.table,
      schema: activeRef.schema,
      columns: [
        {
          name: draft.name.trim(),
          type: draft.type,
          default: draft.default,
          pk: draft.pk ? 'true' : 'false',
          nullable: draft.nullable ? 'true' : 'false',
          unique: draft.unique ? 'true' : 'false',
        },
      ],
    })
  }

  function dropColumn(key: string) {
    if (!activeRef?.table) return
    setConfirm({
      title: `Delete column ${key}`,
      body: 'Drop this column from the table.',
      action: () =>
        ddlMutation.mutate({
          action: 'drop_column',
          table: activeRef.table,
          schema: activeRef.schema,
          columns: [{ name: key }],
        }),
    })
  }

  async function importCsv(mapped: Record<string, string>[]) {
    if (!activeRef?.table) return
    for (const row of mapped) {
      await insertMutation.mutateAsync(row)
    }
    toast.success('Imported')
    setDrawer({ type: 'none' })
  }

  function onDropCsv(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    if (!file) return
    void file.text().then((text) => {
      setCsvSeed(text)
      setDrawer({ type: 'csv' })
    })
  }

  const inspectValue =
    drawer.type === 'inspect' ? rows[drawer.rowIdx]?.[drawer.key] : undefined
  const mutationsOff = offline || unauthorized || !canInsert

  return (
    <div className="flex h-full min-h-0">
      {listOpen ? (
        <TableList
          tables={tables}
          loading={tablesQuery.isLoading}
          schema={schemaFilter}
          schemas={schemas}
          active={activeRef}
          onSchemaChange={setSchemaFilter}
          onSelect={openTable}
          onNewTable={() => setDrawer({ type: 'table', mode: 'new' })}
          onEditTable={(table) => {
            openTable(table)
            setDrawer({ type: 'table', mode: 'edit', table })
          }}
          onDuplicate={(table) => {
            const name = `${table.name}_copy`
            ddlMutation.mutate({ action: 'duplicate', table: table.name, new_name: name, schema: table.schema })
          }}
          onViewDefinition={(table) => {
            openTable(table)
            setView('definition')
          }}
          onExportCsv={(table) => void exportTable(table, 'csv')}
          onExportSql={(table) => void exportTable(table, 'sql')}
          onTruncate={(table) =>
            setConfirm({
              title: `Truncate ${table.name}`,
              body: 'Delete all rows in this table.',
              action: () => ddlMutation.mutate({ action: 'truncate', table: table.name, schema: table.schema }),
            })
          }
          onDelete={(table) =>
            setConfirm({
              title: `Delete ${table.name}`,
              body: 'Drop this table.',
              action: () => ddlMutation.mutate({ action: 'drop', table: table.name, schema: table.schema }),
            })
          }
        />
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="flex items-center gap-1 overflow-x-auto border-b border-border bg-surface px-2">
          <Button type="button" size="sm" variant="ghost" className="md:hidden" onClick={() => setListOpen((open) => !open)}>
            Tables
          </Button>
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'flex items-center gap-2 border-b-2 border-transparent px-3 py-2 text-sm text-muted-foreground hover:text-foreground',
                tab.id === activeTabId && 'border-primary text-foreground',
              )}
              onClick={() => {
                setActiveTabId(tab.id)
                if (tab.table) navigate(editorPath(tab.schema, tab.table))
                else navigate('/editor')
              }}
            >
              {tab.dirty ? <span className="size-1.5 rounded-full bg-primary" /> : null}
              {tab.table ? qualify(tab.schema, tab.table) : 'Picker'}
              <span
                role="button"
                tabIndex={0}
                aria-label="Close tab"
                className="rounded-sm p-0.5 hover:bg-elevated"
                onClick={(event) => {
                  event.stopPropagation()
                  closeTab(tab.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') closeTab(tab.id)
                }}
              >
                <X className="size-3" />
              </span>
            </button>
          ))}
          <Button type="button" size="icon" variant="ghost" aria-label="New tab" onClick={addBlankTab}>
            <Plus className="size-4" />
          </Button>
        </div>

        {role !== 'postgres' ? (
          <Alert>
            <AlertDescription>
              Viewing as {role}
              {role === 'authenticated' && uid ? ` (${uid})` : ''}. Row policies are applied.
            </AlertDescription>
          </Alert>
        ) : null}
        {offline ? (
          <Alert variant="destructive">
            <AlertDescription>Offline. Mutations are disabled.</AlertDescription>
          </Alert>
        ) : null}
        {unauthorized ? (
          <Alert variant="destructive">
            <AlertDescription>Studio auth required. Reload and enter Basic credentials.</AlertDescription>
          </Alert>
        ) : null}
        {fallback ? (
          <Alert>
            <AlertDescription>Using fallback row API. Filters and pagination run in the browser.</AlertDescription>
          </Alert>
        ) : null}
        {errorMessage ? (
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{errorMessage}</span>
              <Button type="button" size="sm" variant="outline" onClick={() => void rowsQuery.refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        ) : null}

        {!activeRef?.table ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 p-8">
            <p className="text-sm text-muted-foreground">{tables.length ? 'Select a table' : 'No tables'}</p>
            <Button type="button" onClick={() => setDrawer({ type: 'table', mode: 'new' })}>
              New table
            </Button>
          </div>
        ) : (
          <>
            <EditorToolbar
              columns={columnNames}
              filters={filters}
              sorts={sorts}
              onFiltersChange={(next) => {
                setFilters(next)
                setPage(1)
              }}
              onSortsChange={(next) => {
                setSorts(next)
                setPage(1)
              }}
              onInsertRow={() => setDrawer({ type: 'row', mode: 'insert' })}
              onInsertColumn={() => setDrawer({ type: 'column', mode: 'new' })}
              onImportCsv={() => {
                setCsvSeed('')
                setDrawer({ type: 'csv' })
              }}
              rlsCount={activeTable?.rlsCount ?? null}
              rlsHref={`/database/policies?table=${encodeURIComponent(activeRef.table)}`}
              role={role}
              onRoleChange={setRole}
              realtime={realtime}
              onRealtimeChange={(value) => {
                setRealtime(value)
                toast.success(value ? 'Realtime on' : 'Realtime off')
              }}
              view={view}
              onViewChange={setView}
              selectedCount={selected.length}
              onDeleteSelected={() => confirmDelete(selected)}
              onExportSelected={exportSelected}
              disabled={mutationsOff}
            />

            <div
              className="min-h-0 flex-1"
              onDragOver={(event) => event.preventDefault()}
              onDrop={onDropCsv}
            >
              {view === 'definition' ? (
                <DefinitionView table={activeTable} />
              ) : !rows.length && !rowsQuery.isLoading && !errorMessage ? (
                <div className="flex h-full flex-col items-center justify-center gap-3">
                  <p className="text-sm text-muted-foreground">No rows</p>
                  <Button type="button" disabled={mutationsOff} onClick={() => setDrawer({ type: 'row', mode: 'insert' })}>
                    Insert
                  </Button>
                </div>
              ) : (
                <DataGrid
                  columns={gridColumns}
                  rows={rows}
                  loading={rowsQuery.isLoading}
                  selectable
                  tableName={activeRef.table}
                  readOnly={!canPatch || unauthorized}
                  onCellCommit={canPatch && !unauthorized ? onCellCommit : undefined}
                  onRowsDelete={confirmDelete}
                  onAddColumn={() => setDrawer({ type: 'column', mode: 'new' })}
                  onEditColumn={(key) =>
                    setDrawer({ type: 'column', mode: 'edit', column: columnsMeta.find((column) => column.name === key) })
                  }
                  onDeleteColumn={dropColumn}
                  onSort={(key, dir) => {
                    setSorts([{ id: newId('s'), column: key, dir }])
                    setPage(1)
                  }}
                  onEditRow={(rowIdx) => setDrawer({ type: 'row', mode: 'edit', row: rows[rowIdx] })}
                  onInspect={(rowIdx, key) => setDrawer({ type: 'inspect', rowIdx, key })}
                  selectedRowIdxs={selected}
                  onSelectedRowIdxsChange={setSelected}
                  empty="No rows"
                />
              )}
            </div>

            <EditorFooter
              page={page}
              pageCount={pageCount}
              pageSize={pageSize}
              onPageChange={setPage}
              onPageSizeChange={(size) => {
                setPageSize(size)
                setPage(1)
              }}
              count={count}
              estimated={Boolean(rowsQuery.data?.estimated)}
              onRefresh={() => {
                if (activeTab?.dirty && !window.confirm('Discard unsaved cell?')) return
                void rowsQuery.refetch()
              }}
              ms={rowsQuery.data?.ms ?? null}
              loading={rowsQuery.isFetching}
            />
          </>
        )}
      </div>

      <TableDrawer
        open={drawer.type === 'table'}
        mode={drawer.type === 'table' ? drawer.mode : 'new'}
        table={drawer.type === 'table' ? drawer.table : undefined}
        onOpenChange={(open) => !open && setDrawer({ type: 'none' })}
        onSave={saveTable}
        saving={ddlMutation.isPending}
        disabled={mutationsOff}
      />
      <ColumnDrawer
        open={drawer.type === 'column'}
        mode={drawer.type === 'column' ? drawer.mode : 'new'}
        column={drawer.type === 'column' ? drawer.column : undefined}
        onOpenChange={(open) => !open && setDrawer({ type: 'none' })}
        onSave={saveColumn}
        saving={ddlMutation.isPending}
        disabled={mutationsOff}
      />
      <RowDrawer
        open={drawer.type === 'row'}
        mode={drawer.type === 'row' ? drawer.mode : 'insert'}
        columns={columnsMeta}
        row={drawer.type === 'row' ? drawer.row : undefined}
        onOpenChange={(open) => !open && setDrawer({ type: 'none' })}
        onSave={(values) => {
          if (drawer.type === 'row' && drawer.mode === 'edit') {
            const id = rowPrimaryId(drawer.row ?? values, columnsMeta)
            if (!id) {
              toast.error('Row has no primary key')
              return
            }
            updateMutation.mutate({ id, values }, { onSuccess: () => setDrawer({ type: 'none' }) })
            return
          }
          insertMutation.mutate(values)
        }}
        saving={insertMutation.isPending || updateMutation.isPending}
        disabled={mutationsOff}
      />
      <CsvImportDrawer
        open={drawer.type === 'csv'}
        columns={columnNames}
        seedText={csvSeed}
        onOpenChange={(open) => !open && setDrawer({ type: 'none' })}
        onImport={(mapped) => void importCsv(mapped)}
        saving={insertMutation.isPending}
        disabled={mutationsOff}
      />
      <InspectDrawer
        open={drawer.type === 'inspect'}
        title={drawer.type === 'inspect' ? drawer.key : ''}
        value={inspectValue}
        onOpenChange={(open) => !open && setDrawer({ type: 'none' })}
      />

      <Dialog open={Boolean(confirm)} onOpenChange={(open) => !open && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.title}</DialogTitle>
            <DialogDescription>{confirm?.body}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setConfirm(null)}>
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={mutationsOff}
              onClick={() => {
                confirm?.action()
                setConfirm(null)
              }}
            >
              Delete
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
