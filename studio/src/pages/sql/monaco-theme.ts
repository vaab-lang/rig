import type { Monaco } from '@monaco-editor/react'

let registered = false

const darkRules = [
  { token: 'comment', foreground: '6B7382' },
  { token: 'keyword', foreground: 'E8A23A' },
  { token: 'string', foreground: '3DBF7A' },
  { token: 'number', foreground: '6B9FD4' },
  { token: 'operator', foreground: '9AA3B2' },
  { token: 'delimiter', foreground: '9AA3B2' },
  { token: 'identifier', foreground: 'ECE8E1' },
  { token: 'invalid', foreground: 'E25555' },
]

const lightRules = [
  { token: 'comment', foreground: '6B7382' },
  { token: 'keyword', foreground: 'C47E1A' },
  { token: 'string', foreground: '3DBF7A' },
  { token: 'number', foreground: '6B9FD4' },
  { token: 'operator', foreground: '6B7382' },
  { token: 'delimiter', foreground: '6B7382' },
  { token: 'identifier', foreground: '1A1E26' },
  { token: 'invalid', foreground: 'E25555' },
]

export const monacoEditorOptions = {
  tabSize: 2,
  fontSize: 13,
  fontFamily: '"IBM Plex Mono", ui-monospace, monospace',
  minimap: { enabled: false },
  lineNumbers: 'on' as const,
  scrollBeyondLastLine: false,
  wordWrap: 'off' as const,
  padding: { top: 8 },
  automaticLayout: true,
  fixedOverflowWidgets: true,
  renderLineHighlight: 'line' as const,
  overviewRulerLanes: 0,
  scrollbar: { verticalScrollbarSize: 8, horizontalScrollbarSize: 8 },
}

export function defineRigMonacoThemes(monaco: Monaco) {
  if (registered) return
  registered = true

  monaco.editor.defineTheme('rig-tungsten-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: darkRules,
    colors: {
      'editor.background': '#1A1E26',
      'editor.foreground': '#ECE8E1',
      'editorCursor.foreground': '#E8A23A',
      'editor.selectionBackground': '#E8A23A38',
      'editor.inactiveSelectionBackground': '#E8A23A24',
      'editor.lineHighlightBackground': '#232933',
      'editorLineNumber.foreground': '#6B7382',
      'editorLineNumber.activeForeground': '#9AA3B2',
      'editorIndentGuide.background': '#343B48',
      'editorWhitespace.foreground': '#343B48',
      'editorWidget.background': '#232933',
      'editorWidget.border': '#343B48',
      'editorSuggestWidget.background': '#232933',
      'editorSuggestWidget.selectedBackground': '#E8A23A29',
      'editorSuggestWidget.foreground': '#ECE8E1',
      'focusBorder': '#E8A23A',
      'editorGutter.background': '#1A1E26',
    },
  })

  monaco.editor.defineTheme('rig-tungsten-light', {
    base: 'vs',
    inherit: true,
    rules: lightRules,
    colors: {
      'editor.background': '#FFFFFF',
      'editor.foreground': '#1A1E26',
      'editorCursor.foreground': '#C47E1A',
      'editor.selectionBackground': '#C47E1A2E',
      'editor.inactiveSelectionBackground': '#C47E1A1F',
      'editor.lineHighlightBackground': '#F4F5F7',
      'editorLineNumber.foreground': '#6B7382',
      'editorLineNumber.activeForeground': '#1A1E26',
      'editorIndentGuide.background': '#D5DAE3',
      'editorWhitespace.foreground': '#D5DAE3',
      'editorWidget.background': '#FFFFFF',
      'editorWidget.border': '#D5DAE3',
      'editorSuggestWidget.background': '#FFFFFF',
      'editorSuggestWidget.selectedBackground': '#C47E1A29',
      'editorSuggestWidget.foreground': '#1A1E26',
      'focusBorder': '#C47E1A',
      'editorGutter.background': '#FFFFFF',
    },
  })
}
