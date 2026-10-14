import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  MarkerType,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
  useReactFlow,
  type Edge,
  type Node,
  type NodeProps,
  Handle,
  Position,
} from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import dagre from '@dagrejs/dagre'
import { toPng, toSvg } from 'html-to-image'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { loadDatabaseTables, schemaAsMarkdown, schemaAsSql, tableQualifiedName, type PgTable } from '@/lib/database-api'
import { useStudio } from '@/lib/studio-context'
import { cn } from '@/lib/utils'
import { PageChrome, useOnline, usePrefersReducedMotion } from './shared'
import { useMediaQuery } from '@/hooks/use-media-query'

const POS_KEY = 'rig.studio.schemaPositions'
const NODE_WIDTH = 220
const HEADER_H = 44
const ROW_H = 22
const EMPTY_TABLES: PgTable[] = []

type TableNodeData = {
  schema: string
  name: string
  columns: { name: string; type: string; pk: boolean; fk: boolean; nullable: boolean }[]
} & Record<string, unknown>

type TableNode = Node<TableNodeData, 'table'>

function nodeHeight(count: number): number {
  return HEADER_H + Math.max(count, 1) * ROW_H + 8
}

function readPositions(): Record<string, { x: number; y: number }> {
  try {
    const raw = localStorage.getItem(POS_KEY)
    return raw ? (JSON.parse(raw) as Record<string, { x: number; y: number }>) : {}
  } catch {
    return {}
  }
}

function writePositions(nodes: Node[]) {
  const next: Record<string, { x: number; y: number }> = {}
  for (const node of nodes) next[node.id] = node.position
  localStorage.setItem(POS_KEY, JSON.stringify(next))
}

function layoutNodes(tables: PgTable[], stored: Record<string, { x: number; y: number }>, force = false): TableNode[] {
  const graph = new dagre.graphlib.Graph()
  graph.setDefaultEdgeLabel(() => ({}))
  graph.setGraph({ rankdir: 'LR', nodesep: 25, ranksep: 50 })

  for (const table of tables) {
    const id = tableQualifiedName(table)
    graph.setNode(id, { width: NODE_WIDTH, height: nodeHeight(table.columns.length) })
  }
  for (const table of tables) {
    const source = tableQualifiedName(table)
    for (const fk of table.foreignKeys) {
      const targetTable = tables.find((item) => item.name === fk.targetTable) ?? tables.find((item) => tableQualifiedName(item) === fk.targetTable)
      if (!targetTable) continue
      const target = tableQualifiedName(targetTable)
      if (source !== target && graph.hasNode(source) && graph.hasNode(target)) {
        graph.setEdge(source, target)
      }
    }
  }
  dagre.layout(graph)

  return tables.map((table) => {
    const id = tableQualifiedName(table)
    const laid = graph.node(id)
    const height = nodeHeight(table.columns.length)
    const storedPos = stored[id]
    const position =
      !force && storedPos
        ? storedPos
        : { x: (laid?.x ?? 0) - NODE_WIDTH / 2, y: (laid?.y ?? 0) - height / 2 }
    return {
      id,
      type: 'table' as const,
      position,
      data: {
        schema: table.schema,
        name: table.name,
        columns: table.columns.map((col) => ({
          name: col.name,
          type: col.type,
          pk: col.pk,
          fk: col.fk,
          nullable: col.nullable,
        })),
      },
      style: { width: NODE_WIDTH },
    }
  })
}

function buildEdges(tables: PgTable[], selected: Set<string>, animate: boolean): Edge[] {
  const edges: Edge[] = []
  for (const table of tables) {
    const source = tableQualifiedName(table)
    for (const fk of table.foreignKeys) {
      const targetTable = tables.find((item) => item.name === fk.targetTable) ?? tables.find((item) => tableQualifiedName(item) === fk.targetTable)
      if (!targetTable) continue
      const target = tableQualifiedName(targetTable)
      const active = selected.has(source)
      const id = `${source}.${fk.sourceCol}->${target}.${fk.targetCol}`
      edges.push({
        id,
        source,
        target,
        sourceHandle: fk.sourceCol ? `src-${fk.sourceCol}` : undefined,
        targetHandle: fk.targetCol ? `tgt-${fk.targetCol}` : undefined,
        type: 'smoothstep',
        animated: animate && active,
        style: {
          stroke: active ? 'var(--primary)' : 'var(--muted-foreground)',
          strokeWidth: 1.25,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: active ? 'var(--primary)' : 'var(--muted-foreground)',
          width: 16,
          height: 16,
        },
      })
    }
  }
  return edges
}

