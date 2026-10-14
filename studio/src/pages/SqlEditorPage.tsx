import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation } from 'react-router-dom'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { toast } from 'sonner'
import { SqlWorkbench, type SqlBottomPanel, type SqlQueryResult, type SqlTab } from '@/components/SqlWorkbench'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useMediaQuery } from '@/hooks/use-media-query'
import {
  deleteSnippet,
  fetchPgMetaTables,
  listSnippets,
  runStudioSql,
  saveSnippet,
  type SqlSnippet,
} from '@/lib/sql-api'
import { pushSqlHistory, readSqlHistory, type SqlHistoryItem } from '@/lib/prefs'
import { useRoleStore } from '@/lib/role-store'
import { useStudio } from '@/lib/studio-context'
import { CatalogList } from '@/pages/sql/CatalogList'
import { SQL_QUICKSTARTS } from '@/pages/sql/quickstarts'
import { SnippetTree } from '@/pages/sql/SnippetTree'
import { formatSql, isWriteSql, parseExplainTree, wrapExplain, type ExplainNode } from '@/pages/sql/sql-utils'
import { SQL_TEMPLATES, type SqlCatalogItem } from '@/pages/sql/templates'

const TABS_KEY = 'rig.studio.sqlTabs.v2'
const STARTER = `select *
from profiles
limit 50`

function starterForTable(table?: { name: string; columns: { name: string }[] }): string {
  if (!table?.name) return STARTER
  const cols = table.columns.map((col) => col.name).join(', ') || '*'
  const orderCol = table.columns[0]?.name
  const orderClause = orderCol ? `\norder by ${orderCol} desc` : ''
  return `select ${cols}\nfrom ${table.name}${orderClause}\nlimit 50`
}

function blankTab(name = 'Untitled', value = STARTER): SqlTab {
  return { id: `tab-${crypto.randomUUID()}`, name, value, dirty: false }
}

function readStoredTabs(): { tabs: SqlTab[]; activeId: string } {
  try {
    const raw = localStorage.getItem(TABS_KEY)
    if (!raw) {
      const tab = blankTab()
      return { tabs: [tab], activeId: tab.id }
    }
    const parsed = JSON.parse(raw) as { tabs?: SqlTab[]; activeId?: string }
    const tabs = Array.isArray(parsed.tabs) && parsed.tabs.length ? parsed.tabs : [blankTab()]
    const activeId = parsed.activeId && tabs.some((tab) => tab.id === parsed.activeId) ? parsed.activeId : tabs[0]!.id
    return { tabs, activeId }
  } catch {
    const tab = blankTab()
    return { tabs: [tab], activeId: tab.id }
  }
}

function writeStoredTabs(tabs: SqlTab[], activeId: string) {
  localStorage.setItem(TABS_KEY, JSON.stringify({ tabs, activeId }))
}

