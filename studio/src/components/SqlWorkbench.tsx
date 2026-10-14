import { useEffect, useMemo, useRef, useState } from 'react'
import Editor, { type Monaco, type OnMount } from '@monaco-editor/react'
import type { editor, IPosition, languages } from 'monaco-editor'
import { AlertTriangle, Download, Loader2, Play, Plus, Square, Wand2, X } from 'lucide-react'
import DataGrid, { type Column } from 'react-data-grid'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { IMPERSONATION_ROLES, useRoleStore, type ImpersonationRole } from '@/lib/role-store'
import type { PgMetaTable, SqlRow } from '@/lib/sql-api'
import type { SqlHistoryItem } from '@/lib/prefs'
import { cn } from '@/lib/utils'
import { ExplainView } from '@/pages/sql/ExplainView'
import { defineRigMonacoThemes, monacoEditorOptions } from '@/pages/sql/monaco-theme'
import { ResultsChart } from '@/pages/sql/ResultsChart'
import {
  cellDisplay,
  copyText,
  downloadText,
  isDestructiveSql,
  toCsv,
  toMarkdown,
  type ExplainNode,
} from '@/pages/sql/sql-utils'
import 'react-data-grid/lib/styles.css'

export type DataGridColumn = {
  key: string
  name: string
  type?: string
  pk?: boolean
  fk?: boolean
  nullable?: boolean
  frozen?: boolean
}

export type SqlTab = {
  id: string
  name: string
  value: string
  dirty?: boolean
}

export type SqlQueryResult = {
  columns: DataGridColumn[]
  rows: SqlRow[]
  ms: number
  affected?: number
}

export type SqlBottomPanel = 'results' | 'chart' | 'explain' | 'history'

type ResultRow = SqlRow & { __rid: number }

export type SqlWorkbenchProps = {
  tabs: SqlTab[]
  activeId: string
  onActiveId: (id: string) => void
  onChange: (id: string, value: string) => void
  onRun: (sql: string) => void
  running: boolean
  result: SqlQueryResult | null
  error: string | null
  role: ImpersonationRole
  onCloseTab?: (id: string) => void
  onNewTab?: () => void
  onAbort?: () => void
  onFormat?: () => void
  onExplain?: (sql: string) => void
  onSaveSnippet?: () => void
  tables?: PgMetaTable[]
  history?: SqlHistoryItem[]
  onPickHistory?: (sql: string) => void
  explain?: ExplainNode[] | null
  panel?: SqlBottomPanel
  onPanelChange?: (panel: SqlBottomPanel) => void
  light?: boolean
  offline?: boolean
}

function selectedOrAll(instance: editor.IStandaloneCodeEditor | null, fallback: string): string {
  if (!instance) return fallback
  const selection = instance.getSelection()
  if (selection && !selection.isEmpty()) {
    const selected = instance.getModel()?.getValueInRange(selection) ?? ''
    if (selected.trim()) return selected
  }
  return instance.getValue() || fallback
}

