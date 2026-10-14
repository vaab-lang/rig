import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { origin } from '@/lib/utils'

function snippets(base: string) {
  return {
    uri: base,
    rest: `curl '${base}/rest/v1/' \\\n  -H "apikey: ${base}" \\\n  -H "Authorization: Bearer ${base}"`,
    vaab: `need rig\n\nserve on port 54321 {\n    mount rig_auth at "/auth/v1"\n    mount rig_api at "/rest/v1"\n    mount rig_storage at "/storage/v1"\n    mount rig_studio at "/studio"\n}`,
    client: `const PROJECT_URL = "${base}"\nconst ANON_KEY = "${base}"`,
    mcp: `${base}/mcp`,
    anon: base,
    service: base,
  }
}

export function ConnectModal() {
  const [open, setOpen] = useState(false)
  const base = origin()
  const values = useMemo(() => snippets(base), [base])

  function copy(value: string, label: string) {
    void navigator.clipboard.writeText(value)
    toast.success(`Copied ${label}`)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" variant="outline" size="sm">
          Connect
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Connect</DialogTitle>
          <DialogDescription>
            Strings use this window origin. Anon and service values are placeholders, not live secrets.
          </DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="uri">
          <TabsList>
            <TabsTrigger value="uri">URI</TabsTrigger>
            <TabsTrigger value="rest">REST</TabsTrigger>
            <TabsTrigger value="vaab">Vaab</TabsTrigger>
            <TabsTrigger value="client">Client</TabsTrigger>
          </TabsList>
          <TabsContent value="uri">
            <CopyBlock label="Project URI" value={values.uri} onCopy={() => copy(values.uri, 'URI')} />
            <CopyBlock label="MCP URL" value={values.mcp} onCopy={() => copy(values.mcp, 'MCP URL')} />
          </TabsContent>
          <TabsContent value="rest">
            <CopyBlock label="cURL" value={values.rest} onCopy={() => copy(values.rest, 'cURL')} mono />
          </TabsContent>
          <TabsContent value="vaab">
            <CopyBlock label="need rig" value={values.vaab} onCopy={() => copy(values.vaab, 'Vaab snippet')} mono />
          </TabsContent>
          <TabsContent value="client">
            <CopyBlock label="TypeScript / JS" value={values.client} onCopy={() => copy(values.client, 'client snippet')} mono />
          </TabsContent>
        </Tabs>
        <div className="grid gap-2">
          <CopyBlock label="anon (placeholder)" value={values.anon} onCopy={() => copy(values.anon, 'anon placeholder')} />
          <CopyBlock
            label="service_role (placeholder)"
            value={values.service}
            onCopy={() => copy(values.service, 'service placeholder')}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CopyBlock({
  label,
  value,
  onCopy,
  mono,
}: {
  label: string
  value: string
  onCopy: () => void
  mono?: boolean
}) {
  return (
    <div className="mb-2 rounded-md border border-border bg-surface px-3 py-2">
      <div className="mb-1 flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{label}</p>
        <Button type="button" variant="outline" size="sm" onClick={onCopy}>
          Copy
        </Button>
      </div>
      <pre className={mono ? 'whitespace-pre-wrap font-mono text-[13px]' : 'truncate font-mono text-[13px]'}>{value}</pre>
    </div>
  )
}
