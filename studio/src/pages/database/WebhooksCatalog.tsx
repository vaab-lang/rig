import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
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
import { Textarea } from '@/components/ui/textarea'
import { listWebhooks, loadDatabaseTables, newObjectId, saveWebhook, type WebhookRow } from '@/lib/database-api'
import { CatalogTable, PageChrome, fieldClassName, useOnline } from './shared'

const EVENT_OPTIONS = ['INSERT', 'UPDATE', 'DELETE'] as const

function emptyWebhook(table = ''): Omit<WebhookRow, 'created_at'> {
  return {
    id: '',
    name: '',
    table_name: table,
    events: 'INSERT',
    url: '',
    method: 'POST',
    headers: '{}',
    enabled: 'true',
  }
}

export function WebhooksCatalog() {
  const online = useOnline()
  const query = useQuery({ queryKey: ['studio', 'webhooks'], queryFn: listWebhooks })
  const tablesQuery = useQuery({ queryKey: ['studio', 'tables'], queryFn: loadDatabaseTables })
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(emptyWebhook())
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const error = query.error instanceof Error ? query.error.message : null
  const rows = (query.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    table_name: row.table_name,
    events: row.events,
    url: row.url,
    method: row.method,
    enabled: row.enabled,
  }))

  function toggleEvent(eventName: string, checked: boolean) {
    const current = draft.events
      .split(',')
      .map((item) => item.trim().toUpperCase())
      .filter(Boolean)
    const next = checked ? [...new Set([...current, eventName])] : current.filter((item) => item !== eventName)
    setDraft((value) => ({ ...value, events: next.join(',') }))
  }

  async function persist(body: Omit<WebhookRow, 'created_at'>) {
    await saveWebhook({
      ...body,
      id: body.id || newObjectId('wh'),
    })
  }

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!online) return
    setSaving(true)
    setFormError(null)
    try {
      await persist(draft)
      toast.success('Saved')
      setOpen(false)
      setDraft(emptyWebhook())
      void query.refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  async function onEnabled(row: WebhookRow, enabled: boolean) {
    if (!online) return
    try {
      await persist({ ...row, enabled: enabled ? 'true' : 'false' })
      toast.success(enabled ? 'Enabled' : 'Disabled')
      void query.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    }
  }

  return (
    <PageChrome
      title="Webhooks"
      description="Table event hooks posted by this gateway."
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
              setDraft(emptyWebhook())
              setFormError(null)
              setOpen(true)
            }}
          >
            Create
          </Button>
        </>
      }
    >
      <CatalogTable
        columns={[
          { key: 'name', label: 'name' },
          { key: 'table_name', label: 'table', mono: true },
          { key: 'events', label: 'events', mono: true },
          { key: 'method', label: 'method' },
          { key: 'url', label: 'url', mono: true },
        ]}
        rows={rows}
        loading={query.isLoading}
        error={error}
        empty="No webhooks"
        emptyAction={
          <Button type="button" size="sm" disabled={!online} onClick={() => setOpen(true)}>
            Create
          </Button>
        }
        onRetry={() => void query.refetch()}
        rowKey={(row, index) => row.id || row.name || String(index)}
        rowAction={(row) => {
          const full = (query.data ?? []).find((item) => item.id === row.id)
          if (!full) return null
          return (
            <Switch
              checked={full.enabled === 'true'}
              disabled={!online}
              aria-label={`Enable ${full.name}`}
              onCheckedChange={(checked) => void onEnabled(full, checked)}
            />
          )
        }}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Create</DialogTitle>
            <DialogDescription>Name, table, events, URL, method, headers.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={(event) => void onSave(event)}>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-name">Name</Label>
              <Input
                id="wh-name"
                value={draft.name}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-table">Table</Label>
              <select
                id="wh-table"
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
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium text-muted-foreground">Events</legend>
              <div className="flex flex-wrap gap-4">
                {EVENT_OPTIONS.map((eventName) => {
                  const checked = draft.events
                    .split(',')
                    .map((item) => item.trim().toUpperCase())
                    .includes(eventName)
                  return (
                    <label key={eventName} className="flex items-center gap-2 text-sm">
                      <Checkbox
                        checked={checked}
                        disabled={!online || saving}
                        onCheckedChange={(value) => toggleEvent(eventName, value === true)}
                      />
                      {eventName.toLowerCase()}
                    </label>
                  )
                })}
              </div>
            </fieldset>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-url">URL</Label>
              <Input
                id="wh-url"
                value={draft.url}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, url: event.target.value }))}
                placeholder="https://"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-method">Method</Label>
              <Input
                id="wh-method"
                value={draft.method}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, method: event.target.value }))}
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="wh-headers">Headers</Label>
              <Textarea
                id="wh-headers"
                value={draft.headers}
                disabled={!online || saving}
                onChange={(event) => setDraft((current) => ({ ...current, headers: event.target.value }))}
                placeholder={'{"Authorization":"Bearer token"}'}
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch
                checked={draft.enabled === 'true'}
                disabled={!online || saving}
                onCheckedChange={(checked) => setDraft((current) => ({ ...current, enabled: checked ? 'true' : 'false' }))}
              />
              Enabled
            </label>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={!online || saving || !draft.name || !draft.table_name || !draft.url}>
                {saving ? 'Saving' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageChrome>
  )
}
