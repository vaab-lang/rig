import { explainStatus, listRows, type AuthConfigView } from '@/lib/api'
import { last4 } from '@/lib/utils'

export class StudioApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export type AuthUser = {
  id: string
  email: string
  phone: string
  provider: string
  created_at: string
  last_sign_in_at: string
  raw_user_meta_data: string
  banned_until: string
}

export type AuthUserAction =
  | 'create'
  | 'invite'
  | 'ban'
  | 'unban'
  | 'reset_password'
  | 'update'

export type AuthUserBody = {
  id: string
  email: string
  phone: string
  provider: string
  raw_user_meta_data: string
  banned_until: string
  action: string
}

export type AuthPolicy = {
  id: string
  schema_name: string
  table_name: string
  name: string
  action: string
  roles: string
  command: string
  definition: string
  check_expr: string
  rls_enabled: string
}

export type AuthPolicyBody = {
  id: string
  schema_name: string
  table_name: string
  name: string
  action: string
  roles: string
  command: string
  definition: string
  check_expr: string
  rls_enabled: string
}

export type AuthSession = {
  id: string
  user_id: string
  email: string
  created_at: string
  expires_at: string
  user_agent: string
}

export type AuthMfaFactor = {
  id: string
  user_id: string
  factor_type: string
  status: string
  created_at: string
}

export type AuthConfigFull = AuthConfigView & {
  anonymous_enabled: boolean
  confirm_email: boolean
  phone_enabled: boolean
  custom_oauth_enabled: boolean
  custom_oauth_name: string
  custom_oauth_client_id: string
  custom_oauth_has_secret: boolean
  custom_oauth_client_secret_last4: string
  custom_oauth_url: string
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_has_pass: boolean
  smtp_admin_email: string
  smtp_sender_name: string
  rate_limit_email: string
  rate_limit_token: string
  jwt_expiry: string
}

export type AuthConfigSave = {
  email_enabled: boolean
  min_password_length: string
  magic_link_enabled: boolean
  google_enabled: boolean
  google_client_id: string
  google_client_secret: string
  google_client_secret_last4: string
  github_enabled: boolean
  github_client_id: string
  github_client_secret: string
  github_client_secret_last4: string
  site_url: string
  redirect_urls: string
  anonymous_enabled: boolean
  confirm_email: boolean
  phone_enabled: boolean
  custom_oauth_enabled: boolean
  custom_oauth_name: string
  custom_oauth_client_id: string
  custom_oauth_client_secret: string
  custom_oauth_client_secret_last4: string
  custom_oauth_url: string
  smtp_host: string
  smtp_port: string
  smtp_user: string
  smtp_pass: string
  smtp_admin_email: string
  smtp_sender_name: string
  rate_limit_email: string
  rate_limit_token: string
  jwt_expiry: string
}

export type EmailTemplateId = 'confirm' | 'recovery' | 'magic_link' | 'invite'

export type EmailTemplate = {
  id: EmailTemplateId
  label: string
  subject: string
  html: string
}

const TEMPLATE_DEFAULTS: Record<EmailTemplateId, { label: string; subject: string; html: string }> = {
  confirm: {
    label: 'Confirm signup',
    subject: 'Confirm your email',
    html: '<h2>Confirm your signup</h2><p>Follow {{ .ConfirmationURL }} to confirm.</p>',
  },
  recovery: {
    label: 'Reset password',
    subject: 'Reset your password',
    html: '<h2>Reset password</h2><p>Follow {{ .ConfirmationURL }} to choose a new password.</p>',
  },
  magic_link: {
    label: 'Magic link',
    subject: 'Your magic link',
    html: '<h2>Sign in</h2><p>Follow {{ .ConfirmationURL }} to sign in.</p>',
  },
  invite: {
    label: 'Invite user',
    subject: 'You are invited',
    html: '<h2>Invitation</h2><p>Follow {{ .ConfirmationURL }} to accept.</p>',
  },
}

const TEMPLATE_STORAGE_KEY = 'rig.studio.emailTemplates'

export async function studioJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    ...init,
    headers: {
      Accept: 'application/json',
      ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
      ...init?.headers,
    },
  })
  if (!response.ok) {
    const text = await response.text()
    throw new StudioApiError(explainStatus(response.status, text), response.status)
  }
  const text = await response.text()
  if (!text) return undefined as T
  return JSON.parse(text) as T
}

export function isNotFound(error: unknown): boolean {
  return error instanceof StudioApiError && error.status === 404
}


