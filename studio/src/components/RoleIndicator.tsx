import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { IMPERSONATION_ROLES, useRoleStore } from '@/lib/role-store'

export function RoleIndicator() {
  const role = useRoleStore((state) => state.role)
  const uid = useRoleStore((state) => state.uid)
  const setRole = useRoleStore((state) => state.setRole)
  const setUid = useRoleStore((state) => state.setUid)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`Role ${role}`}>
          <UserRound className="size-3.5" />
          <span className="hidden font-mono text-xs sm:inline">{role}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel>Role impersonation</DropdownMenuLabel>
        <p className="px-2 pb-1 text-xs text-muted-foreground">Applied on row reads. postgres skips policies.</p>
        {IMPERSONATION_ROLES.map((item) => (
          <DropdownMenuItem key={item} onSelect={() => setRole(item)}>
            <span className={item === role ? 'text-primary' : undefined}>{item}</span>
          </DropdownMenuItem>
        ))}
        {role === 'authenticated' ? (
          <div className="grid gap-1.5 px-2 py-2" onPointerDown={(event) => event.stopPropagation()}>
            <Label htmlFor="rig-uid">User id</Label>
            <Input
              id="rig-uid"
              value={uid}
              placeholder="auth.uid()"
              className="h-8 font-mono text-xs"
              onChange={(event) => setUid(event.target.value)}
              onKeyDown={(event) => event.stopPropagation()}
            />
          </div>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
