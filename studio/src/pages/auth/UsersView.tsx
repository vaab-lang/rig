import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Download, Plus, RefreshCw, Search } from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import {
  deleteAuthUser,
  listAuthUsers,
  saveAuthUser,
  type AuthUser,
  type AuthUserAction,
} from '@/lib/auth-api'
import { cn } from '@/lib/utils'
import { ErrorRetry, MonacoPane, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

const COLUMNS = ['id', 'email', 'phone', 'provider', 'created', 'last sign-in', 'banned'] as const

function emptyUserBody(user: Partial<AuthUser> & { password?: string }, action: AuthUserAction) {
  return {
    id: user.id ?? '',
    email: user.email ?? '',
    phone: user.phone ?? '',
    provider: user.provider ?? 'email',
    raw_user_meta_data: user.raw_user_meta_data ?? '{}',
    banned_until: user.banned_until ?? '',
    action,
    password: user.password ?? '',
  }
}

export function UsersView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const usersQuery = useQuery({ queryKey: ['studio', 'auth', 'users'], queryFn: listAuthUsers })
  const [search, setSearch] = useState('')
  const [provider, setProvider] = useState('')
  const [selected, setSelected] = useState<AuthUser | null>(null)
  const [dialog, setDialog] = useState<'add' | 'invite' | 'reset' | 'delete' | null>(null)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [metadata, setMetadata] = useState('{}')
  const source = usersQuery.data?.source ?? 'auth'
  const profiles = source === 'profiles'

  const users = useMemo(() => {
    const rows = usersQuery.data?.users ?? []
    const q = search.trim().toLowerCase()
    return rows.filter((user) => {
      if (provider && user.provider !== provider) return false
      if (!q) return true
      return [user.id, user.email, user.phone, user.provider].some((value) => value.toLowerCase().includes(q))
    })
  }, [usersQuery.data?.users, search, provider])

  const providers = useMemo(() => {
    return [...new Set((usersQuery.data?.users ?? []).map((user) => user.provider).filter(Boolean))].sort()
  }, [usersQuery.data?.users])

  const mutateUser = useMutation({
    mutationFn: (body: ReturnType<typeof emptyUserBody>) => saveAuthUser(body),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'auth', 'users'] })
      toast.success('Saved')
      setDialog(null)
      setEmail('')
      setPassword('')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const removeUser = useMutation({
    mutationFn: (id: string) => deleteAuthUser(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'auth', 'users'] })
      toast.success('Deleted')
      setSelected(null)
      setDialog(null)
    },
    onError: (error: Error) => toast.error(error.message),
  })

  function openCreate(kind: 'add' | 'invite') {
    setEmail('')
    setPassword('')
    setDialog(kind)
  }

  function exportUsers() {
    const blob = new Blob([JSON.stringify(usersQuery.data?.users ?? [], null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = profiles ? 'profiles.json' : 'auth-users.json'
    link.click()
    URL.revokeObjectURL(url)
  }

  function applyAction(action: AuthUserAction, user = selected) {
    if (!user) return
    mutateUser.mutate(
      emptyUserBody(
        {
          ...user,
          banned_until: action === 'ban' ? new Date().toISOString() : action === 'unban' ? '' : user.banned_until,
          raw_user_meta_data: action === 'update' ? metadata : user.raw_user_meta_data,
        },
        action,
      ),
    )
  }

  return (
    <SurfacePage
      title={profiles ? 'Profiles' : 'Users'}
      detail={
        profiles
          ? 'Profiles. Auth users later.'
          : 'Email users. Password is hashed. Invite and mail are not mounted.'
      }
      actions={
        <>
          <Button type="button" variant="outline" size="sm" onClick={() => void usersQuery.refetch()}>
            <RefreshCw className="size-4" />
            Refresh
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={exportUsers} disabled={!usersQuery.data?.users.length}>
            <Download className="size-4" />
            Export
          </Button>
          <Button type="button" variant="outline" size="sm" disabled title="Invite is not mounted. Mail is not sent.">
            Invite user
          </Button>
          <Button type="button" size="sm" disabled={!online || profiles} onClick={() => openCreate('add')}>
            <Plus className="size-4" />
            Add user
          </Button>
        </>
      }
    >
      <OfflineBanner online={online} />
      {profiles ? (
        <Alert className="mb-4">
          <AlertDescription>GET /studio-api/auth/users is not mounted. Showing profiles.</AlertDescription>
        </Alert>
      ) : null}
      {usersQuery.error ? (
        <ErrorRetry
          message={usersQuery.error instanceof Error ? usersQuery.error.message : 'Could not load users'}
          onRetry={() => void usersQuery.refetch()}
        />
      ) : (
        <div className="grid gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-subtle" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search users"
                className="pl-8"
                aria-label="Search users"
              />
            </div>
            <select
              value={provider}
              onChange={(event) => setProvider(event.target.value)}
              aria-label="Filter by provider"
              className="h-9 rounded-md border border-input bg-background px-2 text-sm"
            >
              <option value="">All providers</option>
              {providers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
          <div className="min-h-0 overflow-auto rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {usersQuery.isLoading
                  ? [0, 1, 2, 3, 4].map((index) => (
                      <TableRow key={index}>
                        {COLUMNS.map((column) => (
                          <TableCell key={column}>
                            <Skeleton className="h-4 w-24" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  : null}
                {!usersQuery.isLoading && users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length} className="py-12 text-center text-muted-foreground">
                      {profiles ? 'No profiles' : 'No users'}
                    </TableCell>
                  </TableRow>
                ) : null}
                {!usersQuery.isLoading
                  ? users.map((user) => (
                      <TableRow
                        key={user.id || user.email}
                        className={cn('cursor-pointer', selected?.id === user.id && 'bg-primary/10')}
                        onClick={() => {
                          setSelected(user)
                          setMetadata(user.raw_user_meta_data || '{}')
                        }}
                      >
                        <TableCell className="max-w-[180px] truncate font-mono text-[13px]">{user.id || '—'}</TableCell>
                        <TableCell className="font-mono text-[13px]">{user.email || '—'}</TableCell>
                        <TableCell className="font-mono text-[13px]">{user.phone || '—'}</TableCell>
                        <TableCell>{user.provider || 'email'}</TableCell>
                        <TableCell className="font-mono text-[13px]">{user.created_at || '—'}</TableCell>
                        <TableCell className="font-mono text-[13px]">{user.last_sign_in_at || '—'}</TableCell>
                        <TableCell>
                          {user.banned_until ? <Badge variant="destructive">banned</Badge> : <Badge variant="secondary">active</Badge>}
                        </TableCell>
                      </TableRow>
                    ))
                  : null}
              </TableBody>
            </Table>
          </div>
        </div>
      )}

      <Sheet open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <SheetContent side="right" className="w-[min(420px,100vw)] overflow-auto">
          <SheetHeader>
            <SheetTitle>{selected?.email || 'User'}</SheetTitle>
            <SheetDescription>User detail</SheetDescription>
          </SheetHeader>
          {selected ? (
            <div className="grid gap-3 px-4 pb-6">
              <CopyField label="id" value={selected.id} />
              <CopyField label="email" value={selected.email} />
              <CopyField label="phone" value={selected.phone} />
              <CopyField label="provider" value={selected.provider} />
              <div className="grid gap-1.5">
                <Label htmlFor="user-metadata">metadata</Label>
                <MonacoPane
                  label="User metadata"
                  language="json"
                  height={180}
                  value={metadata}
                  onChange={setMetadata}
                />
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!online || profiles || mutateUser.isPending}
                  onClick={() => applyAction('update')}
                >
                  Save
                </Button>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={!online || profiles}
                  onClick={() => applyAction(selected.banned_until ? 'unban' : 'ban')}
                >
                  {selected.banned_until ? 'Unban' : 'Ban'}
                </Button>
                <Button type="button" size="sm" variant="outline" disabled={!online || profiles} onClick={() => setDialog('reset')}>
                  Reset password
                </Button>
                <Button type="button" size="sm" variant="destructive" disabled={!online || profiles} onClick={() => setDialog('delete')}>
                  Delete
                </Button>
              </div>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>

      <Dialog open={dialog === 'add' || dialog === 'invite'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialog === 'invite' ? 'Invite user' : 'Add user'}</DialogTitle>
            <DialogDescription>Creates an email user and stores a password hash. No mail is sent.</DialogDescription>
          </DialogHeader>
          <form
            className="grid gap-3"
            onSubmit={(event) => {
              event.preventDefault()
              mutateUser.mutate(
                emptyUserBody(
                  {
                    email,
                    password,
                    provider: 'email',
                    raw_user_meta_data: '{}',
                  },
                  'create',
                ),
              )
            }}
          >
            <div className="grid gap-1.5">
              <Label htmlFor="new-email">Email</Label>
              <Input id="new-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />
            </div>
            {dialog === 'add' ? (
              <div className="grid gap-1.5">
                <Label htmlFor="new-password">Password</Label>
                <Input
                  id="new-password"
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                />
              </div>
            ) : null}
            <p className="text-xs text-muted-foreground">Confirm-email and invite are not enforced. The password is hashed with AUTH_SECRET.</p>
            <Button type="submit" disabled={!online || mutateUser.isPending || !password}>
              Save
            </Button>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'reset'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Sets a new password hash for {selected?.email}. No email is sent.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="reset-password">New password</Label>
              <Input id="reset-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
            </div>
            <Button
              type="button"
              disabled={!online || !selected || !password || mutateUser.isPending}
              onClick={() => selected && mutateUser.mutate(emptyUserBody({ ...selected, password }, 'reset_password'))}
            >
              Reset password
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={dialog === 'delete'} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete user</DialogTitle>
            <DialogDescription>Deletes {selected?.email || selected?.id}. This cannot be undone from Studio.</DialogDescription>
          </DialogHeader>
          <Button
            type="button"
            variant="destructive"
            disabled={!online || !selected || removeUser.isPending}
            onClick={() => selected && removeUser.mutate(selected.id)}
          >
            Delete
          </Button>
        </DialogContent>
      </Dialog>
    </SurfacePage>
  )
}

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1.5">
      <Label>{label}</Label>
      <div className="flex items-center gap-2">
        <Input readOnly value={value || '—'} className="font-mono text-[13px]" />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!value}
          onClick={() => {
            void navigator.clipboard.writeText(value)
            toast.success('Copied')
          }}
        >
          Copy
        </Button>
      </div>
    </div>
  )
}
