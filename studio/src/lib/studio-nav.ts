import type { LucideIcon } from 'lucide-react'
import {
  Activity,
  Blocks,
  Braces,
  Database,
  HardDrive,
  LayoutDashboard,
  Lock,
  Radio,
  ScrollText,
  Settings,
  ShieldAlert,
  Table2,
  Terminal,
  Zap,
} from 'lucide-react'

export type StudioProductId =
  | 'overview'
  | 'editor'
  | 'sql'
  | 'database'
  | 'auth'
  | 'storage'
  | 'functions'
  | 'realtime'
  | 'advisors'
  | 'observability'
  | 'logs'
  | 'api'
  | 'integrations'
  | 'settings'

export type NavGroupId = 'top' | 'core' | 'ops' | 'bottom'

export type StudioProduct = {
  id: StudioProductId
  to: string
  label: string
  icon: LucideIcon
  group: NavGroupId
  end?: boolean
  gKey?: string
}

export type ProductMenuLink = {
  to: string
  label: string
  end?: boolean
}

export type ProductMenuSection = {
  label?: string
  items: ProductMenuLink[]
}

export const STUDIO_PRODUCTS: StudioProduct[] = [
  { id: 'overview', to: '/', label: 'Overview', icon: LayoutDashboard, group: 'top', end: true, gKey: 'h' },
  { id: 'editor', to: '/editor', label: 'Table Editor', icon: Table2, group: 'core', gKey: 't' },
  { id: 'sql', to: '/sql', label: 'SQL Editor', icon: Terminal, group: 'core', gKey: 's' },
  { id: 'database', to: '/database', label: 'Database', icon: Database, group: 'core', gKey: 'd' },
  { id: 'auth', to: '/auth', label: 'Authentication', icon: Lock, group: 'core', gKey: 'a' },
  { id: 'storage', to: '/storage', label: 'Storage', icon: HardDrive, group: 'core', gKey: 'b' },
  { id: 'functions', to: '/functions', label: 'Edge Functions', icon: Zap, group: 'core', gKey: 'f' },
  { id: 'realtime', to: '/realtime', label: 'Realtime', icon: Radio, group: 'core', gKey: 'r' },
  { id: 'advisors', to: '/advisors', label: 'Advisors', icon: ShieldAlert, group: 'ops', gKey: 'v' },
  { id: 'observability', to: '/observability', label: 'Observability', icon: Activity, group: 'ops', gKey: 'u' },
  { id: 'logs', to: '/logs', label: 'Logs', icon: ScrollText, group: 'ops', gKey: 'l' },
  { id: 'api', to: '/api', label: 'API Docs', icon: Braces, group: 'ops' },
  { id: 'integrations', to: '/integrations', label: 'Integrations', icon: Blocks, group: 'ops', gKey: 'i' },
  { id: 'settings', to: '/settings', label: 'Project Settings', icon: Settings, group: 'bottom', gKey: ',' },
]

export const NAV_GROUP_ORDER: NavGroupId[] = ['top', 'core', 'ops', 'bottom']

