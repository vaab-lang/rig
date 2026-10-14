import { NavLink } from 'react-router-dom'
import { ScrollArea } from '@/components/ui/scroll-area'
import { cn } from '@/lib/utils'
import { PRODUCT_MENUS, type StudioProductId } from '@/lib/studio-nav'

type ProductMenuProps = {
  productId: StudioProductId
  compactTargets?: boolean
}

export function ProductMenu({ productId, compactTargets = false }: ProductMenuProps) {
  const sections = PRODUCT_MENUS[productId]
  if (!sections?.length) return null

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <ScrollArea className="h-full">
        <nav aria-label="Product" className="flex flex-col gap-4 px-2 py-3">
          {sections.map((section, index) => (
            <div key={section.label ?? `section-${index}`} className="grid gap-1">
              {section.label ? (
                <p className="px-2 text-[11px] font-medium uppercase tracking-wide text-subtle">{section.label}</p>
              ) : null}
              {section.items.map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.end}
                  className={({ isActive }) =>
                    cn(
                      'rounded-md text-sm text-muted-foreground hover:bg-elevated hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface',
                      compactTargets ? 'min-h-11 px-3 py-2' : 'px-2 py-1.5',
                      isActive && 'bg-primary/10 text-primary',
                    )
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>
      </ScrollArea>
    </div>
  )
}

export function hasProductMenu(productId: StudioProductId): boolean {
  return Boolean(PRODUCT_MENUS[productId]?.length)
}
