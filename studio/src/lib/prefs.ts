export type NavMode = 'icons' | 'full'
export type ThemeMode = 'dark' | 'light' | 'system'

export const NAV_KEY = 'rig.studio.nav'
export const THEME_KEY = 'rig.studio.theme'
export const PROJECT_KEY = 'rig.studio.project'
export const SQL_HISTORY_KEY = 'rig.studio.sqlHistory'

export type ProjectPrefs = {
  name: string
  description: string
}

export type SqlHistoryItem = {
  sql: string
  at: number
}

export function readNavMode(): NavMode {
  try {
    const value = localStorage.getItem(NAV_KEY)
    return value === 'full' ? 'full' : value === 'icons' ? 'icons' : 'full'
  } catch {
    return 'full'
  }
}

export function writeNavMode(mode: NavMode) {
  localStorage.setItem(NAV_KEY, mode)
}

export function readTheme(): ThemeMode {
  try {
    const value = localStorage.getItem(THEME_KEY)
    if (value === 'light' || value === 'system' || value === 'dark') return value
    return 'dark'
  } catch {
    return 'dark'
  }
}

export function writeTheme(theme: ThemeMode) {
  localStorage.setItem(THEME_KEY, theme)
}

export function applyTheme(theme: ThemeMode) {
  const light =
    theme === 'light' ||
    (theme === 'system' && window.matchMedia('(prefers-color-scheme: light)').matches)
  document.documentElement.classList.toggle('light', light)
  document.documentElement.classList.toggle('dark', !light)
}

export function readProject(): ProjectPrefs {
  try {
    const raw = localStorage.getItem(PROJECT_KEY)
    if (!raw) return { name: 'default', description: '' }
    const parsed = JSON.parse(raw) as Partial<ProjectPrefs>
    return {
      name: parsed.name?.trim() || 'default',
      description: parsed.description ?? '',
    }
  } catch {
    return { name: 'default', description: '' }
  }
}

export function writeProject(project: ProjectPrefs) {
  localStorage.setItem(PROJECT_KEY, JSON.stringify(project))
}

export function readSqlHistory(): SqlHistoryItem[] {
  try {
    const raw = localStorage.getItem(SQL_HISTORY_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as SqlHistoryItem[]
    return Array.isArray(parsed) ? parsed.slice(0, 20) : []
  } catch {
    return []
  }
}

export function pushSqlHistory(sql: string): SqlHistoryItem[] {
  const next: SqlHistoryItem[] = [{ sql, at: Date.now() }, ...readSqlHistory().filter((item) => item.sql !== sql)]
    .slice(0, 20)
  localStorage.setItem(SQL_HISTORY_KEY, JSON.stringify(next))
  return next
}
