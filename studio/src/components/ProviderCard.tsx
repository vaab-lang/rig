import { useState, type ReactNode } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'

export type ProviderField = {
  key: string
  label: string
  type: 'text' | 'password' | 'number'
  value: string
  placeholder?: string
}

export type ProviderCardProps = {
  name: string
  enabled: boolean
  onEnabledChange: (enabled: boolean) => void
  fields: ProviderField[]
  onFieldChange: (key: string, value: string) => void
  onSave: () => void
  saving: boolean
  error?: string | null
  disabled?: boolean
  note?: string
  children?: ReactNode
}

export function ProviderCard({
  name,
  enabled,
  onEnabledChange,
  fields,
  onFieldChange,
  onSave,
  saving,
  error,
  disabled = false,
  note,
  children,
}: ProviderCardProps) {
  const switchId = `${name.replace(/\s+/g, '-').toLowerCase()}-enabled`
  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <CardTitle>{name}</CardTitle>
        <div className="flex items-center gap-2">
          <Label htmlFor={switchId}>{enabled ? 'Enabled' : 'Enable'}</Label>
          <Switch id={switchId} checked={enabled} disabled={disabled} onCheckedChange={onEnabledChange} />
        </div>
      </CardHeader>
      <CardContent className="grid gap-3">
        {note ? <p className="text-sm text-muted-foreground">{note}</p> : null}
        {fields.map((field) => (
          <ProviderFieldInput
            key={field.key}
            field={field}
            disabled={disabled}
            onChange={(value) => onFieldChange(field.key, value)}
          />
        ))}
        {children}
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <div>
          <Button type="button" size="sm" disabled={disabled || saving} onClick={onSave}>
            {saving ? 'Saving' : 'Save'}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}

function ProviderFieldInput({
  field,
  disabled,
  onChange,
}: {
  field: ProviderField
  disabled: boolean
  onChange: (value: string) => void
}) {
  const [show, setShow] = useState(false)
  const inputId = `field-${field.key}`
  const isSecret = field.type === 'password'
  return (
    <div className="grid gap-1.5">
      <Label htmlFor={inputId}>{field.label}</Label>
      <div className="relative">
        <Input
          id={inputId}
          type={isSecret && !show ? 'password' : field.type === 'number' ? 'number' : 'text'}
          value={field.value}
          placeholder={field.placeholder}
          disabled={disabled}
          autoComplete="off"
          onChange={(event) => onChange(event.target.value)}
        />
        {isSecret ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-1 top-1/2 h-7 w-7 -translate-y-1/2"
            onClick={() => setShow((value) => !value)}
            aria-label={show ? 'Hide secret' : 'Show secret'}
          >
            {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </Button>
        ) : null}
      </div>
    </div>
  )
}
