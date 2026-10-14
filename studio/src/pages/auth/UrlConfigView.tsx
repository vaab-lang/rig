import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { fetchAuthConfigFull, saveAuthConfigFull } from '@/lib/auth-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

export function UrlConfigView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const configQuery = useQuery({ queryKey: ['studio', 'auth', 'config'], queryFn: fetchAuthConfigFull })
  const [siteUrl, setSiteUrl] = useState('')
  const [redirectUrls, setRedirectUrls] = useState('')

  useEffect(() => {
    if (!configQuery.data) return
    setSiteUrl(configQuery.data.site_url)
    setRedirectUrls(configQuery.data.redirect_urls)
  }, [configQuery.data])

  const save = useMutation({
    mutationFn: () => saveAuthConfigFull({ site_url: siteUrl, redirect_urls: redirectUrls }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'auth', 'config'] })
      toast.success('Saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <SurfacePage title="URL Configuration" detail="Site URL and redirect allow-list. One redirect per line.">
      <OfflineBanner online={online} />
      {configQuery.error ? (
        <ErrorRetry
          message={configQuery.error instanceof Error ? configQuery.error.message : 'Save requires studio-api'}
          onRetry={() => void configQuery.refetch()}
        />
      ) : (
        <form
          className="grid max-w-xl gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate()
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="site-url">Site URL</Label>
            <Input
              id="site-url"
              value={siteUrl}
              onChange={(event) => setSiteUrl(event.target.value)}
              placeholder="http://127.0.0.1:54321"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="redirect-urls">Redirect URLs</Label>
            <Textarea
              id="redirect-urls"
              value={redirectUrls}
              onChange={(event) => setRedirectUrls(event.target.value)}
              placeholder={'http://127.0.0.1:54321/auth/callback'}
            />
            <p className="text-xs text-muted-foreground">One per line.</p>
          </div>
          <Button type="submit" disabled={!online || save.isPending}>
            Save
          </Button>
        </form>
      )}
    </SurfacePage>
  )
}
