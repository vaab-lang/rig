import { useMemo, useRef, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Columns3, FolderPlus, List, Plus, Trash2, Upload } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { cn } from '@/lib/utils'
import {
  deleteObject,
  decodeObjectText,
  entriesAt,
  formatBytes,
  joinPath,
  listBuckets,
  listObjects,
  previewSrc,
  publicObjectUrl,
  readFileAsBase64,
  saveBucket,
  saveObject,
  createSignedObjectUrl,
  type StorageBucket,
  type StorageObject,
} from '@/lib/storage-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

const EXPIRY_OPTIONS = [
  { label: '60s', seconds: 60 },
  { label: '1h', seconds: 3600 },
  { label: '24h', seconds: 86400 },
  { label: '7d', seconds: 604800 },
] as const

export function FilesView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const fileRef = useRef<HTMLInputElement>(null)
  const bucketsQuery = useQuery({ queryKey: ['studio', 'storage', 'buckets'], queryFn: listBuckets })
  const [bucketId, setBucketId] = useState('')
  const [path, setPath] = useState<string[]>([])
  const [mode, setMode] = useState<'list' | 'columns'>('list')
  const [selected, setSelected] = useState<StorageObject | null>(null)
  const [checked, setChecked] = useState<Set<string>>(new Set())
  const [newBucketOpen, setNewBucketOpen] = useState(false)
  const [folderOpen, setFolderOpen] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [bucketName, setBucketName] = useState('')
  const [bucketPublic, setBucketPublic] = useState(false)
  const [bucketLimit, setBucketLimit] = useState('')
  const [bucketMime, setBucketMime] = useState('')
  const [folderName, setFolderName] = useState('')
  const [renameValue, setRenameValue] = useState('')
  const [expiry, setExpiry] = useState(3600)
  const [progress, setProgress] = useState<number | null>(null)
  const [dragging, setDragging] = useState(false)

  const buckets = bucketsQuery.data ?? []
  const activeBucket = buckets.find((bucket) => bucket.id === bucketId) ?? buckets[0]
  const activeId = activeBucket?.id ?? ''
  const prefix = path.join('/')

  const objectsQuery = useQuery({
    queryKey: ['studio', 'storage', 'objects', activeId],
    queryFn: () => listObjects(activeId),
    enabled: Boolean(activeId),
  })

  const objects = objectsQuery.data ?? []
  const current = useMemo(() => entriesAt(objects, prefix), [objects, prefix])

  const createBucket = useMutation({
    mutationFn: () =>
      saveBucket({
        id: '',
        name: bucketName.trim(),
        public: bucketPublic ? 'true' : 'false',
        file_size_limit: bucketLimit,
        allowed_mime_types: bucketMime,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'storage', 'buckets'] })
      setNewBucketOpen(false)
      setBucketName('')
      toast.success('Saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const writeObject = useMutation({
    mutationFn: saveObject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'storage', 'objects', activeId] })
      toast.success('Saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const removeObject = useMutation({
    mutationFn: deleteObject,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'storage', 'objects', activeId] })
      setSelected(null)
      toast.success('Deleted')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  async function uploadFiles(files: File[]) {
    if (!activeId || files.length === 0) return
    setProgress(0)
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index]!
        const content = await readFileAsBase64(file)
        await saveObject({
          id: '',
          bucket_id: activeId,
          name: joinPath(prefix, file.name),
          size: String(file.size),
          mime_type: file.type || 'application/octet-stream',
          content,
        })
        setProgress(Math.round(((index + 1) / files.length) * 100))
      }
      await queryClient.invalidateQueries({ queryKey: ['studio', 'storage', 'objects', activeId] })
      toast.success('Saved')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Upload failed')
    } finally {
      setProgress(null)
    }
  }

  function copy(value: string) {
    void navigator.clipboard.writeText(value)
    toast.success('Copied')
  }

  async function removeMany(targets: StorageObject[]) {
    for (const object of targets) {
      await deleteObject({ id: object.id, bucket_id: object.bucket_id || activeId, name: object.name })
    }
    setChecked(new Set())
    await queryClient.invalidateQueries({ queryKey: ['studio', 'storage', 'objects', activeId] })
    toast.success('Deleted')
  }

  const selectedChecked = current.files.filter((file) => checked.has(file.id || file.name))

  return (
    <SurfacePage
      title="Files"
      detail="Buckets, list or column explorer, upload, preview, and signed URLs."
      flush
      actions={
        <Button type="button" size="sm" disabled={!online} onClick={() => setNewBucketOpen(true)}>
          <Plus className="size-4" />
          New bucket
        </Button>
      }
    >
      <div className="flex min-h-[calc(100dvh-9rem)] flex-col md:flex-row">
        <aside className="w-full shrink-0 border-b border-border bg-surface md:w-56 md:border-b-0 md:border-r">
          <div className="flex items-center justify-between px-3 py-2">
            <p className="text-xs font-medium text-muted-foreground">Buckets</p>
          </div>
          {bucketsQuery.error ? (
            <div className="px-3 pb-3">
              <ErrorRetry
                message={bucketsQuery.error instanceof Error ? bucketsQuery.error.message : 'Could not load buckets'}
                onRetry={() => void bucketsQuery.refetch()}
              />
            </div>
          ) : buckets.length === 0 ? (
            <p className="px-3 pb-3 text-sm text-muted-foreground">No buckets</p>
          ) : (
            <ScrollArea className="h-[200px] md:h-[calc(100dvh-12rem)]">
              <ul>
                {buckets.map((bucket) => (
                  <li key={bucket.id}>
                    <button
                      type="button"
                      className={cn(
                        'flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-elevated',
                        activeId === bucket.id && 'bg-primary/10 text-primary',
                      )}
                      onClick={() => {
                        setBucketId(bucket.id)
                        setPath([])
                        setSelected(null)
                        setChecked(new Set())
                      }}
                    >
                      <span className="truncate">{bucket.name}</span>
                      {bucket.public ? <Badge variant="secondary">public</Badge> : null}
                    </button>
                  </li>
                ))}
              </ul>
            </ScrollArea>
          )}
        </aside>

        <div className="flex min-w-0 flex-1 flex-col p-4">
          <OfflineBanner online={online} />
          {!activeBucket ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-muted-foreground">
              <p>No buckets</p>
              <Button type="button" size="sm" disabled={!online} onClick={() => setNewBucketOpen(true)}>
                New bucket
              </Button>
            </div>
          ) : objectsQuery.error ? (
            <ErrorRetry
              message={objectsQuery.error instanceof Error ? objectsQuery.error.message : 'Could not load objects'}
              onRetry={() => void objectsQuery.refetch()}
            />
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <PathCrumbs path={path} onNavigate={setPath} />
                <div className="ml-auto flex flex-wrap items-center gap-2">
                  <Button type="button" variant={mode === 'list' ? 'secondary' : 'outline'} size="sm" onClick={() => setMode('list')}>
                    <List className="size-4" />
                    List
                  </Button>
                  <Button
                    type="button"
                    variant={mode === 'columns' ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setMode('columns')}
                  >
                    <Columns3 className="size-4" />
                    Columns
                  </Button>
                  <Button type="button" variant="outline" size="sm" disabled={!online} onClick={() => setFolderOpen(true)}>
                    <FolderPlus className="size-4" />
                    Folder
                  </Button>
                  <Button type="button" size="sm" disabled={!online} onClick={() => fileRef.current?.click()}>
                    <Upload className="size-4" />
                    Upload
                  </Button>
                  <input
                    ref={fileRef}
                    type="file"
                    multiple
                    className="sr-only"
                    onChange={(event) => {
                      const files = event.target.files ? [...event.target.files] : []
                      event.target.value = ''
                      void uploadFiles(files)
                    }}
                  />
                </div>
              </div>
              {selectedChecked.length > 0 ? (
                <div className="mb-3 flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedChecked.length} selected</span>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    disabled={!online}
                    onClick={() => void removeMany(selectedChecked)}
                  >
                    Delete
                  </Button>
                </div>
              ) : null}
              {progress != null ? (
                <div className="mb-3 h-1 overflow-hidden rounded-full bg-border">
                  <div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} />
                </div>
              ) : null}
              <div
                className={cn(
                  'min-h-0 flex-1 overflow-hidden rounded-md border border-border bg-surface',
                  dragging && 'outline outline-2 outline-primary',
                )}
                onDragOver={(event) => {
                  event.preventDefault()
                  setDragging(true)
                }}
                onDragLeave={() => setDragging(false)}
                onDrop={(event) => {
                  event.preventDefault()
                  setDragging(false)
                  void uploadFiles([...event.dataTransfer.files])
                }}
              >
                {mode === 'list' ? (
                  <ListExplorer
                    folders={current.folders}
                    files={current.files}
                    checked={checked}
                    onCheckedChange={setChecked}
                    onOpenFolder={(name) => setPath((currentPath) => [...currentPath, name])}
                    onOpenFile={setSelected}
                    empty={!objectsQuery.isLoading}
                  />
                ) : (
                  <ColumnExplorer
                    objects={objects}
                    path={path}
                    onPathChange={setPath}
                    onOpenFile={setSelected}
                  />
                )}
              </div>
            </>
          )}
        </div>
      </div>

      <Dialog open={newBucketOpen} onOpenChange={setNewBucketOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New bucket</DialogTitle>
            <DialogDescription>Name, public toggle, size limit, and allowed MIME types.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              createBucket.mutate()
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="bucket-name">Name</Label>
              <Input id="bucket-name" required value={bucketName} onChange={(event) => setBucketName(event.target.value)} />
            </div>
            <label className="flex items-center justify-between gap-3 text-sm">
              <span>Public</span>
              <Switch checked={bucketPublic} onCheckedChange={setBucketPublic} />
            </label>
            <div className="grid gap-1.5">
              <Label htmlFor="bucket-limit">File size limit (bytes)</Label>
              <Input id="bucket-limit" value={bucketLimit} onChange={(event) => setBucketLimit(event.target.value)} />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="bucket-mime">Allowed MIME types</Label>
              <Input id="bucket-mime" value={bucketMime} onChange={(event) => setBucketMime(event.target.value)} placeholder="image/png, image/jpeg" />
            </div>
            <Button type="submit" disabled={!online || createBucket.isPending || !bucketName.trim()}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={folderOpen} onOpenChange={setFolderOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New folder</DialogTitle>
            <DialogDescription>Created under the current path.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!activeId || !folderName.trim()) return
              writeObject.mutate({
                id: '',
                bucket_id: activeId,
                name: `${joinPath(prefix, folderName.trim())}/`,
                size: '0',
                mime_type: 'inode/directory',
                content: '',
              })
              setFolderOpen(false)
              setFolderName('')
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="folder-name">Name</Label>
              <Input id="folder-name" required value={folderName} onChange={(event) => setFolderName(event.target.value)} />
            </div>
            <Button type="submit" disabled={!online || writeObject.isPending}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename</DialogTitle>
            <DialogDescription>Updates the object path in this bucket.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              if (!selected || !activeId) return
              writeObject.mutate({
                id: selected.id,
                bucket_id: selected.bucket_id || activeId,
                name: renameValue,
                size: selected.size,
                mime_type: selected.mime_type,
                content: selected.content,
              })
              setRenameOpen(false)
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="rename-path">Path</Label>
              <Input id="rename-path" required value={renameValue} onChange={(event) => setRenameValue(event.target.value)} />
            </div>
            <Button type="submit" disabled={!online || writeObject.isPending}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-[min(420px,100vw)] overflow-auto">
          <SheetHeader>
            <SheetTitle>{selected?.name.split('/').pop() || 'Object'}</SheetTitle>
            <SheetDescription>Preview and URL actions</SheetDescription>
          </SheetHeader>
          {selected ? (
            <ObjectPreview
              object={selected}
              bucket={activeBucket}
              expiry={expiry}
              onExpiry={setExpiry}
              online={online}
              onCopy={copy}
              onRename={() => {
                setRenameValue(selected.name)
                setRenameOpen(true)
              }}
              onDelete={() =>
                removeObject.mutate({
                  id: selected.id,
                  bucket_id: selected.bucket_id || activeId,
                  name: selected.name,
                })
              }
            />
          ) : null}
        </SheetContent>
      </Sheet>
    </SurfacePage>
  )
}

