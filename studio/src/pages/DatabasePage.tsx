import { useEffect, useState } from 'react'
import { listTables, type TableInfo } from '../lib/api'

export function DatabasePage() {
  const [tables, setTables] = useState<TableInfo[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listTables()
      .then(setTables)
      .catch((err: Error) => setError(err.message))
  }, [])

  return (
    <div className="content">
      <h1 className="page-title">Database</h1>
      <p className="page-sub">Schema surfaces exposed through the rig allow-list.</p>
      {error ? <div className="error-banner">{error}</div> : null}
      <div className="table-wrap">
        <table className="data">
          <thead>
            <tr>
              <th>table</th>
              <th>columns</th>
            </tr>
          </thead>
          <tbody>
            {tables.map((table) => (
              <tr key={table.name}>
                <td className="mono">{table.name}</td>
                <td className="mono">{table.columns.join(', ')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