export const PRODUCT_MENUS: Partial<Record<StudioProductId, ProductMenuSection[]>> = {
  editor: [{ items: [{ to: '/editor', label: 'Tables', end: true }] }],
  sql: [
    {
      items: [
        { to: '/sql', label: 'Snippets', end: true },
        { to: '/sql/templates', label: 'Templates' },
        { to: '/sql/quickstarts', label: 'Quickstarts' },
      ],
    },
  ],
  database: [
    {
      label: 'Database',
      items: [
        { to: '/database/schemas', label: 'Schema Visualizer' },
        { to: '/database', label: 'Tables', end: true },
        { to: '/database/functions', label: 'Functions' },
        { to: '/database/triggers', label: 'Triggers' },
        { to: '/database/types', label: 'Types' },
        { to: '/database/extensions', label: 'Extensions' },
        { to: '/database/indexes', label: 'Indexes' },
        { to: '/database/publications', label: 'Publications' },
      ],
    },
    {
      label: 'Access',
      items: [
        { to: '/database/roles', label: 'Roles' },
        { to: '/database/policies', label: 'Policies' },
        { to: '/database/migrations', label: 'Migrations' },
        { to: '/database/webhooks', label: 'Webhooks' },
        { to: '/database/settings', label: 'Settings' },
      ],
    },
  ],
  auth: [
    {
      items: [
        { to: '/auth', label: 'Users', end: true },
        { to: '/auth/policies', label: 'Policies' },
        { to: '/auth/providers', label: 'Providers' },
        { to: '/auth/url-configuration', label: 'URL Configuration' },
        { to: '/auth/templates', label: 'Email Templates' },
        { to: '/auth/smtp', label: 'SMTP' },
        { to: '/auth/sessions', label: 'Sessions' },
        { to: '/auth/mfa', label: 'MFA' },
      ],
    },
  ],
  storage: [
    {
      items: [
        { to: '/storage', label: 'Files', end: true },
        { to: '/storage/settings', label: 'Settings' },
        { to: '/storage/policies', label: 'Policies' },
      ],
    },
  ],
  advisors: [
    {
      items: [
        { to: '/advisors', label: 'Security', end: true },
        { to: '/advisors/performance', label: 'Performance' },
      ],
    },
  ],
  observability: [
    {
      items: [
        { to: '/observability', label: 'Overview', end: true },
        { to: '/observability/api', label: 'API Gateway' },
        { to: '/observability/postgres', label: 'Postgres' },
        { to: '/observability/auth', label: 'Auth' },
        { to: '/observability/storage', label: 'Storage' },
        { to: '/observability/queries', label: 'Query Performance' },
      ],
    },
  ],
  logs: [
    {
      items: [
        { to: '/logs', label: 'Explorer', end: true },
        { to: '/logs/api', label: 'API Edge' },
        { to: '/logs/postgres', label: 'Postgres' },
        { to: '/logs/auth', label: 'Auth' },
        { to: '/logs/storage', label: 'Storage' },
        { to: '/logs/functions', label: 'Edge Functions' },
        { to: '/logs/realtime', label: 'Realtime' },
      ],
    },
  ],
  settings: [
    {
      items: [
        { to: '/settings', label: 'General', end: true },
        { to: '/settings/compute', label: 'Compute and Disk' },
        { to: '/settings/infrastructure', label: 'Infrastructure' },
        { to: '/settings/api', label: 'API' },
        { to: '/settings/keys', label: 'API Keys' },
        { to: '/settings/jwt', label: 'JWT Keys' },
        { to: '/settings/logs', label: 'Log Drains' },
        { to: '/settings/appearance', label: 'Appearance' },
      ],
    },
  ],
}

const G_KEY_TO_PATH = new Map(
  STUDIO_PRODUCTS.filter((product) => product.gKey).map((product) => [product.gKey!, product.to]),
)

export function productsByGroup(group: NavGroupId): StudioProduct[] {
  return STUDIO_PRODUCTS.filter((product) => product.group === group)
}

export function productFromPath(pathname: string): StudioProduct {
  const ranked = STUDIO_PRODUCTS.filter((product) => {
    if (product.end) return pathname === product.to
    if (product.to === '/') return pathname === '/'
    return pathname === product.to || pathname.startsWith(`${product.to}/`)
  }).sort((a, b) => b.to.length - a.to.length)
  return ranked[0] ?? STUDIO_PRODUCTS[0]!
}

export function menuLinkFromPath(pathname: string): ProductMenuLink | undefined {
  const product = productFromPath(pathname)
  const sections = PRODUCT_MENUS[product.id]
  if (!sections) return undefined
  const links = sections.flatMap((section) => section.items)
  return (
    links.find((link) => (link.end ? pathname === link.to : pathname === link.to || pathname.startsWith(`${link.to}/`))) ??
    links[0]
  )
}

export function titleFor(pathname: string): string {
  const link = menuLinkFromPath(pathname)
  const product = productFromPath(pathname)
  if (link && link.to !== product.to) return `${product.label} / ${link.label}`
  return product.label
}

export function pathForGKey(key: string): string | undefined {
  return G_KEY_TO_PATH.get(key)
}

export function formatGShortcut(gKey: string): string {
  return gKey === ',' ? 'G then ,' : `G then ${gKey.toUpperCase()}`
}
