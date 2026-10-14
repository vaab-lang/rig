import { useLocation } from 'react-router-dom'
import { menuLinkFromPath } from '@/lib/studio-nav'
import { PageHeader } from '@/pages/home/ui'
import { AppearancePane } from '@/pages/settings/AppearancePane'
import { ApiPane } from '@/pages/settings/ApiPane'
import { ComputePane } from '@/pages/settings/ComputePane'
import { GeneralPane } from '@/pages/settings/GeneralPane'
import { InfrastructurePane } from '@/pages/settings/InfrastructurePane'
import { JwtPane } from '@/pages/settings/JwtPane'
import { KeysPane } from '@/pages/settings/KeysPane'
import { LogsPane } from '@/pages/settings/LogsPane'

function paneFor(pathname: string) {
  if (pathname.endsWith('/compute')) return <ComputePane />
  if (pathname.endsWith('/infrastructure')) return <InfrastructurePane />
  if (pathname.endsWith('/api')) return <ApiPane />
  if (pathname.endsWith('/keys')) return <KeysPane />
  if (pathname.endsWith('/jwt')) return <JwtPane />
  if (pathname.endsWith('/logs')) return <LogsPane />
  if (pathname.endsWith('/appearance')) return <AppearancePane />
  return <GeneralPane />
}

export function SettingsPage() {
  const { pathname } = useLocation()
  const title = menuLinkFromPath(pathname)?.label ?? 'General'

  return (
    <div className="p-4 md:p-6">
      <PageHeader title={title} detail="Project identity, keys, and Studio prefs." />
      {paneFor(pathname)}
    </div>
  )
}
