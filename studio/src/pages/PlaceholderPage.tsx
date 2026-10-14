import { useLocation } from 'react-router-dom'
import { productFromPath, menuLinkFromPath } from '@/lib/studio-nav'

export function PlaceholderPage() {
  const { pathname } = useLocation()
  const product = productFromPath(pathname)
  const link = menuLinkFromPath(pathname)
  const title = link?.label && link.to !== product.to ? link.label : product.label

  return (
    <div className="p-4 md:p-6">
      <h1 className="text-[22px] font-semibold tracking-[-0.01em]">{title}</h1>
      <p className="mt-1 max-w-[72ch] text-sm text-muted-foreground">
        {product.label} chrome is mounted. This surface is not wired yet.
      </p>
    </div>
  )
}
