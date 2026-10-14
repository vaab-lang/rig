import { useQuery } from '@tanstack/react-query'
import { computeClass, databaseEngine, fetchGatewayHealth } from '@/lib/platform-api'
import { ErrorBanner } from '@/pages/home/ui'

export function ComputePane() {
  const health = useQuery({ queryKey: ['studio', 'health'], queryFn: fetchGatewayHealth })
  const engine = databaseEngine(health.data ?? null)
  const compute = computeClass(health.data ?? null)

  return (
    <div className="grid max-w-lg gap-3">
      <ErrorBanner error={health.error instanceof Error ? health.error.message : null} onRetry={() => void health.refetch()} />
      <Field label="Compute" value={compute} />
      <Field label="Database" value={engine} />
      <Field label="Disk" value="Not reported" />
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-surface px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="font-mono text-[13px]">{value}</div>
    </div>
  )
}
