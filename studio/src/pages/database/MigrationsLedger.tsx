import { useState, type FormEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
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
import { listMigrations, newMigrationVersion, saveMigration } from '@/lib/database-api'
import { CatalogTable, PageChrome, useOnline } from './shared'

export function MigrationsLedger() {
  const online = useOnline()
  const query = useQuery({ queryKey: ['studio', 'migrations'], queryFn: listMigrations })
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [statements, setStatements] = useState('')
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const error = query.error instanceof Error ? query.error.message : null
  const rows = (query.data ?? []).map((row) => ({
    version: row.version,
    name: row.name,
    applied_at: row.applied_at,
    statements: row.statements,
  }))

  async function onSave(event: FormEvent) {
    event.preventDefault()
    if (!online) return
    setSaving(true)
    setFormError(null)
    try {
      await saveMigration({
        version: newMigrationVersion(),
        name: name.trim(),
        statements,
      })
      toast.success('Saved')
      setOpen(false)
      setName('')
      setStatements('')
      void query.refetch()
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <PageChrome
      title="Migrations"
      description="Applied statements on this project."
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => void query.refetch()}>
            Refresh
          </Button>
          <Button type="button" size="sm" disabled={!online} onClick={() => setOpen(true)}>
            Create
          </Button>
        </>
      }
    >
      <CatalogTable
        columns={[
          { key: 'version', label: 'version', mono: true },
          { key: 'name', label: 'name' },
          { key: 'applied_at', label: 'applied_at', mono: true },
          { key: 'statements', label: 'statements', mono: true },
        ]}
        rows={rows}
        loading={query.isLoading}
        error={error}
        empty="No migrations"
        emptyAction={
          <Button type="button" size="sm" disabled={!online} onClick={() => setOpen(true)}>
            Create
          </Button>
        }
        onRetry={() => void query.refetch()}
        rowKey={(row, index) => row.version || row.name || String(index)}
      />

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New migration</DialogTitle>
            <DialogDescription>Name the change and paste the statements.</DialogDescription>
          </DialogHeader>
          <form className="grid gap-3" onSubmit={(event) => void onSave(event)}>
            <div className="grid gap-1.5">
              <Label htmlFor="migration-name">Name</Label>
              <Input
                id="migration-name"
                value={name}
                disabled={!online || saving}
                onChange={(event) => setName(event.target.value)}
                placeholder="add_todos"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="migration-sql">Statements</Label>
              <Textarea
                id="migration-sql"
                value={statements}
                disabled={!online || saving}
                onChange={(event) => setStatements(event.target.value)}
                placeholder="CREATE TABLE ..."
              />
            </div>
            {formError ? (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            ) : null}
            <div className="flex justify-end">
              <Button type="submit" disabled={!online || saving || !name.trim() || !statements.trim()}>
                {saving ? 'Saving' : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </PageChrome>
  )
}
