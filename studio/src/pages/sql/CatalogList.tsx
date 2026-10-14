import { useMemo, useState } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { ScrollArea } from '@/components/ui/scroll-area'
import type { SqlCatalogItem } from './templates'

type CatalogListProps = {
  title: string
  items: SqlCatalogItem[]
  onOpen: (item: SqlCatalogItem) => void
}

export function CatalogList({ title, items, onOpen }: CatalogListProps) {
  const [query, setQuery] = useState('')
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return items
    return items.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.sql.toLowerCase().includes(q),
    )
  }, [items, query])

  return (
    <div className="flex h-full min-h-0 flex-col bg-surface">
      <div className="p-3 pb-2">
        <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
        <label className="sr-only" htmlFor="catalog-search">
          Search {title.toLowerCase()}
        </label>
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-3.5 -translate-y-1/2 text-subtle" />
          <Input
            id="catalog-search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search"
            className="h-8 pl-7"
          />
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <ul className="px-2 pb-3">
          {filtered.length === 0 ? (
            <li className="px-2 py-6 text-center text-sm text-muted-foreground">No matching {title.toLowerCase()}</li>
          ) : (
            filtered.map((item) => (
              <li key={item.id}>
                <button
                  type="button"
                  className="mb-1 w-full rounded-md border border-transparent px-2 py-2 text-left hover:border-border hover:bg-elevated"
                  onClick={() => onOpen(item)}
                >
                  <span className="block text-sm font-medium">{item.name}</span>
                  <span className="block text-xs text-muted-foreground">{item.description}</span>
                </button>
              </li>
            ))
          )}
        </ul>
      </ScrollArea>
    </div>
  )
}
