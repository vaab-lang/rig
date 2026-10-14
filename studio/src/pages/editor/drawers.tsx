import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Textarea } from '@/components/ui/textarea'
import type { StudioTable, TableColumnMeta } from '@/lib/table-api'
import { cellText, parseCsv } from '@/pages/editor/csv'
import { COLUMN_TYPES, emptyColumnDraft, newId, type ColumnDraft, type ForeignKeyDraft } from '@/pages/editor/types'

type TableDrawerProps = {
  open: boolean
  mode: 'new' | 'edit'
  table?: StudioTable
  onOpenChange: (open: boolean) => void
  onSave: (payload: { name: string; columns: ColumnDraft[]; foreignKeys: ForeignKeyDraft[]; rls: boolean }) => void
  saving: boolean
  disabled: boolean
}

export function TableDrawer({ open, mode, table, onOpenChange, onSave, saving, disabled }: TableDrawerProps) {
  const [name, setName] = useState('')
  const [columns, setColumns] = useState<ColumnDraft[]>([
    { id: newId('col'), name: 'id', type: 'text', default: '', pk: true, nullable: false, unique: true },
  ])
  const [foreignKeys, setForeignKeys] = useState<ForeignKeyDraft[]>([])
  const [rls, setRls] = useState(false)

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && table) {
      setName(table.name)
      setColumns(
        table.columns.length
          ? table.columns.map((column) => ({
              id: newId('col'),
              name: column.name,
              type: column.type || 'text',
              default: column.default ?? '',
              pk: column.pk,
              nullable: column.nullable,
              unique: column.unique,
            }))
          : [emptyColumnDraft()],
      )
      setForeignKeys(
        table.foreignKeys.map((fk) => ({ id: newId('fk'), from: fk.from, table: fk.table, to: fk.to })),
      )
      setRls(Boolean(table.rlsEnabled))
      return
    }
    setName('')
    setColumns([{ id: newId('col'), name: 'id', type: 'text', default: '', pk: true, nullable: false, unique: true }])
    setForeignKeys([])
    setRls(false)
  }, [mode, open, table])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>{mode === 'new' ? 'New table' : 'Edit table'}</SheetTitle>
          <SheetDescription>{mode === 'new' ? 'Columns, keys, and RLS.' : `Edit ${table?.name ?? 'table'}.`}</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-4 p-4">
            <Field label="Name" htmlFor="table-name">
              <Input id="table-name" className="font-mono" value={name} onChange={(event) => setName(event.target.value)} />
            </Field>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Columns</p>
              {columns.map((column) => (
                <div key={column.id} className="grid gap-2 rounded-md border border-border p-2">
                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      className="font-mono"
                      placeholder="name"
                      value={column.name}
                      onChange={(event) =>
                        setColumns(columns.map((item) => (item.id === column.id ? { ...item, name: event.target.value } : item)))
                      }
                    />
                    <select
                      className="h-9 rounded-md border border-input bg-background px-2 font-mono text-sm"
                      value={column.type}
                      onChange={(event) =>
                        setColumns(columns.map((item) => (item.id === column.id ? { ...item, type: event.target.value } : item)))
                      }
                    >
                      {COLUMN_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Input
                    className="font-mono"
                    placeholder="default"
                    value={column.default}
                    onChange={(event) =>
                      setColumns(columns.map((item) => (item.id === column.id ? { ...item, default: event.target.value } : item)))
                    }
                  />
                  <div className="flex flex-wrap gap-3 text-sm">
                    <Toggle
                      label="PK"
                      checked={column.pk}
                      onChange={(pk) =>
                        setColumns(columns.map((item) => (item.id === column.id ? { ...item, pk, nullable: pk ? false : item.nullable } : item)))
                      }
                    />
                    <Toggle
                      label="Nullable"
                      checked={column.nullable}
                      onChange={(nullable) =>
                        setColumns(columns.map((item) => (item.id === column.id ? { ...item, nullable } : item)))
                      }
                    />
                    <Toggle
                      label="Unique"
                      checked={column.unique}
                      onChange={(unique) => setColumns(columns.map((item) => (item.id === column.id ? { ...item, unique } : item)))}
                    />
                    <Button type="button" size="sm" variant="ghost" onClick={() => setColumns(columns.filter((item) => item.id !== column.id))}>
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              <Button type="button" size="sm" variant="outline" onClick={() => setColumns([...columns, emptyColumnDraft()])}>
                Add column
              </Button>
            </div>
            <div className="grid gap-2">
              <p className="text-sm font-medium">Foreign keys</p>
              {foreignKeys.map((fk) => (
                <div key={fk.id} className="grid grid-cols-[1fr_1fr_1fr_auto] gap-2">
                  <Input
                    className="font-mono"
                    placeholder="from"
                    value={fk.from}
                    onChange={(event) =>
                      setForeignKeys(foreignKeys.map((item) => (item.id === fk.id ? { ...item, from: event.target.value } : item)))
                    }
                  />
                  <Input
                    className="font-mono"
                    placeholder="table"
                    value={fk.table}
                    onChange={(event) =>
                      setForeignKeys(foreignKeys.map((item) => (item.id === fk.id ? { ...item, table: event.target.value } : item)))
                    }
                  />
                  <Input
                    className="font-mono"
                    placeholder="to"
                    value={fk.to}
                    onChange={(event) =>
                      setForeignKeys(foreignKeys.map((item) => (item.id === fk.id ? { ...item, to: event.target.value } : item)))
                    }
                  />
                  <Button type="button" size="sm" variant="ghost" onClick={() => setForeignKeys(foreignKeys.filter((item) => item.id !== fk.id))}>
                    Remove
                  </Button>
                </div>
              ))}
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={() => setForeignKeys([...foreignKeys, { id: newId('fk'), from: '', table: '', to: 'id' }])}
              >
                Add foreign key
              </Button>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox checked={rls} onCheckedChange={(value) => setRls(value === true)} />
              RLS
            </label>
            <Button
              type="button"
              disabled={disabled || saving || !name.trim()}
              onClick={() => onSave({ name: name.trim(), columns, foreignKeys, rls })}
            >
              Save
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

type ColumnDrawerProps = {
  open: boolean
  mode: 'new' | 'edit'
  column?: TableColumnMeta
  onOpenChange: (open: boolean) => void
  onSave: (column: ColumnDraft) => void
  saving: boolean
  disabled: boolean
}

export function ColumnDrawer({ open, mode, column, onOpenChange, onSave, saving, disabled }: ColumnDrawerProps) {
  const [draft, setDraft] = useState<ColumnDraft>(emptyColumnDraft())

  useEffect(() => {
    if (!open) return
    if (mode === 'edit' && column) {
      setDraft({
        id: newId('col'),
        name: column.name,
        type: column.type || 'text',
        default: column.default ?? '',
        pk: column.pk,
        nullable: column.nullable,
        unique: column.unique,
      })
      return
    }
    setDraft(emptyColumnDraft())
  }, [column, mode, open])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>{mode === 'new' ? 'Add column' : 'Edit column'}</SheetTitle>
          <SheetDescription>{mode === 'new' ? 'Name, type, default, constraints.' : column?.name}</SheetDescription>
        </SheetHeader>
        <div className="grid gap-3 p-4">
          <Field label="Name" htmlFor="col-name">
            <Input
              id="col-name"
              className="font-mono"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </Field>
          <Field label="Type" htmlFor="col-type">
            <select
              id="col-type"
              className="h-9 w-full rounded-md border border-input bg-background px-2 font-mono text-sm"
              value={draft.type}
              onChange={(event) => setDraft({ ...draft, type: event.target.value })}
            >
              {COLUMN_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Default" htmlFor="col-default">
            <Input
              id="col-default"
              className="font-mono"
              value={draft.default}
              onChange={(event) => setDraft({ ...draft, default: event.target.value })}
            />
          </Field>
          <Toggle label="Nullable" checked={draft.nullable} onChange={(nullable) => setDraft({ ...draft, nullable })} />
          <Toggle label="Unique" checked={draft.unique} onChange={(unique) => setDraft({ ...draft, unique })} />
          <Button type="button" disabled={disabled || saving || !draft.name.trim()} onClick={() => onSave(draft)}>
            Save
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  )
}

type RowDrawerProps = {
  open: boolean
  mode: 'insert' | 'edit'
  columns: TableColumnMeta[]
  row?: Record<string, unknown>
  onOpenChange: (open: boolean) => void
  onSave: (values: Record<string, unknown>) => void
  saving: boolean
  disabled: boolean
}

export function RowDrawer({ open, mode, columns, row, onOpenChange, onSave, saving, disabled }: RowDrawerProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const [nulls, setNulls] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!open) return
    const next: Record<string, string> = {}
    const nextNulls = new Set<string>()
    for (const column of columns) {
      const raw = row?.[column.name]
      if (mode === 'edit' && (raw === null || raw === undefined)) {
        next[column.name] = ''
        nextNulls.add(column.name)
      } else {
        next[column.name] = raw == null ? '' : cellText(raw)
      }
    }
    setValues(next)
    setNulls(nextNulls)
  }, [columns, mode, open, row])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>{mode === 'insert' ? 'Insert row' : 'Edit row'}</SheetTitle>
          <SheetDescription>One field per column. NULL is distinct from empty string.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-3 p-4">
            {columns.map((column) => (
              <div key={column.name} className="grid gap-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor={`row-${column.name}`}>
                    {column.name}
                    <span className="ml-1 font-mono text-[10px] text-subtle">{column.type}</span>
                  </Label>
                  <button
                    type="button"
                    className="font-mono text-[10px] text-muted-foreground hover:text-foreground"
                    onClick={() => {
                      setNulls((current) => {
                        const next = new Set(current)
                        if (next.has(column.name)) next.delete(column.name)
                        else next.add(column.name)
                        return next
                      })
                    }}
                  >
                    {nulls.has(column.name) ? 'NULL' : 'Set NULL'}
                  </button>
                </div>
                <Input
                  id={`row-${column.name}`}
                  className="font-mono"
                  disabled={nulls.has(column.name)}
                  value={nulls.has(column.name) ? '' : (values[column.name] ?? '')}
                  placeholder={nulls.has(column.name) ? 'NULL' : ''}
                  onChange={(event) => setValues((current) => ({ ...current, [column.name]: event.target.value }))}
                />
              </div>
            ))}
            <Button
              type="button"
              disabled={disabled || saving}
              onClick={() => {
                const out: Record<string, unknown> = {}
                for (const column of columns) {
                  out[column.name] = nulls.has(column.name) ? null : (values[column.name] ?? '')
                }
                onSave(out)
              }}
            >
              Save
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

type CsvDrawerProps = {
  open: boolean
  columns: string[]
  onOpenChange: (open: boolean) => void
  onImport: (rows: Record<string, string>[]) => void
  saving: boolean
  disabled: boolean
  seedText?: string
}

export function CsvImportDrawer({ open, columns, onOpenChange, onImport, saving, disabled, seedText }: CsvDrawerProps) {
  const [text, setText] = useState('')
  const [map, setMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!open) return
    const next = seedText ?? ''
    setText(next)
    const parsed = parseCsv(next)
    const initial: Record<string, string> = {}
    for (const header of parsed.headers) {
      initial[header] = columns.includes(header) ? header : columns[0] ?? header
    }
    setMap(initial)
  }, [columns, open, seedText])

  const parsed = useMemo(() => parseCsv(text), [text])
  const preview = parsed.rows.slice(0, 20)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>Import CSV</SheetTitle>
          <SheetDescription>Preview the first 20 rows, then map columns.</SheetDescription>
        </SheetHeader>
        <ScrollArea className="min-h-0 flex-1">
          <div className="grid gap-3 p-4">
            <Textarea className="min-h-32 font-mono text-[12px]" value={text} onChange={(event) => setText(event.target.value)} />
            {parsed.headers.map((header) => (
              <label key={header} className="grid grid-cols-[1fr_1fr] items-center gap-2 text-sm">
                <span className="truncate font-mono text-muted-foreground">{header}</span>
                <select
                  className="h-8 rounded-md border border-input bg-background px-2"
                  value={map[header] ?? ''}
                  onChange={(event) => setMap((current) => ({ ...current, [header]: event.target.value }))}
                >
                  <option value="">Skip</option>
                  {columns.map((column) => (
                    <option key={column} value={column}>
                      {column}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="overflow-auto rounded-md border border-border">
              <table className="w-full text-left font-mono text-[11px]">
                <thead className="bg-surface text-muted-foreground">
                  <tr>
                    {parsed.headers.map((header) => (
                      <th key={header} className="px-2 py-1">
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {preview.map((row, index) => (
                    <tr key={index} className="border-t border-border">
                      {parsed.headers.map((_, col) => (
                        <td key={col} className="max-w-[160px] truncate px-2 py-1">
                          {row[col] ?? ''}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Button
              type="button"
              disabled={disabled || saving || parsed.rows.length === 0}
              onClick={() => {
                const rows = parsed.rows.map((row) => {
                  const out: Record<string, string> = {}
                  parsed.headers.forEach((header, index) => {
                    const target = map[header]
                    if (target) out[target] = row[index] ?? ''
                  })
                  return out
                })
                onImport(rows)
              }}
            >
              Import
            </Button>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

type InspectDrawerProps = {
  open: boolean
  title: string
  value: unknown
  onOpenChange: (open: boolean) => void
}

export function InspectDrawer({ open, title, value, onOpenChange }: InspectDrawerProps) {
  const pretty = useMemo(() => {
    if (value == null) return 'NULL'
    if (typeof value === 'string') {
      try {
        return JSON.stringify(JSON.parse(value), null, 2)
      } catch {
        return value
      }
    }
    try {
      return JSON.stringify(value, null, 2)
    } catch {
      return String(value)
    }
  }, [value])

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>Inspect</SheetTitle>
          <SheetDescription>{title}</SheetDescription>
        </SheetHeader>
        <pre className="overflow-auto p-4 font-mono text-[13px]">{pretty}</pre>
      </SheetContent>
    </Sheet>
  )
}

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: ReactNode }) {
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <Checkbox checked={checked} onCheckedChange={(value) => onChange(value === true)} />
      {label}
    </label>
  )
}
