import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const IMPERSONATION_ROLES = ['postgres', 'anon', 'authenticated'] as const

export type ImpersonationRole = (typeof IMPERSONATION_ROLES)[number]

type RoleState = {
  role: ImpersonationRole
  setRole: (role: ImpersonationRole) => void
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: 'postgres',
      setRole: (role) => set({ role }),
    }),
    { name: 'rig.studio.role' },
  ),
)
