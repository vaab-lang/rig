import { Link } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { EmptyState, PageHeader } from '@/pages/home/ui'

type Integration = {
  id: string
  name: string
  job: string
  mounted: boolean
  href?: string
}

const INTEGRATIONS: Integration[] = [
  { id: 'webhooks', name: 'Webhooks', job: 'Table events to an HTTP URL.', mounted: true, href: '/database/webhooks' },
  { id: 'cron', name: 'Cron (pg_cron)', job: 'Scheduled SQL on this database.', mounted: false },
  { id: 'queues', name: 'Queues (pgmq)', job: 'Durable job queues in Postgres.', mounted: false },
  { id: 'vault', name: 'Vault secrets', job: 'Encrypted secrets next to the database.', mounted: false },
  { id: 'fdw', name: 'Foreign Data Wrappers', job: 'Query remote tables from SQL.', mounted: false },
]

export function IntegrationsPage() {
  return (
    <div className="p-4 md:p-6">
      <PageHeader title="Integrations" detail="Only enable what this gateway actually runs." />
      <ul className="grid gap-3 lg:grid-cols-2">
        {INTEGRATIONS.map((item) => (
          <li key={item.id} className="rounded-md border border-border bg-surface p-4">
            <h2 className="text-sm font-medium">{item.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">{item.job}</p>
            <div className="mt-3">
              {item.mounted && item.href ? (
                <Button type="button" asChild>
                  <Link to={item.href}>Configure</Link>
                </Button>
              ) : (
                <div>
                  <Button type="button" disabled>
                    Enable
                  </Button>
                  <p className="mt-2 text-sm text-muted-foreground">Not mounted on this gateway</p>
                </div>
              )}
            </div>
          </li>
        ))}
      </ul>
      {INTEGRATIONS.every((item) => !item.mounted) ? <EmptyState message="No integrations are mounted." /> : null}
    </div>
  )
}
