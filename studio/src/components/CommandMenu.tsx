import { useEffect, useState } from 'react'
import { Command } from 'cmdk'
import { useNavigate } from 'react-router-dom'
import { Search } from 'lucide-react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { useStudio } from '@/lib/studio-context'
import { formatGShortcut, pathForGKey, STUDIO_PRODUCTS } from '@/lib/studio-nav'
import { applyTheme, type ThemeMode } from '@/lib/prefs'

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target.isContentEditable) return true
  const tag = target.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true
  return Boolean(target.closest('[role="textbox"], .monaco-editor, .cm-editor, [cmdk-input]'))
}

function resolvedTheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'light') return 'light'
  if (theme === 'dark') return 'dark'
  return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
}

type CommandMenuProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandMenu({ open, onOpenChange }: CommandMenuProps) {
  const navigate = useNavigate()
  const { theme, setTheme } = useStudio()
  const [pendingG, setPendingG] = useState(false)

  useEffect(() => {
    if (!pendingG) return
    const timer = window.setTimeout(() => setPendingG(false), 800)
    return () => window.clearTimeout(timer)
  }, [pendingG])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        onOpenChange(!open)
        return
      }
      if (open || event.metaKey || event.ctrlKey || event.altKey) return
      if (isTypingTarget(event.target)) return

      const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
      if (pendingG) {
        const path = pathForGKey(key)
        setPendingG(false)
        if (path) {
          event.preventDefault()
          navigate(path)
        }
        return
      }
      if (key === 'g') {
        event.preventDefault()
        setPendingG(true)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [navigate, onOpenChange, open, pendingG])

  function go(path: string) {
    navigate(path)
    onOpenChange(false)
  }

  function toggleTheme() {
    const next = resolvedTheme(theme) === 'dark' ? 'light' : 'dark'
    setTheme(next)
    applyTheme(next)
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="top-[20%] max-w-lg translate-y-0 overflow-hidden p-0">
        <DialogTitle className="sr-only">Command menu</DialogTitle>
        <Command label="Command menu" className="bg-elevated text-foreground">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="size-4 shrink-0 text-muted-foreground" />
            <Command.Input
              placeholder="Search routes and actions"
              className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-subtle"
            />
          </div>
          <Command.List className="max-h-80 overflow-auto p-1">
            <Command.Empty className="px-3 py-6 text-sm text-muted-foreground">No results</Command.Empty>
            <Command.Group heading="Navigate" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
              {STUDIO_PRODUCTS.map((product) => (
                <Command.Item
                  key={product.id}
                  value={`${product.label} ${product.to}`}
                  keywords={[product.label, product.to, product.id]}
                  onSelect={() => go(product.to)}
                  className="flex cursor-default items-center justify-between rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface"
                >
                  <span>{product.label}</span>
                  {product.gKey ? (
                    <kbd className="font-mono text-[11px] text-subtle">{formatGShortcut(product.gKey)}</kbd>
                  ) : null}
                </Command.Item>
              ))}
            </Command.Group>
            <Command.Group heading="Actions" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
              <Command.Item
                value="Create new table"
                onSelect={() => go('/editor')}
                className="rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface"
              >
                Create new table
              </Command.Item>
              <Command.Item
                value="Run SQL"
                onSelect={() => go('/sql')}
                className="rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface"
              >
                Run SQL
              </Command.Item>
              <Command.Item
                value="New user"
                onSelect={() => go('/auth')}
                className="rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface"
              >
                New user
              </Command.Item>
              <Command.Item
                value="New bucket"
                onSelect={() => go('/storage')}
                className="rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface"
              >
                New bucket
              </Command.Item>
              <Command.Item
                value="Toggle theme"
                onSelect={toggleTheme}
                className="rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface"
              >
                Toggle theme
              </Command.Item>
            </Command.Group>
            <Command.Group heading="Shortcuts" className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:text-muted-foreground">
              {STUDIO_PRODUCTS.filter((product) => product.gKey).map((product) => (
                <Command.Item
                  key={`shortcut-${product.id}`}
                  value={`${formatGShortcut(product.gKey!)} ${product.label}`}
                  onSelect={() => go(product.to)}
                  className="flex cursor-default items-center justify-between rounded-sm px-2 py-2 text-sm data-[selected=true]:bg-surface"
                >
                  <span>{product.label}</span>
                  <kbd className="font-mono text-[11px] text-subtle">{formatGShortcut(product.gKey!)}</kbd>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </DialogContent>
    </Dialog>
  )
}
