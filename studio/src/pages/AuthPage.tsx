import { useLocation } from 'react-router-dom'
import { MfaView } from '@/pages/auth/MfaView'
import { PoliciesView } from '@/pages/auth/PoliciesView'
import { ProvidersView } from '@/pages/auth/ProvidersView'
import { SessionsView } from '@/pages/auth/SessionsView'
import { SmtpView } from '@/pages/auth/SmtpView'
import { TemplatesView } from '@/pages/auth/TemplatesView'
import { UrlConfigView } from '@/pages/auth/UrlConfigView'
import { UsersView } from '@/pages/auth/UsersView'

export function AuthPage() {
  const { pathname } = useLocation()
  if (pathname.startsWith('/auth/policies')) return <PoliciesView />
  if (pathname.startsWith('/auth/providers')) return <ProvidersView />
  if (pathname.startsWith('/auth/url-configuration')) return <UrlConfigView />
  if (pathname.startsWith('/auth/templates')) return <TemplatesView />
  if (pathname.startsWith('/auth/smtp')) return <SmtpView />
  if (pathname.startsWith('/auth/sessions')) return <SessionsView />
  if (pathname.startsWith('/auth/mfa')) return <MfaView />
  return <UsersView />
}
