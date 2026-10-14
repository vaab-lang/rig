import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Search, Star, Trash2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Skeleton } from '@/components/ui/skeleton'
import type { SqlSnippet } from '@/lib/sql-api'
import { cn } from '@/lib/utils'

const FOLDERS = ['Favorites', 'Shared', 'Private'] as const

type SnippetTreeProps = {
  snippets: SqlSnippet[]
  source: 'api' | 'local'
  loading?: boolean
  error?: string | null
  onOpen: (snippet: SqlSnippet) => void
  onToggleFavorite: (snippet: SqlSnippet) => void
  onDelete: (snippet: SqlSnippet) => void
  onRetry?: () => void
}

function inFolder(snippet: SqlSnippet, folder: (typeof FOLDERS)[number]): boolean {
  if (folder === 'Favorites') return snippet.favorite || snippet.folder === 'Favorites'
  if (folder === 'Shared') return snippet.visibility === 'shared' || snippet.folder === 'Shared'
  return snippet.visibility !== 'shared' && snippet.folder !== 'Shared'
}

export function SnippetTree({
  snippets,
  source,
  loading = false,
  error = null,
  onOpen,
  onToggleFavorite,
  onDelete,
  onRetry,
}: SnippetTreeProps) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState<Record<string, boolean>>({ Favorites: true, Shared: true, Private: true })

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return snippets
    return snippets.filter(
      (snippet) =>
        snippet.name.toLowerCase().includes(q) ||
        snippet.description.toLowerCase().includes(q) ||
        snippet.sql.toLowerCase().includes(q),
    )
  }, [query, snippets])

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="flex items-center justify-between gap-2 p-3 pb-2">
        <label className="sr-only" htmlFor="snippet-search">
          Search queries
        </label>
        <div className="relative min-w-0 flex-1">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            id="snippet-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search queries"
            className="h-8 pl-7"
          />
        </div>
        {source === 'local' ? <Badge variant="secondary">local</Badge> : null}
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="px-2 pb-3">
          {loading ? (
            <div className="space-y-2 px-1 pt-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-8 w-full" />
              <Skeleton className="h-8 w-full" />
            </div>
          ) : error ? (
            <div className="space-y-2 p-2 text-sm">
              <p className="text-destructive">{error}</p>
              {onRetry ? (
                <Button type="button" size="sm" variant="outline" onClick={onRetry}>
                  Retry
                </Button>
              ) : null}
            </div>
          ) : (
            FOLDERS.map((folder) => {
              const items = filtered.filter((snippet) => inFolder(snippet, folder))
              const expanded = open[folder] ?? true
              return (
                <section key={folder} className="mb-1">
                  <button
                    type="button"
                    className="flex h-8 w-full items-center gap-1 rounded-sm px-1 text-left text-xs font-medium text-muted-foreground hover:bg-elevated"
                    onClick={() => setOpen((current) => ({ ...current, [folder]: !expanded }))}
                    aria-expanded={expanded}
                  >
                    {expanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                    {folder}
                    <span className="ml-auto font-mono text-[11px] text-subtle">{items.length}</span>
                  </button>
                  {expanded ? (
                    items.length === 0 ? (
                      <p className="px-6 py-1 text-xs text-subtle">No snippets</p>
                    ) : (
                      <ul>
                        {items.map((snippet) => (
                          <li key={`${folder}-${snippet.id}`}>
                            <div className="group flex items-center gap-1 rounded-sm hover:bg-elevated">
                              <button
                                type="button"
                                className="min-w-0 flex-1 truncate px-2 py-1.5 text-left text-sm"
                                onClick={() => onOpen(snippet)}
                              >
                                <span className="block truncate">{snippet.name}</span>
                                {snippet.description ? (
                                  <span className="block truncate text-xs text-muted-foreground">{snippet.description}</span>
                                ) : null}
                              </button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className={cn('size-7 shrink-0', snippet.favorite ? 'text-primary' : 'text-subtle opacity-0 group-hover:opacity-100')}
                                aria-label={snippet.favorite ? 'Remove favorite' : 'Favorite'}
                                onClick={() => onToggleFavorite(snippet)}
                              >
                                <Star className={cn('size-3.5', snippet.favorite && 'fill-current')} />
                              </Button>
                              <Button
                                type="button"
                                size="icon"
                                variant="ghost"
                                className="size-7 shrink-0 text-subtle opacity-0 group-hover:opacity-100"
                                aria-label="Delete snippet"
                                onClick={() => onDelete(snippet)}
                              >
                                <Trash2 className="size-3.5" />
                              </Button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )
                  ) : null}
                </section>
              )
            })
          )}
        </div>
      </ScrollArea>
    </div>
  )
}
