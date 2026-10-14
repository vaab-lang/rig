import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { fetchAuthConfigFull, freshSecret, saveAuthConfigFull } from '@/lib/auth-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

export function SmtpView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const configQuery = useQuery({ queryKey: ['studio', 'auth', 'config'], queryFn: fetchAuthConfigFull })
  const [host, setHost] = useState('')
  const [port, setPort] = useState('587')
  const [user, setUser] = useState('')
  const [password, setPassword] = useState('')
  const [sender, setSender] = useState('')
  const [senderName, setSenderName] = useState('')

  useEffect(() => {
    if (!configQuery.data) return
    setHost(configQuery.data.smtp_host)
    setPort(configQuery.data.smtp_port || '587')
    setUser(configQuery.data.smtp_user)
    setPassword('')
    setSender(configQuery.data.smtp_admin_email)
    setSenderName(configQuery.data.smtp_sender_name)
  }, [configQuery.data])

  const save = useMutation({
    mutationFn: () =>
      saveAuthConfigFull({
        smtp_host: host,
        smtp_port: port,
        smtp_user: user,
        smtp_pass: freshSecret(password),
        smtp_admin_email: sender,
        smtp_sender_name: senderName,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'auth', 'config'] })
      setPassword('')
      toast.success('Saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  return (
    <SurfacePage title="SMTP" detail="Outbound mail host. Password is never shown in full.">
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
            <Label htmlFor="smtp-host">Host</Label>
            <Input id="smtp-host" value={host} onChange={(event) => setHost(event.target.value)} placeholder="smtp.example.com" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-port">Port</Label>
            <Input id="smtp-port" type="number" value={port} onChange={(event) => setPort(event.target.value)} />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-user">User</Label>
            <Input id="smtp-user" value={user} onChange={(event) => setUser(event.target.value)} autoComplete="off" />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-pass">Password</Label>
            <Input
              id="smtp-pass"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              placeholder={configQuery.data?.smtp_has_pass ? '••••' : ''}
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-sender">Sender</Label>
            <Input
              id="smtp-sender"
              value={sender}
              onChange={(event) => setSender(event.target.value)}
              placeholder="noreply@example.com"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="smtp-sender-name">Sender name</Label>
            <Input id="smtp-sender-name" value={senderName} onChange={(event) => setSenderName(event.target.value)} />
          </div>
          <Button type="submit" disabled={!online || save.isPending}>
            Save
          </Button>
        </form>
      )}
    </SurfacePage>
  )
}
