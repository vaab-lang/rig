import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { ProviderCard } from '@/components/ProviderCard'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  fetchAuthConfigFull,
  freshSecret,
  maskSecret,
  saveAuthConfigFull,
  secretLast4,
  type AuthConfigFull,
} from '@/lib/auth-api'
import { ErrorRetry, OfflineBanner, SurfacePage, useOnline } from '@/pages/auth/AuthChrome'

const empty: AuthConfigFull = {
  email_enabled: true,
  min_password_length: '8',
  magic_link_enabled: false,
  google_enabled: false,
  google_client_id: '',
  google_has_secret: false,
  google_client_secret_last4: '',
  github_enabled: false,
  github_client_id: '',
  github_has_secret: false,
  github_client_secret_last4: '',
  site_url: '',
  redirect_urls: '',
  anonymous_enabled: false,
  confirm_email: true,
  phone_enabled: false,
  custom_oauth_enabled: false,
  custom_oauth_name: '',
  custom_oauth_client_id: '',
  custom_oauth_has_secret: false,
  custom_oauth_client_secret_last4: '',
  custom_oauth_url: '',
  smtp_host: '',
  smtp_port: '587',
  smtp_user: '',
  smtp_has_pass: false,
  smtp_admin_email: '',
  smtp_sender_name: '',
  rate_limit_email: '30',
  rate_limit_token: '30',
  jwt_expiry: '3600',
}

export function ProvidersView() {
  const online = useOnline()
  const queryClient = useQueryClient()
  const configQuery = useQuery({ queryKey: ['studio', 'auth', 'config'], queryFn: fetchAuthConfigFull })
  const [config, setConfig] = useState<AuthConfigFull>(empty)
  const [googleSecret, setGoogleSecret] = useState('')
  const [githubSecret, setGithubSecret] = useState('')

  useEffect(() => {
    if (!configQuery.data) return
    setConfig(configQuery.data)
    setGoogleSecret(maskSecret(configQuery.data.google_has_secret, configQuery.data.google_client_secret_last4))
    setGithubSecret(maskSecret(configQuery.data.github_has_secret, configQuery.data.github_client_secret_last4))
  }, [configQuery.data])

  const save = useMutation({
    mutationFn: () => {
      const google = freshSecret(googleSecret)
      const github = freshSecret(githubSecret)
      return saveAuthConfigFull({
        ...config,
        google_client_secret: google,
        google_client_secret_last4: secretLast4(googleSecret, config.google_client_secret_last4),
        github_client_secret: github,
        github_client_secret_last4: secretLast4(githubSecret, config.github_client_secret_last4),
      })
    },
    onSuccess: async (view) => {
      await queryClient.invalidateQueries({ queryKey: ['studio', 'auth', 'config'] })
      setConfig(view)
      setGoogleSecret(maskSecret(view.google_has_secret, view.google_client_secret_last4))
      setGithubSecret(maskSecret(view.github_has_secret, view.github_client_secret_last4))
      toast.success('Saved')
    },
    onError: (error: Error) => toast.error(error.message),
  })

  const missing = configQuery.error && !configQuery.data
  const saveError = save.error instanceof Error ? save.error.message : null

  return (
    <SurfacePage title="Providers" detail="Stored, not enforced. OAuth, phone, and magic link do not run.">
      <OfflineBanner online={online} />
      {missing ? (
        <ErrorRetry
          message={configQuery.error instanceof Error ? configQuery.error.message : 'Save requires studio-api'}
          onRetry={() => void configQuery.refetch()}
        />
      ) : null}
      {configQuery.error && configQuery.data ? (
        <Alert className="mb-4">
          <AlertDescription>Save requires studio-api. Edits stay local until the endpoint is up.</AlertDescription>
        </Alert>
      ) : null}
      <div className="grid max-w-2xl gap-3">
        <ProviderCard
          name="Email"
          enabled={config.email_enabled}
          onEnabledChange={(enabled) => setConfig((current) => ({ ...current, email_enabled: enabled }))}
          fields={[
            {
              key: 'min_password_length',
              label: 'Min password length',
              type: 'number',
              value: config.min_password_length,
            },
          ]}
          onFieldChange={(key, value) => setConfig((current) => ({ ...current, [key]: value }))}
          onSave={() => void save.mutate()}
          saving={save.isPending}
          error={saveError}
          disabled={!online}
        >
          <label className="flex items-center justify-between gap-3 text-sm">
            <Label htmlFor="confirm-email">Confirm email</Label>
            <Switch
              id="confirm-email"
              checked={config.confirm_email}
              disabled={!online}
              onCheckedChange={(checked) => setConfig((current) => ({ ...current, confirm_email: checked }))}
            />
          </label>
        </ProviderCard>
        <ProviderCard
          name="Magic link"
          enabled={config.magic_link_enabled}
          onEnabledChange={(enabled) => setConfig((current) => ({ ...current, magic_link_enabled: enabled }))}
          fields={[]}
          onFieldChange={() => undefined}
          onSave={() => void save.mutate()}
          saving={save.isPending}
          disabled={!online}
        />
        <ProviderCard
          name="Google"
          enabled={config.google_enabled}
          onEnabledChange={(enabled) => setConfig((current) => ({ ...current, google_enabled: enabled }))}
          fields={[
            { key: 'google_client_id', label: 'Client ID', type: 'text', value: config.google_client_id },
            {
              key: 'google_client_secret',
              label: 'Client secret',
              type: 'password',
              value: googleSecret,
              placeholder: config.google_has_secret ? `••••${config.google_client_secret_last4}` : '',
            },
          ]}
          onFieldChange={(key, value) => {
            if (key === 'google_client_secret') setGoogleSecret(value)
            else setConfig((current) => ({ ...current, [key]: value }))
          }}
          onSave={() => void save.mutate()}
          saving={save.isPending}
          disabled={!online}
        />
        <ProviderCard
          name="GitHub"
          enabled={config.github_enabled}
          onEnabledChange={(enabled) => setConfig((current) => ({ ...current, github_enabled: enabled }))}
          fields={[
            { key: 'github_client_id', label: 'Client ID', type: 'text', value: config.github_client_id },
            {
              key: 'github_client_secret',
              label: 'Client secret',
              type: 'password',
              value: githubSecret,
              placeholder: config.github_has_secret ? `••••${config.github_client_secret_last4}` : '',
            },
          ]}
          onFieldChange={(key, value) => {
            if (key === 'github_client_secret') setGithubSecret(value)
            else setConfig((current) => ({ ...current, [key]: value }))
          }}
          onSave={() => void save.mutate()}
          saving={save.isPending}
          disabled={!online}
        />
      </div>
    </SurfacePage>
  )
}