function PathCrumbs({ path, onNavigate }: { path: string[]; onNavigate: (path: string[]) => void }) {
  return (
    <nav aria-label="Path" className="flex min-w-0 flex-wrap items-center gap-1 text-sm">
      <button type="button" className="text-muted-foreground hover:text-foreground" onClick={() => onNavigate([])}>
        /
      </button>
      {path.map((part, index) => (
        <span key={`${part}-${index}`} className="flex items-center gap-1">
          <span className="text-subtle">/</span>
          <button type="button" className="hover:text-primary" onClick={() => onNavigate(path.slice(0, index + 1))}>
            {part}
          </button>
        </span>
      ))}
    </nav>
  )
}

function ListExplorer({
  folders,
  files,
  checked,
  onCheckedChange,
  onOpenFolder,
  onOpenFile,
  empty,
}: {
  folders: string[]
  files: StorageObject[]
  checked: Set<string>
  onCheckedChange: (next: Set<string>) => void
  onOpenFolder: (name: string) => void
  onOpenFile: (object: StorageObject) => void
  empty: boolean
}) {
  if (empty && folders.length === 0 && files.length === 0) {
    return <p className="py-16 text-center text-sm text-muted-foreground">No objects</p>
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead className="w-10" />
          <TableHead>name</TableHead>
          <TableHead>size</TableHead>
          <TableHead>type</TableHead>
          <TableHead>updated</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {folders.map((folder) => (
          <TableRow key={`dir-${folder}`} className="cursor-pointer" onClick={() => onOpenFolder(folder)}>
            <TableCell />
            <TableCell className="font-medium">{folder}/</TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
            <TableCell className="text-muted-foreground">folder</TableCell>
            <TableCell className="text-muted-foreground">—</TableCell>
          </TableRow>
        ))}
        {files.map((file) => {
          const key = file.id || file.name
          return (
            <TableRow key={key} className="cursor-pointer" onClick={() => onOpenFile(file)}>
              <TableCell onClick={(event) => event.stopPropagation()}>
                <Checkbox
                  checked={checked.has(key)}
                  onCheckedChange={(value) => {
                    const next = new Set(checked)
                    if (value === true) next.add(key)
                    else next.delete(key)
                    onCheckedChange(next)
                  }}
                  aria-label={`Select ${file.name}`}
                />
              </TableCell>
              <TableCell className="font-mono text-[13px]">{file.name.split('/').pop()}</TableCell>
              <TableCell className="font-mono text-[13px]">{formatBytes(file.size)}</TableCell>
              <TableCell className="text-sm">{file.mime_type || '—'}</TableCell>
              <TableCell className="font-mono text-[13px]">{file.updated_at || file.created_at || '—'}</TableCell>
            </TableRow>
          )
        })}
      </TableBody>
    </Table>
  )
}