export function asText(value: unknown, fallback = ''): string {
  if (value == null) return fallback
  return String(value)
}

export function asBool(value: unknown, fallback = false): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const lowered = value.trim().toLowerCase()
    if (lowered === 'true' || lowered === '1' || lowered === 'yes') return true
    if (lowered === 'false' || lowered === '0' || lowered === 'no' || lowered === '') return false
  }
  return fallback
}

export function unwrapList<T extends Record<string, unknown>>(data: unknown, keys: string[]): T[] {
  if (Array.isArray(data)) return data as T[]
  if (data && typeof data === 'object') {
    const record = data as Record<string, unknown>
    for (const key of keys) {
      const value = record[key]
      if (Array.isArray(value)) return value as T[]
    }
  }
  return []
}

function parseUser(row: Record<string, unknown>): AuthUser {
  return {
    id: asText(row.id),
    email: asText(row.email),
    phone: asText(row.phone ?? row.name),
    provider: asText(row.provider, 'email'),
    created_at: asText(row.created_at ?? row.created),
    last_sign_in_at: asText(row.last_sign_in_at),
    raw_user_meta_data: asText(row.raw_user_meta_data, '{}'),
    banned_until: asText(row.banned_until),
  }
}

export async function listAuthUsers(): Promise<{ users: AuthUser[]; source: 'auth' | 'profiles' }> {
  try {
    const data = await studioJson<unknown>('/studio-api/auth/users')
    return { users: unwrapList(data, ['users', 'rows']).map(parseUser), source: 'auth' }
  } catch (error) {
    if (!isNotFound(error)) throw error
    const rows = await listRows('profiles')
    return {
      users: rows.map((row) => parseUser(row)),
      source: 'profiles',
    }
  }
}

function authUserBody(body: Partial<AuthUserBody>): AuthUserBody {
  return {
    id: body.id ?? '',
    email: body.email ?? '',
    phone: body.phone ?? '',
    provider: body.provider ?? '',
    raw_user_meta_data: body.raw_user_meta_data ?? '',
    banned_until: body.banned_until ?? '',
    action: body.action ?? '',
  }
}

export async function saveAuthUser(body: AuthUserBody): Promise<void> {
  await studioJson('/studio-api/auth/users', {
    method: 'POST',
    body: JSON.stringify(authUserBody(body)),
  })
}

export async function deleteAuthUser(id: string): Promise<void> {
  await studioJson('/studio-api/auth/users/delete', {
    method: 'POST',
    body: JSON.stringify(
      authUserBody({
        id,
        action: 'delete',
      }),
    ),
  })
}

function parsePolicy(row: Record<string, unknown>): AuthPolicy {
  return {
    id: asText(row.id),
    schema_name: asText(row.schema_name, 'public'),
    table_name: asText(row.table_name),
    name: asText(row.name),
    action: asText(row.action, 'PERMISSIVE'),
    roles: asText(row.roles, 'public'),
    command: asText(row.command),
    definition: asText(row.definition, 'true'),
    check_expr: asText(row.check_expr),
    rls_enabled: asText(row.rls_enabled, 'true'),
  }
}

export async function listPolicies(): Promise<AuthPolicy[]> {
  const data = await studioJson<unknown>('/studio-api/policies')
  return unwrapList(data, ['policies', 'rows']).map(parsePolicy)
}

function policyBody(body: Partial<AuthPolicyBody>): AuthPolicyBody {
  return {
    id: body.id ?? '',
    schema_name: body.schema_name ?? '',
    table_name: body.table_name ?? '',
    name: body.name ?? '',
    action: body.action ?? '',
    roles: body.roles ?? '',
    command: body.command ?? '',
    definition: body.definition ?? '',
    check_expr: body.check_expr ?? '',
    rls_enabled: body.rls_enabled ?? '',
  }
}

export async function savePolicy(body: AuthPolicyBody): Promise<void> {
  await studioJson('/studio-api/policies', {
    method: 'POST',
    body: JSON.stringify(policyBody(body)),
  })
}

export async function deletePolicy(id: string): Promise<void> {
  await studioJson('/studio-api/policies/delete', {
    method: 'POST',
    body: JSON.stringify(policyBody({ id })),
  })
}

