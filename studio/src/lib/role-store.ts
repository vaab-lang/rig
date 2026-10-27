import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const IMPERSONATION_ROLES = ['postgres', 'anon', 'authenticated'] as const

export type ImpersonationRole = (typeof IMPERSONATION_ROLES)[number]

type RoleState = {
  role: ImpersonationRole
  uid: string
  setRole: (role: ImpersonationRole) => void
  setUid: (uid: string) => void
}

export const useRoleStore = create<RoleState>()(
  persist(
    (set) => ({
      role: 'postgres',
      uid: '',
      setRole: (role) => set({ role }),
      setUid: (uid) => set({ uid }),
    }),
    { name: 'rig.studio.role' },
  ),
)
