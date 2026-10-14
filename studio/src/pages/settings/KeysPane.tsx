import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { origin } from '@/lib/utils'

export function KeysPane() {
  const [revoke, setRevoke] = useState<string | null>(null)
  const base = origin()

  function copy(value: string) {
    void navigator.clipboard.writeText(value)
    toast.success('Copied')
  }

  return (
    <div className="grid max-w-xl gap-3">
      <p className="text-sm text-muted-foreground">
        Anon and service values are origin placeholders, not live secrets.
      </p>
      <KeyRow label="anon (placeholder)" value={base} onCopy={() => copy(base)} onRevoke={() => setRevoke('anon')} />
      <KeyRow
        label="service_role (placeholder)"
        value={base}
        onCopy={() => copy(base)}
        onRevoke={() => setRevoke('service_role')}
      />
      <Dialog open={Boolean(revoke)} onOpenChange={(open) => !open && setRevoke(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Revoke {revoke}</DialogTitle>
            <DialogDescription>Revoke is not mounted on this gateway.</DialogDescription>
          </DialogHeader>
          <Button type="button" variant="destructive" onClick={() => { toast.success('Revoke is not mounted on this gateway'); setRevoke(null) }}>
            Revoke
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function KeyRow({
  label,
  value,
  onCopy,
  onRevoke,
}: {
  label: string
  value: string
  onCopy: () => void
  onRevoke: () => void
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
      <div className="min-w-0">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="truncate font-mono text-[13px]">{value}</div>
      </div>
      <div className="flex gap-2">
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          Copy
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onRevoke}>
          Revoke
        </Button>
      </div>
    </div>
  )
}
