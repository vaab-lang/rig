import type { StudioTableInfo } from '@/lib/platform-api'

function tsType(sqlType: string): string {
  const t = sqlType.toLowerCase()
  if (t.includes('int') || t.includes('real') || t.includes('num') || t.includes('double') || t.includes('float')) return 'number'
  if (t.includes('bool')) return 'boolean'
  if (t.includes('json')) return 'Record<string, unknown>'
  return 'string'
}

function ident(name: string): string {
  return /^[A-Za-z_][\w]*$/.test(name) ? name : `['${name.replace(/'/g, "\\'")}']`
}

export function generateDatabaseTypes(tables: StudioTableInfo[]): string {
  const blocks = tables.map((table) => {
    const fields = table.columns
      .map((column) => {
        const optional = column.notnull === '1' || column.pk === '1' ? '' : '?'
        return `  ${ident(column.name)}${optional}: ${tsType(column.type)}`
      })
      .join('\n')
    const typeName = table.name
      .split(/[^A-Za-z0-9]+/)
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join('')
    return `export type ${typeName || 'Row'} = {\n${fields || '  [key: string]: unknown'}\n}`
  })
  return `// Generated from GET /studio-api/tables\n\n${blocks.join('\n\n')}\n`
}

export function downloadText(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