function TableNodeView({ data, selected }: NodeProps<TableNode>) {
  return (
    <div
      className={cn(
        'overflow-hidden rounded-md border bg-surface text-foreground shadow-none',
        selected ? 'border-primary' : 'border-border',
      )}
      style={{ width: NODE_WIDTH }}
    >
      <Handle type="target" position={Position.Left} id="tgt" className="!h-2 !w-2 !border-background !bg-primary" />
      <div className="border-b border-border px-2.5 py-1.5">
        <div className="text-[11px] text-muted-foreground">{data.schema}</div>
        <div className="truncate text-sm font-medium">{data.name}</div>
      </div>
      <ul className="py-1">
        {data.columns.length === 0 ? (
          <li className="px-2.5 py-1 text-[12px] text-muted-foreground">No columns</li>
        ) : (
          data.columns.map((col) => (
            <li key={col.name} className="relative flex items-center gap-1.5 px-2.5 py-[3px] font-mono text-[12px]">
              <Handle
                type="target"
                position={Position.Left}
                id={`tgt-${col.name}`}
                className="!left-0 !h-1.5 !w-1.5 !border-background !bg-info"
              />
              {col.pk ? <span className="text-primary">◆</span> : null}
              {col.fk ? <span className="text-info">→</span> : null}
              {col.nullable ? <span className="text-subtle">?</span> : null}
              <span className="min-w-0 truncate">{col.name}</span>
              <span className="ml-auto shrink-0 text-muted-foreground">{col.type || 'text'}</span>
              <Handle
                type="source"
                position={Position.Right}
                id={`src-${col.name}`}
                className="!right-0 !h-1.5 !w-1.5 !border-background !bg-info"
              />
            </li>
          ))
        )}
      </ul>
      <Handle type="source" position={Position.Right} id="src" className="!h-2 !w-2 !border-background !bg-primary" />
    </div>
  )
}

const nodeTypes = { table: TableNodeView }

function canvasBackground(): string {
  const value = getComputedStyle(document.documentElement).getPropertyValue('--surface').trim()
  return value || '#1A1E26'
}

