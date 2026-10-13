import { Navigate, Route, Routes } from 'react-router-dom'
import { Shell } from './components/Shell'
import { ApiDocsPage } from './pages/ApiDocsPage'
import { AuthPage } from './pages/AuthPage'
import { DatabasePage } from './pages/DatabasePage'
import { HomePage } from './pages/HomePage'
import { SettingsPage } from './pages/SettingsPage'
import { SqlEditorPage } from './pages/SqlEditorPage'
import { StoragePage } from './pages/StoragePage'
import { TableEditorPage } from './pages/TableEditorPage'

export default function App() {
  return (
    <Routes>
      <Route element={<Shell />}>
        <Route index element={<HomePage />} />
        <Route path="editor" element={<TableEditorPage />} />
        <Route path="sql" element={<SqlEditorPage />} />
        <Route path="database" element={<DatabasePage />} />
        <Route path="auth" element={<AuthPage />} />
        <Route path="storage" element={<StoragePage />} />
        <Route path="api" element={<ApiDocsPage />} />
        <Route path="settings" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
