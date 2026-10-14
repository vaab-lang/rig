import { useLocation } from 'react-router-dom'
import { FilesView } from '@/pages/storage/FilesView'
import { StoragePoliciesView } from '@/pages/storage/StoragePoliciesView'
import { StorageSettingsView } from '@/pages/storage/StorageSettingsView'

export function StoragePage() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/storage/settings')) return <StorageSettingsView />
  if (pathname.startsWith('/storage/policies')) return <StoragePoliciesView />
  return <FilesView />
}
