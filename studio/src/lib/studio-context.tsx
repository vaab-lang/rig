import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  applyTheme,
  readNavMode,
  readProject,
  readTheme,
  writeNavMode,
  writeProject,
  writeTheme,
  type NavMode,
  type ProjectPrefs,
  type ThemeMode,
} from '@/lib/prefs'

type StudioContextValue = {
  navMode: NavMode
  setNavMode: (mode: NavMode) => void
  theme: ThemeMode
  setTheme: (theme: ThemeMode) => void
  project: ProjectPrefs
  setProject: (project: ProjectPrefs) => void
}

const StudioContext = createContext<StudioContextValue | null>(null)

export function StudioProvider({ children }: { children: ReactNode }) {
  const [navMode, setNavModeState] = useState<NavMode>(() => readNavMode())
  const [theme, setThemeState] = useState<ThemeMode>(() => readTheme())
  const [project, setProjectState] = useState<ProjectPrefs>(() => readProject())

  useEffect(() => {
    applyTheme(theme)
    writeTheme(theme)
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: light)')
    const onChange = () => applyTheme('system')
    media.addEventListener('change', onChange)
    return () => media.removeEventListener('change', onChange)
  }, [theme])

  const setNavMode = useCallback((mode: NavMode) => {
    setNavModeState(mode)
    writeNavMode(mode)
  }, [])

  const setTheme = useCallback((next: ThemeMode) => {
    setThemeState(next)
  }, [])

  const setProject = useCallback((next: ProjectPrefs) => {
    setProjectState(next)
    writeProject(next)
  }, [])

  const value = useMemo(
    () => ({ navMode, setNavMode, theme, setTheme, project, setProject }),
    [navMode, setNavMode, theme, setTheme, project, setProject],
  )

  return <StudioContext.Provider value={value}>{children}</StudioContext.Provider>
}

export function useStudio() {
  const value = useContext(StudioContext)
  if (!value) throw new Error('useStudio requires StudioProvider')
  return value
}
