import { useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchEmailTemplates, saveEmailTemplate, type EmailTemplateId } from '@/lib/auth-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

export function TemplatesView() {
  const online = useOnline()
  const templatesQuery = useQuery({ queryKey: ['studio', 'auth', 'templates'], queryFn: fetchEmailTemplates })
  const [active, setActive] = useState<EmailTemplateId>('confirm')
  const [subject, setSubject] = useState('')
  const [html, setHtml] = useState('')

  const current = useMemo(
    () => templatesQuery.data?.templates.find((template) => template.id === active),
    [templatesQuery.data?.templates, active],
  )

  useEffect(() => {
    if (!current) return
    setSubject(current.subject)
    setHtml(current.html)
  }, [current])

  const save = useMutation({
    mutationFn: () => saveEmailTemplate(active, subject, html),
    onSuccess: (persisted) => {
      toast.success(persisted ? 'Saved' : 'Saved locally')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <SurfacePage title="Email Templates" detail="Stored in this browser only. Mail is not sent.">
      <OfflineBanner online={online} />
      {templatesQuery.error ? (
        <ErrorRetry
          message={templatesQuery.error instanceof Error ? templatesQuery.error.message : 'Could not load templates'}
          onRetry={() => void templatesQuery.refetch()}
        />
      ) : (
        <div className="grid max-w-3xl gap-3">
          {!templatesQuery.data?.persisted ? (
            <Alert>
              <AlertDescription>Templates stay in this browser until the gateway persists them.</AlertDescription>
            </Alert>
          ) : null}
          <div className="grid gap-1.5">
            <Label htmlFor="template-id">Template</Label>
            <select
              id="template-id"
              value={active}
              onChange={(event) => setActive(event.target.value as EmailTemplateId)}
              className="h-9 max-w-sm rounded-md border border-input bg-background px-2 text-sm"
            >
              {(templatesQuery.data?.templates ?? []).map((template) => (
                <option key={template.id} value={template.id}>
                  {template.label}
                </option>
              ))}
            </select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="template-subject">Subject</Label>
            <Input id="template-subject" value={subject} onChange={(event) => setSubject(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="template-html">HTML</Label>
            <Textarea
              id="template-html"
              value={html}
              onChange={(event) => setHtml(event.target.value)}
              className="min-h-40 font-mono text-[13px]"
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Preview</Label>
            <iframe
              title="Template preview"
              sandbox=""
              className="h-56 w-full rounded-md border border-border bg-background"
              srcDoc={html}
            />
          </div>
          <Button type="button" disabled={!online || save.isPending} onClick={() => save.mutate()}>
            Save
          </Button>
        </div>
      )}
    </SurfacePage>
  )
}
