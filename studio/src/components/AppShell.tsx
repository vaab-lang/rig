import { useEffect, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Menu } from 'lucide-react'
import { CommandMenu } from '@/components/CommandMenu'
import { ConnectModal } from '@/components/ConnectModal'
import { NavRail } from '@/components/NavRail'
import { hasProductMenu, ProductMenu } from '@/components/ProductMenu'
import { RoleIndicator } from '@/components/RoleIndicator'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { TooltipProvider } from '@/components/ui/tooltip'
import { useMediaQuery } from '@/hooks/use-media-query'
import { fetchAuthHealth, fetchHealth, type Health } from '@/lib/api'
import { useStudio } from '@/lib/studio-context'
import { productFromPath, titleFor } from '@/lib/studio-nav'
import { Toaster } from 'sonner'

export function AppShell() {
  const location = useLocation()
  const { navMode, setNavMode, project, theme } = useStudio()
  const isMobile = useMediaQuery('(max-width: 767px)')
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)')
  const [mobileOpen, setMobileOpen] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [health, setHealth] = useState<Health | null>(null)
  const [authHealth, setAuthHealth] = useState<Health | null>(null)
  const [healthError, setHealthError] = useState(false)

  const product = productFromPath(location.pathname)
  const showMenu = hasProductMenu(product.id)

  useEffect(() => {
    let alive = true
    const tick = () => {
      Promise.all([fetchHealth(), fetchAuthHealth()])
        .then(([gateway, auth]) => {
          if (!alive) return
          setHealth(gateway)
          setAuthHealth(auth)
          setHealthError(false)
        })
        .catch(() => {
          if (alive) setHealthError(true)
        })
    }
    tick()
    const id = window.setInterval(tick, 30_000)
    return () => {
      alive = false
      window.clearInterval(id)
    }
  }, [])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'b') {
        event.preventDefault()
        if (isMobile) {
          setMobileOpen((open) => !open)
          return
        }
        setNavMode(navMode === 'full' ? 'icons' : 'full')
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isMobile, navMode, setNavMode])

  useEffect(() => {
    setMobileOpen(false)
  }, [location.pathname])

  const railWidth = navMode === 'full' ? 220 : 48
  const gatewayOk = !healthError && health?.ok
  const authOk = authHealth?.ok
  const pill =
    healthError || gatewayOk === false
      ? { label: 'down', variant: 'destructive' as const }
      : gatewayOk
        ? { label: 'ok', variant: 'success' as const }
        : { label: 'warn', variant: 'warning' as const }

  return (
    <TooltipProvider delayDuration={200}>
      <a
        href="#studio-main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-[70] focus:rounded-md focus:bg-elevated focus:px-3 focus:py-2 focus:ring-2 focus:ring-ring"
      >
        Skip to content
      </a>
      <div className="flex h-full min-h-screen bg-background">
        {!isMobile ? (
          <aside
            className="sticky top-0 h-screen shrink-0 border-r border-border bg-surface"
            style={{
              width: railWidth,
              transition: reducedMotion ? 'none' : 'width 240ms cubic-bezier(0.16, 1, 0.3, 1)',
            }}
          >
            <NavRail mode={navMode} onModeChange={setNavMode} onOpenCommand={() => setCommandOpen(true)} />
          </aside>
        ) : null}

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface px-3 md:px-4">
            <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
              {isMobile ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="min-h-11 min-w-11"
                  aria-label="Open navigation"
                  onClick={() => setMobileOpen(true)}
                >
                  <Menu className="size-4" />
                </Button>
              ) : null}
              <nav aria-label="Project" className="flex min-w-0 items-center gap-1.5 truncate">
                <span className="hidden truncate sm:inline">Default Org</span>
                <span className="hidden sm:inline">/</span>
                <strong className="truncate text-foreground">{project.name}</strong>
                <span>/</span>
                <span className="hidden truncate md:inline">main</span>
                <span className="hidden md:inline">/</span>
                <span className="truncate">{titleFor(location.pathname)}</span>
              </nav>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <ConnectModal />
              <RoleIndicator />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="hidden text-muted-foreground lg:inline-flex"
                onClick={() => setCommandOpen(true)}
              >
                Search
                <kbd className="font-mono text-[10px] text-subtle">⌘K</kbd>
              </Button>
              <Badge variant={pill.variant} title={authOk === false ? 'Auth down' : undefined}>
                <span
                  className={`mr-1.5 inline-block size-1.5 rounded-full ${
                    pill.variant === 'success' ? 'bg-success' : pill.variant === 'warning' ? 'bg-warning' : 'bg-destructive'
                  }`}
                />
                {healthError ? 'API offline' : health ? `${health.name} ${pill.label}` : 'checking'}
              </Badge>
            </div>
          </header>
          <div className="flex min-h-0 min-w-0 flex-1">
            {!isMobile && showMenu ? (
              <Group orientation="horizontal" className="h-full min-h-0 w-full">
                <Panel defaultSize={220} minSize={160} maxSize={320} className="bg-surface">
                  <ProductMenu productId={product.id} />
                </Panel>
                <Separator className="w-px bg-border hover:bg-primary/50 data-active:bg-primary" />
                <Panel className="min-w-0">
                  <main id="studio-main" className="h-full min-h-0 min-w-0 overflow-auto">
                    <Outlet />
                  </main>
                </Panel>
              </Group>
            ) : (
              <main id="studio-main" className="min-h-0 min-w-0 flex-1 overflow-auto">
                <Outlet />
              </main>
            )}
          </div>
        </div>
      </div>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="p-0">
          <SheetHeader>
            <SheetTitle>Studio</SheetTitle>
          </SheetHeader>
          <div className="flex min-h-0 flex-1 flex-col">
            <NavRail mode="full" onModeChange={setNavMode} onOpenCommand={() => setCommandOpen(true)} compactTargets />
            {showMenu ? (
              <div className="border-t border-border">
                <ProductMenu productId={product.id} compactTargets />
              </div>
            ) : null}
          </div>
        </SheetContent>
      </Sheet>

      <CommandMenu open={commandOpen} onOpenChange={setCommandOpen} />

      <Toaster
        theme={theme === 'light' || (theme === 'system' && document.documentElement.classList.contains('light')) ? 'light' : 'dark'}
        position="bottom-right"
        toastOptions={{
          classNames: {
            toast: 'font-sans text-sm border-border bg-elevated text-foreground',
          },
        }}
      />
    </TooltipProvider>
  )
}
