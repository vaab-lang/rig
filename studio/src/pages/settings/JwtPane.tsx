import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchMeta } from '@/lib/api'
import { origin } from '@/lib/utils'

function encode(value: string): string {
  return btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function JwtPane() {
  const [secretSet, setSecretSet] = useState<boolean | null>(null)
  const [role, setRole] = useState('authenticated')
  const [claims, setClaims] = useState('{\n  "sub": "user-1"\n}')
  const [token, setToken] = useState('')

  useEffect(() => {
    fetchMeta()
      .then((meta) => setSecretSet(meta.auth_secret_set))
      .catch(() => setSecretSet(null))
  }, [])

  return (
    <div className="grid max-w-xl gap-3">
      <div className="rounded-md border border-border bg-surface px-3 py-2 text-sm">
        <span className="text-muted-foreground">AUTH_SECRET </span>
        <span className="font-mono">{secretSet === null ? 'unknown' : secretSet ? 'set' : 'missing'}</span>
      </div>
      <p className="text-sm text-muted-foreground">The raw secret is never shown. Tokens below are local previews.</p>
      <div className="grid gap-1.5">
        <Label htmlFor="jwt-role">Role</Label>
        <select
          id="jwt-role"
          className="h-9 rounded-md border border-input bg-background px-3 text-sm"
          value={role}
          onChange={(event) => setRole(event.target.value)}
        >
          <option value="anon">anon</option>
          <option value="authenticated">authenticated</option>
          <option value="service_role">service_role</option>
        </select>
      </div>
      <div className="grid gap-1.5">
        <Label htmlFor="jwt-claims">Claims</Label>
        <Textarea id="jwt-claims" className="font-mono text-[13px]" value={claims} onChange={(event) => setClaims(event.target.value)} />
      </div>
      <Button
        type="button"
        onClick={() => {
          try {
            const parsed = JSON.parse(claims) as Record<string, unknown>
            const header = encode(JSON.stringify({ alg: 'none', typ: 'JWT' }))
            const payload = encode(JSON.stringify({ role, iss: origin(), ...parsed }))
            setToken(`${header}.${payload}.preview`)
          } catch {
            toast.error('Claims must be JSON')
          }
        }}
      >
        Generate
      </Button>
      {token ? (
        <div className="rounded-md border border-border bg-surface px-3 py-2">
          <div className="mb-1 flex items-center justify-between">
            <span className="text-xs text-muted-foreground">Preview token</span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                void navigator.clipboard.writeText(token)
                toast.success('Copied')
              }}
            >
              Copy
            </Button>
          </div>
          <pre className="overflow-auto font-mono text-[13px]">{token}</pre>
        </div>
      ) : null}
    </div>
  )
}