function ColumnExplorer({
  objects,
  path,
  onPathChange,
  onOpenFile,
}: {
  objects: StorageObject[]
  path: string[]
  onPathChange: (path: string[]) => void
  onOpenFile: (object: StorageObject) => void
}) {
  const depths = [[] as string[], ...path.map((_, index) => path.slice(0, index + 1))]
  return (
    <div className="flex h-[min(520px,60vh)] overflow-x-auto">
      {depths.map((prefixParts, depth) => {
        const { folders, files } = entriesAt(objects, prefixParts.join('/'))
        const selectedName = path[depth]
        return (
          <ul key={depth} className="w-56 shrink-0 overflow-auto border-r border-border last:border-r-0">
            {folders.length === 0 && files.length === 0 ? (
              <li className="px-3 py-6 text-sm text-muted-foreground">No objects</li>
            ) : null}
            {folders.map((folder) => (
              <li key={`c-${folder}`}>
                <button
                  type="button"
                  className={cn(
                    'flex w-full truncate px-3 py-2 text-left text-sm hover:bg-elevated',
                    selectedName === folder && 'bg-primary/10 text-primary',
                  )}
                  onClick={() => onPathChange([...prefixParts, folder])}
                >
                  {folder}/
                </button>
              </li>
            ))}
            {files.map((file) => (
              <li key={file.id || file.name}>
                <button
                  type="button"
                  className="flex w-full truncate px-3 py-2 text-left font-mono text-[13px] hover:bg-elevated"
                  onClick={() => onOpenFile(file)}
                >
                  {file.name.split('/').pop()}
                </button>
              </li>
            ))}
          </ul>
        )
      })}
    </div>
  )
}

