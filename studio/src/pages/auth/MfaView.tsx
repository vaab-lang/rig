import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { fetchMfa, saveMfa } from '@/lib/auth-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

export function MfaView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const mfaQuery = useQuery({ queryKey: ['studio', 'auth', 'mfa'], queryFn: fetchMfa })
  const save = useMutation({
    mutationFn: (enabled: boolean) => saveMfa(enabled),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'auth', 'mfa'] })
      toast.success('Saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const mounted = mfaQuery.data?.mounted ?? false
  const enabled = mfaQuery.data?.enabled ?? false
  const factors = mfaQuery.data?.factors ?? []

  return (
    <SurfacePage title="MFA" detail="Multi-factor settings and enrolled factors.">
      <OfflineBanner online={online} />
      {mfaQuery.error ? (
        <ErrorRetry
          message={mfaQuery.error instanceof Error ? mfaQuery.error.message : 'Could not load MFA'}
          onRetry={() => void mfaQuery.refetch()}
        />
      ) : (
        <div className="grid max-w-3xl gap-4">
          {!mounted ? (
            <Alert>
              <AlertDescription>MFA is not mounted</AlertDescription>
            </Alert>
          ) : null}
          <label className="flex items-center justify-between gap-3 rounded-md border border-border bg-surface px-3 py-2">
            <Label htmlFor="mfa-enabled">Enable</Label>
            <Switch
              id="mfa-enabled"
              checked={enabled}
              disabled={!online || !mounted || save.isPending}
              onCheckedChange={(checked) => save.mutate(checked)}
            />
          </label>
          <div className="overflow-auto rounded-md border border-border bg-surface">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>id</TableHead>
                  <TableHead>user</TableHead>
                  <TableHead>type</TableHead>
                  <TableHead>status</TableHead>
                  <TableHead>created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {factors.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="py-12 text-center text-muted-foreground">
                      No factors
                    </TableCell>
                  </TableRow>
                ) : (
                  factors.map((factor) => (
                    <TableRow key={factor.id}>
                      <TableCell className="font-mono text-[13px]">{factor.id}</TableCell>
                      <TableCell className="font-mono text-[13px]">{factor.user_id || '—'}</TableCell>
                      <TableCell>{factor.factor_type}</TableCell>
                      <TableCell>
                        <Badge variant={factor.status === 'verified' ? 'success' : 'secondary'}>{factor.status}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-[13px]">{factor.created_at || '—'}</TableCell>
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
