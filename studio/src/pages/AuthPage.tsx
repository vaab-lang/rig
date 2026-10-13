import { useEffect, useState } from 'react'
import { fetchAuthHealth, type Health } from '../lib/api'

export function AuthPage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchAuthHealth()
      .then(setHealth)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="content">
      <h1 className="page-title">Authentication</h1>
      <p className="page-sub">
        Rig adapts Vaab’s builtin bearer auth (`request.who`) — same role GoTrue plays for Supabase.
      </p>
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="grid-cards">
        <div className="card">
          <h4>Auth service</h4>
          <p>{health?.name ?? 'rig-auth'}</p>
          <div className="value">{health?.ok ? 'ok' : '—'}</div>
        </div>
        <div className="card">
          <h4>Version</h4>
          <p>Adapter build</p>
          <div className="value">{health?.version ?? '—'}</div>
        </div>
      </div>

      <h2 className="page-title" style={{ fontSize: 16, marginTop: 28 }}>
        Local bearer tokens
      </h2>
      <p className="page-sub">
        Set `AUTH_SECRET=dev` when serving the gateway. Tokens are `id|email|hmac` strings accepted by
        `/auth/v1/user` and protected REST writes.
      </p>
      <pre className="code-block">{`# Example shape (mint with your AUTH_SECRET tooling)
Authorization: Bearer user-1|ada@example.com|<hmac>

curl -s http://127.0.0.1:54321/auth/v1/user \\
  -H "Authorization: Bearer $TOKEN"`}</pre>
    </div>
  )
}
