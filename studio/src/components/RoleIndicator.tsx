import { UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { IMPERSONATION_ROLES, useRoleStore } from '@/lib/role-store'

export function RoleIndicator() {
  const role = useRoleStore((state) => state.role)
  const setRole = useRoleStore((state) => state.setRole)

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant="outline" size="sm" aria-label={`Role ${role}`}>
          <UserRound className="size-3.5" />
          <span className="hidden font-mono text-xs sm:inline">{role}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Role impersonation</DropdownMenuLabel>
        {IMPERSONATION_ROLES.map((item) => (
          <DropdownMenuItem key={item} onSelect={() => setRole(item)}>
            <span className={item === role ? 'text-primary' : undefined}>{item}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
