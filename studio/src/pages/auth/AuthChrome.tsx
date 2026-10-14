import { useEffect, useState, type ReactNode } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function useOnline() {
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

export function SurfacePage({
  title,
  detail,
  actions,
  children,
  flush,
}: {
  title: string
  detail?: string
  actions?: ReactNode
  children: ReactNode
  flush?: boolean
}) {
  return (
    <div className="flex min-h-full flex-col">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
        <div className="min-w-0">
          <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
          {detail ? <p className="mt-1 max-w-[72ch] text-sm text-muted-foreground">{detail}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
      <div className={cn('min-h-0 flex-1', flush ? 'overflow-hidden' : 'overflow-auto p-4 md:p-6')}>{children}</div>
    </div>
  )
}

export function OfflineBanner({ online }: { online: boolean }) {
  if (online) return null
  return (
    <Alert className="mb-4">
      <AlertDescription>Offline. Mutations are disabled.</AlertDescription>
    </Alert>
  )
}

export function ErrorRetry({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <Alert variant="destructive">
      <AlertDescription className="flex items-center justify-between gap-3">
        <span>{message}</span>
        {onRetry ? (
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>
            Retry
          </Button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

function defineRigTheme() {
  return {
    base: 'vs-dark' as const,
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
      'editor.selectionBackground': '#E8A23A38',
      'editor.lineHighlightBackground': '#232933',
      'editorLineNumber.foreground': '#6B7382',
      'editorLineNumber.activeForeground': '#9AA3B2',
      'editorIndentGuide.background': '#343B48',
      focusBorder: '#E8A23A',
    },
  }
}

export function MonacoPane({
  value,
  onChange,
  language,
  height = 160,
  readOnly = false,
  label,
}: {
  value: string
  onChange?: (value: string) => void
  language: 'sql' | 'json' | 'html'
  height?: number
  readOnly?: boolean
  label: string
}) {
  const monaco = useMonaco()
  useEffect(() => {
    monaco?.editor.defineTheme('rig-tungsten-dark', defineRigTheme())
    monaco?.editor.setTheme('rig-tungsten-dark')
  }, [monaco])
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <Editor
        height={height}
        language={language}
        value={value}
        onChange={(next) => onChange?.(next ?? '')}
        theme="rig-tungsten-dark"
        loading={<div className="bg-surface p-3 text-sm text-muted-foreground">Loading editor</div>}
        options={{
          ariaLabel: label,
          fontSize: 13,
          fontFamily: 'IBM Plex Mono, ui-monospace, monospace',
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          tabSize: 2,
          readOnly,
          padding: { top: 8 },
        }}
      />
    </div>
  )
}
