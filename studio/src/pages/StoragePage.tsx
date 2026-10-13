import { useEffect, useState } from 'react'
import { listStorage } from '../lib/api'

export function StoragePage() {
  const [root, setRoot] = useState('')
  const [entries, setEntries] = useState<string[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listStorage()
      .then((data) => {
        setRoot(data.root)
        setEntries(data.entries)
      })
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="content">
      <h1 className="page-title">Storage</h1>
      <p className="page-sub">
        Object paths resolve under `RIG_STORAGE_ROOT` via `/storage/v1/object/...`.
      </p>
      {error ? <div className="error-banner">{error}</div> : null}

      <div className="card" style={{ marginBottom: 16 }}>
        <h4>Root</h4>
        <p className="mono" style={{ marginTop: 8, fontFamily: 'var(--mono)' }}>
          {root || '—'}
        </p>
      </div>

      <div className="table-wrap">
        {entries.length === 0 ? (
          <div className="empty">No objects yet. Drop files into the storage root.</div>
        ) : (
          <table className="data">
            <thead>
              <tr>
                <th>path</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((entry) => (
                <tr key={entry}>
                  <td className="mono">
                    <a href={`/storage/v1/object/${entry}`}>{entry}</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
