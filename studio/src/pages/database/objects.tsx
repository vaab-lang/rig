import { useMemo, useState, type FormEvent, type ReactNode } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  listEnumTypes,
  listExtensions,
  listFunctions,
  listIndexes,
  listPublications,
  listRoles,
  listTriggers,
  loadDatabaseTables,
  quoteIdent,
  runStudioSql,
  type SqlRow,
} from '@/lib/database-api'
import { CatalogTable, PageChrome, SqlPreview, fieldClassName, formatSql, useOnline } from './shared'

type Field = {
  key: string
  label: string
  placeholder?: string
  textarea?: boolean
  checkbox?: boolean
  tableSelect?: boolean
}

type ObjectConfig = {
  id: string
  title: string
  description: string
  empty: string
  columns: { key: string; label: string; mono?: boolean }[]
  load: () => Promise<SqlRow[]>
  fields: Field[]
  generateSql: (values: Record<string, string>) => string
  createLabel: string
  rowAction?: (row: SqlRow, reload: () => void, online: boolean) => ReactNode
}

function SqlObjectCatalog({ config }: { config: ObjectConfig }) {
  const online = useOnline()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [values, setValues] = useState<Record<string, string>>({})
  const [running, setRunning] = useState(false)
  const [runError, setRunError] = useState<string | null>(null)

  const query = useQuery({ queryKey: ['studio', 'db', config.id], queryFn: config.load })
  const tablesQuery = useQuery({
    queryKey: ['studio', 'tables'],
    queryFn: loadDatabaseTables,
    enabled: config.fields.some((field) => field.tableSelect),
  })

  const sql = useMemo(() => formatSql(config.generateSql(values)), [config, values])
  const error = query.error instanceof Error ? query.error.message : null
  const rows = query.data ?? []

  function reset() {
    setValues({})
    setRunError(null)
    setRunning(false)
  }

  async function onRun(event: FormEvent) {
    event.preventDefault()
    if (!online) return
    setRunning(true)
    setRunError(null)
    try {
      await runStudioSql(sql)
      toast.success('Saved')
      setOpen(false)
      reset()
      void query.refetch()
      void queryClient.invalidateQueries({ queryKey: ['studio', 'tables'] })
    } catch (err) {
      setRunError(err instanceof Error ? err.message : 'Run failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <PageChrome
      title={config.title}
      description={config.description}
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            Refresh
          </Button>
          <Button
            type="button"
            size="sm"
            disabled={!online}
            onClick={() => {
              reset()
              setOpen(true)
            }}
          >
            {config.createLabel}
          </Button>
        </>
      }
    >
      <CatalogTable
        columns={config.columns}
        rows={rows}
        loading={query.isLoading}
        error={error}
        empty={config.empty}
        emptyAction={
          <Button type="button" size="sm" disabled={!online} onClick={() => setOpen(true)}>
            {config.createLabel}
          </Button>
        }
        onRetry={() => void query.refetch()}
        rowKey={(row, index) => row.id ?? row.name ?? String(index)}
        rowAction={config.rowAction ? (row) => config.rowAction?.(row, () => void query.refetch(), online) : undefined}
      />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          setOpen(next)
          if (!next) reset()
        }}
      >
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>{config.createLabel}</DialogTitle>
            <DialogDescription>Review the generated SQL, then Run.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={(event) => void onRun(event)}>
            {config.fields.map((field) => (
              <div key={field.key} className="grid gap-1.5">
                {field.checkbox ? (
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={values[field.key] === 'true'}
                      disabled={!online || running}
                      onChange={(event) =>
                        setValues((current) => ({ ...current, [field.key]: event.target.checked ? 'true' : 'false' }))
                      }
                    />
                    {field.label}
                  </label>
                ) : (
                  <>
                    <Label htmlFor={`${config.id}-${field.key}`}>{field.label}</Label>
                    {field.tableSelect ? (
                      <select
                        id={`${config.id}-${field.key}`}
                        className={fieldClassName()}
                        value={values[field.key] ?? ''}
                        disabled={!online || running}
                        onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                      >
                        <option value="">Select a table</option>
                        {(tablesQuery.data ?? []).map((table) => (
                          <option key={`${table.schema}.${table.name}`} value={table.name}>
                            {table.schema}.{table.name}
                          </option>
                        ))}
                      </select>
                    ) : field.textarea ? (
                      <Textarea
                        id={`${config.id}-${field.key}`}
                        value={values[field.key] ?? ''}
                        placeholder={field.placeholder}
                        disabled={!online || running}
                        onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                      />
                    ) : (
                      <Input
                        id={`${config.id}-${field.key}`}
                        value={values[field.key] ?? ''}
                        placeholder={field.placeholder}
                        disabled={!online || running}
                        onChange={(event) => setValues((current) => ({ ...current, [field.key]: event.target.value }))}
                      />
                    )}
                  </>
                )}
              </div>
            ))}
            <div className="grid gap-1.5">
              <Label>SQL</Label>
              <SqlPreview value={sql} height={140} />
            </div>
            {runError ? (
              <Alert variant="destructive">
                <AlertDescription>{runError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={!online || running || !sql.trim()}>
                {running ? 'Running' : 'Run'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageChrome>
  )
}

async function toggleExtension(name: string, enabled: boolean) {
  const ident = quoteIdent(name)
  await runStudioSql(enabled ? `CREATE EXTENSION IF NOT EXISTS ${ident}` : `DROP EXTENSION IF EXISTS ${ident}`)
}

const FUNCTIONS: ObjectConfig = {
  id: 'functions',
  title: 'Functions',
  description: 'Database functions visible to this gateway.',
  empty: 'No functions',
  columns: [
    { key: 'name', label: 'name', mono: true },
    { key: 'schema', label: 'schema' },
    { key: 'args', label: 'args', mono: true },
    { key: 'result', label: 'returns', mono: true },
  ],
  load: listFunctions,
  createLabel: 'Create',
  fields: [
    { key: 'name', label: 'Name', placeholder: 'handle_new_user' },
    { key: 'args', label: 'Arguments', placeholder: '' },
    { key: 'returns', label: 'Returns', placeholder: 'trigger' },
    { key: 'body', label: 'Body', textarea: true, placeholder: 'SELECT NEW;' },
  ],
  generateSql: (values) => {
    const name = values.name?.trim() || 'new_function'
    const args = values.args?.trim() ?? ''
    const returns = values.returns?.trim() || 'void'
    const body = values.body?.trim() || 'SELECT 1;'
    return `CREATE FUNCTION ${quoteIdent(name)}(${args})\nRETURNS ${returns}\nLANGUAGE sql\nAS $$\n${body}\n$$;`
  },
}

const TRIGGERS: ObjectConfig = {
  id: 'triggers',
  title: 'Triggers',
  description: 'Triggers on tables in this project.',
  empty: 'No triggers',
  columns: [
    { key: 'name', label: 'name', mono: true },
    { key: 'table_name', label: 'table', mono: true },
    { key: 'definition', label: 'definition', mono: true },
  ],
  load: listTriggers,
  createLabel: 'Create',
  fields: [
    { key: 'name', label: 'Name', placeholder: 'todos_updated' },
    { key: 'table', label: 'Table', tableSelect: true },
    { key: 'timing', label: 'Timing', placeholder: 'AFTER INSERT' },
    { key: 'body', label: 'Body', textarea: true, placeholder: 'SELECT 1;' },
  ],
  generateSql: (values) => {
    const name = values.name?.trim() || 'new_trigger'
    const table = values.table?.trim() || 'todos'
    const timing = values.timing?.trim() || 'AFTER INSERT'
    const body = values.body?.trim() || 'SELECT 1;'
    return `CREATE TRIGGER ${quoteIdent(name)}\n${timing} ON ${quoteIdent(table)}\nBEGIN\n  ${body}\nEND;`
  },
}

const TYPES: ObjectConfig = {
  id: 'types',
  title: 'Types',
  description: 'Enumerated types in this database.',
  empty: 'No enumerated types',
  columns: [
    { key: 'name', label: 'name', mono: true },
    { key: 'schema', label: 'schema' },
    { key: 'values', label: 'values', mono: true },
  ],
  load: listEnumTypes,
  createLabel: 'Create',
  fields: [
    { key: 'name', label: 'Name', placeholder: 'todo_status' },
    { key: 'values', label: 'Values', placeholder: 'open, done' },
  ],
  generateSql: (values) => {
    const name = values.name?.trim() || 'new_enum'
    const items = (values.values ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map((item) => `'${item.replaceAll("'", "''")}'`)
    const list = items.length ? items.join(', ') : `'active'`
    return `CREATE TYPE ${quoteIdent(name)} AS ENUM (${list});`
  },
}

const EXTENSIONS: ObjectConfig = {
  id: 'extensions',
  title: 'Extensions',
  description: 'Available and installed database extensions.',
  empty: 'No extensions',
  columns: [
    { key: 'name', label: 'name', mono: true },
    { key: 'version', label: 'version', mono: true },
    { key: 'installed', label: 'installed' },
  ],
  load: listExtensions,
  createLabel: 'Create',
  fields: [{ key: 'name', label: 'Name', placeholder: 'pg_trgm' }],
  generateSql: (values) => `CREATE EXTENSION IF NOT EXISTS ${quoteIdent(values.name?.trim() || 'pg_trgm')};`,
  rowAction: (row, reload, online) => (
    <Switch
      checked={row.installed === 'true'}
      disabled={!online || !row.name}
      aria-label={`Enable ${row.name}`}
      onCheckedChange={(checked) => {
        if (!row.name) return
        void toggleExtension(row.name, checked)
          .then(() => {
            toast.success(checked ? 'Enabled' : 'Disabled')
            reload()
          })
          .catch((err: Error) => toast.error(err.message))
      }}
    />
  ),
}

const INDEXES: ObjectConfig = {
  id: 'indexes',
  title: 'Indexes',
  description: 'Indexes on this database.',
  empty: 'No indexes',
  columns: [
    { key: 'name', label: 'name', mono: true },
    { key: 'table_name', label: 'table', mono: true },
    { key: 'definition', label: 'definition', mono: true },
  ],
  load: listIndexes,
  createLabel: 'Create',
  fields: [
    { key: 'name', label: 'Name', placeholder: 'todos_owner_idx' },
    { key: 'table', label: 'Table', tableSelect: true },
    { key: 'columns', label: 'Columns', placeholder: 'owner' },
    { key: 'unique', label: 'Unique', checkbox: true },
  ],
  generateSql: (values) => {
    const name = values.name?.trim() || 'new_index'
    const table = values.table?.trim() || 'todos'
    const columns = values.columns?.trim() || 'id'
    const unique = values.unique === 'true' ? 'UNIQUE ' : ''
    return `CREATE ${unique}INDEX ${quoteIdent(name)} ON ${quoteIdent(table)} (${columns});`
  },
}

const PUBLICATIONS: ObjectConfig = {
  id: 'publications',
  title: 'Publications',
  description: 'Logical replication publications.',
  empty: 'No publications',
  columns: [
    { key: 'name', label: 'name', mono: true },
    { key: 'all_tables', label: 'all tables' },
    { key: 'inserts', label: 'insert' },
    { key: 'updates', label: 'update' },
    { key: 'deletes', label: 'delete' },
  ],
  load: listPublications,
  createLabel: 'Create',
  fields: [
    { key: 'name', label: 'Name', placeholder: 'supabase_realtime' },
    { key: 'table', label: 'Table', tableSelect: true },
  ],
  generateSql: (values) => {
    const name = values.name?.trim() || 'new_publication'
    const table = values.table?.trim()
    return table
      ? `CREATE PUBLICATION ${quoteIdent(name)} FOR TABLE ${quoteIdent(table)};`
      : `CREATE PUBLICATION ${quoteIdent(name)} FOR ALL TABLES;`
  },
}

const ROLES: ObjectConfig = {
  id: 'roles',
  title: 'Roles',
  description: 'Database roles visible to this gateway.',
  empty: 'No roles',
  columns: [
    { key: 'name', label: 'name', mono: true },
    { key: 'superuser', label: 'superuser' },
    { key: 'can_login', label: 'login' },
  ],
  load: listRoles,
  createLabel: 'Create',
  fields: [
    { key: 'name', label: 'Name', placeholder: 'reporter' },
    { key: 'login', label: 'Login', checkbox: true },
  ],
  generateSql: (values) => {
    const name = values.name?.trim() || 'new_role'
    const login = values.login === 'true' ? 'LOGIN' : 'NOLOGIN'
    return `CREATE ROLE ${quoteIdent(name)} ${login};`
  },
}

export function FunctionsCatalog() {
  return <SqlObjectCatalog config={FUNCTIONS} />
}

export function TriggersCatalog() {
  return <SqlObjectCatalog config={TRIGGERS} />
}

export function TypesCatalog() {
  return <SqlObjectCatalog config={TYPES} />
}

export function ExtensionsCatalog() {
  return <SqlObjectCatalog config={EXTENSIONS} />
}

export function IndexesCatalog() {
  return <SqlObjectCatalog config={INDEXES} />
}

export function PublicationsCatalog() {
  return <SqlObjectCatalog config={PUBLICATIONS} />
}

export function RolesCatalog() {
  return <SqlObjectCatalog config={ROLES} />
}
