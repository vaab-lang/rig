import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { origin } from '@/lib/utils'

const PATHS = [
  { label: 'REST', path: '/rest/v1' },
  { label: 'Auth', path: '/auth/v1' },
  { label: 'Storage', path: '/storage/v1' },
]

export function ApiPane() {
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
