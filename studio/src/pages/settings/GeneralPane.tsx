import { useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useStudio } from '@/lib/studio-context'

export function GeneralPane() {
  const { project, setProject } = useStudio()
  const [name, setName] = useState(project.name)
  const [description, setDescription] = useState(project.description)
  const [confirm, setConfirm] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)

  return (
    <div className="grid max-w-lg gap-3">
      <div className="grid gap-1.5">
        <Label htmlFor="project-name">Project name</Label>
        <Input id="project-name" value={name} onChange={(event) => setName(event.target.value)} />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="project-ref">Ref</Label>
        <Input id="project-ref" value="default" readOnly className="font-mono" />
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="project-desc">Description</Label>
        <Textarea id="project-desc" value={description} onChange={(event) => setDescription(event.target.value)} />
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() => {
            setProject({ name: name.trim() || 'default', description })
            toast.success('Saved')
          }}
        >
          Save
        </Button>
        <Button type="button" variant="outline" onClick={() => toast.success('Pause is not mounted on this gateway')}>
          Pause
        </Button>
        <Button type="button" variant="outline" onClick={() => toast.success('Restart is not mounted on this gateway')}>
          Restart
        </Button>
        <Button type="button" variant="destructive" onClick={() => setDeleteOpen(true)}>
          Delete
        </Button>
      </div>

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete project</DialogTitle>
            <DialogDescription>Type the project name to confirm. Delete is not mounted on this gateway.</DialogDescription>
          </DialogHeader>
          <Input value={confirm} onChange={(event) => setConfirm(event.target.value)} placeholder={name} />
          <Button
            type="button"
            variant="destructive"
            disabled={confirm.trim() !== name.trim()}
            onClick={() => {
              toast.success('Delete is not mounted on this gateway')
              setDeleteOpen(false)
            }}
          >
            Delete
          </Button>
        </DialogContent>
      </Dialog>
    </div>
  )
}
