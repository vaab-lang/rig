import { useMemo } from 'react'
import { Background, Controls, ReactFlow, ReactFlowProvider } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { useQuery } from '@tanstack/react-query'
import { databaseEngine, fetchGatewayHealth } from '@/lib/platform-api'
import { ErrorBanner } from '@/pages/home/ui'

export function InfrastructurePane() {
  const health = useQuery({ queryKey: ['studio', 'health'], queryFn: fetchGatewayHealth })
  const engine = databaseEngine(health.data ?? null)

  const { nodes, edges } = useMemo(() => {
    const labels = ['Browser', 'Kong', 'Vaab', engine]
    return {
      nodes: labels.map((label, index) => ({
        id: String(index),
        position: { x: 40 + index * 180, y: 80 },
        data: { label },
        type: 'default' as const,
        draggable: false,
        selectable: false,
      })),
      edges: labels.slice(0, -1).map((_, index) => ({
        id: `e${index}`,
        source: String(index),
        target: String(index + 1),
      })),
    }
  }, [engine])

  return (
    <div className="grid gap-3">
      <ErrorBanner error={health.error instanceof Error ? health.error.message : null} onRetry={() => void health.refetch()} />
      <p className="text-sm text-muted-foreground">Read-only path from this browser to the database.</p>
      <div className="h-[320px] overflow-hidden rounded-md border border-border bg-background" aria-label="Infrastructure">
        <ReactFlowProvider>
          <ReactFlow nodes={nodes} edges={edges} fitView proOptions={{ hideAttribution: true }}>
            <Background gap={16} />
            <Controls showInteractive={false} />
          </ReactFlow>
        </ReactFlowProvider>
      </div>
    </div>
  )
}