function parseConfig(raw: Record<string, unknown>, fallback?: AuthConfigView): AuthConfigFull {
  return {
    email_enabled: asBool(raw.email_enabled, fallback?.email_enabled ?? true),
    min_password_length: asText(raw.min_password_length, fallback?.min_password_length ?? '8'),
    magic_link_enabled: asBool(raw.magic_link_enabled, fallback?.magic_link_enabled ?? false),
    google_enabled: asBool(raw.google_enabled, fallback?.google_enabled ?? false),
    google_client_id: asText(raw.google_client_id, fallback?.google_client_id),
    google_has_secret: asBool(raw.google_has_secret, fallback?.google_has_secret ?? false),
    google_client_secret_last4: asText(raw.google_client_secret_last4, fallback?.google_client_secret_last4),
    github_enabled: asBool(raw.github_enabled, fallback?.github_enabled ?? false),
    github_client_id: asText(raw.github_client_id, fallback?.github_client_id),
    github_has_secret: asBool(raw.github_has_secret, fallback?.github_has_secret ?? false),
    github_client_secret_last4: asText(raw.github_client_secret_last4, fallback?.github_client_secret_last4),
    site_url: asText(raw.site_url, fallback?.site_url),
    redirect_urls: asText(raw.redirect_urls, fallback?.redirect_urls),
    anonymous_enabled: asBool(raw.anonymous_enabled, false),
    confirm_email: asBool(raw.confirm_email, true),
    phone_enabled: asBool(raw.phone_enabled, false),
    custom_oauth_enabled: asBool(raw.custom_oauth_enabled, false),
    custom_oauth_name: asText(raw.custom_oauth_name),
    custom_oauth_client_id: asText(raw.custom_oauth_client_id),
    custom_oauth_has_secret: asBool(raw.custom_oauth_has_secret, false),
    custom_oauth_client_secret_last4: asText(raw.custom_oauth_client_secret_last4),
    custom_oauth_url: asText(raw.custom_oauth_url),
    smtp_host: asText(raw.smtp_host),
    smtp_port: asText(raw.smtp_port, '587'),
    smtp_user: asText(raw.smtp_user),
    smtp_has_pass: asBool(raw.smtp_has_pass, false),
    smtp_admin_email: asText(raw.smtp_admin_email),
    smtp_sender_name: asText(raw.smtp_sender_name),
    rate_limit_email: asText(raw.rate_limit_email, '30'),
    rate_limit_token: asText(raw.rate_limit_token, '30'),
    jwt_expiry: asText(raw.jwt_expiry, '3600'),
  }
}

function toSaveBody(config: AuthConfigFull, secrets: Partial<AuthConfigSave> = {}): AuthConfigSave {
  return {
    email_enabled: config.email_enabled,
    min_password_length: config.min_password_length,
    magic_link_enabled: config.magic_link_enabled,
    google_enabled: config.google_enabled,
    google_client_id: config.google_client_id,
    google_client_secret: secrets.google_client_secret ?? '',
    google_client_secret_last4: secrets.google_client_secret_last4 ?? config.google_client_secret_last4,
    github_enabled: config.github_enabled,
    github_client_id: config.github_client_id,
    github_client_secret: secrets.github_client_secret ?? '',
    github_client_secret_last4: secrets.github_client_secret_last4 ?? config.github_client_secret_last4,
    site_url: config.site_url,
    redirect_urls: config.redirect_urls,
    anonymous_enabled: config.anonymous_enabled,
    confirm_email: config.confirm_email,
    phone_enabled: config.phone_enabled,
    custom_oauth_enabled: config.custom_oauth_enabled,
    custom_oauth_name: config.custom_oauth_name,
    custom_oauth_client_id: config.custom_oauth_client_id,
    custom_oauth_client_secret: secrets.custom_oauth_client_secret ?? '',
    custom_oauth_client_secret_last4:
      secrets.custom_oauth_client_secret_last4 ?? config.custom_oauth_client_secret_last4,
    custom_oauth_url: config.custom_oauth_url,
    smtp_host: config.smtp_host,
    smtp_port: config.smtp_port,
    smtp_user: config.smtp_user,
    smtp_pass: secrets.smtp_pass ?? '',
    smtp_admin_email: config.smtp_admin_email,
    smtp_sender_name: config.smtp_sender_name,
    rate_limit_email: config.rate_limit_email,
    rate_limit_token: config.rate_limit_token,
    jwt_expiry: config.jwt_expiry,
  }
}

export async function fetchAuthConfigFull(): Promise<AuthConfigFull> {
  const data = await studioJson<Record<string, unknown>>('/studio-api/auth/config')
  return parseConfig(data)
}

