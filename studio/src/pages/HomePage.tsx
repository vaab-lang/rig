import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { fetchAuthHealth, fetchHealth, listTables, type Health, type TableInfo } from '../lib/api'

export function HomePage() {
  const [health, setHealth] = useState<Health | null>(null)
  const [auth, setAuth] = useState<Health | null>(null)
  const [tables, setTables] = useState<TableInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([fetchHealth(), fetchAuthHealth(), listTables()])
      .then(([h, a, t]) => {
        setHealth(h)
        setAuth(a)
        setTables(t)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="content">
      <h1 className="page-title">Project Overview</h1>
      <p className="page-sub">
        Local rig gateway — Supabase-shaped data, auth, and storage, with a Studio dashboard for
        day-to-day work.
      </p>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="grid-cards">
        <div className="card">
          <h4>API</h4>
          <p>Gateway health</p>
          <div className="value">{health?.ok ? 'healthy' : '—'}</div>
        </div>
        <div className="card">
          <h4>Auth</h4>
          <p>Bearer adapter</p>
          <div className="value">{auth?.ok ? 'ready' : '—'}</div>
        </div>
        <div className="card">
          <h4>Tables</h4>
          <p>Allow-listed relations</p>
          <div className="value">{tables.length || '—'}</div>
        </div>
        <div className="card">
          <h4>API URL</h4>
          <p>Same origin as Studio</p>
          <div className="value" style={{ fontSize: 14 }}>
            {typeof window !== 'undefined' ? window.location.origin : 'http://127.0.0.1:54321'}
          </div>
        </div>
      </div>

      <div style={{ marginTop: 28 }}>
        <h2 className="page-title" style={{ fontSize: 16 }}>
          Jump in
        </h2>
        <p className="page-sub">Same product surfaces as Supabase Studio for a local rig project.</p>
        <div className="grid-cards">
          <Link to="/editor" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
            <h4>Table Editor</h4>
            <p>Browse and insert rows in todos and profiles.</p>
          </Link>
          <Link to="/sql" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
            <h4>SQL Editor</h4>
            <p>Run read-only selects against the project database.</p>
          </Link>
          <Link to="/api" className="card" style={{ color: 'inherit', textDecoration: 'none' }}>
            <h4>API Docs</h4>
            <p>REST routes mounted by the example gateway.</p>
          </Link>
        </div>
      </div>
    </div>
  )
}
