import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { listSessions, revokeSession } from '@/lib/auth-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

const COLUMNS = ['id', 'email', 'created', 'expires', 'user agent'] as const

export function SessionsView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const sessionsQuery = useQuery({ queryKey: ['studio', 'auth', 'sessions'], queryFn: listSessions })
  const revoke = useMutation({
    mutationFn: (id: string) => revokeSession(id),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'auth', 'sessions'] })
      toast.success('Revoked')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const sessions = sessionsQuery.data?.sessions ?? []
  const mounted = sessionsQuery.data?.mounted ?? true

  return (
    <SurfacePage title="Sessions" detail="Active auth sessions. Revoke drops a single session.">
      <OfflineBanner online={online} />
      {sessionsQuery.error ? (
        <ErrorRetry
          message={sessionsQuery.error instanceof Error ? sessionsQuery.error.message : 'Could not load sessions'}
          onRetry={() => void sessionsQuery.refetch()}
        />
      ) : (
        <div className="grid gap-3">
          {!mounted ? (
            <Alert>
              <AlertDescription>Sessions are not mounted on this gateway.</AlertDescription>
            </Alert>
          ) : null}
          <div className="overflow-auto rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  {COLUMNS.map((column) => (
                    <TableHead key={column}>{column}</TableHead>
                  ))}
                  <TableHead className="w-24" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {sessions.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={COLUMNS.length + 1} className="py-12 text-center text-muted-foreground">
                      No sessions
                    </TableCell>
                  </TableRow>
                ) : (
                  sessions.map((session) => (
                    <TableRow key={session.id}>
                      <TableCell className="font-mono text-[13px]">{session.id}</TableCell>
                      <TableCell className="font-mono text-[13px]">{session.email || '—'}</TableCell>
                      <TableCell className="font-mono text-[13px]">{session.created_at || '—'}</TableCell>
                      <TableCell className="font-mono text-[13px]">{session.expires_at || '—'}</TableCell>
                      <TableCell className="max-w-[240px] truncate text-sm">{session.user_agent || '—'}</TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={!online || !mounted || revoke.isPending}
                          onClick={() => revoke.mutate(session.id)}
                        >
                          Revoke
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </SurfacePage>
  )
}
