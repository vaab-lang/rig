import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchStudioTables } from '@/lib/platform-api'
import { useRoleStore } from '@/lib/role-store'
import { origin } from '@/lib/utils'

const PATHS = [
  { label: 'REST', path: '/rest/v1' },
  { label: 'Auth', path: '/auth/v1' },
  { label: 'Storage', path: '/storage/v1' },
]

export function ApiPane() {
  const role = useRoleStore((state) => state.role)
  const tables = useQuery({ queryKey: ['studio', 'tables', role], queryFn: () => fetchStudioTables(role) })

  function copy(value: string) {
    void navigator.clipboard.writeText(value)
    toast.success('Copied')
  }

  return (
    <div className="grid max-w-xl gap-3">
      <Field label="Base URL" value={origin()} onCopy={() => copy(origin())} />
      {PATHS.map((item) => (
        <Field key={item.path} label={item.label} value={item.path} onCopy={() => copy(`${origin()}${item.path}`)} />
      ))}
      {(tables.data ?? []).length > 0 ? (
        <div className="mt-2 grid gap-2">
          <div className="text-xs font-medium text-muted-foreground">Table endpoints (from Studio)</div>
          {(tables.data ?? []).map((table) => {
            const tablePath = `/rest/v1/${table.name}`
            return (
              <Field
                key={table.name}
                label={table.name}
                value={tablePath}
                onCopy={() => copy(`${origin()}${tablePath}`)}
              />
            )
          })}
        </div>
      ) : null}
      <div className="grid gap-1.5">
        <Label htmlFor="schemas">PostgREST schemas</Label>
        <Input id="schemas" defaultValue="public" readOnly />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="max-rows">Max rows</Label>
        <Input id="max-rows" defaultValue="1000" readOnly />
      </div>
    </div>
  )
}

function Field({ label, value, onCopy }: { label: string; value: string; onCopy: () => void }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-[13px]">{value}</div>
      </div>
      <Button type="button" variant="outline" size="sm" onClick={onCopy}>
        Copy
      </Button>
    </div>
  )
}
