import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { ApiDocsPage } from './pages/ApiDocsPage'
import { AdvisorsPage } from './pages/advisors/AdvisorsPage'
import { AuthPage } from './pages/AuthPage'
import { DatabasePage } from './pages/DatabasePage'
import { FunctionsPage } from './pages/functions/FunctionsPage'
import { HomePage } from './pages/HomePage'
import { IntegrationsPage } from './pages/integrations/IntegrationsPage'
import { LogsPage } from './pages/logs/LogsPage'
import { ObservabilityPage } from './pages/observability/ObservabilityPage'
import { RealtimePage } from './pages/realtime/RealtimePage'
import { SettingsPage } from './pages/SettingsPage'
import { SqlEditorPage } from './pages/SqlEditorPage'
import { StoragePage } from './pages/StoragePage'
import { TableEditorPage } from './pages/TableEditorPage'
import { StudioProvider } from './lib/studio-context'

export default function App() {
  return (
    <StudioProvider>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="editor" element={<TableEditorPage />} />
          <Route path="editor/*" element={<TableEditorPage />} />
          <Route path="sql" element={<SqlEditorPage />} />
          <Route path="sql/*" element={<SqlEditorPage />} />
          <Route path="database" element={<DatabasePage />} />
          <Route path="database/*" element={<DatabasePage />} />
          <Route path="auth" element={<AuthPage />} />
          <Route path="auth/*" element={<AuthPage />} />
          <Route path="storage" element={<StoragePage />} />
          <Route path="storage/*" element={<StoragePage />} />
          <Route path="functions/*" element={<FunctionsPage />} />
          <Route path="functions" element={<FunctionsPage />} />
          <Route path="realtime/*" element={<RealtimePage />} />
          <Route path="realtime" element={<RealtimePage />} />
          <Route path="advisors/*" element={<AdvisorsPage />} />
          <Route path="advisors" element={<AdvisorsPage />} />
          <Route path="observability/*" element={<ObservabilityPage />} />
          <Route path="observability" element={<ObservabilityPage />} />
          <Route path="logs/*" element={<LogsPage />} />
          <Route path="logs" element={<LogsPage />} />
          <Route path="api" element={<ApiDocsPage />} />
          <Route path="integrations/*" element={<IntegrationsPage />} />
          <Route path="integrations" element={<IntegrationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
          <Route path="settings/*" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </StudioProvider>
  )
}