export function SqlWorkbench({
  tabs,
  activeId,
  onActiveId,
  onChange,
  onRun,
  running,
  result,
  error,
  role,
  onCloseTab,
  onNewTab,
  onAbort,
  onFormat,
  onExplain,
  onSaveSnippet,
  tables = [],
  history = [],
  onPickHistory,
  explain = null,
  panel = 'results',
  onPanelChange,
  light = false,
  offline = false,
}: SqlWorkbenchProps) {
  const setRole = useRoleStore((state) => state.setRole)
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null)
  const monacoRef = useRef<Monaco | null>(null)
  const tablesRef = useRef(tables)
  const onRunRef = useRef(onRun)
  const [monacoReady, setMonacoReady] = useState(false)
  tablesRef.current = tables
  onRunRef.current = onRun

  const active = tabs.find((tab) => tab.id === activeId) ?? tabs[0]
  const sql = active?.value ?? ''
  const destructive = isDestructiveSql(sql)
  const themeName = light ? 'rig-tungsten-light' : 'rig-tungsten-dark'

  useEffect(() => {
    const monaco = monacoRef.current
    if (!monaco || !monacoReady) return
    const disposable = monaco.languages.registerCompletionItemProvider('sql', {
      triggerCharacters: ['.'],
      provideCompletionItems: (model: editor.ITextModel, position: IPosition) => {
        const word = model.getWordUntilPosition(position)
        const range = {
          startLineNumber: position.lineNumber,
          endLineNumber: position.lineNumber,
          startColumn: word.startColumn,
          endColumn: word.endColumn,
        }
        const line = model.getValueInRange({
          startLineNumber: position.lineNumber,
          startColumn: 1,
          endLineNumber: position.lineNumber,
          endColumn: position.column,
        })
        const dotted = /(\w+)\.(\w*)$/.exec(line)
        const suggestions: languages.CompletionItem[] = []
        for (const table of tablesRef.current) {
          if (dotted) {
            if (table.name !== dotted[1]) continue
            for (const column of table.columns) {
              suggestions.push({
                label: column.name,
                kind: monaco.languages.CompletionItemKind.Field,
                insertText: column.name,
                detail: `${table.name}.${column.name} ${column.type}`,
                range,
              })
            }
            continue
          }
          suggestions.push({
            label: table.name,
            kind: monaco.languages.CompletionItemKind.Class,
            insertText: table.name,
            detail: `${table.schema}.${table.name}`,
            range,
          })
          for (const column of table.columns) {
            suggestions.push({
              label: `${table.name}.${column.name}`,
              kind: monaco.languages.CompletionItemKind.Field,
              insertText: `${table.name}.${column.name}`,
              detail: column.type,
              range,
            })
          }
        }
        return { suggestions }
      },
    })
    return () => disposable.dispose()
  }, [monacoReady, tables])

  const beforeMount = (monaco: Monaco) => {
    monacoRef.current = monaco
    defineRigMonacoThemes(monaco)
    setMonacoReady(true)
  }

  const onMount: OnMount = (instance, monaco) => {
    editorRef.current = instance
    monacoRef.current = monaco
    defineRigMonacoThemes(monaco)
    setMonacoReady(true)
    instance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
      onRunRef.current(selectedOrAll(instance, instance.getValue()))
    })
  }

  const runCurrent = () => onRun(selectedOrAll(editorRef.current, sql))
  const explainCurrent = () => onExplain?.(selectedOrAll(editorRef.current, sql))

  const gridColumns = useMemo<Column<ResultRow>[]>(() => {
    if (!result) return []
    return result.columns
      .filter((column) => column.key !== '__rid')
      .map((column) => ({
        key: column.key,
        name: column.name,
        resizable: true,
        renderCell: ({ row }: { row: ResultRow }) => (
          <span className="font-mono text-[13px]">{cellDisplay(row[column.key])}</span>
        ),
      }))
  }, [result])

  const gridRows = useMemo<ResultRow[]>(
    () => (result ? result.rows.map((row, index) => ({ ...row, __rid: index })) : []),
    [result],
  )

  const resultKeys = result?.columns.map((column) => column.key).filter((key) => key !== '__rid') ?? []

  async function copyAs(kind: 'markdown' | 'json' | 'csv') {
    if (!result) return
    const text =
      kind === 'json'
        ? JSON.stringify(result.rows, null, 2)
        : kind === 'markdown'
          ? toMarkdown(resultKeys, result.rows)
          : toCsv(resultKeys, result.rows)
    await copyText(text)
    toast.success('Copied')
  }

  function downloadCsv() {
    if (!result) return
    downloadText('query.csv', toCsv(resultKeys, result.rows), 'text/csv')
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex min-h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-border bg-surface px-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            className={cn(
              'flex h-9 items-center gap-2 rounded-sm px-2 text-sm',
              tab.id === activeId ? 'bg-primary/10 text-foreground' : 'text-muted-foreground hover:bg-elevated',
            )}
            onClick={() => onActiveId(tab.id)}
          >
            {tab.dirty ? <span className="size-1.5 rounded-full bg-primary" aria-hidden /> : null}
            <span className="max-w-40 truncate">{tab.name}</span>
            {onCloseTab ? (
              <span
                role="button"
                tabIndex={0}
                className="rounded-sm p-0.5 text-subtle hover:bg-elevated hover:text-foreground"
                aria-label={`Close ${tab.name}`}
                onClick={(event) => {
                  event.stopPropagation()
                  onCloseTab(tab.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    event.stopPropagation()
                    onCloseTab(tab.id)
                  }
                }}
              >
                <X className="size-3" />
              </span>
            ) : null}
          </button>
        ))}
        {onNewTab ? (
          <Button type="button" size="icon" variant="ghost" className="size-8" aria-label="New tab" onClick={onNewTab}>
            <Plus className="size-4" />
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border bg-surface px-3 py-2">
        <Button type="button" size="sm" disabled={running || offline} onClick={runCurrent}>
          {running ? <Loader2 className="size-4 animate-spin" /> : <Play className="size-4" />}
          {running ? 'Running' : 'Run'}
        </Button>
        {running && onAbort ? (
          <Button type="button" size="sm" variant="outline" onClick={onAbort}>
            <Square className="size-3.5" />
            Abort
          </Button>
        ) : null}
        {onFormat ? (
          <Button type="button" size="sm" variant="outline" disabled={offline} onClick={onFormat}>
            <Wand2 className="size-4" />
            Format SQL
          </Button>
        ) : null}
        {onExplain ? (
          <Button type="button" size="sm" variant="outline" disabled={running || offline} onClick={explainCurrent}>
            Explain
          </Button>
        ) : null}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button type="button" size="sm" variant="outline" aria-label={`Role ${role}`}>
              {role}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuLabel>Role</DropdownMenuLabel>
            {IMPERSONATION_ROLES.map((item) => (
              <DropdownMenuItem key={item} onSelect={() => setRole(item)}>
                <span className={item === role ? 'text-primary' : undefined}>{item}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        {onSaveSnippet ? (
          <Button type="button" size="sm" variant="outline" disabled={offline} onClick={onSaveSnippet}>
            Save
          </Button>
        ) : null}
        <span className="ml-auto font-mono text-[11px] text-subtle">⌘Enter</span>
      </div>

      {role !== 'postgres' ? (
        <Alert className="rounded-none border-x-0 border-t-0">
          <AlertDescription>Viewing as {role}</AlertDescription>
        </Alert>
      ) : null}
      {offline ? (
        <Alert className="rounded-none border-x-0 border-t-0">
          <AlertDescription>Offline. Mutations are disabled.</AlertDescription>
        </Alert>
      ) : null}
      {destructive ? (
        <Alert variant="destructive" className="rounded-none border-x-0 border-t-0">
          <AlertDescription className="flex items-center gap-2">
            <AlertTriangle className="size-3.5" />
            This statement writes or drops data.
          </AlertDescription>
        </Alert>
      ) : null}

      <Group orientation="vertical" className="min-h-0 flex-1">
        <Panel defaultSize="55" minSize="20" className="min-h-0">
          <div
            className={cn('h-full min-h-0', light ? 'rig-tungsten-light' : 'rig-tungsten-dark')}
            role="region"
            aria-label="SQL editor"
          >
            {active ? (
              <Editor
                path={active.id}
                value={active.value}
                language="sql"
                theme={themeName}
                options={monacoEditorOptions}
                beforeMount={beforeMount}
                onMount={onMount}
                onChange={(value) => onChange(active.id, value ?? '')}
              />
            ) : null}
          </div>
        </Panel>
        <Separator className="h-px bg-border hover:bg-primary/50 data-active:bg-primary" />
        <Panel defaultSize="45" minSize="20" className="min-h-0">
          <Tabs
            value={panel}
            onValueChange={(value) => onPanelChange?.(value as SqlBottomPanel)}
            className="flex h-full min-h-0 flex-col"
          >
            <div className="flex items-center justify-between gap-2 border-b border-border bg-surface px-2">
              <TabsList className="bg-transparent">
                <TabsTrigger value="results">Results</TabsTrigger>
                <TabsTrigger value="chart">Chart</TabsTrigger>
                <TabsTrigger value="explain">Explain</TabsTrigger>
                <TabsTrigger value="history">History</TabsTrigger>
              </TabsList>
              <div className="flex items-center gap-2">
                {result ? (
                  <>
                    <span className="font-mono text-xs text-muted-foreground">
                      {result.affected !== undefined
                        ? `${result.affected} rows affected`
                        : `${result.rows.length} row${result.rows.length === 1 ? '' : 's'}`}
                      {` · ${result.ms} ms`}
                    </span>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" size="sm" variant="ghost" disabled={!result}>
                          Copy
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onSelect={() => void copyAs('markdown')}>Copy as Markdown</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void copyAs('json')}>Copy as JSON</DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => void copyAs('csv')}>Copy as CSV</DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                    <Button type="button" size="sm" variant="ghost" disabled={!result} onClick={downloadCsv}>
                      <Download className="size-3.5" />
                      Download CSV
                    </Button>
                  </>
                ) : (
                  <span className="font-mono text-xs text-subtle">—</span>
                )}
              </div>
            </div>
            <TabsContent value="results" className="mt-0 min-h-0 flex-1 overflow-hidden">
              {error ? (
                <Alert variant="destructive" className="m-3">
                  <AlertDescription className="font-mono text-[13px] whitespace-pre-wrap">{error}</AlertDescription>
                </Alert>
              ) : result ? (
                result.rows.length === 0 ? (
                  <p className="p-8 text-center text-sm text-muted-foreground">
                    {result.affected !== undefined ? `${result.affected} rows affected` : '0 rows'}
                  </p>
                ) : (
                  <DataGrid
                    columns={gridColumns}
                    rows={gridRows}
                    rowKeyGetter={(row) => String(row.__rid)}
                    className="h-full fill-grid"
                    style={{ height: '100%' }}
                    defaultColumnOptions={{ resizable: true }}
                  />
                )
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">Run a query to see results.</p>
              )}
            </TabsContent>
            <TabsContent value="chart" className="mt-0 min-h-0 flex-1 overflow-hidden">
              {result ? (
                <ResultsChart columns={resultKeys} rows={result.rows} />
              ) : (
                <p className="p-8 text-center text-sm text-muted-foreground">Run a query to chart results.</p>
              )}
            </TabsContent>
            <TabsContent value="explain" className="mt-0 min-h-0 flex-1 overflow-auto">
              <ExplainView nodes={explain} />
            </TabsContent>
            <TabsContent value="history" className="mt-0 min-h-0 flex-1 overflow-auto">
              {history.length === 0 ? (
                <p className="p-8 text-center text-sm text-muted-foreground">No history</p>
              ) : (
                <ul className="p-2">
                  {history.map((item) => (
                    <li key={`${item.at}-${item.sql.slice(0, 24)}`}>
                      <button
                        type="button"
                        className="mb-1 w-full rounded-md px-2 py-2 text-left hover:bg-elevated"
                        onClick={() => onPickHistory?.(item.sql)}
                      >
                        <span className="block font-mono text-[11px] text-subtle">
                          {new Date(item.at).toLocaleString()}
                        </span>
                        <span className="block truncate font-mono text-[13px]">{item.sql.replace(/\s+/g, ' ')}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </TabsContent>
          </Tabs>
        </Panel>
      </Group>
    </div>
  )
}
