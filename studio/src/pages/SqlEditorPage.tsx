import { useState } from 'react'
import { runSql, type Row } from '../lib/api'

const STARTER = `select id, title, owner, done
from todos
order by id desc
limit 50`

export function SqlEditorPage() {
  const [sql, setSql] = useState(STARTER)
  const [rows, setRows] = useState<Row[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [running, setRunning] = useState(false)

  const columns = rows && rows.length ? Object.keys(rows[0]!) : []

  async function onRun() {
    setRunning(true)
    setError(null)
    try {
      const data = await runSql(sql)
      setRows(data)
    } catch (err) {
      setRows(null)
      setError(err instanceof Error ? err.message : 'Query failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="content">
      <div className="toolbar">
        <div>
          <h1 className="page-title">SQL Editor</h1>
          <p className="page-sub" style={{ margin: 0 }}>
            Read-only selects against the rig database (single statement).
          </p>
        </div>
        <button type="button" className="btn primary" disabled={running} onClick={() => void onRun()}>
          {running ? 'Running…' : 'Run'}
        </button>
      </div>

      {error ? <div className="error-banner">{error}</div> : null}

      <div className="sql-layout">
        <section className="sql-pane">
          <header>
            <span>Query</span>
            <span>sqlite</span>
          </header>
          <textarea
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            spellCheck={false}
            aria-label="SQL query"
          />
        </section>

        <section className="result-pane">
          <header>
            <span>Results</span>
            <span>{rows ? `${rows.length} rows` : '—'}</span>
          </header>
          <div className="body">
            {!rows ? (
              <div className="empty">Run a query to see results.</div>
            ) : rows.length === 0 ? (
              <div className="empty">Query returned 0 rows.</div>
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
                    <tr key={String(index)}>
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
        </section>
      </div>
    </div>
  )
}
