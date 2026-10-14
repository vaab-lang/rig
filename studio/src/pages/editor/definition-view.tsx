import { useEffect, useMemo, useState } from 'react'
import Editor, { useMonaco } from '@monaco-editor/react'
import { format } from 'sql-formatter'
import { createTableSql } from '@/pages/editor/csv'
import type { StudioTable } from '@/lib/table-api'
import { useStudio } from '@/lib/studio-context'

function resolveLight(theme: 'dark' | 'light' | 'system'): boolean {
  if (theme === 'light') return true
  if (theme === 'dark') return false
  return window.matchMedia('(prefers-color-scheme: light)').matches
}

export function DefinitionView({ table }: { table: StudioTable | null }) {
  const monaco = useMonaco()
  const { theme } = useStudio()
  const [ready, setReady] = useState(false)
  const light = resolveLight(theme)

  useEffect(() => {
    if (!monaco) return
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
        'editor.selectionBackground': '#E8A23A38',
        'editor.lineHighlightBackground': '#232933',
        'editorLineNumber.foreground': '#6B7382',
        'editorLineNumber.activeForeground': '#9AA3B2',
        'editorIndentGuide.background': '#343B48',
        'editorWhitespace.foreground': '#343B48',
        'editorWidget.background': '#232933',
        'editorSuggestWidget.selectedBackground': '#E8A23A29',
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
        'editorSuggestWidget.selectedBackground': '#C47E1A29',
        focusBorder: '#C47E1A',
      },
    })
    setReady(true)
  }, [monaco])

  const value = useMemo(() => {
    if (!table) return '-- No table selected'
    const raw = table.sql || createTableSql(table.name, table.columns)
    try {
      return format(raw, { language: 'sqlite' })
    } catch {
      return raw
    }
  }, [table])

  if (!table) {
    return <p className="p-6 text-sm text-muted-foreground">Select a table to view its definition.</p>
  }

  return (
    <div className="h-full min-h-[240px] opacity-90">
      <Editor
        height="100%"
        language="sql"
        theme={ready ? (light ? 'rig-tungsten-light' : 'rig-tungsten-dark') : light ? 'vs' : 'vs-dark'}
        value={value}
        options={{
          readOnly: true,
          tabSize: 2,
          fontSize: 13,
          fontFamily: 'IBM Plex Mono',
          minimap: { enabled: false },
          lineNumbers: 'on',
          scrollBeyondLastLine: false,
          wordWrap: 'off',
          padding: { top: 8 },
          cursorStyle: 'line-thin',
          renderLineHighlight: 'none',
        }}
      />
    </div>
  )
}
