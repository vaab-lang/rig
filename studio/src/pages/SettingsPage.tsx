export function SettingsPage() {
  return (
    <div className="content">
      <h1 className="page-title">Project Settings</h1>
      <p className="page-sub">
        Like self-hosted Supabase Studio, project settings live outside the dashboard — in env vars
        and your `serve` block.
      </p>

      <div className="grid-cards">
        <div className="card">
          <h4>RIG_DATABASE_URL</h4>
          <p>SQLite (or Postgres URL once Vaab supports live PG).</p>
          <div className="value" style={{ fontSize: 13 }}>
            sqlite:../../rig.db
          </div>
        </div>
        <div className="card">
          <h4>AUTH_SECRET</h4>
          <p>HMAC secret for bearer tokens.</p>
          <div className="value" style={{ fontSize: 13 }}>
            dev
          </div>
        </div>
        <div className="card">
          <h4>RIG_STORAGE_ROOT</h4>
          <p>Filesystem root for `/storage/v1/object`.</p>
          <div className="value" style={{ fontSize: 13 }}>
            rig-storage
          </div>
        </div>
      </div>

      <pre className="code-block" style={{ marginTop: 20 }}>{`cd examples/server
vaab gather
RIG_DATABASE_URL=sqlite:../../rig.db AUTH_SECRET=dev \\
  vaab serve main.vaab
# Studio UI: http://127.0.0.1:54321/
# API:       http://127.0.0.1:54321/rest/v1/...`}</pre>
    </div>
  )
}