function SchemaVisualizerInner() {
  const navigate = useNavigate()
  const { theme } = useStudio()
  const online = useOnline()
  const reducedMotion = usePrefersReducedMotion()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const systemLight = useMediaQuery('(prefers-color-scheme: light)')
  const light = theme === 'light' || (theme === 'system' && systemLight)
  const flow = useReactFlow()
  const wrapperRef = useRef<HTMLDivElement>(null)
  const clickTimer = useRef<number | null>(null)
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const tablesQuery = useQuery({
    queryKey: ['studio', 'tables'],
    queryFn: loadDatabaseTables,
  })

  const tables = tablesQuery.data ?? EMPTY_TABLES

  const [nodes, setNodes, onNodesChange] = useNodesState<TableNode>([])
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([])

  useEffect(() => {
    if (!tables.length) {
      setNodes([])
      return
    }
    setNodes(layoutNodes(tables, readPositions()))
  }, [setNodes, tables])

  useEffect(() => {
    setEdges(tables.length ? buildEdges(tables, selected, !reducedMotion) : [])
  }, [reducedMotion, selected, setEdges, tables])

  const onAutoLayout = useCallback(() => {
    const next = layoutNodes(tables, {}, true)
    setNodes(next)
    writePositions(next)
    window.setTimeout(() => {
      void flow.fitView({ padding: 0.16 })
    }, 40)
  }, [flow, setNodes, tables])

  const onNodeDragStop = useCallback((_event: unknown, _node: Node, all: Node[]) => {
    writePositions(all)
  }, [])

  const onNodeClick = useCallback(
    (_event: MouseEvent, node: TableNode) => {
      if (clickTimer.current) window.clearTimeout(clickTimer.current)
      clickTimer.current = window.setTimeout(() => {
        navigate(`/database?table=${encodeURIComponent(node.data.name)}`)
      }, 220)
    },
    [navigate],
  )

  const onNodeDoubleClick = useCallback(
    (_event: MouseEvent, node: TableNode) => {
      if (clickTimer.current) window.clearTimeout(clickTimer.current)
      navigate(`/editor?table=${encodeURIComponent(node.data.name)}`)
    },
    [navigate],
  )

  const copy = useCallback(async (text: string, label: string) => {
    await navigator.clipboard.writeText(text)
    toast.success(`Copied ${label}`)
  }, [])

  const exportImage = useCallback(async (kind: 'png' | 'svg') => {
    const node = wrapperRef.current?.querySelector('.react-flow') as HTMLElement | null
    if (!node) return
    const options = {
      backgroundColor: canvasBackground(),
      filter: (element: HTMLElement) =>
        !element.classList?.contains('react-flow__controls') &&
        !element.classList?.contains('react-flow__minimap') &&
        !element.classList?.contains('react-flow__panel') &&
        !element.classList?.contains('react-flow__attribution'),
    }
    const dataUrl = kind === 'png' ? await toPng(node, options) : await toSvg(node, options)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = kind === 'png' ? 'schema.png' : 'schema.svg'
    link.click()
    toast.success('Saved')
  }, [])

  const error = tablesQuery.error instanceof Error ? tablesQuery.error.message : null

  const toolbar = useMemo(
    () => (
      <>
        <Button type="button" variant="outline" size="sm" onClick={() => void tablesQuery.refetch()}>
          Refresh
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={onAutoLayout} disabled={!tables.length}>
          Auto layout
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!tables.length}
          onClick={() => void copy(schemaAsSql(tables), 'SQL')}
        >
          Copy as SQL
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!tables.length}
          onClick={() => void copy(schemaAsMarkdown(tables), 'Markdown')}
        >
          Copy as Markdown
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!tables.length} onClick={() => void exportImage('png')}>
          Download PNG
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!tables.length} onClick={() => void exportImage('svg')}>
          Download SVG
        </Button>
      </>
    ),
    [copy, exportImage, onAutoLayout, tables, tablesQuery],
  )

  return (
    <PageChrome title="Schema Visualizer" description="Tables and foreign keys on this gateway." actions={toolbar} flush>
      {error ? (
        <div className="p-4">
          <Alert variant="destructive">
            <AlertDescription className="flex items-center justify-between gap-3">
              <span>{error}</span>
              <Button type="button" variant="outline" size="sm" onClick={() => void tablesQuery.refetch()}>
                Retry
              </Button>
            </AlertDescription>
          </Alert>
        </div>
      ) : null}
      {!error && !tablesQuery.isLoading && tables.length === 0 ? (
        <div className="grid h-full place-items-center p-6 text-center">
          <div>
            <p className="text-sm text-muted-foreground">No tables to visualize</p>
            <Button type="button" className="mt-3" size="sm" onClick={() => navigate('/editor')} disabled={!online}>
              New table
            </Button>
          </div>
        </div>
      ) : null}
      {!error && (tablesQuery.isLoading || tables.length > 0) ? (
        <div ref={wrapperRef} className="h-full min-h-[420px]">
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeDragStop={onNodeDragStop}
            onNodeClick={onNodeClick}
            onNodeDoubleClick={onNodeDoubleClick}
            onSelectionChange={({ nodes: next }) => {
              const ids = next.map((node) => node.id)
              setSelected((prev) => {
                if (prev.size === ids.length && ids.every((id) => prev.has(id))) return prev
                return new Set(ids)
              })
            }}
            nodeTypes={nodeTypes}
            fitView
            minZoom={0.2}
            maxZoom={1.6}
            colorMode={light ? 'light' : 'dark'}
            proOptions={{ hideAttribution: false }}
            aria-label="Schema visualizer"
            className="h-full bg-surface"
            style={{ backgroundColor: 'var(--surface)' }}
            deleteKeyCode={null}
          >
            <Background variant={BackgroundVariant.Dots} gap={18} size={1} color="var(--border)" bgColor="var(--surface)" />
            <Controls showInteractive={false} />
            {!isMobile ? (
              <MiniMap
                pannable
                zoomable
                maskColor="var(--xy-minimap-mask-background-color)"
                nodeColor="var(--elevated)"
              />
            ) : null}
            {tablesQuery.isLoading ? (
              <Panel position="top-left">
                <p className="rounded-md border border-border bg-elevated px-2 py-1 text-xs text-muted-foreground">
                  Loading schema
                </p>
              </Panel>
            ) : null}
          </ReactFlow>
        </div>
      ) : null}
    </PageChrome>
  )
}

export function SchemaVisualizerPage() {
  return (
    <ReactFlowProvider>
      <SchemaVisualizerInner />
    </ReactFlowProvider>
  )
}
