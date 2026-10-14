import { useEffect, useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { DEFAULT_DB_SETTINGS, loadDatabaseSettings, saveDatabaseSettings } from '@/lib/database-api'
import { PageChrome, useOnline } from './shared'

export function DatabaseSettingsPage() {
  const online = useOnline()
  const query = useQuery({ queryKey: ['studio', 'db-settings'], queryFn: loadDatabaseSettings })
  const [maxRows, setMaxRows] = useState(DEFAULT_DB_SETTINGS.max_rows)
  const [schemas, setSchemas] = useState(DEFAULT_DB_SETTINGS.exposed_schemas)
  const [timeout, setTimeoutValue] = useState(DEFAULT_DB_SETTINGS.statement_timeout)
  const [saving, setSaving] = useState(false)
  const [localBanner, setLocalBanner] = useState(false)

  useEffect(() => {
    if (!query.data) return
    setMaxRows(query.data.view.max_rows)
    setSchemas(query.data.view.exposed_schemas)
    setTimeoutValue(query.data.view.statement_timeout)
    setLocalBanner(query.data.localOnly)
  }, [query.data])

  const error = query.error instanceof Error ? query.error.message : null

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!online) return
    setSaving(true)
    try {
      const result = await saveDatabaseSettings({
        max_rows: maxRows.trim() || DEFAULT_DB_SETTINGS.max_rows,
        exposed_schemas: schemas.trim() || DEFAULT_DB_SETTINGS.exposed_schemas,
        statement_timeout: timeout.trim() || DEFAULT_DB_SETTINGS.statement_timeout,
      })
      setLocalBanner(result.localOnly)
      toast.success('Saved')
      void query.refetch()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageChrome
      title="Database Settings"
      description="Connection and pooling preferences for this project."
      actions={
        <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
          Refresh
        </Button>
      }
    >
      {error ? (
        <Alert variant="destructive" className="mb-3">
          <AlertDescription className="flex items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}
      {localBanner ? (
        <Alert className="mb-3">
          <AlertDescription>Save is local. Database settings API is not mounted.</AlertDescription>
        </Alert>
      ) : null}
      <form className="grid max-w-lg gap-3" onSubmit={(event) => void onSave(event)}>
        <div className="grid gap-1.5">
          <Label htmlFor="db-max-rows">Max rows</Label>
          <Input
            id="db-max-rows"
            inputMode="numeric"
            value={maxRows}
            disabled={!online || saving || query.isLoading}
            onChange={(event) => setMaxRows(event.target.value)}
          />
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="db-schemas">Exposed schemas</Label>
          <Input
            id="db-schemas"
            value={schemas}
            disabled={!online || saving || query.isLoading}
            onChange={(event) => setSchemas(event.target.value)}
            placeholder="public"
          />
          <p className="text-xs text-muted-foreground">Comma list.</p>
        </div>
        <div className="grid gap-1.5">
          <Label htmlFor="db-timeout">Statement timeout</Label>
          <Input
            id="db-timeout"
            value={timeout}
            disabled={!online || saving || query.isLoading}
            onChange={(event) => setTimeoutValue(event.target.value)}
            placeholder="8s"
          />
        </div>
        <div>
          <Button type="submit" disabled={!online || saving}>
            {saving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </form>
    </PageChrome>
  )
}
