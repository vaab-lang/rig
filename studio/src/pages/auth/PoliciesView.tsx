import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listTables } from '@/lib/api'
import {
  deletePolicy,
  listPolicies,
  POLICY_TEMPLATES,
  savePolicy,
  type AuthPolicy,
  type AuthPolicyBody,
} from '@/lib/auth-api'
import { ErrorRetry, MonacoPane, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

const EMPTY_BODY: AuthPolicyBody = {
  id: '',
  schema_name: 'public',
  table_name: '',
  name: '',
  action: 'PERMISSIVE',
  roles: 'public',
  command: 'SELECT',
  definition: 'true',
  check_expr: '',
  rls_enabled: 'true',
}

export function PoliciesView({ schemaFilter }: { schemaFilter?: string }) {
  const online = useOnline()
  const queryClient = useQueryClient()
  const tablesQuery = useQuery({ queryKey: ['studio', 'tables'], queryFn: listTables })
  const policiesQuery = useQuery({ queryKey: ['studio', 'policies'], queryFn: listPolicies })
  const [tableName, setTableName] = useState('')
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<AuthPolicyBody>(EMPTY_BODY)

  const tables = useMemo(() => {
    const names = (tablesQuery.data ?? []).map((table) => table.name)
    if (schemaFilter === 'storage' && names.length === 0) return ['objects']
    return names
  }, [tablesQuery.data, schemaFilter])

  const activeTable = tableName || tables[0] || ''
  const policies = (policiesQuery.data ?? []).filter((policy) => {
    if (schemaFilter && policy.schema_name && policy.schema_name !== schemaFilter) return false
    return !activeTable || policy.table_name === activeTable
  })

  const save = useMutation({
    mutationFn: (body: AuthPolicyBody) => savePolicy(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'policies'] })
      toast.success('Saved')
      setOpen(false)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const remove = useMutation({
    mutationFn: (id: string) => deletePolicy(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'policies'] })
      toast.success('Deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function applyTemplate(template: (typeof POLICY_TEMPLATES)[number]) {
    setDraft((current) => ({
      ...current,
      table_name: activeTable,
      schema_name: schemaFilter || current.schema_name || 'public',
      name: template.name,
      command: template.command,
      roles: template.roles,
      definition: template.definition,
      check_expr: template.check_expr,
    }))
  }

  function toggleRls(enabled: boolean) {
    if (!activeTable) return
    save.mutate({
      ...EMPTY_BODY,
      table_name: activeTable,
      schema_name: schemaFilter || 'public',
      rls_enabled: enabled ? 'true' : 'false',
    })
  }

  const rlsOn = policies.some((policy) => policy.rls_enabled !== 'false') || policies.length > 0

  return (
    <SurfacePage
      title="Policies"
      detail="RLS policy wizard. Four templates, then a SQL condition."
      actions={
        <Button
          type="button"
          size="sm"
          disabled={!online || !activeTable}
          onClick={() => {
            setDraft({
              ...EMPTY_BODY,
              table_name: activeTable,
              schema_name: schemaFilter || 'public',
              name: POLICY_TEMPLATES[0].name,
              command: POLICY_TEMPLATES[0].command,
              roles: POLICY_TEMPLATES[0].roles,
              definition: POLICY_TEMPLATES[0].definition,
            })
            setOpen(true)
          }}
        >
          <Plus className="size-4" />
          New policy
        </Button>
      }
    >
      <OfflineBanner online={online} />
      {policiesQuery.error ? (
        <ErrorRetry
          message={policiesQuery.error instanceof Error ? policiesQuery.error.message : 'Could not load policies'}
          onRetry={() => void policiesQuery.refetch()}
        />
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="policy-table">Table</Label>
              <select
                id="policy-table"
                value={activeTable}
                onChange={(event) => setTableName(event.target.value)}
                className="h-9 min-w-[200px] rounded-md border border-input bg-background px-2 text-sm"
              >
                {tables.length === 0 ? <option value="">No tables</option> : null}
                {tables.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
            <label className="mt-6 flex items-center gap-2 text-sm">
              <Switch checked={rlsOn} disabled={!online || !activeTable || save.isPending} onCheckedChange={toggleRls} />
              RLS
            </label>
          </div>
          <div className="overflow-auto rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>name</TableHead>
                  <TableHead>command</TableHead>
                  <TableHead>roles</TableHead>
                  <TableHead>using</TableHead>
                  <TableHead className="w-16" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {policies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No policies
                    </TableCell>
                  </TableRow>
                ) : (
                  policies.map((policy) => (
                    <PolicyRow
                      key={policy.id || policy.name}
                      policy={policy}
                      disabled={!online}
                      onDelete={() => remove.mutate(policy.id)}
                    />
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>New policy</DialogTitle>
            <DialogDescription>Pick a template, then edit the SQL condition.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              save.mutate({ ...draft, table_name: activeTable })
            }}
          >
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Template</legend>
              {POLICY_TEMPLATES.map((template) => (
                <label key={template.id} className="flex items-start gap-2 text-sm">
                  <Checkbox
                    checked={draft.name === template.name && draft.command === template.command}
                    onCheckedChange={() => applyTemplate(template)}
                  />
                  <span>
                    <span className="block">{template.name}</span>
                    <span className="block font-mono text-[12px] text-muted-foreground">
                      {template.command} · {template.roles}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="policy-name">Name</Label>
              <Input
                id="policy-name"
                required
                value={draft.name}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5 sm:grid-cols-2">
              <div className="grid gap-1.5">
                <Label htmlFor="policy-command">Command</Label>
                <Input
                  id="policy-command"
                  value={draft.command}
                  onChange={(event) => setDraft((current) => ({ ...current, command: event.target.value }))}
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="policy-roles">Roles</Label>
                <Input
                  id="policy-roles"
                  value={draft.roles}
                  onChange={(event) => setDraft((current) => ({ ...current, roles: event.target.value }))}
                />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>USING</Label>
              <MonacoPane
                label="Policy USING condition"
                language="sql"
                value={draft.definition}
                onChange={(value) => setDraft((current) => ({ ...current, definition: value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label>WITH CHECK</Label>
              <MonacoPane
                label="Policy WITH CHECK condition"
                language="sql"
                height={120}
                value={draft.check_expr}
                onChange={(value) => setDraft((current) => ({ ...current, check_expr: value }))}
              />
            </div>
            <Button type="submit" disabled={!online || save.isPending}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </SurfacePage>
  )
}

function PolicyRow({
  policy,
  disabled,
  onDelete,
}: {
  policy: AuthPolicy
  disabled: boolean
  onDelete: () => void
}) {
  return (
    <TableRow>
      <TableCell>
        <div className="text-sm">{policy.name}</div>
        <Badge variant="secondary" className="mt-1">
          {policy.action}
        </Badge>
      </TableCell>
      <TableCell className="font-mono text-[13px]">{policy.command}</TableCell>
      <TableCell className="font-mono text-[13px]">{policy.roles}</TableCell>
      <TableCell className="max-w-[280px] truncate font-mono text-[13px]">{policy.definition}</TableCell>
      <TableCell>
        <Button type="button" variant="ghost" size="icon" disabled={disabled || !policy.id} onClick={onDelete} aria-label="Delete policy">
          <Trash2 className="size-4" />
        </Button>
      </TableCell>
    </TableRow>
  )
}
