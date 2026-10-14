import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { PanelLeftClose, PanelLeftOpen, Search } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'
import type { NavMode } from '@/lib/prefs'
import { NAV_GROUP_ORDER, productsByGroup, type StudioProduct } from '@/lib/studio-nav'

type NavRailProps = {
  mode: NavMode
  onModeChange: (mode: NavMode) => void
  onOpenCommand?: () => void
  compactTargets?: boolean
}

export function NavRail({ mode, onModeChange, onOpenCommand, compactTargets = false }: NavRailProps) {
  const expanded = mode === 'full'
  const mark = `${import.meta.env.BASE_URL}rig-mark.svg`

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn('flex items-center gap-2 px-2 py-3', expanded ? 'justify-start' : 'justify-center')}>
        <img src={mark} alt="rig" className="h-6 w-6 shrink-0" />
        <span className={cn('truncate text-sm font-semibold tracking-[-0.01em]', !expanded && 'sr-only')}>rig</span>
      </div>
      <nav aria-label="Studio" className="flex min-h-0 flex-1 flex-col gap-2 overflow-auto px-1">
        {NAV_GROUP_ORDER.map((groupId, index) => {
          const items = productsByGroup(groupId)
          if (!items.length) return null
          return (
            <div key={groupId} className="grid gap-1">
              {index > 0 ? <div className="mx-2 border-t border-border" /> : null}
              {items.map((item) => (
                <RailLink key={item.id} item={item} expanded={expanded} compactTargets={compactTargets} />
              ))}
            </div>
          )
        })}
      </nav>
      <div className="grid gap-1 p-1">
        <button
          type="button"
          onClick={onOpenCommand}
          className={cn(
            'flex w-full items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            compactTargets ? 'min-h-11 gap-3 px-3' : expanded ? 'h-9 gap-3 px-2' : 'h-9 justify-center',
          )}
        >
          <RailGlyph icon={Search} label="Command menu" hint="⌘K" expanded={expanded} />
        </button>
        <button
          type="button"
          aria-label={expanded ? 'Collapse navigation' : 'Expand navigation'}
          onClick={() => onModeChange(expanded ? 'icons' : 'full')}
          className={cn(
            'flex w-full items-center rounded-md text-muted-foreground hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
            compactTargets ? 'min-h-11 gap-3 px-3' : expanded ? 'h-11 gap-3 px-2' : 'h-11 justify-center',
          )}
        >
          {expanded ? <PanelLeftClose className="size-4 shrink-0" /> : <PanelLeftOpen className="size-4 shrink-0" />}
          <span className={cn('text-sm', !expanded && 'sr-only')}>{expanded ? 'Collapse' : 'Expand'}</span>
        </button>
      </div>
    </div>
  )
}

function RailLink({
  item,
  expanded,
  compactTargets,
}: {
  item: StudioProduct
  expanded: boolean
  compactTargets: boolean
}) {
  return (
    <NavLink
      to={item.to}
      end={item.end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center rounded-md text-sm text-muted-foreground hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
          compactTargets ? 'min-h-11 gap-3 px-3' : expanded ? 'h-9 gap-3 px-2' : 'h-9 justify-center',
          isActive && 'bg-primary/10 text-primary',
          isActive && expanded && 'border-l-2 border-primary pl-[6px]',
        )
      }
    >
      <RailGlyph icon={item.icon} label={item.label} expanded={expanded} />
    </NavLink>
  )
}

function RailGlyph({
  icon: Icon,
  label,
  hint,
  expanded,
}: {
  icon: LucideIcon
  label: string
  hint?: string
  expanded: boolean
}) {
  const body = (
    <>
      <Icon className="size-4 shrink-0" aria-hidden />
      <span className={cn('truncate', !expanded && 'sr-only')} aria-hidden={!expanded}>
        {label}
      </span>
      {hint && expanded ? <span className="ml-auto font-mono text-[10px] text-subtle">{hint}</span> : null}
    </>
  )

  if (expanded) return body

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="flex h-full w-full items-center justify-center">{body}</span>
      </TooltipTrigger>
      <TooltipContent side="right">{hint ? `${label} ${hint}` : label}</TooltipContent>
    </Tooltip>
  )
}
