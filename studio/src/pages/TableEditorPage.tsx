import { useEffect, useMemo, useState } from 'react'
import { insertTodo, listRows, listTables, type Row, type TableInfo } from '../lib/api'

export function TableEditorPage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [active, setActive] = useState('todos')
  const [rows, setRows] = useState<Row[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [showInsert, setShowInsert] = useState(false)
  const [title, setTitle] = useState('')
  const [token, setToken] = useState(() => localStorage.getItem('rig.authToken') ?? '')

  const columns = useMemo(() => {
    const fromMeta = tables.find((t) => t.name === active)?.columns
    if (fromMeta?.length) return fromMeta
    if (!rows.length) return []
    return Object.keys(rows[0]!)
  }, [tables, active, rows])

  async function load(table: string) {
    setLoading(true)
    setError(null)
    try {
      const data = await listRows(table)
      setRows(data)
    } catch (err) {
      setRows([])
      setError(err instanceof Error ? err.message : 'Failed to load rows')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    listTables()
      .then((list) => {
        setTables(list)
        const first = list[0]?.name ?? 'todos'
        setActive(first)
        return load(first)
      })
      .catch((err: Error) => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  async function onInsert() {
    if (!title.trim()) return
    setError(null)
    try {
      localStorage.setItem('rig.authToken', token)
      await insertTodo(title.trim(), token)
      setShowInsert(false)
      setTitle('')
      await load(active)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Insert failed')
    }
  }

  return (
    <div className="main-split">
      <aside className="aside">
        <h3>Tables</h3>
        {tables.map((table) => (
          <button
            key={table.name}
            type="button"
            className={`aside-item${active === table.name ? ' active' : ''}`}
            onClick={() => {
              setActive(table.name)
              void load(table.name)
            }}
          >
            {table.name}
          </button>
        ))}
      </aside>

      <div className="content">
        <div className="toolbar">
          <div>
            <h1 className="page-title" style={{ marginBottom: 2 }}>
              {active}
            </h1>
            <p className="page-sub" style={{ margin: 0 }}>
              {loading ? 'Loading…' : `${rows.length} row${rows.length === 1 ? '' : 's'}`}
            </p>
          </div>
          {active === 'todos' ? (
            <button type="button" className="btn primary" onClick={() => setShowInsert(true)}>
              Insert row
            </button>
          ) : null}
        </div>

        {error ? <div className="error-banner">{error}</div> : null}

        <div className="table-wrap">
          {!loading && rows.length === 0 ? (
            <div className="empty">No rows in `{active}` yet.</div>
          ) : (
            <table className="data">
              <thead>
                <tr>
                  {columns.map((col) => (
                    <th key={col}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, index) => (
                  <tr key={row.id ?? String(index)}>
                    {columns.map((col) => (
                      <td key={col} className="mono">
                        {row[col] ?? ''}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {showInsert ? (
        <div className="modal-backdrop" onClick={() => setShowInsert(false)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Insert into todos</h3>
            <div className="form-row">
              <label htmlFor="title">title</label>
              <input
                id="title"
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="Buy milk"
                autoFocus
              />
            </div>
            <div className="form-row">
              <label htmlFor="token">Authorization bearer</label>
              <input
                id="token"
                value={token}
                onChange={(event) => setToken(event.target.value)}
                placeholder="id|email|hmac"
              />
            </div>
            <p className="muted">
              Use a token minted with your local `AUTH_SECRET` (see Authentication).
            </p>
            <div className="modal-actions">
              <button type="button" className="btn" onClick={() => setShowInsert(false)}>
                Cancel
              </button>
              <button type="button" className="btn primary" onClick={() => void onInsert()}>
                Insert
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
