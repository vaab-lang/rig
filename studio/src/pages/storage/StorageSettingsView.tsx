import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { listBuckets, saveBucket, type StorageBucket } from '@/lib/storage-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

export function StorageSettingsView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const bucketsQuery = useQuery({ queryKey: ['studio', 'storage', 'buckets'], queryFn: listBuckets })
  const [bucketId, setBucketId] = useState('')
  const [fileSizeLimit, setFileSizeLimit] = useState('')
  const [mimeTypes, setMimeTypes] = useState('')
  const [isPublic, setIsPublic] = useState(false)

  const buckets = bucketsQuery.data ?? []
  const active = buckets.find((bucket) => bucket.id === bucketId) ?? buckets[0]

  useEffect(() => {
    if (!active) return
    setBucketId(active.id)
    setFileSizeLimit(active.file_size_limit)
    setMimeTypes(active.allowed_mime_types)
    setIsPublic(active.public)
  }, [active])

  const save = useMutation({
    mutationFn: (bucket: StorageBucket) =>
      saveBucket({
        id: bucket.id,
        name: bucket.name,
        public: isPublic ? 'true' : 'false',
        file_size_limit: fileSizeLimit,
        allowed_mime_types: mimeTypes,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'storage', 'buckets'] })
      toast.success('Saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <SurfacePage title="Settings" detail="Per-bucket public flag, size limit, and allowed MIME types.">
      <OfflineBanner online={online} />
      {bucketsQuery.error ? (
        <ErrorRetry
          message={bucketsQuery.error instanceof Error ? bucketsQuery.error.message : 'Could not load buckets'}
          onRetry={() => void bucketsQuery.refetch()}
        />
      ) : !active ? (
        <p className="text-sm text-muted-foreground">No buckets. Create one from Files.</p>
      ) : (
        <form
          className="grid max-w-xl gap-3"
          onSubmit={(event) => {
            event.preventDefault()
            save.mutate(active)
          }}
        >
          <div className="grid gap-1.5">
            <Label htmlFor="settings-bucket">Bucket</Label>
            <select
              id="settings-bucket"
              value={active.id}
              onChange={(event) => setBucketId(event.target.value)}
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              {buckets.map((bucket) => (
                <option key={bucket.id} value={bucket.id}>
                  {bucket.name}
                </option>
              ))}
            </select>
          </div>
          <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2 text-sm">
            <span>Public</span>
            <Switch checked={isPublic} disabled={!online} onCheckedChange={setIsPublic} />
          </label>
          <div className="grid gap-1.5">
            <Label htmlFor="size-limit">File size limit (bytes)</Label>
            <Input
              id="size-limit"
              value={fileSizeLimit}
              onChange={(event) => setFileSizeLimit(event.target.value)}
              placeholder="52428800"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="mime-types">Allowed MIME types</Label>
            <Input
              id="mime-types"
              value={mimeTypes}
              onChange={(event) => setMimeTypes(event.target.value)}
              placeholder="image/png, image/jpeg, application/pdf"
            />
            <p className="text-xs text-muted-foreground">Comma separated. Empty allows all.</p>
          </div>
          <Button type="submit" disabled={!online || save.isPending}>
            Save
          </Button>
        </form>
      )}
    </SurfacePage>
  )
}
