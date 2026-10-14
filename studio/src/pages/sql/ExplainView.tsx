import type { ExplainNode } from './sql-utils'
import { cn } from '@/lib/utils'

type ExplainViewProps = {
  nodes: ExplainNode[] | null
  empty?: string
}

function ExplainBranch({ node, last }: { node: ExplainNode; last: boolean }) {
  return (
    <li className="relative pl-4">
      <span
        className={cn('absolute left-0 top-0 w-px bg-border', last ? 'h-4' : 'bottom-0')}
        aria-hidden
      />
      <span className="absolute left-0 top-4 h-px w-3 bg-border" aria-hidden />
      <div className="rounded-md border border-border bg-surface px-2 py-1.5 font-mono text-[12px] text-foreground">
        {node.label}
      </div>
      {node.children.length > 0 ? (
        <ul className="mt-1">
          {node.children.map((child, index) => (
            <ExplainBranch key={child.id} node={child} last={index === node.children.length - 1} />
          ))}
        </ul>
      ) : null}
    </li>
  )
}

export function ExplainView({ nodes, empty = 'Run Explain to see a plan.' }: ExplainViewProps) {
  if (!nodes || nodes.length === 0) {
    return <p className="p-8 text-center text-sm text-muted-foreground">{empty}</p>
  }

  return (
    <ul className="space-y-1 p-3">
      {nodes.map((node, index) => (
        <ExplainBranch key={node.id} node={node} last={index === nodes.length - 1} />
      ))}
    </ul>
  )
}
