import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import Editor from '@monaco-editor/react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useRoleStore } from '@/lib/role-store'
import { useStudio } from '@/lib/studio-context'
import {
  fetchFunctions,
  invokeFunction,
  saveFunction,
  type EdgeFunction,
  type FunctionInvokeResult,
} from '@/lib/platform-api'
import { isUnauthorized } from '@/lib/table-api'
import { defineRigMonacoThemes, monacoEditorOptions } from '@/pages/sql/monaco-theme'
import { EmptyState, ErrorBanner, MetricChart, CHART, PageHeader } from '@/pages/home/ui'

const DEFAULT_CODE = `Deno.serve(async (req) => {
  const body = await req.json().catch(() => ({}))
  return Response.json({ ok: true, echo: body })
})
`

function statusVariant(status: string) {
  if (status === 'active') return 'success' as const
  if (status === 'error') return 'destructive' as const
  return 'secondary' as const
}

export function FunctionsPage() {
  const role = useRoleStore((state) => state.role)
  const { theme } = useStudio()
  const client = useQueryClient()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [slug, setSlug] = useState('')
  const [verifyJwt, setVerifyJwt] = useState(true)
  const [invokeOpen, setInvokeOpen] = useState(false)
  const [secretsOpen, setSecretsOpen] = useState(false)
  const [method, setMethod] = useState('POST')
  const [headers, setHeaders] = useState('{\n  "Content-Type": "application/json"\n}')
  const [body, setBody] = useState('{}')
  const [invokeResult, setInvokeResult] = useState<FunctionInvokeResult | null>(null)
  const [secretKey, setSecretKey] = useState('')
  const [secretValue, setSecretValue] = useState('')
  const [secrets, setSecrets] = useState<{ key: string; last4: string }[]>([])

  const functions = useQuery({
    queryKey: ['studio', 'functions', role],
    queryFn: () => fetchFunctions(role),
  })

  const list = functions.data ?? []
  const selected = list.find((item) => item.id === selectedId) ?? list[0] ?? null
  const [code, setCode] = useState('')
  const editorCode = selected && selected.id === selectedId ? (code || selected.code) : (selected?.code ?? DEFAULT_CODE)

  const save = useMutation({
    mutationFn: (fn: EdgeFunction) =>
      saveFunction(
        {
          id: fn.id,
          slug: fn.slug,
          name: fn.name,
          status: fn.status,
          version: fn.version,
          entrypoint_path: fn.entrypoint_path,
          verify_jwt: fn.verify_jwt,
          code: editorCode,
        },
        role,
      ),
    onSuccess: () => {
      toast.success('Saved')
      void client.invalidateQueries({ queryKey: ['studio', 'functions'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const create = useMutation({
    mutationFn: () =>
      saveFunction(
        {
          slug: slug.trim(),
          name: slug.trim(),
          verify_jwt: verifyJwt,
          code: DEFAULT_CODE,
          status: 'draft',
        },
        role,
      ),
    onSuccess: () => {
      toast.success('Saved')
      setCreateOpen(false)
      setSlug('')
      setSelectedId(slug.trim())
      void client.invalidateQueries({ queryKey: ['studio', 'functions'] })
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const invoke = useMutation({
    mutationFn: () => invokeFunction({ slug: selected?.slug ?? '', method, headers, body }, role),
    onSuccess: (result) => setInvokeResult(result),
    onError: (error: Error) => toast.error(error.message),
  })

  const monacoTheme =
    theme === 'light' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: light)').matches)
      ? 'rig-tungsten-light'
      : 'rig-tungsten-dark'
  const error = functions.error instanceof Error ? functions.error.message : null
  const invokeSeries = useMemo(
    () => [
      { label: 'ok', value: invokeResult?.status.startsWith('2') ? 1 : 0 },
      { label: 'err', value: invokeResult && !invokeResult.status.startsWith('2') ? 1 : 0 },
    ],
    [invokeResult],
  )

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="border-b border-border px-4 py-3 md:px-6">
        <PageHeader
          title="Edge Functions"
          detail="Source is stored on this gateway. Invoke does not run it."
          actions={
            <Button type="button" onClick={() => setCreateOpen(true)}>
              New function
            </Button>
          }
        />
        <ErrorBanner error={error} onRetry={() => void functions.refetch()} />
      </div>

      {functions.isLoading ? (
        <p className="p-4 text-sm text-muted-foreground">Loading functions.</p>
      ) : list.length === 0 ? (
        <div className="p-4 md:p-6">
          <EmptyState
            message={isUnauthorized(functions.error) ? 'Studio auth required.' : 'No functions'}
            actionLabel="New function"
            onClick={() => setCreateOpen(true)}
          />
        </div>
      ) : (
        <div className="grid min-h-0 flex-1 lg:grid-cols-[260px_1fr]">
          <aside className="border-b border-border lg:border-b-0 lg:border-r">
            <ul className="p-2">
              {list.map((fn) => (
                <li key={fn.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedId(fn.id)
                      setCode(fn.code)
                    }}
                    className={`flex w-full items-center justify-between gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-elevated ${
                      selected?.id === fn.id ? 'bg-primary/10 text-primary' : ''
                    }`}
                  >
                    <span className="truncate font-mono text-[13px]">{fn.slug}</span>
                    <Badge variant={statusVariant(fn.status)}>{fn.status}</Badge>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <section className="flex min-h-0 flex-col">
            {selected ? (
              <>
                <div className="flex flex-wrap items-center gap-2 border-b border-border px-3 py-2">
                  <span className="font-mono text-[13px]">{selected.slug}</span>
                  <Badge variant="secondary">v{selected.version}</Badge>
                  <div className="ml-auto flex flex-wrap gap-2">
                    <Button type="button" variant="outline" size="sm" asChild>
                      <Link to="/logs/functions">Logs</Link>
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setSecretsOpen(true)}>
                      Secrets
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setInvokeOpen(true)}>
                      Invoke
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      disabled={save.isPending || !navigator.onLine}
                      onClick={() => save.mutate(selected)}
                    >
                      Save
                    </Button>
                  </div>
                </div>
                <div className="min-h-0 flex-1">
                  <Editor
                    height="100%"
                    defaultLanguage="typescript"
                    theme={monacoTheme}
                    value={selected.id === selectedId || selectedId == null ? editorCode : selected.code}
                    options={monacoEditorOptions}
                    beforeMount={defineRigMonacoThemes}
                    onChange={(value) => {
                      setSelectedId(selected.id)
                      setCode(value ?? '')
                    }}
                  />
                </div>
                <div className="grid gap-3 border-t border-border p-3 md:grid-cols-2">
                  <MetricChart title="Invocations" data={invokeSeries} color={CHART[1]} height={120} empty="No invocations yet" />
                  <MetricChart
                    title="Errors"
                    data={[{ label: 'err', value: invokeResult && !invokeResult.status.startsWith('2') ? 1 : 0 }]}
                    color={CHART[4]}
                    height={120}
                    empty="No errors"
                  />
                </div>
              </>
            ) : null}
          </section>
        </div>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New function</DialogTitle>
            <DialogDescription>Creates a draft function. Save again after editing code.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="fn-slug">Slug</Label>
              <Input id="fn-slug" value={slug} onChange={(event) => setSlug(event.target.value)} placeholder="hello" />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Switch checked={verifyJwt} onCheckedChange={setVerifyJwt} />
              Verify JWT
            </label>
            <Button type="button" disabled={!slug.trim() || create.isPending} onClick={() => create.mutate()}>
              Save
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Sheet open={invokeOpen} onOpenChange={setInvokeOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Invoke</SheetTitle>
            <SheetDescription>{selected?.slug}</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 overflow-auto p-4">
            <div className="grid gap-1.5">
              <Label htmlFor="fn-method">Method</Label>
              <Input id="fn-method" value={method} onChange={(event) => setMethod(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fn-headers">Headers</Label>
              <Textarea id="fn-headers" className="font-mono text-[13px]" value={headers} onChange={(event) => setHeaders(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="fn-body">Body</Label>
              <Textarea id="fn-body" className="font-mono text-[13px]" value={body} onChange={(event) => setBody(event.target.value)} />
            </div>
            <Button type="button" disabled={!selected || invoke.isPending} onClick={() => invoke.mutate()}>
              Invoke
            </Button>
            {invokeResult ? (
              <pre className="overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[13px]">
                {`${invokeResult.status} · ${invokeResult.duration_ms} ms\n${invokeResult.body}`}
              </pre>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <Sheet open={secretsOpen} onOpenChange={setSecretsOpen}>
        <SheetContent side="right">
          <SheetHeader>
            <SheetTitle>Secrets</SheetTitle>
            <SheetDescription>Values stay masked. This gateway does not persist function secrets.</SheetDescription>
          </SheetHeader>
          <div className="grid gap-3 p-4">
            <div className="grid gap-1.5">
              <Label htmlFor="secret-key">Key</Label>
              <Input id="secret-key" value={secretKey} onChange={(event) => setSecretKey(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="secret-value">Value</Label>
              <Input id="secret-value" type="password" value={secretValue} onChange={(event) => setSecretValue(event.target.value)} />
            </div>
            <Button
              type="button"
              disabled={!secretKey.trim() || !secretValue.trim()}
              onClick={() => {
                setSecrets((current) => [...current, { key: secretKey.trim(), last4: secretValue.slice(-4) }])
                setSecretKey('')
                setSecretValue('')
                toast.success('Saved')
              }}
            >
              Save
            </Button>
            <ul className="grid gap-2">
              {secrets.map((item) => (
                <li key={item.key} className="rounded-md border border-border px-3 py-2 font-mono text-[13px]">
                  {item.key} · ••••{item.last4}
                </li>
              ))}
            </ul>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  )
}
