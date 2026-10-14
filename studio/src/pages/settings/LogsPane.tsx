import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { EmptyState } from '@/pages/home/ui'

export function LogsPane() {
  const [open, setOpen] = useState(false)
  const [url, setUrl] = useState('')
  const [type, setType] = useState('http')

  return (
    <div className="grid max-w-lg gap-3">
      <EmptyState message="No log drains" actionLabel="Create" onClick={() => setOpen(true)} />
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create drain</DialogTitle>
            <DialogDescription>Log drains are not mounted on this gateway.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="drain-type">Type</Label>
              <Input id="drain-type" value={type} onChange={(event) => setType(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="drain-url">URL</Label>
              <Input id="drain-url" value={url} onChange={(event) => setUrl(event.target.value)} />
            </div>
            <Button
              type="button"
              onClick={() => {
                toast.success('Log drains are not mounted on this gateway')
                setOpen(false)
              }}
            >
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