export async function saveAuthConfigFull(
  patch: Partial<AuthConfigFull> & Partial<AuthConfigSave>,
): Promise<AuthConfigFull> {
  const current = await fetchAuthConfigFull()
  const next: AuthConfigFull = { ...current, ...patch }
  const body = toSaveBody(next, {
    google_client_secret: patch.google_client_secret,
    google_client_secret_last4: patch.google_client_secret_last4,
    github_client_secret: patch.github_client_secret,
    github_client_secret_last4: patch.github_client_secret_last4,
    custom_oauth_client_secret: patch.custom_oauth_client_secret,
    custom_oauth_client_secret_last4: patch.custom_oauth_client_secret_last4,
    smtp_pass: patch.smtp_pass,
  })
  const data = await studioJson<Record<string, unknown>>('/studio-api/auth/config', {
    method: 'POST',
    body: JSON.stringify(body),
  })
  return parseConfig(data, next)
}

export function freshSecret(value: string): string {
  const trimmed = value.trim()
  if (!trimmed || trimmed.startsWith('•')) return ''
  return trimmed
}

export function maskSecret(hasSecret: boolean, last: string): string {
  if (!hasSecret || !last) return ''
  return `••••${last}`
}

export function secretLast4(value: string, fallback: string): string {
  const fresh = freshSecret(value)
  return fresh ? last4(fresh) : fallback
}

export async function listSessions(): Promise<{ sessions: AuthSession[]; mounted: boolean }> {
  return { sessions: [], mounted: false }
}

export async function revokeSession(id: string): Promise<void> {
  void id
  throw new Error('Sessions are not mounted on this gateway')
}

export async function fetchMfa(): Promise<{ enabled: boolean; factors: AuthMfaFactor[]; mounted: boolean }> {
  return { enabled: false, factors: [], mounted: false }
}

export async function saveMfa(enabled: boolean): Promise<void> {
  void enabled
  throw new Error('MFA is not mounted')
}

function readLocalTemplates(): Partial<Record<EmailTemplateId, { subject: string; html: string }>> {
  try {
    const raw = localStorage.getItem(TEMPLATE_STORAGE_KEY)
    if (!raw) return {}
    return JSON.parse(raw) as Partial<Record<EmailTemplateId, { subject: string; html: string }>>
  } catch {
    return {}
  }
}

function writeLocalTemplates(templates: Record<EmailTemplateId, { subject: string; html: string }>) {
  localStorage.setItem(TEMPLATE_STORAGE_KEY, JSON.stringify(templates))
}

export async function fetchEmailTemplates(): Promise<{ templates: EmailTemplate[]; persisted: boolean }> {
  const local = readLocalTemplates()
  const ids = Object.keys(TEMPLATE_DEFAULTS) as EmailTemplateId[]
  const templates = ids.map((id) => {
    const defaults = TEMPLATE_DEFAULTS[id]
    return {
      id,
      label: defaults.label,
      subject: local[id]?.subject ?? defaults.subject,
      html: local[id]?.html ?? defaults.html,
    }
  })
  return { templates, persisted: false }
}

export async function saveEmailTemplate(id: EmailTemplateId, subject: string, html: string): Promise<boolean> {
  const current = await fetchEmailTemplates()
  const next = Object.fromEntries(
    current.templates.map((template) => [
      template.id,
      template.id === id ? { subject, html } : { subject: template.subject, html: template.html },
    ]),
  ) as Record<EmailTemplateId, { subject: string; html: string }>
  writeLocalTemplates(next)
  return false
}

export const POLICY_TEMPLATES = [
  {
    id: 'read-all',
    name: 'Enable read access for all users',
    command: 'SELECT',
    roles: 'anon,authenticated',
    definition: 'true',
    check_expr: '',
  },
  {
    id: 'insert-auth',
    name: 'Enable insert for authenticated users only',
    command: 'INSERT',
    roles: 'authenticated',
    definition: 'true',
    check_expr: 'true',
  },
  {
    id: 'update-userid',
    name: 'Enable update for users based on user_id',
    command: 'UPDATE',
    roles: 'authenticated',
    definition: 'auth.uid() = user_id',
    check_expr: 'auth.uid() = user_id',
  },
  {
    id: 'delete-userid',
    name: 'Enable delete for users based on user_id',
    command: 'DELETE',
    roles: 'authenticated',
    definition: 'auth.uid() = user_id',
    check_expr: '',
  },
] as const
