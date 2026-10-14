import { useEffect, useState, type ReactNode } from 'react'
import Editor, { type OnMount } from '@monaco-editor/react'
import { format } from 'sql-formatter'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'

export type CatalogColumn = {
  key: string
  label: string
  mono?: boolean
}

export function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine))

  useEffect(() => {
    const sync = () => setOnline(navigator.onLine)
    window.addEventListener('online', sync)
    window.addEventListener('offline', sync)
    return () => {
      window.removeEventListener('online', sync)
      window.removeEventListener('offline', sync)
    }
  }, [])

  return online
}

export function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() =>
    typeof window === 'undefined' ? false : window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  )

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = () => setReduced(media.matches)
    onChange()
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [])

  return reduced
}

export function formatSql(sql: string): string {
  try {
    return format(sql, { language: 'sql', tabWidth: 2, keywordCase: 'upper' })
  } catch {
    return sql
  }
}

function registerRigThemes(monaco: Parameters<OnMount>[1]) {
  monaco.editor.defineTheme('rig-tungsten-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B7382' },
      { token: 'keyword', foreground: 'E8A23A' },
      { token: 'string', foreground: '3DBF7A' },
      { token: 'number', foreground: '6B9FD4' },
    ],
    colors: {
      'editor.background': '#1A1E26',
      'editor.foreground': '#ECE8E1',
      'editorCursor.foreground': '#E8A23A',
      'editor.selectionBackground': '#E8A23338',
      'editor.lineHighlightBackground': '#232933',
      'editorLineNumber.foreground': '#6B7382',
      'editorLineNumber.activeForeground': '#9AA3B2',
      'editorIndentGuide.background': '#343B48',
      'editorWhitespace.foreground': '#343B48',
      'editorWidget.background': '#232933',
      focusBorder: '#E8A23A',
    },
  })
  monaco.editor.defineTheme('rig-tungsten-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'comment', foreground: '6B7382' },
      { token: 'keyword', foreground: 'C47E1A' },
      { token: 'string', foreground: '3DBF7A' },
      { token: 'number', foreground: '6B9FD4' },
    ],
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1A1E26',
      'editorCursor.foreground': '#C47E1A',
      'editor.selectionBackground': '#C47E1A2E',
      'editor.lineHighlightBackground': '#F4F5F7',
      'editorLineNumber.foreground': '#6B7382',
      'editorLineNumber.activeForeground': '#1A1E26',
      'editorIndentGuide.background': '#D5DAE3',
      'editorWhitespace.foreground': '#D5DAE3',
      'editorWidget.background': '#FFFFFF',
      focusBorder: '#C47E1A',
    },
  })
}

export function SqlPreview({ value, height = 160 }: { value: string; height?: number }) {
  const light = typeof document !== 'undefined' && document.documentElement.classList.contains('light')
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Editor
        height={height}
        defaultLanguage="sql"
        language="sql"
        value={value}
        theme={light ? 'rig-tungsten-light' : 'rig-tungsten-dark'}
        beforeMount={registerRigThemes}
        options={{
          readOnly: true,
          minimap: { enabled: false },
          fontSize: 13,
          fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
          tabSize: 2,
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          padding: { top: 8 },
          automaticLayout: true,
          cursorStyle: 'line',
        }}
        loading={<pre className="p-3 font-mono text-[13px] text-muted-foreground">{value || ' '}</pre>}
      />
    </div>
  )
}

export function PageChrome({
  title,
  description,
  actions,
  children,
  flush,
}: {
  title: string
  description: string
  actions?: ReactNode
  children: ReactNode
  flush?: boolean
}) {
  const online = useOnline()
  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
          <p className="mt-0.5 max-w-[72ch] text-sm text-muted-foreground">{description}</p>
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </header>
      {!online ? (
        <Alert className="mx-4 mt-3">
          <AlertDescription>Offline. Mutations are disabled.</AlertDescription>
        </Alert>
      ) : null}
      <div className={cn('min-h-0 flex-1', flush ? 'overflow-hidden' : 'overflow-auto p-4')}>{children}</div>
    </div>
  )
}

export function CatalogTable({
  columns,
  rows,
  loading,
  error,
  empty,
  emptyAction,
  onRetry,
  onRowClick,
  rowKey,
  rowAction,
}: {
  columns: CatalogColumn[]
  rows: Record<string, string>[]
  loading?: boolean
  error?: string | null
  empty: string
  emptyAction?: ReactNode
  onRetry?: () => void
  onRowClick?: (row: Record<string, string>) => void
  rowKey?: (row: Record<string, string>, index: number) => string
  rowAction?: (row: Record<string, string>) => ReactNode
}) {
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

  return (
    <div className="min-h-0 overflow-auto rounded-md border border-border bg-surface">
      <Table>
        <TableHeader>
          <TableRow>
            {columns.map((column) => (
              <TableHead key={column.key}>{column.label}</TableHead>
            ))}
            {rowAction ? <TableHead className="w-28"> </TableHead> : null}
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading
            ? [0, 1, 2, 3, 4].map((index) => (
                <TableRow key={`sk-${index}`}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  ))}
                  {rowAction ? (
                    <TableCell>
                      <Skeleton className="h-4 w-12" />
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            : null}
          {!loading && rows.length === 0 ? (
            <TableRow>
              <TableCell colSpan={columns.length + (rowAction ? 1 : 0)} className="py-12 text-center">
                <p className="text-sm text-muted-foreground">{empty}</p>
                {emptyAction ? <div className="mt-3 flex justify-center">{emptyAction}</div> : null}
              </TableCell>
            </TableRow>
          ) : null}
          {!loading
            ? rows.map((row, index) => (
                <TableRow
                  key={rowKey?.(row, index) ?? row.id ?? row.name ?? String(index)}
                  className={onRowClick ? 'cursor-pointer' : undefined}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                >
                  {columns.map((column) => (
                    <TableCell
                      key={column.key}
                      className={cn('max-w-[360px] truncate', column.mono && 'font-mono text-[13px]')}
                    >
                      {row[column.key] ?? ''}
                    </TableCell>
                  ))}
                  {rowAction ? (
                    <TableCell
                      onClick={(event) => {
                        event.stopPropagation()
                      }}
                    >
                      {rowAction(row)}
                    </TableCell>
                  ) : null}
                </TableRow>
              ))
            : null}
        </TableBody>
      </Table>
    </div>
  )
}

export function fieldClassName(): string {
  return 'flex h-9 w-full rounded-md border border-input bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50'
}
