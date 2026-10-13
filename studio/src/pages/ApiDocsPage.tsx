const ENDPOINTS = [
  { method: 'GET', path: '/health', note: 'Gateway health' },
  { method: 'GET', path: '/auth/v1/health', note: 'Auth adapter health' },
  { method: 'GET', path: '/auth/v1/user', note: 'Current user (bearer)' },
  { method: 'GET', path: '/rest/v1/todos', note: 'List todos' },
  { method: 'POST', path: '/rest/v1/todos', note: 'Insert todo (bearer)' },
  { method: 'GET', path: '/rest/v1/profiles', note: 'List profiles' },
  { method: 'GET', path: '/storage/v1/object/{*filepath}', note: 'Fetch object' },
  { method: 'GET', path: '/studio-api/tables', note: 'Studio table metadata' },
  { method: 'POST', path: '/studio-api/sql', note: 'Studio read-only SQL' },
  { method: 'GET', path: '/studio-api/storage', note: 'Studio storage listing' },
]

export function ApiDocsPage() {
  return (
    <div className="content">
      <h1 className="page-title">API Docs</h1>
      <p className="page-sub">
        Routes mounted by the example rig gateway — PostgREST-shaped paths over Vaab `Db`.
      </p>

      {ENDPOINTS.map((endpoint) => (
        <div className="endpoint" key={`${endpoint.method}-${endpoint.path}`}>
          <span className={`method${endpoint.method === 'POST' ? ' post' : ''}`}>{endpoint.method}</span>
          <div>
            <div className="mono" style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>
              {endpoint.path}
            </div>
            <div className="muted">{endpoint.note}</div>
          </div>
        </div>
      ))}
    </div>
  )
}
