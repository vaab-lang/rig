import { useLocation } from 'react-router-dom'
import { DatabaseSettingsPage } from './database/DatabaseSettings'
import { MigrationsLedger } from './database/MigrationsLedger'
import {
  ExtensionsCatalog,
  FunctionsCatalog,
  IndexesCatalog,
  PublicationsCatalog,
  RolesCatalog,
  TriggersCatalog,
  TypesCatalog,
} from './database/objects'
import { PoliciesCatalog } from './database/PoliciesCatalog'
import { SchemaVisualizerPage } from './database/SchemaVisualizer'
import { TablesCatalog } from './database/TablesCatalog'
import { WebhooksCatalog } from './database/WebhooksCatalog'

function databaseLeaf(pathname: string): string {
  const trimmed = pathname.replace(/\/+$/, '') || '/'
  if (trimmed === '/database' || trimmed === '/database/tables') return 'tables'
  if (trimmed.startsWith('/database/')) return trimmed.slice('/database/'.length)
  return 'tables'
}

export function DatabasePage() {
  const { pathname } = useLocation()

  switch (databaseLeaf(pathname)) {
    case 'schemas':
      return <SchemaVisualizerPage />
    case 'functions':
      return <FunctionsCatalog />
    case 'triggers':
      return <TriggersCatalog />
    case 'types':
      return <TypesCatalog />
    case 'extensions':
      return <ExtensionsCatalog />
    case 'indexes':
      return <IndexesCatalog />
    case 'publications':
      return <PublicationsCatalog />
    case 'roles':
      return <RolesCatalog />
    case 'policies':
      return <PoliciesCatalog />
    case 'migrations':
      return <MigrationsLedger />
    case 'webhooks':
      return <WebhooksCatalog />
    case 'settings':
      return <DatabaseSettingsPage />
    case 'tables':
    default:
      return <TablesCatalog />
  }
}