export function SqlEditorPage() {
  const location = useLocation()
  const queryClient = useQueryClient()
  const role = useRoleStore((state) => state.role)
  const { theme } = useStudio()
  const systemLight = useMediaQuery('(prefers-color-scheme: light)')
  const isMobile = useMediaQuery('(max-width: 767px)')
  const light = theme === 'light' || (theme === 'system' && systemLight)

  const view = location.pathname.endsWith('/templates')
    ? 'templates'
    : location.pathname.endsWith('/quickstarts')
      ? 'quickstarts'
      : 'snippets'

  const stored = useMemo(() => readStoredTabs(), [])
  const [tabs, setTabs] = useState<SqlTab[]>(stored.tabs)
  const [activeId, setActiveId] = useState(stored.activeId)
  const [result, setResult] = useState<SqlQueryResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [explain, setExplain] = useState<ExplainNode[] | null>(null)
  const [panel, setPanel] = useState<SqlBottomPanel>('results')
  const [history, setHistory] = useState<SqlHistoryItem[]>(() => readSqlHistory())
  const [offline, setOffline] = useState(!navigator.onLine)
  const [saveOpen, setSaveOpen] = useState(false)
  const [saveName, setSaveName] = useState('')
  const [saveFolder, setSaveFolder] = useState('Private')
  const [saveDescription, setSaveDescription] = useState('')
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    writeStoredTabs(tabs, activeId)
  }, [tabs, activeId])

  useEffect(() => {
    const on = () => setOffline(!navigator.onLine)
    window.addEventListener('online', on)
    window.addEventListener('offline', on)
    return () => {
      window.removeEventListener('online', on)
      window.removeEventListener('offline', on)
    }
  }, [])

  const tablesQuery = useQuery({
    queryKey: ['studio', 'pg-meta', 'tables', role],
    queryFn: () => fetchPgMetaTables(role),
  })

  useEffect(() => {
    const first = tablesQuery.data?.[0]
    if (!first) return
    const nextSql = starterForTable(first)
    setTabs((current) =>
      current.map((tab) =>
        !tab.dirty && tab.value === STARTER
          ? { ...tab, value: nextSql }
          : tab,
      ),
    )
  }, [tablesQuery.data])

  const snippetsQuery = useQuery({
    queryKey: ['studio', 'snippets', role],
    queryFn: () => listSnippets(role),
  })

  const snippets = snippetsQuery.data?.snippets ?? []
  const snippetSource = snippetsQuery.data?.source ?? 'local'
  const active = tabs.find((tab) => tab.id === activeId)

  const openSql = useCallback((name: string, sql: string, snippetId?: string) => {
    setTabs((current) => {
      const existing = snippetId ? current.find((tab) => tab.id === snippetId || tab.name === name) : undefined
      if (existing) {
        setActiveId(existing.id)
        return current.map((tab) => (tab.id === existing.id ? { ...tab, value: sql, name, dirty: false } : tab))
      }
      const tab = { ...blankTab(name, sql), dirty: false }
      setActiveId(tab.id)
      return [...current, tab]
    })
  }, [])

  const onChange = useCallback((id: string, value: string) => {
    setTabs((current) =>
      current.map((tab) => (tab.id === id ? { ...tab, value, dirty: true } : tab)),
    )
  }, [])

  const onNewTab = useCallback(() => {
    const tab = blankTab('Untitled', '')
    setTabs((current) => [...current, tab])
    setActiveId(tab.id)
  }, [])

  const onCloseTab = useCallback((id: string) => {
    setTabs((current) => {
      if (current.length === 1) {
        const tab = blankTab()
        setActiveId(tab.id)
        return [tab]
      }
      const next = current.filter((tab) => tab.id !== id)
      setActiveId((active) => (active === id ? (next[next.length - 1]?.id ?? next[0]!.id) : active))
      return next
    })
  }, [])

  const execute = useCallback(
    async (sql: string, mode: 'run' | 'explain') => {
      if (!navigator.onLine) {
        setError('Offline. Reconnect and retry.')
        setResult(null)
        setPanel('results')
        return
      }
      abortRef.current?.abort()
      const controller = new AbortController()
      abortRef.current = controller
      setRunning(true)
      setError(null)
      const payload = mode === 'explain' ? wrapExplain(sql) : sql
      if (mode === 'run') setHistory(pushSqlHistory(sql))
      try {
        const data = await runStudioSql(payload, role, controller.signal)
        const next: SqlQueryResult = {
          columns: data.columns.map((key) => ({ key, name: key })),
          rows: data.rows,
          ms: data.ms,
          affected: data.affected,
        }
        if (mode === 'explain') {
          setExplain(parseExplainTree(data.rows))
          setPanel('explain')
          setResult(next)
        } else {
          setResult(next)
          setPanel('results')
          if (isWriteSql(sql)) {
            toast.success(`${data.affected ?? data.rows.length} rows affected`)
            void queryClient.invalidateQueries({ queryKey: ['studio', 'tables'] })
            void queryClient.invalidateQueries({ queryKey: ['studio', 'pg-meta'] })
          }
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setError('Query aborted')
          setResult(null)
          setPanel('results')
          return
        }
        setResult(null)
        setError(err instanceof Error ? err.message : 'Query failed')
        setPanel('results')
      } finally {
        if (abortRef.current === controller) abortRef.current = null
        setRunning(false)
      }
    },
    [queryClient, role],
  )

  const onRun = useCallback((sql: string) => void execute(sql, 'run'), [execute])
  const onExplain = useCallback((sql: string) => void execute(sql, 'explain'), [execute])
  const onAbort = useCallback(() => abortRef.current?.abort(), [])

  const onFormat = useCallback(() => {
    if (!active) return
    try {
      onChange(active.id, formatSql(active.value))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Format failed')
      setPanel('results')
    }
  }, [active, onChange])

  async function onSave() {
    if (!active || !saveName.trim()) return
    try {
      const saved = await saveSnippet(
        {
          name: saveName.trim(),
          description: saveDescription.trim(),
          sql: active.value,
          folder: saveFolder,
          favorite: saveFolder === 'Favorites',
          visibility: saveFolder === 'Shared' ? 'shared' : 'private',
        },
        role,
        snippetSource,
      )
      setTabs((current) =>
        current.map((tab) => (tab.id === active.id ? { ...tab, name: saved.name, dirty: false } : tab)),
      )
      setSaveOpen(false)
      toast.success(snippetSource === 'local' ? 'Saved locally' : 'Saved')
      void queryClient.invalidateQueries({ queryKey: ['studio', 'snippets'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function onToggleFavorite(snippet: SqlSnippet) {
    try {
      await saveSnippet(
        {
          id: snippet.id,
          name: snippet.name,
          description: snippet.description,
          sql: snippet.sql,
          folder: snippet.folder,
          favorite: !snippet.favorite,
          visibility: snippet.visibility,
        },
        role,
        snippetSource,
      )
      void queryClient.invalidateQueries({ queryKey: ['studio', 'snippets'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Save failed')
    }
  }

  async function onDeleteSnippet(snippet: SqlSnippet) {
    try {
      await deleteSnippet(snippet, role, snippetSource)
      void queryClient.invalidateQueries({ queryKey: ['studio', 'snippets'] })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  const sidebar =
    view === 'templates' ? (
      <CatalogList title="Templates" items={SQL_TEMPLATES} onOpen={(item: SqlCatalogItem) => openSql(item.name, item.sql)} />
    ) : view === 'quickstarts' ? (
      <CatalogList
        title="Quickstarts"
        items={SQL_QUICKSTARTS}
        onOpen={(item: SqlCatalogItem) => openSql(item.name, item.sql)}
      />
    ) : (
      <SnippetTree
        snippets={snippets}
        source={snippetSource}
        loading={snippetsQuery.isLoading}
        error={snippetsQuery.error instanceof Error ? snippetsQuery.error.message : null}
        onOpen={(snippet) => openSql(snippet.name, snippet.sql, snippet.id)}
        onToggleFavorite={(snippet) => void onToggleFavorite(snippet)}
        onDelete={(snippet) => void onDeleteSnippet(snippet)}
        onRetry={() => void snippetsQuery.refetch()}
      />
    )

  const workbench = (
    <SqlWorkbench
      tabs={tabs}
      activeId={activeId}
      onActiveId={setActiveId}
      onChange={onChange}
      onRun={onRun}
      running={running}
      result={result}
      error={error}
      role={role}
      onCloseTab={onCloseTab}
      onNewTab={onNewTab}
      onAbort={onAbort}
      onFormat={onFormat}
      onExplain={onExplain}
      onSaveSnippet={() => {
        setSaveName(active?.name === 'Untitled' ? '' : (active?.name ?? ''))
        setSaveDescription('')
        setSaveFolder('Private')
        setSaveOpen(true)
      }}
      tables={tablesQuery.data ?? []}
      history={history}
      onPickHistory={(sql) => openSql('History', sql)}
      explain={explain}
      panel={panel}
      onPanelChange={setPanel}
      light={light}
      offline={offline}
    />
  )

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      {tablesQuery.error instanceof Error ? (
        <Alert className="rounded-none border-x-0 border-t-0">
          <AlertDescription>{tablesQuery.error.message}</AlertDescription>
        </Alert>
      ) : null}
      {isMobile ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="h-48 shrink-0 overflow-hidden border-b border-border">{sidebar}</div>
          <div className="min-h-0 flex-1">{workbench}</div>
        </div>
      ) : (
        <Group orientation="horizontal" className="min-h-0 flex-1">
          <Panel defaultSize={260} minSize={180} maxSize={360} className="min-h-0">
            {sidebar}
          </Panel>
          <Separator className="w-px bg-border hover:bg-primary/50 data-active:bg-primary" />
          <Panel className="min-h-0 min-w-0">{workbench}</Panel>
        </Group>
      )}

      <Dialog open={saveOpen} onOpenChange={setSaveOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save snippet</DialogTitle>
            <DialogDescription>
              {snippetSource === 'local' ? 'Snippets API is not mounted. Saving locally.' : 'Store this query in a folder.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="snippet-name">Name</Label>
              <Input id="snippet-name" value={saveName} onChange={(event) => setSaveName(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="snippet-folder">Folder</Label>
              <select
                id="snippet-folder"
                className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={saveFolder}
                onChange={(event) => setSaveFolder(event.target.value)}
              >
                <option value="Favorites">Favorites</option>
                <option value="Shared">Shared</option>
                <option value="Private">Private</option>
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="snippet-description">Description</Label>
              <Input
                id="snippet-description"
                value={saveDescription}
                onChange={(event) => setSaveDescription(event.target.value)}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setSaveOpen(false)}>
                Cancel
              </Button>
              <Button type="button" disabled={!saveName.trim()} onClick={() => void onSave()}>
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