function ObjectPreview({
  object,
  bucket,
  expiry,
  onExpiry,
  online,
  onCopy,
  onRename,
  onDelete,
}: {
  object: StorageObject
  bucket?: StorageBucket
  expiry: number
  onExpiry: (value: number) => void
  online: boolean
  onCopy: (value: string) => void
  onRename: () => void
  onDelete: () => void
}) {
  const image = previewSrc(object)
  const text = decodeObjectText(object)
  const bucketId = object.bucket_id || bucket?.id || ''
  return (
    <div className="grid gap-3 px-4 pb-6">
      {image ? (
        <img src={image} alt={object.name} className="max-h-56 w-full rounded-md border border-border object-contain" />
      ) : text ? (
        <pre className="max-h-56 overflow-auto rounded-md border border-border bg-background p-3 font-mono text-[13px]">
          {text}
        </pre>
      ) : (
        <p className="text-sm text-muted-foreground">No preview</p>
      )}
      <dl className="grid gap-1 font-mono text-[13px]">
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">size</dt>
          <dd>{formatBytes(object.size)}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">type</dt>
          <dd>{object.mime_type || '—'}</dd>
        </div>
        <div className="flex justify-between gap-3">
          <dt className="text-muted-foreground">updated</dt>
          <dd>{object.updated_at || object.created_at || '—'}</dd>
        </div>
      </dl>
      <div className="grid gap-1.5">
        <Label htmlFor="signed-expiry">Signed URL expiry</Label>
        <select
          id="signed-expiry"
          value={expiry}
          onChange={(event) => onExpiry(Number(event.target.value))}
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
        >
          {EXPIRY_OPTIONS.map((option) => (
            <option key={option.seconds} value={option.seconds}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" variant="outline" size="sm" onClick={() => onCopy(publicObjectUrl(bucketId, object.name))}>
          Get public URL
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            void createSignedObjectUrl(bucketId, object.name, expiry)
              .then(onCopy)
              .catch((error: unknown) => toast.error(error instanceof Error ? error.message : 'Sign failed'))
          }}
        >
          Create signed URL
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (image) {
              const link = document.createElement('a')
              link.href = image
              link.download = object.name.split('/').pop() || 'object'
              link.click()
              return
            }
            onCopy(publicObjectUrl(bucketId, object.name))
          }}
        >
          Download
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!online} onClick={onRename}>
          Move
        </Button>
        <Button type="button" variant="outline" size="sm" disabled={!online} onClick={onRename}>
          Rename
        </Button>
        <Button type="button" variant="destructive" size="sm" disabled={!online} onClick={onDelete}>
          <Trash2 className="size-4" />
          Delete
        </Button>
      </div>
    </div>
  )
}
