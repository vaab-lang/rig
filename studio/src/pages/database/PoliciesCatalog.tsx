import { useMemo, useState, type FormEvent } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useSearchParams } from 'react-router-dom'
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
import { Textarea } from '@/components/ui/textarea'
import {
  POLICY_TEMPLATES,
  deletePolicy,
  listPolicies,
  loadDatabaseTables,
  newObjectId,
  savePolicy,
  type PolicyRow,
} from '@/lib/database-api'
import { CatalogTable, PageChrome, fieldClassName, useOnline } from './shared'

const emptyPolicy = (): PolicyRow => ({
  id: '',
  schema_name: 'public',
  table_name: '',
  name: POLICY_TEMPLATES[0]?.name ?? 'Enable read access for all users',
  action: 'create',
  roles: POLICY_TEMPLATES[0]?.roles ?? 'public',
  command: POLICY_TEMPLATES[0]?.command ?? 'SELECT',
  definition: POLICY_TEMPLATES[0]?.definition ?? 'true',
  check_expr: POLICY_TEMPLATES[0]?.check_expr ?? '',
  rls_enabled: 'true',
})

export function PoliciesCatalog() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const [params] = useSearchParams()
  const tableFilter = params.get('table')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<PolicyRow>(emptyPolicy)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const query = useQuery({ queryKey: ['studio', 'policies'], queryFn: listPolicies })
  const tablesQuery = useQuery({ queryKey: ['studio', 'tables'], queryFn: loadDatabaseTables })

  const rows = useMemo(() => {
    const list = query.data ?? []
    return tableFilter ? list.filter((row) => row.table_name === tableFilter) : list
  }, [query.data, tableFilter])

  const error = query.error instanceof Error ? query.error.message : null

  function applyTemplate(id: string) {
    const template = POLICY_TEMPLATES.find((item) => item.id === id)
    if (!template) return
    setDraft((current) => ({
      ...current,
      name: template.name,
      roles: template.roles,
      command: template.command,
      definition: template.definition,
      check_expr: template.check_expr,
    }))
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!online) return
    setSaving(true)
    setFormError(null)
    try {
      await savePolicy({
        ...draft,
        id: draft.id || newObjectId('pol'),
        table_name: draft.table_name || tableFilter || '',
        action: 'create',
      })
      toast.success('Saved')
      setOpen(false)
      setDraft(emptyPolicy())
      void query.refetch()
      void queryClient.invalidateQueries({ queryKey: ['studio', 'tables'] })
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onDelete(id: string) {
    if (!online || !id) return
    try {
      await deletePolicy(id)
      toast.success('Saved')
      void query.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <PageChrome
      title="Policies"
      description="Row level security policies for project tables."
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
              setDraft({ ...emptyPolicy(), table_name: tableFilter ?? '' })
              setFormError(null)
              setOpen(true)
            }}
          >
            Create
          </Button>
        </>
      }
    >
      {tableFilter ? <p className="mb-3 text-sm text-muted-foreground">Filtered to {tableFilter}.</p> : null}
      <CatalogTable
        columns={[
          { key: 'name', label: 'name' },
          { key: 'table_name', label: 'table', mono: true },
          { key: 'command', label: 'command' },
          { key: 'roles', label: 'roles', mono: true },
          { key: 'definition', label: 'using', mono: true },
        ]}
        rows={rows}
        loading={query.isLoading}
        error={error}
        empty="No policies"
        emptyAction={
          <Button type="button" size="sm" disabled={!online} onClick={() => setOpen(true)}>
            Create
          </Button>
        }
        onRetry={() => void query.refetch()}
        rowKey={(row) => row.id || `${row.table_name}.${row.name}`}
        rowAction={(row) =>
          row.id ? (
            <Button type="button" variant="outline" size="sm" disabled={!online} onClick={() => void onDelete(row.id ?? '')}>
              Delete
            </Button>
          ) : null
        }
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create</DialogTitle>
            <DialogDescription>Pick a template, then Save the policy.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={(event) => void onSave(event)}>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-template">Template</Label>
              <select
                id="policy-template"
                className={fieldClassName()}
                defaultValue={POLICY_TEMPLATES[0]?.id}
                disabled={!online || saving}
                onChange={(event) => applyTemplate(event.target.value)}
              >
                {POLICY_TEMPLATES.map((template) => (
                  <option key={template.id} value={template.id}>
                    {template.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-table">Table</Label>
              <select
                id="policy-table"
                className={fieldClassName()}
                value={draft.table_name}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, table_name: event.target.value }))}
              >
                <option value="">Select a table</option>
                {(tablesQuery.data ?? []).map((table) => (
                  <option key={`${table.schema}.${table.name}`} value={table.name}>
                    {table.schema}.{table.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-name">Name</Label>
              <Input
                id="policy-name"
                value={draft.name}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-roles">Roles</Label>
              <Input
                id="policy-roles"
                value={draft.roles}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, roles: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-command">Command</Label>
              <Input
                id="policy-command"
                value={draft.command}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, command: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-using">Using</Label>
              <Textarea
                id="policy-using"
                value={draft.definition}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, definition: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-check">Check</Label>
              <Textarea
                id="policy-check"
                value={draft.check_expr}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, check_expr: event.target.value }))}
              />
            </div>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={!online || saving || !draft.table_name || !draft.name}>
                {saving ? 'Saving' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageChrome>
  )
}
